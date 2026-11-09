// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Read-only source/artifact binding review. Never import an SDK worker/facade. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openContext, readState, loadJobManifest } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
import { verifyInputPreimages } from '../devloop/preimages.mjs';
import { canonical, SDK_CALLS } from '../extensions/string-order-v1/probe-support.mjs';
import { LOWERCASE_SDK_CALLS } from '../extensions/qlever-wrapper-repair-v1/lowercase-support.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const bytes = file => readFile(path.resolve(root, file));
const json = async file => JSON.parse(await bytes(file));
const pin = async file => { const value = await bytes(file); return { path:file, bytes:value.length, sha256:sha(value) }; };
const context = await openContext(root), state = await readState(context);
const gates = [];
const union = new Map();
const checkPins = async inputs => {
  for (const row of inputs) {
    assert.equal(sha(await bytes(row.path)), row.sha256, row.path);
    const prior = union.get(row.path); if (prior) assert.equal(prior, row.sha256); else union.set(row.path, row.sha256);
  }
};
for (const [id, expected] of [
  ['qlever-wrapper-runtime-components-v1','1f37e61db950f40b3ff5096df044224da7e26bd15e57548f482cb3e8b203ca7f'],
  ['qlever-wrapper-runtime-components-v2','4050972df5b5bbef9deee14d49ca46bcdca21bf19fe07193a27c59f881132c5e'],
  ['qlever-wrapper-runtime-noemit-v1','380795eec49b42cbbfe806f0cd6eb5904e664175bbf9967dcc786394620f8923'],
]) {
  const checked = await verifyAttempt(context, id, '0001');
  assert.equal(checked.terminalSha256, expected); assert(checked.terminal.cleanup.groupGone);
  assert.equal(checked.terminal.status, id.endsWith('components-v1') ? 'failed_process' : 'completed_verified_bytes');
  const manifest = await loadJobManifest(context, state.jobs[id]); await checkPins(manifest.inputs);
  const artifacts = `.devloop/jobs/${id}/attempts/0001/artifacts`;
  if (id.endsWith('components-v2')) {
    const tap = (await bytes(`${artifacts}/components.tap`)).toString();
    for (const expression of [/# tests 16\b/, /# pass 16\b/, /# fail 0\b/, /# skipped 0\b/]) assert.match(tap, expression);
    assert.equal((await bytes(`${artifacts}/components.stderr`)).length, 0);
  }
  if (id.includes('noemit')) {
    const files = checked.terminal.outputs.filter(row => /stderr|stdout/.test(row.path));
    for (const file of files) assert.equal((await bytes(`.devloop/jobs/${id}/attempts/0001/${file.path}`)).length, 0);
  }
  gates.push({ run:`${id}/0001`, terminalSha256:expected, status:checked.terminal.status, preimages:checked.sourcePreimages,
    elapsedMilliseconds:checked.terminal.elapsedMilliseconds, cleanup:checked.terminal.cleanup });
}
const meta = '.artifacts/qlever-wrapper-runtime-preparation-v1';
const appIndex = await json(`${meta}/applications.json`);
const build = await json('.devloop/jobs/qlever-wrapper-sdk-build-v3/attempts/0001/artifacts/build.json');
assert.equal((await pin('.devloop/jobs/qlever-wrapper-sdk-build-v3/attempts/0001/artifacts/build.json')).sha256,
  'fb7da4121b7c23c9788e3134c73fe8b25b495bfe72feb9b5ba76af94c9512a84');
assert.equal(build.generated.length, 70);
for (const row of [...build.generated, ...build.sourceCopies.map(value => value.copy)]) assert.deepEqual(await pin(row.path), row);
const lowercaseTemplate = (await bytes('qualification/extensions/qlever-wrapper-repair-v1/lowercase-probe.template.ts')).toString();
const mixedOriginal = (await bytes('packages/qlever/experiments/string-order-probe.ts')).toString();
assert.equal(sha(mixedOriginal), '33695bf500c6bc4f03a652bf4f0985401496f7912515588d712f035944d9a709');
const relativeImport = (entry, target) => {
  const value = path.relative(path.dirname(path.join(root, entry)), path.join(root, target));
  return value.startsWith('.') ? value : './' + value;
};
const expectedLowercase = lowercaseTemplate.replace('from "SUPPORT_MODULE"',
  `from ${JSON.stringify(relativeImport(appIndex.lowercase.entry.path, 'qualification/extensions/qlever-wrapper-repair-v1/lowercase-support.mjs'))}`);
assert.equal((await bytes(appIndex.lowercase.entry.path)).toString(), expectedLowercase);
const expectedMixed = mixedOriginal.replace('from "../../../qualification/extensions/string-order-v1/probe-support.mjs"',
  `from ${JSON.stringify(relativeImport(appIndex.mixed.entry.path, 'qualification/extensions/string-order-v1/probe-support.mjs'))}`)
  .replace('const root = path.resolve(import.meta.dirname, "../../.."), here = path.join(root, "qualification/extensions/string-order-v1");',
    'const root = realpathSync(process.env["TRIPLEX_QUALIFICATION_ROOT"]!), here = path.join(root, "qualification/extensions/string-order-v1");')
  .replace('assert.equal(contract.mode, "PUBLIC_QLEVER_STRING_EXTENSION_BOTH");',
    'assert.equal(contract.mode, "PUBLIC_QLEVER_STRING_EXTENSION_BOTH");\nassert.equal(import.meta.resolve("@triplex-build/triplex-qlever"), contract.publicFacadeUrl);');
assert.equal((await bytes(appIndex.mixed.entry.path)).toString(), expectedMixed);

const oracle = await json('qualification/extensions/qlever-wrapper-repair-v1/oracle.json');
assert.deepEqual(oracle.fixture.rows.map(row => row.label), ['a','c','e','z']);
const compare = { '>':(a,b)=>a>b, '>=':(a,b)=>a>=b, '<':(a,b)=>a<b, '<=':(a,b)=>a<=b };
for (const row of oracle.cases) assert.deepEqual(row.expectedRows, oracle.fixture.rows.filter(value => compare[row.operator](value.label,row.boundary)));
assert.equal(LOWERCASE_SDK_CALLS.length, 17); assert.equal(new Set(LOWERCASE_SDK_CALLS).size,17);
assert.equal(SDK_CALLS.length,31); assert.equal(new Set(SDK_CALLS).size,31);
const nativeContracts = [];
for (const [which, expectedSha, expectedInputs] of [
  ['lowercase','98e27b2c9a57491084fda0c556a4899de0fe454bef7bccf812bd98b08debaa6f',3550],
  ['mixed','888ddbf4b65627375692045c17752731d1898bc0f7abcf37d1e20f3a63ca73f2',3551],
]) {
  const directory = `qualification/native-jobs/qlever-wrapper-${which}-v1`, manifestPin = await pin(`${directory}/manifest.json`);
  assert.equal(manifestPin.sha256, expectedSha);
  const manifest = await json(manifestPin.path), contractPin = await pin(`${directory}/contract.json`), contract = await json(contractPin.path);
  assert.equal(manifest.inputs.length,expectedInputs); await checkPins(manifest.inputs);
  assert.equal(manifest.command.argv[2],'qualification/extensions/qlever-wrapper-repair-v1/runtime-runner.mjs');
  assert.equal(manifest.command.argv.at(-1),contractPin.path); assert.equal(manifest.id,contract.jobId);
  assert.deepEqual(manifest.requiredOwners,['foundation-qlever']);
  assert.equal(manifest.resources.memoryBytes,896*1024**2); assert.equal(manifest.resources.cpuUnits,1);
  assert.equal(manifest.resources.diskBytes,64*1024**2); assert.equal(manifest.resources.timeoutMilliseconds,180000);
  assert.deepEqual(contract.appEntry, appIndex[which].entry);
  assert.deepEqual(await pin(contract.appEntry.path),contract.appEntry);
  assert.equal(manifest.inputs.find(row=>row.path===contract.appEntry.path).sha256,contract.appEntry.sha256);
  assert.equal(contract.publicFacadeUrl,build.publicFacadeResolution.url);
  assert.deepEqual(contract.sdkBuild,appIndex.sdkBuild); assert.equal(contract.sdkBuild.generatedMembers,70);
  assert.deepEqual(contract.sdkCalls,which==='lowercase'?LOWERCASE_SDK_CALLS:SDK_CALLS);
  assert.equal(contract.imageSha256,'sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec');
  const dependencies = await json(contract.dependencyLock.path), guards = await json(contract.guardPins.path);
  assert.equal((await pin(contract.dependencyLock.path)).sha256,contract.dependencyLock.sha256);
  assert.equal((await pin(contract.guardPins.path)).sha256,contract.guardPins.sha256);
  for (const row of guards) assert.deepEqual(await pin(row.path),row);
  assert.equal(dependencies.packages.length,7);
  const {dependencySha256,...payload}=dependencies;
  assert.equal(sha(canonical(payload)),dependencySha256);
  const index=await pin(`${directory}/prepared-source-preimages.json`);
  const preimages=await verifyInputPreimages(context,index,{inputs:manifest.inputs});
  const identity=await json(`${directory}/identity.expected.json`);
  assert.deepEqual(identity,{status:'BEFORE_AND_AFTER_IDENTICAL',dependencySha256,guardPinCount:guards.length,installedLayoutOnly:true,copiedImmutableRuntimeClaimed:false});
  if(which==='lowercase') {
    const expected=Object.fromEntries(oracle.cases.map(row=>[row.id,row.expectedRows]));
    assert.equal((await bytes(`${directory}/answers.expected.json`)).toString(),canonical({native:expected,datalogCurrent:expected,datalogReopen:expected})+'\n');
  }
  nativeContracts.push({manifest:manifestPin,contract:contractPin,appEntry:contract.appEntry,inputs:manifest.inputs.length,preimages,
    resources:manifest.resources,sdkCalls:contract.sdkCalls.length,dependencyPackages:dependencies.packages.length,guardCount:guards.length});
}
assert.equal(union.size,3563);
const report={format:'triplex-qlever-wrapper-runtime-source-independent/1',reviewer:'xtdb-agent',status:'CLEAR_EXACT_SOURCE_BINDING_AND_RETAINED_PREREQUISITES_ONLY',
  gates,nativeContracts,currentUnionPins:union.size,currentDrift:[],actualBuild:'fb7da4121b7c23c9788e3134c73fe8b25b495bfe72feb9b5ba76af94c9512a84',
  unchangedPrivateGeneratedMembers:70,privateEntryTransformations:{lowercase:'Only exact support import relocation',mixed:'Only support import/root environment/self-resolution assertion; logical bodies/original oracle unchanged'},
  sourceAssessment:['One descriptor binds each owned application entry; verified thin-state manifest hydration and before/after actual dependency/source/build guards precede and follow worker evaluation.',
    'Four independent lowercase ASCII boundaries,17 finite public SDK calls, P1 receipt and explicit public page R1000.25; native supports explicit P separately. No harness sorting of ordered answers.',
    'Original mixed-case/Unicode31-call answers, old cursor/P1/R/correction/history and failure policy retained on the same private SDK build.',
    'Named F1 planner1 and native100 phases remain mutually exclusive on Q; bounded control/read/deadline/resource failure stops, restoration100 is explicit. Wrong semantic rows continue only finite declared cases.',
    'Exact public facade URL is asserted by the worker; static imports use ordinary package self-reference, not a loader or installed replacement. Actual runtime execution/consumption is still unexecuted.'],
  reviewerSdkWorkerImports:0,reviewerSdkFacadeImports:0,reviewerCompilerCommands:0,reviewerBackendCalls:0,
  limits:['These fresh native manifests are not yet enqueued/granted/executed; root must grant actual backend operations.',
    'Retained noEmit and pure16 evidence does not prove backend answers, driver cancellation, collation, whole142/44 qualification, capacity or performance.',
    'Seven existing installed packages are checksum-bound in place. No copied immutable full runtime, all-platform conditional closure, OS/native-addon closure or idle-engine proof.']};
const output='qualification/reviews/qlever-wrapper-runtime-v1-source-independent.json';
await writeFile(path.join(root,output),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({output,sha256:(await pin(output)).sha256,currentUnionPins:union.size,nativeJobs:nativeContracts.length}));
