import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_HASH,
  MEASURED_TICKS,
  TOTAL_TICKS,
  WAVE_TABLE,
  evaluateSurface,
  modelSelfCheck,
  resolveWaves,
  runDeterministicAB,
  sampleSurfaceAtWorldXZ,
} from '../../../../docs/demos/water-scene-lab/ocean/ocean-model.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, '..');
const modelPath = path.resolve(projectDir, '../../../docs/demos/water-scene-lab/ocean/ocean-model.mjs');
const outputPath = path.resolve(projectDir, 'assets/model-test-results.json');
const checks = {};
const diagnostics = {};

const selfCheck = modelSelfCheck();
checks.selfCheck = selfCheck.passed;
checks.fixedProtocol = TOTAL_TICKS === 1200 && MEASURED_TICKS === 960;
checks.waveCount = WAVE_TABLE.length === 6;

const derivativeCases = [
  { u: -7.2, v: -3.4, time: 2.25, sea: 0.25 },
  { u: 0.3, v: 5.1, time: 8.75, sea: 1.0 },
  { u: 11.8, v: -9.7, time: 16.4, sea: 1.0 },
];
const epsilon = 1e-5;
let derivativeErrorMax = 0;
for (const sample of derivativeCases) {
  const center = evaluateSurface(sample.u, sample.v, sample.time, sample.sea);
  const plusU = evaluateSurface(sample.u + epsilon, sample.v, sample.time, sample.sea);
  const minusU = evaluateSurface(sample.u - epsilon, sample.v, sample.time, sample.sea);
  const plusV = evaluateSurface(sample.u, sample.v + epsilon, sample.time, sample.sea);
  const minusV = evaluateSurface(sample.u, sample.v - epsilon, sample.time, sample.sea);
  for (let axis = 0; axis < 3; axis += 1) {
    const numericU = (plusU.position[axis] - minusU.position[axis]) / (2 * epsilon);
    const numericV = (plusV.position[axis] - minusV.position[axis]) / (2 * epsilon);
    derivativeErrorMax = Math.max(
      derivativeErrorMax,
      Math.abs(numericU - center.pu[axis]),
      Math.abs(numericV - center.pv[axis]),
    );
  }
}
diagnostics.derivativeErrorMax = derivativeErrorMax;
checks.analyticDerivatives = derivativeErrorMax <= 1e-4;

const inverseCases = [
  { u: -12.4, v: -7.1, time: 1.2, sea: 0.25 },
  { u: -2.8, v: 3.7, time: 6.9, sea: 1.0 },
  { u: 8.4, v: 12.6, time: 13.3, sea: 1.0 },
  { u: 15.7, v: -10.2, time: 18.1, sea: 0.25 },
];
let inverseParameterErrorMax = 0;
let inverseHeightErrorMax = 0;
let inverseResidualMax = 0;
for (const testCase of inverseCases) {
  const forward = evaluateSurface(testCase.u, testCase.v, testCase.time, testCase.sea);
  const inverse = sampleSurfaceAtWorldXZ(forward.position[0], forward.position[2], testCase.time, testCase.sea);
  inverseParameterErrorMax = Math.max(inverseParameterErrorMax, Math.hypot(inverse.u - testCase.u, inverse.v - testCase.v));
  inverseHeightErrorMax = Math.max(inverseHeightErrorMax, Math.abs(inverse.position[1] - forward.position[1]));
  inverseResidualMax = Math.max(inverseResidualMax, inverse.residual);
  checks.inverseAllValid = checks.inverseAllValid !== false && inverse.valid;
}
diagnostics.inverseParameterErrorMax = inverseParameterErrorMax;
diagnostics.inverseHeightErrorMax = inverseHeightErrorMax;
diagnostics.inverseResidualMax = inverseResidualMax;
checks.inverseRoundTrip = inverseParameterErrorMax <= 1e-4 && inverseHeightErrorMax <= 1e-4 && inverseResidualMax <= 1e-3;

const calmResolved = resolveWaves('calm');
const windResolved = resolveWaves('wind');
checks.steepnessContract = calmResolved.totalSteepness <= 0.55
  && windResolved.totalSteepness <= 0.55
  && windResolved.maxSingleSteepness <= 0.12;
checks.invalidStateRejected = false;
try {
  resolveWaves(1.1);
} catch {
  checks.invalidStateRejected = true;
}

const firstAB = runDeterministicAB();
const repeatedAB = runDeterministicAB();
checks.abPassed = firstAB.passed;
checks.repeatableDigest = firstAB.A.resultDigest === repeatedAB.A.resultDigest
  && firstAB.B.resultDigest === repeatedAB.B.resultDigest;
checks.commonContract = firstAB.contractHash === CONTRACT_HASH
  && firstAB.A.contractHash === firstAB.B.contractHash;
checks.noNumericalFailures = firstAB.A.metrics.nonFiniteCount === 0
  && firstAB.B.metrics.nonFiniteCount === 0
  && firstAB.A.metrics.inverseFailCount === 0
  && firstAB.B.metrics.inverseFailCount === 0;

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
