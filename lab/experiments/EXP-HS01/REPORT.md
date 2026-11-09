# EXP-HS01: broker host store layout

> **Round 2 (CX-HS01, Claude Sonnet 5.5 builder) appended at the end of this file.** Round 1's text below is unchanged history. Round 2 measures G9 at **217.06 B per asserted fact, 0.970 GB at 10k: PASS** on the W0 profile (**308.09 B with production-shaped ULID ids: over the 300 B bar**), fixes the CX-VHS01 finding, retains frames by bytes and stores structured ids as integers.

**Implemented; G9 storage target failed. Not promoted.** The complete 10k W0 seed is content-verified with zero codec fallbacks, but uses **2,274,734,080 logical bytes (2.275 GB), 509.08 B per asserted fact**. The bars are 1.4 GB and 300 B. Independent review remains pending.

Builder CX-HS01; branch `exp/HS01-host-store-layout`; base `257d4d20`, contract 0.3.14. Frozen tested product commit: **`13ce4978`**. Subsequent report/index/pin-audit changes are evidence metadata only. Final source-frozen series: `final-67ab6c55-599b-4c53-917f-9d39f88b1035`. All 18 execution receipts in that series have `sourceStillMatches:true`; its route timeout and size failure remain failures in the original controller output. A separate unchanged-source route rerun passed.

North star: P5/P4 bytes and working set, preserving the P2/P1 recovery floor. Goals come only from [SCOPE](../../SCOPE.md), [NORTH-STAR](../../NORTH-STAR.md), and [TARGETS](../../TARGETS.md). Design and predictions: [R45](../../research/R45-host-store-layout.md), especially 5.2 and 5.4.

## Implementation

- Schema v2: `ents`, `attrs`, `strs`, `txs`, entity-clustered `facts`, `history`, `journal` and their id indexes. No `live_rows`, `recent_rows`, `retired_rows` or `retired_rpos`. Opening a v1 store refuses with `BrokerLogError` naming the legacy layout; no migration tool.
- Compact rows are decoded and compared on write using exact own-field presence and `Object.is`. Canonical Crockford ULIDs use 16-byte BLOBs; other ids remain TEXT. The full-JSON fallback envelope also preserves negative zero, non-finite scalars and own undefined fields. Lone-surrogate strings fall back before SQLite's UTF-8 conversion can change them. Values stay inline, apart from entity/ref identities and the permitted actor/type dictionaries.
- Position, instant and change journal derivations use one function and accept references only on byte equality with the supplied value. Retractions move the one stored row version to history. Horizon purge moves H and deletes no history. Nested claims bind their own transact ordinal, carrying the P5B R2 fix.
- Dictionary ids and codec work are prepared before `BEGIN IMMEDIATE`; dictionary inserts, rows, transactions, claims, operations, heads, frames and marker remain atomic. Writer dictionary caches publish only after commit.
- Retention uses persistent anchors, holders and epochs, with bounded prefix deletion (16 frames / 16 MB per call). The last frame and the ACKED sidecar's named frame remain protected. Default retention is `Infinity`. Replica holders conservatively retain zero until a durable replica base is qualified; detached startup releases that holder.
- Open verifies retained frames in bounded pages. Broker startup takes its head from the marker and recovery metadata from epochs/LSN headers. The existing `opened.frames` array is an explicit lazy diagnostic of the opening prefix. Public pull and marker result shapes remain unchanged; anchors use an internal operation. Feed cursors below the anchor raise `FeedRetentionExpired` with requested/retained positions.

Frame payloads, CRC chaining, positions, decision logic, adapter routing and the public schema/SDK boundary were not rewritten. No round 2 format option was implemented.

## Fresh gates

All results below bind the frozen product source. See [evidence-index.json](evidence-index.json) for exact commands, paths, hashes, source inventories and all retained attempts. Execution exit codes alone are not semantic acceptance.

