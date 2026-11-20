import assert from "node:assert/strict";
import { test } from "node:test";
import { BulkQueue } from "./bulk.ts";

test("live work gets the turn and ready bulk accounts rotate", async () => {
  const q = new BulkQueue(1),
    live = Promise.withResolvers<void>();
  const seen: string[] = [];
  const write = q.live(async () => {
    await live.promise;
    seen.push("live");
  });
  const a1 = q.submit("a", async () => {
    seen.push("a1");
  });
  const a2 = q.submit("a", async () => {
    seen.push("a2");
  });
  const b = q.submit("b", async () => {
    seen.push("b1");
  });
  assert.deepEqual(seen, []);
  live.resolve();
  await Promise.all([write, a1, a2, b]);
  assert.deepEqual(seen, ["live", "a1", "b1", "a2"]);
});

test("after eight live completions one bulk turn may run through a live backlog", async () => {
  const q = new BulkQueue(1),
    live = Promise.withResolvers<void>();
  const waiting = q.live(() => live.promise);
  let grants = 0;
  const first = q.submit("a", async () => {
    grants++;
  });
  const second = q.submit("b", async () => {
    grants++;
  });
  for (let i = 0; i < 7; i++) await q.live(async () => {});
  assert.equal(grants, 0);
  await q.live(async () => {});
  await first;
  assert.equal(grants, 1);
  live.resolve();
  await Promise.all([waiting, second]);
  assert.equal(grants, 2);
});
