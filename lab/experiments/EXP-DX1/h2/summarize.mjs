import fs from "node:fs";
const receipts = process.argv
  .slice(2)
  .map((p) => ({ path: p, ...JSON.parse(fs.readFileSync(p, "utf8")) }));
for (const r of receipts) {
  console.log(
    JSON.stringify(
      {
        path: r.path,
        N: r.N,
        status: r.status,
        error: r.error ?? null,
        seed: r.seed && {
          wallMs: r.seed.wallMs,
          commands: r.seed.commands,
          commandsPerS: r.seed.commandsPerS,
        },
        workers: r.sweep?.metrics?.length
          ? new Set(r.sweep.metrics.map((m) => m.worker)).size
          : null,
        sweepWallMs: r.sweep?.wallMs,
        subjectsPerS: r.sweep?.subjectsPerS,
        totals: r.sweep?.totals,
        live: r.live,
        gates: r.gates,
        holds: r.measurementHolds,
      },
      null,
      2,
    ),
  );
}
