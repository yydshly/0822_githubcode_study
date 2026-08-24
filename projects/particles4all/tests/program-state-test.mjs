import assert from 'node:assert/strict';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync(
  new URL('../program-state.json', import.meta.url), 'utf8'
));

const allowedModuleStatuses = new Set([
  'completed', 'completed-baseline', 'active', 'pending', 'conditional'
]);
const allowedWorkStatuses = new Set(['completed', 'active', 'pending', 'cancelled']);
const allWork = state.modules.flatMap(module =>
  module.workPackages.map(work => ({ ...work, moduleId: module.id }))
);
const workById = new Map(allWork.map(work => [work.id, work]));
const activeModules = state.modules.filter(module => module.status === 'active');
const activeWork = allWork.filter(work => work.status === 'active');
const activeGates = state.gates.filter(gate => gate.status === 'active');

assert.equal(state.operatingMode, 'plan-driven');
if (['completed', 'archived'].includes(state.programStatus)) {
  assert.equal(activeModules.length, 0, 'terminal program must not have an active module');
  assert.equal(activeWork.length, 0, 'terminal program must not have an active work package');
  assert.equal(activeGates.length, 0, 'terminal program must not have an active gate');
  assert.equal(state.activeModule, null);
  assert.equal(state.activeWorkPackage, null);
  assert.equal(state.activeGate, null);
  assert.equal(state.gates.at(-1)?.status, 'passed', 'terminal gate must pass');
} else {
  assert.equal(activeModules.length, 1, 'exactly one module must be active');
  assert.equal(activeWork.length, 1, 'exactly one work package must be active');
  assert.equal(activeGates.length, 1, 'exactly one gate must be active');
  assert.equal(activeModules[0].id, state.activeModule);
  assert.equal(activeWork[0].id, state.activeWorkPackage);
  assert.equal(activeWork[0].moduleId, state.activeModule);
  assert.equal(activeGates[0].id, state.activeGate);
}

if (state.programStatus === 'archived') {
  assert.ok(state.archiveReason, 'archived program must record a reason');
  assert.ok(state.reopenPolicy, 'archived program must record a reopen policy');
}

for (const module of state.modules) {
  assert.ok(allowedModuleStatuses.has(module.status), `invalid module status: ${module.id}`);
  for (const work of module.workPackages) {
    assert.ok(allowedWorkStatuses.has(work.status), `invalid work status: ${work.id}`);
    assert.ok(work.id.startsWith(`${module.id}-`), `work package outside module: ${work.id}`);
    for (const dependency of work.dependsOn) {
      assert.ok(workById.has(dependency), `unknown dependency: ${work.id} -> ${dependency}`);
      if (work.status === 'active') {
        assert.equal(workById.get(dependency).status, 'completed',
          `active dependency is not completed: ${work.id} -> ${dependency}`);
      }
    }
  }
}

assert.ok(state.forbiddenTracks.includes('independent-fluid-solver'));
assert.ok(state.macroGoal.includes('Particles4All'));

console.log(JSON.stringify({
  passed: 18 + allWork.reduce((count, work) => count + work.dependsOn.length, 0),
  failed: 0,
  programStatus: state.programStatus || 'active',
  activeModule: state.activeModule,
  activeWorkPackage: state.activeWorkPackage,
  activeGate: state.activeGate
}));
