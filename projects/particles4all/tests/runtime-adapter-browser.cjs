const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const headless = process.env.HEADLESS !== '0';
const ticks = Number(process.env.SOLVER_TICKS || 24);
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-adapter-equivalence.json');

const engineQuery = [
  'preset=small',
  'view=ssfr',
  'particles=28000',
  'body=sphere:0.22:0.82',
  'bodysize=0.085',
  'grab=1',
  'ssfrscale=0.5'
].join('&');

function difference(a, b) {
  return Math.abs(Number(a) - Number(b));
}

function compareMetrics(direct, adapter) {
  const checks = [];
  const exact = (name, a, b) => checks.push({ name, passed: a === b, direct: a, adapter: b });
  const close = (name, a, b, tolerance) => checks.push({
    name,
    passed: Number.isFinite(a) && Number.isFinite(b) && difference(a, b) <= tolerance,
    direct: a,
    adapter: b,
    difference: difference(a, b),
    tolerance
  });

  exact('particleCount', direct.particleCount, adapter.particleCount);
  exact('fluidParticleCount', direct.fluidParticleCount, adapter.fluidParticleCount);
  exact('rigidParticleCount', direct.rigidParticleCount, adapter.rigidParticleCount);
  exact('nonFinite.direct', direct.nonFinite, 0);
  exact('nonFinite.adapter', adapter.nonFinite, 0);
  exact('actualTicks.direct', direct.actualTicks, ticks);
  exact('actualTicks.adapter', adapter.actualTicks, ticks);
  close('simTime', direct.simTime, adapter.simTime, 1e-9);
  close('fluid.centroid.x', direct.fluid.centroid[0], adapter.fluid.centroid[0], 2e-4);
  close('fluid.centroid.y', direct.fluid.centroid[1], adapter.fluid.centroid[1], 2e-4);
  close('fluid.centroid.z', direct.fluid.centroid[2], adapter.fluid.centroid[2], 2e-4);
  for (const axis of ['x', 'y', 'z']) {
    for (const q of ['p05', 'p50', 'p95']) {
      close(`fluid.${axis}.${q}`, direct.fluid[axis][q], adapter.fluid[axis][q], 5e-4);
    }
  }
  close('rigid.centroid.x', direct.rigid.centroid[0], adapter.rigid.centroid[0], 5e-4);
  close('rigid.centroid.y', direct.rigid.centroid[1], adapter.rigid.centroid[1], 5e-4);
  close('rigid.centroid.z', direct.rigid.centroid[2], adapter.rigid.centroid[2], 5e-4);
  close('bodyPose[0].x', direct.bodyPose[0]?.centre[0], adapter.bodyPose[0]?.centre[0], 1e-3);
  close('bodyPose[0].y', direct.bodyPose[0]?.centre[1], adapter.bodyPose[0]?.centre[1], 1e-3);
  close('bodyPose[0].z', direct.bodyPose[0]?.centre[2], adapter.bodyPose[0]?.centre[2], 1e-3);
  return checks;
}

async function waitForEngine(page, expression, timeout = 60000) {
  await page.waitForFunction(expression, null, { timeout });
}

