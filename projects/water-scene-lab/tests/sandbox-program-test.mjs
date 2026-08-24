import assert from 'node:assert/strict';
import fs from 'node:fs';

const program = JSON.parse(fs.readFileSync(new URL('../sandbox-program.json', import.meta.url), 'utf8'));
const sourceContracts = new Map([
  'waterfall-impact-near-field', '../scenes/waterfall-impact-near-field.scene.json',
  'river-obstacle-near-field', '../scenes/river-obstacle-near-field.scene.json',
  'ocean-wave-uplift-near-field', '../scenes/ocean-wave-uplift-near-field.scene.json',
].reduce((entries, value, index, values) => {
  if (index % 2 === 0) entries.push([value, JSON.parse(fs.readFileSync(new URL(values[index + 1], import.meta.url), 'utf8'))]);
  return entries;
}, []));

let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};

check(program.schema === 'water-scene.interactive-sandbox/v1', 'sandbox schema');
check(program.targetPlatform === 'desktop-browser', 'desktop target');
check(program.operatingMode === 'fixed-presets', 'fixed preset scope');
check(program.productUseCases.length === 3, 'bounded product uses');
check(program.architecture.localPhysicsProvider === 'Particles4All', 'upstream provider');
check(program.architecture.sceneContractSchema === 'water-scene.particles4all-near-field/v1', 'shared contract schema');
check(program.architecture.runtimeAdapter === 'Particles4AllRuntimeAdapter', 'shared adapter');
check(program.architecture.sceneRunner === 'particles4all-scene-runner-v1', 'shared runner');
check(program.architecture.runtimePolicy.maxConcurrentSolvers === 1, 'one runtime slot');
check(program.architecture.runtimePolicy.unloadBetweenPresets === true, 'unload between presets');
check(program.presets.length === 3, 'three fixed presets');
check(new Set(program.presets.map(item => item.id)).size === 3, 'unique preset ids');
check(program.nonGoals.includes('generic-scene-editor'), 'editor remains out of scope');
check(program.nonGoals.includes('independent-fluid-solver'), 'new solver remains out of scope');
check(program.truthBoundary.includes('not calibrated'), 'bounded truth statement');
check(program.stage10WorkPackages.length === 4, 'stage 10 work packages');

for (const preset of program.presets) {
  const source = sourceContracts.get(preset.sourceSceneContractId);
  check(Boolean(source), `${preset.id} source contract exists`);
  check(source.schema === program.architecture.sceneContractSchema, `${preset.id} schema matches`);
  check(source.localPhysics.provider === program.architecture.localPhysicsProvider, `${preset.id} provider matches`);
  check(source.localPhysics.body.shape === preset.nativeBody.shape, `${preset.id} shape matches`);
  check(source.localPhysics.body.density === preset.nativeBody.density, `${preset.id} density matches`);
  check(source.localPhysics.body.sceneRole === preset.nativeBody.sceneRole, `${preset.id} role matches`);
  check(typeof preset.scenarioValue === 'string' && preset.scenarioValue.length > 12, `${preset.id} scenario value`);
  check(typeof preset.primaryEvidence === 'string' && preset.primaryEvidence.length > 0, `${preset.id} evidence route`);
}

console.log(JSON.stringify({
  passed,
  failed: 0,
  programId: program.id,
  targetPlatform: program.targetPlatform,
  operatingMode: program.operatingMode,
  presets: program.presets.map(item => item.id),
  maxConcurrentSolvers: program.architecture.runtimePolicy.maxConcurrentSolvers,
}));
