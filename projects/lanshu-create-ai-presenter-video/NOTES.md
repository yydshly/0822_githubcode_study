# 实验记录

## 2026-08-23：固定上游与首轮静态审计

- 将上游以 Git submodule/gitlink 固定在 `04f6bceab888ad923e192fb02542eda06d1fdda8`。
- 上游当前只有一次提交；源码主体是 `SKILL.md`、三份流程参考、一个任务模板和三个脚本。
- 明确其定位是 Codex Skill/生产 SOP，而不是数字人推理引擎。
- 未发现 TTS、人物生成、口型、ASR 或剪辑供应商的可调用适配实现。

## 2026-08-23：无付费调用本地冒烟验证

环境：Windows、Python 3.10.11、FFmpeg/ffprobe 6.1.3；系统命令中无 Bash 与 `jq`，Git 自带 Bash 可用于语法检查。

结果：

- 两个 Python 文件可编译；`init_job.py --help` 正常。
- `preflight.py --help` 不提供标准帮助，而是把 `--help` 当作任务清单路径，返回错误；其真实调用格式为 `python scripts/preflight.py <job.json>`。
- 以 FFmpeg 生成的 512×512 测试图初始化任务成功，任务状态为 `intake`，创建了 5 个一级目录。
- 首次预检按预期失败，失败项是 `image_viewed`、`single_clear_face`、`image_has_no_unwanted_text` 三项人工确认未完成；无声音样本时提示使用并记录库存音色。
- `finalize_delivery.sh` 通过 Bash 语法检查，但当前 Windows 环境缺少 `jq`，尚未进行成片交付端到端运行。

判断：安全闸门确实执行，但数字人生成部分仍完全依赖外部能力。

## 2026-08-23：无 H3 的本地闭环

- 新增只读能力探测器，确认 MiniMax TTS 密钥已配置但未调用，H3 未启用；FFmpeg/Pillow/faster-whisper 可用，MuseTalk 未安装。
- 发现本机已缓存 faster-whisper base、small、medium、large-v2，可完全离线运行 ASR。
- 使用工作区既有的 54.365 秒 MiniMax 中文旁白对比 base 与 medium：base 用时约 10.7 秒但中文错误明显；medium 用时约 84 秒，正确恢复“闭馆前”等内容，适合作为当前中文默认基线。
- 生成两条 540×960、24fps 的程序化主持人代理视频。嘴部由 RMS 音量驱动，只用于验证字幕、音频和 MP4 合成，不代表神经口型质量。
- 查阅 MiniMax 官方最新文档：T2A v2 已支持 `subtitle_type=word`；新旁白应直接保存原生词时间，减少 ASR 二次识别错误。
- 官方说明 H3 需要按量付费 API，视频套餐也暂不支持 H3；Token Plan 积分不能直接视为 H3 权限。
- 新增 MiniMax TTS 适配器：默认 dry-run，只显示字符数、正文哈希、脱敏配置状态和按量价估算；必须同时传入 `--execute --confirm-billable` 才可能发起请求。验证了缺少二次确认时进程退出且不会创建音频。
- 本机 GPU 为 RTX 4070 Laptop 8 GB，当前 Python 无 PyTorch。对照 MuseTalk 官方最低实测（Windows、RTX 3050 Ti 4 GB、fp16），硬件足够进行短片口型实验；安装需要单独环境、PyTorch/MMLab 和多组模型权重，属于下一阶段的大体积依赖操作。

## 2026-08-23：D-ID V2 单图头像基准

- 使用完全合成人物图和 11.4 秒 MiniMax 中文旁白创建 D-ID Talk，生成耗时 41.7 秒，消耗 1 积分。
- 技术链路通过，但试用水印、口型不自然、缺少手势和上半身表演，产品质量不通过。
- 判断：停止继续消耗 D-ID V2 积分，单图 talking-head 不满足本研究对数字人真实感的目标。

## 2026-08-23：HeyGen Digital Twin + Remote MCP 基准

- 通过 `https://mcp.heygen.com/mcp/v1` 完成 OAuth，不使用 API Key；安装 HeyGen 官方 `heygen-video` skill。
- 发现私人 Digital Twin `handapeng` 已训练完成，横屏 1280×720，支持 Avatar V/IV/III，并绑定私人中文声音。
- 使用 Video Agent 生成 12.16 秒、1280×720、25fps 的单镜头中文样片，从任务创建到完成约 4 分 05 秒。
- 人物稳定、声音、口型和上半身动作明显优于 D-ID；但全片几乎不眨眼。生成提示已经要求自然眨眼，仍未可靠执行。
- 用户确认训练素材本身有眨眼，因此本次问题不能简单归结为输入视频从未眨眼；更可能与动作参考采样、生成模型或短片 idle 状态有关。
- 判断：HeyGen 可以作为当前最佳 `main_presenter` 执行器，但仍必须保留微表情、眨眼、手势、口型和身份稳定的人工 QA。

## 阶段总结

- 上游仓库的核心意义是流程固化，而不是数字人算法。
- 单条视频追求最快效果时直接使用 HeyGen；需要批量、多语言、多渠道、多供应商、费用和授权审计时，再用本仓库组织生产。
- 推荐组合为 HeyGen Digital Twin + MiniMax/HeyGen Voice + 原生词时间/faster-whisper + FFmpeg/Remotion + 本仓库 QA。
