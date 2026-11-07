/**
 * The seeded sweep population (SPEC 12.3) and the fingerprint world recipe (SPEC 12.7 item 2), streamed one world at a time.
 */
import { createHash } from "node:crypto";
import { parseDate, formatDay, startOfDay } from "./dates.js";
import { quote } from "./json.js";
import type { Basis, Fact, World } from "./kernel.js";
import type { Erased } from "./schema.js";

const SEED = "W0-pop-1";
const BASE_DAY = parseDate("2026-11-04"); // the basis date, a Wednesday (SPEC 12.3)
export const POPULATION_VALID_TIME = "2026-11-04T12:00:00.000000Z";

/**
 * SPEC 12.3 `draw(f, i, M)`: the first 8 bytes of SHA-256 over the ASCII bytes of `W0-pop-1/` + f + `/` + decimal(i), read as
 * a big-endian unsigned integer, modulo M. The modulo bias is part of the definition (SPEC 14 row 32).
 */
export function drawBig(f: string, i: number, M: bigint): bigint {
  const h = createHash("sha256")
    .update(SEED + "/" + f + "/" + i, "latin1")
    .digest();
  return h.readBigUInt64BE(0) % M;
}
export const draw = (f: string, i: number, M: number): number => Number(drawBig(f, i, BigInt(M)));

/** SPEC 12.3 weighted choice: x = draw(f, i, 10000); the first option whose running total of weights exceeds x. */
function weighted<T>(f: string, i: number, options: readonly (readonly [number, T])[]): T {
  const x = draw(f, i, 10000);
  let total = 0;
  for (const [w, value] of options) {
    total += w;
    if (total > x) return value;
  }
  throw new Error(`weights of ${f} do not reach 10000`);
}

/** SPEC 12.3 uniform integer in [a, b]: a + draw(f, i, b - a + 1). */
const uniform = (f: string, i: number, a: number, b: number): number => a + draw(f, i, b - a + 1);

/** isqrt(m): the largest n with n * n <= m, by integer Newton iteration (no floating point; SPEC 12.3). */
export function isqrt(m: bigint): bigint {
  if (m < 2n) return m;
  let x = m;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + m / x) >> 1n;
  }
  return x;
}

/** The rung sizes: L = N / 50 (RULINGS Q36h), K = 4 x ceil(L / 80) (RULINGS Q44a). */
export interface Rung {
  readonly N: number;
  readonly L: number;
  readonly K: number;
  readonly locDigits: number;
  readonly jurDigits: number;
  /** cumulative Zipf weights over ranks 1..L, as bigints */
  readonly zipfCum: readonly bigint[];
  readonly zipfTotal: bigint;
}

export function rung(N: number): Rung {
  if (!Number.isSafeInteger(N) || N <= 0 || N % 50 !== 0)
    throw new RangeError("N must be a positive multiple of 50");
  const L = N / 50;
  const K = 4 * Math.ceil(L / 80);
  // SPEC 12.3 Zipf rank, s = 0.5: w_r = isqrt(10^24 div r), which is floor(10^12 / sqrt(r)).
  const cum: bigint[] = [];
  let total = 0n;
  for (let r = 1; r <= L; r++) {
    total += isqrt(10n ** 24n / BigInt(r));
    cum.push(total);
  }
  return {
    N,
    L,
    K,
    locDigits: String(L).length,
    jurDigits: Math.max(3, String(K).length),
    zipfCum: cum,
    zipfTotal: total,
  };
}

/** x = draw("loc.rank", i, T); the rank is the first r whose running total of weights exceeds x (binary search). */
function zipfRank(R: Rung, i: number): number {
  const x = drawBig("loc.rank", i, R.zipfTotal);
  let lo = 0;
  let hi = R.L - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (R.zipfCum[mid]! > x) hi = mid;
    else lo = mid + 1;
  }
  return lo + 1;
}

export const placementId = (i: number): string => "pl:s" + String(i).padStart(8, "0");
export const locationId = (R: Rung, r: number): string =>
  "loc:l" + String(r).padStart(R.locDigits, "0");
export const jurisdictionId = (R: Rung, q: number): string =>
  "jur:j" + String(q).padStart(R.jurDigits, "0");
/** Location rank r references jurisdiction ((r - 1) mod K) + 1 (SPEC 12.3, RULINGS Q40b). */
export const jurisdictionOf = (R: Rung, r: number): number => ((r - 1) % R.K) + 1;
/** Jurisdiction q's state floor: 1200, 1500, 1650 or 1800 when q mod 4 is 0, 1, 2 or 3. */
export const stateFloor = (q: number): number => [1200, 1500, 1650, 1800][q % 4]!;
/** Location rank r has `localMinWageCents` 1850 exactly when r mod 4 = 2. */
export const hasLocalFloor = (r: number): boolean => r % 4 === 2;

