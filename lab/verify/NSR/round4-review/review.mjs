// [CX-VNSR-5] Why: retain independent observations for the exact reviewed runtime and fresh local fixtures. Rejected: adopting builder PASS summaries as fresh review results.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { buildDriver } from '../../../bench/ns-driver/build.mjs';
import { launchArtifact } from '../../../bench/ns-driver/launch-artifact.mjs';
import { runFilesystemControls } from '../round4/filesystem-controls.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const root = fs.realpathSync(process.cwd());
const out = path.resolve(process.argv[2]);
fs.mkdirSync(out, { recursive: true });
assert.equal(fs.readdirSync(out).length, 0, 'fresh evidence root required');
const target = '155c1be9';
const sourcePaths = cp.execFileSync('git', ['ls-tree', '-r', '--name-only', target, 'lab/bench/ns-driver', 'lab/verify/NSR/round4/filesystem-controls.mjs', 'lab/verify/NSR/round3/reviewer-artifacts.mjs', 'pnpm-lock.yaml'], {encoding:'utf8'}).trim().split('\n');
const sources = Object.fromEntries(sourcePaths.map(p => {
  const expected = sha(cp.execFileSync('git', ['show', target + ':' + p]));
  assert.equal(sha(fs.readFileSync(p)), expected, p);
  return [p, expected];
}));
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
save('source-hashes.json', {target, root, node: process.version, sources});
fs.mkdirSync(path.join(out,'reviewer-sources'));
for(const name of ['review.mjs','opens.c']) fs.copyFileSync(path.join(import.meta.dirname,name),path.join(out,'reviewer-sources',name));
const dylib = path.join(out, 'opens.dylib');
cp.execFileSync('/usr/bin/clang', ['-dynamiclib', '-Wall', '-O2', 'lab/verify/NSR/round4-review/opens.c', '-o', dylib]);
const spawn = cp.spawn;
const launches = [];
const inspections = [];
let traced = false;
let inspectDescriptors = false;
cp.spawn = function(exe, args, options) {
  const row = {exe, args, options, traced};
  launches.push(row);
  const child = spawn(exe, args, traced ? {...options, env: {...options.env, DYLD_INSERT_LIBRARIES: dylib}} : options);
  row.pid = child.pid;
  if (inspectDescriptors) inspections.push(new Promise(resolve => setTimeout(() => {
    const r = cp.spawnSync('/usr/sbin/lsof', ['-a', '-p', String(child.pid), '-F', 'ftn'], {encoding:'utf8'});
    save('descriptors-' + child.pid + '.json', {status:r.status, stdout:r.stdout, stderr:r.stderr});
    resolve();
  }, 200)));
  return child;
};
syncBuiltinESMExports();

// [CX-VNSR-5] Why: every prior case needs a fresh outcome, including controls that still stop at the secondary hook. Rejected: inferring all thirteen outcomes from the three new builder tests.
let original = fs.readFileSync('lab/verify/NSR/round3/reviewer-artifacts.mjs', 'utf8');
const adapted = original.replace('const output = path.resolve(".cache/verify-nsr-r3", "artifacts-" + randomUUID());', 'const output = process.env.CX_CASES_OUT;').replace('assert.equal(result.code, 0, result.stderr);\n    assert.equal(fs.readFileSync(marker, "utf8"), "candidate executed");', 'assert.notEqual(result.code, 0, result.stderr);\n    assert.equal(executed, false);\n    assert.match(result.stderr, /ERR_ACCESS_DENIED/);\n    assert.match(result.stderr, /FileSystemRead/);\n    assert.ok(result.stderr.includes(candidate));');
assert.notEqual(adapted, original);
const caseScript = path.join(root, 'lab/verify/NSR/round4-review/round3-cases.mjs');
fs.writeFileSync(caseScript, adapted);
fs.copyFileSync(caseScript,path.join(out,'reviewer-sources','round3-cases.mjs'));
const prior = cp.spawnSync(process.execPath, [caseScript], {encoding:'utf8', env:{...process.env, CX_CASES_OUT:path.join(out,'round3-cases')}, maxBuffer:16*1024*1024});
fs.writeFileSync(path.join(out,'round3-cases.log'), prior.stdout + prior.stderr);
assert.equal(prior.status, 0, prior.stderr);
const priorResults=JSON.parse(fs.readFileSync(path.join(out,'round3-cases','results.json'))).results;
assert.equal(priorResults.length,13);
const controls = await runFilesystemControls(path.join(out, 'builder-controls'));
assert.equal(controls.length, 9);
save('builder-controls-summary.json', controls.map(x=>({kind:x.kind,code:x.code,stderr:x.stderr})));

