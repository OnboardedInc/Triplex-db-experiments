/** Isolated read-only public parameter probe; no facts, schema or codecs are changed. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbClient, makeXtdbNativeQueries } from "@triplex-build/triplex-xtdb";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key: string) => args[args.indexOf(key) + 1]!;
assert(args.includes("--output") && args.includes("--checks-output"));
const admissionPath = realpathSync(process.env["TRIPLEX_RESOURCE_ADMISSION"] ?? "");
assert(admissionPath.startsWith(realpathSync(root) + path.sep));
const admissionBytes = readFileSync(admissionPath);
assert.equal(
  createHash("sha256").update(admissionBytes).digest("hex"),
  process.env["TRIPLEX_RESOURCE_ADMISSION_SHA256"],
);
const admission = JSON.parse(admissionBytes.toString());
assert.equal(admission.format, "triplex-devloop-resource-admission/1");
assert.equal(admission.proofPolicy, "portable-export-devloop-v1");
assert.equal(admission.state, "ADMITTED");
assert.equal(admission.localResourcesOnly, true);
assert.equal(path.resolve(admission.root), root);
assert.equal(admission.backend, "xtdb");
assert.equal(admission.queryPath, "xtdb-native");
process.kill(admission.controller.pid, 0);
const artifacts = path.resolve(root, admission.directory, "artifacts");
const output = path.resolve(option("--output"));
const checksOutput = path.resolve(option("--checks-output"));
for (const file of [output, checksOutput]) assert(file.startsWith(artifacts + path.sep));
const url = process.env["XTDB_URL"];
assert(url, "The commissioned owned server is required; this probe starts no service");

// SameValue distinguishes signed zero, unlike JSON numeric text. Capture both
// Object.is and big-endian IEEE754 bits before any JSON serialization. This is
// an observation tool, not evidence that any assertion has been stored or lost.
// https://tc39.es/ecma262/#sec-samevalue
// https://tc39.es/ecma262/#sec-dataview.prototype.setfloat64
const bits = (value: number) => {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, false);
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const describe = (value: unknown): Record<string, unknown> =>
  typeof value === "number"
    ? {
        nativeType: "number",
        display: Object.is(value, -0) ? "-0" : String(value),
        negativeZero: Object.is(value, -0),
        binary64: bits(value),
      }
    : { nativeType: typeof value, display: String(value) };
const rawValue = (row: unknown) =>
  typeof row === "object" && row !== null ? (row as Record<string, unknown>)["value"] : undefined;
const payloads = [
  { id: "negative-zero", value: -0, expectedBits: "8000000000000000" },
  { id: "positive-zero", value: 0, expectedBits: "0000000000000000" },
  { id: "minimum-positive", value: Number.MIN_VALUE, expectedBits: "0000000000000001" },
  { id: "minimum-negative", value: -Number.MIN_VALUE, expectedBits: "8000000000000001" },
  { id: "adjacent-to-tenth", value: 0.10000000000000002, expectedBits: "3fb999999999999b" },
  { id: "largest-safe-number", value: Number.MAX_SAFE_INTEGER, expectedBits: "433fffffffffffff" },
] as const;
for (const payload of payloads) assert.equal(bits(payload.value), payload.expectedBits);
const numberRecord = TypeExpr.struct({ value: TypeExpr.required(TypeExpr.number) });
const emptyRecord = TypeExpr.struct({});
const scope = DatabaseScope.test(`native-f64-probe-${randomUUID()}`);
const report: Record<string, any> = {
  format: "triplex-public-native-f64-parameter-probe/1",
  at: new Date().toISOString(),
  queryPath: "xtdb-native",
  scope,
  status: "RUNNING",
  applicationWrites: 0,
  observations: [],
  controls: [],
  limitations: [
    "Read-only parameter/literal observation; no assertion storage, data identity, full binary64 domain or performance qualification.",
    "Literal and string-to-double controls describe native language behavior and do not replace numeric parameter obligations.",
    "Ordinary JSON trace numbers erase signed zero; separate Object.is/binary64 fields are captured in memory before serialization.",
    "XtdbClient chooses OID20 for Number.isSafeInteger inputs, including -0. This source fact is an attribution hypothesis until measurements are inspected.",
  ],
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
const contractCases: Record<string, unknown>[] = [];
const controlCases: Record<string, unknown>[] = [];
for (const phase of ["current", "reopened"] as const) {
  const client = makeXtdbClient(url, { maxConnections: 1 });
  const native = makeXtdbNativeQueries(client, scope);
  try {
    for (const language of ["sql", "xtql"] as const)
      for (const payload of payloads) {
        const id = `${phase}/${language}/parameter/${payload.id}`;
        let builderInput: Record<string, unknown> | undefined;
        try {
          const method = language === "sql" ? native.selectSql : native.select;
          const answer = await Effect.runPromise(
            method(
              { name: `native-f64/${id}`, parameters: numberRecord, row: numberRecord },
              { value: payload.value },
              (ctx, input) => {
                const value = (input as { value: number }).value;
                builderInput = describe(value);
                const parameter = ctx.bind(value);
                return language === "sql"
                  ? `SELECT ${parameter} AS value`
                  : `(rel [{:value ${parameter}}] [value])`;
              },
              { basis: { recordedPosition: 0, validAt: 1.25 }, includeRaw: true, timeoutMs: 10000 },
            ),
          );
          assert.equal(answer.rows.length, 1);
          assert.equal(answer.basis.recordedPosition, 0);
          const value = (answer.rows[0] as { value: number }).value;
          const actualBits = typeof value === "number" ? bits(value) : null;
          const status = actualBits === payload.expectedBits ? "PASS" : "FAIL";
          contractCases.push({ id, expectedBits: payload.expectedBits, actualBits, status });
          report.observations.push({
            id,
            expectedBits: payload.expectedBits,
            status,
            input: describe(payload.value),
            builderInput,
            typedResult: describe(value),
            rawResult: describe(rawValue(answer.rawRows?.[0])),
            traceParameterObservations: answer.trace.parameters.map(describe),
            trace: answer.trace,
          });
        } catch (cause) {
          contractCases.push({
            id,
            expectedBits: payload.expectedBits,
            actualBits: null,
            status: "ERROR",
          });
          report.observations.push({
            id,
            input: describe(payload.value),
            builderInput,
            status: "ERROR",
            error: String(cause),
          });
        }
        save();
      }
    const controls = [
      {
        id: "sql/literal-negative-zero",
        language: "sql",
        query: "SELECT CAST('-0.0' AS DOUBLE) AS value",
      },
      {
        id: "sql/literal-positive-zero",
        language: "sql",
        query: "SELECT CAST('0.0' AS DOUBLE) AS value",
      },
      { id: "sql/string-parameter-negative-zero", language: "sql", textParameter: "-0.0" },
      {
        id: "xtql/literal-negative-zero",
        language: "xtql",
        query: "(rel [{:value -0.0}] [value])",
      },
      { id: "xtql/literal-positive-zero", language: "xtql", query: "(rel [{:value 0.0}] [value])" },
    ] as const;
    for (const control of controls) {
      const id = `${phase}/${control.id}`;
      try {
        const answer = await Effect.runPromise(
          (control.language === "sql" ? native.selectSql : native.select)(
            { name: `native-f64/${id}`, parameters: emptyRecord, row: numberRecord },
            {},
            (ctx) =>
              "textParameter" in control
                ? `SELECT CAST(${ctx.bind(control.textParameter)} AS DOUBLE) AS value`
                : control.query,
            { basis: { recordedPosition: 0, validAt: 1.25 }, includeRaw: true, timeoutMs: 10000 },
          ),
        );
        assert.equal(answer.rows.length, 1);
        controlCases.push({ id, status: "EXECUTED" });
        report.controls.push({
          id,
          status: "EXECUTED",
          typedResult: describe((answer.rows[0] as { value: number }).value),
          rawResult: describe(rawValue(answer.rawRows?.[0])),
          traceParameterObservations: answer.trace.parameters.map(describe),
          trace: answer.trace,
        });
      } catch (cause) {
        controlCases.push({ id, status: "ERROR" });
        report.controls.push({ id, status: "ERROR", error: String(cause) });
      }
      save();
    }
  } finally {
    await client.close();
  }
}
report.status =
  contractCases.every((entry) => entry.status === "PASS") &&
  controlCases.every((entry) => entry.status === "EXECUTED")
    ? "PASS_PARAMETER_SUBSET_ONLY"
    : "FAIL_PARAMETER_OR_CONTROL_SUBSET";
report.applicationWrites = 0;
save();
// The registered byte oracle expects preserved parameter bits. A discovered
// failure remains a failing gate; a completed probe is never relabelled PASS.
writeFileSync(
  checksOutput,
  JSON.stringify(
    { format: "triplex-native-f64-checks/1", cases: contractCases, controls: controlCases },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    status: report.status,
    parameterCases: contractCases.length,
    parameterFailures: contractCases.filter((entry) => entry.status !== "PASS").length,
    controls: controlCases.length,
    applicationWrites: 0,
  }),
);
