# 扩展与重构路线图

## 优先级原则

路线图不是按“最吸引人的新功能”排序，而是按降低系统性风险、缩小回归矩阵和形成可验证接口排序。

## P0：生产基线与研究测试床

### 1. Mock Upstream 合约测试

建立可脚本化的 Anthropic、OpenAI Responses/Chat、Gemini 和 Grok mock，支持 JSON/SSE/WS、usage 缺失、429/5xx、慢首 Token、半流断开和重复 terminal event。

验收：每个入口协议都能在无真实账号条件下验证请求改写、header、事件序列、failover 边界和最终账单。

### 2. 凭据加密与轮换

为 `Account.credentials` 和 Payment Provider config 引入版本化 Envelope Encryption：DEK 加密字段，KEK 来自 KMS/Vault/环境密钥；支持在线重加密、只写新格式、读取旧格式和审计。

验收：数据库和普通备份中不出现可直接使用的 API Key、refresh token、商户私钥或 webhook secret。

### 3. 安全默认值配置档

增加 `production-secure` profile：URL allowlist 开启、禁止私网/HTTP、只信任明确代理、Redis 必须认证、应用只绑定 loopback/内网、响应正文调试关闭。

验收：默认生产模板在缺少安全配置时 fail closed，而开发模板继续显式支持 localhost。

## P1：统一核心抽象

### 4. Upstream Capability/Profile

把“供应商、账号认证、端点族、协议、流式能力、用量能力、客户端身份”收敛为版本化 profile：

```text
UpstreamProfile
├─ Provider
├─ AuthStrategy
├─ EndpointFamily
├─ Protocol
├─ Capabilities
├─ ClientIdentity
├─ UsageParser
└─ ErrorClassifier
```

这能解决同一平台在多个 service 中分别硬编码 Header、版本、User-Agent 和端点的问题，并为多协议账号提供基础。

### 5. 单一调度准入接口

将通用调度器与 OpenAI 高级调度器共享以下阶段：候选快照、资格过滤、评分、sticky policy、slot acquire、wait、终检、lease release。OpenAI previous-response 可以作为策略插件，而不是第二套准入核心。

验收：所有平台共用账号归属、模型能力、cooldown、并发和等待语义；差异只存在于可组合 policy。

### 6. 统一错误分类

输出结构化决策：

```text
scope: request | model | team | account | provider
action: return | retry_same | switch_account | cooldown | disable
retry_after
safe_after_stream_started
billing_effect
```

验收：同一上游错误在 Messages、Responses、Chat、SSE 和 WS 路径上产生一致状态变更。

## P2：财务与可靠性

### 7. 预授权、冻结与结算

- 已知成本的图片/视频/按次请求：创建前原子冻结全额；
- 未知成本文本：按模型、max tokens 和工具上限冻结保守额度；
- 流式：可选分段结算和硬成本上限；
- 成功后 capture，失败/取消 release；
- 明确可配置的 overdraft policy，而不是隐式负余额。

### 8. Decimal 端到端

模型价格、倍率、费用命令、数据库参数和 API 序列化统一使用 decimal/定点数，减少 float64 与多次舍入。

### 9. Redis 故障模型

明确每类状态在 Redis 不可用时是 fail open、fail closed 还是 DB fallback。并发准入和幂等应保守失败；只读模型清单可以降级；sticky 可以 miss 后重建。

增加 lease fencing token、实例失效回收、snapshot generation 和 rebuild 可观测性。

## P3：企业能力

### 10. 身份与租户

OIDC/SAML、SCIM、组织/项目/环境层级、细粒度 RBAC、Service Account、审批和审计导出。

### 11. 可观测性

OpenTelemetry trace、Prometheus 指标、调度解释、SLO、成本异常、Redis lease 泄漏和账务对账告警。

### 12. 多地域与灾备

明确账号凭据的地域归属，避免同一账号跨地域并发触发上游异常；使用区域账号池、单写财务中心、异步报表副本和演练过的恢复目标。

## P4：生态扩展

只有在 P1 基础抽象稳定后再增加更多 Provider、MCP/A2A、策略插件和第三方计费集成，否则每个新 Provider 都会继续放大现有组合复杂度。

## 推荐的下一阶段研究顺序

1. Mock Upstream + 协议事件录制；
2. Redis 双实例并发/lease 实验；
3. 余额冻结与幂等账单实验；
4. sticky/429/慢 TTFT 故障注入；
5. Provider Profile 最小重构原型；
6. 安全配置档与凭据加密原型。

