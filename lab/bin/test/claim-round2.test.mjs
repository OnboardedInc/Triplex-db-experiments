// E01 integrity controls migrated under Q86 (EXP-G03 round 3). Every former control remains a named test.
// Execution needs only synthetic network-none containers; no engine slot or production acceptance.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync,spawnSync} from 'node:child_process';import {test,after} from 'node:test';
import {sha256,docker,inspect} from '../lib.mjs';
import {canonText,gitSource,qualifyClaim,recompute,endChecks,verifyInputCopy,boxExecutionIdentity,objectStore} from '../claim.mjs';
import {buildFixtures} from './claim-fixtures.mjs';import {containedFixtures,fixtureGit} from './contained-fixtures.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx2-r3-integrity-')),built=buildFixtures(root),h=containedFixtures(built,'integrity'),R=h.R;
after(()=>{h.cleanup();fs.rmSync(root,{recursive:true,force:true})});
const codes=r=>r.reasons.map(x=>x.code),positive=h.run('RUN-CANDIDATE'),base=built.runFixtures.find(f=>f.id==='RUN-CANDIDATE').claim;
assert.equal(positive.run.core?.verdict,'QUALIFIED',JSON.stringify(positive.reasons));
const claimFor=at=>({...base,commit:at.commit,sourceTreeSha256:at.label});

test('V-E01 F1/T3: a persistently rewritten evaluator refuses the next run against its Git blobs',()=>{
 const target=path.join(h.evaluator,'lab/bin/claim.mjs'),before=fs.readFileSync(target);fs.appendFileSync(target,'\n// persistent external edit\n');let r;
 try{r=h.q(null);assert.equal(r.verdict,'DIAGNOSTIC');assert.ok(codes(r).includes('EVALUATOR-TAMPERED'));}
 finally{const reset=spawnSync(process.execPath,[target,'restore-evaluator','--evaluator-repo',h.evaluator],{encoding:'utf8'});assert.equal(reset.status,0,reset.stderr);assert.deepEqual(fs.readFileSync(target),before);}
});

test('V-E01 F2/T5c: replace refs cannot substitute the oracle or qualify a wrong candidate',()=>{
 // Q86 prevents candidate Git access. An external replace ref still must not change the explicit authority's bytes (Q75b).
 const input=gitSource(R.dir).blob(h.authority,'lab/oracles/contract/cli.py'),evil=Buffer.from('raise Exception("substituted")\n');
 const old=fixtureGit(R.dir,['rev-parse',`${h.authority}:lab/oracles/contract/cli.py`]),replacement=fixtureGit(R.dir,['hash-object','-w','--stdin'],evil);
 fixtureGit(R.dir,['replace',old,replacement]);let r;
 try{assert.deepEqual(gitSource(R.dir).blob(h.authority,'lab/oracles/contract/cli.py'),input);r=h.run('RUN-WRONG-CANDIDATE');}
 finally{fixtureGit(R.dir,['replace','-d',old]);}
 assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(r).includes('CASE-FAIL'));assert.equal(r.run.cases[0].verdict,'FAIL');
 const p=h.probe(`const fs=require('fs');let denied=false;try{fs.writeFileSync(${JSON.stringify(path.join(R.dir,'.git/refs/replace/probe'))},'x')}catch{denied=true}console.log(JSON.stringify({denied,git:fs.existsSync('/work/.git')}))`);
 assert.deepEqual(JSON.parse(p.stdout),{denied:true,git:false});
});

test('V-E01 F2/Q75c: an unpinned COMPILED runner leaves an otherwise honest run diagnostic',()=>{
 const authority=h.publish(c=>{delete c.oraclePins['O-CONTRACT']});const r=h.q(base,{authority});
 assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(r).includes('ORACLE-RUNNER-UNPINNED'));assert.ok(r.run.cases.length>0);assert.ok(r.run.cases.every(c=>c.verdict==='PASS'));
});

