// EXP-P2Q host log plus broker: unit tests that need no QLever. A null replica (every SELECT empty, marker 0)
// makes every read route through the broker's overlay or log, which is exactly the path that must be exact
// before the replica catches up. Logs live under <repo>/runs/broker/EXP-P2Q/test (gitignored), never /tmp.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { CommandAlreadyCommittedError, EntityId, Triples, string } from "@triplex-build/triplex";
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
import { HostBroker } from "../src/broker/broker.js";
import type { QleverBrokerStorageAdapterService } from "../src/broker/BrokerStorageAdapter.js";
import { crc32c } from "../src/broker/crc32c.js";
import { FeedConsumerStore, LogFeed, readConsumerEffects } from "../src/broker/feed.js";
import { FrameKind, encodeFrame, encodeSegmentHeader, scanSegment, segmentSeed } from "../src/broker/frame.js";
import { decodeCommitGroup, encodeCommitGroup } from "../src/broker/frames.js";
import { BrokerLogError, HostLog } from "../src/broker/log.js";
import { ORDINALS, lsnOf, ordinalOf } from "../src/broker/position.js";
import { buildPublication } from "../src/broker/sparql.js";
import { decodeRow, encodeRow, rowFields } from "../src/rdf.js";

const ROOT = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-P2Q/test");
const dirs: string[] = [];
const freshDir = () => {
  const dir = path.join(ROOT, randomUUID());
  dirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const nullReplica: QleverClient = {
  query: async () => [],
  update: async () => ({}),
  command: async () => ({}),
  cancel: async () => {},
  close: async () => {},
};

const openRuntime = async (dir: string, scope = `p2q-test:${randomUUID()}`) => {
  const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 256 * 1024 ** 2 });
  const adapter = makeQleverStorageAdapter(nullReplica, scope, { broker }) as QleverBrokerStorageAdapterService;
  const layer = Runtime.define({
    name: "p2q-test",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, makeQleverQueryExecutor(nullReplica, scope, { sourceView: adapter.sourceView })),
  }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () {
    return yield* Triples;
  }));
  return {
    scope,
    broker,
    adapter,
    triples,
    run: <A, E>(effect: Effect.Effect<A, E>) => managed.runPromise(effect),
    dispose: () => managed.dispose(),
  };
};
const assertOps = (subject: string, facts: number, tag: string) =>
  Array.from({ length: facts }, (_v, i) => ({
    op: "assert" as const,
    entityId: EntityId.make(subject),
    attribute: `:p2q/f${i}`,
    value: string(`${tag}-${i}`),
  }));
const at = (position: number) => ({ validAt: Date.now() + 1, recordedPosition: position });

