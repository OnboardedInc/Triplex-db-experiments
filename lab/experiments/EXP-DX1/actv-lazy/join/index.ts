import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import {
  allIndexes,
  bucket,
  bounds,
  declarations,
  derive,
  describe,
  compilerVersion,
  type Location,
  type Posting,
} from "../../actv-delta/rules.ts";
import { packIndex, unpackIndex } from "../../actv-delta/index-patch.ts";
import { pack, unpack, Documents } from "../../notify1/store.ts";
import type { Point } from "../decision.ts";
export const indexed = new Set<W0.RuleId>(["MINWAGE", "EVSTAT", "PAYCHG"]);
export const noticeInputs = new Set(
  ["EVSUB", "EVSTAT", "BGC", "DOCEXP", "MINWAGE", "PAYCHG"].flatMap((k) =>
    declarations[k as W0.RuleId].reads.map((a) => a.split(".")[1]!),
  ),
);
export const indexInputs = new Set(
  [...indexed]
    .flatMap((k) => declarations[k].reads.map((a) => a.split(".")[1]!))
    .filter((a) => a !== "startDate"),
);
export const outputRules = allIndexes();
export const outputInputs = new Set(
  Object.values(declarations).flatMap((d) => d.reads.map((a) => a.split(".")[1]!)),
);
// [DX-ACT1] Why: reopening an unpaid release must run the exact classifier, world mapping and selector that made its promise. Rejected: hashing the declaration table alone (a changed range boundary would retain that identity).
const code = [
  "./index.ts",
  "./account.ts",
  "./deep.ts",
  "../../../../bench/lib/deep-activation.ts",
  "./material.ts",
  "./evaluator.ts",
  "./staging.ts",
  "../decision.ts",
  "../../actv-delta/rules.ts",
  "../../actv-delta/index-patch.ts",
  "../../notify1/dispatcher.ts",
  "../../notify1/journal.ts",
  "../../notify1/census.ts",
  "../../../../bench/lib/w0-world.ts",
];
export const selector = sha256(
  canonical([
    "notice-ranges/1",
    compilerVersion,
    [...indexed].sort(),
    [...noticeInputs].sort(),
    code.map((f) => [f, sha256(readFileSync(new URL(f, import.meta.url)))]),
  ]),
);
export type Entry = { s: string; l: Location; post: Posting[]; facts?: W0.Fact[] };
export const entry = (w: W0.World, b: Point, expanded = false): Entry => {
  const facts = w.facts.filter((f) => f.a !== "answers" && !f.e.includes("/ans:"));
  const { location, postings } = describe(
    { subject: w.subject, facts },
    b,
    expanded ? outputRules : indexed,
  );
  return { s: w.subject, l: location, post: postings, ...(expanded ? { facts } : {}) };
};
export type Leaf = { ids: string[]; loc: Location[]; lists: Record<string, Posting[]> };
export function leaf(entries: Entry[]): Leaf {
  const loc = new Map<string, Location>(),
    lists: Record<string, Posting[]> = {};
  for (const e of entries) {
    const old = loc.get(e.l.id);
    if (old) assert.deepEqual(old, e.l);
    loc.set(e.l.id, e.l);
    for (const p of e.post) (lists[bucket(p)] ??= []).push(p);
  }
  for (const l of Object.values(lists))
    l.sort(
      (a, b) =>
        a.value - b.value ||
        W0.cmpCodePoints(a.subject, b.subject) ||
        W0.cmpCodePoints(a.key, b.key),
    );
  return { ids: entries.map((e) => e.s), loc: [...loc.values()], lists };
}
const docTypes = (r: W0.CompiledRelease) => {
  const e = r.entries.DOCEXP;
  return canonical([
    Object.keys(e.params.leadDays).sort(),
    e.scope ? [...e.scope.jurisdictions].sort() : [],
    e.scope ? Object.keys(e.scope.params.leadDays).sort() : [],
  ]);
};
export function strategy(
  a: W0.CompiledRelease | undefined,
  b: W0.CompiledRelease,
  kind: "notice" | "output",
  validIndex: boolean,
  expanded = false,
): "all" | "none" | "index" {
  if (!a) return "all";
  // [DX-ACT4] Why: W0.diff covers only the eleven rules, so a release that changed only forms or policies chose "none":
  // no subject was selected and its owed notices were never recorded (outside the held campaign, which selects all;
  // found by the settlement-frames gate). The index knows no policy's inputs, so such a release selects everyone.
  // Rejected: indexing the synthetic policies (they read only the start date, which no leaf indexes).
  if (W0.extensionDiffers(a, b)) return "all";
  const diff = W0.diff(a, b);
  const rules = kind === "output" && expanded ? outputRules : indexed;
  if (kind === "output" && diff.some((r) => !rules.has(r))) return "all";
  if (kind === "notice" && diff.includes("DOCEXP") && docTypes(a) !== docTypes(b)) return "all";
  if (!diff.some((r) => rules.has(r))) return "none";
  return validIndex ? "index" : "all";
}
export function hits(
  l: Leaf,
  old: W0.CompiledRelease,
  next: W0.CompiledRelease,
  b: Point,
  expanded = false,
) {
  const rules = expanded ? outputRules : indexed;
  const { ranges, fallback } = derive(old, next, b.validTime, l.loc, rules);
  assert(!fallback.some((r) => rules.has(r)));
  const set = new Set<string>();
  let postings = 0;
  for (const r of ranges) {
    const list = l.lists[bucket(r)] ?? [],
      [a, z] = bounds(list, (x) => x.value, r);
    for (let j = a; j < z; j++) {
      set.add(list[j]!.subject);
      postings++;
    }
  }
  return { ids: [...set].sort(), seeks: ranges.length, postings };
}
type Version = { base: number; digest: string; patch: string };
export const baseKey = (i: number) => "join-index-base:" + i;
export const leafKey = (i: number) => "join-index:" + i;
export const address = (s: string) => "join-member:" + s;
export async function loadLeaves(db: Documents, first: number, count: number, p: number) {
  assert(Number.isInteger(count) && count > 0 && count <= 16);
  const ns = Array.from({ length: count }, (_, j) => first + j);
  const rows = await db.rows<{ packed: string; sum: string } | Version>(
    ns.flatMap((i) => [baseKey(i), leafKey(i)]),
    p,
  );
  return ns.map((i) => {
    const base = rows.get(baseKey(i)),
      rev = rows.get(leafKey(i));
    assert(base && "packed" in base.value);
    assert.equal(sha256(base.value.packed), base.value.sum);
    const { entries: initial, sorted } = unpack<{ entries: Entry[]; sorted: Leaf }>(
      base.value.packed,
    );
    let entries = initial;
    if (rev) {
      const v = rev.value as Version;
      assert.equal(v.base, base.at);
      entries = unpackIndex(initial, v.patch) as Entry[];
      assert.equal(sha256(canonical(entries)), v.digest);
    }
    return { entries, initial, base, rev, sorted: rev ? leaf(entries) : sorted };
  });
}
export async function loadLeaf(db: Documents, i: number, p: number) {
  return (await loadLeaves(db, i, 1, p))[0]!;
}
export function leafChange(
  db: Documents,
  i: number,
  b: Awaited<ReturnType<typeof loadLeaf>>,
  next: Entry[],
) {
  if (canonical(b.entries) === canonical(next)) return [];
  return db.change(leafKey(i), b.rev, {
    base: b.base.at,
    digest: sha256(canonical(next)),
    patch: packIndex(b.initial, next),
  });
}
export function baseOp(db: Documents, i: number, entries: Entry[]) {
  const packed = pack({ entries, sorted: leaf(entries) });
  return db.put(baseKey(i), { packed, sum: sha256(packed) });
}
