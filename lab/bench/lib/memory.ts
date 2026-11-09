/**
 * In-process reference composition `memory` (diagnostic only; never a measured lane).
 *
 * [EXP-N01] Why: the driver's end-to-end path (seed, trace, readers, feed, analysis, oracle sample) must be
 * checkable without an engine slot, which are often all held. This store follows the documented public
 * semantics the driver relies on: atomic transact with commandId claims and TripleLive preconditions,
 * reads at {recordedAt, validAt} (an assertion is visible when recordedAt <= R, not retracted at or before
 * R, and validFrom <= V < validTo), and an ordered journal for transactions({ after }).
 * State lives in one SharedArrayBuffer-free process: worker threads get their own empty store, so the
 * driver refuses `memory` with reader threads unless --reader-threads 0 is impossible; instead each
 * opening in the process shares one module-level store, and workers reach it through the main thread.
 * Simplest honest rule: `memory` is valid only when every opening is in the same thread, so the driver
 * runs it with readers in the main thread (see driver: composition "memory" forces in-thread readers).
 */
import { requirePosition, visibleRows, type WorldRow } from "./w0-world.ts";
import type { CompositionHandle, Outcome, PullResult, Receipt } from "./composition.ts";

interface Fact { id: string; entityId: string; attribute: string; value: any; validFrom: number; validTo?: number; recordedAt: number; position: number; retractedAt?: number; retractedPosition?: number; txId: string }
const stores = new Map<string, { facts: Map<string, Fact>; byEntity: Map<string, Fact[]>; journal: any[]; claims: Map<string, any>; position: number; idSeq: number; lastInstant: number }>();

export function memoryComposition(lane: "xtdb" | "qlever", scope: string, serviceMs = 0): CompositionHandle {
  const st = stores.get(scope) ?? stores.set(scope, { facts: new Map(), byEntity: new Map(), journal: [], claims: new Map(), position: 0, idSeq: 0, lastInstant: 0 }).get(scope)!;
  const delay = () => (serviceMs ? new Promise((r) => setTimeout(r, serviceMs)) : Promise.resolve());
  const fail = (tag: string, extra: any = {}): Outcome<any> => ({ ok: false, tag, error: { _tag: tag, ...extra, message: tag } });
  const visible = (f: Fact, R: number, V: number) => f.recordedAt <= R && !(f.retractedAt !== undefined && f.retractedAt <= R) && f.validFrom <= V && (f.validTo === undefined || V < f.validTo);
  const transact = async (operations: readonly any[], meta: any): Promise<Outcome<Receipt>> => {
    await delay();
    if (meta?.commandId && st.claims.has(meta.commandId)) return fail("CommandAlreadyCommittedError", { commandId: meta.commandId, transactionId: st.claims.get(meta.commandId).txId });
    for (const p of meta?.preconditions ?? []) {
      const f = st.facts.get(p.id);
      if (p._tag === "TripleLive" && (!f || f.retractedAt !== undefined)) return fail("TransactionConflictError", { tripleId: p.id });
    }
    const instant = Math.max(Date.now(), st.lastInstant + 1);
    st.lastInstant = instant;
    const position = ++st.position;
    const txId = `_tx/mem${position}`;
    const triples: Fact[] = [];
    const changes: any[] = [];
    for (const op of operations) {
      if (op.op === "retract") {
        const f = st.facts.get(op.id)!;
        f.retractedAt = instant; f.retractedPosition = position;
        changes.push({ op: "retract", tripleId: f.id, entityId: f.entityId, attribute: f.attribute, value: f.value, validFrom: f.validFrom, recordedAt: f.recordedAt, retractedAt: instant, assertionTxId: f.txId, retractionTxId: txId });
      } else {
        const f: Fact = { id: `m${(++st.idSeq).toString(36).padStart(8, "0")}`, entityId: op.entityId, attribute: op.attribute, value: op.value, validFrom: op.validFrom ?? instant, ...(op.validTo !== undefined ? { validTo: op.validTo } : {}), recordedAt: instant, position, txId };
        st.facts.set(f.id, f);
        (st.byEntity.get(f.entityId) ?? st.byEntity.set(f.entityId, []).get(f.entityId)!).push(f);
        triples.push(f);
        changes.push({ op: "assert", tripleId: f.id, entityId: f.entityId, attribute: f.attribute, value: f.value, validFrom: f.validFrom, ...(f.validTo !== undefined ? { validTo: f.validTo } : {}), recordedAt: instant });
      }
    }
    const record = { txId, position, instant, actor: meta?.actor, commandId: meta?.commandId, changes };
    st.journal.push(record);
    if (meta?.commandId) st.claims.set(meta.commandId, record);
    return { ok: true, value: { txId, position, instant, triples } };
  };
  const pull = async (root: string, basis: { recordedAt: number; validAt: number }, between?: () => Promise<void>): Promise<PullResult> => {
    const seen = new Set([root]);
    let frontier = [root];
    const triples: Fact[] = [];
    let roundTrips = 0;
    while (frontier.length) {
      await delay();
      roundTrips++;
      const level = frontier.flatMap((e) => (st.byEntity.get(e) ?? []).filter((f) => visible(f, basis.recordedAt, basis.validAt)));
      if (roundTrips === 1 && between) await between();
      const next: string[] = [];
      for (const t of level) {
        triples.push(t);
        if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); }
      }
      frontier = next;
    }
    return { triples, entities: seen.size, roundTrips, depth: roundTrips - 1, route: "source", language: "memory", waitedMs: 0 };
  };
  const one = { lane, role: "in-process reference store (diagnostic)" };
  const handle: CompositionHandle = {
    sweepPage: async (subjects, basis) => {
      requirePosition(basis, st.position);
      const head = st.position;
      const rows: WorldRow[] = [],
        seen = new Set(subjects);
      let roundTrips = 0;
      let frontier = [...subjects];
      while (frontier.length) {
        roundTrips++;
        const level = visibleRows(
          frontier.flatMap((e) => (st.byEntity.get(e) ?? []).map((f) => ({ ...f }))),
          basis,
        );
        rows.push(...level);
        const next: string[] = [];
        for (const r of level)
          if (r.value.type === "ref" && !seen.has(r.value.value)) {
            seen.add(r.value.value);
            next.push(r.value.value);
          }
        frontier = next;
      }
      return { rows, position: head, epoch: `memory:${scope}`, roundTrips };
    },
    storeCounts: async () => ({
      position: st.position,
      assertions: st.facts.size,
      retired: [...st.facts.values()].filter((f) => f.retractedPosition !== undefined).length,
      frames: st.journal.length,
    }),
    publishOutbox: (records) =>
      import("./w0-outbox.ts").then((m) => m.publishRecords(handle, records)),
    name: "memory",
    assignments: { source: one, current: one, history: one, analytics: one, replicationEdges: [] },
    watermarks: async () => ({ source: st.position }),
    coordinate: (position) => ({ stream: `memory:${scope}`, epoch: 0, offset: position, ordinal: 0 }),
    backend: { name: lane, url: `memory://${scope}`, queryPath: "memory" },
    transact,
    transactionByCommand: async (id) => ({ ok: true, value: st.claims.get(id) ?? null }),
    pull,
    sweepPull: (root, basis) => pull(root, basis),
    feedPage: async (after, limit) => {
      await delay();
      const out = st.journal.filter((r) => r.position > after).slice(0, limit);
      return { transactions: out, ...(out.length ? { next: out.at(-1).position } : {}) };
    },
    currentPosition: async () => st.position,
    close: async () => {},
  };
  return handle;
}
