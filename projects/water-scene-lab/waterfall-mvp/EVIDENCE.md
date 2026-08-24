# Waterfall MVP 证据

## Particles4All 原生高密度对象

- Runtime body profile：`box / density 2.2 / size 0.15 / dense-impact-block`；
- 输入：384/384 粒子，`-Y 2.5 u/s`，30/30 ticks；
- 无注入基线沿 `-Y` 位移约 `0.3168 u`，注入后约 `0.3322 u`，差值约 `0.0154 u`；
- WebGPU、body profile、有限值与基线差分 acceptance 通过；桌面浏览器 Gate 19/19。

## Particles4All 近场物理桥

- 页面运行时真实加载 `docs/demos/particles4all/engine/` 固定上游镜像；
- `water-scene.particles4all-near-field/v1` 描述加载、映射、发射器、探针、Gate 与真实性边界；通用 Scene Runner 编译契约后调用 `Particles4AllRuntimeAdapter`；
- 实际注入 384/384，WebGPU context 成立，粒子位置非有限值为 0；
- Shape Matching sphere 在同一运行中位移 `0.415935 u`；
- 16.8 m 落差与 18.16 m/s 理想撞击速度用于跨尺度输入说明，solver 仍使用已验证的 `-2.5 u/s`，不声称现实流量或冲击力标定；
- 契约格式/序列化/编译/验收测试 25/25；桌面 Chrome 真实运行 Gate 17/17，无 console/page error。

原始结果：[`assets/particles4all-bridge-browser-results.json`](assets/particles4all-bridge-browser-results.json)。桌面视觉证据：[`assets/particles4all-bridge-desktop.png`](assets/particles4all-bridge-desktop.png)。

## 证据结论

截至 2026-08-24，`waterfall-breakup-v1` 的固定数值协议 24 / 24 通过。模型证据支持以下有限结论：在固定崖壁、主水幕和视觉速度下，B 只增加一层破碎粒子，就产生了可重复的边缘扩展与落点区域占用；A 的对应增量全部为 0。

真实浏览器视觉、交互和性能检查也已通过，因此 Waterfall 已进入 `evidence-backed prototype`。历史视觉 Gate 3 继续成立；当前 Stage 6 Gate 为 `Waterfall scene contract passed / advance River reuse`。

这不是对真实流量、质量/动量守恒、压力、碰撞、侵蚀或结构安全的证明。

## 数值模型检查

命令：

```powershell
node projects/water-scene-lab/waterfall-mvp/tests/model-test.mjs
```

结果：24 / 24 项检查通过，包括固定协议、代理/发射器表、探索层排除、主水幕一致性与重复性、固定端点、相同起点和时间、代理生命周期/边界/有限值、固定层差异、A/B、重复摘要、哈希契约、单变量、A 零增量、B 可见增量、雾排除与无数值失败。

| 诊断 | 结果 |
| --- | ---: |
| A/B 主水幕最大差 | `0` |
| 主水幕重复查询最大差 | `0` |
| 主水幕非有限值 | `0` |
| 主水幕顶部 / 底部 Y | `18.0 / 1.2` |
| 生命周期违规 | `0` |
| 边界违规 | `0` |
| 代理采样非有限值 | `0` |
| 固定 `t=7.25s` A / B 活动代理 | `0 / 69` |
| 固定 `t=7.25s` B 边缘 / 撞击代理 | `29 / 40` |
| A/B 配置差异键 | 仅 `breakupMode` |

固定统计结果：

| 指标 | A 连续主水幕 | B 增加破碎粒子 | B 增量 |
| --- | ---: | ---: | ---: |
| 图层数 | 1 | 2 | +1 |
| 活动代理均值 | 0 | 69.6729 | +69.6729 |
| 活动代理 P95 / 最大值 | 0 / 0 | 77 / 85 | +77 / +85 |
| 边缘活动代理均值 | 0 | 31.2104 | +31.2104 |
| 撞击活动代理均值 | 0 | 38.4625 | +38.4625 |
| 边缘扩展均值 | 0 | 0.359470 | +0.359470 |
| 边缘扩展 P95 | 0 | 0.824570 | +0.824570 |
| 落点占用均值 | 0 | 0.357064 | +0.357064 |
| 落点占用 P95 | 0 | 0.437500 | +0.437500 |
| 雾覆盖均值 | 0 | 0 | 0 |
| 非有限 / 生命周期 / 边界违规 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |

- 主水幕哈希：`fnv1a-adc38d1c`
- 共用契约哈希：`fnv1a-17ebbf07`
- 破碎规格哈希：`fnv1a-b6b85ec7`
- A / B 主水幕探针摘要：`fnv1a-5b2f8b1a`（相同）
- A 结果摘要：`fnv1a-58a678a7`
- B 结果摘要：`fnv1a-624b5038`
- 每个案例：1,200 tick、960 个统计 tick；A 0 次代理查询，B 99,840 次代理查询。

原始数据：[`assets/waterfall-model-test-results.json`](assets/waterfall-model-test-results.json)

## 真实浏览器检查

环境：Chromium `151.0.7922.170`，ANGLE / Intel UHD Graphics / Direct3D11，Three.js r185，WebGL2。帧时间来自页面 `requestAnimationFrame` 观测，不是 GPU timer query；长帧定义为大于 50 ms，最大值和长帧都保留在结果中。

