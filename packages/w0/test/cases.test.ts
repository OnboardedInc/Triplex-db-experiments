/**
 * The W0 golden cases (SPEC 11), checked by bytes only, so the harness cannot hide a defect in the kernel's own reader or
 * writer (SPEC 11.1, 14 row 65; README "How implementers use it").
 *
 * - Case list: the ids of the case folder's file names, each file's `id`, the keys of `expected-sha256.json` and
 *   `input-sha256.json`, and the id column of SPEC 11.2 must be the same set, so a dropped case file fails.
 * - Input: the bytes of the `input` value exactly as they stand in the case file, from its `{` to its `}` (cut out of the file's
 *   bytes, never decoded and re-encoded), or the decoded `inputBase64` bytes. Their SHA-256 is checked against
 *   `input-sha256.json` before the kernel runs (SPEC 11.1, V-D01e N3).
 * - Output: the SHA-256 of the output's bytes is compared with `expected-sha256.json`; `identicalTo` compares it with the other
 *   case's entry as well. `expected` is never re-serialized: the case file is read with `JSON.parse` for its metadata and, on a
 *   mismatch only, for a structural diff that helps debugging (V-D01c N1).
 * - Synthetic cases (SPEC 11.1, readings A07 to A09, A14, A15): their records are not ones `evaluate` produces, so nothing here
 *   recomputes their ids or versions; their output bytes are compared like every other case's. The flag must sit on exactly the
 *   seven cases SPEC 11.1 lists, all `publish` or `receive`.
 *
 * Nothing in this file uses the kernel's scanner or writer: only `runOpBytes`, the operation under test.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Op } from "../src/index.js";
import { runOpBytes } from "../src/index.js";

const W0 = fileURLToPath(new URL("../../../lab/world/W0/", import.meta.url));
const CASES = W0 + "cases/";
const OPS: readonly string[] = ["evaluate", "reconcile", "affected", "publish", "receive"];
/** SPEC 11.1: `synthetic: true` is valid on exactly these cases. */
const SYNTHETIC = ["C100", "C101", "C102", "C133", "C134", "C135", "C136"];

const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const readJsonObject = (path: string): Record<string, string> =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
const byId = (a: string, b: string): number => Number(a.slice(1)) - Number(b.slice(1));

const EXPECTED_SHA = readJsonObject(W0 + "expected-sha256.json");
const INPUT_SHA = readJsonObject(W0 + "input-sha256.json");

/** The id column of the SPEC 11.2 table. */
function specIds(): string[] {
  const spec = readFileSync(W0 + "SPEC.md", "utf8");
  const from = spec.indexOf("\n### 11.2 ");
  const to = spec.indexOf("\n### 11.3 ", from);
  if (from < 0 || to < 0) throw new Error("SPEC.md has no section 11.2");
  return [...spec.slice(from, to).matchAll(/^\| (C\d+) \|/gm)].map((m) => m[1]!);
}

/**
 * The byte span of the top-level `input` member's value in a case file, found by a small byte scanner of its own (strings with
 * escapes, nesting by brackets). Its result is checked against `input-sha256.json`, so a mistake here fails rather than hides.
 */
function inputSpan(buf: Uint8Array): [number, number] | null {
  const n = buf.length;
  let i = 0;
  const fail = (): never => {
    throw new Error(`case file scan failed at byte ${i}`);
  };
  const ws = (): void => {
    while (i < n && (buf[i] === 0x20 || buf[i] === 0x09 || buf[i] === 0x0a || buf[i] === 0x0d)) i++;
  };
  const skipString = (): string => {
    const start = ++i;
    while (i < n && buf[i] !== 0x22) i += buf[i] === 0x5c ? 2 : 1;
    if (i >= n) fail();
    return Buffer.from(buf.subarray(start, i++)).toString("latin1");
  };
  const skipValue = (): void => {
    const c = buf[i];
    if (c === 0x22) {
      skipString();
      return;
    }
    if (c !== 0x7b && c !== 0x5b) {
      while (i < n && buf[i] !== 0x2c && buf[i] !== 0x7d && buf[i] !== 0x5d && buf[i]! > 0x20) i++;
      return;
    }
    let depth = 0;
    do {
      const d = buf[i];
      if (d === 0x22) skipString();
      else {
        if (d === 0x7b || d === 0x5b) depth++;
        else if (d === 0x7d || d === 0x5d) depth--;
        i++;
      }
    } while (depth > 0 && i < n);
    if (depth !== 0) fail();
  };
  ws();
  if (buf[i] !== 0x7b) fail();
  i++;
  for (;;) {
    ws();
    if (buf[i] !== 0x22) fail();
    const key = skipString();
    ws();
    if (buf[i] !== 0x3a) fail();
    i++;
    ws();
    const start = i;
    skipValue();
    if (key === "input") return [start, i];
    ws();
    if (buf[i] === 0x2c) i++;
    else if (buf[i] === 0x7d) return null;
    else fail();
  }
}

