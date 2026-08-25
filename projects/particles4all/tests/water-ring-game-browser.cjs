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

    await page.locator('#water-pump').click();
    await page.waitForFunction(() => window.__waterRingGame?.state?.pumpCycles > 0, null, { timeout: 10000 });
    await page.waitForFunction(() => window.__waterRingGame?.state?.won === true, null, { timeout: 24000 });
    const afterPlay = await page.evaluate(async () => {
      await window.__waterRingGame.sampleBodies();
      const game = window.__waterRingGame;
      const captured = game.state.bodies.find(body => body.id === game.state.capture?.bodyId);
      return {
        shots: game.state.shots,
        score: game.state.score,
        won: game.state.won,
        phase: game.state.phase,
        captureReason: game.state.capture?.reason,
        capturedBodyId: game.state.capture?.bodyId,
        heldBodyId: game.adapter.window.__sim.heldBody,
        heldAlign: game.adapter.window.__sim.heldAlign,
        capturedCentre: captured?.pose.centre,
        capturedRot: captured?.pose.rot,
        axisAlignment: captured ? Math.abs(captured.pose.rot[4]) : null,
        seat: game.level.peg.seat,
        seatDistance: captured ? Math.hypot(...captured.pose.centre.map((value, index) => value - game.level.peg.seat[index])) : null,
        fluidAdded: game.state.fluidAdded,
        pumpCycles: game.state.pumpCycles,
        pumpState: document.querySelector('#pump-state')?.textContent,
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
      orientationTargetExtension: initial.description.support.bodyOrientationTargets,
      fiveNativeTorus: initial.description.bodyCount === 5 && initial.bodyShapes.length === 5 && initial.bodyShapes.every(shape => shape === 'torus'),
      realFluidInjection: afterPlay.shots > 0 && afterPlay.fluidAdded > 0 && afterPlay.particleCount === initial.description.particleCount + afterPlay.fluidAdded,
      sustainedWaterPump: afterPlay.pumpCycles > 0 && afterPlay.pumpState === '已通关',
      observableBodyMotion: afterPlay.maxTravel > 0.09 || afterPlay.maxLift > 0.02,
      visibleRingState: afterPlay.ringCards === 5,
      projectedGameTarget: afterPlay.targetProjected,
      playableScoreLoop: afterPlay.won && afterPlay.score === 1 && afterPlay.phase === 'hang',
      realTorusHeldOnPeg: afterPlay.capturedBodyId === afterPlay.heldBodyId && afterPlay.heldAlign && afterPlay.seatDistance < 0.05 && afterPlay.axisAlignment > 0.9,
      displayEvidenceSwitch: switched.view === 'particles' && switched.active === 'particles' && switched.frameSrc.includes('view=particles'),
      mobileLayout: mobile.overflow <= 1 && mobile.controlsVisible,
      browserClean: consoleErrors.length === 0 && failedRequests.length === 0,
    };
    report = { passed: Object.values(checks).every(Boolean), checks, initial, afterPlay, switched, mobile, consoleErrors, failedRequests };
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
