#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const offline = path.join(root, "offline-production");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const trackerPath = path.join(offline, "video-production-tracker.csv");
const continuityPath = path.join(offline, "continuity-boundary-audit.json");
if (!fs.existsSync(continuityPath)) throw new Error("缺少段间衔接审计；请先运行 build-continuity-audit.mjs");
const continuityAudit = JSON.parse(fs.readFileSync(continuityPath, "utf8"));
const storyLogicPath = path.join(offline, "story-logic-audit.json");
if (!fs.existsSync(storyLogicPath)) throw new Error("缺少故事逻辑审计；请先运行 build-story-logic-audit.mjs");
const storyLogicAudit = JSON.parse(fs.readFileSync(storyLogicPath, "utf8"));
const incomingBoundaryBySegment = new Map(continuityAudit.boundaries.map((item) => [item.nextSegment, item]));
const outgoingBoundaryBySegment = new Map(continuityAudit.boundaries.map((item) => [item.previousSegment, item]));

const trackerFields = [
  "生产批次", "建议优先级", "集", "段", "场景", "设计秒", "H3整数秒", "预计钻石", "上传顺序",
  "段间衔接", "生成状态", "视频QC", "返工次数", "采用视频", "最后更新", "备注",
];

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csv(rows, fields) {
  return `${[fields, ...rows.map((row) => fields.map((field) => row[field] ?? ""))].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((item) => item.some(Boolean)).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] ?? ""])));
}

const priorTracker = new Map();
if (fs.existsSync(trackerPath)) {
  for (const row of parseCsv(fs.readFileSync(trackerPath, "utf8"))) priorTracker.set(row["段"], row);
}

const pilotSegments = new Set(["E01-01", "E05-10", "E06-10"]);
const realH3Relative = "storyboard-ep2-pack/E02-01/e02-01-generated-chatart-h3-768p.mp4";
const realH3Path = path.join(root, ...realH3Relative.split("/"));
const hasRealH3 = fs.existsSync(realH3Path);
const segments = [];
const shots = [];
const overlays = [];
let seriesCursor = 0;
let shotIndex = 0;

for (const episode of storyboard.episodes) {
  let episodeCursor = 0;
  for (const segment of episode.segments) {
    const importPath = path.join(pack, segment.id, "import.json");
    if (!fs.existsSync(importPath)) throw new Error(`missing import.json: ${segment.id}`);
    const item = JSON.parse(fs.readFileSync(importPath, "utf8"));
    if (!item.ready || item.uploadOrder.some((frame) => !frame.exists)) throw new Error(`segment is not image-ready: ${segment.id}`);
    if (item.uploadOrder.length !== segment.cuts.length) throw new Error(`upload/cut mismatch: ${segment.id}`);
    const uploadSequence = item.uploadOrder.map((frame) => `${frame.token}=${frame.file}`).join(" → ");
    const previous = priorTracker.get(segment.id) || {};
    const isDemo = segment.id === "E02-01" && hasRealH3;
    const priority = isDemo ? "0-已有演示" : pilotSegments.has(segment.id) ? "1-试产校准" : "2-按集正片";
    const defaultVideo = isDemo ? realH3Relative : "";
    const adjacentBoundaries = [incomingBoundaryBySegment.get(segment.id), outgoingBoundaryBySegment.get(segment.id)].filter(Boolean);
    const continuityState = adjacentBoundaries.some((item) => item.risk === "高")
      ? "阻断"
      : adjacentBoundaries.some((item) => item.risk === "中") ? "待验证" : "可直连";
    segments.push({
      "生产批次": `第${episode.ep}集`,
      "建议优先级": priority,
      "集": episode.ep,
      "段": segment.id,
      "场景": item.scene?.name || segment.sceneZh || "",
      "设计秒": item.designSeconds,
      "H3整数秒": item.chatartSeconds,
      "预计钻石": item.estimatedDiamonds,
      "上传顺序": uploadSequence,
      "段间衔接": continuityState,
      "生成状态": previous["生成状态"] || (isDemo ? "已有H3演示" : "待生成"),
      "视频QC": previous["视频QC"] || (isDemo ? "待按正式标准复核" : "未开始"),
      "返工次数": previous["返工次数"] || "0",
      "采用视频": previous["采用视频"] || defaultVideo,
      "最后更新": previous["最后更新"] || (isDemo ? "2026-08-24" : ""),
      "备注": previous["备注"] || (isDemo ? "历史 ChatArt H3 演示，不自动视为正式采用版本" : ""),
    });

    for (let cutIndex = 0; cutIndex < segment.cuts.length; cutIndex += 1) {
      const cut = segment.cuts[cutIndex];
      const localStart = Number(cut.startSeconds ?? segment.cutStarts?.[cutIndex] ?? 0);
      const duration = Number(cut.seconds);
      const frame = item.uploadOrder[cutIndex];
      const nextFrame = item.uploadOrder[cutIndex + 1];
      shotIndex += 1;
      shots.push({
        "全片镜号": shotIndex,
        "集": episode.ep,
        "段": segment.id,
        "镜": cutIndex + 1,
        "全片开始秒": Number((seriesCursor + localStart).toFixed(3)),
        "集内开始秒": Number((episodeCursor + localStart).toFixed(3)),
        "段内开始秒": localStart,
        "集内结束秒": Number((episodeCursor + localStart + duration).toFixed(3)),
        "设计时长": duration,
        "H3兜底生成秒": Math.ceil(duration),
        "景别": cut.sizeZh || cut.size || "",
        "运镜": cut.cameraZh || cut.camera || "",
        "人物": cut.charactersZh || (cut.characters || []).join("、"),
        "道具": cut.propsZh || (cut.props || []).join("、"),
        "中文内容": cut.descriptionZh || frame.chineseDescription || "",
        "首帧": frame.absolutePath,
        "可选尾帧": nextFrame?.absolutePath || "",
        "目标视频文件": `generated-videos/${segment.id}/${segment.id}-f${cutIndex + 1}-v01.mp4`,
        "字幕/对白": `参见 offline-production/dialogue-cues.csv：${segment.id}/镜${cutIndex + 1}`,
        "声音": `参见 offline-production/sound-music-cues.csv：${segment.id}`,
        "后期叠加": cut.postProductionZh || frame.postProductionZh || "无",
        "剪辑备注": nextFrame ? "可用首尾帧约束；按设计时长回切" : "尾镜按设计时长输出；动作完成点允许小幅尾裁",
      });
      const postProduction = cut.postProductionZh || frame.postProductionZh;
      if (postProduction) overlays.push({
        "集": episode.ep,
        "段": segment.id,
        "镜": cutIndex + 1,
        "段内开始秒": localStart,
        "建议出现时长": segment.id === "E06-10" ? "1.0～1.5 秒" : "动作稳定后短暂出现",
        "跟踪对象": segment.id === "E06-10" ? "许知遥手机屏幕四角" : "接收动作附近的独立后期图层",
        "后期内容": postProduction,
        "素材文件": segment.id === "E06-10" ? "offline-production/overlays/E06-10-f2-phone-notification.svg" : "可选；如制作须使用无机构标识虚构回执",
        "状态": segment.id === "E06-10" ? "SVG 已准备，待视频跟踪" : "可选，不是成片必需项",
      });
    }
    episodeCursor += Number(item.designSeconds);
    seriesCursor += Number(item.designSeconds);
  }
}

const expectedCuts = storyboard.episodes.reduce((total, episode) => total + episode.segments.reduce((sum, segment) => sum + segment.cuts.length, 0), 0);
if (segments.length !== 59 || shots.length !== expectedCuts || expectedCuts !== 193) throw new Error(`unexpected production counts: ${segments.length} segments / ${shots.length} shots`);

fs.mkdirSync(path.join(offline, "overlays"), { recursive: true });
fs.writeFileSync(trackerPath, csv(segments, trackerFields), "utf8");

const shotFields = ["全片镜号", "集", "段", "镜", "全片开始秒", "集内开始秒", "集内结束秒", "段内开始秒", "设计时长", "H3兜底生成秒", "景别", "运镜", "人物", "道具", "中文内容", "首帧", "可选尾帧", "目标视频文件", "字幕/对白", "声音", "后期叠加", "剪辑备注"];
fs.writeFileSync(path.join(offline, "MASTER-EDIT-TIMELINE.csv"), csv(shots, shotFields), "utf8");
const overlayFields = ["集", "段", "镜", "段内开始秒", "建议出现时长", "跟踪对象", "后期内容", "素材文件", "状态"];
fs.writeFileSync(path.join(offline, "POST-PRODUCTION-OVERLAYS.csv"), csv(overlays, overlayFields), "utf8");

const episodeSummary = storyboard.episodes.map((episode) => {
  const rows = segments.filter((item) => Number(item["集"]) === episode.ep);
  return {
    episode: episode.ep,
    segments: rows.length,
    shots: episode.segments.reduce((sum, segment) => sum + segment.cuts.length, 0),
    designSeconds: rows.reduce((sum, item) => sum + Number(item["设计秒"]), 0),
    h3Seconds: rows.reduce((sum, item) => sum + Number(item["H3整数秒"]), 0),
    diamonds: rows.reduce((sum, item) => sum + Number(item["预计钻石"]), 0),
  };
});
const totals = {
  episodes: storyboard.episodes.length,
  segments: segments.length,
  shots: shots.length,
  designSeconds: Number(seriesCursor.toFixed(3)),
  h3Seconds: segments.reduce((sum, item) => sum + Number(item["H3整数秒"]), 0),
  diamonds: segments.reduce((sum, item) => sum + Number(item["预计钻石"]), 0),
  overlays: overlays.length,
  existingH3: segments.filter((item) => item["生成状态"] === "已有H3演示").length,
  continuityReviewed: continuityAudit.summary.reviewed,
  continuityDirect: continuityAudit.summary.direct,
  continuityVerify: continuityAudit.summary.verify,
  continuityBlocked: continuityAudit.summary.blocked,
  continuityBlockedSegments: segments.filter((item) => item["段间衔接"] === "阻断").length,
};
const machineData = { generatedAt: new Date().toISOString(), narrativeGate: { passed: false, decision: "停止扩大视频生成", reason: "小说原型、因果推进与小说到短剧的改编连续性未通过前置验收" }, totals, continuity: continuityAudit.summary, episodeSummary, segments, shots, overlays };
fs.writeFileSync(path.join(offline, "video-production-control.json"), `${JSON.stringify(machineData, null, 2)}\n`, "utf8");

const episodeTable = episodeSummary.map((item) => `| 第 ${item.episode} 集 | ${item.segments} | ${item.shots} | ${item.designSeconds.toFixed(1)}s | ${item.h3Seconds}s | ${item.diamonds} 钻 |`).join("\n");
const markdown = `# 《潮痕》全片后期与视频生产控制台

更新：2026-08-24  
状态：**停止扩大视频生成。** ${totals.segments}/${totals.segments} 段、${totals.shots}/${totals.shots} 镜只表示实验资料齐全；小说原型、因果推进与小说到短剧的改编连续性未通过叙事前置质量门。

## 总量

- 正片设计时长：${totals.designSeconds.toFixed(1)} 秒（约 ${(totals.designSeconds / 60).toFixed(1)} 分钟）。
- ChatArt/H3 整数计费时长：${totals.h3Seconds} 秒。
- 按当前 15 钻/秒估算：${totals.diamonds} 钻；不含返工。
- 已有真实 H3 演示：${totals.existingH3}/59，仅用于校准，未自动视为正式采用。
- 段间衔接：${totals.continuityReviewed}/58 已审计；${totals.continuityDirect} 个可按现有切点，${totals.continuityVerify} 个待验证，${totals.continuityBlocked} 个阻断。
- 明确后期叠加点：${totals.overlays} 处；其中 E06-10 手机通知 SVG 已准备。

## 文件入口

1. video-production-tracker.csv：59 段项目级批次台账。构建器重建页面时会保留其中的生成状态、视频 QC、返工次数、采用视频和备注。
2. MASTER-EDIT-TIMELINE.csv：193 镜全片剪辑总表，包含全片/集内/段内时间、首尾帧、目标视频名、对白、声音和后期要求。
3. POST-PRODUCTION-OVERLAYS.csv：后期叠加清单，只保留不能交给生图/H3 的精确文字或回执边界。
4. video-production-control.html：浏览器中文控制页。可以选择已生成视频并按文件名中的段号自动登记，也可以逐段编辑状态、QC、返工次数和备注。
5. video-production-control.json：供以后脚本、剪辑工具或自动化读取的结构化数据。
6. continuity-audit.html：58 个上一段尾帧与下一段首帧的并排审计、风险和修复契约。

## 页面如何随生成结果变化

1. 生成并下载视频时，文件名必须包含段号，例如“E01-01-v01.mp4”；下划线“E01_01”也可识别。
2. 回到控制台点击“选择已生成视频”，可一次选择多个 MP4。页面只读取文件名、大小和修改时间，不上传也不移动文件。
3. 匹配成功的段自动变为“待质检”；点击该行“登记”完成视频 QC。标记“通过”后，该段计入 QC 通过数。
4. 页面进度保存在当前浏览器的 localStorage，不会自动写回 CSV，也不能监控下载目录。每轮工作结束应导出进度 JSON 备份；换浏览器或清理数据后可导入恢复。
5. 如果需要把浏览器进度固化进项目，应以导出的 JSON 为依据更新 video-production-tracker.csv，再运行构建器；这是后续自动化接口，不影响当前手工生产。

## 推荐执行顺序

1. 保留 E01-01、E01-02 和 E02-01 视频，不返工、不扩大生成，作为失败证据。
2. 回到小说原型，评审人物欲望、冲突、选择、人物弧、伏笔和结局。
3. 在重新拆分前建立全剧因果图与人物/道具/空间状态时间线。
4. 先以文字走查或静态预演验证连续行动链，再生成 2～3 个连续视频小样。
5. 只有新小样连播通过，才恢复视频生产控制台的投产用途。

## 分集预算

| 集数 | 段数 | 镜数 | 设计时长 | H3 计费时长 | 预计成本 |
| --- | ---: | ---: | ---: | ---: | ---: |
${episodeTable}

## 两个后期硬边界

- E06-08/f3：虚构无机构标识回执是可选后期层，不出现也不影响故事；即使出现，也不能暗示证据链已完成法律认证。
- E06-10/f2：只在手机屏幕四角跟踪叠加既定虚构受理文案；“受理”不等于立案、判决、有罪、无罪或翻案完成。
`;
fs.writeFileSync(path.join(offline, "VIDEO-PRODUCTION-CONTROL.zh-CN.md"), markdown, "utf8");

const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const segmentRows = segments.map((item) => `
<tr
  data-segment="${item["段"]}"
  data-episode="${item["集"]}"
  data-priority="${esc(item["建议优先级"])}"
  data-continuity="${esc(item["段间衔接"])}"
  data-base-status="${esc(item["生成状态"])}"
  data-base-qc="${esc(item["视频QC"])}"
  data-base-rework="${esc(item["返工次数"])}"
  data-base-video="${esc(item["采用视频"])}"
  data-base-updated="${esc(item["最后更新"])}"
  data-base-notes="${esc(item["备注"])}"
>
  <td><b class="segment-id">${item["段"]}</b><small>${esc(item["场景"])}</small></td>
  <td>${esc(item["建议优先级"])}</td>
  <td>${item["设计秒"]}s / ${item["H3整数秒"]}s<small>${item["预计钻石"]} 钻</small></td>
  <td class="upload-sequence">${esc(item["上传顺序"])}</td>
  <td><span class="status-pill" data-tone="${item["段间衔接"] === "阻断" ? "fail" : item["段间衔接"] === "待验证" ? "warn" : "pass"}">${esc(item["段间衔接"])}</span></td>
  <td><span class="status-pill" data-field="status">${esc(item["生成状态"])}</span></td>
  <td><span class="status-pill" data-field="qc">${esc(item["视频QC"])}</span></td>
  <td class="file-name"><span data-field="video">${esc(item["采用视频"] || "尚未登记")}</span><small data-field="updated">${item["最后更新"] ? `更新：${esc(item["最后更新"])}` : ""}</small></td>
  <td><div class="row-actions"><a href="../storyboard-full-pack/${item["段"]}/UPLOAD-ORDER.md">上传顺序</a><a href="../storyboard-full-pack/${item["段"]}/chatart-prompt.txt">提示词</a><button type="button" data-edit="${item["段"]}">登记</button></div></td>
</tr>`).join("");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>《潮痕》全片视频生产控制台</title>
  <link rel="stylesheet" href="video-production-control.css">
</head>
<body>
<main>
  <header>
    <span class="tag">叙事前置质量门失败 · 停止扩大视频生成</span>
    <h1>《潮痕》全片视频生产控制台</h1>
    <p><strong>当前页面只作为失败实验资料台账，不再指导继续生成。</strong> ${totals.segments} 段、${totals.shots} 镜和 ${totals.designSeconds.toFixed(1)} 秒只表示资料被生成；小说原型、因果推进与改编连续性尚未通过前置验收。</p>
  </header>

  <section class="kpis" aria-label="项目准备与视频进度">
    <div><small>单段素材齐备</small><b>${totals.segments}/${totals.segments}</b></div>
    <div><small>逐镜图片已备</small><b>${totals.shots}/${totals.shots}</b></div>
    <div><small>衔接已审计</small><b>${totals.continuityReviewed}/58</b></div>
    <div><small>衔接阻断</small><b>${totals.continuityBlocked}</b></div>
    <div class="dynamic"><small>已登记视频</small><b id="generated-count">0/${totals.segments}</b></div>
    <div class="dynamic"><small>视频 QC 通过</small><b id="qc-count">0/${totals.segments}</b></div>
    <div class="dynamic"><small>需要返工</small><b id="rework-count">0</b></div>
    <div class="dynamic"><small>建议下一段</small><button id="next-segment" class="subtle" type="button">E01-01</button></div>
  </section>

  <section class="workflow" aria-labelledby="workflow-title">
    <div class="workflow-head">
      <div><span class="tag">生成后如何驱动页面</span><h2 id="workflow-title">文件名就是自动匹配钥匙</h2></div>
      <p>本页不会监控你的下载目录。生成后把文件命名为 <strong>E01-01-v01.mp4</strong>，再选择它；页面按段号登记并更新进度。</p>
    </div>
    <div class="steps">
      <div class="step"><strong>1 · 先看段间衔接</strong><small>阻断段先补共享状态、转场镜或提示词约束，不能直接继续批量生成。</small></div>
      <div class="step"><strong>2 · 按顺序生成并规范命名</strong><small>按 @Image 顺序上传；返工版本使用 v02、v03，禁止覆盖旧版。</small></div>
      <div class="step"><strong>3 · 相邻两段连播 QC</strong><small>至少检查上一段尾 2 秒和下一段首 2 秒，再判断人物、道具、轴线和时空跳转。</small></div>
      <div class="step"><strong>4 · 登记结果并备份</strong><small>段内和接点都通过后才采用；每轮结束导出 JSON。</small></div>
    </div>
    <div class="action-bar">
      <button id="pick-videos" class="primary" type="button">选择已生成视频</button>
      <button id="export-progress" type="button">导出进度备份</button>
      <button id="import-progress" type="button">导入进度备份</button>
      <span class="muted">支持文件名：E01-01-v01.mp4 或 E01_01_v01.mp4</span>
      <input id="video-picker" type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple hidden>
      <input id="progress-picker" type="file" accept="application/json,.json" hidden>
    </div>
  </section>

  <section class="guide" aria-label="相关资料">
    <a href="foundational-capability-architecture.html">好故事到好视频架构</a>
    <a href="capability-evaluation.html">能力归属与最终评估</a>
    <a href="story-logic-audit.html">全剧故事逻辑审计</a>
    <a href="continuity-audit.html">58 个段间衔接审计</a>
    <a href="media-demo.html">现有图片与视频演示</a>
    <a href="VIDEO-PRODUCTION-CONTROL.zh-CN.md">完整中文说明</a>
    <a href="video-production-tracker.csv">项目 CSV 台账</a>
    <a href="MASTER-EDIT-TIMELINE.csv">193 镜剪辑表</a>
    <a href="POST-PRODUCTION-OVERLAYS.csv">后期叠加表</a>
    <a href="../index.html">返回主入口</a>
  </section>
  <p class="progress-note"><strong>停止条件已经触发：</strong>两个连续视频暴露人物目标、位置和动作因果回退。后补的故事逻辑与衔接审计不能替代投产前的小说和改编验收；在重做上游以前，不继续提交 H3。</p>

  <section class="filters" aria-label="筛选视频段">
    <input id="q" type="search" placeholder="搜索段号、场景、上传顺序或视频名" aria-label="搜索">
    <select id="ep" aria-label="按集数筛选"><option value="all">全部集数</option>${storyboard.episodes.map((episode) => `<option value="${episode.ep}">第 ${episode.ep} 集</option>`).join("")}</select>
    <select id="priority" aria-label="按优先级筛选"><option value="all">全部优先级</option><option>0-已有演示</option><option>1-试产校准</option><option>2-按集正片</option></select>
    <select id="status-filter" aria-label="按状态筛选"><option value="all">全部状态</option><option>待生成</option><option>生成中</option><option>待质检</option><option>QC通过</option><option>需返工</option><option>已有H3演示</option></select>
    <span id="count" class="count">${totals.segments} 段</span>
  </section>

  <div class="table-wrap">
    <table>
      <thead><tr><th>段 / 场景</th><th>优先级</th><th>设计 / H3</th><th>上传顺序</th><th>段间衔接</th><th>生成状态</th><th>视频 QC</th><th>采用视频</th><th>操作</th></tr></thead>
      <tbody>${segmentRows}</tbody>
    </table>
  </div>
</main>

<dialog id="record-dialog" aria-labelledby="dialog-title">
  <form id="record-form" method="dialog">
    <div class="dialog-head"><h2 id="dialog-title">登记生成结果</h2><button id="dialog-close" type="button" aria-label="关闭">×</button></div>
    <div class="dialog-body dialog-grid">
      <label>生成状态<select name="status"><option>待生成</option><option>生成中</option><option>待质检</option><option>QC通过</option><option>需返工</option><option>已有H3演示</option></select></label>
      <label>视频 QC<select name="qc"><option>未开始</option><option>待检查</option><option>通过</option><option>需返工</option><option>不采用</option><option>待按正式标准复核</option></select></label>
      <label>返工次数<input name="rework" type="number" min="0" step="1" value="0"></label>
      <label>采用视频文件名<input name="video" type="text" placeholder="E01-01-v01.mp4"></label>
      <label class="full">备注<textarea name="notes" placeholder="记录人物漂移、动作问题、声音问题或返工要求"></textarea></label>
    </div>
    <div class="dialog-actions"><button id="dialog-cancel" type="button">取消</button><button class="primary" type="submit">保存更新</button></div>
  </form>
</dialog>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<script src="video-production-control.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(offline, "video-production-control.html"), html, "utf8");

console.log(`✓ 视频生产控制：${totals.segments} 段 / ${totals.shots} 镜 / ${totals.designSeconds.toFixed(1)}s 设计时长`);
console.log(`✓ H3 计费计划：${totals.h3Seconds}s / ${totals.diamonds} 钻（不含返工）`);
console.log(`✓ 后期叠加：${totals.overlays} 处；状态台账已保留可编辑字段`);
