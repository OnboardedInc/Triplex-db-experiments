import assert from "node:assert/strict";
import type { CompositionHandle, PulledTriple } from "../../../bench/lib/composition.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { receiptOfRecord } from "../../../bench/lib/seed.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";

const format = "deep-policy-regions/1";
const command = format + ":catalog";
const attribute = ":fixture/state-min-wage";
const jurisdictions = Array.from(
  { length: 10 },
  (_, i) => "jur:j" + String((i + 1) * 10).padStart(3, "0"),
);
const value = { type: "integer", value: "1500" };

type Floor = { entityId: string; attribute: string; value: typeof value; validFrom: number };
type Catalog = { format: string; scope: string; position: number; txId: string; facts: Floor[] };

const floors = () =>
  jurisdictions.map((entityId) => ({ entityId, attribute, value, validFrom: SEED_VALID_FROM }));

export function checkDeepPolicy(catalog: Catalog, scope: string, seed: number) {
  assert.equal(catalog.format, format);
  assert.equal(catalog.scope, scope);
  assert.equal(catalog.position, seed + 1);
  assert(typeof catalog.txId === "string" && catalog.txId.length > 0);
  assert.deepEqual(catalog.facts, floors());
}

// [DX-ACT2] Why: give the deep fixture an ordinary, release-independent regional distribution plus one native floor for each shared jurisdiction. Rejected: per-person jurisdiction IDs (R3 changes no flags), or renaming distinct floor assertions as though they were one fact.
export async function scopedDeepPolicy(c: CompositionHandle, seed: number) {
  const facts = floors();
  const result = await c.transact(
    facts.map((f) => ({ op: "assert", ...f })),
    {
      commandId: command,
      actor: format,
      preconditions: facts.map((f) => ({
        _tag: "EntityState",
        entityId: f.entityId,
        tripleIds: [],
      })),
    },
  );
  assert(result.ok);
  const stored = await c.transactionByCommand(command);
  assert(stored.ok && stored.value?.txId === result.value.txId);
  assert.equal(stored.value.position, result.value.position);
  assert.equal(stored.value.commandId, command);
  const actual = (triples: readonly PulledTriple[]): Floor[] =>
    triples
      .map(({ entityId, attribute, value, validFrom }) => {
        assert(validFrom !== undefined);
        return { entityId, attribute, value, validFrom };
      })
      .sort((a, b) => a.entityId.localeCompare(b.entityId));
  assert(c.scopeName);
  const reopened = receiptOfRecord(stored.value);
  const catalog = {
    format,
    scope: c.scopeName,
    position: reopened.position,
    txId: reopened.txId,
    facts: actual(reopened.triples),
  };
  assert.deepEqual(catalog.facts, actual(result.value.triples));
  checkDeepPolicy(catalog, c.scopeName, seed);
  const shared = new Map(
    catalog.facts.map((f) => [
      f.entityId,
      { e: f.entityId, a: "stateMinWageCents", v: Number(f.value.value), tx: catalog.position },
    ]),
  );
  const read: typeof readDeepWorlds = async (source, indices, basis, account) => {
    assert(source.scopeName === catalog.scope && basis.position >= catalog.position);
    return (await readDeepWorlds(source, indices, basis, account)).map((w, at): W0.World => {
      const i = indices[at]!,
        original = "jur:j" + i,
        jurisdiction = i % 100 === 17 ? jurisdictions[Math.floor(i / 100) % 10]! : "jur:u" + i,
        floor = shared.get(jurisdiction);
      return {
        subject: w.subject,
        facts: w.facts.map((f) => {
          if (f.a === "jurisdiction" && f.v === original) return { ...f, v: jurisdiction };
          if (f.e !== original) return f;
          assert.equal(f.a, "stateMinWageCents");
          if (floor) assert.equal(f.v, floor.v);
          return floor ?? { ...f, e: jurisdiction };
        }),
      };
    });
  };
  return { catalog, read };
}

// [DX-ACT2] Why: independently enumerate the narrow rows from the fixture's 900-person cycle.
// The regional cohort crosses the threshold at these three offsets. Live saves do not edit hours.
// Rejected: accepting agreement between two publishers on an empty change set.
export function scopedOvertimeRows(people: number) {
  const rows: [string, string, null][] = [];
  const before = canonical({ name: "overtime", rule: "OT" });
  for (let base = 0; base < people; base += 900)
    for (const i of [base + 417, base + 517, base + 617])
      if (i < people)
        rows.push([canonical([W0.placementId(i), "OT", "", "flags", "overtime"]), before, null]);
  return rows;
}
