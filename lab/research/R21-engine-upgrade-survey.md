# R21: What changed in QLever and XTDB after our pins, and what an upgrade would cost

**Written:** 2026-11-07. **Pins read from:** `references/MANIFEST.json` and `lab/config/slots.json`. XTDB `v2.2.0` (`c6c1962`, image `ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a42650...2a948a77`). QLever `v0.6.0` (`6c5861a`, image `adfreiburg/qlever:0.6.0@sha256:37d5ede1...49a78ec`).
**North star:** P1 to P5 in `lab/NORTH-STAR.md`, bars in `lab/TARGETS.md` section 1, scope in `lab/SCOPE.md` (both engines stay candidates for every layer).
**Builds on, not repeated:** R8, R14, R16, R17, R19, R20, EXP-X02, EXP-P2Q, EXP-X05, EXP-P2X.
**Raw material:** `/Users/sam/Claude/Projects/triplex-db-2/R21/` (release JSON, PR and issue JSON, commit lists since each pin, image tag listings, source files at both SHAs, two blobless git clones). Nothing was run: no Docker, no engine.

## How to read this report

- **Evidence labels.**
  - `[F]` fact read from a public source named next to it.
  - `[R17]` and similar are numbers from a prior lab report.
  - `[I]` my inference from facts. It says what would falsify it.
  - `[E]` my numeric estimate. Section 5 turns every `[E]` that matters into a falsifiable prediction.
- **Dates.** All "as of" statements are 2026-11-07. GitHub API reads happened during the afternoon (host time). The QLever master head was `6a17ca9321b3d16de3ac7544f5518edc2e200722`, committed 2026-11-07 15:09 +0530. The XTDB main head was `d742ccba9c1fee67c52c94b5cace0237828cbb4d`, committed 2026-11-07.
- **How the sources were read.** Unauthenticated GitHub REST API and `git ls-remote` with credential helpers disabled, `raw.githubusercontent.com` for single files at pinned SHAs, the Docker Hub tag API for QLever, and the GHCR registry API with an anonymous pull token for XTDB. Every request used the generic client identity `Mozilla/5.0 (compatible; research-client)`. No personal data was sent. The two blobless clones fetched commit and tree objects, plus the few files I diffed.
- **Cite format.** `path:line @ sha`, relative to the engine repository.

---

## 0. Skim layer

### 0.1 Verdict per engine

| Engine | Pinned | What exists after the pin | Recommendation |
|---|---|---|---|
| **QLever** | `v0.6.0`, image `0.6.0` | **No release and no tag after `v0.6.0` (2026-08-13).** 404 commits on `master`. Docker Hub has commit-tagged master images, including one for the #3607 merge. `latest` is a moving master build. | **Run one side-by-side experiment (E1, section 5). Do not move the lane pin. Keep EXP-P2Q on 0.6.0 and keep its overlay.** The upgrade has a hard cost: the index format changed, so every 0.6.0 index needs `qlever-upgrade-index` or a rebuild. |
| **XTDB** | `v2.2.0`, image `2.2.0` | **No release after `2.2.0` (2026-10-21).** One image rebuild `2.2.0-1` (Dockerfile only), nightlies, `edge`. The `2.2.1` milestone is 15 of 15 closed, so a patch release is likely within days. | **Stay pinned. Re-qualify against `2.2.1` the day it is tagged (E2).** It fixes #6345 (a wrong-answer hazard our builders reach), #6358 (a hazard they do not reach) and #6174 (slow plans after restart), and it leaves the Local log, the idle heartbeat and the read-only log code untouched. |

### 0.2 What moves each priority and requirement

"Unchanged" always means I checked the source or the tracker and found no change, not that I measured.

