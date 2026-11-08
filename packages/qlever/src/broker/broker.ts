/**
 * The QLever host broker (EXP-P2Q; R17 option A under RULINGS Q31e; PLAN C2 and C3; R13 section 6).
 *
 *   commands --> decide (claims, per-subject CAS, from the broker's own record)
 *            --> one frame per commit group, write + fsync (F_FULLFSYNC, about 3 ms)   <- the decision
 *            --> durable watermark published, overlay holds the frame, ACK             <- Q31e publication
 *            --> applier: guarded QLever update, asynchronously, many frames per update
 *
 * Why the ACK does not wait for QLever: the update cost grows with QLever's delta (R17 2.2: 11 ms at delta 0,
 * 34 ms at 100k, 129 ms at 500k; EXP-002 saw 7 ms fresh and seconds later). Under Q31e the source of truth
 * ACKs after its own publication, and here the source of truth is the log plus broker: once the frame is
 * durable and in the overlay, a pull at the returned position is answered exactly (replica plus overlay, or
 * the log), so read-your-own-write holds by routing rather than by waiting for QLever.
 *
 * Group commit (R13 2.3): everything queued while the previous fsync ran forms the next group, capped at
 * 64 commands and 1,024 ordinals, with no timer. Members are validated against the staged prefix of their
 * own group (C2), so a later member sees an earlier member's claims and subject heads.
 *
 * Failure (R13 1.3, 6.3 item 5): any write or fsync error fails the broker: every pending command gets an
 * outcome-unknown error (the frame may be on disk), nothing is retried, and recovery re-reads the log.
 */
import { randomUUID } from "node:crypto";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { TxAttributes } from "@triplex-build/triplex/internal";
import type { QleverClient } from "../QleverClient.js";
import { FrameKind } from "./frame.js";
import {
  decodeCommitGroup,
  encodeCommitGroup,
  type FrameMember,
  type MemberClaim,
} from "./frames.js";
import {
  HostLog,
  readFramesFrom,
  segmentStart,
  type EpochBeginPayload,
  type LogFrame,
} from "./log.js";
import { ORDINALS, lastPositionOf, lsnOf, packPosition } from "./position.js";
import { buildFence, buildPublication, markerQuery, type ReplicaMarker } from "./sparql.js";
import { BasisNotAvailable, ReplicaUnavailable, type BasisSurface } from "./errors.js";

/** A staged Triplex transaction handed to the broker by the adapter's persist step. */
export interface BrokerTransaction {
  readonly operationId: string;
  readonly attemptId: string;
  /** The head position the transaction read at (every in-transaction read was filtered to it). */
  readonly sourceK: number;
  readonly reads: { readonly entities: ReadonlySet<string>; readonly scopeWide: boolean };
  readonly claims: readonly MemberClaim[];
  /** Placeholder positions in allocation order; placeholder i becomes ordinal base + i. */
  readonly placeholders: readonly number[];
  readonly rows: readonly TripleRow[];
  /** The committed version of every row this transaction retracts (delete terms, feed). */
  readonly priors: ReadonlyMap<string, TripleRow>;
  readonly newIds: ReadonlySet<string>;
}
/**
 * What a multi-request read relied on (RULINGS Q67c, Q72b): the basis, the replica marker its first probe saw,
 * and the incarnation this broker had last written. `verifySnapshot` accepts the answer only if, in a probe sent
 * after the last answer request returned, the replica has the same incarnation and marker, and this broker
 * has not fenced since. Q67c conservatively refuses changed markers, including forward publications.
 */
export interface ReplicaSnapshot {
  readonly basis: number;
  readonly marker: ReplicaMarker;
  readonly fencedIncarnation: string;
  readonly surface: BasisSurface;
  readonly started: number;
}
export type BrokerDecision =
  | {
      readonly kind: "committed";
      readonly lsn: number;
      readonly epoch: number;
      /** placeholder -> packed position */
      readonly positions: ReadonlyMap<number, number>;
      readonly ackAt: number;
      readonly replayed: boolean;
    }
  | {
      readonly kind: "conflict";
      readonly reason: "subject" | "scope" | "claim";
      readonly entity?: string;
    };
export class BrokerFailed extends Error {
  readonly _tag = "BrokerFailed";
}
export class BrokerInvalidTransaction extends Error {
  readonly _tag = "BrokerInvalidTransaction";
}

export type BrokerEvent =
  | {
      readonly type: "frame";
      readonly lsn: number;
      readonly members: number;
      readonly bytes: number;
      readonly appendMs: number;
      /** fsync return. */
      readonly at: number;
      /** WATERMARK publication: the frame's source publication instant for feed lag (RULINGS Q67d). */
      readonly watermarkAt: number;
    }
  | {
      readonly type: "published";
      readonly fromLsn: number;
      readonly toLsn: number;
      readonly members: number;
      readonly ms: number;
      readonly at: number;
      readonly inserted?: number;
      readonly deleted?: number;
      readonly deltaTotal?: number;
      readonly resends: number;
    }
  | { readonly type: "apply-error"; readonly error: string; readonly at: number }
  | { readonly type: "rebuild-start"; readonly deltaTotal: number; readonly at: number }
  | {
      readonly type: "rebuild-end";
      readonly ms: number;
      readonly ok: boolean;
      readonly error?: string;
      readonly at: number;
    }
  | {
      readonly type: "replica-regressed";
      readonly from: number;
      readonly to: number;
      readonly at: number;
    }
  | { readonly type: "fenced"; readonly detail: string; readonly at: number };

export interface HostBrokerOptions {
  /** Stream directory; the brief puts it under runs/broker/EXP-P2Q/ (gitignored), never /tmp. */
  readonly dir: string;
  readonly scopeKey: string;
  /** QLever endpoint client for the replica (use a fresh-connection client). Omit for log-only runs. */
  readonly replica?: QleverClient;
  readonly maxGroupCommands?: number;
  readonly maxApplyCommands?: number;
  /** How long a published frame stays in the overlay for readers holding an older replica snapshot. */
  readonly retainPublishedMs?: number;
  /** Trigger QLever `rebuild-index` once the delta reaches this many triples (default: never). */
  readonly rebuildAtDeltaTriples?: number;
  readonly applyTimeoutMs?: number;
  readonly minFreeBytes?: number;
  readonly requireFullFsync?: boolean;
  /** Start the applier on open (default true when a replica is given). */
  readonly autoApply?: boolean;
  /** A name for the replica in typed errors (BasisNotAvailable, ReplicaUnavailable). */
  readonly replicaName?: string;
  /** How often an idle applier reads the replica's real marker to notice a regression (V-P2Q C2). */
  readonly idleProbeMs?: number;
  /** Crash-simulation tests only: abandon an earlier in-process holder of this stream (V-P2Q C3). */
  readonly takeover?: boolean;
  readonly onEvent?: (event: BrokerEvent) => void;
}

