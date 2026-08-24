# M6-WP2｜组件化与上游贡献评估

状态：`completed`。本工作包只评估已经通过 Gate 的 Particles4All 相关成果，不开发新场景或新求解器。

## 上游镜像完整性

`projects/particles4all/upstream/` 与 `docs/demos/particles4all/engine/` 的全部共同文件哈希一致；发布镜像只缺少上游 `.gitignore`。因此当前运行证据仍来自固定上游算法，扩展位于 iframe 外的 Adapter、场景编排和测试层。

## 组件候选

| 候选 | 当前证据 | 依赖/风险 | 初步路线 |
| --- | --- | --- | --- |
| `Particles4AllRuntimeAdapter` | reset/step/sample/inject/schedule/body events 与多轮 Gate | 依赖 iframe、DOM 控件和 `window.__sim` 非稳定内部接口 | 保留并整理为内部研究运行时 |
| `createFluidBlock()` | 计数、序列化和两场景复用通过 | 仅生成输入，不保证现实流量单位 | 可拆为纯函数模块 |
| 整数 tick 事件队列 | 顺序、重放、注入与刚体事件通过 | 事件类型仍受原库能力限制 | 可与 Adapter 一并打包 |
| 浏览器 Evidence Gates | Chrome/Edge、数值、GPU context、截图和 JSON 完整 | 依赖本地硬件，不能替代跨设备实验室 | 保留为回归资产 |
| 场景实验台 | 能解释能力差异和边界 | 是研究 UI，不是通用 SDK | 保持 U1/S1 演示，不抽象成产品框架 |

## 上游贡献候选

### A. 修正慢帧 FPS 统计

当前 `main.js::frame()` 先把墙钟 `dt` 截断到 50 ms，再用同一个截断值累计 FPS，导致真实低于 20 FPS 时页面仍显示约 20 FPS。M6-WP1 的独立 rAF 计数在 100K/300K 测得约 2.05–2.95 / 0.66–0.90 FPS，而页面仍报告 20 FPS。

这是局部、可解释、可独立测试的小型上游贡献候选：分别保留 `wallDt` 用于 FPS、`simDt=Math.min(wallDt, 0.05)` 用于求解稳定性。

### B. 显式资源生命周期

Adapter 能卸载 iframe并阻止 dispose 后调用，但 `gpuDeviceDisposal=false`。真正的显式释放需要审计并销毁 Sim、Renderer、Mesh、SSFR、Ray、Solids、GpuTimer 的 buffers、textures、query sets 和 device，属于跨类改造，不应伪装成一个 Adapter 小补丁。

路线：先保留为本地缺口；只有出现重复挂载/卸载的产品需求与泄漏证据后才启动。

### C. 稳定运行时 API

当前 Adapter 读取 `window.__sim`、`window.__ui` 和 DOM 按钮，这些是仪器化入口，不是上游公共 API。可向上游提出 `reset/step/readback` 诊断接口建议，但在作者确认 API 方向前，不提交大规模封装。

### D. Apple storage-buffer 兼容

上游已有 issue 与 PR #5 处理 scatter pipeline 的 storage-buffer 限制。本项目不重复实现；保留跟踪和外部 Apple 设备验证。

## 当前禁止包装的内容

- 不把 100K/300K 标记为实时质量档；
- 不把 Adapter 宣称为稳定 npm SDK；
- 不包装容器倾倒、复杂碰撞体或宏观水环境；
- 不复制已有 Apple 兼容 PR；
- 不在缺少资源释放契约时承诺可长期反复挂载。

## 本工作包 Gate

1. 每个组件候选必须对应已有源码与运行证据；
2. 区分内部研究资产、可打包模块和上游补丁；
3. 至少形成一个低风险、可独立验证的上游候选；
4. 组件化不得掩盖性能、兼容性或内部 API 依赖；
5. 输出直接进入 M6-WP3 最终 KEEP / PACKAGE / CONTRIBUTE / STOP 决策。

结果：5/5 满足。内部研究运行时、纯函数输入模块、证据 Gate、演示层和上游候选已经分离；下一步由 M6-WP3 给出终局组合决策。