// [CX-VNSR-5] Why: use real restricted stock-driver execution, local RPC and HMAC readback for the inventory observation. Rejected: treating a console-only artifact as proof about normal driver output.
const server = net.createServer({allowHalfOpen:true}, socket => {
  let bytes = '';
  socket.on('data', b => bytes += b);
  socket.on('end', () => {
    const q = JSON.parse(bytes);
    setTimeout(() => socket.end(JSON.stringify({schema:'ns-sut/1',runId:q.runId,id:q.id,ok:true,result:{pages:[]}})+'\n'), 350);
  });
  socket.on('error',()=>{});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const artifact = path.join(out,'stock-artifact');
  const manifest = buildDriver(artifact);
  save('stock-manifest.json', manifest);
  for (const trace of [false,true]) {
    const kind = trace ? 'traced' : 'exact';
    const keyFile = path.join(out,kind+'-key');
    const key = randomBytes(32); fs.writeFileSync(keyFile,key);
    const config = {offline:true,readers:0,trace:[],keyFile,output:path.join(out,kind+'-output'),binding:{runId:randomUUID(),sourceSha256:manifest.bundleSha256,inputsSha256:sha('local empty trace and consumer fixture'),slot:'offline-no-slot'},endpoints:{consumer:{host:'127.0.0.1',port:server.address().port}}};
    const file=path.join(out,kind+'-config.json'); save(kind+'-config.json',config);
    traced=trace;
    inspectDescriptors=true;
    const result=await launchArtifact(artifact,file);
    traced=false;
    inspectDescriptors=false;
    save(kind+'-result.json',result);
    assert.equal(result.code,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).status,'DIAGNOSTIC');
    const receipt=result.layoutReceipt;
    const files=fs.readdirSync(receipt.layout).sort();
    assert.deepEqual(files,Object.keys(receipt.files).sort());
    const links=[];
    for(const name of files) {
      const p=path.join(receipt.layout,name), st=fs.lstatSync(p);
      if(st.isSymbolicLink()) links.push({p,target:fs.realpathSync(p)});
      assert.equal(st.isFile(),true,p);
      assert.equal(sha(fs.readFileSync(p)),receipt.files[name],p);
    }
    assert.equal(links.length,0);
    const seal=JSON.parse(fs.readFileSync(path.join(config.output,'seal.json')));
    let previous='0'.repeat(64);
    for(let i=0;i<seal.chunks;i++) {
      const {hmac,...body}=JSON.parse(fs.readFileSync(path.join(config.output,String(i).padStart(8,'0')+'.json')));
      assert.deepEqual(body.binding,config.binding);
      assert.equal(body.sequence,i); assert.equal(body.previous,previous);
      assert.equal(hmac,createHmac('sha256',key).update(JSON.stringify(body)).digest('hex'));
      previous=hmac;
    }
    assert.equal(seal.head,previous);
    if(trace) {
      const opens=result.stderr.split('\n').filter(x=>x.startsWith('CX_OPEN\t')).map(line=>{
        const [,op,fd,flags,errno,requested,actual]=line.split('\t');
        return {op,fd:Number(fd),flags:Number(flags),errno:Number(errno),requested,actual};
      });
      assert.ok(opens.length>0,'native tracer must be active');
      const successful=opens.filter(x=>x.fd>=0);
      const openedFiles=[...new Set(successful.map(x=>x.actual).filter(p=>p && fs.statSync(p).isFile()))].sort();
      const comparison=openedFiles.map(p=>({path:p,sha256:sha(fs.readFileSync(p)),inventoryHash:receipt.files[path.relative(receipt.layout,p)]??null}));
      for(const row of comparison.filter(x=>x.inventoryHash)) assert.equal(row.sha256,row.inventoryHash);
      assert.deepEqual(comparison.filter(x=>x.inventoryHash).map(x=>path.basename(x.path)).sort(),Object.keys(receipt.files).sort());
      const writes=successful.filter(x=>(x.flags&3)!==0);
      assert.ok(writes.length>0);
      assert.ok(writes.every(x=>x.actual.startsWith(config.output+path.sep)));
      save('opened-set.json',{instrumentation:'DYLD open/openat interposition, exact child grants and stock artifact; OS runtime/base opens recorded separately',opens,comparison,writes,links,outputFiles:fs.readdirSync(config.output)});
    }
  }
} finally { await new Promise(resolve=>server.close(resolve)); }

