# EXP-P2Q round 2 — CX-P2Q-R2

North star: P2 (single-writer, atomic durable commits through signals/restarts) and P3 (ordered feed measured from source publication). Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This is a builder report; independent review and promotion remain with the reviewer/orchestrator.

Implemented on `exp/P2Q-qlever-log-broker`, preserving WIP `9086efa`. Implementation commits: `c5c93d8` (remaining snapshot/probe/native regressions), `4c07432` (source-derived feed effects and verifier-model adaptations), and `957e3a364e79291cde1d0e5315fa256def8de3c3` (coalescing startup/applier probes with reader probes). All final test-suite receipts below name the last code head and record empty Git status before and after execution. The final report commit changes documentation only.

Evidence roots:

- `G = /Users/sam/Claude/Projects/triplex-db-2/CX-P2Q-R2/957e3a3`
- `V = /Users/sam/Claude/Projects/triplex-db-2/V-P2Q/CX-P2Q-R2/957e3a3`
- Gate commands, environment, exact head, clean status, timestamps, exit codes and output SHA-256 are in `G/<gate>.json`; full output is in the adjacent `.log`. `G/MANIFEST.json` seals 650 source/build/dependency/runner and evidence files; its SHA-256 is `3381f43fb20ec30555bb4e2caf1b340ff8943de69e3c44d9a3d71252d4a6f94c`.

## Findings and changes

| Finding / ruling | Fix and source | Evidence |
| --- | --- | --- |
| N1 / Q72a | `packages/qlever/src/broker/log.ts:108` ignores INT/TERM/HUP; `:132` starts the helper detached. The kernel lock belongs to the holder's open descriptor, so helper death cannot admit a second writer. Exit fail-stops the log, and `:391` checks helper state on each append. | `V/check1-lock-perl-dies.json`: second process refused, holder noticed, 0 ACKs from B, 0 lost frames. `V/check1-lock-sigint.json`: helper alive during drain, B refused, 0 lost frames. Package tests also exercise descriptor contention directly. |
| N2 / Q72b, Q67c | Pulls read marker and rows together (`broker/BrokerStorageAdapter.ts:260`); dependency aggregation does likewise (`:485`). Datalog (`QleverQueryExecutor.ts:235`) brackets its requests with `broker/broker.ts:883` / `:899`. Startup (`:325`) and regression repair (`:1091`) choose a new incarnation before fencing/replay. `native/NativeQueries.ts:234` compares source marker/incarnation after the answer. Multi-request reads conservatively refuse any marker change, including forward movement. | `V/live-residual-gap.json`: one live zero-downtime rewind, reported basis 2048, typed `basis-not-reached`, incarnation changed. `V/live-regression-cached-marker.json`: dependency sourcePosition 2048, pull exact; package live suite also exercises the same reset schedule. |
| Q72c reasons | `broker/errors.ts:20` / `:47`: `basis-not-reached` / `replica-unreachable`. Core `_tag` migration is deliberately deferred under Q72c. | Package offline failure-path tests, verifier typed refusal receipts, live C1/C2 receipts. No E-BASIS-NOT-AVAILABLE / E-REPLICA-UNAVAILABLE obligation is closed by this report. |
| N5, N8 / Q72e | `broker/broker.ts:854` sends paced probes through the shared in-flight reader when the timer fires, preventing a paced/immediate overlap. Startup/applier reads also use that coalescer (`broker/broker.ts:763`), with freshness bounds after fences. The package concurrency assertion is now exactly one request. Subprocess fixtures import `src` through tsx. Verifier holder remains alive after append failure so its lock exclusion is actually exercised. | Package test `broker-fixes.test.ts:697` forces the overlap. `V/check3-probe-load.json`: 16 waiters, 41 total regression-window probes and 11 lag-window probes, all failures typed. Source subprocess signal suites pass. |
| N7 / Q72g | `native/NativeQueries.ts:97` exports the 2000ms constant. Factory `:107` supplies it when `QLEVER_COMMIT_PATH=broker`, including separately constructed native facades; explicit broker test wiring passes the constant. | Package test `broker-fixes.test.ts:872` exercises the environment-selected separate facade. Native deadline/reset tests pass offline. No live native reset test was added. |
| Q67d | `bench/run.mjs:187` enumerates final positions **and subject effects** from LogFeed / the engine journal. `:296` audits source effects, then separately reconciles ACKs. Raw output retains each position's source/consumer/ACK instants and source effects. A delivered lost-ACK commit no longer counts as an extra effect because it lacked a client ACK. | Fresh diagnostic traces below; source prefix, raw instants, ACK reconciliation and hashes retained in their receipts. |
| N3 / Q72d | A0's existing correctness guard remains. | `V/check6-a0-guard.json` passes. No new matched A0/candidate performance comparison or control re-freeze was performed. |

Paths abbreviated in the table after the first row are under `packages/qlever/src/` unless they name `bench/` or tests.

## Gates and observations

All heavy work used `lab/bin/heavy.mjs`. Node 22.23.2; installed pnpm 10.11.0. Live requests used only shared qlever-dev `http://127.0.0.1:7070`, with unique fixture graphs. No resident lifecycle action, new slot, main-checkout edit, push or merge occurred.

