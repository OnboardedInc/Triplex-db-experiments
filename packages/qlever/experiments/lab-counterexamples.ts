import { qleverLatencyReceipt } from "../../../lab/receipts/latency.mjs";
import { qleverConnectionModeOf } from "../src/QleverClient.js";
/** Lab G4 entry (lane Q): the raw QLever semantic counterexamples through the public native
 * SPARQL surface (`makeQleverNativeQueries().select`) against one lab slot, scored against their
 * ORIGINAL oracles. On the pinned QLever 0.6.0 the counterexamples are expected to FAIL; this is
 * the A0 baseline that EXP-Q03 has to beat, never a pass condition.
 *
 * [EXP-002] Why: R5 reproduced the failures in a throwaway probe container over raw N-Triples
 * (lab/research/R5-probe/). G4 needs the same shapes on our own engine, through the surface an
 * application uses, with bound receipts. Cases:
 *   STR.*   tiny collation control (qualification/native-controls/qlever-collation-tiny-v1):
 *           labels written through the public Triplex writer, read with the unedited native query
 *           `ORDER BY STR(?label) STR(?entity)`, and its two ranges `> "E"` and `< "c"`.
 *           Oracle O-COLL: oracle.json (expectedAscendingIds, expectedGreaterThanE); `< "c"` has no
 *           array in oracle.json, so its answer is derived here from oracle.json's rows by Unicode
 *           codepoint comparison (SPARQL 1.1 operator mapping for simple literals).
 *   STR.iri-order  the page-sample IRI class (R5 A3, probe T1h) as VALUES IRIs (local vocabulary;
 *           R5 T1f shows local and stored words use the same comparator). Oracle: codepoint order,
 *           computed here. Note: R5's printed expectation "A1 E1 cE cc ce c1 z1" is not codepoint
 *           order ('1' U+0031 < 'E' U+0045); the computed order is A1 E1 c1 cE cc ce z1.
 *   NEG.*   correlated EXISTS controls, query text unedited from
 *           packages/qlever/experiments/native-query-shapes.ts (flat, nested) and R5 probe1/probe3
 *           (positive EXISTS N4, OPTIONAL+!BOUND N8). Oracle O-SHAPE: SPARQL 1.1 substitution
 *           semantics (only `two` for NOT EXISTS / OPTIONAL+!BOUND, only `one` for EXISTS).
 *   CTRL.*  re-bound NOT EXISTS (R5 N5), expected `two` and expected to PASS: shows this entry and
 *           surface can pass, so the counterexample FAILs are not vacuous.
 * Modes: `current` reads right after the write; `reopen` reads the SAME scope again through a new
 * client and a new native query object (a second independent opening), with no rewrite.
 * Rejected: R5's raw INSERT of fixture.nt into a hand-made graph (a raw write on the shared engine
 * outside the Triplex writer); N6 MINUS (with no shared variable SPARQL 1.1 MINUS removes nothing,
 * so QLever's `one, two` is the spec answer and not a counterexample; R5 labelled it "expected two").
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeQleverClient,
  makeQleverNativeQueries,
  makeQleverRuntime,
} from "@triplex-build/triplex-qlever";
import { labQleverUrl } from "./lab-endpoint.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const output = path.resolve(option("--output") ?? "");
assert.ok(output.startsWith(path.join(root, "runs") + path.sep), "--output must be under runs/");
const ownerFile = process.env["TRIPLEX_LAB_SLOT_OWNER"];
assert.ok(ownerFile, "TRIPLEX_LAB_SLOT_OWNER is required (lab/bin/gate.mjs sets it)");
const ownerPath = realpathSync(ownerFile);
assert.ok(/\/lab\/locks\/qlever-(dev|s[1-9])\/owner\.json$/.test(ownerPath));
const ownerBytes = readFileSync(ownerPath);
const owner = JSON.parse(ownerBytes.toString("utf8"));
const url = labQleverUrl();
assert.equal(owner.endpoint, url, "QLEVER_URL differs from the held slot's endpoint");

const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const oracleFile = "qualification/native-controls/qlever-collation-tiny-v1/oracle.json";
const oracleBytes = readFileSync(path.join(root, oracleFile));
const oracle = JSON.parse(oracleBytes.toString("utf8"));
assert.equal(oracle.format, "triplex-native-qlever-tiny-sort-oracle/1");
const suffix = (entity: string) => entity.slice("urn:triplex-sort:".length);
const rows: { id: string; label: string }[] = oracle.rows.map((row: any) => ({
  id: suffix(row.entity),
  label: row.label,
}));
// Unicode codepoint comparison of two strings (scalar values, not UTF-16 units).
const codepointCompare = (a: string, b: string) => {
  const x = Array.from(a, (c) => c.codePointAt(0)!),
    y = Array.from(b, (c) => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return x.length - y.length;
};
const lessThanC = rows.filter((row) => codepointCompare(row.label, "c") < 0).map((row) => row.id);
const iris = ["A1", "E1", "c1", "z1", "cE", "cc", "ce"];
const iriExpected = [...iris].sort(codepointCompare);

const runId = randomUUID();
const scope = DatabaseScope.test(`lab-g4-qlever-${runId}`);
const Label = Attribute.text(":lab-g4/label");
const struct = (fields: Record<string, TypeExpr.TypeExpr>) =>
  TypeExpr.struct(
    Object.fromEntries(Object.entries(fields).map(([key, type]) => [key, TypeExpr.required(type)])),
  );
const report: Record<string, any> = qleverLatencyReceipt({
  qleverConnectionMode: qleverConnectionModeOf(),
  format: "tx2-lab-counterexamples/1",
  runId,
  lane: "qlever",
  surface: "qlever-native (makeQleverNativeQueries().select, public dist)",
  endpoint: url,
  scope,
  admission: { path: ownerPath, sha256: sha(ownerBytes) },
  oracles: { [oracleFile]: sha(oracleBytes) },
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  write: null as unknown,
  executions: [] as Record<string, unknown>[],
});
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");

// Exact negation texts. NEG.flat / NEG.nested are the native-query-shapes.ts builders verbatim.
const correlation = (nested: boolean) =>
  `SELECT ?revision WHERE { ${nested ? "{ SELECT ?revision ?order WHERE {" : ""} VALUES (?revision ?order) { ("one" "01") ("two" "02") } ${nested ? "} }" : ""} FILTER NOT EXISTS { ${nested ? "{ SELECT ?laterOrder WHERE {" : ""} VALUES ?laterOrder { "01" "02" } ${nested ? "} }" : ""} FILTER(?laterOrder > ?order) } }`;
const V = `VALUES (?revision ?order) { ("one" "01") ("two" "02") }`,
  LO = `VALUES ?laterOrder { "01" "02" }`;

type Case = {
  id: string;
  kind: "counterexample" | "control";
  expectedBaseline: "FAIL" | "PASS";
  oracleId: string;
  oracleSource: string;
  compare: "ordered" | "set";
  expected: string[];
  row: TypeExpr.TypeExpr;
  column: string;
  build: (ctx: any) => string;
  needsData: boolean;
  project?: (value: string) => string;
};
const labelRow = struct({ entity: TypeExpr.text, label: Label.type });
const revisionRow = struct({ revision: TypeExpr.text });
const cases: Case[] = [
  {
    id: "STR.order",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-COLL",
    oracleSource: `${oracleFile} expectedAscendingIds`,
    compare: "ordered",
    expected: oracle.expectedAscendingIds,
    row: labelRow,
    column: "entity",
    needsData: true,
    build: (ctx) =>
      `SELECT ?entity ?label WHERE { ${ctx.fact("?entity", Label, "?label")} } ORDER BY STR(?label) STR(?entity)`,
  },
  {
    id: "STR.range-gt-E",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-COLL",
    oracleSource: `${oracleFile} expectedGreaterThanE`,
    compare: "set",
    expected: oracle.expectedGreaterThanE,
    row: labelRow,
    column: "entity",
    needsData: true,
    build: (ctx) =>
      `SELECT ?entity ?label WHERE { ${ctx.fact("?entity", Label, "?label")} FILTER(STR(?label) > ${ctx.literal("E")}) } ORDER BY STR(?entity)`,
  },
  {
    id: "STR.range-lt-c",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-COLL",
    oracleSource: `${oracleFile} rows, codepoint < "c" (derived in this entry)`,
    compare: "set",
    expected: lessThanC,
    row: labelRow,
    column: "entity",
    needsData: true,
    build: (ctx) =>
      `SELECT ?entity ?label WHERE { ${ctx.fact("?entity", Label, "?label")} FILTER(STR(?label) < ${ctx.literal("c")}) } ORDER BY STR(?entity)`,
  },
  {
    id: "STR.iri-order",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-COLL",
    oracleSource: "codepoint order of the IRI strings (R5 A3 / probe T1h class), computed in this entry",
    compare: "ordered",
    expected: iriExpected,
    row: struct({ s: TypeExpr.text }),
    column: "s",
    needsData: false,
    // [EXP-002] First run G4-qlever-20261107T191201Z-ad15e2 compared full IRIs with suffixes.
    project: (value) => value.replace(/^urn:triplex:s:/, ""),
    build: () =>
      `SELECT (STR(?iri) AS ?s) WHERE { VALUES ?iri { ${iris.map((name) => `<urn:triplex:s:${name}>`).join(" ")} } } ORDER BY STR(?iri)`,
  },
  ...[false, true].map(
    (nested): Case => ({
      id: nested ? "NEG.not-exists-nested" : "NEG.not-exists-flat",
      kind: "counterexample",
      expectedBaseline: "FAIL",
      oracleId: "O-SHAPE",
      oracleSource:
        "native-feature-matrix.json raw-outer-filter-correlated-not-exists; SPARQL 1.1 substitution",
      compare: "set",
      expected: ["two"],
      row: revisionRow,
      column: "revision",
      needsData: false,
      build: () => correlation(nested),
    }),
  ),
  {
    id: "NEG.exists-flat",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-SHAPE",
    oracleSource: "R5 probe1 N4; SPARQL 1.1 substitution",
    compare: "set",
    expected: ["one"],
    row: revisionRow,
    column: "revision",
    needsData: false,
    build: () => `SELECT ?revision WHERE { ${V} FILTER EXISTS { ${LO} FILTER(?laterOrder > ?order) } }`,
  },
  {
    id: "NEG.optional-not-bound",
    kind: "counterexample",
    expectedBaseline: "FAIL",
    oracleId: "O-SHAPE",
    oracleSource: "R5 probe1 N8; SPARQL 1.1 LeftJoin filter sees both sides",
    compare: "set",
    expected: ["two"],
    row: revisionRow,
    column: "revision",
    needsData: false,
    build: () =>
      `SELECT ?revision WHERE { ${V} OPTIONAL { ${LO} FILTER(?laterOrder > ?order) } FILTER(!BOUND(?laterOrder)) }`,
  },
  {
    id: "CTRL.not-exists-rebound",
    kind: "control",
    expectedBaseline: "PASS",
    oracleId: "O-SHAPE",
    oracleSource: "R5 probe1 N5; SPARQL 1.1 substitution",
    compare: "set",
    expected: ["two"],
    row: revisionRow,
    column: "revision",
    needsData: false,
    build: () =>
      `SELECT ?revision WHERE { ${V} FILTER NOT EXISTS { ${V} ${LO} FILTER(?laterOrder > ?order) } }`,
  },
];

const writeLabels = async () => {
  const started = performance.now();
  const receipt = await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      return yield* triples.assertBatch(
        rows.map((row) => ({
          entityId: EntityId.make(row.id),
          attribute: Label.key,
          value: string(row.label),
          validFrom: 0,
        })),
      );
    }).pipe(
      Effect.provide(makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
  return { receipt, elapsedMs: performance.now() - started, labels: rows.length };
};

const runMode = async (mode: "current" | "reopen") => {
  // A new client and native query object per mode: `reopen` is a second independent opening.
  const native = makeQleverNativeQueries(makeQleverClient(url, { timeoutMs: 20_000 }), scope);
  for (const entry of cases) {
    const started = performance.now();
    const execution: Record<string, any> = {
      caseId: entry.id,
      mode,
      kind: entry.kind,
      expectedBaseline: entry.expectedBaseline,
      oracleId: entry.oracleId,
      oracleSource: entry.oracleSource,
      compare: entry.compare,
      expected: entry.expected,
    };
    try {
      const result = await Effect.runPromise(
        native.select(
          { name: `lab-g4/${entry.id}`, parameters: struct({}), row: entry.row },
          {},
          (ctx) => entry.build(ctx),
          { basis: { validAt: 1 }, maxRows: 100, timeoutMs: 20_000, includeRaw: true },
        ),
      );
      const actual = (result.rows as Record<string, any>[]).map((row) =>
        (entry.project ?? String)(String(row[entry.column])),
      );
      const left = entry.compare === "set" ? [...actual].sort() : actual;
      const right = entry.compare === "set" ? [...entry.expected].sort() : entry.expected;
      execution.actual = actual;
      execution.status = JSON.stringify(left) === JSON.stringify(right) ? "PASS" : "FAIL";
      execution.query = result.trace.query;
      execution.rawResultSha256 = sha(JSON.stringify((result as any).rawRows ?? result.rows));
      execution.trace = result.trace;
    } catch (error) {
      execution.status = "ERROR";
      execution.error = String(error).slice(0, 4000);
    }
    execution.matchesBaseline = execution.status === entry.expectedBaseline;
    execution.elapsedMs = performance.now() - started;
    report.executions.push(execution);
    save();
  }
};

try {
  report.write = await writeLabels();
  save();
  await runMode("current");
  await runMode("reopen");
  const executions = report.executions as any[];
  report.counts = {
    executed: executions.length,
    pass: executions.filter((e) => e.status === "PASS").length,
    fail: executions.filter((e) => e.status === "FAIL").length,
    error: executions.filter((e) => e.status === "ERROR").length,
    matchesBaseline: executions.filter((e) => e.matchesBaseline).length,
  };
  report.status = "COMPLETE";
} catch (error) {
  report.status = "HARNESS_ERROR";
  report.error = String(error).slice(0, 4000);
  process.exitCode = 1;
} finally {
  report.endedAt = new Date().toISOString();
  save();
}
console.log(JSON.stringify({ output, status: report.status, counts: report.counts }));
