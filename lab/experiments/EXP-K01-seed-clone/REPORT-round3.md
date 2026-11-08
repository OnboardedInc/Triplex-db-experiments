# EXP-K01 round 3: fresh evidence and durable verification revocation

North star: correctness of seed reuse, required for trustworthy P1-P5 measurements. Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Builder CX-K01-R2; independent review remains required. This round is offline only.

## Changes

Reviewer CX-VK01's report on `05a23dd` identified three defects. I read the report and all 21 regressions in the read-only `verify/K01` worktree and copied `offline.test.mjs` and `run-offline.mjs` byte-for-byte into this branch. `evidence/round3/reviewer-input.json` records their hashes and source provenance.

1. **Re-verification revokes the previous PASS before any fallible checks.** A new attempt atomically publishes PENDING, preserving earlier readiness in history. Running/config checks, golden loading, query execution, receipt writes and publication all occur within the attempt's error handling. Exceptions write an ERROR receipt and replace this attempt's readiness with ERROR; even an initial revocation-write failure attempts to revoke the unchanged earlier readiness in the error path. A failed receipt write is recorded in non-PASS owner metadata. PASS is published only after the complete C1-C8 result receipt and its hash are durable. Semantic FAIL retains its full failed-check receipt. Superseded attempts cannot overwrite newer readiness.
2. **T1 interprets stop semantics.** Both the full live runner and standalone T1 runner decode the fresh stop JSON, require `verdict.ok === true`, record `semanticFailure` before owned cleanup, and propagate a nonzero runner result for false or unreadable proof. Other required clean-stop stages use the same check. T2 remains an explicit no-flag diagnostic rather than a required clean-stop stage.
3. **Settle checks the current transaction gauge.** Every accepted poll requires a valid current completed-tx gauge equal to both the new block's tx_id and the frozen seed transaction. Missing, invalid or changed current gauges explicitly refuse after retaining the observation, instead of substituting the initial gauge.

## Same-pattern audit

I also corrected places where earlier evidence could stand in for a later reading:

- Startup validation now compares each current submitted/processed source gauge with the expected watermark, rather than accepting an old startup log plus current lag=0 after the source has advanced.
- Clone verification takes all three compactor readings after fingerprinting and performs a final startup/state check; its first C7 sample no longer comes from an earlier fingerprint phase.
- Engine verification rechecks container/start identity after the query process, verifies that the golden-record bytes still match the clone binding, checks current owner content and attempt identity, and binds successful readiness to the actual verified start.
- Golden publication checks the end-of-fingerprint transaction/source gauges, compactor/lag, trie digest, live rows and manifest position as well as the existing final listing/timer/stop guards.
- T6 refuses incomplete before/after fingerprints before comparing plans; a missing earlier fingerprint cannot masquerade as a changed plan.

The source-message equality required by Q83d is unchanged. This round does not resolve or reinterpret the previously reported live compaction-watermark concern.

## Offline gates

Final source-bound gates and receipts will be recorded below after the committed-source rerun. Preliminary runs passed the 41 original tests, the 21 copied reviewer regressions and the first 20 additional boundary cases. The extended boundary suite also includes initial owner-write failure, malformed/current transaction gauges and post-fingerprint freshness.

## Limits and handoff

No Docker command, engine lifecycle action, volume, slot reservation, resident change or network service call is authorized or performed in this round. Only the shared heavy-test semaphore is used. No merge or push is performed. No live T1-T7, golden/clone, C1-C8, E1/C10, performance acceptance or full monorepo check is claimed. Those remain a separate, independently admitted live window after source ownership/capacity is resolved.
