import assert from 'node:assert/strict';
import { SANDBOX_PRESETS, getSandboxPreset } from '../../../../docs/demos/water-scene-lab/sandbox/sandbox-presets.mjs';

let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};

check(SANDBOX_PRESETS.length === 3, 'three presets');
check(Object.isFrozen(SANDBOX_PRESETS), 'registry frozen');
check(new Set(SANDBOX_PRESETS.map(item => item.id)).size === 3, 'unique ids');
check(getSandboxPreset('impact').id === 'spillway-impact-block', 'impact alias');
check(getSandboxPreset('drift').id === 'channel-drifting-block', 'drift alias');
check(getSandboxPreset('uplift').id === 'surface-rescue-ring', 'uplift alias');
check(getSandboxPreset('unknown').id === 'spillway-impact-block', 'safe default');

for (const preset of SANDBOX_PRESETS) {
  check(preset.contract.schema === 'water-scene.particles4all-near-field/v1', `${preset.id} shared schema`);
  check(preset.contract.localPhysics.provider === 'Particles4All', `${preset.id} upstream provider`);
  check(preset.contract.targetPlatform === 'desktop-browser', `${preset.id} desktop target`);
  check(preset.sourceHref.startsWith('../') && preset.sourceHref.endsWith('/'), `${preset.id} source route`);
  check(preset.contractHash.startsWith('fnv1a-'), `${preset.id} contract hash`);
  check(Object.isFrozen(preset), `${preset.id} preset frozen`);
}

console.log(JSON.stringify({
  passed,
  failed: 0,
  presets: SANDBOX_PRESETS.map(item => ({
    id: item.id,
    contractId: item.contract.id,
    shape: item.contract.localPhysics.body.shape,
    density: item.contract.localPhysics.body.density,
  })),
}));
