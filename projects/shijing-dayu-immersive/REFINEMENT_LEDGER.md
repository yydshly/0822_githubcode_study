# 修订 4 精修记录

## 修订 11 · 每日阅读计划基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 继续实现每日阅读计划与提醒
Coverage item: 修订 11 计划基线 / 阅读计划设置 / 今日计划反馈 / 计划提醒
User goal: 把偶发打开变成可持续阅读习惯，同时不给纯静态网页虚构关闭浏览器后仍可靠推送的能力
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 390×844
Observed evidence: 展厅已有继续阅读和历史记录，但没有目标时长、提醒时间、频率、今日累计或通知权限入口
Problem category: habit loop + local persistence + capability boundary
Root cause: 当前本地状态只保存读到哪里，没有建模“今天是否读过、读了多久、何时提醒”
Minimal intervention: 展厅增加一条紧凑计划栏和临时设置弹层；独立localStorage保存计划；仅在阅读器前台可见时累计；页面打开时提醒，通知权限只由显式按钮申请
Adjacent regression surfaces: 展厅首屏密度、继续阅读、历史、日夜、390px、睡眠定时、章末弹层、Escape/焦点、HTTP/file
Observed result: 基线、默认值和能力边界已记录，进入 Stage 3–8
Decision: continue
Next executable action: 实现计划数据、设置弹层、前台计时与到时提醒并进行真实浏览器验证
New authority required: none；用户在明确推荐“每日阅读计划与提醒”后回复继续
```

## 修订 12 · 多书展厅基线与闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 持续阅读首页与内容扩展
Coverage item: 修订12全部行
User goal: 让书籍展厅不再只是单本入口，并能在厚书、多书环境中自然发现、恢复和持续阅读
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 390×844 / file://
Observed evidence: 基线为1本可读+2本策划中；最终为2本可读+1本策划中，丝路3章6段、18条MiniMax音频和3幅原创WebP；最近阅读按书去重2项；v2迁移v3；手机书卡358px、播放视觉112px、overflow0
Problem category: information architecture + content completeness + state isolation
Root cause: 原数据与本地状态均以单本`book`为根，策划卡没有真实阅读目标，历史记录无法区分书籍
Minimal intervention: 保留现有展厅与阅读器构图，扩展books数据、book-id路由与按书状态；把一个占位书升级为完整内容，不新增账户、CMS或大首页模块
Adjacent regression surfaces: 今日计划、定时渐弱、章末续播、大禹旧链接、HTTP/file、桌面/手机、日夜主题、MiniMax故障回退
Observed result: r12端到端、plan、timer和v8四套浏览器脚本均通过；page/console error=0；最终五张r12截图逐图检查无P0/P1/P2
Decision: pass
Next executable action: none；修订12范围已关闭
New authority required: none
```

## 修订 11 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 继续实现每日阅读计划与提醒
Coverage item: 阅读计划设置 / 今日计划反馈 / 计划提醒 / 修订 11 回归闭环
User goal: 用低干扰的每日目标与到时提醒形成可持续阅读习惯，并清楚区分站内提醒和后台推送能力
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 390×844 / light-dark
Observed evidence: 默认20:30/每天/15分钟；保存00:00/每天/10分钟后localStorage版本1正确；前台阅读2.3秒写入2.331秒；599秒后继续触发完成；旧日期重置；保存前后通知权限均denied
Problem category: resolved
Root cause: 已由独立计划存储、日期隔离、前台可见计时器、到时检查和显式通知授权入口消除
Minimal intervention: 展厅新增一条无卡片堆叠的计划栏；设置仅在临时弹层出现；不增加后台服务、账号或虚假的关闭浏览器推送承诺
Adjacent regression surfaces: 展厅密度、继续阅读、历史、日夜、390px、睡眠定时、章末、Escape/焦点、HTTP/file均复测
Observed result: 移动弹层top167.66/bottom676.34/左右20/overflow0；plan、timer和修订8完整旅程均无page/console error
Decision: pass
Next executable action: none；本地每日计划范围已关闭
New authority required: none
```

## 修订 10 · 定时声音收束基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 继续优化定时听感
Coverage item: 修订 10 渐弱基线 / 定时柔和收尾
User goal: 定时结束不突然掐断声音，适合长时间或睡前听读，同时取消后不留下低音量状态
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · MiniMax primary audio
Observed evidence: 分钟定时当前每秒检查 expiresAt，到点保存后立即 pause；HTMLAudioElement.volume 始终为1，环境声也只在 stop 时归零
Problem category: temporal feedback + audio comfort
Root cause: 计时器只有 active/expired 两态，没有 finishing 状态和音量包络
Minimal intervention: 最后8秒使用250ms tick，将 MP3 volume 和已开启环境声目标增益按剩余比例降至0；取消/改期/重播恢复默认音量
Adjacent regression surfaces: 暂停/恢复、取消、到点保存、本段/本章结束、环境声开关、系统语音回退、390px、原完整旅程
Observed result: 基线与能力边界已记录，进入 Stage 5–8
Decision: continue
Next executable action: 接入收尾音量包络并用浏览器推进到剩余4秒/到点验证
New authority required: none；用户明确要求继续上一轮建议
```

