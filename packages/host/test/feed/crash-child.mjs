import { SqliteConsumerStore } from "@triplex-build/triplex-host/feed";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
const [file, input, arm, point] = process.argv.slice(2);
const { page, affected } = JSON.parse(fs.readFileSync(input, "utf8"));
// [EXP-FD01] Why: exit at a hook leaves SQLite to recover without JS rollback/close.
// Rejected: throwing in the test process (tests our finally block, not crash recovery).
const crash = (at) => {
  if (at === point) process.exit(77);
};
if (arm === "keyed-atomic") {
  const store = new SqliteConsumerStore(file);
  const checkpoint = store.checkpoint("c");
  if (checkpoint?.token !== page.cursor.token) store.apply("c", checkpoint, page, affected, crash);
  store.close();
} else {
  const db = new DatabaseSync(file);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA checkpoint_fullfsync=ON; PRAGMA wal_autocheckpoint=0; PRAGMA journal_size_limit=16777216; PRAGMA locking_mode=NORMAL; CREATE TABLE IF NOT EXISTS effects(epoch TEXT,position TEXT,subject TEXT); CREATE TABLE IF NOT EXISTS checkpoint(token TEXT);",
  );
  if (!db.prepare("SELECT token FROM checkpoint").get()) {
    crash("before-effect");
    db.exec("BEGIN IMMEDIATE");
    for (const a of affected)
      db.prepare("INSERT INTO effects VALUES(?,?,?)").run(a.epoch, a.position, a.subject);
    db.exec("COMMIT");
    crash("after-effect");
    db.prepare("INSERT INTO checkpoint VALUES(?)").run(page.cursor.token);
    crash("after-checkpoint");
  }
  db.close();
}
