import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { latencyReceipt, qleverLatencyReceipt } from "../../../receipts/latency.mjs";
import { summarizeGridCell } from "../../EXP-QG1-qlever-generations/summary-cell.mjs";

const hash = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
it("requires actual mode at the JS serialization boundary too", () => {
  for (const fn of [latencyReceipt, qleverLatencyReceipt]) {
    for (const mode of [undefined, "", "unknown", "mixed"])
      expect(() => fn({ qleverConnectionMode: mode } as any)).toThrow(TypeError);
    expect(
      fn({
        receiptVersion: "qlever-latency/1",
        writer: "qg1-sample/1",
        latencyWriter: "qg1-sample/1",
        units: "ms",
        qleverConnectionMode: "keep-alive",
        ms: 1,
      }),
    ).toMatchObject({
      qleverConnectionMode: "keep-alive",
      ms: 1,
    });
  }
  expect(() => qleverLatencyReceipt({ qleverConnectionMode: null } as any)).toThrow(TypeError);
  expect(latencyReceipt({ qleverConnectionMode: null, lane: "xtdb" }).lane).toBe("xtdb");
});

const fixture = () => {
  const data = {
    cell: {
      receiptVersion: "qlever-latency/1",
      writer: "qg1-cell/1",
      latencyWriter: "qg1-cell/1",
      units: "ms",
      qleverConnectionMode: "keep-alive",
      label: "N0",
      before: { baseTriples: 1, deltaTriples: { total: 3, inserted: 2, deleted: 1 }, rss: 100 },
      c8: { status: 0 },
      p4: { status: 0, connectionMode: "keep-alive" },
      results: {
        base: [
          {
            receiptVersion: "qlever-latency/1",
            writer: "qg1-sample/1",
            latencyWriter: "qg1-sample/1",
            units: "ms",
            qleverConnectionMode: "keep-alive",
            ms: 2,
            rows: 1,
          },
          {
            receiptVersion: "qlever-latency/1",
            writer: "qg1-sample/1",
            latencyWriter: "qg1-sample/1",
            units: "ms",
            qleverConnectionMode: "keep-alive",
            ms: 1,
            rows: 1,
          },
        ],
      },
    },
    p4: {
      receiptVersion: "qlever-latency/1",
      writer: "qg1-p4/1",
      latencyWriter: "qg1-p4/1",
      units: "ms",
      qleverConnectionMode: "keep-alive",
      sample: [{ ms: 1, contentEqual: true }],
      summary: { p50: 1, p99: 2 },
    },
  };
  return {
    ...data,
    paths: () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qg1-r5-"));
      const c = path.join(dir, "cell.json"),
        p = path.join(dir, "p4.json");
      fs.writeFileSync(c, JSON.stringify(data.cell));
      fs.writeFileSync(p, JSON.stringify(data.p4));
      return [c, p] as const;
    },
  };
};
it("QG1 summary retains the homogeneous direct-fetch and P4 mode", () => {
  const f = fixture(),
    result = summarizeGridCell("M", ...f.paths());
  expect(result.qleverConnectionMode).toBe("keep-alive");
  expect(result.queries.base.qleverConnectionMode).toBe("keep-alive");
  expect(result.p4QleverConnectionMode).toBe("keep-alive");
  expect(result.p4Summary).toEqual({ p50: 1, p99: 2 });
});
it.each(["cell", "p4", "invocation", "cold", "warm", "missing-child", "mismatch"])(
  "QG1 summary refuses missing/mismatched mode: %s",
  (field) => {
    const f = fixture();
    const { cell, p4 }: any = f;
    if (field === "cell" || field === "p4")
      delete (field === "cell" ? cell : p4).qleverConnectionMode;
    if (field === "invocation") delete cell.p4.connectionMode;
    if (field === "cold" || field === "warm")
      delete cell.results.base[field === "cold" ? 0 : 1].qleverConnectionMode;
    if (field === "mismatch") cell.results.base[1].qleverConnectionMode = "per-request";
    const [cPath, pPath] = f.paths();
    expect(() => summarizeGridCell("M", cPath, field === "missing-child" ? null : pPath)).toThrow();
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
