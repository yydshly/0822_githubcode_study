# Particles4All 证据记录

固定版本：`f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f`

最终状态：`research-complete`。M0–M6 与 G1–G6 已完成；组合决策与重新启动条件见 [`FINAL_DECISION.md`](FINAL_DECISION.md)。

## 静态证据

| 判断 | 证据 | 状态 |
| --- | --- | --- |
| 使用原生 WebGPU compute | `navigator.gpu`、`createComputePipeline`、WGSL `@compute` | 已确认 |
| 水使用 PBF 密度约束 | `lambdaWGSL`、`deltaWGSL` | 已确认 |
| 刚体使用 Shape Matching | `bodyCovWGSL`、`bodyResolveWGSL`、`bodyProjectWGSL` | 已确认 |
| 水和刚体共享粒子循环 | `Sim.step()` 的统一 `n`、网格重排和交替约束 | 已确认 |
| 支持表面张力和 XSPH | `normalsWGSL`、`tensionWGSL`、`xsphWGSL` | 已确认 |
| 支持多种表面路径 | `SurfaceMesh`、`RayMarch`、`FluidSSFR` | 已确认 |
| 支持交互与参数导入 | `main.js` 指针、倒水、拖拽、INI 映射 | 已确认 |

## 运行时证据

验证环境：Windows、Google Chrome `151.0.7922.170`、硬件加速 WebGPU 会话、本地 HTTP。

- [x] WebGPU adapter/device 创建成功。
- [x] compute/render pipeline 无阻断错误。
- [x] 画布持续输出非空流体画面。
- [x] `verify=1` 写出 `window.__done=true`，且 `nonFinite=0`。
- [x] 使用场景已分为 5 个问题入口；particle、mesh、SSFR 和 100K 归入研究诊断。
- [x] 五个应用场景、十个 variant 全部完成自动 A/B；目标/实际 solver steps 严格相等，`strictPassed=true`。
- [x] 六阶段历史严格为 `prepare → a-run → a-freeze → b-run → b-freeze → complete`。
- [x] 来水侧与远侧区域计数之和始终等于总流体粒子数。
- [x] particle、mesh、SSFR 三种视图在同一实验台成功重建。
- [x] 父级场景切换器可以重建引擎并保留全屏入口。
- [x] 390×844 视口可完成应用场景展示；时间线不滚动，A/B/Δ 三列均位于指标卡内，无页面级横向溢出。
- [x] 100k 场景能创建 pipeline 与画布，无 GPU/page/console 错误。
- [x] 完整浏览器回归 `failed=[]`，`consoleErrors=[]`，`pageErrors=[]`。

五场景最终自动回归：

| 场景 | A/B solver steps | 固定输入 | 冻结时内部趋势 |
| --- | ---: | ---: | --- |
| 浮具与载荷 | 180 / 180 | 0 / 0 | 轻载/重载刚体中心 Y `0.17037u / 0.08969u` |
| 可变容积水箱 | 144 / 144 | 0 / 0 | boxX `1.80u / 1.08u`；全局 P95 `0.25425u / 0.31379u` |
| 液柱与成滴 | 162 / 162 | 900 / 900 | P95−P05 展开 `0.42820u / 0.18715u` |
| 互动清障 | 144 / 144 | 3,000 / 3,000 | 双方均 33,000 流体粒子；B 三刚体位移代理 `0.74527u` |
| 治水科普代理 | 144 / 144 | 3,000 / 3,000 | boxX `2.20u / 1.54u`；全局 P95 `0.25613u / 0.28805u` |

这些趋势是固定求解器内部回归，不是对现实载荷、材料、流量或防洪效果的验证。

内置 `verify=1` 原始结果：

```text
scanMonotonic=true
scanTotal=8000
n=8000
nonFinite=0
density=589.8..1016.6
predZeros=0
cpuNeighboursMax=34
```

视觉证据：

