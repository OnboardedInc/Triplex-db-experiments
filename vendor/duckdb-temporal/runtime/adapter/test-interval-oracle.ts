import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {EntityReceipt} from './native-entity.js';
import type {NativeQueryValue,SchemaValue} from './native-schema.js';

const SEED = 0x5eed2026;
const TICKS = Array.from({length:17}, (_,index)=>index-3);
const ENTITIES = ['alpha','beta'] as const;
const SCHEMA = 'schema interval_oracle version 1 {entity Row {n:int64 many;flag:boolean;}}';
const PROGRAM = 'answer(?e,?a,?v) :- triple(?e,?a,?v).';

type Entity = typeof ENTITIES[number];
type Field = {attribute:'n'|'flag';value:SchemaValue};
type Fact = Field & {version:number};
type Grid = Map<Entity,Map<number,readonly Fact[]>>;
type Operation = {kind:'put'|'patch';entity:Entity;from:number;to:number;fields:readonly Field[];version:number};

function random(seed:number):(limit:number)=>number {
  let state=seed>>>0;
  return limit=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)%limit;
  };
}

function valueKey(value:NativeQueryValue):string {
  return JSON.stringify([value.tag,typeof value.value==='bigint'?value.value.toString():value.value]);
}

function fieldKey(field:Field):string {
  return JSON.stringify([field.attribute,valueKey(field.value)]);
}

function emptyGrid():Grid {
  return new Map(ENTITIES.map(entity=>[entity,new Map<number,readonly Fact[]>(TICKS.map(tick=>[tick,[]]))]));
}

/** A discrete state function, independent of assertion splitting or provenance storage. */
function applyOracle(previous:Grid,operation:Operation):Grid {
  const next:Grid=new Map([...previous].map(([entity,cells])=>[entity,new Map(cells)]));
  const cells=next.get(operation.entity)!;
  const values=new Map(operation.fields.map(field=>[fieldKey(field),{...field,version:operation.version}]));
  for (const tick of TICKS) {
    if (operation.kind==='put') cells.set(tick,[]);
    if (operation.from<=tick && tick<operation.to) cells.set(tick,[...values.values()]);
  }
  return next;
}

function integer(value:number):Field {
  return {attribute:'n',value:{tag:'i64',value:BigInt(value)}};
}

function flag(value:boolean):Field {
  return {attribute:'flag',value:{tag:'bool',value}};
}

function trace(seed:number):Operation[] {
  const make=(kind:'put'|'patch',entity:Entity,from:number,to:number,fields:readonly Field[]):Operation=>
    ({kind,entity,from,to,fields,version:1});
  const operations=[
    make('put','alpha',-2,10,[integer(1),integer(1),integer(-1),flag(true)]),
    make('patch','alpha',0,4,[integer(2),integer(2),flag(false)]),
    make('patch','alpha',6,9,[]),
    make('patch','alpha',4,6,[integer(3),flag(true)]),
    make('patch','beta',-1,2,[integer(4)]),
    make('put','alpha',2,5,[integer(7)]),
    make('patch','alpha',-2,1,[integer(5)]),
    make('patch','alpha',-2,1,[integer(5)]),
  ];
  const next=random(seed);
  while (operations.length<22) {
    const left=next(15)-2,right=next(15)-2;
    const from=Math.min(left,right);
    const to=left===right?from+1:Math.max(left,right);
    const fields:Field[]=[];
    if (next(5)!==0) {
      const value=next(7)-3;
      fields.push(integer(value),integer(value));
      if (next(2)===0) fields.push(integer(next(7)-3));
      if (next(2)===0) fields.push(flag(next(2)===0));
    }
    operations.push(make(next(4)===0?'put':'patch',ENTITIES[next(2)]!,from,to,fields));
  }
  return operations;
}

function factsAt(grid:Grid,entity:Entity,tick:number):readonly Fact[] {
  return grid.get(entity)?.get(tick)??[];
}

async function assertPoint(store:NativeEntityStore,grid:Grid,knownAt:bigint,entity:Entity,tick:number,
  schemaHashes:ReadonlyMap<number,string>,context:string):Promise<void> {
  const actual=await store.at(entity,{knownAt,validAt:BigInt(tick)});
  const expected=factsAt(grid,entity,tick);
  const keys=(facts:readonly {attribute:string;value:SchemaValue;version:number}[])=>
    facts.map(fact=>JSON.stringify([JSON.stringify([fact.attribute,valueKey(fact.value)]),fact.version])).sort();
  assert.deepEqual(keys(actual),keys(expected),context);
  for (const fact of actual) {
    assert.equal(fact.schema,'interval_oracle',context);
    assert.equal(fact.schemaHash,schemaHashes.get(fact.version),context);
    assert.ok(fact.validFrom<=BigInt(tick) && BigInt(tick)<fact.validTo,context);
    assert.ok(fact.txFrom<=knownAt && knownAt<fact.txTo,context);
  }
}

async function assertQuery(store:NativeEntityStore,grid:Grid,knownAt:bigint,tick:number,context:string):Promise<void> {
  const expected=ENTITIES.flatMap(entity=>factsAt(grid,entity,tick).map(fact=>
    JSON.stringify([entity,fact.attribute,valueKey(fact.value)]))).sort();
  const queryOptions={knownAt,validAt:BigInt(tick),timeoutMs:5000};
  const native=await store.query(PROGRAM,{...queryOptions,forceNative:true,deadlineMs:5000});
  const sql=await store.queryScalable(PROGRAM,queryOptions);
  for (const result of [native,sql]) {
    assert.equal(result.position,knownAt,context);
    const actual=result.rows.map(row=>JSON.stringify([row[0]?.value,row[1]?.value,valueKey(row[2]!)])).sort();
    assert.deepEqual(actual,expected,context);
  }
}