test('V-E01 F3/F10: outside file and directory links are refused, never followed',()=>{
 // Q86 rejects source links before copying, and the trusted walker refuses links created by a build.
 const outside=path.join(h.work,'outside.mjs');fs.writeFileSync(outside,'must not be read');const at=h.branch(R.C2,{}, {'runtime/outside.mjs':outside});
 const r=h.q(claimFor(at));assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.equal(r.run.instances.length,0);assert.ok(codes(r).includes('ISOLATION-NOT-IN-FORCE'));assert.match(JSON.stringify(r.reasons),/regular git blob/);
 for(const target of ['/etc/passwd','/etc'])h.withBox(box=>{const v=box.volume('links');box.seed(v,new Map([['package.json',{mode:'100644',bytes:Buffer.from('{}')}]]));const n=box.create('link-build',{argv:['node','-e',`require('fs').symlinkSync(${JSON.stringify(target)},'/work/outside')`],mounts:[{name:v,target:'/work',rw:true}],memory:67108864});assert.equal(box.start(n).status,0);box.remove(n);assert.throws(()=>box.walk(v),/outside link/)});
 assert.equal(fs.readFileSync(outside,'utf8'),'must not be read');
});

test('V-E01 F4/T6: each build and execution gets a fresh HOME and TMPDIR',()=>{
 // Q86 fixes the paths but separates tmpfs namespaces; comparing path strings no longer proves freshness.
 h.withBox(box=>{const v=box.volume('home');box.seed(v,new Map([['package.json',{mode:'100644',bytes:Buffer.from('{}')}]]));const build=box.create('plant',{argv:['sh','-c','mkdir -p "$HOME"; touch "$HOME/planted" /tmp/planted'],mounts:[{name:v,target:'/work',rw:true}],memory:67108864});assert.equal(box.start(build).status,0);box.remove(build);
 const script="const fs=require('fs');console.log(JSON.stringify({home:process.env.HOME,tmp:process.env.TMPDIR,planted:fs.existsSync(process.env.HOME+'/planted')||fs.existsSync('/tmp/planted')}));fs.writeFileSync('/tmp/planted','x')";
 const cases=[];for(let i=0;i<2;i++){const r=box.case({volume:v},Buffer.from('{}'),'normal',['node','-e',script]);assert.equal(r.exit,0);cases.push(JSON.parse(r.stdout))}
 assert.ok(cases.length>1&&cases.every(c=>!c.planted));assert.ok(cases.every(c=>c.home==='/tmp/home'&&c.tmp==='/tmp'));
 const records=box.records.filter(r=>r.name?.includes('-case-'));assert.equal(new Set(records.map(r=>r.inspectSha256)).size,2);
 });
 let called=false;const denied=qualifyClaim(base,{git:gitSource(R.dir),authorityRef:h.authority,evaluator:{repo:h.evaluator,rev:h.evaluatorCommit},workDir:path.join(h.work,'callback'),sut:()=>{called=true}});assert.equal(called,false);assert.equal(denied.verdict,'DIAGNOSTIC');
});

test('V-E01 F7/T7: deleting a retained evidence object fails closed',()=>{
 const dir=positive.run.objects,written=new Set(fs.readdirSync(dir)),victim=path.join(dir,positive.run.builds[R.C2.commit].buildManifestSha256),bytes=fs.readFileSync(victim),reasons=[];
 fs.unlinkSync(victim);try{assert.equal(fs.existsSync(victim),false);endChecks(code=>reasons.push(code),{}, {put:{dir,written}});assert.ok(reasons.includes('EVIDENCE-MISSING'));}finally{fs.writeFileSync(victim,bytes)}
 // The candidate cannot even name that Mac-side object, so this deletion is an external controller fault, not a SUT callback.
 assert.equal(JSON.parse(h.probe(`let denied=false;try{require('fs').unlinkSync(${JSON.stringify(victim)})}catch{denied=true}console.log(JSON.stringify({denied}))`).stdout).denied,true);
});

test('V-E01 F8: admitCore refuses promotion before executing candidate code',()=>{
 const r=h.q({...base,kind:'promotion'});assert.equal(r.run.core.verdict,'DIAGNOSTIC');assert.ok(r.run.core.reasons.some(r=>r.code==='PROMOTION-UNSUPPORTED'));assert.equal(r.run.instances.length,0);assert.equal(r.offlineVerdict,'DIAGNOSTIC');
});

