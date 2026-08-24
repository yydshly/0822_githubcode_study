# Water Scene Lab 目标驱动路线图

> **路线已重启**：目标平台固定为桌面浏览器。Stage 0–4 与 Stage 5 的历史代理证据保留；当前不继续暴雨/洪水分支，而由 Stage 6 先把完成研究的 Particles4All 作为近场物理核心接入宏观场景。

## 路线图原则

路线图不再按“下一个实现哪种水”排序，而按“宏观场景还缺少哪种可验证能力”推进。

```text
宏观目标
→ 场景结果
→ 子目标与能力缺口
→ 最小单变量实验
→ 集成回场景
→ 场景级证据
→ 下一轮决策
```

独立能力实验继续遵守单变量 A/B；集成场景允许组合多种能力，但必须能够追踪每条因果链和数据来源。

## 当前双轴状态

### 能力轴

| 能力 | 状态 | 当前结论 |
| --- | --- | --- |
| Local Liquid | `evidence-backed prototype` | 局部自由液面和刚体交互候选 |
| Ocean | `evidence-backed prototype` | 解析大范围波面与 `sampleSurface` 基线成立；FFT 按宏观需求进入 |
| River | `evidence-backed prototype` | 样条河道和 `sampleFlow` 空间一致性成立；真实水深/流量尚未实现 |
| Waterfall | `evidence-backed prototype` | 连续水幕和有限破碎层视觉增益成立；质量传递尚未实现 |
| Flood | `source-backed plan` | 浅水/高度场路线有依据；本仓库尚无运行证据 |

### 集成轴

| 集成能力 | 状态 |
| --- | --- |
| 公共世界单位与场景语义 | `model-contract evidence` |
| `WaterGraph` / `WaterTransfer` | `implemented model baseline` |
| River → Waterfall 局部质量传递 | `T3 runtime evidence passed` |
| Waterfall → Pool 沉积 | `T3 runtime evidence passed` |
| Pool → Floodplain 容量/优先蓄水 | `T3 runtime baseline passed` |
| Floodplain 障碍/开口路由代理 | `T3 runtime baseline passed` |
| 暴雨过程线 / 闸坝失效时变传播 | `held` |
| Source → River → Waterfall → Pool → Floodplain 连续运行证据 | `T3 overflow slice passed` |
| Waterfall → Particles4All 近场物理镜头 | `runtime evidence passed / contract-driven / 17 checks` |
| River → Particles4All 沿流向障碍镜头 | `runtime evidence passed / shared runner / 18 checks` |
| Ocean → Particles4All 海浪上举镜头 | `runtime evidence passed / baseline differential / 18 checks` |

## Stage 0｜能力勘探

**状态**：`completed`

已完成：

1. Particles4All 局部液体和刚体研究基线。
2. Water Scene Lab 场景路由和统一实验契约。
3. Ocean 固定 6 波、四点船体采样和固定 A/B。
4. River 固定样条、弧长/最近点查询和固定/切线 A/B。
5. Waterfall 主水幕、有限破碎代理和 curtain-only/hybrid A/B。

阶段结论：已经知道“零件分别能做什么”，但没有证明它们能够构建一个连续水环境。

## Stage 1｜宏观目标与连接基线

**状态**：`completed as model contract`

目标：把宏观场景、真实性等级和跨模块契约变成项目一级资产。

产物：

- [`MACRO_GOAL.md`](MACRO_GOAL.md)；
- [`TARGET_ARCHITECTURE.md`](TARGET_ARCHITECTURE.md)；
- [`MOUNTAIN_WATERSHED.md`](MOUNTAIN_WATERSHED.md)；
- 公共米/秒/体积流量约定；
- `ScenarioGoal`、`WorldContext`、`WaterGraph` 和 `WaterTransfer` 数据规格；
- 能力证据与集成证据的分离规则。

**Gate 1**：如果无法用一份配置列出 Source、River、Drop、Pool、Downstream/Floodplain 与端口关系，则不进入集成渲染。

**2026-08-24 结果**：`mountain-watershed-graph-v0` 已建立 7 个节点、6 条连接、SI 单位、T2 标签、传递对象和 Pool 预算；扩展后的 23 项单步/累计模型检查全部通过。Gate 1 通过，进入 Stage 2。结果见 [`watershed-slice/README.md`](watershed-slice/README.md)。

## Stage 2｜Watershed Slice v0

**状态**：`completed / T2 runtime evidence passed`

目标：在一个浏览器页面中形成第一条可观察的 River → Waterfall → Pool 链路，达到 `T2 Physically mapped`。

产物：

