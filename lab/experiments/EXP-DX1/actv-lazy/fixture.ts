import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { W0, canonical, sha256, triplexValue, type WorldRow } from "../../../bench/lib/w0-world.ts";
import { deepOwnFacts, deepShape } from "../../../bench/lib/deep-world.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { fact, type Store, millis } from "./store.ts";
import { rosterRoot, rosterSeal } from "./read.ts";
export const valid = W0.POPULATION_VALID_TIME;
type InputFact = { e: string; a: string; v: any };
const shared: InputFact[] = [];
for (let j = 0; j < 10; j++) {
  shared.push({ e: "jur:g" + j, a: "stateMinWageCents", v: 1500 + (j % 2) * 150 });
  shared.push({ e: "loc:g" + j, a: "jurisdiction", v: "jur:g" + j });
  if (j % 3 === 0) shared.push({ e: "loc:g" + j, a: "localMinWageCents", v: 1700 });
}
function own(i: number): InputFact[] {
  const s = W0.placementId(i);
  if (i % 97 === 0) return [];
  const rows: InputFact[] = [
    { e: s, a: "location", v: "loc:g" + (i % 10) },
    { e: s, a: "payRateCents", v: 1450 + ((i * 37) % 600) },
    { e: s, a: "bgcStatus", v: "clear" },
    { e: s, a: "weeklyMinutes", v: 2200 + (i % 600) },
  ];
  if (i % 23 === 0) {
    const doc = s + "/doc:proof";
    rows.push(
      { e: s, a: "documents", v: doc },
      { e: doc, a: "docType", v: "ead" },
      { e: doc, a: "expiresOn", v: "2026-11-28" },
    );
  }
  return rows;
}
const input = (f: InputFact) => ({
  op: "assert",
  entityId: f.e,
  attribute: f.a,
  value: triplexValue(f.a, f.v),
  validFrom: 0,
});
// [DX-ACT1] Why: use the THIN1 eight-fact applicant shape without creating any release outputs. Rejected: charging empty placeholder people to the thin fixture's denominator.
function thin(i: number): InputFact[] {
  const s = W0.placementId(i);
  return ["source-key", "import-batch", "external-status"].flatMap((field, j) => {
    const answer = s + "/ans:" + j;
    return [
      { e: s, a: "answers", v: answer },
      { e: answer, a: "field", v: field },
      ...(j === 2 ? [] : [{ e: answer, a: "value", v: field + "-" + i }]),
    ];
  });
}
export async function seed(
  store: Store,
  n: number,
  population: "default" | "thin" = "default",
  batchRows = 1500,
) {
  assert(Number.isSafeInteger(batchRows) && batchRows >= 1500 && batchRows <= 2000);
  assert.equal(await store.head(), 0);
  assert(population !== "thin" || store.profile === "w0");
  const compact = population === "thin" ? thin : own;
  const first = await store.input("origin", { kind: "baseline", at: valid });
  let facts = 0,
    sharedPosition = 0,
    frames = 0;
  const cuts: number[] = [],
    roster = Array.from({ length: n }, (_, i) => W0.placementId(i)),
    source = createHash("sha256");
  if (store.profile === "w0" && population === "default") {
    sharedPosition = (
      await store.input("geography", { kind: "baseline", at: valid }, shared.map(input))
    ).position;
    facts += shared.length;
  }
  let batch: any[] = [],
    people: number[] = [];
  const flush = async () => {
    if (!people.length) return;
    const r = await store.input("population/" + people[0], { kind: "baseline", at: valid }, batch);
    for (const i of people) cuts[i] = r.position;
    frames++;
    batch = [];
    people = [];
  };
  for (let i = 0; i < n; i++) {
    const rows =
      store.profile === "w0"
        ? compact(i).map(input)
        : deepOwnFacts(i).map((f) => ({
            op: "assert",
            entityId: f.e,
            attribute: f.a,
            value: f.v,
            validFrom: SEED_VALID_FROM,
          }));
    if (store.profile === "act2-deep") assert.equal(rows.length, deepShape(i).facts);
    if (batch.length + rows.length > batchRows) await flush();
    people.push(i);
    batch.push(...rows);
    facts += rows.length;
    source.update(canonical(rows) + "\n");
  }
  await flush();
  for (let i = 0; i < n; i += 64 * 24) {
    const ops = [];
    for (let j = i; j < Math.min(n, i + 64 * 24); j += 64)
      ops.push(fact(rosterRoot(j / 64), "lazy/members", roster.slice(j, j + 64)));
    await store.input("roster/" + i, { kind: "baseline", at: valid }, ops);
  }
  await store.input("sealed-roster", { kind: "baseline", at: valid }, [
    fact("members/seal", "lazy/roster-seal", rosterSeal(roster)),
  ]);
  const end = await store.head();
  const world = (i: number) => {
    assert(i >= 0 && i < n);
    const s = roster[i]!;
    if (store.profile === "act2-deep") {
      const rows: WorldRow[] = deepOwnFacts(i).map((f, j) => ({
        id: "fixture-" + j,
        entityId: f.e,
        attribute: f.a,
        value: f.v,
        position: cuts[i]!,
        validFrom: SEED_VALID_FROM,
      }));
      return policyWorld(i, rows, { position: end, validAt: millis(valid) });
    }
    const ownFacts = compact(i),
      loc = ownFacts.find((f) => f.a === "location")?.v,
      j = shared.find((f) => f.e === loc && f.a === "jurisdiction")?.v;
    return {
      subject: s,
      facts: [
        ...ownFacts.map((f) => ({ ...f, tx: cuts[i]! })),
        ...shared
          .filter((f) => f.e === loc || f.e === j)
          .map((f) => ({ ...f, tx: sharedPosition })),
      ],
    };
  };
  return {
    id: first.txId,
    n,
    facts,
    frames,
    cut: end,
    seedPosition: (i: number) => cuts[i]!,
    roster,
    rosterHash: sha256(canonical(roster)),
    sourceHash: source.digest("hex"),
    world,
  };
}
