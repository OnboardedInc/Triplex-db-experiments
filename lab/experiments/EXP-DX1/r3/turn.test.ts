import assert from "node:assert/strict";
import { test } from "node:test";
import { ReaderTurn } from "../../../bench/lib/reader-turn.ts";

test("one worker-wide budget admits bounded batches under 1024 closed loops", async () => {
  const turn = new ReaderTurn(16, Infinity);
  let messages = 0;
  const tick = setInterval(() => messages++, 1);
  await Promise.all(Array.from({ length: 1024 }, async () => {
    for (let i = 0; i < 3; i++) await turn.enter();
  }));
  clearInterval(tick);
  assert(turn.diagnostics.yields >= 191);
  assert.equal(turn.diagnostics.maxTurnReads, 16);
  assert(messages > 0, "I/O remains serviceable during local promise traffic");
});
