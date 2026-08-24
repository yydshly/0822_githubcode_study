# Particles4All Runtime Adapter v1

状态：`Stage 2 passed`（Chrome 151 / Windows / Intel Gen-12LP WebGPU，2026-08-24）

## 决策

Stage 2 先做同源 iframe adapter，不立即复制和修改求解器。固定上游已经公开 `window.__sim`、`window.__ui` 和 `window.__readBuf`，`Sim` 本身提供 `reset(params)`、`step(frameDt)`、`livePos()`、`liveBody()` 与 GPU device，因此可以先建立一个可测试的外部运行契约。

这仍然真实运行 Particles4All 的 PBF、Shape Matching、邻域搜索和渲染链，不是重新实现流体算法。

## 源码依据

| 需求 | 上游依据 | Adapter v1 |
| --- | --- | --- |
| 重置 | `Sim.reset(params)`；页面 `reset` 调用 `applyScene()` | `reset()` 点击原页面 Reset 并清空时间余量 |
| 固定步进 | `Sim.step(frameDt)`；步长为 `(1/60)/substeps` | `step(ticks)` 在暂停状态直接推进整数 solver ticks |
| 冻结采样 | `livePos()`、`liveBody()`、`__readBuf` | `sample({positions, phases})` |
| GPU 完成点 | `sim.dev.queue` | `flush()` 等待 `onSubmittedWorkDone()` |
| 受控注入 | `Sim.appendFluid(pos, vel)` | `injectFluid()` 校验 xyz/速度、容量与实际写入数量 |
| 整数 tick 调度 | `sim.step()`、`injectFluid()`、`sample()` | `runSchedule()` 按 tick 和输入顺序执行并记录历史 |
| 流体包生成 | 上游 `params.spacing` 与 `Sim.appendFluid()` 输入格式 | `createFluidBlock()` 生成可序列化格点配置及 typed arrays |
| 刚体目录与姿态 | `sim.bodies`、GPU `bodyCentre/bodyRot` | `describeBodies()`、`sampleBodies()` 返回稳定身份、初态和实时姿态 |
| 刚体事件 | `Sim.holdBody()`、`Sim.releaseBody()` | `holdBody` / `releaseBody` 进入整数 tick 事件队列 |
| 释放 | 上游没有完整 `dispose()` | v1 只能暂停并可选卸载 iframe |

实现位于 [`docs/demos/particles4all/runtime-adapter.mjs`](../../docs/demos/particles4all/runtime-adapter.mjs)，实验台通过 `window.__particles4allLab.runtime` 暴露同一个 adapter。

## 能力边界

v1 已支持：

- 确认运行时确实连接固定上游引擎；
- 暂停、重置、精确整数 solver tick；
- 读取摘要、粒子位置、phase/body mask、刚体姿态和统计；
- 等待已提交 GPU 工作完成。
- 通过 `injectFluid()` 直接向原库追加有限、可审计的流体输入。
- 通过 `runSchedule()` 在 Reset 后按整数 tick 调度注入和冻结采样；同一 tick 保持配置顺序。
- 通过 `createFluidBlock()` 按 origin、counts、spacing 和 velocity 生成无重复流体格点；生成结果继续交给原库 `appendFluid()`。
- 通过 `sampleBodies()` 直接冻结读回原库 GPU 质心/旋转，并通过 `holdBody` / `releaseBody` 事件重放原交互路径。

v1 不支持：

- 显式随机种子；
- 在第 N tick 安排注水、边界或施力事件；
- 自定义任意碰撞体；
- 显式销毁 Sim、Renderer 和 GPUDevice 的全部资源。

这些缺口来自上游接口边界，不由 adapter 伪造。只有后续场景确实需要其中一项时，才建立最小 solver fork，并单独记录补丁。

## 硬件 WebGPU 等价 Gate

固定参数：small、28,000 流体粒子、341 刚体粒子、轻载 sphere、24 solver ticks。

运行时 adapter label 为 `intel gen-12lp`；Chrome CDP 报告 Intel UHD Graphics、驱动 `32.0.101.6790`，`webgpu=enabled`。设备同时存在 RTX 4070，但本轮 WebGPU 实际选择的是 Intel adapter，不把结果外推到另一块 GPU。

| 检查 | 原页面 | Adapter | 结果 |
| --- | ---: | ---: | --- |
| 实际 ticks | 24 | 24 | 相同 |
| `simTime` | 0.2 s | 0.2 s | 相同 |
| 流体粒子 | 28,000 | 28,000 | 相同 |
| 刚体粒子 | 341 | 341 | 相同 |
| 非有限值 | 0 | 0 | 相同 |
| 刚体中心 | `[0.75, 0.819319, 0.500000]` | 相同 | 相同 |
| 自动检查 | 34 | 34 | 全部通过 |

流体质心差低于 `2.5 × 10⁻⁵ u`，各轴 P05/P50/P95 差低于 `3.2 × 10⁻⁴ u`，均在预先声明容差内。GPU scatter/原子归约不承诺跨运行逐位一致，因此 Gate 使用守恒计数、非有限值、聚合空间量与刚体姿态，而不是逐粒子字节相等。

证据：[`assets/runtime-adapter-equivalence.json`](assets/runtime-adapter-equivalence.json)、[`assets/runtime-adapter-direct.png`](assets/runtime-adapter-direct.png)、[`assets/runtime-adapter-lab.png`](assets/runtime-adapter-lab.png)。控制台错误和页面错误均为空。

结论：Adapter v1 没有改变固定上游求解结果，M2 通过。M3-WP1～WP4 已完成受控注入、tick 调度、流体包生成及刚体观测/事件；当前使用这些模块执行 [`LOCAL_IMPACT_SLICE.md`](LOCAL_IMPACT_SLICE.md)。

Adapter v1 是运行接口扩展，不是新物理能力。后续任何场景仍必须说明使用了原库哪条物理链。
