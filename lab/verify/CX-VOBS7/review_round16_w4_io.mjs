// [CX-VOBS7-R16] Why: inject a WAL-copy I/O failure into the actual w4Trial function with all VM/container operations stubbed. Rejected: assuming an absent local file proves absence on the recovered volume.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(root+'lab/bin/sync-witness.mjs','utf8');
const at=source.indexOf('async function w4Trial('),end=source.indexOf('/** engine.mjs',at);assert.ok(at>0&&end>at);

test('R16-F2 actual harness refuses a failed WAL copy rather than adopting it as OFF crash loss',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cx-vobs7-r16-io-')),calls=[],fds=[];
 try{
  const program=`import sys,json,os\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nimport vm_fixture as f,vm_normalizer as n,test_w4 as t\np=Path(sys.argv[2]);main=p/'broker.db';wal=p/'broker.db-wal';db=f.seed(main);ends=[]\nfor i in range(1,201):f.commit(db,i);ends.append(wal.stat().st_size)\ndev=wal.stat().st_dev;wi=wal.stat().st_ino;mi=main.stat().st_ino;di=p.stat().st_ino\n(p/'main.bin').write_bytes(main.read_bytes());(p/'wal.bin').write_bytes(wal.read_bytes())\nprint(json.dumps({'dir':[n.kernel_dev(dev),di],'trace':t.trace_text(ends,dev,wi,mi,di,0,partial=False),'stream':t.stream_text(ends,dev,wi,mi,di,partial=False)}))\n`;
  const made=spawnSync('python3',['-B','-c',program,root+'lab/observer',temp],{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
  const input=JSON.parse(made.stdout),out=path.join(temp,'out');let clock=0;
  const sandbox={fs,path,randomBytes:crypto.randomBytes,SOCK:'UNUSED-MOCK',SRC:root+'lab/observer',Date:{now:()=>clock+=10000},
   reserve:async()=>{},remove:async()=>{},makeStoreDir:async()=>input.dir,verifyWitnessProfile:()=>[],inspect:()=>({Id:'mock-writer'}),
   vmCgroupId:()=>4242,vm:()=>({status:0,stdout:'mock-boot-id\n'}),sleep:async()=>{},
   harden:()=>[],witnessCreateArgs:()=>[],atomicJson:(f,v)=>fs.writeFileSync(f,JSON.stringify(v)),
   fail:(code,message)=>{throw new Error(code+': '+message);},ackLines:t=>(t.match(/^A\|/gm)??[]).length,
   waitContent:async(file,check)=>{const text=fs.readFileSync(file,'utf8');assert.ok(check(text));return text;},
   spawn:(command,argv,options)=>{
    assert.equal(command,'docker');assert.equal(argv[2],'start');
    fs.writeFileSync(options.stdio[1],argv.at(-1).includes('-w4w-')?input.trace:input.stream);fds.push(...options.stdio.slice(1));
    return {kill:()=>{}};
   },
   docker:(argv,options)=>{
    calls.push({argv,options:options??null});
    if(argv[0]==='cp'){
     if(argv[1].endsWith('broker.db-wal')){if(!options?.allowFail)throw new Error('simulated WAL copy I/O error');return null;}
     fs.copyFileSync(path.join(temp,'main.bin'),argv[2]);return '';
    }
    if(argv[0]==='volume'&&argv[1]==='inspect')return null;
    return '';
   },
   py:(script,...args)=>{
    const c=spawnSync('python3',['-B',script,...args],{encoding:'utf8'});return {status:c.status,stdout:c.stdout,stderr:c.stderr};
   },
  };
  const trial=vm.runInNewContext(source.slice(at,end)+'\nw4Trial',sandbox,{filename:'actual-w4Trial-with-offline-stubs.mjs'});
  let result,refused=null;
  try{result=await trial({config:{},holder:'CX-VOBS7',python:'mock-python',bpftrace:'mock-bpftrace',out,nonce:'io-test'},{index:2,mode:'off',rehearsal:true});}
  catch(error){refused=String(error);}
  const snapshot={reviewedFunctionSha256:crypto.createHash('sha256').update(source.slice(at,end)).digest('hex'),actualRecoveredWalBytes:fs.statSync(path.join(temp,'wal.bin')).size,
   result:result??null,refused,calls,claim:'offline I/O fault injection; every Docker/VM operation is a stub; only Python SQLite/judge executes locally'};
  fs.writeFileSync(path.join(here,'round16/w4-actual-harness-io.json'),JSON.stringify(snapshot,null,2)+'\n');
  assert.ok(refused||!result?.pass,'the actual w4Trial returned pass with 200 false lost OFF commits after a simulated WAL-copy failure');
 }finally{
  for(const fd of fds)try{fs.closeSync(fd);}catch{}
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
