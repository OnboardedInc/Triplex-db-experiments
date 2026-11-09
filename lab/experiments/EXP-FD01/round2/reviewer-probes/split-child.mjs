// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const [file, input, arm, point] = process.argv.slice(2);
const { page, affected } = JSON.parse(fs.readFileSync(input, 'utf8'));
// [CX-VFD01] Why: a keyed split consumer can recover without duplicates while violating Q98b.
// Rejected: an unkeyed split alone (confounds idempotence with transaction atomicity).
const db = new DatabaseSync(file);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON;
  PRAGMA checkpoint_fullfsync=ON; PRAGMA wal_autocheckpoint=0;
  CREATE TABLE IF NOT EXISTS effects(epoch TEXT,position TEXT,subject TEXT${arm === 'keyed-atomic' ? ',PRIMARY KEY(epoch,position,subject)' : ''});
  CREATE TABLE IF NOT EXISTS affected(epoch TEXT,position TEXT,subject TEXT,PRIMARY KEY(epoch,position,subject));
  CREATE TABLE IF NOT EXISTS checkpoint(source TEXT,token TEXT);`);
const crash = (at) => { if (point === at) process.exit(77); };
if (!db.prepare('SELECT token FROM checkpoint').get()) {
  crash('before-effect');
  db.exec('BEGIN IMMEDIATE');
  for (const a of affected) {
    db.prepare('INSERT OR IGNORE INTO effects VALUES(?,?,?)').run(a.epoch, a.position, a.subject);
    db.prepare('INSERT OR IGNORE INTO affected VALUES(?,?,?)').run(a.epoch, a.position, a.subject);
  }
  db.exec('COMMIT');
  crash('after-effect');
  // Deliberately a SECOND durable transaction, even on the arm labelled keyed-atomic by testkit.
  db.exec('BEGIN IMMEDIATE');
  db.prepare('INSERT INTO checkpoint VALUES(?,?)').run(page.cursor.source, page.cursor.token);
  db.exec('COMMIT');
  crash('after-checkpoint');
}
db.close();
