/** Independent component rejection tests; this never qualifies an engine. */
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {checkReadOracle,checkComparisonInputs,checkIntegrationInputs,executionResourceIdentity} from '../devloop/compare.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const checks=[];
function refuses(name,code,work){assert.throws(work,error=>error.code===code);checks.push({name,expectedCode:code,status:'PASS'});}
const basis={knownPosition:'17',validAt:'10.25'},paramsSha256=hash('{"entity":"two"}'),actual='{"answer":"two"}';
const catalog={entries:{independent:{taskClass:'point',logicalTaskId:'point/two',paramsSha256,basis,expectedSha256:hash(actual)}}};
const event={oracleKey:'independent',taskClass:'point',logicalTaskId:'point/two',paramsSha256,basis,knownPosition:'17',resultJson:actual,resultSha256:hash(actual)};
checkReadOracle(catalog,event);checks.push({name:'retained actual bytes match the independent catalog',status:'PASS'});
refuses('changed retained bytes with copied accepted digest','RESULT_BYTES',()=>checkReadOracle(catalog,{...event,resultJson:'{"answer":"wrong"}'}));
refuses('self-consistent wrong body and wrong digest','READ_ORACLE',()=>checkReadOracle(catalog,{...event,resultJson:'{"answer":"wrong"}',resultSha256:hash('{"answer":"wrong"}')}));
const pin=(name,role,version)=>({path:name,role,sha256:hash(version)});
const control={inputs:[pin('engine.ts','source','one'),pin('engine.js','build','one'),pin('load.mjs','runner','stable'),pin('dependency.tgz','dependency','stable'),pin('answer.json','oracle','stable')]};
const candidate={inputs:control.inputs.map(x=>x.role==='source'||x.role==='build'?{...x,sha256:hash('two')}:x)};
checkComparisonInputs(control,candidate);checks.push({name:'candidate implementation can change while measurement inputs stay fixed',status:'PASS'});
for(const role of ['runner','dependency','oracle'])refuses(`changed ${role} input cannot masquerade as an implementation candidate`,'COMPARISON_INPUTS',()=>checkComparisonInputs(control,{inputs:candidate.inputs.map(x=>x.role===role?{...x,sha256:hash('changed')}:x)}));
checkIntegrationInputs(candidate,{inputs:[...candidate.inputs,pin('independent-check.mjs','runner','verifier')]});
refuses('integration missing the exact candidate build','INTEGRATION_IDENTITY',()=>checkIntegrationInputs(candidate,{inputs:candidate.inputs.filter(x=>x.role!=='build')}));
refuses('integration changes an input role while copying its hash','INTEGRATION_IDENTITY',()=>checkIntegrationInputs(candidate,{inputs:candidate.inputs.map(x=>x.role==='oracle'?{...x,role:'source'}:x)}));
const manifest={resources:{memoryBytes:1024,cpuUnits:1,diskBytes:1024,heavy:true},requiredOwners:['foundation-qlever']};
const admission={residentOwners:{q:{id:'foundation-qlever',kind:'docker',backend:'qlever',status:'active',containerId:'owned-cid',imageSha256:'sha256-owned-image',resources:{memoryBytes:2048,cpuUnits:1.5}}},cohort:[{queryPath:'xtdb-native',resources:{memoryBytes:512,cpuUnits:1}}],controllerInvocation:{execArgv:['--max-old-space-size=256'],nodeOptions:null}};
const identity=executionResourceIdentity(manifest,admission);
for(const [name,mutate] of [
  ['resident memory cap',x=>x.residentOwners.q.resources.memoryBytes++],
  ['actual container identity',x=>x.residentOwners.q.containerId='different-cid'],
  ['admitted co-runner resource vector',x=>x.cohort[0].resources.cpuUnits++],
  ['outer controller V8 flags',x=>x.controllerInvocation.execArgv=['--max-old-space-size=384']],
]){const other=structuredClone(admission);mutate(other);assert.notEqual(executionResourceIdentity(manifest,other),identity);checks.push({name:`resource identity changes with ${name}`,status:'PASS'});}
const output=path.join(root,'.artifacts/comparison-hardening-independent',randomUUID());await mkdir(output,{recursive:true});
const report={format:'triplex-independent-comparison-component-review/1',at:new Date().toISOString(),reviewer:'qlever-agent',source:{path:'qualification/devloop/compare.mjs',sha256:hash(await readFile(path.join(root,'qualification/devloop/compare.mjs')))},checks,status:'PASS_COMPONENT_REJECTION_GUARDS',meaning:'Direct actual guard calls; these component data do not claim a load run, engine qualification, calibration, or promotion.'};
await writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,checks:checks.length,status:report.status}));
