# CX-VP5A — third review of EXP-P5 round A

**Verdict: ACCEPT-OFFLINE.** F5 is closed. No remaining false-grant finding was reproduced in this review of the wrapper's deadline/cancellation path. This accepts the offline fix; it does not qualify native cancellation, A1, a physical clone, or performance.

North star: P5 admission correctness, preserving P1/P2. Authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/PROTOCOL.md`. Builder input **`242ec546`**, round 4 of `REPORT-CX-P5A.md` and `lab/experiments/EXP-P5/round4/index.json`. Authorized merge into reviewer branch `verify/P5A`: **`94edb008`**. Builder code was not fixed or edited by the reviewer. F1–F4 retain their prior offline closure.

## Fresh results

| Check | Result |
| --- | --- |
| Bench/G0/value/schema/E1/P5 suite, builder freshness controls, earlier reviewer probes, original F5 regressions | **207/207 passing**, zero failures/skips |
| Independent await-boundary matrix | **57/57 tests passing**: 58 invocations, two matching positive controls and 56 expected refusals |
| Late-open continuation whose close remains pending, then resolves or rejects | **2/2 passing**; one close attempt/completion each, no revived grant or unhandled rejection |
| Guard-only K01 patch | Fresh check and application both succeed against immutable `b9d1be7952bb4b1f5890588e693ebe764ec33360`; only `lab/bench/lib/g0.ts` touched |

The unchanged original F5 assertions now pass. The exact reviewer-copy deadline case refused at **5,004.908 ms** with a 5,000 ms budget; its former success after 12.37 seconds is not reproduced. The final-count cancellation case refused at **3,237.395 ms**. The adapted builder-copy controls independently refused at 5,004.166 ms and 3,281.192 ms. These are refusal timings on a busy host, not latency SLAs.

The boundary matrix delays **26 distinct sites**, each once until the deadline and once until external cancellation. All intended fault sites were actually reached. Native-scope mapping cancellation and independent failure of either of two cleanup handles add four refusal controls. Every acquired outer/native fixture handle receives exactly one close; late acquisitions are closed after resolution. The two positive controls match full D and close before success.

## Await and grant audit

Reviewed code: `lab/bench/lib/w0-fingerprint.ts`, its shared `g0.ts` coordinator and subordinate W0 reader, plus the public count-query signal forwarding. Await locations below refer to builder head 242ec546.

| Await boundary | Freshness protection / independent probe |
| --- | --- |
| `w0-fingerprint.ts:118–119`: memory import, composition import and public open | Entire default opener is inside `acquire`/`within`; ownership and freshness are checked on resolution. Each lazy import and the public-open promise was independently held past deadline and cancellation. |
| `:188`: generic `within` race | One shared aborted promise races work; `check()` runs before scheduling, immediately before work, and after it resolves. All delayed operation cases use this actual function. |
| `:211`, `:226`: resource acquisition | Returned resource is registered before the post-open check. External/late opening was tested under both fault modes; no success and exactly one eventual close. |
| `:216`: close of a late resource after acquisition has already failed freshness | No candidate can arise from this failed continuation. Separate tests hold this close await open, then resolve or reject it; the already-returned refusal never changes and no unhandled rejection appears. |
| `:236–239`: native-module import and native open | Actual wrapper import/open awaits are exercised with loader-controlled offline modules; both are held for deadline/cancellation. The import has a post-await check, and native resolution uses the same acquired-resource check and late-close rule. No real connection is opened. |
| `:244`, `:263`: native scope mapping and first/final scope observations | Awaited scope queries are wrapped by `within` with a combined outer/inner signal. First/final scope waits are tested, including the native mapping path. |
| `:264–265`, shared `g0.ts:108,133`: counts before/after scanning | Same absolute outer timer and combined signal apply. Pre/post-count waits are tested for a populated core table and an empty auxiliary table. |
| `:268–272`, shared `g0.ts:120`: async scan iteration | Entry, each returned row and completion check freshness; a stalled iterator remains covered by the enclosing admission race. First-next, returned-row and done waits are tested, including empty scans. |
| `:277`, subordinate `:51`: W0 callback and accepted-pin loading | Whole callback is inside `within`; its signal combines outer and coordinator cancellation. A controlled lazy filesystem-module import holds the actual pin-loading await. A synchronous file-read delay additionally checks timer-starvation behavior. Actual pin contents remain unchanged. |
| Subordinate `:63,87`: W0 page read and event-loop yield | Both remain inside the guarded callback; the reader checks the signal during processing and after yielding. Page and yield waits each refuse in both modes. Synchronous observer delay/abort is checked too. |
| `:278,285`: actual start/end store counts | Both use `within`, receive the combined signal, and validate matching counts before proceeding. Start/end waits are tested independently; the original final-count regressions also run on a real W0 population. |
| `:282–284`, shared `g0.ts:52,105,138,142,201`: shared admission, scope/read callbacks and coordinator return | Outer `within` covers the complete nested call. It receives **`deadline - performance.now()`**, not a restarted full budget. Shared G0 retains its own timer/monotonic guard; all delayed content phases refuse. Full-D construction/comparison remains solely in G0. |
| `:302–307`: all-settled cleanup | Every owned close is started; either close failing cannot skip the other. Cleanup waits race the original aborted promise. Delay/cancel/error cases exercise outer and native handles independently. |
| `:312–318`: final cleanup exit and grant | After cleanup, failure always throws. Successful control reaches another signal/monotonic check at `:317`, immediately before return, with **no intervening await**. Clearing the timer cannot override elapsed-time checking. Synchronous delays, cleanup faults and post-count aborts cannot bypass it. |

The single deadline is created before acquisition (`:162`); it is not refreshed between phases. The combined signal covers the wrapper, while each nested reader operation also combines the coordinator's signal. A content match is only a candidate until cleanup and the final check complete. At the logical return/grant boundary, neither an already-fired signal nor elapsed deadline can pass this control flow. An abort arriving after the operation has already fulfilled is a subsequent event, not a retroactive false grant.

`freezeMemoryG0`'s `:148–154` setup reads and shared E1 normalization are not candidate-admission calls in this path: they build a source pin before `fingerprintSweep`. No independent lifecycle guarantee for that separate pin-creation helper is claimed here. External provider internals are modeled at their awaited operation boundary; actual native connection and process cancellation are not qualified by these fixtures.

## Independent fixtures and binding

`round3/boundaries.test.ts` executes the **unchanged real wrapper and shared coordinator**. Node synchronous module hooks substitute only lazy memory/public/native provider acquisition and the pin-loader's filesystem namespace, allowing each import await to be held without an engine. It also controls the W0 yield. The test source contains the exact mock-module bytes. No admission/digest implementation is mocked, and a positive control must actually match D before the fault cases run.

The matrix uses a sparse real memory state with 50 weekly-minutes facts and a known-content pin to isolate lifecycle behavior; its self-derived expected component is a unit-fixture input, **not O-DOMAIN population qualification**. The full 207-test run separately exercises real population/oracle fixtures, missing/mismatched content and the original six history/value/interval controls. The boundary table's native paths use controlled offline handles and cannot establish physical backend cancellation or cleanup.

No native process, engine, container, resident or slot was touched. No A1, physical K01 clone, corrected 1k/10k path, native maintenance/lease/purge, root/package suite or performance qualification was run. G6 was not rerun in this narrowly scoped round; the prior review's fresh G6 evidence remains historical. Performance ratios remain INCONCLUSIVE. The existing A1 clone/scope/endpoint handoff still needs its own native execution.

## K01 transferable guard patch

Verified **`f52b1ee41df1fd5d0be6fd536c72da9bcdab1fd2`** touches only `lab/bench/lib/g0.ts`. Its preparation/restore pair leaves P5's final G0 bytes exactly equal to reviewed `7e34c387`; no digest algorithm changed. A new isolated `git apply --check` and actual application against immutable K01 snapshot `b9d1be7952bb4b1f5890588e693ebe764ec33360` both succeed, with the newer `tx2-e1/2` marker retained. Patch/before/after hashes independently match the builder receipts. K01's branch/worktree was not changed, and application success is not engine/E1 qualification.

## Evidence and PASS audit

Reviewer tools, compact results and immutable patch fixture: `lab/verify/P5A/round3/`. Oracle/seed outputs, the detailed matrix receipt and exact executed test preimages: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round3/`. `boundaries-index.json` locates and hashes the detailed boundary observations. `round3/SHA256SUMS` covers this report, tools, compact evidence and raw files. `source-and-evidence-audit.json` verifies reviewed source bytes, six builder evidence hashes, the builder manifest hash, current build bytes, executed test preimages, all matrix outcomes and the patch receipt.

