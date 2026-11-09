# EXP-DF01 — Datomic native feed (CX-DF01)

North star: P3, ordered resumable identity delivery, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.
**Result: feed offline gates and G0 PASS; root pack check FAIL (unbuilt CLI); real-peer gates NOT RUN.** Final G0: 1,279 executed/pass, zero failures, 66 expected skips and zero unexpected skips.
Branch `exp/DF01-datomic-feed`, base `731e10e4` (FD01), implementation `1a7e09bd485d494b1b36095e567707e71140d3ba`.
Builder observations only; independent review and promotion remain separate.

## Implementation

1. Added `GET /v1/db/{db}/log?fromT=&limit=&waitMs=`. The inclusive `fromT` and exclusive captured basis end go to `d/tx-range`;
   the returned `nextT` is the next inclusive physical t. Pages are bounded to 1–1,000 transactions and 0–30,000 ms.
   One ref-counted report-queue drainer per connection broadcasts wakeups; it retains no report payloads and removes the queue
   when its last poll exits. Every request reads the log before waiting and after its wake/deadline. There is no queue checkpoint.
2. Inverted the existing position-to-t annotation mapping: physical t remains the source offset, while the transaction annotation
   and DA01's per-fact overrides provide sparse logical positions and transaction IDs. Assertions/retractions select identity-link
   datoms only. Sorting by position/assertion/op makes replay deterministic. Per-fact entities are read at the transaction's cut;
   values, envelopes and key identifiers never enter the wire projection. This adapts R29 section 2.2 row 6 / 4.2 and R41 E6.
3. Read record stamps exclusively from `:triplex.tx/recorded-at`, never `:db/txInstant`. Integer annotations are emitted exactly;
   fractional legacy annotations are explicitly `pending-RT01`, matching FD01's integer stamp constraint without rounding.
   A missing record annotation fails. Every non-Triplex transaction is returned as a `skipped` row with its physical t and reason,
   including excision transactions. Such rows advance the checkpoint but are not falsely labeled aborted Triplex commits.
4. Reused FD01's host `SqliteConsumerStore` unchanged. The Datomic source performs no consumer/checkpoint transactions.
5. Replaced the host Datomic placeholder with a native reader adapter. `DatomicClient.log` and the host adapter check database,
   inclusive-start binding, row order, page size, exact checkpoint advancement and FD01 payloads. Public package exports are used;
   no new package dependency, schema DSL, package-boundary bypass, generated-dist edit or Changeset for a private package is needed.

The gateway codec gained a JVM property for the same checked-in codec specification, retaining the container default path. This
lets offline tests compile the actual gateway and vendor API, instead of replacing the codec with a test stub.

## Gates and evidence

Final gateway offline gate: **7 tests / 32 assertions, zero failures/errors** (`clojure7.log`), with actual vendor JAR, launcher, JVM and source SHA256 inputs. G0 passed on the unchanged implementation in the final attempt below. Earlier attempts remain alongside their logs; they are not promoted.

The fixed `tx-range` fixture is **synthetic recorded data**, authored in `feed_test.clj`, not a capture from a running peer.
The gateway itself projects it into `recorded-page.json`; TypeScript compares that page with separately authored expected identities
using FD01's unchanged `auditFeed`, `auditResume` and `requireGapMutationCaught`. This distinction limits the offline result.

- `build.log`: first command failed because pnpm exec does not accept the bare `--store-dir` option.
- `build2.log`: corrected direct pinned local build; six workspace build tasks succeeded.
- `clojure1.log`: first JVM attempt lacked the distribution's root jars; failed before test execution.
- `clojure2.log`: actual gateway compiled; fake `t->tx` lacked the vendor function's primitive argument signature; 3 failures / 2 errors.
- `clojure3.log`: corrected fake signature; 6 tests / 27 assertions, zero failures/errors.
- `clojure4.log`: added route-level fake queue wakeup, missing-stamp and erasure refusal checks; 7 tests / 32 assertions, zero failures/errors.
- `clojure5.log`: final live helper compiled; 7 tests / 32 assertions passed.
- `clojure6.log`: dependency-byte manifest attempt failed on absolute-path joining before test execution.
- `clojure7.log`: corrected path resolution; final source/helper and dependency bytes bound, 7 tests / 32 assertions passed; output hash equals the original recorded page.
- `focused1.log`: 2 TypeScript files / 4 tests passed; unchanged FD01 audits catch gaps, duplicates, payload changes and the gap mutation.
  SQLite close/reopen and replay produce the same checkpoint/effects/affected set.

| G0 attempt | Result | Evidence / reason |
| --- | --- | --- |
| `G0-datomic-20261109T073729Z-b9d89b` | FAIL: 1,275/1,279 pass; 4 fail | Three host-clock tests could not read `kern.bootsessionuuid` in the sandbox; one qualification test imported unbuilt optional XTDB dist. The new Datomic tests passed. |
| `G0-datomic-20261109T074129Z-83a091` | UNQUALIFIED, interrupted during setup | The rerun began while sequencing the XTDB build, and its own wrapper was stopped. Build output and partial typecheck files are retained; no terminal receipt or semantic result is adopted. |
| `G0-datomic-20261109T074216Z-bab2d9` | FAIL: 1,278/1,279 pass; 1 fail | Host reads permitted and optional XTDB prebuilt. Existing testkit `round3: retired stores cannot omit policies/cuts or silently decline purge execution` exceeded its unchanged 5,000 ms timeout. |
| `G0-datomic-20261109T074723Z-fe429c` | **PASS: 1,279/1,279; 66 expected skips; 0 unexpected** | Same source and timeout after the affected file passed 12/12 in isolation (`timeout-repro.log`). Complete fresh G0, with `previous` bound to the prior failure. |

Canonical receipts are in `lab/runs/G0/`; raw copies, including the interrupted attempt, are retained in the durable evidence root.
`G0.log`, `G0-r2.log`, `G0-r3.log`, `G0-r4.log`, `xtdb-build.log` and `timeout-repro.log` retain the sequence.
No gate, timeout, skip policy, testkit source or acceptance file was changed to obtain the final result.
`pnpm pack:check` was run through its script (`pack.log`) and **FAILED** because the unrelated, unbuilt CLI tarball lacks
`package/dist/index.js`; its artifacts remain under the durable `pack/` directory. This checker does not include Datomic.
No clean packed-consumer result is claimed. Typecheck, targeted lint and formatting passed; G0 rebuilt and typechecked the lane packages.

All expensive commands used `lab/bin/heavy.mjs`; dependency installation used the pinned pnpm 10.11.0, frozen lockfile,
`--offline --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. No dependency versions or lockfile entries changed.
The host lacked a JVM. A Temurin 21 JRE was downloaded into the durable evidence directory and checked against its vendor API
SHA256 before extraction; it was not installed globally. Its metadata/archive/tree remain outside git under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/`. Tests use the already retained Datomic 1.0.7745 vendor jars.

