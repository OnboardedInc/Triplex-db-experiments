/**
 * Per-round accounting for paired rounds (EXP-M01, PAIR-0).
 *
 * [EXP-M01] Why (R22 sections 2.4 and 6.2; RULINGS Q60d): a round's numbers must include every offered command,
 * not only the committed ones, or a candidate that sheds load looks faster (survivorship). Each round therefore
 * keeps three commit histograms over the frozen trace's own commands (background stream, no re-sends) scheduled in
 * its measured window: `commit` (committed), `commitCensored` (expired, failed, rejected, conflicted, or still
 * pending at the end, each at its censor time) and `commitAll` (the union, which the paired statistics use with
 * the censored subset for identification). The open-loop read probe gets the same three. Latency runs from the
 * scheduled (intended) time. Per-second goodput (completions by finish second) and per-second maximum latency
 * (by scheduled second) show collapse and stalls that a quantile hides.
 * A round is complete once every command and probe scheduled in it has finished; complete rounds can be emitted
 * while the run continues, so the coordinator can look at 8, 12, 18 and 24 rounds (Q60a).
 */
import { createHash } from "node:crypto";
import { Histogram } from "./hist.ts";
import type { PlannedRound } from "./noise.ts";

export interface CommandDone { readonly seq: number; readonly scheduledAt: number; readonly finishedAt: number; readonly latencyMs: number; readonly outcome: string }
export interface ProbeDone { readonly seq: number; readonly scheduledAt: number; readonly finishedAt: number; readonly latencyMs: number; readonly ok: boolean; readonly expired: boolean }
export interface ClientStats { readonly eluMean: number | null; readonly eluMax: number | null; readonly hiccupMaxMs: number | null }
export const ROUND_HISTOGRAMS = ["commitAll", "commitCensored", "commit", "probeAll", "probeCensored", "probe"] as const;
export type RoundHistogram = (typeof ROUND_HISTOGRAMS)[number];

interface Acc {
  readonly round: PlannedRound;
  readonly fromMs: number;
  readonly toMs: number;
  readonly pendingCommands: Map<number, number>;
  readonly pendingProbes: Map<number, number>;
  readonly expectedCommands: number;
  readonly expectedProbes: number;
  readonly offered: { commands: number; commandsDigest: string; probes: number; probesDigest: string };
  readonly hist: Record<RoundHistogram, Histogram>;
  readonly outcomes: Record<string, number>;
  readonly commitGoodput: number[];
  readonly commitMaxMs: (number | null)[];
  readonly probeGoodput: number[];
  readonly probeMaxMs: (number | null)[];
  probeErrors: number;
  probeExpired: number;
  pendingAtEndCommands: number;
  pendingAtEndProbes: number;
  emitted: boolean;
}

export interface RoundRecord {
  readonly id: string;
  readonly kind: string;
  readonly preflight: boolean;
  readonly fromMs: number;
  readonly toMs: number;
  /** RULINGS Q67f: the offered-command list of this window (seq and scheduled trace offset), digested; equal in both arms. */
  readonly offered: { commands: number; commandsDigest: string; probes: number; probesDigest: string };
  readonly commands: { expected: number; finished: number; committed: number; censored: number; pendingAtEnd: number; byOutcome: Record<string, number> };
  readonly probes: { expected: number; finished: number; ok: number; errors: number; expired: number; pendingAtEnd: number };
  readonly perSecond: { commitGoodput: number[]; commitMaxMs: (number | null)[]; probeGoodput: number[]; probeMaxMs: (number | null)[] };
  readonly client: ClientStats;
  readonly summary: Record<RoundHistogram, ReturnType<Histogram["summary"]>>;
  readonly hist: Record<RoundHistogram, ReturnType<Histogram["toJSON"]>>;
}

