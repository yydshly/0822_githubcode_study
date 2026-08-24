#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const qcPath = path.join(root, "frame-qc-overrides.json");
const provenancePath = path.join(root, "frame-generation-provenance.json");
const generatedAt = "2026-08-24";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E05-04-05-IMAGE-QC-APPROVAL.zh-CN.md";

const breakwater = "art/images/沉船点外侧防波堤-sheet.png";
const lab = "art/images/许知遥临时声音修复室-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const radio = "art/images/橙色应急电台-sheet.png";
const manifest = "art/images/真正的载货联单-sheet.png";
const canister = "art/images/锈蚀金属文件筒-sheet.png";

const selected = [
  {
    segment: "E05-04", frame: 1, candidate: "f1-v2.png",
    references: [
      "storyboard-full-pack/E05-04/actual-generation/candidates-2026-08-24/f1-v1.png",
      canister,
      "storyboard-full-pack/E05-03/f2.png",
      breakwater,
      cheng,
    ],
    qc: "通过：程野闭口听画外音；唯一筒盖已完全旋下并在筒口近旁，唯一湿联单仅部分滑出且仍留在同一文件筒内",
  },
  {
    segment: "E05-04", frame: 2, candidate: "f2-v1.png",
    references: [
      breakwater,
      cheng,
      "storyboard-full-pack/E05-03/f1.png",
      "storyboard-full-pack/E05-03/f2.png",
      "storyboard-full-pack/E05-04/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：仅程野自然开口并举同一只独立筒盖；单灯、双凸耳、半月潮记和手部成立，无第二只盖或纸张",
  },
  {
    segment: "E05-04", frame: 3, candidate: "f3-v1.png",
    references: [
      breakwater,
      cheng,
      manifest,
      "storyboard-full-pack/E05-03/f1.png",
      "storyboard-full-pack/E05-04/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：同一文件筒已重新旋紧，联单完整收回且画面无外露纸张；上坡跑动、安全绳与岸坡方向清楚",
  },
  {
    segment: "E05-05", frame: 1, candidate: "f1-v1.png",
    references: [
      lab,
      xu,
      radio,
      "storyboard-full-pack/E02-03/f1.png",
    ],
    qc: "通过：许知遥闭口按无字实体控制；摔裂电台保持未修复阶段，屏幕只有发动机声带与单一爆音峰，无文字或时间码",
  },
  {
    segment: "E05-05", frame: 2, candidate: "f2-v1.png",
    references: [
      lab,
      xu,
      radio,
      "storyboard-full-pack/E05-05/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：许知遥完全闭口听旧录音；同一摔裂电台与上一镜连续，许潮和高嵩均未被实体化或显示为屏幕头像",
  },
  {
    segment: "E05-05", frame: 3, candidate: "f3-v2.png",
    references: [
      "storyboard-full-pack/E05-05/actual-generation/candidates-2026-08-24/f3-v1.png",
      lab,
      xu,
      cheng,
      manifest,
    ],
    qc: "通过：两人闭口，许知遥双手套、程野裸手；唯一湿联单仍大部卷曲且刚开始展开，无透明袋、手机或责任书",
  },
];

const segmentNotes = {
  "E05-04": "文件筒由完全开盖、发现同一盖上的潮记推进到重新封好并抱筒上岸；联单始终只有一卷且阶段连续。",
  "E05-05": "摔裂电台播放旧录音与湿联单初步展开衔接成立；画外录音不生成实体人物，透明保护袋未提前出现。",
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`not a PNG: ${file}`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function absolute(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

for (const item of selected) {
  const candidate = path.join(pack, item.segment, candidateFolder, item.candidate);
  const canonical = path.join(pack, item.segment, `f${item.frame}.png`);
  const promptRecord = path.join(pack, item.segment, "actual-generation", `initial-generation-candidates-${generatedAt}.md`);
  const framePrompt = path.join(pack, item.segment, "frame-prompts", `f${item.frame}.md`);
  const required = [candidate, promptRecord, framePrompt, absolute(approvalFile), ...item.references.map(absolute)];
  for (const file of required) if (!fs.existsSync(file)) throw new Error(`missing required generation artifact: ${file}`);
  if (new Set(item.references).size !== item.references.length) throw new Error(`duplicate ordered reference: ${item.segment}/f${item.frame}`);
  if (item.references.length > 5) throw new Error(`too many actual references: ${item.segment}/f${item.frame}`);
  const [width, height] = pngSize(candidate);
  if (width !== 1672 || height !== 941) throw new Error(`unexpected candidate dimensions ${width}x${height}: ${candidate}`);
  if (fs.existsSync(canonical) && sha256(canonical) !== sha256(candidate)) {
    throw new Error(`refusing to overwrite different canonical frame: ${item.segment}/f${item.frame}`);
  }
}

for (const item of selected) {
  const candidate = path.join(pack, item.segment, candidateFolder, item.candidate);
  const canonical = path.join(pack, item.segment, `f${item.frame}.png`);
  if (!fs.existsSync(canonical)) fs.copyFileSync(candidate, canonical);
  if (sha256(canonical) !== sha256(candidate)) throw new Error(`canonical promotion verification failed: ${item.segment}/f${item.frame}`);
}

const bySegment = new Map();
for (const item of selected) {
  if (!bySegment.has(item.segment)) bySegment.set(item.segment, []);
  bySegment.get(item.segment).push(item);
}

const qc = JSON.parse(fs.readFileSync(qcPath, "utf8"));
qc.reviewedAt = generatedAt;
qc.reviewScope = "E01-E04 及 E05-01～E05-05 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
const promotedIds = new Set(bySegment.keys());
qc.segments = qc.segments.filter((segment) => !promotedIds.has(segment.id));
for (const [segment, frames] of bySegment) {
  const ordered = [...frames].sort((a, b) => a.frame - b.frame);
  qc.segments.push({
    id: segment,
    referenceBinding: `${generatedAt} 多参考图条件生成：真实参考顺序、完整实际提示词、候选版本、返工边界和残余视频风险均记录于 actual-generation 文件；每镜参考图不超过 5 张。`,
    default: {
      consistency: `通过：${segmentNotes[segment]}`,
      action: `保留正式 f1-f${ordered.at(-1).frame}；视频阶段严格按 UPLOAD-ORDER.md 上传，并执行证物阶段、闭口/画外音和道具不复制约束。`,
    },
    frames: Object.fromEntries(ordered.map((item) => [String(item.frame), {
      consistency: item.qc,
      action: `保留正式 f${item.frame}；图生视频时以本帧和相邻帧共同约束动作阶段。`,
    }])),
  });
}
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map((item) => `${item.segment}/${item.frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter(
  (entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`),
);
for (const item of selected) {
  provenance.push({
    segment: item.segment,
    frame: item.frame,
    generatedAt,
    mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成/精确修订",
    references: item.references,
    promptFile: `storyboard-full-pack/${item.segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`,
    candidate: `storyboard-full-pack/${item.segment}/actual-generation/candidates-${generatedAt}/${item.candidate}`,
    output: `storyboard-full-pack/${item.segment}/f${item.frame}.png`,
    qcApproval: approvalFile,
    qc: item.qc,
  });
}
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E05-04-05 canonical frames promoted: ${selected.length}`);
console.log(`E05-04-05 QC segments updated: ${bySegment.size}`);
console.log(`E05-04-05 provenance entries written: ${selected.length}`);