## PASS / verdict / receipt audit (rule 9a)

Every location introduced or used here that can turn observations into a successful check:

| Location | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `feed_test.clj`, `-main` / `clojure.test` result | Exact hand-derived positions, IDs, stamp, skip row, retraction and interval; equality before/after fake value excision; actual fake-queue route wakeup and cleanup; negative requests, missing stamp, unsupported erase | Each JVM constructs its own fixed records, queue, atom and test run; output is regenerated | Actual production gateway functions and vendor API namespaces, fake connection labels; explicitly offline, no real slot claim |
| `run-clojure.mjs` successful exit and output hash | Child test status must be zero and projected output must exist | Removes prior output before running child; source hashes checked before/after | Logs gateway/codec/helper and vendor JAR/launcher/JVM SHA256 inputs, JVM and distribution paths, output SHA256; offline fake-peer kind; no live receipt identity invented |
| `host/test/feed/datomic.test.ts`, unchanged testkit audits | Exact independent expected prefix, content and final token; gap mutant must fail; duplicates/payload corruption must fail; byte-exact replay; SQLite readback and dedup | Fresh adapter per replay, new SQLite file per test; fixture regenerated in this attempt by the gateway test | Source `d/db/g1`, stream/generation/epoch, exact database and t; no claim that the synthetic fixture is a native peer capture |
| `datomic/test/feed.test.ts`, HTTP test | Actual URL/query, response JSON identity, invalid coordinates and foreign database refusal | New ephemeral HTTP server/client per test | Exact requested database/fromT/limit/wait; gateway-produced recorded fixture; no remote engine |
| Existing G0 `gate.mjs` / `vitestOutcome` / TAP and oracle checks | Unchanged gate checks complete executed results, failure counts, reviewed skips and oracle content | New run ID, builds and test executions; first failures retained | Existing source/build/input hashes and parent heavy grant; no live slot claimed for G0 |
| Authored `feed_live.clj` `ensure!` and exit (NOT EXECUTED) | Independent initial identity tuple, identity equality after excision, no surviving value in history, skipped excision, whole replay equality and actual scratch deletion | Unique scratch scope, refuse old evidence; resume is a separate JVM | Saved scope/database/fromT/page and gateway source hash; external runbook requires actual container/image/config receipts |
| Evidence retention/checksum command | Copies are checked against original SHA256 and canonical receipt object hashes | Terminal run directories are copied only after exit; interrupted attempt stays unqualified | Separate run-ID directories, exact object hashes and durable file manifest; no semantic PASS is generated |
| This report's observations | Counts come from retained raw logs, with limitations stated | Names each distinct attempt; final G0 referenced separately | Branch/base and SHA256 index; builder result only, not independent promotion |

The feed route and adapters themselves emit data or typed refusals, not semantic PASS receipts. No acceptance-contract verdict code
or testkit audit was changed. The only existing test edit updates the obsolete placeholder expectation to require an actual reader.

## Pins and limits

No `lab/acceptance/` file is edited. No directly pinned acceptance source path is changed (checked for changed paths under acceptance
artifacts). A separate before/after source checksum list records every modified tracked path for the contract builder's review.
The image/source pins in `slots.json` were not moved, because no image was built or deployed. A later live build must use fresh pins.

Real-peer gates are **NOT RUN**. The resident was already parked and remains untouched; no Docker lifecycle command was issued.
See [LIVE-RUNBOOK.md](LIVE-RUNBOOK.md) for the exact later image/build/slot, separate-JVM excision/resume and regression commands.
The live helper is authored and compiled offline, not executed or independently reviewed. Real excision/index completion, real report
queue behavior and live HTTP replay still need that window. Historical DA01 passes are not fresh evidence for this change.

This is not an ER01-D erasure writer: an `:f/erased-in` event fails with `FeedErasureUnsupported` until its erasure-sequence annotation
exists; silently dropping it would violate the identity contract. Value-only excision must preserve identity metadata. Fractional
legacy record times retain explicit pending status; RT01 decided-stamp qualification remains open. The gateway operates on physical
transaction pages; it does not synthesize empty intermediate logical commits absent from DA01's annotations.

No P3 latency/256-reader result, O-DOMAIN fanout, real storage/Postgres qualification, production tenant/auth provisioning, G1 live run,
successful root pack consumer, independent verification or acceptance promotion is claimed. No merge, push, package publication, main-checkout
edit, shared engine change, unrelated cleanup, original-ZIP modification or subagent launch occurred.

## Round 2 — F1: long-poll results come from the log

**Result: F1 fixed in offline builder execution; fresh G0 PASS.** Review source:
`verify/DF01` at `d4f06d59e4b42d5201ff321b923ff98ee8c308d1`; builder base `bc8a5edb`.
North star: P3 correctness under the same SCOPE/NORTH-STAR/TARGETS. Independent review of this fix remains pending.

The reviewer was right: the original route performed only one read after a wake. A stale report could therefore end the
request empty before its wait budget, even though a newer transaction had become visible. Looping on the original captured
promise would introduce a second bug: that delivered promise would cause repeated immediate wakeups.

`poll-log` now keeps one monotonic `System/nanoTime` deadline for the request. Before **each** log read it captures the current
broadcast promise. A nonempty physical log page returns immediately; an empty read returns only after the deadline. Otherwise
it waits on that captured promise for the remaining budget and loops, including after timeout. Milliseconds round upward for
`deref`, preventing sub-millisecond polling near expiry. A report is exclusively a wakeup hint. The subscription remains held
through the loop and is released in the existing `finally` path. Projection, identity bytes, cursors, consumer storage and all
TypeScript interfaces are unchanged. The internal unit-test callback was adapted to the fresh-signal factory; assertions remain.

### Fresh gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Copied reviewer probe, **before** fix | Expected FAIL: original suite 7 tests / 32 assertions passed; copied probe 6 tests / 119 assertions, 1 failure | `round2/before.log`, `round2/attempt-before/`. Exact F1 reproduced: empty page in 0.532958 ms with a 2,000 ms budget and visible t=105. |
| Gateway regressions plus copied probe, **after** fix | **16 tests / 171 assertions, zero failures/errors** (10/52 original+new; 6/119 copied review) | `round2/after-01.log`, `round2/attempt-after-01/`. Stale-report case reads cuts 100, 100, 105 and delivers t=105 / nextT=106 in 0.564209 ms. These timings are diagnostics, not a live latency result. |
| Unchanged FD01 TypeScript conformance | **4/4, zero failed/pending** | `round2/focused-tests.json`, `round2/focused.log`; one worker, file parallelism disabled, matching the reviewer's successful invocation. Content/order/gaps/resume/duplicates, M-FEED-GAP, SQLite readback and client HTTP binding remain covered. |
| Full fresh G0 | **PASS: 1,279/1,279; 66 expected skips; zero unexpected skips** | `lab/runs/G0/G0-datomic-20261109T081416Z-e9ae93.json`, `round2/G0.log`. Previous receipt is the round-1 PASS; the note explicitly identifies the new source/fix. |

