// [EXP-OBS01-R16] Writer commit p99 with the witness off (A) and on (B), judged under the Q104a A/A rule. Pure functions; the VM window that produces the samples is windowABBA in sync-witness.mjs.
// Why: R48 9.1 W2 asks for "writer commit p99 with and without the witness ... (ABBA, V3 shape), reported, not gated, because V3 showed its noise exceeds the effect". Q104a (RULINGS-PENDING)
// says how such a comparison may be called: at least 1,000 commits per arm; a band from at least three A/A rounds; a bootstrap 95% interval of the B/A ratio whose lower bound must exceed 1 + the A/A
// band to count as a regression. This module applies exactly that and has a fourth outcome the rule implies: if the A/A band is too wide to see the target effect, the comparison is INCONCLUSIVE.
// Rejected: one A/A pair as the band (RT01's 0.237% from two 150-sample arms was the failure that produced Q104a); an i.i.d. bootstrap (commit latencies of one writer are serially correlated:
// a circular block bootstrap of 50 consecutive commits is used); calling a point ratio above 1 an overhead without the interval.

export const nearestRank=(values,q)=>{const s=Float64Array.from(values).sort();return s[Math.max(0,Math.ceil(s.length*q)-1)];};
export const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
export function mulberry32(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

/** One resample of `values` (same length) from circular blocks of `block` consecutive samples. */
export function blockResample(values,rng,block=50){
 const n=values.length,out=new Float64Array(n);
 for(let i=0;i<n;){const start=Math.floor(rng()*n);for(let k=0;k<block&&i<n;k++,i++)out[i]=values[(start+k)%n];}
 return out;
}
const concat=arrays=>{const total=arrays.reduce((a,x)=>a+x.length,0),out=new Float64Array(total);let at=0;for(const x of arrays){out.set(x,at);at+=x.length;}return out;};
const stat={p99:v=>nearestRank(v,0.99),p50:v=>nearestRank(v,0.5),mean};

/** Summary of one arm's commit latencies (ns). */
export const armSummary=samples=>({n:samples.length,p50:nearestRank(samples,0.5),p90:nearestRank(samples,0.9),p99:nearestRank(samples,0.99),max:Math.max(...samples),mean:mean(samples)});

/**
 * @param {{aa:Array<{a1:number[],a2:number[]}>, ab:Array<{a:number[][],b:number[][]}>}} rounds
 *        aa[i]: one A/A round (two arms, both witness-off, in run order); ab[i]: one ABBA round: a=[A1,A2], b=[B1,B2] (run order A1,B1,B2,A2)
 * @param {{seed?,boots?,target?,block?,minCommits?,minAA?}} options  target = the effect that must be resolvable (Q100r's 5% writer p99)
 * @returns the full analysis: arms, A/A ratios and band, B/A ratio per round and pooled with its block-bootstrap 95% interval, and the verdict
 */
export function abbaAnalysis(rounds,{seed=16,boots=2000,target=0.05,block=50,minCommits=1000,minAA=3}={}){
 const aa=rounds.aa??[],ab=rounds.ab??[],reasons=[];
 const arms=[...aa.flatMap((r,i)=>[['aa'+(i+1)+'-1',r.a1],['aa'+(i+1)+'-2',r.a2]]),...ab.flatMap((r,i)=>[['ab'+(i+1)+'-A1',r.a[0]],['ab'+(i+1)+'-B1',r.b[0]],['ab'+(i+1)+'-B2',r.b[1]],['ab'+(i+1)+'-A2',r.a[1]]])];
 const armRows=Object.fromEntries(arms.map(([label,s])=>[label,armSummary(s)]));
 const smallest=Math.min(...arms.map(([,s])=>s.length),Infinity);
 if(aa.length<minAA)reasons.push('fewer than '+minAA+' A/A rounds ('+aa.length+'): the A/A band is not an estimate (Q104a)');
 if(!ab.length)reasons.push('no ABBA round');
 if(arms.length&&smallest<minCommits)reasons.push('an arm has '+smallest+' commits, fewer than '+minCommits+' (Q104a)');
 const base={target,block,boots,seed,minCommits,arms:armRows};
 if(reasons.length)return {...base,verdict:'INCONCLUSIVE',reasons,aa:null,ba:null};
 // ---- the A/A band: ratio of the second arm's p99 to the first's, per round ----
 const aaRatio=aa.map(r=>stat.p99(r.a2)/stat.p99(r.a1)),logs=aaRatio.map(Math.log),m=mean(logs);
 const sd=Math.sqrt(logs.reduce((a,x)=>a+(x-m)**2,0)/(logs.length-1));
 // band: the larger of the widest A/A deviation seen and two s_d of the log ratio (three rounds estimate s_d poorly, so the widest observed deviation is not allowed to be hidden by it)
 const band=Math.max(...aaRatio.map(x=>Math.abs(x-1)),Math.exp(2*sd)-1);
 const aaOut={ratios:aaRatio,sdLog:sd,band,rule:'band = max(max |A2/A1 - 1| over A/A rounds, exp(2 s_d) - 1)'};
 // ---- B/A: per round and pooled, with a block bootstrap ----
 const A=ab.map(r=>concat(r.a)),B=ab.map(r=>concat(r.b));
 const perRound=ab.map((r,i)=>({round:i+1,p99:stat.p99(B[i])/stat.p99(A[i]),p50:stat.p50(B[i])/stat.p50(A[i])}));
 const pooled=name=>stat[name](concat(B))/stat[name](concat(A));
 const rng=mulberry32(seed),draws={p99:[],p50:[],mean:[]},armsA=ab.flatMap(r=>r.a).map(s=>Float64Array.from(s)),armsB=ab.flatMap(r=>r.b).map(s=>Float64Array.from(s));
 for(let k=0;k<boots;k++){
  const a=concat(armsA.map(s=>blockResample(s,rng,block))),b=concat(armsB.map(s=>blockResample(s,rng,block)));
  for(const name of Object.keys(draws))draws[name].push(stat[name](b)/stat[name](a));
 }
 const ci=name=>{const d=Float64Array.from(draws[name]).sort();return [d[Math.floor(0.025*(d.length-1))],d[Math.ceil(0.975*(d.length-1))]];};
 const baOut={perRound,pooled:{p99:pooled('p99'),p50:pooled('p50'),mean:pooled('mean')},ci95:{p99:ci('p99'),p50:ci('p50'),mean:ci('mean')},
  rule:'B/A = p99 of the pooled witness-on arms / p99 of the pooled witness-off arms; 95% interval from '+boots+' circular block bootstraps (block '+block+') of every arm'};
 // ---- verdict ----
 let verdict,detail;
 const [lo,hi]=baOut.ci95.p99;
 if(band>=target){verdict='INCONCLUSIVE';detail='the A/A band ('+(band*100).toFixed(1)+'%) is not smaller than the effect to resolve ('+(target*100).toFixed(0)+'%): this setup cannot see a '+(target*100).toFixed(0)+'% writer p99 change';}
 else if(lo>1+band){verdict='OVERHEAD-RESOLVED';detail='the lower bound of the B/A p99 interval ('+lo.toFixed(4)+') exceeds 1 + the A/A band ('+(1+band).toFixed(4)+')'+(lo>1+target?' and 1 + the target':'');}
 else if(hi<1+target){verdict='NO-OVERHEAD-ABOVE-TARGET';detail='the upper bound of the B/A p99 interval ('+hi.toFixed(4)+') is below 1 + the target ('+(1+target).toFixed(2)+') and the A/A band resolves the target';}
 else{verdict='INCONCLUSIVE';detail='the B/A p99 interval ['+lo.toFixed(4)+', '+hi.toFixed(4)+'] contains both 1 + the A/A band ('+(1+band).toFixed(4)+') and 1 + the target ('+(1+target).toFixed(2)+')';}
 return {...base,verdict,detail,reasons:[],aa:aaOut,ba:baOut};
}
