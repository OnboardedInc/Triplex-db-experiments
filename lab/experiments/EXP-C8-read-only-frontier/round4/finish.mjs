import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
// [EXP-C8-R4] Why: retain command exits for final read-only profiles and source binding.
// Rejected: interpreting a measurement runner's exit as live-control acceptance.
const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
const results = [];
for (const [name, args] of [
  ["profile-paired", [`${out}/profile-paired.mjs`]],
  [
    "host-rounds",
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      `${out}/vitest.config.ts`,
      `${out}/host-rounds.test.ts`,
    ],
  ],
  ["audit", [`${out}/audit.mjs`]],
]) {
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 16 * 1024 ** 2 });
  writeFileSync(`${out}/${name}.log`, result.stdout + result.stderr);
  results.push({
    name,
    command: [process.execPath, ...args],
    cwd: process.cwd(),
    started,
    finished: new Date().toISOString(),
    status: result.status,
    signal: result.signal,
  });
  writeFileSync(`${out}/finish-results.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(name, result.status, (result.stdout + result.stderr).slice(-1000));
}
process.exitCode = results.some((r) => r.status !== 0) ? 1 : 0;
