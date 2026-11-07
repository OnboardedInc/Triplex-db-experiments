// Brief check 1: durability and framing (offline).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { scanSegment } from "../../../../packages/qlever/src/broker/frame.js";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.js";
import { readWatermark } from "../../../../packages/qlever/src/broker/log.js";
import { attempt, freshDir, logMembers, openRt, oracleAt, ops, at, key, readSegment, sleep, writeJson } from "./harness.js";

const SEG = "segment-000001.log";
const far = () => Date.now() + 10 ** 9;

/** A log with three 10-fact commands and a small last command, abandoned (crash without close). */
const buildLog = async () => {
  const dir = freshDir("c1-base");
  const scope = `v-p2q-c1:${randomUUID()}`;
  const rt = await openRt(dir, scope);
  const results = [];
  for (let i = 0; i < 3; i++) results.push(await rt.run(rt.triples.transact(ops(`s:${i}`, 10, `a${i}`), { commandId: `c1-${i}` })));
  const last = await rt.run(rt.triples.transact(ops("s:last", 1, "z"), { commandId: "c1-last" }));
  await rt.dispose();
  await rt.broker.abandon();
  return { dir, scope, results, last };
};
const copyDir = (from: string, cut?: number) => {
  const to = freshDir("c1-copy");
  fs.mkdirSync(to, { recursive: true });
  const bytes = fs.readFileSync(path.join(from, SEG));
  fs.writeFileSync(path.join(to, SEG), cut === undefined ? bytes : bytes.subarray(0, cut));
  return to;
};

describe("torn tails at every byte offset of the last frame", () => {
  it("classifies every cut, and a full reopen truncates, keeps the backup and burns the LSN", async () => {
    const base = await buildLog();
    const bytes = fs.readFileSync(path.join(base.dir, SEG));
    const frames = readSegment(path.join(base.dir, SEG));
    const lastFrame = frames.filter((f) => f.kind === 1).at(-1)!;
    const lastLsn = lastFrame.lsn;
    const start = lastFrame.offset;
    const end = start + 32 + lastFrame.payload.length + 4;
    expect(end).toBe(bytes.length);
    const classes: Record<string, number> = {};
    for (let cut = start; cut < end; cut++) {
      const scan = scanSegment(bytes.subarray(0, cut));
      const want = cut === start ? "clean-end" : "torn-tail";
      classes[scan.status] = (classes[scan.status] ?? 0) + 1;
      expect(scan.status).toBe(want);
      expect(scan.validEnd).toBe(start);
      expect(scan.nextLsn).toBe(lastLsn);
    }
    // Full opens on a sample of cuts (every header byte, payload edges, trailer, and every 53rd byte).
    const sample = new Set<number>();
    for (let c = start + 1; c <= start + 33; c++) sample.add(c);
    for (let c = end - 6; c < end; c++) sample.add(c);
    for (let c = start + 1; c < end; c += 53) sample.add(c);
    let opened = 0;
    for (const cut of [...sample].filter((c) => c > start && c < end)) {
      const dir = copyDir(base.dir, cut);
      const broker = await HostBroker.open({ dir, scopeKey: base.scope, minFreeBytes: 256 * 1024 ** 2 });
      const stats = broker.stats();
      expect(stats.recovery).toBe("torn-tail");
      expect(stats.abortedLsns).toEqual([lastLsn]);
      const broken = fs.readdirSync(dir).filter((f) => f.startsWith("broken-"));
      expect(broken.length).toBe(1);
      expect(fs.readFileSync(path.join(dir, broken[0]!)).equals(bytes.subarray(start, cut))).toBe(true);
      // The three complete commands survive; the torn one does not exist.
      for (let i = 0; i < 3; i++) expect(broker.claim(`c1-${i}`)?.txId).toBe(base.results[i]!.txId);
      expect(broker.claim("c1-last")).toBeUndefined();
      const after = readSegment(path.join(dir, SEG));
      expect(after.at(-1)!.kind).toBe(2);
      expect(after.at(-1)!.lsn).toBe(lastLsn + 1);
      expect(fs.statSync(path.join(dir, SEG)).size).toBe(start + 32 + after.at(-1)!.payload.length + 4);
      await broker.close();
      opened++;
    }
    writeJson("check1-torn-tails.json", { lastLsn, frameBytes: end - start, cutsScanned: end - start, classes, fullOpens: opened });
  });
});

