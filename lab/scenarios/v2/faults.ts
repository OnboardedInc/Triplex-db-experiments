// [EXP-W02-R2] Why: offline schedules change durable memory-store state across client/consumer restarts.
// Rejected: checking a list of fault names without interrupting and resuming the affected path.
import { W0, canonical, V_W0, visibleRows, type WorldRow } from '../../bench/lib/w0-world.ts';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
import { Probe, rows, baseFacts } from './probe.ts';
// @ts-ignore -- fresh independent oracle operation.
import { runDomain } from '../lib/domain.mjs';
export const CRASH_POINTS = ['before-effect', 'after-effect-before-checkpoint', 'after-checkpoint', 'after-enqueue-before-delivery'] as const;
export async function consumerFault(probe: Probe, crash: typeof CRASH_POINTS[number], reopen: () => CompositionHandle) {
  if ((await probe.comp.currentPosition()) === 0) await probe.commit(rows(baseFacts('pl:p')));
  await probe.set('jur:a', 'stateMinWageCents', 1850);
  const output = await probe.domain('pl:p');
  const input = { state: { items: [], pending: [], subjects: [] }, evaluations: [{ basis: output.basis, release: output.release, subject: output.subject, workItems: output.workItems }] };
  const oracle = runDomain('publish', canonical(input));
  const publication = W0.runOpBytes('publish', Buffer.from(canonical(input)));
  probe.equal('publication-content', publication, oracle.outputBytes);
  const published = JSON.parse(publication), deliveries = published.deliveries;
  if (!deliveries.length) throw Error('fault fixture has no delivery witness');
  const position = await probe.comp.currentPosition();
  await probe.set('gs:outbox', 'frame', canonical({ state: published.state, deliveries, position }));
  await probe.set('gs:receiver', 'state', canonical({ effects: [], projection: [] }));
  await probe.set('gs:consumer', 'checkpoint', '0');
  let active = probe.comp, stopped = false;
  const events: any[] = [];
  const read = async (entity: string, attribute: string) => {
    const P = await active.currentPosition();
    const p = await active.sweepPage([entity], { position: P, validAt: V_W0 });
    const row = p.rows.find(r => r.attribute === attribute);
    if (!row) throw Error('missing persisted fault state');
    return JSON.parse(row.value.value);
  };
  const hit = async (point: typeof crash) => {
    events.push({ point, phase: stopped ? 'resumed' : 'first', position: await active.currentPosition() });
    if (point === crash && !stopped) {
      stopped = true; await active.close(); active = reopen();
      if (active.scopeName !== probe.comp.scopeName || active.backend.url !== probe.comp.backend.url) throw Error('restart switched source');
      probe.comp = active;
      throw Error('SIMULATED-STOP');
    }
  };
  const consume = async () => {
    const checkpoint = await read('gs:consumer', 'checkpoint');
    if (checkpoint === 1) return;
    const frame = await read('gs:outbox', 'frame');
    await hit('after-enqueue-before-delivery'); await hit('before-effect');
    const input = { state: await read('gs:receiver', 'state'), deliveries: frame.deliveries };
    const expected = runDomain('receive', canonical(input));
    const received = W0.runOpBytes('receive', Buffer.from(canonical(input)));
    probe.equal('receiver-content', received, expected.outputBytes);
    await probe.set('gs:receiver', 'state', canonical(JSON.parse(received).state));
    await hit('after-effect-before-checkpoint');
    await probe.set('gs:consumer', 'checkpoint', '1');
    await hit('after-checkpoint');
  };
  try { await consume(); } catch (error) { if (String((error as Error).message) !== 'SIMULATED-STOP') throw error; }
  if (!stopped) throw Error('requested fault never executed');
  await consume();
  const final = await read('gs:receiver', 'state');
  const expected = JSON.parse(runDomain('receive', canonical({ state: { effects: [], projection: [] }, deliveries })).outputBytes).state;
  probe.equal('exactly-once-visible-effects', canonical(final), canonical(expected));
  probe.equal('checkpoint-resumed', await read('gs:consumer', 'checkpoint'), 1);
  await probe.state('gs:receiver'); await probe.state('gs:consumer'); await probe.state('gs:outbox');
  return { classification: 'OFFLINE-FAULT-MODEL', crash, events, effects: final.effects.length, deliveryKeys: deliveries.map((d: any) => [d.id, d.seq]) };
}
export class FeedReplica {
  watermark = 0;
  private rows: WorldRow[] = [];
  readonly events: any[] = [];
  readonly source: CompositionHandle;
  constructor(source: CompositionHandle) { this.source = source; }
  async rebuild(between?: () => Promise<void>) {
    const head = await this.source.currentPosition(), rows = new Map<string, WorldRow>();
    let after = 0;
    while (after < head) {
      const page = await this.source.feedPage(after, 64);
      const txs = page.transactions.filter(t => t.position <= head);
      if (!txs.length) throw Error('rebuild feed gap');
      for (const tx of txs) for (const c of tx.changes) {
        if (c.op === 'assert') rows.set(c.tripleId, { id: c.tripleId, entityId: c.entityId, attribute: c.attribute, value: c.value,
          position: tx.position, validFrom: c.validFrom, ...(c.validTo == null ? {} : { validTo: c.validTo }) });
        else { const r = rows.get(c.tripleId); if (!r) throw Error('rebuild orphan retraction'); rows.set(c.tripleId, { ...r, retractedPosition: tx.position }); }
      }
      after = txs.at(-1)!.position;
    }
    if (between) await between();
    this.rows = [...rows.values()]; this.watermark = head;
    this.events.push({ kind: 'memory-index-rebuild', watermark: head, assertions: rows.size });
  }
  async read(subject: string, P: number, validAt = V_W0) {
    if (P > this.watermark) {
      this.events.push({ kind: 'fallback', requested: P, watermark: this.watermark, waitedMs: 0 });
      return (await this.source.sweepPage([subject], { position: P, validAt })).rows;
    }
    const visible = visibleRows(this.rows, { position: P, validAt }), selected: WorldRow[] = [], seen = new Set([subject]);
    for (const e of seen) for (const r of visible.filter(r => r.entityId === e)) {
      selected.push(r); if (r.value.type === 'ref') seen.add(r.value.value);
    }
    return selected;
  }
}
export async function lostAck(probe: Probe, reopen: () => CompositionHandle, operations: readonly any[]) {
  const first = await probe.commit(operations, 'lost-ack');
  if (!first.ok) throw Error(first.tag);
  // The client loses the ACK after publication, closes, and resolves by commandId on a replacement handle.
  const scope = probe.comp.scopeName, endpoint = probe.comp.backend.url;
  await probe.comp.close(); const replacement = reopen();
  if (replacement.scopeName !== scope || replacement.backend.url !== endpoint) throw Error('lost-ACK restart switched source');
  probe.comp = replacement;
  const lookup = await replacement.transactionByCommand('lost-ack');
  if (!lookup.ok || !lookup.value) throw Error('lost ACK cannot be resolved');
  probe.equal('lost-ack-original-tx', lookup.value.txId, first.value.txId);
  probe.equal('lost-ack-original-position', lookup.value.position, first.value.position);
  const retry = await replacement.transact(operations, { commandId: 'lost-ack' });
  if (retry.ok || retry.tag !== 'CommandAlreadyCommittedError') throw Error('retry committed twice');
  return { first: first.value.position, resolved: lookup.value.position, retry: retry.tag };
}
