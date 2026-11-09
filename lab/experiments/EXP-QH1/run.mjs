// [EXP-QH1] Why: retain attempts, exact inputs and raw exit evidence; no exit-only semantic PASS.
// Rejected: overwriting receipts or adopting historical test counts.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error("usage: run.mjs label command...");
const dir = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1",
  label + "-" + randomUUID(),
);
fs.mkdirSync(dir, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const inputs = () =>
  Object.fromEntries(
    execFileSync(
      "git",
      [
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "packages",
        "lab/bin",
        "lab/oracles/replay",
        "lab/acceptance",
        "lab/verify/QH1",
        "lab/bench",
        "lab/verify/SQL01",
        "lab/verify/P2Q",
        "lab/experiments/EXP-QH1",
        "pnpm-lock.yaml",
        "vitest.workspace-aliases.ts",
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(
        (f) =>
          !f.includes("/evidence/") &&
          !f.includes("/data/") &&
          !f.endsWith("REPORT.md") &&
          !f.endsWith("SHA256SUMS") &&
          !f.endsWith("pin-changes.json") &&
          !f.endsWith("evidence-index.json") &&
          fs.existsSync(f) &&
          fs.statSync(f).isFile(),
      )
      .sort()
      .map((f) => [f, sha(fs.readFileSync(f))]),
  );
const before = inputs(),
  disk = fs.statfsSync(".");
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("Host free space below 5 GiB");
const objects = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1",
  "source-objects",
);
fs.mkdirSync(objects, { recursive: true });
for (const [file, hash] of Object.entries(before)) {
  const dest = path.join(objects, hash);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, fs.readFileSync(file), { flag: "wx" });
  if (sha(fs.readFileSync(dest)) !== hash) throw Error("Source preimage mismatch");
}
const receipt = {
  sourceObjects: objects,
  label,
  command,
  dir,
  start: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  node: process.version,
  inputs: before,
  freeBytes: disk.bavail * disk.bsize,
  slot: null,
};
const fd = fs.openSync(path.join(dir, "command.log"), "wx");
const child = spawn(command[0], command.slice(1), {
  env: {
    ...process.env,
    npm_config_store_dir: "/Users/sam/projects/triplex-db-2/.pnpm-store",
    QH1_RESULT: path.join(dir, "measurements.json"),
    V_P2Q_OUT: path.join(dir, "p2q"),
    SQL01_ATTEMPT: label,
  },
  stdio: ["ignore", fd, fd],
});
const result = await new Promise((resolve) => {
  child.on("error", (error) => resolve({ error: String(error) }));
  child.on("close", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(receipt, {
  end: new Date().toISOString(),
  result,
  sourceStillMatches: JSON.stringify(before) === JSON.stringify(inputs()),
  logSha256: sha(fs.readFileSync(path.join(dir, "command.log"))),
});
fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", {
  flag: "wx",
});
console.log(JSON.stringify({ label, dir, result, sourceStillMatches: receipt.sourceStillMatches }));
process.exitCode = result.code ?? 1;
