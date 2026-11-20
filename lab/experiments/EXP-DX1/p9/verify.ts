import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { hash, type Evidence } from "../ha1/common.ts";
import { recountTraffic } from "../hasync1/offers.ts";
import { pooledRead, type PooledProof } from "../hasync1/pooled.ts";
import { lsn } from "../hasync1/supervisor.ts";
import type { Receipt } from "../ha1/one-db.ts";
import type { AckAudit } from "./ack-audit.ts";
import { decodeSeed } from "./seed.ts";
import type { CampaignSeal, Identity, Metrics } from "./score.ts";

export const priorityModes = ["hasync-ack", "hasync-move"] as const;
export const priorityOfferWindowMs = 600000;
type ReadArchive = { has(name: string): boolean; raw(name: string): string };
type StageEvent = {
  nonce: string;
  ms: number;
  type: string;
  data: { at: number; data: Record<string, unknown> };
};

export function verifyPriority9(
  archive: ReadArchive,
  identity: Identity,
  campaign: string,
  seal: string,
  attempts: CampaignSeal["attempts"],
): CampaignSeal {
  const parse = (name: string) => JSON.parse(archive.raw(name));
  const declared = parse("campaign.json");
  assert.deepEqual(declared.p9, identity);
  assert.equal(declared.campaign, campaign);
  const { checkpoint: cp } = decodeSeed(
    archive.raw("p9-seed.json"),
    identity.seedSha256,
    identity.age,
    identity.sha,
  );
  const database = "s2-" + Buffer.from(cp.scope).toString("base64url");
  const pool: PooledProof = {
    people: cp.people,
    facts: cp.facts,
    basis: cp.basis,
    receipts: cp.receipts,
    database,
  };
  const metrics: Metrics = {
    lost: null,
    acknowledged: 0,
    resumeMs: null,
    unavailableReadOffers: null,
    readOffers: 0,
    longestReadGapMs: null,
    readCoverage: false,
    moveMs: null,
  };
  assert(attempts.fault !== attempts.move);
  for (const [i, kind] of (["fault", "move"] as const).entries()) {
    const nonce = attempts[kind];
    assert.match(nonce, /^[0-9a-f-]{36}$/);
    const mode = priorityModes[i]!;
    const base = mode + "-" + nonce + "/";
    const attempt = parse(base + "attempt.json") as {
      nonce: string;
      mode: string;
      slot: string;
      source: Evidence["source"];
    };
    assert.deepEqual(
      [attempt.nonce, attempt.mode, attempt.slot, attempt.source.git],
      [nonce, mode, identity.tag, identity.sha],
    );
    const bind = { nonce, slot: identity.tag, source: attempt.source, database };
    const check = (v: Record<string, unknown>) =>
      assert.deepEqual(
        [v["nonce"], v["slot"], v["source"], v["database"]],
        [nonce, identity.tag, attempt.source, database],
      );
    assert.deepEqual(parse(base + "cleanup.json"), { nonce, containers: 0, networks: 0 });
    if (!archive.has(base + "traffic-field-timing.json")) continue;
    const timing = parse(base + "traffic-field-timing.json");
    assert.equal(timing.raw, "traffic-field.jsonl");
    assert.equal(timing.plan.horizonMs, priorityOfferWindowMs);
    const raw = archive.raw(base + timing.raw);
    const available = recountTraffic(raw, timing, bind);
    const stream = raw
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    const start = available.marks.fault;
    assert(typeof start === "number");
    if (kind === "fault" && archive.has(base + "ack-audit.json")) {
      const audit = parse(base + "ack-audit.json") as AckAudit;
      check(audit);
      const acknowledged = new Map(
        audit.rows.map((row) => [row.expected.operationId, row.expected]),
      );
      assert.equal(acknowledged.size, audit.rows.length);
      const live = stream
        .filter((row) => row.stage === "outcome" && row.data.kind === "save" && row.data.receipt)
        .map((row) => row.data.receipt as Receipt);
      for (const receipt of [...cp.receipts, ...live])
        assert.deepEqual(acknowledged.get(receipt.operationId), receipt);
      metrics.acknowledged = acknowledged.size;
      metrics.lost = audit.rows.filter(
        (row) => !isDeepStrictEqual(row.observed, row.expected),
      ).length;
      assert(metrics.acknowledged > cp.receipts.length);
    }
    if (!archive.has(base + "observations.json")) continue;
    const obs = parse(base + "observations.json");
    assert.deepEqual([obs.nonce, obs.slot, obs.source], [nonce, identity.tag, attempt.source]);
    assert.deepEqual(obs.profile, {
      people: cp.people,
      scopes: 1,
      capacity: identity.layout,
      pooled: true,
    });
    assert.deepEqual(obs.result.population, cp);
    const events: StageEvent[] = archive
      .raw(base + "events.jsonl")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert(events.every((event) => event.nonce === nonce));
    const stage = (name: string) => {
      const matches = events.filter((e) => e.type === name);
      assert.equal(matches.length, 1, name);
      return matches[0]!;
    };
    const stages = ["sealed", "fenced", "prefix", "promoted", "peer-ready", "routed"].map(stage);
    assert(stages.every((event, n) => n === 0 || event.ms >= stages[n - 1]!.ms));
    const fenced = stage("fenced").data.data["proof"] as {
      cluster: string;
      epoch: string;
      primary: string;
      transactor: string;
      method: string;
    };
    assert.equal(fenced.cluster, cp.cluster);
    assert.equal(fenced.epoch, nonce);
    assert(fenced.method === "startup-latch-and-stop" || fenced.method === "independent-power-off");
    assert(
      fenced.primary !== fenced.transactor &&
        [fenced.primary, fenced.transactor].every((id) => /^[0-9a-f]{64}$/.test(id)),
    );
    const durability =
      kind === "move" || identity.policy === "B" ? "two-copy" : "single-copy-after-fence";
    assert.equal(stage("routed").data.data["policy"], durability);
    assert.equal(obs.result.policy, durability);
    assert.equal(available.marks.routed, stage("routed").data.at);
    assert.deepEqual(obs.result.availability, available);
    for (const point of ["before", "after"]) {
      const proof = parse(base + "pooled-" + point + ".json");
      check(proof);
      assert.deepEqual(
        [proof.basis, proof.people, proof.facts, proof.receipts],
        [cp.basis, cp.people, cp.facts, cp.receipts],
      );
      assert.deepEqual(
        proof.sample,
        Array.from({ length: 10 }, (_, n) => pooledRead(pool)(n).identity),
      );
    }
    for (const row of stream.filter((row) => row.stage === "offer" && row.data.kind === "read"))
      assert.deepEqual(row.data.deep, pooledRead(pool)(row.data.ordinal).identity);
    const verifiedFeed = kind === "move" ? obs.result.verified : obs.result.feed;
    assert.equal(verifiedFeed.operations, verifiedFeed.positions);
    assert(verifiedFeed.operations > 0);
    assert.match(
      obs.result.fresh.operationId,
      new RegExp("^tx2-ha1-" + nonce.slice(0, 8) + "-sync-"),
    );
    if (kind === "fault") {
      assert.equal(start, obs.result.from);
      if (durability === "two-copy") {
        assert.equal(obs.result.newStandby.cluster, cp.cluster);
        assert(lsn(obs.result.newStandby.flush) >= lsn(obs.result.newStandby.expected));
      }
      assert(metrics.lost !== null);
      const resume = available.faultToNewWriteMs ?? (obs.result.firstNewMs as number);
      assert(start + resume >= available.marks.routed!);
      const end = available.first?.finished ?? available.marks.routed!;
      metrics.resumeMs = resume;
      const outcomes = stream.filter(
        (row) =>
          row.stage === "outcome" &&
          row.data.kind === "read" &&
          row.data.due >= start &&
          row.data.due < end,
      );
      metrics.readOffers = outcomes.length;
      metrics.unavailableReadOffers = outcomes.filter(
        (row) => row.data.result !== "acknowledged",
      ).length;
      metrics.longestReadGapMs = available.maxReadGapMs;
      metrics.readCoverage =
        available.plan.start <= start &&
        available.stopAt >= end &&
        outcomes.length > 0 &&
        obs.result.during > 0;
    } else {
      assert.equal(start, stage("sealed").data.at);
      assert(
        lsn(obs.result.protectedLsn) >= lsn(stage("fenced").data.data["finalFlush"] as string),
      );
      metrics.moveMs = obs.result.firstWritePauseMs;
      assert(start + metrics.moveMs! >= available.marks.routed!);
    }
  }
  // [DX-HASYNC1] Why: compute the scorecard against both original attempts and the sealed pooled data. Rejected: treating successful exit or an unverified timing summary as a score.
  assert.match(seal, /^[0-9a-f]{64}$/);
  return { ...identity, campaign, attempts, seal, metrics };
}