## 修订 10 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 继续优化定时听感
Coverage item: 定时柔和收尾 / 修订 10 回归闭环
User goal: 到点前自然收束声音，取消或再次播放时不残留低音量
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · MiniMax story audio · 1440×900 / 390×844
Observed evidence: 浏览器时间推进到约剩3.5秒时 audio.volume=0.405、timerPhase=fading、按钮名称为柔和收尾；取消后volume=1；再次设定并到点后playback=idle且volume=1，audioTime已保存
Problem category: resolved
Root cause: 已由8秒线性音量包络、250ms tick和统一 restorePlaybackVolume 恢复点消除
Minimal intervention: 不增加新控件；只扩展既有分钟定时状态，环境声目标增益使用同一比例；系统语音回退维持到点停止边界
Adjacent regression surfaces: 暂停/取消/到点、本段/本章、章末续播、模式、恢复、展厅与390px完整复测
Observed result: timer专项与修订8完整旅程均通过；无page error、console error或响应式回归
Decision: pass
Next executable action: none；定时渐弱范围已关闭
New authority required: none
```

## 修订 9 · 朗读定时基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 朗读定时能力
Coverage item: 修订 9 定时基线 / 紧凑定时控件 / 定时优先级
User goal: 长时间听读时可以放心离开或入睡，系统在明确时机停止，又不增加影响阅读的大播放器
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 390×844
Observed evidence: 当前只有手动暂停；段末会进入下一段，章末会启动 5 秒自动下一章，没有自动停止或剩余时间反馈
Problem category: playback control + temporal state + density
Root cause: 既有状态机只建模播放、暂停、段末和章末，没有用户声明的停止边界
Minimal intervention: 顶栏增加一枚计时图标与轻量浮层；支持 15/30 分钟、本段/本章结束；计时优先于既有自动续播；不持久化跨会话计时
Adjacent regression surfaces: 用户选段、暂停/恢复、章末卡、5 秒自动续章、展厅返回、夜读、390px、Escape/焦点、HTTP/file
Observed result: 基线与验收边界已记录，进入 Stage 4–7 实现和验证
Decision: continue
Next executable action: 增加语义控件、定时状态机并用浏览器推进时间和 ended 事件
New authority required: none；用户明确指出定时能力重要并要求不要遗漏
```

