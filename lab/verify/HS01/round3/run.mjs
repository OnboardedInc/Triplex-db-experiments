// [CX-VHS01-R3] Why: bind each fresh offline attempt to the frozen product and retain failures. Rejected: counting an exit code as a semantic PASS.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
const [label, ...command] = process.argv.slice(2);
if (!label || !command.length) throw Error("label command required");
if (execFileSync("git", ["diff", "afafa7aa", "--", "packages"], { encoding: "utf8" }))
  throw Error("not the frozen round 3 product");
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01/round3",
  dir = path.join(root, label + "-" + randomUUID());
const stat = fs.statfsSync(".");
if (stat.bavail * stat.bsize < 5 * 1024 ** 3) throw Error("disk floor");
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
    "lab/bench/hs01-seed.ts",
    "lab/experiments/EXP-HS01",
    "lab/acceptance",
    "pnpm-lock.yaml",
    "vitest.workspace-aliases.ts",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
const hashes = () => Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(f))]));
const artifacts = () =>
  Object.fromEntries(
    ["core", "qlever", "testkit", "w0"]
      .flatMap((p) => {
        const d = "packages/" + p + "/dist";
        return fs.existsSync(d)
          ? fs
              .readdirSync(d, { recursive: true })
              .map(String)
              .map((f) => path.join(d, f))
              .filter((f) => fs.statSync(f).isFile())
          : [];
      })
      .sort()
      .map((f) => [f, sha(fs.readFileSync(f))]),
  );
const req = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url)),
  entry = req.resolve("better-sqlite3"),
  native = path.resolve(path.dirname(entry), "../build/Release/better_sqlite3.node");
const before = hashes(),
  receipt = {
    label,
    command,
    dir,
    start: new Date().toISOString(),
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    product: "afafa7aa",
    source: before,
    artifactsBefore: artifacts(),
    node: process.version,
    driverVersion: req("better-sqlite3/package.json").version,
    nativeSha256: sha(fs.readFileSync(native)),
    freeBytes: stat.bavail * stat.bsize,
    offline: true,
    engineSlot: null,
  };
fs.writeFileSync(path.join(dir, "start.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
const fd = fs.openSync(path.join(dir, "command.log"), "wx");
const child = spawn(command[0], command.slice(1), {
  env: {
    ...process.env,
    QLEVER_INTEGRATION: "0",
    VHS01_OUT: dir,
    HS01_RESULT: path.join(dir, "measurements.json"),
  },
  stdio: ["ignore", fd, fd],
});
const result = await new Promise((resolve) => {
  child.once("error", (error) => resolve({ error: String(error) }));
  child.once("close", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(receipt, {
  end: new Date().toISOString(),
  result,
  sourceUnchanged: JSON.stringify(before) === JSON.stringify(hashes()),
  artifactsAfter: artifacts(),
  logSha256: sha(fs.readFileSync(path.join(dir, "command.log"))),
});
fs.writeFileSync(path.join(dir, "receipt.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
console.log(JSON.stringify({ dir, result, sourceUnchanged: receipt.sourceUnchanged }));
process.exitCode = result.code ?? 1;
