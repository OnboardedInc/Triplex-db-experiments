import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Receipt } from "../../../bench/lib/composition.ts";
import { integer, string } from "../../../bench/lib/deep-world.ts";
import { TRACE_DEFAULTS } from "../../../bench/lib/trace.ts";
import { deepEdits, type DeepEvent } from "../../../bench/lib/deep-trace.ts";
import { Rng, hash2, seedOf } from "../../../bench/lib/rng.ts";
import type { BuiltCommand, SubjectState } from "../../../bench/lib/commands.ts";
import { ids, subjectOf, type Fact } from "../../../bench/lib/world.ts";
import type { TenantWindow } from "./tenant-traffic.ts";

export type PeakAlignment = "staggered" | "coincident";
export const liveProfile = "deep-live/1";
export const liveArms = (["pooled", "pooled-group", "separate"] as const).flatMap((config) =>
  (["staggered", "coincident"] as const).map((live) => ({
    live,
    layout: config === "separate" ? ("separate" as const) : ("pooled" as const),
    suffix:
      "live-" +
      live +
      (config === "pooled" ? "" : config === "pooled-group" ? "-group" : "-separate"),
    controlSuffix: config === "pooled-group" ? "live-" + live : null,
  })),
);

export const livePeakWindow = (alignment: PeakAlignment) => alignment + "-1-1";
export const geometryHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const STEADY = 3.5,
  PLATEAU = 23.5,
  PEAK = 39.4;
const vector = (rate: (i: number) => number) => Array.from({ length: 10 }, (_, i) => rate(i));

// [DX-SCALE1] Why: five minutes at each load resolves queue capacity near 150 and 200/s while the sentinel stays at its own exact rate. Rejected: treating the peak-minute population as a sustained operating rate.
export function liveWindows(alignment: PeakAlignment): TenantWindow[] {
  assert(alignment === "staggered" || alignment === "coincident");
  const windows: TenantWindow[] = [];
  let from = 0;
  const add = (name: string, seconds: number, rates: number[]) => {
    windows.push({
      name,
      from,
      seconds,
      active: rates.filter((r) => r > 0).length,
      pattern: "steady",
      readers: 64,
      rates,
    });
    from += seconds;
  };
  add(
    "alone",
    300,
    vector((i) => (i === 0 ? STEADY : 0)),
  );
  add(
    "ten-steady",
    300,
    vector(() => STEADY),
  );
  for (const hot of [1, 3, 5, 6, 7, 8, 9, 10])
    add(
      "plateau-" + hot,
      300,
      vector((i) => (hot === 10 || (i > 0 && i <= hot) ? PLATEAU : STEADY)),
    );
  for (let repeat = 1; repeat <= 3; repeat++) {
    add(
      "nine-peak-" + repeat,
      60,
      vector((i) => (i === 0 ? STEADY : PEAK)),
    );
    add(
      "nine-recover-" + repeat,
      120,
      vector(() => STEADY),
    );
  }
  for (let repeat = 1; repeat <= 3; repeat++)
    for (let minute = 0; minute < 10; minute++)
      add(
        alignment + "-" + repeat + "-" + (minute + 1),
        60,
        vector((i) => ((alignment === "coincident" ? minute === 0 : i === minute) ? PEAK : STEADY)),
      );
  return windows;
}

// [DX-SCALE1] Why: the production counts describe entire minutes. Stratified jitter gives each measured minute its exact number of offers and avoids synchronizing all writers down to the millisecond. Rejected: a Poisson sample that misses the requested peak rate.
export function liveArrivals(
  account: number,
  rate: number,
  seconds: number,
  put: (time: number) => void,
) {
  assert(seconds % 60 === 0 && [STEADY, PLATEAU, PEAK].includes(rate));
  const count = Math.round(60 * rate);
  for (let minute = 0; minute < seconds / 60; minute++) {
    const rng = new Rng(seedOf(liveProfile + "/arrivals/" + account + "/" + rate + "/" + minute));
    for (let j = 0; j < count; j++) put(60 * minute + ((j + rng.next()) * 60) / count);
  }
}

