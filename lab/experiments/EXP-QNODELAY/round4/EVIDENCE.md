# Round 4 evidence

Durable directory: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round4/`.

- `final4.log`: final admitted parser/reader suite (42 tests) and TypeScript checks, observed exit zero.
- `final-reader-audit4.json`: exclusive-created complete import graph, 22-reader inventory check and 917 current input hashes. All independently rechecked against final source bytes. Digest is in final4.log.
- `final-summary4.json`, `runtime.json`: compact final results, toolchain and baseline. No engine contact. The final command additionally uses heavy label CX-QNODELAY-R4-final4.
- `prior-receipts.{log,json}`, `vitest.config.mjs`: 10 existing QG1/receipt regressions, native config loader, isolated temporary cache; observed exit zero.
- `lab-unit1.log`: 20 lab unit tests, observed exit zero; owned temporary fixtures only.
- `lint4.log`, `syntax4.log`: zero lint errors (12 inherited warnings) and focused JS/TS/Python parse checks.
- `source-final4/`: exact final source and checker/config/report preimages. No dependency/credential caches.
- `review-inputs/`: actual round-3 review, reproduction source and negative-control result bytes.
- Earlier successful source iterations remain in source/, source-final3/, their audit/summary JSON and logs. Final3 adds canonical-parser-path validation; final4 also requires a mode-bearing server-log envelope before percentile calculation. final.log has large JSON split by TAP; later runs use separate audit files. Use final4 for the final gate.

SHA256SUMS binds retained bytes only. Timing values in these tests are synthetic fixtures, not fresh engine performance or semantic acceptance. Previous rounds remain unchanged.
