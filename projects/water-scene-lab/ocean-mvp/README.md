# Ocean MVP｜开阔海面受控原型

## Particles4All 近场复用（2026-08-24）

Ocean 页面保留 Gerstner 宏观海面，同时用第三份 `water-scene.particles4all-near-field/v1` 场景契约驱动原库低密度 torus。固定世界点的上升速度映射为局部 `+Y` 粒子脉冲；同一 Scene Runner 先运行无注入基线，再运行 640 粒子、36 ticks 的原库事件。桌面 Chrome 20/20 通过，浮环相对基线上举约 `0.01528 u`，Shape Matching 姿态变化约 `1.20°`。

该结果证明 Ocean 的可查询表面能够成为 Particles4All 局部液固窗口的输入，不证明现实浮力、波压、船舶安全或近岸淹没。

## 当前结论

Ocean MVP 已从 `source-backed plan` 进入 `evidence-backed prototype`。它证明了浏览器中的大尺度海面可以由解析几何波负责，并让画面与船体采样共享同一参数源；它不模拟真实海况、推进器、阻力或完整船舶水动力。

当前 Gate 1 为 `continue Ocean baseline / hold FFT`：功能、数值、桌面、390px、reduced-motion、WebGL fallback 和三次隔离性能复测均通过。Ocean 可作为大尺度海面储备；没有高阶频谱海况宿主需求，因此不进入 FFT。共用证据协议随后已用于 River 和 Waterfall，当前下一需求候选为 Flood Proxy。

## 已实现能力

- 固定 6 组方向性 Gerstner 波，解析计算几何位移、切向量和动态法线。
- 唯一语义实验因子 `seaState`：A 平静为 `0.25`，B 有风涌浪为 `1.0`；波长、方向、相位、`q`、船体、航向、速度、相机与时间轴保持一致。
- 通过四次 Newton 迭代反解水平 Gerstner 位移，再以世界 XZ 查询真实波面位置，避免把位移曲面错误当成普通高度场。
- 船体四个角点调用同一 `sampleSurface`，产生升沉、横滚和俯仰的视觉响应代理。
- 固定 60 Hz、1,200 步、20 秒同步 A/B；桌面为同画布双视口，手机为同画布 A/B 切换。
- 追航/总览镜头、四点探针、暂停、重置、运动开关、reduced-motion 静态预览。
- WebGL2 初始化失败、上下文丢失和强制失败测试均进入可读 DOM fallback，不用静态图伪装实时结果。
- 页面公开模型版本、契约哈希、质量档、帧时间、draw calls、三角形数量、固定终点指标与真实性边界。

## 运行

从仓库根目录启动静态服务器：

```powershell
python -m http.server 8107 --directory docs
```

打开：

```text
http://127.0.0.1:8107/demos/water-scene-lab/ocean/
```

模型测试：

```powershell
node projects/water-scene-lab/ocean-mvp/tests/model-test.mjs
```

浏览器测试需要 Playwright 和可用的 Chromium/Chrome；工作区打包运行时可用 `WATER_LAB_NODE_MODULES` 与 `WATER_LAB_CHROME` 指定依赖和浏览器。

## 实现结构

| 文件 | 作用 |
| --- | --- |
| [`docs/demos/water-scene-lab/ocean/ocean-model.mjs`](../../../docs/demos/water-scene-lab/ocean/ocean-model.mjs) | 唯一数值模型、波表、逆解、船体采样、固定 A/B 与哈希 |
| [`docs/demos/water-scene-lab/ocean/app.js`](../../../docs/demos/water-scene-lab/ocean/app.js) | Three.js 场景、同步双视图、交互、质量档、运行诊断与 fallback |
| [`docs/demos/water-scene-lab/ocean/index.html`](../../../docs/demos/water-scene-lab/ocean/index.html) | 可运行实验界面、指标和真实性说明 |
| [`PROTOCOL.md`](PROTOCOL.md) | 固定变量、波表、公式、采样与验收契约 |
| [`EVIDENCE.md`](EVIDENCE.md) | 数值与真实浏览器结果、截图、限制和 Gate 判断 |

Three.js 固定使用仓库内的 r185 ES module：`docs/demos/shijing-dayu-immersive/vendor/three.module.js`，相应许可证保存在同目录 `THREE-LICENSE.txt`。这是一项显式的跨演示源码依赖；若第二个新 WebGL 原型也需要它，再把 vendor 提升为共享目录，当前不为一次复用提前重构。

## 对后续场景的意义

这个原型建立的可复用资产不是“海洋皮肤”，而是三件事：

1. `time + sampleSurface + qualityTier + evidenceState` 的最小场景契约。
2. 同一语义因子、同一时间线、同一相机下的 A/B 证据格式。
3. 对“渲染表现”“交互代理”“专业物理结论”三种真实性等级的明确分层。

River 已复用时钟、质量档、镜头、浏览器证据和决策门，但没有复用 Gerstner 波充当河流求解；Waterfall、Flood Proxy 同样只能复用接口和证据格式，不能照搬 Ocean 模型。

## 不应扩张的结论

- 数值单位只用于内部 A/B，不对应真实米制风速、浪高或周期。
- 船体姿态是四点视觉采样代理，不是压力积分、浮力稳定性或安全分析。
- 当前没有 FFT 风谱、破碎浪、卷浪、船尾流、海岸反射、港口波场、浅水传播或结构载荷。
- 单台 Intel UHD / Chromium 的结果不是跨浏览器、跨 GPU 或移动真机性能承诺。
