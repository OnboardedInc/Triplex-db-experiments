import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "../../../..");
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01";
const raw = path.join(durable, "round6");
const out = path.join(durable, "live3-run");
assert.ok(!fs.existsSync(out), "preserve previous seal");
fs.mkdirSync(out);
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(path.join(raw, p), "utf8"));
const prior = new Map(fs.readFileSync(path.join(root, "lab/experiments/EXP-RT01/round6/DURABLE-SHA256SUMS"), "utf8")
  .trim().split("\n").map((line) => { const [h, p] = line.split("  "); return [p, h]; }));
for (const [p, h] of prior) assert.equal(hash(path.join(raw, p)), h, `immutable old evidence ${p}`);
const execution = read("live-attempt1/execution.json");
assert.equal(execution.acquired, true);
assert.equal(execution.ownedDuringAttempt, true);
assert.equal(execution.ownerExistedBefore, false);
assert.equal(execution.failure, "G6 first failure");
assert.deepEqual(execution.phases.map((p) => [p.name, p.exit]), [
  ["admission", 0], ["g2", 0], ["g6", 1], ["engine-end", 0], ["engine-log", 0], ["engine-down", 0], ["cleanup", 0],
]);
const admission = read("admission2/decision.json");
assert.equal(admission.reason, null);
assert.equal(admission.up.exit, 0);
assert.ok(admission.freeBytes > 10 * 1024 ** 3);
const owner = read("owner-start.json");
assert.equal(owner.holder, "CX-RT01"); assert.equal(owner.slot, "s1");
const engine = read("engine-start.json")[0];
const engineEnd = read("live-attempt1/engine-end.stdout")[0];
assert.equal(engine.Id, engineEnd.Id);
assert.equal(engine.Config.Labels["tx2.holder"], owner.holder);
assert.equal(engine.HostConfig.Memory, 3758096384);
assert.equal(engine.HostConfig.NanoCpus, 2000000000);

