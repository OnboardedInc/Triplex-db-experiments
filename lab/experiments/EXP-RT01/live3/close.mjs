import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live3";
assert.ok(!fs.existsSync(path.join(out, "CLOSURE.json")));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const receiptBytes = fs.readFileSync(path.join(out, "RESULT.json"));
const receipt = JSON.parse(receiptBytes);
assert.equal(receipt.result, "NOT_RUN_DISK_FORECAST");
assert.equal(receipt.acquired, false);
// [EXP-RT01] Why: honor the requested post-stop trim and context restoration without acquiring or deleting resources. Rejected: removing retained volumes owned by other holders to make the trial fit.
const commands = [];
for (const [name, cmd, args] of [
  ["trim", "colima", ["ssh", "-p", "triplex2", "--", "sudo", "fstrim", "-av"]],
  ["restore-context", "docker", ["context", "use", "colima"]],
  ["final-context", "docker", ["context", "show"]],
]) {
  const started = new Date().toISOString();
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 60000 });
  fs.writeFileSync(path.join(out, `${name}.stdout`), r.stdout ?? "");
  fs.writeFileSync(path.join(out, `${name}.stderr`), r.stderr ?? "");
  commands.push({ name, cmd, args, started, ended: new Date().toISOString(), exit: r.status,
    error: r.error?.message ?? null, stdout: r.stdout ?? "", stderr: r.stderr ?? "" });
}
const closure = { receiptSha256: hash(receiptBytes), commands, resourcesAcquired: false,
  noRetry: true, gateResult: receipt.result };
fs.writeFileSync(path.join(out, "CLOSURE.json"), JSON.stringify(closure, null, 2) + "\n");
fs.copyFileSync(import.meta.filename, path.join(out, "close.mjs"));
const manifest = fs.readdirSync(out).filter((p) => p !== "SHA256SUMS").sort().map((p) =>
  `${hash(fs.readFileSync(path.join(out, p)))}  ${p}\n`).join("");
fs.writeFileSync(path.join(out, "SHA256SUMS"), manifest);
for (const line of manifest.trim().split("\n")) {
  const [expected, p] = line.split("  ");
  assert.equal(hash(fs.readFileSync(path.join(out, p))), expected);
}
for (const name of ["CLOSURE.json", "SHA256SUMS"])
  fs.copyFileSync(path.join(out, name), path.join(import.meta.dirname, name));
console.log(JSON.stringify(closure));
assert.ok(commands.every((c) => c.exit === 0), "requested maintenance failed; retain exact results");
assert.equal(commands.at(-1).stdout.trim(), "colima");
