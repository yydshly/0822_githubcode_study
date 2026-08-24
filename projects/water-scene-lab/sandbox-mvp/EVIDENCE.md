# Interactive Water Sandbox 证据

## S10-WP1 Host Shell

- Preset Registry 模型检查：25/25；三预设均回读已有 `water-scene.particles4all-near-field/v1` 契约、Particles4All provider、contract hash 和原生对象 profile；
- 桌面 Chrome `151.0.7922.170`：1440×1000 与 1280×900 两个视口的 15 项检查全部通过；
- 三预设点击与方向键选择均同步更新 contract、shape、density、sceneRole、world driver、solver frame、历史 Gate 与来源链接；
- 两个视口均为 `runtimeSlots=0`、`runtimeLoaded=false`、iframe 无 `src`；
- 横向溢出、console error、page error 和 failed request 均为 0；
- 键盘焦点顺序与可见 2px focus outline 通过。

原始数据：[`assets/host-shell-browser-results.json`](assets/host-shell-browser-results.json)。

最终证据：

- [`assets/host-shell-desktop.png`](assets/host-shell-desktop.png)
- [`assets/host-shell-uplift-desktop.png`](assets/host-shell-uplift-desktop.png)
- [`assets/host-shell-focus-desktop.png`](assets/host-shell-focus-desktop.png)
- [`assets/host-shell-compact-desktop.png`](assets/host-shell-compact-desktop.png)

## S10-WP2 单 Runtime 与原契约执行

- 桌面 Chrome `151.0.7922.170`、1440×1000：Runtime Gate 30/30；
- 执行链固定为 `Particles4AllRuntimeAdapter → runParticles4AllScene → 既有场景契约`，没有宿主自建液体/刚体算法；
- Waterfall：`waterfall-impact-near-field`，原生 `box / ρ2.20`，384/384 粒子、30/30 ticks、acceptance passed；
- River：`river-obstacle-near-field`，原生 `box / ρ0.35`，480/480 粒子、36/36 ticks、acceptance passed；
- Ocean：`ocean-wave-uplift-near-field`，原生 `torus / ρ0.22`，640/640 粒子、36/36 ticks、acceptance passed；
- 三次运行的 WebGPU context 均为 true、非有限位置均为 0、`maxObservedRuntimeSlots=1`；
- 两次跨预设切换都先自动回到 `slots=0 / iframe no-src`，最后手动卸载回到 `idle / slots=0 / no-src`；
- 实际结果 DOM 与返回值一致；横向溢出、console error、page error、failed request 均为 0。

原始数据：[`assets/runtime-slot-browser-results.json`](assets/runtime-slot-browser-results.json)。

运行态证据：

- [`assets/runtime-impact-desktop.png`](assets/runtime-impact-desktop.png)
- [`assets/runtime-drift-desktop.png`](assets/runtime-drift-desktop.png)
- [`assets/runtime-uplift-desktop.png`](assets/runtime-uplift-desktop.png)

## S10-WP3 证据引导、重跑与恢复

- 桌面 Chrome `151.0.7922.170`：Guided Lifecycle Gate 19/19；
- 1440×1000 Waterfall 与 1280×900 River 均在运行前回读 contract、原生 body、粒子数和确定性 ticks；
- 两个视口均通过键盘 Enter 启动；complete 后所有 Runner acceptance 逐项显示 `PASS`，生命周期四步全部完成；
- 两个视口各重跑一次：`completedRuns=2`、`runtimeSlots=1`、`maxObservedRuntimeSlots=1`、iframe src 不变，且 `loading` 只出现一次；
- “清除结果”后进入 `ready`：`result=null`，但 `runtimeLoaded=true`、`slots=1`、iframe src 保留；
- 随后通过键盘卸载进入 `idle`：`slots=0`、`runtimeLoaded=false`、iframe no-src；
- 通过无 WebGPU 上下文复现真实上游失败：Adapter 快速读取 upstream `__result.error`，页面进入 `error`，不生成 acceptance；键盘卸载后恢复 idle；
- 首次 Waterfall 与 River 完整运行约 `14.5 s / 13.0 s`，均低于 120 s 验收上限；两个视口横向溢出为 0，console/page/request error 为 0。

原始数据：[`assets/guided-lifecycle-browser-results.json`](assets/guided-lifecycle-browser-results.json)。

最终状态证据：

- [`assets/guided-complete-desktop.png`](assets/guided-complete-desktop.png)
- [`assets/guided-ready-desktop.png`](assets/guided-ready-desktop.png)
- [`assets/guided-error-desktop.png`](assets/guided-error-desktop.png)
- [`assets/guided-complete-compact-desktop.png`](assets/guided-complete-compact-desktop.png)

## 有限结论

证据支持：Sandbox 已形成可读、可导航、可键盘操作的固定预设宿主，并能在一个共享运行槽中顺序执行三份既有 Particles4All 场景契约；原生 body、粒子注入、确定性 tick、方向响应、旋转和 acceptance 都来自本次 Runtime。运行、重跑、清除、卸载和无 WebGPU 错误恢复的语义与资源状态一致。

证据尚不支持：现实水力、浮力、结构载荷、CFD 或跨浏览器/GPU 的 Sandbox 新结论。当前仍是内部 solver 单位下的局部 PBF / Shape Matching 研究台；Sandbox 跨设备 Gate 属于 S10-WP4。
