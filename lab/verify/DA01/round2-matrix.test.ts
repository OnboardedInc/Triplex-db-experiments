import { Effect, Option } from 'effect';
import { expect, it } from 'vitest';
import { Triples, EntityId } from '@triplex-build/triplex';
import { Capabilities, Runtime, StorageAdapter, QueryExecutor } from '@triplex-build/triplex/runtime';
import { Layer } from 'effect';
import { fixture, run, seed, advance, assertionId } from './round2-utils.js';
import type { ResolvedTemporalBasis } from '@triplex-build/triplex';

const sort = (xs: readonly string[]) => [...xs].sort();
const asDouble = (n: number | undefined) => n === undefined ? 'nil' : Number.isInteger(n) ? `${n}.0` : String(n);
// [CX-VDA01-R2] Why: compare independently constructed paths and real cursor continuations to history, across basis axes and later commits. Rejected: counting the builder matrix as independent coverage (shares its fixture assumptions).
it('R2 independent path/basis matrix agrees with history before and after writes', async () => fixture('matrix', async ({ client, a, q, db, scope, record }) => {
  await seed(a);
  const entities = Array.from({ length: 8 }, (_, i) => `e${String(i).padStart(2, '0')}`).concat('new');
  type Cut = { name: string; basis: ResolvedTemporalBasis; live: boolean; future?: boolean; repeat?: boolean; public?: boolean };
  const cuts: Cut[] = [
    { name: 'latest', basis: { validAt: 50 }, live: true, public: true },
    ...[0, 29, 30, 99, 100, 150].map(v => ({ name: `V${v}`, basis: { validAt: v }, live: true, public: true })),
    ...[0, 5, 9, 10, 15].map(t => ({ name: `T${t}`, basis: { validAt: 50, recordedAt: t }, live: false, public: true, repeat: true })),
    ...[0, 1, 2, 3].map(p => ({ name: `P${p}`, basis: { validAt: 50, recordedPosition: p }, live: p !== 2, repeat: true })),
    { name: 'VP', basis: { validAt: 0, recordedPosition: 1 }, live: true, repeat: true },
    { name: 'VT', basis: { validAt: 0, recordedAt: 10 }, live: false, repeat: true, public: true },
    { name: 'VTP', basis: { validAt: 30, recordedAt: 10, recordedPosition: 3 }, live: false, repeat: true },
    { name: 'TP0', basis: { validAt: 50, recordedAt: 10, recordedPosition: 0 }, live: false, repeat: true },
    { name: 'TPinterior', basis: { validAt: 50, recordedAt: 10, recordedPosition: 2 }, live: false, repeat: true },
    { name: 'futureP', basis: { validAt: 50, recordedPosition: 1000 }, live: false, future: true },
    { name: 'futureTP', basis: { validAt: 50, recordedAt: 10, recordedPosition: 1000 }, live: false, future: true },
    { name: 'futureT-unsealed-Q90', basis: { validAt: 50, recordedAt: Date.now() + 100000 }, live: false, public: true },
  ];
  const datalog = { find: ['?e'], where: [['?e', ':key', '?v']] };
  const optional = { ...datalog, find: ['?e', '?status'], optionalProjection: { rowBinding: '?e', fields: [{ attribute: ':status', variable: '?status' }] } };
  const recursive = { find: ['?e'], where: [['reach', 'root', '?e'], ['?e', ':key', '?v']], rules: [
    { name: 'reach', body: [['?s', ':edge', '?t']] },
    { name: 'reach', body: [['?s', ':edge', '?m'], ['reach', '?m', '?t']] },
  ] };
  const runtime = Runtime.define({ name: 'review-datomic', storage: Layer.succeed(StorageAdapter, a), queries: Layer.succeed(QueryExecutor, q) });
  const publicCall = <A>(program: Effect.Effect<A, any, Triples>) => run(program.pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
  const recordOutcome = async (phase: string, cut: Cut, name: string, eligible: boolean, expected: string[], read: () => Promise<string[]>) => {
    let observed: unknown;
    try {
      const rows = await read(); observed = { rows };
      expect(eligible, `${phase}/${cut.name}/${name}: unexpected answer`).toBe(true);
      expect(sort(rows), `${phase}/${cut.name}/${name}`).toEqual(sort(expected));
      if (cut.repeat) {
        const key = `${cut.name}/${name}`;
        if (phase === 'before') repeats.set(key, sort(rows));
        else expect(sort(rows), `repeat/${key}`).toEqual(repeats.get(key));
      }
    } catch (e) {
      observed = { error: String(e), code: (e as { code?: string }).code };
      if (eligible) throw e;
      expect(e).toMatchObject({ code: 'BasisNotAvailable' });
    } finally { record({ kind: 'independent-matrix', phase, cut: cut.name, basis: cut.basis, path: name, eligible, expected, observed }); }
  };
  const repeats = new Map<string, string[]>();
  const rawNative = async (basis: ResolvedTemporalBasis, live: boolean, pin: Record<string, unknown> = {}, extra = '') => {
    const attribute = live ? ':f/live' : ':f/subject';
    const edn = `[:find ?e :in $ $rules :where [?f ${attribute} ?s] [?s :triplex.entity/id ?e] [?f :f/attr ?a] [?a :triplex.attr/key ":key"] [(triplex.gateway.query/visible $ ?f ${asDouble(basis.validAt)} ${asDouble(basis.recordedAt)} ${basis.recordedPosition ?? 'nil'})] ${extra}]`;
    const r = await client.request<{ rows: { v: string }[][] }>('POST', `/v1/db/${db}/q`, { edn, relations: [], basis, basisWaitMs: 10, ...pin });
    return r.rows.map(r => r[0]!.v);
  };
  for (const phase of ['before', 'after']) {
    if (phase === 'after') await advance(a);
    for (const cut of cuts) {
      const b = cut.basis;
      let history: Awaited<ReturnType<typeof client.rows>> = [];
      if (!cut.future) history = await client.rows(db, { route: 'history', pattern: { attribute: ':key' }, basis: b });
      const expected = history.map(r => r.entity_id);
      const allRows = cut.future ? [] : await client.rows(db, { route: 'history', basis: b });
      const reached = new Set(['root']);
      for (let pass = 0; pass < 10; pass++) for (const r of allRows.filter(r => r.attribute === ':edge')) if (reached.has(r.entity_id)) reached.add(r.value_string!);
      const ruleExpected = expected.filter(e => reached.has(e));
      const dependencyRows = cut.future ? [] : await client.rows(db, { route: 'history', pattern: { attribute: ':key' }, basis: b, history: true });
      let depPosition = 0; let depBoundary: number | undefined;
      for (const row of dependencyRows) {
        depPosition = Math.max(depPosition, row.recorded_position, row.retracted_position ?? 0);
        if (row.retracted_at === null) for (const edge of [row.valid_from, row.valid_to]) if (edge !== null && edge > b.validAt) depBoundary = Math.min(depBoundary ?? Infinity, edge);
      }
      const paths = [
        { name: 'repository-pattern', read: async () => (await run(a.query({ attribute: ':key' }, b))).map(r => r.entity_id) },
        { name: 'repository-batch', read: async () => [...(await run(a.getByEntities(entities, b))).values()].flat().filter(r => r.attribute === ':key').map(r => r.entity_id) },
        { name: 'repository-single-loop', read: async () => (await Promise.all(entities.map(e => run(a.getByEntity(e, b))))).flat().filter(r => r.attribute === ':key').map(r => r.entity_id) },
        { name: 'compiled-datalog', read: async () => (await run(q.execute(datalog, false, b))).results.map(r => String(r['?e'])) },
        { name: 'recursive-rules', expected: ruleExpected, read: async () => (await run(q.execute(recursive, false, b))).results.map(r => String(r['?e'])) },
        { name: 'optional-pull', read: async () => (await run(q.execute(optional, false, b))).results.map(r => { expect(r['?status']).toBe(r['?e']); return String(r['?e']); }) },
        { name: 'executor-pagination', read: async () => {
          const rows: string[] = []; let cursor: string[] | undefined;
          for (let n = 0; n < 12; n++) {
            const page = await run(q.executePage({ inner: datalog, limit: 2, orderBy: [{ variable: '?e', direction: 'asc' }] }, false, b, cursor));
            rows.push(...page.results.map(r => String(r['?e']))); if (page.results.length < 2) break; cursor = [String(page.results.at(-1)!['?e'])];
          }
          return rows;
        } },
        { name: 'native-history', read: () => rawNative(b, false) },
        { name: 'dependency-state', expected: [JSON.stringify({ sourcePosition: depPosition, ...(depBoundary === undefined ? {} : { nextTemporalBoundary: depBoundary }) })], read: async () => [JSON.stringify(await run(a.dependencyState([':key'], b)))] },
        { name: 'native-live', live: true, read: () => rawNative(b, true) },
        { name: 'pull-live', live: true, read: async () => (await client.rows(db, { route: 'live', pattern: { attribute: ':key' }, basis: b, basisWaitMs: 10 })).map(r => r.entity_id) },
      ];
      for (const mode of ['held', 'staged']) {
        for (const live of [false, true]) paths.push({ name: `${mode}/native-${live ? 'live' : 'history'}`, live, read: async () => {
          const snapshot = await client.begin(db);
          try { return await rawNative(b, live, { handle: snapshot.handle, ...(mode === 'staged' ? { staged: { sourceK: snapshot.position, position: snapshot.position + 1, operationId: `matrix-${phase}`, rows: [], newIds: [], claims: [] } } : {}) }); }
          finally { await client.release(db, snapshot.handle); }
        } });
      }
      for (const p of paths) await recordOutcome(phase, cut, p.name, !cut.future && (!p.live || cut.live), p.expected ?? expected, p.read);
      if (cut.public) {
        const read = (kind: string) => publicCall(Effect.gen(function* () {
          const t = yield* Triples;
          if (kind === 'entity-loop') return (yield* Effect.forEach(entities, e => t.entity(EntityId.make(e), b))).flat().filter(r => r.attribute === ':key').map(r => String(r.entityId));
          if (kind === 'entities') return (yield* t.entities(entities.map(EntityId.make), b)).flat().filter(r => r.attribute === ':key').map(r => String(r.entityId));
          if (kind === 'match') return (yield* t.match({ attribute: ':key' }, b)).map(r => String(r.entityId));
          if (kind === 'queryAll') return (yield* t.queryAll(datalog, { basis: b })).results.map(r => String(r['?e']));
          if (kind === 'query') return (yield* t.query(datalog, { basis: b, pageSize: 100 })).results.map(r => String(r['?e']));
          if (kind === 'queryPage') return (yield* t.queryPage({ inner: datalog, limit: 100 }, { basis: b })).results.map(r => String(r['?e']));
          const page = yield* t.entityPage({ entityType: 'ReviewItem', basis: b, limit: 100 });
          return page.entities.flat().filter(r => r.attribute === ':key').map(r => String(r.entityId));
        }));
        for (const name of ['entity-loop', 'entities', 'match', 'queryAll', 'query', 'queryPage', 'entityPage']) await recordOutcome(phase, cut, `public/${name}`, true, expected, () => read(name));
      }
    }
  }
  record({ kind: 'matrix-coverage', cuts: cuts.length, basePaths: 15, publicPaths: 7, publicCuts: cuts.filter(c => c.public).length, phases: 2, expectedObservations: cuts.length * 15 * 2 + cuts.filter(c => c.public).length * 7 * 2 });
}), 180000);

it('R2 public query and entity cursors preserve their exact cut across real writes', async () => fixture('pagination', async ({ a, q, client, db, scope, record }) => {
  await seed(a);
  const runtime = Runtime.define({ name: 'review-pages', storage: Layer.succeed(StorageAdapter, a), queries: Layer.succeed(QueryExecutor, q) });
  await run(Effect.gen(function* () {
    const t = yield* Triples;
    const basis = { validAt: 50, recordedAt: 10 };
    const query = { inner: { find: ['?e'], where: [['?e', ':key', '?v']] }, limit: 2 };
    const firstQuery = yield* t.queryPage(query, { basis, includeBasis: true });
    const firstEntities = yield* t.entityPage({ entityType: 'ReviewItem', basis, limit: 2 });
    const expected = (yield* Effect.promise(() => client.rows(db, { route: 'history', pattern: { attribute: ':key' }, basis: firstQuery.basis }))).map(r => r.entity_id).sort();
    yield* Effect.promise(() => advance(a));
    const queryRows = firstQuery.results.map(r => String(r['?e'])); let cursor = firstQuery.nextCursor;
    while (cursor) { const page = yield* t.queryPage({ ...query, cursor }, { basis, includeBasis: true }); expect(page.basis).toEqual(firstQuery.basis); queryRows.push(...page.results.map(r => String(r['?e']))); cursor = page.nextCursor; }
    const entityRows = firstEntities.entities.flat().filter(r => r.attribute === ':key').map(r => String(r.entityId)); cursor = firstEntities.nextCursor;
    while (cursor) { const page = yield* t.entityPage({ entityType: 'ReviewItem', basis, limit: 2, cursor }); expect(page.snapshot).toEqual(firstEntities.snapshot); entityRows.push(...page.entities.flat().filter(r => r.attribute === ':key').map(r => String(r.entityId))); cursor = page.nextCursor; }
    record({ kind: 'pagination-straddle', expected, queryRows, entityRows, queryBasis: firstQuery.basis, entityBasis: firstEntities.snapshot });
    expect(sort(queryRows)).toEqual(expected); expect(new Set(queryRows).size).toBe(queryRows.length); expect(sort(entityRows)).toEqual(expected);
  }).pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
}), 60000);

it('R2 basis-free ID and raw-history APIs retain their declared latest/lifetime contracts', async () => fixture('basis-free', async ({ a, q, scope, record }) => {
  await seed(a);
  const runtime = Runtime.define({ name: 'review-id-history', storage: Layer.succeed(StorageAdapter, a), queries: Layer.succeed(QueryExecutor, q) });
  await run(Effect.gen(function* () {
    const t = yield* Triples;
    const id = assertionId('key-e00');
    expect(yield* a.getById(id)).not.toBeNull();
    expect(yield* t.get(id as any)).not.toBeNull();
    yield* Effect.promise(() => advance(a));
    expect(yield* a.getById(id)).toBeNull();
    expect(yield* t.get(id as any)).toBeNull();
    const raw = yield* a.history('e00'), publicHistory = yield* t.history(EntityId.make('e00'));
    expect(raw.some(r => r.id === id && r.retracted_at === 20)).toBe(true);
    expect(publicHistory.some(r => r.id === id && Option.isSome(r.retractedAt) && r.retractedAt.value === 20)).toBe(true);
    record({ kind: 'basis-free-contracts', id, raw, publicHistory });
  }).pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
}), 60000);
