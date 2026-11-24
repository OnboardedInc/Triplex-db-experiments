import assert from "node:assert/strict";
import {
  DatomicClient,
  withDatomicErasureSequence,
  type ErasureFrontier,
} from "../../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../../bench/lib/triplex.ts";

export type BulkClass = "activation" | "notice";
// [DX-ACT9] `accounts` (TX2_ACCOUNT_TICKETS=1): the frame's destination is the source's own database, so the ticket
// names the account the frame read instead of being sent as a cross-database ticket (which keeps the database-wide
// check). Absent: exactly as before.
type SourceTicket = Pick<ErasureFrontier, "seq" | "database"> & { accounts?: readonly string[] };
const workByClaim = new Map<string, { kind: BulkClass; ticket?: SourceTicket }>();
let installed = false;
export const bulkWireLimit = 64 * 1024;
export const bulkUs = (rows: number, bytes: number) =>
  2400 + 1100 + 45 * rows + Math.ceil((70 * bytes) / 1024);

// [DX-ACT7] Why: the frame analysis needs the real work behind each settlement frame's estimate: the datoms the
// transaction wrote and the transactor's own serial apply time, both on the gateway's reply (`datoms` always;
// `nativeComputeMs` when the write gateway runs with TX2_GROUP_STAGE_CLOCK=1, `nativeApplyMs` with
// TX2_REMOVAL_COST_READBACK=1), beside the frame's request rows and bytes. With DX_ACT7_FRAME_COUNTERS=1 every bulk
// frame's reply is recorded (at most 200,000 per process); unset, nothing is recorded and the reply is untouched.
// Rejected: estimating the real work from the Mac's client-side turn times (they hold the whole round trip).
export type FrameEstimate = { us: number; wire: number; ops: number };
export type FrameCounter = { kind: BulkClass; rows: number; requestBytes: number; datoms: number | null;
  applyMs: number | null; transactMicros: number | null; estimate: FrameEstimate | null };
export const frameCountersOn = process.env.DX_ACT7_FRAME_COUNTERS === "1";
export const frameCounters: FrameCounter[] = [];
/** The writer's estimate of each frame in flight, by its claim (set by Archive.write when the counters are on). */
export const frameEstimates = new Map<string, FrameEstimate>();
function recordFrame(kind: BulkClass, input: { rows?: readonly unknown[]; claims?: readonly { commandId: string }[] },
  reply: Record<string, unknown>) {
  const claim = input.claims?.[0]?.commandId;
  const estimate = claim === undefined ? null : frameEstimates.get(claim) ?? null;
  if (claim !== undefined) frameEstimates.delete(claim);
  if (frameCounters.length >= 200_000) return;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  frameCounters.push({ kind, rows: input.rows?.length ?? 0, requestBytes: Buffer.byteLength(JSON.stringify(input)),
    datoms: n(reply.datoms), applyMs: n(reply.nativeComputeMs) ?? n(reply.nativeApplyMs), transactMicros: n(reply.transactMicros),
    estimate });
}

// [DX-ACT1] Why: the pinned W1 gateway selects the class from the native claim frame. Rejected: an ambient Effect context that can belong to a different writing fiber.
export async function bulkClaim<T>(
  scope: string,
  claim: string,
  kind: BulkClass,
  send: () => Promise<T>,
  ticket?: SourceTicket,
) {
  if (!installed) {
    installed = true;
    const original = DatomicClient.prototype.transact;
    DatomicClient.prototype.transact = function (db, input, onSent) {
      const claims = input.claims.map((entry) => workByClaim.get(db + "/" + entry.commandId));
      const work = claims.find((x) => x !== undefined);
      if (!work) return original.call(this, db, input, onSent);
      assert(claims.length === 1 && input.rows.length <= 96, "Invalid bulk claim frame");
      const wire = { ...input, writeClass: work.kind };
      // [DX-ERASE1] Why: a queued Effect can resume in another context, so bring the source cut with the destination's exact claim.
      // Rejected: relying on the enqueueing fiber's ambient removal sequence.
      const invoke = () => frameCountersOn
        ? original.call(this, db, wire, onSent).then((reply) => {
            recordFrame(work.kind, input, reply as unknown as Record<string, unknown>);
            return reply;
          })
        : original.call(this, db, wire, onSent);
      return work.ticket
        ? work.ticket.accounts
          ? withDatomicErasureSequence(work.ticket.seq, invoke, false, undefined, work.ticket.accounts)
          : withDatomicErasureSequence(work.ticket.seq, invoke, false, work.ticket.database)
        : invoke();
    };
  }
  const db =
    "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
  const key = db + "/" + claim;
  assert(!workByClaim.has(key), "Bulk claim already in flight in this process");
  workByClaim.set(key, { kind, ...(ticket ? { ticket } : {}) });
  try {
    return await send();
  } finally {
    workByClaim.delete(key);
  }
}

