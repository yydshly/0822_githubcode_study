const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.SANDBOX_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/sandbox/';
const executablePath = process.env.BROWSER_EXECUTABLE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'guided-lifecycle-browser-results.json');

function observeErrors(page) {
  const errors = { console: [], page: [], failedRequests: [] };
  page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', error => errors.page.push(error.message));
  page.on('requestfailed', request => errors.failedRequests.push({
    url: request.url(), error: request.failure()?.errorText,
  }));
  return errors;
}

async function snapshot(page) {
  return page.evaluate(() => ({
    state: window.__waterSandbox.getState(),
    preflight: {
      contract: document.querySelector('#preflight-contract')?.textContent,
      body: document.querySelector('#preflight-body')?.textContent,
      particles: document.querySelector('#preflight-particles')?.textContent,
      ticks: document.querySelector('#preflight-ticks')?.textContent,
    },
    guide: [...document.querySelectorAll('[data-guide-step]')].map(item => item.dataset.status),
    acceptance: [...document.querySelectorAll('#acceptance-checks li')].map(item => ({
      label: item.querySelector('span')?.textContent,
      status: item.querySelector('strong')?.textContent,
    })),
    controls: {
      run: { text: document.querySelector('#runtime-run')?.textContent, disabled: document.querySelector('#runtime-run')?.disabled },
      clear: { disabled: document.querySelector('#runtime-clear')?.disabled },
      unload: { disabled: document.querySelector('#runtime-unload')?.disabled },
    },
    live: {
      state: document.querySelector('#live-state')?.textContent,
      conclusion: document.querySelector('#live-conclusion')?.textContent,
    },
    iframeSrc: document.querySelector('#runtime-frame')?.getAttribute('src'),
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  }));
}

async function runSuccessfulJourney(browser, viewport, presetId, artifactName) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  const errors = observeErrors(page);
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__waterSandbox);
  await page.evaluate(id => window.__waterSandbox.selectPreset(id), presetId);
  const idle = await snapshot(page);

  const runButton = page.locator('#runtime-run');
  await runButton.focus();
  const runFocus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { id: document.activeElement?.id, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  const started = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__waterSandbox.getState().completedRuns === 1 &&
    window.__waterSandbox.getState().phase === 'complete');
  const durationMs = Date.now() - started;
  const complete = await snapshot(page);
  await page.screenshot({ path: path.join(outputDir, artifactName), fullPage: true });

  const firstFrameSrc = complete.iframeSrc;
  await runButton.click();
  await page.waitForFunction(() => window.__waterSandbox.getState().completedRuns === 2 &&
    window.__waterSandbox.getState().phase === 'complete');
  const rerun = await snapshot(page);

  const clearButton = page.locator('#runtime-clear');
  await runButton.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  const clearFocus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { id: document.activeElement?.id, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__waterSandbox.getState().phase === 'ready');
  const ready = await snapshot(page);
  if (viewport.width === 1440) {
    await page.screenshot({ path: path.join(outputDir, 'guided-ready-desktop.png'), fullPage: true });
  }

  const unloadButton = page.locator('#runtime-unload');
  await runButton.focus();
  await page.keyboard.press('Shift+Tab');
  const unloadFocus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { id: document.activeElement?.id, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__waterSandbox.getState().phase === 'idle');
  const unloaded = await snapshot(page);
  await context.close();
  return { responseStatus: response?.status(), viewport, presetId, idle, runFocus, durationMs,
    complete, firstFrameSrc, rerun, clearFocus, ready, unloadFocus, unloaded, errors };
}

