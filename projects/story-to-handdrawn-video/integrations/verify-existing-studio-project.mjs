import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const require = createRequire(import.meta.url);
const nodeModules = process.env.CODEX_NODE_MODULES;
const { chromium } = nodeModules ? require(path.join(nodeModules, "playwright")) : require("playwright");
const edgePath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const studioUrl = process.env.STUDIO_URL || "http://127.0.0.1:8789/demos/story-to-handdrawn-video/studio.html";
const projectId = process.env.STUDIO_PROJECT_ID;
const apiBase = new URL(studioUrl).origin;
const outputDir = path.join(projectRoot, "browser-evidence", "studio-live-project");

function assert(condition, message) { if (!condition) throw new Error(message); }
assert(/^kv-[0-9]{14}-[a-z0-9]{6}$/.test(projectId || ""), "STUDIO_PROJECT_ID is required.");

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
page.on("pageerror", (error) => errors.push(`page:${error.message}`));

try {
  const [healthResponse, projectResponse] = await Promise.all([
    context.request.get(`${apiBase}/api/health`),
    context.request.get(`${apiBase}/api/projects/${projectId}`),
  ]);
  assert(healthResponse.ok(), "Health endpoint is not available.");
  assert(projectResponse.ok(), "Existing project manifest is unavailable.");
  const health = await healthResponse.json();
  const project = await projectResponse.json();
  assert(health.mode === "live", `Expected live service, got ${health.mode}.`);
  assert(health.security?.keyExposedToBrowser === false, "Health endpoint reports an unsafe key boundary.");
  assert(project.status === "complete", `Expected a completed project, got ${project.status}.`);

  const hydratedState = {
    stage: "delivery",
    completed: ["brief", "plan", "storyboard", "voice", "render", "delivery"],
    locked: [true, true, true, true, true],
    audioReady: true,
    voice: project.voice.voice,
    speed: project.voice.speed,
    ratio: project.render.ratio,
    recipe: "whiteboard",
    service: "online",
    serviceMode: "live",
    apiKeyConfigured: true,
    projectId,
    plan: project.plan,
    storyboard: project.storyboard,
    voiceData: project.voice,
    renderData: project.render,
    project: project.brief,
  };
  await context.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: "knowledge-video-studio/v1",
    state: hydratedState,
  });
  await page.goto(studioUrl, { waitUntil: "networkidle" });
  await page.click("#service-check");
  await page.waitForFunction(() => document.querySelector("#service-label")?.textContent.includes("服务在线"));
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  await page.waitForSelector("#deliverables:not([hidden])");

  const generatedImages = await page.locator('.scene-card img[src^="/generated-studio/"]').count();
  const audioSource = await page.locator("#studio-audio").getAttribute("src");
  const videoSource = await page.locator("#composition-source").getAttribute("src");
  const outputHref = await page.locator("#output-video-download").getAttribute("href");
  assert(generatedImages === 5, `Expected five generated scenes, got ${generatedImages}.`);
  assert(audioSource?.includes(`/generated-studio/${projectId}/narration.wav`), "Generated narration is not connected.");
  assert(videoSource?.includes(`/generated-studio/${projectId}/final.mp4`), "Generated video is not connected.");
  assert(outputHref === videoSource, "Delivery link and video source differ.");

  const finalFile = path.join(projectRoot, "generated-studio", projectId, "final.mp4");
  const probe = JSON.parse(execFileSync(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration,size", "-of", "json", finalFile], { encoding: "utf8", windowsHide: true }));
  assert(probe.streams.some((stream) => stream.codec_name === "h264"), "Final output has no H.264 stream.");
  assert(probe.streams.some((stream) => stream.codec_name === "aac"), "Final output has no AAC stream.");
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);

  await page.screenshot({ path: path.join(outputDir, "live-project-delivery.png"), fullPage: true });
  const report = {
    checkedAt: new Date().toISOString(), studioUrl, projectId,
    service: health,
    journey: { generatedImages, audioSource, videoSource, outputHref },
    media: probe,
    errors,
  };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
