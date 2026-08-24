#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "offline-production");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const logic = JSON.parse(fs.readFileSync(path.join(outDir, "story-logic-audit.json"), "utf8"));
const continuity = JSON.parse(fs.readFileSync(path.join(outDir, "continuity-boundary-audit.json"), "utf8"));
const control = JSON.parse(fs.readFileSync(path.join(outDir, "video-production-control.json"), "utf8"));
const tracker = fs.readFileSync(path.join(outDir, "video-production-tracker.csv"), "utf8");
const segments = storyboard.episodes.flatMap((episode) => episode.segments);
const cuts = segments.reduce((sum, item) => sum + item.cuts.length, 0);
const actualVideoFiles = [
  path.join(root, "generated-videos", "E01-01", "E01-01-v01.mp4"),
  path.join(root, "generated-videos", "E01-02", "E01-02-v01.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-01", "e02-01-generated-chatart-h3-768p.mp4"),
];
const actualVideos = actualVideoFiles.filter((file) => fs.existsSync(file)).length;
const acceptedVideos = tracker.split(/\r?\n/).slice(1).filter((line) => line.includes('"QC通过"')).length;
const staticPreviewFiles = [
  path.join(root, "animatic", "tide-marks-episode-01-silent-animatic.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-01", "e02-01-static-preflight.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-02", "e02-02-static-preflight.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-03", "e02-03-static-preflight.mp4"),
].filter((file) => fs.existsSync(file)).length;
const percent = (value, total) => `${(value / total * 100).toFixed(1)}%`;
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const rows = [
  ["读取/分块/seed/merge", "原库确定性脚本", "把长文本拆块，搬运上游已决定的 ID、集数、场景、人物与节拍；不负责判断故事好坏。"],
  ["大纲、人物画像、故事取舍", "大模型在原库工作流约束下完成", "库规定字段、阶段与质量门；具体保留什么、合并谁、人物动机与分集内容由模型判断。"],
  ["场景/道具/角色提示词", "大模型创作 + 原库结构和校验", "库检查锚点数量、语言、无人物/无手、尺度等形式规则；视觉设计内容由模型生成。"],
  ["剧本动作、台词、因果关系", "主要是大模型", "原库只校验时长、句长、说话人、钩子、引用和上下游 ID；不会自动判断证物是否提前出现。"],
  ["分段、切镜与 H3 正文", "大模型切镜 + 原库机械对账", "模型决定镜头内容；库推导对齐时间、检查 2–5 秒、≤15 秒、台词逐字和运镜词。"],
  ["角色/场景/道具图、193 张关键帧", "Codex 图像模型 + 大模型选择/QC", "原库只给出出图调用契约和目录约定，不包含这些成图，也不保证一致性。"],
  ["ChatArt 导入顺序、中文控制台、成本表", "本项目的大模型工程扩展", "不是上游仓库原生功能；用于把原库投产包翻译成用户可执行的操作。"],
  ["58 个段间衔接审计、11 项故事逻辑审计", "本项目的大模型分析 + 自建确定性报告", "原库没有跨段尾首状态和全剧证物因果质量门；本项目后加。"],
  ["静态预演/动画分镜", "本项目后期脚本", "只验证图片顺序和节奏，不等于视频模型理解了动作。"],
  ["真实视频动作、声音与插值", "MiniMax H3 / ChatArt", "库和大模型只能提供输入；最终运动方向、人物一致性、口型和首尾状态由视频模型实际执行。"],
  ["拼接、调色、字幕、混音、最终交付", "尚未完成", "原库明确不做视频生成与剪辑合成；本项目目前只准备时间线、字幕和声音表。"],
];

