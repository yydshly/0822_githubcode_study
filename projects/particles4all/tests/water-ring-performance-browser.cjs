const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PARTICLES4ALL_URL ||
  'http://127.0.0.1:8107/demos/particles4all/engine/';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputPath = path.resolve(__dirname, '..', 'assets', 'water-ring-performance.json');

const common = {
  preset: 'small',
  view: 'ssfr',
  particles: '14000',
  body: 'torus:0.38:0.17,torus:0.42:0.19,torus:0.46:0.21,torus:0.50:0.23,torus:0.54:0.25',
  bodysize: '0.078',
  radius: '0.42',
  speedmax: '6',
  timescale: '0.82',
  tension: '0.55',
  substeps: '1',
  iters: '3',
  ssfrscale: '0.32',
  ssfrradius: '0.72',
  timing: '1',
  game: 'water-ring',
  report: '999'
};

const variants = [
  { id: 'warmup', params: {} },
  { id: 'current', params: {} },
  { id: 'iterations-2', params: { iters: '2' } },
  { id: 'iterations-2-filter-1', params: { iters: '2', ssfriters: '1' } },
  { id: 'filter-1', params: { ssfriters: '1' } },
  { id: 'filter-1-no-cleanup', params: { ssfriters: '1', ssfrcleanup: '0' } },
  { id: 'filter-1-blur-4', params: { ssfriters: '1', ssfrthickblur: '4' } }
];

async function runVariant(context, variant) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const query = new URLSearchParams({ ...common, ...variant.params });
  const startedAt = Date.now();
  try {
    await page.goto(`${baseUrl}?${query}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__sim?.n || window.__gpuError), null, {
      timeout: 120000
    });
    await page.waitForTimeout(1500);
    await page.evaluate(async () => {
      await window.__sim.dev.queue.onSubmittedWorkDone();
      window.__timers.sim.reset();
      window.__timers.render.reset();
      window.__done = false;
      window.__result = null;
      window.__ui.reportAt = window.__sim.simTime + 1.0;
      window.__perfRafFrames = 0;
      window.__perfRafStart = performance.now();
      window.__perfRafEnd = 0;
      const count = now => {
        window.__perfRafFrames += 1;
        if (!window.__done && !window.__gpuError) requestAnimationFrame(count);
        else window.__perfRafEnd = now;
      };
      requestAnimationFrame(count);
    });
    await page.waitForFunction(() => Boolean(window.__done || window.__gpuError), null, {
      timeout: 120000
    });
    await page.waitForFunction(() => window.__perfRafEnd > 0 || Boolean(window.__gpuError), null, {
      timeout: 5000
    });
    return await page.evaluate(({ id, params, elapsedMs }) => {
      const wallMs = Math.max(1, window.__perfRafEnd - window.__perfRafStart);
      return {
        id,
        params,
        status: window.__gpuError ? 'failed' : 'completed',
        elapsedMs,
        frames: window.__perfRafFrames,
        wallMs,
        fps: window.__perfRafFrames * 1000 / wallMs,
        particles: window.__sim?.n || 0,
        simGpuMs: window.__result?.timing?.simMs ?? null,
        renderGpuMs: window.__result?.timing?.renderMs ?? null,
        simPasses: window.__result?.timing?.simPasses ?? null,
        renderPasses: window.__result?.timing?.renderPasses ?? null,
        gpuError: window.__gpuError || null
      };
    }, { id: variant.id, params: variant.params, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    return { id: variant.id, params: variant.params, status: 'failed', error: error.message };
  } finally {
    const resultErrors = { consoleErrors, pageErrors };
    await page.close().catch(() => {});
    variant.errors = resultErrors;
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 980, height: 650 } });
  const results = [];
  try {
    for (const variant of variants) {
      const result = await runVariant(context, variant);
      result.consoleErrors = variant.errors?.consoleErrors || [];
      result.pageErrors = variant.errors?.pageErrors || [];
      results.push(result);
      console.log(JSON.stringify(result));
    }
  } finally {
    await browser.close();
  }

  const report = {
    protocol: { viewport: [980, 650], common, executablePath },
    generatedAt: new Date().toISOString(),
    results
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  const failed = results.filter(result => result.status !== 'completed' ||
    result.consoleErrors.length > 0 || result.pageErrors.length > 0);
  console.log(JSON.stringify({ outputPath, failed: failed.map(result => result.id) }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
