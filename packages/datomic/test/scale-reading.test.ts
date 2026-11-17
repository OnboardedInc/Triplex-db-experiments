import { describe, expect, it } from "vitest";
import { nativeByCommit, validPostgresBracket } from "../../../lab/trace/scale-reading.mjs";

const manifest = { tag: "tx2-dxt1-test", source: "a".repeat(40), slot: "tx2-dxt1-test" };
const identity = { run: manifest.tag, source: manifest.source, slot: manifest.slot };
const write = { traceId: "b".repeat(32), outcome: "committed" };
const gateway = {
  ...identity,
  traceId: write.traceId,
  attributes: { databaseHash: "c".repeat(64), datomicT: "1234" },
};
const native = {
  ...identity,
  databaseHash: gateway.attributes.databaseHash,
  datomicT: "1234",
  nativeStats: { msec: 7, "apply-msec": 3, "io-stats": { reads: { ocache: 42 } } },
};

describe("phase Postgres observation brackets", () => {
  const phase = { start: 100_000, end: 110_000 };
  const first = {
    writerAt: 90_000,
    database: { datid: 16384, datname: "datomic", stats_reset: "epoch-1", xact_commit: 50 },
    wal: { stats_reset: "wal-epoch-1" },
  };
  const last = {
    writerAt: 120_000,
    database: { ...first.database, xact_commit: 90 },
    wal: first.wal,
  };
  it("accepts a nearby unchanged counter epoch on both sides of the phase", () => {
    expect(validPostgresBracket(phase, first, last)).toBe(true);
    expect(
      validPostgresBracket(
        phase,
        { ...first, database: { ...first.database, datid: "16384", stats_reset: null } },
        { ...last, database: { ...last.database, datid: "16384", stats_reset: null } },
      ),
    ).toBe(true);
  });
  it("refuses stale, missing, reversed, or non-bracketing observations", () => {
    for (const [before, after] of [
      [null, last],
      [first, null],
      [{ ...first, writerAt: 64_999 }, last],
      [first, { ...last, writerAt: 145_001 }],
      [{ ...first, writerAt: 100_001 }, last],
      [first, { ...last, writerAt: 109_999 }],
      [last, first],
    ])
      expect(validPostgresBracket(phase, before, after)).toBe(false);
  });
  it("refuses reset, regressing, foreign, or unidentified database counters", () => {
    for (const database of [
      { ...last.database, datid: 16385 },
      { ...last.database, datname: "other" },
      { ...last.database, stats_reset: "epoch-2" },
      { ...last.database, xact_commit: 49 },
      { ...last.database, xact_commit: NaN },
    ])
      expect(validPostgresBracket(phase, first, { ...last, database })).toBe(false);
    expect(validPostgresBracket(phase, { writerAt: 90_000 }, { writerAt: 120_000 })).toBe(false);
    expect(validPostgresBracket(phase, first, { ...last, wal: { stats_reset: "other" } })).toBe(
      false,
    );
    expect(validPostgresBracket(phase, first, { ...last, wal: {} })).toBe(false);
  });
});

describe("100k diagnostic counter identities", () => {
  it("joins the observed native counter to the exact acknowledged database/t and trace", () => {
    const [row] = nativeByCommit(manifest, [write], [gateway], [native]);
    expect(row!.write).toBe(write);
    expect(row!.native).toBe(native);
  });
  it("quarantines an empty native completion marker without inventing an observed ACK counter", () => {
    const marker = {
      ...identity,
      nativeType: "triplex.NativeTransaction",
      name: "datomic.tx/process",
      databaseHash: null,
      datomicT: "",
      nativeStats: {},
    };
    expect(nativeByCommit(manifest, [write], [], [marker])[0]!.native).toBeUndefined();
    expect(() => nativeByCommit(manifest, [write], [], [{ ...marker, slot: "foreign" }])).toThrow(
      "Foreign",
    );
    expect(() =>
      nativeByCommit(manifest, [write], [], [{ ...marker, nativeStats: { msec: 1 } }]),
    ).toThrow("Invalid");
  });
  it("keeps absent or different-database/t observations unknown", () => {
    for (const replacement of [
      { ...native, datomicT: "1235" },
      { ...native, databaseHash: "d".repeat(64) },
    ])
      expect(
        nativeByCommit(manifest, [write], [gateway], [replacement])[0]!.native,
      ).toBeUndefined();
  });
  it("refuses a foreign source, slot, or run instead of borrowing counters", () => {
    for (const field of ["source", "slot", "run"])
      expect(() =>
        nativeByCommit(manifest, [write], [gateway], [{ ...native, [field]: "foreign" }]),
      ).toThrow("Foreign");
  });
  it("refuses duplicate native transactions and ambiguous gateway retries", () => {
    expect(() => nativeByCommit(manifest, [write], [gateway], [native, native])).toThrow(
      "Duplicate",
    );
    expect(() => nativeByCommit(manifest, [write], [gateway, gateway], [native])).toThrow(
      "Multiple",
    );
  });
  it("refuses invalid native durations rather than explaining latency with impossible counters", () => {
    expect(() =>
      nativeByCommit(
        manifest,
        [write],
        [gateway],
        [{ ...native, nativeStats: { msec: 1, "apply-msec": 7 } }],
      ),
    ).toThrow("Invalid");
  });
});
