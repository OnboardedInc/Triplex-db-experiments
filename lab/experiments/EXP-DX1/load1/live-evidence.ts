import assert from "node:assert/strict";
import { pipelineDuration, pipelineHz, pipelineLimit } from "./pipeline.ts";
import { pacedHz, reviewMs, reviewPace, type Baseline, type PaceDecision } from "./pacing.ts";
import type { Seen } from "./oracle.ts";
import { microCycleMs, microDuration, microHz, volumeWindow } from "./micro.ts";

export interface Offer {
  actor: string;
  kind: "save" | "read";
  seq: number;
  due: number;
  offered: number;
  end: number;
  outcome: string;
  seen?: Seen;
}
export interface OfferTape {
  nonce: string;
  source: string;
  slot: string;
  scope: string;
  start: number;
  duration: number;
  samples: Offer[];
  ordered: {
    first: number;
    end: number;
    command: string;
    position: number;
    facts: number;
    offer: number;
    ack: number;
    service?: { ms: number; rows: number; bytes: number };
    pressure?: { outstanding: number; pendingSaves: number; limit: number };
  }[];
  native: {
    command: string;
    position: number;
    recovered?: boolean;
    queueUs?: number;
    toEntryMs?: number;
    frameSize?: { rows: number; bytes: number };
    serialHold?: { start: number; end: number };
    grant?: { bulk: boolean; "runnable-live": boolean };
  }[];
  markers?: { first: number; end: number; position: number; digest: string; done: number }[];
  hz?: number;
  depth?: number;
  pace?: { baseline?: Baseline; decisions: PaceDecision[] };
  resumeCursor?: number;
  pipelineChecks?: { missingPredecessor: boolean };
  lostReplies?: number;
  temporal?: { command: string; position: number }[];
}
export interface Measure {
  offered: number;
  ok: number;
  p99Ms: number | null;
  outcomes: Record<string, number>;
}
export function percentile(values: number[], q: number) {
  return values.length
    ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1]!
    : null;
}
export function offers(rows: Offer[]): Measure {
  const ok = rows.filter((r) => r.outcome === "verified");
  return {
    offered: rows.length,
    ok: ok.length,
    p99Ms: percentile(
      ok.map((r) => r.end - r.due),
      0.99,
    ),
    outcomes: rows.reduce(
      (m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m),
      {} as Record<string, number>,
    ),
  };
}

export function pipelineTimings(ordered: OfferTape["ordered"], native: OfferTape["native"]) {
  const describe = (values: number[]) => ({
    count: values.length,
    p50: percentile(values, 0.5),
    p99: percentile(values, 0.99),
    max: percentile(values, 1),
  });
  const holds = ordered.flatMap(({ service }) => (service ? [service] : []));
  const quiet = native.filter(({ command }) => /^save\/quiet\/\d+$/.test(command));
  return {
    frameCycleMs: describe(ordered.map((r) => r.ack - r.offer)),
    peerHoldMs: describe(holds.map((r) => r.ms)),
    frameWireBytes: describe(holds.map((r) => r.bytes)),
    storedRows: describe(holds.map((r) => r.rows)),
    quietQueueMs: describe(
      quiet.flatMap(({ queueUs }) => (queueUs === undefined ? [] : [queueUs / 1000])),
    ),
  };
}

