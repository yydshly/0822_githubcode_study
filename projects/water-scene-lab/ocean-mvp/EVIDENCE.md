# Ocean MVP 证据

## Particles4All 近场复用

- 场景契约：`ocean-wave-uplift-near-field`，共用 Schema 和 `particles4all-scene-runner-v1`；
- Ocean 输入：风浪状态固定表面点 `(0, 0, 5 s)`，垂向速度约 `+1.6470 u/s`；
- Solver 事件：640 粒子、局部 `+Y 4.0 u/s`、36 ticks；
- 原生对象：`torus / density 0.22 / size 0.15 / floating-ring-probe`，由运行时回读并与契约一致；
- 基线对照：无注入 Y 位移约 `-0.45368 u`，注入后约 `-0.43840 u`，差值约 `+0.01528 u`；
- Shape Matching 姿态变化约 `1.20°`；
- 桌面 Chrome：20/20，WebGPU context 成立，`nonFinite=0`，console/page error 为空。
- Edge / Intel 与 Edge / RTX 4070 也分别通过 20/20；三配置上举增量相对离散度约 `0.59%`，旋转相对离散度约 `3.26%`。

证据文件：[`assets/particles4all-reuse-browser-results.json`](assets/particles4all-reuse-browser-results.json)、[`assets/ocean-particles4all-desktop.png`](assets/ocean-particles4all-desktop.png)。

## 证据结论

截至 2026-08-24，Ocean MVP 的固定数值协议与 Chromium 硬件 WebGL2 运行检查均通过。证据支持以下有限结论：在 `ocean-gerstner-v1` 的固定输入和内部单位下，有风涌浪 B 比平静海况 A 产生更高的水面变化与船体姿态运动量。

证据不支持把这些指标解释为现实浪高、风速、船舶安全、港口波场、近岸淹没或结构载荷。

## 数值模型检查

命令：

```powershell
node projects/water-scene-lab/ocean-mvp/tests/model-test.mjs
```

结果：12 类检查全部通过，包括固定协议、6 波表、解析导数、世界坐标逆解、陡峭度、非法海况拒绝、A/B、重复摘要、共用契约和非有限值检查。

| 诊断 | 最大误差 |
| --- | ---: |
| 解析导数有限差分误差 | `8.64e-11` |
| 逆解参数往返误差 | `1.78e-15` |
| 逆解高度往返误差 | `1.11e-16` |
| 逆解水平残差 | `1.78e-15` |

固定结果：

| 指标 | A 平静 | B 风浪 | B / A |
| --- | ---: | ---: | ---: |
| 水面高度 σ | 0.0816 | 0.3246 | 3.98× |
| 波峰 P95 | 0.1420 | 0.5597 | 3.94× |
| 坡度 P95 | 0.0946 | 0.3837 | 4.06× |
| 升沉 RMS | 0.0579 | 0.2301 | 3.98× |
| 横滚 RMS | 0.601° | 2.359° | — |
| 俯仰 RMS | 1.738° | 6.819° | — |
| 合成姿态 RMS 比 | — | — | 3.92× |
| 最小水平 Jacobian | 0.8925 | 0.5865 | — |
| 逆解失败 / 非有限值 | 0 / 0 | 0 / 0 | — |

- 契约哈希：`fnv1a-4a2c196d`
- A 结果摘要：`fnv1a-4c563629`
- B 结果摘要：`fnv1a-a85e5073`
- 每个案例：1,200 步、960 个统计步、24,000 次场查询。

原始数据：[`assets/model-test-results.json`](assets/model-test-results.json)

## 真实浏览器检查

环境：Chromium `151.0.7922.170`，ANGLE / Intel UHD Graphics / Direct3D11，Three.js r185，WebGL2。桌面与移动数据来自同一次自动化验收，不是 GPU timer query；帧时间是页面 `requestAnimationFrame` 观测。

| 视口 | 模式 | 质量档 | 视图 | 首帧 | P50 | P95 | Draw / 三角形 | 结果 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1440 × 900 | 正常运动 | balanced | 2 | 540.9 ms | 8.2 ms | 17.0 ms | 34 / 42,660 | 通过 |
| 390 × 844 | reduced-motion | fallback | 1 | 66.8 ms | 4.2 ms | 4.3 ms | 19 / 12,362 | 通过 |

两个视口均满足：HTTP 200、画布非空、Three r185、质量档与视图数正确、着色 uniform 与固定模型一致、1,200 步结果 `8/8` 通过、暂停/重置或移动 A/B 切换可用、横向溢出为 0、控制台错误为 0、页面异常为 0、失败请求为 0。

强制 WebGL fallback 也通过：原因可见、重试按钮可见、无控制台错误或失败请求。

原始数据：[`assets/ocean-browser-results.json`](assets/ocean-browser-results.json)

为判断性能长尾是否稳定存在，又连续执行了三次隔离验收：桌面 P50 为 8.2–8.3 ms、P95 为 16.7–20.9 ms；移动 P50 为 4.2 ms、P95 为 4.3–4.4 ms，三次均通过。此前一次接近其他验收执行的观察为桌面 P50 20.7 ms、P95 41.6 ms，作为并发/环境敏感性警告保留，不用最好成绩覆盖它。

重复摘要：[`assets/performance-repeat-summary.json`](assets/performance-repeat-summary.json)

证据截图：

- [`assets/ocean-desktop.png`](assets/ocean-desktop.png)
- [`assets/ocean-mobile.png`](assets/ocean-mobile.png)
- [`assets/ocean-fallback.png`](assets/ocean-fallback.png)

## Gate 1 判断

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| 数值与重复性 | 通过 | 导数、逆解、A/B、摘要和非有限值检查通过 |
| 视觉与采样一致 | 通过 | 同一波表驱动着色与四点船体查询 |
| 桌面/移动功能 | 通过 | 双视图、单视图切换、控制、reduced-motion 与 fallback 可用 |
| 临时 P50 门槛 | 通过 | 三次隔离复测：桌面 8.2–8.3 ms ≤ 22 ms；移动 4.2 ms ≤ 33 ms |
| 隔离性能复测 | 通过 | 三次桌面 P50 8.2–8.3 ms、P95 16.7–20.9 ms；并发观察仍保留为环境警告 |
| FFT 升级需求 | 未成立 | 当前没有需要频谱风浪的明确宿主问题 |

因此决策为 `continue Ocean baseline / hold FFT`：保留 Ocean 作为已证明的大尺度海面路线，但不是整个 Water Scene Lab 的 `validated` 结论，也不进入 FFT。共用时钟、质量档和证据协议现已用于 River 与 Waterfall；下一需求候选为 Flood Proxy。若产品以后需要频谱海况，再用同一协议比较 Gerstner 与 FFT。

## 复现限制

- 目前只有一组 Windows / Intel UHD / Chromium 硬件证据，没有 Safari、Firefox、Apple GPU 或移动真机覆盖。
- 浏览器脚本验证画布有内容、模型一致与交互状态，不替代人工对海面连续性、主体可读性和视觉伪影的评审。
- 首帧包含 ES module、Three.js、场景和着色器初始化，不等同于稳定态帧时间。
- Three.js 来自仓库内另一演示的固定 vendor 副本；依赖和许可证路径见 [`README.md`](README.md)。
