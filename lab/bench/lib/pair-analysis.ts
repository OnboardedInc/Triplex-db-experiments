/**
 * PAIR-0 analysis: from both arms' per-round histograms and the per-round noise summaries to the receipt's
 * `stats` and `noise` sections. Pure and deterministic (seeded bootstrap), so `duet.ts recompute` reproduces a
 * receipt bit for bit from the receipt alone plus lab/config/noise.json at the recorded hash.
 *
 * [EXP-M01] Why (R22 sections 2, 4.2, 6.2, 7; RULINGS Q60a-e): one place decides which rounds count (pre-registered
 * rules only), how the metric is pooled (commitAll with its censored subset: every offered command, Q60d), what the
 * A/A control says (s_d of per-round log ratios, slot bias, the procedure's own false-positive rate), and the window
 * grade. The coordinator and the recompute command both call `analysePair`; nothing else computes these numbers.
 */
import { Histogram } from "./hist.ts";
import { applyRules, calibOf, type NoiseConfig, type RoundNoise, type RuleResult } from "./noise.ts";
import {
  DECISIVE, aaFalsePositiveRate, decide, pairedRatios, planRounds, roundLogRatios, sd, signFlipP, slotBias, windowGrade,
  type Claim, type PairBlock, type RatioCI, type Verdict,
} from "./paired.ts";

// The placement rule and the verdict mapping live once, in the gate's pure receipt logic (lab/bin/receipt.mjs).
const receiptLib: any = await import(new URL("../../bin/receipt.mjs", import.meta.url).href);

export const METRICS = {
  /** Primary (Q60d): every offered frozen-trace command; censored ones at their censor time. */
  commitAll: { all: "commitAll", censored: "commitCensored" },
  /** Committed-only view, reported next to it (survivorship: a candidate that sheds load looks faster here). */
  commit: { all: "commit", censored: null },
  /** Open-loop read probe, every scheduled pull. */
  probeAll: { all: "probeAll", censored: "probeCensored" },
} as const;
export type MetricName = keyof typeof METRICS;

export interface PairInput {
  readonly mode: "aa" | "ab";
  readonly rounds: readonly { id: string; kind: "aa" | "ab"; preflight: boolean }[];
  /** histograms[`R03.A.commitAll`] etc., exactly as the drivers serialized them. */
  readonly histograms: Record<string, any>;
  readonly noise: readonly RoundNoise[];
  readonly config: NoiseConfig;
  readonly regime: "cpuset" | "quota" | "none";
  readonly claim?: Claim;
  /** Bootstrap level: 0.95 for a fixed-size run, the Pocock level 0.982 at a sequential look (Q60a). */
  readonly level?: number;
  /** Q67f: per round, per arm, the offered-command list digest and counts and the outcome tally (RoundRecord fields). */
  readonly accounting?: Record<string, Record<string, { offered: { commands: number; commandsDigest: string; probes: number; probesDigest: string }; commands: { committed: number; censored: number; pendingAtEnd: number; byOutcome: Record<string, number> }; probes: { ok: number; errors: number; expired: number; pendingAtEnd: number } }>>;
  /** Q67f: the calibration samples (every spin's unit times) per round. */
  readonly calibration?: { reference?: unknown; rounds: Record<string, { pre: { host: { ms: number[] } | null; vm: { ms: number[] } | null }; post: { host: { ms: number[] } | null; vm: { ms: number[] } | null } }> };
  /** Q67g: each arm's placement (slot, regime, cpuset, cpuMax, memCapBytes, cores). */
  readonly placement?: { A: any; B: any } | null;
}

/**
 * Q67f accounting, recomputed from the evidence: every offered command of a round is in that arm's commitAll exactly
 * once (committed in `commit`, everything else in `commitCensored`), the outcome tally adds up, probes likewise, and
 * both arms were offered the same command and probe lists (equal digests).
 */
