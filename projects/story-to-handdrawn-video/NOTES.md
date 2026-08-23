# 实验日志

## 2026-08-22

### 假设

目标仓库可能是一条以 Agent Skill 驱动、用 Remotion 合成手绘分镜的混合流水线，而不是直接生成连续视频的模型。

### 操作

- 在研究仓库建立 `codex/story-to-handdrawn-video-research` 分支；
- 浅克隆上游并固定 `fbab5b27`；
- 阅读 README、DESIGN、Skill、脚本、React/Remotion 组件、storyboard 和风格库；
- 安装锁定依赖并运行 TypeScript、风格目录、文本规划、上传图片和渲染测试；
- 用 FFprobe 检查实际 MP4。

### 结果与证据

- 证实核心是“静态图生成/导入 + FFmpeg 派层 + Remotion 确定性动画”；
- 文本 plan-only 和上传图片端到端路径可工作；
- 成功产出 720×960、30fps、H.264、2 秒静音预览；
- 干净克隆 `npm run check` 因缺失生成素材失败；
- Windows Python 包装器因 `npm` 可执行名失败；
- npm 安装报告 3 个 high severity 漏洞；
- 未消耗图片生成额度。

详细命令与结果见 [EVIDENCE.md](EVIDENCE.md)。

### 判断

原假设成立。项目最有价值的不是某个独特生成模型，而是把 Agent 规划、风格配方、内容寻址素材、FFmpeg 对齐层和 Remotion 时间轴组合成一条可审阅流水线。下一阶段应优先补可靠性、审片修订和音频对齐，而不是继续堆风格数量。

### 后续交付

- 将上游以 Git submodule 固定在 `upstream/`；
- 增加 GitHub Pages 交互演示，使用内联 SVG 诚实复现文字、黑白和彩色三阶段，不调用生成模型；
- 演示同时覆盖能力、原理、适用边界和扩展路线。
