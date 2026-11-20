import assert from "node:assert/strict";
import {
  bootstrap90,
  distribution,
  histogramDistribution,
  percentile,
  ratioBar,
  type Distribution,
} from "../../../../bench/lib/verdict-statistics.ts";
import { Histogram } from "../../../../bench/lib/hist.ts";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import {
  cellKey,
  expiryMs,
  field,
  readForMs,
  readFromMs,
  readTape,
  sampleEvery,
  seconds,
  sha,
  task,
  writeTape,
  type Cell,
  type Density,
} from "./plan.ts";
import type { Feed, ReadResult, Scope } from "./observer.ts";
import { expectedSave, type Save, type Row } from "./writes.ts";
export const clock = "scheduled-offer";
const exact = (a: number, b: number) => Math.abs(a - b) < 0.002;
const stats = (d: Distribution, label: string) => {
  return {
    n: d.n,
    p50: percentile(d, 0.5),
    p99: percentile(d, 0.99),
    interval50: bootstrap90(d, 0.5, label + "/50"),
    interval99: bootstrap90(d, 0.99, label + "/99"),
  };
};
const metric = (xs: number[], label: string) => stats(distribution(xs, clock), label);

export type Observation = {
  people: Density;
  cell: Cell;
  repeat: number;
  start: number;
  nonce: string;
  source: string;
  slot: string;
  scopes: Scope[];
  writes: Save[];
  reads: ReadResult[];
  feed: Feed[];
};

