import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_HASH,
  CONTROL_POINTS,
  FLOW_CASES,
  MARKERS,
  MEASURED_TICKS,
  PATH_LENGTH,
  RIVER_CONFIG,
  TOTAL_TICKS,
  closestCenterlinePoint,
  evaluateCenterline,
  markerStateAtTime,
  modelSelfCheck,
  runDeterministicAB,
  sampleFlowAtWorldXZ,
  samplePathByDistance,
} from '../../../../docs/demos/water-scene-lab/river/river-model.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, '..');
const modelPath = path.resolve(projectDir, '../../../docs/demos/water-scene-lab/river/river-model.mjs');
const outputPath = path.resolve(projectDir, 'assets/river-model-test-results.json');
const checks = {};
const diagnostics = {};

const selfCheck = modelSelfCheck();
checks.selfCheck = selfCheck.passed;
checks.fixedProtocol = TOTAL_TICKS === 1200 && MEASURED_TICKS === 960;
checks.controlPoints = CONTROL_POINTS.length === 8;
checks.markerCount = MARKERS.length === 8;
checks.pathLength = PATH_LENGTH > 60 && PATH_LENGTH < 100;

const epsilon = 1e-5;
let tangentErrorMax = 0;
for (const s of [0.08, 0.17, 0.33, 0.50, 0.67, 0.83, 0.94]) {
  const center = evaluateCenterline(s);
  const before = evaluateCenterline(s - epsilon);
  const after = evaluateCenterline(s + epsilon);
  const dx = (after.x - before.x) / (2 * epsilon);
  const dz = (after.z - before.z) / (2 * epsilon);
  const length = Math.hypot(dx, dz);
  tangentErrorMax = Math.max(
    tangentErrorMax,
    Math.hypot(dx / length - center.tangentX, dz / length - center.tangentZ),
  );
}
diagnostics.tangentErrorMax = tangentErrorMax;
checks.analyticTangents = tangentErrorMax <= 1e-6;

let tangentJoinAngleMaxDeg = 0;
for (let index = 1; index < CONTROL_POINTS.length - 1; index += 1) {
  const s = index / (CONTROL_POINTS.length - 1);
  const before = evaluateCenterline(s - 1e-6);
  const after = evaluateCenterline(s + 1e-6);
  const dot = Math.max(-1, Math.min(1, before.tangentX * after.tangentX + before.tangentZ * after.tangentZ));
  tangentJoinAngleMaxDeg = Math.max(tangentJoinAngleMaxDeg, Math.acos(dot) * 180 / Math.PI);
}
diagnostics.tangentJoinAngleMaxDeg = tangentJoinAngleMaxDeg;
checks.tangentContinuity = tangentJoinAngleMaxDeg <= 0.01;

let frameUnitErrorMax = 0;
let closestLateralErrorMax = 0;
for (const s of [0.06, 0.21, 0.39, 0.58, 0.76, 0.92]) {
  const sample = evaluateCenterline(s);
  frameUnitErrorMax = Math.max(
    frameUnitErrorMax,
    Math.abs(Math.hypot(sample.tangentX, sample.tangentZ) - 1),
    Math.abs(Math.hypot(sample.normalX, sample.normalZ) - 1),
    Math.abs(sample.tangentX * sample.normalX + sample.tangentZ * sample.normalZ),
  );
  for (const offset of [-2.2, -0.7, 0.9, 2.25]) {
    const query = closestCenterlinePoint(
      sample.x + sample.normalX * offset,
      sample.z + sample.normalZ * offset,
    );
    closestLateralErrorMax = Math.max(closestLateralErrorMax, Math.abs(query.lateral - offset));
  }
}
diagnostics.frameUnitErrorMax = frameUnitErrorMax;
diagnostics.closestLateralErrorMax = closestLateralErrorMax;
checks.orthonormalFrame = frameUnitErrorMax <= 1e-9;
checks.closestRoundTrip = closestLateralErrorMax <= 1e-3;