- [`assets/lab-desktop.png`](assets/lab-desktop.png)：桌面“浮具与载荷”轻载 A 条件及场景优先信息层级。
- [`assets/lab-dayu.png`](assets/lab-dayu.png)：整体收窄至 0.70× 并注水后的治水叙事代理 B。
- [`assets/lab-comparison.png`](assets/lab-comparison.png)：桌面浮具自动 A/B、六阶段时间线、180/180 步审计和差值结果。
- [`assets/lab-mobile-results.png`](assets/lab-mobile-results.png)：390×844 视口中的 A/B/Δ 指标卡、协议审计与判断边界。

## 性能边界

M6-WP1 在同一 Intel Gen-12LP 上分别用 Chrome 与 Edge 完成 28K/100K/300K × particles/SSFR 六项测试。每项均创建真实 WebGPU context、运行固定 solver ticks、读取位置缓冲并检查 `nonFinite=0`；两浏览器均为 6/6 operational、Gate 全部通过且无 console/page error。

实际 FPS 来自测试外层独立 `requestAnimationFrame` 墙钟计数。原页面把墙钟 `dt` 截断到 50 ms 后再累计 FPS，因此慢帧时仍显示约 20 FPS；下表不采用该显示值。

| 配置 | Chrome 实际 FPS | Edge 实际 FPS | Chrome sim GPU | Chrome render GPU | 结论 |
| --- | ---: | ---: | ---: | ---: | --- |
| 28K particles | 20.02 | 17.60 | 53.77 ms | 1.95 ms | demonstrable |
| 28K SSFR | 14.15 | 15.08 | 79.67 ms | 14.55 ms | demonstrable |
| 100K particles | 2.86 | 2.95 | 341.94 ms | 4.98 ms | not practical |
| 100K SSFR | 2.05 | 2.34 | 458.35 ms | 54.03 ms | not practical |
| 300K particles | 0.88 | 0.90 | 1180.02 ms | 10.71 ms | not practical |
| 300K SSFR | 0.67 | 0.66 | 1522.40 ms | 144.52 ms | not practical |

28K 生命周期 Gate 在 Chrome/Edge 均为 19/19：两次 Reset 后分别运行 120 ticks，粒子计数稳定、位置与统计均为有限值、iframe unload 和 disposed guard 有效。Adapter 明确报告 `gpuDeviceDisposal=false`，所以当前没有显式 GPU 资源销毁契约。

原始证据：[`assets/performance-compatibility-chrome.json`](assets/performance-compatibility-chrome.json)、[`assets/performance-compatibility-edge.json`](assets/performance-compatibility-edge.json)、[`assets/runtime-stability-chrome.json`](assets/runtime-stability-chrome.json)、[`assets/runtime-stability-edge.json`](assets/runtime-stability-edge.json)。

边界：这些结果只覆盖 Intel Gen-12LP 本机。RTX 未被浏览器选中，Safari/Apple 未验证；上游 Apple storage-buffer issue 继续作为风险记录，不能用 Chrome/Edge 成功推断其已解决。

## 失败与修复记录

1. 无头 Chrome 虽然暴露 `navigator.gpu`，但 `requestAdapter()` 返回空；上游页面显示 `WebGPU is present but the browser gave no adapter`。因此 WebGPU 运行证据改用实际硬件加速 Chrome 会话。
2. 第一版 390px 外壳因横向场景列表的 min-content 宽度导致文档宽达约 1614px；为 panel、nav、list 和 viewport 增加 `min-width:0`/overflow 边界后，自动检查 `horizontalOverflow=false`。
3. 一次回归在同时保留实验台页面并新开 verify 页面时超时；改为在同一页面导航到 verify，避免多个 WebGPU 页面争用资源，最终通过。
4. 场景层最初写入 `boxx=0.62/0.72`，但上游滑杆步长为 0.05，浏览器实际量化为 0.60/0.70；现已统一数据、文案和断言，避免展示无法执行的精度。
5. 第一版自动对照结果表在 390px 视口需要横向滚动；移动布局现按每个指标显示 A、B、Δ 三列卡片，保留语义表格且让差异同时可见。
6. 模拟秒轮询会在慢帧中越过终点；当前外层按上游 `stepDt=(1/60)/substeps` 临时包装实例 `sim.step()`，最终五场景均达到精确整数步。

