# Particles4All 研究子项目

## 项目卡片

| 字段 | 内容 |
| --- | --- |
| 上游项目 | [matsuoka-601/Particles4All](https://github.com/matsuoka-601/Particles4All) |
| 固定版本 | `f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f`（2026-08-23） |
| 研究状态 | `archived`（2026-08-25） |
| 许可证 | MIT |
| 开始日期 | 2026-08-24 |
| 本地上游 | [`upstream/`](upstream/) |
| 演示入口 | [`docs/demos/particles4all/`](../../docs/demos/particles4all/) |
| 总体计划 | [`PROGRAM_PLAN.md`](PROGRAM_PLAN.md) |
| 研究章程 | [`RESEARCH_CHARTER.md`](RESEARCH_CHARTER.md) |
| Runtime Adapter | [`RUNTIME_ADAPTER.md`](RUNTIME_ADAPTER.md) |
| 当前扩展切片 | [`LOCAL_IMPACT_SLICE.md`](LOCAL_IMPACT_SLICE.md) |
| 边界缺口审计 | [`BOUNDARY_GAP_AUDIT.md`](BOUNDARY_GAP_AUDIT.md) |
| 当前闸门/喷流切片 | [`GATE_JET_SLICE.md`](GATE_JET_SLICE.md) |
| 当前容器可行性 | [`CONTAINER_SPILL_SLICE.md`](CONTAINER_SPILL_SLICE.md) |
| 当前性能/兼容计划 | [`PERFORMANCE_COMPATIBILITY_PLAN.md`](PERFORMANCE_COMPATIBILITY_PLAN.md) |
| 当前组件/上游评估 | [`COMPONENT_UPSTREAM_ASSESSMENT.md`](COMPONENT_UPSTREAM_ASSESSMENT.md) |
| 最终技术决策 | [`FINAL_DECISION.md`](FINAL_DECISION.md) |
| 阶段归档总结 | [`ARCHIVE_SUMMARY.md`](ARCHIVE_SUMMARY.md) |
| 场景重启样例 | [`WATER_RING_GAME.md`](WATER_RING_GAME.md) |

基础研究已经归档；当前只因“网页水中套圈”这一明确局部液体—刚体场景进入受限原型验证。它复用固定上游、Runtime Adapter 和 torus 刚体，不恢复宏观水场景扩张。[Water Scene Lab](../water-scene-lab/README.md) 继续作为历史场景探索归档。

项目采用计划驱动模式，并已完成 M0–M6。最终选择是保留研究基线与内部 Adapter 工具包、准备一个慢帧 FPS 上游候选补丁，同时停止复杂容器、宏观水环境和通用实时 SDK 扩展。最终适用场景、边界和重启条件见 [`ARCHIVE_SUMMARY.md`](ARCHIVE_SUMMARY.md)。

## 唯一研究路线

```text
原库源码与原样运行
→ 原库能力受控 A/B
→ 原库 runtime/算法最小扩展
→ 扩展能力的局部场景验证
→ 性能、兼容性与长期价值判断
```

成果必须明确属于 `U0 Upstream`、`U1 Instrumented`、`E1 Extended` 或 `S1 Scenario`。没有在运行时调用 Particles4All 的独立水效果只能标记为 `C0 Concept`。完整边界、证据门和停止扩散规则见 [`RESEARCH_CHARTER.md`](RESEARCH_CHARTER.md)。

## 为什么研究

Particles4All 把 Position Based Fluids、刚体 Shape Matching、GPU 邻域搜索、各向异性粒子核和屏幕空间流体渲染放进同一个原生 WebGPU 演示。它最值得研究的不是“水看起来很漂亮”，而是同一组粒子约束如何同时产生水流、碰撞、排水、浮力和刚体姿态。

本子项目不把它包装成工程 CFD、通用游戏物理引擎或成熟 npm SDK。本阶段只回答五个连续问题：

1. 上游声明的流体、刚体、浮力和水面渲染是否有真实代码与运行证据？
2. 不修改求解器核心，参数、交互和探针能否形成受控能力证据？
3. 哪些限制必须通过修改或适配原库解决？
4. 扩展后的能力适合哪些局部场景，成本与真实性边界是什么？
5. 是否值得沉淀为可复用运行时、组件或上游贡献？

## 能力地图

| 层 | 已实现能力 | 关键源码 |
| --- | --- | --- |
| 模拟 | PBF 密度约束、XSPH、表面张力、边界粒子 | `upstream/src/wgsl.js`、`upstream/src/sim.js` |
| 统一耦合 | 流体和刚体粒子进入同一邻域/约束循环 | `upstream/src/sim.js` |
| 刚体 | 质心、协方差、极分解、Shape Matching 投影 | `upstream/src/wgsl.js` |
| GPU 数据 | 均匀网格、计数、前缀扫描、scatter 重排 | `upstream/src/sim.js`、`upstream/src/wgsl.js` |
| 表面 | 各向异性核、表面网格、ray march、SSFR | `upstream/src/aniso_wgsl.js`、`mesh.js`、`ray.js`、`ssfr.js` |
| 交互 | 倒水、推水、拖动物体、改变容器宽度、相机控制 | `upstream/src/main.js` |
| 诊断 | GPU timer、密度/速度统计、内置 `verify=1` | `upstream/src/gputimer.js`、`upstream/src/main.js` |

## 场景驱动的横向矩阵

页面现在先提出使用问题，再通过单变量 A/B 关联引擎能力。底层仍共享同一固定版本和 URL 参数，不复制求解器代码。

| 使用场景 | A/B 受控差异 | 重点观察 | 关联能力 |
| --- | --- | --- | --- |
| 水上救援：浮具与载荷 | 同体积，仅改变密度 | 上浮/下沉、垂向速度、吃水趋势 | 密度、排水、Shape Matching、耦合 |
| 可变容积水箱 | 整体 X 边界 1.00× / 0.60× | 水位、扰动和物体重排 | 动态箱体边界、PBF、耦合 |
| 喷注实验：液柱与成滴 | 表面张力 0 / 2.1 | 断裂与液团聚合趋势 | 连续来水、表面张力、PBF |
| 互动清障：水与漂浮物 | 有/无可搬基础刚体 | 水流路径、水面反馈、刚体位姿 | 统一耦合、Shape Matching、拖拽 |
| 治水科普：堵与疏概念 | 宽域 / 整体收窄 | 积水与漂浮物响应 | 来水、动态边界、耦合；仅为叙事代理 |

粒子、Mesh、SSFR 和 100K 已归入“研究与诊断”：前三者是证据视图，100K 是设备与质量档位，不再与真实用途并列。完整矩阵、真实性边界和扩展优先级见 [`SCENARIOS.md`](SCENARIOS.md)，受控运行定义见 [`PROTOCOL.md`](PROTOCOL.md)。

五个使用场景现在都提供“运行 A → B 完整对照”：实验台在单个 WebGPU 实例中依次重建 A、B，精确运行相同整数 solver steps 和固定来水粒子预算，冻结后显示内部代理的 A、B 与 Δ。六阶段时间线展示准备、运行、冻结和完成状态，结果区审计目标/实际步数、固定输入与快照次数。它是受控顺序比较，不是双画面实时同步；手动调参后会明确标记为自由探索。

## 复现方法

WebGPU 需要 HTTP/HTTPS 安全上下文，不能直接双击 `file://`。

在仓库根目录运行：

```powershell
python -m http.server 8107 --directory docs
```

然后打开：

```text
http://127.0.0.1:8107/demos/particles4all/
```

最小验证入口：

```text
http://127.0.0.1:8107/demos/particles4all/engine/?preset=small&view=particles&verify=1
```

运行环境至少需要支持 WebGPU 的浏览器与硬件加速。页面会在父级实验台和上游引擎内分别检查 WebGPU；不支持时保留场景说明与回退信息。

## 当前证据

- 固定上游源码和 MIT 许可证位于 `upstream/`。
- Pages 演示中的 `engine/` 是该固定版本的发布镜像，便于静态托管。
- 场景清单、外层 solver-step 封顶协议与只读区域探针集中在 `docs/demos/particles4all/app.js`；固定上游求解器镜像没有被修改。
- 上游自带 `verify=1`，可检查空间扫描单调性、GPU/CPU 密度误差、非有限值和粒子包围盒。
- Chrome 151 硬件 WebGPU 回归已跑完五个应用场景的十个条件，验证 180/144/162 solver-step 目标、0/900/3,000 粒子输入、实际边界、区域计数守恒、100k、390px 结果布局和内置 verify；运行时截图、控制台和原始结果记录在 [`EVIDENCE.md`](EVIDENCE.md)。

## 阶段结论

当前已经确认源码层存在完整的模拟和渲染链，不是只有水面 shader；硬件浏览器也已跑通关键路径。横向场景采用参数化复用，不把故事名称误写成新增物理能力。

项目研究计划已经完成：M5-S3 形状/控制探针 23/23 证明现有三种 shape 不能表达中空可倾倒容器，M4-WP2 不启动；M6-WP1 完成 Chrome/Edge × Intel Gen-12LP 的性能与生命周期基线，M6-WP2/WP3 完成组件化、上游候选与终局判断。宏观 Water Scene Lab 继续冻结。

## 已知限制

- 上游非常新，固定版本只有少量提交，README 的算法章节仍待补充。
- 当前场景构造只原生支持 box、sphere、torus；没有任意 glTF/SDF 碰撞体。
- PBF 目标是实时视觉稳定性，不是工程流体精度。
- 性能同时受粒子数、邻居数、子步、约束迭代和屏幕空间渲染分辨率影响。
- 上游主分支的 scatter pipeline 使用 12 个 storage buffers，在部分 Apple Silicon + Chrome/Dawn 组合上可能超过每阶段 10 个 buffer 的限制；上游 PR #5 尚未合并。
- 当前发布镜像忠实保留固定版本，不悄悄合入未发布的第三方 PR。

## 上游归属与许可

`upstream/` 及 `docs/demos/particles4all/engine/` 中的 Particles4All 源码、WGSL、预设和上游截图归原作者及贡献者所有，按 MIT License 使用；发布镜像保留 `LICENSE`、原仓库链接和原始版权信息。

本仓库原创部分仅包括研究文档、实验台外壳、场景参数、中文说明和验证记录，不将第三方算法或代码标记为本仓库原创成果。
