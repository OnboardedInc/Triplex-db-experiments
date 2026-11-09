// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {assertAnswer,beginning,casePlan,completeRows,eventGroups,nativeWrite,positionAt,schemaFor,supportedWorkloads,wireRows} from './engine_cases.mjs';
import {parseOptions} from './run_three_engines.mjs';
import {webhookDeliveries} from './webhook_cases.mjs';

const packet=JSON.parse(await readFile(new URL('./temporal-workloads.json',import.meta.url),'utf8'));
const workloads=packet.workloads.filter(workload=>supportedWorkloads.includes(workload.id));

test('twenty-workload plans derive from cases without consulting expected answers or assertion projections',()=>{
  assert.equal(workloads.reduce((count,workload)=>count+workload.cases.length,0),71);
  for (const workload of workloads) {
    const input=structuredClone(workload);
    delete input.assertions;
    for (const entry of input.cases) {
      delete entry.expected_rows;
      const plan=casePlan(input,entry);
      assert.ok(plan.program.includes('answer('));
      assert.ok(plan.naive.sql.includes('source_event'));
      assert.ok(!plan.direct.sql.includes('source_event'));
      if(['09','10','11','12'].includes(workload.id)){
        assert.ok(plan.program.includes('!'));
        assert.deepEqual(plan.naive.params,plan.direct.params);
      }
    }
  }
});

test('native commands retain typed event payloads and use interval patches for state',()=>{
  for (const workload of workloads) {
    assert.ok(schemaFor(workload).dsl.includes('entity Row'));
    for (const event of workload.events) {
      const command=nativeWrite(workload,event,cut=>{
        assert.equal(cut,2n);return 3n;
      });
      if(workload.id==='03'||workload.id==='04')continue;
      if(workload.id==='14'){
        assert.equal(command.method,event.kind==='production_record'?'batch':event.kind==='shipment'?'put':'patch');
        assert.equal(command.request.commandId,'event-'+event.id);
        continue;
      }
      if(workload.id==='19'){
        assert.equal(command.request.commandId,'event-'+event.id);
        assert.equal(command.request.entityId,event.subject);
        assert.equal(command.method,['future99','feature-fix','label'].includes(event.id)?'patch':'put');
        if(['prediction','label'].includes(event.id))
          assert.deepEqual(command.request.fields.find(field=>field.attribute==='feature_known_at')?.value,{tag:'i64',value:3n});
        continue;
      }
      if(workload.id==='15'){
        assert.equal(command.method,event.kind==='dependency_snapshot'?'batch':'put');
        assert.equal(command.request.commandId,'event-'+event.id);
        if(command.method==='batch')assert.equal(command.request.members.length,event.payload.edges.length);
        else if(event.kind==='vulnerability_interval')assert.equal(command.request.validTo,20n);
        continue;
      }
      if(workload.id==='05'){
        assert.equal(command.method,'put');
        assert.equal(command.request.commandId,'event-'+event.id);
        assert.equal(command.request.entityId,event.id);
        assert.deepEqual(command.request.fields.find(field=>field.attribute==='revision')?.value,
          {tag:'i64',value:BigInt(event.payload.revision.value)});
        continue;
      }
      if(workload.id==='13'){
        assert.equal(command.method,'batch');
        assert.equal(command.request.commandId,'event-'+event.id);
        assert.ok(command.request.members.every(member=>member.validFrom===BigInt(event.occurred_at)));
        assert.equal(new Set(command.request.members.map(member=>member.entityId)).size,command.request.members.length);
        assert.deepEqual(command.request.members.map(member=>member.operation),
          event.kind==='item_moved'?['patch','put']:Array(5).fill('put'));
        if(event.kind==='item_moved')assert.deepEqual(command.request.members[0].fields,[]);
        continue;
      }
      if(workload.id==='20'){
        assert.equal(command.method,'batch');
        assert.equal(command.request.commandId,'event-'+event.id);
        assert.ok(command.request.members.every(member=>member.validFrom===BigInt(event.occurred_at)));
        assert.deepEqual(command.request.members.map(member=>member.operation),
          event.kind==='edges_asserted'?Array(4).fill('put'):['patch']);
        continue;
      }
      const first=workload.events.find(candidate=>candidate.subject===event.subject);
      const patched=['01','02'].includes(workload.id)&&first.id!==event.id||event.kind==='block_corrected';
      assert.equal(command.method,patched?'patch':'put');
      assert.equal(command.request.validFrom,event.kind==='watermark'?beginning:BigInt(event.occurred_at));
      if(workload.id==='18'){
        assert.equal(command.request.validFrom,BigInt(event.payload.from.value));
        assert.equal(command.request.validTo,BigInt(event.payload.to.value));
      }
      assert.equal(command.request.commandId,'event-'+event.id);
      assert.ok(command.request.fields.every(field=>['str','i64','bool'].includes(field.value.tag)));
      if(['09','10','16'].includes(workload.id)){
        assert.equal(command.request.entityId,event.id);
        assert.deepEqual(command.request.fields.find(field=>field.attribute==='subject')?.value,{tag:'str',value:event.subject});
      }
      if(event.kind==='block_corrected'){
        assert.equal(command.request.entityId,event.corrects);
        assert.equal(command.request.validTo,30n);
        assert.deepEqual(command.request.fields,[]);
      }
      assert.equal(command.request.fields.some(field=>field.attribute==='reverses'),Boolean(event.payload.reverses));
    }
  }
});

