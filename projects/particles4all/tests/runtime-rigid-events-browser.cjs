const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'runtime-rigid-events-gate.json');

function close(a, b, tolerance) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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
        const initial = await runtime.sampleBodies();
        const centre = initial.bodies[0].pose.centre;
        const target = [centre[0] + 0.08, centre[1] + 0.02, centre[2]];
        const schedule = await runtime.runSchedule({
          ticks: 24,
          reset: true,
          events: [
            { id: 'initial', tick: 0, type: 'sampleBodies' },
            { id: 'hold', tick: 0, type: 'holdBody', payload: {
              bodyId: 1, target, rate: 18, limit: 1.2
            } },
            { id: 'held', tick: 12, type: 'sampleBodies' },
            { id: 'release', tick: 12, type: 'releaseBody' },
            { id: 'released', tick: 12, type: 'sampleBodies' },
            { id: 'final', tick: 24, type: 'sampleBodies' }
          ]
        });
        const compact = schedule.history.map(event => ({
          id: event.id,
          type: event.type,
          tick: event.tick,
          order: event.order,
          simTime: event.simTime,
          result: event.type === 'sampleBodies' ? {
            bodyCount: event.result.bodies.length,
            body: event.result.bodies[0]
          } : event.result
        }));
        return {
          requestedTicks: schedule.requestedTicks,
          actualTicks: schedule.actualTicks,
          endTime: schedule.endTime,
          target,
          history: compact,
          support: runtime.support,
          adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
          webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
        };
      }));
    }

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    const expectedIds = ['initial', 'hold', 'held', 'release', 'released', 'final'];
    for (const [index, run] of report.runs.entries()) {
      const prefix = `run${index + 1}`;
      const samples = Object.fromEntries(run.history
        .filter(event => event.type === 'sampleBodies')
        .map(event => [event.id, event.result.body]));
      check(`${prefix}.ids`, JSON.stringify(run.history.map(event => event.id)) === JSON.stringify(expectedIds));
      check(`${prefix}.ticks`, run.actualTicks === 24 && close(run.endTime, 0.2, 1e-9), run);
      check(`${prefix}.sameTickOrder`, run.history[2].tick === 12 && run.history[3].tick === 12 &&
        run.history[4].tick === 12 && run.history[2].order < run.history[3].order &&
        run.history[3].order < run.history[4].order);
      check(`${prefix}.identity`, Object.values(samples).every(body =>
        body.id === 1 && body.key === 'body-1' && body.shape === 'sphere'), samples);
      check(`${prefix}.initialPose`, distance(samples.initial.initialCentre, samples.initial.pose.centre) < 1e-5,
        samples.initial);
      check(`${prefix}.heldMoved`, distance(samples.initial.pose.centre, samples.held.pose.centre) > 0.01,
        { initial: samples.initial.pose.centre, held: samples.held.pose.centre });
      check(`${prefix}.towardTarget`, distance(samples.held.pose.centre, run.target) <
        distance(samples.initial.pose.centre, run.target),
        { target: run.target, initial: samples.initial.pose.centre, held: samples.held.pose.centre });
      check(`${prefix}.release`, run.history[3].result.held === false, run.history[3]);
      check(`${prefix}.releasePoint`, distance(samples.held.pose.centre, samples.released.pose.centre) < 1e-7,
        { held: samples.held.pose.centre, released: samples.released.pose.centre });
      check(`${prefix}.finite`, Object.values(samples).every(body =>
        [...body.pose.centre, ...body.pose.rot].every(Number.isFinite)), samples);
      check(`${prefix}.rotation`, Object.values(samples).every(body => body.pose.rot.length === 9));
      check(`${prefix}.support`, run.support.directBodySampling === true && run.support.rigidBodyEvents === true);
      check(`${prefix}.webgpu`, run.webgpuContext === true, run.adapterLabel);
    }
    const [a, b] = report.runs;
    check('repeat.ids', JSON.stringify(a.history.map(event => event.id)) === JSON.stringify(b.history.map(event => event.id)));
    for (const eventId of ['initial', 'held', 'released', 'final']) {
      const bodyA = a.history.find(event => event.id === eventId).result.body;
      const bodyB = b.history.find(event => event.id === eventId).result.body;
      for (let axis = 0; axis < 3; axis += 1) {
        check(`repeat.${eventId}.centre.${axis}`,
          close(bodyA.pose.centre[axis], bodyB.pose.centre[axis], 8e-4),
          { a: bodyA.pose.centre[axis], b: bodyB.pose.centre[axis] });
      }
    }
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'runtime-rigid-events-gate.png'), fullPage: true });
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
