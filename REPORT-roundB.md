# CX-P5B — EXP-P5 round B host store

North star: **P5**, release activation over 100k subjects in at most 100 s while live read and commit p99 remain at most 1.5x baseline. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design R34 section 6 B0–B2, Q92a–k, Q99c, Q100a. Everything here is **DIAGNOSTIC**, acceptance false. This is builder evidence for independent review, never a self-certified promotion.

## Result and blocking contract assumption

**Round B is incomplete.** The dedicated SQLite sweep read mechanism is implemented, but the B0 reference-position prerequisite is incompatible with the accepted broker's positions. R34 section 1.2 item 2 and the round A seeder require every successful receipt position to equal W0's dense reference position. `packages/qlever/src/broker/position.ts` deliberately packs `LSN * 1024 + ordinal`; opening a new log consumes LSN 1 for EPOCH_BEGIN, so its first commit has position **2048**, while the first W0 seed command expects **1**. Group commit does not repair this: groups cap at 64 commands and leave gaps, and epoch frames consume LSNs.

The new `lab/bench/p5-host-preflight.ts` submits the actual first command from `seedCommands(10000)` through the built, detached HostBroker, reads back the complete submitted row bytes with the acknowledged physical position, and compares the received position to the reference. It refuses on the first mismatch. It does not rewrite stored positions, manufacture dense receipts, recompute expected digests from candidate observations, or claim G0 admission. A safe continuation requires a planner/orchestrator decision about a bound reference-to-native position mapping (including assertion tx, activation bases, O-REPLAY, resume, history, and group boundaries), or a separately designed dense broker position format. Either changes a shared semantic assumption and must precede a real group seeder.

**Not implemented/executed:** the complete group-commit population seeder; complete 10k G0; B1 W=1/2/4 controller-off/on live screening; G1–G8 sweep qualification; 1k A0 replica side run; B2 100k, kill/resume, ten-minute throttle/purge/RESTART overlap. No P5 rate, live latency ratio, 10k bytes-per-fact, or 100k result exists. B2 requires B1 to pass as well as free disk above 15 GiB; disk alone cannot admit it. B3 VM acceptance is outside this task. No engine/container/resident was touched, no engine slot was reserved, no remote was pushed, and no main checkout source was edited.

## Round A merge and every conflict

Requested `e283d83a` is merged in **40be0207**. All 21 conflicts:

- `REPORT-CX-P5A.md`
- `lab/bench/audit-traffic.ts`
- `lab/bench/lib/composition.ts`
- `lab/bench/lib/evaluate.ts`
- `lab/bench/lib/g0.ts`
- `lab/bench/lib/memory.ts`
- `lab/bench/lib/sweep-recovery.ts`
- `lab/bench/lib/sweep.ts`
- `lab/bench/lib/w0-fingerprint.ts`
- `lab/bench/lib/w0-gates.ts`
- `lab/bench/lib/w0-outbox.ts`
- `lab/bench/lib/w0-public.ts`
- `lab/bench/lib/w0-rounds.ts`
- `lab/bench/lib/w0-traffic.ts`
- `lab/bench/round2.ts`
- `lab/bench/test/p5-g6.stacked.ts`
- `lab/bench/test/p5-round2.test.ts`
- `lab/bench/test/p5.test.ts`
- `lab/bench/w0-driver.ts`
- `lab/experiments/EXP-P5/A1-RUNBOOK.md`
- `lab/experiments/EXP-P5/W0-G0-INTERFACE.md`

Resolution: take round A versions, retaining the base's Datomic lane typing/language, scopeName/reportedBasis fields, atomic invalid-operation validation and EntityState preconditions in memory. The clean automatic `triplex.ts` merge preserves Datomic support. Inherited round A reports and receipts remain historical. The local `contract/0.3.14` ref still points at **651fdb77**, already an ancestor; no later final head was available when checked. No contract file was edited.

