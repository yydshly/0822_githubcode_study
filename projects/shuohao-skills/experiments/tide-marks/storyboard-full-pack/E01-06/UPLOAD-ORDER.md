# E01-06 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-06\f1.png` | 0.00s | 已存在 | 动作：她把右声道单独放大。；动作：一个模糊男声从噪声里露出半句。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-06\f2.png` | 3.00s | 已存在 | 许潮：“开船的……”（录音，急促喘息） | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-06\f3.png` | 5.50s | 已存在 | 动作：许知遥猛地按下暂停。 | 无 |
| 4 | @Image4 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-06\f4.png` | 8.00s | 已存在 | 许知遥：“这个声音……”（失神，尾音发紧） | 无 |

## 参数

- 模型：MiniMax H3
- 模式：全能模式
- 清晰度：768P
- 画幅：16:9
- 设计时长：10.5s
- ChatArt 建议时长：11s
- 预计成本：165 钻

## 粘贴提示词

复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。

## 段间衔接质量门

- 本段状态：**待验证**。这与“图片齐全”是两个不同结论。
- 入段 E01-05→E01-06（可按现有切点）：上一段终态“许知遥：“潮声太满，人声在下面。”（专注，自言自语）”；本段起态“她把右声道单独放大。；一个模糊男声从噪声里露出半句。”。
- 入段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 出段 E01-06→E01-07（待链路验证）：本段必须完成“许知遥：“这个声音……”（失神，尾音发紧）”；不得提前执行下一段“她从抽屉里取出一张兄妹旧照。；许知遥把旧照立在屏幕边。”。
- 出段契约：保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
