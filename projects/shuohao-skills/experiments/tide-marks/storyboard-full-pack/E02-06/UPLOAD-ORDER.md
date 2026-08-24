# E02-06 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-06\f1.png` | 0.00s | 已存在 | 动作：许知遥快步走到货仓钢门前。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-06\f2.png` | 3.00s | 已存在 | 动作：她把黄铜钥匙插进新挂锁。；动作：钥匙无法转动。 | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-06\f3.png` | 6.50s | 已存在 | 许知遥：“锁是后来换的。”（迅速判断） | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E02-06\f4.png` | 8.50s | 已存在 | 动作：程野推开虚掩的侧门。 | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：11s
- ChatArt 建议时长：11s
- 预计成本：165 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**待验证**。这与“图片齐全”是两个不同结论。
- 入段 E02-05→E02-06（待链路验证）：上一段终态“许知遥抓起黄铜钥匙。；许知遥：“去货仓。现在。”（果断）”；本段起态“许知遥快步走到货仓钢门前。”。
- 入段契约：用明确离场/到达或建立镜交代场景变化，不把时空跳转伪装成同一秒连续动作。
- 出段 E02-06→E02-07（待链路验证）：本段必须完成“程野推开虚掩的侧门。”；不得提前执行下一段“两人进入昏暗货仓。”。
- 出段契约：两段共享同一扇半开侧门和同一人物站位；E02-06 终帧作为 E02-07 的连续性参考，锁定程野先推门、许知遥随后进入。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
