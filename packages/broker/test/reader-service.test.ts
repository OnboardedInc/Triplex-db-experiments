// [EXP-P2B-R3] Why: an out-of-thread source must bind its exact file, epoch and published prefix.
// Rejected: a fast SQLite pull that silently reads an unrelated stream or changes an old pin.
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { HostBroker } from "../src/broker.js";
import { BrokerReadService } from "../src/reader-service.js";
const open = () =>
  HostBroker.open({
    dir: path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
    scopeKey: "reader-test",
    decisionStamp: true,
    autoApply: false,
    requireFullFsync: false,
    minFreeBytes: 5 * 1024 ** 3,
  });
const row = {
  id: "fact",
  entity_id: "subject",
  attribute: ":a",
  value_type: "string" as const,
  value_string: "first",
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
  tx_id: "tx",
};
const txn = (id: string, rows: (typeof row)[], sourceK: number) => ({
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
it("reads exact pinned source versions after retirement and refuses future/closed/wrong-file reads", async () => {
  const a = await open(),
    b = await open();
  let source: BrokerReadService | undefined;
  try {
    const first = await a.submit(txn("first", [row], 0));
    if (first.kind !== "committed") throw Error("no receipt");
    const pin = [...first.positions.values()][0]!;
    source = new BrokerReadService(a.segmentPath, a.readerWatermark.buffer);
    expect(() => new BrokerReadService(b.segmentPath, a.readerWatermark.buffer)).toThrow(
      "identity mismatch",
    );
    const before = await source.pullAt(pin, { entities: ["subject"] });
    expect(before.eligible).toBe(true);
    expect(before.rows).toHaveLength(1);
    const old = before.rows[0]!;
    await a.submit({
      ...txn(
        "retract",
        [{ ...old, retracted_position: -1, retracted_at: 2 } as typeof row],
        a.head(),
      ),
      priors: new Map([[old.id, old]]),
    });
    const historical = await source.pullAt(pin, { entities: ["subject"] });
    expect(historical.rows.map((r) => r.id)).toEqual(["fact"]);
    const latest = await source.pullAt(a.head(), { entities: ["subject"] });
    expect(latest.rows).toEqual([]);
    expect(await source.fromLogAsync(0, { entities: ["missing"] }, () => true)).toEqual([]);
    const persisted = await source.fromLogAsync(0, { id: "fact" }, () => true);
    expect(persisted[0]?.recorded_position).toBe(pin);
    expect(persisted[0]?.retracted_position).toBeGreaterThan(pin);
    await expect(source.awaitResolved(a.head() + 10000)).rejects.toMatchObject({
      reason: "basis-not-reached",
      waitedMs: 0,
    });
    await expect(source.pullAt({ recordedPosition: pin, recordedAt: 1 }, {})).rejects.toMatchObject(
      { reason: "h1-record-time-unsupported" },
    );
    const lease = await a.pinBasis(pin, "reader-test");
    await a.purgeCurrent(a.head());
    expect((await source.pullAt(pin, {})).eligible).toBe(true);
    await lease.release();
    await a.purgeCurrent(a.head());
    expect((await source.pullAt(pin, {})).eligible).toBe(false);
    await a.close();
    expect(() => source!.head()).toThrow("closed");
  } finally {
    source?.close();
    await a.close();
    await b.close();
  }
});
