// [EXP-P2X2] Why: an interrupted setup remains a first attempt, with observed terminal engine state.
// Rejected: treating its progress log as a completed 10k preload or reusing its namespace.
import path from "node:path";
import { attempt, observe, save, finish } from "./observe.mjs";
import { modules } from "./runtime.mjs";
const scope = process.argv[2] ?? "P2X2-history-main",
  original = process.argv[3] ?? "history-A0-p2x2-2026-11-09T04-11-51-568Z-e248c7";
const a = attempt("aborted-A0-setup-audit"),
  m = await modules(process.cwd()),
  c = m.xtdb.makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb", { maxConnections: 1 });
const before = observe();
save(path.join(a.dir, "before.json"), before);
try {
  const claims = await c.query(
    "SELECT command_id,tx_id,position FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ?",
    [scope],
  );
  const facts = await c.query(
    "SELECT COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ?",
    [scope],
  );
  const submitted = await c.query("SHOW LATEST_SUBMITTED_TX"),
    completed = await c.query("SHOW LATEST_COMPLETED_TXS");
  save(path.join(a.dir, "observed.json"), { claims, facts, submitted, completed });
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  finish(a, {
    binding: before.binding,
    afterBinding: after.binding,
    originalAttempt: original,
    originalExit: 143,
    reason: "A0 setup exceeds the slot phase budget; retained, not adopted as 10k history",
    observedCommittedClaims: claims.length,
    facts,
    submitted,
    completed,
    qualified: false,
  });
  console.log(a.id, claims.length);
} finally {
  await c.close();
}
