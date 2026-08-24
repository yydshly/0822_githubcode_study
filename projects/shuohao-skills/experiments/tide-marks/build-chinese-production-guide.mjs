#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const script = JSON.parse(fs.readFileSync(path.join(root, "script", "潮痕-script.json"), "utf8"));
const cast = JSON.parse(fs.readFileSync(path.join(root, "characters", "潮痕-cast.json"), "utf8"));
const art = JSON.parse(fs.readFileSync(path.join(root, "art", "潮痕-art.json"), "utf8"));
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const packRoot = path.join(root, "storyboard-full-pack");

const characterById = new Map(cast.characters.map((item) => [item.id, item]));
const sceneById = new Map(art.scenes.map((item) => [item.id, item]));
const propById = new Map(art.props.map((item) => [item.id, item]));
const scriptByEp = new Map(script.episodes.map((item) => [item.ep, item]));
const sizeZh = { "extreme-wide": "大远景", wide: "全景", medium: "中景", close: "特写", "extreme-close": "大特写" };
const cameraZh = {
  "Static Shot": "固定", "Push In": "推镜", "Pull Out": "拉镜", "Zoom In": "变焦推进", "Zoom Out": "变焦拉远",
  "Pan Left": "左摇", "Pan Right": "右摇", "Truck Left": "左移", "Truck Right": "右移", "Tilt Up": "上摇",
  "Tilt Down": "下摇", "Pedestal Up": "升镜", "Pedestal Down": "降镜", "Arc Shot": "环绕", "Tracking Shot": "跟拍",
  "Shake Slightly": "轻微晃动", "Shake Strongly": "强烈晃动", POV: "主观镜头", "Roll Clockwise": "顺时针旋转", "Roll Counterclockwise": "逆时针旋转",
};
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const round = (n) => Number(n.toFixed(2));
const cutStarts = (segment) => {
  let cursor = 0;
  return segment.cuts.map((cut) => { const current = cursor; cursor += cut.seconds; return current; });
};
const duration = (segment) => segment.cuts.reduce((sum, cut) => sum + cut.seconds, 0);
const namesFor = (ids, lookup) => ids?.length ? ids.map((id) => lookup.get(id)?.name || id).join("、") : "无实体人物";

function beatText(item) {
  if (item.action) return `动作：${item.action}`;
  const name = characterById.get(item.speaker)?.name || (item.speaker === "VO" ? "画外信息" : item.speaker);
  return `${name}：“${item.line}”${item.delivery ? `（${item.delivery}）` : ""}`;
}

for (const episode of storyboard.episodes) {
  const scriptEpisode = scriptByEp.get(episode.ep);
  episode.titleZh = `第 ${episode.ep} 集`;
  episode.hookZh = scriptEpisode.hook;
  episode.cliffZh = scriptEpisode.cliff;
  for (const segment of episode.segments) {
    const scriptScene = scriptEpisode.scenes[segment.sceneIndex - 1];
    const scene = sceneById.get(scriptScene.sceneId);
    const starts = cutStarts(segment);
    segment.sceneZh = scene?.name || scriptScene.sceneId;
    segment.lightingZh = scriptScene.lighting;
    segment.durationSeconds = round(duration(segment));
    segment.cutStarts = starts;
    const allDescriptions = [];
    segment.cuts.forEach((cut, index) => {
      const entries = scriptScene.flow.slice(cut.beats[0] - 1, cut.beats[1]);
      const scriptDescriptionZh = entries.map(beatText).join("；");
      if (!cut.semanticDescriptionLocked) cut.descriptionZh = scriptDescriptionZh;
      cut.startSeconds = round(starts[index]);
      cut.sizeZh = sizeZh[cut.size] || cut.size;
      cut.cameraZh = cameraZh[cut.camera] || cut.camera;
      cut.charactersZh = namesFor(cut.characters, characterById);
      cut.propsZh = namesFor(cut.props || [], propById).replace("无实体人物", "无核心道具");
      allDescriptions.push(cut.descriptionZh);
    });
    segment.summaryZh = allDescriptions.join("；");
  }
}

fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");

const manifest = JSON.parse(fs.readFileSync(path.join(packRoot, "manifest.json"), "utf8"));
const manifestById = new Map(manifest.map((item) => [item.segment, item]));
const readySegmentCount = manifest.filter((item) => !item.missing?.length).length;
const indexLines = [
  "# 《潮痕》全剧中文生成索引",
  "",
  "本目录已准备好 6 集、59 段的英文 H3 投产提示词；每段同时提供中文制作说明。英文 `prompt.md` 用于提交模型，中文 `README.zh-CN.md` 用于理解剧情、核对图片顺序和镜头内容。",
  "",
  "当前不批量生成关键帧或视频。需要某段时，先补齐该目录 `missing` 对应的 `f1.png`、`f2.png`……，再按 README 的顺序上传。",
  "",
];

