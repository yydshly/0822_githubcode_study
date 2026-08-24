#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const sizePhrase = {
  "extreme-wide": "extreme wide shot",
  wide: "wide shot",
  medium: "medium shot",
  close: "close-up",
  "extreme-close": "extreme close-up",
};

let styleFixes = 0;
let sizeFixes = 0;
let cameraFixes = 0;

for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    for (const cut of segment.cuts) {
      let frame = String(cut.frame || "").trim();
      const originalFrame = frame;
      frame = frame
        .replace(/^Cinematic live-action suspense film still,/i, "Cinematic film still, live-action suspense,")
        .replace(/^Cinematic live-action film still,/i, "Cinematic film still, live-action,");
      if (!/cinematic film still/i.test(frame)) frame = `Cinematic film still, live-action suspense, ${frame}`;
      if (frame !== originalFrame) styleFixes += 1;

      const requiredSize = sizePhrase[cut.size];
      if (requiredSize && !frame.toLowerCase().includes(requiredSize)) {
        frame = frame.replace(/^Cinematic film still,/i, `Cinematic film still, ${requiredSize},`);
        sizeFixes += 1;
      }
      cut.frame = frame;
    }

    const lines = String(segment.h3Prompt || "").split("\n");
    segment.cuts.forEach((cut, index) => {
      const prefix = `[Shot ${index + 1}]`;
      const lineIndex = lines.findIndex((line) => line.startsWith(prefix));
      if (lineIndex < 0) throw new Error(`${segment.id}: H3 缺少 ${prefix}`);
      const camera = String(cut.camera || "").toLowerCase();
      if (camera && !lines[lineIndex].toLowerCase().includes(camera)) {
        lines[lineIndex] = `${lines[lineIndex].trimEnd()} The camera uses a ${camera}.`;
        cameraFixes += 1;
      }
    });
    segment.h3Prompt = lines.join("\n");
  }
}

fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 分镜质量门规范化：风格 ${styleFixes}、景别 ${sizeFixes}、H3 运镜 ${cameraFixes} 处；语义内容未改写`);

