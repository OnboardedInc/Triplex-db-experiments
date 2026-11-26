import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWriterSplit } from "./adopted.ts";
import { checkCardWriterSplits, writerSplitText } from "./writer-split-text.ts";

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
  assert.deepEqual(checkWriterSplit(explained, "per-person-ordered", { subjectSave: true, subjectCreateFunction: "c" }), { keyed: 2, eligible: 2, taken: 1, ran: true, rule: "narrow" });
});

test("a general arm, and saves the SDK sent with the general identity, are not counted", () => {
  assert.deepEqual(checkWriterSplit([save({ stage: {} })], "per-person-ordered", { subjectSave: false }), { keyed: 1, eligible: 0, taken: 0, ran: false, rule: "off" });
  assert.deepEqual(checkWriterSplit([save({ stage: {}, generalIdentity: true })], "per-person-ordered", { subjectSave: true }), { keyed: 1, eligible: 0, taken: 0, ran: true, rule: "narrow" });
});

test("with the narrow rule, a save the rule sends to the general writer (more than three facts) is not counted", () => {
  const wide = process.env.TX2_SUBJECT_WIDE;
  delete process.env.TX2_SUBJECT_WIDE;
  try {
    const tape = (facts: number) => ({ status: "acked", saveKey: "k", facts, retired: facts, stage: {} }) as never;
    const none = checkWriterSplit([tape(7), tape(15)], "per-person-ordered", { subjectSave: true });
    assert.deepEqual(none, { keyed: 2, eligible: 0, taken: 0, ran: true, rule: "narrow" });
    assert.equal(writerSplitText(none), "per-subject writer: not exercised (0 eligible by the narrow rule of 2 keyed)");
    assert.throws(() => checkWriterSplit([tape(2), tape(9)], "per-person-ordered", { subjectSave: true }),
      /no eligible save took the per-subject writer \(1 eligible\)/);
    process.env.TX2_SUBJECT_WIDE = "1";
    assert.throws(() => checkWriterSplit([tape(7)], "per-person-ordered", { subjectSave: true }), /no eligible save took/);
  } finally {
    if (wide === undefined) delete process.env.TX2_SUBJECT_WIDE; else process.env.TX2_SUBJECT_WIDE = wide;
  }
});

test("the narrow rule's lower bound: a save of 0 facts (a retirement only) is not eligible", () => {
  const wide = process.env.TX2_SUBJECT_WIDE;
  delete process.env.TX2_SUBJECT_WIDE;
  try {
    const rows = [{ status: "acked", saveKey: "k", facts: 0, retired: 0, stage: {} }, { status: "acked", saveKey: "k", facts: 1, retired: 1, stage: { subjectSave: "f" } }] as never;
    const x = checkWriterSplit(rows, "per-person-ordered", { subjectSave: true });
    assert.deepEqual([x.keyed, x.eligible, x.taken], [2, 1, 1]);
    assert.equal(writerSplitText(x), "per-subject writer: 1 eligible by the narrow rule, 1 taken (of 2 keyed)");
  } finally {
    if (wide === undefined) delete process.env.TX2_SUBJECT_WIDE; else process.env.TX2_SUBJECT_WIDE = wide;
  }
});

test("per card: at least one arm with the option on has eligible saves that all took the per-subject writer", () => {
  const on = (eligible: number, taken: number) => ({ keyed: 20, eligible, taken, ran: true, rule: "narrow" as const });
  assert.deepEqual(checkCardWriterSplits([on(0, 0), on(6, 6)]), { arms: 2, exercised: 1 });
  assert.throws(() => checkCardWriterSplits([on(0, 0), on(0, 0)]), /no arm with the per-subject option on had eligible saves that all took it/);
  assert.throws(() => checkCardWriterSplits([on(6, 5)]), /no arm with the per-subject option on/);
  assert.deepEqual(checkCardWriterSplits([{ keyed: 3, eligible: 0, taken: 0, ran: false, rule: "off" }]), { arms: 0, exercised: 0 });
});
