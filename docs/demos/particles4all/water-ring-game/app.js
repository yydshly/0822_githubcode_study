import { Particles4AllRuntimeAdapter } from '../runtime-adapter.mjs';

const $ = selector => document.querySelector(selector);
const dom = {
  frame: $('#runtime-frame'), runtime: $('#runtime-state'), cover: $('#loading-cover'), score: $('#score'),
  shots: $('#shot-count'), fluid: $('#fluid-added'), lift: $('#max-lift'), travel: $('#max-travel'),
  status: $('#game-status'), strip: $('#ring-strip'), celebration: $('#celebration'), rack: $('#target-rack'), gate: $('.capture-gate'),
  left: $('#jet-left'), up: $('#jet-up'), right: $('#jet-right'), pump: $('#water-pump'),
  pumpCycles: $('#pump-cycles'), pumpState: $('#pump-state'), guided: $('#guided-demo'), reset: $('#reset-game')
};

const source = Object.freeze({
  upstreamCommit: 'f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f',
  runtime: '../engine/',
  bodies: 'torus:0.38:0.17,torus:0.42:0.19,torus:0.46:0.21,torus:0.50:0.23,torus:0.54:0.25'
});
const level = Object.freeze({
  id: 'single-peg-01',
  peg: Object.freeze({
    base: [1.20, 0.08, 0.50],
    mouth: [1.20, 0.43, 0.50],
    thread: [1.20, 0.29, 0.50],
    seat: [1.20, 0.18, 0.50]
  }),
  capture: Object.freeze({ xMin: 0.82, xMax: 1.44, yMin: 0.17, yMax: 0.62, zMin: 0.20, zMax: 0.80, travelMin: 0.09 }),
  phases: Object.freeze({ alignMs: 900, threadMs: 900, settleMs: 750 })
});
const state = {
  ready: false, busy: false, view: 'ssfr', generation: 0, shots: 0, fluidAdded: 0,
  score: 0, scored: new Set(), baseline: new Map(), bodies: [], maxLift: 0, maxTravel: 0,
  capture: null, won: false, phase: 'lift', pumpActive: false, pumpCycles: 0, pumpTargetId: null, error: null
};
let adapter = null;
let sampleTimer = 0;
let sampling = false;
let pumpToken = 0;

function engineUrl() {
  const params = new URLSearchParams({
    preset: 'small', view: state.view, particles: '14000', body: source.bodies, bodysize: '0.078',
    radius: '0.42', speedmax: '6', timescale: '0.82', tension: '0.55', ssfrscale: '0.45',
    ssfrradius: '0.72', timing: '0', game: 'water-ring', generation: String(state.generation)
  });
  return `${source.runtime}?${params}`;
}

function setRuntime(status, text) {
  dom.runtime.dataset.state = status;
  dom.runtime.textContent = text;
}

function setControls(enabled) {
  [dom.left, dom.up, dom.right, dom.pump, dom.guided].forEach(button => { button.disabled = !enabled; });
}

function fmt(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
}

function resetState() {
  state.ready = false;
  state.busy = false;
  state.shots = 0;
  state.fluidAdded = 0;
  state.score = 0;
  state.scored.clear();
  state.baseline.clear();
  state.bodies = [];
  state.maxLift = 0;
  state.maxTravel = 0;
  state.capture = null;
  state.won = false;
  state.phase = 'lift';
  state.pumpActive = false;
  state.pumpCycles = 0;
  state.pumpTargetId = null;
  pumpToken += 1;
  state.error = null;
  dom.score.textContent = '0';
  dom.shots.textContent = '0';
  dom.fluid.textContent = '0';
  dom.lift.textContent = '—';
  dom.travel.textContent = '—';
  dom.pumpCycles.textContent = '0';
  dom.pumpState.textContent = '关闭';
  dom.pump.classList.remove('active');
  dom.pump.querySelector('strong').textContent = '启动持续水泵';
  dom.strip.replaceChildren();
  renderObjective();
}

function renderObjective() {
  const order = ['lift', 'align', 'thread', 'hang'];
  const current = order.indexOf(state.phase);
  document.querySelectorAll('#objective-track [data-phase]').forEach((item, index) => {
    item.classList.toggle('active', index === current);
    item.classList.toggle('complete', index < current || (state.won && index === current));
  });
  dom.rack.dataset.phase = state.phase;
  dom.gate.textContent = state.won ? '已挂接' : state.phase === 'thread' ? '穿杆中' : '穿杆入口';
}

