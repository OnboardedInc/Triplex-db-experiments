// [EXP-QH1] Why: W0's integer-only data cannot detect Q105b's REAL rounding; use arbitrary IEEE bits.
// Rejected: checking generated SQL without persisting values through the production worker.
import fs from "node:fs";
import { it, expect } from "vitest";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { h1Rows } from "../../../packages/qlever/src/broker/h1.js";
import { decodeValueColumns, ValueDomains } from "../../../packages/core/src/ValueDomain.js";
import { row, append, fresh, base } from "./helpers.js";
it("G4c: 100000 persisted values preserve exact payloads or the same typed rejection", async () => {
  const { log } = await HostLog.open(fresh(), { minFreeBytes: 0 });
  const bytes = new DataView(new ArrayBuffer(8));
  let seed = 7419;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const edges = [
    -0,
    0,
    5e-324,
    Number.MAX_VALUE,
    2 ** 53 - 1,
    2 ** 53,
    2 ** 53 + 2,
    -(2 ** 53),
    Number.MIN_VALUE,
    1 / 3,
    0.30000000000000004,
  ];
  let compared = 0,
    rejected = 0;
  const expected = new Map<string, any>();
  const outcome = (f: () => any) => {
    try {
      return { value: f() };
    } catch (e: any) {
      return { error: e._tag };
    }
  };
  try {
    for (let offset = 0; offset < 100000; offset += 250) {
      const rows = [];
      for (let j = 0; j < 250; j++) {
        const i = offset + j,
          r = row(i, "s:" + Math.floor(i / 250), 2048 + offset);
        bytes.setUint32(0, random());
        bytes.setUint32(4, random());
        let v = bytes.getFloat64(0);
        if (!Number.isFinite(v)) v = 0;
        r.value_number = i < edges.length ? edges[i]! : v;
        // -0 is outside QLever's public domain, and the public gate proves refusal before frame JSON.
        // The persisted codec sample uses +0; unsupported -0 is not silently admitted as a valid write.
        if (Object.is(r.value_number, -0)) r.value_number = 0;
        if (i >= edges.length && i % 8 === 0) {
          r.value_type = "string";
          r.value_number = null;
          r.value_string = ["hé😀", "x\0y", "\ud800", 'a"b\\c\n'][Math.floor(i / 8) % 4]!;
        }
        if (i >= edges.length && i % 8 === 1) {
          r.value_type = "integer";
          r.value_number = null;
          r.value_string = [
            "9223372036854775807",
            "-9223372036854775808",
            "576460752303423487",
            "-576460752303423488",
          ][Math.floor(i / 8) % 4]!;
        }
        if (i >= edges.length && i % 8 === 2) {
          r.value_type = "boolean";
          r.value_number = null;
          r.value_boolean = (i >> 3) % 2;
        }
        expected.set(
          r.id,
          outcome(() => decodeValueColumns(r, ValueDomains.qlever)),
        );
        rows.push(r);
      }
      await append(log, rows);
    }
    for (let k = 0; k < 400; k++) {
      const answer = await log.wholePull(101798, ["s:" + k]);
      const tuples = JSON.parse(answer.text);
      expect(tuples.length).toBe(250);
      for (const t of tuples) {
        const normal = outcome(() => [...h1Rows([t], { validAt: 100 }).values()][0]![0]!.value);
        if (normal.error) rejected++;
        const id = t[14]?.row.id ?? (t[0] ? undefined : t[1]);
        // Tuple ids are also checked against the row route's exact decoded ids.
        const decoded = normal.value
          ? [...h1Rows([t], { validAt: 100 }).values()][0]![0]
          : undefined;
        const sourceId = decoded?.id ?? id;
        const reference = sourceId ? expected.get(sourceId) : undefined;
        if (reference) expect(normal).toEqual(reference);
        else {
          // Rejected values still compare by the stable index/id from the row route below.
          expect(normal.error).toBe("InvalidTripleError");
        }
        compared++;
      }
      const canonical = (await log.pull(101798, { entities: ["s:" + k] })).rows;
      expect(canonical.length).toBe(tuples.length);
      for (let j = 0; j < canonical.length; j++) {
        const r = canonical[j]!;
        // SQL and row routes have the same owner/e/id order for this single live entity.
        const actual = outcome(
          () => [...h1Rows([tuples[j]], { validAt: 100 }).values()][0]![0]!.value,
        );
        expect(actual).toEqual(expected.get(r.id));
      }
    }
    expect(compared).toBe(100000);
    fs.writeFileSync(
      pathJoin(base, "codec-counts.json"),
      JSON.stringify({ compared, rejected, seed: 7419 }),
    );
  } finally {
    await log.close();
  }
}, 300000);
function pathJoin(a: string, b: string) {
  return a + "/" + b;
}
