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

const out='lab/verify/RT01/round4/pending-proof/';
const results:any[]=[];
for(const lane of ['xtdb','qlever'])for(const commitEncoding of ['a0','compact'] as const){
 const scope=DatabaseScope.test('pending-proof-'+lane+'-'+commitEncoding);
 const client:any=lane==='xtdb'?makeRecordTimeClient():qTransport().client;
 const adapter=lane==='xtdb'?makeXtdbStorageAdapter(client,scope,{commitEncoding}):makeQleverStorageAdapter(client,scope,{commitEncoding});
 const suite=makeA0RecordTimeSuite(adapter,{} as any,scope,{loseNextAck:()=>{}});
 const result=await Effect.runPromise(Effect.gen(function*(){
  const t=yield* Triples;suite.clock.set(1000);
  const operations=(entityId:string)=>[{op:'assert' as const,entityId:EntityId.make(entityId),attribute:':value',value:string('value')}];
  const seed=yield* t.transact(operations('seed'));
  const basis={validAt:1000,recordedAt:1000.001};
  const start=performance.now();
  const before=yield* adapter.withTransaction(t.entity(EntityId.make('later'),basis).pipe(Effect.match({onSuccess:rows=>({rows}),onFailure:(error:any)=>({error:{tag:error._tag,axis:error.axis}})})),{replaySafe:false});
  const elapsed=performance.now()-start;
  const later=yield* t.transact(operations('later'));
  const after=yield* t.entity(EntityId.make('later'),basis);
  return {seed,basis,before,elapsed,later,after,operations:[operations('seed'),operations('later')]};
 }).pipe(Effect.provide(suite.layer)));
 const id=lane+'-'+commitEncoding;
 writeFileSync(out+id+'-observed.json',JSON.stringify(result,null,2)+'\n');
 const receipts=[result.seed,result.later].map((r:any,command)=>({command,outcome:'committed',position:r.position,txId:r.txId,instant:r.instant,stagedAt:r.stagedAt,assertionIds:[r.triples[0].id]}));
 const input={format:'triplex-db-2/o-replay-case/1',caseId:'CX-VRT01-R2/pending/'+id,defaultScope:scope,adapter:{recordTime:'decided',clockDriven:true,schemaVersion:1},commands:result.operations.map(operations=>({clock:1000,operations})),receipts,queries:[{id:'before',kind:'entityTriples',entityId:'later',readStart:1,cut:result.basis},{id:'after',kind:'entityTriples',entityId:'later',readStart:2,cut:result.basis}]};
 writeFileSync(out+id+'.case.json',JSON.stringify(input,null,2)+'\n');
 results.push({id,before:result.before,elapsed:result.elapsed,afterRows:result.after.length,receiptInstant:result.later.instant});
}
writeFileSync(out+'summary.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
