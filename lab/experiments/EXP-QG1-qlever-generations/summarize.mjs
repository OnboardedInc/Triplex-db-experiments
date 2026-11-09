import { parseLatencyReceipt, parseLatencyReceipts } from "../../receipts/parse.ts";
import { summarizeGridCell } from "./summary-cell.mjs";
import { qleverLatencyReceipt, requireQleverConnectionMode } from "../../receipts/latency.mjs";
import fs from "node:fs";
import path from "node:path";
const root = process.argv[2];
const out = process.argv[3];
if (!root || !out || fs.existsSync(out)) throw Error("root and new summary path required");
const cells = [];
for (const arm of ["M", "U"]) {
  const dir = path.join(root, `grid-${arm}-attempt2`);
  if (!fs.existsSync(path.join(dir, "summary.json"))) continue;
  for (const cell of parseLatencyReceipts(fs.readFileSync(path.join(dir, "summary.json")), { lane: "qlever", source: dir })) {
    let p4 = null;
    try {
      p4 = parseLatencyReceipt(fs.readFileSync(path.join(dir, `${cell.label}-p4.json`)), { lane: "qlever", source: cell.label });
    } catch {}
    cells.push(summarizeGridCell(arm, cell, p4));
  }
}
const qleverConnectionMode = requireQleverConnectionMode(cells[0]?.qleverConnectionMode);
if (cells.some(cell => cell.qleverConnectionMode !== qleverConnectionMode))
  throw new TypeError("cannot fit cells with different direct-query connection modes");
const fit = (xy) => {
  const n = xy.length;
  if (n < 2) return null;
  const mx = xy.reduce((s, [x]) => s + x, 0) / n,
    my = xy.reduce((s, [, y]) => s + y, 0) / n;
  const xx = xy.reduce((s, [x]) => s + (x - mx) ** 2, 0),
    yy = xy.reduce((s, [, y]) => s + (y - my) ** 2, 0),
    xyc = xy.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  return {
    n,
    interceptMs: my - (xyc / xx) * mx,
    slopeMsPerMillionDelta: xyc / xx,
    rSquared: yy ? xyc ** 2 / xx / yy : null,
  };
};
const fits = {};
for (const arm of ["M", "U"])
  for (const query of ["base", "delta", "predicate", "join"])
    fits[`${arm}/${query}`] = fit(
      cells
        .filter((c) => c.arm === arm && c.label !== "rebuilt" && c.queries[query].rows > 0)
        .map((c) => [c.delta / 1e6, c.queries[query].coldMs]),
    );
// [EXP-QG1] Why: screen ratios only after successful full content samples and C8.
// Rejected: a small-sample screening maximum as a qualified production threshold.
const screening = {};
for (const arm of ["M", "U"]) {
  const armCells = cells.filter((c) => c.arm === arm && c.label !== "rebuilt");
  const zero = armCells.find((c) => c.label === "N0");
  screening[arm] = {
    qualifiedThreshold: null,
    reason:
      "exact touched-block counts, frozen trace, independent P4 oracle and 100k-subject rung absent",
    sampleOnlyCandidate: zero?.p4Summary
      ? (armCells
          .filter(
            (c) =>
              c.p4QleverConnectionMode === zero.p4QleverConnectionMode &&
              c.c8Status === 0 &&
              c.p4Status === 0 &&
              c.p4ContentChecks?.matched === c.p4ContentChecks?.n &&
              c.p4Summary?.p99 <= 1.1 * zero.p4Summary.p99,
          )
          .map((c) => c.delta)
          .sort((a, b) => b - a)[0] ?? null)
      : null,
  };
}
fs.writeFileSync(
  out,
  JSON.stringify(
    qleverLatencyReceipt({ qleverConnectionMode, p4ConnectionModes: [...new Set(cells.map(c => c.p4QleverConnectionMode))], cells, fits, screening, verdict: "DIAGNOSTIC; correlation fits, no performance PASS" }),
    null,
    2,
  ),
);
console.log(JSON.stringify({ cells: cells.length, screening }));
