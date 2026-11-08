# V-P2Q round 3 — CX-VP2Q-3

**Verdict: FIX-FIRST.** The lock, incarnation, source-import and probe-coalescing fixes withstand the rerun and added variations. One remaining error-path defect affects two surfaces: an answer-request transport failure after a successful basis probe loses `replica-unreachable` in native SPARQL and Datalog. This is a reason-classification failure, separate from the explicitly deferred core `_tag` migration.

**North star:** P2 atomic durable per-subject commits and P3 source-derived, ordered resumable feed accounting. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is a delta correctness review for default-off integration, not performance acceptance or default enablement.

## Reviewed source and method

Target: `957e3a364e79291cde1d0e5315fa256def8de3c3`, builder report `c936b2a`. The initial verifier branch was `856af98`, containing the earlier review atop `f711193`. Integration commit `6fd453d` brings the target into **verify/P2Q only**. Add/add conflicts in verifier files were resolved to the builder's explicit adaptations after inspecting their diff: marker-incarnation support, guarded incarnation matching, an empty dependency aggregate model, corrected reason expectations and assertions against stale accepts. The original verifier tests remain in Git history. No product code was authored or edited in this review.

`git diff --exit-code 957e3a3 -- packages lab/experiments/EXP-P2Q-qlever-log-broker/bench` is empty. Tests import source using Vite workspace aliases; subprocess fixtures use tsx and source imports. The final scoped gates retain command, source hashes, Node version, start/end, exit status and source-stability checks in `evidence-round3/lock-final.json`, `evidence-round3/variations2.json` and `evidence-round3/nonzero-final.json`. All report `sourceStillMatches: true`. Test state stays under `lab/verify/P2Q/state-round3/` (retained, Git-ignored); results and tooling are under this verifier directory.

Read the live main-checkout round-two requirements and Q72a-e/g, Q67c/d/h; main-checkout files were read-only. Q72f is compiled in acceptance: the future-basis id is E-BASIS-NOT-AVAILABLE. The historical BRIEF's strict A0/no-change wording is superseded by Q72d; its old model/trailer directions are superseded by this dispatch.

## F1 — major: answer-request outages lose the required reason

Locations at the target:

- `packages/qlever/src/native/NativeQueries.ts:251`: the catch only preserves errors already constructed as `BasisNotAvailable` / `ReplicaUnavailable`. A raw transport failure from the answer request at `:222` is wrapped as plain `ReadError` at `:255`.
- `packages/qlever/src/QleverQueryExecutor.ts:64`: `fail` preserves the gate's typed errors but wraps a transport failure from the actual executor requests as plain `ReadError` at `:70` (used at `:424`).

Reproduction: allow the source/marker probe to return a valid position and incarnation, then make the answer request throw `Error("ECONNRESET after successful basis probe")`. Native explicitly uses `awaitBasisMs: 2000`; Datalog uses a broker-backed runtime with a committed, drained subject. Neither answer succeeds, but both return `{_tag:"ReadError", reason:undefined}`. The same injected reset through dependencyState correctly returns `reason:"replica-unreachable"`, via `BrokerStorageAdapter.ts:458`.

