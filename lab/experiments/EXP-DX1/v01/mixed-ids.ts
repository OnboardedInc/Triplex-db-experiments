import assert from "node:assert/strict";
import { DatomicClient, DatomicHttpError, orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { assertionValue } from "../../../../packages/datomic/dist/rows.js";
import { SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { decodeFeed, now } from "../scale1/decision/observer.ts";
import { accounts, field, task } from "../scale1/decision/plan.ts";
import { expectedJournal, type Row } from "../scale1/decision/writes.ts";
import { command } from "../w1/group/workload.ts";
import type { AdoptedSeed } from "./adopt.ts";
import type { Peer } from "./adopted.ts";
import type { Writer } from "./profile.ts";

const attribute = field(0);
const value = (text: string) => ({ type: "string" as const, value: text });
const snapshot = (row: Row) => [row.entity_id, row.attribute, assertionValue(row), row.valid_from, row.valid_to];
type Input = Parameters<DatomicClient["transact"]>[1];

// [DX-V01] Why: challenge the global identity check under a fresh journal and a different owner.
// Rejected: replaying a used command or journal, which can refuse before inspecting the retired business ID.
function reuse(input: Input, retiredId: string): Input {
  const first = input.rows[0]!;
  assert.equal(input.newIds[0], first.id);
  assert.notEqual(first.id, retiredId);
  const rows = input.rows.map((row) => {
    if (row.id === first.id) return { ...row, id: retiredId };
    if (row.attribute !== ":_tx/change") return row;
    const change = JSON.parse(row.value_json!);
    return change.tripleId === first.id
      ? { ...row, value_json: JSON.stringify({ ...change, tripleId: retiredId }) } : row;
  });
  return { ...input, rows, newIds: [retiredId, ...input.newIds.slice(1)] };
}

export async function checkMixedIds(source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  start: number, person: number) {
  const { db, cut } = seed.scope;
  const ordered = writer === "per-person-ordered";
  const startedAt = now();
  const client = new DatomicClient(peer.write, 35000), reader = new DatomicClient(peer.read, 35000);
  const subject = task(accounts.at(-1)!, person);
  const other = task(accounts.at(-2)!, person);
  const rowAt = async (entity: string, position: number) => {
    const rows = await reader.rows(db, { entityIds: [entity], pattern: { attribute },
      basis: { recordedPosition: position, validAt: SEED_VALID_FROM } });
    assert.equal(rows.length, 1);
    const row = rows[0]!;
    assert.deepEqual([row.entity_id, row.attribute], [entity, attribute]);
    assert(row.recorded_position <= position);
    return row;
  };
  const getHead = async () => {
    const at = await client.begin(db);
    try { return at.position; }
    finally { await client.release(db, at.handle); }
  };
  const options = () => client.request<{ attempt: string; database: string; position: number; subjectFunction?: string }>(
    "GET", "/v1/db/" + db + "/write-options");
  const make = (stage: string, prior: Row, text: string, position: number, useOrdered: boolean) => {
    const fact: Fact = { e: prior.entity_id, a: attribute, v: value(text) };
    const identity = useOrdered ? orderedSaveIdentity() : undefined;
    const input = { ...command(peer.attempt + "-mixed-" + stage, [fact], [prior], true, false, identity),
      sourceK: position, live: [prior.id], writeClass: "live" as const };
    return { input, entity: fact.e, identity };
  };
  const commit = async (stage: string, at: number, prior: Row, text: string, subjectFunction?: string, useOrdered = ordered) => {
    const candidate = make(stage, prior, text, at, useOrdered);
    const { input, identity } = candidate;
    const ack = await client.transact(db, input) as {
      operationId: string; position: { v: string }; t: { v: string }; recordedAt: { v: number };
      subjectSave?: string; subjectOrderedIds?: boolean;
    };
    const after = at + 1;
    assert.deepEqual([ack.operationId, Number(ack.position.v)], [input.operationId, after]);
    assert(BigInt(ack.t.v) > 0n && Number.isFinite(ack.recordedAt.v));
    assert.equal(await reader.claim(db, input.operationId, after), input.claims[0]!.txId);
    if (identity) {
      assert.deepEqual([ack.subjectSave, ack.subjectOrderedIds], [subjectFunction, true]);
      assert.equal(input.rows[0]!.id, identity.assertionId(0));
    }
    const feed = await reader.request<{ transactions: Parameters<typeof decodeFeed>[1][] }>(
      "POST", "/v2/db/" + db + "/transactions", { after: at, limit: 1 });
    assert.equal(feed.transactions.length, 1);
    const observed = decodeFeed(db, feed.transactions[0]!, now());
    assert.deepEqual([observed.position, observed.id, observed.tx, observed.clock, observed.digest],
      [after, input.operationId, input.claims[0]!.txId, ack.recordedAt.v, expectedJournal(candidate, ack.recordedAt.v)]);
    const row = await rowAt(prior.entity_id, after);
    assert.equal(row.id, input.rows[0]!.id);
    assert.deepEqual(assertionValue(row), value(text));
    return { row, observed, token: identity?.token };
  };
  try {
    const installed = await options();
    assert.deepEqual([installed.attempt, installed.database, installed.position], [peer.attempt, db, start]);
    if (ordered) assert.match(installed.subjectFunction!, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    assert.equal(await getHead(), start);
    const old = await rowAt(subject, cut), before = await rowAt(subject, start);
    assert.deepEqual(assertionValue(old), fieldValue(person, 0, 0, 0));
    const first = await commit("first", start, before, "scorecard-history-one", installed.subjectFunction);
    const second = await commit("second", start + 1, first.row, "scorecard-history-two", installed.subjectFunction);
    assert(new Set([old.id, first.row.id, second.row.id]).size === 3);
    const refusals = [];
    if (ordered) {
      const prior = await rowAt(other, start + 2);
      // [DX-PREP1] Why: prove history still reserves the IDs once current lookup has advanced past them.
      // Rejected: testing an active ID or an identical command resend.
      assert.notEqual(second.row.id, old.id);
      assert.notEqual(second.row.id, first.row.id);
      for (const [format, id] of [["old-format", old.id], ["ordered", first.row.id]] as const) {
        const { input: original } = make("reuse-" + format, prior, "scorecard-never-committed", start + 2, false);
        const input = reuse(original, id);
        assert.notEqual(input.claims[0]!.txId, old.tx_id);
        assert.notEqual(input.claims[0]!.txId, first.observed.tx);
        let reason: string | undefined;
        await assert.rejects(client.transact(db, input), (e) => {
          if (!(e instanceof DatomicHttpError && e.status === 400 && e.code === "IdentityConflict")) return false;
          reason = e.code;
          return true;
        });
        const head = await getHead(), operation = await client.operation(db, input.operationId);
        const claim = await reader.claim(db, input.operationId, head);
        assert.deepEqual([head, operation.status, claim], [start + 2, "absent", null]);
        assert.deepEqual(await rowAt(other, head), prior);
        refusals.push({ format, id, command: input.operationId, journal: input.claims[0]!.txId, reason, operation: operation.status,
          claim, head });
      }
      await commit("control", start + 2, prior, "scorecard-fresh-control", installed.subjectFunction, false);
    }
    const end = await getHead();
    assert.equal(end, start + (ordered ? 3 : 2));
    const earlier = await Promise.all([cut, start, start + 1, start + 2].map((p) => rowAt(subject, p)));
    assert.deepEqual(earlier.map((r) => r.id), [old.id, before.id, first.row.id, second.row.id]);
    const expected = [old, before, first.row, second.row].map(snapshot);
    assert.deepEqual(earlier.map(snapshot), expected);
    return { source, writer, slot: peer.slot, attempt: peer.attempt, database: db, imageSha256: seed.pin,
      startedAt, endedAt: now(), subject, other, cut, start, end, installed, refusals,
      historical: earlier.map(snapshot), ids: earlier.map((r) => r.id), first, second };
  } finally { reader.close(); client.close(); }
}

export type MixedIds = Awaited<ReturnType<typeof checkMixedIds>>;
