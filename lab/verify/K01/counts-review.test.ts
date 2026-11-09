// [EXP-K01-VK01-R12] Why: independently check metadata combinations and the real seed partition against the new expectation; the storage spy is copied from the builder fixture, not an XTDB simulation. Rejected: trusting a new formula only against itself or treating reconstructed rows as captured engine evidence.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { n01SeedCounts } from '../../bench/lib/n01-counts.ts';
import { seedRung } from '../../bench/lib/seed.ts';
import { expectedN01 } from '../../bench/lib/g0-xtdb.ts';
import { fields, readG0, admitG0 } from '../../bench/lib/g0.ts';
import { assertSeedInputsCurrent } from '../../bench/lib/bulk.ts';
import { ownFacts, sharedFacts, accountsFor } from '../../bench/lib/world.ts';
const core: any = await import('../../../packages/core/dist/index.js');
const api: any = await import('../../../packages/core/dist/runtime/index.js');
const results: any[]=[];
const out=process.env.TX2_K01_COUNTS_OUT!;
after(()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(results,null,2)+'\n');});
const op=(entityId='e')=>({op:'assert',entityId,attribute:':e/value',value:{type:'string',value:'v'}});
function spy() {
  const rows = new Map<string, any>();
  let position = 0;
  const claims: any[] = [];
  const insert = (input: any, txId: string, at: number, id: string, k: number) =>
    Effect.sync(() => {
      const v = input.value;
      const row = {
        id,
        entity_id: input.entityId,
        attribute: input.attribute,
        value_type: v.type,
        value_string: ["string", "ref", "integer", "blob"].includes(v.type) ? v.value : null,
        value_number: v.type === "number" ? v.value : null,
        value_boolean: v.type === "boolean" ? Number(v.value) : null,
        value_datetime: v.type === "datetime" ? v.value : null,
        value_json:
          v.type === "json"
            ? JSON.stringify(v.value)
            : v.type === "blob"
              ? JSON.stringify(v)
              : null,
        recorded_at: at,
        recorded_position: k,
        valid_from: input.validFrom ?? at,
        valid_to: input.validTo ?? null,
        entity_type: input.entityType ?? null,
        created_by: input.createdBy ?? null,
        schema_version: 1,
        tx_id: txId,
        retracted_at: null,
        retracted_position: null,
        retract_tx_id: null,
      };
      assert(!rows.has(id));
      rows.set(id, row);
      return row;
    });
  const storage: any = {
    supportedValueTypes: [
      "string",
      "ref",
      "integer",
      "number",
      "boolean",
      "datetime",
      "json",
      "blob",
    ],
    initialize: () => Effect.void,
    withTransaction: (effect: any) => effect,
    claimCommand: (commandId: string, txId: string, at: number) =>
      Effect.sync(() => {
        claims.push({ commandId, txId, at });
        return null;
      }),
    currentCommitPosition: () => Effect.sync(() => position),
    nextCommitPosition: () => Effect.sync(() => ++position),
    insert,
    batchInsert: (inputs: any[], txId: string, at: number, ids: string[], k: number) =>
      Effect.forEach(inputs, (input, i) => insert(input, txId, at, ids[i]!, k)),
    getById: (id: string) => Effect.sync(() => rows.get(id) ?? null),
    retract: (id: string, at: number, txId: string, k: number) =>
      Effect.sync(() => {
        const row = rows.get(id);
        if (!row || row.retracted_at !== null) return false;
        Object.assign(row, { retracted_at: at, retracted_position: k, retract_tx_id: txId });
        return true;
      }),
  };
  const definition = api.Runtime.define({
    name: "offline-count-spy",
    storage: Layer.succeed(api.StorageAdapter, storage),
    queries: Layer.succeed(api.QueryExecutor, {}),
  });
  const managed: any = ManagedRuntime.make(
    definition.layer({
      scope: api.DatabaseScope.test("count-spy"),
      capabilities: api.Capabilities.none,
      deterministic: { startTime: 1000, seed: "count-spy" },
    }),
  );
  return {
    rows,
    claims,
    managed,
    async open() {
      return managed.runPromise(Effect.service(core.Triples));
    },
  };
}
for(let mask=0;mask<32;mask++)test(`public journal formula optional metadata subset ${mask}`,async()=>{
  const keys=['actor','commandId','correlationId','causationId','configSnapshot'];
  const meta=Object.fromEntries(keys.filter((_,i)=>mask&(1<<i)).map(k=>[k,'test-'+k]));
  const s=spy();try{
    const triples=await s.open();
    await s.managed.runPromise(triples.transact([op('a'),op('a'),op('b')],mask?meta:undefined));
    const journals=[...s.rows.values()].filter(r=>r.entity_type==='_Transaction');
    const want=2+Object.keys(meta).length+2+3;
    assert.equal(journals.length,want);assert.equal(s.rows.size,3+want);
    results.push({mask,meta,journal:journals.length,business:3,expected:want});
  }finally{await s.managed.dispose();}
});
test('empty optional metadata contributes no rows; duplicate retract is one actual change',async()=>{
  const s=spy();try{
    const triples=await s.open();
    const first=await s.managed.runPromise(triples.transact([op()],{actor:'',correlationId:'',causationId:'',configSnapshot:''}));
    assert.equal(s.rows.size,5);
    const id=first.triples[0].id;
    await s.managed.runPromise(triples.transact([{op:'retract',id},{op:'retract',id},op()],{actor:'a',commandId:'replacement',correlationId:'c',causationId:'d',configSnapshot:'s'}));
    const journal=[...s.rows.values()].filter(r=>r.entity_type==='_Transaction'&&r.recorded_position===2);
    assert.equal(journal.length,2+5+1+2);assert.equal(s.rows.size,16);
    assert.notEqual(s.rows.get(id).retracted_at,null);
    results.push({case:'duplicate retract then assert',journal:journal.length,stored:s.rows.size,changes:2,entities:1});
  }finally{await s.managed.dispose();}
});
async function partition(subjects:number,batchFacts:number){
  const batches:any[]=[];let position=0;
  const comp:any={transact:async(ops:any[],meta:any)=>{
    const p=++position;batches.push({commandId:meta.commandId,actor:meta.actor,ops});
    return {ok:true,value:{txId:'tx-'+p,position:p,instant:1000+p,triples:ops.map((o,i)=>({id:p+'-'+i,entityId:o.entityId,attribute:o.attribute,value:o.value,validFrom:o.validFrom}))}};
  }};
  const seed=await seedRung({comp,subjects,batchFacts,runTag:'review',budgetMs:Infinity,recordSubjects:new Set(),recordAccounts:new Set(),historySubjects:new Set(),log:()=>{}});
  return {seed,batches};
}
for(const batch of [1,7,27,28,29,55,56,57,224,399,401,2000])test(`actual seeder partition, 21 subjects, batch ${batch}`,async()=>{
  const {seed,batches}=await partition(21,batch),p=n01SeedCounts(21,batch);
  const business=batches.reduce((n,b)=>n+b.ops.length,0);
  const changedEntities=batches.reduce((n,b)=>n+new Set(b.ops.map((o:any)=>o.entityId)).size,0);
  const journal=2*batches.length+batches.reduce((n,b)=>n+Number(Boolean(b.actor))+Number(Boolean(b.commandId)),0)+changedEntities+business;
  assert.equal(p.commands,batches.length);assert.equal(p.business,business);assert.equal(p.journal,journal);assert.equal(p.storedAssertions,business+journal);assert.equal(seed.lastPosition,p.commands);
  const subjectBatches=batches.filter(b=>/:seed:s/.test(b.commandId));
  if(batch===56)assert.equal(subjectBatches[0].commandId,'review:seed:s0-1');
  if(batch===28)assert.equal(subjectBatches[0].commandId,'review:seed:s0-0');
  const accountBatches=batches.filter(b=>/:seed:acct/.test(b.commandId));
  const perCommand=accountBatches.reduce((n,b)=>n+new Set(b.ops.map((o:any)=>o.entityId)).size,0);
  const global=new Set(accountBatches.flatMap(b=>b.ops.map((o:any)=>o.entityId))).size;
  if(batch<28)assert(perCommand>global,'repeated account entities must be counted again in each command');
  results.push({case:'partition',batch,...p,changedEntities,accountPerCommandEntities:perCommand,accountGlobalEntities:global,subjectCommands:subjectBatches.map(b=>b.commandId)});
});
test('500-subject independent command partition reproduces 61384 without any engine read',async()=>{
  const {batches}=await partition(500,400);
  const business=batches.reduce((n,b)=>n+b.ops.length,0),entities=batches.reduce((n,b)=>n+new Set(b.ops.map((o:any)=>o.entityId)).size,0);
  assert.equal(batches.length,81);assert.equal(business,26635);assert.equal(entities,7790);
  assert.equal(business+4*batches.length+entities+business,61384);
  results.push({case:'500-400',commands:batches.length,business,changedEntities:entities,journal:4*batches.length+entities+business,stored:61384});
});
test('count expectation ignores observed-count-shaped fields; stale pre-fix binding refuses before reads',async()=>{
  const p=n01SeedCounts(1,400);
  const m:any={scope:'offline-review',subjects:1,accounts:p.accounts,seedInputs:{options:{seedBatchFacts:400}},result:{complete:true,seededSubjects:1,commands:p.commands,lastPosition:p.commands,assertions:p.business,expectedAssertions:p.business}};
  const expected=expectedN01(m);
  for(const value of [0,1,61384,Number.MAX_SAFE_INTEGER]){
    const bad=structuredClone(m);bad.counts={tx_assertions:value};bad.result.observedAssertions=value;bad.result.storedAssertions=value;bad.g0={counts:{tx_assertions:value}};
    assert.deepEqual(expectedN01(bad),expected);
  }
  let reads=0;const reader:any={count(){reads++;throw Error('must not read');}};
  await assert.rejects(()=>admitG0(reader,{...expected,format:'tx2-g0/1',D:'0'.repeat(64),counts:{...expected.counts,tx_assertions:p.business}},expected),/pin binding differs/);assert.equal(reads,0);
  results.push({case:'expectation data flow and stale binding',expected,reads});
});
test('extra/missing business or journal rows refuse; same-count class substitutions refuse full digest',async()=>{
  const {batches,seed}=await partition(1,400),p=n01SeedCounts(1,400);
  const m:any={scope:'offline-review',subjects:1,accounts:p.accounts,seedInputs:{options:{seedBatchFacts:400}},result:{...seed,expectedAssertions:p.business}};
  const expected=expectedN01(m);
  // [EXP-K01-VK01-R13] Why: this retained synthetic fixture tests count/digest corruption; it has no native catalog witness. Rejected: presenting placeholder rows as production catalog evidence; the new adapter/SQL controls exercise that policy.
  delete expected.tables;
  const tables:any=Object.fromEntries(Object.keys(fields).map(t=>[t,[]]));
  let id=0;
  const add=(entity_type:string,attribute:string,position:number)=>tables.tx_assertions.push({id:String(++id),entity_type,attribute,recorded_position:position});
  batches.forEach((b,k)=>{
    b.ops.forEach((o:any)=>add('business',o.attribute,k+1));
    for(let j=0;j<4+new Set(b.ops.map((o:any)=>o.entityId)).size+b.ops.length;j++)add('_Transaction',':_tx/journal',k+1);
  });
  tables.tx_claims=Array.from({length:p.commands},(_,i)=>({position:i+1}));tables.tx_attempts=structuredClone(tables.tx_claims);tables.tx_meta=[{position:p.commands}];
  const reader:any={endpoint:'offline-planted-clone',scopes:async()=>[{scope_key:m.scope,position:p.commands}],count:async(t:string)=>tables[t].length,async *scan(t:string){for(const r of tables[t])yield {...Object.fromEntries(fields[t].map(c=>[c,null])),...r};}};
  const pin=await readG0(reader,expected);assert.equal((await admitG0(reader,pin,expected)).status,'PASS');
  for(const kind of ['business','_Transaction'])for(const delta of [-1,1]){
    const saved=tables.tx_assertions.slice(),i=saved.findIndex((r:any)=>r.entity_type===kind);
    if(delta===-1)tables.tx_assertions.splice(i,1);else tables.tx_assertions.push({...saved[i],id:'extra'});
    await assert.rejects(()=>admitG0(reader,pin,expected),/count mismatch: tx_assertions/);
    tables.tx_assertions=saved;results.push({case:'count mutation refuses',kind,delta});
  }
  const row=tables.tx_assertions[0];row.entity_type='_Transaction';
  await assert.rejects(()=>admitG0(reader,pin,expected),/content mismatch/);row.entity_type='business';
  const realCount=reader.count;reader.count=async(t:string)=>t==='tx_assertions'?p.storedAssertions+1:realCount(t);
  await assert.rejects(()=>admitG0(reader,pin,expected),/count mismatch/);
  assert.equal(expectedN01(m).counts.tx_assertions,p.storedAssertions);
  results.push({case:'same-count substitution and incorrect observed count refuse'});
});
