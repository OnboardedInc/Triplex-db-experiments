import assert from "node:assert/strict";
import type { W0 } from "../../../bench/lib/w0-world.ts";
import type { DurabilityMode } from "./model.ts";

export type TimedCut = { at: number; position: number };
export type Offered = {
  order: number;
  id: string;
  scheduled: number;
  ingress: number;
  mode: DurabilityMode;
  doc: W0.ReleaseDoc;
  ack?: TimedCut & { txId: string; seq: number };
  owed?: TimedCut;
  stored?: TimedCut;
  error?: string;
};
export type RawDecision = {
  offer?: number;
  phase: "first" | "deadline" | "traffic";
  route: string;
  id: string;
  invoked: number;
  returned: number;
  position: number;
  seq: number;
  raw: string;
};

export function scoreClock(
  offers: readonly Offered[],
  reads: readonly RawDecision[],
  routes: readonly string[],
  mode: DurabilityMode,
) {
  assert(offers.length > 0 && routes.length > 0 && new Set(routes).size === routes.length);
  const witnesses = new Map<number, RawDecision[]>();
  for (const r of reads) {
    assert(
      routes.includes(r.route) &&
        Number.isFinite(r.invoked) &&
        Number.isFinite(r.returned) &&
        r.returned >= r.invoked &&
        Number.isSafeInteger(r.position) &&
        r.position > 0 &&
        Number.isSafeInteger(r.seq) &&
        r.seq >= 0 &&
        typeof r.raw === "string" &&
        r.raw.length,
    );
    if (r.phase === "traffic") continue;
    assert(Number.isSafeInteger(r.offer) && r.offer! >= 0 && r.offer! < offers.length);
    const list = witnesses.get(r.offer!) ?? [];
    list.push(r);
    witnesses.set(r.offer!, list);
  }
  let stale = 0;
  const summary = offers.map((o, i) => {
    assert(
      o.order === i &&
        o.mode === mode &&
        Number.isFinite(o.scheduled) &&
        Number.isFinite(o.ingress) &&
        o.ingress >= o.scheduled,
    );
    if (i) assert(o.scheduled > offers[i - 1]!.scheduled);
    const deadline = o.scheduled + 1000,
      samples = witnesses.get(i) ?? [],
      due = samples.filter((r) => r.phase === "deadline"),
      first = reads.filter(
        (r) =>
          o.ack && r.invoked >= o.ingress && r.position >= o.ack.position && r.seq >= o.ack.seq,
      );
    for (const route of routes) {
      assert(
        due.some((r) => r.route === route),
        "missing deadline read for offer " + i + " via " + route,
      );
    }
    for (const r of due) {
      assert(r.invoked >= deadline, "deadline observation was taken too early");
      if (!o.ack || r.position < o.ack.position || r.seq < o.ack.seq) stale++;
    }
    const rawRead = first.length ? Math.min(...first.map((r) => r.returned)) : undefined;
    const required = mode === "stored" ? [o.ack, o.owed, o.stored] : [o.ack, o.owed];
    for (const c of required)
      if (c)
        assert(
          Number.isFinite(c.at) &&
            c.at >= o.ingress &&
            Number.isSafeInteger(c.position) &&
            c.position >= (o.ack?.position ?? 0),
        );
    if (mode === "record" && o.owed && o.ack)
      assert.deepEqual(o.owed, { at: o.ack.at, position: o.ack.position });
    const done =
      o.error || rawRead === undefined || required.some((x) => !x)
        ? null
        : Math.max(rawRead, ...required.map((c) => c!.at)) - o.scheduled;
    return {
      id: o.id,
      firstReadMs: rawRead === undefined ? null : rawRead - o.scheduled,
      lastOwedMs: o.owed ? o.owed.at - o.scheduled : null,
      lastStoredMs: o.stored ? o.stored.at - o.scheduled : null,
      done,
      missed: done === null || done >= 1000,
    };
  });
  // [DX-ACT2] Why: test every observed current response against every preceding deadline, even without a timely ACK. Rejected: starting the freshness clock at ACK.
  const cuts = offers.filter((o) => o.ack).map((o) => ({ ...o.ack!, due: o.scheduled + 1000 }));
  const sorted = [...reads].sort((a, b) => a.invoked - b.invoked);
  let d = 0,
    minimum = 0;
  for (const r of sorted) {
    while (d < cuts.length && cuts[d]!.due <= r.invoked) {
      minimum = Math.max(minimum, cuts[d++]!.position);
    }
    if (r.phase !== "deadline" && r.position < minimum) stale++;
  }
  return { offers: summary, stale, misses: summary.filter((o) => o.missed).length };
}

export function assertOnTime(result: ReturnType<typeof scoreClock>) {
  assert.equal(result.misses, 0, "activation deadline misses");
  assert.equal(result.stale, 0, "stale public answers after the activation deadline");
}
