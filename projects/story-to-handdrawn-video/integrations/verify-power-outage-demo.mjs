import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const nodeModules = process.env.CODEX_NODE_MODULES;
const require = createRequire(import.meta.url);
const { chromium } = nodeModules ? require(path.join(nodeModules, "playwright")) : require("playwright");
const edgePath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = path.join(projectRoot, "browser-evidence", "power-outage");
const httpUrl = process.env.DEMO_URL || "http://127.0.0.1:8789/docs/demos/story-to-handdrawn-video/index.html";
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "index.html").replaceAll("\\", "/")}`).href;

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspect(url, viewport, label, options = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: options.reducedMotion || "no-preference" });
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${label}:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`${label}:page:${error.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#technology-real-output", { state: "attached" });
  await page.waitForTimeout(800);
  const technologyVisible = await page.evaluate(() => !document.querySelector("#technology-real-output")?.hidden);
  assert(technologyVisible, `${label}: technology output stayed hidden; ${errors.join(" | ")}`);

  const initial = await page.evaluate(() => ({
    selectedStory: document.querySelector('[data-director-story][aria-selected="true"]')?.dataset.directorStory,
    title: document.querySelector("#director-preset-title")?.textContent,
    outputTitle: document.querySelector("#technology-output-title")?.textContent,
    recipeCount: document.querySelectorAll("[data-recipe-target]").length,
    tabCount: document.querySelectorAll("[data-director-story]").length,
    comparisonCount: document.querySelectorAll(".recipe-compare-card").length,
    videos: [...document.querySelectorAll("video")].map((video) => ({ id: video.id, preload: video.preload })),
    mp4Entries: performance.getEntriesByType("resource").filter((entry) => entry.name.includes(".mp4")).map((entry) => ({ name: entry.name.split("/").pop(), transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize })),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  assert(initial.selectedStory === "technology", `${label}: technology is not the default selected recipe`);
  assert(initial.title.includes("停电以后"), `${label}: director title is not synchronized`);
  assert(initial.outputTitle.includes("停电以后"), `${label}: real output is missing`);
  assert(initial.recipeCount === 8 && initial.tabCount === 8 && initial.comparisonCount === 8, `${label}: expected 8/8 recipe surfaces`);
  assert(initial.videos.length === 10 && initial.videos.every((video) => video.preload === "metadata"), `${label}: expected ten metadata-only videos`);
  if (url.startsWith("http")) {
    assert(initial.mp4Entries.length === 10, `${label}: expected ten initial MP4 metadata requests`);
    assert(initial.mp4Entries.every((entry) => entry.transferSize <= 2048 && entry.encodedBodySize <= 2048), `${label}: an MP4 was fully preloaded`);
  }
  assert(initial.overflow <= 1, `${label}: horizontal overflow ${initial.overflow}px`);

  const powered = await page.evaluate(() => ({
    state: document.querySelector("#power-experience")?.dataset.powerState,
    label: document.querySelector("#power-status-label")?.textContent,
    mapHidden: document.querySelector("#power-system-map")?.hidden,
  }));
  assert(powered.state === "powered" && powered.label === "供电正常" && powered.mapHidden, `${label}: invalid powered baseline`);
  await page.locator("#power-experience").scrollIntoViewIfNeeded();
  if (label === "desktop-http") await page.screenshot({ path: path.join(outputDir, "desktop-http-powered.png"), fullPage: false });

  await page.focus("#power-experience-primary");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(options.reducedMotion === "reduce" ? 20 : 240);
  const outage = await page.evaluate(() => ({
    state: document.querySelector("#power-experience")?.dataset.powerState,
    label: document.querySelector("#power-status-label")?.textContent,
    fan: getComputedStyle(document.querySelector(".power-fan-rotor i")).animationPlayState,
    leds: getComputedStyle(document.querySelector(".power-router-leds")).opacity,
  }));
  assert(outage.state === "outage" && outage.label === "供电中断" && outage.fan === "paused" && Number(outage.leds) === 0, `${label}: outage state is not coherent`);

  let sequence;
  if (options.reducedMotion === "reduce") {
    await page.waitForTimeout(520);
    sequence = { reduced: await page.locator("#power-experience").getAttribute("data-power-state") };
    assert(sequence.reduced === "ready", `${label}: reduced-motion path did not preserve the final information state`);
  } else if (label === "desktop-http") {
    await page.waitForTimeout(1500);
    const phone = await page.evaluate(() => ({ state: document.querySelector("#power-experience")?.dataset.powerState, beam: getComputedStyle(document.querySelector(".power-phone-beam")).opacity }));
    await page.waitForTimeout(1700);
    const reveal = await page.evaluate(() => ({ state: document.querySelector("#power-experience")?.dataset.powerState, trace: getComputedStyle(document.querySelector(".power-network-trace")).opacity }));
    await page.waitForTimeout(2400);
    const ready = await page.locator("#power-experience").getAttribute("data-power-state");
    sequence = { phone, reveal, ready };
    assert(phone.state === "phone" && Number(phone.beam) > 0.9, `${label}: phone-light stage failed`);
    assert(reveal.state === "reveal" && Number(reveal.trace) > 0.9, `${label}: dependency reveal stage failed`);
    assert(ready === "ready", `${label}: system-ready stage failed`);
  } else {
    await page.focus("#power-experience-skip");
    await page.keyboard.press("Enter");
    sequence = { skipped: await page.locator("#power-experience").getAttribute("data-power-state") };
    assert(sequence.skipped === "ready", `${label}: skip-to-system failed`);
  }

  const readyMap = await page.evaluate(() => ({
    hidden: document.querySelector("#power-system-map")?.hidden,
    ariaHidden: document.querySelector("#power-system-map")?.getAttribute("aria-hidden"),
    eventCount: document.querySelectorAll(".power-event-log li").length,
  }));
  assert(!readyMap.hidden && readyMap.ariaHidden === "false" && readyMap.eventCount === 4, `${label}: ready map is not exposed`);
  await page.click('button[data-power-dependency="mobile"]');
  const dependency = await page.evaluate(() => ({
    selected: document.querySelector('button[data-power-dependency="mobile"]')?.getAttribute("aria-selected"),
    values: [...document.querySelectorAll('button[data-power-dependency]')].map((button) => [button.dataset.powerDependency, button.getAttribute("aria-selected")]),
    map: document.querySelector("#power-system-map")?.dataset.activeDependency,
    title: document.querySelector("#power-dependency-title")?.textContent,
    boundary: document.querySelector("#power-dependency-boundary")?.textContent,
  }));
  assert(dependency.selected === "true" && dependency.title.includes("手机有电") && dependency.boundary.includes("不预测"), `${label}: dependency selection did not update its explanation and boundary: ${JSON.stringify(dependency)}`);
  await page.screenshot({ path: path.join(outputDir, `${label}.png`), fullPage: false });

  let film = null;
  if (label === "desktop-http") {
    await page.click("#power-enter-film");
    await page.waitForTimeout(900);
    film = await page.evaluate(() => ({ active: document.activeElement?.id, paused: document.querySelector("#technology-demo-video")?.paused, currentTime: document.querySelector("#technology-demo-video")?.currentTime }));
    assert(film.active === "technology-demo-video" && (!film.paused || film.currentTime > 0), `${label}: enter-film action did not focus and start the real output`);
    await page.evaluate(() => document.querySelector("#technology-demo-video")?.pause());
  }
  await page.focus('button[data-power-dependency="mobile"]');
  await page.keyboard.press("Escape");
  const restoring = await page.locator("#power-experience").getAttribute("data-power-state");
  assert(restoring === "restore", `${label}: Escape did not enter restore state`);
  await page.waitForTimeout(options.reducedMotion === "reduce" ? 120 : 950);
  const restored = await page.evaluate(() => ({ state: document.querySelector("#power-experience")?.dataset.powerState, mapHidden: document.querySelector("#power-system-map")?.hidden }));
  assert(restored.state === "powered" && restored.mapHidden, `${label}: restore did not return to powered baseline`);

  await page.click('[data-technology-time="41.16"]');
  const seek = await page.evaluate(() => ({
    currentTime: document.querySelector("#technology-demo-video")?.currentTime,
    active: document.querySelector('[data-technology-time="41.16"]')?.getAttribute("aria-pressed"),
  }));
  assert(Math.abs(seek.currentTime - 41.16) < 0.5 && seek.active === "true", `${label}: technology timeline did not seek`);

  await page.click('[data-fit-sample="technology"]');
  const fit = await page.evaluate(() => ({
    title: document.querySelector("#story-fit-result-title")?.textContent,
    first: document.querySelector("#story-fit-ranking .story-fit-rank b")?.textContent,
    count: document.querySelectorAll("#story-fit-ranking .story-fit-rank").length,
  }));
  assert(fit.title.includes("停电以后") && fit.first.includes("科技人文") && fit.count === 8, `${label}: technology story fit is not ranked first`);

  await page.click('[data-director-story="memory"]');
  const switched = await page.evaluate(() => ({
    hidden: document.querySelector("#technology-real-output")?.hidden,
    paused: document.querySelector("#technology-demo-video")?.paused,
  }));
  assert(switched.hidden && switched.paused, `${label}: switching recipes did not hide and pause technology media`);
  await page.click('[data-director-story="technology"]');

  await page.locator("#technology-real-output").scrollIntoViewIfNeeded();
  await page.close();
  return { label, url, viewport, reducedMotion: options.reducedMotion || "no-preference", initial, powered, outage, sequence, readyMap, dependency, film, restored, seek, fit, switched };
}

try {
  const results = [];
  results.push(await inspect(httpUrl, { width: 1440, height: 1000 }, "desktop-http"));
  results.push(await inspect(httpUrl, { width: 390, height: 844 }, "mobile-http"));
  results.push(await inspect(fileUrl, { width: 1280, height: 900 }, "desktop-file"));
  results.push(await inspect(httpUrl, { width: 390, height: 844 }, "mobile-reduced", { reducedMotion: "reduce" }));
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
  const report = { passed: true, checkedAt: new Date().toISOString(), errors, results };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