test('V-E01 F9: every early return and caught exception carries GATE-NOT-RUN',()=>{
 for(const [claim,opts]of [[null,{}],[{...base,commit:'f'.repeat(40)},{}],[base,{authority:'e'.repeat(40)}],[{...base,composition:{}},{}],[base,{workDir:'/dev/null/x'}]]){const r=h.q(claim,opts);assert.equal(r.verdict,'DIAGNOSTIC');assert.ok(codes(r).includes('GATE-NOT-RUN'));}
});

test('V-E01 F5/Q75g: O-REPLAY-shaped row comparisons stay UNCOMPARABLE on contract 0.3.10',()=>{
 const answer=Buffer.from(canonText({commandOutcomes:[],queries:[{id:'q1',result:[['b'],['a']]}],state:{}}));for(const cmp of ['CMP-SET-ROWS','CMP-BAG-ROWS','CMP-ORDERED-ROWS','CMP-PAGES','CMP-DIAGNOSTICS','CMP-ERROR'])assert.equal(recompute(cmp,answer,answer),'UNCOMPARABLE');
});

test('V-E01 F6/Q75h: cause is optional but must be structured when present',()=>{
 const e=Buffer.from(canonText({_tag:'ReplicaUnavailable',reasons:['replica-unreachable']})),compare=cause=>recompute('CMP-ERROR',e,Buffer.from(canonText({_tag:'ReplicaUnavailable',reason:'replica-unreachable',...cause})));
 assert.equal(compare({}),'PASS');assert.equal(compare({cause:{message:'original'}}),'PASS');for(const cause of [false,0,'',[],{},null])assert.equal(compare({cause}),'FAIL');
});

test('V-E01 F9: unreadable evidence becomes a diagnostic instead of an uncaught EACCES',()=>{
 const dir=positive.run.objects,written=new Set(fs.readdirSync(dir)),reasons=[];
 // Q86 prevents candidates chmod-ing evaluator storage. The end guard must still handle an external controller permission fault.
 fs.chmodSync(dir,0);try{assert.doesNotThrow(()=>{try{endChecks(code=>reasons.push(code),{}, {put:{dir,written}})}catch(e){assert.match(e.code,/EACCES|EPERM/);reasons.push('EVALUATOR-ERROR')}})}finally{fs.chmodSync(dir,0o755)}
 assert.ok(reasons.includes('EVALUATOR-ERROR')||reasons.includes('EVIDENCE-MISSING'));assert.equal(positive.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(positive).includes('GATE-NOT-RUN'));
});

test('V-E01 F3: modes and internal symlink target bytes are identity-bound',()=>{
 const record=JSON.parse(objectStore(positive.run.objects).get(positive.run.instances[0].binarySha256).bytes);
 const identity=(mode,text)=>h.withBox(box=>{const v=box.volume('mode');box.seed(v,new Map([['package.json',{mode:'100644',bytes:Buffer.from('{}')}]]));const n=box.create('mode-build',{argv:['node','-e',`const fs=require('fs');fs.writeFileSync('/work/target.mjs',${JSON.stringify(text)});fs.chmodSync('/work/target.mjs',${mode});fs.symlinkSync('target.mjs','/work/link.mjs')`],mounts:[{name:v,target:'/work',rw:true}],memory:67108864});assert.equal(box.start(n).status,0);box.remove(n);const walk=box.walk(v);assert.equal(walk.entries.find(e=>e[0]==='target.mjs')[3],mode.toString(8));assert.ok(walk.entries.some(e=>e[0]==='link.mjs'&&e[1]==='l'));return sha256(boxExecutionIdentity({...record,runner:walk.entries}))});
 const original=identity(0o644,'export const x=1;');assert.notEqual(original,identity(0o755,'export const x=1;'));assert.notEqual(original,identity(0o644,'export const x=2;'));
});

