import assert from 'node:assert/strict';
import {
  Particles4AllRuntimeAdapter,
  createFluidBlock
} from '../../../docs/demos/particles4all/runtime-adapter.mjs';

const stepDt = 1 / 120;
const sim = {
  n: 4,
  cap: 6,
  nBodies: 1,
  gen: 1,
  simTime: 0,
  timeBank: 0,
  lastAdvanced: 0,
  lastSubsteps: 0,
  params: { substeps: 2 },
  scene: { nBody: 1 },
  bodies: [{ id: 1, shape: 'sphere', size: 0.2, density: 0.5, centre: [1, 2, 3], count: 1 }],
  bodyPose: [{ centre: [1, 2, 3], rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] }],
  stats: { avgRho: 1000, maxRho: 1010, maxSpeed: 2 },
  dev: { queue: { async onSubmittedWorkDone() {} } },
  step(frameDt) {
    this.timeBank += frameDt;
    const count = Math.floor(this.timeBank / stepDt + 1e-4);
    this.timeBank -= count * stepDt;
    this.lastSubsteps = count;
    this.lastAdvanced = count * stepDt;
    this.simTime += this.lastAdvanced;
  },
  appendFluid(positions, velocities) {
    const count = Math.min(positions.length / 3, velocities.length / 3, this.cap - this.n);
    this.n += count;
    return count;
  },
  holdBody(bodyId, target, rate, limit, align) {
    this.heldBody = bodyId;
    this.heldTarget = target;
    this.heldRate = rate;
    this.heldLimit = limit;
    this.heldAlign = align;
  },
  releaseBody() { this.heldBody = -1; },
  livePos() { return 'positions'; },
  liveBody() { return 'phases'; }
};

const ui = { paused: false };
const buttons = {
  pause: { click() { ui.paused = !ui.paused; } },
  reset: { click() { sim.simTime = 0; sim.n = 4; sim.gen += 1; } }
};
const win = {
  __sim: sim,
  __ui: ui,
  __readBuf: async buffer => buffer === 'positions' ? Array(16).fill(1) : Array(16).fill(0),
  document: { getElementById: id => buttons[id] }
};
const frame = { contentWindow: win, src: '' };

const adapter = new Particles4AllRuntimeAdapter(frame, { timeoutMs: 50 });
await adapter.connect();
assert.equal(adapter.describe().upstreamRuntime, true);
assert.equal(adapter.describe().fluidParticleCount, 3);
assert.equal(adapter.describe().support.fluidPacketGenerator, true);
assert.equal(adapter.describe().support.rigidBodyEvents, true);
assert.equal(adapter.describe().support.bodyOrientationTargets, true);

const packet = createFluidBlock({
  origin: [1, 2, 3],
  counts: [2, 2, 2],
  spacing: 0.5,
  velocity: [0, -1, 0]
});
assert.equal(packet.count, 8);
assert.deepEqual(packet.config, {
  origin: [1, 2, 3], counts: [2, 2, 2], spacing: 0.5, velocity: [0, -1, 0]
});
assert.deepEqual(Array.from(packet.positions.slice(0, 6)), [1, 2, 3, 1, 2, 3.5]);
assert.deepEqual(Array.from(packet.velocities.slice(0, 6)), [0, -1, 0, 0, -1, 0]);
assert.equal(new Set(Array.from({ length: packet.count }, (_, index) =>
  Array.from(packet.positions.slice(index * 3, index * 3 + 3)).join(','))).size, packet.count);
assert.throws(() => createFluidBlock({ counts: [2, 0, 2], spacing: 0.1 }), /positive integers/);
assert.throws(() => createFluidBlock({ counts: [2, 2, 2], spacing: 0 }), /positive finite/);

