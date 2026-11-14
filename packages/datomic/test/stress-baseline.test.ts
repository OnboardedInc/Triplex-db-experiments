import { describe, expect, it } from "vitest";
import { validateStressBaseline } from "../../../lab/trace/stress-baseline.mjs";

const fixture = () => ({
  source: "head",
  prefix: "tx2-dxt1-test",
  hash: "a".repeat(64),
  baselinePath: "/evidence/zero/writes.jsonl",
  manifest: { startedAt: 3000 },
  baselineManifest: {
    tag: "tx2-dxt1-test-zero",
    slot: "tx2-dxt1-test-zero",
    source: "head",
    session: "tx2-dxt1-test",
    startedAt: 1000,
  },
  bench: {
    config: { maxReaders: 1024, baselineWrites: "/evidence/zero/writes.jsonl" },
    trace: { digest: "frozen" },
    matchedBaseline: { sha256: "a".repeat(64) },
    benchSources: { a: "bytes" },
  },
  baseline: {
    status: "DONE",
    endedAt: new Date(2000).toISOString(),
    config: { zeroReaders: true, matchDurationS: 450 },
    writer: { pendingAtEnd: 0, expired: 0 },
    correctness: { errors: 0, violations: 0 },
    trace: { digest: "frozen" },
    benchSources: { a: "bytes" },
  },
});
describe("same-session stress denominator", () => {
  it("accepts a completed byte-bound earlier baseline", () =>
    expect(() => validateStressBaseline(fixture())).not.toThrow());
  it.each([
    (v: any) => (v.baselineManifest.source = "other"),
    (v: any) => (v.baselineManifest.slot = "other"),
    (v: any) => (v.baselineManifest.session = "old"),
    (v: any) => (v.baseline.endedAt = new Date(4000).toISOString()),
    (v: any) => (v.baseline.endedAt = new Date(500).toISOString()),
    (v: any) => (v.baseline.writer.pendingAtEnd = 1),
    (v: any) => (v.baseline.correctness.violations = 1),
    (v: any) => (v.bench.matchedBaseline.sha256 = "b".repeat(64)),
    (v: any) => (v.baseline.trace.digest = "other"),
    (v: any) => (v.baseline.benchSources.a = "other"),
    (v: any) => (v.bench.config.maxReaders = 256),
  ])("rejects foreign, stale, incomplete or changed evidence %#", (mutate) => {
    const v = fixture();
    mutate(v);
    expect(() => validateStressBaseline(v)).toThrow(/baseline/);
  });
});
