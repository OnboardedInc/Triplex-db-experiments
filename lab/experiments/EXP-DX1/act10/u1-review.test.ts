// [DX-ACT10, review of the U1 fix a439e9b9e] Attacks on the one ID allocator (`packages/core` `utils/id.ts`:
// `generateId`, `generateTransactionId`, `reserveIdPrefix`), run against a checkout that has the fix and built dists.
// A1: random schedules with the clock stepping forward and back (a fresh allocator per schedule): every ID increasing,
//     none inside any reserved block, blocks above everything before them and disjoint.
// A2: two allocators in one process (a second module instance): the second's IDs and the first's blocks.
// A3: worker threads: each thread's own allocator against the main thread's blocks.
// A4: every allowed prefix length (11 to 25) and the refused ones.
// A5: short prefixes in one millisecond carry into the time characters (IDs then claim a later millisecond).
// Run (from a checkout with the fix): node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/u1-review.test.ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const here = path.dirname(new URL(import.meta.url).pathname);
const idModule = path.join(here, "../../../../packages/core/dist/utils/id.js");
// The instance the datomic adapter's ordered save identity uses (resolved as packages/datomic resolves the SDK).
const fromDatomic = createRequire(path.join(here, "../../../../packages/datomic/package.json"));
const canonical = await import(pathToFileURL(fromDatomic.resolve("@triplex-build/triplex/internal")).href);
const { orderedSaveIdentity } = await import(pathToFileURL(path.join(here, "../../../../packages/datomic/dist/index.js")).href);
type Ids = { generateId: () => string; generateTransactionId: () => string; reserveIdPrefix: (n: number) => string };
let instances = 0;
// A fresh allocator: the same file under a new URL is a new module instance with its own state and ULID factory.
const fresh = async (): Promise<Ids> => import(pathToFileURL(idModule).href + "?instance=" + ++instances);
const ulid = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => ((x ^= x << 13), (x ^= x >>> 17), (x ^= x << 5), (x >>> 0) / 4294967296);
}

