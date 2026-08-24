#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const script = JSON.parse(fs.readFileSync(path.join(root, "script", "潮痕-script.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(pack, "manifest.json"), "utf8"));
const imports = JSON.parse(fs.readFileSync(path.join(pack, "chatart-import-manifest.json"), "utf8"));
const manifestById = new Map(manifest.map((item) => [item.segment, item]));
const importById = new Map(imports.map((item) => [item.segment, item]));
const continuityPath = path.join(root, "offline-production", "continuity-boundary-audit.json");
const continuityAudit = fs.existsSync(continuityPath) ? JSON.parse(fs.readFileSync(continuityPath, "utf8")) : null;
const storyLogicPath = path.join(root, "offline-production", "story-logic-audit.json");
const storyLogicAudit = fs.existsSync(storyLogicPath) ? JSON.parse(fs.readFileSync(storyLogicPath, "utf8")) : null;
const qcRegistryPath = path.join(root, "offline-production", "frame-qc-registry.csv");
const qcRows = fs.existsSync(qcRegistryPath) ? fs.readFileSync(qcRegistryPath, "utf8").trim().split(/\r?\n/).slice(1) : [];
const qcFields = qcRows.map((line) => line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1).split('\",\"') : line.split(","));
const qcPassedFrames = qcFields.filter((fields) => {
  return String(fields[6] || "").startsWith("通过");
}).length;
const qcReworkFrames = qcFields.filter((fields) => String(fields[6] || "").startsWith("需返工")).length;
const qcPendingFrames = qcFields.filter((fields) => fields[3] === "已存在" && !/^(通过|需返工)/.test(String(fields[6] || ""))).length;
const qcMissingFrames = qcFields.filter((fields) => fields[3] !== "已存在").length;
const actualH3Count = [
  path.join(root, "generated-videos", "E01-01", "E01-01-v01.mp4"),
  path.join(root, "generated-videos", "E01-02", "E01-02-v01.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-01", "e02-01-generated-chatart-h3-768p.mp4"),
].filter((file) => fs.existsSync(file)).length;
const errors = [];
let frameCount = 0;
let readyCount = 0;
let fallbackPromptCount = 0;
let semanticReviewedCount = 0;
let continuityGuideCount = 0;
let continuityPromptCount = 0;
const forbiddenGenericActions = [
  "examines and repositions the damaged documentary evidence on a hard surface",
  "holds the tense exchange and reacts to the new claim",
  "operates or listens to the scorched orange radio and its moving cyan waveform",
  "works against the low-tide water and retrieves evidence beside the breakwater",
  "handles the blackened brass key as a decisive piece of evidence",
  "moves urgently through",
  "makes a sharp physical move over the contested evidence",
  "advances the investigation through a restrained physical action",
];

