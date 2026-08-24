import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const experimentRoot = path.join(projectRoot, "experiments", "tide-marks");
const outputJson = path.join(projectRoot, "WEB-ARCHIVE-MANIFEST.json");
const outputCsv = path.join(projectRoot, "WEB-ARCHIVE-INVENTORY.csv");
const outputReport = path.join(projectRoot, "WEB-ARCHIVE-REPORT.zh-CN.md");
const excludedNames = new Set([
  "WEB-ARCHIVE-MANIFEST.json",
  "WEB-ARCHIVE-INVENTORY.csv",
  "WEB-ARCHIVE-REPORT.zh-CN.md",
]);

const slash = (value) => value.split(path.sep).join("/");
const relative = (value) => slash(path.relative(projectRoot, value));
const formatMb = (bytes) => (bytes / 1024 / 1024).toFixed(2);

async function walk(directory, options = {}) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || (options.excludeUpstream && directory === projectRoot && entry.name === "upstream")) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute, options)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function replaceInFile(file, replacements) {
  let content = await readFile(file, "utf8");
  let changed = 0;
  for (const [before, after] of replacements) {
    if (content.includes(before)) {
      content = content.replaceAll(before, after);
      changed += 1;
    }
  }
  if (changed) await writeFile(file, content, "utf8");
  return changed;
}

async function repairCompactSnapshotLinks() {
  const snapshot = path.join(
    experimentRoot,
    "archive",
    "2026-08-24-capability-exploration-failure-review",
    "snapshot",
    "offline-production",
  );
  let changed = 0;
  changed += await replaceInFile(path.join(snapshot, "capability-evaluation.html"), [
    ['href="../index.html"', 'href="../../index.html"'],
    ['href="media-demo.html"', 'href="../../../../offline-production/media-demo.html"'],
    ['href="video-production-control.html"', 'href="../../../../offline-production/video-production-control.html"'],
    ['href="../../../upstream/README.md"', 'href="https://github.com/eternityspring/shuohao-skills"'],
  ]);
  changed += await replaceInFile(path.join(snapshot, "continuity-audit.html"), [
    ['href="../index.html"', 'href="../../index.html"'],
    ['href="video-production-control.html"', 'href="../../../../offline-production/video-production-control.html"'],
    ['src="../storyboard-full-pack/', 'src="../../../../storyboard-full-pack/'],
  ]);
  changed += await replaceInFile(path.join(snapshot, "library-exploration-conclusion.html"), [
    ['href="../index.html"', 'href="../../index.html"'],
    ['href="foundational-capability-architecture.html"', 'href="../../../../offline-production/foundational-capability-architecture.html"'],
  ]);
  changed += await replaceInFile(path.join(snapshot, "story-logic-audit.html"), [
    ['href="../index.html#quality"', 'href="../../index.html"'],
    ['href="../storyboard/', 'href="../../../../storyboard/'],
  ]);
  changed += await replaceInFile(path.join(experimentRoot, "offline-production", "capability-evaluation.html"), [
    ['href="../../../upstream/README.md"', 'href="https://github.com/eternityspring/shuohao-skills"'],
  ]);

  const archivedCsv = path.join(snapshot, "continuity-boundary-audit.csv");
  try {
    await stat(archivedCsv);
  } catch {
    await mkdir(path.dirname(archivedCsv), { recursive: true });
    await copyFile(
      path.join(experimentRoot, "offline-production", "continuity-boundary-audit.csv"),
      archivedCsv,
    );
    changed += 1;
  }
  return changed;
}

const hashCache = new Map();
async function describeFile(absolute) {
  if (hashCache.has(absolute)) return hashCache.get(absolute);
  const bytes = (await stat(absolute)).size;
  const sha256 = createHash("sha256").update(await readFile(absolute)).digest("hex");
  const description = { path: relative(absolute), bytes, sha256 };
  hashCache.set(absolute, description);
  return description;
}

