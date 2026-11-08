// EXP-P2Q fix round (V-P2Q findings C1, C2, C3, M1, M2, M3, m1; RULINGS Q62a). Offline: a controllable replica
// that keeps only the broker marker (and the A0 `position` triple) and applies the broker's guarded updates to
// it, so waits, regressions, outages and typed failures can be scheduled exactly. Row content is not modelled
// here (the verifier's ModelReplica does that); answers are checked against the broker's own log.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { TypeExpr } from "@triplex-build/triplex/config";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../src/QleverClient.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { HostBroker, type HostBrokerOptions } from "../src/broker/broker.js";
import type { QleverBrokerStorageAdapterService } from "../src/broker/BrokerStorageAdapter.js";
import { BasisNotAvailable, ReplicaUnavailable } from "../src/broker/errors.js";
import { BrokerLogError, HostLog, readWatermark } from "../src/broker/log.js";
import { FrameKind } from "../src/broker/frame.js";
import { lastPositionOf, lsnOf } from "../src/broker/position.js";
import { makeQleverNativeQueries } from "../src/native/NativeQueries.js";

const ROOT = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-P2Q/fixes");
const dirs: string[] = [];
const freshDir = () => {
  const dir = path.join(ROOT, randomUUID());
  dirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Keeps the broker marker; applies guarded updates and fences; answers marker, position and pull queries. */
class MarkerReplica implements QleverClient {
  position = 0;
  epoch = 0;
  down = false;
  rejectUpdates = false;
  readonly queries: string[] = [];
  private literal(block: string, field: string) {
    const m = new RegExp(`<urn:triplex:field:${field}> "(\\d+)"`).exec(block);
    return m ? Number(m[1]) : undefined;
  }
  async query(sparql: string) {
    if (this.down) throw new Error("connect ECONNREFUSED 127.0.0.1:7070 (marker replica down)");
    this.queries.push(sparql);
    if (sparql.startsWith("SELECT ?brokerPosition ?brokerEpoch"))
      return [{ brokerPosition: { type: "literal", value: String(this.position) }, brokerEpoch: { type: "literal", value: String(this.epoch) } }];
    if (sparql.startsWith("SELECT ?position WHERE")) return [{ position: { type: "literal", value: String(this.position) } }];
    if (sparql.startsWith("SELECT ?row ?brokerPosition"))
      return [{ brokerPosition: { type: "literal", value: String(this.position) } }];
    if (sparql.startsWith("SELECT ?s WHERE")) return [];
    // Datalog and aggregates: no rows (content is not modelled); the test only checks eligibility and types.
    return [];
  }
  async update(sparql: string) {
    if (this.down) throw new Error("connect ECONNREFUSED 127.0.0.1:7070 (marker replica down)");
    if (this.rejectUpdates) throw new Error("socket hang up (marker replica refuses updates)");
    const guard = /COALESCE\(\?brokerPosition, "0"\) = "(\d+)" && COALESCE\(\?brokerEpoch, "0"\) = "(\d+)"/.exec(sparql);
    const insert = sparql.slice(sparql.indexOf(" INSERT {"), sparql.indexOf(" WHERE {"));
    if (!guard || Number(guard[1]) !== this.position || Number(guard[2]) !== this.epoch)
      return { operations: [{ "delta-triples": { operation: { inserted: 0, deleted: 0 }, after: { total: 0 } } }] };
    this.position = this.literal(insert, "broker_position") ?? this.position;
    this.epoch = this.literal(insert, "broker_epoch") ?? this.epoch;
    return { operations: [{ "delta-triples": { operation: { inserted: 4, deleted: 4 }, after: { total: 4 } } }] };
  }
  async command() {
    return {};
  }
  async cancel() {}
  async close() {}
}

const openRt = async (dir: string, scope: string, replica: QleverClient | undefined, extra: Partial<HostBrokerOptions> = {}, basisWaitMs = 250) => {
  const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 256 * 1024 ** 2, ...(replica ? { replica } : {}), idleProbeMs: 50, ...extra });
  const client = replica ?? new MarkerReplica();
  const adapter = makeQleverStorageAdapter(client, scope, { broker, brokerOptions: { basisWaitMs } }) as QleverBrokerStorageAdapterService;
  const executor = makeQleverQueryExecutor(client, scope, { sourceView: adapter.sourceView, resolveBasis: adapter.resolveQueryBasis });
  const managed = ManagedRuntime.make(
    Runtime.define({ name: "p2q-fixes", storage: Layer.succeed(StorageAdapter, adapter), queries: Layer.succeed(QueryExecutor, executor) })
      .layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
  );
  const triples = await managed.runPromise(Effect.gen(function* () {
    return yield* Triples;
  }));
  return {
    broker, adapter, executor, triples,
    run: <A, E>(e: Effect.Effect<A, E>) => managed.runPromise(e),
    exit: <A, E>(e: Effect.Effect<A, E>) =>
      managed.runPromise(Effect.match(e, { onFailure: (error) => ({ ok: false as const, error: error as any }), onSuccess: (value) => ({ ok: true as const, value }) })),
    dispose: () => managed.dispose(),
  };
};
const ops = (subject: string, facts: number, tag: string) =>
  Array.from({ length: facts }, (_v, i) => ({ op: "assert" as const, entityId: EntityId.make(subject), attribute: `:x/f${i}`, value: string(`${tag}-${i}`) }));
