import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { agedCut, agedJournal } from "../../prep1/ceiling-seed.ts";
import { field, task } from "../../scale1/decision/plan.ts";
import { get, num, readEdn, type Edn } from "./edn.ts";

// [DX-ACT7] Why: the held runner's oracle builds each subject's world from its seed facts and this run's own saves. On
// the 1 billion copy 2,000 subjects per account carry about 1,400 aged saves each, written by AGE1's tape, which the
// oracle's worlds did not know, so every exactness check there would fail. AGE1's tape is a pure function of its replay
// inputs (`age1/src/triplex/age/tape.clj`: `owner-index`, `width`, `edit-row`, `previous-edit`, `expected-adopted`):
// the save at offset n goes to adopted subject `n mod active` (or a probe's owner), at logical position
// seedHead + n + 1, writing task 0's fields 0 .. width-1 with value sha256("edit-<owner>-<n>-<j>")[0:57] and row ID
// "B" + pad25(16n + j). The replay inputs travel in the handoff bundle (the population ledger with the roster, the
// checkpoint with the probe map). So the oracle regenerates each aged subject's current task fields in O(1) from those
// inputs, and the runner first checks every aged subject of every account against the database at the aged head
// (value, row ID and position of each of fields 0 to 2), so a regeneration that disagreed with the database stops the
// run before any Publish, and a database that disagreed with AGE1's tape stops it too.
// Rejected: reading each subject's facts back from the store at the Publish position and feeding them to the oracle
// (the check would then no longer test the read path that settlement and every read use: a wrong read would agree with
// itself), and replaying all 28.2 million aged saves into the runner's history (hours of work and gigabytes of memory to
// learn three values per subject).

export type AgedProbe = { owner: number; width: number; fields: Map<number, number> };
export type AgedReplay = {
  seedHead: number;
  active: number;
  /** People per account (subjects per account). */
  people: number;
  tapeSaves: number;
  probes: Map<number, AgedProbe>;
};
export type AgedField = { j: number; attribute: string; n: number; value: string; position: number; id: string };

const hex = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const pad25 = (n: number) => String(n).padStart(25, "0");
export const editValue = (owner: number, n: number, j: number) => hex(`edit-${owner}-${n}-${j}`).slice(0, 57);

export const standardWidth = (r: AgedReplay, n: number) => 1 + ((Math.floor(n / r.active) + (n % r.active)) % 3);
export const widthOf = (r: AgedReplay, n: number) => r.probes.get(n)?.width ?? standardWidth(r, n);
export const ownerIndex = (r: AgedReplay, n: number) => r.probes.get(n)?.owner ?? n % r.active;

/** AGE1's adoption order (`adopt.clj` `read-population!`): the interleaved active sample, then one probe subject
 * (local people - 2) and one idle subject (local people - 1) per account. */
export function rosterOf(r: AgedReplay, k: number) {
  const per = r.active / 10;
  if (k < r.active) return { account: k % 10, local: Math.floor((Math.floor(k / 10) * (r.people - 2)) / per) };
  if (k < r.active + 10) return { account: k - r.active, local: r.people - 2 };
  assert(k < r.active + 20, "adopted index outside the roster");
  return { account: k - r.active - 10, local: r.people - 1 };
}

function previousEdit(r: AgedReplay, n: number, j: number): number | undefined {
  const probe = r.probes.get(n);
  if (probe) return probe.fields.get(j);
  for (let c = n - r.active; c >= 0; c -= r.active) if (!r.probes.has(c) && j < widthOf(r, c)) return c;
  return undefined;
}

/** The last save of adopted subject k before the tape's end (`expected-adopted`'s choice of n). */
export function lastSave(r: AgedReplay, k: number): number | undefined {
  if (k < r.active) {
    if (r.tapeSaves <= k) return undefined;
    let at = k + r.active * Math.floor((r.tapeSaves - 1 - k) / r.active);
    while (at >= 0 && r.probes.has(at)) at -= r.active;
    return at >= 0 ? at : undefined;
  }
  let found: number | undefined;
  for (const [at, p] of r.probes) if (at < r.tapeSaves && p.owner === k && (found === undefined || at > found)) found = at;
  return found;
}

