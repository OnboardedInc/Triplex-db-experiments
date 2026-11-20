import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import {
  activeSubjects,
  expiryMs,
  field,
  keyFor,
  maxInflight,
  sha,
  task,
  type Density,
  type Write,
} from "./plan.ts";
import { now, type Scope } from "./observer.ts";

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
    ...command(o.id, facts, old),
    live: old.map((r) => r.id),
    groupAccount: keyFor(o.account),
    writeClass: "live" as const,
  };
  const digest = sha(
    [
      ...facts.map((f, i) => ["assert", f.e, f.a, input.rows[i]!.id, f.v]),
      ...old.map((r) => ["retract", r.entity_id, r.attribute, r.id, null]),
    ].sort(),
  );
  return { input, digest, entity };
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
    digest: candidate.digest,
    size: a.groupSize ?? 1,
  };
  const { operationId: _id, position: _p, t: _t, recordedAt: _c, ...stage } = a;
  o.stage = stage;
}

// [DX-SCALE1] Why: all tapes are open-loop, and a start deadline is evaluated before allocating the gateway request. Rejected: a single closed promise chain or counting an upstream expiration as a native commit limit.
export async function play(scopes: Sender[], tape: Write[], start: number, nonce: string) {
  const queues = scopes.map(() => [] as { e: Write; row: Save }[]),
    active = scopes.map(() => 0),
    owned = new Set<string>(),
    pending = new Set<Promise<void>>(),
    rows: Save[] = [];
  const quarantined = new Set<string>();
  const unresolved = new Map<Save, ReturnType<typeof expectedSave>>();
  const expire = (entry: Save) => {
    entry.status = "expired-before-dispatch";
    entry.end = now();
    assert(!entry.dispatched && !entry.sent);
  };
  const key = (r: Save) => r.account + "/" + r.subject;

  function pump(account: number) {
    const q = queues[account]!,
      sender = scopes[account]!;
    while (active[account]! < maxInflight && q.length) {
      const next = q.findIndex(
        (x) =>
          (!owned.has(key(x.row)) && !quarantined.has(key(x.row))) || now() >= x.row.due + expiryMs,
      );
      if (next < 0) break;
      const { e, row } = q.splice(next, 1)[0]!;
      if (now() >= row.due + expiryMs) {
        if (quarantined.has(key(row))) row.error = "prior save has uncertain disposition";
        expire(row);
        continue;
      }
      const candidate = expectedSave(row, e, sender.rows.get(task(row.account, row.subject))!);
      owned.add(key(row));
      active[account]!++;
      row.dispatched = now();
      row.status = "pending";
      let p: Promise<void>;
      p = sender.client
        .transact(row.db, candidate.input, () => {
          row.sent ??= now();
        })
        .then((value) => {
          row.end = now();
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
          quarantined.add(key(row));
        })
        .finally(() => {
          owned.delete(key(row));
          active[account]!--;
          pending.delete(p);
          pump(account);
        });
      pending.add(p);
    }
  }

  // Each account has its own bound even when all ten use one database. The same
  // ten clients and same total outstanding cap are used in the 5+5 placement.
  for (const e of tape) {
    const due = start + e.ms;
    while (now() < due) await sleep(Math.ceil(due - now()));
    const q = queues[e.account]!,
      scope = scopes[e.account]!.scope;
    const row: Save = {
      id: nonce + "/" + e.version,
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
    rows.push(row);
    if (row.enqueued >= due + expiryMs) expire(row);
    else {
      q.push({ e, row });
      pump(e.account);
    }
  }
  while (pending.size || queues.some((q) => q.length)) {
    for (const a of scopes.keys()) pump(a);
    await Promise.race([...pending, sleep(25)]);
  }
  return { rows, unresolved };
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