const at = (position: number) => ({ validAt: Date.now() + 10 ** 9, recordedPosition: position });
const q = (subject: string) => ({ find: ["?v"], where: [[EntityId.make(subject), ":x/f0", "?v"]] }) as any;
const ids = (rows: readonly TripleRow[]) => rows.map((row) => row.id).sort();

describe("C1 Datalog inside a transaction", () => {
  it("waits for the replica's real marker to reach sourceK, then fails typed; no query reaches a stale replica", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica, { autoApply: false });
    try {
      await rt.run(rt.triples.transact(ops("s:c1", 1, "a")));
      replica.queries.length = 0;
      const t0 = performance.now();
      const exit = await rt.exit(rt.adapter.withTransaction(rt.executor.execute(q("s:c1"))));
      const ms = performance.now() - t0;
      expect(exit.ok).toBe(false);
      expect(exit.error).toBeInstanceOf(BasisNotAvailable);
      expect(exit.error.reason).toBe("basis-not-available");
      expect(exit.error.required).toBe(rt.broker.head());
      expect(ms).toBeGreaterThanOrEqual(240);
      // Only marker probes were sent; no Datalog SPARQL reached a replica below sourceK.
      expect(replica.queries.every((s) => s.startsWith("SELECT ?brokerPosition ?brokerEpoch"))).toBe(true);
      // Once the replica reaches sourceK, the same in-transaction query runs.
      rt.broker.startApplier();
      expect(await rt.broker.drain(5_000)).toBe(true);
      const ok = await rt.exit(rt.adapter.withTransaction(rt.executor.execute(q("s:c1"))));
      expect(ok.ok).toBe(true);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("an executor read puts the transaction's CAS read set scope-wide", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica);
    try {
      await rt.run(rt.triples.transact(ops("s:seed", 1, "seed")));
      expect(await rt.broker.drain(5_000)).toBe(true);
      // A transaction that ran Datalog, then a commit on another subject lands, then it writes: conflict.
      const scoped = await rt.exit(
        rt.adapter.withTransaction(
          Effect.gen(function* () {
            yield* rt.executor.execute(q("s:seed"));
            yield* Effect.promise(() => rt.run(rt.triples.transact(ops("s:other", 1, "o"))));
            return yield* rt.triples.transact(ops("s:mine", 1, "m"));
          }),
        ),
      );
      expect(scoped.ok).toBe(false);
      expect(scoped.error.reason).toBe("serialization-conflict");
      // Control: the same schedule without the Datalog read commits (per-subject CAS, distinct subjects).
      const control = await rt.exit(
        rt.adapter.withTransaction(
          Effect.gen(function* () {
            yield* Effect.promise(() => rt.run(rt.triples.transact(ops("s:other", 1, "o2"))));
            return yield* rt.triples.transact(ops("s:mine", 1, "m2"));
          }),
        ),
      );
      expect(control.ok).toBe(true);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("C2 the cached replica marker is never trusted for an answer", () => {
  it("after an unnoticed regression, Datalog and dependencyState wait on the real marker and refuse below B", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:c2", 2, "a")));
      expect(await rt.broker.drain(5_000)).toBe(true);
      const cached = rt.broker.replicaPosition();
      expect(cached).toBeGreaterThanOrEqual(a.position);
      // The replica restarts without its delta and refuses updates for now: the applier cannot catch up.
      replica.rejectUpdates = true;
      replica.position = 0;
      const basis = await rt.exit(Effect.promise(() => rt.adapter.resolveQueryBasis(a.position).then((b) => b, (error) => ({ error }))));
      expect((basis as any).value?.error).toBeInstanceOf(BasisNotAvailable);
      expect((basis as any).value.error.observed).toBe(0);
      const dep = await rt.exit(rt.adapter.dependencyState([":x/f0"], { validAt: Date.now(), recordedPosition: a.position }));
      expect(dep.ok).toBe(false);
      expect(dep.error).toBeInstanceOf(BasisNotAvailable);
      // Repository pulls stay exact: their own request shows marker 0, so the overlay or the log answers.
      const pull = await rt.run(rt.adapter.getByEntity("s:c2", at(a.position)));
      expect(pull).toHaveLength(2);
      // The idle applier noticed by itself: once updates are accepted again it fences and replays.
      replica.rejectUpdates = false;
      for (let i = 0; i < 100 && replica.position < a.position; i++) await sleep(20);
      expect(replica.position).toBeGreaterThanOrEqual(a.position);
      expect(replica.epoch).toBe(rt.broker.epoch);
      expect(rt.broker.stats().replicaRegressions).toBeGreaterThanOrEqual(1);
      expect(await rt.adapter.resolveQueryBasis(a.position)).toBe(a.position);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("a regression during the answer is refused by the after-check", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica, { autoApply: true });
    try {
      const a = await rt.run(rt.triples.transact(ops("s:c2b", 1, "a")));
      expect(await rt.broker.drain(5_000)).toBe(true);
      replica.rejectUpdates = true;
      const original = replica.query.bind(replica);
      let rewound = false;
      replica.query = async (sparql: string) => {
        const out = await original(sparql);
        // The replica restarts right after the Datalog answer was computed.
        if (!rewound && !sparql.startsWith("SELECT ?brokerPosition")) {
          rewound = true;
          replica.position = 0;
        }
        return out;
      };
      const exit = await rt.exit(rt.executor.execute(q("s:c2b"), { validAt: Date.now(), recordedPosition: a.position } as any));
      expect(exit.ok).toBe(false);
      expect(exit.error).toBeInstanceOf(BasisNotAvailable);
      expect(exit.error.message).toContain("went backwards");
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("C3 one writer per stream", () => {
  it("refuses a second open in the same process; takeover abandons the first, whose next append fails", async () => {
    const dir = freshDir();
    const scope = `fx:${randomUUID()}`;
    const a = await openRt(dir, scope, undefined);
    try {
      await a.run(a.triples.transact(ops("s:l", 1, "a1"), { commandId: "a1" }));
      await expect(HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 })).rejects.toThrow(/already open in this process/);
      const b = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0, takeover: true });
      const late = await a.exit(a.triples.transact(ops("s:l", 1, "a2"), { commandId: "a2" }));
      expect(late.ok).toBe(false);
      expect(late.error.reason).toBe("outcome-unknown");
      expect(b.claim("a1")).toBeDefined();
      await b.close();
      const c = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 });
      expect(c.stats().recovery).toBe("clean-end");
      expect(c.claim("a1")).toBeDefined();
      expect(c.claim("a2")).toBeUndefined();
      await c.close();
    } finally {
      await a.dispose();
      await a.broker.abandon();
    }
  });

  it("the kernel flock refuses another process while the holder lives and frees on SIGKILL", async () => {
    const dir = freshDir();
    const log = await HostLog.open(dir, { minFreeBytes: 0 });
    const contend = () =>
      new Promise<number>((resolve) => {
        const child = spawn("perl", ["-e", 'use Fcntl qw(:flock); open(F,">>",$ARGV[0]) or exit 2; flock(F,LOCK_EX|LOCK_NB) or exit 3; exit 0;', path.join(dir, "LOCK")]);
        child.on("exit", (code) => resolve(code ?? -1));
      });
    expect(await contend()).toBe(3);
    await log.log.close();
    expect(await contend()).toBe(0);
    // A holder process killed with SIGKILL releases the lock (the helper sees its stdin close).
    const holder = spawn(process.execPath, ["--input-type=module", "-e", `
      const { HostLog } = await import(${JSON.stringify(path.resolve(import.meta.dirname, "../dist/index.js"))});
      await HostLog.open(${JSON.stringify(dir)}, { minFreeBytes: 0 }); console.log("held"); setInterval(() => {}, 1000);`], { stdio: ["ignore", "pipe", "inherit"] });
    await new Promise<void>((resolve) => holder.stdout!.once("data", () => resolve()));
    expect(await contend()).toBe(3);
    holder.kill("SIGKILL");
    await new Promise((resolve) => holder.once("exit", resolve));
    let code = 3;
    for (let i = 0; i < 50 && code === 3; i++) {
      await sleep(20);
      code = await contend();
    }
    expect(code).toBe(0);
  }, 30_000);
});

describe("M1 header damage and a WATERMARK above the valid end", () => {
  const build = async () => {
    const dir = freshDir();
    const scope = `fx:${randomUUID()}`;
    const rt = await openRt(dir, scope, undefined);
    for (let i = 0; i < 3; i++) await rt.run(rt.triples.transact(ops(`s:${i}`, 3, `h${i}`), { commandId: `h${i}` }));
    await rt.dispose();
    await rt.broker.abandon();
    return { dir, scope, segment: path.join(dir, "segment-000001.log") };
  };
  it("every flipped header bit refuses to start instead of truncating ACKed frames", async () => {
    const { dir, scope, segment } = await build();
    const bytes = fs.readFileSync(segment);
    let refused = 0;
    for (const [i, bit] of [[8, 0], [12, 3], [16, 1], [24, 0], [30, 4], [31, 7]] as const) {
      const flipped = Buffer.from(bytes);
      flipped[i]! ^= 1 << bit;
      fs.writeFileSync(segment, flipped);
      await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 }).then(
        async (b) => b.close(),
        (error) => {
          expect(String(error)).toMatch(/bad-header|refusing to start/);
          refused++;
        },
      );
      expect(fs.readFileSync(segment).length).toBe(bytes.length); // nothing cut
    }
    expect(refused).toBe(6);
  });
  it("a damaged or cut last ACKed frame is refused when the WATERMARK names it", async () => {
    const { dir, scope, segment } = await build();
    const mark = readWatermark(dir)!;
    const bytes = fs.readFileSync(segment);
    const flipped = Buffer.from(bytes);
    flipped[bytes.length - 20]! ^= 1; // inside the last frame (the EPOCH_BEGIN is not last: the commit is)
    fs.writeFileSync(segment, flipped);
    await expect(HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 })).rejects.toThrow(/WATERMARK names LSN/);
    fs.writeFileSync(segment, bytes.subarray(0, bytes.length - 7)); // cut instead of flipped
    await expect(HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 })).rejects.toThrow(/WATERMARK names LSN/);
    expect(fs.readFileSync(segment).length).toBe(bytes.length - 7);
    expect(mark.lsn).toBeGreaterThan(1);
    fs.writeFileSync(segment, bytes);
    const ok = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 });
    expect(ok.claim("h2")).toBeDefined();
    await ok.close();
  });
});