- 固定山地地形和远/中/近固定镜头；
- River、Drop、Waterfall、Pool 节点；
- 同一体积流量 `Q` 驱动出口、水幕、视觉粒子和水潭代理；
- 流量、落差、飞行时间、撞击速度和水潭收支 HUD；
- 低来水/高来水单变量 A/B；
- 模型测试、桌面、390px、reduced-motion 和 fallback 证据。

**Gate 2**：所有差异必须由 `dischargeScale` 派生；视觉粒子采样率变化不得改变代表水量；渲染与诊断不得出现无单位的“魔法速度”。

**2026-08-24 结果**：浏览器连续场景已连接 River、Drop、Waterfall 和 Pool。模型 23 / 23、Chromium 桌面/390px/fallback 功能检查通过；A/B 固定输入只差 `dischargeScale`，累计预算残差低于 `2 × 10⁻¹⁰ m³`。Gate 2 通过，进入 Stage 3。性能仍需独立复测，不由本轮功能检查批准。

## Stage 3｜River → Waterfall 局部质量传递

**状态**：`completed / T3 runtime evidence passed`

目标：从 `T2` 参数映射升级到局部 `T3` 质量交换。

产物：

- 每步 River 出流；
- 对应的 `WaterTransfer`；
- 上游扣减、传输中存量和瀑布表示；
- 粒子视觉采样与物理代表量解耦；
- 输入、输出、存量和残差审计。

**Gate 3**：固定输入下质量残差可解释且随步长/分辨率收敛；切换质量档不改变水量预算。

**2026-08-24 结果**：`mountain-watershed-coupled-v1` 已建立 River 有限库存、固定延迟在途体积包、撞击沉积、Pool 出流和全局/单步预算。20 秒 A/B 的 T3 模型 24 / 24 通过；River 剩余 220/160 m³、在途 5.75/11.50 m³、累计沉积 54.25/108.50 m³，系统残差低于 `2 × 10⁻¹⁰ m³`。Gate 3 通过。

## Stage 4｜Waterfall → Pool 沉积与局部交互

**状态**：`completed baseline / T3 visual-state mapping passed`

目标：让落水不再在撞击区消失，而是改变下游状态。

产物：

- 地形/水潭碰撞；
- 落点、撞击速度和冲量代理；
- Pool 水位、容量和出流；
- 白沫、飞沫、雾和声音读取碰撞状态；
- 在近景刚体交互确有价值时评估 Particles4All 适配。

**Gate 4**：关闭泡沫、雾或降低粒子采样率不会改变 Pool 的质量状态；需要局部求解时必须证明其相对解析代理的交互增益。

**2026-08-24 结果**：Waterfall 在途包按解析飞行时间到达 Pool，落点泡沫、涟漪和雾沫读取实际沉积状态；全水系、全落差和撞击区三镜头可检查连续性。表现层与预算解耦，浏览器桌面/390px/reduced-motion/fallback 通过。Particles4All 仍是“复杂近景刚体交互”按需升级项，不是本阶段默认依赖。Gate 4 基线通过。

## Stage 5｜Pool → Floodplain 地形传播

**状态**：`held / capacity, priority-storage and barrier-routing baselines passed`

目标：把 Flood Proxy 变成山地水系中有明确输入、边界和问题的能力。

已完成基线：

- 1,710 m³ 水潭容量与显式溢流端口；
- 12 × 7 确定性优先蓄水格、湿干状态、水深和到达 tick；
- 0.25 m³/s 固定开放边界；
- 低/高来水单变量 A/B：A 不溢流，B 在约 11.87 s 后溢流；
- Pool、Floodplain、边界与全局质量残差诊断；
- 桌面洪泛区镜头、390px、reduced-motion 与 fallback 证据。
- 开放路径/障碍改道单变量 A/B；两组高来水、溢流量、蓄水与边界输出相同，只改变 8 个障碍格；
- 障碍路径的平均横向距离由 5.60 m 增至 8.88 m，最远湿润行由第 3 行增至第 4 行；障碍路由模型 26/26 与桌面/移动证据通过。

当前子目标：

- 增加随时间变化的暴雨过程线与闸坝失效输入；
- 记录传播速度、回水、到达时间曲线与峰值滞蓄；
- 以该结果判断静态优先路由是否足够，或是否进入低分辨率高度场/浅水方程。

**Gate 5**：容量/蓄水和障碍改道两组 26 / 26 模型检查及浏览器验证已通过；完整 Gate 仍要求时变输入下到达曲线稳定、无非有限值、无无法解释的边界漏水。当前只称内部优先路由代理，进入现实决策前另设 `T4` 校准门。

