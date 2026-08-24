import assert from 'node:assert/strict';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync(new URL('../program-state.json', import.meta.url), 'utf8'));
const activeStages = state.stages.filter(stage => stage.status === 'active');
const work = state.stages.flatMap(stage =>
  (stage.workPackages || []).map(item => ({ ...item, stageId: stage.id }))
);
const activeWork = work.filter(item => item.status === 'active');
const activeGates = state.gates.filter(gate => gate.status === 'active');
const workById = new Map(work.map(item => [item.id, item]));

assert.ok(['active', 'archived'].includes(state.programStatus));
assert.equal(state.operatingMode, 'macro-goal-driven');
assert.equal(state.targetPlatform, 'desktop-browser');
if (state.programStatus === 'archived') {
  assert.equal(activeStages.length, 0);
  assert.equal(activeWork.length, 0);
  assert.equal(activeGates.length, 0);
  assert.equal(state.activeStage, null);
  assert.equal(state.activeWorkPackage, null);
  assert.equal(state.activeGate, null);
  assert.ok(state.archiveReason);
  assert.ok(state.reopenPolicy);
} else {
  assert.equal(activeStages.length, 1);
  assert.equal(activeStages[0].id, state.activeStage);
  assert.equal(activeWork.length, 1);
  assert.equal(activeWork[0].id, state.activeWorkPackage);
  assert.equal(activeWork[0].stageId, state.activeStage);
  assert.equal(activeGates.length, 1);
  assert.equal(activeGates[0].id, state.activeGate);
}
assert.ok(state.macroGoal.includes('Particles4All'));
assert.ok(state.heldTracks.includes('mobile-browser'));
assert.ok(state.heldTracks.includes('independent-fluid-solver'));

for (const item of work) {
  for (const dependency of item.dependsOn || []) {
    assert.ok(workById.has(dependency), `unknown dependency: ${item.id} -> ${dependency}`);
    if (item.status === 'active') {
      assert.equal(workById.get(dependency).status, 'completed',
        `active dependency is not completed: ${item.id} -> ${dependency}`);
    }
  }
}

console.log(JSON.stringify({
  passed: 15 + work.reduce((count, item) => count + item.dependsOn.length, 0),
  failed: 0,
  programStatus: state.programStatus,
  macroGoal: state.macroGoal,
  targetPlatform: state.targetPlatform,
  activeStage: state.activeStage,
  activeWorkPackage: state.activeWorkPackage,
  activeGate: state.activeGate
}));
