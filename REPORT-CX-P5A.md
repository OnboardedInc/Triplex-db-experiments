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

## Frozen 10k attempt completed

`runs/P5/a0-10k-01/receipt.json`, attempt `a5962ff8-1cb9-4ae1-b962-9b4eabdee73b`, finished 2026-11-09 01:13:52Z, source recheck passed. Full receipt SHA-256: `db9b9e00896d326a6489f0f734b06a39dacdeaeda19701086785074a8c557787`. G0/G1-no-trace/G2/G3/G5/G7/G9 slices passed; G4 PARTIAL, G6 NOT-RUN, no G8. Overall **PARTIAL**, acceptance false. The fresh independent fingerprint is:

- basis.tx **434,768**; facts **4,488,231**.
- worlds `sha256:7b4c292331396ab379423ed7faa1a095c324dcdb72afb411d0f48f93efa5624d`.
- R2 outputs `sha256:79fd11ed2fca7f47dba526e0994792db977e8a799b2fe67442e7298bf0803036`.
- Activation outbox: **7,831 deliveries**, byte-compared per frame with O-DOMAIN publish. Exactly 100 post-capture positive mutation witnesses, with 100 untouched negative witnesses.
- Actual start counts: position/frames 434,768; assertions 4,468,284; retired 1,954. End: position/frames 435,026; assertions 4,488,385; retired 2,054; all equal the independently folded journal changes.

