import type { OutboxStore } from "./w0-outbox.ts";
import { canonical, sha256, V_W0, W0, type WorldRow } from "./w0-world.ts";

export type GuardLayout = "full-state" | "guard-fact";
type Fact = Pick<WorldRow, "attribute" | "value" | "id">;

// [DX-ACT1] Why: subjects and sequences have unbounded integer tokens in W0 §8.8. Rejected: rounding once in JSON.parse and converting the rounded value back to BigInt.
export function parseOutbox(bytes: string) {
  return JSON.parse(bytes, ((key: string, value: unknown, ctx: { source?: string }) => {
    if ((key === "tx" || key === "seq") && typeof value === "number") return BigInt(ctx.source!);
    return value;
  }) as Parameters<typeof JSON.parse>[1]);
}

export function storedOutbox(rows: readonly Fact[], subject: string): W0.OutboxState {
  function single(attribute: string) {
    const facts = rows.filter((r) => r.attribute === attribute);
    if (facts.length > 1) throw Error("Duplicate outbox " + attribute);
    return facts.length ? parseOutbox(facts[0]!.value.value) : undefined;
  }
  const body: W0.OutboxState = single("p5/state") ?? W0.EMPTY_OUTBOX;
  const guard: W0.SubjectState | undefined = single("p5/guard");
  if (guard && guard.subject !== subject) throw Error("Wrong subject guard");
  if (body.subjects.length > 1 || body.subjects.some((s) => s.subject !== subject))
    throw Error("Wrong outbox state owner");
  return guard ? { items: body.items, pending: body.pending, subjects: [guard] } : body;
}

export async function guardedFrame(
  comp: OutboxStore,
  records: readonly W0.EvaluationRecord[],
  entity: (subject: string) => string,
  layout: GuardLayout,
  beforeSubmit: () => Promise<void>,
) {
  const ids = records.map((r) => entity(r.subject));
  const commandId = entity("act1-" + sha256(canonical({ layout, records })));
  const started = performance.now();
  let stateReadMs = 0, stateReads = 0, commandReads = 0, publishCommitMs = 0, conflicts = 0;
  const lookup = async () => {
    commandReads++;
    const found = await comp.transactionByCommand(commandId);
    if (!found.ok) throw Error(found.tag);
    if (!found.value) return;
    const claim = found.value;
    if (claim.commandId !== commandId || !claim.txId || !Number.isSafeInteger(claim.position))
      throw Error("Invalid outbox claim identity");
    const asserts = claim.changes?.filter((t: any) => t.op === "assert") ?? claim.triples;
    if (!Array.isArray(asserts) || !asserts.length || asserts.some((t) => !ids.includes(t.entityId)))
      throw Error("Invalid outbox claim assertions");
    const deliveries = asserts.filter((t) => t.attribute === "p5/deliveries")
      .flatMap((t) => parseOutbox(t.value.value)) as W0.Delivery[];
    return { deliveries, retry: true, changed: new Set(asserts.map((t) => t.entityId)).size,
      committed: true, txId: claim.txId as string, position: claim.position as number };
  };
  for (;;) {
    const recovered = await lookup();
    if (recovered) return recovered;
    const read = performance.now();
    const basis = { position: await comp.currentPosition(), validAt: V_W0 };
    const page = await comp.sweepPage(ids, basis);
    if (page.reportedBasis?.position !== basis.position || page.reportedBasis.validAt !== basis.validAt)
      throw Error("Outbox state read at wrong cut");
    stateReads += page.roundTrips;
    stateReadMs += performance.now() - read;
    const operations: any[] = [], preconditions = [], deliveries: W0.Delivery[] = [];
    for (const [i, record] of records.entries()) {
      const entityId = ids[i]!;
      const old = page.rows.filter((r) => r.entityId === entityId);
      const prior = storedOutbox(old, record.subject);
      const next = W0.publish(prior, [record]);
      if (canonical(prior) === canonical(next.state)) continue;
      preconditions.push({ _tag: "EntityState", entityId, tripleIds: old.map((r) => r.id).sort() });
      const replace = (attribute: string, value?: unknown) => {
        for (const row of old.filter((r) => r.attribute === attribute)) operations.push({ op: "retract", id: row.id });
        if (value !== undefined) operations.push({ op: "assert", entityId, attribute, validFrom: 0,
          value: { type: "string", value: canonical(value) } });
      };
      if (layout === "full-state") {
        replace("p5/guard");
        replace("p5/state", next.state);
        replace("p5/deliveries", next.deliveries);
      } else {
        replace("p5/guard", next.state.subjects[0]);
        if (next.deliveries.length || canonical(prior.items) !== canonical(next.state.items)) {
          replace("p5/state", { items: next.state.items, pending: next.state.pending, subjects: [] });
          replace("p5/deliveries", next.deliveries);
        }
      }
      deliveries.push(...next.deliveries);
    }
    if (!operations.length) return (await lookup()) ?? { deliveries, retry: false, changed: 0, committed: false };
    // [DX-ACT1] Why: the exact fact-ID set protects first creation and guard-only updates. Rejected: TripleLive on the old rows (absence would have no precondition).
    await beforeSubmit();
    const submitted = performance.now();
    const result = await comp.transact(operations, { commandId, actor: "p5-publisher", preconditions });
    publishCommitMs += performance.now() - submitted;
    if (result.ok) return {
      deliveries, retry: false, changed: preconditions.length, committed: true, txId: result.value.txId, position: result.value.position,
      timing: { receiptTxId: result.value.txId, receiptPosition: result.value.position,
        publishCommitMs, stateReadMs, stateReads, commandReads, conflicts,
        operations: operations.length, preconditions: preconditions.length,
        payloadBytes: Buffer.byteLength(JSON.stringify(operations)), wallMs: performance.now() - started },
    };
    const reasons = result.error?.reasons;
    const tag = result.tag === "Unknown" && reasons?.length === 1 && reasons[0]._tag === "Fail"
      ? reasons[0].error?._tag : result.tag;
    if (tag !== "CommandAlreadyCommittedError" && tag !== "TransactionConflictError")
      throw Error("Guarded publication failed: " + tag);
    if (++conflicts > 16) throw Error("Guarded publication contention limit");
  }
}
