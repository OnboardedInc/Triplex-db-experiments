// [CX-VOBS7-R15] Why: continue the remaining audit after the original retained test established the wrong auxiliary stdout hash. Rejected: changing the implementation or discarding the first failing assertion.
// [CX-VOBS7-R15] Why: audit this recorded golden artifact and pure harness argument builders offline. Rejected: promoting the production diagnostic parser or running containers during review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {COMPILE_FLAGS,sourceTimeSites,forbiddenClockTokens,sha256Hex} from '../../bin/clock-proof.mjs';
import {witnessCreateArgs,ext4BuiltinVerdict,PROGRAM,WITNESS_MEMORY} from '../../bin/sync-witness.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),evidence='/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W';
const out=path.join(import.meta.dirname,'round15'),golden=path.join(root,'lab/observer/golden');
const read=p=>fs.readFileSync(p,'utf8'),load=p=>JSON.parse(read(p)),hash=p=>sha256Hex(fs.readFileSync(p));
function save(name,data){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(data,null,2)+'\n');}
function splitDump(raw){const a='--- stdout ---\n',b='\n--- stderr ---\n';assert.ok(raw.startsWith(a)&&raw.endsWith('\n'));const k=raw.indexOf(b,a.length);assert.ok(k>=0);return {stdout:raw.slice(a.length,k),stderr:raw.slice(k+b.length,-1)};}

