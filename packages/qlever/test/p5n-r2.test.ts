// [EXP-P5N-R2] Why: round 2 changes the owner's critical path (batched head lookups, purge slack, checkpoint tuning) and the sweep read (split transactions at one basis); each needs a test that the answers do not change.
// Rejected: relying on the 10k screen (a wrong row set there costs a full run to find).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HostBroker } from "../src/broker/broker.js";
import { openSweepReader, type HostLog } from "../src/broker/log.js";
import { columns } from "../src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const root = path.resolve(import.meta.dirname, "../../../runs/broker/EXP-P5N-R2-tests");
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
const submit = (b: HostBroker, id: string, rows: TripleRow[], priors: TripleRow[] = [], reads: string[] = []) =>
  b.submit({
    operationId: id,
    attemptId: id,
    sourceK: b.head(),
    reads: { entities: new Set<string>(reads), scopeWide: false },
    claims: [{ commandId: id, txId: id, timestamp: 1 }],
    placeholders: [-1],
    rows,
    priors: new Map(priors.map((r) => [r.id, r])),
    newIds: new Set(rows.filter((r) => !priors.some((p) => p.id === r.id)).map((r) => r.id)),
  });
async function fixture(
  options: Partial<Parameters<typeof HostBroker.open>[0]>,
  run: (b: HostBroker, log: HostLog) => Promise<void>,
) {
  const dir = path.join(root, randomUUID());
  const b = await HostBroker.open({ dir, scopeKey: "p5n-r2-test", minFreeBytes: 0, ...options } as any);
  const log = (b as unknown as { log: HostLog }).log;
  try {
    await run(b, log);
  } finally {
    await b.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
describe("EXP-P5N round 2", () => {
  it("split sweep returns the same row set at P as one transaction, and keeps old-cut bytes after a later retirement", async () => {
    await fixture({}, async (b, log) => {
      // a 3-hop graph wide enough that a split of 2 entities needs several transactions per hop
      const rows: TripleRow[] = [];
      for (let i = 0; i < 6; i++) {
        rows.push(row("s" + i + "-v", "s" + i), row("s" + i + "-e", "s" + i, "m" + i), row("m" + i + "-v", "m" + i), row("m" + i + "-e", "m" + i, "z" + (i % 3)));
      }
      for (let i = 0; i < 3; i++) rows.push(row("z" + i + "-v", "z" + i));
      await submit(b, "seed", rows);
      const P = b.head(),
        subjects = ["s0", "s1", "s2", "s3", "s4", "s5"];
      const whole = await b.sweepPage(P, subjects, { validAt: 1 });
      const handle = log.sweepHandle();
      const reader = openSweepReader(handle.file, handle.gate);
      try {
        const split = await reader.sweep({ basis: P, entities: subjects, validAt: 1, split: 2 });
        const ids = (r: { rows: { id: string }[] }) => r.rows.map((x) => x.id).sort();
        expect(ids(split)).toEqual(ids(whole));
        expect(split.transactions).toBeGreaterThan(3);
        expect(split.snapshot.epoch).toBe(whole.snapshot.epoch);
        // a later commit retires a row; the pinned old cut is unchanged byte for byte
        const old = whole.rows.find((r) => r.id === "m0-v") as unknown as TripleRow;
        await submit(b, "retire", [{ ...old, retracted_position: -1, retracted_at: 2, retract_tx_id: "retire" } as TripleRow, row("m0-v2", "m0")], [old]);
        const after = await reader.sweep({ basis: P, entities: subjects, validAt: 1, split: 2 });
        expect(after.rows.sort((a, c) => a.id.localeCompare(c.id))).toEqual(split.rows.sort((a, c) => a.id.localeCompare(c.id)));
        await expect(reader.sweep({ basis: b.head() + 1, entities: subjects, split: 2 })).rejects.toThrow(/BASIS_NOT_AVAILABLE|not available/i);
      } finally {
        await reader.close();
      }
    });
  });
  it("batched head lookup still conflicts on a stale subject head", async () => {
    await fixture({}, async (b) => {
      await submit(b, "a", [row("a1", "x"), row("b1", "y")]);
      const stale = 0; // sourceK older than the stored heads of x and y
      const decision = await b.submit({
        operationId: "c",
        attemptId: "c",
        sourceK: stale,
        reads: { entities: new Set<string>(), scopeWide: false },
        claims: [{ commandId: "c", txId: "c", timestamp: 1 }],
        placeholders: [-1],
        rows: [row("a2", "x"), row("n1", "fresh")],
        priors: new Map(),
        newIds: new Set(["a2", "n1"]),
      });
      expect(decision.kind).toBe("conflict");
      const ok = await submit(b, "d", [row("a3", "x")]);
      expect(ok.kind).toBe("committed");
    });
  });
  it("purge slack keeps at least the tail, purges in bursts, and never lets the tail grow without bound", async () => {
    await fixture({ frameRetention: { tailFrames: 4, purgeEveryFrames: 10 } }, async (b, log) => {
      for (let i = 0; i < 60; i++) await submit(b, "f" + i, [row("r" + i, "e" + i)]);
      const headers = await (log as any).pool[0].request("frameHeaders");
      // at least the newest 4 frames are kept, and the slack bounds the retained count
      expect(headers.length).toBeGreaterThanOrEqual(4);
      expect(headers.length).toBeLessThanOrEqual(4 + 10 + 2);
    });
  });
  it("checkpoint tuning asks for RESTART at a small WAL and completes one when no reader holds a transaction", async () => {
    await fixture({ checkpoint: { walRestartBytes: 64 * 1024, restartEveryMs: 200, restartMinBytes: 1024 } }, async (b) => {
      for (let i = 0; i < 40; i++) await submit(b, "w" + i, [row("w" + i, "e" + (i % 5))]);
      await new Promise((r) => setTimeout(r, 1500));
      const status: any = await b.checkpointStatus();
      expect(status.events.some((e: any) => e.mode === "RESTART" && e.outcome === "complete")).toBe(true);
    });
  });
});
