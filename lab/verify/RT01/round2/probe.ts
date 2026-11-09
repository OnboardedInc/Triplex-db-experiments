// [CX-VRT01] Why: exercise the real RT01 adapters/core with deterministic offline transports and retain actual bytes. Rejected: testing a second implementation of record stamping.
import { Effect } from 'effect';
import { writeFileSync } from 'node:fs';
import { EntityId, Triples, string } from '../../../../packages/core/dist/index.js';
import { TypeExpr } from '../../../../packages/core/dist/config/index.js';
import { DatabaseScope } from '../../../../packages/core/dist/runtime/index.js';
import { makeA0RecordTimeSuite } from '../../../../packages/testkit/dist/index.js';
import { makeRecordTimeClient } from '../../../../packages/xtdb/test/fixtures/record-time-client.js';
import { makeXtdbStorageAdapter } from '../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import { makeQleverStorageAdapter } from '../../../../packages/qlever/src/QleverStorageAdapter.js';
import { makeXtdbNativeQueries } from '../../../../packages/xtdb/src/native/NativeQueries.js';
import { makeQleverNativeQueries } from '../../../../packages/qlever/src/native/NativeQueries.js';
import { makeXtdbQueryExecutor } from '../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import { makeQleverQueryExecutor } from '../../../../packages/qlever/src/QleverQueryExecutor.js';
import { makeXtdbTemporalQueries } from '../../../../packages/xtdb/src/TemporalQueries.js';
import { makeQleverTemporalQueries } from '../../../../packages/qlever/src/TemporalQueries.js';
import { makeXtdbMaintainedQueries } from '../../../../packages/xtdb/src/MaintainedQueries.js';
import { decodeRow, metaIri, integerOrderKey, numericOrderKey } from '../../../../packages/qlever/src/rdf.js';

