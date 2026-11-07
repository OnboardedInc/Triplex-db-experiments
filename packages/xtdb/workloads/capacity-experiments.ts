/** Three simultaneous correctness experiments, never comparative latency gates. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, number } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "@triplex-build/triplex-xtdb";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const output = path.resolve(
  args.includes("--output")
    ? args[args.indexOf("--output") + 1]!
    : path.join(root, "qualification/evidence", `capacity-${randomUUID()}.json`),
);
assert.ok(output.startsWith(path.join(root, "qualification") + path.sep));
const runId = randomUUID(),
  entitiesPerVariant = 2000;
const inspect = (planned: number) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(root, "scripts/xtdb-resources.mjs"),
        "--planned-bytes",
        String(planned),
        "--require-server",
      ],
      { encoding: "utf8" },
    ),
  );
const before = inspect(entitiesPerVariant * 3 * 4096 * 6);
const report: Record<string, unknown> = {
  format: "triplex-xtdb-capacity-experiments/2",
  status: "RUNNING",
  runId,
  timestampUtc: new Date().toISOString(),
  entitiesPerVariant,
  variants: [],
  resourceBefore: before,
  hypothesis:
    "Change assertion batch width100/500/2000 while keeping6000distinctentities/6000domainfacts and complete public journals/receipts; separate database growth from unrelated dependency growth.",
  limitations: [
    "Variants run simultaneously on one owned server: timing is diagnostic, not a paired performance comparison.",
    "Physical database growth is measured for the complete three-variant cohort, not attributed to individual scopes.",
    "Concurrent owned-server work may contribute; dependency/project growth is reported separately and never extrapolated as bytes/domainfact.",
    "This experiment revises the estimate model under unchanged fixed resource caps; it cannot turn the preserved prior admission failure into a pass.",
  ],
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const variants = [100, 500, 2000].map((batch) => {
  const scope = DatabaseScope.test(`capacity-${runId}-${batch}`);
  return Effect.gen(function* () {
    const triples = yield* Triples;
    const commands = [];
    for (let start = 0; start < entitiesPerVariant; start += batch) {
      const commandId = `${runId}:${batch}:${start}`;
      const started = performance.now();
      const transaction = yield* triples.transact(
        Array.from({ length: Math.min(batch, entitiesPerVariant - start) }, (_, offset) => ({
          op: "assert" as const,
          entityId: EntityId.make(`capacity:${start + offset}`),
          attribute: ":capacity/index",
          value: number(start + offset),
          validFrom: 1,
        })),
        { commandId },
      );
      const receipt = yield* triples.transactionByCommand(commandId);
      assert.equal(receipt?.txId, transaction.txId);
      commands.push({
        commandId,
        position: transaction.position,
        assertions: transaction.triples.length,
        acknowledgedMsDiagnostic: performance.now() - started,
      });
    }
    const result = yield* triples.queryAll(
      {
        find: ["?count", "?sum"],
        where: [["?e", ":capacity/index", "?value"]],
        aggregate: [
          ["count", "?e", "?count"],
          ["sum", "?value", "?sum"],
        ],
      },
      { basis: { validAt: 100 } },
    );
    assert.equal(result.results[0]?.["?count"], entitiesPerVariant);
    assert.equal(result.results[0]?.["?sum"], (entitiesPerVariant * (entitiesPerVariant - 1)) / 2);
    return {
      batchAssertions: batch,
      scope,
      status: "PASS_CORRECTNESS_ONLY",
      distinctEntities: entitiesPerVariant,
      domainFacts: entitiesPerVariant,
      commandCount: commands.length,
      commands,
    };
  }).pipe(
    Effect.provide(makeXtdbRuntime({ url }).layer({ scope, capabilities: Capabilities.none })),
    Effect.scoped,
  );
});
try {
  report["variants"] = await Effect.runPromise(Effect.all(variants, { concurrency: 3 }));
  report["status"] = "PASS_CORRECTNESS_ONLY";
} catch (error) {
  report["status"] = "FAIL";
  report["error"] = String(error);
  process.exitCode = 1;
} finally {
  const after = inspect(0);
  report["resourceAfter"] = after;
  report["databaseGrowthBytes"] = Math.max(
    0,
    after.databaseAllocatedBytes.value - before.databaseAllocatedBytes.value,
  );
  report["databaseGrowthBytesPerDomainFact"] =
    Number(report["databaseGrowthBytes"]) / (entitiesPerVariant * 3);
  report["wholeProjectGrowthBytes"] =
    after.projectAllocatedBytes.value - before.projectAllocatedBytes.value;
  report["calibrationStatus"] =
    report["status"] === "PASS_CORRECTNESS_ONLY" ? "MEASURED_COHORT_MODEL_V2" : "UNUSABLE";
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      result: report["status"],
      output,
      databaseGrowthBytes: report["databaseGrowthBytes"],
      databaseGrowthBytesPerDomainFact: report["databaseGrowthBytesPerDomainFact"],
    }),
  );
}
