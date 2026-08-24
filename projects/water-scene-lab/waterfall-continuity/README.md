# Waterfall Continuity Observable Effect

当前可见成果：使用同一个 Particles4All Runtime、相同 384 粒子、相同 `-2.5 u/s`、相同高密度 box 与 42 ticks，只改变发射时间，形成单次粒子团与分时连续落水的真实 A/B。

## 打开

```powershell
python -m http.server 8107 --directory docs
```

```text
http://127.0.0.1:8107/demos/water-scene-lab/waterfall-continuity/
```

点击“自动运行 A → B”。A 完成后画布停在单次注入最终状态；B 完成后画布停在分时注入最终状态，右侧同时保留两组实际数据。

## 当前结果

| 指标 | A：tick 0 × 384 | B：12 × 32，每 3 ticks |
| --- | ---: | ---: |
| 高位垂直占用 | 1 / 12 | 7 / 12 |
| 高位粒子 | 145 | 260 |
| 最高位置 | 0.282 u | 0.673 u |
| 粒子注入 | 384 / 384 | 384 / 384 |
| ticks | 42 / 42 | 42 / 42 |
| 非有限位置 | 0 | 0 |

B 的发射时间分布让观察时刻仍有粒子分布在更长的垂直区间，因此实际画面从落地后的粒子团变成了纵向粒子链。画面仍可看出离散脉冲，不等于连续表面水幕。

本次 B 的刚体基线差约为 `-0.00004 u`，因此只批准“时间连续性改善”，不批准“撞击增强”。

## 验证

```powershell
node projects/water-scene-lab/waterfall-continuity/tests/browser-ab.cjs
```

Chrome 151 桌面 WebGPU Gate 12/12。详见 [`EVIDENCE.md`](EVIDENCE.md)。
