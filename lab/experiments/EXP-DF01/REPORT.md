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
