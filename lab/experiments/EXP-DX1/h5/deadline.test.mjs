import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
// [DX-H5] Why: a deadline guard must refuse an unrelated prefix before any Docker action or evidence write.
// Rejected: testing stop commands against a real shared or measurement container.
for (const prefix of ["tx2-xtdb-dev", "tx2-dxh5-no-such-current-lease"]) {
  test("deadline guard refuses " + prefix, () => {
    const output =
      "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/" + prefix + "/deadline-guard.json";
    assert.equal(fs.existsSync(output), false);
    const child = spawnSync(process.execPath, ["lab/experiments/EXP-DX1/h5/deadline.mjs", prefix], {
      encoding: "utf8",
      timeout: 3000,
    });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /owned prefix required|this attempt must own measurement lease/);
    assert.equal(fs.existsSync(output), false);
  });
}
