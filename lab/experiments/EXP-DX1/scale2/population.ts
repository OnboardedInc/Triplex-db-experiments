// [DX-SCALE2] Many small accounts in the one database: the account roster and every subject's facts, from a seed.
// Three kinds of account share one Datomic database, each under its own `acct/<account>/` prefix (the prefix every
// per-account mechanism keys on: the write gateway's turns, the ID list route, the sweep, the held settlement names):
//   deep     SCALE1's deep subject (`person`, about 160 facts) at the scale target's ten deep accounts;
//   publish  small accounts whose subjects are deep-shaped (the release rules of W0 are defined on that shape), the
//            ones that Publish and settle in the miniature;
//   thin     small accounts of thin subjects: a root with four facts and one form (task 0) of six fields.
// Account sizes are skewed (most accounts are tiny, a few reach the 200-subject cap), drawn from a seeded generator,
// so a roster is a pure function of (seed, counts). No production volume is used or implied: the skew is invented.
// Rejected: REAL1's small accounts (all under one `acct/real1/` prefix, so the gateway sees them as ONE account named
// "real1"; see SCALE2.md section 1) and one scope per small account (SCALE1's small plan; the owner's rule is one
// database).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { ids, type Fact } from "../../../bench/lib/world.ts";
import { keyFor, person, root, task } from "../scale1/decision/plan.ts";

export type Kind = "deep" | "publish" | "thin";
export type Account = { index: number; key: string; kind: Kind; people: number };
export const thinFields = 6;
export const statuses = ["pending", "complete", "requires_action"] as const;

/** A small deterministic generator (xorshift32 seeded from SHA-256), so rosters do not depend on Math.random. */
export class Seeded {
  private s: number;
  constructor(label: string) {
    this.s = createHash("sha256").update(label).digest().readUInt32LE(0) || 1;
  }
  next() {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
}

/**
 * Skewed account size in [min, max]: 60% of accounts 5 to 15 subjects, 30% 16 to 60, 10% 61 to 200 (clamped to
 * [min, max]). Mean about 30 at the full range. Invented, not taken from any production count.
 */
export function sizeOf(r: Seeded, min = 5, max = 200) {
  const u = r.next(), v = r.next();
  const n = u < 0.6 ? 5 + Math.floor(v * 11) : u < 0.9 ? 16 + Math.floor(v * 45) : 61 + Math.floor(v * 140);
  return Math.max(min, Math.min(max, n));
}

/**
 * The roster: `deep` accounts 0..deep-1 with `deepPeople` subjects each, then `publish` accounts (deep-shaped
 * subjects, sizes skewed in [5, publishMax]), then `thin` accounts (thin subjects, sizes skewed in [5, 200]).
 */
export function roster(o: { seed: string; deep: number; deepPeople: number; publish: number; publishMax: number; thin: number }) {
  const r = new Seeded("scale2/roster/" + o.seed);
  const out: Account[] = [];
  for (let a = 0; a < o.deep; a++) out.push({ index: a, key: keyFor(a), kind: "deep", people: o.deepPeople });
  for (let k = 0; k < o.publish; k++) {
    const index = o.deep + k;
    out.push({ index, key: keyFor(index), kind: "publish", people: sizeOf(r, 5, o.publishMax) });
  }
  for (let k = 0; k < o.thin; k++) {
    const index = o.deep + o.publish + k;
    out.push({ index, key: keyFor(index), kind: "thin", people: sizeOf(r) });
  }
  const keys = new Set(out.map((a) => a.key));
  assert.equal(keys.size, out.length, "account keys are unique");
  return out;
}

const ns = (a: Account) => "acct/" + a.key + "/";
export const subjectId = (a: Account, i: number) => (a.kind === "thin" ? ns(a) + ids.placement(i) : root(a.index, i));
export const formId = (a: Account, i: number) => (a.kind === "thin" ? ns(a) + taskId(i, 0) : task(a.index, i));
export const thinValue = (a: Account, i: number, n: number) =>
  createHash("sha256").update(JSON.stringify(["scale2-seed", a.key, i, n])).digest("hex").slice(0, 57);
export const statusOf = (a: Account, i: number) => statuses[(i * 7 + a.index) % 3]!;

/** Every fact of subject i of account a at seed time (deep and publish: SCALE1's `person`). */
export function facts(a: Account, i: number): Fact[] {
  if (a.kind !== "thin") return person(a.index, i);
  const s = subjectId(a, i), f = formId(a, i);
  const str = (value: string) => ({ type: "string" as const, value });
  return [
    { e: s, a: ":subject/account", v: str(a.key) },
    { e: s, a: ":subject/member", v: str(String(i)) },
    { e: s, a: ":person/status", v: str(statusOf(a, i)) },
    { e: s, a: ":person/team", v: str("team-" + (i % 5)) },
    ...Array.from({ length: thinFields }, (_, n) => ({ e: f, a: ":task/field-" + n, v: str(thinValue(a, i, n)) })),
  ];
}

export function summary(accounts: readonly Account[]) {
  const by = (k: Kind) => accounts.filter((a) => a.kind === k);
  const sizes = (xs: Account[]) => xs.map((a) => a.people).sort((x, y) => x - y);
  const pct = (xs: number[], q: number) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(q * xs.length))]! : 0;
  const describe = (xs: Account[]) => {
    const s = sizes(xs);
    return { accounts: xs.length, subjects: s.reduce((n, x) => n + x, 0), min: s[0] ?? 0, p50: pct(s, 0.5), p90: pct(s, 0.9),
      max: s.at(-1) ?? 0 };
  };
  return { deep: describe(by("deep")), publish: describe(by("publish")), thin: describe(by("thin")) };
}
