// [EXP-P4N-R2] Why (review F1, F2): P2 guard under Q104a as a reproducible PAIR-0 measurement. Three arms per round, matched 10-fact commits with a
// rotating order, a fresh store per arm per round, 1,050 commits per arm per round (50 warmup dropped), 12 rounds (PAIR-0 needs at least 8 for an
// interval; more rounds raise the resolvable s_d limit). The raw per-round matched latencies are written to `p2raw/round-NN.json` BEFORE any verdict
// is computed, with the bindings (HEAD, arm sources, node, attempt id) in `p2-bindings.json`; `p2verdict.ts` turns them into PASS, FAIL or
// INCONCLUSIVE and `p2-recompute.ts` reproduces the verdict from the raw files. The test passes only on PASS (an INCONCLUSIVE window or a failed bar
// fails it visibly). Modes (P4N_P2_MODE): `worker` = round 3's retained writer worker against this tree's worker, A/A twin of the first (commit path,
// no readers); `fills` = this tree's HostLog with current.db documents off against on, readers pulling the hot owners concurrently with every commit
// (the (c') guard: fills and hits run beside the commit), A/A twin of off. Rejected: judging the p99 on a bootstrap over pooled commits and a band
// from the largest twin departure (round 1), and a verdict that ignores the p50 bar.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { candidateWorkerSource } from "./p2guard-arms.js";
import { sqliteWorker as treeWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { append, base, fresh, row } from "./helpers.js";
import { openWorker } from "./worker-client.js";
import { p2Verdict, Q104A, type P2Round } from "../../experiments/EXP-P4N/g5/p2verdict.ts";
const MODE = process.env.P4N_P2_MODE ?? "worker";
const ROUNDS = Number(process.env.P4N_ROUNDS ?? 12),
  COMMITS = Number(process.env.P4N_COMMITS ?? 1050),
  WARM = 50;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
type Arm = {
  commit: (rows: any[], i: number) => Promise<void>;
  close: () => Promise<void>;
  stats?: () => Promise<Record<string, number>>;
};
const workerArm = async (source: string): Promise<Arm> => {
  const w = await openWorker(source);
  return { commit: async (rows) => void (await w.append(rows)), close: () => w.close() };
};
const HOT = 8;
const logArm = async (docs: boolean): Promise<Arm> => {
  const { log } = await HostLog.open(fresh(), {
    minFreeBytes: 0,
    ...(docs ? { currentDocs: true } : {}),
  });
  // seed the hot owners so documents have something to hold
  await append(
    log,
    Array.from({ length: HOT * 20 }, (_, k) => row(k + 1, `h:${k % HOT}`, 2048)),
  );
  let head = 2048;
  return {
    commit: async (rows, i) => {
      // readers pull the hot owners at the previous head while this commit is in flight (misses fill documents, hits read them)
      const pulls = [0, 3, 5].map((d) =>
        log.wholePull(head, [`h:${(i + d) % HOT}`]).catch(() => undefined),
      );
      await append(log, rows);
      head = Math.max(...rows.map((r) => r.recorded_position));
      await Promise.all(pulls);
    },
    close: () => log.close(),
    stats: () => log.docStats(),
  };
};
it(`P2 guard (${MODE}): commit latency with the new path on versus off under Q104a`, async () => {
  const dir = path.join(base, "p2raw");
  fs.mkdirSync(dir, { recursive: true });
  const offSource = MODE === "worker" ? await candidateWorkerSource() : "";
  const arms = async () =>
    MODE === "worker"
      ? {
          off: await workerArm(offSource),
          on: await workerArm(treeWorker),
          twin: await workerArm(offSource),
        }
      : { off: await logArm(false), on: await logArm(true), twin: await logArm(false) };
  const rounds: P2Round[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const a = await arms();
    const lat: Record<"off" | "on" | "twin", number[]> = { off: [], on: [], twin: [] };
    let docStatsOn: Record<string, number> | undefined;
    try {
      for (let i = 0; i < COMMITS + WARM; i++) {
        const pos = (i + 3) * 1024;
        const rows = Array.from({ length: 10 }, (_, j) =>
          row(
            1000 + i * 10 + j,
            MODE === "worker" ? `s:${i % 100}/child:${j}` : `h:${i % HOT}`,
            pos,
          ),
        );
        const order = (["off", "on", "twin"] as const).map(
          (_, k, all) => all[(k + i + round) % 3]!,
        );
        for (const name of order) {
          const t0 = performance.now();
          await a[name].commit(rows, i);
          if (i >= WARM) lat[name].push(performance.now() - t0);
        }
      }
    } finally {
      docStatsOn = a.on.stats ? await a.on.stats() : undefined;
      await a.off.close();
      await a.on.close();
      await a.twin.close();
    }
    const raw: P2Round & { docStatsOn?: Record<string, number> } = {
      docStatsOn,
      id: "R" + String(round).padStart(2, "0"),
      off: lat.off,
      on: lat.on,
      twin: lat.twin,
    };
    fs.writeFileSync(
      path.join(dir, `round-${String(round).padStart(2, "0")}.json`),
      JSON.stringify(raw),
    );
    rounds.push(raw);
  }
  fs.writeFileSync(
    path.join(base, "p2-bindings.json"),
    JSON.stringify(
      {
        attempt: path.basename(base),
        mode: MODE,
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        dirty:
          execFileSync("git", ["status", "--porcelain", "packages/qlever/src"], {
            encoding: "utf8",
          }).trim() || null,
        offWorkerSha256: MODE === "worker" ? sha(offSource) : null,
        onWorkerSha256: sha(treeWorker),
        node: process.version,
        rounds: ROUNDS,
        commitsPerArmPerRound: COMMITS - WARM,
        rule: Q104A,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  const result = p2Verdict(rounds);
  fs.writeFileSync(
    path.join(base, "p2-verdict.json"),
    JSON.stringify({ mode: MODE, result }, null, 2),
  );
  console.log(
    JSON.stringify({
      mode: MODE,
      verdict: result.verdict,
      reasons: result.reasons,
      p50DeltaMs: result.p50.deltaMs,
      p99: result.p99,
      aa: result.aa,
    }),
  );
  expect(result.verdict, result.reasons.join("; ")).toBe("PASS");
}, 3_600_000);
