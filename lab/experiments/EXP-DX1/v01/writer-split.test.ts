import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWriterSplit } from "./adopted.ts";

// [DX-S6] F5: the card fails a wide-writer run in which no eligible save took the per-subject writer.
const save = (over: Record<string, unknown>) => ({ status: "acked", saveKey: "k", owners: 2, ...over }) as never;

test("a per-subject arm in which every eligible save went to the general writer fails", () => {
  const general = [save({ stage: {} }), save({ stage: {} })];
  assert.throws(() => checkWriterSplit(general, "per-person-ordered", { subjectSave: true }), /no eligible save took the per-subject writer/);
});

test("with several owners or creations on, a tape M save on the general writer needs the gateway's reason", () => {
  const mixed = [save({ stage: { subjectSave: ":triplex.subject/create-x" } }), save({ stage: {} })];
  assert.throws(() => checkWriterSplit(mixed, "per-person-ordered", { subjectSave: true, subjectCreateFunction: "c" }),
    /1 tape M saves went to the general writer without a reason/);
  const explained = [save({ stage: { subjectSave: ":triplex.subject/create-x" } }), save({ stage: { subjectDeclined: "over-owner-bound" } })];
  assert.deepEqual(checkWriterSplit(explained, "per-person-ordered", { subjectSave: true, subjectCreateFunction: "c" }), { eligible: 2, taken: 1 });
});

test("a general arm, and saves the SDK sent with the general identity, are not counted", () => {
  assert.deepEqual(checkWriterSplit([save({ stage: {} })], "per-person-ordered", { subjectSave: false }), { eligible: 0, taken: 0 });
  assert.deepEqual(checkWriterSplit([save({ stage: {}, generalIdentity: true })], "per-person-ordered", { subjectSave: true }), { eligible: 0, taken: 0 });
});
