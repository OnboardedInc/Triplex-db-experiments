// [DX-S4] Tape M on the Mac gates (production and aged toy): the cell, the names of its owners, what to seed, and the
// read-back of every field of every owner it wrote, computed from the tape and the receipts alone.
// Why one module: both gates drive the server producer's phase() and must judge tape M the same way.
// Rejected: folding tape M into the gates' shape R and S read-back (their owners are one task per subject).
import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { slotAttribute } from "../w1/field/production.ts";
import { loadMixParams, mixOffers, mixReport, newPersonBase, type MixKind, type MixOffer, type OwnerRef, type RefTarget } from "../w1/field/production-mix.ts";

export const mixParamsFile = process.env.DX_S4_MIX_PARAMS ?? new URL("../real2/production-mix.json", import.meta.url).pathname;
export const mixParams = () => loadMixParams(mixParamsFile);

/** How a runner names tape M's owners. `tag` keeps one cell's created entities apart from another's in one database. */
export type MixNames = { entity: (account: number, ref: OwnerRef) => string; constant: (account: number, name: string) => string };
export function mixNames(namespace: (account: number) => string, task: (account: number, person: number) => string,
  profile: (account: number, person: number) => string, tag: string): MixNames {
  return {
    entity: (a, r) => r.role === "task" ? task(a, r.person)
      : r.role === "profile" ? (r.person < newPersonBase ? profile(a, r.person) : `${namespace(a)}s4/${tag}/subject/${r.person}`)
      : `${namespace(a)}s4/${tag}/${r.role}/${r.person}/${r.n}`,
    constant: (a, name) => `${namespace(a)}s4/${name}`,
  };
}

type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
type Offer = { ms: number; account: number; person: number };

/** The owners a tape M cell writes that must exist before it (seeded), and those it creates (absent before it). */
export function mixOwners(tape: readonly Offer[], names: MixNames) {
  const existing = new Map<string, { role: string; account: number; person: number }>(), created = new Set<string>();
  for (const o of tape) for (const w of (o as Partial<MixOffer>).owners ?? []) {
    const e = names.entity(o.account, w);
    if (w.creates) created.add(e);
    else if (w.role === "task" || (w.role === "profile" && w.person < newPersonBase)) existing.set(e, { role: w.role, account: o.account, person: w.person });
  }
  for (const e of created) existing.delete(e);
  return { existing, created };
}

/**
 * Every field of every owner after the cell, from the owners' fields before it (`initial`) and the acknowledged saves
 * in commit order: a plain slot holds `<operation>/<slot>`, a reference slot its target's entity ID.
 */
export function mixExpected(tape: readonly Offer[], acked: readonly { ordinal: number; id: string; p: number }[], names: MixNames,
  initial: ReadonlyMap<string, ReadonlyMap<string, string>>) {
  const expected = new Map([...initial].map(([e, m]) => [e, new Map(m)]));
  const target = (a: number, t: RefTarget) => "constant" in t ? names.constant(a, t.constant) : names.entity(a, t);
  let facts = 0;
  for (const r of [...acked].sort((x, y) => x.p - y.p)) {
    const o = tape[r.ordinal] as Offer & Partial<MixOffer>;
    for (const w of o.owners ?? []) {
      const e = names.entity(o.account, w);
      const m = expected.get(e) ?? new Map<string, string>();
      expected.set(e, m);
      for (const slot of w.slots) {
        m.set(slotAttribute(slot), w.refs[slot] ? target(o.account, w.refs[slot]!) : `${r.id}/${slot}`);
        facts++;
      }
    }
  }
  return { expected, facts };
}

