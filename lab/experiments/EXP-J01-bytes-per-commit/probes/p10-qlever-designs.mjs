// EXP-J01 probe 10: inserted triples per 10-fact command for QLever commit layouts, counted with the lane's
// own encoder (packages/qlever/dist rdf.ts), no engine needed. Closes against the measured A0 (663) and
// compact (447) counts, then counts the layouts that need read-path work (journal as one subject).
// Run: node p10-qlever-designs.mjs   (writes a receipt)
import { writeReceipt, qlever } from '../bench/lib.mjs';

const row = (over) => ({
  id: '01K9ZZZZZZZZZZZZZZZZZZZZZZ', entity_id: 'subj:1', attribute: ':j01/f0', value_type: 'string', value_string: 'v1-0',
  value_number: null, value_boolean: null, value_datetime: null, value_json: null, recorded_at: 1_762_560_000_000, recorded_position: 7,
  valid_from: 1_762_560_000_000, valid_to: null, created_by: null, retracted_at: null, retracted_position: null, retract_tx_id: null,
  entity_type: 'j01-subject', schema_version: 1, tx_id: '_tx/01K9ZZZZZZZZZZZZZZZZZZZZZZ', ...over,
});
const n = (r, e) => qlever.encodedRowFields(r, e).length;
const data = row({}), change = row({ attribute: ':_tx/change', value_type: 'json', value_string: null, value_json: '{}', entity_type: '_Transaction' });
const position = row({ attribute: ':_tx/position', value_type: 'number', value_string: null, value_number: 7, entity_type: '_Transaction' });
const instant = row({ attribute: ':_tx/instant', value_type: 'datetime', value_string: null, value_datetime: 1_762_560_000_000, entity_type: '_Transaction' });
const text = row({ attribute: ':_tx/command-id', entity_type: '_Transaction' });
const bookkeeping = { claim: 4, operation: 3, meta: 2 };
const command = (e, { journal = 'facts', bk = 9 } = {}) =>
  10 * n(data, e) + (journal === 'facts' ? 10 * n(change, e) + n(position, e) + n(instant, e) + 2 * n(text, e) : journal === 'record' ? n(change, e) : 0) + bk;
const layouts = {
  'A0': command('a0'),
  'compact (built)': command('compact'),
  'bound: A0 channels, no journal at all': command('a0', { journal: 'none' }),
  'H2: compact + journal as one record subject (read-path work)': command('compact', { journal: 'record' }),
  'H3: H2 + claim and operation on the record subject (+2 channels)': command('compact', { journal: 'record', bk: bookkeeping.meta + 2 }),
  'bound: compact channels, no journal at all': command('compact', { journal: 'none' }),
};
const out = { perFact: { a0: { string: n(data, 'a0'), number: n(position, 'a0') }, compact: { string: n(data, 'compact'), number: n(position, 'compact') } }, layouts: Object.fromEntries(Object.entries(layouts).map(([k, v]) => [k, { triples: v, ratioVsA0: Math.round((layouts.A0 / v) * 100) / 100 }])) };
const receipt = writeReceipt('qlever-designs-probe', out);
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
