import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, sha256 } from "./w0-world.ts";
export async function publishRecords(
  comp: CompositionHandle,
  records: readonly W0.EvaluationRecord[],
) {
  if (records.length > 64 || new Set(records.map((r) => r.subject)).size !== records.length)
    throw new Error("outbox frame must contain <=64 distinct subjects");
  const commandId = "p5:outbox:" + sha256(canonical(records));
  const existing = await comp.transactionByCommand(commandId);
  if (!existing.ok) throw new Error(existing.tag);
  const recover = (triples: readonly any[]) =>
    triples
      .filter((t) => t.attribute === "p5/deliveries")
      .flatMap((t) => JSON.parse(t.value.value));
  if (existing.value)
    return {
      deliveries: recover(
        existing.value.changes?.filter((t: any) => t.op === "assert") ??
          existing.value.triples ??
          [],
      ),
      retry: true,
    };
  const operations: any[] = [],
    preconditions: any[] = [],
    deliveries: any[] = [];
  const batch = comp.pullMany
    ? await comp.pullMany(
        records.map((r) => "p5:outbox:" + r.subject),
        { validAt: V_PUBLIC },
      )
    : undefined;
  for (const record of records) {
    const entityId = "p5:outbox:" + record.subject;
    const old = batch
      ? { triples: batch.get(entityId) ?? [] }
      : await comp.pull(entityId, {
          recordedAt: Number.MAX_SAFE_INTEGER,
          validAt: V_PUBLIC,
        });
    const previous = old.triples.find((t) => t.attribute === "p5/state");
    const state = previous ? reviveState(JSON.parse(previous.value.value)) : W0.EMPTY_OUTBOX;
    const result = W0.publish(state, [record]);
    deliveries.push(...result.deliveries);
    for (const t of old.triples) {
      operations.push({ op: "retract", id: t.id });
      preconditions.push({ _tag: "TripleLive", id: t.id });
    }
    operations.push({
      op: "assert",
      entityId,
      attribute: "p5/state",
      value: { type: "string", value: canonical(result.state) },
      validFrom: 0,
    });
    operations.push({
      op: "assert",
      entityId,
      attribute: "p5/deliveries",
      value: { type: "string", value: canonical(result.deliveries) },
      validFrom: 0,
    });
  }
  // [EXP-P5] Why: state, per-item sequence and deliveries commit in the same frame with command-id deduplication. Rejected: updating an in-memory outbox before ACK (loses work on resume).
  const r = await comp.transact(operations, { commandId, actor: "p5-publisher", preconditions });
  if (!r.ok) throw new Error("outbox publication failed: " + r.tag);
  return {
    deliveries,
    retry: false,
    receipt: r.value,
    operations,
    meta: { commandId, actor: "p5-publisher", preconditions },
  };
}
const V_PUBLIC = Date.parse("2026-11-04T12:00:00Z");
function reviveState(s: any): W0.OutboxState {
  return {
    ...s,
    items: s.items.map((i: any) => ({ ...i, seq: BigInt(i.seq) })),
    pending: s.pending.map((i: any) => ({ ...i, seq: BigInt(i.seq) })),
    subjects: s.subjects.map((i: any) => ({ ...i, basis: { ...i.basis, tx: BigInt(i.basis.tx) } })),
  };
}