/** Reads every expected owner at `cut` and compares each `:task/field-*` value (one current row per field). */
export async function mixReadback(reader: DatomicClient, db: string, cut: number, expected: ReadonlyMap<string, ReadonlyMap<string, string>>) {
  const owners = [...expected.keys()];
  let fields = 0;
  for (let i = 0; i < owners.length; i += 50) {
    const batch = owners.slice(i, i + 50);
    const rows = await reader.rows(db, { entityIds: batch, basis: { recordedPosition: cut, validAt: SEED_VALID_FROM } });
    const seen = new Map<string, Map<string, string[]>>();
    for (const row of rows as Row[]) {
      if (!row.attribute.startsWith(":task/field-")) continue;
      const m = seen.get(row.entity_id) ?? new Map<string, string[]>();
      m.set(row.attribute, [...(m.get(row.attribute) ?? []), row.value_string!]);
      seen.set(row.entity_id, m);
    }
    for (const e of batch) {
      const want = expected.get(e)!, got = seen.get(e) ?? new Map();
      assert.deepEqual([...got.keys()].sort(), [...want.keys()].sort(), "tape M: field set differs for " + e);
      for (const [a, v] of want) {
        assert.deepEqual(got.get(a), [v], `tape M: current value differs for ${e} ${a}`);
        fields++;
      }
    }
  }
  return { owners: owners.length, fields };
}

/** Before the cell: none of the owners it creates may exist yet. */
export async function assertAbsent(reader: DatomicClient, db: string, cut: number, created: ReadonlySet<string>) {
  const ids = [...created];
  for (let i = 0; i < ids.length; i += 64) {
    const rows = await reader.rows(db, { entityIds: ids.slice(i, i + 64), basis: { recordedPosition: cut, validAt: SEED_VALID_FROM } });
    assert.equal(rows.length, 0, "tape M: an owner the cell creates exists before it");
  }
  return ids.length;
}

/** Writers by kind of save: the per-subject writer's function (or the general writer) and the gateway's reasons. */
export function mixByKind(tape: readonly Offer[], rows: readonly { ordinal: number; receipt?: unknown; ack?: any; reason?: string }[]) {
  const out: Record<string, { saves: number; acked: number; perSubject: number; functions: Record<string, number>; declined: Record<string, number>; created: number; owners: Record<string, number> }> = {};
  for (const r of rows) {
    const o = tape[r.ordinal] as Offer & Partial<MixOffer>;
    if (!o.kind) continue;
    const k = (out[o.kind] ??= { saves: 0, acked: 0, perSubject: 0, functions: {}, declined: {}, created: 0, owners: {} });
    k.saves++;
    k.owners[String(o.owners!.length)] = (k.owners[String(o.owners!.length)] ?? 0) + 1;
    if (!r.receipt) continue;
    k.acked++;
    const fn = typeof r.ack?.subjectSave === "string" ? r.ack.subjectSave.replace(/-[0-9a-f]{24}$/, "") : "general";
    k.functions[fn] = (k.functions[fn] ?? 0) + 1;
    if (r.ack?.subjectSave) k.perSubject++;
    if (r.ack?.subjectDeclined) k.declined[r.ack.subjectDeclined] = (k.declined[r.ack.subjectDeclined] ?? 0) + 1;
    k.created += r.ack?.subjectCreated ?? 0;
  }
  return out;
}

/** A toy cell of tape M: the quiet account's stream (as the gates' other cells) and `saves` saves per neighbour account. */
export function toyMixCell(quiet: readonly Offer[], band: number, saves: number, window: number, label: string, burst = false) {
  const { params, sha256 } = mixParams();
  const neighbours = mixOffers(params, band, Array(9).fill(saves), window, burst);
  const tape = [...quiet, ...neighbours].sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
  return { cell: { label, rate: 0, tape, duration: window, credits: 6 }, report: mixReport(neighbours, window), paramsSha256: sha256 };
}

export const mixKinds: readonly MixKind[] = ["enrolment", "newSubject", "attributes", "form", "owedForm"];

/** Folds every existing subject of a tape M cell onto a toy's people (new subjects keep their numbers). */
export function foldMix<T extends Offer>(tape: readonly T[], fold: (account: number, person: number) => number): T[] {
  const f = (a: number, p: number) => (p < newPersonBase ? fold(a, p) : p);
  return tape.map((o) => {
    const m = o as T & Partial<MixOffer>;
    if (!m.owners) return { ...o, person: fold(o.account, o.person) };
    return { ...o, person: f(o.account, o.person), owners: m.owners.map((w) => ({ ...w, person: f(o.account, w.person),
      refs: Object.fromEntries(Object.entries(w.refs).map(([k, t]) => [k, "constant" in t ? t : { ...t, person: f(o.account, t.person) }])) })) };
  });
}
