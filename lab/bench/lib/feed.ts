/**
 * P3 change-feed consumer with durable progress (TARGETS 1.1 P3).
 *
 * Cursor: (epoch, position). Per page of `transactions({ after })`:
 *   1. effects: one durable record per (consumer, epoch, position, subject) not already applied
 *      (feed-effects.jsonl, fsync). A key already applied is a replay attempt, never a second effect;
 *   2. "affected subjects known": ONE durable write holding the page's affected-subject sets and the new
 *      checkpoint (feed-checkpoints.jsonl, fsync). Lag runs from the transaction's commit time to the
 *      completion of this write.
 * Crash injection at the three points of item 6: before the effect, after the effect but before the
 * checkpoint, after the checkpoint. A crash drops the in-memory consumer; the restarted one reloads the
 * checkpoint and the applied-effect keys from disk and resumes after the checkpoint (at-least-once).
 * Commit time: the receipt `instant` (stamped by the Triplex runtime at publication, host wall clock, the
 * clock `now()` here also reads); the lag from the driver's ACK arrival is reported beside it.
 */
import fs from "node:fs";
import path from "node:path";
import type { CompositionHandle } from "./composition.ts";
import { hash2 } from "./rng.ts";
import { accountOf, subjectOf } from "./world.ts";

export type CrashPoint = "before-effect" | "after-effect" | "after-checkpoint";
export interface CommitInfo {
  readonly instant: number;
  readonly ackAt: number;
  readonly subject: number;
  /** Every subject the command wrote directly (one for trace commands, several for bulk history growth). */
  readonly subjects: readonly number[];
  readonly stamp: number;
  readonly correction: boolean;
  readonly correctionValidFrom: number | null;
}
class CrashInjected extends Error {}

export function changesDigest(tx: any) {
  const [a, b] = hash2(JSON.stringify(tx.changes ?? []));
  return `${a.toString(16)}${b.toString(16)}`;
}

export class FeedConsumer {
  readonly name = "dependency-index";
  readonly epoch: string;
  private readonly dir: string;
  private readonly effectsFile: string;
  private readonly checkpointFile: string;
  private readonly now: () => number;
  private readonly commitOf: (position: number) => CommitInfo | undefined;
  private readonly open: () => Promise<CompositionHandle>;
  private readonly log: (line: string) => void;
  private crashes: { at: number; point: CrashPoint; done: boolean; firedAt?: number; checkpoint?: number; restartedAt?: number; caughtUpAt?: number | null; target?: number }[];
  private stopping = false;
  private appliedKeys = new Set<string>();
  checkpoint: number;
  private lifeMax = 0;
  readonly firstSeen = new Map<number, { txId: string; digest: string; at: number }>();
  readonly lags: { at: number; lagMs: number; lagFromAckMs: number }[] = [];
  readonly pendingLag = new Map<number, number>();
  private readonly durableKnown = new Set<number>();
  private lastStamp = new Map<number, number>();
  counts = { pages: 0, entries: 0, deliveries: 0, redeliveries: 0, redeliveryMismatches: 0, replayAttempts: 0, effectsWritten: 0, orderViolations: 0, incompleteChanges: 0, affectedMismatches: 0, corrections: 0, correctionRangeReported: 0, durableWrites: 0, seenBeforeAck: 0 };

  constructor(opts: { dir: string; epoch: string; startAfter: number; now: () => number; commitOf: (p: number) => CommitInfo | undefined; open: () => Promise<CompositionHandle>; log: (l: string) => void; crashes: { at: number; point: CrashPoint }[] }) {
    this.dir = opts.dir;
    this.epoch = opts.epoch;
    this.now = opts.now;
    this.commitOf = opts.commitOf;
    this.open = opts.open;
    this.log = opts.log;
    this.crashes = opts.crashes.map((c) => ({ ...c, done: false }));
    this.effectsFile = path.join(this.dir, "feed-effects.jsonl");
    this.checkpointFile = path.join(this.dir, "feed-checkpoints.jsonl");
    this.checkpoint = opts.startAfter;
    this.lifeMax = opts.startAfter;
    fs.writeFileSync(this.checkpointFile, JSON.stringify({ consumer: this.name, epoch: this.epoch, position: opts.startAfter, affected: [], at: this.now() }) + "\n");
    fs.writeFileSync(this.effectsFile, "");
  }

