# Knowledge Video Studio · 设计契约

## 目标锁定

```text
Entry mode: revision-led / direct implementation
Request revision: 2
Target user and context: 知识创作者在研究页确认能力后，进入独立页面创建一条知识视频
Desired first impression: 这是一条可以推进、审核、恢复的生产流程，而不是另一张能力说明页
Visual ambition: Functional + Editorial
Experience architecture: Editorial Flow
Visual constraints: 延续研究页的深色、荧光绿与纸张质感；生产状态必须比装饰更醒目
Information constraints: 首屏必须显示当前项目、六步流程、下一步动作与服务边界
Operation constraints: 支持表单编辑、步骤导航、分镜锁定/重生成、声音选择、渲染配置与项目导出
State constraints: draft / planning / review / assets / audio / rendering / complete；服务离线时明确进入演示模式
Environment constraints: 静态 file:// 可运行；真实密钥不得进入浏览器；后端接入点固定为安全的同源或 localhost API
Primary journey: 填写目标 → 生成方案 → 审核分镜 → 配置声音 → 配置成片 → 运行/预览 → 导出项目包
User-defined phases: 保留研究页；新增生产页；双向关联
Required artifacts: studio.html、studio.css、studio.js、安全本地服务、MiniMax 适配器、研究页入口、可复现验收记录
Autonomy authorization: 用户已明确要求新增页面并做好关联，可直接实现可逆的页面与交互变更
User-decision boundary: 真实云端部署、计费策略与公开发布仍需单独授权
```

## 设计方向

| 决策 | 选择 | 可观察约束 | 验收标准 |
| --- | --- | --- | --- |
| 信息层级 | 左侧项目与步骤，右侧当前任务 | 任一时刻只有一个主动作 | 首屏能识别当前阶段和下一步 |
| 视觉语言 | 继承研究页深色工业编辑风格 | 荧光绿只用于可执行动作和成功状态 | 状态不依赖颜色单独表达 |
| 状态反馈 | 顶部服务状态 + 任务状态 + 队列日志 | 离线/演示/运行/失败均有文字 | 用户不会误认为演示数据来自真实 API |
| 响应式 | 桌面双栏，平板收窄，手机单栏 | 手机步骤可横向滚动，控件不溢出 | 390px 下可完成主旅程 |
| 动效 | 仅用于步骤切换和进度反馈 | reduced-motion 下关闭非必要动画 | 无动画也不丢失信息 |

## 覆盖清单

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 保留研究页 | 原页面内容不被替换 | 研究页 | 文件与浏览器 | 9 | pass | 原内容保留，新增 3 个生产台入口 |
| 新增生产页 | 六步主流程可操作 | 桌面 / 默认主题 | 浏览器交互 | 5 | pass | 完整旅程到达交付状态 |
| 新增生产页 | 演示模式边界清楚 | 服务离线 | 浏览器状态 | 6 | pass | 首屏、按钮和任务结果均明确标注 |
| 新增生产页 | 分镜可选择、锁定和重生成 | review 状态 | 浏览器交互 | 5 | pass | 5/5 锁定后允许进入声音阶段 |
| 新增生产页 | 配音与渲染配置可保存 | audio / render 状态 | 浏览器交互 | 5 | pass | 状态写入 localStorage 并跨阶段保留 |
| 新增生产页 | 项目包可以导出 | complete / draft | 下载与 JSON 检查 | 5 | pass | 导出 `knowledge-video-project/v1` 且不含密钥 |
| 双向关联 | 研究页能进入生产台，生产台能返回研究页 | 两个页面 | 浏览器导航 | 7 | pass | 研究页 3 个入口；生产台多处返回 |
| 响应式 | 桌面、平板、390px 无遮挡溢出 | 三种视口 | 截图 / DOM | 7 | pass | 1440、900、390 与 file 路线 overflow=0 |
| 无障碍 | 键盘顺序、焦点、语义与 reduced-motion | 键盘 / 媒体偏好 | 浏览器观察 | 7 | pass | 阶段方向键与 reduced-motion 路线通过 |
| 工程闭环 | 页面脚本无语法错误，链接和必要节点存在 | 静态文件 | 自动检查 | 9 | pass | `node --check` 与 Playwright 验收通过 |

