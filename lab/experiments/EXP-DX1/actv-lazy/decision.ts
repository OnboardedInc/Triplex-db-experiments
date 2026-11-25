import { noteWorld } from "../../../bench/lib/derived-seal.ts";
import type { Dispatcher } from "./dispatch.ts";
import assert from "node:assert/strict";
import {
  canonical,
  sha256,
  W0,
  worldOf,
  reachableRows,
  type WorldRow,
} from "../../../bench/lib/w0-world.ts";
import { policyWorld, readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { ids, subjectOf } from "../../../bench/lib/world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import { CURSOR, fact, membership, millis, value, type Controls, type Store } from "./store.ts";
import { cachedRelease, loadRelease } from "./join/definitions.ts";

export type Format = "w0" | "act2-deep";
export type Point = { tx: number; validTime: string };
export const itemRoot = (subject: string) => "lazy/item/" + subject;
export const pendingRoot = (subject: string) => "lazy/pending/" + subject;
export const kernel = "W0-1.1.2/lazy-1";
export function winner(c: Controls, b: Point) {
  const active = c.releases
    .filter((r) => r.from <= b.validTime)
    .sort((a, b) =>
      a.from < b.from
        ? 1
        : a.from > b.from
          ? -1
          : b.tx - a.tx || (a.release < b.release ? 1 : a.release > b.release ? -1 : 0),
    );
  return active[0]?.id ?? null;
}
export const maskVersion = (c: Controls) => Math.max(0, ...c.masks.map((r) => r.position));
export function heldWorlds(rows: readonly WorldRow[], prefix: string, account: string, people: number[],
  basis: { position: number; validAt: number }) {
  const by = new Map(people.map((person) => [person, [] as WorldRow[]]));
  // [DX-ACT1] Why: normalize only after proving that all source entities and references belong to the selected account.
  // Rejected: dropping the namespace before checking isolation.
  const local = (raw: string) => {
    assert(raw.startsWith(prefix), "Foreign account in a pinned world");
    return raw.slice(prefix.length);
  };
  for (const row of rows) {
    const entityId = local(row.entityId), owner = subjectOf(entityId);
    const subject = owner === null ? undefined : by.get(owner);
    assert(subject, "Foreign subject in a pinned world");
    const value = row.value.type === "ref" ? { ...row.value, value: local(row.value.value) } : row.value;
    if (value.type === "ref") assert.equal(subjectOf(value.value), owner);
    subject.push({ ...row, entityId, value });
  }
  return people.map((i) => {
    const body = by.get(i)!;
    const root = body.filter((r) => r.entityId === ids.placement(i));
    assert.deepEqual(root.filter((r) => r.attribute === ":subject/account").map((r) => r.value.value), [account]);
    assert.deepEqual(root.filter((r) => r.attribute === ":subject/member").map((r) => r.value.value), [String(i)]);
    // [DX-ERA4] TX2_DERIVED_SEAL=1: the rows this world was built from (a derived record names them).
    return noteWorld(policyWorld(i, body, basis), body);
  });
}
export async function worldsAt(store: Store, format: Format, subjects: string[], b: Point) {
  assert(
    subjects.length <= 64 &&
      subjects.every((s) => s.startsWith("pl:")) &&
      W0.isInstant(b.validTime) &&
      Number.isSafeInteger(b.tx) &&
      b.tx >= 0,
  );
  if (!subjects.length) return [];
  if (format === "act2-deep") {
    assert(subjects.every((s) => /^pl:s[0-9]{8}$/.test(s)));
    if (store.held) {
      const { prefix, account, people } = store.held;
      const members = subjects.map((s) => Number(s.slice(4)));
      assert(members.every((i) => i < people) && new Set(members).size === members.length);
      const rows = await store.rows(members.map((i) => prefix + ids.placement(i)), b.tx, b.validTime);
      return heldWorlds(rows, prefix, account, members, { position: b.tx, validAt: millis(b.validTime) });
    }
    return readDeepWorlds(
      store.comp,
      subjects.map((s) => Number(s.slice(4))),
      { position: b.tx, validAt: millis(b.validTime) },
    );
  }
  const rows = await store.rows(subjects, b.tx, b.validTime),
    by = new Map<string, WorldRow[]>();
  for (const r of rows) {
    const list = by.get(r.entityId) ?? [];
    list.push(r);
    by.set(r.entityId, list);
  }
  return subjects.map((s) => {
    const used = reachableRows([s], rows, by);
    return noteWorld(worldOf(s, used), used);
  });
}
export function render(
  store: Store,
  format: Format,
  world: W0.World,
  b: Point,
  c: Controls,
  latest: Controls,
) {
  assert.equal(store.profile, format);
  const subject = world.subject;
  const redacted = new Map(
    latest.masks.map((m) => {
      const e = value(m);
      return [canonical([e.subject, e.attribute]), e.at] as const;
    }),
  );
  if (redacted.size)
    world = {
      ...world,
      facts: world.facts.map((f) => {
        const at = redacted.get(canonical([f.e, f.a]));
        return at ? { ...f, v: { erasedAt: at } } : f;
      }),
    };
  const activations = c.releases.map((r) => ({ from: r.from, tx: r.tx, release: r.release }));
  const w = c.releases.find((r) => r.id === winner(c, b));
  let output;
  if (w?.joined && (w.document || w.documentRef) && !W0.RELEASES_BY_HASH.has(w.release)) {
    // [DX-ACT6] A release by reference evaluates the compiled release loaded by `prefetchWinner` (checked by hash).
    const custom = w.documentRef ? cachedRelease(w.release) : W0.compileRelease(w.document);
    assert(custom, "Release definitions were not loaded before evaluation");
    assert.equal(custom.hash, w.release, "Unbound release document");
    output = W0.evaluateWorld(world, custom, b);
  } else output = W0.reconcileWorld(world, activations, b);
  const json = W0.isFailure(output) ? canonical(output) : W0.outputJson(output);
  return { output, json, world };
}
export function evaluate(
  store: Store,
  format: Format,
  input: W0.World,
  b: Point,
  c: Controls,
  latest: Controls,
) {
  const { output, json, world } = render(store, format, input, b, c, latest),
    subject = world.subject;
  return {
    output,
    json,
    witness: sha256(
      canonical([
        store.scope,
        c.generation,
        format,
        kernel,
        subject,
        b,
        winner(c, b),
        maskVersion(latest),
        sha256(canonical(world)),
        sha256(json),
      ]),
    ),
  };
}
/** [DX-ACT6] Loads (once per process, by hash) the definitions of the release that wins at `b` when it is stored by
 * reference; nothing for full documents. */
export async function prefetchWinner(store: Store, c: Controls, b: Point) {
  const w = c.releases.find((r) => r.id === winner(c, b));
  if (w?.documentRef && !cachedRelease(w.release)) await loadRelease(store, w.documentRef, w.tx);
}
export async function calculate(
  store: Store,
  format: Format,
  subject: string,
  b: Point,
  c: Controls,
  latest: Controls,
) {
  await prefetchWinner(store, c, b);
  const [world] = await worldsAt(store, format, [subject], b);
  return evaluate(store, format, world!, b, c, latest);
}
export type Proposal = {
  scope: string;
  format: Format;
  subject: string;
  basis: Point;
  witness: string;
};
export async function propose(store: Store, format: Format, subject: string): Promise<Proposal> {
  const tx = await store.head(),
    c = await store.controls(tx),
    basis = { tx, validTime: c.at };
  const v = await calculate(store, format, subject, basis, c, c);
  return { scope: store.scope, format, subject, basis, witness: v.witness };
}
export const progress = (c: Controls) => (c.cursor ? value(c.cursor) : { done: 0 });
export function cursorOps(c: Controls, next: unknown) {
  return [
    ...(c.cursor ? [{ op: "retract", id: c.cursor.id }] : []),
    fact(CURSOR, "lazy/cursor", next),
  ];
}
export async function changes(store: Store, p: number, record: W0.EvaluationRecord) {
  const root = itemRoot(record.subject),
    rows = await store.rows([root], p);
  return itemChanges(rows, record);
}
export function itemChanges(rows: readonly WorldRow[], record: W0.EvaluationRecord) {
  const root = itemRoot(record.subject);
  assert(rows.length <= 1);
  const items: W0.ItemState[] = rows.length ? parseOutbox(rows[0]!.value.value) : [];
  const result = W0.publish({ items, pending: [], subjects: [] }, [record]);
  const ops: any[] = [];
  if (canonical(items) !== canonical(result.state.items)) {
    if (rows.length) ops.push({ op: "retract", id: rows[0]!.id });
    ops.push(fact(root, "lazy/items", result.state.items));
    for (const d of result.deliveries)
      ops.push(fact(pendingRoot(record.subject), "lazy/delivery", d));
  }
  return { ops, deliveries: result.deliveries };
}
export async function admitLive(
  store: Store,
  format: Format,
  q: Proposal,
  beforeCommit?: () => Promise<void>,
  dispatcher?: Dispatcher,
) {
  assert(q.scope === store.scope && q.format === format, "Foreign live proposal");
  const current = await store.head(),
    p = q.basis.tx,
    id = "lazy/live/" + q.witness;
  const claimed = await store.lookup(id);
  if (current !== p && !claimed) return { status: "stale" } as const;
  if (claimed) {
    assert(claimed.actor === "lazy/event" && claimed.commandId === id);
    assert.deepEqual(JSON.parse(claimed.correlationId).context.ordinary, q);
  }
  const c = await store.controls(p);
  if (c.at !== q.basis.validTime) return { status: "stale" } as const;
  const latest = current === p ? c : await store.controls(current);
  if (claimed && maskVersion(c) !== maskVersion(latest))
    return { status: "redacted-receipt", txId: claimed.txId, position: claimed.position } as const;
  const members = await store.rows([membership(q.subject)], p);
  if (!members.length) return { status: "outside-roster" } as const;
  assert(
    members.length === 1 && value(members[0]!).subject === q.subject,
    "Ambiguous native membership",
  );
  const evald = await calculate(store, format, q.subject, q.basis, c, latest);
  assert.equal(evald.witness, q.witness, "Untrusted or changed computation");
  if (W0.isFailure(evald.output)) return { status: "error", error: evald.output.error } as const;
  if (claimed) {
    assert(
      claimed.changes.some(
        (row: any) => row.op === "assert" && row.entityId === itemRoot(q.subject),
      ),
    );
    return { status: "accepted", receipt: claimed } as const;
  }
  if (!c.cursor || !(await store.cursorReceipt(c.cursor)) || progress(c).open)
    return { status: "deferred" } as const;
  if (progress(c).done !== c.input) {
    if (c.input !== p) return { status: "deferred" } as const;
    // [DX-ACT1] Why: a live worker may consume its own unclosed single-person event only through the same ordered plan and serialized cursor as the dispatcher. Rejected: trusting a caller-supplied paid-through position (an unpaid rollback could disappear).
    if (!dispatcher || dispatcher.store !== store || dispatcher.format !== format)
      return { status: "deferred" } as const;
    const event = await dispatcher.step(undefined, { proposal: q, atFence: beforeCommit });
    if (event) return { status: "accepted", receipt: event.receipt } as const;
    return { status: (await store.head()) === p ? "deferred" : "stale" } as const;
  }
  if (!(await store.effectsClear(c.cursor.position, p))) return { status: "deferred" } as const;
  const { ops } = await changes(store, p, W0.recordOf(evald.output));
  assert(!ops.length, "Paid event prefix disagrees with current items");
  if (beforeCommit) await beforeCommit();
  return { status: (await store.head()) === p ? "unchanged" : "stale" } as const;
}
