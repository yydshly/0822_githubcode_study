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
const segment = "E06-10";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E06-10-IMAGE-QC-APPROVAL.zh-CN.md";

const pier = "art/images/南堤旧渡口候船厅与栈桥-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const p01 = "art/images/橙色应急电台-sheet.png";
const f1Candidate = "storyboard-full-pack/E06-10/actual-generation/candidates-2026-08-24/f1-v1.png";

const selected = [
  { frame: 1, candidate: "f1-v1.png", references: [pier, xu, p01, "storyboard-full-pack/E06-09/f2.png"], qc: "通过：仅许知遥一人且双手离开；公开透明托架、未修复 P01、救生圈装置与最低两级石阶潮线同框可辨" },
  { frame: 2, candidate: "f2-v1.png", references: [pier, xu, f1Candidate], qc: "通过：仅许知遥闭口；她自己的完整普通手机只显示一张不可读空白卡；无 P06 裂屏/波形、机构 UI 或第二部手机" },
];

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function pngSize(file) { const buffer = fs.readFileSync(file); if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`not a PNG: ${file}`); return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]; }
function absolute(relativePath) { return path.join(root, ...relativePath.split("/")); }

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
qc.reviewScope = "E01-E06 全部关键帧逐张人工复核、参考图条件修复与缺图生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({ id: segment, referenceBinding: `${generatedAt} 多参考图条件生成：真实参考顺序、公开托架/双潮线结尾、P01 损伤、许知遥个人手机与空白通知卡边界均记录于 actual-generation 文件。`, default: { consistency: "通过：公开归档与双潮线结尾完整；个人手机通知只是待后期叠字的程序状态。", action: "保留正式 f1-f2；视频阶段严格执行构图双锚点、P01 损伤、手机归属和受理非司法结论边界。" }, frames: Object.fromEntries(selected.map((item) => [String(item.frame), { consistency: item.qc, action: `保留正式 f${item.frame}；图生视频时以本帧和相邻帧共同约束动作阶段。` }])) });
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map((item) => `${segment}/${item.frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter((entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`));
for (const item of selected) provenance.push({ segment, frame: item.frame, generatedAt, mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成", references: item.references, promptFile: `storyboard-full-pack/${segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`, candidate: `storyboard-full-pack/${segment}/actual-generation/candidates-${generatedAt}/${item.candidate}`, output: `storyboard-full-pack/${segment}/f${item.frame}.png`, qcApproval: approvalFile, qc: item.qc });
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E06-10 canonical frames promoted: ${selected.length}`);
console.log("E06-10 QC segment updated: 1");
console.log(`E06-10 provenance entries written: ${selected.length}`);