## 自动协议的证据边界

- 自动对照以实际 `simTime` 计算 solver-step 进度，并封顶 180/144/162 步；不依赖墙钟等待决定终点或注入量。
- 每个 variant 都从新 iframe 启动，并在 Reset 前后清空 `timeBank` / `lastAdvanced`；边界在 step 0 前到位，运行时 iframe 输入被锁定。
- 早期 U1 页面协议只能提供“精确终点 solver steps”；M3-WP2 的 Adapter 调度器已补上中间 tick 注入与采样，但边界和施力事件仍属于后续工作包。
- 粒子位置与刚体 mask 只在冻结点读取一次；30K 级快照约 1MB，不执行逐帧 GPU→CPU 回读。
- 两半区按实际 `boxX/2` 划分；计数、占比和 P95 差描述冻结时粒子空间分布，不是累计过线或工程流量。
- P95、扩散、位移、最大速度均为 solver-unit 代理。最大速度来自上游全局统计，混合流体与刚体。
- 当前封闭箱体没有开放出口，整体 X 收窄不能被解释成真实闸门、河道过流或洪水风险模型。

## 已知外部证据

- 上游 issue #1 报告部分 Apple GPU 在 Chrome/Dawn 下 `maxStorageBuffersPerShaderStage=10`，原 scatter pipeline 需要 12。
- 上游 PR #5 提出拆分 scatter 的兼容修复，但固定版本未合入。
- 上游 issue #4 的 M3 Pro 报告显示模拟和渲染成本相近，只有 small 达到较好的交互性；因此本实验台默认从 small 启动。

## Runtime Adapter v1 等价证据

验证环境：Windows、Headless Chrome 151、本地 HTTP、WebGPU adapter `intel gen-12lp`。Chrome CDP 报告 Intel UHD Graphics、驱动 `32.0.101.6790` 且 `webgpu=enabled`；浏览器实际创建 `webgpu` canvas context、compute/render pipeline 和 GPU device，不是无 GPU 的静态测试。设备同时存在 RTX 4070，但本轮不声称覆盖该 GPU。

协议：原页面与 Adapter 分别加载全新页面，使用同一 small query、28,000 流体粒子、一个 341 粒子的轻载 sphere，各自暂停、Reset、清空时间余量并推进 24 个 solver ticks，再从原库 `livePos()` / `liveBody()` 读取冻结缓冲。

结果：

- 34 / 34 检查通过；`consoleErrors=[]`、`pageErrors=[]`。
- 两侧均为 28,341 总粒子、28,000 流体粒子、341 刚体粒子。
- 两侧均精确推进 24 ticks，`simTime=0.2s`，`nonFinite=0`。
- 刚体中心逐项相同：`[0.75, 0.8193186, 0.5000002]`。
- 流体质心最大差约 `2.44 × 10⁻⁵ u`。
- 九个流体轴向分位数最大差约 `3.13 × 10⁻⁴ u`，低于 `5 × 10⁻⁴ u` 容差。
- 原页面和实验台均有可见 canvas、WebGPU context 与有效页面内容；实验台 9 个场景按钮和主线说明存在。

原始报告：[`assets/runtime-adapter-equivalence.json`](assets/runtime-adapter-equivalence.json)。视觉证据：[`assets/runtime-adapter-direct.png`](assets/runtime-adapter-direct.png)、[`assets/runtime-adapter-lab.png`](assets/runtime-adapter-lab.png)。自动化脚本：[`tests/runtime-adapter-browser.cjs`](tests/runtime-adapter-browser.cjs)。