## Store implementation

- `HostLog.sweepPage` now dispatches to up to four dedicated readonly SQLite workers, separate from the four live reader connections, sharing the existing checkpoint gate. Each call performs complete ref BFS inside one BEGIN/COMMIT, chunks frontiers at 500 bind variables, deduplicates entities/cycles, and optionally applies the valid-time cut. Pages cap at 64 subjects. Readers never execute on the broker thread.
- The same page transaction observes marker `h` and committed `position`; invalid, below-horizon and future cuts throw the broker's typed `BasisNotAvailable`. T/TP requests refuse through `H1BasisUnsupported`. Actual marker head is carried in the error. A page at a known absent ordinal below the resolved head remains a legitimate prefix; no dense assumption enters the read implementation.
- Rows visible at P mask later `retracted_at`, `retracted_position`, and `retract_tx_id`, preserving old-cut bytes (Q89i). Current `pull()` behavior outside this sweep route is unchanged.
- Returned instrumentation covers full BEGIN-through-COMMIT transaction wall time, BFS read time, BFS CPU, CPU attribution scope, and BFS hop count. Node 22 lacks threadCpuUsage: fallback CPU is explicitly `process-overlapping`, not per-stage thread CPU. No W0 kernel, publication, or controller CPU measurement is claimed.
- `pinBasis` optionally accepts a lease with TTL 1–300000 ms and maximum lag in physical positions. Renewals cannot revive expired pins. Purge removes expired pins before choosing its horizon. Legacy nonleased pins retain their existing API. The additive `pins.expires` migration is local broker schema evolution; no acceptance-contract version was changed. Long-run restart/clock-jump qualification is not demonstrated.
- Five regressions use real SQLite/broker fixtures: multi-hop old-cut equality after replacement; typed unavailable/T/TP refusal; pin/renew/expiry and checkpoint; fresh packed-position mismatch; wide-frontier/cycle handling; page/worker/value validation. These are focused regression checks, not G6 registration or G8 overlap acceptance.

## Predictions beside measurements

| R34 prediction | This attempt's observation |
| --- | --- |
| B0: full 10k seed <120 s, file about 0.45 GB | Not measured: first reference receipt refuses before population seeding; one-command timing is not extrapolated |
| B1: W4 wall 1.5–5 s; W1 600–2100 subjects/s | Not measured; B0 prerequisite unresolved |
| B1: longest page ≤50 ms; WAL ≤64 MiB | No screening distribution or WAL bar measured; tiny fixture times establish no performance claim |
| B1: live read p99 ratio ≤1.2; commit p99 ratio ≤1.25 | Not measured; no frozen live trace or baseline round ran |
| B2: W4 wall 15–45 s; broker RSS growth ≤300 MB; zero mismatches | Not measured; B1 has no qualifying result |

Initial host free space was about 24.6 GiB; later live samples were about 22–24 GiB. Actual preflight start/end bytes are retained in its receipt. No admission was made based on these historical samples. Every heavy command uses `lab/bin/heavy.mjs`; installation used pinned pnpm 10.11.0, frozen/offline, with the exact project `.pnpm-store`. No dependency or lockfile changed. No cache or HOME override was introduced.

## PASS / verdict / receipt audit (rule 9a)

No new code emits a semantic PASS, admission, or acceptance verdict. These are all new observation-to-result boundaries:

