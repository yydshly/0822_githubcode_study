# River MVP 证据

## Particles4All 原生低密度漂浮物

- Runtime body profile：`box / density 0.35 / size 0.15 / drifting-debris-block`；
- 输入：480/480 粒子，局部 `+X 2.5 u/s`，36/36 ticks；
- 沿流位移约 `0.2470 u`，Shape Matching 旋转约 `14.25°`；
- WebGPU、body profile、方向平移、旋转和有限值 acceptance 通过；桌面浏览器 Gate 20/20。

## Particles4All 第二场景复用

- River 与 Waterfall 共用 `water-scene.particles4all-near-field/v1`、`Particles4AllRuntimeAdapter` 和 `particles4all-scene-runner-v1`；
- River 契约使用 `river-spline-flow-vector` 世界驱动，把中段切线旋转到局部 solver `+X`；
- 实际注入 480/480，36/36 ticks，WebGPU context 成立，粒子位置非有限值为 0；
- Shape Matching sphere 总位移向量为 `[0.132112, -0.478463, 0.000027] u`，其中沿指定流向 `+X` 位移 `0.132112 u`；
- 双场景契约检查 36/36，River 桌面 Chrome Gate 18/18，无 console/page error。

原始结果：[`assets/particles4all-reuse-browser-results.json`](assets/particles4all-reuse-browser-results.json)。桌面视觉证据：[`assets/river-particles4all-desktop.png`](assets/river-particles4all-desktop.png)。

有限结论：同一契约 Schema 和 Scene Runner 已从 Waterfall 纵向落水扩展到 River 水平入流，证明场景输入可以横向替换；这仍不是现实流量、水深、阻力或浅水传播证据。

## 证据结论

截至 2026-08-24，`river-flowmap-v1` 的固定数值协议与 Chromium 硬件 WebGL2 运行检查均通过。它支持以下有限结论：在这条固定弯曲河道和内部单位下，样条切线方向场 B 比世界固定方向场 A 更贴合河道切线，并让相同初始漂浮标记更多时间停留在河道范围内。

这不是对真实河流流速、流量、水深、阻力、动量、质量守恒或水文安全的证明。当前 Gate 2 为 `continue River visual baseline / hold shallow-water`：保留视觉方向基线，但没有宿主问题支持进入浅水求解。

## 数值模型检查

命令：

```powershell
node projects/water-scene-lab/river-mvp/tests/model-test.mjs
```

结果：27 / 27 项检查通过，包括固定协议、解析切线、切线连接连续性、正交标架、最近点往返、弧长采样、开放端点、中心线无自交、等弧长间距、岸线宽度稳定、固定方向、切线方向、相同速度模长、非法模式拒绝、标记确定性、A/B 初始标记一致、重复摘要、共用契约与非有限值检查。

| 诊断 | 最大误差 |
| --- | ---: |
| 解析切线有限差分误差 | `3.03e-9` |
| 样条连接切线夹角 | `0.002084°` |
| 正交标架单位/点积误差 | `1.11e-16` |
| 最近点横向往返误差 | `1.72e-8` |
| 等距离采样重建弧长误差 | `6.65e-5` |
| 非相邻中心线自交数 | `0` |
| 等弧长相邻间距最大误差 | `1.58e-4` |
| 左右岸固定宽度最大误差 | `1.78e-15` |
| B 方向与最近切线误差 | `0` |
| A/B 速度模长误差 | `4.44e-16` |
| 初始标记位置差 | `0` |

固定结果：

| 指标 | A 固定方向 | B 样条切线 | 差异 |
| --- | ---: | ---: | ---: |
| 切线对齐均值 | 0.7856 | 1.0000 | +0.2144 |
| 切线误差 P95 | 51.731° | ≈0° | -51.731° |
| 河道内采样比例 | 35.26% | 100.00% | +64.74 pp |
| 车道偏差 RMS | 5.4820 | ≈0 | -5.4820 |
| 沿河道前进速度代理均值 | 2.0032 | 2.5500 | +0.5468 |
| 横向距离 P95 | 8.2717 | 2.2500 | -6.0217 |
| 河道外 marker-tick | 4,972 | 0 | -4,972 |
| 非有限值 | 0 | 0 | 0 |

- 契约哈希：`fnv1a-4b3a09ae`
- A 结果摘要：`fnv1a-b098cc22`
- B 结果摘要：`fnv1a-039e9609`
- 每个案例：1,200 步、960 个统计步、7,680 次标记查询。

原始数据：[`assets/river-model-test-results.json`](assets/river-model-test-results.json)

## 真实浏览器检查

