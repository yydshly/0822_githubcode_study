# M6-WP1｜性能与兼容性矩阵

状态：`completed / bounded baseline`。目标是为最终 KEEP / PACKAGE / CONTRIBUTE / STOP 决策补齐工程证据，而不是增加新场景。

## 测试维度

| 维度 | 当前基线 | 待补证据 |
| --- | --- | --- |
| 粒子规模 | 28K / 100K / 300K 六项均完成 | 其他规模按产品预算再测 |
| 求解负载 | 固定 tick 墙钟与 GPU timing 已记录 | 需要专用 GPU 时另开设备矩阵 |
| 渲染路径 | particles / SSFR 同规模对照已完成 | mesh / ray 不属于本轮产品主路径 |
| 浏览器 | Chrome、Edge 已完成且趋势一致 | Safari 未验证 |
| GPU | Intel Gen-12LP 实测 | RTX 未被浏览器选中；Apple 未验证且有上游已知风险 |
| 运行接口 | 两浏览器 120 ticks × 2、Reset、dispose Gate 已完成 | 显式 GPU device disposal 缺失 |

## 首轮 Gate

- small、100K、300K 分别完成固定 tick 运行或给出明确失败原因；
- 记录实际 GPU adapter、WebGPU context、粒子数、tick、非有限值和墙钟时间；
- 不把单台设备结果外推到其他 GPU；
- 明确 interactive、demonstrable、not practical 三档；
- 控制台、页面和设备错误可追踪。

## 输出

测试结果将更新 M6-WP2 的组件化/上游贡献判断。性能不足不自动等于停止：需要区分求解器成本、渲染成本、浏览器限制和 Adapter 开销。

## 首轮结果

分类使用独立 `requestAnimationFrame` 墙钟计数，不使用原页面被 50 ms 截断的 FPS 显示值。

| 规模 / 路径 | Chrome 实际 FPS | Edge 实际 FPS | Chrome solver tick 墙钟 | 分类 |
| --- | ---: | ---: | ---: | --- |
| 28K particles | 20.02 | 17.60 | 30.07 ms | demonstrable |
| 28K SSFR | 14.15 | 15.08 | 33.49 ms | demonstrable |
| 100K particles | 2.86 | 2.95 | 100.26 ms | not practical |
| 100K SSFR | 2.05 | 2.34 | 109.19 ms | not practical |
| 300K particles | 0.88 | 0.90 | 146.25 ms | not practical |
| 300K SSFR | 0.67 | 0.66 | 295.78 ms | not practical |

Chrome 与 Edge 均为 Intel Gen-12LP，六项全部创建 WebGPU context、完成固定 ticks 且 `nonFinite=0`，无控制台或页面错误。数值仅表示本机一次受控基线，不外推到 RTX 或 Apple GPU。

生命周期 Gate 在两浏览器均为 19/19：两次 Reset 后分别运行 120 ticks，计数稳定、统计有限、iframe 可卸载且 disposed guard 生效。`gpuDeviceDisposal=false` 证明当前只是依赖页面卸载释放 GPU 资源，并无显式设备生命周期契约。

证据：

- [`assets/performance-compatibility-chrome.json`](assets/performance-compatibility-chrome.json)
- [`assets/performance-compatibility-edge.json`](assets/performance-compatibility-edge.json)
- [`assets/runtime-stability-chrome.json`](assets/runtime-stability-chrome.json)
- [`assets/runtime-stability-edge.json`](assets/runtime-stability-edge.json)
- [`tests/performance-compatibility-browser.cjs`](tests/performance-compatibility-browser.cjs)
- [`tests/runtime-stability-browser.cjs`](tests/runtime-stability-browser.cjs)

## 边界结论

1. 当前集成显卡上的产品预算应以约 28K 为上限，并接受“可演示但非 30 FPS 交互级”。
2. 100K/300K 证明原库能创建并执行 pipeline，不证明其在该设备上具备实时产品价值。
3. SSFR 的额外渲染成本随规模明显增加，但 100K/300K 首要瓶颈仍是求解器。
4. 原页面 FPS 使用截断后的模拟 `dt` 统计，慢帧时会稳定显示约 20 FPS；这是 M6-WP2 的小型上游修复候选。
5. RTX、Safari、Apple 和显式 GPU 释放均保留为覆盖空白，不用推测填充矩阵。
