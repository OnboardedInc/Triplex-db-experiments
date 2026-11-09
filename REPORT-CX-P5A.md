# CX-P5A — EXP-P5 round A

North star: P5, protecting P1/P2. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; design: R34 sections 0–6, rulings Q92a–k and Q89b/i. Branch: `exp/P5-release-sweep`. No package source changed, no public API changed, no engine/resident/container touched, no merge or push.

## Result

**Incomplete implementation; not a promotion, not an A0-all-gates PASS, and not A1 evidence.** The implementation provides a real W0 population seeder, position-page reader, worker kernel path, outbox publication, cursor, controller model and offline diagnostic driver. See `lab/experiments/EXP-P5/A1-RUNBOOK.md` for exact build/G0 commands and the remaining screening work. A separate reviewer is required; this report is builder evidence only.

### Implemented

- `w0-seed.ts` reconstructs the command plan while streaming `population(rung(N))`, including baseline pay assertions, overwritten pay, decision order, ballast chains, and future raises. Each command goes through `CompositionHandle.transact`, every returned position is checked, and submitted operations plus full receipts stream to `seed.ndjson`. Future raises close the preceding valid interval rather than retracting today's pay. Integers use exact decimal-string Triplex integer values; unsafe and floating values fail.
- `w0-world.ts` projects only `{e,a,v,tx}`, follows the named ref edges, sorts fact bytes per SPEC 9/12.7, and never includes retirement metadata in a W0 fact. The memory route rejects future/invalid P, including empty pages and extra record-time fields.
- `CompositionHandle` has `sweepPage`, optional retention pin, `publishOutbox` and `storeCounts`. Memory reads page worlds at P. XTDB uses the existing built `makeXtdbStorageAdapter().getByEntities` behind a lab client wrapper that includes MAX(position) in the same statement. This XTDB SQL has **not executed live**.
- Workers read XTDB directly; memory retains one in-process owner and uses RPC to send page rows to workers. Workers decode/evaluate and transfer result ArrayBuffers. Per-worker thread CPU for read/decode/kernel and event-loop utilization is recorded. Memory owner read CPU is not attributed by that worker counter. For diagnostic inspection G0 buffers include worlds and outputs, so they are larger than production record-only buffers.
- Cursor binds sweep ID, position/valid time, scope, ordered subject-list digest, release/activations and page size. It persists only after publication ACK, using rename. It rejects incompatible resumes. This is process-stop recovery, not a power-loss/fsync guarantee. Epoch change currently aborts for explicit resume; it does not automatically re-read the page as required by G7's final design.
- Outbox frames have at most 64 unique subjects, persist per-subject state and delivery records in the same Triplex transaction, use command IDs for retry deduplication and live-fact preconditions for state replacement. Pure W0 `publish` owns item sequence/retirement semantics.
- New W0 seam entry points verify accepted W0 and O-DOMAIN file pins against `obligations.json`. Missing pins close the seams. Legacy N01 fetch-only stubs remain closed; the new W0 driver does not silently repurpose old synthetic worlds.
- Trace mapper preserves offered event sizes and command IDs, writes reachable W0 answer/status/decision facts only on the selected placement, and never writes shared entities. **It is not integrated into the driver yet.** Replacing scalar status values and O-REPLAY must be connected before using it as a live trace.
- Controller constants and update model follow R24 5.2. It is unit-tested, **not connected to live queue delay or ratio observations/admission**.

## Evidence and validation

Install: frozen offline pnpm 10.11.0 with the exact project store; no lockfile changes. Build: W0 plus qualification/core/testkit/XTDB dependency builds through `heavy.mjs` succeeded (four Turbo cache hits and a fresh W0 build). Cached builds are not a fresh package qualification claim. A first build invocation using `pnpm --store-dir ... exec` failed because pnpm 10 does not accept that placement; the corrected command uses `--config.store-dir=...`.

`node --experimental-strip-types --test lab/bench/test/bench.test.ts lab/bench/test/p5.test.ts`: **19/19 tests passed**. These include ten new worker lifetimes interrupted after outbox ACK and before cursor persistence; they are deliberate callback failures, **not ten abrupt controller-process stops**. TypeScript (`lab/bench/tsconfig.json`), scoped oxlint, and `git diff --check` passed. No root `pnpm check`, package tarball check, external-backend integration suite or browser test was run; package code is unchanged.

The stacked G6 test is in a separate commit. RQ01 is not on this base, so the G6 suite is **unrun** and intentionally errors if its rebuilt exports are absent. It registers memory `sweepPage` beside RQ01 source routes, uses sparse histories and P/T/TP families, and tests the offline maintenance model. It does not qualify real maintenance, leases, O-REPLAY, or any engine route. Reviewer must run it on the RQ01 stack and extend the live fixtures.

Local raw evidence lives under this worktree's ignored `runs/P5/`, retained as original attempts:

