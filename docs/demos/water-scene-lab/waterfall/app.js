import * as THREE from '../../shijing-dayu-immersive/vendor/three.module.js';
import { Particles4AllRuntimeAdapter } from '../../particles4all/runtime-adapter.mjs';
import { runParticles4AllScene } from '../core/particles4all-scene-contract.mjs';
import {
  WATERFALL_NEAR_FIELD_SCENE,
  WATERFALL_NEAR_FIELD_SCENE_HASH,
  WATERFALL_NEAR_FIELD_SCENE_JSON,
} from './waterfall-scene-contract.mjs';
import {
  BREAKUP_CASES,
  BREAKUP_CONFIG,
  BREAKUP_PROXIES,
  CONTRACT_HASH,
  CURTAIN_CONFIG,
  CURTAIN_HASH,
  FIXED_DT,
  FIXED_HZ,
  MODEL_VERSION,
  TOTAL_TICKS,
  evaluateBreakupProxy,
  inspectModelContract,
  runDeterministicAB,
  sampleBreakupLayer,
} from './waterfall-model.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $('#waterfall-canvas');
const viewport = $('#scene-viewport');
const params = new URLSearchParams(location.search);
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 760px)');
const initStartedAt = performance.now();
const analysisStartedAt = performance.now();
// Evidence is computed once, outside the render loop. Controls only reveal this
// cached result so a verification click cannot create a hidden long task.
const cachedAnalysis = runDeterministicAB();
const analysisDurationMs = performance.now() - analysisStartedAt;
const verificationSpeed = params.get('verify') === '1' ? 120 : 1;

const dom = {
  runtimeLabel: $('#runtime-label'),
  fallbackReason: $('#fallback-reason'),
  qualityLabel: $('#quality-label'),
  contractHash: $('#contract-hash'),
  phaseBadge: $('#phase-badge'),
  progressFill: $('#run-progress-fill'),
  progressLabel: $('#progress-label'),
  runButton: $('#run-ab'),
  runButtonLabel: $('#run-button-label'),
  pauseButton: $('#pause-run'),
  resetButton: $('#reset-run'),
  cameraButton: $('#camera-toggle'),
  foamButton: $('#foam-toggle'),
  mistButton: $('#mist-toggle'),
  motionButton: $('#motion-toggle'),
  retryButton: $('#retry-renderer'),
  hudTime: $('#hud-time'),
  hudStep: $('#hud-step'),
  hudFrame: $('#hud-frame'),
  hudDraw: $('#hud-draw'),
  liveAParticles: $('#live-a-particles'),
  liveBParticles: $('#live-b-particles'),
  liveASpread: $('#live-a-spread'),
  liveBSpread: $('#live-b-spread'),
  resultRows: $('#result-rows'),
  resultState: $('#result-state'),
  conclusion: $('#bounded-conclusion'),
  curtainCount: $('#curtain-count'),
  breakupCount: $('#breakup-count'),
  readingVariant: $('#reading-variant'),
  physicsFrame: $('#physics-frame'),
  physicsPlaceholder: $('#physics-placeholder'),
  physicsStatus: $('#physics-status'),
  physicsContract: $('#physics-contract'),
  physicsDrop: $('#physics-drop'),
  physicsImpactSpeed: $('#physics-impact-speed'),
  physicsSolverSpeed: $('#physics-solver-speed'),
  physicsBodyProfile: $('#physics-body-profile'),
  physicsRun: $('#physics-run'),
  physicsUnload: $('#physics-unload'),
  physicsInjected: $('#physics-injected'),
  physicsTicks: $('#physics-ticks'),
  physicsBodyMotion: $('#physics-body-motion'),
  physicsNonFinite: $('#physics-nonfinite'),
  physicsConclusion: $('#physics-conclusion'),
  physicsOpen: $('#physics-open'),
  physicsExport: $('#physics-export'),
};

const runtime = {
  rendererReady: false,
  firstFrameMs: null,
  frameTimes: [],
  frameTimeP50: null,
  frameTimeP95: null,
  maxFrameTime: 0,
  longFrameCount: 0,
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
  phase: 'idle',
  tick: 0,
  paused: reducedMotionQuery.matches,
  accumulator: 0,
  previewTick: reducedMotionQuery.matches ? 600 : 0,
  previewMotion: !reducedMotionQuery.matches,
  results: null,
  mobileVariant: 'curtain',
  cameraMode: 'proof',
  foamVisible: false,
  mistVisible: false,
};

const physicsBridge = {
  phase: 'idle',
  adapter: null,
  result: null,
  error: null,
};

const quality = chooseQualityTier();
const mainCurtainSnapshot = Object.freeze({
  analyticalModel: 'curtain-parametric-v1',
  hash: CURTAIN_HASH,
  width: CURTAIN_CONFIG.width,
  topY: CURTAIN_CONFIG.topY,
  impactY: CURTAIN_CONFIG.impactY,
  drop: CURTAIN_CONFIG.drop,
  bow: CURTAIN_CONFIG.bow,
  widthSegments: quality.curtainWidthSegments,
  dropSegments: quality.curtainDropSegments,
});

let renderer;
let gl;
let scene;
let camera;
let curtain;
let curtainMaterial;
let poolMaterial;
let breakupPoints;
let breakupAttributes;
let foamGroup;
let mistPoints;
let animationFrame = 0;
let nextFrameIsDemand = false;
let resizeObserver;
let lastFrameAt = performance.now();
let currentVisualTick = director.previewTick;
let currentVisualTime = currentVisualTick / FIXED_HZ;
let lastUiUpdateAt = 0;
let lastLayerSample = sampleBreakupLayer(currentVisualTime, BREAKUP_CASES.hybrid);

const tempObject = new THREE.Object3D();
const cameraTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const desiredCameraTarget = new THREE.Vector3();
const cameraModes = {
  proof: { label: '全落差', position: [14.8, 10.0, 31.5], target: [0, 9.2, 0.4], fov: 40 },
  context: { label: '环境', position: [22.5, 13.5, 39], target: [0, 9.0, 0], fov: 43 },
  impact: { label: '撞击区', position: [14.5, 7.3, 27], target: [0, 6.8, 1.0], fov: 43 },
};

