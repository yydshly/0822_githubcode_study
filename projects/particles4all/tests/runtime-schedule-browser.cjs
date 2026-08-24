const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-schedule-gate.json');

const near = (a, b, tolerance) => Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= tolerance;

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

    for (let run = 0; run < 2; run += 1) {
      report.runs.push(await page.evaluate(async () => {
        const runtime = window.__particles4allLab.runtime;
        await runtime.connect();
        const sim = runtime.window.__sim;
        const d = sim.params.spacing;
        const box = sim.params.box;
        const makePacket = xOffset => {
          const positions = [];
          const velocities = [];
          for (let ix = 0; ix < 2; ix += 1) {
            for (let iy = 0; iy < 2; iy += 1) {
              for (let iz = 0; iz < 2; iz += 1) {
                positions.push(
                  box[0] * (0.46 + xOffset) + ix * d,
                  box[1] * 0.72 + iy * d,
                  box[2] * 0.48 + iz * d
                );
                velocities.push(0, -1.5, 0);
              }
            }
          }
          return { positions, velocities };
        };
        const packetA = makePacket(0);
        const packetB = makePacket(0.04);
        const schedule = await runtime.runSchedule({
          ticks: 12,
          reset: true,
          events: [
            { id: 'inject-a', tick: 0, type: 'injectFluid', payload: packetA },
            { id: 'sample-t0', tick: 0, type: 'sample' },
            { id: 'sample-pre-b', tick: 6, type: 'sample' },
            { id: 'inject-b', tick: 6, type: 'injectFluid', payload: packetB },
            { id: 'sample-post-b', tick: 6, type: 'sample' },
            { id: 'sample-final', tick: 12, type: 'sample' }
          ]
        });
        const final = await runtime.sample({ positions: true, phases: true });
        const fluid = [[], [], []];
        let nonFinite = 0;
        for (let i = 0; i < final.summary.particleCount; i += 1) {
          if (final.phases[i * 4] !== 0) continue;
          for (let axis = 0; axis < 3; axis += 1) {
            const value = final.positions[i * 4 + axis];
            if (!Number.isFinite(value)) nonFinite += 1;
            else fluid[axis].push(value);
          }
        }
        const centroid = fluid.map(axis =>
          axis.reduce((sum, value) => sum + value, 0) / Math.max(1, axis.length));
        return {
          schedule: {
            requestedTicks: schedule.requestedTicks,
            actualTicks: schedule.actualTicks,
            stepDt: schedule.stepDt,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            history: schedule.history.map(event => ({
              id: event.id,
              type: event.type,
              tick: event.tick,
              order: event.order,
              simTime: event.simTime,
              particleCount: event.result.summary?.particleCount ?? event.result.after,
              added: event.result.added ?? null
            }))
          },
          final: final.summary,
          nonFinite,
          centroid,
          adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
          webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu')),
          scheduledEvents: runtime.support.scheduledEvents
        };
      }));
    }

    const [a, b] = report.runs;
    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    const expectedIds = ['inject-a', 'sample-t0', 'sample-pre-b', 'inject-b', 'sample-post-b', 'sample-final'];
    for (const [index, run] of report.runs.entries()) {
      const history = run.schedule.history;
      check(`run${index + 1}.ids`, JSON.stringify(history.map(event => event.id)) === JSON.stringify(expectedIds));
      check(`run${index + 1}.ticks`, run.schedule.actualTicks === 12, run.schedule);
      check(`run${index + 1}.endTime`, near(run.schedule.endTime, 0.1, 1e-9), run.schedule.endTime);
      check(`run${index + 1}.eventTimes`,
        near(history[0].simTime, 0, 1e-12) && near(history[1].simTime, 0, 1e-12) &&
        near(history[2].simTime, 0.05, 1e-9) && near(history[3].simTime, 0.05, 1e-9) &&
        near(history[4].simTime, 0.05, 1e-9) && near(history[5].simTime, 0.1, 1e-9), history);
      check(`run${index + 1}.sameTickOrder`, history[2].order < history[3].order && history[3].order < history[4].order);
      check(`run${index + 1}.counts`,
        history[0].added === 8 && history[1].particleCount === 28349 &&
        history[2].particleCount === 28349 && history[3].added === 8 &&
        history[4].particleCount === 28357 && history[5].particleCount === 28357, history);
      check(`run${index + 1}.finalCount`, run.final.particleCount === 28357, run.final);
      check(`run${index + 1}.nonFinite`, run.nonFinite === 0, run.nonFinite);
      check(`run${index + 1}.webgpu`, run.webgpuContext === true, run.adapterLabel);
      check(`run${index + 1}.support`, run.scheduledEvents === true);
    }
    check('repeat.finalCount', a.final.particleCount === b.final.particleCount);
    for (let axis = 0; axis < 3; axis += 1) {
      check(`repeat.centroid.${axis}`, near(a.centroid[axis], b.centroid[axis], 5e-4),
        { a: a.centroid[axis], b: b.centroid[axis] });
    }
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'runtime-schedule-gate.png'), fullPage: true });
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