// [DX-LOAD2] Why: compare the same scheduled tape and recompute its timing from retained offers.
// Rejected: granting a fast p99 to a cell that made fewer offers, omitted late responses, or changed their pinned workload.
export function replayLive(
  tape: OfferTape,
  attempt: { nonce: string; source: { git: string }; slot: string; mode: string; prefix?: string },
  arm: {
    scope: string;
    arm: string;
    duration: number;
    rate: number;
    neighbors: Record<string, { save: Measure; read: Measure }>;
    facts: number;
    fps: number;
    aboveBudget?: number;
    committedFrames?: number;
    budgetMs?: number;
    queryableFacts?: number;
    cycleOverBudget?: number;
    framesWithoutService?: number;
    offeredFrames?: number;
    temporal?: number;
    width?: number;
    depth?: number;
    peakBulk?: number;
    resumeCursor?: number;
    pipelineChecks?: { missingPredecessor: boolean };
    limitedOffers?: number;
    pipelineTiming?: ReturnType<typeof pipelineTimings>;
    pacingDecisions?: PaceDecision[];
  },
  mac = false,
  paceBaseline?: Baseline,
) {
  const pipeline = attempt.mode === "load-pipeline";
  const paced = attempt.mode === "load-paced";
  const micro =
    pipeline || paced || attempt.mode === "load-micro" || attempt.mode === "load-volume";
  if (
    !/^(load-tail|load-micro|load-volume|load-pipeline|load-paced|load-frontier-(low|high|allowance)|load-split-(sql|pg))$/.test(
      attempt.mode,
    )
  )
    return;
  const prefix = "tx2-ha1-" + attempt.nonce.slice(0, 8);
  assert.deepEqual(
    [tape.nonce, tape.source, tape.slot, tape.scope, tape.duration],
    [
      attempt.nonce,
      attempt.source.git,
      attempt.slot,
      prefix + "-" + arm.arm,
      attempt.mode === "load-volume"
        ? volumeWindow(arm.arm, mac)
        : pipeline || paced
          ? pipelineDuration(mac)
          : microDuration,
    ],
  );
  assert.equal(arm.scope, tape.scope);
  assert.equal(arm.duration, tape.duration);
  assert(Number.isFinite(tape.start));
  const diagnosticVolume = mac && (pipeline || paced || attempt.mode === "load-volume");
  assert((diagnosticVolume ? [10, 50] : [50, 100]).includes(arm.rate));
  if (attempt.mode === "load-tail") assert.equal(arm.rate, 50);
  const alone = arm.arm === "frontier-alone";
  assert(!alone || attempt.mode === "load-frontier-allowance");
  const quiet = (5 * arm.duration) / 1000,
    noisy = alone ? 0 : (arm.rate * arm.duration) / 1000;
  const expected = new Map<string, number>();
  for (let i = 0; i < quiet; i++) {
    expected.set("quiet/read/" + i, i * 200);
    expected.set("quiet/save/" + i, i * 200);
  }
  for (let i = 0; i < noisy; i++)
    expected.set("live" + (i % 10) + "/save/" + i, (1000 * i) / arm.rate);
  if (attempt.mode !== "load-tail" && !alone)
    for (let i = 0; i < quiet * 10; i++) expected.set("live" + (i % 10) + "/read/" + i, i * 20);
  const recorded = new Map(tape.native.map((n) => [n.command, n]));
  assert.equal(recorded.size, tape.native.length);
  const bins = new Map<string, { save: Offer[]; read: Offer[] }>();
  for (const row of tape.samples) {
    const id = row.actor + "/" + row.kind + "/" + row.seq;
    assert.ok(expected.has(id), id);
    assert.equal(row.due, expected.get(id), id);
    expected.delete(id);
    assert(
      Number.isFinite(row.offered) &&
        Number.isFinite(row.end) &&
        row.end >= row.offered &&
        row.offered >= row.due - 5 &&
        (!micro || row.end >= row.due) &&
        row.outcome !== "pending",
      id,
    );
    if (row.kind === "save" && row.outcome === "verified") {
      assert(
        row.seen?.position &&
          recorded.get("save/" + row.actor + "/" + row.seq)?.position === row.seen.position,
      );
    }
    let bin = bins.get(row.actor);
    if (!bin) bins.set(row.actor, (bin = { save: [], read: [] }));
    bin[row.kind].push(row);
  }
  assert.equal(expected.size, 0);
  assert.deepEqual(
    arm.neighbors,
    Object.fromEntries(
      [...bins].map(([actor, b]) => [
        actor,
        {
          save: offers(b.save),
          read: offers(b.read),
        },
      ]),
    ),
  );
  if (!attempt.mode.startsWith("load-split")) {
    let facts = 0;
    for (const row of tape.ordered) {
      assert(
        row.facts > 0 && row.first < row.end && row.offer < arm.duration && row.ack >= row.offer,
      );
      assert.equal(recorded.get(row.command)?.position, row.position);
      if (row.ack <= arm.duration) facts += row.facts;
    }
    assert.equal(arm.facts, facts);
    if (arm.budgetMs !== undefined) {
      for (const row of tape.ordered)
        assert(
          row.service && row.service.ms > 0 && row.service.rows <= 96 && row.service.bytes <= 65536,
        );
      assert.equal(
        arm.aboveBudget,
        tape.ordered.filter((r) => r.service!.ms > arm.budgetMs!).length,
      );
    }
  }
  if (micro) {
    const hz = pipeline ? pipelineHz : paced ? pacedHz : microHz;
    assert.equal(tape.hz, hz);
    assert.equal(arm.offeredFrames, Math.floor((arm.duration * hz) / 1000));
    assert.equal(arm.framesWithoutService, tape.ordered.filter((r) => !r.service).length);
    if (paced) {
      assert(tape.pace);
      const feedback = arm.arm.endsWith("-feedback");
      if (feedback) assert(paceBaseline);
      assert.deepEqual(tape.pace.baseline, feedback ? paceBaseline : undefined);
      assert.deepEqual(arm.pacingDecisions, tape.pace.decisions);
      assert.deepEqual(arm.pipelineTiming, pipelineTimings(tape.ordered, tape.native));
      assert.equal(arm.peakBulk, arm.width ? 1 : 0);
      let current = pacedHz,
        previous = -Infinity,
        i = 0;
      for (const row of tape.ordered) {
        while (i < tape.pace.decisions.length && tape.pace.decisions[i]!.at <= row.offer) {
          const decision: PaceDecision = tape.pace.decisions[i]!;
          assert(feedback && paceBaseline && decision.at === (i + 1) * reviewMs);
          assert.deepEqual(
            decision,
            reviewPace(paceBaseline, tape.samples, arm.rate, decision.at, current),
          );
          current = decision.next;
          i++;
        }
        if (feedback) assert.equal(i, Math.floor(row.offer / reviewMs));
        assert(row.offer - previous + 1e-6 >= 1000 / current);
        previous = row.offer;
      }
      for (; i < tape.pace.decisions.length; i++) {
        const at = (i + 1) * reviewMs;
        assert(feedback && paceBaseline && at < tape.duration);
        const decision = reviewPace(paceBaseline, tape.samples, arm.rate, at, current);
        assert.deepEqual(tape.pace.decisions[i], decision);
        current = decision.next;
      }
    }
    let first = 0;
    let lastAck = 0;
    let lastPosition = 0;
    let lastHold = 0;
    if (pipeline) {
      const depth = Number(arm.arm.split("-")[2]) || 0;
      assert.equal(tape.depth, depth);
      assert.equal(arm.depth, depth);
      assert.equal(arm.resumeCursor, tape.resumeCursor);
      assert.deepEqual(arm.pipelineChecks, tape.pipelineChecks);
      if (mac && depth) {
        assert(tape.resumeCursor && tape.resumeCursor >= (4 * arm.width!) / 8);
        assert.equal(tape.pipelineChecks?.missingPredecessor, true);
      }
      // [DX-HA1] Why: independently reconstruct each admission from completed HTTP frames and offered live saves.
      // Rejected: trusting the worker's reported peak depth or hiding unserved live pressure behind the credit cap.
      const lives = tape.samples.filter((r) => r.kind === "save" && r.end > r.offered);
      const active = [];
      let peak = 0;
      let limited = 0;
      let liveStarts = 0;
      let liveEnds = 0;
      const starts = lives.map((r) => r.offered).sort((a, b) => a - b);
      const ends = lives.map((r) => r.end).sort((a, b) => a - b);
      for (const f of tape.ordered) {
        while (starts[liveStarts] !== undefined && starts[liveStarts]! < f.offer) liveStarts++;
        while (ends[liveEnds] !== undefined && ends[liveEnds]! <= f.offer) liveEnds++;
        const pendingSaves = liveStarts - liveEnds;
        const limit = pipelineLimit(depth, pendingSaves);
        for (let i = active.length - 1; i >= 0; i--) if (active[i]! <= f.offer) active.splice(i, 1);
        assert.deepEqual(f.pressure, { outstanding: active.length, pendingSaves, limit });
        assert(active.length < limit);
        if (limit < depth) limited++;
        active.push(f.ack);
        peak = Math.max(peak, active.length);
      }
      assert.equal(arm.peakBulk, peak);
      assert.equal(arm.limitedOffers, limited);
      assert.deepEqual(arm.pipelineTiming, pipelineTimings(tape.ordered, tape.native));
    }
    const byPosition = new Map<number, (typeof tape.ordered)[number]>();
    for (const row of tape.ordered) {
      assert.equal(row.first, first);
      assert.equal(row.facts, arm.width);
      assert.equal(row.facts, (row.end - row.first) * 8);
      assert(pipeline || row.offer >= lastAck);
      if (pipeline) assert(row.position > lastPosition);
      lastPosition = row.position;
      first = row.end;
      lastAck = row.ack;
      const n = recorded.get(row.command)!;
      if (diagnosticVolume && n.recovered) assert.equal(row.service, undefined);
      else {
        assert(n.grant?.bulk && !n.grant["runnable-live"] && n.serialHold);
        assert.equal(row.service?.ms, n.serialHold.end - n.serialHold.start);
        if (pipeline) {
          assert.deepEqual({ rows: row.service.rows, bytes: row.service.bytes }, n.frameSize);
          assert(n.serialHold.start >= lastHold, "Bulk peer submissions overlapped");
          lastHold = n.serialHold.end;
        }
        assert(row.service.ms > 0 && row.service.rows <= 96 && row.service.bytes <= 65536);
      }
      assert(!byPosition.has(row.position));
      byPosition.set(row.position, row);
    }
    assert.equal(
      arm.cycleOverBudget,
      tape.ordered.filter((r) => r.ack - r.offer > microCycleMs).length,
    );
    let prior = 0;
    for (const m of tape.markers ?? []) {
      const frame = byPosition.get(m.position);
      assert(frame && m.position > prior && m.done >= frame.ack);
      assert.deepEqual([m.first, m.end], [frame.first, frame.end]);
      assert.match(m.digest, /^[0-9a-f]{64}$/);
      prior = m.position;
    }
    const last = tape.markers?.findLast((m) => m.done <= arm.duration);
    assert.equal(arm.queryableFacts, (last?.end ?? 0) * 8);
    assert.equal(tape.lostReplies, arm.width ? (pipeline ? 2 : 1) : 0);
    assert.equal(tape.temporal?.length, arm.temporal);
    assert.equal(arm.temporal, arm.width ? 3 : 0);
    for (const r of tape.temporal ?? [])
      assert.equal(recorded.get(r.command)?.position, r.position);
  }
  assert.equal(arm.fps, arm.facts / (arm.duration / 1000));
}
