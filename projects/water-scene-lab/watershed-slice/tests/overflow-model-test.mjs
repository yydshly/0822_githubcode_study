import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  MOUNTAIN_WATERSHED_V0,
  OVERFLOW_CONTRACT_HASH,
  OVERFLOW_MODEL_VERSION,
  OVERFLOW_RUNTIME_V1,
  TRUTH_LEVELS,
  createOverflowWatershedState,
  hashObject,
  overflowModelSelfCheck,
  runOverflowWatershedAB,
  simulateOverflowWatershedCase,
  stepOverflowWatershed,
} from '../../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const modelPath = path.resolve(projectRoot, '..', '..', '..', 'docs', 'demos', 'water-scene-lab', 'watershed', 'watershed-model.mjs');
const tolerance = 1e-9;
const runs = runOverflowWatershedAB({ totalTicks: 1200 });
const low = runs.low.finalState;
const high = runs.high.finalState;
const replay = simulateOverflowWatershedCase({ dischargeScale: 1, totalTicks: 1200 });
const initialPool = MOUNTAIN_WATERSHED_V0.parameters.poolInitialVolumeM3;
const checks = {};

checks.selfCheck = overflowModelSelfCheck().passed;
checks.version = low.modelVersion === OVERFLOW_MODEL_VERSION && high.modelVersion === OVERFLOW_MODEL_VERSION;
checks.truthLevel = low.truthLevel === TRUTH_LEVELS.coupled && high.truthLevel === TRUTH_LEVELS.coupled;
checks.fixedDuration = Math.abs(low.timeS - 20) <= 1e-12 && Math.abs(high.timeS - 20) <= 1e-12;
checks.contractHashStable = OVERFLOW_CONTRACT_HASH === hashObject(OVERFLOW_RUNTIME_V1);
checks.sameExternalSource = Math.abs(low.cumulative.sourceInputM3 - high.cumulative.sourceInputM3) <= tolerance;
checks.lowDoesNotOverflow = low.cumulative.poolOverflowM3 === 0 && low.floodplainVolumeM3 === 0;
checks.highOverflows = high.cumulative.poolOverflowM3 > 28 && high.cumulative.poolOverflowM3 < 29;
checks.overflowDelayed = runs.high.firstOverflowTick > 600 && runs.high.firstOverflowTick < 1200;
checks.poolCapacityRespected = high.poolVolumeM3 <= MOUNTAIN_WATERSHED_V0.parameters.poolCapacityM3 + tolerance;
checks.poolBudgetClosed = Math.abs(
  initialPool + high.cumulative.depositedM3
    - high.cumulative.poolOutflowM3
    - high.cumulative.poolOverflowM3
    - high.poolVolumeM3,
) <= tolerance;
checks.floodplainBudgetClosed = Math.abs(
  high.cumulative.poolOverflowM3
    - high.cumulative.floodplainOutflowM3
    - high.floodplainVolumeM3,
) <= tolerance;
checks.globalBudgetsClosed = Math.abs(low.budget.residualM3) <= tolerance
  && Math.abs(high.budget.residualM3) <= tolerance;
checks.stepBudgetsClosed = runs.low.maxAbsoluteStepResidualM3 <= 1e-12
  && runs.high.maxAbsoluteStepResidualM3 <= 1e-12;
checks.highWetsFloodplain = high.floodplain.wetCellCount > 0 && runs.high.maximumWetCellCount > 0;
checks.lowKeepsFloodplainDry = low.floodplain.wetCellCount === 0 && runs.low.maximumWetCellCount === 0;
checks.storageRepresentedByCells = Math.abs(high.floodplain.representedStorageM3 - high.floodplainVolumeM3) <= tolerance
  && high.floodplain.unrepresentedStorageM3 === 0;
checks.cellDepthsBounded = high.floodplain.cells.every((cell) => cell.volumeM3 >= 0
  && cell.waterDepthM >= 0
  && cell.waterDepthM <= cell.maximumDepthM + tolerance);
checks.arrivalTicksBounded = high.floodplain.cells.filter((cell) => cell.wet)
  .every((cell) => cell.arrivalTick >= runs.high.firstOverflowTick && cell.arrivalTick <= 1200);
const wetPriorities = high.floodplain.cells.filter((cell) => cell.wet).map((cell) => cell.priority);
const dryPriorities = high.floodplain.cells.filter((cell) => !cell.wet).map((cell) => cell.priority);
checks.priorityPropagation = Math.max(...wetPriorities) <= Math.min(...dryPriorities);
checks.floodplainHasOpenBoundary = high.cumulative.floodplainOutflowM3 > 0
  && high.cumulative.floodplainOutflowM3 < high.cumulative.poolOverflowM3;
checks.riverAndWaterfallRemainCoupled = high.riverVolumeM3 < low.riverVolumeM3
  && high.lastStep.airborneVolumeM3 > low.lastStep.airborneVolumeM3
  && high.cumulative.depositedM3 > low.cumulative.depositedM3;
checks.deterministicReplay = replay.firstOverflowTick === runs.high.firstOverflowTick
  && replay.finalState.floodplain.wetCellCount === high.floodplain.wetCellCount
  && Math.abs(replay.finalState.floodplainVolumeM3 - high.floodplainVolumeM3) <= tolerance;
checks.finiteState = [
  high.poolVolumeM3,
  high.floodplainVolumeM3,
  high.budget.residualM3,
  high.floodplain.maximumDepthM,
].every(Number.isFinite);
checks.invalidStateRejected = false;
try {
  stepOverflowWatershed({ state: { modelVersion: 'wrong' } });
} catch (error) {
  checks.invalidStateRejected = error instanceof TypeError;
}
checks.invalidScaleRejected = false;
try {
  createOverflowWatershedState({ dischargeScale: 0 });
} catch (error) {
  checks.invalidScaleRejected = error instanceof RangeError;
}

const diagnostics = {
  low: {
    poolVolumeM3: low.poolVolumeM3,
    poolOverflowM3: low.cumulative.poolOverflowM3,
    floodplainVolumeM3: low.floodplainVolumeM3,
    wetCellCount: low.floodplain.wetCellCount,
    budgetResidualM3: low.budget.residualM3,
  },
  high: {
    poolVolumeM3: high.poolVolumeM3,
    poolOverflowM3: high.cumulative.poolOverflowM3,
    floodplainVolumeM3: high.floodplainVolumeM3,
    floodplainOutflowM3: high.cumulative.floodplainOutflowM3,
    wetCellCount: high.floodplain.wetCellCount,
    maximumDepthM: high.floodplain.maximumDepthM,
    firstOverflowTick: runs.high.firstOverflowTick,
    budgetResidualM3: high.budget.residualM3,
  },
};
const passed = Object.values(checks).every(Boolean);
const report = {
  createdAt: new Date().toISOString(),
  modelVersion: OVERFLOW_MODEL_VERSION,
  modelSha256: crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),
  overflowContractHash: OVERFLOW_CONTRACT_HASH,
  checks,
  diagnostics,
  passed,
};

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'watershed-overflow-model-test-results.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!passed) process.exitCode = 1;
