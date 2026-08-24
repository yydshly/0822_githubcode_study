import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  COUPLED_CONTRACT_HASH,
  COUPLED_MODEL_VERSION,
  MOUNTAIN_WATERSHED_V0,
  TRUTH_LEVELS,
  coupledModelSelfCheck,
  createCoupledWatershedState,
  deriveWatershedStep,
  hashObject,
  runCoupledWatershedAB,
  simulateCoupledWatershedCase,
  stepCoupledWatershed,
} from '../../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, '..');
const modelPath = path.resolve(projectDir, '../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs');
const outputPath = path.resolve(projectDir, 'assets/watershed-coupled-model-test-results.json');
const checks = {};
const diagnostics = {};
const tolerance = 1e-9;

const selfCheck = coupledModelSelfCheck();
const runs = runCoupledWatershedAB({ totalTicks: 1200 });
const low = runs.low.finalState;
const high = runs.high.finalState;
const initialRiver = MOUNTAIN_WATERSHED_V0.parameters.riverInitialVolumeM3;
const initialPool = MOUNTAIN_WATERSHED_V0.parameters.poolInitialVolumeM3;
const expectedSourceInput = MOUNTAIN_WATERSHED_V0.parameters.sourceInflowM3s * 20;
const lowMapped = deriveWatershedStep({ dischargeScale: 0.5 });
const highMapped = deriveWatershedStep({ dischargeScale: 1 });

diagnostics.low = runs.low;
diagnostics.high = runs.high;

checks.selfCheck = selfCheck.passed;
checks.version = low.modelVersion === COUPLED_MODEL_VERSION && high.modelVersion === COUPLED_MODEL_VERSION;
checks.truthLevel = low.truthLevel === TRUTH_LEVELS.coupled && high.truthLevel === TRUTH_LEVELS.coupled;
checks.fixedDuration = Math.abs(low.timeS - 20) <= 1e-12 && Math.abs(high.timeS - 20) <= 1e-12;
checks.contractHashStable = COUPLED_CONTRACT_HASH === hashObject({
  id: 'mountain-watershed-coupled-v1',
  modelVersion: COUPLED_MODEL_VERSION,
  baseScenarioHash: low.scenarioHash,
  truthLevel: TRUTH_LEVELS.coupled,
  transportModel: 'fixed-delay-volume-packets',
  depositionModel: 'analytical-impact-at-pool',
  packetClock: 'fixed-step-60hz',
});
checks.sameExternalSource = Math.abs(low.cumulative.sourceInputM3 - expectedSourceInput) <= tolerance
  && Math.abs(high.cumulative.sourceInputM3 - expectedSourceInput) <= tolerance;
checks.riverEmissionMapped = Math.abs(low.cumulative.riverEmissionM3 - 60) <= tolerance
  && Math.abs(high.cumulative.riverEmissionM3 - 120) <= tolerance;
checks.riverInventoryDebited = Math.abs(
  initialRiver + low.cumulative.sourceInputM3 - low.cumulative.riverEmissionM3 - low.riverVolumeM3,
) <= tolerance && Math.abs(
  initialRiver + high.cumulative.sourceInputM3 - high.cumulative.riverEmissionM3 - high.riverVolumeM3,
) <= tolerance;
checks.inFlightPacketsPresent = low.packets.length > 0 && high.packets.length > 0
  && low.lastStep.airborneVolumeM3 > 0 && high.lastStep.airborneVolumeM3 > 0;
checks.packetAgesBounded = [...low.packets, ...high.packets]
  .every((packet) => packet.ageS >= 0 && packet.ageS < packet.flightTimeS);
checks.packetVolumeMapped = low.packets.every((packet) => Math.abs(packet.volumeM3 - lowMapped.transfers[1].volumeM3) <= 1e-12)
  && high.packets.every((packet) => Math.abs(packet.volumeM3 - highMapped.transfers[1].volumeM3) <= 1e-12);
checks.airborneIdentity = Math.abs(
  low.cumulative.riverEmissionM3 - low.cumulative.depositedM3 - low.lastStep.airborneVolumeM3,
) <= tolerance && Math.abs(
  high.cumulative.riverEmissionM3 - high.cumulative.depositedM3 - high.lastStep.airborneVolumeM3,
) <= tolerance;
checks.poolDepositionIdentity = Math.abs(
  initialPool + low.cumulative.depositedM3 - low.cumulative.poolOutflowM3 - low.poolVolumeM3,
) <= tolerance && Math.abs(
  initialPool + high.cumulative.depositedM3 - high.cumulative.poolOutflowM3 - high.poolVolumeM3,
) <= tolerance;
checks.impactVelocityMapped = [...low.packets].every((packet) => Math.abs(packet.impactVelocityMps - lowMapped.waterfall.impactVelocityMps) <= 1e-12)
  && [...high.packets].every((packet) => Math.abs(packet.impactVelocityMps - highMapped.waterfall.impactVelocityMps) <= 1e-12);
checks.depositionOccursAfterDelay = low.cumulative.depositedM3 > 0 && high.cumulative.depositedM3 > 0
  && runs.low.maximumPacketCount > 100 && runs.high.maximumPacketCount > 100;
checks.globalBudgetsClosed = Math.abs(low.budget.residualM3) <= tolerance
  && Math.abs(high.budget.residualM3) <= tolerance;
checks.stepBudgetsClosed = runs.low.maxAbsoluteStepResidualM3 <= 1e-12
  && runs.high.maxAbsoluteStepResidualM3 <= 1e-12;
checks.highFlowHasMoreAirborneWater = high.lastStep.airborneVolumeM3 > low.lastStep.airborneVolumeM3;
checks.highFlowDepositsMore = high.cumulative.depositedM3 > low.cumulative.depositedM3;
checks.highFlowRaisesPoolMore = runs.high.poolLevelRiseM > runs.low.poolLevelRiseM;
checks.nonNegativeStorage = [low, high].every((state) => state.riverVolumeM3 >= 0 && state.poolVolumeM3 >= 0);
checks.deterministicReplay = JSON.stringify(simulateCoupledWatershedCase({ dischargeScale: 1, totalTicks: 1200 }))
  === JSON.stringify(runs.high);
checks.invalidStateRejected = false;
try {
  stepCoupledWatershed({ state: { modelVersion: 'wrong' } });
} catch (error) {
  checks.invalidStateRejected = error instanceof TypeError;
}
checks.invalidScaleRejected = false;
try {
  createCoupledWatershedState({ dischargeScale: 0 });
} catch (error) {
  checks.invalidScaleRejected = error instanceof RangeError;
}

const passed = Object.values(checks).every(Boolean);
const report = {
  createdAt: new Date().toISOString(),
  modelVersion: COUPLED_MODEL_VERSION,
  modelSha256: crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),
  coupledContractHash: COUPLED_CONTRACT_HASH,
  checks,
  diagnostics,
  passed,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!passed) process.exitCode = 1;
