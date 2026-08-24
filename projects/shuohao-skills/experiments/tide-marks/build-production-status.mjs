#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const cast = JSON.parse(fs.readFileSync(path.join(root, "characters", "潮痕-cast.json"), "utf8"));
const art = JSON.parse(fs.readFileSync(path.join(root, "art", "潮痕-art.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(pack, "manifest.json"), "utf8"));
const imports = JSON.parse(fs.readFileSync(path.join(pack, "chatart-import-manifest.json"), "utf8"));
const continuityPath = path.join(root, "offline-production", "continuity-boundary-audit.json");
if (!fs.existsSync(continuityPath)) throw new Error("缺少段间衔接审计；请先运行 build-continuity-audit.mjs");
const continuityAudit = JSON.parse(fs.readFileSync(continuityPath, "utf8"));
const storyLogicPath = path.join(root, "offline-production", "story-logic-audit.json");
if (!fs.existsSync(storyLogicPath)) throw new Error("缺少故事逻辑审计；请先运行 build-story-logic-audit.mjs");
const storyLogicAudit = JSON.parse(fs.readFileSync(storyLogicPath, "utf8"));

const segments = storyboard.episodes.flatMap((episode) => episode.segments);
const cuts = segments.reduce((sum, segment) => sum + segment.cuts.length, 0);
const seconds = segments.reduce((sum, segment) => sum + segment.cuts.reduce((part, cut) => part + cut.seconds, 0), 0);
const readySegments = manifest.filter((item) => !(item.missing || []).length).length;
const missingFrames = manifest.reduce((sum, item) => sum + (item.missing || []).length, 0);
const readyFrames = cuts - missingFrames;
const semanticReviewedSegments = segments.filter((segment) => segment.semanticReviewed === true).length;
const qcRegistryPath = path.join(root, "offline-production", "frame-qc-registry.csv");
const qcRows = fs.existsSync(qcRegistryPath) ? fs.readFileSync(qcRegistryPath, "utf8").trim().split(/\r?\n/).slice(1) : [];
const qcPassedFrames = qcRows.filter((line) => {
  const fields = line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1).split('\",\"') : line.split(",");
  return String(fields[6] || "").startsWith("通过");
}).length;
const qcReworkFrames = qcRows.filter((line) => {
  const fields = line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1).split('\",\"') : line.split(",");
  return String(fields[6] || "").startsWith("需返工");
}).length;
const qcPendingFrames = qcRows.filter((line) => {
  const fields = line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1).split('\",\"') : line.split(",");
  return fields[3] === "已存在" && !/^(通过|需返工)/.test(String(fields[6] || ""));
}).length;
const shanghaiDateParts = Object.fromEntries(
  new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((item) => [item.type, item.value]),
);
const updateDate = `${shanghaiDateParts.year}-${shanghaiDateParts.month}-${shanghaiDateParts.day}`;
const expectedRefs = [
  ...cast.characters.map((item) => ({ kind: "角色", name: item.name, dir: path.join(root, "characters", "images") })),
  ...art.scenes.map((item) => ({ kind: "场景", name: item.name, dir: path.join(root, "art", "images") })),
  ...art.props.map((item) => ({ kind: "道具", name: item.name, dir: path.join(root, "art", "images") })),
];
const refReady = expectedRefs.filter((item) => fs.existsSync(item.dir) && fs.readdirSync(item.dir).some((file) => file.startsWith(`${item.name}-`) && file.endsWith("-sheet.png") || file === `${item.name}-sheet.png`)).length;
const realVideos = [
  path.join(root, "generated-videos", "E01-01", "E01-01-v01.mp4"),
  path.join(root, "generated-videos", "E01-02", "E01-02-v01.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-01", "e02-01-generated-chatart-h3-768p.mp4"),
].filter((file) => fs.existsSync(file)).length;
const imageProductionStep = qcReworkFrames > 0
  ? `3. 先按图片 QC 报告重做 ${qcReworkFrames} 张偏离图，再分批补齐剩余 ${missingFrames} 张分镜关键帧；逐张记录实际提示词、参考图和质检结论。`
  : qcPendingFrames > 0
    ? `3. 先人工复核 ${qcPendingFrames} 张已有但未放行的图片；通过后写入 QC/来源记录，再补齐剩余 ${missingFrames} 张分镜关键帧。`
  : missingFrames > 0
    ? `3. 当前没有返工图；按段补齐剩余 ${missingFrames} 张分镜关键帧，并逐张记录实际提示词、参考图和质检结论。`
    : "3. 所有分镜关键帧文件均已生成并通过图片层 QC；由于叙事前置质量门失败，只作为实验资料保存，不进入统一视频生成。";

