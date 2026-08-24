const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.SANDBOX_URL || 'http://127.0.0.1:8107/demos/water-scene-lab/sandbox/';
const executablePath = process.env.BROWSER_EXECUTABLE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(outputDir, 'host-shell-browser-results.json');

const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'compact-desktop', viewport: { width: 1280, height: 900 } },
];

async function runCase(browser, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => document.body.dataset.ready === 'true');

  const selections = [];
  for (const id of ['spillway-impact-block', 'channel-drifting-block', 'surface-rescue-ring']) {
    await page.locator(`[data-preset-id="${id}"]`).click();
    selections.push(await page.evaluate(() => ({
      state: window.__waterSandbox.getState(),
      title: document.querySelector('#preset-title')?.textContent,
      role: document.querySelector('#body-role')?.textContent,
      sourceHref: document.querySelector('#source-link')?.getAttribute('href'),
      activeTabs: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
    })));
  }

  if (testCase.id === 'desktop') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: path.join(outputDir, 'host-shell-uplift-desktop.png'), fullPage: true });
  }

  const activeTab = page.locator('[role="tab"][aria-selected="true"]');
  await activeTab.focus();
  await page.keyboard.press('ArrowDown');
  const keyboardState = await page.evaluate(() => {
    const focused = document.activeElement;
    return {
      selectedId: window.__waterSandbox.getState().selectedId,
      focusedPresetId: focused?.dataset?.presetId || null,
      outlineStyle: getComputedStyle(focused).outlineStyle,
      outlineWidth: getComputedStyle(focused).outlineWidth,
    };
  });
  if (testCase.id === 'desktop') {
    await page.screenshot({ path: path.join(outputDir, 'host-shell-focus-desktop.png'), fullPage: true });
  }

  await page.evaluate(() => {
    window.__waterSandbox.selectPreset('spillway-impact-block');
    document.activeElement?.blur();
  });

  const state = await page.evaluate(() => ({
    api: window.__waterSandbox.getState(),
    registry: window.__waterSandbox.getPresetRegistry(),
    title: document.title,
    h1: document.querySelector('h1')?.innerText,
    workspaceHeight: document.querySelector('#workspace')?.getBoundingClientRect().height,
    tabCount: document.querySelectorAll('[role="tab"]').length,
    activeTabCount: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
    runtimeFrameSrc: document.querySelector('#runtime-frame')?.getAttribute('src'),
    truthText: document.querySelector('.truth-boundary')?.textContent,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    ready: document.body.dataset.ready,
  }));

  const expected = [
    ['spillway-impact-block', 'dense-impact-block', '../waterfall/'],
    ['channel-drifting-block', 'drifting-debris-block', '../river/'],
    ['surface-rescue-ring', 'floating-ring-probe', '../ocean/'],
  ];
  const checks = {
    status200: response?.status() === 200,
    expectedTitle: state.title.includes('Interactive Water Sandbox'),
    expectedHero: state.h1.includes('原库能力') && state.h1.includes('真实使用场景'),
    readableWorkspace: state.workspaceHeight >= 600 && state.truthText.includes('不代表现实浮力'),
    threePresets: state.tabCount === 3 && state.registry.length === 3,
    selectionsMatch: selections.every((item, index) => item.state.selectedId === expected[index][0] &&
      item.role === expected[index][1] && item.sourceHref === expected[index][2] && item.activeTabs === 1),
    keyboardSelection: keyboardState.selectedId === 'spillway-impact-block' &&
      keyboardState.focusedPresetId === 'spillway-impact-block',
    visibleFocus: keyboardState.outlineStyle !== 'none' && parseFloat(keyboardState.outlineWidth) >= 2,
    singleActiveTab: state.activeTabCount === 1,
    noRuntimeLoaded: state.api.phase === 'idle' && state.api.runtimeSlots === 0 &&
      state.api.runtimeLoaded === false && state.api.iframeHasSource === false && state.runtimeFrameSrc == null,
    noHorizontalOverflow: state.horizontalOverflow <= 1,
    readyState: state.ready === 'true',
    noConsoleErrors: consoleErrors.length === 0,
    noPageErrors: pageErrors.length === 0,
    noFailedRequests: failedRequests.length === 0,
  };

  await page.screenshot({ path: path.join(outputDir, `host-shell-${testCase.id}.png`), fullPage: true });
  await context.close();
  return { ...testCase, state, selections, keyboardState, checks, consoleErrors, pageErrors, failedRequests,
    passed: Object.values(checks).every(Boolean) };
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  const browserVersion = await browser.version();
  const results = [];
  try {
    for (const testCase of cases) results.push(await runCase(browser, testCase));
  } finally {
    await browser.close();
  }
  const report = { baseUrl, executablePath, browserVersion, passed: results.every(item => item.passed), results };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    passed: report.passed,
    browserVersion,
    cases: results.map(item => ({ id: item.id, passed: item.passed,
      failed: Object.entries(item.checks).filter(([, value]) => !value).map(([name]) => name) })),
    outputPath,
  }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
