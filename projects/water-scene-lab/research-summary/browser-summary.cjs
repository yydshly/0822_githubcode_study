const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = 'http://127.0.0.1:8107/demos/water-scene-lab/research-summary/';
const outputDir = path.resolve(__dirname, 'assets');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  let report;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#upstream-frame')?.contentWindow?.__sim);
    const initialRuntime = await page.evaluate(() => ({
      frameSrc: document.querySelector('#upstream-frame')?.getAttribute('src'),
      upstreamRuntime: Boolean(document.querySelector('#upstream-frame')?.contentWindow?.__sim),
      webgpuContext: Boolean(document.querySelector('#upstream-frame')?.contentDocument?.querySelector('canvas#view')?.getContext('webgpu')),
    }));

    await page.locator('[data-demo="particles"]').click();
    await page.waitForFunction(() => document.querySelector('#upstream-frame')?.contentWindow?.__sim &&
      document.querySelector('#upstream-frame')?.getAttribute('src')?.includes('view=particles'));
    const switched = await page.evaluate(() => ({
      frameSrc: document.querySelector('#upstream-frame')?.getAttribute('src'),
      title: document.querySelector('#demo-title')?.textContent,
      active: document.querySelector('[data-demo].active')?.dataset.demo,
    }));
    await page.locator('[data-demo="ssfr"]').click();
    await page.waitForFunction(() => document.querySelector('#upstream-frame')?.contentWindow?.__sim &&
      document.querySelector('#upstream-frame')?.getAttribute('src')?.includes('view=ssfr'));

    await page.screenshot({ path: path.join(outputDir, 'research-summary-upstream-first-hero.png') });
    await page.screenshot({ path: path.join(outputDir, 'research-summary-upstream-first-full.png'), fullPage: true });

    const state = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent.trim(),
      sections: ['upstream', 'capabilities', 'exploration', 'extensions'].every(id => Boolean(document.getElementById(id))),
      images: [...document.images].map(image => ({ complete: image.complete, width: image.naturalWidth })),
      labels: document.body.innerText.includes('U0 源库原生') && document.body.innerText.includes('U1 受控探索') &&
        document.body.innerText.includes('E1 场景扩展') && document.body.innerText.includes('STOP 尚不支持'),
      commit: document.body.innerText.includes('f0ab7c2') && document.body.innerText.includes('ENGINE / WGSL UNMODIFIED'),
      sourceHref: document.querySelector('.source-link')?.href,
      labHref: document.querySelector('.decision a')?.href,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));

    const checks = {
      http200: response?.status() === 200,
      upstreamRuntime: initialRuntime.upstreamRuntime && initialRuntime.webgpuContext && initialRuntime.frameSrc.includes('particles4all/engine'),
      sourceEffectSwitch: switched.frameSrc.includes('view=particles') && switched.title.includes('原始粒子') && switched.active === 'particles',
      sourceBoundaryLabels: state.labels && state.commit,
      capabilitySections: state.sections,
      evidenceImages: state.images.length === 5 && state.images.every(image => image.complete && image.width > 0),
      sourceAndLabLinks: state.sourceHref.includes('github.com/matsuoka-601/Particles4All') && state.labHref.includes('/demos/particles4all/'),
      desktopNoOverflow: state.overflow <= 1,
      browserClean: consoleErrors.length === 0 && failedRequests.length === 0,
    };
    report = { passed: Object.values(checks).every(Boolean), checks, initialRuntime, switched, state, consoleErrors, failedRequests };
  } catch (error) {
    report = { passed: false, error: error.message, stack: error.stack, consoleErrors, failedRequests };
  } finally {
    fs.writeFileSync(path.join(outputDir, 'browser-summary-results.json'), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