async function runErrorJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = observeErrors(page);
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.__waterSandbox);
  await page.locator('#runtime-run').click();
  await page.waitForFunction(() => window.__waterSandbox.getState().phase === 'error', null, { timeout: 15000 });
  const error = await snapshot(page);
  await page.screenshot({ path: path.join(outputDir, 'guided-error-desktop.png'), fullPage: true });
  await page.locator('#runtime-unload').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__waterSandbox.getState().phase === 'idle');
  const recovered = await snapshot(page);
  await context.close();
  return { responseStatus: response?.status(), error, recovered, errors };
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const browserVersion = await browser.version();
  const report = { baseUrl, executablePath, browserVersion, journeys: {}, checks: [], passed: false };
  const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
  try {
    report.journeys.desktop = await runSuccessfulJourney(
      browser, { width: 1440, height: 1000 }, 'spillway-impact-block', 'guided-complete-desktop.png');
    report.journeys.compact = await runSuccessfulJourney(
      browser, { width: 1280, height: 900 }, 'channel-drifting-block', 'guided-complete-compact-desktop.png');
    report.journeys.error = await runErrorJourney(browser);

    for (const [name, journey] of Object.entries({ desktop: report.journeys.desktop, compact: report.journeys.compact })) {
      check(`${name}.httpAndPreflight`, journey.responseStatus === 200 &&
        journey.idle.preflight.contract === (name === 'desktop' ? 'waterfall-impact-near-field' : 'river-obstacle-near-field') &&
        journey.idle.preflight.particles === (name === 'desktop' ? '384' : '480') &&
        journey.idle.guide.join(',') === 'active,pending,pending,pending', journey.idle);
      check(`${name}.keyboardRun`, journey.runFocus.id === 'runtime-run' &&
        journey.runFocus.outlineStyle !== 'none' && parseFloat(journey.runFocus.outlineWidth) >= 2, journey.runFocus);
      check(`${name}.completeEvidence`, journey.complete.state.phase === 'complete' &&
        journey.complete.state.runtimeSlots === 1 &&
        journey.complete.state.result?.acceptance?.passed === true &&
        journey.complete.guide.every(status => status === 'passed') &&
        journey.complete.acceptance.length >= 7 &&
        journey.complete.acceptance.every(item => item.status === 'PASS') &&
        journey.complete.live.state === 'PASSED', journey.complete);
      check(`${name}.controlledRerun`, journey.rerun.state.completedRuns === 2 &&
        journey.rerun.state.runtimeSlots === 1 &&
        journey.rerun.state.maxObservedRuntimeSlots === 1 &&
        journey.rerun.state.runtimePresetId === journey.presetId &&
        journey.rerun.iframeSrc === journey.firstFrameSrc &&
        journey.rerun.state.lifecycle.filter(event => event.event === 'loading').length === 1,
        journey.rerun.state);
      check(`${name}.clearPreservesRuntime`, journey.clearFocus.id === 'runtime-clear' &&
        journey.clearFocus.outlineStyle !== 'none' &&
        journey.ready.state.phase === 'ready' &&
        journey.ready.state.runtimeSlots === 1 &&
        journey.ready.state.runtimeLoaded === true &&
        journey.ready.state.result == null &&
        journey.ready.iframeSrc === journey.firstFrameSrc &&
        journey.ready.live.state === 'READY', journey.ready);
      check(`${name}.unloadReturnsIdle`, journey.unloadFocus.id === 'runtime-unload' &&
        journey.unloadFocus.outlineStyle !== 'none' &&
        journey.unloaded.state.phase === 'idle' &&
        journey.unloaded.state.runtimeSlots === 0 &&
        journey.unloaded.state.runtimeLoaded === false &&
        journey.unloaded.state.result == null &&
        journey.unloaded.iframeSrc == null, journey.unloaded);
      check(`${name}.layoutAndPerformance`, journey.idle.horizontalOverflow <= 1 &&
        journey.complete.horizontalOverflow <= 1 &&
        journey.ready.horizontalOverflow <= 1 &&
        journey.durationMs < 120000, { durationMs: journey.durationMs, overflow: [
          journey.idle.horizontalOverflow, journey.complete.horizontalOverflow, journey.ready.horizontalOverflow,
        ] });
      check(`${name}.browserClean`, journey.errors.console.length === 0 &&
        journey.errors.page.length === 0 && journey.errors.failedRequests.length === 0, journey.errors);
    }

    const failure = report.journeys.error;
    check('error.truthfulState', failure.responseStatus === 200 &&
      failure.error.state.phase === 'error' &&
      failure.error.state.result == null &&
      failure.error.live.state === 'ERROR' &&
      failure.error.live.conclusion.includes('WebGPU') &&
      failure.error.acceptance.length === 0 &&
      failure.error.controls.run.disabled === true &&
      failure.error.controls.unload.disabled === false, failure.error);
    check('error.recovery', failure.recovered.state.phase === 'idle' &&
      failure.recovered.state.runtimeSlots === 0 &&
      failure.recovered.state.runtimeLoaded === false &&
      failure.recovered.iframeSrc == null &&
      failure.recovered.live.state === 'WAITING', failure.recovered);
    check('error.browserClean', failure.errors.console.length === 0 &&
      failure.errors.page.length === 0 && failure.errors.failedRequests.length === 0, failure.errors);
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
    durations: {
      desktop: report.journeys.desktop?.durationMs,
      compact: report.journeys.compact?.durationMs,
    },
    error: report.error?.message || null,
    outputPath,
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