export class RoundBook {
  private readonly accs: Acc[];
  constructor(rounds: readonly PlannedRound[], traceStartAbsMs: number, commands: readonly { seq: number; atMs: number }[], probes: readonly { seq: number; atMs: number }[]) {
    this.accs = rounds.map((round) => {
      const fromMs = traceStartAbsMs + round.fromS * 1000, toMs = traceStartAbsMs + round.toS * 1000;
      const pendingCommands = new Map<number, number>(), pendingProbes = new Map<number, number>();
      const cLines: string[] = [], pLines: string[] = [];
      for (const c of commands) { const at = traceStartAbsMs + c.atMs; if (at >= fromMs && at < toMs) { pendingCommands.set(c.seq, at); cLines.push(`${c.seq}:${c.atMs}`); } }
      for (const p of probes) { const at = traceStartAbsMs + p.atMs; if (at >= fromMs && at < toMs) { pendingProbes.set(p.seq, at); pLines.push(`${p.seq}:${p.atMs}`); } }
      const digest = (lines: string[]) => createHash("sha256").update(lines.join("\n")).digest("hex");
      const offered = { commands: cLines.length, commandsDigest: digest(cLines), probes: pLines.length, probesDigest: digest(pLines) };
      const secs = Math.ceil((toMs - fromMs) / 1000);
      return {
        round, fromMs, toMs, pendingCommands, pendingProbes, offered, expectedCommands: pendingCommands.size, expectedProbes: pendingProbes.size,
        hist: Object.fromEntries(ROUND_HISTOGRAMS.map((h) => [h, new Histogram()])) as Record<RoundHistogram, Histogram>, outcomes: {},
        commitGoodput: new Array(secs).fill(0), commitMaxMs: new Array(secs).fill(null), probeGoodput: new Array(secs).fill(0), probeMaxMs: new Array(secs).fill(null),
        probeErrors: 0, probeExpired: 0, pendingAtEndCommands: 0, pendingAtEndProbes: 0, emitted: false,
      };
    });
  }
  get rounds() { return this.accs.map((a) => ({ id: a.round.id, fromMs: a.fromMs, toMs: a.toMs })); }
  private at(t: number): Acc | undefined {
    return this.accs.find((a) => t >= a.fromMs && t < a.toMs);
  }
  private static max(xs: (number | null)[], i: number, v: number) { if (i >= 0 && i < xs.length && (xs[i] === null || v > xs[i]!)) xs[i] = v; }
  /** A finished frozen-trace command (background stream, not a re-send). Anything but "committed" is censored. */
  recordCommand(c: CommandDone): void {
    const a = this.at(c.scheduledAt);
    if (!a || !a.pendingCommands.delete(c.seq)) return;
    const censored = c.outcome !== "committed";
    a.hist.commitAll.recordMs(c.latencyMs);
    (censored ? a.hist.commitCensored : a.hist.commit).recordMs(c.latencyMs);
    a.outcomes[c.outcome] = (a.outcomes[c.outcome] ?? 0) + 1;
    RoundBook.max(a.commitMaxMs, Math.floor((c.scheduledAt - a.fromMs) / 1000), c.latencyMs);
    if (!censored) { const f = Math.floor((c.finishedAt - a.fromMs) / 1000); if (f >= 0 && f < a.commitGoodput.length) a.commitGoodput[f]!++; }
  }
  /** A finished open-loop probe read; errors and expired probes are censored. */
  recordProbe(p: ProbeDone): void {
    const a = this.at(p.scheduledAt);
    if (!a || !a.pendingProbes.delete(p.seq)) return;
    a.hist.probeAll.recordMs(p.latencyMs);
    (p.ok && !p.expired ? a.hist.probe : a.hist.probeCensored).recordMs(p.latencyMs);
    if (p.expired) a.probeExpired++; else if (!p.ok) a.probeErrors++;
    RoundBook.max(a.probeMaxMs, Math.floor((p.scheduledAt - a.fromMs) / 1000), p.latencyMs);
    if (p.ok && !p.expired) { const f = Math.floor((p.finishedAt - a.fromMs) / 1000); if (f >= 0 && f < a.probeGoodput.length) a.probeGoodput[f]!++; }
  }
  private record(a: Acc, client: ClientStats): RoundRecord {
    const committed = a.hist.commit.count;
    return {
      id: a.round.id, kind: a.round.kind, preflight: a.round.preflight, fromMs: a.fromMs, toMs: a.toMs, offered: a.offered,
      commands: { expected: a.expectedCommands, finished: a.expectedCommands - a.pendingCommands.size - a.pendingAtEndCommands, committed, censored: a.hist.commitCensored.count, pendingAtEnd: a.pendingAtEndCommands, byOutcome: { ...a.outcomes } },
      probes: { expected: a.expectedProbes, finished: a.expectedProbes - a.pendingProbes.size - a.pendingAtEndProbes, ok: a.hist.probe.count, errors: a.probeErrors, expired: a.probeExpired, pendingAtEnd: a.pendingAtEndProbes },
      perSecond: { commitGoodput: a.commitGoodput, commitMaxMs: a.commitMaxMs, probeGoodput: a.probeGoodput, probeMaxMs: a.probeMaxMs },
      client,
      summary: Object.fromEntries(ROUND_HISTOGRAMS.map((h) => [h, a.hist[h].summary()])) as RoundRecord["summary"],
      hist: Object.fromEntries(ROUND_HISTOGRAMS.map((h) => [h, a.hist[h].toJSON()])) as RoundRecord["hist"],
    };
  }
  /** Rounds whose window has ended and whose every command and probe has finished, not yet emitted. */
  ready(nowMs: number, client: (id: string, fromMs: number, toMs: number) => ClientStats): RoundRecord[] {
    const out: RoundRecord[] = [];
    for (const a of this.accs) {
      if (a.emitted || nowMs < a.toMs || a.pendingCommands.size || a.pendingProbes.size) continue;
      a.emitted = true;
      out.push(this.record(a, client(a.round.id, a.fromMs, a.toMs)));
    }
    return out;
  }
  /**
   * End of run: anything still pending is censored at `nowMs` (it never finished), then every round is returned.
   * Rounds that start at or after `traceEndMs` (the coordinator stopped the trace early) were never run and are dropped.
   */
  finalize(nowMs: number, client: (id: string, fromMs: number, toMs: number) => ClientStats, traceEndMs = Infinity): RoundRecord[] {
    const run = this.accs.filter((a) => a.fromMs < traceEndMs);
    for (const a of run) {
      for (const [, at] of a.pendingCommands) { a.hist.commitAll.recordMs(nowMs - at); a.hist.commitCensored.recordMs(nowMs - at); a.outcomes["pending-at-end"] = (a.outcomes["pending-at-end"] ?? 0) + 1; a.pendingAtEndCommands++; }
      for (const [, at] of a.pendingProbes) { a.hist.probeAll.recordMs(nowMs - at); a.hist.probeCensored.recordMs(nowMs - at); a.pendingAtEndProbes++; }
      a.pendingCommands.clear();
      a.pendingProbes.clear();
    }
    return run.map((a) => this.record(a, client(a.round.id, a.fromMs, a.toMs)));
  }
}
