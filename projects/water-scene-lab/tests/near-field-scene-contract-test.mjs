import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PARTICLES4ALL_SCENE_SCHEMA,
  compileParticles4AllScenePlan,
  createParticles4AllSceneContract,
  evaluateParticles4AllSceneEvidence,
  hashParticles4AllSceneContract,
  parseParticles4AllSceneContract,
  serializeParticles4AllSceneContract,
} from '../../../docs/demos/water-scene-lab/core/particles4all-scene-contract.mjs';
import {
  WATERFALL_NEAR_FIELD_SCENE,
  WATERFALL_NEAR_FIELD_SCENE_HASH,
} from '../../../docs/demos/water-scene-lab/waterfall/waterfall-scene-contract.mjs';
import {
  RIVER_NEAR_FIELD_SCENE,
  RIVER_NEAR_FIELD_SCENE_HASH,
} from '../../../docs/demos/water-scene-lab/river/river-scene-contract.mjs';
import {
  OCEAN_NEAR_FIELD_SCENE,
  OCEAN_NEAR_FIELD_SCENE_HASH,
} from '../../../docs/demos/water-scene-lab/ocean/ocean-scene-contract.mjs';

let passed = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};

const artifact = JSON.parse(fs.readFileSync(
  new URL('../scenes/waterfall-impact-near-field.scene.json', import.meta.url),
  'utf8',
));
const riverArtifact = JSON.parse(fs.readFileSync(
  new URL('../scenes/river-obstacle-near-field.scene.json', import.meta.url),
  'utf8',
));
const oceanArtifact = JSON.parse(fs.readFileSync(
  new URL('../scenes/ocean-wave-uplift-near-field.scene.json', import.meta.url),
  'utf8',
));
const serialized = serializeParticles4AllSceneContract(WATERFALL_NEAR_FIELD_SCENE);
const parsed = parseParticles4AllSceneContract(serialized);
const plan = compileParticles4AllScenePlan(WATERFALL_NEAR_FIELD_SCENE, {
  box: [1.5, 1, 1],
  spacing: 0.02,
});

check(WATERFALL_NEAR_FIELD_SCENE.schema === PARTICLES4ALL_SCENE_SCHEMA, 'schema');
check(WATERFALL_NEAR_FIELD_SCENE.targetPlatform === 'desktop-browser', 'desktop target');
check(Object.isFrozen(WATERFALL_NEAR_FIELD_SCENE), 'contract frozen');
check(Object.isFrozen(WATERFALL_NEAR_FIELD_SCENE.scenario.emitters), 'nested data frozen');
check(WATERFALL_NEAR_FIELD_SCENE_HASH === hashParticles4AllSceneContract(WATERFALL_NEAR_FIELD_SCENE), 'stable hash');
check(hashParticles4AllSceneContract(parsed) === WATERFALL_NEAR_FIELD_SCENE_HASH, 'round-trip hash');
check(JSON.stringify(parsed) === JSON.stringify(WATERFALL_NEAR_FIELD_SCENE), 'round-trip values');
check(JSON.stringify(artifact) === JSON.stringify(WATERFALL_NEAR_FIELD_SCENE), 'repository artifact matches runtime contract');
check(plan.sceneId === 'waterfall-impact-near-field', 'compiled scene id');
check(plan.sceneContractHash === WATERFALL_NEAR_FIELD_SCENE_HASH, 'compiled hash');
check(plan.ticks === 30, 'compiled ticks');
check(plan.packets.length === 1, 'compiled packet count');
check(plan.packets[0].config.counts.reduce((product, value) => product * value, 1) === 384, 'compiled particles');
check(Math.abs(plan.packets[0].config.origin[0] - 0.675) < 1e-12, 'normalized x origin');
check(Math.abs(plan.packets[0].config.origin[1] - 0.86) < 1e-12, 'normalized y origin');
check(Math.abs(plan.packets[0].config.origin[2] - 0.43) < 1e-12, 'normalized z origin');
check(plan.packets[0].config.spacing === 0.02, 'runtime spacing');
check(plan.packets[0].config.velocity[1] === -2.5, 'solver velocity');
check(plan.engineQuery.includes('preset=small'), 'engine query');

