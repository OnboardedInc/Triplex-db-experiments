// [EXP-K01-VK01-R12] Why: regenerate the public exports from the exact reviewer sources before exercising the writer spy. Rejected: borrowing builder outputs without a local source/build binding.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const d=fs.statfsSync('.');if(d.bavail*d.bsize<5*1024**3)throw Error('disk floor');
const runs=[];
for(const [pkg,args] of [['core',['../../node_modules/.bin/tsdown']],['xtdb',['../../node_modules/.bin/tsdown']],['xtdb-types',['node','../../node_modules/typescript/bin/tsc','--declaration','--emitDeclarationOnly','--rootDir','src','--outDir','dist']],['qualification',['../../node_modules/.bin/tsdown']],['qualification-types',['node','../../node_modules/typescript/bin/tsc','--declaration','--emitDeclarationOnly','--rootDir','src','--outDir','dist']]]){
 const cwd='packages/'+pkg.replace('-types','');
 const r=spawnSync(args[0],args.slice(1),{cwd,encoding:'utf8',timeout:120000,maxBuffer:16<<20});
 fs.writeFileSync('lab/verify/K01/evidence/review-round12/build-'+pkg+'.log',(r.stdout??'')+(r.stderr??''));runs.push({pkg,args,cwd,status:r.status,signal:r.signal,error:r.error?.message});
 fs.writeFileSync('lab/verify/K01/evidence/review-round12/build.json',JSON.stringify(runs,null,2)+'\n');
 if(r.status!==0||r.signal||r.error)process.exit(1);
}
