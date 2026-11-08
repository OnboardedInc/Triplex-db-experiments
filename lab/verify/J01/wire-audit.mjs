// [CX-VJ01] Why: instrument both immutable client sources at the driver boundary, including default-off. Rejected: relying on the new unit test's expected OID as compatibility evidence.
import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const outputs=[];
for(const file of ['lab/verify/J01/baseline/xtdb/XtdbClient.ts','packages/xtdb/src/XtdbClient.ts']){
 const calls=[];
 const connection={unsafe:(sql,params)=>{calls.push({sql,params});return Object.assign(Promise.resolve([]),{cancel:()=>{}});},release:()=>{}};
 globalThis.__CX_VJ01_POSTGRES__=()=>({typed:(value,oid)=>({value,oid}),reserve:async()=>connection,end:async()=>{}});
 const source=fs.readFileSync(file,'utf8').replace('import postgres from "postgres";','const postgres = globalThis.__CX_VJ01_POSTGRES__;');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {makeXtdbClient}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
 const client=makeXtdbClient('postgresql://mock-local');const cases=[];
 for(const input of [['a','b'],[],[1,2],['ok',String.fromCharCode(0xd800)]]){
  try{await client.query('SELECT $1 AS value',[input],undefined,{parameterSyntax:'postgresql'});cases.push({input,lastCall:calls.at(-1)});}
  catch(e){cases.push({input,error:e.message});}
 }
 outputs.push({file,cases});await client.close();
}
assert.equal(outputs[0].cases[0].lastCall.params[0].oid,114);
assert.equal(outputs[1].cases[0].lastCall.params[0].oid,1009);
assert.equal(outputs[0].cases[3].error,undefined);
assert.match(outputs[1].cases[3].error,/well-formed/);
fs.writeFileSync('lab/verify/J01/wire-audit.json',JSON.stringify({environmentEncoding:process.env.TRIPLEX_COMMIT_ENCODING??null,outputs},null,2)+'\n');
console.log('Confirmed unconditional driver parameter type and input rejection changes with compact disabled.');