The reviewer probe was copied **byte-for-byte**, not edited to pass; its runner was adapted only for this directory layout and
fresh, exclusively created attempt directories. Each run logs the actual gateway/test/runner/codec/JAR/JVM input hashes before
and after execution, preserves the child exit code, and records fresh output hashes. The source was not committed during
these runs: their base is `bc8a5edb`, with the exact modified source bytes bound by the inputs and G0's source snapshot.

New gateway regressions exercise: a report before the transaction is readable, an older-t report with no data until the deadline,
and publication with **no report at all**. They assert actual t/nextT, pending/empty behavior, elapsed monotonic wait where relevant,
queue cleanup, and a bounded read count that catches reuse of an already-delivered promise. The copied probe supplies the exact
stale-report/captured-old-cut interleaving from F1. Its existing excision, restart, skip-page and stamp probes remain unchanged.

All heavy commands used `heavy.mjs`; host free disk was 11–12 GiB before admissions. G0 used the already-required host clock read
permission; no gate, test timeout, skip policy or assertion was weakened. Existing optional XTDB build artifacts were present.
No dependency, lockfile, package export or image/slot configuration changed. The review independently confirmed the earlier CLI
pack failure was missing setup; no new full root pack/consumer run or packed-consumer PASS is claimed in this round.

### Round-2 PASS / verdict / receipt audit

| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| New `feed_test.clj` assertions / test exit | Exact delivered t/nextT, deadline-only empty completion, no early completion, read-count bound and cleanup | New queues, promises, atoms and futures in each process | Actual gateway log route with explicit fake connection/cut; full source bytes in runner inputs; no real slot claim |
| Unchanged copied `offline_verify.clj` | Same independently authored expected tuples, serialized bytes and desired F1 assertion; before remains a failing result | Fresh baseline and probe executions in distinct attempts | Byte-identical to review `d4f06d59`; current production gateway and vendor namespaces |
| Adapted `round2/run-offline.mjs` | Preserves actual child status and output hashes; source/runtime hashes checked before/after | Refuses existing attempt directory; creates fresh outputs | Explicit offline kind, slot null, base head plus exact source/test/JAR/JVM bytes; no fabricated clean commit |
| Focused tests and unchanged G0 verdict | Existing content/mutation/replay/readback checks and unchanged complete gate count/skip/oracle checks | New test processes and gate ID; old F1 failure retained separately | Named tests and canonical G0 source/build/input/parent-grant bindings |
| Round-2 retention/index command and this report | Copied bytes checked against original/receipt hashes; counts taken from named terminal results | Only terminal outputs copied; before failure retained | Unique round/run paths, source before/after hashes, probe provenance and SHA256 index; retention adds no semantic PASS |

`round2/SOURCE-SHA256.tsv` lists both modified source paths with old/new SHA256 and acceptance-path mention counts. No directly
pinned acceptance path moved; **no `lab/acceptance/` file is edited**. Existing round-1 manifests and receipts remain historical
at `bc8a5edb`; appending this report changes its old manifest entry, so use the new `round2/SHA256SUMS` for the current report.
Durable fresh G0 raw output and preimages are under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/round2/`.

No Docker command or engine lifecycle action occurred. Real peer notifications, actual excision/restart, live HTTP-to-peer replay,
P3 performance, RT01/ER01-D qualification and independent acceptance remain open. No merge, push or subagent launch occurred.

## Round 3 — F1: a fresh final cut after expiry

**Result: offline deadline regressions, unchanged conformance and fresh full G0 PASS.** Review:
`verify/DF01` at `bedf748341be24299bbe03c690d91aa8889b5ba8`; builder base `0f6c28c0`.
North star: P3 response completeness under SCOPE/NORTH-STAR/TARGETS. Independent review of this fix remains pending.

The reviewer identified a remaining race: an empty immutable cut captured before expiry could return after expiry. The old
loop then returned that stale empty page, even when a transaction had published before the deadline. For a positive wait,
the expired/empty branch now performs **one bounded final read**. Because that read begins after the monotonic expiry check,
its `d/db` value is captured at or after expiry. Its rows are returned, including when empty. There is no repeated final-read
loop or additional wait. `waitMs=0` retains its single read, with no subscription or wait.

The loop body is in a private clock-taking helper. The unchanged five-argument `poll-log` entry point always supplies real
`System/nanoTime`. The private clock seam lets unit tests publish at an exact synthetic deadline; it is not exposed in the
HTTP or TypeScript API. A version using public self-dispatch interfered with the reviewer's five-argument wrapper, so it was
replaced with this private helper. Neither copied reviewer probe was modified. Projection, cursors, TypeScript interfaces,
queue drainer and consumer storage remain unchanged.

### Attempts and gates

| Attempt | Actual result / limitation |
| --- | --- |
| `round3/attempt-before`, `before.log` | Old source, 17 tests / 177 assertions; 3 failures. The real-time publication missed its window (0.075959–0.128542 ms **after** expiry). Retained; not adopted as a qualifying predeadline counterexample. |
| `round3/attempt-before-02`, `before-02.log` | Unchanged retry justified by that timing miss. Publication 0.986584–1.018917 ms **before** expiry; valid window, cuts `[100,100]`, empty result/nextT=105. Two content/checkpoint failures, zero errors. |
| `round3/attempt-after-01`, `after-01.log` | Test source-load failure: missing closing delimiter. No semantic result adopted. |
| `round3/attempt-after-02`, `after-02.log` | 19 tests / 204 assertions, 1 failure / 1 error from the clock adapter's self-dispatch colliding with the copied probe wrapper. Retained; not treated as a PASS. |
| `round3/attempt-after-03`, `after-03.log` | **19 tests / 208 assertions, zero failures/errors.** Valid real-clock window 0.986583–1.049833 ms before expiry; cuts `[100,100,105]`, delivered t=105 / nextT=106. Includes the unchanged original and deadline-cut reviewer probes. |
| `round3/focused-tests.json`, `focused.log` | **4/4 TypeScript conformance tests**, zero failed/pending. Existing FD01 content/order/gap/resume/duplicates and M-FEED-GAP, SQLite readback/replay and HTTP binding checks remain unchanged. |
| `G0-datomic-20261109T085657Z-6815e5` | **FAIL: 1,278/1,279**, one existing testkit 5,000 ms timeout; 66 expected skips. No DF01 assertion failed. |
| `round3/timeout-repro.log` | Unchanged whole-file retry: 11 pass / 1 timeout. Failure retained. |
| `round3/timeout-case.log` | Same timed-out case targeted alone: 1 pass / 11 deliberately filtered skips, 3.53 seconds. This is a scoped diagnostic, not a full-suite PASS. |
| `G0-datomic-20261109T090324Z-69ac4b` | **PASS: 1,279/1,279, zero failures, 66 expected skips, zero unexpected skips.** Same source, assertions and timeouts; `previous` binds the failed full attempt. |

The G0 timeout was `round3: retired stores cannot omit policies/cuts or silently decline purge execution` in unchanged
`packages/testkit/test/route-equivalence-round3.test.ts`. Its underlying scheduling cause is unverified. Neither the failure,
the failed whole-file retry, nor the targeted run is substituted for the final complete gate. No timeout, skip policy, testkit
source or gate code changed to obtain the final result.

The new deterministic boundary test runs the actual private loop with a controlled monotonic clock. It captures an old empty
cut, publishes at deadline−1 ns or **exactly the deadline**, and lets that old cut return after expiry. It checks the final
post-expiry capture and returned entries. Empty variants prove that the final read is bounded to one. A route-level zero-wait
test checks both empty and populated results, exactly one `d/db` call, and queue APIs that throw if invoked. Exact synthetic
nanoseconds are distinguished from the copied probe's measured real-clock publication window; no physical zero-jitter claim
is made. The copied deadline probe still uses the real production clock, drainer, subscription and wait path.

### Round-3 PASS / verdict / receipt audit

| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| New `feed_test.clj` boundary/zero-wait assertions and test exit | Independent expected rows, capture times/counts, single final read, exact boundary, no wait/queue for zero wait | New clock/cut/read state for each case and fresh process | Actual loop/helper or route; explicitly synthetic exact clock versus default real route clock; current gateway/test hashes |
| Copied `deadline_cut_verify.clj` and `offline_verify.clj` | Unchanged expected row/checkpoint, timing-window, identity/stamp/excision/resume/skip checks; failure when timing window misses | Fresh JVM, queue, publication and cuts per exclusively named attempt | Byte-identical to review `bedf7483`; real clock for timing probe, fake database API, no slot claim |
| `round3/run-offline.mjs` and combined runner | Actual child exit, test counts and output hashes; before/after input hashes must match | Exclusive output directories; source-load/timing/adapter failures retained, no output adoption | Base head plus actual gateway/probe/runner/codec/JAR/JVM SHA256; slot null; disk checked inside admission |
| Unchanged conformance and G0 verdict | Existing semantic/mutation/readback checks and full gate count/skip/oracle checks | Fresh focused process and full gate IDs; failed/filtered attempts remain separate | Named tests, exact source/build/input snapshot and parent heavy grant; G0 source was dirty at base `0f6c28c0`, not falsely labeled a clean commit |
| Retention/index script and report | Copy hashes match originals and canonical object digests; counts/windows come from terminal outputs | Copies terminal named attempts; preserves both G0 results and all earlier attempts | Separate round/run paths, exact copied-probe provenance, source old/new SHA256 and checksum index; retention generates no semantic PASS |

No dependency install or version, lockfile, package export, image or slot configuration changed. Every heavy command used
`heavy.mjs`; free host disk exceeded 5 GiB before admission (7.4–8.0 GiB observed). G0 used its existing host clock-read permission.
No `lab/acceptance/` file is edited. Neither modified source path is directly named in acceptance pins; both old/new SHA256
values are listed in `round3/SOURCE-SHA256.tsv` for the contract builder. The contract remains unchanged.

`round3/SHA256SUMS` covers this appended report and the new small artifacts; prior round manifests/report hashes remain
historical at their respective commits. Fresh G0 raw output and verified preimages for both attempts are retained under
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/round3/`. No bulky evidence is committed.

