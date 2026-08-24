import {
  CONTRACT_HASH,
  MODEL_VERSION,
  PATH_LENGTH,
  RIVER_CONFIG,
  samplePathByDistance,
} from './river-model.mjs';
import {
  PARTICLES4ALL_SCENE_SCHEMA,
  createParticles4AllSceneContract,
  hashParticles4AllSceneContract,
  serializeParticles4AllSceneContract,
} from '../core/particles4all-scene-contract.mjs';

const SAMPLE_DISTANCE = PATH_LENGTH * 0.5;
const SAMPLE = samplePathByDistance(SAMPLE_DISTANCE);
const SOLVER_SPEED = 2.5;

export const RIVER_NEAR_FIELD_SCENE = createParticles4AllSceneContract({
  schema: PARTICLES4ALL_SCENE_SCHEMA,
  id: 'river-obstacle-near-field',
  revision: 2,
  title: 'River Drifting Block / Particles4All Near-field Lens',
  sceneKind: 'river-obstacle',
  targetPlatform: 'desktop-browser',
  macroLayer: {
    role: 'world-scale-water-representation',
    capability: 'RiverFlowAdapter',
    modelVersion: MODEL_VERSION,
    contractHash: CONTRACT_HASH,
  },
  localPhysics: {
    provider: 'Particles4All',
    adapter: 'Particles4AllRuntimeAdapter',
    engineQuery: 'preset=small&view=particles&particles=28000&body=box:0.35:0.76&bodysize=0.15&timing=1',
    body: {
      shape: 'box',
      density: 0.35,
      startY: 0.76,
      size: 0.15,
      sceneRole: 'drifting-debris-block',
    },
    loading: {
      mode: 'lazy-on-demand',
      unloadable: true,
      pauseMacroPreviewWhileLoaded: true,
    },
  },
  mapping: {
    world: {
      driver: 'river-spline-flow-vector',
      parameters: {
        riverFlowSpeedWorldUnitsPerSecond: RIVER_CONFIG.flowSpeed,
        sampleDistanceWorldUnits: SAMPLE_DISTANCE,
        sampleTangentX: SAMPLE.tangentX,
        sampleTangentZ: SAMPLE.tangentZ,
        riverWidthWorldUnits: RIVER_CONFIG.width,
      },
    },
    solver: {
      velocityScale: SOLVER_SPEED / RIVER_CONFIG.flowSpeed,
      frame: 'river-tangent-to-solver-positive-x',
      units: 'Particles4All solver-unit',
    },
    truth: {
      crossScale: 'T2 mapped input',
      local: 'T3 local PBF / rigid coupling',
      boundary: 'The local solver packet demonstrates directional obstacle response; it is not calibrated river discharge or depth.',
    },
  },
  scenario: {
    reset: true,
    ticks: 36,
    emitters: [
      {
        id: 'river-tangent-inflow-packet',
        type: 'fluid-block',
        tick: 0,
        origin: {
          space: 'box-normalized',
          value: [0.20, 0.76, 0.43],
        },
        counts: [10, 6, 8],
        spacing: {
          source: 'runtime-spacing',
          multiplier: 1,
        },
        velocity: [SOLVER_SPEED, 0, 0],
      },
    ],
    probe: {
      interactionRegion: {
        center: {
          space: 'box-normalized',
          value: [0.5, 0.5],
        },
        radius: {
          space: 'solver-unit',
          value: 0.22,
        },
        minimumY: {
          space: 'solver-unit',
          value: 0.15,
        },
      },
      sampleFluidPositions: true,
      sampleRigidBodies: true,
    },
  },
  acceptance: {
    requiredInjectedParticles: 480,
    requiredTicks: 36,
    maximumNonFinitePositions: 0,
    minimumBodyDisplacement: 0.005,
    bodyDisplacementAxis: [1, 0, 0],
    minimumBodyDisplacementAlongAxis: 0.003,
    minimumBodyRotationDegrees: 0.5,
    requireWebGpuContext: true,
  },
});

export const RIVER_NEAR_FIELD_SCENE_HASH = hashParticles4AllSceneContract(RIVER_NEAR_FIELD_SCENE);
export const RIVER_NEAR_FIELD_SCENE_JSON = serializeParticles4AllSceneContract(RIVER_NEAR_FIELD_SCENE);
