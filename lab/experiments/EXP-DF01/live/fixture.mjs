// [EXP-DF01] Why: the live and offline drivers consume identical fixture bytes. Rejected: a second hand-copied offline row (would miss fixture drift).
export const assertionRow = Object.freeze({
  id: 'fact-1', entity_id: 'subject', attribute: 'status', value_type: 'string',
  value_string: 'synthetic-value', value_number: null, value_boolean: null, value_datetime: null,
  value_json: null, recorded_at: 7000, recorded_position: 1, valid_from: 0, valid_to: 20,
  created_by: null, retracted_at: null, retracted_position: null, retract_tx_id: null,
  entity_type: null, schema_version: 1, tx_id: 'tx1',
});
