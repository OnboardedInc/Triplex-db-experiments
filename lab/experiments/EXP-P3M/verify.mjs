// [EXP-P3M] Why: each offline attempt retains raw outcomes bound to exact sources/builds and null slot.
// Rejected: a handwritten passed:true or overwriting an earlier failed attempt.
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const root = path.resolve(import.meta.dirname, "../../..");
const dir = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P3M", randomUUID());
fs.mkdirSync(dir, { recursive: true });
const tracked = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .stdout.trim()
  .split("\n")
  .filter((p) =>
    /^(lab\/(bench|bin|experiments\/EXP-P3M)\/|packages\/(host|core|testkit)\/|pnpm-lock.yaml$)/.test(
      p,
    ),
  );
const hashes = Object.fromEntries(
  tracked.map((p) => [p, sha(fs.readFileSync(path.join(root, p)))]),
);
const record = {
  format: "P3M-offline-gates/1",
  attempt: dir,
  slot: null,
  engines: false,
  hashes,
  steps: [],
};
const save = () =>
  fs.writeFileSync(path.join(dir, "attempt.json"), JSON.stringify(record, null, 2));
save();
const steps = ["core", "host", "testkit"].map((pkg) => [
  `build-${pkg}`,
  `packages/${pkg}`,
  "../../node_modules/.bin/tsdown",
  [],
]);
steps.push([
  "host-declarations",
  "packages/host",
  "../../node_modules/.bin/tsc",
  ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"],
]);
steps.push([
  "p3-tests",
  ".",
  process.execPath,
  ["--test", "--test-reporter=tap", "lab/bench/test/p3.test.mjs"],
]);
let failed = false;
for (const [name, cwd, cmd, args] of steps) {
  const result = spawnSync(cmd, args, {
    cwd: path.join(root, cwd),
    env: { ...process.env, P3M_EVIDENCE: path.join(dir, "fixtures") },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const raw = result.stdout + "\n" + result.stderr;
  fs.writeFileSync(path.join(dir, name + ".log"), raw);
  record.steps.push({ name, cmd, args, cwd, status: result.status, sha256: sha(raw) });
  save();
  console.log(name, result.status);
  if (result.status !== 0) {
    console.log(raw.slice(-8000));
    failed = true;
    break;
  }
}
record.sourceUnchanged = Object.entries(hashes).every(
  ([p, h]) => sha(fs.readFileSync(path.join(root, p))) === h,
);
record.success = !failed && record.sourceUnchanged;
save();
console.log(JSON.stringify({ dir, success: record.success }));
process.exitCode = record.success ? 0 : 1;
