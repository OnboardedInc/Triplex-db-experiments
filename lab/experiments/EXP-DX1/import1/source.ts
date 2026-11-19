import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { deepOwnFacts, deepShape } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM, type Fact, type Value } from "../../../bench/lib/world.ts";

export function bytes(x: unknown): string {
  if (typeof x === "number") {
    assert(Number.isFinite(x));
    return Object.is(x, -0) ? "-0" : String(x);
  }
  if (typeof x === "string" || typeof x === "boolean" || x === null) return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(bytes).join(",") + "]";
  assert(x && typeof x === "object");
  return (
    "{" +
    Object.entries(x)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ":" + bytes(v))
      .join(",") +
    "}"
  );
}
export const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export type Assertion = {
  op: "assert";
  ref: string;
  entityId: string;
  attribute: string;
  value: Value | { type: "number"; value: number };
  validFrom: number;
  validTo?: number;
};
export type Operation = Assertion | { op: "retract"; target: string };
export type Group = { ordinal: number; id: string; instant?: number; ops: Operation[] };
export type Header = {
  source: string;
  generation: string;
  mode: "snapshot" | "history";
  groups: number;
  seal: string;
  validAt: number;
};
export interface Source {
  header: Header;
  group(i: number): Group;
}
export function validate(g: Group, h: Header, ordinal: number) {
  const keys = (v: object, allowed: string[]) =>
    assert(
      Object.keys(v).every((k) => allowed.includes(k)),
      "Unsupported source field",
    );
  keys(g, ["ordinal", "id", "instant", "ops"]);
  assert.equal(g.ordinal, ordinal);
  assert(typeof g.id === "string" && g.id && Array.isArray(g.ops) && g.ops.length);
  if (h.mode === "history")
    assert(typeof g.instant === "number" && Number.isFinite(g.instant) && g.instant >= 0);
  else assert.equal(g.instant, undefined);
  const refs = new Set<string>();
  for (const op of g.ops) {
    if (op.op === "retract") {
      keys(op, ["op", "target"]);
      assert(h.mode === "history" && op.target);
      continue;
    }
    assert(op.op === "assert" && op.ref && !refs.has(op.ref) && op.entityId && op.attribute);
    keys(op, ["op", "ref", "entityId", "attribute", "value", "validFrom", "validTo"]);
    refs.add(op.ref);
    assert(
      Number.isFinite(op.validFrom) &&
        op.validFrom >= 0 &&
        (op.validTo === undefined || (Number.isFinite(op.validTo) && op.validTo > op.validFrom)),
    );
    if (h.mode === "snapshot") assert(op.validFrom === h.validAt && op.validTo === undefined);
    const v = op.value;
    keys(v, v.type === "blob" ? ["type", "value", "mimeType", "size"] : ["type", "value"]);
    switch (v.type) {
      case "integer":
        assert(/^-?(0|[1-9][0-9]*)$/.test(v.value) && v.value !== "-0");
        break;
      case "string":
      case "ref":
        assert(typeof v.value === "string");
        break;
      case "boolean":
        assert.equal(typeof v.value, "boolean");
        break;
      case "number":
      case "datetime":
        assert(Number.isFinite(v.value));
        break;
      case "blob":
        assert(
          typeof v.value === "string" && v.mimeType && Number.isSafeInteger(v.size) && v.size >= 0,
        );
        break;
      default:
        throw Error("Unsupported source value kind");
    }
  }
}
export function fileSource(file: string, meta: Omit<Header, "seal">, input?: Iterable<Group>) {
  assert(
    meta.source &&
      meta.generation &&
      ["snapshot", "history"].includes(meta.mode) &&
      Number.isSafeInteger(meta.groups) &&
      meta.groups >= 0 &&
      Number.isFinite(meta.validAt) &&
      meta.validAt >= 0,
  );
  const db = new DatabaseSync(file);
  try {
    if (input) {
      db.exec(
        "BEGIN IMMEDIATE; CREATE TABLE groups(n INTEGER PRIMARY KEY, id TEXT UNIQUE, body TEXT NOT NULL); CREATE TABLE header(body TEXT NOT NULL)",
      );
      const put = db.prepare("INSERT INTO groups VALUES(?,?,?)");
      let n = 0;
      const hash = createHash("sha256");
      for (const g of input) {
        validate(g, meta as Header, n);
        const raw = bytes(g);
        put.run(n++, g.id, raw);
        hash.update(raw + "\n");
      }
      assert.equal(n, meta.groups);
      db.prepare("INSERT INTO header VALUES(?)").run(bytes({ ...meta, seal: hash.digest("hex") }));
      db.exec("COMMIT");
    }
    db.exec("PRAGMA query_only=ON");
    // [DX-ACT1] Why: a sealed export is read in one SQLite snapshot, including its ordinal and byte audit. Rejected: trusting a mutable file's advertised digest on resume.
    db.exec("BEGIN");
    const rows = db.prepare("SELECT body FROM header").all();
    assert.equal(rows.length, 1);
    const header: Header = JSON.parse(String(rows[0]!.body));
    assert.deepEqual(header, { ...meta, seal: header.seal });
    const hash = createHash("sha256");
    let n = 0;
    for (const r of db.prepare("SELECT n,id,body FROM groups ORDER BY n").iterate()) {
      assert.equal(r.n, n++);
      const g = JSON.parse(String(r.body));
      assert.equal(g.id, r.id);
      validate(g, header, Number(r.n));
      hash.update(String(r.body) + "\n");
    }
    assert.equal(n, header.groups);
    assert.equal(hash.digest("hex"), header.seal);
    // [DX-ACT1] Why: source assertion names are global within an export and a retirement must point to a surviving earlier source assertion. Rejected: discovering an ambiguous symbol after publishing its duplicate.
    const symbols = new DatabaseSync("");
    try {
      symbols.exec(
        "CREATE TABLE refs(id TEXT PRIMARY KEY,born INTEGER NOT NULL,retired INTEGER DEFAULT 0); BEGIN",
      );
      const add = symbols.prepare("INSERT INTO refs(id,born) VALUES(?,?)"),
        retire = symbols.prepare("UPDATE refs SET retired=1 WHERE id=? AND born<? AND retired=0");
      for (const r of db.prepare("SELECT body FROM groups ORDER BY n").iterate()) {
        const g = JSON.parse(String(r.body)) as Group;
        for (const o of g.ops) {
          if (o.op === "assert") add.run(o.ref, g.ordinal);
          else
            assert.equal(
              retire.run(o.target, g.ordinal).changes,
              1,
              "Unknown, same-save or retired source assertion",
            );
        }
      }
      symbols.exec("COMMIT");
    } finally {
      symbols.close();
    }
    const get = db.prepare("SELECT body FROM groups WHERE n=?");
    return {
      header,
      group: (i: number): Group => JSON.parse(String(get.get(i)!.body)),
      close: () => db.close(),
    };
  } catch (e) {
    db.close();
    throw e;
  }
}
// [DX-ACT1] Why: the eight-fact cohort reproduces THIN1's applicant answer references, including a missing answer value. Rejected: equal-width invented scalar attributes that skip reference reads.
function thinFacts(i: number): Fact[] {
  const root = ids.placement(i),
    extra = i % 5;
  const rows: Fact[] = [];
  for (const [j, field] of ["source-key", "import-batch", "external-status"].entries()) {
    if (j === 2 && extra < 2) break;
    const answer = root + "/ans:" + j;
    rows.push(
      { e: root, a: "answers", v: { type: "ref", value: answer } },
      { e: answer, a: "field", v: { type: "string", value: field } },
    );
    if (j < 2 || extra >= 3)
      rows.push({ e: answer, a: "value", v: { type: "string", value: field + "-" + i } });
  }
  if (extra === 1 || extra === 4)
    rows.push({
      e: root,
      a: "weeklyMinutes",
      v: { type: "integer", value: String(1200 + (i % 1800)) },
    });
  return rows;
}
const populationCode = sha(
  [
    "./source.ts",
    "../../../bench/lib/deep-world.ts",
    "../../../bench/lib/world.ts",
    "../../../bench/lib/rng.ts",
  ]
    .map((f) => sha(readFileSync(new URL(f, import.meta.url))))
    .join(""),
);
export function snapshot(
  profile: "deep" | "thin",
  count: number,
  prefix: string,
  generation: string,
): Source {
  assert(Number.isSafeInteger(count) && count >= 0);
  const header: Header = {
    source: "population-" + prefix,
    generation,
    mode: "snapshot",
    groups: count,
    validAt: SEED_VALID_FROM,
    seal: sha(bytes([profile, count, prefix, generation, SEED_VALID_FROM, populationCode])),
  };
  return {
    header,
    group(i) {
      assert(i >= 0 && i < count);
      const facts = profile === "deep" ? deepOwnFacts(i) : thinFacts(i);
      assert.equal(facts.length, profile === "deep" ? deepShape(i).facts : 6 + (i % 5));
      return {
        ordinal: i,
        id: String(i),
        ops: facts.map((f, j) => ({
          op: "assert",
          ref: i + "/" + j,
          entityId: prefix + f.e,
          attribute: f.a,
          value: f.v.type === "ref" ? { type: "ref", value: prefix + f.v.value } : f.v,
          validFrom: header.validAt,
        })),
      };
    },
  };
}
