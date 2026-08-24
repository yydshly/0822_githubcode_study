export const MODEL_VERSION = 'waterfall-breakup-v1';
export const SEED = 9041;
export const FIXED_HZ = 60;
export const FIXED_DT = 1 / FIXED_HZ;
export const TOTAL_TICKS = 1200;
export const WARMUP_TICKS = 120;
export const MEASURE_END_TICK = 1080;
export const MEASURED_TICKS = MEASURE_END_TICK - WARMUP_TICKS;

export const BREAKUP_CASES = Object.freeze({
  curtain: Object.freeze({
    id: 'curtain',
    caseId: 'A',
    label: '连续主水幕',
    breakupMode: 'curtain_only',
  }),
  hybrid: Object.freeze({
    id: 'hybrid',
    caseId: 'B',
    label: '主水幕 + 破碎粒子层',
    breakupMode: 'hybrid_breakup',
  }),
});

export const CLIFF_CONFIG = Object.freeze({
  width: 20,
  height: 20,
  ledgeY: 18,
  basinY: 0,
  basinRadius: 10.5,
});

export const CURTAIN_CONFIG = Object.freeze({
  width: 9.6,
  topY: 18,
  impactY: 1.2,
  drop: 16.8,
  originZ: 0,
  sheetDepth: 0.32,
  bow: 0.58,
  rippleAmplitude: 0.18,
  lateralAmplitude: 0.07,
  phaseFrequencyU: 0.17,
  phaseFrequencyV: 1.18,
  phaseSpeed: 3.35,
  visualFallSpeed: 11.4,
});

export const BREAKUP_CONFIG = Object.freeze({
  layerCount: 1,
  edgeProxyCount: 48,
  impactProxyCount: 56,
  gravity: 9.81,
  bounds: Object.freeze({
    minX: -9,
    maxX: 9,
    minY: -8.5,
    maxY: 19,
    minZ: -2,
    maxZ: 8,
  }),
  impactGrid: Object.freeze({
    minX: -8,
    maxX: 8,
    minZ: -0.75,
    maxZ: 7.25,
    columns: 8,
    rows: 4,
  }),
  fixedFoamEnabled: false,
  fixedMistEnabled: false,
});

// Cross-scale contract for the desktop Particles4All near-field lens. The
// world-space drop is mapped to a bounded solver-space injection speed; visual
// particle count is deliberately not treated as real-world discharge.
const physicalImpactSpeed = Math.sqrt(2 * BREAKUP_CONFIG.gravity * CURTAIN_CONFIG.drop);
export const PARTICLES4ALL_BRIDGE_CONFIG = Object.freeze({
  version: 'waterfall-p4a-bridge-v2-native-box',
  source: 'Particles4All Runtime Adapter / upstream PBF + Shape Matching',
  worldDropMeters: CURTAIN_CONFIG.drop,
  gravityMetersPerSecond2: BREAKUP_CONFIG.gravity,
  physicalImpactSpeedMetersPerSecond: physicalImpactSpeed,
  solverImpactVelocity: -2.5,
  velocityScale: 2.5 / physicalImpactSpeed,
  packetCounts: Object.freeze([8, 6, 8]),
  packetParticleCount: 8 * 6 * 8,
  solverTicks: 30,
  engineQuery: 'preset=small&view=particles&particles=28000&body=box:2.2:0.76&bodysize=0.15&timing=1',
  crossScaleTruthLevel: 'T2 mapped input',
  localTruthLevel: 'T3 local PBF / rigid coupling',
});

export const PARTICLES4ALL_BRIDGE_HASH = hashObject(PARTICLES4ALL_BRIDGE_CONFIG);

const TAU = Math.PI * 2;
const CURTAIN_PROBES = Object.freeze([
  Object.freeze({ u: -0.82, v: 0.12 }),
  Object.freeze({ u: -0.35, v: 0.38 }),
  Object.freeze({ u: 0.00, v: 0.55 }),
  Object.freeze({ u: 0.41, v: 0.73 }),
  Object.freeze({ u: 0.86, v: 0.91 }),
]);
const CURTAIN_DIGEST_TIMES = Object.freeze([0, 2, 7.25, 12.5, 20]);

