const fs = require('node:fs');
const path = require('node:path');

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
const assetsDir = path.join(projectRoot, 'assets');
const targetUrl = process.env.OCEAN_LAB_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/ocean/';
const chromePath = process.env.WATER_LAB_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const cases = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    expectedVariants: 2,
    expectedQuality: 'balanced',
    frameP50Limit: 22,
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    reducedMotion: 'reduce',
    expectedVariants: 1,
    expectedQuality: 'fallback',
    frameP50Limit: 33,
  },
];

async function sampleCanvas(page) {
  return page.locator('#ocean-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    if (!gl) return { available: false, uniqueColors: 0, luminanceVariance: 0 };
    gl.finish();
    const values = [];
    const colors = new Set();
    const pixel = new Uint8Array(4);
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    for (let row = 1; row <= 8; row += 1) {
      for (let column = 1; column <= 12; column += 1) {
        const x = Math.min(width - 1, Math.floor((column / 13) * width));
        const y = Math.min(height - 1, Math.floor((row / 9) * height));
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        colors.add(`${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`);
        values.push(pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722);
      }
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    return {
      available: true,
      drawingBuffer: [width, height],
      uniqueColors: colors.size,
      luminanceVariance: variance,
      center: colors.values().next().value,
    };
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
  const consoleWarnings = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText || 'unknown',
  }));

  const response = await page.goto(`${targetUrl}?quality=${testCase.expectedQuality}`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });
  await page.waitForFunction(() => document.body.dataset.renderState === 'ready' && window.__oceanLab?.getRuntime().rendererReady, null, { timeout: 30_000 });
  await page.waitForTimeout(1300);

  const initial = await page.evaluate(() => ({
    title: document.title,
    bodyLength: document.body.innerText.trim().length,
    renderState: document.body.dataset.renderState,
    h1: document.querySelector('h1')?.innerText.trim() || '',
    resultRows: document.querySelectorAll('#result-rows .result-row').length,
    truthBadge: document.querySelector('.truth-badge')?.innerText.trim() || '',
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    runtime: window.__oceanLab.getRuntime(),
    state: window.__oceanLab.getState(),
    calmUniforms: window.__oceanLab.getUniformSnapshot('calm'),
    windUniforms: window.__oceanLab.getUniformSnapshot('wind'),
  }));

  const tickBeforeMotion = initial.state.previewTick;
  await page.waitForTimeout(250);
  const tickAfterMotion = await page.evaluate(() => window.__oceanLab.getState().previewTick);
  let pauseCheck = { started: false, advanced: false, stable: false, reset: false };
  if (testCase.reducedMotion === 'no-preference') {
    await page.locator('#run-ab').click();
    await page.waitForTimeout(320);
    const runningTick = await page.evaluate(() => window.__oceanLab.getState().tick);
    await page.locator('#pause-run').click();
    const pausedTick = await page.evaluate(() => window.__oceanLab.getState().tick);
    await page.waitForTimeout(260);
    const pausedTickLater = await page.evaluate(() => window.__oceanLab.getState().tick);
    await page.locator('#reset-run').click();
    const resetState = await page.evaluate(() => window.__oceanLab.getState());
    pauseCheck = {
      started: runningTick > 0,
      advanced: runningTick >= 8,
      stable: pausedTick === pausedTickLater,
      reset: resetState.phase === 'idle' && resetState.tick === 0,
    };
  } else {
    await page.locator('[data-mobile-variant="wind"]').click();
  }

  const verification = await page.evaluate(() => window.__oceanLab.runVerification());
  await page.waitForTimeout(700);
  const canvasSample = await sampleCanvas(page);
  const finalState = await page.evaluate(() => ({
    phase: window.__oceanLab.getState().phase,
    tick: window.__oceanLab.getState().tick,
    mobileVariant: window.__oceanLab.getState().mobileVariant,
    runtime: window.__oceanLab.getRuntime(),
    resultState: document.querySelector('#result-state')?.innerText.trim() || '',
    conclusion: document.querySelector('#bounded-conclusion')?.innerText.trim() || '',
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
  }));

  await page.screenshot({
    path: path.join(assetsDir, `ocean-${testCase.name}.png`),
    fullPage: true,
  });

  const uniformParity = initial.calmUniforms.every((calm, index) => {
    const wind = initial.windUniforms[index];
    return Math.abs(calm.directionX - wind.directionX) < 1e-12
      && Math.abs(calm.directionZ - wind.directionZ) < 1e-12
      && Math.abs(calm.k - wind.k) < 1e-12
      && Math.abs(calm.omega - wind.omega) < 1e-12
      && Math.abs(calm.phase - wind.phase) < 1e-12
      && Math.abs(calm.q - wind.q) < 1e-12
      && Math.abs(wind.amplitude / calm.amplitude - 4) < 1e-12;
  });

  const checks = {
    status200: response?.status() === 200,
    hasContent: initial.bodyLength > 800,
    expectedTitle: initial.title.includes('Ocean MVP'),
    expectedHero: initial.h1.includes('同一艘船') && initial.h1.includes('两种海况'),
    rendererReady: initial.renderState === 'ready' && initial.runtime.rendererReady,
    threePinned: initial.runtime.threeRevision === '185',
    expectedQuality: initial.runtime.qualityTier === testCase.expectedQuality,
    expectedVariants: initial.runtime.renderedVariants === testCase.expectedVariants,
    canvasNonBlank: canvasSample.available && canvasSample.uniqueColors >= 12 && canvasSample.luminanceVariance >= 25,
    resultRows: initial.resultRows === 6,
    truthBoundary: initial.truthBadge.includes('视觉航行响应代理'),
    uniformParity,
    reducedMotionStatic: testCase.reducedMotion === 'reduce' ? Math.abs(tickAfterMotion - tickBeforeMotion) < 1e-9 : tickAfterMotion > tickBeforeMotion,
    pauseAndReset: testCase.reducedMotion === 'reduce' || Object.values(pauseCheck).every(Boolean),
    deterministicAB: verification.analysis.passed,
    fixedEndpoint: verification.analysis.A.ticks === 1200 && verification.analysis.B.ticks === 1200,
    commonContract: verification.analysis.A.contractHash === verification.analysis.B.contractHash,
    noNumericalFailures: verification.analysis.A.metrics.nonFiniteCount === 0
      && verification.analysis.B.metrics.nonFiniteCount === 0
      && verification.analysis.A.metrics.inverseFailCount === 0
      && verification.analysis.B.metrics.inverseFailCount === 0,
    resultRendered: finalState.phase === 'complete' && finalState.tick === 1200 && finalState.resultState.includes('通过'),
    mobileSwitch: testCase.reducedMotion !== 'reduce' || finalState.mobileVariant === 'wind',
    frameBudget: finalState.runtime.frameTimeP50 != null && finalState.runtime.frameTimeP50 <= testCase.frameP50Limit,
    noHorizontalOverflow: finalState.overflowX <= 1,
    noErrorOverlay: !finalState.errorOverlay,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };

  await context.close();
  return {
    name: testCase.name,
    viewport: testCase.viewport,
    reducedMotion: testCase.reducedMotion,
    initial,
    pauseCheck,
    verification,
    canvasSample,
    finalState,
    checks,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    failedRequests,
    passed: Object.values(checks).every(Boolean),
  };
}