## 修订 9 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 朗读定时能力
Coverage item: 紧凑定时控件 / 定时优先级 / 修订 9 相邻回归
User goal: 不增加大播放器的前提下，让听读可以在分钟、段落或章节边界安全停止
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 390×844 / light-dark
Observed evidence: 顶栏计时入口显示 15/30 分钟、本段、本章；15 分钟模拟到点后保存 audioTime 并停止；本段 ended 后仍停在原段；本章 ended 后总结卡显示且 5.2 秒后不跳章；取消与 Escape 焦点返回通过
Problem category: resolved
Root cause: 已由独立会话态 sleepTimer、秒级 tick 与 advanceAfterEnd 优先级分支消除
Minimal intervention: 新增一枚计时图标和 292px 临时浮层；定时状态仅用按钮小标签表达，不增加底栏或正文占位
Adjacent regression surfaces: 修订 8 展厅→模式→选段→恢复→自动续章→末章返回全旅程复跑；桌面/390、日夜、HTTP 和控制台均通过
Observed result: 移动浮层 top=176px、right=8px、overflow=0；timer 专项与原完整旅程均无 page/console error
Decision: pass
Next executable action: none；本轮定时停止范围已关闭
New authority required: none
```

## 修订 8 · 产品架构基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 厚书分章、继续阅读、历史记录与叙事模式
Coverage item: 修订 8 产品基线 / 书籍展厅 / 单章阅读 / 阅读恢复 / 三种叙事模式
User goal: 从单页演示升级为可长期阅读的产品闭环，同时保留左文右景、用户选段优先与高质量 MiniMax 朗读
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 820×900 / 390×844 / file://
Observed evidence: 当前 4 章 8 段全部挂载在一个 reading-scroll；入口直接进入正文；无书籍展厅、历史记录和恢复模型；表达与音频只有一种；段末无章级停留决策
Problem category: product architecture + continuity + content mode + mobile context
Root cause: 现有结构仍是单篇交互样例，章节只承担分组，不承担装载、路由、完成或恢复边界
Minimal intervention: 保持纯静态和原视觉语言；增加展厅视图与版本化 localStorage；每次仅渲染一章；为段落提供三种内容/音频；章末使用可取消 5 秒续章卡
Adjacent regression surfaces: 旧 hash、MiniMax/系统语音、用户选段接管、目录、夜读、左侧定位、桌面/平板/手机、HTTP/file、图片失败与 reduced-motion
Observed result: 基线和验收矩阵已锁定，进入 Stage 3–8 实现
Decision: continue
Next executable action: 重构数据、页面壳与播放状态机，随后生成模式音频并做真实浏览器验证
New authority required: none；用户已明确回复“确定”批准该产品骨架
```

## 修订 8 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 厚书分章、继续阅读、历史记录与叙事模式
Coverage item: 书籍展厅 / 单章阅读 / 阅读恢复 / 章末续播 / 三种叙事模式 / 多端回归
User goal: 将单篇效果升级为用户可以长期进入、按章听读并随时接续的完整样例产品
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 820×900 / 390×844 / file://
Observed evidence: 首次/回访展厅状态区分正确；阅读器 DOM 始终 1 章 2 段；故事模式选段立即切换匹配 MP3；音频恢复到已保存 3 秒位置；章末停留、手动续章、真实 5 秒自动续章和末章回展厅全部通过
Problem category: resolved
Root cause: 已由 Library→Book→Chapter→Segment 架构、版本化 localStorage、章级路由和音频驱动完成态消除
Minimal intervention: 保留原米纸/朱砂/左文右景视觉及纯静态交付；新增展厅壳、单章渲染、三套模式内容与 16 条补充 MiniMax 音频；移动播放时视觉收为 112px 持续场景条
Adjacent regression surfaces: 旧 hash、用户选段接管、目录、夜读、定位、HTTP/file、系统语音与图片失败均复测
Observed result: 24 条 MP3、7 张最终截图、完整浏览器链路通过；无 page error、console error、横向溢出或 P0/P1/P2 问题
Decision: pass
Next executable action: none；本轮确认范围已完整落地
New authority required: none
```

## 修订 7 · 左栏阅读密度基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 左侧文章布局优化
Coverage item: 修订 7 密度基线 / 左栏正文扩宽
User goal: 减少左侧文章两边无效留白，提升连续阅读的空间利用率与体感
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 820×900 / 390×844
Observed evidence: 1440px 下 reading pane=561.59px，`.story` 固定为470px并居中，左右各约45.8px；段落文字起点约x=66px；用户确认左右预留偏多
Problem category: information density + reading measure
Root cause: `.story` 使用 `max-width:470px`，该上限来自较早的窄阅读构图，没有随播放条移除和定位栏收窄重新校准
Minimal intervention: 将桌面 story 改为 `min(100% - 44px, 580px)` 并保留18px左侧内容安全区；窄分栏只显示标题播放图标；390px继续使用现有22px定位侧栏
Adjacent regression surfaces: 左侧定位控件、活动段背景、标题同排、章节分隔、桌面/820px/390px、日夜主题、横向溢出、MiniMax播放与定位
Observed result: 基线已记录，进入 Stage 3–7 调整并实测
Decision: continue
Next executable action: 修改阅读宽度与窄分栏规则，捕获三视口浏览器证据
New authority required: none；用户已明确要求优化页面布局
```

