// [CX-VNSR-R3] Why: source controls and guarded parity need the current host build. Rejected: using the old round-2 storage dist or unrestricted source execution as evidence.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const steps = [
  { cwd: "packages/host", binary: "tsdown", args: [] },
  {
    cwd: "packages/host",
    binary: "tsc",
    args: ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"],
  },
  {
    cwd: ".",
    binary: "vitest",
    args: ["run", "--config", "lab/verify/NSR/round3/reviewer-vitest.config.ts"],
  },
  {
    cwd: ".",
    binary: "node",
    args: ["--test", "lab/bench/test/nsr.test.mjs", "lab/bench/test/p3.test.mjs"],
  },
];
const results = [];
for (const [i, step] of steps.entries()) {
  const command =
    step.binary === "node" ? process.execPath : path.join(root, "node_modules/.bin", step.binary);
  const out = spawnSync(command, step.args, {
    cwd: path.resolve(step.cwd),
    encoding: "utf8",
    env: {
      ...process.env,
      NSR_EVIDENCE: path.resolve(".cache/verify-nsr-r3/nsr-fresh"),
      P3M_EVIDENCE: path.resolve(".cache/verify-nsr-r3/p3m-fresh"),
      NSR_R3_EVIDENCE: path.resolve(".cache/verify-nsr-r3/source-observations"),
    },
  });
  fs.writeFileSync(path.resolve(`.cache/verify-nsr-r3/step-${i}.stdout`), out.stdout ?? "");
  fs.writeFileSync(path.resolve(`.cache/verify-nsr-r3/step-${i}.stderr`), out.stderr ?? "");
  results.push({ step, exit: out.status });
  console.log(JSON.stringify(results.at(-1)));
  assert.equal(out.status, 0, out.stderr + "\n" + out.stdout);
}
fs.writeFileSync(
  path.resolve(".cache/verify-nsr-r3/check-results.json"),
  JSON.stringify(results, null, 2),
);