describe("CRC32C and frames (R13 2.4)", () => {
  it("matches the CRC32C check value and chains", () => {
    expect(crc32c(Buffer.from("123456789"))).toBe(0xe3069283);
    const whole = crc32c(Buffer.from("abcdef"));
    expect(crc32c(Buffer.from("def"), crc32c(Buffer.from("abc")))).toBe(whole);
  });
  it("classifies every truncation as clean end or torn tail and a bit flip inside as corruption", () => {
    const header = encodeSegmentHeader({ epoch: 1, firstLsn: 1 });
    let prev = segmentSeed(header);
    const parts = [header];
    for (let lsn = 1; lsn <= 4; lsn++) {
      const { bytes, crc } = encodeFrame({ lsn, epoch: 1, kind: FrameKind.COMMIT_GROUP, payload: Buffer.alloc(40 + lsn * 13, lsn), prevCrc: prev });
      parts.push(bytes);
      prev = crc;
    }
    const full = Buffer.concat(parts);
    expect(scanSegment(full)).toMatchObject({ status: "clean-end", nextLsn: 5 });
    for (let cut = 32; cut < full.length; cut++) {
      const scan = scanSegment(full.subarray(0, cut));
      expect(["clean-end", "torn-tail"]).toContain(scan.status);
    }
    const flipped = Buffer.from(full);
    flipped[32 + 32 + 5]! ^= 1; // inside frame 1's payload, frames 2 to 4 follow
    expect(scanSegment(flipped).status).toBe("corruption");
  });
  it("accepts an EPOCH_BEGIN that burns exactly one LSN and nothing else that skips", () => {
    const header = encodeSegmentHeader({ epoch: 1, firstLsn: 1 });
    const a = encodeFrame({ lsn: 1, epoch: 1, kind: FrameKind.COMMIT_GROUP, payload: Buffer.from("a"), prevCrc: segmentSeed(header) });
    const skip = encodeFrame({ lsn: 3, epoch: 2, kind: FrameKind.EPOCH_BEGIN, payload: Buffer.from("{}"), prevCrc: a.crc });
    expect(scanSegment(Buffer.concat([header, a.bytes, skip.bytes]))).toMatchObject({ status: "clean-end", nextLsn: 4 });
    const bad = encodeFrame({ lsn: 3, epoch: 1, kind: FrameKind.COMMIT_GROUP, payload: Buffer.from("b"), prevCrc: a.crc });
    expect(scanSegment(Buffer.concat([header, a.bytes, bad.bytes])).status).toBe("torn-tail");
  });
  it("round-trips commit groups and re-encodes read-back rows to identical quads", () => {
    const row = {
      id: "r1", entity_id: "e1", attribute: ":a", value_type: "number", value_string: null, value_number: 1.0000000000000002,
      value_boolean: null, value_datetime: null, value_json: null, recorded_at: 1_790_000_000_123, recorded_position: 4096,
      valid_from: 1, valid_to: null, created_by: null, retracted_at: null, retracted_position: null, retract_tx_id: null,
      entity_type: "t", schema_version: 1, tx_id: "_tx/1",
    } as TripleRow;
    const member = { operationId: "op", attemptId: "at", positions: [4096], claims: [{ commandId: "c", txId: "_tx/1", timestamp: 5 }], rows: [row], priors: [], subjects: ["e1"] };
    const decoded = decodeCommitGroup(encodeCommitGroup({ v: 1, stream: "s", lsn: 4, epoch: 1, members: [member] }));
    expect(decoded.members[0]!.rows[0]).toEqual(row);
    // R17 2.1 item 6: delete terms come from the broker's encoder, so decode(encode(row)) must re-encode equally.
    expect(rowFields(decodeRow(encodeRow(row)))).toEqual(rowFields(row));
    const retracted = { ...row, retracted_at: 9, retracted_position: 5120, retract_tx_id: "_tx/2" };
    const update = buildPublication("s", { position: 0, epoch: 1 }, { position: 6143, epoch: 1 }, [
      { ...member, positions: [5120], rows: [retracted], priors: [row], claims: [] },
    ]);
    // A retraction deletes only the old _row literal and inserts the retraction fields.
    expect(update.deletes).toBe(1);
  });
});

describe("host log recovery (R13 6.5)", () => {
  it("backs up and truncates a torn tail, burns its LSN and refuses mid-log corruption", async () => {
    const dir = freshDir();
    const first = await HostLog.open(dir, { minFreeBytes: 0 });
    for (let i = 0; i < 3; i++) await first.log.append(FrameKind.COMMIT_GROUP, Buffer.from(`frame-${i}`));
    const lastLsn = first.log.nextLsn - 1;
    await first.log.abandon();
    const file = path.join(dir, "segment-000001.log");
    fs.appendFileSync(file, Buffer.from([0x54, 0x58, 0x4c, 0x46, 9, 9])); // half a frame header: torn tail
    const second = await HostLog.open(dir, { minFreeBytes: 0 });
    expect(second.recovery).toMatchObject({ status: "torn-tail", tornBytes: 6, abortedLsns: [lastLsn + 1] });
    expect(fs.existsSync(second.recovery.brokenFile!)).toBe(true);
    const begin = second.frames[second.frames.length - 1]!;
    expect(begin).toMatchObject({ kind: FrameKind.EPOCH_BEGIN, lsn: lastLsn + 2 });
    await second.log.close();
    const bytes = fs.readFileSync(file);
    bytes[40]! ^= 0xff; // inside the first frame: later valid frames make it corruption
    fs.writeFileSync(file, bytes);
    await expect(HostLog.open(dir, { minFreeBytes: 0 })).rejects.toBeInstanceOf(BrokerLogError);
  });
});

