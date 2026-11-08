/**
 * Unit tests: release documents and hashes (SPEC 5), dates (SPEC 6.1), the token-level reader and canonical writer (SPEC 2,
 * 9, 14 rows 1, 2, 34), the readings A01 to A15 (SPEC 14 rows 50 to 64, RULINGS Q53 and Q57), and invariants of
 * SPEC 13 on generated worlds.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import type { Basis, Fact, World } from "../src/index.js";
import {
  R1,
  R2,
  R3,
  addBusinessDays,
  build,
  canonicalJV,
  daysFromCivil,
  decodeUtf8Strict,
  diff,
  evaluate,
  evaluateWorld,
  formatDay,
  isqrt,
  outputJson,
  parseDate,
  plan,
  quote,
  resultJson,
  rung,
  runOpBytes,
  scan,
  sweepSubject,
  weekday,
} from "../src/index.js";

const W0 = fileURLToPath(new URL("../../../lab/world/W0/", import.meta.url));
const enc = (s: string): Uint8Array => Buffer.from(s, "utf8");
const run = (op: Parameters<typeof runOpBytes>[0], input: unknown): string =>
  runOpBytes(op, enc(JSON.stringify(input)));
const runText = (op: Parameters<typeof runOpBytes>[0], text: string): string =>
  runOpBytes(op, enc(text));

describe("releases (SPEC 5)", () => {
  const index = JSON.parse(readFileSync(W0 + "releases/index.json", "utf8")) as Record<
    string,
    string
  >;
  for (const rel of [R1, R2, R3]) {
    it(`${rel.name} equals releases/${rel.name}.json and its index hash`, () => {
      const file = canonicalJV(scan(readFileSync(W0 + `releases/${rel.name}.json`, "utf8")));
      expect(resultJsonOfDoc(rel.doc)).toBe(file);
      expect(rel.hash).toBe(index[rel.name]);
    });
  }
  it("diff (SPEC 5.3)", () => {
    expect(diff(R1, R2)).toEqual(["I9S2", "DOCEXP", "MINWAGE"]);
    expect(diff(R2, R3)).toEqual(["OT"]);
    expect(diff(R1, R3)).toEqual(["I9S2", "DOCEXP", "MINWAGE", "OT"]);
  });
});

function resultJsonOfDoc(doc: unknown): string {
  return canonicalJV(scan(JSON.stringify(doc)));
}

describe("dates (SPEC 6.1)", () => {
  const d = (s: string): number => parseDate(s);
  it("SPEC 6.1 addBusinessDays examples", () => {
    expect(formatDay(addBusinessDays(d("2026-11-02"), 3))).toBe("2026-11-05");
    expect(formatDay(addBusinessDays(d("2026-11-06"), 3))).toBe("2026-11-11");
    expect(formatDay(addBusinessDays(d("2026-11-07"), 3))).toBe("2026-11-11");
    expect(formatDay(addBusinessDays(d("2026-11-04"), 8))).toBe("2026-11-16");
  });
  it("matches Date.UTC and getUTCDay on every day from 1999 to 2100", () => {
    for (let z = daysFromCivil(1999, 1, 1); z <= daysFromCivil(2100, 12, 31); z++) {
      const date = new Date(z * 86400000);
      expect(formatDay(z)).toBe(date.toISOString().slice(0, 10));
      expect(weekday(z)).toBe(date.getUTCDay() === 0 ? 7 : date.getUTCDay());
    }
  });
  it("validates dates: years 2000 to 2099, real days only", () => {
    expect(d("2000-01-01")).toBe(10957);
    expect(d("2099-12-31")).toBeGreaterThan(0);
    for (const bad of [
      "1999-12-31",
      "2100-01-01",
      "2026-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-1-01",
      "2026-01-01 ",
    ])
      expect(d(bad)).toBe(-1);
    expect(d("2028-02-29")).toBeGreaterThan(0);
  });
});

describe("token-level reader and canonical writer (SPEC 2, 9, 14)", () => {
  it("keeps integer and non-integer number tokens apart", () => {
    const v = scan("[1650,1650.0,1.65e3,-0,9007199254740993]");
    expect(v.t === "arr" && v.v.map((x) => x.t)).toEqual(["int", "num", "num", "int", "int"]);
    expect(canonicalJV(v)).toBe("[1650,1650.0,1.65e3,0,9007199254740993]");
  });
  it("flags a duplicate key on every enclosing container", () => {
    const v = scan('{"a":[{"k":1,"k":2}],"b":1}');
    expect(v.t === "obj" && v.dup).toBe(true);
    const w = scan('{"a":[{"k":1,"j":2}],"b":1}');
    expect(w.t === "obj" && w.dup).toBe(false);
  });
  it("rejects what is not one JSON value", () => {
    for (const bad of [
      "",
      "{",
      "[1,]",
      '{"a":1,}',
      "01",
      "1.",
      "+1",
      "NaN",
      "Infinity",
      "-Infinity",
      '"\u0001"',
      "{} {}",
      "'a'",
    ])
      expect(() => scan(bad), bad).toThrow();
  });
  it("is iterative: 200,000 levels of nesting scan and write without a stack overflow (SPEC 4.4, A13)", () => {
    const deep = "[".repeat(200_000) + "]".repeat(200_000);
    const v = scan(deep);
    expect(v.t).toBe("arr");
    expect(canonicalJV(v)).toBe(deep);
  });
  it("decodes strict UTF-8 and refuses a byte order mark (A01)", () => {
    expect(decodeUtf8Strict(Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]))).toBeNull();
    expect(decodeUtf8Strict(Uint8Array.from([0x22, 0xc3, 0x28, 0x22]))).toBeNull();
    expect(decodeUtf8Strict(Uint8Array.from([0xed, 0xa0, 0x80]))).toBeNull(); // an encoded surrogate is not UTF-8
    expect(decodeUtf8Strict(enc('"é"'))).toBe('"é"');
  });
  it("escapes as json.dumps(ensure_ascii=True) (A07)", () => {
    expect(quote('a"b\\c')).toBe('"a\\"b\\\\c"');
    expect(quote("\u0000\b\f\n\r\t\u001f\u007f")).toBe('"\\u0000\\b\\f\\n\\r\\t\\u001f\\u007f"');
    expect(quote("é€😀")).toBe('"\\u00e9\\u20ac\\ud83d\\ude00"');
  });
  it("orders keys by code point, which is UTF-8 byte order (SPEC 8.7 and 9 item 2, A14)", () => {
    // U+E000 sorts before U+1F600 by code point; UTF-16 code units would put the surrogate pair (0xD83D) first.
    const pua = String.fromCharCode(0xe000);
    const smile = String.fromCodePoint(0x1f600);
    const input = '{"' + smile + '":1,"' + pua + '":2,"b":3,"a":4}';
    expect(canonicalJV(scan(input))).toBe('{"a":4,"b":3,"\\ue000":2,"\\ud83d\\ude00":1}');
  });
});

// A small valid world used by the reading tests below.
const basis = { tx: 10, validTime: "2026-11-04T12:00:00.000000Z" };
const fact = (e: string, a: string, v: unknown, tx = 2) => ({ e, a, v, tx });
const baseFacts = [
  fact("loc:nyc", "jurisdiction", "jur:ny", 1),
  fact("jur:ny", "stateMinWageCents", 1650, 1),
  fact("pl:a", "startDate", "2026-11-02"),
  fact("pl:a", "payRateCents", 1650),
  fact("pl:a", "location", "loc:nyc"),
];
const evalInput = (facts: unknown[], extra: Partial<{ basis: unknown; release: string }> = {}) => ({
  basis: extra.basis ?? basis,
  release: extra.release ?? "R1",
  world: { facts, subject: "pl:a" },
});
const err = (code: string): string => `{"error":"W0.${code}"}`;

describe("Q53 readings A01 to A09", () => {
  const ok = run("evaluate", evalInput(baseFacts));
  it("the base world is valid", () => {
    expect(ok.startsWith('{"basis":')).toBe(true);
  });
  it("A01: bytes that are not one JSON value are E_SHAPE", () => {
    const text = JSON.stringify(evalInput(baseFacts));
    expect(runOpBytes("evaluate", Uint8Array.from([0xef, 0xbb, 0xbf, ...enc(text)]))).toBe(
      err("E_SHAPE"),
    );
    expect(runOpBytes("evaluate", Uint8Array.from([...enc(text.slice(0, -1)), 0xff, 0x7d]))).toBe(
      err("E_SHAPE"),
    );
    expect(runText("evaluate", text + "x")).toBe(err("E_SHAPE"));
  });
  it("A02: -0 is an integer token with value 0, written 0", () => {
    const text = JSON.stringify(
      evalInput([...baseFacts, fact("pl:a", "weeklyMinutes", 1)]),
    ).replace('"v":1,"tx":2}', '"v":-0,"tx":2}');
    // -0 minutes is 0 minutes: the same bytes as a world written with 0
    const r2 = runText("evaluate", text);
    expect(r2).toContain('{"inputs":[2],"key":"","row":3,"rule":"OT"}');
    expect(r2).toBe(runText("evaluate", text.replace('"v":-0,"tx":2}', '"v":0,"tx":2}')));
    // a basis.tx of -0 is position 0, echoed as 0
    const empty = JSON.stringify({
      basis,
      release: "R1",
      world: { facts: [], subject: "pl:a" },
    }).replace('"tx":10', '"tx":-0');
    expect(runText("evaluate", empty)).toContain('{"basis":{"tx":0,"validTime"');
  });
  it("A03: cardinality runs after every fact passes 3.2, so a later E_UNKNOWN beats an earlier duplicate", () => {
    const facts = [
      ...baseFacts,
      fact("pl:a", "startDate", "2026-11-03"),
      fact("pl:a", "nickname", "x"),
    ];
    expect(run("evaluate", evalInput(facts))).toBe(err("E_UNKNOWN"));
    expect(
      run("evaluate", evalInput([...baseFacts, fact("pl:a", "startDate", "2026-11-03")])),
    ).toBe(err("E_CARDINALITY"));
  });
  it("A04: affected validates world by world", () => {
    const w1 = { facts: [...baseFacts, fact("pl:a", "startDate", "2026-11-03")], subject: "pl:a" };
    const w2 = { facts: [fact("pl:b", "nickname", "x")], subject: "pl:b" };
    const input = (worlds: unknown[]) => ({
      basis,
      release: "R1",
      worlds,
      writes: [["jur:ny", "stateMinWageCents"]],
    });
    expect(run("affected", input([w1, w2]))).toBe(err("E_CARDINALITY"));
    expect(run("affected", input([w2, w1]))).toBe(err("E_UNKNOWN"));
  });
  it("A05: activations one at a time in array order; within one, E_VALUE before E_BASIS", () => {
    const world = { facts: baseFacts, subject: "pl:a" };
    const good = { from: "2026-01-01T00:00:00.000000Z", release: R1.hash, tx: 1 };
    const badTx = { ...good, tx: 99 };
    const badHash = { ...good, release: "R1" };
    const rec = (activations: unknown[]) => run("reconcile", { activations, basis, world });
    expect(rec([badTx, badHash])).toBe(err("E_BASIS"));
    expect(rec([badHash, badTx])).toBe(err("E_VALUE"));
    expect(rec([{ ...badHash, tx: 99 }])).toBe(err("E_VALUE"));
    expect(rec([good])).toBe(run("evaluate", evalInput(baseFacts)));
  });
  it("A06: a picked activation naming an unknown well-formed hash is E_NO_RELEASE, no fall-back", () => {
    const world = { facts: baseFacts, subject: "pl:a" };
    const older = { from: "2026-01-01T00:00:00.000000Z", release: R1.hash, tx: 1 };
    const unknown = {
      from: "2026-06-01T00:00:00.000000Z",
      release: "sha256:" + "0".repeat(64),
      tx: 1,
    };
    expect(run("reconcile", { activations: [older, unknown], basis, world })).toBe(
      err("E_NO_RELEASE"),
    );
  });

  const wi = (id: string, payload: unknown) => ({
    id,
    inputs: [1],
    key: "",
    kind: "k",
    payload,
    rule: "MINWAGE",
    version: "wv:" + id,
  });
  const record = (tx: number, workItems: unknown[]) => ({
    basis: { tx, validTime: "2026-11-04T12:00:00.000000Z" },
    release: R1.hash,
    subject: "pl:a",
    workItems,
  });
  const emptyState = { items: [], pending: [], subjects: [] };
  it("A07: opaque payloads keep integer tokens, other number tokens as source text, escaped strings", () => {
    const text = JSON.stringify({
      evaluations: [record(1, [wi("wi:1", { a: 0 })])],
      state: emptyState,
    }).replace('"payload":{"a":0}', '"payload":{"z":1.50,"a":-0,"s":"é","n":1E3}');
    const r = runText("publish", text);
    expect(r).toContain('"payload":{"a":0,"n":1E3,"s":"\\u00e9","z":1.50}');
  });
  it("A08: input states indexed by id (later wins); arrays re-sorted; pending keeps input order and appends", () => {
    const item = (id: string, seq: number, payload: unknown) => ({
      id,
      payload,
      retired: false,
      seq,
      subject: "pl:a",
    });
    const state = {
      items: [item("wi:2", 1, { v: 1 }), item("wi:1", 1, { v: 1 }), item("wi:2", 4, { v: 2 })],
      pending: [],
      subjects: [],
    };
    const r = JSON.parse(
      run("publish", {
        evaluations: [record(1, [wi("wi:2", { v: 3 }), wi("wi:1", { v: 1 })])],
        state,
      }),
    );
    expect(r.deliveries.map((d: { id: string; seq: number }) => [d.id, d.seq])).toEqual([
      ["wi:2", 5],
    ]);
    expect(r.state.items.map((i: { id: string; seq: number }) => [i.id, i.seq])).toEqual([
      ["wi:1", 1],
      ["wi:2", 5],
    ]);
  });
  it("A09: a duplicate work-item id in one record is processed in stable id order", () => {
    const r = JSON.parse(
      run("publish", {
        evaluations: [
          record(1, [wi("wi:1", { v: 1 }), wi("wi:1", { v: 2 }), wi("wi:1", { v: 2 })]),
        ],
        state: emptyState,
      }),
    );
    expect(
      r.deliveries.map((d: { seq: number; payload: { v: number } }) => [d.seq, d.payload.v]),
    ).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});

describe("readings A11 to A13 (SPEC 2, 4.4): number tokens and depth a lenient or recursive parser gets wrong", () => {
  it("NaN and Infinity are not JSON values: E_SHAPE, not E_VALUE", () => {
    const text = JSON.stringify(evalInput(baseFacts)).replace('"v":1650,"tx":2', '"v":NaN,"tx":2');
    expect(runText("evaluate", text)).toBe(err("E_SHAPE"));
  });
  it("an integer token with 5,000 digits is an integer token outside its domain", () => {
    const big = "9".repeat(5000);
    const text = JSON.stringify(evalInput(baseFacts)).replace(
      '"v":1650,"tx":2',
      `"v":${big},"tx":2`,
    );
    expect(runText("evaluate", text)).toBe(err("E_VALUE"));
    expect(
      runText("evaluate", JSON.stringify(evalInput(baseFacts)).replace('"tx":10', `"tx":${big}`)),
    ).toBe(err("E_BASIS"));
  });
  it("a 10,000-deep array as a fact value is E_VALUE (A13)", () => {
    const deep = "[".repeat(10_000) + "]".repeat(10_000);
    const text = JSON.stringify(evalInput(baseFacts)).replace(
      '"v":1650,"tx":2',
      `"v":${deep},"tx":2`,
    );
    expect(runText("evaluate", text)).toBe(err("E_VALUE"));
  });
  it("a 200,000-deep payload passes publish and receive and is written back exactly (A13, SPEC 9 item 7)", () => {
    const deep = "[".repeat(200_000) + "]".repeat(200_000);
    const payload = `{"d":${deep}}`;
    const delivery = (seq: number) =>
      `{"id":"wi:x","key":"","kind":"k","payload":${payload},"rule":"MINWAGE","seq":${seq},"subject":"pl:a","version":"wv:x"}`;
    const published = runText(
      "publish",
      `{"evaluations":[{"basis":{"tx":1,"validTime":"2026-11-04T12:00:00.000000Z"},"release":"r","subject":"pl:a",` +
        `"workItems":[{"id":"wi:x","inputs":[],"key":"","kind":"k","payload":${payload},"rule":"MINWAGE","version":"wv:x"}]}],` +
        `"state":{"items":[],"pending":[],"subjects":[]}}`,
    );
    expect(
      published.startsWith(
        `{"deliveries":[${delivery(1)}],"state":{"items":[{"id":"wi:x","payload":${payload},`,
      ),
    ).toBe(true);
    const received = runText(
      "receive",
      `{"deliveries":[${delivery(1)}],"state":{"effects":[],"projection":[]}}`,
    );
    expect(
      received.startsWith(`{"applied":{"effects":[${delivery(1)}],"projection":[${delivery(1)}]}`),
    ).toBe(true);
  });
});

describe("typed entry points", () => {
  it("bigint and number integers give the same bytes", () => {
    const w = (v: number | bigint): World => ({
      subject: "pl:a",
      facts: baseFacts.map((f) => (f.a === "payRateCents" ? { ...f, v } : f)) as Fact[],
    });
    expect(resultJson(evaluateWorld(w(1650n), R1, basis))).toBe(
      resultJson(evaluateWorld(w(1650), R1, basis)),
    );
    expect(resultJson(evaluateWorld(w(1650.5), R1, basis))).toBe(err("E_VALUE"));
    expect(resultJson(evaluateWorld(w(2n ** 53n), R1, basis))).toBe(err("E_VALUE"));
  });
  it("the Effect boundary carries the W0 error code as a tagged value", () => {
    const bad: World = {
      subject: "pl:a",
      facts: [{ e: "pl:b", a: "startDate", v: "2026-11-02", tx: 1 }],
    };
    const exit = Effect.runSyncExit(evaluate(bad, R1, basis));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("W0.E_UNKNOWN");
    const good = Effect.runSync(
      evaluate({ subject: "pl:a", facts: baseFacts as Fact[] }, R1, basis),
    );
    expect(outputJson(good)).toBe(run("evaluate", evalInput(baseFacts)));
  });
});

describe("population (SPEC 12.3) and invariants (SPEC 13)", () => {
  it("isqrt is exact", () => {
    for (const m of [
      0n,
      1n,
      2n,
      3n,
      4n,
      15n,
      16n,
      17n,
      10n ** 24n,
      10n ** 24n / 3n,
      2n ** 127n - 1n,
    ]) {
      const r = isqrt(m);
      expect(r * r <= m && (r + 1n) * (r + 1n) > m).toBe(true);
    }
  });
  const R = rung(100_000);
  const B: Basis = { tx: 4_338_757, validTime: "2026-11-04T12:00:00.000000Z" };
  const sample = Array.from({ length: 150 }, (_, k) => build(R, plan(R, k * 613), 2101));
  it("generated worlds are valid under R1, R2 and R3 and hold 48 to 2,000 facts", () => {
    for (const pl of sample) {
      for (const rel of [R1, R2, R3])
        expect(resultJson(evaluateWorld(pl.world, rel, B))).not.toContain('"error"');
      expect(pl.world.facts.length).toBeGreaterThanOrEqual(48);
      expect(pl.world.facts.length).toBeLessThanOrEqual(2000);
    }
  });
  it("13.1 determinism: shuffling facts changes nothing", () => {
    for (const pl of sample.slice(0, 40)) {
      const facts = [...pl.world.facts];
      for (let k = facts.length - 1; k > 0; k--) {
        const j = (k * 7919 + 13) % (k + 1);
        [facts[k], facts[j]] = [facts[j]!, facts[k]!];
      }
      for (const rel of [R1, R2, R3])
        expect(resultJson(evaluateWorld({ subject: pl.world.subject, facts }, rel, B))).toBe(
          resultJson(evaluateWorld(pl.world, rel, B)),
        );
    }
  });
  it("13.6 ballast neutrality: removing every ballast fact changes no output", () => {
    for (const pl of sample) {
      const facts = pl.world.facts.filter((f) => f.a !== "answers" && !f.e.includes("/ans:"));
      expect(facts.length).toBe(pl.F);
      for (const rel of [R1, R2, R3])
        expect(resultJson(evaluateWorld({ subject: pl.world.subject, facts }, rel, B))).toBe(
          resultJson(evaluateWorld(pl.world, rel, B)),
        );
    }
  });
  it("sweepSubject gives the output, its bytes and its outbox record", () => {
    const pl = sample[3]!;
    const r = sweepSubject(pl.world, R2, B);
    if ("error" in r) throw new Error(r.error);
    expect(r.json).toBe(outputJson(r.output));
    expect(r.record.workItems.map((w) => w.id)).toEqual(r.output.workItems.map((w) => w.id));
  });
});
