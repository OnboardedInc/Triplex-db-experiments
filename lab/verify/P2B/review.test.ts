// [CX-VP2B] Why: compare controlled concurrent observations with hand-derived cuts and exact original receipts. Rejected: adopting builder counters as an independent oracle.
import { it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples, string } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/broker/src/broker.js";
import { BrokerReadService } from "../../../packages/broker/src/reader-service.js";
import { makeBrokerStorageAdapter } from "../../../packages/broker/src/StorageAdapter.js";
import { MemoryBrokerReplica } from "../../../packages/broker/src/memory.js";
import { LogFeed } from "../../../packages/broker/src/feed.js";
import { snapshotRows } from "../../../packages/broker/src/snapshot.js";
const req = createRequire(import.meta.url);
const attempt = `review-${randomUUID()}`;
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4";
const out = path.join(root, attempt);
fs.mkdirSync(out, { recursive: true });
const observations: any[] = [];
const note = (name: string, data: unknown) => {
  observations.push({ name, data });
  fs.writeFileSync(
    path.join(out, "observations.json"),
    JSON.stringify(
      {
        attempt,
        node: process.version,
        baseHead: "ba10ebb9a119a89e9bdd532ccaa2439f268b1211",
        fixtureSha256: createHash("sha256")
          .update(fs.readFileSync(path.resolve("lab/verify/P2B/review.test.ts")))
          .digest("hex"),
        observations,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ attempt, name, data }));
};
const open = (name: string, extra = {}) =>
  HostBroker.open({
    dir: path.join(out, name),
    scopeKey: "offline-review",
    decisionStamp: true,
    autoApply: false,
    minFreeBytes: 5 * 1024 ** 3,
    ...extra,
  });
const row = (id: string, value = id) => ({
  id,
  entity_id: "subject",
  attribute: ":review",
  value_type: "string" as const,
  value_string: value,
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 1,
  recorded_position: -1,
  valid_from: 0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: id,
});
const tx = (id: string, rows: any[], sourceK = 0) => ({
  operationId: id,
  attemptId: id,
  sourceK,
  reads: { entities: new Set<string>(), scopeWide: false },
  claims: [],
  placeholders: [-1],
  rows,
  priors: new Map(),
  newIds: new Set(rows.filter((r) => r.recorded_position < 0).map((r) => r.id)),
});
const submit = async (b: HostBroker, id: string, rows: any[]) => {
  const r = await b.submit(tx(id, rows, b.head()));
  if (r.kind !== "committed") throw Error("Unexpected conflict");
  return r;
};
const position = (r: any) => [...r.positions.values()][0] as number;
const wait = (ms = 1) => new Promise((r) => setTimeout(r, ms));
const until = async (predicate: () => boolean) => {
  const end = Date.now() + 20000;
  while (!predicate()) {
    if (Date.now() > end) throw Error("Control gate timeout");
    await wait();
  }
};
const reader = async (b: HostBroker) => {
  const gate = new Int32Array(new SharedArrayBuffer(8));
  const worker = new Worker(path.resolve("lab/verify/P2B/source-worker.cjs"), {
    workerData: {
      file: b.segmentPath,
      watermark: b.readerWatermark.buffer,
      gate: gate.buffer,
      tsx: req.resolve("tsx/cjs"),
      source: path.resolve("packages/broker/src/reader-service.ts"),
    },
  });
  let serial = 0;
  const pending = new Map<number, any>();
  worker.on("message", (packet) => {
    const p = pending.get(packet.id);
    if (p) {
      pending.delete(packet.id);
      if (packet.error) p.reject(Error(packet.error));
      else p.resolve(packet.result ?? packet);
    }
  });
  await new Promise<void>((resolve, reject) => {
    worker.once("message", (p) => (p.ready ? resolve() : reject(Error("No ready"))));
    worker.once("error", reject);
  });
  const call = (op: string, rest = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = ++serial;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, op, ...rest });
    });
  return {
    gate,
    call,
    close: async () => {
      Atomics.store(gate, 1, 1);
      Atomics.notify(gate, 1);
      await call("close");
      await worker.terminate();
    },
  };
};