function chooseQualityTier() {
  const forced = params.get('quality');
  const mobile = mobileQuery.matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (forced === 'high') {
    return { id: 'high', curtainWidthSegments: 40, curtainDropSegments: 152, particleReplicas: 6, rocks: 44, dprCap: 1.5, renderScale: 0.9, antialias: true };
  }
  if (forced === 'low' || forced === 'fallback' || mobile) {
    return { id: 'fallback', curtainWidthSegments: 20, curtainDropSegments: 72, particleReplicas: 2, rocks: 20, dprCap: 1, renderScale: 1, antialias: false };
  }
  if (forced === 'balanced' || cores <= 6) {
    return { id: 'balanced', curtainWidthSegments: 32, curtainDropSegments: 120, particleReplicas: 4, rocks: 34, dprCap: 1.25, renderScale: 0.82, antialias: true };
  }
  return { id: 'high', curtainWidthSegments: 40, curtainDropSegments: 152, particleReplicas: 6, rocks: 44, dprCap: 1.5, renderScale: 0.9, antialias: true };
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

function createCurtainGeometry(widthSegments, dropSegments) {
  const columns = widthSegments + 1;
  const rows = dropSegments + 1;
  const positions = new Float32Array(columns * rows * 3);
  const acrosses = new Float32Array(columns * rows);
  const drops = new Float32Array(columns * rows);
  const indices = new Uint32Array(widthSegments * dropSegments * 6);
  let vertex = 0;
  let offset = 0;
  for (let row = 0; row <= dropSegments; row += 1) {
    const v = row / dropSegments;
    for (let column = 0; column <= widthSegments; column += 1) {
      const u = column / widthSegments * 2 - 1;
      positions[offset++] = u * CURTAIN_CONFIG.width * 0.5;
      positions[offset++] = CURTAIN_CONFIG.topY - v * CURTAIN_CONFIG.drop;
      positions[offset++] = CURTAIN_CONFIG.originZ + CURTAIN_CONFIG.bow * 4 * v * (1 - v);
      acrosses[vertex] = u;
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
      // v points down the fall. This winding keeps the proof-facing normal +Z.
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
      uDeep: { value: new THREE.Color(0x126779) },
      uMid: { value: new THREE.Color(0x59c7d1) },
      uLight: { value: new THREE.Color(0xe5ffff) },
      uSky: { value: new THREE.Color(0xa8e9e5) },
    },
    vertexShader: `
      precision highp float;
      attribute float aAcross;
      attribute float aDrop;
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vAcross;
      varying float vDrop;
      varying float vFlow;

      void main() {
        float edge = sin(3.14159265 * (aAcross + 1.0) * 0.5);
        float vertical = 0.25 + 0.75 * aDrop;
        float phase = 6.2831853 * (${CURTAIN_CONFIG.phaseFrequencyU.toFixed(3)} * aAcross + ${CURTAIN_CONFIG.phaseFrequencyV.toFixed(3)} * aDrop) - ${CURTAIN_CONFIG.phaseSpeed.toFixed(3)} * uTime;
        vec3 p = position;
        p.x += ${CURTAIN_CONFIG.lateralAmplitude.toFixed(3)} * edge * sin(phase * 0.63 + 1.2);
        p.z += ${CURTAIN_CONFIG.rippleAmplitude.toFixed(3)} * edge * vertical * sin(phase);
        float dzdx = ${CURTAIN_CONFIG.rippleAmplitude.toFixed(3)} * vertical * cos(phase) * 0.34;
        float dzdy = -(${CURTAIN_CONFIG.bow.toFixed(3)} * 4.0 * (1.0 - 2.0 * aDrop) + ${CURTAIN_CONFIG.rippleAmplitude.toFixed(3)} * edge * cos(phase) * 2.2) / ${CURTAIN_CONFIG.drop.toFixed(3)};
        vec3 localNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
        vec4 worldPosition = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(mat3(modelMatrix) * localNormal);
        vAcross = aAcross;
        vDrop = aDrop;
        vFlow = fract(aDrop * 5.2 - uTime * 1.78);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uLight;
      uniform vec3 uSky;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vAcross;
      varying float vDrop;
      varying float vFlow;

      void main() {
        float broad = sin(vAcross * 23.0 + sin(vDrop * 18.0) * 0.75) * 0.5 + 0.5;
        float fine = sin(vAcross * 57.0 + vDrop * 9.0) * 0.5 + 0.5;
        float lanes = smoothstep(0.68, 0.98, broad) * 0.60 + smoothstep(0.88, 0.995, fine) * 0.28;
        float falling = smoothstep(0.08, 0.36, vFlow) * (1.0 - smoothstep(0.60, 0.94, vFlow));
        float edge = smoothstep(0.70, 1.0, abs(vAcross));
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0), 2.2);
        float light = clamp(dot(normal, normalize(vec3(-0.36, 0.72, 0.58))) * 0.5 + 0.5, 0.0, 1.0);
        vec3 color = mix(uDeep, uMid, 0.34 + light * 0.38 + vDrop * 0.10);
        color = mix(color, uSky, fresnel * 0.34);
        color = mix(color, uLight, clamp(lanes * (0.38 + falling * 0.58) + edge * 0.24, 0.0, 0.82));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

function createPoolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      varying vec3 vWorldPosition;
      void main() {
        float radius = length(vWorldPosition.xz - vec2(0.0, 1.25));
        float rings = smoothstep(0.88, 1.0, sin(radius * 3.4 - uTime * 2.2) * 0.5 + 0.5);
        float lanes = sin(vWorldPosition.x * 1.8 + vWorldPosition.z * 0.55) * 0.5 + 0.5;
        vec3 base = mix(vec3(0.025, 0.19, 0.23), vec3(0.05, 0.39, 0.43), lanes * 0.28);
        gl_FragColor = vec4(mix(base, vec3(0.46, 0.84, 0.82), rings * 0.15), 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

function createPointMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float aOpacity;
      attribute float aSize;
      attribute float aKind;
      uniform float uPixelRatio;
      varying float vOpacity;
      varying float vKind;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float perspective = clamp(44.0 / max(4.0, -mvPosition.z), 0.72, 1.28);
        gl_PointSize = max(2.0, aSize * uPixelRatio * perspective);
        gl_Position = projectionMatrix * mvPosition;
        vOpacity = aOpacity;
        vKind = aKind;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying float vOpacity;
      varying float vKind;
      void main() {
        vec2 centered = gl_PointCoord - 0.5;
        float distanceToCenter = length(centered);
        float alpha = (1.0 - smoothstep(0.28, 0.50, distanceToCenter)) * vOpacity;
        if (alpha < 0.015) discard;
        vec3 edgeColor = vec3(0.38, 0.86, 0.91);
        vec3 impactColor = vec3(0.68, 0.96, 0.93);
        gl_FragColor = vec4(mix(edgeColor, impactColor, vKind), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function createBreakupParticles() {
  const count = BREAKUP_PROXIES.length * quality.particleReplicas;
  const positions = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const sizes = new Float32Array(count);
  const kinds = new Float32Array(count);
  positions.fill(-999);
  for (let proxyIndex = 0; proxyIndex < BREAKUP_PROXIES.length; proxyIndex += 1) {
    const kind = BREAKUP_PROXIES[proxyIndex].emitter === 'impact_spray' ? 1 : 0;
    for (let replica = 0; replica < quality.particleReplicas; replica += 1) {
      kinds[proxyIndex * quality.particleReplicas + replica] = kind;
    }
  }
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const opacityAttribute = new THREE.BufferAttribute(opacities, 1);
  const sizeAttribute = new THREE.BufferAttribute(sizes, 1);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  opacityAttribute.setUsage(THREE.DynamicDrawUsage);
  sizeAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('aOpacity', opacityAttribute);
  geometry.setAttribute('aSize', sizeAttribute);
  geometry.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
  geometry.setDrawRange(0, count);
  const points = new THREE.Points(geometry, createPointMaterial());
  points.frustumCulled = false;
  points.renderOrder = 8;
  breakupAttributes = { positions, opacities, sizes, positionAttribute, opacityAttribute, sizeAttribute };
  return points;
}

function createMistLayer() {
  const count = quality.id === 'fallback' ? 24 : 84;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = deterministicUnit(index, 4) * Math.PI * 2;
    const radius = 0.8 + deterministicUnit(index, 5) * 5.3;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.75 + deterministicUnit(index, 6) * 2.7;
    positions[index * 3 + 2] = 0.8 + Math.sin(angle) * radius * 0.45;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xd7fbf5,
    size: mobileQuery.matches ? 0.34 : 0.42,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  points.renderOrder = 6;
  return points;
}

function createFoamLayer() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xd9fff5,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  [1.9, 3.1, 4.4].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.09, 72), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.45 + index * 0.004, 1.05);
    group.add(ring);
  });
  group.renderOrder = 7;
  return group;
}

function createCliffAndPool() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({ color: 0x102a2a, roughness: 0.98, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;
  scene.add(ground);

  const cliffMaterial = new THREE.MeshStandardMaterial({ color: 0x39443f, roughness: 0.98, metalness: 0 });
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(20, 18.7, 4.2), cliffMaterial);
  cliff.position.set(0, 9.15, -2.75);
  scene.add(cliff);

  const plateau = new THREE.Mesh(
    new THREE.BoxGeometry(27, 1.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x354c3d, roughness: 0.96 }),
  );
  plateau.position.set(0, 18.25, -8.0);
  scene.add(plateau);

  const pool = new THREE.Mesh(new THREE.CircleGeometry(10.5, 96), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.25, 1.25);
  pool.renderOrder = 1;
  scene.add(pool);

  const rockGeometry = new THREE.IcosahedronGeometry(1.0, 1);
  const rocks = new THREE.InstancedMesh(
    rockGeometry,
    new THREE.MeshStandardMaterial({ color: 0x56625a, roughness: 0.96 }),
    quality.rocks,
  );
  for (let index = 0; index < quality.rocks; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const verticalBand = (index % Math.ceil(quality.rocks / 2)) / Math.ceil(quality.rocks / 2);
    const baseX = side * (5.4 + deterministicUnit(index, 2) * 4.5);
    const lowRock = index % 5 === 0;
    tempObject.position.set(
      lowRock ? side * (5.2 + deterministicUnit(index, 9) * 6.0) : baseX,
      lowRock ? 0.45 + deterministicUnit(index, 7) * 1.2 : 1.2 + verticalBand * 15.8,
      lowRock ? 1.0 + deterministicUnit(index, 8) * 6.0 : -0.5 + deterministicUnit(index, 3) * 1.1,
    );
    tempObject.rotation.set(index * 0.41, index * 0.77, index * 0.23);
    const scale = 0.55 + deterministicUnit(index, 10) * 1.15;
    tempObject.scale.set(scale * 1.15, scale * 0.82, scale);
    tempObject.updateMatrix();
    rocks.setMatrixAt(index, tempObject.matrix);
  }
  rocks.frustumCulled = false;
  scene.add(rocks);
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x122b31);
  scene.fog = new THREE.Fog(0x122b31, 40, 82);
  camera = new THREE.PerspectiveCamera(cameraModes.proof.fov, 1, 0.1, 140);
  camera.position.fromArray(cameraModes.proof.position);
  cameraTarget.fromArray(cameraModes.proof.target);
  camera.lookAt(cameraTarget);

  scene.add(new THREE.HemisphereLight(0xd8f6f1, 0x132421, 1.7));
  const sun = new THREE.DirectionalLight(0xffe8c8, 2.5);
  sun.position.set(-18, 31, 22);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x79dce8, 1.45);
  rim.position.set(14, 13, 10);
  scene.add(rim);

  poolMaterial = createPoolMaterial();
  createCliffAndPool();
  curtainMaterial = createCurtainMaterial();
  curtain = new THREE.Mesh(
    createCurtainGeometry(quality.curtainWidthSegments, quality.curtainDropSegments),
    curtainMaterial,
  );
  curtain.name = 'shared-main-curtain';
  curtain.frustumCulled = false;
  curtain.renderOrder = 4;
  scene.add(curtain);

  breakupPoints = createBreakupParticles();
  scene.add(breakupPoints);
  foamGroup = createFoamLayer();
  mistPoints = createMistLayer();
  scene.add(foamGroup, mistPoints);
}

function updateBreakupParticles(time) {
  const replicas = quality.particleReplicas;
  for (let proxyIndex = 0; proxyIndex < BREAKUP_PROXIES.length; proxyIndex += 1) {
    const proxy = BREAKUP_PROXIES[proxyIndex];
    for (let replica = 0; replica < replicas; replica += 1) {
      const pointIndex = proxyIndex * replicas + replica;
      const positionIndex = pointIndex * 3;
      // Replicas are deterministic temporal samples, not coincident copies. This
      // preserves a fixed source trajectory while avoiding bright pearl clusters.
      const sampleTime = time + proxy.period * replica / replicas * 0.72;
      const state = evaluateBreakupProxy(proxy, sampleTime);
      if (!state.active || !state.position) {
        breakupAttributes.positions[positionIndex] = -999;
        breakupAttributes.positions[positionIndex + 1] = -999;
        breakupAttributes.positions[positionIndex + 2] = -999;
        breakupAttributes.opacities[pointIndex] = 0;
        breakupAttributes.sizes[pointIndex] = 0;
        continue;
      }
      const age = state.normalizedAge;
      const spread = proxy.emitter === 'impact_spray' ? 0.24 + age * 0.34 : 0.10 + age * 0.16;
      const jitterX = (deterministicUnit(pointIndex, 11) - 0.5) * spread;
      const jitterY = (deterministicUnit(pointIndex, 12) - 0.5) * spread * 0.72;
      const jitterZ = (deterministicUnit(pointIndex, 13) - 0.5) * spread;
      breakupAttributes.positions[positionIndex] = state.position.x + jitterX;
      breakupAttributes.positions[positionIndex + 1] = state.position.y + jitterY;
      breakupAttributes.positions[positionIndex + 2] = state.position.z + jitterZ;
      const baseOpacity = proxy.emitter === 'impact_spray' ? 0.36 : 0.30;
      breakupAttributes.opacities[pointIndex] = state.opacity * baseOpacity * (0.64 + deterministicUnit(pointIndex, 14) * 0.36);
      breakupAttributes.sizes[pointIndex] = (1.35 + state.size * 5.2) * (0.88 + deterministicUnit(pointIndex, 15) * 0.22);
    }
  }
  breakupAttributes.positionAttribute.needsUpdate = true;
  breakupAttributes.opacityAttribute.needsUpdate = true;
  breakupAttributes.sizeAttribute.needsUpdate = true;
  lastLayerSample = sampleBreakupLayer(time, BREAKUP_CASES.hybrid);
}

function updateCamera(frameDt) {
  const mode = cameraModes[director.cameraMode];
  desiredCameraPosition.fromArray(mode.position);
  desiredCameraTarget.fromArray(mode.target);
  const snap = reducedMotionQuery.matches && director.phase !== 'running';
  const dt = snap ? 1 : Math.max(frameDt, 1 / 240);
  camera.position.x = damp(camera.position.x, desiredCameraPosition.x, 5.2, dt);
  camera.position.y = damp(camera.position.y, desiredCameraPosition.y, 5.2, dt);
  camera.position.z = damp(camera.position.z, desiredCameraPosition.z, 5.2, dt);
  cameraTarget.x = damp(cameraTarget.x, desiredCameraTarget.x, 5.2, dt);
  cameraTarget.y = damp(cameraTarget.y, desiredCameraTarget.y, 5.2, dt);
  cameraTarget.z = damp(cameraTarget.z, desiredCameraTarget.z, 5.2, dt);
  camera.fov = damp(camera.fov, mode.fov, 5.2, dt);
  camera.lookAt(cameraTarget);
}

function updateSharedScene(time) {
  curtainMaterial.uniforms.uTime.value = time;
  poolMaterial.uniforms.uTime.value = time;
  breakupPoints.material.uniforms.uPixelRatio.value = Math.max(1, runtime.dpr);
  updateBreakupParticles(time);
  const pulse = 1 + Math.sin(time * 1.8) * 0.035;
  foamGroup.scale.setScalar(pulse);
  mistPoints.rotation.y = time * 0.045;
}

function setVariantVisibility(variant) {
  const hybrid = variant === 'breakup';
  breakupPoints.visible = hybrid;
  // Diagnostics are deliberately symmetric: toggling them never creates an A/B difference.
  foamGroup.visible = director.foamVisible;
  mistPoints.visible = director.mistVisible;
}

function renderViewport(variant, x, width, height) {
  setVariantVisibility(variant);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setViewport(x, 0, width, height);
  renderer.setScissor(x, 0, width, height);
  renderer.render(scene, camera);
}

function renderScene(frameDt) {
  if (!rendererReady()) return null;
  const { width, height } = runtime;
  if (!width || !height) return null;
  updateCamera(frameDt);
  updateSharedScene(currentVisualTime);
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
    renderViewport('curtain', 0, leftWidth, height);
    renderViewport('breakup', leftWidth, width - leftWidth, height);
    runtime.renderedVariants = 2;
  }
  renderer.setScissorTest(false);
  runtime.drawCalls = renderer.info.render.calls;
  runtime.triangles = renderer.info.render.triangles;
  return {
    curtain: sampleBreakupLayer(currentVisualTime, BREAKUP_CASES.curtain),
    breakup: lastLayerSample,
  };
}

function rendererReady() {
  return runtime.rendererReady && renderer && !renderer.getContext().isContextLost();
}

function resizeRenderer() {
  if (!renderer || !viewport) return false;
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(devicePixelRatio || 1, quality.dprCap) * quality.renderScale;
  if (width === runtime.width && height === runtime.height && dpr === runtime.dpr) return false;
  runtime.width = width;
  runtime.height = height;
  runtime.dpr = dpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  return true;
}

function getActiveTick() {
  return director.phase === 'idle' ? director.previewTick : director.tick;
}

function stepDirector(frameDt) {
  if (director.phase === 'running' && !director.paused) {
    director.accumulator += Math.min(frameDt, 0.1) * verificationSpeed;
    while (director.accumulator >= FIXED_DT && director.tick < TOTAL_TICKS) {
      director.tick += 1;
      director.accumulator -= FIXED_DT;
    }
    if (director.tick >= TOTAL_TICKS) completeRun();
  } else if (director.phase === 'idle' && director.previewMotion && !document.hidden) {
    director.previewTick = (director.previewTick + frameDt * FIXED_HZ * 0.55) % TOTAL_TICKS;
  }
  currentVisualTick = getActiveTick();
  currentVisualTime = currentVisualTick / FIXED_HZ;
}

function lockFormalDiagnostics() {
  director.foamVisible = false;
  director.mistVisible = false;
}

function startRun() {
  if (!rendererReady()) return;
  if (reducedMotionQuery.matches && !shouldAnimate()) {
    // The first explicit frame after a static reduced-motion preview is demand
    // work; exclude the user's idle reading time from frame telemetry.
    lastFrameAt = performance.now();
    nextFrameIsDemand = true;
  }
  lockFormalDiagnostics();
  director.phase = 'running';
  director.tick = 0;
  director.accumulator = 0;
  director.paused = false;
  director.results = null;
  director.cameraMode = 'proof';
  updateResultTable(null);
  updateControls();
  requestRender();
}

function completeRun() {
  director.tick = TOTAL_TICKS;
  director.phase = 'complete';
  director.paused = true;
  director.results = cachedAnalysis;
  currentVisualTick = TOTAL_TICKS;
  currentVisualTime = TOTAL_TICKS / FIXED_HZ;
  updateResultTable(director.results);
  updateControls();
}

function resetRun() {
  director.phase = 'idle';
  director.tick = 0;
  director.previewTick = reducedMotionQuery.matches ? 600 : 0;
  director.accumulator = 0;
  director.paused = reducedMotionQuery.matches;
  director.previewMotion = !reducedMotionQuery.matches;
  director.results = null;
  lockFormalDiagnostics();
  currentVisualTick = director.previewTick;
  currentVisualTime = currentVisualTick / FIXED_HZ;
  updateResultTable(null);
  updateControls();
  requestRender();
}

function togglePause() {
  if (director.phase !== 'running') return;
  director.paused = !director.paused;
  updateControls();
  requestRender();
}

const resultDefinitions = [
  { key: 'layerCount', label: '固定视觉层', digits: 0, suffix: ' 层' },
  { key: 'activeProxyMean', label: '活跃代理均值', digits: 2 },
  { key: 'activeProxyP95', label: '活跃代理 P95', digits: 1 },
  { key: 'edgeExpansionMean', label: '边缘外扩均值', digits: 3, suffix: ' u' },
  { key: 'impactOccupancyMean', label: '撞击占用均值', digits: 1, percent: true },
  { key: 'nonFiniteCount', label: '非有限值', digits: 0 },
];

function formatMetric(value, definition) {
  if (!Number.isFinite(value)) return '—';
  if (definition.percent) return `${(value * 100).toFixed(definition.digits)}%`;
  return `${value.toFixed(definition.digits)}${definition.suffix || ''}`;
}

function metricJudgment(a, b, definition) {
  if (definition.key === 'nonFiniteCount') return a === 0 && b === 0 ? '均通过' : '需复核';
  const delta = b - a;
  if (definition.percent) return `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pp`;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(definition.digits)}`;
}

function updateResultTable(results) {
  dom.resultRows.innerHTML = '';
  for (const definition of resultDefinitions) {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.setAttribute('role', 'row');
    if (!results) {
      row.innerHTML = `<span role="cell">${definition.label}</span><span role="cell">—</span><span role="cell">—</span><span role="cell">—</span>`;
    } else {
      const a = results.A.metrics[definition.key];
      const b = results.B.metrics[definition.key];
      row.innerHTML = `<span role="cell">${definition.label}</span><span role="cell">${formatMetric(a, definition)}</span><span role="cell" class="value-b">${formatMetric(b, definition)}</span><span role="cell" class="ratio-pass">${metricJudgment(a, b, definition)}</span>`;
    }
    dom.resultRows.append(row);
  }
  if (!results) {
    dom.resultState.textContent = '等待运行';
    dom.conclusion.classList.remove('pass');
    dom.conclusion.textContent = '运行完成后，只判断破碎粒子层在本固定瀑布构图中的可见增益与运行成本。';
    return;
  }
  const passedCount = Object.values(results.checks).filter(Boolean).length;
  const totalCount = Object.keys(results.checks).length;
  dom.resultState.textContent = `${passedCount}/${totalCount} 通过`;
  dom.conclusion.classList.toggle('pass', results.passed);
  dom.conclusion.textContent = `${results.boundedConclusion} 这不是现实流量、压力、碰撞或质量守恒结论。`;
}

function updateControls() {
  const progress = (director.phase === 'idle' ? 0 : director.tick / TOTAL_TICKS) * 100;
  dom.progressFill.style.width = `${Math.min(100, progress)}%`;
  dom.progressLabel.textContent = `${Math.round(progress)}%`;
  dom.pauseButton.disabled = director.phase !== 'running';
  dom.pauseButton.textContent = director.paused ? '▶' : 'Ⅱ';
  dom.pauseButton.setAttribute('aria-label', director.paused ? '继续实验' : '暂停实验');
  dom.runButton.disabled = director.phase === 'running';
  dom.foamButton.disabled = director.phase !== 'idle';
  dom.mistButton.disabled = director.phase !== 'idle';
  if (director.phase === 'running') {
    dom.phaseBadge.textContent = director.paused ? '已暂停' : '固定运行中';
    dom.runButtonLabel.textContent = 'A / B 同步运行中';
  } else if (director.phase === 'complete') {
    dom.phaseBadge.textContent = director.results?.passed ? '证据通过' : '需要复核';
    dom.runButtonLabel.textContent = '再次运行固定 A / B';
  } else {
    dom.phaseBadge.textContent = reducedMotionQuery.matches ? '静态预览' : '准备';
    dom.runButtonLabel.textContent = '运行固定 A / B';
  }
  dom.cameraButton.textContent = `镜头：${cameraModes[director.cameraMode].label}`;
  dom.foamButton.textContent = `白沫诊断：${director.foamVisible ? '开' : '关'}`;
  dom.foamButton.setAttribute('aria-pressed', String(director.foamVisible));
  dom.mistButton.textContent = `雾诊断：${director.mistVisible ? '开' : '关'}`;
  dom.mistButton.setAttribute('aria-pressed', String(director.mistVisible));
  dom.motionButton.textContent = `运动：${director.previewMotion ? '自动' : '静止'}`;
}

function updateLiveUi(renderedLayers, now) {
  if (!renderedLayers || now - lastUiUpdateAt < 90) return;
  lastUiUpdateAt = now;
  const a = renderedLayers.curtain;
  const b = renderedLayers.breakup;
  dom.hudTime.textContent = `${currentVisualTime.toFixed(2)} s`;
  dom.hudStep.textContent = `${Math.round(currentVisualTick)} / ${TOTAL_TICKS}`;
  dom.hudFrame.textContent = runtime.frameTimeP50 == null ? '预热' : `${runtime.frameTimeP50.toFixed(1)} ms`;
  dom.hudDraw.textContent = `${runtime.drawCalls} / ${Math.round(runtime.triangles / 1000)}k tri`;
  dom.liveAParticles.textContent = String(a.activeCount);
  dom.liveBParticles.textContent = String(b.activeCount);
  dom.liveASpread.textContent = a.edgeExpansionMean.toFixed(2);
  dom.liveBSpread.textContent = b.edgeExpansionMean.toFixed(2);
  dom.readingVariant.textContent = mobileQuery.matches
    ? (director.mobileVariant === 'curtain' ? 'A 当前可见' : 'B 当前可见')
    : 'A / B 同步';
  updateControls();
}

function updatePhysicsBridgeUi() {
  const busy = physicsBridge.phase === 'loading' || physicsBridge.phase === 'running';
  const ready = physicsBridge.phase === 'ready' || physicsBridge.phase === 'complete';
  dom.physicsRun.disabled = busy;
  dom.physicsRun.textContent = physicsBridge.phase === 'loading'
    ? '正在创建 Particles4All WebGPU…'
    : physicsBridge.phase === 'running'
      ? '正在执行原库 solver ticks…'
      : physicsBridge.phase === 'complete'
        ? '重新运行近场映射 →'
        : '加载并运行近场映射 →';
  dom.physicsUnload.disabled = !physicsBridge.adapter || busy;
  dom.physicsPlaceholder.hidden = Boolean(physicsBridge.adapter && ready);
  dom.physicsStatus.textContent = physicsBridge.phase === 'loading'
    ? '正在加载原库'
    : physicsBridge.phase === 'running'
      ? 'PBF / 刚体求解中'
      : physicsBridge.phase === 'complete'
        ? '近场证据已完成'
        : physicsBridge.phase === 'error'
          ? '近场运行失败'
          : physicsBridge.phase === 'ready'
            ? '原库已连接'
            : '等待加载';
  if (physicsBridge.error) {
    dom.physicsConclusion.classList.remove('pass');
    dom.physicsConclusion.textContent = `近场镜头失败：${physicsBridge.error.message}`;
  }
}

async function ensurePhysicsAdapter() {
  if (physicsBridge.adapter) {
    await physicsBridge.adapter.connect();
    return physicsBridge.adapter;
  }
  physicsBridge.phase = 'loading';
  physicsBridge.error = null;
  updatePhysicsBridgeUi();
  const engineUrl = `../../particles4all/engine/?${WATERFALL_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
  dom.physicsFrame.src = engineUrl;
  dom.physicsOpen.href = engineUrl;
  const adapter = new Particles4AllRuntimeAdapter(dom.physicsFrame, { timeoutMs: 90000 });
  physicsBridge.adapter = adapter;
  try {
    await adapter.connect();
    physicsBridge.phase = 'ready';
    director.previewMotion = false;
    updateControls();
    requestRender();
    updatePhysicsBridgeUi();
    return adapter;
  } catch (error) {
    physicsBridge.error = error;
    physicsBridge.phase = 'error';
    adapter.dispose({ unload: true });
    physicsBridge.adapter = null;
    updatePhysicsBridgeUi();
    throw error;
  }
}

async function runPhysicsBridge() {
  try {
    const adapter = await ensurePhysicsAdapter();
    physicsBridge.phase = 'running';
    physicsBridge.error = null;
    updatePhysicsBridgeUi();

    physicsBridge.result = await runParticles4AllScene(adapter, WATERFALL_NEAR_FIELD_SCENE);
    const {
      injection,
      step,
      bodyProfile,
      bodyDisplacementDeltaAlongAxis,
      baselineBodyDisplacementAlongAxis,
      nonFinite,
      acceptance,
    } = physicsBridge.result;
    physicsBridge.phase = 'complete';
    dom.physicsInjected.textContent = `${injection.added} / ${injection.requested}`;
    dom.physicsTicks.textContent = `${step.actualTicks} / ${step.requestedTicks}`;
    dom.physicsBodyMotion.textContent = bodyDisplacementDeltaAlongAxis == null
      ? '无对照结果'
      : `${bodyDisplacementDeltaAlongAxis.toFixed(4)} u (Δ -Y)`;
    dom.physicsNonFinite.textContent = String(nonFinite);
    const passed = acceptance.passed;
    dom.physicsConclusion.classList.toggle('pass', passed);
    dom.physicsConclusion.textContent = passed
      ? `原生对象 Gate 通过：Particles4All 实际加载 ${bodyProfile.shape} / density ${bodyProfile.density.toFixed(1)}；相对无注入基线 ${baselineBodyDisplacementAlongAxis.toFixed(4)} u，瀑布脉冲额外产生 ${bodyDisplacementDeltaAlongAxis.toFixed(4)} u 向下响应。`
      : '近场运行已返回，但未满足原生 body profile、注入、tick、有限值、基线差分刚体响应和 WebGPU Gate。';
    updatePhysicsBridgeUi();
    return physicsBridge.result;
  } catch (error) {
    physicsBridge.error = error;
    physicsBridge.phase = 'error';
    updatePhysicsBridgeUi();
    throw error;
  }
}

function unloadPhysicsBridge() {
  physicsBridge.adapter?.dispose({ unload: true });
  physicsBridge.adapter = null;
  physicsBridge.phase = 'idle';
  physicsBridge.result = null;
  physicsBridge.error = null;
  dom.physicsInjected.textContent = '—';
  dom.physicsTicks.textContent = '—';
  dom.physicsBodyMotion.textContent = '—';
  dom.physicsNonFinite.textContent = '—';
  dom.physicsConclusion.classList.remove('pass');
  dom.physicsConclusion.textContent = '这里验证瀑布脉冲是否让原生高密度 box 比无注入基线产生更多向下响应；宏观水幕仍不是 PBF。';
  updatePhysicsBridgeUi();
}

function collectFrameTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 2000) return;
  runtime.frameTimes.push(milliseconds);
  if (runtime.frameTimes.length > 360) runtime.frameTimes.shift();
  runtime.maxFrameTime = Math.max(runtime.maxFrameTime, milliseconds);
  if (milliseconds > 50) runtime.longFrameCount += 1;
  runtime.frameTimeP50 = percentile(runtime.frameTimes, 0.5);
  runtime.frameTimeP95 = percentile(runtime.frameTimes, 0.95);
}

function shouldAnimate() {
  if (document.hidden || !rendererReady()) return false;
  if (!reducedMotionQuery.matches) return true;
  if (director.phase === 'running' && !director.paused) return true;
  return director.phase === 'idle' && director.previewMotion;
}

function requestRender() {
  if (!animationFrame && rendererReady()) {
    nextFrameIsDemand = !shouldAnimate();
    if (nextFrameIsDemand) lastFrameAt = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }
}

function animate(now) {
  animationFrame = 0;
  if (document.hidden || !rendererReady()) return;
  // A queued continuous frame can become demand-only after pause/reset. Reclassify
  // it so idle wall time is not reported as render cost.
  const demandFrame = nextFrameIsDemand || !shouldAnimate();
  nextFrameIsDemand = false;
  const renderStartedAt = performance.now();
  const elapsedMs = Math.max(0, now - lastFrameAt);
  lastFrameAt = now;
  const frameDt = Math.min(0.1, elapsedMs / 1000);
  stepDirector(frameDt);
  const layers = renderScene(frameDt);
  updateLiveUi(layers, now);
  collectFrameTime(demandFrame ? performance.now() - renderStartedAt : elapsedMs);
  if (runtime.firstFrameMs == null) runtime.firstFrameMs = performance.now() - initStartedAt;
  if (shouldAnimate()) requestRender();
}

function populateContractUi() {
  const contract = inspectModelContract();
  dom.contractHash.textContent = contract.contractHash;
  dom.qualityLabel.textContent = `QUALITY · ${quality.id.toUpperCase()}`;
  dom.curtainCount.textContent = '0';
  dom.breakupCount.textContent = `${contract.proxyCount} 源代理 / ${contract.proxyCount * quality.particleReplicas} 点`;
  dom.physicsContract.textContent = WATERFALL_NEAR_FIELD_SCENE_HASH;
  dom.physicsDrop.textContent = `${WATERFALL_NEAR_FIELD_SCENE.mapping.world.parameters.worldDropMeters.toFixed(2)} m`;
  dom.physicsImpactSpeed.textContent = `${WATERFALL_NEAR_FIELD_SCENE.mapping.world.parameters.physicalImpactSpeedMetersPerSecond.toFixed(2)} m/s`;
  dom.physicsSolverSpeed.textContent = `${WATERFALL_NEAR_FIELD_SCENE.scenario.emitters[0].velocity[1].toFixed(2)} u/s`;
  dom.physicsBodyProfile.textContent = `${WATERFALL_NEAR_FIELD_SCENE.localPhysics.body.shape} / ρ ${WATERFALL_NEAR_FIELD_SCENE.localPhysics.body.density.toFixed(1)}`;
  dom.physicsExport.href = `data:application/json;charset=utf-8,${encodeURIComponent(WATERFALL_NEAR_FIELD_SCENE_JSON)}`;
  dom.physicsOpen.href = `../../particles4all/engine/?${WATERFALL_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
  updatePhysicsBridgeUi();
}

function getRuntimeSnapshot() {
  return {
    rendererReady: runtime.rendererReady,
    threeRevision: THREE.REVISION,
    modelVersion: MODEL_VERSION,
    qualityTier: quality.id,
    firstFrameMs: runtime.firstFrameMs,
    analysisDurationMs: runtime.analysisDurationMs,
    frameTimeP50: runtime.frameTimeP50,
    frameTimeP95: runtime.frameTimeP95,
    maxFrameTime: runtime.maxFrameTime,
    longFrameCount: runtime.longFrameCount,
    measuredFrames: runtime.frameTimes.length,
    drawCalls: runtime.drawCalls,
    triangles: runtime.triangles,
    viewport: [runtime.width, runtime.height],
    dpr: runtime.dpr,
    renderedVariants: runtime.renderedVariants,
    webglVersion: runtime.webglVersion,
    gpuVendor: runtime.gpuVendor,
    gpuRenderer: runtime.gpuRenderer,
    contextLostCount: runtime.contextLostCount,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    reducedMotion: reducedMotionQuery.matches,
    fallbackActive: document.body.dataset.renderState === 'failed',
  };
}

function resolveVariant(input) {
  if (input === 'A' || input === 'curtain' || input === BREAKUP_CASES.curtain || input?.breakupMode === 'curtain_only') return BREAKUP_CASES.curtain;
  if (input === 'B' || input === 'breakup' || input === 'hybrid' || input === BREAKUP_CASES.hybrid || input?.breakupMode === 'hybrid_breakup') return BREAKUP_CASES.hybrid;
  throw new Error(`未知 Waterfall 对照：${String(input)}`);
}

function getLayerSnapshot(input = 'curtain') {
  const variant = resolveVariant(input);
  const hybrid = variant.breakupMode === 'hybrid_breakup';
  const fixedInputs = {
    mainCurtain: mainCurtainSnapshot,
    breakupMode: variant.breakupMode,
  };
  return {
    caseId: variant.caseId,
    breakupMode: variant.breakupMode,
    fixedInputs,
    mainCurtain: mainCurtainSnapshot,
    supplementalCount: hybrid ? BREAKUP_PROXIES.length : 0,
    edgeParticleCount: hybrid ? BREAKUP_CONFIG.edgeProxyCount : 0,
    impactParticleCount: hybrid ? BREAKUP_CONFIG.impactProxyCount : 0,
    visualPointCount: hybrid ? BREAKUP_PROXIES.length * quality.particleReplicas : 0,
    fixedDiagnostics: { foamEnabled: false, mistEnabled: false },
  };
}

function showFailure(error) {
  console.warn('[Waterfall MVP fallback]', error);
  document.body.dataset.renderState = 'failed';
  dom.runtimeLabel.textContent = '实时场景不可用';
  dom.fallbackReason.textContent = error?.message || String(error);
  runtime.rendererReady = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

async function initialize() {
  try {
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
    renderer.toneMappingExposure = 1.06;
    renderer.autoClear = false;
    renderer.info.autoReset = false;
    runtime.webglVersion = gl.getParameter(gl.VERSION) || '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      runtime.gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      runtime.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }
    createScene();
    resizeRenderer();
    updateSharedScene(currentVisualTime);
    setVariantVisibility('breakup');
    if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    runtime.rendererReady = true;
    document.body.dataset.renderState = 'ready';
    dom.runtimeLabel.textContent = `实时场景已就绪 · Three r${THREE.REVISION}`;
    resizeObserver = new ResizeObserver(() => {
      if (resizeRenderer()) requestRender();
    });
    resizeObserver.observe(viewport);
    populateContractUi();
    updateResultTable(null);
    updateControls();
    lastFrameAt = performance.now();
    requestRender();
  } catch (error) {
    showFailure(error);
  }
}

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  runtime.contextLostCount += 1;
  showFailure(new Error('WebGL 上下文已丢失；为避免伪造连续运行，实验已停止。'));
});

dom.runButton.addEventListener('click', startRun);
dom.pauseButton.addEventListener('click', togglePause);
dom.resetButton.addEventListener('click', resetRun);
dom.retryButton.addEventListener('click', () => location.reload());
dom.cameraButton.addEventListener('click', () => {
  const order = ['proof', 'context', 'impact'];
  director.cameraMode = order[(order.indexOf(director.cameraMode) + 1) % order.length];
  updateControls();
  requestRender();
});
dom.foamButton.addEventListener('click', () => {
  if (director.phase !== 'idle') return;
  director.foamVisible = !director.foamVisible;
  updateControls();
  requestRender();
});
dom.mistButton.addEventListener('click', () => {
  if (director.phase !== 'idle') return;
  director.mistVisible = !director.mistVisible;
  updateControls();
  requestRender();
});
dom.motionButton.addEventListener('click', () => {
  if (director.phase === 'running') return;
  director.previewMotion = !director.previewMotion;
  updateControls();
  requestRender();
});
dom.physicsRun.addEventListener('click', () => {
  runPhysicsBridge().catch(() => {});
});
dom.physicsUnload.addEventListener('click', unloadPhysicsBridge);

$$('[data-mobile-variant]').forEach((button) => {
  button.addEventListener('click', () => {
    director.mobileVariant = button.dataset.mobileVariant;
    $$('[data-mobile-variant]').forEach((item) => item.classList.toggle('active', item === button));
    requestRender();
  });
});

reducedMotionQuery.addEventListener('change', resetRun);
mobileQuery.addEventListener('change', () => {
  if (resizeRenderer()) requestRender();
});
document.addEventListener('visibilitychange', () => {
  lastFrameAt = performance.now();
  if (!document.hidden) requestRender();
});
window.addEventListener('beforeunload', () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  physicsBridge.adapter?.dispose({ unload: true });
  renderer?.dispose();
});

window.__waterfallLab = {
  version: '0.2.0',
  modelVersion: MODEL_VERSION,
  contractHash: CONTRACT_HASH,
  nearFieldSceneContractHash: WATERFALL_NEAR_FIELD_SCENE_HASH,
  getNearFieldSceneContract: () => JSON.parse(WATERFALL_NEAR_FIELD_SCENE_JSON),
  getState: () => ({ ...director, runtime: getRuntimeSnapshot() }),
  getRuntime: getRuntimeSnapshot,
  getLayerSnapshot,
  getLastResult: () => director.results,
  getPhysicsBridge: () => ({
    phase: physicsBridge.phase,
    result: physicsBridge.result,
    error: physicsBridge.error?.message || null,
  }),
  runPhysicsBridge,
  unloadPhysicsBridge,
  start: startRun,
  pause: togglePause,
  reset: resetRun,
  runVerification: () => {
    lockFormalDiagnostics();
    director.results = cachedAnalysis;
    director.phase = 'complete';
    director.tick = TOTAL_TICKS;
    director.paused = true;
    currentVisualTick = TOTAL_TICKS;
    currentVisualTime = TOTAL_TICKS / FIXED_HZ;
    updateResultTable(director.results);
    updateControls();
    requestRender();
    return {
      analysis: director.results,
      runtime: getRuntimeSnapshot(),
      fixedDiagnostics: { foamEnabled: false, mistEnabled: false },
    };
  },
};

initialize();
