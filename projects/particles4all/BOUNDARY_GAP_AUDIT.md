# M4-WP1｜局部边界缺口审计

状态：`completed`。结论用于决定 M5-S2 的实现范围，不授权独立水体求解器或宏观水环境。

## 审计问题

Particles4All 的固定 box 边界、`boundary=0` 与 `resizeBox()` 能否直接表达局部闸门、开口和出流？如果不能，M5-S2 是否必须立即修改求解器？

## 源码能力

| 能力 | 上游实现 | 结论 |
| --- | --- | --- |
| 静态边界 | `scene.js::boundaryParticles()` 遍历完整 box shell | 六个面全部封闭，没有 aperture 数据结构 |
| 边界作用 | `lambda/delta` WGSL 消费 `bpos/bpsi` | 边界粒子参与 PBF 密度与位置修正 |
| `boundary=0` | `uploadParams()` 将 `nBoundary` 置 0 | 只关闭 PBF 边界样本，不关闭空间 clamp |
| 空间限制 | `deltaWGSL` 始终执行 `clamp(..., clampMin, clampMax)` | 粒子仍不能离开 box |
| 动态缩箱 | `Sim.resizeBox()` 重建完整 shell，并用 `resizeWGSL` 缩放/夹取全部粒子 | 只能整体改变箱体尺寸，不是局部墙或闸门 |
| 内部障碍 | `sphere/torus/box` Shape Matching 刚体 | 可作为封闭箱内可移动障碍或近似闸门 |
| 刚体控制 | `holdBody()/releaseBody()` | 可按整数 tick 保持、移动和释放内部 box |

## 运行时证据

Chrome 151 / Intel Gen-12LP WebGPU 探针 20/20 通过：

- `1.5×1×1` box 生成 20,002 个边界样本，六个面样本数均大于 0；
- `boundary=0` 后边界 buffer 仍存在，高速右向粒子最终仍被夹在 `x=1.49`；
- `resizeBox([1.2,1,1])` 后重新生成完整六面壳体，并把全部流体限制到新 X 范围；
- 两个条件均无非有限位置，WebGPU context 成立，页面和控制台无错误。

证据：[`assets/boundary-capability-gate.json`](assets/boundary-capability-gate.json)、[`assets/boundary-capability-gate.png`](assets/boundary-capability-gate.png)、[`tests/boundary-capability-browser.cjs`](tests/boundary-capability-browser.cjs)。

## 缺口矩阵

| 场景能力 | 当前原库 | M5-S2 是否需要 | 决策 |
| --- | --- | --- | --- |
| 封闭箱内喷流 | 支持 `appendFluid()` | 是 | 直接复用 |
| 内部可移动闸门/挡板 | 可用 box 刚体 + hold/release 近似 | 是 | 先验证，不改核心 |
| 局部开口 | 不支持 | 否，首个 M5-S2 可不依赖 | 延后 |
| 粒子真实流出计算域 | clamp 阻止 | 否 | 延后 |
| 出口粒子回收/质量账本 | 不支持 | 否 | 延后 |
| 任意 SDF/glTF 静态碰撞体 | 不支持 | 否 | M4-WP2 保持 pending |

## 决策

M4-WP1 完成，但不启动边界求解器补丁，也不启动 M4-WP2。M5-S2 收敛为“封闭箱内可移动 box 闸门对固定喷流的偏转与释放”，使用已经通过 Gate 的原库能力模块。

如果后续目标明确要求溢流、排水口、河道出流或质量离开计算域，必须新成立开放边界工作包，至少同时处理：局部边界 mask、条件 clamp、外部网格域、粒子回收和质量守恒。不能只删除一块 boundary buffer 来冒充出口。
