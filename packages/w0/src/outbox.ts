/**
 * The outbox `publish` (SPEC 8.8) and the work-item receiver `receive` (SPEC 8.9).
 *
 * Payloads are carried as their canonical JSON text: SPEC 8.8 compares `canonicalJson(W.payload)` with
 * `canonicalJson(I.payload)`, never the version (SPEC 14 row 37). Positions and sequences are bigints: these two operations
 * check kinds only, not ranges (SPEC 4.4 step 1, RULINGS Q44a), so a `tx` or a `seq + 1` can pass 2^53 - 1.
 */
import { cmpCodePoints, quote } from "./json.js";
import type { Output } from "./kernel.js";

export interface RecordBasis {
  readonly tx: bigint;
  readonly validTime: string;
}

/** SPEC 8.8 delivery `{id, key, kind, payload, rule, seq, subject, version}`; its key is `(id, seq)`. */
export interface Delivery {
  readonly id: string;
  readonly key: string;
  readonly kind: string;
  readonly payload: string;
  readonly rule: string;
  readonly seq: bigint;
  readonly subject: string;
  readonly version: string;
}

export interface ItemState {
  readonly id: string;
  readonly payload: string;
  readonly retired: boolean;
  readonly seq: bigint;
  readonly subject: string;
}

export interface SubjectState {
  readonly basis: RecordBasis;
  readonly subject: string;
}

export interface OutboxState {
  readonly items: readonly ItemState[];
  readonly pending: readonly Delivery[];
  readonly subjects: readonly SubjectState[];
}

export const EMPTY_OUTBOX: OutboxState = { items: [], pending: [], subjects: [] };

export interface RecordWorkItem {
  readonly id: string;
  readonly key: string;
  readonly kind: string;
  readonly payload: string;
  readonly rule: string;
  readonly version: string;
}

/** SPEC 8.8 evaluation record: the `basis`, `release`, `subject` and `workItems` of one live `reconcile` output. */
export interface EvaluationRecord {
  readonly basis: RecordBasis;
  readonly release: string;
  readonly subject: string;
  readonly workItems: readonly RecordWorkItem[];
}

/** The evaluation record of an output, for `publish`. Only live reconciles may be published (SPEC 8.8, RULINGS Q44c). */
export function recordOf(o: Output): EvaluationRecord {
  return {
    basis: { tx: BigInt(o.basis.tx), validTime: o.basis.validTime },
    release: o.release,
    subject: o.subject,
    workItems: o.workItems,
  };
}

const byId = <X extends { readonly id: string }>(a: X, b: X): number => cmpCodePoints(a.id, b.id);

/**
 * SPEC 8.8 `publish(state, evaluations)`. Input states are indexed by id and by subject, a later entry replacing an earlier
 * one; the output's `items` and `subjects` are re-sorted, and `pending` keeps its input order with new deliveries appended
 * (Q53 reading A08).
 */
export function publish(
  state: OutboxState,
  records: readonly EvaluationRecord[],
): { deliveries: Delivery[]; state: OutboxState } {
  const items = new Map<string, ItemState>();
  const bySubject = new Map<string, Set<string>>();
  const setItem = (it: ItemState): void => {
    const old = items.get(it.id);
    if (old !== undefined && old.subject !== it.subject) bySubject.get(old.subject)?.delete(it.id);
    items.set(it.id, it);
    let ids = bySubject.get(it.subject);
    if (ids === undefined) bySubject.set(it.subject, (ids = new Set()));
    ids.add(it.id);
  };
  for (const it of state.items) setItem(it);
  const subjects = new Map<string, RecordBasis>();
  for (const s of state.subjects) subjects.set(s.subject, s.basis);
  const pending = [...state.pending];
  const deliveries: Delivery[] = [];

  for (const r of records) {
    // 1. Basis order (RULINGS Q40d): skip a record older than the subject's stored basis (tx first, then validTime). An equal
    //    basis is not older (case C75, SPEC 14 row 40). The guard advances on every applied record (case C82, RULINGS Q42c).
    const A = subjects.get(r.subject);
    if (
      A !== undefined &&
      (r.basis.tx < A.tx ||
        (r.basis.tx === A.tx && cmpCodePoints(r.basis.validTime, A.validTime) < 0))
    )
      continue;
    subjects.set(r.subject, r.basis);
    // 2. Publication in id order. A duplicate id within one record is processed in stable id order, the second compared with
    //    the state the first set (Q53 reading A09).
    const ws = [...r.workItems].sort(byId);
    const present = new Set<string>();
    for (const W of ws) {
      present.add(W.id);
      const I = items.get(W.id);
      let seq: bigint | null = null;
      if (I === undefined) seq = 1n;
      else if (I.retired)
        seq = I.seq + 1n; // RULINGS Q40h: even when the payload equals I's (case C78)
      else if (W.payload !== I.payload) seq = I.seq + 1n;
      if (seq === null) continue;
      // The delivery's subject comes from the record (RULINGS Q44c).
      const d: Delivery = {
        id: W.id,
        key: W.key,
        kind: W.kind,
        payload: W.payload,
        rule: W.rule,
        seq,
        subject: r.subject,
        version: W.version,
      };
      deliveries.push(d);
      pending.push(d);
      setItem({ id: W.id, payload: W.payload, retired: false, seq, subject: r.subject });
    }
    // 3. Retirement (RULINGS Q40h): this subject's live items that the record does not carry; seq and payload stay.
    const mine = bySubject.get(r.subject);
    if (mine !== undefined)
      for (const id of mine) {
        const I = items.get(id)!;
        if (!I.retired && !present.has(id)) items.set(id, { ...I, retired: true });
      }
  }

  return {
    deliveries,
    state: {
      items: [...items.values()].sort(byId),
      pending,
      subjects: [...subjects.entries()]
        .map(([subject, basis]) => ({ basis, subject }))
        .sort((a, b) => cmpCodePoints(a.subject, b.subject)),
    },
  };
}

