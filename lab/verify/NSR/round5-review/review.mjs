// [CX-VNSR-5-R5] Why: independently replay the two round-4 findings and compare actual child state with the grant ledger and receipt. Rejected: accepting launcher intent or builder PASS counts alone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildDriver } from '../../../bench/ns-driver/build.mjs';
import { launchArtifact } from '../../../bench/ns-driver/launch-artifact.mjs';
import { runEnvelopeControls } from '../round5/envelope-controls.mjs';

const target='709a18f17eec40a7b6af17587a86578c2bf0af1c';
const root=path.resolve(process.argv[2]);
fs.mkdirSync(root,{recursive:true});
assert.deepEqual(fs.readdirSync(root),[],'fresh attempt required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n');
fs.copyFileSync(import.meta.filename,path.join(root,'reviewer-source.mjs'));
const paths=cp.execFileSync('git',['ls-tree','-r','--name-only',target,'lab/bench/ns-driver','lab/verify/NSR/round5/envelope-controls.mjs','lab/experiments/EXP-NSR/round5/PERMISSIONS.md','lab/experiments/EXP-NSR/round5/EVIDENCE.md','pnpm-lock.yaml'],{encoding:'utf8'}).trim().split('\n');
const sources=Object.fromEntries(paths.map(p=>{
  const expected=sha(cp.execFileSync('git',['show',target+':'+p]));
  assert.equal(sha(fs.readFileSync(p)),expected,p);
  return [p,expected];
}));
save('source-hashes.json',{target,node:process.version,sources});
const ledger=fs.readFileSync('lab/experiments/EXP-NSR/round5/PERMISSIONS.md','utf8');
for(const token of ['`--permission`','`--allow-fs-read=<layout>`','`--allow-fs-write=<output>`','`PATH`','`__CF_USER_TEXT_ENCODING`','`NSR_DARWIN_BOOT_ID`']) assert.ok(ledger.includes(token),token);
fs.writeFileSync(path.join(root,'PERMISSIONS.md'),ledger);
const spawn=cp.spawn,launches=[];
cp.spawn=function(exe,args,options){
  launches.push(structuredClone({exe,args,options}));
  return spawn(exe,args,options);
};
syncBuiltinESMExports();

function fixture(name,body){
  const dir=path.join(root,name); fs.mkdirSync(dir);
  const entry=path.join(dir,'entry.mjs'); fs.writeFileSync(entry,body);
  const artifact=path.join(dir,'artifact'); const manifest=buildDriver(artifact,dir,entry);
  const keyFile=path.join(dir,'key'); fs.writeFileSync(keyFile,randomBytes(32));
  const config=path.join(dir,'config.json');
  const configure=output=>fs.writeFileSync(config,JSON.stringify({keyFile,output}));
  return {dir,artifact,manifest,keyFile,config,configure};
}
const refusals=[];
function refused(name,f,pattern){
  const count=launches.length;
  let caught;
  try{f();}catch(error){caught=error;}
  assert.ok(caught,name+' must refuse');
  assert.match(caught.message,pattern);
  assert.equal(launches.length,count,name+' must refuse before spawn');
  refusals.push({name,code:caught.code??null,error:caught.message,childSpawned:false});
}

// [CX-VNSR-5-R5] Why: use the original counterexample body and output names, changing only the expected judgment. Rejected: substituting a different case that cannot reach the original boundary.
const wildcardRoot=path.join(root,'wildcard');
const wildcardOutput=path.join(wildcardRoot,'out*');
const sibling=path.join(wildcardRoot,'outside');
const marker=path.join(sibling,'marker');
const old=fixture('wildcard',`import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'outside output marker',{flag:'wx'}); console.log('fixture completed');`);
fs.mkdirSync(wildcardOutput); fs.mkdirSync(sibling); old.configure(wildcardOutput);
refused('round4-literal-star-precreated',()=>launchArtifact(old.artifact,old.config),/wildcard permission path refused/);
assert.equal(fs.existsSync(marker),false);
assert.deepEqual(fs.readdirSync(wildcardOutput),[]);
const absentStar=path.join(old.dir,'absent*'); old.configure(absentStar);
refused('literal-star-absent',()=>launchArtifact(old.artifact,old.config),/wildcard permission path refused/);
assert.equal(fs.existsSync(absentStar),false);
const parentStar=path.join(old.dir,'parent*','output'); old.configure(parentStar);
refused('output-parent-star',()=>launchArtifact(old.artifact,old.config),/wildcard permission path refused/);
assert.equal(fs.existsSync(path.dirname(parentStar)),false);
const nestedArtifact=path.join(old.dir,'layout*','artifact'); fs.mkdirSync(nestedArtifact,{recursive:true});
for(const name of fs.readdirSync(old.artifact))fs.copyFileSync(path.join(old.artifact,name),path.join(nestedArtifact,name));
const unused=path.join(old.dir,'unused'); old.configure(unused);
refused('layout-parent-star',()=>launchArtifact(nestedArtifact,old.config),/wildcard permission path refused/);
assert.equal(fs.existsSync(unused),false);