| Location | Content check | Freshness | Binding and limit |
| --- | --- | --- | --- |
| `p5-host-preflight.ts` blocked position result | Actual committed receipt and exact complete readback rows equal submitted command bytes with the received position; expected dense position comes from round A `seedCommands`, not candidate output | New UUID scope and exclusive new attempt/store directory, fresh submitted command and same-attempt readback; before/after source/build hashes must match | Requested 10k rung, first W0 command, exact physical receipt/P and source/build hashes in receipt. Emits BLOCKED/ERROR only; no full population/G0 grant |
| `p5-host-preflight.ts` cleanup/source status | Actual close completion; recomputed hashes and free-space readings | Executed in finally on this attempt | Specific owned broker only. No container cleanup or power-loss claim |
| `run-roundB.mjs` execution observations | Actual subprocess exit/signal/error and SHA256 of raw log; no semantic interpretation of zero exit | Commands executed now; logs exclusive-created in new durable directory | Exact argv, timestamps, elapsed wall, durable path. Stages JSON is execution evidence only, even if a command fails |
| `p5-host-store.test.ts` test results | Explicit equality/rejection assertions on actual bytes/rows/cuts/lease outcomes; exact first broker position 2048 independently asserted | Unique new broker directory per test, new commits and reads; fixtures close/remove only their own state | Source imports this worktree; no historical receipt adoption. Unit/regression completion only |
| `HostLog.sweepPage` eligible result | Same transaction checks available P and reads BFS under the marker snapshot, masks future lifetime fields | One new page transaction per request | Physical basis/marker returned; `eligible:true` means route eligibility only, never oracle equality or P5 acceptance |
| Evidence index / SHA256SUMS | Hash actual retained durable files | Generated after execution | Exact paths and hashes only, no copied PASS/qualification field |

Inherited round A grant/audit locations are documented in `REPORT-CX-P5A.md`; this merge does not newly certify them. A separate reviewer must examine the merge and the new route. Focused tests cannot close G0, G6, or G8.

## Contract pins and evidence

No `lab/acceptance/` changes. Changed paths were checked against the acceptance tree for explicit pinned-path references. **Changed explicitly pinned-path old/new SHA256 list: empty.** Runtime/source hashes for this attempt are observations in durable evidence, not changes to contract pins. The acceptance contract remains 0.3.14.

Durable evidence and final validation results are appended below. Raw gate/oracle data stays outside Git; commit only the short index and SHA256SUMS under `lab/experiments/EXP-P5/roundB/`.

## Retained earlier attempts

- `final-01`: QLever build/typecheck and SQLite tests (10/10) completed; harness typecheck failed on absent XTDB artifacts and unannotated generator `.value` use in the new preflight. The preflight still produced the expected BLOCKED result; it was not a harness completion. Fixed by building dependencies and adding the explicit `W0Command` type.
- `final-02`: dependencies, builds, types and 10/10 SQLite tests completed; the raw preflight refused position equality. The outer source inventory reports **stable:false**, because the runner was edited during this attempt to add merged harness tests. Do not use it as frozen-source evidence. The original receipt and preimages are retained unchanged.
- `final-03`: source inventory **stable:true**; builds, both typechecks and 10/10 SQLite tests completed. Expanded merged harness suite was **32/33**, with one failure caused by an absent built `packages/qualification/dist/index.js` in the worker path. The actual failure remains. The source-frozen preflight again refused 1 versus 2048. The next attempt adds the qualification dependency build; no product behavior was changed to make this test succeed.


## Final source-frozen validation

`final-04`, 2026-11-09 **07:40:43–07:41:27 UTC**, records **stable:true** across its source inventory and the preflight's source/build comparison. QLever and required XTDB/qualification dependency builds completed, QLever and complete bench TypeScript checks completed, the real SQLite suites completed **10/10**, and the merged harness/freshness/deadline suites completed **33/33**, zero failures/skips. Formatting, scoped lint and `git diff --check` also completed. No root `pnpm check`, tarball check, external-backend integration, complete G6 route registration, G8 maintenance overlap or P5 screening was run.

