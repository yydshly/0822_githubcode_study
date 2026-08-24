#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const reviewedIds = new Set(Array.from({ length: 10 }, (_, index) => `E02-${String(index + 1).padStart(2, "0")}`));
const replacements = {
  "E02-02": [["bright strained voice (S3)", "bright strained voice (S5)"]],
};

let reviewed = 0;
let changed = 0;
for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    if (!reviewedIds.has(segment.id)) continue;
    for (const [before, after] of replacements[segment.id] || []) {
      if (segment.h3Prompt.includes(before)) {
        segment.h3Prompt = segment.h3Prompt.replace(before, after);
        changed += 1;
      } else if (!segment.h3Prompt.includes(after)) {
        throw new Error(`${segment.id}: 找不到待修正的 H3 片段：${before}`);
      }
    }
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：逐镜动作、出镜人物、画外录音、口型关系、道具连续性和声纹标签已与中文节拍核对。";
    reviewed += 1;
  }
}

if (reviewed !== reviewedIds.size) throw new Error(`仅找到 ${reviewed}/${reviewedIds.size} 个第二集段落`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第二集语义审核：${reviewed} 段；修正 ${changed} 处声纹标签`);
