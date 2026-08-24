#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const offline = path.join(root, "offline-production");
const pack = path.join(root, "storyboard-full-pack");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "continuity-audit-policy.json"), "utf8"));
const segments = storyboard.episodes.flatMap((episode) => episode.segments);
const blocked = new Set(policy.blocked || []);
const verify = new Set(policy.verify || []);
const expectedIds = segments.slice(0, -1).map((segment, index) => `${segment.id}→${segments[index + 1].id}`);
const knownIds = new Set([...blocked, ...verify]);

for (const id of knownIds) if (!expectedIds.includes(id)) throw new Error(`衔接策略引用了不存在的接点：${id}`);
for (const id of blocked) if (verify.has(id)) throw new Error(`接点不能同时标记阻断和待验证：${id}`);
if (expectedIds.length !== 58) throw new Error(`预期 58 个接点，实际 ${expectedIds.length}`);

const clean = (value) => String(value || "").replace(/^动作：/, "").replaceAll("；动作：", "；");
const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const boundaries = expectedIds.map((id, index) => {
  const previous = segments[index];
  const next = segments[index + 1];
  const previousCut = previous.cuts.at(-1);
  const nextCut = next.cuts[0];
  const crossEpisode = previous.id.slice(1, 3) !== next.id.slice(1, 3);
  const sameScene = previous.sceneZh === next.sceneZh;
  const risk = blocked.has(id) ? "高" : verify.has(id) ? "中" : "低";
  const status = risk === "高" ? "阻断投产" : risk === "中" ? "待链路验证" : "可按现有切点";
  const transitionType = crossEpisode ? "章回/时空跳转" : sameScene ? "同场连续或反打" : "动机转场";
  const repair = policy.repairs?.[id] || null;
  const genericContract = crossEpisode
    ? "必须用建立镜、环境变化或声音桥明确新时间/地点，不得伪装成同一秒连续动作。"
    : sameScene
      ? "保持人物、道具、视线、运动方向和物体开合状态；生成后连播上一段尾 2 秒与下一段首 2 秒。"
      : "上一段必须完成离场动机，下一段以新场景建立镜或明确到达动作开始。";
  return {
    id,
    index: index + 1,
    previousSegment: previous.id,
    nextSegment: next.id,
    previousScene: previous.sceneZh,
    nextScene: next.sceneZh,
    previousLastFrame: `../storyboard-full-pack/${previous.id}/f${previous.cuts.length}.png`,
    nextFirstFrame: `../storyboard-full-pack/${next.id}/f1.png`,
    previousEndState: clean(previousCut.descriptionZh),
    nextStartState: clean(nextCut.descriptionZh),
    transitionType,
    risk,
    status,
    contract: repair?.action || genericContract,
    problem: repair?.problem || (risk === "中" ? "静态关键帧没有直接矛盾，但必须用相邻视频连播确认动作、轴线或时空跳转。" : "关键帧与剧情动作未发现明显状态逆转；仍须执行常规相邻段连播 QC。"),
    repairTarget: repair?.target || "无",
  };
});

const summary = {
  total: boundaries.length,
  reviewed: boundaries.length,
  direct: boundaries.filter((item) => item.risk === "低").length,
  verify: boundaries.filter((item) => item.risk === "中").length,
  blocked: boundaries.filter((item) => item.risk === "高").length,
  fullFilmContinuityReady: boundaries.every((item) => item.risk === "低"),
};

fs.mkdirSync(offline, { recursive: true });
fs.writeFileSync(path.join(offline, "continuity-boundary-audit.json"), `${JSON.stringify({ reviewedAt: policy.reviewedAt, scope: policy.scope, summary, boundaries }, null, 2)}\n`, "utf8");
const fields = ["序号", "接点", "上一段", "下一段", "转场类型", "风险", "状态", "上一段终态", "下一段起态", "问题", "衔接契约", "修复目标"];
const rows = boundaries.map((item) => [item.index, item.id, item.previousSegment, item.nextSegment, item.transitionType, item.risk, item.status, item.previousEndState, item.nextStartState, item.problem, item.contract, item.repairTarget]);
fs.writeFileSync(path.join(offline, "continuity-boundary-audit.csv"), `${[fields, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`, "utf8");

const tableRows = boundaries.map((item) => `| ${item.index} | ${item.id} | ${item.transitionType} | ${item.risk} | ${item.status} | ${item.risk === "高" ? item.contract : item.problem} |`).join("\n");
const markdown = `# 《潮痕》58 个段间衔接首轮审计

复核日期：${policy.reviewedAt}  
范围：${policy.scope}

## 结论

- 已审计：${summary.reviewed}/${summary.total} 个相邻接点。
- 可按现有切点：${summary.direct} 个。
- 待生成后做相邻链路验证：${summary.verify} 个。
- 阻断继续批量投产：${summary.blocked} 个。
- 当前口径：59 段单段图片与提示词齐备，但全片衔接尚未放行。

“阻断投产”不等于整段图片全部作废。它表示在继续生成相关视频前，必须补共享状态、转场镜或提示词约束。

## 接点总表

| # | 接点 | 类型 | 风险 | 结论 | 主要处理 |
| ---: | --- | --- | --- | --- | --- |
${tableRows}

## 视频阶段的统一验收法

1. 不再只看单条视频。每次至少连播“上一段尾 2 秒 + 下一段首 2 秒”。
2. 检查人物位置、朝向、手中物品、门/盒子/文件筒状态、屏幕运动方向与对白因果。
3. 时空跳转必须有建立镜、环境变化、字幕或声音桥中的至少一种，不强求伪无缝。
4. 高风险接点修复后，将策略文件中的该接点从 blocked 移入 verify；实际连播通过后才移出 verify。
5. E01-01 v01 保留为失败证据，不覆盖；重做版本使用 E01-01-v02.mp4。
`;
fs.writeFileSync(path.join(offline, "CONTINUITY-AUDIT.zh-CN.md"), markdown, "utf8");

