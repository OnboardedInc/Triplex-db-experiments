# DX-B4: indexed journals — implementation delivered, north-star qualification blocked

North star: P1–P5 under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` and PROTOCOL 0b. **No contract PASS, promotion, or completed writer/feed qualification is claimed.**

T1/T2 are implemented. T3 found and corrected a command-lookup eligibility bug; its post-fix small run recorded zero whole-store scans and drained the burst queue. T4 reached the real 10k rung, 256 readers and the start of 1,024 readers, but the private Docker endpoint became unavailable. Final histograms, correctness totals, oracle result and bar verdicts were not produced. Cleanup of that interrupted stack and fresh native verification of the final SPI guards remain blocked on that endpoint.

## Source and evidence boundaries

- T1/T2 commit: `04c29456`; T3 commit: `772249c5`.
- The measured T3/T4 sources and built exports are copied in each attempt's `source/`, with `source-hashes.json`, working diff, head, exact container/image IDs, cpusets, durability settings and command. They are diagnostic attempts, not acceptance receipts.
- After T4's immutable source snapshot, final hardening filters untyped rows from feed results, declines unindexed SPI command metadata and malformed/extended journals, and checks journal absence at the transactor's serial point. The private eligibility marker is now **feed-version 2**. Fresh scopes are required; version-1 scopes decline. These final changes have current offline/type/build checks, **but no fresh native execution after the daemon outage**. T4 numbers do not qualify that final source.
- Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/`. [EVIDENCE.md](EVIDENCE.md) and [SHA256SUMS](SHA256SUMS) index retained bytes. Raw files over 1 MB and oracle/gate directories remain outside git.

## T1: change feed by position

Core adds optional `getTransactionsAfter(after, limit, waitMs)`. Undefined retains the portable query. Core reuses `transactionRecordFromTriples`, the exclusive cursor filter and the existing page limit. `TransactionPageRequest` (the actual existing type name) adds `waitMs`, validated as an integer in 0..30000, default 0. Unsupported adapters ignore polling.

`POST /v2/db/{db}/transactions` seeks `:triplex.tx/position` at `(inc after)`, emits row texts using index reads and handwritten JSON, and polls the peer's local `d/db` every 1 ms when waiting beyond head. It never invokes query/entity/pull. Overflow, unsupported row/proof versions and irregular scope history decline. Transaction-local adapter calls decline.

**Nested transactions:** physical tx/id alone loses logical journals. Writes link every logical journal under `:triplex.tx/journals`, with its shifted `:triplex.journal/position`. Each physical commit's journals are sorted by logical position and interior cursors are filtered. A physical commit without a journal has no link and is skipped.

**Current-view safety:** typed journal rows are append-only in eligible scopes. Retiring/extending a published journal, malformed position/instant metadata or duplicate journal positions makes the feed proof sticky-irregular. The final transaction-function check validates entity absence at the actual serial point, not only in a possibly lagging peer. Eligible journals can therefore use current row datoms; edited journals decline. Untyped rows sharing a journal entity are filtered exactly as the portable `_Transaction` query filters them. Legacy scopes without the new proof decline rather than assuming completeness.

## T2: command lookup and receipt bodies

Core adds optional `getTransactionIdByCommand(commandId)`; undefined falls back, null is exact absence, and a txId is loaded using the existing `transaction(txId)` path.

The gateway uses the unique `:triplex.claim/command-id` index and datoms for its txId. Receipt loading uses an indexed entity row-datom endpoint and the existing decoder; it does not reconstruct every journal fact through the entity API. Staged/historical/unsupported calls retain the portable path. The original entityId branch was already subject-indexed, not a whole-store scan; its per-fact entity materialization was nevertheless replaced for eligible receipt bodies.

Command/current-receipt eligibility does not require timestamp monotonicity: identity and the current journal body are independent of record-time ordering. Modified journals and command metadata not bound to matching claims decline. The final guard includes untyped command metadata written through the SPI, because the portable command query sees such rows too.

## Tests and limitations

