const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    const dependencyRoot = process.env.WATER_LAB_NODE_MODULES;
    if (!dependencyRoot) throw error;
    return require(path.join(dependencyRoot, 'playwright'));
  }
}

const { chromium } = loadPlaywright();
const projectRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(projectRoot, '..', '..', '..');
const assetsDir = path.join(projectRoot, 'assets');
const targetUrl = process.env.WATER_LAB_WATERSHED_URL
  || 'http://127.0.0.1:8107/demos/water-scene-lab/watershed/';
const chromePath = process.env.WATER_LAB_CHROME
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sourcePaths = {
  app: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'watershed', 'app.js'),
  html: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'watershed', 'index.html'),
  css: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'watershed', 'styles.css'),
  model: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'watershed', 'watershed-model.mjs'),
  riverModel: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'river', 'river-model.mjs'),
};

const cases = [
  { name: 'desktop', study: 'threshold', viewport: { width: 1440, height: 900 }, quality: 'balanced', expectedVariants: 2, reducedMotion: 'no-preference' },
  { name: 'mobile', study: 'threshold', viewport: { width: 390, height: 844 }, quality: 'fallback', expectedVariants: 1, isMobile: true, reducedMotion: 'no-preference' },
  { name: 'mobile-reduce', study: 'threshold', viewport: { width: 390, height: 844 }, quality: 'fallback', expectedVariants: 1, isMobile: true, reducedMotion: 'reduce' },
  { name: 'barrier-desktop', study: 'barrier', viewport: { width: 1440, height: 900 }, quality: 'balanced', expectedVariants: 2, reducedMotion: 'no-preference' },
  { name: 'barrier-mobile', study: 'barrier', viewport: { width: 390, height: 844 }, quality: 'fallback', expectedVariants: 1, isMobile: true, reducedMotion: 'no-preference' },
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function fixedInputDiff(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key])).sort();
}

async function sampleCanvas(page) {
  return page.locator('#watershed-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    if (!gl) return { available: false, uniqueColors: 0, luminanceVariance: 0 };
    gl.finish();
    const pixel = new Uint8Array(4);
    const colors = new Set();
    const luminance = [];
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    for (let row = 1; row <= 10; row += 1) {
      for (let column = 1; column <= 14; column += 1) {
        const x = Math.min(width - 1, Math.floor((column / 15) * width));
        const y = Math.min(height - 1, Math.floor((row / 11) * height));
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        colors.add(`${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`);
        luminance.push(pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722);
      }
    }
    const average = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
    const variance = luminance.reduce((sum, value) => sum + (value - average) ** 2, 0) / luminance.length;
    return { available: true, drawingBuffer: [width, height], uniqueColors: colors.size, luminanceVariance: variance };
  });
}

