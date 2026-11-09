// [EXP-P5-R3] Why: bind this execution to all bench/oracle/build bytes and fresh outputs. Rejected: adopting historical TAP or process-zero as semantic qualification.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const dir = process.argv[2];
if (!dir || fs.existsSync(dir)) throw Error("fresh attempt directory required");
fs.mkdirSync(dir, { recursive: true });
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(p, e.name)) : e.isFile() ? [path.join(p, e.name)] : [],
    );
const files = [
  ...walk("lab/bench").filter((p) => /\.(ts|py|mjs)$/.test(p)),
  ...walk("lab/oracles/replay").filter((p) => p.endsWith(".py")),
  ...walk("lab/oracles/domain").filter((p) => p.endsWith(".py")),
  ...walk("packages/w0/dist").filter((p) => p.endsWith(".js")),
  ...walk("packages/core/dist").filter((p) => p.endsWith(".js")),
  ...walk("packages/xtdb/src").filter((p) => p.endsWith(".ts")),
  "pnpm-lock.yaml",
  "lab/acceptance/obligations.json",
  ...walk("lab/experiments/EXP-P5").filter((p) => /round3.*\.(ts|mjs)$/.test(p)),
];
const sources = Object.fromEntries(files.map((p) => [p, hash(p)]));
const jobs = [];
const execute = (label, args) => {
  const stat = fs.statfsSync(".");
  if (stat.bavail * stat.bsize < 5 * 1024 ** 3) throw Error("disk below 5 GiB");
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 32 << 20 });
  const log = path.join(dir, label + ".log");
  fs.writeFileSync(log, (result.stdout ?? "") + (result.stderr ?? ""));
  jobs.push({ label, args, exit: result.status, signal: result.signal, log, sha256: hash(log) });
  if (result.status !== 0) throw Error(label + " failed");
};
let status = "FAIL",
  error;
try {
  const tests = fs
    .readdirSync("lab/bench/test")
    .filter((f) => /^(g0.*|p5.*)\.test\.ts$/.test(f))
    .map((f) => "lab/bench/test/" + f);
  execute("tests", ["--experimental-strip-types", "--test", ...tests]);
  execute("g6", ["lab/bench/run-rq01-stack.mjs", "d5cd32e6829100c0d9968ddb83713525e1510b3a"]);
  execute("integration", [
    "--experimental-strip-types",
    "lab/experiments/EXP-P5/round3-integration.ts",
    path.join(dir, "integration"),
  ]);
  execute("raw-audit", [
    "--experimental-strip-types",
    "lab/bench/audit-traffic.ts",
    path.join(dir, "integration/receipt.json"),
    path.join(dir, "raw-audit.json"),
  ]);
  if (!Object.entries(sources).every(([p, h]) => hash(p) === h))
    throw Error("source changed during attempt");
  status = "OFFLINE-CHECKS-COMPLETE";
} catch (e) {
  error = String(e);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(dir, "execution.json"),
    JSON.stringify(
      {
        status,
        classification: "DIAGNOSTIC",
        acceptance: false,
        node: process.version,
        sources,
        jobs,
        error,
      },
      null,
      2,
    ),
  );
  const evidenceRoot = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5A";
  fs.writeFileSync(
    path.join(dir, "SHA256SUMS"),
    walk(evidenceRoot)
      .sort()
      .map((p) => hash(p) + "  " + p)
      .join("\n") + "\n",
  );
}