describe("bit flips", () => {
  it("every bit of a middle frame and of the segment header is refused; the last frame is the known R13 limit", async () => {
    const base = await buildLog();
    const bytes = fs.readFileSync(path.join(base.dir, SEG));
    const commits = readSegment(path.join(base.dir, SEG)).filter((f) => f.kind === 1);
    const middle = commits[1]!;
    const mEnd = middle.offset + 32 + middle.payload.length + 4;
    const statuses: Record<string, number> = {};
    for (let i = middle.offset; i < mEnd; i++)
      for (let bit = 0; bit < 8; bit++) {
        const flipped = Buffer.from(bytes);
        flipped[i]! ^= 1 << bit;
        const s = scanSegment(flipped).status;
        statuses[s] = (statuses[s] ?? 0) + 1;
      }
    const header: Record<string, number> = {};
    for (let i = 0; i < 32; i++)
      for (let bit = 0; bit < 8; bit++) {
        const flipped = Buffer.from(bytes);
        flipped[i]! ^= 1 << bit;
        const s = scanSegment(flipped).status;
        header[s] = (header[s] ?? 0) + 1;
      }
    // Last commit frame: a flip there is indistinguishable from a torn write (R13 2.4 known limit).
    const last = commits.at(-1)!;
    const lastFlip = Buffer.from(bytes);
    lastFlip[last.offset + 40]! ^= 1;
    const lastStatus = scanSegment(lastFlip).status;
    // And the broker opens it offline by truncating an acknowledged frame.
    const dir = copyDir(base.dir);
    fs.writeFileSync(path.join(dir, SEG), lastFlip);
    const broker = await HostBroker.open({ dir, scopeKey: base.scope, minFreeBytes: 256 * 1024 ** 2 });
    const lostAckedFrame = broker.claim("c1-last") === undefined;
    await broker.close();
    // A full open of one middle flip refuses to start.
    const dir2 = copyDir(base.dir);
    const flipped = Buffer.from(bytes);
    flipped[middle.offset + 50]! ^= 4;
    fs.writeFileSync(path.join(dir2, SEG), flipped);
    const refused = await HostBroker.open({ dir: dir2, scopeKey: base.scope, minFreeBytes: 256 * 1024 ** 2 }).then(
      async (b) => (await b.close(), false),
      (error) => String(error).includes("refusing to start"),
    );
    // Which header bits read as a torn tail, and what a full open does with one of them.
    const tornHeaderBits: string[] = [];
    for (let i = 0; i < 32; i++)
      for (let bit = 0; bit < 8; bit++) {
        const f = Buffer.from(bytes);
        f[i]! ^= 1 << bit;
        if (scanSegment(f).status === "torn-tail") tornHeaderBits.push(`byte${i}.bit${bit}`);
      }
    const dir3 = copyDir(base.dir);
    const headerFlip = Buffer.from(bytes);
    headerFlip[30]! ^= 0x10; // firstLsn (bytes 24..31) becomes huge
    fs.writeFileSync(path.join(dir3, SEG), headerFlip);
    const headerOpen = await HostBroker.open({ dir: dir3, scopeKey: base.scope, minFreeBytes: 256 * 1024 ** 2 }).then(
      async (b) => {
        const out = {
          opened: true,
          recovery: b.stats().recovery,
          survivingClaims: [0, 1, 2].filter((i) => b.claim(`c1-${i}`) !== undefined).length + (b.claim("c1-last") ? 1 : 0),
          segmentBytesAfter: fs.statSync(path.join(dir3, SEG)).size,
          segmentBytesBefore: bytes.length,
        };
        await b.close();
        return out;
      },
      (error) => ({ opened: false, error: String(error).slice(0, 160) }),
    );
    writeJson("check1-bit-flips.json", { middleFrameBits: (mEnd - middle.offset) * 8, statuses, header, tornHeaderBits, headerFirstLsnFlipOpen: headerOpen, lastStatus, lostAckedFrameOfflineAfterLastFrameFlip: lostAckedFrame, middleFlipRefused: refused });
    expect(Object.keys(statuses)).toEqual(["corruption"]);
    expect(refused).toBe(true);
  });
});

