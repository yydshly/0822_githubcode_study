# Stage 3｜落水池局部交互切片

计划归属：`M5-S1`；状态：`completed / Gate 28/28`；依赖 `M3-WP4` 已完成。本文件是已完成场景验证的控制规格，状态以 [`program-state.json`](program-state.json) 为准。

## 目标

用一个最小局部场景验证 Particles4All 原始 PBF 与 Shape Matching 是否适合表现“落水冲击水池中的刚体”，而不是制作完整瀑布、河流或分水岭。

```text
固定液体包
→ 原库 Sim.appendFluid()
→ 原库 Sim.step()
→ PBF 密度约束 / XSPH / 表面张力
→ 有无 Shape Matching 刚体
→ 冻结采样与 GPU 成本
```

水体求解、刚体求解和流体—刚体作用全部来自 Particles4All。Adapter 只负责固定 tick、固定输入和采样。

## 原库能力映射

| 场景需求 | 原库能力 | 源码位置 | 本阶段是否改算法 |
| --- | --- | --- | --- |
| 向水池注入液体包 | `Sim.appendFluid(pos, vel)` | `upstream/src/sim.js` | 否，只增加 Adapter 调用入口 |
| 液体密度与不可压缩趋势 | PBF `lambda` / `delta` | `upstream/src/sim.js`、`wgsl.js` | 否 |
| 液体速度平滑与聚合 | XSPH / surface tension | `upstream/src/sim.js`、`wgsl.js` | 否 |
| 石块或漂浮物 | Shape Matching | `upstream/src/sim.js`、`wgsl.js` | 否 |
| 固定步进与采样 | Runtime Adapter v1 | `docs/demos/particles4all/runtime-adapter.mjs` | 是，运行接口扩展 |

## 首个 A/B

唯一变量：是否存在一个原库 Shape Matching 刚体。

| 条件 | 初始流体 | 注入 | 刚体 | solver ticks |
| --- | --- | --- | --- | ---: |
| A｜纯水池 | 相同 small pool | 相同位置、速度、数量的固定液体包 | 无 | 固定 |
| B｜水池与石块 | 相同 small pool | 与 A 完全相同 | 一个基础 sphere 或 box | 固定 |

注入粒子按原库 `spacing` 形成规则格点，位置与速度使用 solver units。A/B 不改变重力、密度、张力、迭代次数、渲染路径、相机和采样时刻。

## 观察指标

- 输入：目标/实际注入粒子数、初始/最终流体粒子数；
- 稳定性：`nonFinite`、密度统计、粒子边界；
- 水体：撞击区粒子数、径向展开、Y 方向 P05/P50/P95；
- 刚体：中心位移、垂向位移和旋转；
- 成本：相同 tick 的 GPU simulation timing 与冻结读回成本；
- 表现：固定相机截图，只用于解释数值结果。

## Gate 3A

以下条件同时满足才批准继续：

1. A/B 实际注入量和最终流体粒子数一致；
2. 两者实际 solver ticks 与目标一致；
3. 两者 `nonFinite=0`；
4. B 的刚体产生可重复的非零响应；
5. 水体空间指标出现与刚体存在相关、可解释的差异；
6. 页面、WebGPU context、控制台和脚本错误检查通过；
7. 结论只描述 solver-unit 内部趋势，不换算真实瀑布流量或冲击力。

## 停止条件

- 基础刚体没有产生稳定、可重复的响应；
- 为了得到差异必须改写 PBF 参数到明显失稳；
- 注入与边界限制使场景只能靠装饰粒子成立；
- 性能成本相对交互收益不合理。

通过 Gate 3A 后，才判断下一项是扩展局部边界、复杂碰撞体，还是停止在基础交互样例。宏观瀑布页面不自动恢复。

## Gate 结果

最终协议使用相同 28,000 初始流体粒子、相同 `8×6×8`（384 粒子）流体包、`spacing=0.02`、垂向速度 `-2.5` 和 30 solver ticks。唯一 A/B 变量是是否存在一个上游 sphere（size 0.15、density 0.5）。

- A/B 注入量和最终流体粒子数完全一致，均无非有限位置；
- 含刚体条件的局部高位冲击区比纯水池多 116 个粒子，Y-P95 高约 0.00308 solver-unit；
- 1,791 个刚体粒子形成的 sphere 产生非零位移，两次重复末态在声明容差内一致；
- Chrome 151 / Intel Gen-12LP WebGPU Gate 28/28 通过，页面和控制台无错误。

证据：[`assets/local-impact-gate.json`](assets/local-impact-gate.json)、[`assets/local-impact-gate.png`](assets/local-impact-gate.png)、[`tests/local-impact-browser.cjs`](tests/local-impact-browser.cjs)。这些结果证明局部视觉交互差异，不是现实单位冲击力或流量标定。
