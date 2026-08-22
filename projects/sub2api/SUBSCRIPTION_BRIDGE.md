# 订阅账号 API 桥接原理与参考价值

## 1. 结论

Sub2API 的核心不是“把订阅转换成官方 API Key”，也不是在每次推理时操作浏览器。它在客户端和供应商之间部署一个独立网关，完成四件事：

1. 接收 OpenAI、Anthropic、Gemini 等兼容 API 请求；
2. 用平台自己的 API Key 识别下游用户、分组和策略；
3. 从分组中选择一个上游账号，把下游请求转换成该账号通道所需的协议，并将认证替换为账号自己的 OAuth Token、Setup Token、API Key 或云凭据；
4. 将上游 HTTP/SSE/WS 响应反向转换，记录用量并完成平台侧计费。

因此，更准确的架构定义是：

> API Gateway + Provider Adapter + OAuth Credential Broker + Account Scheduler + Stream Transcoder

“插件”可以作为产品层比喻，但它不是安装在 Codex、ChatGPT 或供应商服务器里的插件，而是一个外置的中间服务。

## 2. 必须区分的两套身份与两种订阅

### 2.1 两套身份

```text
下游身份：Sub2API Local API Key
  用于用户、分组、权限、额度和平台计费

上游身份：Provider Credential
  OAuth access token / refresh token / setup token / API key / cloud credential
  用于让供应商识别真实上游账号及其权益
```

下游 Key 不会原样转发给供应商。网关终止下游认证，再为选中的上游账号创建一个新请求。

### 2.2 两种“订阅”

- **上游产品订阅**：ChatGPT、Claude、Gemini 等账号在供应商侧拥有的产品权益和额度；供应商通过 OAuth Token 关联账号并判断权益。
- **Sub2API 用户订阅**：平台自己给下游用户配置的套餐、5h/1d/7d/monthly 窗口和计费规则。

两者是独立账本。一次请求可能同时消耗上游账号的产品额度和下游用户在 Sub2API 的套餐额度。

## 3. 关联模型

真正的关联不是“一个下游 Key 固定对应一个订阅账号”，而是两段映射：

```text
Sub2API Local Key
        │ api_keys.group_id
        ▼
      Group
        │ account_groups
        ▼
Account A / Account B / Account C
        │ selected account credentials
        ▼
Provider OAuth/API authorization server
        │ token subject/account binding
        ▼
供应商侧账号、组织、订阅等级、模型权限和剩余额度
```

第一段由 Sub2API 的 PostgreSQL 数据模型和调度器维护；第二段由供应商签发的 Token 及其服务端身份系统维护。Redis 可以保存 `(group_id, session_hash) -> account_id`，让连续会话尽量使用同一账号。

## 4. 账号接入阶段

以 OpenAI/Codex OAuth 账号为例：

1. 管理员请求 Sub2API 生成授权 URL；
2. Sub2API 创建 state、PKCE 和临时 OAuth session；
3. 管理员在官方登录页完成登录和授权；
4. 授权码返回后，Sub2API 用 code 和 verifier 向官方授权服务交换 Token；
5. 获得 `access_token`、`refresh_token` 和过期时间；
6. 创建 `platform=openai`、`type=oauth` 的 Account，将凭据和平台元数据保存到账号记录；
7. 通过 `group_ids` 把 Account 放入一个或多个资源组。

浏览器只参与交互式登录授权。推理阶段通常直接通过 HTTP/SSE/WS 调用上游，不需要浏览器、DOM、鼠标或聊天框自动化。

## 5. 一次 Codex 请求的完整桥接

```text
Codex CLI / SDK / Internal App
        │ Local Key + /v1/responses
        ▼
Ingress authentication
        │ resolve user + group + local quota
        ▼
Model/protocol routing
        │ model capability + endpoint profile
        ▼
Account scheduling
        │ sticky + priority + concurrency + quota + cooldown
        ▼
Credential provider
        │ cached access token or refresh under distributed lock
        ▼
Codex provider adapter
        │ endpoint + body normalization + client headers + OAuth identity
        ▼
https://chatgpt.com/backend-api/codex/responses
        │ provider charges/checks selected ChatGPT account
        ▼
SSE response adapter
        │ event normalization + usage extraction + safe retry boundary
        ▼
Client response + Sub2API usage/billing transaction
```