No engine was started or used, and no Docker command, merge, push or subagent launch occurred. Real Datomic notifications,
actual peer restart/excision, live HTTP-to-peer replay, P3 load/latency and independent acceptance remain unverified. The
existing live runbook remains the handoff for an orchestrator-authorized window; no new packed-consumer qualification is claimed.


## Live window — 2026-11-09, attempt 001 (DIAGNOSTIC)

**DIAGNOSTIC-FAIL; stopped at the first live gate failure, without retry.** The real Datomic dev resident started successfully,
but the conformance fixture's first write was rejected before any feed poll or FD01 assertion ran. This attempt provides no
live feed acceptance and does not revise the independent ACCEPT-OFFLINE verdict at `verify/DF01 c98bbff8`.

The attempted driver `live/conformance.mjs` supplies `schema_version: null`. In the deployed `storage.clj` fact-map,
`:f/schema-version (long (:schema_version row))` unconditionally converts that field. The gateway returned HTTP 400,
`TransactionRejected`, `Cannot invoke "java.lang.Number.doubleValue()" because "x" is null`. This is a driver fixture defect,
not an established defect in the feed. I authored that invalid fixture. Its exact bytes and error remain retained; I did not
correct it and rerun during this stop-on-first-failure window. A future authorized attempt must supply the adapter's actual
numeric schema version, preserve this attempt, and use a new exclusive evidence directory. The failed scratch database is
named in `live/attempt-001/conformance-state.json` and remains on the retained volume for diagnosis.

### Execution and cleanup (all DIAGNOSTIC)

- Checked the required scope/protocol documents and independent offline review. Main and worktree Datomic lane/slot configs
  matched before the build. The pool had only XTDB/QLever dev reservations (6.50 GiB of 11 GiB); no exclusive slot was held.
- Initial host free: 11,902,570,496 bytes, 6,533,861,376 bytes above the 5 GiB floor. The distribution was about 299 MiB;
  budgeted at most 5 GiB additional use for context, image and live writes. Lowest observed free was about 9.8 GiB.
- `TX2_CONFIG_DIR="$PWD" node lab/bin/heavy.mjs --label CX-DF01-live-build -- node lab/bin/engine.mjs build --lane datomic`
  exited 0. Image size 371,269,804 bytes. Verified vendor inputs/source manifests and image receipt retained.
- `TX2_CONFIG_DIR="$PWD" node lab/bin/engine.mjs up --lane datomic --slot dev --holder CX-DF01-live --exp EXP-DF01`
  exited 0. Used the retained `tx2-datomic-dev-data`, with the existing 2.75 GiB / 2 CPU cap. Container
  `153875a537aa083d4b6f2ac3cd45a18be5cabb6999a270b4f9dffb85308cc605`; HTTP health returned Datomic 1.0.7745.
- `node lab/bin/heavy.mjs --label CX-DF01-live-conformance -- node lab/experiments/EXP-DF01/live/conformance.mjs lab/experiments/EXP-DF01/live/attempt-001`
  exited **1**. The driver intended to call unchanged FD01 `auditFeed`, `auditResume`, `requireGapMutationCaught` and the host
  SQLite consumer against the real HTTP route. None of those audits was reached. Scope creation succeeded; the first fixture
  transaction failed. No additional peer JVM was started.
- Stopped the gate sequence immediately. **Not run:** resume across excision; fresh peer/process replay without a report queue;
  non-Triplex skipped transaction; stale/early/missing reports and deadline cases on the real report queue; existing live
  adapter regressions/G1. No live retry, semantic repair, load benchmark or production qualification occurred.
