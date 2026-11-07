import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';

const runtime=resolve(process.env.TD_ALL_CUT_RUNTIME??'.');
const manifest=JSON.parse(await readFile(runtime+'/build/artifact.json','utf8'));
const allEnabled=manifest.experimental_all_cut_unique_fast_path===true;
const currentEnabled=manifest.experimental_current_unique_fast_path===true;
const scan="answer(?v) :- triple('one','n',?v).";

test('native patches preserve all-cut uniqueness through revalidation and reopen',async()=>{
  const {NativeEntityStore}=await import(pathToFileURL(runtime+'/build/adapter/native-entity.js').href);
  const database=join(await mkdtemp(resolve(runtime,'build/rectangle-proof-')),'patch.duckdb');
  const options={database,readers:2};
  const historicalReason=allEnabled?'owned_allcut_unique_scalable_single_atom':'owned_scalable_single_atom';
  const store=await NativeEntityStore.open(options);
  try {
    await store.defineSchema('schema patch_cap version 1 {entity Row {n:int64 many;}}');
    const request={schema:'patch_cap',version:1,type:'Row',entityId:'one',validFrom:0n,validTo:10n};
    await store.putRecord({...request,commandId:'first',record:'{n=1;}'});
    await store.revalidate();
    await store.patchRecord({...request,commandId:'middle',record:'{n=2;}',validFrom:2n,validTo:8n});
    for(const revalidate of [false,true]){
      if(revalidate)await store.revalidate();
      for(const knownAt of [0n,1n,2n])for(const validAt of [-1n,0n,2n,7n,8n,10n]){
        const cut={knownAt,validAt};
        const actual=await store.queryScalable(scan,cut);
        const oracle=knownAt===0n||validAt<0n||validAt>=10n?[]:
          [[{tag:'i64',value:knownAt===1n||validAt<2n||validAt>=8n?1n:2n}]];
        assert.deepEqual(actual.rows,oracle);
        assert.equal(actual.reason,historicalReason);
        if(revalidate)assert.deepEqual((await store.query(scan,{...cut,forceNative:true})).rows,oracle);
      }
    }
    const latest=await store.queryScalable(scan,{validAt:3n});
    assert.equal(latest.reason,allEnabled?'owned_allcut_unique_scalable_single_atom':
      currentEnabled?'owned_unique_scalable_single_atom':'owned_scalable_single_atom');
    assert.deepEqual(latest.rows,[[{tag:'i64',value:2n}]]);
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open(options);
  try {
    const before=await reopened.queryScalable(scan,{knownAt:1n,validAt:3n});
    const after=await reopened.queryScalable(scan,{knownAt:2n,validAt:3n});
    assert.equal(before.reason,historicalReason);
    assert.equal(after.reason,historicalReason);
    assert.deepEqual(before.rows,[[{tag:'i64',value:1n}]]);
    assert.deepEqual(after.rows,[[{tag:'i64',value:2n}]]);
  }finally{await reopened.close();}
});