for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    const dir = path.join(pack, segment.id);
    const expected = segment.cuts.map((_, index) => path.join(dir, `f${index + 1}.png`));
    const exists = expected.map((file) => fs.existsSync(file));
    const actualMissing = expected.filter((_, index) => !exists[index]).map((file) => path.resolve(file));
    const manifestEntry = manifestById.get(segment.id);
    const importEntry = importById.get(segment.id);
    frameCount += exists.filter(Boolean).length;
    if (exists.every(Boolean)) readyCount += 1;
    if (!manifestEntry) errors.push(`${segment.id}: manifest 缺项`);
    if (!importEntry) errors.push(`${segment.id}: import manifest 缺项`);
    const declaredMissing = (manifestEntry?.missing || []).map((file) => path.resolve(file));
    if (JSON.stringify(declaredMissing) !== JSON.stringify(actualMissing)) errors.push(`${segment.id}: manifest missing 与文件系统不一致`);
    if (importEntry) {
      const importExists = importEntry.uploadOrder.map((item) => item.exists);
      if (JSON.stringify(importExists) !== JSON.stringify(exists)) errors.push(`${segment.id}: import.json 图片状态过期`);
      if (importEntry.ready !== exists.every(Boolean)) errors.push(`${segment.id}: import.json ready 状态错误`);
      if (!importEntry.continuity?.state) errors.push(`${segment.id}: import.json 缺少段间衔接状态`);
    }
    const upload = fs.readFileSync(path.join(dir, "UPLOAD-ORDER.md"), "utf8");
    exists.forEach((value, index) => {
      const row = upload.split("\n").find((line) => line.includes(`| ${index + 1} | @Image${index + 1} |`));
      const expectedStatus = value ? "已存在" : "待生成";
      if (!row?.includes(expectedStatus)) errors.push(`${segment.id}/f${index + 1}: 上传说明状态错误`);
    });
    const readme = fs.readFileSync(path.join(dir, "README.zh-CN.md"), "utf8");
    const expectedReadmeStatus = exists.every(Boolean) ? "关键帧状态：图片齐全" : `关键帧状态：缺 ${exists.filter((value) => !value).length} 张`;
    if (!readme.includes(expectedReadmeStatus)) errors.push(`${segment.id}: 中文 README 状态错误`);
    const continuityGuide = path.join(dir, "SEGMENT-CONTINUITY.zh-CN.md");
    if (fs.existsSync(continuityGuide)) continuityGuideCount += 1;
    else errors.push(`${segment.id}: 缺少段间衔接契约`);
    const chatartPrompt = fs.readFileSync(path.join(dir, "chatart-prompt.txt"), "utf8");
    if (chatartPrompt.includes("CROSS-SEGMENT CONTINUITY GATES:")) continuityPromptCount += 1;
    else errors.push(`${segment.id}: ChatArt 提示词未注入段间衔接质量门`);
    segment.cuts.forEach((_, index) => {
      const fallback = path.join(dir, "shot-video-prompts", `f${index + 1}.txt`);
      if (fs.existsSync(fallback)) fallbackPromptCount += 1;
      else errors.push(`${segment.id}/f${index + 1}: 缺少逐镜视频兜底提示词`);
    });
    if (segment.semanticReviewed === true) {
      semanticReviewedCount += 1;
      segment.cuts.forEach((cut, index) => {
        for (const phrase of forbiddenGenericActions) {
          if (cut.frame.includes(phrase)) errors.push(`${segment.id}/f${index + 1}: 已标记语义审核，但生图提示词仍含泛化动作模板`);
        }
      });
      for (const phrase of forbiddenGenericActions) {
        if (segment.h3Prompt.includes(phrase)) errors.push(`${segment.id}: 已标记语义审核，但 H3 提示词仍含泛化动作模板`);
      }
    }
    if (segment.h3Prompt.includes("undefined")) errors.push(`${segment.id}: H3 提示词含未解析的 undefined 内容`);
  }
}

