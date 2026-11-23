import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

test("first-offer dry run admits a launcher at its first offer and names the failing line of another", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dx-int1-first-offer-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.resolve(import.meta.dirname, "../../../..");
  const held = path.join(root, "held");
  fs.mkdirSync(held);
  const node = `"${process.execPath}" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/ha1/dry-run/fixture-launcher.ts`;
  const queue = path.join(root, "queue.txt");
  fs.writeFileSync(queue, `# fixture queue\nadmit ${node} admit\nrefuse ${node} refuse\nheld test -d "$HELD" && ${node} admit\n`);
  const run = spawnSync("bash", ["lab/experiments/EXP-DX1/ha1/launch-dry-run.sh", "--to-first-offer", queue, held, path.join(root, "logs")],
    { cwd: repo, encoding: "utf8" });
  assert.equal(run.status, 1, run.stdout + run.stderr);
  const lines = run.stdout.trim().split("\n");
  assert.match(lines[0]!, /^ADMITTED admit \(stopped before its first offer at lab\/experiments\/EXP-DX1\/ha1\/dry-run\/fixture-launcher\.ts:9\)$/);
  assert.match(lines[1]!, /^REFUSED refuse lab\/experiments\/EXP-DX1\/ha1\/dry-run\/fixture-launcher\.ts:8 AssertionError \[ERR_ASSERTION\]: Held copy differs/);
  assert.match(lines[2]!, /^ADMITTED held /);
  assert.equal(lines[3], "3 launchers, 1 refused");
  for (const name of ["admit", "refuse"]) {
    const log = fs.readFileSync(path.join(root, "logs", name + ".log"), "utf8");
    assert.match(log, /CLEANUP true/);
    assert.doesNotMatch(log, /OFFERED/);
  }
});
