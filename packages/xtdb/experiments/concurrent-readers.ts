import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { Triples } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "@triplex-build/triplex-xtdb";

const root = path.resolve(import.meta.dirname, "../../..");
const evidenceRoot = path.join(root, "qualification/evidence");
const candidates = readdirSync(evidenceRoot)
  .filter((name) => name.endsWith("-scale.json"))
  .sort()
  .reverse();
const fixture = candidates
  .map((name) => JSON.parse(readFileSync(path.join(evidenceRoot, name), "utf8")))
  .find((item) => item.status === "LOADING");
assert.ok(fixture?.scope, "An actively ingesting admitted fixture is required");
const scope = fixture.scope as DatabaseScope;
const output = path.join(evidenceRoot, `readers-during-ingestion-${Date.now()}.json`);
const fingerprint = () =>
  createHash("sha256")
    .update(readFileSync(path.join(root, "packages/xtdb/dist/XtdbQueryExecutor.js")))
    .digest("hex");
const report: Record<string, any> = {
  status: "RUNNING",
  scope,
  readers: 16,
  samplesPerReader: 3,
  timestamp: new Date().toISOString(),
  executorBefore: fingerprint(),
  observations: [],
  limitations: [
    "Functional concurrent-reader checkpoint only; fewer than 10000 samples, no percentile qualification.",
    "Underlying OS cache uncontrolled; shared-server contention is included.",
    "Smaller entity population; does not close million-input or ten-million-fact gates.",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
try {
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      report.positionBefore = yield* triples.currentPosition();
      const started = performance.now();
      yield* Effect.all(
        Array.from({ length: 16 }, (_, reader) =>
          Effect.gen(function* () {
            for (let sample = 0; sample < 3; sample++) {
              const begin = performance.now();
              const result = yield* triples.queryAll(
                {
                  find: ["?count", "?sum"],
                  where: [["?entity", ":scale/index", "?index"]],
                  aggregate: [
                    ["count", "?entity", "?count"],
                    ["sum", "?index", "?sum"],
                  ],
                },
                { basis: { validAt: 100 } },
              );
              const row = result.results[0]!;
              const count = Number(row["?count"]),
                sum = Number(row["?sum"]);
              assert.ok(
                Number.isSafeInteger(count) &&
                  count >= 28_500 &&
                  count <= 100_000 &&
                  count % 500 === 0,
              );
              assert.equal(
                sum,
                (count * (count - 1)) / 2,
                "Each reader must see a complete contiguous source prefix",
              );
              report.observations.push({
                reader,
                sample,
                count,
                sum,
                elapsedMs: performance.now() - begin,
              });
            }
          }),
        ),
        { concurrency: 16 },
      );
      report.elapsedMs = performance.now() - started;
      report.positionAfter = yield* triples.currentPosition();
      assert.ok(
        report.positionAfter > report.positionBefore,
        "Writer progress must actually overlap the read window",
      );
      report.status = "PASS_FUNCTIONAL_CONCURRENT_INGESTION";
    }).pipe(
      Effect.provide(
        makeXtdbRuntime({
          url: process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb",
        }).layer({ scope, capabilities: Capabilities.none }),
      ),
      Effect.scoped,
    ),
  );
} catch (error) {
  report.status = "FAIL";
  report.error = {
    message: String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  process.exitCode = 1;
} finally {
  report.executorAfter = fingerprint();
  report.stableExecutor = report.executorAfter === report.executorBefore;
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(output, report.status, report.observations.length);
}
