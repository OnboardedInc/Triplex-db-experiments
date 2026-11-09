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
