// [CX-VM01R] Why: replay the exact merged-main harness without editing either reviewed source tree. Rejected: moving main (changes the comparator during review).
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../../..');
const role=process.argv[2]??'main';
const base = path.join(import.meta.dirname, 'runtime',role);
const rev = role==='main'?'1a83095c97885e3865c88b3985ecddb036276881':'f45d479a313f2679db892ea8e773f0c6c0a27d76';
const paths = execFileSync('git', ['ls-tree','-r','--name-only',rev,'lab/bench','lab/bin','lab/config','lab/scenarios/lib/policy.mjs','packages/datomic/gateway','packages/datomic/src/codec-spec.json'], {cwd:root,encoding:'utf8'}).trim().split('\n');
for (const p of [...paths,'package.json','xtdb-config.yaml','qlever-start.sh']) {
  const out=path.join(base,p); fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,execFileSync('git',['show',`${rev}:${p}`],{cwd:root,maxBuffer:20*1024*1024}));
}
fs.writeFileSync(path.join(base,'lab/bin/engine-probe.mjs'),fs.readFileSync(path.join(base,'lab/bin/engine.mjs'),'utf8')+'\nexport { runArgs };\n');
// [CX-VM01R] Why: both drivers consume the identical public build produced in this verifier worktree. Rejected: importing another checkout's package source or dist.
fs.mkdirSync(path.join(base,'packages'),{recursive:true});
for(const pkg of fs.readdirSync(path.join(root,'packages'))) {
  const dir=path.join(base,'packages',pkg);fs.mkdirSync(dir,{recursive:true});
  for(const leaf of ['dist','node_modules','package.json']) {
    const target=path.join(root,'packages',pkg,leaf), link=path.join(dir,leaf);
    if(fs.existsSync(target)&&!fs.existsSync(link)) fs.symlinkSync(target,link);
  }
}
if(!fs.existsSync(path.join(base,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(base,'node_modules'));
console.log(JSON.stringify({revision:rev,files:paths.length,base},null,2));
