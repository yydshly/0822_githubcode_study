# 交互演示设计契约

## Active contract · Revision 18

```text
Entry mode: revision-led implementation
Request revision: 18
Target user and context: 用户正在判断 story-to-handdrawn-video 能否产出真正有传播价值的知识视频；当前优先评估生成画面与最终视频观感，不扩展后台或产品细节
Desired first impression: 打开页面后无需先理解工作台，直接看到一条色彩鲜明、角色连续、机制可读的真实科普样片
Visual ambition: Editorial
Experience architecture: Editorial Flow
Visual constraints: 同一学生、黄外套、蓝背包、学校屋顶和城市天际线贯穿五幕；正午蓝与晚霞橙构成清楚的色彩弧线；术语卡和字幕不能遮住视觉机制
Information constraints: 只保留问题、光谱、散射、晚霞迁移和认知收束五步；科学画面明确为解释示意而非比例图
Operation constraints: 最新效果区必须常驻可见；原生视频可播放下载；五点时间轴支持鼠标与键盘；其他十条样片和产品能力不回归
State constraints: 初始停在第一幕；五点跳转同步 aria-pressed；metadata-only；JavaScript 关闭时视频与下载仍可见
Environment constraints: GitHub Pages 静态托管；HTTP Range 与 file://；1440 桌面、1280 file、390 移动；MiniMax Key 不写入仓库或网页
Primary journey: 打开页面 → 点击“查看最新生成效果” → 播放《天空为什么是蓝色的？》 → 跳看五幕 → 判断连续性、机制可读性与色彩效果 → 下载或查看来源
User-defined phases: 只看真实生成效果；Codex 五幕连续生图；确定性视频合成；网页首要入口；跨表面播放验收
Required artifacts: 5 张 16:9 连续场景图、MiniMax 五段正式旁白、H.264/AAC 正式成片、句级字幕、环境声、五张缩略图、来源边界、媒体清单、网页播放器、五点时间轴、HTTP/file/desktop/mobile/no-script 证据
Autonomy authorization: 用户明确要求继续并把样例加入网页；允许仓库内可逆实现与独立提交
User-decision boundary: 推送、PR 和任何凭据写入仍需另行授权；本地 `.env` 永不提交
Observable completion criteria: 页面首要 CTA 进入最新效果；视频 H.264/AAC 1280×720、约 107 秒并包含 MiniMax 正式中文旁白；五幕视觉一致且机制清楚；11 个视频均 metadata-only；五点跳转鼠标/键盘可用；HTTP/file、1440/1280/390、no-script 无横向溢出和浏览器错误；API Key 扫描为零
```

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 负责阶段 | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 只看真实生成效果 | 五幕连续 Codex 生图 | `assets/sky-blue-demo` | 五图同一人物/服装/屋顶；光谱、散射、晚霞与总结画面逐幕可读 | 2 | `pass` | — |
| 只看真实生成效果 | MiniMax 正式成片 | H.264/AAC / 旁白 / 字幕 / 环境声 | `speech-2.8-hd` 五段 841 计费字符；ffprobe 1280×720、30fps、107.233 秒；五幕 contact sheet 通过 | 3 | `pass` | — |
| 网页首要入口 | 最新效果区、播放器、五点时间轴、下载与来源 | HTTP / file | 入口常驻；11 媒体 metadata-only；五点鼠标与键盘跳转通过 | 5 | `pass` | — |
| 跨表面验收 | desktop/mobile/file/no-script | 1440×1000 / 1280×900 / 390×844 | 四路线 overflow=0、duration=107.233、无 console/page error | 7 | `pass` | — |
| MiniMax 正式旁白 | `speech-2.8-hd` 五段中文音轨 | 本地安全环境 | 用户恢复忽略的 `.env`；API 成功生成 5 段、841 计费字符；媒体清单 `reviewCut=false`；Key 未输出、未进入网页或仓库 | 8 | `pass` | — |

## Revision 17 archive

```text
Entry mode: revision-led implementation
Request revision: 17
Target user and context: 教师、科普创作者、博物馆与公共传播团队；他们拥有值得传播的知识或资料，但需要把专业内容转成普通人愿意看、能够懂、记得住的视觉叙事
Desired first impression: 这是一套“知识可视化叙事产品”，而不是停电专题或手绘效果陈列；用户首先看到知识推广目标和可操作工作台，能够从主题、受众、学习目标、误解与证据一路生成五幕教学方案、效果建议、理解题和生产包
Visual ambition: Editorial
Experience architecture: Hybrid Workspace
Visual constraints: 延续深色研究展厅、暖白纸张、青色系统线与琥珀证据强调；知识产品工作台成为首屏主角，已有停电体验和十条真实媒体下沉为案例与验证；交互状态必须同时使用文字、结构和边框，不只依赖颜色
Information constraints: 首屏按“知识意图 → 教学设计 → 视频方案 → 理解验证”组织；研究能力、20 风格、八类样片和使用场景作为下游证据保留；必须区分知识事实、创作者观点、艺术化表达与待审阅内容，不把本地规则包装成实时大模型
Operation constraints: Revision 17 新增结构化知识输入、三个完整预设、受众/目标/误解/证据字段、五幕教学方案、八类效果匹配、事实边界、三道理解题、生产清单、JSON 下载与真实样片入口；保留原有文本/图片双入口、20 风格、6 模式、八类处方、十条 MP4、古诗三态、停电六状态体验与 MiniMax 凭证隔离
State constraints: 产品工作台必须具有初始、有效计划、校验错误、切换预设、切换五幕、显示答案、下载完成和进入样片状态；生成结果与表单字段同步；推荐处方必须连接既有导演与媒体互斥；键盘可完成表单、幕切换、答案展开和进入样片；reduced-motion 不丢信息；无脚本提供产品说明与十条媒体直链
Environment constraints: GitHub Pages 静态托管；现代桌面和移动浏览器；JavaScript 关闭时仍可阅读研究结论
Primary journey: 打开页面 → 明确这是知识推广教育产品 → 选择示例或填写知识主题、受众、学习目标、常见误解和依据 → 生成教学视频方案 → 查看学习承诺、五幕叙事、效果匹配、事实边界和理解题 → 下载生产包或进入最匹配的真实样片验证
User-defined phases: 知识推广教育定位；结构化知识输入；教学叙事生成；故事—效果匹配；事实与观点边界；理解验证；生产包导出；真实媒体证明；原有全能力研究与八类样片保留
Required artifacts: 产品化首屏；知识工作台；至少三个完整预设；必填校验；学习承诺；五幕教学方案与幕详情；八类推荐结果；事实/观点/艺术化/待审阅四层边界；三道理解题与答案；生产清单；JSON 下载；真实样片 CTA；桌面/平板/移动、键盘、reduced-motion 与 file/HTTP 验收；更新后的研究、证据和交接说明
Autonomy authorization: 用户已明确要求把上述意图落地为完整产品，可直接完成所有可逆的仓库内实现与独立提交
User-decision boundary: 推送远端、创建 PR、修改上游源码或将真实生成凭证写入仓库仍需另行授权；本次真实生图与 TTS 已由用户明确授权
Observable completion criteria: 首屏明确知识推广教育价值且主 CTA 进入产品工作台；三个预设分别代表科学原理、文化教育和公共系统；有效输入生成完整五幕、八类推荐、四层边界、三道理解题和可下载 JSON；错误态可恢复；推荐 CTA 进入对应真实媒体；桌面/平板/390 手机无溢出；键盘与 reduced-motion 可用；HTTP/file 均工作；十条旧媒体仍 metadata-only、互斥播放且无脚本直链保留；API Key 不进入仓库；工程检查通过
```