## 修订 7 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 左侧文章布局优化
Coverage item: 左栏正文扩宽 / 修订 7 多端回归 / 文档闭环
User goal: 在不牺牲行长、定位栏和响应式的前提下，减少左栏文章两侧空白
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 820×900 / 390×844 / file://
Observed evidence: 1440px story由470px扩至517.59px，左右外留白由约45.8px降至22px；定位控件最右35px、内容从40px开始；820px story=321px、两侧24px且标题无溢出；390px结构未变化
Problem category: resolved
Root cause: 已由响应式正文宽度、18px左侧内容安全区和窄分栏图标化标题动作消除
Minimal intervention: 仅调整 `.story`、reader jump control 尺寸与 761–900px 播放标签规则；未修改内容、音频或画面状态机
Adjacent regression surfaces: 活动段背景、标题同排、章节分隔、桌面/820px/390px、日夜主题、横向溢出、MiniMax播放、三种定位与file路径均复测
Observed result: 三视口阅读密度和布局通过；既有音频、选段、定位、主题和降级链路无回归；无page error、失败请求或P0/P1/P2问题
Decision: pass
Next executable action: none；本轮范围已关闭
New authority required: none
```

## 修订 6 · 标题内联与阅读定位基线

```text
Current stage: Stage 1 · Runnable baseline
User phase: 阅读页面控件调整
Coverage item: 修订 6 基线 / 标题内联播放 / 左侧阅读定位
User goal: 播放当前段落紧跟主标题，不再单独占行；左侧用低干扰小控件快速到达文首、当前朗读段和文末
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 390×844
Observed evidence: `#listenAllButton` 位于 `.title-row` 之后，独立占据 32px 高度并带 24px/34px 上下间距；阅读面板没有文首、当前段、文末定位入口
Problem category: information density + control reachability
Root cause: 标题动作采用块级布局；长文章的滚动定位只依赖浏览器滚动条和段落自动滚动
Minimal intervention: 将播放键放进标题同行；在阅读面板左缘增加三枚半透明竖向图标键，只执行滚动定位
Adjacent regression surfaces: MiniMax 播放/暂停、当前段与右图同步、章节/选段状态、桌面内部滚动、390px 页面滚动、夜读、焦点、reduced-motion、Ctrl+Space
Observed result: 基线已记录，进入 Stage 3–7 实现与浏览器验证
Decision: continue
Next executable action: 调整 HTML/CSS/JS，并验证三种定位不改变当前段、音频源或播放状态
New authority required: none；用户已明确要求直接调整页面
```

## 修订 6 · 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: 阅读页面控件调整
Coverage item: 标题内联播放 / 左侧阅读定位 / 修订 6 多端回归 / 文档闭环
User goal: 主标题与播放入口形成一个紧凑标题区，并为长文章提供不干扰朗读的快速定位
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 390×844 / file://
Observed evidence: 播放键属于 `.title-heading-line`，桌面/手机与 h1 垂直中心差 0.99px；三枚定位键在播放 `channel-open.mp3` 时依次定位文末、当前段和文首，hash、音频源与 playing 状态不变；手机控件 x=4–35px，内容最左 x=38px
Problem category: resolved
Root cause: 已由标题同行布局与独立阅读定位层消除；手机为该层保留 22px 内容侧栏
Minimal intervention: 仅调整标题 DOM/CSS，新增三枚 Lucide 定位键及滚动函数；未修改章节、段落、MiniMax 队列或画面状态机
Adjacent regression surfaces: 日夜主题、桌面内部滚动、手机页面滚动、Ctrl+Space、自动续播、音频失败回退、HTTP/file、控制台与横向溢出均复测
Observed result: 桌面/手机布局、三种定位、播放不变式和全部既有朗读链路通过；无 page error、console error、失败请求或 P0/P1/P2 问题
Decision: pass
Next executable action: none；本轮范围已关闭
New authority required: none
```

## 基线与目标