type Record3 = {
  readonly id: string;
  readonly verdict: string;
  readonly author: string;
  readonly target: string;
};

/** Every random choice of one placement (the SPEC 12.3 per-placement table). */
export interface Plan {
  readonly i: number;
  readonly S: string;
  readonly startDate: string | null;
  readonly s1: boolean;
  readonly ssn: string | Erased | null;
  readonly ssnValid: boolean;
  readonly ev: string | null;
  readonly evAt: string | null;
  readonly evres: string | null;
  readonly bgc: string | null;
  /** decision records in plan order, with which command slot each takes */
  readonly i9Records: readonly Record3[];
  readonly bgcRecord: Record3 | null;
  readonly payRecordBefore: Record3 | null;
  readonly payRecordAfter: Record3 | null;
  readonly rank: number | null;
  readonly pay: { readonly final: number; readonly baseline: number; readonly c: number } | null;
  readonly raise: boolean;
  readonly wm: number | null;
  readonly doc: {
    readonly type: string;
    readonly expiresOn: string | null;
    readonly reverified: boolean;
  } | null;
  /** 0, 1 or 2: the `size` bucket drawn (SPEC 12.6: per-bucket figures use the draw, never the fact count) */
  readonly bucket: number;
  readonly T: number;
  readonly hops: number;
}

const rec = (
  S: string,
  local: string,
  target: string,
  verdict: string,
  author: string,
): Record3 => ({
  id: S + "/dec:" + local,
  target,
  verdict,
  author,
});

