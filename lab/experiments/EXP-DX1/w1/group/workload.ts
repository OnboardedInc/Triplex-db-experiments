import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import {
  DatomicClient,
  DatomicTransportError,
  DatomicHttpError,
  Replica,
  type SweepRow,
} from "../../../../../packages/datomic/dist/index.js";
import { EntityId } from "../../../../../packages/core/dist/index.js";
import { assertionValue, createPackedRow } from "../../../../../packages/datomic/dist/rows.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { inlineSource } from "../../../../../packages/datomic/dist/replica/inlineSource.js";
import { deepPopulation } from "../../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";

import { accounts, pooledDigest, tenantRows } from "./population.ts";
import { readWriteOptions } from "../write-options.ts";

const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const account = (n: number) => "acct/a" + n + "/";
const rootFor = (n: number, i: number) => account(n) + ids.placement(i);
const fact = (e: string, a: string, v: string): Fact => ({ e, a, v: { type: "string", value: v } });
const token = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 26).toUpperCase();
const txFor = (id: string) => "_tx/" + token("transaction/" + id);
const clock = 1_800_000_000_000;
type Input = Parameters<DatomicClient["transact"]>[1];
type Response = {
  operationId: string;
  position: { v: string };
  t: { v: string };
  recordedAt: { v: number };
  requestBytes?: number;
  preparedOps?: number;
  nativeComputeMs?: number;
  groupStages?: Record<string, number> | null;
  submitToNativeEntryMs: number;
  readyToNativeEntryMs: number;
  groupQueueMicros?: number;
  groupSize?: number;
  timeline: {
    payloadPrepared: number;
    predecessorReady?: number;
    submitted?: number;
    completed: number;
  };
};
type Item = {
  id: string;
  probe: boolean;
  account: number;
  started: number;
  elapsed: number;
  scheduled: number;
  pos: number;
  t: string;
  size: number;
  queue: number;
  gatewayQueue: number;
  submitToNativeEntry: number;
  readyToNativeEntry: number;
  nativeWait: number | null;
};
const quantile = (xs: number[], q: number) =>
  [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * q) - 1]!;
