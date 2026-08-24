export const MODEL_VERSION = 'river-flowmap-v1';
export const SEED = 602;
export const FIXED_HZ = 60;
export const FIXED_DT = 1 / FIXED_HZ;
export const TOTAL_TICKS = 1200;
export const WARMUP_TICKS = 120;
export const MEASURE_END_TICK = 1080;
export const MEASURED_TICKS = MEASURE_END_TICK - WARMUP_TICKS;

export const FLOW_CASES = Object.freeze({
  uniform: Object.freeze({ id: 'uniform', caseId: 'A', label: '全局固定方向场', flowMode: 'uniform_world' }),
  guided: Object.freeze({ id: 'guided', caseId: 'B', label: '样条切线方向场', flowMode: 'spline_tangent' }),
});

export const CONTROL_POINTS = Object.freeze([
  Object.freeze({ x: 0.0, z: -30.0 }),
  Object.freeze({ x: -1.4, z: -22.0 }),
  Object.freeze({ x: 5.8, z: -14.5 }),
  Object.freeze({ x: 7.2, z: -5.5 }),
  Object.freeze({ x: 1.4, z: 3.5 }),
  Object.freeze({ x: -6.8, z: 11.5 }),
  Object.freeze({ x: -5.2, z: 20.5 }),
  Object.freeze({ x: 0.0, z: 30.0 }),
]);

export const RIVER_CONFIG = Object.freeze({
  width: 6.8,
  flowSpeed: 2.55,
  surfaceY: 0.12,
  bankHeight: 0.48,
  arcSamples: 1024,
  closestSamples: 320,
});

export const MARKERS = Object.freeze([
  Object.freeze({ id: 'm0', phase: 0.00, lane: -2.20 }),
  Object.freeze({ id: 'm1', phase: 0.035, lane: -1.55 }),
  Object.freeze({ id: 'm2', phase: 0.070, lane: -0.85 }),
  Object.freeze({ id: 'm3', phase: 0.105, lane: -0.20 }),
  Object.freeze({ id: 'm4', phase: 0.140, lane: 0.45 }),
  Object.freeze({ id: 'm5', phase: 0.175, lane: 1.05 }),
  Object.freeze({ id: 'm6', phase: 0.210, lane: 1.65 }),
  Object.freeze({ id: 'm7', phase: 0.240, lane: 2.25 }),
]);

function finite(value) {
  return Number.isFinite(value);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
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

function segmentForS(inputS) {
  const s = clamp(inputS, 0, 1);
  const segmentCount = CONTROL_POINTS.length - 1;
  const scaled = s * segmentCount;
  const index = Math.min(segmentCount - 1, Math.floor(scaled));
  return { index, t: s >= 1 ? 1 : scaled - index, segmentCount };
}

function catmullComponent(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1)
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function catmullDerivativeComponent(p0, p1, p2, p3, t) {
  const t2 = t * t;
  return 0.5 * (
    (-p0 + p2)
    + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t
    + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2
  );
}

export function evaluateCenterline(inputS) {
  const { index, t, segmentCount } = segmentForS(inputS);
  const p0 = CONTROL_POINTS[Math.max(0, index - 1)];
  const p1 = CONTROL_POINTS[index];
  const p2 = CONTROL_POINTS[index + 1];
  const p3 = CONTROL_POINTS[Math.min(CONTROL_POINTS.length - 1, index + 2)];
  const x = catmullComponent(p0.x, p1.x, p2.x, p3.x, t);
  const z = catmullComponent(p0.z, p1.z, p2.z, p3.z, t);
  const derivativeX = catmullDerivativeComponent(p0.x, p1.x, p2.x, p3.x, t) * segmentCount;
  const derivativeZ = catmullDerivativeComponent(p0.z, p1.z, p2.z, p3.z, t) * segmentCount;
  const derivativeLength = Math.hypot(derivativeX, derivativeZ) || 1;
  const tangentX = derivativeX / derivativeLength;
  const tangentZ = derivativeZ / derivativeLength;
  return {
    s: clamp(inputS, 0, 1),
    x,
    z,
    tangentX,
    tangentZ,
    normalX: -tangentZ,
    normalZ: tangentX,
  };
}

function buildArcLut(sampleCount) {
  const entries = [];
  let previous = evaluateCenterline(0);
  let distance = 0;
  entries.push(Object.freeze({ ...previous, distance }));
  for (let index = 1; index <= sampleCount; index += 1) {
    const sample = evaluateCenterline(index / sampleCount);
    distance += Math.hypot(sample.x - previous.x, sample.z - previous.z);
    entries.push(Object.freeze({ ...sample, distance }));
    previous = sample;
  }
  return Object.freeze({ entries: Object.freeze(entries), length: distance });
}

const ARC_LUT = buildArcLut(RIVER_CONFIG.arcSamples);
const CLOSEST_LUT = buildArcLut(RIVER_CONFIG.closestSamples).entries;
export const PATH_LENGTH = ARC_LUT.length;

export const COMMON_CONFIG = Object.freeze({
  modelVersion: MODEL_VERSION,
  seed: SEED,
  fixedHz: FIXED_HZ,
  totalTicks: TOTAL_TICKS,
  warmupTicks: WARMUP_TICKS,
  measureEndTick: MEASURE_END_TICK,
  controlPoints: CONTROL_POINTS,
  river: RIVER_CONFIG,
  markers: MARKERS,
});

export const CONTRACT_HASH = hashObject(COMMON_CONFIG);

export function samplePathByDistance(inputDistance) {
  if (!finite(inputDistance)) throw new TypeError(`Invalid path distance: ${inputDistance}`);
  if (inputDistance < -1e-9 || inputDistance > PATH_LENGTH + 1e-9) {
    throw new RangeError(`Path distance is outside the open river domain: ${inputDistance}`);
  }
  const distance = clamp(inputDistance, 0, PATH_LENGTH);
  const entries = ARC_LUT.entries;
  let low = 0;
  let high = entries.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (entries[middle].distance <= distance) low = middle;
    else high = middle;
  }
  const a = entries[low];
  const b = entries[high];
  const span = Math.max(1e-12, b.distance - a.distance);
  const mix = clamp((distance - a.distance) / span, 0, 1);
  const s = a.s + (b.s - a.s) * mix;
  return { ...evaluateCenterline(s), distance };
}

