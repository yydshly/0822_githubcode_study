# Water Scene Platform｜桌面水体场景技术基座

> **归档状态（2026-08-25）**：阶段探索已结束，页面与测试保留为历史证据。项目不再继续扩张宏观水场景；只有出现明确的局部液体—刚体使用需求时，才从 [Particles4All 阶段归档总结](../particles4all/ARCHIVE_SUMMARY.md) 重新启动。

## 项目卡片

| 字段 | 内容 |
| --- | --- |
| 项目类型 | 宏观场景驱动的桌面水体技术基座 |
| 研究状态 | `archived` |
| 目标平台 | 桌面 Chrome / Edge |
| 开始日期 | 2026-08-24 |
| 已有基础 | [Particles4All 研究子项目](../particles4all/README.md) |
| 路线总览 | [`docs/demos/water-scene-lab/`](../../docs/demos/water-scene-lab/) |
| 页面证据 | [`EVIDENCE.md`](EVIDENCE.md) |
| 宏观目标 | [`MACRO_GOAL.md`](MACRO_GOAL.md) |
| 目标架构 | [`TARGET_ARCHITECTURE.md`](TARGET_ARCHITECTURE.md) |
| 当前集成计划 | [`MOUNTAIN_WATERSHED.md`](MOUNTAIN_WATERSHED.md) |
| 当前集成运行 | [`watershed-slice/README.md`](watershed-slice/README.md) |
| 当前宿主方案 | [`INTERACTIVE_WATER_SANDBOX.md`](INTERACTIVE_WATER_SANDBOX.md) |
| 当前宿主运行 | [`sandbox-mvp/README.md`](sandbox-mvp/README.md) |
| 源库优先汇总 | [`docs/demos/water-scene-lab/research-summary/`](../../docs/demos/water-scene-lab/research-summary/) |

## 当前定位

Water Scene Platform 是已经归档的场景探索层，用场景目标组织多尺度水体能力。连续水面、水幕和远景由适合大尺度的低成本模型表达；自由液面、撞击和刚体响应只在近场需要时调用 Particles4All。这里保留的瀑布高流量等页面属于 E1 场景探索，不是 Particles4All 原生效果，也不是已完成的真实瀑布求解器。

```text
Particles4All 已验证或待扩展能力
        ↓
选择一个能暴露该能力的局部场景
        ↓
复用这里的地形 / 相机 / UI / 场景壳
        ↓
运行时真实调用 Particles4All
        ↓
重新建立算法、效果、成本与边界证据
```

## 归档边界

- 暂停暴雨过程线、洪水路由和移动端适配，把资源集中到桌面场景基座。
- 保留现有页面和测试，作为历史记录，不删除已完成证据。
- 不再把解析式水量、运动学粒子或 Three.js 表现写成 Particles4All 能力。
- 只有运行时真实调用 Particles4All 的局部求解，才能计入原库场景集成成果。
- Waterfall 落水池、River 沿流向障碍和 Ocean 海浪上举保留为近场接入证据；这些结果只证明局部对象响应，不证明完整瀑布、河流或海洋已由源库实现。
- 当前没有活动阶段、工作包或场景扩展任务。

## 为什么需要上层项目

Particles4All 已经证明：浏览器中可以用统一粒子约束表现局部水体、刚体、浮沉、碰撞和自由液面。但它回答的是“容器和局部交互如何成立”，不是“所有尺度的水如何成立”。

大海更关心无限感、波谱、远景层级和浮体采样；河流更关心河道走向、流速线索、岸线和地形；瀑布更关心薄水幕、破碎、白沫和雾；洪水代理更关心水位传播、地形阻挡和叙事可解释性。它们不应被强行塞进同一求解器。

因此，本项目的价值不是多做几种“水的皮肤”，而是积累一套从目标到能力、从能力到连接、从连接到证据的构建方法：以后遇到海岛、漂流、治水、灾害叙事、工业容器或互动展览时，能够迅速判断复用什么、怎样组合、缺少什么，以及哪些结果可以或不能承诺。

## 当前实现状态

| 模块 | 当前状态 | 已有证据 / 下一证明 |
| --- | --- | --- |
| Local Liquid｜局部液体 | `evidence-backed prototype` | Particles4All 五类场景、四类诊断和十条件硬件浏览器回归；继续补跨设备与复杂碰撞体 |
| Ocean｜海面 | `evidence-backed prototype` | 6 组 Gerstner 波、解析动态法线、逆解世界坐标采样、四点船体代理、1,200 步 A/B 与桌面/手机证据；三次隔离性能复测通过，FFT 按需求暂停 |
| Ocean Near-field｜海浪上举 | `Particles4All-backed native object` | 原生 `torus / density 0.22`、640 粒子、36 ticks；相对无注入基线上举约 `0.01528 u`、Shape Matching 旋转约 `1.20°`，桌面 Gate 20/20 |
| River｜河流 | `Particles4All-backed native object` | 原生 `box / density 0.35`、480 粒子、36 ticks；沿流位移约 `0.2470 u`、Shape Matching 旋转约 `14.25°`，桌面 Gate 20/20 |
| Waterfall｜瀑布 | `Particles4All-backed native object` | 原生 `box / density 2.2`、384 粒子、30 ticks；相对无注入基线额外向下响应约 `0.0154 u`，桌面 Gate 19/19 |
| Interactive Sandbox｜固定预设宿主 | `guided single-runtime evidence passed` | 同一页面顺序执行三原契约；Runtime 30/30、Guided Lifecycle 19/19、`slots≤1`、重跑/清除/卸载/错误恢复通过 |
| Waterfall Continuity｜连续落水 | `observable Particles4All effect passed` | 相同 384 粒子与 42 ticks，仅改变注入时间；高位垂直占用 1/12 → 7/12、最高位置 0.282 → 0.673 u，桌面 Gate 12/12 |
| Watershed Slice｜山地水系 | `integration runtime evidence / T3 routing` | River → Waterfall → 1,710 m³ Pool → Floodplain 闭环；阈值与障碍路径双 A/B、溢流 26/26、路由 26/26 及桌面/390px/fallback 通过；下一步时变过程线 |
| Flood Proxy｜洪水代理 | `source-backed plan` | 仅在明确产品问题后，用高度场/浅水代理验证水位传播与障碍响应；不包装成工程水文结果 |

