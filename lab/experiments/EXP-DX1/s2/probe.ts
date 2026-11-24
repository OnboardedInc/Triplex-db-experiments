// [DX-S2] Probe: which writer takes the product's saves of one subject, and what the SDK sends. Diagnostic.
//   node --experimental-transform-types lab/experiments/EXP-DX1/s2/probe.ts <gateway url> [options json]
import { randomUUID } from "node:crypto";
import { openProduct } from "./product.ts";

const url = process.argv[2]!;
const options = JSON.parse(process.argv[3] ?? "{}");
const store = await openProduct(url, `s2-probe-${randomUUID()}`, options);
const subject = "task/probe-1";
const str = (value: string) => ({ type: "string", value });
const seed = await store.transact(
  ["a", "b", "c", "d"].map((f) => ({ op: "assert", entityId: subject, attribute: `:task/${f}`, value: str(`seed-${f}`) })),
  { commandId: `seed-${randomUUID()}` },
);
const live = new Map<string, string>(seed.triples.map((t: any) => [t.attribute, t.id]));
const show = (label: string) => {
  const w = store.wire.at(-1)!;
  console.log(label, JSON.stringify({
    entities: w.input.entities, sourceK: w.input.sourceK, handle: Boolean(w.input.handle), live: w.input.live?.length,
    newIds: w.input.newIds?.length, first: w.input.newIds?.[0], journal: w.input.claims?.[0]?.txId, clientId: w.input.clientId,
    scopeWide: w.input.scopeWide, subjectSave: w.ack?.subjectSave ?? null, ordered: w.ack?.subjectOrderedIds ?? null,
    writer: w.ack?.writePath?.function ?? null, error: w.error ?? null,
  }));
};
show("seed");
for (const [label, fields] of [["replace-1", ["a"]], ["replace-2", ["a", "b"]], ["replace-1-again", ["c"]]] as const) {
  const ops = fields.flatMap((f) => [
    { op: "retract", id: live.get(`:task/${f}`) },
    { op: "assert", entityId: subject, attribute: `:task/${f}`, value: str(`${label}-${f}`) },
  ]);
  const result = await store.transact(ops, { commandId: `${label}-${randomUUID()}` });
  for (const t of result.triples) live.set(t.attribute, t.id);
  show(label);
}
await store.close();