function squaredDistanceAtS(s, x, z) {
  const sample = evaluateCenterline(s);
  return (sample.x - x) ** 2 + (sample.z - z) ** 2;
}

export function closestCenterlinePoint(x, z) {
  let bestIndex = 0;
  let bestDistanceSquared = Infinity;
  for (let index = 0; index < CLOSEST_LUT.length; index += 1) {
    const sample = CLOSEST_LUT[index];
    const distanceSquared = (sample.x - x) ** 2 + (sample.z - z) ** 2;
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestIndex = index;
    }
  }
  let left = CLOSEST_LUT[Math.max(0, bestIndex - 1)].s;
  let right = CLOSEST_LUT[Math.min(CLOSEST_LUT.length - 1, bestIndex + 1)].s;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const third = (right - left) / 3;
    const a = left + third;
    const b = right - third;
    if (squaredDistanceAtS(a, x, z) <= squaredDistanceAtS(b, x, z)) right = b;
    else left = a;
  }
  const center = evaluateCenterline((left + right) * 0.5);
  const deltaX = x - center.x;
  const deltaZ = z - center.z;
  const lateral = deltaX * center.normalX + deltaZ * center.normalZ;
  return {
    ...center,
    lateral,
    distance: Math.hypot(deltaX, deltaZ),
    inChannel: Math.hypot(deltaX, deltaZ) <= RIVER_CONFIG.width * 0.5,
  };
}

function resolveCase(caseInput) {
  const flowCase = typeof caseInput === 'string' ? FLOW_CASES[caseInput] : caseInput;
  if (!flowCase || !['uniform_world', 'spline_tangent'].includes(flowCase.flowMode)) {
    throw new Error(`Invalid flow case: ${caseInput}`);
  }
  return flowCase;
}

export function sampleFlowAtWorldXZ(x, z, caseInput) {
  const flowCase = resolveCase(caseInput);
  const closest = closestCenterlinePoint(x, z);
  const directionX = flowCase.flowMode === 'spline_tangent' ? closest.tangentX : 0;
  const directionZ = flowCase.flowMode === 'spline_tangent' ? closest.tangentZ : 1;
  const tangentAlignment = clamp(
    directionX * closest.tangentX + directionZ * closest.tangentZ,
    -1,
    1,
  );
  return {
    caseId: flowCase.caseId,
    flowMode: flowCase.flowMode,
    directionX,
    directionZ,
    speed: RIVER_CONFIG.flowSpeed,
    tangentAlignment,
    headingErrorDeg: Math.acos(tangentAlignment) * 180 / Math.PI,
    closest,
  };
}

