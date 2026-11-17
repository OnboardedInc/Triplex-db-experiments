import { describe, expect, it } from "vitest";
import { nativeByCommit } from "../../../lab/trace/scale-reading.mjs";

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
