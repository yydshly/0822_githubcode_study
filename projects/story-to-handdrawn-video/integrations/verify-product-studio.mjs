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
const outputDir = path.join(projectRoot, "browser-evidence", "product-studio");
const httpUrl = process.env.STUDIO_URL || "http://127.0.0.1:8765/demos/story-to-handdrawn-video/studio.html";
const researchUrl = httpUrl.replace("studio.html", "index.html");
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "studio.html").replaceAll("\\", "/")}`).href;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createPage(viewport, label, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  return { context, page };
}

async function inspectInitial(url, viewport, label, reducedMotion = "no-preference") {
  const { context, page } = await createPage(viewport, label, reducedMotion);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-stage="brief"]:not([hidden])');
  const observation = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim(),
    stageButtons: document.querySelectorAll("[data-stage-button]").length,
    visibleStages: [...document.querySelectorAll("[data-stage]")].filter((node) => !node.hidden).map((node) => node.dataset.stage),
    service: document.querySelector("#service-label")?.textContent,
    researchHref: document.querySelector(".studio-brand")?.getAttribute("href"),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    minControlHeight: Math.min(...[...document.querySelectorAll("button")].filter((node) => node.offsetParent).map((node) => node.getBoundingClientRect().height)),
  }));
  assert(observation.title.includes("Knowledge Video Studio"), `${label}: wrong title`);
  assert(observation.heading.includes("可交付的知识视频"), `${label}: primary outcome is not visible`);
  assert(observation.stageButtons === 6, `${label}: expected six stages`);
  assert(observation.visibleStages.length === 1 && observation.visibleStages[0] === "brief", `${label}: initial stage is not brief`);
  assert(observation.service === "演示模式", `${label}: service boundary is not explicit`);
  assert(observation.researchHref === "./index.html", `${label}: research return link is missing`);
  assert(observation.overflow <= 1, `${label}: horizontal overflow ${observation.overflow}px`);
  assert(observation.minControlHeight >= 30, `${label}: visible control height is too small`);

  await page.locator('[data-stage-button="brief"]').focus();
  await page.keyboard.press("ArrowRight");
  const focusedStage = await page.evaluate(() => document.activeElement?.getAttribute("data-stage-button"));
  assert(focusedStage === "plan", `${label}: keyboard stage navigation failed`);

  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  results.push({ label, viewport, reducedMotion, ...observation });
  await context.close();
}

async function inspectJourney() {
  const label = "desktop-journey";
  const { context, page } = await createPage({ width: 1440, height: 1000 }, label);
  await page.goto(httpUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.click('#brief-form button[type="submit"]');
  await page.waitForSelector('[data-stage="plan"]:not([hidden])');
  assert((await page.locator("#act-list button").count()) === 5, `${label}: plan should contain five acts`);

  await page.click("#approve-plan");
  await page.waitForSelector('[data-stage="storyboard"]:not([hidden])');
  assert((await page.locator(".scene-card").count()) === 5, `${label}: storyboard should contain five scenes`);
  await page.click("#lock-all");
  assert(!(await page.locator("#approve-storyboard").isDisabled()), `${label}: locked storyboard cannot advance`);
  await page.click("#approve-storyboard");
  await page.waitForSelector('[data-stage="voice"]:not([hidden])');

  await page.click("#generate-voice");
  await page.waitForSelector('[data-stage="render"]:not([hidden])');
  await page.click('[data-ratio="9:16"]');
  await page.click("#start-render");
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  await page.waitForSelector("#deliverables:not([hidden])", { timeout: 7000 });

  const observation = await page.evaluate(() => ({
    jobLines: document.querySelectorAll("#job-log li").length,
    jobStatus: document.querySelector("#job-status")?.textContent,
    outputs: document.querySelectorAll("#deliverables article").length,
    ratio: document.querySelector('[data-ratio="9:16"]')?.getAttribute("aria-pressed"),
    locked: document.querySelector("#locked-label")?.textContent,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(observation.jobLines === 6, `${label}: expected six job log entries`);
  assert(observation.jobStatus.includes("演示完成"), `${label}: demo completion must be explicit`);
  assert(observation.outputs === 3, `${label}: expected three delivery artifacts`);
  assert(observation.ratio === "true", `${label}: ratio state did not persist`);
  assert(observation.locked.includes("5 / 5"), `${label}: locked scene state was lost`);
  assert(observation.overflow <= 1, `${label}: journey caused horizontal overflow`);
  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  results.push({ label, viewport: { width: 1440, height: 1000 }, ...observation });
  await context.close();
}

async function inspectResearchLink() {
  const label = "research-link";
  const { context, page } = await createPage({ width: 1280, height: 900 }, label);
  await page.goto(researchUrl, { waitUntil: "domcontentloaded" });
  const hrefs = await page.locator('a[href="./studio.html"]').count();
  assert(hrefs >= 3, `${label}: research page should expose studio in nav, hero and planner`);
  results.push({ label, studioLinks: hrefs });
  await context.close();
}

try {
  await inspectInitial(httpUrl, { width: 1440, height: 1000 }, "desktop-http");
  await inspectInitial(httpUrl, { width: 900, height: 900 }, "tablet-http");
  await inspectInitial(httpUrl, { width: 390, height: 844 }, "mobile-http", "reduce");
  await inspectInitial(fileUrl, { width: 1280, height: 900 }, "desktop-file");
  await inspectJourney();
  await inspectResearchLink();
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
  const report = { checkedAt: new Date().toISOString(), httpUrl, fileUrl, results, errors };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
