#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const reviewedIds = new Set(["E03-05", "E03-06", "E03-07", "E03-08"]);
const frameUpdates = {
  "E03-05": {
    1: "Cinematic live-action suspense film still, 16:9 extreme close-up at the open old orange-red fire cabinet. The broad-shouldered male diver in dark rain-soaked workwear crouches beside it and uses both wet hands to pull one modest flat oil-paper evidence packet and folded list from a concealed thin compartment behind the lower panel. The brittle wrapping is partly opened to reveal layered water-stained document edges, while the exact large battered orange box-shaped emergency radio rests beside the compartment. His tense recognizable profile appears at the upper edge, only the diver visible, realistic cool grey-green and oxidized orange palette, natural hands, no readable text.",
  },
  "E03-06": {
    1: "Cinematic live-action suspense film still, 16:9 extreme close-up at the wet warehouse worktable. The slim female audio archivist in a navy rain jacket places one heavy old brass boat key beside the opened oil-paper evidence list while the broad-shouldered male diver carefully lifts and rotates the key by its thick oval ring. Two short parallel compression dents are clearly visible on one small section of the ring; her hand withdraws as his hands take control of the key. Both partial faces remain visible and study the dents, exactly two people and one key, realistic cool grey-green light with a warm brass highlight, natural non-overlapping hands, no readable text.",
  },
  "E03-08": {
    3: "Cinematic live-action suspense film still, 16:9 close-up in the audio restoration room while the teenage witness continues only in the recording. The slim female audio archivist and broad-shouldered male diver remain silent with both mouths firmly closed as their attention drops to one recovered old brass boat key lying on the black console beside the scorched orange radio. The key has a thick oval ring, worn dark shaft, forked bit and exactly two irregular pressure dents; her hand stops near it without touching. Only the two adults are visible, no teenage witness or reenactment, no key in any mouth, realistic cool grey-green, cyan and oxidized orange palette, no readable text.",
  },
};

let reviewed = 0;
let changed = 0;
for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    if (!reviewedIds.has(segment.id)) continue;
    for (const [index, prompt] of Object.entries(frameUpdates[segment.id] || {})) {
      segment.cuts[Number(index)].frame = prompt;
      changed += 1;
    }
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：提示词已按实际生成记录、图片 QC、中文节拍、人物/道具连续性、画外录音、口型和声纹标签核对。";
    reviewed += 1;
  }
}

if (reviewed !== reviewedIds.size) throw new Error(`仅找到 ${reviewed}/${reviewedIds.size} 个第三集中段`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第三集中段语义审核：${reviewed} 段；重写 ${changed} 个残留泛化逐镜提示词`);