边界：本结果证明 Adapter 的固定 reset/step/sample 路径没有实质改变原库求解输出，不证明跨 GPU 逐位确定性，也不代表新增了流体物理能力。后续按总体计划先完成 M3 输入/事件模块，不由场景临时决定扩展路线。

## M3-WP1｜受控注入证据

`Particles4AllRuntimeAdapter.injectFluid()` 只负责校验输入、暂停运行时、调用原库 `Sim.appendFluid(pos, vel)`、等待 GPU 完成并返回请求/实际/容量计数。PBF、邻域搜索、刚体和渲染链没有复制或改写。

验证环境：Chrome 151、Intel Gen-12LP WebGPU、本地 HTTP。两次独立 Reset 后分别：

- 从 28,341 总粒子、28,000 流体粒子开始；
- 请求并实际注入 27 个流体粒子；
- 总粒子变为 28,368，流体粒子变为 28,027；
- 推进 12 solver ticks，`simTime=0.1s`；
- `nonFinite=0`，未触发容量截断；
- 第二次 Reset 恢复相同初始计数；
- 两次流体质心最大差约 `2.02 × 10⁻⁷ u`，P95 最大差约 `8.97 × 10⁻⁶ u`；
- 浏览器 Gate 28/28、接口测试 24/24，控制台与页面错误为空。

证据：[`assets/runtime-injection-gate.json`](assets/runtime-injection-gate.json)、[`assets/runtime-injection-gate.png`](assets/runtime-injection-gate.png)、[`tests/runtime-injection-browser.cjs`](tests/runtime-injection-browser.cjs)。

结论：M3-WP1 通过。该接口是对原库已有输入能力的受控暴露，不是新流体算法。计划状态自动迁移至 M3-WP2 整数 tick 事件队列。

## M3-WP2｜整数 tick 调度证据

`Particles4AllRuntimeAdapter.runSchedule()` 接收总 tick 数与可序列化事件数组，Reset 后以整数 tick 推进原库 `sim.step()`。当前事件类型限定为 `injectFluid` 和 `sample`；同一 tick 按配置输入顺序执行，并记录事件 id、tick、顺序、模拟时间与结果。

验证环境：Chrome 151、Intel Gen-12LP WebGPU、本地 HTTP。两次独立 Reset 均执行 12 ticks：

- tick 0 注入 8 粒子并采样，计数为 28,349；
- tick 6 先采样、再注入 8 粒子、再采样，计数按顺序从 28,349 变为 28,357；
- tick 12 最终采样，模拟时间为 0.1 秒；
- 两次运行事件历史一致，最终计数一致，质心差小于测试容差；
- 非有限位置为 0，WebGPU context 成立，控制台和页面错误均为空；
- 浏览器 Gate 26/26、Adapter 单元测试 38/38 通过。

证据：[`assets/runtime-schedule-gate.json`](assets/runtime-schedule-gate.json)、[`assets/runtime-schedule-gate.png`](assets/runtime-schedule-gate.png)、[`tests/runtime-schedule-browser.cjs`](tests/runtime-schedule-browser.cjs)。

结论：M3-WP2 通过。该调度器确定“何时调用原库能力”，不复制或替换 PBF/刚体算法。计划状态自动迁移至 M3-WP3 可序列化流体包生成器。

## M3-WP3｜可序列化流体包证据

`createFluidBlock()` 将 JSON 可表达的 `origin`、`counts`、`spacing` 和 `velocity` 配置展开为原库 `Sim.appendFluid()` 所需的 typed arrays。它只生成输入，不计算流体演化。

验证环境：Chrome 151、Intel Gen-12LP WebGPU、本地 HTTP。两次独立 Reset 均使用上游实际 `params.spacing=0.02` 生成 `3×2×2` 流体包：