| Gate                    | Result                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 build / checks       | Core, testkit, QLever and W0 builds/typechecks pass; package declarations built through package scripts. Changed-source lint, format and `git diff --check` pass.                                                                                                                                                                                                                               |
| G2 package / G0         | QLever package **257 pass / 29 expected skips**; G0 QLever **1,415 pass / 79 expected skips**; G0 XTDB **1,223 pass / 140 expected skips**. No unexpected skips.                                                                                                                                                                                                                                |
| G3 SQL01                | **11/11**, including checkpoint/reader barriers. Independent generated-event oracle: **77,616 reads / 38,808 pairs, zero mismatches**, 12 histories / 288 commits.                                                                                                                                                                                                                              |
| G4 P2Q                  | **873 passed**, same applicable offline exclusions as INT-Q; 22 named skips. Storage controls **5 passed**, 3 explicitly filtered obsolete infrastructure cases. Default infinite frame retention.                                                                                                                                                                                              |
| G5 route harness        | Final unchanged-source retry **93/93**. The original final-series attempt remains **92/93**, one existing 5-second timeout. Actual H1 driver passes in the QLever package/G0 suite.                                                                                                                                                                                                             |
| G6 layout equivalence   | **50,000** generated v1/v2 worker reads, zero mismatches. Real encoded/chained frame stream covers asserts, retractions, replacements, journal references, valid-time edges, nested ordinals and epochs; queries include pull cuts, recent selections, history, claims, operations, heads, markers and frame pages. Whole public snapshots are compared; only canonical ordering is normalized. |
| G7 codec property       | **100,000** rows persisted through SQLite, every own field exact; **15,508 fallbacks (15.508%)** on the deliberately pathological random sample. Includes all value kinds, noncanonical ids, negative zero, +/-2^53, large/small doubles, Unicode/lone surrogates, null/absent/undefined fields and journal values that do/do not derive. W0 fallbacks are zero.                                |
| G8 retention / recovery | Holders, tail, expiry, anchor reopen, typed cursor expiry, epochs and ACKED tests pass. **80 whole-process stops**, including actual in-transaction dictionary growth and purge barriers: **253 ACKed operations, zero loss; 297 feed positions, zero missing ACKed positions or duplicates**. Mid-WAL corruption refuses startup.                                                              |
| G9 bytes                | **FAIL**: complete 1k and 10k seeds/readbacks; 10k **509.08 B/assertion, 2.275 GB**. Content verified, build bytes stable; size bar not met.                                                                                                                                                                                                                                                    |
| G10 diagnostics         | SQL01 application schedule and first-touch/warm BFS measured; SQLite-cache pages observed separately on the actual readonly worker path. No timing acceptance claimed.                                                                                                                                                                                                                          |
| G11 pack / evaluator    | Lab pack gate passes: **12 current-inventory tarballs**, clean consumer, import/smoke/CLI checks. Evaluator **108/108**, zero failed/skipped/cancelled, on committed product tree `13ce4978`.                                                                                                                                                                                                   |
| G12 live                | **SKIPPED**: no orchestrator slot granted for the separate diagnostic five-test live suite. G3's existing unique-graph qlever-dev case ran as part of SQL01.                                                                                                                                                                                                                                    |

R45's counts came from the older INT-Q baseline. Current base 0.3.14 already adds value-limit coverage and three GS12F live skip names per lane; all original skip names remain. The expected-skip file was not edited. [skip-baseline-delta.json](/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/skip-baseline-delta.json) records the exact delta. The current lab pack inventory has 12 packages rather than INT-Q's historical 13. These expanded/current inventories are reported, not trimmed to historical totals.

## Predictions beside storage measurements

MB/GB are decimal; the admission floor is **5 GiB**. The denominator is **submitted user assertions**, excluding journal rows. Independent post-seed readback recomputed that denominator from the retained gzip intent log and matched the map, digests, SQL counts and journal counts.

| R45 5.4 layout             | Predicted B/assertion | Predicted 10k / 100k   | This round                                                      |
| -------------------------- | --------------------: | ---------------------- | --------------------------------------------------------------- |
| Historical v1              |                 5,656 | 25.3 / 252 GB          | R45 historical prefix measurement, not a fresh full 10k v1 seed |
| A: drop recent copy        |                 3,304 | 14.8 / 147 GB          | No isolated ablation                                            |
| A+B: purge to a 64 MB tail |                 2,380 | 10.6 / 106 GB          | No isolated ablation; G9 specifies 1,024 frames                 |
| A+B+C                      |             about 555 | 2.5 / 24.7 GB          | No isolated ablation                                            |
| **A+B+C+D**                |         **about 259** | **1.2 / 11.5 GB**      | **10k: 509.08 B/assertion, 2.275 GB**                           |
| Offline vacuum             |             about 232 | 1.04 / 10.3 GB         | Not run                                                         |
| Round 2 journal record     |               150-195 | 0.67-0.87 / 6.7-8.7 GB | Not implemented                                                 |
| R34 assumption             |                   100 | 0.45 / 4.45 GB         | Historical assumption only                                      |

| Fresh rung | Commands | Asserted facts | Retractions | Logical bytes | B/assertion | Codec fallback |
| ---------- | -------: | -------------: | ----------: | ------------: | ----------: | -------------: |
| 1k         |   42,775 |        442,410 |         214 |   548,450,304 |     1239.69 |              0 |
| 10k        |  434,768 |      4,468,284 |       1,954 | 2,274,734,080 |      509.08 |              0 |

Both seeds use the real core `Triples.transact`, product nested transaction groups of up to 64, full journal metadata, a detached replica and `tailFrames:1024`. P5B R2's command/operation/witness mechanism was vendored into the test tool; main's command plan is reused. Complete assertion columns, retirement tuples and real claims are read back before counting a command; maps require dense references and strictly increasing native positions. No handwritten database import or suppressed journal.

1k is smaller than the tail: it retains **670 frames**. 10k retains **1024 frames**, anchor **5771**, head LSN **6795**. At 10k, frames/index consume **625.992 MB / 140.10 B per fact**; excluding them still leaves **368.99 B per fact**. Thus neither the total nor the non-frame allocation meets 300 B on this required seed profile.

R45's prototype substituted 16-byte ids. The deterministic core generator uses base-36 ids (`RuntimeServices.ts`), which can contain characters outside canonical Crockford ULIDs. The final 10k store has **12,568,376 TEXT ids / 0 BLOB ids** across facts/history/journal, as required by the codec rule. The fixed 1,024-frame tail also differs from the 64 MB tail used in the forecast. These are measured/profile differences, not verbatim codec fallback. Storage-kind observations also retain numeric ref values' SQLite storage classes; no value-width optimization was slipped into this round.

10k dbstat, preserving full table/index cost:

