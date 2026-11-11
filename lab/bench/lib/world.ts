/**
 * Subject world generator for the NS driver (TARGETS section 2 scale rungs, section 1.1 P4 buckets).
 *
 * A subject is a placement. Its world is everything reachable from the placement by refs:
 *   own:    placement -> worker; placement -> I-9 -> 2 sections -> evidence [-> document]
 *   shared: placement -> account -> release -> requirements, release -> policy (depth 3)
 * Hop classes (TARGETS 1.1 P4 item 1), by i mod 20: 0-7 hop 3 (40%), 8-14 hop 4 (35%, evidence has
 * documents), 15-19 hop 6 (25%, each section points at the newest of three evidence items, each
 * superseding the previous, each with a document: sec -> ev2 -> ev1 -> ev0 -> doc0 is depth 6).
 * Own facts per class: 28, 40, 50.
 * Size buckets, by account (a mod 20): 0-9 small (world 50-200 facts), 10-16 medium (201-800),
 * 17-19 large (801-2,000). Subject i belongs to account floor(i / 20) mod ACCOUNTS, so hop class and
 * account are independent and subjects spread evenly: pulls of uniformly chosen subjects follow the
 * frozen 50/35/15 x 40/35/25 weights. The requirement count of an account is drawn inside its
 * bucket's range so every world of the account lands in the bucket whatever its hop class.
 *
 * [EXP-N01] Why index arithmetic rather than the RNG for classes: every population count is
 * closed-form for any rung (`populationCounts`), so an oracle can check counts without materializing
 * 10m subjects. Values come from hashes. Numbers follow SCOPE section 2 item 4: money is scaled
 * integers (`integer`), hours and weights are decimal strings; no binary64 business values.
 */
import { typed } from "./canonical.ts";
import { hash2 } from "./rng.ts";

export const RUNGS: Record<string, number> = { "10k": 10_000, "100k": 100_000, "1m": 1_000_000, "10m": 10_000_000 };
/** Valid-from of every seed fact: 2023-11-14T22:13:20Z. Fixed so worlds do not depend on run time. */
export const SEED_VALID_FROM = 1_700_000_000_000;
/** Facts rewritten when history grows in place (P4 flatness). The address belongs to the trace's corrections. */
export const VERSIONED = [":placement/status", ":i9/status"] as const;
export const HOPS = [3, 4, 6] as const;
export type Hop = (typeof HOPS)[number];
export type Bucket = "small" | "medium" | "large";
export const BUCKETS: Record<Bucket, { lo: number; hi: number; reqLo: number; reqHi: number; share: number }> = {
  small: { lo: 50, hi: 200, reqLo: 2, reqHi: 27, share: 0.5 },
  medium: { lo: 201, hi: 800, reqLo: 33, reqHi: 147, share: 0.35 },
  large: { lo: 801, hi: 2000, reqLo: 153, reqHi: 387, share: 0.15 },
};
export const HOP_SHARE: Record<Hop, number> = { 3: 0.4, 4: 0.35, 6: 0.25 };

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

export const accountsFor = (subjects: number) => Math.max(20, Math.ceil(subjects / 500));
export const accountOfSubject = (i: number, accounts: number) => Math.floor(i / 20) % accounts;
export const hopOf = (i: number): Hop => (i % 20 < 8 ? 3 : i % 20 < 15 ? 4 : 6);
export const bucketOfAccount = (a: number): Bucket => (a % 20 < 10 ? "small" : a % 20 < 17 ? "medium" : "large");
export const reqsOf = (a: number) => {
  const b = BUCKETS[bucketOfAccount(a)];
  return b.reqLo + (hash2(`reqs${a}`)[0] % (b.reqHi - b.reqLo + 1));
};
export const OWN_FACTS: Record<Hop, number> = { 3: 28, 4: 40, 6: 50 };
export const sharedCount = (a: number) => 12 + 5 * reqsOf(a);
export const worldFactsOf = (i: number, accounts: number) => OWN_FACTS[hopOf(i)] + sharedCount(accountOfSubject(i, accounts));

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
  event: (i: number, seq: number) => `evt:${pad(i, 8)}:${pad(seq, 10)}`,
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

const s = (value: string): Value => ({ type: "string", value });
const int = (value: number): Value => ({ type: "integer", value: String(value) });
const dt = (value: number): Value => ({ type: "datetime", value });
const r = (value: string): Value => ({ type: "ref", value });
const h = (label: string) => hash2(label)[0];

