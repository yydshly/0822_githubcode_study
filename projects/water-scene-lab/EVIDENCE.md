# Water Scene Lab 证据记录

## 2026-08-24｜宏观主线重启与 Waterfall Particles4All 接入

- 目标平台固定为桌面浏览器；移动端和时变洪水分支进入 held；
- Waterfall 页面保留连续水幕/破碎层作为宏观表现，并增加按需加载的 Particles4All 近场物理镜头；
- 16.8 m 落差映射出 18.16 m/s 理想撞击速度，再有界缩放为已验证的 `-2.5 u/s` solver 输入；
- 384/384 粒子实际进入原库 `Sim.appendFluid()`，推进 30/30 ticks，`nonFinite=0`；
- 原库 Shape Matching sphere 位移 `0.415974 u`；WebGPU context 成立；
- `water-scene.particles4all-near-field/v1` 已把宏观层、懒加载、尺度映射、发射器、探针、验收阈值与真实性边界固化为 JSON；
- 通用编译器/执行器取代页面硬编码；双场景契约测试现为 36/36，Waterfall 桌面 Chrome Gate 17/17，无水平溢出、console/page error 为空。

证据文件：[`waterfall-mvp/assets/particles4all-bridge-browser-results.json`](waterfall-mvp/assets/particles4all-bridge-browser-results.json)、[`waterfall-mvp/assets/particles4all-bridge-desktop.png`](waterfall-mvp/assets/particles4all-bridge-desktop.png)。

边界：宏观水幕不是 PBF；跨尺度只有 T2 输入映射，尚未把 solver 粒子质量并入 Watershed T3 水量预算。

## 2026-08-24｜River 第二场景横向复用

- River 中段 `sampleFlow` 切线 `(-0.617, 0.787)` 通过局部坐标帧映射为 solver `+X` 入流；
- 第二份场景 JSON 与 Waterfall 共用 `water-scene.particles4all-near-field/v1`、`Particles4AllRuntimeAdapter` 和 `particles4all-scene-runner-v1`；
- 480/480 粒子实际注入，36/36 ticks，`nonFinite=0`；
- Shape Matching sphere 沿指定 `+X` 流向位移 `0.132112 u`，而不是只以总位移掩盖重力下降；
- River 桌面 Chrome Gate 18/18，无水平溢出、console/page error 为空。

证据文件：[`river-mvp/assets/particles4all-reuse-browser-results.json`](river-mvp/assets/particles4all-reuse-browser-results.json)、[`river-mvp/assets/river-particles4all-desktop.png`](river-mvp/assets/river-particles4all-desktop.png)。

边界：宏观 River 仍是样条/flow-map 表达，近场粒子不是现实流量、水深或浅水传播。

## 2026-08-24｜Ocean 第三场景横向复用

- 固定 Ocean `sampleSurface` 世界点在 `t=5 s` 读取高度 `-0.1478 u`、法线约 `(0.08, 0.92, 0.38)` 与垂向速度 `+1.6470 u/s`；
- 垂向速度映射为 solver `+Y 4.0 u/s` 的 640 粒子局部脉冲，不复制 River 的 `+X` 入流；
- 同一 `particles4all-scene-runner-v1` 增加可选的无注入基线比较：基线刚体沿 Y 位移约 `-0.4537 u`，注入后约 `-0.1543 u`，差值 `+0.2994 u`；
- 640/640 粒子、36/36 ticks、`nonFinite=0`，Ocean 桌面 Chrome Gate 18/18；
- 三份场景契约共用同一 Schema、Runtime Adapter 与 Runner，契约测试 49/49。

证据文件：[`ocean-mvp/assets/particles4all-reuse-browser-results.json`](ocean-mvp/assets/particles4all-reuse-browser-results.json)、[`ocean-mvp/assets/ocean-particles4all-desktop.png`](ocean-mvp/assets/ocean-particles4all-desktop.png)。

边界：宏观海面仍由 Gerstner 波负责；局部差值证明原库液固响应存在，但不代表现实浮力、波压、船舶安全或近岸淹没。下一活动工作包是三场景能力与价值路线决策。

## 2026-08-24｜三场景决策与 Native Body Contract

