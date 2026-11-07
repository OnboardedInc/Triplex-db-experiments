import { test } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Dispatch, delay, waitUntil } from "./dispatch.ts";
test("fractional offered schedules never release before the actual clock reaches them", async () => {
  let clock = 0,
    waits = 0;
  await waitUntil(
    7.8125,
    () => clock,
    async (requested) => {
      clock += Math.max(1, requested - 1);
      waits++;
    },
  );
  assert(clock >= 7.8125);
  assert(waits >= 2);
  const origin = performance.now();
  for (let index = 1; index <= 12; index++) {
    const target = origin + index * 1.953125;
    await waitUntil(target);
    assert(performance.now() >= target);
  }
});
test("queued requests expire from their offered deadline without entering the backend or leaking a slot", async () => {
  const pool = new Dispatch(1, 1);
  let release!: () => void,
    entered = false;
  const first = pool.use(
    async () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    performance.now() + 1000,
  );
  const second = pool.use(async () => {
    entered = true;
  }, performance.now() + 20);
  await assert.rejects(second, /OFFER_DEADLINE_EXCEEDED/);
  assert.equal(entered, false);
  assert.equal(pool.active, 1);
  release();
  await first;
  assert.equal(pool.active, 0);
  await pool.use(async (remaining) => {
    assert(remaining > 0 && remaining <= 100);
  }, performance.now() + 100);
  assert.equal(pool.maximumActive, 1);
});
test("bounded rejection is immediate and does not alter already admitted requests", async () => {
  const pool = new Dispatch(1, 1);
  let release!: () => void;
  const first = pool.use(
    async () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    performance.now() + 1000,
  );
  const second = pool.use(async () => 2, performance.now() + 1000);
  await assert.rejects(
    pool.use(async () => 3, performance.now() + 1000),
    /BOUNDED_DISPATCH_REJECTION/,
  );
  release();
  await first;
  assert.equal(await second, 2);
  assert.equal(pool.active, 0);
  await delay(1);
});
