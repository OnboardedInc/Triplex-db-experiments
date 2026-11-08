// [CX-VJ01] Why: immutable Git baseline preimages allow same-input differential review. Rejected: main checkout dist (mutable and not source-bound).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const base = 'ab31bebc54bf11a8fba82bb5a9a2c0a7198d6127';
for (const pkg of ['xtdb', 'qlever']) {
 const files=execFileSync('git',['ls-tree','-r','--name-only',base,`packages/${pkg}/src`],{encoding:'utf8'}).trim().split('\n');
 for(const file of files){const dest=`lab/verify/J01/baseline/${pkg}/${file.split('/src/')[1]}`;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,execFileSync('git',['show',`${base}:${file}`]));}
 const nm=path.resolve(`packages/${pkg}/node_modules`); if (!fs.existsSync(`lab/verify/J01/baseline/${pkg}/node_modules`)) fs.symlinkSync(nm,`lab/verify/J01/baseline/${pkg}/node_modules`,'dir');
}
fs.writeFileSync('lab/verify/J01/baseline.json',JSON.stringify({baseline:base,candidate:execFileSync('git',['rev-parse','5cc42fb'],{encoding:'utf8'}).trim()},null,2)+'\n');
