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
const approvalFile = "offline-production/E04-IMAGE-QC-APPROVAL.zh-CN.md";

const selected = [
  ["E04-01", 1, "f1-v1.png", "通过：许知遥抱住官方电台，高嵩横臂拦路但未触碰；双人身份、门口轴线和说话者正确"],
  ["E04-01", 2, "f2-v1.png", "通过：仅许知遥出镜并护住官方电台，冷静拒绝的讲话口型与单灯货仓连续"],
  ["E04-01", 3, "f3-v2.png", "通过：许知遥把电台收进雨衣，高嵩递出无字资料；双人闭口、耳机和门口轴线连续"],
  ["E04-02", 1, "f1-v1.png", "通过：仅高嵩出镜，空白房产资料与台上官方电台关系清楚，报价讲话口型正确"],
  ["E04-02", 2, "f2-v1.png", "通过：仅许知遥出镜且没有接资料，官方电台位于后景，拒绝动作与视线正确"],
  ["E04-02", 3, "f3-v1.png", "通过：仅高嵩出镜，一手收回资料、一手拉门；无字页面、手部和轻微笑意正确"],
  ["E04-03", 1, "f1-v2.png", "通过：仅许知遥出镜，追问驾驶者的近景、讲话口型和关闭钢门背景正确"],
  ["E04-03", 2, "f2-v2.png", "通过：仅高嵩出镜，轻微耸肩、淡笑与轻描淡写的讲话口型正确"],
  ["E04-03", 3, "f3-v1.png", "通过：仅许知遥出镜，压住怒意说父亲被锁，人物身份与关闭钢门连续"],
  ["E04-04", 1, "f1-v1.png", "通过：仅高嵩出镜，开掌拍锈蚀钢门，手部、讲话口型和单灯夜戏正确"],
  ["E04-04", 2, "f2-v2.png", "通过：仅许知遥出镜并向画外追问，前景无第二人暗影，证物桌和门轴连续"],
  ["E04-04", 3, "f3-v1.png", "通过：仅高嵩出镜并指向官方橙色电台，轻蔑讲话口型与道具几何正确"],
  ["E04-04", 4, "f4-v1.png", "通过：仅高嵩出镜，放慢语速后的冷硬近景与人物身份连续"],
  ["E04-05", 1, "f1-v2.png", "通过：程野在冷蓝门外把手机收音端贴近中央门缝，许知遥在暖灰门内讲话；恰好两人"],
  ["E04-05", 2, "f2-v1.png", "通过：仅高嵩出镜，以几乎消失的笑意威胁；关闭钢门、口型和空间连续"],
  ["E04-05", 3, "f3-v2.png", "通过：仅高嵩出镜，先低看门槛移动阴影再猛拉钢门，动作因果与手部正确"],
  ["E04-06", 1, "f1-v2.png", "通过：全景清楚显示程野退开两步持手机、高嵩站在右侧门洞发问；冷外暖内和人物口型正确"],
  ["E04-06", 2, "f2-v1.png", "通过：仅程野出镜，手机贴胸、短促回答并向左转身蓄力，画面方向连续"],
  ["E04-06", 3, "f3-v1.png", "通过：程野向左奔跑、高嵩从右侧仓门追出；双人跑姿、手机和追逐轴线正确"],
  ["E04-07", 1, "f1-v1.png", "通过：程野、许知遥、高嵩三人身份分离，高嵩夺取单台官方电台并处于撞击前状态"],
  ["E04-07", 2, "f2-v2.png", "通过：高嵩站立俯身，破裂外壳明显张开，单块绿色存储板正从缝中滑出"],
  ["E04-07", 3, "f3-v1.png", "通过：仅许知遥出镜，蹲下分别拾起裂壳和同一块存储板，回答口型与手部正确"],
  ["E04-07", 4, "f4-v1.png", "通过：许知遥在下方把存储板装回裂壳，高嵩停在高处；双人位置和损坏状态连续"],
  ["E04-08", 1, "f1-v1.png", "通过：程野站到许知遥身边讲话，许知遥低位持裂壳；双人身份、口型和道具状态连续"],
  ["E04-08", 2, "f2-v1.png", "通过：仅高嵩出镜并自然指向暗处货仓，拆迁威胁的说话者与指向正确"],
  ["E04-08", 3, "f3-v1.png", "通过：仅高嵩极近景，视线明确落向画外手机，无纸张、手机或其他人物误入"],
  ["E04-09", 1, "f1-v1.png", "通过：仅程野出镜，手机稳在胸前并指向水面，强调水下证据的讲话口型正确"],
  ["E04-09", 2, "f2-v1.png", "通过：许知遥前景转向画外程野，高嵩沿栈桥远离；恰好两人且景深方向正确"],
  ["E04-09", 3, "f3-v2.png", "通过：仅程野闭口聆听，手机无文字界面并显示一个爆音岛加三个词组岛"],
  ["E04-09", 4, "f4-v1.png", "通过：许知遥与程野闭口聆听同一无字波形手机，高嵩只作为画外录音且没有出镜"],
];

