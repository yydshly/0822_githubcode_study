# 实验日志

## 2026-08-22：建立第一阶段研究基线

### 假设

Sub2API 可能已经从“订阅转 API”脚本演变为完整的多租户 AI 网关，需要按平台系统而不是单一代理研究。

### 操作

1. 使用 `git ls-remote` 固定上游 main：`67380eafd5ae2eaa8db910ae738199c3dac62e37`。
2. 浅克隆上游到本地忽略目录 `.tmp/sub2api-upstream`。
3. 盘点源码语言、Ent schema、路由、service、测试和 CI。
4. 阅读网关路由、API Key middleware、两套 scheduler、sticky hash、用量计费、支付、部署和安全默认值。
5. 交叉检查上游 README、Composite/Payment 文档、License 和公开 Issue/PR。

### 结果与证据

- 3,625 个跟踪文件；Go 2,443、TypeScript 446、Vue 302、SQL 269。
- 后端测试文件 1,175；前端测试文件 239。
- 明确存在通用 Gateway 和 OpenAI 专用 Gateway/高级调度器。
- API 面覆盖 Messages、Responses、Chat、Gemini native、Codex、多媒体、语音和搜索。
- Redis 承担并发、排队、sticky、限流、快照和任务，不是单纯缓存。
- 账号凭据以 JSONB 保存；支付配置当前已迁移为明文 JSON。
- 安全默认值中 URL allowlist 关闭，私网和 HTTP 允许。
- 上游 CI 需要 Go 1.26.6；本机 Go 1.25.5 且无 Docker，未执行全量测试。

### 判断

初始假设成立。第一阶段状态保持 `researching` 而非 `validated`：静态结构和关键实现已有证据，但多实例并发、流式故障、真实 Redis/PostgreSQL 一致性和协议转换仍需可执行测试床验证。

### 下一步

优先实现不需要真实订阅账号的 mock upstream，先验证协议、调度状态机和计费，再决定是否研究真实 provider 接入。

## 2026-08-22：建立独立研究分支与产品目标

### 操作

- 从 `main` 创建并切换到 `codex/sub2api-research`；
- 将研究结论明确整理为能力、原理、场景、扩展方向和产品目标五个维度；
- 区分“上游当前表达的订阅额度分发目标”和“本研究建议的可信团队控制平面目标”。

### 判断

推荐把长期目标收敛为可信团队的 AI 账号与 API 容量控制平面。公开共享订阅额度虽然在功能上可实现，但不应在未完成合规和安全立项时成为默认产品方向。
