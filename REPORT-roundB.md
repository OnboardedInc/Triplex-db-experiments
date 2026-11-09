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
