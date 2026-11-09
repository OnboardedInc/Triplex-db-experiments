// [EXP-QH1-R3] Why: the reader worker caches name-to-id and id-to-name lookups across pulls (step 1). They must be dropped when the writer
// epoch or the SQLite schema version changes, the two events after which a dictionary id can mean another name. Rejected: testing only the
// unchanged case (the cache is only correct if its invalidation key actually fires).
import path from "node:path";
import { createRequire } from "node:module";
import { it, expect } from "vitest";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { h1Rows, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
import { append, fresh, row } from "./helpers.js";

const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
// Pulls rotate over the reader pool and each reader keeps its own caches, so one answer per reader (the pool has at most eight) is
// compared: every reader must agree.
const pull = async (log: HostLog, root: string) => {
  const answers: string[][] = [];
  for (let i = 0; i < 8; i++) {
    const answer = await log.wholePull(2048, [root]);
    answers.push([...h1Rows(wholePullTuples(answer), { validAt: 1000 }).keys()].sort());
  }
  for (const a of answers) expect(a).toEqual(answers[0]);
  return answers[0]!;
};

it("reuses cached names while the key is unchanged and drops them when the schema version or the writer epoch changes", async () => {
  const dir = fresh();
  const { log } = await HostLog.open(dir, { minFreeBytes: 0 });
  const raw = new D(path.join(dir, "broker.db"));
  try {
    await append(log, [row(1, "s:0", 2048), row(2, "s:0/a", 2048)]);
    expect(await pull(log, "s:0")).toEqual(["s:0", "s:0/a"]);
    expect(await pull(log, "s:0")).toEqual(["s:0", "s:0/a"]);
    // A dictionary rebuild that reuses the ids for other names, announced by a schema change (DDL bumps schema_version).
    raw.exec(
      "UPDATE ents SET name='t:0' WHERE name='s:0'; UPDATE ents SET name='t:0/a' WHERE name='s:0/a'; CREATE TABLE IF NOT EXISTS qh1_schema_bump(x);",
    );
    expect(await pull(log, "t:0")).toEqual(["t:0", "t:0/a"]);
    // The old names are gone: the caches did not keep answering for them.
    expect(await pull(log, "s:0")).toEqual([]);
    // The same, announced by a new writer epoch instead.
    raw.exec(
      "UPDATE ents SET name='u:0' WHERE name='t:0'; UPDATE ents SET name='u:0/a' WHERE name='t:0/a'; UPDATE marker SET epoch=epoch+1;",
    );
    expect(await pull(log, "u:0")).toEqual(["u:0", "u:0/a"]);
    expect(await pull(log, "t:0")).toEqual([]);
  } finally {
    raw.close();
    await log.close();
  }
});
