/** Actual retained-result review only; no worker/facade/compiler/backend import. */
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openContext,readState,loadJobManifest} from '../devloop/state.mjs';
import {verifyAttempt} from '../devloop/evidence.mjs';
import {LOWERCASE_SDK_CALLS} from '../extensions/qlever-wrapper-repair-v1/lowercase-support.mjs';
const root=path.resolve(import.meta.dirname,'../..'),id='qlever-wrapper-lowercase-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>readFile(path.resolve(root,p));
const json=async p=>JSON.parse(await bytes(p));
const pin=async p=>{const b=await bytes(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const context=await openContext(root),state=await readState(context),verified=await verifyAttempt(context,id,'0001');
assert.equal(verified.terminalSha256,'ac417ad2cda8b18b4b4c441751cde5bbaf4728eb146bb33ab827668ba06ff75f');
assert.equal(verified.terminal.status,'completed_verified_bytes');assert(verified.terminal.cleanup.groupGone);
const manifest=await loadJobManifest(context,state.jobs[id]);
assert.equal(verified.terminal.manifestSha256,'98e27b2c9a57491084fda0c556a4899de0fe454bef7bccf812bd98b08debaa6f');
for(const row of manifest.inputs)assert.equal(sha(await bytes(row.path)),row.sha256,row.path);
const base=`.devloop/jobs/${id}/attempts/0001`,a=base+'/artifacts';
const contract=await json(manifest.command.argv.at(-1)),grant=await json(base+'/grant.json');
const report=await json(a+'/lowercase-report.json'),answers=await json(a+'/lowercase-answers.json');
const oracle=await json(contract.oracle.path),names=await readdir(path.join(root,a));
assert.deepEqual(report.sdkCalls,LOWERCASE_SDK_CALLS);assert.equal(report.calls.length,17);
assert.equal(report.status,'ALL_LOWERCASE_CASES_PASSED');
assert.equal(report.publicFacadeUrl,contract.publicFacadeUrl);assert.deepEqual(report.sdkBuild,contract.sdkBuild);
assert.equal(report.sdkBuild.artifact.sha256,'fb7da4121b7c23c9788e3134c73fe8b25b495bfe72feb9b5ba76af94c9512a84');
const build=await json(report.sdkBuild.artifact.path);
assert.equal(build.generated.length,70);for(const row of build.generated)assert.deepEqual(await pin(row.path),row);
assert.equal(report.publicFacadeUrl,new URL('file://'+path.join(root,report.sdkBuild.packageRoot,'dist/index.js')).href);
assert.deepEqual(grant.controllerInvocation.execArgv,['--max-old-space-size=256']);
assert.equal(manifest.command.argv[1],'--max-old-space-size=384');assert.equal(manifest.command.env.NODE_OPTIONS,'--max-old-space-size=384');
assert.equal(grant.resources.memoryBytes,896*1024**2);assert.equal(grant.resources.cpuUnits,1);
assert.deepEqual(report.owner,grant.requiredOwnerChecks.find(row=>row.ownerId==='foundation-qlever').observation);
assert.equal(report.owner.memoryBytes,2*1024**3);assert.equal(report.owner.cpuUnits,1.5);assert.equal(report.owner.running,true);
const events=[];for(const name of names.filter(name=>/^\d{4}-.+\.json$/.test(name)).sort())events.push({file:name,...await json(a+'/'+name)});
const responses=events.filter(row=>row.file.endsWith('-response.json')),starts=events.filter(row=>row.file.endsWith('-start.json'));
assert.equal(responses.length,17);assert.equal(starts.length,17);assert.equal(events.filter(row=>row.file.endsWith('-error.json')).length,0);
assert.deepEqual(starts.map(row=>row.id),LOWERCASE_SDK_CALLS);assert.deepEqual(responses.map(row=>row.id),LOWERCASE_SDK_CALLS);
const response=id=>{const row=responses.find(row=>row.id===id);assert(row);assert.equal(row.afterDeadline,false);return row.value;};
const rows=(value,native=false)=>(native?value.rows:value.results).map(row=>native?{entity:row.entity,label:row.label}:{entity:row['?entity'],label:row['?label']});
assert.equal(response('fresh-lowercase').results.length,0);assert.equal(response('fresh-lowercase').basis.recordedPosition,0);
const seed=response('seed-lowercase'),ack=response('ack-seed-lowercase');
assert.equal(seed.position,1);assert.equal(seed.instant,1000.25);assert.equal(seed.retracted,0);assert.equal(seed.triples.length,4);
assert.equal(ack.position,1);assert.equal(ack.instant,seed.instant);assert.equal(ack.txId,seed.txId);assert.equal(ack.changes.length,4);
assert.equal(new Set(seed.triples.map(row=>row.id)).size,4);
for(const want of oracle.fixture.rows){
  const row=seed.triples.find(row=>row.entityId===want.entity);assert(row);
  assert.deepEqual(row.value,{type:'string',value:want.label});assert.equal(row.attribute,oracle.fixture.attribute);
  assert.equal(row.validFrom,10.25);assert.deepEqual(row.validTo,{_id:'Option',_tag:'Some',value:10.75});
  assert.deepEqual(row.txId,{_id:'Option',_tag:'Some',value:seed.txId});
  const journal=ack.changes.find(value=>value.tripleId===row.id);assert.equal(journal.assertionTxId,seed.txId);assert.deepEqual(journal.value,row.value);
}
const bases=[];let selectedMainQueries=0,nativeTypedRawPairs=0;
for(const event of responses.filter(row=>!['seed-lowercase','ack-seed-lowercase'].includes(row.id))){
  const basis=event.value.basis;assert.equal(basis.scope,report.scope);assert.equal(basis.validAt,10.5);
  assert.equal(basis.recordedPosition,event.id==='fresh-lowercase'?0:1);
  if(event.id.startsWith('datalog-')&&!event.id.includes('membership'))assert.equal(basis.recordedAt,1000.25);
  else assert.equal(Object.hasOwn(basis,'recordedAt'),false);
  bases.push({id:event.id,basis});
}
assert.equal(bases.length,15);
for(const prefix of ['native','datalog','datalog-reopen'])for(const item of oracle.cases){
  const suffix=item.id.split('.').at(-1),value=response(prefix+'-'+suffix),actual=rows(value,prefix==='native');
  assert.deepEqual(actual,item.expectedRows);
  const surface=prefix==='native'?'native':prefix==='datalog'?'datalogCurrent':'datalogReopen';
  assert.deepEqual(answers[surface][item.id],item.expectedRows);
  if(prefix==='native'){
    assert.equal(value.rawRows.length,actual.length);
    for(let i=0;i<actual.length;i++)for(const column of ['entity','label']){
      assert.deepEqual(value.rawRows[i][column],{type:'literal',value:actual[i][column]});nativeTypedRawPairs++;
    }
    assert.deepEqual(value.trace.basis,value.basis);assert(value.trace.query.includes(`FILTER(STR(?label) ${item.operator} "${item.boundary}")`));
    assert(value.trace.query.includes('recorded_position_order'));assert.deepEqual(value.trace.steps.map(row=>row.phase),['source-cut','answer']);
  }else{
    assert.equal(value.nextCursor,undefined);const main=value.debug.queryPlan.steps.find(row=>row.label==='main').query;
    assert(main.includes(`?v1_type = "string" && ?v1_order ${item.operator} "${item.boundary}"`),'ACTUAL_REVIEWED_TEXT_BRANCH_SIGNATURE');
    assert(main.includes('recorded_position_order <= "bff0000000000000"'));
    assert(main.includes('recorded_at_order <= "c08f420000000000"'));selectedMainQueries++;
  }
}
assert.equal(selectedMainQueries,8);
for(const native of [true,false]){
  const actual=rows(response(native?'native-lowercase-membership':'datalog-lowercase-membership'),native);
  assert.equal(actual.length,4);assert.equal(new Set(actual.map(row=>row.entity)).size,4);
  for(const want of oracle.fixture.rows)assert(actual.some(row=>row.entity===want.entity&&row.label===want.label));
}
assert.equal(report.bases.length,15);assert(report.bases.every(row=>row.passed));assert(report.checks.every(row=>row.passed));
const settings=events.filter(row=>row.file.includes('-setting-'));
assert.deepEqual(settings.map(row=>row.id),['before','select-f1','selected-f1','restore-before-native','native-after-f1','finally-restore','finally-readback']);
assert.deepEqual(settings.filter(row=>row.settings).map(row=>row.settings['query-planning-budget']),['100','1','100','100']);
for(const row of settings.filter(row=>row.settings)){assert.equal(row.settings['cache-max-size'],'64 MB');assert.equal(row.settings['cache-max-size-single-entry'],'32 MB');}
assert.deepEqual(report.cleanup,{clientCloseReturned:true,otherCanonicalQAtEnd:[],pending:0,phase:{restored100:true}});
for(const check of manifest.evidence.checks)assert.deepEqual(await bytes(check.expectedInput),await bytes(base+'/'+check.actual));
const out={format:'triplex-qlever-wrapper-lowercase-actual-independent/1',reviewer:'xtdb-agent',status:'PASS_SCOPED_LOWERCASE_PRIVATE_SDK_REPAIR_ONLY',
  terminalSha256:verified.terminalSha256,manifestSha256:verified.terminal.manifestSha256,sourcePreimages:verified.sourcePreimages,
  currentPins:manifest.inputs.length,currentDrift:[],retainedOutputs:verified.terminal.outputs.length,privateBuild:contract.sdkBuild,
  actualConsumption:{workerResolvedPublicFacadeUrl:report.publicFacadeUrl,ordinaryStaticPublicSelfReference:true,customLoader:false,
    privateGeneratedMembersUnchanged:70,actualDistinctWrapperTextBranchDebugQueries:selectedMainQueries,
    meaning:'The executing ordinary-package worker recorded the private facade URL and public calls emitted the reviewed text-only branch signature. This is not a complete transitive module-load/OS trace.'},
  rawResults:{sdkCalls:17,publicResponseFiles:17,rawAndTypedNativeLiteralFields:nativeTypedRawPairs,rangeAnswers:12,basisChecks:bases,terminalPages:8,
    seedReceiptPosition:seed.position,seedInstant:seed.instant,assertionIds:seed.triples.map(row=>row.id),ackLineagePassed:true},
  settings:settings.map(({id,value,settings})=>({id,value,settings})),cleanup:verified.terminal.cleanup,
  groupRssBytesSampled:verified.terminal.resources.sampledPeakProcessGroupRssBytes,elapsedMilliseconds:verified.terminal.elapsedMilliseconds,
  runtimeFlags:{controller:grant.controllerInvocation,command:manifest.command.argv,nodeOptions:manifest.command.env.NODE_OPTIONS},
  interpretation:['Four lower-case boundaries passed for native controls and public wrapper current/fresh-client reads on one anchored private SDK artifact.',
    'Shared writes/default public package/native binary/caps stayed unchanged. No general collation, Unicode, equal-label tie, unchanged44/142, capacity, physical cancellation, full backend idleness or performance acceptance.',
    'Every public call fulfilled before its declared deadline, all seven settings controls returned and100 was restored; no failed/unknown operation was replayed.'],
  reviewerWorkerImports:0,reviewerCompilerCommands:0,reviewerBackendCalls:0};
const output='qualification/reviews/qlever-wrapper-lowercase-v1-actual-independent.json';
await writeFile(path.join(root,output),JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({output,sha256:(await pin(output)).sha256,calls:17,answers:12,pins:manifest.inputs.length}));