- 配置可 JSON 往返，粒子数精确为 12，位置/速度数组各 36 个标量；
- 12 个位置全部唯一，spacing 与上游参数一致；
- 12 个粒子均由原库受控注入接受，未触发容量截断；
- 12 ticks 后非有限位置为 0，两次最终粒子数与质心在容差内一致；
- 浏览器 Gate 27/27、Adapter 单元测试 46/46 通过，控制台和页面错误均为空。

证据：[`assets/runtime-fluid-packet-gate.json`](assets/runtime-fluid-packet-gate.json)、[`assets/runtime-fluid-packet-gate.png`](assets/runtime-fluid-packet-gate.png)、[`tests/runtime-fluid-packet-browser.cjs`](tests/runtime-fluid-packet-browser.cjs)。

结论：M3-WP3 通过。流体包是原求解器输入模块，不是新的水体技术路线。计划状态自动迁移至 M3-WP4 刚体初态与交互事件。

## M3-WP4｜刚体初态与交互事件证据

Adapter 以 `sim.bodies` 建立稳定 `body-N` 身份，直接冻结读回原库 GPU `bodyCentre/bodyRot`，并把原生 `Sim.holdBody()` / `Sim.releaseBody()` 纳入整数 tick 事件队列。Shape Matching、碰撞响应和姿态更新仍全部发生在上游 compute pipeline。

验证环境：Chrome 151、Intel Gen-12LP WebGPU、本地 HTTP。两次独立 Reset 均执行 24 ticks：

- tick 0 记录 sphere `body-1` 初态并设置抓持目标；
- tick 12 刚体中心由 `[0.75, 0.82, 0.5]` 移至约 `[0.81738, 0.82475, 0.5]`，朝目标 `[0.83, 0.84, 0.5]` 移动；
- tick 12 释放前后同 tick 姿态一致，tick 24 后继续由原求解器演化；
- 身份、shape、初始中心和 3×3 rotation 契约稳定，全部姿态数值有限；
- 两次运行的事件顺序与中心轨迹在容差内一致，浏览器 Gate 41/41、Adapter 单元测试 60/60 通过；
- WebGPU context 成立，控制台和页面错误均为空。

证据：[`assets/runtime-rigid-events-gate.json`](assets/runtime-rigid-events-gate.json)、[`assets/runtime-rigid-events-gate.png`](assets/runtime-rigid-events-gate.png)、[`tests/runtime-rigid-events-browser.cjs`](tests/runtime-rigid-events-browser.cjs)。

结论：M3-WP4 与 G3 通过，M3 模块完成。计划状态自动迁移至 M5-S1 / G4，用能力模块验证真实局部液体—刚体差异。

## M5-S1｜落水池局部冲击证据

协议固定 28,000 初始流体粒子、`8×6×8` 流体包（384 粒子）、上游 spacing 0.02、初速度 `[0,-2.5,0]` 和 30 solver ticks。A 为纯水池；B 只增加一个原库 sphere（size 0.15、density 0.5），并重复 B 两次。

- 三次运行均实际注入 384 粒子，最终流体粒子均为 28,384，30 ticks 对应 0.25 秒；
- 三次非有限位置均为 0，WebGPU context 成立；
- B 的局部高位冲击区比 A 多 116 个流体粒子，Y-P95 高 0.003075 solver-unit；
- B 的 1,791 个刚体粒子形成稳定 sphere，中心产生约 0.416 solver-unit 位移；
- B 两次末态中心和水体指标在预设容差内一致；
- Gate 28/28 通过，控制台和页面错误均为空。

证据：[`assets/local-impact-gate.json`](assets/local-impact-gate.json)、[`assets/local-impact-gate.png`](assets/local-impact-gate.png)、[`tests/local-impact-browser.cjs`](tests/local-impact-browser.cjs)。

边界：刚体位移包含重力、池水和注入共同作用，未单独标定“冲击力”；证据能够支持局部交互视觉与可重复空间差异，不能换算真实水力学单位。

