import {
  WATERFALL_NEAR_FIELD_SCENE,
  WATERFALL_NEAR_FIELD_SCENE_HASH,
} from '../waterfall/waterfall-scene-contract.mjs';
import {
  RIVER_NEAR_FIELD_SCENE,
  RIVER_NEAR_FIELD_SCENE_HASH,
} from '../river/river-scene-contract.mjs';
import {
  OCEAN_NEAR_FIELD_SCENE,
  OCEAN_NEAR_FIELD_SCENE_HASH,
} from '../ocean/ocean-scene-contract.mjs';

const freezePreset = preset => Object.freeze({
  ...preset,
  historicEvidence: Object.freeze({ ...preset.historicEvidence }),
});

export const SANDBOX_PRESETS = Object.freeze([
  freezePreset({
    id: 'spillway-impact-block',
    shortId: 'impact',
    index: '01',
    title: '跌水冲击区',
    englishTitle: 'SPILLWAY IMPACT',
    scenarioValue: '观察落水对高密度局部对象产生的额外向下撞击响应。',
    observation: '重点不是对象会下落，而是注入事件相对无注入基线增加了多少沿落水方向的响应。',
    contract: WATERFALL_NEAR_FIELD_SCENE,
    contractHash: WATERFALL_NEAR_FIELD_SCENE_HASH,
    sourceHref: '../waterfall/',
    sourceLabel: '打开 Waterfall 原始场景',
    solverVelocityLabel: '(0, −2.50, 0) u/s',
    bodyLabel: '高密度冲击块',
    primaryMetricLabel: '额外向下响应',
    historicEvidence: {
      value: '0.01538 u',
      rotation: '未设旋转 Gate',
      browserGate: '19 / 19',
      configurations: 'Chrome / Edge · Intel / NVIDIA',
    },
  }),
  freezePreset({
    id: 'channel-drifting-block',
    shortId: 'drift',
    index: '02',
    title: '河道漂流区',
    englishTitle: 'CHANNEL DRIFT',
    scenarioValue: '观察低密度对象沿河道方向平移并产生 Shape Matching 姿态变化。',
    observation: '同样使用原生 box，但密度和输入方向不同；证据必须同时包含沿流位移与旋转。',
    contract: RIVER_NEAR_FIELD_SCENE,
    contractHash: RIVER_NEAR_FIELD_SCENE_HASH,
    sourceHref: '../river/',
    sourceLabel: '打开 River 原始场景',
    solverVelocityLabel: '(+2.50, 0, 0) u/s',
    bodyLabel: '低密度漂移块',
    primaryMetricLabel: '沿流位移',
    historicEvidence: {
      value: '0.24703 u',
      rotation: '14.27°',
      browserGate: '20 / 20',
      configurations: 'Chrome / Edge · Intel / NVIDIA',
    },
  }),
  freezePreset({
    id: 'surface-rescue-ring',
    shortId: 'uplift',
    index: '03',
    title: '水面浮环区',
    englishTitle: 'SURFACE RING',
    scenarioValue: '观察原生低密度 torus 受局部上升水体作用后的上举与姿态变化。',
    observation: '宏观 Ocean 只提供固定表面样本；Particles4All 负责局部粒子—浮环响应。',
    contract: OCEAN_NEAR_FIELD_SCENE,
    contractHash: OCEAN_NEAR_FIELD_SCENE_HASH,
    sourceHref: '../ocean/',
    sourceLabel: '打开 Ocean 原始场景',
    solverVelocityLabel: '(0, +4.00, 0) u/s',
    bodyLabel: '低密度原生浮环',
    primaryMetricLabel: '相对基线上举',
    historicEvidence: {
      value: '0.01528 u',
      rotation: '1.20°',
      browserGate: '20 / 20',
      configurations: 'Chrome / Edge · Intel / NVIDIA',
    },
  }),
]);

export function getSandboxPreset(id) {
  return SANDBOX_PRESETS.find(preset => preset.id === id || preset.shortId === id) || SANDBOX_PRESETS[0];
}
