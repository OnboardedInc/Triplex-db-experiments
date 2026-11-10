# DX-B7 assertion and receipt audit

These are developer diagnostic checks. No acceptance promotion or contract pin changes are made.

Step 1, before commit:

- `selftest.clj` uses actual Peer transactions, exact values and unchanged semantic assertions. Its summary exits successfully only with zero failures and errors. Fresh isolated JVM, bound staged sources and owned image/cgroup manifest.
- `feed_test.clj` checks fixed projected content, HTTP status/database/cursor, broadcast behavior and exact deadline behavior. New entrypoint exits successfully only with zero failures/errors. Fixtures now model the layout header explicitly; unexpected index reads throw.
- Native test logs retain exact fallback comparisons, positions, revisions, coverage, races and counters for both layouts. Legacy and lean suite slices completed before their encompassing batch later timed out; these are credited only as completed slices, not successful whole attempts.
- The differential uses all 300 scenarios, partitioned by its existing RNG-preserving range mechanism. Each shard checks actual bytes/values and draw counts. The union check requires successful fresh shard exits, ranges 0/100/200, 100 cases each, positive fast-path comparisons, exact closure parity and adjoining RNG states.
- Load workers count completed SDK pulls and assert current-client declines/faults/full retries are zero. Source/build captures, unique scopes, actual container IDs/cgroups, CPU caps and raw per-pull samples bind these diagnostic measurements. There is no claim that load counters alone are answer-equivalence proof.
- Cleanup receipts inspect fresh owned-resource inventories and claim only execution/cleanup outcomes. Proxy receipts count actual socket lifecycle events and claim only network observations.

Baseline B's gateway preimage stayed unchanged and was staged before execution. Harness-only edits occurred during stack startup;
both initial and during-run captures are retained. Its gateway profile is usable; the complete executed harness-byte binding is
partial, so it is a diagnostic comparator. Baseline A's zero-byte JFR remains a failed profile attempt.

Step 2, before commit:

- `concurrent-session-generations` checks exact fixture rows, revision, named position/t and closure coverage for all 5,120 responses under forced two-entry resets. Every future is awaited and its completion asserted before the verdict; the old generation's entries remain intact and the current map stays within its cap. Fresh mem databases and captured staged sources bind the helper's result.
- Both complete 21-test native layout suites exited successfully in fresh owned stacks. The 300-case differential union passed the same range/RNG/content checks as step 1. Source hashes match the executed gateway capture.
- Performance counters remain diagnostic: step 2 missed its targets. Initial step-0/1/2 probes did not persist the exact frozen R/t in their result file; do not claim complete input replay for those. Subsequent probes retain seed request JSON, parsed ACK coordinates and an ACK-matched frozen basis.

Step 3, before commit:

- `entity-cache/check!` compares exact row text/inline JSON and all reference interval bits against a fresh build at the same immutable db. Duplicate insertions also compare content. Verification errors are counted before throwing, so a caller cannot hide a mismatch through fallback.
- `parsed-revision-cache-verification` mutates rows without a revision on both layouts as a negative fixture and requires detection. `parsed-cache-byte-budget` checks eviction, hits, mismatches and oversize bypass. `cache-connection-generations` models a late old-generation insertion and requires new answer bytes after recreation. These fresh isolated helper JVMs share the captured source/image, not server caches.
- Both complete native layout suites pass. All 300 adjoining differential scenarios ran with verification enabled: positive hits, verified comparisons at least equal to hits, zero errors and bounded bytes. The union preserves RNG states and matches the executed package-source capture.
- The seed transcript and ACK-matched frozen basis now bind the performance input. The default cache's hit rate did not satisfy the throughput targets; no promotion is inferred from passing correctness checks.
