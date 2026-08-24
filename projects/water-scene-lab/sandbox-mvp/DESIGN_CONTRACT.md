# Interactive Water Sandbox｜S10-WP3 Design Contract

## Contract

- Entry mode: `brief-led continuation`
- Request revision: `3`
- Target user and context: 在桌面浏览器中检查 Particles4All 场景能力、差异与后续价值的研究/产品人员。
- Desired first impression: 这是一个以场景目标组织原库能力的操作台，不是第四个孤立水效果。
- Visual ambition: `Immersive`
- Experience architecture: `Spatial Stage`
- Scene base: 空闲态为可读 DOM/CSS 宿主预览；运行态按需创建唯一 Particles4All iframe/WebGPU 并显示原库画布。
- Scene persistence: 预设选择和证据检查期间保持主视口可见。
- Foreground control model: 左侧三预设导航，中央单运行槽，右侧对象/证据/边界面板。
- State-to-scene mapping: `idle` 显示运行前契约说明；`loading/running` 显示真实 Runtime 画布和当前阶段；`complete` 同时显示画布、本次指标与逐项 Gate；`error` 隐藏无效画布并显示明确恢复动作；`ready` 表示 Runtime 保留但结果已清除。
- Mobile transformation: 不在本阶段范围内；目标平台固定为桌面浏览器。
- Fallback: 没有 WebGPU 或尚未加载时，全部目标、预设、历史证据和边界仍由语义 DOM 可读。
- Visual constraints: 延续 Water Scene Lab 深色、青色证据语言；一个主要视觉焦点；不使用素材图冒充运行时。
- Information constraints: 首屏必须说明宏观目标、当前预设、原生对象、运行前成本、当前生命周期阶段、本次实际结果、逐项 Gate、历史证据与真实性边界。
- Operation constraints: 三预设可鼠标和键盘选择；只有显式运行才加载 iframe；任意时刻 `runtimeSlots≤1`；切换预设先卸载旧 Runtime；重跑显式触发同一契约；“清除结果”保留 Runtime，“卸载归零”移除 Runtime。
- State constraints: `idle / loading / ready / running / complete / error` 可观察；每个状态的主操作、次操作、场景表现和结果面板必须一致，不使用虚构进度百分比。
- Environment constraints: canonical URL `http://127.0.0.1:8107/demos/water-scene-lab/sandbox/`；桌面 Chrome/Edge；深色单主题；中文界面。
- Primary journey: 打开宿主 → 阅读当前预设的运行前摘要 → 显式运行原契约 → 观察真实 loading/running → 通过本次指标和逐项 Gate 判断结果 → 选择重跑、清除结果但保留 Runtime、卸载归零或切换场景。
- User-defined phases: Stage 10 / S10-WP3 Guided Evidence Sequence, Controlled Rerun and Recovery。
- Required artifacts: 生命周期引导、运行前摘要、逐项 acceptance、显式重跑、结果清除、卸载语义、错误恢复、键盘路径、状态浏览器测试、最终桌面截图、README/EVIDENCE 与状态更新。
- Autonomy authorization: 用户连续要求“继续”，并明确要求不要重复询问；授权在既定 Stage 10 范围内直接实施和验证可逆更改。
- User-decision boundary: 新业务方向、工程标定、移动端、通用编辑器、任意资产导入或新求解器不在授权范围内。
- Observable completion criteria: 运行前可读到 contract/body/粒子/ticks；idle→loading→ready→running→complete 轨迹可审计；complete 显示实际指标与全部 acceptance；同一契约重跑不创建第二 Runtime 且 run count 增加；清除结果进入 ready 并保留单 Runtime；卸载归零进入 idle 并移除 iframe src；可复现 error→idle 恢复；键盘可完成选择、运行、清除和卸载；1440×1000 与 1280×900 无溢出、控制台错误或页面异常。

## Design direction

