import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Offer } from "./schedule.ts";

// [DX-REAL2] A production-shaped save tape. Every parameter is a dimensionless shape (shares, gaps, sizes);
// absolute rates come from the runner's fixed loads. The same save process feeds both commit shapes:
// R commits every form row on its own, S commits all of one save's rows at once.

/** Knots of a cumulative distribution: [value, cumulative share], values and shares rising, last share 1. */
export type Knots = readonly (readonly [number, number])[];
export type Shape = "R" | "S";
export type ProductionParams = {
  version: "triplex-real2-production-shape/1";
  /** Gap between consecutive saves of one person inside a session (seconds), conditional on gap < sessionBreak. */
  withinGap: Knots;
  /** A gap of at least this many seconds starts a new session. */
  sessionBreak: number;
  /** Gap before a session's first save, as shares of session starts; [low, high) seconds, null for a first-ever save. */
  startGap: readonly { low: number; high: number | null; share: number }[];
  /** Saves per session, cumulative. */
  sessionSize: Knots;
  /** Form rows per save, cumulative (each row is one commit in shape R). */
  rowsPerSave: Knots;
  /** Share of rows that change a second field. */
  extraShare: number;
  /** Rows of one save are this many milliseconds apart in shape R. */
  rowSpacingMs: number;
  /** Virtual history simulated before the window so sessions are in progress at its start. */
  warmupSeconds: number;
  /** Width of each rate band's person range inside an account. */
  bandPeople: number;
  /** Fixed seed; the tape is a pure function of seed, parameters, band, account and row target. */
  seed: number;
};

export type ProductionOffer = Offer & {
  /** Save index within the account's cell (rows of one save share it). */
  save: number;
  /** Field slots written by this commit: n is :task/field-n. */
  slots: number[];
  /** Seconds since this person's previous save, null for a first-ever save; only on the save's first commit. */
  gap: number | null;
};

const fieldExtraBase = 100;
export const maxRows = 96;
export const slotAttribute = (slot: number) => `:task/field-${slot}`;