  private durableAppend(file: string, text: string) {
    const fd = fs.openSync(file, "a");
    try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  /** Reload progress from disk, as a restarted process would. */
  private recover() {
    const lines = fs.readFileSync(this.checkpointFile, "utf8").trim().split("\n");
    const last = JSON.parse(lines.at(-1)!);
    this.checkpoint = last.position;
    this.appliedKeys = new Set(fs.readFileSync(this.effectsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).key));
    this.lifeMax = this.checkpoint;
    this.lastStamp = new Map();
  }
  private maybeCrash(point: CrashPoint) {
    const c = this.crashes.find((x) => !x.done && x.point === point && this.now() >= x.at);
    if (c) { c.done = true; c.firedAt = this.now(); throw new CrashInjected(point); }
  }

  /** Affected subjects of one transaction: owners of own entities; shared entities are counted by account. */
  private affectedOf(tx: any) {
    const subjects = new Set<number>();
    const accounts = new Set<number>();
    for (const c of tx.changes ?? []) {
      const s = subjectOf(c.entityId);
      if (s !== null) subjects.add(s);
      else { const a = accountOf(c.entityId); if (a !== null) accounts.add(a); }
    }
    return { subjects: [...subjects].sort((a, b) => a - b), sharedAccounts: [...accounts] };
  }

  async run(): Promise<void> {
    for (;;) {
      let handle: CompositionHandle | null = null;
      try {
        handle = await this.open();
        await this.consume(handle);
        await handle.close().catch(() => {});
        return;
      } catch (error) {
        await handle?.close().catch(() => {});
        if (!(error instanceof CrashInjected)) throw error;
        const crash = this.crashes.find((c) => c.firedAt !== undefined && c.restartedAt === undefined)!;
        this.log(`feed: injected crash ${error.message} at checkpoint ${this.checkpoint}`);
        await new Promise((r) => setTimeout(r, this.recoverDelayMs));
        this.recover();
        crash.checkpoint = this.checkpoint;
        crash.restartedAt = this.now();
        crash.target = this.lifeMaxTarget;
        crash.caughtUpAt = null;
      }
    }
  }
  /** Highest acknowledged position when a restart happens (catch-up target), supplied by the driver. */
  lifeMaxTarget = 0;
  /** Downtime between a crash and the restarted consumer. */
  recoverDelayMs = 2000;

