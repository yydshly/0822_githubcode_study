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
const segment = "E05-08";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E05-08-IMAGE-QC-APPROVAL.zh-CN.md";

const lab = "art/images/许知遥临时声音修复室-sheet.png";
const xu = "characters/images/许知遥-sheet.png";
const cheng = "characters/images/程野-sheet.png";
const manifest = "art/images/真正的载货联单-sheet.png";
const phone = "art/images/程野残录手机-sheet.png";

const selected = [
  {
    frame: 1,
    candidate: "f1-v1.png",
    references: [
      lab,
      xu,
      cheng,
      manifest,
      "storyboard-full-pack/E05-07/f4.png",
    ],
    qc: "通过：恰好许知遥、程野两位现时成人；只有程野开口。唯一联单裸放在中性保育衬纸上且尚未进入透明保护袋，同一摔裂橙色电台保持唯一",
  },
  {
    frame: 2,
    candidate: "f2-v1.png",
    references: [
      lab,
      xu,
      "storyboard-full-pack/E05-08/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：只有许知遥本人出镜并自然开口；程野在画外，高嵩未以人物、肖像、倒影、屏幕或回忆重演实体化",
  },
  {
    frame: 3,
    candidate: "f3-v3.png",
    references: [
      "storyboard-full-pack/E05-08/actual-generation/candidates-2026-08-24/f3-v2.png",
      phone,
    ],
    qc: "通过：只有闭口的程野；P06 石墨黑厚壳、左上小蛛裂与右下暗橙擦痕清楚可辨，屏幕仅抽象青色波形且无文字、数字、头像或时间码",
  },
  {
    frame: 4,
    candidate: "f4-v1.png",
    references: [
      lab,
      xu,
      cheng,
      phone,
      "storyboard-full-pack/E05-08/actual-generation/candidates-2026-08-24/f1-v1.png",
    ],
    qc: "通过：许知遥与程野均闭口听残录；P06 屏幕完全背向镜头，高嵩只留在音轨意图中，无人物、肖像、倒影、重演或可读界面",
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
qc.reviewScope = "E01-E04 及 E05-01～E05-08 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({
  id: segment,
  referenceBinding: `${generatedAt} 多参考图条件生成及定向修订：真实参考顺序、两次手机锚点返工、失败调用、候选版本和残余视频风险均记录于 actual-generation 文件；每次成功调用参考图不超过 5 张。`,
  default: {
    consistency: "通过：本段严格区分现时人物与画外录音人物；联单仍为裸放阶段，P06 的裂纹和橙色擦痕稳定，所有屏幕均不含可读信息。",
    action: "保留正式 f1-f4；视频阶段严格按 UPLOAD-ORDER.md 上传，并执行说话人唯一、画外录音不实体化、证物唯一性与屏幕无字约束。",
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

console.log(`E05-08 canonical frames promoted: ${selected.length}`);
console.log("E05-08 QC segment updated: 1");
console.log(`E05-08 provenance entries written: ${selected.length}`);
