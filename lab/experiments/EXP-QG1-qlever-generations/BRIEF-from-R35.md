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
