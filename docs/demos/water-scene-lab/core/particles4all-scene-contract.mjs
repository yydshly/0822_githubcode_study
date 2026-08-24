export const PARTICLES4ALL_SCENE_SCHEMA = 'water-scene.particles4all-near-field/v1';

function finiteNumber(value, path, { minimum = -Infinity, exclusiveMinimum = false } = {}) {
  const number = Number(value);
  const invalidMinimum = exclusiveMinimum ? number <= minimum : number < minimum;
  if (!Number.isFinite(number) || invalidMinimum) {
    throw new TypeError(`${path} must be a finite number${Number.isFinite(minimum) ? ` above ${minimum}` : ''}`);
  }
  return number;
}

function positiveInteger(value, path) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${path} must be a positive integer`);
  return value;
}

function vector3(value, path, { normalized = false } = {}) {
  const vector = Array.from(value || []);
  if (vector.length !== 3) throw new TypeError(`${path} must contain three numbers`);
  return vector.map((item, index) => {
    const number = finiteNumber(item, `${path}[${index}]`);
    if (normalized && (number < 0 || number > 1)) {
      throw new RangeError(`${path}[${index}] must be between 0 and 1`);
    }
    return number;
  });
}

function requiredString(value, path) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateEmitter(emitter, index, ids) {
  const path = `scenario.emitters[${index}]`;
  const id = requiredString(emitter?.id, `${path}.id`);
  if (ids.has(id)) throw new TypeError(`duplicate emitter id: ${id}`);
  ids.add(id);
  if (emitter.type !== 'fluid-block') throw new TypeError(`${path}.type must be fluid-block`);
  if (!Number.isInteger(emitter.tick) || emitter.tick < 0) throw new TypeError(`${path}.tick must be a non-negative integer`);
  if (emitter.origin?.space !== 'box-normalized') {
    throw new TypeError(`${path}.origin.space must be box-normalized`);
  }
  vector3(emitter.origin.value, `${path}.origin.value`, { normalized: true });
  vector3(emitter.velocity, `${path}.velocity`);
  const counts = Array.from(emitter.counts || []);
  if (counts.length !== 3) throw new TypeError(`${path}.counts must contain three integers`);
  counts.forEach((value, axis) => positiveInteger(value, `${path}.counts[${axis}]`));
  if (emitter.spacing?.source !== 'runtime-spacing') {
    throw new TypeError(`${path}.spacing.source must be runtime-spacing`);
  }
  finiteNumber(emitter.spacing.multiplier, `${path}.spacing.multiplier`, { minimum: 0, exclusiveMinimum: true });
}

export function validateParticles4AllSceneContract(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('scene contract must be an object');
  if (input.schema !== PARTICLES4ALL_SCENE_SCHEMA) throw new TypeError(`schema must be ${PARTICLES4ALL_SCENE_SCHEMA}`);
  requiredString(input.id, 'id');
  positiveInteger(input.revision, 'revision');
  requiredString(input.title, 'title');
  requiredString(input.sceneKind, 'sceneKind');
  if (input.targetPlatform !== 'desktop-browser') throw new TypeError('targetPlatform must be desktop-browser');

  if (input.macroLayer?.role !== 'world-scale-water-representation') {
    throw new TypeError('macroLayer.role must be world-scale-water-representation');
  }
  requiredString(input.macroLayer.capability, 'macroLayer.capability');
  requiredString(input.macroLayer.modelVersion, 'macroLayer.modelVersion');
  requiredString(input.macroLayer.contractHash, 'macroLayer.contractHash');

  if (input.localPhysics?.provider !== 'Particles4All') throw new TypeError('localPhysics.provider must be Particles4All');
  if (input.localPhysics?.adapter !== 'Particles4AllRuntimeAdapter') {
    throw new TypeError('localPhysics.adapter must be Particles4AllRuntimeAdapter');
  }
  const engineQuery = requiredString(input.localPhysics.engineQuery, 'localPhysics.engineQuery');
  if (engineQuery.startsWith('?')) throw new TypeError('localPhysics.engineQuery must not start with ?');
  const body = input.localPhysics.body;
  if (!['sphere', 'torus', 'box'].includes(body?.shape)) {
    throw new TypeError('localPhysics.body.shape must be sphere, torus, or box');
  }
  const bodyDensity = finiteNumber(body.density, 'localPhysics.body.density', { minimum: 0, exclusiveMinimum: true });
  const bodyStartY = finiteNumber(body.startY, 'localPhysics.body.startY', { minimum: 0 });
  if (bodyStartY > 1) throw new RangeError('localPhysics.body.startY must be between 0 and 1');
  const bodySize = finiteNumber(body.size, 'localPhysics.body.size', { minimum: 0, exclusiveMinimum: true });
  requiredString(body.sceneRole, 'localPhysics.body.sceneRole');
  const query = new URLSearchParams(engineQuery);
  const bodyBits = (query.get('body') || '').split(':');
  if (bodyBits.length !== 3 || bodyBits[0] !== body.shape ||
      Math.abs(Number(bodyBits[1]) - bodyDensity) > 1e-12 ||
      Math.abs(Number(bodyBits[2]) - bodyStartY) > 1e-12) {
    throw new TypeError('localPhysics.body must match the engineQuery body parameter');
  }
  if (Math.abs(Number(query.get('bodysize')) - bodySize) > 1e-12) {
    throw new TypeError('localPhysics.body.size must match the engineQuery bodysize parameter');
  }
  if (input.localPhysics.loading?.mode !== 'lazy-on-demand') {
    throw new TypeError('localPhysics.loading.mode must be lazy-on-demand');
  }
  if (input.localPhysics.loading.unloadable !== true) throw new TypeError('localPhysics.loading.unloadable must be true');

  requiredString(input.mapping?.world?.driver, 'mapping.world.driver');
  const worldParameters = input.mapping?.world?.parameters;
  if (!worldParameters || typeof worldParameters !== 'object' || Array.isArray(worldParameters) ||
      Object.keys(worldParameters).length < 1) {
    throw new TypeError('mapping.world.parameters must be a non-empty object');
  }
  Object.entries(worldParameters).forEach(([key, value]) =>
    finiteNumber(value, `mapping.world.parameters.${key}`));
  finiteNumber(input.mapping?.solver?.velocityScale, 'mapping.solver.velocityScale', { minimum: 0, exclusiveMinimum: true });
  requiredString(input.mapping?.solver?.frame, 'mapping.solver.frame');
  requiredString(input.mapping?.truth?.crossScale, 'mapping.truth.crossScale');
  requiredString(input.mapping?.truth?.local, 'mapping.truth.local');

  if (input.scenario?.reset !== true) throw new TypeError('scenario.reset must be true for reproducible evidence');
  positiveInteger(input.scenario.ticks, 'scenario.ticks');
  const comparisonMode = input.scenario.comparison?.mode;
  if (comparisonMode != null && comparisonMode !== 'no-injection-baseline') {
    throw new TypeError('scenario.comparison.mode must be no-injection-baseline when provided');
  }
  if (!Array.isArray(input.scenario.emitters) || input.scenario.emitters.length < 1) {
    throw new TypeError('scenario.emitters must contain at least one emitter');
  }
  const emitterIds = new Set();
  input.scenario.emitters.forEach((emitter, index) => validateEmitter(emitter, index, emitterIds));
  if (input.scenario.emitters.some(emitter => emitter.tick > input.scenario.ticks)) {
    throw new RangeError('emitter tick must not exceed scenario.ticks');
  }

  const region = input.scenario.probe?.interactionRegion;
  if (region?.center?.space !== 'box-normalized') {
    throw new TypeError('scenario.probe.interactionRegion.center.space must be box-normalized');
  }
  const center = Array.from(region.center.value || []);
  if (center.length !== 2) throw new TypeError('interactionRegion.center.value must contain normalized x/z');
  center.forEach((value, index) => {
    const number = finiteNumber(value, `interactionRegion.center.value[${index}]`);
    if (number < 0 || number > 1) throw new RangeError('interactionRegion center must be normalized');
  });
  if (region.radius?.space !== 'solver-unit') throw new TypeError('interactionRegion.radius.space must be solver-unit');
  finiteNumber(region.radius.value, 'interactionRegion.radius.value', { minimum: 0, exclusiveMinimum: true });
  if (region.minimumY?.space !== 'solver-unit') throw new TypeError('interactionRegion.minimumY.space must be solver-unit');
  finiteNumber(region.minimumY.value, 'interactionRegion.minimumY.value');

  const acceptance = input.acceptance;
  positiveInteger(acceptance?.requiredInjectedParticles, 'acceptance.requiredInjectedParticles');
  positiveInteger(acceptance?.requiredTicks, 'acceptance.requiredTicks');
  if (!Number.isInteger(acceptance?.maximumNonFinitePositions) || acceptance.maximumNonFinitePositions < 0) {
    throw new TypeError('acceptance.maximumNonFinitePositions must be a non-negative integer');
  }
  finiteNumber(acceptance.minimumBodyDisplacement, 'acceptance.minimumBodyDisplacement', { minimum: 0 });
  const displacementAxis = vector3(acceptance.bodyDisplacementAxis, 'acceptance.bodyDisplacementAxis');
  const axisLength = Math.hypot(...displacementAxis);
  if (Math.abs(axisLength - 1) > 1e-6) throw new TypeError('acceptance.bodyDisplacementAxis must be normalized');
  finiteNumber(acceptance.minimumBodyDisplacementAlongAxis,
    'acceptance.minimumBodyDisplacementAlongAxis', { minimum: 0 });
  if (acceptance.minimumBodyRotationDegrees != null) {
    finiteNumber(acceptance.minimumBodyRotationDegrees,
      'acceptance.minimumBodyRotationDegrees', { minimum: 0 });
  }
  const responseMode = acceptance.directionalResponseMode || 'absolute';
  if (!['absolute', 'baseline-delta'].includes(responseMode)) {
    throw new TypeError('acceptance.directionalResponseMode must be absolute or baseline-delta');
  }
  if (responseMode === 'baseline-delta') {
    if (comparisonMode !== 'no-injection-baseline') {
      throw new TypeError('baseline-delta response requires a no-injection-baseline comparison');
    }
    finiteNumber(acceptance.minimumBodyDisplacementDeltaAlongAxis,
      'acceptance.minimumBodyDisplacementDeltaAlongAxis', { minimum: 0 });
  }
  if (acceptance.requireWebGpuContext !== true) throw new TypeError('acceptance.requireWebGpuContext must be true');
  if (acceptance.requiredTicks !== input.scenario.ticks) {
    throw new TypeError('acceptance.requiredTicks must equal scenario.ticks');
  }
  const particleCount = input.scenario.emitters.reduce((sum, emitter) =>
    sum + emitter.counts.reduce((product, value) => product * value, 1), 0);
  if (acceptance.requiredInjectedParticles !== particleCount) {
    throw new TypeError('acceptance.requiredInjectedParticles must equal the configured emitter particle total');
  }
  return true;
}

export function createParticles4AllSceneContract(input) {
  const contract = plainClone(input);
  validateParticles4AllSceneContract(contract);
  return deepFreeze(contract);
}

export function hashParticles4AllSceneContract(contract) {
  validateParticles4AllSceneContract(contract);
  const input = canonicalize(contract);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function serializeParticles4AllSceneContract(contract) {
  validateParticles4AllSceneContract(contract);
  return `${JSON.stringify(contract, null, 2)}\n`;
}

export function parseParticles4AllSceneContract(serialized) {
  if (typeof serialized !== 'string') throw new TypeError('serialized scene contract must be a string');
  return createParticles4AllSceneContract(JSON.parse(serialized));
}

export function compileParticles4AllScenePlan(contract, runtime) {
  validateParticles4AllSceneContract(contract);
  const box = vector3(runtime?.box, 'runtime.box');
  const spacing = finiteNumber(runtime?.spacing, 'runtime.spacing', { minimum: 0, exclusiveMinimum: true });
  const packets = contract.scenario.emitters.map(emitter => ({
    id: emitter.id,
    tick: emitter.tick,
    config: {
      origin: emitter.origin.value.map((value, axis) => value * box[axis]),
      counts: [...emitter.counts],
      spacing: spacing * emitter.spacing.multiplier,
      velocity: [...emitter.velocity],
    },
  }));
  const region = contract.scenario.probe.interactionRegion;
  return {
    schema: contract.schema,
    sceneId: contract.id,
    sceneContractHash: hashParticles4AllSceneContract(contract),
    engineQuery: contract.localPhysics.engineQuery,
    runtimeBox: [...box],
    reset: contract.scenario.reset,
    ticks: contract.scenario.ticks,
    packets,
    interactionRegion: {
      center: [region.center.value[0] * box[0], region.center.value[1] * box[2]],
      radius: region.radius.value,
      minimumY: region.minimumY.value,
    },
  };
}

function bodyDisplacement(initialBodies, finalBodies, axis) {
  const initialById = new Map((initialBodies || []).map(body => [body.id, body]));
  let best = null;
  for (const body of finalBodies || []) {
    const initial = initialById.get(body.id);
    if (!initial) continue;
    const vector = [
      body.pose.centre[0] - initial.pose.centre[0],
      body.pose.centre[1] - initial.pose.centre[1],
      body.pose.centre[2] - initial.pose.centre[2],
    ];
    const magnitude = Math.hypot(...vector);
    const alongAxis = vector.reduce((sum, value, index) => sum + value * axis[index], 0);
    const initialRotation = Array.from(initial.pose?.rot || []);
    const finalRotation = Array.from(body.pose?.rot || []);
    let rotationDegrees = null;
    if (initialRotation.length === 9 && finalRotation.length === 9 &&
        [...initialRotation, ...finalRotation].every(Number.isFinite)) {
      const frobenius = initialRotation.reduce((sum, value, index) => sum + value * finalRotation[index], 0);
      const cosine = Math.max(-1, Math.min(1, (frobenius - 1) * 0.5));
      rotationDegrees = Math.acos(cosine) * 180 / Math.PI;
    }
    if (!best || alongAxis > best.alongAxis) {
      best = { bodyId: body.id, vector, magnitude, alongAxis, rotationDegrees };
    }
  }
  return best;
}

export function evaluateParticles4AllSceneEvidence(contract, plan, evidence) {
  validateParticles4AllSceneContract(contract);
  const positions = evidence.sampled?.positions || [];
  const phases = evidence.sampled?.phases || [];
  const particleCount = evidence.sampled?.summary?.particleCount || 0;
  let nonFinite = 0;
  let localImpactCount = 0;
  const elevatedBinCount = 12;
  const elevatedBins = new Array(elevatedBinCount).fill(0);
  let elevatedHighestY = null;
  let elevatedLowestY = null;
  let elevatedMinimumX = null;
  let elevatedMaximumX = null;
  let elevatedMinimumZ = null;
  let elevatedMaximumZ = null;
  const elevatedMinimumY = plan.interactionRegion.minimumY;
  const elevatedMaximumY = plan.runtimeBox?.[1] ?? elevatedMinimumY + 1;
  const elevatedSpan = Math.max(1e-9, elevatedMaximumY - elevatedMinimumY);
  for (let index = 0; index < particleCount; index += 1) {
    if (phases[index * 4] !== 0) continue;
    const x = positions[index * 4];
    const y = positions[index * 4 + 1];
    const z = positions[index * 4 + 2];
    if (![x, y, z].every(Number.isFinite)) nonFinite += 1;
    else if (Math.hypot(x - plan.interactionRegion.center[0], z - plan.interactionRegion.center[1]) <= plan.interactionRegion.radius &&
      y >= plan.interactionRegion.minimumY) {
      localImpactCount += 1;
      const bin = Math.max(0, Math.min(elevatedBinCount - 1,
        Math.floor((y - elevatedMinimumY) / elevatedSpan * elevatedBinCount)));
      elevatedBins[bin] += 1;
      elevatedHighestY = elevatedHighestY == null ? y : Math.max(elevatedHighestY, y);
      elevatedLowestY = elevatedLowestY == null ? y : Math.min(elevatedLowestY, y);
      elevatedMinimumX = elevatedMinimumX == null ? x : Math.min(elevatedMinimumX, x);
      elevatedMaximumX = elevatedMaximumX == null ? x : Math.max(elevatedMaximumX, x);
      elevatedMinimumZ = elevatedMinimumZ == null ? z : Math.min(elevatedMinimumZ, z);
      elevatedMaximumZ = elevatedMaximumZ == null ? z : Math.max(elevatedMaximumZ, z);
    }
  }

  const displacement = bodyDisplacement(
    evidence.initialBodies?.bodies,
    evidence.finalBodies?.bodies,
    contract.acceptance.bodyDisplacementAxis,
  );
  const runtimeBody = evidence.initialBodies?.bodies?.[0] || null;
  const configuredBody = contract.localPhysics.body;
  const runtimeBodyProfile = runtimeBody == null ? null : {
    id: runtimeBody.id,
    shape: runtimeBody.shape,
    density: runtimeBody.density,
    size: runtimeBody.size,
    sceneRole: configuredBody.sceneRole,
  };
  const baselineDisplacement = evidence.baseline?.displacement || null;
  const displacementDeltaAlongAxis = displacement != null && baselineDisplacement != null
    ? displacement.alongAxis - baselineDisplacement.alongAxis
    : null;
  const injectionRecords = evidence.schedule.history
    .filter(event => event.type === 'injectFluid')
    .map(event => event.result);
  const injection = injectionRecords.reduce((summary, item) => ({
    requested: summary.requested + item.requested,
    added: summary.added + item.added,
    before: summary.before ?? item.before,
    after: item.after,
    capacity: item.capacity,
    availableBefore: summary.availableBefore ?? item.availableBefore,
    clamped: summary.clamped || item.clamped,
  }), { requested: 0, added: 0, before: null, after: null, capacity: null, availableBefore: null, clamped: false });
  const acceptance = contract.acceptance;
  const checks = {
    injectedParticles: injection.requested === acceptance.requiredInjectedParticles &&
      injection.added === acceptance.requiredInjectedParticles && !injection.clamped,
    solverTicks: evidence.schedule.requestedTicks === acceptance.requiredTicks &&
      evidence.schedule.actualTicks === acceptance.requiredTicks,
    finitePositions: nonFinite <= acceptance.maximumNonFinitePositions,
    bodyProfile: runtimeBody != null && runtimeBody.shape === configuredBody.shape &&
      Math.abs(runtimeBody.density - configuredBody.density) <= 1e-12 &&
      Math.abs(runtimeBody.size - configuredBody.size) <= 1e-12,
    rigidResponse: displacement != null && displacement.magnitude >= acceptance.minimumBodyDisplacement,
    directionalRigidResponse: acceptance.directionalResponseMode === 'baseline-delta'
      ? displacementDeltaAlongAxis != null &&
        displacementDeltaAlongAxis >= acceptance.minimumBodyDisplacementDeltaAlongAxis
      : displacement != null && displacement.alongAxis >= acceptance.minimumBodyDisplacementAlongAxis,
    webGpuContext: !acceptance.requireWebGpuContext || evidence.environment.webgpuContext === true,
  };
  if (acceptance.minimumBodyRotationDegrees != null) {
    checks.rigidRotationResponse = displacement?.rotationDegrees != null &&
      displacement.rotationDegrees >= acceptance.minimumBodyRotationDegrees;
  }
  return {
    injection,
    nonFinite,
    localImpactCount,
    elevatedFluidProfile: {
      binCount: elevatedBinCount,
      bins: elevatedBins,
      occupiedBins: elevatedBins.filter(count => count > 0).length,
      coverageRatio: elevatedBins.filter(count => count > 0).length / elevatedBinCount,
      particleCount: elevatedBins.reduce((sum, count) => sum + count, 0),
      lowestY: elevatedLowestY,
      highestY: elevatedHighestY,
      minimumX: elevatedMinimumX,
      maximumX: elevatedMaximumX,
      spanX: elevatedMinimumX == null ? null : elevatedMaximumX - elevatedMinimumX,
      minimumZ: elevatedMinimumZ,
      maximumZ: elevatedMaximumZ,
      spanZ: elevatedMinimumZ == null ? null : elevatedMaximumZ - elevatedMinimumZ,
      minimumY: elevatedMinimumY,
      maximumY: elevatedMaximumY,
    },
    bodyDisplacement: displacement?.magnitude ?? null,
    bodyDisplacementVector: displacement?.vector ?? null,
    bodyDisplacementAlongAxis: displacement?.alongAxis ?? null,
    bodyRotationDegrees: displacement?.rotationDegrees ?? null,
    baselineBodyDisplacement: baselineDisplacement?.magnitude ?? null,
    baselineBodyDisplacementAlongAxis: baselineDisplacement?.alongAxis ?? null,
    bodyDisplacementDeltaAlongAxis: displacementDeltaAlongAxis,
    bodyId: displacement?.bodyId ?? null,
    bodyProfile: runtimeBodyProfile,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

export async function runParticles4AllScene(adapter, contract) {
  validateParticles4AllSceneContract(contract);
  await adapter.connect();
  let baseline = null;
  if (contract.scenario.comparison?.mode === 'no-injection-baseline') {
    await adapter.reset();
    const baselineInitialBodies = await adapter.sampleBodies();
    await adapter.step(contract.scenario.ticks);
    const baselineFinalBodies = await adapter.sampleBodies();
    baseline = {
      mode: contract.scenario.comparison.mode,
      displacement: bodyDisplacement(
        baselineInitialBodies?.bodies,
        baselineFinalBodies?.bodies,
        contract.acceptance.bodyDisplacementAxis,
      ),
    };
  }
  const initial = await adapter.reset();
  const initialBodies = await adapter.sampleBodies();
  const sim = adapter.window.__sim;
  const plan = compileParticles4AllScenePlan(contract, {
    box: sim.params.box,
    spacing: sim.params.spacing,
  });
  const events = plan.packets.map(packet => ({
    id: packet.id,
    type: 'injectFluid',
    tick: packet.tick,
    payload: adapter.createFluidBlock(packet.config),
  }));
  const schedule = await adapter.runSchedule({ ticks: plan.ticks, events, reset: false });
  const sampled = await adapter.sample({ positions: true, phases: true });
  const finalBodies = await adapter.sampleBodies();
  const environment = {
    adapterLabel: adapter.window.document.querySelector('#adapter')?.textContent || null,
    webgpuContext: Boolean(adapter.window.document.querySelector('canvas#view')?.getContext('webgpu')),
  };
  const evaluation = evaluateParticles4AllSceneEvidence(contract, plan, {
    initialBodies,
    finalBodies,
    schedule,
    sampled,
    environment,
    baseline,
  });
  return {
    bridgeVersion: 'particles4all-scene-runner-v1',
    sceneContract: {
      schema: contract.schema,
      id: contract.id,
      revision: contract.revision,
      hash: plan.sceneContractHash,
    },
    mapping: {
      worldDriver: contract.mapping.world.driver,
      ...contract.mapping.world.parameters,
      solverVelocity: [...contract.scenario.emitters[0].velocity],
      velocityScale: contract.mapping.solver.velocityScale,
      solverFrame: contract.mapping.solver.frame,
      crossScaleTruthLevel: contract.mapping.truth.crossScale,
      localTruthLevel: contract.mapping.truth.local,
    },
    environment,
    initial,
    packet: {
      count: plan.packets[0].config.counts.reduce((product, value) => product * value, 1),
      config: plan.packets[0].config,
    },
    bodyProfile: evaluation.bodyProfile,
    plan,
    injection: evaluation.injection,
    step: schedule,
    final: sampled.summary,
    localImpactCount: evaluation.localImpactCount,
    elevatedFluidProfile: evaluation.elevatedFluidProfile,
    bodyDisplacement: evaluation.bodyDisplacement,
    bodyDisplacementVector: evaluation.bodyDisplacementVector,
    bodyDisplacementAlongAxis: evaluation.bodyDisplacementAlongAxis,
    bodyRotationDegrees: evaluation.bodyRotationDegrees,
    baselineBodyDisplacement: evaluation.baselineBodyDisplacement,
    baselineBodyDisplacementAlongAxis: evaluation.baselineBodyDisplacementAlongAxis,
    bodyDisplacementDeltaAlongAxis: evaluation.bodyDisplacementDeltaAlongAxis,
    nonFinite: evaluation.nonFinite,
    stats: sampled.stats,
    acceptance: {
      ...evaluation.checks,
      passed: evaluation.passed,
    },
  };
}
