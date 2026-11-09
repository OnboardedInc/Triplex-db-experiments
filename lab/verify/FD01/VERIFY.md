# CX-VFD01: FIX-FIRST

North star: P3, an ordered, resumable identity-only feed. Correctness review against `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3, R41 sections 1–5 and Q98a–j. Offline only.

Reviewed builder commit **32f2843b298264851078d1697c15557bf13c7ea3**, branch `exp/FD01-feed-contract`. Read its REPORT.md, EVIDENCE.md and final write measurement. This review changes only `lab/verify/FD01/`; it does not fix the implementation.

## Verdict

**FIX-FIRST.** The implementation's ordinary feed checks work on the planted fixtures, and the actual SQLite store's transaction boundaries are correct. However, the conformance suite accepts a consumer with effects and checkpoint in separate transactions. The requested publication-clock negative check is also absent. These are verification gaps, not evidence that the unchanged store has lost data or that any lane has passed NS.P3.

The original 11 host feed tests freshly passed on unchanged code: **11 passed, 0 failed**. They also passed on the deliberately split-transaction implementation: **11 passed, 0 failed**. Both include the original 600 abrupt exits and fresh O-REPLAY fixture comparison. Those passing test counts do not establish Q98b.

## Findings

### F1 — High: a two-transaction consumer passes all conformance tests

Locations: `packages/testkit/src/feed/index.ts:104–148`, especially the post-replay predicates at 125–133; `packages/host/test/feed/feed.test.ts:478–520`; crash hook and commits in `packages/host/src/feed/ConsumerStore.ts:151–165`.

The crash checker observes final recovered state after replay. A keyed consumer can commit effects first, crash without a checkpoint, then replay idempotently and produce exactly that state. There is no observation of whether effects, affected set and checkpoint were atomic **before replay**.

Two independent reproductions:

1. `probe.mjs` supplies actual process-stop/reopen observations to the unchanged `runFeedCrashConformance`. Its candidate is deliberately keyed but uses two SQLite transactions. The checker returns `{keyedCrashes:300, controlCrashes:300, controlDuplicates:100}`. Inspection before restart finds **100 candidate crashes with durable effects but no checkpoint**. Final recovery has no missing or duplicate effects. The unkeyed control duplicates after every after-effect crash, so the mandatory control is valid.
2. `mutate.mjs` injects exactly `this.db.exec("COMMIT; BEGIN IMMEDIATE")` immediately **after** the existing `crash?.("after-effect")` hook. No tracked implementation file is edited. The existing exception rollback test still runs before this split; the child crash hooks never land between the two commits. The complete original suite passes **11/11**. `trace.mjs` independently observes executed statements: original `[BEGIN IMMEDIATE, COMMIT]`; mutant `[BEGIN IMMEDIATE, COMMIT; BEGIN IMMEDIATE, COMMIT]`.

This demonstrates the blind spot in both the reusable matrix and the concrete suite. The unchanged store uses one transaction; this finding concerns the suite's ability to reject the forbidden implementation.

Proposed fix: add a keyed-split negative control, inspect the durable effects/affected/checkpoint invariant immediately after each abrupt exit and **before** invoking recovery/replay, and cover transaction commit boundaries rather than only application hooks. Require pre-commit stops to expose the complete old state and post-commit stops the complete new state. The injected split must fail even when replay deduplicates successfully.

### F2 — Medium: the requested Q98c/d wrong-clock check has no conformance gate

Locations: `packages/testkit/src/feed/index.ts:10–19` (no publication/known-at observations); `packages/host/test/feed/feed.test.ts:436–471` (write timings only); `lab/bench/lib/feed.ts:288–294` (subtracts `info.instant`).

Neither the testkit feed audit nor the host suite requires a source publication instant or checks the lag clock. `clock-probe.mjs` executes the actual diagnostic `FeedConsumer` with publication at host-monotonic 100 ms, durable knowledge at 400 ms and a decided-record-time value numerically equal to 399 ms. It emits **lagMs=1**, although publication lag is **300 ms**. Supplying the independent publication observation alongside `instant` has no effect. The feed audit also accepts the same prefix with an incorrect lag observation or without a publication observation.

The clock probe uses deterministic injected clocks, not a live elapsed-time benchmark. The builder correctly labels this bench A0/diagnostic and assigns publication-clock work to EXP-P3M. Therefore this is an **unimplemented requested negative check**, not a claim that FD01 promoted a false production lag result. It still cannot meet this review's instruction that a decided-stamp lag must fail.

Proposed fix: provide an offline measurement/conformance seam with a source-bound publication map and durable-known observations per position, distinct from the record stamp. A missing instant must fail, and deliberately divergent clocks must reject a stamp-derived measurement. If P3M owns the seam, compose that check before claiming the requested conformance coverage; no live lane window is needed to test this fault.

## Requested fault matrix

| Planted fault or control | Fresh observation |
| --- | --- |
| Skip commit at offset 1 or 3 | Rejected: `Feed gap/extra resolution` |
| Skip abort at offset 2 | Rejected |
| Skip seal at offset 4 | Rejected; the unchanged seal is accepted |
| Skip epoch boundary | Rejected |
| Per-subject positions 30 then 10, with increasing source offsets | Rejected: `Per-subject order violation`, even with the same independently supplied expected content |
| Add `value`, `envelope` or `keyId` to a change | Each rejected: `Unexpected feed field`; the bad field is also in expected content so equality alone cannot hide a missing validator |
| Resume one entry too many | Rejected: `Resume bytes differ` |
| Resume one entry too few | Rejected: `Resume bytes differ` |
| Change erase `erasureSeq` on resume | Rejected: `Resume bytes differ` |
| Unchanged identity bytes through an erase entry | Accepted |
| Deliver same page after actual store close/reopen | One visible keyed effect after two deliveries; replay is idempotent |
| Unkeyed effects duplicated by stop/restart | Rejected: `Keyed crash failed: after-effect/0`; 201 real stops/restarts ran before that first failure, and the final observation has one duplicate, zero gaps and matching checkpoint/affected content |
| Keyed effects and checkpoint in separate transactions | **Survives** reusable matrix and whole original suite: F1 |
| Lag from decided stamp instead of source publication | **Not rejected**; diagnostic consumer reports 1 ms for a 300 ms publication interval: F2 |
| No publication instant | **Not rejected** by feed audit: F2 |

At-least-once **delivery** after restart is allowed by TARGETS. Duplicate **visible effects** must fail. Rejecting the former indiscriminately would contradict the contract.

Q98e accounting: the independent fixture enumerates five resolutions—commit, abort, commit/erase, seal, epoch—with two sparse logical commit positions (10 and 30). The successful audit reports `{positions:2,resolutions:5}`. Dropping each resolution is rejected. No dense logical-position arithmetic or ACK-list inference is used. The audit relies on the caller supplying a complete source prefix; it cannot establish the independence/completeness of a caller's expectation by itself.

Q98f: comparison is exact over `feedBytes` canonical identity serialization; changes to assertion/erasure identity and suffix length fail. Object-key insertion order is intentionally canonicalized. This is offline fixture proof. No actual erasure, Datomic excision, restore or source restart was exercised.

## The 11.11 ms consumer write p99

The final retained builder measurement (`measure-487eb647-2c5b-40c4-a17c-bbd56a22ef3c/measurement.json`) reports p99 **11.112791 ms**, 1,000 writes, zero readers, and `sourcePublicationLagMeasured:false`. It misses the **10 ms prediction** by 1.112791 ms (about 11.1%). Keep that miss; earlier favorable samples do not replace it.

It does **not** itself fail the **250 ms end-to-end P3 lag bar**. Numerically it is about 4.45% of that budget. It also does not establish enough headroom: component p99s cannot simply be subtracted or summed into an end-to-end p99 guarantee. Polling, source IO, dependency fanout, queueing, burst load and shared-volume contention still count. Only publication-to-durable-known lag with the real 256 readers, domain affected sets and pooled burst window can settle the bar. No new timing sample was selected to rescue the missed prediction.

## Reproduction and evidence

All commands run from this worktree. Heavy work was admitted through `lab/bin/heavy.mjs`; host free space was above 5 GiB. No engine, Docker command, slot, service or network lookup was used. Node **22.23.2**, SQLite **3.51.3**. No install, dependency change or package rebuild was needed.

The worktree had no node_modules. The review uses the existing main-checkout Vitest **5.0.4** binary and a private source-alias config. All reviewed feed imports resolve to this worktree, not sibling source or builder dist. Thus this is fresh source-level offline verification, not a pack/consumer qualification.

```sh
node lab/bin/heavy.mjs --label CX-VFD01-probes -- node lab/verify/FD01/probe.mjs
node lab/bin/heavy.mjs --label CX-VFD01-clock -- node lab/verify/FD01/clock-probe.mjs
node lab/bin/heavy.mjs --label CX-VFD01-duplicates -- node lab/verify/FD01/duplicate-probe.mjs

