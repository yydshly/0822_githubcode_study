const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.OCEAN_URL ||
  'http://127.0.0.1:8107/demos/water-scene-lab/ocean/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserLabel = (process.env.BROWSER_LABEL || '').trim().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
const artifactSuffix = browserLabel ? `-${browserLabel}` : '';
const gpuArgs = process.env.FORCE_HIGH_PERFORMANCE_GPU === '1'
  ? ['--force-high-performance-gpu', '--use-webgpu-power-preference=force-high-performance']
  : [];
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, `particles4all-reuse-browser${artifactSuffix}-results.json`);
const screenshotPath = path.join(outputDir, `ocean-particles4all-desktop${artifactSuffix}.png`);

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== '0',
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', ...gpuArgs],
  });
  const browserVersion = await browser.version();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const report = {
    protocol: { baseUrl, executablePath, browserLabel: browserLabel || 'default', browserVersion, viewport: [1440, 1000] },
    result: null,
    page: null,
    checks: [],
    consoleErrors,
    pageErrors,
    passed: false,
  };

  try {
    await page.goto(`${baseUrl}?quality=balanced`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForFunction(() => window.__oceanLab?.getRuntime().rendererReady === true,
      null, { timeout: 60000 });
    report.result = await page.evaluate(() => window.__oceanLab.runPhysicsBridge());
    await page.waitForFunction(() =>
      window.__oceanLab?.getPhysicsBridge().phase === 'complete', null, { timeout: 120000 });
    report.page = await page.evaluate(() => ({
      title: document.title,
      state: window.__oceanLab.getPhysicsBridge(),
      oceanRuntime: window.__oceanLab.getRuntime(),
      sceneContract: window.__oceanLab.getNearFieldSceneContract(),
      sceneContractHash: window.__oceanLab.nearFieldSceneContractHash,
      statusText: document.querySelector('#coastal-physics-status')?.textContent || null,
      conclusionText: document.querySelector('#coastal-physics-conclusion')?.textContent || null,
      exportHref: document.querySelector('#coastal-physics-export')?.href || null,
      placeholderHidden: document.querySelector('#coastal-physics-placeholder')?.hidden === true,
      bridgeVisible: document.querySelector('#coastal-physics')?.getBoundingClientRect().height > 500,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    }));

    const check = (name, passed, detail = null) => report.checks.push({ name, passed, detail });
    check('source.upstreamRuntime', report.result.initial.upstreamRuntime === true, report.result.initial);
    check('source.webgpu', report.result.environment.webgpuContext === true, report.result.environment);
    check('reuse.sharedRunner', report.result.bridgeVersion === 'particles4all-scene-runner-v1', report.result.bridgeVersion);
    check('contract.oceanScene', report.result.sceneContract.id === 'ocean-wave-uplift-near-field' &&
      report.result.sceneContract.hash === report.page.sceneContractHash &&
      report.page.sceneContract.schema === 'water-scene.particles4all-near-field/v1',
      { result: report.result.sceneContract, page: report.page.sceneContract });
    check('contract.serializable', report.page.exportHref?.startsWith('data:application/json') &&
      report.page.sceneContract.targetPlatform === 'desktop-browser', report.page.sceneContract);
    check('mapping.oceanDriver', report.result.mapping.worldDriver === 'ocean-surface-vertical-velocity' &&
      report.result.mapping.verticalVelocityWorldUnitsPerSecond > 1,
      report.result.mapping);
    check('mapping.localFrame', report.result.mapping.solverFrame === 'ocean-up-to-solver-positive-y' &&
      report.result.mapping.solverVelocity[0] === 0 && report.result.mapping.solverVelocity[1] === 4,
      report.result.mapping);
    check('mapping.truthBoundary', report.result.mapping.crossScaleTruthLevel === 'T2 mapped input' &&
      report.result.mapping.localTruthLevel === 'T3 local PBF / rigid coupling', report.result.mapping);
    check('injection.count', report.result.injection.requested === 640 &&
      report.result.injection.added === 640 && !report.result.injection.clamped, report.result.injection);
    check('solver.ticks', report.result.step.requestedTicks === 36 &&
      report.result.step.actualTicks === 36, report.result.step);
    check('solver.finite', report.result.nonFinite === 0, report.result.nonFinite);
    check('rigid.baselineDelta', report.result.bodyDisplacementDeltaAlongAxis >= 0.003 &&
      Number.isFinite(report.result.baselineBodyDisplacementAlongAxis), {
      injected: report.result.bodyDisplacementAlongAxis,
      baseline: report.result.baselineBodyDisplacementAlongAxis,
      delta: report.result.bodyDisplacementDeltaAlongAxis,
    });
    check('rigid.nativeBodyProfile', report.result.bodyProfile.shape === 'torus' &&
      report.result.bodyProfile.density === 0.22 &&
      report.result.bodyProfile.sceneRole === 'floating-ring-probe', report.result.bodyProfile);
    check('rigid.rotationResponse', report.result.bodyRotationDegrees >= 0.5,
      report.result.bodyRotationDegrees);
    check('contract.acceptance', report.result.acceptance.passed === true &&
      report.result.acceptance.directionalRigidResponse === true, report.result.acceptance);
    check('runtime.phase', report.page.state.phase === 'complete' && !report.page.state.error, report.page.state);
    check('ui.desktopBridge', report.page.bridgeVisible && report.page.placeholderHidden &&
      report.page.horizontalOverflow <= 1, report.page);
    check('ui.conclusion', report.page.statusText === 'Ocean 复用证据已完成' &&
      report.page.conclusionText.includes('原生浮环 Gate 通过'), report.page);
    check('consoleErrors', consoleErrors.length === 0, consoleErrors);
    check('pageErrors', pageErrors.length === 0, pageErrors);
    report.passed = report.checks.every(item => item.passed);
    await page.screenshot({ path: screenshotPath, fullPage: true });
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
    injected: report.result?.injection?.added || null,
    ticks: report.result?.step?.actualTicks || null,
    bodyDisplacementAlongAxis: report.result?.bodyDisplacementAlongAxis || null,
    baselineBodyDisplacementAlongAxis: report.result?.baselineBodyDisplacementAlongAxis || null,
    bodyDisplacementDeltaAlongAxis: report.result?.bodyDisplacementDeltaAlongAxis || null,
    bodyRotationDegrees: report.result?.bodyRotationDegrees || null,
    bodyProfile: report.result?.bodyProfile || null,
    error: report.error?.message || null,
    outputPath,
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
