import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { applyCommitVerdicts } from "../../../lab/bench/lib/verdict.ts";
import { generateTrace } from "../../../lab/bench/lib/trace.ts";
import {
  nightWindow,
  checkNightWindow,
} from "../../../lab/experiments/EXP-DX1/t1/night-window.mjs";
import {
  renderNightSummary,
  summarizePair,
  nightEnvironment,
} from "../../../lab/experiments/EXP-DX1/t1/night.mjs";
import { nativeCounterSummary } from "../../../lab/trace/native-counters.mjs";

describe("night window and summaries", () => {
  it("pins kept settings and drops a previous diagnostic's overrides", () => {
    const env = nightEnvironment(
      {
        PATH: "path",
        DX_IDLE_SENTINEL: "1",
        DX_TX_NATIVE_JFR: "1",
        DX_CPUS_TX: "0,1",
        TRIPLEX_DATOMIC_FAST_PATHS: "row",
        DOCKER_CONTEXT: "foreign",
        NODE_OPTIONS: "--inspect",
      },
      "root",
      "window",
    );
    expect(env.PATH).toBe("path");
    expect(env.DX_COMPILER_POLICY).toBe("early");
    expect(env.DX_CPUS_TX).toBe("0");
    for (const key of ["DX_IDLE_SENTINEL", "DX_TX_NATIVE_JFR", "DOCKER_CONTEXT", "NODE_OPTIONS"])
      expect(env[key]).toBeUndefined();
    expect(env.TRIPLEX_DATOMIC_FAST_PATHS).toBe("");
  });
  it("keeps local cutoffs across midnight and daylight-saving changes", () => {
    const w = nightWindow(Date.parse("2026-11-18T01:00:00Z"));
    expect(w.date).toBe("2026-11-17");
    expect(w.startAt).toBe(Date.parse("2026-11-18T00:30:00Z"));
    expect(w.stopStartingAt).toBe(Date.parse("2026-11-18T11:15:00Z"));
    expect(w.endAt).toBe(Date.parse("2026-11-18T11:45:00Z"));
    expect(checkNightWindow(w, w.startAt).allowed).toBe(true);
    expect(() => checkNightWindow(w, w.startAt - 1)).toThrow("19:30");
    expect(() => checkNightWindow(w, w.stopStartingAt)).toThrow("06:15");
    expect(() => checkNightWindow(w, w.stopStartingAt - 1, 31)).toThrow("insufficient");
    expect(() => checkNightWindow({ ...w, endAt: w.endAt + 1000 }, w.startAt)).toThrow(
      "Invalid night window",
    );
    expect(nightWindow(Date.parse("2026-11-18T10:00:00Z")).date).toBe(w.date);
    expect(nightWindow(Date.parse("2026-11-17T15:00:00Z")).date).toBe("2026-11-17");
    expect(nightWindow(0, "2026-10-31").endAt - nightWindow(0, "2026-10-31").startAt).toBe(
      12.25 * 3600000,
    );
    expect(nightWindow(0, "2026-03-07").endAt - nightWindow(0, "2026-03-07").startAt).toBe(
      10.25 * 3600000,
    );
  });
  it("shows absent, sparse and failed bars without promoting a historical estimate", () => {
    const bar = {
      id: "tail",
      bar: "<=50",
      value: 48.2,
      n: 499,
      pass: null,
      interval90: { low: 44, high: 52 },
    };
    const text = renderNightSummary(
      { date: "2026-11-17", source: "source", planId: "ns-v3/2" },
      { bars: [bar] },
      [{ label: "Pair 1", valid: false, reason: "oracle incomplete" }],
    );
    expect(text).toContain("UNJUDGED 48.200; n=499; CI [44,52]");
    expect(text).toContain("INCOMPLETE / UNJUDGED");
    expect(text).not.toContain("MET 48.200");
  });
  it("requires current sealed reports, model reads, matched source and a loaded oracle", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxt1-night-fixture-"));
    const prefix = "tx2-dxt1-fixture",
      source = "a".repeat(40),
      now = Date.now();
    const night = {
      source,
      startedAt: now - 120000,
      endAt: now + 10000,
      offeredSeconds: 5910,
      planId: "ns-v3/2",
      traceDigest: "aa8a7636ff027ab3",
    };
    const seal = (dir: string) => {
      const rows = fs
        .readdirSync(dir, { recursive: true })
        .filter((n) => n !== "SHA256SUMS" && fs.statSync(path.join(dir, String(n))).isFile())
        .map(
          (n) =>
            `${createHash("sha256")
              .update(fs.readFileSync(path.join(dir, String(n))))
              .digest("hex")}  ${n}`,
        );
      fs.writeFileSync(path.join(dir, "SHA256SUMS"), rows.join("\n") + "\n");
    };
    try {
      for (const suffix of ["off-before", "zero", "ladder", "off-after"]) {
        const tag = prefix + "-" + suffix,
          dir = path.join(root, tag),
          loaded = suffix === "ladder",
          off = suffix.startsWith("off-");
        fs.mkdirSync(path.join(dir, "driver"), { recursive: true });
        fs.mkdirSync(path.join(dir, "trace/raw"), { recursive: true });
        const writes = Array.from({ length: 500 }, (_, i) => ({
          seq: i,
          offsetMs: i * 100,
          scheduledAt: i * 100,
          startedAt: i * 100,
          ackPublishedAt: i * 100 + 9,
          finishedAt: i * 100 + 10,
          latencyMs: 10,
          outcome: "committed",
          expired: false,
          stream: "background",
          resend: false,
          facts: 7,
        }));
        const b: any = {
          traceStartAbsMs: 0,
          phases: [],
          status: "DONE",
          seed: { seededSubjects: 10000 },
          config: {
            settleS: 2,
            profile: off ? "smoke" : "v3",
            zeroReaders: !loaded,
            readPath: "replica",
            strictRecordClocks: true,
            matchDurationS: 5910,
          },
          trace: { digest: night.traceDigest },
          verdictPlanId: night.planId,
          verdictClock: "ack/1",
          correctness: { reads: 5, correct: 5, errors: 0, violations: 0 },
          oracle: {
            status: "PASS",
            exitCode: 0,
            mismatchCount: 0,
            reads: 5,
            modelCorrectOnSameReads: 5,
            oracleVerdict: "PASS",
            receiptConsistency: "PASS",
          },
          priorities: {
            P1: { bars: [], ladder: [] },
            P2: { bars: [] },
            P3: { bars: [] },
            P4: { bars: [] },
            P5: { bars: [] },
          },
        };
        applyCommitVerdicts(
          b,
          writes,
          loaded ? writes : null,
          generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }),
        );
        const m = { tag, slot: tag, source, level: off ? "off" : "summary", startedAt: now - 1000 };
        const gate = {
          samplesRaw: Array.from({ length: 60 }, (_, i) => ({
            at: now - 61000 + i * 1000,
            monoMs: i * 1000,
            swapBytes: 4 * 1024 ** 3,
            otherCpu: 10,
            busyApps: [],
          })),
          context: { diskFreeBytes: 30 * 1024 ** 3 },
        };
        fs.writeFileSync(path.join(dir, "night-host-gate.json"), JSON.stringify(gate));
        for (const [name, value] of Object.entries({
          "head.txt": source,
          "source-build-hashes.json": "{}",
          "driver/ns-report.json": JSON.stringify(b),
          "driver/ns-writes.jsonl": writes.map((w) => JSON.stringify(w)).join("\n") + "\n",
          "trace-run.json": JSON.stringify(m),
          "trace-summary.json": JSON.stringify({ source, complete: !off }),
        }))
          fs.writeFileSync(path.join(dir, name), value);
        const resource = gzipSync(
          JSON.stringify({
            process: "system-darwin",
            run: tag,
            slot: tag,
            source,
            at: now,
            otherCpu: 10,
            swap: "used = 4096M",
          }) + "\n",
        );
        fs.writeFileSync(path.join(dir, "trace/raw/system-host.jsonl.gz"), resource);
        fs.writeFileSync(
          path.join(dir, "trace/SHA256SUMS"),
          createHash("sha256").update(resource).digest("hex") + "  system-host.jsonl.gz\n",
        );
        seal(dir);
      }
      expect((await summarizePair(root, prefix, night, "pair")).valid).toBe(true);
      const dir = path.join(root, prefix + "-ladder"),
        file = path.join(dir, "driver/ns-report.json"),
        b = JSON.parse(fs.readFileSync(file, "utf8"));
      b.oracle.reads = 0;
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      expect((await summarizePair(root, prefix, night, "pair")).reason).toContain("oracle");
      b.oracle.reads = 5;
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      expect(
        (await summarizePair(root, prefix, { ...night, startedAt: now }, "pair")).reason,
      ).toContain("stale");
      fs.appendFileSync(file, " ");
      expect((await summarizePair(root, prefix, night, "pair")).reason).toContain("seal differs");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
it("keeps empty native intervals unknown and rejects foreign or malformed adoption observations", () => {
  const m = { tag: "run", slot: "slot", source: "source", startedAt: 1000 };
  const identity = { run: "run", slot: "slot", source: "source", process: "tx", at: 1001 };
  expect(nativeCounterSummary(m, []).objectCache.hitRate).toBeNull();
  const metrics = {
    ...identity,
    type: "metrics",
    counters: {
      objectCache: { requests: 10, hits: 9, misses: 1, hitRate: 0.9 },
      indexAdoptions: { status: "installed", dropped: 0 },
    },
  };
  const adoption = {
    ...identity,
    type: "index-adoption",
    start: 1002,
    end: 1004,
    thread: 2,
    databaseHash: "a".repeat(64),
    indexBasisBefore: 5,
    indexBasisAfter: 10,
    completed: true,
  };
  const result = nativeCounterSummary(m, [metrics, adoption]);
  expect(result.objectCache.hitRate).toBe(0.9);
  expect(result.indexAdoptions.events[0].durationMs).toBe(2);
  expect(() => nativeCounterSummary(m, [{ ...metrics, source: "old" }])).toThrow("Foreign");
  expect(() => nativeCounterSummary(m, [{ ...adoption, start: -1 }])).toThrow("Stale");
  expect(() => nativeCounterSummary(m, [{ ...adoption, end: 1001 }])).toThrow("Invalid");
});
