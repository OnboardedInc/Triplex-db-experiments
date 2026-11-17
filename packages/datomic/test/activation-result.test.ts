import { describe, expect, it } from "vitest";
import { qualifyActivation } from "../../../lab/trace/activation-result.mjs";
const expected = {
  run: "tx2-dxt1-test",
  source: "a".repeat(40),
  slot: "tx2-dxt1-test",
  nonce: "11111111-1111-1111-1111-111111111111",
  programSha256: "b".repeat(64),
  sourceManifestSha256: "c".repeat(64),
  subjects: 1000,
  scope: "bound-scope",
  sealedCut: 42,
};
const result = {
  classification: "DIAGNOSTIC",
  acceptance: false,
  N: 1000,
  scope: expected.scope,
  bootstrapWorlds: 1000,
  oracleCompared: 1000,
  publishedStatesCompared: 1000,
  bootstrap: { position: 42 },
  publishedStatePosition: 50,
  finalPosition: 50,
  publication: { changed: 600, commits: 20, wallMs: 100 },
  r1Publication: { changed: 1000, commits: 40, wallMs: 100 },
  fullHistoryCounts: [{ position: 42 }],
};
const envelope = { schema: "triplex.activation-envelope/1", ...expected, durationMs: 10, result };
describe("activation diagnostic receipt", () => {
  it("accepts complete comparisons bound to this attempt without granting a performance verdict", () => {
    const r = qualifyActivation([envelope], expected);
    expect(r.oracleCompared).toBe(1000);
    expect(r.performanceVerdict).toContain("NOT JUDGED");
  });
  it("refuses an unsupported population or invalid expected identity", () => {
    for (const change of [
      { subjects: 0 },
      { subjects: 100 },
      { scope: "" },
      { sealedCut: NaN },
      { source: "stale" },
    ])
      expect(() => qualifyActivation([envelope], { ...expected, ...change })).toThrow(
        "Invalid activation",
      );
  });
  it("refuses partial exactness even when an earlier timing measurement exists", () => {
    for (const key of ["bootstrapWorlds", "oracleCompared", "publishedStatesCompared"])
      expect(() =>
        qualifyActivation([{ ...envelope, result: { ...result, [key]: 999 } }], expected),
      ).toThrow("Incomplete");
  });
  it("refuses missing durable publication observations", () => {
    for (const key of ["publication", "r1Publication"])
      expect(() =>
        qualifyActivation([{ ...envelope, result: { ...result, [key]: {} } }], expected),
      ).toThrow("Incomplete");
  });
  it("refuses a completed world comparison without independent journal readback", () => {
    for (const fullHistoryCounts of [undefined, []])
      expect(() =>
        qualifyActivation([{ ...envelope, result: { ...result, fullHistoryCounts } }], expected),
      ).toThrow("Incomplete");
  });
  it("refuses stale nonce, source, program, slot or run", () => {
    for (const key of ["nonce", "source", "programSha256", "sourceManifestSha256", "slot", "run"])
      expect(() => qualifyActivation([{ ...envelope, [key]: "stale" }], expected)).toThrow(
        "Stale/foreign",
      );
  });
  it("requires exactly one terminal result and the exact input/publication cuts", () => {
    expect(() => qualifyActivation([], expected)).toThrow("one");
    expect(() => qualifyActivation([envelope, envelope], expected)).toThrow("one");
    expect(() =>
      qualifyActivation([{ ...envelope, result: { ...result, finalPosition: 51 } }], expected),
    ).toThrow("Incomplete");
    expect(() => qualifyActivation([envelope], { ...expected, sealedCut: 41 })).toThrow(
      "Incomplete",
    );
  });
});
