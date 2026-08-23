# MiniMax 现有旁白的离线 ASR 与管线代理实验

## 输入

- 工作区已有的 54.365 秒 MiniMax 中文旁白；本实验没有再次请求 MiniMax API。

## 输出

- `captions.json` / `captions.srt`：faster-whisper base 结果；
- `captions-medium.json` / `captions-medium.srt`：faster-whisper medium 结果；
- `mock-presenter.mp4`：使用 base 字幕的程序化代理视频；
- `mock-presenter-medium.mp4`：使用 medium 字幕的程序化代理视频；
- `preview-10s.png` / `preview-medium-10s.png`：两次结果的取帧证据。

## 结果

- base：25 段、173 个词时间，约 10.7 秒完成；中文错误较明显，例如“闭馆前”被识别成“必管前”。
- medium：15 段、172 个词时间，约 84 秒完成；同一位置正确识别为“闭馆前”，人物名和句意也明显改善。
- 程序化代理输出为 H.264 + AAC、540×960、24fps、54.365 秒，文件约 1.3 MB。

## 边界

视频嘴部开合只由音频 RMS 能量控制，不理解音素，也不跟踪真人面部。这是可重复的 L0 管线验证，不是数字人质量样片。
