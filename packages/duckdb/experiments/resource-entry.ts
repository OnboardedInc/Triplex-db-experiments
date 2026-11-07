import assert from "node:assert/strict";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeDuckDBClient, makeDuckDBRuntime } from "@triplex-build/triplex-duckdb";
import { withDuckDBClientBackend } from "../dist/DuckDBClient.js";

// Exercise the exact lease and granular session used by the public compiler;
// a separate fresh native probe did not explain the first packet's auto spill
// setting. This is a finite diagnostic, not a performance qualification.
// Inspiration/rationale: wiki/problems/duckdb-recursion.md and the first packet.
const artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"],
  directory = process.env["TRIPLEX_RUN_DIRECTORY"];
assert.ok(artifacts && directory, "Use an owned CLI job");
const scratch = path.join(directory, "scratch"),
  temporaryBase = path.join(scratch, "temporary"),
  scope = DatabaseScope.test("duckdb-real-lease-resource-guard"),
  options = {
    database: path.join(scratch, "bounded.duckdb"),
    tempDirectory: temporaryBase,
    threads: 1,
    memoryLimit: "128MiB",
    maxTempDirectorySize: "1MiB",
    queryTimeoutMs: 1000,
  } as const;
await mkdir(temporaryBase, { recursive: true });
const client = makeDuckDBClient(options);
const profileSql = "SELECT current_setting('memory_limit') AS memory_limit,current_setting('max_temp_directory_size') AS spill_limit,current_setting('temp_directory') AS temporary_directory";
const report: Record<string, unknown> = {
  format: "triplex-duckdb-leased-reader-resources/1",
  claim: "Finite native spill rejection and cancellation on the live public lease only",
  requested: options,
};
const result: Record<string, unknown> = {};
function messages(error: unknown): string {
  const seen = new Set<unknown>(), parts: string[] = [];
  for (let current = error; current !== undefined && !seen.has(current); ) {
    seen.add(current); parts.push(String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.join("\ncaused by: ");
}
async function allocated(root: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const location = path.join(root, entry.name);
    assert.ok(!entry.isSymbolicLink(), "No linked temporary artifacts");
    if (entry.isDirectory()) bytes += await allocated(location);
    else { const info = await stat(location); bytes += info.blocks * 512; }
  }
  return bytes;
}
try {
  // Retain this client lease while public Runtime layers come and go. Both
  // enter acquireDuckDBBackend with the exact file/scope/resource identity.
  await withDuckDBClientBackend(client, scope, async (backend) => {
    report["profileBeforePublicRead"] = await backend.read((session) => session.runRecords(profileSql));
  });
  const runtime = await makeDuckDBRuntime(options);
  await Effect.runPromise(Effect.gen(function* () {
    const triples = yield* Triples;
    yield* triples.assert({ entityId: EntityId.make("guard"), attribute: ":label", value: string("alive"), validFrom: 0 });
    const rows = yield* triples.queryAll({ find: ["?label"], where: [["guard", ":label", "?label"]] }, { basis: { validAt: 1 } });
    assert.deepEqual(rows.results, [{ "?label": "alive" }]);
  }).pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));

  await withDuckDBClientBackend(client, scope, async (backend) => {
    let capError: unknown, peakTemporaryAllocatedBytes = 0, monitorRunning = false;
    const capAbort = new AbortController();
    const deadline = setTimeout(() => capAbort.abort("finite diagnostic deadline"), 2000);
    const monitor = setInterval(() => {
      if (monitorRunning) return;
      monitorRunning = true;
      allocated(temporaryBase).then((bytes) => {
        peakTemporaryAllocatedBytes = Math.max(peakTemporaryAllocatedBytes, bytes);
        if (bytes > 8 * 1024 ** 2) capAbort.abort("temporary diagnostic safety bound");
      }).finally(() => { monitorRunning = false; });
    }, 20);
    try {
      await backend.withTransaction(async (session) => {
        const effective = await session.runRecords(profileSql);
        report["profileOnActualPublicSessionBeforeSpill"] = effective;
        assert.equal(effective[0]?.["spill_limit"], "1.0 MiB");
        assert.ok(String(effective[0]?.["temporary_directory"]).startsWith(temporaryBase + "/triplex-duckdb-spill-"));
        // Two million bounded inputs with 128-byte sort keys spill at128MiB,
        // small enough to retain finite worst-case work if native containment fails.
        await session.runRecords("SELECT sum(hash(s))::VARCHAR AS checksum FROM (SELECT repeat(md5(CAST(i AS VARCHAR)),4) AS s FROM range(2000000) AS t(i) ORDER BY s)", [], capAbort.signal);
      });
    } catch (error) { capError = error; }
    finally { clearTimeout(deadline); clearInterval(monitor); }
    report["spillError"] = messages(capError);
    report["peakTemporaryAllocatedBytesSampled"] = peakTemporaryAllocatedBytes;
    assert.ok(capError, "The finite sort must actually try to spill");
    assert.ok(!capAbort.signal.aborted, "A cancellation/safety bound is inconclusive for native spill containment");
    assert.match(messages(capError), /max_temp_directory_size/);
    assert.match(messages(capError), /1\.0 MiB/);
    assert.ok(peakTemporaryAllocatedBytes <= 8 * 1024 ** 2);
    result["spill"] = "FINITE_CAP_REJECTED_ON_ACTUAL_PUBLIC_SESSION";
    assert.deepEqual(await backend.read((session) => session.runRecords("SELECT 1::INTEGER AS alive")), [{ alive: 1n }]);

    const abort = new AbortController(), start = performance.now();
    const timer = setTimeout(() => abort.abort("native interrupt diagnostic"), 25);
    let interruptError: unknown;
    try {
      await backend.read((session) => session.runRecords("SELECT sum(sin(i)) AS total FROM range(1000000000) AS t(i)", [], abort.signal));
    } catch (error) { interruptError = error; }
    finally { clearTimeout(timer); }
    report["interrupt"] = { error: messages(interruptError), elapsedMs: performance.now() - start, aborted: abort.signal.aborted };
    assert.ok(abort.signal.aborted && interruptError, "Actual native interruption must settle the read");
    assert.ok(performance.now() - start < 5000);
    assert.deepEqual(await backend.read((session) => session.runRecords("SELECT 1::INTEGER AS alive")), [{ alive: 1n }]);
    result["interrupt"] = "NATIVE_READ_DRAINED_AND_SAME_PUBLIC_SESSION_REUSED";
  });

  const incompatible = makeDuckDBClient({ ...options, maxTempDirectorySize: "2MiB" });
  try {
    await assert.rejects(withDuckDBClientBackend(incompatible, scope, async () => {}), /share scope and resource settings/);
    result["poolIdentity"] = "INCOMPATIBLE_RESOURCE_REUSE_REFUSED";
  } finally { await incompatible.close().catch(() => {}); }
} finally {
  await client.close();
  await writeFile(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
await writeFile(path.join(artifacts, "result.json"), JSON.stringify(result) + "\n");
