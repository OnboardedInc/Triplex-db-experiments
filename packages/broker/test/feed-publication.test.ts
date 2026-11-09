// [EXP-P2B-R3] Why: WAL visibility precedes publication; feed eligibility must use the post-flush witness.
// Rejected: reading the SQL marker alone (a round-three negative lag exposed early delivery).
import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { HostBroker } from "../src/broker.js";
import { LogFeed } from "../src/feed.js";
import { crc32c } from "../src/crc32c.js";
import type { Watermark } from "../src/log.js";
it("does not deliver an appended frame until publication and rejects corrupt publication bytes", async () => {
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
    broker = await HostBroker.open({
      dir,
      scopeKey: "publication",
      requireFullFsync: false,
      autoApply: false,
      minFreeBytes: 5 * 1024 ** 3,
    });
  let release!: () => void, reached!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    atPublication = new Promise<void>((r) => (reached = r));
  const log = (
      broker as unknown as { log: { publishWatermarkAsync(mark: Watermark): Promise<void> } }
    ).log,
    original = log.publishWatermarkAsync.bind(log);
  log.publishWatermarkAsync = async (mark) => {
    reached();
    await gate;
    await original(mark);
  };
  try {
    const pending = broker.submit({
      operationId: "one",
      attemptId: "one",
      sourceK: 0,
      reads: { entities: new Set<string>(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: [],
      priors: new Map(),
      newIds: new Set<string>(),
    });
    await atPublication;
    const feed = new LogFeed(dir),
      before = await feed.poll(feed.start());
    expect(before.resolutions.filter((r) => r.kind === "commit")).toEqual([]);
    release();
    const receipt = await pending;
    if (receipt.kind !== "committed") throw Error("No receipt");
    const after = await feed.poll(before.cursor);
    expect(
      after.resolutions
        .filter((r) => r.kind === "commit")
        .flatMap((r) => r.transacts.flatMap((tx) => tx.positions)),
    ).toEqual([...receipt.positions.values()]);
    const file = path.join(dir, "ACKED"),
      saved = fs.readFileSync(file),
      corrupt = Buffer.from(saved);
    corrupt[0] = corrupt[0]! ^ 1;
    fs.writeFileSync(file, corrupt);
    try {
      await expect(feed.poll(feed.start())).rejects.toThrow("Publication sidecar corrupt");
    } finally {
      fs.writeFileSync(file, saved);
    }
    const wrong = Buffer.from(saved);
    wrong.writeBigUInt64LE(wrong.readBigUInt64LE(16) + 1n, 16);
    wrong.writeUInt32LE(crc32c(wrong.subarray(0, 28)), 28);
    fs.writeFileSync(file, wrong);
    try {
      await expect(feed.poll(feed.start())).rejects.toThrow("position mismatch");
    } finally {
      fs.writeFileSync(file, saved);
    }
  } finally {
    release();
    await broker.close();
  }
});

// [EXP-P2B-R3] Why: an empty administrative group advances the frame cursor without inventing a transaction position.
// Rejected: Math.max of an empty positions array (would reject a valid zero-position prefix).
it("keeps a valid publication position across an empty commit group", async () => {
  const { HostLog } = await import("../src/log.js"),
    { FrameKind } = await import("../src/frame.js"),
    { encodeCommitGroup } = await import("../src/frames.js");
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
    { log } = await HostLog.open(dir, { requireFullFsync: false, minFreeBytes: 5 * 1024 ** 3 });
  try {
    const frame = await log.append(
      FrameKind.COMMIT_GROUP,
      encodeCommitGroup({ v: 1, stream: "empty", lsn: log.nextLsn, epoch: log.epoch, members: [] }),
    );
    await log.publishWatermarkAsync({ lsn: frame.lsn, epoch: log.epoch, position: 0 });
    const feed = new LogFeed(dir),
      page = await feed.poll(feed.start());
    expect(page.watermark?.position).toBe(0);
    expect(page.cursor.lsn).toBe(frame.lsn);
    expect(page.resolutions.filter((r) => r.kind === "commit").flatMap((r) => r.transacts)).toEqual(
      [],
    );
  } finally {
    await log.close();
  }
});
