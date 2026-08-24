# E02-03 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-03\f1.png` | 0.00s | 已存在 | 许知遥：“不是船上的？”（迅速追问） | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-03\f2.png` | 2.00s | 已存在 | 动作：程野摇头。；程野：“每三十秒一次，我从小听到大。”（笃定） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-03\f3.png` | 6.00s | 已存在 | 动作：许知遥把两条时间写在同一张纸上。；许知遥：“哥哥那时还在岸上。”（压住激动） | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-03\f4.png` | 10.00s | 已存在 | 程野：“至少有一份记录是假的。”（简短，回避她的目光） | 无 |

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

- 本段状态：**可直连**。这与“图片齐全”是两个不同结论。
- 入段 E02-02→E02-03（可按现有切点）：上一段终态“程野：“这是货仓防潮报警器。”（确认，语气发沉）”；本段起态“许知遥：“不是船上的？”（迅速追问）”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E02-03→E02-04（可按现有切点）：本段必须完成“程野：“至少有一份记录是假的。”（简短，回避她的目光）”；不得提前执行下一段“许知遥注意到他的回避。；许知遥：“你还知道什么？”（冷下来）”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
