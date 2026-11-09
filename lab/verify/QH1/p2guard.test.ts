// [EXP-P4N] Why: P2 guard for the new read path under Q104a. Arms are matched 10-fact commits to three fresh writer workers, interleaved
// with a rotating order: `off` (round 3 final's retained sqlite-worker), `on` (this worktree's worker, new read path) and `twin` (a second
// copy of `off`, the A/A control). At least 1,000 commits per arm after warmup, at least 3 rounds (each round fresh stores), one pooled
// bootstrap (5,000 draws over matched commit triples) for the p99 ratios. A p99 counts as a regression only when the bootstrap lower
// bound of on/off exceeds 1 plus the A/A band (the largest |twin/off - 1| over rounds and the twin/off bootstrap bound). The p50 delta
// is reported with its bootstrap interval. The result file is written before any assertion. This is a storage-worker diagnostic on a
// shared host, not application P2. Rejected: one run of 350 commits (QH1 round 3: same-code control spanned 0.85 to 2.23).
import fs from "node:fs";
import path from "node:path";
import { it, expect } from "vitest";
import { candidateWorkerSource } from "./p2guard-arms.js";
import { sqliteWorker as current } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { base, row } from "./helpers.js";
import { openWorker } from "./worker-client.js";
const ROUNDS = Number(process.env.P4N_ROUNDS ?? 5),
  COMMITS = Number(process.env.P4N_COMMITS ?? 1050),
  WARM = 50;
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
it("P2 guard: commit latency with the new read path on versus off (Q104a)", async () => {
  const offSource = await candidateWorkerSource();
  const perRound: any[] = [];
  const triples: [number, number, number][] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const a = await openWorker(offSource),
      b = await openWorker(current),
      t = await openWorker(offSource);
    const arms = { off: a, on: b, twin: t } as const;
    const lat: Record<string, number[]> = { off: [], on: [], twin: [] };
    try {
      for (let i = 0; i < COMMITS + WARM; i++) {
        const rows = Array.from({ length: 10 }, (_, j) =>
          row(i * 10 + j, `s:${i % 100}/child:${j}`, (i + 1) * 1024),
        );
        const order = (
          (i + round) % 3 === 0
            ? ["off", "on", "twin"]
            : (i + round) % 3 === 1
              ? ["on", "twin", "off"]
              : ["twin", "off", "on"]
        ) as (keyof typeof arms)[];
        for (const name of order) {
          const t0 = performance.now();
          await arms[name].append(rows);
          if (i >= WARM) lat[name]!.push(performance.now() - t0);
        }
      }
    } finally {
      await a.close();
      await b.close();
      await t.close();
    }
    for (let i = 0; i < COMMITS; i++) triples.push([lat.off![i]!, lat.on![i]!, lat.twin![i]!]);
    perRound.push({
      round,
      commits: COMMITS,
      off: { p50: q(lat.off!, 0.5), p99: q(lat.off!, 0.99) },
      on: { p50: q(lat.on!, 0.5), p99: q(lat.on!, 0.99) },
      twin: { p50: q(lat.twin!, 0.5), p99: q(lat.twin!, 0.99) },
      p99RatioOnOff: q(lat.on!, 0.99) / q(lat.off!, 0.99),
      p99RatioTwinOff: q(lat.twin!, 0.99) / q(lat.off!, 0.99),
      p50DeltaOnOff: q(lat.on!, 0.5) - q(lat.off!, 0.5),
      p50DeltaTwinOff: q(lat.twin!, 0.5) - q(lat.off!, 0.5),
    });
  }
  let seed = 0x9e3779b9;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const draws: Record<string, number[]> = {
    p99OnOff: [],
    p99TwinOff: [],
    p50DeltaOnOff: [],
    p50DeltaTwinOff: [],
  };
  for (let d = 0; d < 5000; d++) {
    const pick = Array.from(
      { length: triples.length },
      () => triples[Math.floor(rnd() * triples.length)]!,
    );
    const off = pick.map((x) => x[0]),
      on = pick.map((x) => x[1]),
      twin = pick.map((x) => x[2]);
    draws.p99OnOff!.push(q(on, 0.99) / q(off, 0.99));
    draws.p99TwinOff!.push(q(twin, 0.99) / q(off, 0.99));
    draws.p50DeltaOnOff!.push(q(on, 0.5) - q(off, 0.5));
    draws.p50DeltaTwinOff!.push(q(twin, 0.5) - q(off, 0.5));
  }
  const ci = (a: number[]) => ({ lo: q(a, 0.025), median: q(a, 0.5), hi: q(a, 0.975) });
  const off = triples.map((x) => x[0]),
    on = triples.map((x) => x[1]),
    twin = triples.map((x) => x[2]);
  const aaBand = Math.max(
    ...perRound.map((r) => Math.abs(r.p99RatioTwinOff - 1)),
    ci(draws.p99TwinOff!).hi - 1,
    1 - ci(draws.p99TwinOff!).lo,
  );
  const result = {
    diagnostic: true,
    rule: "Q104a: >= 1,000 commits per arm, >= 3 A/A rounds, bootstrap; regression only if the on/off p99 interval lower bound exceeds 1 + A/A band",
    rounds: ROUNDS,
    commitsPerArmPerRound: COMMITS,
    commitsPerArmTotal: triples.length,
    pooled: {
      off: { p50: q(off, 0.5), p99: q(off, 0.99) },
      on: { p50: q(on, 0.5), p99: q(on, 0.99) },
      twin: { p50: q(twin, 0.5), p99: q(twin, 0.99) },
    },
    p99RatioOnOff: { point: q(on, 0.99) / q(off, 0.99), bootstrap95: ci(draws.p99OnOff!) },
    p99RatioTwinOff: { point: q(twin, 0.99) / q(off, 0.99), bootstrap95: ci(draws.p99TwinOff!) },
    p50DeltaOnOffMs: { point: q(on, 0.5) - q(off, 0.5), bootstrap95: ci(draws.p50DeltaOnOff!) },
    p50DeltaTwinOffMs: {
      point: q(twin, 0.5) - q(off, 0.5),
      bootstrap95: ci(draws.p50DeltaTwinOff!),
    },
    aaBand,
    regression: ci(draws.p99OnOff!).lo > 1 + aaBand,
    resolvable: aaBand <= 0.1,
    perRound,
  };
  fs.writeFileSync(path.join(base, "p2guard.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, perRound: undefined }));
  expect(result.regression).toBe(false);
}, 1_800_000);
