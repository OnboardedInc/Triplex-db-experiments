// [EXP-K01-R13] Why: absence is positive typed catalog evidence, never a caught planning exception. Rejected: admitting an empty/default observation after the captured missing-table error.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { typedCatalog } from "../lib/g0-catalog.ts";
import { expectedN01 } from "../lib/g0-xtdb.ts";
import { fields, readG0, admitG0, type Reader } from "../lib/g0.ts";
const base = expectedN01({
  subjects: 20,
  accounts: 20,
  scope: "catalog-seed",
  seedInputs: { options: { seedBatchFacts: 400 } },
  result: {
    complete: true,
    seededSubjects: 20,
    commands: 33,
    lastPosition: 33,
    assertions: 8539,
    expectedAssertions: 8539,
  },
});
function fixture() {
  const expected = structuredClone(base);
  expected.position = 1;
  for (const t of Object.keys(fields)) expected.counts[t] = expected.tables![t].written ? 1 : 0;
  const cat: any = {},
    rows: any = {};
  for (const [t, cols] of Object.entries(fields)) {
    rows[t] = [];
    if (expected.tables![t].written) {
      cat[t] = {};
      const row: any = {};
      for (const c of cols) {
        if (expected.tables![t].columns[c]) {
          cat[t][c] = ":utf8";
          row[c] = "value";
        } else row[c] = null;
      }
      rows[t] = [row];
    }
  }
  let catalogReads = 0;
  const globals: any[] = [];
  const reader: Reader = {
    endpoint: "catalog-fixture",
    catalog: async () => {
      catalogReads++;
      return structuredClone(cat);
    },
    scopes: async () => [{ scope_key: expected.scope, position: 1 }],
    count: async (t, _s, _sig, all) => {
      globals.push({ t, all });
      return rows[t].length;
    },
    async *scan(t) {
      yield* rows[t];
    },
  };
  return {
    expected,
    cat,
    rows,
    reader,
    globals,
    get catalogReads() {
      return catalogReads;
    },
  };
}
test("captured failure bytes bind this absent-table fixture", () => {
  const p = new URL(
    "../../experiments/EXP-K01-seed-clone/evidence/live-round12/seed.log",
    import.meta.url,
  );
  const b = fs.readFileSync(p);
  assert(b.includes(Buffer.from("Table not found: tx_native_relation_attempts")));
  const f = JSON.parse(
    fs.readFileSync(new URL("./fixtures/g0-missing-live12.json", import.meta.url), "utf8"),
  );
  assert.equal(createHash("sha256").update(b).digest("hex"), f.sha256);
  assert.equal(f.table, "tx_native_relation_attempts");
});
test("all declared tables and columns have explicit seed policies; catalog-certified absence pins", async () => {
  const f = fixture();
  assert.equal(Object.keys(f.expected.tables!).length, Object.keys(fields).length);
  for (const [t, cols] of Object.entries(fields))
    assert.deepEqual(Object.keys(f.expected.tables![t].columns).sort(), [...cols].sort());
  const pin = await readG0(f.reader, f.expected);
  assert.equal((await admitG0(f.reader, pin, f.expected)).status, "PASS");
  assert.equal(f.catalogReads, 4);
  assert(f.globals.filter((x) => !f.expected.tables![x.t].written).every((x) => x.all === true));
});
for (const t of Object.keys(fields))
  test("catalog/table policy refuses wrong content: " + t, async () => {
    const f = fixture();
    if (f.expected.tables![t].written) delete f.cat[t];
    else {
      f.cat[t] = { scope_key: ":utf8" };
      f.rows[t] = [{ scope_key: "foreign" }];
    }
    await assert.rejects(() => readG0(f.reader, f.expected));
  });
