/** Frozen proposal only. No worker/schema-preview import or backend action. */
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { assertEntryBinding } from './entry.mjs';
import path from 'node:path';
import { ROOT, pin, files, exclusiveJson, readJson } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { captureInstalledPackages } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { openContext, pinInputs } from '../../../../../qualification/devloop/state.mjs';
import { validateManifest } from '../../../../../qualification/devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../../../../qualification/devloop/preimages.mjs';
import { tinyReplay } from '../../../../../qualification/capacity/configured-entities-v1/oracle.mjs';
const output = 'qualification/capacity/configured-entities-v1/xtdb-tiny-v4', guards = [], id = 'configured-entity-xtdb-tiny-v4';
for (const name of ['recipe.mjs','recipe.test.mjs','components.mjs','prepare-components.mjs']) guards.push(await pin(ROOT, path.join(import.meta.dirname, '..', name)));
for (const name of ['worker.mjs','growth.mjs','prepare.mjs','codec-schema.mjs','codec-schema.test.mjs','entry.mjs','entry.test.mjs','required-evidence.mjs','required-evidence.test.mjs','entry-components.mjs','prepare-entry-components.mjs']) guards.push(await pin(ROOT, path.join(import.meta.dirname, name)));
for (const file of ['qualification/capacity/configured-entities-v1/CONTRACT.md','qualification/capacity/configured-entities-v1/oracle.mjs',
  'qualification/capacity/configured-entities-v1/plan.json','qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md',
  'qualification/capacity/configured-entities-v1/components-v2/manifest.json',
  'qualification/reviews/configured-entity-recipe-v1-independent.json','qualification/evidence/configured-entity-public-basis-boundary-v1.json',
  'qualification/reviews/configured-entity-xtdb-tiny-v1-first-failure-independent.json',
  'qualification/evidence/configured-entity-xtdb-tiny-v1-first-failure-author.json',
  'qualification/capacity/configured-entities-v1/xtdb-tiny-v1/manifest.json',
  '.devloop/jobs/configured-entity-xtdb-tiny-v1/attempts/0001/terminal.json',
  'qualification/reviews/xtdb-handoff-metadata-decoder-v1-independent.json',
  '.runtime/experiments/xtdb-identity-handoff-v1/backend-v2/metadata-position.mjs',
  '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs','.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs',
  'packages/qualification/package.json','packages/qualification/src/index.ts','packages/qualification/dist/index.js','packages/qualification/dist/index.d.ts',
  'packages/xtdb/package.json','packages/xtdb/README.md','packages/core/src/Temporal.ts','packages/core/src/Triple.ts',
  'packages/core/src/store/Triples.ts','packages/core/src/store/TriplesLive.ts','packages/core/src/config/ConfigStore.ts',
  'packages/core/src/config/GraphConstraint.ts','packages/core/src/Constraint.ts','packages/core/src/runtime/Runtime.ts',
  'tools/bootstrap/with-env.sh','tools/bootstrap/check-storage.py','provenance/bounded-storage.json','provenance/portable-export-baseline.json',
  '.runtime/engines/owners.json','.runtime/engines/xtdb-main/xtdb-config.yaml',
  'scripts/triplex-devloop.mjs','qualification/devloop/policy.json',
  ...['io','state','migration','preimages','scheduler','executor','worker','evidence','compare'].map(name => `qualification/devloop/${name}.mjs`)]) guards.push(await pin(ROOT, file));
