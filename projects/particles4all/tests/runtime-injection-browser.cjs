const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-injection-gate.json');

function close(a, b, tolerance) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== '0',
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const report = { runs: [], checks: [], consoleErrors, pageErrors, passed: false };
  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null,
      { timeout: 60000 });

    report.environment = await page.evaluate(() => {
      const frame = document.querySelector('#engine-frame');
      return {
        userAgent: navigator.userAgent,
        adapterLabel: frame?.contentDocument?.querySelector('#adapter')?.textContent || null,
        webgpuContext: Boolean(frame?.contentDocument?.querySelector('canvas#view')?.getContext('webgpu')),
        support: window.__particles4allLab.runtime.support
      };
    });

    for (let run = 0; run < 2; run += 1) {
      report.runs.push(await page.evaluate(async () => {
        const runtime = window.__particles4allLab.runtime;
        await runtime.reset();
        const sim = runtime.window.__sim;
        const before = runtime.describe();
        const d = sim.params.spacing;
        const box = sim.params.box;
        const positions = [];
        const velocities = [];
        for (let ix = -1; ix <= 1; ix += 1) {
          for (let iy = -1; iy <= 1; iy += 1) {
            for (let iz = -1; iz <= 1; iz += 1) {
              positions.push(
                box[0] * 0.5 + ix * d,
                box[1] * 0.72 + iy * d,
                box[2] * 0.5 + iz * d
              );
              velocities.push(0, -1.5, 0);
            }
          }
        }
        const injection = await runtime.injectFluid({ positions, velocities });
        const step = await runtime.step(12);
        const sampled = await runtime.sample({ positions: true, phases: true });
        const fluid = [[], [], []];
        let nonFinite = 0;
        for (let i = 0; i < sampled.summary.particleCount; i += 1) {
          if (sampled.phases[i * 4] !== 0) continue;
          for (let axis = 0; axis < 3; axis += 1) {
            const value = sampled.positions[i * 4 + axis];
            if (!Number.isFinite(value)) nonFinite += 1;
            else fluid[axis].push(value);
          }
        }
        const centroid = fluid.map(axis =>
          axis.reduce((sum, value) => sum + value, 0) / Math.max(1, axis.length));
        const p95 = fluid.map(axis => {
          axis.sort((a, b) => a - b);
          return axis[Math.round((axis.length - 1) * 0.95)];
        });
        return {
          before,
          injection,
          step,
          after: sampled.summary,
          nonFinite,
          centroid,
          p95
        };
      }));
    }

    const [a, b] = report.runs;
    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    for (const [index, run] of report.runs.entries()) {
      check(`run${index + 1}.requested`, run.injection.requested === 27, run.injection);
      check(`run${index + 1}.added`, run.injection.added === 27, run.injection);
      check(`run${index + 1}.count`, run.injection.after === run.injection.before + 27, run.injection);
      check(`run${index + 1}.fluidCount`,
        run.after.fluidParticleCount === run.before.fluidParticleCount + 27);
      check(`run${index + 1}.ticks`, run.step.actualTicks === 12, run.step);
      check(`run${index + 1}.simTime`, close(run.after.simTime, 0.1, 1e-9), run.after.simTime);
      check(`run${index + 1}.nonFinite`, run.nonFinite === 0, run.nonFinite);
      check(`run${index + 1}.notClamped`, run.injection.clamped === false, run.injection);
    }
    check('reset.initialCount', a.before.particleCount === b.before.particleCount);
    check('repeat.finalCount', a.after.particleCount === b.after.particleCount);
    for (let axis = 0; axis < 3; axis += 1) {
      check(`repeat.centroid.${axis}`, close(a.centroid[axis], b.centroid[axis], 5e-4),
        { a: a.centroid[axis], b: b.centroid[axis] });
      check(`repeat.p95.${axis}`, close(a.p95[axis], b.p95[axis], 8e-4),
        { a: a.p95[axis], b: b.p95[axis] });
    }
    check('runtime.support', report.environment.support.directFluidInjection === true);
    check('runtime.webgpu', report.environment.webgpuContext === true);
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'runtime-injection-gate.png'), fullPage: true });
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({
    passed: report.passed,
    checks: report.checks.length,
    failed: report.checks.filter(item => !item.passed).map(item => item.name),
    error: report.error?.message || null,
    outputPath
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
