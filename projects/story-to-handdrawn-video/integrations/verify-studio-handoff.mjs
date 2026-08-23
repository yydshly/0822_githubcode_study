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
const studioOrigin = process.env.STUDIO_ORIGIN || "http://127.0.0.1:8791";
const demoPath = "/demos/story-to-handdrawn-video/index.html";
const outputDir = path.join(projectRoot, "browser-evidence", "studio-handoff");
const fileUrl = new URL(`file:///${path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "index.html").replaceAll("\\", "/")}`).href;

const brief = {
  topic: "为什么冰箱背面会发热？",
  audience: "职业学习者",
  duration: "60",
  objective: "看完后，观众能够说明冰箱不是制造冷量，而是借助制冷循环把箱内热量搬运到室内。",
  misconception: "冰箱只会制造冷气，因此背面不应该发热。",
  entry: "手摸冰箱背面时，为什么常常比房间更热？",
  evidence: "制冷剂在蒸发器吸收箱内热量，压缩机做功后，制冷剂在冷凝器向室内释放吸收的热量以及压缩机输入的能量。",
};

function assert(condition, message) { if (!condition) throw new Error(message); }

function fakePlan(currentBrief) {
  return {
    title: currentBrief.topic,
    learning_promise: currentBrief.objective,
    visual_bible: "统一手绘知识图解，五幕保持同一冰箱与空间，不生成画内文字。",
    facts_boundary: currentBrief.evidence,
    acts: ["问题进入", "拆开误解", "建立模型", "证据解释", "迁移收束"].map((role, index) => ({
      index: index + 1,
      role,
      title: `${role}：冰箱热量路径`,
      purpose: currentBrief.objective,
      visual: `第 ${index + 1} 幕展示同一冰箱中的热量关系。`,
      narration: `第 ${index + 1} 幕解释冰箱如何搬运热量。`,
      trust: currentBrief.evidence,
      seconds: 12,
    })),
  };
}

async function fillBrief(page, currentBrief) {
  await page.fill("#knowledge-topic", currentBrief.topic);
  await page.selectOption("#knowledge-audience", { label: currentBrief.audience });
  await page.selectOption("#knowledge-duration", currentBrief.duration);
  await page.fill("#knowledge-objective", currentBrief.objective);
  await page.fill("#knowledge-misconception", currentBrief.misconception);
  await page.fill("#knowledge-entry", currentBrief.entry);
  await page.fill("#knowledge-evidence", currentBrief.evidence);
}

async function readStudioBrief(page) {
  return page.evaluate(() => Object.fromEntries(["topic", "audience", "duration", "objective", "misconception", "entry", "evidence"].map((id) => [id, document.querySelector(`#${id}`)?.value])));
}