async function verifyFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 900, height: 700 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  const response = await page.goto(`${targetUrl}?forceFallback=1`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction(() => document.body.dataset.renderState === 'failed');
  const state = await page.evaluate(() => ({
    renderState: document.body.dataset.renderState,
    fallbackVisible: getComputedStyle(document.querySelector('#fallback-state')).display !== 'none',
    reason: document.querySelector('#fallback-reason')?.innerText || '',
    retryVisible: Boolean(document.querySelector('#retry-renderer')),
    overflowX: document.documentElement.scrollWidth - innerWidth,
  }));
  const checks = {
    status200: response?.status() === 200,
    failedState: state.renderState === 'failed',
    fallbackVisible: state.fallbackVisible,
    reasonVisible: state.reason.includes('强制进入 WebGL 回退'),
    retryVisible: state.retryVisible,
    noHorizontalOverflow: state.overflowX <= 1,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };
  await page.screenshot({ path: path.join(assetsDir, 'ocean-fallback.png'), fullPage: true });
  await context.close();
  return { state, checks, consoleErrors, pageErrors, failedRequests, passed: Object.values(checks).every(Boolean) };
}

(async () => {
  fs.mkdirSync(assetsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const browserVersion = await browser.version();
  const results = [];
  let fallback;
  try {
    for (const testCase of cases) results.push(await verifyCase(browser, testCase));
    fallback = await verifyFallback(browser);
  } finally {
    await browser.close();
  }

  const report = {
    schemaVersion: '1.0',
    targetUrl,
    createdAt: new Date().toISOString(),
    browser: { engine: 'Chromium', version: browserVersion },
    passed: results.every((result) => result.passed) && fallback.passed,
    results,
    fallback,
  };
  fs.writeFileSync(path.join(assetsDir, 'ocean-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
