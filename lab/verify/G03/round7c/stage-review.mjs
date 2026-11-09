// [CX-VG03-56-R7C] Why: inject failures in trusted test I/O and lifecycle dependencies at each coordinator boundary while executing unchanged reviewed coordinator/pipe bytes. Rejected: patching the implementation or calling a model a VM ownership proof.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const [boundary,out]=process.argv.slice(2);assert.ok(boundary&&out);const workDir=path.resolve(out);fs.mkdirSync(workDir,{recursive:true});assert.equal(fs.readdirSync(workDir).length,0,'new attempt required');
const harnessUrl=new URL('../../../experiments/EXP-G03/ns/round7c-harness.mjs',import.meta.url),original=fs.readFileSync(harnessUrl,'utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');let triggered=false,observed;
const fail=()=>{triggered=true;throw Object.assign(Error('INJECT-'+boundary),{code:'EIO'})};
function appendFault(file,data){if(!triggered&&/stage-(10|11|12|14)$/.test(boundary)&&String(file).endsWith('-stages.ndjson')){const row=JSON.parse(String(data));if(row.step===Number(boundary.slice(6)))fail()}}
function writeFault(file){const p=String(file);if(boundary==='gap-write'&&p.endsWith('-retained.json'))fail();if(triggered)return;
 if(boundary==='export-key'&&/\/raw-[^/]+\/key$/.test(p))fail();
 if(boundary==='export-binding'&&/\/raw-[^/]+\/binding\.json$/.test(p))fail();
 if(boundary==='export-driver'&&p.endsWith('/driver/events/00000000.json'))fail();
 if(boundary==='export-control'&&p.endsWith('/control/stdout'))fail();
 if(boundary==='capture-terminal'&&/\/raw-[^/]+\/terminal\.json$/.test(p))fail();
}
const fsProxy={...fs,appendFileSync(file,data,...args){appendFault(file,data);return fs.appendFileSync(file,data,...args)},writeFileSync(file,data,...args){writeFault(file);return fs.writeFileSync(file,data,...args)},mkdirSync(file,...args){if(!triggered&&boundary==='export-dir'&&/\/raw-[^/]+$/.test(String(file)))fail();return fs.mkdirSync(file,...args)}};
let code=original;
function replaceOnce(from,to){assert.equal(code.split(from).length,2,'unique harness anchor '+from);code=code.replace(from,to)}
replaceOnce("const M=MODES[mode];", "const M={...MODES[mode],...(globalThis.__REVIEW_OVERRIDE??{})};");
replaceOnce("start(name){operations.push('start:'+name);", "start(name){operations.push('start:'+name);if(globalThis.__BOUNDARY==='observer-stop'&&name.includes('stop-observer'))globalThis.__FAIL();if(globalThis.__BOUNDARY==='observer-seal'&&name.includes('stop-observer')){globalThis.__MARK();for(const [n,c]of containers)if(n.includes('ns-observer-'))c.State.ExitCode=1;}");
replaceOnce("remove(name){operations.push('remove:'+name);", "remove(name){operations.push('remove:'+name);const b=globalThis.__BOUNDARY;if((b==='driver-remove'&&name.includes('ns-driver-'))||(b==='broker-remove'&&name.includes('ns-broker-'))||(b==='consumer-remove'&&name.includes('ns-consumer-'))||(b==='observer-remove'&&name.includes('ns-observer-')))globalThis.__FAIL();");
replaceOnce("walk(volume){operations.push('walk:'+volume);", "walk(volume){operations.push('walk:'+volume);const b=globalThis.__BOUNDARY;if((b.startsWith('walk-')&&volume.endsWith('-'+b.slice(5)))||(b==='gap-write'&&volume.endsWith('-observer'))||(b==='stage-14'&&volume.endsWith('-observer')))globalThis.__FAIL_WALK();");
const override=boundary==='nonutf8-envelope'?{stream:'partial',partial:Buffer.from([255,10]),closeSelf:true,options:{timeout:1000}}:boundary==='null-envelope'?{stream:'partial',partial:'null\n',closeSelf:true,options:{timeout:1000}}:undefined;
const fakeProcess={...process,argv:[process.execPath,'review-harness','reject-hook',workDir]};
const context=vm.createContext({Buffer,URL,console:{log:s=>observed=JSON.parse(s)},process:fakeProcess,setTimeout,clearTimeout,setImmediate,__BOUNDARY:boundary,__REVIEW_OVERRIDE:override,__FAIL:fail,__MARK(){triggered=true},__FAIL_WALK(){if(boundary==='gap-write'||boundary==='stage-14')throw Error('INJECT-walk-observer');fail()}});
const module=new vm.SourceTextModule(code,{context,identifier:harnessUrl.href,importModuleDynamically:spec=>import(spec.startsWith('node:')?spec:new URL(spec,harnessUrl).href),initializeImportMeta:m=>{m.url=harnessUrl.href;m.dirname=path.dirname(fileURLToPath(harnessUrl))}});
await module.link(async spec=>{const values=spec==='node:fs'?{default:fsProxy}:await import(spec.startsWith('node:')?spec:new URL(spec,harnessUrl).href);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context})});
await module.evaluate();assert.ok(observed,'harness emitted observation');
fs.writeFileSync(path.join(workDir,'observation.json'),JSON.stringify(observed,null,2)+'\n');
const rawNames=observed.files.filter(n=>n.startsWith('raw-')),gapNames=observed.files.filter(n=>n.endsWith('-retained.json'));
let exportedFiles=0,digestsMatch=null,controlDigestMatch=null;
if(rawNames.length){const raw=path.join(workDir,rawNames[0]),terminalPath=path.join(raw,'terminal.json');if(fs.existsSync(terminalPath)){const record=JSON.parse(fs.readFileSync(terminalPath));for(const [n,h]of Object.entries(record.capture)){assert.equal(sha(fs.readFileSync(path.join(raw,n))),h);exportedFiles++}digestsMatch=true;const cf=record.terminal.controlFailure;if(cf){assert.equal(cf.partial.stdoutSha256,sha(fs.readFileSync(path.join(raw,'control/stdout'))));assert.equal(cf.partial.stderrSha256,sha(fs.readFileSync(path.join(raw,'control/stderr'))));controlDigestMatch=true}}}
const retained=observed.boxRetained.map(r=>r.name),nineRemain=retained.length===9&&retained.every(n=>observed.volumesAfterClose.includes(n));
const summary={boundary,reviewedCommit:'67844167',coordinatorSha256:sha(fs.readFileSync(new URL('../../../bin/ns-run.mjs',import.meta.url))),boxSha256:sha(fs.readFileSync(new URL('../../../bin/box.mjs',import.meta.url))),harnessSha256:sha(original),injectedHarnessSha256:sha(code),scope:'trusted dependency model; unchanged coordinator and Box.execControl; no Docker/candidate execution',triggered,error:observed.error,errorKeys:observed.errorKeys,lastStage:observed.stages.at(-1).step,rawDirectories:rawNames,gapRecords:gapNames,exportedFiles,digestsMatch,controlDigestMatch,retainedVolumes:retained,volumesAfterClose:observed.volumesAfterClose,nineRemain,returned:observed.returned,qualification:false};
fs.writeFileSync(path.join(workDir,'review-summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(workDir,'injected-harness.mjs'),code);console.log(JSON.stringify(summary));