The preflight deliberately exits **2**, status **BLOCKED-REFERENCE-POSITION-MISMATCH**, attempt `a8bf47cf-d6ce-4541-9a07-42d74bfb850d`. Actual first command: `jur:j001 / stateMinWageCents / 1500`, expected W0 position **1**, observed broker **2048** (epoch 1, LSN 2, ordinal 0). Complete readback row bytes matched submitted content with the acknowledged native position. Source and build rechecks match; broker close completed. First-command ACK wall **7.133 ms**, own-process CPU **2886 µs**. These tiny preflight measurements do not test R34's full-seed prediction or any per-stage screening bar. Host free bytes **24820449280 → 24820228096**; B1 remained unadmitted regardless of adequate disk.

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5B/`; final execution logs/source preimages: `final-04/`; raw broker and refusal receipt: `final-04/preflight/`. Earlier attempts remain intact. Committed pointers: `lab/experiments/EXP-P5/roundB/index.json` and `SHA256SUMS` (828 retained files). Manifest generation hashes actual files after terminal cleanup; the index only records explicit command outcomes and the blocked comparison. No grant is inferred from outer runner exit zero.

Open decision: specify how W0's dense reference assertion positions and activation basis bind to the broker's accepted sparse physical positions, then implement/review the group seeder and fresh full-content G0 before B1. Contract 0.3.14's local ref remains 651fdb77; merge the reviewed final head when one exists. This branch is ready for code/blocker review, **not promotion**.

# Round 2 — Q101a mapped positions and resource-aborted 10k B0

**North star:** P5, 100k activation within 100 s and live p99 ratios ≤1.5; scope and targets remain `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. **Result: implementation advanced, 10k B0 incomplete; B1/B2 not admitted. DIAGNOSTIC only, acceptance false.** Q101a was read from the main checkout and its immutable `945476b2` row is retained in durable evidence. No acceptance file or contract version was edited/merged. Q101a supersedes round 1's dense-native equality requirement; the old refusal remains historical evidence.

## Implemented

`position-map.ts` validates a dense reference sequence and strictly increasing safe native positions. Each entry binds a content digest; a domain-separated SHA256 chain binds its ordered prefix. Exact inverse lookup is required for receipt/assertion positions. `referenceCut` is limited to resolved ordinal-gap prefixes; it never interpolates an assertion or command position. Loading requires the caller's externally bound hash, reconstructs the chain, and refuses changed entries or header hashes.

`host-store.ts` supplies a mapped composition through the built public core/QLever packages. A detached transport returns no replica rows; all writes use the real core `Triples` service, broker adapter, broker decision loop and SQLite file. **No handwritten import rows or journal suppression.** Groups use the product `StorageAdapter.withTransaction` around up to 64 sequential, nested `Triples.transact` calls, preserving submission order, real IDs, all journal envelopes, reference command boundaries, overwritten values and future-valid raises. Group receipts are bound before mapping; native ordinals are taken from those receipts, never predicted from frame size.

The final seeder reads back complete asserted rows, including otherwise-unused value channels, owner/type/schema fields, times and native position; later retirements are masked back to each asserting receipt's cut. Retractions check the submitted ID and actual retirement position/time/transaction. The real claims table is read back in the same verification phase. Any difference prevents adding that reference. Final maps are saved separately and hash-linked from `seed-manifest.json`; every command receipt includes native position and its map-prefix binding. Post-seed reads reject any metadata/content change to the frozen seed-map file. The final witness encoding is `q101a-full-row-and-claim/1`.

Grouped seeding exposed a product bug: SQLite assigned every nested claim the group's final ordinal. `sqlite-worker.ts` now binds each claim through its transaction's actual row position. This is necessary for first-command lost-ACK resolution and map integrity. Full source and broker regressions cover the change. The first seed command now resolves through the product claim to reference **1**, native **2048**.

The mapped composition serializes post-seed command submission so acknowledgements cannot extend the map out of order. Position-aware intent streaming avoids retaining the complete seed journal in the driver heap; it checks each reference/native pair, prefix hash and command witness before O-REPLAY receives the logical receipt. The seed manifest records logical counts and an explicit native basis; the driver records raw physical counts separately when G0 completes.

## Position-value audit (task step 2)