| 视口 | 运动偏好 | 质量档 / 视图 | 首帧 | P50 | P95 | 最大帧 / 长帧 | Draw / 三角形 | 结果 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1440 × 900 | 正常运动 | balanced / 2 | 708.3 ms | 4.2 ms | 8.3 ms | 50.1 ms / 1（360 帧） | 13 / 21,044 | 通过 |
| 390 × 844 | 正常运动 | fallback / 1 | 157.1 ms | 4.2 ms | 4.3 ms | 91.6 ms / 1（360 帧） | 7 / 4,602 | 通过 |
| 390 × 844 | reduced-motion | fallback / 1 | 129.9 ms | 4.2 ms | 4.4 ms | 12.7 ms / 0（83 帧） | 7 / 4,602 | 通过 |

表中的 `fallback` 是移动端低几何质量档名称，不是 WebGL 失败状态；三个运行案例都使用实时 WebGL2。桌面使用 DPR 0.82，移动为 DPR 1。固定分析只预计算一次，分别耗时 157.6、80.9 与 77.8 ms；首帧包含模块、场景、分析和着色器初始化，不等同于稳定态帧时间。

三个案例均满足：HTTP 200、画布非空、Three r185、A/B 主水幕完全一致、唯一差异为 `breakupMode`、A 补充层 0、B 为 48 个边缘代理 + 56 个撞击代理、1,200/960 tick 固定结果通过、白沫和雾锁定关闭、桌面双视图、390px 单视图与 44px 切换、暂停/重置、reduced-motion 默认静止且显式运行可采样、横向溢出为 0、控制台错误为 0、页面异常为 0、失败请求为 0。

强制 WebGL fallback 也通过：明确失败原因、46px 重试按钮和完整 DOM 方法说明可见，无横向溢出或页面错误。

性能 P50/P95 均达到临时门槛。桌面记录一次 50.1 ms 长帧，移动正常记录一次 91.6 ms 长帧；它们没有被统计清洗掉，仍是后续隔离系统调度与运行尖峰的优化项。

这里的帧时间是整页同步演示总成本，不是破碎粒子层的独立增量成本：桌面同帧绘制 A/B，移动验收也包含 B 的切换与显式运行。若要给粒子层单独报价，仍需新增 A-only / B-only 隔离性能实验，不能从当前 P50/P95 相减推导。

人工视觉复核在修复过曝底部和“珠串”式粒子后通过：同一证明镜头能看见上缘、主要落差和撞击池；A 单独看仍成立为连续瀑布，B 增加错相、细小的青白碎滴与撞击飞溅，桌面和 390px 的增益都可辨，移动端更克制。正式 A/B 没有混入独立白沫或雾层。

原始数据：[`assets/waterfall-browser-results.json`](assets/waterfall-browser-results.json)

该 JSON 绑定了本轮被测源码，而不只记录 URL：`app.js` 为 `47d7f424…31a490`，`index.html` 为 `11295ea7…79069`，`styles.css` 为 `ab94b7ad…598760`，模型为 `f135198a…82cf6`，本地 Three r185 模块为 `15a6b51a…cb2c1`，浏览器脚本为 `ac7b984a…9f5046`；完整 SHA-256 与仓库相对路径均保存在 `testedSources`。

证据截图：

- [`assets/waterfall-desktop.png`](assets/waterfall-desktop.png)
- [`assets/waterfall-mobile.png`](assets/waterfall-mobile.png)
- [`assets/waterfall-mobile-reduce.png`](assets/waterfall-mobile-reduce.png)
- [`assets/waterfall-fallback.png`](assets/waterfall-fallback.png)

## Gate 3 判断

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| 数值与重复性 | 通过 | 24 / 24；主水幕一致、唯一变量、摘要重复、无非有限/生命周期/边界错误 |
| 破碎层增量 | 模型通过 | A 增量为 0；B 活动代理、边缘扩展和落点占用均为正 |
| 视觉可读性 | 通过 | 上缘、落差和撞击区同镜可读；B 的细小错相碎滴有独立增益，且未混入白沫/雾 |
| 桌面/移动功能 | 通过 | 双/单视图、44px 切换、暂停/重置、reduced-motion 和强制 fallback 通过 |
| 临时性能门槛 | 通过 | 桌面 4.2/8.3 ms；移动正常 4.2/4.3 ms、reduced-motion 4.2/4.4 ms（P50/P95） |
| 帧时间尾部 | 记录并优化 | 桌面最大 50.1 ms / 1 个长帧；移动正常最大 91.6 ms / 1 个长帧，未隐藏 |
| Particles4All 耦合需求 | 已成立于近场 | 落水池局部刚体响应由场景契约按需调用原库；不扩张到宏观水幕 |

因此历史 Gate 3 的视觉结论仍为 `continue Waterfall hybrid visual baseline`；Stage 6 已进一步证明落水池刚体交互值得按需调用 Particles4All，并通过可序列化场景契约隔离宏观表现与近场求解。单设备证据不把整个 Water Scene Lab 标记为 `validated`，下一门是 River 第二场景复用。

## 复现限制

- 只有一组固定崖壁、落差、宽度、池体、发射表和时间线。
- 主水幕和破碎轨迹是解析/预设视觉代理，没有网格到粒子的质量交换。
- “边缘扩展”和“落点占用”是内部诊断，不对应真实尺度或流量。
- 白沫与雾在正式 A/B 中关闭，模型证据不能证明它们的视觉价值或性能成本。
- 单台 Windows / Intel UHD / Chromium 证据不代表 Safari、Firefox、Apple GPU、移动真机或其他设备。
- 自动化检查不能替代不同崖壁、相机、背景亮度和真实内容资产下的持续视觉评审。
