import { Particles4AllRuntimeAdapter } from '../../particles4all/runtime-adapter.mjs';
import { runParticles4AllScene } from '../core/particles4all-scene-contract.mjs';
import {
  CONTINUOUS_CURTAIN_SURFACE_CONTRACTS,
  CONTINUITY_EXPERIMENT,
  HIGH_FLOW_CURTAIN_SURFACE_CONTRACTS,
  STAGED_SHEET_SURFACE_CONTRACTS,
  STAGED_SURFACE_CONTRACTS,
} from './experiment-contracts.mjs';

const $ = selector => document.querySelector(selector);
const dom = {
  frame: $('#runtime-frame'),
  phase: $('#phase'),
  status: $('#status'),
  runA: $('#run-a'),
  runB: $('#run-b'),
  runBoth: $('#run-both'),
  unload: $('#unload'),
  displayMode: $('#display-mode'),
  emitterShape: $('#emitter-shape'),
  stagedModeLabel: $('#staged-mode-label'),
  conclusion: $('#conclusion'),
  experimentKicker: $('#experiment-kicker'),
  experimentCopy: $('#experiment-copy'),
  particleBudget: $('#particle-budget'),
};
const state = {
  phase: 'idle',
  runtimeSlots: 0,
  maxObservedRuntimeSlots: 0,
  activeVariant: null,
  results: { single: null, staged: null },
  surfaceResults: {},
  displayMode: new URLSearchParams(location.search).get('view') || 'ssfr',
  emitterShape: new URLSearchParams(location.search).get('emitter') || 'highflow',
  error: null,
};
let adapter = null;

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
}

function setPhase(phase, message) {
  state.phase = phase;
  dom.phase.textContent = phase.toUpperCase();
  dom.phase.dataset.phase = phase;
  dom.status.textContent = message;
  const busy = phase === 'loading' || phase === 'running';
  dom.runA.disabled = busy;
  dom.runB.disabled = busy;
  dom.runBoth.disabled = busy;
  dom.unload.disabled = busy || state.runtimeSlots === 0;
}

function renderVariant(id, result) {
  const root = document.querySelector(`[data-result="${id}"]`);
  const profile = result.elevatedFluidProfile;
  root.dataset.state = result.acceptance.passed ? 'passed' : 'failed';
  root.querySelector('[data-field="gate"]').textContent = result.acceptance.passed ? 'PASSED' : 'FAILED';
  root.querySelector('[data-field="bins"]').textContent = `${profile.occupiedBins} / ${profile.binCount}`;
  root.querySelector('[data-field="particles"]').textContent = String(profile.particleCount);
  root.querySelector('[data-field="highest"]').textContent = `${fmt(profile.highestY)} u`;
  root.querySelector('[data-field="width"]').textContent = `${fmt(profile.spanX)} u`;
  root.querySelector('[data-field="body"]').textContent = `${fmt(result.bodyDisplacementDeltaAlongAxis, 5)} u`;
  root.querySelector('[data-field="injection"]').textContent = `${result.injection.added} / ${result.injection.requested}`;
}

function resetStagedCard() {
  const root = document.querySelector('[data-result="staged"]');
  root.dataset.state = 'waiting';
  root.querySelector('[data-field="gate"]').textContent = 'WAITING';
  for (const field of root.querySelectorAll('[data-field]:not([data-field="gate"])')) field.textContent = '—';
}

