#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const reportPath = path.join(root, "prompt-semantic-audit.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

const genericActions = [
  "examines and repositions the damaged documentary evidence on a hard surface",
  "holds the tense exchange and reacts to the new claim",
  "operates or listens to the scorched orange radio and its moving cyan waveform",
  "works against the low-tide water and retrieves evidence beside the breakwater",
  "handles the blackened brass key as a decisive piece of evidence",
  "moves urgently through",
  "makes a sharp physical move over the contested evidence",
  "advances the investigation through a restrained physical action",
];
const speakerLabels = {
  许知遥: "S1",
  程野: "S2",
  高嵩: "S3",
  许德海: "S4",
  许潮: "S5",
};
const speakerCharacterIds = {
  许知遥: "C01",
  程野: "C02",
  高嵩: "C03",
  许德海: "C04",
  许潮: "C05",
};

function dialogueChecks(segment) {
  return segment.cuts.flatMap((cut, cutIndex) => {
    const checks = [];
    const dialoguePattern = /([^；：]+)：“([^”]+)”/g;
    for (const match of cut.descriptionZh.matchAll(dialoguePattern)) {
      const speaker = match[1].replace(/^.*?动作：/, "").trim();
      const line = match[2].trim();
      const expectedLabel = speakerLabels[speaker];
      if (!expectedLabel) continue;
      const dialogueToken = `<d>[Chinese] ${line}</d>`;
      const position = segment.h3Prompt.indexOf(dialogueToken);
      const context = position >= 0 ? segment.h3Prompt.slice(Math.max(0, position - 280), position) : "";
      const offscreenExpected = !cut.characters.includes(speakerCharacterIds[speaker]);
      checks.push({
        cut: `f${cutIndex + 1}`,
        speaker,
        expectedLabel,
        line,
        dialoguePresent: position >= 0,
        labelPresent: context.includes(`(${expectedLabel})`),
        offscreenExpected,
        offscreenDeclared: !offscreenExpected || /off-screen|recording|speaker|voiceover/i.test(context),
        visibleLipsClosed: !offscreenExpected || /lips?[^.]{0,80}closed|mouths?[^.]{0,80}closed/i.test(context),
      });
    }
    return checks;
  });
}

const records = storyboard.episodes.flatMap((episode) => episode.segments.map((segment) => {
  const genericFrames = segment.cuts.flatMap((cut, index) => genericActions.some((phrase) => cut.frame.includes(phrase)) ? [`f${index + 1}`] : []);
  const genericH3 = genericActions.filter((phrase) => segment.h3Prompt.includes(phrase));
  return {
    id: segment.id,
    episode: episode.ep,
    semanticReviewed: segment.semanticReviewed === true,
    semanticReviewedAt: segment.semanticReviewedAt || null,
    genericFrames,
    genericH3,
    unresolvedToken: segment.h3Prompt.includes("undefined") || segment.h3Prompt.includes("follows only this exact Chinese visual direction"),
    dialogueChecks: dialogueChecks(segment),
  };
}));

const reviewed = records.filter((record) => record.semanticReviewed);
const errors = records.flatMap((record) => {
  const items = [];
  if (record.unresolvedToken) items.push(`${record.id}: 含未解析或实验性占位内容`);
  if (record.semanticReviewed && !record.semanticReviewedAt) items.push(`${record.id}: 已审核但缺少审核日期`);
  if (record.semanticReviewed && (record.genericFrames.length || record.genericH3.length)) items.push(`${record.id}: 已审核但仍含泛化动作模板`);
  if (record.semanticReviewed) {
    for (const check of record.dialogueChecks) {
      if (!check.dialoguePresent) items.push(`${record.id}/${check.cut}: H3 缺少 ${check.speaker} 的完整台词`);
      else if (!check.labelPresent) items.push(`${record.id}/${check.cut}: ${check.speaker} 应使用 ${check.expectedLabel} 声纹标签`);
      if (!check.offscreenDeclared) items.push(`${record.id}/${check.cut}: 录音/画外台词未声明为画外声音`);
      if (!check.visibleLipsClosed) items.push(`${record.id}/${check.cut}: 录音/画外台词未锁定可见人物闭口`);
    }
  }
  return items;
});

const report = {
  generatedAt: new Date().toISOString(),
  policy: "模板生成只建立结构；只有 semanticReviewed=true 且通过本质量门的段落才可进入视频投产。",
  totals: {
    segments: records.length,
    reviewed: reviewed.length,
    unreviewed: records.length - reviewed.length,
    genericFrameCuts: records.reduce((sum, record) => sum + record.genericFrames.length, 0),
    genericH3Segments: records.filter((record) => record.genericH3.length).length,
    unresolvedSegments: records.filter((record) => record.unresolvedToken).length,
  },
  reviewedSegments: reviewed.map((record) => record.id),
  unreviewedSegments: records.filter((record) => !record.semanticReviewed).map((record) => record.id),
  genericTemplateInventory: records.filter((record) => record.genericFrames.length || record.genericH3.length),
  errors,
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (errors.length) {
  console.error(`✗ 提示词语义质量门失败（${errors.length} 项）`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✓ 提示词语义质量门：${reviewed.length}/${records.length} 段已审核；未审核段保留为草稿，不视为可投产`);
console.log(`✓ 泛化模板存量：${report.totals.genericFrameCuts} 个逐镜动作，涉及 ${report.totals.genericH3Segments} 个 H3 段；均未冒充已审核内容`);