const g2 = read("g2-attempt1/execution.json"), outcomes = read("g2-attempt1/outcomes.json");
assert.equal(g2.live.exit, 0); assert.equal(g2.sourceUnchanged, true);
assert.deepEqual(g2.before, g2.after);
assert.equal(g2.phases.length, 6); assert.ok(g2.phases.every((p) => p.exit === 0));
assert.equal(outcomes.diagnostic, false); assert.equal(outcomes.failure, null);
assert.deepEqual(outcomes.failures, []); assert.equal(outcomes.grantsAcceptance, true);
assert.deepEqual(outcomes.owner, owner);
const progress = fs.readFileSync(path.join(raw, "g2-attempt1/progress.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
const count = (kind) => progress.filter((e) => e.kind === kind).length;
assert.equal(count("case-pass"), 197); assert.equal(count("route-pass"), 42);
assert.equal(count("schedule-pass"), 2); assert.equal(count("determinism-pass"), 1);
assert.equal(count("first-failure"), 0); assert.equal(count("diagnostic-failure"), 0);
for (const encoding of ["a0", "compact"]) {
  const r = read(`g2-attempt1/routes-${encoding}.json`);
  assert.equal(Object.keys(r.before).length, 21);
  assert.deepEqual(Object.keys(r.before), Object.keys(r.after));
  for (const name of Object.keys(r.before)) {
    const before = structuredClone(r.before[name]), after = structuredClone(r.after[name]);
    if (name === "entityPage" || name === "queryAll-echo") {
      const key = name === "entityPage" ? "snapshot" : "basis";
      assert.equal(before[key].recordedPosition, r.first.position);
      assert.equal(after[key].recordedPosition, r.second.position);
      before[key].recordedPosition = after[key].recordedPosition;
    }
    assert.deepEqual(before, after, `${encoding}/${name}`);
    if (name !== "dependency") assert.ok(JSON.stringify(before).includes("before"));
  }
}
const deterministic = read("g2-attempt1/determinism.json");
assert.equal(deterministic.length, 3);
assert.deepEqual(deterministic[0], deterministic[1]); assert.deepEqual(deterministic[1], deterministic[2]);

const g6 = read("g6-attempt1/execution.json"), rule = read("g6-attempt1/AA-RULE-BEFORE-B.json");
assert.equal(g6.sourceUnchanged, true); assert.equal(g6.runnerUnchanged, true);
assert.deepEqual(g6.before, g6.after);
assert.deepEqual(g6.startedFromG2Build, g2.build);
assert.deepEqual(g6.owner, owner); assert.equal(rule.engine[0].Id, engine.Id);
assert.equal(rule.baselineCommit, "59e07afb7a25dfb22bca60f8d769b74651aa835a");
assert.deepEqual(rule.calibration, g6.calibration); assert.equal(g6.calibration.length, 4);
for (const [p, h] of Object.entries(g2.after)) assert.equal(hash(path.join(root, p)), h, p);
for (const [p, h] of Object.entries(g2.build)) assert.equal(hash(path.join(root, p)), h, p);
assert.equal(execFileSync("git", ["diff", "37ae44a9", "--", "packages", "pnpm-lock.yaml"], { cwd: root, encoding: "utf8" }), "");
const base = path.join(durable, "live2/baseline");
const baseline = JSON.parse(fs.readFileSync(path.join(base, "identity.json")));
assert.equal(hash(path.join(base, "identity.json")), rule.baselineIdentitySha256);
for (const [p, h] of Object.entries(baseline.files)) assert.equal(hash(path.join(base, p)), h, p);
const events = fs.readFileSync(path.join(raw, "g6-attempt1/events.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
const ruleEvent = events.findIndex((e) => e.kind === "rule-frozen");
assert.ok(ruleEvent > 0);
const ruleSha = hash(path.join(raw, "g6-attempt1/AA-RULE-BEFORE-B.json"));
assert.equal(events[ruleEvent].sha256, ruleSha);
assert.ok(events.filter((e) => e.kind === "sample" && e.arm === "B").every((e) => e.at >= rule.writtenAt));
assert.ok(events.slice(0, ruleEvent).every((e) => e.arm !== "B"));
const q = (xs, p) => [...xs].sort((a,b) => a-b)[Math.ceil(xs.length*p)-1];
function checkBlocks(blocks, calibration = false) {
  assert.equal(blocks.length, 4);
  if (!calibration) assert.deepEqual(blocks.map((b) => b.arm), ["A", "B", "A", "B"]);
  for (const b of blocks) {
    assert.equal(b.samples.length, 75);
    assert.equal(b.after.logicalCommits - b.before.logicalCommits, 75);
    assert.equal(b.after.distinctRecordedPositions, b.after.logicalCommits);
    assert.equal(b.after.metadata.length, 1);
    for (const [i, s] of b.samples.entries()) {
      assert.equal(s.position, b.before.logicalCommits+i+1); assert.equal(s.scope, b.scope);
      assert.ok(s.ms > 0); assert.equal(s.submits, 1);
      assert.equal(s.submittedStatements, s.encoding === "a0" ? 6 : 5);
      assert.equal(s.wireReadyCycles, s.wireExecutions);
    }
  }
}
for (const c of g6.calibration) {
  checkBlocks(c.blocks, true);
  for (const metric of ["p50", "p99"])
    assert.equal(c.tolerance[metric], Math.max(c.left[metric]/c.right[metric], c.right[metric]/c.left[metric])-1);
}
assert.deepEqual(g6.points.map((p) => [p.history,p.encoding,p.size]), [[0,"a0",10],[0,"a0",5],[0,"compact",10],[0,"compact",5]]);
const points = g6.points.map((p, index) => {
  checkBlocks(p.blocks); assert.equal(p.ruleSha256, ruleSha);
  const arms = {};
  for (const arm of ["A", "B"]) {
    const blocks = p.blocks.filter((b) => b.arm === arm), samples = blocks.flatMap((b) => b.samples.map((s) => s.ms));
    assert.equal(samples.length, 150); assert.equal(p[arm].n, 150);
    assert.equal(p[arm].p50, q(samples,0.5)); assert.equal(p[arm].p99, q(samples,0.99));
    const s = p.scans[arm];
    const scans = {};
    for (const version of ["before", "after"]) {
      const plan = s.nativePlans[version];
      assert.ok(plan.sql.startsWith("SELECT "));
      assert.ok(plan.sql.includes(version === "before" ? "MAX(stamp)" : "_id = $1"));
      const rows = plan.analyze.filter((r) => r.op === "scan");
      assert.equal(rows.length, 2);
      for (const r of rows) { assert.equal(r.attributes.scan_source,"public.tx_meta"); assert.ok(Number.isInteger(r.attributes.scan_rows_read)); }
      scans[version] = rows.map((r) => ({outputRows:Number(r.row_count),...r.attributes}));
    }
    const callCounts = {};
    for (const k of ["queries","submits","submittedStatements","wireExecutions","wireReadyCycles"])
      callCounts[k] = Object.fromEntries([...new Set(blocks.flatMap((b) => b.samples.map((s) => s[k])))].map((v) =>
        [v,blocks.flatMap((b) => b.samples).filter((s) => s[k] === v).length]));
    arms[arm] = { ...p[arm], callCounts, assertionRows: blocks.map((b) => [b.before.assertionRows,b.after.assertionRows]),
      nativeSelectGuardScans: scans, scanClientP50Ms: {position:s.position.p50,wideStamp:s.wideStamp.p50,markerStamp:s.markerStamp.p50,fullNewGuard:s.fullNewGuard.p50} };
  }
  const failedMetrics = ["p50","p99"].filter((m) => p.ratios[m] > 1+p.tolerance[m]);
  assert.deepEqual(failedMetrics,index === 3 ? ["p99"] : []);
  return {history:p.history,encoding:p.encoding,size:p.size,arms,ratios:p.ratios,tolerance:p.tolerance,failedMetrics};
});
assert.equal(g6.failure.stage,"AB:0:compact:5");
assert.match(g6.failure.error,/G6 regression .* p99/);
assert.equal(events.filter((e) => e.kind === "first-failure").length,1);
assert.ok(!events.some((e) => e.stage.startsWith("AB:10000")));
const cleanup = read("cleanup.json");
assert.deepEqual(cleanup.original,owner);
for (const k of ["ownerAbsent","poolReservationAbsent","poolRetainedVolumeAbsent","containerAbsent","volumeAbsent"]) assert.equal(cleanup[k],true);
for (const phase of cleanup.phases) for (const stream of ["stdout","stderr"])
  assert.equal(hash(path.join(raw,`${phase.name}.${stream}`)),phase[`${stream}Sha256`]);
assert.match(fs.readFileSync(path.join(raw,"container-absent.stderr"),"utf8"),/No such object: tx2-xtdb-s1/i);
assert.match(fs.readFileSync(path.join(raw,"volume-absent.stderr"),"utf8"),/no such volume/i);
assert.ok(cleanup.phases.slice(0,2).every((p) => p.exit === 0));
const configuredContext = JSON.parse(fs.readFileSync("/Users/sam/.docker/config.json","utf8")).currentContext;
assert.equal(configuredContext,"colima");
assert.ok(!fs.existsSync("/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json"));
const poolBytes = fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/pool.json");
fs.writeFileSync(path.join(out,"pool-final.json"),poolBytes);
const pool = JSON.parse(poolBytes);
assert.ok(!pool.reservations.some((r) => r.container === owner.container));
assert.ok(!pool.retainedVolumes.some((r) => r.volume === owner.volume));
for (const [name,args] of [["status-final",["lab/bin/engine.mjs","status"]]])
  fs.writeFileSync(path.join(out,`${name}.txt`),execFileSync(process.execPath,args,{cwd:root,encoding:"utf8"}));
fs.writeFileSync(path.join(out,"disk-final.txt"),execFileSync("df",["-k",root],{encoding:"utf8"}));
const result = {schema:"rt01-live3/1",sealedAt:new Date().toISOString(),sourceHead:g2.head,
  productSource:"37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b", baselineCommit:baseline.commit,
  baselineIdentitySha256:rule.baselineIdentitySha256,build:g2.build,
  admissionFreeBytes:admission.freeBytes,engine:{id:engine.Id,image:engine.Image,labels:engine.Config.Labels},
  G2:{result:"PASS",casePasses:197,routes:42,schedules:2,deterministicFixtures:3,submitConflicts:count("submit-error")},
  G6:{result:"FAIL",ruleWrittenAt:rule.writtenAt,ruleSha256:ruleSha,calibration:g6.calibration.map(({encoding,size,left,right,tolerance})=>({encoding,size,left,right,tolerance})),points,failure:g6.failure,history10000:"NOT_RUN_FIRST_FAILURE"},
  cleanup:{ownedResourcesAbsent:true,configuredContext,phases:cleanup.phases},
  limits:"Native scan_rows_read are SELECT-predicate post-point probes on this shared table, not per-commit ASSERT execution counters. No causal attribution of p99 failure. No 10k or whole G6 PASS.",
  priorRound6FilesUnchanged:prior.size};
fs.writeFileSync(path.join(out,"RESULT.json"),JSON.stringify(result,null,2)+"\n");
fs.copyFileSync(import.meta.filename,path.join(out,"seal.mjs"));
// [EXP-RT01] Why: seal completed gate streams and immutable prior evidence without rewriting the old manifest. Rejected: adopting exit zero or a stale PASS label without content, attempt and source checks.
const files = [];
function walk(dir) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push({path:path.relative(durable,p),bytes:fs.statSync(p).size,sha256:hash(p)});}}
walk(raw); walk(out);
const manifest = files.sort((a,b)=>a.path.localeCompare(b.path)).map((f)=>`${f.sha256}  ${f.path}\n`).join("");
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-SHA256SUMS"),manifest);
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-INDEX.json"),JSON.stringify({root:durable,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),includesImmutableRound6:true,manifestSha256:createHash("sha256").update(manifest).digest("hex")},null,2)+"\n");
for(const f of files)assert.equal(hash(path.join(durable,f.path)),f.sha256,f.path);
fs.copyFileSync(path.join(out,"RESULT.json"),path.join(import.meta.dirname,"RESULT.json"));
console.log(JSON.stringify({G2:result.G2,G6:result.G6.result,failure:g6.failure.error,files:files.length}));
