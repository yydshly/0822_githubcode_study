const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL || 'http://127.0.0.1:8107/demos/particles4all/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'container-feasibility-gate.json');

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
  const report = { shapes: [], checks: [], consoleErrors, pageErrors, passed: false };

  async function probeShape(shape) {
    const query = `preset=small&view=particles&particles=1000&body=${shape}:1:0.7&bodysize=0.15`;
    await page.evaluate(queryString => {
      document.querySelector('#engine-frame').src = `./engine/index.html?${queryString}`;
    }, query);
    await page.waitForFunction(expectedShape => {
      const runtime = window.__particles4allLab?.runtime;
      return runtime?.window?.__sim?.bodies?.[0]?.shape === expectedShape;
    }, shape, { timeout: 60000 });
    return page.evaluate(async shapeName => {
      const runtime = window.__particles4allLab.runtime;
      await runtime.reset();
      const sim = runtime.window.__sim;
      const sampled = await runtime.sample({ positions: true, phases: true });
      const bodySample = await runtime.sampleBodies();
      const body = bodySample.bodies[0];
      const points = [];
      let nonFinite = 0;
      for (let i = 0; i < sampled.summary.particleCount; i += 1) {
        if (sampled.phases[i * 4] === 0) continue;
        const local = sampled.positions.slice(i * 4, i * 4 + 3)
          .map((value, axis) => value - body.pose.centre[axis]);
        if (local.some(value => !Number.isFinite(value))) nonFinite += 1;
        else points.push(local);
      }
      const nearCentre = points.filter(point => Math.hypot(...point) <= sim.params.spacing * 1.1).length;
      const radial = points.map(point => Math.hypot(point[0], point[2]));
      const extents = [0, 1, 2].map(axis => Math.max(...points.map(point => Math.abs(point[axis]))));
      const methods = {
        holdBody: typeof sim.holdBody === 'function',
        releaseBody: typeof sim.releaseBody === 'function',
        setBodyPose: typeof sim.setBodyPose === 'function',
        setBodyRotation: typeof sim.setBodyRotation === 'function',
        addStaticCollider: typeof sim.addStaticCollider === 'function'
      };
      return {
        shape: shapeName,
        metadata: body,
        bodyParticleCount: points.length,
        nearCentre,
        minRadial: Math.min(...radial),
        maxRadial: Math.max(...radial),
        extents,
        nonFinite,
        methods,
        webgpuContext: Boolean(runtime.window.document.querySelector('canvas#view')?.getContext('webgpu')),
        adapterLabel: runtime.window.document.querySelector('#adapter')?.textContent || null
      };
    }, shape);
  }

  try {
    await page.goto(`${baseUrl}?scenario=buoyancy&variant=light`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null, { timeout: 60000 });
    for (const shape of ['box', 'sphere', 'torus']) report.shapes.push(await probeShape(shape));

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    for (const shape of report.shapes) {
      check(`${shape.shape}.identity`, shape.metadata.shape === shape.shape && shape.metadata.key === 'body-1', shape.metadata);
      check(`${shape.shape}.count`, shape.bodyParticleCount === shape.metadata.particleCount && shape.bodyParticleCount > 0,
        { sampled: shape.bodyParticleCount, metadata: shape.metadata.particleCount });
      check(`${shape.shape}.finite`, shape.nonFinite === 0, shape.nonFinite);
      check(`${shape.shape}.rotationIdentity`, JSON.stringify(shape.metadata.pose.rot) ===
        JSON.stringify([1, 0, 0, 0, 1, 0, 0, 0, 1]), shape.metadata.pose.rot);
      check(`${shape.shape}.webgpu`, shape.webgpuContext === true, shape.adapterLabel);
    }
    const byName = Object.fromEntries(report.shapes.map(shape => [shape.shape, shape]));
    check('box.volumeFilled', byName.box.nearCentre > 0, byName.box);
    check('sphere.volumeFilled', byName.sphere.nearCentre > 0, byName.sphere);
    check('torus.centralHole', byName.torus.nearCentre === 0 && byName.torus.minRadial > 0.05, byName.torus);
    check('torus.ringNotCup', byName.torus.extents[1] < byName.torus.extents[0] &&
      byName.torus.extents[1] < byName.torus.extents[2], byName.torus.extents);
    const methods = byName.box.methods;
    check('control.translationOnly', methods.holdBody && methods.releaseBody &&
      !methods.setBodyPose && !methods.setBodyRotation, methods);
    check('control.noStaticCollider', !methods.addStaticCollider, methods);
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: path.join(outputDir, 'container-feasibility-gate.png'), fullPage: true });
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
  } finally {
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length,
    failed: report.checks.filter(item => !item.passed).map(item => item.name),
    error: report.error?.message || null, outputPath }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
