# 验证证据

## 环境

| 项 | 值 |
| --- | --- |
| 研究日期 | 2026-08-22 |
| 上游提交 | `fbab5b27f4f0db61739d86f78000a39eeaa692d3` |
| Node.js | `v22.15.0` |
| npm | `10.9.2` |
| Python | `3.10.11` |
| FFmpeg / FFprobe | `n6.1.3-20250831` |
| 操作系统 | Windows |

## E0：上游作为固定研究子项目

路径：`projects/story-to-handdrawn-video/upstream/`

方式：Git submodule，远端为 `https://github.com/gnipbao/story-to-handdrawn-video.git`，固定提交为 `fbab5b27f4f0db61739d86f78000a39eeaa692d3`。

支持判断：研究源码可以通过 `git submodule update --init --recursive` 精确复现；本仓库没有把第三方源码标记为自有代码。

## E1：锁定依赖安装

命令：

```powershell
npm ci
```

结果：成功安装 186 个包，共审计 187 个包。npm 同时报出 3 个 high severity 漏洞。研究未自动执行 `npm audit fix`，避免未归因升级改变上游锁定版本。

支持判断：项目依赖可在 Node 22 环境安装；依赖安全状态需要单独审计。

## E2：TypeScript 检查与干净克隆缺口

命令：

```powershell
npm run check
```

结果：`tsc --noEmit` 通过；随后 `validate-storyboard.mjs` 失败，因为仓库自带的 `storyboard.json` 和 `storyboard.uploaded.json` 引用未提交的 `public/assets/generated/**`。

支持判断：源码类型正确，但 README 中声称的干净克隆 `npm run check` 不能在固定提交上完整通过。基础结构校验和运行时素材存在性校验应拆分。

## E3：20 风格目录

命令：

```powershell
node scripts/list-handdrawn-styles.mjs
```

结果：退出码 0；确定性列出 v1 风格库的 20 个风格，默认值为 `colored-pencil-diary`，并给出每个示例路径。

支持判断：风格选择器和机器可读目录可独立工作，不需要网络或图片生成。

## E4：中文文本 plan-only 冒烟测试

命令：

```powershell
node scripts/story-to-video.mjs `
  --text "小雨停了。孩子推开窗，看见院子里有一道彩虹。" `
  --title "研究冒烟测试"
```

结果：退出码 0；拆成 2 个场景，生成 `storyboard.generated.json`、逐场 prompt 和 `codex-image-jobs.json`。没有调用图片接口。

支持判断：中文分句、字幕格式、默认风格解析、风格指纹、资产批次 hash、prompt/job manifest 生成路径可工作。

## E5：Windows Python 包装器失败

命令：

```powershell
python scripts/run_story_video.py --list-styles
```

结果：`FileNotFoundError: [WinError 2]`。包装器调用可执行名 `npm`，而本环境需要 `npm.cmd`。直接运行等价 Node/npm 命令成功。

支持判断：核心功能可运行，但 README 推荐的跨平台 Python 入口在本次 Windows 环境不兼容。

## E6：上传图片处理与结构校验

输入使用上游自带风格示例图，仅作为本地测试 fixture：

```powershell
node scripts/import-uploaded-pages.mjs `
  --image references/style-examples/01-colored-pencil-diary.png `
  --title "研究上传路径" `
  --layout full `
  --page-duration 2

node scripts/validate-storyboard.mjs storyboard.uploaded.json
```

结果：成功生成 1 个场景；FFmpeg 生成 1024×1024 适配图和彩色稿对应的灰度层；校验输出：

```text
✓ storyboard.uploaded.json · 1 scenes · 2.0s
✓ all storyboards valid · silent picture tracks
```

支持判断：上传图片、FFprobe 尺寸检测、FFmpeg 归一化/灰度派生、storyboard 写入和素材校验链路可工作。

## E7：Remotion 端到端预览渲染

命令：

```powershell
npm run render:uploaded:preview
```

结果：首次下载 Chrome Headless Shell 后，成功渲染 60 帧并编码为 `out/uploaded_picture_silent-preview.mp4`。

FFprobe 结果：

```json
{
  "codec_name": "h264",
  "width": 720,
  "height": 960,
  "r_frame_rate": "30/1",
  "duration": "2.000000",
  "size": "163636"
}
```

未发现音频 stream。

支持判断：上传图片到 Remotion/Chrome/H.264 的本地端到端最小链路已验证。