| Observation-to-verdict boundary | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| `freshness.test.ts`, `builder-freshness.test.ts`, `earlier-probes.test.ts` assertions/observations | Exact unchanged-content refusals, typed errors/close counters and earlier semantic mutation controls | Fresh seeds, oracle subprocesses, scopes, pins, workers and UUID outputs | Exact executed test preimages/SHA, actual P/V/endpoint/count/pin and reviewed source inventory; memory only |
| `boundaries.test.ts` assertions / indexed raw observations | Matching D in two controls, required typed refusal at every reached fault, exact acquired/closed counters | Every invocation gets new cancellation/latches and unique import identities; no cached success adopted | Actual wrapper/coordinator, explicit sparse fixture, stage trace and source SHA; loader mocks are acquisition-only, not native qualification |
| `late-cleanup.test.ts` assertions / receipt | Pending and rejected late closes start and finish exactly once; caller has already received refusal | New open/close latches and cancellation per case | Exact test SHA and known-content source pin; no late grant or unhandled rejection |
| Backport fixture / receipt | Exact one-path patch applied to immutable source; E1 marker and expected hashes retained | Fresh check/application in a reviewer-owned fixture | Exact patch/target commits and before/after bytes; no product PASS or K01 branch mutation |
| `audit.py`, source inventory, checksum manifest | Actual source/file hashes, real preimage equality and explicit matrix result/counter checks | Actual files from this review after all jobs finish | Builder 242ec546, patch f52b1ee4, immutable target, exact runtime inputs and test preimages; consistency checks, not independent semantic grants |
| `VERIFY-round3.md` verdict | Original F5 refusals, source-path analysis, reached boundary faults and positive controls | This review's fresh executions | **ACCEPT-OFFLINE**, explicitly limited to the reviewed offline fix and prior offline closures |

No `lab/acceptance/` file or pinned source path was edited by the reviewer. Relative to merged builder head 242ec546, reviewer changes are only under `lab/verify/P5A/`: **old/new changed pinned-path SHA list is empty**. The shared G0 guard pair has no net P5 hash movement. No main merge, push or cleanup of unknown/forensic state was performed. No new clarification is needed; native A1/cancellation qualification remains separate work.
