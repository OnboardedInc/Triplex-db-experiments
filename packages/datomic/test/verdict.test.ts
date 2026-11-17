import { describe, it, expect } from "vitest";
import { verdictEnd, verdictMs } from "../../../lab/trace/instrument.mjs";
import { acknowledgeReceipt } from "../../../lab/bench/lib/acknowledgement.ts";
import {
  commitBar,
  distribution,
  ratioBar,
  requiredBarsMet,
  bootstrap90,
} from "../../../lab/bench/lib/verdict-statistics.ts";
import {
  checkV3Trace,
  assertRequiredPlanCounts,
  checkedIntervals,
  settledPhaseWindow,
  poolRows,
  scheduledV3Windows,
} from "../../../lab/bench/lib/verdict-plan.ts";
import { nsPlan } from "../../../lab/bench/lib/phases.ts";
import { generateTrace, traceDigest } from "../../../lab/bench/lib/trace.ts";
import { applyCommitVerdicts, matchBaseline } from "../../../lab/bench/lib/verdict.ts";
import { evaluateHostGate } from "../../../lab/trace/host-admission.mjs";
import { buildHistoryGrowth } from "../../../lab/bench/lib/commands.ts";
import { Digest } from "../../../lab/bench/lib/rng.ts";
import {
  accountsFor,
  ownFacts,
  sharedFacts,
  memberOf,
  versioned,
  VERSIONED,
} from "../../../lab/bench/lib/world.ts";

const row = (seq = 1, offsetMs = 0) => ({
  seq,
  offsetMs,
  stream: "background",
  resend: false,
  burst: false,
  outcome: "committed",
  expired: false,
  scheduledAt: offsetMs,
  startedAt: offsetMs + 5,
  finishedAt: offsetMs + 15.4,
  latencyMs: 15.4,
  ackPublishedAt: offsetMs + 15,
});

