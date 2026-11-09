// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: prove the enabled and disabled G1 suites actually used different commit paths.
// Rejected: inferring the path solely from a launcher environment variable.
import fs from "node:fs";
import path from "node:path";
import { modules } from "./runtime.mjs";
import { attempt, observe, save, finish, RECEIPTS, sha } from "./observe.mjs";
const a = attempt("G1-path-proof"),
  m = await modules("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2X2/p2x"),
  c = m.xtdb.makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb", { maxConnections: 1 }),
  before = observe();
save(path.join(a.dir, "before.json"), before);
try {
  const rows = [];
  for (const [mode, id] of [
    ["on", "G1-xtdb-20261109T035632Z-48b59d"],
    ["off", "G1-xtdb-20261109T035857Z-203df3"],
  ]) {
    const file = path.join(RECEIPTS, id + ".json"),
      r = JSON.parse(fs.readFileSync(file));
    const feed = await c.query(
      "SELECT COUNT(*) AS n FROM tx_feed FOR ALL VALID_TIME WHERE scope_key = ?",
      [r.scopes.suite],
    );
    const meta = await c.query(
      "SELECT COUNT(*) AS n FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
      [r.scopes.suite],
    );
    rows.push({
      mode,
      id,
      receiptSha256: sha(file),
      scope: r.scopes.suite,
      feed: Number(feed[0].n),
      meta: Number(meta[0].n),
    });
  }
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  const qualified = rows[0].feed > 0 && rows[1].feed === 0 && rows.every((r) => r.meta > 0);
  finish(a, { binding: before.binding, afterBinding: after.binding, rows, qualified });
  console.log(a.id, rows, qualified);
  if (!qualified) process.exitCode = 1;
} finally {
  await c.close();
}
