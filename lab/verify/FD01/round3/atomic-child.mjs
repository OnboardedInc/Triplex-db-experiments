import { DatabaseSync } from 'node:sqlite';
const [file, mode, point] = process.argv.slice(2);
// [CX-VFD01-R2] Why: independently exercise wrong connection ownership and checkpoint ordering.
// Rejected: making the implementation under review produce the expected negative snapshot.
const a = new DatabaseSync(file), b = new DatabaseSync(file);
for (const db of [a,b]) db.exec('PRAGMA busy_timeout=100; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON');
a.exec('CREATE TABLE effects(epoch TEXT,position TEXT,subject TEXT); CREATE TABLE affected(epoch TEXT,position TEXT,subject TEXT); CREATE TABLE checkpoints(source TEXT,token TEXT)');
const stop = (p) => { if (p === point) process.exit(77); };
let commits = 0;
const commit = (db) => { if (commits === 0) stop('before-commit'); db.exec('COMMIT'); if (commits++ === 0) stop('after-commit'); };
const checkpoint = (db, token = '1') => db.prepare('INSERT INTO checkpoints VALUES(?,?)').run('generic/source',token);
const effects = () => { a.exec("INSERT INTO effects VALUES('1','1','subject'); INSERT INTO affected VALUES('1','1','subject')"); };
stop('before-effect');
if (mode === 'two-connections') {
  a.exec('BEGIN'); checkpoint(b); effects(); stop('after-effect'); commit(a);
} else if (mode === 'checkpoint-first-split') {
  b.exec('BEGIN'); checkpoint(b); commit(b); a.exec('BEGIN'); effects(); stop('after-effect'); commit(a);
} else if (mode === 'checkpoint-deferred') {
  a.exec('BEGIN'); effects(); checkpoint(a,'0'); stop('after-effect'); commit(a);
} else if (mode === 'both-begin-immediate') {
  a.exec('BEGIN IMMEDIATE'); b.exec('BEGIN IMMEDIATE');
} else {
  a.exec('BEGIN');
  if (mode === 'checkpoint-first-atomic') checkpoint(a);
  effects(); stop('after-effect');
  if (mode !== 'checkpoint-first-atomic') checkpoint(a);
  commit(a);
}
stop('after-checkpoint'); a.close(); b.close();
