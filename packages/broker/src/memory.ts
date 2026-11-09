import { isPatternVariable } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { BrokerReplica, ReplicaMarker } from "./replica.js";
import type { BrokerReadDriver } from "./StorageAdapter.js";
import { packValue } from "./value.js";

/** Diagnostic memory replica. It supplies no disk durability or engine-latency evidence. */
export class MemoryBrokerReplica implements BrokerReplica, BrokerReadDriver {
  readonly maxFramesPerApply = 1;
  current: ReplicaMarker = { position: 0, epoch: 0, incarnation: "" };
  rows = new Map<string, TripleRow>();
  unavailable = false;
  private check() {
    if (this.unavailable)
      throw Object.assign(new Error("Replica unavailable"), { code: "ECONNREFUSED" });
  }
  private same(a: ReplicaMarker, b: ReplicaMarker) {
    return (
      a.position === b.position &&
      a.epoch === b.epoch &&
      (a.incarnation ?? "") === (b.incarnation ?? "")
    );
  }
  initialize = async () => {};
  isUnreachable = (error: unknown) => (error as { code?: unknown })?.code === "ECONNREFUSED";
  marker = async () => {
    this.check();
    return { ...this.current };
  };
  fence: BrokerReplica["fence"] = async (from, epoch, incarnation) => {
    this.check();
    if (!this.same(from, this.current)) throw new Error("Memory fence guard failed");
    this.current = { ...this.current, epoch, incarnation };
  };
  publish: BrokerReplica["publish"] = async (from, to, members) => {
    this.check();
    // [EXP-P2B] Why: model one atomic guarded frame, including an already-applied retry.
    // Rejected: overwriting a changed marker (would conceal lost-response/fencing bugs offline).
    if (!this.same(from, this.current)) return {};
    const next = new Map(this.rows);
    for (const member of members)
      for (const row of member.rows) next.set(row.id, structuredClone(row));
    this.rows = next;
    this.current = { ...to };
    return {};
  };
  read: BrokerReadDriver["read"] = async ({ pattern, id, entities, signal }) => {
    signal?.throwIfAborted();
    this.check();
    const marker = { ...this.current };
    const rows = [...this.rows.values()].filter(
      (row) =>
        (id === undefined || row.id === id) &&
        (entities === undefined || entities.includes(row.entity_id)) &&
        (pattern.entityId === undefined ||
          isPatternVariable(pattern.entityId) ||
          row.entity_id === pattern.entityId) &&
        (pattern.attribute === undefined ||
          isPatternVariable(pattern.attribute) ||
          row.attribute === pattern.attribute) &&
        (pattern.entityType === undefined || row.entity_type === pattern.entityType) &&
        (pattern.value === undefined ||
          isPatternVariable(pattern.value) ||
          Object.entries(packValue(pattern.value)).every(
            ([key, value]) => row[key as keyof TripleRow] === value,
          )),
    );
    return { marker, rows: structuredClone(rows) };
  };
}
