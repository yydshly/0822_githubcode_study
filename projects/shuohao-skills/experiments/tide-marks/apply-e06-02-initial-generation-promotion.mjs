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
const segment = "E06-02";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E06-02-IMAGE-QC-APPROVAL.zh-CN.md";

const pier = "art/images/南堤旧渡口候船厅与栈桥-sheet.png";
const gao = "characters/images/高嵩-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const p03 = "art/images/真正的载货联单-sheet.png";

const selected = [
  {
    frame: 1,
    candidate: "f1-v2.png",
    references: [
      "storyboard-full-pack/E06-02/actual-generation/candidates-2026-08-24/f1-v1.png",
      p03,
    ],
    qc: "通过：只有程野开口；唯一 P03 完全位于封闭袋内，隔塑料指向六条横向模糊行带，右下单枚暗紫私章带缺损边缘",
  },
  {
    frame: 2,
    candidate: "f2-v2.png",
    references: [
      "storyboard-full-pack/E06-02/actual-generation/candidates-2026-08-24/f2-v1.png",
      gao,
      "storyboard-full-pack/E06-02/actual-generation/candidates-2026-08-24/f1-v2.png",
    ],
    qc: "通过：高嵩开口且双手不持证物；恰好两名匿名成人只见背影、两张空白板；密封袋仅在最左边缘且与高嵩分离",
  },
  {
    frame: 3,
    candidate: "f3-v1.png",
    references: [
      pier,
      xu,
      "storyboard-full-pack/E06-02/actual-generation/candidates-2026-08-24/f1-v2.png",
    ],
    qc: "通过：只有许知遥入画并克制开口；所有观众、证物、备份盘、效果板与文字内容均不入画",
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
qc.reviewScope = "E01-E06 当前已生成关键帧逐张人工复核、参考图条件修复与缺图生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({
  id: segment,
  referenceBinding: `${generatedAt} 多参考图条件生成及定向修订：真实参考顺序、P03 六行/缺角章强化、高嵩错误持证返工、匿名观众计数、空白板与口型边界均记录于 actual-generation 文件。`,
  default: {
    consistency: "通过：同一 P03 全程保持在封闭袋内，高嵩从未触证；现场只显示两名匿名观众背影，拆迁机械仍只怠速。",
    action: "保留正式 f1-f3；视频阶段严格执行封闭袋、证物控制权、两名背影、两张空白板、单人口型与机械怠速约束。",
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

console.log(`E06-02 canonical frames promoted: ${selected.length}`);
console.log("E06-02 QC segment updated: 1");
console.log(`E06-02 provenance entries written: ${selected.length}`);
