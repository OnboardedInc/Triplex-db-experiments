// [CX-VE01-3] Why: test persistent edits after the final case use against 422c8d3. Rejected: changing evaluator code (review only).
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
process.on('exit',()=>{fs.writeFileSync(new URL('./supplement-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');try{execFileSync('chmod',['-R','u+rwX',root]);fs.rmSync(root,{recursive:true,force:true});}catch{}});


// [CX-VE01-3] Why: Q75j's claim that persistent edits are checked at the end must cover case inputs too. Rejected: only deleting a file that will be read again (misses the final-use gap).
for (const mutation of ['delete','rewrite']) test(`STRICT input integrity: ${mutation} after the final claimed-case use must be rejected`,()=>{
 const marker=path.join(root,`input-${mutation}`);
 const edit=mutation==='delete'?'fs.unlinkSync(process.argv[2]);':`fs.chmodSync(process.argv[2],0o644);fs.writeFileSync(process.argv[2],JSON.stringify({...c,p:c.p+1000}));`;
 const x=at(`strict-input-${mutation}`,{'packages/xtdb/src/run.ts':RUN+`\nif(String(c.case).startsWith('CS-SCOPE/') && process.argv[3]==='reopen'){${edit}fs.writeFileSync(${JSON.stringify(marker)},process.argv[2]);}\n`});
 const a=auth(`strict-input-${mutation}-auth`,[x.commit]);
 const r=q(x,{authorityRef:a,keepIsolation:true});
 assert.ok(fs.existsSync(marker),'attack executed');const changed=fs.readFileSync(marker,'utf8');
 const present=fs.existsSync(changed), bytes=present?fs.readFileSync(changed,'utf8'):null;
 record(`strict-input-${mutation}`,r,{changed,present,bytes,allCasesPassed:r.run.cases.every(c=>c.verdict==='PASS'),isolation:r.run.isolation});
 assert.equal(r.offlineVerdict,'DIAGNOSTIC',`persistent input ${mutation} must fail closed: ${JSON.stringify(r.reasons)}`);
 assert.ok(codes(r).some(c=>c==='INPUT-TAMPERED'||c==='EVIDENCE-MISSING'));
});

// [CX-VE01-3] Why: source-bound T3 must run round-two bytes with their own Git anchor. Rejected: replaying the old hard-coded 2796455 copy (cannot measure the fix).
test('F1 source-bound T3: a candidate edit to a transitive evaluator file is detected and blocks the next fresh process',()=>{
 const copy=path.join(root,'t3-round2');fs.mkdirSync(copy);
 for(const f of EVALUATOR_FILES){fs.mkdirSync(path.dirname(path.join(copy,f)),{recursive:true});fs.copyFileSync(path.join(WT,f),path.join(copy,f));}
 g(copy,['init','-q']);g(copy,['add','.']);g(copy,['commit','-qm','round-two evaluator anchor']);
 const target=path.join(copy,'lab/bin/engine.mjs');
 const x=at('source-bound-t3',{'build.mjs':BUILD+`\nfs.appendFileSync(${JSON.stringify(target)},'\\n// persistent edit by candidate\\n');\n`});
 const a=auth('source-bound-t3-auth',[x.commit]);
 const drive=(candidate,tag)=>{
 const script=`import {qualifyClaim,gitSource,localSut} from ${JSON.stringify('file://'+path.join(copy,'lab/bin/claim.mjs'))};const r=qualifyClaim(${JSON.stringify(claim(candidate))},{git:gitSource(${JSON.stringify(R.dir)}),authorityRef:${JSON.stringify(a)},workDir:${JSON.stringify(path.join(root,'t3-'+tag))},isolationRoot:${JSON.stringify(path.join(root,'t3-iso-'+tag))},sut:localSut(${JSON.stringify(spec)}),sandbox:false});console.log(JSON.stringify(r));`;
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',maxBuffer:32<<20}));
 };
 const first=drive(x,'attack');record('F1-T3-during-build',first);assert.ok(codes(first).includes('EVALUATOR-TAMPERED'));assert.equal(first.offlineVerdict,'DIAGNOSTIC');
 const second=drive(R.C2,'next');record('F1-T3-next-process',second);assert.ok(codes(second).includes('EVALUATOR-TAMPERED'));assert.equal(second.offlineVerdict,'DIAGNOSTIC');assert.equal(second.run.instances.length,0);assert.ok(codes(second).includes('GATE-NOT-RUN'));
});