const segmentNotes = {
  "E04-01": "门口拦截、拒绝与递资料三镜连续；官方电台在 f3 被收进雨衣。",
  "E04-02": "报价、拒收与关门三镜连续；资料始终无可读文字。",
  "E04-03": "许知遥与高嵩的三次单人反打保持关闭钢门和单灯货仓连续。",
  "E04-04": "拍门、追问、电台指控和冷硬结论四镜保持人物、证物桌与锈门连续。",
  "E04-05": "关闭钢门两侧的录音、门内威胁与发现阴影拉门构成完整因果。",
  "E04-06": "程野退让、短答与向左逃跑；高嵩从右侧仓门追出，方向轴稳定。",
  "E04-07": "官方电台按夺取、撞击前、裂开、存储板滑出、拾起和装回的损坏阶段连续。",
  "E04-08": "两名调查者并肩、高嵩指向货仓与低看手机三镜连续。",
  "E04-09": "水下试探、高嵩离开与手机残录链连续；手机无文字且说话者不误出镜。",
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error(`not a PNG: ${file}`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function sourceReferences(segment, frame) {
  const promptPath = path.join(pack, segment, "frame-prompts", `f${frame}.md`);
  const text = fs.readFileSync(promptPath, "utf8");
  const references = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\d+\.\s+([A-Za-z]:\\.+?)\s+—\s+可用\s*$/);
    if (!match) continue;
    const absolute = match[1];
    if (!fs.existsSync(absolute)) throw new Error(`missing source reference: ${absolute}`);
    references.push(relative(absolute));
  }
  if (!references.length) throw new Error(`no source references parsed: ${promptPath}`);
  return references;
}

for (const [segment, frame, candidateName] of selected) {
  const candidate = path.join(pack, segment, candidateFolder, candidateName);
  const canonical = path.join(pack, segment, `f${frame}.png`);
  const promptRecord = path.join(pack, segment, "actual-generation", `initial-generation-candidates-${generatedAt}.md`);
  const framePrompt = path.join(pack, segment, "frame-prompts", `f${frame}.md`);
  for (const required of [candidate, promptRecord, framePrompt, path.join(root, approvalFile)]) {
    if (!fs.existsSync(required)) throw new Error(`missing required generation artifact: ${required}`);
  }
  const [width, height] = pngSize(candidate);
  if (width !== 1672 || height !== 941) {
    throw new Error(`unexpected candidate dimensions ${width}x${height}: ${candidate}`);
  }
  if (fs.existsSync(canonical) && sha256(canonical) !== sha256(candidate)) {
    throw new Error(`refusing to overwrite different canonical frame: ${segment}/f${frame}`);
  }
}

for (const [segment, frame, candidateName] of selected) {
  const candidate = path.join(pack, segment, candidateFolder, candidateName);
  const canonical = path.join(pack, segment, `f${frame}.png`);
  if (!fs.existsSync(canonical)) fs.copyFileSync(candidate, canonical);
  if (sha256(canonical) !== sha256(candidate)) {
    throw new Error(`canonical promotion verification failed: ${segment}/f${frame}`);
  }
}

const bySegment = new Map();
for (const [segment, frame, candidateName, qcText] of selected) {
  if (!bySegment.has(segment)) bySegment.set(segment, []);
  bySegment.get(segment).push({ frame, candidateName, qcText });
}

const qc = JSON.parse(fs.readFileSync(qcPath, "utf8"));
qc.reviewedAt = generatedAt;
qc.reviewScope = "E01-E04 已生成关键帧逐张人工复核、参考图条件修复与缺图首轮生成";
const e04Ids = new Set(bySegment.keys());
qc.segments = qc.segments.filter((segment) => !e04Ids.has(segment.id));
for (const [segment, frames] of bySegment) {
  const ordered = [...frames].sort((a, b) => a.frame - b.frame);
  qc.segments.push({
    id: segment,
    referenceBinding: `${generatedAt} 参考图条件初次生成：严格按 frame-prompts 的源参考顺序，并用相邻候选锁定人物、空间与道具连续性；完整实际提示词见 actual-generation 记录。`,
    default: {
      consistency: `通过：${segmentNotes[segment]}`,
      action: `保留正式 f1-f${ordered.at(-1).frame}；视频阶段严格按 UPLOAD-ORDER.md 上传，并沿用 prompt.md 的人物、口型、道具状态与画外音约束。`,
    },
    frames: Object.fromEntries(ordered.map(({ frame, qcText }) => [String(frame), {
      consistency: qcText,
      action: `保留正式 f${frame}；后续图生视频必须以本帧和相邻帧共同约束动作阶段。`,
    }])),
  });
}
qc.segments.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const selectedKeys = new Set(selected.map(([segment, frame]) => `${segment}/${frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter(
  (entry) => !selectedKeys.has(`${entry.segment}/${entry.frame}`),
);
for (const [segment, frame, candidateName, qcText] of selected) {
  provenance.push({
    segment,
    frame,
    generatedAt,
    mode: "Codex 内置图像生成·多参考图条件生成",
    references: sourceReferences(segment, frame),
    promptFile: `storyboard-full-pack/${segment}/actual-generation/initial-generation-candidates-${generatedAt}.md`,
    candidate: `storyboard-full-pack/${segment}/actual-generation/candidates-${generatedAt}/${candidateName}`,
    output: `storyboard-full-pack/${segment}/f${frame}.png`,
    qcApproval: approvalFile,
    qc: qcText,
  });
}
provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`E04 canonical frames promoted: ${selected.length}`);
console.log(`E04 QC segments updated: ${bySegment.size}`);
console.log(`E04 provenance entries written: ${selected.length}`);
