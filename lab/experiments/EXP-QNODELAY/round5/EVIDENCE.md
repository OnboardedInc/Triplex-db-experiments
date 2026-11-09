# Round 5 evidence

Durable directory: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round5/`.

- `final8.log`: final admitted parser/reader suite (54 tests) and TypeScript checks; observed exit zero.
- `final-reader-audit8.json`: exclusive-created import graph, 24-reader inventory check and 1,018 final input hashes. All independently rechecked; its digest appears in final8.log.
- `final-summary8.json`, `runtime-final8.json`: final result, baseline/toolchain. Final heavy label is CX-QNODELAY-R5-final8. No engine contact; default keep-alive.
- `source-final8/`: exact final source/checker/config/report preimages, with no dependency or credential caches.
- `prior-receipts-final.{log,json}`, `vitest-final.config.mjs`: 10 path/version-migrated receipt regressions; native config loader, private temporary cache, observed exit zero.
- `lab-unit.log`: 20 lab unit tests; owned temporary fixtures only, observed exit zero.
- `lint-final8.log`, `syntax-final8.log`: zero lint errors (12 inherited warnings), focused JS/TS/Python parsing. New parser/guard/test/type files pass formatting checks.
- `review-inputs/`: exact round-4 report, reproductions, data-path search and pin audit inputs.
- First failures remain: parser2.log exposed decoded-record trim; gate1.log exposed package-tree candidate scope; gate2.log found the feasibility reader/producer false positive; final4/final5 passed runtime tests but failed overload typechecking. Earlier successful outputs/source-final belong to earlier source iterations. Use final8/source-final8 for the final gate, including the explicit XTDB-only guard regression.

Complete-body report/load units mock controller/oracle dependencies explicitly and use real temporary receipt paths; synthetic terminal markers prevent verified-attempt claims. Other fixture timings are synthetic too. No new engine performance, engine-backed PASS or default promotion is inferred. Previous rounds remain unchanged.
