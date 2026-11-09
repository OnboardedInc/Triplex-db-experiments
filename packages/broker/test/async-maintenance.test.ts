// [EXP-P2B-R3] Why: pins and purge must yield while SQLite's writer waits on a separate lock holder.
// Rejected: an immediate-result assertion (would not expose Atomics.wait blocking the event loop).
import { expect, it } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { HostBroker } from "../src/broker.js";
import { LogFeed } from "../src/feed.js";
it("pin/unpin/purge and async feed preserve receipts and allow the lock release timer to run", async () => {
  const broker = await HostBroker.open({
    dir: path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
    scopeKey: "async-maintenance",
    requireFullFsync: false,
    autoApply: false,
    minFreeBytes: 5 * 1024 ** 3,
  });
  const lock = new Database(broker.segmentPath, { timeout: 0 });
  try {
    lock.exec("BEGIN IMMEDIATE");
    const commit = broker.submit({
      operationId: "blocked",
      attemptId: "a",
      sourceK: 0,
      reads: { entities: new Set(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: [],
      priors: new Map(),
      newIds: new Set(),
    });
    const pin = broker.pinBasis(0, "sweep");
    let timerRan = false;
    const timer = setTimeout(() => {
      timerRan = true;
      lock.exec("COMMIT");
    }, 50);
    const lease = await pin;
    const receipt = await commit;
    clearTimeout(timer);
    expect(timerRan).toBe(true);
    expect(receipt.kind).toBe("committed");
    expect((await broker.purgeCurrent(broker.head())).h).toBe(0);
    await lease.release();
    expect((await broker.purgeCurrent(broker.head())).h).toBe(broker.head());
    const feed = new LogFeed(broker.segmentPath.replace(/\/broker\.db$/, ""));
    const start = feed.start();
    const expected = feed.pollSync(start),
      actual = await feed.poll(start);
    expect(actual).toEqual(expected);
    expect((await feed.poll(actual.cursor)).resolutions).toEqual([]);
    expect((await feed.poll(start)).resolutions).toEqual(actual.resolutions);
  } finally {
    try {
      lock.exec("ROLLBACK");
    } catch {}
    lock.close();
    await broker.close();
  }
}, 10000);

// [EXP-P2B-R3] Why: compare replayed durable effect bytes, not just a cursor that happens to reopen.
// Rejected: treating an equal checkpoint as proof that the atomic consumer stored every affected subject.
it("async feed resumes after an atomic checkpoint and replay has one visible effect per position/subject", async () => {
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID());
  const broker = await HostBroker.open({
    dir,
    scopeKey: "async-feed",
    requireFullFsync: false,
    autoApply: false,
    minFreeBytes: 5 * 1024 ** 3,
  });
  const { FeedConsumerStore, readConsumerEffects } = await import("../src/feed.js");
  const write = async (id: string) => {
    const result = await broker.submit({
      operationId: id,
      attemptId: id,
      sourceK: broker.head(),
      reads: { entities: new Set<string>(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: [
        {
          id,
          entity_id: "subject",
          attribute: ":feed",
          value_type: "string",
          value_string: id,
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
        },
      ],
      priors: new Map(),
      newIds: new Set([id]),
    });
    if (result.kind !== "committed") throw Error("Missing commit");
    return [...result.positions.values()][0]!;
  };
  try {
    const a = await write("a"),
      feed = new LogFeed(dir),
      first = await feed.poll(feed.start()),
      consumerDir = path.join(dir, "consumer");
    const store = new FeedConsumerStore(consumerDir, "test", "atomic", true);
    expect(store.recordEffects([{ position: a, subject: "subject" }], first.cursor)).toBe(1);
    store.close();
    const b = await write("b"),
      reopened = new FeedConsumerStore(consumerDir, "test", "atomic", true);
    try {
      const resumed = await feed.poll(reopened.checkpoint()!);
      expect(
        resumed.resolutions
          .filter((r) => r.kind === "commit")
          .flatMap((r) => r.transacts.map((tx) => tx.position)),
      ).toEqual([b]);
      expect(resumed.resolutions).toEqual(feed.pollSync(first.cursor).resolutions);
      const effect = { position: b, subject: "subject" };
      expect(reopened.recordEffects([effect], resumed.cursor)).toBe(1);
      expect(reopened.recordEffects([effect], resumed.cursor)).toBe(0);
    } finally {
      reopened.close();
    }
    expect(readConsumerEffects(consumerDir, "test")).toEqual(
      new Map([
        [`${a}|subject`, 1],
        [`${b}|subject`, 1],
      ]),
    );
  } finally {
    await broker.close();
  }
});