/** The versioned fact values of subject i at history version v (0 = seed). */
export function versioned(i: number, v: number): Fact[] {
  return [
    { e: ids.placement(i), a: ":placement/status", v: s(v === 0 ? "active" : `active-r${v}`) },
    { e: ids.i9(i), a: ":i9/status", v: s(v === 0 ? "pending" : `review-${v}`) },
  ];
}
export const seedAddress = (i: number) => `${(h(`addr${i}`) % 9000) + 100} Main St`;

/** Every own fact of subject i at seed time (version 0). */
export function ownFacts(i: number, accounts: number): Fact[] {
  const hop = hopOf(i);
  const pl = ids.placement(i), wk = ids.worker(i), i9 = ids.i9(i);
  const out: Fact[] = [
    { e: pl, a: ":placement/worker", v: r(wk) },
    { e: pl, a: ":placement/i9", v: r(i9) },
    { e: pl, a: ":placement/account", v: r(ids.account(accountOfSubject(i, accounts))) },
    { e: pl, a: ":placement/payRateCents", v: int(1500 + (h(`pay${i}`) % 2500)) },
    { e: pl, a: ":placement/startDate", v: dt(SEED_VALID_FROM + (h(`start${i}`) % 400) * 86_400_000) },
    { e: pl, a: ":placement/branch", v: s(`branch-${i % 37}`) },
    { e: pl, a: ":placement/stamp", v: int(0) },
    { e: wk, a: ":worker/name", v: s(`worker ${h(`name${i}`).toString(36)}`) },
    { e: wk, a: ":worker/email", v: s(`w${i}@example.test`) },
    { e: wk, a: ":worker/hoursWeekly", v: s(`${20 + (i % 25)}.${pad(h(`hrs${i}`) % 100, 2)}`) },
    { e: wk, a: ":worker/address", v: s(seedAddress(i)) },
    { e: i9, a: ":i9/dueDate", v: dt(SEED_VALID_FROM + (h(`due${i}`) % 30) * 86_400_000) },
    ...versioned(i, 0),
  ];
  const evidence = hop === 6 ? 3 : 2;
  for (let sec = 0; sec < 2; sec++) {
    const sid = ids.section(i, sec);
    out.push({ e: i9, a: ":i9/section", v: r(sid) });
    out.push({ e: sid, a: ":section/kind", v: s(["section-1", "section-2"][sec]!) });
    out.push({ e: sid, a: ":section/completedAt", v: dt(SEED_VALID_FROM + sec * 3_600_000) });
    for (let ev = 0; ev < evidence; ev++) {
      const eid = ids.evidence(i, sec, ev), did = ids.document(i, sec, ev);
      if (hop !== 6 || ev === evidence - 1) out.push({ e: sid, a: ":section/evidence", v: r(eid) });
      out.push({ e: eid, a: ":evidence/kind", v: s(ev === 0 ? "list-a" : `list-b${ev}`) });
      if (hop === 6 && ev > 0) out.push({ e: eid, a: ":evidence/supersedes", v: r(ids.evidence(i, sec, ev - 1)) });
      if (hop >= 4) {
        out.push({ e: eid, a: ":evidence/document", v: r(did) });
        out.push({ e: did, a: ":doc/blob", v: { type: "blob", value: `sha256:${h(`blob${i}.${sec}.${ev}`).toString(16).padStart(8, "0")}`, mimeType: "application/pdf", size: 10_000 + (h(`sz${i}.${sec}.${ev}`) % 90_000) } });
        out.push({ e: did, a: ":doc/mime", v: s("application/pdf") });
      }
    }
  }
  return out;
}

/** Facts of the shared entities of account a (account, release, policy, requirements). */
export function sharedFacts(a: number): Fact[] {
  const acct = ids.account(a), rel = ids.release(a), pol = ids.policy(a);
  const reqs = reqsOf(a);
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
    out.push({ e: id, a: ":req/minPayCents", v: int(1500 + (k % 7) * 50) });
    out.push({ e: id, a: ":req/weight", v: s(`${1 + (k % 3)}.${pad((k * 37) % 100, 2)}`) });
  }
  return out;
}

/** Canonical member text of one fact, used by digests on both the expected and observed side. */
export function memberOf(e: string, a: string, v: any): string {
  return JSON.stringify(typed([e, a, v]));
}

