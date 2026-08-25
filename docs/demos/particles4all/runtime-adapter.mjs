const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive integer`);
  }
}

function requireFiniteVector3(value, name) {
  const vector = Array.from(value || []);
  if (vector.length !== 3 || vector.some(item => !Number.isFinite(Number(item)))) {
    throw new TypeError(`${name} must contain three finite numbers`);
  }
  return vector.map(Number);
}

export function createFluidBlock({
  origin = [0, 0, 0],
  counts,
  spacing,
  velocity = [0, 0, 0]
} = {}) {
  const normalizedOrigin = requireFiniteVector3(origin, 'origin');
  const normalizedVelocity = requireFiniteVector3(velocity, 'velocity');
  const normalizedCounts = Array.from(counts || []);
  if (normalizedCounts.length !== 3 ||
      normalizedCounts.some(value => !Number.isInteger(value) || value < 1)) {
    throw new TypeError('counts must contain three positive integers');
  }
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new TypeError('spacing must be a positive finite number');
  }
  const count = normalizedCounts.reduce((product, value) => product * value, 1);
  if (!Number.isSafeInteger(count) || count > 300000) {
    throw new RangeError('fluid block count must not exceed 300000 particles');
  }

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  let cursor = 0;
  for (let ix = 0; ix < normalizedCounts[0]; ix += 1) {
    for (let iy = 0; iy < normalizedCounts[1]; iy += 1) {
      for (let iz = 0; iz < normalizedCounts[2]; iz += 1) {
        positions[cursor] = normalizedOrigin[0] + ix * spacing;
        positions[cursor + 1] = normalizedOrigin[1] + iy * spacing;
        positions[cursor + 2] = normalizedOrigin[2] + iz * spacing;
        velocities.set(normalizedVelocity, cursor);
        cursor += 3;
      }
    }
  }

  return {
    kind: 'fluid-block',
    config: {
      origin: normalizedOrigin,
      counts: normalizedCounts,
      spacing: Number(spacing),
      velocity: normalizedVelocity
    },
    count,
    positions,
    velocities
  };
}

export class Particles4AllRuntimeAdapter {
  constructor(frame, { timeoutMs = 45000 } = {}) {
    if (!frame) throw new TypeError('A same-origin engine iframe is required');
    this.frame = frame;
    this.timeoutMs = timeoutMs;
    this.disposed = false;
    this.version = 2;
    this.kind = 'E1 runtime adapter';
    this.support = Object.freeze({
      deterministicTicks: true,
      frozenSampling: true,
      directFluidInjection: true,
      fluidPacketGenerator: true,
      seededReset: false,
      scheduledEvents: true,
      directBodySampling: true,
      rigidBodyEvents: true,
      bodyOrientationTargets: true,
      inPlaceViewSwitch: true,
      sceneApparatus: true,
      apparatusStateFeedback: true,
      staticAnalyticColliders: true,
      gpuDeviceDisposal: false
    });
  }

  get window() {
    if (this.disposed) throw new Error('Particles4All runtime adapter is disposed');
    return this.frame.contentWindow;
  }

  async connect() {
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      const win = this.window;
      if (win?.__gpuError) throw new Error(win.__gpuError);
      if (win?.__done && win?.__result?.error) throw new Error(String(win.__result.error));
      if (win?.__sim?.n && win?.__ui && typeof win.__readBuf === 'function') return this;
      await delay(50);
    }
    throw new Error('Timed out waiting for the Particles4All upstream runtime');
  }

  setPaused(paused) {
    const win = this.window;
    if (!win?.__ui) throw new Error('Particles4All runtime is not connected');
    if (Boolean(win.__ui.paused) !== Boolean(paused)) {
      win.document?.getElementById('pause')?.click();
    }
  }

  setView(view) {
    if (!['particles', 'mesh', 'ray', 'ssfr'].includes(view)) {
      throw new TypeError('view must be particles, mesh, ray, or ssfr');
    }
    const setDisplay = this.window.__setDisplay;
    if (typeof setDisplay !== 'function') throw new Error('Particles4All runtime does not expose in-place view switching');
    return setDisplay(view);
  }

  describeApparatus() {
    const apparatus = this.window.__apparatus;
    if (!apparatus || typeof apparatus.describe !== 'function') return null;
    return apparatus.describe();
  }

  setPumpState(active, nozzle = null) {
    const apparatus = this.window.__apparatus;
    if (!apparatus || typeof apparatus.setPumpState !== 'function') {
      throw new Error('Particles4All runtime does not expose scene apparatus state');
    }
    return apparatus.setPumpState(Boolean(active), nozzle);
  }

  clearTimeRemainder() {
    const sim = this.window.__sim;
    sim.timeBank = 0;
    sim.lastAdvanced = 0;
    sim.lastSubsteps = 0;
  }

  describe() {
    const sim = this.window.__sim;
    const substeps = Math.max(1, Number(sim.params?.substeps) || 1);
    return {
      adapterVersion: this.version,
      classification: this.kind,
      upstreamRuntime: true,
      particleCount: sim.n,
      fluidParticleCount: sim.n - (sim.scene?.nBody || 0),
      rigidParticleCount: sim.scene?.nBody || 0,
      bodyCount: sim.nBodies || 0,
      simTime: sim.simTime,
      solverStepDt: (1 / 60) / substeps,
      generation: sim.gen || 0,
      support: this.support
    };
  }

  async reset(options = {}) {
    await this.connect();
    if (options.seed != null) {
      throw new Error('The fixed upstream runtime does not expose seeded reset; a solver fork is required');
    }
    this.setPaused(true);
    this.window.document?.getElementById('reset')?.click();
    this.clearTimeRemainder();
    await this.flush();
    return this.describe();
  }

  async step(ticks = 1) {
    requirePositiveInteger(ticks, 'ticks');
    await this.connect();
    this.setPaused(true);
    const sim = this.window.__sim;
    this.clearTimeRemainder();
    const stepDt = (1 / 60) / Math.max(1, Number(sim.params?.substeps) || 1);
    const startTime = sim.simTime;
    for (let i = 0; i < ticks; i += 1) sim.step(stepDt);
    await this.flush();
    return {
      requestedTicks: ticks,
      actualTicks: Math.round((sim.simTime - startTime) / stepDt),
      stepDt,
      startTime,
      endTime: sim.simTime
    };
  }

  async injectFluid({ positions, velocities }) {
    await this.connect();
    const pos = ArrayBuffer.isView(positions) ? positions : Array.from(positions || []);
    const vel = ArrayBuffer.isView(velocities) ? velocities : Array.from(velocities || []);
    if (pos.length === 0 || pos.length % 3 !== 0) {
      throw new TypeError('positions must contain one or more xyz triples');
    }
    if (vel.length !== pos.length) {
      throw new TypeError('velocities must contain one xyz triple for every position');
    }
    for (let i = 0; i < pos.length; i += 1) {
      if (!Number.isFinite(Number(pos[i])) || !Number.isFinite(Number(vel[i]))) {
        throw new TypeError('fluid injection values must be finite numbers');
      }
    }

    this.setPaused(true);
    const sim = this.window.__sim;
    const before = sim.n;
    const requested = pos.length / 3;
    const capacity = sim.cap || before;
    const added = sim.appendFluid(pos, vel);
    await this.flush();
    return {
      requested,
      added,
      before,
      after: sim.n,
      capacity,
      availableBefore: Math.max(0, capacity - before),
      clamped: added < requested
    };
  }

  createFluidBlock(config) {
    return createFluidBlock(config);
  }

  describeBodies() {
    const sim = this.window.__sim;
    return (sim.bodies || []).map((body, index) => {
      const pose = sim.bodyPose?.[index] || { centre: body.centre, rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
      return {
        id: Number(body.id ?? index + 1),
        key: `body-${Number(body.id ?? index + 1)}`,
        shape: body.shape,
        size: Number(body.size),
        density: Number(body.density),
        particleCount: Number(body.count),
        initialCentre: Array.from(body.centre || []),
        pose: {
          centre: Array.from(pose.centre || []),
          rot: Array.from(pose.rot || [])
        }
      };
    });
  }

  async sampleBodies() {
    await this.connect();
    this.setPaused(true);
    await this.flush();
    const sim = this.window.__sim;
    const bodies = this.describeBodies();
    if (sim.nBodies && sim.buf?.bodyCentre && sim.buf?.bodyRot) {
      const centres = await this.window.__readBuf(sim.buf.bodyCentre, sim.nBodies * 16);
      const rotations = await this.window.__readBuf(sim.buf.bodyRot, sim.nBodies * 48);
      for (let i = 0; i < bodies.length; i += 1) {
        bodies[i].pose.centre = centres.slice(i * 4, i * 4 + 3);
        const rot = new Array(9);
        for (let row = 0; row < 3; row += 1) {
          for (let column = 0; column < 3; column += 1) {
            rot[column * 3 + row] = rotations[(i * 3 + row) * 4 + column];
          }
        }
        bodies[i].pose.rot = rot;
      }
    }
    return { summary: this.describe(), bodies };
  }

  async holdBody({ bodyId, target, rate = 12, limit = 1, align = false } = {}) {
    await this.connect();
    if (!Number.isInteger(bodyId) || bodyId < 1 || bodyId > this.window.__sim.nBodies) {
      throw new RangeError(`bodyId must be between 1 and ${this.window.__sim.nBodies}`);
    }
    const normalizedTarget = requireFiniteVector3(target, 'target');
    if (!Number.isFinite(rate) || rate <= 0) throw new TypeError('rate must be a positive finite number');
    if (!Number.isFinite(limit) || limit <= 0) throw new TypeError('limit must be a positive finite number');
    this.setPaused(true);
    this.window.__sim.holdBody(bodyId, normalizedTarget, Number(rate), Number(limit), Boolean(align));
    return { bodyId, target: normalizedTarget, rate: Number(rate), limit: Number(limit), align: Boolean(align), held: true };
  }

  async releaseBody() {
    await this.connect();
    this.setPaused(true);
    this.window.__sim.releaseBody();
    return { held: false };
  }

  async runSchedule({ ticks, events = [], reset = true }) {
    if (!Number.isInteger(ticks) || ticks < 0) {
      throw new TypeError('ticks must be a non-negative integer');
    }
    if (!Array.isArray(events)) throw new TypeError('events must be an array');

    const ids = new Set();
    const queue = events.map((event, order) => {
      if (!event || typeof event !== 'object') throw new TypeError('each event must be an object');
      if (typeof event.id !== 'string' || !event.id.trim()) {
        throw new TypeError('each event must have a non-empty string id');
      }
      if (ids.has(event.id)) throw new TypeError(`duplicate event id: ${event.id}`);
      ids.add(event.id);
      if (!Number.isInteger(event.tick) || event.tick < 0 || event.tick > ticks) {
        throw new RangeError(`event ${event.id} tick must be between 0 and ${ticks}`);
      }
      if (!['injectFluid', 'sample', 'sampleBodies', 'holdBody', 'releaseBody'].includes(event.type)) {
        throw new TypeError(`unsupported event type: ${event.type}`);
      }
      return { ...event, order };
    }).sort((a, b) => a.tick - b.tick || a.order - b.order);

    await this.connect();
    if (reset) await this.reset();
    else {
      this.setPaused(true);
      this.clearTimeRemainder();
    }

    const sim = this.window.__sim;
    const startTime = sim.simTime;
    const stepDt = (1 / 60) / Math.max(1, Number(sim.params?.substeps) || 1);
    const history = [];
    let eventIndex = 0;

    for (let tick = 0; tick <= ticks; tick += 1) {
      while (eventIndex < queue.length && queue[eventIndex].tick === tick) {
        const event = queue[eventIndex++];
        let result;
        if (event.type === 'injectFluid') result = await this.injectFluid(event.payload || {});
        else if (event.type === 'sample') result = await this.sample(event.payload || {});
        else if (event.type === 'sampleBodies') result = await this.sampleBodies();
        else if (event.type === 'holdBody') result = await this.holdBody(event.payload || {});
        else result = await this.releaseBody();
        history.push({
          id: event.id,
          type: event.type,
          tick,
          order: event.order,
          simTime: sim.simTime,
          result
        });
      }
      if (tick < ticks) await this.step(1);
    }

    return {
      requestedTicks: ticks,
      actualTicks: Math.round((sim.simTime - startTime) / stepDt),
      stepDt,
      startTime,
      endTime: sim.simTime,
      reset,
      history
    };
  }

  async sample({ positions = false, phases = false } = {}) {
    await this.connect();
    this.setPaused(true);
    await this.flush();
    const win = this.window;
    const sim = win.__sim;
    const bytes = sim.n * 16;
    const result = { summary: this.describe() };
    if (positions) result.positions = await win.__readBuf(sim.livePos(), bytes);
    if (phases) result.phases = await win.__readBuf(sim.liveBody(), bytes);
    result.bodyPose = (sim.bodyPose || []).map(pose => ({
      centre: [...pose.centre],
      rot: [...pose.rot]
    }));
    result.stats = { ...(sim.stats || {}) };
    return result;
  }

  async flush() {
    const queue = this.window.__sim?.dev?.queue;
    if (typeof queue?.onSubmittedWorkDone === 'function') await queue.onSubmittedWorkDone();
  }

  dispose({ unload = false } = {}) {
    if (this.disposed) return;
    try { this.setPaused(true); } catch { /* Runtime may already be gone. */ }
    if (unload) this.frame.src = 'about:blank';
    this.disposed = true;
  }
}
