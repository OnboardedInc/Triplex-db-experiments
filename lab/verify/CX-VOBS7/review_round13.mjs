// [CX-VOBS7-R13] Why: verify Q109a's three gates, especially the remaining static source boundary. Rejected: blocking on crafted dump structure after the authorized demotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {clockPrimitiveVerdict,sourceTimeSites,sha256Hex,REQUIRED_HELPER_NAMES,FORBIDDEN_CLOCK_TOKENS} from '../../bin/clock-proof.mjs';
import {deriveHelperIds} from '../../bin/btf-helpers.mjs';
import {judgeW0} from '../../bin/sync-witness.mjs';
import {buildBtf,buildKernelLikeBtf,REFERENCE_FUNC_IDS} from '../../observer/btf_fixture.mjs';
import {sectionedDump} from '../../observer/dump_fixture.mjs';

const out=path.join(import.meta.dirname,'round13','independent');
const source=fs.readFileSync(new URL('../../observer/vm_syncwitness.bt',import.meta.url),'utf8');
const okRun={exitCode:0,signal:null,timedOut:false,error:null},good=sectionedDump(),btf=buildKernelLikeBtf();
const facts=(src=source,over={})=>({sourceText:src,expectedSourceSha256:sha256Hex(Buffer.from(src)),mountedSourceSha256:sha256Hex(Buffer.from(src)),
 versionOutput:'bpftrace v0.20.2',versionRun:okRun,hashRun:okRun,btf:{...okRun,bytes:btf},compiled:{...okRun,stdout:good,stderr:''},...over});
function w0(clockProgram){
 const samples=Array.from({length:20},(_,i)=>({monotonicNs:1e9+i*2e7,bootNs:1e9+i*2e7,receivedNs:1e9+1e5+i*2e7,
  receivedBootNs:1e9+1e5+i*2e7,receivedAfterNs:1e9+100001+i*2e7}));
 return judgeW0({clockProgram,clockSamples:samples,paranoid:4,tracepointAttach:{ok:true},ext4BtfPresent:false,
  listing:{'fexit:vmlinux:ext4_file_write_iter':'fexit:vmlinux:ext4_file_write_iter'},
  attach:{pass:true,witnessCgroup:{memoryPeakBytes:90*2**20,oomKills:0,maxMapKeys:65536}}});
}
function retain(name,data){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({
 provenance:'CONSTRUCTED source/BTF and neutral dump controls, offline only; W0 engine facts are stand-ins; crafted dump defects are outside this verdict',...data},null,2)+'\n');}
const statements=['@review_clock = nsecs;', '@review_clock = nsecs();', '@review_clock = nsecs(boot);', '@review_clock = nsecs(tai);',
 '@review_clock = nsecs(sw_tai);', '@review_clock = elapsed;', '@review_clock = jiffies;', 'time("%H");',
 'printf("%s", strftime("%H", nsecs(monotonic)));'];
function inserted(statement){assert.equal(source.split('BEGIN\n{').length,2);return source.replace('BEGIN\n{','BEGIN\n{\n  '+statement+'\n');}
function sourceRows(wrap){return statements.map(statement=>{
 const sourceText=inserted(wrap(statement)),f=facts(sourceText),proof=clockPrimitiveVerdict(f),verdict=w0(f);
 return {statement,sourceText,sourceSha256:f.expectedSourceSha256,sites:sourceTimeSites(sourceText),pass:proof.pass,reasons:proof.reasons,w0Pass:verdict.pass,
  diagnosticPass:proof.diagnostic.pass,...(statement===statements[0]?{fullProof:proof,fullW0:verdict}:{})};
});}

test('control: pinned source passes; undecorated non-monotonic/default/other time builtins all refuse',()=>{
 assert.deepEqual(sourceTimeSites(source),{monotonic:15,other:[]});assert.equal(clockPrimitiveVerdict(facts()).pass,true);assert.equal(w0(facts()).pass,true);
 const rows=sourceRows(s=>s);retain('source-controls',{rows});assert.ok(rows.every(r=>r.sites.other.length>0&&!r.pass&&!r.w0Pass));
});

test('source gate: a URL string must not hide later time builtins',()=>{
 const rows=sourceRows(s=>'printf("https://clock"); '+s);retain('url-string-source',{rows});
 assert.ok(rows.every(r=>r.sites.other.length>0&&!r.pass&&!r.w0Pass),'static gate strips // inside a string, losing the real time read');
});

