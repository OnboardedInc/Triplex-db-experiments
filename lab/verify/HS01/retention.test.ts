// [EXP-HS01] Why: R2 regressions for finite frame retention. (1) CX-VHS01 finding 1: a legal frame larger than the purge work
// budget must not become an immovable prefix. (2) Retention is by bytes, the quantity P5 pays for. (3) Pinned reads at old
// positions stay exact after frames are purged. Rejected: testing only small hint frames (they never reach the budget).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  HostLog,
  hostLogRecovery,
  BrokerLogError,
  FeedRetentionExpired,
} from "../../../packages/qlever/src/broker/log.js";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.js";
import { FrameKind, MAX_PAYLOAD } from "../../../packages/qlever/src/broker/frame.js";
import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { columns } from "../../../packages/qlever/src/rdf.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const Database = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const MiB = 1024 * 1024,
  FRAME_OVERHEAD = 36; // 32-byte header + 4-byte trailer
const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "stores")
  : path.resolve("runs/HS01");
const stats: Record<string, unknown> = {};
const writeStats = () => {
  if (process.env.HS01_RESULT) {
    const file = path.join(path.dirname(process.env.HS01_RESULT), "retention-measurements.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(stats, null, 2));
  }
};
const fresh = () => {
  const dir = path.join(root, randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const retained = (log: HostLog) => {
  const db = new Database(log.segmentPath, { readonly: true });
  try {
    return db
      .prepare("SELECT count(*) n,coalesce(sum(end-offset),0) bytes,min(lsn) first FROM frames")
      .get() as { n: number; bytes: number; first: number };
  } finally {
    db.close();
  }
};
// publish=false appends without the automatic purge that publishWatermark runs, so a test sees each purge call itself.
const hint = async (log: HostLog, frameBytes: number, publish = true) => {
  const frame = await log.append(
    FrameKind.APPLIED_HINT,
    Buffer.alloc(frameBytes - FRAME_OVERHEAD, 7),
  );
  expect(frame.end - frame.offset).toBe(frameBytes);
  if (publish)
    log.publishWatermark({
      epoch: log.epoch,
      lsn: frame.lsn,
      position: hostLogRecovery(log).marker.position,
    });
  return frame;
};
const drain = (log: HostLog) => {
  const calls: { removed: number; anchor: number; bytes: number; ms: number }[] = [];
  for (;;) {
    const start = performance.now(),
      r = log.purgeFrames();
    if (!r.removed) return calls;
    calls.push({ ...r, ms: performance.now() - start });
  }
};
const row = (id: string, entity: string, value: string, pos: number): TripleRow =>
  ({
    ...Object.fromEntries(columns.map((c) => [c, null])),
    id,
    entity_id: entity,
    attribute: ":name",
    value_type: "string",
    value_string: value,
    recorded_at: 1700000000000,
    recorded_position: pos,
    valid_from: 1700000000000,
    entity_type: "Subject",
    schema_version: 1,
    tx_id: "tx:" + pos,
  }) as TripleRow;
const group = (log: HostLog, lsn: number, rows: TripleRow[], op: string) =>
  log.append(
    FrameKind.COMMIT_GROUP,
    encodeCommitGroup({
      v: 1,
      stream: "hs01-retention",
      lsn,
      epoch: log.epoch,
      members: [
        {
          operationId: op,
          attemptId: op,
          positions: [lsn * 1024],
          claims: [{ commandId: op, txId: "tx:" + lsn * 1024, timestamp: 100 }],
          subjects: ["pe"],
          rows,
          priors: rows
            .filter((r) => r.retracted_position !== null)
            .map((r) => ({
              ...r,
              retracted_at: null,
              retracted_position: null,
              retract_tx_id: null,
            })),
        },
      ],
    }),
  );
describe("EXP-HS01 round 2 frame retention", () => {
  it("CX-VHS01 reproduction: retention advances beyond a legal group larger than the purge work budget", async () => {
    const { log } = await HostLog.open(fresh(), {
      minFreeBytes: 0,
      frameRetention: { tailFrames: 1 },
    });
    try {
      const lsn = log.nextLsn,
        pos = lsn * 1024;
      const rows = Array.from({ length: 20 }, (_, j) =>
        row("large/" + j, "large-subject", "x".repeat(900000), pos),
      ).map((r, j) => ({ ...r, attribute: ":a" + j }));
      const payload = encodeCommitGroup({
        v: 1,
        stream: "large",
        lsn,
        epoch: log.epoch,
        members: [
          {
            operationId: "large-operation",
            attemptId: "large-attempt",
            positions: [pos],
            rows,
            priors: [],
            claims: [],
            subjects: ["large-subject"],
          },
        ],
      });
      const big = await log.append(FrameKind.COMMIT_GROUP, payload);
      expect(big.end - big.offset).toBeGreaterThan(16 * MiB);
      log.publishWatermark({ lsn: big.lsn, epoch: log.epoch, position: pos });
      for (let i = 0; i < 10; i++) await hint(log, 100);
      const purges = Array.from({ length: 5 }, () => log.purgeFrames());
      const anchor = hostLogRecovery(log).marker.base_lsn;
      // Before the fix every call returned {removed:0, anchor:1} (reviewer's observation at LSN 2).
      expect(anchor).toBeGreaterThanOrEqual(big.lsn);
      expect(retained(log).n).toBe(1);
      stats.reviewerReproduction = {
        payloadBytes: payload.length,
        frameBytes: big.end - big.offset,
        purges,
      };
      writeStats();
    } finally {
      await log.close();
    }
  });
  it("makes progress at and around the 16 MiB work boundary, header and trailer included", async () => {
    const results: unknown[] = [];
    const dirs: string[] = [];
    for (const size of [
      16 * MiB - 1,
      16 * MiB,
      16 * MiB + 1,
      16 * MiB + FRAME_OVERHEAD,
      17 * MiB,
    ]) {
      const dir = fresh();
      dirs.push(dir);
      const { log } = await HostLog.open(dir, {
        minFreeBytes: 0,
        frameRetention: { tailFrames: 1 },
      });
      try {
        const big = await hint(log, size, false);
        for (let i = 0; i < 5; i++) await hint(log, 100, false);
        const calls = drain(log);
        // Every call removes something (drain stops at zero), stays within 16 MiB unless it is one frame, and
        // the big frame (LSN 2, behind only the small opening frame) is gone within two calls.
        expect(calls.length, "size " + size).toBeLessThanOrEqual(3);
        expect(
          calls.find((c) => c.anchor >= big.lsn),
          "size " + size,
        ).toBeDefined();
        expect(calls.findIndex((c) => c.anchor >= big.lsn)).toBeLessThanOrEqual(1);
        for (const c of calls)
          expect(c.bytes <= 16 * MiB || c.removed === 1, "size " + size).toBe(true);
        expect(retained(log).n).toBe(1);
        expect(hostLogRecovery(log).marker.base_lsn).toBe(log.nextLsn - 2);
        results.push({ size, calls });
      } finally {
        await log.close();
      }
    }
    stats.boundary = results;
    writeStats();
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  });
  it("purges and reopens a frame at the format's payload limit (256 MiB) when disk allows, else 64 MiB", async () => {
    // [EXP-HS01] Why: the purge work bound is "16 MiB plus one frame", so the cost of the largest legal frame is measured.
    // The test never crosses the lab's 5 GiB disk floor: with under 768 MiB of headroom it uses a 64 MiB payload (still four
    // times the 16 MiB budget) and says so in the measurement (`full:false`). Rejected: skipping silently.
    const free = fs.statfsSync(root),
      headroom = free.bavail * free.bsize - 5 * 1024 ** 3;
    if (headroom < 192 * MiB)
      throw Error("RESOURCE-ABORT largest-frame test needs 192 MiB above the 5 GiB floor");
    const full = headroom >= 768 * MiB,
      payloadBytes = full ? MAX_PAYLOAD : 64 * MiB;
    const dir = fresh();
    let { log } = await HostLog.open(dir, {
      minFreeBytes: 5 * 1024 ** 3,
      frameRetention: { tailFrames: 1 },
    });
    try {
      const appendStart = performance.now();
      const frame = await log.append(FrameKind.APPLIED_HINT, Buffer.alloc(payloadBytes, 3));
      const appendMs = performance.now() - appendStart;
      await hint(log, 100, false);
      await hint(log, 100, false);
      const calls = drain(log);
      const bigCall = calls.find((c) => c.bytes >= payloadBytes + FRAME_OVERHEAD)!;
      expect(bigCall, "one call removes the whole frame").toBeDefined();
      expect(bigCall.removed).toBe(1);
      expect(retained(log).n).toBe(1);
      await log.close();
      const open = performance.now();
      ({ log } = await HostLog.open(dir, { minFreeBytes: 0, frameRetention: { tailFrames: 1 } }));
      stats.largestFrame = {
        full,
        payload: payloadBytes,
        formatLimit: MAX_PAYLOAD,
        frameBytes: frame.end - frame.offset,
        appendMs,
        purgeCalls: calls,
        reopenMs: performance.now() - open,
        headroomBytes: headroom,
      };
      writeStats();
    } finally {
      await log.close();
      // The file keeps its freed pages; the measurement is recorded, so the store is disposable.
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 300_000);
  it("retains by bytes: the smallest suffix of at least tailBytes, default keeps all, invalid refused", async () => {
    const frameBytes = 100_000;
    const open = (frameRetention?: { tailFrames?: number; tailBytes?: number }) =>
      HostLog.open(fresh(), { minFreeBytes: 0, ...(frameRetention ? { frameRetention } : {}) });
    {
      const { log } = await open();
      try {
        for (let i = 0; i < 12; i++) await hint(log, frameBytes);
        expect(drain(log)).toEqual([]);
        expect(retained(log).n).toBe(13);
      } finally {
        await log.close();
      }
    }
    // 40 hints plus the opening EPOCH_BEGIN frame: LSNs 1..41, so a retained suffix of n frames has base_lsn 41-n.
    for (const { options, frames, minimal } of [
      { options: { tailBytes: 1_000_000 }, frames: 10, minimal: true },
      { options: { tailBytes: 1_000_001 }, frames: 11, minimal: true },
      { options: { tailBytes: 0 }, frames: 1 },
      { options: { tailBytes: 1 }, frames: 1 },
      { options: { tailFrames: 3 }, frames: 3 },
      { options: { tailFrames: 3, tailBytes: 50_000 }, frames: 3 },
      { options: { tailFrames: 3, tailBytes: 450_000 }, frames: 5, minimal: true },
      { options: { tailFrames: Infinity, tailBytes: 1 }, frames: 41 },
    ] as {
      options: { tailFrames?: number; tailBytes?: number };
      frames: number;
      minimal?: boolean;
    }[]) {
      const { log } = await open(options);
      try {
        for (let i = 0; i < 40; i++) await hint(log, frameBytes);
        drain(log);
        const kept = retained(log);
        expect(kept.n, JSON.stringify(options)).toBe(frames);
        if (minimal) {
          expect(kept.bytes).toBeGreaterThanOrEqual(options.tailBytes!);
          // Minimal: dropping the oldest retained frame would leave fewer than tailBytes.
          expect(kept.bytes - frameBytes).toBeLessThan(options.tailBytes!);
        }
        expect(hostLogRecovery(log).marker.base_lsn).toBe(41 - kept.n);
      } finally {
        await log.close();
      }
    }
    for (const bad of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2])
      await expect(open({ tailBytes: bad })).rejects.toThrow(BrokerLogError);
    await expect(open({ tailFrames: -1 })).rejects.toThrow(BrokerLogError);
  });
  it("holders and the last frame bound byte retention", async () => {
    const { log } = await HostLog.open(fresh(), {
      minFreeBytes: 0,
      frameRetention: { tailBytes: 0 },
    });
    try {
      log.retain("consumer", 1);
      for (let i = 0; i < 10; i++) await hint(log, 1000);
      drain(log);
      expect(hostLogRecovery(log).marker.base_lsn).toBe(1);
      log.retain("consumer", 4);
      drain(log);
      expect(hostLogRecovery(log).marker.base_lsn).toBe(4);
      log.release("consumer");
      drain(log);
      expect(retained(log).n).toBe(1);
      expect(hostLogRecovery(log).marker.lsn).toBe(retained(log).first);
    } finally {
      await log.close();
    }
  });
  it("keeps pinned reads at old positions exact after byte-retention purges, across reopen, with typed cursor expiry", async () => {
    const dir = fresh(),
      options = { minFreeBytes: 0, frameRetention: { tailBytes: 200_000 } };
    let { log } = await HostLog.open(dir, options);
    const stale = new LogFeed(dir).start();
    try {
      const l1 = log.nextLsn,
        old = row("0".repeat(25) + "1", "pe", "old", l1 * 1024);
      await group(log, l1, [old], "g1");
      log.publishWatermark({ epoch: log.epoch, lsn: l1, position: l1 * 1024 });
      const l2 = log.nextLsn,
        replacement = row("0".repeat(25) + "2", "pe", "new", l2 * 1024);
      await group(
        log,
        l2,
        [
          {
            ...old,
            retracted_at: 1700000000000,
            retracted_position: l2 * 1024,
            retract_tx_id: "tx:" + l2 * 1024,
          },
          replacement,
        ],
        "g2",
      );
      log.publishWatermark({ epoch: log.epoch, lsn: l2, position: l2 * 1024 });
      const pin = log.pinBasis(l1 * 1024, "reader");
      for (let i = 0; i < 40; i++) await hint(log, 50_000);
      log.purge(l2 * 1024);
      drain(log);
      const anchor = hostLogRecovery(log).marker.base_lsn;
      expect(anchor).toBeGreaterThan(l2);
      const check = async (l: HostLog) => {
        const atOld = await l.pull(l1 * 1024, { entities: ["pe"] }),
          atNew = await l.pull(l2 * 1024, { entities: ["pe"] });
        expect(atOld.eligible).toBe(true);
        expect(atOld.rows.map((r) => [r.id, r.value_string, r.retracted_position])).toEqual([
          [old.id, "old", l2 * 1024],
        ]);
        expect(atNew.eligible).toBe(true);
        expect(atNew.rows.map((r) => [r.id, r.value_string, r.retracted_position])).toEqual([
          [replacement.id, "new", null],
        ]);
      };
      await check(log);
      pin.release();
      await log.close();
      ({ log } = await HostLog.open(dir, options));
      expect(hostLogRecovery(log).marker.base_lsn).toBeGreaterThanOrEqual(anchor);
      await check(log);
      expect(() => new LogFeed(dir).poll(stale)).toThrow(FeedRetentionExpired);
    } finally {
      await log.close();
    }
  });
});
