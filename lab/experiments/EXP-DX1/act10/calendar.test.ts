// [DX-ACT8, sixth round] The fifth review's Y9: the account's deadline calendar in bounded rows (actv-lazy/join/
// calendar.ts). Diagnostic only (the Mac: correctness and counts; no scale claim).
//   Y9-1  against a sorted set under random inserts and ticks, at small shapes (deep trees) and the real one: the same
//         instants in order, every row within its bound, no row written twice, the root rewritten whenever the first
//         instant changes;
//   Y9-2  byte for byte while small: the one list and its operations exactly as the code before (save, expiresOn,
//         schedule, tick, enrolment);
//   Y9-3  through the in-process store with real commits: past the old row's 34,952 instants, a save adding one more
//         instant lands, and the account's own tick (`advance`) takes due instants off the front;
//   Y9-4  priced: per save and per tick at 1,000,000 instants (Y9_PRICE_N, default 200,000), by the writer's estimate.
//   Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/calendar.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { CalendarWork, calendarLayout, calendarMin, calendarNode, calendarPuts, calendarRoot, calendarShape, type CalendarParts, type CalendarShape } from "../actv-lazy/join/calendar.ts";
import { frameEstimate } from "../actv-lazy/join/frames.ts";
import { Documents, type Op } from "../notify1/store.ts";
import { heldAccount, MemDb, memStore, Proc, rng, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const valueLimit = 1048576;

/** A stand-in for `Documents` over a map: the real `put` and `change`, rows by key, and `apply` with the store's rules
 * (a retraction must name a live row; an assertion must not land over a live row of the same key). */
class FakeDocs {
  readonly prefix = "notice:v1:fake:";
  readonly live = new Map<string, { id: string; value: unknown }>();
  private readonly byId = new Map<string, string>();
  private serial = 0;
  reads = 0;
  put = Documents.prototype.put;
  change = Documents.prototype.change;
  async row<T>(k: string, _at: number) {
    this.reads++;
    const r = this.live.get(this.prefix + k);
    return r ? { key: k, id: r.id, at: 0, value: r.value as T } : undefined;
  }
  async get<T>(k: string, at: number) {
    const r = await this.row<T>(k, at);
    assert(r, "Missing durable " + k);
    return r;
  }
  apply(ops: readonly Op[]) {
    for (const o of ops) {
      if (o.op === "retract") {
        const e = this.byId.get(o.id);
        assert(e && this.live.get(e)?.id === o.id, "a retraction of a row that is not live");
        this.live.delete(e);
        this.byId.delete(o.id);
      } else {
        assert(o.op === "assert" && !this.live.has(o.entityId), "an assertion over a live row: " + (o as { entityId?: string }).entityId);
        const id = "r" + ++this.serial;
        this.live.set(o.entityId, { id, value: JSON.parse(o.value.value) });
        this.byId.set(id, o.entityId);
      }
    }
  }
  rootId() {
    return this.live.get(this.prefix + calendarRoot)?.id;
  }
}
const asDocs = (d: FakeDocs) => d as unknown as Documents;
/** An instant at microsecond `us` after 2027-01-01 (27 characters, SPEC 2). */
const base = Date.UTC(2027, 0, 1);
const instant = (us: number) => {
  const ms = Math.floor(us / 1000), iso = new Date(base + ms).toISOString();
  return iso.slice(0, 23) + String(us % 1000).padStart(3, "0") + "Z";
};
const span = 70 * 365 * 86400e6; // seventy years of microseconds: up to 2097

/** Every row of the calendar within its bound; returns the instants in order. */
async function check(d: FakeDocs, shape: CalendarShape) {
  const w = new CalendarWork(asDocs(d), 0, shape), { instants, rows, depth } = await w.all();
  const root = (await d.get<unknown>(calendarRoot, 0)).value;
  for (const [k, r] of d.live) {
    if (!k.startsWith(d.prefix + "join-calendar")) continue;
    const v = r.value as string[] | { kids: unknown[] };
    const n = Array.isArray(v) ? v.length : v.kids.length;
    assert(n <= (Array.isArray(v) ? shape.leafMax : shape.fanout) || (k === d.prefix + calendarRoot && Array.isArray(v)), "row over its bound: " + k + " " + n);
    if (k !== d.prefix + calendarRoot) assert(n > 0, "an empty node is stored: " + k);
  }
  const stored = [...d.live.keys()].filter((k) => k.startsWith(d.prefix + "join-calendar")).length;
  assert.equal(stored, rows, "every stored calendar row is reachable from the root");
  if (!Array.isArray(root)) assert.equal((root as CalendarParts).min, instants[0]);
  for (let i = 1; i < instants.length; i++) assert(instants[i - 1]! < instants[i]!);
  return { instants, rows, depth };
}

test("Y9-1: the calendar against a sorted set under random inserts and ticks, at small shapes and the real one", async () => {
  const out: unknown[] = [];
  for (const [shape, seeds, steps] of [[{ listMax: 3, leafMax: 2, fanout: 2 }, 12, 400], [{ listMax: 4, leafMax: 4, fanout: 3 }, 12, 600], [{ listMax: 8, leafMax: 3, fanout: 4 }, 8, 1500], [{ listMax: 2, leafMax: 5, fanout: 3 }, 8, 1500], [calendarShape, 2, 1500]] as [CalendarShape, number, number][])
    for (let seed = 1; seed <= seeds; seed++) {
      const r = rng(seed * 7919 + shape.leafMax), d = new FakeDocs(), oracle = new Set<string>();
      d.apply([calendarPuts(asDocs(d), [])[0]!]);
      let clock = 0, maxDepth = 0, rootRewrites = 0, minChanges = 0;
      for (let step = 0; step < steps; step++) {
        const w = new CalendarWork(asDocs(d), 0, shape), before = [...oracle].sort()[0], rootBefore = d.rootId();
        if (r.next() < 0.7 || oracle.size === 0) {
          // A save: one to five instants after the clock, some already there.
          const k = 1 + r.int(5);
          for (let i = 0; i < k; i++) {
            const x = r.next() < 0.15 && oracle.size ? r.pick([...oracle]) : instant(clock + 1 + r.int(shape === calendarShape ? 1e9 : 400));
            assert.equal(await w.insert(x), !oracle.has(x));
            oracle.add(x);
          }
        } else {
          // A tick: the first instant leaves and the clock moves to it.
          const due = await w.removeMin();
          assert.equal(due, [...oracle].sort()[0]);
          oracle.delete(due);
          clock = Math.max(clock, usOf(due));
        }
        const ops = w.ops();
        d.apply(ops);
        const { instants, depth } = await check(d, shape);
        assert.deepEqual(instants, [...oracle].sort(), "seed " + seed + " step " + step);
        assert.equal(await calendarMin(asDocs(d), 0), instants[0]);
        maxDepth = Math.max(maxDepth, depth);
        const after = instants[0];
        if (after !== before) {
          minChanges++;
          assert.notEqual(d.rootId(), rootBefore, "the root is rewritten whenever the first instant changes");
        }
        if (d.rootId() !== rootBefore) rootRewrites++;
        if (ops.length === 0) assert.equal(after, before);
      }
      // Drain: the tree empties back to the one empty list.
      while (oracle.size) {
        const w = new CalendarWork(asDocs(d), 0, shape), due = await w.removeMin();
        assert.equal(due, [...oracle].sort()[0]);
        oracle.delete(due);
        d.apply(w.ops());
      }
      await check(d, shape);
      assert.deepEqual((await d.get<unknown>(calendarRoot, 0)).value, []);
      assert.equal([...d.live.keys()].filter((k) => k.startsWith(d.prefix + "join-calendar-node:")).length, 0, "no node left behind");
      if (seed === 1) out.push({ shape, steps, maxDepth, rootRewrites, minChanges });
    }
  console.log("[Y9-1] " + JSON.stringify(out));
});
function usOf(x: string) {
  return (Date.parse(x.slice(0, 23) + "Z") - base) * 1000 + Number(x.slice(23, 26));
}

test("Y9-2: byte for byte while small: the one list and its operations as before", async () => {
  const r = rng(424242);
  let compared = 0;
  for (let round = 0; round < 300; round++) {
    const d = new FakeDocs(), n = r.int(calendarShape.listMax), have = [...new Set(Array.from({ length: n }, () => instant(r.int(1e7))))].sort();
    // The enrolment: one put of the sorted list.
    assert.deepEqual(calendarPuts(asDocs(d), have), [asDocs(d).put("join-calendar", have)]);
    d.apply(calendarPuts(asDocs(d), have));
    const row = await d.get<string[]>("join-calendar", 0);
    const add = Array.from({ length: r.int(4) }, () => (r.next() < 0.3 && have.length ? r.pick(have) : instant(r.int(1e7))));
    const union = [...new Set([...row.value, ...add])].sort();
    if (union.length > calendarShape.listMax) continue;
    // A deep save or an expiresOn edit: before, the row changed only when the list did.
    const w = new CalendarWork(asDocs(d), 0);
    for (const x of add) await w.insert(x);
    assert.deepEqual(w.ops(), canonical(union) !== canonical(row.value) ? asDocs(d).change("join-calendar", row, union) : []);
    // `schedule`: before, the row was always rewritten.
    const s = new CalendarWork(asDocs(d), 0);
    await s.touchRoot();
    const one = add[0] ?? instant(5);
    await s.insert(one);
    assert.deepEqual(s.ops(), asDocs(d).change("join-calendar", row, [...new Set([...row.value, one])].sort()));
    // A tick: the first instant off the front.
    if (row.value.length) {
      const t = new CalendarWork(asDocs(d), 0);
      assert.equal(await t.removeMin(), row.value[0]);
      assert.deepEqual(t.ops(), asDocs(d).change("join-calendar", row, row.value.slice(1)));
    }
    compared++;
  }
  // The layout switches to parts only past one leaf.
  const full = Array.from({ length: calendarShape.listMax }, (_, i) => instant(i));
  assert.ok(Array.isArray(calendarLayout(full).root));
  assert.ok(!Array.isArray(calendarLayout([...full, instant(1e6)]).root));
  console.log("[Y9-2] " + JSON.stringify({ compared }));
  assert(compared > 200);
});

test("Y9-3: through the in-process store: past the old row's 34,952 instants a save adding one more lands, and the account's tick takes due instants off the front", async () => {
  const db = new MemDb("act10-y9-" + process.pid, 9100);
  db.maxYield = 0;
  const cut = await seedAccount(db, "acct-cal", 4), held = heldAccount("acct-cal", 4, cut);
  const proc = (name: string) => new Proc(db, name);
  const account = (name: string) => new JoinedAccount(memStore(proc(name), held) as any);
  await account("enrol").installHeld(validTime);
  const a = account("cal"), store = memStore(proc("cal-store"), held) as any;
  const oracle = new Set<string>();
  const t0 = performance.now();
  // 36 saves of 1,000 instants each (36,000 distinct instants: past the 34,952 at which the one row met the 1 MiB value).
  let save = 0;
  const commitSave = async (xs: string[]) => {
    const p = await store.head(), w = new CalendarWork(a.db, p);
    for (const x of xs) {
      await w.insert(x);
      oracle.add(x);
    }
    const ops = w.ops(), r = await store.commit("y9-save-" + ++save, "lazy/join", ops, p);
    return { position: r.position, ops: ops.length, bytes: Math.max(0, ...ops.map((o) => (o.op === "assert" ? Buffer.byteLength(o.value.value) : 0))), reads: w.stats.reads, us: frameEstimate(ops).us };
  };
  const gen = rng(31337);
  for (let k = 0; k < 36; k++) await commitSave(Array.from({ length: 1000 }, (_, i) => instant(1e6 + (k * 1000 + i) * 977 + gen.int(900))));
  const head = await store.head(), shape = await new CalendarWork(a.db, head).all();
  assert.equal(shape.instants.length, oracle.size);
  assert.deepEqual(shape.instants, [...oracle].sort());
  assert(oracle.size > 34952);
  // The one row as before would hold every instant: over the store's value.
  const oneRow = Buffer.byteLength(canonical([...oracle].sort()));
  // One more save adding one instant (another subject's instants fill the calendar): lands; its largest value is a leaf.
  const one = await commitSave([instant(5e5)]);
  assert(one.bytes < 16384, "a save's largest calendar value is one bounded row");
  assert.equal(await calendarMin(a.db, await store.head()), [...oracle].sort()[0]);
  // The account's own tick (`advance`, one commit per due instant) through the real code.
  const sorted = [...oracle].sort(), through = sorted[4]!;
  await a.advance(through);
  const after = await new CalendarWork(a.db, await store.head()).all();
  assert.deepEqual(after.instants, sorted.slice(5), "the five due instants left, in order");
  assert.equal(await calendarMin(a.db, await store.head()), sorted[5]);
  const out = { instants: oracle.size, rows: shape.rows, depth: shape.depth, oneRowBytes: oneRow, oneRowOverTheValue: oneRow > valueLimit, oneMore: one, ticked: 5, ms: Math.round(performance.now() - t0) };
  console.log("[Y9-3] " + JSON.stringify(out));
});

test("Y9-4: priced per save and per tick at Y9_PRICE_N instants (default 200,000; Y9_PRICE_ORDER=ascending for half-full rows), by the writer's estimate", async () => {
  const n = Number(process.env.Y9_PRICE_N ?? 200000), ascending = process.env.Y9_PRICE_ORDER === "ascending", d = new FakeDocs(), r = rng(99), t0 = performance.now();
  const empty = frameEstimate([]).us;
  d.apply(calendarPuts(asDocs(d), []));
  const saves: { reads: number; rows: number; bytes: number; us?: number; marginalUs?: number }[] = [];
  const sample = (ops: Op[], reads: number, every: boolean) => ({
    reads, rows: ops.filter((o) => o.op === "assert").length,
    bytes: ops.reduce((s, o) => s + (o.op === "assert" ? Buffer.byteLength(o.value.value) : 0), 0),
    ...(every ? (() => { const us = frameEstimate(ops).us; return { us, marginalUs: us - empty }; })() : {}),
  });
  for (let i = 0; i < n; i++) {
    // One subject's save adding its own instant (an end of validity at its own microsecond), in no particular order.
    const w = new CalendarWork(asDocs(d), 0);
    await w.insert(instant(ascending ? Math.floor((i * span) / n) : r.int(span)));
    const ops = w.ops();
    d.apply(ops);
    saves.push(sample(ops, w.stats.reads, i % 50 === 0));
  }
  const built = await new CalendarWork(asDocs(d), 0).all();
  const ticks: typeof saves = [];
  for (let i = 0; i < 5000; i++) {
    const w = new CalendarWork(asDocs(d), 0);
    await w.removeMin();
    const ops = w.ops();
    d.apply(ops);
    ticks.push(sample(ops, w.stats.reads, true));
  }
  const summary = (xs: typeof saves) => {
    const q = (k: "reads" | "rows" | "bytes" | "us" | "marginalUs") => {
      const v = xs.map((x) => x[k]).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
      return { median: v[Math.floor(v.length / 2)], p99: v[Math.floor(v.length * 0.99)], max: v.at(-1) };
    };
    const mean = (k: "bytes") => Math.round(xs.reduce((s, x) => s + x[k], 0) / xs.length);
    return { count: xs.length, reads: q("reads"), rowsWritten: q("rows"), bytesWritten: { ...q("bytes"), mean: mean("bytes") }, estimateUs: q("us"), marginalUs: q("marginalUs") };
  };
  const root = (await d.get<CalendarParts>(calendarRoot, 0)).value;
  const out = {
    order: ascending ? "ascending" : "random", emptyCommitUs: empty, instants: built.instants.length, rows: built.rows, depth: built.depth, rootChildren: root.kids.length,
    rootBytes: Buffer.byteLength(canonical(root)),
    largestRowBytes: Math.max(...[...d.live.values()].map((x) => Buffer.byteLength(canonical(x.value)))),
    saves: summary(saves), ticks: summary(ticks), ms: Math.round(performance.now() - t0),
  };
  console.log("[Y9-4] " + JSON.stringify(out));
  assert(out.largestRowBytes < 16384);
  assert.equal(calendarNode("r.0"), "join-calendar-node:r.0");
});
