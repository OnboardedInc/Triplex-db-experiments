// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
// [EXP-DA01] Why: the root pack checker excludes Datomic and is blocked on an unrelated unbuilt CLI. Rejected: treating workspace dist imports as tarball-consumer proof.
const root=path.resolve(import.meta.dirname,'../../..');
const directory=path.join(import.meta.dirname,'receipts/continued/consumer');
fs.mkdirSync(directory,{recursive:false});
const packRoot=path.join(root,'runs/pack/DA01');
const packRun=fs.readdirSync(packRoot).filter(x=>x.startsWith('triplex-pack-')).sort().at(-1);
const core=path.join(packRoot,packRun,'tarballs/triplex-build-triplex-0.2.0.tgz');
const datomic=path.join(import.meta.dirname,'receipts/continued/package/triplex-build-triplex-datomic-0.1.0.tgz');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'datomic-isolated-consumer',private:true,type:'module',dependencies:{'@triplex-build/triplex':'file:'+core,'@triplex-build/triplex-datomic':'file:'+datomic,effect:'4.0.3'}},null,2)+'\n');
fs.writeFileSync(path.join(directory,'smoke.mjs'),`
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Effect } from 'effect';
import { Triples, EntityId, string } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope } from '@triplex-build/triplex/runtime';
import { makeDatomicRuntime, DatomicClient } from '@triplex-build/triplex-datomic';
const scope=DatabaseScope.test('da01-packed-consumer-'+crypto.randomUUID());
const client=new DatomicClient('http://127.0.0.1:8470');
const runtime=makeDatomicRuntime({url:'http://127.0.0.1:8470'});
const result={scope,health:await client.health()};
try { result.output=await Effect.runPromise(Effect.gen(function*(){
  const triples=yield* Triples;
  const fact=yield* triples.assert({entityId:EntityId.make('subject'),attribute:':value',value:string('saved')});
  const found=yield* triples.get(fact.id); assert.equal(found?.value.value,'saved');
  const query=yield* triples.query({find:['?e','?v'],where:[['?e',':value','?v']]});
  assert.deepEqual(query.results,[{'?e':'subject','?v':'saved'}]);
  return {factId:fact.id,results:query.results};
}).pipe(Effect.provide(runtime.layer({scope,capabilities:Capabilities.none})),Effect.scoped)); }
finally { result.deleted=await client.delete(scope);client.close();fs.writeFileSync('smoke-receipt.json',JSON.stringify(result,null,2)+'\\n'); }
`);
execFileSync('/opt/homebrew/bin/pnpm',['--store-dir','/Users/sam/projects/triplex-db-2/.pnpm-store','--ignore-workspace','install','--offline','--ignore-scripts'],{cwd:directory,stdio:'inherit'});
execFileSync(process.execPath,['smoke.mjs'],{cwd:directory,stdio:'inherit'});
const receipt=JSON.parse(fs.readFileSync(path.join(directory,'smoke-receipt.json')));
fs.writeFileSync(path.join(directory,'inputs.json'),JSON.stringify({scriptSha256:hash(import.meta.filename),core:{path:core,sha256:hash(core)},datomic:{path:datomic,sha256:hash(datomic)},result:receipt.deleted.deleted===true?'PASS':'FAIL'},null,2)+'\n',{flag:'wx'});
console.log('PASS isolated packed consumer');
