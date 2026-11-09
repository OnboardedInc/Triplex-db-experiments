import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { splitTransaction } from "../experiments/EXP-FD01/round2/reviewer-probes/mutate.mjs";
const [file, input, arm, point] = process.argv.slice(2),
  data = JSON.parse(fs.readFileSync(input, "utf8"));
// [EXP-DI01] Why: real abrupt process stops expose WAL durability before replay. Rejected: exception-only tests (finally rolls back cleanly).
const trace = {
  arm,
  point,
  inputSha256: createHash("sha256").update(fs.readFileSync(input)).digest("hex"),
  commits: [],
  methodSha256: null,
};
const crash = (at) => {
  if (at === point) {
    fs.writeFileSync(file + ".trace.json", JSON.stringify(trace));
    process.exit(77);
  }
};
if (arm !== "keyed-atomic")
  registerHooks({
    load(url, context, next) {
      const r = next(url, context);
      if (/\/feed\/ConsumerStore\.js$/.test(url)) {
        const needle = 'crash?.("after-effect");';
        const source =
          arm === "keyed-split"
            ? splitTransaction(String(r.source))
            : String(r.source).replace(
                needle,
                'this.db.exec("COMMIT; BEGIN IMMEDIATE");\n' + needle,
              );
        return { ...r, source };
      }
      return r;
    },
  });
const { DependencyIndex, SqliteConsumerStore } =
  await import("../../packages/host/dist/feed/index.js");
const store = new DependencyIndex(file, {
  ...data.options,
  readRefs: async () => data.refs,
  resolveActivation: () => data.options.initialRelease,
});
trace.methodSha256 = createHash("sha256")
  .update(String(SqliteConsumerStore.prototype.apply))
  .digest("hex");
if (
  arm !== "keyed-atomic" &&
  !String(SqliteConsumerStore.prototype.apply).includes("COMMIT; BEGIN IMMEDIATE")
)
  throw Error("Mutation not loaded");
const exec = DatabaseSync.prototype.exec;
let commits = 0;
DatabaseSync.prototype.exec = function (sql) {
  if (!/\bCOMMIT\b/i.test(sql)) return exec.call(this, sql);
  for (const statement of sql.split(";").filter((s) => s.trim())) {
    const commit = /^\s*COMMIT\s*$/i.test(statement);
    if (commit) trace.commits.push({ phase: "before", index: commits });
    if (commit && commits === 0) crash("before-commit");
    exec.call(this, statement);
    if (commit) trace.commits.push({ phase: "after", index: commits });
    if (commit && commits++ === 0) crash("after-commit");
  }
};
if (arm === "unkeyed-split") {
  exec.call(
    store.db,
    "CREATE TABLE IF NOT EXISTS unkeyed_effects(consumer TEXT,epoch TEXT,position TEXT,subject TEXT)",
  );
  const prepare = DatabaseSync.prototype.prepare;
  DatabaseSync.prototype.prepare = function (sql) {
    // [EXP-DI01] Why: reproduce effects without delivery or effect keys, leaving the index and checkpoint path identical. Rejected: a counter manufactured in the parent.
    if (sql === "INSERT OR IGNORE INTO deliveries VALUES(?,?,?,?,?)") return { run: () => {} };
    if (sql === "INSERT OR IGNORE INTO effects VALUES(?,?,?,?)") {
      const keyed = prepare.call(this, sql),
        unkeyed = prepare.call(this, "INSERT INTO unkeyed_effects VALUES(?,?,?,?)");
      return {
        run: (...args) => {
          unkeyed.run(...args);
          return keyed.run(...args);
        },
      };
    }
    return prepare.call(this, sql);
  };
}
if (store.checkpoint("c")?.token !== data.page.cursor.token)
  await store.consume(store.checkpoint("c"), data.page, crash);
store.close();
