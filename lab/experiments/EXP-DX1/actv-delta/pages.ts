import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import {
  allIndexes,
  declarations,
  bounds,
  bucket,
  derive,
  describe,
  type Location,
} from "./rules.ts";
import { ordered } from "./lookup.ts";
export const width = 96;
export const nativeIndexes = () => {
  const v = allIndexes();
  v.delete("EVSUB");
  return v;
};
// [DX-ACT2] Why: the scope of any parameter can depend on the two location links. Other attributes are admitted only through an indexed declaration. Rejected: indexing answer ballast or protected EVSUB state.
export const indexAttributes = new Set(
  [...nativeIndexes()]
    .flatMap((r) => declarations[r].reads.map((p) => p.split(".")[1]!))
    .concat(["location", "jurisdiction"]),
);
const trackedDocuments = new Set(Object.keys(W0.R1.entries.DOCEXP.params.leadDays));
export function coversDocuments(old: W0.CompiledRelease, next: W0.CompiledRelease) {
  if (!W0.diff(old, next).includes("DOCEXP")) return true;
  for (const r of [old, next])
    for (const params of [r.entries.DOCEXP.params, r.entries.DOCEXP.scope?.params]) {
      if (params && Object.keys(params.leadDays).some((t) => !trackedDocuments.has(t)))
        return false;
    }
  return true;
}
type Entry = [value: number, subject: string, key: string];
export type Page = {
  roster: string[];
  locations: Record<string, Location>;
  jurisdictions: Record<string, string[]>;
  lists: Record<string, Entry[]>;
  addresses: Record<string, string>;
};
export function buildPage(worlds: readonly W0.World[], basis: W0.Basis, indexed = true): Page {
  const addresses: Record<string, string> = {};
  const roster = worlds.map((w) => w.subject),
    locations: Page["locations"] = {},
    jurisdictions: Page["jurisdictions"] = {},
    lists: Page["lists"] = {};
  for (const w of worlds) {
    const { location, postings } = describe(w, basis, indexed ? nativeIndexes() : new Set());
    let eligible = false;
    for (const p of postings) {
      if (p.rule === "DOCEXP" && !trackedDocuments.has(p.tag)) continue;
      if ((p.rule === "OT" || p.rule === "PAYCHG") && p.value === 0) continue;
      if (p.rule === "MINWAGE" && location.local === location.state) continue;
      eligible = true;
      (lists[bucket(p)] ??= []).push([p.value, p.subject, p.key]);
    }
    if (!eligible) continue;
    addresses[w.subject] = location.id;
    const prior = locations[location.id];
    if (prior) assert.deepEqual(prior, location, "inconsistent location at native cut");
    else {
      locations[location.id] = location;
      (jurisdictions[location.jurisdiction ?? ""] ??= []).push(location.id);
    }
  }
  for (const list of Object.values(lists))
    list.sort(
      (a, b) =>
        a[0] - b[0] ||
        (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) ||
        (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0),
    );
  return { roster, locations, jurisdictions, lists, addresses };
}
export function updatePage(old: Page, worlds: W0.World[], basis: W0.Basis, indexed: boolean): Page {
  const patch = buildPage(worlds, basis, indexed),
    changed = new Set(patch.roster),
    addresses = { ...old.addresses };
  for (const id of changed) delete addresses[id];
  Object.assign(addresses, patch.addresses);
  const locations = { ...old.locations, ...patch.locations },
    jurisdictions: Page["jurisdictions"] = {};
  const used = new Set(Object.values(addresses));
  for (const [id, loc] of Object.entries(locations)) {
    if (!used.has(id)) delete locations[id];
    else (jurisdictions[loc.jurisdiction ?? ""] ??= []).push(id);
  }
  const lists: Page["lists"] = {};
  for (const k of new Set([...Object.keys(old.lists), ...Object.keys(patch.lists)])) {
    const items = [
      ...(old.lists[k] ?? []).filter((v) => !changed.has(v[1])),
      ...(patch.lists[k] ?? []),
    ];
    if (items.length)
      lists[k] = items.sort((a, b) => a[0] - b[0] || ordered(a[1], b[1]) || ordered(a[2], b[2]));
  }
  return { roster: old.roster, locations, jurisdictions, lists, addresses };
}
export function onlyJurisdictions(
  old: W0.CompiledRelease,
  next: W0.CompiledRelease,
): string[] | null {
  const ids = new Set<string>();
  for (const r of W0.diff(old, next)) {
    const a = old.entries[r],
      b = next.entries[r];
    if (canonical(a.params) !== canonical(b.params)) return null;
    for (const j of [...(a.scope?.jurisdictions ?? []), ...(b.scope?.jurisdictions ?? [])])
      ids.add(j);
  }
  return [...ids];
}
export function selectPage(
  page: Page,
  old: W0.CompiledRelease,
  next: W0.CompiledRelease,
  basis: W0.Basis,
  full: boolean,
) {
  const flags: [string, boolean, boolean][] = [];
  if (full || !coversDocuments(old, next))
    return { subjects: page.roster, yielded: 0, seeks: 0, full: true, flags };
  const js = onlyJurisdictions(old, next),
    locations =
      js === null
        ? Object.values(page.locations)
        : js.flatMap((j) => (page.jurisdictions[j] ?? []).map((id) => page.locations[id]!));
  const { ranges, fallback } = derive(old, next, basis.validTime, locations, nativeIndexes());
  if (fallback.length) return { subjects: page.roster, yielded: 0, seeks: 0, full: true, flags };
  const subjects = new Set<string>();
  let yielded = 0;
  for (const range of ranges) {
    const rows = page.lists[bucket(range)] ?? [],
      [start, end] = bounds(rows, (v) => v[0], range);
    for (let i = start; i < end; i++) {
      subjects.add(rows[i]![1]);
      if (range.rule === "OT") {
        const j = page.locations[range.location]!.jurisdiction;
        const active = (rel: W0.CompiledRelease) => {
          const e = rel.entries.OT;
          return (
            rows[i]![0] >
            (j && e.scope?.jurisdictions.has(j) ? e.scope.params : e.params).thresholdMinutes
          );
        };
        flags.push([rows[i]![1], active(old), active(next)]);
      }
      yielded++;
    }
  }
  return { subjects: [...subjects].sort(), yielded, seeks: ranges.length, full: false, flags };
}
