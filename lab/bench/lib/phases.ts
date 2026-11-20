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
  readonly seconds?: number | undefined;
  readonly sweep?: boolean;
  readonly growHistoryTo?: number;
  readonly maxS?: number;
  readonly mode?: "mixed" | "weighted" | "sample";
  readonly measured: boolean;
  readonly ladder?: boolean;
  readonly traceFromS?: number;
  readonly pool?: "L256" | "L1024" | "recovery";
  readonly cycle?: number;
}
export const PROFILES = {
  acceptance: { warmupS: 120, levelS: 600, recoveryS: 120 },
  screening: { warmupS: 30, levelS: 120, recoveryS: 90 },
  smoke: { warmupS: 15, levelS: 45, recoveryS: 60 },
  v3: { warmupS: 15, levelS: 45, recoveryS: 60 },
} as const;
export type Profile = keyof typeof PROFILES;

export function nsPlan(profile: Profile, zeroReaders = false): PhaseSpec[] {
  if (profile === "v3") return v3Plan(zeroReaders);
  const p = PROFILES[profile];
  const r = (n: number) => (zeroReaders ? 0 : n);
  return [
    { name: "warmup", readers: r(16), seconds: p.warmupS, measured: false },
    { name: "baseline", readers: 0, seconds: p.levelS, measured: true },
    ...[1, 4, 16, 64, 256, 1024].map((n) => ({
      name: `L${n}`,
      readers: r(n),
      seconds: p.levelS,
      measured: true,
      ladder: true,
    })),
    { name: "recovery", readers: r(256), seconds: p.recoveryS, measured: true },
    { name: "p4mix", readers: r(1), seconds: p.levelS, mode: "weighted" as const, measured: true },
    { name: "p4h1", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "grow3", readers: 0, growHistoryTo: 3, maxS: 1800, measured: false },
    { name: "p4h3", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "grow10", readers: 0, growHistoryTo: 10, maxS: 3600, measured: false },
    { name: "p4h10", readers: r(1), seconds: p.levelS, mode: "sample" as const, measured: true },
    { name: "presweep", readers: r(64), seconds: p.levelS, measured: true },
    {
      name: "sweep",
      readers: r(64),
      sweep: !zeroReaders,
      seconds: zeroReaders ? p.levelS : undefined,
      maxS: 1800,
      measured: true,
    },
  ];
}

export const V3_PLAN_ID = "ns-v3/2";
export const V3_OFFER_SECONDS = 5910;
// [DX-T1-12] Why: fixed trace offsets enlarge samples without raising the frozen offer rate or mixing bursts into steady windows.
// Rejected: lengthening the old ladder serially (the long windows would land on different burst phases).
function v3Plan(zeroReaders: boolean): PhaseSpec[] {
  const r = (n: number) => (zeroReaders ? 0 : n);
  const prefix = nsPlan("smoke", zeroReaders).slice(0, 6);
  let offset = 0;
  const fixed = (p: PhaseSpec): PhaseSpec => {
    const item = { ...p, traceFromS: offset };
    offset += p.seconds!;
    return item;
  };
  const plan = prefix.map(fixed);
  for (let block = 0; block < 4; block++) {
    plan.push(
      fixed({
        name: `L256-${"ABCD"[block]}`,
        readers: r(256),
        seconds: 480,
        measured: true,
        ladder: true,
        pool: "L256",
      }),
    );
    plan.push(
      fixed({
        name: `hold-${block + 2}`,
        readers: r(block % 2 ? 16 : 0),
        seconds: 120,
        measured: false,
      }),
    );
  }
  for (let group = 0; group < 4; group++) {
    plan.push(fixed({ name: `lead-${group + 1}`, readers: r(256), seconds: 60, measured: false }));
    for (let i = 0; i < 4; i++) {
      const cycle = group * 4 + i + 1;
      plan.push(
        fixed({
          name: `L1024-${cycle}`,
          readers: r(1024),
          seconds: 45,
          measured: true,
          ladder: true,
          pool: "L1024",
          cycle,
        }),
      );
      plan.push(
        fixed({
          name: `recovery-${cycle}`,
          readers: r(256),
          seconds: 60,
          measured: true,
          pool: "recovery",
          cycle,
        }),
      );
    }
    plan.push(
      fixed({
        name: `hold-${group + 6}`,
        readers: r(group % 2 ? 16 : 0),
        seconds: 120,
        measured: false,
      }),
    );
  }
  if (offset !== 5040) throw Error("Invalid v3 fixed phase prefix");
  // [DX-T1-13] Why: two further unchanged stress/recovery cycles put every required recovery pool above 520, in the next gap between bursts.
  // Rejected: raising the offer rate or stretching a recovery window (either changes the cohort's meaning).
  plan.push(fixed({ name: "lead-5", readers: r(256), seconds: 60, measured: false }));
  for (let cycle = 17; cycle <= 18; cycle++) {
    plan.push(
      fixed({
        name: `L1024-${cycle}`,
        readers: r(1024),
        seconds: 45,
        measured: true,
        ladder: true,
        pool: "L1024",
        cycle,
      }),
    );
    plan.push(
      fixed({
        name: `recovery-${cycle}`,
        readers: r(256),
        seconds: 60,
        measured: true,
        pool: "recovery",
        cycle,
      }),
    );
  }
  plan.push(fixed({ name: "hold-10", readers: r(0), seconds: 120, measured: false }));
  if (offset !== V3_OFFER_SECONDS - 480) throw Error("Invalid v3 extended phase prefix");
  return [...plan, ...nsPlan("smoke", zeroReaders).slice(9)];
}
