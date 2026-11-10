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
test("feed-before-ACK keeps affected-set and correction validation until the real ACK arrives", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh4-feed-"));
  const clock = openHostFeedClock();
  const source = JSON.stringify({ route: "A0-control", dir, epoch: "late" });
  const writer = openPublicationWriter(path.join(dir, "publication.db"), source, source, clock);
  const reader = openPublicationReader(path.join(dir, "publication.db"));
  let info: any, feed: FeedConsumer;
  const handle: any = {
    close: async () => {},
    feedPage: async (after: number) => {
      if (after) {
        feed.stop();
        return { transactions: [], next: 1 };
      }
      return { transactions: [{ position: 1, txId: "tx", changes: [] }], next: 1 };
    },
  };
  feed = new FeedConsumer({
    dir,
    epoch: "late",
    startAfter: 0,
    now: Date.now,
    measurement: { clock, records: reader },
    commitOf: () => info,
    open: async () => handle,
    log: () => {},
    crashes: [],
  });
  try {
    writer.publish(feed.publicationKey(1), "op");
    await feed.run();
    assert.equal(feed.uncheckedIntents, 1);
    info = {
      instant: 1,
      ackAt: Date.now(),
      subject: 9,
      subjects: [9],
      stamp: 1,
      correction: true,
      correctionValidFrom: 7,
    };
    feed.ackArrived(1);
    assert.equal(feed.uncheckedIntents, 0);
    assert.equal(feed.counts.affectedMismatches, 1);
    assert.equal(feed.counts.corrections, 1);
    assert.equal(feed.counts.correctionRangeReported, 0);
    feed.ackArrived(1);
    assert.equal(feed.counts.corrections, 1);
  } finally {
    feed.close();
    reader.close();
    writer.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
