# R35: what QLever's update delta costs, and whether the Q lane ever rebuilds

Planner: R35 (Opus 5.5, high), 2026-11-08. Status: complete.

North star: **P1** (pinned reads stay fast at 256 readers), **P4** (current pull p50 5 ms, p99 25 ms) and **P5** (100k-subject
sweep in 100 s), all on the QLever lane. Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure
`lab/PROTOCOL.md`. TARGETS section 1.1 P1 item 3 already names "QLever index rebuild or delta merge" as a required maintenance
event inside every P1 window.

Pinned source: `references/qlever` at tag `v0.6.0` (commit `6c5861a6`). All `file:line` citations are relative to
`references/qlever/src/` unless a path says otherwise.

Trigger: EXP-C8 round 4 (`.claude/worktrees/agent-a7aa958fb271ddb16/lab/experiments/EXP-C8-read-only-frontier/REPORT-round4.md`).
On qlever-dev, `cmd=stats` reports a base index of 1 triple, about 1.8M triples live in named graphs added by SPARQL UPDATE,
a graph-scoped base SELECT returning 5 rows takes 4 to 6 s, its OPTIONAL joins cost 693 to 864 ms each, and planner estimates
are far from actual cardinalities.

## Summary

| Question | Answer |
| --- | --- |
| 1. What the delta costs | Per permutation, delta triples are attached to base blocks. A scan decompresses each touched block, merges **all** of that block's deltas, graph-filters and de-duplicates the whole merged block, and only then narrows to its range. Cost is linear in **per-block delta**. With qlever-dev's 1-triple base, per-block delta is about 895k (half the 1.8M), so every scan costs 160 to 530 ms for 1 to 3 rows. Nearly all ids are local-vocab ids, which compare by ICU collation on strings rather than by integer. Monotonic IRIs concentrate deltas in tail blocks even on a large base. OPTIONAL joins cost nothing themselves; their child scans carry the cost. |
| 2. Rebuilding | 0.6.0 has an online `cmd=rebuild-index` and an automatic `--rebuild-index-strategy`. At 820M triples on 2 CPUs: about 5 to 11 min, 2x the index on disk, no real erasure, broken by bug #3172. An offline `qlever-index` from the log takes 30 to 45 min plus the fold, off the live path, and does give real erasure. For qlever-dev today: about 1 to 3 s. |
| 3. Design assumptions | R2, R8, R13, R17 and PLAN all assume a built base with a bounded delta (rebuild near 1M delta, or generations from the log). **No rebuild loop is built or measured on the lane.** The lane starts from a one-triple bootstrap index and resets qlever-dev with `--fresh`. The only rebuild code is an unmerged, never-run P2Q trigger. |
| 4. Measurement | Six read-only probes are done (section 1.6). Next: before and after probes around one orchestrator-approved rebuild of qlever-dev, then a 90-minute s1 run that varies N from 0 to 1.5M for monotonic and spread keys (section 4). |
| 5. Recommendation | T1 now: a built base everywhere, plus online rebuild on a delta threshold. T2 for P1 replicas and P5: blue/green generations rebuilt from the log, with generation leases for multi-request reads and Q89i byte-identity checked across every swap. Bounding the delta per graph does not help; the unit that owns a delta is the server. Brief EXP-QG1 is in section 5.3. |

---

## 1. How QLever 0.6.0 stores update triples, and what a scan pays for them

### 1.1 The data structure

| Piece | What it is | Source |
| --- | --- | --- |
| `DeltaTriples` | All triples inserted or deleted since the index was built. Two hash sets (`triplesInserted_`, `triplesDeleted_`) plus, per permutation, a `LocatedTriplesPerBlock`. | `index/DeltaTriples.h:77-92`, `:158-172` |
| Six permutations, plus two internal ones | PSO, POS, SPO, SOP, OPS, OSP each get their own located-triples structure. Every update triple is located six times (eight with the internal PSO/POS used for language tags). | `index/DeltaTriples.h:28-32`, `:145-154`, `:350-359` |
| `LocatedTriple` | One delta triple in one permutation: the base block index it belongs to, the permuted ids (with graph), and an insert/delete flag. | `index/LocatedTriples.h:76-107` |
| Block assignment | Binary search over the base block metadata: a triple belongs to the first block whose last triple is greater than or equal to it. A triple larger than every base triple goes to a virtual block one past the last block. | `index/LocatedTriples.cpp:24-56`, `index/LocatedTriples.h:292-314` |
| `LocatedTriplesPerBlock` | A hash map from block index to a sorted sequence of located triples for that block. | `index/LocatedTriples.h:117-121` |
| Augmented metadata | After every update, each touched block's first and last triple are widened to cover its deltas, and the update-only tail block is appended with `numRows_ = 0` and no on-disk offsets. | `index/LocatedTriples.cpp:466-508` |
| Base block size | 250 kB uncompressed per column, about 31,000 ids per block. | `index/ConstantsIndexBuilding.h:95-102` |
| Snapshots | A query takes a shared pointer to a copy of the located-triples state; updates are serialized on one update thread and publish a new state. | `index/DeltaTriples.h:280-289`, `:417-471`; `engine/Server.cpp:413-420` |

### 1.2 What a scan does with the delta

1. **The scan finds its blocks from the augmented metadata.** Any block whose widened first/last range overlaps the scan prefix is
   read. The update-only tail block spans from its smallest to its largest delta triple, so every scan whose prefix falls in that
   range reads it (`index/LocatedTriples.cpp:489-507`).
