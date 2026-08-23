# Design QA · 修订 8

**比较目标**

- source visual truth path: `C:\Users\yun68\.codex\generated_images\01a02de3-c345-7073-a434-0b00435deac9\exec-a00fd1a6-4698-4094-a514-0d460b75115d.png`
- mobile structure truth path: `E:\0822_codex_project\.tmp\gateless-reference-mobile-v3.png`
- implementation screenshot path: `E:\0822_codex_project\.tmp\shijing-density-desktop.png`
- playing-state screenshot path: `E:\0822_codex_project\.tmp\shijing-density-playing.png`
- tablet implementation screenshot path: `E:\0822_codex_project\.tmp\shijing-density-tablet.png`
- mobile implementation screenshot path: `E:\0822_codex_project\.tmp\shijing-density-mobile.png`
- viewport: desktop 1440×900 CSS px；mobile 390×844 CSS px
- source and implementation pixel dimensions: desktop source与实现均归一化为 1440×900；mobile source与实现均为 390×844
- density normalization: deviceScaleFactor 1；源方案图按 1440×900 归一化；无浏览器外框或设备边框
- state: 日间主题、`#flood-arrives`、第一章第一段选中、MiniMax 未播放；手机为 405px 上景后接正文

**全景对照证据**

- `E:\0822_codex_project\.tmp\shijing-design-comparison.png`：方案 1 与桌面实现同视口并排。
- `E:\0822_codex_project\.tmp\shijing-design-mobile-comparison.png`：原网页移动结构与最终实现同视口并排。
- 桌面实测阅读区 561.59px、视觉区 878.41px，对应 39% / 61%；与目标约 40% / 60% 一致。
- 手机实测视觉区 390×405，阅读区从 y=405 开始；与原参考的上景下文结构一致。

**聚焦区域对照证据**

- `E:\0822_codex_project\.tmp\shijing-design-reading-focus.png`：左侧阅读栏 562×900 的 1:1 结构、排版和活动段落对照。
- `E:\0822_codex_project\.tmp\shijing-design-controls-focus.png`：右上视觉控制的 2× 放大对照。
- 聚焦检查确认图标均来自本地 Lucide 图标库；没有文字符号、手绘 SVG 或占位图替代。

**Findings**

- 无仍需处理的 P0、P1 或 P2 问题。
- [P3] 正文信息结构比概念图更明确
  - Location: 左侧文章段落。
  - Evidence: 概念图以连续正文和单段高亮为主；实现为每段增加短标题、编号和极小的段内播放键。
  - Impact: 视觉密度略高，但这是为了让“播放中动态选段”成为清晰可发现的正文交互。
  - Decision: 作为有意的产品扩展保留；字号、按钮和活动底色保持克制，没有改变左文右景主层级。

**必查保真面**

- Fonts and typography: 中文宋体系用于标题/正文，无衬线和等宽字体仅用于微型控制与编号；正文 16.5px、2 倍行高，桌面与手机均无拥挤、截断或异常换行。
- Spacing and layout rhythm: 桌面 39/61 分栏、58px 顶栏，余下 842px 全部归还阅读区；手机 405px 上景且无固定底栏。无横向溢出、控件碰撞、正文遮挡或不可达区域。
- Colors and visual tokens: 米纸、墨黑、灰绿和朱砂映射方案 1；活动段朱砂细线与浅暖底色清楚但不过度抢眼；夜读仍保持对比。
- Image quality and asset fidelity: 四幅 1122×1402 WebP 为真实本地栅格资产，主体、光线、朱砂人物和灰绿山川风格统一；裁切使用 `object-fit: cover`，无拉伸、透明边或压缩块。
- Copy and content: 四章八段形成“灾情—旧法失败—疏导—恢复日常”的完整因果链，并明确神话、文献与历史记忆的边界；章节与段落语义不混用。
- Icons and controls: 所有常驻控件为同一 Lucide 线性图标族，桌面 32–36px、手机保持可点；目录、主题、环境声、观景、全屏和朗读状态均有可观察反馈。
- Accessibility and resilience: 语义标签、可见焦点、键盘选段、alt 文本和 reduced-motion 均有实现；图片失败不阻断正文与语音。

**Comparison History**

