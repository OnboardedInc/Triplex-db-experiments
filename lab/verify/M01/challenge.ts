// [CX-VM01R] Why: independently change retained samples and exercise the published recomputer. Rejected: trusting the builder's MATCH output.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { recompute } from '../../bench/duet.ts';
import { analysePair } from '../../bench/lib/pair-analysis.ts';
import { Histogram } from '../../bench/lib/hist.ts';
import { sdLimit } from '../../bench/lib/paired.ts';
const root=path.resolve(import.meta.dirname,'../../..');
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
const paths=[
 'lab/experiments/EXP-M01-paired-measurement/receipts/PAIR-xtdb-20261108T010440Z-7fcef1.json',
 'lab/experiments/EXP-M01-paired-measurement/rebase/PAIR-xtdb-20261109T070418Z-f081c3.json',
];
const results=[];
for(const rel of paths){
 const bytes=fs.readFileSync(path.join(root,rel),'utf8');
 const doc=JSON.parse(bytes), original=recompute(doc);
 assert.equal(original.match,true);
 const changed=JSON.parse(bytes), ev=changed.pair.evidence.calibration;
 const data=JSON.parse(ev.json), round=Object.keys(data.rounds)[0]!;
 const values=data.rounds[round].pre.host.ms;
 const index=values.indexOf(Math.min(...values)), before=values[index];
 values[index]=before/100;
 ev.json=JSON.stringify(data);
 let staleHash='';try{recompute(changed);}catch(e){staleHash=String(e);}
 assert.match(staleHash,/calibration does not match its sha256/);
 ev.sha256=hash(ev.json);
 const rehashed=recompute(changed);
 assert.equal(rehashed.match,false);
 results.push({path:rel,sha256:hash(bytes),original,mutation:{item:'calibration',round,field:`pre.host.ms[${index}]`,before,after:values[index],staleHash,rehashed}});
}

// [CX-VM01R] Why: distinguish R22 paired GREEN from Q100k absolute-timing GREEN using one hard-rule event. Rejected: changing thresholds or treating synthetic signals as a live window.
const cfg=JSON.parse(fs.readFileSync(path.join(root,'lab/config/noise.json'),'utf8'));
const rounds=Array.from({length:12},(_,i)=>({id:`R${String(i+1).padStart(2,'0')}`,kind:'aa' as const,preflight:i<3}));
const h=new Histogram();for(let i=0;i<100;i++)h.recordUs(1000);
const empty=new Histogram().toJSON(),histograms:Record<string,unknown>={};
const arm=()=>({offered:{commands:100,commandsDigest:'fixture',probes:0,probesDigest:'fixture'},commands:{committed:100,censored:0,pendingAtEnd:0,byOutcome:{committed:100}},probes:{ok:0,errors:0,expired:0,pendingAtEnd:0}});
const spin=()=>({ms:Array(20).fill(20)});
const noise=rounds.map(r=>({id:r.id,window:{fromMs:0,toMs:150000},partitioned:true,missing:[],arms:{},neighbors:[],calib:{} as any,signals:Object.fromEntries(cfg.rules.map((rule:any)=>[rule.signal,rule.excludeOutside?1:0]))}));
for(const r of rounds)for(const a of ['A','B'])for(const m of ['commitAll','commit','commitCensored','probeAll','probe','probeCensored'])histograms[`${r.id}.${a}.${m}`]=m==='commit'||m==='commitAll'?h.toJSON():empty;
noise[0]!.signals['vm.psi.memFullShare']=0.05;
for(const n of noise)n.signals['calib.interferenceMax']=1;
const place=(slot:string,cpuset:string)=>({slot,cpuset,regime:'cpuset',cpuMax:'max 100000',memCapBytes:3758096384,cores:2});
const input={mode:'aa' as const,rounds,histograms,noise,config:cfg,regime:'cpuset' as const,accounting:Object.fromEntries(rounds.map(r=>[r.id,{A:arm(),B:arm()}])),calibration:{rounds:Object.fromEntries(rounds.map(r=>[r.id,{pre:{host:spin(),vm:spin()},post:{host:spin(),vm:spin()}}]))},placement:{A:place('s1','0-1'),B:place('s3','2-3')}};
const graded=analysePair(input);
assert.equal(graded.noise.windowGrade.grade,'GREEN');
assert.deepEqual(graded.noise.exclusions,{R01:['vm-psi-mem-full']});
assert.equal(graded.checks.accounting.ok,true);assert.equal(graded.checks.calibration.ok,true);assert.deepEqual(graded.checks.placement!.problems,[]);
console.log(JSON.stringify({reviewed:'f45d479a313f2679db892ea8e773f0c6c0a27d76',results,hardRuleCounterexample:{input,observed:graded,expectedUnderQ100k:'Timing unjudged: hard rule broken; paired GREEN is not sufficient for single-arm NS acceptance'},limits:{round12:sdLimit({ratio:1.25,rounds:12}),round24:sdLimit({ratio:1.25,rounds:24})}},null,2));
