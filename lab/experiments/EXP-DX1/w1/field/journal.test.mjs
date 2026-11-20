import assert from "node:assert/strict";
import { test } from "node:test";
import { checkJournal } from "./journal.ts";

const middle = {
  op: "retract",
  tripleId: "middle",
  entityId: "subject",
  attribute: ":field/value",
  value: { type: "string", value: "intermediate value" },
  validFrom: 2,
  validTo: 20,
  recordedAt: 1001,
  retractedAt: 1002,
  assertionTxId: "_tx/a",
  retractionTxId: "_tx/b",
};
const current = {
  op: "assert",
  tripleId: "new",
  entityId: "subject",
  attribute: ":field/value",
  value: { type: "string", value: "final value" },
  validFrom: 3,
  recordedAt: 1002,
  assertionTxId: "_tx/b",
};
const intent = {
  tx: "_tx/b",
  position: 3,
  command: "b",
  clock: 1002,
  root: "subject",
  changes: [middle, current],
};
const row = (attribute, values) => ({
  attribute: ":_tx/" + attribute,
  value_string: null,
  value_json: null,
  value_datetime: null,
  value_number: null,
  ...values,
});
function observed(retraction = middle, command = "b") {
  return [
    "_tx/b",
    3,
    [
      row("position", { value_number: 3 }),
      row("command-id", { value_string: command }),
      row("changed-entity", { value_string: "subject" }),
      row("instant", { value_datetime: 1002 }),
      row("change", { value_json: JSON.stringify(current) }),
      ...(retraction ? [row("change", { value_json: JSON.stringify(retraction) })] : []),
    ],
  ];
}

test("rejects journal content changes with the same cursor and row IDs", () => {
  checkJournal(observed(), intent);
  for (const change of [
    { ...middle, recordedAt: 1000 },
    { ...middle, validFrom: 0 },
    { ...middle, value: { type: "string", value: "wrong value" } },
    null,
  ]) {
    assert.throws(() => checkJournal(observed(change), intent));
  }
  assert.throws(() => checkJournal(observed(middle, "a"), intent));
});
