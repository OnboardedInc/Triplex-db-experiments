// [EXP-P4N-R2] Why (step c', BRIEF 5.3 P1): a read transaction held on current.db for at least 10 s while commits and document fills continue must leave
// commit latency inside the A/A band, and current.db must only ever be checkpointed PASSIVE (the automatic WAL checkpoint). Three phases of paced commits
// (25 ms apart, 10-fact commits, readers pulling the hot owners beside each commit so fills keep writing current.db): A = no long read, B = a read
// transaction held open on current.db the whole phase (not less than 10 s), C = after release. p50 delta B-A and C-A are asserted against the 0.5 ms bar; p99
// ratios are reported only (n = 400 per phase is below Q104a's 1,000 for a p99 judgement). Rejected: asserting p99 at 400 samples (round 3 showed a
// same-code control spanning 0.85 to 2.23 at that size).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { it, expect } from "vitest";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { append, base, fresh, row } from "./helpers.js";
const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!;
it("a 10 s read transaction on current.db leaves commit latency and fills unaffected; checkpoints are PASSIVE only", async () => {
  // static: the worker never asks for a stronger checkpoint of the documents file
  expect(sqliteWorker).not.toMatch(/cdb\.pragma\('wal_checkpoint/);
  expect(sqliteWorker).not.toMatch(/cdb\.(exec|pragma)\([^)]*(RESTART|TRUNCATE)/);
  const dir = fresh();
  const { log } = await HostLog.open(dir, { minFreeBytes: 0, currentDocs: true });
  const HOT = 8,
    PER = 400;
  await append(
    log,
    Array.from({ length: HOT * 20 }, (_, k) => row(k + 1, `h:${k % HOT}`, 2048)),
  );
  let head = 2048,
    n = 0;
  const phase = async (name: string, ms: number) => {
    const lat: number[] = [];
    const t0 = performance.now();
    for (let i = 0; i < PER || performance.now() - t0 < ms; i++, n++) {
      const pos = (n + 3) * 1024;
      const rows = Array.from({ length: 10 }, (_, j) =>
        row(100000 + n * 10 + j, `h:${n % HOT}`, pos),
      );
      const pulls = [0, 3, 5].map((d) =>
        log.wholePull(head, [`h:${(n + d) % HOT}`]).catch(() => undefined),
      );
      const t = performance.now();
      await append(log, rows);
      lat.push(performance.now() - t);
      head = pos;
      await Promise.all(pulls);
      await new Promise((r) => setTimeout(r, 25));
    }
    return {
      name,
      n: lat.length,
      p50: q(lat, 0.5),
      p99: q(lat, 0.99),
      seconds: (performance.now() - t0) / 1000,
    };
  };
  const fillsBefore = (await log.docStats()).fills;
  const A = await phase("A", 0);
  const raw = new D(path.join(dir, "current.db"), { readonly: true });
  raw.exec("BEGIN");
  const held = raw.prepare("SELECT count(*) FROM docs").pluck().get() as number;
  const fillsAtHold = (await log.docStats()).fills;
  const B = await phase("B", 10_500);
  const fillsDuringHold = (await log.docStats()).fills - fillsAtHold;
  expect(held).toBeGreaterThan(0);
  raw.exec("COMMIT");
  raw.close();
  const C = await phase("C", 0);
  const stats = await log.docStats();
  const walBytes = fs.existsSync(path.join(dir, "current.db-wal"))
    ? fs.statSync(path.join(dir, "current.db-wal")).size
    : 0;
  await log.close();
  const result = {
    A,
    B,
    C,
    p50DeltaBA: B.p50 - A.p50,
    p50DeltaCA: C.p50 - A.p50,
    p99RatioBA: B.p99 / A.p99,
    p99RatioCA: C.p99 / A.p99,
    heldSeconds: B.seconds,
    docsInFileAtHold: held,
    fillsBefore,
    fillsDuringHold,
    stats,
    walBytes,
  };
  fs.writeFileSync(path.join(base, "p1-longread.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  expect(B.seconds).toBeGreaterThanOrEqual(10);
  expect(result.p50DeltaBA).toBeLessThanOrEqual(0.5);
  expect(result.p50DeltaCA).toBeLessThanOrEqual(0.5);
  expect(fillsDuringHold).toBeGreaterThan(0); // fills kept writing while the long read was open
  expect(stats.fillErrors).toBe(0);
  expect(walBytes).toBeLessThan(64 * 1024 * 1024 + 4096); // journal_size_limit bounds the WAL once checkpoints run
}, 120000);
