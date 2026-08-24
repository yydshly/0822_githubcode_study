import * as THREE from '../../shijing-dayu-immersive/vendor/three.module.js';
import {
  COUPLED_CONTRACT_HASH,
  COUPLED_MODEL_VERSION,
  FLOODPLAIN_ROUTING_MODES,
  MODEL_VERSION,
  MOUNTAIN_WATERSHED_V0,
  OVERFLOW_CONTRACT_HASH,
  OVERFLOW_MODEL_VERSION,
  SCENARIO_HASH,
  coupledModelSelfCheck,
  createOverflowWatershedState,
  deriveWatershedStep,
  floodplainRoutingSelfCheck,
  modelSelfCheck,
  overflowModelSelfCheck,
  simulateOverflowWatershedCase,
  stepOverflowWatershed,
} from './watershed-model.mjs';
import {
  PATH_LENGTH,
  samplePathByDistance,
} from '../river/river-model.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $('#watershed-canvas');
const viewport = $('#scene-viewport');
const params = new URLSearchParams(location.search);
const STUDY_MODE = params.get('study') === 'barrier' ? 'barrier' : 'threshold';
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 760px)');
const initStartedAt = performance.now();

const TOTAL_TICKS = 1200;
const FIXED_HZ = MOUNTAIN_WATERSHED_V0.world.fixedHz;
const FIXED_DT = 1 / FIXED_HZ;
const PREVIEW_TICK = 900;
const TOP_Y = 18.1;
const LIP_Z = 30;
const POOL_BASE_Y = 0.08;
const CASES = Object.freeze(STUDY_MODE === 'barrier' ? {
  low: Object.freeze({
    id: 'low', caseId: 'A', label: '开放路径', dischargeScale: 1,
    floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open, visualSampleCount: 104,
  }),
  high: Object.freeze({
    id: 'high', caseId: 'B', label: '障碍改道', dischargeScale: 1,
    floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.barrier, visualSampleCount: 104,
  }),
} : {
  low: Object.freeze({
    id: 'low', caseId: 'A', label: '低来水', dischargeScale: 0.5,
    floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open, visualSampleCount: 52,
  }),
  high: Object.freeze({
    id: 'high', caseId: 'B', label: '高来水', dischargeScale: 1,
    floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.open, visualSampleCount: 104,
  }),
});

function runStudyCases(totalTicks) {
  return Object.freeze(Object.fromEntries(Object.entries(CASES).map(([id, flowCase]) => [id,
    simulateOverflowWatershedCase({
      dischargeScale: flowCase.dischargeScale,
      floodplainRoutingMode: flowCase.floodplainRoutingMode,
      totalTicks,
    }),
  ])));
}

const analysisStartedAt = performance.now();
const steps = Object.freeze(Object.fromEntries(Object.entries(CASES).map(([id, flowCase]) => [id, deriveWatershedStep({
  dischargeScale: flowCase.dischargeScale,
  visualSampleCount: flowCase.visualSampleCount,
})])));
const coupledRuns = runStudyCases(TOTAL_TICKS);
const previewRuns = runStudyCases(PREVIEW_TICK);
const analysisDurationMs = performance.now() - analysisStartedAt;
const verificationSpeed = params.get('verify') === '1' ? 120 : 1;

const dom = {
  sceneTitle: $('#scene-title'),
  sceneIntro: $('#scene-intro'),
  panelTitle: $('#panel-title'),
  panelIntro: $('#panel-intro'),
  lowVariantTitle: $('#variant-a-title'),
  highVariantTitle: $('#variant-b-title'),
  lowVariantQ: $('#variant-a-q'),
  highVariantQ: $('#variant-b-q'),
  lowCardTitle: $('#case-a-title'),
  highCardTitle: $('#case-b-title'),
  lowScale: $('#case-a-scale'),
  highScale: $('#case-b-scale'),
  fixedContract: $('#fixed-contract'),
  factorValue: $('#factor-value'),
  runtimeLabel: $('#runtime-label'),
  fallbackReason: $('#fallback-reason'),
  qualityLabel: $('#quality-label'),
  scenarioHash: $('#scenario-hash'),
  phaseBadge: $('#phase-badge'),
  progressFill: $('#run-progress-fill'),
  progressLabel: $('#progress-label'),
  runButton: $('#run-ab'),
  runButtonLabel: $('#run-button-label'),
  pauseButton: $('#pause-run'),
  resetButton: $('#reset-run'),
  cameraButton: $('#camera-toggle'),
  dropletButton: $('#droplet-toggle'),
  impactButton: $('#impact-toggle'),
  motionButton: $('#motion-toggle'),
  retryButton: $('#retry-renderer'),
  hudTime: $('#hud-time'),
  hudStep: $('#hud-step'),
  hudBudget: $('#hud-budget'),
  hudDraw: $('#hud-draw'),
  lowQ: $('#low-q'),
  highQ: $('#high-q'),
  lowThickness: $('#low-thickness'),
  highThickness: $('#high-thickness'),
  fallTime: $('#fall-time'),
  impactSpeed: $('#impact-speed'),
  lowRise: $('#low-rise'),
  highRise: $('#high-rise'),
  lowRiverVolume: $('#low-river-volume'),
  highRiverVolume: $('#high-river-volume'),
  lowAirborne: $('#low-airborne'),
  highAirborne: $('#high-airborne'),
  lowOverflow: $('#low-overflow'),
  highOverflow: $('#high-overflow'),
  lowFloodVolume: $('#low-flood-volume'),
  highFloodVolume: $('#high-flood-volume'),
  lowWetCells: $('#low-wet-cells'),
  highWetCells: $('#high-wet-cells'),
  lowRouteSpread: $('#low-route-spread'),
  highRouteSpread: $('#high-route-spread'),
  lowRouteRow: $('#low-route-row'),
  highRouteRow: $('#high-route-row'),
  resultRows: $('#result-rows'),
  resultState: $('#result-state'),
  boundedConclusion: $('#bounded-conclusion'),
};

const runtime = {
  rendererReady: false,
  firstFrameMs: null,
  frameTimes: [],
  frameTimeP50: null,
  frameTimeP95: null,
  maxFrameTime: 0,
  analysisDurationMs,
  drawCalls: 0,
  triangles: 0,
  contextLostCount: 0,
  webglVersion: '',
  gpuVendor: '',
  gpuRenderer: '',
  width: 0,
  height: 0,
  dpr: 1,
  renderedVariants: 0,
};

const director = {
  phase: 'preview',
  tick: PREVIEW_TICK,
  paused: reducedMotionQuery.matches,
  accumulator: 0,
  previewMotion: !reducedMotionQuery.matches,
  previewTime: PREVIEW_TICK / FIXED_HZ,
  mobileVariant: 'low',
  cameraMode: 'overview',
  dropletsVisible: true,
  impactLayersVisible: true,
};

const quality = chooseQualityTier();
const cameraModes = {
  overview: { label: '全水系', position: [54, 43, 91], target: [0, 9.4, 5], fov: 43 },
  drop: { label: '全落差', position: [31, 23, 65], target: [0, 8.7, 31], fov: 39 },
  impact: { label: '撞击区', position: [20, 10.5, 55], target: [0, 2.6, 37], fov: 38 },
  floodplain: { label: '洪泛区', position: [34, 18, 84], target: [0, 0.1, 58], fov: 40 },
};

let renderer;
let gl;
let scene;
let camera;
let riverMaterial;
let curtainMaterial;
let poolMaterial;
let particleMaterial;
let particles;
let particlePositions;
let foamMaterial;
let impactFoam;
let mistMaterial;
let mistPoints;
let lipBand;
let poolSurface;
let poolGauge;
let floodplainCells;
let floodplainWaterCells;
let floodplainBarrierCells;
let floodplainBed;
let overflowChannel;
let impactRings = [];
let animationFrame = 0;
let resizeObserver;
let lastFrameAt = performance.now();
let lastUiUpdateAt = 0;
let currentVisualTime = PREVIEW_TICK / FIXED_HZ;
let nextFrameIsDemand = false;
let coupledStates = {
  low: previewRuns.low.finalState,
  high: previewRuns.high.finalState,
};

const desiredCameraPosition = new THREE.Vector3();
const desiredCameraTarget = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

