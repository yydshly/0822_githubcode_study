#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(root, "storyboard");
const pack = path.join(root, "storyboard-full-pack");
const reports = [
  { file: path.join(reportDir, "storyboard-report.html"), kind: "upstream" },
  { file: path.join(reportDir, "storyboard-report-zh.html"), kind: "zh" },
];

const generatedRoot = path.join(root, "generated-videos");
const generatedCandidates = fs.existsSync(generatedRoot)
  ? fs.readdirSync(generatedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^E\d{2}-\d{2}$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const files = fs.readdirSync(path.join(generatedRoot, entry.name))
        .filter((name) => /\.mp4$/i.test(name))
        .sort();
      const latest = files.at(-1);
      const status = entry.name === "E01-01" ? "failed" : "candidate";
      return latest ? [{
        type: "video",
        status,
        title: `${entry.name} · MiniMax H3 ${status === "failed" ? "衔接失败样本" : "真实成片候选"}`,
        note: status === "failed"
          ? `${latest}；奔向门准备开门，无法连接下一段回长椅开箱。保留作失败证据，重做使用 v02。`
          : `${latest}；已归档，仍须与上一段和下一段连播 QC 后才能正式采用。`,
        src: `../generated-videos/${entry.name}/${latest}`,
      }] : [];
    })
  : [];

const media = [
  { type: "video", title: "第 1 集 · 无声动态分镜", note: "35 张关键帧按分镜切点组成，104.5 秒", src: "../animatic/tide-marks-episode-01-silent-animatic.mp4" },
  ...generatedCandidates,
  { type: "video", title: "E02-01 · MiniMax H3 真实成片", note: "13.67 秒、含声音，真实模型验证样本", src: "../storyboard-ep2-pack/E02-01/e02-01-generated-chatart-h3-768p.mp4" },
  { type: "video", title: "E02-01 · 静态切点预演", note: "用于对比真实 H3 成片与原始关键帧节奏", src: "../storyboard-ep2-pack/E02-01/e02-01-static-preflight.mp4" },
  { type: "video", title: "E02-02 · 静态切点预演", note: "3 张图，9.5 秒", src: "../storyboard-ep2-pack/E02-02/e02-02-static-preflight.mp4" },
  { type: "video", title: "E02-03 · 静态切点预演", note: "4 张图，13 秒", src: "../storyboard-ep2-pack/E02-03/e02-03-static-preflight.mp4" },
  { type: "image", title: "第 1 集 · 动态分镜 QC 总览", note: "定时、画幅和关键镜头检查图", src: "../animatic/tide-marks-episode-01-qc.png" },
];

const existingMedia = media.filter((item) => fs.existsSync(path.resolve(reportDir, item.src)));
const generatedIds = generatedCandidates.map((item) => item.title.split(" · ")[0]);
const generatedSummary = generatedIds.length ? generatedIds.join("、") : "尚无正式候选";
const cards = existingMedia.map((item) => `<article class="demo-card"><h3>${item.title}</h3><p>${item.note}</p>${item.type === "video" ? `<video controls preload="metadata" src="${item.src}"></video>` : `<img src="${item.src}" alt="${item.title}">`}</article>`).join("");
const demoBlock = `<!-- demo-media:start --><section class="demo-summary" id="demo-media"><header><div><span class="demo-kicker">现有成果</span><h2>图片与视频总结演示</h2></div><p>素材文件没有删除；这里重新汇总已经完成的关键帧、静态预演和真实 H3 样本。</p></header><div class="demo-grid">${cards}</div></section><!-- demo-media:end -->`;
const css = `<!-- demo-media-css:start --><style>
.demo-summary{margin:24px 0;padding:22px;border:1px solid #31404c;border-radius:16px;background:linear-gradient(135deg,#101b24,#201916);color:#e8edf2}.demo-summary>header{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:16px}.demo-summary h2{margin:2px 0;font-size:24px}.demo-summary header p{max-width:620px;margin:0;color:#aeb9c3}.demo-kicker{color:#58d7df;font-size:12px;letter-spacing:.14em}.demo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.demo-card{padding:14px;border:1px solid #33404a;border-radius:12px;background:#0d1319}.demo-card h3{margin:0 0 3px;font-size:16px}.demo-card p{margin:0 0 10px;color:#9eabb6}.demo-card video,.demo-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#050709;border-radius:8px}.actual-frame{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:7px;margin-bottom:8px}.frame-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:12px 0}.frame-gallery figure{margin:0;padding:8px;background:#0c1217;border:1px solid #2e3943;border-radius:9px}.frame-gallery img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px}.frame-gallery figcaption{padding-top:5px;color:#9eabb6}@media(max-width:760px){.demo-summary>header{display:block}}
@media(max-width:760px){.demo-summary{scroll-margin-top:160px;padding:14px}.demo-summary>header{display:block}.demo-grid{grid-template-columns:minmax(0,1fr)}.demo-card{min-width:0}}
</style><!-- demo-media-css:end -->`;

