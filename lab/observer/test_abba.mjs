// [EXP-OBS01-R16] Tests for the writer-p99 ABBA analysis (lab/bin/abba.mjs) on synthetic latency series. CONSTRUCTED data: nothing here is a measurement.
// Rejected: asserting only that the function runs; each outcome of the Q104a rule is produced on purpose (resolved overhead, resolved no-overhead, too-wide A/A band, too few rounds or commits).
import test from 'node:test';
import assert from 'node:assert/strict';
import {abbaAnalysis,nearestRank,blockResample,mulberry32,armSummary} from '../bin/abba.mjs';

const rngOf=seed=>mulberry32(seed);
/** Serially correlated, positive latencies around `centre` ns with relative noise `sigma` and a rare slow tail. */
function series(seed,n,centre,sigma,tail=0,prob=0.01){
 const r=rngOf(seed);let x=0;const out=[];
 for(let i=0;i<n;i++){const u=r()+r()+r()+r()-2;x=0.5*x+u;let v=centre*(1+sigma*x);if(tail&&r()<prob)v*=1+tail;out.push(Math.max(1,v));}
 return out;
}
const N=2000;
function rounds({aaSigma=0.01,aaShift=[1,1,1],bFactor=1,sigma=0.02,aa=3,ab=3}={}){
 return {aa:Array.from({length:aa},(_,i)=>({a1:series(100+i,N,4e6,aaSigma),a2:series(200+i,N,4e6*aaShift[i%aaShift.length],aaSigma)})),
  ab:Array.from({length:ab},(_,i)=>({a:[series(300+i,N,4e6,sigma),series(400+i,N,4e6,sigma)],b:[series(500+i,N,4e6*bFactor,sigma),series(600+i,N,4e6*bFactor,sigma)]}))};
}

test('nearest-rank p99 is the ceil(0.99 n)-th ordered value; the block resample keeps length and only uses source values', () => {
  const v=Array.from({length:1000},(_,i)=>i+1);
  assert.equal(nearestRank(v,0.99),990); assert.equal(nearestRank(v,0.5),500); assert.equal(nearestRank([5],0.99),5);
  const s=Float64Array.from(v),r=blockResample(s,rngOf(1),50); assert.equal(r.length,1000); for(const x of r)assert.ok(x>=1&&x<=1000);
  assert.deepEqual(Array.from(blockResample(s,rngOf(7),50)),Array.from(blockResample(s,rngOf(7),50)));
  assert.equal(armSummary(v).p99,990);
});

test('a real 20% overhead, with a tight A/A band, is OVERHEAD-RESOLVED with the lower bound above 1 + band', () => {
  const a=abbaAnalysis(rounds({bFactor:1.2}),{boots:400});
  assert.equal(a.verdict,'OVERHEAD-RESOLVED',JSON.stringify([a.detail,a.aa?.band,a.ba?.ci95?.p99]));
  assert.ok(a.ba.ci95.p99[0]>1+a.aa.band); assert.ok(a.ba.pooled.p99>1.15&&a.ba.pooled.p99<1.25); assert.equal(a.ba.perRound.length,3); assert.equal(a.aa.ratios.length,3);
});

test('no overhead and a tight band: the interval sits below 1 + the 5% target (NO-OVERHEAD-ABOVE-TARGET) or, if it straddles, INCONCLUSIVE; never OVERHEAD-RESOLVED', () => {
  const a=abbaAnalysis(rounds({bFactor:1}),{boots:400});
  assert.notEqual(a.verdict,'OVERHEAD-RESOLVED'); assert.ok(Math.abs(a.ba.pooled.p99-1)<0.03,String(a.ba.pooled.p99));
});

test('A/A rounds that differ by 12% make the band wider than the 5% target: INCONCLUSIVE whatever the B/A ratio (the band does not resolve)', () => {
  const a=abbaAnalysis(rounds({bFactor:1.3,aaShift:[1.12,0.9,1.0]}),{boots:300});
  assert.equal(a.verdict,'INCONCLUSIVE'); assert.ok(a.aa.band>=0.05,String(a.aa.band)); assert.match(a.detail,/A\/A band .* not smaller than the effect to resolve/);
});

test('fewer than three A/A rounds, fewer than 1,000 commits in an arm, or no ABBA round: INCONCLUSIVE with the reason, no interval computed', () => {
  let a=abbaAnalysis(rounds({aa:2}),{boots:50}); assert.equal(a.verdict,'INCONCLUSIVE'); assert.match(a.reasons.join(' '),/fewer than 3 A\/A rounds/); assert.equal(a.ba,null);
  const small=rounds(); small.ab[0].b[0]=small.ab[0].b[0].slice(0,999);
  a=abbaAnalysis(small,{boots:50}); assert.equal(a.verdict,'INCONCLUSIVE'); assert.match(a.reasons.join(' '),/an arm has 999 commits, fewer than 1000/);
  a=abbaAnalysis({aa:rounds().aa,ab:[]},{boots:50}); assert.match(a.reasons.join(' '),/no ABBA round/);
});

test('the bootstrap is deterministic for a seed and changes with it', () => {
  const r=rounds({bFactor:1.1}),x=abbaAnalysis(r,{boots:200,seed:3}),y=abbaAnalysis(r,{boots:200,seed:3}),z=abbaAnalysis(r,{boots:200,seed:4});
  assert.deepEqual(x.ba.ci95,y.ba.ci95); assert.notDeepEqual(x.ba.ci95.p99,z.ba.ci95.p99);
});

test('a single slow tail in one B arm moves p99 but the per-round table shows which round it was', () => {
  const r=rounds({bFactor:1}); r.ab[1].b[0]=series(900,N,4e6,0.02,3,0.05);   // 5% of that arm's commits are 4x slower
  const a=abbaAnalysis(r,{boots:200}); const p=a.ba.perRound.map(x=>x.p99); assert.ok(p[1]>p[0]&&p[1]>p[2],JSON.stringify(p));
});