interface Case {
  readonly file: string;
  readonly id: string;
  readonly op: Op;
  readonly synthetic: boolean;
  readonly identicalTo: string | null;
  readonly inputBytes: Uint8Array;
  /** for the structural diff on a mismatch only */
  readonly expected: unknown;
}

function load(file: string): Case {
  const buf = new Uint8Array(readFileSync(CASES + file));
  const doc = JSON.parse(Buffer.from(buf).toString("utf8")) as {
    id?: unknown;
    op?: unknown;
    synthetic?: unknown;
    identicalTo?: unknown;
    inputBase64?: unknown;
    expected?: unknown;
  };
  const hasInput = "input" in doc;
  const hasBase64 = "inputBase64" in doc;
  if (hasInput === hasBase64) throw new Error(`${file}: exactly one of input and inputBase64`);
  let inputBytes: Uint8Array;
  if (hasBase64) {
    if (typeof doc.inputBase64 !== "string")
      throw new Error(`${file}: inputBase64 is not a string`);
    inputBytes = new Uint8Array(Buffer.from(doc.inputBase64, "base64"));
  } else {
    const span = inputSpan(buf);
    if (span === null) throw new Error(`${file}: no top-level input member`);
    inputBytes = buf.slice(span[0], span[1]);
  }
  if (typeof doc.op !== "string" || !OPS.includes(doc.op)) throw new Error(`${file}: bad op`);
  if (doc.synthetic !== undefined && doc.synthetic !== true)
    throw new Error(`${file}: bad synthetic`);
  return {
    file,
    id: String(doc.id),
    op: doc.op as Op,
    synthetic: doc.synthetic === true,
    identicalTo: typeof doc.identicalTo === "string" ? doc.identicalTo : null,
    inputBytes,
    expected: doc.expected,
  };
}

const files = readdirSync(CASES)
  .filter((f) => f.endsWith(".json"))
  .sort();
const cases = files.map(load);
const caseById = new Map(cases.map((c) => [c.id, c]));

describe("W0 golden case list (SPEC 11.2)", () => {
  it("every case file is named after its id", () => {
    for (const c of cases)
      expect(c.file, c.file).toMatch(new RegExp(`^${c.id}-[a-z0-9-]+\\.json$`));
    expect(caseById.size).toBe(cases.length);
  });
  it("the case folder, expected-sha256.json, input-sha256.json and SPEC 11.2 list the same ids", () => {
    const folder = cases.map((c) => c.id).sort(byId);
    expect(Object.keys(EXPECTED_SHA).sort(byId)).toEqual(folder);
    expect(Object.keys(INPUT_SHA).sort(byId)).toEqual(folder);
    expect(specIds().sort(byId)).toEqual(folder);
  });
  it("synthetic sits on exactly the cases SPEC 11.1 lists, all publish or receive", () => {
    const synthetic = cases.filter((c) => c.synthetic);
    expect(synthetic.map((c) => c.id).sort(byId)).toEqual(SYNTHETIC);
    for (const c of synthetic) expect(["publish", "receive"]).toContain(c.op);
  });
});

describe("W0 golden cases (SPEC 11), by SHA-256 of the bytes", () => {
  for (const c of [...cases].sort((a, b) => byId(a.id, b.id))) {
    it(`${c.id} ${c.op}${c.synthetic ? " synthetic" : ""}`, () => {
      expect(sha256(c.inputBytes), "input bytes against input-sha256.json").toBe(INPUT_SHA[c.id]);
      const actual = runOpBytes(c.op, c.inputBytes);
      const got = sha256(new TextEncoder().encode(actual));
      const want = EXPECTED_SHA[c.id];
      if (got !== want) {
        // Debugging aid only: a structural diff against the case's `expected`. The hash comparison below decides.
        let parsed: unknown = actual;
        try {
          parsed = JSON.parse(actual);
        } catch {
          // keep the raw text
        }
        expect.soft(parsed, `${c.id} structural diff`).toEqual(c.expected);
      }
      expect(got, `${c.id} output sha256 against expected-sha256.json`).toBe(want);
      if (c.identicalTo !== null) {
        expect(caseById.has(c.identicalTo), `identicalTo ${c.identicalTo}`).toBe(true);
        expect(got, `identicalTo ${c.identicalTo}`).toBe(EXPECTED_SHA[c.identicalTo]);
      }
    });
  }
});
