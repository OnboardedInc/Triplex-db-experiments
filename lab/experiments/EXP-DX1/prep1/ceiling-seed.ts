import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldCount, fieldValue, taskId, taskSerial } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { sha } from "../w1/field/schedule.ts";

type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
type ScaleSeed = {
  scope: string;
  db: string;
  head: number;
  facts: number;
  imageSha256: string;
  transferSha256: string;
  dumpSha256: string;
  loaderSeal: string;
  storage?: "pg-data";
  aged?: AgedCut;
};
type AgedCut = {
  bundleSha256: string;
  seedCut: number;
  physicalT: number;
  records: number;
  nativeId: string;
  active: number;
  people: number;
  tapeSaves: number;
  lastOperation: string;
  lastTransaction: string;
  lastRecordedAt: number;
};
export const scaleAccount = (a: number) => "account-" + String(a + 1).padStart(3, "0");
export const scaleOwner = (a: number, i: number) => "acct/" + scaleAccount(a) + "/" + taskId(i, 0);
export const scaleFields = [":task/field-0", ":task/field-1"] as const;

// [DX-PREP1] Why: adopt the held SCALE1 loader's actual bytes and cut.
// Rejected: treating a matching fact count or the old small campaign's seal as the full-size seed.
export function scaleSeed(dir: string, imagePin: string, transferPin: string, pgData = false,
  agedFile?: string, agedPin?: string): ScaleSeed {
  function pinned(name: string, expected: string) {
    assert.match(expected, /^[0-9a-f]{64}$/);
    const bytes = readFileSync(path.join(dir, name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
    return JSON.parse(bytes.toString());
  }
  const image = pinned("image.json", imagePin);
  const transfer = pinned("transfer.json", transferPin);
  assert.deepEqual(
    [
      transfer.source,
      transfer.nonce,
      transfer.result,
      transfer.summaryFiles["image.json"],
      transfer.tag,
    ],
    [image.source, image.nonce, "success", imagePin, path.basename(dir)],
  );
  assert.match(image.source, /^[0-9a-f]{40}$/);
  assert.match(image.nonce, /^[0-9a-f-]{36}$/);
  assert.deepEqual(
    [image.layout, image.verification, image.people, image.facts],
    ["pooled", "full-command-and-feed-with-pinned-member-probes", 100_000, 162_456_470],
  );
  assert.equal(
    image.population,
    "346b8a8f77c1d6374deb7ad140a447d084cfff223a5982f6918f3b4608a97e7e",
  );
  const [scope] = image.scopes;
  const [proof] = image.proofs;
  assert.equal(image.scopes.length, 1);
  assert.equal(image.proofs.length, 1);
  const roster = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(scope.accounts, roster);
  assert.equal(scope.name, "dx-scale-decision-" + image.nonce + "-0");
  const key = JSON.stringify(["triplex-scope-v1", "test", "test", scope.name, 0]);
  assert.equal(scope.db, "s2-" + Buffer.from(key).toString("base64url"));
  const loaderSeal = sha(["deep-field-decision/1", image.population, image.people, roster, 2000]);
  assert.deepEqual(
    [
      scope.cut,
      scope.seedCut,
      proof.cut,
      proof.observed,
      proof.facts,
      proof.cursor,
      proof.sourceSeal,
    ],
    [87002, 87002, 87002, 87001, image.facts, 1_000_000, loaderSeal],
  );
  assert.match(image.sha256, /^[0-9a-f]{64}$/);
  assert(Number.isSafeInteger(image.bytes) && image.bytes > 0);
  if (pgData) {
    assert.deepEqual(image.membership, [{ db: scope.db, position: scope.cut, checked: 40, coldFields: 20 }]);
  } else {
    assert.equal(statSync(path.join(dir, "seed.pgdump")).size, image.bytes);
  }
  const aged = agedFile === undefined && agedPin === undefined
    ? undefined : agedCut(agedFile!, agedPin!, imagePin, key, scope.db, scope.cut, pgData);
  return {
    scope: key,
    db: scope.db,
    head: aged ? aged.seedCut + aged.tapeSaves : scope.cut,
    facts: image.facts,
    imageSha256: imagePin,
    transferSha256: transferPin,
    dumpSha256: image.sha256,
    loaderSeal,
    ...(pgData ? { storage: "pg-data" } : {}),
    ...(aged ? { aged } : {}),
  };
}

const pad25 = (n: number) => String(n).padStart(25, "0");

// [DX-PREP1] Why: admit AGE1's sealed one-billion cut through the same pinned handoff the v0.1 scorecard reads.
// Rejected: a bare head or record count from the driver, or accepting the fresh seed's cut 87,002 as the live head.
export function agedCut(file: string, pin: string, imagePin: string, key: string, db: string, seedCut: number,
  pgData: boolean): AgedCut {
  assert.match(pin, /^[0-9a-f]{64}$/);
  assert(pgData, "The aged cut is admitted only from a stopped PostgreSQL directory");
  const bytes = readFileSync(file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pin, "AGE1 handoff digest differs");
  const b = JSON.parse(bytes.toString());
  assert.equal(b.version, "triplex-age1-scorecard/1");
  assert.equal(b.sourceSeed?.["manifest-sha"], imagePin);
  assert.deepEqual([b.scope, b.database, b.layout], [key, db, "lean-v3-strict-solo-k"]);
  assert(["classic-k", "recorded-predecessor-k"].includes(b.journal));
  assert(/^[0-9a-f]{40}$/.test(b.producer) && /^[0-9a-f-]{36}$/.test(b.agingAttempt) && /^[0-9a-f]{64}$/.test(b.sealSha));
  assert(typeof b.nativeId === "string" && b.nativeId.length > 0);
  // The replay ledgers travel inside the bundle. Their digests are the ones the aging seal recorded.
  const ledgers = JSON.parse(gunzipSync(Buffer.from(b.replayLedgerGzip, "base64"),
    { maxOutputLength: 256 * 1024 * 1024 }).toString()).map((x: string) => Buffer.from(x, "base64"));
  assert.equal(ledgers.length, 2);
  assert.deepEqual(ledgers.map((x: Buffer) => createHash("sha256").update(x).digest("hex")),
    [b.checkpointSha, b.populationSha]);
  const roster = Array.from({ length: 10 }, (_, i) => {
    const account = scaleAccount(i);
    return { account, namespace: "acct/" + account + "/", firstPerson: 0, people: 100_000 };
  });
  assert.deepEqual(b.roster, roster);
  const c = b.clocks;
  assert.equal(c.seedHead, seedCut);
  assert(Number.isSafeInteger(c.tapeSaves) && c.tapeSaves > 7);
  assert.equal(b.logicalHead, c.seedHead + c.tapeSaves);
  assert(Number.isSafeInteger(b.physicalT) && b.physicalT > 0);
  assert(Number.isSafeInteger(b.records) && b.records >= 1_000_000_000);
  assert(Number.isSafeInteger(c.active) && c.active > 0 && c.active % 10 === 0 && c.active / 10 <= 99_998);
  assert.equal(c.lastOperation, "age-save-" + (c.tapeSaves - 1));
  assert.equal(c.lastTransaction, "_tx/T" + pad25(c.tapeSaves - 1));
  assert(Number.isFinite(c.lastRecordedAt) && c.lastRecordedAt > c.seedRecordedAt);
  return { bundleSha256: pin, seedCut, physicalT: b.physicalT, records: b.records, nativeId: b.nativeId,
    active: c.active, people: 100_000, tapeSaves: c.tapeSaves, lastOperation: c.lastOperation,
    lastTransaction: c.lastTransaction, lastRecordedAt: c.lastRecordedAt };
}

// [DX-PREP1] Why: AGE1 edits the first task's fields of a fixed, interleaved sample of each account. Its replay tape
// fixes every such row's ID, value and position, so a current row is checked against those exact bytes.
// Rejected: accepting any newer row (a different or tampered database would pass) or reusing the revision 0 value.
export function agedFieldRow(aged: AgedCut, account: number, person: number, field: number, row: Row) {
  const saves = row.recorded_position - aged.seedCut - 1;
  assert(Number.isSafeInteger(saves) && saves >= 0 && saves < aged.tapeSaves, "aged row outside the replay tape");
  const perAccount = aged.active / 10;
  const local = (i: number) => Math.floor(Math.floor(i / 10) * (aged.people - 2) / perAccount);
  const slot = saves % aged.active;
  const candidates = [
    ...(slot % 10 === account && local(slot) === person ? [slot] : []),
    // AGE1's ten probe people (one per account, local people - 2) follow the active sample in its ledger.
    ...(person === aged.people - 2 ? [aged.active + account] : []),
  ];
  const expected = (i: number) => createHash("sha256").update(`edit-${i}-${saves}-${field}`).digest("hex").slice(0, 57);
  assert(candidates.some((i) => row.value_string === expected(i)), "aged field value differs from the replay tape");
  assert.equal(row.id, "B" + pad25(saves * 16 + field));
  assert.equal(row.tx_id, "_tx/T" + pad25(saves));
}

// [DX-REAL2] Why: a production-shaped save edits up to all of task 0's seeded fields, so read every one of them.
// Rejected: reading only the two fields Saturday's tape edits and asserting new rows over seeded values.
export const productionSeedFields = Array.from({ length: 14 }, (_, n) => `:task/field-${n}`);
export const seededFieldCount = (person: number) => fieldCount(taskSerial(person, 0));

export async function scalePredecessors(
  reader: DatomicClient,
  seed: ScaleSeed,
  targets: readonly { account: number; person: number }[],
  attributes: readonly string[] = scaleFields,
) {
  const seedCut = seed.aged?.seedCut ?? seed.head;
  const result = await reader.request<{ transactions: [string, number, string[]][] }>(
    "POST",
    "/v2/db/" + seed.db + "/transactions",
    { after: seedCut - 1, limit: 1 },
  );
  const entry = result.transactions[0];
  assert(entry && result.transactions.length === 1);
  const [id, position, text] = entry;
  assert.equal(position, seedCut);
  const command = text
    .map(decodeRowText)
    .find((r) => r.attribute === ":_tx/command-id")?.value_string;
  const prefix = "load1/" + sha([JSON.parse(seed.scope)[3], seed.loaderSeal, 2000]) + "/";
  assert(
    typeof command === "string" &&
      command.startsWith(prefix) &&
      /^[0-9]+$/.test(command.slice(prefix.length)),
  );
  const claim = await reader.claim(seed.db, command, seedCut);
  assert.equal(claim, id);
  let agedProof: { position: number; command: string; claim: string; journalSha: string } | undefined;
  if (seed.aged) {
    // [DX-PREP1] Why: the live head must be AGE1's last replayed save, at its pinned clock, not a later or earlier cut.
    // Rejected: comparing the head number alone (any database at that height would pass).
    const last = await reader.request<{ transactions: [string, number, string[]][] }>(
      "POST", "/v2/db/" + seed.db + "/transactions", { after: seed.head - 1, limit: 2 });
    assert.equal(last.transactions.length, 1, "aged head is not the newest transaction");
    const [lastId, lastPosition, lastText] = last.transactions[0]!;
    assert.deepEqual([lastId, lastPosition], [seed.aged.lastTransaction, seed.head]);
    const row = lastText.map(decodeRowText).find((r) => r.attribute === ":_tx/command-id");
    assert.deepEqual([row?.value_string, row?.recorded_at], [seed.aged.lastOperation, seed.aged.lastRecordedAt]);
    assert.equal(await reader.claim(seed.db, seed.aged.lastOperation, seed.head), lastId);
    agedProof = { position: lastPosition, command: seed.aged.lastOperation, claim: lastId, journalSha: sha(lastText) };
  }

  const fields = new Map<string, Row[]>();
  const owners = [
    ...new Map(targets.map(({ account, person }) => [scaleOwner(account, person), [account, person] as const])),
  ];
  let aged = 0;
  const seedBasis = { recordedPosition: seedCut, validAt: SEED_VALID_FROM };
  const basis = { recordedPosition: seed.head, validAt: SEED_VALID_FROM };
  let members = 0;
  if (seed.storage === "pg-data") {
    const expected = Array.from({ length: 10 }, (_, account) => {
      const key = scaleAccount(account);
      return [0, 1, 257, 99_999].map((person) => ["acct/" + key + "/" + ids.placement(person), key]);
    }).flat();
    const rows = await reader.rows(seed.db, {
      entityIds: expected.map(([entity]) => entity!),
      pattern: { attribute: ":subject/account" },
      basis: seedBasis,
    });
    assert.deepEqual(rows.map((r) => [r.entity_id, r.value_string]).sort(), expected.sort());
    assert(rows.every((r) => r.id && r.recorded_position > 0 && r.recorded_position <= seedCut));
    members = rows.length;
  }
  // Use the read peer's cache for the immutable predecessors. The writer and transactor still see the wide tape.
  for (let i = 0; i < owners.length; i += 96) {
    const batch = owners.slice(i, i + 96);
    const byEntity = new Map<string, Row[]>();
    for (const attribute of attributes) {
      const rows = await reader.rows(seed.db, {
        entityIds: batch.map(([e]) => e),
        pattern: { attribute },
        basis,
      });
      for (const row of rows) {
        const prior = byEntity.get(row.entity_id) ?? [];
        prior.push(row);
        byEntity.set(row.entity_id, prior);
      }
    }
    for (const [e, [account, person]] of batch) {
      const prior = byEntity.get(e);
      const expected = attributes === scaleFields ? scaleFields.length : seededFieldCount(person);
      assert(prior && prior.length === expected);
      assert(!seed.aged || attributes === scaleFields, "production-shaped tapes run on the fresh cut only");
      for (const [n, a] of attributes.slice(0, expected).entries()) {
        const row: Row = prior[n]!;
        assert.equal(row.attribute, a);
        assert(row.id && row.recorded_position > 0 && row.recorded_position <= seed.head);
        if (row.recorded_position <= seedCut) assert.equal(row.value_string, fieldValue(person, 0, n, 0).value);
        else {
          assert(seed.aged, "field row newer than the sealed cut");
          agedFieldRow(seed.aged, account, person, n, row);
          aged++;
        }
      }
      fields.set(e, prior);
    }
  }
  return { fields, proof: { position, command, claim, journalSha: sha(text), members,
    ...(agedProof ? { aged: { ...agedProof, rows: aged, bundleSha256: seed.aged!.bundleSha256 } } : {}) } };
}