| Component                               | R45 prototype B/fact     |  Measured MB | Measured B/fact |
| --------------------------------------- | ------------------------ | -----------: | --------------: |
| facts + id index                        | 79                       |      479.760 |          107.37 |
| history + id index                      | retractions only         |        0.229 |            0.05 |
| journal + id index                      | 132                      |      955.183 |          213.77 |
| entity dictionary + unique index        | 28.1                     |      125.493 |           28.09 |
| attribute/type/actor dictionaries       | about 3 margin           |        0.016 |            0.00 |
| transaction dictionary                  | 1.9                      |        8.675 |            1.94 |
| heads, claims, operations               | 17.5                     |       78.418 |           17.55 |
| retained frames + index                 | 64 MB tail in forecast   |      625.992 |          140.10 |
| marker, pins, retention, epochs, schema | small                    |        0.020 |            0.00 |
| freelist / unallocated pages            | not isolated             |        0.946 |            0.21 |
| **Total logical**                       | **259 overall forecast** | **2274.734** |      **509.08** |

The seed ran **1109.0 s**. Free space was **17.57 GiB** at seed start and **14.50 GiB** at completion. Preflight required the forecast 1.4 GB plus the floor; every group checked a further 64 MiB reserve before writing. No disk abort occurred. Full source/build hashes, dbstat, intent/map digests and independent readback are retained in the two seed directories.

## Recovery and timing diagnostics

After writing 1,090,528,400 frame bytes, the bounded-open test purged **1,082,139,720** and retained two frames / **8,388,680 bytes**. Reopen verified exactly those two; maximum verification page was **4,194,340 bytes**. Sampled process RSS peaked at **237,879,296 bytes**, growth **8,732,672 bytes**; the test asserts growth below 128 MiB. This is process RSS and logical frame bytes verified, not an isolated worker RSS or physical I/O counter.

The G10 baseline uses original v1 broker source copied from Git `257d4d20`, the same unchanged core and the same SQL01 schedule: 150 rounds, 32 cold-subject concurrent commits then 8 hot-subject commits, five facts per command; all 150 complete hot readbacks per arm pass. Every one of 6,000 commits per arm is counted, with no warmup removal. Sequential order is v1 then v2 on the shared host; these timings are **DIAGNOSTIC**.

| Commit latency |         v1 |        v2 | v2/v1 |
| -------------- | ---------: | --------: | ----: |
| p50            |  20.530 ms | 19.398 ms | 0.945 |
| p99            | 123.881 ms | 99.593 ms | 0.804 |

An earlier diagnostic on pre-final source measured ratios 1.60 / 1.28 and remains retained; no stable speedup or P2 acceptance claim is inferred from shared-host samples.

10k BFS, 300 placements / 133,294 rows / 1,549 round trips:

| Pass                            | Unmodified worker-pool BFS wall | Instrumented single-reader cache misses | SQLite-cache bytes per pull |
| ------------------------------- | ------------------------------: | --------------------------------------: | --------------------------: |
| First touch after seed/readback |                       1287.6 ms |                             3,289 pages |                     44905.8 |
| Immediate warm repeat           |                        679.7 ms |                                 0 pages |                         0.0 |

No macOS page-cache purge was performed. The readonly observer instruments the actual worker SQL/codec, with original/instrumented worker hashes, and obtains `SQLITE_DBSTATUS_CACHE_MISS * 4096` using a small observation-only extension built against the pinned driver's headers. It includes transaction-entry marker/dictionary/tx reads; it does not measure physical disk I/O. Its single-reader cache profile is separate from the unmodified four-reader pool timings. SQLite observed: **3.53.1**, better-sqlite3 **12.10.0**. Source/C/binary hashes and per-subject observations are retained; production code is unchanged by this observer.

## PASS / verdict / receipt audit