it("a pinned worker keeps exact rows across overlapping commit, checkpoint and purge; async pin FIFO protects them", async () => {
  const b = await open("cut-race");
  let r: any;
  try {
    const first = await submit(b, "first", [row("original")]),
      p = position(first);
    const original = (await b.pullAt(p, { entities: ["subject"] })).rows;
    const lease = await b.pinBasis(p, "CX-VP2B");
    r = await reader(b);
    const inFlight = r.call("pull", { basis: p, hold: true });
    await until(() => Atomics.load(r.gate, 0) === 1);
    const old = original[0]!;
    await b.submit({
      ...tx("retire", [{ ...old, retracted_position: -1, retracted_at: 2 }], p),
      priors: new Map([[old.id, old]]),
    });
    const latest = b.head();
    const purge = await b.purgeCurrent(latest);
    const checkpoint = await b.checkpoint();
    expect(purge.h).toBe(p);
    Atomics.store(r.gate, 1, 1);
    Atomics.notify(r.gate, 1);
    expect(snapshotRows((await inFlight).rows, p)).toEqual(original);
    expect(snapshotRows((await r.call("pull", { basis: p })).rows, p)).toEqual(original);
    expect((await r.call("pull", { basis: latest })).rows).toEqual([]);
    // Pin and purge are issued without awaiting either, in caller order.
    await lease.release();
    const pinPending = b.pinBasis(p, "FIFO"),
      purgePending = b.purgeCurrent(latest);
    const nextLease = await pinPending;
    expect((await purgePending).h).toBe(p);
    await nextLease.release();
    const retired = await b.purgeCurrent(latest);
    expect(retired.removed).toBe(1);
    expect((await r.call("pull", { basis: p })).eligible).toBe(false);
    const fallback = await b.fromLogAsync(0, { entities: ["subject"] }, () => true);
    expect(snapshotRows(fallback, p)).toEqual(original);
    note("pin-checkpoint-purge", { pin: p, latest, purge, retired, checkpoint });
  } finally {
    if (r) await r.close();
    await b.close();
  }
});

it("shared watermark remains at the prior prefix while publication is held; primary public reads reveal the new row", async () => {
  const replica = new MemoryBrokerReplica(),
    b = await open("held-publication", { replica });
  let release!: () => void, reached!: () => void;
  const hold = new Promise<void>((r) => (release = r)),
    at = new Promise<void>((r) => (reached = r));
  const log = (b as any).log,
    publish = log.publishWatermarkAsync.bind(log);
  const source = new BrokerReadService(b.segmentPath, b.readerWatermark.buffer);
  const adapter = makeBrokerStorageAdapter(replica, "offline-review", b, { basisWaitMs: 0 });
  let pending: any;
  try {
    const before = b.readerWatermark.read();
    log.publishWatermarkAsync = async (mark: any) => {
      reached();
      await hold;
      return publish(mark);
    };
    let acked = false;
    pending = submit(b, "unpublished", [row("unpublished")]).then((r) => {
      acked = true;
      return r;
    });
    await at;
    expect(source.head()).toBe(before.position);
    await expect(source.pullAt(b.head(), {})).rejects.toMatchObject({
      reason: "basis-not-reached",
    });
    expect((await source.pullAt(before.position, {})).rows).toEqual([]);
    expect(
      (
        await new LogFeed(path.dirname(b.segmentPath)).poll(
          new LogFeed(path.dirname(b.segmentPath)).start(),
        )
      ).resolutions.filter((r) => r.kind === "commit"),
    ).toEqual([]);
    const exposed = await Effect.runPromise(adapter.getByEntity("subject" as any));
    expect(acked).toBe(false);
    expect(exposed.map((r) => r.id)).toEqual(["unpublished"]);
    note("held-publication", {
      shared: before,
      primaryHead: b.head(),
      recordInstant: b.recordInstant(),
      exposed: exposed.map((r) => r.id),
      acked,
    });
    release();
    await pending;
    expect(source.head()).toBe(b.head());
  } finally {
    release();
    if (pending) await pending;
    source.close();
    await b.close();
  }
});