const htmlEpisodes = [];
for (const episode of storyboard.episodes) {
  indexLines.push(`## 第 ${episode.ep} 集`, "", `- 本集钩子：${episode.hookZh}`, `- 结尾悬念：${episode.cliffZh}`, "", "| 段号 | 场景 | 时长 | 镜数 | 中文内容 | 图片状态 | 预计钻石 |", "| --- | --- | ---: | ---: | --- | --- | ---: |");
  const htmlSegments = [];
  for (const segment of episode.segments) {
    const entry = manifestById.get(segment.id);
    const missing = entry?.missing?.length || 0;
    const ready = missing ? `缺 ${missing} 张` : "图片齐全";
    const cost = Math.ceil(segment.durationSeconds) * 15;
    const compact = segment.cuts.map((cut) => cut.descriptionZh).join(" / ");
    indexLines.push(`| [${segment.id}](./${segment.id}/README.zh-CN.md) | ${segment.sceneZh}·${segment.lightingZh} | ${segment.durationSeconds} 秒 | ${segment.cuts.length} | ${compact} | ${ready} | ${cost} |`);

    const readme = [
      `# ${segment.id} · 中文制作说明`, "",
      `- 集数：第 ${episode.ep} 集`,
      `- 场景：${segment.sceneZh}`,
      `- 光照：${segment.lightingZh}`,
      `- 设计时长：${segment.durationSeconds} 秒`,
      `- ChatArt 整数时长建议：${Math.ceil(segment.durationSeconds)} 秒`,
      `- 预计消耗：${cost} 钻石（按 15 钻石/秒估算）`,
      `- 关键帧状态：${ready}`, "",
      "## 这段讲什么", "", segment.summaryZh, "",
      "## 图片与镜头顺序", "",
      "| 图片 | 切点 | 时长 | 景别/运镜 | 人物 | 道具 | 中文画面与台词 |", "| --- | ---: | ---: | --- | --- | --- | --- |",
      ...segment.cuts.map((cut, index) => `| f${index + 1}.png${index === 0 ? "（首帧）" : ""} | ${cut.startSeconds.toFixed(2)}s | ${cut.seconds}s | ${cut.sizeZh} / ${cut.cameraZh} | ${cut.charactersZh} | ${cut.propsZh} | ${cut.descriptionZh} |`),
      "", "## 后期生成步骤", "",
      `1. 补齐并按顺序上传 ${segment.cuts.map((_, index) => `f${index + 1}.png`).join("、")}。`,
      `2. 选择 MiniMax H3、全能模式、768P、16:9、${Math.ceil(segment.durationSeconds)} 秒。`,
      "3. 复制同目录 `prompt.md` 的英文正文；`<Picture 1>` 等标记按 ChatArt 的素材引用方式对应到上传图片。",
      `4. 提交前确认按钮成本约为 ${cost} 钻石；不一致时先停止。`,
      "5. 下载后用段号命名，例如 `E03-01.mp4`，再进入统一拼接。", "",
      "## 中文理解稿", "",
      "英文提示词的核心含义就是上面的逐镜表：模型按各切点参考对应图片，执行动作和原文台词，并保持本场环境声与悬疑配乐。中文稿用于审核，不建议替换官方英文 H3 投产词。", "",
    ].join("\n");
    fs.writeFileSync(path.join(packRoot, segment.id, "README.zh-CN.md"), readme, "utf8");

    const rows = segment.cuts.map((cut, index) => `<tr><td>f${index + 1}${index === 0 ? "（首帧）" : ""}</td><td>${cut.startSeconds.toFixed(2)}s</td><td>${cut.seconds}s</td><td>${esc(cut.sizeZh)} / ${esc(cut.cameraZh)}</td><td>${esc(cut.charactersZh)}</td><td>${esc(cut.propsZh)}</td><td>${esc(cut.descriptionZh)}</td></tr>`).join("");
    htmlSegments.push(`<article class="segment" id="${segment.id}"><header><div><h3>${segment.id}</h3><p>${esc(segment.sceneZh)} · ${esc(segment.lightingZh)}</p></div><div class="badges"><span>${segment.durationSeconds}s</span><span>${segment.cuts.length} 镜</span><span class="${missing ? "warn" : "ready"}">${ready}</span><span>约 ${cost} 钻</span></div></header><p class="summary">${esc(segment.summaryZh)}</p><p class="mobile-scroll-hint">逐镜表可左右滑动查看完整中文内容</p><table><thead><tr><th>图片</th><th>切点</th><th>时长</th><th>景别/运镜</th><th>人物</th><th>道具</th><th>中文内容</th></tr></thead><tbody>${rows}</tbody></table><p class="links"><a href="../storyboard-full-pack/${segment.id}/README.zh-CN.md">中文说明</a><a href="../storyboard-full-pack/${segment.id}/prompt.md">英文 H3 提示词</a></p></article>`);
  }
  indexLines.push("");
  htmlEpisodes.push(`<section id="ep${episode.ep}"><h2>第 ${episode.ep} 集</h2><div class="episode-meta"><p><b>钩子：</b>${esc(episode.hookZh)}</p><p><b>悬念：</b>${esc(episode.cliffZh)}</p></div>${htmlSegments.join("")}</section>`);
}

