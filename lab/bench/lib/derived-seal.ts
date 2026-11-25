// [DX-ERA4] TX2_DERIVED_SEAL=1: derived records are stored sealed under the keys of the protected assertions they were
// computed from (lab/experiments/EXP-DX1/era4/DERIVED-COPIES.md, section 3). The gateway seals and opens; the client
// says which rows each record was computed from and never holds key material.
import assert from "node:assert/strict";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
import { runtimeApi } from "./triplex.ts";

export const derivedSealOn = () => process.env["TX2_DERIVED_SEAL"] === "1";

/** A sealed record as stored: `tdx1.<header>.<nonce>.<ciphertext>`; the header names the database and the assertions. */
export const isSealed = (v: unknown): v is string => typeof v === "string" && v.startsWith("tdx1.");
export function sealedHeader(wire: string): { d: string; k: string[] } {
  assert(isSealed(wire), "Not a sealed derived record");
  const h = JSON.parse(Buffer.from(wire.split(".")[1]!, "base64url").toString("utf8"));
  assert(typeof h.d === "string" && Array.isArray(h.k) && h.k.length > 0);
  return h;
}
/** What a record that cannot be opened reads as: the assertions it was computed from that are removed. */
export type Removed = { removed: string[]; seq?: number };
export const isRemoved = (v: unknown): v is Removed =>
  typeof v === "object" && v !== null && Array.isArray((v as Removed).removed);

// ---- which rows a record was computed from (section 3.2) ----

/** The string rows each world was built from (protected attributes take strings only); set where worlds are built. */
const worldRows = new WeakMap<object, readonly string[]>();
const union = (...lists: readonly (readonly string[])[]) => [...new Set(lists.flat())].sort();
export function noteWorld<W extends object>(world: W, rows: Iterable<{ id: string; value?: { type?: string } }>): W {
  if (derivedSealOn())
    worldRows.set(world, union([...rows].filter((r) => r.value?.type === "string").map((r) => r.id)));
  return world;
}
export function worldInputs(world: object): readonly string[] {
  const ids = worldRows.get(world);
  assert(ids, "A derived record's world was built without its rows (TX2_DERIVED_SEAL)");
  return ids;
}
/** The same, carried on an evaluation's output (the work items of one subject). */
const outputRows = new WeakMap<object, readonly string[]>();
export function noteOutput<O extends object>(output: O, world: object): O {
  if (derivedSealOn()) outputRows.set(output, worldInputs(world));
  return output;
}
export function outputInputs(output: object): readonly string[] {
  const ids = outputRows.get(output);
  assert(ids, "A derived record's evaluation was made without its world (TX2_DERIVED_SEAL)");
  return ids;
}
export { union as inputUnion };

// ---- the routes ----

type Source = { backend?: { name: string; url: string }; scopeName?: string };
export const databaseOf = (source: Source) => {
  assert(source.backend?.name === "datomic" && source.scopeName, "Derived sealing needs a Datomic scope");
  return "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(source.scopeName))).toString("base64url");
};
const CHUNK = 512;
async function call<T>(url: string, db: string, action: "derived-seal" | "derived-open", items: unknown[]) {
  const out: T[] = [];
  const client = new DatomicClient(url);
  try {
    for (let i = 0; i < items.length; i += CHUNK) {
      const r = await client.request<{ items: T[] }>("POST", `/v2/db/${db}/${action}`, {
        items: items.slice(i, i + CHUNK),
      });
      assert(Array.isArray(r.items) && r.items.length === Math.min(CHUNK, items.length - i));
      out.push(...r.items);
    }
  } finally {
    client.close();
  }
  return out;
}
export const counters = { sealCalls: 0, sealed: 0, clear: 0, openCalls: 0, opened: 0, removed: 0 };

/** Seals each value under the protected assertions among `inputs` of `source`'s database. A value computed from no
 * protected assertion comes back unchanged (it held none); one whose assertion is already removed comes back as the
 * removed marker (it is never stored in clear). */
export async function seal(source: Source, items: { inputs: readonly string[]; value: string }[]) {
  if (!items.length) return [] as (string | Removed)[];
  const db = databaseOf(source);
  counters.sealCalls++;
  const r = await call<{ sealed?: string; clear?: true; removed?: string[]; seq?: number }>(
    source.backend!.url,
    db,
    "derived-seal",
    items.map((x) => ({ ids: [...x.inputs], value: x.value })),
  );
  return r.map((x, i): string | Removed => {
    if (x.sealed !== undefined) return counters.sealed++, x.sealed;
    if (x.clear) return counters.clear++, items[i]!.value;
    assert(Array.isArray(x.removed));
    return { removed: x.removed, ...(x.seq ? { seq: x.seq } : {}) };
  });
}

/** Opens sealed records (any database of the same gateway, named in each header). Values that are not sealed are
 * returned as they are. */
export async function open(url: string, values: readonly unknown[]) {
  const out: (unknown | Removed)[] = [...values];
  const by = new Map<string, number[]>();
  values.forEach((v, i) => {
    if (!isSealed(v)) return;
    const d = sealedHeader(v).d;
    by.set(d, [...(by.get(d) ?? []), i]);
  });
  for (const [db, idx] of by) {
    counters.openCalls++;
    const r = await call<{ value?: string; removed?: string[]; seq?: number }>(url, db, "derived-open", idx.map((i) => values[i]));
    r.forEach((x, j) => {
      if (x.value !== undefined) (counters.opened++, (out[idx[j]!] = x.value));
      else (counters.removed++, (out[idx[j]!] = { removed: x.removed!, ...(x.seq ? { seq: x.seq } : {}) }));
    });
  }
  return out;
}
/** The assertions a stored record names: its header's, or none for a clear one. */
export const namedInputs = (v: unknown): string[] => (isSealed(v) ? sealedHeader(v).k : isRemoved(v) ? v.removed : []);
