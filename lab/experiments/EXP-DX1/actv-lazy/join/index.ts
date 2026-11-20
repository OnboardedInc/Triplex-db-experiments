import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import {
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
// [DX-ACT1] Why: reopening an unpaid release must run the exact classifier, world mapping and selector that made its promise. Rejected: hashing the declaration table alone (a changed range boundary would retain that identity).
const code = [
  "./index.ts",
  "./account.ts",
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
export type Entry = { s: string; l: Location; post: Posting[] };
export const entry = (w: W0.World, b: Point): Entry => {
  const { location, postings } = describe(w, b, indexed);
  return { s: w.subject, l: location, post: postings };
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
): "all" | "none" | "index" {
  if (!a) return "all";
  const diff = W0.diff(a, b);
  if (kind === "output" && diff.some((r) => !indexed.has(r))) return "all";
  if (kind === "notice" && diff.includes("DOCEXP") && docTypes(a) !== docTypes(b)) return "all";
  if (!diff.some((r) => indexed.has(r))) return "none";
  return validIndex ? "index" : "all";
}
export function hits(l: Leaf, old: W0.CompiledRelease, next: W0.CompiledRelease, b: Point) {
  const { ranges, fallback } = derive(old, next, b.validTime, l.loc, indexed);
  assert(!fallback.some((r) => indexed.has(r)));
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
