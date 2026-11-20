import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.join(process.argv[2], "lab/experiments/EXP-DX1/w1/field");
const pathToTraffic = path.join(root, "traffic.ts");
const source = ts.createSourceFile(
  pathToTraffic,
  fs.readFileSync(pathToTraffic, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const change = {
  op: "assert",
  tripleId: "row",
  entityId: "subject",
  attribute: ":field",
  value: { type: "string", value: "stored" },
  recordedAt: 1001,
  validFrom: 2,
  validTo: 5,
  assertionTxId: "_tx/save",
};
const journalPath = path.join(root, "journal.ts");
let check;
if (fs.existsSync(journalPath)) {
  const { checkJournal } = await import(pathToFileURL(journalPath).href);
  const want = {
    tx: "_tx/save",
    position: 1,
    command: "save",
    clock: 1001,
    root: "subject",
    changes: [change],
  };
  const row = (attribute, value) => ({
    attribute: ":_tx/" + attribute,
    entity_id: want.tx,
    entity_type: "_Transaction",
    ...value,
  });
  check = (actual) =>
    checkJournal(
      [
        want.tx,
        1,
        [
          row("position", { value_number: 1 }),
          row("instant", { value_datetime: 1001 }),
          row("command-id", { value_string: "save" }),
          row("changed-entity", { value_string: "subject" }),
          row("change", { value_json: JSON.stringify(actual) }),
        ],
      ],
      want,
    );
} else {
  // [DX-WFIX1] Why: execute the comparator from the frozen branch, including its actual projection.
  // Rejected: restating the comparator in the test (a separate model can hide a missing content check).
  const comparisons = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "assert.deepEqual" &&
      node.arguments[0]?.getText(source).includes('fields("change")')
    )
      comparisons.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(comparisons.length, 1);
  const [comparison] = comparisons;
  const code = ts.transpileModule(comparison, {
    compilerOptions: { target: ts.ScriptTarget.ESNext },
  }).outputText;
  const compare = new Function("assert", "fields", "sortChanges", "wanted", "intent", code);
  check = (actual) =>
    compare(
      assert,
      () => [{ value_json: JSON.stringify(actual) }],
      (xs) => xs.sort((a, b) => a.tripleId.localeCompare(b.tripleId)),
      [change],
      { changes: ["assert/row"] },
    );
}

check(change);
for (const patch of [
  { recordedAt: 1002 },
  { validTo: 4 },
  { value: { type: "string", value: "other" } },
]) {
  assert.throws(
    () => check({ ...change, ...patch }),
    { code: "ERR_ASSERTION" },
    JSON.stringify(patch),
  );
}