export function checkAccounting(input: PairInput) {
  const problems: string[] = [];
  const count = (name: string) => (input.histograms[name] ? input.histograms[name].count : null);
  for (const r of input.rounds) {
    const acc = input.accounting?.[r.id];
    if (!acc?.["A"] || !acc?.["B"]) { problems.push(`${r.id}: no accounting for both arms`); continue; }
    for (const arm of ["A", "B"]) {
      const x = acc[arm]!, h = (m: string) => count(`${r.id}.${arm}.${m}`);
      if (h("commitAll") !== x.offered.commands) problems.push(`${r.id}.${arm}: commitAll holds ${h("commitAll")} of ${x.offered.commands} offered commands`);
      if ((h("commit") ?? 0) + (h("commitCensored") ?? 0) !== h("commitAll")) problems.push(`${r.id}.${arm}: commit + commitCensored != commitAll`);
      if (h("commit") !== x.commands.committed || h("commitCensored") !== x.commands.censored) problems.push(`${r.id}.${arm}: committed/censored counts disagree with the histograms`);
      const tally = Object.values(x.commands.byOutcome).reduce((a, b) => a + b, 0);
      if (tally !== x.offered.commands) problems.push(`${r.id}.${arm}: outcome tally ${tally} != ${x.offered.commands} offered`);
      if (h("probeAll") !== x.offered.probes || (h("probe") ?? 0) + (h("probeCensored") ?? 0) !== h("probeAll")) problems.push(`${r.id}.${arm}: probe accounting does not add up`);
    }
    if (acc["A"]!.offered.commandsDigest !== acc["B"]!.offered.commandsDigest) problems.push(`${r.id}: the arms were offered different command lists`);
    if (acc["A"]!.offered.probesDigest !== acc["B"]!.offered.probesDigest) problems.push(`${r.id}: the arms were offered different probe lists`);
  }
  return { ok: problems.length === 0, problems };
}
/** Q67f: the calibration-derived signals of every round, recomputed from the retained spin samples. */
export function checkCalibration(input: PairInput) {
  const problems: string[] = [];
  const close = (a: number | null | undefined, b: number | null | undefined) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
  for (const n of input.noise) {
    const c = input.calibration?.rounds?.[n.id];
    if (!c) { problems.push(`${n.id}: no calibration samples`); continue; }
    const k = (x: { ms: number[] } | null, w: "host" | "vm") => (x ? calibOf(w, 0, x.ms) : null);
    const pre = { host: k(c.pre.host, "host"), vm: k(c.pre.vm, "vm") }, post = { host: k(c.post.host, "host"), vm: k(c.post.vm, "vm") };
    const spins = [pre.host, pre.vm, post.host, post.vm].filter(Boolean) as ReturnType<typeof calibOf>[];
    const want = { "calib.hostDrift": pre.host && post.host ? post.host.min / pre.host.min : null, "calib.vmDrift": pre.vm && post.vm ? post.vm.min / pre.vm.min : null, "calib.interferenceMax": spins.length ? Math.max(...spins.map((x) => x.interference)) : null };
    for (const [key, v] of Object.entries(want)) if (!close(v, n.signals[key])) problems.push(`${n.id}: ${key} ${n.signals[key]} does not follow from its samples (${v})`);
  }
  return { ok: problems.length === 0, problems };
}

const hist = (h: Record<string, any>, name: string): Histogram | null => (h[name] ? Histogram.fromJSON(h[name]) : null);

export function blocksFor(input: PairInput, metric: MetricName, excluded: Record<string, string[]>): PairBlock[] {
  const m = METRICS[metric];
  const out: PairBlock[] = [];
  for (const r of input.rounds) {
    const a = hist(input.histograms, `${r.id}.A.${m.all}`), b = hist(input.histograms, `${r.id}.B.${m.all}`);
    if (!a || !b) continue;
    const ac = m.censored ? hist(input.histograms, `${r.id}.A.${m.censored}`) : null, bc = m.censored ? hist(input.histograms, `${r.id}.B.${m.censored}`) : null;
    out.push({ id: r.id, kind: r.kind, a: { all: a, censored: ac }, b: { all: b, censored: bc }, excluded: excluded[r.id] ?? [] });
  }
  return out;
}

const round4 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const ms = (us: number | null) => (us === null ? null : Math.round(us) / 1000);
const ciOut = (c: RatioCI) => ({ q: c.q, ratio: round4(c.ratio), lo: round4(c.lo), hi: round4(c.hi), mdr: round4(c.mdr), level: c.level, rounds: c.blocks, aMs: ms(c.aUs), bMs: ms(c.bUs), countA: c.countA, countB: c.countB, censoredA: c.censoredA, censoredB: c.censoredB, ...(c.why ? { why: c.why } : {}) });