| Gate | Result |
| --- | --- |
| `G/unit.json` — package offline suite | 60 passed, 26 skipped (live integrations); 9 files passed, 4 skipped. |
| `G/typecheck.json` — QLever TypeScript | exit 0. |
| `G/verifier-offline.json` — adapted V-P2Q suite, 60 seeds | 35 passed, 6 skipped; 10 files passed, 2 skipped. |
| `G/verifier-live.json` | 5 passed, including the asserting zero-downtime rewind case. |
| `G/broker-live.json` | 5 passed, including exact in-request dependency state and the rewind case. |
| `G/build-retry.json` | exit 0; rebuilt core and QLever, including QLever declaration emission. |
| `G/trace-offline.json`, `G/trace-live.json` | both exit 0, 30-second candidate-only diagnostics; 28/28 source positions delivered in each. |

Fuzz (`V/check3-fuzz-summary.json`): 60/60 converged; 3,036 normal reads; 1,524/1,524 outage reads exact; no mismatches; 369 gate reads (53 accepted, 316 typed), **0 stale accepts**; 3,220 commit attempts, 0 failures; 185 crash-reopens and 306 regression actions. These counts describe this schedule, not exhaustive concurrency coverage.

Diagnostic trace receipts at the measured code head:

- Offline: `G/P2Q-trace-C-offline-20261108T214322Z-7d9860.json`; source-to-durable-consumer p50 5.9ms / p99 23.6ms.
- Shared QLever: `G/P2Q-trace-C-20261108T214409Z-1c1b39.json`; source-to-durable-consumer p50 6.5ms / p99 14.7ms.

Each enumerated 28 source positions and 28 source subject effects, with zero unstamped/undelivered positions, gaps, extras, visible duplicates, or order violations; ACK reconciliation found 28 ACKs and no ACK outside the source prefix. RYOW was 28/28 in each. No warmup samples were dropped. With n=28 the nearest-rank p99 equals the sample maximum. Both bench identities record `dirty:false` and the exact measured head. Each run then wrote its new untracked receipt, recorded in the gate's after-status; the driver moved that receipt into G before starting the next run, restoring a clean tree. Raw paths and SHA-256 are in each receipt. These short traces have no burst, resend, actual lost ACK or P1-reader phase and are not acceptance measurements.

## First failures and adaptations

The first sandboxed package run could not inspect its own processes with pgrep; the helper tests failed and left one holder. Its exact identified process was killed, and subsequent process tests ran with the required process-inspection access. A wording-only assertion mismatch was corrected. Initial logs remain at `/Users/sam/Claude/Projects/triplex-db-2/CX-P2Q-R2-unit-initial.log` and `.../CX-P2Q-R2-fixes-initial.log`.

At clean `c5c93d8`, the package suite/typecheck passed but the verifier offline suite had two failures, retained in `.../CX-P2Q-R2/c5c93d8/`. Its model ignored the SPARQL incarnation guard, admitting an obsolete delayed publication, and rejected the newly combined dependency/marker request before its marker could be checked. `lab/verify/P2Q/tests/harness.ts` now enforces the guard and models the empty dependency aggregate only. Populated dependency aggregation remains unsupported in that model and is verified on live QLever. The original verifier cases from `856af98` were read with `git show`; builder adaptations are explicit, and do not replace separate adversarial review. The residual-gap and fuzz cases now assert rejection / zero stale accepts instead of only recording results.

The first build invocation (`/Users/sam/Claude/Projects/triplex-db-2/CX-P2Q-R2/4c07432/build.json`) failed because pnpm rejects `--store-dir` with `run`. It performed no compilation. The retry runs the exact package scripts with the already installed binaries; no install or dependency change occurred. Superseded queued traces were stopped before executing against stale builds. First-failure logs were not overwritten. All suites also passed at intermediate `4c07432`; final source review then found that applier probes could still overlap gate probes, motivating the stricter final coalescer and full clean-head rerun at `957e3a3`.

## Limits and pending decisions

- N4 is intentionally unfixed and remains a default blocker. Fresh offline evidence (`V/check3-outage-scale.json`) at 30,000 commands: one outage pull ~457ms; eight pulls ~3341ms; concurrent commit ~396ms versus ~3ms alone. These are diagnostic observations on this shared host, not performance acceptance.
- Core tagged errors / Q67h remain required before default. Existing errors remain `ReadError` subclasses with the corrected reason strings. The core native facade and Q58c current index remain future work.
- The A0 guard stays; a matched comparison must name its changed control. No production default, promotion, package publication or broad performance target is claimed.
- Short candidate-only traces do not cover year-one scale, burst windows, P1 concurrency, rebuilds, actual network-lost ACK injection, or a matched A0 arm. They validate this accounting path only. Bench identities hash configured image/start-script inputs; this run did not independently re-attest the resident's full deployment configuration.
- Full root `pnpm check`, `pack:check`, PostgreSQL/FoundationDB, browser/e2e and complete golden-scenario qualification were not run. This round used the scoped QLever suites, typecheck, package builds and live regressions above. No publishable-package dependency or public-core contract changed.
- Verifier streams, unique live graphs, raw samples, historical evidence and first-failure logs are retained; package unit fixtures perform their normal bounded afterAll cleanup. No source/log deletion was used to make trials fit. Report-only commit follows the measured clean code head.
