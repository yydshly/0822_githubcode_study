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
const segment = "E05-10";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E05-10-IMAGE-QC-APPROVAL.zh-CN.md";

const lab = "art/images/许知遥临时声音修复室-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const p01 = "art/images/橙色应急电台-sheet.png";
const p03 = "art/images/真正的载货联单-sheet.png";
const p07 = "art/images/三份独立备份盘-sheet.png";

const selected = [
  {
    frame: 1,
    candidate: "f1-v2.png",
    references: [
      "storyboard-full-pack/E05-10/actual-generation/candidates-2026-08-24/f1-v1.png",
      p07,
      p03,
    ],
    qc: "通过：恰好许知遥、程野两位成人且均闭口；许知遥操作黑/橙/银三个 P07，程野把唯一 P03 滑入唯一透明袋；动作职责、物件计数与全部排除项正确",
  },
  {
    frame: 2,
    candidate: "f2-v1.png",
    references: [
      lab,
      cheng,
      p03,
      "storyboard-full-pack/E05-10/actual-generation/candidates-2026-08-24/f1-v2.png",
    ],
    qc: "通过：只有程野入画并自然开口；唯一 P03 完全位于唯一透明保护袋内，袋口闭合且纸张四边无外露；无散纸、重复证物、人物或禁物",
  },
  {
    frame: 3,
    candidate: "f3-v1.png",
    references: [
      xu,
      cheng,
      p01,
      "storyboard-full-pack/E05-10/actual-generation/candidates-2026-08-24/f1-v2.png",
      "storyboard-full-pack/E05-10/actual-generation/candidates-2026-08-24/f2-v1.png",
    ],
    qc: "通过：恰好两位成人闭口离场；许知遥拿唯一未修复 P01，程野拿唯一封闭袋装 P03；恰好三个 P07 留台，P06 与倒计时界面完全不出画",
  },
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
  if (fs.existsSync(canonical) && sha256(canonical) !== sha256(candidate)) {
    throw new Error(`refusing to overwrite different canonical frame: ${segment}/f${item.frame}`);
  }
}

for (const item of selected) {
  const candidate = path.join(pack, segment, candidateFolder, item.candidate);
  const canonical = path.join(pack, segment, `f${item.frame}.png`);
  if (!fs.existsSync(canonical)) fs.copyFileSync(candidate, canonical);
  if (sha256(canonical) !== sha256(candidate)) throw new Error(`canonical promotion verification failed: ${segment}/f${item.frame}`);
}

const qc = JSON.parse(fs.readFileSync(qcPath, "utf8"));
qc.reviewedAt = generatedAt;
qc.reviewScope = "E01-E05 已生成关键帧逐张人工复核、参考图条件修复与缺图生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({
  id: segment,
  referenceBinding: `${generatedAt} 多参考图条件生成及定向修订：真实参考顺序、动作角色互换返工、封闭袋状态、P01/P06/P07 连续性、终止调用和网络失败均记录于 actual-generation 文件；每次成功调用参考图不超过 5 张。`,
  default: {
    consistency: "通过：本段完成 P03 首次装袋到完全封闭的阶段转换；P07 始终恰好三个并留台，P06 已随程野带走但不出画，P01 保持未修复事故后状态。",
    action: "保留正式 f1-f3；视频阶段严格按 UPLOAD-ORDER.md 上传，并执行人物职责/闭口、封闭袋、三盘留台、P06 画外、P01 损伤和无倒计时 UI 约束。",
  },
  frames: Object.fromEntries(selected.map((item) => [String(item.frame), {
    consistency: item.qc,
    action: `保留正式 f${item.frame}；图生视频时以本帧和相邻帧共同约束动作阶段。`,
  }])),
});
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map((item) => `${segment}/${item.frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter(
  (entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`),
);
for (const item of selected) {
  provenance.push({
    segment,
    frame: item.frame,
    generatedAt,
    mode: "Codex 内置图像生成·最多 5 张真实参考图的条件生成/定向修订",
    references: item.references,
    promptFile: `storyboard-full-pack/${segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`,
    candidate: `storyboard-full-pack/${segment}/actual-generation/candidates-${generatedAt}/${item.candidate}`,
    output: `storyboard-full-pack/${segment}/f${item.frame}.png`,
    qcApproval: approvalFile,
    qc: item.qc,
  });
}
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E05-10 canonical frames promoted: ${selected.length}`);
console.log("E05-10 QC segment updated: 1");
console.log(`E05-10 provenance entries written: ${selected.length}`);
