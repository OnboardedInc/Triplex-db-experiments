import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DatomicClient, DatomicHttpError, orderedSaveIdentity,
} from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { expectedSave, type Row } from "./field-save.ts";
export { expectedSave, type Row } from "./field-save.ts";
import {
  activeSubjects,
  expiryMs,
  field,
  keyFor,
  maxInflight,
  operationId,
  task,
  type Density,
  type Write,
} from "./plan.ts";
import { journalHash, now, type Scope } from "./observer.ts";

type Ack = {
  operationId: string;
  position: { v: string };
  t: { v: string };
  recordedAt: { v: number };
  groupSize?: number;
  requestBytes: number;
  preparedOps: number;
  nativeComputeMs?: number;
  submitToNativeEntryMs?: number;
  readyToNativeEntryMs?: number;
  groupQueueMicros?: number;
  transactMicros?: number;
  groupStages?: Record<string, number>;
  timeline?: Record<string, number>;
  subjectSave?: string;
  subjectOrderedIds?: boolean;
};
export type Save = {
  id: string;
  account: number;
  subject: number;
  ordinal: number;
  width: number;
  db: string;
  due: number;
  enqueued: number;
  dispatched?: number;
  sent?: number;
  responseHeaders?: number;
  responseTrace?: string;
  predecessor?: string;
  orderedToken?: string;
  end?: number;
  status:
    | "offered"
    | "pending"
    | "acked"
    | "expired-before-dispatch"
    | "refused"
    | "uncertain"
    | "recovered";
  receipt?: { p: number; t: string; clock: number; tx: string; digest: string; size: number };
  stage?: Omit<Ack, "operationId" | "position" | "t" | "recordedAt">;
  error?: string;
  expiryCause?:
    | "timer"
    | "same-subject"
    | "in-flight-limit"
    | "unresolved-predecessor"
    | "dispatch";
  pending?: number;
  queued?: number;
};

export type Sender = {
  client: DatomicClient;
  scope: Scope;
  rows: Map<string, Row[]>;
};

export async function preload(client: DatomicClient, scope: Scope, people: Density, a: number) {
  const chosen = activeSubjects(people)[a]!,
    found = new Map<string, Row[]>();
  for (let i = 0; i < chosen.length; i += 64) {
    const subjects = chosen.slice(i, i + 64);
    const index = new Map(subjects.map((s) => [task(a, s), s]));
    const rows = await client.rows(scope.db, {
      entityIds: [...index.keys()],
      basis: { recordedPosition: scope.seedCut, validAt: SEED_VALID_FROM },
    });
    for (const row of rows) {
      const subject = index.get(row.entity_id),
        n = [field(0), field(1), field(2)].indexOf(row.attribute);
      if (n < 0) continue;
      assert(subject !== undefined);
      const want = fieldValue(subject, 0, n, 0);
      assert(want.type === "string" && row.value_string === want.value);
      const fields = found.get(row.entity_id) ?? [];
      assert(!fields[n]);
      fields[n] = row;
      found.set(row.entity_id, fields);
    }
  }
  assert.equal(found.size, chosen.length);
  for (const x of found.values()) assert(x.length === 3 && x.every(Boolean));
  return found;
}

// [DX-SCALE1] Why: compare every logical field of the committed WFIX1 change records at the assigned clock. Rejected: proving only the retracted identity or ignoring the stored predecessor lifetime.
export function expectedJournal(candidate: ReturnType<typeof expectedSave>, clock: number) {
  const changes = candidate.input.rows
    .filter((r) => r.entity_type === "_Transaction" && r.attribute === ":_tx/change")
    .map((row) => {
      const change = JSON.parse(row.value_json!);
      return change.op === "assert"
        ? { ...change, recordedAt: clock }
        : { ...change, retractedAt: clock };
    });
  return journalHash(candidate.entity, changes);
}

