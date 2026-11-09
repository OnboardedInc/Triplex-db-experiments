# Compact five-fact offline diagnosis

North star: P2 low-latency commits with P1/P2 correctness unchanged. Scope/targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md.

Source-bound output: durable `round7/offline3/diagnosis.stdout`; analyzer `diagnose.mjs`. It verifies retained live3 hashes, pre-RT01 build identity and current build hash before comparison. **No engine is contacted. The old FAILED receipt is unchanged.**

Actual matched five-fact guard emission from baseline 59e07afb and marker CAS 37ae44a9:

- Both have two compact ASSERTs and five submitted engine statements. The operation/assertion-identity guard's SQL and serialized parameter payloads are identical. Every warm commit uses twelve Execute/ReadyForQuery cycles.
- Baseline's first ASSERT checks scoped MAX(position). Current adds the exact prior marker stamp (key + scope + prior position) in that ASSERT, an extra scalar lookup and one parameter. No extra statement or warm wire round trip.
- Warm source read changes `position` to `position, stamp`; metadata and attempt INSERTs persist stamp; attempt readback now selects operation_id/attempt_id/position/stamp instead of operation_id alone. The journal representation also changes (five-fact assertion rows per commit 13→12). Those bytes/work differ despite identical public fact inputs. Full emitted wire SQL and timings are retained, not just guard text.

Retained native plans on the failed point show the **old RT01** wide guard reading 3,111 + 3,111 tx_meta input rows (four pages each). The current keyed branch reads one page, 756 rows on A's scope / 1,019 on B's, plus the unchanged broad 3,111-row position scan. Each returns one matching row. These are shared-table physical rows read, not constant one-row I/O. B's standalone marker client p50 was 7.787 ms versus 8.125 wide-stamp and 7.696 position-only; full new predicate 8.266 ms. They include client/await-token overhead, occur after measurement and do not establish a causal fraction of commit latency.

**Missing historical plan:** live3's `before` label denotes old RT01 MAX(stamp), not pre-RT01 A0. A full native EXPLAIN of the actual baseline's position-only guard was not captured. Its matching position branch is visible in the retained native trees; that is an induced subplan comparison, not a fresh baseline execution. The future runner now explicitly captures all three versions.

The analyzer segments complete warm commits by sample boundaries in the raw wire trace, skipping each block's first sample because it also contains untimed count queries. It validates twelve wire cycles for **148 commits/arm**, then locates the original nearest-rank p99 samples (not p99 of a filtered subset):

| Original p99 sample | Service ms | Sum of measured wire ms | Time outside measured wire ms | ASSERT wire ms | COMMIT SYNC wire ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A position 144 | 108.944 | 84.042 | 24.902 | 1.236 | 43.455 |
| B position 78 | 151.778 | 69.983 | 81.795 | 2.699 | 22.835 |

B's extra 42.834 ms service time at those tail samples co-occurs with **56.893 ms more outside wire cycles**, while its measured wire sum and COMMIT SYNC duration are lower. That contradicts assigning this particular tail difference solely to the marker scan. It does not prove a client CPU bug: outside-wire time includes runtime work, connection/scheduling delays and the observer's synchronous event logging; the old receipt lacks host/VM/ELU signals to distinguish them. ASSERT wire time can measure staging rather than actual evaluation at COMMIT SYNC.

The real remaining work candidates are the additional scalar marker branch and wider source/receipt/metadata bytes; the observed tail candidate is outside measured wire cycles. There is **no demonstrated causal compact performance bug to fix offline**. The rerun adds statistically graded controls and host/VM/client observations, preserves all source/statement/row identities and retains the failed old result. Do not promote the three old within-band fresh points into a complete G6 PASS or use Q104a to relabel the old tail failure.