const production = fs.readFileSync(path.join(root, "PRODUCTION.md"), "utf8");
const totalCuts = storyboard.episodes.flatMap((episode) => episode.segments).reduce((sum, segment) => sum + segment.cuts.length, 0);
if (qcRows.length !== totalCuts) errors.push(`QC 台账行数错误：${qcRows.length}/${totalCuts}`);
if (qcPassedFrames + qcReworkFrames + qcPendingFrames + qcMissingFrames !== totalCuts) errors.push("QC 台账状态未完整分区");
if (qcPassedFrames + qcReworkFrames + qcPendingFrames !== frameCount) errors.push("QC 台账已有图片数与文件系统不一致");
if (!production.includes(`分镜关键帧 | ${frameCount}/${totalCuts}`)) errors.push("PRODUCTION.md 关键帧统计过期");
if (!production.includes(`图片齐全的段 | ${readyCount}/${manifest.length}`)) errors.push("PRODUCTION.md 段状态统计过期");
if (!production.includes(`提示词语义审核 | ${semanticReviewedCount}/${manifest.length}`)) errors.push("PRODUCTION.md 提示词语义审核统计过期");
if (!production.includes(`图片一致性 QC | ${qcPassedFrames}/${totalCuts}`)) errors.push("PRODUCTION.md 图片一致性 QC 统计过期");
if (!production.includes(`${qcReworkFrames} 张需返工；${qcPendingFrames} 张已有图待复核；${qcMissingFrames} 张未生成`)) errors.push("PRODUCTION.md QC 分区统计过期");
if (!production.includes(`真实 H3 测试视频 | ${actualH3Count} 条`)) errors.push("PRODUCTION.md 真实 H3 数量过期");
if (!continuityAudit) errors.push("缺少 58 个段间衔接审计数据");
else {
  if (continuityAudit.boundaries.length !== 58 || continuityAudit.summary.reviewed !== 58) errors.push("段间衔接审计数量错误");
  if (continuityAudit.summary.direct + continuityAudit.summary.verify + continuityAudit.summary.blocked !== 58) errors.push("段间衔接风险分区不完整");
  if (!production.includes(`段间衔接审计 | 58/58`)) errors.push("PRODUCTION.md 段间衔接统计过期");
  if (!fs.existsSync(path.join(root, "offline-production", "continuity-audit.html"))) errors.push("缺少段间衔接可视化页面");
}
if (!storyLogicAudit) errors.push("缺少全剧故事逻辑审计数据");
else {
  if (storyLogicAudit.summary.reviewed !== storyLogicAudit.issues.length) errors.push("故事逻辑审计数量错误");
  if (storyLogicAudit.summary.fixed + storyLogicAudit.summary.open !== storyLogicAudit.summary.reviewed) errors.push("故事逻辑审计状态分区不完整");
  if (!production.includes(`全剧故事逻辑审计 | ${storyLogicAudit.summary.reviewed} 项已检查；${storyLogicAudit.summary.fixed} 项已回写修复；${storyLogicAudit.summary.open} 项未解决`)) errors.push("PRODUCTION.md 故事逻辑统计过期");
  if (!fs.existsSync(path.join(root, "offline-production", "story-logic-audit.html"))) errors.push("缺少故事逻辑可视化页面");
}
const ep3Opening = script.episodes.find((episode) => episode.ep === 3)?.scenes?.[0]?.flow?.slice(0, 6) || [];
const ep3OpeningText = JSON.stringify(ep3Opening);
if (/两桶改成六桶|这里是你的私章|写有六桶工业溶剂的清单/.test(ep3OpeningText)) errors.push("E03 开场仍提前泄露六桶清单或私章");
const e0301 = storyboard.episodes.flatMap((episode) => episode.segments).find((segment) => segment.id === "E03-01");
if (!e0301?.h3Prompt.includes("no private seal") || !e0301.h3Prompt.includes("hidden freight list has not yet been discovered")) errors.push("E03-01 H3 提示词缺少证物首次出现防回归约束");
const e0301Official = path.join(pack, "E03-01", "f3.png");
const e0301Candidate = path.join(pack, "E03-01", "f3-logic-v2.png");
const e0301Rejected = path.join(pack, "E03-01", "rejected-originals", "f3-premature-private-seal.png");
if (![e0301Official, e0301Candidate, e0301Rejected].every((file) => fs.existsSync(file))) errors.push("E03-01 逻辑修复图或旧图归档不完整");
else if (!fs.readFileSync(e0301Official).equals(fs.readFileSync(e0301Candidate))) errors.push("E03-01 正式 f3 未指向逻辑修复版本");
const hubDataPath = path.join(root, "production-hub-data.json");
if (fs.existsSync(hubDataPath)) {
  const hub = JSON.parse(fs.readFileSync(hubDataPath, "utf8"));
  if (hub.totals.frameImages !== frameCount) errors.push("生产主入口图片数过期");
  if (hub.totals.qcPassedFrames !== qcPassedFrames) errors.push("生产主入口 QC 通过数过期");
  if (hub.totals.qcReworkFrames !== qcReworkFrames) errors.push("生产主入口返工数过期");
  if (hub.totals.qcPendingFrames !== qcPendingFrames) errors.push("生产主入口待复核数过期");
  if (hub.totals.realH3 !== actualH3Count) errors.push("生产主入口真实 H3 数量过期");
  if (hub.narrativeGate?.passed !== false || hub.narrativeGate?.decision !== "停止扩大视频生成") errors.push("生产主入口未正确标记叙事门失败与停止决策");
}
const capabilityReportPath = path.join(root, "offline-production", "capability-evaluation.html");
if (!fs.existsSync(capabilityReportPath)) errors.push("缺少能力归属与最终评估页面");
else {
  const capabilityReport = fs.readFileSync(capabilityReportPath, "utf8");
  if (!capabilityReport.includes(`真实视频</small><b>${actualH3Count}/59`)) errors.push("能力评估真实视频统计过期");
  if (!capabilityReport.includes("正式采用</small><b>0/59")) errors.push("能力评估正式采用统计过期");
}
if (fallbackPromptCount !== totalCuts) errors.push(`逐镜视频兜底提示词数量错误：${fallbackPromptCount}/${totalCuts}`);
if (continuityGuideCount !== manifest.length || continuityPromptCount !== manifest.length) errors.push(`段间衔接契约覆盖不完整：说明 ${continuityGuideCount}/${manifest.length}，提示词 ${continuityPromptCount}/${manifest.length}`);
for (let episode = 1; episode <= storyboard.episodes.length; episode += 1) {
  const ep = String(episode).padStart(2, "0");
  if (!fs.existsSync(path.join(root, "offline-production", "subtitles", `E${ep}-draft.zh-CN.srt`))) errors.push(`E${ep}: 缺少字幕草稿`);
  if (!fs.existsSync(path.join(root, "offline-production", "timelines", `E${ep}-edit-timeline.csv`))) errors.push(`E${ep}: 缺少剪辑时间线`);
}