2. **The whole block is decompressed and merged before the scan range is applied.** `readPossiblyIncompleteBlock` builds a scan
   spec with no fixed columns (`specForAllColumns`), calls `readAndDecompressBlock`, and only afterwards narrows the result with
   `equal_range` on col0, col1 and col2 (`index/CompressedRelation.cpp:798-889`, the narrowing at `:840-883`).
3. **The merge walks every located triple of the block.** `mergeTriplesImpl` allocates `block.numRows() + numAdded` rows and walks
   both the base rows and the entire sorted delta list of that block (`index/LocatedTriples.cpp:143-229`). Its cost is linear in
   base rows of the block plus delta triples of the block, not in the rows the scan returns.
4. **Graph filtering and de-duplication then run over the whole merged block.** `decompressAndPostprocessBlock` calls
   `postprocessBlock`, which runs `remove_if` over every row with `isGraphAllowed`, then `std::unique` if the block may hold
   duplicates across graphs (`index/CompressedRelation.cpp:1168-1191`, `:310-363`). A block's graph list is kept only up to 20
   distinct graphs (`index/ConstantsIndexBuilding.h:106-108`); beyond that `graphInfo_` is empty, so the block can never be skipped
   by graph and always needs per-row graph filtering (`index/CompressedRelation.cpp:298-308`, `:365-374`;
   `index/LocatedTriples.cpp:440-463`). Any delta insert into a multi-graph block also sets
   `containsDuplicatesWithDifferentGraphs_`, which forces the `std::unique` pass (`index/LocatedTriples.cpp:455-462`).
5. **Nothing caches the merged block.** Every scan of a block with deltas re-merges it. The source notes this as a TODO
   (`index/CompressedRelation.cpp:962-964`, "We could cache the exact size as soon as we have merged the block once").

### 1.3 Why delta-only data is far slower per row than base data

1. **New strings become local-vocab ids.** IRIs and literals not in the base vocabulary are stored in the delta's `LocalVocab`
   (`index/DeltaTriples.h:121-123`, `:372-379`). On qlever-dev the base vocabulary is essentially empty, so nearly every subject,
   predicate, object and graph id in the 1.8M triples is a local-vocab id.
2. **Comparing two local-vocab ids is a collation string comparison, not an integer comparison.** `ValueId::compareThreeWay`
   compares raw bits only when neither side is a `LocalVocabIndex`; two local-vocab ids are compared through
   `LocalVocabEntry::compareThreeWay` (`global/ValueId.h:188-219`), which calls the vocabulary's ICU-backed case comparator at
   `LocaleManager::Level::TOTAL` (`index/LocalVocabEntry.cpp:11-25`, `index/LocalVocabContextImpl.cpp:15-19`). The source itself
   calls this "the much more expensive collation of the vocabulary" (`index/LocalVocabEntry.h:149-151`). `ValueId` equality is
   defined as `compareThreeWay == 0` (`global/ValueId.h:223-225`), so equality between two local-vocab ids pays the same price.
3. **Hashing a local-vocab id hashes its string** when it has no exact vocabulary position (`global/ValueId.h:434-448`). The graph
   filter's whitelist lookup is a hash-set lookup per row (`index/GraphFilter.cpp:35-45`).
4. **So every operator that sorts, merges, joins, de-duplicates or filters by id does string work per comparison.** That covers
   the scan's `std::unique`, `equal_range`, merge joins and the OPTIONAL joins C8 profiled. On a built index the same ids are
   vocabulary indexes and compare as 64-bit integers, and `compareWithoutLocalVocab` lets index building vectorize
   (`global/ValueId.h:229-240`).
5. **Size estimates are block-level upper bounds.** `numTriples(blockIndex)` returns the delta list's size for both "added" and
   "deleted" (`index/LocatedTriples.cpp:75-83`, comment at `index/LocatedTriples.h:140-155`). For a partial block the estimate is
   divided by `smallIndexScanSizeEstimateDivisor` (`index/CompressedRelation.cpp:925-942`). When one block holds most of the
   delta, every scan that touches it is estimated at a large fraction of the whole delta, whatever its real selectivity. This is
   the C8 finding that planner estimates differ sharply from actual cardinalities.

### 1.4 What this means on qlever-dev (1-triple base, about 1.8M delta triples)

```
 base index (1 triple)            per permutation, e.g. PSO
 +---------+                      block 0 (1 base row)   + delta list A  (triples <= the base triple)
 | block 0 |  1 row               block 1 (update-only)  + delta list B  (triples > the base triple)
 +---------+                      |A| + |B| ~= 1.8M, in two blocks, not ~60 blocks of 31k

 every scan on any predicate in range:  decompress block -> merge ALL of A or B -> graph filter ALL rows
                                        -> std::unique ALL rows -> equal_range down to the 5 rows it wanted
 every compare in that pipeline:        local-vocab vs local-vocab = ICU collation on two strings
```

1. **Per-block delta equals total delta.** With one base block, each permutation has at most two blocks carrying deltas, so every
   scan pays roughly the full 1.8M rows for its permutation, however selective its prefix is.
