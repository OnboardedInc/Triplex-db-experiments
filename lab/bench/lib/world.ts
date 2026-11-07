/**
 * Subject world generator for the NS driver (TARGETS section 2 scale rungs).
 *
 * A subject is a placement. Its world is everything reachable from the placement by refs:
 *   placement -> worker, I-9 -> sections -> evidence (-> superseded evidence) -> document,
 *   placement -> account -> release -> requirements -> policy.
 * Own entities are per subject; account, release, requirements and policy are shared by every
 * subject of the account. World sizes run from 54 to about 1,990 facts at 4 to 5 hops
 * (requirement counts per account cycle through REQ_SIZES).
 *
 * [EXP-N01] Why classes come from index arithmetic (i mod 4, i mod ACCOUNTS, i mod 30), not from
 * the RNG: every population count is then closed-form for any rung (`populationCounts`), so an oracle
 * can check counts without materializing 10m subjects. Values come from hashes for variety.
 * Numbers follow SCOPE section 2 item 4: money is scaled integers (`integer`), hours are decimal
 * strings; no binary64 business values.
 */
import { hash2 } from "./rng.ts";

export const RUNGS: Record<string, number> = { "10k": 10_000, "100k": 100_000, "1m": 1_000_000, "10m": 10_000_000 };
export const REQ_SIZES = [2, 4, 8, 16, 32, 64, 128, 320] as const;
/** Valid-from of every seed fact: 2023-11-14T22:13:20Z. Fixed so worlds do not depend on run time. */
export const SEED_VALID_FROM = 1_700_000_000_000;
/** History panels (TARGETS P4 depths 1, 3, 10): subjects i < PANEL_LIMIT with i mod 30 in {0, 1, 2}. */
export const PANEL_LIMIT = 30_000;
export const VERSIONED = [":placement/status", ":worker/address", ":i9/status"] as const;

export type Value =
  | { type: "string"; value: string }
  | { type: "integer"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "datetime"; value: number }
  | { type: "ref"; value: string }
  | { type: "blob"; value: string; mimeType: string; size: number };
export interface Fact {
  readonly e: string;
  readonly a: string;
  readonly v: Value;
}

export const accountsFor = (subjects: number) => Math.max(8, Math.ceil(subjects / 500));
const pad = (n: number, w: number) => String(n).padStart(w, "0");
export const ids = {
  account: (a: number) => `acct:${pad(a, 5)}`,
  release: (a: number) => `rel:${pad(a, 5)}:v1`,
  policy: (a: number) => `pol:${pad(a, 5)}`,
  requirement: (a: number, k: number) => `req:${pad(a, 5)}:${pad(k, 4)}`,
  placement: (i: number) => `pl:${pad(i, 8)}`,
  worker: (i: number) => `wk:${pad(i, 8)}`,
  i9: (i: number) => `i9:${pad(i, 8)}`,
  section: (i: number, s: number) => `sec:${pad(i, 8)}:${s}`,
  evidence: (i: number, s: number, e: number) => `ev:${pad(i, 8)}:${s}:${e}`,
  document: (i: number, s: number, e: number) => `doc:${pad(i, 8)}:${s}:${e}`,
  event: (i: number, seq: number) => `evt:${pad(i, 8)}:${pad(seq, 9)}`,
};
/** Subject index of an own entity id, or null for shared entities. */
export function subjectOf(entityId: string): number | null {
  const m = /^(?:pl|wk|i9|sec|ev|doc|evt):(\d{8})/.exec(entityId);
  return m ? Number(m[1]) : null;
}
/** Account index of a shared entity id, or null. */
export function accountOf(entityId: string): number | null {
  const m = /^(?:acct|rel|pol|req):(\d{5})/.exec(entityId);
  return m ? Number(m[1]) : null;
}

export const shape = (i: number) => ({ sections: 2 + (i % 2), evidence: 1 + ((i >> 1) % 2) });
export const historyDepth = (i: number) => (i < PANEL_LIMIT ? [1, 3, 10][i % 30] ?? 1 : 1);
export const panelOf = (i: number): 1 | 3 | 10 | null =>
  i < PANEL_LIMIT && i % 30 < 3 ? ([1, 3, 10][i % 30] as 1 | 3 | 10) : null;

const s = (value: string): Value => ({ type: "string", value });
const int = (value: number): Value => ({ type: "integer", value: String(value) });
const dt = (value: number): Value => ({ type: "datetime", value });
const r = (value: string): Value => ({ type: "ref", value });
const h = (label: string) => hash2(label)[0];

