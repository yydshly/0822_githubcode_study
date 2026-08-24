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
const targetUrl = process.env.RIVER_LAB_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/river/';
const chromePath = process.env.WATER_LAB_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const cases = [
  {
    name: 'desktop',
    screenshot: 'river-desktop.png',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    expectedVariants: 2,
    expectedQuality: 'balanced',
    frameP50Limit: 22,
    frameP95Limit: 50,
    exercisePlayback: true,
  },
  {
    name: 'mobile',
    screenshot: 'river-mobile.png',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    reducedMotion: 'no-preference',
    expectedVariants: 1,
    expectedQuality: 'fallback',
    frameP50Limit: 33,
    frameP95Limit: 66,
  },
  {
    name: 'mobile-reduce',
    screenshot: 'river-mobile-reduce.png',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    reducedMotion: 'reduce',
    expectedVariants: 1,
    expectedQuality: 'fallback',
    frameP50Limit: 33,
    frameP95Limit: 66,
    // Reduced motion must stay static by default, but an explicit run is allowed
    // and gives the runtime enough frames to publish percentile telemetry.
    exercisePlayback: true,
  },
];

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function probeArray(snapshot) {
  if (Array.isArray(snapshot)) return snapshot;
  return snapshot?.probes || snapshot?.samples || snapshot?.flowSamples || [];
}

function markerArray(snapshot) {
  return snapshot?.initialMarkers || snapshot?.markers || snapshot?.markerStates || [];
}

function component(record, directKey, objectKey, nestedKey) {
  if (finite(record?.[directKey])) return record[directKey];
  if (finite(record?.[objectKey]?.[nestedKey])) return record[objectKey][nestedKey];
  if (finite(record?.closest?.[directKey])) return record.closest[directKey];
  return null;
}

function normalizeProbe(probe, snapshot) {
  return {
    id: probe.id ?? probe.s ?? null,
    directionX: component(probe, 'directionX', 'direction', 'x'),
    directionZ: component(probe, 'directionZ', 'direction', 'z'),
    tangentX: component(probe, 'tangentX', 'tangent', 'x'),
    tangentZ: component(probe, 'tangentZ', 'tangent', 'z'),
    speed: finite(probe.speed) ? probe.speed : (finite(snapshot?.speed) ? snapshot.speed : null),
  };
}

function compareFlowSnapshots(uniformSnapshot, guidedSnapshot) {
  const uniform = probeArray(uniformSnapshot).map((probe) => normalizeProbe(probe, uniformSnapshot));
  const guided = probeArray(guidedSnapshot).map((probe) => normalizeProbe(probe, guidedSnapshot));
  const sampleCount = Math.min(uniform.length, guided.length);
  const uniformIsWorldZ = sampleCount >= 3 && uniform.slice(0, sampleCount).every((probe) => (
    finite(probe.directionX)
      && finite(probe.directionZ)
      && Math.abs(probe.directionX) <= 1e-9
      && Math.abs(probe.directionZ - 1) <= 1e-9
  ));
  const guidedMatchesTangent = sampleCount >= 3 && guided.slice(0, sampleCount).every((probe) => {
    if (![probe.directionX, probe.directionZ, probe.tangentX, probe.tangentZ].every(finite)) return false;
    const directionLength = Math.hypot(probe.directionX, probe.directionZ);
    const tangentLength = Math.hypot(probe.tangentX, probe.tangentZ);
    if (directionLength <= 0 || tangentLength <= 0) return false;
    const alignment = (probe.directionX * probe.tangentX + probe.directionZ * probe.tangentZ)
      / (directionLength * tangentLength);
    return alignment >= 0.999999;
  });
  const scalarSpeedParity = sampleCount >= 3 && uniform.slice(0, sampleCount).every((probe, index) => (
    finite(probe.speed)
      && finite(guided[index].speed)
      && Math.abs(probe.speed - guided[index].speed) <= 1e-12
      && probe.speed > 0
  ));

  const uniformMarkers = markerArray(uniformSnapshot);
  const guidedMarkers = markerArray(guidedSnapshot);
  const markerCount = Math.min(uniformMarkers.length, guidedMarkers.length);
  const markerCoordinatesMatch = markerCount > 0
    && uniformMarkers.length === guidedMarkers.length
    && uniformMarkers.every((marker, index) => {
      const other = guidedMarkers[index];
      return String(marker.id ?? index) === String(other.id ?? index)
        && finite(marker.x)
        && finite(marker.z)
        && finite(other.x)
        && finite(other.z)
        && Math.hypot(marker.x - other.x, marker.z - other.z) <= 1e-9;
    });
  const explicitParity = uniformSnapshot?.initialMarkerParity === true
    && guidedSnapshot?.initialMarkerParity === true;

  return {
    sampleCount,
    markerCount,
    uniformIsWorldZ,
    guidedMatchesTangent,
    scalarSpeedParity,
    initialMarkerParity: markerCoordinatesMatch || explicitParity,
    normalized: { uniform, guided },
  };
}

