import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { microLoad, root, runFile, splitLoad, until } from "../ha1/common.ts";
import type { Stack } from "../ha1/stack.ts";
import { replayLive } from "./live-evidence.ts";
export async function load(s: Stack, people: number) {
  const e = s.e;
  await s.tool();
  const peer = "peer-1.0.7745.jar",
    config = path.join(root, "lab/config/datomic");
  const pinned = JSON.parse(readFileSync(path.join(config, "verification.json"), "utf8")).jars;
  const peerSha = readFileSync(path.join(config, "SHA256SUMS"), "utf8")
    .split("\n")
    .find((l) => l.endsWith("  " + peer))!
    .split(" ")[0];
  const jars = Object.fromEntries([
    [peer, peerSha],
    ...Object.entries(pinned).map(([f, h]) => ["lib/" + f, h]),
  ]);
  const lines = (await s.exec("tool", "sha256sum", ...Object.keys(jars))).split("\n");
  for (const line of lines) {
    const [h, f] = line.trim().split(/\s+/);
    assert(f && jars[f] === h);
  }
  assert.equal(lines.length, Object.keys(jars).length);
  e.log("vendor-jars", { image: s.a.datomicId, jars });
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await s.tx("active", s.a, "pg", "moving");
  await until("active writer", async () => (await s.broker("active")) || undefined);
  const split = splitLoad(e.mode);
  const micro = microLoad(e.mode);
  const newDesign = micro || split || e.mode === "load-tail" || e.mode.startsWith("load-frontier-");
  await s.gateway("write", newDesign ? s.a : s.b, "pg", "moving");
  const url = await s.ready("write");
  let importUrl = "";
  if (split) {
    const storage = e.mode === "load-split-pg" ? "target" : "pg";
    if (storage === "target") await s.postgres(storage, s.b);
    await s.database(storage, "neighbor");
    await s.tx("standby", s.b, storage, "neighbor");
    await until("independent import writer", async () => (await s.broker("standby")) || undefined);
    await s.gateway("read", s.b, storage, "neighbor");
    importUrl = await s.ready("read");
    assert(url !== importUrl);
    e.log("load-storage-layout", {
      mode: e.mode,
      live: ["pg", "active", "write"],
      import: [storage, "standby", "read"],
      separateSqlProcesses: storage === "target",
      hostCount: new Set([s.a, s.b]).size,
    });
  }
  const server = process.platform === "linux";
  const arms =
    e.mode === "load-micro"
      ? ["micro-0-a", "micro-24", "micro-16", "micro-32", "micro-0-b"]
      : e.mode === "load-volume"
        ? ["volume-32"]
        : e.mode === "load-profile"
          ? ["ordinary-a", "row-a", "range-a", "range-b", "row-b", "ordinary-b"]
          : e.mode === "load-proof"
            ? ["proof-file"]
            : e.mode === "load-live"
              ? ["live-0-a", "live-128", "live-500", "live-2000", "live-0-b"]
              : e.mode === "load-tail"
                ? server
                  ? ["tail-0-a", "tail-128", "tail-500", "tail-2000", "tail-0-b"]
                  : ["tail-0-a", "tail-128", "tail-0-b"]
                : e.mode === "load-frontier-low"
                  ? ["frontier-0-a", "frontier-1", "frontier-4", "frontier-8", "frontier-0-b"]
                  : e.mode === "load-frontier-high"
                    ? ["frontier-0-a", "frontier-16", "frontier-32", "frontier-0-b"]
                    : e.mode === "load-frontier-allowance"
                      ? ["frontier-alone", "frontier-0-a", "frontier-allowance", "frontier-0-b"]
                      : split
                        ? ["split-0-a", "split-2000", "split-0-b"]
                        : server
                          ? ["quiet-server-2000-2"]
                          : [
                              "quiet-a-2000-1",
                              "classic-a-2000-2",
                              "quiet-a-2000-2",
                              "quiet-a-2000-4",
                              "quiet-a-1024-2",
                              "quiet-a-3000-2",
                              "quiet-b-2000-2",
                              "classic-b-2000-2",
                              "quiet-b-2000-1",
                              "proof-gap-1024-2",
                            ];
  const reports: Array<{ sourceSeal: string; [key: string]: unknown }> = [];
  let allowance = 0;
  for (const arm of arms) {
    const scope = e.prefix + "-" + arm;
    const cpu = async () =>
      Object.fromEntries(
        await Promise.all(
          [...s.members.keys()]
            .filter((role) => role !== "tool")
            .map(async (r) => [r, await s.exec(r, "cat", "/sys/fs/cgroup/cpu.stat")]),
        ),
      );
    const before = await cpu();
    const out = await runFile(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(root, "lab/experiments/EXP-DX1/load1/worker.ts"),
        e.mode,
        scope,
        arm,
        e.dir,
        String(people),
        server ? "server" : "local",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          DATOMIC_URL: url,
          DX_LOAD2_ALLOWANCE_MS: String(allowance),
          DX_LOAD2_IMPORT_URL: importUrl,
          TRIPLEX_DATOMIC_LAYOUT: "lean",
          DX_SERVER_RECORD_TIME: "1",
          TRIPLEX_TRACE_LEVEL: e.mode === "load-profile" ? "full" : "off",
          TRIPLEX_TRACE_RUN: e.nonce,
          TRIPLEX_TRACE_SOURCE: e.source.git,
          TRIPLEX_TRACE_SLOT: e.slot,
          TRIPLEX_DATOMIC_FAST_PATHS:
            e.mode === "load-profile"
              ? arm.startsWith("range")
                ? "row,body,history-range"
                : arm.startsWith("row")
                  ? "row,body"
                  : ""
              : arm.startsWith("classic")
                ? "row,body,history-range"
                : "row,body,history-range,fresh-texts",
        },
        timeout: server
          ? 48 * 3600000
          : Math.max(
              1,
              Math.floor(
                Math.min(
                  e.mode === "load-volume" ? 790000 : split ? 330000 : 240000,
                  830000 - (performance.now() - e.start),
                ),
              ),
            ),
        maxBuffer: 4 * 2 ** 20,
        encoding: "utf8",
      },
    );
    const r = JSON.parse(out.stdout.trim().split("\n").at(-1)!);
    assert.deepEqual(
      [r.nonce, r.source, r.slot, r.scope, r.arm],
      [e.nonce, e.source.git, e.slot, scope, arm],
    );
    if (newDesign) {
      replayLive(JSON.parse(readFileSync(path.join(e.dir, arm + ".offers.json"), "utf8")), e, r);
    }
    const live =
      ["load-live", "load-tail"].includes(e.mode) ||
      e.mode.startsWith("load-frontier-") ||
      split ||
      micro;
    assert(Number.isSafeInteger(r.facts) && (live ? r.facts >= 0 : r.facts > 0));
    if (e.mode === "load-frontier-allowance" && arm === "frontier-alone") {
      const quiet = r.neighbors.quiet;
      assert(
        quiet.save.ok >= 500 &&
          quiet.read.ok >= 500 &&
          quiet.save.p99Ms > 0 &&
          quiet.read.p99Ms > 0,
      );
      allowance = Math.min(32, Math.min(quiet.save.p99Ms, quiet.read.p99Ms) * 0.5);
      e.log("frame-allowance", {
        controlArm: arm,
        read: quiet.read.p99Ms * 0.5,
        save: quiet.save.p99Ms * 0.5,
        bound: allowance,
      });
    }
    if (reports.length) assert.equal(r.sourceSeal, reports[0]!.sourceSeal);
    e.log("load-arm", {
      arm,
      scope,
      facts: r.facts,
      elapsedMs: r.elapsedMs,
      cpuBefore: before,
      cpuAfter: await cpu(),
    });
    if (newDesign) e.write("arm-" + arm, r);
    reports.push(r);
  }
  if (e.mode === "load-tail") await s.collectLoadTrace();
  if (micro) await s.collectMicroCounters();
  return reports;
}
