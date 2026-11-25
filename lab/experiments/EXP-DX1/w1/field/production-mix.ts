import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { quantileOf, type Knots } from "./production.ts";

// [DX-S4] Tape M: the product's real mix of saves, most of which CREATE an entity (s4/CREATION-SAVES.md section 2).
// Every parameter is a rounded share or a distribution shape (real2/production-mix.json); absolute rates come from the
// runner (the same saves per second as shape S at each load step). Each save is one commit of one subject's save, and
// names its owners by role so the runner can map them onto its own entities (toy or full size).
// Rejected: extending production.ts (shapes R and S and their hashes must reproduce) and the lab producer (tape M is
// sent only through the product's path).

export type MixKind = "enrolment" | "newSubject" | "attributes" | "form" | "owedForm";
export type MixParams = {
  version: "triplex-s4-production-mix/1";
  kinds: Record<MixKind, number>;
  burstKinds: Partial<Record<MixKind, number>>;
  enrolmentOfNewSubject: number;
  newSubjectWindowSeconds: number;
  attributesWindowSeconds: number;
  twoOwnerFormShare: number;
  formValues: Knots;
  pageRecords: Knots;
  enrolmentsPerSubject: Knots;
  formFixedFacts: number;
  profileFacts: number;
  enrolmentFacts: number;
  attributeFacts: number;
  owedFormFacts: number;
  bandPeople: number;
  seed: number;
};
/**
 * An owner of a save, by role. `person` is a tape person (an existing subject of the band, or a new subject numbered
 * from `newPersonBase`); `n` numbers a subject's enrolments and owed forms created by this tape (from 1).
 *   task: the subject's existing task (form saves); profile: the subject's profile (existing, or new for a new subject);
 *   enrolment / form: an entity this tape creates (or wrote before, for attribute writes).
 */
export type Role = "task" | "profile" | "enrolment" | "form";
export type OwnerRef = { role: Role; person: number; n: number };
/** A reference value's target: an owner of the tape, or a constant account-level entity (a client, a form definition). */
export type RefTarget = OwnerRef | { constant: string };
export type MixOwner = OwnerRef & { slots: number[]; refs: Record<number, RefTarget>; creates: boolean };
export type MixOffer = {
  ms: number; account: number; person: number; subtask: 0; ordinal: 0; extra: false;
  /** Save index within the account's cell. */
  save: number;
  kind: MixKind;
  owners: MixOwner[];
  /** Kept for the tape report's shape: every slot of every owner. */
  slots: number[];
  gap: null;
};

export const newPersonBase = 1_000_000;
// Slots: profile and enrolment fields from 0; a form save's answers from 0, its five fixed facts (progress, status, three
// audit facts) at 190..194 and its page-submission records from 200.
export const formFixedSlot = 190, pageRecordSlot = 200;