I searched reads/comparisons of `position`, `tx`, `recorded_position`, `retracted_position`, `next`, bases and cursor fields, rather than searching only API names. `round2/position-sites.txt` retains the data-oriented site inventory. The boundary and consumers are:

| Site | Logical/native treatment |
| --- | --- |
| `w0-seed.ts: seedCommands`, command count, replacement/future-raise plan | Reference positions remain dense. `seedOperations` is shared with round A; it does not manufacture native positions. The identity checks in the old memory seeder remain valid for its logical interface |
| `host-store.ts: seed`, product nested receipts, `verifyGroup` | Reference is command submission order; native is the product receipt. Complete readback and claim verification precede `PositionMap.append`. Gaps, duplicate/decreasing native positions or byte differences refuse. Seed manifest binds map file/hash, command-log hash, logical basis and explicit native basis |
| `PositionMap.native/reference/referenceCut/load` | Exact conversions refuse unknown values; only a resolved prefix cursor may fall between native ordinals. The ordered hash chain and external expected hash protect persisted maps |
| `host-store.ts: transact`, receipt recovery, current position/watermarks, coordinate | Successful public receipts map native → logical and retain `nativePosition`. Recovered claims map their own native position, with that reference's prefix binding. Current position exposes the latest mapped ACK; coordinate maps reference → native LSN/ordinal. This owner has one epoch; broker restart/reload is not qualified |
| `host-store.ts: sweepPage`, marker and visibility cut | Driver P maps to native before H1 availability/BFS. Every assertion position maps back exactly. The returned basis is logical; physical marker/horizon are explicitly grouped as `nativeSnapshot` / native store metrics. A concurrently observed native head may exceed the acknowledged map; only its known resolved logical prefix is exposed |
| `:_tx/position` **value channel** in snapshot and history results | Translated explicitly. Other business numeric/string/JSON values are not treated as positions. Tests read a real activation journal and check both channels |
| `pinBasis`, retention horizon, lease handle | Reference P maps to native before pinning; the handle carries logical/native P and the basis's map binding. Purge and H1 markers remain native physical maintenance state |
| `feedPage`: requested `after`, records, returned `next` | Logical resume → native public feed request; native record positions and `next` → logical. Each record retains native identity plus its map-prefix binding. Tests resume after the complete seed and find the activation at logical P+1 |
| `historyAt`: assertion/retirement positions and cut | Logical P maps to native; source history is filtered at that prefix; future retirement fields are masked. Assertion and known retirement positions, plus internal position facts, map back. Timestamp fields stay timestamps |
| `worldOf`, `w0Basis`, G0 `basisTx`, block digests, kernel/output/outbox bases | Receive logical rows/bases from the mapped composition. W0 `fact.tx`, activation `tx`, output basis and persisted outbox JSON remain reference positions; they are never packed or double-converted. G0 uses the independent reference fingerprint |
| `w0-traffic-oracle.ts` and `w0-replay.py` | Mapped command streaming verifies the chain/witness and supplies logical receipt positions; the accepted replay engine needs no packing change. Incremental appends validate their mapped receipt before advancing the ledger/replay |
| `w0-traffic.ts`, `w0-driver.ts`, `round2.ts`, `w0-counts.ts`, `w0-outbox.ts` | Dense +1, sampled past bases, activation capture, mutations, ledger position, delivery state and transaction recovery operate in reference coordinates when passed this composition. Existing memory/public entry points were not silently switched to the new owner. Host runs use the dedicated entry point; the legacy CLI does not advertise a host factory |
| `sweep.ts`, `sweep-worker.ts` | Cursor binds the map prefix **at the captured basis**, not the later live head. Owner RPC is explicit through `readThroughOwner`; the worker gets mapped rows and checks logical output basis. Native read-unit CPU/marker/transaction metadata travel separately. Decode/kernel stay on workers |
| `sweep-recovery.ts`, `sweep-process.ts` | Parent basis-map binding travels to the sweep subprocess cursor, preserving one logical cut across a stopped sweep process. A broker-process/map restart and real host recovery qualification have not been demonstrated |
| `p5-host-preflight.ts`, `p5-host-round2.ts` | Preflight now verifies through the map and emits `PREFLIGHT-MAPPED-ONLY`, not round 1's equality refusal. B0 records logical fingerprint basis, explicit native basis, map hash and native counts. No arithmetic assumes native receipt P+1 |