  private async consume(handle: CompositionHandle) {
    while (!this.stopping) {
      let page;
      try { page = await handle.feedPage(this.checkpoint, 1000); } catch { await new Promise((r) => setTimeout(r, 100)); continue; }
      this.counts.pages++;
      const txs = page.transactions;
      if (!txs.length) { await new Promise((r) => setTimeout(r, 20)); continue; }
      const seenAt = this.now();
      const affected: [number, number[], number[]][] = [];
      this.maybeCrash("before-effect");
      let effects = "";
      for (const tx of txs) {
        this.counts.deliveries++;
        const digest = changesDigest(tx);
        const first = this.firstSeen.get(tx.position);
        if (first) {
          this.counts.redeliveries++;
          if (first.txId !== tx.txId || first.digest !== digest) this.counts.redeliveryMismatches++;
        } else {
          this.firstSeen.set(tx.position, { txId: tx.txId, digest, at: seenAt });
          this.counts.entries++;
        }
        if (tx.position <= this.lifeMax) this.counts.orderViolations++;
        this.lifeMax = Math.max(this.lifeMax, tx.position);
        const a = this.affectedOf(tx);
        affected.push([tx.position, a.subjects, a.sharedAccounts]);
        for (const c of tx.changes ?? []) {
          if (!c.entityId || !c.attribute || (c.op === "assert" && c.validFrom === undefined)) this.counts.incompleteChanges++;
          if (c.op === "assert" && c.attribute === ":placement/stamp") {
            const subject = subjectOf(c.entityId)!;
            const stamp = Number(c.value?.value);
            if ((this.lastStamp.get(subject) ?? -1) >= stamp) this.counts.orderViolations++;
            this.lastStamp.set(subject, stamp);
          }
        }
        const info = this.commitOf(tx.position);
        if (info && !first) {
          const expected = [...info.subjects].sort((x, y) => x - y);
          if (a.subjects.length !== expected.length || a.subjects.some((s, k) => s !== expected[k])) this.counts.affectedMismatches++;
          if (info.correction) {
            this.counts.corrections++;
            if ((tx.changes ?? []).some((c: any) => c.op === "assert" && c.attribute === ":worker/address" && c.validFrom === info.correctionValidFrom)) this.counts.correctionRangeReported++;
          }
        }
        for (const s of a.subjects) {
          const key = `${this.name}|${this.epoch}|${tx.position}|${s}`;
          if (this.appliedKeys.has(key)) { this.counts.replayAttempts++; continue; }
          this.appliedKeys.add(key);
          effects += JSON.stringify({ key, position: tx.position, subject: s, op: "rerun-subject" }) + "\n";
          this.counts.effectsWritten++;
        }
      }
      if (effects) this.durableAppend(this.effectsFile, effects);
      this.maybeCrash("after-effect");
      const next = Math.max(this.checkpoint, page.next ?? txs.at(-1).position);
      this.durableAppend(this.checkpointFile, JSON.stringify({ consumer: this.name, epoch: this.epoch, position: next, affected, at: this.now() }) + "\n");
      this.counts.durableWrites++;
      const durableAt = this.now();
      this.checkpoint = next;
      for (const [position] of affected) {
        if (this.durableKnown.has(position)) continue; // lag is taken at the first durable record of a position
        this.durableKnown.add(position);
        const info = this.commitOf(position);
        if (info) this.lags.push({ at: info.ackAt, lagMs: Math.max(0, durableAt - info.instant), lagFromAckMs: Math.max(0, durableAt - info.ackAt) });
        else { this.pendingLag.set(position, durableAt); this.counts.seenBeforeAck++; }
      }
      for (const c of this.crashes) if (c.restartedAt !== undefined && c.caughtUpAt === null && this.checkpoint >= (c.target ?? 0)) c.caughtUpAt = durableAt;
      this.maybeCrash("after-checkpoint");
    }
  }
  /** The driver calls this when an ACK arrives for a position the consumer already made durable. */
  ackArrived(position: number) {
    const durableAt = this.pendingLag.get(position);
    if (durableAt === undefined) return;
    this.pendingLag.delete(position);
    const info = this.commitOf(position)!;
    this.lags.push({ at: info.ackAt, lagMs: Math.max(0, durableAt - info.instant), lagFromAckMs: 0 });
  }
  stop() { this.stopping = true; }

  /** Visible duplicate effects: keys written twice in the durable effects log (must be zero). */
  visibleDuplicateEffects(): number {
    const seen = new Set<string>();
    let dup = 0;
    for (const line of fs.readFileSync(this.effectsFile, "utf8").split("\n")) {
      if (!line) continue;
      const key = JSON.parse(line).key;
      if (seen.has(key)) dup++;
      seen.add(key);
    }
    return dup;
  }
  crashReport() {
    return this.crashes.map((c) => ({ point: c.point, plannedAt: c.at, fired: c.firedAt !== undefined, checkpoint: c.checkpoint ?? null, catchUpMs: c.caughtUpAt && c.restartedAt ? c.caughtUpAt - c.restartedAt : null }));
  }
  /** Re-read the feed from `from` to the consumer's checkpoint and compare with first deliveries. */
  async replayCheck(handle: CompositionHandle, from: number) {
    let cursor = from, entries = 0, mismatches = 0;
    while (cursor < this.checkpoint) {
      const page = await handle.feedPage(cursor, 1000);
      if (!page.transactions.length) break;
      for (const tx of page.transactions) {
        if (tx.position > this.checkpoint) break;
        entries++;
        const first = this.firstSeen.get(tx.position);
        if (!first || first.txId !== tx.txId || first.digest !== changesDigest(tx)) mismatches++;
      }
      cursor = page.next ?? page.transactions.at(-1).position;
    }
    const expected = [...this.firstSeen.keys()].filter((p) => p > from && p <= this.checkpoint).length;
    return { from, to: this.checkpoint, replayed: entries, firstDeliveries: expected, mismatches, exact: mismatches === 0 && entries === expected };
  }
}