async function collectDirect(page) {
  const url = `${baseUrl}engine/?${engineQuery}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page, () => Boolean(window.__sim?.n || window.__gpuError));
  const result = await page.evaluate(async solverTicks => {
    if (window.__gpuError) throw new Error(window.__gpuError);
    const sim = window.__sim;
    if (!window.__ui.paused) document.getElementById('pause')?.click();
    document.getElementById('reset')?.click();
    sim.timeBank = 0;
    sim.lastAdvanced = 0;
    sim.lastSubsteps = 0;
    const dt = (1 / 60) / Math.max(1, Number(sim.params?.substeps) || 1);
    const start = sim.simTime;
    for (let i = 0; i < solverTicks; i += 1) sim.step(dt);
    await sim.dev.queue.onSubmittedWorkDone();
    const bytes = sim.n * 16;
    const [positions, phases] = await Promise.all([
      window.__readBuf(sim.livePos(), bytes),
      window.__readBuf(sim.liveBody(), bytes)
    ]);

    const summarize = () => {
      const fluid = [[], [], []];
      const rigid = [[], [], []];
      let nonFinite = 0;
      for (let i = 0; i < sim.n; i += 1) {
        const target = phases[i * 4] === 0 ? fluid : rigid;
        for (let axis = 0; axis < 3; axis += 1) {
          const value = positions[i * 4 + axis];
          if (!Number.isFinite(value)) nonFinite += 1;
          else target[axis].push(value);
        }
      }
      const quantiles = values => {
        values.sort((a, b) => a - b);
        const at = p => values[Math.max(0, Math.min(values.length - 1,
          Math.round((values.length - 1) * p)))] ?? null;
        return { p05: at(0.05), p50: at(0.5), p95: at(0.95) };
      };
      const centroid = values => values.map(axis =>
        axis.reduce((sum, value) => sum + value, 0) / Math.max(1, axis.length));
      return {
        particleCount: sim.n,
        fluidParticleCount: fluid[0].length,
        rigidParticleCount: rigid[0].length,
        nonFinite,
        simTime: sim.simTime,
        actualTicks: Math.round((sim.simTime - start) / dt),
        stepDt: dt,
        fluid: { centroid: centroid(fluid), x: quantiles(fluid[0]), y: quantiles(fluid[1]), z: quantiles(fluid[2]) },
        rigid: { centroid: centroid(rigid), x: quantiles(rigid[0]), y: quantiles(rigid[1]), z: quantiles(rigid[2]) },
        bodyPose: (sim.bodyPose || []).map(pose => ({ centre: [...pose.centre], rot: [...pose.rot] })),
        stats: { ...(sim.stats || {}) },
        canvas: Boolean(document.querySelector('canvas#view')),
        webgpuContext: Boolean(document.querySelector('canvas#view')?.getContext('webgpu'))
      };
    };
    return summarize();
  }, ticks);
  await page.screenshot({ path: path.join(outputDir, 'runtime-adapter-direct.png') });
  return result;
}

async function collectAdapter(page) {
  const url = `${baseUrl}?scenario=buoyancy&variant=light`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page, () => Boolean(
    window.__particles4allLab?.engineReady ||
    document.querySelector('.runtime-card')?.dataset?.state === 'error'
  ));
  const result = await page.evaluate(async solverTicks => {
    const runtime = window.__particles4allLab.runtime;
    await runtime.connect();
    await runtime.reset();
    const step = await runtime.step(solverTicks);
    const sampled = await runtime.sample({ positions: true, phases: true });
    const { positions, phases, summary } = sampled;
    const fluid = [[], [], []];
    const rigid = [[], [], []];
    let nonFinite = 0;
    for (let i = 0; i < summary.particleCount; i += 1) {
      const target = phases[i * 4] === 0 ? fluid : rigid;
      for (let axis = 0; axis < 3; axis += 1) {
        const value = positions[i * 4 + axis];
        if (!Number.isFinite(value)) nonFinite += 1;
        else target[axis].push(value);
      }
    }
    const quantiles = values => {
      values.sort((a, b) => a - b);
      const at = p => values[Math.max(0, Math.min(values.length - 1,
        Math.round((values.length - 1) * p)))] ?? null;
      return { p05: at(0.05), p50: at(0.5), p95: at(0.95) };
    };
    const centroid = values => values.map(axis =>
      axis.reduce((sum, value) => sum + value, 0) / Math.max(1, axis.length));
    const frame = document.querySelector('#engine-frame');
    return {
      classification: summary.classification,
      upstreamRuntime: summary.upstreamRuntime,
      particleCount: summary.particleCount,
      fluidParticleCount: fluid[0].length,
      rigidParticleCount: rigid[0].length,
      nonFinite,
      simTime: summary.simTime,
      actualTicks: step.actualTicks,
      stepDt: step.stepDt,
      fluid: { centroid: centroid(fluid), x: quantiles(fluid[0]), y: quantiles(fluid[1]), z: quantiles(fluid[2]) },
      rigid: { centroid: centroid(rigid), x: quantiles(rigid[0]), y: quantiles(rigid[1]), z: quantiles(rigid[2]) },
      bodyPose: sampled.bodyPose,
      stats: sampled.stats,
      canvas: Boolean(frame?.contentDocument?.querySelector('canvas#view')),
      webgpuContext: Boolean(frame?.contentDocument?.querySelector('canvas#view')?.getContext('webgpu')),
      pageTextLength: document.body.innerText.trim().length,
      keyElements: {
        runtime: Boolean(document.querySelector('.runtime-card')),
        scenarioList: document.querySelectorAll('.scenario-button').length,
        viewport: Boolean(document.querySelector('#engine-frame')),
        scope: Boolean(document.querySelector('.scope-card'))
      }
    };
  }, ticks);
  await page.screenshot({ path: path.join(outputDir, 'runtime-adapter-lab.png'), fullPage: true });
  return result;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let cdpGpu = null;
  try {
    const session = await browser.newBrowserCDPSession();
    cdpGpu = await session.send('SystemInfo.getInfo');
  } catch {
    // GPU identity is supporting evidence; runtime checks remain authoritative.
  }
  const directPage = await context.newPage();
  const adapterPage = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  for (const [label, page] of [['direct', directPage], ['adapter', adapterPage]]) {
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push({ page: label, text: message.text() });
    });
    page.on('pageerror', error => pageErrors.push({ page: label, text: error.message }));
  }

  const report = {
    protocol: { ticks, engineQuery, headless, executablePath },
    environment: {},
    direct: null,
    adapter: null,
    checks: [],
    consoleErrors,
    pageErrors,
    passed: false
  };

  try {
    report.direct = await collectDirect(directPage);
    report.adapter = await collectAdapter(adapterPage);
    report.environment = {
      ...(await directPage.evaluate(() => ({
      userAgent: navigator.userAgent,
      hasWebGPU: Boolean(navigator.gpu),
      hasDevice: Boolean(window.__sim?.dev),
      canvas: Boolean(document.querySelector('canvas#view')),
      adapterLabel: document.querySelector('#adapter')?.textContent || null
      }))),
      cdpGpu
    };
    report.checks = compareMetrics(report.direct, report.adapter);
    report.checks.push(
      { name: 'direct.webgpuContext', passed: report.direct.webgpuContext === true },
      { name: 'adapter.webgpuContext', passed: report.adapter.webgpuContext === true },
      { name: 'adapter.upstreamRuntime', passed: report.adapter.upstreamRuntime === true },
      { name: 'adapter.classification', passed: report.adapter.classification === 'E1 runtime adapter' },
      { name: 'adapter.pageContent', passed: report.adapter.pageTextLength > 200 },
      { name: 'adapter.keyElements', passed: report.adapter.keyElements.runtime &&
        report.adapter.keyElements.scenarioList === 9 && report.adapter.keyElements.viewport &&
        report.adapter.keyElements.scope },
      { name: 'consoleErrors', passed: consoleErrors.length === 0, value: consoleErrors },
      { name: 'pageErrors', passed: pageErrors.length === 0, value: pageErrors }
    );
    report.passed = report.checks.every(check => check.passed);
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  const summary = {
    passed: report.passed,
    checks: report.checks.length,
    failed: report.checks.filter(check => !check.passed).map(check => check.name),
    error: report.error?.message || null,
    outputPath
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
