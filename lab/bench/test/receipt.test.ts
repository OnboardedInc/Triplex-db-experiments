import assert from "node:assert/strict";
import { test } from "node:test";
import { alignAssertIds } from "../lib/receipt.ts";
test("blob assertion IDs bind content across SDK key order and reject different content", () => {
  const value = { type: "blob", value: "sha256:23bdfb45", mimeType: "image/jpeg", size: 173189 };
  const reordered = {
    size: 173189,
    mimeType: "image/jpeg",
    value: "sha256:23bdfb45",
    type: "blob",
  };
  const op = {
    op: "assert",
    entityId: "evt:3785:3329",
    attribute: ":evidence-note/k0",
    value,
    validFrom: 123,
  };
  const triple = {
    id: "actual-blob-id",
    entityId: op.entityId,
    attribute: op.attribute,
    value: reordered,
  };
  assert.notEqual(JSON.stringify(value), JSON.stringify(reordered));
  assert.deepEqual(alignAssertIds([op], { triples: [triple] } as any), ["actual-blob-id"]);
  assert.deepEqual(
    alignAssertIds([op], {
      triples: [{ ...triple, value: { ...reordered, size: 173190 } }],
    } as any),
    [null],
  );
  assert.deepEqual(alignAssertIds([op], { triples: [] } as any), [null]);
});