- `smoke-01/receipt.json`: first failure, activation used a release name where W0 requires a content hash. Corrected; receipt retained.
- `smoke-02/receipt.json`: 50-subject diagnostic, exact fingerprint, activation, G1/G2/G3/G5/G7/G9 slices.
- `a0-1k-01/receipt.json`: first 1k diagnostic. Source files were improved during this run; **not qualified as a source-frozen attempt**, even where individual content checks passed. Do not promote it.
- Final frozen attempt paths and measured figures are added below after completion.

## PASS audit (preamble rule 9a)

Every observation-to-PASS location in this implementation is listed here. None yields an acceptance/P5 verdict; the driver explicitly emits `classification: DIAGNOSTIC`, `acceptance: false`, and overall PARTIAL while the gates below remain incomplete.

| Location | Content | Freshness | Binding / limits |
| --- | --- | --- | --- |
| `w0-driver.ts` G0 | exact basis position, fact count, worlds digest and R2 output digest equal independent O-DOMAIN population; invalid-world list must be empty | oracle subprocess executes during this attempt; fresh scope and exclusive-create seed log; existing output rejected | N/seed/source hashes checked; accepted W0/O-DOMAIN files verified; fingerprint receipt SHA recorded; source hashes rechecked before final result. Block digests are not yet compared; complete kernel transitive build hashes and live placement remain gaps |
| G1 | every activation world equals the G0-proven population world, including facts and assertion positions | reads are from current activation sweep after fresh seed; page subjects checked | tied to driver activation P and V. Valid only for this no-pre-capture-trace diagnostic. No touched-subject O-REPLAY result claimed |
| G2 | canonical `W0.outputJson` equals a fresh independent O-DOMAIN reconcile result for every subject | streaming oracle is a newly spawned child; each request has one FIFO response; unexpected/absent response rejects | G1 independently establishes the expected world; exact activation hashes/P/V passed. Not a golden-scenario/full-round result |
| G3 | enough distinct output-changing witnesses selected using O-DOMAIN before/after flags; latest route confirms mutation; G1/G2 prove old cut hides it; equal untouched witnesses recorded | mutations commit after this activation P, with retroactive validFrom | both position order and valid visibility checked; not a live 64-reader race |
| G5 | exact per-item delivery bytes from store ACK equal O-DOMAIN publish; expected state folds from prior oracle state, never observed state; duplicate keys reject | actual outbox transactions from this attempt, oracle called per frame | sweep record subjects/bases checked; memory retry regression verifies original ACK recovery. Outbox receiver/external effects are not exercised |
| G7 | every returned page has a safe head >= requested P, epoch, exact ordered subject list and output basis.tx | direct page result from current worker, no cached receipt adoption | output position checked against driver basis; stable epoch required. Automatic epoch-change retry and explicit output validTime check need strengthening |
| G9 | direct end counts equal a separate fold of actual journal assertion/retraction commands; start counts match seed manifest | counts queried on this run at both endpoints | current scope and actual positions. Public internal-journal assertion accounting remains unverified; memory counts only are demonstrated |
| node:test result | explicit assertions/equality/rejection checks over actual code and fresh fixtures | each test creates unique memory scopes, temp files and workers | unit/regression evidence only, no promotion. G0/G9 mutants, precision errors, future/time shapes, dirty seed, Q89i, wrong cursor, ten ACK-before-cursor interruptions and missing pins are exercised |

G4 is PARTIAL, G6 NOT-RUN, G8 absent. The seeder's successful return, a worker's result and outbox ACK are not by themselves PASS or acceptance decisions. `Controller` produces limits, not verdicts. `requireFingerprint`, `requireCounts`, `equalBytes` throw on content mismatch; they do not emit independent receipts. Stacked G6 asserts RQ01 violations empty but relies on the harness's diagnostic reference, never labels that independent engine qualification.

## Remaining work / open questions

1. Integrate the frozen mapped writer trace and 64 live readers; recorded commands for O-REPLAY; an advancing deterministic clock; live-read basis mix/split reads/hot set; release R2/R1 alternation; warm-up, six S0/S1 rounds and matched A/A windows. No performance ratios are available.
2. Wire the controller to measured live queue/p99 observations and publisher admission; handle a stopped controller without busy waiting; implement fair live command priority.
3. G4 ten abrupt sweep-controller **process** stops at seeded random pages, durable cursor restart, retries counted, outputs compared with uninterrupted reference at both rungs. Current callback-stop regression is narrower.
4. G6 live per-lane fixture, independent O-REPLAY reference, real maintenance/retention lease tests. G7 epoch change should retry automatically and include full requested basis in each page observation.
5. Full 4.4 live counters, exact slot/config/image/cpuset/cap binding, full kernel package/build hashes, bytes per fact and resource/CPU attribution. The current raw receipt is not complete A1 screening evidence.
6. XTDB live G0 and G8. Current pool ledger has all three residents, whose caps leave less than a 3.5 GiB exclusive XTDB slot. No admission was attempted and no lifecycle changed; orchestrator must open the scale window.

**Predictions:** no XTDB prediction tested; XTDB bytes per fact unknown. Worker CPU measured on the offline slices must not be interpreted as live engine pull CPU or traffic impact. P5's outcome remains open.
