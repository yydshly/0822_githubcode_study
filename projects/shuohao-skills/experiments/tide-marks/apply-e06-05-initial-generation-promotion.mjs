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
const segment = "E06-05";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E06-05-IMAGE-QC-APPROVAL.zh-CN.md";

const pier = "art/images/南堤旧渡口候船厅与栈桥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const gao = "characters/images/高嵩-sheet.png";
const p03 = "art/images/真正的载货联单-sheet.png";
const p05 = "art/images/许德海事故责任书-sheet.png";
const f1Candidate = "storyboard-full-pack/E06-05/actual-generation/candidates-2026-08-24/f1-v1.png";

const selected = [
  { frame: 1, candidate: "f1-v1.png", references: [pier, cheng, p03, "storyboard-full-pack/E06-02/f1.png"], qc: "通过：只有程野开口；同一 P03 完全位于封闭袋内，六行结构清楚；摄像机屏幕不可读" },
  { frame: 2, candidate: "f2-v2.png", references: ["storyboard-full-pack/E06-05/actual-generation/candidates-2026-08-24/f2-v1.png", p03], qc: "通过：只有许知遥开口；同一封闭 P03、六行和单枚暗紫缺角章连续，左向晕染为局部短痕；无鉴定结论" },
  { frame: 3, candidate: "f3-v1.png", references: [pier, gao, p05, f1Candidate], qc: "通过：高嵩空手指向独立 P05，不碰封闭 P03；恰好两名匿名背影、每人一部黑屏手机；两份文件清楚分离" },
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
  referenceBinding: `${generatedAt} 多参考图条件生成及定向修订：真实参考顺序、封闭 P03 六行/缺角章、私章待鉴定、独立 P05、两名匿名观众与手机计数均记录于 actual-generation 文件。`,
  default: {
    consistency: "通过：同一 P03 全程封闭；暗紫缺角章仅作外观比对、待鉴定；P05 独立平放且状态未定；高嵩未触碰 P03。",
    action: "保留正式 f1-f3；视频阶段严格执行密封袋、私章待鉴定、P03/P05 分离、两名背影/两部手机、口型与机械怠速约束。",
  },
  frames: Object.fromEntries(selected.map((item) => [String(item.frame), { consistency: item.qc, action: `保留正式 f${item.frame}；图生视频时以本帧和相邻帧共同约束动作阶段。` }])),
});
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map((item) => `${segment}/${item.frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter((entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`));
for (const item of selected) {
  provenance.push({ segment, frame: item.frame, generatedAt, mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成/定向修订", references: item.references, promptFile: `storyboard-full-pack/${segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`, candidate: `storyboard-full-pack/${segment}/actual-generation/candidates-${generatedAt}/${item.candidate}`, output: `storyboard-full-pack/${segment}/f${item.frame}.png`, qcApproval: approvalFile, qc: item.qc });
}
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E06-05 canonical frames promoted: ${selected.length}`);
console.log("E06-05 QC segment updated: 1");
console.log(`E06-05 provenance entries written: ${selected.length}`);
