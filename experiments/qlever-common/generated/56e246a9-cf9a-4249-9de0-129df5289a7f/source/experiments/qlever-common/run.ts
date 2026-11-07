/** Invoke only through scripts/triplex-lease.py --backend qlever. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { makeQleverClient } from "../../packages/qlever/src/QleverClient.js";
const option = (key: string) => process.argv[process.argv.indexOf(key) + 1];
assert.ok(process.argv.includes("--execute") && process.argv.includes("--manifest"));
const root = path.resolve(import.meta.dirname, "../..");
const manifestPath = path.resolve(option("--manifest")!);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const done = process.argv.includes("--watch-done")
  ? path.resolve(option("--watch-done")!)
  : undefined;
if (done) assert.ok(done.startsWith(path.join(root, "qualification/evidence/")));
const checkHashes = () => {
  for (const [file, hash] of Object.entries(manifest.sourceSha256))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex"),
      hash,
      `Source drift ${file}`,
    );
};
checkHashes();
const output = path.join(
  root,
  "qualification/evidence",
  `qlever-common-wave-${manifest.runId}.json`,
);
mkdirSync(path.dirname(output), { recursive: true });
const report: any = {
  format: manifest.format,
  manifest: manifestPath,
  startedAt: new Date().toISOString(),
  status: "RUNNING",
  nodes: [],
  samples: [],
  profile: manifest.profile,
  gateClaim: false,
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const command = promisify(execFile);
const inspect = async (name: string) =>
  JSON.parse(
    (await command("docker", ["inspect", name], { timeout: 3000, maxBuffer: 1024 ** 2 })).stdout,
  )[0];
const nodes: any[] = manifest.nodes.map((node: any) => ({
  ...node,
  client: makeQleverClient(node.url, { timeoutMs: 1500 }),
  finished: false,
  record: { ...node, observations: [] },
}));
let monitoring = true;
let monitor: Promise<void> | undefined;
const stop = async (node: any, reason: string) => {
  if (node.stopping) return;
  node.stopping = true;
  node.record.stopReason = reason;
  node.record.status = "FAILED_OR_STOPPED";
  try {
    const registry = await node.client.command("dump-active-queries");
    node.record.cancelRegistry = registry;
    for (const id of Object.keys(registry)) await node.client.cancel(id);
  } catch (error) {
    node.record.cancelError = String(error);
  }
  if (node.child?.pid)
    try {
      process.kill(-node.child.pid, "SIGTERM");
    } catch {}
};
try {
  report.original = await inspect("triplex-qlever-local");
  assert.equal(report.original.State.Running, false);
  for (const node of nodes) {
    node.record.before = await inspect(node.container);
    assert.equal(node.record.before.State.Running, true);
    assert.equal(node.record.before.HostConfig.Memory, 2 * 1024 ** 3);
    assert.equal(node.record.before.HostConfig.NanoCpus, 2_000_000_000);
    const args = node.record.before.Config.Cmd as string[];
    for (const [key, value] of [
      ["-m", "512M"],
      ["-c", "64M"],
      ["-j", "4"],
    ])
      assert.equal(args[args.indexOf(key!) + 1], value);
    const get = async (parameters: Record<string, string>) => {
      const url = new URL(node.url);
      for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      assert.ok(response.ok);
      return response.json();
    };
    node.record.settingsBefore = await get({ cmd: "get-settings" });
    node.record.setPlanner = await get({ "query-planning-budget": "100" });
    node.record.settings = await get({ cmd: "get-settings" });
    assert.equal(Number(node.record.settings["query-planning-budget"]), 100);
    node.record.registryBefore = await node.client.command("dump-active-queries");
    assert.deepEqual(node.record.registryBefore, {});
    node.record.statsBefore = await node.client.command("stats");
    report.nodes.push(node.record);
  }
  save();
  monitor = (async () => {
    while (monitoring) {
      const started = performance.now();
      await Promise.all(
        nodes.map(async (node: any) => {
          try {
            const { stdout } = await command(
              "docker",
              [
                "exec",
                node.container,
                "cat",
                "/sys/fs/cgroup/memory.current",
                "/sys/fs/cgroup/memory.peak",
                "/sys/fs/cgroup/cpu.stat",
                "/proc/1/status",
              ],
              { timeout: 1500, maxBuffer: 65536 },
            );
            const lines = stdout.split("\n");
            node.latest = {
              at: new Date().toISOString(),
              node: node.container,
              cgroupCurrent: Number(lines[0]),
              cgroupPeak: Number(lines[1]),
              rss: Number(/^VmRSS:\s+(\d+) kB/m.exec(stdout)?.[1] ?? 0) * 1024,
              cpuUsec: Number(/^usage_usec (\d+)/m.exec(stdout)?.[1] ?? 0),
              observationMs: performance.now() - started,
            };
            report.samples.push(node.latest);
            if (Math.max(node.latest.rss, node.latest.cgroupCurrent) >= 1.5 * 1024 ** 3)
              await stop(node, "predeclared1.5GiB node threshold");
          } catch (error) {
            node.record.samplerError = String(error);
            await stop(node, "resource sampler lost node");
          }
        }),
      );
      if (nodes.reduce((sum, node) => sum + (node.latest?.cgroupCurrent ?? 0), 0) >= 3 * 1024 ** 3)
        await Promise.all(
          nodes.map((node) => stop(node, "predeclared3GiB aggregate node threshold")),
        );
      try {
        const { stdout } = await command("ps", ["-axo", "pid=,ppid=,rss="], {
          timeout: 1500,
          maxBuffer: 1024 ** 2,
        });
        const processes = stdout
          .trim()
          .split("\n")
          .map((line) => line.trim().split(/\s+/).map(Number));
        const owned = new Set<number>([
          process.pid,
          ...nodes.map((node) => node.child?.pid).filter(Boolean),
        ]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const [pid, ppid] of processes)
            if (owned.has(ppid!) && !owned.has(pid!)) {
              owned.add(pid!);
              changed = true;
            }
        }
        const clientRSS = processes
          .filter(([pid]) => owned.has(pid!))
          .reduce((sum, row) => sum + row[2]! * 1024, 0);
        report.samples.push({ at: new Date().toISOString(), aggregateClientRss: clientRSS });
        if (clientRSS >= 2 * 1024 ** 3)
          await Promise.all(nodes.map((node) => stop(node, "predeclared2GiB client threshold")));
      } catch (error) {
        report.clientSamplerError = String(error);
        await Promise.all(nodes.map((node) => stop(node, "client sampler failure")));
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, 100 - (performance.now() - started))),
      );
    }
  })();
  await Promise.all(
    nodes.map(async (node: any) => {
      const stem = path.join(
        root,
        "qualification/evidence",
        `qlever-common-${manifest.runId}-${node.plan}`,
      );
      const chunks: Buffer[] = [];
      node.record.startedAt = new Date().toISOString();
      const child = spawn(
        "pnpm",
        [
          "--filter",
          "@triplex-build/triplex-qlever",
          "exec",
          "vitest",
          "run",
          "test/query.test.ts",
          "--maxWorkers=1",
          "--no-file-parallelism",
          "--bail=1",
          "--reporter=json",
          `--outputFile=${stem}-vitest.json`,
        ],
        {
          cwd: root,
          detached: true,
          env: {
            ...process.env,
            QLEVER_INTEGRATION: "1",
            QLEVER_PROBE_PLAN: node.sourcePlan,
            QLEVER_PROBE_DOMAIN_PLAN: node.plan,
            QLEVER_PROBE_TRACE_DIR: `${stem}-native-calls`,
            QLEVER_PROBE_RUN_ID: manifest.runId,
            QLEVER_URL: node.url,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      node.child = child;
      for (const stream of [child.stdout, child.stderr])
        stream!.on("data", (chunk: Buffer) => {
          if (chunks.reduce((n, c) => n + c.byteLength, 0) + chunk.byteLength < 4 * 1024 ** 2)
            chunks.push(chunk);
          else void stop(node, "test log4MiB cap");
        });
      const watchdog = setTimeout(() => {
        void stop(node, "wave test process180s watchdog");
      }, 180000);
      const result = await new Promise((resolve) => {
        child.on("error", (error) => resolve({ error: String(error) }));
        child.on("exit", (code, signal) => resolve({ code, signal }));
      });
      clearTimeout(watchdog);
      node.finished = true;
      node.record.finishedAt = new Date().toISOString();
      node.record.process = result;
      writeFileSync(`${stem}.log`, Buffer.concat(chunks), { flag: "wx" });
      node.record.log = `${stem}.log`;
      try {
        node.record.tests = JSON.parse(readFileSync(`${stem}-vitest.json`, "utf8"));
      } catch (error) {
        node.record.testReceiptError = String(error);
      }
      node.record.status =
        !node.stopping && node.record.tests?.success && node.record.tests.numPassedTests === 7
          ? "SURVIVED_FOCUSED_PACKET"
          : "FAILED_OR_STOPPED";
      save();
      console.log(JSON.stringify({ plan: node.plan, status: node.record.status, process: result }));
    }),
  );
  // Observe backend state separately from the test/client process lifecycle.
  for (let cut = 0; cut < 3; cut++) {
    await Promise.all(
      nodes.map(async (node) => {
        try {
          node.record.observations.push({
            at: new Date().toISOString(),
            registry: await node.client.command("dump-active-queries"),
          });
        } catch (error) {
          node.record.observations.push({ error: String(error) });
        }
      }),
    );
    if (cut < 2) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  checkHashes();
  for (const node of nodes) {
    node.record.after = await inspect(node.container);
    node.record.statsAfter = await node.client
      .command("stats")
      .catch((error: unknown) => ({ error: String(error) }));
  }
  report.status = nodes.some((node) => node.record.status === "SURVIVED_FOCUSED_PACKET")
    ? "SURVIVORS_REQUIRE_FURTHER_QUALIFICATION"
    : "NO_SURVIVOR";
} catch (error) {
  report.status = "SETUP_OR_RESOURCE_FAILURE";
  report.error = String(error);
  await Promise.all(nodes.map((node) => stop(node, String(error))));
} finally {
  monitoring = false;
  await monitor;
  for (const node of nodes) await node.client.close();
  report.finishedAt = new Date().toISOString();
  save();
  if (done)
    writeFileSync(
      done,
      JSON.stringify({ artifact: output, finishedAt: report.finishedAt }) + "\n",
      { flag: "wx" },
    );
  console.log(JSON.stringify({ status: report.status, artifact: output }));
}