const dist = (xs: number[]) => ({
  p50: quantile(xs, 0.5),
  p95: quantile(xs, 0.95),
  p99: quantile(xs, 0.99),
  max: Math.max(...xs),
});
export function command(id: string, facts: Fact[], old: Input["rows"] = [], publish = true): Input {
  const tx = txFor(id),
    subjects = [...new Set([...facts.map((f) => f.e), ...old.map((r) => r.entity_id)])];
  const rows = facts.map((f, i) =>
    createPackedRow(
      {
        entityId: EntityId.make(f.e),
        attribute: f.a,
        value: f.v.type === "ref" ? { type: "ref", value: EntityId.make(f.v.value) } : f.v,
        validFrom: publish ? 0 : SEED_VALID_FROM,
      },
      tx,
      clock,
      token(id + "/f" + i),
      1,
    ),
  );
  const journal = (
    suffix: string,
    a: string,
    value: Parameters<typeof createPackedRow>[0]["value"],
  ) =>
    createPackedRow(
      {
        entityId: EntityId.make(tx),
        entityType: "_Transaction",
        attribute: ":_tx/" + a,
        value,
        validFrom: 0,
      },
      tx,
      clock,
      token(id + "/j" + suffix),
      1,
    );
  if (publish) {
    const assertion = (r: Input["rows"][number]) => ({
      entityId: r.entity_id,
      attribute: r.attribute,
      tripleId: r.id,
      value: assertionValue(r),
      recordedAt: r.recorded_at,
      validFrom: r.valid_from,
      ...(r.valid_to === null ? {} : { validTo: r.valid_to }),
      ...(r.tx_id === null ? {} : { assertionTxId: r.tx_id }),
      ...(r.entity_type === null ? {} : { entityType: r.entity_type }),
    });
    const changes = [
      ...rows.map((r) => ({ op: "assert", ...assertion(r) })),
      ...old.map((r) => ({
        op: "retract",
        ...assertion(r),
        retractedAt: clock,
        retractionTxId: tx,
      })),
    ];
    rows.push(
      journal("p", "position", { type: "number", value: 1 }),
      journal("t", "instant", { type: "datetime", value: clock }),
      journal("c", "command-id", { type: "string", value: id }),
      ...subjects.map((s, i) =>
        journal("e" + i, "changed-entity", { type: "ref", value: EntityId.make(s) }),
      ),
      ...changes.map((v, i) => journal("v" + i, "change", { type: "json", value: v })),
    );
  }
  return {
    operationId: id,
    attemptId: id + "/try",
    position: 1,
    sourceK: null,
    span: 1,
    scopeWide: false,
    assignRecordTime: true,
    entities: subjects,
    claims: publish ? [{ commandId: id, txId: tx, timestamp: clock }] : [],
    newIds: rows.map((r) => r.id),
    rows: [
      ...rows,
      ...old.map((r) => ({ ...r, retracted_at: clock, retracted_position: 1, retract_tx_id: tx })),
    ],
  };
}
function scope(nonce: string, name: string) {
  return JSON.stringify(["triplex-scope-v1", "test", "test", nonce + "-" + name, 0]);
}
async function write(c: DatomicClient, db: string, incoming: Input) {
  const ack = (await c.transact(db, incoming)) as Response;
  assert.equal(ack.operationId, incoming.operationId);
  assert(Number(ack.position.v) > 0 && Number(ack.recordedAt.v) >= clock && Number(ack.t.v) > 0);
  return ack;
}
export async function recovery(
  url: string,
  witness: { scope: string; db: string; id: string; t: string; p: number; clock: number },
) {
  const fresh = new DatomicClient(url);
  try {
    const reopened = await fresh.create(witness.scope, "lean", true, 35_000);
    assert(!reopened.created && reopened.db === witness.db);
    const saved = await fresh.operation(witness.db, witness.id);
    assert.deepEqual(
      [saved.status, saved.operationId, saved.t?.v, Number(saved.position?.v), saved.recordedAt?.v],
      ["committed", witness.id, witness.t, witness.p, witness.clock],
    );
    assert.equal(await fresh.claim(witness.db, witness.id, witness.p), txFor(witness.id));
    return saved;
  } finally {
    fresh.close();
  }
}
export async function exact(url: string, nonce: string, grouped: boolean) {
  const c = new DatomicClient(url),
    key = scope(nonce, "proof"),
    root = rootFor(0, 0);
  try {
    const { created, db } = await c.create(key, "lean", true, 35_000);
    assert(created);
    const ins = Array.from({ length: 16 }, (_, i) =>
      command("cmd" + i, [fact(root, ":proof/value", "value" + i)]),
    );
    ins.push(command("retire", [], [ins[2]!.rows[0]!]));
    const clientId = randomUUID();
    const stale = command("stale", [fact(root, ":proof/value", "forbidden")]);
    stale.sourceK = 0;
    const scheduled = [...ins.slice(0, 6), stale, ...ins.slice(6)];
    scheduled.forEach((s, i) => Object.assign(s, { clientId, sendSequence: i + 1 }));
    let rejection: string | undefined;
    const execute = async (s: Input) => {
      try {
        return await write(c, db, s);
      } catch (e) {
        if (s !== stale || !(e instanceof DatomicHttpError)) throw e;
        rejection = e.code;
        return null;
      }
    };
    const outcomes = [
      await execute(scheduled[0]!),
      ...(await Promise.all(scheduled.slice(1).map(execute))),
    ];
    assert.equal(rejection, "CasConflict");
    assert.equal(outcomes[6], null);
    assert.equal((await c.operation(db, "stale")).status, "absent");
    const receipts = outcomes.filter((r): r is Response => r !== null);
    assert.deepEqual(
      receipts.map((r) => Number(r.position.v)),
      ins.map((_, i) => i + 1),
    );
    assert.equal(new Set(receipts.map((r) => r.t.v)).size < receipts.length, grouped);
    const replica = new Replica(
      inlineSource(
        c,
        db,
        async () => {
          const h = await c.begin(db);
          await c.release(db, h.handle);
          return h.position;
        },
        1,
      ),
      1,
      "touched",
    );
    await replica.bootstrap([], 1);
    assert(await replica.admit(root, 1, 1));
    const project = (rows: SweepRow[]) =>
      rows
        .map((r) => [r.id, r.entityId, r.attribute, r.value.value, r.position])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const views = [];
    for (const [i, r] of receipts.entries()) {
      const p = i + 1,
        s = ins[i]!,
        prior = i ? receipts[i - 1]! : undefined;
      assert(!prior || prior.recordedAt.v < r.recordedAt.v);
      assert.equal(await c.claim(db, s.operationId, p), txFor(s.operationId));
      if (p > 1) assert.equal(await c.claim(db, s.operationId, p - 1), null);
      if (p > 1) await replica.followOnce(0, p);
      const observed = project(replica.world(root));
      const basis = { recordedPosition: p, validAt: 1 };
      const pinned = await c.rows(db, { basis, entityIds: [root], pattern: {} });
      const independentlyRead = pinned
        .map((x) => [x.id, x.entity_id, x.attribute, x.value_string, x.recorded_position])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      assert.deepEqual(observed, independentlyRead);
      views.push(observed);
    }
    const i = receipts.findIndex((r) => (r.groupSize ?? 1) > 1),
      at = i < 0 ? 1 : i;
    const w = {
      scope: key,
      db,
      id: ins[at]!.operationId,
      t: receipts[at]!.t.v,
      p: at + 1,
      clock: receipts[at]!.recordedAt.v,
    };
    assert(await recovery(url, w));
    const original = {
      commandId: w.id,
      txId: txFor(w.id),
      operationId: w.id,
      position: w.p,
      t: w.t,
      recordedAt: w.clock,
    };
    const { clientId: _client, sendSequence: _sequence, ...retry } = ins[at]!;
    assert.deepEqual(await c.transactCommand(db, retry), original);
    const different = command("second-attempt", [fact(root, ":proof/value", "must never appear")]);
    different.claims = [{ ...different.claims[0]!, commandId: w.id }];
    let duplicateError: string | undefined;
    try {
      await write(c, db, different);
    } catch (e) {
      if (!(e instanceof DatomicHttpError)) throw e;
      duplicateError = e.code;
    }
    assert.equal(duplicateError, "CommandConflict");
    assert.deepEqual(await c.transactCommand(db, different), original);
    const dropped = command("lost-reply", [fact(root, ":proof/value", "durable")]);
    const request = c.request.bind(c);
    let discarded: unknown;
    c.request = async function <T>(...args: Parameters<DatomicClient["request"]>) {
      const reply = await request<T>(...args);
      if (args[1].endsWith("/transact")) {
        discarded = reply;
        throw new DatomicTransportError("Test dropped a durable reply");
      }
      return reply;
    };
    let resolved;
    try {
      resolved = await c.transactCommand(db, dropped);
    } finally {
      c.request = request;
    }
    const saved = discarded as Response;
    assert(
      saved &&
        resolved.commandId === "lost-reply" &&
        resolved.operationId === saved.operationId &&
        resolved.txId === txFor("lost-reply") &&
        resolved.position === 18 &&
        resolved.position === Number(saved.position.v) &&
        resolved.t === saved.t.v &&
        resolved.recordedAt === saved.recordedAt.v,
    );
    const journals = [];
    const operationReceipts = [];
    for (const [index, input] of [...ins, dropped].entries()) {
      const position = index + 1;
      const { transactions } = await c.request<{ transactions: [string, number, string[]][] }>(
        "POST",
        `/v2/db/${db}/transactions`,
        { after: index, limit: 1 },
      );
      assert.equal(transactions.length, 1);
      const [txId, p, texts] = transactions[0]!;
      const rows = texts.map(decodeRowText);
      const fields = (attr: string) => rows.filter((r) => r.attribute === ":_tx/" + attr);
      const first = (attr: string) => fields(attr).at(0)!;
      journals.push({
        txId,
        position: p,
        instant: first("instant").value_datetime,
        commandId: first("command-id").value_string,
        changedEntities: fields("changed-entity")
          .map((r) => r.value_string)
          .sort(),
        changes: fields("change").map((r) => JSON.parse(r.value_json!)),
      });
      const stored = await c.operation(db, input.operationId);
      const claim = await c.request("POST", `/v1/db/${db}/claim`, {
        commandId: input.operationId,
        position,
        receipt: true,
      });
      const ack = receipts[index] ?? saved;
      assert.deepEqual(stored, {
        status: "committed",
        operationId: input.operationId,
        position: ack.position,
        t: ack.t,
        recordedAt: ack.recordedAt,
      });
      assert.deepEqual(claim, {
        commandId: input.operationId,
        txId: txFor(input.operationId),
        receipt: stored,
      });
      operationReceipts.push(stored);
    }
    return {
      rejection,
      duplicateError,
      lostView: await (async () => {
        await replica.followOnce(0, 18);
        return project(replica.world(root));
      })(),
      idempotency: { original, resolved },
      scope: key,
      db,
      root,
      receipts: receipts.map((r, i) => ({
        id: ins[i]!.operationId,
        txId: txFor(ins[i]!.operationId),
        t: r.t.v,
        position: Number(r.position.v),
        instant: r.recordedAt.v,
      })),
      views,
      journals,
      operationReceipts,
      witness: w,
    };
  } finally {
    c.close();
  }
}
export async function seedPooled(client: DatomicClient, db: string) {
  const expected = deepPopulation(10000).facts + 20000 + Math.ceil(10000 / 256) + 1,
    seeds = [];
  const digest = createHash("sha256");
  let head = 0;

  for (let a = 0; a < 10; a++) {
    let count = 0,
      batch: Fact[] = [],
      packed = 0;
    const flush = async () => {
      if (!batch.length) return;
      const ack = await write(client, db, command("seed-" + a + "-" + packed++, batch, [], false));
      assert.equal(Number(ack.position.v), ++head);
      count += batch.length;
      batch = [];
    };
    for (let i = 0; i < 10000; i++) {
      const rows = tenantRows(accounts[a]!, i);
      digest.update(JSON.stringify(rows) + "\n");
      if (batch.length + rows.length > 2000) await flush();
      batch.push(...rows);
    }
    await flush();
    assert.equal(count, expected);
    const samples = [];
    for (const i of [0, 4999, 9999]) {
      const basis = { recordedPosition: head, validAt: SEED_VALID_FROM },
        root = ids.placement(accounts[a]!.first + i);
      const rows = await client.rows(db, { entityIds: [root], basis, pattern: {} });
      const actual = rows.map((r) => [r.attribute, r.value_string]).sort();
      const expectedRoot = tenantRows(accounts[a]!, i)
        .filter((f) => f.e === root)
        .map((f) => [f.a, f.v.value])
        .sort();
      assert.deepEqual(actual, expectedRoot);
      samples.push(hash(actual));
    }
    seeds.push({ account: a, subjects: 10000, facts: count, samples });
  }
  assert.equal(digest.digest("hex"), pooledDigest);
  return { head, seeds };
}
export async function runArm(
  url: string,
  nonce: string,
  grouped: boolean,
  server: boolean,
  options: { pulse?: boolean; smallPulse?: boolean; bootstrapUrl?: string } = {},
) {
  const client = new DatomicClient(url, 35_000),
    key = scope(nonce, "load"),
    bootstrap = options.bootstrapUrl ? new DatomicClient(options.bootstrapUrl, 35000) : client;
  try {
    const { created, db, strictRecordClocks } = await bootstrap.create(key, "lean", true, 35_000);
    assert(created && strictRecordClocks);
    const seed = server ? await seedPooled(bootstrap, db) : { head: 0, seeds: [] };
    const seeds = seed.seeds;
    let head = seed.head;
    if (bootstrap !== client) {
      const opened = await client.create(key, "lean", true, 35000);
      assert(!opened.created && opened.db === db);
    }
    const writerOptions = server
      ? await readWriteOptions(url, db, process.env.DX_W1_WRITER_EXPECTATION)
      : undefined;
    if (writerOptions) assert.equal(writerOptions.observed.position, head);
    const phases = [];
    for (const name of options.pulse
      ? ["alone", "nine"]
      : server
        ? ["alone", "one", "nine", "all"]
        : ["1", "4", "16", "64"]) {
      const startHead = head,
        depth = server ? 12 : Number(name),
        count = 128,
        records: Item[] = [];
      const t0 = performance.now();
      const send = async (a: number, i: number, target: number, probe = false) => {
        const id = name + "-" + (probe ? "q-" : "") + a + "-" + i,
          root = server ? ids.placement(accounts[a]!.first + (i % 10000)) : rootFor(a, i % 128),
          start = performance.now();
        const facts = Array.from({ length: options.smallPulse ? 1 + (i % 3) : 8 }, (_, j) =>
          fact(root, ":save/field" + j, id + "-" + j),
        );
        const input = command(id, facts);
        if (server) Object.assign(input, { groupAccount: accounts[a]!.key });
        const ack = await write(client, db, input),
          end = performance.now();
        const tl = ack.timeline;
        const gatewayQueue =
          (ack.groupQueueMicros ??
            (tl.predecessorReady ?? tl.payloadPrepared) - tl.payloadPrepared) / 1000;
        assert(
          Number.isFinite(ack.submitToNativeEntryMs) &&
            ack.submitToNativeEntryMs >= 0 &&
            Number.isFinite(ack.readyToNativeEntryMs),
        );
        records.push({
          ...(options.pulse
            ? {
                subject: root,
                businessFacts: facts.length,
                clock: ack.recordedAt.v,
                bytes: ack.requestBytes,
                ops: ack.preparedOps,
                nativeComputeMs: ack.nativeComputeMs,
                groupStages: ack.groupStages,
              }
            : {}),
          id,
          probe,
          account: a,
          pos: Number(ack.position.v),
          t: ack.t.v,
          size: ack.groupSize ?? 1,
          started: start - t0,
          elapsed: end - start,
          scheduled: end - target,
          queue: gatewayQueue + ack.submitToNativeEntryMs,
          gatewayQueue,
          submitToNativeEntry: ack.submitToNativeEntryMs,
          readyToNativeEntry: ack.readyToNativeEntryMs,
          nativeWait: tl.submitted === undefined ? null : (tl.completed - tl.submitted) / 1000,
        });
      };
      const duration = 60_000;
      const burst = async (a: number) => {
        let next = 0;
        await Promise.all(
          Array.from({ length: depth }, async () => {
            while (server ? performance.now() < t0 + duration : next < count)
              await send(a, next++, performance.now());
          }),
        );
      };
      // [DX-W1] Why: replay the same quiet arrivals in all three phases and count from scheduled offer through durable reply.
      // Rejected: closed-loop quiet sends that disappear when the shared database stalls.
      const quiet = async () => {
        for (let i = 0; i < duration / 100; i++) {
          const due = t0 + i * 100;
          await wait(Math.max(0, due - performance.now()));
          quietJobs.push(
            send(9, i, due, true).catch((e) => {
              quietErrors.push(e);
            }),
          );
        }
        await Promise.all(quietJobs);
        if (quietErrors.length) throw quietErrors[0];
      };
      const quietJobs: Promise<void>[] = [],
        quietErrors: unknown[] = [];
      if (server)
        await Promise.all([
          quiet(),
          ...Array.from(
            { length: name === "alone" ? 0 : name === "one" ? 1 : name === "nine" ? 9 : 10 },
            (_, a) => burst(a),
          ),
        ]);
      else await burst(0);
      const wall = performance.now() - t0;
      if (server) {
        assert.equal(records.filter((r) => r.probe).length, duration / 100);
        const active = [...new Set(records.filter((r) => !r.probe).map((r) => r.account))].sort(
          (a, b) => a - b,
        );
        assert.deepEqual(
          active,
          Array.from(
            { length: name === "alone" ? 0 : name === "one" ? 1 : name === "nine" ? 9 : 10 },
            (_, i) => i,
          ),
        );
      } else assert.equal(records.length, count);
      const sorted = [...records].sort((a, b) => a.pos - b.pos);
      sorted.forEach((r, i) => assert.equal(r.pos, startHead + i + 1));
      assert.equal(new Set(records.map((r) => r.id)).size, records.length);
      const physical = new Map<string, Item[]>();
      for (const r of sorted) {
        const members = physical.get(r.t) ?? [];
        members.push(r);
        physical.set(r.t, members);
      }
      for (const members of physical.values())
        assert(
          members.every(
            (r, i) =>
              r.size === members.length &&
              r.pos === members[0]!.pos + i &&
              (grouped || r.size === 1),
          ),
        );
      head += records.length;
      const byAccount = Object.fromEntries(
        [...new Set(records.map((r) => r.account))].map((a) => {
          const rs = records.filter((r) => r.account === a);
          return [
            a,
            {
              count: rs.length,
              commandsPerSecond: (rs.length * 1000) / wall,
              commitMs: dist(rs.map((r) => r.scheduled)),
              queueMs: dist(rs.map((r) => r.queue)),
              gatewayQueueMs: dist(rs.map((r) => r.gatewayQueue)),
              submitToNativeEntryMs: dist(rs.map((r) => r.submitToNativeEntry)),
              readyToNativeEntryMs: dist(rs.map((r) => r.readyToNativeEntry)),
            },
          ];
        }),
      );
      phases.push({
        name,
        count: records.length,
        throughput: (records.length * 1000) / wall,
        wall,
        physical: physical.size,
        quietMs: server ? dist(records.filter((r) => r.probe).map((r) => r.scheduled)) : null,
        byAccount,
        firstPosition: startHead + 1,
        lastPosition: head,
        records,
      });
    }
    const sample = phases.at(-1)!.records.at(-1)!;
    const check = await client.operation(db, sample.id);
    assert.equal(check.t?.v, sample.t);
    assert.equal(Number(check.position?.v), sample.pos);
    return { nonce, grouped, scope: key, db, seeds, phases, writerOptions };
  } finally {
    if (bootstrap !== client) bootstrap.close();
    client.close();
  }
}
