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
const targetUrl = process.env.WATER_LAB_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/';
const chromePath = process.env.WATER_LAB_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
];

async function verifyCase(browser, testCase) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    isMobile: Boolean(testCase.isMobile),
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
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' });
  });

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.locator('h1').waitFor({ state: 'visible' });

  const state = await page.evaluate(() => {
    const overflowElements = Array.from(document.querySelectorAll('body *'))
      .filter((element) => getComputedStyle(element).position !== 'fixed')
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > window.innerWidth + 1 || rect.left < -1)
      .slice(0, 12)
      .map(({ element, rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));

    return {
      title: document.title,
      bodyLength: document.body.innerText.trim().length,
      h1: document.querySelector('h1')?.innerText.trim() || '',
      programCards: document.querySelectorAll('.program-card').length,
      activeProgramCards: document.querySelectorAll('.program-card.program-active').length,
      moduleCards: document.querySelectorAll('.module-card').length,
      decisionRows: document.querySelectorAll('.decision-row').length,
      timelineItems: document.querySelectorAll('.timeline > li').length,
      activeTimelineItems: document.querySelectorAll('.timeline > li.timeline-next').length,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowElements,
      errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
      particlesHref: document.querySelector('a[href="../particles4all/"]')?.getAttribute('href') || '',
      oceanHref: document.querySelector('a[href="./ocean/"]')?.getAttribute('href') || '',
      riverHref: document.querySelector('a[href="./river/"]')?.getAttribute('href') || '',
      waterfallHref: document.querySelector('a[href="./waterfall/"]')?.getAttribute('href') || '',
      sandboxHref: document.querySelector('a[href="./sandbox/"]')?.getAttribute('href') || '',
      watershedHref: document.querySelector('a[href^="./watershed/"]')?.getAttribute('href') || '',
      evidenceBranches: document.querySelectorAll('.status-evidence').length,
      activeRouteDots: document.querySelectorAll('.position-meter .active').length,
      sharedContracts: document.querySelectorAll('.shared-interface li').length,
      goalChain: document.querySelector('.goal-chain')?.innerText.trim() || '',
    };
  });

  const visibleRouteLink = page.locator('a[href="#route"]:visible').first();
  if (await visibleRouteLink.count()) await visibleRouteLink.click();
  else await page.evaluate(() => { location.hash = '#route'; });
  await page.waitForFunction(() => location.hash === '#route');
  const routeVisible = await page.locator('#route').isVisible();
  await page.screenshot({
    path: path.join(assetsDir, `route-${testCase.name}.png`),
    fullPage: true,
  });

  const checks = {
    status200: response?.status() === 200,
    hasContent: state.bodyLength > 500,
    expectedTitle: state.title.includes('Water Scene Platform'),
    expectedHero: state.h1.includes('水的能力') && state.h1.includes('水体场景基座'),
    macroPrograms: state.programCards === 3 && state.activeProgramCards === 1,
    allModules: state.moduleCards === 5,
    decisionTable: state.decisionRows === 6,
    roadmap: state.timelineItems === 9,
    oneActiveRoadmapStage: state.activeTimelineItems === 1,
    routeNavigation: routeVisible,
    particlesLink: state.particlesHref === '../particles4all/',
    oceanLink: state.oceanHref === './ocean/',
    riverLink: state.riverHref === './river/',
    waterfallLink: state.waterfallHref === './waterfall/',
    sandboxLink: state.sandboxHref === './sandbox/',
    watershedLink: state.watershedHref.startsWith('./watershed/'),
    evidenceBranchCount: state.evidenceBranches === 4,
    activeRouteDots: state.activeRouteDots === 5,
    sharedContractCount: state.sharedContracts === 8,
    goalDrivenFlow: state.goalChain.includes('宏观场景') && state.goalChain.includes('场景集成'),
    noHorizontalOverflow: state.overflowX <= 1,
    noErrorOverlay: !state.errorOverlay,
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };

  await context.close();
  return {
    name: testCase.name,
    viewport: testCase.viewport,
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
  try {
    for (const testCase of cases) results.push(await verifyCase(browser, testCase));
  } finally {
    await browser.close();
  }

  const report = {
    targetUrl,
    createdAt: new Date().toISOString(),
    browser: { engine: 'Chromium', version: browserVersion },
    passed: results.every((result) => result.passed),
    results,
  };
  fs.writeFileSync(path.join(assetsDir, 'route-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
