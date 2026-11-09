import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { forkMemoryScope, dropMemoryScope, memoryComposition } from "./memory.ts";
import { trafficArm, ratioSummary, matchSweepWindow } from "./w0-traffic.ts";
import { freezeMemoryG0, fingerprintSweep, type FingerprintInput } from "./w0-fingerprint.ts";
import { Rng, seedOf } from "./rng.ts";
import { sha256 } from "./w0-world.ts";
export async function runMemoryRounds(o: {
  scope: string;
  N: number;
  dir: string;
  expected: FingerprintInput["expected"];
  counts: Record<string, number>;
  basis: FingerprintInput["basis"];
  rounds?: number;
  durationS?: number;
  seed: string;
  workers?: number;
  burst?: boolean;
}) {
  fs.mkdirSync(o.dir, { recursive: true });
  const rng = new Rng(seedOf(o.seed));
  const rounds: any[] = [];
  const sourceFiles = fs
    .readdirSync(new URL("./", import.meta.url))
    .filter((f) => /\.(ts|py)$/.test(f));
  const sources = Object.fromEntries(
    sourceFiles.map((f) => [f, sha256(fs.readFileSync(new URL(f, import.meta.url)))]),
  );
  const pin = await freezeMemoryG0(memoryComposition("xtdb", o.scope), {
    endpoint: `memory://${o.scope}`,
    scope: o.scope,
    basis: o.basis,
    expected: o.expected,
    counts: o.counts,
  });
  const n = o.rounds ?? 12;
  if (!Number.isInteger(n) || n < 1 || n > 24) throw new Error("round count");
  for (let i = 0; i < n; i++) {
    const aa = (i + 1) % 6 === 0,
      kind = o.burst || rng.int(2) ? "burst" : "steady",
      durationS = o.durationS ?? 100,
      offset = kind === "burst" ? 120 : 0;
    if (kind === "burst" && durationS < 60 && o.durationS === undefined)
      throw new Error("partial burst window");
    const release = i % 2 ? "R1" : "R2",
      controllerOn = i % 2 === 1,
      treatmentFirst = rng.int(2) === 0;
    const arms: any = {};
    // Baseline calibration precedes the randomized measured order; it is never a reported no-sweep measurement.
    let baseline: { read: number; commit: number } | undefined;
    const order = treatmentFirst ? ["sweep", "baseline"] : ["baseline", "sweep"];
    if (treatmentFirst && !aa) {
      const calibrationScope = `${o.scope}:cal:${i}:${randomUUID()}`,
        comp = forkMemoryScope(o.scope, calibrationScope);
      try {
        const c = await trafficArm({
          comp,
          scope: calibrationScope,
          N: o.N,
          dir: o.dir,
          id: `cal-${i}`,
          seed: o.seed + ":cal:" + i,
          durationS: 2,
          traceOffsetS: 120,
          workers: o.workers ?? 2,
          controllerOn: false,
          sweep: false,
          release,
        });
        baseline = { read: c.read.p99, commit: c.commit.p99 };
      } finally {
        dropMemoryScope(calibrationScope);
      }
    }
    for (const name of order) {
      const scope = `${o.scope}:round:${i}:${name}:${randomUUID()}`,
        comp = forkMemoryScope(o.scope, scope);
      try {
        const admission = await fingerprintSweep(
          {
            endpoint: `memory://${scope}`,
            scope,
            basis: o.basis,
            expected: o.expected,
            counts: o.counts,
            pin,
          },
          async () => ({ endpoint: `memory://${scope}`, scope, comp, close: async () => {} }),
        );
        if (admission.status !== "complete-and-matching") throw new Error("round G0 refused");
        arms[name] = await trafficArm({
          comp,
          scope,
          N: o.N,
          dir: o.dir,
          id: `round-${i}-${name}`,
          seed: o.seed + ":" + i,
          durationS,
          traceOffsetS: offset,
          workers: o.workers ?? 2,
          controllerOn,
          sweep: name === "sweep" && !aa,
          release,
          baseline,
        });
        arms[name].admission = admission;
        if (name === "baseline")
          baseline = { read: arms[name].read.p99, commit: arms[name].commit.p99 };
      } finally {
        dropMemoryScope(scope);
      }
    }
    if (
      arms.sweep.trace.sha256 !== arms.baseline.trace.sha256 ||
      arms.sweep.trace.offered !== arms.sweep.trace.committed ||
      arms.baseline.trace.offered !== arms.baseline.trace.committed
    )
      throw new Error("matched trace/progress mismatch");
    matchSweepWindow(arms.sweep, arms.baseline, aa);
    rounds.push({ round: i, kind, aa, order, release, controllerOn, ...arms });
    fs.writeFileSync(
      o.dir + "/rounds.json",
      JSON.stringify({ classification: "DIAGNOSTIC", sources, rounds }, null, 2),
    );
  }
  for (const [file, hash] of Object.entries(sources))
    if (sha256(fs.readFileSync(new URL(file, import.meta.url))) !== hash)
      throw new Error("round source changed");
  return {
    classification: "DIAGNOSTIC",
    acceptance: false,
    seed: o.seed,
    sources,
    rounds,
    ratios: ratioSummary(rounds, o.seed + ":bootstrap"),
    limitations: [
      "single-arm matched-phase screening; M01 duet not merged",
      "host cores shared; no engine acceptance",
      "commit p99 requires 25000 commands per arm and 8 burst rounds",
      "short explicit durations are integration-only; a partial burst cannot close a ratio bar",
    ],
  };
}
