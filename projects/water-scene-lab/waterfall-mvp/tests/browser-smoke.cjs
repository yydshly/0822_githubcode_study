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
const targetUrl = process.env.WATERFALL_LAB_URL
  || 'http://127.0.0.1:8107/demos/water-scene-lab/waterfall/';
const chromePath = process.env.WATER_LAB_CHROME
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const testedSourcePaths = {
  app: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'waterfall', 'app.js'),
  html: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'waterfall', 'index.html'),
  css: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'waterfall', 'styles.css'),
  model: path.join(repositoryRoot, 'docs', 'demos', 'water-scene-lab', 'waterfall', 'waterfall-model.mjs'),
  three: path.join(repositoryRoot, 'docs', 'demos', 'shijing-dayu-immersive', 'vendor', 'three.module.js'),
  browserTest: __filename,
};

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function testedSources() {
  return Object.fromEntries(Object.entries(testedSourcePaths).map(([name, filePath]) => [name, {
    repositoryPath: path.relative(repositoryRoot, filePath).split(path.sep).join('/'),
    sha256: sha256(filePath),
  }]));
}

const cases = [
  {
    name: 'desktop',
    screenshot: 'waterfall-desktop.png',
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
    screenshot: 'waterfall-mobile.png',
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
    screenshot: 'waterfall-mobile-reduce.png',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    reducedMotion: 'reduce',
    expectedVariants: 1,
    expectedQuality: 'fallback',
    frameP50Limit: 33,
    frameP95Limit: 66,
    // Reduced motion is static by default. An explicit run remains available and
    // also supplies enough rendered frames for percentile telemetry.
    exercisePlayback: true,
  },
];

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstFinite(...values) {
  return values.find(finite);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function stableString(value) {
  return JSON.stringify(stableValue(value));
}

function stripMetadata(value) {
  if (Array.isArray(value)) return value.map(stripMetadata);
  if (!value || typeof value !== 'object') return value;
  const ignored = new Set([
    'caseid',
    'id',
    'label',
    'name',
    'title',
    'displayname',
    'contracthash',
    'digest',
  ]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !ignored.has(key.toLowerCase()))
      .map(([key, entry]) => [key, stripMetadata(entry)]),
  );
}

function flattenLeaves(value, prefix = '', leaves = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => flattenLeaves(entry, `${prefix}[${index}]`, leaves));
    if (value.length === 0) leaves.set(prefix, '[]');
    return leaves;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    entries.forEach(([key, entry]) => {
      flattenLeaves(entry, prefix ? `${prefix}.${key}` : key, leaves);
    });
    if (entries.length === 0) leaves.set(prefix, '{}');
    return leaves;
  }
  leaves.set(prefix, stableString(value));
  return leaves;
}

function fixedInputView(snapshot) {
  const explicit = firstDefined(
    snapshot?.fixedInputs,
    snapshot?.fixedContract,
    snapshot?.contract,
    snapshot?.config,
  );
  if (explicit && typeof explicit === 'object') {
    const fixed = stripMetadata(explicit);
    if (fixed.breakupMode === undefined) fixed.breakupMode = readBreakupMode(snapshot);
    return fixed;
  }
  return {
    breakupMode: readBreakupMode(snapshot),
    mainCurtain: readMainCurtain(snapshot),
  };
}

function inputDiffPaths(left, right) {
  const leftLeaves = flattenLeaves(fixedInputView(left));
  const rightLeaves = flattenLeaves(fixedInputView(right));
  return [...new Set([...leftLeaves.keys(), ...rightLeaves.keys()])]
    .filter((key) => leftLeaves.get(key) !== rightLeaves.get(key))
    .sort();
}

function readBreakupMode(snapshot) {
  return firstDefined(
    snapshot?.breakupMode,
    snapshot?.fixedInputs?.breakupMode,
    snapshot?.fixedContract?.breakupMode,
    snapshot?.contract?.breakupMode,
    snapshot?.config?.breakupMode,
  );
}

