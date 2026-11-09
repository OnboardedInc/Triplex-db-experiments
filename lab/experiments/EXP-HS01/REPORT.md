# EXP-HS01: broker host store layout

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
