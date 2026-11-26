// [DX-ERA4] TX2_DERIVED_SEAL=1: derived records are stored sealed under the keys of the protected assertions they were
// computed from (lab/experiments/EXP-DX1/era4/DERIVED-COPIES.md, section 3). The gateway seals and opens; the client
// says which rows each record was computed from and never holds key material.
import assert from "node:assert/strict";
import { DatomicClient } from "../../../packages/datomic/dist/index.js";
import { runtimeApi } from "./triplex.ts";
import * as W0 from "../../../packages/w0/dist/index.js";

export const derivedSealOn = () => process.env["TX2_DERIVED_SEAL"] === "1";
/** [DX-ERA4, third review T2] One subject never stops an account: under TX2_DERIVED_SEAL (or TX2_SUBJECT_STOP=1 in clear)
 * a subject whose evaluation fails, whose seal is refused, or whose ledger or one unit cannot be written within the
 * writer's bound gets a named stop (`recorded-stopped:<subject>`, `settled-stopped:<sequence>:<subject>`) and the
 * recorder and the settlement go on past it. Unset (and the seal off): every such failure stops the frame, as before. */
export const subjectStopsOn = () => derivedSealOn() || process.env["TX2_SUBJECT_STOP"] === "1";
export type StopCode = "LedgerFull" | "EvaluationFailed" | "SealRefused" | "FrameTooLarge";
/** An evaluation that failed, in place of a subject's work items or changes. */
export type Failed = { failed: StopCode; detail: string };
export const failed = (code: StopCode, detail: string): Failed => ({ failed: code, detail: detail.slice(0, 200) });
export const isFailed = (x: unknown): x is Failed => typeof x === "object" && x !== null && typeof (x as Failed).failed === "string";
/** A refusal of the gateway for the request's content (a 4xx answer): it concerns the subjects in the call, not the
 * gateway's availability (5xx, a network error), which still fails the frame so it is tried again. */
export const refusedForContent = (e: unknown) => {
  const s = (e as { status?: number }).status;
  return typeof s === "number" && s >= 400 && s < 500 && s !== 404 && s !== 409;
};
/** `seal` for items of several subjects: one call; when the gateway refuses it for its content, one call per subject,
 * so only the subjects whose own items are refused fail (`refused` names them). */
export async function sealBySubject<I extends { inputs: readonly string[]; value?: string; bytes?: Buffer; place?: string; subject: string }>(
  source: Source, items: I[],
): Promise<{ out: (string | Removed | undefined)[]; refused: Map<string, string> }> {
  const refused = new Map<string, string>();
  try {
    return { out: await seal(source, items), refused };
  } catch (e) {
    if (!refusedForContent(e)) throw e;
  }
  const out: (string | Removed | undefined)[] = items.map(() => undefined);
  const subjects = [...new Set(items.map((x) => x.subject))];
  for (const s of subjects) {
    const idx = items.flatMap((x, i) => (x.subject === s ? [i] : []));
    try {
      const r = await seal(source, idx.map((i) => items[i]!));
      idx.forEach((i, j) => (out[i] = r[j]));
    } catch (e) {
      if (!refusedForContent(e)) throw e;
      refused.set(s, String((e as Error).message ?? e).slice(0, 200));
    }
  }
  return { out, refused };
}
/** [DX-ERA4, third review T2] A test seam (era4/one-subject.ts): seal calls holding an item placed at this subject are
 * refused as the gateway refuses a request's content (400). Unset in every other use. */
export const refuseSubject: { subject?: string } = {};
/** [DX-ERA4, third review T2] A test seam (era4/one-subject.ts, W0's format): this subject's evaluation fails, in the
 * settlement (join/material.ts) and the notice evaluation (notify1/journal.ts), as a world that does not evaluate does.
 * Unset in every other use. */
export const failEvaluation: { subject?: string } = {};

/** [DX-ERA4, third review T1, the owner's ruling of 2026-11-25] TX2_DERIVED_SEAL=1: every evaluation of a world read from
 * the store names W0-1.2's removable attributes (a removed document value is a removed value, neither a value nor absent:
 * DOCEXP holds that document) and, for the notice stream, the work items the subject held (`kept`;
 * era4/W0-REMOVED-VALUES.md). Unset: undefined, which is W0-1.1.2 exactly. */
export const evaluateOptions = (kept?: readonly string[]): W0.EvaluateOptions | undefined =>
  derivedSealOn() ? { removable: [...W0.REMOVABLE_ATTRIBUTES], ...(kept && kept.length ? { kept } : {}) } : undefined;

/** A sealed record as stored: `tdx2.<header>.<nonce>.<ciphertext>` (padded, placed; `tdx1.` before DX-ERA5's review);
 * the header names the database, the assertions and the record's place. */
export const isSealed = (v: unknown): v is string =>
  typeof v === "string" && (v.startsWith("tdx2.") || v.startsWith("tdx1."));
