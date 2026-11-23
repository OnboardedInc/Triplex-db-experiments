import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { field, keyFor, sha, task } from "../scale1/decision/plan.ts";
import { checkAdoptedPeer, type readScaleSeal } from "../v01/adopt.ts";

// [DX-JVM1] Why: admit AGE1's sealed one-billion cut with the same handoff checks as DX-PREP1's `cache32-aged` mode
// (origin/exp/DX-PREP1-parallel-prepare cdc72d4d5, prep1/ceiling-seed.ts agedCut, agedFieldRow and the live-head proof),
// copied here because that branch is not on the one branch. Same handoff file and digest, same held source.
// Rejected: a bare head or record count from the driver, or accepting any row newer than the seed cut.
type Seed = ReturnType<typeof readScaleSeal>;
type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
const pad25 = (n: number) => String(n).padStart(25, "0");

export type AgedAdmission = Awaited<ReturnType<typeof agedAdmission>>;

export function agedAdmission(file: string, pin: string, seed: Seed, pgdata: string) {
  assert.match(pin, /^[0-9a-f]{64}$/);
  assert(pgdata.startsWith("/"), "The aged cut is admitted only from a stopped PostgreSQL directory");
  const bytes = readFileSync(file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pin, "AGE1 handoff digest differs");
  const b = JSON.parse(bytes.toString());
  const key = seed.key, db = seed.scope.db, seedCut = seed.scope.cut;
  assert.equal(b.version, "triplex-age1-scorecard/1");
  assert.equal(b.sourceSeed?.["manifest-sha"], seed.pin);
  assert.deepEqual([b.scope, b.database, b.layout], [key, db, "lean-v3-strict-solo-k"]);
  assert(["classic-k", "recorded-predecessor-k"].includes(b.journal));
  assert(/^[0-9a-f]{40}$/.test(b.producer) && /^[0-9a-f-]{36}$/.test(b.agingAttempt) && /^[0-9a-f]{64}$/.test(b.sealSha));
  assert(typeof b.nativeId === "string" && b.nativeId.length > 0);
  // The replay ledgers travel inside the bundle. Their digests are the ones the aging seal recorded.
  const ledgers = JSON.parse(gunzipSync(Buffer.from(b.replayLedgerGzip, "base64"),
    { maxOutputLength: 256 * 1024 * 1024 }).toString()).map((x: string) => Buffer.from(x, "base64"));
  assert.equal(ledgers.length, 2);
  assert.deepEqual(ledgers.map((x: Buffer) => createHash("sha256").update(x).digest("hex")), [b.checkpointSha, b.populationSha]);
  const roster = Array.from({ length: 10 }, (_, i) => {
    const account = keyFor(i);
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
  const cut = { bundleSha256: pin, seedCut, physicalT: b.physicalT as number, records: b.records as number,
    nativeId: b.nativeId as string, active: c.active as number, people: 100_000, tapeSaves: c.tapeSaves as number,
    lastOperation: c.lastOperation as string, lastTransaction: c.lastTransaction as string, lastRecordedAt: c.lastRecordedAt as number };
  const head = seedCut + cut.tapeSaves;

  // [DX-PREP1] Why: the live head must be AGE1's last replayed save, at its pinned clock, not a later or earlier cut.
  async function lastSave(reader: DatomicClient, newest: boolean) {
    const last = await reader.request<{ transactions: [string, number, string[]][] }>(
      "POST", "/v2/db/" + db + "/transactions", { after: head - 1, limit: 2 });
    if (newest) assert.equal(last.transactions.length, 1, "aged head is not the newest transaction");
    const [lastId, lastPosition, lastText] = last.transactions[0]!;
    assert.deepEqual([lastId, lastPosition], [cut.lastTransaction, head]);
    const row = lastText.map(decodeRowText).find((r) => r.attribute === ":_tx/command-id");
    assert.deepEqual([row?.value_string, row?.recorded_at], [cut.lastOperation, cut.lastRecordedAt]);
    assert.equal(await reader.claim(db, cut.lastOperation, head), lastId);
    return { position: lastPosition, command: cut.lastOperation, claim: lastId, journalSha: sha(lastText) };
  }

  return {
    head, cut,
    summary: { bundleSha256: pin, head, records: cut.records, tapeSaves: cut.tapeSaves, active: cut.active },
    // Every person the tape will replace: fields 0-2 at the aged head, seed value or AGE1's exact replay row.
    async checkLive(reader: DatomicClient, people: readonly { account: number; person: number }[]) {
      const proof = await lastSave(reader, true);
      let agedRows = 0;
      const basis = { recordedPosition: head, validAt: SEED_VALID_FROM };
      for (let i = 0; i < people.length; i += 96) {
        const batch = people.slice(i, i + 96);
        const rows = await reader.rows(db, { entityIds: batch.map((p) => task(p.account, p.person)), basis });
        for (const { account, person } of batch) {
          for (const n of [0, 1, 2]) {
            const found = rows.filter((r) => r.entity_id === task(account, person) && r.attribute === field(n));
            assert.equal(found.length, 1);
            const row = found[0]!;
            assert(row.id && row.recorded_position > 0 && row.recorded_position <= head);
            if (row.recorded_position <= seedCut) assert.equal(row.value_string, fieldValue(person, 0, n, 0).value);
            else { agedFieldRow(cut, account, person, n, row); agedRows++; }
          }
        }
      }
      return { ...proof, people: people.length, agedRows };
    },
    async readback(reader: DatomicClient, expectedHead: number) {
      return { ...(await checkAdoptedPeer(reader, seed as never, expectedHead)), aged: await lastSave(reader, false) };
    },
  };
}

// [DX-PREP1] Why: AGE1 edits the first task's fields of a fixed, interleaved sample of each account. Its replay tape
// fixes every such row's ID, value and position, so a current row is checked against those exact bytes.
export function agedFieldRow(aged: { seedCut: number; tapeSaves: number; active: number; people: number },
  account: number, person: number, n: number, row: Row) {
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
  const expected = (i: number) => createHash("sha256").update(`edit-${i}-${saves}-${n}`).digest("hex").slice(0, 57);
  assert(candidates.some((i) => row.value_string === expected(i)), "aged field value differs from the replay tape");
  assert.equal(row.id, "B" + pad25(saves * 16 + n));
  assert.equal(row.tx_id, "_tx/T" + pad25(saves));
}

export function agedPredecessor(aged: AgedAdmission, account: number, person: number, n: number, row: Row) {
  agedFieldRow(aged.cut, account, person, n, row);
}