async function sampleCanvas(page) {
  return page.locator('#river-canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    if (!gl) return { available: false, uniqueColors: 0, luminanceVariance: 0 };
    gl.finish();
    const values = [];
    const colors = new Set();
    const pixel = new Uint8Array(4);
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    for (let row = 1; row <= 10; row += 1) {
      for (let column = 1; column <= 14; column += 1) {
        const x = Math.min(width - 1, Math.floor((column / 15) * width));
        const y = Math.min(height - 1, Math.floor((row / 11) * height));
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
  await page.waitForFunction(() => (
    document.body.dataset.renderState === 'ready'
      && window.__riverLab?.getRuntime?.().rendererReady
  ), null, { timeout: 30_000 });
  await page.waitForTimeout(1400);

  const initial = await page.evaluate(() => {
    const api = window.__riverLab;
    const tabMetrics = [...document.querySelectorAll('[data-mobile-variant]')].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        variant: button.dataset.mobileVariant,
        height: rect.height,
        width: rect.width,
        visible: getComputedStyle(button).display !== 'none' && rect.width > 0 && rect.height > 0,
      };
    });
    return {
      title: document.title,
      bodyLength: document.body.innerText.trim().length,
      renderState: document.body.dataset.renderState,
      h1: document.querySelector('h1')?.innerText.trim() || '',
      truthBadge: document.querySelector('.truth-badge')?.innerText.trim() || '',
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      resultRows: document.querySelectorAll('#result-rows .result-row').length,
      apiMethods: ['getState', 'getRuntime', 'getFlowSnapshot', 'runVerification', 'start', 'pause', 'reset']
        .reduce((result, name) => ({ ...result, [name]: typeof api?.[name] === 'function' }), {}),
      runtime: api.getRuntime(),
      state: api.getState(),
      uniformFlow: api.getFlowSnapshot('uniform'),
      guidedFlow: api.getFlowSnapshot('guided'),
      tabMetrics,
    };
  });

  const flowEvidence = compareFlowSnapshots(initial.uniformFlow, initial.guidedFlow);
  const tickBeforeMotion = initial.state.previewTick;
  await page.waitForTimeout(260);
  const tickAfterMotion = await page.evaluate(() => window.__riverLab.getState().previewTick);

  let playback = { started: false, advanced: false, stable: false, reset: false };
  if (testCase.exercisePlayback) {
    await page.evaluate(() => window.__riverLab.start());
    await page.waitForTimeout(340);
    const runningTick = await page.evaluate(() => window.__riverLab.getState().tick);
    await page.evaluate(() => window.__riverLab.pause());
    const pausedTick = await page.evaluate(() => window.__riverLab.getState().tick);
    await page.waitForTimeout(260);
    const pausedTickLater = await page.evaluate(() => window.__riverLab.getState().tick);
    await page.evaluate(() => window.__riverLab.reset());
    const resetState = await page.evaluate(() => window.__riverLab.getState());
    playback = {
      started: runningTick > 0,
      advanced: runningTick >= 8,
      stable: pausedTick === pausedTickLater,
      reset: resetState.phase === 'idle' && resetState.tick === 0,
    };
  }

  let mobileSwitch = { required: Boolean(testCase.isMobile), switched: true, target: null };
  if (testCase.isMobile) {
    await page.locator('[data-mobile-variant="guided"]').click();
    await page.waitForTimeout(120);
    const mobileVariant = await page.evaluate(() => window.__riverLab.getState().mobileVariant);
    mobileSwitch = { required: true, switched: mobileVariant === 'guided', target: mobileVariant };
  }

  const verification = await page.evaluate(() => window.__riverLab.runVerification());
  await page.waitForTimeout(750);
  const canvasSample = await sampleCanvas(page);
  const finalState = await page.evaluate(() => ({
    state: window.__riverLab.getState(),
    runtime: window.__riverLab.getRuntime(),
    lastResult: window.__riverLab.getLastResult?.() || null,
    resultState: document.querySelector('#result-state')?.innerText.trim() || '',
    conclusion: document.querySelector('#bounded-conclusion')?.innerText.trim() || '',
    resultRows: document.querySelectorAll('#result-rows .result-row').length,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
  }));

  await page.screenshot({ path: path.join(assetsDir, testCase.screenshot), fullPage: true });

  const analysis = verification?.analysis;
  const runtime = finalState.runtime;
  const measuredFrames = runtime.measuredFrames ?? runtime.frameCount ?? 0;
  const frameTelemetryComplete = [
    runtime.frameTimeP50,
    runtime.frameTimeP95,
    runtime.maxFrameTime,
    runtime.longFrameCount,
  ].every(finite)
    && runtime.frameTimeP50 <= runtime.frameTimeP95
    && runtime.frameTimeP95 <= runtime.maxFrameTime
    && runtime.longFrameCount >= 0
    && runtime.longFrameCount <= measuredFrames;
  const mobileTapTargets = !testCase.isMobile || (
    initial.tabMetrics.length === 2
      && initial.tabMetrics.every((tab) => tab.visible && tab.height >= 44 && tab.width >= 44)
  );
  const motionTelemetryAvailable = finite(tickBeforeMotion) && finite(tickAfterMotion);

  const checks = {
    status200: response?.status() === 200,
    hasContent: initial.bodyLength > 800,
    expectedTitle: initial.title.includes('River MVP'),
    expectedHero: initial.h1.includes('同一条河') && initial.h1.includes('两种流向规则'),
    rendererReady: initial.renderState === 'ready' && initial.runtime.rendererReady,
    threePinned: initial.runtime.threeRevision === '185',
    expectedQuality: initial.runtime.qualityTier === testCase.expectedQuality,
    expectedVariants: initial.runtime.renderedVariants === testCase.expectedVariants,
    apiContract: Object.values(initial.apiMethods).every(Boolean),
    canvasNonBlank: canvasSample.available
      && canvasSample.uniqueColors >= 8
      && canvasSample.luminanceVariance >= 5,
    truthBoundary: initial.truthBadge.includes('视觉流向代理'),
    flowUniformWorldZ: flowEvidence.uniformIsWorldZ,
    flowGuidedSplineTangent: flowEvidence.guidedMatchesTangent,
    equalScalarSpeed: flowEvidence.scalarSpeedParity,
    initialMarkerParity: flowEvidence.initialMarkerParity,
    motionTelemetryAvailable,
    reducedMotionStatic: testCase.reducedMotion === 'reduce'
      ? Math.abs(tickAfterMotion - tickBeforeMotion) < 1e-9
      : tickAfterMotion > tickBeforeMotion,
    playbackApi: !testCase.exercisePlayback || Object.values(playback).every(Boolean),
    mobileSingleViewport: !testCase.isMobile || initial.runtime.renderedVariants === 1,
    mobileTapTargets,
    mobileSwitch: mobileSwitch.switched,
    deterministicAB: analysis?.passed === true,
    fixedEndpoint: analysis?.A?.ticks === 1200
      && analysis?.B?.ticks === 1200
      && analysis?.A?.measuredTicks === 960
      && analysis?.B?.measuredTicks === 960,
    commonContract: analysis?.A?.contractHash === analysis?.B?.contractHash,
    noNumericalFailures: analysis?.A?.metrics?.nonFiniteCount === 0
      && analysis?.B?.metrics?.nonFiniteCount === 0,
    resultRendered: finalState.state.phase === 'complete'
      && finalState.state.tick === 1200
      && finalState.resultRows >= 6
      && finalState.resultState.includes('通过'),
    frameTelemetryComplete,
    frameP50Budget: finite(runtime.frameTimeP50) && runtime.frameTimeP50 <= testCase.frameP50Limit,
    frameP95Budget: finite(runtime.frameTimeP95) && runtime.frameTimeP95 <= testCase.frameP95Limit,
    frameMaximumBounded: finite(runtime.maxFrameTime) && runtime.maxFrameTime < 2000,
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
    expectedQuality: testCase.expectedQuality,
    frameBudgets: { p50: testCase.frameP50Limit, p95: testCase.frameP95Limit, max: 2000 },
    initial,
    flowEvidence,
    playback,
    mobileSwitch,
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
  const context = await browser.newContext({
    viewport: { width: 900, height: 700 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));

  const response = await page.goto(`${targetUrl}?forceFallback=1`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });
  await page.waitForFunction(() => document.body.dataset.renderState === 'failed', null, { timeout: 30_000 });
  const state = await page.evaluate(() => {
    const fallback = document.querySelector('#fallback-state');
    const rect = fallback?.getBoundingClientRect();
    return {
      renderState: document.body.dataset.renderState,
      bodyLength: document.body.innerText.trim().length,
      fallbackVisible: Boolean(fallback)
        && getComputedStyle(fallback).display !== 'none'
        && rect.width > 0
        && rect.height > 0,
      reason: document.querySelector('#fallback-reason')?.innerText.trim() || '',
      retryVisible: Boolean(document.querySelector('#retry-renderer')),
      overflowX: document.documentElement.scrollWidth - innerWidth,
      errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
    };
  });
  const checks = {
    status200: response?.status() === 200,
    hasContent: state.bodyLength > 500,
    failedState: state.renderState === 'failed',
    fallbackVisible: state.fallbackVisible,
    reasonVisible: state.reason.length >= 8,
    retryVisible: state.retryVisible,
    noHorizontalOverflow: state.overflowX <= 1,
    noErrorOverlay: !state.errorOverlay,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };
  await page.screenshot({ path: path.join(assetsDir, 'river-fallback.png'), fullPage: true });
  await context.close();
  return {
    viewport: { width: 900, height: 700 },
    reducedMotion: 'reduce',
    state,
    checks,
    consoleErrors,
    pageErrors,
    failedRequests,
    passed: Object.values(checks).every(Boolean),
  };
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
  fs.writeFileSync(path.join(assetsDir, 'river-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