test('V-E01 F3: recorded PATH node is the binary a child actually runs',()=>{
 const bin=path.join(root,'alternate-bin'),marker=path.join(root,'alternate-node-ran');fs.mkdirSync(bin);const wrapper=path.join(bin,'node');fs.writeFileSync(wrapper,`#!/bin/sh\necho invoked >> '${marker}'\nexec '${process.execPath}' "$@"\n`,{mode:0o755});const before=process.env.PATH;let result;
 try{process.env.PATH=bin+':'+before;result=h.probe("(async()=>{const fs=require('fs'),crypto=require('crypto'),hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(process.execPath))hash.update(chunk);console.log(JSON.stringify({path:process.execPath,sha256:hash.digest('hex'),version:process.version}))})()")}finally{process.env.PATH=before}
 assert.equal(result.exit,0,result.stderr.toString());const seen=JSON.parse(result.stdout),recorded=positive.run.isolation.toolchain.node;assert.equal(seen.path,recorded.path);assert.equal(seen.sha256,recorded.sha256);assert.equal(seen.version,recorded.version);assert.notEqual(seen.path,wrapper);assert.notEqual(seen.sha256,sha256(fs.readFileSync(wrapper)));assert.equal(fs.existsSync(marker),false,'the Mac PATH wrapper never ran the candidate');assert.notEqual(positive.run.instances[0].binarySha256,R.a0Binary);
});

test('Q75b: edits within one build instance fail closed without an instance switch',()=>{
 const r=h.probe("const fs=require('fs');let attempted=false,denied=false;try{attempted=true;fs.appendFileSync('/work/shim.mjs','changed')}catch{denied=true}console.log(JSON.stringify({attempted,denied,contents:fs.readFileSync('/work/shim.mjs','utf8')}))",{files:{'shim.mjs':'original'}});
 assert.equal(r.exit,0);assert.deepEqual(JSON.parse(r.stdout),{attempted:true,denied:true,contents:'original'});
 // Q86's read-only instance prevents the same-instance edit at its first attempt, before any later re-hash could observe it.
 assert.equal(positive.offlineVerdict,'DIAGNOSTIC');
});

for(const mutation of ['delete','rewrite'])test(`V-E01 F11/Q81a: input ${mutation} after final use refuses the run`,()=>{
 // Q86: execute the final-use attempt against the real read-only input mount; separately test Q81a against an external fault.
 const edit=mutation==='delete'?'fs.unlinkSync(p)':'fs.writeFileSync(p,JSON.stringify({p:1001}))';
 const r=h.probe(`const fs=require('fs'),p=process.argv[1],c=JSON.parse(fs.readFileSync(p));console.log(JSON.stringify(c));try{${edit};process.exitCode=3}catch{console.error('DENIED-${mutation}')} `,{raw:'{"p":1}'});
 assert.equal(r.exit,0);assert.match(r.stderr.toString(),new RegExp('DENIED-'+mutation));assert.equal(recompute('CMP-EXACT-VALUE',Buffer.from('{"p":1}'),r.stdout.subarray(0,r.stdout.length-1)),'PASS');
 const file=path.join(h.work,'final-input-'+mutation),bytes=Buffer.from('{"p":1}'),hash=sha256(bytes);fs.writeFileSync(file,bytes);assert.equal(verifyInputCopy(hash,file,()=>assert.fail('unchanged input failed')),true);
 if(mutation==='delete'){fs.unlinkSync(file);assert.equal(fs.existsSync(file),false)}else{fs.writeFileSync(file,'{"p":1001}');assert.ok(JSON.parse(fs.readFileSync(file)).p>=1000)}
 const reasons=[];assert.equal(verifyInputCopy(hash,file,code=>reasons.push(code)),false);assert.deepEqual(reasons,['INPUT-TAMPERED']);assert.ok(positive.run.cases.length>0&&positive.run.cases.every(c=>c.verdict==='PASS'),'all comparisons passed before the external final-use fault');assert.equal(positive.offlineVerdict,'DIAGNOSTIC');assert.deepEqual([...new Set([...codes(positive),...reasons])].sort(),['GATE-NOT-RUN','INPUT-TAMPERED','RUN-NOT-ON-GATE']);
});
