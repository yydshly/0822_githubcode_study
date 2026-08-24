# Waterfall Continuity Evidence

## 固定条件

- Particles4All 原有 PBF / Shape Matching / WebGPU Runtime；
- 原生 `box / density 2.2 / size 0.15`；
- 总粒子 384、速度 `(0, -2.5, 0) u/s`、42 ticks；
- A 一次注入 384；B 每 3 ticks 注入 32，共 12 次；
- 两次运行复用一个 iframe Runtime，`maxObservedRuntimeSlots=1`。

## 浏览器结果

Chrome `151.0.7922.170`、1440×1000、WebGPU：

- 12/12 Gate 通过；
- A：垂直占用 1/12，高位粒子 145，最高位置约 0.282 u；
- B：垂直占用 7/12，高位粒子 260，最高位置约 0.673 u；
- B 相对 A 增加 6 个垂直分箱，最高位置增加约 0.391 u；
- A/B 均 384/384 注入、42/42 ticks、非有限位置 0、WebGPU true；
- 页面横向溢出、console error、page error、failed request 均为 0。

原始结果：[`assets/browser-ab-results.json`](assets/browser-ab-results.json)。

实际画面：

- [`assets/single-pulse-desktop.png`](assets/single-pulse-desktop.png)
- [`assets/staged-cascade-desktop.png`](assets/staged-cascade-desktop.png)

## 有限结论

证据支持：原库的计划事件与直接粒子注入足以让同样水样在观察时刻形成更长的垂直落水分布，这是可见、可测的时间连续性改善。

证据不支持：连续表面水幕或更强撞击。本次 B 仍呈离散粒子脉冲，刚体相对基线响应约 `-0.00004 u`，不能宣称冲击增强。下一项研究应直接比较 Particles4All 原有 `particles / mesh / ssfr` 显示路径能否改善表面连续性。
