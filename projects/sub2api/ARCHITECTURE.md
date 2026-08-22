# Sub2API 架构拆解

## 1. 系统边界

Sub2API 同时包含三类平面：

```text
管理平面
  用户 / API Key / 账号 / 分组 / 渠道 / 价格 / 支付 / 监控
        │
        ├──────────── PostgreSQL（业务事实源）
        │
数据平面
  API 鉴权 → 路由 → 调度 → 转发 → 流处理 → 用量 → 计费
        │
        ├──────────── Redis（并发、排队、sticky、限流、热快照、任务）
        │
上游平面
  Anthropic / OpenAI / Gemini / Antigravity / Grok / CN Providers
  API Key / OAuth / Setup Token / Bedrock / Vertex Service Account
```

前端是 Vue 3/Vite/Pinia/Tailwind，后端是 Go/Gin/Ent，数据库是 PostgreSQL，Redis 同时承担缓存和协调。Go 服务还嵌入前端资源，形成单体部署镜像。

## 2. 主要模块

| 模块 | 责任 | 代表路径 |
| --- | --- | --- |
| Routes/Middleware | 对外路由、请求大小、鉴权、端点标准化、运营错误标记 | `internal/server/routes`、`internal/server/middleware` |
| Handler | 解析请求、组织重试/切号、管理槽位释放和流式错误 | `internal/handler` |
| Gateway Service | 通用协议适配、候选账号选择、上游请求/响应 | `gateway_*.go` |
| OpenAI Gateway | Responses/Chat/Codex/Grok/CN Provider 专用链路 | `openai_gateway_*.go` |
| Scheduler | 通用负载感知调度与 OpenAI 高级调度 | `gateway_scheduling.go`、`openai_account_scheduler.go` |
| Concurrency/Rate Limit | Redis 原子并发槽、等待计数、RPM/Token 限制 | `concurrency_service.go`、`rate_limit_service.go` |
| Token Provider | OAuth token 获取、刷新与平台认证 | `*_token_provider.go`、`*_token_refresher.go` |
| Billing | 模型价格、分类用量、倍率和事务落账 | `billing_service.go`、`gateway_usage_billing.go`、`usage_billing.go` |
| Payment | 订单、服务商、Webhook、退款、补单 | `internal/payment`、`payment_*.go` |
| Repository | PostgreSQL/Redis/HTTP transport 实现 | `internal/repository` |
| Ent Schema | 核心领域表定义 | `backend/ent/schema` |

## 3. 请求时序

### 3.1 入口与鉴权

1. 路由层设置请求体限制、请求 ID、端点标准化和 Ops 错误日志。
2. API Key 中间件从 Bearer、`x-api-key` 或 `x-goog-api-key` 读取凭据；Query 参数 Key 被拒绝。
3. 加载 Key 及其 User/Group，检查状态、IP ACL、分组权限和到期/配额。
4. 如果是订阅分组，加载有效订阅并维护 5h/1d/7d/monthly 窗口；否则检查余额。
5. 把 User、Group、API Key、Subscription 放入请求上下文。

`/v1/usage`、Key billing 信息和异步图片结果查询允许在余额耗尽后读取自身状态，因此只做鉴权而跳过计费准入。

### 3.2 模型与协议路由

普通分组直接确定平台。Composite 分组先按 endpoint 与 public model 查询显式规则：exact 优先于 prefix，endpoint-specific 优先于 `any`，更长前缀优先，再按 priority 和 route id。未命中规则时才使用 `gpt-*`、`claude-*`、`gemini-*`、`grok-*` 前缀检测；未知模型 fail closed。

路由结果同时决定：

- 目标平台；
- 上游模型改写；
- 用户平台配额；
- 账号候选池；
- 渠道价格；
- 用量归属与 Ops 指标。

### 3.3 会话识别

会话关联有两类：

- `session_hash`：由显式 session、缓存内容或上下文/内容摘要生成；
- `previous_response_id`：OpenAI Responses/Codex 用于把连续响应关联到原账号。

绑定以 group 为命名空间写入 Redis，避免不同分组直接共享同一 sticky key。OpenAI 高级调度还可以把 previous response 和 session sticky 当成加权项，而不是绝对优先级。

### 3.4 候选过滤与准入

候选账号至少经过以下过滤：

- 账号启用、可调度、未过期；
- 目标平台与分组归属；
- 支持请求模型和 endpoint capability；
- 不在请求级 excluded set；
- 未处于 rate limit、overload 或 temporary unschedulable；
- 账号额度、free tier、team/model cooldown 可用；
- 分组的 OAuth-only、privacy、模型路由和利润控制策略。