NODE_OPTIONS="--import=$PWD/lab/verify/FD01/source-hook.mjs" node lab/bin/heavy.mjs --label CX-VFD01-baseline -- node /Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs run --configLoader native --config lab/verify/FD01/vitest.config.mjs --reporter=json --outputFile=lab/verify/FD01/baseline-native.json
NODE_OPTIONS="--import=$PWD/lab/verify/FD01/mutant-hook.mjs" node lab/bin/heavy.mjs --label CX-VFD01-split-mutant -- node /Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs run --configLoader native --config lab/verify/FD01/mutant.config.mjs --reporter=json --outputFile=lab/verify/FD01/mutant.json
```

Fresh evidence, rooted at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/`:

| Relative path | Content |
| --- | --- |
| `10b26823-dc7f-4ec0-983f-783e95ba9ddd/` | Source hashes before/after, independent prefix checks, 600 actual crash observations, retained SQLite files, inputs and results |
| `duplicates-0b8aa7ca-a298-458a-96e5-bdb15cd2d9cf/` | Fresh failing duplicate-effects test; 201 actual crashes/restarts and observations |
| `clock-aa423d45-dd24-4b9a-82bd-d6ae3273e2f3/` | Actual bench-consumer wrong-clock probe, source hashes and SQLite state |
| `trace-baseline-*/`, `trace-mutant-*/` | Actual executed transaction statements and loaded-method digests; exact paths in receipt.json |
| `review-binding/` | Original source preimages, exact split-mutant source, harnesses, Vitest reports, first-failure logs and receipt |

