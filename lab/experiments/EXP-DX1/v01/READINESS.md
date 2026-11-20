# DX-V01 merge readiness

North star covers P1–P9 on one Datomic database. Parts come from `origin/main` `cf738d13cee41ad27f4a092d36a550119257af4b` and its [V0.1 table](https://github.com/OnboardedInc/Triplex-db-experiments/blob/cf738d13cee41ad27f4a092d36a550119257af4b/lab/V0.1.md). The base under test is `origin/exp/DX-INT1` `8b1bb2c843688a2379e25bbc8545b5c68b0c2284`. November 20 remote heads matched the local snapshots. Each outstanding source was trial-merged separately into the clean DX-V01 worktree with `--no-commit --no-ff` and then aborted. Counts are `INT1..source`; they include reports and prior experiments. Gates below describe availability and recorded runs on ancestral integration commits ([integration evidence](../int1/P5-EVIDENCE.md)).

| Required part | Source and newest commit | Ancestor | Unmerged | Trial merge | Gates on INT1 | Missing |
| --- | --- | --- | ---: | --- | --- | --- |
| Write path and queryable layout K journal | `exp/DX-W1-commit-tail-reads` `5fe362929828c2657cc61104c5730a4105bf9bff` | No | 1 | Clean | WFIX1 native SQL and replay suites, Datomic SDK tests. | The remaining W1 commit carries gate evidence and the campaign still needs a layout K history and feed proof. |
| Write path corrections | `exp/DX-WFIX1-write-path-fixes` `4331d6fe8e2240d1cab6fdca7ca8287226043bb9` | Yes | 0 | Already included | Native SQL cases cover policy, prepared writes, journal/replay and receipts. | The combined full-depth run with layout K, grouped writes, erasure and imports is open. |
| Per-person writer | `exp/DX-PREP1-parallel-prepare` `e5447c4d2396b781ca8c933b78d130b38922c4e3` | No | 26 | Clean | INT1 carried prepared-write safety cases and ran the 27-case native suite. | The branch's scoped fairness and SQL recovery changes and the one-database speed comparison are outstanding. |
| Readers under load | `exp/DX-RD1-readers` `5f51de7d6ab09b884df61f5c260db7f6688726c1` | Yes | 0 | Already included | Fallback-rate fixture, exact pinned-read checks and the INT1 touched reader. | A sealed aged run and physical fallback/recovery comparison are open. |
| Publish and permanent record | `exp/DX-ACT1-activation` `d3f28b9e217c433df2488cde5f5c29497d0cfa99` | No | 7 | Clean | ACT1 selector/worker/parity and integrated page-guard tests. | The seven reports are outstanding and the same-cut permanent-record, visibility and replay proof must run on the scorecard seed. |
| Publish at 100,000 people | `exp/DX-ACT2-activation-100k` `90bfa213680bfbca22f758ec912b5d3e6fcdbdbb` | Yes | 0 | Already included | ACT2 identity and joined preflight, plus its independent live readback. | The comparative 100k measurement needs a rerun at both ages with the selected merged path. |
| Staged activation and background settlement | `exp/DX-STG1-staged-activation` `f3454b12ebb60ed9a009e051b785660115f66ea5` | Yes | 0 | Already included | Prepare and dispatch tests and staged native integration suite. | The scorecard needs durable restart and notification coverage for the selected Publish path under live traffic. |
| Irreversible erasure | `exp/DX-ERASE1-erasure-cost` `d0ccf312373141d0d919cc17e18a5989e60b74ce` | No | 4 | Clean | The INT1 legacy regression verified 13 routes including restore, feed and in-flight Publish. | The detached path and inventory still need integration with layout K and a measured read/save cost. |
| Machine loss and planned account move | `exp/DX-HA1-failover-move` `14174308fa1b1f6ade7f3e1fe3ce58ca4bc173ba` | No | 8 | Conflicts H1 | Shared-account move, backup and failover drill code and verification tests are present. | The final microframe changes and an independent two-machine single-database drill remain open. |
| Synchronous failover | `exp/DX-HASYNC1-sync-failover` `44db8dcb9dd8f41bd2eefc2ad4fdd09f7660ceb5` | No | 30 | Conflicts H2 | The INT1 tree has HA1 receipt/oracle drills. | The fleet gateway and replacement-receipt changes require reconciliation and a native drill on the integrated writer. |
| Memory per untouched person | `exp/DX-THIN1-cold-subjects` `e758c44002d8914745405f8a7f21d1c56c9bc927`; current work on `exp/DX-INT1` `8b1bb2c843688a2379e25bbc8545b5c68b0c2284` | Yes | 0 each | Already included | Thin native reader/cold samples and INT1 RSS, heap and idle-scope census. | Deep resident bytes per person remain open and need a matched physical census. |
| JVM settings | `exp/DX-JVM1-settings` `46880aa47d7c580c400b457df0c8baf9e971e78a` | No | 9 | Conflicts J1 | INT1 verifies launched gateway flags and samples the native process heap. | The three-process physical comparison and reconciled runner are outstanding. |
| GC tail under load | `exp/DX-TAIL1-gc-pauses` `a7a2b1e37434504a7f8013965d845b32506b6381` | No | 31 | Conflicts J2 | INT1 carries explicit collector selection and checks observed gateway flags. | Preserve the reconciled writer and adopt the matched three-role pause evidence before selecting a physical profile. |
| Tracing in every layer | `exp/DX-INT1` `8b1bb2c843688a2379e25bbc8545b5c68b0c2284` | Yes | 0 | Already included | INT1 binds the trace, native position, source, slot and collector output. | Both scorecard runs still need same-attempt traces from every measured role. |

- H1 — `lab/bin/heavy.mjs`.
- H2 — `lab/experiments/EXP-DX1/ha1/{bench,common,control,local,stack}.ts`, `packages/datomic/gateway/src/triplex/gateway/{commit,group,storage}.clj`, `packages/datomic/src/DatomicClient.ts`, `packages/datomic/test/command-recovery.test.ts`.
- J1 — `lab/bench/driver.ts`, `lab/experiments/EXP-DX1/stack/up.sh`.
- J2 — `lab/bench/driver.ts`, `lab/bin/heavy.mjs`, `lab/experiments/EXP-DX1/stack/up.sh`, `packages/datomic/gateway/src/triplex/gateway/{lean,storage}.clj`.

## Ordered merge list

1. W1 evidence; keep WFIX1's existing integration.
2. PREP1; rerun SQL recovery, exact journal/native feed and SDK receipt gates before enabling the writer.
3. ACT1 evidence; retain ACT2 and STG1 and verify permanent Publish, read visibility and settlement together.
4. ERASE1; run the route regression and the native copy inventory on the selected journal and writer paths.
5. HA1; retain INT1's resource admission and rerun the shared-database drill. Then integrate HASYNC1 and recheck move fences, receipt identity and feed resume.
6. JVM1 and TAIL1; reconcile overlapping launch and driver flags with INT1 and check actual flags and process evidence for all three JVMs.
7. Recheck the THIN1 and tracing gates already present in INT1. Integrate DX-V01 after review and run the fresh and 1B server scorecards.

## November 20 additions

The [updated v0.1 table](https://github.com/OnboardedInc/Triplex-db-experiments/blob/fcfa01b9a4e0b01ab3659f693cff1321692cc529/lab/V0.1.md) adds the scorecard and playground. The trial below uses the newer INT1 snapshot `0b5ab37c92dedf3846ee5a6c5445e5df00939632`. Git's three-way merge calculated both trees in the DX-V01 worktree without changing its index. The original table records the earlier snapshot.

| Required part | Source and sampled head | Ancestor | Unmerged | Trial merge | Gates on INT1 | Missing |
| --- | --- | --- | ---: | --- | --- | --- |
| Scorecard command | `exp/DX-V01-scorecard` `80324197afc2228a3c86de3d199a5095a303f51b` | No | 9 | Clean | INT1 has the fixed pooled campaign and native readback collector. | The scorecard wrapper and build need integration, compatible held seeds and the two physical runs. |
| Playground dashboard, API and invented data | `exp/DX-PLAY1-playground` `4d393c7ce225bae895601fb77b70ceb11c50476c` | No | 14 | Clean | The branch-specific Datomic playground fixture and browser tests are pending integration. | The clean-clone start, local API and dashboard need a merged-branch gate alongside the small sample and the full hosted data. |

Take the Mac admission marker independently as needed. After the core merges in the ordered list, integrate the playground alongside the scorecard. Run the playground's clean-clone gate on INT1 and run the merged scorecard at both ages.

The later INT1 snapshot `d8c0af523ab5e25cd37e4126a1f9e292af6f68ac` includes the four previously outstanding ERASE1 commits. The scorecard branch trial with that snapshot conflicted in `int1/everything-arm.ts`, `int1/pooled-plan.test.ts` and `scale1/tenant-traffic.ts`. The merge on this branch keeps the streamed copy, combines the tests and takes INT1's canonical tape metadata and import duration.