it("worker watermark does not regress during many commits and refuses the old buffer after reopen", async () => {
  const b = await open("watermark");
  let r: any;
  try {
    r = await reader(b);
    let prev = await r.call("head");
    for (let i = 0; i < 40; i++) {
      const write = submit(b, `wm-${i}`, [row(`wm-${i}`)]);
      for (let j = 0; j < 3; j++) {
        const current = await r.call("head");
        expect(current.lsn).toBeGreaterThanOrEqual(prev.lsn);
        expect(current.position).toBeGreaterThanOrEqual(prev.position);
        expect(current.stamp).toBeGreaterThanOrEqual(prev.stamp);
        prev = current;
      }
      const receipt = await write;
      expect((await r.call("head")).position).toBeGreaterThanOrEqual(position(receipt));
    }
    const last = await r.call("head");
    await b.close();
    await expect(r.call("head")).rejects.toThrow("closed");
    const reopened = await open("watermark");
    try {
      expect(reopened.head()).toBe(last.position);
      expect(reopened.readerWatermark.read().epoch).toBeGreaterThan(last.epoch);
    } finally {
      await reopened.close();
    }
    note("watermark-monotonic", { commits: 40, last });
  } finally {
    if (r) await r.close();
    await b.close();
  }
});

it("lost ACK replay and command duplicates retain the original receipt and ordered paged feed after restart", async () => {
  const b = await open("receipts");
  let next: HostBroker | undefined;
  try {
    const first = await b.submit({
      ...tx("lost", [row("first")]),
      claims: [{ commandId: "cmd", txId: "tx" }],
    });
    expect(first.kind).toBe("committed");
    const replay = await b.submit({ ...tx("lost", [row("ignored")]), attemptId: "retry" });
    expect(replay.kind).toBe("committed");
    expect((replay as any).positions).toEqual((first as any).positions);
    expect((replay as any).stamp).toEqual((first as any).stamp);
    const dup = await b.submit({
      ...tx("duplicate", [row("ignored-again")], b.head()),
      claims: [{ commandId: "cmd", txId: "changed" }],
    });
    expect(dup).toEqual({ kind: "conflict", reason: "claim" });
    expect(await b.claimAsync("cmd")).toMatchObject({ txId: "tx", position: position(first) });
    const second = await submit(b, "second", [row("second")]);
    const feed = new LogFeed(path.dirname(b.segmentPath));
    let cursor = feed.start();
    const delivered: any[] = [];
    for (let i = 0; i < 10; i++) {
      const p = await feed.poll(cursor, { maxBytes: 1 });
      if (!p.resolutions.length) break;
      delivered.push(...p.resolutions);
      cursor = p.cursor;
    }
    expect(
      delivered
        .filter((r) => r.kind === "commit")
        .flatMap((r) => r.transacts.map((t: any) => t.position)),
    ).toEqual([position(first), position(second)]);
    await b.close();
    next = await open("receipts");
    const after = await next.submit(tx("lost", [row("retry-after-reopen")]));
    expect((after as any).positions).toEqual((first as any).positions);
    expect((after as any).stamp).toEqual((first as any).stamp);
    const newFeed = new LogFeed(path.dirname(next.segmentPath));
    const resumed = await newFeed.poll(cursor);
    expect(resumed.resolutions.map((r) => r.kind)).toEqual(["epoch"]);
    note("receipt-feed-reopen", {
      positions: [position(first), position(second)],
      replayStamp: (after as any).stamp,
      resumed: resumed.resolutions,
      cursor,
    });
  } finally {
    await b.close();
    if (next) await next.close();
  }
});

it("a delayed source operation retains no SQLite snapshot while writes and checkpoints continue", async () => {
  const b = await open("wal");
  let r: any;
  try {
    const first = await submit(b, "seed", [row("seed")]);
    r = await reader(b);
    const held = r.call("pull", { basis: position(first), hold: true }).then(
      (value) => ({ value, error: undefined as any }),
      (error) => ({ value: undefined, error }),
    );
    await until(() => Atomics.load(r.gate, 0) === 1);
    const sizes: number[] = [];
    // At most 24 MiB input and roughly 100 MiB retained SQLite evidence in this bounded probe.
    for (let i = 0; i < 48; i++) {
      try {
        await submit(b, `bulk-${i}`, [row(`bulk-${i}`, "x".repeat(512 * 1024))]);
      } catch (error) {
        expect(error).toMatchObject({ reason: "wal-capacity-exceeded" });
        expect((await b.checkpoint()).events.at(-1)?.outcome).toBe("complete");
        await submit(b, `bulk-${i}`, [row(`bulk-${i}`, "x".repeat(512 * 1024))]);
      }
      if (i % 8 === 7) sizes.push(fs.statSync(b.segmentPath + "-wal").size);
    }
    const checkpoint = await b.checkpoint(),
      bytes = fs.statSync(b.segmentPath + "-wal").size;
    expect(bytes).toBeLessThanOrEqual(128 * 1024 ** 2);
    expect(checkpoint.events.at(-1)?.outcome).toBe("complete");
    Atomics.store(r.gate, 1, 1);
    Atomics.notify(r.gate, 1);
    expect(String((await held).error)).toContain("Source operation exceeded");
    expect((await r.call("pull", { basis: position(first) })).rows.map((r: any) => r.id)).toEqual([
      "seed",
    ]);
    const after = await b.checkpoint();
    note("wal-held-reader", {
      writesWhileHeld: 48,
      payloadBytes: 48 * 512 * 1024,
      sizes,
      bytes,
      checkpoint,
      after,
      head: b.head(),
    });
  } finally {
    if (r) await r.close();
    await b.close();
  }
});