export function analysePair(input: PairInput) {
  const cfg = input.config;
  const claim: Claim = input.claim ?? { kind: "superiority", target: cfg.claims.superiority };
  const level = input.level ?? cfg.rounds.level;
  // 1. Pre-registered rules, per round, both arms (never latency).
  const ruleResults: Record<string, RuleResult> = {};
  const excluded: Record<string, string[]> = {};
  for (const n of input.noise) {
    const r = applyRules(n, cfg.rules, { regime: input.regime });
    ruleResults[n.id] = r;
    if (r.excluded.length) excluded[n.id] = r.excluded;
  }
  for (const r of input.rounds) if (!input.noise.some((n) => n.id === r.id)) excluded[r.id] = ["signals-missing"];
  // 2. Metrics.
  const opts = { boots: cfg.rounds.boots, level, seed: cfg.rounds.bootSeed, minBlocks: cfg.rounds.min };
  const metrics: Record<string, any> = {};
  for (const name of Object.keys(METRICS) as MetricName[]) {
    const blocks = blocksFor(input, name, excluded);
    if (!blocks.length) { metrics[name] = { rounds: 0, why: "no histograms for this metric" }; continue; }
    const [p50, p99] = pairedRatios(blocks, [0.5, 0.99], opts);
    const per = (q: number) => roundLogRatios(blocks, q);
    const r50 = per(0.5), r99 = per(0.99);
    const aaIds = new Set(input.rounds.filter((r) => r.kind === "aa").map((r) => r.id));
    const dOf = (rows: ReturnType<typeof per>, onlyAA: boolean) => rows.filter((x) => x.d !== null && (!onlyAA || aaIds.has(x.id))).map((x) => x.d!);
    const aaD50 = dOf(r50, true), aaD99 = dOf(r99, true);
    const allD50 = dOf(r50, false), allD99 = dOf(r99, false);
    const usableBlocks = blocks.filter((b) => !(b.excluded && b.excluded.length));
    const count = (arm: "a" | "b") => usableBlocks.reduce((s, b) => s + b[arm].all.count, 0);
    metrics[name] = {
      p50: ciOut(p50!), p99: ciOut(p99!),
      decision: { p50: decide(p50!, claim, cfg.rounds.max), p99: decide(p99!, claim, cfg.rounds.max), claim },
      roundRatios: { p50: r50.map((x) => ({ id: x.id, aMs: ms(x.aUs), bMs: ms(x.bUs), d: round4(x.d), ...(x.why ? { why: x.why } : {}) })), p99: r99.map((x) => ({ id: x.id, aMs: ms(x.aUs), bMs: ms(x.bUs), d: round4(x.d), ...(x.why ? { why: x.why } : {}) })) },
      aa: aaIds.size ? { rounds: aaD50.length, sdLogP50: round4(sd(aaD50)), sdLogP99: round4(sd(aaD99)), slotBiasP50: roundBias(slotBias(aaD50)), slotBiasP99: roundBias(slotBias(aaD99)), signFlipP50: round4(signFlipP(aaD50)), signFlipP99: round4(signFlipP(aaD99)) } : null,
      allRounds: { rounds: allD50.length, sdLogP50: round4(sd(allD50)), sdLogP99: round4(sd(allD99)) },
      p99Floor: { commandsPerArm: { A: count("a"), B: count("b") }, usableRounds: usableBlocks.length, met: Math.min(count("a"), count("b")) >= cfg.p99Floor.commandsPerArm && usableBlocks.length >= cfg.p99Floor.usableRounds, rule: `p99 claims need ${cfg.p99Floor.commandsPerArm} commands per arm and ${cfg.p99Floor.usableRounds} usable rounds (R22 section 2)` },
    };
    if (name === "commitAll" && aaIds.size) {
      const fp = (q: number) => { const r = aaFalsePositiveRate(blocks.filter((b) => aaIds.has(b.id)), q, { trials: cfg.aaCheck.trials, boots: cfg.aaCheck.boots, level, seed: cfg.aaCheck.seed, minBlocks: cfg.rounds.min }); return { ...r, rate: round4(r.rate), mcSe: round4(r.mcSe) }; };
      metrics[name].aa.procedureFalsePositive = { p50: fp(0.5), p99: fp(0.99), rule: "share of arm-swapped resamplings of this window's A/A rounds whose interval excludes 1 (R22 section 2: 5 to 15% expected at 8 rounds)" };
      metrics[name].aa.observedFalsePositive = { p50: p50!.lo !== null ? p50!.lo! > 1 || p50!.hi! < 1 : null, p99: p99!.lo !== null ? p99!.lo! > 1 || p99!.hi! < 1 : null };
    }
  }
  // 3. Window grade on the primary metric's p50 s_d (R22 section 4.2).
  const primary = metrics["commitAll"];
  const aaSd = primary?.aa?.sdLogP50 ?? null;
  const useAA = primary?.aa && primary.aa.rounds >= 3;
  const sdP50 = useAA ? aaSd : primary?.allRounds?.sdLogP50 ?? null;
  const roundsTotal = input.rounds.length;
  const excludedCount = input.rounds.filter((r) => excluded[r.id]?.length).length;
  const amberRounds = input.rounds.filter((r) => !excluded[r.id]?.length && ruleResults[r.id]?.amber.length).length;
  const usableNoise = input.noise.filter((n) => !excluded[n.id]?.length);
  const partitioned = usableNoise.length > 0 && usableNoise.every((n) => n.partitioned === true);
  const grade = windowGrade({
    sdP50, sdRounds: useAA ? primary.aa.rounds : primary?.allRounds?.rounds ?? 0, sdSource: useAA ? "aa" : "all",
    rounds: roundsTotal, excluded: excludedCount, amberRounds, partitioned,
    target: cfg.claims.superiority, defaultRounds: cfg.rounds.default, maxRounds: cfg.rounds.max,
  });
  const planner = sdP50 !== null && Number.isFinite(sdP50) ? {
    superiority: planRounds({ sd: sdP50, ratio: cfg.claims.superiority, minRounds: cfg.rounds.min, maxRounds: cfg.rounds.max }),
    holdP50: planRounds({ sd: sdP50, ratio: cfg.claims.holdP50, minRounds: cfg.rounds.min, maxRounds: cfg.rounds.max }),
  } : null;
  const decision: Verdict = primary?.decision?.p50 ?? "NOT_ESTIMABLE";
  const accounting = checkAccounting(input);
  const calibration = checkCalibration(input);
  const placement = input.placement === undefined ? null : { problems: receiptLib.placementProblems(input.placement?.A, input.placement?.B) as string[] };
  const looks: number[] = receiptLib.PAIR_LOOKS;
  return {
    checks: {
      rounds: { count: roundsTotal, registeredLooks: looks, isRegisteredLook: looks.includes(roundsTotal) },
      accounting, calibration, placement,
    },
    stats: {
      primary: { metric: "commitAll", quantile: 0.5, claim, decision, decisive: DECISIVE.includes(decision) },
      p50: primary?.p50 ?? null, p99: primary?.p99 ?? null,
      metrics, planner,
    },
    noise: {
      aa: { sdLogP50: aaSd, sdLogP99: primary?.aa?.sdLogP99 ?? null, rounds: primary?.aa?.rounds ?? 0, slotBiasP50: primary?.aa?.slotBiasP50 ?? null, slotBiasP99: primary?.aa?.slotBiasP99 ?? null, ...(aaSd === null ? { why: input.mode === "aa" ? "p50 not identified in enough A/A rounds" : "no A/A rounds in this run" } : {}) },
      exclusions: excluded,
      rules: Object.fromEntries(Object.entries(ruleResults).map(([id, r]) => [id, { excluded: r.excluded, amber: r.amber, notApplied: r.notApplied, values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, round4(v)])) }])),
      partitioned,
      windowGrade: { ...grade, sdUsed: round4(grade.sdUsed), limits: { defaultRounds: round4(grade.limits.defaultRounds), maxRounds: round4(grade.limits.maxRounds) } },
      counts: { rounds: roundsTotal, excluded: excludedCount, usable: roundsTotal - excludedCount, amber: amberRounds },
    },
  };
}
function roundBias(b: ReturnType<typeof slotBias>) {
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === "number" ? round4(v) : v]));
}