环境：Chromium `151.0.7922.170`，ANGLE / Intel UHD Graphics / Direct3D11，Three.js r185，WebGL2。帧时间由页面 `requestAnimationFrame` 观测，不是 GPU timer query；长帧定义为大于 50 ms，并与最大帧一起保留，不从统计中删除。

| 视口 | 运动偏好 | 质量档 / 视图 | 首帧 | P50 | P95 | 最大帧 / 长帧 | Draw / 三角形 | 结果 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1440 × 900 | 正常运动 | balanced / 2 | 1,335.3 ms | 4.2 ms | 17.1 ms | 62.4 ms / 3 | 26 / 9,448 | 通过 |
| 390 × 844 | 正常运动 | fallback / 1 | 196.3 ms | 4.2 ms | 4.3 ms | 54.2 ms / 1 | 13 / 3,060 | 通过 |
| 390 × 844 | reduced-motion | fallback / 1 | 138.8 ms | 4.2 ms | 8.4 ms | 15.3 ms / 0 | 13 / 3,060 | 通过 |

表中的 `fallback` 是移动端低几何质量档名称，不是 WebGL 失败状态；三个案例都在实时 WebGL2 中运行。桌面为控制成本使用 DPR 0.8，移动两例为 DPR 1.0。固定分析只预计算一次，记录耗时分别为 83.6、86.2 与 76.5 ms；首帧包含模块、场景、固定分析和着色器初始化，不等同于稳定态帧时间。

三个运行案例均满足：HTTP 200、画布非空、Three r185、预期双/单视图、A 为世界 `+Z`、B 与最近样条切线一致、速度模长与 `t=0` 标记位置相同、1,200/960 步固定结果通过、手机 44px A/B 切换可用、reduced-motion 默认静止且显式运行可采样、横向溢出为 0、控制台错误为 0、页面异常为 0、失败请求为 0。桌面 P50 4.2 ms ≤ 22 ms，两个移动案例 P50 4.2 ms ≤ 33 ms；测试还设置了桌面 P95 ≤ 50 ms、移动 P95 ≤ 66 ms 的诊断门，当前均通过。

强制 WebGL fallback 也通过：失败原因、重试按钮和完整方法说明可见，无横向溢出、控制台错误、页面异常或失败请求。

原始数据：[`assets/river-browser-results.json`](assets/river-browser-results.json)

证据截图：

- [`assets/river-desktop.png`](assets/river-desktop.png)
- [`assets/river-mobile.png`](assets/river-mobile.png)
- [`assets/river-mobile-reduce.png`](assets/river-mobile-reduce.png)
- [`assets/river-fallback.png`](assets/river-fallback.png)

## Gate 2 判断

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| 数值与重复性 | 通过 | 固定样条、方向查询、初始一致性、A/B 摘要和非有限值检查通过 |
| 视觉方向与对象一致 | 通过 | 浏览器桥检查 A `+Z`、B 样条切线、等速与同起点；水纹、箭头和标记读取同一 `flowMode` |
| 桌面/移动功能 | 通过 | 双视图、单视图切换、暂停/重置、44px 触点、reduced-motion 与强制 fallback 通过 |
| 临时 P50 门槛 | 通过 | 桌面 4.2 ms ≤ 22 ms；两个 390px 案例均为 4.2 ms ≤ 33 ms |
| 帧时间尾部 | 记录 | 桌面最大 62.4 ms / 3 个 >50 ms 长帧；移动正常最大 54.2 ms / 1 个长帧，未从统计中隐藏 |
| 浅水升级需求 | 未成立 | 当前没有动态水深、闸门、堰、回流或洪峰传播宿主问题 |

因此历史 Gate 2 仍为 `continue River visual baseline / hold shallow-water`；Stage 6 另行批准 `River Particles4All scene reuse passed / advance Coastal reuse`。这两个结论分别约束宏观方向代理和局部原库求解，不能合并成现实河流水动力学。本结论不把整个 Water Scene Lab 标记为 `validated`。

## 复现限制

- 当前固定样条只有一条，不能代表其他曲率、宽度、分叉或回流河道。
- 方向场与漂浮标记是解析视觉代理，没有水深、速度剖面、惯性、阻力、障碍碰撞或湍流。
- `bankExitCount` 是河道外 marker-tick 数，不是独立的撞岸事件数。
- 浏览器脚本验证运行状态、画布内容、方向契约与交互，不替代人工对 UV 拉伸、岸线穿插、弯道可读性和视觉伪影的评审。
- 单台设备证据不代表 Safari、Firefox、移动真机或其他 GPU。