test('price lookup carries each purchase timestamp to the mapped knowledge cut',()=>{
  const workload=structuredClone(workloads.find(candidate=>candidate.id==='03'));
  const [price100,price120,buy49,buy50]=workload.events;
  const before=nativeWrite(workload,price100),after=nativeWrite(workload,price120);
  assert.equal(before.method,'patch');assert.equal(after.method,'patch');
  assert.equal(before.request.entityId,after.request.entityId);
  assert.deepEqual([before.request.validFrom,before.request.validTo,after.request.validFrom,after.request.validTo],
    [0n,50n,50n,9223372036854775807n]);
  assert.deepEqual([buy49,buy50].map(event=>nativeWrite(workload,event).request.fields[1].value),
    [{tag:'i64',value:49n},{tag:'i64',value:50n}]);
  const [pair,boundary,empty]=workload.cases;
  const plan=casePlan(workload,pair,9n);
  assert.deepEqual(plan.lookup,{attribute:'price'});
  assert.ok(plan.program.includes('answer("product",?at,9,?purchase)'));
  assert.deepEqual(plan.direct.params,[4n,60n,'product','buy49','buy50']);
  assert.deepEqual(casePlan(workload,boundary).direct.params,[4n,50n,'product']);
  assert.deepEqual(casePlan(workload,empty).direct.params,[4n,-1n,'product']);
  pair.parameters.purchase_ids.pop();
  assert.throws(()=>casePlan(workload,pair,9n),assert.AssertionError);
});

test('claim lookup resolves the policy edge and retains the original and corrected cuts',()=>{
  const workload=workloads.find(candidate=>candidate.id==='04');
  const [coverage,claim29,claim30,fix]=workload.events;
  const original=nativeWrite(workload,coverage),correction=nativeWrite(workload,fix);
  const claims=[claim29,claim30].map(event=>nativeWrite(workload,event).request);
  assert.ok(schemaFor(workload).dsl.includes('"covers/policy":boolean'));
  assert.equal(original.method,'put');assert.equal(correction.method,'put');
  assert.equal(original.request.entityId,correction.request.entityId);
  assert.deepEqual(original.request.fields,correction.request.fields);
  assert.deepEqual([original.request.validFrom,original.request.validTo,correction.request.validFrom,correction.request.validTo],
    [10n,30n,10n,25n]);
  assert.deepEqual(claims.map(request=>request.fields[0].value.value),[original.request.entityId,original.request.entityId]);
  assert.deepEqual(claims.map(request=>request.fields[1].value.value),[29n,30n]);
  const cuts=[{logicalPosition:1n,nativePosition:3n},{logicalPosition:2n,nativePosition:4n}];
  for(const entry of workload.cases.slice(0,3)){
    const nativeCut=positionAt(cuts,BigInt(entry.cut.known_at));
    const plan=casePlan(workload,entry,nativeCut);
    assert.deepEqual(plan.lookup,{attribute:'covers/policy',exists:true});
    assert.ok(plan.program.includes('answer(?customer,?at,'+nativeCut+')'));
    assert.equal(plan.naive.params[0],BigInt(entry.cut.known_at));
  }
  const boundary=casePlan(workload,workload.cases[3],4n);
  assert.equal(boundary.lookup,undefined);
  assert.deepEqual(boundary.direct.params,[2n,25n,'policy','customer']);
});