const standalone = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>《潮痕》现有图片与视频演示</title><style>:root{color-scheme:dark;--bg:#091016;--panel:#111b24;--line:#2b3b47;--text:#eef4f7;--muted:#9dafbb;--cyan:#55d9df}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 90% 0,#17343c,transparent 30rem),var(--bg);color:var(--text);font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{width:min(1300px,calc(100% - 32px));margin:0 auto 70px}header{padding:42px 0 18px}h1{margin:5px 0;font-size:clamp(30px,5vw,52px)}header p{max-width:850px;color:var(--muted)}nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}nav a{padding:8px 11px;border:1px solid var(--line);border-radius:8px;color:var(--cyan);text-decoration:none}.notice{padding:14px 16px;border:1px solid #65482e;border-radius:10px;background:#1c1713;color:#dfc4ae}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.card{padding:16px;border:1px solid var(--line);border-radius:13px;background:var(--panel)}.card.real{border-color:#39736a}.card.failed{border-color:#873c46}.card h2{margin:0 0 3px;font-size:19px}.card p{margin:0 0 12px;color:var(--muted)}video,img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#040709;border-radius:9px}.badge{color:var(--cyan);font-size:12px;font-weight:800}.real .badge{color:#6be2a0}.failed .badge{color:#ff7f87}@media(max-width:760px){.grid{grid-template-columns:1fr}header{padding-top:24px}}</style></head><body><main><header><span class="badge">独立演示入口 · 文件仍然存在</span><h1>《潮痕》现有图片与视频演示</h1><p>这里把静态关键帧预演与真实 H3 视频分开列出。已登记 ${generatedSummary}，其中 E01-01 v01 已判定为衔接失败样本；E01-02 仍是候选，不等于正式采用。</p><nav><a href="../index.html">返回制作主入口</a><a href="continuity-audit.html">58 个段间衔接审计</a><a href="video-production-control.html">视频生产控制台</a><a href="../storyboard/storyboard-report-zh.html">完整中文分镜报告</a></nav><div class="notice"><b>修复状态：</b>段间阻断已降为 0；E01-01 的开门初态关键帧与提示词已经修复。以后有视频工具时先生成 E01-01-v02，并与 E01-02 首尾连播；不要覆盖 v01。</div></header><section class="grid">${existingMedia.map((item) => `<article class="card ${item.status === "failed" ? "failed" : item.title.includes("真实成片") ? "real" : ""}"><span class="badge">${item.status === "failed" ? "真实 H3 · 衔接不合格" : item.status === "candidate" ? "真实 H3 · 待相邻连播 QC" : item.title.includes("真实成片") ? "真实 H3 · 含声音" : item.type === "video" ? "静态预演 · 无声" : "QC 图片"}</span><h2>${item.title}</h2><p>${item.note}</p>${item.type === "video" ? `<video controls preload="metadata" src="${item.src}"></video>` : `<img src="${item.src}" alt="${item.title}">`}</article>`).join("")}</section></main></body></html>`;
fs.mkdirSync(path.join(root, "offline-production"), { recursive: true });
fs.writeFileSync(path.join(root, "offline-production", "media-demo.html"), standalone, "utf8");

function frameFiles(segmentId) {
  const dir = path.join(pack, segmentId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /^f\d+\.png$/i.test(name)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

function injectUpstream(html) {
  for (const entry of fs.readdirSync(pack, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^E\d{2}-\d{2}$/.test(entry.name)) continue;
    const marker = `<article class="segcard" id="seg-${entry.name}">`;
    const start = html.indexOf(marker);
    if (start < 0) continue;
    const end = html.indexOf("</article>", start);
    if (end < 0) continue;
    let article = html.slice(start, end + 10);
    const files = frameFiles(entry.name);
    for (const file of files) {
      const frameNo = Number(file.match(/\d+/)[0]);
      const src = `../storyboard-full-pack/${entry.name}/${file}`;
      if (article.includes(`src="${src}"`)) continue;
      const statusText = `· #${frameNo} 未生成`;
      const statusIndex = article.indexOf(statusText);
      if (statusIndex < 0) continue;
      const opening = '<div class="frame ph fcell">';
      const index = article.lastIndexOf(opening, statusIndex);
      if (index < 0) break;
      const replacement = `<div class="frame fcell"><img class="actual-frame" src="${src}" alt="${entry.name} f${frameNo}">`;
      article = article.slice(0, index) + replacement + article.slice(index + opening.length);
      const missing = article.indexOf(statusText, index);
      if (missing >= 0) article = article.slice(0, missing) + `· #${frameNo} 已挂载` + article.slice(missing + statusText.length);
    }
    html = html.slice(0, start) + article + html.slice(end + 10);
  }
  return html;
}

function injectChinese(html) {
  html = html.replace(/<!-- frame-gallery:start -->[\s\S]*?<!-- frame-gallery:end -->/g, "");
  html = html.replace(/<div class="frame-gallery">[\s\S]*?<\/div>/g, "");
  for (const entry of fs.readdirSync(pack, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^E\d{2}-\d{2}$/.test(entry.name)) continue;
    const files = frameFiles(entry.name);
    if (!files.length) continue;
    const marker = `<article class="segment" id="${entry.name}">`;
    const start = html.indexOf(marker);
    if (start < 0) continue;
    const summary = html.indexOf('<p class="summary">', start);
    if (summary < 0) continue;
    const gallery = `<!-- frame-gallery:start --><div class="frame-gallery">${files.map((file) => `<figure><img src="../storyboard-full-pack/${entry.name}/${file}" alt="${entry.name} ${file}"><figcaption>${entry.name} · ${file}</figcaption></figure>`).join("")}</div><!-- frame-gallery:end -->`;
    html = html.slice(0, summary) + gallery + html.slice(summary);
  }
  return html;
}

for (const report of reports) {
  if (!fs.existsSync(report.file)) {
    console.log(`- skipped missing report: ${report.file}`);
    continue;
  }
  let html = fs.readFileSync(report.file, "utf8");
  html = html.replace(/<!-- demo-media:start -->[\s\S]*?<!-- demo-media:end -->/g, "");
  html = html.replace(/<!-- demo-media-css:start -->[\s\S]*?<!-- demo-media-css:end -->/g, "");
  html = html.replace("</head>", `${css}</head>`);
  if (report.kind === "upstream") {
    html = injectUpstream(html);
    html = html.replace('<div class="l">生成段</div>', '<div class="l">分镜段</div>').replaceAll("质量门", "结构质量门");
    html = html.replace('<div class="kpis">', `${demoBlock}<div class="kpis">`);
  } else {
    html = injectChinese(html);
    html = html.replace('<section class="hero">', `${demoBlock}<section class="hero">`);
  }
  fs.writeFileSync(report.file, html, "utf8");
  console.log(`✓ restored media: ${report.file}`);
}

console.log(`✓ summary media: ${existingMedia.length}/${media.length}`);
console.log(`✓ standalone media demo: ${path.join(root, "offline-production", "media-demo.html")}`);
console.log(`✓ mounted frames: ${fs.readdirSync(pack, { withFileTypes: true }).filter((e) => e.isDirectory()).reduce((total, e) => total + frameFiles(e.name).length, 0)}`);
