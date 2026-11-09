import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../..");
const dir = path.join(import.meta.dirname, "evidence");
const suffix = process.argv[2] ?? "terminal";
const jobs = [
  [
    `unit-${suffix}`,
    process.execPath,
    ["lab/experiments/EXP-RT01/run-gates.mjs", `offline-${suffix}`],
  ],
  [`changed-pack-${suffix}`, process.execPath, ["lab/experiments/EXP-RT01/pack-changed.mjs"]],
  [
    `latency-${suffix}`,
    process.execPath,
    ["lab/experiments/EXP-RT01/run-microbench.mjs", "--adapter"],
  ],
  [
    `probes-${suffix}`,
    path.join(root, "node_modules/.bin/tsx"),
    ["lab/experiments/EXP-RT01/live-probes.ts"],
  ],
  [
    `declarations-${suffix}`,
    process.execPath,
    ["lab/experiments/EXP-RT01/declaration-diff.mjs", suffix],
  ],
  [`contract-${suffix}`, "python3", ["lab/acceptance/build_contract.py", "--verify"]],
];
const phases = [];
for (const [name, command, args] of jobs) {
  if (process.argv.includes("--after-unit") && name.startsWith("unit-")) continue;
  const started = new Date().toISOString();
  const r = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 ** 2,
    timeout: 360000,
  });
  await fs.writeFile(path.join(dir, `${name}.stdout`), r.stdout ?? "");
  await fs.writeFile(path.join(dir, `${name}.stderr`), r.stderr ?? "");
  phases.push({
    name,
    command,
    args,
    started,
    ended: new Date().toISOString(),
    exit: r.status,
    signal: r.signal,
    error: r.error?.message ?? null,
  });
  console.log(`${name}: ${r.status}`);
}
await fs.writeFile(path.join(dir, `${suffix}-phases.json`), JSON.stringify(phases, null, 2) + "\n");
// [EXP-RT01] Why: record every outcome, including expected pin drift; never reinterpret a nonzero gate as PASS.
process.exitCode = phases.some((phase) => phase.exit !== 0) ? 1 : 0;
