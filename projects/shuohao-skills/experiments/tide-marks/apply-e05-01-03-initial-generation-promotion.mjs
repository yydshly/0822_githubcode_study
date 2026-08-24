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
const approvalFile = "offline-production/E05-01-03-IMAGE-QC-APPROVAL.zh-CN.md";

const scene = "art/images/沉船点外侧防波堤-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const manifest = "art/images/真正的载货联单-sheet.png";

const selected = [
  {
    segment: "E05-01", frame: 1, candidate: "f1-v2.png",
    references: [scene, cheng, "storyboard-full-pack/E05-01/actual-generation/candidates-2026-08-24/f1-v1.png"],
    qc: "通过：仅程野出镜；固定潜水装备、安全绳、黄铜登山扣与唯一锈环关系正确，闭口且无金属筒",
  },
  {
    segment: "E05-01", frame: 2, candidate: "f2-v2.png",
    references: [scene, cheng, "storyboard-full-pack/E05-01/actual-generation/candidates-2026-08-24/f1-v2.png"],
    qc: "通过：仅程野讲话；面镜仍在额头，检查右耳通信耳机，单灯位置与安全绳连续",
  },
  {
    segment: "E05-01", frame: 3, candidate: "f3-v1.png",
    references: [scene, cheng, "storyboard-full-pack/E05-01/actual-generation/candidates-2026-08-24/f1-v2.png"],
    qc: "通过：程野闭口听许知遥画外音；无字计时器、水线、单灯与同一安全绳成立",
  },
  {
    segment: "E05-02", frame: 1, candidate: "f1-v2.png",
    references: [scene, cheng, "storyboard-full-pack/E05-01/actual-generation/candidates-2026-08-24/f3-v1.png"],
    qc: "通过：仅程野完成告白；面镜尚未拉下，朝右侧黑水准备入水，金属筒未提前出现",
  },
  {
    segment: "E05-02", frame: 2, candidate: "f2-v1.png",
    references: [scene, cheng, "storyboard-full-pack/E05-02/actual-generation/candidates-2026-08-24/f1-v1.png"],
    qc: "通过：面镜密封且单灯不换边；程野由左上湿坡向右下黑水侧滑，同一安全绳连回岸上",
  },
  {
    segment: "E05-02", frame: 3, candidate: "f3-v1.png",
    references: [scene, cheng, "storyboard-full-pack/E05-02/actual-generation/candidates-2026-08-24/f1-v1.png"],
    qc: "通过：程野完全潜入；仅绷紧安全绳、一个水下暗影和一个灯点，无错误口型或第二人",
  },
  {
    segment: "E05-03", frame: 1, candidate: "f1-v2.png",
    references: [scene, cheng, manifest, "storyboard-full-pack/E05-02/actual-generation/candidates-2026-08-24/f2-v1.png"],
    qc: "通过：程野破水喘息并张口说话；恰好一个完全密封金属筒，联单和纸张均未露出",
  },
  {
    segment: "E05-03", frame: 2, candidate: "f2-v1.png",
    references: [scene, cheng, manifest, "storyboard-full-pack/E05-03/actual-generation/candidates-2026-08-24/f1-v1.png"],
    qc: "通过：同一金属筒和右端盖仅松开窄缝；程野闭口，联单未提前出现",
  },
];

const segmentNotes = {
  "E05-01": "扣环、低声请求与闭口听画外警告三镜连续；面镜、单灯、右耳耳机、计时器和安全绳阶段正确。",
  "E05-02": "告白、密封面镜入水与水下失联三镜连续；入水方向、单灯和同一根安全绳稳定，无模型补出的潜水装备。",
  "E05-03": "程野抱密封金属筒破水，再在坡面只松开右端盖约一厘米；同一筒体连续且联单未提前露出。",
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
qc.reviewScope = "E01-E04 及 E05-01～E05-03 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
const promotedIds = new Set(bySegment.keys());
qc.segments = qc.segments.filter((segment) => !promotedIds.has(segment.id));
for (const [segment, frames] of bySegment) {
  const ordered = [...frames].sort((a, b) => a.frame - b.frame);
  qc.segments.push({
    id: segment,
    referenceBinding: `${generatedAt} 多参考图条件初次生成：实际参考顺序、完整生成提示词、候选版本和方向口径均记录于 actual-generation 文件；相邻候选用于锁定装备、空间与证据阶段。`,
    default: {
      consistency: `通过：${segmentNotes[segment]}`,
      action: `保留正式 f1-f${ordered.at(-1).frame}；视频阶段严格按 UPLOAD-ORDER.md 上传，并执行单灯方位、自由潜水和证据显露阶段约束。`,
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
    mode: "Codex 内置图像生成·多参考图条件生成（个别候选做无重采样边缘尺寸规范化）",
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

console.log(`E05-01-03 canonical frames promoted: ${selected.length}`);
console.log(`E05-01-03 QC segments updated: ${bySegment.size}`);
console.log(`E05-01-03 provenance entries written: ${selected.length}`);

