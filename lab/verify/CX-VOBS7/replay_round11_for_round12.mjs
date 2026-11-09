// [CX-VOBS7-R11] Why: exercise the compiled-clock proof with incomplete and failed compiler output before W0. Rejected: treating constructed parser samples as live compiler evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {clockPrimitiveVerdict,sha256Hex,FORBIDDEN_CLOCK_HELPERS} from '../../bin/clock-proof.mjs';
import {judgeW0} from '../../bin/sync-witness.mjs';
// [OBS01-R12] fixture adaptation (decisions 1 to 3): the proof now needs a sectioned dump, recorded version/hash/BTF process status and a kernel BTF blob. All CONSTRUCTED.
import {buildKernelLikeBtf} from '../../observer/btf_fixture.mjs';
import {sectionedDump} from '../../observer/dump_fixture.mjs';

const out=path.join(import.meta.dirname,'round12','prior-round11');
const source=fs.readFileSync(new URL('../../observer/vm_syncwitness.bt',import.meta.url),'utf8');
const ir=id=>`%time = call i64 inttoptr (i64 ${id} to i64 ()*)()`;
const good=sectionedDump({count:15,sections:Array.from({length:15},(_,i)=>({name:'s_probe_'+(i+1),calls:[5]}))});
const okRun={exitCode:0,signal:null,timedOut:false,error:null},btfBytes=buildKernelLikeBtf();
const facts=(text=good,over={})=>({expectedSourceSha256:sha256Hex(Buffer.from(source)),mountedSourceSha256:sha256Hex(Buffer.from(source)),sourceText:source,
 versionOutput:'bpftrace v0.20.2\n',versionRun:okRun,hashRun:okRun,btf:{...okRun,bytes:btfBytes},compiled:{stdout:text,stderr:'',exitCode:0,timedOut:false},...over});
function retain(name,value){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
function w0(clockProgram){
 const samples=Array.from({length:20},(_,i)=>({monotonicNs:1_000_000_000+i*20_000_000,bootNs:1_000_000_000+i*20_000_000,
  receivedNs:1_000_100_000+i*20_000_000,receivedBootNs:1_000_100_000+i*20_000_000,receivedAfterNs:1_000_100_001+i*20_000_000}));
 return judgeW0({clockProgram,clockSamples:samples,paranoid:4,tracepointAttach:{ok:true},ext4BtfPresent:false,
  listing:{'fexit:vmlinux:ext4_file_write_iter':'fexit:vmlinux:ext4_file_write_iter'},
  attach:{pass:true,witnessCgroup:{memoryPeakBytes:90*2**20,oomKills:0,maxMapKeys:65536}}});
}

test('controls: a complete successful constructed dump passes, empty and wholly unknown dumps refuse',()=>{
 assert.equal(clockPrimitiveVerdict(facts()).pass,true);
 // [OBS01-R13] expectation change 1 (Q109a): only the EMPTY dump still refuses at the gate; a non-empty dump with no forbidden clock helper name token passes the gate and the structured parser reports it as DIAGNOSTIC.
 assert.equal(clockPrimitiveVerdict(facts('')).pass,false);
 for(const text of ['error: unknown option -d', 'unparseable compiler output']){const v=clockPrimitiveVerdict(facts(text));assert.equal(v.pass,true);assert.equal(v.diagnostic.pass,false);}
 const noProof=w0(undefined);assert.equal(noProof.pass,false);
 retain('controls',{good:clockPrimitiveVerdict(facts()),empty:clockPrimitiveVerdict(facts('')),noProof});
});

test('controls: declared forbidden helper ids and names refuse in recognised forms',()=>{
 const rows=[];
 for(const [id,name] of FORBIDDEN_CLOCK_HELPERS){
  for(const text of [good+'\n'+ir(id),good+`\n  99: call ${id}`,good+`\n  99: (85) call ${name}#${id}`]){
   // [OBS01-R13] expectation change 2 (Q109a): a helper NAME token refuses at the gate; a numeric-only call passes the gate and is reported by the structured parser as DIAGNOSTIC.
   const result=clockPrimitiveVerdict(facts(text));rows.push({id,name,text,result});assert.equal(result.pass,!text.includes(name));assert.equal(result.diagnostic.pass,false);
  }
 }
 retain('declared-helper-controls',rows);
});

test('controls: exact version and matching source hashes are required',()=>{
 for(const over of [{versionOutput:'bpftrace v0.20.1'}, {versionOutput:'bpftrace v0.20.2-dirty'}, {mountedSourceSha256:'0'.repeat(64)},
  {sourceText:source+'\n'}, {compiled:{stdout:good,stderr:'',exitCode:null,timedOut:true}}])assert.equal(clockPrimitiveVerdict(facts(good,over)).pass,false);
});

test('A: a nonzero or missing compile exit status must refuse even after printing valid IR',()=>{
 const rows=[];
 for(const exitCode of [1,2,null,undefined]){
  const f=facts(good,{compiled:{stdout:good,stderr:'compiler failed after IR generation',exitCode,timedOut:false}});
  rows.push({exitCode:exitCode??null,proof:clockPrimitiveVerdict(f),w0:w0(f)});
 }
 retain('compile-failure',rows);
 assert.ok(rows.every(r=>!r.proof.pass&&!r.w0.pass),'proof and W0 accept non-successful compilation');
});

test('A: a partly recognised dump must not ignore a numeric forbidden helper call',()=>{
 // [CX-VOBS7-R11] Why: incomplete format recognition is fail-closed only if it cannot rescue a mixed dump. Rejected: counting recognised monotonic lines while ignoring an unrecognised call instruction.
 const text=good+'\n  99: (85) call 125\n';
 const f=facts(text),proof=clockPrimitiveVerdict(f),verdict=w0(f);
 retain('partial-dump',{text,proof,w0:verdict,expected:'refuse: call 125 is forbidden by the implementation itself, regardless of numeric opcode formatting',
  provenance:'CONSTRUCTED partial-format variation; not a recording of bpftrace output'});
 // [OBS01-R13] expectation change 3 (Q109a): the numeric call 125 (no name token) passes the gate; the structured parser still refuses it as DIAGNOSTIC.
 assert.equal(proof.pass,true);assert.equal(proof.diagnostic.pass,false);
 assert.equal(verdict.pass,true);
});
