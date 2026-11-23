import { describe, expect, it } from "vitest";
import { catchUp } from "./catch-up.ts";
import { readConfig } from "./sunday-config.ts";

const at = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(1, "0");
const position = (bytes: number) => "0/" + at(bytes);
const fast = { graceMs: 60, pollMs: 10, slackMs: 50, capMs: 2000 };

describe("measured standby catch-up", () => {
  it("returns at once when the standby is level", async () => {
    const r = await catchUp("level", async () => position(500), async () => position(500), fast);
    expect(r.startLagBytes).toBe(0);
    expect(r.samples).toBe(1);
  });

  it("catches up when it applies faster than the primary writes", async () => {
    let p = 1_000_000;
    let s = 0;
    const r = await catchUp(
      "closing",
      async () => position((p += 1000)),
      async () => position((s = Math.min(p, s + 60_000))),
      fast,
    );
    expect(r.appliedBytes).toBeGreaterThan(r.primaryBytes);
    expect(r.startLagBytes).toBeGreaterThan(900_000);
  });

  it("fails with the lag and both rates when the standby cannot close the gap", async () => {
    let p = 50_000_000;
    let s = 0;
    await expect(
      catchUp(
        "stuck standby",
        async () => position((p += 200_000)),
        async () => position((s += 1_000)),
        fast,
      ),
    ).rejects.toThrow(
      /^stuck standby: Standby cannot catch up: it applies WAL no faster than the primary writes it\. The standby is [\d.]+ MB behind after \d+ s \(it started [\d.]+ MB behind\); it applied [\d.]+ MB\/s while the primary wrote [\d.]+ MB\/s$/,
    );
  });
});

describe("pair repair config", () => {
  const base = {
    tag: "p9-pair-1123b",
    commit: "8ab8320936b646eb5f18fa893966137ad768fc40",
    root: "/var/tmp/p9",
    buildReceipt: "/var/tmp/b/BUILD-v0.1.json",
    scope: "dx-scale-decision-01234567-89ab-cdef-0123-456789abcdef-0",
    seedSha256: "a".repeat(64),
    cluster: "7710454239949164583",
    facts: 162456470,
    seedOriginTag: "arm-d7",
    seedOriginSha256: "b".repeat(64),
    seedOriginTransferSha256: "c".repeat(64),
    tunnel: 42,
    a: { address: "10.231.0.1", seedDirectory: "/var/tmp/s" },
    b: { address: "10.231.0.2", seedDirectory: "/var/tmp/s" },
    ssh: { user: "ubuntu", target: "a.example", identityFile: "/root/k", knownHosts: "/root/h" },
  };
  it("accepts an optional lab commit and direct addresses, and rejects overlay reuse", () => {
    const ok = { ...base, lab: "d".repeat(40), direct: { a: "192.0.2.1", b: "192.0.2.2" } };
    expect(readConfig(JSON.stringify(ok)).direct?.b).toBe("192.0.2.2");
    expect(readConfig(JSON.stringify(base)).lab).toBeUndefined();
    expect(() => readConfig(JSON.stringify({ ...ok, lab: base.commit }))).toThrow();
    expect(() => readConfig(JSON.stringify({ ...ok, direct: { a: "10.231.0.1", b: "192.0.2.2" } }))).toThrow();
  });
});
