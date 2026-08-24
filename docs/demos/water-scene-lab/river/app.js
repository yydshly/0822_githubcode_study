import * as THREE from '../../shijing-dayu-immersive/vendor/three.module.js';
import { Particles4AllRuntimeAdapter } from '../../particles4all/runtime-adapter.mjs';
import { runParticles4AllScene } from '../core/particles4all-scene-contract.mjs';
import {
  RIVER_NEAR_FIELD_SCENE,
  RIVER_NEAR_FIELD_SCENE_HASH,
  RIVER_NEAR_FIELD_SCENE_JSON,
} from './river-scene-contract.mjs';
import {
  CONTRACT_HASH,
  FIXED_DT,
  FIXED_HZ,
  FLOW_CASES,
  MARKERS,
  MODEL_VERSION,
  PATH_LENGTH,
  RIVER_CONFIG,
  TOTAL_TICKS,
  evaluateCenterline,
  inspectModelContract,
  markerStateAtTime,
  runDeterministicAB,
  sampleFlowAtWorldXZ,
  samplePathByDistance,
} from './river-model.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $('#river-canvas');
const viewport = $('#scene-viewport');
const params = new URLSearchParams(location.search);
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 760px)');
const initStartedAt = performance.now();
const analysisStartedAt = performance.now();
// The deterministic evidence is computed once, before the render loop. Re-running it
// synchronously from a control would create a hidden main-thread long task.
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
  arrowButton: $('#arrow-toggle'),
  trailButton: $('#trail-toggle'),
  motionButton: $('#motion-toggle'),
  retryButton: $('#retry-renderer'),
  hudTime: $('#hud-time'),
  hudStep: $('#hud-step'),
  hudFrame: $('#hud-frame'),
  hudDraw: $('#hud-draw'),
  liveAInside: $('#live-a-inside'),
  liveBInside: $('#live-b-inside'),
  liveAHeading: $('#live-a-heading'),
  liveBHeading: $('#live-b-heading'),
  resultRows: $('#result-rows'),
  resultState: $('#result-state'),
  conclusion: $('#bounded-conclusion'),
  uniformSpeed: $('#uniform-speed'),
  guidedSpeed: $('#guided-speed'),
  readingVariant: $('#reading-variant'),
  physicsFrame: $('#river-physics-frame'),
  physicsPlaceholder: $('#river-physics-placeholder'),
  physicsStatus: $('#river-physics-status'),
  physicsContract: $('#river-physics-contract'),
  physicsWorldFlow: $('#river-physics-world-flow'),
  physicsTangent: $('#river-physics-tangent'),
  physicsSolverFlow: $('#river-physics-solver-flow'),
  physicsBodyProfile: $('#river-physics-body-profile'),
  physicsRun: $('#river-physics-run'),
  physicsUnload: $('#river-physics-unload'),
  physicsInjected: $('#river-physics-injected'),
  physicsTicks: $('#river-physics-ticks'),
  physicsBodyMotion: $('#river-physics-body-motion'),
  physicsBodyRotation: $('#river-physics-body-rotation'),
  physicsBodyRole: $('#river-physics-body-role'),
  physicsNonFinite: $('#river-physics-nonfinite'),
  physicsConclusion: $('#river-physics-conclusion'),
  physicsOpen: $('#river-physics-open'),
  physicsExport: $('#river-physics-export'),
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
  previewTick: reducedMotionQuery.matches ? 720 : 0,
  previewMotion: !reducedMotionQuery.matches,
  results: null,
  mobileVariant: 'uniform',
  cameraMode: 'overview',
  arrowsVisible: true,
  trailsVisible: true,
};

const physicsBridge = {
  phase: 'idle',
  adapter: null,
  result: null,
  error: null,
};

const quality = chooseQualityTier();
let renderer;
let gl;
let scene;
let camera;
let water;
let waterMaterial;
let arrowMesh;
let markerBodies;
let markerRings;
let trailLines;
let trailPositions;
let trailCache;
let animationFrame = 0;
let nextFrameIsDemand = false;
let resizeObserver;
let lastFrameAt = performance.now();
let currentVisualTime = 0;
let currentVisualTick = 0;
let lastUiUpdateAt = 0;

const tempObject = new THREE.Object3D();
const yAxis = new THREE.Vector3(0, 1, 0);
const ringInsideColor = new THREE.Color(0xd7f59d);
const ringOutsideColor = new THREE.Color(0xff3f4d);
const markerInitialVisuals = MARKERS.map((marker) => {
  const channel = samplePathByDistance(marker.phase * PATH_LENGTH);
  return {
    channel,
    x: channel.x + channel.normalX * marker.lane,
    z: channel.z + channel.normalZ * marker.lane,
  };
});