function readMainCurtain(snapshot) {
  return firstDefined(
    snapshot?.mainCurtain,
    snapshot?.layers?.mainCurtain,
    snapshot?.sharedMainCurtain,
    snapshot?.fixedInputs?.mainCurtain,
    snapshot?.fixedContract?.mainCurtain,
    snapshot?.contract?.mainCurtain,
  );
}

function readSupplementalCount(snapshot) {
  const explicit = firstFinite(
    snapshot?.supplementalCount,
    snapshot?.counts?.supplementalCount,
    snapshot?.supplemental?.count,
    snapshot?.layers?.supplementalCount,
  );
  if (finite(explicit)) return explicit;
  const edge = readEdgeCount(snapshot);
  const impact = readImpactCount(snapshot);
  if (finite(edge) || finite(impact)) return (edge || 0) + (impact || 0);
  return null;
}

function readEdgeCount(snapshot) {
  return firstFinite(
    snapshot?.edgeParticleCount,
    snapshot?.dropletCount,
    snapshot?.counts?.edgeParticleCount,
    snapshot?.counts?.droplets,
    snapshot?.supplemental?.edgeParticleCount,
    snapshot?.emitters?.edge?.count,
    snapshot?.emitters?.droplets?.count,
  );
}

function readImpactCount(snapshot) {
  return firstFinite(
    snapshot?.impactParticleCount,
    snapshot?.sprayParticleCount,
    snapshot?.counts?.impactParticleCount,
    snapshot?.counts?.spray,
    snapshot?.supplemental?.impactParticleCount,
    snapshot?.emitters?.impact?.count,
    snapshot?.emitters?.spray?.count,
  );
}

function normalizeLayerSnapshot(snapshot) {
  return {
    breakupMode: readBreakupMode(snapshot),
    mainCurtain: readMainCurtain(snapshot),
    supplementalCount: readSupplementalCount(snapshot),
    edgeParticleCount: readEdgeCount(snapshot),
    impactParticleCount: readImpactCount(snapshot),
  };
}

function compareLayerSnapshots(curtainSnapshot, breakupSnapshot) {
  const curtain = normalizeLayerSnapshot(curtainSnapshot);
  const breakup = normalizeLayerSnapshot(breakupSnapshot);
  const curtainMode = String(curtain.breakupMode ?? '');
  const breakupMode = String(breakup.breakupMode ?? '');
  const mainCurtainPresent = curtain.mainCurtain != null && breakup.mainCurtain != null;
  const mainCurtainParity = mainCurtainPresent
    && stableString(curtain.mainCurtain) === stableString(breakup.mainCurtain);
  const modesDistinct = curtainMode.length > 0
    && breakupMode.length > 0
    && curtainMode !== breakupMode;
  const fixedInputDelta = inputDiffPaths(curtainSnapshot, breakupSnapshot);
  const supplementalSplit = finite(curtain.supplementalCount)
    && finite(breakup.supplementalCount)
    && curtain.supplementalCount === 0
    && breakup.supplementalCount > 0;

  const anyEmitterBreakdown = [
    curtain.edgeParticleCount,
    curtain.impactParticleCount,
    breakup.edgeParticleCount,
    breakup.impactParticleCount,
  ].some(finite);
  const emitterBreakdown = !anyEmitterBreakdown || (
    [
      curtain.edgeParticleCount,
      curtain.impactParticleCount,
      breakup.edgeParticleCount,
      breakup.impactParticleCount,
    ].every(finite)
    && curtain.edgeParticleCount === 0
    && curtain.impactParticleCount === 0
    && breakup.edgeParticleCount > 0
    && breakup.impactParticleCount > 0
  );

  return {
    curtain,
    breakup,
    mainCurtainPresent,
    mainCurtainParity,
    modesDistinct,
    fixedInputDelta,
    onlyBreakupModeDiff: mainCurtainParity
      && modesDistinct
      && fixedInputDelta.length === 1
      && fixedInputDelta[0].split('.').at(-1) === 'breakupMode',
    supplementalSplit,
    emitterBreakdown,
    anyEmitterBreakdown,
  };
}

