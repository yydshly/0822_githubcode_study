export const MODEL_VERSION = 'ocean-gerstner-v1';
export const SEED = 601;
export const GRAVITY = 9.81;
export const FIXED_HZ = 60;
export const FIXED_DT = 1 / FIXED_HZ;
export const TOTAL_TICKS = 1200;
export const WARMUP_TICKS = 120;
export const MEASURE_END_TICK = 1080;
export const MEASURED_TICKS = MEASURE_END_TICK - WARMUP_TICKS;

export const SEA_STATES = Object.freeze({
  calm: Object.freeze({ id: 'calm', caseId: 'A', label: '平静海况', seaState: 0.25 }),
  wind: Object.freeze({ id: 'wind', caseId: 'B', label: '有风涌浪', seaState: 1.0 }),
});

export const WAVE_TABLE = Object.freeze([
  Object.freeze({ wavelength: 18.0, maxAmplitude: 0.380, angleDeg: -8, phase: 0.37, q: 0.75 }),
  Object.freeze({ wavelength: 11.0, maxAmplitude: 0.230, angleDeg: 5, phase: 2.11, q: 0.75 }),
  Object.freeze({ wavelength: 7.0, maxAmplitude: 0.140, angleDeg: 18, phase: 4.83, q: 0.75 }),
  Object.freeze({ wavelength: 4.5, maxAmplitude: 0.080, angleDeg: -22, phase: 1.29, q: 0.75 }),
  Object.freeze({ wavelength: 2.8, maxAmplitude: 0.045, angleDeg: 35, phase: 5.57, q: 0.75 }),
  Object.freeze({ wavelength: 1.6, maxAmplitude: 0.022, angleDeg: -40, phase: 3.46, q: 0.75 }),
]);

export const BOAT_CONFIG = Object.freeze({
  length: 3.2,
  width: 1.4,
  speed: 1.0,
  startX: 0,
  startZ: -12,
  yaw: 0,
  displayWaterlineOffset: 0.42,
  contacts: Object.freeze([
    Object.freeze({ id: 'bow-port', x: -0.70, z: 1.60 }),
    Object.freeze({ id: 'bow-starboard', x: 0.70, z: 1.60 }),
    Object.freeze({ id: 'stern-port', x: -0.70, z: -1.60 }),
    Object.freeze({ id: 'stern-starboard', x: 0.70, z: -1.60 }),
  ]),
});

const PROBE_OFFSETS = Object.freeze([-8, -4, 0, 4, 8]);
const resolvedCache = new Map();

