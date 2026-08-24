import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] ?? ".");
const outputRoot = path.resolve(process.argv[3] ?? ".tmp/shuohao-release-metadata");
const roots = [
  path.join(sourceRoot, "projects", "shuohao-skills"),
  path.join(sourceRoot, "docs", "demos", "shuohao-skills"),
];
const textExtensions = new Set([
  ".css", ".csv", ".html", ".js", ".json", ".md", ".mjs", ".ps1", ".py", ".srt", ".svg", ".txt", ".yml", ".yaml",
]);
const secretPatterns = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github-token", /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/],
  ["openai-token", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["authorization-bearer", /\bBearer\s+[A-Za-z0-9._-]{24,}\b/i],
];

const slash = (value) => value.split(path.sep).join("/");
const relative = (value) => slash(path.relative(sourceRoot, value));

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

await mkdir(outputRoot, { recursive: true });
const files = (await Promise.all(roots.map(walk))).flat().sort();
const inventory = [];
const secretFindings = [];
const privacyPaths = [];
let totalBytes = 0;

for (const file of files) {
  const buffer = await readFile(file);
  const bytes = buffer.length;
  totalBytes += bytes;
  inventory.push({
    path: relative(file),
    bytes,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const text = buffer.toString("utf8");
  for (const [kind, pattern] of secretPatterns) {
    if (pattern.test(text)) secretFindings.push({ path: relative(file), kind });
  }
  if (/[A-Za-z]:\\Users\\[^\\\s]+/i.test(text)) privacyPaths.push(relative(file));
}

const csv = ["path,bytes,sha256"];
for (const item of inventory) {
  csv.push(`"${item.path.replaceAll('"', '""')}",${item.bytes},${item.sha256}`);
}
await writeFile(path.join(outputRoot, "FULL-ARCHIVE-INVENTORY.csv"), `${csv.join("\n")}\n`, "utf8");

const summary = {
  schemaVersion: 1,
  archiveDate: "2026-08-24",
  sourceRoots: roots.map(relative),
  files: inventory.length,
  bytes: totalBytes,
  sha256Inventory: "FULL-ARCHIVE-INVENTORY.csv",
  secretFindings: secretFindings.length,
  textFilesWithLocalUserPaths: [...new Set(privacyPaths)].length,
};
await writeFile(path.join(outputRoot, "FULL-ARCHIVE-SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(path.join(outputRoot, "SECRET-SCAN.json"), `${JSON.stringify({ secretFindings, privacyPaths: [...new Set(privacyPaths)] }, null, 2)}\n`, "utf8");

const readme = `# shuohao-skills /《潮痕》完整工作区快照

归档日期：2026-08-24

此压缩包保存研究时的完整本地工作区，包括：

- \`projects/shuohao-skills/\`：研究源码、全部网页、结构化资料、脚本、候选图、QC 联系表、静态预演、提示词和生产包；
- \`docs/demos/shuohao-skills/\`：公开演示及当时准备的页面媒体；
- \`archive-metadata/\`：逐文件 SHA-256、体积清单和敏感信息扫描结果。

文件数：${inventory.length}  
未压缩体积：${(totalBytes / 1024 / 1024).toFixed(2)} MB  
疑似密钥扫描命中：${secretFindings.length}  
含本机用户路径的文本文件：${[...new Set(privacyPaths)].length}

本快照用于研究复盘和灾难恢复，不代表《潮痕》达到视频投产标准。权威研究结论见仓库中的 \`projects/shuohao-skills/RESEARCH-SUMMARY.zh-CN.md\`。
`;
await writeFile(path.join(outputRoot, "README.zh-CN.md"), readme, "utf8");
console.log(JSON.stringify(summary));
if (secretFindings.length > 0) process.exit(2);
