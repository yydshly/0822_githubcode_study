import {
  CONTRACT_HASH,
  MODEL_VERSION,
  PARTICLES4ALL_BRIDGE_CONFIG,
} from './waterfall-model.mjs';
import {
  PARTICLES4ALL_SCENE_SCHEMA,
  createParticles4AllSceneContract,
  hashParticles4AllSceneContract,
  serializeParticles4AllSceneContract,
} from '../core/particles4all-scene-contract.mjs';

export const WATERFALL_NEAR_FIELD_SCENE = createParticles4AllSceneContract({
  schema: PARTICLES4ALL_SCENE_SCHEMA,
  id: 'waterfall-impact-near-field',
  revision: 2,
  title: 'Waterfall Dense Block Impact / Particles4All Near-field Lens',
  sceneKind: 'waterfall-impact',
  targetPlatform: 'desktop-browser',
  macroLayer: {
    role: 'world-scale-water-representation',
    capability: 'WaterfallVisualAdapter',
    modelVersion: MODEL_VERSION,
    contractHash: CONTRACT_HASH,
  },
  localPhysics: {
    provider: 'Particles4All',
    adapter: 'Particles4AllRuntimeAdapter',
    engineQuery: PARTICLES4ALL_BRIDGE_CONFIG.engineQuery,
    body: {
      shape: 'box',
      density: 2.2,
      startY: 0.76,
      size: 0.15,
      sceneRole: 'dense-impact-block',
    },
    loading: {
      mode: 'lazy-on-demand',
      unloadable: true,
      pauseMacroPreviewWhileLoaded: true,
    },
  },
  mapping: {
    world: {
      driver: 'free-fall-impact-speed',
      parameters: {
        gravityMetersPerSecond2: PARTICLES4ALL_BRIDGE_CONFIG.gravityMetersPerSecond2,
        worldDropMeters: PARTICLES4ALL_BRIDGE_CONFIG.worldDropMeters,
        physicalImpactSpeedMetersPerSecond: PARTICLES4ALL_BRIDGE_CONFIG.physicalImpactSpeedMetersPerSecond,
      },
    },
    solver: {
      velocityScale: PARTICLES4ALL_BRIDGE_CONFIG.velocityScale,
      frame: 'world-down-to-solver-negative-y',
      units: 'Particles4All solver-unit',
    },
    truth: {
      crossScale: PARTICLES4ALL_BRIDGE_CONFIG.crossScaleTruthLevel,
      local: PARTICLES4ALL_BRIDGE_CONFIG.localTruthLevel,
      boundary: 'Particle count is a solver sample and must not be interpreted as real-world discharge.',
    },
  },
  scenario: {
    reset: true,
    ticks: PARTICLES4ALL_BRIDGE_CONFIG.solverTicks,
    comparison: {
      mode: 'no-injection-baseline',
    },
    emitters: [
      {
        id: 'waterfall-impact-packet',
        type: 'fluid-block',
        tick: 0,
        origin: {
          space: 'box-normalized',
          value: [0.45, 0.86, 0.43],
        },
        counts: PARTICLES4ALL_BRIDGE_CONFIG.packetCounts,
        spacing: {
          source: 'runtime-spacing',
          multiplier: 1,
        },
        velocity: [0, PARTICLES4ALL_BRIDGE_CONFIG.solverImpactVelocity, 0],
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
          value: 0.18,
        },
        minimumY: {
          space: 'solver-unit',
          value: 0.25,
        },
      },
      sampleFluidPositions: true,
      sampleRigidBodies: true,
    },
  },
  acceptance: {
    requiredInjectedParticles: PARTICLES4ALL_BRIDGE_CONFIG.packetParticleCount,
    requiredTicks: PARTICLES4ALL_BRIDGE_CONFIG.solverTicks,
    maximumNonFinitePositions: 0,
    minimumBodyDisplacement: 0.005,
    bodyDisplacementAxis: [0, -1, 0],
    minimumBodyDisplacementAlongAxis: 0.005,
    directionalResponseMode: 'baseline-delta',
    minimumBodyDisplacementDeltaAlongAxis: 0.003,
    requireWebGpuContext: true,
  },
});

export const WATERFALL_NEAR_FIELD_SCENE_HASH = hashParticles4AllSceneContract(WATERFALL_NEAR_FIELD_SCENE);
export const WATERFALL_NEAR_FIELD_SCENE_JSON = serializeParticles4AllSceneContract(WATERFALL_NEAR_FIELD_SCENE);
