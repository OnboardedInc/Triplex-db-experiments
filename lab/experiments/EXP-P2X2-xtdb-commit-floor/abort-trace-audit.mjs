// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: recover committed commands of an interrupted calibration from durable engine claims.
// Rejected: discarding its rows or treating an incomplete offer/ACK log as a qualified trace.
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { modules } from "./runtime.mjs";
import { attempt, observe, save, finish, sha } from "./observe.mjs";
const dir = process.argv[2],
  original = path.basename(dir),
  offers = JSON.parse(fs.readFileSync(path.join(dir, "offers.json"))),
  a = attempt("aborted-trace-audit"),
  m = await modules("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/p2x"),
  c = m.xtdb.makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb", { maxConnections: 1 }),
  before = observe();
save(path.join(a.dir, "before.json"), before);
try {
  let submitted, completed;
  for (let i = 0; i < 120; i++) {
    submitted = await c.query("SHOW LATEST_SUBMITTED_TX");
    completed = await c.query("SHOW LATEST_COMPLETED_TXS");
    if (String(submitted[0]?.tx_id) === String(completed.find((r) => r.db_name === "xtdb")?.tx_id))
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const claims = await c.query(
    "SELECT command_id,tx_id,position FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ? AND command_id LIKE ?",
    ["P2X2-history-C", original + ":%"],
  );
  const raw = claims.map((claim) => {
    const seq = Number(claim.command_id.slice(original.length + 1)),
      event = offers.events.find((e) => e.seq === seq && !e.resend);
    if (!event) throw new Error("claim outside frozen offers");
    return {
      event,
      result: { txId: claim.tx_id, position: Number(claim.position) },
      reconstructed: true,
    };
  });
  fs.writeFileSync(
    path.join(a.dir, "samples.json.gz"),
    gzipSync(JSON.stringify({ raw, claims, checks: [], readerResults: [] })),
  );
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  finish(a, {
    arm: "F7",
    runKind: "aborted",
    scope: "P2X2-history-C",
    binding: before.binding,
    afterBinding: after.binding,
    valuePrefix: original,
    originalAttempt: original,
    originalBeforeSha256: sha(path.join(dir, "before.json")),
    offersSha256: sha(path.join(dir, "offers.json")),
    committed: claims.length,
    submitted,
    completed,
    qualified: false,
    reason:
      "interrupted verification-load calibration; not used for latency predictions; committed rows retained as replay-model inputs; original events.jsonl, when present, retains exact offered/ACK bytes",
  });
  console.log(a.id, claims.length);
} finally {
  await c.close();
}