## 支持边界

- 本次交付把生产流程、数据契约与安全 API 接口落到网页，静态打开时提供真实可操作的演示状态。
- MiniMax 密钥仍只允许由本地服务或安全后端读取；页面不会保存或显示密钥。
- 真实文本、生图、TTS、视频生成与 FFmpeg 作业在服务接入后执行；服务离线不影响流程评审和项目包导出。

## Revision 2 · 真实本地生成服务

用户要求继续把网页驱动链路落地。新增范围为仅绑定 `127.0.0.1` 的无依赖 Node 服务，统一承载静态页面、MiniMax 文本/图像/TTS 请求、项目文件、FFmpeg 合成与任务状态；浏览器不接触 API Key。直接 `file://` 继续保留演示模式，真实执行只允许从本地服务同源页面启动。

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 服务接入 | 健康检查只暴露能力、不暴露凭证 | online / offline | HTTP 响应与 secret scan | 6 | pass | loopback 服务与同源限制已验证 |
| 真实方案 | 网页提交简报并呈现 MiniMax 结构化五幕 | planning / error / success | mock 与可用凭证实测 | 5 | pass | MiniMax-M3 五幕结构与推理预算已实测 |
| 真实分镜 | 批量生成 5 幕并把结果写回场景卡 | generating / partial / success | live 接口与单幕重生 | 5 | pass | image-01 五幕生成及第 4 幕局部返工已实测 |
| 真实声音 | 生成 5 段 TTS、拼接旁白并回写时长 | audio generating / success | WAV、manifest 与浏览器试听 | 5 | pass | speech-2.8-hd 五段生成与真实时长回写已实测 |
| 真实成片 | 使用项目图片、音频和字幕生成 MP4 | rendering / success / error | ffprobe 与浏览器播放 | 5 | pass | 1280×720 H.264/AAC 成片已验证 |
| 能力回退 | 服务未启动或接口失败时不伪装成功 | file / offline / API error | 浏览器状态观察 | 6 | pass | live/mock/demo/error 状态互斥 |
| 质量门 | 技术检查与视觉人工审核不混淆 | complete / review | 人工抽检与页面状态 | 6 | pass | 伪文字与角色连续性明确标记 REVIEW |
| 工程闭环 | 一条命令启动，自动测试不消耗额度 | mock service / browser | Node 与 Playwright | 9 | pass | mock 全链路与 live 项目恢复验收通过 |

## 验收记录

- 运行入口：`python -m http.server 8765 --directory docs`
- 规范 URL：`http://127.0.0.1:8765/demos/story-to-handdrawn-video/studio.html`
- 检查时间：2026-08-23
- 浏览器证据：`browser-evidence/product-studio/report.json`
- 覆盖：1440×1000、900×900、390×844 reduced-motion、1280×900 file、桌面完整旅程、研究页关联
- 结果：所有覆盖项 `pass`，无 `continue`、`defer` 或 `blocked`。

### Revision 2 追加验收

- 本地服务：`integrations/studio-server.mjs`，默认 `127.0.0.1:8789`；真实验收因本机端口占用改用 8791。
- Mock 闭环：`integrations/verify-studio-service.mjs`，证据在 `browser-evidence/studio-service/`。
- Live 项目恢复：`integrations/verify-existing-studio-project.mjs`，证据在 `browser-evidence/studio-live-project/`。
- 实际模型：MiniMax-M3、image-01、speech-2.8-hd；成片 1280×720、H.264/AAC、81.133 秒。
- 结果：API Key 未进入浏览器，5 张分镜、5 段语音、项目清单、播放器与下载地址全部连通；视觉连续性与伪文字保留人工审核状态。

## Revision 3 · “为什么 AI 那么耗电”一键全流程样例