// [CX-VP2B] Why: a duplicate must resolve a published original receipt even when writer completion delivery is delayed. Rejected: holding only the later publication RPC, after primary reads already advance.
it("a duplicate waits for publication before exposing its readable original receipt", async () => {
  const replica = new MemoryBrokerReplica(),
    b = await open("duplicate-before-callback", { replica });
  const adapter = makeBrokerStorageAdapter(replica, "offline-review", b, { basisWaitMs: 0 });
  const refused = () => Effect.die(new Error("No Datalog in offline storage fixture"));
  const managed = ManagedRuntime.make(
    Runtime.define({
      name: "review",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, {
        execute: refused,
        executePage: refused,
        explain: refused,
        explainPage: refused,
      }),
    }).layer({ scope: DatabaseScope.test("offline-review"), capabilities: Capabilities.none }),
  );
  let release!: () => void, reached!: () => void;
  const hold = new Promise<void>((r) => (release = r)),
    at = new Promise<void>((r) => (reached = r));
  const log = (b as any).log,
    append = log.append.bind(log);
  log.append = async (...args: any[]) => {
    const result = await append(...args);
    reached();
    await hold;
    return result;
  };
  let original: any;
  try {
    const triples = await managed.runPromise(Triples);
    original = managed.runPromise(
      triples.transact(
        [
          {
            op: "assert",
            entityId: "subject" as any,
            attribute: ":review/value" as any,
            value: string("first"),
          },
        ],
        { commandId: "same-command" },
      ),
    );
    await at;
    expect(b.head()).toBe(0);
    await expect(b.claimAsync("same-command", 20)).rejects.toMatchObject({
      reason: "duplicate-publication-timeout",
    });
    const timeoutAdapter = makeBrokerStorageAdapter(replica, "offline-review", b, {
      duplicateWaitMs: 20,
    });
    const timeoutManaged = ManagedRuntime.make(
      Runtime.define({
        name: "timeout-review",
        storage: Layer.succeed(StorageAdapter, timeoutAdapter),
        queries: Layer.succeed(QueryExecutor, {
          execute: refused,
          executePage: refused,
          explain: refused,
          explainPage: refused,
        }),
      }).layer({ scope: DatabaseScope.test("offline-review"), capabilities: Capabilities.none }),
    );
    try {
      const timeoutTriples = await timeoutManaged.runPromise(Triples);
      await expect(
        timeoutManaged.runPromise(
          timeoutTriples.transact(
            [
              {
                op: "assert",
                entityId: "subject" as any,
                attribute: ":review/value" as any,
                value: string("timeout-retry"),
              },
            ],
            { commandId: "same-command" },
          ),
        ),
      ).rejects.toMatchObject({ reason: "duplicate-publication-timeout" });
    } finally {
      await timeoutManaged.dispose();
    }
    let settled = false;
    const duplicate = managed
      .runPromise(
        triples.transact(
          [
            {
              op: "assert",
              entityId: "subject" as any,
              attribute: ":review/value" as any,
              value: string("retry"),
            },
          ],
          { commandId: "same-command" },
        ),
      )
      .then(
        () => {
          settled = true;
          throw Error("Duplicate executed");
        },
        (e) => {
          settled = true;
          return e;
        },
      );
    await wait(30);
    expect(settled).toBe(false);
    expect(b.head()).toBe(0);
    release();
    const completed = await original;
    const duplicateError = await duplicate;
    expect(duplicateError).toMatchObject({
      _tag: "CommandAlreadyCommittedError",
      transactionId: completed.txId,
    });
    const receipt = await managed.runPromise(triples.transaction(duplicateError.transactionId));
    expect(receipt?.txId).toBe(completed.txId);
    note("duplicate-publication-gated", {
      head: b.head(),
      shared: b.readerWatermark.read(),
      txId: completed.txId,
      receipt,
      settled,
    });
  } finally {
    release();
    if (original) await original;
    await managed.dispose();
    await b.close();
  }
});

