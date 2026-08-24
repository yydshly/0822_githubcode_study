# E02-01 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-01\f1.png` | 0.00s | 已存在 | 动作：程野收到许知遥连夜发来的报时片段和时间疑点后，带着事故记录快步推门进来，把记录压到滚动的报时波形旁。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-01\f2.png` | 3.00s | 已存在 | 程野：“官方写一点二十分离岸。”（低沉，直接进入正题） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-01\f3.png` | 6.00s | 已存在 | 动作：许知遥把电台录音拉回蜂鸣处。；许知遥：“这段报时在一点四十七。”（逐字核对） | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-01\f4.png` | 10.50s | 已存在 | 动作：她按下播放。 | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：13s
- ChatArt 建议时长：13s
- 预计成本：195 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**待验证**。这与“图片齐全”是两个不同结论。
- 入段 E01-10→E02-01（待链路验证）：上一段终态“黄铜钥匙随震动滑到未修复的波形屏下。”；本段起态“程野收到许知遥连夜发来的报时片段和时间疑点后，带着事故记录快步推门进来，把记录压到滚动的报时波形旁。”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E02-01→E02-02（可按现有切点）：本段必须完成“她按下播放。”；不得提前执行下一段“许潮：“七月十九，一点四十七。”（录音，远而破碎）”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
