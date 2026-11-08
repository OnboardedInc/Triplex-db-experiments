// [CX-VE01-2] Why: independent new routes for F1-F10 against 422c8d3. Rejected: changing evaluator code (review only).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {test} from 'node:test';
import {sha256,sourceTreeIdOf} from '../../../bin/lib.mjs';
import {admitCore,coreContext,gitSource,qualifyClaim,localSut,canonText,recompute,EVALUATOR_FILES,workloadOk,pairedOk} from '../../../bin/claim.mjs';
import {buildFixtures,CANDIDATE} from '../../../bin/test/claim-fixtures.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx2-ve01-r2-'));
const built=buildFixtures(root), R=built.repos.run;
const WT=path.resolve(import.meta.dirname,'../../../..');
const results=[];
const genv={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'};
const g=(dir,args,input)=>execFileSync('git',['-c','user.name=review-fixture','-c','user.email=fixture@lab.invalid','-c','commit.gpgsign=false',...args],{cwd:dir,env:genv,input,encoding:'utf8'}).trim();
const show=p=>execFileSync('git',['show',`main:${p}`],{cwd:R.dir,encoding:'utf8'});
const BUILD=show('build.mjs').toString(), RUN=show('packages/xtdb/src/run.ts').toString(), contract=JSON.parse(show('lab/acceptance/obligations.json')), spec=contract.buildSpec;
const ids=['G10.scope.shared-collision'];
const codes=r=>r.reasons.map(x=>x.code);
let n=0;
function at(name,files={},links={}) {
 g(R.dir,['checkout','-qb',name,R.C2.commit]);
 for(const [p,b] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(R.dir,p)),{recursive:true});fs.writeFileSync(path.join(R.dir,p),b);}
 for(const [p,t] of Object.entries(links)){fs.mkdirSync(path.dirname(path.join(R.dir,p)),{recursive:true});fs.symlinkSync(t,path.join(R.dir,p));}
 g(R.dir,['add','-A']);g(R.dir,['commit','-qm',name]);
 const commit=g(R.dir,['rev-parse','HEAD']), label=sourceTreeIdOf(g(R.dir,['rev-parse','HEAD^{tree}']));
 g(R.dir,['checkout','-q','main']);
 return {commit,label};
}
function auth(name,commits,edit=()=>{}){
 g(R.dir,['checkout','-qb',name,'main']);
 const c=structuredClone(contract);
 for(const commit of commits)for(const id of ids)c.verifierRegistry.entries[`review-${commit}-${id}`]={verifier:'independent-fixture',subject:{kind:'obligation',id,commit},brief:'delta',briefSha256:sha256('delta'),branch:'verify/E01',commit,verdict:'ACCEPT (fixture)',status:'current'};
 edit(c);fs.writeFileSync(path.join(R.dir,'lab/acceptance/obligations.json'),JSON.stringify(c));
 g(R.dir,['add','-A']);g(R.dir,['commit','-qm',name]);g(R.dir,['checkout','-q','main']);return name;
}
const claim=(x,extra={})=>({format:'triplex-db-2/claim/1',claimId:'independent-delta',kind:'comparative',obligations:ids,commit:x.commit,sourceTreeSha256:x.label,composition:structuredClone(CANDIDATE),...extra});
function q(x,extra={}){const r=qualifyClaim(claim(x),{git:gitSource(R.dir),authorityRef:'main',workDir:path.join(root,'work-'+n),isolationRoot:path.join(root,'iso-'+n++),sut:localSut(spec),sandbox:false,...extra});return r;}
function record(id,r,extra={}){results.push({id,verdict:r.verdict,offlineVerdict:r.offlineVerdict,codes:codes(r),...extra});}
process.on('exit',()=>{fs.writeFileSync(new URL('./delta-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');try{execFileSync('chmod',['-R','u+rwX',root]);fs.rmSync(root,{recursive:true,force:true});}catch{}});

test('control: honest fixture qualifies offline',()=>{const r=q(R.C2);record('control',r);assert.equal(r.offlineVerdict,'QUALIFIED',JSON.stringify(r.reasons));});

test('F1 new route: each transitive JS import is checked, poison persists after bytes restored',()=>{
 const copy=path.join(root,'evaluator');fs.mkdirSync(copy);
 for(const f of EVALUATOR_FILES){fs.mkdirSync(path.dirname(path.join(copy,f)),{recursive:true});fs.copyFileSync(path.join(WT,f),path.join(copy,f));}
 g(copy,['init','-q']);g(copy,['add','.']);g(copy,['commit','-qm','trusted evaluator fixture']);
 const drive=()=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`import {qualifyClaim} from ${JSON.stringify('file://'+path.join(copy,'lab/bin/claim.mjs'))};console.log(JSON.stringify(qualifyClaim(null,{})));`],{encoding:'utf8'}));
 for(const f of ['lab/bin/engine.mjs','lab/bin/heavy-lock.mjs','lab/bin/receipt.mjs']){
  const p=path.join(copy,f), bytes=fs.readFileSync(p);fs.appendFileSync(p,'\n// review tamper\n');const r=drive();record('F1-'+path.basename(f),r);assert.ok(codes(r).includes('EVALUATOR-TAMPERED'));
  fs.writeFileSync(p,bytes);assert.ok(codes(drive()).includes('EVALUATOR-TAMPERED'),'marker outlives restoration of working bytes');
  fs.rmSync(path.join(copy,'.git/triplex-evaluator-poisoned.json'));
 }
});

