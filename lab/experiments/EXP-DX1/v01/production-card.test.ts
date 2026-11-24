import assert from "node:assert/strict";
import { test } from "node:test";
import { cells, productionArms } from "../prep1/server-tape.ts";
import { cardTapeReport, commitAssertions, defaultCardTape, readQueueOptionsSet, fullCellTape, isProduction, ladderFacts, newRunTape, parseCardTape, productionCellMetrics, tapeBinding, writerOptionsSet } from "./production-card.ts";
import { ratedTape } from "./server-workload.ts";

// [DX-INT1] The card's production cells: the card's quiet stream plus exactly REAL2's measured neighbour offers.
test("a production cell keeps the card's quiet stream and offers REAL2's neighbour tape", () => {
  for (const [shape, arm] of [["R", "1-prodR-S"], ["S", "1-prodS-S"]] as const) {
    const cell = { rate: 394 as const, loaded: true };
    const tape = fullCellTape(shape, cell, 300);
    const quiet = ratedTape(100_000, cell, 300).filter((e) => e.account === 0);
    assert.deepEqual(tape.filter((e) => e.account === 0), quiet);
    const real2 = cells(productionArms.find((a) => a.id === arm)!, 300).find((c) => c.label === `${shape}-r394-loaded`)!;
    const theirs = real2.tape.filter((o) => o.account !== 0).map((o: any) => [o.account, o.person, o.ms, o.slots.join(",")]);
    const ours = tape.filter(isProduction).map((e) => [e.account, e.person, e.ms, e.slots.join(",")]);
    assert.deepEqual(ours.sort(), theirs.sort());
    const rows = tape.filter(isProduction).reduce((n, e) => n + e.rows, 0) + quiet.length;
    if (shape === "R") { assert.equal(tape.length, 394 * 300); assert.equal(rows, 394 * 300); }
    else assert.equal(rows, 394 * 300, "shape S offers the same rows in fewer commits");
    const report = cardTapeReport(tape, 300);
    assert.equal(report.shape, shape);
    assert(new Set(tape.map((e) => e.version)).size === tape.length);
  }
  assert.equal(tapeBinding("saturday", 300), undefined);
  assert.equal(tapeBinding("production-R", 300)!.cells.length, 4);
  assert.throws(() => parseCardTape("production"), /Choose --tape/);
  assert.equal(commitAssertions(130, 14), 278);
});

test("production metrics count rows and commits, save completion, reads and the writer split", () => {
  const start = 1_000_000;
  const w = (saveKey: string, due: number, end: number, rows: number, subject: boolean, sql: number) => ({ account: 1, due: start + due,
    end: start + end, status: "acked", saveKey, rows, receipt: {}, stage: { ...(subject ? { subjectSave: "f" } : {}), nativeIoStats: { reads: { sql } } } });
  const m = productionCellMetrics([w("1/0", 0, 10, 1, true, 1), w("1/0", 1, 30, 1, false, 0), w("1/1", 200_000, 200_005, 3, false, 2),
    { account: 0, due: start, end: start + 1, status: "acked", receipt: {} }], start, 300);
  assert.deepEqual([m.offered.commits, m.offered.rows, m.offered.saves], [3, 5, 2]);
  assert.equal(m.saveCompletion.count, 2);
  assert.equal(m.saveCompletion.p99Ms, 30);
  assert.deepEqual([m.readsPerCommit.firstMinute, m.readsPerCommit.late], [0.5, 2]);
  assert.deepEqual([m.writerPath.subject.commits, m.writerPath.general.commits], [1, 2]);
});

// [DX-S1] The owner's save shape is the default for new cards; recorded campaigns without a tape stay Saturday's.
test("a new card runs one commit per subject's save unless another tape is named", () => {
  // [DX-INT3] Shape S without the end-of-cell burst, now that CARD2's tapes are on the branch.
  assert.equal(defaultCardTape, "production-S-noburst");
  assert.equal(newRunTape(undefined, "fresh"), "production-S-noburst");
  assert.equal(newRunTape(undefined, "1B"), "production-S-noburst");
  assert.equal(newRunTape("production-S", "1B"), "production-S");
  assert.equal(newRunTape(undefined, "realistic"), "saturday");
  assert.equal(newRunTape("saturday", "fresh"), "saturday");
  assert.equal(newRunTape("production-R", "1B"), "production-R");
  assert.equal(parseCardTape(undefined), "saturday");
});

// [DX-S1] Writer options reach the card only when set to 1, and only these three.
test("the card records the default-off writer options it was given", () => {
  assert.deepEqual(writerOptionsSet({}), {});
  assert.deepEqual(writerOptionsSet({ TX2_SUBJECT_WIDE: "0", TX2_SUBJECT_HINTS: "1", OTHER: "1" }), { TX2_SUBJECT_HINTS: "1" });
  assert.throws(() => writerOptionsSet({ TX2_GENERAL_PREFETCH: "yes" }), /0 or 1/);
});

// [DX-S1] The save-size ladder keeps the S tape's subjects and times and gives every save exactly N facts.
test("the save-size ladder rewrites every neighbour save of a shape S cell to N facts", () => {
  const cell = { rate: 50 as const, loaded: true };
  const plain = fullCellTape("S", cell, 90).filter(isProduction);
  process.env.DX_S1_LADDER_FACTS = "340";
  try {
    const ladder = fullCellTape("S", cell, 90).filter(isProduction);
    assert.equal(ladder.length, plain.length);
    assert(ladder.every((e, i) => e.slots.length === 340 && e.slots[339] === 339 && e.ms === plain[i]!.ms &&
      e.owner === plain[i]!.owner && e.saveKey === plain[i]!.saveKey));
    assert.throws(() => fullCellTape("R", cell, 90), /shape S saves only/);
  } finally { delete process.env.DX_S1_LADDER_FACTS; }
  assert.equal(ladderFacts({}), undefined);
  assert.throws(() => ladderFacts({ DX_S1_LADDER_FACTS: "0" }), /1 to 4000/);
  assert.throws(() => ladderFacts({ DX_S1_LADDER_FACTS: "5000" }), /1 to 4000/);
});

// [DX-INT3] The read gateway's bound and counters reach the card only when set, and only valid values.
test("the card records the read gateway's waiting-read bound and thread counters when set", () => {
  assert.deepEqual(readQueueOptionsSet({}), {});
  assert.deepEqual(readQueueOptionsSet({ DX_READ_WAIT_LIMIT: "128", DX_THREAD_COUNTERS: "1" }), { DX_READ_WAIT_LIMIT: "128", DX_THREAD_COUNTERS: "1" });
  assert.deepEqual(readQueueOptionsSet({ DX_THREAD_COUNTERS: "0" }), {});
  assert.throws(() => readQueueOptionsSet({ DX_READ_WAIT_LIMIT: "0" }));
  assert.throws(() => readQueueOptionsSet({ DX_READ_WAIT_LIMIT: "5000" }));
  assert.throws(() => readQueueOptionsSet({ DX_THREAD_COUNTERS: "yes" }));
});