fs.writeFileSync(path.join(packRoot, "README.zh-CN.md"), `${indexLines.join("\n")}\n`, "utf8");

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>《潮痕》全剧中文制作说明</title><style>
:root{color-scheme:dark;--bg:#0d1117;--panel:#151b23;--line:#2b3440;--text:#e6edf3;--muted:#9ba7b4;--cyan:#56d4dd;--orange:#e58a42}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}nav{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;padding:12px 4vw;background:#0d1117e8;border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}nav strong{margin-right:auto}nav a,.links a{color:var(--cyan);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:5px 10px}main{width:min(1500px,94vw);margin:24px auto 80px}.hero{padding:28px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,#17232b,#201a18)}h1{margin:0 0 8px;font-size:30px}h2{margin-top:54px;border-left:4px solid var(--orange);padding-left:12px}.episode-meta{color:var(--muted)}.segment{margin:18px 0;padding:20px;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:auto}.segment header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.segment h3{margin:0;color:var(--cyan)}.segment header p{margin:2px 0;color:var(--muted)}.badges{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.badges span{border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}.badges .warn{color:#ffbf69}.badges .ready{color:#7ee787}.summary{padding:10px 12px;background:#0f141a;border-radius:8px}table{width:100%;border-collapse:collapse;min-width:980px}th,td{border-bottom:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}th{color:var(--muted)}.links{display:flex;gap:8px;margin-bottom:0}@media(max-width:800px){nav{overflow:auto}.segment header{display:block}.badges{justify-content:flex-start;margin-top:8px}}
</style><style>.mobile-scroll-hint{display:none;color:#ffbf69;font-size:13px}html{scroll-padding-top:88px}.segment,h2{scroll-margin-top:92px}@media(max-width:800px){html{scroll-padding-top:154px}nav{flex-wrap:wrap!important;overflow:visible!important;padding:10px 12px}nav strong{flex:1 0 100%;margin-right:0}nav a{flex:1 1 calc(33.333% - 8px);text-align:center;white-space:nowrap}.segment{scroll-margin-top:158px;padding:14px}.mobile-scroll-hint{display:block}}</style></head><body><nav><strong>《潮痕》中文制作说明</strong>${storyboard.episodes.map((e) => `<a href="#ep${e.ep}">第${e.ep}集</a>`).join("")}</nav><main><section class="hero"><h1>故事与生产文件已准备：${storyboard.episodes.length} 集 · ${manifest.length} 段 · ${storyboard.episodes.flatMap((episode) => episode.segments).reduce((sum, segment) => sum + segment.cuts.length, 0)} 镜</h1><p>这里用中文解释每一段讲什么、需要哪些图片、何时切镜以及人物与道具。当前只有 ${readySegmentCount} 段图片齐全；英文 prompt 只在真正提交 H3 时复制使用。</p></section>${htmlEpisodes.join("")}</main></body></html>`;
fs.writeFileSync(path.join(root, "storyboard", "storyboard-report-zh.html"), html, "utf8");

if (!process.argv.includes("--skip-downstream")) {
  const restore = spawnSync(process.execPath, [path.join(root, "restore-demo-media.mjs")], { encoding: "utf8", windowsHide: true });
  if (restore.status !== 0) throw new Error(restore.stderr || restore.stdout || "failed to restore report media");
  if (restore.stdout.trim()) console.log(restore.stdout.trim());
  const hub = spawnSync(process.execPath, [path.join(root, "build-production-hub.mjs")], { encoding: "utf8", windowsHide: true });
  if (hub.status !== 0) throw new Error(hub.stderr || hub.stdout || "failed to build production hub");
  if (hub.stdout.trim()) console.log(hub.stdout.trim());
}

console.log(`✓ enriched: ${storyboardPath}`);
console.log(`✓ index: ${path.join(packRoot, "README.zh-CN.md")}`);
console.log(`✓ html: ${path.join(root, "storyboard", "storyboard-report-zh.html")}`);
console.log(`✓ segment guides: ${manifest.length}`);