/** Task 0's fields 0 to 2 of adopted subject k after the whole tape, as AGE1's `expected-adopted` derives them;
 * undefined for a field still at its seed row. */
export function agedFields(r: AgedReplay, k: number): (AgedField | undefined)[] | undefined {
  const n = lastSave(r, k);
  if (n === undefined) return undefined;
  return [0, 1, 2].map((j) => {
    const p = j < widthOf(r, n) ? n : previousEdit(r, n, j);
    if (p === undefined) return undefined;
    return { j, attribute: field(j), n: p, value: editValue(ownerIndex(r, p), p, j), position: r.seedHead + p + 1,
      id: "B" + pad25(p * 16 + j) };
  });
}

export type AgedSeal = {
  replay: AgedReplay;
  head: number;
  /** The handoff's cut, in the shape `agedJournal` / `agedFieldRow` take. */
  cut: Parameters<typeof agedJournal>[1];
  bundleSha256: string;
  toy: boolean;
  /** Adopted index by account and local subject. */
  index: Map<string, number>;
};

/**
 * Opens the handoff bundle. At full size the bundle is first admitted by PREP1's own check (`agedCut`: the 1 billion
 * scope, roster, clocks and ledger digests); a toy bundle (the miniature) is checked the same way with the toy's own
 * sizes. Then the two ledgers are read and the roster AGE1 recorded must equal the adoption rule.
 */
export function openAgedBundle(file: string, pin: string, o: { imagePin: string; scopeKey: string; db: string;
  seedCut: number; people: number; toy: boolean }): AgedSeal {
  const bytes = readFileSync(file);
  assert.equal(hex(bytes), pin, "aged handoff digest differs");
  const b = JSON.parse(bytes.toString());
  if (!o.toy) agedCut(file, pin, o.imagePin, o.scopeKey, o.db, o.seedCut, true);
  else {
    assert.equal(b.version, "triplex-act7-toy-aged/1");
    assert.deepEqual([b.scope, b.database, b.sourceSeed?.["manifest-sha"]], [o.scopeKey, o.db, o.imagePin]);
  }
  const ledgers = (JSON.parse(gunzipSync(Buffer.from(b.replayLedgerGzip, "base64"), { maxOutputLength: 256 * 1024 * 1024 })
    .toString()) as string[]).map((x) => Buffer.from(x, "base64"));
  assert.equal(ledgers.length, 2);
  assert.deepEqual(ledgers.map((x) => hex(x)), [b.checkpointSha, b.populationSha], "replay ledger digests differ");
  const checkpoint = readEdn(ledgers[0]!.toString());
  const population = readEdn(ledgers[1]!.toString());
  const c = b.clocks;
  assert.equal(c.seedHead, o.seedCut, "aged seed head is not the image's cut");
  assert.equal(b.logicalHead, c.seedHead + c.tapeSaves);
  assert.equal(c.lastOperation, "age-save-" + (c.tapeSaves - 1));
  assert.equal(c.lastTransaction, "_tx/T" + pad25(c.tapeSaves - 1));
  const active = num(get(population, ":active"), "active");
  assert.deepEqual([active, num(get(population, ":seed-head"), "seed-head")], [c.active, c.seedHead],
    "population ledger differs from the handoff clocks");
  const observed = get(checkpoint, ":observed");
  if (observed !== undefined) assert.equal(observed, c.tapeSaves, "checkpoint offset differs from the handoff");
  const probes = new Map<number, AgedProbe>();
  const raw = get(checkpoint, ":probes");
  if (raw !== null && raw !== undefined) {
    assert(raw instanceof Map);
    for (const [n, p] of raw) {
      const fields = new Map<number, number>();
      const f = get(p, ":fields");
      if (f instanceof Map) for (const [j, at] of f) fields.set(num(j, "probe field"), num(at, "probe field offset"));
      probes.set(num(n, "probe offset"), { owner: num(get(p, ":owner"), "probe owner"), width: num(get(p, ":width"), "probe width"), fields });
    }
  }
  const replay: AgedReplay = { seedHead: c.seedHead, active, people: o.people, tapeSaves: c.tapeSaves, probes };
  const adopted = get(population, ":adopted");
  assert(Array.isArray(adopted) && adopted.length === active + 20, "the adopted roster has the wrong length");
  const index = new Map<string, number>();
  adopted.forEach((s: Edn, k) => {
    const want = rosterOf(replay, k);
    assert.deepEqual([get(s, ":account"), get(s, ":local")], [want.account, want.local], "adopted subject " + k + " differs from the rule");
    index.set(want.account + "/" + want.local, k);
  });
  for (const p of probes.values()) assert(p.owner >= active && p.owner < active + 10 && p.width >= 1 && p.width <= 3);
  const cut = { bundleSha256: pin, seedCut: c.seedHead, physicalT: b.physicalT, records: b.records, nativeId: b.nativeId,
    active, people: o.people, tapeSaves: c.tapeSaves, lastOperation: c.lastOperation, lastTransaction: c.lastTransaction,
    lastRecordedAt: c.lastRecordedAt };
  return { replay, head: b.logicalHead, cut, bundleSha256: pin, toy: o.toy, index };
}

