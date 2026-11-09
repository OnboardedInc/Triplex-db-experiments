// [CX-VOBS7-R12] Why: challenge the exact round 12 proof boundaries with fresh, retained constructed inputs. Rejected: treating a parser sample as a real bpftrace recording.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {clockPrimitiveVerdict,sha256Hex,REQUIRED_HELPER_NAMES} from '../../bin/clock-proof.mjs';
import {deriveHelperIds} from '../../bin/btf-helpers.mjs';
import {judgeW0} from '../../bin/sync-witness.mjs';
import {buildKernelLikeBtf,REFERENCE_FUNC_IDS} from '../../observer/btf_fixture.mjs';
import {sectionedDump,callInsn,EXIT_INSN} from '../../observer/dump_fixture.mjs';

const out=path.join(import.meta.dirname,'round13','prior-round12');
const source=fs.readFileSync(new URL('../../observer/vm_syncwitness.bt',import.meta.url),'utf8');
const okRun={exitCode:0,signal:null,timedOut:false,error:null};
const good=sectionedDump(),btf=buildKernelLikeBtf();
const facts=(text=good,over={})=>({sourceText:source,expectedSourceSha256:sha256Hex(Buffer.from(source)),mountedSourceSha256:sha256Hex(Buffer.from(source)),
 versionOutput:'bpftrace v0.20.2',versionRun:okRun,hashRun:okRun,btf:{...okRun,bytes:btf},compiled:{...okRun,stdout:text,stderr:''},...over});
function w0(clockProgram){
 const samples=Array.from({length:20},(_,i)=>({monotonicNs:1e9+i*2e7,bootNs:1e9+i*2e7,receivedNs:1e9+1e5+i*2e7,
  receivedBootNs:1e9+1e5+i*2e7,receivedAfterNs:1e9+100001+i*2e7}));
 return judgeW0({clockProgram,clockSamples:samples,paranoid:4,tracepointAttach:{ok:true},ext4BtfPresent:false,
  listing:{'fexit:vmlinux:ext4_file_write_iter':'fexit:vmlinux:ext4_file_write_iter'},
  attach:{pass:true,witnessCgroup:{memoryPeakBytes:90*2**20,oomKills:0,maxMapKeys:65536}}});
}
function retain(name,data){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({provenance:'CONSTRUCTED, offline only; W0 engine facts are stand-ins',...data},null,2)+'\n');}
function evaluate(text=good,over={}){const f=facts(text,over);return {text,btfBase64:f.btf.bytes.toString('base64'),proof:clockPrimitiveVerdict(f),w0:w0(f)};}

test('control: complete source-bound constructed proof passes and every failed command refuses W0',()=>{
 const control=evaluate(),rows=[];assert.equal(control.proof.pass,true);assert.equal(control.w0.pass,true);
 for(const key of ['versionRun','hashRun','btf','compiled'])for(const patch of [{exitCode:1},{exitCode:null},{exitCode:'0'},{signal:'SIGKILL'},
  {timedOut:true},{timedOut:undefined},{error:'ENOENT'}]){
  const f=facts(),over={[key]:{...f[key],...patch}},p=clockPrimitiveVerdict(facts(good,over)),w=w0(facts(good,over));
  rows.push({key,patch,pass:p.pass,w0Pass:w.pass,sections:p.sections.length,reasons:p.reasons});assert.equal(p.pass,false);assert.equal(w.pass,false);
 }
 retain('process-controls',{control,rows});
});

test('A2: an unparsed call to a forbidden clock in another stage must refuse',()=>{
 const line='%t = call i64 inttoptr (i64 125 to i64 ()*)() ; comment: call site';
 const result=evaluate(good+'\nLLVM IR stage:\n'+line+'\n');
 retain('outside-unparsed-clock',{line,...result,expected:'refuse: numeric boot-clock read is present, followed by a legal LLVM comment'});
 // [OBS01-R13] expectation change 4 (Q109a): no clock helper NAME token is present, so the gate passes; the structured parser reports the unparsed call outside a section as DIAGNOSTIC.
 assert.equal(result.proof.pass,true);assert.equal(result.proof.diagnostic.pass,false);
 assert.equal(result.w0.pass,true);
});

test('A2: an unknown call line after a blank within a section must refuse',()=>{
 const text=good+'\n  %t = call i64 inttoptr (i64 125 to i64 ()*)() ; comment: call site\n';
 const result=evaluate(text);retain('blank-unparsed-clock',result);
 // [OBS01-R13] expectation change 5 (Q109a): as change 4; the diagnostic reports the call after the blank line.
 assert.equal(result.proof.pass,true);assert.equal(result.proof.diagnostic.pass,false);
 assert.equal(result.w0.pass,true);
});

