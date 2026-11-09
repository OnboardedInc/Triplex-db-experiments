// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// Canonical READ-ONLY context. Deliberately does not import openContext, locked,
// scheduler mutations, fault executor/storage/worker or the operational bridge.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { readState } from '../../qualification/devloop/state.mjs';
import { hashFile, ownedPath, readJson } from '../../qualification/devloop/io.mjs';

const root=process.cwd(), contractPath=resolve(process.argv[2]);
assert(contractPath.startsWith(root+'/'));
const contractBytes=await fs.readFile(contractPath);assert(contractBytes.length<=1048576);
const contract=JSON.parse(contractBytes);
assert.equal(contract.mode,'READ_ONLY_NATIVE_API_PREFLIGHT');
const admission=await readJson(process.env.TRIPLEX_RESOURCE_ADMISSION);
assert.equal(await hashFile(process.env.TRIPLEX_RESOURCE_ADMISSION),process.env.TRIPLEX_RESOURCE_ADMISSION_SHA256);
assert.equal(admission.jobId,contract.jobId);assert.equal(admission.state,'ADMITTED');
assert.equal(admission.resources.memoryBytes,896*1024**2);assert.equal(admission.resources.cpuUnits,1);
const directory=await ownedPath(root,'.devloop');
assert((await fs.stat(join(directory,'state.json'))).size<=2*1024**2);
const marker=await readJson(join(directory,'owner.json'));
assert.equal(marker.test,false);assert.equal(marker.root,root);assert.equal(marker.rootDevice,(await fs.stat(root)).dev);
const state=await readState({root,directory});
const main=state.owners['foundation-qlever'];
const other=Object.values(state.jobs).filter(job=>job.manifest.backend==='qlever'&&['running','granted','cleanup_unknown'].includes(job.status)&&job.manifest.id!==admission.jobId).map(job=>({id:job.manifest.id,status:job.status}));
const context={root,rootDevice:marker.rootDevice,stateOwnerSha256:await hashFile(join(directory,'owner.json')),jobId:admission.jobId,resourceBytes:admission.resources.memoryBytes,cpuUnits:admission.resources.cpuUnits,contractSha256:createHash('sha256').update(contractBytes).digest('hex'),mainOwner:{status:main.status,containerId:main.containerId,imageSha256:main.imageSha256,resources:main.resources,startedAt:main.observation.startedAt},otherActiveQJobs:other};
const result=spawnSync(contract.pythonRuntime.invocation,[join(root,'experiments/qlever-native-fault-preflight-v1/preflight.py'),'--contract',contractPath],{input:JSON.stringify(context),encoding:'utf8',env:process.env,timeout:160000,maxBuffer:262144});
await fs.writeFile(join(process.env.TRIPLEX_RUN_ARTIFACTS,'client-exit.json'),JSON.stringify({code:result.status,signal:result.signal,stdoutBytes:Buffer.byteLength(result.stdout??''),stderrBytes:Buffer.byteLength(result.stderr??''),stdoutSha256:createHash('sha256').update(result.stdout??'').digest('hex'),stderrSha256:createHash('sha256').update(result.stderr??'').digest('hex')})+'\n',{flag:'wx',mode:0o600});
if(result.status!==0)throw new Error('Read-only preflight failed; hashed client exit and partial artifacts retained; no recovery action is attempted');
