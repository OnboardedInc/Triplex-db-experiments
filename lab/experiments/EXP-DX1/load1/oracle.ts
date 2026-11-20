import assert from "node:assert/strict";
import type { CompositionHandle, Receipt } from "../../../bench/lib/composition.ts";
import type { Frame, identity } from "./source.ts";
import { sha } from "./source.ts";

export type Meta = ReturnType<typeof identity>;
export type Seen = { txId: string; position: number; instant: number; ids: string };
function stamp(txId: string, position: number, instant: number, ids: string[]): Seen {
  assert(
    typeof txId === "string" &&
      txId.length &&
      Number.isSafeInteger(position) &&
      position > 0 &&
      Number.isFinite(instant),
  );
  assert(
    ids.every((id) => typeof id === "string" && id.length) && new Set(ids).size === ids.length,
  );
  return { txId, position, instant, ids: sha(JSON.stringify(ids)) };
}
export function ack(frame: Frame, r: Receipt) {
  assert.equal(r.triples.length, frame.operations.length);
  const ids = frame.operations.map((o, i) => {
    const t = r.triples[i]!;
    assert.deepEqual(
      [
        t.entityId,
        t.attribute,
        t.value,
        t.validFrom,
        t.validTo?._tag,
        t.recordedAt,
        (t.txId as any)?.value,
      ],
      [o.entityId, o.attribute, o.value, o.validFrom, "None", r.instant, r.txId],
    );
    return t.id;
  });
  return stamp(r.txId, r.position, r.instant, ids);
}
export function record(frame: Frame, meta: Meta, r: any) {
  assert.deepEqual(
    [r.commandId, r.actor, r.correlationId, r.changes.length],
    [meta.commandId, meta.actor, meta.correlationId, frame.operations.length],
  );
  const ids = frame.operations.map((o, i) => {
    const c = r.changes[i];
    assert.deepEqual(
      [
        c.op,
        c.entityId,
        c.attribute,
        c.value,
        c.validFrom,
        c.validTo,
        c.recordedAt,
        c.assertionTxId,
      ],
      ["assert", o.entityId, o.attribute, o.value, o.validFrom, undefined, r.instant, r.txId],
    );
    return c.tripleId;
  });
  return stamp(r.txId, r.position, r.instant, ids);
}
// [DX-LOAD1] Why: the independent durable journal must name every asserted source value, clock and ID from this claimed command. Rejected: comparing counts, positions or hashes supplied by the writer alone.
export async function lookup(comp: CompositionHandle, frame: Frame, meta: Meta) {
  const found = await comp.transactionByCommand(meta.commandId);
  if (!found.ok) throw Error("Lookup failed: " + found.tag);
  return found.value ? record(frame, meta, found.value) : undefined;
}
