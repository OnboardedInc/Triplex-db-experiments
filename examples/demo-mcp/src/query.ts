// [DX-CON1] The query tool: Triplex Datalog, the public DatalogQuery JSON unchanged, against one of three sources
// (DESIGN.md section 4):
//   one subject      pull the subject in one request at the basis, seed a fresh in-memory KvTriples, run the query
//                    there with the same valid time (Triplex's own overlay technique);
//   up to 16         pull them at one identical position in one request and evaluate the same way;
//   the store        send it to the read gateway's Datalog route, only when every where clause is a pattern naming a
//                    literal entity or a comparison (no not, or or rules), at an exact position.
// Refused before anything is sent: a store question with a variable entity, not, or or rules; a transaction binding on
// a subject source; more than 16 subjects; an exact integer outside 53 bits in a pulled subject (G6); more than 10,000
// bindings. Validation is Triplex's own (validateDatalogQuery), and its message is returned unchanged.
// Why: the gateway answers only point questions (F1, F2); joins, negation, aggregates and rules over one subject's facts
// are what Triplex's in-memory engine does. Rejected: sending refused questions anyway (the gateway would read up to
// 100,000 rows before giving the same refusal).
import { Context, Effect, Layer, Option } from "effect";
import { KvTriples, Triples, type Triple } from "@triplex-build/triplex";
import { validateDatalogQuery } from "@triplex-build/triplex/datalog";
import { makeDatomicQueryExecutor } from "@triplex-build/triplex-datomic";
import { resolveBasis, type Basis } from "./entities.ts";
import { DemoError } from "./errors.ts";
import { approvedQuery } from "./guard.ts";
import type { Demo } from "./store.ts";

export type From =
  | "store"
  | { subject: { account?: string | number | undefined; subject?: number | undefined; root?: string | undefined } }
  | { subjects: { account: string | number; subjects: number[] } };

const MAX_BINDINGS = 10_000;
const SAFE = 9_007_199_254_740_991n;
const isVar = (x: unknown) => typeof x === "string" && x.startsWith("?");

export const refusalText = {
  store: (records: number) =>
    `Refused. This question would read every record. This engine keeps facts by entity and has no index by attribute or value. The gateway would read rows until its limit of 100,000 rows or 16 MiB and answer QueryInputBudgetExceeded. This database holds ${records.toLocaleString("en-US")} records. Ask it of one subject, or of up to 16 subjects, or name the entity in every pattern.`,
  tx: "A pattern's fourth element binds a transaction. The console evaluates this source on a copy of the subject's facts, which has no journal. Open the entity's Journal tab.",
  many: "One request reads at most 16 subjects at one position.",
  bindings: "This answer has more than 10,000 bindings. Add a clause or a limit.",
  integer: "This subject holds an exact integer too large for Triplex's in-memory Datalog.",
};
export class QueryRefused extends DemoError {
  constructor(message: string) {
    super("QueryRefused", message);
  }
}

type Clause = unknown[];
/** Every clause, including those inside not, or and rule bodies. */
function* clauses(where: readonly unknown[], rules: readonly { body: readonly unknown[] }[] = []): Generator<Clause> {
  const walk = function* (list: readonly unknown[]): Generator<Clause> {
    for (const c of list) {
      if (!Array.isArray(c)) continue;
      yield c;
      if (c[0] === "not") yield* walk(c.slice(1));
      if (c[0] === "or") for (const alt of c.slice(1)) yield* walk(Array.isArray(alt) && Array.isArray(alt[0]) ? alt : [alt]);
    }
  };
  yield* walk(where);
  for (const r of rules) yield* walk(r.body);
}
const PREDICATES = new Set(["=", "!=", "<", "<=", ">", ">=", "starts-with", "contains", "ends-with", "matches"]);

/** The store route takes only questions in which every where clause names its entity or compares values. */
export function storeRefusal(query: { where: readonly unknown[]; rules?: readonly unknown[] | undefined }) {
  if (query.rules?.length) return "rules";
  for (const c of query.where) {
    if (!Array.isArray(c)) return "clause";
    if (c[0] === "not" || c[0] === "or") return String(c[0]);
    if (typeof c[0] === "string" && PREDICATES.has(c[0])) continue;
    if (c.length >= 3 && typeof c[1] === "string" && (c[1].startsWith(":") || isVar(c[1]))) {
      if (isVar(c[0]) || typeof c[0] !== "string") return "variable entity";
      continue;
    }
    return "clause";
  }
  return undefined;
}

const plain = (v: unknown): unknown =>
  typeof v === "bigint" ? String(v) : v && typeof v === "object" && "type" in (v as object) && "value" in (v as object) ? plain((v as { value: unknown }).value) : v;

