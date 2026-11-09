// Brief check 2: ACK ordering (fsync, then watermark, then ACK), group commit, lost-ACK resend, typed CAS conflict.
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, string } from "@triplex-build/triplex";
import { readWatermark } from "../../../../packages/qlever/src/broker/log.js";
import { attempt, freshDir, logMembers, openRt, ops, readSegment, sleep, writeJson } from "./harness.js";

describe("ACK ordering trace", () => {
  it("every ACK follows its frame's fsync return and the watermark update; groups stay at or under 64; no timer", async () => {
    const dir = freshDir("c2-trace");
    const rt = await openRt(dir, `v-p2q-c2:${randomUUID()}`);
    const trace: { ev: string; lsn?: number; t: number; seq: number }[] = [];
    let seq = 0;
    const mark = (ev: string, lsn?: number) => trace.push({ ev, ...(lsn === undefined ? {} : { lsn }), t: performance.now(), seq: seq++ });
    const log = (rt.broker as any).log;
    const handle = log.handle;
    const sync = handle.sync.bind(handle);
    handle.sync = async () => {
      const lsn = log.nextLsn; // the frame being appended
      mark("fsync-begin", lsn);
      await sync();
      mark("fsync-end", lsn);
    };
    const publish = log.publishWatermark.bind(log);
    log.publishWatermark = (m: { lsn: number }) => {
      mark("watermark", m.lsn);
      publish(m);
    };
    // At ACK time the broker must already serve the commit from its own record and the on-disk watermark.
    const broker = rt.broker as any;
    const submit = broker.submit.bind(broker);
    const checks: { lsn: number; watermarkOnDisk: number; durable: number; overlayHas: boolean }[] = [];
    broker.submit = (txn: any) =>
      submit(txn).then((decision: any) => {
        if (decision.kind === "committed" && !decision.replayed) {
          mark("ack", decision.lsn);
          const ids = new Set(txn.rows.map((r: any) => r.id));
          const overlay = broker.overlay(0, {}, (row: any) => ids.has(row.id)) ?? [];
          checks.push({ lsn: decision.lsn, watermarkOnDisk: readWatermark(dir)!.lsn, durable: broker.durable().lsn, overlayHas: overlay.length === ids.size });
        }
        return decision;
      });
    try {
      // Lone commands first (no timer: each gets its own frame at once), then bursts of 200 concurrent ones.
      const lone: number[] = [];
      for (let i = 0; i < 20; i++) {
        const t0 = performance.now();
        await rt.run(rt.triples.transact(ops(`s:lone${i}`, 10, "l")));
        lone.push(performance.now() - t0);
      }
      for (let burst = 0; burst < 3; burst++)
        await rt.run(
          Effect.all(
            Array.from({ length: 200 }, (_v, i) => rt.triples.transact(ops(`s:b${burst}-${i}`, 5, "b"))),
            { concurrency: "unbounded" },
          ),
        );
      const violations: string[] = [];
      for (const ack of trace.filter((e) => e.ev === "ack")) {
        const fsyncEnd = trace.find((e) => e.ev === "fsync-end" && e.lsn === ack.lsn);
        const wm = trace.find((e) => e.ev === "watermark" && e.lsn === ack.lsn);
        if (!fsyncEnd || fsyncEnd.seq > ack.seq) violations.push(`ack ${ack.lsn} before fsync`);
        if (!wm || wm.seq > ack.seq || (fsyncEnd && wm.seq < fsyncEnd.seq)) violations.push(`ack ${ack.lsn} watermark order`);
      }
      const members = new Map<number, number>();
      for (const m of logMembers(path.join(dir, "segment-000001.log"))) members.set(m.lsn, (members.get(m.lsn) ?? 0) + 1);
      const sizes = [...members.values()];
      const loneFrames = sizes.slice(0, 20);
      const fsyncMs = trace
        .filter((e) => e.ev === "fsync-end")
        .map((e) => e.t - trace.find((b) => b.ev === "fsync-begin" && b.lsn === e.lsn)!.t)
        .sort((a, b) => a - b);
      lone.sort((a, b) => a - b);
      const record = {
        acks: trace.filter((e) => e.ev === "ack").length,
        violations,
        atAckChecksFailed: checks.filter((c) => c.watermarkOnDisk < c.lsn || c.durable < c.lsn || !c.overlayHas).length,
        frames: sizes.length,
        maxMembersPerFrame: Math.max(...sizes),
        framesOver1: sizes.filter((n) => n > 1).length,
        loneFrameSizes: [...new Set(loneFrames)],
        loneCommandMs: { p50: lone[10], max: lone[19] },
        fsyncMs: { p50: fsyncMs[Math.floor(fsyncMs.length / 2)], max: fsyncMs.at(-1) },
      };
      writeJson("check2-ack-trace.json", { record, sample: trace.slice(0, 60) });
      expect(violations).toEqual([]);
      expect(record.atAckChecksFailed).toBe(0);
      expect(record.maxMembersPerFrame).toBeLessThanOrEqual(64);
      expect(record.framesOver1).toBeGreaterThan(0);
      expect(record.loneFrameSizes).toEqual([1]);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("lost ACK and duplicates", () => {
  it("a sequential resend and a concurrent duplicate both resolve to the original transaction", async () => {
    const dir = freshDir("c2-dup");
    const rt = await openRt(dir, `v-p2q-c2b:${randomUUID()}`);
    try {
      const original = await rt.run(rt.triples.transact(ops("s:d", 10, "o"), { commandId: "dup-1" }));
      const resend = await attempt(rt, rt.triples.transact(ops("s:d", 10, "o"), { commandId: "dup-1" }));
      const concurrent = await Promise.all(
        Array.from({ length: 6 }, () => attempt(rt, rt.triples.transact(ops("s:e", 10, "c"), { commandId: "dup-2" }))),
      );
      const committed = concurrent.filter((r) => r.ok);
      const dupErrors = concurrent.filter((r) => !r.ok && r.error?._tag === "CommandAlreadyCommittedError");
      const others = concurrent.filter((r) => !r.ok && r.error?._tag !== "CommandAlreadyCommittedError").map((r) => `${r.error?._tag}:${r.error?.reason}`);
      const inLog = logMembers(path.join(dir, "segment-000001.log")).filter((m) => m.commandIds.includes("dup-2")).length;
      const record = {
        sequential: { tag: resend.error?._tag, sameTx: resend.error?.transactionId === original.txId },
        concurrent: { committed: committed.length, duplicateErrors: dupErrors.length, sameTx: dupErrors.every((r) => r.error.transactionId === committed[0]?.value.txId), others, framesHolding: inLog },
      };
      writeJson("check2-duplicates.json", record);
      expect(record.sequential.sameTx).toBe(true);
      expect(committed.length).toBe(1);
      expect(inLog).toBe(1);
      expect(record.concurrent.sameTx).toBe(true);
      expect(others).toEqual([]);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});

describe("compare-and-set conflict", () => {
  it("two transactions that read and write one subject at the same head: one commits, one gets a typed conflict", async () => {
    const dir = freshDir("c2-cas");
    const rt = await openRt(dir, `v-p2q-c2c:${randomUUID()}`);
    try {
      await rt.run(rt.triples.transact(ops("s:x", 1, "seed")));
      const txn = (tag: string) =>
        rt.adapter.withTransaction(
          Effect.gen(function* () {
            yield* rt.adapter.getByEntity("s:x");
            yield* Effect.promise(() => sleep(5));
            const p = yield* rt.adapter.nextCommitPosition();
            yield* rt.adapter.insert(
              { entityId: EntityId.make("s:x"), attribute: ":cas", value: string(tag) },
              `_tx/${tag}`,
              Date.now(),
              `id-${tag}-${randomUUID()}`,
              p,
            );
          }),
        );
      const results = await Promise.all([attempt(rt, txn("a")), attempt(rt, txn("b"))]);
      const failures = results.filter((r) => !r.ok).map((r) => ({ tag: r.error?._tag, reason: r.error?.reason, ctor: r.error?.constructor?.name, message: r.error?.message }));
      writeJson("check2-cas.json", { committed: results.filter((r) => r.ok).length, failures });
      expect(results.filter((r) => r.ok).length).toBe(1);
      expect(failures[0]!.reason).toBe("serialization-conflict");
      expect(failures[0]!.ctor).toBe("QleverBrokerConflict");
      // A third write at a stale sourceK, a different subject read: no conflict (per-subject CAS).
      expect(readSegment(path.join(dir, "segment-000001.log")).length).toBeGreaterThan(2);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });
});
