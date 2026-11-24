import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { Documents, hash } from "../../notify1/store.ts";
import { Conflict, type Store } from "../store.ts";
import type { BulkQueue } from "./bulk.ts";
import type { Settlement } from "./settlement.ts";
import type { Progress } from "./archive.ts";
import type { Cursor } from "./recorded.ts";

// [DX-ACT5] Why: the owner wants, for one account at a time, to see where its background settlement stands and to
// pause, resume and pace it without touching any other account, surviving a restart. The control is one durable fact
// per account (`settlement-control` in the account's own namespace), so the existing gateway routes already read and
// write it (rows by entity, transact); `readSettlement` and `setSettlementControl` are the SDK calls. A worker opened
// with TX2_SETTLE_CONTROL=1 reads it before each frame (cached 250 ms): paused, it sends nothing for that account;
// paced, its account key gets at least that many milliseconds between frames in the bulk queue. Unset, no read and no
// change. Rejected: a new gateway route (it would only wrap these two calls) and keeping pause state in memory (lost on
// restart).
export type Control = { paused: boolean; paceMs: number | null; by: string; version: number };
const KEY = "control";
const documents = (store: Store) => new Documents(store.comp, "settlement-control" + store.names.documents);

export async function readControl(store: Store, at?: number) {
  const db = documents(store);
  const row = await db.row<Control>(KEY, at ?? (await db.head()));
  return { row, control: row?.value ?? { paused: false, paceMs: null, by: "default", version: 0 } };
}

/** The SDK write: pause, resume or pace one account's settlement (a guarded commit of the control fact). */
export async function setSettlementControl(store: Store, change: { paused?: boolean; paceMs?: number | null; by: string }) {
  assert(change.paceMs === undefined || change.paceMs === null || (Number.isFinite(change.paceMs) && change.paceMs >= 0));
  for (let attempt = 0; attempt < 8; attempt++) {
    const db = documents(store),
      at = await db.head();
    const { row, control } = await readControl(store, at);
    const next: Control = {
      paused: change.paused ?? control.paused,
      paceMs: change.paceMs === undefined ? control.paceMs : change.paceMs,
      by: change.by,
      version: control.version + 1,
    };
    try {
      return await store.commit(
        "settlement-control:" + hash([store.scope, store.held?.account ?? "", next]),
        "lazy/settlement-control",
        db.change(KEY, row, next),
        at,
        next,
        undefined,
        undefined,
        [{ entityId: db.prefix + KEY, tripleIds: row ? [row.id] : [] }],
      );
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
  throw new Error("Settlement control changed eight times while being set");
}

/** The worker side: before each frame, wait while paused and keep the account's pace in the queue. */
export class SettlementControl {
  private readonly store: Store;
  private readonly queue: BulkQueue;
  private readonly key: string;
  private seen?: { at: number; control: Control };
  waitedMs = 0;
  constructor(store: Store, queue: BulkQueue, key: string) {
    this.store = store;
    this.queue = queue;
    this.key = key;
  }
  private async current() {
    if (!this.seen || performance.now() - this.seen.at > 250)
      this.seen = { at: performance.now(), control: (await readControl(this.store)).control };
    return this.seen.control;
  }
  async gate() {
    const begun = performance.now();
    for (;;) {
      const c = await this.current();
      this.queue.pace(this.key, c.paceMs);
      if (!c.paused) break;
      await sleep(250);
    }
    this.waitedMs += performance.now() - begun;
  }
}

/** The SDK read: where one account's settlement stands, from durable rows (and this process's frame counts). */
export async function readSettlement(worker: Settlement) {
  const a = worker.archive.source,
    s = a.s;
  const head = await s.head();
  const c = await s.controls(head);
  const owed = c.releases.filter((r) => r.storage === "owed").sort((l, r) => l.tx - r.tx);
  const latest = owed.at(-1);
  const control = (await readControl(worker.archive.store)).control;
  const contest = {
    values: worker.archive.contest.summary(),
    notices: worker.recorder.archive.contest.summary(),
  };
  const turns = [...worker.archive.contest.turns, ...worker.recorder.archive.contest.turns];
  const meanTurnMs = turns.length ? turns.reduce((n, [b, e]) => n + e - b, 0) / turns.length : null;
  if (!latest) return { head, release: null, control, contest };
  const { census } = await a.receipt(latest.seq, head);
  const progress = (await worker.archive.values(latest.seq))?.value as Progress | undefined;
  const cursorRow = await worker.recorder.archive.db.row<Cursor>("notice-progress", await worker.recorder.archive.store.head());
  const tail = (await a.notices.observe()).value.sequence;
  const done = progress?.through ?? 0;
  const framesPerSubject = progress?.frame && done ? progress.frame / done : null;
  const remainingValueFrames = framesPerSubject === null ? null : Math.ceil((census.count - done) * framesPerSubject);
  const cursor = cursorRow?.value;
  return {
    head,
    release: { seq: latest.seq, name: latest.document?.name ?? null, position: latest.tx },
    values: {
      status: progress?.status ?? "not started",
      subjectsDone: done,
      subjects: census.count,
      changesWritten: progress?.changes ?? 0,
      frames: progress?.frame ?? null,
    },
    notices: {
      event: cursor?.event ?? 1,
      lastEvent: tail,
      subjectsDoneInEvent: cursor?.start ?? 0,
      entriesWritten: cursor?.entries ?? 0,
      caughtUp: cursor !== undefined && cursor.event > tail,
    },
    control,
    contest,
    estimate: {
      remainingValueFrames,
      remainingValueMs: remainingValueFrames === null || meanTurnMs === null ? null : remainingValueFrames * meanTurnMs,
      meanTurnMs,
      basis: "frames per subject so far times this process's mean frame turn (diagnostic on the Mac)",
    },
  };
}
