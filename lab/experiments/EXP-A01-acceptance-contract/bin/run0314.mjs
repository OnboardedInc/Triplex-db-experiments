// [CX-A01-0314] Why: preserve fresh command output bound to the exact committed and working bytes.
// Rejected: generating PASS from exit zero (semantic assertions and separate review remain required).
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error('usage: run.mjs label command...');
const base = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-A01-0314';
const dir = path.join(base, `${label}-${randomUUID()}`); fs.mkdirSync(dir, {recursive:true});
const sha = b => createHash('sha256').update(b).digest('hex');
const inputs = () => Object.fromEntries(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'packages', 'test/integration', 'lab/bin', 'lab/acceptance', 'lab/verify/P2Q/tests', 'lab/verify/P2Q/types', 'lab/verify/SQL01', 'lab/experiments/EXP-A01-acceptance-contract/bin', 'lab/experiments/EXP-A01-acceptance-contract/regressions', 'pnpm-lock.yaml', 'vitest.workspace-aliases.ts'], {encoding:'utf8'}).trim().split('\n').filter(f => !f.includes('/evidence') && !f.endsWith('/_negtest_tmp.py') && fs.existsSync(f) && fs.statSync(f).isFile()).sort().map(f => [f, sha(fs.readFileSync(f))]));
const before=inputs();
const receipt={label,command,dir,start:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,inputs:before,disk:execFileSync('df',['-k','.'],{encoding:'utf8'}),slot:process.env.QLEVER_URL ?? null};
if(Number(receipt.disk.trim().split('\n').at(-1).trim().split(/\s+/)[3])*1024 < 5*1024**3) throw Error('disk below 5 GiB');
const fd=fs.openSync(path.join(dir,'command.log'),'wx');
const env={...process.env,V_P2Q_OUT:path.join(dir,'p2q'),SQL01_ATTEMPT:label};
const child=spawn(command[0],command.slice(1),{env,stdio:['ignore',fd,fd]});
const result=await new Promise(resolve=>{child.on('error',e=>resolve({error:String(e)}));child.on('close',(code,signal)=>resolve({code,signal}));});
fs.closeSync(fd);
Object.assign(receipt,{end:new Date().toISOString(),result,sourceStillMatches:JSON.stringify(before)===JSON.stringify(inputs()),logSha256:sha(fs.readFileSync(path.join(dir,'command.log')))});
fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({label,dir,result,sourceStillMatches:receipt.sourceStillMatches}));
process.exitCode=result.code ?? 1;