export function sealedHeader(wire: string): { d: string; k: string[]; p?: string; b?: 1 } {
  assert(isSealed(wire), "Not a sealed derived record");
  const h = JSON.parse(Buffer.from(wire.split(".")[1]!, "base64url").toString("utf8"));
  // a placed record computed from no protected value names no assertion (sealed under the key of none, DX-ERA5 B1)
  assert(typeof h.d === "string" && Array.isArray(h.k) && (h.k.length > 0 || typeof h.p === "string"));
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
// [DX-ERA4, second review N9] The entity of each string row a world was built from, so a placed record's names can
// leave out its own subject's rows: the gateway takes every protected row of the place's subject itself (N3). Bounded:
// cleared when full, after which a record's names are sent whole until worlds note them again (more names, never fewer).
const entityOf = new Map<string, string>();
const ENTITY_MAX = 500_000;
export function noteWorld<W extends object>(world: W, rows: Iterable<{ id: string; entityId?: string; value?: { type?: string } }>): W {
  if (derivedSealOn()) {
    const strings = [...rows].filter((r) => r.value?.type === "string");
    for (const r of strings)
      if (r.entityId !== undefined) {
        if (entityOf.size >= ENTITY_MAX) entityOf.clear();
        entityOf.set(r.id, r.entityId);
      }
    worldRows.set(world, union(strings.map((r) => r.id)));
  }
  return world;
}
/** The names a placed record sends: its inputs less the rows of its own subject (the subject and `subject/...`). */
export function foreignInputs(inputs: readonly string[], place: string) {
  // (with a subject root in the place the subject's rows are on its world's entities, none named under the subject:
  // every name is sent)
  const subject = place.slice(place.lastIndexOf("|") + 1);
  return inputs.filter((id) => {
    const e = entityOf.get(id);
    return e === undefined || !(e === subject || e.startsWith(subject + "/"));
  });
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
/** [DX-ERA4, after DX-ERA5's L1] A record's place: its account (the source's scope, and the held account when one
 * database holds several) and its subject. A record sealed for one place opens only where a reader expects that place. */
export const placeOf = (
  source: Source & { held?: { account: string }; derivedAccount?: string },
  subject: string,
  account?: string,
) =>
  // [DX-ERA4, third review T3] `<scope>|<account>|<subject>`: the gateway finds the subject's root itself from the
  // database's declared subject boundary (the place no longer carries it); a held store's records name its account
  `${source.scopeName}|${account ?? source.held?.account ?? source.derivedAccount ?? ""}|${subject}`;
export const databaseOf = (source: Source) => {
  assert(source.backend?.name === "datomic" && source.scopeName, "Derived sealing needs a Datomic scope");
  return "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(source.scopeName))).toString("base64url");
};
/** [DX-ERA4, third review T3 and T4] SCALE1's deep subject (bench/lib/world.ts `subjectOf`, under the account's namespace
 * `acct/<account>/`) as a declared subject boundary: the subject ID derived records name, its one root, and the ID
 * patterns of its own entities. */
export const DEEP_BOUNDARY = {
  v: 1, subject: "pl:s{n}", root: "acct/{account}/pl:{n}", rootRows: true,
  own: ["pl", "wk", "i9", "sec", "ev", "doc", "evt"].flatMap((k) => [
    ...(k === "pl" ? [] : [`acct/{account}/${k}:{n}`]), `acct/{account}/${k}:{n}:*`]),
} as const;
/** Declares the database's subject boundary (one-way; the same value again changes nothing). */
export async function declareBoundary(source: Source, boundary: object = DEEP_BOUNDARY) {
  const client = new DatomicClient(source.backend!.url);
  try {
    return await client.request<{ declared: boolean; changed: boolean }>("POST", `/v2/db/${databaseOf(source)}/subject-boundary`, boundary);
  } finally {
    client.close();
  }
}
const CHUNK = 512;
/** [DX-ERA4, after DX-ERA5's B1] A test seam (era4/derived.ts, ERA4_FAULTS): the next seal or open call fails as a
 * network error, as the client's own 5 s timeout after a stalled gateway, or as a gateway without the option (404).
 * Unset in every other use. */
export const faults: { next?: "fail" | "slow" | "refused"; action?: "derived-seal" | "derived-open"; fired: Record<string, number> } = { fired: {} };
async function call<T>(url: string, db: string, action: "derived-seal" | "derived-open", items: unknown[],
  extra?: (chunk: unknown[], start: number) => Record<string, unknown>) {
  if (faults.next && (faults.action === undefined || faults.action === action)) {
    const kind = faults.next;
    faults.next = undefined;
    faults.fired[action + ":" + kind] = (faults.fired[action + ":" + kind] ?? 0) + 1;
    if (kind === "slow") await new Promise((resolve) => setTimeout(resolve, 5_100));
    throw Object.assign(new Error(kind === "fail" ? "fetch failed (injected)" : kind === "slow" ? "Gateway deadline exceeded (injected stall)" : "Not found (injected: a gateway without the option)"),
      kind === "refused" ? { status: 404 } : {});
  }
  const out: T[] = [];
  const client = new DatomicClient(url);
  try {
    for (let i = 0; i < items.length; i += CHUNK) {
      // While a removal is being applied the gateway answers 503 (its cut refuses a pending removal): wait and retry,
      // at most 50 times 100 ms; anything else, or a removal still pending after that, fails the caller.
      let r: { items: T[] } | undefined;
      for (let tries = 0; !r; tries++) {
        try {
          const chunk = items.slice(i, i + CHUNK);
          r = await client.request<{ items: T[] }>("POST", `/v2/db/${db}/${action}`, { items: chunk, ...(extra?.(chunk, i) ?? {}) });
        } catch (e) {
          if ((e as { status?: number }).status !== 503 || tries >= 50) throw e;
          counters.retried503++;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      assert(Array.isArray(r.items) && r.items.length === Math.min(CHUNK, items.length - i));
      out.push(...r.items);
    }
  } finally {
    client.close();
  }
  return out;
}
export const counters = { sealCalls: 0, sealed: 0, clear: 0, openCalls: 0, opened: 0, removed: 0, retried503: 0 };

/** Seals each value under the protected assertions among `inputs` of `source`'s database. A value computed from no
 * protected assertion comes back unchanged (it held none); one whose assertion is already removed comes back as the
 * removed marker (it is never stored in clear). */
export async function seal(
  source: Source,
  items: { inputs: readonly string[]; value?: string; bytes?: Buffer; place?: string }[],
) {
  if (!items.length) return [] as (string | Removed)[];
  const db = databaseOf(source);
  counters.sealCalls++;
  if (refuseSubject.subject !== undefined && items.some((x) => x.place !== undefined && x.place.endsWith("|" + refuseSubject.subject)))
    throw Object.assign(new Error("Refused (injected): an item of " + refuseSubject.subject), { status: 400 });
  // [DX-ERA4, second review N9] a placed item's rows travel once per place per call (`names`), not once per record:
  // a frame's records repeat their subject's world; the gateway also takes the subject's own protected rows itself (N3)
  const wire = items.map((x) => {
    const content = x.bytes !== undefined ? { bytes: x.bytes.toString("base64") } : { value: x.value! };
    return x.place === undefined ? { ids: [...x.inputs], ...content } : { ...content, place: x.place };
  });
  const r = await call<{ sealed?: string; clear?: true; removed?: string[]; seq?: number }>(
    source.backend!.url,
    db,
    "derived-seal",
    wire,
    (chunk, start) => {
      const names = new Map<string, Set<string>>();
      for (const it of items.slice(start, start + chunk.length))
        if (it.place !== undefined) {
          const set = names.get(it.place) ?? new Set<string>();
          for (const id of foreignInputs(it.inputs, it.place)) set.add(id);
          names.set(it.place, set);
        }
      return { names: Object.fromEntries([...names].map(([p, set]) => [p, [...set].sort()])) };
    },
  );
  // [DX-ERA4, after DX-ERA5's B1] every answer is sealed, removed, or clear because the gateway found no protected
  // input; anything else fails the caller, whose frame then writes nothing
  return r.map((x, i): string | Removed => {
    if (typeof x.sealed === "string" && isSealed(x.sealed)) return counters.sealed++, x.sealed;
    if (x.clear === true) {
      assert(items[i]!.value !== undefined, "A record of bytes came back clear");
      return counters.clear++, items[i]!.value!;
    }
    assert(Array.isArray(x.removed), "The seal route answered neither sealed, removed nor clear");
    return { removed: x.removed, ...(x.seq ? { seq: x.seq } : {}) };
  });
}

/** Opens sealed records (any database of the same gateway, named in each header). Values that are not sealed are
 * returned as they are. */
export async function open(url: string, values: readonly unknown[], places?: readonly (string | undefined)[]) {
  const out: (unknown | Removed)[] = [...values];
  const by = new Map<string, number[]>();
  values.forEach((v, i) => {
    if (!isSealed(v)) return;
    const d = sealedHeader(v).d;
    by.set(d, [...(by.get(d) ?? []), i]);
  });
  for (const [db, idx] of by) {
    counters.openCalls++;
    const r = await call<{ value?: string; bytes?: string; removed?: string[]; seq?: number }>(url, db, "derived-open",
      idx.map((i) => (places?.[i] === undefined ? values[i] : { record: values[i], place: places[i] })));
    r.forEach((x, j) => {
      if (x.value !== undefined) (counters.opened++, (out[idx[j]!] = x.value));
      // [DX-ERA4, second review N1] a record of bytes (a ledger part) opens to its bytes
      else if (x.bytes !== undefined) (counters.opened++, (out[idx[j]!] = { bytes: Buffer.from(x.bytes, "base64") }));
      else (counters.removed++, (out[idx[j]!] = { removed: x.removed!, ...(x.seq ? { seq: x.seq } : {}) }));
    });
  }
  return out;
}
/** The assertions a stored record names: its header's, or none for a clear one. */
export const namedInputs = (v: unknown): string[] => (isSealed(v) ? sealedHeader(v).k : isRemoved(v) ? v.removed : []);