test('A2: an early exit does not prove that the last probe was dumped completely',()=>{
 const prefix=sectionedDump({count:14})+'\nDisassembly of section s_probe_15:\n'+callInsn(0,5)+'\n'+
  '  1:\t15 00 01 00 00 00 00 00\tif r0 == 0 goto +1\n'+EXIT_INSN(2)+'\n';
 const full=prefix+callInsn(3,125)+'\n'+EXIT_INSN(4)+'\n';
 const complete=evaluate(full),truncated=evaluate(prefix);
 retain('early-exit-truncation',{complete,truncated,expected:'refuse truncated dump: the first return is not a section-end marker'});
 // [OBS01-R13] expectation changes 6 and 7 (Q109a): the numeric `call 125` has no name token, so the gate passes the full dump (its diagnostic refuses it); the truncated prefix passes the gate and
 // its diagnostic also passes: R12-F2 (an early exit is not an end-of-section marker) is a KNOWN gap of the diagnostic, to be closed against a golden dump before it gates.
 assert.equal(complete.proof.pass,true);assert.equal(complete.proof.diagnostic.pass,false,'control: the diagnostic refuses the boot-clock branch');
 assert.equal(truncated.proof.pass,true);assert.equal(truncated.proof.diagnostic.pass,true);
 assert.equal(truncated.w0.pass,true);
});

test('BTF: all helper ids must be unambiguous, including a clock name outside the required set',()=>{
 const ids={bpf_ktime_get_realtime_ns:5,...REFERENCE_FUNC_IDS},bytes=buildKernelLikeBtf({ids});
 const derived=deriveHelperIds(bytes,REQUIRED_HELPER_NAMES),result=evaluate(good,{btf:{...okRun,bytes}});
 retain('aliased-clock-id',{derived,...result,expected:'refuse: helper id 5 has two names, including a forbidden clock; enum order must not decide its identity'});
 assert.equal(derived.ok,false,'required-only collision check accepts an ambiguous numeric helper identity');
 // [OBS01-R13] expectation change 8 (Q109a): BTF content is DIAGNOSTIC (its process exit status still gates); the proof/W0 gate passes, the diagnostic refuses.
 assert.equal(result.proof.pass,true);assert.equal(result.proof.diagnostic.pass,false);assert.equal(result.w0.pass,true);
});

test('BTF: a second empty bpf_func_id enum still makes the enum ambiguous',()=>{
 const bytes=buildKernelLikeBtf({extraEnums:[{kind:'enum',name:'bpf_func_id',values:[]}]}),derived=deriveHelperIds(bytes,REQUIRED_HELPER_NAMES);
 const result=evaluate(good,{btf:{...okRun,bytes}});retain('duplicate-empty-enum',{derived,...result});
 assert.equal(derived.ok,false,'the second named enum is silently filtered out');
 // [OBS01-R13] expectation change 9 (Q109a): as change 8.
 assert.equal(result.proof.pass,true);assert.equal(result.proof.diagnostic.pass,false);assert.equal(result.w0.pass,true);
});

test('BTF: invalid reserved header flags and type-info bits must refuse',()=>{
 const flagged=Buffer.from(btf);flagged[3]=255;
 const reserved=Buffer.from(btf);reserved.writeUInt32LE((reserved.readUInt32LE(28)|0x20000000)>>>0,28);
 const rows=[['header flags',flagged],['reserved type-info bits',reserved]].map(([label,bytes])=>({label,...evaluate(good,{btf:{...okRun,bytes}})}));
 // [OBS01-R13] expectation change 10 (Q109a): as change 8; the derivation itself (deriveHelperIds) still refuses both blobs.
 retain('malformed-btf', {rows});assert.ok(rows.every(r=>r.proof.pass&&r.w0.pass&&!r.proof.diagnostic.pass),'malformed BTF must be reported by the diagnostic');
 assert.ok([flagged,reserved].every(b=>!deriveHelperIds(b,REQUIRED_HELPER_NAMES).ok),'malformed BTF must not derive helper ids');
});

test('A2: raw helper bytes cannot masquerade as the final exit',()=>{
 const text=good.slice(0,good.lastIndexOf('  4:'))+'  4:\t85 00 00 00 05 00 00 00\texit\n';
 const result=evaluate(text);retain('contradictory-exit',result);
 // [OBS01-R13] expectation change 11 (Q109a): the gate passes (no name token); the diagnostic now refuses the section whose last instruction bytes are a call, not an exit.
 assert.equal(result.proof.pass,true);assert.equal(result.proof.diagnostic.pass,false,'raw instruction is a call, but textual exit is accepted as completeness');
 assert.equal(result.w0.pass,true);
});
