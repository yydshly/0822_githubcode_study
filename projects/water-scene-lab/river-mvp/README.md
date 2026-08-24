# River MVP｜弯曲河道流向原型

## Particles4All 原生漂浮物（2026-08-24）

近场契约 revision 2 使用原库 `box / density 0.35 / size 0.15`。480 粒子沿局部 `+X` 注入并运行 36 ticks 后，原生 box 沿流位移约 `0.2470 u`，Shape Matching 旋转约 `14.25°`；桌面 Chrome Gate 20/20。该对象只作为场景化漂浮物代理，不代表真实木料或河床碰撞。

## 2026-08-24｜Stage 6：Particles4All 第二场景复用

River 页面现在保留原有样条/flow-map 宏观方向实验，并增加按需加载的 Particles4All 局部障碍镜头。它没有复制 Waterfall 的求解逻辑，而是复用同一 `water-scene.particles4all-near-field/v1`、`Particles4AllRuntimeAdapter` 和 `particles4all-scene-runner-v1`。

```text
River sampleFlow 中段切线 (-0.617, 0.787)
→ 局部坐标帧映射为 solver +X
→ 480 粒子 / 36 ticks
→ PBF + Shape Matching
→ 刚体沿 +X 位移 0.1321 u
```

- 双场景契约与序列化检查：36/36；
- River 桌面 Chrome Gate：18/18；
- `nonFinite=0`，无 console/page error 或水平溢出；
- 水平位移单独验收，重力向下位移不能通过方向 Gate；
- 当前目标平台只覆盖桌面浏览器，新移动端工作保持 held。

场景资产：[`../scenes/river-obstacle-near-field.scene.json`](../scenes/river-obstacle-near-field.scene.json)。运行证据：[`assets/particles4all-reuse-browser-results.json`](assets/particles4all-reuse-browser-results.json)、[`assets/river-particles4all-desktop.png`](assets/river-particles4all-desktop.png)。

## 当前结论

River MVP 已完成固定数值协议和 Chromium 硬件 WebGL2 浏览器验收，原始结果见 [`EVIDENCE.md`](EVIDENCE.md)。它要证明的不是“算法算出了真实河流”，而是一个更窄、可复用的场景能力：在同一条弯曲河道里，让河面方向线索、方向箭头和漂浮标记读取同一流向规则。

固定 A/B 只改变 `flowMode`：A 使用世界 `+Z` 固定方向，B 使用最近河道中心线的样条切线；河道、宽度、速度模长、标记、种子、相机与时间轴保持一致。数值与浏览器证据均通过，因此 Gate 2 为 `continue River visual baseline / hold shallow-water`；这表示保留视觉基线，并不表示批准浅水动力学。

## 已实现能力

- 8 个固定控制点构成 Catmull–Rom 中心线，并由同一中心线生成河面与两岸。
- 通过弧长查找表按距离采样河道，避免直接按样条参数移动造成明显忽快忽慢。
- `sampleFlowAtWorldXZ` 查询任意世界 XZ 点最近的中心线、切线、横向距离与河道内状态。
- A/B 使用相同的 8 个初始漂浮标记和相同速度模长；标记离开河道后保留，不用重生或夹紧掩盖误差。
- 固定 60 Hz、1,200 步、20 秒协议；前 120 步预热，第 121–1,080 步用于统计。
- 页面以同一时间轴展示水纹、方向箭头、漂浮标记与历史轨迹；桌面为同步双视口，手机为单视口切换。
- 页面公开模型版本、契约哈希、固定终点指标与真实性边界，并提供 reduced-motion 与 WebGL fallback。

## 运行

从仓库根目录启动静态服务器：

```powershell
python -m http.server 8107 --directory docs
```

打开：

```text
http://127.0.0.1:8107/demos/water-scene-lab/river/
```

模型测试：

```powershell
node projects/water-scene-lab/river-mvp/tests/model-test.mjs
```

浏览器测试需要 Playwright 和可用的 Chromium/Chrome；工作区打包运行时可用 `WATER_LAB_NODE_MODULES` 与 `WATER_LAB_CHROME` 指定依赖和浏览器。

## 实现结构

| 文件 | 作用 |
| --- | --- |
| [`docs/demos/water-scene-lab/river/river-model.mjs`](../../../docs/demos/water-scene-lab/river/river-model.mjs) | 唯一数值模型、固定样条、弧长/最近点查询、流向采样、标记轨迹与 A/B 摘要 |
| [`docs/demos/water-scene-lab/river/app.js`](../../../docs/demos/water-scene-lab/river/app.js) | Three.js 河道、同步视图、方向线索、交互、质量档与 fallback |
| [`docs/demos/water-scene-lab/river/index.html`](../../../docs/demos/water-scene-lab/river/index.html) | 可运行实验界面、指标和真实性说明 |
| [`PROTOCOL.md`](PROTOCOL.md) | 固定变量、样条/方向场公式、采样与验收契约 |
| [`EVIDENCE.md`](EVIDENCE.md) | 数值与浏览器原始结果、限制和 Gate 判断 |

Three.js 使用仓库内的 r185 ES module：`docs/demos/shijing-dayu-immersive/vendor/three.module.js`。它是固定的本地运行依赖，不会在演示期间从 CDN 获取。

## 对后续场景的意义

River 增加的不是一套“绿色水面皮肤”，而是三项跨场景资产：

1. `sampleFlow` 空间查询契约，让视觉方向、诊断箭头和对象运动可以共享同一规则。
2. 样条中心线、弧长采样和岸线生成，可作为漂流路线、治水叙事、峡谷溪流或瀑布上游的空间作者工具。
3. “先做视觉方向场、再由宿主问题批准动力求解”的升级门，防止只因画面是河流就提前建设浅水求解器。

Waterfall 与 River 现已进一步共用可序列化近场契约和原库 Scene Runner；它们仍不把方向代理或粒子数量当作守恒流量。当前下一场景为 Coastal：Ocean 负责宏观波面，Particles4All 只负责局部浮体或近岸交互。

## 不应扩张的结论

- 数值单位是受控 A/B 的内部单位，不对应经测量的米、秒或现实流速。
- `flowMode` 是视觉与对象运动的方向规则，不求解水深、压力、动量或质量守恒。
- 漂浮标记是方向一致性探针，不含惯性、阻力、碰撞、搁浅或湍流扩散。
- 当前没有闸门、堰、回流、洪峰、湿干边界或开放边界求解。
- 单一浏览器/GPU 的运行结果不构成跨设备性能承诺，也不能支持工程水文或安全结论。
