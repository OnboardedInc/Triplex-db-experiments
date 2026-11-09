// [EXP-P2B-R3] Why: startup must test the actual native primitive and bind its proof to this DB file.
// Rejected: treating a fast or slow calibration as evidence of support, or reusing an old proof.
import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { HostBroker } from "../src/broker.js";
import { probeFullFsync, FullFsyncUnavailable, fullFsyncProbeSource } from "../src/full-fsync.js";
it("unsupported native target refuses typed instead of falling back", () => {
  expect(() => probeFullFsync("/dev/null")).toThrow(FullFsyncUnavailable);
  try {
    probeFullFsync("/dev/null");
  } catch (e) {
    expect(e).toMatchObject({ _tag: "FullFsyncUnavailable", reason: "full-fsync-unavailable" });
  }
});
it.runIf(process.platform === "darwin")(
  "default open records a fresh file-bound F_FULLFSYNC proof",
  async () => {
    const before = Date.now(),
      broker = await HostBroker.open({
        dir: path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
        scopeKey: "native-proof",
        autoApply: false,
        minFreeBytes: 5 * 1024 ** 3,
      });
    try {
      const proof = broker.stats().fullFsyncProof!,
        st = fs.statSync(broker.segmentPath, { bigint: true });
      expect(proof.primitive).toBe("F_FULLFSYNC");
      expect(proof.dev).toBe(String(st.dev));
      expect(proof.ino).toBe(String(st.ino));
      expect(proof.at).toBeGreaterThanOrEqual(before);
      expect(proof.at).toBeLessThanOrEqual(Date.now());
    } finally {
      await broker.close();
    }
  },
);
it("the exact startup probe rejects a mismatched native result even with exit zero", () => {
  const fakeRequire = (name: string) =>
    name === "node:fs"
      ? { statSync: () => ({ dev: 1n, ino: 2n }) }
      : {
          spawnSync: () => ({
            status: 0,
            stdout: JSON.stringify({ primitive: "F_FULLFSYNC", dev: "1", ino: "999" }),
          }),
        };
  if (process.platform === "darwin")
    expect(() =>
      Function("file", "require", fullFsyncProbeSource)("this-file", fakeRequire),
    ).toThrow("file identity mismatch");
});
