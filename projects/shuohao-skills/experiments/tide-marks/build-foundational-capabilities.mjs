#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const offline = path.join(root, "offline-production");
const control = JSON.parse(fs.readFileSync(path.join(offline, "video-production-control.json"), "utf8"));
const logic = JSON.parse(fs.readFileSync(path.join(offline, "story-logic-audit.json"), "utf8"));
const continuity = JSON.parse(fs.readFileSync(path.join(offline, "continuity-boundary-audit.json"), "utf8"));
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const layers = [
  ["0", "好故事创作与评审", "故事概念、人物欲望、核心矛盾、人物弧、伏笔回收、主题", "story-bible.json", "原库缺失；本次投产失败的首要前置缺口"],
  ["1", "全剧因果与状态建模", "人物知识、目标、位置、证物首次出现、持有关系、时间线、原因与结果", "causal-graph.json / state-timeline.json", `原库缺失；《潮痕》的 ${logic.summary.reviewed} 项审计是生成后的补救，不是合格的前置门`],
  ["2", "小说改编成短剧结构", "砍线、合人、改序、补桥、分集、钩子和悬念", "adaptation-plan.json / outline.json", "原库提供 outline 结构，但不保证改编取舍与因果连续性"],
  ["3", "统一角色与美术资产", "角色、场景、道具、状态变体、视觉锚点与声音设计", "cast.json / art.json", "原库 characters/art + 图像模型"],
  ["4", "可表演剧本", "场次、动作节拍、台词、时长、人物行为与情绪推进", "script.json", "原库 novel-script 已覆盖结构；语义仍需审"],
  ["5", "故事逻辑到视觉状态编译", "把每段剧情变成前置状态、动作、禁止动作、结束状态和下一段继承条件", "segment-contract.json", "原库缺失；《潮痕》已加入部分衔接契约"],
  ["6", "技术分镜与投产包", "段、切镜、关键帧、图片顺序、H3 切点、声景与配乐提示", "storyboard.json / prompt.md", "原库 novel-storyboard 的核心能力"],
  ["7", "真实视频生成运行时", "模型、参数、费用、版本、任务状态、返回视频与失败原因", "generation-run.json", "原库明确不做；当前外部手工生成"],
  ["8", "视频理解、QC 与返工闭环", "提取真实首尾状态，检查动作、人物、道具、因果和相邻衔接，决定改图/改词/拆镜", "video-qc.json / repair-decision.json", `原库缺失；${continuity.summary.verify} 个接点等待真实视频验证`],
  ["9", "最终剪辑与交付", "回切时长、拼接、字幕、配音、音效、音乐、调色、响度和导出", "edit-decision-list.json / final master", "原库明确不做；资料已准备但成片未完成"],
];

const gates = [
  ["故事门", "核心欲望、冲突升级、人物选择、伏笔回收和结局必须成立", "不通过不得进入短剧改编"],
  ["因果门", "每场必须有进入原因和退出结果；证物不得提前出现；人物知识不能越界", "不通过不得写技术分镜"],
  ["视觉状态门", "每段必须声明人物位置/朝向、道具持有、物体开合和动作终态", "不通过不得提交视频生成"],
  ["原库结构门", "五层 validate 全部通过，镜头时长、切点、台词和引用合法", "不通过不得导出投产包"],
  ["真实视频门", "实际视频满足段内故事、首尾状态和相邻连播", "不通过不得标记采用"],
  ["全片门", "全片因果、节奏、声音、字幕、视觉一致性与交付格式通过", "不通过不得称为成片"],
];

const roadmap = [
  ["A", "补前端", "新增 story-author 与 story-logic：先产生故事母本、因果图和状态时间线，再进入现有五层管线。"],
  ["B", "补编译层", "从 script/storyboard 自动生成 segment-contract，并让每条 H3 提示词继承前置/结束状态。"],
  ["C", "补运行时", "接入 H3 或其他视频模型 API/手工导入适配器，统一保存运行参数、费用和版本。"],
  ["D", "补反馈闭环", "自动抽取首尾帧，结合视觉模型判断状态；失败分类为改图、改词、拆镜、补桥接镜或回切。"],
  ["E", "补成片", "通过 QC 的片段才进入自动剪辑，按 EDL 叠加字幕、声音、音乐和后期界面。"],
];