## 设计方向

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 焦点 | 白纸分镜舞台是首要视觉锚点 | 页面标题不与舞台争抢；主操作紧邻舞台 | 首屏能识别“播放演示”与当前三阶段 |
| 信息层级 | 体验在前、解释在后 | 原理、场景、扩展方向分区，不堆在舞台内 | 完成演示后按自然滚动顺序读完结论 |
| 字体 | 系统无衬线负责 UI，衬线/楷体负责故事字幕 | 不加载外部字体 | 中英文在 Windows、macOS、移动端均有回退 |
| 色彩 | 深色研究外壳 + 暖白纸张 + 黄绿研究强调色 | 交互状态不只依赖颜色 | 选中项同时有边框、位置或文字变化 |
| 动效 | 左到右揭示并解释状态变化 | 动画可暂停；支持 reduced motion | 动效关闭时仍能手动查看三个完整阶段 |
| 降级 | 内联 SVG、CSS 和少量原生 JS | 无 WebGL、无外部媒体、无构建依赖 | JS 失败时仍显示完整彩色分镜与文字说明 |
| 产品化入口 | 故事文本与匹配结果在同一工作区 | 输入在左，信号/前三推荐在右；八类比较紧随结果 | 不离开当前区即可完成输入、理解理由并进入真实样片 |

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面/状态 | 证据 | 负责阶段 | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 知识推广教育定位 | 首屏价值、目标用户、主 CTA 与四步闭环 | hero / product entry | 第一视口不再以停电或仓库研究为中心；CTA 聚焦知识工作台 | R17 | `pass` | — |
| 结构化知识输入 | 主题、受众、学习目标、误解、依据与三个预设 | knowledge studio / initial / error / populated | 字段同步、必填校验、预设可切换且覆盖三种知识形态 | R17 | `pass` | — |
| 教学叙事与效果匹配 | 学习承诺、五幕详情与八类排序 | plan state | 每幕目的/画面/旁白/证据明确；推荐连接既有八类处方 | R17 | `pass` | — |
| 可信边界与理解验证 | 四层边界、三道理解题和答案 | review state | 事实/观点/艺术化/待审阅分离；答案可展开且键盘可达 | R17 | `pass` | — |
| 生产闭环 | 生产清单、JSON 下载、进入真实样片 | delivery state | 下载结构完整；真实样片 CTA 聚焦并复用媒体互斥 | R17 | `pass` | — |
| 产品跨表面验收 | HTTP/file、1440/768/390、键盘、reduced-motion、无脚本 | full journey | 无溢出/错误；旧十媒体、八类处方与停电体验不回归 | R17 | `pass` | — |
| 停电体验状态机 | powered → outage → phone → reveal → ready → restore | 科技人文真实媒体区前置舞台 | 设备运动/灯光/状态文案/aria-live/声音一致 | R16 | `pass` | — |
| 电力依赖图 | 发电—输电—变电—配电—家庭及设备分支 | ready 状态系统图 | 四类设备按钮同步路径高亮与解释，限定建筑差异 | R16 | `pass` | — |
| 体验恢复与降级 | 跳过、恢复、Escape、进入正片、reduced-motion、无脚本 | 桌面/移动/file/HTTP | 可恢复、焦点明确、低动态无信息损失、旧媒体不回归 | R16 | `pass` | — |
| 科技人文真实处方 | 《停电以后，我看见了电》五幕连续视觉、MiniMax TTS、环境声与成片 | 第八类导演状态 / 顶部入口 / 真实媒体区 | 首尾同一房间与人物；中段匿名装置史；确定性年代层；H.264/AAC | R15 | `pass` | — |
| 电力史边界 | 区分电现象、连续电流、电磁感应、实用照明、供电与输电系统 | 事实时间轴 / 文档 / 旁白 | 权威来源；“最伟大”标注为人物观点；不制造单一英雄神话 | R15 | `pass` | — |
| 八类产品闭环 | 输入停电故事命中科技人文第一推荐并进入真实成片 | 故事分析器 / 8/8 矩阵 / 八类比较 | 八路分数、五幕建议、五点跳转、跨样片暂停、无脚本十直链 | R15 | `pass` | — |
| 固定上游 | Git submodule 与许可说明 | 研究项目 | submodule HEAD = `fbab5b27` | 9 | `pass` | — |
| 全量演示 | 文本与图片双入口 | 控制台输入状态 | 4 镜动态文本 + 2 张真实图片上传 | 9 | `pass` | — |
| 全量演示 | 20 种风格效果完整浏览 | 风格浏览器与当前配方 | 20/20 上游真实参考图加载；木刻/水墨选择、大图、搜索、键盘与控制台同步 | 9 | `pass` | — |
| 全量演示 | 六种运行模式 | plan/generate/import/render/preview/full | 6 个 option 与命令/输出预览同步 | 9 | `pass` | — |
| 全量演示 | generator/text-mode/transition/output | 适用与禁用状态 | 图片入口隐藏生成器/字幕、禁用 import；render 输出 1080×1440 | 9 | `pass` | — |
| 全量演示 | 动态 storyboard | 用户故事、场景列表、JSON | 编辑故事后生成 4 镜，CLI/JSON 同步 | 9 | `pass` | — |
| 全量演示 | cut 与 page-flip 视觉机制 | 预览舞台 | page-flip 激活且锁定彩色母版 | 9 | `pass` | — |
| 能力整合与扩展 | 通用输入、规划、生成、QC、渲染架构 | 扩展架构区 | 歌词 + 情绪 MV + TTS/QC/品牌/队列组合可见 | 9 | `pass` | — |
| 能力整合与扩展 | 可执行的整合建议与阶段路线 | 路线图区 | P0 可靠性、P1 创作者闭环/QC、P2 平台化 | 9 | `pass` | — |
| 能力整合与扩展 | 真实连续分镜生成 | 真实案例素材 | 4 张真实生成分镜保持顾岚角色锁与水彩速写风格；第 5 节拍明确复用第一幕作暖色回环 | 9 | `pass` | — |
| 能力整合与扩展 | 中文 TTS 旁白 | 真实案例音轨 | MiniMax `speech-2.8-hd` + `female-chengshu` + `calm` 生成 5 段中文语音并拼接为约 54.364 秒、32kHz 单声道 WAV；非浏览器 speechSynthesis | 9 | `pass` | — |
| 能力整合与扩展 | 带旁白字幕的最终成片 | 真实案例播放器 | ffprobe：H.264 720×960 30fps + AAC 双声道，时长 54.333 秒；ASS 中文字幕烧录 | 9 | `pass` | — |
| 能力整合与扩展 | 真实案例可观察性 | 页面案例区 | 视频、故事内涵、五段生产证据、媒体元数据和可点击五节拍时间轴；本地文件与 Range HTTP 均可播放跳转 | 9 | `pass` | — |
| 故事与效果对齐的场景叙事扩展 | 六类故事导演处方 | 叙事导演台 / 故事选择状态 | 六个选择均同步改变风格、色彩、镜头、转场、TTS、节奏与匹配理由 | 5 | `pass` | — |
| 故事与效果对齐的场景叙事扩展 | 五段场景弧线 | 叙事导演台 / 场景选择状态 | 每类故事均有五段功能不同的场景；点击后主舞台标题、画面指导、效果和旁白意图同步 | 5 | `pass` | — |
| 故事与效果对齐的场景叙事扩展 | 规则与模型边界 | 叙事导演台 / 常驻说明 | 明确当前为本地规则导演原型，模型负责后续语义细化与真实生图，不把规则推荐冒充 AI 推理 | 6 | `pass` | — |
| 故事与效果对齐的场景叙事扩展 | 响应式与键盘操作 | 1440/768/390，按钮键盘路径 | 无横向溢出；故事和场景按钮可聚焦、Enter/Space 可触发且焦点可见 | 7 | `pass` | — |
| Codex 生图 + MiniMax TTS 真实处方样片 | 5 张知识解释白板分镜 | `assets/knowledge-demo` | 5/5 为 Codex 内置 imagegen 真实生成；逐张与 contact sheet 检查无文字/水印/乱码；统一黑线、概念蓝与暖白纸 | 9 | `pass` | — |
| Codex 生图 + MiniMax TTS 真实处方样片 | 中文旁白与字幕时间轴 | 独立 WAV / ASS | MiniMax 中国区官方 API、`speech-2.8-hd`、`female-chengshu`、neutral；5 段 690 字符按真实时长重排；Key 不入库 | 9 | `pass` | — |
| Codex 生图 + MiniMax TTS 真实处方样片 | 《记忆不是录像带》最终成片 | 独立 MP4 / 媒体清单 | ffprobe：H.264/AAC、720×960、30fps、77.333 秒；平均 -19.3 dBFS/峰值 -2.0 dBFS；ASS 字幕；五幕抽帧通过 | 9 | `pass` | — |
| Codex 生图 + MiniMax TTS 真实处方样片 | 知识处方真实能力入口 | 叙事导演台 knowledge 状态 | 选择知识解释显示真实播放器、指标与五点跳转；导演节拍同步媒体；切换其他处方立即隐藏并暂停 | 9 | `pass` | — |
| Codex 生图 + MiniMax TTS 真实处方样片 | 跨表面与降级 | HTTP/file、1440/768/390、键盘、无脚本 | 四条路线时长均为 77.333 秒、跳点一致且可播放；无溢出、console/page/HTTP error；无脚本保留 MP4 直链 | 9 | `pass` | — |
| 第三类儿童成长真实处方 | 5 张角色连续的暖光绘本分镜 | `assets/children-demo` | 5/5 为 Codex 内置 imagegen 真实生成；第一幕作角色/道具参考；小满服装、同一纸鸢和水塔连续；五图与 contact sheet 无文字、水印和乱码 | 9 | `pass` | — |
| 第三类儿童成长真实处方 | MiniMax 温暖旁白与字幕时间轴 | 独立 WAV / ASS | 官方音色表确认 `female-tianmei`；`speech-2.8-hd`、calm、0.96×，5 段 923 字符；按真实时长排幕；Key 不入库 | 9 | `pass` | — |
| 第三类儿童成长真实处方 | 《她先学会听风》最终成片 | 独立 MP4 / 媒体清单 | ffprobe：H.264/AAC、720×960、30fps、107.267 秒；平均 -19.5 dBFS/峰值 -3.3 dBFS；ASS 字幕与五幕抽帧通过 | 9 | `pass` | — |
| 第三类儿童成长真实处方 | 儿童处方真实能力入口 | 叙事导演台 children 状态 | 四条浏览路线均显示独立播放器与 5 点跳转；媒体跳到 42.124 秒、导演第四幕同步到 63.089 秒；离开后暂停并隐藏 | 9 | `pass` | — |
| 第三类儿童成长真实处方 | 3/6 真实完成矩阵 | 叙事导演台与整合区 | DOM 与截图均为 3 REAL / 3 RULE；按钮直达对应状态；REAL/RULE 不只依赖颜色，当前状态有底边和 aria-pressed | 9 | `pass` | — |
| 第三类儿童成长真实处方 | 跨表面、性能与降级 | HTTP/file、1440/768/390、键盘、无脚本 | 三条媒体回归通过；各视口 scrollWidth=bodyWidth；无 console/page/HTTP error；初始 MP4 资源仅记录 300-byte metadata entry；无脚本保留三条直链 | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | 5 张限色木刻档案分镜 | `assets/mystery-demo` | 5/5 为 Codex 内置 imagegen 真实生成；首图锁定沈砚、车站、旧钟和三色木刻；contact sheet 验证暗道、长大衣、磁带与分层证据连续，无文字/水印/乱码 | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | MiniMax 克制旁白与字幕时间轴 | 独立 WAV / ASS | 官方音色表确认 `male-qn-jingying`；`speech-2.8-hd`、calm、0.94×，5 段 1466 计费字符；1.12× 后期压紧；Key 不入库 | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | 《封存之后，钟还在走》最终成片 | 独立 MP4 / 媒体清单 | ffprobe：H.264/AAC、720×960、30fps、135.262 秒、11016434 bytes；平均 -19.5 dBFS/峰值 -2.0 dBFS；五幕抽帧、字幕与清单尺寸一致 | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | 悬疑处方真实能力入口 | 叙事导演台 mystery 状态 | HTTP/file 四路线均显示独立播放器与 5 点跳转；媒体跳到 49.82 秒，导演第五幕同步到 105.99 秒；切换 children 后暂停隐藏 | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | 4/6 真实完成矩阵 | 叙事导演台与整合区 | DOM 与截图均为 4 REAL / 2 RULE；六按钮直达对应状态，当前状态有底边、文字与 aria-pressed | 9 | `pass` | — |
| 第四类悬疑档案真实处方 | 跨表面、性能、保密与降级 | HTTP/file、1440/768/390、键盘、无脚本 | 四条媒体与六类导演回归通过；各视口 scrollWidth=bodyWidth；无 console/page/HTTP error；四个 MP4 初始 performance entry 均为 300-byte metadata；无脚本四直链；secret scan=0 | 9 | `pass` | — |
| 第五类品牌起源真实处方 | 5 张有机轮廓品牌分镜 | `assets/brand-demo` | 5/5 为 Codex 内置 imagegen；林又、同一把旧椅、可见裂纹/蝴蝶榫、森林绿/珊瑚/奶油连续；contact sheet 无文字、水印或乱码 | 9 | `pass` | — |
| 第五类品牌起源真实处方 | MiniMax 品牌旁白、字幕与最终成片 | 独立 WAV / ASS / MP4 / 清单 | `speech-2.8-hd` + `Chinese (Mandarin)_Sincere_Adult` + calm；5 段 1412 字符；H.264/AAC 720×960、134.000 秒、9778826 bytes；平均 -20.0/峰值 -1.8 dBFS；Key 不入库 | 9 | `pass` | — |
| 第六类诗性独白真实处方 | 5 张水墨留白分镜 | `assets/poetic-demo` | 5/5 为 Codex 内置 imagegen；沈慧、旧渡口、新桥、录音机与朱红线连续；竖幅纸上记忆转横幅现实，contact sheet 保留大留白 | 9 | `pass` | — |
| 第六类诗性独白真实处方 | MiniMax 抒情旁白、环境声与最终成片 | 独立 WAV / ASS / MP4 / 清单 | `speech-2.8-hd` + `Chinese (Mandarin)_Lyrical_Voice` + calm；5 段 1007 字符；确定性低幅环境声；H.264/AAC 1280×720、127.633 秒、6964188 bytes；平均 -21.8/峰值 -3.0 dBFS | 9 | `pass` | — |
| 6/6 网页全样例 | 品牌与诗性真实能力入口 | director brand / poetic 状态 | HTTP/file 四路线均有独立播放器与 5 点跳转；52.15/76.04 秒媒体跳点与 106.67/100.94 秒导演第五幕同步；互切暂停隐藏 | 9 | `pass` | — |
| 6/6 网页全样例 | 六类真实完成矩阵 | 叙事导演台与整合区 | DOM 与桌面/移动截图均为 6 REAL / 0 RULE；六按钮直达，文字、底边和 aria-pressed 共同表达状态 | 9 | `pass` | — |
| 6/6 网页全样例 | 跨表面、性能、保密与回归 | HTTP/file、1440/768/390、键盘、无脚本 | 六媒体与六类导演回归通过；scrollWidth=bodyWidth；无 console/page/HTTP error；六 MP4 初始 entry 各 300 bytes；无脚本六直链；secret scan=0 | 9 | `pass` | — |
| 故事输入与效果自动对齐 | 本地可解释信号分析器 | 默认、六快速样例、自定义文本、重新分析 | 五条 JS 浏览路线中，六内置输入均命中预期第一推荐：88/96/93/96/96/96%；每次展示命中信号、6 项排序、5 幕建议与风险；常驻说明明确非实时 AI | 11 | `pass` | — |
| 故事输入与效果自动对齐 | 推荐进入真实样片 | 第一推荐 CTA → 叙事导演台对应状态 | 品牌 CTA 同步 director=brand、beat=0 并聚焦品牌真实区；比较卡随后打开诗性样片，品牌媒体暂停隐藏、焦点进入诗性真实区 | 11 | `pass` | — |
| 六类横向比较 | 六处方比较矩阵 | 桌面 / 平板 / 移动卡片 | DOM 为 6 张比较卡与 6 个真实样片按钮；每张完整列出核心弧线、视觉、声音/节奏、最佳场景和关键风险 | 11 | `pass` | — |
| 产品化体验回归 | 多状态、跨表面、键盘与降级 | HTTP/file、1440/768/390、键盘、reduced-motion、无脚本 | HTTP 三宽、file 与 reduced-motion 均无溢出和运行错误；短输入错误/禁用/回焦通过；键盘快速样例焦点为 solid；无脚本保留规则与六直链；六媒体仍各 300-byte metadata | 11 | `pass` | — |
| 第七类古诗词场景真实处方 | 五幕脚本、原文与还原边界 | 《枫桥夜泊》场景设计 | 原诗四句准确；五幕分别承担天时、江岸、人物视角、空间远景和声音收束；不把争议生平或生成建筑当作史实 | 12 | `pass` | — |
| 第七类古诗词场景真实处方 | 5 张连续水墨分镜 | `assets/classical-poetry-demo` | 5/5 由 Codex 内置 imagegen 生成；夜色、客船、旅人、江枫/渔火、寒山寺方向连续；无图中文字、水印和现代物件 | 12 | `pass` | — |
| 第七类古诗词场景真实处方 | MiniMax 朗诵、环境声、字幕与最终成片 | 独立 WAV / ASS / MP4 / 清单 | `speech-2.8-hd` + `Chinese (Mandarin)_Lyrical_Voice` + calm；774 字符；H.264/AAC 1280×720、116.3 秒、9265077 bytes；平均 -18.6/峰值 -2.6 dBFS；Key 仅本地读取 | 12 | `pass` | — |
| 7/7 网页全样例 | 古诗词处方、播放器与可发现入口 | 顶部导航、导演台、比较卡、故事分析器 | 顶部“七类样片”直达；classical 状态显示五幕、原文、真实播放器与 0/24.61/47.46/68.87/92.56 秒跳点；矩阵、比较和评分均为七类 | 12 | `pass` | — |
| 7/7 网页全样例 | 跨表面、性能、降级与保密 | HTTP/file、1440/768/390、键盘、无脚本 | 七媒体互斥与跳点；无溢出/运行错误；七 MP4 初始各 300-byte metadata；无脚本七直链；secret scan=0 | 12 | `pass` | — |
| 明亮古诗词场景扩展 | 暗淡基线与明亮方向 | 古诗词真实输出桌面/移动 | 基线截图确认旧舞台为墨灰；新舞台计算背景为暖宣纸渐变，并以朱红、珊瑚红、孔雀绿、湖蓝构成完整 UI 而非只更换视频 | 2 | `pass` | — |
| 明亮古诗词场景扩展 | 5 张连续鲜明分镜 | `assets/jiangnan-bright-demo` | Codex 内置 imagegen；同一水乡、舟中回望者、白墙黛瓦和花树连续；日出朱红、花红、孔雀绿、湖蓝鲜明；contact sheet 检查无文字/水印/现代物件 | 2 | `pass` | — |
| 明亮古诗词场景扩展 | MiniMax 朗诵、环境声、字幕与成片 | 独立 WAV / ASS / MP4 / 清单 | 官方 HTTP T2A、805 字符、Key 仅私有环境读取；五段按真实音频时长合成；H.264/AAC 1280×720、116.420 秒，-18.0/-2.7 dBFS，五幕抽帧通过 | 8 | `pass` | — |
| 古诗词明暗双样片 | 默认明亮版与夜色对照 | classical 输出、切换控件、两套时间轴 | 默认《忆江南》；键盘可切换《枫桥夜泊》；播放器、原文、证据和时间轴同步；非目标媒体暂停；推荐 CTA 正确进入鲜明版 | 5 | `pass` | — |
| 明亮效果跨表面交付 | 布局、性能、降级与保密 | HTTP/file、1440/768/390、键盘、无脚本 | 无溢出/console/page/HTTP error；八 MP4 metadata-only；无脚本八条直链含两条古诗；secret scan=0 | 9 | `pass` | — |
| 诗词讲解展示重构 | 讲解基线与信息架构 | 古诗词输出 / 《忆江南》 | 基线确认欣赏版以全屏画面和底部字幕为主；讲解版改为左图右卷，原诗、当前句和解释成为视觉主体；桌面截图验证新层级 | 2 | `pass` | — |
| 诗词讲解展示重构 | 真实诗卷讲解成片 | 独立 MP4 / 媒体清单 | 复用 5 张连续分镜和 MiniMax 旁白；确定性排版生成原诗常驻、五幕高亮、关键词、释义与画面证据；无底部讲解字幕；五点 contact sheet 通过 | 8 | `pass` | — |
| 古诗词三态产品入口 | 讲解 / 欣赏 / 夜色 | classical 输出、故事推荐、键盘 | 默认讲解；三态切换同步内容与时间轴；非目标媒体暂停；ArrowRight、导演五幕和推荐 CTA 四路线通过 | 5 | `pass` | — |
| 诗卷讲解跨表面交付 | 布局、性能、降级与保密 | HTTP/file、1440/768/390、键盘、无脚本 | 三宽无溢出；无 console/page/HTTP error；九 MP4 metadata-only；无脚本九直链；secret scan=0 | 9 | `pass` | — |
| 使用场景 | 适合、不适合、选型建议 | 场景决策区 | 8 类场景分级，新增儿童成长/亲子共读/社会情感学习，并列出专业审阅与换工具边界 | 9 | `pass` | — |
| 响应式 | 桌面、平板、移动无裁切和横向滚动 | 1440/768/390 宽 | scrollWidth 分别不超过可用 body 宽；截图观察无裁切 | 9 | `pass` | — |
| 键盘 | 表单、标签与操作可达，焦点可见 | Tab/Enter/Space | Enter 触发“文字”阶段，phase=0 且状态同步 | 9 | `pass` | — |
| 运动 | reduced-motion 禁止自动播放且保留手动操作 | 媒体查询 | 播放保持 aria-pressed=false，并给出手动预览提示 | 9 | `pass` | — |
| 降级 | 无生成 API、无外部媒体时仍可完整操作 | 静态能力模拟 | offline 下风格筛选仍得到 4/20 | 9 | `pass` | — |
| 工程 | 静态资源、链接、语法和仓库状态 | 文件与 Git | `node --check demo.js`、Chromium console/errors、Git 终审 | 9 | `pass` | — |

