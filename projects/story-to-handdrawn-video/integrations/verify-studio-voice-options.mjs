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
const studioUrl = process.env.STUDIO_URL || "http://127.0.0.1:8791/demos/story-to-handdrawn-video/studio.html";
const outputDir = path.join(projectRoot, "browser-evidence", "studio-voice-options");

function assert(condition, message) { if (!condition) throw new Error(message); }

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
page.on("pageerror", (error) => errors.push(`page:${error.message}`));

try {
  await page.goto(studioUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#service-check[data-status="online"]');

  await page.click('[data-preset="aiEnergy"]');
  await page.click('[data-stage-button="voice"]');
  const optionIds = await page.locator("[data-voice]").evaluateAll((nodes) => nodes.map((node) => node.dataset.voice));
  assert(optionIds.join(",") === "female-chengshu,male-qn-jingying,female-tianmei", `Unexpected voice ids: ${optionIds.join(",")}`);
  assert(!optionIds.includes("presenter_male"), "Removed placeholder voice id is still present.");

  const referenceAudio = await page.locator("#studio-audio").getAttribute("src");
  await page.click('[data-voice="male-qn-jingying"]');
  await page.locator("#speed").fill("1.05");
  const selected = await page.locator('[data-voice][aria-checked="true"]').getAttribute("data-voice");
  const badgeBeforeGeneration = await page.locator("#audio-badge").textContent();
  const noteBeforeGeneration = await page.locator("#voice-preview-note").textContent();
  assert(selected === "male-qn-jingying", `Selected voice did not change: ${selected}`);
  assert(badgeBeforeGeneration.includes("清晰男声") && badgeBeforeGeneration.includes("生成后试听"), "Selection feedback is missing.");
  assert(noteBeforeGeneration.includes("参考样例") && noteBeforeGeneration.includes("不代表当前选择"), "Reference audio boundary is unclear.");
  assert((await page.locator("#studio-audio").getAttribute("src")) === referenceAudio, "Selecting a voice should not pretend that reference audio was regenerated.");

  let requestBody = null;
  await page.route("**/api/actions/voice", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        voice: {
          provider: "request-capture",
          model: "speech-2.8-hd",
          voice: requestBody.options.voice,
          speed: requestBody.options.speed,
          segments: Array.from({ length: 5 }, (_, index) => ({ index: index + 1, duration: 1 })),
          url: "./assets/ai-energy-demo/narration.wav",
        },
      }),
    });
  });
  await page.click("#generate-voice");
  await page.waitForSelector('[data-stage="render"]:not([hidden])');
  assert(requestBody?.options?.voice === "male-qn-jingying", `Voice request used ${requestBody?.options?.voice}.`);
  assert(requestBody?.options?.speed === 1.05, `Voice request speed used ${requestBody?.options?.speed}.`);
  const badgeAfterGeneration = await page.locator("#audio-badge").textContent();
  assert(badgeAfterGeneration.includes("清晰男声"), "Generated-audio badge lost the selected voice.");
  assert((await page.locator("#voice-preview-note").textContent()).includes("本次任务生成的清晰男声旁白"), "Generated-audio feedback is missing.");

  const enabledRecipes = await page.locator('input[name="recipe"]:not(:disabled)').evaluateAll((nodes) => nodes.map((node) => node.value));
  assert(enabledRecipes.length === 0, `Render-stage contract controls must be locked: ${enabledRecipes.join(",")}`);
  const selectedRecipe = await page.locator('input[name="recipe"]:checked').getAttribute("value");
  const contractId = await page.locator("#render-contract-id").textContent();
  assert(selectedRecipe === "handdrawn", `AI energy preset did not carry its handdrawn contract: ${selectedRecipe}`);
  assert(contractId.startsWith("pc-technology-handdrawn-"), `Unexpected render contract id: ${contractId}`);
  assert(await page.locator("#motion-clips").isDisabled(), "Unimplemented image-to-video control is selectable.");
  assert(await page.locator("#burn-subtitles").isDisabled() && await page.locator("#burn-subtitles").isChecked(), "Fixed subtitle behavior is not explicit.");

  await page.click('[data-ratio="9:16"]');
  await page.screenshot({ path: path.join(outputDir, "render-capabilities.png"), fullPage: false });
  let renderRequest = null;
  await page.route("**/api/actions/render", async (route) => {
    renderRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        mode: "request-capture",
        render: { file: "final.mp4", url: "./assets/ai-energy-demo/why-ai-uses-electricity.mp4", width: 720, height: 1280, ratio: "9:16", duration: 5, bytes: 1 },
        events: [],
      }),
    });
  });
  await page.click("#start-render");
  await page.waitForSelector('[data-stage="delivery"]:not([hidden])');
  assert(renderRequest?.options?.ratio === "9:16", `Render request ratio used ${renderRequest?.options?.ratio}.`);
  assert(renderRequest?.options?.recipe === selectedRecipe, `Render request recipe used ${renderRequest?.options?.recipe}.`);
  assert(renderRequest?.options?.production_contract_id === contractId, "Render request lost the production contract id.");
  assert(renderRequest?.options?.motion_clips === false, "Disabled motion option was submitted as enabled.");
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);

  await page.click('[data-stage-button="voice"]');
  await page.screenshot({ path: path.join(outputDir, "clear-male-selected.png"), fullPage: false });
  await page.evaluate(() => {
    const key = "knowledge-video-studio/v1";
    const saved = JSON.parse(localStorage.getItem(key));
    saved.voice = "presenter_male";
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('#service-check[data-status="online"]');
  const migratedLegacyVoice = await page.locator('[data-voice][aria-checked="true"]').getAttribute("data-voice");
  assert(migratedLegacyVoice === "male-qn-jingying", `Legacy voice was not migrated: ${migratedLegacyVoice}`);
  const report = {
    checkedAt: new Date().toISOString(),
    studioUrl,
    serviceLabel: await page.locator("#service-label").textContent(),
    optionIds,
    migratedLegacyVoice,
    request: requestBody,
    renderRequest,
    controlAudit: { enabledRecipes, selectedRecipe, contractId, motionClipsDisabled: true, subtitlesFixedOn: true },
    feedback: {
      beforeGeneration: badgeBeforeGeneration,
      afterGeneration: badgeAfterGeneration,
    },
    errors,
  };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