function renderRings() {
  dom.strip.replaceChildren(...state.bodies.map(body => {
    const initial = state.baseline.get(body.id) || body.pose.centre;
    const [x, y, z] = body.pose.centre;
    const lift = y - initial[1];
    const travel = Math.hypot(x - initial[0], y - initial[1], z - initial[2]);
    const isCaptured = state.capture?.bodyId === body.id;
    const status = state.scored.has(body.id) ? '已挂在杆上'
      : isCaptured ? ({ align: '正在对准杆口', thread: '正在沿杆下落', hang: '正在稳定挂接' }[state.phase] || '已进入杆口')
        : '等待水流推动';
    const article = document.createElement('article');
    article.className = `ring-status${state.scored.has(body.id) ? ' scored' : ''}${isCaptured ? ' captured' : ''}`;
    article.innerHTML = `<span>RING ${String(body.id).padStart(2, '0')} · TORUS</span><strong>${status}</strong><small>ΔY ${fmt(lift)} · travel ${fmt(travel)} m</small>`;
    return article;
  }));
}

function celebrate() {
  dom.celebration.replaceChildren(...Array.from({ length: 18 }, (_, index) => {
    const piece = document.createElement('i');
    piece.style.left = `${45 + (index * 31 % 50)}%`;
    piece.style.top = `${10 + (index * 17 % 36)}%`;
    piece.style.animationDelay = `${(index % 6) * 35}ms`;
    return piece;
  }));
  window.setTimeout(() => dom.celebration.replaceChildren(), 1100);
}

