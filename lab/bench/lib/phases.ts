/**
 * The NS run plan (v2): one continuous writer trace from trace time 0 (the start of the measured
 * window), phases of reader load laid over it. Bursts fall where the frozen offer schedule puts them
 * (120 s + k x 600 s); every phase records its trace window and burst overlap, and writer latency is
 * attributed against a zero-reader run of the same trace on the same trace-time windows (matched phase).
 *
 * Profiles (RULINGS Q16): acceptance = 120 s warmup and 600 s per ladder level (the only profile that can
 * close an obligation); screening = 30 s warmup, 120 s per level (candidate comparison); smoke = 15 s
 * warmup, 45 s per level (development and first numbers; never closes anything).
 * `zeroReaders` runs the identical plan with no readers at all: the matched baseline run.
 */
export interface PhaseSpec {
  readonly name: string;
  readonly readers: number;
  readonly seconds?: number;
  readonly sweep?: boolean;
  readonly growHistoryTo?: number;
  readonly maxS?: number;
  readonly mode?: "mixed" | "weighted" | "sample";
  readonly measured: boolean;
  readonly ladder?: boolean;
}
export const PROFILES = {
  acceptance: { warmupS: 120, levelS: 600, recoveryS: 120 },
  screening: { warmupS: 30, levelS: 120, recoveryS: 90 },
  smoke: { warmupS: 15, levelS: 45, recoveryS: 60 },
} as const;
export type Profile = keyof typeof PROFILES;

export function nsPlan(profile: Profile, zeroReaders = false): PhaseSpec[] {
  const p = PROFILES[profile];
  const r = (n: number) => (zeroReaders ? 0 : n);
  return [
    { name: "warmup", readers: r(16), seconds: p.warmupS, measured: false },
    { name: "baseline", readers: 0, seconds: p.levelS, measured: true },
    ...[1, 4, 16, 64, 256, 1024].map((n) => ({ name: `L${n}`, readers: r(n), seconds: p.levelS, measured: true, ladder: true })),
    { name: "recovery", readers: r(256), seconds: p.recoveryS, measured: true },
    { name: "p4mix", readers: r(1), seconds: p.levelS, mode: "weighted" as const, measured: true },
    { name: "p4h1", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "grow3", readers: 0, growHistoryTo: 3, maxS: 1800, measured: false },
    { name: "p4h3", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "grow10", readers: 0, growHistoryTo: 10, maxS: 3600, measured: false },
    { name: "p4h10", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "presweep", readers: r(64), seconds: p.levelS, measured: true },
    { name: "sweep", readers: r(64), sweep: !zeroReaders, seconds: zeroReaders ? p.levelS : undefined, maxS: 1800, measured: true },
  ];
}
