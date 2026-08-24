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
const approvalFile = "offline-production/E05-06-07-IMAGE-QC-APPROVAL.zh-CN.md";

const lab = "art/images/许知遥临时声音修复室-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const radio = "art/images/橙色应急电台-sheet.png";
const manifest = "art/images/真正的载货联单-sheet.png";

const selected = [
  {
    segment: "E05-06", frame: 1, candidate: "f1-v1.png",
    references: [
      "storyboard-full-pack/E05-06/actual-generation/candidates-2026-08-24/rejected/f1-row-fix1.png",
    ],
    qc: "通过：许知遥戴手套并独自开口；唯一联单已展开但未完全压平，恰有六行模糊结构，无透明袋、可读文字或重复纸张",
  },
  {
    segment: "E05-06", frame: 2, candidate: "f2-v1.png",
    references: [
      lab,
      cheng,
      manifest,
      "storyboard-full-pack/E05-06/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：只有程野开口；同一联单右下角暗紫私章保留缺角和向左晕尾，未误变为红章，无额外证物",
  },
  {
    segment: "E05-06", frame: 3, candidate: "f3-v1.png",
    references: [
      lab,
      xu,
      radio,
      "storyboard-full-pack/E05-06/actual-generation/candidates-2026-08-24/f1-v1.png",
      "storyboard-full-pack/E05-05/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：许知遥闭口并单指完成无字实体控制；电台损伤连续，屏幕仅抽象波形，无数字、时间码或录音人物实体",
  },
  {
    segment: "E05-06", frame: 4, candidate: "f4-v1.png",
    references: [
      "storyboard-full-pack/E05-06/actual-generation/candidates-2026-08-24/f3-v1.png",
      cheng,
    ],
    qc: "通过：恰好许知遥、程野两位现时成人且均闭口；唯一摔裂电台状态连续，许潮与孩子只存在于录音中",
  },
  {
    segment: "E05-07", frame: 1, candidate: "f1-v1.png",
    references: [
      "storyboard-full-pack/E05-06/actual-generation/candidates-2026-08-24/f4-v1.png",
    ],
    qc: "通过：人物、站位、灯光、电台损伤与上一段连续；两人闭口，无许潮、孩子、肖像、倒影或回忆重演",
  },
  {
    segment: "E05-07", frame: 2, candidate: "f2-v1.png",
    references: [
      "storyboard-full-pack/E05-07/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：只有许知遥小幅开口说“哥”，程野闭口；过载尖峰保持抽象、无可读界面，录音人物未出现",
  },
  {
    segment: "E05-07", frame: 3, candidate: "f3-v1.png",
    references: [lab, xu],
    qc: "通过：唯一耳机已摘下并落在台面，许知遥闭口、双手自然撑台；无多余手、悬浮耳机或回忆重演",
  },
  {
    segment: "E05-07", frame: 4, candidate: "f4-v1.png",
    references: [
      "storyboard-full-pack/E05-07/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：两位现时成人闭口凝听；摔裂橙色电台唯一、损伤连续，波形抽象，所有录音人物均未实体化",
  },
];

const segmentNotes = {
  "E05-06": "同一张联单从六行总结构推进到缺角暗紫私章，透明保护袋尚未出现；电台录音段只显示现时人物。",
  "E05-07": "许潮救人和最后解释始终只在音轨；耳机摘下终态、双人闭口和同一摔裂电台保持连续。",
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
qc.reviewScope = "E01-E04 及 E05-01～E05-07 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
const promotedIds = new Set(bySegment.keys());
qc.segments = qc.segments.filter((segment) => !promotedIds.has(segment.id));
for (const [segment, frames] of bySegment) {
  const ordered = [...frames].sort((a, b) => a.frame - b.frame);
  qc.segments.push({
    id: segment,
    referenceBinding: `${generatedAt} 多参考图条件生成及连续帧定向生成：真实参考顺序、修正链、网络失败、候选版本和残余视频风险均记录于 actual-generation 文件；每次成功调用参考图不超过 5 张。`,
    default: {
      consistency: `通过：${segmentNotes[segment]}`,
      action: `保留正式 f1-f${ordered.at(-1).frame}；视频阶段严格按 UPLOAD-ORDER.md 上传，并执行闭口/画外录音、证物唯一性和动作终态约束。`,
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
    mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成/定向修订",
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

console.log(`E05-06-07 canonical frames promoted: ${selected.length}`);
console.log(`E05-06-07 QC segments updated: ${bySegment.size}`);
console.log(`E05-06-07 provenance entries written: ${selected.length}`);