## 浏览器证据

```text
Canonical runtime: 支持 HTTP Range 的本地静态服务器（测试端口 8789）
Canonical URL: http://127.0.0.1:8789/demos/story-to-handdrawn-video/
Browser: Playwright / Microsoft Edge Chromium
Date: 2026-08-22 Asia/Shanghai
Theme boundary: 单一深色研究主题 + 暖白纸张演示舞台
Viewports: 1440×1000、768×1024、390×844
Console/page errors: none
External runtime dependency: none；图片、音频和 MP4 均为仓库内静态资源
Direct file route: `file:///E:/0822_codex_project/docs/demos/story-to-handdrawn-video/index.html`，20/20 参考图与九条 MP4 均可加载；古诗词包含 116.420 秒《忆江南》诗卷讲解、116.420 秒明亮欣赏与 116.300 秒《枫桥夜泊》夜色版；三套五节拍和键盘切换均工作；7/7 完成矩阵保持七类处方语义
```

### Refinement ledger

```text
Current stage: 9
User phase: 能力整合与扩展
Coverage item: 真实生图、TTS、字幕与最终成片
User goal: 不只看到架构说明，而是直接看到一个有内涵、稍复杂、可播放并能核验生产环节的真实案例
Browser environment: 仓库内静态资源；Chromium；支持 Range 的 HTTP 与 file:// 双路线
Observed evidence: Revision 3 只有可组合架构方块；Revision 4 新增真实整合成片；Revision 5 以 MiniMax Speech 2.8 HD 重制 5 段中文 TTS、字幕时间轴和 54.333 秒最终 MP4
Problem category: missing capability proof / outcome fidelity
Root cause: 原整合区只表达了可扩展架构，没有把图像生成、配音和合成真正串成可观察产物
Minimal intervention: 以《未发生的团聚》为案例，在同一区域加入真实播放器、五节拍可跳转时间轴、媒体指标、生产证据与 MiniMax TTS 调用证据；保留原有组合器继续演示架构扩展
Adjacent regression surfaces: 页面体积、MP4 Range 支持、file:// 播放、时间轴同步、移动端横向溢出、模拟与真实产物的语义边界
Observed result: 1440×1000 与 390×844 均无横向溢出；MP4 解码为 720×960/54.333 秒；第三节拍跳至 20.74 秒；播放推进并切换高亮；file:// 同样可播可跳；无 page error
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

