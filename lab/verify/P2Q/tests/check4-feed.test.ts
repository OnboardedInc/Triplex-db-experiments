// Brief check 4: the feed. 100 injected consumer crashes, keyed vs unkeyed, both durability modes, on code at
// d7c6086 (the branch's crash receipts were measured on an older dist); the read bound at the durable watermark.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FeedConsumerStore, LogFeed, readConsumerEffects } from "../../../../packages/qlever/src/broker/feed.js";
import { encodeCommitGroup } from "../../../../packages/qlever/src/broker/frames.js";
import { readWatermark } from "../../../../packages/qlever/src/broker/log.js";
import { freshDir, logMembers, openRt, ops, writeJson } from "./harness.js";

describe("consumer crash injection (TARGETS 1.1 P3 items 5 and 6)", () => {
  it("100 crashes per variant: keyed has no visible duplicates; the unkeyed split control shows them", async () => {
    const dir = freshDir("c4-crash");
    const scope = `v-p2q-c4:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    const committed: [number, string][] = [];
    let next = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (next < 400) {
          const i = next++;
          const r = await rt.run(rt.triples.transact(ops(`subj:${i % 40}`, 5, `c${i}`), { commandId: `c4:${i}` }));
          committed.push([r.position, `subj:${i % 40}`]);
        }
      }),
    );
    await rt.dispose();
    // Independent expectation from the log itself: one effect per (transact position, subject).
    const fromLog = new Set(logMembers(rt.broker.segmentPath).flatMap((m) => m.subjects.map((s) => `${m.positions[0]}|${s}`)));
    expect(fromLog).toEqual(new Set(committed.map(([p, s]) => `${p}|${s}`)));
    const feed = new LogFeed(dir);
    const points = ["before-effect", "after-effect-before-checkpoint", "after-checkpoint"] as const;
    const results: any[] = [];
    for (const variant of ["keyed-split", "unkeyed-split", "keyed-atomic", "unkeyed-atomic"] as const) {
      const keyed = variant.startsWith("keyed");
      const mode = variant.endsWith("atomic") ? "atomic" : "split";
      const consumerDir = path.join(dir, `consumer-${variant}`);
      const injected: Record<string, number> = {};
      let total = 0;
      let restarts = 0;
      let k = 0;
      let replayAttempts = 0;
      let deliveries = 0;
      for (;;) {
        restarts++;
        const store = new FeedConsumerStore(consumerDir, "c", mode, keyed);
        let cursor = store.checkpoint() ?? feed.start();
        let crashed = false;
        let drained = false;
        while (!crashed) {
          const page = feed.poll(cursor, { maxBytes: 1 });
          if (page.resolutions.length === 0) {
            drained = true;
            break;
          }
          const effects = page.resolutions.flatMap((r) =>
            r.kind === "commit" ? r.transacts.flatMap((t) => t.subjects.map((s) => ({ position: t.position, subject: s }))) : [],
          );
          deliveries += effects.length;
          const point = total < 100 && effects.length > 0 ? points[k++ % 3]! : undefined;
          const hit = () => {
            injected[point!] = (injected[point!] ?? 0) + 1;
            total++;
            crashed = true;
          };
          if (point === "before-effect") {
            hit();
            break;
          }
          if (mode === "atomic" && point === "after-effect-before-checkpoint") {
            store.recordEffects(effects, page.cursor, { tear: true });
            hit();
            break;
          }
          store.recordEffects(effects, page.cursor);
          if (point === "after-effect-before-checkpoint") {
            hit();
            break;
          }
          store.writeCheckpoint(page.cursor);
          if (point === "after-checkpoint") {
            hit();
            break;
          }
          cursor = page.cursor;
        }
        replayAttempts += store.replayAttempts;
        store.close();
        if (drained) break;
      }
      const counts = readConsumerEffects(consumerDir, "c");
      const expected = new Set(committed.map(([p, s]) => `${p}|${s}`));
      const missing = [...expected].filter((x) => !counts.has(x)).length;
      const extras = [...counts.keys()].filter((x) => !expected.has(x)).length;
      const visibleDuplicates = [...counts.values()].reduce((a, n) => a + (n - 1), 0);
      results.push({ variant, injected, injectedTotal: total, restarts, deliveries, expected: expected.size, missing, extras, visibleDuplicates, storeReplayAttempts: replayAttempts });
    }
    writeJson("check4-crash.json", results);
    await rt.broker.close();
    const by = Object.fromEntries(results.map((r) => [r.variant, r]));
    for (const r of results) {
      expect(r.injectedTotal).toBe(100);
      expect(r.missing).toBe(0);
      expect(r.extras).toBe(0);
    }
    expect(by["keyed-split"].visibleDuplicates).toBe(0);
    expect(by["keyed-atomic"].visibleDuplicates).toBe(0);
    expect(by["unkeyed-split"].visibleDuplicates).toBeGreaterThan(0);
    expect(by["keyed-split"].storeReplayAttempts).toBeGreaterThan(0);
  });
});

describe("the feed reads only up to the durable watermark", () => {
  it("a frame whose bytes are in the file but whose watermark was not published is not delivered", async () => {
    const dir = freshDir("c4-bound");
    const scope = `v-p2q-c4b:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    try {
      const a = await rt.run(rt.triples.transact(ops("subj:w", 2, "a")));
      const wm = readWatermark(dir)!;
      // Append a well-formed commit frame without the watermark update (as a tailer sees a frame before fsync returns).
      const log = (rt.broker as any).log;
      const lsn = log.nextLsn;
      await log.append(1, encodeCommitGroup({ v: 1, stream: scope, lsn, epoch: log.epoch, members: [] }), { sync: false });
      const feed = new LogFeed(dir);
      let cursor = feed.start();
      const seen: number[] = [];
      for (;;) {
        const page = feed.poll(cursor);
        if (page.resolutions.length === 0) break;
        for (const r of page.resolutions) seen.push(r.lsn);
        cursor = page.cursor;
      }
      const fileHasFrame = fs.statSync(path.join(dir, "segment-000001.log")).size > 0 && log.nextLsn === lsn + 1;
      writeJson("check4-read-bound.json", { watermarkLsn: wm.lsn, appendedLsn: lsn, delivered: seen, fileHasFrame, ackedPosition: a.position });
      expect(Math.max(...seen)).toBe(wm.lsn);
      expect(seen.includes(lsn)).toBe(false);
    } finally {
      await rt.dispose();
      await rt.broker.abandon();
    }
  });
});