/** The SPEC 12.3 draws for placement i. Each conditional draw is made only under its condition; draws are independent. */
export function plan(R: Rung, i: number): Plan {
  const S = placementId(i);
  // Start date: absent 200; pre-start 1800 (k 1..14); Section 2 window 2000 (k -4..0); settled 6000 (k -365..-5).
  const startOpt = weighted("start", i, [
    [200, null],
    [1800, [1, 14]],
    [2000, [-4, 0]],
    [6000, [-365, -5]],
  ] as const);
  const startDate =
    startOpt === null
      ? null
      : formatDay(BASE_DAY + uniform("start.u", i, startOpt[0], startOpt[1]));
  const s1 = weighted("s1", i, [
    [8500, true],
    [1500, false],
  ] as const);
  // SSN: absent 1000; valid 8730; dashed 180; erased 90. Valid: the 9 digits of 100000000 + i.
  const ssnOpt = weighted("ssn", i, [
    [1000, "absent"],
    [8730, "valid"],
    [180, "dashed"],
    [90, "erased"],
  ] as const);
  const digits = String(100000000 + i);
  const ssn =
    ssnOpt === "absent"
      ? null
      : ssnOpt === "valid"
        ? digits
        : ssnOpt === "dashed"
          ? digits.slice(0, 3) + "-" + digits.slice(3, 5) + "-" + digits.slice(5)
          : { erasedAt: "2026-11-01T00:00:00.000000Z" };
  const ev = weighted("ev", i, [
    [3000, null],
    [4000, "pending"],
    [500, "tnc"],
    [2200, "authorized"],
    [300, "fnc"],
  ] as const);
  const evAt = ev === null ? null : startOfDay(BASE_DAY - uniform("ev.u", i, 0, 20));
  // Runtime submit result: only when the status is absent and the SSN valid, where "valid" is the `valid` option only (Q53
  // reading A10).
  const evres =
    ev === null && ssnOpt === "valid"
      ? weighted("evres", i, [
          [2000, "accepted"],
          [500, "rejected"],
          [7500, null],
        ] as const)
      : null;
  const bgc = weighted("bgc", i, [
    [2000, null],
    [2000, "pending"],
    [5000, "clear"],
    [1000, "consider"],
  ] as const);
  const bgcOpt =
    bgc === "consider"
      ? weighted("bgcdec", i, [
          [4000, null],
          [4000, ["approve", "person"]],
          [1000, ["reject", "person"]],
          [1000, ["approve", "agent"]],
        ] as const)
      : null;
  const bgcRecord = bgcOpt === null ? null : rec(S, "b1", "bgc.adjudication", bgcOpt[0], bgcOpt[1]);
  const i9Opt = weighted("i9dec", i, [
    [3400, []],
    [4800, [["approve", "person"]]],
    [300, [["waive", "person"]]],
    [400, [["reject", "person"]]],
    [600, [["approve", "agent"]]],
    [
      300,
      [
        ["approve", "person"],
        ["reject", "person"],
      ],
    ],
    [
      200,
      [
        ["approve", "person"],
        ["reject", "agent"],
      ],
    ],
  ] as const);
  const i9Records = i9Opt.map(([verdict, author], k) =>
    rec(S, "i" + (k + 1), "i9.section2", verdict, author),
  );
  const rank = weighted("loc", i, [
    [100, false],
    [9900, true],
  ] as const)
    ? zipfRank(R, i)
    : null;
  let pay: Plan["pay"] = null;
  let payRecordBefore: Record3 | null = null;
  let payRecordAfter: Record3 | null = null;
  let raise = false;
  if (
    weighted("pay", i, [
      [100, false],
      [9900, true],
    ] as const)
  ) {
    const dOpt = weighted<number | readonly [number, number]>("pay.d", i, [
      [600, -1],
      [1000, 0],
      [2400, [1, 199]],
      [6000, [200, 2000]],
    ] as const);
    const d = typeof dOpt === "number" ? dOpt : uniform("pay.d.u", i, dOpt[0], dOpt[1]);
    // payRateCents = the state floor of the location's jurisdiction + d, using 1650 without a location.
    const floor = rank === null ? 1650 : stateFloor(jurisdictionOf(R, rank));
    const final = floor + d;
    const cOpt = weighted<number | readonly [number, number]>("chg", i, [
      [8000, 0],
      [600, [1, 500]],
      [1000, [501, 1000]],
      [400, [-1000, -501]],
    ] as const);
    const c = typeof cOpt === "number" ? cOpt : uniform("chg.u", i, cOpt[0], cOpt[1]);
    pay = { final, baseline: final - c, c };
    if (Math.abs(c) > 500) {
      const opt = weighted("chgdec", i, [
        [5500, null],
        [3000, ["after", "approve", "person"]],
        [500, ["before", "approve", "person"]],
        [500, ["after", "reject", "person"]],
        [500, ["after", "approve", "agent"]],
      ] as const);
      if (opt !== null) {
        const r = rec(S, "p1", "pay.change", opt[1], opt[2]);
        if (opt[0] === "before") payRecordBefore = r;
        else payRecordAfter = r;
      }
    }
    raise = weighted("fut", i, [
      [200, true],
      [9800, false],
    ] as const);
  }
  const wmOpt = weighted("wm", i, [
    [500, null],
    [7800, [600, 2400]],
    [1700, [2401, 3600]],
  ] as const);
  const wm = wmOpt === null ? null : uniform("wm.u", i, wmOpt[0], wmOpt[1]);
  const docType = weighted("doc", i, [
    [500, null],
    [5000, "passport"],
    [3000, "ead"],
    [1500, "visa"],
  ] as const);
  let doc: Plan["doc"] = null;
  if (docType === "passport") {
    doc = {
      type: docType,
      expiresOn: formatDay(BASE_DAY + uniform("doc.pexp.u", i, 365, 3650)),
      reverified: false,
    };
  } else if (docType !== null) {
    const expOpt = weighted("doc.exp", i, [
      [200, null],
      [1470, [-30, -1]],
      [2450, [0, 89]],
      [5880, [90, 730]],
    ] as const);
    const expiresOn =
      expOpt === null ? null : formatDay(BASE_DAY + uniform("doc.exp.u", i, expOpt[0], expOpt[1]));
    const reverified = weighted("doc.rev", i, [
      [1000, true],
      [9000, false],
    ] as const);
    doc = { type: docType, expiresOn, reverified };
  }
  const bucket = weighted("size", i, [
    [5000, 0],
    [3500, 1],
    [1500, 2],
  ] as const);
  const [lo, hi] = [
    [50, 200],
    [201, 800],
    [801, 2000],
  ][bucket]!;
  const T = uniform("size.u", i, lo!, hi!);
  const hops = weighted("hops", i, [
    [4000, 3],
    [3500, 4],
    [2500, 6],
  ] as const);
  return {
    i,
    S,
    startDate,
    s1,
    ssn,
    ssnValid: ssnOpt === "valid",
    ev,
    evAt,
    evres,
    bgc,
    i9Records,
    bgcRecord,
    payRecordBefore,
    payRecordAfter,
    rank,
    pay,
    raise,
    wm,
    doc,
    bucket,
    T,
    hops,
  };
}

