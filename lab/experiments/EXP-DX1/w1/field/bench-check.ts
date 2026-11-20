import assert from "node:assert/strict";
import { ids } from "../../../../bench/lib/world.ts";
import { accounts, pooledDigest } from "../group/population.ts";
import { offers, quantile, sha } from "./schedule.ts";
export type Study = "pulse" | "rates";
export type Mode = "individual" | "subject" | "all";
export const modes = (s: Study): Mode[] =>
  s === "pulse" ? ["individual", "all"] : ["individual", "subject", "all"];
const all = Array.from({ length: 10 }, (_, i) => i);
const scope = (nonce: string, study: Study) =>
  JSON.stringify([
    "triplex-scope-v1",
    "test",
    study === "pulse" ? "test" : "field",
    nonce + "-load",
    0,
  ]);
export function fieldPlan() {
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
  return plan;
}
export function validateArm(raw: any, mode: Mode, study: Study, nonce: string) {
  assert.equal(raw.nonce, nonce);
  assert.equal(raw.scope, scope(nonce, study));
  assert.equal(raw.db, "s2-" + Buffer.from(raw.scope).toString("base64url"));
  assert.deepEqual(
    raw.seeds.map((r: any) => [r.account, r.subjects, r.facts]),
    all.map((i) => [i, 10000, 1624505]),
  );
  const summary = [],
    baselines = new Map<string, number>();
  if (study === "pulse") {
    assert.deepEqual(
      raw.phases.map((p: any) => p.name),
      ["alone", "nine"],
    );
    assert.equal(raw.grouped, mode === "all");
    assert.equal(raw.phases[0].lastPosition + 1, raw.phases[1].firstPosition);
    for (const p of raw.phases) {
      const rows = p.records as any[],
        probes = rows.filter((r) => r.probe);
      assert.equal(probes.length, 600);
      assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
      assert(p.wall >= 59_900);
      for (const r of rows) {
        const prefix = r.probe ? p.name + "-q-9-" : p.name + "-" + r.account + "-";
        assert(r.id.startsWith(prefix) && r.businessFacts === 8 && r.bytes > 0);
        const i = Number(r.id.slice(prefix.length));
        assert(Number.isInteger(i) && i >= 0 && r.id === prefix + i);
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
        assert(g.length <= 8);
        assert(g.every((r, i) => r.size === g.length && r.pos === g[0].pos + i));
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
      if (mode === "all" && p.name === "nine") assert(p.physical < p.count);
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
      });
    }
  } else {
    const plan = fieldPlan();
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
        assert(g.length <= 8);
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
      });
    }
  }
  return summary;
}
export function validateComparison(result: any, study: Study, source: string, batch: string) {
  assert.equal(result.study, study);
  assert.equal(result.source, source);
  assert.deepEqual(
    result.arms.map((a: any) => a.mode),
    modes(study),
  );
  for (const [i, r] of result.arms.entries()) {
    assert.equal(r.arm.slot, "tx2-dxscale1-w1-" + batch + "-" + (i + 1));
    assert.equal(r.arm.source, source);
    assert.equal(r.scope, scope(r.arm.nonce, study));
    assert.equal(r.db, "s2-" + Buffer.from(r.scope).toString("base64url"));
    assert.equal(r.seed, pooledDigest);
    assert.equal(r.seedFacts, 16_245_050);
    assert(r.phases.every((p: any) => Number.isFinite(p.quietP99Ratio) && p.quietP99Ratio > 0));
    assert.deepEqual(
      r.phases.map((p: any) => p.label ?? p.name),
      study === "pulse" ? ["alone", "nine"] : fieldPlan().map((p) => p.label),
    );
    for (const k of ["rawSha256", "seedReadbackSha256", "predictionSha256"])
      assert.match(r[k], /^[a-f0-9]{64}$/);
    assert.equal(r.predictionSha256, result.predictionSha256);
  }
  assert.equal(new Set(result.arms.map((a: any) => a.db)).size, result.arms.length);
}
