// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Reuse the exact bounded public fixture and request schedule. The original
// measurement-only checks remain; these additional checks qualify only genuine
// pending withdrawal, not general active metadata cancellation or performance.
await import('./public-read-stages.mjs');
const artifacts = process.env.TRIPLEX_RUN_ARTIFACTS;
const report = JSON.parse(await readFile(path.join(artifacts, 'report.json')));
assert.equal(report.status, 'PASS_DIAGNOSTIC_ORACLES_ONLY');
assert.equal(report.cancellation.classification, 'QUEUED_BEHIND_ACCEPTED_WORK');
const bytes = await readFile(path.join(artifacts, 'stages.jsonl'));
const events = bytes.toString().trim().split('\n').map(JSON.parse);
const cancelled = events.filter(event => event.requestId === 'burst-15-cancel');
const accepted = cancelled.filter(event => event.event === 'backend-queue-submit');
const settled = cancelled.filter(event => event.event === 'backend-queue-settle');
const native = cancelled.filter(event => event.event === 'port-dispatch');
assert.equal(accepted.length, 1);
assert(accepted[0].priorPending > 0);
assert.equal(settled.length, 1);
assert.equal(settled[0].error, 'CANCELED_BEFORE_BEGIN');
assert.equal(settled[0].ok, false);
assert.equal(native.length, 0, 'Withdrawn request performed later native work');
assert.equal(cancelled.filter(event => event.event === 'transaction-work-enter').length, 0);
assert.equal(events.filter(event => event.event === 'port-dispatch' && event.method === 'interrupt').length, 0);
assert.equal(report.positionBefore, 2);
assert.equal(report.positionAfter, 2);
assert.equal(report.requests.filter(request => request.status === 'ANSWER_VERIFIED').length, 17);
assert(report.stageAfterScopeRelease.backends.every(backend => backend.pendingTransactions === 0));
assert.equal(report.stageAfterScopeRelease.dropped, 0);
const checks = {
  format: 'triplex-duckdb-queued-withdrawal-checks/1',
  verifiedNormalAnswers: 17,
  expectedCallerCancellations: 1,
  queuedBeforeCancellation: true,
  withdrawalErrorCode: settled[0].error,
  cancelledTicketNativeDispatches: native.length,
  cancelledTicketWorkCallbacks: 0,
  otherPortInterrupts: 0,
  positionBefore: report.positionBefore,
  positionAfter: report.positionAfter,
  applicationWrites: report.applicationWrites,
  pendingAfterDrain: 0,
};
await writeFile(path.join(artifacts, 'withdrawal-checks.json'), JSON.stringify(checks, null, 2) + '\n', { flag: 'wx' });
await writeFile(path.join(artifacts, 'withdrawal-observation.json'), JSON.stringify({
  format: 'triplex-duckdb-queued-withdrawal-observation/1',
  status: 'PASS_GENUINELY_QUEUED_WITHDRAWAL_ONLY',
  checks,
  cancelledTicketEvents: cancelled,
  nativeMethodCounts: Object.fromEntries(['begin', 'commit', 'rollback', 'activateOwnership', 'interrupt'].map(method => [
    method, events.filter(event => event.event === 'port-dispatch' && event.method === method).length,
  ])),
  limitations: [
    'Wrapper dispatch/settlement timing, not engine CPU or throughput.',
    'Standalone metadata already acquiring can still finish after caller interruption; that retained branch is not claimed withdrawn.',
    'Active native interrupt/ACK and current48/142 gates are separate.',
  ],
}, null, 2) + '\n', { flag: 'wx' });