describe("broker commit path through Triplex (null replica: overlay and log routes)", () => {
  it("ACKs at the durable frame and serves read-your-own-write from the overlay", async () => {
    const rt = await openRuntime(freshDir());
    try {
      const result = await rt.run(rt.triples.transact(assertOps("subj:1", 10, "v1"), { commandId: "cmd-1" }));
      expect(result.position).toBeGreaterThan(0);
      expect(lsnOf(result.position)).toBeGreaterThan(1);
      const rows = await rt.run(rt.adapter.getByEntity("subj:1", at(result.position)));
      expect(rows.map((row) => row.value_string).sort()).toEqual(Array.from({ length: 10 }, (_v, i) => `v1-${i}`).sort());
      expect(rt.adapter.routes.overlay).toBeGreaterThan(0);
      // The same pull from the broker's own record on disk gives the same rows.
      const fromLog = rt.broker.fromLog(0, { entities: ["subj:1"] }, () => true).filter((row) => row.entity_id === "subj:1");
      expect(fromLog.map((row) => row.id).sort()).toEqual(rows.map((row) => row.id).sort());
      // Duplicate command: the original transaction id, from the broker's claim table.
      const duplicate = await rt.run(Effect.flip(rt.triples.transact(assertOps("subj:1", 10, "v2"), { commandId: "cmd-1" })));
      expect(duplicate).toBeInstanceOf(CommandAlreadyCommittedError);
      expect((duplicate as CommandAlreadyCommittedError).transactionId).toBe(result.txId);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("commits distinct subjects in parallel without conflicts and one hot subject serially", async () => {
    const rt = await openRuntime(freshDir());
    try {
      const distinct = await rt.run(
        Effect.all(
          Array.from({ length: 32 }, (_v, i) => rt.triples.transact(assertOps(`subj:d${i}`, 5, "x"))),
          { concurrency: "unbounded" },
        ),
      );
      expect(rt.broker.stats().conflicts).toBe(0);
      // Group commit: 32 concurrent commands shared few frames.
      expect(new Set(distinct.map((r) => lsnOf(r.position))).size).toBeLessThan(32);
      const hot = await rt.run(
        Effect.all(
          Array.from({ length: 8 }, (_v, i) => rt.triples.transact(assertOps("subj:hot", 5, `h${i}`))),
          { concurrency: "unbounded" },
        ),
      );
      const positions = hot.map((r) => r.position);
      expect(new Set(positions).size).toBe(8);
      const live = await rt.run(rt.adapter.getByEntity("subj:hot", at(Math.max(...positions))));
      expect(live).toHaveLength(40);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("retracts exactly at the basis and answers older bases unchanged", async () => {
    const rt = await openRuntime(freshDir());
    try {
      const first = await rt.run(rt.triples.transact(assertOps("subj:r", 3, "a")));
      const second = await rt.run(
        rt.triples.transact([{ op: "retract", id: first.triples[0]!.id }, ...assertOps("subj:r", 1, "b")]),
      );
      expect((await rt.run(rt.adapter.getByEntity("subj:r", at(first.position)))).length).toBe(3);
      const after = await rt.run(rt.adapter.getByEntity("subj:r", at(second.position)));
      expect(after.map((row) => row.value_string).sort()).toEqual(["a-1", "a-2", "b-0"]);
      expect((await rt.run(rt.adapter.history("subj:r"))).length).toBe(4);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("RULINGS Q31c falsifiers on the broker's non-dense positions", () => {
  it("nested cuts in one frame: every ordinal is an exact prefix", async () => {
    const rt = await openRuntime(freshDir());
    try {
      const results = await rt.run(
        Effect.all(
          Array.from({ length: 12 }, (_v, i) => rt.triples.transact(assertOps("subj:nest", 1, `n${i}`))),
          { concurrency: "unbounded" },
        ),
      );
      // Distinct subjects would share a frame; one subject is serial, so use a frame we know is shared:
      const shared = await rt.run(
        Effect.all(
          Array.from({ length: 6 }, (_v, i) => rt.triples.transact(assertOps(`subj:cut${i}`, 1, "c"))),
          { concurrency: "unbounded" },
        ),
      );
      const byFrame = new Map<number, number[]>();
      for (const r of shared) byFrame.set(lsnOf(r.position), [...(byFrame.get(lsnOf(r.position)) ?? []), r.position]);
      const [lsn, positions] = [...byFrame].sort((a, b) => b[1].length - a[1].length)[0]!;
      expect(positions.length).toBeGreaterThan(1);
      positions.sort((a, b) => a - b);
      for (const [k, cut] of positions.entries()) {
        const visible = shared.filter((r) => r.position <= cut).map((r) => r.triples[0]!.entityId);
        for (const r of shared) {
          const rows = await rt.run(rt.adapter.getByEntity(r.triples[0]!.entityId, at(cut)));
          expect(rows.length).toBe(visible.includes(r.triples[0]!.entityId) ? 1 : 0);
        }
        expect(ordinalOf(cut)).toBeGreaterThanOrEqual(k);
        expect(lsnOf(cut)).toBe(lsn);
      }
      expect(new Set(results.map((r) => r.position)).size).toBe(12);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("an abort gap, a crash between append and resolution, and resume at the gap", async () => {
    const dir = freshDir();
    const scope = `p2q-test:${randomUUID()}`;
    let rt = await openRuntime(dir, scope);
    const before = await rt.run(rt.triples.transact(assertOps("subj:g", 2, "pre"), { commandId: "g-1" }));
    // Crash between append and resolution: the frame is durable, the client never sees the ACK.
    const orphan = await rt.run(rt.triples.transact(assertOps("subj:g", 2, "orphan"), { commandId: "g-2" }));
    await rt.dispose();
    await rt.broker.abandon();
    // A torn in-flight frame after it, as a crash mid-write leaves.
    fs.appendFileSync(path.join(dir, "segment-000001.log"), Buffer.from([0x54, 0x58, 0x4c, 0x46, 1, 2, 3]));
    const consumerDir = path.join(dir, "consumer");
    const feed = new LogFeed(dir);
    // A consumer that checkpointed right after the orphan frame resumes across the gap.
    const store = new FeedConsumerStore(consumerDir, "c1", "split", true);
    let cursor = feed.start();
    for (;;) {
      const page = feed.poll(cursor);
      if (page.resolutions.length === 0) break;
      store.recordEffects(page.resolutions.flatMap((r) => r.kind === "commit" ? r.transacts.flatMap((t) => t.subjects.map((s) => ({ position: t.position, subject: s }))) : []), page.cursor);
      store.writeCheckpoint(page.cursor);
      cursor = page.cursor;
    }
    rt = await openRuntime(dir, scope);
    try {
      const aborted = rt.broker.abortedLsns();
      expect(aborted).toHaveLength(1);
      // The retried command resolves to the original receipt (lost-ACK resolution from the broker's record).
      const retry = await rt.run(Effect.flip(rt.triples.transact(assertOps("subj:g", 2, "orphan"), { commandId: "g-2" })));
      expect((retry as CommandAlreadyCommittedError).transactionId).toBe(orphan.txId);
      const after = await rt.run(rt.triples.transact(assertOps("subj:g", 1, "post"), { commandId: "g-3" }));
      expect(lsnOf(after.position)).toBeGreaterThan(aborted[0]!);
      // Reads at bases on both sides of the gap are exact.
      expect((await rt.run(rt.adapter.getByEntity("subj:g", at(before.position)))).length).toBe(2);
      expect((await rt.run(rt.adapter.getByEntity("subj:g", at(orphan.position)))).length).toBe(4);
      expect((await rt.run(rt.adapter.getByEntity("subj:g", at(aborted[0]! * ORDINALS + 5)))).length).toBe(4);
      expect((await rt.run(rt.adapter.getByEntity("subj:g", at(after.position)))).length).toBe(5);
      // Resume from the checkpoint at the gap: the aborted LSN is listed, then exactly the later commit.
      const resumed = feed.poll(store.checkpoint()!);
      const kinds = resumed.resolutions.map((r) => r.kind);
      expect(kinds).toEqual(["aborted", "epoch", "commit"]);
      expect(resumed.resolutions[0]).toMatchObject({ kind: "aborted", lsn: aborted[0] });
      const commit = resumed.resolutions[2]!;
      expect(commit.kind === "commit" && commit.transacts[0]!.position).toBe(after.position);
      store.recordEffects([{ position: after.position, subject: "subj:g" }], resumed.cursor);
      store.writeCheckpoint(resumed.cursor);
      store.close();
      const effects = readConsumerEffects(consumerDir, "c1");
      expect([...effects.values()].every((n) => n === 1)).toBe(true);
      expect(effects.size).toBe(3);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("feed consumer store (TARGETS 1.1 P3 items 4 to 6)", () => {
  it("drops a torn record without losing the next one, and keys suppress replays", () => {
    const dir = freshDir();
    const cursor = (n: number) => ({ lsn: n, offset: n, seed: 0, nextLsn: n + 1 });
    const a = new FeedConsumerStore(dir, "c", "atomic", true);
    a.recordEffects([{ position: 1, subject: "s" }], cursor(1));
    a.recordEffects([{ position: 2, subject: "s" }], cursor(2), { tear: true });
    a.close();
    const b = new FeedConsumerStore(dir, "c", "atomic", true);
    expect(b.checkpoint()).toEqual(cursor(1));
    b.recordEffects([{ position: 1, subject: "s" }, { position: 2, subject: "s" }], cursor(2));
    b.close();
    const c = new FeedConsumerStore(dir, "c", "atomic", true);
    expect(c.checkpoint()).toEqual(cursor(2));
    expect(b.replayAttempts).toBe(1);
    expect([...readConsumerEffects(dir, "c").entries()]).toEqual([["1|s", 1], ["2|s", 1]]);
    c.close();
  });
});

describe("feed from the host log (R17 3, TARGETS 1.1 P3)", () => {
  it("delivers every commit in position order, per subject, with entity, attribute and valid range", async () => {
    const dir = freshDir();
    const rt = await openRuntime(dir);
    try {
      const committed = await rt.run(
        Effect.all(
          Array.from({ length: 40 }, (_v, i) => rt.triples.transact(assertOps(`subj:${i % 7}`, 3, `f${i}`))),
          { concurrency: 8 },
        ),
      );
      const feed = new LogFeed(dir);
      let cursor = feed.start();
      const seen: number[] = [];
      for (;;) {
        const page = feed.poll(cursor, { maxBytes: 4096 });
        if (page.resolutions.length === 0) break;
        for (const r of page.resolutions)
          if (r.kind === "commit")
            for (const t of r.transacts) {
              seen.push(t.position);
              expect(t.changes.every((c) => c.attribute.startsWith(":p2q/") && c.validTo === null)).toBe(true);
            }
        cursor = page.cursor;
      }
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
      expect(new Set(seen)).toEqual(new Set(committed.map((r) => r.position)));
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});