function finite(value) {
  return Number.isFinite(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

export const COMMON_CONFIG = Object.freeze({
  modelVersion: MODEL_VERSION,
  seed: SEED,
  gravity: GRAVITY,
  fixedHz: FIXED_HZ,
  totalTicks: TOTAL_TICKS,
  warmupTicks: WARMUP_TICKS,
  measureEndTick: MEASURE_END_TICK,
  waveTable: WAVE_TABLE,
  boat: BOAT_CONFIG,
  probeOffsets: PROBE_OFFSETS,
});

export const CONTRACT_HASH = hashObject(COMMON_CONFIG);

export function resolveWaves(seaStateInput) {
  const seaState = typeof seaStateInput === 'string'
    ? SEA_STATES[seaStateInput]?.seaState
    : seaStateInput;
  if (!finite(seaState) || seaState < 0 || seaState > 1) {
    throw new Error(`Invalid seaState: ${seaStateInput}`);
  }
  if (resolvedCache.has(seaState)) return resolvedCache.get(seaState);

  const waves = WAVE_TABLE.map((source, index) => {
    const radians = source.angleDeg * Math.PI / 180;
    const directionX = Math.sin(radians);
    const directionZ = Math.cos(radians);
    const k = 2 * Math.PI / source.wavelength;
    const omega = Math.sqrt(GRAVITY * k);
    const amplitude = source.maxAmplitude * seaState;
    const steepness = source.q * k * amplitude;
    return Object.freeze({
      ...source,
      index,
      directionX,
      directionZ,
      k,
      omega,
      amplitude,
      steepness,
    });
  });

  const totalSteepness = waves.reduce((sum, wave) => sum + wave.steepness, 0);
  const maxSingleSteepness = Math.max(...waves.map((wave) => wave.steepness));
  const directionErrorMax = Math.max(...waves.map((wave) => Math.abs(Math.hypot(wave.directionX, wave.directionZ) - 1)));
  if (waves.some((wave) => wave.q < 0 || wave.q > 0.85)) throw new Error('Gerstner q outside safe contract');
  if (maxSingleSteepness > 0.12 + 1e-12) throw new Error('Single-wave steepness exceeds 0.12');
  if (totalSteepness > 0.55 + 1e-12) throw new Error('Total steepness exceeds 0.55');
  if (directionErrorMax > 1e-6) throw new Error('Wave direction is not normalized');

  const resolved = Object.freeze({
    seaState,
    waves: Object.freeze(waves),
    totalSteepness,
    maxSingleSteepness,
    directionErrorMax,
    maxVerticalEnvelope: waves.reduce((sum, wave) => sum + wave.amplitude, 0),
  });
  resolvedCache.set(seaState, resolved);
  return resolved;
}

function crossPvPu(pv, pu) {
  return [
    pv[1] * pu[2] - pv[2] * pu[1],
    pv[2] * pu[0] - pv[0] * pu[2],
    pv[0] * pu[1] - pv[1] * pu[0],
  ];
}

export function evaluateSurface(u, v, time, seaStateInput) {
  const resolved = resolveWaves(seaStateInput);
  let x = u;
  let y = 0;
  let z = v;
  const pu = [1, 0, 0];
  const pv = [0, 0, 1];

  for (const wave of resolved.waves) {
    const theta = wave.k * (wave.directionX * u + wave.directionZ * v) - wave.omega * time + wave.phase;
    const sine = Math.sin(theta);
    const cosine = Math.cos(theta);
    const qA = wave.q * wave.amplitude;
    const aK = wave.amplitude * wave.k;
    const qAK = qA * wave.k;
    const dx = wave.directionX;
    const dz = wave.directionZ;

    x += qA * dx * cosine;
    y += wave.amplitude * sine;
    z += qA * dz * cosine;

    pu[0] += -qAK * dx * dx * sine;
    pu[1] += aK * dx * cosine;
    pu[2] += -qAK * dx * dz * sine;
    pv[0] += -qAK * dx * dz * sine;
    pv[1] += aK * dz * cosine;
    pv[2] += -qAK * dz * dz * sine;
  }

  const rawNormal = crossPvPu(pv, pu);
  const rawLength = Math.hypot(rawNormal[0], rawNormal[1], rawNormal[2]);
  const safeLength = rawLength > 1e-12 ? rawLength : 1;
  const normal = rawNormal.map((component) => component / safeLength);
  const normalLengthError = Math.abs(Math.hypot(...normal) - 1);
  const detJ = pu[0] * pv[2] - pv[0] * pu[2];

  return {
    position: [x, y, z],
    pu,
    pv,
    normal,
    detJ,
    normalLengthError,
    totalSteepness: resolved.totalSteepness,
  };
}

export function sampleSurfaceAtWorldXZ(worldX, worldZ, time, seaStateInput) {
  let u = worldX;
  let v = worldZ;
  let current = null;
  let failed = false;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    current = evaluateSurface(u, v, time, seaStateInput);
    const residualX = current.position[0] - worldX;
    const residualZ = current.position[2] - worldZ;
    const det = current.detJ;
    if (!finite(det) || Math.abs(det) < 0.2) {
      failed = true;
      break;
    }
    const deltaU = (residualX * current.pv[2] - current.pv[0] * residualZ) / det;
    const deltaV = (current.pu[0] * residualZ - residualX * current.pu[2]) / det;
    u -= deltaU;
    v -= deltaV;
  }

  current = evaluateSurface(u, v, time, seaStateInput);
  const residual = Math.hypot(current.position[0] - worldX, current.position[2] - worldZ);
  const values = [u, v, residual, current.detJ, ...current.position, ...current.normal];
  const nonFinite = values.some((value) => !finite(value));
  const valid = !failed && !nonFinite && current.detJ >= 0.2 && residual <= 1e-3 && current.normal[1] > 0;

  return {
    ...current,
    u,
    v,
    residual,
    valid,
    nonFinite,
  };
}

export function sampleSurfaceKinematicsAtWorldXZ(
  worldX,
  worldZ,
  time,
  seaStateInput,
  sampleDt = 1 / 120,
) {
  if (![worldX, worldZ, time, sampleDt].every(finite) || time < 0 || sampleDt <= 0) {
    throw new Error('Surface kinematics require finite coordinates, non-negative time, and positive sampleDt.');
  }
  const beforeTime = Math.max(0, time - sampleDt);
  const afterTime = time + sampleDt;
  const before = sampleSurfaceAtWorldXZ(worldX, worldZ, beforeTime, seaStateInput);
  const current = sampleSurfaceAtWorldXZ(worldX, worldZ, time, seaStateInput);
  const after = sampleSurfaceAtWorldXZ(worldX, worldZ, afterTime, seaStateInput);
  const duration = afterTime - beforeTime;
  const verticalVelocity = (after.position[1] - before.position[1]) / duration;
  return {
    ...current,
    sampleDt,
    verticalVelocity,
    kinematicsValid: current.valid && before.valid && after.valid && finite(verticalVelocity),
  };
}

export function boatCenterAtTime(time) {
  return {
    x: BOAT_CONFIG.startX,
    z: BOAT_CONFIG.startZ + BOAT_CONFIG.speed * time,
  };
}

export function sampleBoat(time, seaStateInput) {
  const center = boatCenterAtTime(time);
  const cosine = Math.cos(BOAT_CONFIG.yaw);
  const sine = Math.sin(BOAT_CONFIG.yaw);
  const contacts = BOAT_CONFIG.contacts.map((contact) => {
    const worldX = center.x + contact.x * cosine + contact.z * sine;
    const worldZ = center.z - contact.x * sine + contact.z * cosine;
    const surface = sampleSurfaceAtWorldXZ(worldX, worldZ, time, seaStateInput);
    return { ...contact, worldX, worldZ, surface };
  });

  const [bowPort, bowStarboard, sternPort, sternStarboard] = contacts;
  const bow = (bowPort.surface.position[1] + bowStarboard.surface.position[1]) * 0.5;
  const stern = (sternPort.surface.position[1] + sternStarboard.surface.position[1]) * 0.5;
  const port = (bowPort.surface.position[1] + sternPort.surface.position[1]) * 0.5;
  const starboard = (bowStarboard.surface.position[1] + sternStarboard.surface.position[1]) * 0.5;
  const heave = contacts.reduce((sum, contact) => sum + contact.surface.position[1], 0) / contacts.length;
  const pitch = Math.atan2(bow - stern, BOAT_CONFIG.length);
  const roll = Math.atan2(starboard - port, BOAT_CONFIG.width);
  const inverseFailCount = contacts.filter((contact) => !contact.surface.valid).length;
  const nonFiniteCount = contacts.reduce((count, contact) => count + (contact.surface.nonFinite ? 1 : 0), 0);

  return {
    center,
    contacts,
    bow,
    stern,
    port,
    starboard,
    heave,
    pitch,
    roll,
    inverseFailCount,
    nonFiniteCount,
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

function centeredRms(values) {
  if (!values.length) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

function quantize(value) {
  return Math.round(value * 1e6) / 1e6;
}

function finiteCount(values) {
  return values.reduce((count, value) => count + (finite(value) ? 0 : 1), 0);
}

export function runDeterministicCase(caseInput) {
  const sea = typeof caseInput === 'string' ? SEA_STATES[caseInput] : caseInput;
  if (!sea) throw new Error(`Unknown sea case: ${caseInput}`);
  const resolved = resolveWaves(sea.seaState);
  const fieldHeights = [];
  const fieldSlopes = [];
  const heaves = [];
  const rolls = [];
  const pitches = [];
  const residuals = [];
  let inverseFailCount = 0;
  let nonFiniteCount = 0;
  let minJacobianDet = Infinity;
  let normalLengthErrorMax = 0;
  let fieldQueryCount = 0;
  let measuredTicks = 0;
  let terminalBoat = null;

  for (let tick = 1; tick <= TOTAL_TICKS; tick += 1) {
    const time = tick * FIXED_DT;
    const boat = sampleBoat(time, sea.seaState);
    terminalBoat = boat;
    inverseFailCount += boat.inverseFailCount;
    nonFiniteCount += boat.nonFiniteCount;
    for (const contact of boat.contacts) {
      residuals.push(contact.surface.residual);
      minJacobianDet = Math.min(minJacobianDet, contact.surface.detJ);
      normalLengthErrorMax = Math.max(normalLengthErrorMax, contact.surface.normalLengthError);
    }

    if (tick <= WARMUP_TICKS || tick > MEASURE_END_TICK) continue;
    measuredTicks += 1;
    heaves.push(boat.heave);
    rolls.push(boat.roll);
    pitches.push(boat.pitch);

    for (const offsetX of PROBE_OFFSETS) {
      for (const offsetZ of PROBE_OFFSETS) {
        const sample = sampleSurfaceAtWorldXZ(
          boat.center.x + offsetX,
          boat.center.z + offsetZ,
          time,
          sea.seaState,
        );
        fieldQueryCount += 1;
        fieldHeights.push(sample.position[1]);
        fieldSlopes.push(Math.hypot(sample.normal[0], sample.normal[2]) / Math.max(sample.normal[1], 1e-8));
        residuals.push(sample.residual);
        minJacobianDet = Math.min(minJacobianDet, sample.detJ);
        normalLengthErrorMax = Math.max(normalLengthErrorMax, sample.normalLengthError);
        inverseFailCount += sample.valid ? 0 : 1;
        nonFiniteCount += sample.nonFinite ? 1 : 0;
      }
    }
  }

  const heightMean = mean(fieldHeights);
  const heightCentered = fieldHeights.map((value) => value - heightMean);
  nonFiniteCount += finiteCount([
    heightMean,
    ...fieldHeights,
    ...fieldSlopes,
    ...heaves,
    ...rolls,
    ...pitches,
    ...residuals,
    minJacobianDet,
    normalLengthErrorMax,
  ]);

  const metrics = {
    heightMean,
    heightStd: centeredRms(fieldHeights),
    crestP95: percentile(heightCentered, 0.95),
    slopeP95: percentile(fieldSlopes, 0.95),
    heaveRms: centeredRms(heaves),
    rollRmsDeg: centeredRms(rolls) * 180 / Math.PI,
    pitchRmsDeg: centeredRms(pitches) * 180 / Math.PI,
    inverseResidualP95: percentile(residuals, 0.95),
    inverseResidualMax: Math.max(...residuals),
    minJacobianDet,
    normalLengthErrorMax,
    inverseFailCount,
    nonFiniteCount,
  };
  metrics.poseRmsDeg = Math.hypot(metrics.rollRmsDeg, metrics.pitchRmsDeg);

  const terminal = {
    time: TOTAL_TICKS * FIXED_DT,
    boatHeave: terminalBoat.heave,
    boatRollDeg: terminalBoat.roll * 180 / Math.PI,
    boatPitchDeg: terminalBoat.pitch * 180 / Math.PI,
    contactHeights: terminalBoat.contacts.map((contact) => contact.surface.position[1]),
  };
  const digestMetrics = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, quantize(value)]));
  const caseConfig = { ...COMMON_CONFIG, caseId: sea.caseId, seaState: sea.seaState };
  const checks = {
    steps: TOTAL_TICKS === 1200,
    measuredTicks: measuredTicks === MEASURED_TICKS,
    fieldQueryCount: fieldQueryCount === 25 * MEASURED_TICKS,
    noNonFinite: nonFiniteCount === 0,
    inverseSolved: inverseFailCount === 0,
    inverseResidual: metrics.inverseResidualMax <= 1e-3,
    jacobianMargin: metrics.minJacobianDet >= 0.2,
    normalsUnit: metrics.normalLengthErrorMax <= 1e-5,
    steepnessSafe: resolved.totalSteepness <= 0.55 && resolved.maxSingleSteepness <= 0.12,
  };

  return {
    caseId: sea.caseId,
    label: sea.label,
    seaState: sea.seaState,
    contractHash: CONTRACT_HASH,
    caseConfigHash: hashObject(caseConfig),
    resultDigest: hashObject(digestMetrics),
    resolved: {
      amplitudeScale: sea.seaState,
      totalSteepness: resolved.totalSteepness,
      maxVerticalEnvelope: resolved.maxVerticalEnvelope,
      waveCount: resolved.waves.length,
    },
    ticks: TOTAL_TICKS,
    measuredTicks,
    fieldQueryCount,
    metrics,
    terminal,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

function ratio(numerator, denominator) {
  return denominator === 0 ? (numerator === 0 ? 1 : Infinity) : numerator / denominator;
}

export function runDeterministicAB() {
  const A = runDeterministicCase('calm');
  const B = runDeterministicCase('wind');
  const ratios = {
    heightStd: ratio(B.metrics.heightStd, A.metrics.heightStd),
    crestP95: ratio(B.metrics.crestP95, A.metrics.crestP95),
    slopeP95: ratio(B.metrics.slopeP95, A.metrics.slopeP95),
    heaveRms: ratio(B.metrics.heaveRms, A.metrics.heaveRms),
    poseRmsDeg: ratio(B.metrics.poseRmsDeg, A.metrics.poseRmsDeg),
  };
  const checks = {
    casesPassed: A.passed && B.passed,
    commonContract: A.contractHash === B.contractHash,
    distinctResolvedConfig: A.caseConfigHash !== B.caseConfigHash,
    heightDifference: ratios.heightStd >= 2.8,
    crestDifference: ratios.crestP95 >= 2.5,
    slopeDifference: ratios.slopeP95 >= 2.0,
    heaveDifference: ratios.heaveRms >= 2.0,
    poseDifference: ratios.poseRmsDeg >= 1.5,
  };
  return {
    schemaVersion: '1.0',
    modelVersion: MODEL_VERSION,
    factor: 'seaState',
    contractHash: CONTRACT_HASH,
    A,
    B,
    ratios,
    checks,
    passed: Object.values(checks).every(Boolean),
    boundedConclusion: Object.values(checks).every(Boolean)
      ? '在 ocean-gerstner-v1 的固定输入与内部单位下，有风涌浪 B 产生了更高的水面变化和船体姿态运动量。'
      : '当前固定 A/B 尚未形成全部预注册差异，不能进入下一技术门。',
  };
}

export function inspectModelContract() {
  const calm = resolveWaves('calm');
  const wind = resolveWaves('wind');
  return {
    modelVersion: MODEL_VERSION,
    contractHash: CONTRACT_HASH,
    waveCount: WAVE_TABLE.length,
    fixedHz: FIXED_HZ,
    totalTicks: TOTAL_TICKS,
    measuredTicks: MEASURED_TICKS,
    seaStates: {
      calm: { ...SEA_STATES.calm, totalSteepness: calm.totalSteepness, maxVerticalEnvelope: calm.maxVerticalEnvelope },
      wind: { ...SEA_STATES.wind, totalSteepness: wind.totalSteepness, maxVerticalEnvelope: wind.maxVerticalEnvelope },
    },
  };
}

export function modelSelfCheck() {
  const flat = evaluateSurface(3, -2, 1.5, 0);
  const flatChecks = {
    flatPosition: Math.abs(flat.position[0] - 3) < 1e-12 && Math.abs(flat.position[1]) < 1e-12 && Math.abs(flat.position[2] + 2) < 1e-12,
    flatNormal: Math.abs(flat.normal[0]) < 1e-12 && Math.abs(flat.normal[1] - 1) < 1e-12 && Math.abs(flat.normal[2]) < 1e-12,
    flatJacobian: Math.abs(flat.detJ - 1) < 1e-12,
  };
  const ab = runDeterministicAB();
  return {
    flatChecks,
    ab,
    passed: Object.values(flatChecks).every(Boolean) && ab.passed,
  };
}

export function formatModelNumber(value, digits = 3) {
  return finite(value) ? value.toFixed(digits) : '—';
}

export function clampTick(tick) {
  return clamp(Math.round(tick), 0, TOTAL_TICKS);
}
