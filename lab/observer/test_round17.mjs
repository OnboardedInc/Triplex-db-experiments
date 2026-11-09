// [EXP-OBS01-R17] The ACTUAL w4Trial (extracted from sync-witness.mjs, every Docker/VM call a stub; only Python/SQLite runs) with a failing or short WAL copy, against the harness's own collection record and the real judge.
// Why: round 16's reviewer fixture (lab/verify/CX-VOBS7/review_round16_w4_io.mjs) injects one copy failure but its stub returns no receipt, so it is refused for the missing receipt rather than for the copy.
// These fixtures give the harness a VALID receipt and then break the copy in each way, so the refusal named is the copy's. Rejected: re-testing only the pure judge (the harness's collection step is where R16-F2 lived).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=fs.readFileSync(root+'lab/bin/sync-witness.mjs','utf8');
const at=source.indexOf('async function w4Trial('),end=source.indexOf('/** engine.mjs',at);assert.ok(at>0&&end>at);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

async function run({walCopy,receiptWal='present',mode='off',noReceipt=false}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'obs01-r17-')),fds=[];
 try{
  const program=`import sys,json\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nimport vm_fixture as f,vm_normalizer as n,test_w4 as t\np=Path(sys.argv[2]);main=p/'broker.db';wal=p/'broker.db-wal';db=f.seed(main);ends=[]\nfor i in range(1,201):f.commit(db,i);ends.append(wal.stat().st_size)\ndev=wal.stat().st_dev;wi=wal.stat().st_ino;mi=main.stat().st_ino;di=p.stat().st_ino\n(p/'main.bin').write_bytes(main.read_bytes());(p/'wal.bin').write_bytes(wal.read_bytes())\nprint(json.dumps({'dir':[n.kernel_dev(dev),di],'trace':t.trace_text(ends,dev,wi,mi,di,0,partial=False),'stream':t.stream_text(ends,dev,wi,mi,di,partial=False)}))\n`;
  const made=spawnSync('python3',['-B','-c',program,root+'lab/observer',temp],{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
  const input=JSON.parse(made.stdout),out=path.join(temp,'out'),main=fs.readFileSync(path.join(temp,'main.bin')),wal=fs.readFileSync(path.join(temp,'wal.bin'));
  const files={'broker.db':{size:main.length,sha256:sha(main)}};const listing=['broker.db'];
  if(receiptWal==='present'){files['broker.db-wal']={size:wal.length,sha256:sha(wal)};listing.push('broker.db-wal');}
  const receipt=JSON.stringify({format:'w4-receipt/1',listing,files});let clock=0;
  const sandbox={fs,path,randomBytes:crypto.randomBytes,SOCK:'UNUSED',SRC:root+'lab/observer',Date:{now:()=>clock+=10000},
   reserve:async()=>{},remove:async()=>{},makeStoreDir:async()=>input.dir,verifyWitnessProfile:()=>[],inspect:()=>({Id:'mock'}),vmCgroupId:()=>4242,vm:()=>({status:0,stdout:'boot\n'}),sleep:async()=>{},
   harden:()=>[],witnessCreateArgs:()=>[],atomicJson:(f,v)=>fs.writeFileSync(f,JSON.stringify(v)),fail:(c,m)=>{throw new Error(c+': '+m);},ackLines:t=>(t.match(/^A\|/gm)??[]).length,
   waitContent:async(file,check)=>{const text=fs.readFileSync(file,'utf8');assert.ok(check(text));return text;},
   spawn:(c,argv,options)=>{fs.writeFileSync(options.stdio[1],argv.at(-1).includes('-w4w-')?input.trace:input.stream);fds.push(...options.stdio.slice(1));return {kill:()=>{}};},
   docker:(argv,options)=>{
    if(argv[0]==='start'&&argv[1]==='-a')return noReceipt?'':receipt;
    if(argv[0]==='cp'){
     if(argv[1].endsWith('broker.db-wal')){const r=walCopy(argv[2],wal);return r;}
     fs.copyFileSync(path.join(temp,'main.bin'),argv[2]);return '';
    }
    if(argv[0]==='volume'&&argv[1]==='inspect')return null;
    return '';
   },
   py:(script,...args)=>{const c=spawnSync('python3',['-B',script,...args],{encoding:'utf8'});return {status:c.status,stdout:c.stdout,stderr:c.stderr};},
  };
  const trial=vm.runInNewContext(source.slice(at,end)+'\nw4Trial',sandbox,{filename:'w4Trial-offline.mjs'});
  const result=await trial({config:{},holder:'OBS01',python:'p',bpftrace:'b',out,nonce:'r17'},{index:2,mode,rehearsal:true});
  return {result,collection:JSON.parse(fs.readFileSync(path.join(out,'w4','02-'+mode,'collection.json'),'utf8')),acked:200};
 }finally{for(const fd of fds)try{fs.closeSync(fd);}catch{}fs.rmSync(temp,{recursive:true,force:true});}
}

test('a clean copy with a valid receipt is accepted and carries a verified collection record (control)',async()=>{
 const r=await run({walCopy:(dest,wal)=>{fs.writeFileSync(dest,wal);return '';}});
 assert.equal(r.result.pass,true,JSON.stringify(r.result.judge));assert.equal(r.result.judge.collection,'verified');assert.equal(r.result.judge.unwitnessedLostCount,0);assert.equal(r.collection.copy['broker.db-wal'],true);
});
test('R16-F2: a failed WAL copy refuses with COPY-FAILED, never as 200 lost OFF commits',async()=>{
 const r=await run({walCopy:()=>null});
 assert.equal(r.result.pass,false);assert.equal(r.result.judge.refusal,'COPY-FAILED');assert.equal(r.result.judge.unwitnessedLostCount,undefined);assert.equal(r.collection.copy['broker.db-wal'],false);
});
test('a short or altered WAL copy refuses with COPY-INCOMPLETE even if the copy command reported success',async()=>{
 for(const damage of [wal=>wal.subarray(0,wal.length>>1),wal=>{const b=Buffer.from(wal);b[b.length-1]^=1;return b;},wal=>Buffer.alloc(0)]){
  const r=await run({walCopy:(dest,wal)=>{fs.writeFileSync(dest,damage(wal));return '';}});
  assert.equal(r.result.pass,false);assert.match(r.result.judge.refusal,/^COPY-INCOMPLETE$|^COPY-FAILED$/);assert.equal(r.result.judge.unwitnessedLostCount,undefined);
 }
});
test('a WAL the volume receipt shows absent is accepted as absent (explicit evidence), flagged, and its commits count as lost',async()=>{
 const r=await run({receiptWal:'absent',walCopy:()=>null});
 assert.equal(r.result.pass,true,JSON.stringify(r.result.judge));assert.equal(r.result.judge.walAbsentConfirmed,true);assert.equal(r.result.judge.unwitnessedLostCount,200);
});
test('no receipt from the volume refuses with COLLECTION-RECEIPT-INVALID even though both files copied',async()=>{
 const r=await run({noReceipt:true,walCopy:(dest,wal)=>{fs.writeFileSync(dest,wal);return '';}});
 assert.equal(r.result.pass,false);assert.equal(r.result.judge.refusal,'COLLECTION-RECEIPT-INVALID');assert.ok(r.collection.receiptError);assert.equal(r.collection.receipt,null);
});
