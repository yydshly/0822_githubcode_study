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
const segment = "E05-09";
const candidateFolder = path.join("actual-generation", `candidates-${generatedAt}`);
const approvalFile = "offline-production/E05-09-IMAGE-QC-APPROVAL.zh-CN.md";

const p01 = "art/images/橙色应急电台-sheet.png";
const p03 = "art/images/真正的载货联单-sheet.png";
const p05 = "art/images/许德海事故责任书-sheet.png";
const lab = "art/images/许知遥临时声音修复室-sheet.png";

const selected = [
  {
    frame: 1,
    candidate: "f1-v2.png",
    references: [
      "storyboard-full-pack/E05-09/actual-generation/candidates-2026-08-24/f1-v1.png",
      p05,
      p03,
    ],
    qc: "通过：只有许知遥入画并自然开口；恰好一张裸放 P03 与一张裸放 P05，P05 完整右下角、蓝黑模糊签名和褪色椭圆印可辨但不可读；所有禁物均未串入",
  },
  {
    frame: 2,
    candidate: "f2-v3.png",
    references: [
      "storyboard-full-pack/E05-09/actual-generation/candidates-2026-08-24/f2-v2.png",
      p05,
      p01,
    ],
    qc: "通过：恰好许知遥、程野两人且只有程野自然开口；唯一 P01 保留黑熔痕、右侧裂开结构、盐霜擦痕和弯天线，P03/P05 各一张裸放且辨识锚点完整",
  },
  {
    frame: 3,
    candidate: "f3-v2.png",
    references: [
      "storyboard-full-pack/E05-09/actual-generation/candidates-2026-08-24/f3-v1.png",
      lab,
      "storyboard-full-pack/E05-08/f4.png",
    ],
    qc: "通过：只有许知遥入画并自然开口；同一铁丝玻璃窗左下区域的固定放射状蛛裂恢复且未复制，所有人物外证物、屏幕、文字与界面均未出现",
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
qc.reviewScope = "E01-E04 及 E05-01～E05-09 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
qc.segments = qc.segments.filter((entry) => entry.id !== segment);
qc.segments.push({
  id: segment,
  referenceBinding: `${generatedAt} 多参考图条件生成及定向修订：真实参考顺序、P05 构图返工、P01 损伤锚点、固定窗裂返工、失败调用和候选版本均记录于 actual-generation 文件；每次成功调用参考图不超过 5 张。`,
  default: {
    consistency: "通过：P03/P05 在本段始终裸放且各一张；P01 保持事故后未修复状态；说话人唯一，固定窗裂没有自动愈合，所有文本保持不可读。",
    action: "保留正式 f1-f3；视频阶段严格按 UPLOAD-ORDER.md 上传，执行人物口型、三件证物、P01 损伤、双纸未装袋、无可读文字和固定窗裂约束。",
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

console.log(`E05-09 canonical frames promoted: ${selected.length}`);
console.log("E05-09 QC segment updated: 1");
console.log(`E05-09 provenance entries written: ${selected.length}`);