function distanceTo(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function isInsideCapture(body) {
  if (state.shots === 0 || state.capture || state.won) return false;
  const initial = state.baseline.get(body.id);
  if (!initial) return false;
  const [x, y, z] = body.pose.centre;
  const travel = Math.hypot(x - initial[0], y - initial[1], z - initial[2]);
  const gate = level.capture;
  return x > gate.xMin && x < gate.xMax && y > gate.yMin && y < gate.yMax &&
    z > gate.zMin && z < gate.zMax && travel > gate.travelMin;
}

async function beginCapture(body, reason = 'water-entry') {
  if (state.capture || state.won) return false;
  state.capture = { bodyId: body.id, phaseAt: performance.now(), reason };
  state.phase = 'align';
  if (state.pumpActive) stopPump('captured');
  renderObjective();
  await adapter.holdBody({ bodyId: body.id, target: level.peg.mouth, rate: 13, limit: 1.7, align: true });
  dom.status.textContent = `圆环 ${body.id} 已被水流送入杆口，开始对准。`;
  return true;
}

async function updateCapture(body) {
  if (!state.capture || state.capture.bodyId !== body.id || state.won) return;
  const elapsed = performance.now() - state.capture.phaseAt;
  if (state.phase === 'align' && (distanceTo(body.pose.centre, level.peg.mouth) < 0.045 || elapsed > level.phases.alignMs)) {
    state.phase = 'thread';
    state.capture.phaseAt = performance.now();
    await adapter.holdBody({ bodyId: body.id, target: level.peg.thread, rate: 10, limit: 0.9, align: true });
    dom.status.textContent = `圆环 ${body.id} 已对准，正在沿单杆下落。`;
    renderObjective();
  } else if (state.phase === 'thread' && (distanceTo(body.pose.centre, level.peg.thread) < 0.035 || elapsed > level.phases.threadMs)) {
    state.phase = 'hang';
    state.capture.phaseAt = performance.now();
    await adapter.holdBody({ bodyId: body.id, target: level.peg.seat, rate: 14, limit: 0.65, align: true });
    dom.status.textContent = `圆环 ${body.id} 已穿过杆口，正在落到挂接位置。`;
    renderObjective();
  } else if (state.phase === 'hang' && (distanceTo(body.pose.centre, level.peg.seat) < 0.026 || elapsed > level.phases.settleMs)) {
    state.won = true;
    state.scored.add(body.id);
    state.score = 1;
    stopPump('won');
    dom.score.textContent = '1';
    dom.status.textContent = `通关：圆环 ${body.id} 已沿杆下落并稳定挂住。按 R 可以再来一局。`;
    renderObjective();
    setControls(false);
    celebrate();
  }
}

function syncTargetRack() {
  const project = dom.frame.contentWindow?.__project;
  if (typeof project !== 'function') return;
  const point = project(level.peg.base);
  if (!point) return;
  dom.rack.style.left = `${Math.max(8, point.x - 60)}px`;
  dom.rack.style.top = `${Math.max(30, point.y - 230)}px`;
  dom.rack.style.right = 'auto';
  dom.rack.style.bottom = 'auto';
  dom.rack.dataset.projected = 'true';
}

async function sampleBodies() {
  if (!state.ready || state.busy || sampling || !adapter) return;
  sampling = true;
  try {
    const result = await adapter.sampleBodies();
    state.bodies = result.bodies;
    for (const body of result.bodies) {
      if (!state.baseline.has(body.id)) state.baseline.set(body.id, [...body.pose.centre]);
      const initial = state.baseline.get(body.id);
      const [x, y, z] = body.pose.centre;
      state.maxLift = Math.max(state.maxLift, y - initial[1]);
      state.maxTravel = Math.max(state.maxTravel, Math.hypot(x - initial[0], y - initial[1], z - initial[2]));
      if (isInsideCapture(body)) await beginCapture(body);
      await updateCapture(body);
    }
    dom.lift.textContent = `${fmt(state.maxLift)} m`;
    dom.travel.textContent = `${fmt(state.maxTravel)} m`;
    syncTargetRack();
    renderRings();
    adapter.setPaused(false);
  } catch (error) {
    state.error = error.message;
  } finally {
    sampling = false;
  }
}

function packetFor(direction) {
  const packets = {
    left: { origin: [0.10, 0.07, 0.36], counts: [4, 7, 7], spacing: 0.018, velocity: [5.8, 7.2, 0.2] },
    up: { origin: [0.65, 0.07, 0.36], counts: [5, 7, 7], spacing: 0.018, velocity: [0.2, 7.8, 0.1] },
    right: { origin: [1.30, 0.07, 0.36], counts: [4, 7, 7], spacing: 0.018, velocity: [-5.8, 7.2, -0.2] },
    'pump-lift': { origin: [0.92, 0.055, 0.39], counts: [5, 6, 6], spacing: 0.018, velocity: [1.2, 9.2, 0.0] },
    'pump-drive': { origin: [0.62, 0.065, 0.39], counts: [5, 6, 6], spacing: 0.018, velocity: [5.4, 7.1, 0.0] },
    'pump-center': { origin: [1.08, 0.055, 0.39], counts: [4, 6, 6], spacing: 0.018, velocity: [0.2, 8.8, 0.0] }
  };
  return packets[direction];
}

async function fireJet(direction, { quiet = false } = {}) {
  if (!state.ready || state.busy || state.won || !adapter) return null;
  state.busy = true;
  setControls(false);
  try {
    const packet = adapter.createFluidBlock(packetFor(direction));
    const result = await adapter.injectFluid(packet);
    adapter.setPaused(false);
    state.shots += 1;
    state.fluidAdded += result.added;
    dom.shots.textContent = String(state.shots);
    dom.fluid.textContent = state.fluidAdded.toLocaleString();
    if (!quiet) dom.status.textContent = `${direction === 'left' ? '左侧' : direction === 'right' ? '右侧' : '中心'}水压释放：新增 ${result.added} 个真实流体粒子。`;
    return result;
  } catch (error) {
    state.error = error.message;
    dom.status.textContent = `水压失败：${error.message}`;
    return null;
  } finally {
    state.busy = false;
    setControls(state.ready && !state.won);
  }
}

const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

function renderPump() {
  dom.pump.classList.toggle('active', state.pumpActive);
  dom.pump.querySelector('strong').textContent = state.pumpActive ? '停止持续水泵' : '启动持续水泵';
  dom.pumpState.textContent = state.won ? '已通关' : state.pumpActive ? '运行中' : '关闭';
  dom.pumpCycles.textContent = String(state.pumpCycles);
}

function stopPump(reason = 'manual') {
  state.pumpActive = false;
  pumpToken += 1;
  renderPump();
  if (reason === 'manual' && !state.won) dom.status.textContent = '持续水泵已停止；可以继续单次控制水流。';
}

async function runPump(token) {
  const sequence = ['pump-lift', 'pump-drive', 'pump-lift', 'pump-center'];
  dom.status.textContent = '持续水泵运行中：正在用真实流体脉冲抬升并导向圆环。';
  while (state.pumpActive && token === pumpToken && state.ready && !state.won && !state.capture && state.pumpCycles < 28) {
    const direction = sequence[state.pumpCycles % sequence.length];
    const result = await fireJet(direction, { quiet: true });
    if (!result) break;
    state.pumpCycles += 1;
    renderPump();
    dom.status.textContent = `水泵第 ${state.pumpCycles} 次脉冲：累计注入 ${state.fluidAdded.toLocaleString()} 个流体粒子。`;
    await delay(260);
  }
  if (state.capture || state.won) stopPump('captured');
  else if (state.pumpCycles >= 28) {
    stopPump('limit');
    dom.status.textContent = '本轮水泵达到安全上限；可重新装水后再试。';
  }
}

function togglePump() {
  if (!state.ready || state.won) return;
  if (state.pumpActive) {
    stopPump('manual');
    return;
  }
  state.pumpActive = true;
  const token = ++pumpToken;
  renderPump();
  runPump(token);
}

async function playGuidedDemo() {
  if (!state.ready || state.busy) return;
  dom.status.textContent = '演示开始：先用水流产生真实位移，再由杆口捕获完成穿杆。';
  const sequence = ['left', 'up', 'left', 'up', 'right', 'left', 'up', 'left', 'up', 'right', 'left', 'up'];
  for (const direction of sequence) {
    if (state.capture || state.won) break;
    await fireJet(direction, { quiet: true });
    await delay(380);
  }
  if (!state.capture && !state.won) {
    const candidates = state.bodies.filter(body => {
      const initial = state.baseline.get(body.id);
      return initial && Math.hypot(...body.pose.centre.map((value, index) => value - initial[index])) > level.capture.travelMin;
    }).sort((a, b) => b.pose.centre[0] - a.pose.centre[0]);
    if (candidates[0]) await beginCapture(candidates[0], 'guided-assist');
  }
  if (state.capture && !state.won) dom.status.textContent = '圆环已到达杆口；正在完成对准、穿杆和挂接。';
  const deadline = performance.now() + 4500;
  while (!state.won && performance.now() < deadline) await delay(120);
  if (!state.won) dom.status.textContent = '尚未挂上：继续用 A / S / D 将圆环送向右侧杆口。';
}

function decorateRuntime() {
  const doc = dom.frame.contentDocument;
  if (!doc || doc.getElementById('water-ring-shell-style')) return;
  const style = doc.createElement('style');
  style.id = 'water-ring-shell-style';
  style.textContent = '#ui,#repo{display:none!important}body{background:#0b1920!important}';
  doc.head.append(style);
}

async function connectRuntime(token) {
  adapter = new Particles4AllRuntimeAdapter(dom.frame, { timeoutMs: 60000 });
  try {
    await adapter.connect();
    if (token !== state.generation) return;
    decorateRuntime();
    const description = adapter.describe();
    state.ready = true;
    setRuntime('ready', `源库运行中 · ${description.particleCount.toLocaleString()} particles · ${description.bodyCount} torus`);
    dom.cover.classList.add('hidden');
    setControls(true);
    dom.status.textContent = '目标：先用 A / S / D 让圆环产生位移，再送入右侧单杆入口并挂住。';
    await sampleBodies();
  } catch (error) {
    if (token !== state.generation) return;
    state.error = error.message;
    setRuntime('error', 'WebGPU Runtime 启动失败');
    dom.cover.classList.remove('hidden');
    dom.cover.querySelector('p').textContent = `无法启动实时场景：${error.message}`;
    dom.status.textContent = '仍可阅读能力映射；实时游戏需要支持 WebGPU 的桌面浏览器。';
  }
}

function loadScene() {
  window.clearInterval(sampleTimer);
  try { adapter?.dispose(); } catch { /* Previous runtime may already be gone. */ }
  state.generation += 1;
  const token = state.generation;
  resetState();
  setControls(false);
  setRuntime('loading', '正在连接 WebGPU Runtime');
  dom.cover.classList.remove('hidden');
  dom.cover.querySelector('p').textContent = '正在创建源库粒子场景…';
  dom.frame.src = engineUrl();
  dom.frame.addEventListener('load', () => connectRuntime(token), { once: true });
  sampleTimer = window.setInterval(sampleBodies, 550);
}

dom.left.addEventListener('click', () => fireJet('left'));
dom.up.addEventListener('click', () => fireJet('up'));
dom.right.addEventListener('click', () => fireJet('right'));
dom.pump.addEventListener('click', togglePump);
dom.guided.addEventListener('click', playGuidedDemo);
dom.reset.addEventListener('click', loadScene);

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  loadScene();
}));

window.addEventListener('keydown', event => {
  if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  const key = event.key.toLowerCase();
  if (key === 'a') fireJet('left');
  if (key === 's') fireJet('up');
  if (key === 'd') fireJet('right');
  if (key === 'r') loadScene();
});

window.__waterRingGame = {
  source, level, state, loadScene, fireJet, togglePump, stopPump, playGuidedDemo, sampleBodies, beginCapture,
  get adapter() { return adapter; }
};

if (!('gpu' in navigator)) {
  setRuntime('error', '此浏览器未提供 WebGPU');
  dom.cover.querySelector('p').textContent = '请使用支持 WebGPU 与硬件加速的桌面 Chrome / Edge。';
} else {
  loadScene();
}
