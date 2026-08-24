const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL || 'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'gate-jet-gate.json');
const queryFor = startY =>
  `preset=small&view=ssfr&particles=28000&body=box:1.35:${startY}&bodysize=0.18&ssfrscale=0.5`;

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
  const report = { protocol: { ticks: 30, releaseTick: 15, packetCounts: [5, 7, 8] }, runs: [], checks: [], consoleErrors, pageErrors, passed: false };

  async function loadEngine(startY) {
    const query = queryFor(startY);
    await page.evaluate(queryString => {
      document.querySelector('#engine-frame').src = `./engine/index.html?${queryString}`;
    }, query);
    await page.waitForFunction(() => {
      const runtime = window.__particles4allLab?.runtime;
      return runtime?.window?.__sim?.nBodies === 1 && runtime.window.__sim.bodies?.[0]?.shape === 'box';
    }, null, { timeout: 60000 });
    return query;
  }

  async function run(label, startY) {
    const query = await loadEngine(startY);
    return page.evaluate(async ({ label, query }) => {
      const runtime = window.__particles4allLab.runtime;
      await runtime.reset();
      const sim = runtime.window.__sim;
      const initialBody = (await runtime.sampleBodies()).bodies[0];
      const packet = runtime.createFluidBlock({
        origin: [0.52, 0.36, 0.43],
        counts: [5, 7, 8],
        spacing: sim.params.spacing,
        velocity: [2.5, 0, 0]
      });
      const schedule = await runtime.runSchedule({
        ticks: 30,
        reset: true,
        events: [
          { id: 'initial', tick: 0, type: 'sampleBodies' },
          { id: 'hold', tick: 0, type: 'holdBody', payload: {
            bodyId: 1, target: initialBody.pose.centre, rate: 24, limit: 1.5
          } },
          { id: 'inject', tick: 0, type: 'injectFluid', payload: packet },
          { id: 'pre-release', tick: 15, type: 'sampleBodies' },
          { id: 'release', tick: 15, type: 'releaseBody' },
          { id: 'final-body', tick: 30, type: 'sampleBodies' }
        ]
      });
      const sampled = await runtime.sample({ positions: true, phases: true });
      const fluid = [];
      let nonFinite = 0;
      for (let i = 0; i < sampled.summary.particleCount; i += 1) {
        if (sampled.phases[i * 4] !== 0) continue;
        const p = sampled.positions.slice(i * 4, i * 4 + 3);
        if (p.some(value => !Number.isFinite(value))) nonFinite += 1;
        else fluid.push(p);
      }
      const corridor = fluid.filter(p => p[0] >= 0.5 && p[1] >= 0.25 && p[1] <= 0.65 &&
        p[2] >= 0.28 && p[2] <= 0.72);
      const zs = corridor.map(p => p[2]).sort((a, b) => a - b);
      const q = (values, ratio) => values.length ? values[Math.round((values.length - 1) * ratio)] : null;
      const bodyAt = id => schedule.history.find(event => event.id === id).result.bodies[0];
      return {
        label, query,
        packet: { config: packet.config, count: packet.count },
        schedule: {
          requestedTicks: schedule.requestedTicks,
          actualTicks: schedule.actualTicks,
          endTime: schedule.endTime,
          ids: schedule.history.map(event => event.id),
          injection: schedule.history.find(event => event.id === 'inject').result
        },
        final: sampled.summary,
        nonFinite,
        water: {
          count: fluid.length,
          corridorCount: corridor.length,
          upstreamCount: corridor.filter(p => p[0] < 0.72).length,
          downstreamCount: corridor.filter(p => p[0] >= 0.85).length,
          zP05: q(zs, 0.05),
          zP95: q(zs, 0.95),
          lateralWidth: zs.length ? q(zs, 0.95) - q(zs, 0.05) : 0
        },
        body: {
          initial: bodyAt('initial'),
          preRelease: bodyAt('pre-release'),
          final: bodyAt('final-body')
        },
        adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
        webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
      };
    }, { label, query });
  }

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null, { timeout: 60000 });
    report.runs.push(await run('A-gate-clear', 0.82));
    report.runs.push(await run('B-gate-path-1', 0.45));
    report.runs.push(await run('B-gate-path-2', 0.45));

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    const expectedIds = ['initial', 'hold', 'inject', 'pre-release', 'release', 'final-body'];
    for (const run of report.runs) {
      check(`${run.label}.packet`, run.packet.count === 280 && close(run.packet.config.spacing, 0.02, 1e-9), run.packet);
      check(`${run.label}.injection`, run.schedule.injection.added === 280 && !run.schedule.injection.clamped, run.schedule.injection);
      check(`${run.label}.count`, run.water.count === 28280, run.water.count);
      check(`${run.label}.ticks`, run.schedule.actualTicks === 30 && close(run.schedule.endTime, 0.25, 1e-9), run.schedule);
      check(`${run.label}.ids`, JSON.stringify(run.schedule.ids) === JSON.stringify(expectedIds), run.schedule.ids);
      check(`${run.label}.finite`, run.nonFinite === 0, run.nonFinite);
      check(`${run.label}.bodyIdentity`, ['initial', 'preRelease', 'final'].every(key =>
        run.body[key].key === 'body-1' && run.body[key].shape === 'box'), run.body);
      check(`${run.label}.held`, Math.hypot(...run.body.preRelease.pose.centre.map((value, axis) =>
        value - run.body.initial.pose.centre[axis])) < 0.025, run.body);
      check(`${run.label}.webgpu`, run.webgpuContext === true, run.adapterLabel);
    }
    const [a, b1, b2] = report.runs;
    const difference = {
      upstreamCount: b1.water.upstreamCount - a.water.upstreamCount,
      downstreamCount: b1.water.downstreamCount - a.water.downstreamCount,
      lateralWidth: b1.water.lateralWidth - a.water.lateralWidth
    };
    check('singleVariable.packet', JSON.stringify(a.packet.config) === JSON.stringify(b1.packet.config));
    check('singleVariable.bodyShape', a.body.initial.shape === b1.body.initial.shape &&
      a.body.initial.particleCount === b1.body.initial.particleCount);
    check('water.explainableDifference', Math.abs(difference.upstreamCount) >= 12 ||
      Math.abs(difference.downstreamCount) >= 12 || Math.abs(difference.lateralWidth) >= 0.01, difference);
    check('repeat.water', Math.abs(b1.water.upstreamCount - b2.water.upstreamCount) <= 16 &&
      Math.abs(b1.water.downstreamCount - b2.water.downstreamCount) <= 16 &&
      close(b1.water.lateralWidth, b2.water.lateralWidth, 0.008), { a: b1.water, b: b2.water });
    check('repeat.body', b1.body.final.pose.centre.every((value, axis) =>
      close(value, b2.body.final.pose.centre[axis], 0.006)), { a: b1.body.final, b: b2.body.final });
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.difference = difference;
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'gate-jet-gate.png'), fullPage: true });
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length,
    failed: report.checks.filter(item => !item.passed).map(item => item.name),
    difference: report.difference, error: report.error?.message || null, outputPath }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