const out = process.argv[2] ?? 'lab/verify/RT01/round2/reproductions/';
const save = (name: string, value: unknown) => writeFileSync(out+name,JSON.stringify(value,null,2)+'\n');
const scope = DatabaseScope.test('CX-VRT01');
const lit=(value:string)=>({type:'literal',value});
function qTransport() {
  const records = new Map<string,Map<string,string>>();
  const calls:string[]=[];
  let lost=false;
  const client:any={
    query:async(query:string)=>{
      calls.push(query);
      const meta=records.get(metaIri);
      if(query.startsWith('SELECT ?position')) return meta ? [{position:lit(meta.get('position')!),stamp:lit(meta.get('stamp')!)}] : [];
      const op=/(<urn:triplex:operation:[^>]+>)/.exec(query)?.[1];
      if(op){const r=records.get(op);return r?[{attempt:lit(r.get('attempt_id')!),position:lit(r.get('position')!),stamp:lit(r.get('stamp')!)}]:[];}
      if(query.includes('SELECT ?tx WHERE')) {
        const claim=/(<urn:triplex:claim:[^>]+>)/.exec(query)?.[1];
        const record=claim?records.get(claim):undefined;
        return record?[{tx:lit(record.get('tx_id')!)}]:[];
      }
      if(!query.startsWith('SELECT ?row')) throw new Error('Unsupported verifier transport SPARQL: '+query);
      let rows=[...records.entries()].filter(([,r])=>r.has('_row'));
      const subject=/VALUES \?subject \{ (<[^>]+>) \}/.exec(query)?.[1];
      if(subject) rows=rows.filter(([s])=>s===subject);
      for(const m of query.matchAll(/\?subject <urn:triplex:field:(entity_id|attribute|entity_type|value_type|value_string)> ("(?:[^"\\]|\\.)*") \./g)) rows=rows.filter(([,r])=>r.get(m[1]!)===JSON.parse(m[2]!));
      const decoded=rows.map(([,r])=>decodeRow(r.get('_row')!));
      const bound=(v:string)=>new RegExp('\\?'+v+' <= "([0-9a-f]+)"').exec(query)?.[1];
      const p=bound('recordedOrder'),t=bound('recordedTime'),v=bound('validFrom');
      const result=decoded.filter(r=>(!p||numericOrderKey(r.recorded_position)<=p)&&(!t||numericOrderKey(r.recorded_at)<=t)&&(!query.includes('!BOUND(?retractedTime)')||r.retracted_at===null||(p!==undefined&&numericOrderKey(r.retracted_position!)>p)||(t!==undefined&&numericOrderKey(r.retracted_at)>t))&&(!v||(numericOrderKey(r.valid_from)<=v&&(r.valid_to===null||numericOrderKey(r.valid_to)>v))));
      return result.map(r=>({row:lit(JSON.stringify(r))}));
    },
    update:async(update:string)=>{
      calls.push(update);
      const meta=records.get(metaIri);
      const guard=update.split('VALUES (?s ?p ?new)')[0]!;
      // [CX-VRT01] Why: apply the emitted complete-cut CAS before any tuple. Rejected: an always-success update stub (cannot reproduce competing decisions).
      if(meta){if(!guard.includes(`${metaIri} <urn:triplex:field:position> "${meta.get('position')}" ; <urn:triplex:field:stamp> "${meta.get('stamp')}"`))return;}
      else if(!guard.includes('FILTER NOT EXISTS'))throw new Error('Missing initial guard');
      for(const m of update.matchAll(/\((<urn:triplex:[^>]+>) <urn:triplex:field:([^>]+)> ("(?:[^"\\]|\\.)*")\)/g)){
        const r=records.get(m[1]!)??new Map();r.set(m[2]!,JSON.parse(m[3]!));records.set(m[1]!,r);
      }
      if(lost){lost=false;throw new Error('verifier lost ACK');}
    },command:async()=>{},cancel:async()=>{},close:async()=>{}
  };
  return {client,records,calls,lose:()=>{lost=true;}};
}
const summaries:any[]=[];
for(const lane of ['xtdb','qlever']) for(const commitEncoding of ['a0','compact'] as const) {
  const q=lane==='qlever'?qTransport():undefined;
  const real:any=q?.client??makeRecordTimeClient();
  let lost=false;
  const sql:any=lane==='xtdb'?{...real,submit:async(...args:any[])=>{const r=await real.submit(...args);if(lost){lost=false;throw new Error('verifier lost ACK');}return r;}}:real;
  const adapter=lane==='xtdb'?makeXtdbStorageAdapter(sql,scope,{commitEncoding,maxRetries:256}):makeQleverStorageAdapter(sql,scope,{commitEncoding,maxRetries:256});
  const suite=makeA0RecordTimeSuite(adapter,{} as any,scope,{loseNextAck:()=>{if(q)q.lose();else lost=true;}});
  const id=lane+'-'+commitEncoding;
  const data=await Effect.runPromise(Effect.gen(function*(){
    const t=yield* Triples;
    const commands:any[]=[],receipts:any[]=[];
    // Copy returned arrays: no mutation of source receipts or live state.
    const one={op:'assert',ref:'one',entityId:'subject:one',attribute:':value',value:string('first'),entityType:'Subject'};
    suite.clock.set(1000);const a=yield* t.transact([one as any]);
    commands.push({clock:1000,operations:[one]});receipts.push({command:0,outcome:'committed',txId:a.txId,position:a.position,instant:a.instant,stagedAt:a.stagedAt,assertionIds:[a.triples[0]!.id]});
    suite.clock.set(1000);const two={...one,ref:'two',entityId:'subject:two'};const b=yield* t.transact([two as any]);
    commands.push({clock:1000,operations:[two]});receipts.push({command:1,outcome:'committed',txId:b.txId,position:b.position,instant:b.instant,stagedAt:b.stagedAt,assertionIds:[b.triples[0]!.id]});
    const validRows=yield* t.entity(EntityId.make('subject:two'),{validAt:1000,recordedAt:b.instant});
    suite.clock.set(900);const c=yield* t.transact([{op:'retract',id:a.triples[0]!.id}]);
    commands.push({clock:900,operations:[{op:'retract',target:'one'}]});receipts.push({command:2,outcome:'committed',txId:c.txId,position:c.position,instant:c.instant,stagedAt:c.stagedAt,assertionIds:[null]});
    const journals=yield* adapter.query({entityType:'_Transaction'});
    const transactions=(yield* t.transactions()).transactions;
    const rawChanges=journals.filter(r=>r.attribute===':_tx/change').map(r=>JSON.parse(r.value_json!));
    const nested=yield* adapter.withTransaction(Effect.gen(function*(){
      suite.clock.set(800);const n=yield* t.transact([{...one,entityId:EntityId.make('nested:one')} as any]);
      const r=yield* t.transact([{op:'retract',id:n.triples[0]!.id}]);
      return {n,r};
    }));
    const nestedJournal=yield* adapter.query({entityId:EntityId.make(nested.r.txId)});
    const nestedHydrated=yield* t.transaction(nested.r.txId);
    return {commands,receipts,validRows,journals,transactions,rawChanges,nested,nestedJournal,nestedHydrated};
  }).pipe(Effect.provide(suite.layer)));
  save(id+'-observed.json',data);
  save(id+'.case.json',{format:'triplex-db-2/o-replay-case/1',caseId:'CX-VRT01/'+id,defaultScope:scope,adapter:{recordTime:'decided',clockDriven:true,schemaVersion:1},commands:data.commands,receipts:data.receipts,queries:[{id:'journal',kind:'journalFacts'},{id:'transactions',kind:'transactions'},{id:'valid-default',kind:'entityTriples',entityId:'subject:two',cut:{validAt:1000,recordedAt:data.receipts[1].instant}},{id:'future',kind:'entityTriples',entityId:'subject:two',cut:{validAt:1000,recordedAt:data.receipts[2].instant+1}}]});
  const nestedCommands=[
    {clock:800,physicalGroup:'nested',operations:[{op:'assert',ref:'nested',entityId:'nested:one',attribute:':value',value:string('first'),entityType:'Subject'}]},
    {clock:800,physicalGroup:'nested',operations:[{op:'retract',target:'nested'}]}
  ];
  const nestedReceipts=[data.nested.n,data.nested.r].map((r:any,i:number)=>({command:data.commands.length+i,outcome:'committed',txId:r.txId,position:r.position,instant:r.instant,stagedAt:r.stagedAt,assertionIds:i===0?[r.triples[0].id]:[null]}));
  save(id+'-nested.case.json',{format:'triplex-db-2/o-replay-case/1',caseId:'CX-VRT01/'+id+'/nested',defaultScope:scope,adapter:{recordTime:'decided',clockDriven:true,schemaVersion:1},commands:[...data.commands,...nestedCommands],receipts:[...data.receipts,...nestedReceipts],queries:[{id:'journal',kind:'journalFacts'},{id:'transactions',kind:'transactions'}]});
  summaries.push({id,stamps:data.receipts.map((r:any)=>r.instant),nestedOwnInstant:data.nestedJournal.filter((r:any)=>r.attribute===':_tx/change').map((r:any)=>JSON.parse(r.value_json)),suite:'pending'});
  // Fresh fixture for the complete T1-T12 schedule; never mix previously used heads with its deterministic assumptions.
  const freshQ=lane==='qlever'?qTransport():undefined;
  const fresh:any=freshQ?.client??makeRecordTimeClient();let freshLost=false;
  const freshClient=lane==='xtdb'?{...fresh,submit:async(...args:any[])=>{const r=await fresh.submit(...args);if(freshLost){freshLost=false;throw new Error('lost ACK');}return r;}}:fresh;
  const freshAdapter=lane==='xtdb'?makeXtdbStorageAdapter(freshClient,scope,{commitEncoding,maxRetries:256}):makeQleverStorageAdapter(freshClient,scope,{commitEncoding,maxRetries:256});
  const full=makeA0RecordTimeSuite(freshAdapter,{} as any,scope,{loseNextAck:()=>{if(freshQ)freshQ.lose();else freshLost=true;}});
  try{await Effect.runPromise(full.run.pipe(Effect.provide(full.layer)));summaries.at(-1).suite='completed';}catch(e){summaries.at(-1).suite=String(e);}
  console.log(id,summaries.at(-1).suite);
  save('probe-summary.json',summaries);
}

const routes:any[]=[];
const contract={name:'verify/future',parameters:TypeExpr.any,row:TypeExpr.any};
const query={find:['?e'],where:[['?e',':value','?v']]};
for(const lane of ['xtdb','qlever']){
  const calls:string[]=[];
  const client:any={query:async(q:string)=>{calls.push(q);if(!q.includes('tx_meta')&&!q.startsWith('SELECT ?position'))throw new Error('Answer query reached before watermark');return lane==='xtdb'?[{position:1,stamp:1000000}]:[{position:lit('1'),stamp:lit(integerOrderKey('1000000'))}];},submit:async()=>{throw new Error('read wrote');},update:async()=>{throw new Error('read wrote');},command:async()=>{},cancel:async()=>{},close:async()=>{}};
  const native:any=lane==='xtdb'?makeXtdbNativeQueries(client,scope):makeQleverNativeQueries(client,scope);
  const adapter=lane==='xtdb'?makeXtdbStorageAdapter(client,scope):makeQleverStorageAdapter(client,scope);
  const executor=lane==='xtdb'?makeXtdbQueryExecutor(client,scope):makeQleverQueryExecutor(client,scope);
  const temporal=lane==='xtdb'?makeXtdbTemporalQueries(client,scope):makeQleverTemporalQueries(client,scope);
  const T=1000.001;
  const cases:any[]=[['storage',()=>adapter.query({},{validAt:1000,recordedAt:T})],['dependency-empty',()=>adapter.dependencyState([],{validAt:1000,recordedAt:T})],['datalog',()=>executor.execute(query as any,false,{validAt:1000,recordedAt:T})],['interval',()=>temporal.queryIntervals(query as any,{from:0,to:1001,recordedAt:T})],['native',()=>native.select(contract,{},()=> 'SELECT ?x WHERE {}',{basis:{validAt:1000,recordedAt:T}})]];
  if(lane==='xtdb'){cases.push(['native-sql',()=>native.selectSql(contract,{},()=> 'SELECT 1',{basis:{validAt:1000,recordedAt:T}})]);cases.push(['maintained',()=>makeXtdbMaintainedQueries(client,scope).query(query as any,{validAt:1000,recordedAt:T})]);}
  for(const [route,run] of cases){const start=performance.now();const observed=await Effect.runPromise(run().pipe(Effect.match({onSuccess:(value:any)=>({success:value}),onFailure:(e:any)=>({tag:e._tag,axis:e.axis,required:e.required,causeTag:e.cause?._tag,causeAxis:e.cause?.axis})})));routes.push({lane,route,T,elapsed:performance.now()-start,observed});save('route-probes.json',routes);console.log(lane,route,JSON.stringify(observed));}
}