- [`CROSS_SCENE_DECISION.md`](CROSS_SCENE_DECISION.md) 已比较三场景的公共执行链、场景价值、特例成本和真实性缺口；
- Gate 10 决定下一主线只使用原库已有 `sphere / torus / box`、density 与 Shape Matching 做场景对象差异化；
- `localPhysics.body` 已显式声明 shape、density、startY、size 和 sceneRole，并与 engine query 双向校验；
- Runner 从实际原库运行时回读 body profile 并把一致性纳入 acceptance；
- Waterfall、River、Ocean 回读结果均为契约声明的 `sphere / 0.5 / 0.15`，三组真实浏览器回归通过。

边界：本阶段没有增加复杂碰撞体、glTF/SDF、复合刚体或新求解算法。活动工作包切换为 Waterfall 原生高密度 box 场景响应。

## 2026-08-24｜Waterfall 原生高密度对象

- Waterfall scene contract revision 2 将通用 sphere 替换为原库 `box / density 2.2 / startY 0.76 / size 0.15`，scene role 为 `dense-impact-block`；
- Runner 运行无注入基线与相同 384 粒子瀑布脉冲，均推进 30 ticks；
- 基线沿 `-Y` 位移约 `0.3168 u`，注入后约 `0.3322 u`，瀑布脉冲相对基线额外产生约 `0.0154 u` 向下响应；
- body profile、注入、ticks、有限值、总响应、基线差分和 WebGPU acceptance 全部通过；桌面浏览器 Gate 19/19；
- 页面明确展示 `box / ρ 2.2` 与相对基线撞击值，桌面整页无横向溢出。

边界：box 是 Particles4All 原生均匀密度粒子刚体，不是实际岩石网格、材料模型或结构载荷计算。活动工作包切换为 River 原生漂浮物响应。

## 2026-08-24｜River 原生低密度漂浮物

- River scene contract revision 2 将通用 sphere 替换为原库 `box / density 0.35 / startY 0.76 / size 0.15`，scene role 为 `drifting-debris-block`；
- 480/480 粒子沿局部 `+X 2.5 u/s` 注入并推进 36/36 ticks，`nonFinite=0`；
- 原生 box 沿流位移约 `0.2470 u`，Shape Matching 姿态相对初始旋转约 `14.25°`；
- body profile、沿流方向、旋转角和 WebGPU acceptance 通过；桌面浏览器 Gate 20/20；
- 页面同时展示 native profile、沿流位移、旋转角和场景角色。

边界：该 box 是均匀密度粒子刚体，不是标定木料、真实漂木几何、河床碰撞或工程流速。活动工作包切换为 Ocean 原生 torus 浮环。

## 2026-08-24｜Ocean 原生低密度浮环与 Stage 8 核心里程碑

- Ocean 运行时回读对象为 `torus / density 0.22 / size 0.15 / floating-ring-probe`，与场景契约一致；
- 640/640 粒子、36/36 ticks、`nonFinite=0`；无注入基线沿 Y 位移约 `-0.45368 u`，注入后约 `-0.43840 u`，相对基线上举 `0.01528 u`；
- Shape Matching 姿态变化约 `1.20°`，桌面 Chrome Gate 20/20；
- 三场景完整回归：Waterfall 19/19、River 20/20、Ocean 20/20；场景契约 58/58。

阶段结论：Waterfall 高密度撞击块、River 低密度漂移块与 Ocean 低密度浮环已经形成同一 Particles4All 原生算法能力下的三种可解释差异。Stage 8 核心对象里程碑通过，活动工作包切换为跨设备复核；不增加第四个水场景，也不另建液体求解器。

## 2026-08-24｜Stage 8 跨浏览器与第二 GPU Gate

- Chrome `151.0.7922.170` / Intel Gen-12LP：Waterfall 19/19、River 20/20、Ocean 20/20；
- Edge `151.0.4129.101` / Intel Gen-12LP：Waterfall 19/19、River 20/20、Ocean 20/20；
- Edge `151.0.4129.101` / NVIDIA Lovelace（RTX 4070 Laptop）：Waterfall 19/19、River 20/20、Ocean 20/20；
- 聚合 Gate 55/55；瀑布撞击增量、河流沿流位移/旋转、海洋上举增量/旋转的跨配置相对离散度分别约 `0.09% / 0.02% / 0.11% / 0.59% / 3.26%`。

