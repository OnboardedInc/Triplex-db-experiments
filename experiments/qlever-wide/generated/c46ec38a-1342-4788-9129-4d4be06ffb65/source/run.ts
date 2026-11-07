/** Explicitly invoked, isolated, stop-on-first-failure candidate wave. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples } from "../../packages/core/dist/index.js";
import { Capabilities } from "../../packages/core/dist/runtime/index.js";
import {
  makeQleverClient,
  makeQleverRuntime,
  type SparqlBinding,
} from "../../packages/qlever/dist/index.js";
import { compileWideCandidate, type CandidateBasis, type Strategy } from "./candidates.js";
import { compilePersistedCandidate } from "./canonical-source.js";
import { makeWideCandidateRuntime } from "./public-runtime.js";
// @ts-expect-error Independent plain-JS answer checker intentionally has no declaration file.
import { checkTypedAnswers, checkMtlAnswers } from "./independent-oracle.mjs";

assert.ok(process.argv.includes("--execute"), "No execution without explicit --execute");
assert.ok(process.argv.includes("--manifest"), "A frozen manifest is required");
const manifestPath = path.resolve(process.argv[process.argv.indexOf("--manifest") + 1]!);
const folder = path.dirname(manifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const root = path.resolve(import.meta.dirname, "../..");
for (const [name, digest] of Object.entries(manifest.sourceSha256))
  assert.equal(
    createHash("sha256")
      .update(readFileSync(path.join(import.meta.dirname, name)))
      .digest("hex"),
    digest,
    `Frozen source drift ${name}`,
  );
const output = path.join(root, "qualification/evidence", `qlever-wide-wave-${manifest.runId}.json`);
mkdirSync(path.dirname(output), { recursive: true });
const report: any = {
  format: "qlever-wide-wave/1",
  manifest: manifestPath,
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  nodes: [],
  typed: [],
  mtl: [],
  samples: [],
  limitations: [
    "Feasibility wave on two2GiB experimental profiles; original4GiB gates remain failed",
    "Five-second native/6-second client deadlines; no automatic retry or restart",
    "No percentile claims; public queryAll, transport, metadata and decode are timed",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const command = promisify(execFile);
const inspect = async (name: string) => {
  const { stdout } = await command("docker", ["inspect", name], {
    timeout: 3000,
    maxBuffer: 1024 ** 2,
  });
  const item = JSON.parse(stdout)[0];
  return {
    name: item.Name,
    image: item.Image,
    state: item.State,
    memoryBytes: item.HostConfig.Memory,
    nanoCpus: item.HostConfig.NanoCpus,
    command: item.Config.Cmd,
    entrypoint: item.Config.Entrypoint,
    mounts: item.Mounts.map((mount: any) => ({
      source: mount.Source,
      destination: mount.Destination,
    })),
  };
};
const dev = await inspect("triplex-qlever-local");
assert.equal(dev.state.Running, false, "Original development node must remain stopped");
report.originalDev = dev;
const nodes = manifest.nodes.map((definition: any) => ({
  ...definition,
  abort: new AbortController(),
  client: makeQleverClient(definition.url, { timeoutMs: 6000 }),
  status: "ACTIVE",
  record: { ...definition, phases: [], cases: [] },
  lastQueryIds: [] as string[],
}));
const stop = (node: any, reason: string) => {
  if (node.status !== "ACTIVE") return;
  node.status = "STOPPED";
  node.record.stopReason = reason;
  node.abort.abort(new Error(reason));
};
for (const node of nodes) {
  const before = await inspect(node.container);
  assert.equal(before.memoryBytes, 2 * 1024 ** 3);
  assert.equal(before.nanoCpus, 2_000_000_000);
  assert.equal(before.state.Running, true);
  node.record.before = before;
  report.nodes.push(node.record);
}
let monitoring = true;
const monitor = (async () => {
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
              "/bin/sh",
              "-c",
              "cat /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak /sys/fs/cgroup/cpu.stat /proc/1/status",
            ],
            { timeout: 1500, maxBuffer: 64 * 1024 },
          );
          const lines = stdout.split("\n");
          const sample = {
            at: new Date().toISOString(),
            node: node.container,
            cgroupCurrent: Number(lines[0]),
            cgroupPeak: Number(lines[1]),
            rss: Number(/^VmRSS:\s+(\d+)\s+kB/m.exec(stdout)?.[1] ?? 0) * 1024,
            hwm: Number(/^VmHWM:\s+(\d+)\s+kB/m.exec(stdout)?.[1] ?? 0) * 1024,
            cpuUsec: Number(/^usage_usec (\d+)/m.exec(stdout)?.[1] ?? 0),
            sampleDurationMs: performance.now() - started,
          };
          node.latest = sample;
          report.samples.push(sample);
          if (Math.max(sample.rss, sample.cgroupCurrent) >= 1.5 * 1024 ** 3)
            stop(node, "predeclared1.5GiB memory stopping threshold");
        } catch (error) {
          report.samples.push({
            at: new Date().toISOString(),
            node: node.container,
            error: String(error),
          });
          stop(node, "resource sampler lost node");
        }
      }),
    );
    if (
      nodes.reduce((sum: number, node: any) => sum + (node.latest?.cgroupCurrent ?? 0), 0) >=
      3 * 1024 ** 3
    )
      for (const node of nodes) stop(node, "predeclared3GiB aggregate stopping threshold");
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 100 - (performance.now() - started))),
    );
  }
})();
try {
  await Promise.all(
    nodes.map(async (node: any) => {
      const get = async (parameters: Record<string, string>) => {
        const url = new URL(node.url);
        for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        assert.ok(response.ok);
        return response.json();
      };
      node.record.settingsBefore = await get({ cmd: "get-settings" });
      node.record.settingsSet = await get({ "query-planning-budget": "100" });
      node.record.settingsReadback = await get({ cmd: "get-settings" });
      assert.equal(Number(node.record.settingsReadback["query-planning-budget"]), 100);
      node.record.statsBefore = await node.client.command("stats", { timeoutMs: 2000 });
    }),
  );
  save();
  for (const id of [
    "scalar-1",
    "scalar-2",
    "scalar-4",
    "scalar-6",
    "scalar-7",
    "funnel-3",
    "funnel-6",
    "funnel-9",
    "funnel-boundary-41",
    "funnel-equal-steps",
  ]) {
    await Promise.all(
      nodes
        .filter((node: any) => node.status === "ACTIVE")
        .map(async (node: any) => {
          const entry = manifest.cases.find(
            (candidate: any) => candidate.id === id && candidate.strategy === node.strategy,
          );
          assert.ok(entry);
          const caseRecord: any = {
            id,
            startedAt: new Date().toISOString(),
            status: "RUNNING",
            patternCount: entry.patternCount,
          };
          node.record.cases.push(caseRecord);
          save();
          const operation = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            if (id === "funnel-3") {
              const fixture = JSON.parse(
                readFileSync(path.join(folder, manifest.fixture.funnelFixtureFile), "utf8"),
              );
              const started = performance.now();
              const receipt = await Effect.runPromise(
                Effect.gen(function* () {
                  const t = yield* Triples;
                  return yield* t.transact(
                    fixture.facts.map((fact: any) => ({
                      op: "assert" as const,
                      ...fact,
                      entityId: EntityId.make(fact.entityId),
                    })),
                    { commandId: `${manifest.runId}:funnel-load` },
                  );
                }).pipe(
                  Effect.provide(
                    makeQleverRuntime({ url: node.url }).layer({
                      scope: fixture.scope,
                      capabilities: Capabilities.none,
                      deterministic: fixture.deterministic,
                    }),
                  ),
                  Effect.scoped,
                ),
              );
              assert.equal(receipt.position, 1);
              assert.equal(receipt.triples.length, 36);
              node.record.funnelLoad = {
                durationMs: performance.now() - started,
                position: receipt.position,
                assertions: receipt.triples.length,
                instant: receipt.instant,
              };
              assert.equal(receipt.instant, 1001);
            }
            timer = setTimeout(
              () => operation.abort(new Error("overall public query6-second deadline")),
              6000,
            );
            const compile = (query: any, scope: string, basis: CandidateBasis) =>
              node.strategy === "projected"
                ? compileWideCandidate(query, scope, basis, "projected")
                : compilePersistedCandidate(query, scope, basis);
            const native = async (label: string, sparql: string): Promise<SparqlBinding[]> => {
              const file =
                label === "layout"
                  ? entry.layoutFile
                  : label === "domain"
                    ? entry.domainFile
                    : entry.queryFile;
              assert.ok(file);
              assert.equal(
                sparql.trim(),
                readFileSync(path.join(folder, file), "utf8").trim(),
                "Prepared query text drift",
              );
              const queryId = randomUUID();
              node.lastQueryIds.push(queryId);
              const url = new URL(node.url);
              url.searchParams.set("timeout", "5000ms");
              const signal = AbortSignal.any([
                node.abort.signal,
                operation.signal,
                AbortSignal.timeout(6000),
              ]);
              const cancel = () => {
                void node.client
                  .cancel(queryId)
                  .then(() =>
                    node.record.phases.push({
                      label: "cancel-sent",
                      queryId,
                      at: new Date().toISOString(),
                    }),
                  )
                  .catch((error: unknown) =>
                    node.record.phases.push({
                      label: "cancel-send-failed",
                      queryId,
                      error: String(error),
                    }),
                  );
              };
              signal.addEventListener("abort", cancel, { once: true });
              const started = performance.now();
              const phase: any = {
                case: id,
                label,
                queryId,
                queryFile: file,
                startedAt: new Date().toISOString(),
                queryBytes: Buffer.byteLength(sparql),
              };
              node.record.phases.push(phase);
              try {
                const response = await fetch(url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/sparql-query",
                    Accept: "application/sparql-results+json",
                    "Query-Id": queryId,
                  },
                  body: sparql,
                  signal,
                });
                const reader = response.body!.getReader();
                const chunks: Uint8Array[] = [];
                let bytes = 0;
                while (true) {
                  const next = await reader.read();
                  if (next.done) break;
                  bytes += next.value.byteLength;
                  if (bytes > 4 * 1024 ** 2) {
                    await reader.cancel();
                    cancel();
                    throw new RangeError("response exceeds4MiB");
                  }
                  chunks.push(next.value);
                }
                const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                phase.httpStatus = response.status;
                phase.bytes = bytes;
                phase.nativeMeta = Object.fromEntries(
                  Object.entries(json).filter(([key]) => key !== "results" && key !== "head"),
                );
                if (!response.ok)
                  throw new Error(`nativeHTTP${response.status}: ${JSON.stringify(json)}`);
                const rows = json.results?.bindings;
                assert.ok(Array.isArray(rows));
                phase.rows = rows.length;
                return rows;
              } catch (error) {
                phase.error = String(error);
                throw error;
              } finally {
                phase.durationMs = performance.now() - started;
                signal.removeEventListener("abort", cancel);
              }
            };
            const started = performance.now();
            const rows = await Effect.runPromise(
              Effect.gen(function* () {
                const t = yield* Triples;
                return (yield* t.queryAll(entry.query, {
                  basis: {
                    validAt: entry.basis.validAt,
                    ...(entry.basis.recordedAt === undefined
                      ? {}
                      : { recordedAt: entry.basis.recordedAt }),
                  },
                })).results;
              }).pipe(
                Effect.provide(
                  makeWideCandidateRuntime(node.client, compile, native, 1).layer({
                    scope: entry.scope,
                    capabilities: Capabilities.none,
                  }),
                ),
                Effect.scoped,
              ),
            );
            caseRecord.endToEndMs = performance.now() - started;
            caseRecord.rows = rows;
            assert.deepEqual(
              rows.map((row: any) => JSON.stringify(row)).sort(),
              entry.expected.map((row: any) => JSON.stringify(row)).sort(),
              "Predeclared fixture oracle mismatch",
            );
            if (id.startsWith("scalar-")) {
              const width = Number(id.slice(7));
              caseRecord.oracle = checkTypedAnswers(width, rows);
              report.typed.push({ candidate: node.strategy, width, rows });
            } else if (["funnel-9", "funnel-boundary-41", "funnel-equal-steps"].includes(id)) {
              const caseId =
                id === "funnel-9"
                  ? "ordered-not-reordered"
                  : id === "funnel-boundary-41"
                    ? "include-exclusive-boundary"
                    : "equal-steps-fail";
              caseRecord.oracle = checkMtlAnswers(caseId, rows);
              report.mtl.push({ candidate: node.strategy, caseId, rows });
            }
            caseRecord.status = "PASS";
          } catch (error) {
            caseRecord.status = "FAIL_STOPPED";
            caseRecord.error = String(error);
            stop(node, `first failure at${id}: ${String(error)}`);
          } finally {
            clearTimeout(timer);
            caseRecord.finishedAt = new Date().toISOString();
            save();
            console.log(
              JSON.stringify({
                candidate: node.strategy,
                case: id,
                status: caseRecord.status,
                durationMs: caseRecord.endToEndMs,
                error: caseRecord.error,
              }),
            );
          }
        }),
    );
    if (nodes.every((node: any) => node.status !== "ACTIVE")) break;
  }
  for (const node of nodes) {
    node.record.registryAfter = await node.client
      .command("dump-active-queries", { timeoutMs: 1500 })
      .catch((error: unknown) => ({ error: String(error) }));
    node.record.after = await inspect(node.container);
    if (node.status === "ACTIVE") node.status = "SURVIVED_CANDIDATE_LADDER";
    node.record.status = node.status;
  }
  report.status = nodes.some((node: any) => node.status === "SURVIVED_CANDIDATE_LADDER")
    ? "CANDIDATE_SURVIVORS_REQUIRE_ORIGINAL_PROFILE_QUALIFICATION"
    : "NO_SURVIVOR";
} catch (error) {
  report.status = "WAVE_SETUP_OR_RESOURCE_FAILURE";
  report.error = String(error);
  for (const node of nodes) stop(node, String(error));
} finally {
  monitoring = false;
  await monitor;
  for (const node of nodes) await node.client.close();
  report.finishedAt = new Date().toISOString();
  save();
  writeFileSync(
    path.join(root, "qualification/evidence/qlever-wide-independent-watch-20261106T1508.done.json"),
    JSON.stringify({ finishedAt: report.finishedAt, artifact: output }) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ status: report.status, artifact: output }));
}