## Stage 6｜Particles4All 场景接入与横向复用

**状态**：`completed / three desktop-browser scenes passed`

宏观场景是一级目标，Particles4All 是按需进入的 Local Physics Core：

1. `S6-WP1 Waterfall Physics Lens`：`completed`。16.8 m 落差映射为 18.16 m/s 理想撞击速度，再缩放到已验证的 `-2.5 u/s` solver 输入；384 粒子、30 ticks、PBF 有限值和 Shape Matching 刚体响应在同一桌面页面完成首个原库 Gate，现已纳入 17 项契约驱动 Gate。
2. `S6-WP2 Waterfall Scene Contract`：`completed`。宏观层、按需加载、尺度映射、标准发射器、探针、验收阈值和真实性边界已收敛为 `water-scene.particles4all-near-field/v1`；三份场景 JSON、通用编译器和执行器现通过 49 项契约测试。
3. `S6-WP3 River Reuse`：`completed`。同一 Schema、Runtime Adapter 与 `particles4all-scene-runner-v1` 读取 River 第二份场景 JSON；480 粒子、36 ticks、有限值和沿局部 +X 的刚体位移 `0.1321 u` 通过桌面 Gate 18/18。方向性 Gate 排除了仅由重力下降形成的伪响应。
4. `S6-WP4 Coastal Reuse`：`completed`。固定 Ocean 表面点的高度、法线和 `+1.6470 u/s` 垂向速度映射为局部 `+Y` 粒子脉冲；同一 Scene Runner 先跑无注入基线，再运行 640 粒子、36 ticks 的原库事件。刚体相对基线上举 `+0.2994 u`，桌面 Gate 18/18 通过。PBF 不承担整片海面。

当前不建设通用编辑器、移动适配或新液体求解器。

## Stage 7｜跨场景能力评价与路线决策

**状态**：`completed / Gate 10 passed`

目标不是继续堆叠第四种水效果，而是比较 Waterfall、River、Ocean 三条真实接入链，回答：哪些是稳定复用的公共能力，哪些仍是场景特例，下一阶段应投资复杂碰撞体、岸线局部窗口、质量耦合还是跨设备覆盖。

`S7-WP1` 已建立三场景能力—场景—证据—成本矩阵。决策为：保持宏观/局部分层和公共执行链；下一阶段只使用 Particles4All 原生 `sphere / torus / box`、密度与 Shape Matching 做场景对象差异化；复杂碰撞、独立求解器和通用编辑器继续 held。详见 [`CROSS_SCENE_DECISION.md`](CROSS_SCENE_DECISION.md)。

## Stage 8｜Particles4All 原生刚体场景化

**状态**：`completed / Chrome + Edge / Intel + NVIDIA passed`

目标：在不修改原库求解器的前提下，让 Waterfall、River、Ocean 不再共用同一个球形探针，而使用原库已有形状与密度形成场景相关的刚体响应。

1. `S8-WP1 Native Body Contract`：`completed`。场景契约已显式声明 `shape / density / startY / size / sceneRole`；Schema 校验 engine query，Runner 从原库回读实际 body profile 并纳入 acceptance。三场景真实浏览器回归均通过。
2. `S8-WP2 Waterfall Object`：`completed`。实际运行时为原生 `box / density 2.2 / size 0.15`；384 粒子、30 ticks。无注入基线沿 `-Y` 位移约 `0.3168 u`，瀑布脉冲后约 `0.3322 u`，额外撞击响应约 `0.0154 u`；桌面 Gate 19/19。
3. `S8-WP3 River Object`：`completed`。实际运行时为原生 `box / density 0.35 / size 0.15`；480 粒子、36 ticks，沿 `+X` 位移约 `0.2470 u`，Shape Matching 旋转约 `14.25°`，桌面 Gate 20/20。
4. `S8-WP4 Ocean Object`：`completed`。实际运行时为原生 `torus / density 0.22 / size 0.15`；640 粒子、36 ticks。相对无注入基线上举约 `0.01528 u`，Shape Matching 旋转约 `1.20°`，桌面 Gate 20/20。
5. `S8-WP5 Cross-device Gate`：`completed`。Chrome 151 / Intel、Edge 151 / Intel、Edge 151 / RTX 4070 三种配置的 Waterfall 19/19、River 20/20、Ocean 20/20 均通过；聚合 Gate 55/55，五项物理读数的跨配置相对离散度均低于 5%。

## Stage 9｜场景价值目标与下一轮能力投资决策

**状态**：`completed / Interactive Water Sandbox selected / Gate 15 passed`

