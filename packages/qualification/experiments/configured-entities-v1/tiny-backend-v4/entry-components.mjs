// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Four offline fixture-metadata controls, no worker/SDK/driver import. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT,verifyAdmission,exclusiveJson } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
const admission=await verifyAdmission(ROOT,{backend:'xtdb',jobId:'configured-entity-entry-binding-components-v3'});
assert.equal(admission.job.manifest.requiredOwners.length,0);
const result=spawnSync(process.execPath,['--max-old-space-size=256','--test','--test-isolation=none','--test-concurrency=1','--test-reporter=tap',path.join(import.meta.dirname,'codec-schema.test.mjs'),path.join(import.meta.dirname,'entry.test.mjs'),path.join(import.meta.dirname,'required-evidence.test.mjs')],{
  cwd:ROOT,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=256'},encoding:'utf8',timeout:60000,maxBuffer:2*1024**2});
await writeFile(path.join(admission.artifacts,'codec.tap'),result.stdout??'',{flag:'wx',mode:0o600});
await writeFile(path.join(admission.artifacts,'codec.stderr'),result.stderr??'',{flag:'wx',mode:0o600});
await exclusiveJson(ROOT,path.join(admission.artifacts,'child-outcome.json'),{status:result.status,signal:result.signal});
assert.equal(result.status,0);assert.equal(result.signal,null);
for(const expression of [/# tests 10\n/,/# pass 10\n/,/# fail 0\n/,/# skipped 0\n/])assert.match(result.stdout,expression);
await exclusiveJson(ROOT,path.join(admission.artifacts,'checks.json'),{backendCalls:0,cases:10,status:'PASS_FIXTURE_METADATA_AND_ENTRY_ONLY'});