/** The aged task fields of subject `local` of `account`, or undefined for a subject the tape never touched. */
export function agedOf(seal: AgedSeal, account: number, local: number) {
  const k = seal.index.get(account + "/" + local);
  return k === undefined ? undefined : agedFields(seal.replay, k);
}

/** For the oracle: the aged writes of one account's subject i (each field at its own position). */
export type AgedBase = (i: number) => readonly AgedField[] | undefined;
export const agedBase = (seal: AgedSeal, account: number): AgedBase => (i) =>
  agedOf(seal, account, i)?.filter((x): x is AgedField => x !== undefined);

/**
 * The live head is AGE1's last replayed save (its journal and claim, as PREP1 checks it), and every adopted subject's
 * task fields 0 to 2 at the aged head are exactly the regenerated rows (or the seed row where the tape never wrote
 * that field): value, row ID and position. Returns the counts.
 */
export async function checkAgedLive(reader: DatomicClient, db: string, seal: AgedSeal) {
  const last = await reader.request<{ transactions: [string, number, string[]][] }>(
    "POST", "/v2/db/" + db + "/transactions", { after: seal.head - 1, limit: 2 });
  assert.equal(last.transactions.length, 1, "aged head is not the newest transaction");
  const [lastId, lastPosition, lastText] = last.transactions[0]!;
  assert.deepEqual([lastId, lastPosition], [seal.cut.lastTransaction, seal.head]);
  const journalRows = agedJournal(lastText, seal.cut, seal.head);
  assert.equal(await reader.claim(db, seal.cut.lastOperation, seal.head), lastId);
  const owners = [...seal.index.entries()].map(([key, k]) => {
    const [account, local] = key.split("/").map(Number) as [number, number];
    return { account, local, k, entity: task(account, local) };
  });
  const counts = { subjects: owners.length, aged: 0, agedRows: 0, seedRows: 0 };
  for (let i = 0; i < owners.length; i += 64) {
    const batch = owners.slice(i, i + 64);
    const rows = await reader.rows(db, { entityIds: batch.map((o) => o.entity),
      basis: { recordedPosition: seal.head, validAt: SEED_VALID_FROM } });
    for (const o of batch) {
      const want = agedFields(seal.replay, o.k);
      if (want) counts.aged++;
      for (const j of [0, 1, 2]) {
        const got = rows.filter((r) => r.entity_id === o.entity && r.attribute === field(j));
        assert.equal(got.length, 1, o.entity + " " + field(j) + ": not exactly one current row");
        const r = got[0]!, w = want?.[j];
        if (w) {
          assert.deepEqual([r.value_string, r.id, r.recorded_position], [w.value, w.id, w.position],
            o.entity + " " + field(j) + ": the database differs from AGE1's replay tape");
          counts.agedRows++;
        } else {
          assert(r.recorded_position <= seal.replay.seedHead, o.entity + " " + field(j) + ": aged write the tape does not name");
          assert.equal(r.value_string, fieldValue(o.local, 0, j, 0).value);
          counts.seedRows++;
        }
      }
    }
  }
  return { head: seal.head, journalRows, lastTransaction: lastId, ...counts };
}
