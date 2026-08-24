# M5-S3｜容器倾倒与溢流可行性

状态：`completed / STOP`；依赖 M5-S2 已完成。控制状态以 [`program-state.json`](program-state.json) 为准。

## 当前目标

先判断 Particles4All 现有能力能否物理表达“液体被一个可转动的中空容器承载并倾倒”，再决定是否实现。禁止用视觉模型包围独立粒子效果冒充原求解器碰撞。

## 必要能力

- 中空或多面静态/刚体容器，而不是实心 Shape Matching box；
- 容器姿态可控，内壁能参与 PBF 边界作用；
- 液体能够从容器口离开并进入全局水池；
- 倾倒前后质量和非有限值可审计；
- 仍使用 M3 Adapter 的 tick、输入、事件和采样能力。

## 第一子目标

审计 `sphere/torus/box` 采样、刚体 shape matching、边界 buffer 与姿态控制，形成三选一结论：

1. 现有原库可以组合表达，直接做受控实验；
2. 需要 M4-WP2 复杂碰撞体最小扩展，先做可行性 Gate；
3. 成本超过研究价值，停止 M5-S3 并进入 M6 决策。

在结论产生前不制作“容器倾倒”展示页面。

## 源码与运行时结果

`sampleBody()` 对 box 和 sphere 做体积填充；torus 只生成闭合圆环。GPU 探针结果：

- box：1,859 个刚体粒子，中心邻域有 7 个粒子；
- sphere：1,791 个刚体粒子，中心邻域有 7 个粒子；
- torus：1,232 个粒子，中心邻域为 0，但 Y 半厚度仅约 0.04，是圆环而不是带底容器；
- 三者初始 rotation 均为单位矩阵；
- 运行时只有 `holdBody/releaseBody`，没有 `setBodyPose`、`setBodyRotation` 或 `addStaticCollider`；
- Chrome 151 / Intel Gen-12LP WebGPU Gate 23/23 通过。

证据：[`assets/container-feasibility-gate.json`](assets/container-feasibility-gate.json)、[`assets/container-feasibility-gate.png`](assets/container-feasibility-gate.png)、[`tests/container-feasibility-browser.cjs`](tests/container-feasibility-browser.cjs)。

## 成本与决策

Shape Matching 理论上可以消费新的 cup rest point cloud，但完整倾倒至少还需要：

1. 中空/复合 shape 语法和采样；
2. 任意初始位置与旋转；
3. 可控角运动或目标姿态驱动；
4. solid/ray/SSFR 对新形状的渲染；
5. 容器内外质量、泄漏与稳定性 Gate。

这不是 Adapter 级小扩展，而是场景构造、求解控制和渲染三层 fork。当前没有足够价值证据支持启动 M4-WP2，因此 M5-S3 以 `STOP` 完成，不制作伪物理容器展示。未来只有明确产品需求愿意承担上述成本时再恢复。
