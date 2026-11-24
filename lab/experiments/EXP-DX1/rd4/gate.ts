// [DX-RD4] Mac gate for "read at least the receipt's position" on a two-peer toy stack whose read peer can be held behind
// the transactor (stack/up.sh with DX_RD4_READ_HOLD=1; rd4/gate.sh starts and removes it). Correctness only; every time
// here is diagnostic. Through the public Triples API on the SDK package of this checkout:
//   1. not held: a reader built from each receipt reads the new value every time; the gateway's wait is counted;
//   2. held: a plain unpinned read is answered early (before the receipt); the receipt reader waits until the hold is
//      released and is answered at or after the receipt (head, entity, subject pull);
//   3. the deadline: a short wait refuses with AtLeastTimeout and the peer's head;
//   4. pinned reads (record time through Triples, position through the client) and the feed answer at once while held,
//      exactly as without the floor;
//   5. requests: the same gateway routes per read with and without the floor, and no request from the read peer to the
//      transactor during reads (the proxy counts the peer's bytes; a no-argument sync is the positive control).
//   node --experimental-transform-types gate.ts OUT_DIR WRITE_URL READ_URL HOLD_URL
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { openTriples, core, runtimeApi } from "../../../bench/lib/triplex.ts";

const [out, write, read, hold] = process.argv.slice(2);
assert(out && write && read && hold, "usage: gate.ts OUT_DIR WRITE_URL READ_URL HOLD_URL");
const api: any = await import("../../../../packages/datomic/dist/index.js");
const now = () => performance.timeOrigin + performance.now();
const json = async (url: string, method = "GET") => {
  const r = await fetch(url, { method });
  assert(r.ok, url + " " + r.status);
  return r.json() as Promise<any>;
};
const proxy = (verb: "hold" | "release" | "stats") => json(hold + "/" + verb, verb === "stats" ? "GET" : "POST");
const gatewayStats = () => json(read + "/v2/admin/scan-stats");
const scope = "rd4-gate-" + randomUUID().slice(0, 8);
const open = async (url: string, readAtLeast?: unknown) => {
  process.env.DATOMIC_URL = url;
  return openTriples("datomic", scope, undefined, readAtLeast === undefined ? undefined : { readAtLeast });
};
const id = core.EntityId.make("subject-rd4");
// Opening a scope syncs the peer with the transactor, so every open and every client happens before any hold.
const scopeKey = String(runtimeApi.DatabaseScope.test(scope));
const writer = await open(write);
const plain = await open(read);
const floor = new api.ReadAtLeast(0, { waitMs: 2000 });
const receiptReader = await open(read, floor);
const shortFloor = new api.ReadAtLeast(0, { waitMs: 200 });
const short = await open(read, shortFloor);
const client = new api.DatomicClient(read);
const db = (await client.create(scopeKey, "legacy", true)).db as string;
const results: Record<string, unknown> = { scope, source: process.env.DX_RD4_SOURCE };
let version = 0;
const save = async () => {
  version++;
  const receipt: any = await writer.run(writer.triples.transact([
    { op: "assert", entityId: id, entityType: "RD4", attribute: ":version", value: { type: "number", value: version } },
  ]));
  return { position: receipt.position as number, instant: receipt.instant as number, version };
};
const valueOf = (triples: readonly any[]) => {
  const live = triples.filter((t) => t.attribute === ":version");
  return live.length ? Math.max(...live.map((t) => Number(t.value.value))) : undefined;
};
const catchUp = async (position: number) => {
  for (let i = 0; i < 500; i++) {
    if (((await plain.run(plain.triples.currentPosition())) as number) >= position) return;
    await sleep(2);
  }
  throw Error("The read peer did not catch up");
};
const reads = {
  head: (h: any) => h.run(h.triples.currentPosition()) as Promise<number>,
  entity: async (h: any) => valueOf(await h.run(h.triples.entity(id))),
  pull: async (h: any) => valueOf((await h.run(h.triples.reach(id))).triples),
};
try {
  const first = await save();
  await catchUp(first.position);

  // 1. Not held: every read by the receipt reader right after the acknowledgement is at or after it. Half the rounds
  // read plainly first (how often the read peer trails an acknowledgement on this toy), half with the receipt first
  // (how often, and how long, the gateway then waits). Each round's per-request wait is the gateway counter's step.
  const rounds = Number(process.env.DX_RD4_ROUNDS ?? 300);
  const notHeld = { rounds, plainFirstEarly: 0, plainAfterEarly: 0, receiptEarly: 0, waits: [] as { ms: number; receiptReadFirst: boolean }[],
    clientMs: [] as number[] };
  const before1 = await gatewayStats();
  for (let i = 0; i < rounds; i++) {
    const g0 = await gatewayStats();
    const r = await save();
    floor.raise(r);
    const kind = (["head", "entity", "pull"] as const)[i % 3];
    const late = (answer: number | undefined) => (kind === "head" ? answer! < r.position : answer !== r.version);
    const plainFirst = i % 2 === 0;
    if (plainFirst && late(await reads[kind](plain))) notHeld.plainFirstEarly++;
    const started = now();
    const answer = await reads[kind](receiptReader);
    notHeld.clientMs.push(now() - started);
    const g1 = await gatewayStats();
    if ((g1.atLeast?.waited ?? 0) > (g0.atLeast?.waited ?? 0))
      notHeld.waits.push({ ms: ((g1.atLeast?.waitMicros ?? 0) - (g0.atLeast?.waitMicros ?? 0)) / 1000,
        receiptReadFirst: !plainFirst });
    if (late(answer)) notHeld.receiptEarly++;
    if (!plainFirst && late(await reads[kind](plain))) notHeld.plainAfterEarly++;
  }
  const after1 = await gatewayStats();
  const delta = (a: any, b: any, key: string) => (b.atLeast?.[key] ?? 0) - (a.atLeast?.[key] ?? 0);
  results.notHeld = {
    rounds, receiptEarly: notHeld.receiptEarly,
    plainReadFirstEarly: { early: notHeld.plainFirstEarly, of: Math.ceil(rounds / 2) },
    plainReadAfterReceiptReadEarly: { early: notHeld.plainAfterEarly, of: Math.floor(rounds / 2) },
    gatewayAtLeastRequests: delta(before1, after1, "requests"), gatewayWaited: delta(before1, after1, "waited"),
    gatewayWaitMs: { total: delta(before1, after1, "waitMicros") / 1000, each: notHeld.waits },
    clientMsDiagnostic: { p50: pct(notHeld.clientMs, 0.5), p99: pct(notHeld.clientMs, 0.99), max: Math.max(...notHeld.clientMs) },
  };
  assert.equal(notHeld.receiptEarly, 0, "A receipt reader answered before its receipt");

  // 2. Held: plain reads answer early; receipt reads wait for the release and answer at or after the receipt.
  const held: Record<string, unknown>[] = [];
  for (const kind of ["head", "entity", "pull"] as const) {
    const previous = version;
    await proxy("hold");
    const r = await save();
    floor.raise(r);
    const early = await reads[kind](plain);
    const isEarly = kind === "head" ? early! < r.position : early === previous;
    const statsBefore = await gatewayStats();
    const started = now();
    const waiting = reads[kind](receiptReader);
    let settled = false;
    void waiting.then(() => (settled = true), () => (settled = true));
    await sleep(300);
    const stillWaiting = !settled;
    const released = now();
    await proxy("release");
    const answer = await waiting;
    const ended = now();
    const statsAfter = await gatewayStats();
    const atOrAfter = kind === "head" ? answer! >= r.position : answer === r.version;
    held.push({ kind, receipt: r.position, plainAnswer: early, plainEarly: isEarly, stillWaitingAt300ms: stillWaiting,
      receiptAnswer: answer, atOrAfter, waitedMsDiagnostic: ended - started, afterReleaseMsDiagnostic: ended - released,
      gatewayWaited: delta(statsBefore, statsAfter, "waited"),
      gatewayWaitMicros: delta(statsBefore, statsAfter, "waitMicros") });
    assert(isEarly, kind + ": the held peer should answer a plain read early");
    assert(stillWaiting, kind + ": the receipt read answered while the peer was held");
    assert(atOrAfter, kind + ": the receipt read answered before the receipt");
    await catchUp(r.position);
  }
  results.held = held;

  // 3. The deadline.
  {
    await proxy("hold");
    const r = await save();
    shortFloor.raise(r);
    const started = now();
    const error = await short.run(short.triples.currentPosition()).then(() => undefined, (e: any) => e);
    const elapsed = now() - started;
    await proxy("release");
    const chain: any[] = [];
    for (let e = error; e && chain.length < 8; e = e.cause) chain.push(e);
    const timeout = chain.find((e) => e?.code === "AtLeastTimeout");
    results.deadline = { receipt: r.position, refused: Boolean(timeout), head: timeout?.head ?? timeout?.maximum,
      message: chain.map((e) => String(e?.message ?? e)).find((m) => /did not reach/.test(m)), elapsedMsDiagnostic: elapsed };
    assert(timeout, "The short wait must refuse with AtLeastTimeout");
    assert(Number(timeout.head ?? timeout.maximum) < r.position, "The refusal names a head before the receipt");
    assert(elapsed >= 180, "The refusal came before its wait");
    await catchUp(r.position);
  }

  // 4. Pinned reads and the feed answer at once while held, as without the floor.
  {
    const before = await save();
    await catchUp(before.position);
    await proxy("hold");
    const r = await save();
    floor.raise(r);
    const started = now();
    const pinnedTime = valueOf(await receiptReader.run(receiptReader.triples.entity(id, { recordedAt: before.instant })));
    const plainPinnedTime = valueOf(await plain.run(plain.triples.entity(id, { recordedAt: before.instant })));
    const pinnedRows = await client.rows(db, { pattern: { entityId: id }, basis: { validAt: Date.now(), recordedPosition: before.position } });
    const feed = await receiptReader.run(receiptReader.triples.transactions({ after: before.position - 1, limit: 10 }));
    const plainFeed = await plain.run(plain.triples.transactions({ after: before.position - 1, limit: 10 }));
    const elapsed = now() - started;
    await proxy("release");
    const pinnedVersion = Math.max(...pinnedRows.filter((x: any) => x.attribute === ":version" && x.retracted_at === null)
      .map((x: any) => Number(x.value_number ?? x.value_string)));
    const positions = (page: any) => page.transactions.map((t: any) => t.position);
    results.pinnedAndFeed = { before: before.position, receipt: r.position, pinnedRecordTime: pinnedTime,
      plainPinnedRecordTime: plainPinnedTime, pinnedPositionRowsVersion: pinnedVersion,
      feedPositions: positions(feed), plainFeedPositions: positions(plainFeed), elapsedMsDiagnostic: elapsed };
    assert.equal(pinnedTime, before.version);
    assert.equal(plainPinnedTime, before.version);
    assert.deepEqual(positions(feed), positions(plainFeed));
    assert(!positions(feed).includes(r.position), "The held peer's feed cannot hold the held save");
    assert(elapsed < 1500, "Pinned reads and the feed must not wait for the floor");
    await catchUp(r.position);
  }

  // 5. Requests: gateway routes per read, and nothing from the read peer to the transactor during reads.
  {
    const r = await save();
    await catchUp(r.position);
    floor.raise(r);
    const window = async (label: string, work: () => Promise<unknown>) => {
      const [g0, p0] = [await gatewayStats(), await proxy("stats")];
      const started = now();
      await work();
      const elapsed = now() - started;
      const [g1, p1] = [await gatewayStats(), await proxy("stats")];
      const routes: Record<string, number> = {};
      for (const [k, v] of Object.entries(g1.routes ?? {}) as [string, number][]) {
        const d = v - ((g0.routes ?? {})[k] ?? 0);
        if (d && !k.includes("scan-stats")) routes[k] = d;
      }
      return { label, routes, toTransactorChunks: p1.toTransactorChunks - p0.toTransactorChunks,
        toTransactorBytes: p1.toTransactorBytes - p0.toTransactorBytes, elapsedMsDiagnostic: elapsed };
    };
    const n = 100;
    const each = (h: any) => async () => { for (let i = 0; i < n; i++) { await reads.head(h); await reads.entity(h); await reads.pull(h); } };
    const windows = [
      await window("idle", () => sleep(1500)),
      await window("plain reads", each(plain)),
      await window("receipt reads", each(receiptReader)),
      await window("idle", () => sleep(1500)),
      await window("positive control: 20 no-argument syncs (write-options)", async () => {
        for (let i = 0; i < 20; i++) await json(read + "/v1/db/" + db + "/write-options");
      }),
    ];
    results.requests = { readsPerWindow: n * 3, windows };
    const [, plainW, receiptW, , control] = windows;
    assert.deepEqual(Object.keys(receiptW!.routes).sort(), Object.keys(plainW!.routes).sort(), "Different routes");
    for (const [k, v] of Object.entries(plainW!.routes)) assert.equal(receiptW!.routes[k], v, "Different count on " + k);
    assert(control!.toTransactorChunks >= 20, "The positive control must reach the transactor");
  }
  results.passed = true;
} finally {
  fs.writeFileSync(path.join(out, "gate.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
  client.close();
  await short.close();
  await receiptReader.close();
  await plain.close();
  await writer.close();
}
function pct(xs: number[], p: number) {
  const s = xs.toSorted((a, b) => a - b);
  return s[Math.max(0, Math.ceil(s.length * p) - 1)];
}