```text
Entry mode: revision-led / direct implementation
Request revision: 3
Target user and context: 教师、科普创作者与普通公众从一个现实问题直接看到知识视频成片
Desired first impression: 点击样例后不是继续读说明，而是能观察完整生成阶段并到达真实播放效果
Visual ambition: Functional + Editorial
Experience architecture: Editorial Flow
Primary journey: 选择 AI 耗电样例 → 一键生成 → 观察六阶段 → 播放/下载成片
Autonomy authorization: 用户明确要求新增样例、演示完整效果并继续，可执行真实 MiniMax 生成
User-decision boundary: 对外发布、云端部署和持续计费仍需单独授权
Observable completion criteria: 新预设可见；一键复现经人工复核的五幕、五图、五段语音与 MP4；真实服务继续支持新任务；静态页面明确标注不会重复调用 API
```

### 质量分层（Revision 3）

1. **事实与学习目标层**：限定观众最终要会解释什么，以及哪些事实不能越界。
2. **故事讲解导演层（核心）**：生成唯一的五幕故事契约；每幕同时包含旁白、教学任务、画面任务、禁止内容和可信边界。
3. **最终视觉层（关键）**：图片只能从已批准故事契约派生；同一条成片只允许一个最终视觉提供方统一返工。本样例中 MiniMax Image 仅作探索初稿，Codex 负责五张最终画面。
4. **TTS 层（可替换执行器）**：故事和画面锁定后，MiniMax 只把已批准旁白转为声音并返回真实时长，不允许改写故事。
5. **确定性合成层**：原库手绘表达、字幕、音轨与 FFmpeg 只消费锁定资产，不重新做内容决策。

跨模型对齐不依赖“两个模型碰巧理解一致”，而依赖同一份故事契约、单一最终视觉提供方、逐幕人工审片和可追溯清单。任何下游模型都不得自行增删事实或改变叙事目的。

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 第一 | 增加“为什么 AI 那么耗电”完整样例 | 目标预设 / 简报 | DOM、文案与 IEA 来源 | 3 | pass | 研究页和生产台均有入口 |
| 第二 | 演示直接完成全流程到效果 | 目标 → 交付 | 浏览器交互、六阶段状态 | 5 | pass | HTTP/file 一键到达交付 |
| 第二 | 真实生成五幕图片、旁白和成片 | recorded live build | manifest、媒体文件、ffprobe | 5 | pass | Codex 五张终稿、MiniMax 五段 TTS、79.2s MP4 |
| 第三 | 保持 mock/demo/live/curated/error 边界 | service states | 浏览器与接口 | 6 | pass | 复现明确标注未重复调用 API |
| 第三 | 桌面与 390px 可完成主旅程 | desktop / mobile | Playwright 截图与 DOM | 7 | pass | 1440、390、file 横向溢出均为 0 |
| 第三 | 文档、证据与提交范围闭合 | repository | diff、secret scan、commit | 9 | pass | E19、项目清单与本项目提交闭合 |

### Revision 3 追加验收

- 样例项目：`kv-20260823074716-bq4ges`；IEA 事实边界经人工复核后修正了模型初稿中的设备数量和拟人化表述。
- 最终视觉：5 张均为 Codex 内置 imagegen；清单同时保留 `draft_provider = MiniMax Image image-01` 与逐幕修订原因。
- 正式声音：MiniMax `speech-2.8-hd`、`female-chengshu`、0.94×，五段实际时长为 14.520、17.220、15.497、13.420、14.520 秒。
- 成片：1280×720、H.264/AAC、79.2 秒；直接 `file://` 与 HTTP 都可一键复现完整六层生产记录。
- 浏览器证据：`browser-evidence/ai-energy-sample/report.json`；桌面、390px reduced-motion、file 和研究页时间轴全部通过，无 console/page error。

## Revision 4 · 预设项目状态隔离修复

```text
Entry mode: repair-led
Request revision: 4
Target surface: studio.html 普通六步生产流程
Observed defect: 选择“用电”或“诗词”只替换简报字段，离线方案之后的分镜、音频和成片仍硬编码回退到天空样例
Primary journey: 选择预设 → 生成方案 → 查看五幕 → 锁定分镜 → 声音 → 成片/交付
State constraint: sky / electricity / poetry / aiEnergy 必须拥有独立 activePreset、计划、素材、媒体和持久化状态；切换预设必须清除上一个任务结果
Environment constraint: file:// 与本地 HTTP 均需正确；实时服务返回的项目资产优先于预设资产
Autonomy authorization: 用户明确报告缺陷并要求纠正，可直接实施局部可逆修复
User-decision boundary: 不改变四个预设的主题定位，不新增外部服务或重新消耗 API
Observable completion criteria: 四个预设依次选择后，标题、五幕、五图、音频、成片和项目来源全部匹配当前预设；刷新后不串线；旧 AI 一键样例不回归
```

