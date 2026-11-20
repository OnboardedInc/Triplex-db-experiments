import assert from "node:assert/strict";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { canonical } from "../../../bench/lib/w0-world.ts";

// [DX-ACT2] Why: one minute edit should log its posting and the changed root hash. Retain at most one base read however many saves follow. Rejected: logging every unchanged member of a 96-person leaf, or following an unbounded chain after a crash.
type Path = (string | number)[];
type Edit = [Path, 0] | [Path, 1, unknown] | [Path, 2, number, number, unknown[]];
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export function packIndex(base: unknown, next: unknown) {
  const edits: Edit[] = [];
  function diff(a: any, b: any, path: Path) {
    if (a === b) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === b.length) {
        for (let n = 0; n < a.length; n++) diff(a[n], b[n], [...path, n]);
        return;
      }
      let i = 0,
        j = 0;
      while (i < a.length && i < b.length && canonical(a[i]) === canonical(b[i])) i++;
      while (
        j < a.length - i &&
        j < b.length - i &&
        canonical(a[a.length - 1 - j]) === canonical(b[b.length - 1 - j])
      )
        j++;
      edits.push([path, 2, i, a.length - i - j, b.slice(i, b.length - j)]);
      return;
    }
    if (record(a) && record(b)) {
      for (const k of Object.keys(a)) if (!Object.hasOwn(b, k)) edits.push([[...path, k], 0]);
      for (const k of Object.keys(b))
        if (Object.hasOwn(a, k)) diff(a[k], b[k], [...path, k]);
        else edits.push([[...path, k], 1, b[k]]);
      return;
    }
    edits.push([path, 1, b]);
  }
  diff(base, next, []);
  return deflateRawSync(Buffer.from(canonical(edits)), { level: 3 }).toString("base64");
}
export function unpackIndex(base: unknown, packed: string) {
  const edits: Edit[] = JSON.parse(
      inflateRawSync(Buffer.from(packed, "base64"), { maxOutputLength: 32 * 1024 * 1024 }).toString(
        "utf8",
      ),
    ),
    out = structuredClone(base) as any;
  for (const [p, op, ...data] of edits) {
    assert(
      p.length > 0 &&
        p.every((s) =>
          typeof s === "number"
            ? Number.isSafeInteger(s) && s >= 0
            : !["__proto__", "constructor", "prototype"].includes(s),
        ),
    );
    let o = out;
    for (const k of p.slice(0, -1)) {
      assert(Object.hasOwn(o, k));
      o = o[k];
    }
    const k = p.at(-1)!;
    if (op === 0) {
      assert(Object.hasOwn(o, k));
      delete o[k];
    } else if (op === 1) o[k] = data[0];
    else {
      assert(op === 2 && Array.isArray(o[k]));
      const [at, cut, values] = data as [number, number, unknown[]];
      o[k].splice(at, cut, ...values);
    }
  }
  return out;
}