// [CX-VNSR-5-R5] Why: the child itself reports its complete environment/argv while actual writes exercise the one-directory grant. Rejected: comparing a receipt with another copy of the launcher's environment object.
const envelope=fixture('envelope',`import fs from 'node:fs'; import path from 'node:path';
const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const failures=[];
for(const resource of [path.join(path.dirname(c.output),'sibling-marker'),c.output+'-sibling-marker']) {
 try {fs.writeFileSync(resource,'outside output marker',{flag:'wx'}); failures.push({resource,wrote:true});}
 catch(e){failures.push({resource,code:e.code,permission:e.permission});}
}
let readDenial;
try{fs.readdirSync(c.output);}catch(e){readDenial={code:e.code,permission:e.permission,resource:e.resource};}
fs.writeFileSync(path.join(c.output,'inside'),'expected output',{flag:'wx'});
console.log(JSON.stringify({env:process.env,argv:process.argv,execArgv:process.execArgv,cwd:process.cwd(),failures,readDenial,childPermission:process.permission.has('child'),workerPermission:process.permission.has('worker')}));`);
const parentBefore={};
for(const name of ['PATH','NSR_PARENT_SENTINEL','NODE_OPTIONS','NODE_PATH','__CF_USER_TEXT_ENCODING'])parentBefore[name]=process.env[name];
const boot=cp.execFileSync('/usr/sbin/sysctl',['-n','kern.bootsessionuuid'],{encoding:'utf8'}).trim();
const observedRuns=[];
try{
  process.env.PATH='/parent/tools/must-not-propagate';
  process.env.NSR_PARENT_SENTINEL='must-not-propagate';
  process.env.NODE_OPTIONS='--trace-warnings';
  process.env.NODE_PATH='/parent/modules/must-not-propagate';
  process.env.__CF_USER_TEXT_ENCODING='0x0:0x0:0x0';
  for(const name of ['output-a','output-b']){
    const output=path.join(envelope.dir,name); envelope.configure(output);
    fs.copyFileSync(envelope.config,path.join(envelope.dir,name+'-config-preimage.json'));
    assert.equal(fs.existsSync(output),false);
    const launchIndex=launches.length;
    const result=await launchArtifact(envelope.artifact,envelope.config);
    save(name+'-result.json',result);
    assert.equal(result.code,0,result.stderr);
    const observed=JSON.parse(result.stdout),receipt=result.layoutReceipt,captured=launches[launchIndex];
    const expectedEnv={PATH:'',NSR_BUNDLE_MANIFEST:path.join(receipt.layout,'manifest.json'),NSR_LAYOUT_SHA256:receipt.inventorySha256,NSR_LAYOUT_ROOT:receipt.layout,NSR_FRESH_OUTPUT:output,__CF_USER_TEXT_ENCODING:`0x${process.getuid().toString(16).toUpperCase()}:0x0:0x0`,NSR_DARWIN_BOOT_ID:boot};
    const grants=[{flag:'--allow-fs-read='+receipt.layout,reason:'Read the closed artifact, audit, manifests and declared evaluator data only'},{flag:'--allow-fs-write='+output,reason:'Create HR chunks and seal in this exclusively created, write-only output directory'}];
    const flags=['--permission',...grants.map(x=>x.flag),'--import',pathToFileURL(path.join(receipt.layout,'layout-audit.mjs')).href,'--import',pathToFileURL(path.join(receipt.layout,'runtime-guard.mjs')).href];
    assert.deepEqual(observed.env,expectedEnv);
    assert.deepEqual(receipt.environment,expectedEnv);
    assert.deepEqual(captured.options.env,expectedEnv);
    assert.deepEqual(receipt.permissions,grants);
    assert.deepEqual(observed.execArgv,flags);
    assert.deepEqual(captured.args,[...flags,path.join(receipt.layout,'driver.mjs'),path.join(receipt.layout,'config.json')]);
    assert.deepEqual(observed.argv,[process.execPath,path.join(receipt.layout,'driver.mjs'),path.join(receipt.layout,'config.json')]);
    assert.equal(observed.cwd,receipt.layout);
    assert.equal(captured.exe,receipt.runtimeExceptions.executable);
    assert.deepEqual(captured.options.stdio,['ignore','pipe','pipe']);
    assert.equal(observed.childPermission,false); assert.equal(observed.workerPermission,false);
    for(const failure of observed.failures){
      assert.deepEqual(failure,{resource:failure.resource,code:'ERR_ACCESS_DENIED',permission:'FileSystemWrite'});
      assert.equal(fs.existsSync(failure.resource),false);
    }
    assert.deepEqual(observed.readDenial,{code:'ERR_ACCESS_DENIED',permission:'FileSystemRead',resource:output});
    assert.equal(fs.readFileSync(path.join(output,'inside'),'utf8'),'expected output');
    assert.deepEqual(fs.readdirSync(output),['inside']);
    assert.deepEqual(fs.readdirSync(receipt.layout).sort(),Object.keys(receipt.files).sort());
    for(const [file,hash]of Object.entries(receipt.files))assert.equal(sha(fs.readFileSync(path.join(receipt.layout,file))),hash);
    assert.equal(receipt.sourceConfigSha256,sha(fs.readFileSync(path.join(envelope.dir,name+'-config-preimage.json'))));
    assert.equal(receipt.bundleSha256,envelope.manifest.bundleSha256);
    assert.deepEqual(JSON.parse(fs.readFileSync(receipt.layout+'.receipt.json')),receipt);
    refused(name+'-populated-reuse',()=>launchArtifact(envelope.artifact,envelope.config),/EEXIST/);
    observedRuns.push({name,observed,receipt,launchIndex});
  }
}finally{
  for(const [name,value]of Object.entries(parentBefore)){if(value===undefined)delete process.env[name];else process.env[name]=value;}
}
assert.notEqual(observedRuns[0].receipt.layout,observedRuns[1].receipt.layout);
const empty=path.join(envelope.dir,'already-empty'); fs.mkdirSync(empty); envelope.configure(empty);
refused('empty-output-reuse',()=>launchArtifact(envelope.artifact,envelope.config),/EEXIST/);
save('reviewer-refusals.json',refusals);
save('reviewer-observations.json',observedRuns);
save('captured-launches.json',launches);