interface Pending {
  readonly txn: BrokerTransaction;
  readonly resolve: (decision: BrokerDecision) => void;
  readonly reject: (error: unknown) => void;
}
interface OverlayFrame {
  readonly lsn: number;
  readonly members: readonly FrameMember[];
  publishedAt?: number;
}
interface IndexEntry {
  readonly lsn: number;
  readonly offset: number;
  readonly crc: number;
  readonly kind: number;
}
interface Receipt {
  readonly lsn: number;
  readonly epoch: number;
  readonly positions: readonly number[];
}

const isJournalRow = (row: TripleRow) =>
  row.entity_type === "_Transaction" && row.entity_id === row.tx_id;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** A fresh replica incarnation (Q72b): the epoch for operators, then a random id, so no two fences share one. */
const newIncarnation = (epoch: number) => `${epoch}.${randomUUID()}`;
/** Q72e: the least gap between two paced marker probes of one replica. */
const PROBE_GAP_MS = 25;
const sameMarker = (a: ReplicaMarker, b: ReplicaMarker) =>
  a.position === b.position &&
  a.epoch === b.epoch &&
  (a.incarnation ?? "") === (b.incarnation ?? "");

/** Delta counts from a QLever 0.6.0 update response (`operations[0]["delta-triples"]`). */
const deltaOf = (response: unknown) => {
  const op = (
    response as { operations?: { "delta-triples"?: Record<string, Record<string, number>> }[] }
  )?.operations?.[0]?.["delta-triples"];
  return {
    inserted: op?.["operation"]?.["inserted"],
    deleted: op?.["operation"]?.["deleted"],
    total: op?.["after"]?.["total"],
  };
};

export interface BrokerStats {
  readonly epoch: number;
  readonly headPosition: number;
  readonly durableLsn: number;
  readonly replicaPosition: number;
  readonly unpublishedFrames: number;
  readonly overlayFrames: number;
  readonly frames: number;
  readonly commits: number;
  readonly conflicts: number;
  readonly replays: number;
  readonly abortedLsns: readonly number[];
  readonly fsyncCalibrationMs: number;
  readonly recovery: string;
  readonly applyErrors: number;
  readonly rebuilds: number;
  readonly replicaRegressions: number;
  readonly lastDeltaTotal: number | undefined;
}

export class HostBroker {
  // The broker's own record, rebuilt from the log at open.
  private readonly heads = new Map<string, number>();
  private readonly claims = new Map<string, { txId: string; position: number }>();
  private readonly operations = new Map<string, Receipt>();
  private readonly index: IndexEntry[] = [];
  private readonly aborted: number[] = [];
  private headPosition = 0;
  private durableLsn = 0;
  // Overlay of frames not yet known to every reader's replica snapshot.
  private readonly overlayFrames: OverlayFrame[] = [];
  private readonly versions = new Map<string, { row: TripleRow; lsn: number }>();
  private readonly byEntity = new Map<string, Set<string>>();
  private evictedThroughLsn = 0;
  // Publication.
  private replicaMarker: ReplicaMarker = { position: 0, epoch: 0, incarnation: "" };
  // Q72b: the incarnation this broker last wrote, set before the fence that writes it is sent.
  private incarnation = "";
  // Q72e: one in-flight marker probe per replica, shared by every reader that may use it.
  private probeInFlight:
    | { readonly sentAt: number; readonly promise: Promise<ReplicaMarker> }
    | undefined;
  private probeNext: Promise<ReplicaMarker> | undefined;
  private pacedNext: Promise<ReplicaMarker> | undefined;
  private lastProbeSentAt = -Infinity;
  private lastPublishedAt = -Infinity;
  private publishedLsn = 0;
  private readonly publishWaiters: { position: number; resolve: (ok: boolean) => void }[] = [];
  private readonly durableWaiters: { position: number; resolve: () => void }[] = [];
  private suspectRegression = false;
  private wakeApplier: (() => void) | undefined;
  private applying: Promise<void> | undefined;
  private stopping = false;
  private rebuilding = false;
  // Decision loop.
  private readonly queue: Pending[] = [];
  private deciding = false;
  private failed: Error | undefined;
  private counters = {
    frames: 0,
    commits: 0,
    conflicts: 0,
    replays: 0,
    applyErrors: 0,
    rebuilds: 0,
    replicaRegressions: 0,
  };
  private lastDeltaTotal: number | undefined;

  private constructor(
    private readonly options: HostBrokerOptions,
    private readonly log: HostLog,
    private readonly recovery: { status: string; fsyncCalibrationMs: number },
  ) {}

  static async open(options: HostBrokerOptions): Promise<HostBroker> {
    const opened = await HostLog.open(options.dir, {
      ...(options.minFreeBytes === undefined ? {} : { minFreeBytes: options.minFreeBytes }),
      ...(options.requireFullFsync === undefined
        ? {}
        : { requireFullFsync: options.requireFullFsync }),
      ...(options.takeover === undefined ? {} : { takeover: options.takeover }),
    });
    try {
      return await HostBroker.start(options, opened);
    } catch (error) {
      // A failed start must not keep the stream's lock or registry entry (V-P2Q C3).
      await opened.log.close();
      throw error;
    }
  }