## 已验证与未验证矩阵

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| 依赖安装 | 已验证 | Node 22 / Windows |
| TypeScript 编译 | 已验证 | `tsc --noEmit` 通过 |
| 风格目录 | 已验证 | 20 种全部可列出 |
| 中文文本规划 | 已验证 | 2 句 → 2 场景 |
| Codex job manifest | 已验证 | 仅生成 manifest，不执行付费生成 |
| 上传图片导入 | 已验证 | 单图 full layout |
| FFmpeg 图层派生 | 已验证 | color + bw |
| Storyboard 校验 | 已验证 | 上传路径通过 |
| Remotion 预览渲染 | 已验证 | 720×960 H.264 静音 2 秒 |
| Codex Image2 job 自动执行 | 未验证 | 上游 manifest 路径仍需 Agent 执行，不等于已接成无人值守 API |
| Codex 内置 imagegen 整合 | 已验证 | 4 张家庭记忆 + 5 张知识白板 + 5 张儿童绘本 + 5 张悬疑木刻 + 5 张品牌水粉 + 5 张诗性水墨 + 5 张古诗夜色水墨 + 5 张古诗鲜明设色 + 5 张科技人文真实分镜 |
| MiniMax HTTP T2A 整合 | 已验证 | `speech-2.8-hd` 九套旁白；438 + 690 + 923 + 1466 + 1412 + 1007 + 774 + 805 + 1023 个计费字符；凭证仅运行时注入 |
| 最终有声样片 | 已验证 | 八类处方、十条 H.264/AAC 成片；古诗词含诗卷讲解、鲜明欣赏和夜色诗境三种展示目的 |
| 真实样片浏览器交互 | 已验证 | HTTP Range 与 file://；1440/768/390；五点跳转、播放、切换暂停和无脚本直链 |
| OpenAI API 实际生成 | 未验证 | 未提供/使用密钥 |
| 20 风格视觉还原度 | 未验证 | 需要批量图片生成和视觉评测 |
| 多页卷页质量 | 未验证 | 静态审计了实现，未做视觉验收 |
| 干净克隆 `npm run check` | 已确认失败 | 示例运行时素材缺失 |
| Python CLI on Windows | 已确认失败 | `npm`/`npm.cmd` 兼容问题 |

## E8：七类故事—效果真实整合验证

本研究扩展层没有修改上游 submodule，而是在研究页面中把同一“静态分镜 + 确定性合成”机制连接到七套不同的故事处方：

| 样片 | Codex 生图 | MiniMax TTS | 最终媒体 | 故事—效果验证点 |
| --- | --- | --- | --- | --- |
| 《未发生的团聚》 | 4 张淡彩人物分镜 + 1 次回环复用 | 438 字符，`female-chengshu`，calm | 54.333 秒 | 证据物件、人物伦理冲突、暖色回环 |
| 《记忆不是录像带》 | 5 张白板线稿 | 690 字符，`female-chengshu`，neutral | 77.333 秒 | 误区、模型、机制边界、证据、迁移 |
| 《她先学会听风》 | 5 张连续角色暖光绘本 | 923 字符，`female-tianmei`，calm | 107.267 秒 | 蛮力受挫、观察、主动改造、带痕成长 |
| 《封存之后，钟还在走》 | 5 张限色木刻档案分镜 | 1466 字符，`male-qn-jingying`，calm | 135.262 秒 | 异常、证据链、可信误导、理性翻转、责任收束 |
| 《把瑕疵留在正面》 | 5 张连续品牌水粉分镜 | 1412 字符，`Chinese (Mandarin)_Sincere_Adult`，calm | 134.000 秒 | 问题、选择、工艺、有限证据、责任返回 |
| 《潮水把名字还给岸》 | 5 张连续水墨留白分镜 | 1007 字符，`Chinese (Mandarin)_Lyrical_Voice`，calm | 127.633 秒 | 意象、记忆边界、公共便利、停止占有、允许变化 |
| 《枫桥夜泊》 | 5 张连续夜色水墨分镜 | 774 字符，`Chinese (Mandarin)_Lyrical_Voice`，calm | 116.300 秒 | 原文、天时、江岸、人物视角、远近空间、声音抵达 |

悬疑档案样片的最终 FFprobe 与响度结果：

