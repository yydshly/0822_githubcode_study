# Interactive Water Sandbox MVP

当前阶段：`S10-WP3 guided evidence lifecycle completed / S10-WP4 cross-browser and GPU gate active`。

## 已实现

- 桌面 Spatial Stage：左侧三个固定预设、中间唯一物理运行槽、右侧对象、实际结果与历史证据；
- Waterfall / River / Ocean 原场景契约直接组成 Preset Registry，没有复制或改写求解算法；
- 显式点击“运行本场景”后，通过已有 `Particles4AllRuntimeAdapter` 和 `runParticles4AllScene` 加载对应原契约；
- 瀑布 `box / ρ2.20`、河道 `box / ρ0.35`、海面 `torus / ρ0.22` 三类原生对象实际回读并通过 acceptance；
- 单槽约束：`runtimeSlots≤1`；切换预设前自动卸载，手动“卸载归零”恢复 `idle / slots=0 / iframe no-src`；
- 实际粒子数、确定性 tick、方向响应、旋转、非有限位置和原生 body profile 在当前运行结果面板中显示；
- 四阶段证据引导与运行前摘要明确显示 contract、body、粒子数和 ticks；完成后逐项显示 Runner acceptance；
- 同一契约可在不创建第二 Runtime 的情况下重跑；`completedRuns` 和生命周期轨迹可审计；
- “清除结果”进入 `ready` 并保留 Runtime，“卸载归零”才释放 iframe 与 solver；
- 无 WebGPU 时 Adapter 快速识别上游错误，页面进入可读 `error`，只允许卸载恢复，不显示伪 acceptance；
- 鼠标/方向键预设选择，URL `?preset=impact|drift|uplift`；
- `window.__waterSandbox` 提供可测试的状态、运行、选择和卸载接口。

## 运行

从仓库根目录启动：

```powershell
python -m http.server 8107 --directory docs
```

打开：

```text
http://127.0.0.1:8107/demos/water-scene-lab/sandbox/
```

## 验证

```powershell
node projects/water-scene-lab/sandbox-mvp/tests/host-shell-model-test.mjs
node projects/water-scene-lab/sandbox-mvp/tests/host-shell-browser.cjs
node projects/water-scene-lab/sandbox-mvp/tests/runtime-slot-browser.cjs
node projects/water-scene-lab/sandbox-mvp/tests/guided-lifecycle-browser.cjs
```

浏览器测试需要 Playwright、Chrome 和 WebGPU；项目打包运行时通过 `NODE_PATH` 指向工作区依赖。

## 文件

| 文件 | 作用 |
| --- | --- |
| `docs/demos/water-scene-lab/sandbox/index.html` | Sandbox 语义结构、单物理视口与实际结果面板 |
| `docs/demos/water-scene-lab/sandbox/styles.css` | 桌面 Spatial Stage、宿主预览与运行态 |
| `docs/demos/water-scene-lab/sandbox/sandbox-presets.mjs` | 直接引用三份已有场景契约的注册表 |
| `docs/demos/water-scene-lab/sandbox/app.js` | 单 Runtime 生命周期与共享 Adapter/Runner 接线 |
| `tests/runtime-slot-browser.cjs` | 三原契约顺序运行、自动卸载与手动归零 Gate |
| `tests/guided-lifecycle-browser.cjs` | 重跑、清除、键盘卸载、无 WebGPU 错误恢复与两桌面视口 Gate |
| [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) | 设计、范围、旅程与覆盖记录 |
| [`EVIDENCE.md`](EVIDENCE.md) | 浏览器结果、截图和有限结论 |

S10-WP4 将复核 Sandbox 自身在 Chrome / Edge 与 Intel / NVIDIA 上的完整运行、重跑、卸载和读数离散度；不扩展为通用编辑器。
