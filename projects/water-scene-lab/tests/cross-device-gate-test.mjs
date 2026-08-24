import assert from 'node:assert/strict';
import fs from 'node:fs';

const cases = [
  {
    id: 'chrome-intel',
    expectedAdapter: 'intel',
    files: {
      waterfall: '../waterfall-mvp/assets/particles4all-bridge-browser-chrome-intel-results.json',
      river: '../river-mvp/assets/particles4all-reuse-browser-chrome-intel-results.json',
      ocean: '../ocean-mvp/assets/particles4all-reuse-browser-chrome-intel-results.json',
    },
  },
  {
    id: 'edge-intel',
    expectedAdapter: 'intel',
    files: {
      waterfall: '../waterfall-mvp/assets/particles4all-bridge-browser-edge-results.json',
      river: '../river-mvp/assets/particles4all-reuse-browser-edge-results.json',
      ocean: '../ocean-mvp/assets/particles4all-reuse-browser-edge-results.json',
    },
  },
  {
    id: 'edge-nvidia',
    expectedAdapter: 'nvidia',
    files: {
      waterfall: '../waterfall-mvp/assets/particles4all-bridge-browser-edge-high-performance-results.json',
      river: '../river-mvp/assets/particles4all-reuse-browser-edge-high-performance-results.json',
      ocean: '../ocean-mvp/assets/particles4all-reuse-browser-edge-high-performance-results.json',
    },
  },
];

const expectedProfiles = {
  waterfall: { shape: 'box', density: 2.2, sceneRole: 'dense-impact-block' },
  river: { shape: 'box', density: 0.35, sceneRole: 'drifting-debris-block' },
  ocean: { shape: 'torus', density: 0.22, sceneRole: 'floating-ring-probe' },
};

let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};
const read = relativePath => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const spreadRatio = values => (Math.max(...values) - Math.min(...values)) /
  (values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length);

const loaded = cases.map(testCase => ({
  ...testCase,
  reports: Object.fromEntries(Object.entries(testCase.files).map(([scene, file]) => [scene, read(file)])),
}));

for (const testCase of loaded) {
  for (const [scene, report] of Object.entries(testCase.reports)) {
    const profile = report.result?.bodyProfile;
    const expected = expectedProfiles[scene];
    check(report.passed === true, `${testCase.id}/${scene} browser gate`);
    check(report.result?.environment?.webgpuContext === true, `${testCase.id}/${scene} WebGPU context`);
    check(report.result?.environment?.adapterLabel?.toLowerCase().includes(testCase.expectedAdapter),
      `${testCase.id}/${scene} adapter selection`);
    check(profile?.shape === expected.shape && profile?.density === expected.density &&
      profile?.sceneRole === expected.sceneRole, `${testCase.id}/${scene} native body profile`);
    check(typeof report.protocol?.browserVersion === 'string' && report.protocol.browserVersion.length > 0,
      `${testCase.id}/${scene} browser version evidence`);
  }
}

const values = {
  waterfallImpactDelta: loaded.map(item => item.reports.waterfall.result.bodyDisplacementDeltaAlongAxis),
  riverAlongFlow: loaded.map(item => item.reports.river.result.bodyDisplacementAlongAxis),
  riverRotationDegrees: loaded.map(item => item.reports.river.result.bodyRotationDegrees),
  oceanUpliftDelta: loaded.map(item => item.reports.ocean.result.bodyDisplacementDeltaAlongAxis),
  oceanRotationDegrees: loaded.map(item => item.reports.ocean.result.bodyRotationDegrees),
};

for (const [name, samples] of Object.entries(values)) {
  check(samples.every(Number.isFinite), `${name} finite across configurations`);
  check(spreadRatio(samples) <= 0.05, `${name} relative spread <= 5%`);
}

const summary = {
  schema: 'water-scene.cross-device-gate/v1',
  createdAt: new Date().toISOString(),
  passed: true,
  checks: passed,
  configurations: loaded.map(item => ({
    id: item.id,
    browserVersion: item.reports.ocean.protocol.browserVersion,
    adapterLabel: item.reports.ocean.result.environment.adapterLabel,
    gpuRenderer: item.reports.ocean.page.oceanRuntime.gpuRenderer,
    sceneChecks: {
      waterfall: item.reports.waterfall.checks.length,
      river: item.reports.river.checks.length,
      ocean: item.reports.ocean.checks.length,
    },
  })),
  values: Object.fromEntries(Object.entries(values).map(([name, samples]) => [name, {
    samples,
    relativeSpread: spreadRatio(samples),
  }])),
};

fs.writeFileSync(new URL('../cross-device-gate-results.json', import.meta.url), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
