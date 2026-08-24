# 复现证据

## 固定环境

- 上游提交：`0e5eb688ebf1b45e45c9bec31543aaa59e67c7bc`
- Node.js：`v22.15.0`
- 验证日期：2026-08-23

## 自测

| 模块 | 结果 |
| --- | ---: |
| novel-outline | 249/249 |
| novel-characters | 355/355 |
| novel-art | 158/158 |
| novel-script | 154/154 |
| novel-storyboard | 254/254 |
| 合成报告 | 92/92 |
| 合计 | 1,262/1,262 |

## 《渡口》夹具校验

```text
✓ 大纲通过校验（stage=full）
⚠️ 角色夹具未附原文参数，跳过逐字引文校验
✓ 4 个角色通过校验（lang=zh, style=realistic）
✓ 3 个场景 + 2 件道具通过校验（style=realistic）
✓ 6 集 / 9 场 / 123 句台词通过校验（预估 652.1s / 目标 720s）
✓ 1 集 / 10 段 / 34 个分镜通过校验（119s / 目标 120s / 2 个生成批次）
```

## 报告生成与视觉检查

`scripts/report.mjs` 成功合成五个面板，输出 [`docs/demos/shuohao-skills/index.html`](../../docs/demos/shuohao-skills/index.html)，文件约 586 KiB。Microsoft Edge 无头模式以 1440×900 加载本地报告并生成：

- [大纲面板截图](../../docs/demos/shuohao-skills/assets/outline.png)
- [分镜面板截图](../../docs/demos/shuohao-skills/assets/storyboard.png)

截图确认导航、质量门、KPI、时间轴、分集卡片和分镜提示词区域能够渲染。

## 《潮痕》原创盲测

| 阶段 | 结果 |
| --- | --- |
| 大纲 | 6 集；14/14 门通过 |
| 角色 | 5 人全部通过；逐字引文对原文校验 |
| 美术 | 4 场景 + 3 道具；11/11 门通过 |
| 剧本 | 6 集 / 12 场 / 138 句；697.5s / 720s；10/10 门通过 |
| 分镜 | 第 1–2 集 / 20 段 / 71 镜；218s / 240s；全部适用门通过，shot-recipe 未挂载 |
| 生成图 | 2 角色 + 3 场景光照参考 + 2 道具 + 39 关键帧，共 46 张有效图 |
| 动态分镜 | 35 镜按 manifest 切点组装；104.500s；1920×1080；24fps；H.264；无音轨 |

[动态分镜播放器验收截图](../../docs/demos/shuohao-skills/tide-marks/assets/animatic-report.png)确认本地 MP4、海报图、时长显示和能力边界说明均能在 Edge 中渲染。

第 2 集单独校验为 10 段、36 镜、113.5 秒；与第 1 集合并后为 2 集、20 段、71 镜、218 秒。E02-01 已生成 4/4 张关键帧，[多人分镜验收截图](../../docs/demos/shuohao-skills/tide-marks/assets/ep2-multichar-report.png)确认主图为许知遥与程野双人同框，子图包含单人正反打与双人证据对账。其余 32 张由第 2 集 manifest 明确列为缺失。

合并报告：[`docs/demos/shuohao-skills/tide-marks/index.html`](../../docs/demos/shuohao-skills/tide-marks/index.html)。40 张有效图已复制到报告目录，页面不依赖 `projects/` 下的相对资产。Microsoft Edge 无头模式已从 `#pane-storyboard` 加载报告；[验收截图](../../docs/demos/shuohao-skills/tide-marks/assets/full-storyboard-report.png)确认 KPI 为 10 段、35 镜，分镜缩略图正常渲染。

人工复核发现并修复一处校验盲区：S02 自由文本出现 P02 黄铜钥匙，但场次 props 和美术 relatedScenes 未登记。当前 refs 门核对结构化引用，不扫描自由文本中的道具语义。

扩展第 2 集时再次发现同类问题：S02 动作写“抓起黄铜钥匙”，该集场次 props 未登记 P02；美术 relatedScenes 已包含 S02。补齐剧本引用后重新 seed，单集与双集校验均通过。

## 最终扩展证据与失败样本

- 《潮痕》最终形成 6 集、59 段、193 镜、682 秒的结构化资料，原库五层 validate 全部通过。
- 逐镜图片文件达到 193/193；这只能证明图片层和目录状态完整。
- 增加 11 项故事逻辑审计与 58 个相邻段边界审计；这些是研究扩展和事后补救，不是原库能力。
- 真实视频文件 3/59；正式 QC 采用 0/59。
- 连续视频 E01-01 与 E01-02 暴露人物从“奔向门准备开门”回退为“返回原处打开盒子”，证明规格合法不等于行动因果和动态衔接成立。

最终机器可读结论见 [`experiments/tide-marks/offline-production/library-exploration-conclusion.json`](experiments/tide-marks/offline-production/library-exploration-conclusion.json)，修正版冻结归档见 [`experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/`](experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/)。

## 未形成且不再继续的证据

- 未执行无 Skill 基线、跨模型、跨题材或多人盲评，不能量化 skill 对叙事质量的提升。
- 未生成完整 TTS、音效、混音、剪辑或最终成片。
- 本研究已经触发停止条件：在补齐小说原型、全剧因果和短剧改编质量门以前，不再扩大视频样本。
