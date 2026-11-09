// [CX-VHS01] Why: retain fresh observations and source bindings, including failed attempts. Rejected: an exit code described as semantic acceptance.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error("label command required");
const dir = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01",
  label + "-" + randomUUID(),
);
fs.mkdirSync(dir, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const files = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "packages",
    "lab/verify/HS01",
    "lab/bin",
    "pnpm-lock.yaml",
    "vitest.workspace-aliases.ts",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
const hashes = () => Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(f))]));
const before = hashes(),
  stat = fs.statfsSync(".");
if (stat.bavail * stat.bsize < 5 * 1024 ** 3) throw Error("below disk floor");
const receipt = {
  attempt: dir,
  label,
  command,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  start: new Date().toISOString(),
  node: process.version,
  source: before,
  freeBytes: stat.bavail * stat.bsize,
  engineSlot: null,
  mode: "offline",
};
fs.writeFileSync(path.join(dir, "start.json"), JSON.stringify(receipt, null, 2));
const fd = fs.openSync(path.join(dir, "command.log"), "wx");
const child = spawn(command[0], command.slice(1), {
  env: { ...process.env, VHS01_OUT: dir },
  stdio: ["ignore", fd, fd],
});
const result = await new Promise((resolve) => {
  child.on("error", (e) => resolve({ error: String(e) }));
  child.on("close", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(receipt, {
  result,
  end: new Date().toISOString(),
  sourceUnchanged: JSON.stringify(before) === JSON.stringify(hashes()),
  logSha256: sha(fs.readFileSync(path.join(dir, "command.log"))),
});
fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ dir, result, sourceUnchanged: receipt.sourceUnchanged }));
process.exitCode = result.code ?? 1;
