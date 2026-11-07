/** Independently authored tiny native-XTDB fixture; starts or stops no engine. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { EntityId, Triples, integer, number } from "@triplex-build/triplex";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";

const root = path.resolve(import.meta.dirname, "../../..");
const manifest = JSON.parse(readFileSync(path.join(root, "packages/xtdb/package.json"), "utf8"));
const target = manifest.exports["."].import;
assert.ok(target.startsWith("./dist/"));
const api = await import(pathToFileURL(path.join(root, "packages/xtdb", target)).href);
const url = "postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb";
const id = randomUUID(), scope = DatabaseScope.test(`independent-native-x-${id}`), otherScope = DatabaseScope.test(`independent-native-x-other-${id}`);
const entity = EntityId.make("?literal ' ; independent"), Counter = Attribute.int64(":independent/counter"), Ratio = Attribute.number(":independent/ratio");
const fields = (values: Record<string, any>) => TypeExpr.struct(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, TypeExpr.required(value)])));
const hashes = () => {
  const files: string[] = ["packages/qlever/experiments/verify-xtdb-entry.ts", "pnpm-lock.yaml"];
  const collect = (directory: string) => { for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) { const file = `${directory}/${entry.name}`; if (entry.isDirectory()) collect(file); else if (entry.isFile()) files.push(file); } };
  for (const directory of ["packages/core/src", "packages/core/dist", "packages/xtdb/src", "packages/xtdb/dist"]) collect(directory);
  return Object.fromEntries(files.sort().map(file => [file, createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")]));
};
const output = path.join(root, "qualification/reviews", `xtdb-independent-entry-${id}.json`);
const report: Record<string, any> = { format: "triplex-independent-native-entry/1", reviewer: "qlever-agent", providerAuthor: "xtdb-agent", id, scope, sourceHashesBefore: hashes(), status: "RUNNING", checks: [], traces: [], cohort: "QLeverDatalog142correctnessconcurrent", limitations: ["Small independently authored fixture; no performance, scale, restart or crash-safety claim."] };
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const check = async (name: string, run: () => Promise<unknown>) => { try { report.checks.push({ name, status: "PASS", observation: await run() }); } catch (cause) { report.checks.push({ name, status: "FAIL", error: String(cause) }); save(); throw cause; } save(); };
let invocation = 0;
const run = <A>(program: Effect.Effect<A, unknown, Triples>, selected = scope) => Effect.runPromise(program.pipe(Effect.provide(api.makeXtdbRuntime({ url }).layer({ scope: selected, capabilities: Capabilities.none, deterministic: { startTime: 5000.125 + ++invocation, seed: `${id}:${invocation}` } })), Effect.scoped));
const client = api.makeXtdbClient(url, { maxConnections: 1 }), native = api.makeXtdbNativeQueries(client, scope);
const contract = { name: "independent-negative-i64-history", parameters: fields({ entity: TypeExpr.text }), row: fields({ counter: TypeExpr.int64 }) };
let initialPosition = 0, initialInstant = 0, originalId: any;
const read = (provider: any, validAt = .5, recordedPosition = initialPosition) => Effect.runPromise(provider.selectSql(contract, { entity }, (ctx: any, input: any) => `SELECT value_string AS counter FROM ${ctx.facts()} f WHERE entity_id=${ctx.bind(input.entity)} AND attribute=${ctx.attribute(Counter)}`, { basis: { validAt, recordedPosition }, includeRaw: true }));
try {
  await check("independent-shared-write-negative-int64-and-binary64", async () => {
    const receipt = await run(Effect.gen(function* () { const triples = yield* Triples; return yield* triples.transact([{ op: "assert", entityId: entity, ...Attribute.assertion(Counter, integer("-9223372036854775808")), validFrom: .25, validTo: .75 }, { op: "assert", entityId: entity, ...Attribute.assertion(Ratio, 1.0000000000000002), validFrom: 0 }], { commandId: `${id}:initial` }); }));
    initialPosition = receipt.position; initialInstant = receipt.instant; originalId = receipt.triples[0]!.id;
    return { position: initialPosition, assertionId: originalId };
  });
  await check("native-read-fractional-cut-exact-negative-i64", async () => { const answer = await read(native); assert.deepEqual(answer.rows, [{ counter: integer("-9223372036854775808") }]); report.traces.push(answer.trace); return answer.rows; });
  await check("half-open-cut-and-scope-isolation", async () => {
    await run(Effect.gen(function* () { const triples = yield* Triples; yield* triples.transact([{ op: "assert", entityId: entity, ...Attribute.assertion(Counter, integer("999")), validFrom: 0 }]); }), otherScope);
    assert.deepEqual((await read(native, .125)).rows, []); assert.deepEqual((await read(native, .75)).rows, []);
    assert.deepEqual((await read(native)).rows, [{ counter: integer("-9223372036854775808") }]);
  });
  await check("native-binary64-result-contract", async () => {
    const answer = await Effect.runPromise(native.selectSql({ name: "independent-exact-ratio", parameters: fields({ entity: TypeExpr.text }), row: fields({ ratio: TypeExpr.number }) }, { entity }, (ctx: any, input: any) => `SELECT value_number AS ratio FROM ${ctx.facts()} f WHERE entity_id=${ctx.bind(input.entity)} AND attribute=${ctx.attribute(Ratio)}`, { basis: { validAt: .5 } }));
    assert.deepEqual(answer.rows, [{ ratio: 1.0000000000000002 }]); report.traces.push(answer.trace); return answer.rows;
  });
  await check("correction-followed-by-independent-historical-mask", async () => {
    await run(Effect.gen(function* () { const triples = yield* Triples; yield* triples.transact([{ op: "retract", id: originalId }, { op: "assert", entityId: entity, ...Attribute.assertion(Counter, integer("-7")), validFrom: .25, validTo: .75 }], { commandId: `${id}:correction` }); }));
    const answer = await Effect.runPromise(native.selectSql({ ...contract, row: fields({ counter: TypeExpr.int64, retired: TypeExpr.any, retire_tx: TypeExpr.any }) }, { entity }, (ctx: any, input: any) => `SELECT value_string AS counter,retracted_at AS retired,retract_tx_id AS retire_tx FROM ${ctx.history()} h WHERE entity_id=${ctx.bind(input.entity)} AND attribute=${ctx.attribute(Counter)}`, { basis: { validAt: .5, recordedPosition: initialPosition, recordedAt: initialInstant } }));
    assert.deepEqual(answer.rows, [{ counter: integer("-9223372036854775808"), retired: null, retire_tx: null }]); report.traces.push(answer.trace); return answer.rows;
  });
  await check("new-connection-preserves-original-source-position", async () => {
    const reopened = api.makeXtdbClient(url, { maxConnections: 1 });
    try { const answer = await read(api.makeXtdbNativeQueries(reopened, scope)); assert.deepEqual(answer.rows, [{ counter: integer("-9223372036854775808") }]); report.traces.push(answer.trace); return answer.rows; } finally { await reopened.close(); }
  });
  report.sourceHashesAfter = hashes(); assert.deepEqual(report.sourceHashesAfter, report.sourceHashesBefore); report.status = "PASS_FOCUSED_ONLY";
} catch (cause) { report.status = "FAIL_RETAINED"; report.error = String(cause); process.exitCode = 1; }
finally { await client.close(); save(); console.log(JSON.stringify({ output, status: report.status, checks: report.checks.length })); }
