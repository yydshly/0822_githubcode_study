import { Particles4AllRuntimeAdapter } from '../../particles4all/runtime-adapter.mjs';
import { runParticles4AllScene } from '../core/particles4all-scene-contract.mjs';
import { SANDBOX_PRESETS, getSandboxPreset } from './sandbox-presets.mjs';

const $ = selector => document.querySelector(selector);
const dom = {
  tabs: $('#preset-tabs'), presetIndex: $('#preset-index'), presetEnglish: $('#preset-english'),
  title: $('#preset-title'), scenarioValue: $('#scenario-value'), observation: $('#observation'),
  bodyObject: $('#body-object'), bodyLabel: $('#body-label'), bodyShape: $('#body-shape'),
  bodyDensity: $('#body-density'), bodyRole: $('#body-role'), worldDriver: $('#world-driver'),
  solverFrame: $('#solver-frame'), solverVelocity: $('#solver-velocity'), metricLabel: $('#metric-label'),
  metricValue: $('#metric-value'), metricRotation: $('#metric-rotation'), metricGate: $('#metric-gate'),
  metricConfigurations: $('#metric-configurations'), contractHash: $('#contract-hash'),
  sourceLink: $('#source-link'), statusText: $('#runtime-status-text'), topState: $('#top-runtime-state'),
  topSolver: $('#top-solver-state'), runtimeBadge: $('#runtime-badge'), viewport: $('#physics-viewport'),
  viewportMode: $('#viewport-mode'), viewportCapability: $('#viewport-capability'), idleStep: $('#idle-step'),
  idleTitle: $('#idle-title'), idleCopy: $('#idle-copy'), runButton: $('#runtime-run'),
  clearButton: $('#runtime-clear'), unloadButton: $('#runtime-unload'), iframe: $('#runtime-frame'),
  preflightContract: $('#preflight-contract'), preflightBody: $('#preflight-body'),
  preflightParticles: $('#preflight-particles'), preflightTicks: $('#preflight-ticks'),
  guideSteps: [...document.querySelectorAll('[data-guide-step]')],
  liveState: $('#live-state'),
  liveInjected: $('#live-injected'), liveTicks: $('#live-ticks'), livePrimary: $('#live-primary'),
  liveRotation: $('#live-rotation'), liveNonFinite: $('#live-nonfinite'),
  liveProfile: $('#live-profile'), liveConclusion: $('#live-conclusion'),
  acceptanceChecks: $('#acceptance-checks'),
};

const params = new URLSearchParams(location.search);
const initialPreset = getSandboxPreset(params.get('preset'));
const state = {
  selectedId: initialPreset.id, phase: 'idle', runtimeSlots: 0, runtimeLoaded: false,
  runtimePresetId: null, maxObservedRuntimeSlots: 0, completedRuns: 0,
  activeRunSequence: null, revision: 3,
};
let adapter = null;
let lastResult = null;
let lastError = null;
const lifecycle = [];

function recordLifecycle(event, detail = {}) {
  lifecycle.push({ event, phase: state.phase, slots: state.runtimeSlots, presetId: state.selectedId, ...detail });
  if (lifecycle.length > 30) lifecycle.shift();
}

function formatNumber(value, digits = 5) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
}

function primaryValue(preset, result) {
  if (!result) return null;
  return preset.shortId === 'drift' ? result.bodyDisplacementAlongAxis : result.bodyDisplacementDeltaAlongAxis;
}

function resetLiveEvidence() {
  dom.liveState.textContent = 'WAITING';
  for (const node of [dom.liveInjected, dom.liveTicks, dom.livePrimary, dom.liveRotation, dom.liveNonFinite, dom.liveProfile]) {
    node.textContent = '—';
  }
  dom.liveConclusion.textContent = '尚未执行本次场景。点击“运行本场景”后，这里只显示当前 Particles4All Runtime 返回的证据。';
  dom.acceptanceChecks.replaceChildren();
}

function updateGuide() {
  const ranks = { idle: 0, loading: 1, ready: 2, running: 2, complete: 3, error: 1 };
  const current = ranks[state.phase] ?? 0;
  for (const item of dom.guideSteps) {
    const rank = Number(item.dataset.guideStep);
    item.dataset.status = state.phase === 'error' && rank === 1
      ? 'error'
      : rank < current || state.phase === 'complete' && rank <= current
        ? 'passed'
        : rank === current
          ? 'active'
          : 'pending';
  }
}