async function runHandoff(page, sourceUrl, currentBrief, label) {
  await page.goto(sourceUrl, { waitUntil: "domcontentloaded" });
  await fillBrief(page, currentBrief);
  await page.click(".knowledge-generate");
  assert((await page.locator("#knowledge-plan-title").textContent()).includes(currentBrief.topic), `${label}: local plan did not use the new topic`);
  if (sourceUrl.startsWith("http")) {
    await page.evaluate(() => localStorage.setItem("knowledge-video-studio/v1", JSON.stringify({
      stage: "delivery", completed: ["brief", "plan", "storyboard", "voice", "render"], locked: [true, true, true, true, true],
      projectId: "old-sky-project", plan: { title: "old" }, storyboard: { scenes: [{ url: "old.png" }] }, voiceData: { url: "old.wav" }, renderData: { url: "old.mp4" },
      activePreset: "sky", project: { topic: "为什么天空是蓝色的？" },
    })));
  }
  await Promise.all([
    page.waitForURL(/\/studio\.html$/),
    page.click("#knowledge-send-studio"),
  ]);
  await page.waitForSelector("#incoming-handoff:not([hidden])");
  const received = await readStudioBrief(page);
  assert(JSON.stringify(received) === JSON.stringify(currentBrief), `${label}: seven-field brief changed during handoff`);
  assert(!page.url().includes("handoff="), `${label}: fragment payload remained in the address bar`);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("knowledge-video-studio/v1") || "null"));
  if (state) {
    assert(!state.plan && !state.storyboard && !state.voiceData && !state.renderData, `${label}: old generated output survived the handoff`);
    assert((state.completed || []).length === 0 && (state.locked || []).every((value) => !value), `${label}: old approvals survived the handoff`);
    assert(state.productionContract?.schema === "knowledge-video-production-contract/v1", `${label}: executable production contract was not received`);
    assert(state.recipe === state.productionContract.presentation.recipe, `${label}: render recipe diverged from production contract`);
  }
  return { brief: received, productionContract: state?.productionContract };
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const errors = [];
const results = {};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`desktop:console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`desktop:page:${error.message}`));
  await page.goto(`${studioOrigin}${demoPath}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  results.httpReceived = await runHandoff(page, `${studioOrigin}${demoPath}`, brief, "http-to-http");
  await page.screenshot({ path: path.join(outputDir, "desktop-incoming.png"), fullPage: false });

  let requestBody = null;
  await page.route("**/api/actions/plan", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mode: "request-capture", project_id: "handoff-capture", plan: fakePlan(requestBody.project) }) });
  });
  await page.click("#handoff-generate");
  await page.waitForSelector('[data-stage="plan"]:not([hidden])');
  assert(JSON.stringify(requestBody?.project) === JSON.stringify(brief), "confirmed handoff did not submit the same seven fields to plan API");
  assert(requestBody?.production_contract?.schema === "knowledge-video-production-contract/v1", "plan API did not receive the executable production contract");
  assert(requestBody.production_contract.id === results.httpReceived.productionContract.id, "production contract id changed between handoff and plan request");
  assert(await page.locator("#incoming-handoff").isHidden(), "incoming banner remained after successful planning");
  assert((await page.locator("#learning-promise").textContent()).includes("冰箱"), "returned plan was not rendered");
  results.planRequest = requestBody;

  const fileBrief = { ...brief, topic: "为什么保温杯不能永久保温？", entry: "同一杯热水放一夜后，热量去了哪里？" };
  results.fileReceived = await runHandoff(page, fileUrl, fileBrief, "file-to-http");
  assert(page.url().startsWith(studioOrigin), "file entry did not discover the live production origin");
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobile = await mobileContext.newPage();
  mobile.on("console", (message) => { if (message.type() === "error") errors.push(`mobile:console:${message.text()}`); });
  mobile.on("pageerror", (error) => errors.push(`mobile:page:${error.message}`));
  await runHandoff(mobile, `${studioOrigin}${demoPath}`, brief, "mobile-reduced");
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `mobile handoff has ${overflow}px horizontal overflow`);
  await mobile.locator("#incoming-handoff").scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: path.join(outputDir, "mobile-incoming.png"), fullPage: false });
  await mobile.locator("#handoff-edit").focus();
  await mobile.keyboard.press("Enter");
  assert(await mobile.evaluate(() => document.activeElement?.id) === "topic", "handoff edit action is not keyboard operable");
  results.mobile = { overflow, focusAfterEdit: "topic" };
  await mobileContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const fallback = await fallbackContext.newPage();
  await fallback.route("**/scene-04-thumb.webp*", (route) => route.abort());
  await fallback.goto(fileUrl, { waitUntil: "domcontentloaded" });
  await fillBrief(fallback, brief);
  await fallback.click(".knowledge-generate");
  await fallback.click("#knowledge-send-studio");
  await fallback.waitForFunction(() => document.querySelector("#knowledge-action-status")?.dataset.status === "error");
  assert(fallback.url().startsWith("file:"), "unavailable service should preserve the research page and brief");
  assert((await fallback.locator("#knowledge-action-status").textContent()).includes("没有发现"), "unavailable service recovery message is missing");
  results.unavailable = { stayedOnResearchPage: true, message: await fallback.locator("#knowledge-action-status").textContent() };
  await fallbackContext.close();
} catch (error) {
  errors.push(error.stack || error.message);
} finally {
  await browser.close();
}

const report = { passed: errors.length === 0, checkedAt: new Date().toISOString(), studioOrigin, errors, results };
await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