test('F2 new route: loose object substitution without replace refs fails the blob OID check',()=>{
 const repo=path.join(root,'corrupt-object');fs.mkdirSync(repo);g(repo,['init','-q']);fs.writeFileSync(path.join(repo,'trusted'),'original');g(repo,['add','.']);g(repo,['commit','-qm','anchor']);
 const commit=g(repo,['rev-parse','HEAD']), oid=g(repo,['rev-parse','HEAD:trusted']);
 const file=path.join(repo,'.git/objects',oid.slice(0,2),oid.slice(2));fs.chmodSync(file,0o644);const bytes=Buffer.from('substituted');fs.writeFileSync(file,zlib.deflateSync(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])));
 assert.equal(gitSource(repo).blob(commit,'trusted'),null);results.push({id:'F2-loose-blob',refused:true});
});

test('F2/F7 GAP: deleting the completed claimed-case input persists without refusal',()=>{
 const marker=path.join(root,'input-deleted');
 const run=RUN+`\nif(String(c.case).startsWith('CS-SCOPE/') && process.argv[3]==='reopen'){fs.unlinkSync(process.argv[2]);fs.writeFileSync(${JSON.stringify(marker)},process.argv[2]);}\n`;
 const x=at('delta-delete-input',{'packages/xtdb/src/run.ts':run});const a=auth('delta-input-auth',[x.commit]);
 const r=q(x,{authorityRef:a});const deleted=fs.existsSync(marker);record('F2/F7-input-delete',r,{deleted});assert.ok(deleted);assert.equal(r.offlineVerdict,'QUALIFIED',JSON.stringify(r.reasons));
});

test('F3 new route: a child changing the resolved node entrypoint is refused',()=>{
 const bin=path.join(root,'tool-bin');fs.mkdirSync(bin);const node=path.join(bin,'node');fs.writeFileSync(node,`#!/bin/sh\nexec '${process.execPath}' "$@"\n`,{mode:0o755});
 const x=at('delta-tool',{'build.mjs':BUILD+`\nfs.appendFileSync(${JSON.stringify(node)},'# poisoned executable\\n');\n`});
 const old=process.env.PATH;try{process.env.PATH=bin+':'+old;const r=q(x);record('F3-tool',r);assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(r).includes('TOOLCHAIN-TAMPERED'));}finally{process.env.PATH=old;}
});

test('F3/F10 new route: a two-link external chain and a cycle refuse safely',()=>{
 const ext=path.join(root,'external');fs.writeFileSync(ext,'outside');
 const x=at('delta-chain',{}, {'runtime/inside':'to-outside','runtime/to-outside':ext});
 const r=q(x);record('F3/F10-chain',r);assert.ok(codes(r).includes('BUILD-LINK-OUTSIDE'));assert.equal(r.run.instances.length,0);
 const y=at('delta-cycle',{}, {'runtime/a':'b','runtime/b':'a'});const s=q(y);record('F10-cycle',s);assert.equal(s.verdict,'DIAGNOSTIC');assert.ok(s.run.instances.length>0,'cycle walker terminates');
});

test('F4 new route: gate child HOME/TMPDIR cannot see preceding version probes',()=>{
 const seen=[];const r=q(R.C2,{gate:plan=>({ok:true,plan}),sut:args=>{const p=args.runChild(['node','-e',`console.log(JSON.stringify({home:process.env.HOME,tmp:process.env.TMPDIR,keys:Object.keys(process.env)}))`],{cwd:args.dir,label:'independent-env'});seen.push(JSON.parse(p.stdout));return localSut(spec)(args);}});
 record('F4-fresh-env',r,{homes:seen.length,uniqueHomes:new Set(seen.map(x=>x.home)).size});assert.equal(r.offlineVerdict,'QUALIFIED');assert.equal(new Set(seen.map(x=>x.home)).size,seen.length);assert.ok(seen.every(x=>x.home===x.tmp&&!fs.existsSync(x.home)));assert.ok(seen.every(x=>!x.keys.includes('NODE_OPTIONS')));
});

