import assert from "node:assert/strict";
import { policyWorld } from "../../../../bench/lib/deep-activation.ts";
import { ids, subjectOf, type Fact } from "../../../../bench/lib/world.ts";
import { W0, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { millis, type Store } from "../store.ts";
import type { Point } from "../decision.ts";
import type { Op } from "../../notify1/store.ts";

const custom = ":person/custom-";
const notice = new Set([
  custom + "start",
  custom + "pay-cents",
  custom + "state-floor",
  custom + "local-floor",
  custom + "background",
  ":person/file",
  ":file/expiresOn",
]);
const postings = new Set([custom + "pay-cents", custom + "state-floor", custom + "local-floor"]);
const outputs = new Set([...notice, custom + "weekly-minutes", ":task/progress"]);

export async function rawDeep(s: Store, person: number, cut: Point) {
  assert(s.profile === "act2-deep");
  const rows = await s.rows([ids.placement(person)], cut.tx, cut.validTime);
  assert(rows.length && rows.every((r) => subjectOf(r.entityId) === person));
  return rows;
}

export function deepImpact(
  person: number,
  old: readonly WorldRow[],
  ops: readonly Op[],
  cut: Point,
) {
  const byId = new Map(old.map((r) => [r.id, r] as const));
  const removed = new Set<string>();
  const added: WorldRow[] = [];
  const touched = new Set<string>();
  const dates = new Set<string>();
  let historical = false;
  for (const op of ops) {
    if (op.op === "retract") {
      const row = byId.get(op.id);
      assert(row && !removed.has(op.id), "Deep save does not own the current source row");
      removed.add(op.id);
      touched.add(row.attribute);
    } else {
      assert(
        subjectOf(op.entityId) === person &&
          !/(?:^|[/:_-])ssn$/i.test(op.attribute) &&
          Number.isFinite(op.validFrom) &&
          op.validFrom <= millis(cut.validTime) &&
          (op.validTo === undefined || op.validTo > op.validFrom),
        "Deep save is outside the enrolled source or valid cut",
      );
      if (op.value.type === "ref") assert.equal(subjectOf(op.value.value), person);
      touched.add(op.attribute);
      historical ||= op.validFrom < millis(cut.validTime) || op.validTo !== undefined;
      if (op.attribute === ":file/expiresOn") {
        const day = W0.parseDate(op.value.value);
        assert(day >= 0);
        dates.add(W0.endOfDay(day));
      }
      if (op.validTo !== undefined && op.validTo > millis(cut.validTime))
        dates.add(new Date(op.validTo).toISOString().replace("Z", "000Z"));
      if (op.validTo === undefined || op.validTo > millis(cut.validTime))
        added.push({
          id: "preview:" + added.length,
          entityId: op.entityId,
          attribute: op.attribute,
          value: op.value,
          position: cut.tx + 1,
          validFrom: op.validFrom,
          validTo: op.validTo,
        });
    }
  }
  const has = (set: Set<string>) => [...touched].some((a) => set.has(a));
  const prospective = () =>
    policyWorld(person, [...old.filter((r) => !removed.has(r.id)), ...added], {
      position: cut.tx + 1,
      validAt: millis(cut.validTime),
    });
  return {
    notice: has(notice),
    posting: has(postings),
    output: has(outputs),
    historical,
    dates: [...dates],
    prospective,
  };
}

// [DX-ACT1] Why: drive the same real deep values as well as task writes through joined admission. Rejected: measuring a compact policy database seeded beside the deep account.
export function replaceDeep(rows: readonly WorldRow[], fields: readonly Fact[], at: number): Op[] {
  const ops: Op[] = [];
  for (const f of fields) {
    const prior = rows.filter((r) => r.entityId === f.e && r.attribute === f.a);
    if (f.v.type === "ref") {
      assert(
        !prior.some((r) => r.value.type === "ref" && r.value.value === f.v.value),
        "Duplicate deep link",
      );
      ops.push({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: at });
      continue;
    }
    assert(prior.length <= 1);
    const old = prior[0];
    if (old) {
      ops.push({ op: "retract", id: old.id });
      if (old.validFrom < at)
        ops.push({
          op: "assert",
          entityId: old.entityId,
          attribute: old.attribute,
          value: old.value,
          validFrom: old.validFrom,
          validTo: at,
        });
    }
    ops.push({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: at });
  }
  return ops;
}
