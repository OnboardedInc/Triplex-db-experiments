import { expect, it } from "vitest";
import {
  GiB,
  populationFromArguments,
  populationSettings,
} from "../../../lab/experiments/EXP-DX1/t1/scale-settings.mjs";
import { V3_PLAN_ID } from "../../../lab/bench/lib/phases.ts";
import { refreshVerdictEligibility } from "../../../lab/bench/lib/verdict.ts";
it("binds admission to the actual rung and last explicit driver population in either argument order", () => {
  expect(populationFromArguments([])).toEqual({ subjects: 10000, zeroReaders: false });
  for (const [rung, subjects] of [
    ["10k", 10000],
    ["100k", 100000],
  ] as const)
    expect(populationFromArguments(["--rung", rung, "--zero-readers"])).toEqual({
      subjects,
      zeroReaders: true,
    });
  for (const args of [
    ["--subjects", "1000", "--rung", "100k"],
    ["--rung", "100k", "--subjects", "1000"],
  ])
    expect(populationFromArguments(args).subjects).toBe(1000);
  expect(populationFromArguments(["--subjects", "1000", "--subjects", "10000"]).subjects).toBe(
    10000,
  );
  expect(populationFromArguments(["--rung", "10k", "--rung", "100k"]).subjects).toBe(100000);
  for (const args of [
    ["--rung", "bad"],
    ["--rung", "1k"],
    ["--subjects", "0"],
    ["--subjects"],
    ["--rung"],
  ])
    expect(() => populationFromArguments(args)).toThrow();
});
it("uses one population table and refuses a 100k reader arm in 16 GiB", () => {
  for (const subjects of [1000, 10000]) {
    const p = populationSettings(subjects, Math.floor(15.5 * GiB));
    expect(p.admitted).toBe(true);
    expect(p.env.DX_TX_OBJECT_CACHE).toBe("1280m");
    expect(p.env.DX_PUBLICATION_WAIT_MS).toBe("5000");
    expect(p.env.DX_ID_CACHE_ENTRIES).toBe("2097152");
    expect(p.driverArgs).toEqual([
      "--replica-history-mib",
      "192",
      "--replica-world-cache-mib",
      "32",
    ]);
  }
  expect(populationSettings(100000, Math.floor(15.5 * GiB), false).admitted).toBe(false);
  const small = populationSettings(100000, Math.floor(15.5 * GiB), true);
  expect(small.admitted).toBe(true);
  expect(small.env.DX_GW_READ_MEMORY).toBe("1792m");
  expect(small.env.DX_DRIVER_MEMORY).toBe("8g");
  expect(small.env.DX_DRIVER_HEAP_MB).toBe("4096");
  expect(small.env.DX_PUBLICATION_WAIT_MS).toBe("30000");
  const big = populationSettings(100000, Math.floor(23.5 * GiB));
  expect(big.admitted).toBe(true);
  expect(big.env.DX_TX_OBJECT_CACHE).toBe("2560m");
  expect(big.driverArgs).toContain("384");
  expect(() => populationSettings(100001, 16 * GiB)).toThrow();
});
it("a completed bar table cannot qualify an active, diagnostic, incorrect or oracle-less run", () => {
  const r: any = {
    verdict: { barsOnlyAllMet: true, clock: "ack/1" },
    verdictClock: "ack/1",
    verdictPlanId: V3_PLAN_ID,
    status: "RUNNING",
    config: { profile: "v3", devOverrides: [] },
    oracle: {
      status: "PASS",
      exitCode: 0,
      mismatchCount: 0,
      reads: 1,
      modelCorrectOnSameReads: 1,
      oracleVerdict: "PASS",
      receiptConsistency: "PASS",
    },
    correctness: { reads: 500, correct: 500, errors: 0, violations: 0 },
  };
  refreshVerdictEligibility(r);
  expect(r.verdict.allMet).toBe(false);
  r.status = "DONE";
  refreshVerdictEligibility(r);
  expect(r.verdict.allMet).toBe(true);
  for (const [k, v] of [
    ["config", { ...r.config, devOverrides: ["rate-scale"] }],
    ["oracle", { status: "PASS", exitCode: 1 }],
    ["client", { invalid: true }],
    ["invalidReasons", ["failed"]],
  ]) {
    const c = structuredClone(r);
    c[k as string] = v;
    refreshVerdictEligibility(c);
    expect(c.verdict.allMet).toBe(false);
  }
});
