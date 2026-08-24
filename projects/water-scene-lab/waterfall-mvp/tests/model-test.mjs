import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  BREAKUP_CASES,
  BREAKUP_CONFIG,
  BREAKUP_PROXIES,
  BREAKUP_SPEC_HASH,
  CONTRACT_HASH,
  CURTAIN_CONFIG,
  CURTAIN_HASH,
  FIXED_HZ,
  MEASURED_TICKS,
  TOTAL_TICKS,
  WARMUP_TICKS,
  evaluateBreakupProxy,
  evaluateCurtain,
  inspectModelContract,
  modelSelfCheck,
  proxyCycleAtTime,
  resolvedCaseConfig,
  runDeterministicAB,
  sampleBreakupLayer,
  sampleCurtainForCase,
} from '../../../../docs/demos/water-scene-lab/waterfall/waterfall-model.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, '..');
const modelPath = path.resolve(projectDir, '../../../docs/demos/water-scene-lab/waterfall/waterfall-model.mjs');
const outputPath = path.resolve(projectDir, 'assets/waterfall-model-test-results.json');
const checks = {};
const diagnostics = {};

const selfCheck = modelSelfCheck();
const contract = inspectModelContract();
checks.selfCheck = selfCheck.passed;
checks.fixedProtocol = FIXED_HZ === 60
  && TOTAL_TICKS === 1200
  && WARMUP_TICKS === 120
  && MEASURED_TICKS === 960;
checks.proxyTable = BREAKUP_PROXIES.length
  === BREAKUP_CONFIG.edgeProxyCount + BREAKUP_CONFIG.impactProxyCount;
checks.emitterTable = contract.emitterCounts.edgeFall === BREAKUP_CONFIG.edgeProxyCount
  && contract.emitterCounts.impactSpray === BREAKUP_CONFIG.impactProxyCount;
checks.explorationExcluded = BREAKUP_CONFIG.fixedFoamEnabled === false
  && BREAKUP_CONFIG.fixedMistEnabled === false;

let curtainCaseErrorMax = 0;
let curtainRepeatErrorMax = 0;
let curtainNonFiniteCount = 0;
for (const time of [0, 1 / FIXED_HZ, 2, 7.25, 12.5, 20]) {
  for (const u of [-1, -0.63, 0, 0.44, 1]) {
    for (const v of [0, 0.18, 0.52, 0.81, 1]) {
      const A = sampleCurtainForCase(u, v, time, BREAKUP_CASES.curtain);
      const B = sampleCurtainForCase(u, v, time, BREAKUP_CASES.hybrid);
      const repeated = evaluateCurtain(u, v, time);
      const valuesA = [...A.position, ...A.du, ...A.dv, ...A.normal, ...A.velocity, A.phase, A.flowDistance];
      const valuesB = [...B.position, ...B.du, ...B.dv, ...B.normal, ...B.velocity, B.phase, B.flowDistance];
      const valuesRepeated = [
        ...repeated.position,
        ...repeated.du,
        ...repeated.dv,
        ...repeated.normal,
        ...repeated.velocity,
        repeated.phase,
        repeated.flowDistance,
      ];
      for (let index = 0; index < valuesA.length; index += 1) {
        curtainCaseErrorMax = Math.max(curtainCaseErrorMax, Math.abs(valuesA[index] - valuesB[index]));
        curtainRepeatErrorMax = Math.max(curtainRepeatErrorMax, Math.abs(valuesA[index] - valuesRepeated[index]));
      }
      curtainNonFiniteCount += valuesA.filter((value) => !Number.isFinite(value)).length;
    }
  }
}
diagnostics.curtainCaseErrorMax = curtainCaseErrorMax;
diagnostics.curtainRepeatErrorMax = curtainRepeatErrorMax;
diagnostics.curtainNonFiniteCount = curtainNonFiniteCount;
checks.mainCurtainIdentical = curtainCaseErrorMax === 0;
checks.curtainRepeatable = curtainRepeatErrorMax === 0;
checks.curtainFinite = curtainNonFiniteCount === 0;

