import { parseLatencyReceipt } from "../../receipts/parse.ts";
import { qleverLatencyReceipt, requireQleverConnectionMode } from "../../receipts/latency.mjs";

// [EXP-QNODELAY] Why: direct-fetch and P4 child modes can differ. Rejected:
// reconstructing absent historical metadata from today's environment or pooling
// incompatible modes into a screening comparison.
export function summarizeGridCell(arm, cell, p4) {
  cell = parseLatencyReceipt(cell, { lane: "qlever", source: "grid cell" });
  if (p4) p4 = parseLatencyReceipt(p4, { lane: "qlever", source: "P4 child" });
  const qleverConnectionMode = requireQleverConnectionMode(cell.qleverConnectionMode);
  const p4Mode = p4 ? requireQleverConnectionMode(p4.qleverConnectionMode) : null;
  if (cell.p4?.status === 0 && !p4) throw new TypeError("successful P4 child receipt missing");
  if (p4 && requireQleverConnectionMode(cell.p4?.qleverConnectionMode) !== p4Mode)
    throw new TypeError("P4 child mode differs from its grid invocation");
  return qleverLatencyReceipt({
    qleverConnectionMode,
    p4QleverConnectionMode: p4Mode,
    arm,
    label: cell.label,
    base: cell.before.baseTriples,
    delta: cell.before.deltaTriples.total,
    inserted: cell.before.deltaTriples.inserted,
    deleted: cell.before.deltaTriples.deleted,
    rss: cell.before.rss,
    c8Status: cell.c8.status,
    p4Status: cell.p4?.status,
    p4Summary: p4?.summary,
    p4ContentChecks: p4
      ? { n: p4.sample.length, matched: p4.sample.filter((x) => x.contentEqual).length }
      : null,
    queries: Object.fromEntries(
      Object.entries(cell.results).map(([key, value]) => {
        const coldMode = parseLatencyReceipt(value[0], { lane: "qlever", source: "cold sample" }).qleverConnectionMode;
        const warmMode = parseLatencyReceipt(value[1], { lane: "qlever", source: "warm sample" }).qleverConnectionMode;
        if (coldMode !== warmMode || coldMode !== qleverConnectionMode)
          throw new TypeError("cold/warm query mode differs from its grid cell");
        return [
          key,
          qleverLatencyReceipt({
            qleverConnectionMode: coldMode,
            coldMs: value[0].ms,
            warmMs: value[1].ms,
            rows: value[0].rows,
          }),
        ];
      }),
    ),
  });
}
