const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.env.CONTINUITY_URL ||
  'http://127.0.0.1:8107/demos/water-scene-lab/waterfall-continuity/?view=ssfr&emitter=curtain';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  let report;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__waterfallContinuity);
    const result = await page.evaluate(() => window.__waterfallContinuity.runVariant('staged'));
    await page.waitForFunction(() => window.__waterfallContinuity.getState().phase === 'complete');
    await page.screenshot({ path: path.join(outputDir, 'surface-ssfr-continuous-curtain-desktop.png'), fullPage: true });
    const ticks = result.plan.packets.map(packet => packet.tick);
    const checks = {
      http200: response?.status() === 200,
      actualWebGpu: result.environment.webgpuContext === true,
      upstreamAccepted: result.acceptance.passed === true,
      sameParticleBudget: result.injection.added === 384 && result.injection.requested === 384,
      continuousSchedule: ticks.length === 24 && ticks[0] === 0 && ticks.at(-1) === 41,
      noRuntimeErrors: errors.length === 0,
    };
    report = {
      passed: Object.values(checks).every(Boolean),
      checks,
      errors,
      profile: result.elevatedFluidProfile,
      injection: result.injection,
      ticks,
      engineQuery: result.plan.engineQuery,
    };
  } catch (error) {
    report = { passed: false, error: error.message, stack: error.stack, errors };
  } finally {
    fs.writeFileSync(path.join(outputDir, 'browser-curtain-results.json'), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
