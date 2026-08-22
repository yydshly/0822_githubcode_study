# 证据矩阵

## 证据等级

- **A — 本地可复现**：固定 commit 上的脚本或测试已在研究环境运行。
- **B — 源码确认**：固定 commit 的实现直接支持结论，但未完成端到端运行。
- **C — 上游自述**：README、文档、Issue 或 CI 配置声明，尚未由本研究独立复现。
- **D — 推断/假设**：由多项证据推导，后续需要实验验证。

## 当前矩阵

| ID | 结论 | 等级 | 主要证据 | 当前状态 |
| --- | --- | --- | --- | --- |
| E01 | 固定研究版本为 `67380eaf` | A | `git ls-remote` 与本地浅克隆 HEAD | 已验证 |
| E02 | 平台含 Anthropic/OpenAI/Gemini/Antigravity/Grok/Kimi/Zhipu/DeepSeek/Composite | A/B | `backend/internal/domain/constants.go:19-30` | 静态脚本覆盖 |
| E03 | 账号类型含 OAuth/Setup Token/API Key/Upstream/Bedrock/Service Account | A/B | `backend/internal/domain/constants.go:50-58` | 静态脚本覆盖 |
| E04 | 对外暴露 Messages/Responses/Chat/Gemini/Codex/多媒体/搜索协议 | A/B | `backend/internal/server/routes/gateway.go` | 静态脚本覆盖 |
| E05 | Composite 显式路由优先并能改写上游模型 | B/C | `docs/COMPOSITE_GROUPS.md`、resolver/service | 源码与文档一致 |
| E06 | session hash 有 metadata/cacheable/fallback 三层来源 | A/B | `gateway_service.go:871+` | 静态脚本覆盖 |
| E07 | OpenAI 调度评分包含 priority/load/queue/error/TTFT 等 | A/B | `config.go:2396+`、`openai_account_scheduler.go` | 静态脚本覆盖 |
| E08 | Redis 参与账号并发、等待与 sticky | B | `concurrency_service.go`、两套 scheduler | 待 Redis 集成实验 |
| E09 | 计费落账前金额量化到 8 位 | A/B | `usage_billing.go:61-102` | 静态脚本覆盖 |
| E10 | 账号 access/refresh token 以 JSONB 保存 | A/B | `ent/schema/account.go:74-81` | 静态脚本覆盖 |
| E11 | 支付配置当前按明文 JSON 保存 | A/B | `payment/crypto.go:20-23,63-66` | 静态脚本覆盖 |
| E12 | URL allowlist 默认关闭，默认允许私网和 HTTP | A/B | `config.go:2020-2039` | 静态脚本覆盖 |
| E13 | CI 包含 unit/integration、前端检查、lint 与安全扫描 | B/C | `.github/workflows/*.yml` | 未在本机全量执行 |
| E14 | 两套调度路径带来语义漂移风险 | C/D | 源码重复、Issue #1907/#2990/#5262 | 需故障注入验证 |
| E15 | 事后计费可能需要预授权/冻结额度 | C/D | 计费时序、历史 Issue #3384 | 旧问题已关闭，需验证现版本边界 |
| E16 | 下游 API Key 通过 `group_id` 间接关联账号池，而不是直接固定绑定一个上游账号 | B | `ent/schema/api_key.go:44-46`、`ent/schema/account.go:207-214`、`gateway_scheduling.go:960+` | 源码确认 |
| E17 | OAuth Account 保存 access/refresh token，Token Provider 在请求前缓存并按过期窗口刷新 | B | `ent/schema/account.go:74-81`、`openai_token_provider.go`、`claude_token_provider.go`、`gemini_token_provider.go` | 源码确认 |
| E18 | OpenAI OAuth 与 API Key 路径使用不同上游：ChatGPT Codex 产品后端与 OpenAI Platform API | B | `openai_gateway_service.go:29-34`、`openai_gateway_forward.go:1202-1232` | 源码确认 |
| E19 | 出站认证使用被选中账号的凭据，本地 Key 不会原样转发给上游 | B | `api_key_auth.go:58-100`、`openai_agent_identity.go:371-392`、`gateway_upstream_request.go:120-130` | 源码确认 |
| E20 | OAuth 推理主要模拟官方客户端网络协议，而不是每次执行浏览器 UI 自动化 | B/D | OAuth handler、上游 HTTP request builder、SSE/WS forwarder；未见推理热路径浏览器驱动 | 静态结论，待运行验证 |
| E21 | “订阅桥接”应建模为 Gateway + Adapter + Credential Broker + Scheduler + Stream Transcoder | D | E16-E20 与模块边界综合推导 | 架构建议 |

产品目标与定位属于基于源码、README、风险和同类项目形成的研究建议，不属于上游已经承诺的功能，详见 [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)。

## 公开问题样本

这些 Issue 不是“现版本一定仍有该 Bug”的证据，而是用于识别高风险状态机和设计压力：

- [#1907 Sticky session 分组元数据丢失](https://github.com/Wei-Shaw/sub2api/pull/1907)
- [#2990 调度快照在限流恢复后不同步](https://github.com/Wei-Shaw/sub2api/issues/2990)
- [#3127 Responses fallback session hash 绑定异常](https://github.com/Wei-Shaw/sub2api/issues/3127)
- [#3384 余额模式可能透支](https://github.com/Wei-Shaw/sub2api/issues/3384)
- [#4974 上游客户端身份与协议栈统一 RFC](https://github.com/Wei-Shaw/sub2api/issues/4974)
- [#5142 订阅月窗口提前重置](https://github.com/Wei-Shaw/sub2api/issues/5142)
- [#5262 慢成功账号长期保留 sticky](https://github.com/Wei-Shaw/sub2api/issues/5262)

## 已运行检查

研究环境：Windows/PowerShell，Go 1.25.5，Node 22.15.0，pnpm 11.19.0，无 Docker。

已完成：

- 固定远端 main commit；
- 浅克隆并读取全部源码；
- 文件、语言和测试文件计数；
- 平台/账号类型、网关路由、sticky、调度权重、计费量化和安全默认值静态断言；
- 上游 CI、部署模板、README、许可证和公开 Issue 交叉检查。

未完成：

- Go 1.26.6 全量 unit/integration；
- PostgreSQL + Redis + 多实例运行；
- 真实 OAuth/订阅账号调用；
- SSE/WS 故障注入；
- 并发竞争和计费一致性压测；
- 浏览器管理后台和支付沙箱端到端。

## 后续实验清单

1. 用 mock upstream 建立无真实凭证的协议兼容测试床。
2. 两个网关实例共享 PostgreSQL/Redis，验证 account/user slot 不超卖。
3. 在请求排队、首 Token 前、首 Token 后和 terminal event 前后断连，检查 lease 与账单。
4. 注入 429、403、500、空响应、慢 TTFT，观察 cooldown、sticky 和 failover。
5. 构造并发同 request ID、不同 fingerprint，验证幂等冲突。
6. 构造余额不足、已知成本图片、未知成本文本，验证预检和透支边界。
7. 启用 URL allowlist 后测试 DNS rebinding、私网、回环和重定向。
8. 备份数据库并检查 token、支付密钥和 TOTP 的明文/密文边界。
