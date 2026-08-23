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
const outputDir = path.join(projectRoot, "browser-evidence", "knowledge-product");
const httpUrl = process.env.DEMO_URL || "http://127.0.0.1:8789/demos/story-to-handdrawn-video/index.html";
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "index.html").replaceAll("\\", "/")}`).href;
const expectedMediaCount = 12;
const expectedNoScriptMediaCount = 10;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspect(url, viewport, label, reducedMotion = "no-preference") {
  const page = await browser.newPage({ viewport, reducedMotion });
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#knowledge-plan[data-recipe]", { state: "attached" });
  await page.waitForTimeout(700);

  const initial = await page.evaluate(() => ({
    hero: document.querySelector(".lab-hero h1")?.textContent.replace(/\s+/g, " ").trim(),
    topic: document.querySelector("#knowledge-topic")?.value,
    planTitle: document.querySelector("#knowledge-plan-title")?.textContent,
    recipe: document.querySelector("#knowledge-plan")?.dataset.recipe,
    beats: document.querySelectorAll("[data-knowledge-beat]").length,
    questions: document.querySelectorAll(".knowledge-question").length,
    boundaries: document.querySelectorAll(".knowledge-boundary-grid article").length,
    recipes: document.querySelectorAll("[data-director-story]").length,
    videos: [...document.querySelectorAll("video")].map((video) => ({ id: video.id, preload: video.preload })),
    mp4Entries: performance.getEntriesByType("resource").filter((entry) => entry.name.includes(".mp4")).map((entry) => ({ transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(initial.hero.includes("复杂知识") && initial.hero.includes("真正能懂"), `${label}: product value is not the hero focus`);
  assert(initial.topic.includes("天空") && initial.planTitle.includes("天空"), `${label}: default science brief is not synchronized`);
  assert(initial.recipe === "knowledge", `${label}: science preset should recommend knowledge, got ${initial.recipe}`);
  assert(initial.beats === 5 && initial.questions === 3 && initial.boundaries === 4, `${label}: product artifacts are incomplete`);
  assert(initial.recipes === 8 && initial.videos.length === expectedMediaCount && initial.videos.every((video) => video.preload === "metadata"), `${label}: recipe/media coverage regressed`);
  if (url.startsWith("http")) {
    assert(initial.mp4Entries.length === expectedMediaCount, `${label}: expected ${expectedMediaCount} MP4 metadata requests`);
    assert(initial.mp4Entries.every((entry) => entry.transferSize <= 2048 && entry.encodedBodySize <= 2048), `${label}: an MP4 was fully preloaded`);
  }
  assert(initial.overflow <= 1, `${label}: initial horizontal overflow ${initial.overflow}px`);

  if (label === "desktop-http") await page.screenshot({ path: path.join(outputDir, "desktop-hero.png"), fullPage: false });
  if (label === "mobile-http") await page.screenshot({ path: path.join(outputDir, "mobile-hero.png"), fullPage: false });
  await page.locator("#knowledge-studio").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  if (label === "desktop-http") await page.screenshot({ path: path.join(outputDir, "desktop-workspace.png"), fullPage: false });
  if (label === "mobile-http") await page.screenshot({ path: path.join(outputDir, "mobile-workspace.png"), fullPage: false });

  await page.click('[data-knowledge-preset="culture"]');
  const culture = await page.evaluate(() => ({ topic: document.querySelector("#knowledge-topic")?.value, recipe: document.querySelector("#knowledge-plan")?.dataset.recipe, beats: document.querySelectorAll("[data-knowledge-beat]").length }));
  assert(culture.topic.includes("枫桥夜泊") && culture.recipe === "classical" && culture.beats === 5, `${label}: culture preset failed`);

  await page.focus('[data-knowledge-beat="0"]');
  await page.keyboard.press("ArrowRight");
  assert(await page.locator('[data-knowledge-beat="1"]').getAttribute("aria-selected") === "true", `${label}: beat keyboard navigation failed`);
  await page.focus('[data-knowledge-view="story"]');
  await page.keyboard.press("ArrowRight");
  assert(await page.locator('[data-knowledge-view="trust"]').getAttribute("aria-selected") === "true", `${label}: output keyboard navigation failed`);
  assert(!(await page.locator("#knowledge-trust-panel").isHidden()), `${label}: trust panel did not open`);

  await page.click('[data-knowledge-view="check"]');
  await page.click('[data-knowledge-answer="0"]');
  assert(await page.locator('[data-knowledge-answer="0"]').getAttribute("aria-expanded") === "true", `${label}: answer disclosure failed`);
  assert(!(await page.locator("#knowledge-answer-0").isHidden()), `${label}: answer remained hidden`);

  await page.fill("#knowledge-topic", "");
  await page.fill("#knowledge-objective", "");
  await page.fill("#knowledge-evidence", "");
  await page.click(".knowledge-generate");
  assert(!(await page.locator("#knowledge-form-error").isHidden()), `${label}: required-field error was not shown`);
  assert(await page.evaluate(() => document.activeElement?.id) === "knowledge-topic", `${label}: invalid form did not focus first field`);

  await page.click('[data-knowledge-preset="system"]');
  assert(await page.locator("#knowledge-plan").getAttribute("data-recipe") === "technology", `${label}: system preset should recommend technology`);
  const downloadPromise = page.waitForEvent("download");
  await page.click("#knowledge-download");
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const packageData = JSON.parse(await fs.readFile(downloadPath, "utf8"));
  assert(packageData.schema === "knowledge-video-plan/v1" && packageData.beats.length === 5 && packageData.questions.length === 3 && packageData.ranking.length === 8, `${label}: downloaded production package is incomplete`);

  await page.click("#knowledge-open-recipe");
  await page.waitForTimeout(reducedMotion === "reduce" ? 40 : 520);
  const routed = await page.evaluate(() => ({
    selected: document.querySelector('[data-director-story][aria-selected="true"]')?.dataset.directorStory,
    outputHidden: document.querySelector("#technology-real-output")?.hidden,
    focused: document.activeElement?.id,
    powerState: document.querySelector("#power-experience")?.dataset.powerState,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(routed.selected === "technology" && !routed.outputHidden && routed.focused === "technology-real-output", `${label}: real-media route failed`);
  assert(routed.powerState === "powered", `${label}: technology experience did not preserve its baseline`);
  assert(routed.overflow <= 1, `${label}: final horizontal overflow ${routed.overflow}px`);

  await page.close();
  return { label, url, viewport, reducedMotion, initial, culture, routed };
}

async function inspectNoScript() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await page.goto(httpUrl, { waitUntil: "domcontentloaded" });
  const fallback = await page.evaluate(() => ({
    productText: document.querySelector(".knowledge-noscript")?.textContent,
    mediaLinks: document.querySelectorAll('.director-noscript a[href*=".mp4"]').length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(fallback.productText.includes("知识视频应先明确受众"), "no-script: product method is missing");
  assert(fallback.mediaLinks === expectedNoScriptMediaCount, `no-script: expected ${expectedNoScriptMediaCount} direct media links, got ${fallback.mediaLinks}`);
  assert(fallback.overflow <= 1, `no-script: horizontal overflow ${fallback.overflow}px`);
  await page.close();
  return { label: "mobile-no-script", url: httpUrl, viewport: { width: 390, height: 844 }, fallback };
}

const results = [];
try {
  results.push(await inspect(httpUrl, { width: 1440, height: 1000 }, "desktop-http"));
  results.push(await inspect(httpUrl, { width: 768, height: 1024 }, "tablet-http"));
  results.push(await inspect(httpUrl, { width: 390, height: 844 }, "mobile-http"));
  results.push(await inspect(fileUrl, { width: 1280, height: 900 }, "desktop-file"));
  results.push(await inspect(httpUrl, { width: 390, height: 844 }, "mobile-reduced", "reduce"));
  results.push(await inspectNoScript());
} catch (error) {
  errors.push(error.stack || error.message);
}

await browser.close();
const report = { passed: errors.length === 0, checkedAt: new Date().toISOString(), errors, results };
await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