Native physical positions remain native in retained broker frames, row/claim storage and raw resource observations. Those are explicitly named physical evidence, not public W0/oracle positions. Map hashes do not certify a complete seed until the full population and G0 finish.

## Actual 10k attempt and resource stop

Attempt **bfe61ec5-82e7-4b25-8622-35fe3524c9c3**, started 2026-11-09 **08:01:35 UTC**, requested N=10,000, expected **434,768 reference commands**. A fresh independent O-DOMAIN population fingerprint completed before seeding. The real product seed ran in groups of 64. At the retained stop-decision sample it had acknowledged/logged at least **185,600 references**, **2,900 groups**, native position **2,970,687**, after **278.674 s** of seed work. These are an incomplete prefix, not 10k subject coverage.

Actual sampled logical file sizes at 08:06:25 UTC were:

- `broker.db`: **10,851,872,768 bytes**.
- WAL: **51,565,952 bytes**.
- Driver seed intent: **1,031,542,477 bytes**.
- Host free: **13,801,570,304 bytes**.

A simple observed-bytes-per-acknowledged-reference projection estimated **16,022,712,257 additional bytes**, leaving approximately **−2.22 GB** if the seed continued, before preserving the 5 GiB floor. This is a **forecast**, not a measured full-rung size or a reclaimable-space claim. I stopped early based on this resource forecast; the host had not crossed 5 GiB. The preamble forbids starting below that floor; applying a conservative forecast to this active run was my resource-safety decision, not a new acceptance bar.

Ownership was checked using the canonical heavy lock: owner **11250**, label `CX-P5B-R2-B0-10k`, exact child **13459** with this attempt's output path. SIGTERM went only to that verified heavy owner; its wrapper terminated the child and exited **128**. Both PIDs were freshly confirmed absent, and the heavy reservation disappeared. No engine/container/resident, unrelated process, main source or external service was changed. The raw driver's receipt remains **RUNNING** because abrupt stop bypassed its finalizer; it was not rewritten or adopted. Separate `resource-abort-decision.json` and `resource-abort-terminal.json` bind the observations, source recheck, ownership, exit and retention. All recorded source/build hashes matched at the stop.

**G0 did not run at 10k.** No complete seed manifest was produced and no partial map was sealed. B1's W=1/2/4 × controller off/on, G1–G8, live baselines and per-stage CPU were therefore **not run**; the B1 matrix is not newly implemented by this round. B2 was not admitted. The remaining disk problem requires a measured compact representation/resource window, not journal suppression, a reduced denominator or deleting this first failure. The task's full 10k/screening objective remains incomplete.

The original attempt's readback witness covered submitted command values/lifetimes and receipts; after the abort I strengthened the final implementation to complete-row/actor/type/schema and per-command claim readback. The stopped attempt's copied preimages remain its actual source, and are not retroactively upgraded to the later checks. `prefix-audit.json` separately audits its recorded reference order/hash chain and readonly native counts; its reconstructed prefix, if present, is explicitly unsealed and grants no G0/admission.

## Predictions and verification

