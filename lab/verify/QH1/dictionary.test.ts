// [EXP-QH1-R3] Why: step 4 resolves dictionary ids on the main thread from a cache. The cache must (a) hit when nothing changed,
// (b) fetch only new ids when the dictionary grows, (c) drop everything when the writer epoch or the SQLite schema version changes,
// the two events that can change what an id means, and (d) stay bounded. Rejected: a test of the cache class alone (the worker's own
// name caches share the same key and are part of the behavior).
import path from "node:path";
import { createRequire } from "node:module";
import { it, expect } from "vitest";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import {
  H1Dictionary,
  H1DictionaryStale,
  h1Rows,
  resolveDictionary,
} from "../../../packages/qlever/src/broker/h1.js";
import { append, fresh, row } from "./helpers.js";

const D = createRequire(
  new URL("../../../packages/qlever/package.json", import.meta.url),
)("better-sqlite3");
const names = (rows: ReadonlyMap<string, readonly any[]>) =>
  [...rows.keys()].sort();

it("hits the cache, fetches only new ids, and serves exact names", async () => {
  const dir = fresh();
  const { log } = await HostLog.open(dir, { minFreeBytes: 0 });
  const requests: any[] = [];
  const original = log.names.bind(log);
  log.names = async (request) => (requests.push(request), original(request));
  try {
    await append(log, [
      row(1, "s:0", 2048),
      {
        ...row(2, "s:0/a", 2048),
        value_type: "ref" as const,
        value_number: null,
        value_string: "s:0/b",
      },
      row(3, "s:0/b", 2048),
    ]);
    const first = await log.h1Pull(2048, ["s:0"]);
    expect(
      names(h1Rows(first.tuples, { validAt: 1000 }, first.dictionary)),
    ).toEqual(["s:0", "s:0/a", "s:0/b"]);
    expect(requests.length).toBe(1);
    expect(requests[0].ents.length).toBe(3);
    const generation = log.dictionary.generation;
    // Same pull again: every id is cached, no names request.
    const again = await log.h1Pull(2048, ["s:0"]);
    expect(requests.length).toBe(1);
    expect(
      names(h1Rows(again.tuples, { validAt: 1000 }, again.dictionary)),
    ).toEqual(["s:0", "s:0/a", "s:0/b"]);
    // New entity and attribute after the cache is warm: only the new ids are requested.
    await append(log, [{ ...row(4, "s:0/c", 3072), attribute: ":x/new" }]);
    const grown = await log.h1Pull(3072, ["s:0"]);
    expect(requests.length).toBe(2);
    expect(requests[1].ents.length).toBe(1);
    expect(requests[1].attrs.length).toBe(1);
    expect(
      names(h1Rows(grown.tuples, { validAt: 1000 }, grown.dictionary)),
    ).toEqual(["s:0", "s:0/a", "s:0/b", "s:0/c"]);
    expect(log.dictionary.generation).toBe(generation);
  } finally {
    await log.close();
  }
});

it("drops the cache, here and in the worker, when the schema version or the writer epoch changes", async () => {
  const dir = fresh();
  const { log } = await HostLog.open(dir, { minFreeBytes: 0 });
  const raw = new D(path.join(dir, "broker.db"));
  try {
    await append(log, [row(1, "s:0", 2048), row(2, "s:0/a", 2048)]);
    const before = await log.h1Pull(2048, ["s:0"]);
    expect(
      names(h1Rows(before.tuples, { validAt: 1000 }, before.dictionary)),
    ).toEqual(["s:0", "s:0/a"]);
    const generation = log.dictionary.generation;
    // A dictionary rebuild that reuses ids for other names, announced by a schema change (DDL bumps schema_version).
    raw.exec(
      "UPDATE ents SET name='t:0' WHERE name='s:0'; UPDATE ents SET name='t:0/a' WHERE name='s:0/a'; CREATE TABLE IF NOT EXISTS qh1_schema_bump(x);",
    );
    const afterSchema = await log.h1Pull(2048, ["t:0"]);
    expect(
      names(
        h1Rows(afterSchema.tuples, { validAt: 1000 }, afterSchema.dictionary),
      ),
    ).toEqual(["t:0", "t:0/a"]);
    expect(log.dictionary.generation).toBeGreaterThan(generation);
    // The same, announced by a new writer epoch.
    const generation2 = log.dictionary.generation;
    raw.exec(
      "UPDATE ents SET name='u:0' WHERE name='t:0'; UPDATE ents SET name='u:0/a' WHERE name='t:0/a'; UPDATE marker SET epoch=epoch+1;",
    );
    const afterEpoch = await log.h1Pull(2048, ["u:0"]);
    expect(
      names(
        h1Rows(afterEpoch.tuples, { validAt: 1000 }, afterEpoch.dictionary),
      ),
    ).toEqual(["u:0", "u:0/a"]);
    expect(log.dictionary.generation).toBeGreaterThan(generation2);
    // Unchanged key afterwards: no further drops.
    const generation3 = log.dictionary.generation;
    await log.h1Pull(2048, ["u:0"]);
    expect(log.dictionary.generation).toBe(generation3);
  } finally {
    raw.close();
    await log.close();
  }
});

it("is bounded, and a fetch that cannot satisfy the ids fails instead of looping", async () => {
  const dict = new H1Dictionary(2);
  const tuples = [0, 1, 2, 3].map((i) => [
    0,
    "id" + i,
    10 + i,
    1,
    0,
    "v",
    100 + i,
    0,
    null,
    null,
    null,
    1,
    null,
  ]);
  const fetch = async (r: any) => ({
    ents: JSON.stringify(r.ents.map((id: number) => [id, "e" + id])),
    attrs: JSON.stringify(r.attrs.map((id: number) => [id, ":a" + id])),
    strs: "[]",
    txs: JSON.stringify(r.txs.map((p: number) => [p, 5, "tx" + p])),
  });
  await resolveDictionary(dict, tuples, "k1", fetch);
  expect(dict.size).toBeGreaterThan(2);
  const generation = dict.generation;
  await resolveDictionary(dict, tuples, "k1", fetch);
  expect(dict.generation).toBe(generation + 1);
  expect(h1Rows(tuples, { validAt: 1000 }, dict).size).toBe(4);
  await expect(
    resolveDictionary(new H1Dictionary(), tuples, "k", async () => ({
      ents: "[]",
      attrs: "[]",
      strs: "[]",
      txs: "[]",
    })),
  ).rejects.toBeInstanceOf(H1DictionaryStale);
});
