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
const targetUrl = process.env.WATER_LAB_WATERSHED_URL
  || 'http://127.0.0.1:8107/demos/water-scene-lab/watershed/';
const chromePath = process.env.WATER_LAB_CHROME
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const label = (process.env.WATER_LAB_BENCHMARK_LABEL || 'sample').replace(/[^a-z0-9_-]/gi, '-');
const sampleTarget = Number(process.env.WATER_LAB_BENCHMARK_FRAMES || 60);

const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, quality: 'balanced', expectedVariants: 2, canvasHeight: 804 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, quality: 'fallback', expectedVariants: 1, isMobile: true },
];

async function benchmarkCase(browser, testCase) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    isMobile: Boolean(testCase.isMobile),
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${targetUrl}?quality=${testCase.quality}`, { waitUntil: 'networkidle', timeout: 25_000 });
  await page.waitForFunction(() => document.body.dataset.renderState === 'ready', null, { timeout: 20_000 });
  if (testCase.canvasHeight) {
    await page.addStyleTag({ content: `.scene-viewport { height: ${testCase.canvasHeight}px; min-height: ${testCase.canvasHeight}px; }` });
    await page.waitForFunction(
      (height) => window.__watershedLab.getRuntime().viewport.height === height,
      testCase.canvasHeight,
      { timeout: 5_000 },
    );
  }
  await page.evaluate(() => window.__watershedLab.resetPerformanceSamples());
  await page.waitForFunction(
    (target) => window.__watershedLab.getRuntime().frameSampleCount >= target,
    sampleTarget,
    { timeout: 25_000 },
  );
  const runtime = await page.evaluate(() => window.__watershedLab.getRuntime());
  const result = {
    name: testCase.name,
    viewport: testCase.viewport,
    quality: testCase.quality,
    sampleTarget,
    runtime,
    consoleErrors,
    pageErrors,
    checks: {
      rendererReady: runtime.rendererReady,
      sampleCount: runtime.frameSampleCount >= sampleTarget,
      finiteP50: Number.isFinite(runtime.frameTimeP50),
      finiteP95: Number.isFinite(runtime.frameTimeP95),
      correctVariants: runtime.renderedVariants === testCase.expectedVariants,
      controlledCanvas: !testCase.canvasHeight || runtime.viewport.height === testCase.canvasHeight,
      noContextLoss: runtime.contextLostCount === 0,
      noConsoleErrors: consoleErrors.length === 0,
      noPageErrors: pageErrors.length === 0,
    },
  };
  result.passed = Object.values(result.checks).every(Boolean);
  await context.close();
  return result;
}

(async () => {
  fs.mkdirSync(assetsDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  try {
    const results = [];
    for (const testCase of cases) results.push(await benchmarkCase(browser, testCase));
    const report = {
      createdAt: new Date().toISOString(),
      label,
      targetUrl,
      browserVersion: browser.version(),
      renderer: 'SwiftShader',
      results,
      passed: results.every((result) => result.passed),
    };
    const outputPath = path.join(assetsDir, `watershed-performance-${label}.json`);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