| 修复项 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 复现用电预设串回天空 | file / electricity | 浏览器 DOM 与媒体 src | 1 | pass | 基线确认五图、音频和视频均错误指向 sky-blue-demo |
| 四预设独立项目包 | demo preset state | 方案、五图、音频、视频映射 | 5 | pass | 四条完整旅程均匹配各自目录与清单 |
| 切换清除旧任务 | selected → selected | 状态转换与刷新 | 6 | pass | 用电→诗词快速切换和 delivery 刷新无残留 |
| 桌面、390px、file 回归 | HTTP / file / reduced-motion | Playwright | 7 | pass | HTTP 四预设、file 用电、390px 快切全部通过 |
| 工程与交付闭合 | repository | node check、diff、证据与提交 | 9 | pass | E20、自动验收和本项目提交闭合 |

### Revision 4 修复证据

- 根因：`selectPreset()` 只替换 `state.project`，而 `renderStoryboard()` 与 `applyGeneratedMedia()` 在无 API 结果时硬编码 `sky-blue-demo`。
- 修复：新增持久化 `activePreset` 和四套 `presetDemos`；计划、五图、TTS、成片、用量估算、项目 ID 与 manifest 均随预设切换。实时 API 返回的 `state.plan/storyboard/voiceData/renderData` 仍保持最高优先级。
- 用电预设：`power-outage-demo` 五图、494 字 MiniMax 旁白、115.833 秒《停电以后，我看见了电》。
- 诗词预设：`jiangnan-bright-demo` 五图、383 字 MiniMax 旁白、116.42 秒《忆江南》诗卷讲解版。
- 验收报告：`browser-evidence/studio-preset-isolation/report.json`；四预设 HTTP 完整旅程、用电 file 完整旅程、390px reduced-motion 快速切换均为 pass，横向溢出和浏览器错误均为 0。

## Revision 5 · 声音选择与本地服务连接修复

```text
Entry mode: repair-led
Request revision: 5
Target surface: studio.html 声音模块与真实服务状态
Observed defect: 8791 本地入口不会自动检测服务；“清晰男声”使用非官方 presenter_male；选择后仍播放旧参考音频且没有边界提示
Primary journey: 打开任意 loopback 端口 → 自动识别真实服务 → 选择声音与语速 → 生成 → 播放本次任务音频
State constraint: 声音或语速变化必须使旧声音/成片失效；生成前不得把参考音频冒充为当前选择
Autonomy authorization: 用户明确要求排查声音选项无效，可直接执行局部可逆修复
Observable completion criteria: 8791 自动显示真实服务在线；三个选项均为官方系统 Voice ID；请求携带所选 voice 和 speed；生成前后反馈可区分
```

| 修复项 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- |
| 非默认端口自动连接 | HTTP 8791 / initial | 浏览器 DOM | 1 / 6 | pass | 任意 127.0.0.1 或 localhost 端口均调用同源 health |
| 清晰男声有效映射 | voice selection / request | 官方音色表、拦截请求 | 5 | pass | `presenter_male` 迁移为 `male-qn-jingying` |
| 参考音频边界 | selected / not generated | 浏览器文案与播放器 src | 6 | pass | 生成前明确“参考样例”，不伪装换声成功 |
| 依赖状态失效 | voice / speed changed | localStorage 与 DOM | 6 | pass | 清除旧 voice/render/delivery 完成状态 |
| 浏览器闭环 | online → select → request → result | Playwright、截图、报告 | 9 | pass | `studio-voice-options` 无 console/page error |
| 成片比例 | render request | 请求体与服务端尺寸映射 | 5 | pass | 16:9、9:16、1:1 为真实可用控制 |
| 未接入渲染项 | recipe / motion / subtitles | 前后端消费审计、浏览器 DOM | 4 / 6 | pass | 基础合成保留；配方与图生视频禁用；字幕明确固定开启 |