- `engine.mjs down --lane datomic --slot dev --holder CX-DF01-live` exited 0, retaining the volume and releasing its lock and
  reservation. `colima ssh -p triplex2 -- sudo fstrim -av` exited 0 (data disk trimmed 2,575,646,720 bytes).
  `docker context use colima` exited 0. The private DOCKER_HOST remained set during our Docker work; the requested context
  selection does not unset that environment override. No default VM lifecycle action was performed.
- Final engine status: Datomic absent, volume retained at about 1.42 GiB; XTDB/QLever dev healthy; pool back to 6.50 GiB.
  Final host free: 11,577,552,896 bytes. No resident was stopped or recreated except our authorized Datomic slot.

### Source/image pins and evidence

The base was `4c72ed2724b42c651c45b6b87ddc43a6d5a2d627`. No production source, dependency, lockfile or export changed.
Only this worktree's Datomic image/build/source keys in `lab/config/slots.json` were updated by the engine build:

| Key | Old | New |
| --- | --- | --- |
| imageId | `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf` | `sha256:aecbac4c6712d70d17dfba7b50cabaaf727aef6b3e72ec1fe2000b5523b36bcf` |
| buildInputsSha256 | `ff1b91d51131c8860e732fb23cea7acdd24f5356b03c31dab105b4730bedaf34` | `3a010a2b0281d844e03869ca6300b6c459b498ec07d49c691fede848c4f2081f` |
| sourceInputsSha256 | `41e6e2521b666b94e19492637f2a84428c43cc2eef200294cd772ab3688ed163` | `e61673df76586d71b99898e03ffcb7d2160c97bc359a60b2cc2c0c3f5fc9b60e` |

The full `slots.json` SHA256 changed from `3cd5463b6fda8af3653057e74ae287a34f1ad1478fa173e98f5ceaefc8e5c225`
to `56e3b2ed1578d11e18b35b9108b20bcdfa828752b24600beb9a04f13b2b7b60e` (`live/SOURCE-SHA256.tsv`). Q64e's
slots file is read but not directly hash-pinned; its Datomic **image identity** is contract-pinned and the unchanged contract
still names the old image. Contract-builder review/re-pin is required before this candidate image could be used as a contract
image. **No `lab/acceptance/` file was edited.** The gateway source hash returned by health and configured on the exact
container was `60f7138040043a1cffb2ee79764775560a71bf4f49fccdb82469d1df99f9ca16`.