/** The versioned fact values of subject i at seed version v (0 .. depth-1). */
export function versioned(i: number, v: number): Fact[] {
  return [
    { e: ids.placement(i), a: ":placement/status", v: s(v === 0 ? "active" : `active-r${v}`) },
    { e: ids.worker(i), a: ":worker/address", v: s(`${h(`addr${i}`) % 9000 + 100} Main St unit ${v}`) },
    { e: ids.i9(i), a: ":i9/status", v: s(v === 0 ? "pending" : `review-${v}`) },
  ];
}

/** Every own fact of subject i at seed version v, including the versioned three. */
export function ownFacts(i: number, accounts: number, v = 0): Fact[] {
  const { sections, evidence } = shape(i);
  const pl = ids.placement(i), wk = ids.worker(i), i9 = ids.i9(i);
  const out: Fact[] = [
    { e: pl, a: ":placement/worker", v: r(wk) },
    { e: pl, a: ":placement/i9", v: r(i9) },
    { e: pl, a: ":placement/account", v: r(ids.account(i % accounts)) },
    { e: pl, a: ":placement/payRateCents", v: int(1500 + (h(`pay${i}`) % 2500)) },
    { e: pl, a: ":placement/startDate", v: dt(SEED_VALID_FROM + (h(`start${i}`) % 400) * 86_400_000) },
    { e: pl, a: ":placement/branch", v: s(`branch-${i % 37}`) },
    { e: pl, a: ":placement/stamp", v: int(0) },
    { e: wk, a: ":worker/name", v: s(`worker ${h(`name${i}`).toString(36)}`) },
    { e: wk, a: ":worker/email", v: s(`w${i}@example.test`) },
    { e: wk, a: ":worker/hoursWeekly", v: s(`${20 + (i % 25)}.${pad(h(`hrs${i}`) % 100, 2)}`) },
    { e: i9, a: ":i9/dueDate", v: dt(SEED_VALID_FROM + (h(`due${i}`) % 30) * 86_400_000) },
    ...versioned(i, v),
  ];
  for (let sec = 0; sec < sections; sec++) {
    const sid = ids.section(i, sec);
    out.push({ e: i9, a: ":i9/section", v: r(sid) });
    out.push({ e: sid, a: ":section/kind", v: s(["section-1", "section-2", "supplement-b"][sec]!) });
    out.push({ e: sid, a: ":section/completedAt", v: dt(SEED_VALID_FROM + sec * 3_600_000) });
    for (let ev = 0; ev < evidence; ev++) {
      const eid = ids.evidence(i, sec, ev), did = ids.document(i, sec, ev);
      out.push({ e: sid, a: ":section/evidence", v: r(eid) });
      out.push({ e: eid, a: ":evidence/kind", v: s(ev === 0 ? "list-a" : "list-b") });
      out.push({ e: eid, a: ":evidence/document", v: r(did) });
      if (ev > 0) out.push({ e: eid, a: ":evidence/supersedes", v: r(ids.evidence(i, sec, ev - 1)) });
      out.push({ e: did, a: ":doc/blob", v: { type: "blob", value: `sha256:${h(`blob${i}.${sec}.${ev}`).toString(16).padStart(8, "0")}`, mimeType: "application/pdf", size: 10_000 + (h(`sz${i}.${sec}.${ev}`) % 90_000) } });
      out.push({ e: did, a: ":doc/mime", v: s("application/pdf") });
    }
  }
  return out;
}

/** Facts of the shared entities of account a (account, release, policy, requirements). */
export function sharedFacts(a: number): Fact[] {
  const acct = ids.account(a), rel = ids.release(a), pol = ids.policy(a);
  const reqs = REQ_SIZES[a % REQ_SIZES.length]!;
  const out: Fact[] = [
    { e: acct, a: ":account/name", v: s(`account ${a}`) },
    { e: acct, a: ":account/tenant", v: s(`tenant-${pad(a, 5)}`) },
    { e: acct, a: ":account/release", v: r(rel) },
    { e: acct, a: ":account/region", v: s(["us-east", "us-west", "eu"][a % 3]!) },
    { e: acct, a: ":account/tier", v: s(a % 5 === 0 ? "enterprise" : "standard") },
    { e: acct, a: ":account/createdAt", v: dt(SEED_VALID_FROM - a * 86_400_000) },
    { e: rel, a: ":release/version", v: s("v1") },
    { e: rel, a: ":release/policy", v: r(pol) },
    { e: rel, a: ":release/activatedAt", v: dt(SEED_VALID_FROM) },
    { e: pol, a: ":policy/name", v: s(`policy ${a}`) },
    { e: pol, a: ":policy/jurisdiction", v: s(["CA", "NY", "TX", "WA"][a % 4]!) },
    { e: pol, a: ":policy/revision", v: int(1) },
  ];
  for (let k = 0; k < reqs; k++) {
    const id = ids.requirement(a, k);
    out.push({ e: rel, a: ":release/requirement", v: r(id) });
    out.push({ e: id, a: ":req/code", v: s(`R${pad(k, 4)}`) });
    out.push({ e: id, a: ":req/kind", v: s(["document", "signature", "check", "training"][k % 4]!) });
    out.push({ e: id, a: ":req/policy", v: r(pol) });
    out.push({ e: id, a: ":req/minPayCents", v: int(1500 + (k % 7) * 50) });
    out.push({ e: id, a: ":req/weight", v: s(`${1 + (k % 3)}.${pad((k * 37) % 100, 2)}`) });
  }
  return out;
}

