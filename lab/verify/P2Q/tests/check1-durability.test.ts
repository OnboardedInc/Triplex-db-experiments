// Brief check 1: durability and framing (offline). Round 2 (f711193): the copies carry the WATERMARK (the
// ACKed frame), torn tails of an unACKed last frame are truncated, damage to an ACKed frame is refused.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { scanSegment } from "../../../../packages/qlever/src/broker/frame.js";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.js";
import { readWatermark } from "../../../../packages/qlever/src/broker/log.js";
import { attempt, freshDir, logMembers, openRt, oracleAt, ops, at, key, readSegment, sleep, writeJson, writeWatermark } from "./harness.js";

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
const copyDir = (from: string, cut?: number, watermark = true) => {
  const to = freshDir("c1-copy");
  fs.mkdirSync(to, { recursive: true });
  const bytes = fs.readFileSync(path.join(from, SEG));
  fs.writeFileSync(path.join(to, SEG), cut === undefined ? bytes : bytes.subarray(0, cut));
  if (watermark && fs.existsSync(path.join(from, "WATERMARK"))) fs.copyFileSync(path.join(from, "WATERMARK"), path.join(to, "WATERMARK"));
  return to;
};
const openResult = (dir: string, scope: string) =>
  HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 256 * 1024 ** 2 }).then(
    async (b) => {
      const out = { opened: true as const, recovery: b.stats().recovery, aborted: b.stats().abortedLsns, claims: (ids: string[]) => ids.filter((id) => b.claim(id) !== undefined).length, broker: b };
      return out;
    },
    (error) => ({ opened: false as const, error: String(error).slice(0, 200) }),
  );

describe("torn tails at every byte offset of the last frame", () => {
  it("unACKed last frame: every cut classified and truncated with a backup; ACKed last frame: every cut refused", async () => {
    const base = await buildLog();
    const bytes = fs.readFileSync(path.join(base.dir, SEG));
    const frames = readSegment(path.join(base.dir, SEG));
    const lastFrame = frames.filter((f) => f.kind === 1).at(-1)!;
    const lastLsn = lastFrame.lsn;
    const start = lastFrame.offset;
    const end = start + 32 + lastFrame.payload.length + 4;
    const wm = readWatermark(base.dir)!;
    expect(end).toBe(bytes.length);
    expect(wm.lsn).toBe(lastLsn);
    const classes: Record<string, number> = {};
    for (let cut = start; cut < end; cut++) {
      const scan = scanSegment(bytes.subarray(0, cut));
      classes[scan.status] = (classes[scan.status] ?? 0) + 1;
      expect(scan.status).toBe(cut === start ? "clean-end" : "torn-tail");
      expect(scan.validEnd).toBe(start);
    }
    const sample = new Set<number>();
    for (let c = start + 1; c <= start + 33; c++) sample.add(c);
    for (let c = end - 6; c < end; c++) sample.add(c);
    for (let c = start + 1; c < end; c += 53) sample.add(c);
    let truncated = 0;
    let refused = 0;
    for (const cut of [...sample].filter((c) => c > start && c < end)) {
      // (a) the last frame's fsync never returned: WATERMARK names the previous frame -> truncate and burn.
      const dirA = copyDir(base.dir, cut);
      writeWatermark(dirA, wm.epoch, lastLsn - 1, base.results[2]!.position);
      const a = await openResult(dirA, base.scope);
      expect(a.opened).toBe(true);
      if (a.opened) {
        expect(a.recovery).toBe("torn-tail");
        expect(a.aborted).toEqual([lastLsn]);
        expect(a.claims(["c1-0", "c1-1", "c1-2"])).toBe(3);
        const broken = fs.readdirSync(dirA).filter((f) => f.startsWith("broken-"));
        expect(fs.readFileSync(path.join(dirA, broken[0]!)).equals(bytes.subarray(start, cut))).toBe(true);
        await a.broker.close();
        truncated++;
      }
      // (b) the last frame was ACKed (its WATERMARK is on disk): damage to it is refused, nothing is truncated.
      const dirB = copyDir(base.dir, cut);
      const b = await openResult(dirB, base.scope);
      expect(b.opened).toBe(false);
      expect(fs.statSync(path.join(dirB, SEG)).size).toBe(cut);
      refused++;
    }
    writeJson("check1-torn-tails.json", { lastLsn, frameBytes: end - start, cutsScanned: end - start, classes, unackedTruncated: truncated, ackedRefused: refused });
  });
});