const top = evaluateCurtain(0, 0, 0);
const bottom = evaluateCurtain(0, 1, 0);
diagnostics.curtainTopY = top.position[1];
diagnostics.curtainBottomY = bottom.position[1];
checks.fixedCurtainEndpoints = Math.abs(top.position[1] - CURTAIN_CONFIG.topY) <= 1e-12
  && Math.abs(bottom.position[1] - CURTAIN_CONFIG.impactY) <= 1e-12
  && Math.abs(CURTAIN_CONFIG.topY - CURTAIN_CONFIG.impactY - CURTAIN_CONFIG.drop) <= 1e-12;

const fixedCurtainA = sampleCurtainForCase(-0.35, 0.62, 7.25, 'A');
const fixedCurtainB = sampleCurtainForCase(-0.35, 0.62, 7.25, 'B');
diagnostics.fixedCurtainSample = fixedCurtainA;
checks.fixedStartAndTime = JSON.stringify(fixedCurtainA) === JSON.stringify(fixedCurtainB)
  && fixedCurtainA.time === 7.25
  && evaluateCurtain(-0.35, 0.62, 0).time === 0;

let lifecycleViolationCount = 0;
let boundaryViolationCount = 0;
let sampledProxyNonFiniteCount = 0;
for (let proxyIndex = 0; proxyIndex < BREAKUP_PROXIES.length; proxyIndex += 1) {
  const proxy = BREAKUP_PROXIES[proxyIndex];
  for (const time of [0, 0.1, 1, 2.5, 7.25, 12.5, 20]) {
    const state = evaluateBreakupProxy(proxyIndex, time);
    const repeated = evaluateBreakupProxy(proxyIndex, time);
    if (JSON.stringify(state) !== JSON.stringify(repeated)) lifecycleViolationCount += 1;
    if (state.active && (state.age < 0 || state.age >= proxy.lifetime || state.normalizedAge < 0 || state.normalizedAge >= 1)) {
      lifecycleViolationCount += 1;
    }
    if (state.position) {
      sampledProxyNonFiniteCount += [
        state.position.x,
        state.position.y,
        state.position.z,
        state.opacity,
        state.size,
        state.edgeExpansion,
      ].filter((value) => !Number.isFinite(value)).length;
      const { bounds } = BREAKUP_CONFIG;
      if (state.position.x < bounds.minX || state.position.x > bounds.maxX
        || state.position.y < bounds.minY || state.position.y > bounds.maxY
        || state.position.z < bounds.minZ || state.position.z > bounds.maxZ) {
        boundaryViolationCount += 1;
      }
    }
  }

  const spawnTime = proxy.period - proxy.phaseOffset + 1e-7;
  const activeAtSpawn = proxyCycleAtTime(proxy, spawnTime);
  const expired = proxyCycleAtTime(proxy, spawnTime + proxy.lifetime + 1e-7);
  if (!activeAtSpawn.active || activeAtSpawn.age >= 1e-5 || expired.active || expired.age < proxy.lifetime) {
    lifecycleViolationCount += 1;
  }
}
diagnostics.lifecycleViolationCount = lifecycleViolationCount;
diagnostics.boundaryViolationCount = boundaryViolationCount;
diagnostics.sampledProxyNonFiniteCount = sampledProxyNonFiniteCount;
checks.proxyRepeatable = lifecycleViolationCount === 0;
checks.proxyLifetime = lifecycleViolationCount === 0;
checks.proxyBounds = boundaryViolationCount === 0;
checks.proxyFinite = sampledProxyNonFiniteCount === 0;

