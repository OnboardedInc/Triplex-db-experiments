Current normal Datomic package tests: **354 passed, 52 external-service skips, zero failed**. `p12/current-datomic-unit.json` contains the actual execution results; native tests were separately run in owned stacks, not counted as unit skips passing. Focused current driver/plan/rescore/verdict TypeScript check passed (`current-bench-types.log`).

| Gate / source | Actual result | Limit |
| --- | --- | --- |
| Core normal suite / `1764c399` | 861 passed | Core code unchanged afterwards; no new whole-root PASS. |
| Datomic normal / `1764c399` | 346 passed, 51 external skips | Earlier checkpoint; superseded by current 354/52 for normal tests. |
| Datomic all fast flags / `1764c399` | 346 passed, 51 external skips | Unit paths, not a loaded candidate oracle or differential. |
| Core and Datomic builds/declarations/types | Passed | Actual command/status receipts in `p12/final-checks/checks.json`. |
| Trace/report regression | 26 passed | Includes a captured long RYOW overlapping 10,738 ambient GC events. |
| Current verdict regressions | 14 passed | Includes empty-settle sweep and read-count/unknown-histogram cases; also included in normal package suite. |
| Compiler/population diagnostics | Tests passed | Pure settings and argument resolution; not native 100k qualification. |
| Native-c | Clock/concurrency slices passed; history grouping failed HTTP timeout | First failure retained; legacy client-ordered concurrency replays are not reported as zero. |
| Native-d | Full 1k grouping; 200k differential / 4,994 writes / zero differences; oracle PASS | Separate proof scopes and test bytes/source/slot recorded; actual exit 0 after bounded supervisor extension. |
| Three 10k diagnostic pairs | 49,952,272 correct model reads; all three loaded oracles PASS | Smoke, not v3; write-derived sparse bars stay unjudged. |
| Row ABBA | Four DONE/trace-complete arms, 3,420 correct readbacks each | No gain beyond drift; zero-reader oracle NOT-RUN. |
| Historical C/A/F/G/H rescores | Zero legacy differences; old ACK values equal within .001 ms | Historical only; old raw/oracle bytes are never promoted into a fresh run. |
| Root checkJs | Fails inherited `packages/datomic/test/report-revision-race.mjs` inclusion | Predates part 12; no whole-root `pnpm check` PASS. |
| Pack check | Owed; attempted pinned pnpm invocation rejects `--store-dir` for pack/run | No unapproved store/config fallback and no tarball PASS. |

Attempt retention: smoke-a failed the unsupported 1k rung; smoke-b completed; native-c failed the first history proof; native-d completed. CPU-study a refused sandbox host counters, b completed timing but failed empty-sweep finalization, c was stopped early to recover disk headroom, d completed all six arms. Row-a measured all four arms successfully, then its original report failed the control selector; replay succeeded after the report-only fix. No failed attempt was relabelled.

Reporter cost recovery uses the same captured bytes: old attribution 2,082/2,238 ms versus new 8.111/3.860 ms for the pathological RYOW, identical returned JSON. Full separate-directory rendering took 16.377 s; summary except reporter hash, HTML, Chrome JSON and Markdown prefix match. The original finalizer alone appended the writer-stat footer. This is post-run report cost, not commit-latency improvement.

All native attempts used the owned endpoint, fresh tags/slots and measurement lease, exact local reads, strict scope and `pending` split rule. All owned containers, volumes and networks were removed before lease release; CPU/scheduler state restoration is recorded. No 100k run, forbidden port, colima command, foreign engine lifecycle action, upload, agent delegation, new dependency/image download or push was performed.

Final SHA verification checked all 3,330 retained files successfully. Two generated failed-run TRACE-REPORT copies retain an extra blank line at EOF to preserve their sealed original bytes; the final whitespace check suppresses only that generated-output warning. Source/tests and all other whitespace checks remain unchanged.