```json
{
  "video": "h264 high / 720x960 / 30fps / yuv420p",
  "audio": "aac lc / 32000Hz / stereo",
  "duration": 135.262,
  "size": 11016434,
  "mean_volume": "-19.5 dBFS",
  "peak_volume": "-2.0 dBFS"
}
```

儿童成长样片的最终 FFprobe 结果：

```json
{
  "video": "h264 high / 720x960 / 30fps / yuv420p",
  "audio": "aac lc / 32000Hz / stereo",
  "duration": 107.266667,
  "size": 8409344,
  "mean_volume": "-19.5 dBFS",
  "peak_volume": "-3.3 dBFS"
}
```

品牌样片的最终媒体为 H.264/AAC、720×960、134.000 秒、9778826 bytes，平均 -20.0 dBFS、峰值 -1.8 dBFS；诗性样片为 H.264/AAC、1280×720、127.633 秒、6964188 bytes，平均 -21.8 dBFS、峰值 -3.0 dBFS。两条样片的五点视频抽帧、字幕和清单均通过人工检查。

浏览器终审覆盖 HTTP Range 与直接 `file://` 路由，以及 1440、768、390 三个宽度。品牌时间轴可跳至 52.15 秒，导演第五幕同步到 106.67 秒；诗性时间轴可跳至 76.04 秒，导演第五幕同步到 100.94 秒。两者互相切换时前一播放器暂停并隐藏；所有宽度均满足 `scrollWidth === bodyWidth`，没有 console、page 或 HTTP 错误。完成矩阵为 6 个 `REAL`、0 个 `RULE`；JavaScript 关闭时保留六条 MP4 直链。六个 MP4 初始 performance entry 均为 300-byte metadata 记录，没有完整预载媒体；仓库 secret scan 为 0。

## E9：故事输入—效果推荐产品闭环

Revision 11 在六套真实处方之上增加完全本地的可解释匹配器。它使用明确的叙事信号与结构权重，不调用生成模型；因此同一输入可重复得到同一结果，也能展示完整六路分数而非只给一个黑箱标签。六个内置输入的第一推荐与得分为：家庭记忆 88%、知识解释 96%、儿童成长 93%、悬疑档案 96%、品牌起源 96%、诗性独白 96%。每个结果同时返回命中信号、六项排序、五幕建议与该类型的主要风险。

浏览器自动验收覆盖 HTTP 1440×1000、768×1024、390×844，直接 `file://` 1280×900，以及 390×844 的 `prefers-reduced-motion: reduce`。五条 JavaScript 路线中，六个内置输入均命中预期第一推荐，每次均渲染 6 项排序和 5 个故事节拍；短输入会显示错误、禁用真实样片入口并把焦点送回文本框。品牌推荐 CTA 能同步导演台、第一幕与品牌播放器；随后从比较卡打开诗性样片会暂停隐藏品牌媒体。快速样例可用键盘触发且有实线焦点，6 张比较卡和 6 个真实媒体入口完整存在，各宽度均满足 `scrollWidth === bodyWidth`，无 console、page 或 HTTP 错误。JavaScript 关闭时保留静态选型规则和六条媒体直链；六个 MP4 仍只产生各 300-byte metadata 初始请求。

## E10：《枫桥夜泊》古诗词场景真实验证

Revision 12 将古诗词作为独立处方，而不是并入泛化的“诗性独白”。原诗四句被映射为天时、江岸、人物、空间和声音抵达五幕；画面只表现原文可支持的月、乌啼、霜感、江枫、渔火、客船与城外寺院，不补写“落第”等争议生平。5 张 16:9 水墨分镜由第一幕锚定同一客船、未眠旅人、桥与寺塔方向，人工检查未发现图中文字、水印或现代物件。

MiniMax 官方 HTTP T2A 使用 `speech-2.8-hd`、`Chinese (Mandarin)_Lyrical_Voice`、`calm`、0.92× 生成 5 段、774 个计费字符；Key 只通过私有 `MINIMAX_ENV_FILE` 读取。合成器依据五段真实音频时长计算 0、24.61、47.46、68.87、92.56 秒五个场景起点，生成低幅江水底噪和仅在终幕进入的钟声。第一次视频抽帧发现整段字幕过密，随后改为按句切分、按字符占比分配时长，并在中文标点处控制双行换行。

最终媒体检查结果：

