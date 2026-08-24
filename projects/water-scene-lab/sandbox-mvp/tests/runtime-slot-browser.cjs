const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.SANDBOX_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/sandbox/';
const executablePath = process.env.BROWSER_EXECUTABLE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-slot-browser-results.json');
const scenarios = [
  {
    presetId: 'spillway-impact-block',
    shortId: 'impact',
    contractId: 'waterfall-impact-near-field',
    shape: 'box',
    density: 2.2,
    particles: 384,
    ticks: 30,
  },
  {
    presetId: 'channel-drifting-block',
    shortId: 'drift',
    contractId: 'river-obstacle-near-field',
    shape: 'box',
    density: 0.35,
    particles: 480,
    ticks: 36,
  },
  {
    presetId: 'surface-rescue-ring',
    shortId: 'uplift',
    contractId: 'ocean-wave-uplift-near-field',
    shape: 'torus',
    density: 0.22,
    particles: 640,
    ticks: 36,
  },
];

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

  const report = {
    protocol: { baseUrl, executablePath, browserVersion, viewport: [1440, 1000] },
    runs: [],
    transitions: [],
    checks: [],
    consoleErrors,
    pageErrors,
    failedRequests,
    passed: false,
  };
  const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });

  try {
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__waterSandbox);
    check('host.status200', response?.status() === 200, response?.status());
    check('host.runtimeApi', await page.evaluate(() =>
      window.__waterSandbox.version === '0.3.0-guided-lifecycle' &&
      typeof window.__waterSandbox.runCurrentPreset === 'function' &&
      typeof window.__waterSandbox.unloadRuntime === 'function'));

    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      if (index > 0) {
        const transition = await page.evaluate(id => {
          const before = window.__waterSandbox.getState();
          const after = window.__waterSandbox.selectPreset(id);
          return { before, after, frameSrc: document.querySelector('#runtime-frame')?.getAttribute('src') };
        }, scenario.presetId);
        report.transitions.push(transition);
        check(`lifecycle.autoUnload.${scenario.shortId}`,
          transition.before.runtimeSlots === 1 &&
          transition.after.runtimeSlots === 0 &&
          transition.after.phase === 'idle' &&
          transition.after.iframeHasSource === false &&
          transition.frameSrc == null &&
          transition.after.lifecycle.some(event => event.reason === 'preset-switch'),
          transition);
      }

      const result = await page.evaluate(async presetId => {
        window.__waterSandbox.selectPreset(presetId);
        return window.__waterSandbox.runCurrentPreset();
      }, scenario.presetId);
      await page.waitForFunction(() => window.__waterSandbox.getState().phase === 'complete');
      const host = await page.evaluate(() => ({
        state: window.__waterSandbox.getState(),
        liveState: document.querySelector('#live-state')?.textContent,
        liveConclusion: document.querySelector('#live-conclusion')?.textContent,
        liveInjected: document.querySelector('#live-injected')?.textContent,
        runtimeBadge: document.querySelector('#runtime-badge')?.textContent,
        frameVisible: getComputedStyle(document.querySelector('#runtime-frame')).visibility,
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      report.runs.push({ scenario, result, host });

      check(`run.${scenario.shortId}.originalContract`,
        result.bridgeVersion === 'particles4all-scene-runner-v1' &&
        result.sceneContract.id === scenario.contractId &&
        host.state.selectedPreset.contractId === scenario.contractId,
        result.sceneContract);
      check(`run.${scenario.shortId}.nativeBody`,
        result.bodyProfile?.shape === scenario.shape &&
        result.bodyProfile?.density === scenario.density,
        result.bodyProfile);
      check(`run.${scenario.shortId}.particles`,
        result.injection.requested === scenario.particles &&
        result.injection.added === scenario.particles &&
        result.injection.clamped === false,
        result.injection);
      check(`run.${scenario.shortId}.ticks`,
        result.step.requestedTicks === scenario.ticks &&
        result.step.actualTicks === scenario.ticks,
        result.step);
      check(`run.${scenario.shortId}.accepted`,
        result.nonFinite === 0 &&
        result.environment.webgpuContext === true &&
        result.acceptance.passed === true,
        { nonFinite: result.nonFinite, environment: result.environment, acceptance: result.acceptance });
      check(`run.${scenario.shortId}.singleSlot`,
        host.state.phase === 'complete' &&
        host.state.runtimeSlots === 1 &&
        host.state.runtimeLoaded === true &&
        host.state.runtimePresetId === scenario.presetId &&
        host.state.maxObservedRuntimeSlots === 1,
        host.state);
      check(`run.${scenario.shortId}.truthfulUi`,
        host.liveState === 'PASSED' &&
        host.liveInjected === `${scenario.particles} / ${scenario.particles}` &&
        host.liveConclusion.includes(scenario.contractId) &&
        host.runtimeBadge === 'COMPLETE' &&
        host.frameVisible === 'visible' &&
        host.overflow <= 1,
        host);
      await page.screenshot({ path: path.join(outputDir, `runtime-${scenario.shortId}-desktop.png`), fullPage: true });
    }

    const manual = await page.evaluate(() => window.__waterSandbox.unloadRuntime());
    check('lifecycle.manualUnload',
      manual.phase === 'idle' &&
      manual.runtimeSlots === 0 &&
      manual.runtimeLoaded === false &&
      manual.runtimePresetId == null &&
      manual.iframeHasSource === false &&
      manual.lifecycle.some(event => event.reason === 'manual'),
      manual);
    check('lifecycle.neverMoreThanOne',
      report.runs.every(run => run.host.state.maxObservedRuntimeSlots === 1) &&
      !report.runs.some(run => run.host.state.lifecycle.some(event => event.slots > 1)));
    check('browser.noConsoleErrors', consoleErrors.length === 0, consoleErrors);
    check('browser.noPageErrors', pageErrors.length === 0, pageErrors);
    check('browser.noFailedRequests', failedRequests.length === 0, failedRequests);
    report.manualUnload = manual;
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
    runs: report.runs.map(run => ({
      preset: run.scenario.shortId,
      contract: run.result.sceneContract.id,
      particles: run.result.injection.added,
      ticks: run.result.step.actualTicks,
      passed: run.result.acceptance.passed,
    })),
    manualUnload: report.manualUnload && {
      phase: report.manualUnload.phase,
      slots: report.manualUnload.runtimeSlots,
      iframeHasSource: report.manualUnload.iframeHasSource,
    },
    error: report.error?.message || null,
    outputPath,
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
