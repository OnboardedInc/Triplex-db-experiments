# Part 6 checks

Normal Datomic unit command content (`vitest run` in packages/datomic): 235 passed, 51 external skips, 28 files passed/16 skipped; 4.28 seconds. Package TypeScript check passed. Shell syntax and git diff whitespace checks passed. No external gate is inferred from a skip.

The required pnpm --store-dir form was rejected by installed pnpm for the test subcommand (unknown option); that first failure remains in p6-final-unit.log. The same package test script was then run through the installed local vitest binary under heavy.mjs; no dependency installation or global store mutation occurred. Logs and source/diff receipt: p6-final-suite.log, p6-phase-derive-tests.log, p6-final-types.log, p6-checks-receipt.json in the private evidence root.

Native combined check at b6aa04e7: gateway 18 tests/53,860 assertions, layout differential 300 scenarios/95,028 comparisons, native concurrency/clock tests complete, live replica 200,000 worlds/4,590 writes/zero differences; fresh 1,000-subject oracle PASS. This combination includes both revision-read variants, two transactor cores and incremental reader bases. Revision/delta are still diagnostic options; their semantic checks do not establish performance gains. The later twelve core/revision arms each have fresh loaded oracle checks. No product TS behavior changed after this native check.

Full reference and full diagnostic pairs completed with source-bound collectors and fresh oracle PASS. Existing root/bench checking has inherited coverage/type errors (report-revision-race.mjs registration; audit-traffic.ts/round2.ts). No root or pack-check PASS is claimed. Physical power-loss durability was not tested; existing fsync/synchronous_commit/full_page_writes readbacks remain ON.