`receipt.json`, `baseline-native.json`, `mutant.json`, logs and tools are also retained here. `SHA256SUMS` contains paths relative to the durable root. Raw database directories exceed 5 MB and stay outside Git. Verify the manifest from the durable root with `shasum -a 256 -c <worktree>/lab/verify/FD01/SHA256SUMS`.

First failures are retained: `baseline.log` records Vitest's default bundled-config loader trying to write its temp file in the non-writable shared node_modules (EPERM, no tests). `baseline-native.log` uses the native config loader and passes. `duplicates.log` records a reviewer harness import-resolution failure (no tests); `duplicates-dynamic.log` fixes only the harness's import sequencing and exercises the expected rejection. Neither first failure is counted as semantic evidence.

## Receipt/verdict audit (rule 9a)

| Place converting observations into a result | Content | Freshness and binding |
| --- | --- | --- |
| `probe.mjs` checks and crash observations | Records actual audit errors, SQLite rows, exit 77/0, final checkpoint and exact fixture bytes; independently inspects pre-replay atomicity | New UUID, new DB per arm/hook/attempt, exact input file; reviewed sources and probe/child hashed before and after; offline/slot null |
| `duplicate-probe.mjs` rejection assertion | Requires the specific keyed after-effect failure and an actual duplicate count of one | Fresh UUID/files, 201 real exits/reopens, exact callback point/arm/attempt; harness/testkit hashes retained |
| `clock-probe.mjs` assertions | Actual consumer checkpoints position 1 and emits 1 ms; independent deterministic clock interval is 300 ms | New UUID/store and current source hashes before/after; explicitly synthetic clocks, diagnostic A0 |
| `trace.mjs` assertions | Observes exact executed SQLite transaction statements and hashes the loaded apply method | New UUID/store for each process; source and mutator preimages in binding directory |
| Original Vitest results | Actual 11 assertion results per run, including fresh oracle execution and 600 abrupt exits per run | Fresh start times and absolute worktree test paths; configs and child source hooks bind unchanged source or the exact in-memory mutant; not reused builder reports |
| `seal.mjs` / receipt.json / SHA256SUMS | Requires expected test counts, precise counterexample counts, expected specific rejection, trace statements and wrong-clock values; compares reviewed working bytes with Git 32f2843; hashes retained evidence | New executions above; copies exact source/mutator/tool preimages and report bytes; source-unchanged checks; no engine/slot claims |
| This verdict | FIX-FIRST follows F1's surviving mutation and F2's missing required clock rejection | Narrowly bound to 32f2843 and the fresh receipts above; no lane promotion or performance acceptance |

## Boundaries and open work

No production code, package export, lockfile or acceptance-contract file was changed. **No pinned path changed hash in this review**, so there is no old/new repin list. `seal.mjs` checks the reviewed source against 32f2843 and checks `lab/acceptance/` unchanged. The in-memory mutant's old/new source hashes are in receipt.json; it is a negative-control artifact, not a tracked implementation change.

Not performed: fresh root G0, pack:check/clean consumer, live broker or XTDB integration, Datomic log/excision, native erasure/restore, decided-stamp source qualification, domain affected-set integration, 256-reader workloads or any P3 performance acceptance. Builder-declared integration and packaging gaps remain open. Proposed fixes were not implemented. The next round should make the split mutant and wrong-clock fixture fail, then rerun the unchanged valid controls and relevant source-bound gates.
