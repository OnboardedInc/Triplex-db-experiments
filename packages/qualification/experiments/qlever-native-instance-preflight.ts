/** Read-only reuse proof for the separately approved native-only diagnostic.
 * No workload SELECT or application write is used as a warmup. The public
 * current-position and durable command receipt expose actual P and R.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { Triples } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";
import { canonical, makeOracle, sha256 } from "../load/model.ts";

const root = path.resolve(import.meta.dirname, "../../.."), args = process.argv.slice(2);
const option = (key: string) => args[args.indexOf(key) + 1]!;
const output = path.resolve(option("--output")), artifacts = process.env["TRIPLEX_RUN_ARTIFACTS"];
assert(artifacts && output.startsWith(path.resolve(artifacts) + path.sep));
const fixtureFile = path.resolve(root, option("--fixture"));
const spec = JSON.parse(readFileSync(path.resolve(root, option("--spec")), "utf8"));
const bundle = JSON.parse(readFileSync(fixtureFile, "utf8"));
assert.equal(sha256(readFileSync(fixtureFile)), "7fa7b2c65001f6a3d27e90429effbab8226130fa5384680fbf7e19db681d86c4");
assert.equal(bundle.specSha256, sha256(canonical(spec)));
const expectedOracle = makeOracle(spec, bundle), actualOracle = JSON.parse(readFileSync(path.resolve(root, option("--oracle")), "utf8"));
assert.equal(actualOracle.oracleId, "qlever-native-only-point-rate16-v1");
assert.equal(actualOracle.recipeIdentity, expectedOracle.recipeIdentity);
assert.deepEqual(actualOracle.entries, Object.fromEntries(Object.entries(expectedOracle.entries).filter(([key]) => key.startsWith("1/"))));
const receipt = bundle.instances.find((entry: { index: number }) => entry.index === 1);
assert.equal(receipt.baselinePosition, 2); assert.equal(receipt.recordedAt, 1000.25);
const parts = JSON.parse(receipt.scope), scope = DatabaseScope.make({ env: parts[1], tenant: parts[2], database: parts[3], generation: parts[4] });
assert.equal(scope, receipt.scope);
// Optional engines are resolved by the qualification package's public factory;
// this package deliberately does not have a direct QLever dependency link.
const backend = await loadQualificationBackend();
assert.equal(backend.queryPath, "qlever-native");
const runtime = backend.makeRuntime();
const observed = await Effect.runPromise(Effect.gen(function* () {
  const triples = yield* Triples;
  const before = yield* triples.currentPosition();
  const seed = yield* triples.transactionByCommand(`${spec.id}:1:seed:2`);
  const correction = yield* triples.transactionByCommand(`${spec.id}:1:correction:1`);
  const after = yield* triples.currentPosition();
  assert.equal(before, 2); assert.equal(after, 2);
  assert(seed); assert.equal(seed.position, 2); assert.equal(seed.instant, 1000.25);
  assert.equal(correction, null);
  return { before, after, seedPosition: seed.position, seedRecordedAt: seed.instant, correction, seedTransactionId: seed.txId };
}).pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
writeFileSync(output, JSON.stringify({ format: "triplex-qlever-native-instance-preflight/1", status: "PASS_READ_ONLY_REUSE_PROOF", scope, applicationWrites: 0, workloadSelectWarmup: false, observed, immutableSeedSha256: sha256(readFileSync(fixtureFile)), oracleEntries: Object.keys(actualOracle.entries).length }, null, 2) + "\n", { flag: "wx" });
writeFileSync(path.join(path.dirname(output), "checks.json"), JSON.stringify({ format: "triplex-qlever-native-instance-reuse-checks/1", status: "PASS", currentPositionBefore: observed.before, currentPositionAfter: observed.after, seedPosition: observed.seedPosition, seedRecordedAt: observed.seedRecordedAt, correctionAbsent: observed.correction === null, immutableSeedAndModelOracleVerified: true, applicationWrites: 0, workloadSelectWarmup: false }, null, 2) + "\n", { flag: "wx" });