function bind(o: Save, a: Ack, candidate: ReturnType<typeof expectedSave>) {
  const p = Number(a.position.v),
    t = a.t.v,
    clock = a.recordedAt.v;
  assert(a.operationId === o.id && Number.isSafeInteger(p) && p > 0 && BigInt(t) > 0n);
  assert(Number.isFinite(clock) && clock > 0 && candidate.input.claims.length === 1);
  o.receipt = {
    p,
    t,
    clock,
    tx: candidate.input.claims[0]!.txId,
    digest: expectedJournal(candidate, clock),
    size: a.groupSize ?? 1,
  };
  const { operationId: _id, position: _p, t: _t, recordedAt: _c, ...stage } = a;
  o.stage = stage;
}

// [DX-SCALE1] Why: all tapes are open-loop, and a start deadline is evaluated before allocating the gateway request. Rejected: a single closed promise chain or counting an upstream expiration as a native commit limit.
export async function play(
  scopes: Sender[],
  tape: Write[],
  start: number,
  nonce: string,
  capture = false,
  orderedIds = false,
) {
  const queues = scopes.map(() => [] as { e: Write; row: Save }[]),
    active = scopes.map(() => 0),
    owned = new Map<string, string>(),
    pending = new Set<Promise<void>>(),
    rows: Save[] = [];
  const quarantined = new Map<string, string>();
  const queuedTail = new Map<string, string>();
  const unresolved = new Map<Save, ReturnType<typeof expectedSave>>();
  const inFlightSends = new Map<string, Save>();
  const observe: NonNullable<DatomicClient["onRequest"]> = (response) => {
    const save = inFlightSends.get(response.operationId ?? "");
    if (
      save &&
      response.path === `/v1/db/${save.db}/transact` &&
      Number.isFinite(response.written)
    ) {
      save.sent = performance.timeOrigin + response.written;
      if (capture && Number.isFinite(response.headers))
        save.responseHeaders = performance.timeOrigin + response.headers;
      if (capture && response.gatewayTraceparent) save.responseTrace = response.gatewayTraceparent;
    }
  };
  const expire = (entry: Save, cause: NonNullable<Save["expiryCause"]>) => {
    entry.status = "expired-before-dispatch";
    entry.expiryCause = cause;
    entry.end = now();
    assert(!entry.dispatched && !entry.sent);
  };
  const key = (r: Save) => r.account + "/" + r.subject;
  const predecessor = (r: Save) => owned.get(key(r)) ?? quarantined.get(key(r));
  const dequeue = (row: Save) => {
    const k = key(row);
    if (queuedTail.get(k) === row.id) queuedTail.delete(k);
  };

  function pump(account: number) {
    const q = queues[account]!,
      sender = scopes[account]!;
    while (q[0] && now() >= q[0].row.due + expiryMs) {
      const { row } = q.shift()!;
      dequeue(row);
      const k = key(row);
      if (capture) row.predecessor ??= predecessor(row);
      const cause = quarantined.has(k)
        ? "unresolved-predecessor"
        : owned.has(k)
          ? "same-subject"
          : active[account]! >= maxInflight
            ? "in-flight-limit"
            : "dispatch";
      expire(row, cause);
    }
    while (active[account]! < maxInflight && q.length) {
      const next = q.findIndex((x) => !owned.has(key(x.row)) && !quarantined.has(key(x.row)));
      if (next < 0) break;
      const { e, row } = q.splice(next, 1)[0]!;
      dequeue(row);
      if (now() >= row.due + expiryMs) {
        expire(row, "dispatch");
        continue;
      }
      // [DX-INT1] Why: bind the identity block to this offered save through settling or recovering it.
      // Rejected: minting a new block while looking up an uncertain receipt.
      if (orderedIds) row.orderedToken = orderedSaveIdentity().token;
      const prior = sender.rows.get(task(row.account, row.subject))!;
      const candidate = expectedSave(row, e, prior);
      if (orderedIds) candidate.input.sourceK = Math.max(sender.scope.cut, ...prior.map((field) => field.recorded_position));
      owned.set(key(row), row.id);
      active[account]!++;
      row.dispatched = now();
      row.status = "pending";
      inFlightSends.set(row.id, row);
      let p: Promise<void>;
      p = sender.client
        .transact(row.db, candidate.input)
        .then((value) => {
          row.end = now();
          assert(row.sent !== undefined, "Acknowledged write has no matching socket sample");
          const raw = value as Ack;
          bind(row, raw, candidate);
          const old = sender.rows.get(candidate.entity)!;
          for (let i = 0; i < e.width; i++) {
            old[i] = {
              ...candidate.input.rows[i]!,
              recorded_at: row.receipt!.clock,
              recorded_position: row.receipt!.p,
            };
          }
          row.status = "acked";
        })
        .catch((error) => {
          row.end = now();
          row.error = String(error);
          if (error instanceof DatomicHttpError && error.code === "WriteBudgetExceeded") {
            row.status = "refused";
            return;
          }
          row.status = "uncertain";
          unresolved.set(row, candidate);
          quarantined.set(key(row), row.id);
        })
        .finally(() => {
          inFlightSends.delete(row.id);
          owned.delete(key(row));
          active[account]!--;
          pending.delete(p);
          pump(account);
        });
      pending.add(p);
    }
  }

  // [DX-SCALE1] Why: record the actual socket flush for successful requests, with a bounded map of active operations. Rejected: using the publication callback's error and finally notifications as packet timestamps.
  for (const s of scopes) {
    s.client.onRequest = observe;
    if (capture) s.client.onRequestFailure = observe;
  }
  try {
    // Ten clients with the same per-account request cap serve either placement.
    for (const e of tape) {
      const due = start + e.ms;
      while (now() < due) await sleep(Math.ceil(due - now()));
      const q = queues[e.account]!,
        scope = scopes[e.account]!.scope;
      const row: Save = {
        id: operationId(nonce, e.version),
        account: e.account,
        subject: e.subject,
        ordinal: e.ordinal,
        width: e.width,
        db: scope.db,
        due,
        enqueued: now(),
        queued: q.length,
        pending: active[e.account],
        status: "offered",
      };
      if (capture) row.predecessor = queuedTail.get(key(row)) ?? predecessor(row);
      rows.push(row);
      if (row.enqueued >= due + expiryMs) expire(row, "timer");
      else {
        if (capture) queuedTail.set(key(row), row.id);
        q.push({ e, row });
        pump(e.account);
      }
    }
    while (pending.size || queues.some((q) => q.length)) {
      for (const a of scopes.keys()) pump(a);
      await Promise.race([...pending, sleep(25)]);
    }
    return { rows, unresolved };
  } finally {
    for (const s of scopes) {
      delete s.client.onRequest;
      if (capture) delete s.client.onRequestFailure;
    }
  }
}

export async function resolveUncertain(
  senders: Sender[],
  outstanding: Awaited<ReturnType<typeof play>>["unresolved"],
) {
  for (const [o, candidate] of outstanding) {
    const client = senders[o.account]!.client;
    const receipt = await client.operation(o.db, o.id);
    if (receipt.status !== "committed" || !receipt.position || !receipt.t || !receipt.recordedAt)
      continue;
    const p = Number(receipt.position.v);
    assert.equal(receipt.operationId, o.id);
    assert.equal(await client.claim(o.db, o.id, p), candidate.input.claims[0]!.txId);
    bind(
      o,
      {
        ...receipt,
        requestBytes: 0,
        preparedOps: 0,
        operationId: o.id,
        position: { v: String(p) },
        t: { v: String(receipt.t.v) },
        recordedAt: { v: Number(receipt.recordedAt.v) },
      },
      candidate,
    );
    o.status = "recovered";
    const old = senders[o.account]!.rows.get(candidate.entity)!;
    for (let i = 0; i < o.width; i++) {
      old[i] = {
        ...candidate.input.rows[i]!,
        recorded_at: o.receipt!.clock,
        recorded_position: o.receipt!.p,
      };
    }
  }
}
