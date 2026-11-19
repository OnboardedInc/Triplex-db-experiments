import assert from "node:assert/strict";
import {
  canonical,
  sha256,
  W0,
  worldOf,
  reachableRows,
  type WorldRow,
} from "../../../bench/lib/w0-world.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import { Conflict, CURSOR, fact, millis, value, type Controls, type Store } from "./store.ts";

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
  return subjects.map((s) => worldOf(s, reachableRows([s], rows, by)));
}
export function evaluate(
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
  const output = W0.reconcileWorld(world, activations, b);
  const json = W0.isFailure(output) ? canonical(output) : W0.outputJson(output);
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
export async function calculate(
  store: Store,
  format: Format,
  subject: string,
  b: Point,
  c: Controls,
  latest: Controls,
) {
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
) {
  assert(q.scope === store.scope && q.format === format, "Foreign live proposal");
  const p = await store.head();
  if (p !== q.basis.tx) return { status: "stale" } as const;
  const c = await store.controls(p);
  if (c.at !== q.basis.validTime) return { status: "stale" } as const;
  const evald = await calculate(store, format, q.subject, q.basis, c, c);
  assert.equal(evald.witness, q.witness, "Untrusted or changed computation");
  if (W0.isFailure(evald.output)) return { status: "error", error: evald.output.error } as const;
  if (progress(c).done < c.input || progress(c).open) return { status: "deferred" } as const;
  const { ops } = await changes(store, p, W0.recordOf(evald.output));
  if (beforeCommit) await beforeCommit();
  if (!ops.length) return { status: (await store.head()) === p ? "unchanged" : "stale" } as const;
  try {
    const r = await store.commit("lazy/live/" + q.witness, "lazy/live", ops, p, q);
    return { status: "accepted", receipt: r } as const;
  } catch (e) {
    if (e instanceof Conflict) return { status: "stale" } as const;
    throw e;
  }
}