// ---------------------------------------------------------------- sampling cells (P4 weighted mix)

const bucketAccounts = new Map<string, number[]>();
/** A seeded subject in (bucket, hop) among the first n subjects (u1..u3 uniform in [0,1)), or null when the cell is empty. */
export function subjectInCell(n: number, accounts: number, bucket: Bucket, hop: Hop, u1: number, u2: number, u3: number): number | null {
  const key = `${accounts}:${bucket}`;
  let list = bucketAccounts.get(key);
  if (!list) {
    list = [];
    for (let a = 0; a < accounts; a++) if (bucketOfAccount(a) === bucket) list.push(a);
    bucketAccounts.set(key, list);
  }
  const residues = hop === 3 ? [0, 8] : hop === 4 ? [8, 15] : [15, 20];
  const blocks = Math.ceil(n / 20);
  for (let attempt = 0; attempt < 16; attempt++) {
    const a = list[Math.floor(((u1 + attempt * 0.618034) % 1) * list.length)];
    if (a === undefined || a >= blocks) continue;
    const kMax = Math.floor((blocks - 1 - a) / accounts);
    const k = Math.floor(((u2 + attempt * 0.381966) % 1) * (kMax + 1));
    const residue = residues[0]! + Math.floor(((u3 + attempt * 0.7548777) % 1) * (residues[1]! - residues[0]!));
    const i = 20 * (a + accounts * k) + residue;
    if (i < n) return i;
  }
  return null;
}

// ---------------------------------------------------------------- closed-form counts

/** Number of i in [0, n) with i mod m == r. */
const inClass = (n: number, m: number, r: number) => (n > r ? Math.floor((n - 1 - r) / m) + 1 : 0);
/** Subjects of account a among the first n subjects. */
export function subjectsOfAccount(n: number, accounts: number, a: number) {
  const blocks = Math.ceil(n / 20);
  if (blocks === 0) return 0;
  const lastSize = n - 20 * (blocks - 1);
  return 20 * inClass(blocks, accounts, a) - ((blocks - 1) % accounts === a ? 20 - lastSize : 0);
}

/** Population counts for n seeded subjects of a rung with `accounts` shared worlds, without materializing. */
export function populationCounts(subjects: number, accounts = accountsFor(subjects)) {
  const hopCount: Record<Hop, number> = { 3: 0, 4: 0, 6: 0 };
  for (let r = 0; r < 20; r++) hopCount[hopOf(r)] += inClass(subjects, 20, r);
  const ownEntitiesOf: Record<Hop, number> = { 3: 3 + 2 + 4, 4: 3 + 2 + 8, 6: 3 + 2 + 12 };
  let ownFactsTotal = 0, ownEntities = 0;
  for (const hop of HOPS) { ownFactsTotal += hopCount[hop] * OWN_FACTS[hop]; ownEntities += hopCount[hop] * ownEntitiesOf[hop]; }
  let sharedFactsTotal = 0, sharedEntities = 0, worldSum = 0, worldMin = Infinity, worldMax = 0;
  const bucketSubjects: Record<Bucket, number> = { small: 0, medium: 0, large: 0 };
  // Subjects of one account split over hop classes by residue: count per (account, hop) is exact.
  for (let a = 0; a < accounts; a++) {
    const sc = sharedCount(a);
    sharedFactsTotal += sc;
    sharedEntities += 3 + reqsOf(a);
    const na = subjectsOfAccount(subjects, accounts, a);
    bucketSubjects[bucketOfAccount(a)] += na;
    worldSum += na * sc;
    if (na > 0) {
      worldMin = Math.min(worldMin, sc + OWN_FACTS[3]);
      worldMax = Math.max(worldMax, sc + OWN_FACTS[6]);
    }
  }
  worldSum += ownFactsTotal;
  return {
    subjects, accounts, hopCount, bucketSubjects, ownEntities, sharedEntities, entities: ownEntities + sharedEntities,
    ownFacts: ownFactsTotal, sharedFacts: sharedFactsTotal,
    liveFactsAtSeedEnd: ownFactsTotal + sharedFactsTotal,
    seedAssertions: ownFactsTotal + sharedFactsTotal,
    worldFacts: { min: worldMin, max: worldMax, mean: subjects ? worldSum / subjects : 0 },
  };
}
