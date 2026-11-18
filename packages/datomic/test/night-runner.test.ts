import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
  summarizeCpuComparison,
  nightEnvironment,
} from "../../../lab/experiments/EXP-DX1/t1/night.mjs";
import { nativeCounterSummary } from "../../../lab/trace/native-counters.mjs";
import {
  ARM_RETRY_MS,
  HOST_SAMPLE_MS,
  parseProcessTimes,
  processCpuSample,
  topProcessCpu,
  waitForArmHost,
} from "../../../lab/trace/host-admission.mjs";

describe("passive per-arm admission", () => {
  const refused = { eligible: false, issues: ["CPU 26.0%"] };
  const admitted = { eligible: true, issues: [] };
  function clock(results: (typeof refused)[], latest = Infinity) {
    let now = 0;
    const starts: number[] = [],
      logged: (typeof refused)[] = [];
    return {
      starts,
      logged,
      options: {
        checkTime: (at: number) => {
          if (at > latest) throw Error("cutoff");
        },
        onSample: (gate: typeof refused) => logged.push(gate),
        collect: async () => {
          starts.push(now);
          now += HOST_SAMPLE_MS;
          return results.shift() ?? refused;
        },
        pause: async (ms: number) => {
          now += ms;
        },
        wallNow: () => now,
        monoNow: () => now,
      },
    };
  }
  it("settles first, retains every refusal, and takes a fresh passing sample", async () => {
    const f = clock([refused, refused, admitted]);
    const result = await waitForArmHost(f.options);
    expect(f.starts).toEqual([60_000, 120_000, 180_000]);
    expect(f.logged).toEqual([refused, refused, admitted]);
    expect(result).toEqual({ gate: admitted, attempts: 3, reason: null });
  });
  it("bounds repeated refusals and does not start a sample across the nightly cutoff", async () => {
    const f = clock([]);
    expect((await waitForArmHost(f.options)).reason).toContain("20-minute");
    expect(f.starts.at(-1)! + HOST_SAMPLE_MS).toBeLessThanOrEqual(HOST_SAMPLE_MS + ARM_RETRY_MS);
    const cutoff = clock([refused, admitted], 180_000);
    expect((await waitForArmHost(cutoff.options)).reason).toBe("cutoff");
    expect(cutoff.logged).toEqual([refused]);
  });
  it("ranks names by measured CPU time across uneven intervals, without the VM or sampler", () => {
    const raw = (a: string, b: string, c: string, d: string, t: string) =>
      parseProcessTimes(
        `1 ${a} /private/app/Helper Name\n2 ${b} /bin/Helper Name\n3 ${c} /bin/Virtualization\n4 ${d} /bin/node\n5 ${t} /usr/sbin/worker`,
      );
    const a = raw("0:00.00", "0:00.00", "0:00.00", "0:00.00", "0:00.00");
    const b = raw("0:00.10", "0:00.10", "0:08.00", "0:00.05", "0:00.10");
    const c = raw("0:00.20", "0:00.10", "0:18.00", "0:00.08", "0:00.12");
    const samples = [processCpuSample(a, b, 1_000, 4), processCpuSample(b, c, 2_000, 4)];
    expect(samples[0]!.otherCpu).toBe(30);
    expect(topProcessCpu(samples)).toEqual([
      { name: "Helper Name", percent: 10 },
      { name: "worker", percent: 4 },
    ]);
    expect(topProcessCpu([{ otherCpu: 30 }])).toBeNull();
  });
});

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
  it("refuses a real-arm controller before it creates attempt files, before opening or after closing the local window", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxt1-cutoff-")),
      root = new URL("../../../", import.meta.url).pathname;
    try {
      for (const date of ["2020-01-01", "2040-01-01"]) {
        const file = path.join(dir, date + ".json");
        fs.writeFileSync(file, JSON.stringify(nightWindow(0, date)));
        try {
          execFileSync(
            "bash",
            ["lab/experiments/EXP-DX1/h3/attempt.sh", "real", "tx2-dxt1-cutoff-fixture"],
            {
              cwd: root,
              env: { ...process.env, DX_STACK_EVIDENCE: dir, DX_NIGHT_WINDOW: file },
              stdio: "pipe",
            },
          );
          expect.fail("cutoff must refuse");
        } catch (error: any) {
          expect(error.status).toBe(75);
          expect(String(error.stderr)).toContain("Night arm refused");
        }
      }
      expect(fs.existsSync(path.join(dir, "tx2-dxt1-cutoff-fixture"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
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
      tag: prefix,
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
            splitTarget: "pending",
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
        fs.writeFileSync(
          path.join(dir, "driver-container.json"),
          JSON.stringify([{ HostConfig: { CpusetCpus: "3,4,5,6,7" } }]),
        );
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
      const sealFile = path.join(dir, "SHA256SUMS");
      fs.renameSync(sealFile, sealFile + ".away");
      const partial = await summarizePair(root, prefix, night, "Pair 1", 75);
      expect(partial.valid).toBe(false);
      expect(partial.arms.map((arm: any) => [arm.suffix, arm.valid])).toEqual([
        ["off-before", true],
        ["zero", true],
        ["ladder", false],
        ["off-after", true],
      ]);
      const summary = renderNightSummary(night, { bars: [] }, [partial]);
      expect(summary).toContain("Pair 1 zero (arm only)");
      expect(summary).toContain("NS-P2 all-primary p99 ms");
      expect(summary).toContain("INCOMPLETE / UNJUDGED");
      expect(summary).not.toContain("ENOENT");
      fs.renameSync(sealFile + ".away", sealFile);
      const gateFile = path.join(dir, "night-host-gate.json");
      const previousGate = fs.readFileSync(gateFile, "utf8");
      fs.writeFileSync(
        gateFile,
        JSON.stringify({
          ...JSON.parse(previousGate),
          tag: prefix + "-ladder",
          source,
          nightTag: night.tag,
          nightStartedAt: night.startedAt,
        }),
      );
      const zeroDir = path.join(root, prefix + "-zero"),
        input = path.join(dir, "input");
      fs.mkdirSync(input);
      for (const name of ["ns-report.json", "ns-writes.jsonl"])
        fs.copyFileSync(path.join(zeroDir, "driver", name), path.join(input, name));
      seal(dir);
      expect((await summarizePair(root, prefix, night, "pair")).valid).toBe(true);
      fs.appendFileSync(path.join(input, "ns-writes.jsonl"), "\n");
      seal(dir);
      expect((await summarizePair(root, prefix, night, "pair")).reason).toContain(
        "baseline differs",
      );
      fs.writeFileSync(gateFile, previousGate);
      fs.rmSync(input, { recursive: true });
      b.oracle.reads = 0;
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      expect((await summarizePair(root, prefix, night, "pair")).reason).toContain("oracle");
      b.oracle.reads = 5;
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      b.client = { invalid: true };
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      const unqualified = await summarizePair(root, prefix, night, "pair");
      expect(unqualified.valid).toBe(true);
      expect(unqualified.qualified).toBe(false);
      expect(unqualified.qualificationReasons).toContain("invalid or saturated run");
      delete b.client;
      fs.writeFileSync(file, JSON.stringify(b));
      seal(dir);
      expect(
        (await summarizePair(root, prefix, { ...night, startedAt: now }, "pair")).reason,
      ).toContain("stale");
      fs.appendFileSync(file, " ");
      expect((await summarizePair(root, prefix, night, "pair")).reason).toContain("seal differs");
      const cpuPrefix = "tx2-dxt1-cpu-fixture",
        template = path.join(root, prefix + "-zero");
      for (const [i, mode] of ["eight", "six", "eight"].entries())
        for (const loaded of [false, true]) {
          const tag = `${cpuPrefix}-${i + 1}-${mode}-${loaded ? "ladder" : "zero"}`,
            destination = path.join(root, tag);
          fs.cpSync(template, destination, { recursive: true });
          const b = JSON.parse(
            fs.readFileSync(path.join(destination, "driver/ns-report.json"), "utf8"),
          );
          b.config.profile = "smoke";
          b.config.matchDurationS = 900;
          b.config.zeroReaders = !loaded;
          b.verdictPlanId = "legacy-smoke";
          const writes = fs
            .readFileSync(path.join(destination, "driver/ns-writes.jsonl"), "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
          applyCommitVerdicts(
            b,
            writes,
            loaded ? writes : null,
            generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }),
          );
          fs.writeFileSync(path.join(destination, "driver/ns-report.json"), JSON.stringify(b));
          const m = JSON.parse(fs.readFileSync(path.join(destination, "trace-run.json"), "utf8"));
          m.tag = tag;
          m.slot = tag;
          fs.writeFileSync(path.join(destination, "trace-run.json"), JSON.stringify(m));
          fs.writeFileSync(
            path.join(destination, "driver-container.json"),
            JSON.stringify([
              { HostConfig: { CpusetCpus: mode === "six" ? "3,4,5" : "3,4,5,6,7" } },
            ]),
          );
          const packed = gzipSync(
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
          fs.writeFileSync(path.join(destination, "trace/raw/system-host.jsonl.gz"), packed);
          fs.writeFileSync(
            path.join(destination, "trace/SHA256SUMS"),
            createHash("sha256").update(packed).digest("hex") + "  system-host.jsonl.gz\n",
          );
          seal(destination);
        }
      const cpu = await summarizeCpuComparison(root, cpuPrefix, night);
      expect(cpu.map((c) => c.label)).toEqual(["eight 1", "six 2", "eight 3"]);
      expect(cpu[1].at256.count).toBe(0);
      const wrongPlacement = path.join(root, cpuPrefix + "-2-six-ladder");
      fs.writeFileSync(
        path.join(wrongPlacement, "driver-container.json"),
        JSON.stringify([{ HostConfig: { CpusetCpus: "3,4,5,6,7" } }]),
      );
      seal(wrongPlacement);
      await expect(summarizeCpuComparison(root, cpuPrefix, night)).rejects.toThrow(
        "placement differs",
      );
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
