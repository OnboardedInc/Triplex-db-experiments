import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DatomicClient, DatomicHttpError, orderedSaveIdentity,
} from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { admission, type Admission } from "../../prep1/rolling-credits.ts";
import {
  activeSubjects,
  expiryMs,
  field,
  keyFor,
  maxInflight,
  operationId,
  sha,
  task,
  type Density,
  type Write,
} from "./plan.ts";
import { journalHash, now, type Scope } from "./observer.ts";

type Input = Parameters<DatomicClient["transact"]>[1];
export type Row = Input["rows"][number];
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
  subjectAppendRetirement?: boolean;
  subjectOwnerHeadBytes?: number;
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
  fairTurn?: number;
  neighboursAhead?: number;
  creditReleased?: number;
  removalRetries?: number;
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

export function expectedSave(o: Save, e: Write, prior: readonly Row[]) {
  const entity = task(o.account, o.subject);
  const old = prior.slice(0, e.width);
  assert(old.length === e.width && old.every((r) => r.entity_id === entity));
  const facts: Fact[] = old.map((row, i) => ({
    e: entity,
    a: row.attribute,
    v: { type: "string", value: sha([e.version, i]).slice(0, 57) },
  }));
  const input = {
    ...command(o.id, facts, old, true, false,
      o.orderedToken === undefined ? undefined : orderedSaveIdentity(o.orderedToken)),
    live: old.map((r) => r.id),
    groupAccount: keyFor(o.account),
    writeClass: "live" as const,
  };
  return { input, entity };
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

export type PublishInterleave = {
  paused: boolean;
  drain?: () => Promise<void>;
  resume?: () => void;
  waiting?: () => number[];
  committed: (row: Save) => void;
};

// [DX-SCALE1] Why: all tapes are open-loop, and a start deadline is evaluated before allocating the gateway request. Rejected: a single closed promise chain or counting an upstream expiration as a native commit limit.
export async function play(
  scopes: Sender[],
  tape: Write[],
  start: number,
  nonce: string,
  capture = false,
  orderedIds = false,
  selection?: Admission,
  interleave?: PublishInterleave,
  waitForRemoval = false,
) {
  assert(!interleave || selection);
  const fair = selection && admission(scopes.length, selection);
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
      if (!waitForRemoval || save.sent === undefined) save.sent = performance.timeOrigin + response.written;
      if (capture && Number.isFinite(response.headers))
        save.responseHeaders = performance.timeOrigin + response.headers;
      if (capture && "gatewayTraceparent" in response && typeof response.gatewayTraceparent === "string")
        save.responseTrace = response.gatewayTraceparent;
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

  function expireQueue(account: number) {
    const q = queues[account]!;
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
  }

  const next = (account: number) => queues[account]!.findIndex(
    ({ row }) => !owned.has(key(row)) && !quarantined.has(key(row)),
  );

  function dispatch(account: number, index: number, ticket?: number, neighboursAhead?: number) {
    const sender = scopes[account]!;
    const { e, row } = queues[account]!.splice(index, 1)[0]!;
    dequeue(row);
    if (now() >= row.due + expiryMs) {
      expire(row, "dispatch");
      fair?.resolved(true, ticket);
      return;
    }
    if (ticket !== undefined) row.fairTurn = ticket;
    if (neighboursAhead !== undefined) row.neighboursAhead = neighboursAhead;
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
    const send = async () => {
      for (;;) {
        try {
          return await sender.client.transact(row.db, candidate.input);
        } catch (error) {
          // [DX-ERASE2] Why: a removal can temporarily close admission or invalidate an already submitted plan.
          // Rejected: dropping the queued save or allocating a new command identity.
          if (!(error instanceof DatomicHttpError) ||
              !["ErasureFrontierUnavailable", "CasConflict"].includes(error.code ?? "") ||
              now() >= row.due + 15_000) throw error;
          row.removalRetries = (row.removalRetries ?? 0) + 1;
          await sleep(5);
        }
      }
    };
    let p: Promise<void>;
    p = (waitForRemoval ? send() : sender.client.transact(row.db, candidate.input))
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
        interleave?.committed(row);
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
        if (fair) {
          row.creditReleased = now();
          fair.resolved(row.status === "acked" || row.status === "refused", ticket);
        }
        pump(account);
      });
    pending.add(p);
  }

  function pump(account: number) {
    if (fair) {
      for (const a of scopes.keys()) expireQueue(a);
      // [DX-ACT1] Why: allow the receipt to take the next turn with one exact shared source cut.
      // Rejected: stopping the independent arrival clock or granting further credits during the handoff.
      if (interleave?.paused) return;
      fair.dispatch(
        () => scopes.flatMap((_, a) => {
          if (active[a]! >= maxInflight) return [];
          const index = next(a);
          return index < 0 ? [] : [{ account: a, index, due: queues[a]![index]!.row.due }];
        }),
        (save, ticket, neighboursAhead?: number) => dispatch(save.account, save.index, ticket, neighboursAhead),
      );
      return;
    }
    expireQueue(account);
    while (active[account]! < maxInflight) {
      const index = next(account);
      if (index < 0) return;
      dispatch(account, index);
    }
  }

  if (interleave) {
    interleave.drain = async () => {
      assert(interleave.paused);
      await Promise.all([...pending]);
      assert.equal(pending.size, 0);
    };
    interleave.resume = () => pump(0);
    interleave.waiting = () => queues.map((q) => q.length);
  }

  // [DX-SCALE1] Why: record the actual socket flush for successful requests, with a bounded map of active operations. Rejected: using the publication callback's error and finally notifications as packet timestamps.
  const diagnosticClient = (c: DatomicClient) => c as DatomicClient & { onRequestFailure?: typeof observe };
  for (const s of scopes) {
    s.client.onRequest = observe;
    if (capture) diagnosticClient(s.client).onRequestFailure = observe;
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
      if (capture) delete diagnosticClient(s.client).onRequestFailure;
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
