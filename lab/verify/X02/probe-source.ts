/** CX-VX02: source-bound, data-free engine probes. Run through heavy.mjs with node --import tsx. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Effect, Exit } from "effect";
import { integer } from "@triplex-build/triplex";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { makeXtdbClient, makeXtdbNativeQueries } from "../../../packages/xtdb/src/index.ts";
import { readOnlyNativeSql } from "../../../packages/xtdb/src/native/ReadOnlySql.ts";
import { compileXtdb } from "../../../packages/xtdb/src/query/compiler.ts";

// [CX-VX02] Why: virtual input rows isolate the compiler/cast without shared-resident writes or migrations.
// Rejected: retrying the old timed-out write (its outcome is unknown and its fixture is not reliable).
const endpoint = "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb";
if (process.env.DOCKER_HOST !== "unix:///Users/sam/.colima/triplex2/docker.sock") throw new Error("private endpoint required");
const out = process.argv[2];
if (!out || !out.startsWith("lab/verify/X02/")) throw new Error("output must be under lab/verify/X02");
const files = [
  "packages/xtdb/src/native/ReadOnlySql.ts", "packages/xtdb/src/native/NativeQueries.ts",
  "packages/xtdb/src/native/Sources.ts", "packages/xtdb/src/query/compiler.ts",
  "packages/core/src/datalog/compiler.ts", "packages/core/dist/datalog/compiler.js",
];
const report: any = { startedAt: new Date().toISOString(), endpoint,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  hashes: Object.fromEntries(files.map(f => [f, createHash("sha256").update(readFileSync(f)).digest("hex")])), probes: [] };
writeFileSync(out + ".jsonl", JSON.stringify({ ...report, probes: undefined }) + "\n", { flag: "wx" });
const client = makeXtdbClient(endpoint, { maxConnections: 1 });
const native = makeXtdbNativeQueries(client, DatabaseScope.test("cx-vx02-data-free"));
const contract = { name: "cx-vx02/probe", parameters: TypeExpr.struct({}), row: TypeExpr.struct({ v: TypeExpr.required(TypeExpr.text) }) };
async function probe(name: string, sql: string, expected: unknown, facade = false) {
  const started = performance.now();
  let result: unknown, error: string | null = null;
  try {
    if (facade) {
      const exit = await Effect.runPromiseExit(native.selectSql(contract, {}, () => sql, { timeoutMs: 15000 }));
      if (Exit.isFailure(exit)) error = String(exit.cause);
      else result = exit.value;
    } else result = await client.query(sql, [], undefined, { timeoutMs: 15000, parameterSyntax: "postgresql" });
  } catch (cause) { error = String(cause); }
  const record = { name, sql, expected, facade, result, error, elapsedMs: Math.round(performance.now() - started) };
  report.probes.push(record);
  appendFileSync(out + ".jsonl", JSON.stringify(record) + "\n");
  console.log(name, JSON.stringify({ result, error, elapsedMs: record.elapsedMs }));
}
try {
  for (const [name, sql] of [
    ["any-control", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY(ARRAY[1,2]) AND 1 = 1"],
    ["any-comment", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY/**/(ARRAY[1,2]) AND 1 = 1"],
    ["any-bare", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = ANY ARRAY[1,2] AND 1 = 1"],
    ["some-comment", "SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE k = SOME/**/(ARRAY[1,2]) AND 1 = 1"],
  ]) {
    let accepted = false, error = null;
    try { readOnlyNativeSql(sql); accepted = true; } catch (e) { error = String(e); }
    report.probes.push({ name: name + "-envelope", sql, accepted, error });
    await probe(name, sql, [{ v: "x" }], true);
  }
  for (const [name, expression] of [
    ["decimal-bigint", "CAST(CAST('1000000000000000004' AS DECIMAL(32,0)) AS BIGINT)"],
    ["decimal-text", "CAST('1000000000000000004' AS DECIMAL(32,0))"],
    ["text-bigint", "CAST('1000000000000000004' AS BIGINT)"],
  ]) await probe(name, `SELECT CAST(${expression} AS TEXT) AS v`, [{ v: "1000000000000000004" }]);
  for (const [op, zero] of [["+", "0"], ["*", "1"]] as const) {
    const query: any = { find: ["?y"], where: [["e", ":x", "?x"]], compute: [[op, "?x", integer(zero), "?y"]] };
    const compiled = compileXtdb(query, "cx-vx02-virtual", { integerVariables: ["?x"] });
    // Keep every placeholder and the adapter's generated conditions; replace only its physical relation.
    const relation = "(SELECT 'e' AS entity_id, ':x' AS attribute, 'integer' AS value_type, '1000000000000000004' AS value_string, 'cx-vx02-virtual' AS scope_key, 0 AS valid_from, NULL AS valid_to, 0 AS recorded_at, 1 AS recorded_position, NULL AS retracted_at, NULL AS retracted_position)";
    const sql = compiled.sql.replaceAll("tx_assertions FOR ALL VALID_TIME", relation + " AS cx_virtual");
    const params = compiled.params;
    const started = performance.now();
    let result, error = null;
    try { result = await client.query(sql, params, undefined, { timeoutMs: 15000, parameterSyntax: "postgresql" }); }
    catch (cause) { error = String(cause); }
    const record = { name: `compiler-${op}`, query, originalSql: compiled.sql, sql, params, result, error,
      expected: "1000000000000000004", elapsedMs: Math.round(performance.now() - started) };
    report.probes.push(record);
    appendFileSync(out + ".jsonl", JSON.stringify(record) + "\n");
    console.log(record.name, JSON.stringify({ result, error }));
  }
} finally { await client.close(); }
report.endedAt = new Date().toISOString();
writeFileSync(out, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
