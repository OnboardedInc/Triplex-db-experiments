// [CX-VP3M] Why: hold a real sidecar write lock across the publication hook.
// Rejected: sleeping before the hook (that tests late capture rather than record persistence).
import { workerData, parentPort } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(workerData.file);
db.exec('BEGIN IMMEDIATE');
parentPort.postMessage('locked');
await new Promise(resolve => setTimeout(resolve, workerData.ms));
db.exec('COMMIT');
db.close();
parentPort.close();
