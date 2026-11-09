// [CX-VINTQ] Why: preserve exact fresh runs and source bindings without inferring semantic success from exit status. Rejected: reusing builder logs as fresh review.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
const [label, ...argv] = process.argv.slice(2);
const root = path.resolve("lab/verify/INT-Q/output", label + "-" + randomUUID());
fs.mkdirSync(root, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const inputs = () =>
  Object.fromEntries(
    execFileSync("git", ["ls-files", "-z"], { maxBuffer: 20e6 })
      .toString()
      .split("\0")
      .concat(
        fs
          .readdirSync("lab/verify/INT-Q")
          .filter((f) => /\.(mjs|py|ts)$/.test(f))
          .map((f) => "lab/verify/INT-Q/" + f),
      )
      .sort()
      .filter((f) => f && fs.existsSync(f) && fs.statSync(f).isFile())
      .map((f) => [f, hash(fs.readFileSync(f))]),
  );
const before = inputs();
const disk = fs.statfsSync(".");
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("disk below 5GiB");
const record = {
  label,
  argv,
  head: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  start: new Date().toISOString(),
  node: process.version,
  source: before,
  runnerSha256: hash(fs.readFileSync(import.meta.filename)),
  endpoint: process.env.QLEVER_URL ?? null,
  freeBytes: disk.bavail * disk.bsize,
  env: Object.fromEntries(
    ["QLEVER_URL", "QLEVER_INTEGRATION", "DOCKER_HOST", "SQL01_ATTEMPT", "V_P2Q_OUT"].map((k) => [
      k,
      process.env[k] ?? null,
    ]),
  ),
};
const fd = fs.openSync(path.join(root, "command.log"), "wx");
const child = spawn(
  process.execPath,
  ["lab/bin/heavy.mjs", "--label", "CX-VINTQ-" + label, "--", ...argv],
  { stdio: ["ignore", fd, fd] },
);
const result = await new Promise((resolve) => {
  child.on("error", (error) => resolve({ error: String(error) }));
  child.on("close", (code, signal) => resolve({ code, signal }));
});
fs.closeSync(fd);
Object.assign(record, {
  end: new Date().toISOString(),
  result,
  sourceUnchanged: JSON.stringify(before) === JSON.stringify(inputs()),
  logSha256: hash(fs.readFileSync(path.join(root, "command.log"))),
});
fs.writeFileSync(path.join(root, "receipt.json"), JSON.stringify(record, null, 2) + "\n");
console.log(JSON.stringify({ root, result, sourceUnchanged: record.sourceUnchanged }));
process.exitCode = result.code ?? 1;
