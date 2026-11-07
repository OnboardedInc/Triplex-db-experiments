import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import type {TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';

/** Test-only pre-dispatch faults; the original port still classifies the error. */
export function nativeWriterRunFault(t:TestContext,select:(sql:string)=>boolean,failures:readonly Error[]){
  const require=createRequire(import.meta.url);
  const path=require.resolve(fileURLToPath(new URL('../owner_probe/temporal_writer.node',import.meta.url)));
  const actual=require(path) as object;
  const cached=require.cache[path];assert.ok(cached);
  const original=cached.exports;
  const run=Reflect.get(actual,'run') as (...args:unknown[])=>unknown;
  assert.equal(typeof run,'function');
  const facade=Object.create(Object.getPrototypeOf(actual)) as object;
  let consumed=0;
  for(const key of Reflect.ownKeys(actual)){
    const descriptor=Object.getOwnPropertyDescriptor(actual,key);assert.ok(descriptor);
    // NAPI's exports are read-only/non-configurable. Choose the wrapper before
    // defining its copied descriptor on a plain object; never mutate the addon.
    if(key==='run')descriptor.value=function(...args:unknown[]){
      if(consumed<failures.length&&typeof args[1]==='string'&&select(args[1]))
        return Promise.reject(failures[consumed++]);
      return Reflect.apply(run,actual,args);
    };
    Object.defineProperty(facade,key,descriptor);
  }
  cached.exports=facade;
  // Register before callers open a store, so factory/body/close failures all
  // restore the exact cache entry. Every other export delegates unchanged.
  t.after(()=>{cached.exports=original;});
  return {consumed:()=>consumed};
}
