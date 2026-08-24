import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  FLOODPLAIN_ROUTING_MODES,
  MOUNTAIN_WATERSHED_V0,
  OVERFLOW_CONTRACT_HASH,
  OVERFLOW_MODEL_VERSION,
  OVERFLOW_RUNTIME_V1,
  floodplainRoutingSelfCheck,
  hashObject,
  runFloodplainRoutingAB,
  simulateOverflowWatershedCase,
} from '../../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const modelPath = path.resolve(projectRoot, '..', '..', '..', 'docs', 'demos', 'water-scene-lab', 'watershed', 'watershed-model.mjs');
const tolerance = 1e-9;
const runs = runFloodplainRoutingAB({ totalTicks: 1200 });
const open = runs.open.finalState;
const barrier = runs.barrier.finalState;
const replay = simulateOverflowWatershedCase({
  dischargeScale: 1,
  floodplainRoutingMode: FLOODPLAIN_ROUTING_MODES.barrier,
  totalTicks: 1200,
});
const checks = {};

checks.selfCheck = floodplainRoutingSelfCheck().passed;
checks.version = open.modelVersion === OVERFLOW_MODEL_VERSION && barrier.modelVersion === OVERFLOW_MODEL_VERSION;
checks.contractHashStable = OVERFLOW_CONTRACT_HASH === hashObject(OVERFLOW_RUNTIME_V1);
checks.fixedDuration = open.tick === 1200 && barrier.tick === 1200 && Math.abs(open.timeS - 20) <= 1e-12;
checks.onlyRoutingModeDiffers = open.dischargeScale === barrier.dischargeScale
  && open.floodplainRoutingMode === FLOODPLAIN_ROUTING_MODES.open
  && barrier.floodplainRoutingMode === FLOODPLAIN_ROUTING_MODES.barrier;
checks.sameUpstreamInventory = Math.abs(open.riverVolumeM3 - barrier.riverVolumeM3) <= tolerance;
checks.sameAirborneVolume = Math.abs(open.lastStep.airborneVolumeM3 - barrier.lastStep.airborneVolumeM3) <= tolerance;
checks.sameDepositedVolume = Math.abs(open.cumulative.depositedM3 - barrier.cumulative.depositedM3) <= tolerance;
checks.samePoolState = Math.abs(open.poolVolumeM3 - barrier.poolVolumeM3) <= tolerance;
checks.sameOverflowInput = Math.abs(open.cumulative.poolOverflowM3 - barrier.cumulative.poolOverflowM3) <= tolerance;
checks.sameFloodplainStorage = Math.abs(open.floodplainVolumeM3 - barrier.floodplainVolumeM3) <= tolerance;
checks.sameBoundaryOutput = Math.abs(open.cumulative.floodplainOutflowM3 - barrier.cumulative.floodplainOutflowM3) <= tolerance;
checks.sameOverflowArrival = runs.open.firstOverflowTick === runs.barrier.firstOverflowTick;
checks.eightBarrierCells = open.floodplain.blockedCellCount === 0 && barrier.floodplain.blockedCellCount === 8;
checks.blockedCellsStayDry = barrier.floodplain.cells.every((cell) => !cell.blocked || (!cell.wet && cell.volumeM3 === 0));
checks.openCellsHaveNoBarriers = open.floodplain.cells.every((cell) => !cell.blocked);
checks.routeSignatureChanges = open.floodplain.wetRouteSignature !== barrier.floodplain.wetRouteSignature;
checks.detourMovesWaterSideways = barrier.floodplain.meanWetAbsXM > open.floodplain.meanWetAbsXM;
checks.detourReachesFartherRow = barrier.floodplain.maximumWetRow > open.floodplain.maximumWetRow;
checks.detourChangesDownstreamReach = barrier.floodplain.downstreamWetCellCount > open.floodplain.downstreamWetCellCount;
checks.storageRepresented = open.floodplain.unrepresentedStorageM3 === 0
  && barrier.floodplain.unrepresentedStorageM3 === 0
  && Math.abs(open.floodplain.representedStorageM3 - open.floodplainVolumeM3) <= tolerance
  && Math.abs(barrier.floodplain.representedStorageM3 - barrier.floodplainVolumeM3) <= tolerance;
checks.cellDepthsBounded = [...open.floodplain.cells, ...barrier.floodplain.cells].every((cell) => (
  Number.isFinite(cell.waterDepthM)
  && cell.waterDepthM >= 0
  && cell.waterDepthM <= cell.maximumDepthM + tolerance
));
checks.globalBudgetsClosed = Math.abs(open.budget.residualM3) <= tolerance
  && Math.abs(barrier.budget.residualM3) <= tolerance;
checks.stepBudgetsClosed = runs.open.maxAbsoluteStepResidualM3 <= 1e-12
  && runs.barrier.maxAbsoluteStepResidualM3 <= 1e-12;
checks.deterministicReplay = replay.finalState.floodplain.wetRouteSignature === barrier.floodplain.wetRouteSignature
  && Math.abs(replay.finalState.floodplain.meanWetAbsXM - barrier.floodplain.meanWetAbsXM) <= tolerance;
checks.invalidRoutingModeRejected = false;
try {
  simulateOverflowWatershedCase({ floodplainRoutingMode: 'unknown-route', totalTicks: 1 });
} catch (error) {
  checks.invalidRoutingModeRejected = error instanceof RangeError;
}

const diagnostics = {
  shared: {
    poolOverflowM3: open.cumulative.poolOverflowM3,
    floodplainVolumeM3: open.floodplainVolumeM3,
    floodplainOutflowM3: open.cumulative.floodplainOutflowM3,
    firstOverflowTick: runs.open.firstOverflowTick,
  },
  open: {
    routingMode: open.floodplainRoutingMode,
    wetCellCount: open.floodplain.wetCellCount,
    downstreamWetCellCount: open.floodplain.downstreamWetCellCount,
    meanWetAbsXM: open.floodplain.meanWetAbsXM,
    maximumWetRow: open.floodplain.maximumWetRow,
    wetRouteSignature: open.floodplain.wetRouteSignature,
  },
  barrier: {
    routingMode: barrier.floodplainRoutingMode,
    blockedCellCount: barrier.floodplain.blockedCellCount,
    wetCellCount: barrier.floodplain.wetCellCount,
    downstreamWetCellCount: barrier.floodplain.downstreamWetCellCount,
    meanWetAbsXM: barrier.floodplain.meanWetAbsXM,
    maximumWetRow: barrier.floodplain.maximumWetRow,
    wetRouteSignature: barrier.floodplain.wetRouteSignature,
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
fs.writeFileSync(path.join(assetsDir, 'watershed-floodplain-routing-test-results.json'), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!passed) process.exitCode = 1;
