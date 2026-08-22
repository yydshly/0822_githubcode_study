# Sub2API：订阅额度分发型 AI API 网关研究

## 项目卡片

| 字段 | 内容 |
| --- | --- |
| 上游项目 | [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) |
| 固定版本 | [`67380eafd5ae2eaa8db910ae738199c3dac62e37`](https://github.com/Wei-Shaw/sub2api/commit/67380eafd5ae2eaa8db910ae738199c3dac62e37) |
| 上游提交时间 | 2026-08-21 21:53:27 +08:00 |
| 研究状态 | `researching` |
| 许可证 | LGPL-3.0-or-later（以上游 LICENSE/README 声明为准） |
| 开始日期 | 2026-08-22 |
| 当前阶段 | 第一阶段：源码静态审计与研究基线 |

## 执行摘要

Sub2API 不是一个简单的 Base URL 反向代理，而是一套面向 AI 账号池和多租户分发的完整控制面与数据面。它把上游 OAuth、Setup Token、API Key、AWS Bedrock、Google Service Account 等认证形式封装为平台账号，把账号加入分组，再向下游签发自己的 API Key。请求进入后依次经过鉴权、余额或订阅校验、协议识别、模型路由、账号调度、并发准入、上游协议适配、流式响应处理、用量解析和事务计费。

统一理解：它是用户与官方产品后端之间的中间适配转发层。收到用户消息后，它选择一个已授权账号，把标准 API 转换成 Codex、Claude Code、Gemini CLI 等产品通道的网络请求，并用该账号的 OAuth 身份调用官方后端；供应商据此按账号订阅权益处理，而不是 Sub2API 把订阅转换成官方开发者 API Key。

截至固定提交，源码包含 3,625 个跟踪文件，其中约 2,443 个 Go 文件、302 个 Vue 文件和 444 个 TypeScript 文件；后端 `_test.go` 文件 1,175 个，前端测试文件 239 个。代码规模和测试密度说明它已经是一套快速演化的平台型产品，不能按“轻量中转脚本”的风险模型部署或二次开发。

本阶段的核心判断如下：

1. **最独特的产品价值是订阅账号额度池化。** 与以官方计量 API 为主要上游的通用 LLM Gateway 不同，Sub2API 深度适配 Claude Code、Codex、Gemini CLI、Grok 等产品账号或工具协议，并围绕账号并发、窗口额度、粘性会话和账号风控设计调度。
2. **它同时承担网关、调度器、计费核心和 SaaS 后台四种职责。** 功能闭环完整，但故障域和安全责任也集中在一个应用中。
3. **当前不是协议无关的 Provider Adapter 架构。** 通用网关和 OpenAI 高级调度器并存，不同供应商拥有大量专用 service/handler 路径；新增能力通常需要触碰路由、转换、调度、用量解析和计费多处代码。
4. **PostgreSQL 是业务事实源，Redis 是热状态与分布式协调层。** Redis 不只是缓存，还承载并发槽位、排队、粘性绑定、限流与异步任务，因此 Redis 异常会直接影响请求准入与路由正确性。
5. **生产安全需要额外加固。** 默认 URL allowlist/SSRF 强校验关闭，默认允许私网地址和 HTTP；账号 access/refresh token 以 JSONB 存储，支付配置当前也以明文 JSON 保存。需要数据库/磁盘加密、最小权限、网络出口控制、备份保护和密钥轮换共同兜底。
6. **商业使用首先是条款与合规问题。** 上游 README 同时声明 LGPL-3.0-or-later、服务条款风险和“无商业授权”。本研究不解释其法律效力；任何商用决策都应分别审查代码许可证、上游服务条款、支付/税务/隐私义务。

## 五维研究结论

为便于产品和技术决策，本项目把结论收敛为五个维度：

| 维度 | 核心结论 |
| --- | --- |
| 能力 | 将多种 AI 账号组成资源池，通过平台 Key 对外提供协议兼容、模型路由、调度、限流、计费、支付和运营后台 |
| 原理 | 在 L7 解析请求，完成鉴权与模型解析，再通过 Redis 协调账号并发/sticky，由平台适配器转发，最后把 usage 转为 PostgreSQL 事务账单 |
| 场景 | 个人统一入口、可信团队内部网关、研发成本治理、原生 AI 编码工具接入；公开账号拼车和转售属于高风险场景 |
| 扩展 | 优先统一 Provider Profile、调度准入、错误分类和凭据加密，再扩展企业 IAM、FinOps、多地域和更多 Provider |
| 产品目标 | 建议定位为“可信团队的 AI 账号与 API 容量控制平面”，而不是以公开售卖共享订阅额度为核心目标 |

完整的产品定义、目标用户、非目标和指标见 [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)；订阅账号如何被桥接为下游 API，以及后期自研时可复用的架构边界，见 [SUBSCRIPTION_BRIDGE.md](SUBSCRIPTION_BRIDGE.md)。

## 产品目标

### 上游项目当前表达的目标

根据 README 和现有功能，Sub2API 当前目标可以概括为：把 Claude、OpenAI、Gemini、Grok 等订阅或 API 账号的可用额度统一管理，通过平台生成的 API Key 向用户分发，同时处理认证、计费、负载均衡和请求转发。

这是“订阅额度分发型网关”，不是单纯的模型协议转换库。

### 我们建议的目标定位

> 为个人与可信研发团队提供一个自托管的 AI 访问控制平面：统一接入产品订阅账号和官方 API，隐藏上游凭据，以稳定、可控、可审计的方式向开发工具和内部应用提供 API。

这个定位包含四个产品支柱：

1. **统一接入**：Claude Code、Codex、Gemini CLI 和常用 SDK 只配置一个入口。
2. **容量治理**：把账号并发、额度窗口、模型能力和健康状态转化为可调度容量。
3. **成本治理**：按用户、项目、Key、模型和上游账号记录成本、预算和配额。
4. **安全治理**：不向下游暴露上游凭据，提供权限、审计、加密和安全出口策略。

### 明确的非目标

- 不把规避上游限制或模拟官方客户端作为产品承诺；
- 不默认鼓励公开共享个人订阅账号；
- 不在未经条款、隐私、支付和税务审查时定位为公共 API 转售平台；
- 不追求“支持 Provider 数量”这一单一指标，而牺牲已支持协议的正确性；
- 不把 Redis 当作可随意丢失的普通缓存。

### 产品成功指标

建议采用以下北极星指标，而不是只观察请求量：

| 目标 | 建议指标 |
| --- | --- |
| 稳定性 | 请求成功率、SSE/WS 完整率、P95 TTFT、非预期切号率 |
| 调度效率 | 可用容量利用率、排队率、sticky 健康命中率、429 后恢复时间 |
| 财务正确性 | 账单幂等率、余额/用量对账差异、未授权透支金额 |
| 安全 | 明文凭据数量、密钥轮换覆盖率、越权/SSRF 拦截率、审计完整率 |
| 兼容性 | Claude Code/Codex/Gemini CLI 合约测试通过率、协议事件一致性 |

## 为什么研究

这个项目值得作为研究实验室的第一个对象，因为它把几个通常分散的领域集中到了一个可阅读的开源系统里：

- 多供应商 LLM 协议适配；
- OAuth/订阅账号池化；
- 长连接、SSE、WebSocket 的可靠转发；
- Redis 分布式并发和粘性会话；
- Token、缓存、图片、视频、语音的混合计费；
- 用户、套餐、余额、充值和支付运营；
- 上游兼容性、账号风控与服务条款边界。

本研究的目标不是搭建公开中转服务，也不使用真实订阅账号验证规避上游限制的行为。第一阶段只研究公开源码、公开文档、公开 Issue/PR 和不需要真实凭证的可复现检查。

## 研究问题

1. Sub2API 对外真正提供了哪些协议和产品能力？
2. 一个请求从下游 API Key 到上游账号再到计费落账，经过哪些状态机？
3. 账号池调度、粘性会话、并发槽位和故障转移如何协作？
4. 通用网关与 OpenAI 专用网关之间有哪些重复或分叉？
5. PostgreSQL 与 Redis 分别保存什么，故障时会出现什么退化？
6. 计费准确性、幂等性和余额风险如何控制？
7. 当前安全默认值、敏感凭据和部署模板的生产边界是什么？
8. 如果将它扩展为长期维护的企业内部平台，优先重构方向是什么？

## 能力地图

### 支持的平台与账号形态

源码定义的平台包括：

- Anthropic
- OpenAI
- Gemini
- Antigravity
- Grok
- Kimi
- Zhipu/GLM
- DeepSeek
- Composite（虚拟路由平台）

全局账号类型包括 OAuth、Setup Token、API Key、Upstream、AWS Bedrock 和 Google Service Account。这里的账号类型是全局枚举，并不表示每个平台支持所有组合；具体组合由各平台创建、校验和转发代码限制。

### 对外协议面

静态路由确认了以下主要入口：

| 协议族 | 代表入口 | 备注 |
| --- | --- | --- |
| Anthropic | `/v1/messages`、`/v1/messages/count_tokens` | 可按分组转到 Anthropic、OpenAI 兼容或 Antigravity 路径 |
| OpenAI Responses | `/v1/responses`、`/responses` | 支持流式、子路径和 Codex 相关别名 |
| OpenAI Chat | `/v1/chat/completions`、`/chat/completions` | 部分上游会转换到 Responses 或原生 Chat |
| Gemini Native | `/v1beta/models/{model}:{action}` | 兼容 Gemini SDK/CLI |
| Codex | `/backend-api/codex/...`、`/v1/live` | 包含模型清单、Live/Realtime、Alpha Search |
| 多媒体 | images、batch images、videos、voice、realtime | 能力按平台和账号类型受限 |
| 搜索 | `/web_search`、`/x_search` | 当前主要面向 Grok |

Kimi、智谱和 DeepSeek 被建模为 OpenAI 兼容平台，但同时记录 `chat_completions`、`anthropic`、`responses`、`adaptive` 等上游协议形态，表明“平台”和“实际协议”已经是两个不同维度。

### 多租户与运营能力

- 用户注册、登录、管理员和 API Key；
- Key 级 IP 白名单/黑名单、到期时间、总配额和 5h/1d/7d 窗口；
- 余额模式和订阅模式；
- Composite Group 模型别名与目标平台解析；
- 分组倍率、独立图片/视频倍率、长上下文价格和按模型价格；
- EasyPay、支付宝、微信支付和 Stripe；
- 支付实例轮询/最少金额负载均衡、Webhook 验签、补单和退款状态；
- 管理后台、渠道监控、用量与成本报表；
- Simple Mode，可隐藏 SaaS 功能并跳过计费流程。

## 工作原理概览

```text
Client / SDK / Claude Code / Codex / Gemini CLI
                       │
                       ▼
       Request limit + request id + endpoint normalize
                       │
                       ▼
 API Key auth ─ user/group status ─ IP ACL ─ balance/subscription
                       │
                       ▼
 Composite/model resolve ─ inbound model rewrite ─ protocol dispatch
                       │
                       ▼
 session hash / previous response ─ account candidate filtering
                       │
                       ▼
 score + sticky + quota health ─ Redis concurrency slot / wait plan
                       │
                       ▼
 OAuth/API key/Bedrock/Vertex auth ─ HTTP/SSE/WS upstream transport
                       │
                       ▼
 response transform + usage parse + retry/failover classification
                       │
                       ▼
 price resolve + multiplier + idempotent PostgreSQL billing transaction
                       │
                       ▼
 usage log / account stats / balance or subscription quota / API-key quota
```

更详细的模块、状态和时序见 [ARCHITECTURE.md](ARCHITECTURE.md)；关于“标准 API 请求如何转换成 Codex/Claude Code/Gemini CLI 产品通道请求”的完整说明见 [SUBSCRIPTION_BRIDGE.md](SUBSCRIPTION_BRIDGE.md)。

## 调度机制结论

### 通用调度器

`GatewayService.SelectAccountWithLoadAwareness` 负责 Anthropic/Gemini 等通用路径，主要步骤为：

1. 从分组和调度快照取候选账号；
2. 过滤账号状态、平台、模型、限流、配额和排除列表；
3. 优先处理粘性账号和模型路由；
4. 尝试原子获取账号并发槽；
5. 没有槽位时产生 sticky 或 fallback `WaitPlan`；
6. 必要时回源数据库复核；
7. 返回账号、槽位释放函数或排队计划。

### OpenAI 高级调度器

OpenAI 路径存在单独的 `OpenAIAccountScheduler`，支持 previous response、session hash、weighted sticky、Top-K、TTFT/错误率 sticky escape、额度重置、额度健康度和上游成本权重。默认权重包括 priority、load、queue、error rate、TTFT；reset、quota headroom、upstream cost 默认关闭。

这套路径比通用调度器更复杂，也造成了同一概念在不同代码路径中重复实现。公开 Issue 曾出现 sticky 分组信息丢失、内存快照恢复不同步和不同调度路径语义不一致，说明“双调度核心”是后续架构治理的首要对象。

### 粘性会话

通用路径的 session hash 优先级为：

1. `metadata.user_id` 中解析出的显式 session；
2. 带 `cache_control: ephemeral` 的缓存内容；
3. 客户端 IP、标准化 User-Agent、API Key ID、system 和消息内容组成的 fallback 摘要。

随后在 Redis 中保存 `(group_id, session_hash) -> account_id`。这有助于缓存命中和会话连续性，但也会放大慢账号、过期账号或快照不一致的影响，因此 OpenAI 路径后来增加了基于 TTFT/错误率的 sticky escape。

## 计费机制结论

用量日志同时记录 requested model、upstream model、模型映射链、服务层级、输入/输出/缓存 Token、图片、视频、请求耗时和首 Token 耗时。费用大致分三层：

```text
标准费用 = 模型或渠道单价 × 分类用量
用户费用 = 标准费用 × 用户/分组倍率
账号统计费用 = 自定义账号规则、渠道价格或模型默认价格
```

实际落账通过 `UsageBillingCommand` 统一更新余额、订阅用量、API Key 配额和账号配额，并包含 request fingerprint/幂等语义。金额在写入数据库前量化到 8 位小数，用来避免余额减法和累计用量加法在 PostgreSQL `NUMERIC(20,8)` 边界上向不同方向舍入。

但流式文本的最终成本通常只有响应完成后才能确定，鉴权阶段只能确认余额大于零或做保守预检，无法天然保证余额足以支付最终请求。历史 Issue 已经出现过负余额问题；长期方案应采用模型级预授权/冻结、流中上限和最终结算，而不是只依赖事后扣费。

## 安全与隐私观察

### 已有的保护

- API Key 支持 Bearer、`x-api-key` 和 `x-goog-api-key`，拒绝 Query 参数 Key；
- Key 支持 IP ACL、配额、到期和分组可用性检查；
- JWT、TOTP、WebAuthn/Passkey、CSP 和响应头过滤；
- 支付 Webhook 签名验证；
- URL 格式校验，并提供可配置的 allowlist、DNS 解析后 IP 检查和私网控制；
- Docker Compose 设置 `no-new-privileges:true`，PostgreSQL/Redis 默认不映射宿主公网端口；
- CI 包含单元/集成测试、golangci-lint、govulncheck 和前端生产依赖审计。

### 需要显式加固的边界

| 观察 | 证据 | 生产含义 |
| --- | --- | --- |
| URL allowlist 默认关闭 | `config.go` 默认值 | 自定义 Base URL 只做最小格式校验，不能把默认配置视为 SSRF 防线 |
| 默认允许私网和 HTTP | `allow_private_hosts=true`、`allow_insecure_http=true` | 便于内网/开发，但生产应显式关闭并配置上游域名白名单 |
| 账号凭据以 JSONB 保存 | `ent/schema/account.go` | DB、备份或只读账号泄露可能直接暴露 access/refresh token；应使用 KMS/Envelope Encryption |
| 支付配置当前为明文 JSON | `payment/crypto.go` 的迁移注释 | 商户私钥、Webhook secret 等依赖数据库和磁盘层保护；schema 注释仍称“加密”，存在文档漂移 |
| Redis 是准入协调层 | 并发、sticky、队列相关 service | Redis 的隔离、认证、持久化和故障策略属于业务正确性要求，不只是性能优化 |
| 默认应用监听 `0.0.0.0` | Compose/config 默认值 | 必须通过反代 TLS、防火墙和可信代理配置收口暴露面 |

本阶段没有发现或声称存在可直接远程利用的漏洞。以上是威胁建模和安全默认值审计，不是渗透测试结论。

## 适用场景与不适用场景

### 相对适合

- 个人或可信小团队统一管理多个 AI 工具账号；
- 企业内部研发网关，在自有 API Key/合规账号上做配额、路由和成本归集；
- 研究 LLM 协议适配、流式网关和 Redis 分布式并发；
- 需要 Claude Code、Codex、Gemini CLI 原生体验的内部接入层；
- 有能力自行维护 PostgreSQL、Redis、反向代理、安全基线和告警的团队。

### 谨慎或不适合

- 未审查上游条款就将个人订阅账号公开共享；
- 直接用默认配置暴露到公网；
- 要求强合规、硬多租户隔离、KMS 托管密钥和完整企业 IAM，但没有二次开发预算；
- 只想接入大量官方 LLM API Provider，而不需要订阅账号和原生工具兼容；这类场景 LiteLLM 等 Provider-first 网关更自然；
- 需要财务级预付余额绝不透支，但没有实现预授权/冻结额度机制。

## 同类定位

| 项目 | 主要中心 | Sub2API 的区别 |
| --- | --- | --- |
| LiteLLM | 100+ Provider 的统一协议、路由、guardrails 和企业网关 | Sub2API Provider 数较少，但对产品订阅账号、Codex/Claude Code 和用户运营更深 |
| New API | 多模型聚合分发、协议转换、渠道和计费 | Sub2API 更强调 OAuth 订阅额度池、账号窗口和粘性调度 |
| One API | API Key/渠道管理和二次分发 | Sub2API 的流式协议、账号健康和订阅工具适配复杂度更高 |

这不是完整竞品评测，只用于说明架构重心。后续阶段若需要选型，会另建统一版本、统一测试负载的对照实验。

## 阶段结论

Sub2API 已经形成了很强的“账号池控制面 + 原生 AI 工具数据面 + SaaS 计费面”组合能力。它最值得学习的是：如何在上游额度窗口、账号并发、粘性缓存、SSE/WS 长连接和多租户配额之间做工程折中。

它最需要治理的也是同一件事：平台兼容逻辑增长过快，导致协议、账号类型、调度、重试和计费在多个路径中交叉组合。继续按供应商增加专用分支会让回归矩阵呈乘法增长。优先级最高的扩展不是再接一个 Provider，而是统一“上游能力描述、调度准入、错误分类、用量事件和凭据保护”五个基础接口。

详细扩展建议见 [ROADMAP.md](ROADMAP.md)，产品目标见 [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)，逐项证据与复现状态见 [EVIDENCE.md](EVIDENCE.md)。

## 复现方法

第一阶段不提交上游源码，仅记录固定 commit。将上游浅克隆到任意临时目录后运行：

```powershell
git clone --depth 1 https://github.com/Wei-Shaw/sub2api.git sub2api-upstream
git -C sub2api-upstream checkout 67380eafd5ae2eaa8db910ae738199c3dac62e37
powershell -ExecutionPolicy Bypass -File .\projects\sub2api\tests\verify-static-evidence.ps1 `
  -UpstreamPath .\sub2api-upstream
```

当前研究机只有 Go 1.25.5，而固定版本声明 Go 1.26.6；Docker 未安装。因此第一阶段没有把“本机完整测试通过”列为证据。上游 CI 声明执行 Go unit/integration、前端 typecheck/Vitest、golangci-lint、govulncheck 和 pnpm audit。

## 上游归属与许可

- Sub2API 源码、名称、截图和文档均归上游作者与贡献者；
- 本目录只包含独立撰写的研究文本和静态检查脚本，不复制上游实现；
- 上游仓库声明 LGPL-3.0-or-later，同时 README 包含服务条款、免责声明和“无商业授权”文字；
- 本研究不是法律意见，也不为任何账号共享、商业中转或规避平台限制提供授权。
