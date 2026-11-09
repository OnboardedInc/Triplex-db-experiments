import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../..");
const dir = path.join(import.meta.dirname, "evidence");
const jobs = [
  [
    "unit-terminal",
    process.execPath,
    ["lab/experiments/EXP-RT01/run-gates.mjs", "offline-final-source"],
  ],
  ["changed-pack", process.execPath, ["lab/experiments/EXP-RT01/pack-changed.mjs"]],
  [
    "latency-terminal",
    process.execPath,
    ["lab/experiments/EXP-RT01/run-microbench.mjs", "--adapter"],
  ],
  [
    "probes-terminal",
    path.join(root, "node_modules/.bin/tsx"),
    ["lab/experiments/EXP-RT01/live-probes.ts"],
  ],
  [
    "declarations-terminal",
    process.execPath,
    ["lab/experiments/EXP-RT01/declaration-diff.mjs", "terminal"],
  ],
  ["contract-terminal", "python3", ["lab/acceptance/build_contract.py", "--verify"]],
];
const phases = [];
for (const [name, command, args] of jobs) {
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
await fs.writeFile(path.join(dir, "terminal-phases.json"), JSON.stringify(phases, null, 2) + "\n");
// [EXP-RT01] Why: record every outcome, including expected pin drift; never reinterpret a nonzero gate as PASS.
process.exitCode = phases.some((phase) => phase.exit !== 0) ? 1 : 0;