Small raw outputs, container inspections, resource observations and driver preimage are in `live/attempt-001/` and
`live/conformance.mjs`. `live/summary.json` records observed command exits and unrun gates. `live/index-evidence.py`, run
through `heavy.mjs`, checks image/source/container/volume/holder binding and retains the build receipt and post-attempt public
package build bytes under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/live-attempt-001/`.
`live/DURABLE-SHA256SUMS` indexes those durable files; `live/SHA256SUMS` indexes the small repository evidence and this report.
The built-package copies are post-attempt retention, not proof that all loaded build bytes were stable before/after execution.
No generated build artifact is committed. The original verified build context remains at the receipt path recorded in build.log.

### Live PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content | Freshness | Binding and limits |
| --- | --- | --- | --- |
| Engine build/up readiness (unchanged infrastructure) | Verified vendor/source bytes, source-bound image ID, actual HTTP 200 readiness; this establishes readiness only | Fresh build receipt/container start; source rechecked by builder | Exact image/config and own holder/retained volume in inspections; no semantic feed PASS inferred |
| `live/conformance.mjs` assertions, hypothetical success branch and actual failure branch | Independently authored identities and write-receipt physical coordinates; unchanged FD01/SQLite content checks would gate success. Actual error interrupted before them | Refuses existing state artifact; unique scratch scope; writes failure state from this process | Fixed private dev endpoint, actual created database and source cursor; external inspections bind image/slot. No success issued; built-asset before/after stability was not checked, so this driver alone is not an acceptance executor |
| `live/index-evidence.py` and `summary.json` | Requires exact failure status/error and gateway rejection; verifies copied hashes and image/container/env/volume/holder/source manifest equality; generates no semantic PASS | Refuses existing durable destination; exclusively named attempt; preserves raw first failure | Base Git head plus current image pins, exact container and source hash; command exit codes are tool-observed, explicitly recorded as such |
| Cleanup result and this report's DIAGNOSTIC-FAIL | Down output confirms volume retention/release; final status confirms other residents healthy; failure is not relabeled as successful feed behavior | Fresh down/trim/context/status/disk outputs after the failure | Own holder/dev slot/private VM and exact preserved volume; no production, G0 or live conformance success asserted |

Historical G0 and offline conformance receipts above remain historical. They were not rerun after this first-failure live stop.
The open work is a new authorized live attempt with a corrected fixture, followed by every unrun gate. No merge, push,
acceptance promotion, subagent launch or deletion of failed scratch state occurred.


## Live attempt 002 — 2026-11-09 (DIAGNOSTIC)

**DIAGNOSTIC-PASS for the asserted live cases; no semantic gate failed and no test was retried.** Attempt 001 remains retained
at `1b110023` with its original failed scratch database on the retained volume. This section does not replace that receipt.
North star: P3 ordered, resumable feed correctness, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.
Datomic dev storage remains development-only (Q88a); none of these observations grants production or contract acceptance.

### Fixture correction and offline regression

`live/fixture.mjs` now owns the raw assertion fixture shared by the live driver and offline test. It supplies
`schema_version: 1`, matching `DatomicStorageAdapter.ts:297`. `live/conformance.mjs` imports this row and now saves the first
write receipt before issuing the second write, so a subsequent failure cannot conceal which write succeeded.

`live/check-fixture.mjs` serializes that exact shared row through the public built `DatomicClient.transact` implementation,
capturing its wire request without opening a socket. A fresh local JVM loads the actual gateway `storage/decode-row` and
`storage/fact-map`, including the same `(long (:schema_version row))` conversion used by the live Peer. The positive case
checks the exact Long schema version, assertion identity and value. Negative mutations supply null and omit the field;
both must throw at that actual conversion. **1 test / 6 assertions, zero failures/errors**, exit 0, no engine used.
Inputs (gateway, client build, fixture, test, codec, jars and JVM) are hashed and rechecked by the runner.

The earlier offline feed suite missed this because it consumed recorded/projected transaction pages and replaced database
APIs; it did not submit the new live driver's raw row through the gateway write path. The general TripleRow permits a null
schema version and the client encodes null; the Datomic adapter supplies a numeric version, but my hand-written attempt-001
fixture did not. The earlier native Clojure live helper also bypassed `storage/fact-map`. This regression closes that fixture
coverage hole without changing any production schema, API, gateway or adapter behavior.

Command (already retained output; use a new directory for a future execution):

```sh
node lab/bin/heavy.mjs --label CX-DF01-fixture-offline -- node lab/experiments/EXP-DF01/live/check-fixture.mjs lab/experiments/EXP-DF01/live/attempt-002/offline
```

### Live execution and observed results — all DIAGNOSTIC

The base was `1b110023f1a647381e0a288bd3652a263b54b407`. Before up, only XTDB/QLever dev reservations existed (6.50 GiB of
11 GiB); the host had **10,333,782,016 bytes free**. No rebuild was needed: all deployed gateway bytes and the image/source
pins were unchanged from attempt 001. An additional 1 GiB was budgeted for this attempt's own writes; host free was monitored
while other agents also ran. Lowest observed host free was about **7.5 GiB**, above the 5 GiB floor throughout our admissions.

Started through `TX2_CONFIG_DIR="$PWD" node lab/bin/engine.mjs up --lane datomic --slot dev --holder CX-DF01-live-002 --exp EXP-DF01`.
Container `820da568d13a2c5ba44a25bb0f2bc9d14ea59070e503177af69d977093ff061f` used retained `tx2-datomic-dev-data`, the existing
2.75 GiB / 2 CPU cap and image `sha256:aecbac4c6712d70d17dfba7b50cabaaf727aef6b3e72ec1fe2000b5523b36bcf`. HTTP health and
container environment agreed on gateway source `60f7138040043a1cffb2ee79764775560a71bf4f49fccdb82469d1df99f9ca16`.
Before the extra Peer, observed resident use was **667.7 MiB**; each extra Peer used `-Xms64m -Xmx256m`, sequentially, inside the
existing admitted cap. No transactor/gateway heap or CPU limit was increased.

| Stage | Observation and result |
| --- | --- |
| FD01 conformance, actual HTTP client and Peer | Correct assertion t=1004 / position 1 and retraction t=1009 / position 2; exact identities, stamps, commands and valid-time interval; paging checkpoints 1005 and 1010. Unchanged `auditFeed` reports 2 positions / 2 resolutions; unchanged gap mutation, resume, empty tail and SQLite close/reopen/idempotent effects checks all pass. Scratch scope deleted. |
| Value excision | Existing `feed-live prepare /data/df01-attempt-002.edn` succeeds: request indexing, await sync-excise, verify value absent from history, preserve the independently authored identity row, list the excision transaction as skipped. Raw pre-excision expectation is in the unchanged helper; post-excision page is retained. |
| Actual queued report before Peer restart | `live/queue_restart_prepare.clj` opens a real `d/tx-report-queue`, submits an unannotated transaction t=1010, receives and puts back a genuine report, records queue size 1, verifies t=1010 is skipped and the excised identity remains unchanged. Saves the complete page/checkpoint. |
| Peer restart and log-only resume | Deliberately terminate only the identified diagnostic 256 MiB Peer JVM (container PID 456, exact argv checked), leaving gateway/transactor up. Its command exits **143**, the intentional fault action. A new OS/JVM invocation of `feed-live resume` has no old queue, syncs, matches the complete saved page exactly, saves resumed EDN and deletes only that scratch database. Exit 0. |
| Stale report with visible newer log entry | Real queue opened before two native transactions; polling from t=1005 returns the newer skipped t=1005 / nextT=1006, despite older t=1004 report traffic. |
| Older report with no new entry | Empty page / unchanged nextT after **104.782493 ms** for waitMs=100; no early empty caused by report traffic. |
| Report precedes readable cut | Actual immutable Peer cuts deliberately held at bases **[1006,1006,1007]** while the real transaction/report publishes; route returns t=1007 / nextT=1008. Neither tx-range nor report maps are faked. |
| New transaction without a report | Detach the actual queue after the initial cut, then publish. Route rereads the real log after **257.152034 ms**, waitMs=250, returning t=1008 / nextT=1009. |
| Boundary cut, publication deadline−1 ns | Controlled clock with real Peer transaction, actual tx-range and a report checked against the write's exact t. Old capture at logical 0 / basis 1008; final capture at logical 5,000,000 / basis 1009; returns t=1009. |
| Publication exactly at deadline | Same explicit logical-clock seam: publication at 5,000,000 ns; old capture basis 1009 and final capture at 5,000,000 / basis 1010; returns t=1010. Exactly two reads. |
| Existing live package regressions | `DATOMIC_INTEGRATION=1`, private gateway, `pnpm ... --filter @triplex-build/triplex-datomic test --bail=1`: **117 tests / 6 files passed**, actual exit 0. |
| G1 | `G1-datomic-20261109T095731Z-d254a0`: terminal gate reports **88/88 executions**, 44 current + 44 reopen, zero failures/skips; one live route-equivalence fixture also passes with its oracle bytes retained. Actual exit 0. Diagnostic only. |

The queue-preparation script prints and persists its checked observations, but does not force JVM exit; Datomic threads kept
that Peer alive. The explicit verified SIGTERM is the actual Peer-loss injection, not a hidden failed test or retry. The
process snapshot, queued page, kill-command output and exit 143 are retained separately from the successful new-JVM resume.

The regression wrapper waited several minutes for a heavy slot. I attempted to cancel the still-unadmitted wrapper to switch
from 1,000 ms to supported 100 ms admission polling. Admission raced with that signal: Vitest had just started. I did **not**
requeue or retry it; its process tree continued and all 117 tests completed with exit 0. This operator signal event is retained
in `attempt-002/outcomes.json`, with the full queue wait/test log. It is disclosed rather than described as an uninterrupted
execution. The subsequent G1 used 100 ms admission polling and ran once.

The six polling cases are in `live/deadlines.clj`, executed once via `docker exec -i ... bin/run -i /dev/stdin` under heavy.mjs.
They use actual Peer databases, tx-range, projections and report queues. Holding old immutable database values and detaching
one queue are explicit test interventions. The first stale/early-report cases do not timestamp the drainer's receipt; their
exact report-arrival interleaving is not independently proven. The logical deadline cases verify queue report t against the
write t. **Exact nanoseconds are synthetic clock boundaries**, not physical publication-time measurements. A wall-clock
publication precisely 1 ms before expiry, production load/lag and a gateway/transactor container restart were not tested.
The restarted process was the separately bounded Datomic Peer JVM specified by the runbook.

### Cleanup, retention and pins

`engine.mjs down --lane datomic --slot dev --holder CX-DF01-live-002` exited 0; the slot lock/reservation was released and the
volume retained (about 1.52 GiB). `colima ssh -p triplex2 -- sudo fstrim -av` exited 0, trimming 1,103,949,824 bytes on the data
disk. `docker context use colima` exited 0. Final status confirms Datomic absent, XTDB/QLever dev healthy, pool back to 6.50 GiB;
final host free **9,257,607,168 bytes**. Docker operations used only the private triplex2 endpoint. No default VM was started,
stopped or otherwise operated. The environment's private DOCKER_HOST still overrides the selected Docker context.

Small evidence: `live/attempt-002/`, including input hashes, offline test log, actual wire fixture, raw pages/EDN, container
inspections, command logs, outcomes and summary. The standalone canonical G1 receipt is
`lab/runs/G1/G1-datomic-20261109T095731Z-d254a0.json`.

Durable bulky evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/live-attempt-002/`:
public package builds, exact executed driver/probe preimages, G1 raw/oracle output and verified content-addressed receipt
objects, plus this regression run's generated `seed-29-c22567a4-3ea1-4dad-b7e1-320d0c86e2a2` oracle directory. That untracked
raw directory exceeded 5 MB; it was copied and hash-verified before removing only its generated worktree copy. No bulky raw
file/directory is committed. `attempt-002/DURABLE-SHA256SUMS` indexes durable bytes. `attempt-002/SHA256SUMS` covers this report
and the new small artifacts. Older manifests remain historical at their original commits.

