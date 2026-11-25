// [DX-S3] How many owners each save of the production-shaped tape writes (shape S, one commit per save), per loaded
// card cell, as the card builds it (`v01/production-card.ts` fullCellTape, 300 s cells, both tape edges). Counts
// saves and rows by the number of distinct owners a save writes. Pure computation, no gateway, seconds on the Mac.
//   node --experimental-transform-types s3/tape-owners.ts <out.json>
// Why: the share of two-to-four-owner saves on the tape is what the extension would cover on the card.
// Rejected: querying production (not allowed here; the tape's parameters are already the production study's shares).
import { writeFileSync } from "node:fs";
import { fullCellTape, isProduction } from "../v01/production-card.ts";
import { cellPath, serverCells } from "../v01/server-workload.ts";

const out = process.argv[2];
const result: Record<string, unknown> = {};
for (const edge of ["spread", "calibrated"] as const) {
  for (const cell of serverCells.filter((c) => c.loaded)) {
    const tape = fullCellTape("S", cell, 300, edge);
    // A save is one commit in shape S; the quiet account's commits are the card's own one-owner stream.
    const owners = new Map<number, { saves: number; rows: number }>();
    let saves = 0, rows = 0, quiet = 0;
    for (const w of tape) {
      if (!isProduction(w)) { quiet++; continue; }
      const n = new Set([w.owner]).size; // every production write names exactly one owner (the subject's first task)
      const bucket = owners.get(n) ?? { saves: 0, rows: 0 };
      bucket.saves++; bucket.rows += w.rows;
      owners.set(n, bucket);
      saves++; rows += w.rows;
    }
    const share = (n: number) => ({
      saves: owners.get(n)?.saves ?? 0, rows: owners.get(n)?.rows ?? 0,
      shareOfSaves: (owners.get(n)?.saves ?? 0) / saves, shareOfRows: (owners.get(n)?.rows ?? 0) / rows,
    });
    const over4 = [...owners.keys()].filter((n) => n > 4).reduce((a, n) => a + owners.get(n)!.saves, 0);
    result[`${edge}/${cellPath(cell)}`] = {
      neighbourSaves: saves, neighbourRows: rows, quietCommits: quiet,
      owners1: share(1), owners2: share(2), owners3: share(3), owners4: share(4), ownersOver4Saves: over4,
    };
  }
}
writeFileSync(out!, JSON.stringify(result, null, 2));
for (const [k, v] of Object.entries(result)) {
  const x = v as any;
  console.log(`DX-S3_TAPE ${k} saves ${x.neighbourSaves} rows ${x.neighbourRows}; one owner ${x.owners1.saves} (${(100 * x.owners1.shareOfSaves).toFixed(1)}% of saves, ${(100 * x.owners1.shareOfRows).toFixed(1)}% of rows); two ${x.owners2.saves}, three ${x.owners3.saves}, four ${x.owners4.saves}, over four ${x.ownersOver4Saves}; quiet commits ${x.quietCommits}`);
}