export interface EffectState {
  readonly done: bigint;
  readonly id: string;
  readonly waiting: readonly Delivery[];
}

export interface ProjectionEntry {
  readonly id: string;
  readonly payload: string;
  readonly seq: bigint;
}

export interface ReceiverState {
  readonly effects: readonly EffectState[];
  readonly projection: readonly ProjectionEntry[];
}

export const EMPTY_RECEIVER: ReceiverState = { effects: [], projection: [] };

const bySeq = (a: Delivery, b: Delivery): number => (a.seq < b.seq ? -1 : a.seq > b.seq ? 1 : 0);

/**
 * SPEC 8.9 `receive(state, deliveries)`. Deliveries are taken in array order; for each, the projection step runs, then the
 * effects step (SPEC 14 row 44). Input states are indexed by id, a later entry replacing an earlier one; output arrays are
 * re-sorted (`effects` and `projection` by id, `waiting` by seq, stably) (Q53 reading A08).
 */
export function receive(
  state: ReceiverState,
  deliveries: readonly Delivery[],
): { applied: { effects: Delivery[]; projection: Delivery[] }; state: ReceiverState } {
  const projection = new Map<string, ProjectionEntry>();
  for (const p of state.projection) projection.set(p.id, p);
  const effects = new Map<string, { done: bigint; id: string; waiting: Delivery[] }>();
  for (const e of state.effects)
    effects.set(e.id, { done: e.done, id: e.id, waiting: [...e.waiting].sort(bySeq) });
  const appliedProjection: Delivery[] = [];
  const appliedEffects: Delivery[] = [];

  for (const d of deliveries) {
    // Projection: apply only a higher seq than the projection's, or a new id; never regress (case C79).
    const P = projection.get(d.id);
    if (P === undefined || d.seq > P.seq) {
      projection.set(d.id, { id: d.id, payload: d.payload, seq: d.seq });
      appliedProjection.push(d);
    }
    // Effects: every transition in order. An id starts at done 0.
    let E = effects.get(d.id);
    if (E === undefined) effects.set(d.id, (E = { done: 0n, id: d.id, waiting: [] }));
    // A seq at or below done, or already waiting, is a duplicate by (id, seq) (case C83).
    if (d.seq <= E.done || E.waiting.some((w) => w.seq === d.seq)) continue;
    if (d.seq === E.done + 1n) {
      appliedEffects.push(d);
      E.done = d.seq;
      // then any waiting delivery whose seq is the next one, repeatedly (cases C80, C81)
      for (;;) {
        const k = E.waiting.findIndex((w) => w.seq === E!.done + 1n);
        if (k < 0) break;
        const next = E.waiting.splice(k, 1)[0]!;
        appliedEffects.push(next);
        E.done = next.seq;
      }
    } else {
      // further ahead: wait; nothing past a gap is processed until the missing seq arrives
      E.waiting.push(d);
      E.waiting.sort(bySeq);
    }
  }

  return {
    applied: { effects: appliedEffects, projection: appliedProjection },
    state: {
      effects: [...effects.values()].sort(byId),
      projection: [...projection.values()].sort(byId),
    },
  };
}

// ---- SPEC 9 canonical JSON of the two results ----

export const deliveryJson = (d: Delivery): string =>
  '{"id":' +
  quote(d.id) +
  ',"key":' +
  quote(d.key) +
  ',"kind":' +
  quote(d.kind) +
  ',"payload":' +
  d.payload +
  ',"rule":' +
  quote(d.rule) +
  ',"seq":' +
  d.seq.toString() +
  ',"subject":' +
  quote(d.subject) +
  ',"version":' +
  quote(d.version) +
  "}";

const list = <X>(xs: readonly X[], f: (x: X) => string): string => "[" + xs.map(f).join(",") + "]";

export function publishJson(r: { deliveries: readonly Delivery[]; state: OutboxState }): string {
  const s = r.state;
  return (
    '{"deliveries":' +
    list(r.deliveries, deliveryJson) +
    ',"state":{"items":' +
    list(
      s.items,
      (i) =>
        '{"id":' +
        quote(i.id) +
        ',"payload":' +
        i.payload +
        ',"retired":' +
        (i.retired ? "true" : "false") +
        ',"seq":' +
        i.seq.toString() +
        ',"subject":' +
        quote(i.subject) +
        "}",
    ) +
    ',"pending":' +
    list(s.pending, deliveryJson) +
    ',"subjects":' +
    list(
      s.subjects,
      (x) =>
        '{"basis":{"tx":' +
        x.basis.tx.toString() +
        ',"validTime":' +
        quote(x.basis.validTime) +
        '},"subject":' +
        quote(x.subject) +
        "}",
    ) +
    "}}"
  );
}

export function receiveJson(r: {
  applied: { effects: readonly Delivery[]; projection: readonly Delivery[] };
  state: ReceiverState;
}): string {
  return (
    '{"applied":{"effects":' +
    list(r.applied.effects, deliveryJson) +
    ',"projection":' +
    list(r.applied.projection, deliveryJson) +
    '},"state":{"effects":' +
    list(
      r.state.effects,
      (e) =>
        '{"done":' +
        e.done.toString() +
        ',"id":' +
        quote(e.id) +
        ',"waiting":' +
        list(e.waiting, deliveryJson) +
        "}",
    ) +
    ',"projection":' +
    list(
      r.state.projection,
      (p) =>
        '{"id":' + quote(p.id) + ',"payload":' + p.payload + ',"seq":' + p.seq.toString() + "}",
    ) +
    "}}"
  );
}
