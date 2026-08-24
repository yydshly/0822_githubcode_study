# Stage 7｜三场景横向评价与路线决策

状态：`completed / Gate 10 passed`  
目标平台：桌面浏览器  
决策日期：2026-08-24

## 宏观问题

本阶段不回答“还能增加什么水效果”，而回答：Waterfall、River、Ocean 三次真实接入以后，哪些能力已经成为公共基座，哪个缺口最值得沿 Particles4All 原生能力继续投入。

## 已验证架构

```text
宏观场景适配器
  ├─ Waterfall：落差 / 撞击速度
  ├─ River：样条切线 / 沿流速度
  └─ Ocean：表面高度 / 法线 / 垂向速度
        ↓ T2 有界映射
water-scene.particles4all-near-field/v1
        ↓
Particles4AllRuntimeAdapter
        ↓
particles4all-scene-runner-v1
        ↓
原库 WebGPU PBF + Shape Matching
        ↓
方向位移 / 基线差分 / 有限值证据
```

大范围水面、河道和水幕不进入粒子求解器；只有局部液固作用进入 Particles4All。这一分层符合原库的性能边界，也避免另造海洋、河流或洪水求解器。

## 三场景证据矩阵

| 场景 | 宏观输入 | Solver 局部事件 | 原库运行 | 刚体 Gate | 结论 |
| --- | --- | --- | --- | --- | --- |
| Waterfall | 16.8 m 落差与理想撞击速度 | `-Y 2.5 u/s`，384 粒子 | 30 ticks，17/17 | 沿落水方向 `0.4153 u` | 纵向撞击链成立 |
| River | 中段样条切线与 `2.55 u/s` 流速 | `+X 2.5 u/s`，480 粒子 | 36 ticks，18/18 | 沿流向 `0.1321 u` | 水平障碍响应成立 |
| Ocean | 固定表面高度、法线、`+1.6470 u/s` 垂向速度 | `+Y 4.0 u/s`，640 粒子 | 36 ticks，18/18 | 相对无注入基线 `+0.2994 u` | 海浪上举链成立 |

共同运行环境为本机 Chrome / Intel Gen-12LP；三组均使用 28K 基础流体、`small` preset、同一 Runtime Adapter、同一 Scene Runner，`nonFinite=0`。

## 已经泛化的能力

1. 宏观世界信号能够以显式参数映射到局部 solver 坐标帧。
2. 同一 JSON Schema 能表达场景驱动、粒子包、探针、方向 Gate 和真实性边界。
3. 同一 Adapter 与 Runner 能执行纵向、水平和带基线对照的局部事件。
4. 按需加载和卸载能避免把 WebGPU 求解器变成所有宏观场景的常驻依赖。
5. 页面结论来自原库运行数据，而不是由大模型或 Three.js 视觉动画代替。

## 尚未泛化的能力

| 缺口 | 当前事实 | 影响 |
| --- | --- | --- |
| 场景对象 | 三场景仍使用同一个 `sphere:0.5` | 已证明输入可复用，尚未证明对象与场景有差异 |
| 边界几何 | 仍是原库封闭矩形箱 | 不能声称岩壁、河床、岸线或船体碰撞 |
| 跨尺度守恒 | T2 速度映射，不是力、压力或水量标定 | 不能输出工程量或现实安全结论 |
| 运行时接口 | Adapter 依赖 iframe 与 `window.__sim` | 适合内部研究工具，不是稳定 SDK |
| 设备覆盖 | 当前主要是本机 Chrome / Intel GPU | 不能外推到 Edge、RTX、Apple GPU |
| 性能档位 | 28K 只达到可演示级，100K/300K 不实用 | 不应扩大局部求解窗口 |

## 候选路线评价

| 候选 | 与原库一致性 | 场景价值 | 新维护成本 | 决策 |
| --- | --- | --- | --- | --- |
| 增加第四种宏观水效果 | 低 | 低：重复输入映射 | 中 | `hold` |
| 原生刚体类型场景化 | 高：直接使用 sphere/torus/box、density、Shape Matching | 高：让瀑布、河流、海面出现真正不同对象 | 低 | `advance` |
| 自研复杂岸线 / glTF / SDF 碰撞 | 低：原库当前不支持 | 潜在高 | 很高 | `hold`，等待上游能力 |
| 新建浅水/海洋/洪水求解器 | 脱离主线 | 属于另一领域 | 很高 | `stop` |
| 立即包装公共 npm SDK | 中 | 当前产品价值有限 | 高：内部 API 与资源释放未稳定 | `hold` |
| 跨设备硬化 | 高 | 必要但不能增加场景解释力 | 中 | 原生对象场景化后作为质量门 |

## Gate 10 决策

```text
ADVANCE：Particles4All 原生刚体类型的场景化差异展示
KEEP：宏观适配器 + 通用 Scene Contract + Runtime Adapter + Scene Runner
HOLD：复杂碰撞、通用编辑器、跨尺度物理标定、SDK 发布
STOP：独立液体求解器与更多无差异宏观水效果
```

下一阶段唯一主线为：不改 Particles4All 求解器，使用其现有 `sphere / torus / box`、密度和 Shape Matching，把同一个球形探针升级为与使用场景相关的原生刚体原型。

## Stage 8 工作包

1. `S8-WP1 Native Body Contract`：把 shape、density、startY、size、sceneRole 从隐藏 query string 提升为场景契约字段，并验证运行时实际刚体与契约一致。
2. `S8-WP2 Waterfall Object`：使用原生高密度 box 表达落水区重物/岩块响应，建立纵向撞击 Gate。
3. `S8-WP3 River Object`：使用原生 box 表达顺流漂浮物/障碍，建立沿流平移与姿态 Gate。
4. `S8-WP4 Ocean Object`：使用原生低密度 torus 表达浮环/浮标，使用无注入基线建立上举与姿态 Gate。
5. `S8-WP5 Cross-device Gate`：在 Chrome/Edge 与第二 GPU 类别复核被选中的对象场景；不把 100K/300K 设为产品质量档。

如果原生 box/torus 无法形成可重复、可解释的场景差异，则 Stage 8 停止在原有 sphere 基线，不以自研复杂碰撞体掩盖失败。

## Stage 8 核心里程碑结果

三种原生对象场景已全部通过：Waterfall 使用 `box / density 2.2` 得到额外向下撞击响应 `0.01538 u`（19/19）；River 使用 `box / density 0.35` 得到沿流位移 `0.24703 u` 与旋转 `14.27°`（20/20）；Ocean 使用 `torus / density 0.22` 得到相对基线上举 `0.01528 u` 与旋转 `1.20°`（20/20）。这证明场景差异来自同一 Particles4All 原生 PBF + Shape Matching 能力的对象参数化，而不是另造液体算法。当前主线进入 `S8-WP5 Cross-device Gate`。

`S8-WP5` 随后在 Chrome/Edge、Intel Gen-12LP/NVIDIA Lovelace 三种配置通过聚合 Gate 55/55，关键响应跨配置相对离散度均低于 5%。Stage 8 因此完整关闭；Stage 9 进入场景价值目标与下一能力投资决策，不自动批准复杂碰撞、新求解器或第四种水效果。