const cards = boundaries.map((item) => `<article class="card risk-${item.risk === "高" ? "high" : item.risk === "中" ? "medium" : "low"}" id="boundary-${item.previousSegment}-${item.nextSegment}">
  <header><div><span class="index">${item.index}/58</span><h2>${item.id}</h2><p>${esc(item.transitionType)}</p></div><b>${item.status}</b></header>
  <div class="frames"><figure><img loading="lazy" src="${item.previousLastFrame}" alt="${item.previousSegment} 最后一帧"><figcaption>${item.previousSegment} 终态：${esc(item.previousEndState)}</figcaption></figure><span class="arrow">→</span><figure><img loading="lazy" src="${item.nextFirstFrame}" alt="${item.nextSegment} 第一帧"><figcaption>${item.nextSegment} 起态：${esc(item.nextStartState)}</figcaption></figure></div>
  <dl><dt>风险说明</dt><dd>${esc(item.problem)}</dd><dt>衔接契约</dt><dd>${esc(item.contract)}</dd><dt>修复目标</dt><dd>${esc(item.repairTarget)}</dd></dl>
</article>`).join("");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>《潮痕》58 个段间衔接审计</title><style>:root{--bg:#091016;--panel:#111b24;--line:#2a3c48;--text:#eef5f7;--muted:#9fb0ba;--cyan:#55d9df;--red:#ff6f78;--amber:#f1b65b;--green:#68d391}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 90% 0,#17323a,transparent 34rem),var(--bg);color:var(--text);font:15px/1.6 system-ui,"Microsoft YaHei",sans-serif}main{width:min(1280px,calc(100% - 28px));margin:auto;padding:34px 0 70px}h1{font-size:clamp(30px,5vw,54px);margin:.2rem 0}.lead{max-width:900px;color:var(--muted)}nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}a{color:var(--cyan)}nav a{border:1px solid var(--line);border-radius:8px;padding:8px 11px;text-decoration:none}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0}.kpis div{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}.kpis small{display:block;color:var(--muted)}.kpis b{font-size:28px}.filters{position:sticky;top:0;z-index:3;background:#091016e8;padding:10px 0;backdrop-filter:blur(10px)}button{background:#13212b;color:var(--text);border:1px solid var(--line);padding:8px 11px;border-radius:8px;cursor:pointer}.card{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:16px;margin:14px 0}.card[hidden]{display:none}.card header{display:flex;justify-content:space-between;gap:12px;align-items:start}.card h2{margin:0}.card header p{margin:0;color:var(--muted)}.risk-high{border-color:#803943}.risk-high header>b{color:var(--red)}.risk-medium{border-color:#6d5631}.risk-medium header>b{color:var(--amber)}.risk-low header>b{color:var(--green)}.index{color:var(--muted)}.frames{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin:14px 0}.frames figure{margin:0}.frames img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#05090c;border-radius:9px}.frames figcaption{color:var(--muted);padding-top:6px}.arrow{font-size:30px;color:var(--cyan)}dl{display:grid;grid-template-columns:90px 1fr;gap:6px 12px;margin:0}dt{font-weight:700}dd{margin:0;color:#d4e0e5}@media(max-width:780px){.kpis{grid-template-columns:1fr 1fr}.frames{grid-template-columns:1fr}.arrow{text-align:center;transform:rotate(90deg)}dl{grid-template-columns:1fr}}</style></head><body><main><header><span class="index">全片连续性质量门</span><h1>《潮痕》58 个段间衔接审计</h1><p class="lead">单段图片齐全不等于整片连贯。本页把每个上一段尾帧和下一段首帧并排展示，并给出物理状态、剧情因果和剪辑转场契约。</p><nav><a href="../index.html">返回主入口</a><a href="video-production-control.html">视频控制台</a><a href="CONTINUITY-AUDIT.zh-CN.md">中文审计说明</a><a href="continuity-boundary-audit.csv">下载 CSV</a></nav></header><section class="kpis"><div><small>已审接点</small><b>${summary.reviewed}/58</b></div><div><small>可按现有切点</small><b>${summary.direct}</b></div><div><small>待链路验证</small><b>${summary.verify}</b></div><div><small>阻断投产</small><b>${summary.blocked}</b></div></section><div class="filters"><button data-risk="all">全部</button> <button data-risk="high">只看阻断</button> <button data-risk="medium">只看待验证</button> <button data-risk="low">只看可直连</button></div><section>${cards}</section></main><script>document.querySelectorAll('[data-risk]').forEach(button=>button.addEventListener('click',()=>{const risk=button.dataset.risk;document.querySelectorAll('.card').forEach(card=>{card.hidden=risk!=='all'&&!card.classList.contains('risk-'+risk)})}))</script></body></html>`;
fs.writeFileSync(path.join(offline, "continuity-audit.html"), html, "utf8");

console.log(`✓ 段间衔接审计：${summary.reviewed}/58；可直连 ${summary.direct}，待验证 ${summary.verify}，阻断 ${summary.blocked}`);
