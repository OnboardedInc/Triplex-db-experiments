// [EXP-RQ01-QA2] Why: audit content, attempt freshness and current source bindings before sealing FIX-FIRST evidence.
// Rejected: sealing a collection solely because its controllers exited zero.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base='lab/verify/RQ01/round2';
const read=f=>JSON.parse(fs.readFileSync(`${base}/${f}`,'utf8'));
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const verifyMap=map=>{for(const [f,h]of Object.entries(map))assert.equal(hash(f),h,`Source binding: ${f}`);};
const suite=read('suite-a1/receipt.json');
assert(suite.passed&&suite.content&&suite.fresh&&suite.sourceStillMatches&&suite.tests.passed===83);
assert(Object.values(suite.builderSourceMatch).every(Boolean));verifyMap(suite.before);verifyMap(suite.after);
const probe=read('probe-a3/receipt.json');assert(probe.probesCompleted&&probe.sourceStillMatches);verifyMap(probe.before);verifyMap(probe.after);
assert.equal(probe.slot,'offline/no engine; heavy label CX-VRQ01-round2-probe-a3');
assert.equal(probe.results.filter(r=>r.caught&&r.cleanViolations===0).length,5);
const coverage=read('probe-a3/coverage.json');assert.equal(coverage.length,5);
assert(coverage.every(c=>c.replacements===6&&c.corrections===3&&c.badEdits.length===0&&c.builderMeasured.complete&&c.nested.length===2&&c.nested.every(n=>!n.consecutiveIntegerPositions)));
const gap=read('probe-a3/custom-horizon-false-pass.json');assert.deepEqual(gap.missingActualCuts,[45056,45055]);assert.equal(gap.violations.length,0);assert(gap.defaultManifest.complete);
for(const contract of ['snapshot','raw-lifetime']){
 const r=read(`probe-a3/retirement-${contract}.json`);assert.equal(r.violations.length,0);assert.equal(r.observations.length,80);assert(r.observations.every(o=>o.contract===contract));
}
for(const mode of ['original','repair']){
 const r=read(`guard-${mode}/receipt.json`);assert(r.matched&&r.content&&r.fresh&&r.binding&&r.exactFailure);assert.equal(r.status,mode==='original'?0:1);
 assert.equal(hash('packages/testkit/test/route-equivalence.test.ts'),r.sourceSha256);assert.equal(hash(`${base}/guard.mjs`),r.controllerSha256);assert.equal(hash(`${base}/guard-${mode}/case.probe.ts`),r.derivedProbeSha256);
}
const boundary=read('boundary-a1/receipt.json');assert(boundary.binding&&boundary.wrongRouteAcceptedByQualification&&boundary.sourceStable);assert.equal(boundary.cleanCompleteViolations,0);assert.equal(boundary.caughtViolations.length,24);verifyMap(boundary.before);verifyMap(boundary.after);
const pkg=read('package-a4/receipt.json');assert(pkg.changedPackageVerified&&pkg.sourceStillMatches&&pkg.checks.rootBlocked&&!pkg.fullRootPassed&&!pkg.error);verifyMap(pkg.before);verifyMap(pkg.after);
assert.equal(pkg.slot,'offline/no engine; CX-VRQ01-round2-package-a4');
assert(pkg.results.every(r=>r.status===(r.label==='root-package-check'?1:0)));
assert(pkg.checks.tarballContents&&pkg.checks.publicExports&&pkg.checks.consumerTypes&&pkg.checks.consumerRuntime);assert.equal(pkg.checks.observations,26922);
for(const t of Object.values(pkg.tarballs))assert.equal(hash(t.file),t.sha256);
for(const[f,h]of Object.entries(pkg.copyBindings))assert.equal(hash(f),h);
const output=`${base}/package-a4/consumer/observations.json`;assert.equal(hash(output),pkg.checks.outputHash);
const observed=JSON.parse(fs.readFileSync(output,'utf8'));assert.equal(observed.violations.length,0);assert.equal(observed.observations.length,26922);
const runtime=pkg.results.find(r=>r.label==='consumer-runtime');assert(fs.statSync(output).mtimeMs>=runtime.started);
const delta=execFileSync('git',['diff','2043232b','--','packages','pnpm-lock.yaml','lab/experiments/EXP-RQ01'],{encoding:'utf8'});assert.equal(delta,'');
const report=fs.readFileSync('lab/verify/RQ01/VERIFY-round2.md','utf8');assert(report.includes('Verdict: **FIX-FIRST**')&&report.includes('PASS/verdict/receipt audit')&&report.includes('RF1')&&report.includes('RF2'));
const listing=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--',base,'lab/verify/RQ01/VERIFY-round2.md'],{encoding:'utf8'}).trim().split('\n');
const files=Object.fromEntries([...new Set(listing)].filter(f=>f&&f!==`${base}/MANIFEST.json`).sort().map(f=>[f,{bytes:fs.statSync(f).size,sha256:hash(f)}]));
const manifest={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),reviewedBuilder:'2043232b',verdict:'FIX-FIRST',slot:'offline/no engine; heavy label CX-VRQ01-round2-seal',contentChecks:{tests:83,cleanFaultControls:5,correctionIdentity:true,nestedCoverageFalsePositive:true,customHorizonFalseAcceptance:true,boundaryFaultWitnesses:24,Q89iSnapshotStable:true,emptyRejected:true,DC1GuardActive:true,scopedPackedConsumerObservations:26922,rootPackageCheckBlocked:true},finalReceiptBindingsVerified:true,implementationUnchanged:true,localRetention:'Ignored package-a*/workspace, consumer and root-artifacts remain locally retained; source-copy hashes, build/consumer logs and three-package tarballs are committed',files};
fs.writeFileSync(`${base}/MANIFEST.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({verdict:manifest.verdict,contentChecks:manifest.contentChecks,retainedFiles:Object.keys(files).length,implementationUnchanged:true}));