// [EXP-P2B-R4] Why: even an external SQLite reader must not allow unlimited WAL growth or turn a known refusal into an unknown decision.
// Rejected: relying on cooperative worker lifetimes as the only storage bound.
it("WAL reservation refuses before the cap and recovers after a deliberately external held snapshot", async () => {
  const Database = createRequire(path.resolve("packages/broker/package.json"))("better-sqlite3");
  const cap = 16 * 1024 ** 2,
    b = await open("wal-admission", { maxWalBytes: cap });
  const seed = await submit(b, "seed", [row("seed")]);
  const external = new Database(b.segmentPath, { readonly: true });
  external.exec("BEGIN");
  external.prepare("SELECT * FROM marker").get();
  let admitted = 0,
    refused: any;
  try {
    for (let i = 0; i < 40; i++) {
      try {
        await submit(b, `bounded-${i}`, [row(`bounded-${i}`, "x".repeat(512 * 1024))]);
        admitted++;
      } catch (e) {
        refused = e;
        break;
      }
    }
    expect(admitted).toBeGreaterThan(0);
    expect(refused).toMatchObject({ reason: "wal-capacity-exceeded" });
    const head = b.head(),
      bytes = fs.statSync(b.segmentPath + "-wal").size;
    expect(bytes).toBeLessThanOrEqual(cap);
    const before = performance.now(),
      checkpoint = await b.checkpoint();
    expect(performance.now() - before).toBeLessThan(2000);
    expect(checkpoint.events.at(-1)?.outcome).toBe("incomplete");
    external.exec("ROLLBACK");
    expect((await b.checkpoint()).events.at(-1)?.outcome).toBe("complete");
    const retried = await submit(b, `bounded-${admitted}`, [row(`bounded-${admitted}`, "retry")]);
    expect(position(retried)).toBeGreaterThan(head);
    expect(
      snapshotRows(await b.fromLogAsync(0, { id: "seed" }, () => true), position(seed)).map(
        (r) => r.id,
      ),
    ).toEqual(["seed"]);
    note("wal-cap-enforced", { cap, bytes, admitted, head, retry: position(retried), checkpoint });
  } finally {
    if (external.inTransaction) external.exec("ROLLBACK");
    external.close();
    await b.close();
  }
});

it("a page-reservation body overflow is rolled back and a small retry remains possible", async () => {
  const cap = 1024 ** 2,
    b = await open("wal-body-refusal", { maxWalBytes: cap });
  try {
    const before = b.head();
    await expect(submit(b, "large", [row("large", "x".repeat(600 * 1024))])).rejects.toMatchObject({
      reason: "wal-capacity-exceeded",
    });
    expect(b.head()).toBe(before);
    expect(await b.fromLogAsync(0, { id: "large" }, () => true)).toEqual([]);
    expect(fs.statSync(b.segmentPath + "-wal").size).toBeLessThanOrEqual(cap);
    await submit(b, "small", [row("small")]);
  } finally {
    await b.close();
  }
});

// [EXP-P2B-R4] Why: a bounded source operation must refuse excess rows, never return a silently truncated exact pin.
// Rejected: checking only one-row fixtures (would miss LIMIT boundary errors).
it("source row limit refuses a large answer and leaves a fresh bounded read available", async () => {
  const b = await open("read-row-limit");
  let source: BrokerReadService | undefined;
  try {
    const r = await submit(
      b,
      "many",
      Array.from({ length: 4097 }, (_, i) => row(`r-${i}`)),
    );
    source = new BrokerReadService(b.segmentPath, b.readerWatermark.buffer);
    await expect(source.pullAt(position(r), { entities: ["subject"] })).rejects.toMatchObject({
      reason: "read-operation-limit",
    });
    expect((source as any).db.inTransaction).toBe(false);
    expect((await source.pullAt(position(r), { id: "r-0" })).rows.map((r) => r.id)).toEqual([
      "r-0",
    ]);
  } finally {
    source?.close();
    await b.close();
  }
});
