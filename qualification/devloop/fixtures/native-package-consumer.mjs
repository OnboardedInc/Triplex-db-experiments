// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { Effect } from 'effect';
import { EntityId,Triples,integer } from '@triplex-build/triplex';
import { Attribute,EntityType,TypeExpr } from '@triplex-build/triplex/config';
import { Capabilities,DatabaseScope } from '@triplex-build/triplex/runtime';
import { makeDuckDBRuntime,makeDuckDBClient,makeDuckDBTemporalQueries } from '@triplex-build/triplex-duckdb';
import { makeXtdbRuntime,makeXtdbClient,makeXtdbNativeQueries } from '@triplex-build/triplex-xtdb';
import { makeQleverRuntime,makeQleverClient,makeQleverNativeQueries } from '@triplex-build/triplex-qlever';

// A genuine clean tarball consumer uses schema handles, public writes and typed
// native facades. Inspired by the two native-entry gates; this small independent
// fixture adds the private CPP package's explicit artifact/lifecycle boundary.
const nativeArtifactsDirectory=process.env.TRIPLEX_PACK_NATIVE_ARTIFACTS_DIRECTORY;
assert(nativeArtifactsDirectory&&process.env.XTDB_URL&&process.env.QLEVER_URL&&process.env.QLEVER_ACCESS_TOKEN_FILE);
const accessToken=readFileSync(process.env.QLEVER_ACCESS_TOKEN_FILE,'utf8').trim();
const root=resolve(process.env.TRIPLEX_RUN_DIRECTORY),artifacts=resolve(process.env.TRIPLEX_RUN_ARTIFACTS);
assert(root&&artifacts.startsWith(root+'/'));
const counter=Attribute.int64(':packed/counter'),label=Attribute.text(':packed/label');
const Subject=EntityType.make('PackedSubject',{attributes:{counter:Attribute.use(counter),label:Attribute.use(label)}});
const entity=EntityId.make('packed:subject'),expectedCounter=integer('9223372036854775807');
const contract={name:'packed/native-counter',parameters:TypeExpr.struct({entity:TypeExpr.required(TypeExpr.text)}),row:TypeExpr.struct({counter:TypeExpr.required(TypeExpr.int64)})};
const report={format:'triplex-packed-native-consumer/1',checks:[],traces:[],claim:'Small real public tarball API/cut/value smoke only; no engine or scale promotion'};
const result={};
async function seed(runtime,scope){
  return Effect.runPromise(Effect.gen(function*(){const triples=yield*Triples;
    assert.equal(yield*triples.currentPosition(),0,'Consumer fixture scope must be fresh');
    const receipt=yield*triples.transact([{op:'assert',entityId:entity,entityType:Subject.entityType,...Subject.counter.assertion(expectedCounter),validFrom:1.25,validTo:2.75},{op:'assert',entityId:entity,entityType:Subject.entityType,...Subject.label.assertion('packed'),validFrom:1.25,validTo:2.75}],{commandId:'packed:initial'});
    assert.equal(receipt.position,1);
    const read=yield*triples.queryAll({find:['?counter'],where:[['packed:subject',counter.key,'?counter']]},{basis:{validAt:1.5},includeBasis:true});
    assert.deepEqual(read.results,[{'?counter':expectedCounter}]);assert.equal(read.basis.recordedPosition,receipt.position);assert.equal(read.basis.scope,scope);
    return receipt.position;
  }).pipe(Effect.provide(runtime.layer({scope,capabilities:Capabilities.none})),Effect.scoped));
}
try{
  const duckOptions={databaseDirectory:join(root,'scratch','packed-duck-databases'),nativeArtifactsDirectory,tempDirectory:join(root,'scratch','packed-duck-temporary'),threads:1,memoryLimit:'128MB',maxTempDirectorySize:'64MB',queryTimeoutMs:5000};
  const duckScope=DatabaseScope.test(`packed-duck-${process.env.TRIPLEX_RUN_DIRECTORY.split('/').slice(-3).join('-')}`);
  await seed(await makeDuckDBRuntime(duckOptions),duckScope);
  const duckClient=makeDuckDBClient(duckOptions);
  try{const intervals=await Effect.runPromise(makeDuckDBTemporalQueries(duckClient,duckScope).queryIntervals({find:['?label'],where:[['packed:subject',label.key,'?label']]},{from:1,to:3,timeoutMs:5000}));assert.deepEqual(intervals,[{bindings:{'?label':'packed'},validFrom:1.25,validTo:2.75}]);report.checks.push('duckdb-explicit-artifacts-sdk-int64-fractional-interval-reopen');result.duckdb='PASS_EXPLICIT_CPP_ARTIFACTS_AND_PUBLIC_INTERVAL';}finally{await duckClient.close();}
  for(const backend of ['xtdb','qlever']){
    const scope=DatabaseScope.test(`packed-${backend}-${process.env.TRIPLEX_RUN_DIRECTORY.split('/').slice(-3).join('-')}`);
    await seed(backend==='xtdb'?makeXtdbRuntime({url:process.env.XTDB_URL}):makeQleverRuntime({url:process.env.QLEVER_URL,accessToken}),scope);
    for(let reopen=0;reopen<2;reopen++){
      const client=backend==='xtdb'?makeXtdbClient(process.env.XTDB_URL):makeQleverClient(process.env.QLEVER_URL,{accessToken});
      try{const native=backend==='xtdb'?makeXtdbNativeQueries(client,scope):makeQleverNativeQueries(client,scope);
        const answer=await Effect.runPromise(native.select(contract,{entity},(ctx,input)=>backend==='xtdb'?`(-> ${ctx.facts()} (where (= entity_id ${ctx.bind(input.entity)}) (= attribute ${ctx.attribute(Subject.counter)})) (return {:counter value_string}))`:`SELECT ?counter WHERE { ${ctx.fact(input.entity,Subject.counter,'?counter')} }`,{basis:{recordedPosition:1,validAt:1.5},timeoutMs:5000,maxRows:2}));
        assert.deepEqual(answer.rows,[{counter:expectedCounter}]);assert.equal(answer.basis.recordedPosition,1);assert.equal(answer.basis.scope,scope);report.traces.push({backend,reopen,...answer.trace});
      }finally{await client.close();}
    }
    report.checks.push(`${backend}-native-schema-helper-exact-int64-shared-write-current-reopen`);result[backend]='PASS_PACKED_NATIVE_FACADE_CURRENT_REOPEN';
  }
  writeFileSync(join(artifacts,'native-consumer-result.json'),JSON.stringify(result)+'\n');
}finally{writeFileSync(join(artifacts,'native-consumer-report.json'),JSON.stringify(report,null,2)+'\n');}
