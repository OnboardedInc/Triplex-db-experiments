// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Freeze four pure fixture-metadata controls; no source import/test/backend. */
import path from 'node:path';
import { ROOT,pin,exclusiveJson,readJson } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext,pinInputs } from '../../../../../qualification/devloop/state.mjs';
import { validateManifest } from '../../../../../qualification/devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../../../../qualification/devloop/preimages.mjs';
const output='qualification/capacity/configured-entities-v1/entry-components-v3',pins=new Map();
const add=(entry,role)=>pins.set(entry.path,{path:entry.path,role,sha256:entry.sha256});
for(const name of ['worker.mjs','growth.mjs','prepare.mjs','codec-schema.mjs','codec-schema.test.mjs','entry.mjs','entry.test.mjs','required-evidence.mjs','required-evidence.test.mjs','entry-components.mjs','prepare-entry-components.mjs'])add(await pin(ROOT,path.join(import.meta.dirname,name)),['codec-schema.mjs','entry.mjs','required-evidence.mjs'].includes(name)?'source':'runner');
for(const file of ['packages/xtdb/src/XtdbStorageAdapter.ts','packages/core/src/store/TriplesLive.ts',
  'qualification/capacity/configured-entities-v1/TINY-XTDB-CONTRACT-v4.md','qualification/capacity/configured-entities-v1/oracle.mjs',
  'qualification/capacity/configured-entities-v1/xtdb-tiny-v1/oracle.json','qualification/capacity/configured-entities-v1/xtdb-tiny-v1/manifest.json',
  'qualification/reviews/configured-entity-xtdb-tiny-v1-first-failure-independent.json',
  'qualification/evidence/configured-entity-xtdb-tiny-v1-first-failure-author.json',
  '.devloop/jobs/configured-entity-xtdb-tiny-v1/attempts/0001/terminal.json',
  '.devloop/jobs/configured-entity-xtdb-tiny-v1/attempts/0001/artifacts/007-ack-sparse-seed-raw-before-assert.json',
  '.devloop/jobs/configured-entity-xtdb-tiny-v1/attempts/0001/artifacts/009-snapshot-sparse-seed-raw-before-assert.json',
  '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs','tools/bootstrap/with-env.sh',
  'scripts/triplex-devloop.mjs','qualification/devloop/policy.json',
  ...['io','state','migration','preimages','scheduler','executor','worker','evidence','compare'].map(name=>`qualification/devloop/${name}.mjs`)])add(await pin(ROOT,file),file.endsWith('oracle.json')?'oracle':'runner');
add(await pin(ROOT,process.execPath),'build');
const expected=await exclusiveJson(ROOT,path.join(output,'expected.json'),{backendCalls:0,cases:10,status:'PASS_FIXTURE_METADATA_AND_ENTRY_ONLY'});add(expected,'oracle');
const manifest={format:'triplex-devloop-job/1',id:'configured-entity-entry-binding-components-v3',kind:'verification',backend:'xtdb',queryPath:'xtdb-datalog',author:'configured-fixture-codec-owner',
  problemId:'fixture-adapter-metadata-default-is-not-application-schema-version',logicalTaskId:'metadata-default-refusal-and-retained24',
  hypothesis:'One exact worker descriptor refuses command/source/generation mismatches; a fixture-only explicit Some1 assertion matches the pinned XTDB adapter metadata default without conflating applicationtype-version or changing raw rows/businessoracle',goals:[1,3,10],dependsOn:[],requiredOwners:[],
  inspiration:[{reference:'XtdbStorageAdapter.ts448; CoreTriplesLive.ts129; actualtinyv1/Qindependentfailure4a6200a4...',mechanism:'Observe the codec metadata default separately from data schema generations',adaptation:'Pure comparison/refusal only, no defaulting/coercion or factint64 decoding'}],
  command:{argv:[process.execPath,'--max-old-space-size=256','packages/qualification/experiments/configured-entities-v1/tiny-backend-v4/entry-components.mjs'],cwd:'.',env:{NODE_OPTIONS:'--max-old-space-size=256'}},
  resources:{heavy:true,memoryBytes:768*1024**2,cpuUnits:1,diskBytes:32*1024**2,timeoutMilliseconds:120000,maximumLogBytes:4*1024**2},inputs:[...pins.values()],
  evidence:{checks:[{key:'fixture-codec-entry10',expectedInput:expected.path,actual:'artifacts/checks.json'}],requiredCheckKeys:['fixture-codec-entry10']},
  profile:{name:'fixture-codec-default-only-v1',cases:10,nodeOldSpaceMiB:256,backendCalls:0,businessOracleChanged:false,scope:'Offline fixture correction, no backend/schema/config enforcement or futuremetadata qualification'},
};
const context=await openContext(ROOT);validateManifest(manifest,context.policy);await pinInputs(context,manifest.inputs);
const frozen=await exclusiveJson(ROOT,path.join(output,'manifest.json'),manifest);
const preimages=await preserveInputPreimages(context,manifest.inputs,path.join(output,'prepared-source-preimages.json'),{phase:'fixture-codec-default-pure-proposal'});
console.log(JSON.stringify({manifest:frozen,preimages,state:'PREPARED_NO_NEW_BACKEND_GRANT'}));