目标：不继续堆叠水效果，而用 Stage 6–8 的真实原库证据定制下一宏观使用目标、子目标、能力模块和验收门。候选必须同时回答“服务什么场景价值”和“明确复用 Particles4All 哪项原生能力”；不满足两项者继续 held。

1. `S9-WP1 Goal & Capability Investment Decision`：`completed`。固定预设的 Interactive Water Sandbox 被选为唯一主线；工程数字孪生、第四种水效果、通用编辑器和新求解器继续 held。机器可读规格 40/40 通过，见 [`INTERACTIVE_WATER_SANDBOX.md`](INTERACTIVE_WATER_SANDBOX.md) 与 [`sandbox-program.json`](sandbox-program.json)。

## Stage 10｜Interactive Water Sandbox 固定预设宿主

**状态**：`held after guided lifecycle / device gate deferred by observable-output priority`

目标：在一个桌面页面中组织跌水冲击、河道漂流与水面浮环三个固定预设；一次只加载一个 Particles4All runtime，并直接执行已有场景契约。

1. `S10-WP1 Host Shell and Preset Navigation`：`completed`。可运行桌面 Spatial Stage、三预设/键盘导航、目标/边界 DOM 与单物理视口占位已完成；Preset Registry 25/25，1440/1280 浏览器 Gate 全部通过，明确保持 `runtimeSlots=0`。
2. `S10-WP2 Single Runtime Slot and Contract Loading`：`completed`。同一宿主通过共享 Adapter/Runner 顺序执行三份已有契约；Runtime Gate 30/30，三份 acceptance 通过，最大槽位为 1，切换自动卸载与手动归零均通过。
3. `S10-WP3 Guided Evidence Sequence and Reset`：`completed`。运行前摘要、四阶段证据引导、逐项 acceptance、同 Runtime 重跑、清除保留、卸载归零和无 WebGPU 错误恢复全部通过；1440/1280 Guided Lifecycle Gate 19/19。
4. `S10-WP4 Desktop Browser and GPU Gate`：`held`。不是技术失败；用户要求优先展示可见场景效果，因此跨设备宿主复核让位于 Stage 11。

## Stage 11｜Particles4All 可观测场景效果研究

**状态**：`active / Waterfall timing effect passed / surface path active`

规则：每个工作包必须同时交付真实 Particles4All 画面、固定变量、实际数据、浏览器截图和有限结论；只有界面、架构或计划不计为阶段成果。

1. `S11-WP1 Waterfall Emission Continuity A/B`：`completed`。同样 384 粒子、−2.5 u/s、高密度 box 与 42 ticks；A 在 tick 0 一次注入，B 每 3 ticks 注入 32、共 12 次。A/B 高位垂直占用 1/12 → 7/12，最高位置 0.282 → 0.673 u，Chrome WebGPU Gate 12/12。结论只批准时间连续性改善；B 仍是离散粒子，刚体基线差约 −0.00004 u，不批准冲击增强。
2. `S11-WP2 Waterfall Original Surface Paths`：`active`。固定 B 的物理结果，对比原库 `particles / mesh / ssfr` 显示路径，判断能否把离散粒子链提升为可见连续表面。
3. `S11-WP3 River Sustained Flow`：`pending`。用原库调度形成持续沿流输入，并观察低密度 box 的平移和旋转。
4. `S11-WP4 Ocean Local Uplift`：`pending`。用原库局部上举事件观察 torus 浮环的可见响应。

## 并行研究队列

以下研究可在不阻塞主线时独立推进，但不能抢占 Stage 5 的时变输入传播目标：

- Waterfall 长帧隔离复测；
- 白沫、飞沫、水雾和声音的独立视觉/成本实验；
- Ocean FFT、岸线和尾流资料与候选实现审计；
- Particles4All 复杂碰撞体与跨设备研究；
- 浅水求解器、湿干边界和验证基准审计。

## 最近五个可执行任务