function updateConclusion() {
  const single = state.results.single;
  const staged = state.results.staged;
  if (state.emitterShape === 'highflow' && staged) {
    const profile = staged.elevatedFluidProfile;
    dom.conclusion.dataset.outcome = 'scene-extension';
    dom.conclusion.textContent = `场景高流量水幕已由 Particles4All 实际求解：注入 ${staged.injection.added} 粒子，垂直占用 ${profile.occupiedBins}/${profile.binCount}，最高位置 ${fmt(profile.highestY)} u。画面已连接成宽水幕并产生池面冲击，但仍有明显团块和过强湍乱，下一阶段应优化表面重建与发射边界。`;
    return;
  }
  if (!single || !staged) {
    dom.conclusion.textContent = '先运行 A 与 B。页面只在两个真实 Runtime 结果都存在后给出差异结论。';
    return;
  }
  const a = single.elevatedFluidProfile;
  const b = staged.elevatedFluidProfile;
  const binsGain = b.occupiedBins - a.occupiedBins;
  const heightGain = (b.highestY ?? 0) - (a.highestY ?? 0);
  const stagedBodyDelta = staged.bodyDisplacementDeltaAlongAxis;
  const improved = binsGain > 0 && heightGain > 0;
  dom.conclusion.dataset.outcome = improved ? 'improved' : 'not-improved';
  dom.conclusion.textContent = improved
    ? `B 的高位垂直占用增加 ${binsGain} 个分箱，最高流体位置增加 ${fmt(heightGain)} u：分时注入形成了更长的落水带；当前刚体基线差为 ${fmt(stagedBodyDelta, 5)} u，不能据此宣称冲击增强，且画面仍是离散粒子。`
    : `本次 B 未同时提高垂直占用和最高位置；时间调度不足以形成更连续的落水带，需要如实保留失败结论。`;
}

async function ensureRuntime(contract) {
  if (adapter) return adapter;
  state.runtimeSlots = 1;
  state.maxObservedRuntimeSlots = Math.max(state.maxObservedRuntimeSlots, state.runtimeSlots);
  dom.frame.src = `../../particles4all/engine/?${contract.localPhysics.engineQuery}`;
  adapter = new Particles4AllRuntimeAdapter(dom.frame, { timeoutMs: 90000 });
  setPhase('loading', '正在加载唯一 Particles4All Runtime…');
  await adapter.connect();
  setPhase('ready', 'Runtime 已连接；A/B 将复用同一 solver。');
  return adapter;
}

async function runVariant(id) {
  const stagedContracts = {
    compact: STAGED_SURFACE_CONTRACTS,
    sheet: STAGED_SHEET_SURFACE_CONTRACTS,
    curtain: CONTINUOUS_CURTAIN_SURFACE_CONTRACTS,
    highflow: HIGH_FLOW_CURTAIN_SURFACE_CONTRACTS,
  }[state.emitterShape];
  const variant = id === 'staged'
    ? { ...CONTINUITY_EXPERIMENT.variants.staged, contract: stagedContracts[state.displayMode] }
    : CONTINUITY_EXPERIMENT.variants[id];
  if (!variant) throw new Error(`Unknown variant: ${id}`);
  state.activeVariant = id;
  state.error = null;
  try {
    const runtime = await ensureRuntime(variant.contract);
    setPhase('running', `正在执行 ${variant.label}：${variant.schedule}`);
    const result = await runParticles4AllScene(runtime, variant.contract);
    state.results[id] = result;
    if (id === 'staged') state.surfaceResults[`${state.emitterShape}:${state.displayMode}`] = result;
    renderVariant(id, result);
    setPhase('complete', `${variant.label} 已完成；当前画布就是该条件的实际最终状态。`);
    updateConclusion();
    return result;
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    setPhase('error', `运行失败：${state.error}`);
    throw error;
  }
}

async function runComparison() {
  await runVariant('single');
  await runVariant('staged');
  return getState();
}

function unload() {
  adapter?.dispose({ unload: true });
  adapter = null;
  dom.frame.removeAttribute('src');
  state.runtimeSlots = 0;
  state.activeVariant = null;
  setPhase('idle', 'Runtime 已卸载；结果数据保留用于比较。');
  return getState();
}

function selectDisplayMode(mode) {
  if (!STAGED_SURFACE_CONTRACTS[mode] || state.phase === 'loading' || state.phase === 'running') return getState();
  if (adapter) unload();
  state.displayMode = mode;
  state.results.staged = null;
  dom.displayMode.value = mode;
  dom.stagedModeLabel.textContent = stagedModeLabel(state.emitterShape, mode);
  resetStagedCard();
  updateConclusion();
  const url = new URL(location.href);
  url.searchParams.set('view', mode);
  history.replaceState({ view: mode }, '', url);
  setPhase('idle', `已选择原库 ${mode.toUpperCase()} 显示；运行 B 查看实际效果。`);
  return getState();
}

