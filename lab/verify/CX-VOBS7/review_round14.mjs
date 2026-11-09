// [CX-VOBS7-R14] Why: check lexical boundaries using snippets whose active clock reads are known by construction. Rejected: treating a generated source corpus as real bpftrace compilation or reopening dump-parser findings under Q109a.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {lexBt,sourceTimeSites,clockPrimitiveVerdict,sha256Hex} from '../../bin/clock-proof.mjs';
import {judgeW0} from '../../bin/sync-witness.mjs';
import {buildKernelLikeBtf} from '../../observer/btf_fixture.mjs';
import {sectionedDump} from '../../observer/dump_fixture.mjs';

const out=path.join(import.meta.dirname,'round14','independent');
const pinned=fs.readFileSync(new URL('../../observer/vm_syncwitness.bt',import.meta.url),'utf8');
const ok={exitCode:0,signal:null,timedOut:false,error:null},dump=sectionedDump(),btf=buildKernelLikeBtf();
const facts=source=>({sourceText:source,expectedSourceSha256:sha256Hex(Buffer.from(source)),mountedSourceSha256:sha256Hex(Buffer.from(source)),
 versionOutput:'bpftrace v0.20.2',versionRun:ok,hashRun:ok,btf:{...ok,bytes:btf},compiled:{...ok,stdout:dump,stderr:''}});
function w0(clockProgram){
 const samples=Array.from({length:20},(_,i)=>({monotonicNs:1e9+i*2e7,bootNs:1e9+i*2e7,receivedNs:1e9+1e5+i*2e7,
  receivedBootNs:1e9+1e5+i*2e7,receivedAfterNs:1e9+100001+i*2e7}));
 return judgeW0({clockProgram,clockSamples:samples,paranoid:4,tracepointAttach:{ok:true},ext4BtfPresent:false,
  listing:{'fexit:vmlinux:ext4_file_write_iter':'fexit:vmlinux:ext4_file_write_iter'},
  attach:{pass:true,witnessCgroup:{memoryPeakBytes:90*2**20,oomKills:0,maxMapKeys:65536}}});
}
function retain(name,data){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({
 provenance:'CONSTRUCTED lexical fixtures only; no real compilation; neutral dump and W0 facts are stand-ins under Q109a',...data},null,2)+'\n');}
const statements=['@review = nsecs;', '@review = nsecs();', '@review = nsecs(boot);', '@review = nsecs(tai);', '@review = nsecs(sw_tai);',
 '@review = elapsed;', '@review = jiffies;', 'time("%H");', 'printf("%s", strftime("%H", nsecs(monotonic)));'];
const bodies=['','https://clock','//','/*','*/','/* nsecs(boot); */','nsecs elapsed jiffies time(',"'",'"','\\','\\"','"//','\\/*','a\nb','a\rb','a\tb'];
const stringPieces=bodies.map(s=>'printf('+JSON.stringify(s)+');\n');
const chars=["'a'", "'/'", "'*'", "'\"'", "'\\\''", "'\\\\'", "'\\n'", "'\\t'", "'\\x27'", "'\\047'"];
const charPieces=chars.map(c=>'$review_char = '+c+';\n');
const comments=['/* nsecs(boot); " \' \\ // */\n','// nsecs(boot); " \' /*\n','/* first\n second " // */\n','/* /* nested start is just comment text */\n'];
const pieces=[...stringPieces,...charPieces,...comments];
const program=body=>'BEGIN { @mono = nsecs(monotonic);\n'+body+'\n}\n';
function evaluate(source){const f=facts(source);return {source,sourceSha256:f.expectedSourceSha256,lexed:lexBt(source),sites:sourceTimeSites(source),proof:clockPrimitiveVerdict(f),w0:w0(f)};}

test('pinned source and complete literal/comment controls pass the actual gate',()=>{
 const result=evaluate(pinned);assert.deepEqual(result.lexed.errors,[]);assert.deepEqual(result.sites,{monotonic:15,other:[]});assert.equal(result.proof.pass,true);assert.equal(result.w0.pass,true);
 const rows=pieces.map(p=>evaluate(program(p)));retain('pinned-and-literal-controls',{pinned:result,rows});
 assert.ok(rows.every(r=>r.lexed.errors.length===0&&r.sites.other.length===0&&r.proof.pass&&r.w0.pass));
});