const bodyCatalog = adapter.describeBodies();
assert.deepEqual(bodyCatalog[0], {
  id: 1,
  key: 'body-1',
  shape: 'sphere',
  size: 0.2,
  density: 0.5,
  particleCount: 1,
  initialCentre: [1, 2, 3],
  pose: { centre: [1, 2, 3], rot: [1, 0, 0, 0, 1, 0, 0, 0, 1] }
});
const bodySample = await adapter.sampleBodies();
assert.equal(bodySample.bodies[0].key, 'body-1');
const held = await adapter.holdBody({ bodyId: 1, target: [1.2, 2, 3], rate: 10, limit: 2, align: true });
assert.equal(held.held, true);
assert.equal(held.align, true);
assert.deepEqual(sim.heldTarget, [1.2, 2, 3]);
assert.equal(sim.heldAlign, true);
assert.equal((await adapter.releaseBody()).held, false);
assert.equal(sim.heldBody, -1);
await assert.rejects(() => adapter.holdBody({ bodyId: 2, target: [1, 2, 3] }), /between 1 and 1/);

const stepped = await adapter.step(12);
assert.equal(stepped.actualTicks, 12);
assert.ok(Math.abs(stepped.endTime - 0.1) < 1e-12);
assert.equal(ui.paused, true);

const sampled = await adapter.sample({ positions: true, phases: true });
assert.equal(sampled.positions.length, 16);
assert.equal(sampled.phases.length, 16);
assert.deepEqual(sampled.bodyPose[0].centre, [1, 2, 3]);

const injection = await adapter.injectFluid({
  positions: [0, 1, 0, 0.1, 1, 0],
  velocities: [0, -1, 0, 0, -1, 0]
});
assert.deepEqual(injection, {
  requested: 2,
  added: 2,
  before: 4,
  after: 6,
  capacity: 6,
  availableBefore: 2,
  clamped: false
});
const clamped = await adapter.injectFluid({
  positions: [0, 1, 0],
  velocities: [0, -1, 0]
});
assert.equal(clamped.added, 0);
assert.equal(clamped.clamped, true);
await assert.rejects(() => adapter.injectFluid({ positions: [0, 1], velocities: [0, 0] }),
  /xyz triples/);
await assert.rejects(() => adapter.injectFluid({ positions: [0, 1, 0], velocities: [0, -1] }),
  /one xyz triple/);

const schedule = await adapter.runSchedule({
  ticks: 3,
  reset: true,
  events: [
    { id: 'body-initial', tick: 0, type: 'sampleBodies' },
    { id: 'body-hold', tick: 0, type: 'holdBody', payload: {
      bodyId: 1, target: [1.2, 2, 3], rate: 10, limit: 2
    } },
    { id: 'inject-a', tick: 0, type: 'injectFluid', payload: {
      positions: [0, 1, 0], velocities: [0, -1, 0]
    } },
    { id: 'sample-mid', tick: 1, type: 'sample' },
    { id: 'inject-b', tick: 2, type: 'injectFluid', payload: {
      positions: [0.1, 1, 0], velocities: [0, -1, 0]
    } },
    { id: 'body-release', tick: 2, type: 'releaseBody' },
    { id: 'sample-final', tick: 3, type: 'sample' }
  ]
});
assert.equal(schedule.actualTicks, 3);
assert.deepEqual(schedule.history.map(event => event.id),
  ['body-initial', 'body-hold', 'inject-a', 'sample-mid', 'inject-b', 'body-release', 'sample-final']);
assert.deepEqual(schedule.history.map(event => event.tick), [0, 0, 0, 1, 2, 2, 3]);
assert.ok(Math.abs(schedule.history[3].simTime - stepDt) < 1e-12);
assert.ok(Math.abs(schedule.history[6].simTime - 3 * stepDt) < 1e-12);
assert.equal(schedule.history[6].result.summary.particleCount, 6);
await assert.rejects(() => adapter.runSchedule({
  ticks: 2,
  events: [{ id: 'late', tick: 3, type: 'sample' }]
}), /between 0 and 2/);
await assert.rejects(() => adapter.runSchedule({
  ticks: 2,
  events: [{ id: 'bad', tick: 1, type: 'callback' }]
}), /unsupported event type/);

const reset = await adapter.reset();
assert.equal(reset.simTime, 0);
assert.equal(reset.generation, 3);
await assert.rejects(() => adapter.reset({ seed: 7 }), /does not expose seeded reset/);

adapter.dispose();
assert.throws(() => adapter.describe(), /disposed/);

console.log(JSON.stringify({ passed: 60, failed: 0 }));
