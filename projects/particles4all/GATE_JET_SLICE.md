# M5-S2｜封闭箱内闸门与喷流切片

状态：`completed / Gate 34/34`；依赖 M4-WP1 已完成。控制状态以 [`program-state.json`](program-state.json) 为准。

## 目标

验证 M3 已完成的流体包、整数 tick 调度、刚体事件与采样模块能否复用于第二个场景：固定喷流遇到原库 box Shape Matching 刚体时，水体路径与刚体响应是否形成可重复差异。

本切片是封闭箱内部交互，不宣称开放闸门、河道过流或工程流量。

## 受控协议

```text
同一 small pool
→ 同一可序列化喷流包
→ 同一 box 刚体
→ A：box 保持在喷流路径外
→ B：box 在喷流路径内保持，指定 tick 后释放
→ 同一 solver ticks 冻结采样
```

唯一主要变量是 box 的受控位置/释放事件。PBF、spacing、重力、密度、迭代、渲染路径和喷流输入保持一致。

## 验收指标

- 输入粒子数、最终流体数和实际 tick 一致；
- `nonFinite=0`；
- 上游/下游空间计数或横向展开形成预设阈值以上差异；
- box 中心/旋转在事件前后可追踪；
- B 重放后的水体聚合和刚体末态在容差内一致；
- 同一 Adapter 模块在 M5-S1 与 M5-S2 均无专用求解器分支；
- Chrome WebGPU、页面和控制台检查通过。

## 停止与升级条件

- box 粒子形状无法形成稳定、可解释的阻挡；
- 必须用不可审计的高密度或极端参数才能保持闸门；
- 需要真实质量流出计算域才能回答场景问题。

只有第三项成立时才提出开放边界新工作包；不会在本切片内临时修改 WGSL clamp。

## Gate 结果

协议固定 28,000 初始流体、`5×7×8`（280 粒子）横向喷流、30 ticks 和 tick 15 释放。A/B 使用相同 density 1.35、size 0.18 的上游 box；A 初始位于流路外，B 位于流路内。

- 三次运行均注入 280 粒子，最终流体数 28,280，非有限位置为 0；
- B 相对 A 在上游 corridor 多保留 53 个粒子，横向宽度差约 -0.05617 solver-unit；
- B 两次上游计数为 65/63、下游均为 6，box 末态与水体指标均在声明容差内；
- Chrome 151 / Intel Gen-12LP WebGPU Gate 34/34，通过且页面、控制台无错误。

证据：[`assets/gate-jet-gate.json`](assets/gate-jet-gate.json)、[`assets/gate-jet-gate.png`](assets/gate-jet-gate.png)、[`tests/gate-jet-browser.cjs`](tests/gate-jet-browser.cjs)。这是封闭箱内喷流偏转证据，不代表开放闸门流量。
