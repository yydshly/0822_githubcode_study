# 交付覆盖表

| 用户阶段 | 要求或产物 | 表面 / 状态 | 所需证据 | Owning stage | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 定制样例 | 可运行的文章 + 3D 舞台 | 默认首章 / 桌面 | 浏览器截图、DOM 状态 | 1-3 | pass | `desktop-final.png`、无运行错误 |
| 类似并扩展 | 三章状态改变场景 | flood/channel/settled | 浏览器状态与截图 | 5-6 | pass | 三章导演状态和动作已验证 |
| 演示驱动 | 自动串联三章 | autoplay start/stop | 交互状态日志 | 5 | pass | 29.548 秒、12 节拍自然速度全程无漏拍并可停止 |
| 阅读体验 | 章节、分段朗读、声音、主题 | light/dark/speech/audio | 浏览器交互 | 4-7 | pass | 用户选段、夜读和 Speech Synthesis 状态已验证 |
| 多端 | 桌面、平板、390px 手机 | 1440/900、820/1180、390/844 | 最终截图 | 7 | pass | 三个最终视口无页面级溢出 |
| 无障碍 | 键盘、焦点、reduced-motion | keyboard / reduced | 交互与 computed state | 7 | pass | Tab、方向键、Escape、焦点轮廓和 reduced-motion 通过 |
| 降级 | WebGL 不可用仍可阅读 | fallback | 浏览器禁用 WebGL 证据 | 8 | pass | CSS 山水与三章导航仍可用 |
| 工程 | 静态运行与资源自包含 | canonical URL | HTTP 状态、控制台、文件 | 8-9 | pass | 本地 Three.js，无失败请求与控制台错误 |
| 文档 | README、实验日志、验证、索引 | repository | 文件检查 | 9 | pass | README、NOTES、VALIDATION、契约和索引齐全 |
| 完整开场 | 沉浸进入 / 直接阅读 | intro foreground / focus | 截图、点击、Escape/焦点观察 | 2-5 | pass | 两条入口、背景 inert 和开场焦点通过 |
| 全程导演 | 三章分镜、同步动作、结尾 | autoplay / cue / completed | 全程浏览器状态日志和结尾截图 | 5-6 | pass | 1× 29.548 秒记录 12/12 节拍并抵达终章 |
| 观景与全屏 | 隐藏阅读区并可恢复 | look mode / fullscreen | 桌面与手机交互证据 | 4-7 | pass | 手机 100dvh 观景、全屏进入/退出、Escape 通过 |
| 字幕与声音 | 导演字幕、连续环境声、可静音 | captions / ambience / speech | DOM 状态与音频上下文观察 | 5-7 | pass | 字幕显隐与三章水/风/雨目标同步通过 |
| 最终收束 | 完成卡、重播、返回文章 | ending foreground | 截图、键盘与恢复证据 | 5-7 | pass | 终章焦点、重播/返回与状态保留通过 |
| 修订多端回归 | 完整链路跨视口/主题/输入 | 1440、820、390 / light-dark / keyboard | 最终截图和自动化日志 | 7 | pass | 23 项浏览器矩阵、9 张最终证据通过 |
| 修订性能与降级 | 新增时间线/声音不拖慢渲染 | runtime / reduced / no-webgl | 帧观察、模拟偏好与禁用 WebGL | 8 | pass | 16.67ms 平均帧；reduced-motion 与 fallback 通过 |
| 修订文档闭环 | README/VALIDATION/覆盖表反映最终行为 | repository | 文件检查 | 9 | pass | README、NOTES、VALIDATION、契约和覆盖表已同步 |
| 用户主导朗读 | 播放时动态高亮；任意段落选播；上一段/下一段 | speech / paragraph / keyboard | 点击、键盘、DOM 高亮与语音状态日志 | 4-7 | pass | 点击第 3 段、下一段和 Enter 选段均接管播放 |
| 阅读型 UI | 紧凑控件不抢正文；移动端可达 | desktop/mobile reading controls | 最终截图、控件尺寸与溢出观察 | 2-7 | pass | 390px 底栏 49px、按钮 26–40px、无溢出 |
| 修订 3 参考 | 原网页桌面/390px 与方案 1 真值 | source / selected mock | 两张原网页截图、选中设计图 | 0-2 | pass | 1440/390 原网页已捕获，方案 1 已明确选定 |
| 四段视觉资产 | 四幅统一风格本地图片 | flood/blocked/channel/settled | 本地文件和逐图检查 | 2 | pass | 四幅 1122×1402 WebP 均已逐图检查，总计约 1MB |
| 左文右景重构 | 默认 40/60、无开场与低质量 3D | desktop reading | 1440px 浏览器截图、DOM 尺寸 | 2-4 | pass | 实测左 561.6px / 右 878.4px，无开场、无 Three.js 运行依赖 |
| 用户主导选段 | 点击/Enter/上下段改变当前段和右图 | selected / keyboard | 状态日志与截图 | 4-6 | pass | 朗读第一段时点第三段，语音、焦点、图片与 `#channel` 同步接管 |
| 语音跟随 | 全文自动续播、动态高亮、自动滚动 | speaking / paused / completed | 模拟语音浏览器证据 | 5-6 | pass | 开始、暂停/继续、用户接管、上下段与自动续播状态机已验证 |
| 修订 3 移动端 | 原参考式上景下文 | 390×844 | 最终截图与无溢出观察 | 7 | pass | 上景 405px、正文自 y=405 开始、无横向溢出 |
| 修订 3 降级 | 图片失败/reduced-motion 不阻断 | fallback / reduced | 代码路径与浏览器证据 | 8 | pass | 图片错误提供文字说明；reduced-motion 关闭过渡；正文与朗读独立可用 |
| 设计对照 QA | 方案 1 与实现同视口比较 | 1440×900 active paragraph | 合并对比和 design-qa.md | 9 | pass | 全景与聚焦对照完成，P0/P1/P2 为零，`design-qa.md` 为 passed |
| 修订 3 文档闭环 | README/VALIDATION/NOTES/coverage 更新 | repository | 文件检查 | 9 | pass | README、NOTES、VALIDATION、契约、覆盖表和 QA 已同步 |
| 修订 4 基线 | 现有单篇四段使用浏览器 SpeechSynthesis | desktop / speech | 既有浏览器状态日志与 DOM | 0-1 | pass | 已确认当前只有四段、无章节实体、无本地语音资产 |
| 多章节信息层级 | 一篇文章 → 四章 → 每章两段 | chapter / paragraph / toc | DOM 层级、目录与状态日志 | 3-4 | pass | DOM 与目录均实测 4 章 8 段，章节/段落层级独立 |
| MiniMax 语音资产 | 八段 speech-2.8-hd 本地音频 | 8 paragraph audio files | 生成清单、文件时长与浏览器载入 | 5-8 | pass | 八段 MP3 均生成并可解析，25.956–28.908 秒，manifest 完整 |
| 音频播放状态机 | 播放/暂停/选段接管/段末续播 | playing / paused / ended / switched | 模拟与真实 audio 浏览器日志 | 5-6 | pass | 真实 audio 启动、暂停/恢复、播放中选段与 ended 续播全部通过 |
| 章节与段落导航分工 | 顶栏翻章、底栏翻段、目录分章 | mouse / keyboard / hash | 浏览器交互和 DOM 状态 | 4-7 | pass | 第三章翻章进入第四章；目录选段恢复 chapter/title/hash |
| MiniMax 降级 | 音频失败时系统语音接管 | audio error / file direct | 浏览器故障注入证据 | 6-8 | pass | 阻断 MP3 后单次系统语音接管；file:// 本地 MP3 正常载入 |
| 修订 4 多端回归 | 桌面与 390px 均可选章选段听读 | 1440×900 / 390×844 | 最终截图、溢出与交互观察 | 7 | pass | 39/61 桌面与 405px 手机上景无溢出，章节标题和播放器清楚可达 |
| 修订 4 文档闭环 | README/VALIDATION/NOTES/ledger/coverage | repository | 文件检查与终端审计 | 9 | pass | README、VALIDATION、NOTES、ledger、契约与覆盖表均已同步 |
| 修订 5 视觉基线 | 66/60px 底部播放条挤压桌面并遮挡手机正文 | desktop/mobile playback | 修订 4 截图与 DOM 尺寸 | 1-3 | pass | 桌面常驻 66px，手机 fixed 60px；用户确认其影响视觉 |
| 移除常驻播放器 | 页面不再渲染底部播放条 | idle / playing / paused | DOM、桌面/手机截图 | 3-4 | pass | `.audio-player` 为 0；桌面阅读区增至 842px；手机无 fixed 底部控件 |
| 隐式进度反馈 | 当前段高亮 + 桌面 2px 边界轨迹 | playing / paused / idle | computed style 与进度状态 | 4-6 | pass | 播放 opacity .68；第 6/8 段轨迹 62.5%；空闲隐藏、手机不显示 |
| 播放控制保留 | 标题入口与当前段小按钮完成播放/暂停/选段 | mouse / keyboard / audio | 浏览器交互状态日志 | 4-7 | pass | MiniMax 启动、标题按钮、段内按钮、Ctrl+Space、选段接管与回退通过 |
| 修订 5 多端回归 | 桌面/390px 正文不再被播放器遮挡 | light/dark / 1440/390 | 最终截图、溢出和可见高度 | 7 | pass | 桌面/手机无底栏、无溢出；夜读轨迹与段落状态保持清晰 |
| 修订 5 文档闭环 | contract/coverage/ledger/validation/README/QA | repository | 文件检查与终端审计 | 9 | pass | 契约、覆盖、ledger、验证、README、QA 与证据已同步 |
| 修订 6 基线 | 标题播放入口单独占一行，阅读区无快速定位 | desktop/mobile reading | 修订 5 截图、DOM 与布局尺寸 | 1-3 | pass | 当前按钮位于 `.title-row` 之后并有独立上下留白；不存在阅读定位控件 |
| 标题内联播放 | 播放当前段落紧跟主标题且不独占一行 | idle/playing/paused · desktop/mobile | DOM 层级、元素矩形与截图 | 3-4 | pass | 按钮属于标题行；桌面/手机与 h1 垂直中心差均为 0.99px |
| 左侧阅读定位 | 文首、当前段、文末三枚竖向小控件 | top/current/end · playing/paused | 点击、滚动位置、音频与选段状态日志 | 4-6 | pass | 桌面/手机三种定位通过；`#channel-open`、音频源和播放状态不变 |
| 修订 6 多端回归 | 定位控件不遮挡正文，日夜/键盘/音频保持 | 1440×900 / 390×844 / light-dark / keyboard | 最终截图、溢出、焦点与交互观察 | 7 | pass | 手机控件 x=4–35、内容最左 x=38；无溢出；主题、Ctrl+Space、MiniMax 与回退均通过 |
| 修订 6 文档闭环 | contract/coverage/ledger/validation/README/QA | repository | 文件检查与终端审计 | 9 | pass | 契约、覆盖、ledger、验证、README、QA 与最终证据已同步 |
| 修订 7 密度基线 | 1440px 左栏正文固定 470px、两侧约 46px | desktop reading / idle | DOM 矩形与修订 6 截图 | 1-3 | pass | reading=561.59px、story=470px、外侧留白约45.8px；用户确认体感偏空 |
| 左栏正文扩宽 | 扩大正文有效宽度并保持舒适行长 | 1440 / 820 / light-dark | DOM 尺寸、截图、溢出观察 | 3 | pass | 1440 story=517.59px、两侧22px；820 story=321px、两侧24px，均无溢出 |
| 修订 7 多端回归 | 定位控件不压文，手机布局不被桌面密度调整影响 | 1440×900 / 820×900 / 390×844 | 截图、元素矩形、播放与定位日志 | 4-7 | pass | 三视口无遮挡/溢出；MiniMax、选段、三种定位、主题与键盘保持通过 |
| 修订 7 文档闭环 | contract/coverage/ledger/validation/README/QA | repository | 文件检查与终端审计 | 9 | pass | 契约、覆盖、ledger、验证、README、QA 与最终证据已同步 |
| 修订 8 产品基线 | 全文同页、无书架/恢复、只有一种朗读表达 | library / reader / persistence | DOM、数据与用户旅程检查 | 0-1 | pass | 已确认现状为 4 章 8 段同页装载；MiniMax 生成器和静态资源可复用 |
| 书籍展厅 | 继续阅读、最近记录、可读书与策划中书籍 | library / fresh / returning | 浏览器截图、localStorage 状态 | 2-5 | pass | 首次显示今日推荐；回访显示章/模式/进度与最近段落 |
| 单章阅读 | 每次只渲染当前章，目录与旧链接可跳章 | chapter / legacy hash / toc | DOM 数量、路由日志、键盘 | 3-6 | pass | 各章始终只挂载 2 段；旧 `#settled-memory` 自动规范化为新路由 |
| 阅读恢复与历史 | 保存章/段/模式/音频位置/时间并可继续 | reload / reopen / history | 重载前后状态、展厅卡片 | 4-6 | pass | 第二章故事模式 3 秒位置被保存，继续后播放恢复至 2.5 秒以上 |
| 章末自动续播 | 段内连播、章末卡、5 秒可取消下一章 | playing / countdown / cancel / completed | 模拟 ended 与真实交互日志 | 5-7 | pass | 停留、手动继续、真实 5 秒续章和末章回展厅均通过 |
| 三种叙事模式 | 简明讲解、沉浸故事、史料导读正文与音频匹配 | explain / story / source | 文本差异、音频源、生成清单 | 3-8 | pass | 8 段 × 3 模式、24 条本地 MP3；切换正文和 currentSrc 一致 |
| 修订 8 体验修复 | 夜读对比、控件名称/热区、移动播放可见场景 | desktop / 820 / 390 / dark / keyboard | computed style、截图与无障碍快照 | 3-7 | pass | 夜读标题 230/223/208 对 27/29/25；390px 播放场景 112px、无溢出 |
| 修订 8 完整旅程 | 展厅→继续→切模式→朗读→续章→返回展厅 | HTTP / file / desktop / mobile | Playwright 完整链路与截图 | 7-9 | pass | 1440/820/390、HTTP/file、用户选段、恢复、续章全部通过且零错误 |
| 修订 8 文档闭环 | contract/coverage/ledger/validation/README/QA | repository | 文件检查与终端审计 | 9 | pass | 契约、覆盖、ledger、验证、README、QA 与 7 张证据已同步 |
| 修订 9 定时基线 | 朗读没有自动停止能力 | playing / paused / chapter-end | 页面与状态机检查 | 0-1 | pass | 已确认现有续播只会段内前进或章末 5 秒续章 |
| 紧凑定时控件 | 15/30 分钟、本段/本章结束、取消 | timer popover / active / cancel | 浏览器交互、ARIA 与截图 | 3-6 | pass | 4 个选项、动态剩余时间、取消、ARIA 状态和 Escape 焦点返回通过 |
| 定时优先级 | 到点/段末/章末停止优先于自动续播 | minute-expired / segment-ended / chapter-ended | 时间推进和 ended 状态日志 | 5-6 | pass | 分钟到点保存秒数；本段不续段；本章显示总结但不启动 5 秒续章 |
| 修订 9 相邻回归 | 桌面/390、日夜、Escape、既有朗读与路由 | desktop / mobile / dark / keyboard | 浏览器矩阵与无错误记录 | 7-9 | pass | 390px 浮层 top=176/right=8/overflow=0；修订 8 全旅程复跑通过 |
| 修订 10 渐弱基线 | 定时到点会立即停止，听感可能突兀 | minute last 8s / audio / ambience | 状态机与浏览器音量观察 | 0-1 | pass | 已确认当前计时只在 expiresAt 后执行 stopPlayback，无收尾阶段 |
| 定时柔和收尾 | 最后 8 秒旁白/环境声渐弱，取消后恢复 | fading / cancel / expired / replay | 时间推进、audio.volume 与状态反馈 | 5-6 | pass | 模拟剩余约3.5秒时 volume=0.405、phase=fading；取消与到点后均恢复为1 |
| 修订 10 回归闭环 | 段末/章末定时、移动端和原旅程不受影响 | segment/chapter / 390 / full journey | timer 专项、修订 8 脚本与文档 | 6-9 | pass | 定时专项与修订8完整旅程均通过，page/console error=0 |
| 修订 11 计划基线 | 无每日目标、提醒时间或今日进度 | library / reader / local state | 页面与存储检查 | 0-1 | pass | 已确认展厅只有继续阅读与历史，阅读时长未建模 |
| 阅读计划设置 | 启停、时间、频率、10/15/30分钟目标 | plan dialog / saved / disabled | 表单、localStorage、键盘与焦点 | 4-6 | pass | 默认20:30/每天/15分钟；保存00:00/每天/10分钟、关闭和Escape焦点返回通过 |
| 今日计划反馈 | 展厅紧凑计划栏与可见阅读时长累计 | empty / active / completed / new day | 状态文本、进度和时间日志 | 3-6 | pass | 前台2.3秒写入2.331秒；临界目标触发完成态；旧日期重置为0 |
| 计划提醒 | 页面内到时提醒与显式通知权限入口 | due / reminded / default/granted/denied | 时间推进、toast、通知语义 | 5-8 | pass | 00:00计划即时站内提醒并只记一次；保存前后Notification.permission均denied，未自动申请 |
| 修订 11 回归闭环 | 桌面/390、日夜、定时和原阅读旅程 | desktop/mobile / theme / full journey | 浏览器矩阵、截图与文档 | 7-9 | pass | 移动弹层350px/左右20px/overflow0；plan/timer/v8三套脚本均通过 |
| 修订 12 展厅基线 | 单本可读、两本策划中；主推荐与最近阅读仅指向大禹 | library / fresh / returning | 桌面与390px截图、DOM和存储 | 0-1 | pass | 基线桌面/手机已捕获：主推荐成立，书架仍有2个不可读占位 |
| 多书数据与路由 | 至少两本真实可读；book→chapter→segment 路由与旧链接兼容 | fresh / legacy / direct-link | 数据检查、路由日志、刷新恢复 | 3-6 | pass | 两书直达/跨书hash/file通过；v2迁移v3；旧`#settled-memory`规范化 |
| 持续阅读首页 | 今日推荐、书架状态和按书去重的最近阅读 | fresh / returning / completed | 桌面/390px明暗截图与交互 | 2-7 | pass | 2本可读+1本策划中；推荐按日期轮换；历史按书去重2项；390px overflow0 |
| 多书沉浸阅读 | 每本标题/目录/正文/来源/画面/三模式MiniMax音频一致 | book×chapter×mode | 浏览器播放、图片和音频证据 | 4-8 | pass | 丝路3章6段、3幅WebP、18条新MP3；选段切源、画面和模式一致 |
| 修订 12 回归闭环 | 计划、定时、大禹旧旅程、file/HTTP、键盘与移动端 | full matrix | 自动化日志、最终截图与文档 | 7-9 | pass | r12/plan/timer/v8四套通过；5张最终证据；page/console error=0 |
| 修订13导入基线 | 展厅无导入入口；内容集中在兼容JS数据 | library / source / desktop-mobile | r12截图、DOM与数据检查 | 0-1 | pass | 导入收为顶栏次级动作，推荐、计划和继续阅读主层级不变 |
| 标准Book Schema | 版本、书/章/段/模式/媒体可选字段与校验 | built-in / imported / invalid | schema、fixture与加载日志 | 3-6 | pass | 1.0 JSON Schema、模板和两本内置JSON经Draft 2020-12校验全部通过 |
| 本地文件导入 | JSON/TXT/MD解析、IndexedDB持久化、重名与移除 | import / reload / remove / error | 浏览器文件交互与存储日志 | 4-7 | pass | JSON重名生成my-book-2；TXT识别2章3段；Markdown 2章4段重载保留；错误JSON和两步移除均通过 |
| 无媒体阅读降级 | 单原文模式、无图片占位、系统语音 | raw text / no media / speech fallback | 浏览器阅读与状态证据 | 5-8 | pass | 原文模式、2个文字场景和系统语音状态实测；audio currentSrc为空且无假MiniMax标识 |
| 修订13体验矩阵 | 弹层、桌面/390、日夜、键盘、错误/成功/空状态 | full matrix | 截图、焦点、溢出与可访问性 | 2-8 | pass | 390px弹层宽350、高613.78、overflow0；键盘焦点循环、Escape、状态播报和返回焦点已实现 |
| 修订13回归闭环 | plan/timer/r12/v8、HTTP/file、文档与终端审计 | regression | 自动化日志与文档 | 7-9 | pass | r13/r12/plan/timer/v8均通过；旧reader脚本因依赖修订8前全章DOM而退役，不代表产品失败 |