| R34 prediction | Measurement / status |
| --- | --- |
| B0 full seed <120 s | **Missed already at the prefix:** 278.674 s for the retained 185,600-reference sample; full seed aborted |
| B0 file about 0.45 GB | **Estimate invalid for this product path:** sampled DB 10.85 GB before completing the seed; real journal envelopes and retained storage copies are present |
| B1 W4 1.5–5 s; W1 600–2100 subjects/s | Not measured; B0 incomplete |
| B1 page ≤50 ms; WAL ≤64 MiB | No screening distribution. Stop-decision WAL 51.57 MB belongs to seeding and tests neither sweep bar |
| B1 live ratios ≤1.2 / ≤1.25 | Not measured; no live comparison |
| B2 W4 15–45 s, RSS growth ≤300 MB, zero mismatches | Not measured; neither admission prerequisite met |

Final source-bound checks are `round2/checks-02/`: **38/38** map/harness/replay/freshness/deadline tests and **21/21** real broker/SQLite tests completed, no failures/skips. Both bench and QLever TypeScript checks and package build completed. Source inventory before/after is **stable:true**. Scoped lint, formatting and `git diff --check` completed. The native suite emits MaxListenersExceededWarning under its concurrent request tests; it did not fail a test, and this run does not claim a listener-leak investigation. No root `pnpm check`, tarball suite, external PostgreSQL/XTDB/QLever service gate, full host G6 registration, long maintenance window or production acceptance was run.

Tests include 1→2048 and ordinal-gap prefix translation; planted reference gap, equal/decreasing native P, changed command bytes and a changed persisted map/hash; a real grouped seed; full-row value/actor readback mutants; first nested command claim recovery; logical feed resume; journal position value channels; history reads; independent O-REPLAY world comparison; and a fresh independent O-DOMAIN fingerprint at **N=50**. That small rung is a regression, not 10k coverage. Earlier `checks-01` and smoke logs remain retained as earlier attempts, not replacements for final-source receipts.

## Round 2 PASS / verdict / receipt audit

| Observation-to-result boundary | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| `PositionMap.append` / `load` | Reference sequence, strictly increasing native P, exact submitted/readback canonical bytes, ordered chain and external expected hash | Built from each new product receipt and actual fresh readback; load re-reads bytes | Entry content digest + prefix hash; no seed admission on append/load alone |
| `host-store.ts verifyGroup` | Full final-source row/claim bytes, assertion cut masking and exact retirement fields | Readonly worker requests after this group's actual ACK | Real opaque IDs, native positions, transaction IDs, source owner and reference order; final witness version explicit |
| Seed completion / saved manifest | Exact reference count equals requested W0 basis; all groups verified; saved map reload matches in-memory bound hash | New store/log/map with exclusive output creation | Map hash, seed log hash, logical/native basis, counts. **This path did not execute for the 10k attempt** |
| Frozen-map guard, mapped receipt validation and replay stream | Seed-file metadata change refuses; every streamed reference/native/hash/witness rechecked; appends validate receipt binding | New file stat/stream/read per use, no old receipt adoption | Seed hash plus requested basis prefix / native receipt. File modification refuses even before an oracle sees it |
| Revised preflight | Real first product transaction verifies and maps reference 1, retaining actual native P | Fresh UUID scope and store, source hashes before/after | `PREFLIGHT-MAPPED-ONLY`, G0 NOT-RUN; never a population or performance PASS |
| `p5-host-round2.ts` R34 fingerprint result | Exact worlds/R2 fingerprint and every 1000-world block digest equal fresh O-DOMAIN; invalid worlds refused by shared guard | Oracle subprocess and store reads from this new attempt; source recheck | Requested N, map binding, logical basis, source/build hashes, raw independent oracle bytes. Explicitly no generic full-content admission |
| Resource abort decision/terminal observations | Actual file/free samples, projection formula, exact PID/label/argv, wrapper exit 128 and absent PIDs | Observed during/after this attempt | Same owned store/path/source hashes; conservative resource refusal only |
| `audit-roundB2-prefix.py` | Original source preimage equality, strict log reference/native order, original witness projection and per-receipt chain equality; readonly native counts | New reads after verified quiescence | Explicit old source projection and raw prefix; unsealed map, incomplete population, no new readback or G0 claim |
| Check runner / unit test output | Exact assertions on actual fixtures; actual subprocess exit/signal and raw-log hashes | Fresh fixtures/commands, terminal source inventory | Exact args, source preimages, logs; regression completion only, not acceptance |
| Evidence index / manifest | Actual durable file checksums | Generated after writers/audits/attempts terminate | Exact paths and statuses; no copied PASS from a historical artifact |

