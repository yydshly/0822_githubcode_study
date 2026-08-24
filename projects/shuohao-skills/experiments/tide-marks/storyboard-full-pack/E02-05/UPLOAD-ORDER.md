# E02-05 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-05\f1.png` | 0.00s | 已存在 | 许知遥：“船牌呢？”（立刻追问） | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-05\f2.png` | 2.00s | 已存在 | 动作：程野松开椅背。；程野：“被我扔回水里了。”（负疚，句尾收短） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-05\f3.png` | 5.50s | 已存在 | 许知遥：“谁让你扔的？”（声音发硬）；动作：程野看向桌上的父亲旧照。 | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-05\f4.png` | 8.50s | 已存在 | 程野：“许叔。”（很轻） | 无 |
| 5 | @Image5 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-05\f5.png` | 10.50s | 已存在 | 动作：许知遥抓起黄铜钥匙。；许知遥：“去货仓。现在。”（果断） | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：14s
- ChatArt 建议时长：14s
- 预计成本：210 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**待验证**。这与“图片齐全”是两个不同结论。
- 入段 E02-04→E02-05（可按现有切点）：上一段终态“程野：“事故第二天，我捡到过半块船牌。”（停顿后承认）”；本段起态“许知遥：“船牌呢？”（立刻追问）”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E02-05→E02-06（待链路验证）：本段必须完成“许知遥抓起黄铜钥匙。；许知遥：“去货仓。现在。”（果断）”；不得提前执行下一段“许知遥快步走到货仓钢门前。”。
- 出段契约：用明确离场/到达或建立镜交代场景变化，不把时空跳转伪装成同一秒连续动作。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
