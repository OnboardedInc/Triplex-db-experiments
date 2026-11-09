// [EXP-HS01] Why: R2 id codec property test. Ids keep their exact text at the API, whatever shape they have.
// Rejected: testing only the generator's own shape (the codec must be reversible for every string, and fall back to TEXT).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { rowCodec } from "../../../packages/qlever/src/broker/row-codec.js";
const Database = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const { packId, unpackId } = new Function("Buffer", rowCodec + "return {packId,unpackId};")(Buffer);
const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "stores")
  : path.resolve("runs/HS01");
let rng = 4242;
// mulberry32: a plain LCG's low bits correlate consecutive draws, which skews the id kinds.
const random = (n: number) => {
  rng = (rng + 0x6d2b79f5) >>> 0;
  let t = rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % n;
};
const b36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const crock = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const pick = (alphabet: string, n: number) =>
  Array.from({ length: n }, () => alphabet[random(alphabet.length)]).join("");
// 90 distinct heads: more than the 63 slots, so some structured ids must fall back.
const heads = Array.from({ length: 90 }, () => pick(b36, 8));
const strange = [
  "",
  "a",
  "12345678",
  "123456789",
  "0".repeat(26),
  "Z".repeat(26),
  "ABCDEFGH" + "Z".repeat(18),
  "abcdefgh0000000001",
  "ABCDEFGH000000000a",
  "ABCDEFGH00000000_1",
  "ABCDEFGH/18",
  "\ud800",
  "\udfff",
  "\ud800a",
  "\udfffa",
  "a\ud83d",
  "\ud83d\ude00",
  "0".repeat(25) + "\ud800",
  " ABCDEFGH0000000001",
  "ABCDEFGH0000000001 ",
  "ÉBCDEFGH0000000001",
  "\ud800BCDEFGH0000000001",
  "x".repeat(300),
  "1e21",
  "9007199254740993",
  "-1",
  "0x10",
  "NaN",
];
const generated = (): string => {
  const kind = random(10);
  if (kind === 0) return pick(crock.slice(0, 8), 1) + pick(crock, 25); // canonical Crockford ULID
  if (kind === 1) return pick(b36, 26); // random base 36: the tail almost never fits
  if (kind === 2) return pick(b36, random(40)); // any length 0..39
  if (kind === 3) return pick("abcdefghijklmnopqrstuvwxyz0123456789-_/", 1 + random(30));
  // the generator's shape: head then a counter of random magnitude, padded to a random width
  const width = random(10) < 7 ? 18 : 1 + random(18),
    magnitude = [1, 36, 36 ** 3, 36 ** 5, 36 ** 7, 2 ** 43 - 1, 2 ** 43, 2 ** 43 + 1, 2 ** 50][
      random(9)
    ]!;
  const counter = Math.min(Math.floor((random(1 << 20) / (1 << 20)) * magnitude), 36 ** width - 1);
  return heads[random(heads.length)]! + counter.toString(36).toUpperCase().padStart(width, "0");
};
// expect() per id is orders of magnitude slower than a plain comparison; the loop runs 300,000 times.
const must = (ok: boolean, what: string, id: string) => {
  if (!ok) throw Error(what + ": " + JSON.stringify(id));
};
describe("EXP-HS01 id codec", () => {
  it("round-trips 300000 ids exactly through SQLite, with distinct stored values and typed storage classes", () => {
    // :memory: because every insert on a durable file would fsync; storage classes and comparisons are identical.
    const db = new Database(":memory:");
    db.exec("CREATE TABLE ids(id BLOB NOT NULL PRIMARY KEY, text BLOB NOT NULL) WITHOUT ROWID");
    const slots = new Map<string, number>(),
      names = new Map<string, string>();
    const writer = {
      hid: (key: string) => {
        let h = slots.get(key);
        if (h === undefined && slots.size < 63) {
          slots.set(key, (h = slots.size + 1));
          names.set("hds:" + h, key);
        }
        return h;
      },
      name: (t: string, id: number) => names.get(t + ":" + id),
    };
    // A reader never allocates: it only sees slots already persisted.
    const reader = { hid: (key: string) => slots.get(key), name: writer.name };
    const insert = db.prepare("INSERT INTO ids VALUES(?,?)"),
      select = db.prepare("SELECT id,typeof(id) t,text FROM ids WHERE id=?");
    const seen = new Set<string>(),
      classes = { integer: 0, blob: 0, text: 0 },
      byStored = new Map<string, string>();
    const inputs = [...strange];
    for (let i = 0; i < 300000; i++) inputs.push(generated());
    for (const id of inputs) {
      const stored = packId(id, writer);
      must(unpackId(stored, writer) === id, "pack/unpack differs", id);
      // Lookups use the reader context and must reach the stored value the writer chose.
      must(String(packId(id, reader)) === String(stored), "reader lookup differs from writer", id);
      if (seen.has(id)) continue;
      seen.add(id);
      insert.run(stored, Buffer.from(id, "utf16le"));
      const row = select.get(packId(id, reader)) as { id: unknown; t: string; text: Buffer };
      must(row.text.toString("utf16le") === id, "lookup returned another row", id);
      must(unpackId(row.id, reader) === id, "stored value decodes differently", id);
      const cls = row.t === "integer" ? "integer" : row.t === "blob" ? "blob" : "text";
      classes[cls]++;
      if (cls === "blob" && (row.id as Buffer).length !== 16)
        must((row.id as Buffer).length % 2 === 1, "escape blob length", id);
      if (cls === "integer") must(Number.isSafeInteger(row.id), "integer not safe", id);
      const fingerprint =
        cls + ":" + (Buffer.isBuffer(row.id) ? row.id.toString("hex") : String(row.id));
      must(!byStored.has(fingerprint), "two ids share a stored value", id);
      byStored.set(fingerprint, id);
    }
    expect(slots.size, "the 90 heads exceed the 63 slots, so the dictionary filled").toBe(63);
    expect(classes.integer).toBeGreaterThan(20000);
    expect(classes.blob).toBeGreaterThan(10000);
    expect(classes.text).toBeGreaterThan(20000);
    // Everything stored in the table decodes back to its text.
    for (const row of db.prepare("SELECT id,text FROM ids").iterate() as Iterable<any>)
      must(
        unpackId(row.id, reader) === row.text.toString("utf16le"),
        "table scan differs",
        row.text.toString("utf16le"),
      );
    db.close();
    if (process.env.HS01_RESULT) {
      const dir = path.join(root, randomUUID());
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "id-codec.json"),
        JSON.stringify({ ids: seen.size, classes, slots: slots.size }),
      );
    }
  });
  it("keeps numeric-looking text, other lengths and non-base-36 text as TEXT", () => {
    const ctx = { hid: () => 1, name: () => "ABCDEFGH/10" };
    for (const id of ["12345", "1234567890123456789012345", "abcdefgh0000000001", "ABCDEFG", ""])
      expect(packId(id, ctx)).toBe(id);
  });
  it("asks for no slot when the counter would not round-trip", () => {
    const calls: string[] = [];
    const ctx = { hid: (k: string) => (calls.push(k), 1), name: () => "x" };
    // 18 digits whose value exceeds 2^43: structured shape, but no slot is asked for and it stays text.
    const big = "ABCDEFGH" + "Z".repeat(18);
    expect(packId(big, ctx)).toBe(big);
    expect(calls).toEqual([]);
  });
});
