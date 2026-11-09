// [CX-VQH1] Why: retain fresh command observations and exact source binding without adopting exits as semantic verdicts.
// Rejected: overwriting builder evidence or interpreting a setup failure as a semantic rejection.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error("label and command required");
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 << 20 }).trim();
const sha = (b) => createHash("sha256").update(b).digest("hex");
const sources = () =>
  Object.fromEntries(
    git(
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "packages",
      "lab",
      "pnpm-lock.yaml",
      "vitest.workspace-aliases.ts",
    )
      .split("\n")
      .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile())
      .map((f) => [f, sha(fs.readFileSync(f))]),
  );
const before = sources();
const dir = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQH1",
  label + "-" + randomUUID(),
);
fs.mkdirSync(dir, { recursive: true });
const reviewSources = path.join(dir, "review-sources");
fs.mkdirSync(reviewSources);
for (const f of ["review-run.mjs", "review-adversarial.test.ts", "review-evidence.mjs"]) {
  const p = path.join("lab/verify/QH1", f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(reviewSources, f));
}
const disk = fs.statfsSync(".");
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("below 5 GiB free");
const receipt = {
  label,
  command,
  dir,
  head: git("rev-parse", "HEAD"),
  tree: git("rev-parse", "HEAD^{tree}"),
  node: process.version,
  start: new Date().toISOString(),
  freeBytes: disk.bavail * disk.bsize,
  slot: null,
  inputs: before,
};
const fd = fs.openSync(path.join(dir, "command.log"), "wx");
const child = spawn(
  "node",
  ["lab/bin/heavy.mjs", "--label", "CX-VQH1-" + label, "--", ...command],
  {
    stdio: ["ignore", fd, fd],
    env: { ...process.env, QH1_RESULT: path.join(dir, "measurements.json") },
  },
);
const result = await new Promise((resolve) => {
  child.on("error", (e) => resolve({ error: String(e) }));
  child.on("close", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(receipt, {
  end: new Date().toISOString(),
  result,
  sourceStillMatches: JSON.stringify(before) === JSON.stringify(sources()),
  logSha256: sha(fs.readFileSync(path.join(dir, "command.log"))),
});
fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ label, dir, result, sourceStillMatches: receipt.sourceStillMatches }));
process.exitCode = result.code ?? 1;
