import { expect, it } from "vitest";
import { Replica, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { fixture, firstValid, person, seedHead } from "../thin1/population.ts";
function opened(budget: number) {
  const f = fixture(100),
    copy = new Replica(f.source, firstValid + 1000, "touched", budget),
    index = new RecentReads();
  copy.onUpdate = (d) => index.apply(d);
  copy.onAdmission = (p, e) => index.admit(p, e);
  return { f, copy, index };
}
it("evicts the whole closure, preserves a held snapshot and readmits at exactly the later cut", async () => {
  const { f, copy, index } = opened(3500),
    p = seedHead(100),
    v = firstValid + 1000;
  await copy.bootstrap([], p);
  expect(await copy.admit(person(0), p, v)).toBe(true);
  const held = await copy.snapshotAt(p);
  expect(await copy.admit(person(1), p, v)).toBe(true);
  expect(copy.retention.evictions).toBe(1);
  expect(index.pull(person(0), { recordedPosition: p, validAt: v })).toBeUndefined();
  f.writes(1);
  await copy.followOnce();
  expect(await copy.admit(person(0), p + 1, v)).toBe(true);
  expect(index.pull(person(0), { recordedPosition: p + 1, validAt: v })?.rows).toHaveLength(9);
  expect(index.pull(person(0), { recordedPosition: p, validAt: v })).toBeUndefined();
  expect(held.world(person(0))).toHaveLength(8);
  expect(copy.retention.bytes).toBeLessThanOrEqual(3500);
  await copy.stop();
});
it("declines oversized closures and negative cache entries still consume budget", async () => {
  const { copy } = opened(380);
  const p = seedHead(100);
  await copy.bootstrap([], p);
  expect(await copy.admit(person(0), p, firstValid)).toBe(false);
  expect(copy.retention.entries).toBe(0);
  for (let i = 100; i < 120; i++) expect(await copy.admit(person(i), p, firstValid)).toBe(true);
  expect(copy.retention.entries).toBe(1);
  expect(copy.retention.evictions).toBe(19);
  await copy.stop();
});
it("rejects an in-flight cold page from an evicted generation at the same source position", async () => {
  const { f, copy, index } = opened(3500);
  const p = seedHead(100),
    v = firstValid + 1000;
  await copy.bootstrap([], p);
  expect(await copy.admit(person(0), p, v)).toBe(true);
  let signal!: () => void, release!: () => void;
  const arrived = new Promise<void>((done) => {
    signal = done;
  });
  const held = new Promise<void>((done) => {
    release = done;
  });
  const original = f.source.page.bind(f.source);
  f.source.page = async (...args) => {
    const bytes = await original(...args);
    if (args[0][0] === person(1)) {
      signal();
      await held;
    }
    return bytes;
  };
  try {
    const stale = copy.admit(person(1), p, v);
    await arrived;
    expect(await copy.admit(person(2), p, v)).toBe(true);
    release();
    expect(await stale).toBe(false);
    expect(index.pull(person(1), { recordedPosition: p, validAt: v })).toBeUndefined();
    expect(await copy.admit(person(1), p, v)).toBe(true);
    expect(index.pull(person(1), { recordedPosition: p, validAt: v })?.rows).toHaveLength(8);
    expect(copy.retention.bytes).toBeLessThanOrEqual(3500);
  } finally {
    release();
    await copy.stop();
  }
});
