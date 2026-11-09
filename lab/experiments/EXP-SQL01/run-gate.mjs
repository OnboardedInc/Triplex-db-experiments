// [EXP-SQL01] Why: bind each fresh command and outcome to actual source/dependency bytes.
// Rejected: treating a suite's exit code as either a source identity or independent acceptance.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [label, ...command] = process.argv.slice(2);
const out = path.resolve("lab/experiments/EXP-SQL01/evidence/final");
fs.mkdirSync(out, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const inputs = () => {
  const names = execFileSync(
    "rg",
    [
      "--files",
      "packages/qlever/src",
      "packages/qlever/test",
      "lab/verify/P2Q",
      "lab/experiments/EXP-SQL01",
      "-g",
      "*.ts",
      "-g",
      "*.mjs",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .concat(["packages/qlever/package.json", "pnpm-lock.yaml"]);
  return Object.fromEntries(names.sort().map((f) => [f, hash(fs.readFileSync(f))]));
};
const before = inputs();
const receipt = {
  label,
  command,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  status: execFileSync("git", ["status", "--short"], { encoding: "utf8" }),
  source: before,
  start: new Date().toISOString(),
  node: process.version,
  env: Object.fromEntries(
    Object.entries(process.env).filter(([k]) => /^(QLEVER_|V_P2Q_|SQL01_)/.test(k)),
  ),
  disk: execFileSync("df", ["-k", "."], { encoding: "utf8" }),
};
const log = path.join(out, label + ".log"),
  fd = fs.openSync(log, "w");
const child = spawn(
  process.execPath,
  ["lab/bin/heavy.mjs", "--label", "CX-SQL01-" + label, "--", ...command],
  { stdio: ["ignore", fd, fd] },
);
const result = await new Promise((resolve) => {
  child.once("error", (e) => resolve({ error: String(e) }));
  child.once("exit", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(receipt, {
  end: new Date().toISOString(),
  result,
  sourceStillMatches: JSON.stringify(before) === JSON.stringify(inputs()),
  logSha256: hash(fs.readFileSync(log)),
});
fs.writeFileSync(path.join(out, label + ".json"), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ label, ...result, sourceStillMatches: receipt.sourceStillMatches }));
process.exitCode = result.code ?? 1;