/** Canonical member text of one fact, used by digests on both the expected and observed side. */
export function memberOf(e: string, a: string, v: any): string {
  switch (v.type) {
    case "blob":
      return `${e}\u0001${a}\u0001blob:${v.value}|${v.mimeType}|${v.size}${v.filename === undefined ? "" : `|${v.filename}`}`;
    case "json":
      return `${e}\u0001${a}\u0001json:${JSON.stringify(v.value)}`;
    default:
      return `${e}\u0001${a}\u0001${v.type}:${String(v.value)}`;
  }
}

// ---------------------------------------------------------------- closed-form counts

const ownCount = (sections: number, evidence: number) =>
  11 + VERSIONED.length + sections * (3 + evidence * 5) + sections * (evidence - 1);
const sharedCount = (reqs: number) => 12 + 6 * reqs;
/** Number of i in [0, n) with i mod m == r. */
const inClass = (n: number, m: number, r: number) => (n > r ? Math.floor((n - 1 - r) / m) + 1 : 0);

/** Population counts for a rung, computed without materializing any subject. */
export function populationCounts(subjects: number, accounts = accountsFor(subjects)) {
  let ownFactsTotal = 0, ownEntities = 0;
  for (let c = 0; c < 4; c++) {
    const n = inClass(subjects, 4, c);
    const { sections, evidence } = shape(c);
    ownFactsTotal += n * ownCount(sections, evidence);
    ownEntities += n * (3 + sections + 2 * sections * evidence);
  }
  let sharedFactsTotal = 0, sharedEntities = 0, worldMin = Infinity, worldMax = 0;
  for (let k = 0; k < REQ_SIZES.length; k++) {
    const n = inClass(accounts, REQ_SIZES.length, k);
    sharedFactsTotal += n * sharedCount(REQ_SIZES[k]!);
    sharedEntities += n * (3 + REQ_SIZES[k]!);
  }
  // World size range over (subject class, account class) pairs that occur.
  let worldSum = 0;
  for (let a = 0; a < Math.min(accounts, REQ_SIZES.length * 4); a++) {
    for (let c = 0; c < 4; c++) {
      // subjects with i mod 4 == c and i mod accounts == a exist iff some i < subjects satisfies both
      const { sections, evidence } = shape(c);
      const w = ownCount(sections, evidence) + sharedCount(REQ_SIZES[a % REQ_SIZES.length]!);
      worldMin = Math.min(worldMin, w);
      worldMax = Math.max(worldMax, w);
    }
  }
  for (let a = 0; a < accounts; a++) {
    const n = inClass(subjects, accounts, a);
    worldSum += n * sharedCount(REQ_SIZES[a % REQ_SIZES.length]!);
  }
  worldSum += ownFactsTotal;
  // History panels: depth d adds d-1 versions of the VERSIONED facts (retract + assert each).
  let versionAssertions = 0;
  for (const [r, d] of [[0, 1], [1, 3], [2, 10]] as const) {
    const n = inClass(Math.min(subjects, PANEL_LIMIT), 30, r);
    versionAssertions += n * (d - 1) * VERSIONED.length;
  }
  const panels = Object.fromEntries([[0, 1], [1, 3], [2, 10]].map(([r, d]) => [`depth${d}`, inClass(Math.min(subjects, PANEL_LIMIT), 30, r!)]));
  return {
    subjects, accounts, ownEntities, sharedEntities, entities: ownEntities + sharedEntities,
    liveFactsAtSeedEnd: ownFactsTotal + sharedFactsTotal,
    seedAssertions: ownFactsTotal + sharedFactsTotal + versionAssertions,
    retractedAtSeedEnd: versionAssertions,
    worldFacts: { min: worldMin, max: worldMax, mean: worldSum / subjects },
    panels,
  };
}