function renderAcceptance(result) {
  const labels = {
    injectedParticles: '粒子注入符合契约',
    solverTicks: '确定性 tick 完整',
    finitePositions: '粒子位置有限',
    bodyProfile: '原生 body 一致',
    rigidResponse: '刚体发生响应',
    directionalRigidResponse: '场景方向响应通过',
    webGpuContext: 'WebGPU Runtime 有效',
    rigidRotationResponse: 'Shape Matching 旋转通过',
  };
  const fragment = document.createDocumentFragment();
  for (const [key, passed] of Object.entries(result.acceptance)) {
    if (key === 'passed') continue;
    const item = document.createElement('li');
    item.dataset.passed = String(Boolean(passed));
    item.innerHTML = `<span>${labels[key] || key}</span><strong>${passed ? 'PASS' : 'FAIL'}</strong>`;
    fragment.append(item);
  }
  dom.acceptanceChecks.replaceChildren(fragment);
}

function renderLiveEvidence() {
  const preset = getSandboxPreset(state.selectedId);
  if (lastError) {
    dom.liveState.textContent = 'ERROR';
    dom.liveConclusion.textContent = `Runtime 未完成：${lastError.message}。请点击“卸载归零”恢复，再检查浏览器 WebGPU 能力。`;
    dom.acceptanceChecks.replaceChildren();
    return;
  }
  if (!lastResult) {
    resetLiveEvidence();
    if (state.phase === 'loading') {
      dom.liveState.textContent = 'LOADING';
      dom.liveConclusion.textContent = '正在创建唯一 Particles4All Runtime；尚未产生本次物理证据。';
    } else if (state.phase === 'running') {
      dom.liveState.textContent = 'RUNNING';
      dom.liveConclusion.textContent = 'Scene Runner 正在执行基线、注入和确定性 tick；不显示推测进度。';
    } else if (state.phase === 'ready') {
      dom.liveState.textContent = 'READY';
      dom.liveConclusion.textContent = '本次结果已清除，Particles4All Runtime 仍保留；可以重新执行同一契约或卸载归零。';
    }
    return;
  }
  const result = lastResult;
  dom.liveState.textContent = result.acceptance.passed ? 'PASSED' : 'FAILED';
  dom.liveInjected.textContent = `${result.injection.added} / ${result.injection.requested}`;
  dom.liveTicks.textContent = `${result.step.actualTicks} / ${result.step.requestedTicks}`;
  dom.livePrimary.textContent = `${formatNumber(primaryValue(preset, result))} u`;
  dom.liveRotation.textContent = Number.isFinite(result.bodyRotationDegrees)
    ? `${formatNumber(result.bodyRotationDegrees, 2)}°` : '未设 Gate';
  dom.liveNonFinite.textContent = String(result.nonFinite);
  dom.liveProfile.textContent = result.bodyProfile
    ? `${result.bodyProfile.shape} · ρ ${Number(result.bodyProfile.density).toFixed(2)}` : '—';
  dom.liveConclusion.textContent = result.acceptance.passed
    ? `当前 ${preset.contract.id} 已通过全部契约检查；这是原库 Runtime 的本次实际输出。`
    : `当前 ${preset.contract.id} 未通过全部契约检查，请查看 Runtime 与浏览器环境。`;
  renderAcceptance(result);
}

function updateRuntimeUi() {
  const preset = getSandboxPreset(state.selectedId);
  const busy = state.phase === 'loading' || state.phase === 'running';
  const active = state.runtimeSlots === 1;
  dom.viewport.dataset.phase = state.phase;
  dom.runtimeBadge.dataset.phase = state.phase;
  dom.runtimeBadge.textContent = state.phase.toUpperCase();
  dom.runButton.disabled = busy || state.phase === 'error';
  dom.runButton.textContent = state.phase === 'loading' ? '正在加载…'
    : state.phase === 'running' ? '正在执行…'
      : state.phase === 'complete' ? '重跑同一契约'
        : state.phase === 'ready' ? '重新执行契约' : '加载并运行';
  dom.clearButton.disabled = busy || !lastResult;
  dom.unloadButton.disabled = !active || busy;
  for (const tab of dom.tabs.querySelectorAll('[role="tab"]')) tab.disabled = busy;
  dom.statusText.textContent = {
    idle: `运行槽空闲 · ${preset.contract.acceptance.requiredInjectedParticles} 粒子事件已登记`,
    loading: '正在创建唯一 Particles4All Runtime…',
    ready: 'Runtime 已保留 · 本次结果已清除',
    running: `正在执行 ${preset.contract.scenario.ticks} 个确定性 tick…`,
    complete: `本次契约${lastResult?.acceptance?.passed ? '已通过' : '未通过'} · 可重跑或卸载`,
    error: 'Runtime 运行失败 · 可卸载后重试',
  }[state.phase];
  dom.topState.textContent = state.phase === 'idle' ? 'HOST SHELL READY' : `RUNTIME ${state.phase.toUpperCase()}`;
  dom.topSolver.textContent = active ? 'Solver · 1 / 1' : 'Solver · 未加载';
  dom.viewportMode.textContent = active ? 'PARTICLES4ALL RUNTIME' : 'HOST PREVIEW';
  dom.viewportCapability.textContent = state.runtimeLoaded ? 'WEBGPU DEVICE CONNECTED' : 'NO WEBGPU DEVICE CREATED';
  dom.idleStep.textContent = state.phase === 'error' ? 'RUNTIME ERROR' : 'STAGE 10 · WP2';
  dom.idleTitle.textContent = state.phase === 'error' ? '本次物理运行未完成' : '物理运行槽尚未加载';
  dom.idleCopy.textContent = state.phase === 'error'
    ? `${lastError?.message || 'Runtime 不可用。'} 请使用“卸载归零”恢复；页面没有把失败结果标为通过。`
    : '点击“运行本场景”后按需加载唯一 Particles4All Runtime；页面不会用宿主预览冒充求解结果。';
  updateGuide();
  renderLiveEvidence();
}