describe("bit flips", () => {
  it("every bit of a middle frame, of the segment header and a flip in the ACKed last frame are refused", async () => {
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
    // Full opens: one firstLsn flip, one last-frame flip (with the WATERMARK the crash left), one middle flip.
    const results: Record<string, unknown> = {};
    for (const [name, offset, mask] of [["firstLsn", 30, 0x10], ["lastFrame", commits.at(-1)!.offset + 40, 1], ["middle", middle.offset + 50, 4]] as const) {
      const dir = copyDir(base.dir);
      const f = Buffer.from(bytes);
      f[offset]! ^= mask;
      fs.writeFileSync(path.join(dir, SEG), f);
      const r = await openResult(dir, base.scope);
      results[name] = r.opened ? { opened: true, recovery: r.recovery, survivingClaims: r.claims(["c1-0", "c1-1", "c1-2", "c1-last"]) } : { opened: false, error: r.error, segmentUntouched: fs.statSync(path.join(dir, SEG)).size === bytes.length };
      if (r.opened) await r.broker.close();
    }
    writeJson("check1-bit-flips.json", { middleFrameBits: (mEnd - middle.offset) * 8, statuses, header, fullOpens: results });
    expect(Object.keys(statuses)).toEqual(["corruption"]);
    expect(Object.keys(header)).toEqual(["bad-header"]);
    for (const r of Object.values(results)) expect((r as any).opened).toBe(false);
  });
});