function chooseQualityTier() {
  const forced = params.get('quality');
  const mobile = mobileQuery.matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (forced === 'high') return { id: 'high', lengthSegments: 224, widthSegments: 8, scenery: 34, dprCap: 1.5, renderScale: 0.9, antialias: true };
  if (forced === 'low' || mobile) return { id: 'fallback', lengthSegments: 120, widthSegments: 4, scenery: 18, dprCap: 1.0, renderScale: 1.0, antialias: false };
  if (forced === 'balanced' || cores <= 6) return { id: 'balanced', lengthSegments: 184, widthSegments: 6, scenery: 26, dprCap: 1.25, renderScale: 0.8, antialias: true };
  return { id: 'high', lengthSegments: 224, widthSegments: 8, scenery: 34, dprCap: 1.5, renderScale: 0.9, antialias: true };
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const mix = index - lower;
  return sorted[lower] * (1 - mix) + sorted[upper] * mix;
}

function damp(current, target, speed, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
}

function createRibbonGeometry(lengthSegments, widthSegments) {
  const columns = widthSegments + 1;
  const rows = lengthSegments + 1;
  const positions = new Float32Array(rows * columns * 3);
  const paths = new Float32Array(rows * columns);
  const acrosses = new Float32Array(rows * columns);
  const tangents = new Float32Array(rows * columns * 2);
  const indices = new Uint32Array(lengthSegments * widthSegments * 6);
  let positionIndex = 0;
  let vertexIndex = 0;

  for (let row = 0; row <= lengthSegments; row += 1) {
    const along = row / lengthSegments;
    const channel = samplePathByDistance(PATH_LENGTH * along);
    for (let column = 0; column <= widthSegments; column += 1) {
      const across = column / widthSegments * 2 - 1;
      const lateral = across * RIVER_CONFIG.width * 0.5;
      positions[positionIndex++] = channel.x + channel.normalX * lateral;
      positions[positionIndex++] = RIVER_CONFIG.surfaceY;
      positions[positionIndex++] = channel.z + channel.normalZ * lateral;
      paths[vertexIndex] = along;
      acrosses[vertexIndex] = across;
      tangents[vertexIndex * 2] = channel.tangentX;
      tangents[vertexIndex * 2 + 1] = channel.tangentZ;
      vertexIndex += 1;
    }
  }

  let index = 0;
  for (let row = 0; row < lengthSegments; row += 1) {
    for (let column = 0; column < widthSegments; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices[index++] = a;
      indices[index++] = b;
      indices[index++] = c;
      indices[index++] = b;
      indices[index++] = d;
      indices[index++] = c;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPath', new THREE.BufferAttribute(paths, 1));
  geometry.setAttribute('aAcross', new THREE.BufferAttribute(acrosses, 1));
  geometry.setAttribute('aTangent', new THREE.BufferAttribute(tangents, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowMode: { value: 0 },
      uPathLength: { value: PATH_LENGTH },
      uSpeed: { value: RIVER_CONFIG.flowSpeed },
      uDeep: { value: new THREE.Color(0x045d6b) },
      uMid: { value: new THREE.Color(0x12b7b9) },
      uStreak: { value: new THREE.Color(0xf0fff1) },
      uSky: { value: new THREE.Color(0x7ce7c2) },
      uSunDirection: { value: new THREE.Vector3(-0.34, 0.78, -0.52).normalize() },
    },
    vertexShader: `
      precision highp float;
      attribute float aPath;
      attribute float aAcross;
      attribute vec2 aTangent;
      uniform float uTime;
      uniform float uFlowMode;
      uniform float uPathLength;
      uniform float uSpeed;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vPath;
      varying float vAcross;
      varying vec2 vTangent;

      void main() {
        vec3 p = position;
        float alongMetric = mix(position.z, aPath * uPathLength, uFlowMode);
        float primary = alongMetric * 0.92 - uTime * uSpeed * 0.92;
        float secondary = alongMetric * 1.73 - uTime * uSpeed * 1.18 + aAcross * 2.1;
        p.y += sin(primary) * 0.026 + sin(secondary) * 0.012;
        float slope = cos(primary) * 0.024 + cos(secondary) * 0.010;
        vec3 localNormal = normalize(vec3(-aTangent.x * slope, 1.0, -aTangent.y * slope));
        vec4 worldPosition = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(mat3(modelMatrix) * localNormal);
        vPath = aPath;
        vAcross = aAcross;
        vTangent = aTangent;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uFlowMode;
      uniform float uPathLength;
      uniform float uSpeed;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uStreak;
      uniform vec3 uSky;
      uniform vec3 uSunDirection;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vPath;
      varying float vAcross;
      varying vec2 vTangent;

      void main() {
        float alongMetric = mix(vWorldPosition.z, vPath * uPathLength, uFlowMode);
        float acrossMetric = mix(vWorldPosition.x, vAcross * ${RIVER_CONFIG.width.toFixed(1)}, uFlowMode);
        float laneWave = sin(acrossMetric * 2.45 + sin(alongMetric * 0.10) * 0.22) * 0.5 + 0.5;
        float lane = smoothstep(0.82, 0.98, laneWave);
        float dash = smoothstep(0.16, 0.88, sin(alongMetric * 0.68 - uTime * uSpeed * 0.68) * 0.5 + 0.5);
        float fineLane = smoothstep(0.91, 0.995, sin(acrossMetric * 4.90 + alongMetric * 0.035) * 0.5 + 0.5);
        float rippleFront = smoothstep(0.89, 0.99, sin(alongMetric * 1.32 - uTime * uSpeed * 1.32) * 0.5 + 0.5);
        float streak = lane * (0.18 + dash * 0.62) + fineLane * 0.18 + rippleFront * 0.08;
        float shore = smoothstep(0.84, 0.99, abs(vAcross));
        float bedVariation = sin(vPath * 31.0 + vAcross * 4.4) * 0.5 + 0.5;

        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float grazing = 1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0);
        float fresnel = grazing * grazing * grazing;
        float light = clamp(dot(normal, normalize(uSunDirection)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 color = mix(uDeep, uMid, 0.32 + bedVariation * 0.13 + light * 0.32);
        color = mix(color, uSky, fresnel * 0.34);
        color = mix(color, uStreak, clamp(streak + shore * 0.34, 0.0, 0.84));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function createBankGeometry(side, lengthSegments) {
  const positions = new Float32Array((lengthSegments + 1) * 2 * 3);
  const uvs = new Float32Array((lengthSegments + 1) * 2 * 2);
  const indices = new Uint32Array(lengthSegments * 6);
  const halfWidth = RIVER_CONFIG.width * 0.5;
  let p = 0;
  let uv = 0;
  for (let row = 0; row <= lengthSegments; row += 1) {
    const along = row / lengthSegments;
    const channel = samplePathByDistance(PATH_LENGTH * along);
    const innerOffset = side * halfWidth;
    const outerOffset = side * (halfWidth + 3.2);
    positions[p++] = channel.x + channel.normalX * innerOffset;
    positions[p++] = RIVER_CONFIG.surfaceY - 0.035;
    positions[p++] = channel.z + channel.normalZ * innerOffset;
    positions[p++] = channel.x + channel.normalX * outerOffset;
    positions[p++] = RIVER_CONFIG.bankHeight + 0.22;
    positions[p++] = channel.z + channel.normalZ * outerOffset;
    uvs[uv++] = along;
    uvs[uv++] = 0;
    uvs[uv++] = along;
    uvs[uv++] = 1;
  }
  let index = 0;
  for (let row = 0; row < lengthSegments; row += 1) {
    const a = row * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    if (side > 0) {
      indices[index++] = a; indices[index++] = c; indices[index++] = b;
      indices[index++] = b; indices[index++] = c; indices[index++] = d;
    } else {
      indices[index++] = a; indices[index++] = b; indices[index++] = c;
      indices[index++] = b; indices[index++] = d; indices[index++] = c;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createArrowGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.14, 0, -0.28,
    0.14, 0, -0.28,
    0, 0, 0.42,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createFlowArrows() {
  const alongs = [0.08, 0.21, 0.36, 0.52, 0.68, 0.84, 0.94];
  const lanes = [-1.65, 0, 1.65];
  const mesh = new THREE.InstancedMesh(
    createArrowGeometry(),
    new THREE.MeshBasicMaterial({ color: 0xc7ffe5, side: THREE.DoubleSide, transparent: true, opacity: 0.86, depthWrite: false }),
    alongs.length * lanes.length,
  );
  mesh.userData.probes = [];
  for (const along of alongs) {
    const channel = samplePathByDistance(PATH_LENGTH * along);
    for (const lane of lanes) {
      mesh.userData.probes.push({ along, lane, channel });
    }
  }
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  scene.add(mesh);
  return mesh;
}

function createShoreline(side) {
  const samples = quality.lengthSegments;
  const positions = new Float32Array((samples + 1) * 3);
  const halfWidth = RIVER_CONFIG.width * 0.5;
  let offset = 0;
  for (let index = 0; index <= samples; index += 1) {
    const channel = samplePathByDistance(PATH_LENGTH * index / samples);
    positions[offset++] = channel.x + channel.normalX * halfWidth * side;
    positions[offset++] = RIVER_CONFIG.surfaceY + 0.035;
    positions[offset++] = channel.z + channel.normalZ * halfWidth * side;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xd1d89b, transparent: true, opacity: 0.72 }),
  );
  line.frustumCulled = false;
  line.renderOrder = 3;
  scene.add(line);
}

function createMarkers() {
  const bodyGeometry = new THREE.CylinderGeometry(0.32, 0.39, 0.18, 14);
  const bodyMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdf65,
  });
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, MARKERS.length);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.frustumCulled = false;
  bodies.renderOrder = 6;

  const ringGeometry = new THREE.RingGeometry(0.46, 0.60, 24);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    vertexColors: true,
  });
  const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, MARKERS.length);
  rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rings.frustumCulled = false;
  rings.renderOrder = 7;
  scene.add(bodies, rings);
  return { bodies, rings };
}

function createTrails() {
  const segmentCount = MARKERS.length * 6;
  trailPositions = new Float32Array(segmentCount * 2 * 3);
  trailCache = {
    uniform: { bucket: null, positions: new Float32Array(trailPositions.length) },
    guided: { bucket: null, positions: new Float32Array(trailPositions.length) },
  };
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(trailPositions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setDrawRange(0, segmentCount * 2);
  const material = new THREE.LineBasicMaterial({
    color: 0xffe18a,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  scene.add(lines);
  return lines;
}

function createScenery() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 92, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x10281b, roughness: 0.98, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.16;
  ground.receiveShadow = true;
  scene.add(ground);

  const bankMaterial = new THREE.MeshStandardMaterial({ color: 0x675b38, roughness: 0.94, metalness: 0 });
  const leftBank = new THREE.Mesh(createBankGeometry(1, quality.lengthSegments), bankMaterial);
  const rightBank = new THREE.Mesh(createBankGeometry(-1, quality.lengthSegments), bankMaterial);
  leftBank.receiveShadow = true;
  rightBank.receiveShadow = true;
  scene.add(leftBank, rightBank);

  const stoneGeometry = new THREE.IcosahedronGeometry(0.52, 0);
  const stones = new THREE.InstancedMesh(
    stoneGeometry,
    new THREE.MeshStandardMaterial({ color: 0x7b8063, roughness: 0.92 }),
    quality.scenery,
  );
  for (let index = 0; index < quality.scenery; index += 1) {
    const along = (index + 0.65) / quality.scenery;
    const channel = samplePathByDistance(PATH_LENGTH * along);
    const side = index % 2 === 0 ? 1 : -1;
    const offset = side * (RIVER_CONFIG.width * 0.5 + 1.05 + (index % 4) * 0.34);
    tempObject.position.set(
      channel.x + channel.normalX * offset,
      0.34 + (index % 3) * 0.04,
      channel.z + channel.normalZ * offset,
    );
    tempObject.rotation.set(index * 0.37, index * 0.73, index * 0.19);
    const scale = 0.55 + (index % 5) * 0.10;
    tempObject.scale.set(scale * 1.25, scale * 0.72, scale);
    tempObject.updateMatrix();
    stones.setMatrixAt(index, tempObject.matrix);
  }
  stones.castShadow = true;
  stones.receiveShadow = true;
  stones.frustumCulled = false;
  scene.add(stones);
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x102d23);
  scene.fog = new THREE.Fog(0x102d23, 100, 160);
  camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180);
  camera.position.set(22, 72, -11);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xd6f2df, 0x153423, 1.65));
  const sunlight = new THREE.DirectionalLight(0xffe6bc, 2.35);
  sunlight.position.set(-28, 48, -24);
  sunlight.castShadow = false;
  scene.add(sunlight);

  createScenery();
  waterMaterial = createWaterMaterial();
  water = new THREE.Mesh(createRibbonGeometry(quality.lengthSegments, quality.widthSegments), waterMaterial);
  water.name = 'river-flow-direction-ribbon';
  water.frustumCulled = false;
  water.renderOrder = 2;
  scene.add(water);
  createShoreline(1);
  createShoreline(-1);
  arrowMesh = createFlowArrows();
  const markers = createMarkers();
  markerBodies = markers.bodies;
  markerRings = markers.rings;
  trailLines = createTrails();
}

function resolveVariant(input) {
  if (input === 'A' || input === 'uniform' || input === FLOW_CASES.uniform) return FLOW_CASES.uniform;
  if (input === 'B' || input === 'guided' || input === FLOW_CASES.guided) return FLOW_CASES.guided;
  if (input?.flowMode === 'uniform_world') return FLOW_CASES.uniform;
  if (input?.flowMode === 'spline_tangent') return FLOW_CASES.guided;
  throw new Error(`Unknown River variant: ${input}`);
}

function updateArrows(flowCase) {
  arrowMesh.visible = director.arrowsVisible;
  if (!director.arrowsVisible) return;
  for (let index = 0; index < arrowMesh.userData.probes.length; index += 1) {
    const probe = arrowMesh.userData.probes[index];
    const { channel, lane } = probe;
    const x = channel.x + channel.normalX * lane;
    const z = channel.z + channel.normalZ * lane;
    const directionX = flowCase.flowMode === 'spline_tangent' ? channel.tangentX : 0;
    const directionZ = flowCase.flowMode === 'spline_tangent' ? channel.tangentZ : 1;
    tempObject.position.set(x, RIVER_CONFIG.surfaceY + 0.12, z);
    tempObject.quaternion.setFromAxisAngle(yAxis, Math.atan2(directionX, directionZ));
    tempObject.scale.set(1, 1, 1);
    tempObject.updateMatrix();
    arrowMesh.setMatrixAt(index, tempObject.matrix);
  }
  arrowMesh.instanceMatrix.needsUpdate = true;
}

function visualMarkerPosition(markerIndex, time, flowCase) {
  const marker = MARKERS[markerIndex];
  const initial = markerInitialVisuals[markerIndex];
  if (flowCase.flowMode === 'uniform_world') {
    return { x: initial.x, z: initial.z + RIVER_CONFIG.flowSpeed * time };
  }
  const distance = marker.phase * PATH_LENGTH + RIVER_CONFIG.flowSpeed * time;
  const channel = samplePathByDistance(distance);
  return {
    x: channel.x + channel.normalX * marker.lane,
    z: channel.z + channel.normalZ * marker.lane,
  };
}

function updateMarkers(flowCase, time) {
  const states = [];
  for (let markerIndex = 0; markerIndex < MARKERS.length; markerIndex += 1) {
    const state = markerStateAtTime(markerIndex, time, flowCase);
    states.push(state);
    tempObject.position.set(state.x, state.y, state.z);
    tempObject.quaternion.identity();
    tempObject.scale.set(1, 1, 1);
    tempObject.updateMatrix();
    markerBodies.setMatrixAt(markerIndex, tempObject.matrix);

    tempObject.position.set(state.x, RIVER_CONFIG.surfaceY + 0.07, state.z);
    tempObject.updateMatrix();
    markerRings.setMatrixAt(markerIndex, tempObject.matrix);
    markerRings.setColorAt(markerIndex, state.inChannel ? ringInsideColor : ringOutsideColor);
  }
  markerBodies.instanceMatrix.needsUpdate = true;
  markerRings.instanceMatrix.needsUpdate = true;
  if (markerRings.instanceColor) markerRings.instanceColor.needsUpdate = true;
  return states;
}

/*
 * Trails are a bounded visual history, not a second transport solver. Their
 * points reuse the same analytic marker rule and are refreshed at 12 Hz.
 */
function updateTrails(flowCase, time) {
  trailLines.visible = director.trailsVisible;
  if (!director.trailsVisible) return;
  const cacheKey = flowCase.flowMode === 'uniform_world' ? 'uniform' : 'guided';
  const cache = trailCache[cacheKey];
  const bucket = Math.round(time * 12);
  if (cache.bucket !== bucket) {
    cache.bucket = bucket;
    let offset = 0;
    const bucketTime = bucket / 12;
    const samples = 7;
    const historySeconds = 3.0;
    for (let markerIndex = 0; markerIndex < MARKERS.length; markerIndex += 1) {
      let previous = visualMarkerPosition(markerIndex, Math.max(0, bucketTime - historySeconds), flowCase);
      for (let sampleIndex = 1; sampleIndex < samples; sampleIndex += 1) {
        const sampleTime = Math.max(0, bucketTime - historySeconds + historySeconds * sampleIndex / (samples - 1));
        const current = visualMarkerPosition(markerIndex, sampleTime, flowCase);
        cache.positions[offset++] = previous.x;
        cache.positions[offset++] = RIVER_CONFIG.surfaceY + 0.10;
        cache.positions[offset++] = previous.z;
        cache.positions[offset++] = current.x;
        cache.positions[offset++] = RIVER_CONFIG.surfaceY + 0.10;
        cache.positions[offset++] = current.z;
        previous = current;
      }
    }
  }
  trailPositions.set(cache.positions);
  trailLines.geometry.attributes.position.needsUpdate = true;
}

function updateSceneForVariant(variant, time) {
  const flowCase = resolveVariant(variant);
  waterMaterial.uniforms.uTime.value = time;
  waterMaterial.uniforms.uFlowMode.value = flowCase.flowMode === 'spline_tangent' ? 1 : 0;
  updateArrows(flowCase);
  const states = updateMarkers(flowCase, time);
  updateTrails(flowCase, time);
  return states;
}

function getCameraPreset() {
  if (director.cameraMode === 'upper') {
    return { position: new THREE.Vector3(17, 42, -24), target: new THREE.Vector3(1, 0, -14) };
  }
  if (director.cameraMode === 'lower') {
    return { position: new THREE.Vector3(-17, 43, 18), target: new THREE.Vector3(-1, 0, 14) };
  }
  return { position: new THREE.Vector3(22, 72, -11), target: new THREE.Vector3(0, 0, 0) };
}

function updateCamera(frameDt) {
  const preset = getCameraPreset();
  if (reducedMotionQuery.matches || runtime.firstFrameMs == null) {
    camera.position.copy(preset.position);
  } else {
    camera.position.x = damp(camera.position.x, preset.position.x, 5.5, frameDt);
    camera.position.y = damp(camera.position.y, preset.position.y, 5.5, frameDt);
    camera.position.z = damp(camera.position.z, preset.position.z, 5.5, frameDt);
  }
  camera.lookAt(preset.target);
}

function renderViewport(variant, x, width, height, time) {
  const markerStates = updateSceneForVariant(variant, time);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setViewport(x, 0, width, height);
  renderer.setScissor(x, 0, width, height);
  renderer.render(scene, camera);
  return markerStates;
}

function renderScene(frameDt) {
  if (!rendererReady()) return null;
  const { width, height } = runtime;
  if (!width || !height) return null;
  updateCamera(frameDt);
  renderer.info.reset();
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.clear(true, true, true);
  renderer.setScissorTest(true);

  let states;
  if (mobileQuery.matches) {
    const selected = director.mobileVariant;
    states = { [selected]: renderViewport(selected, 0, width, height, currentVisualTime) };
    runtime.renderedVariants = 1;
  } else {
    const leftWidth = Math.floor(width / 2);
    states = {
      uniform: renderViewport('uniform', 0, leftWidth, height, currentVisualTime),
      guided: renderViewport('guided', leftWidth, width - leftWidth, height, currentVisualTime),
    };
    runtime.renderedVariants = 2;
  }
  renderer.setScissorTest(false);
  runtime.drawCalls = renderer.info.render.calls;
  runtime.triangles = renderer.info.render.triangles;
  return states;
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
    director.previewTick = (director.previewTick + frameDt * FIXED_HZ * 0.55) % 1000;
  }
  currentVisualTick = getActiveTick();
  currentVisualTime = currentVisualTick / FIXED_HZ;
}

function startRun() {
  if (!rendererReady()) return;
  director.phase = 'running';
  director.tick = 0;
  director.accumulator = 0;
  director.paused = false;
  director.results = null;
  director.cameraMode = 'overview';
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
  director.previewTick = reducedMotionQuery.matches ? 720 : 0;
  director.accumulator = 0;
  director.paused = reducedMotionQuery.matches;
  director.previewMotion = !reducedMotionQuery.matches;
  director.results = null;
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
  { key: 'headingErrorP95Deg', label: '切线误差 P95', digits: 2, suffix: '°', better: 'lower' },
  { key: 'inChannelRate', label: '河道内采样', digits: 1, percent: true, better: 'higher' },
  { key: 'laneErrorRms', label: '横向漂移 RMS', digits: 2, suffix: ' m', better: 'lower' },
  { key: 'forwardSpeedMean', label: '沿河推进均值', digits: 2, suffix: ' u/s', better: 'higher' },
  { key: 'bankExitCount', label: '离岸 marker-tick', digits: 0, better: 'lower' },
  { key: 'nonFiniteCount', label: '非有限值', digits: 0, better: 'zero' },
];

function formatMetric(value, definition) {
  if (definition.percent) return `${(value * 100).toFixed(definition.digits)}%`;
  return `${value.toFixed(definition.digits)}${definition.suffix || ''}`;
}

function metricJudgment(a, b, definition) {
  if (definition.better === 'zero') return a === 0 && b === 0 ? '均通过' : '需复核';
  if (definition.percent) return `${b >= a ? '+' : ''}${((b - a) * 100).toFixed(1)} pp`;
  const delta = b - a;
  if (definition.better === 'lower') return `${delta <= 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(definition.digits)}`;
  return `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(definition.digits)}`;
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
    dom.conclusion.textContent = '运行完成后，只判断固定方向场与样条切线场在本弯曲河道中的空间一致性。';
    return;
  }
  const passedCount = Object.values(results.checks).filter(Boolean).length;
  const totalCount = Object.keys(results.checks).length;
  dom.resultState.textContent = `${passedCount}/${totalCount} 通过`;
  dom.conclusion.classList.toggle('pass', results.passed);
  dom.conclusion.textContent = `${results.boundedConclusion} 这不是现实流量、水位或防洪结论。`;
}

function updateControls() {
  const progress = (director.phase === 'idle' ? 0 : director.tick / TOTAL_TICKS) * 100;
  dom.progressFill.style.width = `${Math.min(100, progress)}%`;
  dom.progressLabel.textContent = `${Math.round(progress)}%`;
  dom.pauseButton.disabled = director.phase !== 'running';
  dom.pauseButton.textContent = director.paused ? '▶' : 'Ⅱ';
  dom.pauseButton.setAttribute('aria-label', director.paused ? '继续实验' : '暂停实验');
  dom.runButton.disabled = director.phase === 'running';

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

  const cameraLabels = { overview: '全河段', upper: '上弯道', lower: '下弯道' };
  dom.cameraButton.textContent = `镜头：${cameraLabels[director.cameraMode]}`;
  dom.arrowButton.textContent = `方向箭头：${director.arrowsVisible ? '开' : '关'}`;
  dom.arrowButton.setAttribute('aria-pressed', String(director.arrowsVisible));
  dom.trailButton.textContent = `历史轨迹：${director.trailsVisible ? '开' : '关'}`;
  dom.trailButton.setAttribute('aria-pressed', String(director.trailsVisible));
  dom.motionButton.textContent = `运动：${director.previewMotion ? '自动' : '静止'}`;
}

function summarizeStates(states) {
  const inside = states.filter((state) => state.inChannel).length;
  const heading = states.reduce((sum, state) => sum + state.headingErrorDeg, 0) / Math.max(1, states.length);
  return { inside, heading };
}

function statesForVariant(variant, time) {
  const flowCase = resolveVariant(variant);
  return MARKERS.map((_, markerIndex) => markerStateAtTime(markerIndex, time, flowCase));
}

function updateLiveUi(renderedStates, now) {
  if (!renderedStates || now - lastUiUpdateAt < 90) return;
  lastUiUpdateAt = now;
  const uniformStates = renderedStates.uniform || statesForVariant('uniform', currentVisualTime);
  const guidedStates = renderedStates.guided || statesForVariant('guided', currentVisualTime);
  const a = summarizeStates(uniformStates);
  const b = summarizeStates(guidedStates);
  dom.hudTime.textContent = `${currentVisualTime.toFixed(2)} s`;
  dom.hudStep.textContent = `${Math.round(currentVisualTick)} / ${TOTAL_TICKS}`;
  dom.hudFrame.textContent = runtime.frameTimeP50 == null ? '预热' : `${runtime.frameTimeP50.toFixed(1)} ms`;
  dom.hudDraw.textContent = `${runtime.drawCalls} / ${Math.round(runtime.triangles / 1000)}k tri`;
  dom.liveAInside.textContent = `${a.inside} / ${MARKERS.length}`;
  dom.liveBInside.textContent = `${b.inside} / ${MARKERS.length}`;
  dom.liveAHeading.textContent = `${a.heading.toFixed(1)}°`;
  dom.liveBHeading.textContent = `${b.heading.toFixed(1)}°`;
  dom.readingVariant.textContent = mobileQuery.matches
    ? (director.mobileVariant === 'uniform' ? 'A 当前可见' : 'B 当前可见')
    : 'A / B 同步';
  updateControls();
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
    // In reduced-motion demand rendering, elapsed wall time between user actions is
    // idle time rather than a dropped frame. Start the frame interval at the request.
    nextFrameIsDemand = !shouldAnimate();
    if (nextFrameIsDemand) lastFrameAt = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }
}

function animate(now) {
  animationFrame = 0;
  if (document.hidden || !rendererReady()) return;
  // A continuous frame may already be queued when a reduced-motion run is
  // paused/reset. Reclassify it at callback time so idle wall time is not
  // misreported as render cost.
  const demandFrame = nextFrameIsDemand || !shouldAnimate();
  nextFrameIsDemand = false;
  const renderStartedAt = performance.now();
  const elapsedMs = Math.max(0, now - lastFrameAt);
  lastFrameAt = now;
  const frameDt = Math.min(0.1, elapsedMs / 1000);
  stepDirector(frameDt);
  const states = renderScene(frameDt);
  updateLiveUi(states, now);
  collectFrameTime(demandFrame ? performance.now() - renderStartedAt : elapsedMs);
  if (runtime.firstFrameMs == null) runtime.firstFrameMs = performance.now() - initStartedAt;
  if (shouldAnimate()) requestRender();
}

function updatePhysicsBridgeUi() {
  const busy = physicsBridge.phase === 'loading' || physicsBridge.phase === 'running';
  const ready = physicsBridge.phase === 'ready' || physicsBridge.phase === 'complete';
  dom.physicsRun.disabled = busy;
  dom.physicsRun.textContent = physicsBridge.phase === 'loading'
    ? '正在创建 Particles4All WebGPU…'
    : physicsBridge.phase === 'running'
      ? '正在执行共享 Scene Runner…'
      : physicsBridge.phase === 'complete'
        ? '重新运行 River 近场契约 →'
        : '加载并运行 River 近场契约 →';
  dom.physicsUnload.disabled = !physicsBridge.adapter || busy;
  dom.physicsPlaceholder.hidden = Boolean(physicsBridge.adapter && ready);
  dom.physicsStatus.textContent = physicsBridge.phase === 'loading'
    ? '正在加载原库'
    : physicsBridge.phase === 'running'
      ? '沿流向求解中'
      : physicsBridge.phase === 'complete'
        ? 'River 复用证据已完成'
        : physicsBridge.phase === 'error'
          ? 'River 近场运行失败'
          : physicsBridge.phase === 'ready'
            ? '共享执行器已连接'
            : '等待加载';
  if (physicsBridge.error) {
    dom.physicsConclusion.classList.remove('pass');
    dom.physicsConclusion.textContent = `River 近场失败：${physicsBridge.error.message}`;
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
  const engineUrl = `../../particles4all/engine/?${RIVER_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
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
    physicsBridge.result = await runParticles4AllScene(adapter, RIVER_NEAR_FIELD_SCENE);
    const {
      injection,
      step,
      bodyProfile,
      bodyDisplacementAlongAxis,
      bodyRotationDegrees,
      nonFinite,
      acceptance,
    } = physicsBridge.result;
    physicsBridge.phase = 'complete';
    dom.physicsInjected.textContent = `${injection.added} / ${injection.requested}`;
    dom.physicsTicks.textContent = `${step.actualTicks} / ${step.requestedTicks}`;
    dom.physicsBodyMotion.textContent = bodyDisplacementAlongAxis == null
      ? '无刚体'
      : `${bodyDisplacementAlongAxis.toFixed(4)} u (+X)`;
    dom.physicsBodyRotation.textContent = bodyRotationDegrees == null ? '无姿态' : `${bodyRotationDegrees.toFixed(2)}°`;
    dom.physicsBodyRole.textContent = bodyProfile?.sceneRole || '—';
    dom.physicsNonFinite.textContent = String(nonFinite);
    dom.physicsConclusion.classList.toggle('pass', acceptance.passed);
    dom.physicsConclusion.textContent = acceptance.passed
      ? `原生漂浮物 Gate 通过：Particles4All 实际加载 ${bodyProfile.shape} / density ${bodyProfile.density.toFixed(2)}；沿流位移 ${bodyDisplacementAlongAxis.toFixed(4)} u，Shape Matching 旋转 ${bodyRotationDegrees.toFixed(2)}°。`
      : 'River 近场已返回，但未同时满足原生 body profile、注入、tick、有限值、沿流平移、旋转和 WebGPU Gate。';
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
  dom.physicsBodyRotation.textContent = '—';
  dom.physicsBodyRole.textContent = '—';
  dom.physicsNonFinite.textContent = '—';
  dom.physicsConclusion.classList.remove('pass');
  dom.physicsConclusion.textContent = '这里验证原生低密度 box 的沿流平移与姿态响应，不把它解释为真实木料、河床碰撞、流量或水深。';
  updatePhysicsBridgeUi();
}

function populateContractUi() {
  const contract = inspectModelContract();
  dom.contractHash.textContent = contract.contractHash;
  dom.qualityLabel.textContent = `QUALITY · ${quality.id.toUpperCase()}`;
  dom.uniformSpeed.textContent = `${contract.flowSpeed.toFixed(2)} u/s`;
  dom.guidedSpeed.textContent = `${contract.flowSpeed.toFixed(2)} u/s`;
  const world = RIVER_NEAR_FIELD_SCENE.mapping.world.parameters;
  const velocity = RIVER_NEAR_FIELD_SCENE.scenario.emitters[0].velocity;
  dom.physicsContract.textContent = RIVER_NEAR_FIELD_SCENE_HASH;
  dom.physicsWorldFlow.textContent = `${world.riverFlowSpeedWorldUnitsPerSecond.toFixed(2)} u/s`;
  dom.physicsTangent.textContent = `(${world.sampleTangentX.toFixed(2)}, ${world.sampleTangentZ.toFixed(2)})`;
  dom.physicsSolverFlow.textContent = `(+${velocity[0].toFixed(2)}, 0, 0) u/s`;
  dom.physicsBodyProfile.textContent = `${RIVER_NEAR_FIELD_SCENE.localPhysics.body.shape} / ρ ${RIVER_NEAR_FIELD_SCENE.localPhysics.body.density.toFixed(2)}`;
  dom.physicsExport.href = `data:application/json;charset=utf-8,${encodeURIComponent(RIVER_NEAR_FIELD_SCENE_JSON)}`;
  dom.physicsOpen.href = `../../particles4all/engine/?${RIVER_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
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

function getFlowSnapshot(input = 'uniform', time = 0) {
  const flowCase = resolveVariant(input);
  const probes = [0.12, 0.38, 0.63, 0.87].map((s) => {
    const channel = evaluateCenterline(s);
    const flow = sampleFlowAtWorldXZ(channel.x, channel.z, flowCase);
    return {
      centerlineS: s,
      x: channel.x,
      z: channel.z,
      directionX: flow.directionX,
      directionZ: flow.directionZ,
      tangentX: flow.closest.tangentX,
      tangentZ: flow.closest.tangentZ,
      speed: flow.speed,
      headingErrorDeg: flow.headingErrorDeg,
    };
  });
  const markerSnapshot = (queryTime) => MARKERS.map((marker, markerIndex) => {
    const state = markerStateAtTime(markerIndex, queryTime, flowCase);
    return { id: marker.id, x: state.x, z: state.z, inChannel: state.inChannel };
  });
  return {
    caseId: flowCase.caseId,
    flowMode: flowCase.flowMode,
    time,
    probes,
    markers: markerSnapshot(time),
    initialMarkers: markerSnapshot(0),
  };
}

function showFailure(error) {
  console.warn('[River MVP fallback]', error);
  document.body.dataset.renderState = 'failed';
  dom.runtimeLabel.textContent = '实时场景不可用';
  dom.fallbackReason.textContent = error?.message || String(error);
  runtime.rendererReady = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

async function initialize() {
  try {
    if (params.get('forceFallback') === '1') {
      throw new Error('已由验证参数强制进入 WebGL 回退。');
    }
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

    createScene();
    resizeRenderer();
    updateSceneForVariant('uniform', 0);
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
  const order = ['overview', 'upper', 'lower'];
  director.cameraMode = order[(order.indexOf(director.cameraMode) + 1) % order.length];
  updateControls();
  requestRender();
});
dom.arrowButton.addEventListener('click', () => {
  director.arrowsVisible = !director.arrowsVisible;
  updateControls();
  requestRender();
});
dom.trailButton.addEventListener('click', () => {
  director.trailsVisible = !director.trailsVisible;
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

window.__riverLab = {
  version: '0.2.0',
  modelVersion: MODEL_VERSION,
  contractHash: CONTRACT_HASH,
  nearFieldSceneContractHash: RIVER_NEAR_FIELD_SCENE_HASH,
  getNearFieldSceneContract: () => JSON.parse(RIVER_NEAR_FIELD_SCENE_JSON),
  getState: () => ({ ...director, runtime: getRuntimeSnapshot() }),
  getRuntime: getRuntimeSnapshot,
  getFlowSnapshot,
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
  sampleFlow: (x, z, variant = 'uniform') => sampleFlowAtWorldXZ(x, z, resolveVariant(variant)),
  runVerification: () => {
    director.results = cachedAnalysis;
    director.phase = 'complete';
    director.tick = TOTAL_TICKS;
    director.paused = true;
    currentVisualTick = TOTAL_TICKS;
    currentVisualTime = TOTAL_TICKS / FIXED_HZ;
    updateResultTable(director.results);
    updateControls();
    requestRender();
    return { analysis: director.results, runtime: getRuntimeSnapshot() };
  },
};

initialize();