/** One generated placement: its world at B in the SPEC 12.7 recipe, and the figures the fingerprint and the cost report use. */
export interface Placement {
  readonly plan: Plan;
  readonly world: World;
  /** canonicalJson(world_i) (SPEC 12.7: facts sorted by the canonical JSON of each fact, as bytes) */
  readonly json: string;
  /** F_i: the facts that are not ballast (SPEC 12.7) */
  readonly F: number;
  /** n: the answers (SPEC 12.3 ballast) */
  readonly answers: number;
  /** the positions this placement's commands take (a command with no facts takes none, SPEC 12.3) */
  readonly commands: number;
}

const factJson = (f: Fact): string => {
  const v = f.v;
  const vj =
    typeof v === "string"
      ? quote(v)
      : typeof v === "number"
        ? String(v)
        : typeof v === "boolean"
          ? String(v)
          : '{"erasedAt":' + quote((v as Erased).erasedAt) + "}";
  return '{"a":' + quote(f.a) + ',"e":' + quote(f.e) + ',"tx":' + f.tx + ',"v":' + vj + "}";
};

/**
 * Builds placement i's world from its plan, with the reference positions of SPEC 12.3 (first command at `firstPos`). The
 * command plan fixes every commit-order relation the rules use:
 *  2 hire; 3 Section 1; 4 background check; 5 E-Verify; 6 runtime outcome; 7 documents; 8 decision records, each its own
 *  command (Section 2 records in option order, then dec:b1, then a pay-change record drawn "before the change"); 9 the pay
 *  change when c != 0; 10 a pay-change record drawn "after the change"; 11 one command per ballast chain; 12 the scheduled
 *  raise, which takes a position but is in no world at B (RULINGS Q40i).
 * The world (SPEC 12.7 item 2) holds, for every one-cardinality pair the commands assert, the fact of the last assertion in plan
 * order; every `documents` and `decisions` fact; the location's and jurisdiction's facts; and the ballast facts.
 * With `withJson` false the canonical JSON and the fact sort are skipped (used to count positions for `basis.tx`).
 */