结论：M5-S1 与 G4 通过，Particles4All 的原 PBF + Shape Matching 链适合局部交互演示。上游仍只有整体封闭 box 边界，M4-WP1 因 M5-S2 闸门/喷流需求而启动缺口审计，复杂碰撞体尚未获准实现。

## M4-WP1｜局部边界缺口证据

源码和 Chrome/Intel WebGPU 运行探针共同证明：上游 `boundaryParticles()` 始终生成六面 shell；`boundary=0` 只把 WGSL uniform 中的 `nBoundary` 置零，而 `deltaWGSL` 仍无条件 clamp；`resizeBox()` 重建完整 shell 并重映射所有粒子。

运行时结果：`1.5×1×1` box 有 20,002 个边界样本，六面均有覆盖；关闭 boundary 后，16 个以 X=5 速度冲向右壁的粒子仍被限制在 X=1.49；缩至 `1.2×1×1` 后六面仍完整，所有流体被限制在新范围。探针 20/20 通过，无页面、控制台或非有限值错误。

证据：[`BOUNDARY_GAP_AUDIT.md`](BOUNDARY_GAP_AUDIT.md)、[`assets/boundary-capability-gate.json`](assets/boundary-capability-gate.json)、[`tests/boundary-capability-browser.cjs`](tests/boundary-capability-browser.cjs)。

结论：真实局部出口不能由现有 toggle/resize 表达，但 M5-S2 首个问题可收敛为封闭箱内部 box 闸门。M4-WP1 完成，不启动 WGSL 开放边界补丁或 M4-WP2；计划迁移至 M5-S2 / G5。

## M5-S2｜封闭箱内闸门与喷流证据

协议固定 28,000 初始流体、280 粒子横向喷流、相同 box Shape Matching 刚体、30 solver ticks 和 tick 15 释放。A 只把 box 放在流路外，B 放在流路内并重复两次。

- 三次最终流体数均为 28,280，非有限位置为 0；
- B 相比 A 上游 corridor 多 53 个粒子，横向宽度改变 -0.056171 solver-unit；
- B 两次上游计数为 65/63，下游计数均为 6；
- box 在释放前保持在声明容差，释放后两次末态中心在容差内一致；
- Gate 34/34 通过，WebGPU context 成立，页面和控制台无错误。

证据：[`GATE_JET_SLICE.md`](GATE_JET_SLICE.md)、[`assets/gate-jet-gate.json`](assets/gate-jet-gate.json)、[`tests/gate-jet-browser.cjs`](tests/gate-jet-browser.cjs)。

边界：这是封闭箱内部动态障碍造成的喷流偏转，不是局部开放边界或真实过闸流量。结论：M5-S2 和 G5 通过，同一 Adapter 模块已经支撑 M5-S1 与 M5-S2；计划迁移至 M5-S3 / G6。

## M5-S3｜容器倾倒可行性证据

源码表明 box/sphere 是体积填充，torus 是闭合圆环；刚体以单位旋转初始化，交互接口只能给质心设置平移速度目标。Chrome/Intel WebGPU 探针进一步得到：box/sphere 中心邻域各有 7 个刚体粒子，torus 中心为空但 Y 半厚度仅约 0.04；不存在 pose/rotation/static-collider 控制接口。Gate 23/23 通过。

证据：[`CONTAINER_SPILL_SLICE.md`](CONTAINER_SPILL_SLICE.md)、[`assets/container-feasibility-gate.json`](assets/container-feasibility-gate.json)、[`tests/container-feasibility-browser.cjs`](tests/container-feasibility-browser.cjs)。

结论：现有原库不能物理表达中空可倾倒容器。新增 cup rest cloud 在理论上可复用 Shape Matching，但完整结果还需要形状语法、任意初态、旋转驱动和三条 solid 渲染路径，属于高成本 fork。M5-S3 按停止规则完成，M4-WP2 不启动；计划迁移至 M6-WP1 性能与兼容性矩阵。
