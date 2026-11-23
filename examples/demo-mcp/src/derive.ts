// [DX-CON1] evaluate_derivation: one Triplex derivation evaluated for one subject, with each candidate's source facts,
// and a reconcile against another position (DESIGN.md 7.2). Derivation.make, Derivation.evaluate and
// Derivation.reconcile run unchanged; only the Reader is the console's: queryAll answers from a fresh in-memory copy of
// the subject's pulled facts, match answers from the pulled facts themselves (so every source keeps its stored fact ID
// and transaction), transaction answers each transaction's position from the subject's stored rows, and
// temporalBoundary is the earliest future valid-time edge among the pulled facts.
// Why: Derivation.Materialization and dependencyState scan on this engine (F4); per subject is what the runtime does
// with the feed's "who changed since". Rejected: materializing anything, or evaluating across subjects.
import { Context, Effect, Layer, Option } from "effect";
import { KvTriples, Triples, type Triple } from "@triplex-build/triplex";
import * as Derivation from "@triplex-build/triplex/derivation";
import { snapshotFor } from "./config.ts";
import { resolveBasis, type Basis } from "./entities.ts";
import { DemoError } from "./errors.ts";
import { configOf } from "./releases.ts";
import type { Demo } from "./store.ts";

const SAFE = 9_007_199_254_740_991n;
const iso = (ms: number | null | undefined) => (ms === null || ms === undefined || !Number.isFinite(ms) ? null : new Date(ms).toISOString());
const plain = (v: unknown): unknown => (typeof v === "bigint" ? String(v) : v && typeof v === "object" && "value" in (v as object) && "type" in (v as object) ? plain((v as { value: unknown }).value) : v);

/** Exact integers as numbers inside 53 bits (G6), the same rule as the query tool. */
function numeric(t: Triple): Triple {
  if (t.value.type !== "integer") return t;
  const big = BigInt(t.value.value as unknown as string | bigint);
  if (big > SAFE || big < -SAFE) throw new DemoError("QueryRefused", "This subject holds an exact integer too large for Triplex's in-memory Datalog.");
  return { ...t, value: { type: "number", value: Number(big) } as never };
}

type Pulled = { triples: Triple[]; positions: Map<string, { position: number; instant: number }>; position: number; root: string; entities: number };

async function pull(demo: Demo, root: string, wire: { recordedPosition?: number; recordedAt?: number; validAt: number }, position: number): Promise<Pulled> {
  const world = await demo.reader.readDemandWorld(demo.scope, root, wire);
  if (!world) throw new DemoError("ReadDeclined", "The read gateway declined this subject read; try again");
  const triples = world.triples.map(numeric);
  const entityIds = [...new Set(triples.map((t) => t.entityId as string))];
  // The stored rows carry each fact's transaction and position; one read for every entity the subject reaches.
  const rows = entityIds.length ? await demo.reader.rows(demo.db, { entityIds, basis: wire, basisWaitMs: 2000 }) : [];
  const positions = new Map<string, { position: number; instant: number }>();
  for (const r of rows) if (r.tx_id) positions.set(r.tx_id, { position: r.recorded_position, instant: r.recorded_at });
  return { triples, positions, position, root, entities: world.entities };
}

function reader(p: Pulled, memory: { queryAll: Derivation.Reader["queryAll"] }): Derivation.Reader {
  const visible = (t: Triple, validAt?: number) =>
    validAt === undefined || (t.validFrom <= validAt && (Option.isNone(t.validTo) || t.validTo.value > validAt));
  return {
    queryAll: (q, o) => memory.queryAll(q, o),
    match: (pattern, basis) =>
      Effect.succeed(
        p.triples.filter((t) =>
          (pattern.entityId === undefined || typeof pattern.entityId !== "string" || pattern.entityId.startsWith("?") || t.entityId === pattern.entityId) &&
          (pattern.attribute === undefined || typeof pattern.attribute !== "string" || pattern.attribute.startsWith("?") || t.attribute === pattern.attribute) &&
          visible(t, basis?.validAt)),
      ),
    transaction: (txId) => {
      const found = p.positions.get(txId as string);
      return Effect.succeed(found ? ({ txId, position: found.position, instant: found.instant, changes: [] } as never) : null);
    },
    temporalBoundary: (_definition, basis) => {
      const edges = p.triples.flatMap((t) => [t.validFrom, ...(Option.isSome(t.validTo) ? [t.validTo.value] : [])]).filter((x) => x > basis.validAt);
      return Effect.succeed(edges.length ? Math.min(...edges) : undefined);
    },
  } as Derivation.Reader;
}

