import test from "node:test";
import assert from "node:assert/strict";
import { runReplicaDriver } from "../../../bench/lib/w0-replica-driver.ts";
// [DX-S5] Why: malformed first-use pin arguments must fail before opening an engine connection.
// Rejected: treating an absent value as an unpinned evaluation of the latest head.
test("invalid explicit sealed positions fail before accessing the database", async () => {
  for (const tail of [[], ["0"], ["-1"], ["NaN"], ["--publish"]])
    await assert.rejects(
      runReplicaDriver([
        "--rung",
        "100000",
        "--scope",
        "dxs5-w0-100000-v1",
        "--seed-position",
        ...tail,
      ]),
      /invalid sealed seed position/,
    );
});
