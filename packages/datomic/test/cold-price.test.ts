import { it, expect } from "vitest";
import { gapPrices, adjacentPrices } from "../../../lab/trace/cold-price.mjs";
import { compilerPolicy } from "../../../lab/experiments/EXP-DX1/t1/jvm-policy.mjs";
const row = {
  stream: "background",
  resend: false,
  commandId: "one",
  outcome: "committed",
  expired: false,
  facts: 10,
  attempts: 1,
  idleWarmup: false,
  idleGapMs: 50,
  scheduledAt: 0,
  startedAt: 2,
  ackPublishedAt: 12,
  finishedAt: 13,
  latencyMs: 13,
  transactCalledAt: 3,
  transactReturnedAt: 11,
};
it("prices the ACK without removing scheduler lateness and refuses incomplete or duplicate cohorts", () => {
  const g = gapPrices([row], [50], 1)[0];
  expect(g.ack.p50).toBe(12);
  expect(g.ackService.p50).toBe(10);
  expect(g.finish.p50).toBe(13);
  expect(() => gapPrices([row], [50], 2)).toThrow();
  expect(() => gapPrices([row, row], [50], 2)).toThrow();
  expect(() => gapPrices([{ ...row, ackPublishedAt: undefined }], [50], 1)).toThrow();
});
it("reports gains and bookend drift separately, matched by gap rather than array order", () => {
  const r = (mode: string, value: number) => ({
    mode,
    tag: mode,
    groups: [{ gap: 50, ackService: { p50: value } }],
  });
  const c = adjacentPrices([r("plain", 13), r("threshold", 10), r("plain", 15)])[0].groups[0];
  expect(c.gainMs).toBe(4);
  expect(c.bookendDriftMs).toBe(2);
  expect(() => adjacentPrices([r("threshold", 10)])).toThrow();
});
it("selects the measured policy only for v3 by default, appends once and refuses conflicting flags", () => {
  const env = {
    DX_TX_JAVA_OPTS: "-Xmx3g",
    DX_GW_WRITE_JAVA_OPTS: "-Xmx2g",
    DX_GW_READ_JAVA_OPTS: "-Xmx2g",
  };
  expect(compilerPolicy(env).policy).toBe("default");
  const p = compilerPolicy(env, "v3");
  expect(p.policy).toBe("early");
  expect(p.oneTimeWarmupCommits).toBe(0);
  expect(p.env.DX_TX_JAVA_OPTS).toBe("-Xmx3g -XX:CompileThresholdScaling=0.1");
  expect(compilerPolicy({ ...env, ...p.env }, "v3")).toEqual(p);
  expect(() =>
    compilerPolicy({ ...env, DX_TX_JAVA_OPTS: "-Xmx3g -XX:CompileThresholdScaling=1" }, "v3"),
  ).toThrow();
});
