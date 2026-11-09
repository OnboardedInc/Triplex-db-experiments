// [EXP-OBS01] Why: a rejected resident spec must release its observer-only reservation.
// Rejected: testing this cleanup solely with successful Docker exits.
import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
import {inspect,POOL_FILE,readJson} from '../bin/lib.mjs';
const repo=path.resolve(import.meta.dirname,'../..'),id='obs01-r3-invalid-spec-'+(process.argv[2]??'r1'),out=path.join(repo,'lab/experiments/EXP-OBS01/round3/controller-negative-'+(process.argv[2]??'r1'));fs.mkdirSync(out,{recursive:true});
const key=path.join(repo,'runs/OBS01',id+'.key');fs.writeFileSync(key,randomBytes(32),{flag:'wx',mode:0o600});
const spec=path.join(out,'case.json');fs.writeFileSync(spec,JSON.stringify({resident:true,runId:id,sources:[],relation:'unowned_relation',population:{n:8,width:1}},null,2)+'\n');
const before=inspect('tx2-xtdb-dev');const result=spawnSync(process.execPath,['lab/bin/engine.mjs','observer-resident','--lane','xtdb','--slot','dev','--holder','CX-OBS01-R3','--run-id',id,'--key-file',key,'--spec',spec,'--image','python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90'],{cwd:repo,encoding:'utf8',timeout:30000});
fs.writeFileSync(path.join(out,'stdout.txt'),result.stdout??'');fs.writeFileSync(path.join(out,'stderr.txt'),result.stderr??'');
assert.equal(result.status,3);assert.match(result.stderr,/resident probes require an owned relation/);
assert.equal(inspect('tx2-obs-resident-'+id),null);assert.equal(readJson(POOL_FILE()).reservations.some(r=>r.container==='tx2-obs-resident-'+id),false);
const after=inspect('tx2-xtdb-dev');assert.equal(before.Id,after.Id);assert.equal(before.State.StartedAt,after.State.StartedAt);
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,exit:result.status,reservationReleased:true,containerAbsent:true,residentId:after.Id,residentStartUnchanged:true},null,2)+'\n');console.log('Rejected unowned relation; reservation released; resident unchanged');
