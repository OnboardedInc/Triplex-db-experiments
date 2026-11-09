// [EXP-K01-R6] Why: test failed observations across consumers, not only the three reported outputs. Rejected: assuming outer command exit zero proves every producer read completed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { observe, observeAsync, complete, processObservation, text, byteCount, booleanProof, digestBytes, sqlNumber } from '../../bin/observation.ts';
import { admission, parseVmDisk } from '../../bin/lib.mjs';
import { parseListing, listingScript, stopVerdict } from '../../bin/engine.mjs';
for(const [name,read,parse] of [
 ['throws',()=>{throw Error('read failed');},text],['missing',()=>undefined,text],['partial-number',()=>NaN,byteCount],['invalid-hash-bytes',()=>null,digestBytes],['stop-proof',()=>({ok:false}),booleanProof],['missing-sql',()=>null,sqlNumber],['bad-sql',()=>'',sqlNumber],['no-parser-value',()=>1,()=>undefined],
])test(`failed observation cannot unwrap (${name})`,()=>{const o=observe(name,{attempt:'current'},read,parse);assert.equal(o.state,'failed');assert.throws(()=>complete(o));assert.equal(o.binding.attempt,'current');});
for(const variant of ['exit','signal','missing-signal','error','stdout','stderr','diagnostic'])test(`process acquisition refuses ${variant}`,()=>{
 const r={status:0,signal:null,error:null,stdout:'matching proof',stderr:''};if(variant==='exit')r.status=1;if(variant==='signal')r.signal='SIGTERM';if(variant==='missing-signal')delete r.signal;if(variant==='error')r.error=Error('failed');if(variant==='stdout')delete r.stdout;if(variant==='stderr')delete r.stderr;if(variant==='diagnostic')r.stderr='producer failed';
 assert.throws(()=>complete(processObservation('process',{source:'fixture'},r,x=>x,{stderrEmpty:true})));
});
test('async acquisition failure and valid empty results remain distinct',async()=>{
 const bad=await observeAsync('query',{},async()=>{throw Error('query failed');},x=>x);assert.equal(bad.state,'failed');assert.throws(()=>complete(bad));
 assert.deepEqual(complete(await observeAsync('query',{},async()=>[],x=>x)),[]);
});
const config={vm:{memBytes:10000},pool:{memLimitBytes:10000,diskUsedLimitBytes:10000}};
for(const target of ['request-memory','request-disk','reservation-memory','reservation-disk','VM-cap','pool-cap','external-cap'])test(`resource validation refuses missing/invalid ${target}`,()=>{
 const input={config:structuredClone(config),reservations:[{container:'other',memBytes:1,diskForecastBytes:1}],running:[{name:'external',running:true,memBytes:1}],request:{container:'new',memBytes:1,diskForecastBytes:1},diskUsedBytes:1};
 if(target==='request-memory')input.request.memBytes=NaN;if(target==='request-disk')delete input.request.diskForecastBytes;if(target==='reservation-memory')input.reservations[0].memBytes=-1;if(target==='reservation-disk')delete input.reservations[0].diskForecastBytes;if(target==='VM-cap')input.config.vm.memBytes=undefined;if(target==='pool-cap')input.config.pool.diskUsedLimitBytes=Infinity;if(target==='external-cap')delete input.running[0].memBytes;
 assert.equal(admission(input).ok,false);
});
for(const df of ['Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/v 100 10 90 10% /','Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/v NaN 10 90 10% /','Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/v 100 -1 90 10% /','Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/v 100 10 100 10% /','Filesystem 1-blocks Used Available Capacity Mounted on'])test(`VM disk parser requires complete sane bytes (${df.split('\n')[1]})`,()=>{
 if(df.includes('100 10 90'))assert.equal(parseVmDisk(df).usedBytes,10);else assert.throws(()=>parseVmDisk(df));
});
for(const body of ['@@end','@@stat\n@@end','@@sha\n@@stat\n@@end','@@stat\n@@sha\n@@end\nunexpected'])test(`listing parser refuses incomplete framing ${JSON.stringify(body)}`,()=>assert.throws(()=>parseListing(body)));
test('missing stop OOM read is failed proof',()=>assert.equal(stopVerdict({log:'Stopping node...\nNode stopped.',exitCode:143,stopMs:1}).ok,false));
const root=path.resolve(import.meta.dirname,'../../..');
for(const variant of ['absent','read-failed','inspect-failed','inspect-malformed','helper-stderr','legacy-allowFail'])test(`real command facade keeps read failures distinct (${variant})`,()=>{
 const temp=path.join(import.meta.dirname,'tmp/round6');fs.mkdirSync(temp,{recursive:true});const dir=fs.mkdtempSync(path.join(temp,'cli-'));
 const program=`#!${process.execPath}\nconst variant=process.env.OBS_VARIANT;let a=process.argv.slice(2);if(a[0]==='-H')a=a.slice(2);if(variant==='read-failed'||variant==='legacy-allowFail'){process.stderr.write('injected list failure');process.exitCode=1;}else if(a[0]==='ps')console.log(variant==='absent'?'':'fixture');else if(variant==='inspect-failed'){console.log(JSON.stringify([{Id:'matching',State:{Running:true}}]));process.exitCode=1;}else if(variant==='inspect-malformed')console.log('[]');else if(variant==='helper-stderr'){console.log('@@end');console.error('injected producer failure');}`;
 fs.writeFileSync(path.join(dir,'docker'),program,{mode:0o755});
 const module=pathToFileURL(path.join(root,'lab/bin/lib.mjs')).href;
 const script=`import {inspect,docker} from ${JSON.stringify(module)};try{const r=${variant==='helper-stderr'?"docker(['run'],{stderrEmpty:true})":variant==='legacy-allowFail'?"docker(['ps'],{allowFail:true})":"inspect('fixture')"};process.stdout.write(JSON.stringify({result:r}));}catch(e){process.stdout.write(JSON.stringify({state:e.observation?.state,error:e.message,observation:e.observation}));}`;
 try{const r=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,env:{...process.env,PATH:dir+':'+process.env.PATH,OBS_VARIANT:variant},encoding:'utf8'});assert.equal(r.status,0,r.stderr);const value=JSON.parse(r.stdout);if(variant==='absent')assert.equal(value.result,null);else{assert.equal(value.state,'failed');assert.ok(value.error);}}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('listing producer does not hide sort failure',()=>{
 const temp=path.join(import.meta.dirname,'tmp/round6');fs.mkdirSync(temp,{recursive:true});const dir=fs.mkdtempSync(path.join(temp,'sort-'));fs.mkdirSync(path.join(dir,'buffers'));fs.mkdirSync(path.join(dir,'bin'));fs.writeFileSync(path.join(dir,'bin/stat'),'#!/bin/sh\nshift 2\nfor p do printf \"%s|1|644|0|0\\n\" \"$p\"; done\n',{mode:0o755});fs.writeFileSync(path.join(dir,'bin/sort'),'#!/bin/sh\ncat \"$1\"\necho sort-injected >&2\nexit 1\n',{mode:0o755});
 try{const r=spawnSync('/bin/sh',['-c','set -eu; '+listingScript(dir)],{env:{...process.env,PATH:path.join(dir,'bin')+':'+process.env.PATH},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/sort-injected/);assert.throws(()=>parseListing(r.stdout));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