describe("receipt-to-caller verdict", () => {
  it("uses the ACK with the original offer lateness, including off records with no offer stamp", () => {
    expect(verdictEnd(row())).toBe(15);
    expect(verdictMs(row())).toBe(15);
    for (const update of [
      { ackPublishedAt: undefined },
      { ackPublishedAt: 4 },
      { ackPublishedAt: 16 },
      { latencyMs: 1 },
      { expired: true },
      { verdictClock: "finish/2" },
      { verdictMs: 14 },
    ])
      expect(() => verdictMs({ ...row(), ...update })).toThrow();
  });
  it("stops the clock after the final lost-ACK retry/resolve and before bookkeeping", async () => {
    for (const lost of [false, true]) {
      const calls: string[] = [],
        receipt = { position: 3 };
      const writer = {
        transact: async () => {
          calls.push("transact");
          return receipt;
        },
      };
      const received = await writer.transact();
      const result = await acknowledgeReceipt(received, {
        reconcileLostAck: lost
          ? async () => {
              calls.push("retry");
              await Promise.resolve();
              calls.push("resolve");
            }
          : undefined,
        updateSubject: () => {
          calls.push("subject");
        },
        stamp: () => {
          calls.push("ack");
          return 15;
        },
      });
      calls.push("bookkeeping");
      expect(result.receipt).toBe(receipt);
      expect(result.ackAt).toBe(15);
      expect(calls).toEqual(
        lost
          ? ["transact", "retry", "resolve", "subject", "ack", "bookkeeping"]
          : ["transact", "subject", "ack", "bookkeeping"],
      );
    }
    let stamped = false;
    await expect(
      acknowledgeReceipt(
        {},
        {
          reconcileLostAck: async () => {
            throw Error("unresolved");
          },
          updateSubject: () => {},
          stamp: () => {
            stamped = true;
            return 1;
          },
        },
      ),
    ).rejects.toThrow("unresolved");
    expect(stamped).toBe(false);
  });
  it("refuses sparse bars, mixed clocks, and a null roll-up", () => {
    const sparse = commitBar("small", Array(499).fill(5), 0.99, 50, "ack/1");
    expect(sparse.pass).toBeNull();
    expect(sparse.n).toBe(499);
    expect(requiredBarsMet([sparse])).toBe(false);
    expect(requiredBarsMet([])).toBe(false);
    const complete = commitBar("enough", Array(500).fill(5), 0.99, 50, "ack/1");
    expect(complete.pass).toBe(true);
    expect(complete.interval90?.low).toBe(5);
    expect(complete.interval90?.high).toBe(5);
    expect(
      ratioBar(
        "ratio",
        distribution(Array(500).fill(10), "ack/1"),
        distribution(Array(499).fill(10), "ack/1"),
        1.25,
      ).pass,
    ).toBeNull();
    expect(() =>
      ratioBar("mixed", distribution([1], "ack/1"), distribution([1], "finish/2"), 2),
    ).toThrow("Mixed");
  });
  it("reports a deterministic bootstrap interval without changing the point estimator", () => {
    const d = distribution(
      Array.from({ length: 800 }, (_, i) => (i < 790 ? 10 : 60 + (i % 3))),
      "ack/1",
    );
    const a = bootstrap90(d, 0.99, "tail"),
      b = bootstrap90(d, 0.99, "tail");
    expect(a).toEqual(b);
    expect(a!.low).toBeGreaterThanOrEqual(10);
    expect(a!.high).toBeLessThanOrEqual(62);
    expect(a!.high).toBeGreaterThan(a!.low);
  });
  it("leaves exactly the maximum out even at cohort sizes with inexact rank fractions", () => {
    const n = 33012,
      values = Array.from({ length: n }, (_, i) => i);
    const bar = ratioBar(
      "rank-regression",
      distribution(values, "ack/1", "exact"),
      distribution(Array(500).fill(1), "ack/1", "exact"),
      1e6,
    );
    expect(bar.leaveSlowestOut.numerator.value).toBe(Math.ceil(0.99 * (n - 1)) - 1);
  });
  it("invalidates only baseline windows containing expired or absent commands", () => {
    const expected = [
      { seq: 1, atMs: 10 },
      { seq: 2, atMs: 110 },
    ];
    const baseline = [{ ...row(1, 10), outcome: "unaccounted", expired: true }, row(2, 110)];
    expect(matchBaseline(baseline, [{ from: 0, to: 100 }], expected, 200, "ack").invalid).toContain(
      "expired",
    );
    expect(
      matchBaseline(baseline, [{ from: 100, to: 200 }], expected, 200, "ack").invalid,
    ).toBeNull();
    expect(matchBaseline([], [{ from: 100, to: 200 }], expected, 200, "ack").invalid).toContain(
      "missing",
    );
  });
  it("leaves a sweep that finishes before settle unjudged without relaxing interval guards", () => {
    const empty = settledPhaseWindow(640223.368, 641565.323, 2000);
    expect(empty.invalid).toContain("settled observation");
    expect(empty.from).toBeGreaterThan(empty.to);
    expect(() => checkedIntervals([empty])).toThrow("Invalid");
    expect(settledPhaseWindow(10, 12, 2).invalid).not.toBeNull();
    expect(settledPhaseWindow(10, 30, 2)).toEqual({ from: 12, to: 30, invalid: null });
    expect(() => settledPhaseWindow(30, 10, 2)).toThrow("Invalid phase");
    expect(() => settledPhaseWindow(10, 30, -2)).toThrow("Invalid phase");
  });
  it("never rescales expired or missing expiration metadata into a clean publication result", () => {
    const report = () => ({
      config: { profile: "smoke", settleS: 2 },
      phases: [],
      traceStartAbsMs: 0,
      priorities: {
        P1: { bars: [], ladder: [] },
        P2: { bars: [] },
        P3: { bars: [] },
        P4: { bars: [] },
        P5: { bars: [] },
      },
    });
    for (const [expiration, expected] of [
      [false, true],
      [true, false],
      [undefined, null],
    ] as const) {
      const r: any = report(),
        writes = Array.from({ length: 500 }, (_, i) => ({
          ...row(i, i * 1000),
          facts: 7,
          expired: i === 0 ? expiration : false,
        }));
      applyCommitVerdicts(r, writes, null, []);
      expect(
        r.priorities.P2.bars.find((b: any) => b.id === "NS-P2 no expired primary commands").pass,
      ).toBe(expected);
    }
  });
  it("uses a recorded read count and preserves an unknown one when the histogram is absent", () => {
    for (const count of [12345, undefined]) {
      const r: any = {
        config: { profile: "smoke", settleS: 2 },
        traceStartAbsMs: 0,
        phases: [{ name: "p4mix", stats: { buckets: { "bucket:large": { count } } } }],
        priorities: {
          P1: { bars: [], ladder: [] },
          P2: { bars: [] },
          P3: { bars: [] },
          P5: { bars: [] },
          P4: {
            bars: [
              {
                id: "NS-P4 largest bucket p99 ms (provisional)",
                value: 1,
                bar: "<= 50",
                pass: true,
              },
            ],
          },
        },
      };
      applyCommitVerdicts(
        r,
        Array.from({ length: 500 }, (_, i) => ({ ...row(i, i * 1000), facts: 7 })),
        null,
        [],
      );
      const b = r.priorities.P4.bars[0];
      expect(b.n).toBe(count ?? null);
      expect(b.interval90).toBeNull();
      expect(b.intervalUnavailable).toContain("no complete histogram");
      expect(b.sampleUnit).toBe("correct observations");
    }
  });
});