| New result-producing path              | Content check                                                                                                                | Freshness                                          | Binding / limits                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `row-codec.ts` compact acceptance      | All own scalar fields and presence match decoded row with `Object.is`; unsafe SQLite normalization forces full JSON fallback | This append's input before BEGIN                   | Exact dictionaries/tx metadata and row; inline values, no global value interning                                             |
| Journal reference acceptance           | Derived string must equal supplied journal value byte-for-byte; one derive function for encode/decode                        | Same member's fresh assertion/retirement rows      | Referenced id plus immutable assertion columns and journal's own tx; physical erasure needs a tombstone or rematerialization |
| `HostLog.open` recovery                | Actual retained CRC chain/LSN/offsets; marker end/epoch/CRC; ACKED checksum and actual named frame                           | Actual current open, paged retained bytes          | Persisted anchor, actual payloads, marker, sidecar; no physical power-loss qualification claimed                             |
| Retention deletion                     | Actual non-expired holder floor, tail, last frame and ACKED boundary                                                         | Current writer transaction                         | Deletion and anchor move atomic, bounded chunk; no adoption of a semantic PASS from cleanup                                  |
| HS01 G6/G7/G8 tests                    | Whole canonical results, own-field equality after SQLite, real frame pages, exact bytes/RSS bounds and typed errors          | New UUID stores and deterministic generated stream | Retained v1 reference; fixed-clock fixture for equal committed_at; exact worker/source bytes; zero mismatches asserted       |
| Crash harness                          | Parent-kept real ACKs versus recovered claims/receipts/full row ids and resumable feed; actual worker barriers               | New 80-stop run and final verify process           | Original/instrumented worker hashes, actual dictionary/purge transaction boundaries; zero ACKed loss asserted                |
| Seed `SEEDED-CONTENT-VERIFIED`         | Full assertion columns, retirement tuple, claims, reference coverage and native ordering                                     | Fresh directory/scope, newly submitted commands    | Real core/group writer, exact intent/map and before/after build hashes; partial/error seeds cannot get this status           |
| Seed `sizeVerdict`                     | Requires complete 10k seed, stable builds, positive assertion denominator, logical <=1.4 GB and <=300 B/assertion            | This seed attempt only                             | Both size bars checked; final result is FAIL. 1k is DIAGNOSTIC, not a storage PASS                                           |
| Independent retained-artifact readback | Decompressed intent digest/counts, full map digest/order, SQLite user/journal/claim/operation counts and logical bytes match | After writer shutdown, actual retained files       | Seed manifest hash, raw intent/map bytes and actual DB; does not turn the size failure into PASS                             |
| `run.mjs` / pipeline receipts          | Actual exit/signal and raw log SHA; complete source before/after comparison                                                  | Exclusive UUID output, timestamps                  | Exact argv, Git head, source inventory, Node and disk. Exit zero is execution evidence only, never semantic acceptance       |
| G10 schedule / cache observer          | 150 whole hot readbacks per arm; actual cache counter nonnegative, eligible basis, real worker queries                       | Fresh stores/readers and immediate warm repeat     | Baseline Git source, source/runner/extension/worker/seed hashes; diagnostic timing/pages only                                |
| P2Q inventory adaptation               | Every existing public service member still classified; added base's write-domain metadata                                    | Actual current declarations                        | `valueDomain` is not a query; no inventory test exclusion or core change                                                     |
| Archive and copy receipts              | Restored/copy bytes hash-equal, source metadata stable, SQLite archive integrity/counts checked                              | Closed successful own probe / quiescent outputs    | Exact owned paths, controller hash for final seal, declared retention; no unrelated deletion                                 |
| Existing G0 / pack / evaluator         | Actual assertions, skip inventories, consumer checks and evaluator totals                                                    | Fresh execution                                    | Source-bound receipts and copied raw output; independent promotion review still required                                     |

## Failures, provenance and retained evidence

All **82 execution attempts** indexed before the final seal remain available, including cancelled obsolete queued jobs and original failures. Early setup calls before the durable collector (unsupported pnpm run flag and missing built core) have only their original tool transcript; no source-bound acceptance is claimed for them. Later attempts preserve raw logs/receipts, including false source-stability flags from edits while queued or old output-directory inventory. They were not rewritten or adopted as final evidence.

Fixture corrections include unique ids, recursive canonical ordering, a shared fixed clock for v1/v2 committed_at, and real frame payloads/CRCs. The public snapshot anchor leak was fixed in product code, not normalized away in the final comparator. Missing evidence directories and build prerequisites were supplied. Main's mandatory `valueDomain` field was added to the P2Q non-read inventory; production core stayed unchanged. The existing testkit 5-second timeout remains unchanged; both its failing receipt and the successful full rerun are retained. The first cache observer compile used Apple's extension-disabled SDK header and failed; the successful compile uses the installed pinned driver's own header.

The successful diagnostic 1k probe was compressed to a 48 MB archive only after shutdown, restored to a new directory, byte-compared file by file, and checked with SQLite integrity/marker/counts. Only that own successful raw probe store and its restoration were removed; all bytes remain in `w0-1k-02/store-verified.tar.gz`. The original P5B store and all first-failure state were retained.

Final sealing copied and SHA-256 read back **1,726 files / 1,480,652,168 bytes** of own working outputs into durable `working-output/`; originals remain. Fixture symlinks are retained as explicit link-target metadata without following them. The durable global manifest covers **21,308 files**. [SHA256SUMS](SHA256SUMS) seals that manifest plus key receipts, and [evidence-index.json](evidence-index.json) resolves paths. Verification: from the durable root, check this repo's SHA256SUMS first, then the durable SHA256SUMS. Raw oracle/gate directories and individual evidence files over 1 MB stay outside Git.

Expanded pin audit: **247 pinned paths scanned, zero changed pinned paths**. Therefore there are no old/new changed-pin pairs. `lab/acceptance/` is unchanged, including pending Q102a-e and contract 0.3.14; no repinning or contract ruling was made.

## Limits and next decision

G9 fails despite verified contents. The next experiment/brief must reconcile the measured row/index representation and 1,024-frame tail with the 300 B/fact budget. No threshold, retention rule or id rule was changed to obtain a PASS. No 100k run was admitted: the 10k result is outside the required 15% of 259 B/fact, and no target-scale result is claimed. No new history-depth flatness or P1/P4/P5 acceptance run, erasure qualification, production deployment, package publication, main merge or push occurred. No container lifecycle/VM change or exclusive engine slot was taken. The separate G12 live diagnostic was not run without the orchestrator slot.

For ER01-Q, derived journal changes reduce one value copy, but physical deletion of a referenced fact must preserve a tombstone or rematerialize the change first. This is a follow-up integration constraint, not an erasure qualification. Independent review remains necessary; this builder report does not promote the branch.

---

