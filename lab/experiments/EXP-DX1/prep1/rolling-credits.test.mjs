import assert from "node:assert/strict";
import test from "node:test";
import { FairTurns } from "./fair-turns.ts";
import { admission, RollingCredits } from "./rolling-credits.ts";

function scenario(scheduler) {
  const queued = [];
  const reported = [];
  const pending = new Map();
  const owned = new Set();
  const revisions = new Map();
  const journal = [];
  const eligible = () => Array.from({ length: 10 }, (_, account) => (
    queued.find((r) => r.account === account && !owned.has(r.subject))
  )).filter(Boolean);
  const dispatch = () => scheduler.dispatch(eligible, (row, ticket, ahead) => {
    queued.splice(queued.indexOf(row), 1);
    assert(!owned.has(row.subject));
    owned.add(row.subject);
    const basis = revisions.get(row.subject) ?? 0;
    reported.push({ ...row, ticket, ahead, basis });
    pending.set(row.id, { row, ticket, basis });
  });
  const offer = (account, subject, id) => queued.push({ account, subject, id, due: queued.length });
  const finish = (id, outcome = "ack") => {
    const { row, ticket, basis } = pending.get(id);
    const durable = outcome !== "failed-append";
    if (durable) {
      assert.equal(revisions.get(row.subject) ?? 0, basis);
      const receipt = { id, position: journal.length + 1, subject: row.subject, basis };
      journal.push(receipt);
      revisions.set(row.subject, receipt.position);
    }
    pending.delete(id);
    owned.delete(row.subject);
    scheduler.resolved(outcome === "ack", ticket);
    dispatch();
  };
  return { offer, finish, dispatch, queued, pending, journal, reported };
}

function legacyRun(scheduler) {
  const s = scenario(scheduler);
  for (let n = 1; n <= 18; n++) s.offer(n % 9 + 1, "p" + n, n);
  s.dispatch();
  s.offer(0, "quiet", 0);
  while (s.pending.size) s.finish([...s.pending.keys()].at(-1));
  return Buffer.from(JSON.stringify({ offers: s.reported, journal: s.journal }));
}

test("the barrier selection returns byte-identical grants and receipts", () => {
  assert.deepEqual(legacyRun(admission(10, { mode: "barrier", credits: 6 })), legacyRun(new FairTurns(10, 6)));
});

for (const width of [6, 8, 12, 16]) {
  test(`rolling ${width} reserves a quiet credit and refills a single released slot`, () => {
    const s = scenario(new RollingCredits(10, width, 0));
    for (let n = 1; n <= width * 3; n++) s.offer(n % 9 + 1, "p" + n, n);
    s.dispatch();
    assert.equal(s.pending.size, width - 1);
    const slowest = [...s.pending.keys()][0];
    s.finish([...s.pending.keys()].at(-1));
    assert(s.pending.has(slowest));
    assert.equal(s.pending.size, width - 1);
    s.offer(0, "quiet", 0);
    s.offer(0, "quiet-followup", 1000);
    s.dispatch();
    assert.equal(s.reported.at(-1).id, 0);
    assert.equal(s.reported.at(-1).ahead, width - 1);
    s.finish(slowest);
    assert.equal(s.reported.at(-1).id, 1000);
    assert(s.pending.size <= width);
  });
}

for (const width of [6, 16]) {
  for (const direction of ["fifo", "lifo", "round-robin"]) {
    test(`rolling ${width} preserves same-person fences under ${direction} completion`, () => {
      const s = scenario(new RollingCredits(10, width, 0));
      for (let n = 0; n < width * 5; n++) s.offer(n % 10, n % 10 + "/p" + (Math.floor(n / 10) % 2), n);
      s.dispatch();
      let step = 0;
      while (s.pending.size) {
        const keys = [...s.pending.keys()];
        s.finish(direction === "fifo" ? keys[0] : direction === "lifo" ? keys.at(-1) : keys[step++ % keys.length]);
      }
      assert.equal(s.queued.length, 0);
      assert.equal(s.journal.length, width * 5);
      assert.deepEqual(s.journal.map((r) => r.position), s.journal.map((_, i) => i + 1));
      for (const subject of new Set(s.journal.map((r) => r.subject))) {
        const edits = s.journal.filter((r) => r.subject === subject);
        assert.deepEqual(edits.map((r) => r.id), edits.map((r) => r.id).sort((a, b) => a - b));
        assert.deepEqual(edits.map((r) => r.basis), [0, ...edits.slice(0, -1).map((r) => r.position)]);
      }
    });
  }
  for (const outcome of ["lost-reply", "failed-append"]) {
    test(`rolling ${width} quarantines after ${outcome} with tickets outstanding`, () => {
      const scheduler = new RollingCredits(10, width, 0);
      const s = scenario(scheduler);
      s.offer(0, "quiet", 0);
      for (let n = 1; n <= width * 2; n++) s.offer(n % 9 + 1, "p" + n, n);
      s.dispatch();
      assert.equal(s.pending.size, width);
      const killed = [...s.pending.keys()][2];
      const ticket = s.pending.get(killed).ticket;
      s.finish(killed, outcome);
      assert.throws(() => scheduler.resolved(true, ticket), /unknown or released/);
      for (const id of [...s.pending.keys()]) s.finish(id);
      assert.equal(s.reported.length, width);
      assert.equal(s.queued.length, width + 1);
      assert.equal(s.journal.filter((r) => r.id === killed).length, Number(outcome === "lost-reply"));
      assert.deepEqual(s.journal.map((r) => r.position), s.journal.map((_, i) => i + 1));
    });
  }
}