| Source / gate | Result |
|---|---|
| Pre-final-SPI-hardening full Datomic + touched core, `logs/dxb4-final-tests.log` | 175 passed, 1 declared pre-existing signed-zero/int64-domain failure / 176 tests; 17 files; 142.10 s |
| Of that full run | Datomic 162 passed + 1 known failure; touched core 13 passed |
| Native journal gate in that run | 100 seeded fresh scopes, 700 accepted direct feed pages, 600 command comparisons (400 committed IDs, 200 absent IDs); 5 tests |
| Current final source offline suite, `logs/dxb4-offline-suite.log` | 143 passed, 35 native tests skipped / 178 total; Datomic offline 130 + core 13 |
| Current final source build/typecheck, `logs/dxb4-final-build.log` | 6 Turbo tasks successful, including core/Datomic typechecks and required dependency builds |
| Nine package typechecks, `logs/dxb4-adapters.log` | Core, Datomic, SQL, SQLite, PostgreSQL, Cloudflare, FoundationDB, XTDB, QLever green; other adapter sources unchanged |
| Broader bench typecheck | Existing diagnostics in audit-traffic.ts, round2.ts and hs01-seed.ts; none in touched driver.ts/composition.ts |
| Cursor mutant | Property gate fails with page content mismatch |
| Wrong-journal-entity mutant | Property gate fails with row-content validation; not a startup failure |
| Final Clojure structural check | Balanced delimiters only; **not native compilation or semantic verification** |

The randomized gate covers commits with/without command IDs, nested transacts taking two positions, domain retractions, shared timestamps, random cursors/limits, head/future cursors, and unjournaled SPI commits. Journal suppression is not exposed through the ordinary public transact API; the maintenance-shaped SPI case supplies a physical commit without journal rows. Separate tests cover publication isolation, retired-journal decline and timestamp-regressed command equivalence.

Long-poll tests passed before the final SPI guards: a request waiting 200 ms before a commit completed within the asserted 20 ms of commit acknowledgement; an idle 100 ms request returned empty after its deadline. These are functional samples on the CPU-5 stack, not a sustained P3 qualification.

Two final native tests (untyped same-entity journal rows and unindexed SPI command metadata) were added after the outage and are among the 35 explicitly skipped native tests. A fresh engine gate is required before accepting those guards. The final seven-test journal file must be rerun on a fresh feed-version-2 scope.

First failures remain: an incorrect receipt fixture field; a fallback-only randomized run rejected by its zero-fast-answer count; an offline HTTP fixture lacking explicit declines for new routes; a post-mutant request racing gateway restart; the sandbox-denied host boot-clock read; both interrupted benchmark runs. None is counted as success.

## T3: scan inventory before and after the command fix

The request was run with lane datomic/reach, 2,000 subjects, 20-second levels, max 64 readers, sweep 2,000, history sample 200, four reader threads and the extracted replay oracle. Admission queue stays off. Reach composition passes `waitMs:200` to feed calls. All four functional-stack containers used CPU 5. Measured stacks used PG 0, transactor 0,1, writer 2, reader 3,4 under the shared lock, `TX2_ENGINE_CPUS=5`, ports 8501/8502.

The counters include every route and read-rows branch. Scanning datoms are **actual fact-index enumeration**, including work in unfinished requests; additional lazy entity materialization is not quantified. Completed per-pattern counts can therefore be smaller than begun-call counters. Detailed per-phase route/branch counts: [before](SCAN-BEFORE.md), [after](SCAN-AFTER.md).

| Attempt | Whole-store calls begun | Fact-index datoms enumerated | Other read-rows branches |
|---|---:|---:|---|
| Before command eligibility fix, stopped | 40 | 3,931,914 | writer entities 5,961; entity 3; reader entities 55,584 |
| After fix, all 17 phases | 0 | 0 | writer entities 13,265; reader entities 150,953 |

