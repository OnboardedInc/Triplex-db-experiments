import assert from "node:assert/strict";
import { W0, canonical, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { deepOwnFacts, taskId } from "../../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";

// [DX-ACT1] Why: expected source is authored seed plus independently applied command values. Rejected: feeding the production projector's chosen inputs back into its verifier.
export function authoredSeed(person: number, position: number): WorldRow[] {
  return deepOwnFacts(person).map((f, i) => ({
    id: "expected:" + i,
    entityId: f.e,
    attribute: f.a,
    value: f.v,
    position,
    validFrom: SEED_VALID_FROM,
  }));
}
const key = (e: string, a: string) => canonical([e, a]);
export function authoredWrite(
  before: readonly WorldRow[],
  all: readonly (Fact & { remove?: boolean })[],
  position: number,
  at: number,
) {
  // [DX-ACT8, review F7] A field with `remove` retracts that one value (a reference unlinked); absent, as before.
  const gone = all.filter((f) => f.remove), fields = all.filter((f) => !f.remove);
  const removed = new Set(fields.filter((f) => f.v.type !== "ref").map((f) => key(f.e, f.a)));
  const next = before.filter((r) => !removed.has(key(r.entityId, r.attribute)) &&
    !gone.some((f) => f.e === r.entityId && f.a === r.attribute && canonical(f.v) === canonical(r.value)));
  next.push(
    ...fields.map(
      (f, i): WorldRow => ({
        id: "expected-edit:" + i,
        entityId: f.e,
        attribute: f.a,
        value: f.v,
        position,
        validFrom: at,
      }),
    ),
  );
  return next;
}
export function compareSource(actual: readonly WorldRow[], expected: readonly WorldRow[]) {
  const fields = (r: readonly WorldRow[]) =>
    r
      .map((x) =>
        canonical([x.entityId, x.attribute, x.value, x.position, x.validFrom, x.validTo ?? null]),
      )
      .sort();
  assert.deepEqual(
    fields(actual),
    fields(expected),
    "Deep native source differs from the authored history",
  );
}
export function expectedPolicy(i: number, rows: readonly WorldRow[]) {
  const by = new Map<string, WorldRow[]>();
  for (const r of rows) {
    const id = key(r.entityId, r.attribute);
    const list = by.get(id) ?? [];
    list.push(r);
    by.set(id, list);
  }
  const one = (e: string, a: string) => {
    const list = by.get(key(e, a));
    assert(list?.length === 1, JSON.stringify([i, e, a]));
    return list[0]!;
  };
  const s = W0.placementId(i),
    person = ids.worker(i),
    root = ids.placement(i),
    location = "loc:l" + i,
    jurisdiction = "jur:j" + i;
  const facts: W0.Fact[] = [];
  const fact = (e: string, a: string, from: WorldRow, v: W0.Fact["v"] = from.value.value) =>
    facts.push({ e, a, v, tx: from.position });
  for (const [a, k] of [
    ["startDate", "start"],
    ["payRateCents", "pay-cents"],
    ["weeklyMinutes", "weekly-minutes"],
    ["bgcStatus", "background"],
  ] as const) {
    const r = one(person, ":person/custom-" + k);
    fact(s, a, r, r.value.type === "integer" ? Number(r.value.value) : r.value.value);
  }
  const local = one(person, ":person/custom-local-floor"),
    state = one(person, ":person/custom-state-floor");
  fact(s, "location", local, location);
  fact(location, "jurisdiction", state, jurisdiction);
  fact(location, "localMinWageCents", local, Number(local.value.value));
  fact(jurisdiction, "stateMinWageCents", state, Number(state.value.value));
  const progress = one(taskId(i, 0), ":task/progress");
  if (Number(progress.value.value) > 0)
    fact(
      s,
      "section1AttestedAt",
      progress,
      one(person, ":person/custom-start").value.value + "T12:00:00.000000Z",
    );
  const refs = (e: string, a: string) =>
    (by.get(key(e, a)) ?? []).toSorted((a, b) => W0.cmpCodePoints(a.value.value, b.value.value));
  for (const [ordinal, link] of refs(person, ":person/file").entries()) {
    const doc = s + "/doc:d" + ordinal,
      expiry = one(link.value.value, ":file/expiresOn");
    fact(s, "documents", link, doc);
    fact(doc, "docType", link, ordinal === 0 ? "ead" : "visa");
    fact(doc, "expiresOn", expiry);
  }
  const tasks = rows
    .filter((r) => r.attribute === ":placement/task")
    .toSorted((a, b) => W0.cmpCodePoints(a.value.value, b.value.value));
  for (const [ordinal, link] of tasks.entries()) {
    const ans = s + "/ans:t" + ordinal,
      f = one(link.value.value, ":task/field-0");
    fact(s, "answers", link, ans);
    fact(ans, "field", f, "task-" + ordinal);
    fact(ans, "value", f);
  }
  const revision = one(root, ":placement/stamp"),
    id = s + "/ans:revision";
  fact(s, "answers", revision, id);
  fact(id, "field", revision, "revision");
  fact(id, "value", revision, String(revision.value.value));
  return { subject: s, facts };
}
