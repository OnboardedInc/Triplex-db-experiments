/**
 * The 87 golden cases (SPEC 11): run `op` on the case's `input` bytes and compare with canonicalJson(expected), byte for byte.
 * The input is cut out of the case file as raw bytes, so number tokens such as `1650.0`, `1.65e3` and `3.0` and the duplicate
 * key of C66 reach the kernel exactly as written (SPEC 14 rows 1, 34 and 47).
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { JObj, JV, Op } from "../src/index.js";
import { OPS, canonicalJV, runOpBytes, scan } from "../src/index.js";

const CASES = fileURLToPath(new URL("../../../lab/world/W0/cases/", import.meta.url));
const files = readdirSync(CASES)
  .filter((f) => f.endsWith(".json"))
  .sort();

interface Case {
  id: string;
  op: Op;
  inputBytes: Uint8Array;
  expected: string;
  identicalTo: string | null;
}

const field = (o: JObj, k: string): JV => {
  const v = o.m.get(k);
  if (v === undefined) throw new Error(`missing ${k}`);
  return v;
};
const text = (v: JV): string => {
  if (v.t !== "str") throw new Error("not a string");
  return v.v;
};

function load(file: string): Case {
  const src = readFileSync(CASES + file, "utf8");
  const root = scan(src);
  if (root.t !== "obj") throw new Error(`${file}: not an object`);
  const op = text(field(root, "op")) as Op;
  if (!OPS.includes(op)) throw new Error(`${file}: unknown op ${op}`);
  const input = field(root, "input");
  const ident = root.m.get("identicalTo");
  return {
    id: text(field(root, "id")),
    op,
    inputBytes: Buffer.from(src.slice(input.start, input.end), "utf8"),
    expected: canonicalJV(field(root, "expected")),
    identicalTo: ident === undefined ? null : text(ident),
  };
}

const cases = files.filter((f) => scan(readFileSync(CASES + f, "utf8")).t === "obj" && (scan(readFileSync(CASES + f, "utf8")) as JObj).m.has("input")).map(load);

describe("OLD harness (expected re-serialized by the kernel writer)", () => {
  for (const c of cases) {
    it(`${c.id} ${c.op}`, () => {
      const actual = runOpBytes(c.op, c.inputBytes);
      expect(actual).toBe(c.expected);
      if (c.identicalTo !== null) {
        const ref = cases.find((x) => x.id === c.identicalTo);
        expect(ref, `identicalTo ${c.identicalTo}`).toBeDefined();
        expect(actual).toBe(ref!.expected);
      }
    });
  }
});