test('source gate: literal block-comment delimiters must not hide executable time builtins',()=>{
 const rows=sourceRows(s=>'printf("/*"); '+s+' printf("*/");');retain('block-string-source',{rows});
 assert.ok(rows.every(r=>r.sites.other.length>0&&!r.pass&&!r.w0Pass),'static gate removes executable text between comment-looking string literals');
});

test('Q109a: diagnostic outcomes never decide the boolean gate; identity/status/token gates do',()=>{
 const rows=[];
 for(const bytes of [btf,Buffer.alloc(0),buildKernelLikeBtf({omit:['bpf_ktime_get_ns']})]){
  const over={btf:{...okRun,bytes}},f=facts(source,over),r=clockPrimitiveVerdict(f);rows.push({btfSha256:sha256Hex(bytes),proof:r,w0:w0(f)});
  assert.equal(r.pass,true);assert.deepEqual(r.reasons,[]);assert.equal(w0(f).pass,true);
 }
 assert.equal(rows[0].proof.diagnostic.pass,true);assert.equal(rows[1].proof.diagnostic.pass,false);assert.equal(rows[2].proof.diagnostic.pass,false);
 for(const key of ['versionRun','hashRun','btf','compiled'])for(const patch of [{exitCode:1},{exitCode:null},{exitCode:'0'},{signal:'SIGKILL'},
  {timedOut:true},{timedOut:undefined},{error:'ENOENT'}]){
  const base=facts(),f=facts(source,{[key]:{...base[key],...patch}}),r=clockPrimitiveVerdict(f);
  assert.equal(r.pass,false);assert.equal(w0(f).pass,false);assert.equal(r.diagnostic.adopted,false);
 }
 for(const token of FORBIDDEN_CLOCK_TOKENS)for(const stream of ['stdout','stderr']){
  const f=facts(source,{compiled:{...okRun,stdout:good,stderr:'',[stream]:good+'\ncomment '+token.toUpperCase()}});
  assert.equal(clockPrimitiveVerdict(f).pass,false);assert.equal(w0(f).pass,false);
 }
 for(const over of [{mountedSourceSha256:'0'.repeat(64)},{versionOutput:'bpftrace v0.20.1'},{compiled:{...okRun,stdout:'',stderr:''}}]){
  const f=facts(source,over);assert.equal(clockPrimitiveVerdict(f).pass,false);assert.equal(w0(f).pass,false);
 }
 retain('gate-controls',{rows});
});

test('R12-F3: aliases in either order, duplicate/empty enums, every reserved bit and every nonzero flags byte refuse',()=>{
 const rows=[],check=(label,bytes)=>{const r=deriveHelperIds(bytes,REQUIRED_HELPER_NAMES);rows.push({label,btfBase64:bytes.toString('base64'),result:r});assert.equal(r.ok,false,label);};
 for(const kind of ['enum','enum64']){
  check(kind+' alias first',buildKernelLikeBtf({kind,ids:{bpf_ktime_get_realtime_ns:5,...REFERENCE_FUNC_IDS}}));
  check(kind+' alias last',buildKernelLikeBtf({kind,extra:{bpf_ktime_get_realtime_ns:5}}));
  check(kind+' duplicate empty',buildKernelLikeBtf({kind,extraEnums:[{kind,name:'bpf_func_id',values:[]}]}));
  check(kind+' only empty',buildBtf({types:[{kind,name:'bpf_func_id',values:[]}]}));
 }
 for(let flags=1;flags<=255;flags++){const b=Buffer.from(btf);b[3]=flags;check('flags '+flags,b);}
 for(const bit of [16,17,18,19,20,21,22,23,29,30]){const b=Buffer.from(btf);b.writeUInt32LE((b.readUInt32LE(28)|(1<<bit))>>>0,28);check('info bit '+bit,b);}
 // [CX-VOBS7-R13] Why: retain exhaustive outcomes without inflating git with hundreds of duplicate base64 blobs. Rejected: calling a sampled subset exhaustive.
 retain('btf-controls',{inputSha256:sha256Hex(btf),rows:rows.map(({btfBase64,...rest})=>({...rest,btfSha256:sha256Hex(Buffer.from(btfBase64,'base64'))}))});
});