  private static async start(
    options: HostBrokerOptions,
    opened: Awaited<ReturnType<typeof HostLog.open>>,
  ): Promise<HostBroker> {
    const broker = new HostBroker(options, opened.log, {
      status: opened.recovery.status,
      fsyncCalibrationMs: opened.recovery.fsyncCalibrationMs,
    });
    let marker: ReplicaMarker = { position: 0, epoch: 0, incarnation: "" };
    if (options.replica) marker = await broker.readReplicaMarker();
    const lastLsn = opened.frames[opened.frames.length - 1]?.lsn ?? 0;
    // R13 2.4 known limit: damage to the last acknowledged frame looks like a torn write. A replica marker
    // beyond the log means the log lost an acknowledged frame, so refuse to start (R13 6.5 step 5).
    if (lsnOf(marker.position) > lastLsn)
      throw new BrokerFailed(
        `Replica marker LSN ${lsnOf(marker.position)} is beyond the log's last LSN ${lastLsn}; the log lost an acknowledged frame`,
      );
    broker.evictedThroughLsn = lsnOf(marker.position);
    broker.publishedLsn = lsnOf(marker.position);
    for (const frame of opened.frames) broker.replay(frame, lsnOf(marker.position));
    broker.durableLsn = lastLsn;
    if (options.replica) {
      // Fence: take the epoch on the replica before applying anything (R13 6.5 step 6, C3.3). A broker of
      // an older epoch then matches no guard.
      // The startup replay below publishes on top of whatever the replica holds, so it is a replay too: a new
      // incarnation first (Q72b).
      broker.incarnation = newIncarnation(opened.log.epoch);
      await options.replica.update(
        buildFence(options.scopeKey, marker, opened.log.epoch, broker.incarnation),
        {
          timeoutMs: options.applyTimeoutMs ?? 120_000,
        },
      );
      const fenced = await broker.readReplicaMarker();
      if (
        fenced.epoch !== opened.log.epoch ||
        fenced.position !== marker.position ||
        fenced.incarnation !== broker.incarnation
      )
        throw new BrokerFailed(`Replica fence failed: marker ${JSON.stringify(fenced)}`);
      broker.replicaMarker = fenced;
      if (options.autoApply !== false) broker.startApplier();
    }
    broker.log.publishWatermark({
      epoch: broker.log.epoch,
      lsn: broker.durableLsn,
      position: broker.headPosition,
    });
    return broker;
  }

  private replay(frame: LogFrame, replicaLsn: number) {
    this.index.push({ lsn: frame.lsn, offset: frame.offset, crc: frame.crc, kind: frame.kind });
    if (frame.kind === FrameKind.EPOCH_BEGIN) {
      const begin = JSON.parse(frame.payload.toString("utf8")) as EpochBeginPayload;
      this.aborted.push(...begin.abortedLsns);
      return;
    }
    if (frame.kind !== FrameKind.COMMIT_GROUP) return;
    const payload = decodeCommitGroup(frame.payload);
    this.record(frame.lsn, frame.epoch, payload.members);
    if (frame.lsn > replicaLsn) this.addOverlay({ lsn: frame.lsn, members: payload.members });
  }

  private record(lsn: number, epoch: number, members: readonly FrameMember[]) {
    for (const member of members) {
      const last = member.positions[member.positions.length - 1]!;
      this.operations.set(member.operationId, { lsn, epoch, positions: member.positions });
      for (const claim of member.claims)
        this.claims.set(claim.commandId, { txId: claim.txId, position: last });
      for (const subject of member.subjects) this.heads.set(subject, last);
      if (last > this.headPosition) this.headPosition = last;
    }
  }

  // ------------------------------------------------------------------ decisions

  get epoch(): number {
    return this.log.epoch;
  }
  get stream(): string {
    return this.options.scopeKey;
  }
  /** The latest committed position: every position at or below it is resolved (Q31c). */
  head(): number {
    return this.headPosition;
  }
  durable(): { readonly epoch: number; readonly lsn: number; readonly position: number } {
    return { epoch: this.log.epoch, lsn: this.durableLsn, position: this.headPosition };
  }
  replicaPosition(): number {
    return this.replicaMarker.position;
  }
  get segmentPath(): string {
    return this.log.segmentPath;
  }
  /** The broker's claim table (lost-ACK resolution from its own record, never from QLever). */
  claim(commandId: string): { readonly txId: string; readonly position: number } | undefined {
    return this.claims.get(commandId);
  }
  operation(operationId: string): Receipt | undefined {
    return this.operations.get(operationId);
  }
  abortedLsns(): readonly number[] {
    return this.aborted;
  }