```json
{
  "video": "h264 high / 1280x720 / 30fps / yuv420p",
  "audio": "aac lc / 32000Hz / stereo",
  "duration": 116.3,
  "size": 9265077,
  "mean_volume": "-18.6 dBFS",
  "peak_volume": "-2.6 dBFS"
}
```

浏览器终审覆盖 HTTP Range 1440×1000、768×1024、390×844 和直接 `file://` 1280×900。四条路线均加载 116.3 秒、1280×720 媒体；古诗词时间轴可跳至 92.56 秒，导演第四幕同步到 68.87 秒，播放时间实际推进，切换家庭记忆后古诗播放器暂停并隐藏。故事快速样例第一推荐为古诗词场景 92%，页面渲染 7 项排序、7 张比较卡、7 REAL 和 5 个古诗节拍；所有宽度满足 `scrollWidth === bodyWidth`，无 console、page 或 HTTP 错误。JavaScript 关闭时保留 7 条 MP4 直链；七条 MP4 初始均只产生 300-byte metadata 请求，未在首屏预载完整成片。

## E11：《忆江南》鲜明古诗词双样片验证

Revision 13 先记录《枫桥夜泊》古诗输出的墨灰基线，再以白居易《忆江南·江南好》验证“古诗词场景不等于暗淡水墨”。5 张约 16:9 分镜由第一幕锁定同一水乡、石拱桥、小舟、白墙黛瓦、花树和蓝绿衣回望者；其余四幕引用该锚点，分别强化熟悉感、日出金光、珊瑚红花与孔雀绿水的对照、离舟回望。人工检查未见图中文字、水印或现代物件，颜色鲜明但保留暖宣纸、水彩颗粒和空气透视。

MiniMax 官方 HTTP T2A 使用 `speech-2.8-hd`、`Chinese (Mandarin)_Lyrical_Voice`、`happy`、0.95× 生成五段旁白，共 805 个计费字符；Key 仅通过仓库外私有环境注入。FFmpeg 依据真实音频长度生成分句 ASS 字幕、低幅春水底声与两处克制鸟鸣。最终媒体为 H.264 High / AAC、1280×720、30fps、116.420 秒、14,616,425 bytes，平均响度 -18.0 dBFS、峰值 -2.7 dBFS；五幕起点为 0、26.53、47.82、71.03、93.28 秒，成片 contact sheet 的画面连续性和字幕可读性通过人工检查。

浏览器终审覆盖 HTTP Range 1440×1000、768×1024、390×844 与直接 `file://` 1280×900。四条路线中《忆江南》均为古诗词默认版本，亮色舞台计算背景为暖宣纸渐变；故事快速样例以 93% 正确推荐古诗词而不是泛化诗性独白。时间轴可跳至 71.03 秒，导演第五幕同步到 93.28 秒，播放时间实际推进；ArrowRight 可切换《枫桥夜泊》，两播放器互斥暂停。7 REAL、7 项排序、7 张比较卡和 2 个古诗版本完整；各视口 `scrollWidth === bodyWidth`，无 console、page 或 HTTP 错误。HTTP 下八条 MP4 初始请求均为 300-byte metadata；JavaScript 关闭时保留八条媒体直链，其中包括两条古诗词版本；文本 secret scan 为 0。

## E12：《忆江南》诗卷讲解展示验证

Revision 14 针对“全屏插画 + 底部字幕缺少讲解意境”的观察，将欣赏与教学拆成两个产物。新讲解版复用同一 5 张 Codex 连续分镜、805 字符 MiniMax 旁白和确定性环境声，没有重复调用图像或 TTS API。FFmpeg 把 16:9 画布改为左侧意象、右侧暖宣诗卷：标题、作者和完整原诗常驻；五幕分别高亮“江南好、旧曾谙、日出、红胜火/绿如蓝、能不忆江南”，同时更新关键词、释义与画面证据。讲解文字进入语义诗卷，不再烧录底部长字幕。

最终媒体为 H.264 High / AAC、1280×720、30fps、116.420 秒、7,591,258 bytes，平均响度 -18.0 dBFS、峰值 -2.7 dBFS。五点 contact sheet 验证原诗常驻、当前句状态、关键词、解释和意象图均正确；文字没有被画面或播放器控件遮挡。