const layerRows = layers.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("");
const gateCards = gates.map(([name, check, result]) => `<article><span>${esc(name)}</span><h3>${esc(check)}</h3><p>${esc(result)}</p></article>`).join("");
const roadmapCards = roadmap.map(([id, title, text]) => `<article><b>${id}</b><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`).join("");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>从好故事到好视频：基础能力架构</title><style>:root{color-scheme:dark;--bg:#071018;--panel:#111d27;--line:#2a4151;--text:#eef6fa;--muted:#9cb2c1;--cyan:#52d9e6;--amber:#f0b85f;--green:#74ddb0}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#173b44,transparent 32rem),var(--bg);color:var(--text);font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1260px;margin:auto;padding:40px 22px 80px}a{color:var(--cyan)}h1{font-size:clamp(30px,5vw,54px);line-height:1.12;margin:10px 0}h2{margin-top:38px}p{color:var(--muted)}.hero,.conclusion{border:1px solid var(--line);background:rgba(17,29,39,.92);border-radius:18px;padding:24px}.conclusion{margin-top:18px;border-left:5px solid var(--amber)}.flow{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.flow span{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#0c1821}.flow i{color:var(--amber);font-style:normal;padding:8px 0}table{width:100%;border-collapse:collapse;background:var(--panel)}th,td{padding:12px 13px;border:1px solid var(--line);vertical-align:top;text-align:left}th{color:var(--cyan);background:#0c1821}td{color:var(--muted)}td:nth-child(1),td:nth-child(2){color:var(--text);font-weight:700}.gates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.gates article,.roadmap article{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:16px}.gates span{color:var(--green);font-weight:800}.gates h3,.roadmap h3{margin:6px 0}.roadmap{display:grid;gap:10px}.roadmap article{display:flex;gap:14px}.roadmap article>b{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#13313a;color:var(--cyan);flex:none}.roadmap p{margin:0}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.stats div{border:1px solid var(--line);border-radius:12px;background:#0c1821;padding:14px}.stats b{display:block;font-size:25px}.stats small{color:var(--muted)}@media(max-width:820px){.gates,.stats{grid-template-columns:1fr}table{display:block;overflow:auto}}</style></head><body><main><a href="../index.html">← 返回《潮痕》主入口</a><section class="hero"><p>目标架构 · 2026-08-24</p><h1>从好故事到好视频：必须补齐的基础能力</h1><p>好视频不是从提示词开始，而是从好故事、可靠因果和可执行视觉状态开始。现有 shuohao-skills 位于这条链的中段；本报告固定完整能力边界和后续开发方向。</p><div class="flow"><span>好故事</span><i>→</i><span>因果图</span><i>→</i><span>短剧改编</span><i>→</i><span>视觉状态编译</span><i>→</i><span>分镜投产包</span><i>→</i><span>真实视频</span><i>→</i><span>QC 返工</span><i>→</i><span>成片</span></div><div class="stats"><div><small>设计段</small><b>${control.totals.segments}/59</b></div><div><small>设计镜</small><b>${control.totals.shots}/193</b></div><div><small>故事逻辑修复</small><b>${logic.summary.fixed}/${logic.summary.reviewed}</b></div><div><small>待真实连播</small><b>${continuity.summary.verify}/58</b></div></div></section><section class="conclusion"><b>架构结论</b><p>只有把“好故事创作、因果状态建模、故事到视觉的编译、真实视频反馈闭环”补在原库前后，后面的 H3 提示词和关键帧才可能稳定转化为好视频。缺任意一层，都只能得到资料完整但结果不可靠的生产包。</p></section><h2>一、完整能力分层</h2><table><thead><tr><th>层</th><th>能力</th><th>解决的问题</th><th>核心产物</th><th>当前状态</th></tr></thead><tbody>${layerRows}</tbody></table><h2>二、六道不可跳过的质量门</h2><section class="gates">${gateCards}</section><h2>三、后续开发路线</h2><section class="roadmap">${roadmapCards}</section><section class="conclusion"><b>当前阶段定义</b><p>资源、库能力和故事预生产探索已完成并可归档；真实视频生产与最终成片未完成。后续工作应围绕生成运行时和反馈闭环，不再以新增报告数量作为完成度。</p></section><p><a href="capability-evaluation.html">查看能力归属与实测评估</a> · <a href="story-logic-audit.html">查看故事逻辑审计</a> · <a href="continuity-audit.html">查看段间衔接审计</a></p></main></body></html>`;

const md = `# 从好故事到好视频：必须补齐的基础能力

## 核心结论

好视频不是从提示词开始，而是从好故事、可靠因果和可执行视觉状态开始。只有把“好故事创作、因果状态建模、故事到视觉的编译、真实视频反馈闭环”补在原库前后，H3 提示词和关键帧才可能稳定转化为好视频。

## 完整能力分层

| 层 | 能力 | 解决的问题 | 核心产物 | 当前状态 |
| --- | --- | --- | --- | --- |
${layers.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## 六道不可跳过的质量门

${gates.map(([name, check, result]) => `- **${name}**：${check}。${result}`).join("\n")}

## 后续开发路线

${roadmap.map(([id, title, text]) => `${id}. **${title}**：${text}`).join("\n")}

## 当前阶段定义

- 库能力与边界探索已完成。
- 本次故事预生产没有通过叙事前置质量门，属于失败的投产尝试。
- 现有 59 段、193 镜、图片与提示词只作为实验资料，不继续扩大视频生成。
- 后续工作回到小说原型、因果状态建模和小说到短剧的改编方法。
`;

const correctedHtml = html.replace("资源、库能力和故事预生产探索已完成并可归档；真实视频生产与最终成片未完成。后续工作应围绕生成运行时和反馈闭环，不再以新增报告数量作为完成度。", "库能力与边界探索已完成，但本次故事预生产没有通过叙事前置质量门，属于失败的投产尝试。现有资料只作为实验样本；停止扩大视频生成，研究重心前移到小说原型、因果状态和小说到短剧的改编方法。");
fs.writeFileSync(path.join(offline, "foundational-capability-architecture.html"), correctedHtml, "utf8");
fs.writeFileSync(path.join(root, "FOUNDATIONAL-CAPABILITIES.zh-CN.md"), `${md}\n`, "utf8");
console.log("✓ 基础能力架构：10 层能力、6 道质量门、5 阶段开发路线");
