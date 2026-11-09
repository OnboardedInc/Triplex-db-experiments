// [EXP-RQ01-QA3] Why: prove the exact negative expectation stays active and fails specifically when D-C1 disappears.
// Rejected: accepting any nonzero exit as proof of the assertion guard.
import fs from 'node:fs';
import { spawnSync,execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const mode=process.argv[2];
if(!['original','repair'].includes(mode))throw Error('original|repair required');
const base='lab/verify/RQ01/round3';const dir=`${base}/guard-${mode}`;
fs.mkdirSync(dir,{recursive:false});
const source=fs.readFileSync('packages/testkit/test/route-equivalence.test.ts','utf8');
const start=source.indexOf('  it("known-failing Q89a / R31 D-C1:');
const end=source.indexOf('  it("canonicalizes',start);
if(start<0||end<0)throw Error('D-C1 boundaries changed');
let body=source.slice(start,end);
if(mode==='repair'){
 if((body.match(/instant: 1000,/g)??[]).length!==1)throw Error('Unexpected fixture body');
 body=body.replace('instant: 1000,','instant: 1002,');
}
const contents=`import {expect,it} from 'vitest';\nimport {runRouteEquivalence,routeRow,type RouteHistory} from '../../../../../packages/testkit/src/route-equivalence.js';\nimport {makeOfflineRouteFixture} from '../../../../../packages/testkit/src/offline-route-fixtures.js';\n${body}`;
fs.writeFileSync(`${dir}/case.probe.ts`,contents);
const started=Date.now();
const command=['node','/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs','run','--configLoader','runner','--config',`${base}/guard.config.mjs`,'--reporter=json',`--outputFile=${dir}/tests.json`];
const child=spawnSync(command[0],command.slice(1),{env:{...process.env,VRQ01_GUARD:mode},encoding:'utf8'});
fs.writeFileSync(`${dir}/command.log`,`${child.stdout??''}${child.stderr??''}${child.error??''}`);
const json=fs.existsSync(`${dir}/tests.json`)?JSON.parse(fs.readFileSync(`${dir}/tests.json`,'utf8')):null;
const assertions=json?.testResults.flatMap(s=>s.assertionResults)??[];
const exactFailure=mode!=='repair'||assertions.some(t=>t.failureMessages.some(m=>m.includes('expected 0 to be greater than 0')));
const content=json?.numTotalTests===1&&json.numPendingTests===0&&json.numTodoTests===0&&assertions.length===1&&assertions[0].title.startsWith('known-failing Q89a / R31 D-C1:')&&(mode==='original'?json.numPassedTests===1:json.numFailedTests===1&&exactFailure);
const fresh=json?.startTime>=started;
const binding=source===fs.readFileSync('packages/testkit/test/route-equivalence.test.ts','utf8');
const matched=child.status===(mode==='original'?0:1)&&content&&fresh&&binding;
const sha=s=>createHash('sha256').update(s).digest('hex');
const receipt={mode,at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),slot:'offline/no engine; CX-VRQ01-round3-guard',command,status:child.status,sourceSha256:sha(source),controllerSha256:sha(fs.readFileSync(import.meta.filename)),derivedProbeSha256:sha(contents),transformation:mode==='original'?'imports only':'imports and sole extension instant 1000 -> 1002',content,fresh,binding,exactFailure,matched};
fs.writeFileSync(`${dir}/receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));process.exitCode=matched?0:1;
