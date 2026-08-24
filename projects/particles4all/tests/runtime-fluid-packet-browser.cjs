const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-fluid-packet-gate.json');

function close(a, b, tolerance) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== '0', executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  const report = { runs: [], checks: [], consoleErrors, pageErrors, passed: false };

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null,
      { timeout: 60000 });

    for (let run = 0; run < 2; run += 1) {
      report.runs.push(await page.evaluate(async () => {
        const runtime = window.__particles4allLab.runtime;
        await runtime.reset();
        const sim = runtime.window.__sim;
        const d = sim.params.spacing;
        const packet = runtime.createFluidBlock({
          origin: [sim.params.box[0] * 0.48, sim.params.box[1] * 0.70, sim.params.box[2] * 0.48],
          counts: [3, 2, 2],
          spacing: d,
          velocity: [0, -1.25, 0]
        });
        const keys = [];
        for (let i = 0; i < packet.count; i += 1) {
          keys.push(Array.from(packet.positions.slice(i * 3, i * 3 + 3)).join(','));
        }
        const before = runtime.describe();
        const injection = await runtime.injectFluid(packet);
        await runtime.step(12);
        const sampled = await runtime.sample({ positions: true, phases: true });
        let nonFinite = 0;
        const sums = [0, 0, 0];
        let fluidCount = 0;
        for (let i = 0; i < sampled.summary.particleCount; i += 1) {
          if (sampled.phases[i * 4] !== 0) continue;
          fluidCount += 1;
          for (let axis = 0; axis < 3; axis += 1) {
            const value = sampled.positions[i * 4 + axis];
            if (!Number.isFinite(value)) nonFinite += 1;
            else sums[axis] += value;
          }
        }
        return {
          packet: {
            kind: packet.kind,
            config: packet.config,
            count: packet.count,
            positionLength: packet.positions.length,
            velocityLength: packet.velocities.length,
            uniquePositions: new Set(keys).size,
            serializable: JSON.parse(JSON.stringify(packet.config))
          },
          solverSpacing: d,
          before,
          injection,
          after: sampled.summary,
          nonFinite,
          centroid: sums.map(sum => sum / Math.max(1, fluidCount)),
          adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
          webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
        };
      }));
    }

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    for (const [index, run] of report.runs.entries()) {
      const prefix = `run${index + 1}`;
      check(`${prefix}.kind`, run.packet.kind === 'fluid-block', run.packet.kind);
      check(`${prefix}.count`, run.packet.count === 12, run.packet);
      check(`${prefix}.lengths`, run.packet.positionLength === 36 && run.packet.velocityLength === 36, run.packet);
      check(`${prefix}.unique`, run.packet.uniquePositions === 12, run.packet.uniquePositions);
      check(`${prefix}.serializable`, JSON.stringify(run.packet.config) === JSON.stringify(run.packet.serializable));
      check(`${prefix}.spacing`, close(run.packet.config.spacing, run.solverSpacing, 1e-9),
        { packet: run.packet.config.spacing, solver: run.solverSpacing });
      check(`${prefix}.injected`, run.injection.added === 12 && !run.injection.clamped, run.injection);
      check(`${prefix}.fluidCount`, run.after.fluidParticleCount === run.before.fluidParticleCount + 12);
      check(`${prefix}.nonFinite`, run.nonFinite === 0, run.nonFinite);
      check(`${prefix}.webgpu`, run.webgpuContext === true, run.adapterLabel);
    }
    const [a, b] = report.runs;
    check('repeat.config', JSON.stringify(a.packet.config) === JSON.stringify(b.packet.config));
    check('repeat.finalCount', a.after.particleCount === b.after.particleCount);
    for (let axis = 0; axis < 3; axis += 1) {
      check(`repeat.centroid.${axis}`, close(a.centroid[axis], b.centroid[axis], 5e-4),
        { a: a.centroid[axis], b: b.centroid[axis] });
    }
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'runtime-fluid-packet-gate.png'), fullPage: true });
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