test('active forbidden reads remain visible before, between and after literal/comment pieces',()=>{
 const inputs=createHash('sha256'),observed=createHash('sha256'),failures=[];let count=0;
 for(const before of pieces)for(const after of pieces)for(const statement of statements){
  const source=program(before+statement+'\n'+after),lexed=lexBt(source),sites=sourceTimeSites(source);
  inputs.update(JSON.stringify(source)+'\n');observed.update(JSON.stringify({lexed,sites})+'\n');count++;
  if(lexed.errors.length||!sites.other.length){if(failures.length<20)failures.push({source,lexed,sites});}
 }
 retain('active-read-cross-product',{count,inputStreamSha256:inputs.digest('hex'),observationStreamSha256:observed.digest('hex'),failures,
  recipe:'all 30 pieces before x all 30 pieces after x nine active time statements, using program() in the pinned reviewer script'});
 assert.deepEqual(failures,[]);
 // [CX-VOBS7-R14] Why: also exercise gate propagation on the pinned program, rather than only on the minimal lexical corpus. Rejected: inferring W0 behavior from the lexer alone.
 const rows=[];
 for(const statement of statements)for(const adornment of ['printf("https://clock"); '+statement, 'printf("/*"); '+statement+' printf("*/");', '$review_char = \'\\\'\'; '+statement]){
  rows.push(evaluate(pinned.replace('BEGIN\n{','BEGIN\n{\n'+adornment+'\n')));
 }
 retain('active-read-gate-controls',{rows});assert.ok(rows.every(r=>r.sites.other.length>0&&!r.proof.pass&&!r.w0.pass));
});

test('comments between builtin tokens cannot hide a clock or manufacture an allowed mode',()=>{
 const rows=[];
 for(const gap of [' ', '\t', '\n', '/* " // */', '/*\n */', '// " /*\n']){
  for(const mode of ['boot','tai','sw_tai'])rows.push(evaluate(program('@review = nsecs'+gap+'('+gap+mode+gap+');')));
 }
 retain('token-gap-controls',{rows});assert.ok(rows.every(r=>r.lexed.errors.length===0&&r.sites.other.length>0&&!r.proof.pass&&!r.w0.pass));
 for(const gap of [' ', '\n', '/* comment */', '// comment\n'])assert.equal(clockPrimitiveVerdict(facts(program('@review = nsecs'+gap+'('+gap+'monotonic'+gap+');'))).pass,true);
});

test('unterminated strings, chars and block comments refuse at every tested boundary and escape parity',()=>{
 const inputs=createHash('sha256'),observed=createHash('sha256'),failures=[],samples=[];let count=0;
 const bad=[];
 for(const quote of ['"',"'"])for(let slashes=0;slashes<=12;slashes++)for(const ending of ['', '\n', '\n@later = nsecs(monotonic);']){
  bad.push(quote+'body'+'\\'.repeat(slashes)+ending);
 }
 for(const tail of ['', '*', '/', '\\', '"', "'", '\n', '\n@later = nsecs(monotonic);'])bad.push('/* never closed '+tail);
 bad.push('"bad\n"', "'bad\n'", '"\\', "'\\");
 for(const fragment of bad)for(const offset of ['', '\n', '\n\n']){
  const source='BEGIN { @mono = nsecs(monotonic); }\n'+offset+fragment,lexed=lexBt(source),sites=sourceTimeSites(source),f=facts(source),p=clockPrimitiveVerdict(f),w=w0(f);
  const row={source,lexed,sites,pass:p.pass,w0Pass:w.pass};inputs.update(JSON.stringify(source)+'\n');observed.update(JSON.stringify(row)+'\n');count++;
  if(!lexed.errors.length||!sites.other.some(x=>x.startsWith('unterminated '))||p.pass||w.pass){if(failures.length<20)failures.push(row);}
  if(samples.length<6||fragment.includes('bad\n'))samples.push(row);
 }
 retain('unterminated-controls',{count,inputStreamSha256:inputs.digest('hex'),observationStreamSha256:observed.digest('hex'),samples,failures});assert.deepEqual(failures,[]);
});

test('deterministic mixed arrangements preserve the executable clock boundary',()=>{
 let seed=0x14c0ffee;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const inputs=createHash('sha256'),observed=createHash('sha256'),failures=[];let count=0;
 for(let i=0;i<10000;i++){
  const n=1+next()%12,insert=next()%(n+1),statement=statements[next()%statements.length];let body='';
  for(let j=0;j<=n;j++){if(j===insert)body+=statement+'\n';if(j<n)body+=pieces[next()%pieces.length];}
  const source=program(body),lexed=lexBt(source),sites=sourceTimeSites(source);inputs.update(JSON.stringify(source)+'\n');observed.update(JSON.stringify({lexed,sites})+'\n');count++;
  if(lexed.errors.length||!sites.other.length){if(failures.length<20)failures.push({source,lexed,sites});}
 }
 retain('seeded-arrangements',{seed:0x14c0ffee,finalState:seed,count,inputStreamSha256:inputs.digest('hex'),observationStreamSha256:observed.digest('hex'),failures});assert.deepEqual(failures,[]);
});
