import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const require = createRequire(import.meta.url);
const nodeModules = process.env.CODEX_NODE_MODULES;
const { chromium } = nodeModules ? require(path.join(nodeModules, "playwright")) : require("playwright");
const edgePath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = path.join(projectRoot, "browser-evidence", "ai-energy-sample");
const httpUrl = process.env.STUDIO_URL || "http://127.0.0.1:8791/demos/story-to-handdrawn-video/studio.html";
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "studio.html").replaceAll("\\", "/")}#ai-energy`).href;

function assert(condition, message) { if (!condition) throw new Error(message); }
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const results = [];
const browserErrors = [];

async function inspect(url, viewport, label, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => browserErrors.push(`${label}:page:${error.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.click("#run-ai-pipeline");
  await page.waitForFunction(() => document.querySelector("#job-status")?.textContent.includes("真实混合样例复现"), null, { timeout: 15000 });

  const observation = await page.evaluate(() => ({
    topic: document.querySelector("#project-title")?.textContent,
    visibleStage: [...document.querySelectorAll("[data-stage]")].find((node) => !node.hidden)?.dataset.stage,
    completedPipelineSteps: document.querySelectorAll('[data-pipeline-step][data-status="complete"]').length,
    completedWorkflowSteps: document.querySelectorAll('[data-stage-button][data-complete="true"]').length,
    finalImages: [...document.querySelectorAll(".scene-card img")].filter((image) => image.getAttribute("src")?.includes("ai-energy-demo")).length,
    codexLabels: [...document.querySelectorAll(".scene-card__state span")].filter((node) => node.textContent.includes("Codex")).length,
    audio: document.querySelector("#studio-audio")?.getAttribute("src"),
    video: document.querySelector("#composition-source")?.getAttribute("src"),
    manifest: document.querySelector("#output-manifest")?.getAttribute("href"),
    quality: document.querySelector("#quality-title")?.textContent,
    status: document.querySelector("#job-status")?.textContent,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(observation.topic === "为什么 AI 那么耗电？", `${label}: wrong sample topic`);
  assert(observation.visibleStage === "delivery", `${label}: pipeline did not reach delivery`);
  assert(observation.completedPipelineSteps === 6, `${label}: expected six completed runner steps`);
  assert(observation.completedWorkflowSteps === 6, `${label}: expected six completed workflow steps`);
  assert(observation.finalImages === 5 && observation.codexLabels === 5, `${label}: final Codex visual layer is incomplete`);
  assert(observation.audio?.includes("ai-energy-demo/narration.wav"), `${label}: MiniMax narration is not connected`);
  assert(observation.video?.includes("ai-energy-demo/why-ai-uses-electricity.mp4"), `${label}: final video is not connected`);
  assert(observation.manifest?.includes("ai-energy-demo/project.json"), `${label}: provenance manifest is not connected`);
  assert(observation.quality.includes("人工复核"), `${label}: curated quality gate is not explicit`);
  assert(observation.status.includes("未重复调用 API"), `${label}: replay boundary is not explicit`);
  assert(observation.overflow <= 1, `${label}: horizontal overflow ${observation.overflow}px`);
  await page.waitForTimeout(2900);
  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  results.push({ label, url, viewport, reducedMotion, ...observation });
  await context.close();
}

async function inspectResearchSample() {
  const label = "research-sample";
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => browserErrors.push(`${label}:page:${error.message}`));
  const researchUrl = httpUrl.replace("studio.html", "index.html");
  await page.goto(researchUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#ai-energy-demo-video");
  assert((await page.locator('[data-ai-energy-time]').count()) === 5, `${label}: expected five scene beats`);
  await page.click('[data-ai-energy-time="49.637"]');
  const observation = await page.evaluate(() => ({
    title: document.querySelector("#latest-generation-title")?.textContent.replace(/\s+/g, " ").trim(),
    currentTime: document.querySelector("#ai-energy-demo-video")?.currentTime,
    studioHref: document.querySelector('a[href="./studio.html#ai-energy"]')?.getAttribute("href"),
    manifestHref: document.querySelector('a[href="./assets/ai-energy-demo/project.json"]')?.getAttribute("href"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(Math.abs(observation.currentTime - 49.637) < 0.2, `${label}: timeline seek failed`);
  assert(observation.studioHref === "./studio.html#ai-energy", `${label}: full-flow CTA is missing`);
  assert(observation.manifestHref?.includes("project.json"), `${label}: provenance CTA is missing`);
  assert(observation.overflow <= 1, `${label}: horizontal overflow ${observation.overflow}px`);
  await page.locator("#latest-generation").screenshot({ path: path.join(outputDir, `${label}.png`) });
  results.push({ label, url: researchUrl, ...observation });
  await context.close();
}

try {
  await inspect(`${httpUrl}#ai-energy`, { width: 1440, height: 1000 }, "desktop-http");
  await inspect(`${httpUrl}#ai-energy`, { width: 390, height: 844 }, "mobile-http-reduced", "reduce");
  await inspect(fileUrl, { width: 1280, height: 900 }, "desktop-file");
  await inspectResearchSample();
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(" | ")}`);
  const report = { checkedAt: new Date().toISOString(), httpUrl, fileUrl, results, browserErrors };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