async function verifyCase(browser, testCase) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    isMobile: Boolean(testCase.isMobile),
    deviceScaleFactor: 1,
    reducedMotion: testCase.reducedMotion,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

  const response = await page.goto(`${targetUrl}?verify=1&quality=${testCase.quality}&study=${testCase.study}`, { waitUntil: 'networkidle', timeout: 25_000 });
  await page.waitForFunction(() => document.body.dataset.renderState === 'ready', null, { timeout: 20_000 });
  await page.waitForTimeout(450);

  const snapshots = await page.evaluate(() => ({
    state: window.__watershedLab.getState(),
    runtime: window.__watershedLab.getRuntime(),
    low: window.__watershedLab.getCaseSnapshot('low'),
    high: window.__watershedLab.getCaseSnapshot('high'),
    verification: window.__watershedLab.verify(),
  }));
  await page.waitForTimeout(120);

  const layout = await page.evaluate(() => {
    const overflowElements = Array.from(document.querySelectorAll('body *'))
      .filter((element) => getComputedStyle(element).position !== 'fixed')
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > window.innerWidth + 1 || rect.left < -1)
      .slice(0, 10)
      .map(({ element, rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      }));
    return {
      title: document.title,
      renderState: document.body.dataset.renderState,
      bodyLength: document.body.innerText.trim().length,
      h1: document.querySelector('h1')?.innerText.trim() || '',
      resultRows: document.querySelectorAll('#result-rows .result-row').length,
      readingCells: document.querySelectorAll('.reading-grid > div').length,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowElements,
      fallbackVisible: getComputedStyle(document.querySelector('#fallback-state')).display !== 'none',
    };
  });

  const canvasSample = await sampleCanvas(page);
  const screenshot = path.join(assetsDir, `watershed-${testCase.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  let impactEvidence = null;
  let floodplainEvidence = null;
  if (testCase.name === 'desktop') {
    const cameraChanged = await page.evaluate(() => window.__watershedLab.setCameraMode('impact'));
    await page.waitForTimeout(180);
    const impactCanvasSample = await sampleCanvas(page);
    const impactScreenshot = path.join(assetsDir, 'watershed-impact-desktop.png');
    await page.screenshot({ path: impactScreenshot, fullPage: true });
    impactEvidence = { cameraChanged, canvasSample: impactCanvasSample, screenshot: path.basename(impactScreenshot) };
    const floodplainCameraChanged = await page.evaluate(() => window.__watershedLab.setCameraMode('floodplain'));
    await page.waitForTimeout(180);
    const floodplainCanvasSample = await sampleCanvas(page);
    const floodplainScreenshot = path.join(assetsDir, 'watershed-floodplain-desktop.png');
    await page.screenshot({ path: floodplainScreenshot, fullPage: true });
    floodplainEvidence = {
      cameraChanged: floodplainCameraChanged,
      canvasSample: floodplainCanvasSample,
      screenshot: path.basename(floodplainScreenshot),
    };
  }
  if (testCase.name === 'barrier-desktop') {
    const cameraChanged = await page.evaluate(() => window.__watershedLab.setCameraMode('floodplain'));
    await page.waitForTimeout(180);
    const barrierCanvasSample = await sampleCanvas(page);
    const barrierScreenshot = path.join(assetsDir, 'watershed-barrier-desktop.png');
    await page.screenshot({ path: barrierScreenshot, fullPage: true });
    floodplainEvidence = { cameraChanged, canvasSample: barrierCanvasSample, screenshot: path.basename(barrierScreenshot) };
  }
  const inputDiff = fixedInputDiff(snapshots.low.fixedInputs, snapshots.high.fixedInputs);
  const barrierStudy = testCase.study === 'barrier';
  const lowFinal = snapshots.low.accumulated.finalState;
  const highFinal = snapshots.high.accumulated.finalState;
  const checks = {
    httpOk: response?.ok() === true,
    renderReady: layout.renderState === 'ready' && snapshots.runtime.rendererReady,
    truthfulLevel: snapshots.runtime.truthLevel === 'T3',
    correctOverflowModel: snapshots.runtime.modelVersion === 'mountain-watershed-overflow-v2',
    correctStudyMode: snapshots.runtime.studyMode === testCase.study,
    correctQuality: snapshots.runtime.quality === testCase.quality,
    correctVariantCount: snapshots.runtime.renderedVariants === testCase.expectedVariants,
    onlyOneStudyFactorDiffers: inputDiff.length === 1
      && inputDiff[0] === (barrierStudy ? 'floodplainRoutingMode' : 'dischargeScale'),
    dischargeRatio: Math.abs(snapshots.high.derived.dischargeM3s / snapshots.low.derived.dischargeM3s - (barrierStudy ? 1 : 2)) <= 1e-12,
    thicknessRatio: Math.abs(snapshots.high.derived.outlet.curtainThicknessM / snapshots.low.derived.outlet.curtainThicknessM - (barrierStudy ? 1 : 2)) <= 1e-12,
    sameGravityTrajectory: snapshots.high.derived.waterfall.fallTimeS === snapshots.low.derived.waterfall.fallTimeS
      && snapshots.high.derived.waterfall.impactVelocityMps === snapshots.low.derived.waterfall.impactVelocityMps,
    poolResponseMatchesStudy: barrierStudy
      ? Math.abs(snapshots.high.accumulated.poolLevelRiseM - snapshots.low.accumulated.poolLevelRiseM) <= 1e-9
      : snapshots.high.accumulated.poolLevelRiseM > snapshots.low.accumulated.poolLevelRiseM,
    riverInventoryDebited: snapshots.low.accumulated.finalState.riverVolumeM3 < snapshots.low.fixedInputs.riverInitialVolumeM3
      && snapshots.high.accumulated.finalState.riverVolumeM3 < snapshots.high.fixedInputs.riverInitialVolumeM3,
    packetsInFlight: snapshots.low.accumulated.finalState.lastStep.airborneVolumeM3 > 0
      && snapshots.high.accumulated.finalState.lastStep.airborneVolumeM3 > 0,
    depositionReachedPool: snapshots.low.accumulated.finalState.cumulative.depositedM3 > 0
      && snapshots.high.accumulated.finalState.cumulative.depositedM3 > 0,
    poolCapacityRespected: snapshots.high.accumulated.finalState.poolVolumeM3 <= snapshots.high.fixedInputs.poolCapacityM3 + 1e-9,
    overflowPatternMatchesStudy: barrierStudy
      ? lowFinal.cumulative.poolOverflowM3 > 0
        && Math.abs(lowFinal.cumulative.poolOverflowM3 - highFinal.cumulative.poolOverflowM3) <= 1e-9
      : lowFinal.cumulative.poolOverflowM3 === 0 && highFinal.cumulative.poolOverflowM3 > 0,
    floodplainStorageMatchesStudy: barrierStudy
      ? lowFinal.floodplainVolumeM3 > 0 && Math.abs(lowFinal.floodplainVolumeM3 - highFinal.floodplainVolumeM3) <= 1e-9
      : lowFinal.floodplainVolumeM3 === 0 && highFinal.floodplainVolumeM3 > 0,
    routingEffectMatchesStudy: barrierStudy
      ? lowFinal.floodplain.blockedCellCount === 0
        && highFinal.floodplain.blockedCellCount === 8
        && highFinal.floodplain.cells.every((cell) => !cell.blocked || !cell.wet)
        && highFinal.floodplain.wetRouteSignature !== lowFinal.floodplain.wetRouteSignature
        && highFinal.floodplain.meanWetAbsXM > lowFinal.floodplain.meanWetAbsXM
      : lowFinal.floodplain.wetCellCount === 0 && highFinal.floodplain.wetCellCount > 0,
    overflowLedgerClosed: Math.abs(
      snapshots.high.accumulated.finalState.cumulative.poolOverflowM3
        - snapshots.high.accumulated.finalState.floodplainVolumeM3
        - snapshots.high.accumulated.finalState.cumulative.floodplainOutflowM3,
    ) <= 1e-9,
    overflowHasArrivalTime: barrierStudy
      ? snapshots.low.accumulated.firstOverflowTick === snapshots.high.accumulated.firstOverflowTick
        && snapshots.high.accumulated.firstOverflowTick > 0
      : snapshots.low.accumulated.firstOverflowTick === null
        && snapshots.high.accumulated.firstOverflowTick > 0
        && snapshots.high.accumulated.firstOverflowTick < 1200,
    cumulativeBudgetsClosed: Math.abs(snapshots.high.accumulated.finalState.budget.residualM3) <= 1e-9
      && Math.abs(snapshots.low.accumulated.finalState.budget.residualM3) <= 1e-9,
    visualSamplingDecoupled: Math.abs(
      snapshots.high.derived.waterfall.representedVolumePerSampleM3
        - snapshots.low.derived.waterfall.representedVolumePerSampleM3,
    ) <= 1e-12,
    canvasNonBlank: canvasSample.available && canvasSample.uniqueColors >= 12 && canvasSample.luminanceVariance >= 25,
    contentPresent: layout.bodyLength > 1200 && layout.resultRows === 13 && layout.readingCells === 20,
    noOverflow: layout.overflowX <= 1 && layout.overflowElements.length === 0,
    noFallback: !layout.fallbackVisible,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };

  await context.close();
  return {
    name: testCase.name,
    study: testCase.study,
    viewport: testCase.viewport,
    inputDiff,
    checks,
    layout,
    canvasSample,
    impactEvidence,
    floodplainEvidence,
    runtime: snapshots.runtime,
    diagnostics: {
      low: {
        poolLevelRiseM: snapshots.low.accumulated.poolLevelRiseM,
        riverVolumeM3: snapshots.low.accumulated.finalState.riverVolumeM3,
        airborneVolumeM3: snapshots.low.accumulated.finalState.lastStep.airborneVolumeM3,
        depositedM3: snapshots.low.accumulated.finalState.cumulative.depositedM3,
        overflowM3: snapshots.low.accumulated.finalState.cumulative.poolOverflowM3,
        floodplainVolumeM3: snapshots.low.accumulated.finalState.floodplainVolumeM3,
        wetCellCount: snapshots.low.accumulated.finalState.floodplain.wetCellCount,
        blockedCellCount: snapshots.low.accumulated.finalState.floodplain.blockedCellCount,
        meanWetAbsXM: snapshots.low.accumulated.finalState.floodplain.meanWetAbsXM,
        maximumWetRow: snapshots.low.accumulated.finalState.floodplain.maximumWetRow,
        wetRouteSignature: snapshots.low.accumulated.finalState.floodplain.wetRouteSignature,
        firstOverflowTick: snapshots.low.accumulated.firstOverflowTick,
        budgetResidualM3: snapshots.low.accumulated.finalState.budget.residualM3,
      },
      high: {
        poolLevelRiseM: snapshots.high.accumulated.poolLevelRiseM,
        riverVolumeM3: snapshots.high.accumulated.finalState.riverVolumeM3,
        airborneVolumeM3: snapshots.high.accumulated.finalState.lastStep.airborneVolumeM3,
        depositedM3: snapshots.high.accumulated.finalState.cumulative.depositedM3,
        overflowM3: snapshots.high.accumulated.finalState.cumulative.poolOverflowM3,
        floodplainVolumeM3: snapshots.high.accumulated.finalState.floodplainVolumeM3,
        wetCellCount: snapshots.high.accumulated.finalState.floodplain.wetCellCount,
        blockedCellCount: snapshots.high.accumulated.finalState.floodplain.blockedCellCount,
        meanWetAbsXM: snapshots.high.accumulated.finalState.floodplain.meanWetAbsXM,
        maximumWetRow: snapshots.high.accumulated.finalState.floodplain.maximumWetRow,
        wetRouteSignature: snapshots.high.accumulated.finalState.floodplain.wetRouteSignature,
        firstOverflowTick: snapshots.high.accumulated.firstOverflowTick,
        budgetResidualM3: snapshots.high.accumulated.finalState.budget.residualM3,
      },
    },
    consoleErrors,
    pageErrors,
    failedRequests,
    screenshot: path.relative(repositoryRoot, screenshot).split(path.sep).join('/'),
    passed: Object.values(checks).every(Boolean),
  };
}

async function verifyFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const response = await page.goto(`${targetUrl}?forceFallback=1`, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForFunction(() => document.body.dataset.renderState === 'failed');
  const state = await page.evaluate(() => ({
    renderState: document.body.dataset.renderState,
    fallbackVisible: getComputedStyle(document.querySelector('#fallback-state')).display !== 'none',
    modelHookPresent: Boolean(window.__watershedLab?.getCaseSnapshot),
    title: document.title,
  }));
  await context.close();
  const checks = {
    httpOk: response?.ok() === true,
    failedState: state.renderState === 'failed',
    fallbackVisible: state.fallbackVisible,
    modelStillInspectable: state.modelHookPresent,
    noPageErrors: pageErrors.length === 0,
  };
  return { state, checks, pageErrors, passed: Object.values(checks).every(Boolean) };
}

(async () => {
  fs.mkdirSync(assetsDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  try {
    for (const testCase of cases) results.push(await verifyCase(browser, testCase));
    const fallback = await verifyFallback(browser);
    const report = {
      createdAt: new Date().toISOString(),
      targetUrl,
      browserVersion: browser.version(),
      sources: Object.fromEntries(Object.entries(sourcePaths).map(([name, filePath]) => [name, {
        repositoryPath: path.relative(repositoryRoot, filePath).split(path.sep).join('/'),
        sha256: sha256(filePath),
      }])),
      cases: results,
      fallback,
      passed: results.every((result) => result.passed) && fallback.passed,
    };
    fs.writeFileSync(path.join(assetsDir, 'watershed-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
