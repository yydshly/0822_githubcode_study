# Waterfall MVP｜瀑布混合视觉原型

## Particles4All 原生高密度对象（2026-08-24）

近场契约 revision 2 使用原库 `box / density 2.2 / size 0.15`，并以无注入基线排除重力自身造成的下落。384 粒子瀑布脉冲运行 30 ticks 后，相对基线增加约 `0.0154 u` 的向下刚体响应；桌面 Chrome Gate 19/19。该 box 是原库均匀密度 Shape Matching 刚体，不是现实岩石或结构载荷模型。

## 2026-08-24｜Waterfall Vertical Slice：Particles4All 近场接入

原有连续水幕与破碎粒子 A/B 继续作为宏观/中景表现层；桌面页面现新增按需加载的 Particles4All 近场物理镜头。两层职责明确分离：

```text
16.8 m 宏观落差
→ √(2gH) = 18.16 m/s 理想撞击速度
→ 有界映射为 -2.5 u/s solver 输入
→ 可序列化 Scene Contract / 通用 Particles4All Scene Runner
→ 上游 PBF + XSPH + 表面张力 + Shape Matching
→ 局部水池与刚体响应
```

- 宏观水幕仍是 Three.js 解析表现，不冒充整条瀑布由 PBF 求解；
- 384 个注入粒子是固定近场采样，不等于现实流量；
- 跨尺度只声明 `T2 mapped input`；Particles4All 内部局部相互作用声明为 `T3 local PBF / rigid coupling`；
- 近场 iframe 默认不创建 WebGPU，点击运行后才加载，并可显式卸载；
- 当前目标平台只覆盖桌面浏览器。

`water-scene.particles4all-near-field/v1` 已把宏观角色、加载策略、尺度映射、发射器、探针、验收阈值与真实性边界固化为可导出的 JSON。契约测试 25/25；Chrome / Intel Gen-12LP 浏览器 Gate 17/17：实际注入 384/384、30/30 ticks、`nonFinite=0`、刚体位移 `0.4159 u`，页面无横向溢出、console/page errors 为空。

证据：[`assets/particles4all-bridge-browser-results.json`](assets/particles4all-bridge-browser-results.json)、[`assets/particles4all-bridge-desktop.png`](assets/particles4all-bridge-desktop.png)、[`tests/particles4all-bridge-browser.cjs`](tests/particles4all-bridge-browser.cjs)。

## 当前结论

Waterfall MVP 已完成 `waterfall-breakup-v1` 的固定数值协议和 Chromium 硬件 WebGL2 浏览器验收：模型检查 24 / 24 通过，桌面、390px 正常/reduced-motion 与强制 fallback 全部通过，现为 `evidence-backed prototype`。

固定 A/B 只改变 `breakupMode`：A 为 `curtain_only`，只显示连续主水幕；B 为 `hybrid_breakup`，在完全相同的主水幕上增加一层预设破碎粒子。崖壁、落差、水幕、种子、相机和时间轴保持一致，白沫与雾在正式实验中都锁定关闭。

证据支持两个分层结论：宏观 A/B 中，B 可重复增加边缘扩展与落点占用，但仍只是视觉代理；近场契约运行中，原库 PBF 保持有限值并产生 Shape Matching 刚体响应。历史 Gate 3 视觉结论继续保留，当前 Stage 6 Gate 为 `Waterfall scene contract passed / advance River reuse`。

## 已实现能力

- 固定宽度、落差和相位规则的主水幕，可按 `u / v / time` 查询位置、切向量、法线、视觉速度和下落距离。
- 104 个固定破碎代理：48 个边缘/下落代理和 56 个落点飞溅代理，均有固定出生相位、寿命和边界。
- A/B 共用同一 `curtainHash`、主水幕探针摘要和契约，只允许 `breakupMode` 不同。
- 固定 60 Hz、1,200 tick、20 秒协议；前 120 tick 预热，第 121–1,080 tick 统计，共 960 tick。
- 页面按同一相机与时间轴比较连续水幕和增加破碎粒子；白沫、雾只作为独立探索开关，不进入正式 A/B。
- 页面已验证 reduced-motion、质量档、性能遥测和 WebGL fallback；结果以 [`EVIDENCE.md`](EVIDENCE.md) 为准。

## 运行

从仓库根目录启动静态服务器：

```powershell
python -m http.server 8107 --directory docs
```

打开：

```text
http://127.0.0.1:8107/demos/water-scene-lab/waterfall/
```

模型测试：

```powershell
node projects/water-scene-lab/waterfall-mvp/tests/model-test.mjs
```

浏览器测试需要 Playwright 和可用的 Chromium/Chrome；工作区打包运行时可用 `WATER_LAB_NODE_MODULES` 与 `WATER_LAB_CHROME` 指定依赖和浏览器。

## 实现结构

| 文件 | 作用 |
| --- | --- |
| [`docs/demos/water-scene-lab/waterfall/waterfall-model.mjs`](../../../docs/demos/water-scene-lab/waterfall/waterfall-model.mjs) | 唯一固定模型、主水幕查询、破碎代理生命周期、A/B 摘要与哈希 |
| [`docs/demos/water-scene-lab/waterfall/app.js`](../../../docs/demos/water-scene-lab/waterfall/app.js) | Three.js 崖壁、水幕、破碎粒子、同步视图、诊断层、质量档与 fallback |
| [`docs/demos/water-scene-lab/waterfall/index.html`](../../../docs/demos/water-scene-lab/waterfall/index.html) | 可运行实验界面、指标、方法与真实性说明 |
| [`PROTOCOL.md`](PROTOCOL.md) | 固定变量、粒子代理、统计指标与验收契约 |
| [`EVIDENCE.md`](EVIDENCE.md) | 数值结果、浏览器实测、人工视觉复核、限制和 Gate 3 判断 |

Three.js 使用仓库内的 r185 ES module：`docs/demos/shijing-dayu-immersive/vendor/three.module.js`。它是固定本地依赖，页面运行期间不从 CDN 获取。

## 对后续场景的意义

Waterfall 补上的不是另一种“水面皮肤”，而是一种跨尺度的混合表达方法：低成本连续几何负责主体轮廓，有限粒子只负责网格不擅长的破碎与撞击。它可以服务峡谷瀑布、堤坝泄水、闸口落水、山涧跌水和奇观叙事，也能给以后 River 上游与 Local Liquid 落水池之间定义视觉连接点。

这条路线已经通过落水池刚体响应建立第一个升级门：只有宿主体验确实需要局部自由液面或物体交互，才由场景契约调用 Particles4All；仅仅因为粒子看起来更“物理”，仍不构成扩展理由。

## 不应扩张的结论

- 主水幕是可查询的网格/着色视觉代理，不求解液体体积、压力或自由表面。
- 破碎粒子使用固定发射与生命周期，不由主水幕质量流失、碰撞或湍流自动产生。
- 落点占用是预设区域中的视觉覆盖指标，不是落水池碰撞或流量测量。
- 白沫与雾在固定 A/B 中关闭；后续打开时必须独立评估价值与成本。
- 浏览器证据来自单台 Windows / Intel UHD / Chromium，不能扩张为跨浏览器、跨 GPU 或移动真机承诺。
- 桌面与移动正常档各记录一次长帧（50.1 / 91.6 ms）；P50/P95 通过不等于没有尾部卡顿，后续仍应隔离系统调度与运行尖峰。
- 单一固定崖壁和相机不能代表其他落差、宽度、风向、地形或设备。