function setPhase(phase, detail = {}) {
  state.phase = phase;
  recordLifecycle(phase, detail);
  updateRuntimeUi();
}

function createPresetTabs() {
  const fragment = document.createDocumentFragment();
  for (const preset of SANDBOX_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-tab';
    button.id = `preset-${preset.id}`;
    button.dataset.presetId = preset.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'preset-panel');
    button.innerHTML = `
      <span>${preset.index}</span>
      <div><strong>${preset.title}</strong><small>${preset.englishTitle}</small></div>
      <i aria-hidden="true">→</i>
    `;
    button.addEventListener('click', () => selectPreset(preset.id));
    button.addEventListener('keydown', handleTabKeydown);
    fragment.append(button);
  }
  dom.tabs.append(fragment);
}

function handleTabKeydown(event) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...dom.tabs.querySelectorAll('[role="tab"]')];
  const current = tabs.indexOf(event.currentTarget);
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[nextIndex].focus();
  selectPreset(tabs[nextIndex].dataset.presetId);
}

function unloadRuntime({ reason = 'manual' } = {}) {
  if (adapter) adapter.dispose({ unload: true });
  adapter = null;
  dom.iframe.removeAttribute('src');
  state.runtimeSlots = 0;
  state.runtimeLoaded = false;
  state.runtimePresetId = null;
  state.activeRunSequence = null;
  lastResult = null;
  lastError = null;
  setPhase('idle', { reason });
  return getSnapshot();
}

function clearResult() {
  if (state.phase === 'loading' || state.phase === 'running') return getSnapshot();
  if (!lastResult && !lastError) return getSnapshot();
  lastResult = null;
  lastError = null;
  state.activeRunSequence = null;
  setPhase(state.runtimeLoaded ? 'ready' : 'idle', { reason: 'clear-result' });
  document.dispatchEvent(new CustomEvent('sandbox:resultcleared', {
    detail: { presetId: state.selectedId, runtimePreserved: state.runtimeLoaded },
  }));
  return getSnapshot();
}

function selectPreset(id, { updateUrl = true } = {}) {
  if (state.phase === 'loading' || state.phase === 'running') return getSnapshot();
  const preset = getSandboxPreset(id);
  if (preset.id !== state.selectedId && state.runtimeSlots > 0) unloadRuntime({ reason: 'preset-switch' });
  state.selectedId = preset.id;
  lastResult = null;
  lastError = null;
  document.body.dataset.preset = preset.shortId;
  for (const tab of dom.tabs.querySelectorAll('[role="tab"]')) {
    const selected = tab.dataset.presetId === preset.id;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  const body = preset.contract.localPhysics.body;
  dom.presetIndex.textContent = preset.index;
  dom.presetEnglish.textContent = preset.englishTitle;
  dom.title.textContent = preset.title;
  dom.scenarioValue.textContent = preset.scenarioValue;
  dom.observation.textContent = preset.observation;
  dom.bodyObject.dataset.shape = body.shape;
  dom.bodyLabel.textContent = preset.bodyLabel;
  dom.bodyShape.textContent = body.shape;
  dom.bodyDensity.textContent = body.density.toFixed(2);
  dom.bodyRole.textContent = body.sceneRole;
  dom.worldDriver.textContent = preset.contract.mapping.world.driver;
  dom.solverFrame.textContent = preset.contract.mapping.solver.frame;
  dom.solverVelocity.textContent = preset.solverVelocityLabel;
  dom.metricLabel.textContent = preset.primaryMetricLabel;
  dom.metricValue.textContent = preset.historicEvidence.value;
  dom.metricRotation.textContent = preset.historicEvidence.rotation;
  dom.metricGate.textContent = preset.historicEvidence.browserGate;
  dom.metricConfigurations.textContent = preset.historicEvidence.configurations;
  dom.contractHash.textContent = preset.contractHash;
  dom.sourceLink.href = preset.sourceHref;
  dom.sourceLink.textContent = `${preset.sourceLabel} ↗`;
  dom.preflightContract.textContent = preset.contract.id;
  dom.preflightBody.textContent = `${body.shape} · ρ ${body.density.toFixed(2)} · ${body.sceneRole}`;
  dom.preflightParticles.textContent = String(preset.contract.acceptance.requiredInjectedParticles);
  dom.preflightTicks.textContent = String(preset.contract.scenario.ticks);
  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set('preset', preset.shortId);
    history.replaceState({ presetId: preset.id }, '', url);
  }
  updateRuntimeUi();
  recordLifecycle('preset-selected');
  document.dispatchEvent(new CustomEvent('sandbox:presetchange', { detail: { presetId: preset.id } }));
  return getSnapshot();
}

