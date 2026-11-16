import type { TraceEvent } from "./trace.ts";
import type { PhaseSpec } from "./phases.ts";

// [DX-T1-10] Why: a separately identified fixed-gap diagnostic holds facts, subjects and order constant across component trials.
// Rejected: changing the frozen north-star trace, treating scheduled gaps as actual idle time, or qualifying diagnostic phases as a verdict.
export interface IdleEvent extends TraceEvent {
  readonly idleGapMs: number;
  readonly idleWarmup: boolean;
}
export function idlePlan(gaps: readonly number[], count: number, subjects: number, warmupCommits = 200) {
  if (
    !Number.isSafeInteger(warmupCommits) || warmupCommits<0 || warmupCommits>5000 || !gaps.length ||
    gaps.some((g) => !Number.isSafeInteger(g) || g < 10 || g > 1000) ||
    new Set(gaps).size !== gaps.length ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 1000 ||
    !Number.isSafeInteger(subjects) ||
    subjects < 1
  )
    throw Error("Invalid idle diagnostic plan");
  const events: IdleEvent[] = [],
    phases: PhaseSpec[] = [];
  let offset = 0,
    seq = 0;
  for (const stage of [
    { gap: 25, count: warmupCommits, warmup: true },
    ...gaps.map((gap) => ({ gap, count, warmup: false })),
  ]) {
    const seconds = (stage.gap * stage.count + 1000) / 1000;
    phases.push({
      name: stage.warmup ? "warmup" : `idle-${stage.gap}`,
      seconds,
      readers: 0,
      measured: !stage.warmup,
    });
    for (let i = 0; i < stage.count; i++) {
      events.push({
        seq,
        atMs: offset + i * stage.gap,
        subject: seq % Math.min(200, subjects),
        kind: "runtime",
        facts: 10,
        correction: false,
        ackLoss: false,
        resend: false,
        burst: false,
        active: true,
        stream: "background",
        idleGapMs: stage.gap,
        idleWarmup: stage.warmup,
      });
      seq++;
    }
    offset += seconds * 1000;
  }
  return { events, phases, durationS: offset / 1000 };
}
