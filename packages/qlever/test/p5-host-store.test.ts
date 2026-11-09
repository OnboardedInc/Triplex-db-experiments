// [EXP-P5B] Why: R34's store route needs real SQLite lifetime and maintenance tests before screening.
// Rejected: mocking H1 pages (cannot prove gate coordination or old-cut row bytes).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HostBroker } from "../src/broker/broker.js";
import { HostLog, H1BasisUnsupported } from "../src/broker/log.js";
import { BasisNotAvailable } from "../src/broker/errors.js";
import { columns } from "../src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const root = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-P5B-tests");
const row = (id: string, entity: string, ref?: string): TripleRow =>
  ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    id,
    entity_id: entity,
    attribute: ref ? "answers" : "value",
    value_type: ref ? "ref" : "string",
    value_string: ref ?? id,
    valid_from: 0,
    recorded_at: 1,
    recorded_position: -1,
  }) as TripleRow;
const submit = (b: HostBroker, id: string, rows: TripleRow[], priors: TripleRow[] = []) =>
  b.submit({
    operationId: id,
    attemptId: id,
    sourceK: b.head(),
    reads: { entities: new Set<string>(), scopeWide: false },
    claims: [{ commandId: id, txId: id, timestamp: 1 }],
    placeholders: [-1],
    rows,
    priors: new Map(priors.map((r) => [r.id, r])),
    newIds: new Set(rows.filter((r) => !priors.some((p) => p.id === r.id)).map((r) => r.id)),
  });
async function fixture(run: (b: HostBroker, log: HostLog) => Promise<void>) {
  const dir = path.join(root, randomUUID());
  const b = await HostBroker.open({ dir, scopeKey: "p5-test", minFreeBytes: 0 });
  // Test access only: production ownership remains with the broker.
  const log = (b as unknown as { log: HostLog }).log;
  try {
    await run(b, log);
  } finally {
    await b.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
describe("EXP-P5B host store", () => {
  it("reads a complete multi-hop page at P, masks later retirement, and checks future/expired/time cuts", async () => {
    await fixture(async (b, log) => {
      await submit(b, "seed", [row("edge", "s", "a"), row("leaf", "a")]);
      const P = b.head(),
        before = await b.sweepPage(P, ["s"], { validAt: 1 });
      expect(before.rows.map((r) => r.id).sort()).toEqual(["edge", "leaf"]);
      expect(before.roundTrips).toBe(2);
      expect(before.transactionMs).toBeGreaterThanOrEqual(0);
      expect(before.cpuMicros).toBeGreaterThanOrEqual(0);
      const old = before.rows.find((r) => r.id === "leaf")!;
      await submit(
        b,
        "replace",
        [
          { ...old, retracted_position: -1, retracted_at: 2, retract_tx_id: "replace" },
          row("new", "a"),
        ],
        [old],
      );
      for (const worker of [0, 1, 2, 3])
        expect((await b.sweepPage(P, ["s"], { worker, validAt: 1 })).rows).toEqual(before.rows);
      await expect(log.sweepPage(b.head() + 1, [])).rejects.toBeInstanceOf(BasisNotAvailable);
      await expect(log.sweepPage(-1, [])).rejects.toBeInstanceOf(BasisNotAvailable);
      await expect(
        log.sweepPage({ recordedPosition: P, recordedAt: 1 }, ["s"]),
      ).rejects.toBeInstanceOf(H1BasisUnsupported);
      await expect(log.sweepPage({ recordedAt: 1 } as any, ["s"])).rejects.toBeInstanceOf(
        H1BasisUnsupported,
      );
      log.purge(b.head());
      await expect(log.sweepPage(P, ["s"])).rejects.toBeInstanceOf(BasisNotAvailable);
    });
  });
  it("leases protect a cut, renew explicitly, expire without resurrection, and allow unrelated purge/checkpoint", async () => {
    await fixture(async (b, log) => {
      await submit(b, "seed", [row("old", "s")]);
      const P = b.head(),
        pin = log.pinBasis(P, "p5-test", { ttlMs: 200, maxLagPositions: 0 });
      pin.renew();
      const old = (await log.sweepPage(P, ["s"])).rows[0];
      await submit(b, "retire", [{ ...old, retracted_position: -1, retracted_at: 2 }], [old]);
      expect(log.purge(b.head()).h).toBe(P);
      expect((await log.sweepPage(P, ["s"])).rows.map((r) => r.id)).toEqual(["old"]);
      expect(
        (await log.checkpoint()).events.some(
          (e) => e.mode === "RESTART" && e.outcome === "complete",
        ),
      ).toBe(true);
      await new Promise((r) => setTimeout(r, 250));
      expect(() => pin.renew()).toThrow("expired");
      expect(log.purge(b.head()).h).toBe(b.head());
      await expect(log.sweepPage(P, ["s"])).rejects.toBeInstanceOf(BasisNotAvailable);
      pin.release();
      expect(() => log.pinBasis(P, "late", { ttlMs: 100, maxLagPositions: 0 })).toThrow();
    });
  });
  it("preserves packed broker positions: a fresh W0 reference receipt cannot be dense position one", async () => {
    await fixture(async (b, log) => {
      const decision = await submit(b, "first", [row("first", "s")]);
      expect(decision.kind).toBe("committed");
      if (decision.kind !== "committed") throw Error("missing receipt");
      expect(decision.positions.get(-1)).toBe(2048);
      expect(decision.positions.get(-1)).not.toBe(1);
      expect((await log.sweepPage(2048, ["s"])).rows[0].recorded_position).toBe(2048);
      expect((await log.sweepPage(1, ["s"])).rows).toEqual([]);
    });
  });
  it("chunks large BFS frontiers and terminates reference cycles", async () => {
    await fixture(async (b, log) => {
      const rows: TripleRow[] = [];
      for (let i = 0; i < 600; i++)
        rows.push(row(`edge${i}`, "s", `a${i}`), row(`leaf${i}`, `a${i}`, "s"));
      await submit(b, "wide", rows);
      const page = await log.sweepPage(b.head(), ["s"], { validAt: 1 });
      expect(page.rows.length).toBe(1200);
      expect(new Set(page.rows.map((r) => r.id)).size).toBe(1200);
      expect(page.roundTrips).toBe(2);
    });
  });
  it("bounds pages, validates worker and lease options, excludes future-valid facts", async () => {
    await fixture(async (b, log) => {
      await submit(b, "future", [{ ...row("future", "s"), valid_from: 10 }]);
      expect((await log.sweepPage(b.head(), ["s"], { validAt: 9 })).rows).toEqual([]);
      expect((await log.sweepPage(b.head(), ["s"], { validAt: 10 })).rows.map((r) => r.id)).toEqual(
        ["future"],
      );
      await expect(log.sweepPage(b.head(), Array(65).fill("s"))).rejects.toThrow();
      await expect(log.sweepPage(b.head(), [], { worker: 4 })).rejects.toThrow();
      await expect(log.sweepPage(b.head(), [], { validAt: NaN })).rejects.toThrow();
      expect(() => log.pinBasis(b.head(), "bad", { ttlMs: 0, maxLagPositions: 0 })).toThrow();
    });
  });
});
