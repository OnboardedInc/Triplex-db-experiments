/** Q100k timing-grade helper for the future G03 measure_single adapter; no engine execution or admission receipt. */
import { applyRules, hardRuleFailures, type NoiseConfig, type RoundNoise } from "./noise.ts";
import { sd, windowGrade, type HardRuleFailure } from "./paired.ts";

export interface SingleWindowInput {
  readonly armId: string;
  readonly preflight: boolean;
  readonly regime: "cpuset" | "quota" | "none";
  readonly config: NoiseConfig;
  readonly rounds: readonly { id: string; armId: string; burstPhase: string; p50Ms: number | null; noise: RoundNoise }[];
}

export function analyseSingleWindow(input: SingleWindowInput) {
  const cfg = input.config;
  const problems: string[] = [];
  const exclusions: Record<string, string[]> = {};
  const hardRuleHistory: HardRuleFailure[] = [];
  const ids = new Set<string>();
  let amberRounds = 0;
  for (const r of input.rounds) {
    if (!r.id || ids.has(r.id)) problems.push(`duplicate or empty round id ${r.id}`);
    ids.add(r.id);
    if (!input.armId || r.armId !== input.armId) problems.push(`${r.id}: arm identity differs`);
    if (!r.burstPhase || r.burstPhase !== input.rounds[0]?.burstPhase) problems.push(`${r.id}: burst phase differs or missing`);
    if (r.noise.id !== r.id) problems.push(`${r.id}: noise belongs to another round`);
    const result = applyRules(r.noise, cfg.rules, { regime: input.regime });
    // [EXP-M01R2] Why: a missing active hard signal cannot establish Q100k compliance. Rejected: treating null signal values as an unbroken hard-rule history.
    const missing = cfg.rules.filter(rule => rule.class !== "record" && !(rule.class === "hard-after-partition" && !r.noise.partitioned) && !(rule.class === "hard-in-cpuset-regime" && input.regime !== "cpuset") && !Number.isFinite(r.noise.signals[rule.signal]));
    if (missing.length) {
      result.excluded.push("signals-missing");
    }
    hardRuleHistory.push(...hardRuleFailures(r.id, result, cfg.rules));
    if (result.excluded.length) exclusions[r.id] = [...new Set(result.excluded)];
    if (result.amber.length || result.excluded.some(id => cfg.rules.some(rule => rule.id === id && rule.class === "soft"))) amberRounds++;
  }
  // [EXP-M01R2] Why: sequential drift is ln(p50_k/p50_k-1), on the same arm and burst phase; never bridge an excluded or unidentified round. Rejected: simultaneous duet ratios (cancel drift) or relaxing the three-ratio minimum for three medians.
  const logRatios: { previous: string; current: string; d: number }[] = [];
  for (let i = 1; i < input.rounds.length; i++) {
    const a = input.rounds[i - 1]!, b = input.rounds[i]!;
    if (exclusions[a.id] || exclusions[b.id] || !(a.p50Ms! > 0) || !(b.p50Ms! > 0) || !Number.isFinite(a.p50Ms) || !Number.isFinite(b.p50Ms)) continue;
    if (a.armId === b.armId && a.burstPhase && a.burstPhase === b.burstPhase) logRatios.push({ previous: a.id, current: b.id, d: Math.log(b.p50Ms! / a.p50Ms!) });
  }
  const grade = windowGrade({ contract: "single-q100k", hardRuleHistory,
    sdP50: sd(logRatios.map(r => r.d)), sdRounds: logRatios.length, sdSource: input.preflight ? "sequential-preflight" : "sequential-aa",
    rounds: input.rounds.length, excluded: Object.keys(exclusions).length, amberRounds,
    partitioned: input.rounds.length > 0 && input.rounds.every(r => r.noise.partitioned),
    target: cfg.claims.superiority, defaultRounds: cfg.rounds.default, maxRounds: cfg.rounds.max,
  });
  const window = problems.length ? { ...grade, grade: "INVALID" as const, reasons: [...grade.reasons, ...problems] } : grade;
  return { measurementKind: "single-arm-sequential-aa" as const, gradingContract: "single-q100k" as const,
    statistic: "ln(p50_k/p50_k-1)", logRatios, hardRuleHistory, exclusions, problems, windowGrade: window,
    timingEligible: window.grade === "GREEN" };
}