No observation grants P5 promotion. B1 ratios, full 10k correctness and G4/G6/G8 host qualification remain open. The round's generic map conversions and passing regressions cannot substitute for those denominators.

## Contract and handoff

No `lab/acceptance/` edits. Explicit pinned-path references in the local acceptance JSON tree were searched for every changed implementation path; **changed explicitly pinned-path old/new SHA256 list: empty**. Q101a is a read-only authority input from `945476b2`, not a local contract edit. New runtime/source hashes are bound evidence, not re-pins.

Durable round-2 evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5B/round2/`. The entire aborted store and raw first-failure receipt are retained. Repository index/manifest is under `lab/experiments/EXP-P5/roundB/round2/`. Next work: provision/compact the measured product storage cost, rerun a fresh 10k seed plus complete G0 with the final full-row/claim verifier, then implement/run B1 and its independent gates. Do not resume or promote this unsealed partial store by adopting its terminal files.

## Final retained round-2 observations

The readonly post-stop audit found **187,520 complete logged reference receipts**, native position **3,001,407**, with an uninterrupted recorded map chain ending `11989b907ccb1e84b3433dfd2901862ffb726af42b3219689c589d0a50ce9cc3`. It found no trailing partial line and **no unlogged physical tail** in the retained marker. This is **187,520 / 434,768 references**, not a complete 10k seed. Actual native counts were **2,931 frames** (including the epoch frame), **187,520 claims**, **5,419,936 recent rows**, **5,419,097 live rows**, and **839 retired rows**. The intent prefix contains **1,926,847 domain assertions** and **839 retractions**; native counts also include the product journal. Its reconstructed `position-map-prefix.json` is explicitly **unsealed**, admission false, and retains the original attempt's earlier witness projection. It is an audit aid, not a completed seed manifest.

The revised standalone preflight completed with `PREFLIGHT-MAPPED-ONLY`: reference **1**, native **2048**, real full-row/claim readback, fresh scope, source hashes unchanged and successful close. This replaces round 1's executable equality assumption; it grants no G0 result.

A separate final-source **N=50 smoke** completed 2,242 reference commands in 36 native frames, logical basis **2,242** → native **37,889**. Seed wall was **4.874 s**. Its complete map/seed hash is `1acfe029ff5881d1de18badf3bf91491d08aab8e041a10a85220b4614a78e450`. Fresh G0 read **24,494 world facts**, matched both independent digests and the block digests, and completed in **0.465 s** with **0.545 CPU s** for the whole G0 phase. Worlds digest: `sha256:91cad54dbcd60208545f80cc930c5cd9173abe3ab0bd0912a86fc38798e9e72e`; R2: `sha256:28d743e8102c9304fbbd3d73c0b3003ad137b8e1014a25d6210f990d0b4519ea`. Source hashes remained unchanged and the owner closed. These are **50-subject regression measurements**, not evidence for R34's 10k predictions or B1 per-stage CPU. Generic full-content admission remains explicitly NOT-CLAIMED.

Final artifacts: `round2/mapped-preflight-01/`, `round2/g0-smoke-50-01/`, `round2/checks-02/`, and `round2/b0-10k-01/` (original raw receipt, resource decision/terminal record, native store, intent, source preimages, unsealed prefix and audit). The SHA256 manifest covers the retained bytes after all owned writers and readonly diagnostics have closed. No source, store, first failure or unrelated data was deleted to make another rung fit.