test('alternate-support baseline preserves physical support IDs and binds exact cuts',()=>{
  const input=structuredClone(workloads.find(workload=>workload.id==='20'));
  delete input.assertions;
  const [seed,removeBD]=input.events;
  seed.payload.edges.push(structuredClone(seed.payload.edges[2]));
  removeBD.occurred_at='5';
  const inserted=nativeWrite(input,seed).request.members;
  assert.equal(new Set(inserted.map(member=>member.entityId)).size,5);
  assert.deepEqual(inserted[2].fields,inserted[4].fields);
  assert.deepEqual(nativeWrite(input,removeBD).request.members,[inserted[2],inserted[4]].map(member=>({
    ...member,operation:'patch',validFrom:5n,fields:[],
  })));
  const plan=casePlan(input,{operation:'reachability_supports',parameters:{from:{tag:'str',value:'A'},to:{tag:'str',value:'D'}},
    cut:{known_at:'2',valid_at:'4'}});
  assert.deepEqual(plan.direct.params,[2n,4n,'A','D']);
  assert.deepEqual(plan.naive.params,plan.direct.params);
  assert.deepEqual(plan.rowTags,['bool','i64']);
  assert.ok(plan.direct.sql.includes('SELECT DISTINCT src,dst'));
  assert.ok(plan.program.includes('path_count(count())'));
});

test('alternate-support baseline rejects graphs outside its finite witness contract',()=>{
  const input=structuredClone(workloads.find(workload=>workload.id==='20'));
  const edges=input.events[0].payload.edges;
  const added={from:{tag:'str',value:'D'},to:{tag:'str',value:'A'}};
  edges.push(added);
  assert.throws(()=>casePlan(input,input.cases[0]),/requires an acyclic graph/);
  added.to.value='E';
  assert.throws(()=>casePlan(input,input.cases[0]),/admits at most four nodes/);
});

test('webhook deliveries preserve source identity and authoritative revision query plans',()=>{
  const workload=structuredClone(workloads.find(candidate=>candidate.id==='05'));
  delete workload.assertions;
  const deliveries=webhookDeliveries(workload);
  assert.deepEqual(deliveries.map(({delivery,event})=>[delivery.id,event.id,delivery.receipt_position]),
    [['delivery1','E','1'],['delivery2','E','1'],['delivery3','newer','2'],['delivery4','older','3']]);
  assert.deepEqual(nativeWrite(workload,deliveries[0].event),nativeWrite(workload,deliveries[1].event));
  const state=casePlan(workload,workload.cases.find(entry=>entry.operation==='state_at'));
  assert.ok(state.program.includes('newest(max(?revision))'));
  assert.ok(state.naive.sql.includes('max(revision)'));
  assert.ok(state.direct.sql.includes('max(revision)'));
  assert.ok(!state.direct.sql.includes('ORDER BY known_from'));
  const changed=structuredClone(workload);
  changed.deliveries[1].receipt_position='2';
  assert.throws(()=>webhookDeliveries(changed),/retain the accepted receipt/);
  const repeatedRevision=structuredClone(workload);
  repeatedRevision.events[2].payload.revision.value='2';
  assert.throws(()=>webhookDeliveries(repeatedRevision),/one source event per object revision/);
});

test('dependency plans use set recursion for cycles and preserve the exact vulnerability endpoint',()=>{
  const workload=structuredClone(workloads.find(candidate=>candidate.id==='15'));
  delete workload.assertions;
  const seed=nativeWrite(workload,workload.events[0]).request.members;
  assert.equal(seed.length,5);
  assert.equal(new Set(seed.map(member=>member.entityId)).size,5);
  const vulnerability=nativeWrite(workload,workload.events[2]);
  assert.equal(vulnerability.request.validTo,20n);
  const closure=casePlan(workload,workload.cases.find(entry=>entry.operation==='dependency_closure'));
  assert.deepEqual(closure.direct.params,[1n,10n,'X']);
  assert.ok(closure.program.includes('walk(?dst) :- walk(?src),edge(?src,?dst).'));
  assert.ok(closure.direct.sql.includes('UNION SELECT e.dst'));
  assert.ok(!closure.direct.sql.includes('UNION ALL'));
  const boundary=casePlan(workload,workload.cases.find(entry=>entry.id==='vulnerability-end'));
  assert.deepEqual(boundary.direct.params,[1n,20n,'prod']);
  assert.ok(boundary.direct.sql.includes('cut.valid_at<valid_to'));
});

