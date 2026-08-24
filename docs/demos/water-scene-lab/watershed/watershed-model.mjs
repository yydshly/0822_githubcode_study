export const MODEL_VERSION = 'mountain-watershed-graph-v0';
export const COUPLED_MODEL_VERSION = 'mountain-watershed-coupled-v1';
export const OVERFLOW_MODEL_VERSION = 'mountain-watershed-overflow-v2';

export const FLOODPLAIN_ROUTING_MODES = Object.freeze({
  open: 'open-path',
  barrier: 'barrier-detour',
});

export const TRUTH_LEVELS = Object.freeze({
  visual: 'T0',
  kinematic: 'T1',
  mapped: 'T2',
  coupled: 'T3',
  calibrated: 'T4',
});

export const NODE_TYPES = Object.freeze([
  'source',
  'river',
  'drop',
  'waterfall',
  'pool',
  'floodplain',
  'sink',
]);

export const SI_UNITS = Object.freeze({
  distance: 'm',
  time: 's',
  volume: 'm3',
  volumeRate: 'm3/s',
  velocity: 'm/s',
  acceleration: 'm/s2',
});

export const MOUNTAIN_WATERSHED_V0 = deepFreeze({
  id: 'mountain-watershed-v0',
  modelVersion: MODEL_VERSION,
  truthLevel: TRUTH_LEVELS.mapped,
  goal: '同一上游来水驱动 River → Waterfall → Pool，并保留下游传播端口。',
  world: {
    metersPerWorldUnit: 1,
    gravityMps2: 9.81,
    fixedHz: 60,
    units: SI_UNITS,
  },
  parameters: {
    baseDischargeM3s: 6,
    sourceInflowM3s: 2,
    riverInitialVolumeM3: 240,
    outletWidthM: 6.8,
    outletHeadM: 0.72,
    fallHeightM: 18,
    poolSurfaceAreaM2: 420,
    poolInitialVolumeM3: 1680,
    poolOutflowM3s: 2.5,
    poolCapacityM3: 1710,
    floodplainOutflowM3s: 0.25,
    floodplainColumns: 12,
    floodplainRows: 7,
    floodplainCellWidthM: 2.4,
    floodplainCellLengthM: 2.6,
    floodplainMaximumDepthM: 0.18,
  },
  nodes: [
    { id: 'source', type: 'source', inputs: [], outputs: ['out'] },
    { id: 'upper-river', type: 'river', inputs: ['upstream'], outputs: ['outlet'] },
    { id: 'cliff-drop', type: 'drop', inputs: ['upstream'], outputs: ['lip'] },
    { id: 'main-waterfall', type: 'waterfall', inputs: ['top'], outputs: ['impact'] },
    { id: 'lower-pool', type: 'pool', inputs: ['inflow'], outputs: ['overflow'] },
    { id: 'floodplain', type: 'floodplain', inputs: ['inflow'], outputs: ['out'] },
    { id: 'sink', type: 'sink', inputs: ['inflow'], outputs: [] },
  ],
  edges: [
    { id: 'source-river', from: ['source', 'out'], to: ['upper-river', 'upstream'] },
    { id: 'river-drop', from: ['upper-river', 'outlet'], to: ['cliff-drop', 'upstream'] },
    { id: 'drop-waterfall', from: ['cliff-drop', 'lip'], to: ['main-waterfall', 'top'] },
    { id: 'waterfall-pool', from: ['main-waterfall', 'impact'], to: ['lower-pool', 'inflow'] },
    { id: 'pool-floodplain', from: ['lower-pool', 'overflow'], to: ['floodplain', 'inflow'] },
    { id: 'floodplain-sink', from: ['floodplain', 'out'], to: ['sink', 'inflow'] },
  ],
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashObject(value) {
  const input = canonicalize(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export const SCENARIO_HASH = hashObject(MOUNTAIN_WATERSHED_V0);

export function validateScenarioDefinition(scenario = MOUNTAIN_WATERSHED_V0) {
  const errors = [];
  if (!scenario || typeof scenario !== 'object') {
    return { passed: false, errors: ['scenario must be an object'], topologicalOrder: [] };
  }

  const { world = {}, parameters = {}, nodes = [], edges = [] } = scenario;
  if (!finitePositive(world.metersPerWorldUnit)) errors.push('world.metersPerWorldUnit must be positive');
  if (!finitePositive(world.gravityMps2)) errors.push('world.gravityMps2 must be positive');
  if (!finitePositive(world.fixedHz)) errors.push('world.fixedHz must be positive');
  for (const [name, unit] of Object.entries(SI_UNITS)) {
    if (world.units?.[name] !== unit) errors.push(`world.units.${name} must be ${unit}`);
  }

  for (const key of [
    'baseDischargeM3s',
    'sourceInflowM3s',
    'riverInitialVolumeM3',
    'outletWidthM',
    'outletHeadM',
    'fallHeightM',
    'poolSurfaceAreaM2',
    'poolInitialVolumeM3',
    'poolOutflowM3s',
    'poolCapacityM3',
    'floodplainOutflowM3s',
    'floodplainColumns',
    'floodplainRows',
    'floodplainCellWidthM',
    'floodplainCellLengthM',
    'floodplainMaximumDepthM',
  ]) {
    if (!finitePositive(parameters[key])) errors.push(`parameters.${key} must be positive`);
  }
  if (!Number.isInteger(parameters.floodplainColumns) || !Number.isInteger(parameters.floodplainRows)) {
    errors.push('floodplain grid dimensions must be integers');
  }
  if (parameters.poolCapacityM3 < parameters.poolInitialVolumeM3) {
    errors.push('poolCapacityM3 must not be below poolInitialVolumeM3');
  }

  const nodeById = new Map();
  for (const node of nodes) {
    if (!node?.id) {
      errors.push('node id is required');
      continue;
    }
    if (nodeById.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    if (!NODE_TYPES.includes(node.type)) errors.push(`unsupported node type: ${node.type}`);
    if (!Array.isArray(node.inputs) || !Array.isArray(node.outputs)) {
      errors.push(`node ports must be arrays: ${node.id}`);
    }
    nodeById.set(node.id, node);
  }

  const edgeIds = new Set();
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (!edge?.id || edgeIds.has(edge.id)) errors.push(`duplicate or missing edge id: ${edge?.id ?? ''}`);
    edgeIds.add(edge?.id);
    const [fromNodeId, fromPort] = edge?.from ?? [];
    const [toNodeId, toPort] = edge?.to ?? [];
    const fromNode = nodeById.get(fromNodeId);
    const toNode = nodeById.get(toNodeId);
    if (!fromNode) errors.push(`edge ${edge?.id} has unknown source node: ${fromNodeId}`);
    if (!toNode) errors.push(`edge ${edge?.id} has unknown target node: ${toNodeId}`);
    if (fromNode && !fromNode.outputs.includes(fromPort)) {
      errors.push(`edge ${edge.id} has unknown source port: ${fromNodeId}.${fromPort}`);
    }
    if (toNode && !toNode.inputs.includes(toPort)) {
      errors.push(`edge ${edge.id} has unknown target port: ${toNodeId}.${toPort}`);
    }
    if (fromNode && toNode) {
      outgoing.get(fromNodeId).push(toNodeId);
      indegree.set(toNodeId, indegree.get(toNodeId) + 1);
    }
  }

  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const topologicalOrder = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    topologicalOrder.push(nodeId);
    for (const targetId of outgoing.get(nodeId) ?? []) {
      indegree.set(targetId, indegree.get(targetId) - 1);
      if (indegree.get(targetId) === 0) queue.push(targetId);
    }
  }
  if (topologicalOrder.length !== nodes.length) errors.push('water graph must be acyclic');

  const requiredPath = ['source', 'upper-river', 'cliff-drop', 'main-waterfall', 'lower-pool', 'floodplain', 'sink'];
  if (topologicalOrder.join('|') !== requiredPath.join('|')) {
    errors.push('water graph does not contain the required ordered watershed path');
  }

  return { passed: errors.length === 0, errors, topologicalOrder };
}

export function createWaterTransfer({
  sourceNode,
  targetNode,
  volumeRateM3s,
  meanVelocityMps,
  widthM,
  dt,
  truthLevel = TRUTH_LEVELS.mapped,
}) {
  if (!sourceNode || !targetNode) throw new TypeError('transfer nodes are required');
  for (const [key, value] of Object.entries({ volumeRateM3s, meanVelocityMps, widthM, dt })) {
    if (!finitePositive(value)) throw new RangeError(`${key} must be finite and positive`);
  }
  const volumeM3 = volumeRateM3s * dt;
  return Object.freeze({
    sourceNode,
    targetNode,
    volumeRateM3s,
    volumeM3,
    meanVelocityMps,
    widthM,
    momentumProxy: volumeM3 * meanVelocityMps,
    truthLevel,
    dt,
  });
}

export function deriveWatershedStep({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
  dt = 1 / scenario.world.fixedHz,
  poolVolumeM3 = scenario.parameters.poolInitialVolumeM3,
  visualSampleCount = 104,
} = {}) {
  const validation = validateScenarioDefinition(scenario);
  if (!validation.passed) throw new Error(`Invalid watershed scenario: ${validation.errors.join('; ')}`);
  if (!finitePositive(dischargeScale)) throw new RangeError('dischargeScale must be finite and positive');
  if (!finitePositive(dt)) throw new RangeError('dt must be finite and positive');
  if (!Number.isFinite(poolVolumeM3) || poolVolumeM3 < 0) throw new RangeError('poolVolumeM3 must be finite and non-negative');
  if (!Number.isInteger(visualSampleCount) || visualSampleCount <= 0) {
    throw new RangeError('visualSampleCount must be a positive integer');
  }

  const { parameters, world } = scenario;
  const dischargeM3s = parameters.baseDischargeM3s * dischargeScale;
  const outletVelocityMps = Math.sqrt(2 * world.gravityMps2 * parameters.outletHeadM);
  const curtainThicknessM = dischargeM3s / (parameters.outletWidthM * outletVelocityMps);
  const fallTimeS = Math.sqrt(2 * parameters.fallHeightM / world.gravityMps2);
  const verticalImpactVelocityMps = world.gravityMps2 * fallTimeS;
  const impactVelocityMps = Math.hypot(outletVelocityMps, verticalImpactVelocityMps);
  const horizontalTravelM = outletVelocityMps * fallTimeS;

  const riverToWaterfall = createWaterTransfer({
    sourceNode: 'upper-river',
    targetNode: 'main-waterfall',
    volumeRateM3s: dischargeM3s,
    meanVelocityMps: outletVelocityMps,
    widthM: parameters.outletWidthM,
    dt,
  });
  const waterfallToPool = createWaterTransfer({
    sourceNode: 'main-waterfall',
    targetNode: 'lower-pool',
    volumeRateM3s: dischargeM3s,
    meanVelocityMps: impactVelocityMps,
    widthM: parameters.outletWidthM,
    dt,
  });

  const availablePoolVolumeM3 = poolVolumeM3 + waterfallToPool.volumeM3;
  const requestedOutflowM3 = parameters.poolOutflowM3s * dt;
  const poolOutflowM3 = Math.min(requestedOutflowM3, availablePoolVolumeM3);
  const nextPoolVolumeM3 = availablePoolVolumeM3 - poolOutflowM3;
  const poolLevelDeltaM = (nextPoolVolumeM3 - poolVolumeM3) / parameters.poolSurfaceAreaM2;
  const budgetResidualM3 = waterfallToPool.volumeM3
    - poolOutflowM3
    - (nextPoolVolumeM3 - poolVolumeM3);

  return Object.freeze({
    modelVersion: MODEL_VERSION,
    scenarioHash: hashObject(scenario),
    truthLevel: scenario.truthLevel,
    dt,
    dischargeScale,
    dischargeM3s,
    outlet: Object.freeze({
      widthM: parameters.outletWidthM,
      velocityMps: outletVelocityMps,
      curtainThicknessM,
    }),
    waterfall: Object.freeze({
      fallHeightM: parameters.fallHeightM,
      fallTimeS,
      horizontalTravelM,
      verticalImpactVelocityMps,
      impactVelocityMps,
      visualSampleCount,
      representedVolumePerSampleM3: waterfallToPool.volumeM3 / visualSampleCount,
    }),
    pool: Object.freeze({
      previousVolumeM3: poolVolumeM3,
      inflowM3: waterfallToPool.volumeM3,
      outflowM3: poolOutflowM3,
      nextVolumeM3: nextPoolVolumeM3,
      levelDeltaM: poolLevelDeltaM,
    }),
    transfers: Object.freeze([riverToWaterfall, waterfallToPool]),
    budget: Object.freeze({
      externalInputM3: waterfallToPool.volumeM3,
      externalOutputM3: poolOutflowM3,
      storageDeltaM3: nextPoolVolumeM3 - poolVolumeM3,
      residualM3: budgetResidualM3,
    }),
  });
}

export function simulateWatershedCase({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
  totalTicks = 1200,
  visualSampleCount = 104,
} = {}) {
  const validation = validateScenarioDefinition(scenario);
  if (!validation.passed) throw new Error(`Invalid watershed scenario: ${validation.errors.join('; ')}`);
  if (!Number.isInteger(totalTicks) || totalTicks <= 0) {
    throw new RangeError('totalTicks must be a positive integer');
  }

  const dt = 1 / scenario.world.fixedHz;
  const initialPoolVolumeM3 = scenario.parameters.poolInitialVolumeM3;
  let poolVolumeM3 = initialPoolVolumeM3;
  let totalInflowM3 = 0;
  let totalOutflowM3 = 0;
  let accumulatedResidualM3 = 0;
  let maxStepResidualM3 = 0;
  let finalStep = null;

  for (let tick = 0; tick < totalTicks; tick += 1) {
    finalStep = deriveWatershedStep({
      scenario,
      dischargeScale,
      dt,
      poolVolumeM3,
      visualSampleCount,
    });
    poolVolumeM3 = finalStep.pool.nextVolumeM3;
    totalInflowM3 += finalStep.pool.inflowM3;
    totalOutflowM3 += finalStep.pool.outflowM3;
    accumulatedResidualM3 += finalStep.budget.residualM3;
    maxStepResidualM3 = Math.max(maxStepResidualM3, Math.abs(finalStep.budget.residualM3));
  }

  const storageDeltaM3 = poolVolumeM3 - initialPoolVolumeM3;
  const cumulativeBudgetResidualM3 = totalInflowM3 - totalOutflowM3 - storageDeltaM3;
  const poolLevelRiseM = storageDeltaM3 / scenario.parameters.poolSurfaceAreaM2;

  return Object.freeze({
    modelVersion: MODEL_VERSION,
    scenarioHash: hashObject(scenario),
    truthLevel: scenario.truthLevel,
    dischargeScale,
    totalTicks,
    durationS: totalTicks * dt,
    visualSampleCount,
    initialPoolVolumeM3,
    finalPoolVolumeM3: poolVolumeM3,
    poolLevelRiseM,
    totalInflowM3,
    totalOutflowM3,
    storageDeltaM3,
    accumulatedResidualM3,
    cumulativeBudgetResidualM3,
    maxStepResidualM3,
    finalStep,
  });
}

export const COUPLED_RUNTIME_V1 = deepFreeze({
  id: 'mountain-watershed-coupled-v1',
  modelVersion: COUPLED_MODEL_VERSION,
  baseScenarioHash: SCENARIO_HASH,
  truthLevel: TRUTH_LEVELS.coupled,
  transportModel: 'fixed-delay-volume-packets',
  depositionModel: 'analytical-impact-at-pool',
  packetClock: 'fixed-step-60hz',
});

export const COUPLED_CONTRACT_HASH = hashObject(COUPLED_RUNTIME_V1);

const coupledScenarioRuntimeCache = new WeakMap();

function getCoupledScenarioRuntime(scenario) {
  const cached = coupledScenarioRuntimeCache.get(scenario);
  if (cached) return cached;
  const validation = validateScenarioDefinition(scenario);
  if (!validation.passed) throw new Error(`Invalid watershed scenario: ${validation.errors.join('; ')}`);
  const { parameters, world } = scenario;
  const dt = 1 / world.fixedHz;
  const outletVelocityMps = Math.sqrt(2 * world.gravityMps2 * parameters.outletHeadM);
  const fallTimeS = Math.sqrt(2 * parameters.fallHeightM / world.gravityMps2);
  const verticalImpactVelocityMps = world.gravityMps2 * fallTimeS;
  const runtime = Object.freeze({
    scenarioHash: hashObject(scenario),
    dt,
    outletVelocityMps,
    fallTimeS,
    impactVelocityMps: Math.hypot(outletVelocityMps, verticalImpactVelocityMps),
  });
  coupledScenarioRuntimeCache.set(scenario, runtime);
  return runtime;
}

function freezePacket(packet) {
  return Object.freeze({ ...packet });
}

function freezeCoupledState(state) {
  return Object.freeze({
    ...state,
    packets: Object.freeze(state.packets.map(freezePacket)),
    cumulative: Object.freeze({ ...state.cumulative }),
    budget: Object.freeze({ ...state.budget }),
    lastStep: Object.freeze({ ...state.lastStep }),
  });
}

export function createCoupledWatershedState({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
} = {}) {
  const scenarioRuntime = getCoupledScenarioRuntime(scenario);
  if (!finitePositive(dischargeScale)) throw new RangeError('dischargeScale must be finite and positive');
  const initialSystemStorageM3 = scenario.parameters.riverInitialVolumeM3
    + scenario.parameters.poolInitialVolumeM3;
  return freezeCoupledState({
    modelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: scenarioRuntime.scenarioHash,
    coupledContractHash: COUPLED_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale,
    tick: 0,
    timeS: 0,
    riverVolumeM3: scenario.parameters.riverInitialVolumeM3,
    poolVolumeM3: scenario.parameters.poolInitialVolumeM3,
    packets: [],
    cumulative: {
      sourceInputM3: 0,
      riverEmissionM3: 0,
      depositedM3: 0,
      poolOutflowM3: 0,
    },
    budget: {
      initialSystemStorageM3,
      externalInputM3: 0,
      externalOutputM3: 0,
      currentSystemStorageM3: initialSystemStorageM3,
      residualM3: 0,
      stepResidualM3: 0,
    },
    lastStep: {
      sourceInputM3: 0,
      emittedM3: 0,
      depositedM3: 0,
      poolOutflowM3: 0,
      airborneVolumeM3: 0,
      requestedEmissionM3: 0,
    },
  });
}

export function stepCoupledWatershed({
  state,
  scenario = MOUNTAIN_WATERSHED_V0,
} = {}) {
  if (!state || state.modelVersion !== COUPLED_MODEL_VERSION) {
    throw new TypeError('state must be a coupled watershed state');
  }
  const scenarioRuntime = getCoupledScenarioRuntime(scenario);
  if (state.scenarioHash !== scenarioRuntime.scenarioHash) throw new Error('state and scenario hashes do not match');

  const { dt } = scenarioRuntime;
  const sourceInputM3 = scenario.parameters.sourceInflowM3s * dt;
  const riverAvailableM3 = state.riverVolumeM3 + sourceInputM3;
  const requestedEmissionM3 = scenario.parameters.baseDischargeM3s * state.dischargeScale * dt;
  const emittedM3 = Math.min(requestedEmissionM3, riverAvailableM3);
  const nextRiverVolumeM3 = riverAvailableM3 - emittedM3;

  let depositedM3 = 0;
  const nextPackets = [];
  for (const packet of state.packets) {
    const nextAgeS = packet.ageS + dt;
    if (nextAgeS + 1e-12 >= packet.flightTimeS) {
      depositedM3 += packet.volumeM3;
    } else {
      nextPackets.push({ ...packet, ageS: nextAgeS });
    }
  }
  if (emittedM3 > 0) {
    nextPackets.push({
      id: `packet-${String(state.tick + 1).padStart(6, '0')}`,
      emittedTick: state.tick + 1,
      ageS: 0,
      flightTimeS: scenarioRuntime.fallTimeS,
      volumeM3: emittedM3,
      initialVelocityMps: scenarioRuntime.outletVelocityMps,
      impactVelocityMps: scenarioRuntime.impactVelocityMps,
      widthM: scenario.parameters.outletWidthM,
      lateralSeed: `seed-${state.tick + 1}-${state.dischargeScale}`,
    });
  }

  const poolAvailableM3 = state.poolVolumeM3 + depositedM3;
  const requestedPoolOutflowM3 = scenario.parameters.poolOutflowM3s * dt;
  const poolOutflowM3 = Math.min(requestedPoolOutflowM3, poolAvailableM3);
  const nextPoolVolumeM3 = poolAvailableM3 - poolOutflowM3;
  const airborneVolumeM3 = nextPackets.reduce((sum, packet) => sum + packet.volumeM3, 0);

  const cumulative = {
    sourceInputM3: state.cumulative.sourceInputM3 + sourceInputM3,
    riverEmissionM3: state.cumulative.riverEmissionM3 + emittedM3,
    depositedM3: state.cumulative.depositedM3 + depositedM3,
    poolOutflowM3: state.cumulative.poolOutflowM3 + poolOutflowM3,
  };
  const currentSystemStorageM3 = nextRiverVolumeM3 + airborneVolumeM3 + nextPoolVolumeM3;
  const residualM3 = state.budget.initialSystemStorageM3
    + cumulative.sourceInputM3
    - cumulative.poolOutflowM3
    - currentSystemStorageM3;
  const previousAirborneVolumeM3 = state.packets.reduce((sum, packet) => sum + packet.volumeM3, 0);
  const riverResidualM3 = state.riverVolumeM3 + sourceInputM3 - emittedM3 - nextRiverVolumeM3;
  const airborneResidualM3 = previousAirborneVolumeM3 + emittedM3 - depositedM3 - airborneVolumeM3;
  const poolResidualM3 = state.poolVolumeM3 + depositedM3 - poolOutflowM3 - nextPoolVolumeM3;
  const stepResidualM3 = riverResidualM3 + airborneResidualM3 + poolResidualM3;

  return freezeCoupledState({
    modelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: state.scenarioHash,
    coupledContractHash: COUPLED_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale: state.dischargeScale,
    tick: state.tick + 1,
    timeS: state.timeS + dt,
    riverVolumeM3: nextRiverVolumeM3,
    poolVolumeM3: nextPoolVolumeM3,
    packets: nextPackets,
    cumulative,
    budget: {
      initialSystemStorageM3: state.budget.initialSystemStorageM3,
      externalInputM3: cumulative.sourceInputM3,
      externalOutputM3: cumulative.poolOutflowM3,
      currentSystemStorageM3,
      residualM3,
      stepResidualM3,
    },
    lastStep: {
      sourceInputM3,
      emittedM3,
      depositedM3,
      poolOutflowM3,
      airborneVolumeM3,
      requestedEmissionM3,
    },
  });
}

export function simulateCoupledWatershedCase({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
  totalTicks = 1200,
} = {}) {
  if (!Number.isInteger(totalTicks) || totalTicks <= 0) {
    throw new RangeError('totalTicks must be a positive integer');
  }
  let state = createCoupledWatershedState({ scenario, dischargeScale });
  let maxAbsoluteStepResidualM3 = 0;
  let maximumPacketCount = 0;
  for (let tick = 0; tick < totalTicks; tick += 1) {
    state = stepCoupledWatershed({ state, scenario });
    maxAbsoluteStepResidualM3 = Math.max(maxAbsoluteStepResidualM3, Math.abs(state.budget.stepResidualM3));
    maximumPacketCount = Math.max(maximumPacketCount, state.packets.length);
  }
  const poolLevelRiseM = (state.poolVolumeM3 - scenario.parameters.poolInitialVolumeM3)
    / scenario.parameters.poolSurfaceAreaM2;
  return Object.freeze({
    modelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: state.scenarioHash,
    coupledContractHash: COUPLED_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale,
    totalTicks,
    durationS: state.timeS,
    poolLevelRiseM,
    maximumPacketCount,
    maxAbsoluteStepResidualM3,
    finalState: state,
  });
}

export function runCoupledWatershedAB({ totalTicks = 1200 } = {}) {
  return Object.freeze({
    low: simulateCoupledWatershedCase({ dischargeScale: 0.5, totalTicks }),
    high: simulateCoupledWatershedCase({ dischargeScale: 1, totalTicks }),
  });
}

export const OVERFLOW_RUNTIME_V1 = deepFreeze({
  id: 'mountain-watershed-overflow-v2',
  modelVersion: OVERFLOW_MODEL_VERSION,
  coupledModelVersion: COUPLED_MODEL_VERSION,
  baseScenarioHash: SCENARIO_HASH,
  truthLevel: TRUTH_LEVELS.coupled,
  overflowModel: 'finite-pool-capacity',
  floodplainModel: 'deterministic-obstacle-aware-priority-storage-cells',
  boundaryModel: 'fixed-floodplain-outflow',
  routingModes: FLOODPLAIN_ROUTING_MODES,
  barrierLayout: 'row-1-columns-2-through-9',
});

export const OVERFLOW_CONTRACT_HASH = hashObject(OVERFLOW_RUNTIME_V1);

const overflowScenarioRuntimeCache = new WeakMap();

function deterministicFloodUnit(index, salt = 0) {
  const value = Math.sin((index + 1) * 91.713 + salt * 231.117) * 43758.5453123;
  return value - Math.floor(value);
}

function normalizeFloodplainRoutingMode(routingMode = FLOODPLAIN_ROUTING_MODES.open) {
  if (!Object.values(FLOODPLAIN_ROUTING_MODES).includes(routingMode)) {
    throw new RangeError(`Unsupported floodplain routing mode: ${routingMode}`);
  }
  return routingMode;
}

function getOverflowScenarioRuntime(scenario, routingMode = FLOODPLAIN_ROUTING_MODES.open) {
  const normalizedMode = normalizeFloodplainRoutingMode(routingMode);
  let modeCache = overflowScenarioRuntimeCache.get(scenario);
  if (!modeCache) {
    modeCache = new Map();
    overflowScenarioRuntimeCache.set(scenario, modeCache);
  }
  const cached = modeCache.get(normalizedMode);
  if (cached) return cached;
  const validation = validateScenarioDefinition(scenario);
  if (!validation.passed) throw new Error(`Invalid watershed scenario: ${validation.errors.join('; ')}`);
  const parameters = scenario.parameters;
  const columns = parameters.floodplainColumns;
  const rows = parameters.floodplainRows;
  const cellAreaM2 = parameters.floodplainCellWidthM * parameters.floodplainCellLengthM;
  const centerColumn = (columns - 1) * 0.5;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const channelDistance = Math.abs(column - centerColumn);
      const blocked = normalizedMode === FLOODPLAIN_ROUTING_MODES.barrier
        && row === 1
        && column >= 2
        && column <= 9;
      const bedElevationM = row * 0.006
        + channelDistance * 0.004
        + (deterministicFloodUnit(index, 1) - 0.5) * 0.018;
      const maximumDepthM = Math.max(
        0.08,
        parameters.floodplainMaximumDepthM
          - row * 0.006
          - channelDistance * 0.003
          + deterministicFloodUnit(index, 2) * 0.028,
      );
      const openPriority = row + channelDistance * 0.38 + bedElevationM * 5;
      const detourDistance = Math.min(Math.abs(column - 1), Math.abs(column - (columns - 2)));
      const routingPriority = normalizedMode === FLOODPLAIN_ROUTING_MODES.barrier
        ? (row === 0 ? openPriority : 5 + row * 1.1 + detourDistance * 0.46 + bedElevationM * 5)
        : openPriority;
      cells.push(Object.freeze({
        index,
        row,
        column,
        xM: (column - centerColumn) * parameters.floodplainCellWidthM,
        zM: row * parameters.floodplainCellLengthM,
        bedElevationM,
        maximumDepthM,
        capacityM3: blocked ? 0 : maximumDepthM * cellAreaM2,
        priority: blocked ? Number.POSITIVE_INFINITY : routingPriority,
        blocked,
      }));
    }
  }
  const fillOrder = Object.freeze(cells
    .map((cell) => cell.index)
    .sort((left, right) => cells[left].priority - cells[right].priority));
  const runtime = Object.freeze({
    scenarioHash: hashObject(scenario),
    routingMode: normalizedMode,
    columns,
    rows,
    cellAreaM2,
    cells: Object.freeze(cells),
    fillOrder,
    blockedCellCount: cells.filter((cell) => cell.blocked).length,
    totalGridCapacityM3: cells.reduce((sum, cell) => sum + cell.capacityM3, 0),
  });
  modeCache.set(normalizedMode, runtime);
  return runtime;
}

function deriveFloodplainDistribution({
  storageM3,
  previousArrivalTicks,
  tick,
  scenario,
  routingMode,
}) {
  const runtime = getOverflowScenarioRuntime(scenario, routingMode);
  const volumes = new Float64Array(runtime.cells.length);
  let remainingM3 = storageM3;
  for (const cellIndex of runtime.fillOrder) {
    if (remainingM3 <= 1e-12) break;
    const cell = runtime.cells[cellIndex];
    const volumeM3 = Math.min(cell.capacityM3, remainingM3);
    volumes[cellIndex] = volumeM3;
    remainingM3 -= volumeM3;
  }
  const arrivalTicks = [...previousArrivalTicks];
  let wetCellCount = 0;
  let maximumDepthM = 0;
  const cells = runtime.cells.map((cell) => {
    const volumeM3 = volumes[cell.index];
    const waterDepthM = volumeM3 / runtime.cellAreaM2;
    if (volumeM3 > 1e-12) {
      wetCellCount += 1;
      maximumDepthM = Math.max(maximumDepthM, waterDepthM);
      if (arrivalTicks[cell.index] == null) arrivalTicks[cell.index] = tick;
    }
    return Object.freeze({
      ...cell,
      volumeM3,
      waterDepthM,
      fillRatio: cell.maximumDepthM > 0 ? waterDepthM / cell.maximumDepthM : 0,
      arrivalTick: arrivalTicks[cell.index],
      wet: volumeM3 > 1e-12,
    });
  });
  const wetCells = cells.filter((cell) => cell.wet);
  const downstreamWetCellCount = wetCells.filter((cell) => cell.row >= 2).length;
  const meanWetAbsXM = wetCells.length
    ? wetCells.reduce((sum, cell) => sum + Math.abs(cell.xM), 0) / wetCells.length
    : 0;
  const wetCentroidXM = wetCells.length
    ? wetCells.reduce((sum, cell) => sum + cell.xM, 0) / wetCells.length
    : 0;
  const maximumWetRow = wetCells.reduce((maximum, cell) => Math.max(maximum, cell.row), -1);
  return Object.freeze({
    routingMode: runtime.routingMode,
    columns: runtime.columns,
    rows: runtime.rows,
    cellAreaM2: runtime.cellAreaM2,
    storageM3,
    representedStorageM3: storageM3 - Math.max(0, remainingM3),
    unrepresentedStorageM3: Math.max(0, remainingM3),
    totalGridCapacityM3: runtime.totalGridCapacityM3,
    blockedCellCount: runtime.blockedCellCount,
    wetCellCount,
    downstreamWetCellCount,
    meanWetAbsXM,
    wetCentroidXM,
    maximumWetRow,
    wetRouteSignature: wetCells.map((cell) => cell.index).join('-'),
    maximumDepthM,
    arrivalTicks: Object.freeze(arrivalTicks),
    cells: Object.freeze(cells),
  });
}

function freezeOverflowState(state) {
  return Object.freeze({
    ...state,
    cumulative: Object.freeze({ ...state.cumulative }),
    budget: Object.freeze({ ...state.budget }),
    lastStep: Object.freeze({ ...state.lastStep }),
  });
}

export function createOverflowWatershedState({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
  floodplainRoutingMode = FLOODPLAIN_ROUTING_MODES.open,
} = {}) {
  const routingMode = normalizeFloodplainRoutingMode(floodplainRoutingMode);
  const runtime = getOverflowScenarioRuntime(scenario, routingMode);
  const coupledState = createCoupledWatershedState({ scenario, dischargeScale });
  const floodplain = deriveFloodplainDistribution({
    storageM3: 0,
    previousArrivalTicks: Array(runtime.cells.length).fill(null),
    tick: 0,
    scenario,
    routingMode,
  });
  const initialSystemStorageM3 = scenario.parameters.riverInitialVolumeM3
    + scenario.parameters.poolInitialVolumeM3;
  return freezeOverflowState({
    modelVersion: OVERFLOW_MODEL_VERSION,
    coupledModelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: runtime.scenarioHash,
    overflowContractHash: OVERFLOW_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale,
    floodplainRoutingMode: routingMode,
    tick: 0,
    timeS: 0,
    coupledState,
    riverVolumeM3: coupledState.riverVolumeM3,
    poolVolumeM3: coupledState.poolVolumeM3,
    floodplainVolumeM3: 0,
    packets: coupledState.packets,
    floodplain,
    cumulative: {
      ...coupledState.cumulative,
      poolOverflowM3: 0,
      floodplainOutflowM3: 0,
    },
    budget: {
      initialSystemStorageM3,
      externalInputM3: 0,
      externalOutputM3: 0,
      currentSystemStorageM3: initialSystemStorageM3,
      residualM3: 0,
      stepResidualM3: 0,
    },
    lastStep: {
      ...coupledState.lastStep,
      poolOverflowM3: 0,
      floodplainOutflowM3: 0,
      floodplainVolumeM3: 0,
      wetCellCount: 0,
    },
  });
}

export function stepOverflowWatershed({
  state,
  scenario = MOUNTAIN_WATERSHED_V0,
} = {}) {
  if (!state || state.modelVersion !== OVERFLOW_MODEL_VERSION) {
    throw new TypeError('state must be an overflow watershed state');
  }
  const runtime = getOverflowScenarioRuntime(scenario, state.floodplainRoutingMode);
  if (state.scenarioHash !== runtime.scenarioHash) throw new Error('state and scenario hashes do not match');

  const coupledCandidate = stepCoupledWatershed({ state: state.coupledState, scenario });
  const dt = 1 / scenario.world.fixedHz;
  const poolAvailableM3 = state.poolVolumeM3 + coupledCandidate.lastStep.depositedM3;
  const poolOutflowM3 = Math.min(coupledCandidate.lastStep.poolOutflowM3, poolAvailableM3);
  const poolAfterOutflowM3 = poolAvailableM3 - poolOutflowM3;
  const poolOverflowM3 = Math.max(0, poolAfterOutflowM3 - scenario.parameters.poolCapacityM3);
  const nextPoolVolumeM3 = poolAfterOutflowM3 - poolOverflowM3;
  const floodplainAvailableM3 = state.floodplainVolumeM3 + poolOverflowM3;
  const floodplainOutflowM3 = Math.min(
    scenario.parameters.floodplainOutflowM3s * dt,
    floodplainAvailableM3,
  );
  const nextFloodplainVolumeM3 = floodplainAvailableM3 - floodplainOutflowM3;

  const correctedCoupledState = freezeCoupledState({
    ...coupledCandidate,
    poolVolumeM3: nextPoolVolumeM3,
  });
  const cumulative = {
    ...correctedCoupledState.cumulative,
    poolOverflowM3: state.cumulative.poolOverflowM3 + poolOverflowM3,
    floodplainOutflowM3: state.cumulative.floodplainOutflowM3 + floodplainOutflowM3,
  };
  const airborneVolumeM3 = correctedCoupledState.lastStep.airborneVolumeM3;
  const currentSystemStorageM3 = correctedCoupledState.riverVolumeM3
    + airborneVolumeM3
    + nextPoolVolumeM3
    + nextFloodplainVolumeM3;
  const externalOutputM3 = cumulative.poolOutflowM3 + cumulative.floodplainOutflowM3;
  const residualM3 = state.budget.initialSystemStorageM3
    + cumulative.sourceInputM3
    - externalOutputM3
    - currentSystemStorageM3;
  const stepResidualM3 = state.budget.currentSystemStorageM3
    + correctedCoupledState.lastStep.sourceInputM3
    - poolOutflowM3
    - floodplainOutflowM3
    - currentSystemStorageM3;
  const floodplain = deriveFloodplainDistribution({
    storageM3: nextFloodplainVolumeM3,
    previousArrivalTicks: state.floodplain.arrivalTicks,
    tick: state.tick + 1,
    scenario,
    routingMode: state.floodplainRoutingMode,
  });

  return freezeOverflowState({
    modelVersion: OVERFLOW_MODEL_VERSION,
    coupledModelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: state.scenarioHash,
    overflowContractHash: OVERFLOW_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale: state.dischargeScale,
    floodplainRoutingMode: state.floodplainRoutingMode,
    tick: state.tick + 1,
    timeS: state.timeS + dt,
    coupledState: correctedCoupledState,
    riverVolumeM3: correctedCoupledState.riverVolumeM3,
    poolVolumeM3: nextPoolVolumeM3,
    floodplainVolumeM3: nextFloodplainVolumeM3,
    packets: correctedCoupledState.packets,
    floodplain,
    cumulative,
    budget: {
      initialSystemStorageM3: state.budget.initialSystemStorageM3,
      externalInputM3: cumulative.sourceInputM3,
      externalOutputM3,
      currentSystemStorageM3,
      residualM3,
      stepResidualM3,
    },
    lastStep: {
      ...correctedCoupledState.lastStep,
      poolOutflowM3,
      poolOverflowM3,
      floodplainOutflowM3,
      floodplainVolumeM3: nextFloodplainVolumeM3,
      wetCellCount: floodplain.wetCellCount,
    },
  });
}

export function simulateOverflowWatershedCase({
  scenario = MOUNTAIN_WATERSHED_V0,
  dischargeScale = 1,
  floodplainRoutingMode = FLOODPLAIN_ROUTING_MODES.open,
  totalTicks = 1200,
} = {}) {
  if (!Number.isInteger(totalTicks) || totalTicks <= 0) {
    throw new RangeError('totalTicks must be a positive integer');
  }
  let state = createOverflowWatershedState({ scenario, dischargeScale, floodplainRoutingMode });
  let maximumPacketCount = 0;
  let maximumWetCellCount = 0;
  let maxAbsoluteStepResidualM3 = 0;
  let firstOverflowTick = null;
  for (let tick = 0; tick < totalTicks; tick += 1) {
    state = stepOverflowWatershed({ state, scenario });
    maximumPacketCount = Math.max(maximumPacketCount, state.packets.length);
    maximumWetCellCount = Math.max(maximumWetCellCount, state.floodplain.wetCellCount);
    maxAbsoluteStepResidualM3 = Math.max(maxAbsoluteStepResidualM3, Math.abs(state.budget.stepResidualM3));
    if (firstOverflowTick == null && state.lastStep.poolOverflowM3 > 0) firstOverflowTick = state.tick;
  }
  return Object.freeze({
    modelVersion: OVERFLOW_MODEL_VERSION,
    coupledModelVersion: COUPLED_MODEL_VERSION,
    scenarioHash: state.scenarioHash,
    overflowContractHash: OVERFLOW_CONTRACT_HASH,
    truthLevel: TRUTH_LEVELS.coupled,
    dischargeScale,
    floodplainRoutingMode: state.floodplainRoutingMode,
    totalTicks,
    durationS: state.timeS,
    poolLevelRiseM: (state.poolVolumeM3 - scenario.parameters.poolInitialVolumeM3)
      / scenario.parameters.poolSurfaceAreaM2,
    maximumPacketCount,
    maximumWetCellCount,
    maxAbsoluteStepResidualM3,
    firstOverflowTick,
    finalState: state,
  });
}

export function runOverflowWatershedAB({ totalTicks = 1200 } = {}) {
  return Object.freeze({
    low: simulateOverflowWatershedCase({
      dischargeScale: 0.5,
      floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open,
      totalTicks,
    }),
    high: simulateOverflowWatershedCase({
      dischargeScale: 1,
      floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open,
      totalTicks,
    }),
  });
}

export function runFloodplainRoutingAB({ totalTicks = 1200 } = {}) {
  return Object.freeze({
    open: simulateOverflowWatershedCase({
      dischargeScale: 1,
      floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open,
      totalTicks,
    }),
    barrier: simulateOverflowWatershedCase({
      dischargeScale: 1,
      floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.barrier,
      totalTicks,
    }),
  });
}

export function floodplainRoutingSelfCheck() {
  const runs = runFloodplainRoutingAB({ totalTicks: 1200 });
  const open = runs.open.finalState;
  const barrier = runs.barrier.finalState;
  const checks = {
    sameOverflowInput: Math.abs(open.cumulative.poolOverflowM3 - barrier.cumulative.poolOverflowM3) <= 1e-9,
    barrierCellsPresent: barrier.floodplain.blockedCellCount > 0,
    blockedCellsStayDry: barrier.floodplain.cells.every((cell) => !cell.blocked || !cell.wet),
    routeChanges: open.floodplain.wetRouteSignature !== barrier.floodplain.wetRouteSignature,
    barrierCreatesDetour: barrier.floodplain.meanWetAbsXM > open.floodplain.meanWetAbsXM,
    storagePreserved: Math.abs(open.floodplainVolumeM3 - barrier.floodplainVolumeM3) <= 1e-9,
    budgetsClosed: Math.abs(open.budget.residualM3) <= 1e-9 && Math.abs(barrier.budget.residualM3) <= 1e-9,
  };
  return Object.freeze({ checks: Object.freeze(checks), passed: Object.values(checks).every(Boolean) });
}

export function overflowModelSelfCheck() {
  const runs = runOverflowWatershedAB({ totalTicks: 1200 });
  const checks = {
    lowDoesNotOverflow: runs.low.finalState.cumulative.poolOverflowM3 === 0,
    highOverflows: runs.high.finalState.cumulative.poolOverflowM3 > 0,
    highWetsFloodplain: runs.high.finalState.floodplain.wetCellCount > 0,
    poolCapacityRespected: runs.high.finalState.poolVolumeM3 <= MOUNTAIN_WATERSHED_V0.parameters.poolCapacityM3,
    globalBudgetsClosed: Math.abs(runs.low.finalState.budget.residualM3) <= 1e-9
      && Math.abs(runs.high.finalState.budget.residualM3) <= 1e-9,
    stepBudgetsClosed: runs.low.maxAbsoluteStepResidualM3 <= 1e-12
      && runs.high.maxAbsoluteStepResidualM3 <= 1e-12,
  };
  return Object.freeze({ checks: Object.freeze(checks), passed: Object.values(checks).every(Boolean) });
}

export function coupledModelSelfCheck() {
  const run = simulateCoupledWatershedCase({ totalTicks: 180 });
  const state = run.finalState;
  const checks = {
    truthLevelCoupled: state.truthLevel === TRUTH_LEVELS.coupled,
    riverDebited: state.riverVolumeM3 < MOUNTAIN_WATERSHED_V0.parameters.riverInitialVolumeM3,
    packetsInFlight: state.packets.length > 0 && state.lastStep.airborneVolumeM3 > 0,
    poolDeposited: state.cumulative.depositedM3 > 0,
    cumulativeBudgetClosed: Math.abs(state.budget.residualM3) <= 1e-9,
    stepBudgetClosed: run.maxAbsoluteStepResidualM3 <= 1e-12,
  };
  return Object.freeze({ checks: Object.freeze(checks), passed: Object.values(checks).every(Boolean) });
}

export function modelSelfCheck() {
  const validation = validateScenarioDefinition();
  const step = deriveWatershedStep();
  const run = simulateWatershedCase({ totalTicks: 60 });
  const checks = {
    scenarioValid: validation.passed,
    truthLevelMapped: step.truthLevel === TRUTH_LEVELS.mapped,
    transferCount: step.transfers.length === 2,
    finiteBudget: Object.values(step.budget).every(Number.isFinite),
    budgetClosed: Math.abs(step.budget.residualM3) <= 1e-12,
    accumulatedBudgetClosed: Math.abs(run.cumulativeBudgetResidualM3) <= 1e-9,
  };
  return Object.freeze({ checks: Object.freeze(checks), passed: Object.values(checks).every(Boolean) });
}
