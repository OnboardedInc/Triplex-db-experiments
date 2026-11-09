// [CX-VP3M] Why: independently inject defects at source, sidecar, transport and reader boundaries.
// Rejected: changing the implementation or representing edited lag samples as real scheduling tests.
import fs from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { openSourceRecorder, sleep } from '../../bench/lib/p3.mjs';
const file = c => path.join(c.attemptDir, 'review-source.json');
const read = c => JSON.parse(fs.readFileSync(file(c), 'utf8'));
const write = (c, state) => {
  fs.writeFileSync(file(c) + '.tmp', JSON.stringify(state));
  fs.renameSync(file(c) + '.tmp', file(c));
};
export async function prepare(c) {
  const recorder = openSourceRecorder(c);
  const state = { entries: [], resolutions: [], publications: [], truth: [], cursor: { after: 0 } };
  write(c, state);
  return {
    async runWriter() {
      const acks = [];
      for (let n = 1; n <= 4; n++) {
        const key = { source: c.source, stream: c.stream, epoch: '0', position: String(n) };
        const change = { op: 'assert', entity: `subject-${n}`, attribute: ':test/id', validFrom: 0, validTo: null, position: String(n), assertionId: `a-${n}` };
        const tx = { positions: [String(n)], operationId: `tx-${n}`, txIds: [`tx-${n}`], commandIds: [`cmd-${n}`], stamp: null, stampStatus: 'pending-RT01', changes: [change] };
        if (c.duplicatePosition && n === 2) { tx.positions = ['1']; tx.changes[0].position = '1'; key.position = '1'; }
        let lockExit;
        if (c.recordLockMs) {
          const lock = new Worker(new URL('./record-lock.mjs', import.meta.url), { workerData: { file: c.publicationFile, ms: c.recordLockMs } });
          lockExit = new Promise((resolve, reject) => {
            lock.on('error', reject);
            lock.on('exit', code => code === 0 ? resolve() : reject(Error(`record lock exited ${code}`)));
          });
          await new Promise((resolve, reject) => { lock.once('message', resolve); lock.once('error', reject); });
        }
        state.entries.push({ kind: 'commit', stream: c.stream, epoch: '0', offset: String(n), transactions: [tx] });
        state.resolutions.push({ kind: 'commit', epoch: 0, lsn: n, transacts: [{ positions: tx.positions.map(Number), operationId: tx.operationId, txIds: tx.txIds, commandIds: tx.commandIds, changes: tx.changes.map(x => ({ ...x, position: Number(x.position) })) }] });
        // Source readability precedes optional late observer/sidecar capture. The independent truth survives.
        const actualAtNs = String(process.hrtime.bigint());
        state.truth.push({ key, actualAtNs });
        state.cursor = { after: n };
        write(c, state);
        if (c.lateRecordMs) await sleep(c.lateRecordMs);
        if (!(c.missingInstant && n === 2)) {
          state.publications.push(recorder.published(key, `tx-${n}`, { kind: 'watermarkAt', burst: n >= 3 }));
        }
        if (lockExit) await lockExit;
        write(c, state);
        if (n !== 2) acks.push({ commandId: `cmd-${n}`, epoch: '0', position: key.position, txId: `tx-${n}` });
        await sleep(c.writerPauseMs ?? 20);
      }
      state.entries.push({ kind: 'aborted', stream: c.stream, epoch: '0', offset: '5' });
      state.resolutions.push({ kind: 'aborted', epoch: 0, lsn: 5 });
      state.cursor = { after: 5 };
      write(c, state);
      if (c.phantomAck) acks.push({ commandId: 'never-published', epoch: '0', position: '999', txId: 'absent' });
      return acks;
    },
    async finalPrefix() {
      const snapshot = read(c);
      return { runId: c.runId, source: c.source, stream: c.stream,
        entries: snapshot.entries.filter(e => !(c.commonOmission && e.offset === '2')),
        publications: snapshot.publications.filter(p => !(c.commonOmission && p.key.position === '2')),
        cursor: { source: c.source, token: JSON.stringify(snapshot.cursor) } };
    },
    async close() { recorder.close(); },
  };
}
export async function openFeed(c) {
  return {
    broker: { transport: 'reader-worker', async request(r) {
      let state = read(c);
      const next = state.resolutions.find(x => x.lsn > r.cursor.after);
      if (!next) return { cursor: { after: r.cursor.after }, resolutions: [] };
      const n = next.lsn;
      const meta = state.publications.find(p => p.key.position === String(n));
      // Keep a late sidecar race deterministic: only delivery waits; independent source reads already see it.
      if (next.kind === 'commit' && !meta && !(c.missingInstant && n === 2))
        return { cursor: { after: r.cursor.after }, resolutions: [] };
      if (c.deliveryDelayMs && next.kind === 'commit') {
        const deadline = BigInt(meta.watermarkAt) + BigInt(c.deliveryDelayMs[n - 1]) * 1000000n;
        const remaining = Number(deadline - process.hrtime.bigint()) / 1e6;
        if (remaining > 0) await sleep(remaining);
      }
      const skip = (c.deliveryHole || c.commonOmission) && n === 2;
      return { cursor: { after: n }, resolutions: skip ? [] : [next] };
    } },
    async affected(page) { return page.entries.flatMap(e => e.kind === 'commit' ? e.transactions.flatMap(t => t.changes.map(x => ({ epoch: e.epoch, position: x.position, subject: x.entity }))) : []); },
    async isBurst(key) { return read(c).publications.find(p => p.key.position === key.position).burst; },
    async close() {},
  };
}
export async function openReader(c, id) {
  let pulls = 0;
  return {
    async pull() {
      pulls++;
      if (id === 0 && pulls === 2 && c.readerExit) process.exit(0);
      if (id === 0 && pulls === 2 && c.readerError) throw Error('planted reader failure');
      if (id === 0 && pulls === 2 && c.readerHang) await new Promise(() => {});
      if (pulls === 2 && c.readerDelayMs) await sleep(c.readerDelayMs);
      const snapshot = read(c);
      await sleep(1);
      return snapshot;
    },
    async close() {},
  };
}
