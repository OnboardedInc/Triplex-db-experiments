// [EXP-K01-VK01-R8] Why: bind fresh tests to exact reviewed inputs and keep bulky case output durable. Rejected: reusing builder receipts, overwriting prior attempts or placing multi-megabyte raw output in git.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const out = path.join(import.meta.dirname, 'evidence/review-round8');
const raw = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round8/attempt-1';
fs.mkdirSync(out,{recursive:true});
if(fs.existsSync(path.join(out,'run.json'))||fs.existsSync(raw))throw Error('preserve prior attempts');
const disk=fs.statfsSync(root);if(disk.bavail*disk.bsize<5*1024**3)throw Error('disk floor');
fs.mkdirSync(raw,{recursive:true});
const files=['lab/verify/K01/run-review-round8.mjs','lab/verify/K01/representation-review.test.mjs','lab/verify/K01/columns-review.test.mjs','lab/verify/K01/g0-review.test.mjs','lab/verify/K01/schema-guard-review.mjs','lab/bench/driver.ts','lab/bench/xtdb-seed.ts','lab/bench/clone-check.ts','lab/bench/lib/bulk.ts','lab/bin/engine.mjs','lab/bin/lib.mjs','lab/bin/test/lab.test.mjs','lab/bench/test/bench.test.ts','lab/bench/test/g0.test.ts','lab/bench/test/g0-schema.test.ts','lab/bench/test/g0-values.test.ts','lab/bench/test/g0-e1.test.ts','pnpm-lock.yaml','node_modules/typescript/lib/typescript.js',...['g0.ts','g0-schema.ts','g0-values.ts','g0-wire.ts','g0-normalize.ts','g0-xtdb.ts'].map(f=>'lab/bench/lib/'+f),...fs.readdirSync(path.join(root,'packages/xtdb/src'),{recursive:true}).filter(f=>f.endsWith('.ts')).map(f=>'packages/xtdb/src/'+f),...['RuntimeServices.ts','TriplesLive.ts','transactionMetadata.ts','systemNamespace.ts'].map(f=>'packages/core/src/store/'+f),'packages/xtdb/node_modules/postgres/src/connection.js','packages/xtdb/node_modules/postgres/src/query.js','packages/xtdb/node_modules/postgres/package.json'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const upstream='/Users/sam/projects/triplex-db-2/references/xtdb/core/src/main/kotlin/xtdb/';
files.push(...['pgwire/PgType.kt','pgwire/PgTypes.kt','arrow/FloatVector.kt','arrow/IntVector.kt','arrow/DenseUnionVector.kt'].map(f=>upstream+f));
const sources=()=>Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.isAbsolute(f)?f:path.join(root,f)))]));
const receipt={at:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),node:process.version,freeBytes:disk.bavail*disk.bsize,raw,sources:sources(),runs:[]};
const commands=[
  ['tests',['--test','lab/bin/test/lab.test.mjs','lab/bench/test/bench.test.ts','lab/bench/test/g0.test.ts','lab/bench/test/g0-schema.test.ts','lab/bench/test/g0-values.test.ts','lab/bench/test/g0-e1.test.ts'],203],
  ['reviewer',['--test','lab/verify/K01/g0-review.test.mjs'],30],
  ['columns',['--test','lab/verify/K01/columns-review.test.mjs'],98],
  ['representation',['--test','lab/verify/K01/representation-review.test.mjs'],57],
  ['schema-guard',['lab/verify/K01/schema-guard-review.mjs']],
  ['types',['node_modules/typescript/bin/tsc','--noEmit','-p','lab/bench/tsconfig.json']],
  ...['lab/bin/engine.mjs','lab/bin/lib.mjs','lab/bench/clone-check.ts',...['g0.ts','g0-schema.ts','g0-values.ts','g0-wire.ts','g0-normalize.ts','g0-xtdb.ts'].map(f=>'lab/bench/lib/'+f)].map((f,i)=>['syntax-'+i,['--check',f]]),
];
for(const[label,args,total]of commands){
  const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,TX2_K01_REVIEW_OUT:path.join(raw,'reviewer'),TX2_K01_COLUMNS_OUT:path.join(raw,'columns'),TX2_K01_REP_OUT:path.join(raw,'representation'),TX2_K01_GUARD_OUT:path.join(raw,'schema-guard')},encoding:'utf8',timeout:120000,maxBuffer:16<<20});
  const log=(r.stdout??'')+(r.stderr??'');fs.writeFileSync(path.join(out,label+'.log'),log);
  const counts=Object.fromEntries([...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)].map(m=>[m[1],Number(m[2])]));
  const summaryOkay=total===undefined||counts.tests===total&&counts.pass===total&&['fail','cancelled','skipped','todo'].every(k=>counts[k]===0);
  receipt.runs.push({label,args,status:r.status,signal:r.signal,error:r.error?.message,sha256:sha(log),...(total===undefined?{}:{counts,summaryOkay})});
  fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(receipt,null,2)+'\n');process.stdout.write(label+': '+r.status+(total===undefined?'':', '+counts.pass+'/'+total)+'\n');
}
receipt.inputsUnchanged=JSON.stringify(sources())===JSON.stringify(receipt.sources);
const rawFiles=fs.readdirSync(raw,{recursive:true}).map(f=>path.join(raw,f)).filter(f=>fs.statSync(f).isFile());
fs.writeFileSync(path.join(out,'SHA256SUMS-RAW'),rawFiles.sort().map(f=>sha(fs.readFileSync(f))+'  '+f+'\n').join(''));
fs.writeFileSync(path.join(out,'RAW-INDEX.md'),'Raw reviewer output is retained at `'+raw+'`. Verify it with `shasum -a 256 -c lab/verify/K01/evidence/review-round8/SHA256SUMS-RAW`. These are offline fixtures, not live engine receipts.\n');
fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(receipt,null,2)+'\n');
process.exitCode=!receipt.inputsUnchanged||receipt.runs.some(r=>r.status!==0||r.signal||r.error||r.summaryOkay===false)?1:0;