it("strict passive host admission refuses missing counters, swapping, apps, disk and recent clock steps", () => {
  const samples = Array.from({ length: 60 }, (_, i) => ({
    monoMs: i * 1000,
    swapBytes: 4 * 1024 ** 3,
    otherCpu: 10,
    freeInactiveBytes: 3 * 1024 ** 3,
    compressions: 0,
    swapouts: 0,
    pressure: 1,
    load1: 8,
    busyApps: [],
    audioCpu: 0,
    maintenanceCpu: 0,
  }));
  const context = {
    diskFreeBytes: 30 * 1024 ** 3,
    acPower: true,
    lowPowerOff: true,
    thermalNormal: true,
    clockLogObserved: true,
    recentGuestClockSteps: 0,
  };
  expect(evaluateHostGate(samples, context).eligible).toBe(true);
  for (const changed of [
    { diskFreeBytes: 19 * 1024 ** 3 },
    { recentGuestClockSteps: 1 },
    { clockLogObserved: false },
    { acPower: false },
  ])
    expect(evaluateHostGate(samples, { ...context, ...changed }).eligible).toBe(false);
  for (const changed of [
    { swapouts: 1 },
    { compressions: 10000 },
    { busyApps: ["Chrome"] },
    { error: "missing" },
    { otherCpu: 60 },
  ])
    expect(
      evaluateHostGate(
        samples.map((s, i) => ({ ...s, ...(i > 20 ? changed : {}) })),
        context,
      ).eligible,
    ).toBe(false);
  expect(evaluateHostGate([], context).eligible).toBe(false);
});

describe("frozen v3 plan", () => {
  const events = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 });
  it("refuses native admission for the specified plan's sparse required recovery windows", () => {
    const plan = checkV3Trace(events);
    expect(() => assertRequiredPlanCounts({ ...plan, unjudged: [] })).toThrow("recovery");
    expect(() =>
      assertRequiredPlanCounts({
        ...plan,
        counts: {
          ...plan.counts,
          recovery: plan.counts.recovery.map((r) => ({ ...r, total: 500 })),
        },
      }),
    ).not.toThrow();
  });
  it("retains the prefix, rate, stress cycles and exact phase offsets", () => {
    const plan = nsPlan("v3"),
      check = checkV3Trace(events);
    expect(traceDigest(events)).toBe("aa8a7636ff027ab3");
    expect(plan.filter((p) => p.pool === "L256").map((p) => [p.traceFromS, p.seconds])).toEqual([
      [240, 480],
      [840, 480],
      [1440, 480],
      [2040, 480],
    ]);
    expect(plan.filter((p) => p.pool === "L1024")).toHaveLength(16);
    expect(plan.filter((p) => p.pool === "recovery")).toHaveLength(16);
    expect(plan.find((p) => p.name === "hold-9")!.traceFromS! + 120).toBe(5040);
    expect(check.counts.L256).toEqual({
      total: 2149,
      bands: { "5-10": 1261, "11-25": 682, "26-50": 206 },
    });
    expect(check.counts.L1024.total).toBe(740);
    expect(check.counts.recovery.map((r) => r.total)).toEqual([497, 497, 487, 486, 474, 489, 482]);
    expect(check.complete500Coverage).toBe(false);
    expect(check.unjudged).toHaveLength(8);
    expect(JSON.stringify(events.filter((e) => e.atMs < 900000))).toBe(
      JSON.stringify(
        generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 900 }).filter(
          (e) => e.atMs < 900000,
        ),
      ),
    );
  });
  it("pools by concatenation, rejecting overlap, duplicates and bursts", () => {
    const ws = [
        { from: 0, to: 100 },
        { from: 200, to: 300 },
      ],
      rows = [row(1, 1), row(2, 201), row(3, 101)];
    expect(poolRows(rows, ws)).toEqual([rows[0], rows[1]]);
    expect(poolRows(rows, [ws[0]])).toEqual([rows[0]]);
    expect(() =>
      checkedIntervals([
        { from: 0, to: 200 },
        { from: 100, to: 300 },
      ]),
    ).toThrow();
    expect(() => poolRows([row(), row()], ws)).toThrow("Duplicate");
    expect(() => poolRows([{ ...row(), burst: true }], ws)).toThrow("Burst");
    expect(scheduledV3Windows().L256).toHaveLength(4);
    expect(() => checkV3Trace(events.slice(1))).toThrow("frozen");
  });
});

