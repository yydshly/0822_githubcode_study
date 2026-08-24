import * as THREE from '../../shijing-dayu-immersive/vendor/three.module.js';
import { Particles4AllRuntimeAdapter } from '../../particles4all/runtime-adapter.mjs';
import { runParticles4AllScene } from '../core/particles4all-scene-contract.mjs';
import {
  OCEAN_NEAR_FIELD_SCENE,
  OCEAN_NEAR_FIELD_SCENE_HASH,
  OCEAN_NEAR_FIELD_SCENE_JSON,
} from './ocean-scene-contract.mjs';
import {
  BOAT_CONFIG,
  CONTRACT_HASH,
  FIXED_DT,
  FIXED_HZ,
  MODEL_VERSION,
  SEA_STATES,
  TOTAL_TICKS,
  WAVE_TABLE,
  boatCenterAtTime,
  formatModelNumber,
  inspectModelContract,
  resolveWaves,
  runDeterministicAB,
  sampleBoat,
  sampleSurfaceAtWorldXZ,
} from './ocean-model.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $('#ocean-canvas');
const viewport = $('#scene-viewport');
const params = new URLSearchParams(location.search);
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 760px)');
const initStartedAt = performance.now();
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
  probeButton: $('#probe-toggle'),
  motionButton: $('#motion-toggle'),
  retryButton: $('#retry-renderer'),
  hudTime: $('#hud-time'),
  hudStep: $('#hud-step'),
  hudFrame: $('#hud-frame'),
  hudDraw: $('#hud-draw'),
  liveAHeave: $('#live-a-heave'),
  liveBHeave: $('#live-b-heave'),
  liveARoll: $('#live-a-roll'),
  liveBRoll: $('#live-b-roll'),
  resultRows: $('#result-rows'),
  resultState: $('#result-state'),
  conclusion: $('#bounded-conclusion'),
  calmAmplitude: $('#calm-amplitude'),
  calmSteepness: $('#calm-steepness'),
  windAmplitude: $('#wind-amplitude'),
  windSteepness: $('#wind-steepness'),
  physicsFrame: $('#coastal-physics-frame'),
  physicsPlaceholder: $('#coastal-physics-placeholder'),
  physicsStatus: $('#coastal-physics-status'),
  physicsContract: $('#coastal-physics-contract'),
  physicsHeight: $('#coastal-physics-height'),
  physicsBodyProfile: $('#coastal-physics-body-profile'),
  physicsWorldVelocity: $('#coastal-physics-world-velocity'),
  physicsSolverVelocity: $('#coastal-physics-solver-velocity'),
  physicsRun: $('#coastal-physics-run'),
  physicsUnload: $('#coastal-physics-unload'),
  physicsInjected: $('#coastal-physics-injected'),
  physicsTicks: $('#coastal-physics-ticks'),
  physicsBodyMotion: $('#coastal-physics-body-motion'),
  physicsBodyRotation: $('#coastal-physics-body-rotation'),
  physicsBodyRole: $('#coastal-physics-body-role'),
  physicsNonFinite: $('#coastal-physics-nonfinite'),
  physicsConclusion: $('#coastal-physics-conclusion'),
  physicsOpen: $('#coastal-physics-open'),
  physicsExport: $('#coastal-physics-export'),
};

