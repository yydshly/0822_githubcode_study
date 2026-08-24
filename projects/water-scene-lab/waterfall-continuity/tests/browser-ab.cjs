const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.CONTINUITY_URL ||
  'http://127.0.0.1:8107/demos/water-scene-lab/waterfall-continuity/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'browser-ab-results.json');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const browserVersion = await browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  const report = { baseUrl, executablePath, browserVersion, results: {}, surface: {}, page: {}, checks: [], passed: false,
    consoleErrors, pageErrors, failedRequests };
  const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
  try {
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__waterfallContinuity);
    const initial = await page.evaluate(() => window.__waterfallContinuity.getState());

    report.results.single = await page.evaluate(() => window.__waterfallContinuity.runVariant('single'));
    await page.waitForFunction(() => window.__waterfallContinuity.getState().phase === 'complete');
    const afterSingle = await page.evaluate(() => window.__waterfallContinuity.getState());
    const firstFrameSrc = await page.locator('#runtime-frame').getAttribute('src');
    await page.screenshot({ path: path.join(outputDir, 'single-pulse-desktop.png'), fullPage: true });

    report.results.staged = await page.evaluate(() => window.__waterfallContinuity.runVariant('staged'));
    await page.waitForFunction(() => window.__waterfallContinuity.getState().phase === 'complete');
    const afterStaged = await page.evaluate(() => window.__waterfallContinuity.getState());
    const secondFrameSrc = await page.locator('#runtime-frame').getAttribute('src');
    await page.screenshot({ path: path.join(outputDir, 'staged-cascade-desktop.png'), fullPage: true });

    for (const mode of ['mesh', 'ssfr']) {
      await page.evaluate(view => window.__waterfallContinuity.selectDisplayMode(view), mode);
      report.surface[mode] = await page.evaluate(() => window.__waterfallContinuity.runVariant('staged'));
      await page.waitForFunction(() => window.__waterfallContinuity.getState().phase === 'complete');
      await page.screenshot({ path: path.join(outputDir, `surface-${mode}-desktop.png`), fullPage: true });
    }
    await page.evaluate(() => window.__waterfallContinuity.selectEmitterShape('sheet'));
    report.surface.sheetSsfr = await page.evaluate(() => window.__waterfallContinuity.runVariant('staged'));
    await page.waitForFunction(() => window.__waterfallContinuity.getState().phase === 'complete');
    await page.screenshot({ path: path.join(outputDir, 'surface-ssfr-thin-sheet-desktop.png'), fullPage: true });

    report.page = await page.evaluate(() => ({
      conclusion: document.querySelector('#conclusion')?.textContent,
      conclusionOutcome: document.querySelector('#conclusion')?.dataset.outcome,
      singleGate: document.querySelector('[data-result="single"] [data-field="gate"]')?.textContent,
      stagedGate: document.querySelector('[data-result="staged"] [data-field="gate"]')?.textContent,
      singleBins: document.querySelector('[data-result="single"] [data-field="bins"]')?.textContent,
      stagedBins: document.querySelector('[data-result="staged"] [data-field="bins"]')?.textContent,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    const single = report.results.single;
    const staged = report.results.staged;
    check('route.http200', response?.status() === 200, response?.status());
    check('runtime.initiallyIdle', initial.runtimeSlots === 0 && initial.iframeHasSource === false, initial);
    check('ab.sameInputs', single.injection.added === 384 && staged.injection.added === 384 &&
      single.step.actualTicks === 42 && staged.step.actualTicks === 42 &&
      JSON.stringify(single.mapping.solverVelocity) === JSON.stringify(staged.mapping.solverVelocity),
      { single: { injection: single.injection, step: single.step, velocity: single.mapping.solverVelocity },
        staged: { injection: staged.injection, step: staged.step, velocity: staged.mapping.solverVelocity } });
    check('ab.onlyTimingChanged', single.plan.packets.length === 1 && single.plan.packets[0].tick === 0 &&
      staged.plan.packets.length === 12 &&
      staged.plan.packets.map(packet => packet.tick).join(',') === '0,3,6,9,12,15,18,21,24,27,30,33',
      { single: single.plan.packets, staged: staged.plan.packets });
    check('ab.sameNativeBody', single.bodyProfile.shape === 'box' && staged.bodyProfile.shape === 'box' &&
      single.bodyProfile.density === 2.2 && staged.bodyProfile.density === 2.2,
      { single: single.bodyProfile, staged: staged.bodyProfile });
    check('ab.runtimeValid', single.environment.webgpuContext === true && staged.environment.webgpuContext === true &&
      single.nonFinite === 0 && staged.nonFinite === 0 &&
      single.acceptance.passed === true && staged.acceptance.passed === true,
      { single: { environment: single.environment, nonFinite: single.nonFinite, acceptance: single.acceptance },
        staged: { environment: staged.environment, nonFinite: staged.nonFinite, acceptance: staged.acceptance } });
    check('effect.moreVerticalCoverage',
      staged.elevatedFluidProfile.occupiedBins > single.elevatedFluidProfile.occupiedBins,
      { single: single.elevatedFluidProfile, staged: staged.elevatedFluidProfile });
    check('effect.higherLiveWater',
      staged.elevatedFluidProfile.highestY > single.elevatedFluidProfile.highestY,
      { single: single.elevatedFluidProfile.highestY, staged: staged.elevatedFluidProfile.highestY });
    check('runtime.singleSlot', afterSingle.runtimeSlots === 1 && afterStaged.runtimeSlots === 1 &&
      afterStaged.maxObservedRuntimeSlots === 1 && firstFrameSrc === secondFrameSrc,
      { afterSingle, afterStaged, firstFrameSrc, secondFrameSrc });
    check('surface.originalPaths', ['mesh', 'ssfr'].every(mode => {
      const result = report.surface[mode];
      return result.environment.webgpuContext === true &&
        result.acceptance.passed === true &&
        result.injection.added === 384 &&
        result.step.actualTicks === 42 &&
        new URLSearchParams(result.plan.engineQuery).get('view') === mode;
    }), {
      mesh: { environment: report.surface.mesh.environment, acceptance: report.surface.mesh.acceptance,
        engineQuery: report.surface.mesh.plan.engineQuery },
      ssfr: { environment: report.surface.ssfr.environment, acceptance: report.surface.ssfr.acceptance,
        engineQuery: report.surface.ssfr.plan.engineQuery },
    });
    check('effect.thinSheetWider', report.surface.sheetSsfr.environment.webgpuContext === true &&
      report.surface.sheetSsfr.acceptance.passed === true &&
      report.surface.sheetSsfr.injection.added === 384 &&
      report.surface.sheetSsfr.step.actualTicks === 42 &&
      report.surface.sheetSsfr.elevatedFluidProfile.spanX > report.surface.ssfr.elevatedFluidProfile.spanX,
      {
        compactSsfr: report.surface.ssfr.elevatedFluidProfile,
        sheetSsfr: report.surface.sheetSsfr.elevatedFluidProfile,
      });
    check('ui.observedConclusion', report.page.conclusionOutcome === 'improved' &&
      report.page.conclusion.includes('分时注入形成了更长的落水带') &&
      report.page.singleGate === 'PASSED' && report.page.stagedGate === 'PASSED',
      report.page);
    check('ui.desktop', report.page.overflow <= 1, report.page);
    check('browser.clean', consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0,
      { consoleErrors, pageErrors, failedRequests });
    report.passed = report.checks.every(item => item.passed);
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }
  console.log(JSON.stringify({
    passed: report.passed,
    browserVersion,
    checks: report.checks.length,
    failed: report.checks.filter(item => !item.passed).map(item => item.name),
    single: report.results.single?.elevatedFluidProfile,
    staged: report.results.staged?.elevatedFluidProfile,
    error: report.error?.message || null,
    outputPath,
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