test('golden: exact hashes, optimized IR identity, complete helper inventory and recorded Q109a gate',()=>{
 const manifest=load(path.join(golden,'MANIFEST.json')),file=path.join(golden,manifest.dumpFile),raw=read(file),{stdout,stderr}=splitDump(raw);
 assert.equal(hash(file),manifest.dumpFileSha256);assert.equal(Buffer.byteLength(raw),manifest.dumpFileBytes);save('stdout-hash-finding',{path:'lab/observer/golden/MANIFEST.json',recorded:manifest.stdoutSha256,actual:sha256Hex(Buffer.from(stdout)),fullDumpHashMatches:hash(file)===manifest.dumpFileSha256});assert.notEqual(sha256Hex(Buffer.from(stdout)),manifest.stdoutSha256);
 const scanned=[stdout,stderr].filter(Boolean).join('\n');assert.equal(sha256Hex(Buffer.from(scanned)),manifest.compiledSha256_scanned_by_verdict);
 assert.deepEqual(COMPILE_FLAGS,['-d']);assert.deepEqual(sourceTimeSites(read(PROGRAM)),{monotonic:15,other:[]});assert.equal(hash(PROGRAM),manifest.pinnedProgramSha256);assert.deepEqual(forbiddenClockTokens(scanned),[]);
 const marker="; ModuleID = 'bpftrace'",ir=stdout.slice(stdout.indexOf(marker));assert.equal(stdout.split(marker).length,2);
 const short=read(path.join(evidence,'flag-check/c-d.out')),verbose=read(path.join(evidence,'flag-check/c-dd.out'));
 const shortIr=short.slice(short.indexOf(marker)),after=verbose.slice(verbose.indexOf('After optimization\n')),afterIr=after.slice(after.indexOf(marker));
 assert.equal(shortIr,afterIr);assert.equal(ir,shortIr);assert.equal(verbose.split(marker).length,3);
 const kernel=load(path.join(golden,manifest.enumFile));assert.equal(hash(path.join(golden,manifest.enumFile)),manifest.enumFileSha256);assert.equal(kernel.btfSha256,manifest.btfSha256);assert.equal(kernel.ok,true);
 const byId=new Map(Object.entries(kernel.ids).map(([n,id])=>[id,n])),functions=[],totals={},intrinsics={};let current=null;
 for(const line of ir.split('\n')){
  if(line.startsWith('define ')){assert.equal(current,null);current={header:line,helperCounts:{},monotonicSites:0};}
  if(!current)continue;
  if(/\bcall\b/.test(line)){
   const m=/\bcall\b[^\n]*?inttoptr \(i64 (\d+) to ptr\)/.exec(line);
   if(m){const id=Number(m[1]),name=byId.get(id);assert.ok(name);totals[name]=(totals[name]??0)+1;current.helperCounts[name]=(current.helperCounts[name]??0)+1;if(id===5)current.monotonicSites++;}
   else {const intrinsic=/\bcall\b[^\n]*?@(llvm\.[A-Za-z0-9_.]+)\(/.exec(line);assert.ok(intrinsic,'unaccounted call: '+line);assert.ok(['llvm.lifetime.start.p0','llvm.lifetime.end.p0','llvm.bpf.pseudo','llvm.memset.p0.i64'].includes(intrinsic[1]));intrinsics[intrinsic[1]]=(intrinsics[intrinsic[1]]??0)+1;}
  }
  if(line==='}'){functions.push(current);current=null;}
 }
 assert.equal(current,null);assert.equal(functions.length,15);assert.ok(functions.every(f=>f.monotonicSites===1));assert.equal(totals.bpf_ktime_get_ns,15);
 const expected=Object.fromEntries(Object.entries(manifest.helperIdsInIR).map(([k,v])=>[k.split(' ')[1],v]));assert.deepEqual(totals,expected);
 for(const name of Object.keys(totals))assert.ok(!/(?:ktime|jiffies)/.test(name)||name==='bpf_ktime_get_ns');
 const runs=[];
 for(const p of ['w0-attempt6','resized/w0w2-attempt1']){
  const w=load(path.join(evidence,p,'W0.json')),c=w.clockProgram,v=c.verdict;assert.equal(hash(path.join(evidence,p,'w0-compiled-program.txt')),hash(file));assert.equal(c.dumpFileSha256,hash(file));
  assert.equal(c.image,manifest.image);assert.equal(v.pass,true);assert.deepEqual(v.reasons,[]);assert.deepEqual(v.flags,['-d']);assert.equal(v.version,'bpftrace v0.20.2');assert.equal(v.sourceSha256,hash(PROGRAM));assert.equal(v.expectedSourceSha256,hash(PROGRAM));
  assert.ok(Object.values(c.exitCodes).every(x=>x===0));assert.ok(Object.values(v.processes).every(x=>x.ok===true));assert.equal(v.sourceMonotonicSites,15);assert.deepEqual(v.gate.forbiddenTokenHits,[]);assert.equal(v.compiledSha256,sha256Hex(Buffer.from(scanned)));assert.equal(v.compiledBytes,Buffer.byteLength(scanned));
  assert.equal(hash(path.join(evidence,p,'w0-bpf-func-id-enum.json')),manifest.enumFileSha256);assert.equal(v.btfSha256,kernel.btfSha256);assert.equal(v.diagnostic.pass,false);assert.equal(w.pass,true);
  for(const [name,id] of Object.entries(v.helperIds))assert.equal(kernel.ids[name],id);
  runs.push({path:p,exitCodes:c.exitCodes,processes:v.processes,sourceSha256:v.sourceSha256,btfSha256:v.btfSha256,diagnosticReasonCount:v.diagnostic.reasons.length,transport:w.verdict.checks.clockTransport.status});
 }
 save('golden-audit',{dumpSha256:hash(file),stdoutSha256:manifest.stdoutSha256,scannedSha256:sha256Hex(Buffer.from(scanned)),optimizedIrSha256:sha256Hex(Buffer.from(ir)),
  shortVerboseOptimizedIrIdentical:true,functions,helperCounts:totals,intrinsicCounts:intrinsics,kernelClockIds:manifest.kernelEnumNames,runs,
  limit:'Recorded process verdicts are checked; no new process was run and raw kernel BTF was not retained. This artifact-specific inventory is not a production parser promotion.'});
});

test('harness: redirect preserves argv/exec, memlock adds no capability, exact-direction aliases stay exact',()=>{
 const args=witnessCreateArgs({name:'tx2-review-witness',holder:'CX-VOBS7-R15',image:'sha256:'+'1'.repeat(64),cpu:5,volume:'tx2-review-volume',dirs:[[10,20]]});
 const values=flag=>args.flatMap((x,i)=>x===flag?[args[i+1]]:[]);
 assert.deepEqual(values('--cap-add'),['BPF','PERFMON']);assert.deepEqual(values('--cap-drop'),['ALL']);assert.deepEqual(values('--ulimit'),['memlock=-1:-1']);assert.deepEqual(values('--entrypoint'),['sh']);
 assert.ok(args.includes('--read-only'));assert.deepEqual(values('--network'),['none']);assert.deepEqual(values('--memory'),[String(WITNESS_MEMORY)]);
 const command=args.indexOf('-c');assert.ok(command>0);assert.deepEqual(args.slice(command),['-c','exec bpftrace -q -B none "$@" > /witness/trace.txt','sh','/program/vm_syncwitness.bt','10','20','10','20']);
 for(const [probe,alias] of [['fentry:vmlinux:ext4_sync_fs','kfunc:vmlinux:ext4_sync_fs'],['fexit:vmlinux:ext4_sync_fs','kretfunc:vmlinux:ext4_sync_fs']]){
  assert.equal(ext4BuiltinVerdict({ext4BtfPresent:false,listing:{[probe]:alias}}).pass,true);
  for(const wrong of [alias.replace('ext4_sync_fs','ext4_other'),alias.replace(/^kfunc:/,'kretfunc:').replace(/^kretfunc:/,probe.startsWith('fentry')?'kretfunc:':'kfunc:')])assert.equal(ext4BuiltinVerdict({ext4BtfPresent:false,listing:{[probe]:wrong}}).pass,false);
 }
 save('harness-pure-controls',{args,capabilities:values('--cap-add'),memlock:values('--ulimit'),claim:'pure argv/profile controls only; no container created'});
});