export function loadMixParams(file: string): { params: MixParams; sha256: string } {
  const bytes = readFileSync(file);
  const params = JSON.parse(bytes.toString()) as MixParams;
  checkMixParams(params);
  return { params, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export function checkMixParams(p: MixParams) {
  assert.equal(p.version, "triplex-s4-production-mix/1");
  for (const shares of [p.kinds, p.burstKinds]) {
    const total = Object.values(shares).reduce((a, b) => a + (b ?? 0), 0);
    assert(Math.abs(total - 1) < 1e-9, "kind shares must sum to 1");
  }
  for (const knots of [p.formValues, p.pageRecords, p.enrolmentsPerSubject]) {
    for (let i = 1; i < knots.length; i++) assert(knots[i]![0] >= knots[i - 1]![0] && knots[i]![1] >= knots[i - 1]![1]);
    assert.equal(knots.at(-1)![1], 1);
  }
  assert(p.formValues.at(-1)![0] <= 128 && p.pageRecords.at(-1)![0] <= 128, "sizes stop at the store's 128-fact bound");
  assert(p.enrolmentsPerSubject.at(-1)![0] <= 1680, "enrolments stop at the store's owed-item bound");
  assert(p.bandPeople >= 1000 && Number.isSafeInteger(p.seed));
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
const mix = (...xs: number[]) => createHash("sha256").update(JSON.stringify(xs)).digest().readUInt32BE(0);
const draw = (knots: Knots, u: number) => Math.max(1, Math.round(quantileOf(knots, u)));
const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => from + i);
function pick<K extends string>(shares: Partial<Record<K, number>>, u: number): K {
  let acc = 0;
  const entries = Object.entries(shares) as [K, number][];
  for (const [k, s] of entries) if (u < (acc += s)) return k;
  return entries.at(-1)![0];
}

/**
 * One account's saves in a cell of `window` seconds: `saves` Poisson arrivals, each a kind drawn from the shares (or
 * the burst's, where every save creates something). Deterministic in (seed, band, account, saves, window, burst).
 */
export function accountMix(p: MixParams, band: number, account: number, saves: number, window: number, burst = false): MixOffer[] {
  assert(saves >= 0 && Number.isSafeInteger(saves) && window > 0);
  const rand = rng(mix(p.seed, band, account, saves, window, burst ? 1 : 0));
  // Arrival times: `saves` uniform order statistics over the window (a Poisson process conditioned on its count).
  const times = range(saves).map(() => rand() * window).sort((a, b) => a - b);
  // The subjects an enrolment of an existing subject goes to, weighted by how many enrolments a subject holds (the long
  // tail); a form save goes to any existing subject of the band.
  const weights = range(p.bandPeople).map((i) => draw(p.enrolmentsPerSubject, (mix(p.seed, band, account, i) + 0.5) / 2 ** 32));
  const cumulative: number[] = [];
  weights.reduce((acc, w, i) => (cumulative[i] = acc + w), 0);
  const total = cumulative.at(-1)!;
  const weighted = (u: number) => {
    let lo = 0, hi = cumulative.length - 1;
    const x = u * total;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cumulative[m]! <= x) lo = m + 1; else hi = m; }
    return lo;
  };
  const shares = burst ? p.burstKinds : p.kinds;
  const out: MixOffer[] = [];
  const created = { subjects: 0, enrolments: new Map<number, number>(), forms: new Map<number, number>() };
  const recentSubjects: { person: number; t: number; enrolled: boolean }[] = [];
  const recentEnrolments: { person: number; n: number; t: number }[] = [];
  for (const [index, t] of times.entries()) {
    let kind = pick(shares, rand());
    // An attribute write needs an enrolment created a few seconds before; at the very start of a cell there is none yet.
    const latest = recentEnrolments.at(-1);
    const lastEnrolment = latest && t - latest.t <= p.attributesWindowSeconds ? latest : undefined;
    if (kind === "attributes" && !lastEnrolment) kind = "enrolment";
    const base = { ms: t * 1000, account, subtask: 0 as const, ordinal: 0 as const, extra: false as const, save: index, gap: null };
    const plain = (role: Role, person: number, n: number, k: number, creates: boolean, from = 0): MixOwner =>
      ({ role, person, n, slots: range(k, from), refs: {}, creates });
    let offer: Omit<MixOffer, "slots">;
    if (kind === "newSubject") {
      const person = newPersonBase + created.subjects++;
      recentSubjects.push({ person, t, enrolled: false });
      offer = { ...base, person, kind, owners: [plain("profile", person, 0, p.profileFacts, true)] };
    } else if (kind === "enrolment") {
      const fresh = recentSubjects.find((s) => !s.enrolled && t - s.t <= p.newSubjectWindowSeconds);
      const person = fresh && rand() < p.enrolmentOfNewSubject ? (fresh.enrolled = true, fresh.person) : weighted(rand());
      const n = (created.enrolments.get(person) ?? 0) + 1;
      created.enrolments.set(person, n);
      recentEnrolments.push({ person, n, t });
      const owner = plain("enrolment", person, n, p.enrolmentFacts, true);
      owner.refs = { 0: { role: "profile", person, n: 0 }, 1: { constant: `client-${person % 17}` } };
      offer = { ...base, person, kind, owners: [owner] };
    } else if (kind === "attributes") {
      const e = lastEnrolment!;
      const owner = plain("enrolment", e.person, e.n, p.attributeFacts, false, p.enrolmentFacts);
      owner.refs = { [p.enrolmentFacts]: { constant: `cost-centre-${index % 5}` }, [p.enrolmentFacts + 1]: { constant: `manager-${index % 11}` } };
      offer = { ...base, person: e.person, kind, owners: [owner] };
    } else if (kind === "owedForm") {
      const e = recentEnrolments.at(-1);
      const person = e?.person ?? weighted(rand());
      const n = (created.forms.get(person) ?? 0) + 1;
      created.forms.set(person, n);
      const owner = plain("form", person, n, p.owedFormFacts, true);
      owner.refs = { 0: { constant: `form-definition-${n % 7}` } };
      if (e) owner.refs[1] = { role: "enrolment", person, n: e.n };
      offer = { ...base, person, kind, owners: [owner] };
    } else {
      const person = Math.floor(rand() * p.bandPeople);
      const values = draw(p.formValues, rand()), records = draw(p.pageRecords, rand());
      const task: MixOwner = { role: "task", person, n: 0, creates: false, refs: {},
        slots: [...range(values), ...range(p.formFixedFacts, formFixedSlot), ...range(records, pageRecordSlot)] };
      const owners = [task];
      if (rand() < p.twoOwnerFormShare) owners.push(plain("profile", person, 0, 2, false));
      offer = { ...base, person, kind, owners };
    }
    out.push({ ...offer, slots: offer.owners.flatMap((o) => o.slots) });
  }
  return out;
}

