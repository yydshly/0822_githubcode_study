const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = 'http://127.0.0.1:8107/demos/particles4all/water-ring-game/';
const outputDir = path.resolve(__dirname, '../assets');

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
    await page.waitForFunction(() => window.__waterRingGame?.state?.ready === true, null, { timeout: 60000 });
    const initial = await page.evaluate(async () => {
      const game = window.__waterRingGame;
      const bodySample = await game.adapter.sampleBodies();
      game.adapter.setPaused(false);
      const description = game.adapter.describe();
      return {
        description,
        bodyShapes: bodySample.bodies.map(body => body.shape),
        bodyCentres: bodySample.bodies.map(body => body.pose.centre),
        canvasWebgpu: Boolean(document.querySelector('#runtime-frame')?.contentDocument?.querySelector('#view')?.getContext('webgpu')),
      };
    });

    await page.locator('#jet-left').click();
    await page.locator('#jet-up').click();
    await page.locator('#jet-left').click();
    await page.waitForTimeout(2600);
    const afterJets = await page.evaluate(async () => {
      await window.__waterRingGame.sampleBodies();
      const game = window.__waterRingGame;
      return {
        shots: game.state.shots,
        score: game.state.score,
        fluidAdded: game.state.fluidAdded,
        maxLift: game.state.maxLift,
        maxTravel: game.state.maxTravel,
        particleCount: game.adapter.describe().particleCount,
        bodyCentres: game.state.bodies.map(body => body.pose.centre),
        ringCards: document.querySelectorAll('.ring-status').length,
        targetProjected: document.querySelector('#target-rack')?.dataset.projected === 'true',
        status: document.querySelector('#game-status')?.textContent,
      };
    });

    await page.screenshot({ path: path.join(outputDir, 'water-ring-game-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      controlsVisible: ['#jet-left', '#jet-up', '#jet-right'].every(selector => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height >= 44;
      }),
    }));
    await page.screenshot({ path: path.join(outputDir, 'water-ring-game-390.png'), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-view="particles"]').click();
    await page.waitForFunction(() => window.__waterRingGame?.state?.ready === true && window.__waterRingGame.state.view === 'particles');
    const switched = await page.evaluate(() => ({
      view: window.__waterRingGame.state.view,
      frameSrc: document.querySelector('#runtime-frame')?.getAttribute('src'),
      active: document.querySelector('[data-view][aria-pressed="true"]')?.dataset.view,
    }));

    const checks = {
      http200: response?.status() === 200,
      sourceRuntime: initial.canvasWebgpu && initial.description.upstreamRuntime,
      fiveNativeTorus: initial.description.bodyCount === 5 && initial.bodyShapes.length === 5 && initial.bodyShapes.every(shape => shape === 'torus'),
      realFluidInjection: afterJets.shots === 3 && afterJets.fluidAdded > 0 && afterJets.particleCount === initial.description.particleCount + afterJets.fluidAdded,
      observableBodyMotion: afterJets.maxTravel > 0.005 || afterJets.maxLift > 0.005,
      visibleRingState: afterJets.ringCards === 5,
      projectedGameTarget: afterJets.targetProjected,
      playableScoreLoop: afterJets.score >= 1,
      displayEvidenceSwitch: switched.view === 'particles' && switched.active === 'particles' && switched.frameSrc.includes('view=particles'),
      mobileLayout: mobile.overflow <= 1 && mobile.controlsVisible,
      browserClean: consoleErrors.length === 0 && failedRequests.length === 0,
    };
    report = { passed: Object.values(checks).every(Boolean), checks, initial, afterJets, switched, mobile, consoleErrors, failedRequests };
  } catch (error) {
    report = { passed: false, error: error.message, stack: error.stack, consoleErrors, failedRequests };
  } finally {
    fs.writeFileSync(path.join(outputDir, 'water-ring-game-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