Independent regressions: `tests/round3.test.ts:73` and `:85`. Reproduce with a new output directory:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-3-repro -- env V_P2Q_OUT="$PWD/lab/verify/P2Q/evidence-round3/repro-new" V_P2Q_RUNS="$PWD/lab/verify/P2Q/state-round3" node_modules/.bin/vitest run --config lab/verify/P2Q/vitest.config.ts tests/round3.test.ts
```

Evidence: `evidence-round3/round3-native-mid-answer-outage.json`, `round3-datalog-mid-answer-outage.json`, and the passing control `round3-dependency-state-mid-answer-outage.json`. `variations2.log` retains both failed assertions; `variations.log` retains the first native-only failure. The assertions remain failing and have not been weakened.

**Impact:** broker-mode clients cannot reliably classify an unavailable replica or apply the promised retry policy; classification depends on which request meets the outage. Q72c renamed the strings, but the native/Datalog no-fallback guarantee still requires that failures along the actual answer path reach that representation. This does not demonstrate a stale successful answer or lost durable frame.

**Proposed fix:** in broker mode, classify transport failures from *every* native and Datalog engine request, including relation/materialization and answer requests, using `isUnreachable` and `ReplicaUnavailable` with the appropriate surface and original cause. Preserve existing typed failures and keep validation/query errors distinct. Scope that classification to broker mode to preserve A0 behavior. DependencyState's `typed` helper is an existing pattern. Re-run both regressions and add a query-error negative control. No product fix was made here.

## Earlier tests rerun

All commands ran through `node lab/bin/heavy.mjs --label CX-VP2Q-3-... -- ...`; no engine slot or lifecycle operation was used. Node: v22.23.2. Host free space was about 29 GiB, above the 5 GiB floor. Queue-wait messages are retained in controller logs.

| Check | Fresh result | Evidence under `evidence-round3/` |
| --- | --- | --- |
| Lock helper SIGKILL while holder lives | PASS: holder fail-stops; second process refused; zero B ACKs; zero lost A ACKs | `check1-lock-perl-dies.json` |
| Holder process-group SIGINT during draining | PASS: helper stays alive; second process refused; zero lost ACKs | `check1-lock-sigint.json` |
| Holder SIGKILL / unclosed normal exit | PASS: helper exits and a new writer can acquire after holder death | `check1-lock-sigkill.json`, `check1-lock-exit.json` |
| Final lock suite, including new variations | 6/6 PASS | `lock-final.log`, `lock-final.json` |
| Original routing schedules and initial fuzz | 18/18 PASS across lock/routing/probe files, including 24 seeds; zero mismatches or stale gate accepts | `offline.log`, `check3-fuzz-summary.json` |
| Required expanded outage/regression fuzz | 12/12 routing tests PASS, 60/60 seeds converge | `fuzz60.log`, `fuzz60/check3-fuzz-summary.json` |
| Probe-load rerun | PASS: 16 waiters; 41 probes in regression window, 15 in ordinary lag window; outcomes `basis-not-reached` | `check3-probe-load.json` |
| Original live zero-downtime residual case | PASS: one rewind, changed incarnation, typed `basis-not-reached`; all 5 pre-existing live tests passed | `live-residual-gap.json`, `live.log` |
| Corrected new live nonzero-prefix variations | 3/3 PASS; one rewind each; native before/after-answer and dependency-in-request all refuse typed | `nonzero-final.log`, `nonzero-final.json`, `nonzero-final/round3-live-*.json` |
| New scoped variation suite | 5 PASS, 2 FAIL (F1 native/Datalog); intended failing assertions retained | `variations2.log`, `variations2.json` |

The 60-seed fuzz recorded 3,100 normal reads; 1,542/1,542 exact outage reads; 386 gate reads (57 accepted, 329 typed), **zero stale accepts**; 3,192 commits, zero failed/unknown; 289 regressions, 196 crash-reopens, 547 outage actions. All 60 final model replicas converged. These are schedule counts, not exhaustive interleaving coverage. The model only supports empty dependency aggregation; populated dependency aggregation is checked live.

The first whole live-file attempt (`live.log`) passed all five pre-existing tests and failed the three new fixture cases. Two independent verifier mistakes prevented their intended schedules: the new native facade initially used a differently encoded scope, and the partial rewind helper passed TripleRows where `buildPublication` requires FrameMembers. The scope-only retry (`nonzero-retry.log` and `nonzero-retry/`) exposed the latter error on all three surfaces; zero completed rewinds were recorded. These are verifier-fixture failures, not product findings. The final attempt uses one canonical scope, deletes only the later commit's assertion rows, preserves the earlier prefix's rows and rewinds the marker with an empty member list. Attempts use fresh graphs/directories; prior logs/results remain intact.

## Required implementation map and additional regressions

| Requirement | Implementing code at 957e3a3 | New independently authored variation and result |
| --- | --- | --- |
| N1 / Q72a | `broker/log.ts:108` ignores INT/TERM/HUP; `:132` detaches helper; `:121` observes unexpected exit; `:171` detects loss; `:391` checks before append. Parent keeps the locked open descriptor, so helper death does not release exclusion while holder lives. | Group **SIGTERM** during a draining holder plus direct helper **SIGHUP**, then a second writer. PASS: second writer refused, continuing A ACKs, clean recovery, zero lost. `round3-lock-term-hup.json`. |
| N2 / Q72b, Q67c | `broker/BrokerStorageAdapter.ts:260` reads marker with pull rows; `:485` reads marker with dependency aggregate. `QleverQueryExecutor.ts:235` opens snapshot, `:391` verifies after all requests. `broker/broker.ts:883` / `:899` bracket snapshot; `:325` and `:1091` select new incarnation before startup/repair replay. `native/NativeQueries.ts:145` / `:234` compare source position/incarnation before/after. | PASS: live rewinds from marker 4095 to **nonzero prefix 2048**, after second commit 3072 was published; native rewind both before and after answer acquisition, and dependency rewind at its combined answer request. All three complete one rewind and refuse with `basis-not-reached`. Both native cases detect the changed incarnation after catch-up to marker 4095. Dependency observes 2048 in its answer request and refuses. See `evidence-round3/nonzero-final/round3-live-*.json`. |
| N5 / Q72e | `broker/broker.ts:813` shares the current/next probe; `:838` paces retries; `:854` joins an immediate probe when a timer fires; `:763` routes startup/applier reads through that same coalescer. | PASS: 40 mixed-surface callers share one rejected ECONNRESET probe; paced/immediate reads and applier startup then recover with **max one marker request in flight**. `round3-probe-rejection.json`. |
| N7 / Q72g | `native/NativeQueries.ts:97` exports 2000ms; `:107` applies it to separately constructed facades when environment selects broker mode. | PASS: separately constructed facade, env broker, no explicit option; basis 4096 while replica stays 2048. It waits about 2000ms, sends no answer request, returns `basis-not-reached`. `round3-native-default-deadline.json`. |
| N8 / Q72e | `packages/qlever/test/fixtures/lock-holder.ts:7` imports `../../src/broker/log.js`; package test launches tsx. Verifier fixture also imports source. | PASS: launch the **package's** source fixture via verifier tsx runner, observe durable frame, kill own holder, independently recover its ACKed frame. Also assert source imports contain no dist import. `round3-package-source-fixture.json`, `round3-subprocess-source.json`. |
| Reason strings / Q72c | `broker/errors.ts:20`, `:47`: `basis-not-reached`, `replica-unreachable`; probe mapping `broker/broker.ts:796`; dependency mapping `BrokerStorageAdapter.ts:458`. | **FAIL at answer boundary in native/Datalog (F1)**; dependency control passes. Future-basis and native 2s deadline variations pass. |

Paths abbreviated in the table are under `packages/qlever/src/` unless explicitly prefixed otherwise.

### Error-string disposition

| Path | Required reason now | Observed |
| --- | --- | --- |
| Repository requested basis beyond resolved prefix | `basis-not-reached` | PASS (routing S7) |
| Datalog waiting for replica, inside/outside transaction | `basis-not-reached` | PASS (offline and live C1) |
| Dependency aggregate unable to reach basis | `basis-not-reached` | PASS (live regression case) |
| Native env broker basis deadline | `basis-not-reached` | PASS (new default-deadline case) |
| Unavailable marker probe | `replica-unreachable` | PASS (40-reader rejection variation) |
| Dependency answer transport reset | `replica-unreachable` | PASS |
| Native / Datalog answer transport reset | `replica-unreachable` | **FAIL: missing reason** |
| Successful repository outage fallback | exact source-log answer | PASS (1,542 fuzz outage reads) |

Existing typed classes still carry `_tag:"ReadError"`. Q72c explicitly permits that for default-off integration and defers Q67h's core tags until default. That deferred migration is **not** F1; this report closes no E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE obligation.

## P3 timing-harness check / Q67d

PASS for the requested source-denominator/accounting change. `bench/run.mjs:187` implements `sourcePrefix`: candidate enumerates **LogFeed from its start**, bounded by the source WATERMARK (`broker/feed.ts:81`); A0 enumerates the **engine journal** after the consumer's starting position. Both collect positions and source subject effects, independent of client ACKs. `run.mjs:296` audits those source-derived effects. Only then do `:312` through `:330` reconcile ACKs and calculate source-to-consumer lag. A missing ACK is listed as late/lost; an ACK outside the source prefix fails accounting; an undelivered source position fails the feed.

Timestamp sources were inspected: broker `broker.ts:535` publishes WATERMARK and `:536` records its monotonic instant; the harness converts that with `performance.timeOrigin` at `run.mjs:297`. A0's `bench/lib.mjs:59` through `:65` records host time at guarded-update resolution, separate from driver ACK time. The consumer records receipt time only after durable `store.recordEffects` (`run.mjs:153` through `:155`). A0's resolution observation is client-side update completion, not a database-internal timestamp.

The independent test in `tests/round3.test.ts` extracts and executes the **exact current harness function bodies**, retaining their source SHA-256; it does not substitute a rewritten accounting algorithm. A real source log contains two committed positions, 2048 and 3072; only 2048 is present in the synthetic ACK map. The exact consumer code durably records both effects; source enumeration includes both; audit reports 2/2 effects, zero gaps/extras/duplicates/order violations; reconciliation counts 3072 as lost/late ACK **without** a feed failure. Negative controls add a phantom ACK and omit delivery: each produces the appropriate failure. The A0 enumeration body is separately exercised with a paginated mock engine journal (after 111 -> 222 -> 333), independent of ACKs.

Evidence: `round3-source-prefix.json`. The ACK omission and clock values in this focused test are synthetic; no real network-lost ACK or performance measurement is claimed. No fresh matched A0/candidate timing benchmark was required or run.

## Remaining boundaries

N3's A0 future-basis guard remains intentionally allowed by Q72d; a matched performance comparison must name the changed/refrozen control. N4's synchronous whole-log outage replay remains a default blocker under Q72e. Those accepted deferrals do not justify default enablement. The core native facade and Q67h tagged errors remain outstanding. The source section contains no N6 requirement.

No product edits, install/dependency changes, root pnpm check, package rebuild, publication, push, main merge, engine rebuild/restart, exclusive slot, or default enablement occurred. No P1/256-reader, year-one-scale, burst, sweep, full golden-scenario, or production target is certified. Only shared qlever-dev at `http://127.0.0.1:7070` was used live, with unique test graphs; only those graphs' rows/markers were rewound. The private engine lifecycle was untouched. First failures, raw test evidence and local source streams are retained.

Open action: classify native/Datalog answer-path outages, then rerun F1. Until that passes, this head is **FIX-FIRST**, even behind default-off.