test('logical knowledge cuts map after complete event groups and before first knowledge',()=>{
  const groups=eventGroups({events:[{recorded_at:'2',id:'later'},{recorded_at:'1',id:'first'},{recorded_at:'1',id:'peer'}]});
  assert.deepEqual(groups.map(([position,events])=>[position,events.map(event=>event.id)]),[[1n,['first','peer']],[2n,['later']]]);
  const mapping=[{logicalPosition:1n,nativePosition:2n},{logicalPosition:2n,nativePosition:3n}];
  assert.equal(positionAt(mapping,0n),0n);
  assert.equal(positionAt(mapping,1n),2n);
  assert.equal(positionAt(mapping,9n),3n);
});

test('common inventory projection preserves exact integer values and empty ledgers',()=>{
  const plan=casePlan(workloads.find(workload=>workload.id==='07'),workloads.find(workload=>workload.id==='07').cases[0]);
  const rows=wireRows([['physical',10n],['reservation',3n]],plan.rowTags);
  assertAnswer(completeRows(rows,plan),[[{tag:'i64',value:'10'},{tag:'i64',value:'3'},{tag:'i64',value:'7'}]]);
  assertAnswer(completeRows([],plan),[[{tag:'i64',value:'0'},{tag:'i64',value:'0'},{tag:'i64',value:'0'}]]);
  assert.throws(()=>wireRows([[1]],['i64']));
  assert.throws(()=>assertAnswer([[{tag:'bool',value:false}]],[[{tag:'i64',value:'0'}]]));
});

test('recall corrections preserve contamination and independent shipment records',()=>{
  const workload=workloads.find(candidate=>candidate.id==='14');
  const [manufacture,shipment,fix]=workload.events;
  const seed=nativeWrite(workload,manufacture),sent=nativeWrite(workload,shipment),corrected=nativeWrite(workload,fix);
  assert.equal(seed.method,'batch');
  assert.equal(seed.request.members.length,2);
  const edge=seed.request.members.find(member=>member.fields.some(field=>field.attribute==='input_lot'));
  const dirty=seed.request.members.find(member=>member.fields.some(field=>field.attribute==='contaminated_lot'));
  assert.notEqual(edge.entityId,dirty.entityId);
  assert.notEqual(corrected.request.entityId,sent.request.entityId);
  assert.equal(corrected.request.entityId,edge.entityId);
  assert.deepEqual(dirty.fields,[{attribute:'contaminated_lot',value:{tag:'str',value:'A'}}]);
  assert.deepEqual(corrected.request.fields,[{attribute:'input_lot',value:{tag:'str',value:'clean'}},
    {attribute:'output_lot',value:{tag:'str',value:'B'}}]);
  const plan=casePlan(workload,workload.cases[0]);
  assert.ok(plan.program.includes('affected(?output) :- affected(?input),edge(?input,?output)'));
  assert.deepEqual(workload.cases.map(entry=>casePlan(workload,entry).direct.params),[[1n,20n,'A'],[2n,20n,'A'],[1n,9n,'A']]);
});

test('funnel preserves immutable event IDs, strict order and half-open integer windows',()=>{
  const workload=workloads.find(candidate=>candidate.id==='17');
  const commands=workload.events.map(event=>nativeWrite(workload,event));
  assert.equal(new Set(commands.map(command=>command.request.entityId)).size,12);
  for(const [index,event] of workload.events.entries()){
    assert.equal(commands[index].request.entityId,event.id);
    assert.deepEqual(commands[index].request.fields.find(field=>field.attribute==='at')?.value,
      {tag:'i64',value:BigInt(event.payload.at.value)});
  }
  const [excluded,included,equal]=workload.cases.map(entry=>casePlan(workload,entry));
  assert.ok(excluded.program.includes('[?at<40]'));
  assert.ok(included.program.includes('[?at<41]'));
  assert.ok(equal.program.includes('[?view<?checkout],[?checkout<?payment]'));
  assert.ok(equal.program.includes('answer(false) :- !qualified("equal")'));
  assert.deepEqual(equal.rowTags,['bool']);
  assert.deepEqual(excluded.direct.params,[1n,50n,0n,40n]);
  assert.deepEqual(included.direct.params,[1n,50n,0n,41n]);
});

test('runner requires an explicit fresh output and rejects unimplemented selections',()=>{
  assert.throws(()=>parseOptions([]));
  assert.throws(()=>parseOptions(['--output','result.json','--workloads','21']));
  assert.throws(()=>parseOptions(['--output','result.json','--samples','0']));
  assert.deepEqual(parseOptions(['--output','result.json']).workloads,Array.from({length:20},(_,index)=>String(index+1).padStart(2,'0')));
});
