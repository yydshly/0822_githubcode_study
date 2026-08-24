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
const segment = "E06-04";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E06-04-IMAGE-QC-APPROVAL.zh-CN.md";

const pier = "art/images/南堤旧渡口候船厅与栈桥-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const gao = "characters/images/高嵩-sheet.png";
const p01 = "art/images/橙色应急电台-sheet.png";
const f1Candidate = "storyboard-full-pack/E06-04/actual-generation/candidates-2026-08-24/f1-v1.png";

const selected = [
  { frame: 1, candidate: "f1-v1.png", references: [pier, xu, p01], qc: "通过：只有许知遥开口并推动一个无字推子；唯一 P01 四项损伤锚点完整；无时间码、数字或 UI" },
  { frame: 2, candidate: "f2-v1.png", references: [pier, gao, f1Candidate], qc: "通过：高嵩单人闭口监听；没有少年、船、钥匙、驾驶重演或指控文字，录音仍是待核验陈述" },
  { frame: 3, candidate: "f3-v1.png", references: [pier, gao, f1Candidate], qc: "通过：只有高嵩开口并指向明确的现场音响；少年、其他人物与证物不入画" },
];

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
  const candidate = path.join(pack, segment, candidateFolder, item.candidate);
  const canonical = path.join(pack, segment, `f${item.frame}.png`);
  const promptRecord = path.join(pack, segment, "actual-generation", `initial-generation-candidates-${generatedAt}.md`);
  const framePrompt = path.join(pack, segment, "frame-prompts", `f${item.frame}.md`);
  const required = [candidate, promptRecord, framePrompt, absolute(approvalFile), ...item.references.map(absolute)];
  for (const file of required) if (!fs.existsSync(file)) throw new Error(`missing required generation artifact: ${file}`);
  if (new Set(item.references).size !== item.references.length) throw new Error(`duplicate ordered reference: ${segment}/f${item.frame}`);
  if (item.references.length > 5) throw new Error(`too many actual references: ${segment}/f${item.frame}`);
  const [width, height] = pngSize(candidate);
  if (width !== 1672 || height !== 941) throw new Error(`unexpected candidate dimensions ${width}x${height}: ${candidate}`);
  if (fs.existsSync(canonical) && sha256(canonical) !== sha256(candidate)) throw new Error(`refusing to overwrite different canonical frame: ${segment}/f${item.frame}`);
}

for (const item of selected) {
  const candidate = path.join(pack, segment, candidateFolder, item.candidate);
  const canonical = path.join(pack, segment, `f${item.frame}.png`);
  if (!fs.existsSync(canonical)) fs.copyFileSync(candidate, canonical);
  if (sha256(canonical) !== sha256(candidate)) throw new Error(`canonical promotion verification failed: ${segment}/f${item.frame}`);
}

const qc = JSON.parse(fs.readFileSync(qcPath, "utf8"));
qc.reviewedAt = generatedAt;
qc.reviewScope = "E01-E06 当前已生成关键帧逐张人工复核、参考图条件修复与缺图生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({
  id: segment,
  referenceBinding: `${generatedAt} 多参考图条件生成：真实参考顺序、P01 损伤、无时间 UI、高嵩监听闭口、录音指控不重演与少年不实体化均记录于 actual-generation 文件。`,
  default: {
    consistency: "通过：P01 保持摔裂终态；f2 的录音指控仍为待核验陈述；f2 高嵩闭口、f3 高嵩开口；少年全程不出现。",
    action: "保留正式 f1-f3；视频阶段严格执行 P01 损伤、无 UI、待核验法律边界、口型与少年不实体化约束。",
  },
  frames: Object.fromEntries(selected.map((item) => [String(item.frame), { consistency: item.qc, action: `保留正式 f${item.frame}；图生视频时以本帧和相邻帧共同约束动作阶段。` }])),
});
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map((item) => `${segment}/${item.frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter((entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`));
for (const item of selected) {
  provenance.push({ segment, frame: item.frame, generatedAt, mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成", references: item.references, promptFile: `storyboard-full-pack/${segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`, candidate: `storyboard-full-pack/${segment}/actual-generation/candidates-${generatedAt}/${item.candidate}`, output: `storyboard-full-pack/${segment}/f${item.frame}.png`, qcApproval: approvalFile, qc: item.qc });
}
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E06-04 canonical frames promoted: ${selected.length}`);
console.log("E06-04 QC segment updated: 1");
console.log(`E06-04 provenance entries written: ${selected.length}`);
