// [DX-SCALE2] Micro-measurements of per-account structures that live in TypeScript processes, at A = 1,000, 10,000
// and 100,000 accounts (no stack needed). Times are diagnostic (Mac); counts and bytes are what the table uses.
//   node --no-warnings --expose-gc --experimental-transform-types lab/experiments/EXP-DX1/scale2/micro.ts OUT.json
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateIdListOptions } from "../../../../packages/datomic/dist/idLists.js";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RollingCredits } from "../prep1/rolling-credits.ts";
import { FairTurns } from "../prep1/fair-turns.ts";

const out = process.argv[2];
assert(out);
const gc = () => (globalThis.gc?.(), globalThis.gc?.(), process.memoryUsage().heapUsed);
const time = (f: () => void) => { const t = performance.now(); f(); return performance.now() - t; };
const key = (i: number) => "account-" + String(i).padStart(6, "0");
const db = "s2-" + "W".repeat(150); // a scope name of the held runner's length
const result: Record<string, unknown> = {};

// 1. ID list options: the range check per type, pairwise (today) and sorted (TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS).
const ranges = (n: number) => ({ types: { Subject: Array.from({ length: n }, (_, i) => ({ account: key(i), prefix: "pl:", shape: "pl:{8 digits}" })) } });
const check: Record<string, unknown>[] = [];
for (const n of [1_000, 3_000, 10_000]) {
  delete process.env.TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS;
  const pairwise = time(() => validateIdListOptions(ranges(n)));
  process.env.TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS = "1";
  const sorted = time(() => validateIdListOptions(ranges(n)));
  check.push({ accounts: n, pairwiseMs: Math.round(pairwise), sortedMs: Math.round(sorted * 10) / 10 });
}
process.env.TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS = "1";
check.push({ accounts: 100_000, pairwiseMs: null, sortedMs: Math.round(time(() => validateIdListOptions(ranges(100_000)))) });
delete process.env.TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS;
const h0 = gc();
const kept = ranges(100_000);
const optionsBytes = Math.round((gc() - h0) / 100_000);
assert(kept.types.Subject.length === 100_000);
result.idListRanges = { check, optionsBytesPerAccount: optionsBytes };

// 2. The settlement bulk queue: a turn's choice walks the ready keys; turnsByKey keeps one count per key ever served.
const queue: Record<string, unknown>[] = [];
for (const n of [1_000, 10_000, 100_000]) {
  const q = new BulkQueue(1);
  q.setExternal(true);
  const before = gc();
  for (let i = 0; i < n; i++) void q.submit(db + "/" + key(i), async () => {});
  const ready = Math.round((gc() - before) / n);
  // Serve every key once (external turns), so each has a turnsByKey entry and no ready turn.
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await q.runNext();
  const perTurnUs = ((performance.now() - t0) / n) * 1000;
  const served = gc();
  queue.push({ accounts: n, readyBytesPerAccount: ready, turnsByKeyEntries: q.turnsByKey.size,
    retainedBytesPerAccountAfterServed: Math.round((served - before) / n), meanTurnMicros: Math.round(perTurnUs * 10) / 10 });
}
result.bulkQueue = queue;

// 3. The load generator's admission (prep1): one served count per account and a window of A grants.
const credits: Record<string, unknown>[] = [];
for (const n of [1_000, 10_000, 100_000]) {
  const before = gc();
  const r = new RollingCredits(n, 6, 0);
  const f = new FairTurns(n, 6, 0);
  const bytes = Math.round((gc() - before) / n);
  // One dispatch over 64 ready saves of distinct accounts.
  const ready = Array.from({ length: 64 }, (_, i) => ({ account: (i * 7919) % n, due: i }));
  let granted = 0;
  const t = time(() => r.dispatch(() => ready, () => { granted++; }));
  credits.push({ accounts: n, bytesPerAccount: bytes, grantedInOneDispatch: granted, dispatchMs: Math.round(t * 100) / 100,
    fairnessWindowGrants: n });
  assert(f);
}
result.admission = credits;
fs.writeFileSync(out, JSON.stringify(result, null, 1) + "\n");
console.log(JSON.stringify(result));