1. 初次桌面对照没有 P0/P1/P2；发现 P3 色彩令牌漂移：实现使用描边章印、深色视觉按钮和黑色实心播放键，概念图使用朱砂章印、浅色视觉按钮和朱砂播放状态。
2. 修复：在 `styles.css` 中将章印改为朱砂实心，视觉按钮改为浅米色玻璃面，主播放键改为朱砂描边；随后重新捕获桌面图并更新全景、阅读栏和控制区对照。
3. 初次移动测量发现上景为 430px，而原参考为 405px，定为 P2 响应式结构漂移。
4. 修复：移动视觉高度改为 `clamp(340px, 48svh, 405px)`；复测为 390×405，正文从 y=405 开始，无横向溢出。最终证据见 `shijing-design-mobile-comparison.png`。
5. 修订 4 的常驻播放条被用户明确判定为影响视觉和阅读，桌面占 66px、手机 fixed 60px，定为 P1 用户体验问题。
6. 修复：删除可见播放器和布局占位，改用段落状态与 2px 桌面边界轨迹；复测桌面阅读区为 842px、手机固定底部控件为 0。最终证据见 `shijing-implicit-desktop.png`、`shijing-implicit-playing.png` 与 `shijing-implicit-mobile.png`。
7. 修订 6 将标题播放入口从独立行移到主标题之后，并增加左侧三枚阅读定位键；390px 初测控件掠过眉题，随后为正文增加 22px 专用侧栏，最终控件最右 x=35px、内容最左 x=38px。

**Primary interactions tested**

- 第一段开始朗读后点击其他段落，旧语音被取消，新语音、活动段、右图、隐式轨迹和深链接同步。
- 目录开关、标题/段内播放与暂停、Ctrl+Space、夜间阅读、只看画面、全屏入口和环境声入口。
- HTTP 与 `file://` 两条打开路径；`#blocked-fails` 深链接可恢复第二章第二段及对应 MiniMax 音频。
- 桌面、390px 手机均检查 page error、console error 与失败请求，结果为 0。

**Implementation Checklist**

- [x] 方案 1 桌面主构图与令牌对齐。
- [x] 四幅真实图片、四章八段与逐段 MiniMax 状态映射完成。
- [x] 用户主导朗读接管完成。
- [x] 手机 405px 上景结构完成。
- [x] HTTP / `file://`、降级和控制台验证完成。
- [x] P0/P1/P2 清零。

**Follow-up Polish**

- P3：当前进度已使用真实 MP3 时间轴；若以后需要逐字高亮，可进一步接入 MiniMax 字幕时间码。

**修订 4 增量 QA（历史）**

- 当前合并对照已替换为四章八段与 MiniMax 版本的最终桌面/手机截图，不沿用修订 3 的旧实现证据。
- 新增章节标题位于文章正文内部，字号 18px、单线分隔；没有改变 39% / 61% 主构图，也没有引入大控件。
- 修订 4 曾沿用 66px/60px MiniMax 播放器；该决定已被用户在修订 5 明确否决并移除。
- 浏览器实测目录包含 4 个章节按钮和 8 个段落按钮；顶栏翻章，正文直接选段。
- 本次增量对照没有新增 P0/P1/P2 视觉问题。

**修订 5 增量 QA**

- 用户明确要求删除概念图中的底部播放器，因此这项差异属于新的视觉真值，而非未修复的保真偏差。
- 最终 DOM 不存在 `.audio-player`；桌面阅读内容从 776px 增至 842px，手机没有 fixed 底部控件，正文无遮挡。
- 播放中以当前段浅暖底色、朱砂细线、暂停图标和桌面边界 2px 轨迹表达状态；空闲隐藏轨迹，手机只保留段落反馈。
- 夜读、桌面/390px、键盘、MiniMax 主路径与音频回退复测通过；本次增量没有新增 P0/P1/P2 问题。

**修订 6 增量 QA**

- 播放入口与主标题垂直中心差 0.99px，桌面和手机均保持同一标题行，没有引入新的块级操作区。
- 文首、当前段、文末定位只滚动阅读面，不更改当前段、hash、音频源或 playing/paused 状态。
- 桌面定位键不侵入正文列；手机保留 22px 专用边栏，控件与眉题、标题、章节及段落均无重叠。
- 日夜主题、reduced-motion、Ctrl+Space、MiniMax 主路径、系统语音回退、HTTP 与 `file://` 复测通过；没有新增 P0/P1/P2 问题。

**修订 7 增量 QA**