## Revision 6 · 研究页到生产台项目交接

```text
Entry mode: revision-led / direct implementation
Request revision: 6
Target user and context: 用户在研究页定义新的知识推广目标，再进入真实生产台继续生成
Desired first impression: 两页是同一项目的“研究与定义”及“执行与交付”两个阶段，而不是两个互不相干的演示页
Visual ambition: Functional + Editorial
Experience architecture: Editorial Flow
Visual constraints: 保留两页现有视觉系统；只增加一个主交接动作和一个生产台接收状态，不增加第三套页面层级
Information constraints: 研究页必须明确本地方案不调用模型；生产台必须显示接收到的主题、来源与下一步真实动作
Operation constraints: 主题、受众、时长、学习目标、误解、入口和事实依据七项完整传递；用户可先修改再提交
State constraints: local-plan → handed-off → incoming-review → live-planning；旧项目媒体、批准和完成状态不得串入新目标
Environment constraints: HTTP 同源优先；file:// 研究页需发现当前 loopback 生产服务并使用 URL fragment 交接，简报不进入服务日志且到达后清除地址载荷
Primary journey: 研究页填写 → 生成本地教学方案 → 送入生产台 → 核对接收简报 → 明确点击 → MiniMax 生成五幕方案
User-defined phases: 建立入口；传递同一项目；连接真实生成动作；保留离线边界
Required artifacts: index.html/demo.js/style.css、studio.html/studio.js/studio.css、跨页浏览器验收、设计契约记录
Autonomy authorization: 用户明确要求补齐入口和处理生成逻辑，可直接实现可逆的页面、状态与交接变更
User-decision boundary: 交接本身不自动消耗额度；真实方案生成仍由用户在生产台明确点击授权
Observable completion criteria: 自定义主题七字段在 HTTP 和 file→HTTP 两条路径均不丢失；生产台显示接收提示；确认后请求 /api/actions/plan 使用同一简报；刷新不会重复提交
```

| 用户阶段 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 建立入口 | 本地方案出现唯一明确的“送入生产台”主动作 | index / plan ready | 桌面与 390px 浏览器 | 4 | pass | 第五步“真实生产”和主交接动作均可见 |
| 传递同一项目 | 七字段从研究页进入生产台且清除旧媒体状态 | HTTP→HTTP、file→HTTP | DOM、localStorage、URL | 5 / 6 | pass | 七字段逐项相等，fragment 到达即清除，旧媒体与批准均为空 |
| 连接真实生成动作 | 生产台明确确认后提交同一简报到 plan API | incoming-review → planning | 拦截请求、状态反馈 | 5 | pass | 确认按钮先验服务，再向 `/api/actions/plan` 提交同一 brief |
| 保留离线边界 | file 页面不直接调用 API；无服务时给出可恢复说明 | file / unavailable | 浏览器 fallback | 6 / 8 | pass | 8791/8789 均不可用时停留原页、保留输入并给出启动说明 |
| 跨表面适配 | 桌面、390px、键盘与 reduced-motion 可完成交接 | 两页 / 两视口 | Playwright | 7 | pass | 桌面与 390px reduced-motion 无溢出，编辑动作键盘可达 |
| 工程闭环 | 语法、旧预设、声音与渲染控制不回归 | repository | Node / Playwright / git | 9 | pass | handoff、knowledge、preset、voice 四组验收通过 |

### Revision 6 验收证据

- 基线缺陷：研究页填写“为什么冰箱背面是热的？”后只打开 `studio.html`，生产台仍显示缓存中的“为什么天空是蓝色的？”，且没有接收状态。
- 交接协议：`knowledge-video-handoff/v1`；仅传递七项简报和本地处方建议，不含 API Key；URL fragment 到达生产台后立即移除，刷新不会重复执行。
- 新目标隔离：接收时从干净状态开始，`plan/storyboard/voiceData/renderData`、五幕锁定和阶段完成记录全部清空；自定义主题离线时不会回退成任何预设样例。
- 浏览器验收：`browser-evidence/studio-handoff/report.json`；HTTP→HTTP、file→HTTP、服务不可用、1440px、390px reduced-motion、键盘与 plan 请求捕获全部通过。
- 回归验收：`browser-evidence/knowledge-product/report.json`、`browser-evidence/studio-preset-isolation/report.json`、`browser-evidence/studio-voice-options/report.json` 均无浏览器错误。

