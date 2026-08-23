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
const studioUrl = process.env.STUDIO_URL || "http://127.0.0.1:8791/demos/story-to-handdrawn-video/studio.html";
const outputDir = path.join(projectRoot, "browser-evidence", "custom-project-purity");
const assetRoot = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets");
const finalVideo = path.join(assetRoot, "ai-energy-demo", "why-ai-uses-electricity.mp4");
const finalAudio = path.join(assetRoot, "ai-energy-demo", "narration.wav");
const sceneFiles = Array.from({ length: 5 }, (_, index) => path.join(assetRoot, "ai-energy-demo", `scene-0${index + 1}.png`));

const brief = {
  topic: "为什么冰箱背面会发热？",
  audience: "职业学习者",
  duration: "60",
  objective: "看完后，观众能够说明冰箱不是制造冷量，而是借助制冷循环把箱内热量搬运到室内。",
  misconception: "冰箱只会制造冷气，因此背面不应该发热。",
  entry: "手摸冰箱背面时，为什么常常比房间更热？",
  evidence: "制冷剂在蒸发器吸收箱内热量，压缩机做功后，制冷剂在冷凝器向室内释放热量。",
};
const roles = ["问题进入", "拆开误解", "建立模型", "证据解释", "迁移收束"];
const plan = {
  title: brief.topic,
  learning_promise: brief.objective,
  visual_bible: "同一台冰箱、同一厨房和一致热量色彩编码；画面无文字。",
  facts_boundary: brief.evidence,
  acts: roles.map((role, index) => ({ index: index + 1, role, title: `${role}：热量去了哪里`, purpose: brief.objective, visual: `第 ${index + 1} 幕只呈现本项目冰箱与热量路径。`, narration: `第 ${index + 1} 幕解释冰箱如何把热量从箱内搬运到室内。`, trust: brief.evidence, seconds: 12 })),
};
const projectId = "custom-purity";
const generatedBase = `/generated-studio/${projectId}`;

function assert(condition, message) { if (!condition) throw new Error(message); }
function encodeHandoff() {
  const bytes = new TextEncoder().encode(JSON.stringify({ schema: "knowledge-video-handoff/v1", source: "research-page", brief }));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function installFixtures(page) {
  await page.route("**/api/actions/plan", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mode: "fixture", project_id: projectId, plan }) }));
  await page.route("**/api/actions/storyboard", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mode: "fixture", storyboard: { provider: "current-project-fixture", model: "image-current", scenes: roles.map((_, index) => ({ index: index + 1, url: `${generatedBase}/scene-0${index + 1}.png`, provider: "current-project-fixture", status: "generated" })) } }) }));
  await page.route("**/api/actions/voice", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mode: "fixture", voice: { provider: "MiniMax fixture", model: "speech-2.8-hd", voice: "female-chengshu", speed: 0.92, url: `${generatedBase}/narration.wav`, segments: roles.map((_, index) => ({ index: index + 1, duration: 12 })) } }) }));
  await page.route("**/api/actions/render", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mode: "live", render: { file: "final.mp4", url: `${generatedBase}/final.mp4`, width: 1280, height: 720, duration: 79.2, bytes: 4978252, renderer: "deterministic FFmpeg" }, events: roles.map((role) => ({ stage: role, status: "ok", message: `${role}已完成` })) }) }));
  await page.route(`**${generatedBase}/final.mp4`, (route) => route.fulfill({ status: 200, contentType: "video/mp4", path: finalVideo }));
  await page.route(`**${generatedBase}/narration.wav`, (route) => route.fulfill({ status: 200, contentType: "audio/wav", path: finalAudio }));
  for (let index = 0; index < 5; index += 1) {
    await page.route(`**${generatedBase}/scene-0${index + 1}.png`, (route) => route.fulfill({ status: 200, contentType: "image/png", path: sceneFiles[index] }));
  }
}