function command(store:NativeEntityStore,operation:Operation,commandId:string,fields=operation.fields):Promise<EntityReceipt> {
  const request={schema:'interval_oracle',version:operation.version,type:'Row',entityId:operation.entity,
    commandId,fields,validFrom:BigInt(operation.from),validTo:BigInt(operation.to)};
  return operation.kind==='put'?store.put(request):store.patch(request);
}

test(`seeded interval state oracle seed=0x${SEED.toString(16)}`,{timeout:120000},async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try {
    const schema=await store.defineSchema(SCHEMA);
    const hashes=new Map([[1,schema.hash]]);
    const snapshots=new Map<bigint,Grid>([[0n,emptyGrid()]]);
    const select=random(SEED^0x2468ace0);
    const operations=trace(SEED);
    const receipts:EntityReceipt[]=[];
    let state=emptyGrid();
    for (const [index,operation] of operations.entries()) {
      const label=`seed=0x${SEED.toString(16)} step=${index} ${operation.kind} `+
        `${operation.entity}[${operation.from},${operation.to})`;
      const expected=applyOracle(state,operation);
      const receipt=await command(store,operation,`oracle-${index}`).catch(cause=>{throw new Error(label,{cause});});
      receipts.push(receipt);
      const position=BigInt(index+1);
      assert.equal(receipt.position,position,label);
      snapshots.set(position,expected);
      state=expected;
      if (index%7===0) {
        const reordered=[...operation.fields].reverse();
        if (reordered[0]) reordered.push(reordered[0]);
        assert.deepEqual(await command(store,operation,`oracle-${index}`,reordered),receipt,label+' replay');
      }
      for (const tick of TICKS) await assertPoint(store,state,position,operation.entity,tick,hashes,label+` V=${tick}`);
      for (const tick of new Set([operation.from,operation.to-1,operation.to].filter(value=>TICKS.includes(value))))
        await assertQuery(store,state,position,tick,label+` query V=${tick}`);
      const oldPosition=BigInt(select(index+1));
      const old=snapshots.get(oldPosition)!;
      const tick=TICKS[select(TICKS.length)]!;
      await assertPoint(store,old,oldPosition,ENTITIES[select(ENTITIES.length)]!,tick,hashes,label+` historical K=${oldPosition} V=${tick}`);
      await assertQuery(store,old,oldPosition,tick,label+` historical query K=${oldPosition} V=${tick}`);
    }
    for (const index of [0,Math.floor(operations.length/2)]) {
      assert.deepEqual(await command(store,operations[index]!,`oracle-${index}`),receipts[index],
        `seed=0x${SEED.toString(16)} delayed replay step=${index}`);
    }
    const latest=await store.queryScalable(PROGRAM,{validAt:0n,timeoutMs:5000});
    assert.equal(latest.position,BigInt(operations.length),'Delayed replay advanced the knowledge position');
    for (const [knownAt,grid] of snapshots) for (const entity of ENTITIES) for (const tick of [-2,1,6,10])
      await assertPoint(store,grid,knownAt,entity,tick,hashes,
        `seed=0x${SEED.toString(16)} final history entity=${entity} K=${knownAt} V=${tick}`);
  } finally {await store.close();}
});

test('discrete interval oracle retains original schema meaning through repeated version-two patches',{timeout:60000},async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try {
    const first=await store.defineSchema(SCHEMA);
    const hashes=new Map([[1,first.hash]]);
    const operations:Operation[]=[
      {kind:'put',entity:'alpha',from:-2,to:10,version:1,fields:[integer(1),flag(true)]},
      {kind:'patch',entity:'alpha',from:2,to:8,version:2,fields:[{attribute:'n',value:{tag:'str',value:'new'}}]},
      {kind:'patch',entity:'alpha',from:0,to:4,version:2,fields:[{attribute:'n',value:{tag:'str',value:'newer'}}]},
      {kind:'put',entity:'alpha',from:3,to:5,version:2,fields:[{attribute:'n',value:{tag:'str',value:'whole'}}]},
      {kind:'patch',entity:'alpha',from:-1,to:0,version:2,fields:[{attribute:'n',value:{tag:'str',value:'edge'}}]},
    ];
    let grid=emptyGrid();
    const snapshots=new Map<bigint,Grid>();
    for (const [index,operation] of operations.entries()) {
      if (index===1) {
        const second=await store.defineSchema('schema interval_oracle version 2 {entity Row {n:text many;flag:boolean;}}');
        hashes.set(2,second.hash);
      }
      const receipt=await command(store,operation,`schema-oracle-${index}`);
      assert.equal(receipt.position,BigInt(index+1));
      grid=applyOracle(grid,operation);snapshots.set(receipt.position,grid);
      for (const tick of TICKS) await assertPoint(store,grid,receipt.position,'alpha',tick,hashes,`schema step=${index} V=${tick}`);
    }
    for (const [knownAt,snapshot] of snapshots) for (const tick of TICKS)
      await assertQuery(store,snapshot,knownAt,tick,`original-schema K=${knownAt} V=${tick}`);
  } finally {await store.close();}
});