### Revision 6 refinement ledger

```text
Current stage: 9
User phase: 故事与效果对齐的场景叙事扩展
Coverage item: 六类故事处方、五幕场景联动、规则/模型边界与跨表面操作
User goal: 把已经理解的手绘视频机制扩展为“适合的故事匹配适合的效果”的可操作产品能力
Browser environment: HTTP Range 127.0.0.1:8789 + file://；Microsoft Edge Chromium；1440×1000、768×1024、390×844；JavaScript on/off
Observed evidence: Revision 5 只能组合内容源、成片模板和生产附加项，无法解释故事为何匹配特定效果，也没有场景级导演指导
Problem category: missing product decision layer / story-effect alignment
Root cause: 原组合器从输入直接跳到 Storyboard 和渲染模板，缺少叙事语义到视觉、声音、节奏和场景功能的中间处方
Minimal intervention: 在真实案例与统一架构之间增加数据驱动叙事导演台；六类故事各有一套效果处方和五幕导演表，并将推荐模板同步到原组合器、推荐画风链接回 20 风格库
Adjacent regression surfaces: 真实案例播放器、原组合器选中状态、20 风格定位、HTTP/file 路由、1440/768/390 布局、键盘方向键、无 JavaScript 降级
Observed result: 六类故事 × 四条路由/视口检查全部命中预期标题、风格、第五幕和推荐模板；每类均为 5 幕；ArrowRight 从家庭记忆切到悬疑档案且焦点轮廓为 solid；各视口 scrollWidth 等于 bodyWidth；无 console/page/HTTP error；JavaScript 关闭后默认处方、六类名称与边界说明仍可阅读
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

### Revision 7 refinement ledger

```text
Current stage: 9
User phase: 适合的故事对适合的效果进行场景叙事扩展
Coverage item: Codex 真实白板生图、MiniMax TTS、知识解释成片、导演处方与真实媒体联动
User goal: 继续使用 Codex 生图与 MiniMax TTS，把故事—效果对齐从规则文字推进为可播放、可核验的第二类真实结果
Browser environment: HTTP Range 127.0.0.1:8789 + file://；Microsoft Edge Chromium；1440×1000、768×1024、390×844；JavaScript on/off
Observed evidence: Revision 6 的知识解释只有抽象规则与模拟舞台，没有真实白板分镜、配音、字幕和媒体结果，无法证明处方可以进入生产链
Problem category: missing real prescription output / narrative-effect alignment proof
Root cause: 故事语义到效果处方的产品决策层已建立，但处方尚未连接真实生成器、音频时间轴和最终媒体
Minimal intervention: 以《记忆不是录像带》为知识样片；五幕分别承担误区、模型、机制边界、实验证据和行动迁移；Codex 生成统一白板图，MiniMax 生成 5 段中性旁白，FFmpeg 按真实时长合成；仅在 knowledge 状态展示真实播放器并双向联动五节拍
Adjacent regression surfaces: 原家庭记忆播放器、六类处方数据、推荐模板、20 风格链接、HTTP/file 媒体加载、移动布局、键盘方向键、无脚本降级、凭证泄露
Observed result: 5/5 生图与成片抽帧通过；ffprobe 为 720×960 H.264/AAC、77.333 秒；平均 -19.3 dBFS、峰值 -2.0 dBFS；HTTP/file、1440/768/390 均可加载、播放和跳转至 28.348/44.483 秒；切换处方会暂停并隐藏；无横向溢出、console/page/HTTP error；无脚本保留直链；原 54.333 秒样片与六类导演回归通过
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

