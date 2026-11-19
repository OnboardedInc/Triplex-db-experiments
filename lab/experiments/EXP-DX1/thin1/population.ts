import { encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import type { ReplicaSource } from "../../../../packages/datomic/dist/index.js";

// [DX-THIN1] Why: applicant-import answers are valid W0 facts, including owned references, without starting a workflow.
// Rejected: eight invented W0 attributes (the domain oracle rejects unknown attributes).
export const width = 8;
export const batchSize = 32;
export const person = (i: number) => "pl:" + String(i).padStart(8, "0");
export const seedPosition = (i: number) => 1 + Math.floor(i / batchSize);
export const seedHead = (size: number) => seedPosition(size - 1);
export const firstValid = Date.UTC(2026, 0, 1);
export const txId = (p: number) => "_tx/" + String(p).padStart(26, "0");
export const clock = (position: number) => firstValid + position;

export function intent(i: number, updated = false) {
  const root = person(i);
  const fields = ["source-key", "import-batch", "external-status"];
  const facts = fields.flatMap((field, n) => {
    const id = root + "/ans:" + n;
    return [
      { entityId: root, attribute: "answers", value: { type: "ref", value: id } },
      { entityId: id, attribute: "field", value: { type: "string", value: field } },
      ...(n === 2 ? [] : [{ entityId: id, attribute: "value", value: { type: "string", value: field + "-" + i } }]),
    ];
  });
  return (updated ? [{ entityId: root, attribute: "bgcStatus", value: { type: "string", value: "consider" } }] : facts)
    .map(f => ({ op: "assert" as const, ...f, validFrom: firstValid + (updated ? 100 : 0) }));
}

export function fixtureRows(i: number, position: number, updated = false) {
  return intent(i, updated).map((op, n) => ({
    ...op, id: `thin-${i}-${updated ? "u" : "s"}-${n}`, position,
    publicMetadata: { recordedAt: clock(position), createdBy: "import", entityType: null, schemaVersion: 1, txId: txId(position) },
  }));
}
type Row = ReturnType<typeof fixtureRows>[number];
const wire = (r: Row) => encodeRowText({
  recorded_position: r.position, id: r.id, entity_id: r.entityId, attribute: r.attribute,
  value_type: r.value.type, value_string: r.value.value, value_number: null, value_boolean: null,
  value_datetime: null, value_json: null, valid_from: r.validFrom, valid_to: null,
  recorded_at: r.publicMetadata.recordedAt, created_by: "import", entity_type: null, schema_version: 1,
  tx_id: r.publicMetadata.txId, retracted_at: null, retracted_position: null, retract_tx_id: null,
} as Parameters<typeof encodeRowText>[0]);

// [DX-THIN1] Why: a deterministic wire source keeps simulated storage out of the reader's RSS.
// Rejected: charging an in-memory mock database or a generator-owned population array to each reading process.
export function fixture(size: number) {
  const base = seedHead(size);
  let head = base;
  let rowRequests = 0;
  const source: ReplicaSource = {
    async head() { return head; },
    async feed(after, limit) {
      if (after < base) throw Error("Thin fixture feed starts at sealed seed");
      const transactions = Array.from({ length: Math.min(limit, head - after) }, (_, n) => {
        const position = after + n + 1;
        return { position, entities: [person((position - base - 1) * 50)] };
      });
      return { head, transactions };
    },
    async page(roots, basis, need) {
      rowRequests++;
      const p = basis.recordedPosition;
      if (p === undefined || p > head || p < 0) throw Error("Unavailable fixture cut");
      const entities = new Map<string, [string, number, string[]]>();
      const closures: [string, string[]][] = [];
      for (const root of roots) {
        const i = Number(root.split("/")[0]!.slice(3)), seed = seedPosition(i);
        const update = base + i / 50 + 1;
        const rows = i < size && seed <= p ? fixtureRows(i, seed) : [];
        if (rows.length && i % 50 === 0 && update <= p) rows.push(...fixtureRows(i, update, true));
        const ids = new Set([root]);
        for (const id of ids) {
          const body = rows.filter(r => r.entityId === id);
          entities.set(id, [id, body.reduce((m, r) => Math.max(m, r.position), 0), body.map(wire)]);
          if (!need) for (const r of body) if (r.value.type === "ref" && r.validFrom <= basis.validAt) ids.add(r.value.value);
        }
        closures.push([root, [...ids]]);
      }
      return { position: p, t: String(p), reset: true, closures, entities: [...entities.values()] };
    },
  };
  return { source, writes(count: number) { head = base + count; }, requests: () => rowRequests };
}
