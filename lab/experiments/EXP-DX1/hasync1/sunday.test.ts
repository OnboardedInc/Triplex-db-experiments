import { describe, expect, it } from "vitest";
import { hash } from "../ha1/common.ts";
import { absolute } from "./sunday-config.ts";
import { echo, roundTrips } from "./sunday-link.ts";
import { coldCopy, seedFiles } from "./sunday-seed.ts";
import { partitionReceipts, readReceipts, windows, type Offer } from "./sunday-traffic.ts";

const digest = "a".repeat(64);
const manifest = (names: string[]) => names.map((name) => digest + "  ./" + name + "\n").join("");
const fixture = ["PG_VERSION", "global/pg_control", "base/5/2600"];

describe("Sunday run proofs", () => {
  it("rejects drift, a recovery image, traversal, and duplicate manifest entries", () => {
    const raw = manifest(fixture);
    expect(seedFiles(raw, hash(raw))).toBe(3);
    expect(() => seedFiles(raw + " ", hash(raw))).toThrow();
    for (const invalid of ["postmaster.pid", "standby.signal", "../extra", "base/5/2600"]) {
      const raw = manifest([...fixture, invalid]);
      expect(() => seedFiles(raw, hash(raw))).toThrow();
    }
    expect(coldCopy).toContain("${sum%% *}");
    expect(absolute("/tmp/a,volume")).toBe(false);
    expect(absolute("/tmp/../a")).toBe(false);
  });

  it("checks exact private-link probe bytes against the loopback control", async () => {
    const close = await echo("127.0.0.1");
    try {
      const stats = await roundTrips("127.0.0.1");
      expect(stats.bulkBytes).toBe(32 * 1024 ** 2);
      expect(stats.bulkSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(stats.p50Ms).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });

  it("splits deferred receipts by actual route and keeps every refused or late offer", async () => {
    const cut = (v: string) => ({ t: "long" as const, v });
    const receipt = (operationId: string, v: string) => ({
      operationId,
      t: cut(v),
      position: cut(v),
      recordedAt: { t: "double" as const, v: 4 },
    });
    const early = receipt("old", "10"),
      after = receipt("new", "11");
    const offers: Offer[] = [
      {
        kind: "save",
        ordinal: 0,
        due: 10,
        start: 10,
        end: 65,
        state: "pending-late",
        receipt: early,
        epoch: 0,
      },
      { kind: "save", ordinal: 1, due: 31, start: 31, end: 33, state: "refused" },
      {
        kind: "save",
        ordinal: 2,
        due: 60,
        start: 60,
        end: 70,
        state: "acknowledged",
        receipt: after,
        epoch: 1,
      },
      { kind: "read", ordinal: 0, due: 14, start: 14, end: 20, state: "acknowledged" },
      { kind: "read", ordinal: 1, due: 33, start: 33, end: 45, state: "acknowledged" },
      { kind: "read", ordinal: 2, due: 50, start: 50, end: 75, state: "pending-late" },
    ];
    expect(partitionReceipts(offers, 1)).toEqual({ before: [early], after: [after] });
    expect(windows(offers, 30, 55, 71, 1)).toEqual({
      firstWriteMs: 40,
      firstReceipt: after,
      firstReadMs: 15,
      readGapMs: 25,
      reads: 2,
      missedReads: 1,
      fate: { refused: 1, acknowledged: 1 },
    });
    const reply = (operations: unknown[]) =>
      ({
        request: async () => ({ database: "one-db", operations }),
      }) as unknown as Parameters<typeof readReceipts>[0];
    const seen = await readReceipts(
      reply([{ status: "committed", ...early }, { status: "absent" }]),
      "one-db",
      [early, after],
    );
    expect(seen).toEqual([
      { expected: early, observed: early },
      { expected: after, observed: null },
    ]);
    await expect(
      readReceipts(reply([{ status: "committed", ...after }]), "one-db", [early]),
    ).rejects.toThrow();
  });
});
