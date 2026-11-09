// [EXP-QH1] Why: a rejected mutant needs a semantic mismatch, not merely a nonzero process exit.
// Rejected: adopting module/build/setup failures as evidence that the oracle caught a defect.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const dir = path.dirname(process.env.QH1_RESULT);
const observations = [];
for (const mutant of ["real", "owner", "retraction", "purge"]) {
  const out = path.join(dir, mutant);
  fs.mkdirSync(out);
  const result = spawnSync(
    "node_modules/.bin/vitest",
    ["run", "--config", "lab/verify/QH1/vitest.config.ts", "oreplay.test.ts"],
    {
      encoding: "utf8",
      maxBuffer: 4 * 1024 ** 2,
      env: {
        ...process.env,
        QH1_MUTANT: mutant,
        QH1_PULLS: "1000",
        QH1_RESULT: path.join(out, "measurements.json"),
      },
    },
  );
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(out, "command.log"), log);
  const mismatch =
    mutant === "purge" ? log.includes("promise resolved") : log.includes("AssertionError: sample ");
  const timingEmitted =
    log.includes("pullsPerCpuSecond") || fs.existsSync(path.join(out, "oreplay.json"));
  observations.push({ mutant, code: result.status, semanticRejection: mismatch, timingEmitted });
  if (result.status !== 1 || !mismatch || timingEmitted)
    throw Error("Mutant not semantically rejected: " + mutant);
}
fs.writeFileSync(process.env.QH1_RESULT, JSON.stringify({ observations }, null, 2));
