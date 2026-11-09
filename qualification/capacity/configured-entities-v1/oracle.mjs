// @ts-nocheck -- [EXP-CHECKJS] unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Independent analytical/replay oracle: Node builtins only, no recipe/SDK import. */
import assert from 'node:assert/strict';
const valid = n => assert(Number.isSafeInteger(n) && n >= 1 && n <= 10_000_000, 'ENTITY_COUNT');
export function counts(n, width) {
  valid(n); assert(width === 1 || width === 10, 'DOMAIN_WIDTH');
  const c = Math.ceil(n / 100), m = Math.ceil(n / 1000), seed = n * (width + 2);
  return { configuredEntitiesLatest: n, distinctDomainSubjects: n, activeDomainFacts: n * width,
    activePresenceFacts: n, activeTypeVersionFacts: n, activeFixtureFacts: seed,
    domainAssertionVersions: n * width + c, presenceAssertionVersions: n + 2 * m,
    typeVersionAssertionVersions: n + c, allFixtureAssertionVersions: seed + 2 * c + 2 * m,
    fixtureRetirements: 2 * c + 2 * m, correctionEntities: c, presenceCycleEntities: m,
    configuredEntitiesDuringPresenceOff: n - m,
    schemaReleaseCalls: 2, configFacts: null, receiptJournalClaimMetadata: null,
    domainCommands: Math.ceil(n / Math.floor(500 / (width + 2))) + Math.ceil(c / 125) + 2 * Math.ceil(m / 250) };
}
/** Tiny replay deliberately uses its own field literals and transition model. */
export function tinyReplay(n, width) {
  valid(n); assert(n <= 16 && [1, 10].includes(width), 'TINY_REPLAY_ONLY');
  const names = ['label', 'score', 'exact', 'flag', 'group', 'category', 'amount', 'instant', 'date', 'rank'].slice(0, width);
  const rows = [];
  const add = (entity, field, value, phase) => {
    const row = { identity: `${entity}/${field}/${phase}`, entity, field, value, asserted: phase, retired: null };
    rows.push(row); return row;
  };
  const retire = (entity, field, phase) => {
    const found = rows.filter(row => row.entity === entity && row.field === field && row.retired === null);
    assert.equal(found.length, 1); found[0].retired = phase;
  };
  for (let i = 0; i < n; i++) {
    const text = String(i).padStart(8, '0');
    const data = [`entity-${text}`, i / 1024 + 0.125, { type: 'integer', value: String(9007199254740993n + BigInt(i)) },
      i % 2 === 0, `capacity:e${String(Math.floor(i / 128) * 128).padStart(8, '0')}`, `category-${i % 8}`,
      (i % 10000) / 8 + 0.0625, 1700000000000 + i, `2024-01-${String(i % 28 + 1).padStart(2, '0')}`, i % 997];
    add(i, 'present', true, 0); add(i, 'type-version', 1, 0);
    names.forEach((name, j) => add(i, name, data[j], 0));
  }
  for (let i = 0; i < n; i++) if (i % 100 === 0) {
    retire(i, 'label', 1); retire(i, 'type-version', 1);
    add(i, 'label', `entity-${String(i).padStart(8, '0')}-v2`, 1); add(i, 'type-version', 2, 1);
  }
  for (let phase = 2; phase <= 3; phase++) for (let i = 0; i < n; i++) if (i % 1000 === 0) {
    retire(i, 'present', phase); add(i, 'present', phase === 3, phase);
  }
  const cuts = [0, 1, 2, 3].map(phase => ({ phase,
    active: rows.filter(row => row.asserted <= phase && (row.retired === null || row.retired > phase)).map(row => row.identity),
    configuredEntities: rows.filter(row => row.field === 'present' && row.value === true && row.asserted <= phase && (row.retired === null || row.retired > phase)).length }));
  return { counts: counts(n, width), rows, cuts,
    validTime: { from: 10.125, inside: 20.25, toExclusive: 30.5, activeAtExclusiveEnd: 0 },
    actualIdentityMapping: 'Freeze symbolic identity to actual public assertion ID from acknowledged receipts; never derive expected values/membership from query answers' };
}
