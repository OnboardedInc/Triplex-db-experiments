// Answer checking only. No facts, mutations or candidate compiler are produced here.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const typedVariables = [
  "?entity",
  "?code",
  "?count",
  "?enabled",
  "?instant",
  "?data",
  "?owner",
  "?blob",
];
// Independently transcribed from unchanged upstream conformance case8 assertions.
const typedValues = ["42", "007", 7, true, 1700000000000, '{"ok":true}', "7", "sha256:artifact"];
const canonical = (rows) => rows.map((row) => JSON.stringify(row)).sort();

export const checkTypedAnswers = (width, rows, variables = typedVariables.slice(0, width + 1)) => {
  assert.ok([1, 2, 4, 6, 7].includes(width), "Only predeclared typed prefix widths are accepted");
  assert.equal(variables.length, width + 1);
  const expected = [typedValues.slice(0, width + 1)];
  const actual = rows.map((row) => variables.map((variable) => row[variable]));
  assert.deepEqual(canonical(actual), canonical(expected));
  return { status: "PASS", width, expectedRows: expected, observedRows: actual };
};

export const checkMtlAnswers = (caseId, rows, sessionVariable = "?session") => {
  const packet = JSON.parse(
    readFileSync(path.join(root, "qualification/workloads/temporal-workloads.json"), "utf8"),
  );
  const fixture = packet.workloads.find((workload) => workload.id === "17");
  const expectedCase = fixture.cases.find((entry) => entry.id === caseId);
  assert.ok(expectedCase, `Unknown frozen workload17 case: ${caseId}`);
  const expected = expectedCase.expected_rows.map((row) => row.map((value) => value.value));
  const actual =
    expectedCase.operation === "session_conversion"
      ? [[rows.length > 0]]
      : rows.map((row) => [row[sessionVariable]]);
  assert.deepEqual(canonical(actual), canonical(expected));
  return { status: "PASS", caseId, expectedRows: expected, observedRows: actual };
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const input = path.resolve(process.argv[2]);
  const output = path.resolve(process.argv[3]);
  assert.ok(input.startsWith(path.join(root, "qualification") + path.sep));
  assert.ok(output.startsWith(path.join(root, "qualification") + path.sep));
  const artifact = JSON.parse(readFileSync(input, "utf8"));
  const checks = [
    ...(artifact.typed ?? []).map((entry) => ({
      candidate: entry.candidate,
      ...checkTypedAnswers(entry.width, entry.rows, entry.variables),
    })),
    ...(artifact.mtl ?? []).map((entry) => ({
      candidate: entry.candidate,
      ...checkMtlAnswers(entry.caseId, entry.rows, entry.sessionVariable),
    })),
  ];
  assert.ok(checks.length, "No executed candidate answers were supplied");
  writeFileSync(
    output,
    JSON.stringify(
      {
        format: "qlever-wide-independent-oracle/1",
        source: input,
        checks,
        status: "PASS_ANSWERS_ONLY",
        limitations: "Does not establish public runtime, resource, scale or latency qualification",
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ status: "PASS_ANSWERS_ONLY", checks: checks.length, output }));
}
