import { registerHooks } from "node:module";
import { splitTransaction } from "../../../../lab/experiments/EXP-FD01/round2/reviewer-probes/mutate.mjs";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createHash } from "node:crypto";
const [file, input, arm, point] = process.argv.slice(2);
const { page, affected } = JSON.parse(fs.readFileSync(input, "utf8"));
// [EXP-FD01] Why: exit at a hook leaves SQLite to recover without JS rollback/close.
// Rejected: throwing in the test process (tests our finally block, not crash recovery).
const trace = { arm, point, input, commitEvents: [], methodSha256: null };
const saveTrace = () => fs.writeFileSync(`${file}.${point}.trace.json`, JSON.stringify(trace));
const crash = (at) => {
  if (at === point) {
    saveTrace();
    process.exit(77);
  }
};
if (arm === "keyed-split")
  registerHooks({
    load(url, context, next) {
      const result = next(url, context);
      if (/\/feed\/ConsumerStore\.(js|ts)$/.test(url))
        return { ...result, source: splitTransaction(String(result.source)) };
      return result;
    },
  });
const { SqliteConsumerStore } = await import("@triplex-build/triplex-host/feed");
if (arm !== "unkeyed-split") {
  const method = String(SqliteConsumerStore.prototype.apply);
  trace.methodSha256 = createHash("sha256").update(method).digest("hex");
  if (arm === "keyed-split" && !method.includes("COMMIT; BEGIN IMMEDIATE"))
    throw Error("Split mutation did not load");
  const store = new SqliteConsumerStore(file);
  // [EXP-FD01-R2] Why: stop on actual SQLite commits, including the reviewer's compound COMMIT; BEGIN.
  // Rejected: adding another application hook that a split can fall between (QA F1).
  const exec = DatabaseSync.prototype.exec;
  let commits = 0;
  DatabaseSync.prototype.exec = function (sql) {
    if (!/\bCOMMIT\b/i.test(sql)) return exec.call(this, sql);
    for (const statement of sql.split(";").filter((s) => s.trim())) {
      const commit = /^\s*COMMIT\s*$/i.test(statement);
      if (commit) trace.commitEvents.push({ phase: "before", index: commits, statement });
      if (commit && commits === 0) crash("before-commit");
      exec.call(this, statement);
      if (commit) trace.commitEvents.push({ phase: "after", index: commits, statement });
      if (commit && commits++ === 0) crash("after-commit");
    }
  };
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
