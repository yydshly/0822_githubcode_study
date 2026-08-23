# 浏览器验证记录 · 修订 13

## 运行环境

| 字段 | 值 |
| --- | --- |
| 时间 | 2026-08-23，Asia/Shanghai |
| Canonical URL | `http://127.0.0.1:8107/demos/shijing-dayu-immersive/` |
| 直开路径 | `file:///E:/0822_codex_project/docs/demos/shijing-dayu-immersive/index.html` |
| 浏览器 | Playwright Chromium，headless |
| 视口 | 1440×900 / 820×900 / 390×844，deviceScaleFactor 1 |
| 音频 | MiniMax `speech-2.8-hd`，female-chengshu，calm，0.88×，32kHz/128kbps MP3 |
| 验证脚本 | `.tmp/verify-shijing-r13.cjs`、`.tmp/verify-shijing-r12.cjs`、`.tmp/verify-shijing-plan.cjs`、`.tmp/verify-shijing-timer.cjs`、`.tmp/verify-shijing-v8.cjs` |

## 最终结论

| 覆盖项 | 结果 | 证据摘要 |
| --- | --- | --- |
| 首次展厅 | pass | 清空存储后显示按本地日期稳定轮换的“今日推荐 / 开始阅读”，3 张书卡中2本可读、1本明确为策划中 |
| 回访展厅 | pass | 从第二章故事模式退出后显示“继续阅读”、第二章/故事模式、真实进度和最近段落列表 |
| 单章挂载 | pass | 第一、三、四章均实测 DOM 只有 2 个 `.story-segment`；页面不再同时挂载 4 章 8 段 |
| 新旧路由 | pass | 新路由包含书/章/段/模式；旧 `#settled-memory` 自动规范化为 `#read/dayu/settled/settled-memory?mode=explain` |
| 三种模式 | pass | 模式切换更新正文、选中语义、URL 与匹配 MP3；故事正文实测出现独立叙述“雨像从天上倾倒下来” |
| MiniMax 资产 | pass | 14段 × 3模式，共42个MP3；新增《丝路西行》18条音频均由MiniMax `speech-2.8-hd`生成，23.724–32.364秒 |
| 多书路由 | pass | 大禹和丝路均可由书卡、最近阅读和直接hash进入；书/章/段/模式互不串线，跨书hash切换无pageerror |
| 多书恢复 | pass | 两书各自保存章/段/模式/秒数；最近阅读按书去重为2项，点击后恢复对应书；旧version2状态迁移为version3的`books.dayu` |
| 丝路内容映射 | pass | 3章6段、三种模式、3幅原创WebP、来源边界和18条MP3逐书匹配；播放中选第二段立即切换到`silk-depart-source.mp3` |
| 用户选段优先 | pass | 播放 `flood-arrives-story.mp3` 时点第二段立即切到 `flood-refuge-story.mp3`，再点第一段正确接管 |
| 段内续播 | pass | 第一段 ended 后自动选中“高地求生”并加载对应故事音频 |
| 章末停留 | pass | 第二段 ended 后出现本章收束、下一章标题和 5 秒提示；“停在这里”取消倒计时并留在本章 |
| 章末手动继续 | pass | 点击“继续下一章”进入“治水之争”，保持故事模式并加载 `blocked-dikes-story.mp3` |
| 章末自动继续 | pass | 未干预倒计时，真实等待 5 秒后进入第二章并继续故事模式朗读 |
| 全书完成 | pass | 末章末段完成卡显示“全书读完”，主动作返回书籍展厅 |
| 阅读恢复 | pass | 保存第二章故事模式约 3 秒音频位置；回展厅再继续，点击播放恢复到 2.5 秒以上 |
| 夜间模式 | pass | 章节标题 `rgb(230,223,208)` 对阅读面 `rgb(27,29,25)`，此前同色问题已消除 |
| 控件语义 | pass | 标题播放按钮动态名称包含“暂停朗读 / 当前段 / 沉浸故事”；模式为 radiogroup，旧定位键不再伪装为 toggle |
| 定时选项 | pass | 顶栏浮层包含 15/30 分钟、本段结束、本章结束；当前项使用 `aria-pressed`，按钮名称与秒级标签同步 |
| 分钟到点 | pass | 15 分钟计时经时间推进后自动停止、隐藏计时标签、显示完成提示，并把当时 `audioTime` 写入恢复状态 |
| 本段结束 | pass | 第一段 ended 后 playback 变为 idle，活动段仍为“洪水横流”，没有进入下一段 |
| 本章结束 | pass | 末段 ended 后显示章末总结，文案无 5 秒倒计时；等待 5.2 秒仍停在“洪水之世” |
| 定时取消与键盘 | pass | 30 分钟定时可取消；Escape 关闭浮层并将焦点返回 `#timerButton` |
| 定时移动端 | pass | 390×844 播放态浮层 top=176、right=8、bottom=371.94、width=292、横向溢出 0；日夜均清晰 |
| 定时渐弱 | pass | 推进到约剩 3.5 秒时 `audio.volume=0.405`、`timerPhase=fading`，按钮与浮层显示“柔和收尾” |
| 音量恢复 | pass | 渐弱中取消后音量立即为 1；再次设定并到点后 playback=idle、内部音量重置为 1，保存位置仍有效 |
| 渐弱回归 | pass | 本段/本章定时优先级保持；修订 8 展厅→模式→选段→恢复→续章→末章全旅程复跑通过 |
| 计划默认态 | pass | 清空存储后计划栏显示“给今天留一刻钟”，设置默认20:30/每天/15分钟且未启用 |
| 计划保存/关闭 | pass | 保存00:00/每天/10分钟到版本1独立存储；设置层显示关闭计划入口并可恢复未设置态 |
| 今日时长 | pass | 阅读器前台停留约2.3秒后写入2.331秒；进度线出现；页面隐藏/展厅不累计 |
| 目标完成 | pass | 将进度置于目标前1秒后继续阅读，出现“今日阅读目标完成”，展厅切为完成态 |
| 日期隔离 | pass | 将todayDate置为2000-01-01并重载，自动换成当地今日且todaySeconds=0 |
| 到时提醒 | pass | 00:00未完成计划在保存后站内提醒，lastRemindedDate写为今日，30秒检查不会重复 |
| 通知授权边界 | pass | 保存计划前后Notification.permission均为denied；未自动发起权限请求；按钮明确显示当前能力状态 |
| 计划弹层键盘 | pass | Escape关闭并把焦点还给设置按钮；焦点在弹层首尾循环；点击遮罩可关闭 |
| 计划移动端 | pass | 390×844弹层top167.66、bottom676.34、左右20、width350、overflow0；夜间计划栏清晰 |
| 计划相邻回归 | pass | timer专项与修订8完整旅程再次通过，page/console error=0 |
| 桌面布局 | pass | 1440×900 保持约 39/61 左文右景；展厅与阅读器均无横向溢出 |
| 平板布局 | pass | 820×900 第三章史料模式保持单章 2 段、左右画面和无横向溢出 |
| 手机阅读 | pass | 390×844 播放时视觉条实测 112px、top=0，工具栏 top=112px，正文仍可读且横向溢出为 0 |
| 手机展厅 | pass | 书卡单列、继续阅读与最近记录完整可达，无截断或横向溢出 |
| HTTP / `file://` | pass | 两种路径均载入数据与单章；file 旧链接进入第三章第二段，无脚本错误 |
| 控制台 | pass | 最终全链路 `pageerror=0`、`console error=0` |
| 通用书籍格式 | pass | Book Schema 1.0、标准模板及两本内置JSON均通过Draft 2020-12校验；目录路径可独立解析 |
| Markdown导入 | pass | 《桃花源记》样例解析为2章4段并即时加入展厅；刷新后IndexedDB内容和阅读路由均保留 |
| JSON/TXT适配 | pass | 标准模板连续导入生成`my-book`/`my-book-2`；TXT章节标题识别为2章3段；空文件与超过5MB文件均给出明确错误 |
| 原始文件降级 | pass | 导入书只有“原文阅读”模式；无封面使用字标、无画面使用文字场景、无音频明确显示系统语音 |
| 导入错误与移除 | pass | 非法JSON显示精确语法错误且不改变书库；移除需二次确认，完成后重载仍只剩2本内置书 |
| 导入弹层桌面/手机 | pass | 桌面保持紧凑次级弹层；390×844实测width=350、height=613.78、overflow=0，内容内部可滚动 |

