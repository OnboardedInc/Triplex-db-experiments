import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { latencyReceipt, qleverLatencyReceipt } from "../../../receipts/latency.mjs";
import { summarizeGridCell } from "../../EXP-QG1-qlever-generations/summary-cell.mjs";

const hash = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
it("requires actual mode at the JS serialization boundary too", () => {
  for (const fn of [latencyReceipt, qleverLatencyReceipt]) {
    for (const mode of [undefined, "", "unknown", "mixed"])
      expect(() => fn({ qleverConnectionMode: mode } as any)).toThrow(TypeError);
    expect(fn({ qleverConnectionMode: "keep-alive", ms: 1 })).toEqual({
      qleverConnectionMode: "keep-alive",
      ms: 1,
    });
  }
  expect(() => qleverLatencyReceipt({ qleverConnectionMode: null } as any)).toThrow(TypeError);
  expect(latencyReceipt({ qleverConnectionMode: null, lane: "xtdb" }).lane).toBe("xtdb");
});

const fixture = () => ({
  cell: {
    qleverConnectionMode: "keep-alive",
    label: "N0",
    before: { baseTriples: 1, deltaTriples: { total: 3, inserted: 2, deleted: 1 }, rss: 100 },
    c8: { status: 0 },
    p4: { status: 0, qleverConnectionMode: "per-request" },
    results: {
      base: [
        { qleverConnectionMode: "keep-alive", ms: 2, rows: 1 },
        { qleverConnectionMode: "keep-alive", ms: 1, rows: 1 },
      ],
    },
  },
  p4: {
    qleverConnectionMode: "per-request",
    sample: [{ contentEqual: true }],
    summary: { p50: 1, p99: 2 },
  },
});
it("QG1 summary retains distinct direct-fetch and P4 child modes", () => {
  const { cell, p4 } = fixture(),
    result = summarizeGridCell("M", cell, p4);
  expect(result.qleverConnectionMode).toBe("keep-alive");
  expect(result.queries.base.qleverConnectionMode).toBe("keep-alive");
  expect(result.p4QleverConnectionMode).toBe("per-request");
  expect(result.p4Summary).toEqual({ p50: 1, p99: 2 });
});
it.each(["cell", "p4", "invocation", "cold", "warm", "missing-child", "mismatch"])(
  "QG1 summary refuses missing/mismatched mode: %s",
  (field) => {
    const { cell, p4 }: any = fixture();
    if (field === "cell" || field === "p4")
      delete (field === "cell" ? cell : p4).qleverConnectionMode;
    if (field === "invocation") delete cell.p4.qleverConnectionMode;
    if (field === "cold" || field === "warm")
      delete cell.results.base[field === "cold" ? 0 : 1].qleverConnectionMode;
    if (field === "mismatch") cell.results.base[1].qleverConnectionMode = "per-request";
    expect(() => summarizeGridCell("M", cell, field === "missing-child" ? null : p4)).toThrow(
      TypeError,
    );
  },
);

// [EXP-QNODELAY] Why: exercise the grid's actual writer, never its mutating engine
// workflow. Rejected: rewriting the function in a fixture (can miss writer drift).
it("QG1 direct-fetch request writer labels the exact fresh response and timing", async () => {
  const grid = fs.readFileSync(
    path.resolve("lab/experiments/EXP-QG1-qlever-generations/grid.mjs"),
    "utf8",
  );
  const source = grid.slice(grid.indexOf("async function req("), grid.indexOf("\nconst seed ="));
  const writes: any[] = [],
    calls: any[] = [];
  const req = new Function(
    "fetch",
    "fs",
    "path",
    "out",
    "hash",
    "save",
    "qleverLatencyReceipt",
    `let serial=0; ${source}; return req;`,
  )(
    async (url: string, init: any) => {
      calls.push({ url, init });
      return { status: 200, text: async () => '{"fresh":true}' };
    },
    { writeFileSync: (file: string, bytes: string) => writes.push({ file, bytes }) },
    path,
    "fixture-only",
    hash,
    (file: string, value: any) => writes.push({ file, value }),
    qleverLatencyReceipt,
  );
  const result = await req({ query: "SELECT ?x WHERE {}" });
  expect(calls).toHaveLength(1);
  const receipt = writes.find((x) => x.file === "1.request.json").value;
  expect(receipt).toMatchObject({
    qleverConnectionMode: "keep-alive",
    status: 200,
    sha256: hash('{"fresh":true}'),
  });
  expect(receipt.ms).toBeGreaterThanOrEqual(0);
  expect(result.qleverConnectionMode).toBe("keep-alive");
});
