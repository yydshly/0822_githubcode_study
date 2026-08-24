# E03-07 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-07\f1.png` | 0.00s | 已存在 | 动作：许知遥抱着电台快步回到修复台前。；动作：她插入已经保存的原始副本。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-07\f2.png` | 3.50s | 已存在 | 许知遥：“蜂鸣之后还有人声。”（盯住波形） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-07\f3.png` | 6.50s | 已存在 | 动作：程野关上房门。；动作：许知遥提高蜂鸣后的低频人声。 | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E03-07\f4.png` | 10.00s | 已存在 | 许潮：“爸被他们按在货仓里。”（录音，压低声音） | 无 |

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
- 入段 E03-06→E03-07（待链路验证）：上一段终态“程野：“这不像普通磨损。”（低声确认）”；本段起态“许知遥抱着电台快步回到修复台前。；她插入已经保存的原始副本。”。
- 入段契约：用明确离场/到达或建立镜交代场景变化，不把时空跳转伪装成同一秒连续动作。
- 出段 E03-07→E03-08（可按现有切点）：本段必须完成“许潮：“爸被他们按在货仓里。”（录音，压低声音）”；不得提前执行下一段“许知遥的手停在播放键上。；许知遥：“他在货仓。”（确认事实，气息发紧）”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
