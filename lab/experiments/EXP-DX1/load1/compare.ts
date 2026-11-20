import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hash } from "../ha1/common.ts";
import { offers, percentile, replayLive, type OfferTape } from "./live-evidence.ts";

const files = process.argv.slice(2);
assert(files.length);
for (const dir of files) {
  const read = (name: string) => {
    const data = fs.readFileSync(path.join(dir, name));
    return { payload: JSON.parse(data.toString("utf8")), digest: hash(data) };
  };
  const a = read("attempt.json"),
    o = read("observations.json"),
    c = read("cleanup.json");
  assert.deepEqual(
    [o.payload.nonce, o.payload.source, o.payload.slot],
    [a.payload.nonce, a.payload.source, a.payload.slot],
  );
  assert.deepEqual(c.payload, { nonce: a.payload.nonce, containers: 0, networks: 0 });
  const arms = o.payload.result.map((arm: any) => {
    assert(/^[a-z0-9-]+$/.test(arm.arm) && arm.rate === o.payload.profile.people);
    const raw = read(arm.arm + ".offers.json");
    replayLive(raw.payload, a.payload, arm);
    return { arm, raw };
  }) as { arm: any; raw: { payload: OfferTape; digest: string } }[];
  const controls = arms.filter((a) => a.arm.arm.endsWith("-0-a") || a.arm.arm.endsWith("-0-b"));
  assert.equal(controls.length, 2);
  const q = (t: OfferTape, actor: string, kind: "read" | "save") =>
    offers(t.samples.filter((s) => s.actor === actor && s.kind === kind));
  const results = arms.map(({ arm, raw }) => {
    const each = Object.keys(arm.neighbors).map((actor) => {
      const measures = (["read", "save"] as const).map((kind) => {
        const control = controls.map((r) => q(r.raw.payload, actor, kind));
        const test = q(raw.payload, actor, kind);
        const ratio = (t: number | null) =>
          t == null || test.p99Ms == null ? null : test.p99Ms / t;
        return { kind, test, control, ratios: control.map((c) => ratio(c.p99Ms)) };
      });
      return { actor, measures };
    });
    const save = each.flatMap((n) => n.measures.filter((r) => r.kind === "save"));
    const reads = each.flatMap((n) => n.measures.filter((r) => r.kind === "read"));
    const maxRatios = (rs: typeof save) =>
      controls.map((_, i) => Math.max(...rs.map((r) => r.ratios[i] ?? 0)));
    const misses = each
      .flatMap((n) => n.measures)
      .reduce((n, { test }) => n + test.offered - test.ok, 0);
    const bulkTimes = raw.payload.ordered.flatMap((r) => (r.service ? [r.service.ms] : []));
    const split = arm.isolated ? readSplit(arm, raw.payload.scope) : null;
    function readSplit(arm: any, scope: string) {
      const bit = read(arm.arm + "-split.offers.json");
      assert.deepEqual(
        [bit.payload.nonce, bit.payload.slot, bit.payload.source, bit.payload.scope],
        [a.payload.nonce, a.payload.slot, a.payload.source.git, scope + "-import"],
      );
      assert.equal(bit.payload.facts, arm.facts);
      assert.equal(bit.payload.issued.length, arm.isolated.proof.observed);
      assert.equal(arm.isolated.proof.cut, arm.isolated.proof.observed + 1);
      assert.equal(
        arm.facts,
        bit.payload.issued
          .filter((r: any) => r.settled <= arm.duration)
          .reduce((n: number, r: any) => n + r.facts, 0),
      );
      return bit.digest;
    }
    return {
      arm: arm.arm,
      fps: arm.fps,
      armFacts: arm.facts,
      misses,
      quiet: each.find((a) => a.actor === "quiet"),
      maxReadRatios: maxRatios(reads),
      maxSaveRatios: maxRatios(save),
      budget: arm.budgetMs ?? null,
      budgetStopped: arm.budgetStopped,
      pilots: arm.pilots,
      aboveBudget: arm.aboveBudget ?? null,
      committedFrames: arm.committedFrames ?? null,
      serialHoldP50: percentile(bulkTimes, 0.5),
      serialHoldP99: percentile(bulkTimes, 0.99),
      allAccounts: each,
      offersSha256: raw.digest,
      splitOffersSha256: split,
    };
  });
  console.log(
    JSON.stringify({
      mode: a.payload.mode,
      attempt: a.payload.nonce,
      slot: a.payload.slot,
      rate: o.payload.profile.people,
      source: a.payload.source,
      observationSha256: o.digest,
      cleanupSha256: c.digest,
      results,
    }),
  );
}