## Revision 7 · 新项目纯净生成与网页内成片

```text
Entry mode: revision-led / repair-led
Request revision: 7
Target user and context: 用户从研究页提交全新目标，需要确认每一阶段都只展示本项目内容，并在交付页直接看到成片
Desired first impression: 当前项目是唯一上下文；样例只是可选入口，不会与新任务并排冒充输入或输出
Visual ambition: Functional + Editorial
Experience architecture: Editorial Flow
Preserve: 六步生产结构、预设样例复现、MiniMax 服务端安全边界、逐步人工批准
Observed defects: 接收新目标时仍显示旧预设与固定 AI 能源说明；未生成分镜/声音/成片时仍回退天空素材；交付页只有下载卡，没有本次成片主播放器
State constraints: preset-sample 与 custom-live 两种模式互斥；custom-live 未生成的资产必须显示明确空状态，永不读取 preset/sky fallback
Primary journey: 新简报 → 真实方案 → 本项目分镜 → 本项目 TTS → 本项目渲染 → 交付页直接播放 → 可选下载
Autonomy authorization: 用户明确要求修复新生成流程，可直接实施并验证
User-decision boundary: 不重新消耗真实模型额度；浏览器验收拦截各生成接口并使用本项目 fixture
Observable completion criteria: 新项目各阶段不存在 sky/AI-energy/recorded sample URL 或文案；每次成功结果标注项目来源；交付页有可播放 video、下载与清单；刷新仍保留同一项目
```

| 用户问题 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 填入信息与以前信息混放 | 新项目只显示当前简报，样例库收起或隐藏 | brief / custom | 浏览器截图、DOM | 3 / 6 | pass | custom 模式隐藏预设库、固定 AI 来源与一键样例；新建项目为空白 |
| 每一步被样例污染 | custom 未生成显示空态，生成后只使用当前 API 结果 | storyboard / voice / render | URL、文案、状态转换 | 5 / 6 | pass | 初始媒体 URL 全空；五图、TTS、成片逐步只出现 `/generated-studio/<project>/` |
| 最终效果看不到 | delivery 首屏直接播放本次 final.mp4 | delivery / success | video currentSrc、截图、播放事件 | 4 / 5 | pass | 交付主播放器成功载入并实际播放；播放器与下载 href 完全相同 |
| 保留样例能力 | 主动选择预设时仍可完整复现原样例 | preset journeys | 旧回归测试 | 7 | pass | sky/electricity/poetry/aiEnergy、file、移动快切全部通过 |
| 跨表面和工程闭环 | 桌面、390px、刷新、语法与无密钥泄露 | all | Playwright、Node、secret scan | 7 / 9 | pass | desktop/mobile/reduced-motion/刷新/空白新项目/语法与回归通过 |

### Revision 7 验收证据

- 修复前浏览器基线：新项目的 5 张空分镜全部指向 `sky-blue-demo`，音频指向天空旁白，合成预览指向天空 MP4，交付阶段 `<video>` 数量为 0。
- 模式隔离：`activePreset === null` 明确表示真实/自定义项目；样例入口与固定样例来源隐藏，前进阶段按真实产物解锁，离线不能用演示成片冒充结果。
- 空状态：未生图、未 TTS、未渲染均显示“本项目尚未生成”，媒体元素移除旧 `src/poster`；旧 localStorage 中的 `/assets/` 污染也会在加载时清理。
- 网页交付：合成成功后，成片同时进入成片预览和交付主播放器；两处播放器与下载按钮使用同一 `final.mp4`，刷新后仍保持。
- 主验收：`browser-evidence/custom-project-purity/report.json`；完整 fixture 链路未调用真实模型，但真实载入并播放 MP4，桌面与 390px reduced-motion 均通过。
- 回归：`studio-handoff`、`studio-preset-isolation`、`studio-voice-options` 均通过，无浏览器错误。

