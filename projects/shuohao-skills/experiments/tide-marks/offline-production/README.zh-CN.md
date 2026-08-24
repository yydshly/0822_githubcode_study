# 《潮痕》离线预生产资料包

这个目录不需要视频生成工具。它把后期统一生成与拼接所需的信息先固定下来。

## 已生成内容

- `timelines/`：6 集逐镜剪辑时间线，包含设计时长、H3 兜底时长、首尾帧和裁切备注。
- `subtitles/`：6 集中文字幕草稿 SRT；时间来自分镜自动分配，配音后必须回校。
- `dialogue-cues.csv`：全剧配音台账，含人物、情绪和建议时间。
- `sound-music-cues.csv`：59 段环境声、拟音和音乐中文建议。
- `frame-qc-registry.csv`：193 张关键帧的存在状态、已知来源和逐张一致性结论。
- `IMAGE-QC-REPORT.zh-CN.md`：全部已生成图片的中文人工复核结论、返工清单与联系表入口。
- `continuity-audit.html`：58 个上一段尾帧与下一段首帧的并排审计、风险等级和修复契约。
- `video-production-control.html`：59 段视频批次、成本、状态和直达文件的中文控制页。
- `video-production-tracker.csv`：可持续填写且重建时保留状态的 59 段生成/QC/返工台账。
- `MASTER-EDIT-TIMELINE.csv`：跨 6 集的 193 镜统一剪辑时间线。
- `POST-PRODUCTION-OVERLAYS.csv` 与 `overlays/`：精确文字、屏幕跟踪和可选回执边界。
- 每段 `shot-video-prompts/`：逐镜视频生成兜底提示词。
- 每段 `SHOT-VIDEO-FALLBACK.zh-CN.md`：中文导入与裁切说明。

## 后期使用顺序

1. 先打开 `continuity-audit.html`，处理所有“阻断投产”的相邻接点；E01-01 v01 保留为失败证据。
2. 衔接修复后，按段使用 `storyboard-full-pack/E??-??/chatart-prompt.txt` 和严格上传顺序生成。
3. 每段生成后立即填写 `video-production-tracker.csv`，并连播上一段尾 2 秒与下一段首 2 秒；段内和接点都通过后才采用。
4. 只有失败段才改用 `shot-video-prompts/fN.txt` 逐镜生成；返工版本使用 v02、v03，禁止覆盖旧文件。
5. 按 `MASTER-EDIT-TIMELINE.csv` 回切到设计时长；不能直接把 H3 整数时长顺序拼接。
6. 导入 `subtitles/`，再根据最终配音波形校正字幕点；依据声音表和后期叠加表完成声音、文字跟踪与最终验收。

## 重要说明

字幕时间、声音建议和逐镜兜底提示词属于可执行初稿，不等于最终艺术审定。当前 193 张已生成图片已纳入统一人工 QC；通过与返工结果见 `IMAGE-QC-REPORT.zh-CN.md`。

