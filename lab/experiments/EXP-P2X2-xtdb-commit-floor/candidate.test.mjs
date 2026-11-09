// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { SubjectQueue } from "./candidate.mjs";
test("per-subject FIFO, across-subject concurrency and bounded group size", async () => {
  const seen = new Map(),
    active = new Set();
  let simultaneous = 0;
  const q = new SubjectQueue(
    async (batch) => {
      const subject = batch[0].subject;
      assert(!active.has(subject));
      assert(batch.every((c) => c.subject === subject));
      active.add(subject);
      simultaneous = Math.max(simultaneous, active.size);
      await new Promise((r) => setTimeout(r, 1));
      for (const c of batch) {
        const expected = seen.get(subject) ?? 0;
        assert.equal(c.seq, expected);
        seen.set(subject, expected + 1);
      }
      active.delete(subject);
      return batch;
    },
    { concurrency: 3, groupSize: 8 },
  );
  const jobs = [];
  for (let seq = 0; seq < 40; seq++)
    for (let subject = 0; subject < 5; subject++) jobs.push(q.submit({ subject, seq }));
  await Promise.all(jobs);
  assert.equal(jobs.length, 200);
  assert(simultaneous > 1 && simultaneous <= 3);
  assert(q.groups.includes(8));
  assert(q.groups.every((n) => n <= 8));
});
test("retry isolation and group rejection account for every command", async () => {
  let fail = true;
  const q = new SubjectQueue(
    async (group) => {
      if (group.some((c) => c.resend)) assert.equal(group.length, 1);
      if (fail) {
        fail = false;
        throw new Error("typed refusal");
      }
      return group;
    },
    { concurrency: 1 },
  );
  const p = [
    q.submit({ subject: 1, seq: 0 }),
    q.submit({ subject: 1, seq: 1, resend: true }),
    q.submit({ subject: 1, seq: 2 }),
  ];
  const r = await Promise.allSettled(p);
  assert.deepEqual(
    r.map((r) => r.status),
    ["rejected", "fulfilled", "fulfilled"],
  );
});
test("invalid admission limits reject without accepting work", () => {
  for (const opts of [{ concurrency: 0 }, { concurrency: 17 }, { groupSize: 0 }, { groupSize: 9 }])
    assert.throws(() => new SubjectQueue(async (g) => g, opts));
});
