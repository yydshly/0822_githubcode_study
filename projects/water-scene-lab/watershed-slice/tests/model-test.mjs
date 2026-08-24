import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  MODEL_VERSION,
  MOUNTAIN_WATERSHED_V0,
  SCENARIO_HASH,
  SI_UNITS,
  TRUTH_LEVELS,
  deriveWatershedStep,
  hashObject,
  modelSelfCheck,
  simulateWatershedCase,
  validateScenarioDefinition,
} from '../../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(testDir, '..');
const modelPath = path.resolve(projectDir, '../../../docs/demos/water-scene-lab/watershed/watershed-model.mjs');
const outputPath = path.resolve(projectDir, 'assets/watershed-model-test-results.json');
const checks = {};
const diagnostics = {};

const validation = validateScenarioDefinition();
const selfCheck = modelSelfCheck();
checks.selfCheck = selfCheck.passed;
checks.scenarioValid = validation.passed;
checks.nodeCount = MOUNTAIN_WATERSHED_V0.nodes.length === 7;
checks.edgeCount = MOUNTAIN_WATERSHED_V0.edges.length === 6;
checks.topology = validation.topologicalOrder.join('>')
  === 'source>upper-river>cliff-drop>main-waterfall>lower-pool>floodplain>sink';
checks.siUnits = Object.entries(SI_UNITS)
  .every(([name, unit]) => MOUNTAIN_WATERSHED_V0.world.units[name] === unit);
checks.truthLevel = MOUNTAIN_WATERSHED_V0.truthLevel === TRUTH_LEVELS.mapped;
checks.fixedProtocol = MOUNTAIN_WATERSHED_V0.world.fixedHz === 60;
checks.stableScenarioHash = SCENARIO_HASH === hashObject(MOUNTAIN_WATERSHED_V0);

const caseA = deriveWatershedStep({ dischargeScale: 0.5, visualSampleCount: 52 });
const caseB = deriveWatershedStep({ dischargeScale: 1, visualSampleCount: 104 });
const caseBHalfSamples = deriveWatershedStep({ dischargeScale: 1, visualSampleCount: 52 });

diagnostics.caseA = caseA;
diagnostics.caseB = caseB;
diagnostics.ratios = {
  discharge: caseB.dischargeM3s / caseA.dischargeM3s,
  curtainThickness: caseB.outlet.curtainThicknessM / caseA.outlet.curtainThicknessM,
  transferredVolume: caseB.transfers[1].volumeM3 / caseA.transfers[1].volumeM3,
};

checks.singleDriverRatios = Object.values(diagnostics.ratios)
  .every((ratio) => Math.abs(ratio - 2) <= 1e-12);
checks.gravityFlightTime = Math.abs(
  caseB.waterfall.fallTimeS
    - Math.sqrt(2 * caseB.waterfall.fallHeightM / MOUNTAIN_WATERSHED_V0.world.gravityMps2),
) <= 1e-12;
checks.impactVelocity = Math.abs(
  caseB.waterfall.impactVelocityMps
    - Math.hypot(
      caseB.outlet.velocityMps,
      MOUNTAIN_WATERSHED_V0.world.gravityMps2 * caseB.waterfall.fallTimeS,
    ),
) <= 1e-12;
checks.visualSamplingDecoupled = Math.abs(
  caseB.transfers[1].volumeM3 - caseBHalfSamples.transfers[1].volumeM3,
) <= 1e-12
  && Math.abs(caseB.pool.nextVolumeM3 - caseBHalfSamples.pool.nextVolumeM3) <= 1e-12
  && Math.abs(
    caseB.waterfall.representedVolumePerSampleM3 * 2
      - caseBHalfSamples.waterfall.representedVolumePerSampleM3,
  ) <= 1e-12;
checks.budgetsClosed = [caseA, caseB, caseBHalfSamples]
  .every((result) => Math.abs(result.budget.residualM3) <= 1e-12);
checks.highFlowRaisesPoolFaster = caseB.pool.levelDeltaM > caseA.pool.levelDeltaM;
checks.transferIdentity = caseB.transfers[0].sourceNode === 'upper-river'
  && caseB.transfers[0].targetNode === 'main-waterfall'
  && caseB.transfers[1].sourceNode === 'main-waterfall'
  && caseB.transfers[1].targetNode === 'lower-pool';

const brokenScenario = structuredClone(MOUNTAIN_WATERSHED_V0);
brokenScenario.edges[1].to = ['cliff-drop', 'missing-port'];
const brokenValidation = validateScenarioDefinition(brokenScenario);
checks.invalidPortRejected = !brokenValidation.passed
  && brokenValidation.errors.some((error) => error.includes('unknown target port'));

checks.invalidScaleRejected = false;
try {
  deriveWatershedStep({ dischargeScale: 0 });
} catch (error) {
  checks.invalidScaleRejected = error instanceof RangeError;
}

const runA = simulateWatershedCase({ dischargeScale: 0.5, totalTicks: 1200, visualSampleCount: 52 });
const runB = simulateWatershedCase({ dischargeScale: 1, totalTicks: 1200, visualSampleCount: 104 });
diagnostics.accumulatedCases = { low: runA, high: runB };
checks.accumulatedBudgetsClosed = [runA, runB]
  .every((run) => Math.abs(run.cumulativeBudgetResidualM3) <= 1e-9 && run.maxStepResidualM3 <= 1e-12);
checks.fixedDuration = runA.durationS === 20 && runB.durationS === 20;
checks.expectedPoolRise = Math.abs(runA.poolLevelRiseM - ((3 - 2.5) * 20 / 420)) <= 1e-9
  && Math.abs(runB.poolLevelRiseM - ((6 - 2.5) * 20 / 420)) <= 1e-9;
checks.highFlowStorageDelta = runB.storageDeltaM3 > runA.storageDeltaM3;
checks.visualCountDoesNotSetMass = Math.abs(runB.totalInflowM3 - 120) <= 1e-9
  && Math.abs(runA.totalInflowM3 - 60) <= 1e-9;

const passed = Object.values(checks).every(Boolean);
const report = {
  createdAt: new Date().toISOString(),
  modelVersion: MODEL_VERSION,
  modelSha256: crypto.createHash('sha256').update(fs.readFileSync(modelPath)).digest('hex'),
  scenarioHash: SCENARIO_HASH,
  checks,
  diagnostics,
  passed,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!passed) process.exitCode = 1;
