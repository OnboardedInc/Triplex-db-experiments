// [CX-VOBS7-R16] Why: replay real golden/ABBA bytes, then cross-check per-probe diagnostics independently. Rejected: adopting recorded PASS labels or making crafted IR a Q109a gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {abbaAnalysis} from '../../bin/abba.mjs';
import * as proof from '../../bin/clock-proof.mjs';
import {buildKernelLikeBtf} from '../../observer/btf_fixture.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=new URL('./round16/',import.meta.url),golden=new URL('../../observer/golden/',import.meta.url);
const read=p=>fs.readFileSync(p,'utf8'),load=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(n,v)=>fs.writeFileSync(new URL(n,out),JSON.stringify(v,null,2)+'\n');

test('recompute complete ABBA analyses from all 36 recorded arms',()=>{
 const summaries=[];
 for(const i of [1,2]){
  const dir=`/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/r16/abba-attempt${i}`;
  const recorded=load(dir+'/ABBA.json'),s=label=>load(dir+'/abba/'+label+'/samples.json').samplesNs;
  const rows={aa:[],ab:[]};
  for(let r=1;r<=3;r++){
   rows.aa.push({a1:s(`aa${r}-1`),a2:s(`aa${r}-2`)});
   rows.ab.push({a:[s(`ab${r}-A1`),s(`ab${r}-A2`)],b:[s(`ab${r}-B1`),s(`ab${r}-B2`)]});
  }
  const analysis=abbaAnalysis(rows,{});
  assert.deepEqual(analysis,recorded.analysis);
  assert.equal(analysis.verdict,'INCONCLUSIVE');
  assert.ok(analysis.aa.band>.7);
  const order=[];for(let r=1;r<=3;r++)order.push(`aa${r}-1`,`aa${r}-2`,`ab${r}-A1`,`ab${r}-B1`,`ab${r}-B2`,`ab${r}-A2`);
  assert.deepEqual(recorded.order,order);
  summaries.push({attempt:i,analysis,rawSha256:Object.fromEntries(order.map(label=>[label,sha(fs.readFileSync(dir+'/abba/'+label+'/samples.json'))]))});
 }
 save('abba-analysis-replay.json',summaries);
});

test('golden independently counts every helper/intrinsic and diagnostic binding refuses redistribution',()=>{
 const m=load(new URL('MANIFEST.json',golden)),bytes=fs.readFileSync(new URL(m.dumpFile,golden));
 const parts=/^--- stdout ---\n([\s\S]*)\n--- stderr ---\n([\s\S]*)\n$/.exec(bytes.toString());assert.ok(parts);
 const [stdout,stderr]=parts.slice(1),src=fs.readFileSync(root+'lab/observer/vm_syncwitness.bt');
 assert.equal(sha(bytes),m.dumpFileSha256);assert.equal(sha(stdout),m.stdoutSha256);assert.equal(sha(stderr),m.stderrSha256);
 const enumBytes=fs.readFileSync(new URL(m.enumFile,golden)),ids=JSON.parse(enumBytes).ids;
 assert.equal(sha(enumBytes),m.enumFileSha256);assert.equal(sha(src),m.pinnedProgramSha256);
 const btf=buildKernelLikeBtf({ids:Object.fromEntries(Object.entries(ids).filter(([n])=>n!=='bpf_unspec'))});
 const ok={exitCode:0,signal:null,timedOut:false,error:null};
 const verdict=output=>proof.clockPrimitiveVerdict({expectedSourceSha256:sha(src),mountedSourceSha256:sha(src),sourceText:src.toString(),
  versionOutput:'bpftrace v0.20.2',versionRun:ok,hashRun:ok,btf:{...ok,bytes:btf},compiled:{stdout:output,stderr,...ok}});
 const v=verdict(stdout);assert.equal(v.pass,true);assert.equal(v.diagnostic.pass,true);assert.equal(v.sections.length,15);
 const ir=stdout.slice(stdout.indexOf('; ModuleID = ')),hist={},intrinsics={};
 let accounted=0,callLines=0;
 for(const line of ir.split('\n')){
  if(!/\b(?:tail |notail |musttail )?call\s/.test(line))continue;
  callLines++;
  const id=/inttoptr \(i64 (\d+) to ptr\)/.exec(line),intr=/@([\w.]+)\(/.exec(line);
  if(id){hist[id[1]]=(hist[id[1]]??0)+1;accounted++;}
  else if(intr){intrinsics[intr[1]]=(intrinsics[intr[1]]??0)+1;accounted++;}
  else assert.fail('unaccounted call '+line);
 }
 assert.equal(accounted,callLines);assert.equal(hist['5'],15);
 const named=Object.fromEntries(Object.entries(hist).map(([i,n])=>[Object.entries(ids).find(([,v])=>v===Number(i))[0],n]));
 assert.deepEqual(named,v.helperCalls);assert.deepEqual(intrinsics,v.diagnostic.ir.intrinsics);
 // [CX-VOBS7-R16] Why: preserve a total of 15 but move one clock read to the wrong function, so only per-source-block binding can reject. Rejected: checking totals alone.
 const moved=stdout.replace(/^(\s+%[\w.]+ = call i64 inttoptr \(i64 5 to ptr\)\(\))[^\n]*\n/m,'');
 const at=moved.indexOf('define noundef i64 @"kfunc:ext4_file_write_iter"');assert.ok(at>0);
 const entry=moved.indexOf('entry:\n',at)+'entry:\n'.length;
 const redistributed=moved.slice(0,entry)+'  %review = call i64 inttoptr (i64 5 to ptr)()\n'+moved.slice(entry);
 const bad=verdict(redistributed);assert.equal(bad.monotonicCalls,15);assert.equal(bad.diagnostic.pass,false);assert.match(bad.diagnostic.reasons.join(' '),/source block has/);assert.equal(bad.pass,true);
 save('golden-ir-audit.json',{dumpSha256:sha(bytes),stdoutSha256:sha(stdout),stderrSha256:sha(stderr),callLines,helpers:hist,intrinsics,sections:v.sections,
  diagnostic:v.diagnostic,redistributed:{gatePass:bad.pass,diagnostic:bad.diagnostic},scope:'Q109a diagnostics never change gate pass'});
});