```text
Current stage: Stage 1 · Runnable baseline
User phase: MiniMax TTS 与多章节结构
Coverage item: 修订 4 基线
User goal: 提升朗读质感，并区分章节与段落层级
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 390×844
Observed evidence: 当前数据只有 story.segments 四项；页面不存在章节实体；朗读主路径为 SpeechSynthesisUtterance；既有验证中播放中点第三段能够接管，但音质由系统语音决定
Problem category: information hierarchy + capability quality
Root cause: 章节与段落共用同一层数据；音频由浏览器系统 TTS 即时生成
Minimal intervention: 数据改为 story.chapters[].segments[]；MiniMax speech-2.8-hd 离线生成每段音频；HTMLAudioElement 作为主播放引擎，SpeechSynthesis 仅作失败回退
Adjacent regression surfaces: 左侧阅读密度、章节目录、段落深链接、跨章续播、桌面/390px、file://、主题、图片同步与键盘路径
Observed result: 基线已记录；MiniMax 账户鉴权成功并发现 303 个系统声线，female-chengshu 可用
Decision: pass
Next executable action: 进入 Stage 3–8 完成层级、音频状态机和跨表面验证
New authority required: none；用户已明确要求直接使用 MiniMax TTS
```

## 最终闭环

```text
Current stage: Stage 9 · Engineering and delivery closure
User phase: MiniMax TTS 与多章节结构
Coverage item: 修订 4 全部行
User goal: 用高质量 MiniMax 旁白替代机械系统语音，并建立多章节/多段落分布
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Playwright Chromium · 1440×900 / 390×844 / file://
Observed evidence: 4 个章节、8 个段落和 8 个 MiniMax MP3；真实音频启动 duration=26.388；播放中从第一段跳到第三章第二段后 currentSrc=channel-open.mp3；下一章进入第四章第一段；暂停/恢复正确；ended 自动进入 settled-memory.mp3；阻断音频后系统语音只回退一次
Problem category: resolved
Root cause: 已由三级内容模型与本地 HTMLAudioElement 主路径消除
Minimal intervention: 保留既有视觉系统，仅增加章节分组/目录和 MiniMax 本地音频状态机；SpeechSynthesis 降为故障回退
Adjacent regression surfaces: 桌面 39/61、390px 405px 上景、夜读、画面映射、hash、目录、file:// 和控制台均复测
Observed result: 主路径、跨章状态、移动端和能力降级全部通过；无 page error、console error、失败请求或横向溢出
Decision: pass
Next executable action: none；本轮范围已关闭
New authority required: none
```

## 修订 5 · 隐式播放反馈

```text
Current stage: Stage 3 · Information and layout calibration
User phase: 移除影响阅读的底部播放条
Coverage item: 修订 5 视觉基线 / 移除常驻播放器 / 隐式进度反馈
User goal: 播放状态由当前段落自然表达，进度仅以侧边轨迹等隐式方式体现，不再让播放器占据内容空间
Browser environment: http://127.0.0.1:8107/demos/shijing-dayu-immersive/ · Chromium · 1440×900 / 390×844
Observed evidence: 修订 4 桌面截图中底栏常驻 66px 并缩短阅读区；390px 底栏 fixed 60px 覆盖首段下部；DOM 存在 .audio-player、主播放键、重复上一/下一段控制和进度条
Problem category: density + foreground obstruction
Root cause: 播放状态同时由活动段落和独立底栏重复表达，形成信息与控制冗余
Minimal intervention: 删除可见 audio-player；保留隐藏 audio 元素、标题播放入口和段内按钮；在桌面分栏边界增加 2px 播放轨迹，空闲时隐藏，手机不显示轨迹
Adjacent regression surfaces: MiniMax 播放/暂停、选段接管、自动续播、系统语音回退、桌面/手机、日夜主题、键盘 Ctrl+Space、file://
Observed result: `.audio-player` 数量为 0；桌面阅读网格为 58px + 842px，释放原 66px；手机无 fixed 底部控件；MiniMax 播放时边界轨迹 opacity=.68，切至第 6/8 段为 62.5%；当前段高亮、标题/段内播放、Ctrl+Space、跨章续播与系统语音回退均通过；日夜主题、file:// 和 390px 无回归
Decision: pass
Next executable action: none；修订 5 范围已关闭
New authority required: none；用户已明确要求优化该播放条
```