export function loadParams(file: string): { params: ProductionParams; sha256: string } {
  const bytes = readFileSync(file);
  const params = JSON.parse(bytes.toString()) as ProductionParams;
  checkParams(params);
  return { params, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export function checkParams(p: ProductionParams) {
  assert.equal(p.version, "triplex-real2-production-shape/1");
  for (const knots of [p.withinGap, p.sessionSize, p.rowsPerSave]) {
    assert(knots.length >= 2);
    for (let i = 1; i < knots.length; i++)
      assert(knots[i]![0] >= knots[i - 1]![0] && knots[i]![1] >= knots[i - 1]![1], "knots must rise");
    assert.equal(knots.at(-1)![1], 1);
    assert(knots[0]![0] > 0);
  }
  assert(p.withinGap.at(-1)![0] <= p.sessionBreak);
  assert(p.rowsPerSave.at(-1)![0] <= maxRows && p.rowsPerSave[0]![0] >= 1);
  const total = p.startGap.reduce((a, g) => a + g.share, 0);
  assert(Math.abs(total - 1) < 1e-9, "start-gap shares must sum to 1");
  for (const g of p.startGap) assert(g.high === null ? g.low === 0 : g.low >= p.sessionBreak && g.high > g.low);
  assert(p.extraShare >= 0 && p.extraShare < 1 && p.rowSpacingMs >= 0 && p.rowSpacingMs * maxRows < 300);
  assert(p.warmupSeconds >= 3600 && p.bandPeople >= 1000 && Number.isSafeInteger(p.seed));
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
const mix = (...xs: number[]) =>
  createHash("sha256").update(JSON.stringify(xs)).digest().readUInt32BE(0);

/** Inverse CDF with log-linear interpolation between knots; a flat first segment repeats the first value. */
export function quantileOf(knots: Knots, u: number) {
  for (let i = 0; i < knots.length; i++) {
    const [v, c] = knots[i]!;
    if (u < c || i === knots.length - 1) {
      if (i === 0) return v;
      const [v0, c0] = knots[i - 1]!;
      const f = c === c0 ? 1 : (u - c0) / (c - c0);
      return Math.exp(Math.log(v0) + f * (Math.log(v) - Math.log(v0)));
    }
  }
  return knots.at(-1)![0];
}
const integer = (knots: Knots, u: number) => Math.max(1, Math.round(quantileOf(knots, u)));

/** Share of draws that round to `value`. */
export function knotShare(knots: Knots, value: number) {
  const n = 200_000;
  let hits = 0;
  for (let i = 0; i < n; i++) hits += Number(Math.max(1, Math.round(quantileOf(knots, (i + 0.5) / n))) === value);
  return hits / n;
}

/** Mean of an integer-rounded knot distribution, by fine quadrature (for reports and calibration). */
export function knotMean(knots: Knots, round = true) {
  const n = 200_000;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const q = quantileOf(knots, (i + 0.5) / n);
    s += round ? Math.max(1, Math.round(q)) : q;
  }
  return s / n;
}

type Save = { t: number; person: number; gap: number | null; rows: number; extras: boolean[] };
type Profile = { arrival: number; size: number; offsets: number[]; rows: number[]; extras: boolean[][]; cls: number; w: number };
type Session = { start: number; size: number; times: number[]; person: number; profile: Profile };

// [DX-REAL2] Why: every session draws from its own stream, so only its start time depends on the session rate.
// Rejected: one shared stream, which made rows per window jump randomly as the rate was calibrated.
function profiles(p: ProductionParams, band: number, account: number) {
  const cache: Profile[] = [];
  return (i: number): Profile => {
    while (cache.length <= i) {
      const rand = rng(mix(p.seed, band, account, cache.length));
      const arrival = -Math.log(1 - rand());
      const size = integer(p.sessionSize, rand());
      const offsets = [0];
      for (let j = 1; j < size; j++)
        offsets.push(offsets[j - 1]! + Math.min(quantileOf(p.withinGap, rand()), p.sessionBreak - 1e-3));
      let u = rand(), cls = 0;
      for (; cls < p.startGap.length - 1 && u >= p.startGap[cls]!.share; cls++) u -= p.startGap[cls]!.share;
      const w = rand();
      const rows = offsets.map(() => integer(p.rowsPerSave, rand()));
      const extras = rows.map((k) => Array.from({ length: k }, () => rand() < p.extraShare));
      cache.push({ arrival, size, offsets, rows, extras, cls, w });
    }
    return cache[i]!;
  };
}

function sessionsAt(profile: (i: number) => Profile, p: ProductionParams, rate: number, window: number) {
  const sessions: Session[] = [];
  let t = -p.warmupSeconds;
  for (let i = 0; ; i++) {
    const pr = profile(i);
    t += pr.arrival / rate;
    if (t >= window) break;
    const times = pr.offsets.map((o) => t + o).filter((x) => x < window);
    sessions.push({ start: t, size: pr.size, times, person: -1, profile: pr });
  }
  return sessions;
}

function windowRows(sessions: Session[]) {
  let n = 0;
  for (const s of sessions)
    for (const [j, time] of s.times.entries()) if (time >= 0) n += s.profile.rows[j]!;
  return n;
}

function assign(p: ProductionParams, sessions: Session[]) {
  // Assign people in start order. A start gap that fits the simulated history reuses a person whose last save
  // matches it; longer ones and first-ever saves take a person not yet used in this account and band.
  const pool: { end: number; person: number }[] = [];
  const lower = (x: number) => {
    let lo = 0, hi = pool.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (pool[m]!.end < x) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  let fresh = 0;
  const saves: Save[] = [];
  for (const s of sessions) {
    const cls = p.startGap[s.profile.cls]!, w = s.profile.w;
    let gap: number | null;
    if (cls.high === null) {
      gap = null;
      s.person = fresh++;
    } else {
      const a = lower(s.start - cls.high), b = lower(s.start - cls.low + 1e-9);
      if (b > a) {
        const [picked] = pool.splice(a + Math.floor(w * (b - a)), 1);
        s.person = picked!.person;
        gap = s.start - picked!.end;
      } else {
        s.person = fresh++;
        gap = Math.exp(Math.log(cls.low) + w * (Math.log(cls.high) - Math.log(cls.low)));
      }
    }
    assert(fresh <= p.bandPeople, "band person range exhausted");
    const end = s.start + s.profile.offsets.at(-1)!;
    pool.splice(lower(end), 0, { end, person: s.person });
    for (const [j, time] of s.times.entries())
      if (time >= 0)
        saves.push({ t: time, person: s.person, gap: j ? time - s.times[j - 1]! : gap,
          rows: s.profile.rows[j]!, extras: [...s.profile.extras[j]!] });
  }
  saves.sort((a, b) => a.t - b.t || a.person - b.person);
  return saves;
}

const rowsIn = (saves: Save[]) => saves.reduce((n, s) => n + s.rows, 0);
const memo = new Map<string, ReturnType<typeof calibrated>>();

/**
 * The save process for one neighbour account, calibrated so the window holds exactly `rowTarget` form rows.
 * Deterministic: the session rate is the bisection limit from a fixed bracket.
 */
// [DX-CARD2] Why: the bisection settles on the rate at which one more session starts just inside the window's end, so
// every account's tape ends with a save due at about the last instant of the window (9 saves at once in a card cell,
// 13.6 to 104 ms each, 3.4% of the 50-load cell). Edge "spread" takes the largest bisected rate whose window holds
// fewer rows than the target (no session at the edge) and gives the missing rows one each to the latest saves.
// "calibrated" stays the default, so every measured tape and its hash reproduce. Rejected: dropping the edge saves
// (the cell would offer fewer rows than its rate) and moving them to another time (an invented arrival).
export type TapeEdge = "calibrated" | "spread";
export function accountSaves(p: ProductionParams, band: number, account: number, rowTarget: number, window: number,
  edge: TapeEdge = "calibrated") {
  const key = JSON.stringify([p, band, account, rowTarget, window, ...(edge === "calibrated" ? [] : [edge])]);
  if (!memo.has(key)) memo.set(key, calibrated(p, band, account, rowTarget, window, edge));
  const run = memo.get(key)!;
  return { ...run, saves: run.saves.map((s) => ({ ...s, extras: [...s.extras] })) };
}

function calibrated(p: ProductionParams, band: number, account: number, rowTarget: number, window: number, edge: TapeEdge = "calibrated") {
  assert(rowTarget > 0 && Number.isSafeInteger(rowTarget));
  const profile = profiles(p, band, account);
  const guess = rowTarget / window / (knotMean(p.sessionSize) * knotMean(p.rowsPerSave));
  let lo = guess / 1.5, hi = guess * 1.5;
  for (let i = 0; windowRows(sessionsAt(profile, p, hi, window)) < rowTarget; i++) {
    assert(i < 20, "row target out of reach");
    hi *= 1.5;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (windowRows(sessionsAt(profile, p, mid, window)) >= rowTarget) hi = mid;
    else lo = mid;
  }
  const below = edge === "spread" && windowRows(sessionsAt(profile, p, lo, window)) < rowTarget;
  const sessions = sessionsAt(profile, p, below ? lo : hi, window);
  const saves = assign(p, sessions);
  if (below) {
    let missing = rowTarget - rowsIn(saves);
    for (let i = saves.length - 1; missing > 0; i = i > 0 ? i - 1 : saves.length - 1, missing--) {
      saves[i]!.rows++;
      saves[i]!.extras.push(false);
    }
  }
  // Trim the excess from the end of the window: the last saves lose their last rows.
  let excess = rowsIn(saves) - rowTarget;
  assert(excess >= 0);
  while (excess > 0) {
    const last = saves.at(-1)!;
    const cut = Math.min(excess, last.rows);
    last.rows -= cut;
    last.extras = last.extras.slice(0, last.rows);
    excess -= cut;
    if (!last.rows) saves.pop();
  }
  assert.equal(rowsIn(saves), rowTarget);
  return { saves, sessions, sessionsPerSecond: below ? lo : hi };
}

export const personOf = (p: ProductionParams, band: number, account: number, local: number) => {
  assert(local >= 0 && local < p.bandPeople && (band + 1) * p.bandPeople <= 100_000);
  return ((band * p.bandPeople + local) * 7919 + account * 1291) % 100_000;
};

/** Offers for the nine neighbour accounts of one loaded cell, in the requested commit shape. */
export function productionOffers(
  p: ProductionParams,
  shape: Shape,
  band: number,
  rowTargets: readonly number[],
  window: number,
  edge: TapeEdge = "calibrated",
): ProductionOffer[] {
  assert.equal(rowTargets.length, 9);
  const out: ProductionOffer[] = [];
  for (let n = 0; n < 9; n++) {
    const account = n + 1;
    const { saves } = accountSaves(p, band, account, rowTargets[n]!, window, edge);
    for (const [index, save] of saves.entries()) {
      const person = personOf(p, band, account, save.person);
      const row = (r: number) => [r, ...(save.extras[r] ? [fieldExtraBase + r] : [])];
      const base = { account, person, subtask: 0, ordinal: 0, extra: false, save: index };
      if (shape === "S")
        out.push({ ...base, ms: save.t * 1000, slots: Array.from({ length: save.rows }, (_, r) => row(r)).flat(), gap: save.gap });
      else
        for (let r = 0; r < save.rows; r++)
          out.push({ ...base, ms: save.t * 1000 + r * p.rowSpacingMs, slots: row(r), gap: r ? 0 : save.gap });
    }
  }
  return out;
}

const pct = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]!;
};
const round = (x: number | null, d = 4) => (x === null ? null : Number(x.toFixed(d)));

/**
 * The statistics the production study reports, computed from a cell's offers (production accounts only,
 * account 0 is the unchanged quiet stream), so a reader can check the tape against production.
 */
export function tapeReport(tape: readonly (Offer & Partial<ProductionOffer>)[], seconds: number, p?: ProductionParams) {
  const prod = tape.filter((o) => o.slots !== undefined);
  const commits = prod.length;
  type S = { account: number; person: number; t: number; gap: number | null; rows: number; facts: number };
  const saves = new Map<string, S>();
  for (const o of prod) {
    const key = o.account + "/" + o.save;
    const s = saves.get(key);
    if (s) {
      assert(s.person === o.person, "a save belongs to one person");
      s.rows += 1;
      s.facts += o.slots!.length;
    } else {
      assert(o.gap !== undefined);
      const rows = o.slots!.filter((x) => x < fieldExtraBase).length;
      saves.set(key, { account: o.account, person: o.person, t: o.ms / 1000, gap: o.gap ?? null, rows: rows || 1, facts: o.slots!.length });
    }
  }
  // Shape S packs every row of a save in one commit: count its rows from the slots.
  const shapeS = prod.length === saves.size && prod.some((o) => o.slots!.filter((x) => x < fieldExtraBase).length > 1);
  const list = [...saves.values()].sort((a, b) => a.t - b.t);
  const n = list.length;
  const share = (f: (s: S) => boolean) => round(list.filter(f).length / n);
  const declared = {
    within1s: share((s) => s.gap !== null && s.gap < 1),
    within10s: share((s) => s.gap !== null && s.gap < 10),
    within60s: share((s) => s.gap !== null && s.gap < 60),
    within2min: share((s) => s.gap !== null && s.gap < 120),
    within5min: share((s) => s.gap !== null && s.gap < 300),
    within15min: share((s) => s.gap !== null && s.gap < 900),
    within1h: share((s) => s.gap !== null && s.gap < 3600),
    within1d: share((s) => s.gap !== null && s.gap < 86400),
    within7d: share((s) => s.gap !== null && s.gap < 604800),
    older: share((s) => s.gap !== null && s.gap >= 604800),
    firstEver: share((s) => s.gap === null),
  };
  // Check declared gaps against the tape itself wherever the previous save is inside the window.
  const last = new Map<string, number>();
  let checked = 0;
  for (const s of list) {
    const key = s.account + "/" + s.person;
    const prev = last.get(key);
    if (prev !== undefined) {
      assert(s.gap !== null && Math.abs(s.gap - (s.t - prev)) < 1e-6, "declared gap differs from the tape");
      checked++;
    } else assert(s.gap === null || s.gap >= s.t - 1e-6, "declared gap points inside the window without a save");
    last.set(key, s.t);
  }
  const minutes = Math.ceil(seconds / 60);
  // Time of each person's last save before the window, from the declared gap of their first save in it.
  const before = new Map<string, number | null>();
  for (const s of list) {
    const key = s.account + "/" + s.person;
    if (!before.has(key)) before.set(key, s.gap === null ? null : s.t - s.gap);
  }
  const savedWithin = (s: S, x: number) => {
    const t = before.get(s.account + "/" + s.person);
    return t !== null && t !== undefined && t < 0 && t >= -x;
  };
  const seen = new Set<string>();
  const firstSaves: S[] = [];
  const perMinute = Array.from({ length: minutes }, (_, m) => {
    const inMinute = list.filter((s) => s.t >= m * 60 && s.t < (m + 1) * 60);
    const people = new Set(inMinute.map((s) => s.account + "/" + s.person));
    let first = 0;
    for (const s of inMinute) {
      const key = s.account + "/" + s.person;
      if (!seen.has(key)) {
        first++;
        firstSaves.push(s);
        seen.add(key);
      }
    }
    return {
      minute: m + 1,
      saves: inMinute.length,
      people: people.size,
      peoplePerSave: round(people.size / Math.max(1, inMinute.length)),
      firstSinceStartShare: round(first / Math.max(1, inMinute.length)),
      savedInPrevious2minShare: round(inMinute.filter((s) => savedWithin(s, 120)).length / Math.max(1, inMinute.length)),
      commits: prod.filter((o) => o.ms >= m * 60_000 && o.ms < (m + 1) * 60_000).length,
    };
  });
  const firstMinute = list.filter((s) => s.t < 60);
  const restart = {
    // The study's restart question: saves after an instant that go to people saved just before it.
    firstMinute: Object.fromEntries([30, 120, 600, 3600].map((x) => [`savedInPrevious${x}s`, round(firstMinute.filter((s) => savedWithin(s, x)).length / Math.max(1, firstMinute.length))])),
    wholeWindow: Object.fromEntries([30, 120, 600, 3600].map((x) => [`savedInPrevious${x}s`, round(list.filter((s) => savedWithin(s, x)).length / Math.max(1, n))])),
    firstSavesSinceStart: Object.fromEntries([30, 120, 600, 3600].map((x) => [`savedInPrevious${x}s`, round(firstSaves.filter((s) => savedWithin(s, x)).length / Math.max(1, firstSaves.length))])),
  };
  const firsts = new Set<string>();
  let firstAll = 0;
  for (const s of list) {
    const key = s.account + "/" + s.person;
    if (!firsts.has(key)) firstAll++;
    firsts.add(key);
  }
  const rows = list.map((s) => s.rows);
  const facts = shapeS ? list.map((s) => s.facts) : prod.map((o) => o.slots!.length);
  const quiet = tape.filter((o) => o.slots === undefined);
  return {
    version: "triplex-real2-tape-report/1",
    shape: shapeS ? "S" : "R",
    seconds,
    neighbours: {
      commits,
      commitsPerSecond: round(commits / seconds, 3),
      rows: rows.reduce((a, b) => a + b, 0),
      rowsPerSecond: round(rows.reduce((a, b) => a + b, 0) / seconds, 3),
      saves: n,
      savesPerSecond: round(n / seconds, 3),
      facts: facts.reduce((a, b) => a + b, 0),
      factsPerSecond: round(facts.reduce((a, b) => a + b, 0) / seconds, 2),
      factsPerCommit: { mean: round(facts.reduce((a, b) => a + b, 0) / Math.max(1, commits), 3), p50: pct(facts, 0.5), p90: pct(facts, 0.9), p99: pct(facts, 0.99), max: pct(facts, 1) },
      rowsPerSave: { mean: round(rows.reduce((a, b) => a + b, 0) / Math.max(1, n), 3), p50: pct(rows, 0.5), p90: pct(rows, 0.9), p99: pct(rows, 0.99) },
      distinctPeople: firsts.size,
      distinctPeopleFirstMinute: perMinute[0]?.people ?? 0,
      firstSinceStartShareWhole: round(firstAll / Math.max(1, n)),
      returnGapDeclared: declared,
      declaredGapsCheckedInsideWindow: checked,
      perMinute,
      peoplePerSaveMedianMinute: pct(perMinute.map((m) => m.peoplePerSave ?? 0), 0.5),
      restart,
    },
    quiet: { commits: quiet.length, people: new Set(quiet.map((o) => o.account + "/" + o.person)).size },
    ...(p ? { params: paramSummary(p) } : {}),
  };
}

export function paramSummary(p: ProductionParams) {
  // Session sizes and rows per save implied by the parameters (not sampled), for comparison with the study.
  const size = (u: number) => integer(p.sessionSize, u);
  return {
    sessionSize: { mean: round(knotMean(p.sessionSize), 2), p50: size(0.5), p90: size(0.9), p99: size(0.99), singleShare: round(knotShare(p.sessionSize, 1)) },
    rowsPerSave: { mean: round(knotMean(p.rowsPerSave), 2), p50: integer(p.rowsPerSave, 0.5), p90: integer(p.rowsPerSave, 0.9), p99: integer(p.rowsPerSave, 0.99) },
    firstEverShareOfSessionStarts: p.startGap.find((g) => g.high === null)?.share ?? 0,
  };
}

/** Session statistics of the generated process (sessions starting in the virtual history or the window). */
export function sessionReport(p: ProductionParams, band: number, rowTargets: readonly number[], window: number) {
  const sizes: number[] = [];
  const lengths: number[] = [];
  for (let n = 0; n < 9; n++) {
    const { sessions } = accountSaves(p, band, n + 1, rowTargets[n]!, window);
    for (const s of sessions) {
      sizes.push(s.size);
      lengths.push(s.profile.offsets.at(-1)!);
    }
  }
  return {
    sessions: sizes.length,
    sizeMean: round(sizes.reduce((a, b) => a + b, 0) / sizes.length, 2),
    sizeP50: pct(sizes, 0.5), sizeP90: pct(sizes, 0.9), sizeP99: pct(sizes, 0.99),
    singleShare: round(sizes.filter((x) => x === 1).length / sizes.length),
    lengthP50Seconds: round(pct(lengths, 0.5), 1), lengthP90Seconds: round(pct(lengths, 0.9), 1),
  };
}
