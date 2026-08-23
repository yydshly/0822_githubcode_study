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
const outputDir = path.join(projectRoot, "browser-evidence", "sky-blue");
const httpUrl = process.env.DEMO_URL || "http://127.0.0.1:8789/demos/story-to-handdrawn-video/index.html";
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "index.html").replaceAll("\\", "/")}`).href;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspect(url, viewport, label, javaScriptEnabled = true) {
  const page = await browser.newPage({ viewport, javaScriptEnabled });
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#latest-generation");
  await page.locator("#latest-generation").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const initial = await page.evaluate(() => {
    const video = document.querySelector("#sky-blue-demo-video");
    const section = document.querySelector("#latest-generation");
    return {
      title: section?.querySelector("h2")?.textContent.replace(/\s+/g, " ").trim(),
      videoReady: video?.readyState,
      duration: video?.duration,
      preload: video?.preload,
      source: video?.querySelector("source")?.getAttribute("src"),
      timeline: section?.querySelectorAll("[data-sky-time]").length,
      visible: Boolean(section && getComputedStyle(section).display !== "none" && section.getBoundingClientRect().height > 0),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      videos: document.querySelectorAll("video").length,
      mp4Entries: performance.getEntriesByType("resource").filter((entry) => entry.name.includes(".mp4")).map((entry) => ({ transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
    };
  });
  assert(initial.title.includes("生成效果"), `${label}: latest generation heading is missing`);
  assert(initial.visible, `${label}: latest generation section is hidden`);
  assert(initial.timeline === 5, `${label}: expected five visual beats`);
  assert(initial.preload === "metadata", `${label}: latest video must be metadata-only`);
  assert(initial.source.includes("sky-blue-demo/why-is-the-sky-blue.mp4"), `${label}: wrong latest video source`);
  assert(initial.overflow <= 1, `${label}: horizontal overflow ${initial.overflow}px`);
  if (javaScriptEnabled) {
    assert(initial.videos === 11, `${label}: expected eleven demo videos, got ${initial.videos}`);
    assert(Number.isFinite(initial.duration) && Math.abs(initial.duration - 107.233) < 0.2, `${label}: unexpected media duration ${initial.duration}`);
    if (url.startsWith("http")) {
      assert(initial.mp4Entries.length === 11, `${label}: expected eleven MP4 metadata requests`);
      assert(initial.mp4Entries.every((entry) => entry.transferSize <= 2048 && entry.encodedBodySize <= 2048), `${label}: an MP4 was fully preloaded`);
    }

    await page.click('[data-sky-time="38.66"]');
    await page.waitForTimeout(200);
    const thirdBeat = await page.evaluate(() => ({
      time: document.querySelector("#sky-blue-demo-video")?.currentTime,
      pressed: document.querySelector('[data-sky-time="38.66"]')?.getAttribute("aria-pressed"),
    }));
    assert(Math.abs(thirdBeat.time - 38.66) < 0.4 && thirdBeat.pressed === "true", `${label}: timeline seek failed`);

    await page.focus('[data-sky-time="85.11"]');
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    const keyboardTime = await page.locator("#sky-blue-demo-video").evaluate((video) => video.currentTime);
    assert(Math.abs(keyboardTime - 85.11) < 0.4, `${label}: keyboard timeline activation failed`);
    await page.locator("#sky-blue-demo-video").evaluate((video) => { video.currentTime = 86.4; });
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });
  results.push({ label, viewport, ...initial });
  await page.close();
}

try {
  await inspect(httpUrl, { width: 1440, height: 1000 }, "desktop-http");
  await inspect(httpUrl, { width: 390, height: 844 }, "mobile-http");
  await inspect(fileUrl, { width: 1280, height: 900 }, "desktop-file");
  await inspect(httpUrl, { width: 390, height: 844 }, "mobile-noscript", false);
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
  const report = { checkedAt: new Date().toISOString(), httpUrl, fileUrl, results, errors };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
