import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWriterSplit } from "./adopted.ts";
import { checkCardWriterSplits, noTapeSaveLine, writerSplitLines } from "./writer-split-text.ts";

// [DX-S6] F5: the card fails a wide-writer run in which no eligible save took the per-subject writer.
const save = (over: Record<string, unknown>) => ({ status: "acked", saveKey: "k", owners: 2, ...over }) as never;
const pick = (x: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, x[k]]));
const narrow = <T>(f: () => T) => {
  const wide = process.env.TX2_SUBJECT_WIDE;
  delete process.env.TX2_SUBJECT_WIDE;
  try { return f(); } finally { if (wide === undefined) delete process.env.TX2_SUBJECT_WIDE; else process.env.TX2_SUBJECT_WIDE = wide; }
};
const tape = (facts: number, stage: Record<string, unknown> = {}) => ({ status: "acked", saveKey: "k", facts, retired: facts, stage }) as never;
const own = (taken: boolean) => ({ status: "acked", stage: taken ? { subjectSave: "f", subjectOrderedIds: true } : {} }) as never;

test("a per-subject arm in which every eligible save went to the general writer fails", () => {
  const general = [save({ stage: {} }), save({ stage: {} })];
  assert.throws(() => checkWriterSplit(general, "per-person-ordered", { subjectSave: true }), /no eligible save took the per-subject writer/);
});

test("with several owners or creations on, a tape M save on the general writer needs the gateway's reason", () => {
  const mixed = [save({ stage: { subjectSave: ":triplex.subject/create-x" } }), save({ stage: {} })];
  assert.throws(() => checkWriterSplit(mixed, "per-person-ordered", { subjectSave: true, subjectCreateFunction: "c" }),
    /1 tape M saves went to the general writer without a reason/);
  const explained = [save({ stage: { subjectSave: ":triplex.subject/create-x" } }), save({ stage: { subjectDeclined: "over-owner-bound" } })];
  const x = checkWriterSplit(explained, "per-person-ordered", { subjectSave: true, subjectCreateFunction: "c" });
  assert.deepEqual(pick(x, ["keyed", "eligible", "taken", "keyedGeneral", "ran", "rule"]),
    { keyed: 2, eligible: 2, taken: 1, keyedGeneral: 1, ran: true, rule: "wide-or-owners" });
});

test("a general arm, and saves the SDK sent with the general identity, are not counted", () => {
  assert.deepEqual(pick(checkWriterSplit([save({ stage: {} })], "per-person-ordered", { subjectSave: false }), ["keyed", "eligible", "ran", "rule"]),
    { keyed: 1, eligible: 0, ran: false, rule: "off" });
  assert.deepEqual(pick(checkWriterSplit([save({ stage: {}, generalIdentity: true })], "per-person-ordered", { subjectSave: true }), ["keyed", "eligible", "own"]),
    { keyed: 1, eligible: 0, own: 0 });
});

test("with the narrow rule, a save the rule sends to the general writer (more than three facts) is not counted", () => narrow(() => {
  const none = checkWriterSplit([tape(7), tape(15)], "per-person-ordered", { subjectSave: true });
  assert.deepEqual(pick(none, ["keyed", "eligible", "taken", "rule"]), { keyed: 2, eligible: 0, taken: 0, rule: "narrow" });
  assert.throws(() => checkWriterSplit([tape(2), tape(9)], "per-person-ordered", { subjectSave: true }),
    /no eligible save took the per-subject writer \(1 eligible\)/);
  process.env.TX2_SUBJECT_WIDE = "1";
  assert.throws(() => checkWriterSplit([tape(7)], "per-person-ordered", { subjectSave: true }), /no eligible save took/);
}));

test("the narrow rule's lower bound: a save of 0 facts (a retirement only) is not eligible", () => narrow(() => {
  const x = checkWriterSplit([tape(0), tape(1, { subjectSave: "f" })], "per-person-ordered", { subjectSave: true });
  assert.deepEqual([x.keyed, x.eligible, x.taken], [2, 1, 1]);
}));

test("each arm prints the two populations on separate lines, never summed", () => narrow(() => {
  const x = checkWriterSplit([tape(7), tape(12), own(true), own(true), own(true)], "per-person-ordered", { subjectSave: true });
  assert.deepEqual(writerSplitLines(x), ["per-subject writer: 0 eligible by the narrow rule of 2 keyed", "own saves: 3, 3 taken"]);
  process.env.TX2_SUBJECT_WIDE = "1";
  const w = checkWriterSplit([tape(7, { subjectSave: "f" }), tape(12)], "per-person-ordered", { subjectSave: true });
  assert.deepEqual(writerSplitLines(w), [
    "per-subject writer (wide writer or owners named): 2 eligible of 2 keyed, 1 taken; 1 keyed saves went to the general writer",
    "own saves: 0, 0 taken"]);
}));

test("per card, wide writer off: either population meets the rule; met only by own saves, the card says so", () => {
  const arm = (eligible: number, taken: number, own: number, ownTaken: number) =>
    ({ keyed: 14, eligible, taken, own, ownTaken, ran: true, rule: "narrow" as const });
  assert.deepEqual(checkCardWriterSplits([arm(0, 0, 28, 28), arm(0, 0, 0, 0)]).summary, [noTapeSaveLine]);
  assert.deepEqual(checkCardWriterSplits([arm(4, 4, 28, 28)]).summary, []);
  assert.throws(() => checkCardWriterSplits([arm(0, 0, 28, 27), arm(4, 3, 0, 0)]), /no arm with the per-subject option on had saves eligible for it that all took it/);
  assert.deepEqual(checkCardWriterSplits([{ keyed: 3, eligible: 0, taken: 0, ran: false, rule: "off" }]).arms, 0);
});

test("per card, wide writer on or owners named: own saves do not count; keyed N > 0 and M > 0 in one arm", () => {
  const arm = (eligible: number, taken: number, own: number) =>
    ({ keyed: eligible, eligible, taken, own, ownTaken: own, keyedGeneral: eligible - taken, ran: true, rule: "wide-or-owners" as const });
  assert.equal(checkCardWriterSplits([arm(10, 3, 0)]).rule, "wide-or-owners");
  assert.throws(() => checkCardWriterSplits([arm(0, 0, 28), arm(10, 0, 5)]), /no arm on the product save path had keyed saves that took/);
});