The completed offending pattern was `attribute=:_tx/command-id`: 3 completed scans, 602,047 enumerated datoms, maximum 201,408 per call. More scans remained in flight at stop. Public trigger: `Triples.transactionByCommand`, `packages/core/src/store/TriplesLive.ts` portable fallback, Datomic `queryRows`, gateway `storage/read-rows` else branch. No other completed scanning pattern was observed. This is runtime evidence for these attempts, not proof that every possible public query is indexed.

Cause: scope timestamp regression initially caused command lookup to reuse the feed's timestamp guard and decline. The T3 correction removes that unnecessary condition from command/current-receipt lookup. The timestamp-regression test requires exactly `command` then `journal`, plus full equality with the old query/entity path.

### Writer pending at phase starts (small runs)

L256/L1024 labels below were capped to **64 actual readers** by the requested small-run flag.

| Phase | Before | After |
|---|---:|---:|
| warmup | 0 | 0 |
| baseline | 0 | 0 |
| L1 | 0 | 0 |
| L4 | 0 | 0 |
| L16 | 0 | 0 |
| L64 | 0 | 0 |
| L256 | 0 | 0 |
| L1024 | 337 | 237 |
| recovery | 1,181 | 777 |
| p4mix | 1,859 | 1,081 |
| p4h1 | 919 | 541 |
| grow3 | not reached | 0 |
| p4h3 | not reached | 0 |
| grow10 | not reached | 0 |
| p4h10 | not reached | 0 |
| presweep | not reached | 0 |
| sweep | not reached | 0 |

The post-fix queue returned to zero at trace 215 s, 35 s after the 120–180 s burst. It still built a substantial queue, so this does not meet the complete P2 latency/progress contract. The sweep took 98.5 s for 2,000 subjects and was fetch-only. These are distinct generated runs, not an isolated causal performance comparison.

### Inherited harness blocker

Both small/full traces lose the P3 consumer on `Missing source publication instant`. `lab/bench/lib/datomic-publication.ts:24` still requires the final returned position to equal the submitted provisional position. DX-B3 intentionally permits a final shift with a validated delta. The wrapper throws after the native commit, causing operation resolution but no publication witness for that position.

`repro-publication.mjs` uses the real Datomic client's ACK validator with a local transport fixture: position 2, submitted 1, delta 1 is accepted; the unchanged observer throws `Datomic publication response/input binding mismatch`, with zero witnesses. Raw result: `publication-reproduction.json`. The observer file is outside the named bench edit scope and is unchanged.

`driver.ts` now retains a failed feed as an explicit ERROR/invalid reason and nonzero exit while saving diagnostics; failed-feed replay is NOT-RUN with exact=false. This reporting change ran far enough to log the T4 feed failure, but its final-report branch was not reached before the infrastructure interruption.

**Remaining scan risk:** the feed is explicitly required to decline a scope's irregular flag. If a live consumer reaches that condition, core's portable `_Transaction` query can still scan the store. The observed post-fix runs lost the consumer early, so zero scans in those runs is not proof of a continuously running feed under timestamp regression. No claim of globally eliminating live scans is made. Timestamp-irregular record-time reach reads also fall back to many indexed entity reads; these are not whole-store scans but remain expensive.

## T4: real 10k attempt — interrupted, no final bar verdicts

Attempt: `tx2-dxb4-full-1794272803358`. Requested command: datomic/reach, rung 10k, smoke, reader threads 6, oracle root supplied. PG durability flags were on. Source/build/runner copies and stack bindings are retained in this attempt. Seed: 10,000 subjects, 384,785 planned live domain facts, 147.3 s.

| Phase | Actual readers | Trace start s | Writer pending |
|---|---:|---:|---:|
| warmup | 16 | 0 | 0 |
| baseline | 0 | 15 | 0 |
| L1 | 1 | 60 | 0 |
| L4 | 4 | 105 | 1 |
| L16 | 16 | 150 | 559 |
| L64 | 64 | 195 | 447 |
| L256 | 256 | 240 | 0 |
| L1024 | 1,024 | 285 | 0 |

The feed failed at trace 2 s. The last complete scan snapshot, at the start of L256, showed no scan branch on either peer. The L1024 snapshot failed when port 8502 closed; subsequent direct checks could not connect to the authorized private Docker socket. **The cause of the Docker outage is not established.**

