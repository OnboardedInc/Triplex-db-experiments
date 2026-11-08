// [CX-VJ01] Why: same native query under immutable main and default-off clients detects unconditional binding changes. Rejected: inference from source alone.
import fs from 'node:fs';
import * as baseline from './baseline/xtdb/XtdbClient.ts';
import * as current from '../../../packages/xtdb/src/XtdbClient.ts';
const out={environmentEncoding:process.env.TRIPLEX_COMMIT_ENCODING??null,cases:[]};
for(const params of [[['a','b']], [[]], [[1,2]], [['𝄞','NULL','a,b','x\\y','line\nend']], [['ok',String.fromCharCode(0xd800)]]]){
 const row={params};
 for(const [name,lib] of [['main',baseline],['candidateDefaultOff',current]]){
  const c=lib.makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
  try{row[name]={echo:await c.query('SELECT $1 AS value',params,undefined,{parameterSyntax:'postgresql',timeoutMs:15000}),any:await c.query("SELECT 'a' = ANY($1) AS hit",params,undefined,{parameterSyntax:'postgresql',timeoutMs:15000})};}
  catch(e){row[name]={error:e.message,code:e.code??null};}finally{await c.close();}
 }
 row.equal=JSON.stringify(row.main)===JSON.stringify(row.candidateDefaultOff);out.cases.push(row);
}
fs.writeFileSync('lab/verify/J01/parameter-regression.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