### Revision 8 refinement ledger

```text
Current stage: 9
User phase: 第三类儿童成长真实处方
Coverage item: 暖光绘本连续生图、MiniMax 温暖旁白、绘本滑页成片、3/6 真实完成矩阵
User goal: 继续补全，以与家庭记忆和知识解释差异明显的第三类故事，证明“故事结构决定效果”能够持续扩展
Browser environment: HTTP Range 127.0.0.1:8789 + file://；Microsoft Edge Chromium；1440×1000、768×1024、390×844；JavaScript on/off
Observed evidence: Revision 7 已有家庭记忆和知识解释真实媒体，但儿童成长仍只有规则处方，页面也没有整体完成度视图，用户无法一眼区分六类中的真实验证范围
Problem category: incomplete recipe validation coverage / missing cross-recipe status
Root cause: 处方系统可以表达儿童成长逻辑，却尚未验证角色/道具连续性、儿童叙事声音、绘本转场和行动式成长结尾能否进入同一真实生产链
Minimal intervention: 创作《她先学会听风》五幕；第一图建立小满与纸鸢视觉锁，后四图引用第一图独立生成；MiniMax 使用 `female-tianmei`、calm、0.96×；按真实音频时长合成 107.267 秒绘本滑页成片；children 状态联动真实媒体；增加 3 REAL / 3 RULE 可操作矩阵
Adjacent regression surfaces: 两条旧媒体、六类处方与推荐模板、移动横向滚动、三条媒体同时加载、字幕转义、HTTP/file 跳转、键盘、无脚本降级、凭证泄露
Observed result: 5/5 图保持同一角色、纸鸢、水塔和画风；字幕转义缺陷被抽帧发现并修复；ffprobe 为 720×960 H.264/AAC、107.267 秒，平均 -19.5 dBFS、峰值 -3.3 dBFS；HTTP/file 与三视口均可播放并跳到 42.124/63.089 秒；离开后暂停隐藏；3/6 矩阵数量和状态正确；三条旧/新媒体与六类导演全部回归通过；无溢出和运行错误；无脚本保留三条直链
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

## 会话交付

### Revision 9 refinement ledger

```text
Current stage: 9
User phase: 第四类悬疑档案真实处方
Coverage item: 限色木刻连续生图、MiniMax 克制旁白、证据链成片、4/6 真实完成矩阵
User goal: 继续补全，把仍停留在规则文字的悬疑档案转换为有内涵、稍复杂、可播放且可核验的真实能力演示
Browser environment: HTTP Range 127.0.0.1:8789 + file://；Microsoft Edge Chromium；1440×1000、768×1024、390×844；JavaScript on/off
Observed evidence: Revision 8 已有三种真实视觉语言，但悬疑档案仍是约 48 秒的规则处方，缺少证据可回看、可信误导、理性翻转与责任收束的真实生产证明
Problem category: incomplete recipe validation coverage / missing evidence-driven mystery output
Root cause: 规则层已经描述硬切与线索语法，但没有实际检验同一角色、物证索引、木刻限色、低沉旁白和非浪漫化结尾能否在同一媒体链中保持一致
Minimal intervention: 创作《封存之后，钟还在走》；用 5 张 Codex 三色木刻图锁定调查员、旧钟与物证；MiniMax 生成 5 段克制男声；FFmpeg 按真实时长硬切合成；仅在 mystery 状态显示真实播放器；完成矩阵提升为 4/6
Adjacent regression surfaces: 三条旧媒体、六类处方、移动横向时间轴、四条媒体初载、HTTP/file 跳转、键盘、无脚本降级、字幕安全区、凭证泄露
Observed result: 5/5 木刻图与视频抽帧通过；ffprobe 为 720×960 H.264/AAC、135.262 秒，平均 -19.5 dBFS、峰值 -2.0 dBFS；HTTP/file 和三视口均可播放并跳到 49.82/105.99 秒；离开后暂停隐藏；4 REAL / 2 RULE；四条旧/新媒体与六类导演回归通过；无溢出和运行错误；四媒体初始 performance entry 各 300 bytes；无脚本四直链；secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 10
User phase: 所有样例加入网页
Coverage item: 品牌起源、诗性独白真实处方与 6/6 全样例交付
User goal: 六类故事都必须能直接看到真实生图、MiniMax TTS、字幕成片和五点联动，而不是残留文字规则卡
Browser environment: 仓库内静态资源；Playwright / Microsoft Edge Chromium；HTTP Range 与 file:// 双路线；1440/768/390
Observed evidence: Revision 9 为 4 REAL / 2 RULE；品牌与诗性只有本地处方，缺少媒体、入口、降级直链和跨样例暂停逻辑
Problem category: missing capability proof / cross-surface completeness
Root cause: 规则层已经定义两类效果，却尚未验证品牌责任链与诗性意象链能否通过独立图像、音色、时长和合成语法成为可播放结果
Minimal intervention: 为品牌生成 5 张有机轮廓分镜和真诚青年旁白；为诗性生成 5 张水墨留白分镜、抒情男声与低幅环境声；接入两套真实播放器、五点时间轴、矩阵、文档与无脚本直链
Adjacent regression surfaces: 四条旧媒体、六类处方标题/第五幕/模板、切换暂停、移动横向时间轴、Range 初载、file://、键盘、无脚本降级、字幕安全区、API 凭证
Observed result: 品牌 H.264/AAC 720×960 134.000 秒、诗性 1280×720 127.633 秒；五幕抽帧与视觉锁通过；HTTP/file 四路线跳点、导演同步、播放与互切通过；6 REAL / 0 RULE；三宽无溢出和运行错误；六媒体初载各 300-byte entry；无脚本六直链；secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 11
User phase: 故事输入与效果自动对齐、六类横向比较
Coverage item: 自由故事输入、可解释六路评分、五幕建议、真实样片 CTA、六处方比较与跨表面回归
User goal: 在已经补齐的六条真实样片之上继续产品化，让用户能判断自己的故事适合哪种效果，并直接用真实结果验证推荐
Browser environment: Playwright / Microsoft Edge Chromium；HTTP Range 1440×1000、768×1024、390×844；file:// 1280×900；reduced-motion；JavaScript on/off
Observed evidence: Revision 10 已证明六类处方都能生成真实媒体，但用户仍需先理解分类再手动选择，页面没有“输入故事 → 解释推荐 → 验证成片”的决策闭环，也缺少六类同屏比较
Problem category: missing product decision entry / explainability / cross-recipe comparison
Root cause: 处方和媒体数据已经存在，却没有从自由文本提取显式叙事信号、对全部候选排序，并把推荐状态连接到既有 director 与媒体互斥控制
Minimal intervention: 增加完全本地的关键词与结构加权分析器、六个有内涵的快速样例、完整六路排序、五幕建议和风险；第一推荐 CTA 复用 director 状态；从现有处方数据生成六张比较卡；明确它不是实时 AI
Adjacent regression surfaces: 六类 director 状态、五点时间轴、六个播放器互斥、移动布局、HTTP/file 路由、键盘、reduced-motion、无脚本降级、媒体初始请求与 API 保密
Observed result: 六内置输入在五条 JS 路线全部命中预期第一推荐；每次均为 6 项排序、5 个节拍；短输入错误态、品牌推荐 CTA、诗性比较 CTA、键盘快速样例均通过；6 比较卡、6 REAL、三宽无溢出；无 console/page/HTTP error；无脚本保留选型规则与六直链；六媒体初载各 300 bytes
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 12
User phase: 古诗词场景介绍真实处方与 7/7 网页交付
Coverage item: 《枫桥夜泊》五幕诗境、连续水墨生图、MiniMax 抒情朗诵、低幅环境声、最终成片与七类产品入口
User goal: 选择一首适合该库机制的诗词，用真实生图、TTS 和确定性合成构建完整样片并加入演示
Browser environment: Playwright / Microsoft Edge Chromium；HTTP Range 1440×1000、768×1024、390×844；file:// 1280×900；JavaScript on/off
Observed evidence: 六条现有样片已经证明通用故事处方，但诗性独白仍是现代原创故事，尚未验证古诗原文、意象、空间、人物视角和声音能否严谨对齐，也缺少顶部直达七类真实效果的入口
Problem category: missing classical-poetry product proof / incomplete recipe discoverability
Root cause: 现有“静态分镜 + TTS + 确定性合成”具备承载古诗的技术能力，却没有把原文证据、艺术化还原边界和远近声音关系固化为独立处方
Minimal intervention: 选择张继《枫桥夜泊》；以天时、江岸、人物、空间、声音抵达构成五幕；第一图建立水墨视觉锚点，其余四图引用锚点；MiniMax 生成五段抒情解读；FFmpeg 依据真实时长生成分句字幕、低幅江水和终幕钟声；接入第七类导演、分析、比较、顶部直达与无脚本链接
Adjacent regression surfaces: 六条旧媒体、七类评分排序、导演五点联动、媒体互斥、字幕可读性、HTTP/file、桌面/平板/移动、metadata 初载、凭证泄露
Observed result: 5/5 图保持同一夜色水墨、客船、旅人和寺塔方向；第一次抽帧发现整段字幕过密并修为分句双行；MiniMax `speech-2.8-hd` / `Chinese (Mandarin)_Lyrical_Voice` / calm 生成 774 字符；最终 H.264/AAC 1280×720、116.3 秒、9265077 bytes，平均 -18.6/峰值 -2.6 dBFS；四条浏览路线均能播放、跳到 92.56 秒、由导演第四幕同步到 68.87 秒并在切换后暂停隐藏；7 REAL、7 排序、7 比较、无脚本 7 直链；三宽无溢出，无 console/page/HTTP error；七媒体初始各 300-byte metadata；secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 13
User phase: 古诗词鲜明效果扩展与明暗对照
Coverage item: 《忆江南》连续鲜明生图、MiniMax 朗诵、确定性成片、双版本切换与跨表面验收
User goal: 解决古诗词演示过暗的问题，用适合鲜明效果的诗词制作真实成片并加入网页，同时保留夜色作品作为有意义的对照
Browser environment: Playwright / Microsoft Edge Chromium；HTTP Range 1440×1000、768×1024、390×844；file:// 1280×900；JavaScript on/off
Observed evidence: Revision 12 只有《枫桥夜泊》夜色水墨，播放器、时间轴、说明和容器都以墨灰为主，容易让用户误以为古诗词处方只提供暗淡效果
Problem category: outcome fidelity / incomplete within-recipe variation / weak visual contrast
Root cause: 处方虽然强调文本决定效果，但单一夜诗样本没有可观察地证明同一类型可生成高明度、高彩度且仍受原文约束的版本
Minimal intervention: 选择白居易《忆江南·江南好》；以赞叹、熟悉、日出、红绿对照、回望五幕建立第一图锚点与四张连续分镜；MiniMax 使用抒情音色和 happy 情绪；FFmpeg 生成春水/鸟鸣、分句字幕和成片；古诗词输出加入鲜明/夜色双 tab，并把故事推荐默认连接鲜明版
Adjacent regression surfaces: 七类评分、古诗词 CTA、导演五幕、两播放器互斥、移动横向时间轴、HTTP/file、Range 初载、键盘、无脚本降级、API 凭证
Observed result: 5/5 图片与视频抽帧通过；《忆江南》为 H.264/AAC 1280×720、116.420 秒、14,616,425 bytes，平均 -18.0/峰值 -2.7 dBFS；故事样例以 93% 推荐古诗词；四条浏览路线默认鲜明版，可跳到 71.03/93.28 秒、播放推进并用 ArrowRight 切夜色版；两媒体互斥暂停；7 REAL、7 排序、7 比较、2 个古诗版本；三宽无溢出，无 console/page/HTTP error；八媒体初始各 300-byte metadata；无脚本八直链；secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 9
User phase: 古诗词讲解展示风格重构
Coverage item: 诗卷讲解真实成片、讲解/欣赏/夜色三态入口与跨表面验收
User goal: 解决诗词欣赏视频依赖底部字幕、缺少讲解意境与通用教学结构的问题，尝试更适合诗词讲解的展示风格
Browser environment: Playwright / Microsoft Edge Chromium；HTTP Range 1440×1000、768×1024、390×844；file:// 1280×900；JavaScript on/off
Observed evidence: Revision 13 的《忆江南》以全屏插画和烧录底部字幕为主，没有常驻原诗、当前句或关键词释义，适合欣赏但不适合教学
Problem category: information hierarchy / outcome-purpose mismatch / teaching readability
Root cause: 同一个欣赏模板同时承担意境和解释，导致用户必须在画面与长字幕之间切换，原诗本身没有成为操作与理解的视觉主体
Minimal intervention: 不重复调用生图或 TTS；复用五图、旁白和环境声，生成左图右卷讲解成片；原诗常驻，五幕更新当前句、关键词、释义和画面证据；页面增加讲解/欣赏/夜色三态并默认进入讲解
Adjacent regression surfaces: 古诗推荐 CTA、导演五幕、三播放器互斥、键盘 tabs、移动视频可读性、时间轴横向滚动、HTTP/file、metadata 初载、无脚本直链、凭证泄露
Observed result: 讲解成片 H.264/AAC 1280×720、116.420 秒、7,591,258 bytes，平均 -18.0/峰值 -2.7 dBFS；五点 contact sheet 的原诗、高亮、关键词、释义与画面证据均正确；四路线默认 lecture，跳到 71.03/93.28 秒并播放推进，ArrowRight 依次进入 bright/night；三媒体互斥暂停；7 REAL、3 古诗状态、5 讲解节拍；三宽无溢出，无 console/page/HTTP error；九媒体初始各 300-byte metadata；无脚本九直链；secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 15
User phase: 科技人文停电亲历、发明过程与系统意义扩展
Coverage item: 第八类科技人文处方、五幕真实媒体、事实边界、故事推荐与 8/8 网页交付
User goal: 把午夜停电带来的焦虑、燥热和顿悟转化为有情绪也有知识的演示，一方面说明电的重要，另一方面展示从实验发现到公共电力系统的形成
Browser environment: Playwright / Microsoft Edge Chromium；HTTP 1440×1000、390×844；file:// 1280×900
Observed evidence: Revision 14 已有七类处方和九条媒体，但缺少能够把真实体验、发明史、基础设施依赖与主观观点分层表达的科技人文样例
Problem category: missing technological-humanities prescription / personal-to-system narrative alignment
Root cause: 既有知识白板从概念模型出发，诗性独白从意象出发，都无法同时承载停电的身体经验、可核验年代、多人协作史和当代系统依赖
Minimal intervention: 创作《停电以后，我看见了电》；以缺席、显影、发现、成网、回望五幕组织；Codex 生成同一现代房间首尾闭环与匿名历史装置；MiniMax 生成真诚成年普通话旁白；FFmpeg 合成事实卡、句级字幕、静默/启动环境声；接入科技人文导演、评分、比较、矩阵和真实播放器
Adjacent regression surfaces: 七类旧处方、九条旧媒体、古诗三态、八路排序、五点跳转、切换暂停、移动布局、file://、metadata 初载、API 凭证、历史表述
Observed result: 5/5 图连续且无生成文字或伪名人肖像；最终 H.264/AAC 1280×720、115.833 秒、12,479,680 bytes，平均 -23.2/峰值 -4.7 dBFS；三条浏览路线默认科技人文并可跳到 41.16 秒；停电样例第一推荐正确；8 REAL、8 排序、8 比较、10 个 metadata-only 视频；切换后暂停隐藏；三宽无溢出，无 console/page error；史实与主观观点分层，凭证未进入仓库
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 9
User phase: 科技人文停电体验与电力依赖显影
Coverage item: 六状态可恢复体验、Web Audio 反馈、五级供电路径、四类设备解释、进入正片与跨表面降级
User goal: 补全此前只用语言描述的效果，让用户在网页中亲手经历“电消失—依赖显影—理解系统—进入故事”的完整逻辑
Browser environment: Playwright / Microsoft Edge Chromium；HTTP 1440×1000、390×844；file:// 1280×900；390×844 reduced-motion
Observed evidence: Revision 15 的科技人文区直接提供播放器与五点时间轴，成片能表达故事，但用户没有操作前因，也无法探索电从哪里来到不同设备为何失效
Problem category: interaction gap / experiential-to-system translation / progressive disclosure
Root cause: 叙事逻辑只存在于成片和说明文字中，没有被编码为可观察状态、设备反馈和可选择的依赖关系
Minimal intervention: 在正片前增加 powered、outage、phone、reveal、ready、restore 状态机；复用首幕视觉做房间舞台，以 CSS/SVG 表达设备状态和供电路径；Web Audio 合成断电/复电提示；ready 状态提供五级路径和四个设备视角；增加跳过、恢复、Escape、进入正片与低动态路径
Adjacent regression surfaces: 十条旧媒体、8/8 矩阵、八类导演与推荐、科技五点跳转、媒体互斥、HTTP/file、桌面/移动、metadata 初载、键盘、ARIA、reduced-motion、无脚本和凭证保密
Observed result: 桌面完整时序依次到达 outage、phone、reveal、ready；手机、file 和低动态路径均可直达相同信息；风扇、灯光和 LED 状态语义一致；四个设备按钮同步选中态、标题和事实边界；进入正片后焦点正确且播放推进；Escape/恢复回到 powered；四个表面无溢出、无 console/page/HTTP error；10 个 MP4 初载各 300 bytes；旧推荐、跳点和切换暂停均通过
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

