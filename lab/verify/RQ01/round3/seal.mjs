// [EXP-RQ01-QA3] Why: accept only observed closures, fresh content and matching source/artifact bytes.
// Rejected: promoting exit-zero controllers or structural-only coverage into a Q89f verdict.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {canonicalRouteValue} from '../../../../packages/testkit/src/route-equivalence.ts';
import {heavyAdmission,sameAdmission} from '../../../experiments/EXP-RQ01/attempt-io.mjs';
const base='lab/verify/RQ01/round3',admission=heavyAdmission();
const read=f=>JSON.parse(fs.readFileSync(`${base}/${f}`,'utf8'));
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const verify=map=>{for(const[f,h]of Object.entries(map))assert.equal(hash(f),h,`Source binding ${f}`);};
const suite=read('suite-a1/receipt.json');assert(suite.passed&&suite.content&&suite.fresh&&suite.sourceStillMatches);assert.equal(suite.tests.passed,95);assert.equal(suite.tests.pending,0);verify(suite.before);verify(suite.after);
const builder=JSON.parse(fs.readFileSync('lab/experiments/EXP-RQ01/evidence/round3-a4/receipt.json','utf8'));
for(const[f,h]of Object.entries(builder.source))assert.equal(hash(fs.existsSync(f)?f:'/Users/sam/projects/triplex-db-2/'+f),h,`Builder source ${f}`);
const probe=read('probe-a1/receipt.json');assert(probe.probesCompleted&&probe.sourceStillMatches&&probe.admissionStillMatches);verify(probe.before);verify(probe.after);assert(probe.completed>=probe.started);
const profiles=read('probe-a1/generated-grammar.json');assert.equal(profiles.length,405);assert.equal(profiles.filter(p=>p.status==='validated').length,380);assert.equal(profiles.filter(p=>p.status==='rejected-partial-group').length,25);
const invalid=read('probe-a1/invalid-history-admission.json');assert.equal(invalid.length,12);assert(invalid.every(p=>p.methods.length===6&&p.resets===0&&p.reads===0));
const originals=probe.results.filter(r=>r.caught&&r.cleanViolations===0&&r.test!=='custom-cut-dropped-row');assert.equal(originals.length,5);
for(const r of originals){
 const record=read(`probe-a1/${r.test}.json`);assert.equal(record.clean.violations.length,0);assert.equal(record.broken.violations.length,r.violations);assert(!record.broken.violations.some(v=>v.route==='control'));
}
const coverage=read('probe-a1/coverage.json');assert.equal(coverage.length,5);
assert(coverage.every(c=>c.complete&&!c.missing.length&&c.binding==='exact-execution-plan'&&Object.values(c.kinds).every(n=>n>0)&&Object.values(c.cuts).every(Boolean)&&c.kinds.replacement===6&&c.kinds.boundedCorrection===3&&c.kinds.nestedOrdinal===2));
const fault=read('probe-a1/custom-cut-fault.json');assert(fault.missingCutsRejected);assert.equal(fault.missingFixtureResets,0);assert.equal(fault.cleanViolations.length,0);assert.equal(fault.violations.length,378);
assert.equal(fault.violations.filter(v=>v.rule==='HE-1'&&v.route==='X1-all-valid-time').length,189);assert.equal(fault.violations.filter(v=>v.rule==='HE-2').length,189);assert(fault.violations.every(v=>[45056,45055].includes(v.request.basis.recordedPosition)));
assert.deepEqual(fault.coverage.retentionBoundaries.map(c=>[c.route,c.horizon,c.pinned]),[['X1-all-valid-time',45056,false],['X6-cold',44544,false],['X6-warm',21504,true],['X6-warm',45056,false]]);
for(const c of fault.coverage.retentionBoundaries)assert(c.requested&&fault.events.some(e=>e.context.routes?.includes(c.route)&&e.context.cutId===c.id&&e.context.horizon===c.horizon&&e.outcome.retirement?.horizon===c.horizon&&e.outcome.retirement.pinned===c.pinned));
const {digest,...content}=fault.plan;assert.equal(createHash('sha256').update(canonicalRouteValue(content)).digest('hex'),digest);
for(const contract of ['snapshot','raw-lifetime']){const r=read(`probe-a1/retirement-${contract}.json`);assert.equal(r.violations.length,0);assert.equal(r.observations.length,40);assert(r.observations.every(o=>o.contract===contract));}
const dc1=read('probe-a1/dc1-Q89a.json');assert.equal(dc1.violations.length,20);assert(dc1.violations.every(v=>v.rule==='HE-5'));assert.equal(new Set(dc1.violations.map(v=>v.route)).size,5);
for(const mode of ['original','repair']){
 const r=read(`guard-${mode}/receipt.json`);assert(r.matched&&r.content&&r.fresh&&r.binding&&r.exactFailure);assert.equal(r.status,mode==='original'?0:1);assert.equal(hash('packages/testkit/test/route-equivalence.test.ts'),r.sourceSha256);assert.equal(hash(`${base}/guard.mjs`),r.controllerSha256);assert.equal(hash(`${base}/guard-${mode}/case.probe.ts`),r.derivedProbeSha256);
}
const pkg=read('package-a1/receipt.json');assert(pkg.changedPackageVerified&&pkg.sourceStillMatches&&!pkg.fullRootPassed&&pkg.checks.rootBlocked&&!pkg.error);verify(pkg.before);verify(pkg.after);assert(pkg.results.every(r=>r.status===(r.label==='root-package-check'?1:0)));assert(pkg.checks.tarballContents&&pkg.checks.publicExports&&pkg.checks.consumerTypes&&pkg.checks.consumerRuntime);assert.equal(pkg.checks.observations,26628);
for(const t of Object.values(pkg.tarballs))assert.equal(hash(t.file),t.sha256);
for(const[f,h]of Object.entries(pkg.copyBindings))assert.equal(hash(f),h);
const observedFile=`${base}/package-a1/consumer/observations.json`;assert.equal(hash(observedFile),pkg.checks.outputHash);assert(fs.statSync(observedFile).mtimeMs>=pkg.results.find(r=>r.label==='consumer-runtime').started);
const observed=JSON.parse(fs.readFileSync(observedFile,'utf8'));assert.equal(observed.observations.length,26628);assert.equal(observed.violations.length,0);assert(observed.observations.every(o=>o.contract==='snapshot'));
const entries=read('package-a1/entries.json');for(const ext of ['js','d.ts'])for(const m of ['route-coverage','route-history-grammar','route-equivalence'])assert(entries.testkit.includes(`package/dist/${m}.${ext}`));
assert.equal(execFileSync('git',['diff','d5cd32e6','--','packages','pnpm-lock.yaml','lab/experiments/EXP-RQ01'],{encoding:'utf8'}),'');
const report=fs.readFileSync('lab/verify/RQ01/VERIFY-round3.md','utf8');assert(report.includes('Verdict: **ACCEPT')&&report.includes('PASS / verdict / receipt audit'));
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--',base,'lab/verify/RQ01/VERIFY-round3.md'],{encoding:'utf8'}).trim().split('\n');
const files=Object.fromEntries([...new Set(paths)].filter(f=>f&&f!==`${base}/MANIFEST.json`).sort().map(f=>[f,{bytes:fs.statSync(f).size,sha256:hash(f)}]));
assert(sameAdmission(admission));
const manifest={at:new Date().toISOString(),reviewedBuilder:'d5cd32e6',mergeHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),verdict:'ACCEPT',scope:'Q89f reusable offline harness; not engine/read-route/independent-oracle qualification',admission,admissionStillMatches:true,implementationUnchanged:true,content:{testsPassed:95,originalFaultsCaught:5,customCutFaultHE1:189,customCutFaultHE2:189,grammarProfiles:405,validProfiles:380,truncatedRejected:25,malformedHistories:12,preUseRejectionEntryPoints:6,seedCoverage:5,DC1GuardActive:true,packedConsumerObservations:26628,fullRootPackagePassed:false},localRetention:'Ignored package source/build/consumer/root-artifact trees remain locally retained; source-copy hashes, logs, entry lists and three tarballs are committed',files};
fs.writeFileSync(`${base}/MANIFEST.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({verdict:manifest.verdict,content:manifest.content,files:Object.keys(files).length,implementationUnchanged:true}));
