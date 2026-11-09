import './disk-guard.mjs';
import {base,subject} from './hook.mjs';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// [CX-VFD01-R3] Why: run concrete crash, clock and bench regressions on the target preimages.
// Rejected: converting the builder's historic G0 into fresh reviewer evidence.
const hook=fileURLToPath(new URL('./hook.mjs',import.meta.url));
const local=import.meta.dirname;
const env={...process.env,NODE_OPTIONS:'--import='+hook,FD01_CRASH_EVIDENCE:base+'/baseline-crashes.json'};
const steps=[
  ['host',process.execPath,['/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs','run','--configLoader','native','--config',local+'/vitest.config.mjs','--reporter=json','--outputFile='+base+'/baseline-host.json']],
  ['bench',process.execPath,['--test',subject+'/lab/bench/test/bench.test.ts']],
];
const result={head:JSON.parse(fs.readFileSync(base+'/source.json')).head,slot:null,engines:false,steps:[]};
for(const [name,cmd,args] of steps){const out=spawnSync(cmd,args,{encoding:'utf8',env,maxBuffer:16*1024*1024});fs.writeFileSync(base+'/baseline-'+name+'.log',out.stdout+'\n'+out.stderr);result.steps.push({name,status:out.status,cmd,args});fs.writeFileSync(base+'/baseline.json',JSON.stringify(result,null,2));assert.equal(out.status,0,out.stderr);}
const r=JSON.parse(fs.readFileSync(base+'/baseline-host.json'));assert.equal(r.numPassedTests,14);assert.equal(r.numFailedTests,0);
console.log(JSON.stringify(result,null,2));
