import assert from "node:assert/strict";
import { ids } from "../../../../bench/lib/world.ts";
import { accounts, pooledDigest } from "../group/population.ts";
import { offers, quantile, sha } from "./schedule.ts";
export type Study = "pulse" | "rates";
export type Mode =
  | "individual"
  | "subject"
  | "all"
  | "compact"
  | "prepared"
  | "bounded"
  | "indexed"
  | "ledger"
  | "packed"
  | "reply-wire";
export function modes(s: Study, enhanced = false, write5 = false): Mode[] {
  const original: Mode[] = s === "pulse" ? ["individual", "all"] : ["individual", "subject", "all"];
  if (write5)
    return [
      ...original,
      "compact",
      "prepared",
      "bounded",
      "indexed",
      "ledger",
      "packed",
      "reply-wire",
    ];
  return enhanced ? [...original, "compact", "prepared", "bounded"] : original;
}
export function fieldPolicy(mode: Mode, enhanced = false) {
  const predecessor = ["indexed", "ledger", "packed", "reply-wire"].includes(mode),
    advanced = mode === "prepared" || mode === "bounded" || predecessor;
  return {
    grouping: mode !== "individual" && mode !== "subject",
    priority: mode !== "individual",
    subjectOnly: mode === "subject",
    compact: mode === "compact" || advanced,
    prepared: advanced,
    maxMembers: advanced ? 32 : 8,
    budgetMicros: mode === "bounded" ? 8000 : null,
    stageClock: enhanced,
    predecessor,
    ledger: mode === "ledger" || mode === "packed" || mode === "reply-wire",
    packedJournal: mode === "packed",
    fastReplyAndWire: mode === "reply-wire",
  };
}
const all = Array.from({ length: 10 }, (_, i) => i);
const scope = (nonce: string, study: Study) =>
  JSON.stringify([
    "triplex-scope-v1",
    "test",
    study === "pulse" ? "test" : "field",
    nonce + "-load",
    0,
  ]);