export function build(R: Rung, p: Plan, firstPos: number, withJson = true): Placement {
  const S = p.S;
  const one = new Map<string, Fact>(); // (e, a) -> last assertion, for one-cardinality attributes
  const manyFacts: Fact[] = []; // documents, decisions and answers facts
  const MANY = new Set(["documents", "decisions", "answers"]);
  let pos = firstPos - 1;
  /** One command (one transaction): skipped, taking no position, when it has no facts (SPEC 12.3). */
  const command = (fs: readonly (readonly [string, string, Fact["v"]])[]): void => {
    if (fs.length === 0) return;
    pos++;
    for (const [e, a, v] of fs) {
      const fact: Fact = { e, a, v, tx: pos };
      if (MANY.has(a)) manyFacts.push(fact);
      else one.set(e + "\u0000" + a, fact);
    }
  };
  type Row = readonly [string, string, Fact["v"]];

  // 2. Hire: startDate, location, baselinePayRateCents, payRateCents equal to the baseline, weeklyMinutes (those present).
  const hire: Row[] = [];
  if (p.startDate !== null) hire.push([S, "startDate", p.startDate]);
  if (p.rank !== null) hire.push([S, "location", locationId(R, p.rank)]);
  if (p.pay !== null)
    hire.push([S, "baselinePayRateCents", p.pay.baseline], [S, "payRateCents", p.pay.baseline]);
  if (p.wm !== null) hire.push([S, "weeklyMinutes", p.wm]);
  command(hire);
  // 3. Section 1: section1AttestedAt, ssn.
  const s1: Row[] = [];
  if (p.s1) s1.push([S, "section1AttestedAt", "2026-11-01T15:00:00.000000Z"]);
  if (p.ssn !== null) s1.push([S, "ssn", p.ssn]);
  command(s1);
  // 4. Background check.
  command(p.bgc === null ? [] : [[S, "bgcStatus", p.bgc]]);
  // 5. E-Verify: everifyStatus with everifyStatusAt.
  command(
    p.ev === null
      ? []
      : [
          [S, "everifyStatus", p.ev],
          [S, "everifyStatusAt", p.evAt!],
        ],
  );
  // 6. Runtime outcome (the runtime writer class).
  command(p.evres === null ? [] : [[S, "everifySubmitResult", p.evres]]);
  // 7. Documents: documents and the document's facts.
  if (p.doc !== null) {
    const d = S + "/doc:1";
    const docs: Row[] = [
      [S, "documents", d],
      [d, "docType", p.doc.type],
    ];
    if (p.doc.expiresOn !== null) docs.push([d, "expiresOn", p.doc.expiresOn]);
    if (p.doc.reverified) docs.push([d, "reverified", true]);
    command(docs);
  }
  // 8. Decision records, each its own command asserting the subject's `decisions` fact and the record's three facts.
  const record = (r: Record3 | null): void => {
    if (r === null) return;
    command([
      [S, "decisions", r.id],
      [r.id, "target", r.target],
      [r.id, "verdict", r.verdict],
      [r.id, "author", r.author],
    ]);
  };
  for (const r of p.i9Records) record(r);
  record(p.bgcRecord);
  record(p.payRecordBefore);
  // 9. When c != 0, the pay change: payRateCents re-asserted at its final value (the last assertion wins in the world).
  if (p.pay !== null && p.pay.c !== 0) command([[S, "payRateCents", p.pay.final]]);
  // 10. A pay-change record drawn "after the change".
  record(p.payRecordAfter);

  // The location's and jurisdiction's facts at their own commands' positions (SPEC 12.7): (loc, jurisdiction, jur, K + r),
  // (loc, localMinWageCents, 1850, K + r) when r mod 4 = 2, and (jur, stateMinWageCents, floor, q).
  const shared: Fact[] = [];
  if (p.rank !== null) {
    const r = p.rank;
    const q = jurisdictionOf(R, r);
    const loc = locationId(R, r);
    const jur = jurisdictionId(R, q);
    shared.push({ e: loc, a: "jurisdiction", v: jur, tx: R.K + r });
    if (hasLocalFloor(r)) shared.push({ e: loc, a: "localMinWageCents", v: 1850, tx: R.K + r });
    shared.push({ e: jur, a: "stateMinWageCents", v: stateFloor(q), tx: q });
  }

  // 11. Ballast (RULINGS Q40a): F counts the W0 facts of the world at B (without answers and without the scheduled raise);
  //     n = floor((T - F) / 3) answers in chains of h, chain c holding answers (c - 1)h + 1 to min(ch, n); one command per chain.
  const F = one.size + manyFacts.length + shared.length;
  const n = Math.floor((p.T - F) / 3);
  if (n < 0) throw new Error(`placement ${p.i}: target ${p.T} below F ${F}`);
  for (let first = 1; first <= n; first += p.hops) {
    const last = Math.min(first + p.hops - 1, n);
    const chain: Row[] = [[S, "answers", S + "/ans:" + first]];
    for (let k = first; k <= last; k++) {
      const a = S + "/ans:" + k;
      chain.push([a, "field", "q" + k], [a, "value", "a" + k]);
      if (k < last) chain.push([a, "next", S + "/ans:" + (k + 1)]);
    }
    command(chain);
  }
  // 12. The scheduled raise (a later payRateCents = pay + 100, valid from 2026-11-16): it takes a position and is in no world at
  //     B, because the store returns the facts valid at the basis valid time (SPEC 4.2 item 1, RULINGS Q40i).
  if (p.raise) pos++;

  const facts: Fact[] = [...one.values(), ...manyFacts, ...shared];
  const commands = pos - firstPos + 1;
  if (!withJson)
    return { plan: p, world: { subject: S, facts }, json: "", F, answers: n, commands };
  const keyed = facts.map((x) => ({ x, j: factJson(x) }));
  // SPEC 12.7: sorted ascending by the canonical JSON of each fact, compared as bytes (printable ASCII: JS order is byte order).
  keyed.sort((a, b) => (a.j < b.j ? -1 : a.j > b.j ? 1 : 0));
  const json = '{"facts":[' + keyed.map((k) => k.j).join(",") + '],"subject":' + quote(S) + "}";
  return {
    plan: p,
    world: { subject: S, facts: keyed.map((k) => k.x) },
    json,
    F,
    answers: n,
    commands,
  };
}

/** SPEC 12.7 item 2: `B = {"tx": <the last reference position>, "validTime": "2026-11-04T12:00:00.000000Z"}`. */
export function populationBasis(R: Rung): Basis {
  let pos = R.K + R.L; // jurisdiction q's command at position q, location r's at K + r (SPEC 12.3 reference positions)
  for (let i = 0; i < R.N; i++) pos += build(R, plan(R, i), 1, false).commands;
  return { tx: pos, validTime: POPULATION_VALID_TIME };
}

/** Streams the population in placement order with reference positions: placement 0's first command follows K + L. */
export function* population(R: Rung, from = 0, to = R.N): Generator<Placement> {
  let next = R.K + R.L + 1;
  for (let i = 0; i < to; i++) {
    const p = plan(R, i);
    if (i < from) {
      next += build(R, p, next, false).commands;
      continue;
    }
    const pl = build(R, p, next);
    next += pl.commands;
    yield pl;
  }
}