const videoControlPath = path.join(root, "offline-production", "video-production-control.json");
if (!fs.existsSync(videoControlPath)) {
  errors.push("缺少全片视频生产控制数据");
} else {
  const videoControl = JSON.parse(fs.readFileSync(videoControlPath, "utf8"));
  if (videoControl.totals.segments !== manifest.length || videoControl.segments.length !== manifest.length) errors.push("视频生产控制台段数错误");
  if (videoControl.totals.shots !== totalCuts || videoControl.shots.length !== totalCuts) errors.push("视频生产控制台镜数错误");
  if (!Array.isArray(videoControl.overlays) || videoControl.overlays.length !== 2) errors.push("视频生产控制台后期叠加清单错误");
  if (!videoControl.continuity || videoControl.continuity.reviewed !== 58) errors.push("视频生产控制台缺少段间衔接状态");
  if (videoControl.narrativeGate?.passed !== false || videoControl.narrativeGate?.decision !== "停止扩大视频生成") errors.push("视频生产控制台未正确标记叙事门失败与停止决策");
  if (!fs.existsSync(path.join(root, "offline-production", "video-production-tracker.csv"))) errors.push("缺少 59 段视频状态台账");
  if (!fs.existsSync(path.join(root, "offline-production", "MASTER-EDIT-TIMELINE.csv"))) errors.push("缺少 193 镜全片剪辑总表");
  if (!fs.existsSync(path.join(root, "offline-production", "overlays", "E06-10-f2-phone-notification.svg"))) errors.push("缺少 E06-10 手机通知后期素材");
}

const architecturePath = path.join(root, "offline-production", "foundational-capability-architecture.html");
if (!fs.existsSync(architecturePath)) {
  errors.push("缺少从好故事到好视频的基础能力架构报告");
} else {
  const architecture = fs.readFileSync(architecturePath, "utf8");
  if (!architecture.includes("10 层能力、6 道质量门、5 阶段开发路线") && !architecture.includes("完整能力分层")) errors.push("基础能力架构报告内容不完整");
  if (!architecture.includes("本次故事预生产没有通过叙事前置质量门")) errors.push("基础能力架构报告缺少失败阶段边界声明");
}

const conclusionPath = path.join(root, "offline-production", "library-exploration-conclusion.json");
if (!fs.existsSync(conclusionPath)) errors.push("缺少库能力探索与失败复盘结论");
else {
  const conclusion = JSON.parse(fs.readFileSync(conclusionPath, "utf8"));
  if (conclusion.explorationStatus !== "complete" || conclusion.productionAttemptStatus !== "failed-narrative-gate") errors.push("探索成功与投产失败的状态区分错误");
  if (conclusion.narrativeGatePassed !== false || conclusion.productionDecision !== "stop-video-generation") errors.push("失败复盘未记录停止视频生成决策");
}

const archiveRoot = path.join(root, "archive", "2026-08-24-capability-exploration-failure-review");
const archiveManifestPath = path.join(archiveRoot, "manifest.json");
if (!fs.existsSync(archiveManifestPath)) {
  errors.push("缺少 2026-08-24 能力探索冻结归档");
} else {
  const archiveManifest = JSON.parse(fs.readFileSync(archiveManifestPath, "utf8"));
  if (archiveManifest.revision !== 2) errors.push("失败复盘归档不是最终修正版 revision 2");
  if (archiveManifest.phase !== "库能力探索完成；短剧投产尝试未通过叙事前置质量门；停止扩大视频生成") errors.push("归档阶段定义错误");
  if (archiveManifest.summary?.segments !== manifest.length || archiveManifest.summary?.cuts !== totalCuts) errors.push("归档预生产统计错误");
  if (archiveManifest.summary?.realVideoSegments !== actualH3Count || archiveManifest.summary?.acceptedVideoSegments !== 0) errors.push("归档真实视频状态错误");
  if (archiveManifest.summary?.narrativeGatePassed !== false || archiveManifest.summary?.productionDecision !== "stop-video-generation") errors.push("归档缺少叙事失败与停止决策");
  if (!Array.isArray(archiveManifest.entries) || archiveManifest.entries.length !== 24) errors.push("归档快照文件数量错误");
  for (const entry of archiveManifest.entries || []) {
    const snapshot = path.join(archiveRoot, entry.snapshot || "");
    if (!fs.existsSync(snapshot)) {
      errors.push(`归档快照缺失：${entry.snapshot}`);
      continue;
    }
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(snapshot)).digest("hex");
    if (sha256 !== entry.sha256) errors.push(`归档快照哈希不一致：${entry.snapshot}`);
  }
  if (!fs.existsSync(path.join(archiveRoot, "index.html")) || !fs.existsSync(path.join(archiveRoot, "README.zh-CN.md"))) errors.push("归档入口或中文说明缺失");
}

if (errors.length) {
  console.error(`✗ 生产状态校验失败（${errors.length} 项）`);
  errors.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`✓ 生产状态一致：${frameCount}/${totalCuts} 张，${readyCount}/${manifest.length} 段图片齐全，${semanticReviewedCount}/${manifest.length} 段通过提示词语义审核`);
