# Waterfall Continuity｜Observable Effect Experiment

## 宏观目标

用 Particles4All 原有粒子注入、PBF、Shape Matching 和确定性步进，验证“同样水量分时进入”能否比“一次性粒子团”形成更接近连续落水的可见垂直水带。

## 固定 A/B

| 条件 | A：单次冲击 | B：分时连续落水 |
| --- | --- | --- |
| Runtime | 同一个 Particles4All engine | 同一个 Particles4All engine |
| 原生刚体 | box / density 2.2 / size 0.15 | 相同 |
| 总注入粒子 | 384 | 384 |
| 局部速度 | (0, -2.5, 0) u/s | 相同 |
| 总步数 | 42 ticks | 42 ticks |
| 发射时间 | tick 0 一次注入 384 | tick 0–33、每 3 ticks 一次，共 12 次、每次 32 |
| 唯一变量 | 发射时间分布 | 发射时间分布 |

## 实际效果输出

1. 真实 WebGPU Particles4All 画布中的 A、B 最终状态；
2. 高位交互柱中 12 个垂直分箱的占用数量；
3. 高位交互柱中的流体粒子数与最高位置；
4. 原生高密度 box 的相对基线向下响应；
5. 粒子数、ticks、有限值、WebGPU 与 body profile Gate；
6. A/B 桌面截图和机器可读浏览器结果。

## 验收

- A/B 均注入 384 粒子并执行 42 ticks，非有限位置为 0，原生刚体 profile 与绝对位移响应有效；
- 两次运行使用同一 Runtime，`runtimeSlots=1`；
- B 的高位垂直占用分箱数必须高于 A；
- B 的高位流体最高位置必须高于 A；
- 页面必须明确说明这是内部 solver 单位下的时间调度效果，不是现实流量或 CFD；
- Chrome 桌面 1440×1000 无横向溢出、控制台错误、页面异常或失败请求；
- 没有实际画面、A/B 数值与截图，不得标记研究完成。

## 边界

本实验不增加新求解器、不修改 PBF/Shape Matching、不声称连续介质水幕或现实瀑布标定。若 B 仍表现为离散粒子串，结论应记录为“时间连续性改善，但表面连续性仍缺失”，并把表面重建/雾沫表现列为后续能力缺口。

连续性 Gate 与撞击增量结论分离：B 即使提高垂直覆盖，也不能在基线差未为正时宣称冲击增强。