Worker thread CPU seconds (read excludes the memory owner's read work):

| Phase | Worker read | Decode/world construction | Kernel |
| --- | ---: | ---: | ---: |
| G0 preview | 3.837812 | 40.268107 | 2.272809 |
| Activation | 3.902049 | 41.286981 | 2.372194 |

Kernel stages average **227.3 µs/subject** preview and **237.2 µs/subject** activation. R34's prediction of within 20% of 158 µs **did not hold for this measured pipeline/host run** (upper edge 189.6 µs). This is a diagnostic measurement on the busy host, not an isolated kernel benchmark. Decode/world construction dominates. No XTDB bytes-per-fact measurement or XTDB prediction was made.

Committed summary: `lab/experiments/EXP-P5/offline-summary.json`; raw results remain in `runs/P5`. Final source-state test receipt: `runs/P5/checks-final.tap`, **19/19 passed**, zero skipped/failed; TypeScript and scoped lint also passed.

## Frozen 1k attempt completed

`runs/P5/a0-1k-final/receipt.json`, attempt `54cda78e-0c19-48c2-a769-53327485bcf2`, source recheck passed, status **PARTIAL**, acceptance false. Receipt SHA-256 `8b3e065e48ce4692bb5ae0fd01001f3fb4b5a2a26d9c01a4b11d66579512c3b0`. G0/G1-no-trace/G2/G3/G5/G7/G9 slices passed; G4 PARTIAL, G6 NOT-RUN, no G8. Basis 42775; world facts 444368; 807 deliveries. Independent worlds and R2 fingerprint bytes matched.

Worker CPU seconds (read/decode/kernel): preview {'read': 0.343803, 'decode': 3.6783910000000004, 'kernel': 0.191958}; activation {'read': 0.35389, 'decode': 3.7931850000000003, 'kernel': 0.221132}. See the committed offline summary for the full fingerprints/counts and raw receipt hashes. Both requested offline rungs were executed, but the required A0 all-gates condition is **not fulfilled**.

Implementation commit: `7bc0601a`. The following separate stacked commit carries the unrun G6 fixture and this final evidence summary. No further jobs or engine ownership remain held by CX-P5A.

# Round 2 — offline recovery, traffic, controller and shared G0

North star P5, with P1/P2 protected. Continued from `18640ea2`; Q93a/b were read from the authoritative main-checkout rulings (this worktree's older rulings are not edited). Offline only: no Docker/lifecycle operation, resident, engine port, merge or push.

## Changes

- **Shared W0 fingerprint:** `lab/bench/lib/w0-fingerprint.ts`. Both the original P5 driver and the round-2 measuring process import it. Entry point `fingerprintSweep({endpoint, scope, basis, expected, counts, deadlineMs?, signal?})` reads fresh content and counts, returns `complete-and-matching`, or throws typed `FingerprintRefusal`. It verifies accepted W0/O-DOMAIN pins, exact coverage and world/R2 digests, counts before/after, and endpoint/scope equality. Every page is deadline-bound by the total gate plus backend query timeout. K01 can import `readW0Fingerprint(comp,N,basis,signal)` as its existing `W0Check.read` callback; that returns exactly `{basisTx,facts,worlds,R2}`. Integration contract: `lab/experiments/EXP-P5/W0-G0-INTERFACE.md`. This W0 snapshot component does **not** replace K01's all-table/history/claims D or its refusal-only layout checks. The pinned expected digest is supplied by the caller, never manufactured from a clone's own observation.
- **G4 completed offline:** `sweep-process.ts` runs the actual sweep controller in a separate child process; the owner retains the memory store and atomic outbox. `sweep-recovery.ts` selects ten distinct pages from a bound seed, alternating abrupt stops after publication ACK/before cursor and after cursor persistence. Each abrupt stop is an actual termination of that owned child (its worker threads terminate with it). Ten new controllers resume the cursor, and a final controller completes. World/output/record bytes equal the uninterrupted reference; returned delivery bytes on retry equal the reference; newly visible `(id,seq)` keys never duplicate. Child exit code/signal/PID and stop schedule are retained. The earlier callback-only regression stays as an additional test.
- **Traffic and controller:** `w0-traffic.ts` uses the frozen trace generator, maps actual offered commands to W0 facts, atomically replaces scalar facts, resolves duplicate commands and intentionally lost ACKs through command lookup, and retains operations/receipts. Exactly 64 in-process closed-loop memory readers run beside writers and sweep workers, with hot-set selection, 80/15/5 position mix and split reads straddling an already scheduled trace commit on the selected placement. A warm-up precedes activation. Live pulls publish nothing; only sweep records use the outbox.
- The R24 controller now counts consecutive breaches **during** a hold, sets worker-page admission, gates publication, and resumes a stopped limit after its hold. Its 100 ms observation windows contain actual offer-to-service queue delays and live read/commit ratios; publication waits behind all already-offered writer jobs. S0/S1 and every controller observation/limit are retained.
- **Matched screening:** `w0-rounds.ts` runs randomized sequential no-sweep/sweep order until M01 merges, every sixth round A/A, alternating R2/R1 targets and S0/S1. Arms use isolated COW memory copies and the same trace seed/events, with fresh G0 before warm-up. Default is 12 rounds, configurable 8–24 measurement rounds; explicit shorter integration runs remain diagnostic. A burst window must include the full 60 s burst to become ratio-eligible. Reads and commits are compared in the same offer-time window from capture to last sweep publication, including slow ACKs finishing after that window. Raw full-phase values remain available. Whole-round bootstrap intervals and the 1.5x threshold are computed separately for steady/burst reads/commits; missing samples, too few rounds or fewer than 25,000 burst commands per arm remain INCONCLUSIVE. No macOS memory result grants P5 acceptance.
- **G6 actually run on RQ01:** `run-rq01-stack.mjs` reads exact immutable harness/dependency preimages from RQ01 commit `d5cd32e6`, compiles them in this worktree's owned `runs/P5` stack, and runs the stacked P5 tests against those bytes. It neither edits nor imports mutable sibling worktree source, and does not merge RQ01. Its receipt binds the RQ01 commit, source/compiled hashes, test source hash and compiler version. The fixture now declares complete retention, carries valid extension attempt/receipt bindings under RQ01's new grammar, and projects actual returned values/positions/valid intervals rather than copying source values. Three seeded history families pass; wrong-value and fail-open mutations are rejected. Complete-retention memory routes do not purge, so H1/Datomic lease expiry and real engine maintenance remain live lane checks, not fabricated offline successes.

## Completed checks and evidence (before traffic window finishes)

- `runs/P5/r2-tests-final.tap`: 26/26 tests pass, zero skipped/failed. Includes content/count/binding/partial/deadline G0 refusals, COW isolation, ten actual process stops, consecutive controller guards, mapper replacement/idempotency/lost ACK, insufficient ratio evidence, and 64-reader/writer/controller overlap. TypeScript and scoped lint pass.
- `runs/P5/r2-rq01-d5cd32e6-1794188069312/`: final G6 stack, 5/5 tests passed; `stack.json` and `test.tap` retain exact inputs and outcome. First stack failure (new grammar dependency missing) and second failure (extension attempt binding) remain in their original directories; fixed reruns use new directories.
- `runs/P5/r2-10k-01/receipt.json`: fresh shared G0 matched the pinned independent fingerprint after replaying the retained command log; then G4 passed with 10,000 subjects, ten real child stops, 157 first publications, 162 publication retries, 7,831 unique visible deliveries. Output/reference digest `a80cd861c8919d1ded0d03b7331cf39cd3cd3a1b9c28390c5e4fb334e5862b94`. Overall `OFFLINE-CHECKS-COMPLETE`, acceptance false. Source recheck passed. Historical receipt status never grants admission; only the fresh G0 content read did.
- `runs/P5/r2-1k-01/receipt.json`: shared G0 and full G4 passed; eight 65 s matched live-traffic rounds are running. Final summary is appended below when finished.

## Round-2 PASS audit

| Boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `fingerprintSweep` → `complete-and-matching` | exact expected basis/fact count/worlds/R2 hashes; all subjects; start/end counts; accepted pins | direct reads in the calling measuring process; total deadline; no persisted PASS input | requested endpoint/scope compared with opened reader; explicit P/V and pre-pinned expectation; typed refusal tests cover digest/count/partial/URL/deadline failures. K01's full D remains separate |
| `recoverSweep` → G4 PASS | every recovered world/output/record and delivery byte string equals fresh uninterrupted reference; exact subject-list coverage; no duplicate newly published key | actual owner RPCs and ten new terminated controller lifetimes in this invocation; old reference cursor cannot produce coverage; actual signal checked | scope/P/V/list hash/seed/sweep ID/cursor bound; stop schedule and process outcomes retained; outer runner hashes/rechecks the lab source set before final qualification of the receipt |
| `round2.ts` → OFFLINE-CHECKS-COMPLETE | command log hash and actual restore positions/assertion IDs, then fresh G0; G4/traffic calls must complete | new unique scope/output; historical seed log is input only; no historical pass adopted | input receipt/log hashes plus actual source hashes checked at end; memory endpoint explicitly named. This is an offline result only, not engine admission or P5 acceptance |
| `ratioSummary` → HOLDS/FAIL/INCONCLUSIVE | raw-window p99 ratios, whole-round seeded bootstrap, 1.5x upper interval, separate steady/burst groups and command/sample floors | observations collected by the current arms, not old reports | matched seed/trace, actual 64-reader records, controller settings and raw read/write files. macOS single-arm result always DIAGNOSTIC/acceptance false; minimums prevent a small commit sample from granting HOLDS |
| G6 node:test assertions | complete RQ01 observations have zero violations; known wrong-value and fail-open inputs must yield HE-1/HE-6 | actual newly executed tests against a newly compiled stack directory | immutable RQ01 commit plus harness/test/compiled hashes; offline model reference is explicitly diagnostic, not independent engine qualification |
| regression node:test assertions | exact equality and expected typed rejection, not exit status alone | fresh fixture scopes/processes/files | current code plus retained TAP; root/external integration suite is not claimed |

The legacy `trace.sha256` field currently carries N01's short `traceDigest`, so it must not be treated as cryptographic source binding. A separate raw-event audit byte-compares **all** offered events against the frozen generator and between arms, hashes actual raw files with SHA-256, recomputes matched-window samples, checks 64 reader identities/position cuts/splits and >=50% hot reads. The independent raw-event audit and final traffic outcome are appended below. Its result can establish sample consistency only, never a P5 performance acceptance.

## Scope limits

No A1/XTDB run, bytes-per-fact, engine maintenance, cpuset isolation, K01 golden freeze, real cloned-engine admission, independent engine O-REPLAY qualification, or P5 production verdict. Matched offline arms start from separately G0-verified copies of the same seed, warm them independently, and alternate target releases; this does not claim the full persistent-store GS.10 rollback/outbox-race scenario. Source binding covers the bench source set and accepted W0/O-DOMAIN pins; it is not a new dependency/build attestation for every transitive compiled package. Coordinated split latency includes waiting for its scheduled trace command. The live-read timing is the memory page route; post-read verification hashing is outside that latency clock. No scope/target bar was relaxed.
