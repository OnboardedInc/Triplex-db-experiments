// [CX-VX02-2] Why: bind original verifier probes to detached 200d669; Rejected: changing product files.
/** CX-VX02: distinguish typed failures from defects, and probe the source guard boundaries. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Cause, Effect, Exit } from "effect";
import { integer } from "./target/packages/core/dist/index.js";
import { evaluateXtdbNativeWorkload } from "./target/packages/qualification/src/native/xtdb-workloads.ts";
import { evaluateXtqlReachability } from "./target/packages/qualification/src/native/xtdb-xtql-reach.ts";
import { loadQualificationBackend } from "./target/packages/qualification/src/index.ts";

const result: any = { at: new Date().toISOString(), inventory: [], guards: [], maps: [] };
// [CX-VX02] Why: error-name substring assertions miss an Effect Die carrying a TaggedError.
// Rejected: treating a class name in a stack trace as proof that catchTag can handle it.
for (const language of ["xtql", "xtdb-sql"] as const) {
  const select = () => Effect.succeed({ rows: [
    { ledger: "physical", total: integer("9223372036854775807") },
    { ledger: "reservation", total: integer("-1") },
  ], basis: { recordedPosition: 1 }, trace: { language } });
  const exit = await Effect.runPromiseExit(evaluateXtdbNativeWorkload(
    { select, selectSql: select } as any, { id: "07" },
    { id: "overflow", cut: { known_at: "1", valid_at: "0" }, parameters: { sku: { value: "S" } } },
    new Map(), [], language,
  ).pipe(Effect.catchTag("NativeIntegerOverflowError" as never, () => Effect.succeed("handled"))));
  assert(Exit.isSuccess(exit) && exit.value === "handled");
  result.inventory.push({ language, typedHandlerRecovered: true, hasDies: false });
}
for (const count of [100000, 100001]) {
  const calls: string[] = [];
  const exit = await Effect.runPromiseExit(evaluateXtqlReachability({
    id: "20", operation: "reachability_closure", p: { from: { value: "a" } }, a: x => x,
    call: (name) => {
      calls.push(name);
      return Effect.succeed(name.startsWith("reach-edge-count") ? [{ edges: integer(String(count)) }] : []);
    },
  }));
  assert.equal(Exit.isFailure(exit), count > 100000);
  if (Exit.isFailure(exit)) assert(!Cause.hasDies(exit.cause) && String(exit.cause).includes("NativeEngineHazardError"));
  result.guards.push({ count, calls, exit: String(exit), modelOnly: true });
}
const depthCalls: string[] = [];
const depthExit = await Effect.runPromiseExit(evaluateXtqlReachability({
  id: "20", operation: "reachability_closure", p: { from: { value: "c0" } }, a: x => x,
  call: (name) => {
    depthCalls.push(name);
    return Effect.succeed(name.startsWith("reach-edge-count") ? [{ edges: integer("9") }] : [{ incomplete: true }]);
  },
}));
assert(Exit.isFailure(depthExit) && !Cause.hasDies(depthExit.cause));
assert(String(depthExit.cause).includes("NativeRecursionDepthError"));
assert.equal(depthCalls.length, 9);
assert(!depthCalls.includes("reachability-closure"));
result.depth = { modelOnly: true, calls: depthCalls, exit: String(depthExit) };
delete process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE;
process.env.TRIPLEX_QUERY_PATH = "xtdb-native";
delete process.env.TRIPLEX_BACKEND;
result.unsetLanguage = (await loadQualificationBackend()).nativeLanguage;
assert.equal(result.unsetLanguage, undefined);
result.unsetLanguage = "historical-mixed (undefined)";
for (const p of ["core", "qualification", "xtdb"]) {
  const dir = `packages/${p}`;
  // Source-map equality proves the retained local exports correspond to reviewed source, without rebuilding it.
  const paths = p === "core" ? ["datalog/compiler"] : p === "qualification" ? ["index", "native/xtdb-workloads", "native/xtdb-exact-sum", "native/xtdb-xtql-reach", "native/xtdb-native-errors"] : ["index", "native/NativeQueries", "native/ReadOnlySql", "native/Sources", "native/Reachability", "query/compiler", "XtdbClient"];
  for (const f of paths) {
    const file = `${dir}/src/${f}.ts`, bytes = readFileSync(file, "utf8");
    const map = JSON.parse(readFileSync(`${dir}/dist/${f}.js.map`, "utf8"));
    const matches = map.sourcesContent?.includes(bytes) === true;
    assert(matches, `${file} does not match built source map`);
    result.maps.push({ file, sha256: createHash("sha256").update(bytes).digest("hex"), distSha256: createHash("sha256").update(readFileSync(`${dir}/dist/${f}.js`)).digest("hex"), matches });
  }
}
const output = process.argv[2] ?? "lab/verify/X02/offline-source.json";
if (!output.startsWith(import.meta.dirname + "/")) throw new Error("review output required");
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result, null, 2));
