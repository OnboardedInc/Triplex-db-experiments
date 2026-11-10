import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  FeedConsumer,
  openHostFeedClock,
  openPublicationReader,
  openPublicationWriter,
} from "../lib/feed.ts";
// [DX-H3] Why: feed-before-response must await a real witness while absent witnesses still fail closed.
// Rejected: an unconditional sleep or a synthetic publication clock.
for (const publish of [true, false])
  test(`feed ${publish ? "awaits delayed" : "rejects absent"} publication witness`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh3-feed-"));
    const source = JSON.stringify({ route: "A0-control", dir, epoch: "fresh" });
    const clock = openHostFeedClock();
    const writer = openPublicationWriter(path.join(dir, "publication.db"), source, source, clock);
    const reader = openPublicationReader(path.join(dir, "publication.db"));
    let feed: FeedConsumer;
    const handle: any = {
      close: async () => {},
      feedPage: async (after: number) => {
        if (after) {
          feed.stop();
          return { transactions: [], next: 1 };
        }
        return {
          transactions: [
            {
              position: 1,
              txId: "tx",
              commandId: "command",
              operationId: "op",
              recordedAt: 1,
              changes: [],
            },
          ],
          next: 1,
        };
      },
    };
    feed = new FeedConsumer({
      dir,
      epoch: "fresh",
      startAfter: 0,
      now: Date.now,
      publicationWaitMs: 100,
      measurement: { clock, records: reader },
      commitOf: () => undefined,
      open: async () => handle,
      log: () => {},
      crashes: [],
    });
    const timer = publish
      ? setTimeout(() => writer.publish(feed.publicationKey(1), "op"), 20)
      : undefined;
    try {
      if (publish) {
        await feed.run();
        assert.equal(feed.checkpoint, 1);
        assert.equal(feed.counts.durableWrites, 1);
        assert.equal(feed.lags.length, 1);
      } else {
        await assert.rejects(feed.run(), /Missing source publication instant/);
        assert.equal(feed.checkpoint, 0);
        assert.equal(feed.counts.durableWrites, 0);
      }
    } finally {
      clearTimeout(timer);
      feed.close();
      reader.close();
      writer.close();
      fs.rmSync(dir, { recursive: true });
    }
  });

test("a stalled source poll fails instead of leaving final reporting blocked", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh3-stall-"));
  let closed = false;
  const feed = new FeedConsumer({
    dir,
    epoch: "stall",
    startAfter: 0,
    now: Date.now,
    pollTimeoutMs: 20,
    commitOf: () => undefined,
    open: async () =>
      ({
        feedPage: () => new Promise(() => {}),
        close: async () => {
          closed = true;
        },
      }) as any,
    log: () => {},
    crashes: [],
  });
  try {
    await assert.rejects(feed.run(), /Feed poll exceeded 20 ms at checkpoint 0/);
    assert.equal(closed, true);
    assert.equal(feed.checkpoint, 0);
    assert.equal(feed.counts.durableWrites, 0);
  } finally {
    feed.close();
    fs.rmSync(dir, { recursive: true });
  }
});

test("repeated source failures retain their error and fail finalization without advancing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh3-retry-"));
  let closed = false;
  const logs: string[] = [];
  const feed = new FeedConsumer({
    dir,
    epoch: "retry",
    startAfter: 0,
    now: Date.now,
    pollTimeoutMs: 20,
    commitOf: () => undefined,
    open: async () =>
      ({
        feedPage: async () => {
          throw new Error("source-read-failure", { cause: new Error("native-detail") });
        },
        close: async () => {
          closed = true;
        },
      }) as any,
    log: (l) => logs.push(l),
    crashes: [],
  });
  try {
    await assert.rejects(feed.run(), /Feed polling repeatedly failed.*source-read-failure/);
    assert.equal(closed, true);
    assert.equal(feed.checkpoint, 0);
    assert.equal(feed.counts.durableWrites, 0);
    assert.ok(feed.counts.pollErrors >= 2);
    assert.ok(logs.some((l) => l.includes("source-read-failure")));
    assert.ok(logs.some((l) => l.includes("native-detail")));
  } finally {
    feed.close();
    fs.rmSync(dir, { recursive: true });
  }
});