2. **This matches C8's numbers.** The graph-scoped base SELECT has several assertion-channel IndexScans and five OPTIONAL joins
   (REPORT-round4, profile section). Each scan pays an O(1.8M) merge, filter and unique with string-cost comparisons; 693 to 864 ms
   per OPTIONAL (including its lazy child scan) and 4 to 6 s per query follow. Eight readers run these in parallel on a 2-CPU slot,
   so per-request time rises to 8 to 16.6 s, as C8 observed.
3. **C8's GRAPH-scope evidence is consistent with this.** Removing the GRAPH changed output rows (2,858 to 1.79M) but barely changed
   time, because the per-block work is the same full merge either way. Adding `FROM NAMED` sometimes looked fast and sometimes did
   not; the cache key includes the delta version, so repeat timings on an unchanged delta can hit the query cache
   (`libqlever/Qlever.cpp`, `swapInRebuiltIndex` comment on the cache key) and are not stable evidence.

### 1.5 Expected cost as the delta grows

| Quantity | Grows with | Why |
| --- | --- | --- |
| One index scan | base rows of the touched blocks **plus delta triples located in those blocks** (per-block delta), times a string-comparison factor when ids are local vocab | 1.2 items 2 to 4 |
| One join or OPTIONAL | its input sizes, times the comparison cost; inputs come from scans, so per-block delta enters through them; bad estimates can also pick a worse plan | 1.3 items 4 and 5 |
| One update | linear in the triples it adds (six binary searches each), plus `updateAugmentedMetadata`, which copies and walks the **whole** block metadata vector on every update, plus a disk write of the whole delta when `--persist-updates` is set | `index/LocatedTriples.cpp:466-508`; `index/DeltaTriples.h:265-278` |
| Memory | total delta: six to eight located copies of every triple, the two hash sets, and the local vocab strings | 1.1 |

**Answer to question 1.** The read cost is linear in **per-block delta**, not in total delta, for a well-built base where deltas
spread over many blocks. It becomes linear in total delta when the deltas concentrate in a few blocks. Two things concentrate them:

1. **An empty or tiny base**, as on qlever-dev now: there are no block boundaries to spread over.
2. **Monotonic keys.** Delta triples sort into the block where their key falls. Triplex mints new subject, assertion and graph IRIs
   with increasing positions; in PSO and POS every new triple of a predicate sorts to the end of that predicate's range, so all
   new triples of a hot predicate pile into one tail block per predicate, and in SPO/SOP all new subjects pile into the tail block.
   Even with a large base, the hot predicates' tail blocks grow without bound until a rebuild. This needs measuring (section 4).

Separately, local-vocab ids make every comparison a string comparison. That constant factor disappears for any triple whose strings
are in the base vocabulary, which only a rebuild provides.

### 1.6 Read-only probes on qlever-dev, 2026-11-09 00:37 to 00:45 UTC

Six requests, run one at a time against `http://127.0.0.1:7070` with `Accept: application/qlever-results+json` so each answer
carries QLever's runtime tree. Raw JSON is in `/Users/sam/Claude/Projects/triplex-db-2/R35/probes/`. Every request was computed,
not served from the cache. Writers from other agents were active: the same scan's estimate moved from 179,018 to 179,044 between
probes.

| Probe | Query shape | Rows | Wall ms | Scan ms | Planner estimate |
| --- | --- | ---: | ---: | ---: | ---: |
| `stats` | `cmd=stats` | n/a | n/a | n/a | base: 1 triple, 1 subject, 1 predicate, v0.6.0 `6c5861a` |
| `discover` | `GRAPH ?g { ?s ?p ?o } LIMIT 3` | 3 | 529 | 528 (OPS) | **1** |
| `base-point` | `<urn:triplex:bootstrap> ?p ?o` (the one base triple) | 1 | 350 | 348 (SPO) | 179,018 |
| `delta-point` | `GRAPH ?g { <one delta subject> ?p ?o }` | 1 | 160 | 159 (SPO) | 179,018 |
| `delta-optional` | the point lookup plus `OPTIONAL { <same subject> <pred> ?q }` | 1 | 610 | 184 + 422 (SPO, PSO) | 179,044 and 184,187 |
| `delta-pred` | `GRAPH ?g { ?s <one predicate> ?o }` | 2 | 386 | 385 (PSO) | 184,187 |

What the probes show:

1. **Every scan costs 160 to 530 ms whatever it returns.** One to three rows each. On a built base R2 measured about 3 ms for a
   lookup of an entity in the base (R2 section 1.6) and R17 measured a direct subject scan with about 70 page faults.
2. **There is no base-backed control on qlever-dev.** The single base triple shares its SPO block with every delta subject that sorts
   before it, so the "base" lookup paid the same merge (348 ms). A real comparison needs a dedicated slot (section 4.2).
3. **The estimate reveals the block size.** With `small-index-scan-size-estimate-divisor = 5` (`global/RuntimeParameters.h:123-124`),
   an estimate of 179,018 for a partial block means about 895,000 delta triples in that one SPO block, half the resident's
   1.8M. This matches section 1.4: two blocks per permutation.
4. **The full-scan estimate is 1.** It is taken from the base statistics, which do not count deltas, so the planner thinks a
   1.8M-row scan is a 1-row scan. Selective scans are estimated at about 180,000 rows. Both errors come from the delta, not from
   the application's queries.
5. **OPTIONAL itself is free; its child scan is not.** In `delta-optional` the Join took 1 ms and the Optional 0 ms; the 607 ms are
   the two scans. C8's "693 to 864 ms per OPTIONAL" is the cost of the lazy child IndexScan that each OPTIONAL pulls, one full
   block merge each.

