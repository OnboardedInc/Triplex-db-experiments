/** EXP-P4 H1 current table: exact answers for eligible bases, typed fallback for every ineligible one
 * (B below H, B above W, a consumer cut, a regression of W), reorder buffer, instant-order guard.
 * Reference: the in-process `memory` composition, which implements the documented read semantics. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { CurrentTable, h1Composition, type AppliedTx } from "../lib/current-table.ts";
import { memoryComposition } from "../lib/memory.ts";
import { observe } from "../lib/observe.ts";
import { Rng } from "../lib/rng.ts";
import { SEED_VALID_FROM, accountsFor, ids, ownFacts, sharedFacts, versioned } from "../lib/world.ts";
import { seedOps } from "../lib/commands.ts";
import type { Basis, Receipt } from "../lib/composition.ts";

const DAY = 86_400_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function world(scope: string, subjects = 12) {
  const src = memoryComposition("xtdb", scope);
  const h1 = h1Composition(src, { applyReceipts: true });
  const receipts: Receipt[] = [];
  const commit = async (ops: any[], meta: any = {}) => {
    const out = await h1.transact(ops, { commandId: `c${receipts.length}:${scope}`, ...meta });
    assert.ok(out.ok, `transact failed: ${!out.ok && out.tag}`);
    receipts.push(out.value);
    await sleep(2);
    return out.value;
  };
  const accounts = accountsFor(subjects);
  for (let a = 0; a < accounts; a++) await commit(seedOps(sharedFacts(a)));
  const versionIds = new Map<number, string[]>();
  for (let i = 0; i < subjects; i++) {
    const r = await commit(seedOps(ownFacts(i, accounts)));
    versionIds.set(i, versioned(i, 0).map((f) => r.triples.find((t) => t.entityId === f.e && t.attribute === f.a)!.id));
  }
  // History growth to depth 4 on the even subjects, plus a correction valid from 30 days back and an expired fact.
  for (let v = 1; v < 4; v++) {
    for (let i = 0; i < subjects; i += 2) {
      const old = versionIds.get(i)!;
      const ops: any[] = [...old.map((id) => ({ op: "retract", id })), ...versioned(i, v).map((f) => ({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: SEED_VALID_FROM }))];
      const now = Date.now();
      if (v === 2) ops.push({ op: "assert", entityId: ids.worker(i), attribute: ":worker/note", value: { type: "string", value: `expired-${i}` }, validFrom: now - 60 * DAY, validTo: now - 20 * DAY });
      if (v === 3) ops.push({ op: "assert", entityId: ids.worker(i), attribute: ":worker/address", value: { type: "string", value: `corr-${i}` }, validFrom: now - 30 * DAY });
      const r = await commit(ops, { preconditions: old.map((id) => ({ _tag: "TripleLive", id })) });
      versionIds.set(i, versioned(i, v).map((f) => r.triples.find((t) => t.entityId === f.e && t.attribute === f.a)!.id));
    }
  }
  return { src, h1, receipts, commit, subjects };
}

const digest = (pr: any) => observe(pr).digest;

test("H1: every eligible read equals the source at the same basis (receipt-fed writer)", async () => {
  const { src, h1, receipts, subjects } = await world("ct-a");
  const rng = new Rng(7);
  let served = 0;
  for (let k = 0; k < 400; k++) {
    const r = receipts[rng.int(receipts.length)]!;
    const basis: Basis = { recordedAt: r.instant, validAt: Date.now() - rng.int(90) * DAY };
    const root = ids.placement(rng.int(subjects));
    const [a, b] = [await src.pull(root, basis), await h1.pull(root, basis)];
    assert.equal(b.route, "current-h1");
    assert.equal(digest(b), digest(a), `mismatch at ${root} R=${basis.recordedAt} V=${basis.validAt}`);
    assert.equal(b.entities, a.entities);
    served++;
  }
  assert.equal(served, 400);
  // A basis before the first commit sees nothing on both paths.
  const empty = await h1.pull(ids.placement(0), { recordedAt: receipts[0]!.instant - 1, validAt: Date.now() });
  assert.equal(empty.route, "current-h1");
  assert.equal(empty.triples.length, 0);
});

test("H1: bases below the horizon fall back to the source and stay exact", async () => {
  const { src, h1, receipts, subjects } = await world("ct-b");
  const cut = receipts[receipts.length - 3]!;
  const removed = h1.table.purge(cut.position);
  assert.ok(removed > 0, "growth retracted rows at or before the horizon");
  for (const r of receipts) {
    for (let i = 0; i < subjects; i++) {
      const basis = { recordedAt: r.instant, validAt: Date.now() };
      const out = await h1.pull(ids.placement(i), basis);
      assert.equal(out.route, r.instant < cut.instant ? "fallback:below-horizon" : "current-h1");
      assert.equal(digest(out), digest(await src.pull(ids.placement(i), basis)));
    }
  }
});

test("H1: a follower that stops consuming falls back above W, waits at most the budget, then catches up", async () => {
  const { src, h1, commit } = await world("ct-c", 6);
  const follower = h1Composition(src, { applyReceipts: false, followEveryMs: 0 }, CurrentTable.fromSnapshot(h1.table.snapshot()));
  const before = follower.table.watermark;
  const r = await commit(seedOps([{ e: ids.placement(1), a: ":placement/flag", v: { type: "string", value: "late" } }]));
  const basis = { recordedAt: r.instant, validAt: Date.now() };
  const t0 = performance.now();
  // No pending gap and no poller: the wait cannot resolve, so the read falls back after the budget.
  const out = await follower.pull(ids.placement(1), basis);
  const waited = performance.now() - t0;
  assert.equal(out.route, "fallback:above-watermark");
  assert.ok(out.waitedMs >= 9 && waited < 200, `waited ${out.waitedMs} ms`);
  assert.equal(digest(out), digest(await src.pull(ids.placement(1), basis)));
  assert.equal(follower.table.watermark, before);
  assert.equal(await follower.catchUp(), 1);
  const after = await follower.pull(ids.placement(1), basis);
  assert.equal(after.route, "current-h1");
  assert.equal(digest(after), digest(out));
});

test("H1: a regression of W (restore from an older snapshot) narrows what is served at once", async () => {
  const { src, h1, receipts, commit } = await world("ct-d", 6);
  const old = h1.table.snapshot();
  const late = await commit(seedOps([{ e: ids.placement(2), a: ":placement/flag", v: { type: "string", value: "after-snapshot" } }]));
  const basis = { recordedAt: late.instant, validAt: Date.now() };
  assert.equal((await h1.pull(ids.placement(2), basis)).route, "current-h1");
  h1.replaceTable(CurrentTable.fromSnapshot(old));
  const regressed = await h1.pull(ids.placement(2), basis);
  assert.equal(regressed.route, "fallback:above-watermark");
  assert.equal(digest(regressed), digest(await src.pull(ids.placement(2), basis)));
  // receipts.at(-1) is `late`; the one before it is the snapshot's own watermark.
  const older = { recordedAt: receipts.at(-2)!.instant, validAt: Date.now() };
  assert.equal((await h1.pull(ids.placement(2), older)).route, "current-h1");
});

test("H1: reorder buffer, instant-order guard and poisoning", () => {
  const t = new CurrentTable();
  const tx = (position: number, instant: number, extra: Partial<AppliedTx> = {}): AppliedTx => ({ position, instant, asserts: [{ id: `r${position}`, entityId: "e", attribute: ":a", value: { type: "string", value: `v${position}` }, validFrom: 0 }], retracts: [], ...extra });
  t.apply(tx(2, 20));
  assert.equal(t.watermark, 0);
  assert.equal(t.eligibility(5).ok, false);
  t.apply(tx(1, 10));
  assert.equal(t.watermark, 2);
  assert.deepEqual(t.eligibility(20), { ok: true });
  assert.equal(t.eligibility(21).ok, false);
  // Equal instants: the table switches to the strict rule and stops serving R == instant(W).
  t.apply(tx(3, 20));
  assert.equal(t.strict, false);
  assert.equal(t.eligibility(20).ok, false);
  assert.deepEqual(t.eligibility(19), { ok: true });
  t.apply(tx(4, 30, { retracts: ["missing"] }));
  assert.deepEqual(t.eligibility(25), { ok: false, reason: "poisoned" });
});
