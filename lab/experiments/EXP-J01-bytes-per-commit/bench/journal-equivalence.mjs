// EXP-J01 journal equivalence: the same deterministic command script on a0 and compact, per lane, then
// every read surface of the logical journal (and of the data the compact QLever encoding re-encodes),
// compared byte for byte. The runtimes share seed and start time, so ids, instants and positions agree.
// Also compares the physical journal rows (XTDB: every column of the _Transaction rows, scope normalized;
// QLever: the _row literals), which shows the journal encoding itself is unchanged.
//
// Usage: node journal-equivalence.mjs --lane xtdb|qlever
import { createHash, randomUUID } from 'node:crypto';
import { Effect } from 'effect';
import { core, laneRuntime, writeReceipt } from './lib.mjs';

const args = process.argv.slice(2);
const lane = args[args.indexOf('--lane') + 1];
const { EntityId, string, number, integer, boolean, datetime, ref, json, blob } = core;
const e = (s) => EntityId.make(s);

// Bit-exact serialization: -0 is spelled "-0" (JSON.stringify would print 0), bigints and Options kept.
const exact = (value) => JSON.stringify(value, (_k, v) => (typeof v === 'number' && Object.is(v, -0) ? '__NEG_ZERO__' : typeof v === 'bigint' ? `${v}n` : v));
const deterministic = { startTime: 1_762_560_000_000, seed: 'j01-journal-equivalence' };

const script = (t) =>
  Effect.gen(function* () {
    const results = [];
    const subject = e('j01:eq:subject'), other = e('j01:eq:other');
    // 1. A trace-shaped 10-fact command with the full causal envelope.
    results.push(yield* t.transact(
      Array.from({ length: 10 }, (_v, i) => ({ op: 'assert', entityId: subject, entityType: 'J01Subject', attribute: `:j01/f${i}`, value: string(`v-${i}`) })),
      { commandId: 'j01:eq:1', actor: 'j01:actor', correlationId: 'j01:corr', causationId: 'j01:cause', configSnapshot: 'j01:config:v1' },
    ));
    // 2. Every value kind, bit-exact -0.0, an exact big integer, bounded validity, two entities.
    results.push(yield* t.transact([
      { op: 'assert', entityId: subject, attribute: ':j01/zero', value: number(-0) },
      { op: 'assert', entityId: subject, attribute: ':j01/pi', value: number(3.141592653589793), validFrom: 1_000, validTo: 2_000 },
      { op: 'assert', entityId: subject, attribute: ':j01/big', value: integer('9007199254740993') },
      { op: 'assert', entityId: subject, attribute: ':j01/flag', value: boolean(true) },
      { op: 'assert', entityId: subject, attribute: ':j01/when', value: datetime(1_700_000_000_123) },
      { op: 'assert', entityId: subject, attribute: ':j01/link', value: ref(other) },
      { op: 'assert', entityId: other, entityType: 'J01Other', attribute: ':j01/doc', value: json({ b: [1, 2.5, null], a: 'x', 'k"q': 'it\'s' }) },
      { op: 'assert', entityId: other, attribute: ':j01/file', value: blob('sha256:abc', 'text/plain', 3, 'a.txt') },
    ], { commandId: 'j01:eq:2' }));
    // 3. A correction: retract one fact by id and assert its replacement.
    const first = results[0].triples[0];
    results.push(yield* t.transact([
      { op: 'retract', id: first.id },
      { op: 'assert', entityId: subject, entityType: 'J01Subject', attribute: ':j01/f0', value: string('v-0-corrected') },
    ], { actor: 'j01:reviewer', preconditions: [{ _tag: 'TripleLive', id: first.id }] }));
    // 4. Staged facts are visible to later operations of the same command (assert, then retract-pattern).
    results.push(yield* t.transact([
      { op: 'assert', entityId: other, attribute: ':j01/staged', value: string('short-lived') },
      { op: 'retract-pattern', pattern: { entityId: other, attribute: ':j01/staged' } },
    ]));
    // 5. Retract by pattern across committed facts; and a command with no commandId.
    results.push(yield* t.transact([{ op: 'retract-pattern', pattern: { entityId: subject, attribute: ':j01/f9' } }]));
    return results;
  });