浏览器终审覆盖 HTTP Range 1440×1000、768×1024、390×844 与直接 `file://` 1280×900。故事样例仍以古诗词为第一推荐，CTA 默认进入“诗卷讲解”；讲解时间轴可跳到 71.03 秒，导演第五幕同步 93.28 秒且播放推进。ArrowRight 依次切换明亮欣赏和夜色诗境，三播放器互斥暂停；7 REAL、3 个古诗状态、5 个讲解节拍完整。各视口 `scrollWidth === bodyWidth`，无 console、page 或 HTTP 错误；HTTP 下九条 MP4 初始均为 300-byte metadata，JavaScript 关闭时保留九条直链，文本 secret scan 为 0。

## E13：《停电以后，我看见了电》科技人文验证

Revision 15 将用户亲历的午夜停电做成第八类真实处方。叙事没有从发明家名单开始，而以空调、风扇和路由器同时沉默建立身体经验，再让制冷、通信、冷藏、泵与电梯等依赖显影。历史段严格区分 1800 年伏打电堆带来的连续电流研究、1831 年法拉第电磁感应，以及十九世纪八十年代实用照明、集中供电、配电和交流输电的系统化；“最伟大”保留为主人公观点，不把电或灯泡归于单一发明者。史实使用美国能源部和英国皇家研究院资料核验。

Codex 内置 imagegen 生成 5 张 16:9 连续画面：第 1、2、5 幕锁定同一现代人物、房间、风扇、窗户和路由器；第 3、4 幕只展示匿名实验之手、伏打电堆、环形线圈、发电机、配电装置与街区，没有名人肖像、生成文字或现代物件。MiniMax 官方 HTTP T2A 使用 `speech-2.8-hd`、`Chinese (Mandarin)_Sincere_Adult`、`neutral`、0.96× 生成五段旁白；原文 494 字符，API 计费用量 1023 字符，凭证只从仓库外 `MINIMAX_ENV_FILE` 注入。

FFmpeg 依据真实音频计算五幕起点 0、20.89、41.16、64.73、89.91 秒，叠加句级 ASS 字幕、确定性年代卡、近乎静默的断电底噪、克制电网嗡声与复电提示。最终媒体检查为：

```json
{
  "video": "h264 / 1280x720 / 30fps / yuv420p",
  "audio": "aac / 32000Hz / stereo",
  "duration": 115.833333,
  "size": 12479680,
  "mean_volume": "-23.2 dBFS",
  "peak_volume": "-4.7 dBFS"
}
```

浏览器自动验收覆盖 HTTP 1440×1000、390×844 与直接 `file://` 1280×900。三条路线均默认打开科技人文处方，8/8 矩阵、8 项排序、8 张比较卡和 10 个 `preload=metadata` 视频完整；科技时间轴可跳至 41.16 秒，停电快速样例正确把“科技人文”排在第一，切换家庭记忆后科技播放器暂停并隐藏。三个视口横向溢出均为 0，无 console 或 page error。页面同时提供五幕事实链、适用/不适用场景、权威来源、视觉锁、媒体清单和研究说明。

## E14：停电体验与电力依赖图验证

Revision 16 解决 Revision 15 “直接播放成片，用户只能旁观”的体验缺口。科技人文真实媒体区现在先呈现一个可恢复房间舞台，状态机为 `powered → outage → phone → reveal → ready → restore`。供电态的风扇旋转、路由器指示灯和窗外城市灯光在断电态同步停止或熄灭；手机微光随后接管局部照明；显影阶段用 SVG 路径和设备标注把个人感受转为基础设施关系。断电与复电声由 Web Audio 振荡器和增益包络即时合成，不新增媒体文件、不调用 MiniMax，也没有任何 API 凭证。

ready 状态展示五级核心路径：发电、升压与输电、城市变电、社区配电、插座与设备；并提供风扇/空调、家庭路由器、手机网络、泵与电梯四个可点击分支。解释明确保留边界：手机可由电池短时工作，移动通信仍依赖基站与传输链路；不同建筑的泵、电梯、应急电源和恢复顺序可能不同。按钮支持方向键切换并同步 `aria-selected`、标题、说明和边界文案。

自动验收覆盖 HTTP 1440×1000、HTTP 390×844、直接 `file://` 1280×900，以及 HTTP 390×844 的 `prefers-reduced-motion: reduce`。桌面完整时序观察到手机光束透明度 0.947875、显影路径透明度 0.986464，最终到达 ready；低动态路线在 520 毫秒内到达相同信息状态。跳过、恢复、`Escape`、键盘 Enter、四类设备切换和“进入正片”均通过；进入正片后焦点位于科技播放器且播放时间推进至 0.703872 秒。所有表面恢复后回到 powered、系统图隐藏；页面横向溢出为 0，无 console、page 或 HTTP error。10 个 MP4 的 HTTP 初始请求仍各为 300-byte metadata 记录，旧的 8/8 矩阵、八类推荐、41.16 秒跳点与切换暂停均未回归。机器报告与截图保存在 `browser-evidence/power-outage/`。

