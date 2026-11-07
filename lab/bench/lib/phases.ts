/**
 * The NS run plan: one continuous writer trace, phases of reader load laid over it.
 *
 * Seconds are at --phase-scale 1. `untilTraceS` phases end at a fixed trace time (the burst window);
 * `untilIdle` waits for the writer backlog to drain (bounded by maxS); `sweep` ends when the sweep
 * finishes (bounded by maxS). The burst of the fixed trace (TRACE_DEFAULTS.firstBurstAtS = 420 s,
 * 60 s long) falls inside the `burst` phase when the earlier phases run to plan; the report records
 * every phase's actual trace window and whether it overlapped a burst.
 */
export interface PhaseSpec {
  readonly name: string;
  readonly readers: number;
  readonly seconds?: number;
  readonly untilTraceS?: number;
  readonly untilIdle?: boolean;
  readonly sweep?: boolean;
  readonly maxS?: number;
  readonly mode?: "mixed" | "panels";
  /** Measured level of the P1 ladder. */
  readonly ladder?: boolean;
  readonly stress?: boolean;
  readonly subWindowS?: number;
}

export function nsPlan(scale = 1, firstBurstAtS = 420, burstS = 60): PhaseSpec[] {
  const s = (n: number) => Math.max(5, Math.round(n * scale));
  return [
    { name: "baseline", readers: 0, seconds: s(60) },
    ...[1, 4, 16, 64, 256].map((n) => ({ name: `L${n}`, readers: n, seconds: s(45), ladder: true })),
    { name: "L1024", readers: 1024, seconds: s(45), ladder: true, stress: true },
    { name: "recovery", readers: 256, seconds: s(60), subWindowS: Math.max(5, Math.round(10 * scale)) },
    { name: "burst", readers: 256, untilTraceS: firstBurstAtS + burstS },
    { name: "drain", readers: 64, untilIdle: true, maxS: s(300) },
    { name: "p4depth", readers: 1, seconds: s(45), mode: "panels" },
    { name: "presweep", readers: 64, seconds: s(45) },
    { name: "sweep", readers: 64, sweep: true, maxS: Math.max(60, Math.round(1500 * Math.max(scale, 0.2))) },
  ];
}
