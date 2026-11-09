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
import { fields, type Reader, type Table } from "./g0.ts";
import { requirePosition, visibleRows, type WorldRow } from "./w0-world.ts";
import type { CompositionHandle, Outcome, PullResult, Receipt } from "./composition.ts";

interface Fact {
  id: string;
  entityId: string;
  attribute: string;
  value: any;
  validFrom: number;
  validTo?: number;
  recordedAt: number;
  position: number;
  retractedAt?: number;
  retractedPosition?: number;
  txId: string;
}
const stores = new Map<
  string,
  {
    facts: Map<string, Fact>;
    byEntity: Map<string, Fact[]>;
    journal: any[];
    claims: Map<string, any>;
    position: number;
    idSeq: number;
    lastInstant: number;
    shared?: boolean;
    owned?: Set<string>;
  }
>();

export function memoryComposition(
  lane: "xtdb" | "qlever" | "datomic",
  scope: string,
  serviceMs = 0,
  clock?: () => number,
): CompositionHandle {
  const st =
    stores.get(scope) ??
    stores
      .set(scope, {
        facts: new Map(),
        byEntity: new Map(),
        journal: [],
        claims: new Map(),
        position: 0,
        idSeq: 0,
        lastInstant: 0,
      })
      .get(scope)!;
  const ownEntity = (entity: string) => {
    if (st.shared && !st.owned?.has(entity)) {
      st.byEntity.set(entity, [...(st.byEntity.get(entity) ?? [])]);
      (st.owned ??= new Set()).add(entity);
    }
  };
  const delay = () =>
    serviceMs ? new Promise((r) => setTimeout(r, serviceMs)) : Promise.resolve();
  const fail = (tag: string, extra: any = {}): Outcome<any> => ({
    ok: false,
    tag,
    error: { _tag: tag, ...extra, message: tag },
  });
  const visible = (f: Fact, R: number, V: number) =>
    f.recordedAt <= R &&
    !(f.retractedAt !== undefined && f.retractedAt <= R) &&
    f.validFrom <= V &&
    (f.validTo === undefined || V < f.validTo);
  const transact = async (operations: readonly any[], meta: any): Promise<Outcome<Receipt>> => {
    await delay();
    if (meta?.commandId && st.claims.has(meta.commandId))
      return fail("CommandAlreadyCommittedError", {
        commandId: meta.commandId,
        transactionId: st.claims.get(meta.commandId).txId,
      });
    // [EXP-W02-R2] Why: reject invalid operations before allocating a position or changing any row. Rejected: validating while applying (leaves a partial command after a bad tail operation).
    for (const op of operations) {
      if (op.op === "retract") { if (!st.facts.has(op.id)) return fail("InvalidTripleError"); }
      else if (op.op !== "assert") return fail("InvalidTripleError");
      else if (op.value?.type === "integer") {
        try {
          if (!/^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/.test(op.value.value)) return fail("InvalidTripleError");
          const n = BigInt(op.value.value), bits = 63n;
          if (n < -(1n << bits) || n >= (1n << bits)) return fail("InvalidTripleError");
        } catch { return fail("InvalidTripleError"); }
      }
    }
    for (const p of meta?.preconditions ?? []) {
      if (p._tag === "EntityState") {
        const live = (st.byEntity.get(p.entityId) ?? []).filter(f => f.retractedPosition === undefined).map(f => f.id).sort();
        if (JSON.stringify(live) !== JSON.stringify([...(p.tripleIds ?? [])].sort())) return fail("TransactionConflictError");
      }
      const f = st.facts.get(p.id);
      if (p._tag === "TripleLive" && (!f || f.retractedAt !== undefined))
        return fail("TransactionConflictError", { tripleId: p.id });
    }
    const instant = clock ? clock() : Math.max(Date.now(), st.lastInstant + 1);
    st.lastInstant = instant;
    const position = ++st.position;
    const txId = `_tx/mem${position}`;
    const triples: Fact[] = [];
    const changes: any[] = [];
    for (const op of operations) {
      if (op.op === "retract") {
        const prior = st.facts.get(op.id)!;
        if (!prior) throw new Error("unknown retraction");
        ownEntity(prior.entityId);
        const f = { ...prior };
        st.facts.set(f.id, f);
        const entityFacts = st.byEntity.get(f.entityId)!;
        entityFacts[entityFacts.findIndex((row) => row.id === f.id)] = f;
        f.retractedAt = instant;
        f.retractedPosition = position;
        changes.push({
          op: "retract",
          tripleId: f.id,
          entityId: f.entityId,
          attribute: f.attribute,
          value: f.value,
          validFrom: f.validFrom,
          recordedAt: f.recordedAt,
          retractedAt: instant,
          assertionTxId: f.txId,
          retractionTxId: txId,
        });
      } else {
        const f: Fact = {
          id: `m${(++st.idSeq).toString(36).padStart(8, "0")}`,
          entityId: op.entityId,
          attribute: op.attribute,
          value: op.value,
          validFrom: op.validFrom ?? instant,
          ...(op.validTo !== undefined ? { validTo: op.validTo } : {}),
          recordedAt: instant,
          position,
          txId,
        };
        ownEntity(f.entityId);
        st.facts.set(f.id, f);
        (st.byEntity.get(f.entityId) ?? st.byEntity.set(f.entityId, []).get(f.entityId)!).push(f);
        triples.push(f);
        changes.push({
          op: "assert",
          tripleId: f.id,
          entityId: f.entityId,
          attribute: f.attribute,
          value: f.value,
          validFrom: f.validFrom,
          ...(f.validTo !== undefined ? { validTo: f.validTo } : {}),
          recordedAt: instant,
        });
      }
    }
    const record = {
      operations: structuredClone(operations),
      meta: structuredClone(meta ?? {}),
      txId,
      position,
      instant,
      actor: meta?.actor,
      commandId: meta?.commandId,
      changes,
    };
    st.journal.push(record);
    if (meta?.commandId) st.claims.set(meta.commandId, record);
    return { ok: true, value: { txId, position, instant, triples } };
  };
  const pull = async (
    root: string,
    basis: { recordedAt: number; validAt: number },
    between?: () => Promise<void>,
  ): Promise<PullResult> => {
    const seen = new Set([root]);
    let frontier = [root];
    const triples: Fact[] = [];
    let roundTrips = 0;
    while (frontier.length) {
      await delay();
      roundTrips++;
      const level = frontier.flatMap((e) =>
        (st.byEntity.get(e) ?? []).filter((f) => visible(f, basis.recordedAt, basis.validAt)),
      );
      if (roundTrips === 1 && between) await between();
      const next: string[] = [];
      for (const t of level) {
        triples.push(t);
        if (t.value?.type === "ref" && !seen.has(t.value.value)) {
          seen.add(t.value.value);
          next.push(t.value.value);
        }
      }
      frontier = next;
    }
    return {
      triples,
      entities: seen.size,
      roundTrips,
      depth: roundTrips - 1,
      route: "source",
      language: "memory",
      waitedMs: 0,
    };
  };
  const one = { lane, role: "in-process reference store (diagnostic)" };
  const clean = (v: any): any =>
    Array.isArray(v)
      ? v.map(clean)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([, x]) => x !== undefined)
              .map(([k, x]) => [k, clean(x)]),
          )
        : v;
  const handle: CompositionHandle = {
    scopeName: scope,
    commandLog: () =>
      st.journal.map((r) => ({
        operations: r.operations,
        meta: r.meta,
        receipt: {
          txId: r.txId,
          position: r.position,
          instant: r.instant,
          triples: r.changes
            .filter((c: any) => c.op === "assert")
            .map((c: any) => ({ id: c.tripleId })),
        },
      })),
    g0Reader: (logicalScope = scope): Reader => {
      // [EXP-P5-R3] Why: memory must expose every retained fact and owner-state cell, including history and claims, to K01 D. Rejected: snapshot projections (miss equal-count lifetime changes).
      const rows = (table: Table): any[] => {
        const base = Object.fromEntries(fields[table].map((k) => [k, null]));
        const pack = (values: any) => ({ ...base, scope_key: logicalScope, ...clean(values) });
        if (table === "tx_assertions")
          return [...st.facts.values()].map((f) =>
            pack({
              id: f.id,
              entity_id: f.entityId,
              attribute: f.attribute,
              recorded_position: f.position,
              valid_from: f.validFrom,
              valid_to: f.validTo ?? null,
              retracted_position: f.retractedPosition ?? null,
              memory_fact: f,
            }),
          );
        if (table === "tx_claims")
          return [...st.claims].map(([id, r]) => pack({ command_id: id, memory_claim: r }));
        if (table === "tx_attempts")
          return st.journal.map((r) => pack({ position: r.position, memory_frame: r }));
        if (table === "tx_meta")
          return [pack({ position: st.position, idSeq: st.idSeq, lastInstant: st.lastInstant })];
        return [];
      };
      return {
        endpoint: `memory://${scope}`,
        scopes: async () => [{ scope_key: logicalScope, position: st.position }],
        count: async (t) => rows(t).length,
        async *scan(t, _s, signal) {
          for (const r of rows(t)) {
            signal.throwIfAborted();
            yield r;
          }
        },
      };
    },
    sweepPage: async (subjects, basis, between) => {
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
        if (roundTrips === 1 && between) await between();
        const next: string[] = [];
        for (const r of level)
          if (r.value.type === "ref" && !seen.has(r.value.value)) {
            seen.add(r.value.value);
            next.push(r.value.value);
          }
        frontier = next;
      }
      return { rows, reportedBasis: { ...basis }, position: head, epoch: `memory:${scope}`, roundTrips };
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
    coordinate: (position) => ({
      stream: `memory:${scope}`,
      epoch: 0,
      offset: position,
      ordinal: 0,
    }),
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

/** Offline-only COW clone; admission still requires fresh content G0. */
export function forkMemoryScope(source: string, target: string) {
  const st = stores.get(source);
  if (!st || stores.has(target)) throw new Error("invalid memory fork");
  // [EXP-P5-R2] Why: immutable source rows with copy-on-write entity arrays keep paired offline arms isolated without multiplying the full population. Rejected: sharing mutable facts (cross-arm retirements).
  st.shared = true;
  st.owned = new Set();
  stores.set(target, {
    ...st,
    facts: new Map(st.facts),
    byEntity: new Map(st.byEntity),
    journal: [...st.journal],
    claims: new Map(st.claims),
    shared: true,
    owned: new Set(),
  });
  return memoryComposition("xtdb", target);
}
export function dropMemoryScope(scope: string) {
  stores.delete(scope);
}