## E15：知识可视化叙事产品闭环验证

Revision 17 把页面第一印象从“GitHub 能力研究台”改为面向教师、科普创作者与公共传播团队的知识视频产品。基线截图显示旧首屏只强调文本/图片入口、风格和运行模式，且仍显示 7 条样片；新首屏明确“把复杂知识讲成真正能懂的视频”，主 CTA 进入知识工作台，并用知识意图、教学设计、视觉叙事、理解验证四步说明价值。原有能力研究、八类处方、十条媒体和停电案例全部保留为下游证据。

工作台提供主题、受众、时长、学习目标、常见误解、生活入口与材料依据七类输入，以及科学原理、文化教育、公共系统三个完整预设。本地规划器对八类处方评分，生成学习承诺和五幕方案；每幕包含教学任务、画面、旁白、证据位置与时长。输出进一步分为四层可信边界、三道理解题和生产交付清单，并能下载包含 `schema = knowledge-video-plan/v1`、8 项排名、5 幕与 3 道题的 JSON。任意输入不会上传，真实生图/TTS 仍明确属于后端生产阶段。

自动验收脚本 `integrations/verify-knowledge-product.mjs` 覆盖 HTTP 1440×1000、768×1024、390×844，直接 `file://` 1280×900，以及 390×844 reduced-motion。五个 JavaScript 表面均满足：科学预设推荐 knowledge，文化预设推荐 classical，公共系统预设推荐 technology；5 幕、4 层边界、3 道题完整；必填错误显示并把焦点送回主题；幕与输出 tab 可用方向键；答案可展开；下载 JSON 结构通过解析；真实样片 CTA 正确聚焦科技输出且停电体验保持 powered。另以 390×844 禁用 JavaScript 验证产品方法说明与 10 条 MP4 直链仍存在。所有视口横向溢出为 0，无 console/page error；8 个导演状态和 10 个 `preload=metadata` 视频保留，HTTP 下十条 MP4 初始请求各为 300 bytes。独立停电体验回归脚本也再次通过。机器报告、桌面/移动最终截图与改造前基线保存在 `browser-evidence/knowledge-product/`。

## E16：《天空为什么是蓝色的？》生成效果评审

Revision 18 把“先看生成效果”变成页面的最短路径。Codex 内置 image generation 生成 5 张 16:9 场景图：第一幕锁定短黑发学生、黄外套、蓝背包、深蓝笔记本、学校屋顶与城市天际线；后四幕均引用第一幕作为角色与视觉锚点。第二幕以棱镜显出白光光谱，第三幕把空气分子和短波多向散射视觉化，第四幕用正午蓝到晚霞橙的反差解释更长光程，第五幕让同一学生向同伴复述机制。五图没有生成文字、公式、标志或水印，精确术语由确定性字幕层承担。

旁白按 NASA 与 NOAA 的公开资料控制科学边界：不把天空蓝归因于海洋，不说蓝光是可见光中波长最短，并说明紫光更短而人眼主要感到蓝色；光线路径、分子尺寸和大气厚度只作为解释示意。MiniMax 官方 HTTP T2A 使用 `speech-2.8-hd`、`female-chengshu`、`calm`、0.92× 生成五段正式旁白，分段时长为 17.54、19.12、24.11、20.34、21.14 秒，共 841 个计费字符。本地 Key 只由被 Git 忽略的 `.env` 注入，未输出到日志、网页或媒体清单；最终清单标记 `reviewCut=false`。

最终正式媒体为 H.264/AAC、1280×720、30fps、107.233 秒、15,337,663 bytes，整体平均响度 -21.7 dB、峰值 -5.0 dB。网页在产品工作台之前增加常驻“最新生成效果”区，hero CTA 直接进入播放器；五点时间轴为 0、18.54、38.66、63.77、85.11 秒。自动验收 `integrations/verify-sky-blue-demo.mjs` 覆盖 HTTP 1440×1000、HTTP 390×844、直接 `file://` 1280×900，以及 HTTP 390×844 JavaScript off。四路线 duration 均为 107.233、横向溢出为 0；鼠标和键盘跳点通过，无 console/page error；11 个视频全部 `preload=metadata`，HTTP 下每条只产生 300-byte metadata entry。机器报告、桌面/移动截图与 contact sheet 位于 `browser-evidence/sky-blue/`。

