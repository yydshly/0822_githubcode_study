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
const segment = "E06-06";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E06-06-IMAGE-QC-APPROVAL.zh-CN.md";

const pier = "art/images/南堤旧渡口候船厅与栈桥-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const gao = "characters/images/高嵩-sheet.png";
const p05 = "art/images/许德海事故责任书-sheet.png";
const f1Candidate = "storyboard-full-pack/E06-06/actual-generation/candidates-2026-08-24/f1-v1.png";

const selected = [
  { frame: 1, candidate: "f1-v1.png", references: [pier, xu, p05, "storyboard-full-pack/E06-05/f3.png"], qc: "通过：只有许知遥开口；P05 两锈孔、折线、签名区完整且平放；无作废、鉴真或洗清结论" },
  { frame: 2, candidate: "f2-v1.png", references: [pier, cheng, gao, "storyboard-full-pack/E06-05/f1.png", f1Candidate], qc: "通过：高嵩闭口伸手但与证物有空气间隙；程野护住同一封闭 P03 并单独开口；无开袋、撕纸或手部重叠" },
  { frame: 3, candidate: "f3-v1.png", references: [pier, gao, f1Candidate], qc: "通过：只有高嵩闭口监听自己的完好普通手机，屏幕背向；无 P06 损伤特征和司法结论符号" },
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
  referenceBinding: `${generatedAt} 多参考图条件生成：真实参考顺序、P05 待鉴定、高嵩不触证、封闭 P03、普通手机/P06 区分、运营指令与司法结论边界均记录于 actual-generation 文件。`,
  default: {
    consistency: "通过：P05 只进入鉴定；高嵩未触碰 P03；程野持续控制封闭袋；高嵩接听自己的完好普通手机，电话只传达运营指令。",
    action: "保留正式 f1-f3；视频阶段严格执行待鉴定、不触证、封闭袋、口型、手机身份与非司法指令边界。",
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

console.log(`E06-06 canonical frames promoted: ${selected.length}`);
console.log("E06-06 QC segment updated: 1");
console.log(`E06-06 provenance entries written: ${selected.length}`);