const key = (f: Fact) => f.e + "\0" + f.a;
export function liveEdits(
  subject: number,
  seq: number,
  kind: DeepEvent["kind"],
  intent: DeepEvent["deep"],
) {
  const all = deepEdits(subject, seq, kind, intent);
  if (intent.fresh) return all;
  const draw = hash2(liveProfile + "/size/" + subject + "/" + seq)[0] % 100;
  const fields = draw < 80 ? 1 : draw < 95 ? 2 : 3;
  let selected = 0;
  return all.filter(
    (f) => (kind === "person" && !f.a.startsWith(":task/field-")) || selected++ < fields,
  );
}

// [DX-SCALE1] Why: a field save carries absolute values and CAS-preconditions on the last acknowledged rows. Later saves can follow a dispatch expiry without inventing a predecessor. Rejected: retracting a planned value that never committed or creating fields under a missing task.
export class FieldSaveWriter {
  private readonly current = new Map<string, { fact: Fact; id: string; from: number }>();
  private readonly active: ReadonlySet<number>;
  constructor(active: ReadonlySet<number>) {
    this.active = active;
  }
  bind(receipt: Receipt) {
    for (const t of receipt.triples) {
      const subject = subjectOf(t.entityId);
      if (
        subject === null ||
        !this.active.has(subject) ||
        !/^:(task\/(field-\d+|progress|status)|subtask\/completedAt|(signal|proposal|reconcile)\/(sequence|result|input|revision))$/.test(
          t.attribute,
        )
      )
        continue;
      assert(t.id && Number.isFinite(t.validFrom));
      const fact = { e: t.entityId, a: t.attribute, v: t.value };
      this.current.set(key(fact), { fact, id: t.id, from: t.validFrom! });
    }
  }
  build(tag: string, e: DeepEvent, state: SubjectState, at: number): BuiltCommand {
    const from = Math.floor(at),
      back = from - TRACE_DEFAULTS.correctionBackMs;
    const added: Fact[] = [],
      removed: Fact[] = [],
      addedValidFrom: number[] = [],
      removedValidFrom: number[] = [];
    const operations: BuiltCommand["operations"] = [],
      preconditions: BuiltCommand["preconditions"] = [];
    const put = (fact: Fact, time: number, old = this.current.get(key(fact))) => {
      if (old) {
        removed.push(old.fact);
        removedValidFrom.push(old.from);
        operations.push({ op: "retract", id: old.id });
        preconditions.push({ _tag: "TripleLive", id: old.id });
      }
      added.push(fact);
      addedValidFrom.push(time);
      operations.push({
        op: "assert",
        entityId: fact.e,
        attribute: fact.a,
        value: fact.v,
        validFrom: time,
      });
    };
    const stamp = { e: ids.placement(e.subject), a: ":placement/stamp", v: integer(state.stamp) };
    put({ ...stamp, v: integer(state.stamp + 1) }, from, {
      fact: stamp,
      id: state.stampId,
      from: state.stampValidFrom,
    });
    const address = e.correction ? "correction-" + hash2("address:" + e.seq)[0] : null;
    if (address) {
      const old = { e: ids.worker(e.subject), a: ":worker/address", v: string(state.address) };
      put({ ...old, v: string(address) }, back, {
        fact: old,
        id: state.addressId,
        from: state.addressValidFrom,
      });
    }
    for (const fact of liveEdits(e.subject, e.seq, e.kind, e.deep)) {
      if (e.kind === "person" && !e.deep.fresh && fact.a === ":task/progress")
        assert(
          this.current.has(key(fact)),
          "Field save references a task whose creation was never acknowledged",
        );
      put(fact, from);
    }
    assert.equal(added.length, e.facts);
    return {
      commandId: tag + ":t" + e.seq,
      operations,
      preconditions,
      added,
      removed,
      addedValidFrom,
      removedValidFrom,
      newStamp: state.stamp + 1,
      newAddress: address,
      validRange: { from: address ? back : from, to: null },
    };
  }
}