选出候选后，调度器尝试获取 Redis 账号并发槽位。如果 sticky 账号已满，可以使用 sticky 等待队列；普通候选已满则生成 fallback wait plan。真正开始上游请求前还需终检，以处理排队期间余额、账号状态或利润率变化。

### 3.5 上游转发

不同账号类型应用不同认证：API Key Header、OAuth access token、Setup Token、AWS SigV4/Bedrock API Key 或 Google Service Account。请求可能：

- 原协议透传；
- Messages ↔ Responses/Chat 转换；
- Chat Completions 转 Responses；
- Gemini native 与 Messages/Chat 兼容转换；
- 注入/移除平台 beta header；
- 使用 HTTP/1.1、HTTP/2、SSE 或 WebSocket；
- 根据账号代理/TLS fingerprint 建立隔离 transport。

错误分类决定同账号重试、跨账号 failover、临时摘除或直接返回。流式响应已经向客户端写出后，跨账号重试会导致重复/破碎事件，因此 handler 会跟踪 writer 状态并停止不安全 failover。

### 3.6 用量与落账

响应层解析 provider usage 或在缺失时采用兼容估算，形成统一 `UsageTokens`。随后解析渠道和模型价格，应用长上下文、cache、service tier、图片/视频/搜索/语音规则和分组倍率。

最终通过一个使用 request ID/fingerprint 的计费命令更新：

- `usage_logs`；
- 用户余额；
- API Key quota/窗口；
- 用户订阅窗口；
- 账号 quota/统计；
- 平台配额和相关缓存。

## 4. 关键数据模型

```text
User 1 ─── * APIKey * ─── 1 Group
  │                         │
  ├── * UserSubscription ───┤
  ├── * UserPlatformQuota   │
  └── * UsageLog            │
                            │
Group * ─── * Account ─── 0..1 Proxy
  │              │
  ├── * CompositeModelRoute
  ├── pricing/rate/routing policy
  └── fallback group / capability gates

Channel ─── group mappings / model pricing / account cost rules
PaymentOrder ─── PaymentProviderInstance ─── provider webhook
```

`Account.credentials` 包含上游 API Key、access token、refresh token 等；`Account.extra` 保存平台特定状态。`UsageLog` 是分析和计费审计的核心事实表，保留 requested/upstream model、分类 Token、标准成本、用户实扣、账号成本、endpoint、延迟和媒体维度。

## 5. 状态与一致性

### PostgreSQL

保存长期业务状态：用户、账号、Key、分组、订阅、余额、订单、用量、价格、路由和系统配置。数据库事务决定最终财务结果。

### Redis

保存需要跨实例快速协调的状态：

- 用户与账号并发槽位；
- waiting count 和排队计划；
- session/previous response 绑定；
- rate limit、RPM 和窗口热状态；
- scheduler snapshot/L2 cache；
- API Key/billing cache；
- 异步图片和批处理任务队列。

因此 Redis 故障不能简单描述为“缓存 miss”。系统虽有 DB fallback、TTL、cleanup 和 outbox/rebuild 机制，但 Redis 不一致仍可能表现为错误限流、sticky 漂移、无可用账号或重复调度。

## 6. 复杂度热点

按静态结构，最值得优先测试和重构的区域是：

1. **双调度器语义对齐**：通用 `gateway_scheduling` 与 OpenAI `openai_account_scheduler`。
2. **协议组合爆炸**：入站 endpoint × 目标平台 × 账号类型 × 原生协议 × stream mode。
3. **错误后的状态变更**：429/403/5xx 如何影响 model、team、account、sticky 和 snapshot。
4. **长连接资源回收**：客户端断开、首 Token 超时、SSE 终止、WS fallback 时释放 Redis lease。
5. **事后计费**：未知最终成本、并发请求、重试与幂等落账。
6. **敏感配置生命周期**：创建、返回脱敏、数据库存储、备份、轮换和删除。

## 7. 可观测性建议

后续验证应围绕一条 request ID 串起：

```text
ingress decision
→ composite resolution
→ candidate rejection reasons
→ scheduler layer/score
→ slot acquire/wait/release
→ upstream attempt/switch
→ first token and terminal event
→ normalized usage
→ pricing source and multiplier
→ billing transaction result
```

只记录最终选中账号不足以诊断 sticky、快照和并发问题；需要能解释每个候选为什么被跳过，以及最终费用使用了哪条价格链。