export function fieldPlan(enhanced = false) {
  const plan = [];
  for (const rate of [3.5, 4.9, 23.5, 39.4]) {
    const tag = String(Math.round(rate * 10));
    plan.push({ label: "solo" + tag, schedule: offers(rate, 60, [9]), baseline: "solo" + tag });
    plan.push({ label: "ten" + tag, schedule: offers(rate, 60, all), baseline: "solo" + tag });
    if (rate > 5)
      plan.push({
        label: "nine" + tag,
        schedule: [...offers(rate, 60, all.slice(0, 9)), ...offers(3.5, 60, [9])].sort(
          (a, b) => a.ms - b.ms || a.account - b.account,
        ),
        baseline: "solo35",
      });
  }
  if (enhanced)
    for (const rate of [50, 100, 235]) {
      const background = rate * 60 - 210;
      plan.push({
        label: "budget" + rate,
        schedule: [
          ...all
            .slice(0, 9)
            .flatMap((account) =>
              offers(Math.floor((background + 8 - account) / 9) / 60, 60, [account]),
            ),
          ...offers(3.5, 60, [9]),
        ].sort((a, b) => a.ms - b.ms || a.account - b.account),
        baseline: "solo35",
      });
    }
  return plan;
}
function confirmBudget(g: { bytes: number; ops: number }[], budget: number | null) {
  if (budget === null) return;
  const estimate = g.reduce(
    (n, r) => n + 1100 + 45 * r.ops + Math.ceil((70 * r.bytes) / 1024),
    2400,
  );
  assert(estimate <= budget);
}
function measuredStages(batches: Map<string, any[]>, logical: number) {
  let native = 0;
  const stages: Record<string, number> = {};
  for (const members of batches.values()) {
    const first = members[0]!;
    assert(Number.isFinite(first.nativeComputeMs) && first.nativeComputeMs >= 0);
    native += first.nativeComputeMs;
    if (members.length > 1) {
      const s = first.groupStages;
      assert(s && Number.isInteger(s.reused) && s.reused >= 0 && s.reused <= members.length);
      for (const k of [
        "evaluateMicros",
        "prepareMicros",
        "speculativeMicros",
        "materializeMicros",
        "awaitMicros",
        "reused",
      ]) {
        assert(Number.isFinite(s[k]) && s[k] >= 0);
        stages[k] = (stages[k] ?? 0) + s[k];
      }
    }
  }
  return { nativeMsPerSave: native / logical, groupStageTotals: stages };
}
export function validateArm(raw: any, mode: Mode, study: Study, nonce: string, enhanced = false) {
  assert.equal(raw.nonce, nonce);
  assert.equal(raw.scope, scope(nonce, study));
  assert.equal(raw.db, "s2-" + Buffer.from(raw.scope).toString("base64url"));
  assert.deepEqual(
    raw.seeds.map((r: any) => [r.account, r.subjects, r.facts]),
    all.map((i) => [i, 10000, 1624505]),
  );
  const summary = [],
    baselines = new Map<string, number>(),
    policy = fieldPolicy(mode, enhanced);
  if (study === "pulse") {
    assert.deepEqual(
      raw.phases.map((p: any) => p.name),
      ["alone", "nine"],
    );
    assert.equal(raw.grouped, policy.grouping);
    assert.equal(raw.phases[0].lastPosition + 1, raw.phases[1].firstPosition);
    for (const p of raw.phases) {
      const rows = p.records as any[],
        probes = rows.filter((r) => r.probe);
      assert.equal(probes.length, 600);
      assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
      assert(p.wall >= 59_900);
      for (const r of rows) {
        const prefix = r.probe ? p.name + "-q-9-" : p.name + "-" + r.account + "-";
        assert(r.id.startsWith(prefix) && r.bytes > 0);
        const i = Number(r.id.slice(prefix.length));
        assert(Number.isInteger(i) && i >= 0 && r.id === prefix + i);
        assert.equal(r.businessFacts, enhanced ? 1 + (i % 3) : 8);
        assert.equal(r.subject, ids.placement(accounts[r.account]!.first + (i % 10000)));
        if (r.probe) {
          assert.equal(r.account, 9);
          assert(i < 600 && Math.abs(r.started + r.elapsed - r.scheduled - i * 100) < 0.001);
        } else assert(r.account < 9 && r.started < 60_010);
      }
      assert.equal(p.count, rows.length);
      assert.deepEqual(
        [...new Set(rows.map((r) => r.account))].sort((a, b) => a - b),
        p.name === "alone" ? [9] : all,
      );
      const byNative = new Map<string, any[]>();
      const ordered = [...rows].sort((a, b) => a.pos - b.pos);
      assert.equal(p.lastPosition, p.firstPosition + rows.length - 1);
      for (const [i, r] of ordered.entries()) {
        assert.equal(r.pos, p.firstPosition + i);
        assert(Number.isFinite(r.clock) && (!i || ordered[i - 1].clock < r.clock));
        assert(r.queue >= 0 && r.elapsed > 0 && Number(r.t) > 0);
        const g = byNative.get(r.t) ?? [];
        g.push(r);
        byNative.set(r.t, g);
      }
      assert.equal(p.physical, byNative.size);
      for (const g of byNative.values()) {
        assert(g.length <= policy.maxMembers);
        assert(g.every((r, i) => r.size === g.length && r.pos === g[0].pos + i));
        confirmBudget(g, policy.budgetMicros);
      }
      for (const account of new Set(rows.map((r) => r.account))) {
        const owned = rows.filter((r) => r.account === account);
        assert.equal(p.byAccount[account].count, owned.length);
        const expected = owned.map((r) => r.scheduled);
        assert.equal(p.byAccount[account].commitMs.p50, quantile(expected, 0.5));
        assert.equal(p.byAccount[account].commitMs.p99, quantile(expected, 0.99));
      }
      assert.equal(p.throughput, (1000 * rows.length) / p.wall);
      if (mode === "individual") assert.equal(p.physical, p.count);
      if (policy.grouping && policy.budgetMicros === null && p.name === "nine")
        assert(p.physical < p.count);
      const p99 = quantile(
        probes.map((r) => r.scheduled),
        0.99,
      );
      assert.equal(p99, p.quietMs.p99);
      const { records, ...body } = p;
      summary.push({
        ...body,
        quietP99Ratio: p99 / raw.phases[0].quietMs.p99,
        nativePerSecond: (1000 * p.physical) / p.wall,
        rowsSha256: sha(records),
        ...(enhanced ? measuredStages(byNative, rows.length) : {}),
      });
    }
  } else {
    const plan = fieldPlan(enhanced);
    assert.deepEqual(
      raw.phases.map((p: any) => p.label),
      plan.map((p) => p.label),
    );
    for (const [i, p] of raw.phases.entries()) {
      const expected = plan[i]!,
        rs = p.rows as any[],
        byId = new Map(rs.map((r) => [r.id, r]));
      assert.deepEqual(p.failures, []);
      assert.equal(p.offered, expected.schedule.length);
      assert.deepEqual(p.readback, { journalEntries: p.offered, fields: p.offered });
      assert.equal(byId.size, p.offered);
      if (i) assert.equal(p.headBefore, raw.phases[i - 1].headBefore + raw.phases[i - 1].offered);
      assert.equal(p.scheduleSha256, sha(expected.schedule));
      for (const e of expected.schedule) {
        const r = byId.get(p.label + "-" + e.account + "-" + e.person + "-" + e.ordinal);
        assert(r && r.account === e.account && r.person === e.person && r.due === e.ms);
      }
      const byT = new Map<string, any[]>();
      const ordered = [...rs].sort((a, b) => a.p - b.p);
      ordered.forEach((r, i) => {
        assert.equal(r.p, p.headBefore + i + 1);
        assert(Number.isFinite(r.clock) && (!i || ordered[i - 1].clock < r.clock));
        assert(r.bytes > 0 && r.ops > 0 && r.awaitMs >= 0 && Number(r.t) > 0);
        assert(r.due <= r.hand && r.hand < r.end);
        const g = byT.get(r.t) ?? [];
        g.push(r);
        byT.set(r.t, g);
      });
      let same = 0;
      for (const g of byT.values()) {
        assert(g.length <= policy.maxMembers);
        confirmBudget(g, policy.budgetMicros);
        assert(g.every((r, i) => r.p === g[0].p + i && r.size === g.length));
        same += g.length - new Set(g.map((r) => r.account + "/" + r.person)).size;
      }
      assert.equal(same, p.counts.sameSubjectShared);
      assert.equal(byT.size, p.counts.native);
      if (mode === "individual") assert.equal(byT.size, p.offered);
      if (mode === "subject") assert.equal(p.offered - byT.size, same);
      for (const account of new Set(rs.map((r) => r.account))) {
        const own = rs.filter((r) => r.account === account);
        assert.equal(p.byAccount[account].acked, own.length);
        assert.equal(
          p.byAccount[account].p50Ms,
          quantile(
            own.map((r) => r.end - r.due),
            0.5,
          ),
        );
        assert.equal(
          p.byAccount[account].p99Ms,
          quantile(
            own.map((r) => r.end - r.due),
            0.99,
          ),
        );
      }
      assert.equal(p.counts.logical, p.offered);
      assert.equal(p.perSecond, (1000 * p.offered) / p.wall);
      const sentinel = p.byAccount[9].p99Ms;
      if (p.label === expected.baseline) baselines.set(p.label, sentinel);
      const { rows, ...body } = p;
      summary.push({
        ...body,
        rowsSha256: sha(rows),
        nativePerSecond: (1000 * byT.size) / p.wall,
        quietP99Ratio: sentinel / baselines.get(expected.baseline)!,
        queueP99: quantile(
          rs.map((r) => r.gatewayQueueMs + r.nativeEntryMs),
          0.99,
        ),
        prepareP99: quantile(
          rs.map((r) => r.prepareMs),
          0.99,
        ),
        payloadBytes: rs.reduce((n, r) => n + r.bytes, 0),
        sameSubjectPercent: (100 * same) / p.offered,
        ...(enhanced ? measuredStages(byT, p.offered) : {}),
      });
    }
  }
  return summary;
}
export function validateComparison(
  result: any,
  study: Study,
  source: string,
  batch: string,
  enhanced = false,
  write5 = false,
) {
  assert.equal(result.study, study);
  assert.equal(result.source, source);
  assert.equal(result.enhanced ?? false, enhanced);
  assert.equal(result.write5 ?? false, write5);
  assert.deepEqual(
    result.arms.map((a: any) => a.mode),
    modes(study, enhanced, write5),
  );
  for (const [i, r] of result.arms.entries()) {
    assert.equal(r.arm.slot, "tx2-dxscale1-w1-" + batch + "-" + (i + 1));
    assert.equal(r.arm.source, source);
    assert.equal(r.scope, scope(r.arm.nonce, study));
    assert.equal(r.db, "s2-" + Buffer.from(r.scope).toString("base64url"));
    assert.equal(r.seed, pooledDigest);
    assert.equal(r.seedFacts, 16_245_050);
    if (enhanced) assert.deepEqual(r.policy, fieldPolicy(r.mode, true));
    if (write5) assert.match(r.writeOptionsSha256, /^[a-f0-9]{64}$/);
    assert(r.phases.every((p: any) => Number.isFinite(p.quietP99Ratio) && p.quietP99Ratio > 0));
    assert.deepEqual(
      r.phases.map((p: any) => p.label ?? p.name),
      study === "pulse" ? ["alone", "nine"] : fieldPlan(enhanced).map((p) => p.label),
    );
    for (const k of ["rawSha256", "seedReadbackSha256", "predictionSha256"])
      assert.match(r[k], /^[a-f0-9]{64}$/);
    assert.equal(r.predictionSha256, result.predictionSha256);
  }
  assert.equal(new Set(result.arms.map((a: any) => a.db)).size, result.arms.length);
}