## Revision 8 · 可执行效果契约与质量路由

```text
Entry mode: revision-led / direct implementation
Request revision: 8
Target user and context: 用户从研究页选择适合内容的叙事与风格后，希望生产台复现同一创作意图，而不是由每个模型重新猜测
Desired first impression: 研究建议已经成为可查看、可选择、会被后端真实执行的生产配置
Visual ambition: Functional + Editorial
Experience architecture: Editorial Flow
Preserve: 两页现有视觉语言、七字段简报、六步流程、MiniMax 密钥安全边界、预设与自定义项目隔离
Observed defect: handoff 仅携带 recommendation 文案；plan API 仅提交 project；服务端通用提示词重新生成 visual_bible；render 仅有基础配方，导致同主题重做时风格、样式与质量层级漂移
Primary journey: 研究页生成方案 → 交接完整效果契约 → 生产台核对并选择质量路线 → 服务端按契约生成五幕 → 图片提示与渲染消费同一契约 → 交付页显示实际执行清单
State constraints: production_contract 是项目级唯一事实来源；研究推荐、生产台选择、后端项目、图片提示、渲染清单保持同一个 contract id；能力不可执行时必须明确标注，不得伪装
Environment constraints: 全自动路线使用 MiniMax 文本/图片/TTS 与确定性 FFmpeg；Codex 终稿路线标注为 Agent 协作精制，不伪装成网页可直接调用的 API
Autonomy authorization: 用户已确认按该方向实施，可直接完成可逆的前后端协议、界面与验证变更
User-decision boundary: 不在本轮重新消耗真实模型额度；使用 mock/fixture 验证协议与执行约束；真实生成仍由用户点击触发
Observable completion criteria: handoff、plan 请求、项目 JSON、visual_bible、分镜提示与 render 结果均可追溯同一 production_contract；用户可看清“快速全自动”和“精制协作”能力边界；旧预设及声音流程不回归
```

| 用户问题 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 风格选择是否真实生效 | 将研究推荐转换为结构化 visual recipe 并进入 plan/image | handoff → plan → storyboard | 请求体、项目 JSON、浏览器 DOM | 5 / 6 | pass | visual style、palette、camera、continuity 与 prompt prefix 已进入文本和生图约束 |
| 样式选择是否真实生效 | 将 presentation/render recipe 显示为可执行配置并进入 render | studio render / delivery | 控件、render 请求与响应 | 4 / 5 | pass | standard、handdrawn、poetic 三配方由第一步锁定并进入不同 FFmpeg 处理 |
| 模型能力差异是否可控 | 明示 auto 与 curated 两种质量路由和能力边界 | incoming / production contract | DOM、状态与导出清单 | 3 / 6 | pass | MiniMax 自动链可网页执行；Codex 精制明确标注 Agent 协作，不伪装 API |
| 同一意图是否可复现 | contract id 与关键字段从研究页贯穿最终项目 | two pages / API / export | 浏览器端到端、fixture | 5 / 9 | pass | 同一 id 已贯穿 handoff、plan、storyboard、render 与项目导出 |
| 跨表面与回归 | 桌面、390px、刷新、旧预设/声音/纯净项目继续工作 | all affected surfaces | Playwright、Node、现有回归 | 7 / 9 | pass | desktop/mobile、纯净项目、四预设、声音、语法与媒体播放均通过 |

### Revision 8 验收证据

- 研究交接：`browser-evidence/studio-handoff/report.json`；HTTP→HTTP、file→HTTP 与 390px 路线均保留七字段简报及同一个 `knowledge-video-production-contract/v1` ID。
- 可执行闭环：`browser-evidence/studio-service/report.json`；mock 路线选择 `poetic` 后，项目、方案、五幕分镜与成片均记录同一 contract id；实际生成 1280×720 H.264/AAC、106.233 秒 MP4。
- 真实服务：8791 已重启并通过健康检查，公开 `standard / handdrawn / poetic` 三种渲染配方和 `automatic / agent-assisted` 能力边界；MiniMax Key 仍不进入浏览器。
- 回归：`custom-project-purity`、`studio-preset-isolation`、`studio-voice-options` 全部通过；桌面和 390px 无横向溢出，旧样例、声音选择、比例与网页内播放未回归。