The measurement wrapper also had an avoidable unhandled telemetry-promise rejection. It is corrected to retain telemetry errors, terminate its owned driver, execute cleanup, verify empty owned resource lists, and retain lock ownership on failed cleanup. That recovery path has syntax/offline checks but has not been exercised against a healthy native stack after the outage.

[T4-TABLES.md](T4-TABLES.md) contains all retained phase entries, explicit unavailable size-band/P3/P4/P5/correctness/oracle fields, and actual successful main-thread HTTP observations. [SCAN-T4.md](SCAN-T4.md) contains available route/branch intervals.

### Request attribution (recorded trace samples; ms)

| Route | Recorded samples | HTTP wall p50 / p99 | Gateway p50 / p99 | d/transact p50 / p99 |
|---|---:|---|---|---|
| command | 90 | 121.376 / 822.619 | 0.045 / 82.136 | unavailable |
| journal | 90 | 106.407 / 577.456 | 0.095 / 77.016 | unavailable |
| read | 12,979 | 198.377 / 1,920.409 | header unavailable | unavailable |
| transact | 2,917 | 419.713 / 1,718.504 | 263.681 / 1,511.813 | 246.670 / 1,458.457 |
| operation | 2,528 | 122.950 / 686.761 | header unavailable | unavailable |

These are successful HTTP-service observations across main-thread writer/auxiliary clients, **not scheduled-offer public commit histograms or size-band bars**. Buffered recording may omit trailing samples on abrupt exit. Command identity itself is a tiny indexed gateway operation; native transact time and generic read/HTTP wall time remained slow. The stale publication observer causes many otherwise unnecessary operation-resolution requests. No speculative transactor or core-write rewrite was made without a working engine to measure it.

### Required T4 outputs that are unavailable

- Commit p50/p99 per 5–10, 11–25, 26–50 fact band, at L256/all/steady/burst: final histograms were not saved.
- Feed lag p50/p99 at 256 readers: unavailable; the consumer had failed.
- Read p50/p99 and goodput per reader level, P4 mix/history/throughput, P5 final sweep: final analysis was not reached; later phases were not run.
- Every bar's PASS/MISS: **none emitted**. Missing verdicts are not passes.
- Complete correctness, duplicate/lost-ACK denominators, read-your-own-write counters and client saturation invalid reasons: not produced; no correctness success inferred from phase progress.
- O-REPLAY sample result: **NOT-RUN**. The actual oracle archive embeds commit `03d86f3346cccd6794487b77293fb56077dd020e`; extraction is retained. Supplying it did not execute the final check before interruption.

Observed invalidating conditions are the failed P3 publication witness, the private Docker outage, and the telemetry-wrapper failure. The raw report remains RUNNING because its final analysis/save did not execute. Smoke is diagnostic; there is no matched zero-reader baseline, independent final review or acceptance promotion.

## Observation-to-verdict audit