这里的 `source-backed plan` 表示“路线有权威资料支持，但本仓库尚未运行验证”，不能写成已实现能力。Ocean 的实现与证据见 [`ocean-mvp/`](ocean-mvp/README.md)，River 见 [`river-mvp/`](river-mvp/README.md)，Waterfall 见 [`waterfall-mvp/README.md`](waterfall-mvp/README.md)、[`waterfall-mvp/PROTOCOL.md`](waterfall-mvp/PROTOCOL.md) 与 [`waterfall-mvp/EVIDENCE.md`](waterfall-mvp/EVIDENCE.md)。

## 研究目标

1. 用宏观使用场景组织项目，用子目标组织研究，用能力模块承载实现。
2. 建立统一世界尺度、地形、水源、水体拓扑和上下游传递语义。
3. 保留独立能力实验的单变量 A/B，同时增加场景级连续性、因果、质量预算和性能证据。
4. 形成可替换的 Ocean、River、Waterfall、Flood 与 Local Liquid 适配器。
5. 逐步实现 River → Waterfall → Pool → Downstream/Flood 的物理映射和局部质量/动量交换。
6. 以真实性等级约束结论，而不是从架构上永久排除未来能力。

## 当前阶段边界

- 不把视觉水体称为 CFD、水文或防洪工程模拟。
- 不用一个算法覆盖杯中水、河流、海洋和洪水。
- 不以“场景数量”代替技术差异；换模型、换颜色、换故事不算新增能力。
- 当前不先建统一编辑器、资产平台或复杂插件系统，但目标架构保留配置和工具入口。
- 不在缺少固定输入、固定相机和运行数据时宣称优化成功。

这些边界限制的是当前投入顺序和可宣称结论，不是永久技术禁区。FFT、浅水、粒子耦合、统一编辑器与专业校准都由宏观子目标和证据门决定是否进入。

## 如何使用这套计划

先用 [`MACRO_GOAL.md`](MACRO_GOAL.md) 确定场景目标和真实性等级，再在 [`SCENE_MATRIX.md`](SCENE_MATRIX.md) 拆解所需能力；按 [`PROTOTYPE_SPECS.md`](PROTOTYPE_SPECS.md) 建立子目标实验和集成切片，用 [`ROADMAP.md`](ROADMAP.md) 的阶段门判断继续、降级或停止。目标接口见 [`TARGET_ARCHITECTURE.md`](TARGET_ARCHITECTURE.md)，当前山地水系计划见 [`MOUNTAIN_WATERSHED.md`](MOUNTAIN_WATERSHED.md)，外部资料与使用边界记录在 [`SOURCES.md`](SOURCES.md)。

路线台可从仓库根目录启动：

```powershell
python -m http.server 8107 --directory docs
```

打开 `http://127.0.0.1:8107/demos/water-scene-lab/` 查看路线台；`/ocean/`、`/river/` 与 `/waterfall/` 分别运行三个受控能力 MVP，`/watershed/` 运行首个连续山地水系。各分支的结论不能从单次设备运行扩张为跨设备承诺。汇总入口见 [`EVIDENCE.md`](EVIDENCE.md)。

## 当前阶段结论与驱动目标

我们已经完成“阶段 0｜能力勘探”：Particles4All 负责近景局部液体与刚体交互，Ocean MVP 负责大范围可查询波面，River MVP 负责弯曲河道中的空间方向一致性，Waterfall MVP 负责连续水幕与有限破碎代理。四条能力证据继续有效，但都不等同于集成证据。

“阶段 1｜目标与连接基线”“阶段 2｜Watershed Slice v0”和“阶段 3/4｜局部质量传递与 Pool 沉积”均已通过。阶段 5 的容量阈值与障碍路由证据继续保留，但时变暴雨/洪水分支现在暂停。“阶段 6｜Particles4All 场景接入”已完成 Waterfall、River、Ocean 三个契约驱动场景。正式主线进入“阶段 7｜跨场景能力评价与路线决策”。

当前执行规则为 `observable output first`：每个工作包必须提供原库实际画面、单变量 A/B、数值、截图和有限结论。首个结果证明分时注入能延长离散粒子落水分布，但没有证明连续表面或冲击增强。当前继续验证原库自己的 mesh / ssfr 显示是否能补足表面连续性。