证据文件：[`cross-device-gate-results.json`](cross-device-gate-results.json)。Stage 8 完整通过；Stage 9 只负责从既有原库能力和场景价值中选择下一条单一路线。

## 2026-08-24｜Stage 9 Interactive Water Sandbox 决策

- 候选路线比较后，固定预设的 Interactive Water Sandbox 成为唯一 `advance` 路线；工程数字孪生和通用编辑器 held，第四种孤立水效果与新液体求解器 stop；
- 宏观用途限定为游戏原型、互动展示和科普教学；目标平台继续为桌面浏览器；
- 三预设直接引用 Waterfall、River、Ocean 已有场景契约，不复制或改写 PBF/Shape Matching；
- 运行策略固定为按需加载、最多一个 solver、切换预设前卸载、必须支持 reset；
- [`sandbox-program.json`](sandbox-program.json) 静态 Gate 40/40，通过三份源契约的 shape、density、sceneRole、provider 与 Schema 一致性检查。

阶段结论：Stage 9 / Gate 15 通过，Stage 10 开始建设宿主页面壳和预设导航。该结论只批准固定预设宿主，不批准通用编辑器或工程仿真。

## 2026-08-24｜Interactive Water Sandbox Host Shell

- 新路由 `/demos/water-scene-lab/sandbox/` 已形成桌面 Spatial Stage：三预设导航、唯一物理视口和对象/映射/历史证据控制台；
- Preset Registry 直接导入三份已有场景契约，模型检查 25/25；
- 1440×1000 与 1280×900 桌面 Chrome 的路由、三预设、键盘、可见焦点、来源链接、无溢出与无错误检查全部通过；
- 页面明确显示 `NO WEBGPU DEVICE CREATED`，两视口均回读 `runtimeSlots=0`、`runtimeLoaded=false`、iframe 无 `src`。

证据见 [`sandbox-mvp/EVIDENCE.md`](sandbox-mvp/EVIDENCE.md)。Gate 16 通过；活动工作包切换为 S10-WP2 单 Runtime 与已有场景契约执行。

## 2026-08-24｜Interactive Water Sandbox 单 Runtime

- Sandbox 直接复用 `Particles4AllRuntimeAdapter`、`particles4all-scene-runner-v1` 和三份既有契约，没有增加独立液体/刚体算法；
- Chrome 151、1440×1000 的 Runtime Gate 30/30：Waterfall 384/30、River 480/36、Ocean 640/36 三次运行的 WebGPU、原生 body profile、有限值与 acceptance 全部通过；
- 三次运行 `maxObservedRuntimeSlots=1`；两次跨预设切换均先自动卸载到 `slots=0 / iframe no-src`；最后手动卸载回到 `idle / slots=0 / no-src`；
- 页面“本次运行结果”与 Runtime 返回的粒子注入、tick、主响应、旋转、非有限位置和 body profile 一致；三张桌面运行态截图完成视觉复核。

证据见 [`sandbox-mvp/EVIDENCE.md`](sandbox-mvp/EVIDENCE.md) 和 [`sandbox-mvp/assets/runtime-slot-browser-results.json`](sandbox-mvp/assets/runtime-slot-browser-results.json)。Gate 17 通过；活动工作包切换为 S10-WP3 证据引导、可控重跑与错误恢复。

## 2026-08-24｜Interactive Water Sandbox 引导生命周期

- 新增运行前 contract/body/粒子/tick 摘要、四阶段证据引导和 Runner acceptance 逐项结果；
- 1440×1000 Waterfall 与 1280×900 River 各完成首次运行和同 Runtime 重跑；两次均保持 `slots=1`、iframe src 不变，loading 只发生一次；
- “清除结果”进入 `ready / result=null / runtimeLoaded=true`，“卸载归零”进入 `idle / slots=0 / iframe no-src`；
- 无 WebGPU 场景能由共享 Adapter 快速读取上游错误并进入明确 error，且不生成伪 acceptance；键盘卸载后恢复 idle；
- Chrome 151 Guided Lifecycle Gate 19/19，首次 Waterfall/River 运行约 14.5/13.0 秒，桌面两视口无横向溢出或浏览器错误。