1. `packages/datomic/test/journal-fast.test.ts`: full records, ordered pages and next cursors compare against a separately constructed adapter with both hooks removed and indexed receipt reads disabled. Fresh UUID scopes, current generated inputs and a quiescent common head bind each scenario. Exactly 700 accepted answers rejects fallback-only coverage. Timing/visibility assertions concern this attempt's actual requests. Final SPI tests are explicitly unexecuted natively.
2. `packages/core/test/transaction-fast.test.ts`: fresh runtime/mocks assert exact fallback counts, wait arguments, null-versus-undefined semantics and pre-I/O typed validation.
3. Existing Datomic native/codec/client gates: content readback and typed errors on fresh scope identities; offline fixtures are labelled transport/codec evidence. The signed-zero/int64 test remains a failure, never an excluded PASS.
4. `mutants.sh`: nonzero test exit plus content assertion/row-validation evidence is required; transport/startup errors cannot count. Changed gateway files are copied and restored; failed first attempts remain.
5. `repro-publication.mjs`: exact ACK bytes are validated by the real client, then the exact observer exception and zero witness count are checked in a new local fixture. This is a harness mismatch reproduction, not engine qualification.
6. `driver.ts`: a feed failure remains ERROR, invalid and exit-nonzero; replay cannot be exact when not run. Existing bar/model/oracle checks are retained. Final reporting is unverified under the outage, not claimed successful.
7. `run.mjs`/`observe-http.mjs`: raw successful response headers, source/build preimages, stack IDs/cpusets and phase counters are observations, not semantic PASS. Missing counters/errors are retained, not substituted with zero. Cleanup is accepted only after empty container/network/volume readbacks; failure retains ownership.
8. `scan-table.mjs`/`summarize.mjs`: source-bound arithmetic/display only. Counters are subtracted by actual phase boundary, maxima are not subtracted, unavailable fields remain unavailable, and any driver bar result is copied rather than reinterpreted as acceptance.
9. `hash-inventory.py`/SHA256SUMS/`MANIFEST-VERIFY.json`: compare actual old Git-blob and current file bytes, and retained evidence bytes. The fresh manifest verification checked 3,609 retained files with zero mismatches and binds the exact manifest SHA-256; that is content integrity only. A path mentioned by acceptance documentation is not automatically a file pin. No contract is rewritten or retroactively anchored.
10. `recover-cleanup.mjs`: before removal, current container IDs must match the saved stack proof; absent/replaced/unreachable resources are distinguished. Only empty owned-resource readbacks can release this stack's measurement lock. Currently it reports cleaned=false.

## Hash changes and contract

`lab/acceptance/` is unchanged. No changed file or old content hash is a file pin under its pins; `Triples.ts` is mentioned in acceptance documentation. For conservative handoff its changed hash is:

- `packages/core/src/store/Triples.ts`: old `da3515b5013feae546c08cc6865a4b517292a0f5fcb0f679340d5aba2b20060d`; new `73817e9997267163d63f9970fe7b9d2cdebaa6f4a574f970c47f5ca990750801`.

[HASH-CHANGES.json](HASH-CHANGES.json) lists old/new SHA-256 for every changed existing source file, including unpinned paths. No re-pinning occurred.

## Cleanup and concrete handoff — still blocked

Earlier development/small stacks ran their removal commands successfully. The final global resource readback is blocked by the daemon outage. For the interrupted stack, these owned resources have **not been verified removed**:

- `tx2-dxb4-full-1794272803358-{pg,tx,gw-w,gw-r}`
- network `tx2-dxb4-full-1794272803358-net`
- volume `tx2-dxb4-full-1794272803358-pg-data`

The owned driver PID 83840 was already absent when termination was attempted. Container IDs/image IDs/mounts remain in `stack.json` and `containers.json`. `INTERRUPTED.json` and failed cleanup-recovery receipts retain the actual outcome.

The measurement lock `/Users/sam/Claude/Projects/triplex-db-2/locks/measure` is retained with an `owner.json` naming this exact prefix, because removing the stack before releasing it is a hard task constraint. Its acquisition was 01:10:58 UTC; infrastructure failure prevents satisfying the usual bounded hold/cleanup. No other measurement was started while it was held. No VM restart, default Docker fallback or unrelated container action was attempted.

After the orchestrator restores the authorized endpoint, run from this worktree:

```sh
node lab/experiments/EXP-DX1/b4/recover-cleanup.mjs
```

It verifies the saved container identities, removes only this stack, checks that its resources are gone, writes the actual cleanup result and releases only its own lock. Then rerun native gates on fresh feed-version-2 scopes and repeat T3/T4 after addressing the out-of-scope publication observer. Decide explicitly how an indexed feed should handle timestamp-irregular scopes; the currently required decline retains a scan-capable fallback. Expensive record-time reach fallback and slow native transact time also remain measured bottlenecks.

No merge, push, deployment, publication, download, original-source deletion or acceptance edit was performed. A Changeset was not added outside the named owned file set; full root `pnpm check` and `pack:check` were not run. **This task is blocked/incomplete for north-star proof, final native gates and final cleanup.**