## 最终证据

- `.tmp/shijing-v8/library-desktop.png`
- `.tmp/shijing-v8/library-mobile.png`
- `.tmp/shijing-v8/reader-desktop.png`
- `.tmp/shijing-v8/reader-tablet.png`
- `.tmp/shijing-v8/reader-mobile-playing.png`
- `.tmp/shijing-v8/reader-night.png`
- `.tmp/shijing-v8/chapter-end.png`
- `.tmp/shijing-timer/timer-desktop.png`
- `.tmp/shijing-timer/timer-fading.png`
- `.tmp/shijing-timer/timer-mobile-playing.png`
- `.tmp/shijing-timer/timer-mobile-night.png`
- `.tmp/shijing-plan/plan-active-desktop.png`
- `.tmp/shijing-plan/plan-dialog-desktop.png`
- `.tmp/shijing-plan/plan-dialog-mobile.png`
- `.tmp/shijing-plan/plan-library-mobile-night.png`
- `.tmp/shijing-r12/library-final-desktop.png`
- `.tmp/shijing-r12/library-final-returning.png`
- `.tmp/shijing-r12/silk-reader-desktop.png`
- `.tmp/shijing-r12/library-final-mobile-night.png`
- `.tmp/shijing-r12/silk-reader-mobile-playing.png`
- `.tmp/shijing-r13/import-dialog-desktop.png`
- `.tmp/shijing-r13/import-dialog-mobile.png`
- `.tmp/shijing-r13/imported-reader-desktop.png`
- `docs/demos/shijing-dayu-immersive/assets/audio/generation-manifest.json`
- `projects/shijing-dayu-immersive/REFINEMENT_LEDGER.md`

修订13导入闭环、修订12多书矩阵、计划专项、定时专项和修订8基线均通过，未发现P0/P1/P2级运行、内容同步、恢复或响应式问题。早期 `.tmp/verify-shijing-reader.cjs` 依赖“全书章节同时挂载”的旧DOM，已被修订8的一章一页架构淘汰；以r12完整旅程作为当前阅读回归基线。
