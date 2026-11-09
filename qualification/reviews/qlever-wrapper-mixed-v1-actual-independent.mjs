// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Retained mixed-case actual review. No SDK/facade/compiler/backend execution. */
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openContext,readState,loadJobManifest} from '../devloop/state.mjs';
import {verifyAttempt} from '../devloop/evidence.mjs';
import {SDK_CALLS} from '../extensions/string-order-v1/probe-support.mjs';
const root=path.resolve(import.meta.dirname,'../..'),id='qlever-wrapper-mixed-v1',sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>readFile(path.resolve(root,p)),json=async p=>JSON.parse(await bytes(p));
const pin=async p=>{const b=await bytes(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const context=await openContext(root),state=await readState(context),verified=await verifyAttempt(context,id,'0001');
assert.equal(verified.terminalSha256,'2894f779155074bb03abb6bab8e7153cbc3bfa6a2c4c1eae082483eed1c93b4f');
assert.equal(verified.terminal.status,'failed_oracle');assert.equal(verified.terminal.commandOutcome.code,0);assert(verified.terminal.cleanup.groupGone);
const manifest=await loadJobManifest(context,state.jobs[id]);assert.equal(manifest.inputs.length,3551);
assert.equal(verified.terminal.manifestSha256,'888ddbf4b65627375692045c17752731d1898bc0f7abcf37d1e20f3a63ca73f2');
for(const row of manifest.inputs)assert.equal(sha(await bytes(row.path)),row.sha256,row.path);
const base=`.devloop/jobs/${id}/attempts/0001`,a=base+'/artifacts';
const contract=await json(manifest.command.argv.at(-1)),grant=await json(base+'/grant.json'),report=await json(a+'/report.json');
const dAnswers=await json(a+'/datalog-answers.json'),nAnswers=await json(a+'/native-answers.json');
const oracle=await json('qualification/extensions/string-order-v1/oracle.json');
assert.equal((await pin('qualification/extensions/string-order-v1/oracle.json')).sha256,'8f4da85e806e2503c62b373bfeaa44c8d91be55a029dc01c08eb2a3d53a6b19d');
// SDK_CALLS is an allowed unique inventory. The unchanged seed helper reads
// each ACK immediately, rather than using the inventory's grouping order.
const executedOrder=[...SDK_CALLS.slice(0,3),SDK_CALLS[4],SDK_CALLS[3],...SDK_CALLS.slice(5)];
assert.equal(report.status,'COLLECTED_WITH_SEMANTIC_FAILURES');assert.deepEqual(report.sdkCallsAttempted,executedOrder);assert.equal(report.calls.length,31);
assert.deepEqual([...new Set(report.sdkCallsAttempted)].sort(),[...SDK_CALLS].sort());
const events=[];for(const name of (await readdir(path.join(root,a))).filter(name=>/^\d{4}-.+\.json$/.test(name)).sort())events.push({file:name,...await json(a+'/'+name)});
const responses=events.filter(row=>row.file.endsWith('-response.json')),starts=events.filter(row=>row.file.endsWith('-start.json'));
assert.equal(responses.length,31);assert.equal(starts.length,31);assert.equal(events.filter(row=>row.file.endsWith('-error.json')).length,0);
assert.deepEqual(starts.map(row=>row.id),executedOrder);assert.deepEqual(responses.map(row=>row.id),executedOrder);
const response=id=>{const row=responses.find(row=>row.id===id);assert(row,id);assert.equal(row.afterDeadline,false);return row.value;};
const rows=(value,native=false)=>(native?value.rows:value.results).map(row=>native?{entity:row.entity,label:row.label}:{entity:row['?entity'],label:row['?label']});
const mapping={
 'string.ascii.order.asc.p1':'ascii-asc','string.ascii.order.desc.p1':'ascii-desc',
 'string.ascii.wrapper_gt_E.p1':'ascii-gt-E','string.ascii.wrapper_lt_c.p1':'ascii-lt-c',
 'string.ascii.page.first.p1':'page-first','string.ascii.page.continue_p1_after_p2':'page-continue',
 'string.ascii.page.reopen_p1_after_p2':'page-reopen','string.ascii.latest.order.asc.p2':'latest',
 'string.unicode.exact_membership':'unicode-membership',
};
const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y),summary={};
const unicode=oracle.unicodeInput.map(({entity,label})=>({entity,label}));
for(const [surface,answers,native]of[['datalog',dAnswers,false],['native',nAnswers,true]]){
 assert.deepEqual(Object.keys(answers).sort(),[...oracle.commonTasks.map(row=>row.id),...(native?oracle.nativeSparqlOnlyTasks.map(row=>row.id):[])].sort());
 const checks=[];
 for(const task of oracle.commonTasks){
  if(task.id==='string.unicode.exact_membership'){
   const value=response(native?'native-unicode-membership':'datalog-unicode-observe'),actual=rows(value,native);
   assert.equal(actual.length,7);assert.equal(new Set(actual.map(row=>row.entity)).size,7);
   for(const want of unicode)assert(actual.some(row=>row.entity===want.entity&&row.label===want.label));
   const rebuilt={membershipExact:true,rowsByExpectedIdentity:unicode,returnedCount:7,uniqueIdentityCount:7};
   assert.deepEqual(answers[task.id],rebuilt);checks.push({id:task.id,passed:true,kind:'EXACT_IDENTITY_MEMBERSHIP_ONLY'});
  }else{
   const value=response((native?'native-':'datalog-')+mapping[task.id]),actual=rows(value,native);
   assert.deepEqual(answers[task.id],actual);checks.push({id:task.id,passed:equal(actual,task.expectedRows),actual,expected:task.expectedRows});
  }
 }
 if(native)for(const [i,task]of oracle.nativeSparqlOnlyTasks.entries()){
  const actual=rows(response(i===0?'native-unicode-asc':'native-unicode-gt-private-use'),true);
  const expected=task.expectedEntityOrder.map(entity=>unicode.find(row=>row.entity===entity));
  assert.deepEqual(answers[task.id],actual);checks.push({id:task.id,passed:equal(actual,expected),actual,expected});
 }
 summary[surface]={passed:checks.filter(row=>row.passed).length,failed:checks.filter(row=>!row.passed).length,checks};
}
assert.equal(summary.datalog.passed,2);assert.equal(summary.datalog.failed,7);assert.equal(summary.native.passed,2);assert.equal(summary.native.failed,9);
let literalFields=0;const bases=[];
for(const event of responses){
 if(event.id.startsWith('native-')){
  const value=event.value;assert.deepEqual(value.trace.basis,value.basis);assert.equal(value.rawRows.length,value.rows.length);
  for(let i=0;i<value.rows.length;i++)for(const column of['entity','label']){
   assert.deepEqual(value.rawRows[i][column],{type:'literal',value:value.rows[i][column]});literalFields++;
  }
 }
 if(!event.value?.basis)continue;
 const basis=event.value.basis,isUnicode=event.id.includes('unicode'),expectedScope=report.scopes[isUnicode?'unicode':'ascii'];
 assert.equal(basis.scope,expectedScope);assert.equal(basis.validAt,10.5);
 assert.equal(basis.recordedPosition,event.id.startsWith('fresh-')?0:event.id.endsWith('latest')?2:1);
 const oldPage=event.id.startsWith('datalog-')&&(/page-|ascii-gt-E|ascii-lt-c/.test(event.id));
 if(oldPage)assert.equal(basis.recordedAt,1000.25);else assert.equal(Object.hasOwn(basis,'recordedAt'),false);
 bases.push({id:event.id,basis});
}
assert.equal(bases.length,24);assert.equal(report.basisChecks.length,24);assert(report.basisChecks.every(row=>row.passed));
const seed=response('seed-ascii'),unicodeSeed=response('seed-unicode'),correction=response('correct-ascii'),correctionAck=response('ack-correction');
assert.equal(seed.position,1);assert.equal(seed.instant,1000.25);assert.equal(seed.triples.length,4);
assert.equal(unicodeSeed.position,1);assert.equal(unicodeSeed.instant,1000.25);assert.equal(unicodeSeed.triples.length,7);
assert.equal(correction.position,2);assert.equal(correction.instant,2000.25);assert.equal(correction.retracted,1);assert.equal(correction.triples.length,1);
for(const [ack,seedValue,width]of[[response('ack-seed-ascii'),seed,4],[response('ack-seed-unicode'),unicodeSeed,7],[correctionAck,correction,2]]){
 assert.equal(ack.position,seedValue.position);assert.equal(ack.txId,seedValue.txId);assert.equal(ack.instant,seedValue.instant);assert.equal(ack.changes.length,width);
}
const old=seed.triples.find(row=>row.value.value==='c'),added=correction.triples[0],history=response('ascii-history');
assert.equal(history.length,2);assert.notEqual(old.id,added.id);assert.equal(added.value.value,'0');
const oldHistory=history.find(row=>row.id===old.id),newHistory=history.find(row=>row.id===added.id);
assert.equal(oldHistory.value.value,'c');assert.equal(oldHistory.recordedAt,seed.instant);assert.equal(oldHistory.txId.value,seed.txId);
assert.equal(oldHistory.retractedAt.value,correction.instant);assert.equal(oldHistory.retractTxId.value,correction.txId);
assert.equal(newHistory.recordedAt,correction.instant);assert.equal(newHistory.txId.value,correction.txId);
assert.equal(newHistory.retractedAt._tag,'None');assert.equal(newHistory.retractTxId._tag,'None');
for(const row of history){assert.equal(row.validFrom,10.25);assert.equal(row.validTo.value,10.75);assert.equal(row.entityId,old.entityId);}
assert(correctionAck.changes.some(row=>row.op==='retract'&&row.tripleId===old.id));assert(correctionAck.changes.some(row=>row.op==='assert'&&row.tripleId===added.id));
const first=response('datalog-page-first');assert.equal(typeof first.nextCursor,'string');
const continued=response('datalog-page-continue'),reopened=response('datalog-page-reopen');
assert.equal(continued.nextCursor,undefined);assert.equal(reopened.nextCursor,undefined);assert.deepEqual(continued.results,reopened.results);
for(const prefix of['native','datalog']){
 const combined=[...rows(response(prefix+'-page-first'),prefix==='native'),...rows(response(prefix+'-page-continue'),prefix==='native')];
 assert.equal(combined.length,4);assert.equal(new Set(combined.map(row=>row.entity)).size,4);
 for(const want of oracle.asciiInput)assert(combined.some(row=>row.entity===want.entity&&row.label===want.label));
}
const branch=[];
for(const [sdkId,operator,boundary]of[['datalog-ascii-gt-E','>','E'],['datalog-ascii-lt-c','<','c']]){
 const value=response(sdkId),main=value.debug.queryPlan.steps.find(row=>row.label==='main').query;
 assert(main.includes(`?v1_type = "string" && ?v1_order ${operator} "${boundary}"`));
 assert(main.includes('recorded_position_order <= "bff0000000000000"'));assert(main.includes('recorded_at_order <= "c08f420000000000"'));
 branch.push({sdkId,querySha256:sha(main),rawRows:rows(value)});
}
assert.deepEqual(branch.map(row=>row.rawRows.map(row=>row.label)),[['z'],['A']]);
const invariants=await json(a+'/public-invariants.json');assert.equal(Object.keys(invariants).length,9);assert(Object.values(invariants).every(Boolean));
const settings=events.filter(row=>row.file.includes('-setting-'));assert.equal(settings.length,7);
assert.deepEqual(settings.filter(row=>row.settings).map(row=>row.settings['query-planning-budget']),['100','1','100','100']);
assert.deepEqual(report.cleanup,{nativeClientCloseReturned:true,otherQAtEnd:[],pendingSdkCalls:0,settings:{restored100:true}});
const evidence=await json(base+'/evidence.json');assert.deepEqual(Object.fromEntries(evidence.checks.map(row=>[row.key,row.passed])),{
 'wrapper-datalog':false,'wrapper-native':false,'wrapper-invariants':true,'wrapper-settings':true,'wrapper-identity':true});
assert.deepEqual(grant.controllerInvocation.execArgv,['--max-old-space-size=256']);assert.equal(manifest.command.argv[1],'--max-old-space-size=384');
const build=await json(contract.sdkBuild.artifact.path);assert.equal(build.generated.length,70);for(const row of build.generated)assert.deepEqual(await pin(row.path),row);
const result={format:'triplex-qlever-wrapper-mixed-actual-independent/1',reviewer:'xtdb-agent',status:'STRICT_UNCHANGED_MIXED_ORACLE_FAILURE_CONFIRMED',
 terminalSha256:verified.terminalSha256,manifestSha256:verified.terminal.manifestSha256,currentPins:manifest.inputs.length,currentDrift:[],sourcePreimages:verified.sourcePreimages,
 retainedOutputs:verified.terminal.outputs.length,actualSdkCalls:31,bases,logicalTasks:summary,allNineInvariantsPassed:true,
 actualDistinctWrapperBranchQueries:branch,nativeTypedRawLiteralFields:literalFields,actualReceiptInventory:{assertionVersions:12,retractions:1,commandsAcknowledged:3},
 oldCursorAndNativeP1SurvivedP2:true,originalDatalogCursorSha256:sha(first.nextCursor),recordedPageR:1000.25,correctionRecordedAt:2000.25,
 privateSdk:{artifact:contract.sdkBuild.artifact,generatedMembersUnchanged:70,expectedFacadeUrl:contract.publicFacadeUrl,
  actualResolutionEvidence:'The frozen mixed worker checks import.meta.resolve against the private URL before operations; completion/source flow proves that check passed, but this worker did not retain the observed URL as a separate raw field. The two actual debug queries carry the unique reviewed string branch. No full module-load/OS trace claim.'},
 settings:settings.map(({id,value,settings})=>({id,value,settings})),cleanup:verified.terminal.cleanup,
 elapsedMilliseconds:verified.terminal.elapsedMilliseconds,sampledRssBytes:verified.terminal.resources.sampledPeakProcessGroupRssBytes,
 interpretation:['The old contradictory numeric/string wrapper guard no longer yields empty ranges in this candidate: >E returns z and <c returns A. Both remain wrong against the unchanged common ASCII oracle.',
  'Original mixed ASCII ordering/cursor answers and native Unicode comparator failures remain strict failures; latestP2 and exact Unicode membership are separate passing cases.',
  'All raw semantic failures are retained; no client reordering/normalization, retry, native binary/settings cap change, default integration, capacity or performance acceptance.'],
 reviewerSdkWorkerImports:0,reviewerCompilerCommands:0,reviewerBackendCalls:0};
const output='qualification/reviews/qlever-wrapper-mixed-v1-actual-independent.json';
await writeFile(path.join(root,output),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({output,sha256:(await pin(output)).sha256,calls:31,datalog:'2/9',native:'2/11'}));