```text
Current stage: 9
User phase: 知识推广教育产品化
Coverage item: 产品首屏、结构化简报、五幕教学、八类匹配、可信边界、理解题、生产包与真实样片闭环
User goal: 把“复杂知识转为愿意看、能够懂、记得住的视频”从对话定位落成可实际操作的完整产品，而不是继续围绕停电案例扩展
Browser environment: Playwright / Microsoft Edge Chromium；HTTP 1440×1000、768×1024、390×844；file:// 1280×900；390×844 reduced-motion
Observed evidence: Revision 16 首屏仍以 GitHub 能力研究和流水线为中心，摘要残留 7 条样片；已有故事匹配器没有受众、学习目标、误解、材料、可信边界、理解检测或生产包，无法形成知识教育闭环
Problem category: product positioning / incomplete educational journey / trust and assessment gap
Root cause: 既有页面从开源能力和故事类型出发，没有把知识传播的成功标准编码为输入 schema、教学结构、事实审阅和学习结果
Minimal intervention: 重构产品首屏；新增结构化知识工作台、科学/文化/公共系统三预设、本地八类评分、五幕教学详情、四层可信边界、三道理解题、生产清单、knowledge-video-plan/v1 下载和真实样片路由；更新使用场景与四层扩展方向；保留全部研究证据
Adjacent regression surfaces: 原能力控制台、20 风格、故事分析器、八类导演、十条媒体、古诗三态、停电六状态、HTTP/file、桌面/平板/移动、键盘、reduced-motion、无脚本、metadata 初载与凭证隔离
Observed result: 五个 JavaScript 表面中，科学/文化/公共系统分别推荐 knowledge/classical/technology；5 幕、4 边界、3 道题和 8 项排名完整；错误聚焦、方向键、答案展开、JSON 下载和真实样片路由通过；另有 390px no-script 路线保留产品方法与十条 MP4 直链；三宽无溢出，无 console/page error；十个视频 HTTP 初载各 300 bytes；独立停电体验回归再次通过；自有文件 secret scan=0
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

1. **项目与阶段**：知识可视化叙事产品 + 固定开源能力研究台；Revision 17 / Stage 9 已完成“知识意图 → 教学设计 → 五幕视觉叙事 → 可信边界 → 理解检测 → 生产交付 → 真实样片验证”。
2. **已完成**：产品化首屏、七字段知识简报、三类完整预设、八类效果匹配、五幕方案、四层边界、三道理解题、生产清单与 JSON 下载；原 20 风格、八类处方、十条成片、古诗三态和停电互动全部保留。
3. **剩余或延后**：当前是可用的静态规划 MVP，不会为任意新主题直接调用生图/TTS；真实服务仍需安全后端、来源数据库、专家审批、单幕重生成、任务队列、成本/重试和学习效果数据。规则评分可解释，但不等于大模型语义理解。
4. **证据**：HTTP/file、1440/768/390、键盘、错误恢复、JSON 下载、reduced-motion、no-script、媒体路由、metadata-only 与停电回归均通过；详细结果在 `EVIDENCE.md`，产品报告在 `browser-evidence/knowledge-product/report.json`。
5. **下一会话首先做什么**：若继续走向在线服务，先实现受保护的 generation job API，把导出的 `knowledge-video-plan/v1` 转成可审阅的单幕生图、MiniMax TTS 和合成任务；若交付当前 MVP，则推送分支并创建合并请求。

## Revision 18 refinement ledger

```text
Current stage: 9
User phase: 暂不完善其他细节，只看生成效果
Coverage item: 《天空为什么是蓝色的？》五幕连续生图、MiniMax 正式成片、首要网页入口与四路线验收
User goal: 用一条有知识含量、色彩鲜明且画面连续的实际成片判断该库整合后的生成质量
Browser environment: Playwright / Microsoft Edge Chromium；HTTP Range 1440×1000 与 390×844；file:// 1280×900；HTTP 390×844 JavaScript off
Observed evidence: 五图保持同一学生、黄外套、蓝背包、屋顶和城市；机制幕以白光分色、蓝光多向散射和日落长光程形成可读因果；MiniMax `speech-2.8-hd` / `female-chengshu` / calm / 0.92× 成功生成五段正式旁白；最终 MP4 为 H.264/AAC 1280×720、30fps、107.233 秒；页面常驻最新效果区，5 点均可鼠标与键盘跳转；四路线 overflow=0、duration 正确、无 console/page error；HTTP 下 11 个 MP4 均只有 300-byte metadata entry
Problem category: outcome proof / focal hierarchy / generated-media continuity
Root cause: 旧页面虽然具备十条真实媒体与完整工作台，但首要入口仍要求先理解功能，且没有一条高明度科学机制样片用于直接比较角色一致性、抽象知识可视化和色彩推进
Minimal intervention: 选择“天空为什么是蓝色”作为高辨识度科学主题；Scene 01 锁定人物与空间，Scenes 02–05 引用锚图；FFmpeg 添加克制镜头运动、事实卡、句级字幕和环境声；把最新样片放到工作台之前并保留原有十条媒体
Adjacent regression surfaces: hero CTA、产品工作台、十条旧媒体、HTTP/file、桌面/移动、键盘、no-script、metadata 初载、API 密钥隔离
Observed result: 最新效果成为页面最短路径；视觉机制、连贯性、色彩高潮与声音表现均可直接判断；所有浏览器与工程检查通过；媒体清单标记 `reviewCut=false`，本地 `.env` 被 Git 忽略且密钥未出现在日志、网页、媒体清单或提交文件中
Decision: pass
Next executable action: none
New authority required: 仅推送或合并需要后续决定
```

1. **项目与阶段**：知识可视化叙事产品；Revision 18 / Stage 9 已完成“优先看生成效果”的正式媒体交付。
2. **已完成**：Codex 内置生图生成五幕连续科普画面；MiniMax 生成五段正式中文旁白；确定性合成 107.233 秒 H.264/AAC 成片；网页增加首要最新效果区和五点时间轴。
3. **剩余或延后**：当前范围无未完成项；本地 `.env` 继续由 Git 忽略，不进入仓库。
4. **证据**：`browser-evidence/sky-blue/report.json` 覆盖 HTTP/file、1440/1280/390、键盘、no-script、11 媒体 metadata-only；contact sheet 与逐幕图证明视觉连续性。
5. **下一会话首先做什么**：直接在网页播放正式版并反馈需要强化的具体幕、声音情绪或节奏；不再需要配置 TTS。