// The helper deliberately treats public Core specially. The workspace XTDB
// facade is pinned manually (src/dist/package) to avoid traversing node_modules
// links or silently claiming its whole historical experiment tree as runtime.
for (const directory of ['packages/xtdb/src','packages/xtdb/dist']) for (const file of await files(ROOT, path.join(ROOT,directory))) guards.push(await pin(ROOT,file));
const lock = await captureInstalledPackages({ root:ROOT, roots:[
  {name:'@triplex-build/triplex',from:'packages/qualification/package.json',role:'runtime'},
  {name:'effect',from:'packages/qualification/package.json',role:'runtime'},
  {name:'postgres',from:'packages/xtdb/package.json',role:'runtime'},
], maximumBytes:128*1024**2 });
const dependencies = await exclusiveJson(ROOT,path.join(output,'dependencies.json'),lock);
const oracle = await exclusiveJson(ROOT,path.join(output,'oracle.json'),{ format:'triplex-configured-tiny-independent-replay/1',
  sparse:tinyReplay(8,1),dense:tinyReplay(8,10), historyMapping:'Sparse seed then append9domainattributes to SAME8subjects; dense logical seed comprises both acknowledged commands, without duplicate structural/label assertions',
  schemaReference:'Public pure ConfigStore reference before backend; storage identity comparison, not independent hash-algorithm qualification',
  historicalApi:'PUBLIC_RECORDED_AT_AND_VALID_AT_ONLY; RETURNED_P_OBSERVABILITY_NOT_INPUT',
  historicalMetadataTarget:'NEW_SHARED_SNAPSHOT_TARGET_NOT_UPSTREAM_REGRESSION', physicalCapacityQualified:false });