async function ensureRuntime(preset) {
  if (adapter && state.runtimePresetId === preset.id) return adapter;
  if (adapter) unloadRuntime({ reason: 'runtime-replace' });
  lastResult = null;
  lastError = null;
  state.runtimeSlots = 1;
  state.runtimePresetId = preset.id;
  state.maxObservedRuntimeSlots = Math.max(state.maxObservedRuntimeSlots, state.runtimeSlots);
  const engineUrl = `../../particles4all/engine/?${preset.contract.localPhysics.engineQuery}`;
  dom.iframe.src = engineUrl;
  adapter = new Particles4AllRuntimeAdapter(dom.iframe, { timeoutMs: 90000 });
  setPhase('loading', { engineUrl });
  try {
    await adapter.connect();
    state.runtimeLoaded = true;
    setPhase('ready');
    return adapter;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    state.runtimeLoaded = false;
    setPhase('error');
    throw lastError;
  }
}

async function runCurrentPreset() {
  if (state.phase === 'loading' || state.phase === 'running') throw new Error('A scene run is already in progress');
  const preset = getSandboxPreset(state.selectedId);
  const runSequence = state.completedRuns + 1;
  state.activeRunSequence = runSequence;
  try {
    const runtime = await ensureRuntime(preset);
    lastResult = null;
    lastError = null;
    setPhase('running', { runSequence });
    lastResult = await runParticles4AllScene(runtime, preset.contract);
    lastError = null;
    state.completedRuns += 1;
    state.activeRunSequence = state.completedRuns;
    setPhase('complete', { passed: lastResult.acceptance.passed, runSequence: state.completedRuns });
    document.dispatchEvent(new CustomEvent('sandbox:runcomplete', {
      detail: { presetId: preset.id, passed: lastResult.acceptance.passed },
    }));
    return lastResult;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    setPhase('error', { runSequence });
    document.dispatchEvent(new CustomEvent('sandbox:runerror', {
      detail: { presetId: preset.id, message: lastError.message },
    }));
    throw lastError;
  }
}

function getSnapshot() {
  const preset = getSandboxPreset(state.selectedId);
  return {
    ...state,
    selectedPreset: {
      id: preset.id, shortId: preset.shortId, contractId: preset.contract.id,
      contractHash: preset.contractHash, nativeBody: { ...preset.contract.localPhysics.body },
      worldDriver: preset.contract.mapping.world.driver, solverFrame: preset.contract.mapping.solver.frame,
    },
    result: lastResult,
    error: lastError?.message || null,
    lifecycle: lifecycle.map(event => ({ ...event })),
    iframeHasSource: dom.iframe.hasAttribute('src'),
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  };
}

createPresetTabs();
dom.runButton.addEventListener('click', () => runCurrentPreset().catch(() => {}));
dom.clearButton.addEventListener('click', () => clearResult());
dom.unloadButton.addEventListener('click', () => unloadRuntime());
selectPreset(initialPreset.id, { updateUrl: false });
document.body.dataset.ready = 'true';
window.addEventListener('beforeunload', () => adapter?.dispose({ unload: false }));

window.__waterSandbox = {
  version: '0.3.0-guided-lifecycle',
  getState: getSnapshot,
  getPresetRegistry: () => SANDBOX_PRESETS.map(preset => ({
    id: preset.id, shortId: preset.shortId, contractId: preset.contract.id,
    contractHash: preset.contractHash, nativeBody: { ...preset.contract.localPhysics.body },
  })),
  selectPreset,
  runCurrentPreset,
  clearResult,
  unloadRuntime,
};