# Round 2 (EXP-HS01 R2): retention fix, byte retention, compact ids

**Result: G9 PASS at 10k on the W0 profile: 969,883,648 logical bytes (0.970 GB), 217.06 B per asserted fact.** Bars: 1.4 GB and 300 B. Round 1 measured 509.08 B. Independent review of round 2 is still required. One caveat decides how far this carries: the W0 seed uses core's deterministic id generator, whose ids store as 4-byte integers. Production uses real ULIDs, which store as 16-byte blobs; the same 10k seed with ULID-shaped ids measures **308.09 B per fact (1.377 GB): under the 1.4 GB bar, 2.7% over the 300 B bar**. See "What the 217 B figure does and does not say".

Builder CX-HS01 round 2; branch `exp/HS01-host-store-layout`; started from `2f7b42d6`. Product commits: `dfddd916` (code) and `e81c16df` (tests). `535459e2` changes only a test and the pipeline (`git diff e81c16df 535459e2 -- packages` is empty). North star: P5 and P4 (bytes per fact, working set) with the P1/P2 recovery floor; correctness first. The journal format was not changed (R47). Predictions were committed before any round 2 measurement: [R2-PREDICTIONS.md](R2-PREDICTIONS.md) (commit `dfddd916`).

## 1. The review finding: legal frames larger than 16 MiB stalled finite retention

**Decision: retention makes progress for any legal frame size. It does not cap frames at write.**

| | |
| --- | --- |
| Cause | `purgeFrames` broke out of its loop when the next frame would cross 16 MiB of work, including when that frame was the first eligible one. One 18 MB frame (twenty 900,000-byte values, each under the 1 MiB string limit) became an immovable prefix; every later frame stayed too. |
| Fix | The first eligible frame in a call is always taken; later frames still stop at the 16 frames / 16 MiB budget. Deletion and anchor move stay one transaction, the anchor stays a contiguous prefix, holders, the last frame and the ACKED frame stay protected. |
| New work bound | 16 MiB plus at most one frame. The format allows a 256 MiB payload (`MAX_PAYLOAD`), so one purge call can delete about 256 MiB. R45's "16 MiB per call" bound is therefore restated, not kept. |
| Measured cost | A frame of exactly the format limit (268,435,492 bytes with header and trailer): **append 1,112 ms, purge call 83.9 ms, reopen 437 ms**, one call removes the whole frame. Frames at 16 MiB - 1, 16 MiB, 16 MiB + 1, 16 MiB + 36 and 17 MiB purge in 5.0 to 5.9 ms. |
| Why not a cap at write | The format admits these frames and the reviewer warned against refusing previously admissible values. A typed refusal would also be a behavior change for every lane that writes groups through this log. |
| Why not partial reclamation | The anchor is one contiguous prefix with one CRC and offset; a frame cannot be half purged without a second anchor kind. |

Regression: the reviewer's reproduction is in `lab/verify/HS01/retention.test.ts` ("CX-VHS01 reproduction"). It fails on the round 1 worker (`expected 1 to be greater than or equal to 2`, run on the old source) and passes on the fix. Boundary cases at and around 16 MiB include the 36 header/trailer bytes and assert each call's work (`bytes <= 16 MiB` or exactly one frame). Writer progress and recovery: after the largest-frame purge the store reopens and verifies from the anchor.

## 2. Retention by bytes

`frameRetention: { tailFrames?, tailBytes? }` (exported type `FrameRetention`). Retention keeps **at least** the newest `tailFrames` frames and **at least** the newest `tailBytes` bytes of frames; with both, the larger set; a missing one counts as 0 when the other is given. **Neither given keeps every frame (the default, as before)**, so frame-replay oracles run unchanged. Purging through frame f is allowed only while `marker.size - f.end >= tailBytes`. The CRC anchor, `FeedRetentionExpired {requested, retainedFrom}`, holders, the last frame and the ACKED frame are unchanged. A bare number sent to the worker's `purgeFrames` still means a frame count.

