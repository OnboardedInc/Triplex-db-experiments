import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cpuCount, recoveryOptions, recoveryOptionsOn } from "./recovery-options.ts";
import { coldCopy, coldCopyPipelined, coldPhases } from "./sunday-seed.ts";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("DX-HA2 recovery options", () => {
  it("leave the default cold copy byte-identical to b03e806fd", () => {
    expect(coldCopy.length).toBe(1994);
    expect(sha256(coldCopy)).toBe("64138b36679adb128739d7b7d4318921df0145603d52ffbe00b0b3f68ca3e403");
  });
  it("are off when unset", () => {
    const o = recoveryOptions({});
    expect(o).toEqual({ coldPipeline: false });
    expect(recoveryOptionsOn(o)).toBe(false);
  });
  it("read cores and pipeline", () => {
    expect(recoveryOptions({ TX2_HA2_COLD_CORES: "0-11", TX2_HA2_COLD_PIPELINE: "1" })).toEqual({
      coldCores: "0-11",
      coldPipeline: true,
    });
    expect(cpuCount("0-11")).toBe(12);
    expect(cpuCount("0,2,4-7")).toBe(6);
    expect(cpuCount("1-1,1")).toBe(1);
  });
  it("refuse malformed values", () => {
    expect(() => recoveryOptions({ TX2_HA2_COLD_PIPELINE: "yes" })).toThrow();
    expect(() => recoveryOptions({ TX2_HA2_COLD_CORES: "1" })).toThrow(/at least two/);
    expect(() => recoveryOptions({ TX2_HA2_COLD_CORES: "0-11;rm" })).toThrow();
    expect(() => cpuCount("7-3")).toThrow();
  });
  it("keep every check of the serial copy in the pipelined copy", () => {
    const [head] = coldCopy.split('  awk -v n="$COLD_WORKERS"');
    const tail = coldCopy.slice(coldCopy.indexOf('  chown -R postgres:postgres "$PGDATA"'));
    expect(coldCopyPipelined.startsWith(head!)).toBe(true);
    expect(coldCopyPipelined.endsWith(tail)).toBe(true);
    // Every destination file against its manifest digest, then the file count.
    expect(coldCopyPipelined).toContain('got=$(dd if="$PGDATA/$f" iflag=direct bs=1M 2>/dev/null | sha256sum)');
    expect(coldCopyPipelined).toContain('test "${got%% *}" = "$want"');
    expect(coldCopyPipelined).toContain('test "$(find . -type f | wc -l)" -eq "$(wc -l < /cold/SHA256SUMS)"');
  });
  it("parse both phase reports", () => {
    expect(coldPhases("cold-phases copy-ms=10 hash-ms=20 kib=4 workers=8\n")).toEqual({
      copyMs: 10,
      hashMs: 20,
      bytes: 4096,
      workers: 8,
    });
    expect(
      coldPhases("cold-phases copy-ms=30 hash-ms=0 kib=4 workers=8\ncold-pipelined copy-and-check-ms=30\n"),
    ).toEqual({ copyMs: 30, hashMs: 0, bytes: 4096, workers: 8, pipelined: true });
  });
});
