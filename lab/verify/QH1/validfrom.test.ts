// [EXP-P4N] Why: step (a) sends valid-from as an offset and main computes `instant + offset`. This property test checks that this equals
// the number the SQL route used to send (`sn(tx.at + f.vf)`, SQLite's own sum) for integer pairs (safe and beyond 2^53, negative offsets),
// integer plus REAL and REAL plus REAL, with both operands crossing exactly as the worker sends them (`sn`: JSON number for a safe integer,
// otherwise printf('%!.17g') text read back with Number()). Columns have INT affinity as in the broker schema. Rejected: only checking the
// 100,000-pull digest (W0 values are small positive integers and never reach 2^53 or REAL).
import { it, expect } from "vitest";
import { createRequire } from "node:module";
const D = createRequire(import.meta.url)(
  createRequire(new URL("../../../packages/qlever/package.json", import.meta.url).pathname).resolve(
    "better-sqlite3",
  ),
);
const sn = (x: string) =>
  "CASE WHEN typeof(" +
  x +
  ")='integer' AND " +
  x +
  " BETWEEN -9007199254740991 AND 9007199254740991 THEN " +
  x +
  " ELSE printf('%!.17g'," +
  x +
  ") END";
const asNumber = (x: unknown) => (typeof x === "number" ? x : Number(x));
const bits = (x: number) => {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(x);
  return b.toString("hex");
};
it("main-side at + vfOffset equals SQLite's (tx.at + f.vf) as sent by the old route", () => {
  const db = new D(":memory:");
  db.exec(
    "CREATE TABLE tx(pos INTEGER PRIMARY KEY, at INT NOT NULL); CREATE TABLE f(id INTEGER PRIMARY KEY, pos INT, vf INT)",
  );
  const insTx = db.prepare("INSERT INTO tx VALUES(?,?)"),
    insF = db.prepare("INSERT INTO f VALUES(?,?,?)");
  const old = db
    .prepare(
      "SELECT " +
        sn("(tx.at+f.vf)") +
        " v, " +
        sn("tx.at") +
        " a, " +
        sn("f.vf") +
        " o, typeof(tx.at) ta, typeof(f.vf) tv FROM f JOIN tx ON tx.pos=f.pos WHERE f.id=?",
    )
    .raw();
  const edges = [
    0,
    1,
    -1,
    1793783600000,
    -1793783600000,
    2 ** 31,
    -(2 ** 31),
    2 ** 52,
    2 ** 53 - 1,
    2 ** 53,
    2 ** 53 + 2,
    -(2 ** 53),
    -(2 ** 53) - 2,
    2 ** 54,
    2 ** 60,
    -(2 ** 60),
    2 ** 62,
    0.5,
    -0.5,
    0.1,
    1 / 3,
    1e-7,
    5e-324,
    123456789.123,
    1793783600000.5,
    1e15 + 0.5,
    1e300,
    -1e300,
    Number.MAX_VALUE,
  ];
  let seed = 4242;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const randDouble = () => {
    const b = Buffer.alloc(8);
    b.writeUInt32BE(next(), 0);
    b.writeUInt32BE(next(), 4);
    const x = b.readDoubleBE(0);
    return Number.isFinite(x) && !Object.is(x, -0) ? x : 1.5;
  };
  const randInt = () => {
    const magnitude = [1e3, 1e9, 1e13, 2 ** 53, 2 ** 58][next() % 5]!;
    return Math.round(((next() / 4294967296) * 2 - 1) * magnitude);
  };
  const pairs: [number, number][] = [];
  for (const a of edges) for (const v of edges) pairs.push([a, v], [-a, v]);
  for (let i = 0; i < 20000; i++)
    pairs.push([i % 2 ? randInt() : randDouble(), i % 3 ? randInt() : randDouble()]);
  let id = 0,
    checked = 0,
    skippedOverflow = 0;
  const kinds = new Set<string>();
  for (const [at, vf] of pairs) {
    if (!Number.isFinite(at + vf)) continue;
    id++;
    insTx.run(id, at);
    insF.run(id, id, vf);
    const [v, a, o, ta, tv] = old.get(id) as [
      number | string,
      number | string,
      number | string,
      string,
      string,
    ];
    const sqlSum = asNumber(v),
      mainSum = asNumber(a) + asNumber(o);
    kinds.add(`${ta}+${tv}`);
    // SQLite's REAL-valued text from printf('%!.17g') of a huge sum compares by value; compare bit patterns.
    expect(bits(mainSum), `${at} + ${vf}`).toBe(bits(sqlSum));
    checked++;
  }
  expect(checked).toBeGreaterThan(20000);
  expect([...kinds].sort()).toEqual([
    "integer+integer",
    "integer+real",
    "real+integer",
    "real+real",
  ]);
  expect(skippedOverflow).toBe(0);
  db.close();
});
