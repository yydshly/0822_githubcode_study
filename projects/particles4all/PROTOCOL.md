# Particles4All 受控 A/B 协议

## 目标

本协议用于回答“同一场景只改变一个声明变量时，固定版本求解器内部结果如何变化”。它是教学与研究回归协议，不是现实工程试验标准。

演示采用单个 WebGPU iframe 顺序运行 A → B，避免两个 GPU Device 同时工作。每个 variant 都从新页面开始，并在终点只读取一次冻结快照。

## 时间单位

上游 `Sim.step(frameDt)` 内部使用：

```text
solverStepDt = (1 / 60) / substeps
```

当前五个应用场景都使用 `small` preset，`substeps=2`，因此一个 solver step 为 `1/120s`。

| 场景 | 模拟时间 | 目标 solver steps | 固定新增流体粒子 |
| --- | ---: | ---: | ---: |
| 浮具与载荷 | 1.50s | 180 | 0 |
| 可变容积水箱 | 1.20s | 144 | 0 |
| 液柱与成滴 | 1.35s | 162 | 900 |
| 互动清障 | 1.20s | 144 | 3,000 |
| 治水科普代理 | 1.20s | 144 | 3,000 |

## 六阶段时间线

```text
准备 → A 运行 → A 冻结 → B 运行 → B 冻结 → 完成
```

每个 variant 的准备过程：

1. 加载新的同源 iframe 并等待 `__sim` 就绪。
2. 暂停、Reset，并清空 `timeBank`、`lastAdvanced`、`lastSubsteps`。
3. 如果场景改变整体 X 边界，令 `timeScale=0`，只让箱壁移动到目标；到位后再次暂停。边界因此在 solver step 0 前完成，而不是在实验中按墙钟渐变。
4. 写入精确来水粒子预算并启动 pour 状态。
5. 外层临时包装当前实例的 `sim.step()`，根据实际 `simTime` 精确封顶目标 solver steps。
6. 锁定 iframe 指针输入，运行至目标步与固定输入同时完成。
7. 暂停并读取一次位置、body mask、刚体姿态和上游 stats。
8. 删除实例包装，恢复 B 条件供自由探索。

上游发布镜像没有被修改。solver-step 包装只存在于当前 iframe 的 `Sim` 实例，variant 重建后自然消失。

## 严格通过条件

```text
A.actualSolverSteps === targetSolverSteps
B.actualSolverSteps === targetSolverSteps
A.fluidParticles === B.fluidParticles
A.injectedParticles === fixedInputParticles
B.injectedParticles === fixedInputParticles
```

五项同时满足才显示 `strictPassed=true`。不再使用“时长差小于 0.08 秒”作为严格受控判据。

结构化结果暴露在：

```js
window.__particles4allLab.comparisonResults = {
  sceneId,
  controlled,
  protocol: {
    stepDt,
    targetSteps,
    fixedInputParticles,
    aActualSteps,
    bActualSteps,
    history,
    strictPassed
  },
  results: [{ variant, probe }, { variant, probe }]
};
```

## 冻结探针

单次快照读取 `livePos()` 与 `liveBody()`。当前 30K 级场景约读回 0.96–1.5MB；适合每个 variant 冻结一次，不适合逐帧监测。

已提供：

- 全局流体 P05/P95 与垂向展开；
- 刚体中心、平均位移和刚体数量；
- 实际箱体 X 范围、流体/刚体/新增粒子数；
- 以 `x = boxX / 2` 划分的“来水侧半区”和“远侧半区”粒子数、占比与各自 P95；
- 上游全局最大速度、平均/最大密度统计。

区域计数满足：

```text
inletParticles + farParticles === fluidParticles
```

“来水侧”只是当前喷口所在一侧的容器分区，不等于真实河道上游；半区粒子占比不是流量，P95 也不是标定水位。

## 当前不保证

- 不保证跨 GPU、驱动或浏览器的粒子缓冲逐位一致；GPU scatter 与原子归约没有 bit-exact 顺序承诺。
- 不提供实验中间事件的引擎级 `step(n)` 调度；当前边界在 step 0 前直接到位。
- 不重写上游全局 `pourSeed`；A/B 通过各自新 iframe 获得相同初始 seed。
- 不提供开放出口、局部闸门、累计过线粒子身份或工程流量。
- `u`、`u/s`、P95、位移与速度都是 solver-unit 内部代理。

## 下一层升级

如果需要边界渐变、施力或注水事件在某个整数 60Hz tick 精确发生，应建立明确的本地 runtime fork，并在引擎闭包内部暴露：

```text
reset(seed, scene)
step(ticks)
sample()
flush()
dispose()
```

每个 60Hz 协议 tick 内先推进边界，再循环 `substeps` 次执行求解与注水。该方案会使发布镜像不再与固定上游逐文件一致，必须单独记录补丁和重新建立运行证据。
