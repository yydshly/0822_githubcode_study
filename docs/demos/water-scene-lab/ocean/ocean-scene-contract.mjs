import {
  CONTRACT_HASH,
  MODEL_VERSION,
  SEA_STATES,
  resolveWaves,
  sampleSurfaceKinematicsAtWorldXZ,
} from './ocean-model.mjs';
import {
  PARTICLES4ALL_SCENE_SCHEMA,
  createParticles4AllSceneContract,
  hashParticles4AllSceneContract,
  serializeParticles4AllSceneContract,
} from '../core/particles4all-scene-contract.mjs';

const PROBE_X = 0;
const PROBE_Z = 0;
const PROBE_TIME = 5;
const SEA_STATE = SEA_STATES.wind.seaState;
const SURFACE = sampleSurfaceKinematicsAtWorldXZ(PROBE_X, PROBE_Z, PROBE_TIME, SEA_STATE);
const RESOLVED = resolveWaves(SEA_STATE);
const SOLVER_SPEED = 4;

if (!SURFACE.kinematicsValid || SURFACE.verticalVelocity <= 0) {
  throw new Error('The registered Ocean probe must resolve to a valid rising surface sample.');
}

export const OCEAN_NEAR_FIELD_SCENE = createParticles4AllSceneContract({
  schema: PARTICLES4ALL_SCENE_SCHEMA,
  id: 'ocean-wave-uplift-near-field',
  revision: 2,
  title: 'Ocean Floating Ring Uplift / Particles4All Near-field Lens',
  sceneKind: 'ocean-wave-uplift',
  targetPlatform: 'desktop-browser',
  macroLayer: {
    role: 'world-scale-water-representation',
    capability: 'OceanSurfaceSampler',
    modelVersion: MODEL_VERSION,
    contractHash: CONTRACT_HASH,
  },
  localPhysics: {
    provider: 'Particles4All',
    adapter: 'Particles4AllRuntimeAdapter',
    engineQuery: 'preset=small&view=particles&particles=28000&body=torus:0.22:0.76&bodysize=0.15&timing=1',
    body: {
      shape: 'torus',
      density: 0.22,
      startY: 0.76,
      size: 0.15,
      sceneRole: 'floating-ring-probe',
    },
    loading: {
      mode: 'lazy-on-demand',
      unloadable: true,
      pauseMacroPreviewWhileLoaded: true,
    },
  },
  mapping: {
    world: {
      driver: 'ocean-surface-vertical-velocity',
      parameters: {
        seaState: SEA_STATE,
        probeXWorldUnits: PROBE_X,
        probeZWorldUnits: PROBE_Z,
        probeTimeSeconds: PROBE_TIME,
        surfaceHeightWorldUnits: SURFACE.position[1],
        surfaceNormalX: SURFACE.normal[0],
        surfaceNormalY: SURFACE.normal[1],
        surfaceNormalZ: SURFACE.normal[2],
        verticalVelocityWorldUnitsPerSecond: SURFACE.verticalVelocity,
        maxVerticalEnvelopeWorldUnits: RESOLVED.maxVerticalEnvelope,
      },
    },
    solver: {
      velocityScale: SOLVER_SPEED / SURFACE.verticalVelocity,
      frame: 'ocean-up-to-solver-positive-y',
      units: 'Particles4All solver-unit',
    },
    truth: {
      crossScale: 'T2 mapped input',
      local: 'T3 local PBF / rigid coupling',
      boundary: 'The Ocean surface query selects and scales a local uplift packet; it is not calibrated wave pressure, buoyancy, or coastal inundation.',
    },
  },
  scenario: {
    reset: true,
    ticks: 36,
    comparison: {
      mode: 'no-injection-baseline',
    },
    emitters: [
      {
        id: 'ocean-rising-surface-packet',
        type: 'fluid-block',
        tick: 0,
        origin: {
          space: 'box-normalized',
          value: [0.45, 0.44, 0.43],
        },
        counts: [8, 10, 8],
        spacing: {
          source: 'runtime-spacing',
          multiplier: 1,
        },
        velocity: [0, SOLVER_SPEED, 0],
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
    requiredInjectedParticles: 640,
    requiredTicks: 36,
    maximumNonFinitePositions: 0,
    minimumBodyDisplacement: 0.005,
    bodyDisplacementAxis: [0, 1, 0],
    minimumBodyDisplacementAlongAxis: 0,
    directionalResponseMode: 'baseline-delta',
    minimumBodyDisplacementDeltaAlongAxis: 0.003,
    minimumBodyRotationDegrees: 0.5,
    requireWebGpuContext: true,
  },
});

export const OCEAN_NEAR_FIELD_SCENE_HASH = hashParticles4AllSceneContract(OCEAN_NEAR_FIELD_SCENE);
export const OCEAN_NEAR_FIELD_SCENE_JSON = serializeParticles4AllSceneContract(OCEAN_NEAR_FIELD_SCENE);