type Turn = () => Promise<void>;
export class BulkQueue {
  private readonly ready = new Map<string, Turn[]>();
  private availableAt = 0;
  private inFlight = 0;
  private liveTurns = 0;
  private writing = false;
  private timer?: ReturnType<typeof setTimeout>;
  readonly duty: number;
  private readonly observe?: (ms: number) => void;
  // [DX-ACT5] Turn-taking controls, all off by default: `held` stops every new turn (a Publish beside settlement);
  // `external` hands turns to the account admission (settlementLane) instead of this queue's own pump; per key
  // (account) a pause and a pace (least milliseconds between two of its turns). Keys rotate round-robin as before.
  private held = false;
  private external = false;
  private idle: (() => void)[] = [];
  private readonly paused = new Set<string>();
  private readonly paces = new Map<string, number>();
  private readonly nextAt = new Map<string, number>();
  readonly turnsByKey = new Map<string, number>();
  constructor(duty = 0.5, observe?: (ms: number) => void) {
    assert(duty > 0 && duty <= 1);
    this.duty = duty;
    this.observe = observe;
  }
  async live<T>(work: () => Promise<T>) {
    this.inFlight++;
    try {
      return await work();
    } finally {
      this.inFlight--;
      this.liveTurns = Math.min(8, this.liveTurns + 1);
      this.pump();
    }
  }
  submit<T>(scope: string, work: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      const turns = this.ready.get(scope) ?? [];
      turns.push(async () => {
        try {
          resolve(await work());
        } catch (e) {
          reject(e);
        }
      });
      this.ready.set(scope, turns);
      this.pump();
    });
  }
  /** [DX-ACT5] Stop new turns; resolves when no turn is in flight. */
  hold() {
    this.held = true;
    return this.writing ? new Promise<void>((resolve) => this.idle.push(resolve)) : Promise.resolve();
  }
  release() {
    this.held = false;
    this.pump();
  }
  /** [DX-ACT5] Pause or resume one key's turns; set its pace (null clears it). */
  pause(key: string) {
    this.paused.add(key);
  }
  resume(key: string) {
    this.paused.delete(key);
    this.pump();
  }
  pace(key: string, msBetweenTurns: number | null) {
    assert(msBetweenTurns === null || (Number.isFinite(msBetweenTurns) && msBetweenTurns >= 0));
    if (msBetweenTurns === null) this.paces.delete(key);
    else this.paces.set(key, msBetweenTurns);
    this.pump();
  }
  setExternal(on: boolean) {
    this.external = on;
    if (!on) this.pump();
  }
  /** The next key allowed a turn now, or the earliest time one will be (rotation order: oldest ready first). */
  private choose(): { key?: string; wait?: number } {
    const t = performance.now();
    let wait: number | undefined;
    for (const key of this.ready.keys()) {
      if (this.paused.has(key)) continue;
      const at = this.nextAt.get(key) ?? 0;
      if (at <= t) return { key };
      wait = Math.min(wait ?? Infinity, at - t);
    }
    return wait === undefined ? {} : { wait };
  }
  hasReady() {
    return !this.held && !this.writing && this.choose().key !== undefined;
  }
  private start(key: string): Promise<void> {
    const turns = this.ready.get(key)!;
    const turn = turns.shift()!;
    this.ready.delete(key);
    if (turns.length) this.ready.set(key, turns);
    this.writing = true;
    this.liveTurns = 0;
    this.turnsByKey.set(key, (this.turnsByKey.get(key) ?? 0) + 1);
    const pace = this.paces.get(key);
    const begun = performance.now();
    if (pace !== undefined) this.nextAt.set(key, begun + pace);
    return turn().finally(() => {
      const done = performance.now(),
        elapsed = done - begun;
      this.observe?.(elapsed);
      this.availableAt = done + elapsed * (1 / this.duty - 1);
      this.writing = false;
      for (const f of this.idle.splice(0)) f();
      this.pump();
    });
  }
  /** [DX-ACT5] One turn granted by the account admission (external mode). */
  runNext() {
    assert(this.external);
    const { key } = this.choose();
    if (this.held || this.writing || key === undefined) return Promise.resolve();
    return this.start(key);
  }
  private pump() {
    if (this.external || this.held) return;
    if (this.writing || this.timer || !this.ready.size || (this.inFlight && this.liveTurns < 8))
      return;
    const gap = this.availableAt - performance.now();
    const { key, wait } = this.choose();
    if (gap > 0 || key === undefined) {
      if (gap <= 0 && wait === undefined) return;
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.pump();
      }, Math.ceil(Math.max(gap, wait ?? 0)));
      return;
    }
    // [DX-ACT1] Why: use the W1 choice of live preference and one bulk turn after eight live completions, rotating ready accounts. Rejected: submitting an entire release to the non-preemptible native pipeline.
    void this.start(key);
  }
}

/**
 * [DX-ACT5] Settlement frames as a bulk lane of the account admission (the same credits live saves take, through
 * `play`'s FairImport hook): one frame at a time, and only while no live save waits for a credit, so a live save waits
 * behind at most one frame in the writer. The queue's keys (accounts) still rotate round-robin inside the lane.
 * Rejected: a second credit window beside the live one, and preempting a frame once sent (the writer cannot).
 */
export function settlementLane(queue: BulkQueue, end: number) {
  queue.setExternal(true);
  let sent = 0;
  const lane = {
    limit: 1,
    end,
    yieldToLive: true,
    yieldedChecks: 0,
    ready: () => queue.hasReady(),
    send: async () => {
      sent++;
      await queue.runNext();
    },
    close: () => queue.setExternal(false),
    stats: () => ({ granted: sent, yieldedChecks: lane.yieldedChecks }),
  };
  return lane;
}
