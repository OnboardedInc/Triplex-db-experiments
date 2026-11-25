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

// [DX-ACT5] Turn-taking controls.
test("three accounts settling at once take turns round-robin, one frame at a time", async () => {
  const q = new BulkQueue(1);
  const seen: string[] = [];
  let inside = 0,
    most = 0;
  const frame = (k: string, i: number) =>
    q.submit(k, async () => {
      inside++;
      most = Math.max(most, inside);
      await new Promise((r) => setTimeout(r, 1));
      seen.push(k + i);
      inside--;
    });
  const all: Promise<void>[] = [];
  for (let i = 0; i < 4; i++) for (const k of ["a", "b", "c"]) all.push(frame(k, i));
  await Promise.all(all);
  assert.equal(most, 1);
  assert.deepEqual(seen, ["a0", "b0", "c0", "a1", "b1", "c1", "a2", "b2", "c2", "a3", "b3", "c3"]);
  assert.deepEqual([...q.turnsByKey], [["a", 4], ["b", 4], ["c", 4]]);
});

test("a paused account waits without holding back the others; resume lets it go on", async () => {
  const q = new BulkQueue(1);
  const seen: string[] = [];
  q.pause("a");
  const a = q.submit("a", async () => void seen.push("a"));
  await Promise.all([q.submit("b", async () => void seen.push("b")), q.submit("c", async () => void seen.push("c"))]);
  assert.deepEqual(seen, ["b", "c"]);
  q.resume("a");
  await a;
  assert.deepEqual(seen, ["b", "c", "a"]);
});

test("a paced account gets at least its interval between frames; others are not slowed", async () => {
  const q = new BulkQueue(1);
  const at: Record<string, number[]> = { a: [], b: [] };
  q.pace("a", 40);
  const all: Promise<void>[] = [];
  for (let i = 0; i < 3; i++)
    for (const k of ["a", "b"]) all.push(q.submit(k, async () => void at[k]!.push(performance.now())));
  await Promise.all(all);
  for (let i = 1; i < 3; i++) assert(at.a![i]! - at.a![i - 1]! >= 39, "pace kept");
  assert(at.b![2]! - at.b![0]! < 40, "the other account is not paced");
});

test("hold waits for the frame in flight and stops new ones until release", async () => {
  const q = new BulkQueue(1),
    gate = Promise.withResolvers<void>();
  const seen: string[] = [];
  const first = q.submit("a", async () => {
    await gate.promise;
    seen.push("first");
  });
  const second = q.submit("a", async () => void seen.push("second"));
  const held = q.hold().then(() => seen.push("held"));
  gate.resolve();
  await held;
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, ["first", "held"]);
  q.release();
  await Promise.all([first, second]);
  assert.deepEqual(seen, ["first", "held", "second"]);
});

test("external mode: frames run only when the admission grants a turn", async () => {
  const { settlementLane } = await import("./bulk.ts");
  const q = new BulkQueue(1);
  const lane = settlementLane(q, Infinity);
  const seen: string[] = [];
  const a = q.submit("a", async () => void seen.push("a"));
  const b = q.submit("b", async () => void seen.push("b"));
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, []);
  assert(lane.ready());
  await lane.send();
  assert.deepEqual(seen, ["a"]);
  lane.close();
  await Promise.all([a, b]);
  assert.deepEqual(seen, ["a", "b"]);
  assert.deepEqual(lane.stats(), { granted: 1, yieldedChecks: 0 });
});
