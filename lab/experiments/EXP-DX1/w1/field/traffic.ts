import assert from "node:assert/strict";
import { setTimeout as wait } from "node:timers/promises";
import {
  DatomicClient,
  DatomicHttpError,
  type DatomicWriteClass,
} from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { command } from "../group/workload.ts";
import { accounts as roster } from "../group/population.ts";
import { ids, type Fact } from "../../../../bench/lib/world.ts";
import { offers, rates, quantile, sha, type Offer } from "./schedule.ts";
type Input = Parameters<DatomicClient["transact"]>[1];
type Ack = {
  operationId: string;
  t: { v: string };
  position: { v: string };
  recordedAt: { v: number };
  requestBytes: number;
  preparedOps: number;
  transactMicros: number;
  groupSize?: number;
  groupQueueMicros?: number;
  submitToNativeEntryMs: number;
  readyToNativeEntryMs: number;
  timeline: { payloadPrepared: number; completed: number; submitted?: number };
};
const q = (xs: number[]) => ({ p50: quantile(xs, 0.5), p99: quantile(xs, 0.99) });
export const scopeKey = (nonce: string) =>
  JSON.stringify(["triplex-scope-v1", "test", "field", nonce, 0]);
const fact = (e: string, a: string, value: string): Fact => ({
  e,
  a,
  v: { type: "string", value },
});
async function record(
  c: DatomicClient,
  db: string,
  input: Input,
  start: number,
  due: number,
  account: number,
  person: number,
) {
  const hand = performance.now() - start;
  const r = (await c.transact(db, input)) as Ack,
    end = performance.now() - start;
  assert.equal(r.operationId, input.operationId);
  assert(Number(r.position.v) > 0 && Number(r.t.v) > 0 && Number.isFinite(r.recordedAt.v));
  assert(
    r.requestBytes > 0 &&
      r.preparedOps > 0 &&
      r.transactMicros >= 0 &&
      r.submitToNativeEntryMs >= 0,
  );
  return {
    id: r.operationId,
    account,
    person,
    due,
    hand,
    end,
    p: Number(r.position.v),
    t: r.t.v,
    clock: r.recordedAt.v,
    size: r.groupSize ?? 1,
    bytes: r.requestBytes,
    ops: r.preparedOps,
    prepareMs: r.timeline.payloadPrepared / 1000,
    awaitMs: r.transactMicros / 1000,
    gatewayQueueMs: (r.groupQueueMicros ?? 0) / 1000,
    nativeEntryMs: r.submitToNativeEntryMs,
    readyToNativeMs: r.readyToNativeEntryMs,
  };
}
export type Observed = Awaited<ReturnType<typeof record>>;
export function physical(rows: Observed[], head: number) {
  const byT = new Map<string, Observed[]>(),
    ordered = [...rows].sort((a, b) => a.p - b.p);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  for (const [i, r] of ordered.entries()) {
    assert.equal(r.p, head + i + 1);
    assert(!i || ordered[i - 1]!.clock < r.clock);
    const group = byT.get(r.t) ?? [];
    group.push(r);
    byT.set(r.t, group);
  }
  let same = 0;
  for (const g of byT.values()) {
    assert(g.every((r, i) => r.size === g.length && r.p === g[0]!.p + i));
    same += g.length - new Set(g.map((r) => r.account + "/" + r.person)).size;
  }
  return { native: byT.size, sameSubjectShared: same, logical: rows.length };
}
export async function queueTrial(url: string, nonce: string, priority: boolean) {
  const c = new DatomicClient(url, 35000),
    scope = scopeKey(nonce);
  try {
    const { db, created } = await c.create(scope, "lean", true, 35000);
    assert(created);
    let head = 0;
    const samples = [];
    for (const width of [8, 32, 80, 80, 32, 8]) {
      const start = performance.now(),
        index = samples.length,
        jobs: Promise<Observed>[] = [];
      for (let i = 0; i < 10; i++) {
        const kind: DatomicWriteClass =
          i < 8 ? (["import", "activation", "notice"] as const)[i % 3]! : "live";
        const account = i < 8 ? i % 3 : 9,
          person = i + index * 10,
          root = "acct/a" + account + "/p" + person,
          id = "q" + person;
        const f = Array.from({ length: kind === "live" ? 2 : width }, (_, j) =>
          fact(root, ":field/f" + j, id + "-" + j),
        );
        const input = command(id, f, [], kind === "live");
        input.writeClass = kind;
        jobs.push(record(c, db, input, start, performance.now() - start, account, person));
      }
      const rows = await Promise.all(jobs),
        receipt = physical(rows, head);
      head += rows.length;
      if (priority) assert(rows.slice(0, 8).every((r) => r.size === 1));
      samples.push({ width, receipt, rows });
    }
    const whole = command(
      "too-wide",
      Array.from({ length: 97 }, (_, j) => fact("acct/b/p", ":field/f" + j, "large")),
      [],
      false,
    );
    if (priority) {
      await assert.rejects(
        async () => {
          for await (const a of c.transactBulkFrames(db, "import", [whole])) void a;
        },
        (e: unknown) => e instanceof DatomicHttpError && e.code === "BulkFrameTooLarge",
      );
      assert.equal((await c.operation(db, "too-wide")).status, "absent");
    }
    const h = await c.begin(db);
    assert.equal(h.position, head);
    await c.release(db, h.handle);
    return { nonce, db, priority, samples };
  } finally {
    c.close();
  }
}
export async function fieldPhase(
  c: DatomicClient,
  db: string,
  head: number,
  nonce: string,
  label: string,
  schedule: Offer[],
  pooled: boolean,
  senders: Map<string, number>,
) {
  const pending: Promise<void>[] = [],
    rows: Observed[] = [],
    failures: { id: string; reason: string }[] = [],
    last = new Map<string, Input["rows"][number]>(),
    waiting = new Map<number, { input: Input; e: Offer }[]>(),
    inflight = new Map<number, number>();
  const expected = new Map<
    string,
    { root: string; tx: string; fresh: Input["rows"][number]; old?: string; changes: string[] }
  >();
  const attr = ":field/answer-" + label;
  let offered = 0,
    settled = 0,
    peakBacklog = 0;
  const start = performance.now();
  function pump(account: number) {
    const list = waiting.get(account)!;
    while ((inflight.get(account) ?? 0) < 12 && list.length) {
      const { input, e } = list.shift()!,
        lane = sha([nonce, account, e.person]).slice(0, 32),
        seq = (senders.get(lane) ?? 0) + 1;
      senders.set(lane, seq);
      input.clientId = lane;
      input.sendSequence = seq;
      inflight.set(account, (inflight.get(account) ?? 0) + 1);
      const p = record(c, db, input, start, e.ms, account, e.person)
        .then(
          (r) => {
            rows.push(r);
          },
          (err) => {
            failures.push({
              id: input.operationId,
              reason: err instanceof DatomicHttpError ? err.code : String(err),
            });
          },
        )
        .finally(() => {
          settled++;
          inflight.set(account, inflight.get(account)! - 1);
          pump(account);
        });
      pending.push(p);
    }
  }
  for (let i = 0; i < schedule.length; i++) {
    const e = schedule[i]!,
      root = pooled
        ? ids.placement(roster[e.account]!.first + e.person)
        : "acct/a" + e.account + "/p" + e.person;
    let remaining = start + e.ms - performance.now();
    while (remaining > 0) {
      await wait(Math.ceil(remaining));
      remaining = start + e.ms - performance.now();
    }
    const id = label + "-" + e.account + "-" + e.person + "-" + e.ordinal,
      prior = last.get(root);
    const f = [fact(root, attr, e.subtask + "/" + e.ordinal)];
    if (e.extra) f.push(fact(root, ":field/note", id));
    const input = command(id, f, prior ? [prior] : []);
    expected.set(id, {
      root,
      tx: input.claims[0]!.txId,
      fresh: input.rows[0]!,
      old: prior?.id,
      changes: [
        ...input.rows
          .filter((r) => r.entity_type !== "_Transaction" && r.retracted_at === null)
          .map((r) => "assert/" + r.id),
        ...(prior ? ["retract/" + prior.id] : []),
      ],
    });
    last.set(root, input.rows[0]!);
    input.writeClass = "live";
    if (pooled) input.groupAccount = roster[e.account]!.key;
    const queue = waiting.get(e.account) ?? [];
    queue.push({ input, e });
    waiting.set(e.account, queue);
    offered++;
    pump(e.account);
    peakBacklog = Math.max(peakBacklog, offered - settled);
  }
  let consumed = 0;
  while (consumed < pending.length) {
    const end = pending.length;
    await Promise.all(pending.slice(consumed, end));
    consumed = end;
  }
  assert.equal(settled, offered);
  assert.equal(rows.length + failures.length, schedule.length);
  const wall = performance.now() - start;
  const byAccount = Object.fromEntries(
    [...new Set(schedule.map((e) => e.account))].map((a) => {
      const rs = rows.filter((r) => r.account === a);
      return [
        a,
        {
          acked: rs.length,
          p50Ms: rs.length
            ? quantile(
                rs.map((r) => r.end - r.due),
                0.5,
              )
            : null,
          p99Ms: rs.length
            ? quantile(
                rs.map((r) => r.end - r.due),
                0.99,
              )
            : null,
        },
      ];
    }),
  );
  const result = {
    label,
    offered,
    failures,
    headBefore: head,
    wall,
    peakBacklog,
    scheduleSha256: sha(schedule),
    rows,
    byAccount,
    perSecond: (1000 * rows.length) / wall,
    p99Ms: rows.length
      ? quantile(
          rows.map((r) => r.end - r.due),
          0.99,
        )
      : null,
  };
  // [DX-W1] Why: preserve the offered work and actual replies on an ambiguous or failed arm.
  // Rejected: timing only the surviving acknowledgements as a successful run.
  if (failures.length) return { ...result, counts: null, readback: null };
  const counts = physical(rows, head);
  const h = await c.begin(db);
  assert.equal(h.position, head + rows.length);
  await c.release(db, h.handle);
  for (const r of [rows.at(0), rows.at(-1)])
    if (r) assert.equal((await c.operation(db, r.id)).t?.v, r.t);
  {
    const ordered = [...rows].sort((a, b) => a.p - b.p),
      byId = new Map(ordered.map((r) => [r.id, r]));
    const retired = new Map<string, Observed>();
    for (const r of ordered) {
      const old = expected.get(r.id)!.old;
      if (old) retired.set(old, r);
    }
    // [DX-W1] Why: check every receipt's journal and the old/new lifetime of the exact field. A smaller physical count alone cannot prove lossless coalescing.
    // Rejected: verifying only the final field value or assuming a shared native t is a public position.
    let after = head;
    while (after < head + rows.length) {
      const page = await c.request<{ transactions: [string, number, string[]][] }>(
        "POST",
        `/v2/db/${db}/transactions`,
        { after, limit: 100 },
      );
      assert(page.transactions.length > 0);
      for (const [tx, p, wire] of page.transactions) {
        const observed = ordered[p - head - 1]!,
          intent = expected.get(observed.id)!;
        assert.equal(p, ++after);
        assert.equal(tx, intent.tx);
        const journal = wire.map(decodeRowText),
          fields = (a: string) => journal.filter((r) => r.attribute === ":_tx/" + a);
        assert.deepEqual(
          fields("command-id").map((r) => r.value_string),
          [observed.id],
        );
        assert.deepEqual(
          fields("instant").map((r) => r.value_datetime),
          [observed.clock],
        );
        assert.deepEqual(
          fields("changed-entity").map((r) => r.value_string),
          [intent.root],
        );
        assert.deepEqual(
          fields("change")
            .map((r) => {
              const x = JSON.parse(r.value_json!);
              return x.op + "/" + x.tripleId;
            })
            .sort(),
          [...intent.changes].sort(),
        );
      }
    }
    const roots = [...last.keys()],
      read = new Map<string, Input["rows"][number]>();
    for (let i = 0; i < roots.length; i += 40) {
      const returned = await c.rows(db, {
        history: true,
        entityIds: roots.slice(i, i + 40),
        pattern: { attribute: attr },
        basis: { recordedPosition: head + rows.length },
      });
      for (const r of returned) {
        assert(!read.has(r.id));
        read.set(r.id, r);
      }
    }
    assert.equal(read.size, expected.size);
    for (const [id, intent] of expected) {
      const r = read.get(intent.fresh.id)!,
        ack = byId.get(id)!,
        next = retired.get(r.id);
      assert.equal(r.entity_id, intent.root);
      assert.equal(r.value_string, intent.fresh.value_string);
      assert.equal(r.tx_id, intent.tx);
      assert.equal(r.recorded_position, ack.p);
      assert.equal(r.recorded_at, ack.clock);
      assert.equal(r.retracted_position, next?.p ?? null);
      assert.equal(r.retracted_at, next?.clock ?? null);
      if (next) {
        assert(next.p > ack.p);
        assert.equal(r.retract_tx_id, expected.get(next.id)!.tx);
      }
    }
  }
  return { ...result, counts, readback: { journalEntries: rows.length, fields: expected.size } };
}
export async function fieldTrial(url: string, nonce: string, only: boolean) {
  const c = new DatomicClient(url, 35000);
  try {
    const { created, db } = await c.create(scopeKey(nonce), "lean", true, 35000);
    assert(created);
    const phases = [],
      senders = new Map<string, number>();
    let head = 0;
    for (const rate of rates) {
      const p = await fieldPhase(
        c,
        db,
        head,
        nonce,
        "r" + rate * 10,
        offers(rate, 12, [0]),
        false,
        senders,
      );
      phases.push(p);
      head += p.rows.length;
      assert.deepEqual(p.failures, []);
      assert(p.counts);
      if (only) assert.equal(p.counts.logical - p.counts.native, p.counts.sameSubjectShared);
      else assert.equal(p.counts.logical, p.counts.native);
    }
    return { nonce, db, only, phases };
  } finally {
    c.close();
  }
}