const runtime = {
  rendererReady: false,
  firstFrameMs: null,
  frameTimes: [],
  frameTimeP50: null,
  frameTimeP95: null,
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
  previewTick: reducedMotionQuery.matches ? 480 : 0,
  previewMotion: !reducedMotionQuery.matches,
  results: null,
  mobileVariant: 'calm',
  cameraMode: 'chase',
  probesVisible: true,
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
let boat;
let boatShadow;
let probeGroup;
let probeVisuals = [];
let buoys = [];
let animationFrame = 0;
let resizeObserver;
let lastFrameAt = performance.now();
let currentVisualTime = 0;
let currentVisualTick = 0;
let lastUiUpdateAt = 0;

function chooseQualityTier() {
  const forced = params.get('quality');
  const mobile = mobileQuery.matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (forced === 'high') return { id: 'high', segments: 132, dprCap: 1.5, antialias: true };
  if (forced === 'low' || mobile) return { id: 'fallback', segments: 68, dprCap: 1.0, antialias: false };
  if (forced === 'balanced' || cores <= 6) return { id: 'balanced', segments: 96, dprCap: 1.25, antialias: true };
  return { id: 'high', segments: 132, dprCap: 1.5, antialias: true };
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

function makeOceanGeometry(size, segments) {
  const side = segments + 1;
  const positions = new Float32Array(side * side * 3);
  const uvs = new Float32Array(side * side * 2);
  const indices = new Uint32Array(segments * segments * 6);
  let positionIndex = 0;
  let uvIndex = 0;
  for (let row = 0; row <= segments; row += 1) {
    const v = row / segments;
    const z = (v - 0.5) * size;
    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const x = (u - 0.5) * size;
      positions[positionIndex++] = x;
      positions[positionIndex++] = 0;
      positions[positionIndex++] = z;
      uvs[uvIndex++] = u;
      uvs[uvIndex++] = v;
    }
  }
  let index = 0;
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * side + column;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices[index++] = a;
      indices[index++] = c;
      indices[index++] = b;
      indices[index++] = b;
      indices[index++] = c;
      indices[index++] = d;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createWaterMaterial() {
  const waveA = Array.from({ length: WAVE_TABLE.length }, () => new THREE.Vector4());
  const waveB = Array.from({ length: WAVE_TABLE.length }, () => new THREE.Vector4());
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeaState: { value: 0.25 },
      uWaveA: { value: waveA },
      uWaveB: { value: waveB },
      uSunDir: { value: new THREE.Vector3(-0.38, 0.68, -0.62).normalize() },
      uDeepColor: { value: new THREE.Color(0x062c3e) },
      uMidColor: { value: new THREE.Color(0x0c6e83) },
      uSkyColor: { value: new THREE.Color(0x8bc8d7) },
      uHorizonColor: { value: new THREE.Color(0x5c8796) },
    },
    vertexShader: `
      precision highp float;
      #define WAVE_COUNT ${WAVE_TABLE.length}
      uniform float uTime;
      uniform vec4 uWaveA[WAVE_COUNT];
      uniform vec4 uWaveB[WAVE_COUNT];
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vHeight;
      varying float vSlope;

      void main() {
        vec3 p = position;
        vec3 pu = vec3(1.0, 0.0, 0.0);
        vec3 pv = vec3(0.0, 0.0, 1.0);
        for (int i = 0; i < WAVE_COUNT; i++) {
          vec2 direction = uWaveA[i].xy;
          float amplitude = uWaveA[i].z;
          float k = uWaveA[i].w;
          float omega = uWaveB[i].x;
          float phase = uWaveB[i].y;
          float q = uWaveB[i].z;
          float theta = k * dot(direction, position.xz) - omega * uTime + phase;
          float sine = sin(theta);
          float cosine = cos(theta);
          float qA = q * amplitude;
          float aK = amplitude * k;
          float qAK = qA * k;

          p.x += qA * direction.x * cosine;
          p.y += amplitude * sine;
          p.z += qA * direction.y * cosine;

          pu += vec3(
            -qAK * direction.x * direction.x * sine,
             aK * direction.x * cosine,
            -qAK * direction.x * direction.y * sine
          );
          pv += vec3(
            -qAK * direction.x * direction.y * sine,
             aK * direction.y * cosine,
            -qAK * direction.y * direction.y * sine
          );
        }

        vec3 localNormal = normalize(cross(pv, pu));
        vec4 worldPosition = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
        vHeight = p.y;
        vSlope = length(localNormal.xz) / max(localNormal.y, 0.001);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uSeaState;
      uniform vec3 uSunDir;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uSkyColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vHeight;
      varying float vSlope;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float ndv = clamp(dot(normal, viewDirection), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, 3.2);
        float lightFacing = clamp(dot(normal, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(uDeepColor, uMidColor, 0.24 + lightFacing * 0.58 + vHeight * 0.12);
        vec3 reflectedSky = mix(uHorizonColor, uSkyColor, clamp(normal.y * 0.75 + 0.18, 0.0, 1.0));
        vec3 color = mix(base, reflectedSky, fresnel * 0.72);
        vec3 reflected = reflect(-normalize(uSunDir), normal);
        float specular = pow(max(dot(reflected, viewDirection), 0.0), mix(150.0, 85.0, uSeaState));
        color += vec3(1.0, 0.94, 0.77) * specular * 1.25;

        float crest = smoothstep(0.34, 0.76, vHeight) * smoothstep(0.24, 0.62, vSlope) * smoothstep(0.55, 1.0, uSeaState);
        float grain = 0.82 + hash21(vWorldPosition.xz * 1.7 + uTime * 0.025) * 0.18;
        color = mix(color, vec3(0.78, 0.94, 0.94), crest * grain * 0.38);

        float distanceToCamera = length(cameraPosition - vWorldPosition);
        float horizonFog = smoothstep(70.0, 132.0, distanceToCamera);
        color = mix(color, uHorizonColor, horizonFog * 0.86);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function createSky() {
  const geometry = new THREE.SphereGeometry(170, 32, 18);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.38, 0.68, -0.62).normalize() },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      varying vec3 vDirection;
      void main() {
        float heightMix = smoothstep(-0.08, 0.72, vDirection.y);
        vec3 horizon = vec3(0.34, 0.53, 0.60);
        vec3 zenith = vec3(0.055, 0.17, 0.25);
        vec3 color = mix(horizon, zenith, heightMix);
        float sun = pow(max(dot(normalize(vDirection), normalize(uSunDir)), 0.0), 540.0);
        float glow = pow(max(dot(normalize(vDirection), normalize(uSunDir)), 0.0), 16.0);
        color += vec3(1.0, 0.75, 0.42) * sun * 2.4;
        color += vec3(0.34, 0.28, 0.20) * glow * 0.35;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
}

function createBoat() {
  const group = new THREE.Group();
  group.name = 'four-point-vessel-proxy';

  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, -2.35);
  hullShape.lineTo(1.05, -1.05);
  hullShape.lineTo(1.02, 1.85);
  hullShape.quadraticCurveTo(0, 2.2, -1.02, 1.85);
  hullShape.lineTo(-1.05, -1.05);
  hullShape.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.62,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.10,
    bevelThickness: 0.10,
  });
  hullGeometry.rotateX(-Math.PI / 2);
  hullGeometry.translate(0, -0.53, 0);
  const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({
    color: 0x102f43,
    roughness: 0.35,
    metalness: 0.18,
  }));
  hull.castShadow = true;
  group.add(hull);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.12, 2.45),
    new THREE.MeshStandardMaterial({ color: 0xd8e5e2, roughness: 0.42, metalness: 0.05 }),
  );
  rim.position.set(0, 0.02, -0.20);
  rim.castShadow = true;
  group.add(rim);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.72, 1.16),
    new THREE.MeshStandardMaterial({ color: 0xdde7e2, roughness: 0.48 }),
  );
  cabin.position.set(0, 0.43, -0.42);
  cabin.castShadow = true;
  group.add(cabin);

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x4e8296,
    roughness: 0.18,
    metalness: 0.18,
    emissive: 0x0d2832,
    emissiveIntensity: 0.28,
  });
  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.32, 0.08), glassMaterial);
  windscreen.position.set(0, 0.55, 0.18);
  windscreen.rotation.x = -0.30;
  group.add(windscreen);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1.35, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8c7c5, roughness: 0.33, metalness: 0.55 }),
  );
  mast.position.set(0, 1.07, -0.62);
  group.add(mast);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x75e6ee, side: THREE.DoubleSide }),
  );
  flag.position.set(0.22, 1.56, -0.62);
  flag.rotation.y = Math.PI / 2;
  group.add(flag);

  scene.add(group);
  return group;
}

function createProbeVisuals() {
  const group = new THREE.Group();
  const ringGeometry = new THREE.TorusGeometry(0.14, 0.022, 6, 20);
  ringGeometry.rotateX(Math.PI / 2);
  const pointGeometry = new THREE.SphereGeometry(0.045, 10, 8);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbdf7f4 });
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const visuals = BOAT_CONFIG.contacts.map((contact) => {
    const item = new THREE.Group();
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    item.add(ring, point);
    group.add(item);
    return { id: contact.id, group: item };
  });
  scene.add(group);
  return { group, visuals };
}

function createBuoys() {
  const positions = [
    [-8.5, -5.5],
    [7.2, 3.5],
    [-13.5, 12.0],
    [12.5, 17.5],
  ];
  return positions.map(([x, z], index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.18, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0xf0c568 : 0xea766e, roughness: 0.55 }),
    );
    body.position.y = 0.12;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xeef3e9, roughness: 0.6 }),
    );
    cap.position.y = 0.36;
    group.add(body, cap);
    group.position.set(x, 0, z);
    scene.add(group);
    return { group, x, z };
  });
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x173b4b);
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 260);
  camera.position.set(9, 6, -22);

  const hemisphere = new THREE.HemisphereLight(0xbce4eb, 0x163442, 1.35);
  scene.add(hemisphere);
  const sunlight = new THREE.DirectionalLight(0xffe5bb, 2.1);
  sunlight.position.set(-28, 42, -36);
  scene.add(sunlight);
  createSky();

  waterMaterial = createWaterMaterial();
  water = new THREE.Mesh(makeOceanGeometry(180, quality.segments), waterMaterial);
  water.name = 'gerstner-ocean-surface';
  water.frustumCulled = false;
  scene.add(water);

  boat = createBoat();
  boatShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ color: 0x03151d, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  boatShadow.rotation.x = -Math.PI / 2;
  boatShadow.scale.set(1.1, 2.4, 1);
  boatShadow.renderOrder = 2;
  scene.add(boatShadow);

  const probes = createProbeVisuals();
  probeGroup = probes.group;
  probeVisuals = probes.visuals;
  buoys = createBuoys();
}

function applySeaState(stateId, time) {
  const state = SEA_STATES[stateId];
  const resolved = resolveWaves(state.seaState);
  waterMaterial.uniforms.uTime.value = time;
  waterMaterial.uniforms.uSeaState.value = state.seaState;
  for (let index = 0; index < resolved.waves.length; index += 1) {
    const wave = resolved.waves[index];
    waterMaterial.uniforms.uWaveA.value[index].set(
      wave.directionX,
      wave.directionZ,
      wave.amplitude,
      wave.k,
    );
    waterMaterial.uniforms.uWaveB.value[index].set(wave.omega, wave.phase, wave.q, 0);
  }
}

function updateSceneForVariant(stateId, time) {
  const sea = SEA_STATES[stateId];
  applySeaState(stateId, time);
  const boatState = sampleBoat(time, sea.seaState);
  boat.position.set(
    boatState.center.x,
    boatState.heave + BOAT_CONFIG.displayWaterlineOffset,
    boatState.center.z,
  );
  boat.rotation.order = 'YXZ';
  boat.rotation.set(-boatState.pitch, BOAT_CONFIG.yaw, boatState.roll);

  boatShadow.position.set(boatState.center.x, boatState.heave + 0.018, boatState.center.z);
  boatShadow.rotation.z = BOAT_CONFIG.yaw;
  probeGroup.visible = director.probesVisible;
  for (let index = 0; index < probeVisuals.length; index += 1) {
    const contact = boatState.contacts[index];
    probeVisuals[index].group.position.set(
      contact.worldX,
      contact.surface.position[1] + 0.04,
      contact.worldZ,
    );
  }

  for (const buoy of buoys) {
    const surface = sampleSurfaceAtWorldXZ(buoy.x, buoy.z, time, sea.seaState);
    buoy.group.position.y = surface.position[1] + 0.02;
    buoy.group.rotation.z = Math.atan2(-surface.normal[0], surface.normal[1]);
    buoy.group.rotation.x = Math.atan2(surface.normal[2], surface.normal[1]);
  }
  return boatState;
}

function updateCamera(time, tick, frameDt) {
  const center = boatCenterAtTime(time);
  let desired;
  let target;
  if (director.cameraMode === 'overview') {
    desired = new THREE.Vector3(center.x + 13, 15.5, center.z - 18);
    target = new THREE.Vector3(center.x, 0.3, center.z + 4);
  } else if (director.phase === 'running' && tick > 720 && tick <= 960) {
    desired = new THREE.Vector3(center.x - 8.5, 4.6, center.z + 8.5);
    target = new THREE.Vector3(center.x, 0.15, center.z + 2.2);
  } else if (director.phase === 'running' && tick > 360 && tick <= 720) {
    desired = new THREE.Vector3(center.x + 13.5, 5.2, center.z - 1.2);
    target = new THREE.Vector3(center.x, 0.2, center.z + 2.2);
  } else if (director.phase === 'running' && tick > 960 && tick <= 1080) {
    desired = new THREE.Vector3(center.x + 5.2, 2.4, center.z - 4.5);
    target = new THREE.Vector3(center.x, 0.1, center.z + 0.5);
  } else {
    desired = new THREE.Vector3(center.x + 8.6, 5.8, center.z - 13.0);
    target = new THREE.Vector3(center.x, 0.25, center.z + 3.2);
  }
  if (reducedMotionQuery.matches && director.phase !== 'running') {
    camera.position.copy(desired);
  } else {
    camera.position.x = damp(camera.position.x, desired.x, 5.5, frameDt);
    camera.position.y = damp(camera.position.y, desired.y, 5.5, frameDt);
    camera.position.z = damp(camera.position.z, desired.z, 5.5, frameDt);
  }
  camera.lookAt(target);
}

function renderViewport(stateId, x, width, height, time) {
  const boatState = updateSceneForVariant(stateId, time);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setViewport(x, 0, width, height);
  renderer.setScissor(x, 0, width, height);
  renderer.render(scene, camera);
  return boatState;
}

function renderScene(frameDt) {
  if (!rendererReady()) return null;
  const width = runtime.width;
  const height = runtime.height;
  if (!width || !height) return null;
  updateCamera(currentVisualTime, currentVisualTick, frameDt);
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
      calm: renderViewport('calm', 0, leftWidth, height, currentVisualTime),
      wind: renderViewport('wind', leftWidth, width - leftWidth, height, currentVisualTime),
    };
    runtime.renderedVariants = 2;
  }
  renderer.setScissorTest(false);
  runtime.drawCalls = renderer.info.render.calls;
  runtime.triangles = renderer.info.render.triangles;
  if (!states.calm) states.calm = sampleBoat(currentVisualTime, SEA_STATES.calm.seaState);
  if (!states.wind) states.wind = sampleBoat(currentVisualTime, SEA_STATES.wind.seaState);
  return states;
}

function rendererReady() {
  return runtime.rendererReady && renderer && !renderer.getContext().isContextLost();
}

function resizeRenderer() {
  if (!renderer || !viewport) return;
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(devicePixelRatio || 1, quality.dprCap);
  runtime.width = width;
  runtime.height = height;
  runtime.dpr = dpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
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
    director.previewTick = (director.previewTick + frameDt * FIXED_HZ * 0.7) % 1080;
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
  updateResultTable(null);
  updateControls();
}

function completeRun() {
  director.tick = TOTAL_TICKS;
  director.phase = 'complete';
  director.paused = true;
  director.results = runDeterministicAB();
  updateResultTable(director.results);
  updateControls();
}

function resetRun() {
  director.phase = 'idle';
  director.tick = 0;
  director.previewTick = reducedMotionQuery.matches ? 480 : 0;
  director.accumulator = 0;
  director.paused = reducedMotionQuery.matches;
  director.previewMotion = !reducedMotionQuery.matches;
  director.results = null;
  updateResultTable(null);
  updateControls();
}

function togglePause() {
  if (director.phase !== 'running') return;
  director.paused = !director.paused;
  updateControls();
}

const resultDefinitions = [
  { key: 'heightStd', label: '水面高度 σ', digits: 3 },
  { key: 'crestP95', label: '波峰 P95', digits: 3 },
  { key: 'slopeP95', label: '坡度 P95', digits: 3 },
  { key: 'heaveRms', label: '升沉 RMS', digits: 3 },
  { key: 'rollRmsDeg', label: '横滚 RMS', digits: 2, suffix: '°' },
  { key: 'pitchRmsDeg', label: '俯仰 RMS', digits: 2, suffix: '°' },
];

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
      const ratio = b / a;
      const suffix = definition.suffix || '';
      row.innerHTML = `<span role="cell">${definition.label}</span><span role="cell">${a.toFixed(definition.digits)}${suffix}</span><span role="cell" class="value-b">${b.toFixed(definition.digits)}${suffix}</span><span role="cell" class="ratio-pass">${ratio.toFixed(2)}×</span>`;
    }
    dom.resultRows.append(row);
  }

  if (!results) {
    dom.resultState.textContent = '等待运行';
    dom.conclusion.classList.remove('pass');
    dom.conclusion.textContent = '运行完成后，只在本固定模型范围内判断 B 是否产生更高的水面与船体运动量。';
    return;
  }
  const passedCount = Object.values(results.checks).filter(Boolean).length;
  const totalCount = Object.keys(results.checks).length;
  dom.resultState.textContent = results.passed ? `${passedCount}/${totalCount} 通过` : `${passedCount}/${totalCount} 通过`;
  dom.conclusion.classList.toggle('pass', results.passed);
  dom.conclusion.textContent = `${results.boundedConclusion} 这不是现实风速或船舶安全结论。`;
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
  dom.cameraButton.textContent = `镜头：${director.cameraMode === 'chase' ? '追航' : '俯览'}`;
  dom.probeButton.textContent = `四点探针：${director.probesVisible ? '开' : '关'}`;
  dom.probeButton.setAttribute('aria-pressed', String(director.probesVisible));
  dom.motionButton.textContent = `运动：${director.previewMotion ? '自动' : '静止'}`;
}

function updateLiveUi(boatStates, now) {
  if (!boatStates || now - lastUiUpdateAt < 90) return;
  lastUiUpdateAt = now;
  const a = boatStates.calm;
  const b = boatStates.wind;
  dom.hudTime.textContent = `${currentVisualTime.toFixed(2)} s`;
  dom.hudStep.textContent = `${Math.round(currentVisualTick)} / ${TOTAL_TICKS}`;
  dom.hudFrame.textContent = runtime.frameTimeP50 == null ? '预热' : `${runtime.frameTimeP50.toFixed(1)} ms`;
  dom.hudDraw.textContent = `${runtime.drawCalls} / ${Math.round(runtime.triangles / 1000)}k tri`;
  dom.liveAHeave.textContent = `${a.heave >= 0 ? '+' : ''}${a.heave.toFixed(3)}`;
  dom.liveBHeave.textContent = `${b.heave >= 0 ? '+' : ''}${b.heave.toFixed(3)}`;
  dom.liveARoll.textContent = `${(a.roll * 180 / Math.PI).toFixed(2)}°`;
  dom.liveBRoll.textContent = `${(b.roll * 180 / Math.PI).toFixed(2)}°`;
  updateControls();
}

function collectFrameTime(frameDt) {
  const milliseconds = frameDt * 1000;
  if (milliseconds <= 0 || milliseconds > 120) return;
  runtime.frameTimes.push(milliseconds);
  if (runtime.frameTimes.length > 360) runtime.frameTimes.shift();
  if (runtime.frameTimes.length >= 30) {
    runtime.frameTimeP50 = percentile(runtime.frameTimes, 0.5);
    runtime.frameTimeP95 = percentile(runtime.frameTimes, 0.95);
  }
}

function animate(now) {
  if (physicsBridge.adapter) {
    animationFrame = 0;
    return;
  }
  animationFrame = requestAnimationFrame(animate);
  const frameDt = Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
  lastFrameAt = now;
  if (document.hidden || !rendererReady()) return;
  collectFrameTime(frameDt);
  stepDirector(frameDt);
  const boatStates = renderScene(frameDt);
  updateLiveUi(boatStates, now);
  if (runtime.firstFrameMs == null) runtime.firstFrameMs = performance.now() - initStartedAt;
}

function updatePhysicsBridgeUi() {
  const busy = physicsBridge.phase === 'loading' || physicsBridge.phase === 'running';
  const ready = physicsBridge.phase === 'ready' || physicsBridge.phase === 'complete';
  dom.physicsRun.disabled = busy;
  dom.physicsRun.textContent = physicsBridge.phase === 'loading'
    ? '正在创建 Particles4All WebGPU…'
    : physicsBridge.phase === 'running'
      ? '正在执行基线与海浪脉冲…'
      : physicsBridge.phase === 'complete'
        ? '重新运行 Ocean 近场契约 →'
        : '加载并运行 Ocean 近场契约 →';
  dom.physicsUnload.disabled = !physicsBridge.adapter || busy;
  dom.physicsPlaceholder.hidden = Boolean(physicsBridge.adapter && ready);
  dom.physicsStatus.textContent = physicsBridge.phase === 'loading'
    ? '正在加载原库'
    : physicsBridge.phase === 'running'
      ? '基线对照求解中'
      : physicsBridge.phase === 'complete'
        ? 'Ocean 复用证据已完成'
        : physicsBridge.phase === 'error'
          ? 'Ocean 近场运行失败'
          : physicsBridge.phase === 'ready'
            ? '共享执行器已连接'
            : '等待加载';
  if (physicsBridge.error) {
    dom.physicsConclusion.classList.remove('pass');
    dom.physicsConclusion.textContent = `Ocean 近场失败：${physicsBridge.error.message}`;
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
  director.previewMotion = false;
  currentVisualTick = getActiveTick();
  currentVisualTime = currentVisualTick / FIXED_HZ;
  renderScene(0);
  const engineUrl = `../../particles4all/engine/?${OCEAN_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
  dom.physicsFrame.src = engineUrl;
  dom.physicsOpen.href = engineUrl;
  const adapter = new Particles4AllRuntimeAdapter(dom.physicsFrame, { timeoutMs: 90000 });
  physicsBridge.adapter = adapter;
  try {
    await adapter.connect();
    physicsBridge.phase = 'ready';
    director.previewMotion = false;
    updateControls();
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
    physicsBridge.result = await runParticles4AllScene(adapter, OCEAN_NEAR_FIELD_SCENE);
    const {
      injection,
      step,
      bodyDisplacementDeltaAlongAxis,
      baselineBodyDisplacementAlongAxis,
      bodyRotationDegrees,
      bodyProfile,
      nonFinite,
      acceptance,
    } = physicsBridge.result;
    physicsBridge.phase = 'complete';
    dom.physicsInjected.textContent = `${injection.added} / ${injection.requested}`;
    dom.physicsTicks.textContent = `${step.actualTicks} / ${step.requestedTicks}`;
    dom.physicsBodyMotion.textContent = bodyDisplacementDeltaAlongAxis == null
      ? '无对照结果'
      : `${bodyDisplacementDeltaAlongAxis.toFixed(4)} u (Δ +Y)`;
    dom.physicsBodyRotation.textContent = `${bodyRotationDegrees.toFixed(2)}°`;
    dom.physicsBodyRole.textContent = bodyProfile.sceneRole;
    dom.physicsNonFinite.textContent = String(nonFinite);
    dom.physicsConclusion.classList.toggle('pass', acceptance.passed);
    dom.physicsConclusion.textContent = acceptance.passed
      ? `原生浮环 Gate 通过：Ocean 上升样本驱动局部 +Y 粒子脉冲；低密度 torus 相对基线增加 ${bodyDisplacementDeltaAlongAxis.toFixed(4)} u 上向响应，并旋转 ${bodyRotationDegrees.toFixed(2)}°（基线 ${baselineBodyDisplacementAlongAxis.toFixed(4)} u）。`
      : 'Ocean 近场已返回，但未同时满足注入、tick、有限值、相对基线上举、浮环旋转和 WebGPU Gate。';
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
  dom.physicsFrame.removeAttribute('src');
  dom.physicsInjected.textContent = '—';
  dom.physicsTicks.textContent = '—';
  dom.physicsBodyMotion.textContent = '—';
  dom.physicsBodyRotation.textContent = '—';
  dom.physicsBodyRole.textContent = '—';
  dom.physicsNonFinite.textContent = '—';
  dom.physicsConclusion.classList.remove('pass');
  dom.physicsConclusion.textContent = '这里验证 Ocean 表面采样能否驱动 Particles4All 原生低密度浮环的上举与姿态响应；不把结果解释为现实浮力、波压或近岸淹没。';
  updatePhysicsBridgeUi();
  if (!animationFrame) {
    lastFrameAt = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }
}

function populateContractUi() {
  const contract = inspectModelContract();
  dom.contractHash.textContent = contract.contractHash;
  dom.qualityLabel.textContent = `QUALITY · ${quality.id.toUpperCase()}`;
  dom.calmAmplitude.textContent = `${contract.seaStates.calm.seaState.toFixed(2)}×`;
  dom.windAmplitude.textContent = `${contract.seaStates.wind.seaState.toFixed(2)}×`;
  dom.calmSteepness.textContent = contract.seaStates.calm.totalSteepness.toFixed(3);
  dom.windSteepness.textContent = contract.seaStates.wind.totalSteepness.toFixed(3);
  const world = OCEAN_NEAR_FIELD_SCENE.mapping.world.parameters;
  const velocity = OCEAN_NEAR_FIELD_SCENE.scenario.emitters[0].velocity;
  dom.physicsContract.textContent = OCEAN_NEAR_FIELD_SCENE_HASH;
  dom.physicsHeight.textContent = `${world.surfaceHeightWorldUnits.toFixed(3)} u`;
  const body = OCEAN_NEAR_FIELD_SCENE.localPhysics.body;
  dom.physicsBodyProfile.textContent = `${body.shape} · ρ ${body.density.toFixed(2)}`;
  dom.physicsWorldVelocity.textContent = `+${world.verticalVelocityWorldUnitsPerSecond.toFixed(3)} u/s`;
  dom.physicsSolverVelocity.textContent = `(0, +${velocity[1].toFixed(2)}, 0) u/s`;
  dom.physicsExport.href = `data:application/json;charset=utf-8,${encodeURIComponent(OCEAN_NEAR_FIELD_SCENE_JSON)}`;
  dom.physicsOpen.href = `../../particles4all/engine/?${OCEAN_NEAR_FIELD_SCENE.localPhysics.engineQuery}`;
  updatePhysicsBridgeUi();
}

function getRuntimeSnapshot() {
  return {
    rendererReady: runtime.rendererReady,
    threeRevision: THREE.REVISION,
    modelVersion: MODEL_VERSION,
    qualityTier: quality.id,
    firstFrameMs: runtime.firstFrameMs,
    frameTimeP50: runtime.frameTimeP50,
    frameTimeP95: runtime.frameTimeP95,
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

function getUniformSnapshot(stateId) {
  const state = SEA_STATES[stateId];
  const resolved = resolveWaves(state.seaState);
  return resolved.waves.map((wave) => ({
    directionX: wave.directionX,
    directionZ: wave.directionZ,
    amplitude: wave.amplitude,
    k: wave.k,
    omega: wave.omega,
    phase: wave.phase,
    q: wave.q,
  }));
}

function showFailure(error) {
  console.warn('[Ocean MVP fallback]', error);
  document.body.dataset.renderState = 'failed';
  dom.runtimeLabel.textContent = '实时场景不可用';
  dom.fallbackReason.textContent = error?.message || String(error);
  runtime.rendererReady = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
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
    applySeaState('calm', 0);
    if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);

    runtime.rendererReady = true;
    document.body.dataset.renderState = 'ready';
    dom.runtimeLabel.textContent = `实时场景已就绪 · Three r${THREE.REVISION}`;
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(viewport);
    populateContractUi();
    updateResultTable(null);
    updateControls();
    lastFrameAt = performance.now();
    animationFrame = requestAnimationFrame(animate);
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
  director.cameraMode = director.cameraMode === 'chase' ? 'overview' : 'chase';
  updateControls();
});
dom.probeButton.addEventListener('click', () => {
  director.probesVisible = !director.probesVisible;
  updateControls();
});
dom.motionButton.addEventListener('click', () => {
  if (director.phase === 'running') return;
  director.previewMotion = !director.previewMotion;
  updateControls();
});
dom.physicsRun.addEventListener('click', () => {
  runPhysicsBridge().catch(() => {});
});
dom.physicsUnload.addEventListener('click', unloadPhysicsBridge);

$$('[data-mobile-variant]').forEach((button) => {
  button.addEventListener('click', () => {
    director.mobileVariant = button.dataset.mobileVariant;
    $$('[data-mobile-variant]').forEach((item) => item.classList.toggle('active', item === button));
  });
});

reducedMotionQuery.addEventListener('change', () => resetRun());
mobileQuery.addEventListener('change', resizeRenderer);
document.addEventListener('visibilitychange', () => {
  lastFrameAt = performance.now();
});
window.addEventListener('beforeunload', () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  physicsBridge.adapter?.dispose({ unload: true });
  renderer?.dispose();
});

window.__oceanLab = {
  version: '0.2.0',
  modelVersion: MODEL_VERSION,
  contractHash: CONTRACT_HASH,
  nearFieldSceneContractHash: OCEAN_NEAR_FIELD_SCENE_HASH,
  getNearFieldSceneContract: () => JSON.parse(OCEAN_NEAR_FIELD_SCENE_JSON),
  getState: () => ({ ...director, runtime: getRuntimeSnapshot() }),
  getRuntime: getRuntimeSnapshot,
  getUniformSnapshot,
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
  sampleSurface: (x, z, time, variant = 'calm') => sampleSurfaceAtWorldXZ(x, z, time, SEA_STATES[variant].seaState),
  runVerification: () => {
    director.results = runDeterministicAB();
    director.phase = 'complete';
    director.tick = TOTAL_TICKS;
    director.paused = true;
    currentVisualTick = TOTAL_TICKS;
    currentVisualTime = TOTAL_TICKS / FIXED_HZ;
    updateResultTable(director.results);
    updateControls();
    return { analysis: director.results, runtime: getRuntimeSnapshot() };
  },
};

initialize();