test("absent nullable column and present NULL column agree; non-NULL refuses", async () => {
  const f = fixture(),
    pin = await readG0(f.reader, f.expected);
  f.cat.tx_assertions.valid_to = ":null";
  assert.equal((await admitG0(f.reader, pin, f.expected)).status, "PASS");
  f.rows.tx_assertions[0].valid_to = 7;
  await assert.rejects(() => readG0(f.reader, f.expected), /unexpected seed column/);
});
test("every required column requires catalog presence and an observed non-NULL value", async () => {
  for (const [t, p] of Object.entries(base.tables!))
    for (const [c, w] of Object.entries(p.columns))
      if (w) {
        let f = fixture();
        delete f.cat[t][c];
        await assert.rejects(() => readG0(f.reader, f.expected), /missing written column/);
        f = fixture();
        f.rows[t][0][c] = null;
        await assert.rejects(() => readG0(f.reader, f.expected), /unobserved written column/);
      }
});
test("catalog mutation, incomplete policy and unavailable inventory refuse", async () => {
  let f = fixture();
  f.reader.catalog = async () => {
    const c = structuredClone(f.cat);
    if (f.catalogReads === 0) {
      f.cat.tx_assertions.extra = ":utf8";
    }
    return c;
  };
  await assert.rejects(() => readG0(f.reader, f.expected), /catalog changed/);
  f = fixture();
  delete f.expected.tables!.tx_meta.columns.position;
  await assert.rejects(() => readG0(f.reader, f.expected), /column policy/);
  f = fixture();
  delete f.reader.catalog;
  await assert.rejects(() => readG0(f.reader, f.expected), /requires catalog/);
});
test("typed catalog rejects malformed/partial/duplicate/contradictory observations", () => {
  for (const [t, c] of [
    [null, []],
    [[], null],
    [[{ table_name: 7 }], []],
    [[{ table_name: "x" }, { table_name: "x" }], []],
    [[{ table_name: "x" }], []],
    [[], [{ table_name: "x", column_name: "v", xt_type: ":i64" }]],
    [[{ table_name: "x" }], [{ table_name: "x", column_name: "v" }]],
  ])
    assert.throws(() => typedCatalog(t, c));
  assert.deepEqual(Object.keys(typedCatalog([], [])), []);
});
// [EXP-K01-R13] Why: replay the captured typed inventory through the actual SQL reader; any accidental missing-table query would throw the original captured planner error. Rejected: testing only a stub Reader that already knows absence.
test("production SQL reader does not plan a query for any catalog-absent table", async () => {
  const path = await import("node:path"),
    vm = await import("node:vm"),
    ts = (await import("typescript")).default;
  const { pathToFileURL } = await import("node:url");
  const { bounded } = await import("../lib/g0.ts");
  const root = path.resolve(import.meta.dirname, "../../..");
  const text = fs.readFileSync(path.join(root, "lab/bench/lib/g0-xtdb.ts"), "utf8");
  const ast = ts.createSourceFile("reader.ts", text, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === "openG0",
  )!;
  const extracted = declaration
    .getText(ast)
    .replace(/^export /, "")
    .replaceAll("import.meta.dirname", JSON.stringify(path.join(root, "lab/bench/lib")))
    .replaceAll("await import(", "await fixtureImport(");
  const code = ts.transpileModule(extracted, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const f = JSON.parse(
    fs.readFileSync(new URL("./fixtures/g0-smoke13.json", import.meta.url), "utf8"),
  );
  let unexpected = 0;
  const client = {
    query: async (sql: string) => {
      if (sql.includes("FROM information_schema.tables"))
        return Object.keys(f.sourceCatalog).map((table_name) => ({ table_name }));
      if (sql.includes("FROM information_schema.columns"))
        return Object.entries(f.sourceCatalog).flatMap(([table_name, cols]) =>
          Object.entries(cols as any).map(([column_name, xt_type]) => ({
            table_name,
            column_name,
            xt_type,
          })),
        );
      unexpected++;
      throw Error("Table not found: tx_native_relation_attempts\nColumn not found: scope_key");
    },
    close: async () => {},
  };
  const fixtureImport = async (url: string) =>
    url.endsWith("/packages/xtdb/dist/index.js")
      ? { makeXtdbClient: () => client }
      : { DatabaseScope: { test: (s: string) => s } };
  const open = vm.runInNewContext(code + ";openG0", {
    path,
    pathToFileURL,
    fields,
    bounded,
    typedCatalog,
    fixtureImport,
    AbortSignal,
    Object,
    Number,
    String,
    openWire: async () => ({
      scan: () => {
        throw Error("unexpected scan");
      },
      close: async () => {},
    }),
  });
  const h = await open("offline-captured-catalog");
  try {
    await h.reader.catalog(AbortSignal.timeout(1000));
    for (const t of Object.keys(fields))
      if (!f.sourceCatalog[t]) {
        assert.equal(await h.reader.count(t, "seed", AbortSignal.timeout(1000), true), 0);
        for await (const _row of h.reader.scan(t, "seed", AbortSignal.timeout(1000)))
          assert.fail("absent table yielded a row");
      }
    assert.equal(unexpected, 0);
  } finally {
    await h.close();
  }
});
test("every declared NULL-only seed column refuses a non-NULL value", async () => {
  for (const [t, p] of Object.entries(base.tables!))
    if (p.written)
      for (const [c, w] of Object.entries(p.columns))
        if (!w) {
          const f = fixture();
          f.rows[t][0][c] = 7;
          await assert.rejects(() => readG0(f.reader, f.expected), /unexpected seed column/);
        }
});

test("a mutable reused catalog cannot replace the initial observation", async () => {
  const f = fixture();
  f.reader.catalog = async () => f.cat;
  const count = f.reader.count;
  let once = false;
  f.reader.count = async (...args) => {
    if (!once) {
      once = true;
      f.cat.tx_assertions.new_binding = ":utf8";
    }
    return count(...args);
  };
  await assert.rejects(() => readG0(f.reader, f.expected), /catalog changed/);
});