function selectEmitterShape(shape) {
  if (!['compact', 'sheet', 'curtain', 'highflow'].includes(shape) || state.phase === 'loading' || state.phase === 'running') return getState();
  if (adapter) unload();
  state.emitterShape = shape;
  state.results.staged = null;
  dom.emitterShape.value = shape;
  dom.stagedModeLabel.textContent = stagedModeLabel(shape, state.displayMode);
  updatePresetContext();
  resetStagedCard();
  updateConclusion();
  const url = new URL(location.href);
  url.searchParams.set('emitter', shape);
  history.replaceState({ emitter: shape }, '', url);
  const shapeName = { compact: '紧凑水块', sheet: '横向薄水片', curtain: '连续水幕', highflow: '场景高流量水幕' }[shape];
  setPhase('idle', `已选择 ${shapeName}；运行 B 查看实际效果。`);
  return getState();
}

function stagedModeLabel(shape, mode) {
  const schedule = shape === 'highflow'
    ? '42 × 128 / every tick'
    : shape === 'curtain' ? '24 × 16 / 0–41 ticks' : '12 × 32 / every 3 ticks';
  return `${schedule} · ${shape.toUpperCase()} · ${mode.toUpperCase()}`;
}

function updatePresetContext() {
  const highFlow = state.emitterShape === 'highflow';
  dom.experimentKicker.textContent = highFlow
    ? 'SCENE EXTENSION · ORIGINAL PBF + SSFR · HIGH FLOW'
    : 'SAME SOLVER · SAME WATER SAMPLE · ONE VARIABLE';
  dom.experimentCopy.textContent = highFlow
    ? '这是基于 Particles4All 原有 PBF 与 SSFR 的场景化高流量扩展：42 ticks 每帧注入 128 粒子，共 5376 粒子，用于验证从离散落水到宽水幕的可见变化。'
    : '这不是换一套瀑布算法。A 与 B 都使用 Particles4All 原有 PBF、同一高密度 box、384 粒子、−2.5 u/s 和 42 ticks；唯一变化是粒子进入时间。';
  dom.particleBudget.textContent = highFlow ? '384 → 5376' : '384 = 384';
}

function getState() {
  return {
    ...state,
    results: { ...state.results },
    surfaceResults: { ...state.surfaceResults },
    iframeHasSource: dom.frame.hasAttribute('src'),
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  };
}

dom.runA.addEventListener('click', () => runVariant('single').catch(() => {}));
dom.runB.addEventListener('click', () => runVariant('staged').catch(() => {}));
dom.runBoth.addEventListener('click', () => runComparison().catch(() => {}));
dom.unload.addEventListener('click', unload);
dom.displayMode.addEventListener('change', event => selectDisplayMode(event.target.value));
dom.emitterShape.addEventListener('change', event => selectEmitterShape(event.target.value));
window.addEventListener('beforeunload', () => adapter?.dispose());
if (!STAGED_SURFACE_CONTRACTS[state.displayMode]) state.displayMode = 'particles';
if (!['compact', 'sheet', 'curtain', 'highflow'].includes(state.emitterShape)) state.emitterShape = 'highflow';
dom.displayMode.value = state.displayMode;
dom.emitterShape.value = state.emitterShape;
dom.stagedModeLabel.textContent = stagedModeLabel(state.emitterShape, state.displayMode);
updatePresetContext();
document.body.dataset.ready = 'true';
window.__waterfallContinuity = {
  version: '1.0.0-observable-ab',
  experiment: CONTINUITY_EXPERIMENT,
  getState,
  runVariant,
  runComparison,
  selectDisplayMode,
  selectEmitterShape,
  unload,
};
