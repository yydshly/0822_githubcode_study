#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.join(root, "..", "..", "upstream", "skills");
const tool = path.join(skillsRoot, "novel-storyboard", "scripts", "novel-storyboard.mjs");
const storyboardDir = path.join(root, "storyboard");
const storyboard = path.join(storyboardDir, "潮痕-storyboard.json");
const script = path.join(root, "script", "潮痕-script.json");
const outline = path.join(root, "outline", "潮痕-outline.json");
const art = path.join(root, "art", "潮痕-art.json");
const cast = path.join(root, "characters", "潮痕-cast.json");
const source = path.join(root, "source.txt");
const pack = path.join(root, "storyboard-full-pack");

function run(args, capture = false) {
  const result = spawnSync(process.execPath, [tool, ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed: ${args.join(" ")}`);
  if (!capture && result.stdout.trim()) console.log(result.stdout.trim());
  return result.stdout;
}

function runLocal(file, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, file), ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed: ${file}`);
  if (result.stdout.trim()) console.log(result.stdout.trim());
}

function runNative(skill, args = []) {
  const executable = path.join(skillsRoot, skill, "scripts", `${skill}.mjs`);
  const result = spawnSync(process.execPath, [executable, ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed native validation: ${skill}`);
  if (result.stdout.trim()) console.log(result.stdout.trim());
}

runLocal("apply-story-logic-repairs.mjs");
runNative("novel-outline", ["validate", outline]);
runNative("novel-characters", ["validate", cast, source, "--lang", "zh"]);
runNative("novel-art", ["validate", art, "--cast", cast]);
runNative("novel-script", ["validate", script, "--outline", outline, "--art", art]);
runNative("novel-storyboard", ["validate", storyboard, "--script", script, "--outline", outline, "--cast", cast, "--art", art, "--no-log"]);
runLocal("normalize-storyboard-quality-gate.mjs");
runLocal("audit-storyboard-prompt-semantics.mjs");
const md = run(["render", storyboard, "--md", "--script", script, "--outline", outline, "--art", art, "--lang", "zh"], true);
const html = run(["render", storyboard, "--html", "--script", script, "--outline", outline, "--art", art, "--lang", "zh"], true);
fs.writeFileSync(path.join(storyboardDir, "潮痕-storyboard.md"), md, "utf8");
fs.writeFileSync(path.join(storyboardDir, "storyboard-report.html"), html, "utf8");

run(["export", storyboard, "--script", script, "--out", pack]);

const frameSources = [storyboardDir, path.join(root, "storyboard-ep2-pack")];
for (const sourceRoot of frameSources) {
  if (!fs.existsSync(sourceRoot)) continue;
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^E\d{2}-\d{2}$/.test(entry.name)) continue;
    const sourceDir = path.join(sourceRoot, entry.name);
    const targetDir = path.join(pack, entry.name);
    fs.mkdirSync(targetDir, { recursive: true });
    for (const file of fs.readdirSync(sourceDir)) {
      if (!/^f\d+\.png$/i.test(file)) continue;
      const target = path.join(targetDir, file);
      if (!fs.existsSync(target)) fs.copyFileSync(path.join(sourceDir, file), target);
    }
  }
}

run(["export", storyboard, "--script", script, "--out", pack]);
runLocal("prepare-chatart-imports.mjs");
runLocal("build-chinese-production-guide.mjs", ["--skip-downstream"]);
runLocal("build-offline-production.mjs");
runLocal("build-continuity-audit.mjs");
runLocal("build-story-logic-audit.mjs");
runLocal("build-video-production-control.mjs");
runLocal("build-production-status.mjs");
runLocal("build-capability-evaluation.mjs");
runLocal("build-foundational-capabilities.mjs");
runLocal("build-exploration-conclusion.mjs");
runLocal("restore-demo-media.mjs");
runLocal("build-production-hub.mjs");
runLocal("build-research-archive.mjs");
runLocal("verify-production-state.mjs");
console.log(`✓ Markdown: ${path.join(storyboardDir, "潮痕-storyboard.md")}`);
console.log(`✓ HTML: ${path.join(storyboardDir, "storyboard-report.html")}`);
console.log(`✓ Full pack: ${pack}`);