证据见 [`sandbox-mvp/EVIDENCE.md`](sandbox-mvp/EVIDENCE.md) 和 [`sandbox-mvp/assets/guided-lifecycle-browser-results.json`](sandbox-mvp/assets/guided-lifecycle-browser-results.json)。Gate 18 通过；活动工作包切换为 S10-WP4 Sandbox 桌面跨浏览器与跨 GPU Gate。

## 2026-08-24｜Waterfall 分时连续落水可见 A/B

- 项目节奏切换为 `observable output first`；Sandbox 跨设备复核 held，优先交付场景实际效果；
- A/B 都使用原 Particles4All PBF / Shape Matching、同一 Runtime、高密度 box、384 粒子、−2.5 u/s 与 42 ticks；
- A 在 tick 0 注入 384；B 每 3 ticks 注入 32、共 12 次，唯一变量为发射时间；
- Chrome 151 WebGPU Gate 12/12：A/B 均 384/384、42/42、非有限位置 0、`slots=1`；
- A 的高位垂直占用 1/12、最高位置约 0.282 u；B 为 7/12、约 0.673 u；
- 画面确认 B 形成更长的纵向粒子链，但仍有离散脉冲；B 刚体基线差约 −0.00004 u，因此只批准“时间连续性改善”，不批准“连续水幕”或“冲击增强”。

可运行入口：`/demos/water-scene-lab/waterfall-continuity/`。证据见 [`waterfall-continuity/EVIDENCE.md`](waterfall-continuity/EVIDENCE.md)。

## 证据范围

本文件汇总 Water Scene Lab 路线台与已运行分支。当前有四条独立 `evidence-backed prototype`：Local Liquid、Ocean、River 和 Waterfall；Flood Proxy 已在 Watershed Slice v3 中形成容量、优先蓄水和障碍改道集成基线，但通用高度场/浅水能力仍是 `source-backed plan`。这里的“有证据”只表示各分支固定范围内的模型与页面检查，不表示整个 Water Scene Lab 已 `validated`。

从目标驱动阶段开始，证据分为两类：

| 证据类型 | 当前数量 | 含义 |
| --- | --- | --- |
| Capability Evidence | 4 | 独立能力在固定问题和固定范围内成立 |
| Integration Model Contract | 1 | 拓扑、单位、T2 映射和 T3 状态传递已有模型证据 |
| Integration Runtime Evidence | 1 | Watershed Slice v3 已证明 River、Waterfall、有限容量 Pool、溢流、Floodplain 优先蓄水与障碍改道的可观察因果链成立 |
| Particles4All Scene Runtime | 3 | Waterfall、River 与 Ocean 使用同一契约 Schema 和 Scene Runner，通过纵向落水、水平入流和基线差分上举三种映射驱动原库 |

Watershed Slice v3 延续第一条 T3 集成运行证据：同一场景连接 River、Waterfall、有限容量 Pool 和 Floodplain，并将公共 `Q`、有限库存、在途体积、撞击沉积、容量阈值、溢流、蓄水、障碍改道与边界收支作为持续、可观察状态。下一条证据目标是时变暴雨/闸坝失效是否暴露静态路由代理的不足，而不是继续增加孤立水效果。

Local Liquid 的算法与硬件运行证据位于 [Particles4All / EVIDENCE.md](../particles4all/EVIDENCE.md)。

Ocean 的固定 6 波模型、四点船体采样、1,200 步平静/风浪 A/B、桌面/390px 浏览器、reduced-motion 和 WebGL fallback 证据位于 [Ocean MVP / EVIDENCE.md](ocean-mvp/EVIDENCE.md)。三次隔离性能复测通过；当前 Gate 为 `continue Ocean baseline / hold FFT`，该阶段的证据协议已用于 River。

River 的固定 8 点样条、等弧长与最近点查询、共享方向场、8 个同起点漂浮标记和 1,200 步固定/切线方向 A/B 证据位于 [River MVP / EVIDENCE.md](river-mvp/EVIDENCE.md)。数值、桌面、390px 正常/reduced-motion 与强制 WebGL fallback 均通过；当前 Gate 2 为 `continue River visual baseline / hold shallow-water`。

