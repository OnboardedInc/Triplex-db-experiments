import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { scaleOwner, scalePredecessors, scaleSeed } from "./ceiling-seed.ts";
import { sha } from "../w1/field/schedule.ts";

const cut = 87002;
const accounts = Array.from({ length: 10 }, (_, i) => i);
const population = "346b8a8f77c1d6374deb7ad140a447d084cfff223a5982f6918f3b4608a97e7e";
const loaderSeal = sha(["deep-field-decision/1", population, 100_000, accounts, 2000]);
const nonce = "11111111-1111-4111-8111-111111111111";
const name = `dx-scale-decision-${nonce}-0`;
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const db = "s2-" + Buffer.from(scope).toString("base64url");
const facts = 162_456_470;
const storage = "pg-data";
const command = `load1/${sha([name, loaderSeal, 2000])}/87001`;
const tx = "_tx/last";

test("copied PGDATA requires both metadata pins, but the dump file is optional", () => {
  const directory = mkdtempSync(join(tmpdir(), "prep1-scale-meta-"));
  function put(file, object) {
    const bytes = JSON.stringify(object);
    writeFileSync(join(directory, file), bytes);
    return createHash("sha256").update(bytes).digest("hex");
  }
  try {
    const source = "a".repeat(40);
    const imagePin = put("image.json", { source, nonce, layout: "pooled", people: 100_000, facts,
      population, verification: "full-command-and-feed-with-pinned-member-probes",
      scopes: [{ name, db, cut, seedCut: cut, accounts }],
      proofs: [{ cut, observed: cut - 1, facts, cursor: 1_000_000, sourceSeal: loaderSeal }],
      membership: [{ db, position: cut, checked: 40, coldFields: 20 }], bytes: 123, sha256: "b".repeat(64) });
    const transferPin = put("transfer.json", { source, nonce, tag: basename(directory), result: "success",
      summaryFiles: { "image.json": imagePin } });
    assert.equal(scaleSeed(directory, imagePin, transferPin, true).storage, storage);
    assert.throws(() => scaleSeed(directory, imagePin, transferPin));
    assert.throws(() => scaleSeed(directory, "f".repeat(64), transferPin, true));
    assert.throws(() => scaleSeed(directory, imagePin, "f".repeat(64), true));
    writeFileSync(join(directory, "seed.pgdump"), Buffer.alloc(123));
    assert.equal(scaleSeed(directory, imagePin, transferPin).storage, undefined);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

const row = (id, entity, attribute, value) => ({ id, entity_id: entity, attribute, value_type: "string",
  value_string: value, value_number: null, value_boolean: null,
  value_datetime: null, value_json: null, recorded_position: cut, valid_from: 0, valid_to: null,
  recorded_at: 2, retracted_at: null, retracted_position: null, retract_tx_id: null,
  schema_version: 1, entity_type: "_Transaction", created_by: null, tx_id: tx });
const journal = encodeRowText(row("command", tx, ":_tx/command-id", command));
const targets = [{ account: 2, person: 7 }];
const seed = { db, scope, head: cut, loaderSeal, storage };

function peer({ badClaim, badMembership, badField, head = cut } = {}) {
  return {
    request: async () => ({ transactions: [[tx, head, [journal]]] }),
    claim: async () => badClaim ? "_tx/unrelated" : tx,
    rows: async (_db, { entityIds, pattern: { attribute } }) => entityIds.map((entity) => {
      if (attribute === ":subject/account")
        return row(entity, entity, attribute, badMembership ? "wrong" : entity.split("/")[1]);
      const field = Number(attribute.at(-1));
      return row(`${entity}-${field}`, entity, attribute, badField ? "wrong" : fieldValue(7, 0, field, 0).value);
    }),
  };
}

test("copied cut reads exact account membership, loader claim and selected fields", async () => {
  const { fields, proof } = await scalePredecessors(peer(), seed, targets);
  assert.deepEqual([proof.members, proof.position, proof.command, proof.claim], [40, cut, command, tx]);
  assert.equal(fields.get(scaleOwner(2, 7)).length, 2);
  for (const mismatch of [{ head: cut - 1 }, { badClaim: true }, { badMembership: true }, { badField: true }])
    await assert.rejects(scalePredecessors(peer(mismatch), seed, targets));
});