const curtainLayerAtFixedTime = sampleBreakupLayer(7.25, BREAKUP_CASES.curtain);
const hybridLayerAtFixedTime = sampleBreakupLayer(7.25, BREAKUP_CASES.hybrid);
diagnostics.fixedLayerCounts = {
  A: curtainLayerAtFixedTime.activeCount,
  B: hybridLayerAtFixedTime.activeCount,
  edgeB: hybridLayerAtFixedTime.edgeActiveCount,
  impactB: hybridLayerAtFixedTime.impactActiveCount,
};
checks.fixedLayerDifference = curtainLayerAtFixedTime.enabled === false
  && curtainLayerAtFixedTime.layerCount === 0
  && curtainLayerAtFixedTime.activeCount === 0
  && hybridLayerAtFixedTime.enabled === true
  && hybridLayerAtFixedTime.layerCount === 1
  && hybridLayerAtFixedTime.edgeActiveCount > 0
  && hybridLayerAtFixedTime.impactActiveCount > 0;

const firstAB = runDeterministicAB();
const repeatedAB = runDeterministicAB();
checks.abPassed = firstAB.passed;
checks.repeatableDigests = firstAB.A.resultDigest === repeatedAB.A.resultDigest
  && firstAB.B.resultDigest === repeatedAB.B.resultDigest
  && firstAB.A.caseHash === repeatedAB.A.caseHash
  && firstAB.B.caseHash === repeatedAB.B.caseHash;
checks.hashContract = firstAB.curtainHash === CURTAIN_HASH
  && firstAB.sharedContractHash === CONTRACT_HASH
  && firstAB.breakupSpecHash === BREAKUP_SPEC_HASH
  && firstAB.A.contractHash === firstAB.B.contractHash
  && firstAB.A.curtainHash === firstAB.B.curtainHash
  && firstAB.A.curtainProbeDigest === firstAB.B.curtainProbeDigest;

const configA = resolvedCaseConfig(BREAKUP_CASES.curtain);
const configB = resolvedCaseConfig(BREAKUP_CASES.hybrid);
const differingKeys = [...new Set([...Object.keys(configA), ...Object.keys(configB)])]
  .filter((key) => JSON.stringify(configA[key]) !== JSON.stringify(configB[key]))
  .sort();
diagnostics.caseConfigDifferingKeys = differingKeys;
checks.onlyBreakupModeDiffers = differingKeys.length === 1 && differingKeys[0] === 'breakupMode';
checks.mainCurtainResultIdentity = firstAB.A.curtainProbeDigest === firstAB.B.curtainProbeDigest;
checks.curtainOnlyIncrementIsZero = firstAB.A.layers.breakupLayerCount === 0
  && firstAB.A.metrics.activeProxyMean === 0
  && firstAB.A.metrics.edgeExpansionMean === 0
  && firstAB.A.metrics.impactOccupancyMean === 0
  && firstAB.A.metrics.mistCoverageMean === 0;
checks.hybridVisibleIncrement = firstAB.B.layers.breakupLayerCount === 1
  && firstAB.B.metrics.activeProxyMean > 0
  && firstAB.B.metrics.edgeExpansionMean > 0
  && firstAB.B.metrics.impactOccupancyMean > 0;
checks.mistExcluded = firstAB.A.metrics.mistCoverageMean === 0
  && firstAB.B.metrics.mistCoverageMean === 0
  && firstAB.increments.mistCoverageMean === 0;
checks.noNumericalFailures = firstAB.A.metrics.nonFiniteCount === 0
  && firstAB.B.metrics.nonFiniteCount === 0
  && firstAB.A.metrics.lifetimeViolationCount === 0
  && firstAB.B.metrics.lifetimeViolationCount === 0
  && firstAB.A.metrics.boundsViolationCount === 0
  && firstAB.B.metrics.boundsViolationCount === 0;

const report = {
  schemaVersion: '1.0',
  modelSourceSha256: crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),
  curtainHash: CURTAIN_HASH,
  sharedContractHash: CONTRACT_HASH,
  contractHash: CONTRACT_HASH,
  breakupSpecHash: BREAKUP_SPEC_HASH,
  checks,
  diagnostics,
  contract,
  ab: firstAB,
  passed: Object.values(checks).every(Boolean),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
