# V-P2Q round 4 — CX-VP2Q-4

**Verdict: FIX-FIRST.** The original two answer-request regressions pass at `03909d6`, but real HTTP response interruption still loses `replica-unreachable` and `{required, observed, replica}` on native SPARQL and Datalog when using the standard exported client. This reproduces offline and against qlever-dev. No product code was changed by this reviewer.

**North star:** P1 exact-basis reads and P2 read-after-commit correctness: an unavailable replica must be distinguishable from an unmet basis. Scope/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This review concerns integration behind the default-off option; it does not certify performance or default enablement.

## Source and delta

Reviewed builder report `1b55d2e` and exact code `03909d656c87958077369353b6f368fbb419fee8`. Integration commit `4a031b8` merges that code into **verify/P2Q only**, atop `3cf609a`. The integration had no conflicts. The main checkout was read-only, including `CLAUDE.md`, `lab/PROTOCOL.md` and the Q72c/Q67h rulings. The requested protocol was absent from this older verifier checkout, so its current main-checkout copy was read.

`git diff 957e3a3 03909d6` is retained as `evidence-round4/target-delta.patch` and `target-delta-stat.txt`. Exactly eight files changed: three product source files (`QleverQueryExecutor.ts`, `native/NativeQueries.ts`, `broker/errors.ts`), the new package answer-error test, two copied verifier files, the builder runner and its round-two report. Product changes add request-boundary classification and optional basis fields on `ReplicaUnavailable`; no write, feed, marker/incarnation, wait policy, runtime factory, HTTP client, default option or benchmark implementation changed. The unchanged `isUnreachable` helper is the gap described below. `evidence-round4/product-drift.patch` is empty: the verifier's packages and benchmark sources match `03909d6` exactly.

Source-bound gate receipts retain commands, source hashes, target/head, Node version, free disk, start/end, status, and log hashes. Tests resolve source through the existing Vite aliases; subprocesses use the existing tsx/source fixtures. No dependency installation was needed. State is retained in Git-ignored `lab/verify/P2Q/state-round4/`. All commands ran through `lab/bin/heavy.mjs`; host free disk was above 25 GiB, exceeding the 5 GiB floor. Node was v22.23.2.

## F1 — major: response-body socket failures from the standard client remain unclassified

**Locations:** `packages/qlever/src/broker/errors.ts:74` (predicate), `packages/qlever/src/native/NativeQueries.ts:158` and `packages/qlever/src/QleverQueryExecutor.ts:251` (new classification boundaries). The actual HTTP read rejects at `packages/qlever/src/QleverClient.ts:96`.

**Reproduction:** let the basis gate succeed; accept the actual answer request; flush HTTP 200 headers, optionally write a partial SPARQL JSON body, then close the socket before response completion. Using exported `makeQleverClient`, Node fetch rejects with:

```text
TypeError: terminated
  cause: SocketError { code: "UND_ERR_SOCKET", message: "other side closed" }
```

`isUnreachable` examines only the outer error's `code` and message. Neither contains one of its recognized strings, so both new wrappers rethrow; the outer catch converts the transport failure to plain `ReadError`. Both surfaces return no `reason`, `required`, `observed` or `replica`. The required result is `replica-unreachable` with the original requested basis, last successfully observed marker, and replica identity. There is no successful partial answer, stale-answer finding, or durability-loss finding here.

Independent regression: `tests/round4.test.ts`, with real local HTTP sockets and both exported HTTP client implementations. Offline uses independently supplied basis 1024 / marker 2048. Live uses actual broker commits and marker observations from qlever-dev; the requested first commit is 2048 and the observed marker is 4095. Each live response-interruption test forwards the real answer query to qlever-dev and acquires its result before interrupting only the verifier-owned proxy response. It never stops the engine.

Evidence for each surface is `evidence-round4/round4-http-standard-{native,datalog}-{headers,body}.json` and `evidence-round4/live-http/round4-live-standard-{native,datalog}-{headers,body}.json`. All eight cases reproduce the same missing representation; raw nested causes and injection events are retained. The fresh-connection client classifies these interruptions correctly (`Error: aborted`, `code: ECONNRESET`). Connection-refused answer requests and HTTP 503 classify correctly for both clients/surfaces. HTTP 400 containing the word “connection”, completed malformed SELECT responses and successful empty results remain distinct controls.

The default broker runtime factory uses the fresh-connection client and therefore passes these schedules. The standard client remains an exported supported composition: the native documentation constructs the native facade with it, and separately constructed facades with broker `awaitBasisMs` / broker environment wiring are explicitly in scope under Q72g. Datalog's exported executor likewise accepts this client and the actual broker gate. Passing the factory-specific fresh client does not establish the claimed native/Datalog request-boundary contract for both clients.

**Proposed fix:** make transport recognition handle structured nested client causes, including Undici socket failures, while retaining the HTTP 4xx/decode negative controls and preserving already typed basis failures. Use a bounded/cycle-safe cause walk or normalize known transport failures at the client boundary; do not classify every arbitrary `TypeError` or textual “terminated” error as an outage. Retain these real HTTP regressions, including field assertions. No fix was made here.

Reproduce without an engine, using a fresh output directory:

```sh
node lab/bin/heavy.mjs --label CX-VP2Q-4-repro -- env V_P2Q_OUT="$PWD/lab/verify/P2Q/evidence-round4/repro-new" V_P2Q_RUNS="$PWD/lab/verify/P2Q/state-round4" node_modules/.bin/vitest run --config lab/verify/P2Q/vitest.config.ts tests/round4.test.ts -t 'real HTTP error matrix'
```

