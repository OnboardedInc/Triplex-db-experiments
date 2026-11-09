// [CX-VM01R-R2] Why: replay retained reviewer inputs across both implementations, not just the builder's tests. Rejected: adopting the builder's PASS as independent verification.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=import.meta.dirname, repo=path.resolve(here,'../../../..'), target=path.resolve(here,'../runtime/round2-clean');
const mod=(root,rel)=>import(pathToFileURL(path.join(root,rel)));
const oldPair=await mod(repo,'lab/bench/lib/pair-analysis.ts'),newPair=await mod(target,'lab/bench/lib/pair-analysis.ts');
const oldGrade=await mod(repo,'lab/bench/lib/paired.ts'),newGrade=await mod(target,'lab/bench/lib/paired.ts');
const {analyseSingleWindow}=await mod(target,'lab/bench/lib/single-analysis.ts');
const {evidenceOf,recompute}=await mod(target,'lab/bench/duet.ts');
const prior=JSON.parse(fs.readFileSync(path.join(here,'../challenge2.json'),'utf8'));
const input=prior.hardRuleCounterexample.input;
assert.deepEqual(newPair.analysePair(input),oldPair.analysePair(input));
const v2={...input,gradingVersion:2},paired=newPair.analysePair(v2);
assert.equal(paired.noise.windowGrade.grade,'GREEN');
assert.deepEqual(paired.noise.hardRuleHistory,[{roundId:'R01',ruleIds:['vm-psi-mem-full']}]);
const {gradingContract,hardRuleHistory,...legacyNoise}=paired.noise;
assert.deepEqual({...paired,noise:legacyNoise},prior.hardRuleCounterexample.observed);
const singleInput={armId:'review-arm',preflight:false,regime:'cpuset',config:input.config,rounds:input.rounds.map(r=>({id:r.id,armId:'review-arm',burstPhase:'same-registered-phase',p50Ms:1,noise:input.noise.find(n=>n.id===r.id)}))};
const single=analyseSingleWindow(singleInput);
assert.equal(single.windowGrade.grade,'RED');assert.equal(single.timingEligible,false);
assert.deepEqual(single.hardRuleHistory,paired.noise.hardRuleHistory);
const clean=structuredClone(singleInput);clean.rounds[0].noise.signals['vm.psi.memFullShare']=0;
assert.equal(analyseSingleWindow(clean).timingEligible,true);
const trials=[];
for(const rule of input.config.rules.filter(r=>r.class.startsWith('hard'))){
 const altered=structuredClone(clean),r=altered.rounds[0];r.noise.signals[rule.signal]=rule.excludeOutside?rule.excludeOutside[1]+1:rule.excludeAbove+1;
 const output=analyseSingleWindow(altered);assert.equal(output.timingEligible,false,rule.id);assert.ok(output.hardRuleHistory.some(h=>h.ruleIds.includes(rule.id)),rule.id);
 trials.push({rule:rule.id,signal:r.noise.signals[rule.signal],grade:output.windowGrade.grade,history:output.hardRuleHistory});
}
const short=analyseSingleWindow({...clean,preflight:true,rounds:clean.rounds.slice(0,3)});
assert.equal(short.logRatios.length,2);assert.equal(short.windowGrade.grade,'UNGRADED');
const missing=structuredClone(clean);delete missing.rounds[0].noise.signals['vm.psi.memFullShare'];assert.equal(analyseSingleWindow(missing).timingEligible,false);
const soft=structuredClone(clean);soft.rounds[1].noise.signals['vm.psi.ioSomeShare']=0.2;const softResult=analyseSingleWindow(soft);assert.equal(softResult.timingEligible,false);assert.equal(softResult.logRatios.length,9);
let comparisons=0;
for(const sdP50 of [null,0,0.1,0.28,0.3,0.4])for(const sdSource of ['aa','all','preflight'])for(const excluded of [0,4,5])for(const amberRounds of [0,1])for(const partitioned of [false,true]){
 const g={sdP50,sdSource,sdRounds:8,rounds:12,excluded,amberRounds,partitioned};assert.deepEqual(newGrade.windowGrade({...g,contract:'paired-r22',hardRuleHistory:[{roundId:'R01',ruleIds:['vm-psi-mem-full']}]}),oldGrade.windowGrade(g));comparisons++;
}
const cfgText=fs.readFileSync(path.join(target,'lab/config/noise.json'),'utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
const doc={...paired,evidence:evidenceOf(v2,paired,cfgText),noiseConfigSha256:sha(cfgText)};
const version2=recompute(doc);assert.equal(version2.match,true);
const changedHistory=recompute({...doc,noise:{...doc.noise,hardRuleHistory:[]}});assert.equal(changedHistory.match,false);
const legacy=[];
for(const original of prior.results){
 const bytes=fs.readFileSync(path.join(target,original.path));assert.equal(sha(bytes),original.sha256);
 const doc=JSON.parse(bytes),result=recompute(doc);assert.equal(result.match,true);
 const ev=doc.pair.evidence.calibration,data=JSON.parse(ev.json),m=original.mutation,index=Number(/\[(\d+)\]/.exec(m.field)[1]);
 assert.equal(data.rounds[m.round].pre.host.ms[index],m.before);data.rounds[m.round].pre.host.ms[index]=m.after;ev.json=JSON.stringify(data);ev.sha256=sha(ev.json);
 const changed=recompute(doc);assert.equal(changed.match,false);
 legacy.push({path:original.path,sha256:original.sha256,original:result,changedSample:changed});
}
const summary={target:'99d9641d4d6f385ab3b3fade7e9e78680a8850b4',priorInputSha256:sha(fs.readFileSync(path.join(here,'../challenge2.json'))),pairedLegacyShapeUnchanged:true,pairedGrade:paired.noise.windowGrade,hardRuleHistory:paired.noise.hardRuleHistory,single,clean:analyseSingleWindow(clean),hardRuleTrials:trials,shortPreflight:short,missingHardSignal:analyseSingleWindow(missing),softExclusion:softResult,pairedGradeComparisons:comparisons,version2,changedHistory,legacy};
fs.writeFileSync(path.join(here,'challenge-result.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({paired:paired.noise.windowGrade.grade,single:single.windowGrade.grade,hardRules:trials.length,pairedComparisons:comparisons,legacy:legacy.map(x=>({match:x.original.match,editedMatch:x.changedSample.match}))},null,2));
