# E01-01 · ChatArt 导入顺序

必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。

| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | @Image1 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-01\f1.png` | 0.00s | 已存在 | 动作：许知遥刚从拆迁清点处领回父亲封存多年的旧物箱，抱着铁皮箱快步冲进候船厅，箱里反复漏出少年喘息。 | 无 |
| 2 | @Image2 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-01\f2.png` | 3.50s | 已存在 | 动作：她回身推紧候船厅的旧门。；动作：拆迁通知在售票窗上被风吹起。 | 无 |
| 3 | @Image3 | `E:\0822_codex_project\projects\shuohao-skills\experiments\tide-marks\storyboard-full-pack\E01-01\f3.png` | 7.00s | 已存在 | 许知遥：“连他的东西也等不到明天。”（低声，压着不满） | 无 |

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
- 入段：全片第一段，无上一段。
- 出段 E01-01→E01-02（待链路验证）：本段必须完成“许知遥：“连他的东西也等不到明天。”（低声，压着不满）”；不得提前执行下一段“许知遥把铁皮箱放到长椅上。；她掀开箱盖。”。
- 出段契约：重做 E01-01：明确门原本打开、关门完成、人物转身离开门口并朝长椅方向运动；用最终离门状态连接 E01-02。
- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。
