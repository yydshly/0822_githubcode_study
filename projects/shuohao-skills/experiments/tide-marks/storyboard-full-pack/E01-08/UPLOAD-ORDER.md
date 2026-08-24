# E01-08 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-08\f1.png` | 0.00s | 已存在 | 动作：许知遥攥紧耳机线。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-08\f2.png` | 2.50s | 已存在 | 许知遥：“再说一遍。”（压住颤抖） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-08\f3.png` | 4.50s | 已存在 | 动作：她提高人声频段。；动作：波形里的最后两个音节变得清楚。 | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-08\f4.png` | 8.00s | 已存在 | 许潮：“是高嵩。”（录音，清楚而急迫） | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：10s
- ChatArt 建议时长：10s
- 预计成本：150 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**可直连**。这与“图片齐全”是两个不同结论。
- 入段 E01-07→E01-08（可按现有切点）：上一段终态“许潮：“开船的不是爸。”（录音，气息短促）”；本段起态“许知遥攥紧耳机线。”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E01-08→E01-09（可按现有切点）：本段必须完成“许潮：“是高嵩。”（录音，清楚而急迫）”；不得提前执行下一段“许知遥摘下耳机站起来。”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