function finite(value) {
  return Number.isFinite(value);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function quantize(value) {
  return Math.round(value * 1e6) / 1e6;
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
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

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function ranged(random, minimum, maximum) {
  return minimum + (maximum - minimum) * random();
}

function freezeProxy(proxy) {
  return Object.freeze({
    ...proxy,
    velocity: Object.freeze(proxy.velocity),
    origin: proxy.origin ? Object.freeze(proxy.origin) : null,
  });
}

function buildBreakupProxySpecs() {
  const random = createSeededRandom(SEED);
  const proxies = [];

  for (let index = 0; index < BREAKUP_CONFIG.edgeProxyCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lifetime = quantize(ranged(random, 0.62, 1.05));
    const period = quantize(lifetime + ranged(random, 0.25, 0.65));
    proxies.push(freezeProxy({
      id: `edge-${String(index).padStart(2, '0')}`,
      emitter: 'edge_fall',
      side,
      curtainV: quantize(ranged(random, 0.08, 0.64)),
      lifetime,
      period,
      phaseOffset: quantize(ranged(random, 0, period)),
      size: quantize(ranged(random, 0.07, 0.17)),
      velocity: {
        x: quantize(side * ranged(random, 0.45, 1.40)),
        y: quantize(-ranged(random, 3.8, 7.2)),
        z: quantize(ranged(random, 0.25, 1.45)),
      },
    }));
  }

  for (let index = 0; index < BREAKUP_CONFIG.impactProxyCount; index += 1) {
    const lifetime = quantize(ranged(random, 0.42, 0.94));
    const period = quantize(lifetime + ranged(random, 0.18, 0.42));
    proxies.push(freezeProxy({
      id: `impact-${String(index).padStart(2, '0')}`,
      emitter: 'impact_spray',
      lifetime,
      period,
      phaseOffset: quantize(ranged(random, 0, period)),
      size: quantize(ranged(random, 0.07, 0.19)),
      velocity: {
        x: quantize(ranged(random, -3.0, 3.0)),
        y: quantize(ranged(random, 3.5, 7.5)),
        z: quantize(ranged(random, 1.0, 5.8)),
      },
      origin: {
        x: quantize(ranged(random, -CURTAIN_CONFIG.width * 0.46, CURTAIN_CONFIG.width * 0.46)),
        y: CURTAIN_CONFIG.impactY,
        z: quantize(ranged(random, -0.35, 0.35)),
      },
    }));
  }

  return Object.freeze(proxies);
}

export const BREAKUP_PROXIES = buildBreakupProxySpecs();
export const BREAKUP_SPEC_HASH = hashObject(BREAKUP_PROXIES);
export const CURTAIN_HASH = hashObject({
  analyticalModel: 'curtain-parametric-v1',
  curtain: CURTAIN_CONFIG,
});

export const COMMON_CONFIG = Object.freeze({
  modelVersion: MODEL_VERSION,
  seed: SEED,
  fixedHz: FIXED_HZ,
  totalTicks: TOTAL_TICKS,
  warmupTicks: WARMUP_TICKS,
  measureEndTick: MEASURE_END_TICK,
  cliff: CLIFF_CONFIG,
  curtain: CURTAIN_CONFIG,
  curtainHash: CURTAIN_HASH,
  breakup: BREAKUP_CONFIG,
  breakupSpecHash: BREAKUP_SPEC_HASH,
  fixedFoamEnabled: false,
  fixedMistEnabled: false,
});

export const CONTRACT_HASH = hashObject(COMMON_CONFIG);

function resolveCase(caseInput) {
  const breakupCase = typeof caseInput === 'string'
    ? BREAKUP_CASES[caseInput]
      ?? Object.values(BREAKUP_CASES).find((entry) => entry.breakupMode === caseInput || entry.caseId === caseInput)
    : caseInput;
  if (!breakupCase || !['curtain_only', 'hybrid_breakup'].includes(breakupCase.breakupMode)) {
    throw new Error(`Invalid breakup case: ${caseInput}`);
  }
  return breakupCase;
}

export function resolvedCaseConfig(caseInput) {
  const breakupCase = resolveCase(caseInput);
  return Object.freeze({ ...COMMON_CONFIG, breakupMode: breakupCase.breakupMode });
}

export function evaluateCurtain(u, v, time) {
  if (![u, v, time].every(finite) || u < -1 || u > 1 || v < 0 || v > 1 || time < 0) {
    throw new RangeError(`Invalid curtain query: ${u}, ${v}, ${time}`);
  }

  const edgeEnvelope = Math.sin(Math.PI * (u + 1) * 0.5);
  const edgeEnvelopeDu = Math.PI * 0.5 * Math.cos(Math.PI * (u + 1) * 0.5);
  const verticalEnvelope = 0.25 + 0.75 * v;
  const phase = TAU * (
    CURTAIN_CONFIG.phaseFrequencyU * u
    + CURTAIN_CONFIG.phaseFrequencyV * v
  ) - CURTAIN_CONFIG.phaseSpeed * time;
  const phaseDu = TAU * CURTAIN_CONFIG.phaseFrequencyU;
  const phaseDv = TAU * CURTAIN_CONFIG.phaseFrequencyV;
  const lateralPhase = phase * 0.63 + 1.2;

  const x = CURTAIN_CONFIG.width * 0.5 * u
    + CURTAIN_CONFIG.lateralAmplitude * edgeEnvelope * Math.sin(lateralPhase);
  const y = CURTAIN_CONFIG.topY - CURTAIN_CONFIG.drop * v;
  const z = CURTAIN_CONFIG.originZ
    + CURTAIN_CONFIG.bow * 4 * v * (1 - v)
    + CURTAIN_CONFIG.rippleAmplitude * edgeEnvelope * verticalEnvelope * Math.sin(phase);

  const du = [
    CURTAIN_CONFIG.width * 0.5
      + CURTAIN_CONFIG.lateralAmplitude * (
        edgeEnvelopeDu * Math.sin(lateralPhase)
        + edgeEnvelope * Math.cos(lateralPhase) * 0.63 * phaseDu
      ),
    0,
    CURTAIN_CONFIG.rippleAmplitude * verticalEnvelope * (
      edgeEnvelopeDu * Math.sin(phase)
      + edgeEnvelope * Math.cos(phase) * phaseDu
    ),
  ];
  const dv = [
    CURTAIN_CONFIG.lateralAmplitude * edgeEnvelope * Math.cos(lateralPhase) * 0.63 * phaseDv,
    -CURTAIN_CONFIG.drop,
    CURTAIN_CONFIG.bow * 4 * (1 - 2 * v)
      + CURTAIN_CONFIG.rippleAmplitude * edgeEnvelope * (
        0.75 * Math.sin(phase)
        + verticalEnvelope * Math.cos(phase) * phaseDv
      ),
  ];
  const rawNormal = [
    dv[1] * du[2] - dv[2] * du[1],
    dv[2] * du[0] - dv[0] * du[2],
    dv[0] * du[1] - dv[1] * du[0],
  ];
  const rawNormalLength = Math.hypot(...rawNormal) || 1;
  const normal = rawNormal.map((component) => component / rawNormalLength);
  const velocity = [
    -CURTAIN_CONFIG.lateralAmplitude * edgeEnvelope * Math.cos(lateralPhase) * 0.63 * CURTAIN_CONFIG.phaseSpeed,
    0,
    -CURTAIN_CONFIG.rippleAmplitude * edgeEnvelope * verticalEnvelope * Math.cos(phase) * CURTAIN_CONFIG.phaseSpeed,
  ];
  const flowDistance = ((v * CURTAIN_CONFIG.drop + time * CURTAIN_CONFIG.visualFallSpeed)
    % CURTAIN_CONFIG.drop + CURTAIN_CONFIG.drop) % CURTAIN_CONFIG.drop;

  return {
    u,
    v,
    time,
    position: [x, y, z],
    du,
    dv,
    normal,
    velocity,
    phase,
    flowDistance,
  };
}

export function sampleCurtainForCase(u, v, time, caseInput) {
  resolveCase(caseInput);
  return evaluateCurtain(u, v, time);
}

function proxyForInput(proxyInput) {
  const proxy = typeof proxyInput === 'number' ? BREAKUP_PROXIES[proxyInput] : proxyInput;
  if (!proxy || !['edge_fall', 'impact_spray'].includes(proxy.emitter)) {
    throw new Error(`Invalid breakup proxy: ${proxyInput}`);
  }
  return proxy;
}

export function proxyCycleAtTime(proxyInput, time) {
  const proxy = proxyForInput(proxyInput);
  if (!finite(time) || time < 0) throw new RangeError(`Invalid proxy time: ${time}`);
  const shiftedTime = time + proxy.phaseOffset;
  const cycleIndex = Math.floor(shiftedTime / proxy.period);
  const age = shiftedTime - cycleIndex * proxy.period;
  return {
    cycleIndex,
    age,
    normalizedAge: age / proxy.lifetime,
    active: age >= 0 && age < proxy.lifetime,
  };
}

export function evaluateBreakupProxy(proxyInput, time) {
  const proxy = proxyForInput(proxyInput);
  const cycle = proxyCycleAtTime(proxy, time);
  if (!cycle.active) {
    return {
      proxy,
      ...cycle,
      position: null,
      opacity: 0,
      size: 0,
      edgeExpansion: 0,
    };
  }

  const spawnTime = time - cycle.age;
  const origin = proxy.emitter === 'edge_fall'
    ? (() => {
      const curtain = evaluateCurtain(proxy.side, proxy.curtainV, Math.max(0, spawnTime));
      return {
        x: curtain.position[0],
        y: curtain.position[1],
        z: curtain.position[2],
      };
    })()
    : proxy.origin;
  const ageSquared = cycle.age * cycle.age;
  const position = {
    x: origin.x + proxy.velocity.x * cycle.age,
    y: origin.y + proxy.velocity.y * cycle.age - 0.5 * BREAKUP_CONFIG.gravity * ageSquared,
    z: origin.z + proxy.velocity.z * cycle.age,
  };
  const fadeIn = clamp(cycle.normalizedAge / 0.12, 0, 1);
  const fadeOut = clamp((1 - cycle.normalizedAge) / 0.24, 0, 1);
  const opacity = Math.min(fadeIn, fadeOut);
  const size = proxy.size * (1 - 0.42 * cycle.normalizedAge);
  const edgeExpansion = proxy.emitter === 'edge_fall'
    ? Math.max(0, Math.abs(position.x) - CURTAIN_CONFIG.width * 0.5)
    : 0;

  return {
    proxy,
    ...cycle,
    spawnTime,
    position,
    opacity,
    size,
    edgeExpansion,
  };
}

function impactOccupancy(states) {
  const grid = BREAKUP_CONFIG.impactGrid;
  const occupied = new Set();
  for (const state of states) {
    if (state.proxy.emitter !== 'impact_spray' || !state.position) continue;
    const nx = (state.position.x - grid.minX) / (grid.maxX - grid.minX);
    const nz = (state.position.z - grid.minZ) / (grid.maxZ - grid.minZ);
    if (nx < 0 || nx >= 1 || nz < 0 || nz >= 1) continue;
    const column = Math.floor(nx * grid.columns);
    const row = Math.floor(nz * grid.rows);
    occupied.add(`${column}:${row}`);
  }
  return occupied.size / (grid.columns * grid.rows);
}

export function sampleBreakupLayer(time, caseInput) {
  const breakupCase = resolveCase(caseInput);
  if (!finite(time) || time < 0) throw new RangeError(`Invalid breakup layer time: ${time}`);
  if (breakupCase.breakupMode === 'curtain_only') {
    return {
      enabled: false,
      layerCount: 0,
      states: [],
      activeCount: 0,
      edgeActiveCount: 0,
      impactActiveCount: 0,
      edgeExpansionMean: 0,
      impactOccupancy: 0,
    };
  }

  const states = BREAKUP_PROXIES
    .map((proxy) => evaluateBreakupProxy(proxy, time))
    .filter((state) => state.active);
  const edgeStates = states.filter((state) => state.proxy.emitter === 'edge_fall');
  const impactStates = states.filter((state) => state.proxy.emitter === 'impact_spray');
  const edgeExpansionMean = edgeStates.length
    ? edgeStates.reduce((sum, state) => sum + state.edgeExpansion, 0) / edgeStates.length
    : 0;
  return {
    enabled: true,
    layerCount: 1,
    states,
    activeCount: states.length,
    edgeActiveCount: edgeStates.length,
    impactActiveCount: impactStates.length,
    edgeExpansionMean,
    impactOccupancy: impactOccupancy(impactStates),
  };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const mix = position - lower;
  return sorted[lower] * (1 - mix) + sorted[upper] * mix;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stateWithinBounds(state) {
  if (!state.position) return true;
  const { bounds } = BREAKUP_CONFIG;
  const { x, y, z } = state.position;
  return x >= bounds.minX && x <= bounds.maxX
    && y >= bounds.minY && y <= bounds.maxY
    && z >= bounds.minZ && z <= bounds.maxZ;
}

function curtainProbeDigest(caseInput) {
  const samples = [];
  for (const time of CURTAIN_DIGEST_TIMES) {
    for (const probe of CURTAIN_PROBES) {
      const sample = sampleCurtainForCase(probe.u, probe.v, time, caseInput);
      samples.push({
        u: probe.u,
        v: probe.v,
        time,
        position: sample.position.map(quantize),
        normal: sample.normal.map(quantize),
        flowDistance: quantize(sample.flowDistance),
      });
    }
  }
  return hashObject(samples);
}

function differingTopLevelKeys(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((key) => canonicalize(a[key]) !== canonicalize(b[key])).sort();
}

export function runDeterministicCase(caseInput) {
  const breakupCase = resolveCase(caseInput);
  const caseConfig = resolvedCaseConfig(breakupCase);
  const activeCounts = [];
  const edgeActiveCounts = [];
  const impactActiveCounts = [];
  const edgeExpansions = [];
  const impactOccupancies = [];
  let measuredTicks = 0;
  let proxyQueryCount = 0;
  let activeProxySampleCount = 0;
  let curtainQueryCount = 0;
  let nonFiniteCount = 0;
  let lifetimeViolationCount = 0;
  let boundsViolationCount = 0;
  let terminalLayer = null;

  for (let tick = 1; tick <= TOTAL_TICKS; tick += 1) {
    const time = tick * FIXED_DT;
    const layer = sampleBreakupLayer(time, breakupCase);
    terminalLayer = layer;
    if (tick <= WARMUP_TICKS || tick > MEASURE_END_TICK) continue;
    measuredTicks += 1;

    for (const probe of CURTAIN_PROBES) {
      const curtain = sampleCurtainForCase(probe.u, probe.v, time, breakupCase);
      curtainQueryCount += 1;
      const curtainValues = [
        ...curtain.position,
        ...curtain.du,
        ...curtain.dv,
        ...curtain.normal,
        ...curtain.velocity,
        curtain.phase,
        curtain.flowDistance,
      ];
      nonFiniteCount += curtainValues.some((value) => !finite(value)) ? 1 : 0;
    }

    activeCounts.push(layer.activeCount);
    edgeActiveCounts.push(layer.edgeActiveCount);
    impactActiveCounts.push(layer.impactActiveCount);
    impactOccupancies.push(layer.impactOccupancy);
    if (layer.enabled) proxyQueryCount += BREAKUP_PROXIES.length;
    activeProxySampleCount += layer.activeCount;

    for (const state of layer.states) {
      if (state.proxy.emitter === 'edge_fall') edgeExpansions.push(state.edgeExpansion);
      const values = [
        state.age,
        state.normalizedAge,
        state.opacity,
        state.size,
        state.edgeExpansion,
        state.position?.x,
        state.position?.y,
        state.position?.z,
      ];
      nonFiniteCount += values.some((value) => !finite(value)) ? 1 : 0;
      if (state.age < 0 || state.age >= state.proxy.lifetime || state.normalizedAge < 0 || state.normalizedAge >= 1) {
        lifetimeViolationCount += 1;
      }
      if (!stateWithinBounds(state)) boundsViolationCount += 1;
    }
  }

  const breakupLayerCount = breakupCase.breakupMode === 'hybrid_breakup' ? 1 : 0;
  const layers = {
    curtainLayerCount: 1,
    breakupLayerCount,
    foamLayerCount: 0,
    mistLayerCount: 0,
    fixedLayerCount: 1 + breakupLayerCount,
  };
  const metrics = {
    layerCount: layers.fixedLayerCount,
    activeProxyMean: mean(activeCounts),
    activeProxyP95: percentile(activeCounts, 0.95),
    activeProxyMax: activeCounts.length ? Math.max(...activeCounts) : 0,
    edgeActiveMean: mean(edgeActiveCounts),
    impactActiveMean: mean(impactActiveCounts),
    edgeExpansionMean: mean(edgeExpansions),
    edgeExpansionP95: percentile(edgeExpansions, 0.95),
    impactOccupancyMean: mean(impactOccupancies),
    impactOccupancyP95: percentile(impactOccupancies, 0.95),
    mistCoverageMean: 0,
    terminalActiveProxyCount: terminalLayer?.activeCount ?? 0,
    nonFiniteCount,
    lifetimeViolationCount,
    boundsViolationCount,
  };
  const digestPayload = {
    layers,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, quantize(value)])),
  };
  const checks = {
    fixedProtocol: TOTAL_TICKS === 1200,
    measuredTicks: measuredTicks === MEASURED_TICKS,
    curtainQueries: curtainQueryCount === CURTAIN_PROBES.length * MEASURED_TICKS,
    proxyQueries: proxyQueryCount === (breakupLayerCount ? BREAKUP_PROXIES.length * MEASURED_TICKS : 0),
    layerContract: layers.curtainLayerCount === 1
      && layers.breakupLayerCount === breakupLayerCount
      && layers.fixedLayerCount === 1 + breakupLayerCount,
    fixedExplorationOff: BREAKUP_CONFIG.fixedFoamEnabled === false
      && BREAKUP_CONFIG.fixedMistEnabled === false
      && metrics.mistCoverageMean === 0,
    noNonFinite: nonFiniteCount === 0,
    lifetimeValid: lifetimeViolationCount === 0,
    boundsValid: boundsViolationCount === 0,
    expectedIncrement: breakupLayerCount
      ? metrics.activeProxyMean >= 30
        && metrics.edgeActiveMean >= 10
        && metrics.impactActiveMean >= 10
        && metrics.edgeExpansionMean > 0.05
        && metrics.impactOccupancyMean > 0.05
      : metrics.activeProxyMean === 0
        && metrics.edgeActiveMean === 0
        && metrics.impactActiveMean === 0
        && metrics.edgeExpansionMean === 0
        && metrics.impactOccupancyMean === 0,
  };

  return {
    caseId: breakupCase.caseId,
    label: breakupCase.label,
    factor: 'breakupMode',
    breakupMode: breakupCase.breakupMode,
    curtainHash: CURTAIN_HASH,
    curtainProbeDigest: curtainProbeDigest(breakupCase),
    sharedContractHash: CONTRACT_HASH,
    contractHash: CONTRACT_HASH,
    caseHash: hashObject(caseConfig),
    caseConfigHash: hashObject(caseConfig),
    resultDigest: hashObject(digestPayload),
    ticks: TOTAL_TICKS,
    measuredTicks,
    curtainQueryCount,
    proxyQueryCount,
    activeProxySampleCount,
    layers,
    metrics,
    terminal: {
      time: TOTAL_TICKS * FIXED_DT,
      activeProxyCount: terminalLayer?.activeCount ?? 0,
      edgeActiveCount: terminalLayer?.edgeActiveCount ?? 0,
      impactActiveCount: terminalLayer?.impactActiveCount ?? 0,
      impactOccupancy: terminalLayer?.impactOccupancy ?? 0,
    },
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

export function runDeterministicAB() {
  const A = runDeterministicCase(BREAKUP_CASES.curtain);
  const B = runDeterministicCase(BREAKUP_CASES.hybrid);
  const configDifferences = differingTopLevelKeys(
    resolvedCaseConfig(BREAKUP_CASES.curtain),
    resolvedCaseConfig(BREAKUP_CASES.hybrid),
  );
  const increments = {
    layerCount: B.metrics.layerCount - A.metrics.layerCount,
    activeProxyMean: B.metrics.activeProxyMean - A.metrics.activeProxyMean,
    edgeExpansionMean: B.metrics.edgeExpansionMean - A.metrics.edgeExpansionMean,
    impactOccupancyMean: B.metrics.impactOccupancyMean - A.metrics.impactOccupancyMean,
    mistCoverageMean: B.metrics.mistCoverageMean - A.metrics.mistCoverageMean,
  };
  const checks = {
    casesPassed: A.passed && B.passed,
    commonContract: A.contractHash === B.contractHash && A.contractHash === CONTRACT_HASH,
    commonCurtainHash: A.curtainHash === B.curtainHash && A.curtainHash === CURTAIN_HASH,
    identicalCurtainGeometry: A.curtainProbeDigest === B.curtainProbeDigest,
    distinctCaseHash: A.caseHash !== B.caseHash,
    onlyBreakupModeDiffers: configDifferences.length === 1 && configDifferences[0] === 'breakupMode',
    curtainOnlyHasNoIncrement: A.layers.breakupLayerCount === 0
      && A.metrics.activeProxyMean === 0
      && A.metrics.edgeExpansionMean === 0
      && A.metrics.impactOccupancyMean === 0,
    hybridAddsOneLayer: B.layers.breakupLayerCount === 1 && increments.layerCount === 1,
    hybridHasVisibleIncrement: increments.activeProxyMean >= 30
      && increments.edgeExpansionMean > 0.05
      && increments.impactOccupancyMean > 0.05,
    mistExcludedFromFixedAB: BREAKUP_CONFIG.fixedMistEnabled === false
      && A.metrics.mistCoverageMean === 0
      && B.metrics.mistCoverageMean === 0
      && increments.mistCoverageMean === 0,
    noNumericalFailures: A.metrics.nonFiniteCount === 0 && B.metrics.nonFiniteCount === 0,
  };
  const passed = Object.values(checks).every(Boolean);
  return {
    schemaVersion: '1.0',
    modelVersion: MODEL_VERSION,
    factor: 'breakupMode',
    curtainHash: CURTAIN_HASH,
    sharedContractHash: CONTRACT_HASH,
    contractHash: CONTRACT_HASH,
    breakupSpecHash: BREAKUP_SPEC_HASH,
    configDifferences,
    A,
    B,
    increments,
    checks,
    passed,
    boundedConclusion: passed
      ? '在 waterfall-breakup-v1 的固定崖壁、主水幕与视觉速度下，B 仅通过一层破碎粒子增加了边缘扩展与落点占用；这是可重放的视觉代理，不代表真实流量或质量守恒。'
      : '固定 A/B 尚未通过全部检查，不能形成破碎层的有界结论。',
  };
}

export function inspectModelContract() {
  return {
    schemaVersion: '1.0',
    modelVersion: MODEL_VERSION,
    curtainHash: CURTAIN_HASH,
    sharedContractHash: CONTRACT_HASH,
    contractHash: CONTRACT_HASH,
    breakupSpecHash: BREAKUP_SPEC_HASH,
    seed: SEED,
    fixedHz: FIXED_HZ,
    totalTicks: TOTAL_TICKS,
    warmupTicks: WARMUP_TICKS,
    measureEndTick: MEASURE_END_TICK,
    measuredTicks: MEASURED_TICKS,
    curtain: CURTAIN_CONFIG,
    cliff: CLIFF_CONFIG,
    proxyCount: BREAKUP_PROXIES.length,
    emitterCounts: {
      edgeFall: BREAKUP_PROXIES.filter((proxy) => proxy.emitter === 'edge_fall').length,
      impactSpray: BREAKUP_PROXIES.filter((proxy) => proxy.emitter === 'impact_spray').length,
    },
    fixedFoamEnabled: BREAKUP_CONFIG.fixedFoamEnabled,
    fixedMistEnabled: BREAKUP_CONFIG.fixedMistEnabled,
    cases: BREAKUP_CASES,
  };
}

export function modelSelfCheck() {
  const topLeft = evaluateCurtain(-1, 0, 0);
  const bottomRight = evaluateCurtain(1, 1, 0);
  const middle = evaluateCurtain(0, 0.5, 7.25);
  const ab = runDeterministicAB();
  const checks = {
    fixedDrop: Math.abs(topLeft.position[1] - CURTAIN_CONFIG.topY) < 1e-12
      && Math.abs(bottomRight.position[1] - CURTAIN_CONFIG.impactY) < 1e-12,
    curtainNormalsUnit: [topLeft, bottomRight, middle]
      .every((sample) => Math.abs(Math.hypot(...sample.normal) - 1) < 1e-12),
    proxyCount: BREAKUP_PROXIES.length
      === BREAKUP_CONFIG.edgeProxyCount + BREAKUP_CONFIG.impactProxyCount,
    fixedExplorationOff: BREAKUP_CONFIG.fixedFoamEnabled === false
      && BREAKUP_CONFIG.fixedMistEnabled === false,
    abPassed: ab.passed,
  };
  return { checks, ab, passed: Object.values(checks).every(Boolean) };
}

export function formatModelNumber(value, digits = 3) {
  return finite(value) ? value.toFixed(digits) : '—';
}

export function clampTick(tick) {
  return clamp(Math.round(tick), 0, TOTAL_TICKS);
}
