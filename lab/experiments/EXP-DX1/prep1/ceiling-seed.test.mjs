import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { decodeRowText, encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { agedCut, scaleOwner, scalePredecessors, scaleSeed } from "./ceiling-seed.ts";
import { gzipSync } from "node:zlib";
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

// [DX-PREP1] Aged one-billion handoff: AGE1's scorecard bundle pins the aged cut; rows follow AGE1's replay tape.
const pad25 = (n) => String(n).padStart(25, "0");
const hex = (b) => createHash("sha256").update(b).digest("hex");
const perAccount = 20_000, active = 10 * perAccount, tapeSaves = 400_000, agedHead = cut + tapeSaves;
const lastClock = 1_800_000_000_000;
function bundleBytes(imagePin, edit = (b) => b) {
  const checkpoint = Buffer.from("{:observed 400000}\n"), population = Buffer.from("{:active 200000}\n");
  const roster = accounts.map((i) => {
    const account = "account-" + String(i + 1).padStart(3, "0");
    return { account, namespace: "acct/" + account + "/", firstPerson: 0, people: 100_000 };
  });
  const bundle = edit({ version: "triplex-age1-scorecard/1", database: db, nativeId: "native-1", scope,
    physicalT: 62_876_498, logicalHead: agedHead, records: 1_000_002_769, layout: "lean-v3-strict-solo-k",
    journal: "recorded-predecessor-k",
    sourceSeed: { source: "c".repeat(40), "source-seal": loaderSeal, "manifest-sha": imagePin, facts },
    roster, clocks: { seedHead: cut, seedT: 1000, seedRecordedAt: 1_700_000_000_000, roundMs: 28_800_000, active,
      tapeSaves, lastRecordedAt: lastClock, lastOperation: "age-save-" + (tapeSaves - 1),
      lastTransaction: "_tx/T" + pad25(tapeSaves - 1) },
    producer: "d".repeat(40), agingAttempt: nonce, sealSha: "e".repeat(64), datomicSha: "f".repeat(64),
    checkpointSha: hex(checkpoint), populationSha: hex(population),
    replayLedgerGzip: gzipSync(JSON.stringify([checkpoint.toString("base64"), population.toString("base64")])).toString("base64") });
  return Buffer.from(JSON.stringify(bundle, null, 2) + "\n");
}

test("aged handoff is admitted only with its pin and a matching seed, cut and count", () => {
  const directory = mkdtempSync(join(tmpdir(), "prep1-aged-meta-"));
  try {
    const imagePin = "a".repeat(64);
    const file = join(directory, "aged-scorecard.json");
    const write = (bytes) => { writeFileSync(file, bytes); return hex(bytes); };
    const pin = write(bundleBytes(imagePin));
    const aged = agedCut(file, pin, imagePin, scope, db, cut, true);
    assert.deepEqual([aged.seedCut, aged.tapeSaves, aged.active, aged.records], [cut, tapeSaves, active, 1_000_002_769]);
    assert.throws(() => agedCut(file, pin, imagePin, scope, db, cut, false), /stopped PostgreSQL/);
    assert.throws(() => agedCut(file, "0".repeat(64), imagePin, scope, db, cut, true), /digest differs/);
    // One changed byte under the original pin.
    const bytes = bundleBytes(imagePin);
    bytes[bytes.indexOf("62876498")] = "7".charCodeAt(0);
    writeFileSync(file, bytes);
    assert.throws(() => agedCut(file, pin, imagePin, scope, db, cut, true), /digest differs/);
    // Re-pinned edits that a driver could make by mistake.
    for (const edit of [
      (b) => ({ ...b, logicalHead: b.logicalHead + 1 }),
      (b) => ({ ...b, records: 999_999_999 }),
      (b) => ({ ...b, scope: b.scope.replace("test", "prod") }),
      (b) => ({ ...b, sourceSeed: { ...b.sourceSeed, "manifest-sha": "b".repeat(64) } }),
      (b) => ({ ...b, clocks: { ...b.clocks, seedHead: cut + 1 } }),
      (b) => ({ ...b, clocks: { ...b.clocks, lastOperation: "age-save-1" } }),
      (b) => ({ ...b, checkpointSha: "0".repeat(64) }),
      (b) => ({ ...b, version: "triplex-age1-scorecard/0" }),
    ]) {
      const tampered = write(bundleBytes(imagePin, edit));
      assert.throws(() => agedCut(file, tampered, imagePin, scope, db, cut, true));
    }
  } finally {
    rmSync(directory, { recursive: true });
  }
});

// AGE1 ledger: active index i = j*10 + account at local floor(j*99998/perAccount); probes follow at active + account.
const agedValue = (i, n, j) => hex(`edit-${i}-${n}-${j}`).slice(0, 57);
const agedOwners = [
  { account: 2, person: 14, i: 32, n: 32 + active },          // j = 3, edited at offsets 32 and 200,032
  { account: 4, person: 99_998, i: active + 4, n: 399_000 },  // probe person, edited at a probe offset
];
const lastTx = "_tx/T" + pad25(tapeSaves - 1);
function lastJournal({ badLast, canonical, badPayload, foreignRow } = {}) {
  const j = (n, attribute, value, extra = {}) => ({ ...row("B" + pad25((tapeSaves - 1) * 16 + n), lastTx, attribute, value),
    recorded_position: agedHead, recorded_at: lastClock, tx_id: foreignRow && n === 6 ? "_tx/other" : lastTx, ...extra });
  const position = encodeRowText(j(3, ":_tx/position", null, { value_type: "number", value_string: null, value_number: agedHead }));
  // AGE1's fixture encoder: "-" marker and the position as a number (JVM spelling), where the product writes "P" and null.
  const aged = position.replace('P["', '-["')
    .replace('"number",null,null,', `"number",null,${badPayload ? agedHead + 1 : agedHead + ".0"},`);
  return [canonical ? position : aged,
    encodeRowText(j(4, ":_tx/instant", null, { value_type: "datetime", value_string: null, value_datetime: lastClock })),
    encodeRowText(j(6, ":_tx/command-id", badLast ? "age-save-1" : "age-save-" + (tapeSaves - 1)))];
}
function agedPeer({ badValue, badId, notNewest, badLast, staleHead, canonical, badPayload, foreignRow } = {}) {
  const last = lastJournal({ badLast, canonical, badPayload, foreignRow });
  return {
    request: async (_m, _p, { after }) => after === cut - 1 ? { transactions: [[tx, cut, [journal]]] }
      : { transactions: [["_tx/T" + pad25(tapeSaves - 1), staleHead ? agedHead - 1 : agedHead, last],
        ...(notNewest ? [["_tx/later", agedHead + 1, last]] : [])] },
    claim: async (_db, command) => command === "age-save-" + (tapeSaves - 1) ? "_tx/T" + pad25(tapeSaves - 1) : tx,
    rows: async (_db, { entityIds, pattern: { attribute }, basis }) => entityIds.map((entity) => {
      if (attribute === ":subject/account") {
        assert.equal(basis.recordedPosition, cut);
        return row(entity, entity, attribute, entity.split("/")[1]);
      }
      assert.equal(basis.recordedPosition, agedHead);
      const field = Number(attribute.at(-1));
      const owner = agedOwners.find((o) => scaleOwner(o.account, o.person) === entity);
      if (!owner || field === 1 && owner.person === 14)  // field 1 of person 14 kept its seed value
        return row(`${entity}-${field}`, entity, attribute, fieldValue(owner?.person ?? 7, 0, field, 0).value);
      return { ...row("B" + pad25(owner.n * 16 + field + (badId ? 1 : 0)), entity, attribute,
        badValue ? agedValue(owner.i + 1, owner.n, field) : agedValue(owner.i, owner.n, field)),
        recorded_position: cut + owner.n + 1, tx_id: "_tx/T" + pad25(owner.n) };
    }),
  };
}

test("aged cut reads the sealed loader claim, AGE1's last save and exact replayed field rows", async () => {
  const aged = { bundleSha256: "9".repeat(64), seedCut: cut, physicalT: 62_876_498, records: 1_000_002_769,
    nativeId: "native-1", active, people: 100_000, tapeSaves, lastOperation: "age-save-" + (tapeSaves - 1),
    lastTransaction: "_tx/T" + pad25(tapeSaves - 1), lastRecordedAt: lastClock };
  const agedSeed = { ...seed, head: agedHead, aged };
  const targets = [{ account: 2, person: 7 }, ...agedOwners.map(({ account, person }) => ({ account, person }))];
  const { fields, proof } = await scalePredecessors(agedPeer(), agedSeed, targets);
  assert.deepEqual([proof.members, proof.position, proof.aged.position, proof.aged.rows], [40, cut, agedHead, 3]);
  assert.equal(fields.size, 3);
  // The SDK decoder refuses AGE1's position row; this is the refusal seen on the server.
  assert.throws(() => decodeRowText(lastJournal()[0]), /Journal position payload must be null/);
  await scalePredecessors(agedPeer({ canonical: true }), agedSeed, targets);
  for (const mismatch of [{ badValue: true }, { badId: true }, { notNewest: true }, { badLast: true }, { staleHead: true },
    { badPayload: true }, { foreignRow: true }])
    await assert.rejects(scalePredecessors(agedPeer(mismatch), agedSeed, targets));
  // The fresh seed's checks still refuse a row written after cut 87,002.
  await assert.rejects(scalePredecessors(agedPeer(), { ...seed, head: agedHead }, targets));
});
