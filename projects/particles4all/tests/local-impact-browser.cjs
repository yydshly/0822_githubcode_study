const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL || 'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'local-impact-gate.json');
const queries = {
  fluidOnly: 'preset=small&view=ssfr&particles=28000&bodies=0&ssfrscale=0.5',
  withBody: 'preset=small&view=ssfr&particles=28000&body=sphere:0.5:0.76&bodysize=0.15&ssfrscale=0.5'
};

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
  const report = { protocol: { ticks: 30, packetCounts: [8, 6, 8], queries }, runs: [], checks: [], consoleErrors, pageErrors, passed: false };

  async function runVariant(label, query, expectedBodies) {
    await page.evaluate(queryString => {
      const frame = document.querySelector('#engine-frame');
      frame.src = `./engine/index.html?${queryString}`;
    }, query);
    await page.waitForFunction(bodyCount => {
      const runtime = window.__particles4allLab?.runtime;
      return runtime?.window?.__sim?.nBodies === bodyCount &&
        typeof runtime.window.__readBuf === 'function';
    }, expectedBodies, { timeout: 60000 });

    return page.evaluate(async ({ label, query }) => {
      const runtime = window.__particles4allLab.runtime;
      await runtime.reset();
      const sim = runtime.window.__sim;
      const initial = runtime.describe();
      const initialBodies = await runtime.sampleBodies();
      const packet = runtime.createFluidBlock({
        origin: [sim.params.box[0] * 0.45, sim.params.box[1] * 0.86, sim.params.box[2] * 0.43],
        counts: [8, 6, 8],
        spacing: sim.params.spacing,
        velocity: [0, -2.5, 0]
      });
      const injection = await runtime.injectFluid(packet);
      const step = await runtime.step(30);
      const sampled = await runtime.sample({ positions: true, phases: true });
      const finalBodies = await runtime.sampleBodies();
      const fluid = [];
      let nonFinite = 0;
      for (let i = 0; i < sampled.summary.particleCount; i += 1) {
        if (sampled.phases[i * 4] !== 0) continue;
        const p = sampled.positions.slice(i * 4, i * 4 + 3);
        if (p.some(value => !Number.isFinite(value))) nonFinite += 1;
        else fluid.push(p);
      }
      const ys = fluid.map(p => p[1]).sort((a, b) => a - b);
      const radii = fluid.map(p => Math.hypot(p[0] - 0.75, p[2] - 0.5)).sort((a, b) => a - b);
      const quantile = (values, q) => values[Math.round((values.length - 1) * q)];
      const impactCount = fluid.filter(p =>
        Math.hypot(p[0] - 0.75, p[2] - 0.5) <= 0.18 && p[1] >= 0.25).length;
      const body = finalBodies.bodies[0] || null;
      const initialBody = initialBodies.bodies[0] || null;
      const bodyDisplacement = body && initialBody ? Math.hypot(
        body.pose.centre[0] - initialBody.pose.centre[0],
        body.pose.centre[1] - initialBody.pose.centre[1],
        body.pose.centre[2] - initialBody.pose.centre[2]
      ) : null;
      return {
        label, query,
        environment: {
          adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
          webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
        },
        initial,
        packet: { config: packet.config, count: packet.count },
        injection,
        step,
        final: sampled.summary,
        nonFinite,
        water: {
          count: fluid.length,
          impactCount,
          yP05: quantile(ys, 0.05),
          yP50: quantile(ys, 0.5),
          yP95: quantile(ys, 0.95),
          radialP95: quantile(radii, 0.95)
        },
        body: body ? {
          id: body.id,
          key: body.key,
          initialCentre: initialBody.pose.centre,
          finalCentre: body.pose.centre,
          finalRotation: body.pose.rot,
          displacement: bodyDisplacement,
          verticalDisplacement: body.pose.centre[1] - initialBody.pose.centre[1]
        } : null,
        stats: sampled.stats
      };
    }, { label, query });
  }

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null, { timeout: 60000 });
    report.runs.push(await runVariant('A-fluid-only', queries.fluidOnly, 0));
    report.runs.push(await runVariant('B-with-body-1', queries.withBody, 1));
    report.runs.push(await runVariant('B-with-body-2', queries.withBody, 1));

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    for (const run of report.runs) {
      check(`${run.label}.packet`, run.packet.count === 384 && close(run.packet.config.spacing, 0.02, 1e-9), run.packet);
      check(`${run.label}.injection`, run.injection.added === 384 && !run.injection.clamped, run.injection);
      check(`${run.label}.fluidCount`, run.water.count === 28384, run.water.count);
      check(`${run.label}.ticks`, run.step.actualTicks === 30 && close(run.step.endTime, 0.25, 1e-9), run.step);
      check(`${run.label}.finite`, run.nonFinite === 0, run.nonFinite);
      check(`${run.label}.webgpu`, run.environment.webgpuContext === true, run.environment.adapterLabel);
    }
    const [a, b1, b2] = report.runs;
    check('singleVariable.fluidInitial', a.initial.fluidParticleCount === b1.initial.fluidParticleCount);
    check('singleVariable.packetConfig', JSON.stringify(a.packet.config) === JSON.stringify(b1.packet.config));
    check('singleVariable.bodyCount', a.initial.bodyCount === 0 && b1.initial.bodyCount === 1,
      { a: a.initial.bodyCount, b: b1.initial.bodyCount });
    check('body.response', b1.body?.displacement > 0.005, b1.body);
    check('body.finite', b1.body && [...b1.body.finalCentre, ...b1.body.finalRotation].every(Number.isFinite), b1.body);
    const waterDifference = {
      impactCount: b1.water.impactCount - a.water.impactCount,
      yP95: b1.water.yP95 - a.water.yP95,
      radialP95: b1.water.radialP95 - a.water.radialP95
    };
    check('water.explainableDifference', Math.abs(waterDifference.impactCount) >= 10 ||
      Math.abs(waterDifference.yP95) >= 0.002 || Math.abs(waterDifference.radialP95) >= 0.002,
      waterDifference);
    check('repeat.bodyCentre', b1.body && b2.body && b1.body.finalCentre.every((value, axis) =>
      close(value, b2.body.finalCentre[axis], 0.006)), { a: b1.body, b: b2.body });
    check('repeat.water', Math.abs(b1.water.impactCount - b2.water.impactCount) <= 20 &&
      close(b1.water.yP95, b2.water.yP95, 0.003) &&
      close(b1.water.radialP95, b2.water.radialP95, 0.003), { a: b1.water, b: b2.water });
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.waterDifference = waterDifference;
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'local-impact-gate.png'), fullPage: true });
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
    waterDifference: report.waterDifference,
    error: report.error?.message || null,
    outputPath
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
