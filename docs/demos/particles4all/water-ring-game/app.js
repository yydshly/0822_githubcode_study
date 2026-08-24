import { Particles4AllRuntimeAdapter } from '../runtime-adapter.mjs';

const $ = selector => document.querySelector(selector);
const dom = {
  frame: $('#runtime-frame'), runtime: $('#runtime-state'), cover: $('#loading-cover'), score: $('#score'),
  shots: $('#shot-count'), fluid: $('#fluid-added'), lift: $('#max-lift'), travel: $('#max-travel'),
  status: $('#game-status'), strip: $('#ring-strip'), celebration: $('#celebration'), rack: $('#target-rack'),
  left: $('#jet-left'), up: $('#jet-up'), right: $('#jet-right'), guided: $('#guided-demo'), reset: $('#reset-game')
};

const source = Object.freeze({
  upstreamCommit: 'f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f',
  runtime: '../engine/',
  bodies: 'torus:0.38:0.17,torus:0.42:0.19,torus:0.46:0.21,torus:0.50:0.23,torus:0.54:0.25'
});
const state = {
  ready: false, busy: false, view: 'ssfr', generation: 0, shots: 0, fluidAdded: 0,
  score: 0, scored: new Set(), baseline: new Map(), bodies: [], maxLift: 0, maxTravel: 0, error: null
};
let adapter = null;
let sampleTimer = 0;
let sampling = false;

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
  [dom.left, dom.up, dom.right, dom.guided].forEach(button => { button.disabled = !enabled; });
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
  state.error = null;
  dom.score.textContent = '0';
  dom.shots.textContent = '0';
  dom.fluid.textContent = '0';
  dom.lift.textContent = '—';
  dom.travel.textContent = '—';
  dom.strip.replaceChildren();
}

function renderRings() {
  dom.strip.replaceChildren(...state.bodies.map(body => {
    const initial = state.baseline.get(body.id) || body.pose.centre;
    const [x, y, z] = body.pose.centre;
    const lift = y - initial[1];
    const travel = Math.hypot(x - initial[0], y - initial[1], z - initial[2]);
    const article = document.createElement('article');
    article.className = `ring-status${state.scored.has(body.id) ? ' scored' : ''}`;
    article.innerHTML = `<span>RING ${String(body.id).padStart(2, '0')} · TORUS</span><strong>${state.scored.has(body.id) ? '已进入目标' : '水中运动'}</strong><small>ΔY ${fmt(lift)} · travel ${fmt(travel)} m</small>`;
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

function evaluateScore(body) {
  if (state.scored.has(body.id) || state.shots === 0) return;
  const initial = state.baseline.get(body.id);
  if (!initial) return;
  const [x, y, z] = body.pose.centre;
  const lift = y - initial[1];
  const travel = Math.hypot(x - initial[0], y - initial[1], z - initial[2]);
  const insideTarget = x > 1.05 && x < 1.43 && y > 0.04 && y < 0.28 && z > 0.24 && z < 0.76;
  if (insideTarget && (lift > 0.055 || travel > 0.13)) {
    state.scored.add(body.id);
    state.score = state.scored.size;
    dom.score.textContent = String(state.score);
    dom.status.textContent = `圆环 ${body.id} 进入目标区域：本次命中来自源库刚体位置，不是预设动画。`;
    celebrate();
  }
}

function syncTargetRack() {
  const project = dom.frame.contentWindow?.__project;
  if (typeof project !== 'function') return;
  const point = project([1.20, 0.12, 0.50]);
  if (!point) return;
  dom.rack.style.left = `${Math.max(8, point.x - 80)}px`;
  dom.rack.style.top = `${Math.max(35, point.y - 205)}px`;
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
      evaluateScore(body);
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
    right: { origin: [1.30, 0.07, 0.36], counts: [4, 7, 7], spacing: 0.018, velocity: [-5.8, 7.2, -0.2] }
  };
  return packets[direction];
}

async function fireJet(direction, { quiet = false } = {}) {
  if (!state.ready || state.busy || !adapter) return null;
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
    setControls(state.ready);
  }
}

const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));

async function playGuidedDemo() {
  if (!state.ready || state.busy) return;
  dom.status.textContent = '摇晃演示：交替释放局部水压，观察圆环抬升、位移和翻滚。';
  const sequence = ['left', 'up', 'right', 'left', 'up', 'right'];
  for (const direction of sequence) {
    await fireJet(direction, { quiet: true });
    await delay(420);
  }
  dom.status.textContent = '摇晃演示完成。继续手动按压，尝试把圆环送入右侧目标区。';
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
    dom.status.textContent = '按 A / S / D 或点击水压按钮，尝试推动圆环进入右侧目标区。';
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
  source, state, loadScene, fireJet, playGuidedDemo, sampleBodies,
  get adapter() { return adapter; }
};

if (!('gpu' in navigator)) {
  setRuntime('error', '此浏览器未提供 WebGPU');
  dom.cover.querySelector('p').textContent = '请使用支持 WebGPU 与硬件加速的桌面 Chrome / Edge。';
} else {
  loadScene();
}
