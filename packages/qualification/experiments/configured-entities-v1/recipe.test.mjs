// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; unannotated bigint arithmetic or intentional JavaScript boolean/number coercion. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Authored/unexecuted offline controls. No backend or service is imported. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { Effect } from 'effect';
import { TypeSchema } from '@triplex-build/triplex/config';
import { spec, V1, V2, VALID, configuration, entityAssertions, seedRanges, mutationGroups, correctionOps, presenceOps } from './recipe.mjs';
import { counts, tinyReplay } from '../../../../qualification/capacity/configured-entities-v1/oracle.mjs';
const input = profile => ({ profile, entityCount: 8, commandWidth: 500 });

test('fixture sizes/profiles/command bound fail closed', () => {
  for (const entityCount of [0, -1, 0.5, 10000001, NaN, Infinity]) assert.throws(() => spec({ ...input('sparse1'), entityCount }));
  for (const patch of [{ profile: 'dense' }, { commandWidth: 501 }, { extra: true }]) assert.throws(() => spec({ ...input('sparse1'), ...patch }));
  assert(Object.isFrozen(spec(input('representative10'))));
});
test('two schema generations use public configuration nodes and explicit structural attributes', async () => {
  const [one, two] = await Promise.all([Effect.runPromise(configuration(1)), Effect.runPromise(configuration(2))]);
  assert.equal(one.ref, 'capacity-live'); assert.equal(two.ref, one.ref);
  const schema = rows => rows.objects.find(row => row.kind === 'entity-schema' && row.key === 'CapacityEntity');
  assert(schema(one)); assert(schema(two)); assert.notEqual(schema(one).cid, schema(two).cid);
  for (const key of [':capacity/present', ':capacity/type-version', ':capacity/label']) {
    assert.equal(V1.schema.fields[key].optional, false);
    assert(one.objects.some(row => row.kind === 'attribute' && row.key === key));
  }
  assert.equal(V2.schema.fields[':capacity/note'].optional, true);
  assert.equal(V1.schema.fields[':capacity/note'], undefined);
});
test('eight independently replayed seed entities equal actual public typed assertion descriptors', async () => {
  for (const [profile, width] of [['sparse1', 1], ['representative10', 10]]) {
    const replay = tinyReplay(8, width), observed = [];
    const types = { label: 'string', score: 'number', exact: 'integer', flag: 'boolean', group: 'ref', category: 'string', amount: 'number', instant: 'datetime', date: 'string', rank: 'number', present: 'boolean', 'type-version': 'number' };
    for (let i = 0; i < 8; i++) for (const op of await Effect.runPromise(entityAssertions(input(profile), i))) {
      assert.equal(op.op, 'assert'); assert.equal(op.entityType, 'CapacityEntity');
      assert.equal(op.validFrom, VALID.validFrom); assert.equal(op.validTo, VALID.validTo);
      observed.push({ entity: i, field: op.attribute.slice(':capacity/'.length), value: op.value });
    }
    const expected = replay.rows.filter(row => row.asserted === 0).map(row => ({ entity: row.entity, field: row.field,
      value: row.field === 'exact' ? row.value : { type: types[row.field], value: row.value } }));
    assert.deepEqual(observed, expected);
  }
});
test('tiny replay history/phase membership agrees with independently stated exact counts', () => {
  for (const [width, active, history] of [[1, 24, 28], [10, 96, 100]]) {
    const replay = tinyReplay(8, width);
    assert.equal(replay.rows.length, history); assert.equal(replay.rows.filter(row => row.retired !== null).length, 4);
    assert.deepEqual(replay.cuts.map(cut => cut.active.length), [active, active, active, active]);
    assert.deepEqual(replay.cuts.map(cut => cut.configuredEntities), [8, 8, 7, 8]);
    assert.equal(replay.counts.activeDomainFacts, 8 * width); assert.equal(replay.counts.domainCommands, 4);
    assert.equal(replay.validTime.activeAtExclusiveEnd, 0);
  }
});
test('correction and presence transitions consume acknowledged IDs and preserve public value encodings', async () => {
  const ops = await Effect.runPromise(correctionOps(input('representative10'), 0, { label: 'receipt-label', typeVersion: 'receipt-version' }));
  assert.deepEqual(ops.slice(0, 2), [{ op: 'retract', id: 'receipt-label' }, { op: 'retract', id: 'receipt-version' }]);
  assert.deepEqual(ops.slice(2).map(op => op.value), [{ type: 'string', value: 'entity-00000000-v2' }, { type: 'number', value: 2 }]);
  assert.deepEqual(presenceOps(input('sparse1'), 0, false, 'receipt-presence').map(op => op.op), ['retract', 'assert']);
  assert.deepEqual(presenceOps(input('sparse1'), 0, false, 'receipt-presence')[1].value, { type: 'boolean', value: false });
  assert.throws(() => presenceOps(input('sparse1'), 0, true, ''));
  await assert.rejects(Effect.runPromise(correctionOps(input('sparse1'), 0, { label: '', typeVersion: 'ok' })));
});
test('100k command descriptors remain bounded and account for each distinct entity exactly once', () => {
  for (const [profile, width, maxSeed] of [['sparse1', 1, 498], ['representative10', 10, 492]]) {
    const s = { ...input(profile), entityCount: 100000 }, ranges = [...seedRanges(s)];
    assert.equal(ranges[0].from, 0); assert.equal(ranges.at(-1).to, 100000);
    assert(ranges.every((row, i) => (i === 0 || row.from === ranges[i - 1].to) && (row.to - row.from) * row.operationsPerEntity <= maxSeed));
    const correction = [...mutationGroups(s, 'correction')], off = [...mutationGroups(s, 'presence-off')], on = [...mutationGroups(s, 'presence-on')];
    for (const group of [...correction, ...off, ...on]) assert(group.indices.length * group.operationsPerEntity <= 500);
    assert.equal(correction.flatMap(row => row.indices).length, 1000);
    assert.equal(off.flatMap(row => row.indices).length, 100);
    assert.equal(ranges.length + correction.length + off.length + on.length, counts(100000, width).domainCommands);
  }
});
test('public schema rejects missing label and an untagged exact integer without query evaluation', async () => {
  const base = { ':capacity/present': true, ':capacity/type-version': 1, ':capacity/label': 'x' };
  await assert.rejects(Effect.runPromise(TypeSchema.normalize(V1.schema, { ':capacity/present': true, ':capacity/type-version': 1 })));
  await assert.rejects(Effect.runPromise(TypeSchema.normalize(V1.schema, { ...base, ':capacity/exact': 9007199254740992 })));
});
