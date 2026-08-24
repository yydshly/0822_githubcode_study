const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserLabel = (process.env.BROWSER_LABEL || 'chrome').replace(/[^a-z0-9_-]/gi, '-');
const headless = process.env.HEADLESS !== '0';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, `performance-compatibility-${browserLabel}.json`);
const screenshotPath = path.join(outputDir, `performance-compatibility-${browserLabel}.png`);

const tiers = [
  { name: 'small', preset: 'small', targetParticles: 28000, fixedTicks: 8 },
  { name: 'medium', preset: 'medium', targetParticles: 100000, fixedTicks: 8 },
  { name: 'large', preset: 'large', targetParticles: 300000, fixedTicks: 6 }
];
const views = ['particles', 'ssfr'];

function classify(result) {
  if (result.status !== 'completed') return 'unavailable';
  const fps = Number(result.live?.actualFps);
  if (!Number.isFinite(fps) || fps < 10) return 'not-practical';
  if (fps < 30) return 'demonstrable';
  return 'interactive';
}

async function runCase(context, config, shouldCapture) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const query = new URLSearchParams({
    preset: config.preset,
    view: config.view,
    particles: String(config.targetParticles),
    bodies: '0',
    timing: '1',
    report: '999',
    timescale: '1'
  }).toString();
  const startedAt = Date.now();
  const result = {
    id: `${config.name}-${config.view}`,
    tier: config.name,
    preset: config.preset,
    view: config.view,
    targetParticles: config.targetParticles,
    fixedTicks: config.fixedTicks,
    query,
    status: 'failed',
    consoleErrors,
    pageErrors
  };

  try {
    await page.goto(`${baseUrl}engine/?${query}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForFunction(() => Boolean(window.__sim?.n || window.__gpuError), null, {
      timeout: 150000
    });

    result.loadMs = Date.now() - startedAt;
    result.fixed = await page.evaluate(async ticks => {
      if (window.__gpuError) throw new Error(window.__gpuError);
      const sim = window.__sim;
      const ui = window.__ui;
      if (!ui.paused) document.getElementById('pause')?.click();
      document.getElementById('reset')?.click();
      sim.timeBank = 0;
      sim.lastAdvanced = 0;
      sim.lastSubsteps = 0;
      await sim.dev.queue.onSubmittedWorkDone();

      const stepDt = (1 / 60) / Math.max(1, Number(sim.params?.substeps) || 1);
      const startTime = sim.simTime;
      const wallStart = performance.now();
      for (let tick = 0; tick < ticks; tick += 1) sim.step(stepDt);
      await sim.dev.queue.onSubmittedWorkDone();
      const wallMs = performance.now() - wallStart;

      const positions = await window.__readBuf(sim.livePos(), sim.n * 16);
      let nonFinite = 0;
      for (let i = 0; i < sim.n; i += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
          if (!Number.isFinite(positions[i * 4 + axis])) nonFinite += 1;
        }
      }

      const actualTicks = Math.round((sim.simTime - startTime) / stepDt);
      window.__done = false;
      window.__result = null;
      ui.reportAt = sim.simTime + 0.75;
      window.__benchmarkFrameCount = 0;
      window.__benchmarkRafStart = performance.now();
      window.__benchmarkRafEnd = null;
      const countFrame = now => {
        window.__benchmarkFrameCount += 1;
        if (!window.__done && !window.__gpuError) requestAnimationFrame(countFrame);
        else window.__benchmarkRafEnd = now;
      };
      requestAnimationFrame(countFrame);
      if (ui.paused) document.getElementById('pause')?.click();

      return {
        particleCount: sim.n,
        fluidParticleCount: sim.scene?.nFluid || 0,
        rigidParticleCount: sim.scene?.nBody || 0,
        bodyCount: sim.nBodies || 0,
        substeps: Number(sim.params?.substeps) || 1,
        iterations: Number(sim.params?.iterations) || 1,
        stepDt,
        actualTicks,
        wallMs,
        wallMsPerTick: wallMs / Math.max(1, actualTicks),
        nonFinite,
        webgpuContext: Boolean(document.querySelector('canvas#view')?.getContext('webgpu')),
        hasDevice: Boolean(sim.dev),
        adapterLabel: document.querySelector('#adapter')?.textContent || null
      };
    }, config.fixedTicks);

    const liveStartedAt = Date.now();
    await page.waitForFunction(() => Boolean(window.__done || window.__gpuError), null, {
      timeout: 180000
    });
    await page.waitForFunction(() => window.__benchmarkRafEnd !== null || Boolean(window.__gpuError),
      null, { timeout: 5000 });
    result.liveWallMs = Date.now() - liveStartedAt;
    result.live = await page.evaluate(() => {
      const rafWallMs = Math.max(0, window.__benchmarkRafEnd - window.__benchmarkRafStart);
      const rafFrames = window.__benchmarkFrameCount;
      return {
        ...(window.__result || {}),
        reportedFps: window.__result?.fps ?? null,
        actualFps: rafWallMs > 0 ? rafFrames * 1000 / rafWallMs : null,
        rafFrames,
        rafWallMs,
        gpuError: window.__gpuError || window.__result?.gpuError || null,
        timingText: document.getElementById('timing')?.textContent || null,
        statsText: document.getElementById('stats')?.textContent || null,
        canvas: Boolean(document.querySelector('canvas#view')),
        webgpuContext: Boolean(document.querySelector('canvas#view')?.getContext('webgpu'))
      };
    });
    if (result.live.gpuError) throw new Error(result.live.gpuError);
    if (shouldCapture) await page.screenshot({ path: screenshotPath });
    result.status = 'completed';
  } catch (error) {
    result.error = { message: error.message, stack: error.stack };
  } finally {
    result.totalWallMs = Date.now() - startedAt;
    result.classification = classify(result);
    await page.close().catch(() => {});
  }

  return result;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  let cdpGpu = null;
  try {
    const session = await browser.newBrowserCDPSession();
    cdpGpu = await session.send('SystemInfo.getInfo');
  } catch {
    // CDP identity is supporting evidence; the in-page WebGPU checks are authoritative.
  }

  const report = {
    protocol: {
      tiers,
      views,
      liveSimulationSeconds: 0.75,
      classification: {
        interactive: 'fps >= 30',
        demonstrable: '10 <= fps < 30',
        notPractical: 'fps < 10',
        unavailable: 'runtime case failed'
      },
      headless,
      browserLabel,
      executablePath
    },
    environment: { cdpGpu },
    cases: [],
    checks: [],
    gatePassed: false,
    allCasesOperational: false
  };

  try {
    for (const tier of tiers) {
      for (const view of views) {
        const config = { ...tier, view };
        const shouldCapture = tier.name === 'large' && view === 'ssfr';
        const result = await runCase(context, config, shouldCapture);
        report.cases.push(result);
        console.log(JSON.stringify({
          id: result.id,
          status: result.status,
          classification: result.classification,
          particles: result.fixed?.particleCount || null,
          fixedWallMs: result.fixed?.wallMs || null,
        actualFps: result.live?.actualFps || null,
        reportedFps: result.live?.reportedFps || null,
          simGpuMs: result.live?.timing?.simMs || null,
          renderGpuMs: result.live?.timing?.renderMs || null,
          error: result.error?.message || null
        }));
      }
    }

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    check('matrix.complete', report.cases.length === tiers.length * views.length,
      report.cases.map(item => item.id));
    for (const item of report.cases) {
      check(`${item.id}.recorded`, item.status === 'completed' || Boolean(item.error), item.status);
      if (item.status === 'completed') {
        check(`${item.id}.webgpu`, item.fixed.webgpuContext && item.fixed.hasDevice &&
          item.live.webgpuContext, item.fixed.adapterLabel);
        check(`${item.id}.ticks`, item.fixed.actualTicks === item.fixedTicks,
          { requested: item.fixedTicks, actual: item.fixed.actualTicks });
        check(`${item.id}.finite`, item.fixed.nonFinite === 0, item.fixed.nonFinite);
        check(`${item.id}.count`, item.fixed.particleCount >= item.targetParticles * 0.9,
          { target: item.targetParticles, actual: item.fixed.particleCount });
        check(`${item.id}.liveResult`, item.live.particles === item.fixed.particleCount &&
          Number.isFinite(item.live.actualFps) && item.live.rafFrames > 0, item.live);
        check(`${item.id}.errors`, item.consoleErrors.length === 0 && item.pageErrors.length === 0,
          { consoleErrors: item.consoleErrors, pageErrors: item.pageErrors });
      }
    }
    report.gatePassed = report.checks.every(item => item.passed);
    report.allCasesOperational = report.cases.every(item => item.status === 'completed');
  } catch (error) {
    report.harnessError = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({
    gatePassed: report.gatePassed,
    allCasesOperational: report.allCasesOperational,
    cases: report.cases.length,
    classifications: Object.fromEntries(report.cases.map(item => [item.id, item.classification])),
    failedChecks: report.checks.filter(item => !item.passed).map(item => item.name),
    harnessError: report.harnessError?.message || null,
    outputPath
  }, null, 2));
  process.exitCode = report.gatePassed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