/** Evaluate and add the console's own time to the caller's counter. */
async function evaluateOn(p: Pulled, definition: Derivation.Definition, validAt: number, spent: { ms: number }) {
  const t0 = performance.now();
  try {
    return await evaluateInner(p, definition, validAt);
  } finally {
    spent.ms += performance.now() - t0;
  }
}
async function evaluateInner(p: Pulled, definition: Derivation.Definition, validAt: number) {
  const inputs = p.triples.map((t) => ({
    entityId: t.entityId, attribute: t.attribute, value: t.value, validFrom: t.validFrom,
    ...(Option.isSome(t.validTo) ? { validTo: t.validTo.value } : {}),
    ...(Option.isSome(t.entityType) ? { entityType: t.entityType.value } : {}),
  }));
  const program = Effect.scoped(
    Effect.gen(function* () {
      const context = yield* Layer.build(Layer.fresh(KvTriples.layer));
      const memory = Context.get(context, Triples);
      yield* memory.assertBatch(inputs as never);
      return yield* Derivation.evaluate(reader(p, memory), definition, { basis: { validAt } });
    }),
  );
  return Effect.runPromise(program as Effect.Effect<Derivation.Evaluation, unknown>);
}

const candidateView = (c: Derivation.Candidate) => ({
  id: c.id,
  identity: Object.fromEntries(Object.entries(c.identity).map(([k, v]) => [k, plain(v)])),
  result: Object.fromEntries(Object.entries(c.result).map(([k, v]) => [k, plain(v)])),
  sources: c.sources.map((s) => ({ factId: s.tripleId, entity: s.entityId, attribute: s.attribute, transaction: s.transactionId ?? null, position: s.transactionPosition ?? null, validFrom: iso(s.validFrom), validTo: iso(s.validTo) })),
  nextTemporalBoundary: iso(c.nextTemporalBoundary),
});

export function evaluateDerivation(
  demo: Demo,
  input: {
    derivation: { name: string; query: Record<string, unknown>; identity: string[] };
    account?: string | number | undefined; subject?: number | undefined; root?: string | undefined;
    basis?: Basis | undefined; compareToPosition?: number | undefined;
  },
) {
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    const q = input.derivation.query as { where?: unknown[]; rules?: unknown[]; aggregate?: unknown[] };
    if (q.rules?.length || q.aggregate?.length || (q.where ?? []).some((c) => Array.isArray(c) && c[0] === "or"))
      throw new DemoError("QueryRefused", "A derivation here uses patterns, comparisons and not only: Triplex's provenance follows those clauses.");
    if ((q.where ?? []).some((c) => Array.isArray(c) && c.length >= 4 && typeof c[0] === "string" && !["not", "or"].includes(c[0]) && !/^[<>=!]/.test(c[0])))
      throw new DemoError("QueryRefused", "A pattern's fourth element binds a transaction; a derivation's sources carry their transactions already.");
    const { store } = await configOf(demo).load();
    const live = snapshotFor(store, "live");
    const definition = await Effect.runPromise(
      Derivation.make({ name: input.derivation.name, query: input.derivation.query as never, identity: input.derivation.identity, configSnapshot: live?.id ?? "console:no-release" }) as Effect.Effect<Derivation.Definition, unknown>,
    ).catch((e: unknown) => {
      throw new DemoError((e as { _tag?: string })._tag ?? "DefinitionError", String((e as { message?: string }).message ?? e));
    });
    const s = demo.subjectOf(input);
    const b = await resolveBasis(demo, input.basis);
    const position = b.position ?? (await demo.head()).position;
    const spent = { ms: 0 };
    const now = await pull(demo, s.root, b.wire, position);
    const evaluation = await evaluateOn(now, definition, b.wire.validAt, spent);
    let reconcile: Record<string, unknown> | undefined;
    if (input.compareToPosition !== undefined) {
      if (input.compareToPosition > position) throw new DemoError("InvalidInput", "Compare with an earlier position");
      const then = await pull(demo, s.root, { recordedPosition: input.compareToPosition, validAt: b.wire.validAt }, input.compareToPosition);
      const before = await evaluateOn(then, definition, b.wire.validAt, spent);
      const r = Derivation.reconcile(before.candidates, evaluation.candidates);
      reconcile = {
        comparedWithPosition: input.compareToPosition,
        added: r.added.map(candidateView), removed: r.removed.map(candidateView),
        changed: r.changed.map((x) => ({ before: candidateView(x.before), after: candidateView(x.after) })),
        unchanged: r.unchanged.length,
        counts: { added: r.added.length, removed: r.removed.length, changed: r.changed.length, unchanged: r.unchanged.length },
      };
    }
    const consoleMs = spent.ms;
    return {
      derivation: { id: definition.id, name: definition.name, identity: definition.identity, output: definition.output, pinnedTo: live ? { id: live.id, label: live.label } : null, dependencies: definition.dependencies },
      subject: { root: s.root, account: s.account, subject: s.subjectNumber, facts: now.triples.length, entities: now.entities },
      candidates: evaluation.candidates.map(candidateView),
      nextTemporalBoundary: iso(evaluation.nextTemporalBoundary),
      ...(reconcile ? { reconcile } : {}),
      basis: b.words,
      note: "Evaluated in the console with Triplex's Derivation.evaluate over this subject's facts; nothing is materialized (Materialization and dependencyState scan on this engine).",
      consoleMs: Math.round(consoleMs * 100) / 100,
      position,
    };
  });
}
