const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL || 'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'boundary-capability-gate.json');

function close(a, b, tolerance = 1e-5) {
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

  async function loadEngine(query) {
    await page.evaluate(queryString => {
      document.querySelector('#engine-frame').src = `./engine/index.html?${queryString}`;
    }, query);
    await page.waitForFunction(() => {
      const runtime = window.__particles4allLab?.runtime;
      return runtime?.window?.__sim?.n > 0 && typeof runtime.window.__readBuf === 'function';
    }, null, { timeout: 60000 });
  }

  async function probe(label, boundaryEnabled, resize = false) {
    await loadEngine(`preset=small&view=particles&particles=1000&bodies=0&boundary=${boundaryEnabled ? 1 : 0}`);
    return page.evaluate(async ({ label, boundaryEnabled, resize }) => {
      const runtime = window.__particles4allLab.runtime;
      await runtime.reset();
      const sim = runtime.window.__sim;
      const originalBox = Array.from(sim.params.box);
      const halfD = 0.5 * sim.params.spacing;
      const readBoundary = async () => {
        const raw = await runtime.window.__readBuf(sim.buf.bpos, sim.nBoundary * 16);
        const points = Array.from({ length: sim.nBoundary }, (_, index) =>
          raw.slice(index * 4, index * 4 + 3));
        const box = Array.from(sim.params.box);
        const faces = [0, 0, 0, 0, 0, 0];
        for (const point of points) {
          for (let axis = 0; axis < 3; axis += 1) {
            if (Math.abs(point[axis]) < 1e-5) faces[axis * 2] += 1;
            if (Math.abs(point[axis] - box[axis]) < 1e-5) faces[axis * 2 + 1] += 1;
          }
        }
        return { count: sim.nBoundary, faces, box };
      };

      const boundaryBefore = await readBoundary();
      const positions = [];
      const velocities = [];
      for (let iy = 0; iy < 4; iy += 1) {
        for (let iz = 0; iz < 4; iz += 1) {
          positions.push(originalBox[0] - halfD - 0.005, 0.45 + iy * sim.params.spacing,
            0.45 + iz * sim.params.spacing);
          velocities.push(5, 0, 0);
        }
      }
      const injection = await runtime.injectFluid({ positions, velocities });
      const step = await runtime.step(12);
      const sampled = await runtime.sample({ positions: true, phases: true });
      let maxX = -Infinity;
      let nonFinite = 0;
      for (let i = 0; i < sampled.summary.particleCount; i += 1) {
        if (sampled.phases[i * 4] !== 0) continue;
        const x = sampled.positions[i * 4];
        if (!Number.isFinite(x)) nonFinite += 1;
        else maxX = Math.max(maxX, x);
      }

      let resized = null;
      if (resize) {
        const newBox = [originalBox[0] * 0.8, originalBox[1], originalBox[2]];
        sim.resizeBox(newBox);
        await runtime.flush();
        const boundaryAfter = await readBoundary();
        const after = await runtime.sample({ positions: true, phases: true });
        let maxAfterX = -Infinity;
        for (let i = 0; i < after.summary.particleCount; i += 1) {
          if (after.phases[i * 4] === 0) maxAfterX = Math.max(maxAfterX, after.positions[i * 4]);
        }
        resized = { newBox, boundaryAfter, maxAfterX, generation: after.summary.generation };
      }

      return {
        label, boundaryEnabled,
        paramsNoBoundary: sim.params.noBoundary,
        originalBox, halfD, boundaryBefore, injection, step, maxX, nonFinite, resized,
        adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null,
        webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu'))
      };
    }, { label, boundaryEnabled, resize });
  }

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null, { timeout: 60000 });
    report.runs.push(await probe('boundary-on', true, true));
    report.runs.push(await probe('boundary-off', false, false));

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    const [on, off] = report.runs;
    for (const run of report.runs) {
      check(`${run.label}.sixFaces`, run.boundaryBefore.faces.every(count => count > 0), run.boundaryBefore);
      check(`${run.label}.injected`, run.injection.added === 16, run.injection);
      check(`${run.label}.ticks`, run.step.actualTicks === 12, run.step);
      check(`${run.label}.clamped`, run.maxX <= run.originalBox[0] - run.halfD + 2e-4,
        { maxX: run.maxX, limit: run.originalBox[0] - run.halfD });
      check(`${run.label}.finite`, run.nonFinite === 0, run.nonFinite);
      check(`${run.label}.webgpu`, run.webgpuContext === true, run.adapterLabel);
    }
    check('boundaryToggle', on.paramsNoBoundary === false && off.paramsNoBoundary === true,
      { on: on.paramsNoBoundary, off: off.paramsNoBoundary });
    check('boundaryAllocationPersists', on.boundaryBefore.count === off.boundaryBefore.count,
      { on: on.boundaryBefore.count, off: off.boundaryBefore.count });
    check('offStillClamped', off.maxX <= off.originalBox[0] - off.halfD + 2e-4,
      { maxX: off.maxX, limit: off.originalBox[0] - off.halfD });
    check('resize.wholeShell', on.resized.boundaryAfter.faces.every(count => count > 0), on.resized);
    check('resize.onlyXDimension', close(on.resized.boundaryAfter.box[0], on.originalBox[0] * 0.8) &&
      close(on.resized.boundaryAfter.box[1], on.originalBox[1]) &&
      close(on.resized.boundaryAfter.box[2], on.originalBox[2]), on.resized);
    check('resize.clampsAllParticles', on.resized.maxAfterX <= on.resized.newBox[0] - on.halfD + 2e-4,
      on.resized);
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'boundary-capability-gate.png'), fullPage: true });
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
})().catch(error => { console.error(error); process.exitCode = 1; });