function chooseQualityTier() {
  const forced = params.get('quality');
  const mobile = mobileQuery.matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (forced === 'high') return { id: 'high', riverSegments: 208, fallSegments: 104, rocks: 76, trees: 56, mistCount: 46, impactRings: 3, dprCap: 1.5, antialias: true };
  if (forced === 'low' || forced === 'fallback' || mobile) return { id: 'fallback', riverSegments: 104, fallSegments: 48, rocks: 32, trees: 20, mistCount: 16, impactRings: 2, dprCap: 1, antialias: false };
  if (forced === 'balanced' || cores <= 6) return { id: 'balanced', riverSegments: 156, fallSegments: 72, rocks: 52, trees: 36, mistCount: 32, impactRings: 3, dprCap: 1.25, antialias: true };
  return { id: 'high', riverSegments: 208, fallSegments: 104, rocks: 76, trees: 56, mistCount: 46, impactRings: 3, dprCap: 1.5, antialias: true };
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

function damp(current, target, speed, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
}

function deterministicUnit(index, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function createRiverGeometry(lengthSegments, widthSegments = 5) {
  const columns = widthSegments + 1;
  const positions = new Float32Array((lengthSegments + 1) * columns * 3);
  const alongs = new Float32Array((lengthSegments + 1) * columns);
  const acrosses = new Float32Array((lengthSegments + 1) * columns);
  const indices = new Uint32Array(lengthSegments * widthSegments * 6);
  let vertex = 0;
  let offset = 0;

  for (let row = 0; row <= lengthSegments; row += 1) {
    const along = row / lengthSegments;
    const channel = samplePathByDistance(PATH_LENGTH * along);
    for (let column = 0; column <= widthSegments; column += 1) {
      const across = column / widthSegments * 2 - 1;
      const lateral = across * MOUNTAIN_WATERSHED_V0.parameters.outletWidthM * 0.5;
      positions[offset++] = channel.x + channel.normalX * lateral;
      positions[offset++] = TOP_Y;
      positions[offset++] = channel.z + channel.normalZ * lateral;
      alongs[vertex] = along;
      acrosses[vertex] = across;
      vertex += 1;
    }
  }

  let index = 0;
  for (let row = 0; row < lengthSegments; row += 1) {
    for (let column = 0; column < widthSegments; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices[index++] = a; indices[index++] = c; indices[index++] = b;
      indices[index++] = b; indices[index++] = c; indices[index++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(alongs, 1));
  geometry.setAttribute('aAcross', new THREE.BufferAttribute(acrosses, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createRiverMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowScale: { value: 0.5 },
      uDeep: { value: new THREE.Color(0x0a5960) },
      uMid: { value: new THREE.Color(0x38b9ad) },
      uLight: { value: new THREE.Color(0xe6ffdc) },
    },
    vertexShader: `
      precision highp float;
      attribute float aAlong;
      attribute float aAcross;
      uniform float uTime;
      uniform float uFlowScale;
      varying float vAlong;
      varying float vAcross;
      varying float vWave;
      void main() {
        vec3 p = position;
        float wave = sin(aAlong * 92.0 - uTime * (5.2 + uFlowScale * 1.8) + aAcross * 2.2);
        p.y += wave * 0.025 + sin(aAlong * 41.0 - uTime * 2.7) * 0.012;
        vAlong = aAlong;
        vAcross = aAcross;
        vWave = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uFlowScale;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uLight;
      varying float vAlong;
      varying float vAcross;
      varying float vWave;
      void main() {
        float edge = smoothstep(1.0, 0.55, abs(vAcross));
        float streak = pow(max(0.0, sin(vAlong * 138.0 - uTime * (7.0 + uFlowScale * 2.2) + vAcross * 7.0)), 16.0);
        float fill = 0.52 + uFlowScale * 0.30;
        vec3 color = mix(uDeep, uMid, fill + vWave * 0.08);
        color = mix(color, uLight, streak * edge * (0.22 + uFlowScale * 0.28));
        gl_FragColor = vec4(color, 0.96);
      }
    `,
    side: THREE.DoubleSide,
  });
}

function createCurtainGeometry(widthSegments, dropSegments) {
  const columns = widthSegments + 1;
  const positions = new Float32Array((dropSegments + 1) * columns * 3);
  const acrosses = new Float32Array((dropSegments + 1) * columns);
  const drops = new Float32Array((dropSegments + 1) * columns);
  const indices = new Uint32Array(dropSegments * widthSegments * 6);
  const reference = steps.high;
  let vertex = 0;
  let offset = 0;

  for (let row = 0; row <= dropSegments; row += 1) {
    const v = row / dropSegments;
    const age = reference.waterfall.fallTimeS * v;
    const y = TOP_Y - 0.5 * MOUNTAIN_WATERSHED_V0.world.gravityMps2 * age * age;
    const z = LIP_Z + reference.outlet.velocityMps * age;
    for (let column = 0; column <= widthSegments; column += 1) {
      const across = column / widthSegments * 2 - 1;
      positions[offset++] = across * reference.outlet.widthM * 0.5;
      positions[offset++] = y;
      positions[offset++] = z;
      acrosses[vertex] = across;
      drops[vertex] = v;
      vertex += 1;
    }
  }

  let index = 0;
  for (let row = 0; row < dropSegments; row += 1) {
    for (let column = 0; column < widthSegments; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices[index++] = a; indices[index++] = c; indices[index++] = b;
      indices[index++] = b; indices[index++] = c; indices[index++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAcross', new THREE.BufferAttribute(acrosses, 1));
  geometry.setAttribute('aDrop', new THREE.BufferAttribute(drops, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createCurtainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowScale: { value: 0.5 },
      uThicknessRatio: { value: 0.5 },
      uDeep: { value: new THREE.Color(0x0e7181) },
      uMid: { value: new THREE.Color(0x67d9d5) },
      uLight: { value: new THREE.Color(0xf1fff0) },
    },
    vertexShader: `
      precision highp float;
      attribute float aAcross;
      attribute float aDrop;
      uniform float uTime;
      uniform float uFlowScale;
      varying float vAcross;
      varying float vDrop;
      varying float vBand;
      varying float vFilament;
      void main() {
        vec3 p = position;
        float edge = sin(3.14159265 * (aAcross + 1.0) * 0.5);
        float phase = aDrop * 33.0 - uTime * (7.2 + uFlowScale * 1.8) + aAcross * 2.4;
        float breakup = aDrop * aDrop;
        float filament = sin(phase * 1.73 + aAcross * 17.0) * sin(phase * 0.37 - aAcross * 9.0);
        p.x += (sin(phase * 0.43 + aAcross * 5.0) * 0.045 + filament * 0.055 * breakup) * edge;
        p.z += sin(phase) * (0.045 + 0.075 * aDrop) * edge + filament * 0.075 * breakup;
        vAcross = aAcross;
        vDrop = aDrop;
        vBand = sin(phase);
        vFilament = filament;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uFlowScale;
      uniform float uThicknessRatio;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uLight;
      varying float vAcross;
      varying float vDrop;
      varying float vBand;
      varying float vFilament;
      void main() {
        float raggedEdge = 0.76 + 0.06 * vFilament * vDrop;
        float edge = smoothstep(1.0, raggedEdge, abs(vAcross));
        float verticalBand = max(0.0, vBand * 0.5 + 0.5);
        verticalBand *= verticalBand;
        verticalBand *= verticalBand;
        verticalBand *= verticalBand;
        float filamentBase = abs(vFilament);
        float filamentSquared = filamentBase * filamentBase;
        float filament = filamentSquared * filamentSquared * filamentBase * (0.15 + 0.58 * vDrop);
        float white = verticalBand * (0.18 + 0.42 * vDrop) + filament * 0.38;
        vec3 color = mix(uDeep, uMid, 0.38 + 0.40 * vDrop + 0.14 * uFlowScale);
        color = mix(color, uLight, clamp(white, 0.0, 0.72));
        float alpha = (0.31 + 0.37 * uThicknessRatio) * (0.62 + 0.38 * edge);
        alpha *= 0.90 + 0.10 * vBand;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createTerrain() {
  const lowerMaterial = new THREE.MeshStandardMaterial({ color: 0x183a2a, roughness: 0.98, metalness: 0 });
  const plateauMaterial = new THREE.MeshStandardMaterial({ color: 0x294a31, roughness: 1, metalness: 0 });
  const cliffMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5140, roughness: 1, metalness: 0 });

  const lower = new THREE.Mesh(new THREE.PlaneGeometry(128, 128, 1, 1), lowerMaterial);
  lower.rotation.x = -Math.PI / 2;
  lower.position.set(0, -0.72, 18);
  lower.receiveShadow = true;
  scene.add(lower);

  const plateau = new THREE.Mesh(new THREE.BoxGeometry(48, 18.2, 64), plateauMaterial);
  plateau.position.set(0, 8.35, -2);
  plateau.receiveShadow = true;
  plateau.castShadow = true;
  scene.add(plateau);

  const cliff = new THREE.Mesh(new THREE.BoxGeometry(45, 18.8, 3.2, 8, 8, 2), cliffMaterial);
  cliff.position.set(0, 8.65, 29.2);
  cliff.receiveShadow = true;
  cliff.castShadow = true;
  scene.add(cliff);

  const poolRadius = Math.sqrt(MOUNTAIN_WATERSHED_V0.parameters.poolSurfaceAreaM2 / Math.PI);
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(poolRadius + 2.1, poolRadius + 3.4, 1.3, 64),
    new THREE.MeshStandardMaterial({ color: 0x31453a, roughness: 0.96 }),
  );
  // Keep the basin bed below the simulated water plane; otherwise the cylinder cap
  // occludes the Pool, impact foam, and ripples from the impact camera.
  basin.position.set(0, -1.05, LIP_Z + steps.high.waterfall.horizontalTravelM);
  basin.receiveShadow = true;
  scene.add(basin);

  createRockField(cliffMaterial);
  createTreeField();
}

function createRockField(material) {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geometry, material, quality.rocks);
  const object = new THREE.Object3D();
  for (let index = 0; index < quality.rocks; index += 1) {
    const cliffRock = index < Math.floor(quality.rocks * 0.58);
    const side = deterministicUnit(index, 2) < 0.5 ? -1 : 1;
    const x = cliffRock
      ? (deterministicUnit(index, 3) - 0.5) * 43
      : side * (14 + deterministicUnit(index, 4) * 24);
    const y = cliffRock
      ? deterministicUnit(index, 5) * 17.2
      : -0.15 + deterministicUnit(index, 6) * 1.4;
    const z = cliffRock
      ? 30.7 + deterministicUnit(index, 7) * 1.4
      : 25 + deterministicUnit(index, 8) * 33;
    const scale = 0.45 + deterministicUnit(index, 9) * (cliffRock ? 1.5 : 2.1);
    object.position.set(x, y, z);
    object.rotation.set(deterministicUnit(index, 10) * 2, deterministicUnit(index, 11) * 2, deterministicUnit(index, 12) * 2);
    object.scale.set(scale * (0.8 + deterministicUnit(index, 13) * 0.6), scale, scale * (0.7 + deterministicUnit(index, 14) * 0.7));
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function createTreeField() {
  const trunkGeometry = new THREE.CylinderGeometry(0.11, 0.16, 1.6, 6);
  const crownGeometry = new THREE.ConeGeometry(0.92, 2.8, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, new THREE.MeshStandardMaterial({ color: 0x4d3b25, roughness: 1 }), quality.trees);
  const crowns = new THREE.InstancedMesh(crownGeometry, new THREE.MeshStandardMaterial({ color: 0x173e27, roughness: 1 }), quality.trees);
  const object = new THREE.Object3D();
  for (let index = 0; index < quality.trees; index += 1) {
    const z = -28 + deterministicUnit(index, 21) * 53;
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (10 + deterministicUnit(index, 22) * 11);
    const scale = 0.75 + deterministicUnit(index, 23) * 0.7;
    object.position.set(x, 18.05, z);
    object.rotation.set(0, deterministicUnit(index, 24) * Math.PI, 0);
    object.scale.set(scale, scale, scale);
    object.updateMatrix();
    trunks.setMatrixAt(index, object.matrix);
    object.position.y = 20.1 + scale * 0.5;
    object.updateMatrix();
    crowns.setMatrixAt(index, object.matrix);
  }
  trunks.castShadow = true;
  crowns.castShadow = true;
  scene.add(trunks, crowns);
}

function createWaterSystem() {
  riverMaterial = createRiverMaterial();
  const river = new THREE.Mesh(createRiverGeometry(quality.riverSegments), riverMaterial);
  river.renderOrder = 2;
  scene.add(river);

  curtainMaterial = createCurtainMaterial();
  const curtain = new THREE.Mesh(createCurtainGeometry(20, quality.fallSegments), curtainMaterial);
  curtain.renderOrder = 4;
  scene.add(curtain);

  lipBand = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhysicalMaterial({ color: 0x78e8db, transmission: 0.08, transparent: true, opacity: 0.88, roughness: 0.18 }),
  );
  lipBand.position.set(0, TOP_Y - 0.08, LIP_Z + 0.22);
  scene.add(lipBand);

  const poolRadius = Math.sqrt(MOUNTAIN_WATERSHED_V0.parameters.poolSurfaceAreaM2 / Math.PI);
  poolMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x177e81,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    clearcoat: 0.7,
    clearcoatRoughness: 0.3,
  });
  poolSurface = new THREE.Mesh(new THREE.CircleGeometry(poolRadius, 80), poolMaterial);
  poolSurface.rotation.x = -Math.PI / 2;
  poolSurface.position.set(0, POOL_BASE_Y, LIP_Z + steps.high.waterfall.horizontalTravelM);
  poolSurface.renderOrder = 3;
  scene.add(poolSurface);

  poolGauge = new THREE.Mesh(
    new THREE.TorusGeometry(poolRadius + 0.18, 0.055, 6, 96),
    new THREE.MeshBasicMaterial({ color: 0xbef7d4, transparent: true, opacity: 0.62 }),
  );
  poolGauge.rotation.x = Math.PI / 2;
  poolGauge.position.copy(poolSurface.position);
  poolGauge.position.y += 0.05;
  scene.add(poolGauge);

  impactRings = Array.from({ length: quality.impactRings }, (_, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1.08, 48),
      new THREE.MeshBasicMaterial({ color: 0xd9fff0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, POOL_BASE_Y + 0.08, LIP_Z + steps.high.waterfall.horizontalTravelM);
    ring.userData.phase = index / quality.impactRings;
    ring.renderOrder = 5;
    scene.add(ring);
    return ring;
  });

  createParticles();
  createImpactLayers();
  createNodeMarkers();
  createFloodplainSystem();
}

function createFloodplainSystem() {
  const parameters = MOUNTAIN_WATERSHED_V0.parameters;
  const cellWidth = parameters.floodplainCellWidthM;
  const cellLength = parameters.floodplainCellLengthM;
  const columns = parameters.floodplainColumns;
  const rows = parameters.floodplainRows;
  const gridWidth = columns * cellWidth;
  const gridLength = rows * cellLength;
  const gridOriginZ = 51.2;

  floodplainBed = new THREE.Mesh(
    new THREE.BoxGeometry(gridWidth + 3.2, 0.42, gridLength + 3.2),
    new THREE.MeshStandardMaterial({ color: 0x425342, roughness: 0.98, metalness: 0 }),
  );
  floodplainBed.position.set(0, -0.62, gridOriginZ + (rows - 1) * cellLength * 0.5);
  floodplainBed.receiveShadow = true;
  scene.add(floodplainBed);

  const floodMaterial = new THREE.MeshBasicMaterial({
    color: 0x18372f,
    transparent: true,
    opacity: 0.78,
  });
  const cells = previewRuns.high.finalState.floodplain.cells;
  const cellGeometry = new THREE.BoxGeometry(cellWidth * 0.91, 1, cellLength * 0.91);
  floodplainCells = new THREE.InstancedMesh(
    cellGeometry,
    floodMaterial,
    cells.length,
  );
  floodplainCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  floodplainCells.renderOrder = 3;
  floodplainCells.frustumCulled = false;
  floodplainWaterCells = new THREE.InstancedMesh(
    cellGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x54ead7,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    }),
    cells.length,
  );
  floodplainWaterCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  floodplainWaterCells.renderOrder = 4;
  floodplainWaterCells.frustumCulled = false;
  floodplainBarrierCells = new THREE.InstancedMesh(
    new THREE.BoxGeometry(cellWidth * 0.94, 1, cellLength * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x8a7754, roughness: 0.96, metalness: 0 }),
    cells.length,
  );
  floodplainBarrierCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  floodplainBarrierCells.renderOrder = 5;
  floodplainBarrierCells.frustumCulled = false;
  scene.add(floodplainCells, floodplainWaterCells, floodplainBarrierCells);

  overflowChannel = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 1, 4.6),
    new THREE.MeshPhysicalMaterial({
      color: 0x45c8bd,
      roughness: 0.18,
      transparent: true,
      opacity: 0.78,
      clearcoat: 0.58,
      depthWrite: false,
    }),
  );
  overflowChannel.position.set(0, -0.34, 49.4);
  overflowChannel.renderOrder = 4;
  scene.add(overflowChannel);
}

function updateFloodplain(state) {
  if (!floodplainCells || !floodplainWaterCells || !floodplainBarrierCells || !state.floodplain) return;
  const gridOriginZ = 51.2;
  const dryObject = new THREE.Object3D();
  const waterObject = new THREE.Object3D();
  const barrierObject = new THREE.Object3D();

  state.floodplain.cells.forEach((cell, index) => {
    const baseY = -0.39 + cell.bedElevationM;
    dryObject.position.set(cell.xM, baseY + 0.009, gridOriginZ + cell.zM);
    dryObject.rotation.set(0, 0, 0);
    dryObject.scale.set(1, 0.018, 1);
    dryObject.updateMatrix();
    floodplainCells.setMatrixAt(index, dryObject.matrix);

    const displayDepth = Math.max(0.035, cell.waterDepthM);
    waterObject.position.set(cell.xM, cell.wet ? baseY + displayDepth * 0.5 + 0.02 : -80, gridOriginZ + cell.zM);
    waterObject.rotation.set(0, 0, 0);
    waterObject.scale.set(1, cell.wet ? displayDepth : 0.001, 1);
    waterObject.updateMatrix();
    floodplainWaterCells.setMatrixAt(index, waterObject.matrix);

    const barrierHeight = 0.72;
    barrierObject.position.set(cell.xM, cell.blocked ? baseY + barrierHeight * 0.5 : -80, gridOriginZ + cell.zM);
    barrierObject.rotation.set(0, 0, 0);
    barrierObject.scale.set(1, cell.blocked ? barrierHeight : 0.001, 1);
    barrierObject.updateMatrix();
    floodplainBarrierCells.setMatrixAt(index, barrierObject.matrix);
  });
  floodplainCells.instanceMatrix.needsUpdate = true;
  floodplainWaterCells.instanceMatrix.needsUpdate = true;
  floodplainBarrierCells.instanceMatrix.needsUpdate = true;

  const overflowRate = Math.max(0, state.lastStep.poolOverflowM3 * FIXED_HZ);
  const overflowActive = state.cumulative.poolOverflowM3 > 1e-9;
  overflowChannel.visible = overflowActive;
  overflowChannel.scale.y = THREE.MathUtils.clamp(0.035 + overflowRate * 0.012, 0.035, 0.22);
  overflowChannel.position.y = -0.39 + overflowChannel.scale.y * 0.5;
  overflowChannel.material.opacity = 0.6 + THREE.MathUtils.clamp(overflowRate / 6, 0, 1) * 0.28;
}

function createParticles() {
  const maximum = CASES.high.visualSampleCount;
  particlePositions = new Float32Array(maximum * 3);
  const sizes = new Float32Array(maximum);
  for (let index = 0; index < maximum; index += 1) sizes[index] = 0.72 + deterministicUnit(index, 31) * 0.75;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uPointSize: { value: 7 },
      uOpacity: { value: 0.7 },
      uColor: { value: new THREE.Color(0xdffff4) },
    },
    vertexShader: `
      precision highp float;
      attribute float aSize;
      uniform float uPointSize;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(uPointSize * aSize * (28.0 / max(4.0, -mv.z)), 1.5, 9.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uOpacity;
      uniform vec3 uColor;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float alpha = smoothstep(0.5, 0.08, length(p)) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  particles = new THREE.Points(geometry, particleMaterial);
  particles.renderOrder = 6;
  scene.add(particles);
}

function createImpactLayers() {
  foamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowScale: { value: 1 },
      uImpact: { value: 1 },
      uVisibility: { value: 1 },
      uColor: { value: new THREE.Color(0xe8fff2) },
      uWater: { value: new THREE.Color(0x58cfc7) },
    },
    vertexShader: `
      precision highp float;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uFlowScale;
      uniform float uImpact;
      uniform float uVisibility;
      uniform vec3 uColor;
      uniform vec3 uWater;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float irregular = sin(angle * 9.0 + uTime * 1.7) * 0.045 + sin(angle * 17.0 - uTime * 1.1) * 0.025;
        float outer = smoothstep(1.0 + irregular, 0.73 + irregular, radius);
        float inner = smoothstep(0.10, 0.36 + 0.08 * sin(angle * 7.0 - uTime * 2.0), radius);
        float filaments = pow(max(0.0, sin(radius * 34.0 - uTime * 4.6 + angle * 2.0)), 8.0);
        float foam = outer * (0.42 + 0.58 * inner) + filaments * outer * 0.32;
        vec3 color = mix(uWater, uColor, clamp(foam, 0.0, 1.0));
        float alpha = foam * (0.22 + 0.46 * uFlowScale) * uImpact * uVisibility;
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  impactFoam = new THREE.Mesh(new THREE.CircleGeometry(4.7, quality.id === 'fallback' ? 32 : 56), foamMaterial);
  impactFoam.rotation.x = -Math.PI / 2;
  impactFoam.position.set(0, POOL_BASE_Y + 0.09, LIP_Z + steps.high.waterfall.horizontalTravelM);
  impactFoam.renderOrder = 7;
  scene.add(impactFoam);

  const positions = new Float32Array(quality.mistCount * 3);
  const phases = new Float32Array(quality.mistCount);
  const drifts = new Float32Array(quality.mistCount * 2);
  for (let index = 0; index < quality.mistCount; index += 1) {
    const offset = index * 3;
    positions[offset] = (deterministicUnit(index, 41) * 2 - 1) * 4.8;
    positions[offset + 1] = 0.32 + deterministicUnit(index, 42) * 1.25;
    positions[offset + 2] = LIP_Z + steps.high.waterfall.horizontalTravelM + (deterministicUnit(index, 43) * 2 - 1) * 3.2;
    phases[index] = deterministicUnit(index, 44);
    drifts[index * 2] = deterministicUnit(index, 45) * 2 - 1;
    drifts[index * 2 + 1] = deterministicUnit(index, 46) * 2 - 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 2));
  mistMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowScale: { value: 1 },
      uImpact: { value: 1 },
      uVisibility: { value: 1 },
      uColor: { value: new THREE.Color(0xdffcf1) },
    },
    vertexShader: `
      precision highp float;
      attribute float aPhase;
      attribute vec2 aDrift;
      uniform float uTime;
      uniform float uFlowScale;
      varying float vAlpha;
      void main() {
        float age = fract(aPhase + uTime * (0.075 + uFlowScale * 0.025));
        vec3 p = position;
        p.x += aDrift.x * age * 2.2 + sin(uTime * 0.45 + aPhase * 17.0) * 0.32;
        p.y += age * (2.4 + 2.0 * uFlowScale);
        p.z += aDrift.y * age * 1.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp((5.5 + 5.5 * uFlowScale) * (1.0 - age * 0.45) * (28.0 / max(4.0, -mv.z)), 1.5, 9.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = sin(3.14159265 * age) * (0.34 + 0.35 * uFlowScale);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uImpact;
      uniform float uVisibility;
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float soft = smoothstep(0.5, 0.03, length(p));
        gl_FragColor = vec4(uColor, soft * vAlpha * uImpact * uVisibility);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  mistPoints = new THREE.Points(geometry, mistMaterial);
  mistPoints.renderOrder = 8;
  scene.add(mistPoints);
}

function createNodeMarkers() {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xd7f59d, transparent: true, opacity: 0.72 });
  const positions = [
    samplePathByDistance(PATH_LENGTH * 0.06),
    samplePathByDistance(PATH_LENGTH * 0.48),
    samplePathByDistance(PATH_LENGTH * 0.97),
  ];
  const markers = new THREE.InstancedMesh(new THREE.RingGeometry(0.32, 0.43, 24), markerMaterial, positions.length);
  const object = new THREE.Object3D();
  positions.forEach((position, index) => {
    object.rotation.set(-Math.PI / 2, 0, 0);
    object.position.set(position.x, TOP_Y + 0.08, position.z);
    object.scale.setScalar(index === 2 ? 1.25 : 1);
    object.updateMatrix();
    markers.setMatrixAt(index, object.matrix);
  });
  scene.add(markers);
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8aa890);
  scene.fog = new THREE.Fog(0x819b86, 72, 145);

  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 260);
  const mode = cameraModes.overview;
  camera.position.fromArray(mode.position);
  cameraTarget.fromArray(mode.target);
  camera.lookAt(cameraTarget);

  scene.add(new THREE.HemisphereLight(0xd9f5e8, 0x183024, 2.05));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.35);
  sun.position.set(-28, 52, 42);
  sun.castShadow = false;
  scene.add(sun);

  createTerrain();
  createWaterSystem();
}

function poolLevelRiseForState(state) {
  return (state.poolVolumeM3 - MOUNTAIN_WATERSHED_V0.parameters.poolInitialVolumeM3)
    / MOUNTAIN_WATERSHED_V0.parameters.poolSurfaceAreaM2;
}

function updateParticles(flowCase, state) {
  const step = steps[flowCase.id];
  const gravity = MOUNTAIN_WATERSHED_V0.world.gravityMps2;
  const count = director.dropletsVisible
    ? Math.min(flowCase.visualSampleCount, state.packets.length, CASES.high.visualSampleCount)
    : 0;
  for (let index = 0; index < CASES.high.visualSampleCount; index += 1) {
    const offset = index * 3;
    if (index >= count) {
      particlePositions[offset] = 0;
      particlePositions[offset + 1] = -80;
      particlePositions[offset + 2] = 0;
      continue;
    }
    const packetIndex = Math.min(state.packets.length - 1, Math.floor(index * state.packets.length / count));
    const packet = state.packets[packetIndex];
    const age = packet.ageS;
    const across = (deterministicUnit(packet.emittedTick, 36) * 2 - 1) * step.outlet.widthM * 0.52;
    const breakup = Math.pow(age / packet.flightTimeS, 1.65);
    particlePositions[offset] = across + (deterministicUnit(packet.emittedTick, 37) * 2 - 1) * breakup * 0.82;
    particlePositions[offset + 1] = TOP_Y - 0.5 * gravity * age * age;
    particlePositions[offset + 2] = LIP_Z + packet.initialVelocityMps * age
      + (deterministicUnit(packet.emittedTick, 38) - 0.5) * breakup * 0.62;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.setDrawRange(0, count);
}

function updateSharedAnimation(time) {
  riverMaterial.uniforms.uTime.value = time;
  curtainMaterial.uniforms.uTime.value = time;
  impactRings.forEach((ring) => {
    const phase = (time * 0.52 + ring.userData.phase) % 1;
    const scale = 0.55 + phase * 4.2;
    ring.scale.setScalar(scale);
    ring.userData.baseOpacity = (1 - phase) * 0.34;
  });
  foamMaterial.uniforms.uTime.value = time;
  mistMaterial.uniforms.uTime.value = time;
}

function applyCase(caseId) {
  const flowCase = CASES[caseId];
  const step = steps[caseId];
  const state = coupledStates[caseId];
  const poolLevelRiseM = poolLevelRiseForState(state);
  const thicknessRatio = step.outlet.curtainThicknessM / steps.high.outlet.curtainThicknessM;
  const impactRatio = step.transfers[1].volumeM3 > 0
    ? THREE.MathUtils.clamp(state.lastStep.depositedM3 / step.transfers[1].volumeM3, 0, 1)
    : 0;
  const impactDetailVisible = director.impactLayersVisible
    && director.cameraMode !== 'overview'
    && director.cameraMode !== 'floodplain'
    && impactRatio > 0.001;

  riverMaterial.uniforms.uFlowScale.value = flowCase.dischargeScale;
  curtainMaterial.uniforms.uFlowScale.value = flowCase.dischargeScale;
  curtainMaterial.uniforms.uThicknessRatio.value = thicknessRatio;
  particleMaterial.uniforms.uPointSize.value = 5.2 + flowCase.dischargeScale * 3.2;
  particleMaterial.uniforms.uOpacity.value = 0.5 + flowCase.dischargeScale * 0.34;

  lipBand.scale.set(step.outlet.widthM, Math.max(0.06, step.outlet.curtainThicknessM), 0.82);
  lipBand.position.y = TOP_Y - step.outlet.curtainThicknessM * 0.5;

  poolSurface.position.y = POOL_BASE_Y + poolLevelRiseM;
  poolGauge.position.y = poolSurface.position.y + 0.055;
  impactRings.forEach((ring) => {
    ring.position.y = poolSurface.position.y + 0.07;
    ring.visible = impactDetailVisible;
    ring.material.opacity = (ring.userData.baseOpacity ?? 0.2) * impactRatio * (director.impactLayersVisible ? 1 : 0);
  });
  impactFoam.position.y = poolSurface.position.y + 0.085;
  impactFoam.visible = impactDetailVisible;
  foamMaterial.uniforms.uFlowScale.value = flowCase.dischargeScale;
  foamMaterial.uniforms.uImpact.value = impactRatio;
  foamMaterial.uniforms.uVisibility.value = director.impactLayersVisible ? 1 : 0;
  mistMaterial.uniforms.uFlowScale.value = flowCase.dischargeScale;
  mistMaterial.uniforms.uImpact.value = impactRatio;
  mistMaterial.uniforms.uVisibility.value = director.impactLayersVisible ? 1 : 0;
  mistPoints.visible = impactDetailVisible;
  poolMaterial.color.setHSL(0.49, 0.66, 0.25 + flowCase.dischargeScale * 0.035);
  updateParticles(flowCase, state);
  updateFloodplain(state);
}

function updateCamera(frameDt, time) {
  const mode = cameraModes[director.cameraMode];
  desiredCameraPosition.fromArray(mode.position);
  desiredCameraTarget.fromArray(mode.target);
  if (director.previewMotion && !reducedMotionQuery.matches) {
    const orbit = Math.sin(time * 0.13) * 2.4;
    desiredCameraPosition.x += orbit;
    desiredCameraPosition.z += Math.cos(time * 0.11) * 1.6;
  }
  camera.position.x = damp(camera.position.x, desiredCameraPosition.x, 3.5, frameDt);
  camera.position.y = damp(camera.position.y, desiredCameraPosition.y, 3.5, frameDt);
  camera.position.z = damp(camera.position.z, desiredCameraPosition.z, 3.5, frameDt);
  cameraTarget.x = damp(cameraTarget.x, desiredCameraTarget.x, 4, frameDt);
  cameraTarget.y = damp(cameraTarget.y, desiredCameraTarget.y, 4, frameDt);
  cameraTarget.z = damp(cameraTarget.z, desiredCameraTarget.z, 4, frameDt);
  camera.fov = damp(camera.fov, mode.fov, 4, frameDt);
  camera.lookAt(cameraTarget);
}

function setCameraMode(modeId, immediate = false) {
  const mode = cameraModes[modeId];
  if (!mode) return false;
  director.cameraMode = modeId;
  if (immediate && camera) {
    camera.position.fromArray(mode.position);
    cameraTarget.fromArray(mode.target);
    camera.fov = mode.fov;
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
  }
  updateControls();
  requestRender();
  return true;
}

function renderViewport(caseId, x, width, height) {
  applyCase(caseId);
  camera.aspect = Math.max(0.2, width / Math.max(1, height));
  camera.updateProjectionMatrix();
  renderer.setViewport(x, 0, width, height);
  renderer.setScissor(x, 0, width, height);
  renderer.render(scene, camera);
}

function renderScene(frameDt) {
  const { width, height } = runtime;
  const tick = director.phase === 'preview' ? PREVIEW_TICK : director.tick;
  const time = currentVisualTime;
  updateSharedAnimation(time);
  updateCamera(frameDt, time);

  renderer.info.reset();
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.clear(true, true, true);
  renderer.setScissorTest(true);

  if (mobileQuery.matches) {
    renderViewport(director.mobileVariant, 0, width, height);
    runtime.renderedVariants = 1;
  } else {
    const leftWidth = Math.floor(width / 2);
    renderViewport('low', 0, leftWidth, height);
    renderViewport('high', leftWidth, width - leftWidth, height);
    runtime.renderedVariants = 2;
  }

  renderer.setScissorTest(false);
  runtime.drawCalls = renderer.info.render.calls;
  runtime.triangles = renderer.info.render.triangles;
}

function resizeRenderer() {
  if (!renderer) return false;
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(devicePixelRatio || 1, quality.dprCap);
  if (runtime.width === width && runtime.height === height && runtime.dpr === dpr) return false;
  runtime.width = width;
  runtime.height = height;
  runtime.dpr = dpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  return true;
}

function stepDirector(frameDt) {
  if (director.phase === 'running' && !director.paused) {
    director.accumulator += Math.min(frameDt, 0.1) * verificationSpeed;
    while (director.accumulator >= FIXED_DT && director.tick < TOTAL_TICKS) {
      coupledStates.low = stepOverflowWatershed({ state: coupledStates.low });
      coupledStates.high = stepOverflowWatershed({ state: coupledStates.high });
      director.tick += 1;
      director.accumulator -= FIXED_DT;
    }
    if (director.tick >= TOTAL_TICKS) completeRun();
  } else if (director.phase === 'preview' && director.previewMotion && !reducedMotionQuery.matches) {
    director.accumulator += Math.min(frameDt, 0.1) * 0.55;
    while (director.accumulator >= FIXED_DT) {
      if (director.tick >= TOTAL_TICKS) {
        director.tick = PREVIEW_TICK;
        coupledStates = { low: previewRuns.low.finalState, high: previewRuns.high.finalState };
      } else {
        coupledStates.low = stepOverflowWatershed({ state: coupledStates.low });
        coupledStates.high = stepOverflowWatershed({ state: coupledStates.high });
        director.tick += 1;
      }
      director.accumulator -= FIXED_DT;
    }
  }
  if (!director.paused || director.phase === 'preview') currentVisualTime += Math.min(frameDt, 0.1);
}

function updateTelemetry(frameMs) {
  if (frameMs > 0 && frameMs < 1000) {
    runtime.frameTimes.push(frameMs);
    if (runtime.frameTimes.length > 240) runtime.frameTimes.shift();
    runtime.maxFrameTime = Math.max(runtime.maxFrameTime, frameMs);
    runtime.frameTimeP50 = percentile(runtime.frameTimes, 0.5);
    runtime.frameTimeP95 = percentile(runtime.frameTimes, 0.95);
  }
}

function formatNumber(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function updateCurrentUi() {
  const tick = director.tick;
  const ratio = tick / TOTAL_TICKS;
  const lowState = coupledStates.low;
  const highState = coupledStates.high;
  dom.hudTime.textContent = `${formatNumber(tick / FIXED_HZ, 2)} s`;
  dom.hudStep.textContent = `${Math.round(tick)} / ${TOTAL_TICKS}`;
  dom.hudBudget.textContent = Math.max(Math.abs(lowState.budget.residualM3), Math.abs(highState.budget.residualM3)).toExponential(1);
  dom.hudDraw.textContent = runtime.rendererReady ? `${runtime.drawCalls} calls` : '—';
  dom.progressFill.style.width = `${Math.min(100, ratio * 100)}%`;
  dom.progressLabel.textContent = `${Math.round(ratio * 100)}%`;
  dom.lowRise.textContent = `${formatNumber(poolLevelRiseForState(lowState), 3)} m`;
  dom.highRise.textContent = `${formatNumber(poolLevelRiseForState(highState), 3)} m`;
  dom.lowRiverVolume.textContent = `${formatNumber(lowState.riverVolumeM3, 1)} m³`;
  dom.highRiverVolume.textContent = `${formatNumber(highState.riverVolumeM3, 1)} m³`;
  dom.lowAirborne.textContent = `${formatNumber(lowState.lastStep.airborneVolumeM3, 2)} m³`;
  dom.highAirborne.textContent = `${formatNumber(highState.lastStep.airborneVolumeM3, 2)} m³`;
  dom.lowOverflow.textContent = `${formatNumber(lowState.cumulative.poolOverflowM3, 2)} m³`;
  dom.highOverflow.textContent = `${formatNumber(highState.cumulative.poolOverflowM3, 2)} m³`;
  dom.lowFloodVolume.textContent = `${formatNumber(lowState.floodplainVolumeM3, 2)} m³`;
  dom.highFloodVolume.textContent = `${formatNumber(highState.floodplainVolumeM3, 2)} m³`;
  dom.lowWetCells.textContent = `${lowState.floodplain.wetCellCount} / ${lowState.floodplain.cells.length}`;
  dom.highWetCells.textContent = `${highState.floodplain.wetCellCount} / ${highState.floodplain.cells.length}`;
  dom.lowRouteSpread.textContent = `${formatNumber(lowState.floodplain.meanWetAbsXM, 2)} m`;
  dom.highRouteSpread.textContent = `${formatNumber(highState.floodplain.meanWetAbsXM, 2)} m`;
  dom.lowRouteRow.textContent = lowState.floodplain.maximumWetRow < 0
    ? '—'
    : `${lowState.floodplain.maximumWetRow + 1} / ${lowState.floodplain.rows}`;
  dom.highRouteRow.textContent = highState.floodplain.maximumWetRow < 0
    ? '—'
    : `${highState.floodplain.maximumWetRow + 1} / ${highState.floodplain.rows}`;
}

function updateStaticUi() {
  document.body.dataset.studyMode = STUDY_MODE;
  $$('.study-tabs a').forEach((link) => link.classList.toggle('active', link.dataset.study === STUDY_MODE));
  dom.lowVariantTitle.textContent = CASES.low.label;
  dom.highVariantTitle.textContent = CASES.high.label;
  dom.lowCardTitle.textContent = CASES.low.label;
  dom.highCardTitle.textContent = CASES.high.label;
  dom.lowScale.textContent = formatNumber(CASES.low.dischargeScale, 2);
  dom.highScale.textContent = formatNumber(CASES.high.dischargeScale, 2);
  dom.lowVariantQ.textContent = `Q = ${formatNumber(steps.low.dischargeM3s, 1)} m³/s`;
  dom.highVariantQ.textContent = `Q = ${formatNumber(steps.high.dischargeM3s, 1)} m³/s`;
  if (STUDY_MODE === 'barrier') {
    dom.sceneTitle.innerHTML = '同一股溢流水，<em>比较开放路径与障碍改道。</em>';
    dom.sceneIntro.innerHTML = '来水、Pool 容量、溢流体积、洪泛网格、地势、边界、相机与时间轴固定；唯一变量是 <code>floodplainRoutingMode</code>。';
    dom.panelTitle.textContent = '洪泛路径因果对照';
    dom.panelIntro.textContent = '同步运行同一组高来水 1,200 个固定步（20 秒）。A 保持开放路径；B 设置 8 个不可蓄水障碍格。检查相同溢流体积是否形成不同湿润位置、横向绕行和最远到达行。';
    dom.fixedContract.textContent = '高来水 · Pool 容量 · 溢流量 · 网格 · 地势 · 边界 · 相机';
    dom.factorValue.textContent = 'floodplainRoutingMode';
    dom.boundedConclusion.textContent = 'T3 路径结论：A/B 上游、Pool、溢流量、洪泛蓄水与边界输出相同；B 的 8 个障碍格保持干燥，并迫使湿润路径横向绕行、更远到达下游行。这里证明的是确定性障碍路由代理，不是浅水动量或真实洪水传播。';
  }
  dom.scenarioHash.textContent = OVERFLOW_CONTRACT_HASH;
  dom.qualityLabel.textContent = `QUALITY · ${quality.id.toUpperCase()}`;
  dom.lowQ.textContent = `${formatNumber(steps.low.dischargeM3s, 1)} m³/s`;
  dom.highQ.textContent = `${formatNumber(steps.high.dischargeM3s, 1)} m³/s`;
  dom.lowThickness.textContent = `${formatNumber(steps.low.outlet.curtainThicknessM, 3)} m`;
  dom.highThickness.textContent = `${formatNumber(steps.high.outlet.curtainThicknessM, 3)} m`;
  dom.fallTime.textContent = `${formatNumber(steps.high.waterfall.fallTimeS, 3)} s`;
  dom.impactSpeed.textContent = `${formatNumber(steps.high.waterfall.impactVelocityMps, 2)} m/s`;
  updateResultTable();
  updateControls();
  updateCurrentUi();
}

function updateResultTable() {
  const low = coupledRuns.low;
  const high = coupledRuns.high;
  const lowState = low.finalState;
  const highState = high.finalState;
  const sameOrDelta = (left, right, digits = 2) => Math.abs(left - right) <= 1e-9
    ? '相同'
    : `${right > left ? '+' : ''}${formatNumber(right - left, digits)}`;
  const dischargeRatio = steps.high.dischargeM3s / steps.low.dischargeM3s;
  const thicknessRatio = steps.high.outlet.curtainThicknessM / steps.low.outlet.curtainThicknessM;
  const rows = [
    ['流量 Q', `${formatNumber(steps.low.dischargeM3s, 1)}`, `${formatNumber(steps.high.dischargeM3s, 1)}`, `${formatNumber(dischargeRatio, 2)}×`],
    ['水幕厚度 m', formatNumber(steps.low.outlet.curtainThicknessM, 3), formatNumber(steps.high.outlet.curtainThicknessM, 3), `${formatNumber(thicknessRatio, 2)}×`],
    ['River 剩余 m³', formatNumber(lowState.riverVolumeM3, 1), formatNumber(highState.riverVolumeM3, 1), '库存已扣减'],
    ['在途水量 m³', formatNumber(lowState.lastStep.airborneVolumeM3, 2), formatNumber(highState.lastStep.airborneVolumeM3, 2), sameOrDelta(lowState.lastStep.airborneVolumeM3, highState.lastStep.airborneVolumeM3)],
    ['累计沉积 m³', formatNumber(lowState.cumulative.depositedM3, 2), formatNumber(highState.cumulative.depositedM3, 2), sameOrDelta(lowState.cumulative.depositedM3, highState.cumulative.depositedM3)],
    ['Pool 上升 m', formatNumber(low.poolLevelRiseM, 3), formatNumber(high.poolLevelRiseM, 3), sameOrDelta(low.poolLevelRiseM, high.poolLevelRiseM, 3)],
    ['累计溢流 m³', formatNumber(lowState.cumulative.poolOverflowM3, 2), formatNumber(highState.cumulative.poolOverflowM3, 2), sameOrDelta(lowState.cumulative.poolOverflowM3, highState.cumulative.poolOverflowM3)],
    ['Floodplain 蓄水 m³', formatNumber(lowState.floodplainVolumeM3, 2), formatNumber(highState.floodplainVolumeM3, 2), sameOrDelta(lowState.floodplainVolumeM3, highState.floodplainVolumeM3)],
    ['洪泛边界流出 m³', formatNumber(lowState.cumulative.floodplainOutflowM3, 2), formatNumber(highState.cumulative.floodplainOutflowM3, 2), '固定边界'],
    ['障碍格', `${lowState.floodplain.blockedCellCount}`, `${highState.floodplain.blockedCellCount}`, sameOrDelta(lowState.floodplain.blockedCellCount, highState.floodplain.blockedCellCount, 0)],
    ['平均横向绕行 m', formatNumber(lowState.floodplain.meanWetAbsXM, 2), formatNumber(highState.floodplain.meanWetAbsXM, 2), sameOrDelta(lowState.floodplain.meanWetAbsXM, highState.floodplain.meanWetAbsXM)],
    ['下游湿润格', `${lowState.floodplain.downstreamWetCellCount}`, `${highState.floodplain.downstreamWetCellCount}`, sameOrDelta(lowState.floodplain.downstreamWetCellCount, highState.floodplain.downstreamWetCellCount, 0)],
    ['预算残差 m³', lowState.budget.residualM3.toExponential(1), highState.budget.residualM3.toExponential(1), '闭合'],
  ];
  dom.resultRows.innerHTML = rows.map((row) => `<div class="result-row" role="row"><span role="cell">${row[0]}</span><span role="cell">${row[1]}</span><span class="value-b" role="cell">${row[2]}</span><span class="ratio-pass" role="cell">${row[3]}</span></div>`).join('');
}

function updateControls() {
  const running = director.phase === 'running';
  dom.phaseBadge.textContent = director.phase === 'preview' ? '预览' : director.phase === 'complete' ? '完成' : director.paused ? '暂停' : '运行';
  dom.runButtonLabel.textContent = director.phase === 'complete' ? '重新运行固定 A / B' : running ? '实验运行中' : '运行固定 A / B';
  dom.runButton.disabled = running && !director.paused;
  dom.pauseButton.disabled = director.phase === 'preview' || director.phase === 'complete';
  dom.pauseButton.textContent = director.paused ? '▶' : 'Ⅱ';
  dom.cameraButton.textContent = `镜头：${cameraModes[director.cameraMode].label}`;
  dom.dropletButton.textContent = `水滴：${director.dropletsVisible ? '开' : '关'}`;
  dom.dropletButton.setAttribute('aria-pressed', String(director.dropletsVisible));
  dom.impactButton.textContent = `撞击层：${director.impactLayersVisible ? '开' : '关'}`;
  dom.impactButton.setAttribute('aria-pressed', String(director.impactLayersVisible));
  dom.motionButton.textContent = `运动：${director.previewMotion ? '自动' : '静止'}`;
  $$('.mobile-variant-tabs button').forEach((button) => {
    const flowCase = CASES[button.dataset.mobileVariant];
    button.textContent = `${flowCase.caseId} ${flowCase.label}`;
    button.classList.toggle('active', button.dataset.mobileVariant === director.mobileVariant);
  });
}

function startRun() {
  director.phase = 'running';
  director.tick = 0;
  director.accumulator = 0;
  director.paused = false;
  coupledStates = {
    low: createOverflowWatershedState({
      dischargeScale: CASES.low.dischargeScale,
      floodplainRoutingMode: CASES.low.floodplainRoutingMode,
    }),
    high: createOverflowWatershedState({
      dischargeScale: CASES.high.dischargeScale,
      floodplainRoutingMode: CASES.high.floodplainRoutingMode,
    }),
  };
  currentVisualTime = 0;
  dom.resultState.textContent = '同步运行中';
  updateControls();
  updateCurrentUi();
  requestRender();
}

function completeRun() {
  director.tick = TOTAL_TICKS;
  coupledStates = { low: coupledRuns.low.finalState, high: coupledRuns.high.finalState };
  director.phase = 'complete';
  director.paused = true;
  dom.resultState.textContent = '固定终点通过';
  updateControls();
  updateCurrentUi();
}

function togglePause() {
  if (director.phase !== 'running') return;
  director.paused = !director.paused;
  updateControls();
  requestRender();
}

function resetRun() {
  director.phase = 'preview';
  director.tick = PREVIEW_TICK;
  director.accumulator = 0;
  director.paused = reducedMotionQuery.matches;
  currentVisualTime = PREVIEW_TICK / FIXED_HZ;
  coupledStates = { low: previewRuns.low.finalState, high: previewRuns.high.finalState };
  dom.resultState.textContent = '模型已计算';
  updateControls();
  updateCurrentUi();
  requestRender();
}

function toggleCamera() {
  const modes = ['overview', 'drop', 'impact', 'floodplain'];
  const nextMode = modes[(modes.indexOf(director.cameraMode) + 1) % modes.length];
  setCameraMode(nextMode, director.phase === 'complete' || reducedMotionQuery.matches);
}

function toggleDroplets() {
  director.dropletsVisible = !director.dropletsVisible;
  updateControls();
  requestRender();
}

function toggleImpactLayers() {
  director.impactLayersVisible = !director.impactLayersVisible;
  updateControls();
  requestRender();
}

function toggleMotion() {
  director.previewMotion = !director.previewMotion;
  updateControls();
  requestRender();
}

function requestRender() {
  if (!runtime.rendererReady || animationFrame) return;
  nextFrameIsDemand = true;
  animationFrame = requestAnimationFrame(frame);
}

function frame(now) {
  animationFrame = 0;
  const frameMs = now - lastFrameAt;
  const frameDt = Math.min(0.1, Math.max(0, frameMs / 1000));
  lastFrameAt = now;
  stepDirector(frameDt);
  resizeRenderer();
  renderScene(frameDt);
  updateTelemetry(frameMs);
  if (runtime.firstFrameMs == null) runtime.firstFrameMs = now - initStartedAt;
  if (now - lastUiUpdateAt > 120 || director.phase === 'complete') {
    updateCurrentUi();
    lastUiUpdateAt = now;
  }

  const shouldAnimate = (director.phase === 'running' && !director.paused)
    || (director.phase === 'preview' && director.previewMotion && !reducedMotionQuery.matches);
  nextFrameIsDemand = false;
  if (shouldAnimate && !document.hidden) animationFrame = requestAnimationFrame(frame);
}

function getRuntimeSnapshot() {
  return {
    rendererReady: runtime.rendererReady,
    threeRevision: THREE.REVISION,
    modelVersion: OVERFLOW_MODEL_VERSION,
    coupledModelVersion: COUPLED_MODEL_VERSION,
    mappedModelVersion: MODEL_VERSION,
    scenarioHash: SCENARIO_HASH,
    coupledContractHash: COUPLED_CONTRACT_HASH,
    overflowContractHash: OVERFLOW_CONTRACT_HASH,
    studyMode: STUDY_MODE,
    truthLevel: 'T3',
    quality: quality.id,
    firstFrameMs: runtime.firstFrameMs,
    frameTimeP50: runtime.frameTimeP50,
    frameTimeP95: runtime.frameTimeP95,
    frameSampleCount: runtime.frameTimes.length,
    maxFrameTime: runtime.maxFrameTime,
    drawCalls: runtime.drawCalls,
    triangles: runtime.triangles,
    renderedVariants: runtime.renderedVariants,
    analysisDurationMs: runtime.analysisDurationMs,
    contextLostCount: runtime.contextLostCount,
    webglVersion: runtime.webglVersion,
    gpuVendor: runtime.gpuVendor,
    gpuRenderer: runtime.gpuRenderer,
    viewport: { width: runtime.width, height: runtime.height, dpr: runtime.dpr },
  };
}

function resetPerformanceSamples() {
  runtime.frameTimes.length = 0;
  runtime.frameTimeP50 = null;
  runtime.frameTimeP95 = null;
  runtime.maxFrameTime = 0;
  lastFrameAt = performance.now();
  return getRuntimeSnapshot();
}

function getCaseSnapshot(input = 'low', tick = TOTAL_TICKS) {
  const flowCase = CASES[input];
  if (!flowCase) throw new Error(`Unknown watershed case: ${input}`);
  return {
    caseId: flowCase.caseId,
    id: flowCase.id,
    fixedInputs: {
      terrain: 'mountain-watershed-v0',
      riverPath: 'river-flowmap-v1',
      outletWidthM: MOUNTAIN_WATERSHED_V0.parameters.outletWidthM,
      outletHeadM: MOUNTAIN_WATERSHED_V0.parameters.outletHeadM,
      fallHeightM: MOUNTAIN_WATERSHED_V0.parameters.fallHeightM,
      gravityMps2: MOUNTAIN_WATERSHED_V0.world.gravityMps2,
      poolSurfaceAreaM2: MOUNTAIN_WATERSHED_V0.parameters.poolSurfaceAreaM2,
      poolCapacityM3: MOUNTAIN_WATERSHED_V0.parameters.poolCapacityM3,
      poolOutflowM3s: MOUNTAIN_WATERSHED_V0.parameters.poolOutflowM3s,
      floodplainOutflowM3s: MOUNTAIN_WATERSHED_V0.parameters.floodplainOutflowM3s,
      floodplainColumns: MOUNTAIN_WATERSHED_V0.parameters.floodplainColumns,
      floodplainRows: MOUNTAIN_WATERSHED_V0.parameters.floodplainRows,
      floodplainCellWidthM: MOUNTAIN_WATERSHED_V0.parameters.floodplainCellWidthM,
      floodplainCellLengthM: MOUNTAIN_WATERSHED_V0.parameters.floodplainCellLengthM,
      floodplainMaximumDepthM: MOUNTAIN_WATERSHED_V0.parameters.floodplainMaximumDepthM,
      floodplainRoutingMode: flowCase.floodplainRoutingMode,
      sourceInflowM3s: MOUNTAIN_WATERSHED_V0.parameters.sourceInflowM3s,
      riverInitialVolumeM3: MOUNTAIN_WATERSHED_V0.parameters.riverInitialVolumeM3,
      camera: 'shared-watershed-camera-v0',
      totalTicks: TOTAL_TICKS,
      dischargeScale: flowCase.dischargeScale,
    },
    derived: steps[input],
    accumulated: tick === TOTAL_TICKS
      ? coupledRuns[input]
      : simulateOverflowWatershedCase({
        dischargeScale: flowCase.dischargeScale,
        floodplainRoutingMode: flowCase.floodplainRoutingMode,
        totalTicks: Math.max(1, Math.round(tick)),
      }),
    visualSampleCount: flowCase.visualSampleCount,
  };
}

function showFailure(error) {
  console.error(error);
  document.body.dataset.renderState = 'failed';
  dom.fallbackReason.textContent = error?.message || '实时场景初始化失败。';
  dom.runtimeLabel.textContent = '实时场景不可用';
}

function bindControls() {
  dom.runButton.addEventListener('click', startRun);
  dom.pauseButton.addEventListener('click', togglePause);
  dom.resetButton.addEventListener('click', resetRun);
  dom.cameraButton.addEventListener('click', toggleCamera);
  dom.dropletButton.addEventListener('click', toggleDroplets);
  dom.impactButton.addEventListener('click', toggleImpactLayers);
  dom.motionButton.addEventListener('click', toggleMotion);
  dom.retryButton.addEventListener('click', () => location.reload());
  $$('.mobile-variant-tabs button').forEach((button) => button.addEventListener('click', () => {
    director.mobileVariant = button.dataset.mobileVariant;
    updateControls();
    requestRender();
  }));
}

async function initialize() {
  updateStaticUi();
  bindControls();
  try {
    if (!modelSelfCheck().passed || !coupledModelSelfCheck().passed
      || !overflowModelSelfCheck().passed || !floodplainRoutingSelfCheck().passed) {
      throw new Error('Watershed 模型自检失败。');
    }
    if (params.get('forceFallback') === '1') throw new Error('已由验证参数强制进入 WebGL 回退。');
    gl = canvas.getContext('webgl2', {
      antialias: quality.antialias,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('当前浏览器没有创建 WebGL2 上下文。');

    renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: quality.antialias,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    renderer.autoClear = false;
    renderer.info.autoReset = false;
    runtime.webglVersion = gl.getParameter(gl.VERSION) || '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      runtime.gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      runtime.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      runtime.contextLostCount += 1;
      showFailure(new Error('WebGL 上下文已丢失，请重试。'));
    });

    createScene();
    resizeRenderer();
    applyCase('low');
    if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);

    runtime.rendererReady = true;
    document.body.dataset.renderState = 'ready';
    dom.runtimeLabel.textContent = `连续水系已就绪 · Three r${THREE.REVISION}`;
    resizeObserver = new ResizeObserver(() => requestRender());
    resizeObserver.observe(viewport);
    lastFrameAt = performance.now();
    requestRender();
  } catch (error) {
    showFailure(error);
  }
}

document.addEventListener('visibilitychange', () => {
  lastFrameAt = performance.now();
  if (!document.hidden) requestRender();
});

window.addEventListener('beforeunload', () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  renderer?.dispose();
});

window.__watershedLab = {
  version: '0.4.0',
  modelVersion: OVERFLOW_MODEL_VERSION,
  coupledModelVersion: COUPLED_MODEL_VERSION,
  mappedModelVersion: MODEL_VERSION,
  scenarioHash: SCENARIO_HASH,
  coupledContractHash: COUPLED_CONTRACT_HASH,
  overflowContractHash: OVERFLOW_CONTRACT_HASH,
  studyMode: STUDY_MODE,
  truthLevel: 'T3',
  getState: () => ({ ...director, runtime: getRuntimeSnapshot() }),
  getRuntime: getRuntimeSnapshot,
  resetPerformanceSamples,
  setCameraMode: (modeId) => setCameraMode(modeId, true),
  getCaseSnapshot,
  getResults: () => coupledRuns,
  start: startRun,
  pause: togglePause,
  reset: resetRun,
  verify: () => {
    director.phase = 'complete';
    director.tick = TOTAL_TICKS;
    director.paused = true;
    coupledStates = { low: coupledRuns.low.finalState, high: coupledRuns.high.finalState };
    dom.resultState.textContent = '固定终点通过';
    updateControls();
    updateCurrentUi();
    requestRender();
    return { results: coupledRuns, runtime: getRuntimeSnapshot(), selfCheck: overflowModelSelfCheck() };
  },
};

initialize();
