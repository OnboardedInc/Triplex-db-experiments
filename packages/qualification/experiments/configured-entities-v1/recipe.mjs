/**
 * Source-only portable fixture recipe. No service, driver or writer is imported.
 * Uses the public Attribute/EntityType/TypeSchema vocabulary already owned by
 * core/config/{Attribute,EntityType,TypeSchema}.ts. Those APIs encode assertions
 * and configuration; they do not automatically create entity presence/version
 * facts. The two structural attributes below are explicit application facts.
 */
import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { EntityId, integer } from '@triplex-build/triplex';
import { Attribute, EntityType, TypeSchema } from '@triplex-build/triplex/config';

export const FORMAT = 'triplex-configured-entity-fixture/1';
export const VALID = Object.freeze({ validFrom: 10.125, validTo: 30.5, probe: 20.25 });
export const COMMAND_WIDTH = 500;
export const ENTITY_TYPE = 'CapacityEntity';
const defs = {
  present: Attribute.boolean(':capacity/present'),
  typeVersion: Attribute.integer(':capacity/type-version'),
  label: Attribute.text(':capacity/label'),
  score: Attribute.number(':capacity/score'),
  exact: Attribute.int64(':capacity/exact'),
  flag: Attribute.boolean(':capacity/flag'),
  group: Attribute.ref(':capacity/group', { entityType: ENTITY_TYPE }),
  category: Attribute.text(':capacity/category'),
  amount: Attribute.number(':capacity/amount'),
  instant: Attribute.instant(':capacity/instant'),
  date: Attribute.date(':capacity/date'),
  rank: Attribute.integer(':capacity/rank'),
  note: Attribute.text(':capacity/note'),
};
export const DOMAIN = Object.freeze(['label', 'score', 'exact', 'flag', 'group', 'category', 'amount', 'instant', 'date', 'rank']);
const definition = version => ({ attributes: Object.fromEntries([
  ...['present', 'typeVersion', ...DOMAIN].map(name => [name, Attribute.use(defs[name], {
    required: ['present', 'typeVersion', 'label'].includes(name),
  })]),
  ...(version === 2 ? [['note', Attribute.use(defs.note)]] : []),
]) });
export const V1 = EntityType.make(ENTITY_TYPE, definition(1));
export const V2 = EntityType.make(ENTITY_TYPE, definition(2));

export function spec(input) {
  assert(input && Object.keys(input).every(k => ['entityCount', 'profile', 'commandWidth'].includes(k)), 'UNKNOWN_SPEC_FIELD');
  assert(Number.isSafeInteger(input.entityCount) && input.entityCount >= 1 && input.entityCount <= 10_000_000, 'ENTITY_COUNT');
  assert(['sparse1', 'representative10'].includes(input.profile), 'FACT_PROFILE');
  assert(input.commandWidth === COMMAND_WIDTH, 'FROZEN_MAX_COMMAND_WIDTH');
  return Object.freeze({ ...input });
}
const domainWidth = input => input.profile === 'sparse1' ? 1 : 10;
export const entityId = index => {
  assert(Number.isSafeInteger(index) && index >= 0 && index < 10_000_000, 'ENTITY_INDEX');
  return EntityId.make(`capacity:e${String(index).padStart(8, '0')}`);
};
function fields(input, index, version, present = true) {
  assert(Number.isSafeInteger(index) && index >= 0 && index < input.entityCount, 'ENTITY_OUT_OF_FIXTURE');
  const values = {
    present, typeVersion: version,
    label: `entity-${String(index).padStart(8, '0')}${version === 2 ? '-v2' : ''}`,
    score: index / 1024 + 0.125,
    exact: integer((9_007_199_254_740_993n + BigInt(index)).toString()),
    flag: index % 2 === 0,
    // A group anchor is never later than its member. Complete entities stay
    // together within each write command; no forward-reference assumption.
    group: entityId(index - index % 128),
    category: `category-${index % 8}`,
    amount: (index % 10_000) / 8 + 0.0625,
    instant: 1_700_000_000_000 + index,
    date: `2024-01-${String(index % 28 + 1).padStart(2, '0')}`,
    rank: index % 997,
  };
  return Object.fromEntries(['present', 'typeVersion', ...DOMAIN.slice(0, domainWidth(input))]
    .map(name => [defs[name].key, values[name]]));
}

