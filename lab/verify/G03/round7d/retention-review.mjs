// [CX-VG03-7D] Why: inject independent I/O faults around the actual coordinator and inspect ownership after caller cleanup. Rejected: changing coordinator bytes or claiming a trusted lifecycle model proves real VM retention.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=path.join(path.dirname(new URL(import.meta.url).pathname),process.argv[2]??'retention-attempt1'),harnessUrl=new URL('../../../experiments/EXP-G03/ns/round7c-harness.mjs',import.meta.url);fs.mkdirSync(root);
const original=fs.readFileSync(harnessUrl,'utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
const coordinatorSha256=sha(fs.readFileSync(new URL('../../../bin/ns-run.mjs',import.meta.url))),boxSha256=sha(fs.readFileSync(new URL('../../../bin/box.mjs',import.meta.url)));
const matrix=[
 ['control-stage10','stage10-control',null],['nonzero-stage10','stage10-nonzero',null],['clean-stage10','stage10-clean',null],
 ['control-stage10-gap-failure','stage10-control','gap'],['nonzero-stage10-gap-failure','stage10-nonzero','gap'],['clean-stage10-gap-failure','stage10-clean','gap'],
 ['control-stage10-stage14-failure','stage10-control','stage14'],['control-walk-gap-failure','retain-walk-failure','gap'],
 ['control-stage11','reject-hook','stage11'],['control-stage12','reject-hook','stage12'],
 ['control-terminal-build','reject-hook','terminal-build'],['control-terminal-build-gap-failure','reject-hook','terminal-build-gap'],
];
const observations=[];
for(const [name,mode,fault]of matrix.filter(row=>process.argv[3]==='all'?true:process.argv[3]==='build'?row[2]?.startsWith('terminal-build'):!row[2]?.startsWith('terminal-build'))){
 const workDir=path.join(root,'retention-'+name);fs.mkdirSync(workDir);let observed,triggered=0;
 const ioFault=()=>{triggered++;throw Object.assign(Error('REVIEW-'+fault),{code:'EIO'})};
 const build=fault?.startsWith('terminal-build'),gapFailure=fault==='gap'||fault==='terminal-build-gap';
 const fsProxy={...fs,writeFileSync(file,...args){if(gapFailure&&String(file).endsWith('-retained.json'))ioFault();return fs.writeFileSync(file,...args)},appendFileSync(file,data,...args){if(String(file).endsWith('-stages.ndjson')&&((fault==='stage14'&&JSON.parse(data).step===14)||(fault==='stage11'&&JSON.parse(data).step===11)||(fault==='stage12'&&JSON.parse(data).step===12)))ioFault();return fs.appendFileSync(file,data,...args)}};
 const anchor='errorKeys:error?Object.keys(error).sort():[]';assert.equal(original.split(anchor).length,2);
 let code=original.replace(anchor,anchor+',gapWriteError:error?.gapWriteError??null,persistenceCause:error?.cause?.message??null,errorCode:error?.code??null');
 const hashAnchor="inspect:n=>containers.get(n),sha256},\n '../bench";assert.equal(code.split(hashAnchor).length,2);code=code.replace(hashAnchor,"inspect:n=>containers.get(n),sha256:globalThis.__HASH},\n '../bench");
 const context=vm.createContext({Buffer,URL,console:{log:s=>observed=JSON.parse(s)},process:{...process,argv:[process.execPath,'review-harness',mode,workDir]},setTimeout,clearTimeout,setImmediate,__HASH(bytes){if(build&&new Error().stack.includes('trustedTerminal'))ioFault();return sha(bytes)}});
 const module=new vm.SourceTextModule(code,{context,identifier:harnessUrl.href,importModuleDynamically:spec=>import(spec.startsWith('node:')?spec:new URL(spec,harnessUrl).href),initializeImportMeta:m=>{m.url=harnessUrl.href}});
 await module.link(async spec=>{const values=spec==='node:fs'?{default:fsProxy}:await import(spec.startsWith('node:')?spec:new URL(spec,harnessUrl).href);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context})});await module.evaluate();
 assert.ok(observed);fs.writeFileSync(path.join(workDir,'observation.json'),JSON.stringify(observed,null,2)+'\n');assert.equal(observed.returned,false);assert.equal(triggered,fault==='terminal-build-gap'?2:fault?1:0);
 const runId=observed.stages[0].runId??observed.terminalOnError?.runId??observed.boxRetained[0]?.runId;assert.ok(runId);
 const expected=['broker','consumer','output','observer','trace','key','bundle','observerCode','control'].map(s=>'offline-ns-'+runId.slice(0,6)+'-'+s).sort();
 assert.deepEqual([...observed.volumesAfterClose].sort(),expected);assert.deepEqual([...observed.retainedOnError].sort(),expected);assert.deepEqual(observed.boxRetained.map(r=>r.name).sort(),expected);
 assert.ok(!observed.operations.some(x=>x.startsWith('close-remove:volume:')&&expected.some(n=>x.endsWith(n))));
 assert.equal(observed.stages.some(s=>s.step===13),false);
 const stage10=mode.startsWith('stage10-'),control=mode==='stage10-control'||mode==='reject-hook'||mode==='retain-walk-failure';
 if(stage10){assert.ok(!observed.stages.some(s=>s.step===10));assert.ok(!observed.operations.some(x=>x.startsWith('walk:')));assert.equal(observed.persistenceCause,control||mode==='stage10-nonzero'?'EIO: injected stage-10 append failure':null);assert.match(observed.error,/EIO: injected stage-10 append failure/)}
 if(control&&stage10)assert.match(observed.error,/^DRIVER-CONTROL-FAILURE FAULT-POINT-DR-CONTRADICTION; TERMINAL-PERSISTENCE-GAP/);
 if(mode==='stage10-nonzero')assert.match(observed.error,/^DRIVER-EXIT-NONZERO status=7; TERMINAL-PERSISTENCE-GAP/);
 if(gapFailure||fault==='stage14'){assert.equal(observed.gapWriteError,'REVIEW-'+fault);if(!build)assert.notEqual(observed.error,'REVIEW-'+fault)}else assert.equal(observed.gapWriteError,null);
 if(build){assert.equal(observed.terminalOnError,null);assert.match(observed.error,/^DRIVER-CONTROL-FAILURE FAULT-POINT-DR-CONTRADICTION; TERMINAL-PERSISTENCE-GAP REVIEW-terminal-build/);assert.equal(observed.persistenceCause,'REVIEW-'+fault);assert.ok(!observed.stages.some(s=>s.step===10))}
 const gapPath=path.join(workDir,'ns-'+runId+'-retained.json');assert.equal(fs.existsSync(gapPath),!gapFailure);
 if(fs.existsSync(gapPath)){const gap=JSON.parse(fs.readFileSync(gapPath));assert.equal(gap.runId,runId);assert.equal(gap.binding.runId,runId);assert.equal(gap.binding.sourceCommit,'a'.repeat(40));assert.equal(gap.binding.slot,'OFFLINE-MODEL');assert.equal(gap.binding.inputsSha256,sha(fs.readFileSync(path.join(workDir,'ns-'+runId+'-inputs.json'))));assert.deepEqual([...gap.volumes].sort(),expected);assert.equal(gap.qualification,false);assert.equal(gap.export,'NOT-PROVEN-SAFE');if(build)assert.equal(gap.terminal,null);else assert.equal(gap.terminal.runId,runId);if(control)assert.equal(gap.originalCause,'DRIVER-CONTROL-FAILURE FAULT-POINT-DR-CONTRADICTION')}
 fs.writeFileSync(path.join(workDir,'observation.json'),JSON.stringify(observed,null,2)+'\n');
 observations.push({name,mode,fault,runId,triggered,error:observed.error,gapWriteError:observed.gapWriteError,persistenceCause:observed.persistenceCause,nineVolumesSurviveClose:true,gapExists:fs.existsSync(gapPath)});
}
console.log(JSON.stringify({at:new Date().toISOString(),reviewerToolSha256:sha(fs.readFileSync(new URL(import.meta.url))),coordinatorSha256,boxSha256,harnessSha256:sha(Buffer.from(original)),scope:'exact coordinator/Box; builder trusted lifecycle and observer model; independent fs fault and assertions; no Docker',observations},null,2));