it("four-subject history grouping preserves each versioned world and the exact growth workload", () => {
  const simulate = (batch: number) => {
    const ids = new Map<number, string[]>(
      Array.from({ length: 1000 }, (_, i) => [i, versioned(i, 0).map((_, n) => `${i}:0:${n}`)]),
    );
    const world = new Map<string, ReturnType<typeof versioned>[number]>(
      Array.from({ length: 1000 }, (_, i) =>
        versioned(i, 0).map((f, n) => [`${i}:0:${n}`, f] as const),
      ).flat(),
    );
    const staticFacts = [
      ...Array.from({ length: 1000 }, (_, i) =>
        ownFacts(i, accountsFor(1000)).filter((f) => !VERSIONED.includes(f.a as any)),
      ).flat(),
      ...Array.from({ length: accountsFor(1000) }, (_, i) => sharedFacts(i)).flat(),
    ];
    staticFacts.forEach((f, i) => world.set(`static:${i}`, f));
    const depths: Record<number, string> = {},
      counts: { commands: number; assertions: number }[] = [];
    let prior = 0;
    for (const depth of [1, 3, 10]) {
      let commands = 0,
        assertions = 0;
      for (let v = prior + 1; v < depth; v++)
        for (let k = 0; k < 1000; k += batch) {
          const subjects = Array.from({ length: Math.min(batch, 1000 - k) }, (_, n) => k + n);
          const c = buildHistoryGrowth({
            runTag: "proof",
            label: `${v}.${k}`,
            subjects,
            version: v,
            ids,
          });
          commands++;
          assertions += c.operations.filter((o) => o.op === "assert").length;
          const receipt = new Map<string, string>();
          for (const [ordinal, op] of c.operations.entries()) {
            if (op.op === "retract") expect(world.delete(op.id)).toBe(true);
            else {
              const id = `${v}:${k}:${ordinal}`;
              world.set(id, { e: op.entityId, a: op.attribute, v: op.value });
              receipt.set(`${op.entityId}|${op.attribute}`, id);
            }
          }
          for (const s of c.perSubject)
            ids.set(
              s.subject,
              s.added.map((f) => receipt.get(`${f.e}|${f.a}`)!),
            );
        }
      const digest = new Digest();
      for (const f of world.values()) digest.add(memberOf(f.e, f.a, f.v));
      const expected = new Digest();
      for (const f of staticFacts) expected.add(memberOf(f.e, f.a, f.v));
      for (let i = 0; i < 1000; i++)
        for (const f of versioned(i, depth - 1)) expected.add(memberOf(f.e, f.a, f.v));
      expect(digest.hex()).toBe(expected.hex());
      depths[depth] = digest.hex();
      counts.push({ commands, assertions });
      prior = depth - 1;
    }
    return { depths, counts };
  };
  const small = simulate(4),
    large = simulate(500);
  expect(small.depths).toEqual(large.depths);
  expect(small.counts).toEqual([
    { commands: 0, assertions: 0 },
    { commands: 500, assertions: 4000 },
    { commands: 1750, assertions: 14000 },
  ]);
  expect(large.counts).toEqual([
    { commands: 0, assertions: 0 },
    { commands: 4, assertions: 4000 },
    { commands: 14, assertions: 14000 },
  ]);
}, 20000);