### 5.1 入站

下游可以提交兼容 Responses 请求：

```http
POST /v1/responses
Authorization: Bearer <sub2api-local-key>
Content-Type: application/json
```

API Key 中间件查询本地 Key，加载 User 和 Group，并检查状态、IP、余额或平台订阅、Key 配额。这里尚未使用任何上游账号凭据。

### 5.2 调度

Handler 从 `apiKey.GroupID` 出发，按平台、模型和 endpoint capability 获取候选账号。调度器再过滤账号状态、并发、额度、429/过载冷却、模型支持和请求级失败列表，并尽量命中 sticky 账号。

因此，下游 Key 绑定的是“策略和资源池”，不是一个长期固定的 OAuth Token。

### 5.3 Token 生命周期

选中 OAuth Account 后，Token Provider：

1. 优先读取 Redis access-token 缓存；
2. 检查过期时间和预刷新窗口；
3. 使用 refresh token 刷新即将过期的 access token；
4. 用分布式锁避免多实例刷新风暴；
5. 更新账号凭据和缓存；
6. 无法自愈时将账号移出可调度路径。

### 5.4 出站重构

OpenAI 路径根据账号类型选择不同上游：

```text
OAuth / OpenAI setup-token
  → https://chatgpt.com/backend-api/codex/responses

Official API Key
  → https://api.openai.com/v1/responses
```

认证发生替换：

```text
入站  Authorization: Bearer <sub2api-local-key>
出站  Authorization: Bearer <selected-account-access-token>
```

OAuth/Codex 路径还会按适配需要处理账号标识、Originator、User-Agent/客户端版本、session/conversation、请求头白名单、模型和请求体字段。它模拟的是官方客户端的网络协议形态，而不是网页 UI 行为。

### 5.5 返回与状态更新

上游返回后，网关解析 SSE/WS 事件、usage、限额响应头和错误：

- Responses 请求可以接近原协议转发；
- Chat Completions 或 Messages 入站可能需要反向转换事件和终止语义；
- 429、认证错误、过载和 5xx 会更新账号状态并决定刷新、冷却、同账号重试或切号；
- 流已经写给客户端后，禁止可能造成重复内容的危险 failover；
- 最终用量写入下游用户、API Key、分组和上游账号统计。

## 6. 各平台不是同一种桥接

| 平台/账号形态 | 典型上游方式 | 主要适配 |
| --- | --- | --- |
| OpenAI OAuth | ChatGPT Codex 产品后端 | Responses/Codex body、OAuth Bearer、账号与客户端身份头、SSE |
| OpenAI API Key | OpenAI Platform API | 公开 API 认证、Responses/Chat 兼容 |
| Anthropic OAuth | Anthropic Messages 通道 | OAuth Bearer、Claude Code 风格 headers/metadata、beta 和 Messages |
| Anthropic API Key | Anthropic Public API | API Key header、Messages 透传或兼容转换 |
| Gemini OAuth | Code Assist 或 AI Studio | Google OAuth、project/tier、generateContent 包装与流式转换 |
| Bedrock/Vertex | 官方云平台 API | SigV4 或 Service Account、模型路径与云协议转换 |

所以“下游兼容官方 API”不等于“所有上游都使用公开开发者 API”。上游地址、认证和协议由 Provider、账号类型和 capability 共同决定。

## 7. 它不是什么

- 不是把个人订阅凭空生成一个官方开发者 API Key；
- 不是每个请求启动浏览器操作 ChatGPT 页面；
- 不是只改 Base URL 的透明反向代理；
- 不是一个下游 Key 永久绑定一个上游账号；
- 不是获得 OAuth Token 后就自动获得公开转售或多人共享授权。

## 8. 后期自研的参考价值

### 8.1 值得复用的架构思想

