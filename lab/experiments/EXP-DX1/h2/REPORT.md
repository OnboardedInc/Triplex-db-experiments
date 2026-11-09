# DX-H2 — P5 measuring stick on Datomic/Postgres

North star: P5 as defined by `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` section 1 / 1.1. PROTOCOL 0b diagnostic. No contract, scorecard or package changes; no promotion or independent review.

## Delivery and status

- Step 1: Datomic is accepted by the real W0 activation driver and sweep workers. Fresh 50-subject diagnostic completed the seed, fresh independent population fingerprint, evaluation, atomic outbox publication, and existing gates. Larger measurements are in progress; final results below. The engine equivalence suite now passes 3/3 (`reader-equivalence3.log`), including all eight 200-subject page/cut comparisons and full 50-subject stored-journal page equality.
- Step 2: **Blocked fast path, conservative fallback implemented.** `worldOf` in `lab/bench/lib/w0-world.ts` emits `WorldRow.position` as the oracle fact's `tx`. It is used in the fingerprint and evaluation world, not merely an eligibility guard. `getReachTriples` strips `recorded_position` in `packages/datomic/src/reach.ts`; its `Triple` result cannot preserve the W0 world. A `getReachTriplesMany` with the same result type would have the same issue. `datomicW0Sweep` keeps `portableSweep` deliberately. No basis value is substituted for a row's recorded position. The passing 200-subject equivalence test covers every page at seed and later head cuts; this tests the fallback, not an unavailable fast implementation.
- Step 3: Per-page and summed wall times, actual HTTP requests, full sweep wall / subjects per second. World decode/assembly, W0 evaluation, outbox preparation, publication commit, oracle verification, controller decode and publication queue are separate fields.
- Step 4: `--live` runs a no-sweep baseline and the activation with 64 live readers and the frozen writer generator. Same trace seed and offset; command IDs alone are namespaced by arm. Raw read, commit, offer and ACK records are retained. Matched-prefix quantiles include late commits of commands offered inside the window. `fullSweepCovered` is false when the baseline is shorter than the sweep; those ratios cannot cover the full sweep. Both arms use one evolving database, not identical clones, and ratios remain diagnostic.
- Step 5: Pending final measurement table. No 100,000-subject execution is claimed.

## Exact commands

From this worktree (Node 22.23.1):

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H2-build -- node_modules/.bin/turbo run build \
  --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... \
  --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... \
  --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...
node lab/bin/heavy.mjs --label DX-H2-stack -- bash lab/experiments/EXP-DX1/stack/up.sh \
  tx2-dxh2-a1 --port-write 8497 --port-read 8498
bash lab/experiments/EXP-DX1/h2/run.sh --rung 50 --workers 1 --live --baseline-s 10
bash lab/experiments/EXP-DX1/h2/run.sh --rung 1000 --workers 1 --live --baseline-s 600
node lab/bin/heavy.mjs --label DX-H2-reader-equivalence3 -- node lab/experiments/EXP-DX1/h2/test-reader.mjs
node lab/bin/heavy.mjs --label DX-H2-claims-equivalence -- node lab/experiments/EXP-DX1/h2/test-reader.mjs \
  --test-name-pattern 'point-read W0 journal'
