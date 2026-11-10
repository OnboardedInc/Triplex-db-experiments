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