Waterfall 的固定主水幕、104 个破碎代理、1,200 tick curtain-only / hybrid-breakup A/B、桌面/390px 正常/reduced-motion 与强制 fallback 证据位于 [Waterfall MVP / EVIDENCE.md](waterfall-mvp/EVIDENCE.md)。模型 24 / 24 与浏览器功能、视觉和 P50/P95 门通过；桌面与移动正常档各一次长帧（50.1 / 91.6 ms）保留为优化项。当前 Gate 3 为 `continue Waterfall hybrid visual baseline`。Particles4All coupling 不再是永久暂停项，而由山地水系的 Pool 近景交互子目标决定是否进入。

Flood Proxy 的宿主问题是“Pool 溢流进入 Downstream/Floodplain 后，地形与障碍如何改变传播”。Watershed Slice v3 已建立容量阈值、溢流传递、确定性优先蓄水、障碍改道和固定开放边界；但它没有格间动量、传播速度、回水或浅水方程，不能当作通用 Flood 求解器证据。

## 集成证据登记

| 集成分支 | 状态 | 预期真实性 | 首个 Gate |
| --- | --- | --- | --- |
| Mountain Watershed model contract | `model evidence passed` | `T2 Physically mapped` | 7 节点/6 连接与 23 项累计检查通过 |
| Mountain Watershed / Watershed Slice v0 runtime | `runtime evidence passed` | `T2 Physically mapped` | 同一 `dischargeScale` 可追踪地驱动 River → Waterfall → Pool；模型 23/23，桌面/移动/fallback 通过 |
| Watershed Slice v1 / River → Waterfall → Pool | `runtime evidence passed` | `T3 Locally coupled` | 上游扣减、在途代表水量、撞击沉积和 Pool 出流形成闭环；模型 24/24、浏览器通过 |
| Pool → Floodplain capacity/storage v2 | `runtime baseline passed / active next gate` | `T3` | A 不溢流、B 越限后蓄水；26/26 与浏览器通过 |
| Floodplain barrier/open-path routing v3 | `runtime baseline passed / active next gate` | `T3` | 相同溢流下障碍改道；26/26 与桌面/移动通过 |
| Temporal hydrograph / breach input | `active` | `T2–T3` | 到达曲线、峰值滞蓄和边界误差公开 |

T2、T3、溢流、障碍路由与浏览器原始结果位于 [`watershed-model-test-results.json`](watershed-slice/assets/watershed-model-test-results.json)、[`watershed-coupled-model-test-results.json`](watershed-slice/assets/watershed-coupled-model-test-results.json)、[`watershed-overflow-model-test-results.json`](watershed-slice/assets/watershed-overflow-model-test-results.json)、[`watershed-floodplain-routing-test-results.json`](watershed-slice/assets/watershed-floodplain-routing-test-results.json) 和 [`watershed-browser-results.json`](watershed-slice/assets/watershed-browser-results.json)。它们证明固定场景的拓扑、单位、库存、在途体积、沉积、Pool 容量、溢流、优先蓄水、障碍改道和边界收支闭合；仍不证明格间浅水动量、传播速度、回水、现实校准或工程洪水传播。

## 2026-08-24｜Watershed Slice v3 障碍路由基线

路径实验的 A/B 均使用 `dischargeScale = 1`，唯一变量为 `floodplainRoutingMode`。两组 River、Waterfall、Pool、累计溢流 28.50 m³、Floodplain 蓄水 26.4625 m³与边界流出 2.0375 m³完全相同。A 开放路径湿润 24 格、平均横向距离 5.60 m、最远到第 3 行；B 的第 2 行中央 8 格不可蓄水且始终干燥，湿润路径绕向两侧，最终湿润 25 格、平均横向距离 8.88 m、最远到第 4 行。

障碍路由模型 26 / 26 通过；阈值桌面/移动/reduced-motion、路径桌面/移动与强制 fallback 全部通过，无横向溢出、控制台错误、页面异常或失败请求。障碍固定镜头见 [`watershed-barrier-desktop.png`](watershed-slice/assets/watershed-barrier-desktop.png)，原始报告见 [`watershed-browser-results.json`](watershed-slice/assets/watershed-browser-results.json)。

