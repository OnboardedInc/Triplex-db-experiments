// [EXP-P4N] Why (step c'): stale-document mutants must fail the document tests semantically (a document served although the store has moved on),
// not by crashing. Each child runs docs.test.ts with one guard removed; it must exit 1, print the P4N_DOC_MISMATCH marker, and emit no timing.
// Rejected: counting any nonzero exit as a rejection (a build or pattern failure would pass).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const out = process.env.QH1_RESULT ? path.dirname(process.env.QH1_RESULT) : "runs/P4N-mutants";
fs.mkdirSync(out, { recursive: true });
const observations = [];
for (const mutant of ["nocheck", "fillpast", "erz"]) {
  const result = spawnSync(
    "node_modules/.bin/vitest",
    ["run", "--config", "lab/verify/QH1/vitest.config.ts", "docs.test.ts"],
    {
      encoding: "utf8",
      maxBuffer: 8 * 1024 ** 2,
      env: {
        ...process.env,
        P4N_MUTANT: mutant,
        P4N_COMMANDS: "600",
        QH1_RESULT: path.join(out, mutant + ".json"),
      },
    },
  );
  const log = result.stdout + result.stderr;
  fs.writeFileSync(path.join(out, mutant + ".log"), log);
  const semantic = log.includes("P4N_DOC_MISMATCH"),
    patternFailure = log.includes("mutant pattern absent");
  observations.push({ mutant, code: result.status, semanticRejection: semantic, patternFailure });
  if (result.status !== 1 || !semantic || patternFailure)
    throw Error("Mutant not semantically rejected: " + mutant);
}
fs.writeFileSync(path.join(out, "docs-mutants.json"), JSON.stringify({ observations }, null, 2));
console.log(JSON.stringify({ observations }));