export function markerStateAtTime(markerIndex, time, caseInput) {
  const flowCase = resolveCase(caseInput);
  const marker = MARKERS[markerIndex];
  if (!marker || !finite(time)) throw new Error(`Invalid marker query: ${markerIndex}, ${time}`);
  const initialDistance = marker.phase * PATH_LENGTH;
  const travelDistance = initialDistance + RIVER_CONFIG.flowSpeed * time;
  if (travelDistance > PATH_LENGTH + 1e-9) {
    throw new Error(`Marker timeline exceeds river domain: ${marker.id}, ${time}`);
  }
  const initialSample = samplePathByDistance(initialDistance);
  let pathSample;
  let x;
  let z;
  if (flowCase.flowMode === 'spline_tangent') {
    pathSample = samplePathByDistance(travelDistance);
    x = pathSample.x + pathSample.normalX * marker.lane;
    z = pathSample.z + pathSample.normalZ * marker.lane;
  } else {
    pathSample = initialSample;
    x = initialSample.x + initialSample.normalX * marker.lane;
    z = initialSample.z + initialSample.normalZ * marker.lane + RIVER_CONFIG.flowSpeed * time;
  }
  const flow = sampleFlowAtWorldXZ(x, z, flowCase);
  return {
    marker,
    travelDistance,
    x,
    y: RIVER_CONFIG.surfaceY + 0.14,
    z,
    directionX: flow.directionX,
    directionZ: flow.directionZ,
    tangentAlignment: flow.tangentAlignment,
    headingErrorDeg: flow.headingErrorDeg,
    lateral: flow.closest.lateral,
    laneError: Math.abs(flow.closest.lateral - marker.lane),
    inChannel: flow.closest.inChannel,
    closest: flow.closest,
  };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const mix = index - lower;
  return sorted[lower] * (1 - mix) + sorted[upper] * mix;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function rms(values) {
  return Math.sqrt(mean(values.map((value) => value * value)));
}

function quantize(value) {
  return Math.round(value * 1e6) / 1e6;
}

export function runDeterministicCase(caseInput) {
  const flowCase = resolveCase(caseInput);
  const alignments = [];
  const headingErrors = [];
  const laneErrors = [];
  const forwardSpeeds = [];
  const lateralDistances = [];
  let inChannelCount = 0;
  let bankExitCount = 0;
  let nonFiniteCount = 0;
  let queryCount = 0;
  let terminalMarkers = [];

  for (let tick = 1; tick <= TOTAL_TICKS; tick += 1) {
    const time = tick / FIXED_HZ;
    const states = MARKERS.map((_, markerIndex) => markerStateAtTime(markerIndex, time, flowCase));
    if (tick > WARMUP_TICKS && tick <= MEASURE_END_TICK) {
      for (const state of states) {
        queryCount += 1;
        const values = [
          state.x,
          state.z,
          state.tangentAlignment,
          state.headingErrorDeg,
          state.laneError,
          state.lateral,
        ];
        if (values.some((value) => !finite(value))) nonFiniteCount += 1;
        alignments.push(state.tangentAlignment);
        headingErrors.push(state.headingErrorDeg);
        laneErrors.push(state.laneError);
        lateralDistances.push(Math.abs(state.lateral));
        forwardSpeeds.push(RIVER_CONFIG.flowSpeed * Math.max(0, state.tangentAlignment));
        if (state.inChannel) inChannelCount += 1;
        else bankExitCount += 1;
      }
    }
    if (tick === TOTAL_TICKS) terminalMarkers = states;
  }

  const metrics = {
    tangentAlignmentMean: mean(alignments),
    headingErrorP95Deg: percentile(headingErrors, 0.95),
    inChannelRate: inChannelCount / Math.max(1, queryCount),
    laneErrorRms: rms(laneErrors),
    forwardSpeedMean: mean(forwardSpeeds),
    lateralDistanceP95: percentile(lateralDistances, 0.95),
    bankExitCount,
    nonFiniteCount,
  };
  const resultDigest = hashObject(Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [key, quantize(value)]),
  ));
  const caseConfig = { ...COMMON_CONFIG, flowMode: flowCase.flowMode };
  const checks = {
    steps: TOTAL_TICKS === 1200,
    measuredTicks: MEASURED_TICKS === 960,
    queryCount: queryCount === MARKERS.length * MEASURED_TICKS,
    noNonFinite: nonFiniteCount === 0,
    resultFinite: Object.values(metrics).every(finite),
  };
  return {
    caseId: flowCase.caseId,
    label: flowCase.label,
    factor: 'flowMode',
    flowMode: flowCase.flowMode,
    contractHash: CONTRACT_HASH,
    caseConfigHash: hashObject(caseConfig),
    resultDigest,
    ticks: TOTAL_TICKS,
    measuredTicks: MEASURED_TICKS,
    queryCount,
    metrics,
    terminalMarkers: terminalMarkers.map((state) => ({
      id: state.marker.id,
      x: state.x,
      z: state.z,
      lateral: state.lateral,
      inChannel: state.inChannel,
    })),
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

export function runDeterministicAB() {
  const A = runDeterministicCase(FLOW_CASES.uniform);
  const B = runDeterministicCase(FLOW_CASES.guided);
  const improvements = {
    alignmentGain: B.metrics.tangentAlignmentMean - A.metrics.tangentAlignmentMean,
    headingErrorReduction: A.metrics.headingErrorP95Deg - B.metrics.headingErrorP95Deg,
    inChannelGain: B.metrics.inChannelRate - A.metrics.inChannelRate,
    laneErrorReduction: A.metrics.laneErrorRms - B.metrics.laneErrorRms,
  };
  const checks = {
    casesPassed: A.passed && B.passed,
    commonContract: A.contractHash === B.contractHash,
    distinctResolvedConfig: A.caseConfigHash !== B.caseConfigHash,
    uniformShowsTurnMismatch: A.metrics.headingErrorP95Deg >= 12,
    guidedAlignsToTangent: B.metrics.tangentAlignmentMean >= 0.995,
    guidedHeadingError: B.metrics.headingErrorP95Deg <= 5,
    guidedStaysInChannel: B.metrics.inChannelRate >= 0.995,
    guidedReducesBankExit: B.metrics.inChannelRate >= A.metrics.inChannelRate + 0.15,
    guidedReducesLaneError: B.metrics.laneErrorRms <= A.metrics.laneErrorRms * 0.35,
    noNumericalFailures: A.metrics.nonFiniteCount === 0 && B.metrics.nonFiniteCount === 0,
  };
  const passed = Object.values(checks).every(Boolean);
  return {
    schemaVersion: '1.0',
    modelVersion: MODEL_VERSION,
    factor: 'flowMode',
    contractHash: CONTRACT_HASH,
    A,
    B,
    improvements,
    checks,
    passed,
    boundedConclusion: passed
      ? '在 river-flowmap-v1 的固定弯曲河道与内部单位下，样条切线方向场 B 让视觉流向和漂浮标记更贴合河道切线，并减少离开河道的采样。'
      : '固定 A/B 尚未通过全部检查，不能形成方向场优劣结论。',
  };
}

export function inspectModelContract() {
  return {
    schemaVersion: '1.0',
    modelVersion: MODEL_VERSION,
    contractHash: CONTRACT_HASH,
    controlPointCount: CONTROL_POINTS.length,
    markerCount: MARKERS.length,
    pathLength: PATH_LENGTH,
    fixedHz: FIXED_HZ,
    totalTicks: TOTAL_TICKS,
    measuredTicks: MEASURED_TICKS,
    riverWidth: RIVER_CONFIG.width,
    flowSpeed: RIVER_CONFIG.flowSpeed,
    cases: FLOW_CASES,
  };
}

export function modelSelfCheck() {
  const start = evaluateCenterline(0);
  const end = evaluateCenterline(1);
  const middle = evaluateCenterline(0.5);
  const ab = runDeterministicAB();
  const checks = {
    endpoints: Math.hypot(start.x - CONTROL_POINTS[0].x, start.z - CONTROL_POINTS[0].z) < 1e-9
      && Math.hypot(end.x - CONTROL_POINTS.at(-1).x, end.z - CONTROL_POINTS.at(-1).z) < 1e-9,
    tangentsUnit: [start, middle, end].every((sample) => Math.abs(Math.hypot(sample.tangentX, sample.tangentZ) - 1) < 1e-9),
    pathLength: PATH_LENGTH > 60 && PATH_LENGTH < 100,
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
