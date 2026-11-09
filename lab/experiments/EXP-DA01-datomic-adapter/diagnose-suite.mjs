import fs from 'node:fs';
import crypto from 'node:crypto';
import { Effect, Exit } from 'effect';
import { Capabilities, DatabaseScope } from '../../../packages/core/dist/runtime/index.js';
import { triplesConformanceCases } from '../../../packages/testkit/dist/index.js';
import { DatomicClient, makeDatomicRuntime } from '../../../packages/datomic/dist/index.js';
// [EXP-DA01] Why: preserve the failing case within the unchanged shared-scope suite. Rejected: treating 88 isolated passes as complete-suite acceptance.
const scope=DatabaseScope.test('da01-suite-diagnostic-'+crypto.randomUUID());
const entries=[];
const program=Effect.forEach(triplesConformanceCases, c=>Effect.gen(function*(){const started=Date.now();const exit=yield* Effect.exit(c.run);const entry={name:c.name,elapsedMs:Date.now()-started,status:Exit.isSuccess(exit)?'PASS':'FAIL',...(Exit.isFailure(exit)?{cause:String(exit.cause)}:{})}; entries.push(entry); console.log(JSON.stringify(entry)); if(Exit.isFailure(exit)) return yield* Effect.failCause(exit.cause);}),{discard:true});
const runtime=makeDatomicRuntime({url:'http://127.0.0.1:8470'});
const result=await Effect.runPromiseExit(program.pipe(Effect.provide(runtime.layer({scope,capabilities:Capabilities.none})),Effect.scoped));
const client=new DatomicClient('http://127.0.0.1:8470');
const deleted=await client.delete(scope);client.close();
fs.writeFileSync(new URL('./receipts/continued/suite-diagnostic.json',import.meta.url),JSON.stringify({scope,scriptSha256:crypto.createHash('sha256').update(fs.readFileSync(import.meta.filename)).digest('hex'),entries,result:Exit.isSuccess(result)?'PASS':String(result.cause),deleted},null,2)+'\n',{flag:'wx'});
if(Exit.isFailure(result))process.exitCode=1;