test("A1: clock stepping forward and back, interleaved blocks of every length and IDs from both generators", async () => {
  const realNow = Date.now;
  let schedules = 0, ops = 0, ids = 0, blocks = 0, back = 0, inside = 0, notIncreasing = 0, blockBelowEarlier = 0, nested = 0;
  try {
    for (let s = 0; s < 1500; s++) {
      const r = rng(9000 + s);
      const a = await fresh();
      let clock = realNow.call(Date) + Math.floor(r() * 1e9);
      Date.now = () => clock;
      const reserved: string[] = [];
      let last = "", greatestBlockEnd = "";
      for (let i = 0; i < 400; i++, ops++) {
        const x = r();
        if (x < 0.06) clock += 1;
        else if (x < 0.08) clock += Math.floor(r() * 10_000);
        else if (x < 0.10) { clock -= 1; back++; }
        else if (x < 0.115) { clock -= Math.floor(r() * 5_000); back++; }
        else if (x < 0.12) { clock -= 86_400_000; back++; }
        else if (x < 0.42) {
          const len = x < 0.25 ? 24 : x < 0.37 ? 23 : 11 + Math.floor(r() * 15);
          const p = a.reserveIdPrefix(len);
          blocks++;
          assert.equal(p.length, len);
          // Above every ID issued and every block reserved before it (compared at its own length).
          if (last && p <= last.slice(0, len)) blockBelowEarlier++;
          if (greatestBlockEnd && p <= greatestBlockEnd.slice(0, len)) blockBelowEarlier++;
          for (const q of reserved) if (q.startsWith(p) || p.startsWith(q)) nested++;
          reserved.push(p);
          greatestBlockEnd = p + "Z".repeat(26 - len);
        } else {
          const id = x < 0.82 ? a.generateId() : a.generateTransactionId().replace(/^_tx\//, "");
          ids++;
          assert.match(id, ulid);
          if (id <= last || (greatestBlockEnd && id <= greatestBlockEnd)) notIncreasing++;
          for (const q of reserved) if (id.startsWith(q)) inside++;
          last = id;
        }
      }
      schedules++;
    }
  } finally {
    Date.now = realNow;
  }
  console.log("[A1] " + JSON.stringify({ schedules, ops, ids, blocks, clockStepsBack: back, idsInsideABlock: inside,
    idsNotAboveEverythingBefore: notIncreasing, blocksNotAboveEverythingBefore: blockBelowEarlier, nestedBlocks: nested }));
  assert.equal(inside + notIncreasing + blockBelowEarlier + nested, 0);
});

test("A2: two allocators in one process: blocks from the adapter's instance, IDs from a second instance", async () => {
  const b = await fresh();
  let pairs = 0, sharing = 0, sameInstanceSharing = 0;
  for (let i = 0; i < 100_000; i++) {
    const t0 = Date.now();
    while (Date.now() === t0);
    const save = orderedSaveIdentity();
    const other = String(b.generateId());
    const same = String(canonical.generateId());
    pairs++;
    if (other.startsWith(save.token)) sharing++;
    if (same.startsWith(save.token)) sameInstanceSharing++;
    if (i === 2000) break; // each pair waits for a fresh millisecond; 2,001 such pairs, then back to back below
  }
  for (let i = 0; i < 200_000; i++) {
    const save = orderedSaveIdentity();
    pairs++;
    if (String(b.generateId()).startsWith(save.token)) sharing++;
    if (String(canonical.generateId()).startsWith(save.token)) sameInstanceSharing++;
  }
  console.log("[A2] " + JSON.stringify({ pairs, secondInstanceIdsSharingTheToken: sharing, adapterInstanceIdsSharingTheToken: sameInstanceSharing }));
  assert.equal(sharing + sameInstanceSharing, 0);
});

test("A3: worker threads with their own allocators against the main thread's blocks", async () => {
  const workers = 4, perWorker = 50_000;
  const code = `
    const { parentPort, workerData } = require("node:worker_threads");
    import(workerData.url).then((m) => {
      const out = [];
      for (let i = 0; i < workerData.n; i++) { out.push(m.generateId()); if (i % 7 === 0) m.reserveIdPrefix(24); }
      parentPort.postMessage(out);
    });`;
  const tokens = new Set<string>();
  const running = Array.from({ length: workers }, (_, w) => new Promise<string[]>((resolve, reject) => {
    const worker = new Worker(code, { eval: true, workerData: { url: pathToFileURL(idModule).href, n: perWorker } });
    worker.once("message", resolve);
    worker.once("error", reject);
  }));
  const started = Date.now();
  let done = false;
  void Promise.all(running).then(() => (done = true));
  while (!done && Date.now() - started < 60_000) {
    for (let i = 0; i < 500; i++) tokens.add(orderedSaveIdentity().token);
    await new Promise((r) => setImmediate(r));
  }
  const all = (await Promise.all(running)).flat();
  let inside = 0;
  for (const id of all) if (tokens.has(id.slice(0, 24))) inside++;
  console.log("[A3] " + JSON.stringify({ workers, workerIds: all.length, mainThreadBlocks: tokens.size, workerIdsInsideAMainBlock: inside }));
  assert.equal(inside, 0);
});

test("A4: every allowed prefix length, and the refused ones", async () => {
  const a = await fresh();
  const result: Record<number, number> = {};
  for (let len = 11; len <= 25; len++) {
    const before = Array.from({ length: 50 }, () => a.generateId());
    const p = a.reserveIdPrefix(len);
    const after = Array.from({ length: 50 }, () => a.generateId());
    result[len] = [...before, ...after].filter((id) => id.startsWith(p)).length;
  }
  for (const bad of [10, 26, 0, -1, 24.5, Number.NaN]) assert.throws(() => a.reserveIdPrefix(bad), RangeError);
  console.log("[A4] " + JSON.stringify({ idsInsideTheBlockByLength: result, refused: [10, 26, 0, -1, 24.5, "NaN"] }));
  assert(Object.values(result).every((n) => n === 0));
});

test("A5: short blocks in one millisecond carry into the time characters", async () => {
  const realNow = Date.now;
  const a = await fresh();
  const clock = realNow.call(Date);
  Date.now = () => clock;
  try {
    const time = a.generateId().slice(0, 10);
    let n = 0;
    while (a.reserveIdPrefix(11).slice(0, 10) === time && n < 100) n++;
    const id = a.generateId();
    console.log("[A5] " + JSON.stringify({ clockTime: time, reservationsOfLength11BeforeTheTimeMoved: n, nextIdTime: id.slice(0, 10) }));
    assert(id.slice(0, 10) > time && n <= 32);
  } finally {
    Date.now = realNow;
  }
});
