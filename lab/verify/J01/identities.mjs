// [CX-VJ01] Why: force a real existing-id collision against each encoding and verify atomic rejection. Rejected: only proving new-id guards succeed with fresh ids.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {Effect} from 'effect';
import * as core from '../../../packages/core/dist/index.js';import * as x from '../../../packages/xtdb/dist/index.js';import * as q from '../../../packages/qlever/dist/index.js';
const disk=Number((await import('node:child_process')).execFileSync('df',['-k','.'],{encoding:'utf8'}).trim().split('\n').at(-1).trim().split(/\s+/)[3])*1024;if(disk<5*1024**3)throw new Error('Refusing live checks below 5 GiB host free');
const out={diskFreeBytes:disk,at:new Date().toISOString(),arms:[]};
for(const lane of ['xtdb','qlever'])for(const encoding of ['a0','compact']){
 const scope='cx-vj01-identity-'+randomUUID(),id='existing-id,"\\\nNULL{}𝄞';
 const inner=lane==='xtdb'?x.makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1}):q.makeQleverClient('http://127.0.0.1:7070');
 const a=lane==='xtdb'?x.makeXtdbStorageAdapter(inner,scope,{commitEncoding:encoding}):q.makeQleverStorageAdapter(inner,scope,{commitEncoding:encoding});
 const arm={lane,encoding,scope};out.arms.push(arm);
 try{
  const input={entityId:core.EntityId.make('verify:identity'),attribute:':verify/identity',value:core.integer('9223372036854775807'),validFrom:0};
  await Effect.runPromise(a.withTransaction(Effect.gen(function*(){const p=yield* a.nextCommitPosition();yield* a.insert(input,'verify:tx',100,id,p);}))); 
  const before=await Effect.runPromise(a.currentCommitPosition());
  const rejected=await Effect.runPromise(a.withTransaction(Effect.gen(function*(){const p=yield* a.nextCommitPosition();yield* a.claimCommand('identity-conflict-command','verify:bad',101);yield* a.insert({...input,value:core.integer('0')},'verify:bad',101,id,p);})).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>e._tag})));
  assert.equal(rejected,'WriteError');assert.equal(await Effect.runPromise(a.currentCommitPosition()),before);
  assert.equal((await Effect.runPromise(a.getById(id))).value_string,'9223372036854775807');
  let claims;
  if(lane==='xtdb')claims=await inner.query('SELECT tx_id FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ? AND command_id = ?',[scope,'identity-conflict-command']);
  else {const graph='<urn:triplex:scope:'+Buffer.from(scope).toString('base64url')+'>';const claim='<urn:triplex:claim:'+Buffer.from('identity-conflict-command').toString('base64url')+'>';claims=await inner.query(`SELECT ?tx WHERE { GRAPH ${graph} { ${claim} <urn:triplex:field:tx_id> ?tx } }`);}
  assert.equal(claims.length,0);arm.passed=true;arm.rejected=rejected;arm.position=before;
 }catch(e){arm.passed=false;arm.error={message:e.message,stack:e.stack};}
 finally{await inner.close();fs.writeFileSync('lab/verify/J01/identities.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(arm));}
}
process.exitCode=out.arms.every(a=>a.passed)?0:1;