const builder=await runEnvelopeControls(path.join(root,'builder-controls'));
assert.equal(builder.length,8);
save('builder-summary.json',builder.map(x=>({kind:x.kind,code:x.code??null})));
const sums=fs.readFileSync('lab/experiments/EXP-NSR/round5/SHA256SUMS','utf8').trim().split('\n');
for(const line of sums){
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line); assert.ok(match,line);
  assert.equal(sha(fs.readFileSync(path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round5',match[2]))),match[1],match[2]);
}
for(const [p,hash]of Object.entries(sources))assert.equal(sha(fs.readFileSync(p)),hash,p+' changed during review');
assert.equal(cp.execFileSync('git',['diff',target,'--','lab/bench','lab/acceptance'],{encoding:'utf8'}),'');
save('summary.json',{target,node:process.version,bundler:envelope.manifest.bundler,sourceFiles:Object.keys(sources).length,independentRefusals:refusals.length,observedChildRuns:observedRuns.length,builderControls:builder.length,builderEvidenceHashesVerified:sums.length,verdict:'ACCEPT-OFFLINE',scope:'round4 findings R4-F1 and R4-F2 on macOS; no NS/G03 acceptance'});
console.log(JSON.stringify({root,verdict:'ACCEPT-OFFLINE',independentRefusals:refusals.length,observedChildRuns:observedRuns.length,builderControls:builder.length}));