```

Four early 1k seed attempts were stopped and retained: the original `--rung 1000 --workers 1` attempt was stopped before its lease could expire; its seed prefix and original RUNNING receipt remain, with a separate `INTERRUPTED.json`. It supplied no gate verdict. The other three stopped to fix duplicate-offer attribution, the confirmed full-journal blocker, and bounded stored-claim lookup; an in-flight transaction may be unlogged in these interrupted scopes, which are never adopted; their `INTERRUPTED.json` files explain why. The final runner rotates seed leases only between ACKed commands (120-second active segments plus a 5-second fairness gap); other phases use a hard 14m30s lease watchdog. All runs use the lab heavy token. Lease histories are in final receipts. Seed `wallMs` includes store-count enumeration, lease gaps and waiting; it is a conservative wall rate, not pure transact throughput.

Stack: only `tx2-dxh2-a1-{pg,tx,gw-w,gw-r}`; CPUs 6/6/6/7; caps 512 MiB / 1500 MiB / 1500 MiB / 1500 MiB; transactor Xmx768m, peers Xmx1g. Ports 8497/8498. Local images only, no downloads. `fsync`, `synchronous_commit`, `full_page_writes` all on. Original stack receipt is under durable `evidence/DX-H1/tx2-dxh2-a1/` because the existing up script has that evidence root. The measurement wrapper defaults to these ports.

## Measurements

All numbers are indicative on shared CPUs. Summed stage durations can overlap across workers and must not be added to infer wall time. Publication and its independent oracle fold are serialized, preserving the existing G5 state fold across workers.

| N | Workers | Live readers | Sweep wall s | Subjects/s | Status |
| ---: | ---: | ---: | ---: | ---: | --- |
| 50 | 1 | 64 | 31.154 | 1.605 | PARTIAL; existing semantic gates below pass |

50-subject timing totals (seconds):

| Read | Read HTTP requests | World decode | W0 evaluation | Build outbox | Publish commit | Commit HTTP requests | Verification |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 27.277 | 8 | 0.246 | 0.019 | 2.096 | 0.372 | 2 | 0.271 |

The read term includes adapter transport and wire decoding. The separately reported decode term is conversion to sorted per-subject W0 worlds. Outbox preparation includes existing-state reads and record construction. Verification includes fresh per-subject O-DOMAIN reconcile, independent publication folding, and delivery comparisons. These instrumentation boundaries are in `sweep-worker.ts`, `sweep.ts`, `w0-outbox.ts` and `w0-driver.ts`.

The first 50-subject diagnostic preceded matched-prefix reporting. It compared a 10-second baseline with a 31-second sweep and is **not** a matched ratio result. Full raw quantiles: read baseline p50/p99 2639.49/8458.26 ms; sweep 1389.00/3295.53 ms. Writer service p50/p99 19.66/44.30 ms baseline and 19.11/64.42 ms sweep. Its old ratios 0.390 / 1.454 are retained as raw diagnostics, not P5 evidence. A later fix matches offer-time prefixes and includes commits that start after a window ends; the smoke run was not retroactively re-labeled.

## Gates and correctness counters

The completed 50-subject diagnostic: G0 fingerprint, G1 pinned world, G2 independent reconcile, G3 post-capture mutation, G5 deliveries, G7 basis/epoch and G9 counts all PASS within this diagnostic's scope. G4 PARTIAL (exact coverage and completed cursor no-op, no live abrupt-stop cycles); G6 NOT-RUN; G8 maintenance NOT-RUN. Overall PARTIAL.

- Exact coverage: 50/50; one page; no duplicate evaluations or deliveries.
- Mutation witnesses: 1 positive (ceil(N/100)); pinned basis 2243; unchanged negative witness recorded.
- Deliveries: 32, equal to fresh independent O-DOMAIN publish fold.
- Seed: 2242 commands, 24407 assertions, 6 retirements. End: position 2298, 25239 assertions, 52 retirements; independently folded feed counts equal.
- Baseline offers/ACKs 14/14; sweep 39/39. Duplicate / lost-ACK / correction denominators all zero, so those cases were not exercised by that smoke. Raw live failures: zero. Live reader semantics are not fully oracle-checked: latency reads check basis eligibility only.

The per-producer content/freshness/binding audit is in [AUDIT.md](AUDIT.md). Existing gates were not weakened; `w0-gates.ts`, fingerprints and O-DOMAIN were not edited. Untimed portable store-count enumeration now reads every entity's history with bounded concurrency 8 and retains the same head/future-row checks.

## Gaps against TARGETS 1.1 P5

| Item | Coverage / remaining gap |
| --- | --- |
| 1 — release, W0, one shared basis | Real W0 kernel, activation/release hashes, exact position and valid time, source hashes in receipt. No 100k run. |
| 2 — exact once coverage | Full N subject list hash, duplicate checks, page coverage and completed cursor no-op. Live abrupt-process-stop recovery cycles remain absent. |
| 3 — atomic publication / independent outputs | Existing atomic state+delivery commit, command-ID deduplication, all evaluated outputs / deliveries compared to fresh independent O-DOMAIN. No new independent readback gate for every committed outbox row. |
| 4 — post-capture mutations | ceil(N/100) oracle-positive mutations; latest witness then pinned world/output equality on every subject, including mutated subjects. |
| 5 — wall / maintenance | Full evaluation+publication+verification wall and paired latency measurement. No 100k wall result, ten-minute throttled compaction/rebuild overlap or proof of nonblocking maintenance. |

Additional limits: no full live-read model oracle or TARGETS 2.2 historical/hot read mix; current-position uniform readers. No A/A calibration, matched database clones, statistical ratio acceptance or noisy-host correction. The writer service p99 is reported separately from scheduled-offer-to-ACK p99, so queueing is visible.

## Needed package changes

1. A public Datomic reach operation returning the raw recorded position for **every row**, e.g. `getReachRowsMany(roots: readonly EntityId[], basis: ResolvedTemporalBasis) -> Effect<{ rows: readonly TripleRow[], reportedBasis: { recordedPosition: number, validAt: number }, position: number } | undefined, ReadError>`. Rows must retain `recorded_position` and valid intervals, one exact source cut, and support historical positions. A per-root equivalent can be parallelized with concurrency 8. Merely returning `ReachResult.triples` cannot supply `WorldRow` without content loss.
2. The existing `Triples.transactionByCommand(commandId)` likewise needs indexed claim lookup followed by one stored transaction read. The W0 harness now uses exported `DatomicClient.claim(db, commandId, capturedPosition)` and verifies the actual stored public transaction ID, command ID and position, instead of scanning all facts or caching ACKs.
3. More efficient bulk seed ingestion preserving all logical command positions, receipts, journal changes and assertion record positions would be needed to make the exact W0 population cheap to load. This is a setup limitation, not a change to P5 timing or a reason to omit the seed fingerprint.

## Checks, pins, evidence and cleanup

Offline dependency installation and required builds passed. Focused HTTP/page, stored-journal and W0 P5 tests: 21/21 passed (`checks4.log`). Changed-code typecheck passes (`focused-typecheck4.log`). Bench typecheck reports pre-existing errors in `audit-traffic.ts`, `round2.ts`, `hs01-seed.ts`; no errors from changed files in that invocation. Full root `pnpm check`, package qualification / release and 100k runs were not performed.

No acceptance-pinned path's hash moved: [PIN-CHANGES.json](PIN-CHANGES.json) is empty, generated by searching modified paths in `lab/acceptance/` references. Contract files are unchanged. Dependency lockfile is unchanged. No `packages/**` source edits.

A confirmed package blocker was worked around in the harness: `packages/core/src/store/TriplesLive.ts:666-686` queries **all** `_Transaction` rows before applying `{after, limit}` in TypeScript. At 200 W0 subjects this exceeds DatomicClient's 67,108,864-byte response cap. `reader-equivalence.log` and `reader-equivalence2.log` retain the failures; `count-diagnosis.log` records the exact nested `Gateway response exceeds 67108864 bytes` error even for requested feed limits 1/10/100. Reducing the public page size did not fix it. The W0-only `w0-journal.ts` workaround records ACK identities, requires dense positions through the source head, and point-reads the actual stored public `Triples.transaction(txId)` records. G9 still folds stored journal changes and independently enumerated entity histories; it does not fold ACK content. NS behavior is unchanged unless `TX2_W0_POINT_JOURNAL=1` is explicitly selected. Production needs the existing `Triples.transactions({after,limit})` to push range/limit selection into an efficient adapter journal-page method before materialization.

Durable evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H2/`. Every raw file stays there; only this report, audit, short index and SHA256 manifest enter git. The worktree `runs/DX-H2-*` entries are untracked symlinks into durable evidence. Final manifests and cleanup receipt will be indexed below.