const envelope=path.join(out,'envelope'); fs.mkdirSync(envelope);
const envelopeEntry=path.join(envelope,'entry.mjs');
fs.writeFileSync(envelopeEntry,`console.log(JSON.stringify({env:process.env,argv:process.argv,execArgv:process.execArgv,cwd:process.cwd()}));`);
const envelopeKey=path.join(envelope,'key'); fs.writeFileSync(envelopeKey,randomBytes(32));
const envelopeConfig=path.join(envelope,'config.json');
fs.writeFileSync(envelopeConfig,JSON.stringify({keyFile:envelopeKey,output:path.join(envelope,'output')}));
const envelopeArtifact=path.join(envelope,'artifact'); buildDriver(envelopeArtifact,envelope,envelopeEntry);
const envelopeResult=await launchArtifact(envelopeArtifact,envelopeConfig);
assert.equal(envelopeResult.code,0,envelopeResult.stderr);
save('envelope-result.json',{...envelopeResult,observed:JSON.parse(envelopeResult.stdout)});

// [CX-VNSR-5] Why: validate the literal output grant against a legal directory name containing a wildcard. Rejected: assuming an arbitrary config path is a literal permission path.
const wildcardRoot=path.join(out,'wildcard'); fs.mkdirSync(wildcardRoot);
const wildcardOutput=path.join(wildcardRoot,'out*'); fs.mkdirSync(wildcardOutput);
const sibling=path.join(wildcardRoot,'outside'); fs.mkdirSync(sibling);
const marker=path.join(sibling,'marker');
const entry=path.join(wildcardRoot,'entry.mjs');
fs.writeFileSync(entry,`import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'outside output marker',{flag:'wx'}); console.log('fixture completed');`);
const key=path.join(wildcardRoot,'key'); fs.writeFileSync(key,randomBytes(32));
const config=path.join(wildcardRoot,'config.json'); fs.writeFileSync(config,JSON.stringify({keyFile:key,output:wildcardOutput}));
const artifact=path.join(wildcardRoot,'artifact'); buildDriver(artifact,wildcardRoot,entry);
const result=await launchArtifact(artifact,config);
save('wildcard-result.json',{...result,marker,markerExists:fs.existsSync(marker),markerBytes:fs.existsSync(marker)?fs.readFileSync(marker,'utf8'):null,outputFiles:fs.readdirSync(wildcardOutput)});
assert.equal(result.code,0,result.stderr);
assert.equal(fs.readFileSync(marker,'utf8'),'outside output marker');
assert.deepEqual(fs.readdirSync(wildcardOutput),[]);

await Promise.all(inspections);
save('launches.json',launches);
for(const [p,hash] of Object.entries(sources)) assert.equal(sha(fs.readFileSync(p)),hash,p+' changed during review');
const evidence=fs.readFileSync('lab/experiments/EXP-NSR/round4/SHA256SUMS','utf8').trim().split('\n');
for(const line of evidence) {
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line); assert.ok(match,line);
  assert.equal(sha(fs.readFileSync(path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round4',match[2]))),match[1],match[2]);
}
const acceptanceDiff=cp.execFileSync('git',['diff',target,'--','lab/acceptance'],{encoding:'utf8'});
assert.equal(acceptanceDiff,'');
save('summary.json',{target,sourcesVerified:Object.keys(sources).length,builderEvidenceFilesVerified:evidence.length,round3Cases:priorResults.length,builderControls:controls.length,normalStockRuns:2,wildcardOutputBoundaryFailed:fs.existsSync(marker),acceptanceChanged:acceptanceDiff!==''});
console.log(JSON.stringify({out,status:'review observations complete; output-boundary counterexample recorded'}));