No `lab/acceptance/` file, production source, package export, dependency, lockfile, image or slot configuration was changed in
attempt 002. No pinned path's hash moved. The candidate image's mismatch with the unchanged contract image pin, already
listed under attempt 001, remains for the contract builder; a diagnostic G1 PASS does not re-pin it. G0 was not rerun because
this changes only the lab fixture/driver/test/evidence; the earlier G0 remains historical. No production acceptance is claimed.

### Attempt-002 PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content check | Freshness check | Binding and limits |
| --- | --- | --- | --- |
| `fixture_test.clj` and `check-fixture.mjs` | Actual client serialization and gateway decode/fact-map; exact schema Long/value/id; null and missing mutations throw at the real schema conversion; nonzero test failures propagate | Exclusive offline output directory, new JVM and wire file; source/runtime hashes compared before/after | Shared fixture imported by both live and offline driver, actual gateway/client/codec/JAR/JVM hashes, slot explicitly null |
| `conformance.mjs`, FD01 auditors and SQLite assertions | Independent expected content from fixed semantic fixture plus physical write receipts; gap mutation and resume checks; exact consumer checkpoint/effects readback after reopen/replay; delete response true | Unique scope and refused existing state artifact; fresh writes, database and SQLite consumer; first receipt persisted immediately | Actual database/source cursor/private HTTP endpoint; preflight image/env/health/holder/volume checks and before/after gateway/client/fixture hashes; DIAGNOSTIC-PASS only |
| Unchanged `feed-live prepare` / `resume` helper | Independent complete identity expectation; actual sync-excise/value-history absence; exact page equality after excision and in new Peer; actual successful deletion | New scratch scope, fresh helper JVMs and exclusive EDN name 002; attempt 001 untouched | Image-bound helper/source env, exact db/fromT/page/excisionT and saved source hash; queue-loss injection is a separately recorded process |
| `queue_restart_prepare.clj` assertions/record | Genuine report observed and retained, size positive; exact skipped write t and original identity checked, complete resume page persisted | New Peer/queue and new transaction on the attempt-002 scratch database | Saved db/checkpoint/source hash from prepare, identified JVM termination and fresh-JVM resume; raw stdin source retained post-execution, not falsely claimed in the initial preflight |
| `deadlines.clj` check!/record! and exit | Exact row/nextT checks, elapsed budgets, cut counts/bases and final logical capture; queue report t checked in boundary cases; no subscription leak, delete true; catch exits 1 before later cases | New scratch DB, fresh tx/queue/cut state per case; results persisted after each passed case | Actual gateway functions/real Peer and log; source-bound image, explicit controlled clock/readability/detachment interventions; post-execution probe preimage retention and interleaving limits disclosed above |
| Existing package regressions / G1 (unchanged) | Full test assertions and 117-pass terminal count; G1 88 cases with semantic/oracle comparisons and complete route-equivalence witness checks | New execution and G1 run ID; bail on first regression failure, no test retries; signal race disclosed | Private endpoint/own slot, before/after build hashes and actual container/image/owner identity in G1 receipt; diagnostics only on dev storage |
| `index-attempt-002.py`, summary and checksum manifests | Rechecks actual failed/passed branch content, 2/2 conformance counts, 1/6 offline count, complete stage records, G1 88/88 + route fixture, exact receipt object digests and copied bytes | Refuses existing durable destination; exclusively named attempt; verifies attempt-001 raw evidence unchanged | Initial input hashes must still match; exact container/image/env/holder/volume and G1 endpoint/identity; later stdin probe preimages explicitly distinguished from the initial manifest; no acceptance promotion |
| Cleanup/report result | Actual down/release/retention output, final healthy resident status, trim/context exits and disk values; no semantic failure hidden | Fresh terminal cleanup/status after all gates | Own Datomic dev holder/private VM/retained volume; no other resident lifecycle action; this report scopes every successful result to DIAGNOSTIC |

No merge, push, deployment, package publication, acceptance edit, subagent or test retry occurred. Remaining work is independent
review of these diagnostic receipts, any specifically measured physical deadline interleaving needed beyond the disclosed
logical-clock cases, and qualification on a production-capable storage profile before making production claims.

## Round 4 — R47-c: Datomic feed changes are application changes

**Result: journal facts no longer appear as feed changes; real-peer and fake-peer regressions, FD01 conformance and fresh full G0 PASS.**
Builder base `dcc8322d`; code commit `1959eed4`. North star: P3 on lane D (an ordered, resumable feed of application changes).
Source: R47 sections 3 and 10, pending ruling Q107c (a Datomic feed change is an application change; journal facts are excluded as on
the broker and P2X). Offline only; the Datomic dev slot stayed parked and no Docker or engine command ran.

### The defect, reproduced
`project` in `feed.clj` turned every `:f/asserted-in` and `:f/retracted-in` datom of a Triplex transaction into a change. A core
transaction also writes its journal as ordinary facts (entity `_tx/...`, type `_Transaction`: `:_tx/position`, `:_tx/command-id`,
`:_tx/changed-entity`, `:_tx/change`), so each transaction's feed entry listed them. With the old source the new real-peer test fails
as predicted: the first commit lists four journal facts (`:_tx/position`, `:_tx/changed-entity`, `:_tx/change`, `:_tx/command-id` on
`_tx/t1`) before the application changes (`round4/before.log`, 11 failures across the three new tests).

### The fix and how journal facts are decided
A fact is a journal fact exactly when **its stored entity type is `_Transaction` and its subject is the fact's own transaction id**.
This is the same predicate as `isJournalRow` in the broker feed (`qlever/src/broker/feed.ts:81`) and in P2X (`XtdbStorageAdapter.ts:149`),
so the three feeds agree.

- **Type comes from the schema.** `:f/entity-type` is a schema attribute (`schema.clj`) that `storage.clj` writes from the row's
  `entity_type`; `storage/raw-row` returns it again as `entity_type`. Core reserves the type (`isReservedEntityType`), so a user write
  cannot carry it.
