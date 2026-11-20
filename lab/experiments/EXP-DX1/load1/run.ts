import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { root, runFile, until } from "../ha1/common.ts";
import type { Stack } from "../ha1/stack.ts";
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
  await s.gateway("write", s.a, "pg", "moving");
  const url = await s.ready("write");
  const arms = ["ordinary-a", "range-a", "range-b", "ordinary-b"];
  const reports = [];
  for (const arm of arms) {
    const scope = e.prefix + "-" + arm;
    const cpu = async () =>
      Object.fromEntries(
        await Promise.all(
          (["active", "write", "pg"] as const).map(async (r) => [
            r,
            await s.exec(r, "cat", "/sys/fs/cgroup/cpu.stat"),
          ]),
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
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          DATOMIC_URL: url,
          TRIPLEX_DATOMIC_LAYOUT: "lean",
          DX_SERVER_RECORD_TIME: "1",
          TRIPLEX_TRACE_LEVEL: "full",
          TRIPLEX_TRACE_RUN: e.nonce,
          TRIPLEX_TRACE_SOURCE: e.source.git,
          TRIPLEX_TRACE_SLOT: e.slot,
          TRIPLEX_DATOMIC_FAST_PATHS: arm.startsWith("range") ? "row,body,history-range" : "",
        },
        timeout: 165000,
        maxBuffer: 4 * 2 ** 20,
        encoding: "utf8",
      },
    );
    const r = JSON.parse(out.stdout.trim().split("\n").at(-1)!);
    assert.deepEqual(
      [r.nonce, r.source, r.slot, r.scope, r.arm],
      [e.nonce, e.source.git, e.slot, scope, arm],
    );
    assert(Number.isSafeInteger(r.facts) && r.facts > 0);
    if (reports.length) assert.equal(r.sourceSeal, reports[0]!.sourceSeal);
    e.log("load-arm", {
      arm,
      scope,
      facts: r.facts,
      elapsedMs: r.elapsedMs,
      cpuBefore: before,
      cpuAfter: await cpu(),
    });
    reports.push(r);
  }
  return reports;
}
