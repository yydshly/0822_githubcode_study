# E03-08 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-08\f1.png` | 0.00s | 已存在 | 动作：许知遥的手停在播放键上。；许知遥：“他在货仓。”（确认事实，气息发紧） | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-08\f2.png` | 3.50s | 已存在 | 程野：“所以他不可能开船。”（立刻接上证据链） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-08\f3.png` | 6.50s | 已存在 | 动作：录音里传来铁门撞击声。；许德海：“不能开船！”（录音远声，粗哑用力） | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-08\f4.png` | 10.00s | 已存在 | 许潮：“爸咬着正钥匙，抱着栏杆。”（录音，急促喘息） | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：13.5s
- ChatArt 建议时长：14s
- 预计成本：210 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**可直连**。这与“图片齐全”是两个不同结论。
- 入段 E03-07→E03-08（可按现有切点）：上一段终态“许潮：“爸被他们按在货仓里。”（录音，压低声音）”；本段起态“许知遥的手停在播放键上。；许知遥：“他在货仓。”（确认事实，气息发紧）”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E03-08→E03-09（可按现有切点）：本段必须完成“许潮：“爸咬着正钥匙，抱着栏杆。”（录音，急促喘息）”；不得提前执行下一段“许知遥从修复台前站起来。；许知遥：“他签字，不等于他开船。”（克制而确定）”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