| Decision | Direction | Observable constraint | Acceptance |
| --- | --- | --- | --- |
| Composition | 左预设 / 中央主视口 / 右证据，首屏完成主要旅程 | 主视口最大，控制与证据不掉到无关长页面 | 1440 首屏能同时看到选择、视口和关键证据 |
| Focal hierarchy | 当前场景目标与英雄对象优先 | 历史指标不能抢过“solver 未加载”状态 | 首扫先识别当前预设和运行槽状态 |
| Typography | 大标题 + 紧凑技术标签 + 可读正文 | 不使用过细、过小的正文承担边界说明 | 正文与按钮在桌面截图中清晰 |
| Palette/material | 深海蓝底、青色活动状态、琥珀色边界提示 | 颜色之外还有文字与选中标记 | 活动、历史证据、边界三类语义可区分 |
| Motion | 仅预设切换的短过渡；尊重 reduced motion | 无持续装饰动画 | reduced-motion 下内容不消失 |

## Coverage manifest

| Requirement | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| 可运行 Sandbox 路由 | 1440×1000 / idle | HTTP、DOM、截图 | Stage 1–3 | pass | Chrome 路由与最终截图通过 |
| 三固定预设导航 | mouse + keyboard / selected | 选择三预设后的 DOM 状态 | Stage 4–5 | pass | 三次选择与 ArrowDown 状态通过 |
| 单运行槽空闲边界 | idle / no WebGPU | `runtimeSlots=0`、iframe 无 src | Stage 6/8 | pass | 两视口均确认未加载 runtime |
| 桌面布局 | 1440×1000、1280×900 | overflow、截图 | Stage 7 | pass | 两视口 overflow=0 |
| 路线台入口 | Water Scene Lab route | 链接与路线台回归 | Stage 7/9 | pass | Sandbox 入口与路线台回归通过 |
| 工程与交付 | source/tests/docs | 自动化结果与最终证据 | Stage 9 | pass | README、EVIDENCE、测试与状态已更新 |
| 唯一 Runtime 加载 | idle → loading → ready | 状态轨迹、slots≤1、iframe src | Stage 4–6 | pass | 三次运行 maxObservedRuntimeSlots=1 |
| 三原契约实际执行 | impact / drift / uplift complete | acceptance、profile、方向与旋转结果 | Stage 5–6 | pass | 三原契约与原生 body profile 全部通过 |
| 切换前自动卸载 | complete A → select B | 旧 iframe 卸载、槽位不叠加 | Stage 5–6 | pass | 两次切换均先回到 slots=0 / no-src |
| 手动卸载恢复 | complete → idle | slots=0、iframe 无 src、结果清空 | Stage 6/8 | pass | 最后一场手动卸载回到完整空闲态 |
| WP2 桌面运行态 | 1440×1000 complete | 实际 WebGPU 画布与结果截图 | Stage 7–8 | pass | impact / drift / uplift 三张运行态截图 |
| WP2 工程与交付 | tests/docs/state | 自动化结果与终端审计 | Stage 9 | pass | Runtime Gate 30/30 与状态收口 |
| 运行前摘要与生命周期引导 | idle / selected | contract、body、粒子、ticks、步骤状态 DOM | Stage 3–6 | pass | 四阶段 guide 与 preflight 回读通过 |
| 逐项实际 Gate | complete | acceptance checks 与实际指标 DOM | Stage 5–6 | pass | Waterfall 7 项、River 8 项均逐项 PASS |
| 同一契约可控重跑 | complete → running → complete | 同一 runtimePresetId、slots=1、run count+1 | Stage 5–6 | pass | 两视口 run count=2 且 loading 只发生一次 |
| 清除结果但保留 Runtime | complete → ready | result=null、slots=1、iframe src 保留 | Stage 5–6 | pass | 两视口均进入 ready 并保留原 iframe src |
| 卸载与切换语义 | ready/complete → idle | slots=0、iframe no-src、结果清空 | Stage 5–6 | pass | 键盘卸载与 WP2 自动切换回归通过 |
| 错误状态与恢复 | no WebGPU / error → idle | 错误说明、恢复动作、无伪结果 | Stage 6/8 | pass | 无 WebGPU 快速失败并键盘卸载恢复 |
| WP3 桌面与键盘路径 | 1440×1000、1280×900 | complete/ready/error、focus、overflow、截图 | Stage 7–8 | pass | Guided Lifecycle Gate 19/19 |
| WP3 工程与交付 | tests/docs/state | 自动化结果、覆盖审计与状态推进 | Stage 9 | pass | 文档、状态与终端审计完成 |