const syntheticEvidence = evaluateParticles4AllSceneEvidence(WATERFALL_NEAR_FIELD_SCENE, plan, {
  environment: { webgpuContext: true },
  schedule: {
    requestedTicks: 30,
    actualTicks: 30,
    history: [{
      type: 'injectFluid',
      result: {
        requested: 384,
        added: 384,
        before: 28000,
        after: 28384,
        capacity: 56000,
        availableBefore: 28000,
        clamped: false,
      },
    }],
  },
  sampled: {
    summary: { particleCount: 2 },
    positions: new Float32Array([0.75, 0.5, 0.5, 0, 1.4, 0.2, 0.9, 0]),
    phases: new Float32Array([0, 0, 0, 0, 1, 0, 0, 0]),
  },
  initialBodies: { bodies: [{ id: 1, shape: 'box', density: 2.2, size: 0.15, pose: { centre: [0, 0, 0] } }] },
  finalBodies: { bodies: [{ id: 1, pose: { centre: [0, -0.006, 0] } }] },
  baseline: { displacement: { bodyId: 1, vector: [0, -0.001, 0], magnitude: 0.001, alongAxis: 0.001 } },
});
check(syntheticEvidence.injection.added === 384, 'evidence injection');
check(syntheticEvidence.localImpactCount === 1, 'interaction probe');
check(syntheticEvidence.nonFinite === 0, 'finite positions');
check(syntheticEvidence.bodyDisplacement >= 0.005, 'body displacement');
check(syntheticEvidence.bodyDisplacementAlongAxis >= 0.005, 'directional body displacement');
check(syntheticEvidence.bodyDisplacementDeltaAlongAxis >= 0.003, 'waterfall baseline delta');
check(syntheticEvidence.passed === true, 'acceptance gate');

const riverPlan = compileParticles4AllScenePlan(RIVER_NEAR_FIELD_SCENE, {
  box: [1.5, 1, 1],
  spacing: 0.02,
});
check(RIVER_NEAR_FIELD_SCENE.schema === WATERFALL_NEAR_FIELD_SCENE.schema, 'shared schema');
check(RIVER_NEAR_FIELD_SCENE_HASH !== WATERFALL_NEAR_FIELD_SCENE_HASH, 'scene-specific hash');
check(JSON.stringify(riverArtifact) === JSON.stringify(RIVER_NEAR_FIELD_SCENE), 'river artifact matches runtime contract');
check(RIVER_NEAR_FIELD_SCENE.macroLayer.capability === 'RiverFlowAdapter', 'river macro adapter');
check(RIVER_NEAR_FIELD_SCENE.mapping.world.driver === 'river-spline-flow-vector', 'river world driver');
check(RIVER_NEAR_FIELD_SCENE.mapping.solver.frame === 'river-tangent-to-solver-positive-x', 'river local frame');
check(riverPlan.packets[0].config.velocity[0] === 2.5, 'river horizontal solver velocity');
check(riverPlan.packets[0].config.velocity[1] === 0, 'river does not reuse waterfall velocity');
check(riverPlan.packets[0].config.counts.reduce((product, value) => product * value, 1) === 480, 'river packet particles');
check(RIVER_NEAR_FIELD_SCENE.acceptance.bodyDisplacementAxis[0] === 1, 'river directional gate');
check(RIVER_NEAR_FIELD_SCENE.localPhysics.body.sceneRole === 'drifting-debris-block', 'river body role');
check(RIVER_NEAR_FIELD_SCENE.localPhysics.body.shape === 'box', 'river native box');
check(RIVER_NEAR_FIELD_SCENE.acceptance.minimumBodyRotationDegrees === 0.5, 'river rotation gate');

