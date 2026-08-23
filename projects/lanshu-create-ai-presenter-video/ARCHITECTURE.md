# 无 H3 的最小数字人研究架构

## 已确认的本机能力

| 槽位 | 当前实现 | 状态 |
| --- | --- | --- |
| `voice_generation` | 工作区现有 MiniMax `speech-2.8-hd` T2A v2 适配 | 已配置，第二阶段未再次付费调用 |
| `word_timestamp_asr` | `src/asr_faster_whisper.py` + 本地缓存模型 | 可离线运行，medium 中文明显优于 base |
| `timeline_compositor` | FFmpeg | 可运行 |
| `encoder_qa` | FFmpeg/ffprobe 核心检查 | 可运行；上游完整 shell 交付脚本仍缺 Bash/`jq` |
| `main_presenter` | `src/mock_presenter.py` | 仅程序化管线代理，不是真实数字人 |
| `lipsync_repair` | 未接入 | 当前最关键缺口 |

本机检测到 NVIDIA GeForce RTX 4070 Laptop GPU（8 GB VRAM，驱动 576.28，计算能力 8.9），但当前 Python 环境未安装 PyTorch。MuseTalk 官方仓库说明 Windows + RTX 3050 Ti 4 GB 可用 fp16 跑通，因此这台机器具备做短片本地推理的硬件条件；应建立独立 Python 3.10/CUDA 11.8 环境，避免污染现有研究项目。

## 推荐的三档实验

### L0：管线闭环

```text
MiniMax TTS/现有音频 → MiniMax 词时间或 faster-whisper → 程序化嘴部代理 → FFmpeg
```

用途：验证文件格式、时间轴、字幕、编码和 QA。不能评价人物真实感或口型准确率。

### L1：本地真实口型

```text
MiniMax TTS → 授权人物图 → MuseTalk 类本地模型 → MiniMax/Whisper 时间戳 → FFmpeg
```

用途：验证真实人脸嘴部驱动。GPU 显存、模型安装和素材授权是主要约束。

### L2：人物动作 + 口型修复

```text
人物图 → Hailuo 2.3/I2V 或其他动作视频 API
                      + MiniMax TTS
                              ↓
                     本地/外部口型修复
                              ↓
                       字幕、剪辑和 QA
```

用途：同时研究身份稳定、眨眼、头部与手势自然度。普通 I2V 负责动作，不应默认认为它能严格按旁白对嘴。

### L3：托管 Digital Twin 生产方案（当前推荐）

```text
脚本 → MiniMax TTS 或 HeyGen Voice
                    ↓
          HeyGen Digital Twin
                    ↓
       原生词时间 / faster-whisper
                    ↓
          FFmpeg / Remotion
                    ↓
   授权、成本、状态、恢复与交付 QA
```

用途：先用成熟托管模型获得当前可接受的人物、口型和上半身动作，再把字幕、B-roll、多尺寸输出和质量验收留在自己的生产链。HeyGen 是 `main_presenter` 执行器，不是整套系统；本仓库则作为供应商无关的控制层。

已完成的 HeyGen 样片显示这条路线明显优于 D-ID V2 单图头像，但仍出现整段几乎不眨眼的问题。训练素材中存在眨眼，提示词也明确要求自然眨眼，因此微表情必须作为独立 QA 指标，不能假定托管模型会稳定满足。

## H3 的位置

MiniMax H3 可以接收文字、图片、视频和音频参考，支持 4–15 秒、768P/2K 输出，但官方要求使用按量付费 API。它可以作为 L2 的候选生成器，却不应成为原型的硬依赖；即使使用 H3，也仍需做口型人工验收和必要的局部修复。

## 时间戳策略

MiniMax T2A v2 官方接口可将 `subtitle_type` 设为 `word`，直接返回词级时间戳。因此：

1. 新生成的 MiniMax 旁白优先使用 TTS 原生词时间，避免二次识别造成专有名词错误；
2. `faster-whisper` 用于旧音频、第三方音频和交叉验收；
3. base 模型仅用于快速冒烟，中文成片默认至少使用 medium；
4. 人名、数字和专有名词仍必须与原文比对。

## 安全与费用闸门

- 能力探测不发网络请求，也不输出密钥；
- H3 只有在单独配置按量付费 API Key、明确开启并批准试生成后才允许调用；
- TTS、人物图远程上传和声音克隆分别记录授权；
- 首个付费人物实验限制为 4–6 秒，并保留任务 ID、请求参数、费用证据和失败原因。