async function mediaState(page) {
  return page.evaluate(() => ({
    audioSrc: document.querySelector("#studio-audio")?.getAttribute("src") || "",
    compositionSrc: document.querySelector("#composition-source")?.getAttribute("src") || "",
    deliverySrc: document.querySelector("#delivery-source")?.getAttribute("src") || "",
    sceneSources: [...document.querySelectorAll(".scene-card img")].map((node) => node.getAttribute("src")),
  }));
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];
const result = {};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`desktop:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`desktop:page:${error.message}`));
  await installFixtures(page);
  await page.goto(`${studioUrl}#handoff=${encodeHandoff()}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#incoming-handoff:not([hidden])");

  assert(await page.locator("#preset-library").getAttribute("hidden") !== null, "custom brief still exposes the old preset library");
  assert(await page.locator("#preset-source").getAttribute("hidden") !== null, "custom brief still exposes the fixed AI-energy source");
  assert(await page.locator("#run-ai-pipeline").getAttribute("hidden") !== null, "custom brief still exposes the recorded AI sample action");
  assert(await page.locator('[data-stage-button="plan"]').isDisabled(), "forward stages are not gated before planning");
  const initialMedia = await mediaState(page);
  assert(!initialMedia.audioSrc && !initialMedia.compositionSrc && !initialMedia.deliverySrc && initialMedia.sceneSources.length === 0, `custom project inherited media: ${JSON.stringify(initialMedia)}`);
  assert(await page.locator("#audio-empty").getAttribute("hidden") === null, "custom audio empty state is missing");
  assert(await page.locator("#composition-empty").getAttribute("hidden") === null, "custom render empty state is missing");
  await page.screenshot({ path: path.join(outputDir, "desktop-clean-brief.png"), fullPage: false });

  await page.click("#handoff-generate");
  await page.waitForSelector('[data-stage="plan"]:not([hidden])');
  assert((await page.locator("#learning-promise").textContent()).includes("冰箱"), "current plan was not rendered");
  assert(!(await page.locator('[data-stage-button="plan"]').isDisabled()) && await page.locator('[data-stage-button="storyboard"]').isDisabled(), "plan-stage gate is inconsistent");

  await page.click("#approve-plan");
  await page.waitForSelector('[data-stage="storyboard"]:not([hidden])');
  const storyboardMedia = await mediaState(page);
  assert(storyboardMedia.sceneSources.length === 5 && storyboardMedia.sceneSources.every((url) => url.startsWith(generatedBase)), "storyboard contains a non-project image");
  assert(!(await page.locator(".scene-card__state").allTextContents()).some((value) => /RECORDED|REFERENCE|sky/i.test(value)), "storyboard labels still claim sample/reference output");
  await page.screenshot({ path: path.join(outputDir, "desktop-current-storyboard.png"), fullPage: false });

  await page.click("#lock-all");
  await page.click("#approve-storyboard");
  assert(await page.locator("#audio-empty").isVisible(), "voice stage should remain empty before TTS generation");
  await page.click("#generate-voice");
  await page.waitForSelector('[data-stage="render"]:not([hidden])');
  const voiceMedia = await mediaState(page);
  assert(voiceMedia.audioSrc === `${generatedBase}/narration.wav`, "voice player is not using the current project audio");
  assert(!voiceMedia.compositionSrc && await page.locator("#composition-empty").isVisible(), "render preview was polluted before rendering");

  await page.click("#start-render");
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  await page.waitForSelector("#delivery-player:not([hidden])");
  const finalMedia = await mediaState(page);
  assert(finalMedia.compositionSrc === `${generatedBase}/final.mp4` && finalMedia.deliverySrc === `${generatedBase}/final.mp4`, "preview and delivery player do not use the current project video");
  assert((await page.locator("#output-video-download").getAttribute("href")) === `${generatedBase}/final.mp4`, "download does not match the visible player");
  await page.waitForFunction(() => Number.isFinite(document.querySelector("#delivery-video")?.duration) && document.querySelector("#delivery-video").duration > 1);
  await page.locator("#delivery-video").evaluate((video) => { video.muted = true; return video.play(); });
  await page.waitForFunction(() => document.querySelector("#delivery-video")?.currentTime > 0.05);
  await page.locator("#delivery-video").evaluate((video) => video.pause());
  await page.screenshot({ path: path.join(outputDir, "desktop-inline-final.png"), fullPage: false });
  result.desktop = { initialMedia, storyboardMedia, voiceMedia, finalMedia, inlinePlayback: true };

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  assert((await mediaState(page)).deliverySrc === `${generatedBase}/final.mp4`, "refresh did not preserve the current project delivery player");
  const storageState = await context.storageState();
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", storageState });
  const mobile = await mobileContext.newPage();
  mobile.on("console", (message) => { if (message.type() === "error") errors.push(`mobile:console:${message.text()}`); });
  mobile.on("pageerror", (error) => errors.push(`mobile:page:${error.message}`));
  await installFixtures(mobile);
  await mobile.goto(studioUrl, { waitUntil: "domcontentloaded" });
  await mobile.waitForSelector("#delivery-player:not([hidden])");
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `mobile delivery has ${overflow}px horizontal overflow`);
  await mobile.locator("#delivery-player").scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(outputDir, "mobile-inline-final.png"), fullPage: false });
  await mobile.click("#new-project");
  assert((await mobile.locator("#topic").inputValue()) === "" && (await mobile.locator("#objective").inputValue()) === "", "new project did not start blank");
  const blankMedia = await mediaState(mobile);
  assert(!blankMedia.audioSrc && !blankMedia.compositionSrc && !blankMedia.deliverySrc && blankMedia.sceneSources.length === 0, "blank project retained prior media");
  result.mobile = { overflow, blankMedia, blankProject: true };
  await mobileContext.close();
} catch (error) {
  errors.push(error.stack || error.message);
} finally {
  await browser.close();
}

const report = { passed: errors.length === 0, checkedAt: new Date().toISOString(), studioUrl, errors, result };
await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