## Revision 9 · 项目收束与 GitHub Pages 交付

```text
Entry mode: revision-led / delivery-led
Request revision: 9
Target user and context: 研究已经完成，需要让后续阅读者在远端理解结论、查看两类页面，并能在本地复现真实生产链路
Desired first impression: 这是一个边界清楚、证据可追溯、可继续产品化的知识视频研究成果，而不是一组散落样例
Visual ambition: Functional + Editorial
Experience architecture: Research page → Production Studio → local secure generation service
Preserve: 现有页面、真实案例、效果契约、MiniMax 密钥边界、GitHub Actions Pages 工作流
Primary journey: 阅读项目总结 → 打开远端研究页 → 打开远端生产台 → 理解静态托管边界 → 按文档启动本地真实链路
Required artifacts: PROJECT_SUMMARY.md、DEPLOYMENT.md、README 交付入口、远端页面验收证据、GitHub 分支与 main 发布记录
Security constraints: API Key 只允许存在于被忽略的本地 .env 或部署平台 Secret；Pages 不承载 Key、FFmpeg 或长任务
Deployment constraints: GitHub Pages 只发布 docs 静态站；真实 MiniMax/FFmpeg 生产依赖本地或未来的受保护云后端
Autonomy authorization: 用户明确要求总结、部署、文档落地并提交到远端 GitHub
Observable completion criteria: 两个正式 URL 可访问且页面无阻断错误；文档能回答是什么、增强了什么、怎样使用、适合什么、边界与下一步；仓库无密钥泄露
```

| 交付问题 | 要求 | 表面 / 状态 | 证据 | 所属阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 研究是否可快速理解 | 一份独立总结覆盖结论、架构、增强、场景和边界 | repository docs | 文档审阅 | 8 / 9 | pass | `PROJECT_SUMMARY.md` 已建立职责、能力、场景、限制和下一阶段入口 |
| 如何复现与发布 | 区分静态 Pages 与真实生产服务，给出安全配置和验证步骤 | repository docs | 命令、工作流、Secret 扫描 | 8 / 9 | pass | `DEPLOYMENT.md` 已覆盖本地真实链路、Pages、密钥和云端边界 |
| 远端页面是否真实可用 | 研究页和生产台在 GitHub Pages 桌面/移动端可打开 | github-pages | 真实 URL、浏览器截图与 DOM | 7 / 9 | pass | Actions `32636919533` 成功；1440px/390px 两页均通过真实远端验收 |
| 是否安全提交 | 不提交 `.env`、API Key、生成缓存或其他项目改动 | git | 定向 diff、ignore 与 secret scan | 9 | pass | 从 `origin/main` 创建 273 文件的项目级干净发布提交，范围检查与 secret scan 通过 |

### Revision 9 验收证据

- 发布提交：`2990f4e6f9d16e7abd04c496af16be014c8537c4`；同时进入远端 `codex/story-to-handdrawn-video-research` 与 `main`。
- GitHub Pages：Actions run [`32636919533`](https://github.com/yydshly/0822_githubcode_study/actions/runs/32636919533) 成功完成 checkout、artifact upload 与 deploy。
- 正式页面：研究页 `https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/`；生产台 `https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/studio.html`。
- 浏览器验收：`browser-evidence/github-pages/report.json`；研究页与生产台在 1440×1000、390×844 reduced-motion 下均为 HTTP 成功、0px 横向溢出、0 浏览器错误。
- 边界验收：远端生产台显示“演示模式”、六阶段和 `EXECUTABLE EFFECT CONTRACT`；真实 MiniMax/FFmpeg 仍只由 loopback 或未来受保护后端执行。
- 安全验收：`.env` 命中 ignore；提交中不存在 MiniMax Key 实值；其他研究项目的本地改动没有进入发布提交。
