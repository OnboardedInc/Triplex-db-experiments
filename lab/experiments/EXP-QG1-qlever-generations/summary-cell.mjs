// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import { readLatencyRun } from "../../receipts/parse.ts";
import { qleverLatencyReceipt, requireQleverConnectionMode } from "../../receipts/latency.mjs";

// [EXP-QNODELAY] Why: direct-fetch and P4 child modes can differ. Rejected:
// reconstructing absent historical metadata from today's environment or pooling
// incompatible modes into a screening comparison.
export function summarizeGridCell(arm, cellFile, p4File, entry) {
  const cellRun = readLatencyRun(cellFile, { lane: "qlever", expectedWriter: "qg1-cell/1", entry }).unwrap();
  const p4Run = p4File ? readLatencyRun(p4File, { lane: "qlever", expectedWriter: "qg1-p4/1", expectedMode: cellRun.transportMode }).unwrap() : null;
  const cell = cellRun.data, p4 = p4Run?.data ?? null;
  const qleverConnectionMode = requireQleverConnectionMode(cell.qleverConnectionMode);
  const p4Mode = p4 ? requireQleverConnectionMode(p4.qleverConnectionMode) : null;
  if (cell.p4?.status === 0 && !p4) throw new TypeError("successful P4 child receipt missing");
  if (p4 && requireQleverConnectionMode(cell.p4?.connectionMode) !== p4Mode)
    throw new TypeError("P4 child mode differs from its grid invocation");
  return qleverLatencyReceipt({
    writer: "qg1-cell-summary/1", qleverConnectionMode,
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
        const coldMode = value[0].qleverConnectionMode;
        const warmMode = value[1].qleverConnectionMode;
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
