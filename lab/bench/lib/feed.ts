/**
 * [EXP-FD01] Why: Q98b makes affected subjects and the checkpoint one host SQLite transaction.
 * Rejected: the earlier independently fsynced JSONL effect/checkpoint journals (X3 crash window).
 * This legacy driver remains an A0-control with direct-subject DIAGNOSTIC affected sets and
 * publication clocks must be supplied by a source observer; EXP-DI01 and EXP-P3M own lane integration.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { inspect } from "node:util";
import type { CompositionHandle } from "./composition.ts";
import { hash2 } from "./rng.ts";
import { accountOf, subjectOf } from "./world.ts";
// Load the host package through its public self-reference, as the bench is not a workspace package.
const hostRequire = createRequire(new URL("../../../packages/host/package.json", import.meta.url));
const coreRequire = createRequire(new URL("../../../packages/core/package.json", import.meta.url));
const { publicationLagMs } = coreRequire("@triplex-build/triplex/feed");
interface FeedPosition {
  source: string;
  stream: string;
  epoch: string;
  position: string;
}
interface FeedInstant extends FeedPosition {
  domain: { primitive: "node-hrtime-v1"; host: string; boot: string; origin: "host-boot" };
  atNs: string;
}
interface FeedPublication extends FeedInstant {
  publicationId: string;
  recordId: string;
}
export const { openHostFeedClock, openPublicationWriter, openPublicationReader } = hostRequire(
  "@triplex-build/triplex-host/feed",
);
const { captureFeedInstant, readProducerPublication } = hostRequire(
  "@triplex-build/triplex-host/feed",
);
interface Measurement {
  clock: ReturnType<typeof openHostFeedClock>;
  records: ReturnType<typeof openPublicationReader>;
}
const { SqliteConsumerStore, journalChangeFeed } = hostRequire("@triplex-build/triplex-host/feed");

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
  const [a, b] = hash2(
    JSON.stringify(
      (tx.changes ?? []).map((c: any) => ({
        op: c.op,
        assertionId: c.tripleId,
        entity: c.entityId,
        attribute: c.attribute,
        validFrom: c.validFrom,
        validTo: c.validTo ?? null,
      })),
    ),
  );
  return `${a.toString(16)}${b.toString(16)}`;
}

export class FeedConsumer {
  readonly name = "dependency-index";
  readonly epoch: string;
  private readonly dir: string;
  readonly feedArm = "A0-control";
  private readonly storeFile: string;
  private readonly source: string;
  private store: InstanceType<typeof SqliteConsumerStore>;
  private readonly now: () => number;
  private readonly pollTimeoutMs: number;
  private readonly publicationWaitMs: number;
  private readonly publicationOf?: (key: FeedPosition) => FeedPublication | undefined;
  private readonly measurement?: Measurement;
  private readonly commitOf: (position: number) => CommitInfo | undefined;
  private readonly open: () => Promise<CompositionHandle>;
  private readonly log: (line: string) => void;
  private crashes: {
    at: number;
    point: CrashPoint;
    done: boolean;
    firedAt?: number;
    checkpoint?: number;
    restartedAt?: number;
    caughtUpAt?: number | null;
    target?: number;
  }[];
  private stopping = false;
  private appliedKeys = new Set<string>();
  checkpoint: number;
  private lifeMax = 0;
  readonly firstSeen = new Map<number, { txId: string; digest: string; at: number }>();
  readonly lags: { at: number; lagMs: number; lagFromAckMs: number | null; position: number }[] =
    [];
  readonly pendingLag = new Map<number, number>();
  private readonly durableKnown = new Set<number>();
  private lastStamp = new Map<number, number>();
  counts = {
    pages: 0,
    pollErrors: 0,
    entries: 0,
    deliveries: 0,
    redeliveries: 0,
    redeliveryMismatches: 0,
    replayAttempts: 0,
    effectsWritten: 0,
    orderViolations: 0,
    incompleteChanges: 0,
    affectedMismatches: 0,
    corrections: 0,
    correctionRangeReported: 0,
    durableWrites: 0,
    seenBeforeAck: 0,
  };

  constructor(opts: {
    dir: string;
    epoch: string;
    startAfter: number;
    now: () => number;
    pollTimeoutMs?: number;
    publicationWaitMs?: number;
    publicationOf?: (key: FeedPosition) => FeedPublication | undefined;
    measurement?: Measurement;
    commitOf: (p: number) => CommitInfo | undefined;
    open: () => Promise<CompositionHandle>;
    log: (l: string) => void;
    crashes: { at: number; point: CrashPoint }[];
  }) {
    this.dir = opts.dir;
    this.epoch = opts.epoch;
    this.now = opts.now;
    this.commitOf = opts.commitOf;
    this.publicationOf = opts.publicationOf;
    this.publicationWaitMs = opts.publicationWaitMs ?? 0;
    this.pollTimeoutMs = opts.pollTimeoutMs ?? 0;
    this.measurement = opts.measurement;
    this.open = opts.open;
    this.log = opts.log;
    this.crashes = opts.crashes.map((c) => ({ ...c, done: false }));
    this.storeFile = path.join(this.dir, "consumer.db");
    this.source = JSON.stringify({ route: "A0-control", dir: this.dir, epoch: this.epoch });
    this.store = new SqliteConsumerStore(this.storeFile);
    this.checkpoint = opts.startAfter;
    this.lifeMax = opts.startAfter;
    if (!this.store.checkpoint(this.name))
      this.store.apply(
        this.name,
        null,
        { entries: [], cursor: { source: this.source, token: String(opts.startAfter) } },
        [],
      );
    this.recover();
  }

  /** Reload progress from disk, as a restarted process would. */
  private recover() {
    this.store.close();
    this.store = new SqliteConsumerStore(this.storeFile);
    this.checkpoint = Number(this.store.checkpoint(this.name).token);
    this.appliedKeys = new Set(
      this.store
        .effects(this.name)
        .map((e: any) => `${this.name}|${this.epoch}|${e.position}|${e.subject}`),
    );
    this.lifeMax = this.checkpoint;
    this.lastStamp = new Map();
  }
  private maybeCrash(point: CrashPoint) {
    const c = this.crashes.find((x) => !x.done && x.point === point && this.now() >= x.at);
    if (c) {
      c.done = true;
      c.firedAt = this.now();
      throw new CrashInjected(point);
    }
  }

  /** Affected subjects of one transaction: owners of own entities; shared entities are counted by account. */
  private affectedOf(tx: any) {
    const subjects = new Set<number>();
    const accounts = new Set<number>();
    for (const c of tx.changes ?? []) {
      const s = subjectOf(c.entityId);
      if (s !== null) subjects.add(s);
      else {
        const a = accountOf(c.entityId);
        if (a !== null) accounts.add(a);
      }
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
        const crash = this.crashes.find(
          (c) => c.firedAt !== undefined && c.restartedAt === undefined,
        )!;
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
    let firstFailureAt: number | undefined;
    while (!this.stopping) {
      let page;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const timeoutError = new Error(`Feed poll exceeded ${this.pollTimeoutMs} ms at checkpoint ${this.checkpoint}`);
      try {
        // [DX-H3] Why: a stuck source poll must produce an invalid report instead of hanging finalization.
        // Rejected: accepting the missing page or waiting beyond the measurement lease.
        const pending = handle.feedPage(this.checkpoint, 1000);
        page = this.pollTimeoutMs > 0 ? await Promise.race([pending, new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(timeoutError), this.pollTimeoutMs);
        })]) : await pending;
      } catch (error) {
        this.counts.pollErrors++;
        if (this.counts.pollErrors <= 3 || this.counts.pollErrors % 10 === 0) this.log(`feed: poll error ${this.counts.pollErrors} at checkpoint ${this.checkpoint}: ${inspect(error, { depth: 5, breakLength: Infinity }).slice(0, 6000)}`);
        if (error === timeoutError) throw error;
        // [DX-H3] Why: repeated failed calls can each finish before the per-call deadline yet never deliver a page.
        // Rejected: retrying forever and hiding the underlying source error from the final report.
        const failedAt = performance.now();
        firstFailureAt ??= failedAt;
        if (this.pollTimeoutMs > 0 && failedAt - firstFailureAt >= this.pollTimeoutMs) throw new Error(`Feed polling repeatedly failed for ${Math.round(failedAt - firstFailureAt)} ms at checkpoint ${this.checkpoint}. Last error: ${String(error)}`);
        await new Promise((r) => setTimeout(r, 100));
        continue;
      } finally {
        clearTimeout(timeout);
      }
      firstFailureAt = undefined;
      this.counts.pages++;
      const txs = page.transactions;
      if (!txs.length) {
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      const seenAt = this.now();
      const affected: [number, number[], number[]][] = [];
      this.maybeCrash("before-effect");

      for (const tx of txs) {
        this.counts.deliveries++;
        const digest = changesDigest(tx);
        const first = this.firstSeen.get(tx.position);
        if (first) {
          this.counts.redeliveries++;
          this.counts.replayAttempts++;
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
          if (!c.entityId || !c.attribute || (c.op === "assert" && c.validFrom === undefined))
            this.counts.incompleteChanges++;
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
          if (a.subjects.length !== expected.length || a.subjects.some((s, k) => s !== expected[k]))
            this.counts.affectedMismatches++;
          if (info.correction) {
            this.counts.corrections++;
            if (
              (tx.changes ?? []).some(
                (c: any) =>
                  c.op === "assert" &&
                  c.attribute === ":worker/address" &&
                  c.validFrom === info.correctionValidFrom,
              )
            )
              this.counts.correctionRangeReported++;
          }
        }
        for (const s of a.subjects) {
          const key = `${this.name}|${this.epoch}|${tx.position}|${s}`;
          if (this.appliedKeys.has(key)) {
            this.counts.replayAttempts++;
            continue;
          }
          this.appliedKeys.add(key);

          this.counts.effectsWritten++;
        }
      }
      const next = Math.max(this.checkpoint, page.next ?? txs.at(-1).position);
      const adapter = journalChangeFeed(this.source, this.source, "0", async () => page);
      const previous = this.store.checkpoint(this.name);
      const delivery = await adapter.poll(previous);
      // [EXP-FD01-R3] Why: producer bytes and a bound capture primitive establish publication and origin.
      // Rejected: trusting an arbitrary now callback, a late map entry or a default clock label (R2-F1).
      if (!this.measurement) throw new Error("Missing bound publication measurement");
      const publications = new Map<number, FeedPublication>();
      for (const [position] of affected) {
        const key = this.publicationKey(position);
        // [DX-H3] Why: the journal can arrive before the writer HTTP response observer.
        // Rejected: fabricating a timestamp at poll/ACK or accepting a missing witness.
        const deadline = performance.now() + this.publicationWaitMs;
        let record = readProducerPublication(this.measurement.records, key);
        while (!record && performance.now() < deadline) {
          await new Promise(r => setTimeout(r, 1));
          record = readProducerPublication(this.measurement.records, key);
        }
        const observation = this.publicationOf ? this.publicationOf(key) : record;
        publicationLagMs(observation, captureFeedInstant(this.measurement.clock, key), record);
        publications.set(position, record!);
      }
      this.store.apply(
        this.name,
        previous,
        delivery,
        affected.flatMap(([position, subjects]) =>
          subjects.map((subject) => ({
            epoch: "0",
            position: String(position),
            subject: String(subject),
          })),
        ),
        (point: CrashPoint) => this.maybeCrash(point),
      );
      this.counts.durableWrites++;
      const durableAt = this.now();
      this.checkpoint = next;
      for (const [position] of affected) {
        if (this.durableKnown.has(position)) continue; // lag is taken at the first durable record of a position
        this.durableKnown.add(position);
        const info = this.commitOf(position);
        this.lags.push({
          // [DX-H1] Why: phases use epoch wall time; latency itself stays on the bound monotonic clock.
          // Rejected: classifying host-boot hrtime as epoch time (silently empties every phase histogram).
          at: durableAt,
          position,
          lagMs: publicationLagMs(
            publications.get(position),
            captureFeedInstant(this.measurement.clock, this.publicationKey(position)),
            readProducerPublication(this.measurement.records, this.publicationKey(position)),
          ),
          lagFromAckMs: info ? Math.max(0, durableAt - info.ackAt) : null,
        });
        if (!info) {
          this.pendingLag.set(position, durableAt);
          this.counts.seenBeforeAck++;
        }
      }
      for (const c of this.crashes)
        if (
          c.restartedAt !== undefined &&
          c.caughtUpAt === null &&
          this.checkpoint >= (c.target ?? 0)
        )
          c.caughtUpAt = durableAt;
      this.maybeCrash("after-checkpoint");
    }
  }
  /** The driver calls this when an ACK arrives for a position the consumer already made durable. */
  ackArrived(position: number) {
    const durableAt = this.pendingLag.get(position);
    if (durableAt === undefined) return;
    this.pendingLag.delete(position);
    const info = this.commitOf(position)!;
    const sample = this.lags.find((row) => row.position === position);
    if (sample) sample.lagFromAckMs = Math.max(0, durableAt - info.ackAt);
  }
  /** Immutable source key used by the source observer's per-position publication map. */
  publicationKey(position: number): FeedPosition {
    return { source: this.source, stream: this.source, epoch: "0", position: String(position) };
  }

  stop() {
    this.stopping = true;
  }

  /** Visible duplicate effects: keys written twice in the durable effects log (must be zero). */
  visibleDuplicateEffects(): number {
    const effects = this.store.effects(this.name);
    return effects.length - new Set(effects.map((e: any) => JSON.stringify(e))).size;
  }
  close() {
    this.store.close();
  }
  crashReport() {
    return this.crashes.map((c) => ({
      point: c.point,
      plannedAt: c.at,
      fired: c.firedAt !== undefined,
      checkpoint: c.checkpoint ?? null,
      catchUpMs: c.caughtUpAt && c.restartedAt ? c.caughtUpAt - c.restartedAt : null,
    }));
  }
  /** Re-read the feed from `from` to the consumer's checkpoint and compare with first deliveries. */
  async replayCheck(handle: CompositionHandle, from: number) {
    let cursor = from,
      entries = 0,
      mismatches = 0;
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
    const expected = [...this.firstSeen.keys()].filter(
      (p) => p > from && p <= this.checkpoint,
    ).length;
    return {
      from,
      to: this.checkpoint,
      replayed: entries,
      firstDeliveries: expected,
      mismatches,
      exact: mismatches === 0 && entries === expected,
    };
  }
}