describe("crash windows around the fsync", () => {
  it("crash between write and fsync: the client gets outcome-unknown, the restart decides, a resend resolves", async () => {
    const dir = freshDir("c1-prefsync");
    const scope = `v-p2q-c1b:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    const ok = await rt.run(rt.triples.transact(ops("s:p", 2, "ok"), { commandId: "pf-0" }));
    const handle = (rt.broker as any).log.handle;
    handle.sync = async () => {
      throw new Error("simulated crash before fsync returned");
    };
    const res = await attempt(rt, rt.triples.transact(ops("s:p", 2, "pending"), { commandId: "pf-1" }));
    await rt.dispose();
    await rt.broker.abandon();
    const rt2 = await openRt(dir, scope);
    try {
      expect(res.error?.reason).toBe("outcome-unknown");
      expect(rt2.broker.claim("pf-0")?.txId).toBe(ok.txId);
      const replayed = rt2.broker.claim("pf-1");
      const resend = await attempt(rt2, rt2.triples.transact(ops("s:p", 2, "pending"), { commandId: "pf-1" }));
      writeJson("check1-crash-before-fsync.json", { clientError: res.error?.reason, frameReplayed: replayed !== undefined, resend: resend.ok ? "committed-again" : resend.error?._tag });
      expect(replayed).toBeDefined();
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

  it("an exception between fsync and the watermark: outcome-unknown, no escape, the restart replays (m1)", async () => {
    const dir = freshDir("c1-prewm");
    const scope = `v-p2q-c1d:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    await rt.run(rt.triples.transact(ops("s:w", 1, "ok"), { commandId: "wm-0" }));
    const before = readWatermark(dir)!;
    const log = (rt.broker as any).log;
    log.publishWatermark = () => {
      throw new Error("simulated failure between fsync and watermark");
    };
    const escaped: string[] = [];
    const onUnhandled = (reason: unknown) => escaped.push(String(reason));
    const vitestListeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", onUnhandled);
    const outcome = await Promise.race([
      attempt(rt, rt.triples.transact(ops("s:w", 1, "x"), { commandId: "wm-1" })).then((r) => (r.ok ? "acked" : `failed:${r.error?._tag}:${r.error?.reason}`)),
      sleep(3_000).then(() => "no-answer-after-3s"),
    ]);
    const later = await Promise.race([
      attempt(rt, rt.triples.transact(ops("s:w", 1, "y"), { commandId: "wm-2" })).then((r) => (r.ok ? "acked" : `failed:${r.error?._tag}:${r.error?.reason}`)),
      sleep(3_000).then(() => "no-answer-after-3s"),
    ]);
    await sleep(50);
    process.removeListener("unhandledRejection", onUnhandled);
    for (const l of vitestListeners) process.on("unhandledRejection", l as any);
    const onDisk = readWatermark(dir)!;
    const inLog = logMembers(path.join(dir, SEG)).some((m) => m.commandIds.includes("wm-1"));
    await rt.dispose();
    await rt.broker.abandon();
    const rt2 = await openRt(dir, scope);
    try {
      const resend = await attempt(rt2, rt2.triples.transact(ops("s:w", 1, "x"), { commandId: "wm-1" }));
      const record = { outcome, laterCommand: later, escapedUnhandledRejections: escaped, watermarkBefore: before.lsn, watermarkOnDiskAfter: onDisk.lsn, frameInLog: inLog, resend: resend.ok ? "committed-again" : resend.error?._tag };
      writeJson("check1-crash-before-watermark.json", record);
      expect(outcome).toBe("failed:WriteError:outcome-unknown");
      expect(escaped).toEqual([]);
      expect(onDisk.lsn).toBe(before.lsn);
      expect(inLog).toBe(true);
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
      await rt.broker.abandon();
      stop = true;
      await Promise.allSettled(workers);
      await rt.dispose().catch(() => {});
      const rt2 = await openRt(dir, scope);
      const lost = [...acked].filter(([id, tx]) => rt2.broker.claim(id)?.txId !== tx).map(([id]) => id);
      rounds.push({ round, acked: acked.size, unknown: unknown.length, unknownCommitted: unknown.filter((id) => rt2.broker.claim(id) !== undefined).length, lost, recovery: rt2.broker.stats().recovery, unexpected: unknown.filter((u) => u.startsWith("unexpected")) });
      await rt2.dispose();
      await rt2.broker.close();
    }
    writeJson("check1-random-kills.json", rounds);
    expect(rounds.every((r) => r.lost.length === 0)).toBe(true);
    expect(rounds.every((r) => r.unexpected.length === 0)).toBe(true);
  });
});

describe("the stream lock (C3)", () => {
  it("a second broker in the same process is refused; ACKed frames of the first survive", async () => {
    const dir = freshDir("c1-lock");
    const scope = `v-p2q-c1f:${randomUUID()}`;
    const a = await openRt(dir, scope);
    const a1 = await a.run(a.triples.transact(ops("s:l", 1, "a1"), { commandId: "lock-a1" }));
    const second = await openRt(dir, scope).then(
      async (b) => (await b.dispose(), await b.broker.close(), "opened"),
      (error) => `refused: ${String(error).slice(0, 160)}`,
    );
    // Also through a symlink to the same directory.
    const link = `${dir}-link`;
    fs.symlinkSync(dir, link);
    const viaLink = await openRt(link, scope).then(
      async (b) => (await b.dispose(), await b.broker.close(), "opened"),
      (error) => `refused: ${String(error).slice(0, 160)}`,
    );
    const a2 = await a.run(a.triples.transact(ops("s:l", 1, "a2"), { commandId: "lock-a2" }));
    await a.dispose();
    await a.broker.close();
    const c = await openRt(dir, scope);
    const survived = { a1: c.broker.claim("lock-a1")?.txId === a1.txId, a2: c.broker.claim("lock-a2")?.txId === a2.txId };
    await c.dispose();
    await c.broker.close();
    writeJson("check1-double-open.json", { second, viaLink, survived });
    expect(second.startsWith("refused")).toBe(true);
    expect(viaLink.startsWith("refused")).toBe(true);
    expect(survived).toEqual({ a1: true, a2: true });
  });
});
