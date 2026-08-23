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
const apiBase = new URL(studioUrl).origin;
const outputDir = path.join(projectRoot, "browser-evidence", "studio-service");

function assert(condition, message) { if (!condition) throw new Error(message); }

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
page.on("pageerror", (error) => errors.push(`page:${error.message}`));

try {
  const health = await context.request.get(`${apiBase}/api/health`);
  assert(health.ok(), "Health endpoint is not available.");
  const healthBody = await health.json();
  assert(healthBody.security?.keyExposedToBrowser === false, "Health endpoint reports an unsafe key boundary.");
  assert(!JSON.stringify(healthBody).includes("MINIMAX_API_KEY"), "Health payload exposes a credential name/value.");
  assert(healthBody.productionContract?.renderRecipes?.join(",") === "standard,handdrawn,poetic", "Health endpoint does not advertise all executable render recipes.");

  await page.goto(studioUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  const visibleContractId = await page.locator("#contract-id").textContent();
  assert(visibleContractId.startsWith("pc-"), "Production contract is not visible before generation.");
  await page.click('[data-presentation="poetic"]');
  const selectedContractId = await page.locator("#contract-id").textContent();
  assert(selectedContractId !== visibleContractId, `Changing presentation did not revise the production contract id: ${JSON.stringify({ visibleContractId, selectedContractId, stored: await page.evaluate(() => JSON.parse(localStorage.getItem("knowledge-video-studio/v1") || "null")?.productionContract), errors })}`);
  assert(await page.locator('input[name="recipe"][value="poetic"]').isChecked(), "Render panel did not mirror the selected presentation recipe.");
  await page.click("#service-check");
  await page.waitForFunction(() => document.querySelector("#service-label")?.textContent.includes("服务在线"));
  const serviceLabel = await page.locator("#service-label").textContent();

  await page.click('#brief-form button[type="submit"]');
  await page.waitForSelector('[data-stage="plan"]:not([hidden])', { timeout: 20_000 });
  const planProjectId = await page.evaluate(() => JSON.parse(localStorage.getItem("knowledge-video-studio/v1")).projectId);
  assert(/^kv-/.test(planProjectId), "Plan did not persist a project id.");
  assert((await page.locator("#act-list button").count()) === 5, "Live plan does not contain five acts.");

  await page.click("#approve-plan");
  await page.waitForSelector('[data-stage="storyboard"]:not([hidden])', { timeout: 30_000 });
  const generatedImages = await page.locator('.scene-card img[src^="/generated-studio/"]').count();
  assert(generatedImages === 5, `Expected five generated scene URLs, got ${generatedImages}.`);
  await page.click("#lock-all");
  await page.click("#approve-storyboard");

  await page.waitForSelector('[data-stage="voice"]:not([hidden])');
  await page.click("#generate-voice");
  await page.waitForSelector('[data-stage="render"]:not([hidden])', { timeout: 45_000 });
  const audioSource = await page.locator("#studio-audio").getAttribute("src");
  assert(audioSource.includes(`/generated-studio/${planProjectId}/narration.wav`), "Generated narration was not applied to the player.");

  await page.click("#start-render");
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])', { timeout: 180_000 });
  await page.waitForSelector("#deliverables:not([hidden])", { timeout: 10_000 });
  const outputHref = await page.locator("#output-video-download").getAttribute("href");
  const jobStatus = await page.locator("#job-status").textContent();
  assert(outputHref.includes(`/generated-studio/${planProjectId}/final.mp4`), "Rendered video URL is not project-scoped.");
  assert(jobStatus.includes(healthBody.mode === "mock" ? "测试链路完成" : "真实任务完成"), "Delivery status contradicts service mode.");

  const projectResponse = await context.request.get(`${apiBase}/api/projects/${planProjectId}`);
  assert(projectResponse.ok(), "Generated project manifest is unavailable.");
  const project = await projectResponse.json();
  assert(project.status === "complete", `Unexpected project status: ${project.status}`);
  assert(project.storyboard?.scenes?.length === 5, "Project manifest does not contain five scenes.");
  assert(project.voice?.segments?.length === 5, "Project manifest does not contain five voice segments.");
  assert(project.render?.duration > 20, "Rendered duration is unexpectedly short.");
  assert(project.production_contract?.id === selectedContractId, "Project manifest lost the selected production contract id.");
  assert(project.plan?.production_contract_id === selectedContractId, "Plan did not execute the selected production contract.");
  assert(project.storyboard?.production_contract_id === selectedContractId, "Storyboard did not execute the selected production contract.");
  assert(project.render?.production_contract_id === selectedContractId && project.render?.recipe === "poetic", "Render did not execute the selected poetic recipe.");

  const finalFile = path.join(projectRoot, "generated-studio", planProjectId, "final.mp4");
  const probe = JSON.parse(execFileSync(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration,size", "-of", "json", finalFile], { encoding: "utf8", windowsHide: true }));
  assert(probe.streams.some((stream) => stream.codec_name === "h264"), "Final output has no H.264 video stream.");
  assert(probe.streams.some((stream) => stream.codec_name === "aac"), "Final output has no AAC audio stream.");
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);

  await page.screenshot({ path: path.join(outputDir, "service-complete.png"), fullPage: false });
  const report = {
    checkedAt: new Date().toISOString(), studioUrl, service: healthBody, projectId: planProjectId,
    journey: { acts: 5, generatedImages, audioSource, outputHref, jobStatus, productionContractId: selectedContractId, renderRecipe: project.render.recipe },
    media: probe, errors,
  };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