## E17：独立知识视频生产台验证

Revision 19 保留原研究页承担原理、风格、样片与场景说明，新增独立 `studio.html` 承担产品生成流程。生产台把主旅程拆成目标、方案、分镜、声音、成片与交付六步；三个完整简报预设可以进入五幕方案，五张正式天空样例分镜支持逐幕锁定、解锁与演示重生成，声音步骤提供 MiniMax 音色、语速及正式参考旁白，成片步骤提供知识白板、手绘叙事、诗性长卷和 16:9 / 9:16 / 1:1 配置，交付步骤展示任务日志、质量门与项目包导出。所有演示生成动作明确标注“未调用 API”，不会把状态动画冒充成模型结果。

生产台与研究页双向连接：研究页的导航、首屏 CTA 和知识规划器共三个入口指向 `studio.html`；生产台的品牌、导航和页脚可以返回研究页。页面预留 `127.0.0.1:8789/api/health` 安全服务检查点，密钥边界明确在本地或云端服务端；静态 `file://` 仍能完成流程评审、本地持久化和无密钥项目包导出。

自动验收 `integrations/verify-product-studio.mjs` 覆盖 HTTP 1440×1000、900×900、390×844 reduced-motion，以及直接 `file://` 1280×900。四种初始表面均只有目标阶段可见、六个阶段完整、服务状态为“演示模式”，横向溢出为 0；阶段栏方向键导航通过。桌面完整旅程从提交简报推进到五幕方案、5 张分镜全部锁定、声音生成状态、9:16 选择、正式成片任务与交付，最终出现 6 条任务日志和 3 类交付物，状态明确为“演示完成 · 未调用 API”。全部浏览器路线无 console 或 page error。机器报告和三张最终截图位于 `browser-evidence/product-studio/`。

## E18：网页驱动 MiniMax 真实闭环验证

Revision 20 在独立生产台后增加仅绑定回环地址的无依赖 Node 服务。服务同源托管网页和生成文件，提供 health、plan、storyboard、voice、render 与 project manifest 接口；MiniMax Key 只从被 Git 忽略的 `.env` 读取。`file://` 页面不能调用服务，健康响应只返回模型名、运行模式与安全边界，不返回凭证。Mock 模式在不调用 MiniMax 的条件下完成同一六步流程和真实 FFmpeg 合成，机器报告位于 `browser-evidence/studio-service/`。

真实模式以“为什么天空是蓝色的”为简报：MiniMax-M3 生成恰好五幕的知识方案，完成用量 4,595 tokens，其中 reasoning 3,089 tokens；image-01 生成 5 张 16:9 分镜；speech-2.8-hd、female-chengshu、0.92× 生成 5 段 WAV，共 622 个计费字符。系统读取实际语音时长 13.213、14.740、13.274、21.940、13.989 秒，加镜头尾垫后形成约 81 秒时间轴，并由 FFmpeg 输出字幕、低幅环境声与最终媒体：

```json
{
  "video": "h264 / 1280x720",
  "audio": "aac / 32000Hz / stereo",
  "duration": 81.133333,
  "size": 4016128
}
```

视觉抽检确认整体科普色彩和五幕构图成立，同时发现第 4 幕仍出现伪英文字样、人物在部分镜头存在漂移。单幕重生证明局部返工链路有效，但无法保证一次消除模型缺陷，因此页面质量门改为诚实区分：字幕、音频与编码可以自动 PASS；知识来源、角色连续性和伪文字必须 REVIEW。`verify-existing-studio-project.mjs` 把已完成真实项目恢复到交付页，验证 5 张项目图、MiniMax 旁白、最终视频、下载地址和 manifest 连通；刷新恢复缺失的交付面板也已修复。最终浏览器报告无 console/page error，证据与全页截图位于 `browser-evidence/studio-live-project/`。

## E19：“为什么 AI 那么耗电”故事优先混合样例