const oceanPlan = compileParticles4AllScenePlan(OCEAN_NEAR_FIELD_SCENE, {
  box: [1.5, 1, 1],
  spacing: 0.02,
});
check(OCEAN_NEAR_FIELD_SCENE.schema === WATERFALL_NEAR_FIELD_SCENE.schema, 'ocean shared schema');
check(OCEAN_NEAR_FIELD_SCENE_HASH !== RIVER_NEAR_FIELD_SCENE_HASH, 'ocean scene-specific hash');
check(JSON.stringify(oceanArtifact) === JSON.stringify(OCEAN_NEAR_FIELD_SCENE), 'ocean artifact matches runtime contract');
check(OCEAN_NEAR_FIELD_SCENE.macroLayer.capability === 'OceanSurfaceSampler', 'ocean macro sampler');
check(OCEAN_NEAR_FIELD_SCENE.mapping.world.driver === 'ocean-surface-vertical-velocity', 'ocean world driver');
check(OCEAN_NEAR_FIELD_SCENE.mapping.world.parameters.verticalVelocityWorldUnitsPerSecond > 1, 'ocean rising surface sample');
check(OCEAN_NEAR_FIELD_SCENE.mapping.solver.frame === 'ocean-up-to-solver-positive-y', 'ocean local frame');
check(oceanPlan.packets[0].config.velocity[1] === 4, 'ocean upward solver velocity');
check(oceanPlan.packets[0].config.velocity[0] === 0, 'ocean does not reuse river velocity');
check(oceanPlan.packets[0].config.counts.reduce((product, value) => product * value, 1) === 640, 'ocean packet particles');
check(OCEAN_NEAR_FIELD_SCENE.acceptance.directionalResponseMode === 'baseline-delta', 'ocean differential gate');
check(OCEAN_NEAR_FIELD_SCENE.localPhysics.body.shape === 'torus', 'ocean native torus');
check(OCEAN_NEAR_FIELD_SCENE.localPhysics.body.density === 0.22, 'ocean low-density body');
check(OCEAN_NEAR_FIELD_SCENE.localPhysics.body.sceneRole === 'floating-ring-probe', 'ocean body role');
check(OCEAN_NEAR_FIELD_SCENE.acceptance.minimumBodyRotationDegrees === 0.5, 'ocean rotation gate');

const oceanSyntheticEvidence = evaluateParticles4AllSceneEvidence(OCEAN_NEAR_FIELD_SCENE, oceanPlan, {
  environment: { webgpuContext: true },
  schedule: {
    requestedTicks: 36,
    actualTicks: 36,
    history: [{
      type: 'injectFluid',
      result: {
        requested: 640,
        added: 640,
        before: 28000,
        after: 28640,
        capacity: 56000,
        availableBefore: 28000,
        clamped: false,
      },
    }],
  },
  sampled: {
    summary: { particleCount: 1 },
    positions: new Float32Array([0.75, 0.7, 0.5, 0]),
    phases: new Float32Array([0, 0, 0, 0]),
  },
  initialBodies: { bodies: [{ id: 1, shape: 'torus', density: 0.22, size: 0.15, pose: {
    centre: [0, 0, 0],
    rot: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  } }] },
  finalBodies: { bodies: [{ id: 1, pose: {
    centre: [0, -0.012, 0],
    rot: [0.9998476952, -0.0174524064, 0, 0.0174524064, 0.9998476952, 0, 0, 0, 1],
  } }] },
  baseline: { displacement: { bodyId: 1, vector: [0, -0.02, 0], magnitude: 0.02, alongAxis: -0.02 } },
});
check(Math.abs(oceanSyntheticEvidence.bodyDisplacementDeltaAlongAxis - 0.008) < 1e-12, 'ocean baseline delta');
check(oceanSyntheticEvidence.bodyRotationDegrees >= 0.99, 'ocean rotation response');
check(oceanSyntheticEvidence.passed === true, 'ocean differential acceptance');

const invalid = JSON.parse(serialized);
invalid.scenario.emitters[0].origin.value[0] = 2;
assert.throws(() => createParticles4AllSceneContract(invalid), /between 0 and 1/);
passed += 1;

console.log(JSON.stringify({
  passed,
  failed: 0,
  schema: WATERFALL_NEAR_FIELD_SCENE.schema,
  sceneIds: [WATERFALL_NEAR_FIELD_SCENE.id, RIVER_NEAR_FIELD_SCENE.id, OCEAN_NEAR_FIELD_SCENE.id],
  contractHashes: [WATERFALL_NEAR_FIELD_SCENE_HASH, RIVER_NEAR_FIELD_SCENE_HASH, OCEAN_NEAR_FIELD_SCENE_HASH],
  packetParticles: [
    plan.packets[0].config.counts.reduce((product, value) => product * value, 1),
    riverPlan.packets[0].config.counts.reduce((product, value) => product * value, 1),
    oceanPlan.packets[0].config.counts.reduce((product, value) => product * value, 1),
  ],
  targetPlatform: WATERFALL_NEAR_FIELD_SCENE.targetPlatform,
}));
