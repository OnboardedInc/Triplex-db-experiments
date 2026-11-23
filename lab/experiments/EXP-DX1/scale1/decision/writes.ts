import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DatomicClient, DatomicHttpError, orderedSaveIdentity,
} from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { admission, type Admission } from "../../prep1/rolling-credits.ts";
import { coldAdmission, startupAdmission } from "../../jvm1/cold-admission.mjs";
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
import { commitAssertions, isProduction, orderedBlockLimit } from "../../v01/production-card.ts";
import { slotAttribute } from "../../w1/field/production.ts";

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
    | "startup-refused"
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
  startupRefusal?: "rate" | "queue";
  predecessorReadMs?: number;
  pending?: number;
  queued?: number;
  // [DX-INT1] A production-shaped commit (v01/production-card.ts): its save, form rows, facts, retired values, and
  // whether it went out on the general identity because it carries more than 256 assertions.
  saveKey?: string;
  rows?: number;
  facts?: number;
  retired?: number;
  assertions?: number;
  generalIdentity?: boolean;
};

export type Sender = {
  client: DatomicClient;
  scope: Scope;
  rows: Map<string, Row[]>;
  loadPredecessor?: (entity: string) => Promise<Row[]>;
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

// [DX-INT1] Why: a production commit writes the fields its slots name; a slot past the subject's current fields is a
// first write (no retirement). Values are a pure function of the offer, so a recovered or resent commit is identical.
// Rejected: replacing the first `width` predecessors in order (true only for the card's own one- or two-field saves).
function productionSave(o: Save, e: Write & { slots: number[] }, prior: readonly Row[]) {
  const entity = e.owner ?? task(o.account, o.subject);
  const written = e.slots.map(slotAttribute);
  assert.equal(new Set(written).size, written.length);
  const old = prior.filter((r) => written.includes(r.attribute));
  assert(old.every((r) => r.entity_id === entity) && old.length === new Set(old.map((r) => r.attribute)).size);
  const facts: Fact[] = written.map((a, i) => ({ e: entity, a, v: { type: "string", value: sha([e.version, e.slots[i]]).slice(0, 57) } }));
  const input = {
    ...command(o.id, facts, old, true, false,
      o.orderedToken === undefined ? undefined : orderedSaveIdentity(o.orderedToken)),
    live: old.map((r) => r.id),
    groupAccount: keyFor(o.account),
    writeClass: "live" as const,
  };
  return { input, entity, written, facts: facts.length, retired: old.length };
}

export function expectedSave(o: Save, e: Write, prior: readonly Row[]) {
  if (isProduction(e)) return productionSave(o, e, prior);
  const entity = e.owner ?? task(o.account, o.subject);
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
  return { input, entity, written: undefined as string[] | undefined, facts: facts.length, retired: old.length };
}

// Records an acknowledged or recovered commit's new rows as the sender's current predecessors for its subject.
function settleRows(sender: Sender, candidate: ReturnType<typeof expectedSave>, width: number, p: number, clock: number) {
  const old = sender.rows.get(candidate.entity)!;
  if (candidate.written) {
    const written = new Set(candidate.written);
    sender.rows.set(candidate.entity, [...old.filter((r) => !written.has(r.attribute)),
      ...candidate.input.rows.slice(0, candidate.facts).map((r) => ({ ...r, recorded_at: clock, recorded_position: p }))]);
    return;
  }
  for (let i = 0; i < width; i++) old[i] = { ...candidate.input.rows[i]!, recorded_at: clock, recorded_position: p };
}

// [DX-SCALE1] Why: compare every logical field of the committed WFIX1 change records at the assigned clock. Rejected: proving only the retracted identity or ignoring the stored predecessor lifetime.
export function expectedJournal(candidate: { input: Pick<Input, "rows">; entity: string }, clock: number) {
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
export type FairImport = {
  limit: number;
  end: number;
  ready: () => boolean;
  send: (grant: { at: number; ticket: number; neighboursAhead?: number; liveQueued: number }) => Promise<void>;
  // [DX-LOAD2] Why: the serial writer cannot pre-empt a frame, so a frame admitted beside waiting live saves
  // adds its whole apply to each of them; at full size the queue behind slow post-adoption frames reached 450 ms.
  // Rejected: an equal turn for the importer whatever the live queue holds (rolling 6 busy p99 286 ms, 22x).
  yieldToLive?: boolean;
  yieldedChecks?: number;
};

// [DX-LOAD2] Why: live work first; the importer takes a credit only while no live save waits for one.
// Rejected: smaller or variable frames (they change command identities) and pauses keyed to index jobs.
export const importMayStart = (yieldToLive: boolean | undefined, liveQueued: number) =>
  !yieldToLive || liveQueued === 0;

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
  startup?: { ramp: boolean; stopped: () => boolean },
  bulk?: FairImport,
) {
  assert(!interleave || selection);
  // [DX-THIN1] Why: PREP1's fresh-first order (dropped after its server arm) lives only in its own producer.
  // Rejected: silently ignoring the option on the one branch's live sender.
  assert(!selection?.freshFirst, "Fresh-first admission is not available on this sender");
  const importingAccount = scopes.length;
  if (bulk) {
    assert(selection && Number.isInteger(bulk.limit) && bulk.limit > 0 && bulk.limit < selection.credits);
    assert((selection.quietAccount ?? 0) < importingAccount);
  }
  const fair = selection && admission(importingAccount + Number(!!bulk), bulk
    ? { ...selection, quietAccount: selection.quietAccount ?? 0 } : selection);
  let bulkActive = 0;
  let bulkFailed = false;
  let bulkError: unknown;
  const importReady = () => bulk && !bulkFailed && !admissionClosed && now() < bulk.end && bulk.ready();
  let bulkDue = start;
  let admissionClosed = false;
  const ramp = startup?.ramp === true;
  const admit = ramp ? startupAdmission() : undefined;
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
  function refuse(row: Save, reason: NonNullable<Save["startupRefusal"]>) {
    assert(!row.dispatched && !row.sent);
    row.status = "startup-refused";
    row.startupRefusal = reason;
    row.end = now();
  }
  const queueMs = ramp ? coldAdmission.queueMs : expiryMs;
  const key = (r: Save) => r.account + "/" + r.subject;
  const predecessor = (r: Save) => owned.get(key(r)) ?? quarantined.get(key(r));
  const dequeue = (row: Save) => {
    const k = key(row);
    if (queuedTail.get(k) === row.id) queuedTail.delete(k);
  };

  function expireQueue(account: number) {
    const q = queues[account]!;
    while (q[0] && now() >= q[0].row.due + queueMs) {
      const { row } = q.shift()!;
      dequeue(row);
      if (ramp) {
        refuse(row, "queue");
        continue;
      }
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
    if (now() >= row.due + queueMs) {
      if (ramp) refuse(row, "queue");
      else expire(row, "dispatch");
      fair?.resolved(true, ticket);
      return;
    }
    if (ticket !== undefined) row.fairTurn = ticket;
    if (neighboursAhead !== undefined) row.neighboursAhead = neighboursAhead;
    // [DX-INT1] Why: bind the identity block to this offered save through settling or recovering it.
    // Rejected: minting a new block while looking up an uncertain receipt.
    const entity = e.owner ?? task(row.account, row.subject);
    const cached = sender.rows.get(entity);
    if (isProduction(e)) {
      // [DX-INT1] Why: the ordered identity numbers a commit's assertions in one byte; a production commit over 256
      // assertions takes the general identity whole, as the product does for any commit of more than three facts.
      // Rejected: splitting a save into several commits, which the product does not do.
      assert(cached, "A production commit needs its subject's preloaded fields");
      const written = new Set(e.slots.map(slotAttribute));
      row.saveKey = e.saveKey; row.rows = e.rows; row.facts = e.slots.length;
      row.retired = cached.filter((r) => written.has(r.attribute)).length;
      row.assertions = commitAssertions(row.facts, row.retired);
      if (orderedIds && row.assertions > orderedBlockLimit) row.generalIdentity = true;
    }
    if (orderedIds && !row.generalIdentity) row.orderedToken = orderedSaveIdentity().token;
    assert(cached || sender.loadPredecessor, "Missing predecessor");
    function draft(prior: Row[]) {
      const value = expectedSave(row, e, prior);
      if (orderedIds) value.input.sourceK = Math.max(sender.scope.cut, ...prior.map((field) => field.recorded_position));
      return value;
    }
    let candidate = cached ? draft(cached) : undefined;
    owned.set(key(row), row.id);
    active[account]!++;
    row.dispatched = now();
    row.status = "pending";
    inFlightSends.set(row.id, row);
    const send = async (input: ReturnType<typeof expectedSave>["input"]) => {
      for (;;) {
        try {
          return await sender.client.transact(row.db, input);
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
    // [DX-JVM1] Why: a cold run fetches the exact predecessor only for an admitted save under its subject lock.
    // Rejected: a timed leg that starts after an all-subject cache fill.
    const submit = (input: ReturnType<typeof expectedSave>["input"]) =>
      waitForRemoval ? send(input) : sender.client.transact(row.db, input);
    const sent = candidate ? submit(candidate.input) : Promise.resolve().then(async () => {
      assert(sender.loadPredecessor, "Missing predecessor");
      const readStart = now();
      const prior = await sender.loadPredecessor(entity);
      row.predecessorReadMs = now() - readStart;
      sender.rows.set(entity, prior);
      candidate = draft(prior);
      return submit(candidate.input);
    });
    const p: Promise<void> = sent
      .then((value) => {
        assert(candidate);
        row.end = now();
        assert(row.sent !== undefined, "Acknowledged write has no matching socket sample");
        const raw = value as Ack;
        bind(row, raw, candidate);
        settleRows(sender, candidate, e.width, row.receipt!.p, row.receipt!.clock);
        row.status = "acked";
        interleave?.committed(row);
      })
      .catch((error) => {
        row.end = now();
        row.error = String(error);
        if (!candidate) {
          row.status = "refused";
          return;
        }
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
          const known = row.status === "acked" || row.status === "refused";
          if (!known) admissionClosed = true;
          fair.resolved(known, ticket);
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
        () => {
          const ready = scopes.flatMap((_, a) => {
            if (active[a]! >= maxInflight) return [];
            const index = next(a);
            return index < 0 ? [] : [{ account: a, index, due: queues[a]![index]!.row.due }];
          });
          if (bulk && bulkActive < bulk.limit && now() >= start && importReady()) {
            const liveQueued = queues.reduce((n, q) => n + q.length, 0);
            if (importMayStart(bulk.yieldToLive, liveQueued))
              ready.push({ account: importingAccount, index: 0, due: bulkDue });
            else bulk.yieldedChecks = (bulk.yieldedChecks ?? 0) + 1;
          }
          return ready;
        },
        (offer, ticket, neighboursAhead?: number) => {
          if (offer.account !== importingAccount) {
            dispatch(offer.account, offer.index, ticket, neighboursAhead);
            return;
          }
          // [DX-HA1] Why: settle imports in the same credit window and close ingress on ambiguity.
          // Rejected: an independent bulk window or returning the credit before durable acknowledgement.
          bulkActive++;
          const at = now();
          const liveQueued = queues.reduce((n, q) => n + q.length, 0);
          bulkDue = at;
          let known = false;
          const send = Promise.resolve().then(() => bulk!.send({ at, ticket, liveQueued,
            ...(neighboursAhead === undefined ? {} : { neighboursAhead }) }))
            .then(() => { known = true; }, (error) => {
              bulkFailed = true;
              bulkError = error;
            })
            .finally(() => {
              bulkActive--;
              pending.delete(send);
              fair.resolved(known, ticket);
              pump(account);
            });
          pending.add(send);
        },
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
      if (startup?.stopped()) break;
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
      if (admit && !admit(e.account, e.ms)) refuse(row, "rate");
      else if (ramp && row.enqueued >= due + queueMs) refuse(row, "queue");
      else if (row.enqueued >= due + expiryMs) expire(row, "timer");
      else {
        if (capture) queuedTail.set(key(row), row.id);
        q.push({ e, row });
        pump(e.account);
      }
    }
    while (pending.size || queues.some((q) => q.length) || importReady()) {
      for (const a of scopes.keys()) pump(a);
      await Promise.race([...pending, sleep(25)]);
    }
    if (bulkFailed) throw bulkError;
    assert(!startup?.stopped(), "Write window stopped before verification");
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
    settleRows(senders[o.account]!, candidate, o.width, o.receipt!.p, o.receipt!.clock);
  }
}