describe("M2 a basis beyond the resolved prefix", () => {
  it("waits within the deadline and fails typed, or answers once a frame covers it", async () => {
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, undefined);
    try {
      const a = await rt.run(rt.triples.transact(ops("s:m2", 1, "a")));
      const future = lastPositionOf(lsnOf(rt.broker.head()) + 2) - 5;
      const refused = await rt.exit(rt.adapter.getByEntity("s:m2", at(future)));
      expect(refused.ok).toBe(false);
      expect(refused.error).toBeInstanceOf(BasisNotAvailable);
      expect(refused.error.surface).toBe("repository");
      const pending = rt.exit(rt.adapter.getByEntity("s:m2", at(future)));
      for (let i = 0; i < 3; i++) await rt.run(rt.triples.transact(ops("s:m2", 1, `b${i}`)));
      const answered = await pending;
      expect(answered.ok).toBe(true);
      const wanted = rt.broker.fromLog(0, { entities: ["s:m2"] }, (row) => row.recorded_position <= future);
      expect(ids(answered.value)).toEqual(ids(wanted));
      expect(a.position).toBeLessThan(future);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("M3 an unreachable replica", () => {
  it("pulls and retraction-target reads fall back to the log exactly; Datalog and dependencyState fail ReplicaUnavailable", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica, { autoApply: false });
    try {
      const a = await rt.run(rt.triples.transact(ops("s:m3", 3, "a")));
      const up = await rt.run(rt.adapter.getByEntity("s:m3", at(a.position)));
      replica.down = true;
      const down = await rt.run(rt.adapter.getByEntity("s:m3", at(a.position)));
      expect(ids(down)).toEqual(ids(up));
      // A retracting commit continues during the outage (Q31e).
      const r = await rt.run(rt.triples.transact([{ op: "retract", id: a.triples[0]!.id }]));
      const after = await rt.run(rt.adapter.getByEntity("s:m3", at(r.position)));
      expect(after).toHaveLength(2);
      const datalog = await rt.exit(rt.executor.execute(q("s:m3")));
      expect(datalog.error).toBeInstanceOf(ReplicaUnavailable);
      const dep = await rt.exit(rt.adapter.dependencyState([":x/f0"], { validAt: Date.now(), recordedPosition: a.position }));
      expect(dep.error).toBeInstanceOf(ReplicaUnavailable);
    } finally {
      replica.down = false;
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("native SPARQL in broker mode: a token above the replica waits then BasisNotAvailable; down is ReplicaUnavailable", async () => {
    const replica = new MarkerReplica();
    replica.position = 3071;
    const scope = DatabaseScope.test(`fx-native-${randomUUID()}`);
    const native = makeQleverNativeQueries(replica, scope, { awaitBasisMs: 200 });
    const contract = { name: "fx-native", parameters: TypeExpr.any, row: TypeExpr.any };
    const run = (options: any) =>
      Effect.runPromise(Effect.match(native.select(contract, {}, () => "SELECT ?s WHERE { ?s ?p ?o }", options), { onFailure: (e) => e, onSuccess: () => "ok" }));
    const t0 = performance.now();
    const above = await run({ basis: { recordedPosition: 5000 } });
    expect(above).toBeInstanceOf(BasisNotAvailable);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(190);
    replica.down = true;
    expect(await run({})).toBeInstanceOf(ReplicaUnavailable);
  });
});

describe("M3 outage answers against an independent replay of the log", () => {
  // Independent oracle: decode the segment, keep the latest version per row id among frames at or below lsn(B).
  const oracle = (segment: string, b: number, subject: string) => {
    const buf = fs.readFileSync(segment);
    const latest = new Map<string, TripleRow>();
    const COLS = ["id", "entity_id", "attribute", "value_type", "value_string", "value_number", "value_boolean", "value_datetime", "value_json", "recorded_at", "recorded_position", "valid_from", "valid_to", "created_by", "retracted_at", "retracted_position", "retract_tx_id", "entity_type", "schema_version", "tx_id"];
    for (let off = 32; off + 32 <= buf.length; ) {
      const len = buf.readUInt32LE(off + 4);
      const lsn = Number(buf.readBigUInt64LE(off + 8));
      if (buf.readUInt16LE(off + 24) === 1 && lsn <= lsnOf(b))
        for (const m of JSON.parse(buf.subarray(off + 32, off + 32 + len).toString()).m)
          for (const cells of m.r) {
            const row = Object.fromEntries(COLS.map((c, i) => [c, cells[i] ?? null])) as unknown as TripleRow;
            latest.set(row.id, row);
          }
      off += 32 + len + 4;
    }
    return [...latest.values()]
      .filter((r) => r.entity_id === subject && r.recorded_position <= b && !(r.retracted_position !== null && r.retracted_position <= b))
      .map((r) => r.id)
      .sort();
  };
  it("300 random reads during outages equal the oracle (commits and retractions continue)", async () => {
    const replica = new MarkerReplica();
    const rt = await openRt(freshDir(), `fx:${randomUUID()}`, replica, { autoApply: false });
    let seed = 7;
    const r = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const subjects = ["s:o0", "s:o1", "s:o2", "s:o3"];
    const positions: number[] = [];
    const live: string[] = [];
    let mismatches = 0;
    let reads = 0;
    try {
      for (let step = 0; step < 220; step++) {
        replica.down = r() < 0.5;
        if (r() < 0.45) {
          const s = subjects[Math.floor(r() * subjects.length)]!;
          const retract = live.length && r() < 0.4 ? live.splice(Math.floor(r() * live.length), 1)[0] : undefined;
          const res = await rt.run(rt.triples.transact([...(retract ? [{ op: "retract" as const, id: retract }] : []), ...ops(s, 1 + Math.floor(r() * 2), `o${step}`)]));
          positions.push(res.position);
          for (const t of res.triples) live.push(t.id);
        } else if (positions.length) {
          const b = positions[Math.floor(r() * positions.length)]!;
          const s = subjects[Math.floor(r() * subjects.length)]!;
          replica.down = true;
          const got = ids(await rt.run(rt.adapter.getByEntity(s, at(b))));
          reads++;
          if (JSON.stringify(got) !== JSON.stringify(oracle(rt.broker.segmentPath, b, s))) mismatches++;
        }
      }
      expect(reads).toBeGreaterThan(80);
      expect(mismatches).toBe(0);
    } finally {
      replica.down = false;
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("m1 an exception after the fsync", () => {
  it("fails the broker and answers outcome-unknown, with no unhandled rejection; a resend after reopen resolves", async () => {
    const dir = freshDir();
    const scope = `fx:${randomUUID()}`;
    const rt = await openRt(dir, scope, undefined);
    await rt.run(rt.triples.transact(ops("s:w", 1, "ok"), { commandId: "w0" }));
    (rt.broker as any).log.publishWatermark = () => {
      throw new Error("simulated failure after fsync");
    };
    const escaped: unknown[] = [];
    const listener = (reason: unknown) => escaped.push(reason);
    process.on("unhandledRejection", listener);
    const result = await Promise.race([rt.exit(rt.triples.transact(ops("s:w", 1, "x"), { commandId: "w1" })), sleep(3_000).then(() => "hang")]);
    await sleep(50);
    process.off("unhandledRejection", listener);
    expect(result).not.toBe("hang");
    expect((result as any).error.reason).toBe("outcome-unknown");
    expect(escaped).toEqual([]);
    const next = await rt.exit(rt.triples.transact(ops("s:w", 1, "y")));
    expect(next.ok).toBe(false);
    await rt.dispose();
    await rt.broker.abandon();
    const reopened = await openRt(dir, scope, undefined);
    try {
      const resend = await reopened.exit(reopened.triples.transact(ops("s:w", 1, "x"), { commandId: "w1" }));
      expect(resend.error?._tag).toBe("CommandAlreadyCommittedError");
    } finally {
      await reopened.dispose();
      await reopened.broker.close();
    }
  });
});

describe("A0 M2 guard (pure guard behind A0's own path)", () => {
  it("answers bases it has published without an extra request and refuses a basis above it", async () => {
    const calls: string[] = [];
    let published = 2;
    const client: QleverClient = {
      query: async (sparql: string) => {
        calls.push(sparql.startsWith("SELECT ?position") ? "position" : "rows");
        return sparql.startsWith("SELECT ?position") ? [{ position: { type: "literal", value: String(published) } }] : [];
      },
      update: async () => ({}),
      command: async () => ({}),
      cancel: async () => {},
      close: async () => {},
    };
    const adapter = makeQleverStorageAdapter(client, `a0-guard-${randomUUID()}`);
    await Effect.runPromise(adapter.currentCommitPosition());
    calls.length = 0;
    await Effect.runPromise(adapter.getByEntity("e", at(2)));
    expect(calls).toEqual(["rows"]);
    calls.length = 0;
    const refused = await Effect.runPromise(Effect.flip(adapter.getByEntity("e", at(5))));
    expect(refused).toBeInstanceOf(BasisNotAvailable);
    expect(calls).toEqual(["position"]);
    published = 5;
    calls.length = 0;
    await Effect.runPromise(adapter.getByEntity("e", at(5)));
    expect(calls).toEqual(["position", "rows"]);
  });
});

void FrameKind;
void BrokerLogError;
