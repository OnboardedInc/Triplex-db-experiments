import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {DuckDBConnection} from '@duckdb/node-api';
import {Effect} from 'effect';
import {EntityId,Triples} from '@triplex-build/triplex';
import {Capabilities,DatabaseScope} from '@triplex-build/triplex/runtime';
import {makeDuckDBRuntime} from './index.js';
import {PublicDuckDBBackend} from './public-backend.mjs';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

const firstAttribute="dépendency:'one";
const secondAttribute='dependency:🙂:two';
const scope=DatabaseScope.test('native-dependency-state');
const input=(attribute:string,validFrom:number,validTo:number)=>({
  entityId:EntityId.make('example'),attribute,validFrom,validTo,value:{type:'number' as const,value:1},
});

test('the production Triplex factory invokes the native dependency projection',async t=>{
  const observed:string[]=[];
  const prepare=DuckDBConnection.prototype.prepare;
  t.mock.method(DuckDBConnection.prototype,'prepare',function(this:DuckDBConnection,sql:string){
    if(sql.includes('td_triplex_dependency_entry_v1'))observed.push(sql);
    return prepare.call(this,sql);
  });
  const runtime=await makeDuckDBRuntime();
  const work=Effect.gen(function*(){
    const triples=yield* Triples;
    const inserted=yield* triples.transact([{op:'assert',...input(firstAttribute,8.25,12.75)}]);
    assert.deepEqual(yield* triples.dependencyState([firstAttribute,firstAttribute],{validAt:4.5}),
      {sourcePosition:inserted.position,nextTemporalBoundary:8.25});
    assert.deepEqual(yield* triples.dependencyState([firstAttribute],{validAt:8.25}),
      {sourcePosition:inserted.position,nextTemporalBoundary:12.75});
    const deleted=yield* triples.transact([{op:'retract',id:inserted.triples[0]!.id}]);
    assert.deepEqual(yield* triples.dependencyState([firstAttribute],{validAt:4.5}),{sourcePosition:deleted.position});
  });
  await Effect.runPromise(Effect.provide(work,runtime.layer({scope,capabilities:Capabilities.none})));
  assert.equal(observed.length,1,'one prepared direct query reused for all three reads');
  assert.match(observed[0]!,/max\(contribution\.source_position\).*min\(contribution\.next_boundary\)/);
  assert.ok(!observed[0]!.includes(firstAttribute),'attributes use bound parameters');
});

test('dependency projection preserves dual selectors, fractional edges and caller rollback',async()=>{
  const port=await NativeDuckDBPort.open();
  const backend=new PublicDuckDBBackend(port,scope);
  try{
    await backend.initialize(await readFile(new URL('./public-schema.sql',import.meta.url),'utf8'));
    await backend.withTransaction(async session=>{
      assert.equal(await session.nextCommitPosition(),1);
      await session.insert(input(firstAttribute,1.25,9.75),'tx-one',10.25,'one',1);
      assert.equal(await session.nextCommitPosition(),2);
      await session.insert(input(secondAttribute,12.25,20.5),'tx-two',20.5,'two',2);
      assert.equal(await session.nextCommitPosition(),3);
      await session.insert(input('unrelated',2.5,3.5),'tx-three',22.75,'three',3);
      assert.equal(await session.nextCommitPosition(),4);
      assert.equal(await session.retract('one',25.5,'tx-four',4),true);
    });
    const attributes=[firstAttribute,secondAttribute,firstAttribute];
    await backend.read(async session=>{
      for(const [basis,expected] of [
        [{validAt:4.5},{sourcePosition:4,nextTemporalBoundary:12.25}],
        [{validAt:1.25,recordedAt:10.249},{sourcePosition:0}],
        [{validAt:1.25,recordedAt:10.25},{sourcePosition:1,nextTemporalBoundary:9.75}],
        [{validAt:9.75,recordedPosition:2},{sourcePosition:2,nextTemporalBoundary:12.25}],
        [{validAt:4.5,recordedAt:25.499,recordedPosition:4},{sourcePosition:2,nextTemporalBoundary:9.75}],
        [{validAt:4.5,recordedAt:25.5,recordedPosition:3},{sourcePosition:2,nextTemporalBoundary:9.75}],
        [{validAt:4.5,recordedAt:25.5,recordedPosition:4},{sourcePosition:4,nextTemporalBoundary:12.25}],
        [{validAt:4.5,recordedAt:10.25,recordedPosition:0},{sourcePosition:0}],
      ] as const)assert.deepEqual(await session.dependencyState(attributes,basis),expected);
      assert.deepEqual(await session.dependencyState([firstAttribute],{validAt:4.5}),{sourcePosition:4});
      assert.deepEqual(await session.dependencyState([secondAttribute],{validAt:20.5}),{sourcePosition:2});
      assert.deepEqual(await session.dependencyState([],{validAt:4.5}),{sourcePosition:0});
      assert.deepEqual(await session.dependencyState(['missing'],{validAt:4.5}),{sourcePosition:0});
    });

    // At the parameter ceiling the selected attributes span both chunks.
    const wide=[secondAttribute,...Array.from({length:1022},(_,index)=>'missing-'+index),firstAttribute];
    const before=port.trace().at(-1)?.id??0;
    assert.deepEqual(await backend.read(session=>session.dependencyState(wide,{validAt:4.5})),
      {sourcePosition:4,nextTemporalBoundary:12.25});
    const returned=port.trace().filter(event=>event.id>before&&event.name==='public_dependency_state');
    assert.deepEqual(returned.map(event=>event.rows),[1,1]);
    await assert.rejects(backend.read(session=>session.dependencyState([...wide,'over'],{validAt:4.5})),
      error=>error instanceof Error&&error.cause instanceof Error&&/Too many distinct dependency attributes/.test(error.cause.message));

    await assert.rejects(backend.withTransaction(async session=>{
      const position=await session.nextCommitPosition();
      assert.equal(position,5);
      await session.insert(input(secondAttribute,2.5,3.5),'rollback',30.125,'rollback',position);
      assert.deepEqual(await session.dependencyState(attributes,{validAt:0,recordedAt:30.125,recordedPosition:5}),
        {sourcePosition:5,nextTemporalBoundary:2.5});
      throw new Error('roll back dependency fixture');
    }),error=>error instanceof Error&&error.cause instanceof Error&&/roll back dependency fixture/.test(error.cause.message));
    assert.deepEqual(await backend.read(session=>session.dependencyState(attributes,{validAt:0})),
      {sourcePosition:4,nextTemporalBoundary:12.25});
    assert.equal(await backend.read(session=>session.currentCommitPosition()),4);
  }finally{await backend.close();}
});
