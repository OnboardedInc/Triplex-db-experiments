import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Effect } from 'effect';
import { HostLog } from './round4/sources/broker/packages/qlever/src/broker/log.js';
import { LogFeed } from './round4/sources/broker/packages/qlever/src/broker/feed.js';
import { encodeCommitGroup } from './round4/sources/broker/packages/qlever/src/broker/frames.js';
import { FrameKind } from './round4/sources/broker/packages/qlever/src/broker/frame.js';
import { makeXtdbStorageAdapter } from './round4/sources/p2x/packages/xtdb/src/XtdbStorageAdapter.js';
import { makeXtdbCommitFeed } from './round4/sources/p2x/packages/xtdb/src/CommitFeed.js';
import { metadataInputs as v1 } from '../../../packages/core/src/store/transactionMetadata.js';
import { metadataInputs as v2 } from './round4/sources/rt01/packages/core/src/store/transactionMetadata.js';

// [CX-VDF01-R4] Why: compare actual independent encoders/projectors against explicit expected application IDs.
// Rejected: reimplementing isJournalRow in the oracle (would bless the same filtering defect three times).
const out = process.env.CX_VDF01_OUTPUT!;
const tx = (n: number) => `_tx/${String(n).padStart(26, '0')}`;
let serial = 0;
const row = (extra: any = {}) => ({ id: `f${++serial}`, entity_id: 'order:1', attribute: ':status',
  value_type: 'string', value_string: 'open', value_number: null, value_boolean: null, value_datetime: null, value_json: null,
  recorded_at: 4000, recorded_position: 4, valid_from: 100, valid_to: null, created_by: null,
  retracted_at: null, retracted_position: null, retract_tx_id: null, entity_type: 'Order', schema_version: 1, tx_id: tx(4), ...extra });