Upstream agrees on the tail block: draft PR #3151 (opened 2026-07-30, not in 0.6.0) says triples sorting after all main-index
triples share one synthetic block and are materialized as one table at scan time, "the same as current behavior"
(https://github.com/ad-freiburg/qlever/pull/3151). The QLever docs call update triples "less optimized structures" and present
`rebuild-index` as the workaround until a continuous background merge exists (https://docs.qlever.dev/rebuild-index/).

---

## 2. Rebuilding: how QLever folds the delta into a new base

### 2.1 Three ways, all in 0.6.0

| Way | How | Online? | Source |
| --- | --- | --- | --- |
| A. `cmd=rebuild-index` | Takes the published located-triples snapshot, merges the local vocab into a new vocabulary, recomputes statistics, then streams each permutation's merged scan (already in that permutation's order, so no external sort) into new permutation files. Then, on the single update thread, re-applies every update that arrived during the build as a remapped diff, moves the old index to `previous.<date>/`, swaps the new one in and clears the query cache. In-flight queries keep their own (index, views) snapshot. | Yes. Queries and updates keep running. A second request gets HTTP 429. | `engine/Server.cpp:567-580`, `:1635-1739`; `libqlever/Qlever.cpp:754-815`; `index/IndexRebuilder.cpp` (vocab merge `:72-156`, per-permutation stream `:270-336`, phases `:447-632`); `index/DeltaTriples.h:317-336` |
| B. `--rebuild-index-strategy automatic:min:max:fraction` | Runs A in the background when inserted plus deleted delta triples reach `clamp(fraction x base triples, min, max)`. Checked after every update. Default `manual`. | Yes | `engine/RebuildIndexStrategy.h:29-79`; `ServerMain.cpp:168-177`; `engine/Server.cpp:1416-1423`, `:1742-1772` |
| C. Offline `qlever-index` from a dump | Build a fresh index from N-Quads (R13: fold the log of record into sorted N-Quads, then `qlever-index -F nq`), start a second server on it, switch readers. | The old server keeps serving; the switch is ours to build. | `IndexBuilderMain.cpp:212-232` (R13 section 4); R13 section 4.3 generation protocol |
| (not a fold) `cmd=vacuum-delta-triples` | Drops only redundant inserts (already in the base) and redundant deletes (not in the base). Leaves real deltas in place. | Yes | `engine/Server.cpp:521-550`; `index/LocatedTriples.cpp:257-376` |
| (not a fold) `cmd=clear-delta-triples`, or `engine.mjs --fresh` | Discards the delta. Loses data. This is what qlever-dev gets today (`lab/config/slots.json` qlever-dev note; `lab/STATE.md:111-114`). | n/a | `engine/Server.cpp:497-520` |

Knobs for A in 0.6.0: `rebuild-index-scan-num-threads` (default 1), `rebuild-permutation-writer-num-threads` (default 1),
`rebuild-max-concurrent-permutation-pairs` (default 0 = all four pairs, 8 writer threads); `--rebuild-keep-previous-index-dirs`
(default keeps the original and the most recent previous index). A runs on the query thread pool, so `-j` must be at least 2
(R8 section 2 item 1; `engine/Server.cpp:1679-1683`).

### 2.2 Measured and extrapolated cost

Measured inputs (all prior lab work, same image):

| Source | Index | Way | Wall | Conditions |
| --- | --- | --- | --- | --- |
| R2 section 1.7 | 12.04M (11.94M base + 100k delta) | A | 4.8 s; peak RSS 1.33 GB | 2 CPUs, idle |
| R8 section 2 | 9.2M / 50.3M / 99.4M (1M delta each) | A | 3.0 / 19.6 / 28.2 s idle; 51.3 s loaded at 99M | 3 CPUs; 2.6 to 3.5M triples/s idle; peak RSS +0.45 to 0.6 GB |
| R17 section 1.4 | 69M + 500k delta | A | 53.9 s | 2 CPUs, 16 paced readers and a writer; read p50 108 ms to 1.4 s, write p50 250 ms to 13 s during it |
| R17 section 1.4 | 9.46M (current graph only) | A | 5.2 s idle, 6.7 s with writes | 2 CPUs |
| R2 section 6.1, R17 | 69M | C (`qlever-index` from N-Triples/N-Quads) | 161 s | 2 CPUs, 0.32 to 0.46M triples/s; peak RSS set by `num-triples-per-batch` |
| QLever docs | 500M / 10B | A | under 1 min / about 20 min | 16 cores, NVMe |

Year-one size. TARGETS section 2: 10M entities, 100M active facts. R13 section 4.1 sizes the current graph plus the compact
ledger at 100M facts as about **820M triples**; retained history adds 150M to 500M facts a year (about 1 to 3.5B more ledger
triples a year at 7 triples per assertion, R17) if history stays in the same index.

| Way | 820M triples, 2 CPUs (one lab slot) | 820M triples, 6 CPUs | Disk during the switch | Extra memory |
| --- | --- | --- | --- | --- |
| A online, idle | about 5 to 6 min [E] (2.5 to 3.5M triples/s) | 4 to 5 min [E, R8] | about 2x the index: 820M x 20 to 26 B = 16 to 21 GB, so 33 to 43 GB, 3x with the default keep policy | +0.5 to 0.6 GB RSS, plus the vocabulary merge term, which grows with distinct words [R8] |
| A online, under the P1 load | about 11 min [E] (R17's loaded 1.28M triples/s), with reads 13x and writes 50x slower in that window | 7 to 9 min, planning range 10 to 20 min [R8] | same | same |
| C from the log, separate process | 30 to 43 min `qlever-index` [R13 table, R2] plus a log fold of minutes to tens of minutes [R13] | 1.5 to 2.5x faster [R2] | old and new index on disk, plus the N-Quads (93 GB raw, 7 to 16 GB zstd) [R13] | 1 to 3 GB with `num-triples-per-batch` set [R2] |

Two facts decide the choice:

1. **A is cheap and keeps ids exact, but it is not real erasure.** It copies ids as they are (only vocabulary ids are remapped,
   `index/IndexRebuilder.cpp:270-336`), so numeric encodings round-trip unchanged. It keeps every deleted literal in the vocabulary
   (R17 finding 4: 60,020 words against 60,015) and in `previous.*`. It bakes in any partial update that is published at the time
   (R8 S3). Upstream bug #3172 reproduces on 0.6.0: one `IRI()`/`BIND`-built term in any past update makes every later
   `rebuild-index` fail with HTTP 400 (`lab/NOTEBOOK.md:313-315`). It runs inside the live server and takes its CPUs.
2. **C is slow but independent.** It runs on other cores or another slot, gives real erasure, and is the same code path as recovery.
   R13 warns that the index builder does not wrap integers the way UPDATE does, so C needs a rebuild-equivalence test (byte-equal
   answers before and after) before any reader is switched.

**Answer to question 2.** Yes: 0.6.0 folds deltas online (A, and its automatic trigger B), and the lab's design can rebuild from
the log (C). At 820M triples, A costs about 5 to 11 minutes on a 2-CPU slot and 2x the index on disk; C costs 30 to 45 minutes
plus the fold, off the live path. At qlever-dev's present size (1.8M triples), A would take about 1 to 3 seconds.

---

## 3. What the lane's design assumes, and what is built

### 3.1 The documents

| Doc | Does it assume QLever is rebuilt? | From what | Built or measured? |
| --- | --- | --- | --- |
| R2 (capabilities) | Yes. Rule: bounded delta; online `rebuild-index` is the compaction (section 1.7). Shows delta-filled predicates read 480 to 820 ms against 5 ms, and 7.5 ms after a rebuild (section 1.6). | the live delta (A) | A measured once on a probe container |
| R8 (write lifecycle) | Yes. "Rebuild at 750k to 1M delta triples, writer backpressure at 2M" (finding 6). | A | A measured under load at 9M to 99M triples on a probe |
| R13 (log of record) | Yes, and it is the core of the design: the index is "a rebuildable cache"; checkpoints are folded from the log; `qlever-index -F nq`; crash-safe generation directories with `CURRENT`, `MANIFEST`, `COMMITTED` (sections 4, 4.3, 6.4). Replay through UPDATE below a 50M-triple suffix, rebuild above it. | the log (C) | protocol model-checked (520 states, 5 mutants caught); **never run against QLever** ("untested because no QLever was started", section 4.3) |
| R17 (north-star fit) | Yes. Read replicas fed from the log; "do rebuilds on a standby generation and swap (R13 section 4.3) so live replicas never run a rebuild" (section 1.6); P5 sweep on a frozen generation (section 5). All its numbers come from a **69M-triple built base** with deltas up to 500k. | the log (C) for replicas, A measured | A measured under load; C measured once as a scratch build (161 s); the standby-generation loop not built |
| R23 (log compositions) | No QLever rebuild. It is about the broker log (SQLite). Notes the checkpoint source at scale is an open question (item 5: a full entity store in the broker is a fourth copy, about 25 GB). | n/a | n/a |
| R25 (SQLite pinned readers) | No QLever rebuild. Moves the hot current path (H1) and pinned reads into SQLite reader threads. | n/a | n/a |
| PLAN.md | Yes. Section 3: "read layers are derived and rebuildable"; C2: "Checkpoints are folded from the log; rebuilds use crash-safe generation selection"; engine flags include "rebuild at 750k to 1M delta" (`lab/PLAN.md:93`, `:121`, `:140`). | both | design only |
| TARGETS 1.1 P1 item 3 | Every P1 window must contain a maintenance event, "QLever index rebuild or delta merge". | either | not yet exercised on QLever |

### 3.2 The code

| Place | What it does about the delta |
| --- | --- |
| `qlever-start.sh` (lane config) | Builds a **one-triple bootstrap index** (`<urn:triplex:bootstrap> <urn:triplex:format> "1"`) on first start, then serves with `--persist-updates` and no `--rebuild-index-strategy` (so `manual`). Every lane triple therefore lives in the delta for the life of the volume. |
| `lab/bin/engine.mjs`, `lab/config/slots.json` | No rebuild. The policy is "recreate qlever-dev fresh when its delta grows" (`lab/STATE.md:111-114`). qlever-dev was OOM-killed three times as the persisted delta grew and was recreated with `--fresh`, which drops the data. |
| `packages/qlever/src` (main) | No call to `rebuild-index`, `vacuum-delta-triples` or `qlever-index`. |
| `exp/P2Q-qlever-log-broker`, `packages/qlever/src/broker/broker.ts:146`, `:1232-1250` | A `rebuildAtDeltaTriples` option that fires `cmd=rebuild-index` (30 min timeout) when the reported delta reaches a threshold; a `rebuild` bench mode (`bench/run.mjs:389-432`, refuses slot `dev`). **No P2Q report (rounds 2 to 7) records a run of it.** The branch is not merged (STATE: default-off merge pending). Its own start script adds `--rebuild-keep-previous-index-dirs none`. |
| Log-fold checkpoint, `qlever-index` from the log, generation switch | **Not built anywhere.** No code writes N-Quads from the log, runs `qlever-index`, or maintains `gens/`, `CURRENT` or `MANIFEST`. |

**Answer to question 3.** Yes. Every QLever design document that touches the read path (R2, R8, R13, R17, PLAN) assumes the read
index is a rebuilt base with a small delta, either by online `rebuild-index` near 1M delta triples or by a generation rebuilt from the
log of record. R17's performance numbers were all taken on a built 69M-triple base. **No rebuild loop is built or measured on the
lane itself.** The only code is an unmerged, never-run P2Q trigger for online rebuild. The shared resident runs on a one-triple
base and is reset by deleting its data. So every QLever P1, P4 and C8 number taken on qlever-dev so far measures the delta path, not
the design the research recommended.

---

## 4. Measurement plan

### 4.1 Read-only on the shared resident (now, no engine change)

Done once already (section 1.6). It can be repeated at orchestrator check-ins, never in a loop, at most 8 requests a time.

| # | Request | What it measures |
| --- | --- | --- |
| R1 | `cmd=stats` | base size (stays 1 until a rebuild) |
| R2 to R7 | One selective scan per permutation with a fixed constant, for example `GRAPH ?g { <S> ?p ?o }` (SPO), `{ ?s <P> ?o }` (PSO), `{ ?s ?p <O> }` (OPS), with `application/qlever-results+json` | scan wall time and the planner estimate. **The estimate times 5 is a free gauge of the delta in that block** (section 1.6 item 3). Recording it at each check-in gives the per-block delta growth without a full count. |
| R8 | C8's graph-scoped base SELECT from `paired/*.rq`, once | time per child IndexScan against the R2 to R7 numbers, which attributes C8's 4 to 6 s to scans one by one |

**One cheap engine step gives the clean comparison, but it is the orchestrator's call.** A single `cmd=rebuild-index` on qlever-dev
would fold its 1.8M delta in about 1 to 3 s (section 2.2). Repeating R2 to R8 just before and just after it compares delta-backed
and base-backed reads on identical data. Preconditions: no update pending reconciliation on qlever-dev (R8 S3 bakes partial updates
in), `-j` is 4 (it is), and acceptance that the rebuild can fail with HTTP 400 if any past update used an `IRI()` or `BIND`-built term
(#3172; a failure leaves the old index serving). In-flight queries keep their snapshot; the query cache is cleared. I did not do this:
the brief forbids engine changes.

### 4.2 Dedicated-slot experiment: scan and join cost against N delta triples

**Goal.** Fit read cost as a function of total delta N and of per-block delta, separately for monotonic keys (how Triplex mints
IRIs) and spread keys, then show what a rebuild buys back.

**Dataset.** The fixed world and trace generators, seeded, in the lane's own layout through the real Triplex write path, so the
triples per fact and the IRI shapes match production:
1. Base: a world at the 100k-subject rung (R17's index A layout gives about 9.5M current plus ledger triples; cap the base at 10M
   triples so index plus page cache fit the slot). Built once with `qlever-index -F nq` from N-Quads produced by the lane's
   serializer (this also gives the first rebuild-equivalence check, R13).
2. Delta: N triples applied by the frozen writer trace (TARGETS section 2.1) through `QleverStorageAdapter` or the P2Q broker:
   - **arm M (monotonic):** new commands mint new assertion and position IRIs, as the lane does;
   - **arm U (spread):** corrections to existing subjects only (1% retroactive rule taken to 100%), so deltas fall inside base
     blocks.
3. N steps: 0, 10k, 30k, 100k, 300k, 1M (1.5M if memory allows). Persist the delta file at each step and restart from it, as R8 did,
   so every cell has an exact N.

**Per cell, measured with caches cleared (`cmd=clear-cache`) and then warm:**

| Metric | Query set |
| --- | --- |
| Single scan per permutation, selective and range | R2 to R7 above, on base subjects and on delta-only subjects |
| C8 base SELECT and edge SELECT | the frozen `paired/*.rq` shapes |
| P4 pull mix | TARGETS 1.1 P4 buckets (50 to 2,000 facts, 3 to 6 hops), 1 client, then 4 and 16 closed-loop readers (2 CPUs cannot show 256) |
| Update latency | one 10-fact command at each N (R17 model: 6 ms + 0.23 ms per 1k delta) |
| Planner estimate against actual rows | from the runtime tree of every query above |
| RSS, delta file size | `engine.mjs status`, file size |

Then at the largest N: `cmd=rebuild-index`, record wall time, read and write p99 during it, and rerun the cell. Repeat the rebuild
under the 16-reader load once with `rebuild-max-concurrent-permutation-pairs=1` and once with the default, which is R17's and R8's
untested lever.

**Expected shape (to falsify).** Arm U: scan time flat until per-block delta is comparable with the block's 31k rows, then linear in
per-block delta. Arm M: linear in N from the start for every scan whose prefix reaches a hot predicate's or the subject tail block.
After rebuild: both back to the N = 0 numbers. If arm M is not linear in N, section 1.5's tail-block argument is wrong.

**Correctness checks in the same run (Q89i).** A frozen set of 200 pinned reads at 5 fixed bases, run before the rebuild and after
the swap, must return byte-identical results (answers compared after canonical ordering, and separately with the compiler's own
order to see whether the order is plan-dependent).

### 4.3 Slot and pool plan

| Item | Value |
| --- | --- |
| Pool | 11 GiB (`slots.json` `pool.memLimitBytes` 11,811,160,064). Reserved now: xtdb-dev 3.0, qlever-dev 3.5, datomic-dev 2.75 = **9.25 GiB; 1.75 GiB free** (`lab/locks/pool.json`, read 2026-11-09 00:40Z). |
| Slot | QLever `s1` (port 7071, 3.5 GiB, 2 CPUs, exclusive). It does not fit today. It fits if datomic-dev is parked (4.5 GiB free) or inside the planned Q69a measurement window that stops qlever-dev for about 75 min (`lab/STATE.md:91`). |
| Memory inside the slot | Delta memory is outside `-m`: 0.75 to 1.3 GB per million delta triples (R8). s1's default `-m 2500M` plus a 1.5M delta would exceed 3.5 GiB. Run with `-m 1000M`, cap N at 1.5M (arm M) and stop a cell early if RSS passes 3.0 GiB. Rebuild adds 0.5 to 0.6 GB. This needs an experiment start script or a `qleverMemory` override for the run, which `engine.mjs` takes from `slots.json`. |
| Disk | Base 10M triples is about 250 MB; 2x during a rebuild; persisted delta files per cell about 50 MB each; well inside s1's 8 GiB forecast. Keep `--rebuild-keep-previous-index-dirs none`. |
| CPU | 2 CPUs; the load generator runs on the host and its CPU is reported. Shared VM noise: judge by ratios inside adjacent pairs (R17). |
| Duration | Base build about 30 s; 6 N steps x 2 arms x (fill, restart, measure) about 60 to 75 min; rebuild cells 10 min. One 90-minute window. |
| Heavy-job rule | All engine work through `lab/bin/heavy.mjs`; no run below 5 GiB host disk free. |

---

## 5. Recommendation and experiment brief

### 5.1 The options

| Option | What it does | Fixes the tail block? | P1 and Q89i | P5 | Cost | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Keep today's lane (1-triple base, wipe with `--fresh`) | nothing | no | fails C8 at 8 readers | no | none | **Stop now.** It measures the wrong system and loses data. |
| Bounded delta per graph | limit triples per named graph | **no**: all graphs share each permutation's blocks and one delta per server; a graph's triples sort into the same tail blocks | no gain | no gain | n/a | **Reject as stated.** The unit that owns a delta is the server. Bounding per server (per-tenant or per-shard servers, R17: 4 to 6 MB each) is the real form of this option. |
| T1. Built base plus in-place online rebuild on a delta threshold | `--rebuild-index-strategy automatic:min:max:fraction` or the broker's `rebuildAtDeltaTriples` | yes, until the next threshold | each request is one snapshot (`engine/Server.cpp:413-420`); multi-request reads can straddle a swap; reads are 13x slower and writes 50x slower during the rebuild on 2 CPUs (R17) | sweep shares the server | 5 to 11 min per rebuild at 820M on 2 CPUs; no erasure | **Do now, everywhere**, as the floor. |
| T2. Blue/green generations rebuilt from the log | build generation N+1 in its own process from checkpoint plus log (R13 4.3), catch it up by replaying the log suffix, switch readers, retire N when its readers drain | yes; the live server never rebuilds | readers pin a generation for the life of a multi-request read; Q89i holds if every generation answers a basis it is eligible for identically | the sweep pins a frozen generation (R17 section 5) | a second index on disk and in memory; 30 to 45 min build at 820M; real erasure | **Target for P1 replicas and P5 at scale.** |

### 5.2 How T1 and T2 meet pinned bases and the feed

1. **A pinned read's basis is an application position, not an engine snapshot.** The lane names a basis by the record position in
   the ledger and the marker triple read in the same request (C1, C4, R17 section 1.6). A rebuild that folds the delta changes how
   triples are stored, not which triples exist, so every generation that holds the ledger up to B returns the same answer set for B.
2. **Eligibility per generation follows TARGETS section 4.1 items 3 to 5.** A generation G serves basis B only if its watermark (its
   `MANIFEST.appliedLsn` plus the applied log suffix) has reached B, it holds history for B (ledger graph present), and it has applied
   every published erasure. Otherwise the read waits up to 10 ms or falls back.
3. **Q89i needs identical bytes, so the order of rows must not depend on the plan.** A rebuild changes the planner's estimates
   (section 1.6 item 4), so the join order and the order of unsorted results can change across a swap. Every query whose bytes are
   compared must carry an ORDER BY or be canonically ordered in the kernel. This is a check to run (4.2), not a known failure.
4. **Multi-request reads (TARGETS 1.1 P1 item 2) take a generation lease.** In T1 there is only one server, so a straddling read may
   cross an in-place swap; that is correct only if item 3 holds. In T2 the lease keeps all steps on one generation, and a generation
   retires only after its leases drain (bounded by the read deadline).
5. **The feed is the log, not QLever.** R17 found the log of record meets P3 without QLever. A generation is a feed consumer: it
   starts at its checkpoint LSN and replays pure quad frames (idempotent, R13 C2.3; R8 "re-send converges"). The swap is that
   consumer's checkpoint. Feed lag and P3 bars do not depend on rebuilds; generation catch-up lag is reported separately.
6. **Erasure decides between T1 and T2 for PII.** T1 keeps deleted literals in the vocabulary and in `previous.*`; only T2 (or
   crypto-shredding, R17 finding 4) meets TARGETS section 7.

### 5.3 Experiment brief: EXP-QG1, QLever read generations with a bounded delta

**North star.** P1 (C8's eight-reader control and the P1 ladder on QLever), P4 (current-pull p50 and p99 against delta size), P5 (a
sweep pinned to a frozen generation). Measured as in TARGETS section 1.1, at the 100k-subject rung on 2-CPU slots, with latency
judged as ratios against the N = 0 cell. Correctness floor: Q89i (identical bytes at a named basis across a swap), TARGETS 4.1
eligibility, no lost or duplicated commit.

**Read first.** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (1.1, 2.1, 4.1, 7), `lab/PROTOCOL.md`; this report; R2 1.6 and
1.7; R8 sections 1 and 2; R13 sections 4 and 6.4; R17 sections 1.4, 1.6 and 5; C8 REPORT-round4.

**Hypotheses.**
- H1. Read cost per scan is linear in the delta located in the touched blocks, and with monotonic IRIs that is linear in total delta.
- H2. A built base plus online rebuild at threshold T keeps P4 pull p99 within 1.1x of its N = 0 value and lets C8's unchanged
  eight-reader control pass, for some T that the 2-CPU slot can rebuild without missing the P2 writer bar outside the rebuild window.
- H3. A generation built offline from the log answers a frozen set of pinned reads byte-identically to the live server at the same
  bases, and a lease-pinned multi-request read never mixes generations.

**Phase 0 (orchestrator, no builder).** Decide whether to run one `cmd=rebuild-index` on qlever-dev with the section 4.1 before and
after probes. Stop recreating qlever-dev with `--fresh` as the delta policy.

**Phase 1 (one slot, s1, 90 minutes, Codex builder at medium).**
1. Build the base from the seeded world through the lane's serializer and `qlever-index -F nq`; record the receipt (image digest,
   start-script hash, generator hash and seed).
2. Run section 4.2's N grid for arms M and U; then the rebuild cells.
3. Fit H1; pick T as the largest N where P4 p99 is within 1.1x of N = 0 and the C8 base SELECT is under 100 ms.
4. With T set (broker `rebuildAtDeltaTriples` from P2Q, or `--rebuild-index-strategy automatic:T:T:1`), run the unchanged C8
   eight-reader control and a 1, 4, 16 reader P1 ladder with the fixed writer trace, rebuilds included (TARGETS 1.1 P1 item 3).
5. Add falsifier F05 from the notebook: a guarded `DELETE/INSERT WHERE` followed by `rebuild-index` must succeed (#3172), and lint
   the update templates for `IRI()` and `BIND`.

**Phase 2 (two slots, s1 and s3, after phase 1 passes; Opus planner writes the generation protocol detail first).**
1. Implement R13 section 4.3 for QLever: log fold to sorted N-Quads, `qlever-index` into `gens/gNNNNNN.building`, fsync, `MANIFEST`
   with `appliedLsn`, `COMMITTED`, rename, `CURRENT` switch; catch-up by replaying frames above `appliedLsn`.
2. A router that admits reads only to eligible generations (TARGETS 4.1) and hands out generation leases for multi-request reads.
3. Run the frozen 200-read Q89i set across three switches; run the P5 sweep on a frozen generation with the writer trace and live
   readers on the other slot; run one erasure through T2 and check the vocabulary no longer holds the value.

**Bars and falsifiers.**

| Id | Pass | Fail |
| --- | --- | --- |
| G1 | P4 pull p99 at delta T within 1.1x of N = 0 (TARGETS P4 flatness rule applied to delta instead of history) | above 1.1x for every T the slot can rebuild |
| G2 | C8's unchanged eight-reader control passes on a built base with T | still times out, which would mean the cost is not the delta |
| G3 | 0 byte differences in the Q89i set across every swap | any difference, at any basis |
| G4 | 0 reads served by a generation below its eligibility | any |
| G5 | every acknowledged command visible after every swap (receipt check, R8 method) | any missing or duplicated |
| G6 | rebuild under load: writer commit p99 outside the rebuild window within the P2 bar; inside it reported | reported only, not a gate, for phase 1 |

**Roles.** Builder: Codex `gpt-6.1-sol` medium via `lab/bin/agent.mjs`. Reviewer: Codex high, phrased as quality assurance of the
harness (PROTOCOL section 6). Planner for phase 2: Opus high.

**Deliverables.** Receipts per cell; the H1 fit with arm M and arm U curves; chosen T and its evidence; C8 control log; Q89i diff
report; for phase 2, the generation directory protocol, router, and switch receipts.

**Out of scope.** Engine patches (a newer image with PR #3607 or #3151 is a separate decision for Sam); 256 and 1,024 readers (need
replicas, R17); the XTDB and Datomic lanes.
