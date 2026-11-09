// [EXP-P2B-R3] Why: a native ENOTSUP must cross the worker boundary as a typed startup refusal before any receipt.
// Rejected: testing only the helper while startup accidentally swallows its error and continues.
import { expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
vi.mock("../src/full-fsync.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/full-fsync.js")>();
  return {
    ...actual,
    fullFsyncProbeSource:
      "throw Error('FULL_FSYNC_UNAVAILABLE: injected unsupported native volume')",
  };
});
import { HostBroker } from "../src/broker.js";
it("default open refuses a failing native capability probe and creates no ACK witness", async () => {
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID());
  await expect(
    HostBroker.open({ dir, scopeKey: "refusal", autoApply: false, minFreeBytes: 5 * 1024 ** 3 }),
  ).rejects.toMatchObject({ _tag: "FullFsyncUnavailable", reason: "full-fsync-unavailable" });
  expect(fs.existsSync(path.join(dir, "ACKED"))).toBe(false);
  for (const value of [null, 0, "false"]) {
    const other = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID());
    await expect(
      HostBroker.open({
        dir: other,
        scopeKey: "invalid-opt-out",
        requireFullFsync: value as never,
        autoApply: false,
        minFreeBytes: 5 * 1024 ** 3,
      }),
    ).rejects.toMatchObject({ _tag: "FullFsyncUnavailable" });
    expect(fs.existsSync(path.join(other, "ACKED"))).toBe(false);
  }
  const explicit = await HostBroker.open({
    dir,
    scopeKey: "diagnostic-opt-out",
    requireFullFsync: false,
    autoApply: false,
    minFreeBytes: 5 * 1024 ** 3,
  });
  try {
    expect(explicit.stats().fullFsyncProof).toBeUndefined();
    expect(explicit.stats().commits).toBe(0);
  } finally {
    await explicit.close();
  }
});
