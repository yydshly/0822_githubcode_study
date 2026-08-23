import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const require = createRequire(import.meta.url);
const nodeModules = process.env.CODEX_NODE_MODULES;
const { chromium } = nodeModules ? require(path.join(nodeModules, "playwright")) : require("playwright");
const edgePath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const baseUrl = (process.env.PAGES_URL || "https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/").replace(/\/?$/, "/");
const outputDir = path.join(projectRoot, "browser-evidence", "github-pages");
const results = [];
const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspect(route, viewport, label) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const loopbackRequests = [];
  page.on("request", (request) => {
    if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(request.url())) loopbackRequests.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}:console:${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle", timeout: 60_000 });
  assert(response?.ok(), `${label}: HTTP ${response?.status()}`);

  const observation = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim(),
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    service: document.querySelector("#service-label")?.textContent.trim() || null,
    knowledgeStudio: Boolean(document.querySelector("#knowledge-studio")),
    runtimeBoundary: Boolean(document.querySelector("#runtime-boundary")),
    studioHref: document.querySelector(".hero-secondary-link")?.getAttribute("href") || null,
    effectContract: Boolean(document.querySelector("#effect-contract")),
    stageCount: document.querySelectorAll("[data-stage-button]").length,
    serviceDetail: document.querySelector("#service-detail")?.textContent.replace(/\s+/g, " ").trim() || null,
  }));

  assert(observation.overflow <= 1, `${label}: horizontal overflow ${observation.overflow}px`);
  if (route === "./") {
    assert(observation.title.includes("知画"), `${label}: research title missing`);
    assert(observation.knowledgeStudio, `${label}: knowledge studio section missing`);
    assert(observation.runtimeBoundary, `${label}: remote/local runtime boundary missing`);
    assert(observation.studioHref === "./studio.html", `${label}: static studio link is not same-origin relative`);
  } else {
    assert(observation.title.includes("Knowledge Video Studio"), `${label}: studio title missing`);
    assert(observation.service === "远端静态演示", `${label}: hosted boundary is not explicit`);
    assert(observation.serviceDetail?.includes("不会探测或调用你的本机 API"), `${label}: local API boundary text missing`);
    assert(observation.serviceDetail?.includes("127.0.0.1:8789"), `${label}: local production URL missing`);
    assert(observation.effectContract, `${label}: executable effect contract missing`);
    assert(observation.stageCount === 6, `${label}: six-stage production flow missing`);
    await page.click("#service-check");
    assert((await page.locator("#service-label").textContent())?.trim() === "远端静态演示", `${label}: service control left hosted mode`);
  }

  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  if (route === "./" && label === "research-desktop") {
    await Promise.all([
      page.waitForURL(new URL("./studio.html", baseUrl).href, { timeout: 10_000 }),
      page.click(".hero-secondary-link"),
    ]);
  }
  assert(loopbackRequests.length === 0, `${label}: hosted page requested localhost: ${loopbackRequests.join(", ")}`);
  results.push({ label, route, viewport, loopbackRequests, ...observation });
  await context.close();
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
try {
  await inspect("./", { width: 1440, height: 1000 }, "research-desktop");
  await inspect("./studio.html", { width: 1440, height: 1000 }, "studio-desktop");
  await inspect("./", { width: 390, height: 844 }, "research-mobile");
  await inspect("./studio.html", { width: 390, height: 844 }, "studio-mobile");
  assert(errors.length === 0, `browser errors: ${errors.join(" | ")}`);
  const report = { verifiedAt: new Date().toISOString(), baseUrl, results, errors, pass: true };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = { verifiedAt: new Date().toISOString(), baseUrl, results, errors, pass: false, failure: error.message };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