/** The nine neighbour accounts of one loaded cell: `saves[n]` saves for account n + 1. */
export function mixOffers(p: MixParams, band: number, saves: readonly number[], window: number, burst = false): MixOffer[] {
  assert.equal(saves.length, 9);
  return saves.flatMap((n, i) => accountMix(p, band, i + 1, n, window, burst)).sort((a, b) => a.ms - b.ms || a.account - b.account);
}

const pct = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]!;
};
const round = (x: number, d = 4) => Number(x.toFixed(d));

/** What a reader checks tape M against: kind shares, creation shares, owners, facts, the enrolment tail. */
export function mixReport(tape: readonly MixOffer[], seconds: number) {
  const n = tape.length;
  const share = (f: (o: MixOffer) => boolean) => round(tape.filter(f).length / Math.max(1, n));
  const facts = tape.map((o) => o.slots.length);
  const perSubject = new Map<string, number>();
  for (const o of tape) if (o.kind === "enrolment") perSubject.set(`${o.account}/${o.person}`, (perSubject.get(`${o.account}/${o.person}`) ?? 0) + 1);
  const forms = tape.filter((o) => o.kind === "form");
  const formFacts = forms.map((o) => o.slots.length);
  return {
    version: "triplex-s4-mix-report/1", seconds, saves: n, savesPerSecond: round(n / seconds, 3),
    kinds: Object.fromEntries((["enrolment", "newSubject", "attributes", "form", "owedForm"] as const).map((k) => [k, share((o) => o.kind === k)])),
    creating: share((o) => o.owners.some((w) => w.creates)),
    owners: { one: share((o) => o.owners.length === 1), two: share((o) => o.owners.length === 2) },
    withReferences: share((o) => o.owners.some((w) => Object.keys(w.refs).length > 0)),
    facts: { mean: round(facts.reduce((a, b) => a + b, 0) / Math.max(1, n), 2), p50: pct(facts, 0.5), p90: pct(facts, 0.9), p99: pct(facts, 0.99), max: pct(facts, 1) },
    formSaves: { saves: forms.length, twoOwners: round(forms.filter((o) => o.owners.length === 2).length / Math.max(1, forms.length)),
      factsP50: pct(formFacts, 0.5), factsP99: pct(formFacts, 0.99),
      over128Facts: round(forms.filter((o) => o.slots.length > 128).length / Math.max(1, forms.length)),
      over3Values: round(forms.filter((o) => o.owners[0]!.slots.filter((s) => s < formFixedSlot).length > 3).length / Math.max(1, forms.length)) },
    enrolmentsPerSubjectInWindow: { subjects: perSubject.size, p50: pct([...perSubject.values()], 0.5), p99: pct([...perSubject.values()], 0.99), max: pct([...perSubject.values()], 1) },
    newSubjectsEnrolledWithinWindow: round(tape.filter((o) => o.kind === "enrolment" && o.person >= newPersonBase).length / Math.max(1, tape.filter((o) => o.kind === "enrolment").length)),
  };
}
