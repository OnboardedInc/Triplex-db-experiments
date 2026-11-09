// [EXP-CRNS-R4] Why: audit the current required assertions and print their refusals, retaining positive controls. Rejected: reusing the review's old copied fixtures.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
for(const name of ['forgeries.test.mjs','forgeries-round2.test.mjs','forgeries-round3.test.mjs']) {
 const source=fs.readFileSync(path.join(root,'lab/verify/CRNS-opus',name),'utf8');
 console.log(name,createHash('sha256').update(source).digest('hex'));
 const harness=`let observations=[];const rows=[];const test=(name,opts,fn)=>{if(typeof opts==='function')fn=opts;observations=[];try{fn();rows.push([name,'ok',observations]);}catch(error){rows.push([name,'FAIL',error.message]);}};`;
 const code=source.replace("import test from 'node:test';",harness).replace('return recomputeNS(bundle, { ...trusted, headSha256: head });',"const r=recomputeNS(bundle, { ...trusted, headSha256: head });observations.push({status:r.status,reasons:r.reasons,bars:r.bars});return r;")+'\nfor(const row of rows)console.log(JSON.stringify(row));if(rows.some(r=>r[1]===\'FAIL\'))process.exitCode=1;';
 const r=spawnSync(process.execPath,['--input-type=module','-'],{input:code,cwd:path.join(root,'lab/verify/CRNS-opus'),encoding:'utf8',maxBuffer:4*1024*1024});
 process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');
 if(r.status!==0)process.exitCode=1;
}
