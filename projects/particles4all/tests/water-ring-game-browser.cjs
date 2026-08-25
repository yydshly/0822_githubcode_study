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
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
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
      const apparatus = game.adapter.describeApparatus();
      game.adapter.window.__waterRingFrameToken ||= `frame-${Date.now()}-${Math.random()}`;
      return {
        description,
        apparatus,
        frameToken: game.adapter.window.__waterRingFrameToken,
        bodyShapes: bodySample.bodies.map(body => body.shape),
        bodyCentres: bodySample.bodies.map(body => body.pose.centre),
        canvasWebgpu: Boolean(document.querySelector('#runtime-frame')?.contentDocument?.querySelector('#view')?.getContext('webgpu')),
      };
    });

    await page.evaluate(() => scrollTo(0, document.querySelector('#game').offsetTop));
    await page.waitForTimeout(250);
    const desktopLayout = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const topbar = rect('.topbar');
      const gameHead = rect('.game-head');
      const pump = rect('#water-pump');
      const progress = rect('#play-progress');
      return {
        headerCovered: topbar.bottom > gameHead.top && topbar.top <= gameHead.bottom,
        pumpVisible: pump.top >= 0 && pump.bottom <= innerHeight,
        progressVisible: progress.top >= 0 && progress.bottom <= innerHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });

    const reliabilityRuns = [];
    let pumpVisualEvidence = null;
    for (let round = 1; round <= 3; round += 1) {
      if (round > 1) {
        const beforeReset = await page.evaluate(() => ({
          resetCount: window.__waterRingGame.state.resetCount,
          generation: window.__waterRingGame.state.generation,
          frameToken: window.__waterRingGame.adapter.window.__waterRingFrameToken,
        }));
        await page.locator('#reset-game').click();
        await page.waitForFunction(previous => window.__waterRingGame?.state?.ready === true &&
          window.__waterRingGame.state.playable === true && window.__waterRingGame.state.resetCount > previous,
          beforeReset.resetCount, { timeout: 60000 });
        const afterReset = await page.evaluate(() => ({
          resetCount: window.__waterRingGame.state.resetCount,
          generation: window.__waterRingGame.state.generation,
          frameToken: window.__waterRingGame.adapter.window.__waterRingFrameToken,
          lastResetInPlace: window.__waterRingGame.state.lastResetInPlace,
        }));
        reliabilityRuns.push({ round: `${round}-reset`, reset: true, beforeReset, afterReset });
      }
      const startedAt = Date.now();
      await page.locator('#water-pump').click();
      await page.waitForFunction(() => window.__waterRingGame?.state?.pumpCycles > 0, null, { timeout: 10000 });
      if (round === 1) {
        pumpVisualEvidence = await page.evaluate(() => window.__waterRingGame.adapter.describeApparatus());
        await page.screenshot({ path: path.join(outputDir, 'water-ring-game-pump-active.png') });
      }
      await page.waitForFunction(() => window.__waterRingGame?.state?.won === true, null, { timeout: 20000 });
      reliabilityRuns.push(await page.evaluate((payload) => ({
        round: payload.round,
        elapsedMs: Date.now() - payload.startedAt,
        won: window.__waterRingGame.state.won,
        pumpCycles: window.__waterRingGame.state.pumpCycles,
        captureReason: window.__waterRingGame.state.capture?.reason,
        eventTypes: window.__waterRingGame.state.events.map(event => event.type),
        fluidNozzles: window.__waterRingGame.state.events.filter(event => event.type === 'fluid-pulse').map(event => event.nozzle),
      }), { round, startedAt }));
    }
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
        pumpLabel: document.querySelector('#water-pump strong')?.textContent,
        maxLift: game.state.maxLift,
        maxTravel: game.state.maxTravel,
        particleCount: game.adapter.describe().particleCount,
        bodyCentres: game.state.bodies.map(body => body.pose.centre),
        ringCards: document.querySelectorAll('.ring-status').length,
        apparatus: game.adapter.describeApparatus(),
        frameToken: game.adapter.window.__waterRingFrameToken,
        status: document.querySelector('#game-status')?.textContent,
        progressTitle: document.querySelector('#play-progress strong')?.textContent,
        progressState: document.querySelector('#play-progress')?.dataset.state,
        eventTypes: game.state.events.map(event => event.type),
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

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator('[data-view="particles"]').click();
    await page.waitForFunction(() => window.__waterRingGame?.state?.ready === true && window.__waterRingGame.state.view === 'particles');
    const switched = await page.evaluate(() => ({
      view: window.__waterRingGame.state.view,
      frameSrc: document.querySelector('#runtime-frame')?.getAttribute('src'),
      frameToken: window.__waterRingGame.adapter.window.__waterRingFrameToken,
      runtimeDisplay: window.__waterRingGame.adapter.window.__ui.display,
      active: document.querySelector('[data-view][aria-pressed="true"]')?.dataset.view,
    }));

    const completedRuns = reliabilityRuns.filter(run => !run.reset);
    const resetRuns = reliabilityRuns.filter(run => run.reset);

    const checks = {
      http200: response?.status() === 200,
      sourceRuntime: initial.canvasWebgpu && initial.description.upstreamRuntime,
      orientationTargetExtension: initial.description.support.bodyOrientationTargets,
      fiveNativeTorus: initial.description.bodyCount === 5 && initial.bodyShapes.length === 5 && initial.bodyShapes.every(shape => shape === 'torus'),
      realFluidInjection: afterPlay.shots > 0 && afterPlay.fluidAdded > 0 && afterPlay.particleCount === initial.description.particleCount + afterPlay.fluidAdded,
      sustainedWaterPump: afterPlay.pumpCycles > 0 && afterPlay.pumpState === '已通关',
      repeatableCompletion: completedRuns.length === 3 && completedRuns.every(run => run.won && run.elapsedMs < 20000 && run.eventTypes.includes('game-complete')),
      noStartupRace: completedRuns.every(run => {
        const ready = Math.max(run.eventTypes.indexOf('game-ready'), run.eventTypes.indexOf('game-ready-after-reset'));
        return ready >= 0 && ready < run.eventTypes.indexOf('pump-start') && !run.eventTypes.includes('pump-no-target');
      }),
      observableBodyMotion: afterPlay.maxTravel > 0.09 || afterPlay.maxLift > 0.02,
      visibleRingState: afterPlay.ringCards === 5,
      inSceneApparatus: initial.apparatus?.parts?.length >= 7 &&
        initial.apparatus.parts.some(part => part.key === 'peg-post' && part.role === 'target') &&
        initial.apparatus.parts.filter(part => part.role === 'nozzle').length === 3 &&
        afterPlay.apparatus?.physicalCollision === false,
      pumpMappedToVisibleNozzles: completedRuns.every(run => run.fluidNozzles.length > 0 &&
        run.fluidNozzles.every(nozzle => ['left', 'up', 'right'].includes(nozzle))) &&
        pumpVisualEvidence?.pumpActive === true && ['left', 'up', 'right'].includes(pumpVisualEvidence.activeNozzle),
      playableScoreLoop: afterPlay.won && afterPlay.score === 1 && afterPlay.phase === 'hang',
      visibleCompletionFeedback: afterPlay.progressState === 'complete' && afterPlay.progressTitle.includes('通关') && afterPlay.pumpLabel === '本局已完成',
      desktopUiClear: !desktopLayout.headerCovered && desktopLayout.pumpVisible && desktopLayout.progressVisible && desktopLayout.overflow <= 1,
      realTorusHeldOnPeg: afterPlay.capturedBodyId === afterPlay.heldBodyId && afterPlay.heldAlign && afterPlay.seatDistance < 0.05 && afterPlay.axisAlignment > 0.9,
      inPlaceReset: resetRuns.length === 2 && resetRuns.every(run => run.afterReset.lastResetInPlace &&
        run.beforeReset.generation === run.afterReset.generation && run.beforeReset.frameToken === run.afterReset.frameToken) &&
        afterPlay.frameToken === initial.frameToken,
      displayEvidenceSwitch: switched.view === 'particles' && switched.active === 'particles' &&
        switched.runtimeDisplay === 0 && switched.frameToken === initial.frameToken && switched.frameSrc.includes('view=ssfr'),
      mobileLayout: mobile.overflow <= 1 && mobile.controlsVisible,
      browserClean: consoleErrors.length === 0 && failedRequests.length === 0,
    };
    report = { passed: Object.values(checks).every(Boolean), checks, initial, desktopLayout, pumpVisualEvidence, reliabilityRuns, afterPlay, switched, mobile, consoleErrors, failedRequests };
  } catch (error) {
    let browserState = null;
    try {
      browserState = await page.evaluate(() => ({
        state: window.__waterRingGame ? {
          ready: window.__waterRingGame.state.ready,
          playable: window.__waterRingGame.state.playable,
          busy: window.__waterRingGame.state.busy,
          won: window.__waterRingGame.state.won,
          pumpActive: window.__waterRingGame.state.pumpActive,
          pumpCycles: window.__waterRingGame.state.pumpCycles,
          pumpTargetId: window.__waterRingGame.state.pumpTargetId,
          error: window.__waterRingGame.state.error,
          events: window.__waterRingGame.state.events,
        } : null,
        pumpDisabled: document.querySelector('#water-pump')?.disabled,
        pumpText: document.querySelector('#water-pump strong')?.textContent,
        status: document.querySelector('#game-status')?.textContent,
      }));
    } catch { /* Page may already be unavailable. */ }
    report = { passed: false, error: error.message, stack: error.stack, browserState, consoleErrors, failedRequests };
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