Revision 21 以 IEA《Energy and AI》的数据中心章节限定事实范围：AI 训练与部署依赖真实数据中心，用电涉及计算、存储与网络中的数据搬运、供电和冷却；实际影响随模型、硬件、任务长度、利用率、数据中心效率和电力来源变化，因此成片不使用统一的“单次请求耗电数字”。MiniMax-M3 先生成五幕方案，随后人工事实复核删除“上百台设备同时被唤醒”和“燃烧电力”等过度表达，形成旁白、画面任务、禁止内容与可信边界共用的唯一故事契约。

MiniMax `image-01` 生成了五张探索初稿，但抽检发现第 1、3、5 幕存在伪文字，第 2 幕带有水印感，第 2、4 幕与其余场景的视觉语法不够统一。因此初稿不进入交付，五张最终图全部由 Codex 内置 imagegen 重绘；最终项目清单逐幕记录 `provider = Codex built-in imagegen`、`draft_provider = MiniMax Image image-01` 与修订原因。所有终稿统一为无真实人物、无画内文字的深夜蓝 3D 信息图视觉。

旁白在故事与画面锁定后由 MiniMax 官方 HTTP T2A 执行：`speech-2.8-hd`、`female-chengshu`、0.94×，五段时长为 14.520、17.220、15.497、13.420、14.520 秒，共 609 个计费字符。FFmpeg 按真实时长写入 ASS 字幕并确定性合成最终媒体：

```json
{
  "video": "h264 / 1280x720",
  "audio": "aac",
  "duration": 79.2,
  "size": 4978252
}
```

研究页的“最新生成效果”增加正式播放器、五幕跳点、成片下载和项目清单；生产台增加第四预设与“一键到成片”控制器。该按钮复现已完成且经人工复核的真实混合任务，六步依次显示事实故事、叙事对齐、Codex 最终分镜、MiniMax TTS、FFmpeg 成片和交付溯源，同时明确“不重复调用 API”。新主题的逐步生成路线仍保留。

自动验收 `integrations/verify-ai-energy-sample.mjs` 覆盖 HTTP 1440×1000、HTTP 390×844 reduced-motion、直接 `file://` 1280×900，以及研究页播放器。三条生产台路线均到达 delivery，6/6 流程步骤与 6/6 工作流步骤完成，5 张 Codex 终稿、MiniMax 音频、79.2 秒视频和静态项目清单连通，横向溢出为 0；研究页可跳到 49.637 秒第四幕。全部路线无 console/page error，报告和截图位于 `browser-evidence/ai-energy-sample/`。API Key 未进入网页、媒体清单、日志或提交文件。

## E20：生产台四预设状态隔离修复

Revision 22 复现了用户报告的真实串线：在 `file://` 生产台选择“电如何成为现代生活的基础设施”，表单标题正确变化，但批准方案后五张图片仍全部来自 `sky-blue-demo`，五幕标题仍是屋顶、白光、散射与晚霞，声音和成片也继续指向天空样例。根因是旧状态模型只保存简报字段；离线 `renderStoryboard()` 和 `applyGeneratedMedia()` 把天空资源写成全局回退，普通 demo 回调又没有写入与当前预设对应的 `plan/storyboard/voiceData/renderData`。

修复新增持久化 `activePreset` 和四套完整 `presetDemos`。天空绑定 401 字旁白与 107.233 秒成片；用电绑定 `power-outage-demo`、494 字旁白与 115.833 秒成片；诗词绑定 `jiangnan-bright-demo`、383 字旁白与 116.42 秒诗卷讲解成片；AI 耗电绑定 `ai-energy-demo`、609 字旁白与 79.2 秒成片。每套同时包含五幕标题、教学任务、画面任务、可信边界、五图、MiniMax 音轨、真实时长、下载地址和 manifest。实时 API 返回资产仍优先，选择新预设则清空旧 projectId、计划、锁定、声音和渲染结果。

自动验收 `integrations/verify-studio-preset-isolation.mjs` 在 HTTP 下分别完成天空、用电、诗词与 AI 耗电的六步完整旅程；每条路线均验证五图目录、第一幕标题、音频、最终视频、下载、manifest、旁白字数、`activePreset` 和刷新恢复。另在直接 `file://` 完成用电全旅程，并在 390×844 reduced-motion 下快速执行“用电 → 诗词”切换，确认表单、五图、音频、视频和 0/5 锁定状态全部属于诗词。六条路线横向溢出均为 0，无 console/page error；报告与最终截图位于 `browser-evidence/studio-preset-isolation/`。