- 用户指出桌面左栏两侧留白偏多；基线实测 `.story=470px`、两侧约45.8px，属于阅读密度问题。
- 最终 `.story=517.59px`、两侧22px，正文增加47.59px；中文行长仍处于舒适范围，没有形成横跨整栏的长行。
- 定位控件最右x=35px、正文内容从x=40px开始；820px 分栏为369/451px，正文两侧24px且标题播放图标无溢出。
- 390px 的405px上景和专用定位边栏未被桌面宽度调整影响；本次没有新增 P0/P1/P2 问题。

final result: passed

## 修订 8 增量 QA

- 展厅沿用米纸、朱砂、宋体和灰绿历史画面，没有另起一套卡片化后台风格；首屏由短说明与大幅继续阅读视觉组成，主要动作只有一个。
- 阅读器保持 39/61 左文右景，当前章标题、三种模式和两个段落在左栏形成紧凑层级；没有恢复底部播放器，也没有大号模式卡。
- 390px 初始上景下文；播放后场景收为 112px 粘性条，工具栏紧随其后，解决旧版滚动后完全看不到响应画面的 P1 体验问题。
- 夜读章节标题与段落标题统一使用浅色 `--ink`，修复旧版章节标题接近背景色的 P1 对比问题。
- 模式按钮采用 radiogroup；标题播放按钮动态包含动作、段落和模式；触控入口使用 36–42px 视觉尺寸并保留明确焦点。
- 七张最终证据覆盖展厅日间/手机夜间、阅读桌面/平板/手机播放、夜读与章末卡；无新增 P0/P1/P2。

## 修订 9 增量 QA

- 定时入口与章节翻页、主题控制同属阅读顶栏，仅增加一枚 Lucide `timer` 图标；激活后以 7px 小标签显示剩余时间或“本段/本章”。
- 292px 浮层使用既有米纸、细边界和宋体层级，四个选项为 2×2 紧凑排列；它是临时设置面，不占正文高度、不引入底栏。
- 390px 播放态浮层紧随 112px 场景条与 58px 工具栏，实测 top=176、right=8、bottom=371.94、overflow=0；没有遮住当前活动段的主要正文。
- 夜读浮层复用 `--paper/--ink/--accent` 语义令牌；Escape、点击外部、关闭键和取消动作均有明确恢复路径。
- 定时专项和修订 8 全旅程复跑均无 P0/P1/P2。

## 修订 10 增量 QA

- 渐弱不新增视觉区域；只复用计时图标下方秒数和浮层副标题表达 finishing 状态，正文与右景层级不变。
- `timer-fading.png` 显示 00:03 时图标、当前定时选项和“柔和收尾”文案一致，没有新增弹窗或遮挡。
- 音量包络属于功能反馈，不依赖动画理解；reduced-motion 用户仍得到相同音频收束和明确剩余时间。
- 定时专项与修订 8 完整浏览器矩阵无 P0/P1/P2。

## 修订 11 增量 QA

- 每日计划在展厅主视觉和书架之间使用单条横向信息带，不增加大统计卡；进度只是一条2px细线，保持阅读产品的克制密度。
- 设置层复用米纸、朱砂和既有表单边界；桌面三字段同排，390px变成标签+输入的纵向三行，实测宽350px且无溢出。
- 移动夜读时计划栏位于继续阅读大图和书架之间，按钮仍保持40px触控高度，没有挤压首屏主动作。
- 通知状态不会伪装为已开启：denied/default/granted/unsupported分别显示真实文案，保存计划不触发权限弹框。
- plan、timer与修订8完整矩阵均无P0/P1/P2。

## 修订 12 增量 QA

- 展厅仍保持“一项首屏主动作”：新书没有新增第二个大型推荐区；书架只把原占位卡替换为可读状态，并用2px进度线表达续读。
- 桌面3张书卡维持同一行；390px单列卡宽358px、横向溢出0，主推荐按钮底部616.5px，首屏主任务仍清楚可达。
- 两书历史按书去重，不把每个段落堆成信息流；返回用户最多先看到“最近一本继续”，再到书架和最近两本。
- 《丝路西行》三幅场景与既有米纸、灰绿、朱砂体系一致；右景没有文字水印、现代物件或复用大禹画面。
- 手机朗读态继续使用112px粘性视觉条；丝路末章故事模式实测音频、标题、活动段和画面一致，overflow=0。
- 多书、plan、timer与修订8完整矩阵均无P0/P1/P2。