/** Local schema validation and public assertion encoding, never a read oracle. */
export function entityAssertions(input, index) {
  input = spec(input);
  return TypeSchema.normalize(V1.schema, fields(input, index, 1)).pipe(Effect.map(value =>
    ['present', 'typeVersion', ...DOMAIN.slice(0, domainWidth(input))].map(name => ({
      op: 'assert', entityId: entityId(index), entityType: ENTITY_TYPE,
      ...V1[name].assertion(value[defs[name].key], { validFrom: VALID.validFrom }), validTo: VALID.validTo,
    }))));
}

/** At most500 operations; an entity is never split across transactions. */
export function* seedRanges(input) {
  input = spec(input);
  const perEntity = domainWidth(input) + 2, count = Math.floor(COMMAND_WIDTH / perEntity);
  for (let from = 0; from < input.entityCount; from += count)
    yield { phase: 'seed', from, to: Math.min(input.entityCount, from + count), operationsPerEntity: perEntity };
}
export const correctedIndices = function* (input) { input = spec(input); for (let i = 0; i < input.entityCount; i += 100) yield i; };
export const presenceIndices = function* (input) { input = spec(input); for (let i = 0; i < input.entityCount; i += 1000) yield i; };
const acknowledgedId = value => { assert(typeof value === 'string' && value.length > 0, 'ACKNOWLEDGED_ASSERTION_ID_REQUIRED'); return value; };

/** IDs must come from retained assertion receipts, never a query-answer oracle. */
export function correctionOps(input, index, ids) {
  input = spec(input); assert(Number.isSafeInteger(index) && index >= 0 && index < input.entityCount && index % 100 === 0, 'CORRECTION_MEMBER');
  const values = fields(input, index, 2);
  return TypeSchema.normalize(V2.schema, values).pipe(Effect.map(value => [
    { op: 'retract', id: acknowledgedId(ids.label) },
    { op: 'retract', id: acknowledgedId(ids.typeVersion) },
    ...['label', 'typeVersion'].map(name => ({ op: 'assert', entityId: entityId(index), entityType: ENTITY_TYPE,
      ...V2[name].assertion(value[defs[name].key], { validFrom: VALID.validFrom }), validTo: VALID.validTo })),
  ]));
}
export function presenceOps(input, index, present, previousId) {
  input = spec(input); assert(Number.isSafeInteger(index) && index >= 0 && index < input.entityCount && index % 1000 === 0 && typeof present === 'boolean', 'PRESENCE_MEMBER');
  return [{ op: 'retract', id: acknowledgedId(previousId) },
    { op: 'assert', entityId: entityId(index), entityType: ENTITY_TYPE,
      ...V1.present.assertion(present, { validFrom: VALID.validFrom }), validTo: VALID.validTo }];
}
export function* mutationGroups(input, phase) {
  input = spec(input); assert(['correction', 'presence-off', 'presence-on'].includes(phase), 'PHASE');
  const indices = phase === 'correction' ? correctedIndices(input) : presenceIndices(input), perEntity = phase === 'correction' ? 4 : 2;
  let group = [];
  for (const index of indices) {
    group.push(index);
    if (group.length * perEntity === COMMAND_WIDTH) { yield { phase, indices: group, operationsPerEntity: perEntity }; group = []; }
  }
  if (group.length) yield { phase, indices: group, operationsPerEntity: perEntity };
}

/** Two explicit public ConfigStore.commit inputs; actual metadata stays measured. */
export function configuration(version) {
  assert(version === 1 || version === 2, 'SCHEMA_VERSION');
  return (version === 1 ? V1 : V2).nodes.pipe(Effect.map(nodes => ({
    label: `configured-capacity-v${version}`, ref: 'capacity-live',
    objects: [...new Map(nodes.map(node => [`${node.kind}\u0000${node.key}`, node])).values()],
  })));
}
