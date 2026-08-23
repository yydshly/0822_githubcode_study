# 使用、部署与安全说明

## 1. 两种运行方式

### A. GitHub Pages：研究与静态演示

正式页面：

- `https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/`
- `https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/studio.html`

Pages 发布仓库的 `docs/` 目录，适合查看研究、播放已生成样片、填写简报、体验界面和导出本地规划。它不能运行 Node、MiniMax 私钥请求或 FFmpeg 长任务。远端生产台因此会明确停留在演示模式，不把静态结果冒充实时生成。

### B. 本地安全服务：真实全流程

先安装 Node.js、FFmpeg/FFprobe，并复制环境配置：

```powershell
Set-Location E:\0822_codex_project\projects\story-to-handdrawn-video
Copy-Item .env.example .env
```

只在本地 `.env` 中填写 MiniMax Token Plan Key，然后启动：

```powershell
node integrations\studio-server.mjs
```

浏览器打开：

```text
http://127.0.0.1:8789/demos/story-to-handdrawn-video/studio.html
```

如需其他端口，可在启动前设置 `STUDIO_PORT`；服务只允许绑定 `127.0.0.1` 或 `localhost`。健康检查为：

```text
http://127.0.0.1:8789/api/health
```

## 2. 真实生成顺序

1. 在研究页或生产台填写七项知识简报。
2. 选择自动或精制协作质量路线，并确认效果契约。
3. 明确点击生成方案；审核五幕结构。
4. 生成或替换每幕图片，必要时单幕重试；图片质量优先于声音自动化。
5. 选择 MiniMax 音色、情绪和语速并生成 TTS。
6. 选择 `standard`、`handdrawn` 或 `poetic`，设置比例并启动 FFmpeg 合成。
7. 在交付页直接播放本次 MP4，确认后下载视频和项目清单。

浏览器每次真实调用都需要用户动作；页面交接不会自动消耗额度。

## 3. 配置和密钥边界

- `.env`、`.env.*`、`generated-audio/` 和 `generated-studio/` 已被忽略；只有 `.env.example` 可提交。
- MiniMax Key 只能由 `studio-server.mjs` 读取，不进入 HTML、JavaScript、本地存储、项目导出或媒体清单。
- 不要把 Key 写进 GitHub Pages、URL、截图、日志或前端构建变量。GitHub Pages 是公开静态资源。
- 如果部署云端后端，把 Key 放入部署平台 Secret，并增加用户鉴权、速率限制、任务所有权与日志脱敏。
- 医学、法律、安全等高风险知识必须有人类专家审核来源、表述和发布版本。

提交前可执行：

```powershell
git check-ignore projects/story-to-handdrawn-video/.env
git diff --cached --name-only
git grep -n "MINIMAX_API_KEY=" -- ':!projects/story-to-handdrawn-video/.env.example'
```

最后一条应没有包含真实值的结果。

## 4. GitHub Pages 发布

工作流位于 [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml)，仅在 `main` 的 `docs/**` 发生变更时自动部署，也支持手动触发。

发布步骤：

1. 将研究分支推送到远端，保留独立研究历史。
2. 通过 fast-forward/PR 把已验证提交进入 `main`。
3. 等待 `Deploy research gallery to Pages` 工作流成功。
4. 分别以桌面和移动视口打开研究页、生产台。
5. 检查标题、导航、样片资源、横向溢出、控制台错误和静态/真实服务边界。

注意：只推送功能分支不会触发当前 Pages 工作流；必须进入 `main` 或手动运行工作流。

## 5. 验收命令

已有验证器位于 `integrations/verify-*.mjs`，证据输出位于 `browser-evidence/`。核心回归包括：

```powershell
node integrations\verify-studio-handoff.mjs
node integrations\verify-custom-project-purity.mjs
node integrations\verify-studio-preset-isolation.mjs
node integrations\verify-studio-voice-options.mjs
node integrations\verify-studio-service.mjs
```

`verify-studio-service.mjs` 使用受控 fixture/mock 验证协议、效果契约和真实媒体装载，不应在普通回归中消耗 MiniMax 额度。真实模型调用只在明确需要重新制作成片时进行。

## 6. 云端产品化所需能力

如果把静态研究原型升级为多人在线产品，至少需要：

- HTTPS API、登录与项目级权限；
- 异步队列、任务取消、重试和进度事件；
- 对象存储、签名 URL 和媒体生命周期；
- MiniMax/Codex/其他模型的版本、成本和质量路由；
- 内容来源、人工批准、生成记录和发布审计；
- FFmpeg 隔离执行、并发限制和资源监控。

这些是正式生产能力，不应通过在静态页面中暴露 API Key 来绕过。