固定 60 帧 SwiftShader 结构诊断为阈值桌面 56 calls / 38,464 triangles、移动端 28 / 14,576；软件调度下的帧间隔不外推为真实 GPU 承诺，原始结果见 [`watershed-performance-routing-t3.json`](watershed-slice/assets/watershed-performance-routing-t3.json)。

阶段结论：`continue Watershed T3 routing / activate temporal hydrograph experiment`。当前障碍只改变确定性蓄水优先级，不计算流速、压力、回水或真实洪水动力。

## 2026-08-24｜Watershed Slice v2 Pool 溢流与 Floodplain 基线

固定 20 秒 A/B 仍只改变 `dischargeScale`。Pool 容量为 1,710 m³；A 最终 Pool 1,684.25 m³且不溢流，B 在第 712 tick（约 11.87 s）首次越限，最终累计溢流 28.50 m³。Floodplain 使用 12 × 7 确定性优先蓄水格和 0.25 m³/s 固定开放边界：B 最终蓄水 26.4625 m³、边界流出 2.0375 m³并湿润 24/84 格；A 维持 0 格湿润。全局残差低于 `2 × 10⁻¹⁰ m³`，最大单步残差低于 `5 × 10⁻¹³ m³`。

溢流模型 26 / 26 通过；Chromium 151 的桌面、390px、reduced-motion 与强制 fallback 通过，无横向溢出、控制台错误、页面异常或失败请求。洪泛区固定镜头证据见 [`watershed-floodplain-desktop.png`](watershed-slice/assets/watershed-floodplain-desktop.png)，原始浏览器报告见 [`watershed-browser-results.json`](watershed-slice/assets/watershed-browser-results.json)。

固定 60 帧 SwiftShader 结构诊断为桌面 52 calls / 34,432 triangles、移动端 26 / 12,560；相对 T3 瀑布优化基线增加的是洪泛地床、干格、水格和溢流通道。软件渲染帧间隔不外推为真实 GPU 承诺，原始结果见 [`watershed-performance-overflow-t3.json`](watershed-slice/assets/watershed-performance-overflow-t3.json)。

阶段结论：`continue Watershed T3 overflow / activate barrier-open-path A/B`。当前 Floodplain 是容量阈值与优先蓄水代理，不是浅水传播或真实洪水预测。

## 2026-08-24｜Watershed Slice v1 T3 与瀑布优化证据

固定 20 秒 A/B 只改变 `dischargeScale`：A/B Source 输入均为 40 m³，River 分别排出 60/120 m³并剩余 220/160 m³；Waterfall 最终在途 5.75/11.50 m³、累计沉积 54.25/108.50 m³；Pool 在固定出流后上升 0.010/0.139 m。T3 模型 24 / 24 通过，全局残差低于 `2 × 10⁻¹⁰ m³`，最大单步残差为 0。

瀑布表现新增不规则连续水幕、模型在途水滴、撞击泡沫、涟漪和雾沫；泡沫/雾沫只读取实际沉积强度。浏览器提供全水系、全落差和撞击区三镜头，桌面、390px、reduced-motion 与强制 fallback 均通过；撞击近景证据见 [`watershed-impact-desktop.png`](watershed-slice/assets/watershed-impact-desktop.png)。

优化采用质量档、实例化节点标记和镜头视觉 LOD：默认远景不提交不可读的撞击细节。相同 1440×900 页面、994×804 软件画布下，桌面 draw calls 从 60 降至 44，三角形从 35,008 降至 30,352；移动端从 30/12,312 降至 22/10,520。SwiftShader 帧间隔受共享软件渲染调度影响，桌面未通过临时 22 ms 门，因此只登记结构成本下降，不宣称真实 GPU 帧率提升。原始数据见 [`watershed-performance-baseline-t2.json`](watershed-slice/assets/watershed-performance-baseline-t2.json) 与 [`watershed-performance-optimized-t3.json`](watershed-slice/assets/watershed-performance-optimized-t3.json)。

