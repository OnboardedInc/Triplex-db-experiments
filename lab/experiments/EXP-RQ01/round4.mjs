// @ts-nocheck -- [EXP-CHECKJS-R2] Node overloads over dynamic option/result unions. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-RQ01] Why: bind merge compatibility to fresh output and exact main bytes.
// Rejected: a successful exit alone (does not prove byte identity or test count).
import fs from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { hashFiles, heavyAdmission, sameAdmission, sha } from "./attempt-io.mjs";
const attempt = process.argv[2];
if (!attempt || !/^[a-zA-Z0-9_-]+$/.test(attempt)) throw new Error("Unique attempt required");
const out = `lab/experiments/EXP-RQ01/evidence/${attempt}`;
fs.mkdirSync(out, { recursive: false });
const admission = heavyAdmission();
const main = process.argv[3];
if (!main || !/^[0-9a-f]{40}$/.test(main)) throw new Error("Exact merged-main commit required");
execFileSync("git", ["merge-base", "--is-ancestor", main, "HEAD"]);
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "lab/bin", "lab/acceptance"], { encoding: "utf8" })
  .trim()
  .split("\n");
files.push(
  import.meta.filename,
  "lab/experiments/EXP-RQ01/attempt-io.mjs",
  "packages/testkit/src/index.ts",
);
const before = hashFiles(files);
const artifacts = [
  "oracle-contract.json",
  "obligations.json",
  "load-contract.json",
  "budgets.json",
  "capability-matrix.md",
  "ACCEPTANCE.md",
].map((n) => `lab/acceptance/${n}`);
const identical = (files) =>
  files.every((f) =>
    fs
      .readFileSync(f)
      .equals(execFileSync("git", ["show", `${main}:${f}`], { maxBuffer: 32 * 1024 * 1024 })),
  );
const mainBytesMatch = identical([
  ...artifacts,
  "lab/acceptance/build_contract.py",
  "packages/testkit/src/index.ts",
]);
const results = [];
for (const [label, command] of [
  ["contract", ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--verify"]],
  [
    "evaluator",
    [
      "node",
      "--test",
      "--test-reporter=tap",
      "lab/bin/test/claim.test.mjs",
      "lab/bin/test/claim-round2.test.mjs",
    ],
  ],
]) {
  const started = Date.now();
  const r = spawnSync(command[0], command.slice(1), {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const log = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ?? ""}`;
  fs.writeFileSync(`${out}/${label}.log`, log, { flag: "wx" });
  const content =
    r.status === 0 &&
    (label === "contract"
      ? log.includes("second regeneration byte-identical (RULINGS Q34e)") &&
        artifacts.every((f) =>
          log.includes(`verify ${f.split("/").at(-1)}: ${sha(fs.readFileSync(f))}`),
        )
      : ["tests 108", "pass 108", "fail 0", "cancelled 0", "skipped 0", "todo 0"].every((s) =>
          new RegExp(`^# ${s}$`, "m").test(log),
        ));
  results.push({ label, command, started, status: r.status, content, logSha256: sha(log) });
}
const sourceStillMatches = JSON.stringify(before) === JSON.stringify(hashFiles(files));
const admissionStillMatches = sameAdmission(admission);
const receipt = {
  main,
  head,
  admission,
  admissionStillMatches,
  source: before,
  sourceStillMatches,
  mainBytesMatch,
  artifacts: hashFiles(artifacts),
  indexSha256: before["packages/testkit/src/index.ts"],
  results,
  passed:
    mainBytesMatch &&
    sourceStillMatches &&
    admissionStillMatches &&
    results.every((r) => r.content),
};
fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ out, passed: receipt.passed, mainBytesMatch, results }));
process.exitCode = receipt.passed ? 0 : 1;