function resolveReference(page, rawReference) {
  if (/^(?:https?:|data:|javascript:|mailto:|#)/i.test(rawReference)) return null;
  const withoutFragment = rawReference.split(/[?#]/, 1)[0];
  if (!withoutFragment) return null;
  let decoded = withoutFragment;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    // Preserve a malformed path in the report instead of hiding it.
  }
  const absolute = path.resolve(path.dirname(page), decoded);
  if (absolute !== projectRoot && !absolute.startsWith(`${projectRoot}${path.sep}`)) return null;
  return absolute;
}

function roleFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".html") return "research-page";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return "visual-evidence";
  if ([".mp4", ".webm", ".wav", ".mp3"].includes(ext)) return "media-evidence";
  if ([".json", ".csv"].includes(ext)) return "structured-evidence";
  if ([".md", ".txt", ".srt"].includes(ext)) return "guidance-or-prompt";
  if ([".mjs", ".js", ".py"].includes(ext)) return "reproduction-script";
  return "supporting-file";
}

async function buildManifest(linkRepairCount) {
  const htmlFiles = (await walk(experimentRoot)).filter((file) => file.endsWith(".html")).sort();
  const referencedFiles = new Map();
  const pages = [];

  for (const page of htmlFiles) {
    const html = await readFile(page, "utf8");
    const matches = [...html.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi)];
    const references = [];
    for (const match of matches) {
      const raw = match[2];
      const absolute = resolveReference(page, raw);
      if (!absolute) continue;
      let statusValue = "missing";
      let details = null;
      try {
        const info = await stat(absolute);
        statusValue = info.isFile() ? "ok" : "directory";
        if (info.isFile()) {
          details = await describeFile(absolute);
          referencedFiles.set(details.path, details);
        }
      } catch {
        // Missing references are emitted below and fail verification.
      }
      references.push({ raw, path: relative(absolute), status: statusValue, ...(details ?? {}) });
    }
    pages.push({
      path: relative(page),
      referenceCount: references.length,
      missingCount: references.filter((item) => item.status === "missing").length,
      references,
    });
  }

  const inventoryFiles = (await walk(projectRoot, { excludeUpstream: true }))
    .filter((file) => !excludedNames.has(path.basename(file)))
    .sort();
  const inventory = [];
  for (const file of inventoryFiles) {
    const details = await describeFile(file);
    inventory.push({ ...details, role: roleFor(file) });
  }

  const missing = pages.flatMap((page) =>
    page.references
      .filter((item) => item.status === "missing")
      .map((item) => ({ page: page.path, reference: item.raw, resolvedPath: item.path })),
  );
  const inventoryBytes = inventory.reduce((sum, item) => sum + item.bytes, 0);
  const referencedBytes = [...referencedFiles.values()].reduce((sum, item) => sum + item.bytes, 0);
  const manifest = {
    schemaVersion: 1,
    archiveDate: "2026-08-24",
    project: "shuohao-skills / 潮痕能力探索",
    upstream: {
      repository: "https://github.com/eternityspring/shuohao-skills",
      commit: "0e5eb688ebf1b45e45c9bec31543aaa59e67c7bc",
    },
    pagesBaseUrl: "https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/research/",
    entryPage: "experiments/tide-marks/index.html",
    linkRepairCount,
    summary: {
      htmlPages: pages.length,
      uniqueReferencedFiles: referencedFiles.size,
      referencedBytes,
      inventoryFiles: inventory.length,
      inventoryBytes,
      missingReferences: missing.length,
    },
    pages,
    missing,
  };
  await writeFile(outputJson, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const csv = ["path,bytes,sha256,role"];
  for (const item of inventory) {
    const escaped = `"${item.path.replaceAll('"', '""')}"`;
    csv.push(`${escaped},${item.bytes},${item.sha256},${item.role}`);
  }
  await writeFile(outputCsv, `${csv.join("\n")}\n`, "utf8");

  const pageRows = pages
    .map((page) => `| \`${page.path}\` | ${page.referenceCount} | ${page.missingCount} |`)
    .join("\n");
  const report = `# 《潮痕》远端网页档案校验报告

归档日期：2026-08-24  
在线入口：<https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/research/experiments/tide-marks/>

## 完整性摘要

- 研究网页：${pages.length} 个。
- 网页直接引用的唯一文件：${referencedFiles.size} 个，共 ${formatMb(referencedBytes)} MB。
- 远端研究目录清单：${inventory.length} 个文件，共 ${formatMb(inventoryBytes)} MB（不重复打包上游 submodule）。
- 失效的本地相对引用：${missing.length} 个。
- 对紧凑历史快照执行的链接修复组：${linkRepairCount} 组；只调整路径，不改变研究结论。

## 页面逐项检查

| 页面 | 内部引用 | 失效引用 |
| --- | ---: | ---: |
${pageRows}

## 校验与恢复

1. 使用 \`WEB-ARCHIVE-INVENTORY.csv\` 核对每个文件的字节数与 SHA-256。
2. 使用 \`WEB-ARCHIVE-MANIFEST.json\` 查看每个网页引用的具体资源及解析状态。
3. 执行 \`node scripts/build-web-archive-manifest.mjs --verify\` 重新检查网页依赖；存在失效引用时命令以非零状态退出。
4. 上游源码通过 Git submodule 固定在提交 \`0e5eb688\`，不在清单中重复复制。

## 解释边界

本报告证明“网页与其内部元素已经远端化、可以复核”，不代表《潮痕》已经达到视频投产标准。研究的最终结论仍是：结构化流程验证成功，短剧投产尝试失败，问题需要前移到小说原型、因果关系和改编连续性。
`;
  await writeFile(outputReport, report, "utf8");
  return manifest;
}

const repairCount = await repairCompactSnapshotLinks();
const manifest = await buildManifest(repairCount);
console.log(JSON.stringify(manifest.summary));
if (process.argv.includes("--verify") && manifest.summary.missingReferences > 0) process.exit(1);
