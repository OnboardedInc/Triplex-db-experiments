import assert from "node:assert/strict";
import test from "node:test";
import { PublishSlot, releaseStages, screenSaves } from "./queue-study-math.ts";

test("save-only admission uses fixed offers and refuses backlog hidden by late ACKs", () => {
  const start = 1000,
    end = 31000,
    schedule = Array.from({ length: 110 }, (_, i) => i * 285),
    actual = schedule.map((scheduled) => ({
      scheduled,
      ack: scheduled + 70,
      observed: scheduled + 80,
    }));
  assert.equal(screenSaves(schedule, actual, { start, end }, end + 1000).reason, null);
  const overloaded = actual.map((item, i) => ({
    ...item,
    ack: item.ack + i * 25,
    observed: item.observed + i * 25,
  }));
  const missed = screenSaves(schedule, overloaded, { start, end }, end + 1000);
  assert(missed.reason && missed.pendingAfterOneSecond > 0);
  assert.equal(missed.offered, 105);
  const catchUp = actual.map((item, i) =>
    i > 99 ? { ...item, ack: end + 200 + i, observed: end + 400 + i } : item,
  );
  assert.match(
    screenSaves(schedule, catchUp, { start, end }, end + 1000).reason ?? "",
    /queue grew/,
  );
});

test("a scheduled operator offer cannot enqueue behind another Publish", async () => {
  const slot = new PublishSlot(),
    waiting = Promise.withResolvers<void>();
  const first = slot.start(() => waiting.promise);
  assert(first);
  assert.equal(
    slot.start(async () => "different release"),
    undefined,
  );
  waiting.resolve();
  await first;
  assert.equal(await slot.start(async () => "next release"), "next release");
});

test("reader and ACK overlap still decomposes the record clock exactly", () => {
  assert.deepEqual(releaseStages(10, 30, 50, 55, 70), {
    toFront: 20,
    transaction: 20,
    learn: 5,
    firstRead: 15,
  });
  assert.deepEqual(releaseStages(10, 30, 50, 45, 52), {
    toFront: 20,
    transaction: 20,
    learn: 0,
    firstRead: 2,
  });
});