1. ~~定义 `WorldContext`、`WaterGraph`、`WaterTransfer` 的可序列化模型和测试。~~ 已完成模型基线。
2. ~~建立 Mountain Watershed 固定场景配置，写明单位、节点、端口和真实性目标。~~ 已完成并通过 23 项单步/累计检查。
3. ~~给 River 路径和 Waterfall 表现增加集成适配，复用现有河道并接受统一 T2 派生值。~~ 已完成首个浏览器切片。
4. ~~构建 Watershed Slice v0：同一 `Q` 驱动河口、水幕、粒子采样、撞击和 Pool 水位代理。~~ 模型 23/23、桌面/移动/fallback 通过。
5. ~~建立 T3 运行状态：River 有限库存扣减、瀑布在途代表水量、撞击沉积和逐步残差审计。~~ 模型 24/24 与浏览器证据通过。
6. ~~优化瀑布水幕、落点泡沫/涟漪/雾沫与视觉 LOD，并保存基线/优化后软件渲染证据。~~ 已完成；结构成本下降，真实 GPU 性能仍待设备覆盖。
7. ~~定义 Pool 容量、溢流阈值和 Pool → Floodplain `WaterTransfer`，先完成无渲染预算测试。~~ 1,710 m³ 阈值、26/26 模型检查与浏览器证据通过。
8. ~~建立开放路径/障碍路径的首个传播 A/B，并公开网格、边界、到达顺序和质量误差。~~ 障碍路由模型 26/26，桌面/移动证据通过。
9. 增加暴雨过程线/闸坝失效输入，比较静态优先路由与低分辨率浅水求解对传播速度和回水的解释能力。
10. ~~把 Waterfall 宏观落差映射到 Particles4All 近场注入，并在同一桌面页面验证 PBF/刚体响应。~~ 当前契约驱动浏览器 Gate 17/17 通过。
11. ~~把 Waterfall 的宏观层、近场层、加载策略和真实性等级收敛为可序列化场景配置，作为 River/Ocean 横向复用入口。~~ `water-scene.particles4all-near-field/v1`、通用执行器、场景 JSON 与桌面运行证据已完成。
12. ~~为 River 定义第二份近场场景契约，并用同一执行器验证沿流向注入、障碍/漂浮物响应和有限值 Gate；禁止复制瀑布运行逻辑。~~ 36 项双场景契约检查与 River 桌面 Gate 18/18 通过。
13. ~~为 Coastal 定义第三份近场场景契约：Ocean 仍负责宏观波面，固定波面采样只映射局部浮体/岸边输入；继续复用同一 Scene Runner。~~ 49 项三场景契约检查、640 粒子/36 ticks 和 Ocean 桌面 Gate 18/18 通过。
14. ~~建立 Waterfall / River / Ocean 三场景横向矩阵，以使用场景、公共能力、特例成本和真实性缺口决定下一阶段唯一主线。~~ Stage 7/8 决策与跨设备证据已完成。
15. ~~把原生刚体 profile 提升为场景契约字段，并验证 URL 配置与实际运行时 shape/density/size 一致。~~ 三场景契约与浏览器回归通过。
16. ~~将 Waterfall sphere 探针替换为原生高密度 box，重新校准纵向撞击 Gate 和场景解释。~~ 原生 profile 与基线差分桌面 Gate 19/19 通过。
17. ~~将 River sphere 探针替换为原生低密度 box，验证沿流平移与 Shape Matching 姿态响应。~~ 原生 profile、沿流 `0.2470 u` 与旋转 `14.25°` 的桌面 Gate 20/20 通过。
18. ~~将 Ocean sphere 探针替换为原生低密度 torus，以无注入基线验证上举与姿态响应。~~ 20/20 与跨设备 Gate 通过。
19. ~~基于三场景价值与原库能力选择下一宿主。~~ Interactive Water Sandbox 规格与静态 Gate 40/40 通过。
20. ~~建立 Sandbox 宿主页面壳、三固定预设导航和唯一物理运行槽占位。~~ 模型 25/25 与两个桌面视口浏览器 Gate 通过。
21. ~~将唯一运行槽连接到已有 Adapter/Runner，按当前预设执行原场景契约并在切换前卸载。~~ 三份原契约顺序运行、30/30 Gate、自动卸载与手动归零通过。
22. ~~为已通过的单 Runtime 增加证据引导、可控重跑、结果清除语义与可验证错误恢复。~~ 两桌面视口与无 WebGPU Gate 19/19。
23. 在 Chrome/Edge、Intel/NVIDIA 上复核 Sandbox 的三契约运行、重跑、卸载、错误边界与关键读数离散度。
24. ~~建立 Waterfall 单次注入与分时连续落水 A/B，并用真实画面和垂直覆盖指标验证。~~ 12/12 通过，垂直占用 1/12 → 7/12。
25. 固定分时连续落水物理条件，对比 Particles4All 原有 particles / mesh / ssfr 显示路径。

## 决策规则

- `continue`：子目标对宏观场景产生可见、可测、可复现的推进。
- `hold`：方法有效，但当前宏观阶段没有使用它。
- `replace`：存在更低成本或更可靠的能力适配器。
- `stop`：能力无法改善目标场景，或成本与证据不匹配。
- `escalate truth`：当前真实性等级不足以支持使用目标，需要进入更高阶求解、数据或专家验证。