| Item | QLever (0.6.0 to master) | XTDB (2.2.0 to main) |
|---|---|---|
| **P1** pinned reads, writers never blocked | Unchanged semantics. New default `max-num-threads-per-query` 6 and rebuild thread limits change CPU sharing (unmeasured). | Unchanged. The `numThreads` default 42 and `ReadOnlyLocalLog` have zero diff. Follower processing differs only by a refactor. |
| **P2** small commits, low latency | **Partly improved, not enough.** #3607 merged. The rest of the same fix (#3663, #3612) is open. The O(delta) rewrite of the persisted delta is untouched. Delta-0 floor of about 11 ms is untouched. | Unchanged. `LocalLog.kt` has zero diff. |
| **P3** ordered resumable feed | Unchanged (the host log is the feed). | **No change stream.** #2454 is still open and says "There is no outbound replication path today". |
| **P4** fast current path | No commit found that changes pull cost. | Two opt-in compaction flags, default off: #6042 (recent-window reads skip superseded rows) and #5914 (smaller files, faster bitemporal resolution). |
| **P5** release sweep without hurting live traffic | Rebuild thread limit (#3875, merged). Dedicated rebuild pool (#3899, #3888) open. | Unchanged. |
| **Tenant isolation** | Unchanged (per-tenant index). | Unchanged. Idle heartbeat and attach cost have zero diff. Roles exist only as membership rows on the primary database. |
| **Erasure** | **Unchanged.** Rebuild still merges old and new words and never drops one. | #6358 fixed on main (erased rows leaking through system-time windows). Log retention unchanged. |
| **No silent precision loss** | Unchanged. 60-bit integers, decimals through double. #2886 and #3884 open. | Unchanged. DECIMAL to BIGINT cast through a double has no upstream issue. #6329 open. |
| **Outbox** | Unchanged. | Unchanged. |

### 0.3 Findings that change the plan

1. **The "700 ms to 60 ms" figure is not available in any merged state.** It comes from the umbrella PR #3267, which was split into four parts. Only parts 1 to 3 are merged, and part 3 (#3611) is a data structure nothing uses yet. The merged part that does something (#3607) fixes the snapshot copy only, and its own PR text says the remaining 230 ms on Wikidata is the metadata copy. [F]
2. **A second O(delta) cost exists that no PR touches.** With `--persist-updates`, every update re-serializes the whole delta to disk (`DeltaTriples::writeToDisk`, 45 ms of the 129 ms at 500k delta [R17]). It is unchanged on master. Running QLever **without** `--persist-updates` removes it on **0.6.0 today**, and our design already replays the host log, so the persisted delta is redundant. [F][I]
3. **The overlay in EXP-P2Q stays necessary** even if update cost reaches 60 ms at 500k delta, because 60 ms is above both P2 bars, and because the delta-0 ACK is already 11.2 ms [R17] against a p50 bar of 10 ms. Details in section 1.3.
4. **A 0.6.0 index cannot be loaded by any newer build.** The index format moved from version 1572 to 3470 (with 3159 also loadable). `qlever-upgrade-index` ships in the master image and is documented as more than 10 times faster than a rebuild. [F]
5. **Four QLever items we asked about did not change:** result-cache clearing on every update, no `TCP_NODELAY`, no FILTER or VALUES pushdown into scans (no commit found), and vocabulary garbage after delete plus rebuild. Section 1.4 has the evidence for each.
6. **XTDB's idle heartbeat (`ElectionDriver.kt`, `ReplicaLogAppender.kt`), `LocalLog.kt`, `ReadOnlyLocalLog.kt` and the `numThreads` default (`ServerConfig.kt`) are byte-identical to 2.2.0.** Every R16 and R19 hazard about them stands. Follower processing differs only by a refactor. [F]

---

## 1. Question 1: QLever after 0.6.0

### 1.1 Releases, tags and images

**Releases and tags.** [F] `git ls-remote --tags` and the releases API: the newest release and tag is `v0.6.0` (2026-08-13 14:08 UTC, `6c5861a`). The only other release object is the rolling pre-release `latest-master`, which carries static Linux binaries of the last green `master` build. At read time it pointed at `6a17ca9321b3d16de3ac7544f5518edc2e200722`, published 2026-11-07 10:25 UTC. `master` is 404 commits ahead of `v0.6.0` (`qlever-commits-since-v0.6.0.txt`).

**Release cadence.** [F] 0.5.44 (2026-01-21), 0.5.45 (02-24), 0.5.46 (04-16), 0.5.47 (04-27), 0.5.48 (06-12), 0.5.49 (07-07), 0.5.50 (07-17), 0.6.0 (08-13). The 86 days since 0.6.0 is the longest gap in that list. [I] The next release will carry the index format break (section 1.5), and I would not expect a date.

**Docker images.** [F] Docker Hub `adfreiburg/qlever` has no tag newer than `0.6.0` / `0.6`. It publishes `latest` and `commit-<10 hex>` and `pr-<n>` tags from CI. `latest`, `commit-4b9df11d36` and `pr-3847` were the same manifest at 2026-11-07 04:56 UTC. `latest` moves with every master build, so a pin must use a `commit-` tag and its digest.

| Role in E1 | Tag | Index (manifest list) digest | linux/arm64 digest | Built |
|---|---|---|---|---|
| Today's pin | `0.6.0` | `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec` | `sha256:e4eee6ec4322da99083216f4aeaa427e1dacb3ae3ff7bd2be667a2ae8433d942` | 2026-08-13 |
| Control: parent of #3607 (`ab6d1bee017e8a96a713ecae5451994e321c401c`, #3586) | `commit-ab6d1bee01` | `sha256:1ae7a1f7cd1ea2f511acf3711a063bf67e08b99fb84ba0d481eb1bff2b0129b4` | `sha256:a3c99a87894236de8a80fab23e1bd85d197b20e94b394fc93ac9f8b4cced9282` | 2026-10-06 |
| #3607 merge (`b2939267bdf100e70560c3fbe02535e39c31e8eb`) | `commit-b2939267bd` | `sha256:f98e617addaf60a850077c250c66882c7395fb46bb7e81f5ccce3d726c8b87da` | `sha256:b825019dec3530323e0bb8c9eafaae578c0d5e66bac4a0e8f8620d6a87fd58ba` | 2026-10-07 |
| #3806 cache-staleness fix (`ddb3d830...`) | `commit-ddb3d83037` | `sha256:abb1ae077e7073b41e67f7df1b953b1d00343f3ce9f95b28806ff5c0cfa9fd19` | `sha256:8215601e7c7831f2bd087735c91a73c51615ad42fd72a07bcdd508933e6d0682` | 2026-10-24 |
| Newest master image at read time (#3847) | `commit-4b9df11d36` = `latest` | `sha256:750eb2cc31820e175ac0e731a543c71caee30c91ce97007baa9a3b987d904638` | `sha256:ca08ca042e55d81c14656397c0c105fbb11f5293d61b20cf5c098d9076ca5fb5` | 2026-11-07 |

The image for `6a17ca93` (#3900) was not built yet at read time. The lab runs QLever with `--platform linux/arm64` (`lab/bin/engine.mjs:68`), and every row above has an arm64 child manifest. The master `Dockerfile` builds `qlever-index qlever-server qlever-upgrade-index` and copies `qlever-*` into the runtime stage (`Dockerfile:57,94 @ 6a17ca9`), so the converter is in the image. [F] Both Dockerfiles use `ubuntu:24.04` and `libicu74` in the runtime stage. [F]

### 1.2 Update cost: the status of #3607, #3267, #3612 and what each part fixes

**The four parts of #3267.** [F] (`qlever-pr-3267.json`, `-3607`, `-3611`, `-3612`, `-3663`)

| Part | PR | State | What it does |
|---|---|---|---|
| 1 | #3368 | merged 2026-09-12 (`0798e9fe`) | `CopyOnWritePtr` |
| 2 | #3607 | **merged 2026-10-06 (`b2939267`)** | Located triples per block held through `CopyOnWritePtr`. A snapshot copies one pointer per block. An update clones only blocks it modifies that a snapshot still shares. Only blocks modified since the last consolidation are consolidated. |
| 3 | #3611 | merged 2026-10-09 (`794b2654`) | `CopyOnWriteChunkedVector`. "The class is not used yet." |
| 4 | #3612 | **open**, created 2026-10-05, last updated 2026-10-09, 2 comments | Stores the augmented block metadata in that vector so the snapshot of it is residual too. "The last part of #3267." Depends on #3663. |
| 4a | #3663 | **open**, created and last updated 2026-10-09, 0 comments | Recompute augmented metadata only for blocks whose located triples changed. |
| umbrella | #3267 | **open**, created 2026-08-20, last updated 2026-09-13 | The PR whose body carries the "700 ms to 60 ms at 500k delta on Wikidata" claim. |

**What the evidence supports.**

- #3607's own measurement, on Wikidata with 800k delta triples at the end: snapshot creation "stays at 230-250 ms instead of growing from 230 ms to 290 ms", and the operations step drops from 30 to 45 ms to 15 to 25 ms. "The remaining 230 ms are the copy of the augmented metadata." [F] So #3607 alone makes the cost stop growing with delta in the snapshot step, and it does not cut the Wikidata total.
- #3612 plus #3663 together, same index: "360-540 ms down to 60-120 ms" per update, metadata update 85-190 ms to 20-30 ms, snapshot 230-300 ms to 10-40 ms. [F] The 700-to-60 figure in #3267 is the same effect at 500k delta on an earlier prototype. [I]
- The Wikidata index has about three million block metadata entries (#3611, #3612 and #3663 bodies). [F] Index A in R17 (69M triples) has far fewer blocks, so the fixed metadata copy should be a smaller share there. [I] I did not measure the block count (open question 3).

**Where our 129 ms goes.** [R17 section 2.2, server-side phases at p50, delta 500k, 94-triple command; ACK from the host includes fsync and the connection]

```
update phase                      ms    scale: one # = 5 ms        who fixes it
operations (parse, plan, apply)    6    #                          #3607 helps a little
metadataUpdateForSnapshot         41    ########                   #3663 + #3612 (open)
snapshotCreation                  26    #####                      #3607 (merged)
diskWriteback (--persist-updates) 45    #########                  no PR; drop the flag
                                 ---
server-side total                118
+ host fsync 3.1 + hop/connection about 8   ->   ACK p50 129
```

[F] `diskWriteback` is `deltaTriples.writeToDisk()` inside `DeltaTriplesManager::modify` (`src/index/DeltaTriples.cpp:617-619 @ 6a17ca9`). `writeToDisk` serializes the whole non-internal delta (`triplesDeleted_`, `triplesInserted_`) to `<file>.tmp` and renames it, and returns at once when no persist file is set (`DeltaTriples.cpp:727-751 @ 6a17ca9`; same function at `648-672 @ 6c5861a`). No merged or open PR I found changes it. [F]

**Prediction from the phase table.** [E] Merging only #3607 should cut about 25 ms at 500k delta (ACK 129 to about 105 ms). Merging #3612 and #3663 as well should cut about 35 ms more (about 70 ms). Dropping `--persist-updates` should cut 45 ms (to about 60 ms with #3607 alone, about 25 ms with all three). Section 5 E1 tests this arm by arm.

### 1.3 Would the EXP-P2Q overlay still be needed at 60 ms per update?

**Yes.** Four reasons, in the order I would weigh them.

1. **60 ms is above both bars.** P2 asks p50 at most 10 ms and p99 at most 50 ms (`lab/TARGETS.md` section 1). [F]
2. **The delta-0 floor is already above the p50 bar.** R17 measured ACK p50 11.2 ms at delta 0: host fsync 2.8 ms, QLever update 8.6 ms (5 ms server-side), and a new TCP connection per request because the server has no `TCP_NODELAY`. Nothing in the 404 commits touches those three parts. [R17][F]
3. **The upstream claim does not describe our index.** It is a Wikidata figure for a full set of four parts, and two of them are open (section 1.2). [F]
4. **Even with every part merged and persistence off, the estimate is about 25 ms p50 at 500k delta [E].** That misses p50 by 2.5x. Whether it meets p99 depends on the tail: p99 over p50 was 1.5 at delta 0 and 2.5 at 500k [R17], so p99 lands between about 35 and 65 ms around the 50 ms bar.

**What changes if the upstream work lands.** [I] The overlay's job narrows from "hide a delta-proportional cost" to "trim the last 5 to 10 ms for the p50 bar". The broker, log of record, claims, CAS and feed still stand, because they carry idempotency, atomic outbox and P3 whatever the engine's update cost is. A cheaper update would also let the bounded-delta option (R17 option B) work at a much larger delta, so a per-tenant or sharded current index becomes feasible above the 9M-triple ceiling R17 gave it.

**Decision for Sam.** Loosening a bar needs Sam (`lab/TARGETS.md`, threshold policy). If Sam accepted p50 at most 15 ms and p99 at most 50 ms, ACK-after-publication on a build with #3612 and #3663, without `--persist-updates`, would be a candidate for a simpler design with no overlay. That cannot be tested today, because #3612 and #3663 are not merged.

### 1.4 The items we asked about, one by one

| Item | Status after 0.6.0 | Evidence |
|---|---|---|
| **Result-cache invalidation granularity** | **Unchanged.** Every update still calls `cache_.clearAll()` and `namedResultCache_.clear()`. The justification comment is the same ("the index of the located triples snapshot is part of the cache key"). The code moved from `Server::processUpdateImpl` to `Qlever::applyUpdate`. | `src/libqlever/Qlever.cpp:343-349 @ 6a17ca9`; `src/engine/Server.cpp:1303-1309 @ 6c5861a`. [F] |
| **Cache correctness around rebuild and clear** | **Fixed.** #3806 (`ddb3d830`, 2026-10-24) increments the snapshot index on `clear-delta-triples` and continues it across a rebuild, so stale entries are not served. This is R8 failure case 8. | Commit message. [F] |
| **Cache that survives updates** | **Open.** #2386 (`propagate-changes-from-updates`) would skip snapshot and metadata work per update until a later publish. Open since 2025-09-24, last updated 2026-08-18. | `qlever-pr-2386.json`. [F] |
| **TCP_NODELAY / keep-alive** | **Unchanged.** The acceptor sets only `reuse_address`. No upstream issue or PR matches "NODELAY" (0 results). The 40 ms keep-alive penalty from R17 should therefore persist. [I] Falsifier: E1 includes a tiny-query keep-alive check. | `src/util/http/HttpServer.h:238-239 @ 6a17ca9` (was `155-156 @ 6c5861a`); search on the issue tracker. [F] |
| **Planner push of temporal FILTER or VALUES into a scan** | **No change found.** No commit title describes it. Adjacent changes exist and could move timings either way: #3596 (trailing VALUES joined before DISTINCT and ORDER BY), #3622, #3821 (binary search to skip join-column entries in `getBlocksForJoin`), #3581 and #3629 (scan cost and `ORDER BY ... LIMIT` read fewer blocks), #3690 (comparison of a comparison in FILTER), #3440 (no FILTER on a subtree where a variable may be UNDEF). Only an A/B can say. [I] | `qlever-commits-since-v0.6.0.txt`. |
| **Vocabulary garbage after delete plus rebuild (erasure)** | **Unchanged.** The rebuild still writes "merging existing and new words" and no rebuild code drops a word. The "vocabulary with holes" PRs (#3279, #3334) serve the named-result-cache blob, not the index. `IndexRebuilder.cpp` differs between the two SHAs only in thread-pool plumbing and an error message. | `src/index/IndexRebuilder.cpp:504 @ 6a17ca9`; a line diff of the file between SHAs. [F] |
| **Previous-index directories** | **Available on 0.6.0 already, and useful for erasure.** `--rebuild-keep-previous-index-dirs` (#3187, in 0.6.0) defaults to `original-and-most-recent`, so the first index, which holds the pre-erasure literals, is kept by default. `none` deletes all `previous.*` after each successful rebuild. `none` removes those copies and does not remove the word from the rebuilt vocabulary. | Commit `65f84b43`. [F] |
| **Integer and decimal precision** | **Unchanged.** `numDatatypeBits = 4`, `numDataBits = 60`, `IntegerType = NBitInteger<60>`. Open: #2886 (`"9999999999999999999"^^xsd:decimal` returned as `"10000000000000000000.0"`), #3884 (index build fails on valid unsigned and long literals). #3401 makes `parser-integer-overflow-behavior` take effect, at index-build parse time only. A "split layout" `Id` is being prepared (#3719, #3797, #3874) and is not active (`src/global/Id.h` still has `using Id = foldedValueId::ValueId`). | `src/global/FoldedValueId.h:40-47 @ 6a17ca9`; `qlever-pr-2886.json`, `-3884`. [F] |
| **Collation (R20 ICU order)** | **Unchanged for our keys.** Locale defaults in `Constants.h` and all of `LocaleManager.h` are identical. `StringSortComparator.h` gained a geo-cell layer that returns 0 unless a geo cell grid is configured, and then only for WKT literals. Both images use `libicu74`. | Line diffs; `StringSortComparator.h compare`. [F] |

### 1.5 Changes that matter and were not on the question list

1. **Index format break.** [F] `0.6.0` reports format `{1572, 2024-10-22}`. Master reports `{3470, 2026-09-26}` and also loads `{3159, 2026-09-01}` without conversion (`src/index/IndexFormatVersion.h @ 6a17ca9`). Commit `28d3efd7` (#3159, 2026-09-01) says "THIS IS AN INDEX BREAKING CHANGE": an old binary refuses a new index and the reverse. It adds `qlever-upgrade-index <basename>`, which rewrites the index into a temporary directory, checks triple count and loadability, then swaps and keeps the old one as `index-in-old-format.<date>`. The author states it is "more than 10 times faster than a rebuild from scratch" and "not byte-deterministic". Commit `2a3d73eb` (#3470) changed geo point encoding and kept the previous format loadable.
2. **JSON response key.** [F] The runtime parameter `sparql-results-json-with-time` became `sparql-results-json-with-meta`; the top-level field carries query time, result size and warnings (`src/global/RuntimeParameters.h:206 @ 6a17ca9` against `:189 @ 6c5861a`). `packages/qlever/src` does not read the `time` field (grep found no use), so the adapter is unaffected. R8 and R17 scripts that read phase times from update responses should be checked.
3. **Renamed or replaced runtime parameters.** [F] Gone: `lazy-index-scan-num-threads`, `lazy-index-scan-queue-size`, `parallel-sort-num-threads`, `pattern-trick-num-threads`, `permutation-writer-num-threads`, `rebuild-index-scan-num-threads`, `rebuild-permutation-writer-num-threads`, `sort-estimate-cancellation-factor`. Added: `max-num-threads-per-query` (default 6, #3651), `rebuild-index-max-num-threads` (default 0 = no limit, #3875), `memory-for-queries`, `lazy-index-scan-num-blocks-in-flight`, `permutation-writer-num-blocks-in-flight`, `pattern-trick-num-tasks-in-flight`, `sort-num-tasks-in-flight`. "A configuration that still sets one of the old names is rejected as an unknown parameter" (#3875). Our `qlever-start.sh` uses only `persist-updates`, `no-patterns`, `no-access-check`, `no-metrics-log`, `no-resource-usage-log`, `-j -m -c -e -s` and `query-planning-budget`; all of these still exist in `ServerMain.cpp` and `RuntimeParameters.h` at master. [F]
4. **Thread model.** [F] Query results are now computed on the server's worker threads, not IO threads (#3715). A per-query thread cap defaults to 6 (#3651). Updates still run on a single-thread pool (`UPDATE_THREAD_POOL_SIZE = 1` at `src/engine/Server.h:115-116` and `static_assert(UPDATE_THREAD_POOL_SIZE == 1)` at `src/engine/Server.cpp:1420`, both @ 6a17ca9). The rebuild shares the global pool unless #3899 or #3888 merge (both open), and a rebuild on a busy Wikidata server "took two to three hours instead of 45 minutes" (#3899 body). R17's rebuild-under-load interference is therefore expected to persist. [I]
5. **SPARQL semantics fixed or tightened since 0.6.0.** [F] Aggregates rejected in `BIND`, `FILTER` and `GROUP BY` expressions (#3283). `isIRI`, `isBlank`, `isLiteral`, `isNumeric` return UNDEF for an unbound argument (#3717). Boolean literals case-insensitive (#3181). `FILTER` never applied to a subtree where a variable may be UNDEF (#3440). `STDEV` deprecated for `ql:stdev` (#3849). Each can change a G1, G2 or G4 outcome in either direction.
6. **Update path fixes we already wanted.** [F] #3175 (2026-08-16) makes a term constructed by an update reuse the index's existing `Id`, which fixes the `lower == upper` rebuild crash (R8 failure case 2) and heals a persisted file at start.
7. **Still open and relevant.** [F] #3151 (auxiliary on-disk index for large delta sets; today about 350 bytes of RAM per delta triple), #3899 and #3888 (dedicated rebuild threads), #2386 (above).

---

## 2. Question 2: XTDB after 2.2.0

### 2.1 Releases and images

**Releases.** [F] The releases API lists `v2.2.0` (2026-10-21 15:22 UTC) as the newest, preceded by `v2.1.1` (2026-10-21 14:36, the rollback patch) and `v2.2.0-rc2` (10-20). There is no 2.3. Tags also include `v2.2.0-1`.
**What `v2.2.0-1` is.** [F] It is two commits after `v2.2.0`, and `git diff v2.2.0 v2.2.0-1` touches only `docker/Dockerfile` (2 lines: Alpine 3.23.7 with OpenSSL 3.5.9, Temurin 25.0.5+8; commits `5e1a62472`, `9e3045a83`). The engine code is identical.
**What is next.** [F] Milestone `2.2.1` (milestone 61) has 15 closed and 0 open issues and PRs. `ea239b9f4` (2026-11-04) renames the unreleased changelog markers in the docs from `v2-NEXT` to `v2.2.1`. [I] So main is the 2.2.1 line and a release is imminent. I found no date.

| Role | Tag | Manifest digest | Source revision |
|---|---|---|---|
| Today's pin (`latest` is the same image) | `2.2.0` | `sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77` | `c6c19623d90c658c15400fb46dc056f3735ed57b` |
| Base-image rebuild, engine unchanged | `2.2.0-1` | `sha256:77d667bbf8cc99c86522da00eafc66f54b9f0a141f72f1eb3b58db329f046c94` | `9e3045a83286d96255b86062ba26655661c1a668` |
| First nightly containing the #6345 fix | `nightly-20261104` | `sha256:33df256900beb5840163bbe9912b6f8e542442ee8393cd83fd3d5a79a2b434aa` | `c6d6490361a9d276ff1ff3716b9e5ca2268bb723` |
| Newest nightly = `edge` = `nightly` | `nightly-20261106` | `sha256:84de41e10c344bae7fed52bdd37d0a058b5fb06109865d8be582baf395442f0e` | `98256466058f80a2d39d639d1588943322cec6eb` |
| Rollback target (not needed) | `2.1.1` | `sha256:0b7eb36ca133fcd3db127fa5d3763aa81a87d1a13a35ef2b306295e7d6a9fd20` | |

The 2.2.0 revision label and digest match `lab/config/slots.json`. [F] The registry lists 876 tags; nightlies run daily on workdays through 2026-11-06. [F]

### 2.2 The items we asked about, one by one

| Item | Status on main (`d742ccba9`) vs `v2.2.0` | Evidence |
|---|---|---|
| **Change feed / CDC out of XTDB** | **None.** #2454 ("Users can subscribe to a stream of XTDB's completed transactions for CDC") is open, updated 2026-08-04. Its text: "There is no outbound replication path today." An earlier `tx-sink` was removed before the single-writer work. The replica log "retains a bounded window rather than all of history". The 2.2 external sources (Postgres, Kafka Connect) and the source SPI bring data **in**, not out. | `xtdb-issues/2454.json`; 2.2.0 release notes. [F] |
| **Read replicas / followers** | **Shipped in 2.2.0 and unchanged since.** Read-only mode, ingest-only node (`xtdb.main ingest`), leader election per database. `FollowerLogProcessor.kt`, `LeaderLogProcessor.kt`, `LogProcessor.kt` differ by 61, 56 and 28 diff lines; the lines I read route calls through the new `PartitionState` value and catalog snapshots (the refactor for #6174). `ReadOnlyLocalLog.kt` has **zero diff**, so the R19 half-written-record risk stands. #6023 (a read-only database cannot tell "caught up" from "log truncated") is open. | `git diff v2.2.0 d742ccba9`. [F] |
| **Per-database authorization or encryption** | **None.** `docs/.../ops/config/authorization.md` is identical at both SHAs: `GRANT`/`REVOKE` role membership, stored in `xt.role_membership` on the primary database, superuser only, no role-to-table or role-to-database permission. No encryption issue is open except #6255 (TLS on the Flight SQL listener). 2.2.1 adds authentication to Flight SQL (#5793). | Doc diff; issue searches "encrypt" (3 hits) and "GRANT permissions" (1 hit). [F] |
| **Attach-database cost and idle heartbeat** | **Unchanged.** `ElectionDriver.kt` and `ReplicaLogAppender.kt` have zero diff, so the 100 ms idle assert interval for Local logs and the `NoOp` append with `force(true)` per database stand. `dbs-in-xtdb.md` is identical. | `git diff v2.2.0 d742ccba9 -- <files>`. [F] |
| **pgwire connection handling** | **Unchanged.** `ServerConfig.kt` (`numThreads` default 42) has zero diff. `pgwire.clj` changed only in the authentication handshake (error codes `28P01`, `28000`, `42501`, principal handling). | Diff. [F] |
| **Commit latency (log flush, group commit)** | **Unchanged.** `LocalLog.kt` has zero diff. The pipelined replica-log writes (#5507) closed before 2.2.0. | Diff; `xtdb-issues/5507.json`. [F] |
| **Snapshot and await tokens** | **Unchanged, and the open items stay open.** #6232 (a handed-on await token can let the receiver read behind the sender), #6039 (prepared-statement describe depends on execution count), #5198 (`SETTING SNAPSHOT_TOKEN` in sub-queries), #6242 (default valid time versus snapshot). | Issue states. [F] |
| **DECIMAL handling** | **No fix located.** #6329 (SUM over DECIMAL with all-NULL inputs returns 0) is open and "found by reading the code". The DECIMAL to BIGINT cast through a double from EXP-X02 has **no upstream issue** (search "DECIMAL BIGINT cast double" returned 0). The only `expression.clj` changes since 2.2.0 are interval-type renames; `DecimalVector.kt` is not in the diff. [I] Falsifier: probe `1e18 + 4` on the nightly image (E2). | Issue search; `git diff` of `expression.clj`. |
| **Window functions** | `RANK`, `DENSE_RANK`, `PERCENT_RANK`, `CUME_DIST`, `NTILE` still fail with an internal `AbstractMethodError` (#5959 open). PR #6335 that would add them was **closed without merging** on 2026-11-06. 2.2.0 already has `LEAD`, `LAG`, `ROW_NUMBER`. | `xtdb-issues/5959.json`, `pr6335.json`. [F] |
| **UNION ALL planning** | No UNION-specific change found. Related: #6354 (uncorrelated `IN`/`NOT IN` should probe a hash table) is open and is a prerequisite for the #6313 fix not to regress spilled `NOT IN`. | Issue text. [F] |
| **Changed-file performance relevant to P4 and P3** | Two opt-in compactor flags, both default **false** (`CompactorConfig.kt`): `reeIids` (`XTDB_REE_IIDS`, #5914) and `withinFileRecencyBranching` (`XTDB_WITHIN_FILE_RECENCY_BRANCHING`, #6042). #5914 says the writer ships off by default in 2.2.1 and becomes the default "a release later" (#6356). Docs commit `792bd2e13`: "once `reeIids` has been on, rolling back to v2.2 isn't supported". The nightly benchmarks run with REE on since `d742ccba9`. | `core/.../CompactorConfig.kt:15-17 @ d742ccb`; issues. [F] |

### 2.3 The R14 hazard list against main

| ID | Upstream | State at 2026-11-07 | Effect on us |
|---|---|---|---|
| H02 | #6313 | **Open.** Fix PR #6337 (created 2026-11-02, 0 comments) not merged. | Guard `(p) IS TRUE` still needed. |
| H03 | #6345 | **Fixed.** `6b5ae5c7a` (2026-11-03) via PR #6351 (merged 2026-11-04). Milestone 2.2.1. In `nightly-20261104` and later. | The XTQL reachability limit of 100k edges in EXP-X02 and the `XTDB_JOIN_SPILL_THRESHOLD` guard can be lifted after E2 passes. |
| H04 | #6151 | **Open.** One comment (2026-10-21) proposes making the pushdown opt-in per column; cost is a performance regression on nested inner joins. | Shape rejection still needed. |
| H05 | none | Not fixed; no issue filed. | Unchanged. |
| H06 to H08 | #6339, #6340, #6341 | **Open.** PRs #6343 and #6344 open. | Unchanged. |
| H09 | #6013 | Open. | Unchanged. |
| H10 | #6174 | **Fixed.** `4d43c0ffc` (2026-11-01). Milestone 2.2.1. | "Submit one transaction after restart before measuring" becomes unnecessary. |
| H11 | #5928 | Not checked on main beyond the open state at R14 time. | Unchanged. [I] |
| H20 | #6358 | **Fixed.** `fd336e917` (2026-11-05). Not on the 2.2.1 milestone list, but main is the 2.2.1 line. [I] | None for builders; removes an erasure caveat. |

### 2.4 Other main-only changes worth knowing

- **Authentication refactor, #5793, closed.** [F] Every wire frontend now authenticates through `Xtdb.Connection`; Flight SQL honors the node's rules and attributes writes to the user. The `forbidden` anomaly replaces some pgwire error codes. Not relevant unless Triplex uses Flight SQL.
- **Interval formatting and range, marked breaking (`!`).** [F] `2fc32bd2e`, `338732ff4`, `99f89d90e` change how intervals print, raise overflow past the range, and cast intervals inside lists to `#xt/interval`. #4320 removed `PeriodDuration`. We do not use intervals in builders. [I]
- **Memory cache (PR #6299, open).** [F] Pages become resident in direct memory from the node allocator, and "a container's memory limit now has to cover max heap plus max direct memory". Not in any image yet. It changes how slot memory in `slots.json` (`-Xmx1500m -XX:MaxDirectMemorySize=1g`) is judged.
- **Kafka Connect sink module removed** (`f39c90176`, breaking). [F] Not used.

---

## 3. Question 3: Upgrade cost and risk

### 3.1 QLever

**What the upgrade forces.**

1. **Convert or rebuild every index.** Run `qlever-upgrade-index <basename>` from the new image on a copy of the volume. It needs space for the temporary copy plus the old index (`index-in-old-format.<date>`), about 2x index bytes [I], which is the same envelope as `slots.json` already assumes for a rebuild. Its speed on index A is unknown (author claim only).
2. **Drop or discard persisted deltas.** `.update-triples` stores `Id`s. Do not carry it across; replay the host log. [I] R13 already describes this path.
3. **Receipts start a new series.** TARGETS 4.1 item 2 binds the engine image digest and configuration hash into every receipt, so an upgrade is a new composition identity and every baseline for that lane reruns.

**What to re-qualify.** [F for the lists; the pass criteria are in `lab/SCORECARD.md` section 5]

| Item | Why | Cost |
|---|---|---|
| G0 | Pure unit tests; no engine. | Minutes. |
| G1 unchanged44 (88 results, current and reopen) | Planner and semantic fixes in section 1.5 item 5. | The XTDB G1 receipt id is stamped 19:05:28 and the G2 receipt id 19:06:22, so G1 took at most about a minute. [I from receipt ids] |
| G2 native142 (planner 100 and planner 1 variants) | Same. | Minutes. |
| G4 counterexamples | Expected to stay FAIL (16 executions); a changed count is a signal in either direction. | Minutes. |
| G5 write semantics and the C2 crash matrix | #3175, #3806, #3727 change failure cases 2, 7 and 8 in R8. | Under an hour. |
| R5 semantic blockers list | Several fixes land in the areas R5 lists. | Re-run the probes. |
| R17 precision validator (`precval.py`, `prec.py`) | The 60-bit wrap is unchanged by source. The validator is the guard; rerun to confirm 0 wrong round trips. | Minutes. |
| R20 ICU order check | Comparator and locale code are unchanged for non-WKT words and both images use `libicu74`. R20's own check ran on system ICU 78.1, so rerun against the **new image's** ICU with the same 300,000 random pairs. | About 25 s plus image start. |
| R8 failure cases 1 to 8 | Cases 2, 7 and 8 should now pass. | Under an hour. |
| Adapter: `packages/qlever` update response handling | Response metadata key rename. | Minutes. |

**Reference repos.** [F] `references/qlever` stays at `6c5861a` as the source for all existing `@ 6c5861a` cites. Add a second clone at the experiment SHA instead of re-pinning, or the R8 and R17 line numbers go stale. `references/qlever-control` needs **no change**: its `HEAD` is still `84bdd27435bd93f2dc70269c30eefbb8d36d916e`. (The repository now redirects to `qlever-dev/qlever-control`; `qlever upgrade-index` exists in the CLI per commit `28d3efd7`, and our flows call the HTTP endpoint.)

**Wire protocol and query language.** HTTP and SPARQL endpoints are unchanged in shape. Breaking items: the JSON response key (section 1.5 item 2), the parameter renames (item 3) and the SPARQL tightenings (item 5).

**Risk.** [I] Medium. The formats and parameters are documented and gated by a version check. The risks are a changed answer in G1 to G4 and an update path that behaves differently under our touch pattern (section 1.2, worst case of #3607). No data risk if the converter is run on a copy.

### 3.2 XTDB

**What an upgrade to 2.2.1 forces.** [I] Nothing structural, because it is a patch line on the 2.2 log format. Rolling from `2.2.0` to `2.2.1` is the same node generation. Two flags (`reeIids`, `withinFileRecencyBranching`) change file layouts and default off, so leave them off. If either is turned on, rolling back to 2.2.0 is unsupported per docs commit `792bd2e13`.

**What to re-qualify.**

| Item | Why |
|---|---|
| G0, G1 (88), G2 (142; XTQL and SQL counted separately; today strict XTQL 0, SQL 58, hybrid 13) | The expression engine's temporal arithmetic was rewritten (#6286, #4320) and `SUBSTRING` fixed (#6257). Counts should not move. |
| R14 probes `p1-6345`, `p1-6151`, `p1-6358`, H02, H05 to H09, H10 | H03, H10 and H20 should flip to fixed. The rest should stay broken. |
| EXP-X02 DECIMAL cast probe | To confirm the hazard persists. |
| EXP-P2X commit smoke and EXP-X05 follower smoke | Confirms zero change in P2 and follower lag, which the zero-diff files predict. |
| Slot memory | Only if #6299 ships. |

**Reference repos.** [F] `references/xtdb` and `references/xtdb-driver-examples`: re-pin `xtdb` to the `v2.2.1` tag when it exists; nothing else needs to move. Cites in R14, R16 and R19 to `ElectionDriver.kt`, `ReplicaLogAppender.kt`, `LocalLog.kt`, `ReadOnlyLocalLog.kt` and `ServerConfig.kt` stay valid because those files have zero diff (section 2.2). Cites to `Database.kt`, `BlockCutter.kt`, `LogProcessor.kt` and `FollowerLogProcessor.kt` may shift, so keep writing `@ c6c1962` on them.

**Wire protocol and query language.** [F] None beyond interval printing and range. The 2.1-to-2.2 breaking changes (precedence, `GENERATE_SERIES`, `USER`, unknown tables error) are already in our baseline.

**Risk.** [I] Low. The fixes are local, and the high-risk areas (log, heartbeat, followers) did not change.

### 3.3 Which running experiments change

| Experiment | Changes? | Why |
|---|---|---|
| **EXP-P2Q** (QLever log plus broker, running) | **No change to the design.** Add one arm: `--persist-updates` off (works on 0.6.0). Keep arm A0 on the 0.6.0 digest so its comparisons stay in one series. | Section 1.3. The overlay is still required for P2 as written. |
| **EXP-X05** (XTDB read follower) | No. | `ReadOnlyLocalLog` and the `numThreads` default are identical, and follower processing differs only by a refactor. Rerun on 2.2.1 as a smoke. |
| **EXP-P2X** (XTDB commit and feed) | No. | `LocalLog`, `LeaderLogProcessor` semantics identical; no CDC exists to test. |
| **EXP-X02** (XTQL parity) | One item: the 100k-edge reachability refusal for #6345 can lift on 2.2.1. | H03 fixed on main. |
| **EXP-N01 / EXP-W01** (north-star bench, golden scenarios) | Only if a lane image changes, and then the baselines for that lane rerun. | Receipts bind the image digest. |

---

## 4. Question 4: Recommendation per engine

### 4.1 QLever: run a side-by-side experiment, do not upgrade the lane

1. Run E1 (section 5) on the control, #3607 and newest-master images, with and without `--persist-updates`.
2. Keep EXP-P2Q on 0.6.0 and keep the overlay (section 1.3).
3. Add `--persist-updates` off as an arm of EXP-P2Q now. It is a 0.6.0 lever and may remove 45 ms at 500k delta on its own. [E]
4. Revisit when #3612 and #3663 merge or a tagged release appears. Both PRs have had no activity since 2026-10-09, so I would not wait for them. [F][I]
5. Erasure stays on the two answers R15 and R17 gave (crypto-shredding, or a full reindex). `--rebuild-keep-previous-index-dirs none` is a cheap addition (E5).

### 4.2 XTDB: stay pinned now, re-qualify against 2.2.1 when it is tagged

1. Do nothing to the lane today. `2.2.0-1` changes only the base image, so adopting it buys nothing but a new digest.
2. When `v2.2.1` is tagged, run E2. It fixes #6345 (a silent wrong answer on `EXISTS` and `IN` over more than 100,000 rows), #6174 and #6358, and it leaves the Local log, heartbeat and read-only log code untouched.
3. Do not adopt `edge` or nightlies for results. REE and recency flags are being turned on in upstream benchmarks, and rolling back after turning them on is unsupported.
4. File nothing yet. The DECIMAL cast and `ANY` grammar findings have no upstream issues (H05 and the EXP-X02 hazard). Whether to report them upstream is Sam's decision, because it sends our findings to a public tracker.

---

## 5. Ranked experiments with falsifiable predictions

Every number below is an `[E]` estimate stated before any run, built from the phase tables in R17 and R8 and the PR texts in section 1.2. Each experiment names the priority it moves and the prior numbers it extends.

**Ranking.** The tie rule in `lab/NORTH-STAR.md` (higher priority first) would put the P1 checks E3 and E4 ahead of E1. I ranked E1 first for three reasons. It can change a running experiment (EXP-P2Q, the persist-off arm and the overlay decision). E3 and E4 reuse its index upgrade and images. E3 and E4 predict mostly no change. If the pool admits one slot only, run one session in this order: upgrade the index, E1, E4, E3. Sam can override the order.

### E1. QLever update cost by version and by persistence (P2) [rank 1]

**Question.** How much of the 129 ms ACK at 500k delta do #3607 and `--persist-updates` account for, and does anything get under the P2 bar?
**Fixture.** R17 index A (68.98M triples), upgraded once per image family with `qlever-upgrade-index` (record upgrade time and triple count). Reuse `R17-qlever-northstar/scripts/broker_e2e.mjs` (host fsync, guarded update, new connection per request, 94-triple command, 150 commands per cell) and `fill_delta.py` to reach delta 0, 100k and 500k. Server flags as in R17 (`-j 4 -m 600M -c 128M -e 64M --no-patterns --no-access-check --no-metrics-log`), 2 CPUs. One slot, adjacent runs, ratios judged inside a window because host noise moves absolutes 2x to 3x [R17].
**Arms** (all by digest from section 1.1; each row runs persist on and, where marked, off):

| Arm | Image | Persist on | Persist off |
|---|---|---|---|
| A0 | `0.6.0` | yes | yes |
| A1 (control) | `commit-ab6d1bee01` | yes | no |
| A2 | `commit-b2939267bd` (#3607) | yes | yes |
| A3 | `commit-4b9df11d36` (master 2026-11-07) | yes | yes |

**Predictions** (ACK p50 in ms from the host at delta 0 / 100k / 500k; tolerance 15% on each cell unless noted).

| Arm | Predicted p50 | What it falsifies if wrong |
|---|---|---|
| A0 persist on | 11 / 34 / 129 | Replication of R17 (tolerance 25%). Outside it, the window is not comparable; rerun. |
| A0 persist off | 10 / 27 / 84 | If 500k p50 is above 105, the disk write-back is not the 45 ms I attribute to it. |
| A1 persist on | 11 / 34 / 129 | If 500k is below 100 or above 150, some other change before #3607 moved update cost. |
| A2 persist on | 11 / 31 / 105 | A2 minus A1 at 500k should be between -35 and -10 ms. If A2 is within 4 ms of A1, the block-clone cost cancels the gain on our touch pattern (the PR's own worst case) and #3607 is worth nothing to us. |
| A2 persist off | 10 / 24 / 60 | p99 at 500k at most 150 ms (A0 persist on: 318). |
| A3 persist on / off | within 15% of A2 | If A3 differs from A2 by more than 20% at 500k, bisect the 202 commits between them. |

**Further predictions.**
- No arm has a delta-0 p50 below 9 ms. If one does, the overlay argument in section 1.3 weakens.
- A tiny query over a keep-alive connection on A3 has p50 at least 30 ms (R17: 41.8). If it is under 5 ms, `TCP_NODELAY` effectively landed some other way.
- `qlever-upgrade-index` on index A takes at most 10% of the time to rebuild the same index from source data, and the upgraded index returns the same triple count and 0 mismatches over the 20 ledger pulls R17 used.

**E1b, recovery cost of persistence off (same fixture, A0 and A2).** `kill -9` the server at delta 500k, restart with no persisted file, replay the broker log tail through grouped updates (64 commands per request). Prediction: replay completes in 8 to 30 s with the triple count equal to the pre-kill count and 0 missing positions; the persist-on restart takes at most 6 s (R8: 4.5 to 9 microseconds per triple). If persist-off recovery exceeds 60 s, the lever is too expensive for GS.04.
**Decision rules.** If A2 persist-off 500k p50 is at most 60 ms and p99 at most 150 ms, R17 option B (bounded delta) is worth re-costing at a larger delta. If every arm has a delta-0 p50 above 9 ms, the overlay stays.

### E2. XTDB 2.2.1 re-qualification (correctness floor, P2/P3 no-regression) [rank 2]

**When.** The day `v2.2.1` is tagged. A rehearsal on `nightly-20261106` (`sha256:84de41e1...`) can run now for the H03, H10 and H20 probes only, because it also carries unreleased flags.
**Fixture.** G0, G1, G2, R14 probe files, EXP-P2X and EXP-X05 smoke configurations, two engine slots (2.2.0 and the candidate), same host window.
**Predictions.**
- G1 88 of 88 and G2 142 of 142, with the same strict-XTQL, SQL and hybrid counts (0 / 58 / 13). Any count change is a finding.
- H03 probe: a mark join with 100,001 or more build rows returns the oracle's marks for 100% of probe rows on the candidate. On 2.2.0 it returns false for every row (R14 [P]).
- H20 probe: `FOR SYSTEM_TIME FROM a TO b` ending before an `ERASE` returns 0 erased rows on the candidate, more than 0 on 2.2.0.
- H10 probe: after a restart with no new transaction, queries plan over the compacted files (scan of L0 files avoided).
- H02, H04, H05, H06 to H09 still reproduce on the candidate. If any is gone, update R14.
- EXP-X02 DECIMAL probe: `1e18 + 4` cast to BIGINT still reads back as `1e18`.
- P2 commit p50 and p99 for 10 facts with 4 readers within 10% of the 2.2.0 numbers from EXP-P2X. Follower commit-to-visible lag p50 within 20% of EXP-X05's.
**Falsifier for "stay pinned" being the right call.** A regression of more than 10% in commit p99, or any G1 or G2 change, argues for staying on 2.2.0 longer.

### E3. QLever ledger query shapes on newest master (P1 past-basis reads, P3 QLever-side feed) [rank 3]

**Fixture.** Index A upgraded, images A1 and A3 from E1, R17 `pin2.py` (ledger pull through `UNION` of constants, at most 8 entities) and `b_feedq.py` (`rp` range, `VALUES` of 100 transaction IRIs, `UNION` of 10 constants). Cache cleared before each run, 5 runs, median.
**Predictions** (R17 values on 0.6.0 in parentheses). A3 within 25% of A1 on every shape: `FILTER(?rp <= P)` over the 8.5M-row `c:rp` scan 0.6 to 0.9 s or HTTP 500 at `-m 600M`; `VALUES` of 100 IRIs 2.2 to 3.3 s; ledger pull 198 ms p50. No shape improves by more than 2x.
**Why it matters.** If a shape improves by more than 2x, or the 500 turns into a result, the kernel-side filtering workaround in R17 section 1.5 can be simplified and past-basis reads (200 to 500 ms) get cheaper.

### E4. QLever read and writer interference on newest master (P1, P5) [rank 4]

**Fixture.** R17 `b_p1.py` ladder of 1, 4, 16 readers with the writer at 1.5 commands per second, and `rebuild_load.py` with 16 paced readers at delta 500k, on A1 and A3, `-j 4`, 2 CPUs.
**Predictions.** Read goodput within 15% of 65 pulls/s at 4 and 16 readers. Writer p50 at 4 readers within 25% of 114 ms. During a rebuild with `rebuild-index-max-num-threads` unset, read p50 at least 5x its pre-rebuild value (R17: 13x). With `rebuild-index-max-num-threads` set to 1, rebuild wall time rises by at most 3x and read p50 rises by at most 5x.
**Falsifier.** If goodput or writer latency improves by more than 30%, the thread-model changes (#3715, #3651) matter for P1, and R17 sections 1.2 to 1.4 need new numbers.

### E5. QLever erasure cleanup on the pinned image (requirement: real erasure) [rank 5]

**Fixture.** 0.6.0 only. Insert 5 marker literals, delete them, run `cmd=rebuild-index` with `--rebuild-keep-previous-index-dirs none`.
**Predictions.** No `previous.*` directory remains. The marker bytes are still present in the rebuilt vocabulary files (at least 1 hit per literal; R17 saw 60,020 words against 60,015 in a control index). A reindex from a dump that excludes the literals has 0 hits in every file and in the server log. Record reindex wall time on index A.
**Why on 0.6.0.** The option exists there, and nothing in master changes the answer (section 1.4).

### E6. XTDB recency and REE flags for recent-window reads (P3 poll, P4 flatness) [rank 6, after 2.2.1]

**Fixture.** `nightly-20261106` or 2.2.1 with `XTDB_WITHIN_FILE_RECENCY_BRANCHING` and `XTDB_REE_IIDS` each on and off, a table with one week of superseded rows, `EXPLAIN ANALYZE` pruned-versus-used rows.
**Predictions.** A one-hour recent-window scan (the shape of a ledger poll by system time) reads at least 5x fewer rows with the recency flag on. P4 flatness holds in all four combinations (bytes read at history depth 10 at most 1.1x depth 1). Commit p99 unchanged within 10%.
**Gate.** Only if the flags are on by default in a release, or Sam wants a polled feed from XTDB tables. Turning them on makes rollback to 2.2.0 unsupported.

---

## 6. Open questions

1. **When does XTDB 2.2.1 ship?** The milestone is fully closed; no date was found. E2 waits on it.
2. **Will #3612 and #3663 merge?** Both are untouched since 2026-10-09 (0 and 2 comments). I cannot tell from public data.
3. **How many blocks does index A have?** It decides how much of the 41 ms metadata phase #3612 can save. `.meta-data.json` or the server's index statistics should show it.
4. **What does #3607 cost under our touch pattern?** A 94-triple command touches several blocks in each of six permutations, and the active set is Zipf-heavy. The PR calls out that when every update touches every block the saving vanishes. E1 A2 versus A1 measures it.
5. **Does `qlever-upgrade-index` run in the lab's memory slots?** The slot `s*` limits are 3.5 GiB; the converter's memory is unknown.
6. **Does Sam accept a relaxed P2 p50 (for example 15 ms)?** The answer decides whether the overlay is a requirement or an option once #3612 and #3663 land (section 1.3).
7. **Should the DECIMAL-to-BIGINT cast and `ANY` precedence findings go upstream?** No issue exists for either. Sending them publishes lab findings.
8. **Does the keep-alive delay persist?** Code is unchanged; E1 checks it with one query.
9. **Is the QLever `latest` tag acceptable anywhere?** It moves with every master build. Every use in a receipt must name a `commit-` tag and a digest.
10. **When `reeIids` becomes default (#6356), do we follow?** It makes rollback past that release unsupported.

## Appendix: raw material index

All under `/Users/sam/Claude/Projects/triplex-db-2/R21/`.

| File or directory | Content |
|---|---|
| `qlever-releases.json`, `qlever-release-notes-v0.6.0.md`, `qlever-release-notes-latest-master.md` | GitHub releases and notes |
| `qlever-commits-since-v0.6.0.txt` | 404 commit subjects, `v0.6.0..master` |
| `qlever-dockerhub-tags.json` | Docker Hub tag page (newest 40) |
| `qlever-pr-{3267,3607,3611,3612,3663,2386,3151,3899,3888,2886,3884}.json` | PR and issue bodies |
| `qlever-Dockerfile-{v0.6.0,master}` | Dockerfiles |
| `src/qlever/{v0.6.0,master}/...` | Source files at the two SHAs (Server, HttpServer, Qlever.cpp, DeltaTriples, IndexRebuilder, IndexFormatVersion, FoldedValueId, RuntimeParameters, ServerMain, Constants, LocaleManager, StringSortComparator) |
| `qlever-blobless/` | Blobless git clone (commit messages, `git log`) |
| `xtdb-releases.json`, `xtdb-release-notes-v2.2.0.md`, `-v2.1.1.md` | GitHub releases and notes |
| `xtdb-compare-v2.2.0-main.json`, `xtdb-commits-since-v2.2.0.txt` | 129 commits, `v2.2.0..main` |
| `xtdb-milestone-61.json`, `xtdb-milestones*.json` | 2.2.1 milestone |
| `xtdb-ghcr-tags-all.json` | All 876 GHCR tags |
| `xtdb-issues/*.json` | Issues and PRs 6313, 6337, 6151, 6345, 6351, 6358, 6339 to 6344, 6013, 6232, 6039, 5198, 6209, 6242, 6174, 6042, 5914, 5793, 6169, 2454, 5837, 6023, 6299, 5864, 6335, 6329, 6038, 5507, 5959, 6354 |
| `src/xtdb/{v2.2.0,main}/docs/...` | Authorization and databases docs at both SHAs |
| `xtdb-blobless/` | Blobless git clone (used for `git diff v2.2.0 d742ccba9`) |