/** Seed a fresh in-memory store with pulled facts and run the query at the same valid time. */
async function evaluate(triples: readonly Triple[], query: unknown, validAt: number, explain: boolean) {
  const exact = new Set<string>();
  const inputs = triples.map((t) => {
    let value = t.value as { type: string; value: unknown };
    if (value.type === "integer") {
      const big = BigInt(value.value as string | bigint);
      if (big > SAFE || big < -SAFE) throw new QueryRefused(refusalText.integer);
      exact.add(t.attribute);
      value = { type: "number", value: Number(big) };
    }
    return {
      entityId: t.entityId, attribute: t.attribute, value, validFrom: t.validFrom,
      ...(Option.isSome(t.validTo) ? { validTo: t.validTo.value } : {}),
      ...(Option.isSome(t.entityType) ? { entityType: t.entityType.value } : {}),
    };
  });
  const program = Effect.scoped(
    Effect.gen(function* () {
      const context = yield* Layer.build(Layer.fresh(KvTriples.layer));
      const memory = Context.get(context, Triples);
      const s0 = performance.now();
      yield* memory.assertBatch(inputs as never);
      const seedMs = performance.now() - s0;
      const q0 = performance.now();
      const response = yield* memory.queryAll(query as never, { basis: { validAt } });
      const queryMs = performance.now() - q0;
      const plan = explain ? yield* memory.explain(query as never).pipe(Effect.catch(() => Effect.succeed(undefined))) : undefined;
      return { results: response.results, seedMs, queryMs, plan };
    }),
  );
  const out = await Effect.runPromise(program as Effect.Effect<{ results: readonly Record<string, unknown>[]; seedMs: number; queryMs: number; plan: unknown }, unknown>);
  return { ...out, exact };
}

function columnsOf(query: { find: readonly unknown[]; where: readonly unknown[]; rules?: readonly { body: readonly unknown[] }[] | undefined; aggregate?: readonly unknown[] | undefined }, exact: Set<string>) {
  const find = query.find.map((f) => (typeof f === "string" ? f : JSON.stringify(f)));
  const integerVars = new Set<string>();
  for (const c of clauses(query.where, query.rules ?? [])) if (c.length >= 3 && typeof c[1] === "string" && exact.has(c[1]) && isVar(c[2])) integerVars.add(c[2] as string);
  return find.map((name) => ({ name, ...(integerVars.has(name) ? { note: "exact integer, evaluated as a number" } : {}) }));
}

const encodeCursor = (c: { position: number; offset: number; validAt: number }) => Buffer.from(JSON.stringify(c)).toString("base64url");
const decodeCursor = (s: string) => {
  try {
    const c = JSON.parse(Buffer.from(s, "base64url").toString()) as { position: number; offset: number; validAt: number };
    if (Number.isSafeInteger(c.position) && Number.isSafeInteger(c.offset) && Number.isFinite(c.validAt)) return c;
  } catch {}
  throw new DemoError("InvalidCursor", "This cursor is not from this query");
};