function analysisCase(analysis, preferred, alternate) {
  return analysis?.[preferred]
    || analysis?.cases?.[preferred]
    || analysis?.[alternate]
    || analysis?.cases?.[alternate]
    || null;
}

function fixedDiagnostics(verification, analysis) {
  const diagnostics = firstDefined(
    verification?.fixedDiagnostics,
    analysis?.fixedDiagnostics,
    analysis?.diagnostics?.fixed,
  );
  if (!diagnostics || typeof diagnostics !== 'object') {
    return { present: false, foam: null, mist: null, lockedOff: true };
  }
  const foam = firstDefined(
    diagnostics.foam,
    diagnostics.foamEnabled,
    diagnostics.exploratoryFoam,
  );
  const mist = firstDefined(
    diagnostics.mist,
    diagnostics.mistEnabled,
    diagnostics.exploratoryMist,
  );
  const present = foam !== undefined || mist !== undefined;
  return {
    present,
    foam: foam ?? null,
    mist: mist ?? null,
    lockedOff: !present || (foam === false && mist === false),
  };
}

async function sampleCanvas(page) {
  return page.locator('#waterfall-canvas').evaluate((canvas) => {
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
      && window.__waterfallLab?.getRuntime?.().rendererReady
  ), null, { timeout: 30_000 });
  await page.waitForTimeout(1400);

  const initial = await page.evaluate(() => {
    const api = window.__waterfallLab;
    const state = api.getState();
    const tabMetrics = [...document.querySelectorAll('[data-mobile-variant]')].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        variant: button.dataset.mobileVariant,
        height: rect.height,
        width: rect.width,
        visible: getComputedStyle(button).display !== 'none'
          && rect.width > 0
          && rect.height > 0,
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
      apiMethods: [
        'getState',
        'getRuntime',
        'getLayerSnapshot',
        'getLastResult',
        'start',
        'pause',
        'reset',
        'runVerification',
      ].reduce((result, name) => ({
        ...result,
        [name]: typeof api?.[name] === 'function',
      }), {}),
      runtime: api.getRuntime(),
      state,
      motionValue: state.previewTick ?? state.previewTime ?? state.time ?? 0,
      curtainLayers: api.getLayerSnapshot('curtain'),
      breakupLayers: api.getLayerSnapshot('breakup'),
      tabMetrics,
    };
  });

  const layerEvidence = compareLayerSnapshots(initial.curtainLayers, initial.breakupLayers);
  const motionBefore = initial.motionValue;
  await page.waitForTimeout(260);
  const motionAfter = await page.evaluate(() => {
    const state = window.__waterfallLab.getState();
    return state.previewTick ?? state.previewTime ?? state.time ?? 0;
  });

  let playback = { started: false, advanced: false, stable: false, reset: false };
  if (testCase.exercisePlayback) {
    await page.evaluate(() => window.__waterfallLab.start());
    await page.waitForTimeout(340);
    const runningTick = await page.evaluate(() => window.__waterfallLab.getState().tick);
    await page.evaluate(() => window.__waterfallLab.pause());
    const pausedTick = await page.evaluate(() => window.__waterfallLab.getState().tick);
    await page.waitForTimeout(260);
    const pausedTickLater = await page.evaluate(() => window.__waterfallLab.getState().tick);
    await page.evaluate(() => window.__waterfallLab.reset());
    const resetState = await page.evaluate(() => window.__waterfallLab.getState());
    playback = {
      started: runningTick > 0,
      advanced: runningTick >= 8,
      stable: pausedTick === pausedTickLater,
      reset: resetState.phase === 'idle' && resetState.tick === 0,
    };
  }

  let mobileSwitch = { required: Boolean(testCase.isMobile), switched: true, target: null };
  if (testCase.isMobile) {
    await page.locator('[data-mobile-variant="breakup"]').click();
    await page.waitForTimeout(120);
    const mobileVariant = await page.evaluate(() => window.__waterfallLab.getState().mobileVariant);
    mobileSwitch = {
      required: true,
      switched: mobileVariant === 'breakup',
      target: mobileVariant,
    };
  }

  const verification = await page.evaluate(() => window.__waterfallLab.runVerification());
  await page.waitForTimeout(750);
  const canvasSample = await sampleCanvas(page);
  const finalState = await page.evaluate(() => ({
    state: window.__waterfallLab.getState(),
    runtime: window.__waterfallLab.getRuntime(),
    lastResult: window.__waterfallLab.getLastResult(),
    resultState: document.querySelector('#result-state')?.innerText.trim() || '',
    conclusion: document.querySelector('#bounded-conclusion')?.innerText.trim() || '',
    resultRows: document.querySelectorAll('#result-rows .result-row').length,
    formalDiagnosticsDisabled: ['foam-toggle', 'mist-toggle']
      .every((id) => document.getElementById(id)?.disabled === true),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    errorOverlay: Boolean(document.querySelector(
      '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
    )),
  }));

  await page.screenshot({ path: path.join(assetsDir, testCase.screenshot), fullPage: true });

  const analysis = verification?.analysis || verification;
  const curtainAnalysis = analysisCase(analysis, 'A', 'curtain');
  const breakupAnalysis = analysisCase(analysis, 'B', 'breakup');
  const diagnostics = fixedDiagnostics(verification, analysis);
  const analysisOnlyBreakupMode = analysis?.checks?.onlyBreakupModeDiffers === true
    && Array.isArray(analysis?.configDifferences)
    && analysis.configDifferences.length === 1
    && analysis.configDifferences[0] === 'breakupMode';
  const analysisCurtainParity = analysis?.checks?.commonCurtainHash === true
    && analysis?.checks?.identicalCurtainGeometry === true;
  const fixedLayerCounts = [curtainAnalysis, breakupAnalysis]
    .flatMap((entry) => [
      entry?.layers?.foamLayerCount,
      entry?.layers?.mistLayerCount,
    ]);
  const fixedLayerDiagnosticsOff = fixedLayerCounts.every((count) => count === 0);
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
  const resultAnalysis = finalState.lastResult?.analysis || finalState.lastResult;
  const lastCurtain = analysisCase(resultAnalysis, 'A', 'curtain');
  const lastBreakup = analysisCase(resultAnalysis, 'B', 'breakup');

  const checks = {
    status200: response?.status() === 200,
    hasContent: initial.bodyLength > 800,
    expectedTitle: initial.title.includes('Waterfall MVP'),
    expectedHero: initial.h1.includes('同一面水幕')
      && initial.h1.includes('粒子层'),
    rendererReady: initial.renderState === 'ready' && initial.runtime.rendererReady,
    threePinned: initial.runtime.threeRevision === '185',
    expectedQuality: initial.runtime.qualityTier === testCase.expectedQuality,
    expectedVariants: initial.runtime.renderedVariants === testCase.expectedVariants,
    apiContract: Object.values(initial.apiMethods).every(Boolean),
    canvasNonBlank: canvasSample.available
      && canvasSample.uniqueColors >= 8
      && canvasSample.luminanceVariance >= 5,
    truthBoundary: initial.truthBadge.includes('混合 VFX')
      && initial.truthBadge.includes('代理'),
    mainCurtainParity: layerEvidence.mainCurtainParity,
    onlyBreakupModeDiff: layerEvidence.onlyBreakupModeDiff,
    analysisCurtainParity,
    analysisOnlyBreakupMode,
    supplementalLayerSplit: layerEvidence.supplementalSplit,
    twoEmitterBreakdownWhenExposed: layerEvidence.emitterBreakdown,
    motionTelemetryAvailable: finite(motionBefore) && finite(motionAfter),
    reducedMotionStatic: testCase.reducedMotion === 'reduce'
      ? Math.abs(motionAfter - motionBefore) < 1e-9
      : motionAfter > motionBefore,
    explicitPlayback: !testCase.exercisePlayback || Object.values(playback).every(Boolean),
    mobileSingleViewport: !testCase.isMobile || initial.runtime.renderedVariants === 1,
    mobileTapTargets,
    mobileSwitch: mobileSwitch.switched,
    deterministicAB: analysis?.passed === true,
    fixedEndpoint: curtainAnalysis?.ticks === 1200
      && breakupAnalysis?.ticks === 1200
      && curtainAnalysis?.measuredTicks === 960
      && breakupAnalysis?.measuredTicks === 960,
    foamMistLockedOff: diagnostics.present && diagnostics.lockedOff && fixedLayerDiagnosticsOff,
    noNumericalFailures: curtainAnalysis?.metrics?.nonFiniteCount === 0
      && breakupAnalysis?.metrics?.nonFiniteCount === 0,
    lastResultMatches: lastCurtain?.ticks === 1200 && lastBreakup?.ticks === 1200,
    resultRendered: finalState.state.phase === 'complete'
      && finalState.state.tick === 1200
      && finalState.resultRows >= 6
      && finalState.resultState.includes('通过'),
    formalDiagnosticsDisabled: finalState.formalDiagnosticsDisabled,
    frameTelemetryComplete,
    frameP50Budget: finite(runtime.frameTimeP50)
      && runtime.frameTimeP50 <= testCase.frameP50Limit,
    frameP95Budget: finite(runtime.frameTimeP95)
      && runtime.frameTimeP95 <= testCase.frameP95Limit,
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
    layerEvidence,
    playback,
    mobileSwitch,
    verification,
    fixedDiagnostics: diagnostics,
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
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
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
  await page.waitForFunction(
    () => document.body.dataset.renderState === 'failed',
    null,
    { timeout: 30_000 },
  );
  const state = await page.evaluate(() => {
    const fallback = document.querySelector('#fallback-state');
    const fallbackRect = fallback?.getBoundingClientRect();
    const retry = document.querySelector('#retry-renderer');
    const retryRect = retry?.getBoundingClientRect();
    return {
      renderState: document.body.dataset.renderState,
      bodyLength: document.body.innerText.trim().length,
      fallbackVisible: Boolean(fallback)
        && getComputedStyle(fallback).display !== 'none'
        && fallbackRect.width > 0
        && fallbackRect.height > 0,
      reason: document.querySelector('#fallback-reason')?.innerText.trim() || '',
      retryVisible: Boolean(retry)
        && getComputedStyle(retry).display !== 'none'
        && retryRect.width > 0
        && retryRect.height > 0,
      retryHeight: retryRect?.height || 0,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      errorOverlay: Boolean(document.querySelector(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      )),
    };
  });
  const checks = {
    status200: response?.status() === 200,
    hasContent: state.bodyLength > 500,
    failedState: state.renderState === 'failed',
    fallbackVisible: state.fallbackVisible,
    reasonVisible: state.reason.length >= 8,
    retryVisible: state.retryVisible,
    retryTapTarget: state.retryHeight >= 44,
    noHorizontalOverflow: state.overflowX <= 1,
    noErrorOverlay: !state.errorOverlay,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };
  await page.screenshot({
    path: path.join(assetsDir, 'waterfall-fallback.png'),
    fullPage: true,
  });
  await context.close();
  return {
    viewport: { width: 390, height: 844 },
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
    testedSources: testedSources(),
    apiAssumptions: {
      global: 'window.__waterfallLab',
      methods: [
        'getState',
        'getRuntime',
        'getLayerSnapshot',
        'getLastResult',
        'start',
        'pause',
        'reset',
        'runVerification',
      ],
      caseIds: ['curtain', 'breakup'],
      fixedDifference: 'breakupMode',
      supplementalLayer: 'edge droplets + impact spray; foam/mist locked off in verification',
    },
    passed: results.every((result) => result.passed) && fallback.passed,
    results,
    fallback,
  };
  fs.writeFileSync(
    path.join(assetsDir, 'waterfall-browser-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
