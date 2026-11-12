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
// [DX-S5] Why: verification may read an appended volume only with an explicit immutable cut and full candidate oracle.
// Rejected: silently enabling another publication or a mutable alternate entry point on that volume.
test("candidate verification rejects absent binding and every mutating option before engine access", async () => {
  const base = ["--rung", "100000", "--scope", "dxs5-w0-100000-v1", "--verify-candidates-at-seed"];
  const required = [
    "--seed-position",
    "4338757",
    "--seed-fingerprint",
    "--candidates",
    "--oracle-candidates",
  ];
  for (const omitted of [
    "--seed-position",
    "--seed-fingerprint",
    "--candidates",
    "--oracle-candidates",
  ]) {
    const args = required.filter(
      (value, i) => value !== omitted && !(omitted === "--seed-position" && i === 1),
    );
    await assert.rejects(
      runReplicaDriver([...base, ...args]),
      /invalid read-only candidate verification/,
    );
  }
  for (const flag of [
    "--publish",
    "--post-capture",
    "--live",
    "--seed",
    "--follow-commands",
    "--corpus",
    "--corpus-after",
    "--journal-fast-gate",
  ])
    await assert.rejects(
      runReplicaDriver([...base, ...required, flag]),
      /invalid read-only candidate verification/,
    );
});