describe("crash windows around the fsync", () => {
  it("crash between write and fsync: the client gets outcome-unknown, the restart decides, a resend resolves", async () => {
    const dir = freshDir("c1-prefsync");
    const scope = `v-p2q-c1b:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    const ok = await rt.run(rt.triples.transact(ops("s:p", 2, "ok"), { commandId: "pf-0" }));
    const log = (rt.broker as any).log;
    const handle = log.handle;
    handle.sync = async () => {
      throw new Error("simulated crash before fsync returned");
    };
    const res = await attempt(rt, rt.triples.transact(ops("s:p", 2, "pending"), { commandId: "pf-1" }));
    expect(res.ok).toBe(false);
    const tag = res.error?.reason;
    await rt.dispose();
    await rt.broker.abandon();
    // The write completed (only the fsync "failed"), so the whole frame is on disk; the restart replays it.
    const rt2 = await openRt(dir, scope);
    try {
      expect(rt2.broker.claim("pf-0")?.txId).toBe(ok.txId);
      const replayed = rt2.broker.claim("pf-1");
      const resend = await attempt(rt2, rt2.triples.transact(ops("s:p", 2, "pending"), { commandId: "pf-1" }));
      writeJson("check1-crash-before-fsync.json", { clientError: tag, frameReplayed: replayed !== undefined, resend: resend.ok ? "committed-again" : resend.error?._tag, resendTx: resend.error?.transactionId, replayedTx: replayed?.txId });
      expect(tag).toBe("outcome-unknown");
      expect(replayed).toBeDefined();
      expect(resend.ok).toBe(false);
      expect(resend.error?._tag).toBe("CommandAlreadyCommittedError");
      expect(resend.error?.transactionId).toBe(replayed!.txId);
    } finally {
      await rt2.dispose();
      await rt2.broker.close();
    }
  });

  it("crash mid-write: half a frame, the restart burns the LSN, the resend commits once after the gap", async () => {
    const dir = freshDir("c1-midwrite");
    const scope = `v-p2q-c1c:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    await rt.run(rt.triples.transact(ops("s:m", 2, "ok"), { commandId: "mw-0" }));
    const handle = (rt.broker as any).log.handle;
    const write = handle.write.bind(handle);
    handle.write = async (buf: Buffer, offset: number, length: number) => {
      await write(buf, offset, Math.floor(length / 2));
      throw new Error("simulated crash mid-write");
    };
    const res = await attempt(rt, rt.triples.transact(ops("s:m", 2, "torn"), { commandId: "mw-1" }));
    await rt.dispose();
    await rt.broker.abandon();
    const rt2 = await openRt(dir, scope);
    try {
      const stats = rt2.broker.stats();
      expect(res.error?.reason).toBe("outcome-unknown");
      expect(stats.recovery).toBe("torn-tail");
      expect(stats.abortedLsns.length).toBe(1);
      expect(rt2.broker.claim("mw-1")).toBeUndefined();
      const resend = await rt2.run(rt2.triples.transact(ops("s:m", 2, "torn"), { commandId: "mw-1" }));
      expect(Math.floor(resend.position / 1024)).toBeGreaterThan(stats.abortedLsns[0]!);
      const rows = await rt2.run(rt2.adapter.getByEntity("s:m", at(resend.position)));
      expect(key(rows)).toBe(key(oracleAt(rt2.broker.segmentPath, resend.position, far(), (r) => r.entity_id === "s:m")));
      expect(rows.length).toBe(4);
      writeJson("check1-crash-mid-write.json", { clientError: res.error?.reason, aborted: stats.abortedLsns, resendPosition: resend.position });
    } finally {
      await rt2.dispose();
      await rt2.broker.close();
    }
  });

  it("crash between fsync and the watermark update: no ACK; the restart replays and republishes the watermark", async () => {
    const dir = freshDir("c1-prewm");
    const scope = `v-p2q-c1d:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    await rt.run(rt.triples.transact(ops("s:w", 1, "ok"), { commandId: "wm-0" }));
    const before = readWatermark(dir)!;
    const log = (rt.broker as any).log;
    log.publishWatermark = () => {
      throw new Error("simulated crash between fsync and watermark");
    };
    // The throw escapes the decision loop (broker.ts pump is `void`-called): capture it as evidence.
    const escaped: string[] = [];
    const onUnhandled = (reason: unknown) => escaped.push(String(reason));
    const vitestListeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", onUnhandled);
    const outcome = await Promise.race([
      attempt(rt, rt.triples.transact(ops("s:w", 1, "x"), { commandId: "wm-1" })).then((r) => (r.ok ? "acked" : `failed:${r.error?._tag}`)),
      sleep(3_000).then(() => "no-answer-after-3s"),
    ]);
    process.removeListener("unhandledRejection", onUnhandled);
    for (const l of vitestListeners) process.on("unhandledRejection", l as any);
    const onDisk = readWatermark(dir)!;
    const inLog = logMembers(path.join(dir, SEG)).some((m) => m.commandIds.includes("wm-1"));
    await rt.broker.abandon();
    const rt2 = await openRt(dir, scope);
    try {
      const after = readWatermark(dir)!;
      const resend = await attempt(rt2, rt2.triples.transact(ops("s:w", 1, "x"), { commandId: "wm-1" }));
      const record = { outcome, escapedUnhandledRejections: escaped, watermarkBefore: before, watermarkOnDiskAfterCrash: onDisk, frameInLog: inLog, watermarkAfterReopen: after, resend: resend.ok ? "committed-again" : resend.error?._tag };
      writeJson("check1-crash-before-watermark.json", record);
      expect(outcome).not.toBe("acked");
      expect(onDisk.lsn).toBe(before.lsn);
      expect(inLog).toBe(true);
      expect(after.lsn).toBeGreaterThan(before.lsn);
      expect(resend.error?._tag).toBe("CommandAlreadyCommittedError");
    } finally {
      await rt2.dispose();
      await rt2.broker.close();
    }
  });

  it("random kills under concurrent load: every ACKed command survives the restart (20 rounds)", async () => {
    const rounds: any[] = [];
    for (let round = 0; round < 20; round++) {
      const dir = freshDir("c1-kill");
      const scope = `v-p2q-c1e:${randomUUID()}`;
      const rt = await openRt(dir, scope);
      const acked = new Map<string, string>();
      const unknown: string[] = [];
      let stop = false;
      const workers = Array.from({ length: 8 }, async (_v, w) => {
        for (let i = 0; !stop; i++) {
          const id = `k${round}-${w}-${i}`;
          const r = await attempt(rt, rt.triples.transact(ops(`s:${w}`, 3, id), { commandId: id }));
          if (r.ok) acked.set(id, r.value.txId);
          else {
            unknown.push(id);
            if (r.error?.reason !== "outcome-unknown") unknown.push(`unexpected:${r.error?._tag}:${r.error?.reason}`);
            return;
          }
        }
      });
      await sleep(30 + round * 7);
      await rt.broker.abandon(); // closes the descriptor under in-flight appends
      stop = true;
      await Promise.allSettled(workers);
      await rt.dispose().catch(() => {});
      const rt2 = await openRt(dir, scope);
      const lost = [...acked].filter(([id, tx]) => rt2.broker.claim(id)?.txId !== tx).map(([id]) => id);
      const unknownCommitted = unknown.filter((id) => rt2.broker.claim(id) !== undefined).length;
      rounds.push({ round, acked: acked.size, unknown: unknown.length, unknownCommitted, lost, recovery: rt2.broker.stats().recovery, unexpected: unknown.filter((u) => u.startsWith("unexpected")) });
      await rt2.dispose();
      await rt2.broker.close();
    }
    writeJson("check1-random-kills.json", rounds);
    expect(rounds.every((r) => r.lost.length === 0)).toBe(true);
  });
});

describe("the stream lock", () => {
  it("a second broker in the same process takes over the LOCK; what happens to ACKed frames", async () => {
    const dir = freshDir("c1-lock");
    const scope = `v-p2q-c1f:${randomUUID()}`;
    const a = await openRt(dir, scope);
    const a1 = await a.run(a.triples.transact(ops("s:l", 1, "a1"), { commandId: "lock-a1" }));
    let secondOpened = true;
    let b: Awaited<ReturnType<typeof openRt>> | undefined;
    try {
      b = await openRt(dir, scope);
    } catch {
      secondOpened = false;
    }
    const record: any = { secondOpened };
    if (b) {
      const b1 = await b.run(b.triples.transact(ops("s:l", 1, "b1"), { commandId: "lock-b1" }));
      const a2 = await a.run(a.triples.transact(ops("s:l", 1, "a2"), { commandId: "lock-a2" }));
      record.acked = { a1: a1.txId, b1: b1.txId, a2: a2.txId, a2Position: a2.position, b1Position: b1.position };
      await a.dispose();
      await b.dispose();
      await a.broker.abandon();
      await b.broker.abandon();
      try {
        const c = await openRt(dir, scope);
        record.reopen = "opened";
        record.recovery = c.broker.stats().recovery;
        record.survived = { a1: c.broker.claim("lock-a1")?.txId === a1.txId, b1: c.broker.claim("lock-b1")?.txId === b1.txId, a2: c.broker.claim("lock-a2")?.txId === a2.txId };
        await c.dispose();
        await c.broker.close();
      } catch (error) {
        record.reopen = `refused: ${String(error).slice(0, 200)}`;
      }
    }
    writeJson("check1-double-open.json", record);
    // Recorded, not asserted: the verdict uses the record.
    expect(record).toBeDefined();
  });
});