阶段结论：`continue Watershed T3 / activate Pool → Floodplain`。当前局部闭环不是 CFD 或水文预测；Pool 容量、溢流阈值、地形传播和 T4 校准仍未实现。

## 2026-08-24｜Watershed Slice v0 集成运行证据

入口：[`docs/demos/water-scene-lab/watershed/`](../../docs/demos/water-scene-lab/watershed/)

固定实验：

- A：`dischargeScale = 0.5`，`Q = 3 m³/s`；
- B：`dischargeScale = 1.0`，`Q = 6 m³/s`；
- 共享地形、River 路径、出口宽度与水头、18 m 落差、重力、Pool 面积与出流、相机和 1,200 步时间轴；
- 浏览器快照的固定输入差异仅为 `dischargeScale`。

结果：

- 模型 23 / 23 检查通过，A/B 流量、水幕厚度和累计入流均为 2:1；
- 飞行时间为 1.916 s、水平射程 7.2 m、撞击速度 19.16 m/s，两侧由相同重力轨迹派生；
- 20 秒后 A Pool 上升 0.024 m、B 上升 0.167 m；累计预算残差低于 `2 × 10⁻¹⁰ m³`；
- Chromium 151.0.7922.170 的 1440×900、390×844、390×844 reduced-motion 与强制 fallback 功能检查通过；
- 两个正常视口无横向溢出、控制台错误、页面异常或失败请求；
- 移动端 P95 含初始化与验证切换长帧，本轮只登记功能运行证据，不批准隔离性能 Gate。

证据截图：

- [`watershed-desktop.png`](watershed-slice/assets/watershed-desktop.png)
- [`watershed-mobile.png`](watershed-slice/assets/watershed-mobile.png)
- [`watershed-mobile-reduce.png`](watershed-slice/assets/watershed-mobile-reduce.png)

边界结论：`continue to T3 local coupling`。当前页面已经证明“同一物理映射输入贯穿多个场景模块”，但水滴仍是视觉采样，River 没有扣减有限库存，Pool 接收的是映射入流而非真实碰撞沉积。

## 2026-08-24｜目标与能力台浏览器检查

入口：

```text
http://127.0.0.1:8107/demos/water-scene-lab/
```

固定视口：

- Desktop：1440 × 900
- Mobile：390 × 844，`reduced-motion`

检查内容：

- HTTP 200，正文非空，页面标题与宏观目标主命题存在。
- 3 个宏观场景计划、5 个能力模块、6 个目标驱动阶段和完整选择矩阵均已渲染。
- 路线锚点可以导航，Local Liquid 链接指向 Particles4All 实验台，Ocean、River 与 Waterfall 链接分别指向可运行 MVP。
- 页面显示 4 条能力证据、1 条集成运行证据与 1 条活动宏观计划；Watershed Slice v3 标记为 T3 路由运行通过，时变过程线为当前活动阶段。
- 公共契约显示 7 项，包括 `WaterTransfer` 和 `truthLevel`；目标链包含“宏观场景 → 子目标 → 能力实验 → 场景集成 → 证据与决策”。
- 两个视口的横向溢出均为 0。
- 控制台错误、页面异常、失败请求和框架错误层均为 0。

Chromium 151.0.7922.170 的桌面 1440×900 与移动 390×844 回归全部通过。该检查验证的是目标台内容、Watershed 入口、链接、响应式布局和错误状态；Mountain Watershed 的运行证据由独立 Watershed 浏览器测试登记。

原始结果：[`assets/route-browser-results.json`](assets/route-browser-results.json)

证据截图：

- [`assets/route-desktop.png`](assets/route-desktop.png)
- [`assets/route-mobile.png`](assets/route-mobile.png)

## 复现

先在仓库根目录启动静态服务器：

```powershell
python -m http.server 8107 --directory docs
```

浏览器检查脚本位于 [`tests/browser-smoke.cjs`](tests/browser-smoke.cjs)。脚本优先使用当前 Node 环境的 `playwright`；Codex 工作区运行时可通过 `WATER_LAB_NODE_MODULES` 指向打包依赖，并用 `WATER_LAB_CHROME` 覆盖 Chrome 路径。

输出是测试时的本地浏览器证据，不代表所有浏览器、GPU 或设备都已覆盖。