**G9 seed budget: `tailBytes = 64 MiB` (R45 5.4's forecast tail).** This is a lab setting in `lab/bench/hs01-seed.ts`, not a product default. The 10k seed retained **110 frames / 67,969,168 bytes** (anchor 6685, head 6795) instead of 1,024 frames / 625.99 MB. Frames plus index fell from 140.10 to **15.25 B per fact**.

Tests: the smallest suffix of at least `tailBytes` is kept (10 frames at 1,000,000 bytes of 100,000-byte frames; 11 at 1,000,001), 0 and 1 keep only the last frame, `tailFrames` and `tailBytes` combine as a maximum, `{tailFrames: Infinity}` keeps all, a holder bounds byte retention, invalid values (negative, fractional, NaN, above 2^53) are refused with `BrokerLogError`. **Pinned reads at an old position stay exact after byte-retention purges, across reopen**: a pin at the assertion's position sees the retired version after 40 purged frames (anchor beyond the replacement), and the position after sees only the replacement; a below-anchor feed cursor throws `FeedRetentionExpired`.

## 3. Compact ids

Ids are stored in one untyped column, by storage class:

| Class | Form | Applies to |
| --- | --- | --- |
| INTEGER | `tailValue * 64 + slot`, 1 to 8 bytes, 4 bytes below 2^25 triples | ids shaped `<8 chars of 0-9A-Z><1 to 18 chars of 0-9A-Z>` whose tail is below 2^43 and re-encodes exactly (`toString(36)`, upper case, left-padded to its length); the slot names `<head>/<tail length>` in a new dictionary table `hds` of at most 63 rows |
| BLOB, 16 bytes | canonical Crockford ULID, as in round 1 | production ULIDs; also tried after the integer form |
| BLOB, odd length | tag byte 1 plus UTF-16LE code units | ids that are not well-formed UTF-8 (lone surrogates). SQLite TEXT turns a lone surrogate into U+FFFD, so two different ids could collide in the unique id index. This was a latent round 1 defect for such ids |
| TEXT | the id itself | everything else, including a structured id when the 63 slots are full |

Decode is by storage class and ids keep their exact text at the API. Reads by id compute the same form with a lookup-only slot map: a head found in `hds` was necessarily allocated at its first use, so no row can have been stored as TEXT under it (slots are never freed). The journal's `:_tx/change` reference uses the same encoder. Binding uses `BigInt`, because better-sqlite3 binds a JS number as an 8-byte REAL in an untyped column (checked: `5` was stored as REAL). A round 1 layout 2 store (tables without `hds`) is refused with `BrokerLogError`, like v1.

Rejected: a global id dictionary (unbounded growth for random ids); a surrogate integer row id (loses entity clustering, R45 5.3); base 36 to a minimal big-endian blob (17 bytes, saves 9 of 27, ignores the constant hash head).

Property test (`id-codec.test.ts`): 300,000 generated ids plus 28 named edge cases, deterministic generator (mulberry32). Every id satisfies `unpack(pack(id)) === id`, a reader-side lookup reaches the writer's stored value, the row read back by that lookup is the row written, the stored values of distinct ids are distinct, integers are safe integers, escape blobs have odd length. Inputs cover canonical ULIDs, random base 36, lengths 0 to 39, lowercase and punctuation, 90 heads against 63 slots (so some fall back), tails around 2^43, widths 1 to 18, numeric-looking text, lone surrogates. Round-trip is through a real SQLite table with the same untyped `id` column. G6 and G7 now mix ULID-like, structured, other-width and noncanonical ids (G7 storage classes: 54,901 integer, 31,372 blob, 13,727 text); G6 compares every read with the v1 worker's exact ids.

## 4. Gates rerun on the final source

Evidence series `r2-final-cf17f7ba-4dc3-4e5f-8e90-2f491ed9a0c4` in the durable root. Product source is identical for all stages (packages unchanged between `e81c16df` and `535459e2`). Every receipt has `sourceStillMatches:true`.

| Gate | Result |
| --- | --- |
| G1 build / checks | Core, testkit, QLever and W0 build and typecheck; changed-source lint 0 warnings, format clean, `git diff --check` clean |
| G2 package / G0 | QLever package **257 pass / 29 expected skips** (unchanged); G0 QLever **1,415 pass / 79 skips**; G0 XTDB **1,223 pass / 140 skips**. One G0 XTDB attempt on `535459e2` failed 1 of 1,223: core `Reactor.test.ts` "cost tracks the change, not the population" (a timing ratio, 11.5 vs 5.4, on a host where four heavy slots were held by other jobs; core is untouched). It is retained; the immediate rerun and the earlier run on `e81c16df` both pass 1,223 |
| G3 SQL01 | **11/11**, on `e81c16df` and again on `535459e2` |
| G4 P2Q | **873 passed / 22 skipped**, same exclusions as round 1; storage controls **5 passed / 3 filtered** |
| G5 route harness | **93/93** |
| G6 layout equivalence | **50,000** generated v1/v2 worker reads, **zero mismatches**, with the mixed id classes |
| G7 codec property | **100,000** rows through SQLite, every own field exact; **15,508 fallbacks (15.508%)**, the same pathological sample as round 1, and the structured-id classes above |
| G8 recovery | Holders, tail, byte retention, typed expiry, reopen verification of retained frames only (1.09 GB written, 1.08 GB purged, 2 frames / 8.39 MB verified, RSS growth 8.67 MB), mid-WAL corruption refuses startup (flip-wal). **80 whole-process stops including abrupt stops during `purgeFrames` (byte-retention path) and in-transaction dictionary growth: 255 ACKed operations, zero lost; 297 feed positions, zero missing, zero duplicated.** Stop schedule ids now use the structured-integer form |
| G9 bytes | **PASS**: complete 1k and 10k seeds, content verified (section 5) |
| G10 diagnostics | See section 6. No timing acceptance claimed |
| G11 pack / evaluator | Lab pack gate: **12 tarballs**, clean consumer, import, smoke and CLI checks. Evaluator **108/108**, zero failed, skipped or cancelled |
| G12 live | **Not run** (no orchestrator slot requested; same as round 1) |

## 5. G9: bytes at 1k and 10k, predictions beside measurements

Denominator: submitted user assertions (4,468,284 at 10k, 442,410 at 1k), journal rows excluded. 10k: 434,768 commands, 1,954 retractions, 6,794 groups, **969,883,648 logical bytes** (`page_count x page_size`), zero free pages, **zero codec fallbacks**, integers for all 4,466,330 fact ids, 1,954 history ids, 8,100,092 journal ids and 4,470,238 journal references; one head slot of 63 used (`000SQKS9/18`). The seed ran 1,173 s (round 1: 1,109 s). Free space 12.48 GiB at start, 11.03 GiB at the end. The 10k seed preflight and per-group checks kept the 5 GiB floor.

| Measure | Prediction (written first) | Measured | Round 1 |
| --- | ---: | ---: | ---: |
| 10k B per asserted fact | 235 (range 220 to 250) | **217.06** | 509.08 |
| 10k logical bytes | 1.05 GB | **0.970 GB** | 2.275 GB |
| 1k B per asserted fact | 365 (358 to 372) | **352.91** | 1,239.69 |
| Frames + index at 10k | -125 B per fact (to about 15) | **15.25** (-124.85) | 140.10 |
| Ids as integers at 10k | -146 to -160 B per fact | **-166.96** | not applicable |

Both bars are met with margin: 217 against 300 B (28% under), 0.970 against 1.4 GB. The frame prediction was exact. The id saving came in 4% above the top of its range (page overhead per id copy was larger than my 15%), so the total landed 1.3% below the low end of the stated range. R45's forecast for this layout was 259 B; the measurement is 16% under it.

10k dbstat per object, round 1 against round 2 (decimal MB, B per fact):

| Component | R1 B/fact | R2 MB | R2 B/fact |
| --- | ---: | ---: | ---: |
| facts + id index | 107.37 | 253.104 | 56.64 |
| history + id index | 0.05 | 0.135 | 0.03 |
| journal + id index | 213.77 | 435.859 | 97.55 |
| entity dictionary + unique index | 28.09 | 125.493 | 28.09 |
| attribute/type/actor/head dictionaries | 0.00 | 0.025 | 0.01 |
| transaction dictionary | 1.94 | 8.675 | 1.94 |
| heads, claims, operations | 17.55 | 78.434 | 17.55 |
| retained frames + index | 140.10 | 68.137 | 15.25 |
| marker, pins, retention, epochs, schema | 0.00 | 0.020 | 0.00 |
| free pages | 0.21 | 0 | 0 |
| **Total logical** | **509.08** | **969.884** | **217.06** |

What is left (217 B): journal 97.55 (45%), facts 56.64, entity dictionary 28.09, heads/claims/operations 17.55, frames 15.25. The next levers, none done: the journal record (R47, est. 150 to 195 B before this round's id saving), the entity dictionary (its unique index stores every name a second time, 14.85 of 28.09 B), numeric references and booleans (bound as 8-byte REAL in the untyped value column).

### What the 217 B figure does and does not say

1. **Id shape.** W0 seeds with core's deterministic generator, so triple ids are `<hash><counter>` and all store as 4-byte integers. Production `IdGeneratorLive` makes ULIDs (ulidx), 16-byte blobs, 12 bytes per id copy more than the integer form, 6.63 copies per fact. Same seed, same source, ULID-shaped triple ids (the deterministic generator temporarily patched in `packages/core/dist` for the run, restored and hash-checked afterwards): **1k 444.71 B per fact** (predicted 443 from the arithmetic) and **10k 308.09 B per fact, 1,376,653,312 bytes** (all 4,466,330 fact ids, 1,954 history ids, 8,100,092 journal ids and 4,470,238 references as 16-byte blobs; frames 15.25 B unchanged; the seed's own verdict for that run is FAIL on the 300 B bar, PASS on 1.4 GB). On production-shaped ids the 300 B bar is missed by about 8 B per fact; the arithmetic predicted 309.7. Both numbers are diagnostics, not the G9 verdict, which is defined on the W0 seed.
2. Retention was 64 MiB, a seed setting. A replica holder (conservatively LSN 0 until a durable replica base exists, round 1) keeps every frame, as before; for lane Q with an attached replica the frame cost stays at the unpurged figure until QLever generations give the replica a base.
3. 100k was not run and is not claimed. Arithmetic only: 217 B x 44.5M facts is about 9.7 GB, plus about 13 B per fact once counters pass 2^25 and integers take 6 bytes.

## 6. Diagnostics (G10), not acceptance

Host shared with other heavy jobs (four slots usually held by others), sequential runs.

| Diagnostic | Round 1 | Round 2 |
| --- | ---: | ---: |
| SQL01 schedule, commit p50 v2/v1 | 19.40 / 20.53 ms (0.945) | 18.03 / 21.65 ms (0.833) |
| SQL01 schedule, commit p99 v2/v1 | 99.59 / 123.88 ms (0.804) | 96.18 / 105.83 ms (0.909) |
| 10k BFS, first touch: SQLite cache pages (single instrumented reader) | 3,289 pages | **2,385 pages (-27%)** |
| 10k BFS, SQLite-cache bytes per pull | 44,905.8 | **32,563.2** |
| 10k BFS, warm repeat: pages | 0 | 0 |
| 10k BFS wall (seed readback, worker pool): first touch / warm | 1287.6 / 679.7 ms | 1247.8 / 1057.0 ms |

The instrumented single-reader pass measures 1,002 ms first touch and 780 ms warm. The worker-pool warm repeat was slower than round 1 (1,057 against 680 ms) on a loaded host; one id decode costs about 0.11 us more as an integer than as text (0.308 against 0.194 us per row, microbench), about 15 ms across the 133,294 rows of a pass, so the codec explains about 15 of the 377 ms. No P4 timing claim is made; EXP-QH1 owns P4 acceptance.

## 7. PASS / verdict / receipt audit (round 2)

| New result-producing path | Content check | Freshness | Binding / limits |
| --- | --- | --- | --- |
| `purgeFrames` selection (worker) | Frame `end`, `offset` and `marker.size` from the transaction's own reads; holders, ACKED and last frame bound the floor | Current writer transaction | Persisted anchor and marker; produces no verdict by itself |
| `retention.test.ts` regressions | Retained frame count, bytes and first LSN read through an independent read-only SQLite connection, not the worker; each frame's `end - offset` asserted equal to the requested size before purging; pinned reads compared by id, value and retracted position on the original and the reopened store | New store per case, new frames | Boundary sizes include the 36 header/trailer bytes; the largest-frame case records `full:true` (it uses 64 MiB when under 768 MiB headroom and says `full:false`) |
| `id-codec.test.ts` | Exact string equality after a SQLite round trip, lookup returns the written row, injectivity over all stored values, storage class per id | In-memory database, deterministic generator | Evaluates the same `rowCodec` source the worker embeds; worker path covered by G6/G7/G8, seeds and the stop schedule, not by this test |
| G6 / G7 (changed fixtures) | v1 worker bytes as independent reference for 50,000 reads; every own field with `Object.is`; id storage-class floors asserted | New stores, deterministic stream | Retained round 1 fixtures otherwise unchanged |
| Stop schedule | Expected ids recomputed from the operation name by a recipe in `kill.mjs`, compared with ids read back after SIGKILL; ACKs held by the parent | 80 new stops | Original/instrumented worker hashes unchanged (barrier text matched exactly) |
| Seed `SEEDED-CONTENT-VERIFIED` and `sizeVerdict` | Unchanged from round 1: full assertion columns, retirement tuples, claims, native ordering; both size bars; stable build hashes. New manifest fields (`idClasses`, `headSlots`, `retention`) are observed from the final database | This attempt only | Predictions in the manifest are recorded, never read by the verdict |
| `pipeline.mjs` resume (`HS01_ATTEMPT`, `HS01_ONLY`) | None: it only selects stages | Fresh receipts per stage | Receipts keep their own head and source hashes; the series spans two heads with identical packages |
| Execution receipts | Exit code and raw log hash only; **exit 0 is execution evidence, never semantic acceptance** | Unique directory per attempt | Source inventory before and after each stage |

## 8. Provenance, failures and what was not verified

- **Disk.** Free space was 6.4 GiB at the start of this round (the brief expected about 11), fell to 4.39 GiB during the first pipeline run from other jobs' use, and recovered to about 12 GiB later. While it was under 5 GiB, `run.mjs` refused every stage (receipts empty, retained). The stages were rerun after recovery with `HS01_ONLY`. The first `hs01` stage attempt on `e81c16df` failed only because the largest-frame test refused to cross the floor; it is retained, and the test now reduces its payload when headroom is short and records it. The 10k seed ran with 12.48 GiB free.
- **Cleanup.** I deleted only my own first 1k development seed (`r2-dev1-w0-1000`, its numbers matched the final 1k to 0.04 B). A removal of my test stores under `runs/HS01` was blocked by the harness's safety check and was not retried another way; about 32 MB of throwaway test stores remain in the worktree `runs/` (gitignored).
- **Not done:** G12 live; 100k; a 10k seed with ULID ids is a diagnostic only; power-loss qualification; erasure qualification; deployment, publication, merge, push. No `lab/acceptance` change (see pins).
- **Compatibility:** a round 1 layout 2 store is refused (typed `BrokerLogError`), as v1 is; no migration tool.
- **ER01-Q:** unchanged constraint; ids as integers are exactly reversible, so physical deletion of a referenced fact still needs a tombstone for the journal reference.

Pin audit: `git diff 257d4d20 -- lab/acceptance` is empty; all 59 lines of `lab/acceptance/pins/*SHA256SUMS` match the working tree; none of the changed paths (`packages/qlever/src/broker`, `lab/verify/HS01`, `lab/bench/hs01-seed.ts`, `lab/experiments/EXP-HS01`) appears in any acceptance file. **Zero changed pinned paths, so no old/new hash pairs.** (Round 1 scanned 247 pinned paths by a broader method that I did not reproduce; this check is the pins directory plus the acceptance diff.)

Evidence: durable root `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/`, series `r2-final-cf17f7ba-4dc3-4e5f-8e90-2f491ed9a0c4-*` (seeds in `-w0-1000` and `-w0-10000`, cache observer output in the 10k directory), `r2-g10`, `r2-ulid-diag-w0-1000`, `r2-ulid-diag-w0-10000`, `r2-cache-observer-10k-*`, `r2-g10-sql01-baseline-*`. [evidence-r2.json](evidence-r2.json) indexes every attempt (command, head, exit, source stability, receipt hash). [SHA256SUMS-r2](SHA256SUMS-r2) seals the durable manifest and key receipts; from this repository's root check `SHA256SUMS-r2` lines (`evidence-r2.json` here, the durable manifest in the durable root), then from the durable root run `shasum -a 256 -c SHA256SUMS-r2.durable`. The manifest covers 9,420 files; its 11 `LINK:` lines record symlink targets (pack consumer links, not followed) and `shasum` reports exactly those as improperly formatted.
