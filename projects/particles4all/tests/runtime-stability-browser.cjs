const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserLabel = (process.env.BROWSER_LABEL || 'chrome').replace(/[^a-z0-9_-]/gi, '-');
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, `runtime-stability-${browserLabel}.json`);
const ticks = Number(process.env.STABILITY_TICKS || 120);

function finiteStats(stats) {
  return ['avgRho', 'maxRho', 'maxSpeed', 'ke']
    .every(key => Number.isFinite(Number(stats?.[key])));
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== '0',
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const report = {
    protocol: { browserLabel, executablePath, ticks, runs: 2, scenario: 'buoyancy/light' },
    runs: [],
    lifecycle: null,
    checks: [],
    consoleErrors,
    pageErrors,
    passed: false
  };

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForFunction(() => Boolean(
      window.__particles4allLab?.engineReady ||
      document.querySelector('.runtime-card')?.dataset?.state === 'error'
    ), null, { timeout: 60000 });

    report.environment = await page.evaluate(() => {
      const runtime = window.__particles4allLab.runtime;
      return {
        userAgent: navigator.userAgent,
        hasWebGPU: Boolean(navigator.gpu),
        adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
        webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
      };
    });

    for (let run = 1; run <= 2; run += 1) {
      const value = await page.evaluate(async solverTicks => {
        const runtime = window.__particles4allLab.runtime;
        const before = await runtime.reset();
        const started = performance.now();
        const step = await runtime.step(solverTicks);
        const wallMs = performance.now() - started;
        const sampled = await runtime.sample({ positions: true, phases: true });
        let nonFinite = 0;
        for (let i = 0; i < sampled.summary.particleCount; i += 1) {
          for (let axis = 0; axis < 3; axis += 1) {
            if (!Number.isFinite(sampled.positions[i * 4 + axis])) nonFinite += 1;
          }
        }
        return {
          before,
          step,
          after: sampled.summary,
          stats: sampled.stats,
          nonFinite,
          wallMs,
          wallMsPerTick: wallMs / Math.max(1, step.actualTicks),
          gpuError: runtime.window.__gpuError || null
        };
      }, ticks);
      report.runs.push({ run, ...value });
    }

    report.lifecycle = await page.evaluate(async () => {
      const runtime = window.__particles4allLab.runtime;
      const supportBefore = { ...runtime.support };
      runtime.dispose({ unload: true });
      await new Promise(resolve => setTimeout(resolve, 100));
      let disposedGuard = false;
      let guardMessage = null;
      try {
        runtime.describe();
      } catch (error) {
        disposedGuard = true;
        guardMessage = error.message;
      }
      return {
        supportBefore,
        disposedGuard,
        guardMessage,
        frameUrl: document.querySelector('#engine-frame')?.contentWindow?.location?.href || null,
        explicitGpuDeviceDisposal: supportBefore.gpuDeviceDisposal === true
      };
    });

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    check('environment.webgpu', report.environment.hasWebGPU && report.environment.webgpuContext,
      report.environment);
    check('runs.count', report.runs.length === 2, report.runs.length);
    for (const run of report.runs) {
      check(`run${run.run}.ticks`, run.step.actualTicks === ticks, run.step);
      check(`run${run.run}.finitePositions`, run.nonFinite === 0, run.nonFinite);
      check(`run${run.run}.finiteStats`, finiteStats(run.stats), run.stats);
      check(`run${run.run}.countStable`, run.before.particleCount === run.after.particleCount,
        { before: run.before.particleCount, after: run.after.particleCount });
      check(`run${run.run}.gpuError`, !run.gpuError, run.gpuError);
    }
    check('reset.countRepeatable', report.runs[0].before.particleCount ===
      report.runs[1].before.particleCount, report.runs.map(run => run.before.particleCount));
    check('reset.simTimeRepeatable', report.runs.every(run =>
      Math.abs(run.step.startTime) < 1e-9), report.runs.map(run => run.step.startTime));
    check('dispose.guard', report.lifecycle.disposedGuard, report.lifecycle);
    check('dispose.unloaded', report.lifecycle.frameUrl === 'about:blank', report.lifecycle.frameUrl);
    check('dispose.gpuGapRecorded', report.lifecycle.explicitGpuDeviceDisposal === false,
      report.lifecycle.supportBefore);
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(check => check.passed);
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({
    passed: report.passed,
    checks: report.checks.length,
    failed: report.checks.filter(check => !check.passed).map(check => check.name),
    tickMs: report.runs.map(run => Number(run.wallMsPerTick.toFixed(2))),
    explicitGpuDeviceDisposal: report.lifecycle?.explicitGpuDeviceDisposal ?? null,
    error: report.error?.message || null,
    outputPath
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