let reconstructedArcLength = 0;
let previousArcSample = samplePathByDistance(0);
const reconstructionSamples = 2048;
for (let index = 1; index <= reconstructionSamples; index += 1) {
  const requestedDistance = PATH_LENGTH * index / reconstructionSamples;
  const sample = index === reconstructionSamples
    ? evaluateCenterline(1)
    : samplePathByDistance(requestedDistance);
  reconstructedArcLength += Math.hypot(sample.x - previousArcSample.x, sample.z - previousArcSample.z);
  previousArcSample = sample;
}
const arcReconstructionError = Math.abs(reconstructedArcLength - PATH_LENGTH);
diagnostics.reconstructedArcLength = reconstructedArcLength;
diagnostics.arcReconstructionError = arcReconstructionError;
checks.arcLengthSampling = arcReconstructionError <= 0.01;

const endByDistance = samplePathByDistance(PATH_LENGTH);
const endByParameter = evaluateCenterline(1);
diagnostics.pathEndError = Math.hypot(
  endByDistance.x - endByParameter.x,
  endByDistance.z - endByParameter.z,
);
checks.openPathEndpoint = diagnostics.pathEndError <= 1e-9
  && Math.abs(endByDistance.distance - PATH_LENGTH) <= 1e-9;
checks.openPathRejectsOverflow = false;
try {
  samplePathByDistance(PATH_LENGTH + 0.01);
} catch (error) {
  checks.openPathRejectsOverflow = error instanceof RangeError;
}

const start = evaluateCenterline(0);
const end = evaluateCenterline(1);
const beforeStart = closestCenterlinePoint(
  start.x - start.tangentX * (RIVER_CONFIG.width + 1),
  start.z - start.tangentZ * (RIVER_CONFIG.width + 1),
);
const afterEnd = closestCenterlinePoint(
  end.x + end.tangentX * (RIVER_CONFIG.width + 1),
  end.z + end.tangentZ * (RIVER_CONFIG.width + 1),
);
checks.endpointOutsideChannel = !beforeStart.inChannel && !afterEnd.inChannel;

const polyline = Array.from({ length: 257 }, (_, index) => samplePathByDistance(PATH_LENGTH * index / 256));
const segmentIntersects = (a, b, c, d) => {
  const cross = (p, q, r) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD < -1e-10 && cdA * cdB < -1e-10;
};
let nonAdjacentIntersectionCount = 0;
for (let first = 0; first < polyline.length - 1; first += 1) {
  for (let second = first + 2; second < polyline.length - 1; second += 1) {
    if (segmentIntersects(polyline[first], polyline[first + 1], polyline[second], polyline[second + 1])) {
      nonAdjacentIntersectionCount += 1;
    }
  }
}
diagnostics.nonAdjacentIntersectionCount = nonAdjacentIntersectionCount;
checks.centerlineNoSelfIntersection = nonAdjacentIntersectionCount === 0;

const expectedArcStep = PATH_LENGTH / 256;
const arcSteps = polyline.slice(1).map((sample, index) => Math.hypot(
  sample.x - polyline[index].x,
  sample.z - polyline[index].z,
));
diagnostics.equalArcStepMaxError = Math.max(...arcSteps.map((step) => Math.abs(step - expectedArcStep)));
checks.equalArcSpacing = diagnostics.equalArcStepMaxError <= 0.002;

let shoreWidthErrorMax = 0;
for (const s of [0, 0.08, 0.22, 0.41, 0.63, 0.81, 1]) {
  const channel = evaluateCenterline(s);
  const halfWidth = RIVER_CONFIG.width * 0.5;
  const left = { x: channel.x + channel.normalX * halfWidth, z: channel.z + channel.normalZ * halfWidth };
  const right = { x: channel.x - channel.normalX * halfWidth, z: channel.z - channel.normalZ * halfWidth };
  shoreWidthErrorMax = Math.max(
    shoreWidthErrorMax,
    Math.abs(Math.hypot(left.x - right.x, left.z - right.z) - RIVER_CONFIG.width),
  );
}
diagnostics.shoreWidthErrorMax = shoreWidthErrorMax;
checks.shoreWidthStable = shoreWidthErrorMax <= 1e-9;

