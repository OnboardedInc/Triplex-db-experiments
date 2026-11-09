import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
// [EXP-DA01] Why: bind delivered evidence bytes while excluding task dependency caches. Rejected: committing node_modules or rewriting canonical gate receipts.
const root=path.resolve(import.meta.dirname,'../../..');
const target=path.join(import.meta.dirname,'receipts/continued/final/FILES.json');
const summary=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'receipts/continued/final/SUMMARY.json')));
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','lab/experiments/EXP-DA01','lab/experiments/EXP-DA01-datomic-adapter'],{cwd:root,encoding:'utf8'}).trim().split('\n');
paths.push(...summary.gates.map(r=>`lab/runs/${r.runId.split('-')[0]}/${r.runId}.json`));
const entries=[...new Set(paths)].filter(Boolean).filter(p=>path.resolve(root,p)!==target).sort().map(p=>{
 if(/\/(node_modules|pnpm-cache|pnpm-state)\//.test(p))throw new Error('Cache entered receipt manifest');
 const bytes=fs.readFileSync(path.join(root,p));return {path:p,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
fs.writeFileSync(target,JSON.stringify({format:'tx2-da01-evidence-files/1',implementationHead:summary.implementationHead,at:new Date().toISOString(),entries},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:entries.length,bytes:entries.reduce((n,r)=>n+r.bytes,0)}));