  submit(txn: BrokerTransaction): Promise<BrokerDecision> {
    if (this.failed) return Promise.reject(this.failed);
    if (this.stopping) return Promise.reject(new BrokerFailed("Broker is closing"));
    return new Promise((resolve, reject) => {
      this.queue.push({ txn, resolve, reject });
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    if (this.deciding) return;
    this.deciding = true;
    try {
      while (this.queue.length > 0 && !this.failed) await this.commitGroup();
    } catch (cause) {
      // pump() is called without await, so nothing may escape it as an unhandled rejection (V-P2Q m1).
      this.fail(
        new BrokerFailed(
          `Broker decision loop failed; outcome of pending commands unknown: ${String(cause)}`,
        ),
      );
    } finally {
      this.deciding = false;
    }
  }

  private async commitGroup(): Promise<void> {
    const maxGroup = this.options.maxGroupCommands ?? 64;
    const lsn = this.log.nextLsn;
    const epoch = this.log.epoch;
    const staged = {
      heads: new Map<string, number>(),
      claims: new Set<string>(),
      operations: new Set<string>(),
      head: this.headPosition,
    };
    const accepted: { pending: Pending; member: FrameMember; positions: Map<number, number> }[] =
      [];
    // Conflicts are answered only after this group is durable, so the retry reads a head that already
    // includes the member it lost to (otherwise it would re-stage at the old head and conflict again).
    const conflicts: { pending: Pending; decision: BrokerDecision }[] = [];
    let ordinal = 0;
    let taken = 0;
    while (taken < this.queue.length && accepted.length < maxGroup) {
      const pending = this.queue[taken]!;
      const { txn } = pending;
      const width = Math.max(1, txn.placeholders.length);
      if (ordinal + width > ORDINALS) {
        if (accepted.length === 0) {
          this.queue.splice(taken, 1);
          pending.reject(
            new BrokerInvalidTransaction(
              `Transaction needs ${width} ordinals; the frame holds ${ORDINALS}`,
            ),
          );
          continue;
        }
        break;
      }
      taken++;
      const previous = this.operations.get(txn.operationId);
      if (previous || staged.operations.has(txn.operationId)) {
        // Idempotent re-submit of a decided operation: answer with the original receipt (lost ACK).
        if (previous) {
          this.counters.replays++;
          pending.resolve({
            kind: "committed",
            lsn: previous.lsn,
            epoch: previous.epoch,
            positions: new Map(txn.placeholders.map((p, i) => [p, previous.positions[i]!])),
            ackAt: performance.now(),
            replayed: true,
          });
        } else conflicts.push({ pending, decision: { kind: "conflict", reason: "claim" } });
        continue;
      }
      const conflict = this.check(txn, staged);
      if (conflict) {
        this.counters.conflicts++;
        conflicts.push({ pending, decision: conflict });
        continue;
      }
      let member: { member: FrameMember; positions: Map<number, number> };
      try {
        member = this.finalize(txn, lsn, ordinal);
      } catch (error) {
        pending.reject(error);
        continue;
      }
      ordinal += width;
      const last = member.member.positions[member.member.positions.length - 1]!;
      for (const subject of member.member.subjects) staged.heads.set(subject, last);
      for (const claim of txn.claims) staged.claims.add(claim.commandId);
      staged.operations.add(txn.operationId);
      staged.head = Math.max(staged.head, last);
      accepted.push({ pending, ...member });
    }
    this.queue.splice(0, taken);
    const answerConflicts = () => {
      for (const entry of conflicts) entry.pending.resolve(entry.decision);
    };
    if (accepted.length === 0) return answerConflicts();
    const members = accepted.map((entry) => entry.member);
    const payload = encodeCommitGroup({ v: 1, stream: this.options.scopeKey, lsn, epoch, members });
    const t0 = performance.now();
    let frame: LogFrame;
    try {
      frame = await this.log.append(FrameKind.COMMIT_GROUP, payload);
    } catch (cause) {
      this.fail(
        new BrokerFailed(
          `Broker log append failed; outcome of ${accepted.length} commands unknown: ${String(cause)}`,
        ),
      );
      for (const entry of accepted) entry.pending.reject(this.failed);
      for (const entry of conflicts) entry.pending.reject(this.failed);
      return;
    }
    const ackAt = performance.now();
    let watermarkAt = ackAt;
    // The fsync returned: the decision is irrevocable. Record it, publish the watermark, expose the frame
    // to readers through the overlay, and only then ACK (Q31e: ACK after the source's own publication).
    try {
      this.index.push({ lsn: frame.lsn, offset: frame.offset, crc: frame.crc, kind: frame.kind });
      this.record(frame.lsn, epoch, members);
      this.durableLsn = frame.lsn;
      this.counters.frames++;
      this.counters.commits += members.length;
      this.addOverlay({ lsn: frame.lsn, members });
      this.log.publishWatermark({ epoch, lsn: frame.lsn, position: this.headPosition });
      watermarkAt = performance.now();
    } catch (cause) {
      // V-P2Q m1: the frame is durable but the publication step failed, so no ACK may be sent. Fail the broker
      // and answer outcome-unknown; a restart replays the frame and a resend returns the original receipt.
      this.fail(
        new BrokerFailed(
          `Broker failed after the fsync of LSN ${frame.lsn}; outcome of ${accepted.length} commands unknown: ${String(cause)}`,
        ),
      );
      for (const entry of accepted) entry.pending.reject(this.failed);
      for (const entry of conflicts) entry.pending.reject(this.failed);
      return;
    }
    for (const entry of accepted)
      entry.pending.resolve({
        kind: "committed",
        lsn: frame.lsn,
        epoch,
        positions: entry.positions,
        ackAt,
        replayed: false,
      });
    answerConflicts();
    this.notifyDurable();
    this.wakeApplier?.();
    try {
      this.options.onEvent?.({
        type: "frame",
        lsn: frame.lsn,
        members: members.length,
        bytes: payload.length,
        appendMs: ackAt - t0,
        at: ackAt,
        watermarkAt,
      });
    } catch {
      /* instrumentation never fails a commit */
    }
  }

  /** Claims and per-subject compare-and-set from the broker's record plus the group's staged prefix. */
  private check(
    txn: BrokerTransaction,
    staged: { heads: Map<string, number>; claims: Set<string>; head: number },
  ): BrokerDecision | undefined {
    for (const claim of txn.claims)
      if (this.claims.has(claim.commandId) || staged.claims.has(claim.commandId))
        return { kind: "conflict", reason: "claim" };
    if (txn.reads.scopeWide && staged.head > txn.sourceK)
      return { kind: "conflict", reason: "scope" };
    const guarded = new Set(txn.reads.entities);
    for (const row of txn.rows) if (!isJournalRow(row)) guarded.add(row.entity_id);
    for (const entity of guarded) {
      const head = staged.heads.get(entity) ?? this.heads.get(entity) ?? 0;
      if (head > txn.sourceK) return { kind: "conflict", reason: "subject", entity };
    }
    return undefined;
  }

  /** Assign ordinals and substitute final positions into the staged rows (P2X `bindPositions` pattern). */
  private finalize(
    txn: BrokerTransaction,
    lsn: number,
    base: number,
  ): { member: FrameMember; positions: Map<number, number> } {
    const positions = new Map<number, number>();
    txn.placeholders.forEach((placeholder, i) =>
      positions.set(placeholder, packPosition(lsn, base + i)),
    );
    if (positions.size === 0) positions.set(Number.NaN, packPosition(lsn, base));
    const subjects = new Set<string>();
    const rows: TripleRow[] = [];
    const priors: TripleRow[] = [];
    for (const row of txn.rows) {
      const fresh = txn.newIds.has(row.id);
      const recorded = positions.get(row.recorded_position);
      const retracted =
        row.retracted_position === null ? undefined : positions.get(row.retracted_position);
      if (fresh ? recorded === undefined : retracted === undefined)
        throw new BrokerInvalidTransaction(
          "Staged rows must carry positions from nextCommitPosition",
        );
      const positionFact =
        isJournalRow(row) &&
        row.attribute === TxAttributes.POSITION &&
        row.value_number !== null &&
        positions.has(row.value_number);
      if (!positionFact && row.value_number !== null && positions.has(row.value_number))
        throw new BrokerInvalidTransaction(
          "A placeholder commit position escaped into a fact value",
        );
      const final: TripleRow = {
        ...row,
        ...(fresh ? { recorded_position: recorded! } : {}),
        ...(retracted === undefined ? {} : { retracted_position: retracted }),
        ...(positionFact ? { value_number: positions.get(row.value_number!)! } : {}),
      };
      rows.push(final);
      if (!fresh) {
        const prior = txn.priors.get(row.id);
        if (!prior)
          throw new BrokerInvalidTransaction(`Retraction of ${row.id} has no prior version`);
        priors.push(prior);
      }
      if (!isJournalRow(row)) subjects.add(row.entity_id);
    }
    const ordered = [...positions.values()];
    return {
      member: {
        operationId: txn.operationId,
        attemptId: txn.attemptId,
        positions: ordered,
        claims: txn.claims,
        rows,
        priors,
        subjects: [...subjects],
      },
      positions,
    };
  }

  private fail(error: Error) {
    if (this.failed) return;
    this.failed = error;
    for (const pending of this.queue.splice(0)) pending.reject(error);
  }

  // ------------------------------------------------------------------ overlay

  private addOverlay(frame: OverlayFrame) {
    this.overlayFrames.push(frame);
    for (const member of frame.members)
      for (const row of member.rows) {
        this.versions.set(row.id, { row, lsn: frame.lsn });
        let ids = this.byEntity.get(row.entity_id);
        if (!ids) this.byEntity.set(row.entity_id, (ids = new Set()));
        ids.add(row.id);
      }
  }

  private evict(now = performance.now()) {
    const retain = this.options.retainPublishedMs ?? 2_000;
    while (this.overlayFrames.length > 0) {
      const frame = this.overlayFrames[0]!;
      if (frame.publishedAt === undefined || now - frame.publishedAt < retain) break;
      this.overlayFrames.shift();
      this.evictedThroughLsn = frame.lsn;
      for (const member of frame.members)
        for (const row of member.rows) {
          const version = this.versions.get(row.id);
          if (version && version.lsn === frame.lsn) {
            this.versions.delete(row.id);
            const ids = this.byEntity.get(row.entity_id);
            ids?.delete(row.id);
            if (ids && ids.size === 0) this.byEntity.delete(row.entity_id);
          }
        }
    }
  }

  /**
   * The latest overlay version of every row the selection names, for a reader whose replica snapshot is at
   * `replicaPosition`. Undefined when the overlay no longer holds every frame after that snapshot: the
   * composite reader is then not eligible (Q31d) and the caller routes to `fromLog`.
   * Versions from frames at or below the snapshot may be included; they equal what the replica holds, so
   * merging them by row id is exact.
   */
  overlay(
    replicaPosition: number,
    selection: { readonly entities?: readonly string[]; readonly id?: string },
    select: (row: TripleRow) => boolean,
  ): TripleRow[] | undefined {
    this.evict();
    if (this.evictedThroughLsn > lsnOf(replicaPosition)) return undefined;
    const out: TripleRow[] = [];
    const take = (id: string) => {
      const version = this.versions.get(id);
      if (version && select(version.row)) out.push(version.row);
    };
    if (selection.id !== undefined) take(selection.id);
    else if (selection.entities !== undefined)
      for (const entity of selection.entities)
        for (const id of this.byEntity.get(entity) ?? []) take(id);
    else for (const id of this.versions.keys()) take(id);
    return out;
  }

  /** The same answer from the broker's own record on disk; always complete (Q31d fallback). */
  fromLog(
    replicaPosition: number,
    selection: { readonly entities?: readonly string[]; readonly id?: string },
    select: (row: TripleRow) => boolean,
  ): TripleRow[] {
    const after = lsnOf(replicaPosition);
    const first = this.index.findIndex((entry) => entry.lsn > after);
    if (first === -1) return [];
    const previous = first === 0 ? undefined : this.index[first - 1]!;
    const start = this.index[first]!;
    const { frames } = readFramesFrom(
      this.log.segmentPath,
      previous
        ? { offset: start.offset, seed: previous.crc, nextLsn: previous.lsn + 1 }
        : { offset: start.offset, seed: this.seedOfFirst(), nextLsn: start.lsn },
      this.durableLsn,
      Number.MAX_SAFE_INTEGER,
    );
    const latest = new Map<string, TripleRow>();
    const entities = selection.entities ? new Set(selection.entities) : undefined;
    for (const frame of frames) {
      if (frame.kind !== FrameKind.COMMIT_GROUP) continue;
      for (const member of decodeCommitGroup(frame.payload).members)
        for (const row of member.rows) {
          if (selection.id !== undefined && row.id !== selection.id) continue;
          if (entities && !entities.has(row.entity_id)) continue;
          latest.set(row.id, row);
        }
    }
    return [...latest.values()].filter(select);
  }

  private seedOfFirst(): number {
    // The first frame of the segment chains from the segment header's CRC.
    return segmentStart(this.log.segmentPath).seed;
  }

  // ------------------------------------------------------------------ publication

  private async readReplicaMarker(): Promise<ReplicaMarker> {
    const rows = await this.options.replica!.query(markerQuery(this.options.scopeKey), {
      timeoutMs: this.options.applyTimeoutMs ?? 120_000,
    });
    const position = Number(rows[0]?.["brokerPosition"]?.value ?? 0);
    const epoch = Number(rows[0]?.["brokerEpoch"]?.value ?? 0);
    const incarnation = rows[0]?.["brokerIncarnation"]?.value ?? "";
    if (!Number.isSafeInteger(position) || !Number.isSafeInteger(epoch))
      throw new BrokerFailed("Unsafe replica marker");
    return { position, epoch, incarnation };
  }

  startApplier(): void {
    if (this.applying || !this.options.replica) return;
    this.applying = this.applyLoop().catch((error) => {
      this.options.onEvent?.({ type: "fenced", detail: String(error), at: performance.now() });
    });
  }

  private get replicaName(): string {
    return this.options.replicaName ?? "the QLever replica";
  }

  /**
   * The replica's real marker, read in its own request (V-P2Q C2: never the cached `replicaMarker`).
   * A lower marker than the cached one, or another epoch or incarnation, wakes the applier to fence and replay.
   * Unreachable: ReplicaUnavailable.
   *
   * Q72e (V-P2Q N5): probes are coalesced into one in-flight request per replica. A caller passes `notBefore`
   * when the read must be sent after some instant (an after-check must be sent after the last answer request
   * returned, or it could execute before that answer's snapshot); it joins the in-flight probe only if that
   * probe was sent at or after `notBefore`, and otherwise shares the one follow-up probe sent when it returns.
   */
  async probeReplica(
    surface: BasisSurface,
    notBefore = -Infinity,
    paced = false,
  ): Promise<ReplicaMarker> {
    if (!this.options.replica) return { position: 0, epoch: 0, incarnation: "" };
    let marker: ReplicaMarker;
    try {
      marker = await (paced ? this.pacedMarkerRead(notBefore) : this.sharedMarkerRead(notBefore));
    } catch (cause) {
      throw new ReplicaUnavailable({ replica: this.replicaName, surface, cause });
    }
    if (
      marker.position < this.replicaMarker.position ||
      marker.epoch !== this.replicaMarker.epoch ||
      marker.incarnation !== this.replicaMarker.incarnation
    ) {
      this.suspectRegression = true;
      this.wakeApplier?.();
    }
    return marker;
  }

  private sharedMarkerRead(notBefore: number): Promise<ReplicaMarker> {
    const current = this.probeInFlight;
    if (current === undefined) return this.startProbe();
    if (current.sentAt >= notBefore) return current.promise;
    if (this.probeNext === undefined) {
      const after = performance.now();
      this.probeNext = current.promise
        .then(
          () => undefined,
          () => undefined,
        )
        .then(() => {
          this.probeNext = undefined;
          const latest = this.probeInFlight;
          return latest !== undefined && latest.sentAt >= after
            ? latest.promise
            : this.startProbe();
        });
    }
    return this.probeNext;
  }

  /**
   * Q72e: a waiter re-checking the replica (no publication woke it) takes the next shared probe, sent at least
   * PROBE_GAP_MS after the previous probe of this replica. Every waiter that asks before it is sent shares it, so
   * N waiters cost one probe per gap instead of N (V-P2Q N5 measured 89 per waiter per second). First probes and
   * after-checks never wait for the pace (`sharedMarkerRead`).
   */
  private pacedMarkerRead(notBefore: number): Promise<ReplicaMarker> {
    const current = this.probeInFlight;
    if (current !== undefined && current.sentAt >= notBefore) return current.promise;
    if (this.pacedNext === undefined) {
      const delay = Math.max(0, this.lastProbeSentAt + PROBE_GAP_MS - performance.now());
      this.pacedNext = sleep(delay).then(() => {
        this.pacedNext = undefined;
        // [EXP-P2Q] Why: an immediate read may start while this timer waits.
        // Rejected: startProbe here (would overlap that read and replace its in-flight handle).
        return this.sharedMarkerRead(notBefore);
      });
    }
    return this.pacedNext;
  }

  private startProbe(): Promise<ReplicaMarker> {
    const sentAt = performance.now();
    this.lastProbeSentAt = sentAt;
    const promise: Promise<ReplicaMarker> = this.readReplicaMarker().finally(() => {
      if (this.probeInFlight?.promise === promise) this.probeInFlight = undefined;
    });
    this.probeInFlight = { sentAt, promise };
    return promise;
  }

  /**
   * Q72b: open the snapshot a multi-request read relies on. Waits (deadline-aware) for the replica's real marker
   * to reach `b`, then records that marker and this broker's incarnation. Pair with `verifySnapshot`.
   */
  async openSnapshot(
    b: number,
    deadlineMs: number,
    surface: BasisSurface,
  ): Promise<ReplicaSnapshot> {
    const started = performance.now();
    const marker = await this.awaitReplica(b, deadlineMs, surface);
    // Read after the marker, so a fence that finished during the wait does not refuse a read that began after it.
    return { basis: b, marker, fencedIncarnation: this.incarnation, surface, started };
  }

  /**
   * Q72b: call after the last answer request returned. Refuses with BasisNotAvailable (basis-not-reached) if the
   * replica was reset during the read: another incarnation on the replica, a fence by this broker, or a marker
   * below the basis. The probe is sent after this call starts (never an earlier in-flight one).
   */
  async verifySnapshot(snapshot: ReplicaSnapshot): Promise<void> {
    const after = await this.probeReplica(snapshot.surface, performance.now());
    const reset =
      after.incarnation !== snapshot.marker.incarnation ||
      this.incarnation !== snapshot.fencedIncarnation;
    // [EXP-P2Q] Why: Q67c requires an unchanged marker pair. Rejected: accepting forward
    // movement (cannot certify that an intermediate answer used the same replica snapshot).
    if (
      reset ||
      after.position !== snapshot.marker.position ||
      after.epoch !== snapshot.marker.epoch ||
      after.position < snapshot.basis
    )
      throw new BasisNotAvailable({
        required: snapshot.basis,
        observed: after.position,
        replica: reset
          ? `the QLever replica (reset during the read: incarnation ${snapshot.marker.incarnation || "none"} became ${after.incarnation || "none"})`
          : "the QLever replica (went backwards or marker changed during the read)",
        surface: snapshot.surface,
        waitedMs: performance.now() - snapshot.started,
      });
  }

  /**
   * Wait (deadline-aware, RULINGS Q31d and Q58a) until the replica's real marker reaches `b`; returns the
   * observed marker. The cached marker only paces the wait; every decision uses a fresh probe.
   */
  async awaitReplica(b: number, deadlineMs: number, surface: BasisSurface): Promise<ReplicaMarker> {
    const started = performance.now();
    // After a publication wake, only a probe sent after that publication can show it; every waiter it woke
    // shares that one probe. Any other re-check takes the paced shared probe (Q72e).
    let notBefore = -Infinity;
    let paced = false;
    for (;;) {
      const real = await this.probeReplica(surface, notBefore, paced);
      if (real.position >= b) return real;
      const remaining = deadlineMs - (performance.now() - started);
      if (remaining <= 0)
        throw new BasisNotAvailable({
          required: b,
          observed: real.position,
          replica: this.replicaName,
          surface,
          waitedMs: performance.now() - started,
        });
      // Wake on the next publication. When the cached marker is already (wrongly) ahead, the probe above has
      // woken the applier to fence; re-check at the shared pace.
      notBefore = performance.now();
      paced = true;
      if (
        this.replicaMarker.position < b &&
        (await this.waitPublished(b, Math.min(remaining, 100)))
      ) {
        notBefore = this.lastPublishedAt;
        paced = false;
      }
    }
  }

  /**
   * V-P2Q M2: a basis is answerable only inside the resolved prefix, that is at or below the last ordinal slot of
   * the last durable frame. Wait within the deadline for a later frame to cover `b`, then BasisNotAvailable.
   */
  async awaitResolved(b: number, deadlineMs: number, surface: BasisSurface): Promise<void> {
    const started = performance.now();
    while (lastPositionOf(this.durableLsn) < b) {
      const remaining = deadlineMs - (performance.now() - started);
      if (remaining <= 0 || this.failed)
        throw new BasisNotAvailable({
          required: b,
          observed: lastPositionOf(this.durableLsn),
          replica: "the broker's resolved prefix",
          surface,
          waitedMs: performance.now() - started,
        });
      await new Promise<void>((resolve) => {
        const waiter = { position: b, resolve };
        this.durableWaiters.push(waiter);
        setTimeout(
          () => {
            const i = this.durableWaiters.indexOf(waiter);
            if (i !== -1) this.durableWaiters.splice(i, 1);
            resolve();
          },
          Math.min(remaining, 100),
        );
      });
    }
  }

  private notifyDurable() {
    const covered = lastPositionOf(this.durableLsn);
    for (let i = this.durableWaiters.length - 1; i >= 0; i--)
      if (this.durableWaiters[i]!.position <= covered)
        this.durableWaiters.splice(i, 1)[0]!.resolve();
  }

  /** Resolve true once the cached replica marker reaches `position` (false on timeout); pacing only. */
  waitPublished(position: number, timeoutMs: number): Promise<boolean> {
    if (this.replicaMarker.position >= position) return Promise.resolve(true);
    return new Promise((resolve) => {
      const waiter = { position, resolve };
      this.publishWaiters.push(waiter);
      setTimeout(() => {
        const i = this.publishWaiters.indexOf(waiter);
        if (i !== -1) {
          this.publishWaiters.splice(i, 1);
          resolve(false);
        }
      }, timeoutMs);
    });
  }

  /**
   * The next publication batch after `afterLsn`: from the overlay while it still holds every frame after
   * that LSN, otherwise from the log on disk (after a replica regression the overlay may have evicted
   * frames the replica no longer has).
   */
  private nextBatch(
    afterLsn: number,
    maxApply: number,
  ): { readonly lsn: number; readonly members: readonly FrameMember[] }[] {
    const batch: { lsn: number; members: readonly FrameMember[] }[] = [];
    let commands = 0;
    const take = (lsn: number, members: readonly FrameMember[]) => {
      if (batch.length > 0 && commands + members.length > maxApply) return false;
      batch.push({ lsn, members });
      commands += members.length;
      return true;
    };
    if (this.evictedThroughLsn <= afterLsn) {
      for (const frame of this.overlayFrames)
        if (frame.lsn > afterLsn && !take(frame.lsn, frame.members)) break;
      return batch;
    }
    const first = this.index.findIndex((entry) => entry.lsn > afterLsn);
    if (first === -1) return batch;
    const previous = first === 0 ? undefined : this.index[first - 1]!;
    const start = this.index[first]!;
    const { frames } = readFramesFrom(
      this.log.segmentPath,
      previous
        ? { offset: start.offset, seed: previous.crc, nextLsn: previous.lsn + 1 }
        : { offset: start.offset, seed: this.seedOfFirst(), nextLsn: start.lsn },
      this.durableLsn,
      32 * 1024 * 1024,
    );
    for (const frame of frames)
      if (
        frame.kind === FrameKind.COMMIT_GROUP &&
        !take(frame.lsn, decodeCommitGroup(frame.payload).members)
      )
        break;
    return batch;
  }

  private async replicaMarkerWithRetry(): Promise<ReplicaMarker> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.readReplicaMarker();
      } catch (error) {
        if (this.stopping) throw error;
        await sleep(Math.min(1_000, 25 * 2 ** Math.min(attempt, 6)));
      }
    }
  }

  /**
   * The replica's marker differs from what this applier last published. Higher epoch or ahead of the log:
   * another writer owns the replica, fail-stop (R13 5.1, 6.5 step 5). Otherwise the replica went backwards: it
   * restarted without its persisted delta (`--persist-updates` off, R21 1.3) or lost its last writeback. The host
   * log is the truth, so take the epoch again and replay from the replica's own marker; frames are pure quad
   * deltas, so replay is idempotent (R13 6.2). Readers meanwhile see the lower marker in their own request and
   * route to the overlay or the log. Returns false when the broker failed.
   */
  private async onMarkerMismatch(marker: ReplicaMarker, expected: ReplicaMarker): Promise<boolean> {
    if (marker.epoch > this.log.epoch || lsnOf(marker.position) > this.durableLsn) {
      this.options.onEvent?.({
        type: "fenced",
        detail: `marker ${JSON.stringify(marker)} expected ${JSON.stringify(expected)}`,
        at: performance.now(),
      });
      this.fail(
        new BrokerFailed(
          `Replica guard failed at ${JSON.stringify(expected)}; another writer owns the replica`,
        ),
      );
      return false;
    }
    // Q72b: a new incarnation before the fence is sent, so a snapshot opened before this point is refused even
    // if its after-check reads the replica before the fence lands.
    const incarnation = newIncarnation(this.log.epoch);
    this.incarnation = incarnation;
    try {
      await this.options.replica!.update(
        buildFence(this.options.scopeKey, marker, this.log.epoch, incarnation),
        {
          timeoutMs: this.options.applyTimeoutMs ?? 120_000,
        },
      );
    } catch {
      return true; // unreachable again; the next pass re-reads the marker
    }
    const fenced = await this.replicaMarkerWithRetry();
    // Lost a race (the replica moved again) or the fence did not land: the next pass re-reads the marker.
    if (fenced.epoch !== this.log.epoch || fenced.incarnation !== incarnation) return true;
    this.counters.replicaRegressions++;
    this.options.onEvent?.({
      type: "replica-regressed",
      from: this.replicaMarker.position,
      to: fenced.position,
      at: performance.now(),
    });
    this.replicaMarker = fenced;
    this.publishedLsn = lsnOf(fenced.position);
    return true;
  }

  private async applyLoop(): Promise<void> {
    const replica = this.options.replica!;
    const maxApply = this.options.maxApplyCommands ?? 64;
    const idleProbeMs = this.options.idleProbeMs ?? 500;
    let lastProbe = performance.now();
    while (!this.stopping) {
      const batch = this.nextBatch(this.publishedLsn, maxApply);
      if (batch.length === 0) {
        await new Promise<void>((resolve) => {
          this.wakeApplier = resolve;
          setTimeout(resolve, Math.min(250, idleProbeMs));
        });
        this.wakeApplier = undefined;
        this.evict();
        // V-P2Q C2: an idle applier must notice a replica that went backwards without a new commit.
        if (performance.now() - lastProbe >= idleProbeMs || this.suspectRegression) {
          lastProbe = performance.now();
          this.suspectRegression = false;
          let marker: ReplicaMarker | undefined;
          try {
            marker = await this.readReplicaMarker();
          } catch {
            marker = undefined; // unreachable: retry on the next probe
          }
          if (marker && !sameMarker(marker, this.replicaMarker))
            if (!(await this.onMarkerMismatch(marker, this.replicaMarker))) return;
        }
        continue;
      }
      const from = this.replicaMarker;
      // A publication keeps the incarnation and guards on it (Q72b).
      const to: ReplicaMarker = {
        position: lastPositionOf(batch[batch.length - 1]!.lsn),
        epoch: this.log.epoch,
        incarnation: from.incarnation ?? "",
      };
      const update = buildPublication(
        this.options.scopeKey,
        from,
        to,
        batch.flatMap((frame) => frame.members),
      );
      const t0 = performance.now();
      let resends = 0;
      let response: unknown;
      for (;;) {
        try {
          response = await replica.update(update.sparql, {
            timeoutMs: this.options.applyTimeoutMs ?? 120_000,
          });
          break;
        } catch (error) {
          // Re-sending the identical update is the first repair (R13 6.7 C2.6); the guard makes a second
          // application a no-op, which the marker check below detects.
          this.counters.applyErrors++;
          this.options.onEvent?.({
            type: "apply-error",
            error: String(error),
            at: performance.now(),
          });
          if (this.stopping) return;
          resends++;
          await sleep(Math.min(1_000, 25 * 2 ** Math.min(resends, 6)));
        }
      }
      const delta = deltaOf(response);
      // Unknown response shape or a re-send: never assume success without the marker.
      if (
        (delta.inserted === 0 && delta.deleted === 0) ||
        delta.inserted === undefined ||
        resends > 0
      ) {
        // Zero change counts: either this update already applied (a re-send after a lost response) or the
        // guard failed because another epoch owns the replica. The marker decides (R13 6.5 step 8).
        const marker = await this.replicaMarkerWithRetry();
        if (!sameMarker(marker, to)) {
          if (!(await this.onMarkerMismatch(marker, from))) return;
          continue;
        }
      }
      const at = performance.now();
      this.lastPublishedAt = at;
      this.replicaMarker = to;
      this.publishedLsn = batch[batch.length - 1]!.lsn;
      for (const frame of this.overlayFrames)
        if (frame.lsn <= this.publishedLsn && frame.publishedAt === undefined)
          frame.publishedAt = at;
      if (delta.total !== undefined) this.lastDeltaTotal = delta.total;
      this.options.onEvent?.({
        type: "published",
        fromLsn: batch[0]!.lsn,
        toLsn: this.publishedLsn,
        members: update.members,
        ms: at - t0,
        at,
        ...(delta.inserted === undefined ? {} : { inserted: delta.inserted }),
        ...(delta.deleted === undefined ? {} : { deleted: delta.deleted }),
        ...(delta.total === undefined ? {} : { deltaTotal: delta.total }),
        resends,
      });
      for (let i = this.publishWaiters.length - 1; i >= 0; i--)
        if (this.publishWaiters[i]!.position <= to.position)
          this.publishWaiters.splice(i, 1)[0]!.resolve(true);
      this.evict(at);
      this.maybeRebuild();
    }
  }

  /**
   * Bound the delta (brief point 4): an online `rebuild-index` once the delta reaches the threshold. It runs
   * on its own connection and is never awaited by the applier or the ACK path; R17 1.4 measured a 54 s rebuild
   * that raised read p50 from 108 ms to 1.4 s, which is the cost the bench records.
   */
  private maybeRebuild() {
    const threshold = this.options.rebuildAtDeltaTriples;
    if (threshold === undefined || this.rebuilding || (this.lastDeltaTotal ?? 0) < threshold)
      return;
    this.rebuilding = true;
    this.counters.rebuilds++;
    const t0 = performance.now();
    this.options.onEvent?.({ type: "rebuild-start", deltaTotal: this.lastDeltaTotal ?? 0, at: t0 });
    void this.options
      .replica!.command("rebuild-index", { timeoutMs: 1_800_000 })
      .then(
        () =>
          this.options.onEvent?.({
            type: "rebuild-end",
            ms: performance.now() - t0,
            ok: true,
            at: performance.now(),
          }),
        (error) =>
          this.options.onEvent?.({
            type: "rebuild-end",
            ms: performance.now() - t0,
            ok: false,
            error: String(error),
            at: performance.now(),
          }),
      )
      .finally(() => {
        this.rebuilding = false;
        this.lastDeltaTotal = 0;
      });
  }

  /** Wait until the replica's real marker covers every durable commit (or the timeout passes). */
  async drain(timeoutMs = 60_000): Promise<boolean> {
    if (!this.options.replica) return true;
    const target = this.headPosition === 0 ? 0 : lastPositionOf(lsnOf(this.headPosition));
    try {
      await this.awaitReplica(target, timeoutMs, "repository");
      return true;
    } catch {
      return false;
    }
  }

  stats(): BrokerStats {
    return {
      epoch: this.log.epoch,
      headPosition: this.headPosition,
      durableLsn: this.durableLsn,
      replicaPosition: this.replicaMarker.position,
      unpublishedFrames: this.overlayFrames.filter((frame) => frame.publishedAt === undefined)
        .length,
      overlayFrames: this.overlayFrames.length,
      ...this.counters,
      abortedLsns: [...this.aborted],
      fsyncCalibrationMs: this.recovery.fsyncCalibrationMs,
      recovery: this.recovery.status,
      lastDeltaTotal: this.lastDeltaTotal,
    };
  }

  async close(): Promise<void> {
    this.stopping = true;
    while (this.deciding) await sleep(1);
    this.wakeApplier?.();
    await this.applying;
    await this.log.close();
  }
  /** Simulated crash: stop without releasing the lock or draining anything. */
  async abandon(): Promise<void> {
    this.stopping = true;
    this.wakeApplier?.();
    await this.log.abandon();
  }
}
