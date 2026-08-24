#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const reviewedIds = new Set(Array.from({ length: 10 }, (_, index) => `E01-${String(index + 1).padStart(2, "0")}`));
const replacements = {
  "E01-03": [["as she says: <d>[Chinese] 这不是电流声。</d>", "as the young woman (S1) says: <d>[Chinese] 这不是电流声。</d>"]],
  "E01-05": [["as she says quietly: <d>[Chinese] 潮声太满，人声在下面。</d>", "as the young technician (S1) says quietly: <d>[Chinese] 潮声太满，人声在下面。</d>"]],
  "E01-06": [["breathless adolescent male voice (S2)", "breathless adolescent male voice (S5)"]],
  "E01-07": [
    ["as she asks: <d>[Chinese] 哥，是你吗？</d>", "as the young woman (S1) asks: <d>[Chinese] 哥，是你吗？</d>"],
    ["breathless adolescent male voice (S2)", "breathless adolescent male voice (S5)"],
  ],
  "E01-08": [
    ["as she says: <d>[Chinese] 再说一遍。</d>", "as the young technician (S1) says: <d>[Chinese] 再说一遍。</d>"],
    ["breathless adolescent male voice (S2)", "breathless adolescent male voice (S5)"],
  ],
  "E01-09": [
    ["as she looks toward the old signed document and says: <d>[Chinese] 责任书上写的是爸。</d>", "as the young woman (S1) looks toward the old signed document and says: <d>[Chinese] 责任书上写的是爸。</d>"],
    ["as she asks: <d>[Chinese] 你们谁在撒谎？</d>", "as the young woman (S1) asks: <d>[Chinese] 你们谁在撒谎？</d>"],
  ],
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

if (reviewed !== reviewedIds.size) throw new Error(`仅找到 ${reviewed}/${reviewedIds.size} 个第一集段落`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第一集语义审核：${reviewed} 段；修正 ${changed} 处声纹标签/身份声明`);
