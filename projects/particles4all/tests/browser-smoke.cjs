const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/';
const outputDir = path.resolve(__dirname, '..', 'assets');
fs.mkdirSync(outputDir, { recursive: true });

async function waitForLab(page, timeout = 45000) {
  await page.waitForFunction(() => window.__particles4allLab?.engineReady === true, null, { timeout });
}

async function labState(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('#engine-frame');
    const win = frame?.contentWindow;
    return {
      title: document.querySelector('#scene-title')?.textContent,
      active: window.__particles4allLab?.active,
      activeVariant: window.__particles4allLab?.activeVariant,
      scenarioCount: window.__particles4allLab?.scenarios?.length,
      engineReady: window.__particles4allLab?.engineReady,
      particles: win?.__sim?.n || 0,
      gpuError: win?.__gpuError || null,
      canvas: Boolean(frame?.contentDocument?.querySelector('canvas#view')),
      boxScaleX: Number(frame?.contentDocument?.querySelector('#boxx')?.value || 0),
      actualBoxX: Number(win?.__sim?.params?.box?.[0] || 0),
    };
  });
}

(async () => {
  const executablePath = process.env.BROWSER_EXECUTABLE || undefined;
  const headless = process.env.HEADLESS !== '0';
  const browser = await chromium.launch({
    headless,
    executablePath,
    args: headless
      ? ['--enable-unsafe-webgpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
          '--disable-gpu-sandbox']
      : ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const report = { states: {}, verify: null, consoleErrors, pageErrors };
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await waitForLab(page);
    } catch (error) {
      report.initializationFailure = await page.evaluate(() => {
        const frame = document.querySelector('#engine-frame');
        const win = frame?.contentWindow;
        return {
          outerHasWebGPU: 'gpu' in navigator,
          innerHasWebGPU: Boolean(win?.navigator && 'gpu' in win.navigator),
          runtimeTitle: document.querySelector('#runtime-title')?.textContent,
          runtimeDetail: document.querySelector('#runtime-detail')?.textContent,
          engineLabel: document.querySelector('#engine-label')?.textContent,
          gpuError: win?.__gpuError || null,
          engineText: frame?.contentDocument?.body?.innerText?.slice(0, 800) || null,
        };
      });
      await page.screenshot({ path: path.join(outputDir, 'lab-init-failure.png'), fullPage: true });
      console.log(JSON.stringify(report, null, 2));
      throw error;
    }
    report.states.buoyancyLight = await labState(page);
    await page.screenshot({ path: path.join(outputDir, 'lab-desktop.png'), fullPage: true });

    await page.click('#run-comparison');
    await page.waitForFunction(
      () => window.__particles4allLab?.comparisonResults?.results?.length === 2,
      null,
      { timeout: 180000 }
    );
    report.comparison = await page.evaluate(() => {
      const result = window.__particles4allLab.comparisonResults;
      return {
        sceneId: result.sceneId,
        controlled: result.controlled,
        protocol: result.protocol,
        a: result.results[0].probe,
        b: result.results[1].probe,
        rows: document.querySelectorAll('#probe-table-body tr').length,
        timeline: Array.from(document.querySelectorAll('#comparison-timeline [data-step]'))
          .map(item => ({ step: item.dataset.step, state: item.dataset.state })),
        audit: document.querySelector('#protocol-audit')?.textContent,
        controlState: document.querySelector('#probe-control-state')?.textContent,
        status: document.querySelector('#comparison-status')?.textContent,
      };
    });
    report.states.buoyancyHeavy = await labState(page);
    await page.screenshot({ path: path.join(outputDir, 'lab-comparison.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    report.states.mobile = await labState(page);
    report.states.mobile.horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    report.states.mobile.comparisonLayout = await page.evaluate(() => {
      const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
      const firstRow = document.querySelector('#probe-table-body tr');
      const timeline = document.querySelector('#comparison-timeline');
      const rowRect = firstRow?.getBoundingClientRect();
      const timelineRect = timeline?.getBoundingClientRect();
      return {
        resultCellsFit: Boolean(rowRect) && Array.from(firstRow.querySelectorAll('td'))
          .every(cell => contains(rowRect, cell.getBoundingClientRect())),
        resultLabels: Array.from(firstRow?.querySelectorAll('td') || []).map(cell => cell.dataset.label),
        timelineFits: Boolean(timelineRect) && Array.from(timeline.querySelectorAll('[data-step]'))
          .every(item => contains(timelineRect, item.getBoundingClientRect())),
        timelineScrolls: Boolean(timeline) && timeline.scrollWidth > timeline.clientWidth,
      };
    });
    await page.screenshot({ path: path.join(outputDir, 'lab-mobile.png'), fullPage: true });
    await page.locator('#probe-results').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(outputDir, 'lab-mobile-results.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.click('[data-scene="coupling"]');
    await waitForLab(page);
    await page.click('#run-comparison');
    await page.waitForFunction(
      () => window.__particles4allLab?.comparisonResults?.sceneId === 'coupling',
      null,
      { timeout: 180000 }
    );
    report.couplingComparison = await page.evaluate(() => {
      const result = window.__particles4allLab.comparisonResults;
      return {
        controlled: result.controlled,
        protocol: result.protocol,
        a: result.results[0].probe,
        b: result.results[1].probe,
      };
    });
    report.states.afterPour = await labState(page);

    await page.click('[data-scene="compression"]');
    await waitForLab(page);
    await page.click('#run-comparison');
    await page.waitForFunction(
      () => window.__particles4allLab?.comparisonResults?.sceneId === 'compression',
      null,
      { timeout: 180000 }
    );
    report.compressionComparison = await page.evaluate(() => window.__particles4allLab.comparisonResults);
    report.states.compressionNarrow = await labState(page);

    await page.click('[data-scene="tension"]');
    await waitForLab(page);
    await page.click('#run-comparison');
    await page.waitForFunction(
      () => window.__particles4allLab?.comparisonResults?.sceneId === 'tension',
      null,
      { timeout: 180000 }
    );
    report.tensionComparison = await page.evaluate(() => window.__particles4allLab.comparisonResults);

    await page.click('[data-scene="mesh"]');
    await waitForLab(page);
    report.states.mesh = await labState(page);

    await page.click('[data-scene="dayu"]');
    await waitForLab(page);
    await page.click('#run-comparison');
    await page.waitForFunction(
      () => window.__particles4allLab?.comparisonResults?.sceneId === 'dayu',
      null,
      { timeout: 180000 }
    );
    report.dayuComparison = await page.evaluate(() => window.__particles4allLab.comparisonResults);
    report.states.dayu = await labState(page);
    await page.screenshot({ path: path.join(outputDir, 'lab-dayu.png'), fullPage: true });

    await page.click('[data-scene="performance"]');
    await waitForLab(page, 90000);
    await page.waitForTimeout(3000);
    report.states.performance = await labState(page);
    report.states.performance.timing = await page.evaluate(() =>
      document.querySelector('#engine-frame')?.contentDocument?.querySelector('#timing')?.textContent || ''
    );

    await page.goto(
      `${baseUrl}engine/?preset=small&view=particles&particles=8000&bodies=0&verify=1`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForFunction(() => window.__done === true || Boolean(window.__gpuError), null,
      { timeout: 60000 });
    report.verify = await page.evaluate(() => ({
      done: Boolean(window.__done),
      gpuError: window.__gpuError || null,
      result: window.__result || null,
    }));
  } finally {
    await browser.close();
  }

  const failed = [];
  if (report.states.buoyancyLight?.scenarioCount !== 9) failed.push('scenario count');
  if (!report.states.buoyancyLight?.engineReady || report.states.buoyancyLight?.gpuError)
    failed.push('initial use-case runtime');
  if (!report.states.buoyancyLight?.canvas) failed.push('engine canvas');
  if (report.states.buoyancyLight?.active !== 'buoyancy' ||
      report.states.buoyancyLight?.activeVariant !== 'light') failed.push('initial A variant');
  if (report.states.buoyancyHeavy?.activeVariant !== 'heavy') failed.push('buoyancy B variant');
  if (report.comparison?.sceneId !== 'buoyancy' || !report.comparison?.controlled ||
      report.comparison?.rows !== 4) failed.push('controlled A/B result');
  if (report.comparison?.protocol?.targetSteps !== 180 ||
      report.comparison?.protocol?.aActualSteps !== 180 ||
      report.comparison?.protocol?.bActualSteps !== 180 ||
      !report.comparison?.protocol?.strictPassed) failed.push('buoyancy exact solver steps');
  if (JSON.stringify(report.comparison?.protocol?.history) !==
      JSON.stringify(['prepare', 'a-run', 'a-freeze', 'b-run', 'b-freeze', 'complete']))
    failed.push('comparison phase history');
  if (report.comparison?.timeline?.some(item => item.state !== 'done'))
    failed.push('comparison timeline completion');
  if (!(report.comparison?.a?.bodyMeanY > report.comparison?.b?.bodyMeanY))
    failed.push('buoyancy internal trend');
  if (Math.abs((report.comparison?.a?.duration || 0) - 180 * (report.comparison?.a?.stepDt || 0)) > 1e-8 ||
      Math.abs((report.comparison?.b?.duration || 0) - 180 * (report.comparison?.b?.stepDt || 0)) > 1e-8)
    failed.push('A/B exact duration');
  if (report.comparison?.a?.fluidParticles !== report.comparison?.b?.fluidParticles)
    failed.push('A/B input parity');
  if (report.states.afterPour?.active !== 'coupling') failed.push('coupling switch');
  if (!report.couplingComparison?.controlled ||
      report.couplingComparison?.protocol?.targetSteps !== 144 ||
      report.couplingComparison?.protocol?.aActualSteps !== 144 ||
      report.couplingComparison?.protocol?.bActualSteps !== 144 ||
      report.couplingComparison?.a?.injectedParticles !== 3000 ||
      report.couplingComparison?.b?.injectedParticles !== 3000)
    failed.push('fixed pour budget');
  if (report.couplingComparison?.a?.fluidParticles !== report.couplingComparison?.b?.fluidParticles)
    failed.push('coupling input parity');
  if (report.couplingComparison?.a?.bodyCount !== 0 ||
      !(report.couplingComparison?.b?.bodyTravel > 0)) failed.push('coupling body response');
  if (report.couplingComparison?.a?.inletParticles + report.couplingComparison?.a?.farParticles !==
        report.couplingComparison?.a?.fluidParticles ||
      report.couplingComparison?.b?.inletParticles + report.couplingComparison?.b?.farParticles !==
        report.couplingComparison?.b?.fluidParticles ||
      !Number.isFinite(report.couplingComparison?.b?.regionP95Delta))
    failed.push('regional fluid probes');
  if (report.states.compressionNarrow?.activeVariant !== 'narrow' ||
      report.states.compressionNarrow?.boxScaleX !== 0.6) failed.push('boundary B variant');
  if (Math.abs(report.states.compressionNarrow?.actualBoxX - 1.08) > 0.02)
    failed.push('boundary actual extent');
  if (!report.compressionComparison?.controlled ||
      report.compressionComparison?.protocol?.targetSteps !== 144 ||
      report.compressionComparison?.results?.[0]?.probe?.actualSolverSteps !== 144 ||
      report.compressionComparison?.results?.[1]?.probe?.actualSolverSteps !== 144 ||
      Math.abs(report.compressionComparison?.results?.[0]?.probe?.boxX - 1.8) > 0.002 ||
      Math.abs(report.compressionComparison?.results?.[1]?.probe?.boxX - 1.08) > 0.002)
    failed.push('compression full A/B');
  if (!report.tensionComparison?.controlled ||
      report.tensionComparison?.protocol?.targetSteps !== 162 ||
      report.tensionComparison?.results?.[0]?.probe?.injectedParticles !== 900 ||
      report.tensionComparison?.results?.[1]?.probe?.injectedParticles !== 900)
    failed.push('tension full A/B');
  if (report.states.mesh?.active !== 'mesh' || report.states.mesh?.gpuError) failed.push('mesh switch');
  if (report.states.dayu?.active !== 'dayu' || report.states.dayu?.activeVariant !== 'narrow-proxy')
    failed.push('dayu proxy B variant');
  if (!report.dayuComparison?.controlled ||
      report.dayuComparison?.protocol?.targetSteps !== 144 ||
      report.dayuComparison?.results?.[0]?.probe?.injectedParticles !== 3000 ||
      report.dayuComparison?.results?.[1]?.probe?.injectedParticles !== 3000 ||
      Math.abs(report.dayuComparison?.results?.[1]?.probe?.boxX - 1.54) > 0.002)
    failed.push('dayu full A/B');
  if (report.states.performance?.active !== 'performance' ||
      report.states.performance?.particles < 100000 || report.states.performance?.gpuError)
    failed.push('performance switch');
  if (report.states.mobile?.horizontalOverflow) failed.push('mobile horizontal overflow');
  if (!report.states.mobile?.comparisonLayout?.resultCellsFit ||
      report.states.mobile?.comparisonLayout?.resultLabels?.length !== 3 ||
      !report.states.mobile?.comparisonLayout?.timelineFits ||
      report.states.mobile?.comparisonLayout?.timelineScrolls)
    failed.push('mobile comparison layout');
  if (!report.verify?.done || report.verify?.gpuError || report.verify?.result?.nonFinite !== 0)
    failed.push('upstream verify');
  if (pageErrors.length) failed.push('page errors');
  if (consoleErrors.length) failed.push('console errors');

  console.log(JSON.stringify({ ...report, failed }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
