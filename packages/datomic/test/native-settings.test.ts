import { describe, expect, it } from "vitest";
import {
  quietLogback,
  validateNativeSettings,
  QUIET_LOGGERS,
  nativeBookendComparison,
  validateNativeAffinity,
  validateNativeBands,
} from "../../../lab/trace/native-settings.mjs";

describe("native setting comparison evidence", () => {
  it("recomputes L256 histograms from the settled writer population", async () => {
    const { Histogram } = await import("../../../lab/bench/lib/hist.ts");
    const h = new Histogram();
    h.recordMs(1.25);
    const empty = new Histogram().summary();
    const bench = {
      config: { settleS: 2 },
      phases: [{ name: "L256", start: 1000, end: 5000 }],
      priorities: { P2: { bandsAtL256: { "5-10": h.summary(), "11-25": empty, "26-50": empty } } },
    };
    const writes = [
      { scheduledAt: 3000, facts: 5, latencyMs: 1.25 },
      { scheduledAt: 2000, facts: 5, latencyMs: 99 },
    ];
    expect(validateNativeBands(bench, writes)).toBe(true);
    bench.priorities.P2.bandsAtL256["5-10"].p50Ms = 1.3;
    expect(() => validateNativeBands(bench, writes)).toThrow("writer bytes");
  });
  it("rejects a stale affinity record even when requested CPU masks match", () => {
    const manifest = { tag: "attempt", slot: "slot", source: "source", startedAt: 1000 };
    const rows = Array.from({ length: 5 }, (_, thread) => ({
      thread,
      run: "attempt",
      slot: "slot",
      source: "source",
      at: 1100,
      pid: 14,
      main: "3",
      workers: "4,5,6,7",
      allowed: thread === 0 ? "3" : "4-7",
      background: thread === 0 ? [{ allowed: "4-7" }] : undefined,
    }));
    expect(validateNativeAffinity(rows, manifest, 1200)).toBe(true);
    expect(() =>
      validateNativeAffinity(
        rows.map((r) => ({ ...r, at: 999 })),
        manifest,
        1200,
      ),
    ).toThrow();
    expect(() =>
      validateNativeAffinity(
        rows.map((r) => ({ ...r, slot: "other" })),
        manifest,
        1200,
      ),
    ).toThrow();
    expect(() =>
      validateNativeAffinity(
        rows.map((r) => ({ ...r, allowed: "3-7" })),
        manifest,
        1200,
      ),
    ).toThrow();
  });
  it("keeps the actual candidate count and requires a benefit beyond both fresh bookends", () => {
    expect(nativeBookendComparison([14, 15], [13.8]).lowerBeyondBookendDrift).toBe(false);
    expect(nativeBookendComparison([14, 14.2], [13])).toMatchObject({
      candidateRuns: 1,
      lowerBeyondBookendDrift: true,
    });
    expect(() => nativeBookendComparison([14], [13])).toThrow();
    expect(() => nativeBookendComparison([14, 14], [])).toThrow();
    expect(() => nativeBookendComparison([14, 14], [NaN])).toThrow();
  });
  const manifest = { tag: "attempt", slot: "slot", source: "source", startedAt: 1000 };
  const expected = {
    DX_QUIET_LOGS: "1",
    DX_ENCRYPT_CHANNEL: "false",
    DX_INDEX_THRESHOLD: "256m",
    DX_INDEX_MAX: "1g",
  };
  const properties =
    "encrypt-channel=false\nmemory-index-threshold=256m\nmemory-index-max=1g\nobject-cache-max=1g\n";
  const rows = () =>
    ["tx", "gw-w", "gw-r"].map((process) => ({
      type: "native-settings",
      process,
      run: "attempt",
      slot: "slot",
      source: "source",
      at: 1100,
      configuration: "/dxh1/quiet-logback.xml",
      loggers: Object.fromEntries(QUIET_LOGGERS.map((n) => [n, "WARN"])),
    }));
  it("preserves the vendor appender and changes only requested categories", () => {
    const xml =
      '<configuration><appender name="MAIN"><prudent>true</prudent></appender><!-- <logger name="datomic.peer" level="DEBUG"/> --><root level="INFO"/></configuration>';
    const out = quietLogback(xml);
    expect(out).toContain("<prudent>true</prudent>");
    expect(out.replace(/  <logger name="datomic\.[^"]+" level="WARN"\/>\n/g, "")).toBe(xml);
    expect(() =>
      quietLogback('<configuration><logger name="datomic.peer" level="DEBUG"/></configuration>'),
    ).toThrow();
  });
  it("requires observed levels and native property content", () => {
    expect(validateNativeSettings({ manifest, expected, properties, rows: rows() })).toBe(true);
    const wrong = rows();
    wrong[0]!.loggers["datomic.peer"] = "INFO";
    expect(() => validateNativeSettings({ manifest, expected, properties, rows: wrong })).toThrow();
    expect(() =>
      validateNativeSettings({
        manifest,
        expected,
        properties: properties.replace("false", "true"),
        rows: rows(),
      }),
    ).toThrow();
  });
  it("rejects previous attempts, missing JVMs and stale startup observations", () => {
    for (const change of [
      { at: 999 },
      { run: "previous" },
      { source: "previous" },
      { slot: "previous" },
    ]) {
      const wrong = rows();
      Object.assign(wrong[0]!, change);
      expect(() =>
        validateNativeSettings({ manifest, expected, properties, rows: wrong }),
      ).toThrow();
    }
    expect(() =>
      validateNativeSettings({ manifest, expected, properties, rows: rows().slice(1) }),
    ).toThrow();
  });
});