For the live matrix, set `V_P2Q_LIVE=1 QLEVER_URL=http://127.0.0.1:7070` and select `-t 'round4 live'`. The tests explicitly refuse any different live endpoint. Use another fresh output directory to preserve earlier attempts.

## Fresh verification

The two original failing regressions in unchanged `tests/round3.test.ts` now return `replica-unreachable`. That whole seven-case file passes, including the two-second native default deadline and the dependency-state control. The package's ten new cases also pass, including exact differing requested/observed fields, cause identity, typed `BasisNotAvailable` preservation, HTTP 400 and A0 controls.

| Gate | Fresh result | Evidence in `evidence-round4/` |
| --- | --- | --- |
| All earlier verifier offline files | 41 passed, 3 process-discovery failures, 9 skipped on the sandboxed first attempt; all 6 process-lock cases pass on the access retry. Thus all 44 earlier offline tests pass across those retained attempts. | `offline.json`, `offline.log`, `lock-process-access.json`, `.log`, `lock-process-access/` |
| Expanded routing fuzz | 12/12 pass, 60/60 model replicas converge; zero mismatches or stale gate accepts | `fuzz60.json`, `.log`, `fuzz60/check3-fuzz-summary.json` |
| New real-HTTP offline matrix | **26 pass, 4 fail**, 12 live cases skipped; failures are F1 only | `http.json`, `.log`, `round4-http-*.json` |
| QLever package offline suite | 70 pass, 26 integration cases skipped, after process-access retry | `package-process-access.json`, `.log` |
| Earlier verifier live suite | 7/8 pass initially; unchanged focused native-before-answer retry passes. All 8 earlier live cases pass across these attempts | `live-prior.json`, `.log`, `live-prior/`, `native-rewind-retry.json`, `.log`, `native-rewind-retry/` |
| New qlever-dev outage matrix | **8 pass, 4 fail**; the same four standard-client truncations as offline | `live-http.json`, `.log`, `live-http/` |
| Package light broker live suite | 5/5 pass | `package-live.json`, `.log` |
| Package TypeScript | **Not verified:** exit 2; core generated `dist` absent, so public `@triplex-build/triplex/*` declarations cannot resolve, with consequent errors | `typecheck.json`, `.log` |

The 60-seed run recorded 3,040 normal reads, 1,572/1,572 exact outage reads, 396 gate reads (65 accepted / 331 typed), **zero stale accepts**, 3,166 commits, zero failed/unknown commits, 293 regressions, 214 crash-reopens and 561 outage actions. These are bounded model schedules, not exhaustive interleaving coverage or performance evidence.

**Unmet-basis controls pass:** native real-HTTP fixture requires 4096 while reporting 2048; it returns `basis-not-reached` and sends no answer. The Datalog fixture preserves the gate's existing typed failure with those fields and sends no answer. The earlier native two-second default deadline, Datalog inside/outside-transaction waiting, repository future-basis tests and routing fuzz also remain intact. The live Datalog control exercises the real broker's behind-replica gate rather than a stub.

## Attempts, cleanup and limits

First failures are retained. All completed gate receipts report `sourceStillMatches: true`; `SUMMARY.json` inventories the gate outcomes and HTTP schedules, and `MANIFEST.json` hashes every retained evidence file. Sandboxed process inspection could not discover the tests' own Perl helpers: the verifier suite had three process-lock failures, and the package suite had two. Retries used process access, unchanged assertions, and fresh evidence destinations; all six verifier lock cases and all 70 package offline tests passed. The package's failed helper test left an owned fixture alive before its normal cleanup; exact tsx/Node fixture paths and stream directory were verified before killing only those two processes. `package-cleanup.json` records that action. The initial package worker termination warning is retained. No engine process was killed. Final process inspection found zero worktree-owned lock-holder fixtures; `final-cleanup.json` retains that check and an empty product-source diff.

The first earlier-live attempt also retains one failed assertion: native-before-answer returned `replica-unreachable` with a real `TimeoutError` during the request, rather than reaching its expected incarnation mismatch. Its native read budget is 30 seconds; the fixture includes waiting for repair before the final marker request, and this run overlapped two other verifier live suites. The overlap as a cause is an inference, not an engine-side attribution. With those suites finished, an unchanged focused rerun using a fresh graph/output directory passed and returned `basis-not-reached` after observing the changed incarnation. No timeout or assertion was relaxed. This first timeout does not establish a stale answer or incorrect classification of a completed marker check.

The typecheck attempt was additional to the requested runtime regressions. This checkout lacks `packages/core/dist`, which the public package exports require. I retained the unresolved-module output and did not claim a clean typecheck or rebuild packages to hide it. Runtime tests use the established source aliases.

Q72c permits existing `_tag: "ReadError"` subclasses for default-off integration; Q67h's core tagged-error migration remains a default blocker. F1 concerns the missing permitted reason and fields, not that explicitly deferred tag migration. No E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE obligation is closed.

No product fix, main-checkout edit, main merge, push, publication, install/dependency change, package build, root `pnpm check`, default enablement, engine lifecycle operation or exclusive slot occurred. Live engine work used only shared qlever-dev at `http://127.0.0.1:7070` with unique verifier/package-test graphs; injected outages affect verifier-owned loopback connections. No matched benchmark, 256-reader/load/scale/sweep/golden-scenario acceptance, production-readiness claim or fresh historical timing recomputation was performed. Existing default blockers, including outage replay scalability and the core native facade, remain outside this delta.

**Open action:** fix F1's real-client nested socket classification and rerun both surfaces with exact field assertions. Until that passes, this delta remains **FIX-FIRST**, including behind the default-off option.
