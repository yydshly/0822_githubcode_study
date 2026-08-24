# Water Scene Lab 目标架构

## 架构判断

当前系统是“场景路由的能力证据实验室”：每个分支拥有自己的模型、渲染、控制和证据。目标系统应升级为“宏观场景驱动的水环境运行时”：能力实验室继续独立存在，同时增加场景语义、共享状态和跨模块传递。

```text
┌──────────────────────────────────────────────┐
│ 1. Goal / Scenario                           │
│ 场景目标、观察尺度、关键事件、真实性要求      │
├──────────────────────────────────────────────┤
│ 2. World / Water Graph                       │
│ 地形、单位、水源、出口、水体节点、上下游连接  │
├──────────────────────────────────────────────┤
│ 3. Capability Adapters                       │
│ Ocean / River / Waterfall / Flood / Local    │
├──────────────────────────────────────────────┤
│ 4. Coupling / Transfer                       │
│ surface↔solid、field↔particle、node↔node      │
├──────────────────────────────────────────────┤
│ 5. Rendering / Experience                    │
│ 水面、泡沫、飞沫、雾、湿润、声音、相机、LOD  │
├──────────────────────────────────────────────┤
│ 6. Runtime / Evidence / Tools                │
│ 时钟、质量档、重放、诊断、序列化、浏览器证据  │
└──────────────────────────────────────────────┘
```

## 核心数据契约

### `ScenarioGoal`

描述为什么构建场景：

- 用户或角色要体验什么；
- 哪些变化必须可见；
- 哪些交互必须影响结果；
- 远、中、近哪个观察尺度最重要；
- 需要达到 `T0–T4` 中的哪一级。

### `WorldContext`

统一世界基础：

- `metersPerWorldUnit`；
- `gravity`；
- `terrain`；
- `time` 与固定步长；
- `weather`；
- 坐标系、边界和质量档。

### `WaterGraph`

以节点和连接描述水系，不绑定具体算法。

```text
Source ── RiverReach ── Drop ── Pool ── RiverReach ── Floodplain ── Sink
```

节点至少记录：

- `id`、`type`、空间范围；
- 水面/流场能力适配器；
- 入流和出流端口；
- 当前真实性等级；
- 诊断探针和证据状态。

连接至少记录：

- 上游和下游端口；
- 有效宽度和高差；
- 体积流量 `Q`；
- 平均速度和动量代理；
- 传递模式：视觉、映射、局部守恒；
- 每步输入、输出与残差。

### `CapabilityAdapter`

不同模型使用同一外部语言，但不要求内部算法相同。

```text
step(dt, context)
sampleSurface(position, time)
sampleFlow(position, time)
receiveTransfer(transfer)
emitTransfers()
disturb(event)
getDiagnostics()
setQualityTier(tier)
```

现有 `sampleSurface`、`sampleFlow`、`disturb`、`qualityTier` 和 `evidenceState` 是适配器契约的基础；统一单位、基础 `WaterGraph`、`WaterTransfer`、累计诊断预算和 T2 映射已经形成证据。`mountain-watershed-coupled-v1` 进一步完成 River 库存—Waterfall 在途包—Pool 沉积的 T3 闭环。下一阶段把 Pool 容量、溢流阈值和 Floodplain 接收端纳入同一契约。

### `WaterTransfer`

模块之间不直接读取彼此内部纹理或粒子数组，而是交换明确数据：

```text
sourceNode / targetNode
position / direction / width
volumeRate
meanVelocity
momentumProxy
temperatureOrMaterial (optional)
truthLevel
timestamp / dt / evidenceHash
```

首版允许 `volumeRate` 是内部一致的流量代理，但必须拥有明确单位和校准关系，不能继续使用没有语义的粒子数量代替流量。

## 表现层与状态层分离

表现层可以放大可读性，但必须说明读取了什么状态：

| 表现 | 应读取的状态 | 可以独立调节的艺术参数 |
| --- | --- | --- |
| 河面纹理 | 流向、速度代理、深度 | 纹理尺度、对比度、色彩 |
| 瀑布水幕 | 出口宽度、流量、初速度、落差 | 边缘噪声、透明度、细节频率 |
| 瀑布粒子 | 转换体积、速度、碰撞 | 粒子视觉采样率、尺寸、寿命 |
| 撞击泡沫/水雾 | 落点、冲量、湍动代理 | 白度、消散、雾密度 |
| 水潭水位 | 入流、出流、面积/容量 | 法线细节、反射质量 |