const comparison = [
  ["结构化与可追踪", "强：五层 JSON、ID 引用、报告和 export 明确", "很适合作为生产规格和研究基线"],
  ["确定性质量门", "强：本机 5 个 selftest 共 1170 项全部通过；本项目五层原生 validate 已全部通过", "能抓格式、时长、引用、切点和提示词结构错误"],
  ["故事语义与因果", "原生缺失：质量门不判断小说原型、人物欲望、因果推进和改编后的行动连续性", `本项目在生成图片后才补做 ${logic.summary.reviewed} 项审计；属于事后补救，不能证明叙事前置质量门合格`],
  ["跨段运动连续性", "原生缺失：只保证段内切点，不校验上一段终态与下一段初态", `本项目新增 58 个接点审计；${continuity.summary.verify} 个仍需真实视频连播`],
  ["提示词可执行性", "中等：H3 格式与时间对账可靠，但语义执行不可验证", "E01-01 已证明格式正确仍可能生成反向动作"],
  ["视觉资产一致性", "库提供方法，不提供结果保证", "193 张图已人工/QC 放行，但视频模型仍可能重画人物、道具和空间"],
  ["视频闭环", "弱/不在范围：明确不生成视频、不剪辑、不管口型", `真实生成 ${actualVideos}/${segments.length} 段，正式采用 ${acceptedVideos}/${segments.length} 段`],
  ["使用成本", "前期文件多、认知负担高，但返工定位清楚", `全片 H3 计划 ${control.totals.h3Seconds}s / ${control.totals.diamonds} 钻，尚不含返工；当前已停止扩大生成`],
  ["平台通用性", "脚本零 npm 依赖、可离线；上游声明主要只在 macOS + Node 24 实测", "本项目在 Windows 完成运行与兼容修复，但生成平台适配仍需逐个验证"],
];

const whyDifferent = [
  ["原库校验的是“规格合法”", "例如镜头 4 秒、台词能装下、Picture 2 对齐 4.00 秒。这些都能由代码确定。"],
  ["大模型负责的是“规格内容”", "动作是否自然、证物是否应该出现、人物动机是否充分，属于语义判断；模型可能漏掉。"],
  ["视频模型执行的是“时空运动”", "它会根据图片和文字自行插值，并不承诺按故事逻辑抵达指定终态。E01-01 把关门生成成奔向门准备开门，就是这一层的失败。"],
  ["静态图无法证明动态成立", `${staticPreviewFiles} 个静态预演只能证明图片次序和时长可播放，不能证明人物会正确转身、开关门或接续下一段。`],
  ["单段正确也不等于全片正确", "E01-02 单独看可以成立，但接在错误的 E01-01 后面就产生空间和行动回退。必须做相邻两段尾 2 秒 + 首 2 秒连播。"],
];

const scores = [
  ["预生产结构与可追溯性", 9, "已经很强，属于库的核心研究价值"],
  ["确定性规则与格式可靠性", 9, "原生质量门有效；现已接入每次总构建"],
  ["故事语义可靠性", 3, "两段连播已经暴露人物目标、位置与动作因果回退；叙事前置门未通过"],
  ["关键帧生产完成度", 8, "193/193 文件已备；但只能归类为实验资料，不能称为正式投产准备"],
  ["H3 提示词实际可靠性", 3, "格式可靠，但提示词继承了上游故事与拆分问题，不值得继续扩大生成"],
  ["跨段视频连续性", 3, `仅 ${actualVideos} 段真实样本，且已有明确失败案例`],
  ["端到端自动成片能力", 2, "没有自动生成、回传、QC、返工、拼接闭环"],
  ["作为研究框架的价值", 8, "适合研究结构化预生产、质量门和模型协作边界"],
];

const tableRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
const comparisonRows = comparison.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
const diffCards = whyDifferent.map(([title, text]) => `<article><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("");
const scoreRows = scores.map(([name, score, note]) => `<div class="score"><span>${esc(name)}</span><div class="bar"><i style="width:${score * 10}%"></i></div><b>${score}/10</b><small>${esc(note)}</small></div>`).join("");

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>shuohao-skills ×《潮痕》能力归属与最终评估</title><style>:root{color-scheme:dark;--bg:#081017;--panel:#111d27;--line:#294050;--text:#eef6fb;--muted:#9eb4c2;--cyan:#54dae8;--amber:#f2bb66;--green:#73dcae;--red:#ff7b7b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#163943,transparent 34rem),var(--bg);color:var(--text);font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1280px;margin:auto;padding:38px 22px 80px}a{color:var(--cyan)}h1{font-size:clamp(30px,5vw,54px);line-height:1.12;margin:8px 0}h2{margin-top:38px}p{color:var(--muted)}.hero,.verdict,.scorebox{background:rgba(17,29,39,.9);border:1px solid var(--line);border-radius:18px;padding:24px}.hero{margin-top:18px}.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:20px}.kpi{padding:14px;background:#0c1821;border:1px solid var(--line);border-radius:12px}.kpi small{color:var(--muted)}.kpi b{font-size:26px;display:block}.verdict{margin-top:18px;border-left:5px solid var(--amber)}.verdict strong{color:var(--amber);font-size:19px}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line)}th,td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{color:var(--cyan);background:#0d1922}td{color:var(--muted)}td:first-child{color:var(--text);font-weight:700}.diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.diff article{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:16px}.diff h3{margin:0 0 7px}.score{display:grid;grid-template-columns:210px 1fr 58px;gap:10px;align-items:center;margin:13px 0}.score small{grid-column:2/4;color:var(--muted)}.bar{height:10px;background:#071016;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--amber),var(--cyan))}.steps li{margin:8px 0;color:var(--muted)}.foot{margin-top:34px;padding-top:18px;border-top:1px solid var(--line)}@media(max-width:850px){.kpis{grid-template-columns:repeat(2,1fr)}.diff{grid-template-columns:1fr}.score{grid-template-columns:1fr 52px}.score span{grid-column:1/3}.score small{grid-column:1/3}table{display:block;overflow:auto}}</style></head><body><main><a href="../index.html">← 返回《潮痕》主入口</a><section class="hero"><p>库能力归属 · 大模型扩展 · 最后一公里差异</p><h1>shuohao-skills ×《潮痕》最终能力评估</h1><p>本页不把“文件生成数量”当作成片完成度，而是区分：原库确定性能力、模型创作能力、外部图像/视频模型执行能力，以及仍未完成的生产闭环。</p><div class="kpis"><div class="kpi"><small>预生产段</small><b>${segments.length}/59</b></div><div class="kpi"><small>关键帧</small><b>${cuts}/193</b></div><div class="kpi"><small>真实视频</small><b>${actualVideos}/59</b></div><div class="kpi"><small>正式采用</small><b>${acceptedVideos}/59</b></div><div class="kpi"><small>原库自测</small><b>1170</b></div></div></section><section class="verdict"><strong>一句话结论</strong><p>这个库不是“把小说直接变成视频”的生成器，而是<strong>把小说改编工作组织成可校验、可追踪、可交给图像/视频模型的预生产规格</strong>。它最强的是结构、质量门、报告与投产包；最弱且明确不做的是视频执行、跨段动态连续性、生成返工闭环与最终剪辑。《潮痕》已把预生产探索做深，但距离成片仍不是“只差点一下按钮”。</p></section><h2>一、哪些属于原库，哪些属于大模型</h2><table><thead><tr><th>环节</th><th>主要归属</th><th>实际含义</th></tr></thead><tbody>${tableRows}</tbody></table><h2>二、能力优缺点</h2><table><thead><tr><th>评价维度</th><th>原库表现</th><th>《潮痕》实测结论</th></tr></thead><tbody>${comparisonRows}</tbody></table><h2>三、为什么“生成一大堆东西”仍不等于视频完成</h2><section class="diff">${diffCards}</section><h2>四、本项目阶段评分</h2><section class="scorebox">${scoreRows}</section><h2>五、真正缺少的最后闭环</h2><ol class="steps"><li><b>视频生成适配器：</b>将 59 个段包自动提交到 H3/其他模型，记录模型、参数、费用、版本和返回文件。</li><li><b>首尾状态检测：</b>从每段真实视频提取首尾帧和动作终态，与相邻段状态契约自动比较。</li><li><b>语义与因果 QC：</b>验证“谁做了什么、证物是否提前出现、门到底开还是关”，而不只检查文件存在。</li><li><b>失败闭环：</b>失败后自动判断是改图、改提示词、拆镜、补桥接镜，还是只需回切时长。</li><li><b>最终组装：</b>按 193 镜时间线剪辑，叠字幕/界面、配音、音效、音乐、响度、色彩并导出成片。</li></ol><section class="verdict"><strong>研究价值判断</strong><p><b>有研究价值，而且价值主要在“可验证的多模型预生产与质量门”而不是单次生成效果。</b>作为小说→结构化短剧资产的框架，价值较高；作为无人值守小说→成片系统，目前证据不足。建议把后续研究重点放在“真实视频反馈如何反向训练规则和提示词”，而不是继续增加报告数量。</p></section><p class="foot">证据入口：<a href="media-demo.html">真实视频与静态预演对比</a> · <a href="story-logic-audit.html">故事逻辑审计</a> · <a href="continuity-audit.html">段间衔接审计</a> · <a href="video-production-control.html">视频生产控制台</a> · <a href="../../../upstream/README.md">上游仓库说明</a></p></main></body></html>`;

const mdRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
const mdComparison = comparison.map((row) => `| ${row.join(" | ")} |`).join("\n");
const md = `# shuohao-skills ×《潮痕》能力归属与最终评估

## 一句话结论

这个库不是“把小说直接变成视频”的生成器，而是把小说改编工作组织成可校验、可追踪、可交给图像/视频模型的预生产规格。最强的是结构、质量门、报告和投产包；视频生成、跨段动态连续性、返工闭环与最终剪辑明确不在原库范围。

## 当前真实完成度

- 实验资料：${segments.length}/59 段，${cuts}/193 镜，关键帧文件齐全；叙事前置质量门未通过，不能称为可投产。
- 真实视频模型输出：${actualVideos}/59 段（${percent(actualVideos, segments.length)}）。
- 正式 QC 采用：${acceptedVideos}/59 段。
- 静态预演：${staticPreviewFiles} 个，只验证时长和图片顺序，不能当成真实视频。
- 原库五个 selftest：158 + 355 + 249 + 154 + 254 = 1170 项，本机全部通过。
- 原库五层 validate：大纲、角色、美术、剧本、分镜均已接入总构建并通过。

## 能力归属

| 环节 | 主要归属 | 实际含义 |
| --- | --- | --- |
${mdRows}

## 优缺点

| 维度 | 原库表现 | 《潮痕》实测结论 |
| --- | --- | --- |
${mdComparison}

## 最后一公里差异

${whyDifferent.map(([title, text]) => `- **${title}**：${text}`).join("\n")}

## 阶段评分（本项目评估）

${scores.map(([name, score, note]) => `- ${name}：${score}/10。${note}`).join("\n")}

## 最终判断

- 库能力与边界探索已经完成；本次短剧投产尝试未通过叙事前置质量门。
- 两个连续视频样本已经足以暴露流程级问题，不继续生成剩余视频。
- 59 段、193 镜及相关图片和提示词归类为实验资料与失败证据，不是正式投产资产。
- 后续研究重心前移到小说原型质量、全剧因果图、状态时间线和小说到短剧的真正改编。
`;

const correctedHtml = html
  .replace("预生产段</small>", "实验分段</small>")
  .replace("《潮痕》已把预生产探索做深，但距离成片仍不是“只差点一下按钮”。", "《潮痕》的库能力探索已经完成，但本次短剧投产尝试未通过叙事前置质量门；现有资料不能直接投产，也不值得继续扩大视频生成。")
  .replace(/<h2>五、真正缺少的最后闭环<\/h2><ol class="steps">[\s\S]*?<\/ol>/, `<h2>五、真正缺少的前置能力</h2><ol class="steps"><li><b>小说原型评审：</b>先判断人物欲望、核心矛盾、关键选择、人物弧、伏笔与结局是否成立。</li><li><b>全剧因果图：</b>明确每场的进入原因、发生变化和退出结果，以及为什么必须进入下一场。</li><li><b>状态时间线：</b>追踪人物位置、知识、目标、道具持有、物体开合和证物首次出现。</li><li><b>真正的短剧改编：</b>允许删线、合人、改序、补桥和重写，而不是把小说机械切段。</li><li><b>低成本叙事质量门：</b>先用文字走查、状态表或静态预演验证连续片段，再生成 2～3 段视频小样。</li></ol>`)
  .replace("建议把后续研究重点放在“真实视频反馈如何反向训练规则和提示词”，而不是继续增加报告数量。", "两个连续视频样本已经足以触发停止条件。后续研究重心应前移到小说原型、因果图和小说到短剧的改编方法；这些质量门通过前，不再扩大视频生成。")
  .replace("证据入口：", `证据入口：<a href="library-exploration-conclusion.html">失败复盘与停止决策</a> · `);
fs.writeFileSync(path.join(outDir, "capability-evaluation.html"), correctedHtml, "utf8");
fs.writeFileSync(path.join(outDir, "CAPABILITY-EVALUATION.zh-CN.md"), `${md}\n`, "utf8");
console.log(`✓ 能力评估：真实视频 ${actualVideos}/${segments.length}，正式采用 ${acceptedVideos}/${segments.length}，静态预演 ${staticPreviewFiles}`);
