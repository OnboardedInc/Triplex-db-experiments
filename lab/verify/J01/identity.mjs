// [CX-VJ01] Why: bind review executions to exact source/build/dependency and resident-owner bytes. Rejected: trusting a historical build digest.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');const phase=process.argv[2];const files={};
for(const dir of ['packages/core/src','packages/xtdb/src','packages/qlever/src','packages/core/dist','packages/xtdb/dist','packages/qlever/dist']){
 if(!fs.existsSync(dir))continue;
 for(const file of fs.readdirSync(dir,{recursive:true}).sort()){
  const p=path.join(dir,file);if(fs.statSync(p).isFile()&&/\.(ts|js)$/.test(p))files[p]=sha(fs.readFileSync(p));
 }
}
for(const name of fs.readdirSync('lab/verify/J01').filter(x=>/\.(mjs|py|sh)$/.test(x))){const p='lab/verify/J01/'+name;files[p]=sha(fs.readFileSync(p));}
for(const p of ['pnpm-lock.yaml','lab/config/slots.json'])files[p]=sha(fs.readFileSync(p));
const owners={};for(const lane of ['xtdb','qlever']){const p=`/Users/sam/projects/triplex-db-2/lab/locks/${lane}-dev/owner.json`;owners[lane]={path:p,sha256:sha(fs.readFileSync(p)),owner:JSON.parse(fs.readFileSync(p))};}
const result={phase,at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline:JSON.parse(fs.readFileSync('lab/verify/J01/baseline.json')),node:process.version,files,owners,encodingEnvironment:process.env.TRIPLEX_COMMIT_ENCODING??null,disk:execFileSync('df',['-k','.'],{encoding:'utf8'}).trim()};
fs.writeFileSync(`lab/verify/J01/identity-${phase}.json`,JSON.stringify(result,null,2)+'\n');
