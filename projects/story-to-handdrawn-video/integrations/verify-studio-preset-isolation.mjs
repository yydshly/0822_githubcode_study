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
const outputDir = path.join(projectRoot, "browser-evidence", "studio-preset-isolation");
const httpUrl = process.env.STUDIO_URL || "http://127.0.0.1:8791/demos/story-to-handdrawn-video/studio.html";
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "studio.html").replaceAll("\\", "/")}`).href;

const expected = {
  sky: { topic: "为什么天空是蓝色的？", folder: "sky-blue-demo", video: "why-is-the-sky-blue.mp4", firstTitle: "海洋没有把天空染蓝", voiceChars: "401 字" },
  electricity: { topic: "电如何成为现代生活的基础设施？", folder: "power-outage-demo", video: "after-the-power-went-out-i-saw-electricity.mp4", firstTitle: "电的缺席先被身体感知", voiceChars: "494 字" },
  poetry: { topic: "《忆江南》如何用色彩和空间构建记忆？", folder: "jiangnan-bright-demo", video: "remembering-jiangnan-lecture.mp4", firstTitle: "“江南好”先建立可进入的空间", voiceChars: "383 字" },
  aiEnergy: { topic: "为什么 AI 那么耗电？", folder: "ai-energy-demo", video: "why-ai-uses-electricity.mp4", firstTitle: "一句提示词的旅程", voiceChars: "609 字" },
};

function assert(condition, message) { if (!condition) throw new Error(message); }
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const results = [];
const errors = [];

async function createPage(url, label, viewport = { width: 1440, height: 1000 }, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  if (url.startsWith("http:")) {
    await page.addInitScript(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/health")
        ? Promise.reject(new TypeError("Deliberate offline test boundary"))
        : realFetch(input, init);
    });
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  return { context, page };
}

async function runPreset(url, preset, label, viewport, reducedMotion) {
  const spec = expected[preset];
  const { context, page } = await createPage(url, label, viewport, reducedMotion);
  await page.click(`[data-preset="${preset}"]`);
  const immediateVideo = await page.locator("#composition-source").getAttribute("src");
  assert(immediateVideo?.includes(`${spec.folder}/${spec.video}`), `${label}: selection retained the previous preview`);

  await page.click('#brief-form button[type="submit"]');
  await page.waitForSelector('[data-stage="plan"]:not([hidden])');
  assert((await page.locator("#act-list button").count()) === 5, `${label}: plan does not contain five acts`);
  assert((await page.locator("#act-title").textContent()) === spec.firstTitle, `${label}: plan belongs to another preset`);
  await page.click("#approve-plan");
  await page.waitForSelector('[data-stage="storyboard"]:not([hidden])');
  const images = await page.locator(".scene-card img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
  assert(images.length === 5 && images.every((src) => src?.includes(spec.folder)), `${label}: storyboard assets crossed preset boundaries`);
  await page.click("#lock-all");
  await page.click("#approve-storyboard");
  await page.waitForSelector('[data-stage="voice"]:not([hidden])');
  await page.click("#generate-voice");
  await page.waitForSelector('[data-stage="render"]:not([hidden])');
  const audio = await page.locator("#studio-audio").getAttribute("src");
  assert(audio?.includes(`${spec.folder}/narration.wav`), `${label}: audio belongs to another preset`);
  await page.click("#start-render");
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  await page.waitForFunction(() => document.querySelector("#job-status")?.textContent.includes("对应预设样例完成"), null, { timeout: 8000 });
  const delivery = await page.evaluate(() => ({
    topic: document.querySelector("#project-title")?.textContent,
    video: document.querySelector("#composition-source")?.getAttribute("src"),
    download: document.querySelector("#output-video-download")?.getAttribute("href"),
    manifest: document.querySelector("#output-manifest")?.getAttribute("href"),
    firstTitle: document.querySelector(".scene-card h3")?.textContent,
    activePreset: JSON.parse(localStorage.getItem("knowledge-video-studio/v1") || "{}").activePreset,
    estimatedVoice: document.querySelector("#estimated-voice")?.textContent,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(delivery.topic === spec.topic, `${label}: project title changed during the journey`);
  assert(delivery.video?.includes(`${spec.folder}/${spec.video}`), `${label}: final preview belongs to another preset`);
  assert(delivery.download === delivery.video, `${label}: final download and preview differ`);
  assert(delivery.manifest?.includes(spec.folder), `${label}: manifest belongs to another preset`);
  assert(delivery.firstTitle === spec.firstTitle, `${label}: scene title changed during the journey`);
  assert(delivery.activePreset === preset, `${label}: activePreset was not persisted`);
  assert(delivery.estimatedVoice === spec.voiceChars, `${label}: cost estimate belongs to another preset`);
  assert(delivery.overflow <= 1, `${label}: horizontal overflow ${delivery.overflow}px`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  const restoredVideo = await page.locator("#composition-source").getAttribute("src");
  assert(restoredVideo?.includes(`${spec.folder}/${spec.video}`), `${label}: refresh restored another preset`);
  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  results.push({ label, preset, url, viewport, reducedMotion, images, audio, ...delivery, restoredVideo });
  await context.close();
}

async function inspectRapidSwitch() {
  const label = "rapid-switch-mobile";
  const { context, page } = await createPage(httpUrl, label, { width: 390, height: 844 }, "reduce");
  await page.click('[data-preset="electricity"]');
  await page.click('[data-preset="poetry"]');
  const state = await page.evaluate(() => ({
    topic: document.querySelector("#topic")?.value,
    images: [...document.querySelectorAll(".scene-card img")].map((node) => node.getAttribute("src")),
    audio: document.querySelector("#studio-audio")?.getAttribute("src"),
    video: document.querySelector("#composition-source")?.getAttribute("src"),
    locked: document.querySelector("#locked-label")?.textContent,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(state.topic === expected.poetry.topic, `${label}: form retained electricity`);
  assert(state.images.every((src) => src?.includes(expected.poetry.folder)), `${label}: images retained electricity`);
  assert(state.audio?.includes(expected.poetry.folder) && state.video?.includes(expected.poetry.folder), `${label}: media retained electricity`);
  assert(state.locked?.includes("0 / 5") && state.overflow <= 1, `${label}: stale state or overflow`);
  results.push({ label, ...state });
  await context.close();
}

try {
  await runPreset(httpUrl, "sky", "sky-http");
  await runPreset(httpUrl, "electricity", "electricity-http");
  await runPreset(httpUrl, "poetry", "poetry-http");
  await runPreset(httpUrl, "aiEnergy", "ai-energy-http");
  await runPreset(fileUrl, "electricity", "electricity-file", { width: 1280, height: 900 });
  await inspectRapidSwitch();
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
  const report = { checkedAt: new Date().toISOString(), httpUrl, fileUrl, results, errors };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
