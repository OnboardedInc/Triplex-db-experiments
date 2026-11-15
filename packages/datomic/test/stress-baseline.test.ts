import { describe, expect, it } from "vitest";
import { validateStressBaseline, stressRuntime, validateStressRuntime } from "../../../lab/trace/stress-baseline.mjs";

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
    config: { matchDurationS: 450, maxReaders: 1024, baselineWrites: "/evidence/zero/writes.jsonl" },
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
    (v: any) => (v.baseline.config.matchDurationS = 300),
    (v: any) => (v.bench.config.readerThreads = 99),
  ])("rejects foreign, stale, incomplete or changed evidence %#", (mutate) => {
    const v = fixture();
    mutate(v);
    expect(() => validateStressBaseline(v)).toThrow(/baseline/);
  });
});

const runtimeFixture = () => {
  const manifest = { tag: "attempt", startedAt: 1000 };
  const rows = ["pg", "tx", "gw-w", "gw-r", "driver"].map((role, i) => ({
    Name: "/attempt-" + role, Id: String(i + 1).repeat(64), Created: new Date(1100).toISOString(),
    State: { Running: role !== "driver", Status: role === "driver" ? "created" : "running", StartedAt: new Date(1200).toISOString() },
    Image: "sha256:" + "a".repeat(64), HostConfig: { Memory: 1024, MemorySwap: 1024, MemoryReservation: 0, CpuShares: 0, NanoCpus: 0, CpuPeriod: 0, CpuQuota: 0, CpusetCpus: "0", CpusetMems: "" },
    Config: { Env: ["TRIPLEX_TRACE_RUN=attempt", "NODE_OPTIONS=--max-old-space-size=6144"] },
  }));
  return { manifest, traceStartAbsMs: 1500, containers: rows.slice(0, 4), driver: rows.slice(4), properties: "object-cache-max=1280m", sourceHashes: { source: "bytes" } };
};
describe("stress denominator runtime", () => {
  it("accepts observed matching runtime settings", () => {
    const a = runtimeFixture();
    expect(() => validateStressRuntime(stressRuntime(a), stressRuntime(structuredClone(a)))).not.toThrow();
  });
  it.each([
    (v: any) => (v.containers[1].HostConfig.CpusetCpus = "0,1"),
    (v: any) => (v.driver[0].Config.Env[1] = "NODE_OPTIONS=--max-old-space-size=1024"),
    (v: any) => (v.containers[0].Image = "other"),
    (v: any) => (v.properties = "object-cache-max=1g"),
    (v: any) => (v.sourceHashes.source = "other"),
    (v: any) => delete v.containers[0].HostConfig.Memory,
    (v: any) => (v.containers[0].HostConfig.MemorySwap = -1),
    (v: any) => (v.containers[0].HostConfig.CpusetCpus = ""),
  ])("rejects a changed denominator runtime %#", (mutate) => {
    const a = runtimeFixture(), b = structuredClone(a); mutate(b);
    expect(() => validateStressRuntime(stressRuntime(a), stressRuntime(b))).toThrow(/baseline/);
  });
  it.each([
    (v: any) => (v.manifest.startedAt = NaN),
    (v: any) => (v.traceStartAbsMs = NaN),
    (v: any) => (v.containers[0].Created = "invalid"),
    (v: any) => (v.containers[0].Created = new Date(2000).toISOString()),
    (v: any) => (v.containers[0].State.StartedAt = new Date(2000).toISOString()),
  ])("rejects missing or future runtime clocks %#", (mutate) => {
    const a = runtimeFixture(); mutate(a);
    expect(() => stressRuntime(a)).toThrow(/baseline/);
  });
  it("rejects stale container readbacks", () => {
    const a = runtimeFixture(); a.containers[0].Created = new Date(500).toISOString();
    expect(() => stressRuntime(a)).toThrow(/stale/);
  });
});
