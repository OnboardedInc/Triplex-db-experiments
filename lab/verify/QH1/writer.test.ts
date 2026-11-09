// [EXP-QH1] Why: owner-key write cost is measured against the actual compact v2 worker, interleaved.
// Rejected: comparing against JSON v1 or mutating the application's durability pragmas.
import fs from "node:fs";
import path from "node:path";
import { it, expect } from "vitest";
import { sqliteWorker as baseline } from "./baseline-v2-worker.js";
import { sqliteWorker as candidate } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { base, row } from "./helpers.js";
import { openWorker } from "./worker-client.js";
it("G7 matched 10-fact commits report owner-key P2 delta", async () => {
  // [EXP-QH1-R3] Why: an A/A arm (a second copy of the baseline worker, same interleaving) measures the noise floor of this p99, which is
  // one of about 350 fsync-bound commits. Rejected: judging a 1.1x tail ratio without a same-code control.
  const old = await openWorker(baseline),
    twin = await openWorker(baseline),
    now = await openWorker(candidate);
  const lat: { baseline: number[]; candidate: number[]; twin: number[] } = {
    baseline: [],
    candidate: [],
    twin: [],
  };
  const q = (a: number[], p: number) =>
    [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * p)]!;
  try {
    for (let i = 0; i < 400; i++) {
      const rows = Array.from({ length: 10 }, (_, j) =>
        row(i * 10 + j, `s:${i % 100}/child:${j}`, (i + 1) * 1024),
      );
      for (const [name, client] of (i % 3 === 0
        ? [
            ["baseline", old],
            ["candidate", now],
            ["twin", twin],
          ]
        : i % 3 === 1
          ? [
              ["candidate", now],
              ["twin", twin],
              ["baseline", old],
            ]
          : [
              ["twin", twin],
              ["baseline", old],
              ["candidate", now],
            ]) as const) {
        const t = performance.now();
        await client.append(rows);
        if (i >= 50) lat[name].push(performance.now() - t);
      }
    }
    const p50Delta = q(lat.candidate, 0.5) - q(lat.baseline, 0.5),
      p99Ratio = q(lat.candidate, 0.99) / q(lat.baseline, 0.99),
      twinP99Ratio = q(lat.twin, 0.99) / q(lat.baseline, 0.99),
      twinP50Delta = q(lat.twin, 0.5) - q(lat.baseline, 0.5);
    const result = {
      diagnostic: true,
      commitsPerArm: 350,
      baseline: { p50: q(lat.baseline, 0.5), p99: q(lat.baseline, 0.99) },
      candidate: { p50: q(lat.candidate, 0.5), p99: q(lat.candidate, 0.99) },
      twin: { p50: q(lat.twin, 0.5), p99: q(lat.twin, 0.99) },
      p50Delta,
      p99Ratio,
      twinP50Delta,
      twinP99Ratio,
      latencies: lat,
    };
    fs.writeFileSync(path.join(base, "writer.json"), JSON.stringify(result));
    expect(p50Delta).toBeLessThanOrEqual(0.5);
    expect(p99Ratio).toBeLessThanOrEqual(1.1);
  } finally {
    await old.close();
    await twin.close();
    await now.close();
  }
}, 120000);