const surfaces = (t, results) =>
  Effect.gen(function* () {
    const txIds = results.map((r) => r.txId);
    const out = {};
    out.results = results.map((r) => ({ txId: r.txId, position: r.position, instant: r.instant, retracted: r.retracted, triples: r.triples }));
    out.transactions = yield* t.transactions({ after: 0, limit: 1000 });
    out.transaction = yield* Effect.forEach(txIds, (id) => t.transaction(id));
    out.byCommand = yield* Effect.forEach(['j01:eq:1', 'j01:eq:2', 'j01:eq:missing'], (c) => t.transactionByCommand(c));
    out.forEntity = yield* Effect.forEach([e('j01:eq:subject'), e('j01:eq:other')], (id) => t.transactionsForEntity(id, { limit: 100 }));
    out.forEntityPaged = yield* t.transactionsForEntity(e('j01:eq:subject'), { limit: 1 });
    out.matchTransactions = yield* t.match({ entityType: '_Transaction' });
    out.matchChange = yield* t.match({ attribute: ':_tx/change' });
    out.matchChangedEntity = yield* t.match({ attribute: ':_tx/changed-entity' });
    out.matchTxEntity = yield* Effect.forEach(txIds, (id) => t.match({ entityId: e(id) }));
    out.datalogChange = yield* t.queryAll({ find: ['?tx', '?change'], where: [['?tx', ':_tx/change', '?change']] });
    out.datalogIndex = yield* t.queryAll({ find: ['?tx', '?p'], where: [['?tx', ':_tx/changed-entity', ref(e('j01:eq:subject'))], ['?tx', ':_tx/position', '?p']] });
    out.datalogEnvelope = yield* t.queryAll({ find: ['?tx', '?a', '?v'], where: [['?tx', ':_tx/command-id', '?a'], ['?tx', ':_tx/instant', '?v']] });
    // Data surfaces the QLever encoding re-encodes: current, history, a past basis, and Datalog.
    out.entityNow = yield* Effect.forEach([e('j01:eq:subject'), e('j01:eq:other')], (id) => t.entity(id));
    out.history = yield* Effect.forEach([e('j01:eq:subject'), e('j01:eq:other')], (id) => t.history(id));
    out.entityAtValidTime = yield* t.entity(e('j01:eq:subject'), { validAt: 1_500 });
    out.entityBeforeAnyRecord = yield* t.entity(e('j01:eq:subject'), { recordedAt: deterministic.startTime - 1 });
    out.datalogData = yield* t.queryAll({ find: ['?e', '?a', '?v'], where: [['?e', '?a', '?v'], ['?e', ':j01/flag', '?f']] });
    out.datalogValidTime = yield* t.queryAll({ find: ['?e', '?v'], where: [['?e', ':j01/pi', '?v']] }, { basis: { validAt: 1_500 } });
    out.datalogWithBasis = yield* t.queryAll({ find: ['?v'], where: [['?e', ':j01/f0', '?v']] }, { includeBasis: true });
    out.dependency = yield* t.dependencyState([':j01/f0', ':j01/pi'], { recordedAt: deterministic.startTime });
    return out;
  });

const runArm = async (encoding) => {
  const rt = await laneRuntime(lane, { scope: `j01-eq-${encoding}-${randomUUID()}`, commitEncoding: encoding, deterministic, queryTimeoutMs: 600_000 });
  const results = await rt.run(Effect.gen(function* () { return yield* script(rt.triples); }));
  const reads = await rt.run(surfaces(rt.triples, results));
  // Physical journal rows, with the scope key replaced so the two arms compare.
  let physical;
  const client = rt.measuring.client;
  if (lane === 'xtdb') {
    const rows = await client.query('SELECT * FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND entity_type = ? ORDER BY id', [rt.scopeKey, '_Transaction']);
    physical = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_valid') && !k.startsWith('_system')).map(([k, v]) => [k, typeof v === 'string' ? v.split(rt.scopeKey).join('<scope>').split(JSON.stringify(rt.scopeKey).slice(1, -1)).join('<scope>') : v])));
  } else {
    const { qlever } = await import('./lib.mjs');
    void qlever;
    const graph = `<urn:triplex:scope:${Buffer.from(rt.scopeKey).toString('base64url')}>`;
    const rows = await client.query(`SELECT ?row WHERE { GRAPH ${graph} { ?s <urn:triplex:field:entity_type> "_Transaction" ; <urn:triplex:field:_row> ?row } } ORDER BY ?row`);
    physical = rows.map((b) => b.row.value);
  }
  await rt.close();
  // The only place a read names its database is a basis's `scope` (includeBasis); the arms run on
  // different scopes by design, so the key is replaced before comparison.
  const normalize = (text) => text.split(exact(rt.scopeKey).slice(1, -1)).join('<scope>');
  // Datalog without orderBy answers a bag; XTDB returns its rows in an order that differs run to run
  // (A0 against A0 too), so Datalog surfaces compare with their rows sorted.
  const bag = (v) => (Array.isArray(v?.results) && !v.nextCursor ? { ...v, results: v.results.map((r) => exact(r)).sort() } : v);
  const perSurface = Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, createHash('sha256').update(normalize(exact(bag(v)))).digest('hex').slice(0, 16)]));
  return { reads: normalize(exact(reads)), perSurface, physical: exact(physical), counts: { transactions: reads.transactions.transactions.length, journalFacts: reads.matchTransactions.length, changes: reads.matchChange.length } };
};

// Interleave arms twice (a0, compact, a0, compact): each pair must agree, and a0 must agree with itself.
const arms = [];
for (const encoding of ['a0', 'compact', 'a0', 'compact']) arms.push({ encoding, ...(await runArm(encoding)) });
const digest = (s) => createHash('sha256').update(s).digest('hex');
function differingSurfacesOf(list) { return Object.keys(list[0].perSurface).filter((k) => new Set(list.map((a) => a.perSurface[k])).size > 1); }
const differingSurfaces = differingSurfacesOf(arms);
const summary = arms.map((a) => ({ encoding: a.encoding, readsSha256: digest(a.reads), readsBytes: a.reads.length, physicalSha256: digest(a.physical), physicalRows: JSON.parse(a.physical).length, ...a.counts }));
const identical = differingSurfacesOf(arms).length === 0 && new Set(arms.map((a) => a.physical)).size === 1;
const identicalAsReturned = new Set(arms.map((a) => a.reads)).size === 1;
const out = { lane, deterministic, identical, identicalAsReturned, differingSurfaces, surfaces: arms[0].perSurface, arms: summary };
const receipt = writeReceipt(`journal-equivalence-${lane}`, { ...out, raw: arms.map((a) => ({ encoding: a.encoding, reads: a.reads, physical: a.physical })) });
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(identical ? 0 : 1);
