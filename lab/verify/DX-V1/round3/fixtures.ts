import fs from "node:fs";
import { Option } from "effect";
import { packEntity } from "../../../../packages/datomic/dist/index.js";
import { encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { decodeEntity } from "../../../../packages/datomic/dist/reach.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { prepareEntity } from "../../../bench/lib/replica-reads.ts";
import { observe, R } from "../../../bench/lib/observe.ts";
import { Model } from "../../../bench/lib/model.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { ownFacts, sharedFacts, accountsFor, accountOfSubject } from "../../../bench/lib/world.ts";

export const TX = "_tx/00000000000000000000000001";
export const result = (triples: readonly any[]) => ({
  triples,
  entities: 1,
  depth: 0,
  roundTrips: 1,
  route: "source",
  language: "fixture",
  waitedMs: 0,
});
export function wire(
  value = "before",
  p = 1,
  time = p * 100,
  from = 0,
  to: number | null = null,
  fields: any = {},
) {
  return encodeRowText({
    id: `r-${p}`,
    entity_id: "root",
    attribute: ":test/value",
    value_type: "string",
    value_string: value,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_position: p,
    recorded_at: time,
    valid_from: from,
    valid_to: to,
    created_by: "writer",
    entity_type: "Subject",
    schema_version: 1,
    tx_id: TX,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    ...fields,
  } as any);
}
export const packed = (texts: string[], p = 1, root = "root", revision = p) =>
  prepareEntity(root, packEntity(revision, decodeReplicaRows(root, revision, texts, p)));
export const gatewayRows = (texts: string[], p = 1, root = "root") =>
  decodeEntity(root, texts.length ? p : 0, texts).rows;

// [DX-V1-R2] Why: exercise the actual judge without running driver.main or opening services.
// Rejected: copying the acceptance logic into a reviewer approximation.
export function judgeFor(model: Model, expectations = new ExpectationCache(model)) {
  const source = fs.readFileSync(new URL("../../../bench/driver.ts", import.meta.url), "utf8");
  const body = source.slice(
    source.indexOf("function judgeRead("),
    source.indexOf("// [DX-R3] Why: one byte per verdict"),
  );
  return new Function(
    "expectations",
    "model",
    "R",
    body.replace("r: ReadRecord", "r") + "; return judgeRead;",
  )(expectations, model, R);
}
export function record(
  rows: readonly any[],
  recordedAt = 100,
  validAt = 10,
  error: string | null = null,
) {
  const o = observe(result(rows));
  return [
    0,
    0,
    recordedAt,
    validAt,
    1,
    1,
    o.stamp,
    o.facts,
    o.digest,
    o.bytes,
    0,
    0,
    error,
    0,
    1,
    0,
    -1,
    0,
    "replica",
    "packed",
    0,
  ];
}
export function seeded(modify: (row: any, i: number) => any = (r) => r) {
  const facts = [
    ...ownFacts(0, accountsFor(2000)),
    ...sharedFacts(accountOfSubject(0, accountsFor(2000))),
  ];
  const rows = facts.map((f, i) =>
    modify(
      {
        id: `seed-${i}`,
        entityId: f.e,
        attribute: f.a,
        value: f.v,
        recordedAt: 100,
        validFrom: 0,
        validTo: Option.none(),
        createdBy: Option.some("writer"),
        entityType: Option.none(),
        schemaVersion: Option.some(1),
        txId: Option.some(TX),
        retractedAt: Option.none(),
        retractTxId: Option.none(),
      },
      i,
    ),
  );
  const operations = rows.map((r) => ({
    op: "assert",
    entityId: r.entityId,
    attribute: r.attribute,
    value: r.value,
    validFrom: r.validFrom,
    ...(Option.isSome(r.validTo) ? { validTo: r.validTo.value } : {}),
  }));
  const model = new Model(2000);
  model.bindReceipt(operations, { position: 1, instant: 100, txId: TX, triples: rows }, "writer");
  return { model, rows, operations };
}