test('F5 new route: inFlight alternatives cannot accidentally turn object comparators green',()=>{
 const b=Buffer.from(canonText({commandOutcomes:[],queries:[{id:'x',inFlight:{acceptable:[{result:[1]}]}}],state:{}}));
 for(const c of ['CMP-SET-ROWS','CMP-BAG-ROWS','CMP-ORDERED-ROWS','CMP-PAGES','CMP-ERROR','CMP-DIAGNOSTICS'])assert.equal(recompute(c,b,b),'UNCOMPARABLE');
 results.push({id:'F5-inFlight',allUncomparable:true});
});

test('F6 new route: structured cause must contain a nonempty string, not a tag-shaped number',()=>{
 const e=Buffer.from(canonText({_tag:'ReplicaUnavailable',reasons:['replica-unreachable']}));
 for(const cause of [{_tag:0},{message:[]},{message:''},{_tag:false},'error']){const o=Buffer.from(canonText({_tag:'ReplicaUnavailable',reason:'replica-unreachable',cause}));assert.equal(recompute('CMP-ERROR',e,o),'FAIL');}
 results.push({id:'F6-cause-types',allRejected:true});
});

test('F7 new route: extra content-addressed object written by the child refuses',()=>{
 const work=path.join(root,'extra-evidence'), payload='candidate evidence', h=sha256(payload);
 const x=at('delta-extra-object',{'build.mjs':BUILD+`\nfs.writeFileSync(${JSON.stringify(path.join(work,'objects',h))},${JSON.stringify(payload)});\n`});
 const a=auth('delta-evidence-auth',[x.commit]);const r=q(x,{authorityRef:a,workDir:work});record('F7-extra-object',r);assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(r).includes('EVIDENCE-UNEXPECTED'));
});

test('F8 new route: core refuses promotion before touching even an adversarial executor',()=>{
 const ev=new Proxy({}, {get(){throw new Error('executor touched');}});const ctx=coreContext(contract,{},JSON.parse(show('lab/acceptance/load-contract.json')));
 const r=admitCore({...claim(R.C2),kind:'promotion'},ev,ctx);results.push({id:'F8-direct-core',...r});assert.equal(r.verdict,'DIAGNOSTIC');assert.equal(r.reasons[0].code,'PROMOTION-UNSUPPORTED');
});

test('F9 new route: deleting the whole objects directory never throws or loses gate blocker',()=>{
 const work=path.join(root,'gone-store');let changed=false;const local=localSut(spec);
 const r=q(R.C2,{workDir:work,sut:args=>{const out=local(args);if(!changed){fs.rmSync(path.join(work,'objects'),{recursive:true,force:true});changed=true;}return out;}});
 record('F9-gone-directory',r);assert.ok(changed);assert.equal(r.offlineVerdict,'DIAGNOSTIC');assert.ok(codes(r).includes('GATE-NOT-RUN'));assert.ok(codes(r).includes('EVALUATOR-ERROR'));
});

test('Q67g: 0.3.10 workload fields exclude slot, duet placement rejects overlap and unequal capacity',()=>{
 const fields=contract.workloadIdentity.fields, wl={generatorSourceSha256:'a'.repeat(64),seed:1,offerScheduleSha256:'b'.repeat(64),window:[0,1]};
 assert.ok(workloadOk(wl,CANDIDATE,fields));assert.ok(!workloadOk({...wl,slot:'dev'},CANDIDATE,fields));
 const load=JSON.parse(show('lab/acceptance/load-contract.json')), pair0=load.measurementProtocol;const rounds=pair0.design.looks[0];
 const m={mode:'paired-rounds',design:'duet',workload:wl,rounds,perRound:Array.from({length:rounds},()=>({histograms:{candidate:{},A0:{}},signals:{}})),window:'GREEN',accounting:'all-offered',placement:{candidate:{slot:'s1',cpuset:'0-1',cpus:2},A0:{slot:'s2',cpuset:'2-3',cpus:2}},slotRegimes:{candidate:{cpuMax:'max',cpuWeight:100,cpuset:'0-1'},A0:{cpuMax:'max',cpuWeight:100,cpuset:'2-3'}}};
 assert.ok(pairedOk(m,wl,pair0));const overlap=structuredClone(m);overlap.placement.A0.cpuset='1-2';overlap.slotRegimes.A0.cpuset='1-2';assert.ok(!pairedOk(overlap,wl,pair0));const capacity=structuredClone(m);capacity.placement.A0.cpus=1;assert.ok(!pairedOk(capacity,wl,pair0));results.push({id:'Q67g',fields:Object.keys(fields),placement:m.placement});
});
