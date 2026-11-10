import fs from "node:fs";
import path from "node:path";
// [DX-H5] Why: stage sums overlap across workers; retain both stage demand and measured wall.
// Rejected: adding inclusive callback/read/queue intervals into fictitious exclusive wall time.
const root = process.argv[2];
const results = [];
for (const prefix of fs.readdirSync(root).filter((x) => x.startsWith("tx2-dxh5-"))) {
  const file = path.join(root, prefix, "driver", "receipt.json");
  if (!fs.existsSync(file)) continue;
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  const pages = r.sweep?.metrics ?? [];
  const totals = {};
  for (const p of pages)
    for (const [k, v] of Object.entries(p.timing))
      if (typeof v === "number") totals[k] = (totals[k] ?? 0) + v;
  const cpu = {};
  for (const p of pages)
    for (const [k, v] of Object.entries(p.cpu ?? {}))
      if (typeof v === "number") cpu[k] = (cpu[k] ?? 0) + v;
  results.push({
    prefix,
    status: r.status,
    error: r.error,
    N: r.N,
    seed: r.seed,
    restored: r.seedRestore,
    wallMs: r.sweep?.wallMs,
    subjectsPerS: r.sweep?.subjectsPerS,
    workers: new Set(pages.map((p) => p.worker)).size,
    pages: pages.length,
    coverage: r.gates?.G4,
    totals,
    cpu,
    cpuScope: pages[0]?.cpuScope,
    live: r.live,
    gates: r.gates,
  });
}
fs.writeFileSync(path.join(root, "summary.json"), JSON.stringify(results, null, 2) + "\n");
console.log(
  JSON.stringify(
    results.map(({ seed, ...r }) => ({
      ...r,
      seed: seed && {
        commands: seed.commands,
        wallMs: seed.wallMs,
        commandCommandsPerS: seed.commandCommandsPerS,
        countsWallMs: seed.countsWallMs,
      },
    })),
    null,
    2,
  ),
);
