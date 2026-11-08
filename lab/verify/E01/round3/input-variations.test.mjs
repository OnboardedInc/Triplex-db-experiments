// [CX-VE01-4] Why: observe final-use Q81a byte integrity at 388209d. Rejected: mutating claim.mjs (review only).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {sha256,sourceTreeIdOf} from '../../../bin/lib.mjs';
import {admitCore,coreContext,gitSource,qualifyClaim,localSut,canonText,recompute,EVALUATOR_FILES,workloadOk,pairedOk} from '../../../bin/claim.mjs';
import {buildFixtures,CANDIDATE} from '../../../bin/test/claim-fixtures.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tx2-ve01-r3-'));
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
process.on('exit',()=>{fs.writeFileSync(new URL('./input-variations-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');try{execFileSync('chmod',['-R','u+rwX',root]);fs.rmSync(root,{recursive:true,force:true});}catch{}});

// [CX-VE01-4] Why: test missing paths, changed byte lengths, same-length changes and link resolution independently. Rejected: a refusal caused by a broken query (all semantic comparisons must pass first).
const variations = [
 {name:'rename',reject:true,edit:'fs.renameSync(p,p+".renamed");'},
 {name:'truncate',reject:true,edit:'fs.chmodSync(p,0o644);fs.truncateSync(p,Math.floor(before.length/2));'},
 {name:'symlink-different-bytes',reject:true,edit:'fs.writeFileSync(p+".target",different);fs.unlinkSync(p);fs.symlinkSync(p+".target",p);'},
 {name:'rewrite-identical-length',reject:true,edit:'fs.chmodSync(p,0o644);fs.writeFileSync(p,different);'},
 {name:'symlink-identical-bytes',reject:false,edit:'fs.writeFileSync(p+".target",before);fs.unlinkSync(p);fs.symlinkSync(p+".target",p);'},
 {name:'symlink-dangling',reject:true,edit:'fs.unlinkSync(p);fs.symlinkSync(p+".absent",p);'},
 {name:'rewrite-then-restore',reject:false,edit:'fs.chmodSync(p,0o644);fs.writeFileSync(p,different);fs.writeFileSync(p,before);'},
 {name:'honest-control',reject:false,edit:''},
];
for (const v of variations) test(`Q81a final input: ${v.name} => ${v.reject?'INPUT-TAMPERED':'same-byte control'}`,()=>{
 const marker=path.join(root,'observed-'+v.name+'.jsonl');
 const code=RUN+`
if(String(c.case).startsWith('CS-SCOPE/') && process.argv[3]==='reopen'){
 const p=process.argv[2], before=fs.readFileSync(p), different=Buffer.from(before);
 const at=before.indexOf(Buffer.from(String(c.case)));
 if(at<0) throw new Error('case identifier absent');
 different[at]=different[at]===88?89:88;
 ${v.edit}
 fs.appendFileSync(${JSON.stringify(marker)},JSON.stringify({path:p,original:before.toString('base64'),different:different.toString('base64')})+'\\n');
}
`;
 const x=at('r3-'+v.name,{'packages/xtdb/src/run.ts':code});
 const a=auth('r3-auth-'+v.name,[x.commit]);
 const r=q(x,{authorityRef:a,keepIsolation:true});
 assert.ok(fs.existsSync(marker),'candidate completed the final-use operation');
 const observations=fs.readFileSync(marker,'utf8').trim().split('\n').map(line=>{
   const o=JSON.parse(line), original=Buffer.from(o.original,'base64'), different=Buffer.from(o.different,'base64');
   let stat=null,actual=null,readError=null;
   try{stat=fs.lstatSync(o.path);}catch{}
   try{actual=fs.readFileSync(o.path);}catch(e){readError=e.code;}
   return {path:o.path,originalLength:original.length,originalSha256:sha256(original),differentLength:different.length,differentSha256:sha256(different),entryExists:!!stat,symlink:stat?.isSymbolicLink()??false,linkTarget:stat?.isSymbolicLink()?fs.readlinkSync(o.path):null,actualLength:actual?.length??null,actualSha256:actual?sha256(actual):null,readError,renamedFileExists:fs.existsSync(o.path+'.renamed'),bytesEqual:actual?.equals(original)??false};
 });
 record(v.name,r,{expectedRejected:v.reject,allCasesPassed:r.run.cases.length>0&&r.run.cases.every(c=>c.verdict==='PASS'),cases:r.run.cases.length,observations,isolation:r.run.isolation});
 assert.ok(observations.length>0);
 assert.ok(r.run.cases.length>0&&r.run.cases.every(c=>c.verdict==='PASS'),'comparison failures must not explain rejection');
 if(v.name==='rewrite-identical-length')assert.ok(observations.every(o=>o.originalLength===o.actualLength&&!o.bytesEqual));
 if(v.name.startsWith('symlink'))assert.ok(observations.every(o=>o.symlink),'the original pathname was replaced by a link');
 if(v.name==='rename')assert.ok(observations.every(o=>!o.entryExists&&o.renamedFileExists));
 if(v.reject){
   assert.equal(r.offlineVerdict,'DIAGNOSTIC',JSON.stringify(r.reasons));
   assert.deepEqual([...new Set(codes(r))].sort(),['GATE-NOT-RUN','INPUT-TAMPERED','RUN-NOT-ON-GATE']);
   assert.ok(observations.every(o=>!o.bytesEqual));
 }else{
   assert.equal(r.offlineVerdict,'QUALIFIED',JSON.stringify(r.reasons));
   assert.deepEqual([...new Set(codes(r))].sort(),['GATE-NOT-RUN','RUN-NOT-ON-GATE']);
   assert.ok(observations.every(o=>o.bytesEqual));
 }
 assert.equal(r.verdict,'DIAGNOSTIC','top-level acceptance is still unavailable');
});

