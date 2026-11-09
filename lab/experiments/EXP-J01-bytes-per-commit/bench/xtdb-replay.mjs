// EXP-J01 XTDB replay helpers: classify the statements one Triplex commit submits, rebuild variants of
// them, and size each variant's source-log record in a fresh replay scope of the same key length (so
// every value keeps its byte length and the replay of the unchanged statements is byte-identical to
// the real record).
import { randomUUID } from 'node:crypto';
import { URLS, measuringXtdbClient, runtimeApi } from './lib.mjs';

export const COLS = ['_id', 'scope_key', 'id', 'entity_id', 'attribute', 'value_type', 'value_string', 'value_number', 'value_boolean', 'value_datetime', 'value_json', 'recorded_at', 'recorded_position', 'valid_from', 'valid_to', 'created_by', 'retracted_at', 'retracted_position', 'retract_tx_id', 'entity_type', 'schema_version', 'tx_id', 'value_identity'];
export const col = (name) => COLS.indexOf(name);
export const kindOf = (sql) =>
  sql.startsWith('ASSERT (SELECT COALESCE(MAX(position)') ? 'assert-cas'
    : sql.includes("'triplex-operation-duplicate'") ? 'assert-operation'
      : sql.includes("'triplex-command-conflict'") ? 'assert-claim'
        : sql.includes("'triplex-assertion-identity-conflict'") ? 'assert-new-ids'
          : sql.startsWith('INSERT INTO tx_assertions') ? 'insert-assertions'
            : sql.startsWith('INSERT INTO tx_claims') ? 'insert-claims'
              : sql.startsWith('INSERT INTO tx_meta') ? 'insert-meta'
                : sql.startsWith('INSERT INTO tx_attempts') ? 'insert-attempts' : 'other';
export const rowClass = (row) => (row[col('attribute')] === ':_tx/change' ? 'journal-change' : String(row[col('attribute')]).startsWith(':_tx/') ? 'journal-envelope' : 'data');

/** The captured statements of one commit, split into kinds and assertion rows. */
export const dissect = (captured) => {
  const statements = captured.map((s) => ({ ...s, kind: kindOf(s.sql) }));
  const byKind = (k) => statements.filter((s) => s.kind === k).map((s) => ({ ...s }));
  const width = (s) => (s.sql.startsWith('INSERT INTO tx_assertions (_valid_from, ') ? COLS.length : null);
  const rows = statements.filter((s) => s.kind === 'insert-assertions').flatMap((s) => {
    const w = width(s);
    return Array.from({ length: s.params.length / w }, (_v, r) => s.params.slice(r * w, (r + 1) * w));
  });
  return { statements, byKind, rows };
};

export const assertionsInsert = (rows) => ({
  kind: 'insert-assertions',
  sql: `INSERT INTO tx_assertions (_valid_from, ${COLS.join(', ')}) VALUES ${rows.map(() => `(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${COLS.map(() => '?').join(', ')})`).join(', ')}`,
  params: rows.flat(),
});
export const newIdsAssert = (scope, ids) => ({
  kind: 'assert-new-ids',
  sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND id IN (${ids.map(() => '?').join(', ')})), 'triplex-assertion-identity-conflict'`,
  params: [scope, ...ids],
});

/** A replayer bound to the original scope key; each replay runs in its own fresh scope of equal length. */
export const makeReplayer = (originalScope) => {
  const replayClient = measuringXtdbClient(URLS.xtdb);
  replayClient.arm(true);
  const escaped = (s) => JSON.stringify(s).slice(1, -1);
  const sub = (p, scope) => (typeof p === 'string' ? p.split(originalScope).join(scope).split(escaped(originalScope)).join(escaped(scope)) : p);
  const withScope = (stmts, scope) =>
    stmts.map((s) => ({
      ...(s.parameterSyntax ? { parameterSyntax: s.parameterSyntax } : {}),
      sql: s.literalScope ? s.sql.split(originalScope.replaceAll("'", "''")).join(scope.replaceAll("'", "''")) : s.sql,
      params: (s.params ?? []).map((p, i) => (s.kind === 'assert-cas' && i === 1 ? 0 : sub(p, scope))), // fresh scope: CAS on position 0 (same int64 width)
    }));
  const replay = async (name, stmts) => {
    const scope = runtimeApi.DatabaseScope.test(`j01-rp-${randomUUID()}`);
    if (scope.length !== originalScope.length) throw new Error('replay scope length differs');
    await replayClient.client.submit(withScope(stmts, scope));
    const record = replayClient.records.at(-1);
    return { name, recordBytes: record.recordBytes, ops: record.ops };
  };
  return { replay, close: () => replayClient.client.close() };
};
