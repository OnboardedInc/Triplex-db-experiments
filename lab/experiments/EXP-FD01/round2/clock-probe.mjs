import "./source-hook.mjs";
import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { FeedConsumer } from "../../../../lab/bench/lib/feed.ts";
// [CX-VFD01] Why: test the actual bench consumer with record time and publication time separated.
// Rejected: merely attaching an ignored lagMs field to a FeedPage (does not execute metric code).
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/round2-clock-${randomUUID()}`;
fs.mkdirSync(dir, { recursive: true });
const paths = [
  "lab/bench/lib/feed.ts",
  "lab/bench/lib/rng.ts",
  "lab/bench/lib/world.ts",
  "packages/core/src/feed/index.ts",
  "packages/host/src/feed/ConsumerStore.ts",
  "packages/host/src/feed/Adapters.ts",
  "lab/experiments/EXP-FD01/round2/clock-probe.mjs",
  "lab/experiments/EXP-FD01/round2/source-hook.mjs",
];
const hashSources = () =>
  Object.fromEntries(
    paths.map((p) => [
      p,
      createHash("sha256")
        .update(fs.readFileSync(new URL("../../../../" + p, import.meta.url)))
        .digest("hex"),
    ]),
  );
const sources = hashSources();
for (const p of paths) {
  const target = new URL("preimages/" + p, "file://" + dir + "/");
  fs.mkdirSync(new URL(".", target), { recursive: true });
  fs.copyFileSync(new URL("../../../../" + p, import.meta.url), target);
}
const clocks = { publishedAtMonoMs: 100, durableAtMonoMs: 400, decidedStampAsMs: 399 };
const handle = {
  feedPage: async () => {
    consumer.stop();
    return {
      next: 1,
      transactions: [
        {
          position: 1,
          txId: "tx1",
          changes: [
            {
              op: "assert",
              tripleId: "a1",
              entityId: "pl:00000000",
              attribute: ":a",
              validFrom: 0,
              validTo: null,
            },
          ],
        },
      ],
    };
  },
  close: async () => {},
};
const consumer = new FeedConsumer({
  dir,
  epoch: "1",
  startAfter: 0,
  now: () => clocks.durableAtMonoMs,
  publicationOf: (key) => ({ ...key, clock: "host-monotonic", atMonoMs: clocks.publishedAtMonoMs }),
  commitOf: () => ({
    instant: clocks.decidedStampAsMs,
    ackAt: 101,
    subject: 0,
    subjects: [0],
    stamp: 399000,
    publicationAtMonoMs: clocks.publishedAtMonoMs,
    correction: false,
    correctionValidFrom: null,
  }),
  open: async () => handle,
  log: () => {},
  crashes: [],
});
await consumer.run();
assert.equal(consumer.checkpoint, 1);
const result = {
  dir,
  sources,
  clocks,
  lags: consumer.lags,
  arm: consumer.feedArm,
  publicationLagMs: clocks.durableAtMonoMs - clocks.publishedAtMonoMs,
  reportedLagMs: consumer.lags[0]?.lagMs,
  note: "Adapted QA control: publication 100 to durable 400 must report 300, never stamp-derived 1. Offline synthetic clocks only.",
};
assert.equal(result.reportedLagMs, 300);
assert.equal(result.publicationLagMs, 300);
consumer.close();
assert.deepEqual(hashSources(), sources);
result.sourceUnchanged = true;
fs.writeFileSync(dir + "/result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