const flowProbes = [
  evaluateCenterline(0.12),
  evaluateCenterline(0.38),
  evaluateCenterline(0.63),
  evaluateCenterline(0.87),
];
let guidedDirectionErrorMax = 0;
let speedMagnitudeErrorMax = 0;
checks.uniformDirectionConstant = true;
for (const probe of flowProbes) {
  const A = sampleFlowAtWorldXZ(probe.x, probe.z, FLOW_CASES.uniform);
  const B = sampleFlowAtWorldXZ(probe.x, probe.z, FLOW_CASES.guided);
  checks.uniformDirectionConstant = checks.uniformDirectionConstant
    && Math.abs(A.directionX) <= 1e-12
    && Math.abs(A.directionZ - 1) <= 1e-12;
  guidedDirectionErrorMax = Math.max(
    guidedDirectionErrorMax,
    Math.hypot(B.directionX - B.closest.tangentX, B.directionZ - B.closest.tangentZ),
  );
  speedMagnitudeErrorMax = Math.max(
    speedMagnitudeErrorMax,
    Math.abs(Math.hypot(A.directionX, A.directionZ) * A.speed - RIVER_CONFIG.flowSpeed),
    Math.abs(Math.hypot(B.directionX, B.directionZ) * B.speed - RIVER_CONFIG.flowSpeed),
  );
}
diagnostics.guidedDirectionErrorMax = guidedDirectionErrorMax;
diagnostics.speedMagnitudeErrorMax = speedMagnitudeErrorMax;
checks.guidedMatchesTangent = guidedDirectionErrorMax <= 1e-9;
checks.equalSpeedMagnitude = speedMagnitudeErrorMax <= 1e-9;

checks.invalidModeRejected = false;
try {
  sampleFlowAtWorldXZ(0, 0, { flowMode: 'invalid' });
} catch {
  checks.invalidModeRejected = true;
}

let markerDeterminismErrorMax = 0;
for (const time of [0, 2.5, 8, 14.25, 20]) {
  for (let markerIndex = 0; markerIndex < MARKERS.length; markerIndex += 1) {
    const first = markerStateAtTime(markerIndex, time, FLOW_CASES.guided);
    const second = markerStateAtTime(markerIndex, time, FLOW_CASES.guided);
    markerDeterminismErrorMax = Math.max(
      markerDeterminismErrorMax,
      Math.hypot(first.x - second.x, first.z - second.z),
    );
  }
}
diagnostics.markerDeterminismErrorMax = markerDeterminismErrorMax;
checks.markerDeterminism = markerDeterminismErrorMax === 0;

let initialParityErrorMax = 0;
for (let markerIndex = 0; markerIndex < MARKERS.length; markerIndex += 1) {
  const A = markerStateAtTime(markerIndex, 0, FLOW_CASES.uniform);
  const B = markerStateAtTime(markerIndex, 0, FLOW_CASES.guided);
  initialParityErrorMax = Math.max(initialParityErrorMax, Math.hypot(A.x - B.x, A.z - B.z));
}
diagnostics.initialParityErrorMax = initialParityErrorMax;
checks.initialMarkerParity = initialParityErrorMax <= 1e-12;

const firstAB = runDeterministicAB();
const repeatedAB = runDeterministicAB();
checks.abPassed = firstAB.passed;
checks.repeatableDigest = firstAB.A.resultDigest === repeatedAB.A.resultDigest
  && firstAB.B.resultDigest === repeatedAB.B.resultDigest;
checks.commonContract = firstAB.contractHash === CONTRACT_HASH
  && firstAB.A.contractHash === firstAB.B.contractHash;
checks.onlyFlowModeDiffers = firstAB.A.flowMode === 'uniform_world'
  && firstAB.B.flowMode === 'spline_tangent'
  && firstAB.A.caseConfigHash !== firstAB.B.caseConfigHash;
checks.noNumericalFailures = firstAB.A.metrics.nonFiniteCount === 0
  && firstAB.B.metrics.nonFiniteCount === 0;

const report = {
  schemaVersion: '1.0',
  modelSourceSha256: crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),
  contractHash: CONTRACT_HASH,
  checks,
  diagnostics,
  ab: firstAB,
  passed: Object.values(checks).every(Boolean),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
