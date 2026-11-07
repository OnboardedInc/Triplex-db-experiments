import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
const runtime='__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-native-write-cohort-20261105/runtime/build/native-write-frozen-032-20261105/runtime';
const {NativeEntityStore}=await import(pathToFileURL(runtime+'/build/adapter/native-entity.js').href);
const {DuckDBConnection}=createRequire(runtime+'/build/adapter/native-duckdb-port.mjs')('@duckdb/node-api');
const store=await NativeEntityStore.open({readers:16});
let release;const released=new Promise(resolve=>{release=resolve;});
const original=DuckDBConnection.prototype.stream;
let held=0;const errors=[];
try{
 await store.defineSchema('schema light_baseline version 1 {entity Row {n:int64 required;}}');
 await store.putRecord({schema:'light_baseline',version:1,type:'Row',entityId:'e',commandId:'seed',record:'{n=1;}',validFrom:0n,validTo:9223372036854775807n});
 DuckDBConnection.prototype.stream=async function(...args){
  const result=await original.apply(this,args);
  if(/^PRAGMA td_entity_at_v2\(/.test(args[0])){held++;if(held===16)release();await released;}
  return result;
 };
 const reads=Array.from({length:16},()=>store.at('e',{knownAt:1n,validAt:0n}).catch(error=>{errors.push(error.message);release();throw error;}));
 const results=await Promise.allSettled(reads);
 const report={runtime,profile:{readers:16,memoryLimit:'128MB',operation:'hold16lightPointResults'},heldResults:held,fulfilled:results.filter(result=>result.status==='fulfilled').length,failed:results.filter(result=>result.status==='rejected').length,errors};
 await writeFile('baseline-light-128.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{release();DuckDBConnection.prototype.stream=original;await store.close();}