艺术参数不应反向改变质量预算；粒子视觉采样率变化也不应改变代表的水量。

## 当前架构映射

| 当前资产 | 目标架构角色 | 状态 |
| --- | --- | --- |
| 路线台 | Goal Router / 研究控制入口 | 已显示宏观目标、T3 进展和下一阶段 |
| Ocean 模型 | Ocean Capability Adapter | 已有 `sampleSurface` 证据 |
| River 模型 | River Capability Adapter | 已有 `sampleFlow` 证据 |
| Waterfall 模型 | Waterfall Visual + Transfer Adapter | 已有独立视觉分层证据；集成切片已接收在途体积并输出沉积 |
| Particles4All | Local Physics Core | Waterfall、River、Ocean 三份场景 JSON 共用 `water-scene.particles4all-near-field/v1` 和同一运行器；Native Body Contract 已回读运行时 shape/density/size，Waterfall 原生高密度 box 基线差分 Gate 19/19 通过 |
| Flood Proxy | Terrain Water Adapter 候选 | 已有容量、优先蓄水与障碍改道路由基线；高度场/浅水传播仍待证据 |
| 各分支 A/B 页面 | Capability Labs | 保留，不升级成集成产品页 |
| Mountain Watershed 模型 | `WorldContext` / `WaterGraph` / `WaterTransfer` / T2 映射 + T3 有限状态、溢流与障碍路由 | T2 23 项、T3 24 项、溢流 26 项与路由 26 项检查通过 |
| Watershed Slice v3 | River 库存 / Waterfall 在途体积 / 有限容量 Pool / Floodplain 优先蓄水、障碍改道与边界 / 状态驱动表现 | 阈值与路径双 A/B、桌面、390px、reduced-motion、fallback 与障碍镜头通过 |
| 缺失项 | 时变过程线 / 传播速度与回水 / 格间动量或浅水求解 / 真实数据校准 | Stage 5 后半与后续 T4 主任务 |

## 推荐仓库形态

这是目标形态，不要求立即机械迁移全部文件：

```text
water-scene-lab/
├─ goals/                 # 宏观目标、成功标准、计划
├─ core/                  # world context、units、water graph、clock
├─ capabilities/          # ocean、river、waterfall、flood、local liquid 适配器
├─ coupling/              # field-particle、terrain-water、rigid-water
├─ rendering/             # surface、foam、spray、mist、wetness、audio
├─ scenarios/             # mountain watershed、coastal、interactive water
├─ labs/                  # 现有固定 A/B 实验
├─ evidence/              # 能力证据与集成证据
└─ tools/                 # 场景配置、诊断、截图和报告
```

## 架构实施顺序

1. ~~不移动现有实验代码，先定义数据契约和固定单位。~~ 模型基线已完成。
2. ~~用适配器包装现有 River 和 Waterfall 的最小查询，不重写渲染。~~ 已完成 River 路径复用和 Waterfall 集成表现。
3. ~~建立一个静态山地水系场景壳和 `WaterGraph`。~~ 已完成。
4. ~~先做到 `T2`：同一 `Q` 驱动河口、水幕、粒子视觉采样和撞击强度。~~ 已通过。
5. ~~再做到局部 `T3`：上游扣减、粒子携带、下游沉积和预算审计。~~ 已通过库存—在途—沉积闭环。
6. ~~把 Local Physics 的加载、尺度映射、发射器、探针和 Gate 收敛为可序列化场景契约。~~ Waterfall 合同与通用 Particles4All 执行器已通过。
7. ~~用 River 第二场景证明契约与执行器可横向复用。~~ River 使用不同世界驱动、局部坐标帧、发射器和方向 Gate，通过同一运行器完成证据。
8. 用 Coastal 第三场景验证 Ocean 宏观表面与局部浮体/近岸求解分层，再决定 Stage 6 是否闭环。
9. 浅水/洪水、编辑器与其他表现扩展保持 held，由后续宏观目标重新触发。
