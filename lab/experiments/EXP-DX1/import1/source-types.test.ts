import assert from "node:assert/strict";
import test from "node:test";
import { fileSource, type Group } from "./source.ts";
const meta = {
  source: "exact-export",
  generation: "one",
  mode: "history" as const,
  groups: 1,
  validAt: 1,
};
const fact = {
  op: "assert",
  ref: "a",
  entityId: "subject",
  attribute: ":units",
  validFrom: 0,
  value: { type: "integer", value: "9007199254740993" },
};
function stage(op: unknown) {
  return fileSource(":memory:", meta, [
    { ordinal: 0, id: "source-save", instant: 1, ops: [op] } as Group,
  ]);
}
test("raw export fields reject numeric coercion before a target exists", () => {
  const accepted = stage(fact);
  try {
    assert.deepEqual(accepted.group(0).ops, [fact]);
  } finally {
    accepted.close();
  }
  for (const malformed of [
    { ...fact, value: JSON.parse('{"type":"integer","value":9007199254740993}') },
    { ...fact, ref: 7 },
    { ...fact, entityId: true },
    { ...fact, attribute: 42 },
    { ...fact, value: { type: "blob", value: "fixture", size: 2, mimeType: { bad: "type" } } },
  ])
    assert.throws(() => stage(malformed));
});
