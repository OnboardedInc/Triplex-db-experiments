import type { BuiltCommand, SubjectState } from "./commands.ts";
import type { Receipt } from "./composition.ts";
import { deepEdits, type DeepEvent } from "./deep-trace.ts";
import { integer, string } from "./deep-world.ts";
import { hash2 } from "./rng.ts";
import { TRACE_DEFAULTS } from "./trace.ts";
import { ids, subjectOf, type Fact } from "./world.ts";

const key = (e: string, a: string) => `${e}\0${a}`;
const mutable = (a: string) =>
  /^:(task\/(field-\d+|progress|status)|subtask\/completedAt|(signal|reconcile|proposal)\/(sequence|result|input|revision))$/.test(
    a,
  );
type Live = { fact: Fact; id: string; from: number };
export class DeepWriter {
  private readonly live = new Map<string, Live>();
  private readonly active: ReadonlySet<number>;
  constructor(active: ReadonlySet<number>) {
    this.active = active;
  }
  // [DX-SCALE1] Why: a real save replaces the exact live assertion and leaves history behind. Rejected: accumulating a new event entity for every save or keeping sixteen million row IDs on the sender.
  bind(receipt: Receipt) {
    for (const t of receipt.triples) {
      const i = subjectOf(t.entityId);
      if (i === null || !this.active.has(i) || !mutable(t.attribute)) continue;
      if (!t.id || !Number.isFinite(t.validFrom))
        throw Error("Deep receipt omitted a mutable row identity or valid time");
      this.live.set(key(t.entityId, t.attribute), {
        id: t.id,
        from: t.validFrom!,
        fact: { e: t.entityId, a: t.attribute, v: t.value },
      });
    }
  }
  build(runTag: string, event: DeepEvent, state: SubjectState, scheduled: number): BuiltCommand {
    const i = event.subject,
      from = Math.floor(scheduled),
      added: Fact[] = [],
      removed: Fact[] = [];
    const addedValidFrom: number[] = [],
      removedValidFrom: number[] = [],
      operations: BuiltCommand["operations"] = [],
      preconditions: BuiltCommand["preconditions"] = [];
    const write = (fact: Fact, live: Live | undefined, at = from) => {
      if (live) {
        removed.push(live.fact);
        removedValidFrom.push(live.from);
        operations.push({ op: "retract", id: live.id });
        preconditions.push({ _tag: "TripleLive", id: live.id });
      }
      added.push(fact);
      addedValidFrom.push(at);
      operations.push({
        op: "assert",
        entityId: fact.e,
        attribute: fact.a,
        value: fact.v,
        validFrom: at,
      });
    };
    const stamp = { e: ids.placement(i), a: ":placement/stamp", v: integer(state.stamp) };
    write(
      { ...stamp, v: integer(state.stamp + 1) },
      { id: state.stampId, from: state.stampValidFrom, fact: stamp },
    );
    const newAddress = event.correction ? `correction-${hash2(`address:${event.seq}`)[0]}` : null;
    const earliest = newAddress ? from - TRACE_DEFAULTS.correctionBackMs : from;
    if (newAddress) {
      const address = { e: ids.worker(i), a: ":worker/address", v: string(state.address) };
      write(
        { ...address, v: string(newAddress) },
        { id: state.addressId, from: state.addressValidFrom, fact: address },
        earliest,
      );
    }
    for (const row of deepEdits(i, event.seq, event.kind, event.deep)) {
      const old = this.live.get(key(row.e, row.a));
      if (
        row.a === ":task/progress" &&
        event.kind === "person" &&
        !event.deep.fresh &&
        old?.fact.v.value !== String(event.deep.saves - 1)
      )
        throw Error(`Deep save ${event.seq} is missing its planned predecessor`);
      write(row, old);
    }
    if (event.facts !== added.length) throw Error("Deep offer size differs from its frozen intent");
    return {
      commandId: `${runTag}:t${event.seq}`,
      operations,
      preconditions,
      added,
      removed,
      addedValidFrom,
      removedValidFrom,
      newStamp: state.stamp + 1,
      newAddress,
      validRange: { from: earliest, to: null },
    };
  }
}
