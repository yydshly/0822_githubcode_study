#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(experimentDir, "..", "..", "..", "..");
const storyboardDir = path.join(experimentDir, "storyboard");
const manifestPath = path.join(storyboardDir, "manifest.json");
const outputDir = path.join(experimentDir, "animatic");
const concatPath = path.join(outputDir, "tide-marks-episode-01.ffconcat");
const timelinePath = path.join(outputDir, "tide-marks-episode-01-timeline.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const timeline = [];
let episodeCursor = 0;

for (const segment of manifest) {
  if (segment.pictures.length !== segment.cuts || segment.cutStarts.length !== segment.cuts) {
    throw new Error(`${segment.segment}: cuts、cutStarts、pictures 数量不一致`);
  }

  for (let cutIndex = 0; cutIndex < segment.cuts; cutIndex += 1) {
    const localStart = segment.cutStarts[cutIndex];
    const localEnd = cutIndex + 1 < segment.cuts
      ? segment.cutStarts[cutIndex + 1]
      : segment.seconds;
    const duration = Number((localEnd - localStart).toFixed(3));
    const picturePath = path.resolve(repositoryRoot, segment.pictures[cutIndex]);

    if (duration <= 0) {
      throw new Error(`${segment.segment} f${cutIndex + 1}: 非法时长 ${duration}`);
    }
    if (!fs.existsSync(picturePath)) {
      throw new Error(`${segment.segment} f${cutIndex + 1}: 缺图 ${picturePath}`);
    }

    timeline.push({
      index: timeline.length + 1,
      segment: segment.segment,
      frame: `f${cutIndex + 1}`,
      episodeStart: Number((episodeCursor + localStart).toFixed(3)),
      duration,
      picture: picturePath,
      prompt: path.resolve(repositoryRoot, segment.prompt),
    });
  }

  episodeCursor += segment.seconds;
}

fs.mkdirSync(outputDir, { recursive: true });

const quoteForConcat = (value) => value
  .replaceAll("\\", "/")
  .replaceAll("'", "'\\''");

const concatLines = ["ffconcat version 1.0"];
for (const shot of timeline) {
  concatLines.push(`file '${quoteForConcat(shot.picture)}'`);
  concatLines.push(`duration ${shot.duration.toFixed(3)}`);
}
concatLines.push(`file '${quoteForConcat(timeline.at(-1).picture)}'`);

fs.writeFileSync(concatPath, `${concatLines.join("\n")}\n`, "utf8");
fs.writeFileSync(
  timelinePath,
  `${JSON.stringify({
    title: "潮痕 · 第 1 集动态分镜",
    kind: "silent-animatic",
    source: "shuohao-skills storyboard manifest",
    segments: manifest.length,
    shots: timeline.length,
    seconds: Number(episodeCursor.toFixed(3)),
    timeline,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`✓ ${manifest.length} 段 / ${timeline.length} 镜 / ${episodeCursor.toFixed(1)} 秒`);
console.log(`  concat: ${concatPath}`);
console.log(`  timeline: ${timelinePath}`);