const header = (n = 4) => row({ entity_id: tx(n), entity_type: '_Transaction', attribute: ':_tx/position', value_type: 'number', value_string: null, value_number: n, recorded_position: n, tx_id: tx(n) });
const cases: any[] = [];
const add = (name: string, rows: any[], expected: any[], positions = [4], legacySchema = false) => cases.push({ name, rows, expectedIds: expected.map(r => r.id), positions, txIds: positions.map(tx), legacySchema });
const a = row(), prefix = row({ entity_id: '_tx/custom', attribute: '_txNote', entity_type: 'Label' });
const wrongType = row({ entity_id: tx(4), attribute: ':_tx/change', entity_type: 'Order' });
add('mixed-and-prefixes', [header(), a, prefix, wrongType], [a, prefix, wrongType]);
const other = row({ entity_id: tx(3), entity_type: '_Transaction', attribute: ':_tx/change' });
add('different-transaction-subject', [header(), other], [other]);
const absent = row({ entity_id: tx(4), entity_type: null, attribute: ':_tx/change' });
add('missing-row-type', [header(), absent], [absent]);
const legacyHeader = { ...header(), entity_type: null }, legacyApp = row({ entity_type: null });
add('before-schema-type-existed', [legacyHeader, legacyApp], [legacyHeader, legacyApp], [4], true);
const nullTx = row({ entity_id: tx(4), entity_type: '_Transaction', tx_id: null });
add('null-assertion-transaction', [header(), nullTx], [nullTx]);
const grouped = row();
add('earlier-journal-member', [header(), header(3), grouped], [grouped], [3, 4]);
add('journal-only', [header()], []);
const old = row({ recorded_position: 1, recorded_at: 1000, tx_id: tx(1), retracted_at: 4000, retracted_position: 4, retract_tx_id: tx(4) });
add('retract-only-application', [header(), old], [old]);
const oldJournal = { ...old, id: `f${++serial}`, entity_id: tx(1), entity_type: '_Transaction', attribute: ':_tx/change' };
add('retract-old-journal', [header(), oldJournal], []);
for (const [name, encoder] of [['v1', v1], ['v2', v2]] as const) {
  const app = row();
  const change = { op: 'assert', tripleId: app.id, entityId: app.entity_id, attribute: app.attribute, entityType: 'Order', value: { type: 'string', value: 'open' }, validFrom: 100, recordedAt: 4000, assertionTxId: tx(4) };
  const inputs = (encoder as any)(tx(4), 4, 4000, { actor: 'review-client', commandId: 'cmd4' }, [change], 4000);
  const journal = inputs.map((input: any) => row({ entity_id: input.entityId, entity_type: input.entityType, attribute: input.attribute,
    valid_from: input.validFrom ?? 4000, value_type: input.value.type, value_string: ['string', 'ref'].includes(input.value.type) ? input.value.value : null,
    value_number: input.value.type === 'number' ? input.value.value : null, value_datetime: input.value.type === 'datetime' ? input.value.value : null, value_json: input.value.type === 'json' ? JSON.stringify(input.value.value) : null }));
  const json = journal.find((r: any) => r.attribute === ':_tx/change');
  expect(JSON.parse(json.value_json).v).toBe(name === 'v2' ? 2 : undefined);
  expect(journal.some((r: any) => r.attribute === ':_tx/instant')).toBe(name === 'v1');
  add(`actual-${name}-journal-encoder`, [...journal, app], [app]);
}
const normalize = (changes: any[]) => changes.map(c => [c.op, c.entity, c.attribute, c.validFrom, c.validTo, Number(c.position)]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const expected = (c: any) => normalize(c.rows.filter((r: any) => c.expectedIds.includes(r.id)).map((r: any) => ({ op: r.retracted_position === null ? 'assert' : 'retract', entity: r.entity_id, attribute: r.attribute, validFrom: r.valid_from, validTo: r.valid_to, position: r.retracted_position ?? r.recorded_position })));
const results: any[] = [];
it('runs broker and P2X writer plus exact feed on the shared mixed fixtures', async () => {
  fs.writeFileSync(path.join(out, 'fixture.json'), JSON.stringify(cases, null, 2) + '\n', { flag: 'wx' });
  const { log } = await HostLog.open(path.join(out, 'broker'));
  try {
    const feed = new LogFeed(log.dir);
    let cursor = feed.start();
    for (const [i, c] of cases.entries()) {
      const payload = { v: 1, stream: 'r4-shared', lsn: log.nextLsn, epoch: log.epoch, members: [{ operationId: c.name, attemptId: `attempt-${i}`, positions: c.positions,
        claims: [], rows: c.rows, priors: c.rows.filter((r: any) => r.retracted_position !== null).map((r: any) => ({ ...r, retracted_at: null, retracted_position: null, retract_tx_id: null })), subjects: [] }] };
      const frame = await log.append(FrameKind.COMMIT_GROUP, encodeCommitGroup(payload as any));
      log.publishWatermark({ epoch: frame.epoch, lsn: frame.lsn, position: 4 });
      const page = feed.poll(cursor); cursor = page.cursor;
      const commits = page.resolutions.filter(r => r.kind === 'commit');
      expect(commits).toHaveLength(1);
      const broker = (commits[0] as any).transacts[0];
      expect(normalize(broker.changes)).toEqual(expected(c));
      expect([...broker.positions].sort()).toEqual(c.positions);
      expect([...broker.txIds].sort()).toEqual([...c.txIds].sort());
      let carrier: any, metadata: any;
      const stamp = 1577836800000000 + 100000 + i * 10;
      const queryTrace: any[] = [];
      const client = {
        query: async (sql: string, params: any[]) => {
          queryTrace.push({ sql, params });
          if (sql.includes('source_log_msgs')) return [{ msg_id: 100, msg_type: 'tx' }];
          if (sql.includes('FROM xt.txs')) return [{ _id: 100, committed: true, stamp, user_metadata: metadata }];
          if (sql.includes('FROM tx_feed')) return [{ _id: carrier[0], command_ids: carrier[9], changes: carrier[10] }];
          if (sql.includes('SELECT stamp FROM tx_attempts')) return [{ stamp }];
          if (sql.includes('FROM tx_meta')) return [{ position: 2 }];
          if (sql.includes('FROM tx_assertions')) return c.rows.filter((r: any) => r.retracted_position !== null).map((r: any) => ({ ...r, retracted_at: null, retracted_position: null, retract_tx_id: null }));
          throw new Error(`Unexpected offline query ${sql}`);
        },
        submit: async (statements: any[], options: any) => {
          metadata = options.metadata;
          const feed = statements.filter(s => s.sql.startsWith('INSERT INTO tx_feed '));
          expect(feed).toHaveLength(1);
          carrier = feed[0].params;
          return {};
        },
      };
      const adapter = makeXtdbStorageAdapter(client as any, `r4/${c.name}`, { commitPath: 'subject-stamp' });
      await Effect.runPromise(adapter.withTransaction(Effect.gen(function* () {
        const positions = new Map<number, number>();
        for (const p of c.positions) positions.set(p, yield* adapter.nextCommitPosition());
        for (const r of c.rows) {
          if (r.retracted_position !== null) {
            expect(yield* adapter.retract(r.id, r.retracted_at, r.retract_tx_id, positions.get(r.retracted_position)!)).toBe(true);
          } else {
            const value = { type: r.value_type, value: r.value_type === 'json' ? JSON.parse(r.value_json) : r.value_type === 'number' ?
              (r.attribute === ':_tx/position' && r.entity_type === '_Transaction' ? positions.get(r.value_number) ?? r.value_number : r.value_number) : r.value_type === 'datetime' ? r.value_datetime : r.value_string };
            yield* adapter.insert({ entityId: r.entity_id, attribute: r.attribute, entityType: r.entity_type ?? undefined, value, validFrom: r.valid_from, validTo: r.valid_to ?? undefined } as any, r.tx_id, r.recorded_at, r.id, positions.get(r.recorded_position)!);
          }
        }
      })));
      expect(carrier).toBeDefined();
      const p2x = await makeXtdbCommitFeed(client as any, `r4/${c.name}`).poll({ msgId: 100, processed: false }, { exact: true });
      expect(p2x.blocked).toBe(false); expect(p2x.resolutions).toHaveLength(1);
      const resolution = p2x.resolutions[0]!;
      const changes = resolution.changes!.map(change => ({ ...change, position: c.positions[change.ordinal] }));
      expect(normalize(changes)).toEqual(expected(c));
      expect(resolution.transacts.map(t => c.positions[t.ordinal])).toEqual(c.positions);
      expect(JSON.parse(carrier[8]).sort()).toEqual([...c.txIds].sort());
      results.push({ name: c.name, expected: expected(c), broker, p2x, carrier, queryTrace, normalized: normalize(changes) });
      fs.writeFileSync(path.join(out, 'typescript-results.json'), JSON.stringify(results, null, 2) + '\n');
    }
  } finally { await log.close(); }
  expect(results).toHaveLength(11);
});