const lines = [
  "# 《潮痕》离线预生产台账", "",
  `更新日期：${updateDate}`, "",
  "> 当前策略：停止扩大视频生成。本次库能力探索完成，但短剧投产尝试因小说原型、因果推进和改编连续性不足而未通过叙事前置质量门。", "",
  "## 当前真实进度", "",
  "| 项目 | 状态 |", "| --- | --- |",
  `| 原文、大纲、角色、美术、六集剧本 | 结构化文件完成；叙事验收失败 |`,
  `| 全剧分镜 | 实验资料：${storyboard.episodes.length} 集、${segments.length} 段、${cuts} 镜、${seconds} 秒；不可直接投产 |`,
  `| 基础设定图 | ${refReady}/${expectedRefs.length} |`,
  `| 分镜关键帧 | ${readyFrames}/${cuts}；剩余 ${missingFrames} 张 |`,
  `| 图片一致性 QC | ${qcPassedFrames}/${cuts} 已通过；${qcReworkFrames} 张需返工；${qcPendingFrames} 张已有图待复核；${missingFrames} 张未生成 |`,
  `| 图片齐全的段 | ${readySegments}/${segments.length} |`,
  `| H3 段级提示词 | ${segments.length}/${segments.length} |`,
  `| 提示词语义审核 | ${semanticReviewedSegments}/${segments.length}；未审核段不可直接视为视频就绪 |`,
  `| 逐镜备用提示词 | ${cuts}/${cuts} |`,
  `| 中文逐段说明与上传顺序 | ${imports.length}/${segments.length} |`,
  `| 全剧故事逻辑审计 | ${storyLogicAudit.summary.reviewed} 项已检查；${storyLogicAudit.summary.fixed} 项已回写修复；${storyLogicAudit.summary.open} 项未解决 |`,
  `| 段间衔接审计 | ${continuityAudit.summary.reviewed}/58 已审计；${continuityAudit.summary.blocked} 个阻断、${continuityAudit.summary.verify} 个待链路验证、${continuityAudit.summary.direct} 个可按现有切点 |`,
  `| 真实 H3 测试视频 | ${realVideos} 条；仅作流程验证，当前不继续生成 |`, "",
  "## 现阶段工作顺序", "",
  "1. 保留现有两个连续视频、图片、提示词和审计记录，作为失败样本与库边界证据。",
  "2. 回到小说原型，重新评审人物欲望、核心矛盾、关键选择、人物弧、伏笔和结局。",
  "3. 在拆分前建立全剧因果图与人物/道具/空间状态时间线。",
  "4. 把小说拆分升级为真正的短剧改编：允许删线、合人、改序、补桥和重写。",
  "5. 先通过文字走查、状态表和低成本静态预演；再只生成 2～3 个连续视频小样。",
  "6. 小样连播通过后，才重新决定是否生成批量图片和视频。", "",
  "## 完成定义", "",
  "当前不存在“可投产完成”的结论。59/59 段、193 张关键帧、59 份段级提示词和 58 个段间状态契约只证明资料生成完整；叙事前置质量门未通过，因此全部归类为实验资料。", "",
  "## 主要入口", "",
  "- `index.html`：主入口和真实进度。",
  "- `storyboard/storyboard-report-zh.html`：全六集中文逐段浏览。",
  "- `offline-production/IMAGE-QC-REPORT.zh-CN.md`：历史图片逐张结论、返工原因与联系表。",
  "- `offline-production/story-logic-audit.html`：人物动机、知识状态、证物首次出现、时间地点与程序响应的全剧审计。",
  "- `offline-production/continuity-audit.html`：58 个相邻接点的尾帧/首帧对照、风险与修复契约。",
  "- `storyboard-full-pack/README.zh-CN.md`：59 段中文索引。",
  "- 每段目录的 `README.zh-CN.md`、`UPLOAD-ORDER.md`、`chatart-prompt.txt`、`frame-prompts/`：投产资料。",
  "- `storyboard-full-pack/chatart-import-manifest.json`：机器可读导入状态。", "",
];

fs.writeFileSync(path.join(root, "PRODUCTION.md"), `${lines.join("\n")}\n`, "utf8");
console.log(`✓ 生产台账：${readyFrames}/${cuts} 张，${qcPassedFrames}/${cuts} 张 QC 通过，${qcReworkFrames} 张需返工，${qcPendingFrames} 张已有图待复核，${readySegments}/${segments.length} 段图片齐全，${semanticReviewedSegments}/${segments.length} 段语义审核，${missingFrames} 张待补`);
