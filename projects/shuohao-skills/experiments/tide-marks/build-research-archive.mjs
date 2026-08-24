#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const archiveRoot = path.join(root, "archive", "2026-08-24-capability-exploration-failure-review");
const snapshotRoot = path.join(archiveRoot, "snapshot");
const manifestPath = path.join(archiveRoot, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (existing.revision === 2) {
    console.log(`✓ 研究归档已存在，保持冻结：${archiveRoot}`);
    process.exit(0);
  }
  console.log(`↻ 将失败复盘归档升级为修正版 revision 2：${archiveRoot}`);
}

const artifacts = [
  ["创作源", "outline/潮痕-outline.json"],
  ["创作源", "characters/潮痕-cast.json"],
  ["创作源", "art/潮痕-art.json"],
  ["创作源", "script/潮痕-script.json"],
  ["创作源", "storyboard/潮痕-storyboard.json"],
  ["架构结论", "FOUNDATIONAL-CAPABILITIES.zh-CN.md"],
  ["最终结论", "LIBRARY-EXPLORATION-CONCLUSION.zh-CN.md"],
  ["最终结论", "offline-production/library-exploration-conclusion.json"],
  ["最终结论", "offline-production/library-exploration-conclusion.html"],
  ["能力评估", "offline-production/CAPABILITY-EVALUATION.zh-CN.md"],
  ["能力评估", "offline-production/capability-evaluation.html"],
  ["逻辑审计", "offline-production/STORY-LOGIC-AUDIT.zh-CN.md"],
  ["逻辑审计", "offline-production/story-logic-audit.json"],
  ["逻辑审计", "offline-production/story-logic-audit.html"],
  ["衔接审计", "offline-production/CONTINUITY-AUDIT.zh-CN.md"],
  ["衔接审计", "offline-production/continuity-boundary-audit.json"],
  ["衔接审计", "offline-production/continuity-audit.html"],
  ["生产状态", "offline-production/video-production-control.json"],
  ["生产状态", "offline-production/video-production-tracker.csv"],
  ["生产状态", "PRODUCTION.md"],
  ["生产状态", "production-hub-data.json"],
  ["策略", "continuity-audit-policy.json"],
  ["策略", "story-logic-audit.json"],
  ["策略", "frame-qc-overrides.json"],
];
const videoRefs = [
  ["真实H3-失败样本", "generated-videos/E01-01/E01-01-v01.mp4", "需返工"],
  ["真实H3-待检候选", "generated-videos/E01-02/E01-02-v01.mp4", "待质检"],
  ["真实H3-历史演示", "storyboard-ep2-pack/E02-01/e02-01-generated-chatart-h3-768p.mp4", "待正式标准复核"],
  ["静态预演", "animatic/tide-marks-episode-01-silent-animatic.mp4", "非视频模型成片"],
];
const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const entries = [];
fs.mkdirSync(snapshotRoot, { recursive: true });
for (const [category, relative] of artifacts) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) throw new Error(`归档源文件缺失：${relative}`);
  const target = path.join(snapshotRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const stat = fs.statSync(target);
  entries.push({ category, source: relative.replaceAll("\\", "/"), snapshot: path.relative(archiveRoot, target).replaceAll("\\", "/"), bytes: stat.size, sha256: digest(target) });
}
const videos = videoRefs.map(([category, relative, status]) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return { category, source: relative, status, exists: false };
  const stat = fs.statSync(file);
  return { category, source: relative, status, exists: true, bytes: stat.size, sha256: digest(file), copied: false };
});
const manifest = {
  archiveId: "tide-marks-capability-exploration-failure-review-2026-08-24",
  revision: 2,
  frozenAt: new Date().toISOString(),
  phase: "库能力探索完成；短剧投产尝试未通过叙事前置质量门；停止扩大视频生成",
  supersedes: "archive/2026-08-24-capability-exploration（旧版把资料齐全误写为预生产完成）",
  summary: { episodes: 6, segments: 59, cuts: 193, inventoryStatus: "实验资料", narrativeGatePassed: false, productionDecision: "stop-video-generation", realVideoSegments: 3, acceptedVideoSegments: 0, logicIssuesFixedAfterGeneration: 11, continuityBoundariesReviewedAfterGeneration: 58 },
  policy: "文本、JSON 和报告复制进 snapshot 并记录 SHA-256；大体积视频不重复复制，只记录原路径、状态和 SHA-256。归档生成后默认冻结。",
  entries,
  videos,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const readme = `# 《潮痕》能力探索归档

- 归档 ID：${manifest.archiveId}
- 阶段定义：${manifest.phase}
- 实验资料：6 集、59 段、193 镜；不可直接投产
- 真实视频模型样本：3/59
- 正式 QC 采用：0/59
- 叙事前置质量门：未通过
- 视频生产决策：停止扩大生成
- 事后审计：11 项逻辑修复、58 个边界检查；不能反向证明小说与改编合格

## 归档目的

固定本轮对 shuohao-skills 的能力边界和《潮痕》失败尝试的最终结论：库探索成功，但短剧投产失败。两个连续视频暴露了人物目标、空间位置和动作因果回退；继续生成剩余视频没有性价比。

本归档取代早期的 \`archive/2026-08-24-capability-exploration\`。旧归档保留为过程证据，但其中“故事预生产探索完成”的判断已被纠正。

## 内容

- \`snapshot/\`：创作源 JSON、能力评估、基础架构、逻辑/衔接审计与生产状态的冻结副本。
- \`manifest.json\`：每个归档文件的大小和 SHA-256；三条真实 H3 视频与一条静态预演只记录引用和哈希，不复制大文件。

## 后续继续工作的起点

从小说原型评审、全剧因果图、状态时间线和小说到短剧的改编方法重新开始。前置质量门通过前，不继续生成视频。
`;
fs.writeFileSync(path.join(archiveRoot, "README.zh-CN.md"), readme, "utf8");
const index = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>《潮痕》能力探索归档</title><style>body{margin:0;background:#081017;color:#edf5f8;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:940px;margin:auto;padding:48px 22px}section{background:#111d27;border:1px solid #294050;border-radius:16px;padding:24px;margin:18px 0}a{color:#54dae8}p,li{color:#9fb5c3}.k{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.k div{padding:13px;background:#0c1821;border-radius:10px}.k b{font-size:24px;display:block}@media(max-width:700px){.k{grid-template-columns:1fr 1fr}}</style></head><body><main><a href="../../index.html">← 返回主入口</a><section><p>冻结归档 · 2026-08-24</p><h1>《潮痕》能力探索归档</h1><p>${manifest.phase}</p><div class="k"><div><small>分段</small><b>59</b></div><div><small>分镜</small><b>193</b></div><div><small>真实视频</small><b>3</b></div><div><small>正式采用</small><b>0</b></div></div></section><section><h2>归档结论</h2><p>shuohao-skills 是可验证的短剧预生产框架，不是小说作者或自动成片系统。好视频还需要好故事创作、因果状态建模、故事到视觉的编译、真实视频 QC 反馈和最终组装。</p><ul><li><a href="snapshot/offline-production/capability-evaluation.html">能力归属与最终评估</a></li><li><a href="snapshot/offline-production/story-logic-audit.html">故事逻辑审计</a></li><li><a href="snapshot/offline-production/continuity-audit.html">段间衔接审计</a></li><li><a href="manifest.json">归档清单与 SHA-256</a></li></ul></section></main></body></html>`;
const correctedIndex = index
  .replaceAll("《潮痕》能力探索归档", "《潮痕》能力探索失败复盘归档")
  .replace("shuohao-skills 是可验证的短剧预生产框架，不是小说作者或自动成片系统。好视频还需要好故事创作、因果状态建模、故事到视觉的编译、真实视频 QC 反馈和最终组装。", "shuohao-skills 能把已有小说组织成结构化改编资料，但不保证小说质量、因果推进或改编连续性。《潮痕》的两个连续视频已经触发停止条件：库探索成功，短剧投产失败，现有 59 段和 193 镜只作为实验资料。")
  .replace(`<ul>`, `<ul><li><a href="snapshot/offline-production/library-exploration-conclusion.html">失败复盘与停止决策</a></li>`);
fs.writeFileSync(path.join(archiveRoot, "index.html"), correctedIndex, "utf8");
console.log(`✓ 研究归档已冻结：${entries.length} 个快照文件，${videos.filter((item) => item.exists).length} 个媒体引用`);
