// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: use a distinct entity per command so exact returned-cut reads have ten expected facts.
// Rejected: accumulating assertions on 50 entities (changes the RYOW denominator and read cost).
import path from "node:path";
import { attempt, observe, quiet, save, finish } from "./observe.mjs";
import { summary, engineMeans } from "./analysis.mjs";
import { runtime, buildIdentity } from "./runtime.mjs";
const [root, arm, phase = "fresh", scopeArg, nArg = "150"] = process.argv.slice(2),
  n = Number(nArg);
const a = attempt(`${arm === "C" ? "F5" : "F6"}-${path.basename(root)}-${phase}`),
  scope = scopeArg === "-" || !scopeArg ? a.id : scopeArg;
const build = buildIdentity(root);
save(path.join(a.dir, "build.json"), build);
const rt = await runtime(root, arm, scope);
const raw = [];
let before;
try {
  before = observe();
  save(path.join(a.dir, "before.json"), before);
  if (!quiet(before).zero) throw new Error("G-QUIET");
  const start = performance.now();
  for (let i = 0; i < n; i++) {
    const subject = `${a.id}:${i}`,
      meta = { commandId: `${a.id}:${i}` },
      ops = rt.ops(i, subject, 10),
      t = performance.now();
    const result = await rt.run(rt.triples.transact(ops, meta)),
      ms = performance.now() - t;
    // Public returned tx is independently read back; storage cut is pinned to that returned receipt's position.
    const waits = rt.waitCount();
    const tx = await rt.run(rt.triples.transaction(result.txId));
    const rows = await rt.run(
      rt.adapter.getByEntity(rt.core.EntityId.make(`subj:${subject}`), {
        validAt: Date.now(),
        recordedPosition: result.position,
      }),
    );
    const correct =
      tx?.txId === result.txId &&
      tx?.position === result.position &&
      rows.length === 10 &&
      rows.every((r) => r.value_string === `v${i}-${Number(r.attribute.slice(6))}`);
    raw.push({
      i,
      subject,
      ms,
      result,
      tx,
      rows,
      correct,
      explicitWaitQueries: rt.waitCount() - waits,
    });
  }
  const elapsed = performance.now() - start,
    after = observe();
  save(path.join(a.dir, "after.json"), after);
  save(path.join(a.dir, "samples.json"), raw);
  save(path.join(a.dir, "timings.json"), rt.timings);
  const gates = {
    "G-QUIET": quiet(before).zero,
    "G-ACCT":
      raw.length === n &&
      raw.every((r) => r.correct) &&
      new Set(raw.map((r) => r.result.txId)).size === n &&
      new Set(raw.map((r) => r.result.position)).size === n,
    "G-RYOW": "UNVERIFIED_WAIT_TELEMETRY",
    exactCutContents:
      raw.length === n && raw.every((r) => r.correct && r.explicitWaitQueries === 0),
  };
  finish(a, {
    arm,
    phase,
    scope,
    n,
    facts: 10,
    buildHead: build.head,
    buildManifestSha256: (await import("./observe.mjs")).sha(path.join(a.dir, "build.json")),
    binding: before.binding,
    afterBinding: after.binding,
    serviceMs: summary(raw.slice(Math.min(15, n - 1)).map((r) => r.ms)),
    warmupDropped: Math.min(15, n - 1),
    commitsPerS: n / (elapsed / 1000),
    counts: rt.counts,
    timings: Object.fromEntries(
      Object.entries(rt.timings).map(([k, v]) => [k, v.length ? summary(v) : null]),
    ),
    engine: engineMeans(before.metrics, after.metrics, n),
    gates,
    ryowNote:
      "exact returned receipt position; observed contents and absence of explicit client awaits; no engine waitedMs telemetry exists in this build",
    runKind: n === 150 ? "diagnostic" : "smoke",
  });
  console.log(
    a.id,
    JSON.stringify(gates),
    summary(raw.slice(Math.min(15, n - 1)).map((r) => r.ms)),
  );
} catch (e) {
  save(path.join(a.dir, "failure.json"), { message: e.message, raw });
  finish(a, {
    arm,
    phase,
    scope,
    n,
    failure: e.message,
    binding: before?.binding,
    gates: { "G-ACCT": false, "G-RYOW": false },
  });
  throw e;
} finally {
  await rt.close();
}
