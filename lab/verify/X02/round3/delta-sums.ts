// [CX-VX02-2] Why: bind original verifier probes to detached 200d669; Rejected: changing product files.
/** CX-VX02: run the actual sum builders over data-free native relations on the shared resident. */
import { writeFileSync, appendFileSync } from "node:fs";
import { Cause, Effect, Exit } from "effect";
import { DatabaseScope } from "./target/packages/core/dist/runtime/index.js";
import { makeXtdbClient, makeXtdbNativeQueries } from "./target/packages/xtdb/src/index.ts";
import { evaluateXtdbNativeWorkload } from "./target/packages/qualification/src/native/xtdb-workloads.ts";

// [CX-VX02] Why: public providers and authored builders exercise real engine arithmetic without fixture writes.
// Rejected: accepting the BigInt simulator as proof of the engine's arithmetic or error channel.
if (process.env.DOCKER_HOST !== "unix:///Users/sam/.colima/triplex2/docker.sock") throw new Error("private endpoint required");
const out = process.argv[2];
if (!out?.startsWith(import.meta.dirname + "/")) throw new Error("review output required");
const client = makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5470/xtdb", { maxConnections: 1 });
const native = makeXtdbNativeQueries(client, DatabaseScope.test("cx-vx02-sum-probes"));
const MAX = 2n ** 63n - 1n, MIN = -(2n ** 63n), K = 2n ** 32n;
type F = { entity_id: string; attribute: string; value_type: string; value_string: string };
const attribute = (id: string, field: string) => `:w${id}/a${Buffer.from(field).toString("hex")}`;
const facts = (id: string, entity: string, fields: Record<string, string | bigint>) => Object.entries(fields).map(([f, value]) => ({ entity_id: entity, attribute: attribute(id, f), value_type: typeof value === "bigint" ? "integer" : "string", value_string: String(value) }));
const tests: any[] = [];
for (const [name, ns] of Object.entries({ near1e18: [1000000000000000004n], max: [MAX], min: [MIN], maxPlus1: [MAX, 1n], minMinus1: [MIN, -1n], three2p62: [2n ** 62n, 2n ** 62n, 2n ** 62n], cancellation: [MAX, MAX, -MAX, -MAX, 5n], carryCounterexample: [MAX, K, -(K - 1n), -(K - 1n)] })) {
  const total = ns.reduce((a, b) => a + b, 0n);
  tests.push({ id: "06", name, op: "account_balance", parameters: { account: { value: "A" }, currency: { value: "USD" } },
    facts: ns.flatMap((n, i) => facts("06", `p${i}`, { account: "A", currency: "USD", amount: n })), expected: total < MIN || total > MAX ? "integer-overflow" : [[String(total)]] });
}
tests.push({ id: "07", name: "availableOverflow", op: "inventory_balance", parameters: { sku: { value: "S" } },
  facts: [...facts("07", "p", { sku: "S", ledger: "physical", delta: MAX }), ...facts("07", "r", { sku: "S", ledger: "reservation", delta: -1n })], expected: "integer-overflow" });
tests.push({ id: "08", name: "netCancelsOverflowingSides", op: "customer_net_revenue", parameters: { customer: { value: "C" }, currency: { value: "USD" } },
  facts: [...facts("08", "c1", { customer: "C", currency: "USD", amount: MAX }), ...facts("08", "c2", { customer: "C", currency: "USD", amount: MAX }), ...facts("08", "r1", { capture: "c1", currency: "USD", amount: MAX }), ...facts("08", "r2", { capture: "c2", currency: "USD", amount: MAX - 5n })], expected: [["5"]] });
tests.push({ id: "07", name: "availableUnderflow", op: "inventory_balance", parameters: { sku: { value: "S" } },
  facts: [...facts("07", "p", { sku: "S", ledger: "physical", delta: MIN }), ...facts("07", "r", { sku: "S", ledger: "reservation", delta: 1n })], expected: "integer-overflow" });