1. **身份解耦**：本地 Key 代表下游租户策略，上游 Credential 代表供应商身份，两者不直接暴露。
2. **账号资源化**：把凭据、能力、并发、额度窗口、健康和成本统一建模为可调度资源。
3. **适配器边界**：把 endpoint 选择、认证、请求转换、响应转换、usage 和错误分类归入 Provider Adapter。
4. **能力驱动路由**：按 capability 选账号，而不是只按 Provider 名称或模型前缀判断。
5. **流式状态机**：把“首字节前可重试、首事件后不可随意切号”作为协议级约束。
6. **短期状态与事实分离**：PostgreSQL 保存账号、策略和账务事实，Redis 承担 lease、sticky、冷却和缓存。
7. **双账本与可审计性**：分别观察上游容量消耗和下游用户计费，通过 request ID 关联。
8. **Mock 合约测试**：不使用真实订阅账号也能验证请求头、body、SSE、错误和切号状态机。

### 8.2 不应直接照搬的部分

1. **未公开接口和客户端指纹耦合**：端点、版本、header 和内部协议会随官方客户端变化，必须隔离在适配器内并允许快速关闭。
2. **Provider 专用逻辑散落**：协议、调度、计费多处硬编码会形成组合爆炸，应收敛到稳定接口。
3. **明文凭据生命周期**：需要 KMS/Envelope Encryption、最小权限、脱敏、审计、轮换和备份保护。
4. **把个人订阅池化为公共产品**：技术可行性不能替代服务条款、授权、隐私、支付和税务审查。
5. **事后计费和不透明额度**：应补充预授权、预算护栏、上游额度快照新鲜度和失败补偿。

## 9. 推荐的自研抽象

后续如果按需实现，建议先定义稳定边界，而不是复制具体供应商 handler：

```go
type ProviderAdapter interface {
    Capabilities(account Account) CapabilitySet
    ResolveEndpoint(account Account, request NormalizedRequest) (Endpoint, error)
    Authorize(ctx context.Context, account Account, request *UpstreamRequest) error
    Encode(ctx context.Context, request NormalizedRequest, account Account) (*UpstreamRequest, error)
    DecodeStream(ctx context.Context, response *UpstreamResponse) (NormalizedEventStream, error)
    NormalizeError(response *UpstreamResponse) ProviderError
    ExtractUsage(response *UpstreamResponse) Usage
}
```

配套拆分为：

- `CredentialBroker`：OAuth 授权、Token 缓存/刷新/吊销；
- `AccountScheduler`：候选过滤、评分、lease、sticky 和 cooldown；
- `ProtocolNormalizer`：将 Messages、Chat、Responses、Gemini 转为内部统一模型；
- `StreamTranscoder`：SSE/WS 状态机和反向协议转换；
- `PolicyEngine`：租户、模型、数据、预算和合规策略；
- `UsageLedger`：幂等 usage、上游成本和下游计费。

第一版只选择公开、授权明确的上游通道；产品客户端适配作为独立实验性模块，通过 feature flag、kill switch 和兼容矩阵管理。

## 10. 后续验证与实现顺序

1. 用 Mock Codex/Claude/Gemini upstream 建立固定请求和 SSE golden fixtures；
2. 实现 Local Key → Group → Account 的最小资源模型；
3. 实现加密 Credential Broker 和单账号 Token 刷新；
4. 实现一个公开 API Key Adapter，验证规范化、流式和 usage；
5. 再实现一个 OAuth Adapter，验证认证替换和产品协议差异；
6. 引入 Redis lease、sticky、429 cooldown 和双实例一致性测试；
7. 增加账务幂等、可观测性和故障注入；
8. 在任何真实订阅通道上线前完成供应商条款和数据治理评审。

## 11. 当前证据边界

本结论基于固定上游提交 `67380eafd5ae2eaa8db910ae738199c3dac62e37` 的源码静态审计。已确认账号模型、OAuth handler、Token Provider、分组调度、OpenAI 两类上游地址、认证替换和协议转换路径；尚未使用真实订阅账号完成端到端调用。真实可用性、供应商允许范围和长期稳定性不能仅由静态源码推出。
