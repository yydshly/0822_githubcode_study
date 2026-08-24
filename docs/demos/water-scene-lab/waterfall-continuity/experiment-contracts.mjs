import {
  createParticles4AllSceneContract,
  hashParticles4AllSceneContract,
} from '../core/particles4all-scene-contract.mjs';
import { WATERFALL_NEAR_FIELD_SCENE } from '../waterfall/waterfall-scene-contract.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const base = clone(WATERFALL_NEAR_FIELD_SCENE);
const observableAcceptance = {
  ...base.acceptance,
  requiredInjectedParticles: 384,
  requiredTicks: 42,
  directionalResponseMode: 'absolute',
};
delete observableAcceptance.minimumBodyDisplacementDeltaAlongAxis;
const shared = {
  ...base,
  revision: 1,
  sceneKind: 'waterfall-emission-continuity',
  scenario: {
    ...base.scenario,
    ticks: 42,
  },
  acceptance: observableAcceptance,
};

export const SINGLE_PULSE_CONTRACT = createParticles4AllSceneContract({
  ...shared,
  id: 'waterfall-single-pulse-observable',
  title: 'Waterfall Single Pulse / Observable Timing Baseline',
  scenario: {
    ...shared.scenario,
    emitters: [{
      ...base.scenario.emitters[0],
      id: 'single-pulse-384',
      tick: 0,
    }],
  },
});

const stagedTicks = Array.from({ length: 12 }, (_, index) => index * 3);
export const STAGED_CASCADE_CONTRACT = createParticles4AllSceneContract({
  ...shared,
  id: 'waterfall-staged-cascade-observable',
  title: 'Waterfall Staged Cascade / Observable Timing Variant',
  scenario: {
    ...shared.scenario,
    emitters: stagedTicks.map((tick, index) => ({
      id: `cascade-pulse-${index + 1}`,
      type: 'fluid-block',
      tick,
      origin: clone(base.scenario.emitters[0].origin),
      counts: [4, 2, 4],
      spacing: clone(base.scenario.emitters[0].spacing),
      velocity: [...base.scenario.emitters[0].velocity],
    })),
  },
});

function contractWithView(contract, view) {
  const next = clone(contract);
  const query = new URLSearchParams(next.localPhysics.engineQuery);
  query.set('view', view);
  next.id = `${contract.id}-${view}`;
  next.title = `${contract.title} / ${view.toUpperCase()} Display`;
  next.localPhysics.engineQuery = query.toString();
  return createParticles4AllSceneContract(next);
}

export const STAGED_SURFACE_CONTRACTS = Object.freeze({
  particles: contractWithView(STAGED_CASCADE_CONTRACT, 'particles'),
  mesh: contractWithView(STAGED_CASCADE_CONTRACT, 'mesh'),
  ssfr: contractWithView(STAGED_CASCADE_CONTRACT, 'ssfr'),
});

const sheetCascade = clone(STAGED_CASCADE_CONTRACT);
sheetCascade.id = 'waterfall-staged-sheet-cascade-observable';
sheetCascade.title = 'Waterfall Staged Thin Sheet / Observable Emitter Variant';
sheetCascade.scenario.emitters = sheetCascade.scenario.emitters.map(emitter => ({
  ...emitter,
  counts: [8, 1, 4],
}));
export const STAGED_SHEET_CONTRACT = createParticles4AllSceneContract(sheetCascade);
export const STAGED_SHEET_SURFACE_CONTRACTS = Object.freeze({
  particles: contractWithView(STAGED_SHEET_CONTRACT, 'particles'),
  mesh: contractWithView(STAGED_SHEET_CONTRACT, 'mesh'),
  ssfr: contractWithView(STAGED_SHEET_CONTRACT, 'ssfr'),
});

const curtainCascade = clone(STAGED_CASCADE_CONTRACT);
curtainCascade.id = 'waterfall-continuous-curtain-observable';
curtainCascade.title = 'Waterfall Continuous Curtain / Observable Scene Preset';
curtainCascade.scenario.emitters = Array.from({ length: 24 }, (_, index) => ({
  id: `curtain-pulse-${index + 1}`,
  type: 'fluid-block',
  tick: Math.round(index * 41 / 23),
  origin: clone(base.scenario.emitters[0].origin),
  counts: [8, 1, 2],
  spacing: clone(base.scenario.emitters[0].spacing),
  velocity: [...base.scenario.emitters[0].velocity],
}));
export const CONTINUOUS_CURTAIN_CONTRACT = createParticles4AllSceneContract(curtainCascade);
export const CONTINUOUS_CURTAIN_SURFACE_CONTRACTS = Object.freeze({
  particles: contractWithView(CONTINUOUS_CURTAIN_CONTRACT, 'particles'),
  mesh: contractWithView(CONTINUOUS_CURTAIN_CONTRACT, 'mesh'),
  ssfr: contractWithView(CONTINUOUS_CURTAIN_CONTRACT, 'ssfr'),
});

const highFlowCascade = clone(STAGED_CASCADE_CONTRACT);
highFlowCascade.id = 'waterfall-high-flow-curtain-observable';
highFlowCascade.title = 'Waterfall High Flow Curtain / Scene Extension Preset';
highFlowCascade.acceptance.requiredInjectedParticles = 5376;
highFlowCascade.scenario.emitters = Array.from({ length: 42 }, (_, tick) => {
  const origin = clone(base.scenario.emitters[0].origin);
  origin.value[0] = 0.3;
  return {
    id: `high-flow-pulse-${tick + 1}`,
    type: 'fluid-block',
    tick,
    origin,
    counts: [32, 2, 2],
    spacing: clone(base.scenario.emitters[0].spacing),
    velocity: [...base.scenario.emitters[0].velocity],
  };
});
export const HIGH_FLOW_CURTAIN_CONTRACT = createParticles4AllSceneContract(highFlowCascade);
export const HIGH_FLOW_CURTAIN_SURFACE_CONTRACTS = Object.freeze({
  particles: contractWithView(HIGH_FLOW_CURTAIN_CONTRACT, 'particles'),
  mesh: contractWithView(HIGH_FLOW_CURTAIN_CONTRACT, 'mesh'),
  ssfr: contractWithView(HIGH_FLOW_CURTAIN_CONTRACT, 'ssfr'),
});

export const CONTINUITY_EXPERIMENT = Object.freeze({
  id: 'waterfall-emission-continuity-ab',
  invariant: Object.freeze({
    particles: 384,
    ticks: 42,
    velocity: Object.freeze([0, -2.5, 0]),
    body: Object.freeze({ shape: 'box', density: 2.2, size: 0.15 }),
  }),
  variants: Object.freeze({
    single: Object.freeze({
      label: 'A · 单次粒子团',
      contract: SINGLE_PULSE_CONTRACT,
      hash: hashParticles4AllSceneContract(SINGLE_PULSE_CONTRACT),
      schedule: 'tick 0 × 384',
    }),
    staged: Object.freeze({
      label: 'B · 分时连续落水',
      contract: STAGED_CASCADE_CONTRACT,
      hash: hashParticles4AllSceneContract(STAGED_CASCADE_CONTRACT),
      schedule: 'tick 0–33 / every 3 ticks × 32',
    }),
  }),
});
