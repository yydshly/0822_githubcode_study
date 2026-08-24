# Watershed Slice v3

## 当前状态

`integration runtime evidence / T3 routing coupled`：Mountain Watershed 已把 River 有限库存、Waterfall 固定延迟在途体积包、有限容量 Pool、溢流、Floodplain 蓄水/边界出流和障碍改道放入同一个 60 Hz 状态循环。页面提供容量阈值与障碍路径两组独立单变量 A/B；质量档、视觉粒子和障碍表现不参与水量预算。

浏览器入口：[`docs/demos/water-scene-lab/watershed/`](../../../docs/demos/water-scene-lab/watershed/)

## 已实现

- 保留 7 节点、6 连接的 `mountain-watershed-graph-v0` T2 映射契约。
- 新增 `mountain-watershed-coupled-v1`：Source 每步补水，River 按 `Q·dt` 扣减有限库存，Waterfall 用固定延迟体积包保存飞行中水量，落点到时才沉积到 Pool。
- 新增 `mountain-watershed-overflow-v1`：Pool 容量固定为 1,710 m³；越过容量的体积进入 12 × 7 确定性优先蓄水格，并从 0.25 m³/s 固定洪泛边界流出。
- `mountain-watershed-overflow-v2` 增加开放路径/障碍改道模式。路径 A/B 均使用高来水且只改变 `floodplainRoutingMode`；B 将第 2 行中央 8 格设为不可蓄水障碍。
- 18 m 落差与 9.81 m/s² 重力决定 1.916 s 飞行时间、7.2 m 水平射程与 19.16 m/s 撞击速度。
- 20 秒 A/B 中，A/B 源输入均为 40 m³；River 分别排出 60/120 m³并剩余 220/160 m³；在途体积为 5.75/11.50 m³；Pool 累计接收 54.25/108.50 m³。
- A 最终 Pool 为 1,684.25 m³且不溢流；B 在第 712 tick（约 11.87 s）首次溢流，最终 Pool 被容量限制在 1,710 m³，累计溢流 28.50 m³，Floodplain 蓄水 26.4625 m³、边界流出 2.0375 m³并湿润 24/84 格。
- 障碍路径 A/B 的上游、Pool、累计溢流 28.50 m³、Floodplain 蓄水 26.4625 m³和边界流出完全相同；开放路径湿润 24 格、平均横向距离 5.60 m、最远到第 3 行，障碍路径湿润 25 格、平均横向距离 8.88 m、最远到第 4 行。
- Pool 最终上升 0.010/0.071 m；River、在途、Pool、Floodplain 与全部外部输入/输出的全局预算残差低于 `2 × 10⁻¹⁰ m³`，最大单步残差低于 `5 × 10⁻¹³ m³`。
- 瀑布视觉分成连续水幕、模型在途水滴、撞击泡沫、涟漪与雾沫；四种镜头覆盖全水系、全落差、撞击区和洪泛区。
- 撞击表现读取实际沉积状态，关闭泡沫/雾、降低粒子采样或切换质量档不会改变 River、在途体积或 Pool 水量。
- 桌面同屏 A/B；移动端同一画布切换 A/B；WebGL 不可用时进入显式回退页。

## 运行与验证

从仓库根目录启动静态服务器后访问：

```text
/demos/water-scene-lab/watershed/
```

```powershell
node projects/water-scene-lab/watershed-slice/tests/model-test.mjs
node projects/water-scene-lab/watershed-slice/tests/coupled-model-test.mjs
node projects/water-scene-lab/watershed-slice/tests/overflow-model-test.mjs
node projects/water-scene-lab/watershed-slice/tests/floodplain-routing-test.mjs
node projects/water-scene-lab/watershed-slice/tests/browser-smoke.cjs
node projects/water-scene-lab/watershed-slice/tests/performance-benchmark.cjs
```

当前结果：

- T2 映射模型 23 / 23、T3 耦合模型 24 / 24、T3 溢流模型 26 / 26、障碍路由模型 26 / 26 检查通过；
- Chromium 151 的阈值桌面/移动/reduced-motion、障碍路径桌面/移动与强制 fallback 功能检查通过；
- 两个正常视口均无横向溢出、控制台错误、页面异常或失败请求；
- 默认全水系远景继续使用视觉 LOD；加入实例化障碍层后，阈值桌面为 56 calls / 38,464 triangles，移动端为 28 / 14,576。仍低于 T2 初始桌面 60 calls，但几何量高于此前 v2 洪泛基线。
- SwiftShader 固定 60 帧只作为结构诊断：移动 P95 为 68.575 ms；桌面 P95 受共享软件渲染调度影响为 192.745 ms，不外推为真实 GPU 性能承诺。

原始结果：

- [`assets/watershed-model-test-results.json`](assets/watershed-model-test-results.json)
- [`assets/watershed-coupled-model-test-results.json`](assets/watershed-coupled-model-test-results.json)
- [`assets/watershed-overflow-model-test-results.json`](assets/watershed-overflow-model-test-results.json)
- [`assets/watershed-floodplain-routing-test-results.json`](assets/watershed-floodplain-routing-test-results.json)
- [`assets/watershed-browser-results.json`](assets/watershed-browser-results.json)
- [`assets/watershed-performance-baseline-t2.json`](assets/watershed-performance-baseline-t2.json)
- [`assets/watershed-performance-optimized-t3.json`](assets/watershed-performance-optimized-t3.json)
- [`assets/watershed-performance-overflow-t3.json`](assets/watershed-performance-overflow-t3.json)
- [`assets/watershed-performance-routing-t3.json`](assets/watershed-performance-routing-t3.json)
- [`assets/watershed-desktop.png`](assets/watershed-desktop.png)
- [`assets/watershed-impact-desktop.png`](assets/watershed-impact-desktop.png)
- [`assets/watershed-floodplain-desktop.png`](assets/watershed-floodplain-desktop.png)
- [`assets/watershed-barrier-desktop.png`](assets/watershed-barrier-desktop.png)
- [`assets/watershed-barrier-mobile.png`](assets/watershed-barrier-mobile.png)
- [`assets/watershed-mobile.png`](assets/watershed-mobile.png)
- [`assets/watershed-mobile-reduce.png`](assets/watershed-mobile-reduce.png)

## 当前真实性边界

当前 T3 只证明这条固定山地水系中的局部质量闭环和确定性空间路由：库存、固定延迟运输、解析落点沉积、Pool 容量、溢流、优先蓄水、障碍绕行和固定边界收支可审计。障碍改变的是蓄水优先级，不计算压力、流速或格间动量；洪泛格没有求解浅水方程，也没有现实数据校准，因此不属于 T4 或工程水文结果。

下一阶段增加随时间变化的暴雨过程线和闸坝失效输入，检查静态优先路由是否无法表达传播速度与回水；只有出现明确缺口时才升级浅水方程。只有当落水池近景必须支持刚体排水或复杂自由液面时，才为该局部区域评估 Particles4All 适配。
