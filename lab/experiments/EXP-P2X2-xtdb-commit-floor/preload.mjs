// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated local values; unannotated dynamic parameters; initially empty collections; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-P2X2] Why: real public commits in groups of eight create claims, journal and fact history.
// Rejected: literal stamped VALUES and synthetic journal rows (heap exhaustion / incomplete history).
import path from "node:path";
import { runtime, buildIdentity } from "./runtime.mjs";
import { attempt, observe, save, finish } from "./observe.mjs";
const [root, arm, scope] = process.argv.slice(2),
  a = attempt(`history-${arm}-${path.basename(root)}`),
  n = 10000;
const build = buildIdentity(root);
save(path.join(a.dir, "build.json"), build);
const rt = await runtime(root, arm, scope);
const raw = [];
let before;
const batch = arm === "C" ? 8 : 64;
try {
  before = observe();
  save(path.join(a.dir, "before.json"), before);
  if (before.host.freeDiskBytes - 2.5e9 < 5 * 1024 ** 3) throw new Error("G-DISK forecast");
  for (let base = 0; base < n; base += batch) {
    const group = Array.from({ length: Math.min(batch, n - base) }, (_, k) => base + k);
    const results = await rt.run(
      rt.adapter.withTransaction(
        rt.Effect.forEach(group, (i) =>
          rt.triples.transact(rt.ops(`history-${i}`, i, 10), { commandId: `${a.id}:${i}` }),
        ),
        { replaySafe: true },
      ),
    );
    results.forEach((r, k) => raw.push({ i: group[k], ...r }));
    if (base % 800 === 0) console.log(`${a.id} ${raw.length}/${n}`);
  }
  const after = observe();
  save(path.join(a.dir, "after.json"), after);
  save(path.join(a.dir, "commits.json"), raw);
  const counts = await rt.inner.query(
    "SELECT COUNT(*) AS n FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
    [scope],
  );
  const claims = await rt.inner.query(
    "SELECT COUNT(*) AS n FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ?",
    [scope],
  );
  const rows = await rt.inner.query(
    "SELECT COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ?",
    [scope],
  );
  const account =
    raw.length === n && new Set(raw.map((r) => r.txId)).size === n && Number(claims[0]?.n) === n;
  finish(a, {
    scope,
    arm,
    n,
    buildHead: build.head,
    binding: before.binding,
    afterBinding: after.binding,
    counts,
    claims,
    rows,
    account,
    groupSize: batch,
  });
  if (!account) throw new Error("history accounting");
} catch (e) {
  save(path.join(a.dir, "failure.json"), { message: e.message, completed: raw.length });
  throw e;
} finally {
  await rt.close();
}