assert.equal(oracle.sha256, (await pin(ROOT,'qualification/capacity/configured-entities-v1/xtdb-tiny-v1/oracle.json')).sha256, 'BUSINESS_ORACLE_UNCHANGED');
const owners = await readJson(path.join(ROOT,'.runtime/engines/owners.json')), engine = owners.engines.xtdb;
const workerEntry = { ...await pin(ROOT,path.join(import.meta.dirname,'worker.mjs')), generation:'configured-tiny-codec-entry-v4' };
const contract = { workerEntry, mode:'CURRENT_PUBLIC_XTDB_ONE_EIGHT_ENTITY_HISTORY',jobId:id,runId:randomUUID(),scopeName:`configured-tiny-${randomUUID()}`,
  url:engine.url,dataDirectory:path.join(engine.directory,'data'),dependencies,guards,oracle,
  storageAdapterCodecSchemaVersion:1,codecVersionMeaning:'Pinned XTDB adapter metadata default, not application type-version or ConfigStore revision',
  expectedOwner:{containerId:engine.id,imageSha256:engine.image,running:true,memoryBytes:3221225472,cpuUnits:2},
  plannedPublicCommits:7,plannedDomainCommands:5,plannedSchemaCommits:2,configuredEntities:8,domainSubjects:8,
  plannedExplicitDomainOperations:{sparseSeed:24,denseExpansion:72,correction:4,presenceOff:2,presenceOn:2,requiredRejection:1},
  expectedClockInstants:[1000.25,1001.25,1002.25,1002.75,1003.25,1004.25,1005.25,1006.25],
  maximumExplicitOperationsPerCommand:500,publicPerCallTimeoutMs:30000,
  noOtherXtdbClientAtGrant:true,postTerminalCompleteOverlapAuditRequired:true,
  maskingContract:'New shared project target, separately reported; raw default lifetime metadata is compatibility evidence, not normalized/masked by harness',
  semanticFailurePolicy:'Retain separate raw checks and continue only finite independent read cases; transport/scope/unknownACK or incomplete state stops',
  transientPeakGrowthQualified:false,largerStageAdmission:'BLOCKED',observerClaimed:false,
};
const contractPin = await exclusiveJson(ROOT,path.join(output,'contract.json'),contract);
const expected = await exclusiveJson(ROOT,path.join(output,'expected.json'),{configuredEntities:8,domainSubjects:8,logicalHistory:'PASS',operationReceipts:'PASS',publicRequiredAtomicRejection:'PASS',schemaReleaseReadback:'PASS',status:'PASS_TINY_PUBLIC_FOUNDATION_ONLY'});
const pins = new Map(),add=(entry,role)=>pins.set(entry.path,{path:entry.path,role,sha256:entry.sha256});
for (const entry of guards) add(entry,entry.path.endsWith('/oracle.mjs')?'oracle':entry.path.includes('/src/')||entry.path.endsWith('/recipe.mjs')||entry.path.endsWith('/worker.mjs')||entry.path.endsWith('/growth.mjs')?'source':'runner');
for (const pkg of lock.packages) for (const entry of pkg.files) add(entry,'dependency');
for (const [entry,role] of [[lock.environment.nodeBinary,'build'],[dependencies,'recipe'],[oracle,'oracle'],[contractPin,'recipe'],[expected,'oracle']]) add(entry,role);
add(workerEntry,'runner');
const manifest={format:'triplex-devloop-job/1',id,kind:'verification',backend:'xtdb',queryPath:'xtdb-datalog',author:'configured-entity-tiny-owner',
  problemId:'configured-entities-schema-history-physical-accounting',logicalTaskId:'eight-configured-entities-one-sparse-dense-history',
  hypothesis:'Current qualified public XTDB can persist/reload actual schema releases and explicit configured-entity history with atomic Required enforcement, typed receipts, honest publicR cuts and phase growth observations; stricter metadata target is independently checked',
  goals:[1,3,7,10],dependsOn:['configured-entity-recipe-components-v1','configured-entity-codec-schema-components-v1','configured-entity-entry-binding-components-v3'],requiredOwners:['foundation-xtdb'],
  inspiration:[{reference:'Existing public ConfigStore/GraphConstraint/Triples APIs; independently reviewed configured recipe; TemporalBasis and nativeSources contracts',mechanism:'Use existing schema/writes and publicR history, with explicit fixturepresence/version',adaptation:'Tiny actualrelease/typedhistory/receipt/reopen test; stronger metadata target reported separately, no privateP/defaultpatch or extrapolation'}],
  command:{argv:[process.execPath,'--max-old-space-size=768',workerEntry.path,'--contract',contractPin.path],cwd:'.',env:{NODE_OPTIONS:'--max-old-space-size=768',TRIPLEX_BACKEND:'xtdb',TRIPLEX_QUERY_PATH:'xtdb-datalog',XTDB_URL:engine.url}},
  resources:{heavy:true,memoryBytes:1280*1024**2,cpuUnits:1,diskBytes:256*1024**2,timeoutMilliseconds:300000,maximumLogBytes:8*1024**2},
  inputs:[...pins.values()],evidence:{checks:[{key:'strict-configured-tiny-combined',expectedInput:expected.path,actual:'artifacts/checks.json'}],requiredCheckKeys:['strict-configured-tiny-combined']},
  profile:{name:'current-public-xtdb-tiny-configured-v4',nodeOldSpaceMiB:768,fixtureEntities:8,physicalDomainSubjects:8,logicalProfileCuts:['sparse1','representative10'],sharedFoundationBytes:3221225472,
    groupAccounting:'Controller/supervisor/guards/ordinaryCoreEffectpublicXTDB/client/filemetadata scans included',persistentAndArtifactsGrowthReservationBytes:256*1024**2,
    growthMeaning:'Phase snapshots, not continuouspeak/rebuild/backup qualification; nestedVM counted once in backing',datatypeAutomaticEnforcement:'UNQUALIFIED',historicalMetadataContract:'NEW_SHARED_TARGET',performanceQualified:false,largerStageAdmission:'BLOCKED'},
};
assertEntryBinding({descriptor:workerEntry,sourceGeneration:workerEntry.generation,command:manifest.command,inputs:manifest.inputs,actualModule:workerEntry,actualArgv:workerEntry});
const context=await openContext(ROOT);validateManifest(manifest,context.policy);await pinInputs(context,manifest.inputs);
const manifestPin=await exclusiveJson(ROOT,path.join(output,'manifest.json'),manifest);
const preimages=await preserveInputPreimages(context,manifest.inputs,path.join(output,'prepared-source-preimages.json'),{phase:'tiny-configured-foundation-source-proposal-only'});
console.log(JSON.stringify({manifest:manifestPin,contract:contractPin,oracle,preimages,declaredInputs:pins.size,packages:lock.packages.length,state:'PREPARED_NO_BACKEND_GRANT'}));