export function runQuery(demo: Demo, input: { query: unknown; from: From; basis?: Basis | undefined; pageSize?: number | undefined; cursor?: string | undefined; explain?: boolean | undefined }) {
  return demo.measure(async (): Promise<Record<string, unknown> & { position: number }> => {
    // Triplex's own validation and preflight; its message is returned unchanged.
    const query = await Effect.runPromise(validateDatalogQuery(input.query)).catch((e: unknown) => {
      throw new DemoError((e as { _tag?: string })._tag ?? "DatalogValidationError", String((e as { message?: string }).message ?? e));
    });
    const q = query as unknown as { find: unknown[]; where: unknown[]; rules?: { body: unknown[] }[]; aggregate?: unknown[] };
    // Every refusal is decided before any request is made.
    if (input.from === "store") {
      if (storeRefusal(q)) throw new QueryRefused(refusalText.store(demo.connection.recordsAtBringUp));
    } else {
      for (const c of clauses(q.where, q.rules ?? [])) if (c.length >= 4 && !(typeof c[0] === "string" && PREDICATES.has(c[0])) && c[0] !== "not" && c[0] !== "or") throw new QueryRefused(refusalText.tx);
      if ("subjects" in input.from && (!input.from.subjects.subjects.length || input.from.subjects.subjects.length > 16)) throw new QueryRefused(refusalText.many);
    }
    const pageSize = Math.min(1000, Math.max(1, input.pageSize ?? 100));
    const cursor = input.cursor ? decodeCursor(input.cursor) : undefined;
    const b = cursor
      ? { wire: { recordedPosition: cursor.position, validAt: cursor.validAt }, words: `recorded at position ${cursor.position} (the first page's), valid ${new Date(cursor.validAt).toISOString()}`, position: cursor.position, latest: false }
      : await resolveBasis(demo, input.basis);
    const validAt = b.wire.validAt;
    const page = (all: readonly Record<string, unknown>[], position: number) => {
      if (all.length > MAX_BINDINGS) throw new QueryRefused(refusalText.bindings);
      const offset = cursor?.offset ?? 0;
      const rows = all.slice(offset, offset + pageSize).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, plain(v)])));
      const next = offset + pageSize < all.length ? encodeCursor({ position, offset: offset + pageSize, validAt }) : undefined;
      return { bindings: rows, total: all.length, ...(next ? { cursor: next } : {}), page: { offset, size: rows.length } };
    };

    if (input.from === "store") {
      if (b.position === undefined) throw new DemoError("InvalidInput", "The store source reads at an exact position; give basis.position or leave the basis at latest");
      const executor = makeDatomicQueryExecutor(demo.reader, demo.scope);
      const c0 = performance.now();
      const result = await approvedQuery(() =>
        Effect.runPromise(executor.execute(query, false, { recordedPosition: b.position!, validAt } as never) as Effect.Effect<{ results: readonly Record<string, unknown>[] }, unknown>),
      ).catch((e: unknown) => {
        const message = String((e as { message?: string }).message ?? e);
        if (/deadline/i.test(message)) throw new DemoError("Deadline", "The store stopped this query at its 30 second deadline.");
        throw e;
      });
      const evaluatedMs = performance.now() - c0;
      const plan = input.explain ? await Effect.runPromise(executor.explain(query) as Effect.Effect<unknown, unknown>).catch(() => undefined) : undefined;
      return {
        source: "store", route: "the read gateway's Datalog route (POST /v1/db/{db}/q) at an exact position",
        answeredBy: "Answered by the store. It reads the full history of each named entity.",
        columns: columnsOf(q, new Set()),
        ...page(result.results, b.position),
        ...(plan ? { plan } : {}),
        basis: b.words,
        storeMs: Math.round(evaluatedMs * 100) / 100,
        position: b.position,
      };
    }

    let triples: Triple[] = [];
    let pulled: Record<string, unknown>;
    let position: number;
    if ("subject" in input.from) {
      const s = demo.subjectOf(input.from.subject);
      const world = await demo.reader.readDemandWorld(demo.scope, s.root, b.wire);
      if (!world) throw new DemoError("ReadDeclined", "The read gateway declined this subject read; try again");
      triples = [...world.triples];
      position = b.position ?? (await demo.head()).position;
      pulled = { subjects: 1, root: s.root, account: s.account, subject: s.subjectNumber, facts: world.triples.length, entities: world.entities };
    } else {
      const { account, subjects } = input.from.subjects;
      if (!subjects.length || subjects.length > 16) throw new QueryRefused(refusalText.many);
      if (new Set(subjects).size !== subjects.length) throw new DemoError("InvalidInput", "Give different subject numbers");
      if (b.position === undefined) throw new DemoError("InvalidInput", "Several subjects are read at one exact position; give basis.position or leave the basis at latest");
      const roots = subjects.map((n) => demo.subjectIds(account, n).root);
      const found = await demo.reader.readHistoricalWorlds(demo.scope, roots, b.wire);
      if (!found) throw new DemoError("ReadDeclined", "The read gateway declined this batch; try again");
      triples = found.worlds.flatMap((w) => [...w.triples]);
      position = found.position;
      pulled = { subjects: subjects.length, account: demo.account(account).account, facts: triples.length, entities: found.worlds.reduce((n, w) => n + w.entities, 0), identicalPosition: found.position };
    }
    const c0 = performance.now();
    const evaluated = await evaluate(triples, query, validAt, input.explain === true).catch((e: unknown) => {
      if (e instanceof DemoError) throw e;
      const tag = (e as { _tag?: string })._tag;
      throw new DemoError(tag ?? "QueryError", String((e as { message?: string }).message ?? e));
    });
    const consoleMs = performance.now() - c0;
    return {
      source: "subject" in input.from ? "one subject" : "several subjects",
      route: "pulled in one request, then evaluated in the console by Triplex's in-memory Datalog (KvTriples)",
      pulled,
      summary: `${pulled["facts"]} facts in ${pulled["entities"]} entities pulled at position ${position}. Evaluated in the console in ${consoleMs.toFixed(2)} ms.`,
      columns: columnsOf(q, evaluated.exact),
      ...page(evaluated.results, position),
      ...(evaluated.plan ? { plan: evaluated.plan } : {}),
      ...(evaluated.exact.size ? { exactIntegers: `Attributes ${[...evaluated.exact].sort().join(", ")} hold exact integers; they were evaluated as numbers (all within 53 bits, so nothing was lost; gap G6).` } : {}),
      basis: b.words,
      consoleMs: Math.round(consoleMs * 100) / 100,
      consoleDetail: { seedMs: Math.round(evaluated.seedMs * 100) / 100, queryMs: Math.round(evaluated.queryMs * 100) / 100 },
      position,
    };
  });
}