- **No string prefix is tested.** Neither the subject id nor the attribute key is inspected for `_tx`, so a user attribute such as
  `_txNote`, a user attribute spelled `:_tx/change` on an `Order`, and a user entity `_tx/custom` of type `Label` are still changes.
- **Own tx id** is rebuilt as `raw-row` does: `:f/tx-id` if stored, else the asserting transaction's annotation id (`:f/asserted-in`
  then `:triplex.tx/id`), nothing when `:f/null-tx-id` is set.
- **Position, ids and stamp are computed from all facts of the member, journal included**, and only `changes` is filtered. The broker takes
  `txIds` from any own-position row and `positions` from the member, so a journal fact that carries its own earlier position (a member
  group) still contributes that position, and a retract-only or journal-only commit keeps its position and id. The stamp is still the
  annotation `:triplex.tx/recorded-at` (never `:db/txInstant`, Q90c). Non-Triplex transactions are still listed `skipped`.
- Rejected: a `_tx/` or `:_tx/` prefix test (a user attribute can share it); dropping journal datoms before computing positions and
  ids (loses the position of a member whose only trace is a journal row).

`fact-change` now takes the entity (not `db`/`eid`); it had no other caller. No TypeScript interface, cursor or the recorded page
changed: the regenerated `recorded-page.json` is byte-identical (sha256 `94a90f55…b8aa`).

### Regressions (`feed_test.clj`, 3 new tests, 28 new assertions)
| Test | What it proves |
| --- | --- |
| `journal-predicate` | pure cases: type and id match; explicit row tx id wins; user entity `_tx/...` with a non-journal type, a user attribute `_txNote`, a subject that differs from the tx id, `:f/null-tx-id`, and a missing type are all not journal facts |
| `journal-facts-are-not-changes-fake-peer` | fake peer: only application changes (including `_txNote`); a journal fact's own position still appears in `positions`; a journal-only commit has `changes: []` with positions kept; a retract-only commit keeps position `8` and its tx id; non-Triplex still `skipped` |
| `journal-facts-are-not-changes-real-peer` | **real Datomic peer on `datomic:mem://`** through `storage/commit!` and `feed/log-page`: (1) a Triplex transaction with four application facts (`status`, `_txNote`, `_tx/custom label`, a user `:_tx/change` on an `Order`) and four journal facts and a claim: the entry has exactly the four application changes, `commandIds ["cmd-1"]`, stamp `1000`; (2) a retract-only commit: one retract, position `2`, id `_tx/t2`, stamp `2000`; (3) a journal-only commit: no changes, position `3`; (4) a member whose journal rows carry position `4` inside the commit at `5`: positions `["4","5"]`, one change; the scope and schema transactions stay `skipped`; a second read is identical |

### Gates (all fresh, this attempt)
| Gate | Result | Evidence |
| --- | --- | --- |
| Gateway suite, old source with a no-op shim | **FAIL as expected**: 15 tests / 111 assertions, 11 failures, 0 errors | `round4/before.log` |
| Gateway suite, new source | **15 tests / 111 assertions, 0 failures, 0 errors** (was 12 / 83) | `round4/after.log` |
| Round 2 and 3 reviewer probes, unchanged and run against the new source | 22 tests / 236 assertions, 0 failures, 0 errors | `round4/probes.log` (output in scratch) |
| FD01 conformance on the Datomic adapter: `host/test/feed/datomic.test.ts` and `feed.test.ts` | **16/16 passed, 0 failed, 0 pending**; one worker, file parallelism off. The Datomic adapter test runs the unchanged audit, resume, gap-mutation (`M-FEED-GAP`) and SQLite replay checks against the recorded page | `round4/focused-tests.json`, `focused.log` |
| G0 `G0-datomic-20261109T115608Z-47785a` | **PASS: 1,279/1,279, 0 failures, 66 expected skips, 0 unexpected skips**; `previous` = `G0-datomic-20261109T090324Z-69ac4b`; receipt head `1959eed4`, source diff 0 bytes (only untracked `round4/` dirty) | `lab/runs/G0/G0-datomic-20261109T115608Z-47785a.json`, `round4/G0-r4.log`, durable raw copy |

G0 ran through `heavy.mjs` (it queued behind four other holders for about 1 h; host free disk was 7.3 GiB). The Clojure and TypeScript
runs are light and ran directly, as in rounds 2 and 3. No timeout, skip policy or assertion was changed.

### Round-4 PASS / verdict / receipt audit (rule 9a)
| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| New `feed_test.clj` assertions and exit status | expected tuples are written by hand from the input rows (positions, ids, stamp, attribute and assertion ids), not read from the feed | new `datomic:mem://` database, scope name and process each run; `before.log` shows the same assertions failing on the old source | actual `storage/commit!` and `feed/log-page` on the real peer, current gateway sources; `run-clojure.mjs` hashes sources, vendor JARs and JVM before and after |
| `before.log` / `after.log` | counts and failing assertions come from the child process output | separate processes; the old-source run used `git show HEAD:` bytes plus a one-line `journal-fact?` shim that was never committed | the shim run is a negative control only and is not a PASS |
| Round 2 and 3 probes (`round3/run-offline.mjs`) | unchanged reviewer expectations on identity, stamp, excision, resume, skipped and deadline cuts | fresh JVM, fresh output directory | probe files untouched; runner hashes the current gateway sources |
| Focused TypeScript conformance | existing FD01 audits, gap mutation, replay and readback against `recorded-page.json` | fresh vitest process; the page was regenerated by this round's Clojure run | page sha256 equals the committed one, so the test reads exactly what the new gateway projects for the unchanged fake pages. Journal exclusion is covered by the Clojure real-peer test, not by this fixture |
| G0 receipt | existing gate checks: complete executed set, zero unexpected skips, oracle content, build and input hashes | new run id, builds and tests executed in this attempt | source-tree identity in the receipt: head `1959eed4`, `diffBytes` 0 for the source scope |
| Retention | durable copy, `SHA256SUMS` and `round4/DURABLE-SHA256SUMS` | copies made after the run and hashed from the copies | receipt copy hash equals the repo receipt |

### Pins and limits
`round4/SOURCE-SHA256.tsv` lists both modified source paths with old and new sha256. Neither is named in `lab/acceptance`
(0 mentions) and **no `lab/acceptance/` file was edited**. Durable raw G0 output and logs: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DF01-R4/`
(`SHA256SUMS`). Nothing over 1 MB is committed.

Not verified: a live Datomic dev-storage peer (parked); real transactor-written journal data from a core build (the real-peer test
writes journal rows in the shape core's `metadataInputs` produces, through the gateway's own `commit!`, not through core); `:_tx/instant`
and change JSON v2 (RT01, Q90e); behavior for rows without `:f/entity-type` written before the attribute existed (such facts are
treated as application facts, as the broker treats a row without the type). The same-predicate claim for P2X and the broker comes from
reading their `isJournalRow` source, not from running them. Q107c remains a pending orchestrator ruling.