for (const ledger of ["physical", "reservation"]) tests.push({ id: "07", name: `ledgerOverflow-${ledger}`, op: "inventory_balance", parameters: { sku: { value: "S" } },
  facts: [...facts("07", "p", { sku: "S", ledger, delta: MAX }), ...facts("07", "q", { sku: "S", ledger, delta: 1n })], expected: "integer-overflow" });
for (const direction of ["positive", "negative"]) tests.push({ id: "08", name: `netOverflow-${direction}`, op: "customer_net_revenue", parameters: { customer: { value: "C" }, currency: { value: "USD" } },
  facts: direction === "positive" ? [...facts("08", "c1", {customer:"C",currency:"USD",amount:MAX}),...facts("08", "c2", {customer:"C",currency:"USD",amount:1n})] : [...facts("08", "c1", {customer:"C",currency:"USD",amount:0n}),...facts("08", "r1", {capture:"c1",currency:"USD",amount:MAX}),...facts("08", "r2", {capture:"c1",currency:"USD",amount:2n})], expected: "integer-overflow" });
const report: any = { startedAt: new Date().toISOString(), method: "real builders/providers, virtual facts relation; diagnostic, not persisted-fixture acceptance", controls: [] };
writeFileSync(out + ".jsonl", JSON.stringify({ ...report, controls: undefined }) + "\n", { flag: "wx" });
const lit = (s: string) => "'" + s.replaceAll("'", "''") + "'";
try {
  for (const test of tests) for (const language of ["xtql", "xtdb-sql"] as const) {
    const columns = ["entity_id", "attribute", "value_type", "value_string"];
    const relation = language === "xtql"
      ? `(rel [${test.facts.map((r: F) => `{${columns.map(k => `:${k} ${JSON.stringify(r[k as keyof F])}`).join(" ")}}`).join(" ")}] [${columns.join(" ")}])`
      : `(SELECT * FROM (VALUES ${test.facts.map((r: F) => `(${columns.map(k => lit(r[k as keyof F])).join(",")})`).join(",")}) virtual_facts (${columns.join(",")}))`;
    const call = (method: "select" | "selectSql") => (contract: any, params: any, build: any, options: any) => native[method](contract, params, (ctx, p) => build({ ...ctx, facts: () => relation }, p), { ...options, timeoutMs: 15000 });
    const trace: any[] = [], started = performance.now();
    const program = evaluateXtdbNativeWorkload({ select: call("select"), selectSql: call("selectSql") } as any,
      { id: test.id }, { id: test.name, operation: test.op, parameters: test.parameters, cut: { known_at: "1", valid_at: "0" } }, new Map(), trace, language);
    const exit = await Effect.runPromiseExit(program);
    const rows = Exit.isSuccess(exit) ? exit.value.map(r => r.map((v: any) => v?.value ?? v)) : null;
    const error = Exit.isFailure(exit) ? String(exit.cause) : null;
    const isDefect = Exit.isFailure(exit) && Cause.hasDies(exit.cause);
    const pass = typeof test.expected === "string" ? !isDefect && error?.includes("NativeIntegerOverflowError") === true : JSON.stringify(rows) === JSON.stringify(test.expected);
    let recovered: unknown;
    if (test.expected === "integer-overflow") {
      const recovery = await Effect.runPromiseExit(program.pipe(Effect.catchTag("NativeIntegerOverflowError" as never, () => Effect.succeed("handled"))));
      recovered = Exit.isSuccess(recovery) ? recovery.value : String(recovery.cause);
    }
    const record = { recovered, name: test.name, id: test.id, language, expected: test.expected, rows, error, isDefect, pass: pass && (test.expected !== "integer-overflow" || recovered === "handled"), trace, elapsedMs: Math.round(performance.now() - started) };
    report.controls.push(record); appendFileSync(out + ".jsonl", JSON.stringify(record) + "\n");
    console.log(pass ? "PASS" : "FAIL", test.name, language, JSON.stringify({ rows, error }));
  }
} finally { await client.close(); }
report.endedAt = new Date().toISOString();
writeFileSync(out, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