export type OracleRows = Map<string, Row[]>[];
export function checkCell(x: Observation, model: OracleRows) {
  const program = writeTape(x.people, x.cell, x.repeat);
  const plan = new Map(program.map((w) => [x.nonce + "/" + w.version, w]));
  const byCommand = new Map(x.writes.map((w) => [w.id, w]));
  assert.equal(byCommand.size, x.writes.length);
  const missing = program.length - x.writes.length;
  assert(missing >= 0);
  const upper = x.start + seconds * 1000;
  const f = new Map(x.feed.map((m) => [m.id, m]));
  assert.equal(f.size, x.feed.length);
  const state = new Map(x.scopes.map((s) => [s.db, s.cut]));
  const groups = new Map<string, Save[]>();
  for (const m of x.feed) {
    assert.equal(m.position, state.get(m.db)! + 1);
    state.set(m.db, m.position);
  }
  for (const w of x.writes) {
    const want = plan.get(w.id);
    assert(want && exact(w.due, x.start + want.ms));
    assert.deepEqual(
      [w.account, w.subject, w.ordinal, w.width],
      [want.account, want.subject, want.ordinal, want.width],
    );
    assert.equal(w.db, x.scopes.find((s) => s.accounts.includes(w.account))?.db);
    assert(w.enqueued >= w.due - 0.005);
    assert(!w.dispatched || w.dispatched >= w.enqueued);
    assert(!w.sent || (!!w.dispatched && w.sent >= w.dispatched));
    assert(w.end && w.end >= (w.dispatched ?? w.enqueued));
    if (w.status === "expired-before-dispatch") {
      assert(!w.dispatched && !w.sent && !w.receipt && !f.has(w.id));
      assert(w.end >= w.due + expiryMs);
      assert(
        w.expiryCause &&
          [
            "timer",
            "same-subject",
            "in-flight-limit",
            "unresolved-predecessor",
            "dispatch",
          ].includes(w.expiryCause),
      );
      if (w.expiryCause === "timer") assert(w.enqueued >= w.due + expiryMs);
    } else if (w.status === "acked" || w.status === "recovered") {
      const v = f.get(w.id),
        r = w.receipt;
      assert(v && r);
      assert.deepEqual(
        [v.db, v.position, v.clock, v.tx, v.digest],
        [w.db, r.p, r.clock, r.tx, r.digest],
      );
      const key = w.db + "/" + r.t,
        g = groups.get(key) ?? [];
      g.push(w);
      groups.set(key, g);
    } else {
      assert((w.status === "uncertain" || w.status === "refused") && !w.receipt && !f.has(w.id));
    }
  }
  const acked = x.writes.filter((w) => w.status === "acked");
  const recovered = x.writes.filter((w) => w.status === "recovered").length;
  assert.equal(f.size, acked.length + recovered);
  // [DX-SCALE1] Why: replay the original planned rows and predecessor IDs in native receipt order. Rejected: accepting a matching producer and feed digest without deriving the expected assertions and retractions.
  const committed = x.writes.filter((w) => w.receipt).sort((a, b) => a.receipt!.p - b.receipt!.p);
  const cuts: {
    account: number;
    subject: number;
    db: string;
    position: number;
    before: [string, string | null];
    after: [string, string | null];
  }[] = [];
  const cutAccounts = new Set<number>();
  for (const w of committed) {
    const prior = model[w.account]!.get(task(w.account, w.subject))!;
    const expected = expectedSave(w, plan.get(w.id)!, prior);
    const observed = f.get(w.id)!;
    assert.equal(observed.digest, expected.digest);
    assert.equal(observed.tx, expected.input.claims[0]!.txId);
    if (!cutAccounts.has(w.account)) {
      cuts.push({
        account: w.account,
        subject: w.subject,
        db: w.db,
        position: observed.position,
        before: [prior[0]!.id, prior[0]!.value_string],
        after: [expected.input.rows[0]!.id, expected.input.rows[0]!.value_string],
      });
      cutAccounts.add(w.account);
    }
    for (let i = 0; i < w.width; i++) {
      prior[i] = {
        ...expected.input.rows[i]!,
        recorded_at: observed.clock,
        recorded_position: observed.position,
      };
    }
  }
  for (const g of groups.values()) {
    g.sort((a, b) => a.receipt!.p - b.receipt!.p);
    for (const [i, w] of g.entries()) {
      assert.equal(w.receipt!.p, g[0]!.receipt!.p + i);
      if (w.status === "acked") assert.equal(w.receipt!.size, g.length);
      if (i) assert(g[i - 1]!.receipt!.clock < w.receipt!.clock);
    }
  }
  const readPlan = readTape(x.people, x.repeat);
  assert.equal(x.reads.length, 2);
  const sample = new Map<number, ReadResult["samples"][number]>();
  const sampled = x.reads.flatMap((r) => r.samples);
  for (const r of sampled) {
    const op = readPlan[r.ordinal];
    assert(op && !sample.has(op.ordinal));
    assert(r.end >= x.start + op.ms - 0.01);
    if (!r.error) {
      assert((r.ordinal + 1) % sampleEvery === 0 && r.start);
      assert(r.start >= x.start + readFromMs && r.start < x.start + readFromMs + readForMs);
      assert.equal(r.digest, sha([task(0, op.subject), field(0), fieldValue(op.subject, 0, 0, 0)]));
    }
    sample.set(op.ordinal, r);
  }
  assert.equal(
    x.reads.reduce((s, r) => s + r.planned, 0),
    readPlan.length,
  );
  assert(readPlan.every((op) => (op.ordinal + 1) % sampleEvery !== 0 || sample.has(op.ordinal)));
  const readErrors = sampled.filter((r) => r.error).length;
  const readHist = new Histogram();
  for (const r of x.reads) readHist.merge(Histogram.fromJSON(r.latency));
  assert.equal(readHist.count + readErrors, readPlan.length);
  const label = cellKey(x.cell, x.repeat);
  const quiet = acked.filter((w) => w.account === 0);
  const commitLatency = (w: Save) => w.end! - w.due;
  const quietLat = quiet.map(commitLatency);
  const feedLat = quiet.map((w) => Math.max(0, f.get(w.id)!.seen - w.end!));
  const inWindow = acked.filter((w) => w.end! < upper).length;
  const drainMs = Math.max(0, ...acked.map((w) => w.end! - upper));
  const beforeDispatch = x.writes.filter((w) => w.status === "expired-before-dispatch").length;
  const expiryCauses = Object.fromEntries(
    ["timer", "same-subject", "in-flight-limit", "unresolved-predecessor", "dispatch"].map(
      (cause) => [cause, x.writes.filter((w) => w.expiryCause === cause).length],
    ),
  );
  assert.equal(
    Object.values(expiryCauses).reduce((a, b) => a + b, 0),
    beforeDispatch,
  );
  const uncertain = x.writes.filter((w) => w.status === "uncertain").length;
  const refused = x.writes.filter((w) => w.status === "refused").length;
  const groupsEligible =
    !missing && !readErrors && !beforeDispatch && !recovered && !uncertain && !refused;
  const series = Array.from({ length: seconds }, (_, s) => ({
    second: s,
    scheduled: 0,
    enqueued: 0,
    sent: 0,
    durableAck: 0,
  }));
  for (const w of program) series[Math.floor(w.ms / 1000)]!.scheduled++;
  for (const w of x.writes) {
    const inc = (when: number | undefined, key: "enqueued" | "sent" | "durableAck") => {
      const bin = when ? series[Math.floor((when - x.start) / 1000)] : undefined;
      if (bin) bin[key]++;
    };
    inc(w.enqueued, "enqueued");
    inc(w.sent, "sent");
    if (w.status === "acked") inc(w.end, "durableAck");
  }
  const pooled = metric(acked.map(commitLatency), label + "/all");
  const measure = (name: string, sample: (w: Save) => number | undefined) =>
    metric(
      acked
        .map(sample)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0),
      label + "/" + name,
    );
  const stages = {
    timer: measure("timer", (w) => w.enqueued - w.due),
    admission: measure("admission", (w) =>
      w.dispatched === undefined ? undefined : w.dispatched - w.enqueued,
    ),
    requestSend: measure("request-send", (w) =>
      w.sent === undefined || w.dispatched === undefined ? undefined : w.sent - w.dispatched,
    ),
    gatewayQueue: measure("gateway-queue", (w) =>
      typeof w.stage?.groupQueueMicros === "number" ? w.stage.groupQueueMicros / 1000 : undefined,
    ),
    nativeEntry: measure("native-entry", (w) => w.stage?.submitToNativeEntryMs),
    nativeCompute: measure("native-compute", (w) => w.stage?.nativeComputeMs),
  };
  return {
    label,
    cell: x.cell,
    repeat: x.repeat,
    seconds,
    planned: program.length,
    missing,
    preDispatchExpiry: beforeDispatch,
    expiryCauses,
    recovered,
    uncertain,
    refused,
    acked: acked.length,
    inWindow,
    goodput: inWindow / seconds,
    drainMs,
    offered: program.length / seconds,
    nativeTransactions: groups.size,
    groupMean: f.size / Math.max(1, groups.size),
    stages,
    sampledReadPlan: sha(readPlan),
    readErrors,
    qualifiedInputs: groupsEligible,
    capacityBars:
      groupsEligible &&
      pooled.n >= 500 &&
      (pooled.p50 ?? Infinity) <= 10 &&
      (pooled.p99 ?? Infinity) <= 50 &&
      inWindow >= 0.99 * program.length &&
      drainMs <= 1000,
    writes: pooled,
    quiet: metric(quietLat, label + "/quiet"),
    read: stats(histogramDistribution(readHist, clock), label + "/read"),
    feed: metric(feedLat, label + "/feed"),
    series,
    cuts,
    distributions: { commit: quietLat, read: readHist.toJSON(), feed: feedLat },
  };
}

export function ratios(
  alone: ReturnType<typeof checkCell>[],
  loaded: ReturnType<typeof checkCell>[],
) {
  assert(alone.length === 2 && loaded.length === 2);
  assert(
    alone.every(
      (a, i) =>
        a.cell === "alone" &&
        a.repeat === loaded[i]!.repeat &&
        a.sampledReadPlan === loaded[i]!.sampledReadPlan,
    ),
  );
  return (["commit", "read", "feed"] as const).map((k) => {
    const dirty = [...alone, ...loaded].some((r) => !r.qualifiedInputs);
    const d = (rs: typeof loaded) => {
      if (k !== "read")
        return distribution(
          rs.flatMap((r) => r.distributions[k]),
          clock,
        );
      const h = new Histogram();
      for (const r of rs) h.merge(Histogram.fromJSON(r.distributions.read));
      return histogramDistribution(h, clock);
    };
    const a = d(loaded),
      b = d(alone);
    return ratioBar("decision/" + loaded[0]!.cell + "/" + k, a, b, 1.25, {
      minimum: 500,
      invalid: dirty ? "incomplete outcomes in a matched window" : undefined,
    });
  });
}
