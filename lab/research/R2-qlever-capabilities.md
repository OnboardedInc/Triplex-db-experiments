# R2: What QLever 0.6.0 supports and what it costs, for the entity-projection design

**Written:** 2026-11-07. **Engine:** `adfreiburg/qlever:0.6.0` (digest `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec`), source tag `v0.6.0`, sha `6c5861a6526d7d7ae77735d09339ee0825f0c001`.

## How to read this report

- **Evidence labels.** `[S]` = read in the pinned source. `[P]` = observed by me in the throwaway probe container. `[W]` = web primary source (docs, GitHub issue or PR, paper, slides). `[E]` = my extrapolation from measured numbers.
- **Source cites** are `path:line @ 6c5861a`, relative to `references/qlever`.
- **Later-version features** are labeled **not-in-0.6.0**. v0.6.0 was tagged 2026-08-13 and is the newest release tag (a `latest-master` prerelease exists). Anything merged after 2026-08-13 is not in the pinned image.
- **Confidence** is High (source and probe agree, or direct probe of the exact behavior), Medium (source only, or probe at toy scale), Low (inferred or extrapolated).
- **Probe environment.** One container `tx2-probe-r2` (since removed), `--cpus 2 --memory 3g`, image above, `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`. Server flags matched the repo's (`-j 16 -c 128M -e 32M --persist-updates --no-patterns --no-access-check`), except `-m` was 1G (and 300M/2G for memory tests) and the server ran with its working directory inside the index directory (needed for `rebuild-index`, see 1.7).
- **Probe data** came from the repo's real writer code (`rowFields` in `packages/qlever/src/rdf.ts`, via `gen.ts`): 400,000 facts over 80,000 entities, written in three layouts: **R** (current reified assertion layout), **C** (compact assertion, 7 triples per fact), **P** (plain entity projection). Generator, scripts, transcripts, build logs: `/Users/sam/Claude/Projects/triplex-db-2/R2-qlever-probe/` (`gen.ts`, `gen-out/`, `probe-scripts/`, `build-logs/`).
- **Reified layout correction.** The brief said ~15-20 field triples per assertion. The real `rowFields` emits **28 to 37 triples per assertion** (28 for a live string fact, 31 number/boolean, 33 integer, 37 retracted), including a ~540-byte `_row` JSON literal. Measured over 400k mixed facts: 29.86 triples per fact.

---

## 0. Verdicts at a glance

| # | Question | Verdict | Confidence |
|---|----------|---------|-----------|
| 1 | Updates | Full SPARQL 1.1 Update works, default graph is the union of all graphs, an online `rebuild-index` exists, but every update request costs O(total delta), delta memory is not covered by `-m`, and a failed or timed-out update is not rolled back (measured partial leak, measured permutation inconsistency). | High |
| 2 | Collation | ICU only. Default `en_US`, case-insensitive primary order with lowercase first. No runtime binary collation. `en` + country `US_POSIX` gives ASCII byte order for ASCII text only. UPDATE-inserted strings sort identically to index strings. | High |
| 3 | EXISTS / MINUS | EXISTS arguments are planned as separate queries and joined on shared variable names. An outer variable used only inside an inner FILTER is unbound there (wrong answers, reproduced). Planning memory grows geometrically with EXISTS count and is not capped by `-m` in 0.6.0. | High |
| 4 | Typed literals | Integers are 60-bit. Values in ±2^63 but outside ±2^59 wrap silently on UPDATE. Every numeric except integers collapses to a 49-bit-mantissa double exported with 13 digits. Date-times are millisecond, whole-hour zones, ordered by local clock. | High |
| 5 | RDF-star | Not supported in 0.6.0 (parse error). Blank nodes work. | High |
| 6 | Resources | Index disk is 20-26 B per triple. Build RSS is dominated by parse batch size, not `--stxxl-memory`. Query timeouts are cooperative (sort is not interruptible). Cancel is WebSocket only. `-m` yields clean errors for result tables but not for delta or planner memory. | High |
| 7 | Paging and results | ORDER BY is an unstable in-memory sort, deterministic only for a total key. Many result formats, no row cap, ~0.5M rows/s export. Published scale evidence up to 8B triples (QLever team) and 20B (third party). | High / Medium |

---

## 1. Updates

### 1.1 Verdict

1. **Operations.** `INSERT DATA`, `DELETE DATA`, `DELETE WHERE`, `DELETE/INSERT WHERE` (with `WITH` and `USING`), `LOAD`, `CLEAR`, `DROP`, `ADD`, `MOVE`, `COPY` work. `CREATE` is a no-op because empty graphs are not recorded. The Graph Store Protocol (GET, PUT, POST, DELETE, TSOP) also works. [S] `src/parser/sparqlParser/SparqlQleverVisitor.cpp:662-720, 783-945 @ 6c5861a`; [W] https://docs.qlever.dev/update/. Every update response carries the warning `"SPARQL 1.1 Update for QLever is experimental."` [P]
2. **Default graph.** A query without `FROM` reads the **union of all graphs, deduplicated**. `GRAPH ?g { }` ranges over named graphs only (the built-in default graph is excluded unless `treat-default-graph-as-named-graph=true`). [S] `src/engine/QueryPlanner.cpp:2927-2938 @ 6c5861a`, `src/index/CompressedRelation.cpp:292-360 @ 6c5861a`, `src/global/RuntimeParameters.h:182-185 @ 6c5861a`; [P] below.
3. **Delta model.** Updates live in a per-permutation, per-block sorted structure ("located triples") that is merged into scans. Memory is 0.4 KB per delta triple when terms already exist, 1.2 to 1.7 KB when each triple brings new IRIs and literals. Not counted by `-m`. [S][P]
4. **Cost per request.** Every request, however small, redoes O(delta) work: metadata update, full rewrite of the persisted file, deep copy of all six permutations' located triples. [S][P]
5. **Compaction.** `cmd=rebuild-index` rebuilds from the live permutations plus delta (no export, no re-sort), then swaps the new index in without a restart. There is also `--rebuild-index-strategy automatic:min:max:fraction`. [S][P][W]
6. **Atomicity.** A multi-operation request runs on one update thread and publishes one snapshot at the end. There is **no rollback** on failure or timeout. [S][P] Measured below.
7. **Version token.** None. `cmd=get-index-id` returns a constant (`#.1.1.1.1`), responses carry no ETag. [P]

### 1.2 Evidence: graph semantics (probe P1, default graph plus `G1` and `G2`)

Setup: `INSERT DATA { <s1> <p> "v" . GRAPH <G1> { <s1> <p> "v" . <s2> <p> "w" } GRAPH <G2> { <s1> <p> "v" . <s3> <p> "x" } }` (5 triples).

| Query | Result |
|-------|--------|
| `SELECT ?s ?o WHERE { ?s <p> ?o }` (no FROM) | `s1 "v"`, `s2 "w"`, `s3 "x"`. `COUNT(*)` = 3. `s1 "v"` is in three graphs and appears once. |
| `SELECT ?g ?s ?o WHERE { GRAPH ?g { ?s <p> ?o } }` | G1 and G2 rows only (4 rows). The default-graph copy is not returned. |
| `... FROM <G1> ...` | `s1`, `s2` |
| `... FROM <G1> FROM <G2> ...` | `s1`, `s2`, `s3` |
| `... FROM NAMED <G2> ... GRAPH ?g` | G2 rows only |

**Consequence for a "current" graph plus a "history" graph on one server.** A plain `SELECT * { ?s ?p ?o }` sees both. 0.6.0 has no server-level default-graph setting. Raw SPARQL users must write `FROM <urn:triplex:current>`, or a proxy must inject it, or the two graphs live on two servers. [S][P]

**Graph metadata limit.** Block metadata records at most 20 distinct graphs per block (`src/index/ConstantsIndexBuilding.h:108 @ 6c5861a`). Beyond that a block has no graph info and `FROM` or `GRAPH <g>` filtering is a per-row filter. Two or three graphs stay cheap. One graph per scope (thousands) does not. [S]

### 1.3 Evidence: lifecycle of one update request

```
HTTP POST  application/sparql-update   body: "op1 ; op2 ; ..."
   |
   v  parse whole request. Syntax error -> HTTP 400, nothing applied
   |
   v  ONE update thread (UPDATE_THREAD_POOL_SIZE = 1)       Server.h:111, Server.cpp:1338-1345
   |
   v  DeltaTriplesManager::modify(...)                       DeltaTriples.cpp:516-565
   |     for each op, in order:
   |        plan + evaluate WHERE, fully materialized          ExecuteUpdate.cpp:19-22
   |        apply deletes, then inserts, to the MUTABLE delta  ExecuteUpdate.cpp:28-40
   |           x6 permutations: locate block, add, consolidate DeltaTriples.cpp:200-225
   |     updateAugmentedMetadata()          O(delta)           DeltaTriples.cpp:546-552
   |     writeToDisk()                      O(delta) full rewrite of <base>.update-triples
   |     snapshot = deep copy of all located triples  O(delta) DeltaTriples.cpp:483-492
   |     publish snapshot  (queries started afterwards see it)
   v
cache().clearAll()   every update empties the whole result cache   Server.cpp:1307-1308
```

All of it is under `@ 6c5861a`. If any op throws, control leaves `modify` before `writeToDisk` and the snapshot swap, but the mutable delta keeps what already ran (see 1.8).

### 1.4 Evidence: memory per delta triple

- **Structure** [S]: a `LocatedTriple` is a block index (8 B), an `IdTriple<0>` (4 Ids = 32 B) and a flag, 48 B with padding (`src/index/LocatedTriples.h:78-93 @ 6c5861a`). It is stored once per permutation (6), plus a hash set of inserted/deleted triples (`src/index/DeltaTriples.h:160-172 @ 6c5861a`), plus a **second deep copy** for the published snapshot. Terms not in the index vocabulary go to a local vocabulary (heap strings). Lower bound: 288 B per triple for the six copies, roughly doubled during the update.
- **Measured** [P] (container RSS, baseline server 31 to 43 MB):

| Scenario | Delta triples | RSS | Per delta triple |
|----------|--------------|-----|------------------|
| `INSERT ... WHERE` cross join, terms reused | 2.25M | 1,426 MB | ~0.61 KB |
| After restart, replay of the persisted file | 4.5M | 1.87 GB | ~0.41 KB |
| 40 x `INSERT DATA` of 25k triples, each triple with a new subject IRI and a new literal | 1.0M | 1,294 MB (peak 1,564 MB) | ~1.2 to 1.5 KB |

- **Not covered by `-m`.** With `-m 1G` the server still grew past 3 GiB and died during a second 2.25M-triple insert (total delta 4.5M). The kernel message was not captured and Docker's `OOMKilled` flag was already set by an earlier index-build kill, so the OOM cause is inferred (no assertion text in the log, process gone). [P] Confidence Medium on cause, High on "memory growth is not bounded by `-m`".

### 1.5 Evidence: `--persist-updates`

- **What is stored.** After **every** request the server writes the full set of inserted and deleted triples (4 Ids each = 32 B, plus the local vocabulary) to `<base>.update-triples.tmp` and renames it over the old file (`src/index/DeltaTriples.cpp:648-672 @ 6c5861a`). It is a snapshot rewrite, not a log. Internal language-tag triples are regenerated at load. [S]
- **Size** [P]: 93.8 MB for 1.0M triples with unique terms (94 B per triple), 72.1 MB for 2.25M triples with reused terms (32 B per triple).
- **Replay at start** [P]: 2.25M triples in ~10.0 s, 4.5M triples in 22.6 s (~5 us per triple), RSS 1.87 GB after the 4.5M replay. A restart therefore costs proportional to the delta, and a delta that fit before a restart can fail to fit during replay.
- **Durability** [S]: the writer is a buffered `FILE*` (`src/util/Serializer/FileSerializer.h:18-30 @ 6c5861a`). I found no `fsync` or `fdatasync` in the persistence path (grep over `src/util/Serializer`, `DeltaTriples.cpp`). Process-crash safe through rename, not power-loss safe. Confidence Medium.
- **Log quirk** [S][P]: the replay log line `#inserted triples = 9,006,060` prints the count of Ids, which is 4x the triple count (`DeltaTriples.cpp:706-708 @ 6c5861a`). The real count was 2,251,515.

### 1.6 Evidence: throughput and degradation

**Update cost grows with the delta** (index P1 = 465k base triples; 25k-triple `INSERT DATA` per request, new subjects and literals):

| Request # | Delta after | HTTP s | Update file MB | RSS MB |
|-----------|------------|--------|----------------|--------|
| 1 | 25k | 0.70 | 2.3 | 131 |
| 10 | 250k | 0.96 | 23.3 | 635 |
| 20 | 500k | 0.95 | 46.8 | 970 |
| 30 | 750k | 1.22 | 70.3 | 1,125 |
| 40 | 1.0M | 1.54 | 93.8 | 1,294 |

That is 36k triples per second at an empty delta falling to 16k at 1M. Server-side breakdown of one more 25k request at 1.0M delta (total 1,967 ms): parsing 164, operations 881, metadataUpdateForSnapshot 347, **diskWriteback 418**, snapshotCreation 153. Roughly 0.9 s of that (metadata + disk + snapshot) does not depend on the batch size. By inference [E], a single-triple update at 1M delta costs about 0.9 s. I did not measure it directly.

**Engine-side rate** [P]: one `INSERT ... WHERE` producing 2.25M triples with reused terms spent 10.5 s in the operation phase (214k triples per second, 6 permutations) plus 0.45 s for metadata, disk, snapshot. The upstream wiki reports 0.5M triples per second for one large delete on Wikidata (Nov 2024, 16-core NVMe) [W] https://github.com/ad-freiburg/qlever/wiki/First-tests-with-SPARQL-1.1-Update. I did not reproduce that rate on 2 CPUs.

**Reads degrade in the blocks the delta touches** (same index, 1.0M delta, cold cache, ms):

| Query | With 1.0M delta | Reference |
|-------|----------------|-----------|
| `COUNT` over the predicate that the delta fills | 480 to 820 | ~5 for an untouched predicate |
| `ORDER BY ?o LIMIT 10` on that predicate | 1,010 to 1,040 | 3 to 6 |
| Lookup of an entity that exists only in the delta | 45 to 70 | ~3 for an entity in the base |
| Count over a predicate the delta does not touch | 4 to 5 | 5 |

After `rebuild-index` the first row fell to 7.5 ms. The upstream wiki says a 1% change slows affected queries about 2% [W]. My delta was 2x the base index, an extreme case that shows the mechanism rather than a realistic ratio.

### 1.7 Evidence: compaction (`rebuild-index`)

- **It exists and is online.** `curl -d cmd=rebuild-index` (access token unless `--no-access-check`) builds a new index from the current permutations plus delta, then atomically swaps it in. Queries and updates continue during the build. Updates that arrive meanwhile are carried over by a snapshot diff (`DeltaTriples::addFromSnapshotDiff`). [S] `src/engine/Server.cpp:567-580, 1635-1727 @ 6c5861a`, `src/libqlever/Qlever.cpp:754-815 @ 6c5861a`, `src/index/IndexRebuilder.cpp:447-632 @ 6c5861a`. v0.6.0 release notes list "swap in the new index at runtime" (#2832) and the automatic strategy (#3163) [W] https://github.com/ad-freiburg/qlever/releases/tag/v0.6.0.
- **No export and re-run of `qlever-index` is needed.** The docs say so and the algorithm is a vocabulary merge plus a streaming permutation rewrite. [W] https://docs.qlever.dev/rebuild-index/
- **Automatic trigger.** `--rebuild-index-strategy automatic:min:max:fraction`, for example `automatic:10000:1000000:0.1`, fires when `inserted + deleted` reaches `clamp(fraction x index_triples, min, max)` (`src/engine/RebuildIndexStrategy.h:25-45 @ 6c5861a`, `src/ServerMain.cpp:168-177 @ 6c5861a`). Default is `manual`. [S]
- **Working-directory trap** [P]. Without `cd` into the index directory the call returns HTTP 400 `The directory "rebuild.<ts>.tmp" is not a subdirectory of the directory of the current index`. The temp and previous directories must be relative and inside the index's own directory (`src/libqlever/Qlever.cpp:484-520 @ 6c5861a`). The repo's start script does `cd /data` with a relative base `triplex`, which satisfies this.
- **Measured** [P] (2 CPUs):

| Index | Triples rebuilt | Wall | Peak RSS | Notes |
|-------|----------------|------|----------|-------|
| P1: 465k base + 1.025M delta | 1.49M | 4.4 s | 1.54 GB | 3.6 s of it writing 2.2M vocabulary words (0.6M words/s) |
| R: 11.94M base + 100k delta | 12.04M | 4.8 s | 1.33 GB | 3.6M words in 1.4 s, 6 permutations at ~23M triples/s. Scratch build of the same index: 35.2 s |

- **Disk.** New index is built next to the old one. The old index moves to `previous.<build date>/`. Default `--rebuild-keep-previous-index-dirs` is `original-and-most-recent`, so disk use is 2x to 3x the index until pruned. After the swap the persisted delta file shrinks to 55 bytes. [S][P]
- **What is lost.** Text index and loaded materialized views do not carry over (`Server.cpp:1655-1667 @ 6c5861a`). Irrelevant for the repo today. [S]
- **Published speed.** Under 1 minute for ~500M triples, ~20 minutes for ~10B triples, Ryzen 9 9950X 16 cores, NVMe. [W] https://docs.qlever.dev/rebuild-index/
- **Tuning knobs** in 0.6.0: `rebuild-index-scan-num-threads` (default 1), `rebuild-permutation-writer-num-threads` (1), `rebuild-max-concurrent-permutation-pairs` (0 = all). The defaults deliberately leave CPU to queries. [S] `src/global/RuntimeParameters.h:65-95 @ 6c5861a`

### 1.8 Evidence: atomicity of a request, and what failure leaves behind

**Design** [S]: updates in one request are "atomic" only in the sense that they run back to back on the single update thread (`Server.cpp:1338-1345 @ 6c5861a`), and one snapshot is published after the last one. There is no undo log.

**Probe A: second operation fails at runtime.** Request: `INSERT DATA { GRAPH <ATOM> { <atom1> <p> "first-op" } } ; LOAD <http://127.0.0.1:1/nonexistent.ttl> INTO GRAPH <ATOM>`.

```
-> HTTP 500  "exception": "connect: Connection refused ..."
query GRAPH <ATOM> { ?s <p> ?o }                     -> (empty)        # not visible yet
INSERT DATA { GRAPH <ATOM2> { <atom2> <p> "unrelated" } }   -> HTTP 200
query GRAPH ?g { ?s <p> ?o FILTER(STRSTARTS(STR(?g),"urn:g:ATOM")) }
   -> <urn:g:ATOM>  <urn:t:atom1>  "first-op"        # LEAKED, and now persisted
      <urn:g:ATOM2> <urn:t:atom2>  "unrelated"
```

The first operation of a failed request becomes visible, and durable, with the next successful update.

**Probe B: a timeout during the mutation phase.** 1,500 subjects loaded, then `INSERT { GRAPH <Xi> { ?a <q> ?b } } WHERE { 1500 x 1500 cross join }` (2.25M triples) with a per-request `timeout`, then one trivial successful update, then four counts over the same graph through different permutations.

| Timeout | HTTP | Count via `?s <q> ?o` (PSO/POS) | Count via `<y5> ?p ?o` (SPO) | Count via `?s ?p <y7>` (OPS) | Count via `?s ?p ?o` |
|---------|------|------|------|------|------|
| 400 ms to 2,000 ms | 429 "Operation timed out." | 0 | 0 | 0 | 0 |
| 2,500 ms | 429 | **2,250,000** | 0 | 0 | 0 |
| 3,000 ms | 429 | **2,250,000** | 1,500 | 0 | 2,250,000 |
| 4,000 ms | no reply (server died) | n/a | n/a | n/a | n/a |

A timed-out update (HTTP 429) was **partially applied, to some permutations only**, and the next successful update published that inconsistent state. The persisted file after restart contained exactly one complete 2.25M-triple set, so the junk was in memory only; a restart discarded it. Source explanation [S]: `locateAndAddTriples` loops over the six permutations and calls `throwIfCancelled()` between them (`DeltaTriples.cpp:200-225 @ 6c5861a`), while the hash sets are marked only afterwards (`DeltaTriples.cpp:476-478 @ 6c5861a`). Confidence High that it happens, Medium on every other consequence (for example I did not test whether a `rebuild-index` after such a state copies the junk into the new permutations).

**Probe C: the server died inside an update, after the persisted file was written.** In the 4,000 ms run above and in the second 2.25M-triple insert of 1.4, the log shows `Done processing update`, then the process disappears with no error text, and the client gets no usable reply (HTTP 000 in the 4,000 ms run, a stale response file in the second insert). The persisted file already held the full update (`writeToDisk` runs before the snapshot deep copy, `DeltaTriples.cpp:536-541 @ 6c5861a`), so after the restart the update was present although the client never got a reply. A client must therefore resolve an unacknowledged write by reading a receipt (the repo's operation-receipt triple does exactly that), never by assuming it failed. [P] Confidence High on the sequence, Medium on the cause (memory exhaustion during the snapshot copy, not captured).

**Version token and CAS.** There is no commit id. The repo's single `DELETE/INSERT WHERE` guarded by `FILTER NOT EXISTS` and a position triple (`QleverStorageAdapter.ts:215-230`) is a valid compare-and-swap in 0.6.0 because updates are serialized and the guard is evaluated against the live mutable state under the update thread. [S] Confidence Medium (I did not race it).

### 1.9 Implications

**For the projection design**
1. Put the entity projection and the assertion history in separate named graphs, and require `FROM <urn:triplex:current>` (or inject it) for user SPARQL. Both graphs share one delta and one rebuild.
2. Use one update request per Triplex transaction, never several operations in one request, because failed multi-op requests leak.
3. After any update that returned an error or timeout, treat the server state as suspect until a restart. If the receipt triple is absent, do not just retry. Restart QLever first, then re-check the receipt.
4. Coalesce writes. Per-request overhead is O(delta), so many small requests are quadratic. Prefer batches of thousands of triples.
5. Every update clears the entire query result cache, so read-heavy workloads lose cache hits on every write.
6. Avoid `CLEAR`, `DROP`, `MOVE` of big graphs. They become one delta delete per triple.

**For 100M facts**
- A fact write costs ~1 to 2 delta triples in the plain projection (insert plus delete of the old value), ~7 to 8 in a compact assertion graph, ~30 to 37 in the current reified layout. So 1M delta triples is ~110k facts (compact + plain) or ~33k facts (reified).
- Budget 1M delta triples as the soft ceiling (0.4 to 1.7 GB at rest, up to 2x during an update, ~1.5 s per request, ~94 MB rewritten per request). Turn on `--rebuild-index-strategy automatic:<min>:1000000:0.01`-style limits. The right min and fraction depend on the base size and need an experiment (open question 1).

---

## 2. Vocabulary and collation

### 2.1 Verdict

1. **Locale settings (build time only).** `settings.json` key `locale` with `language`, `country`, `ignore-punctuation`. Default `en` / `US` / `false`. Changing it requires a full rebuild (the builder warns so). The locale is stored in the index metadata and the server reads it from there. [S] `src/index/IndexImpl.cpp:1608-1649 @ 6c5861a`, `src/global/Constants.h:266-268 @ 6c5861a`; [P] `idx.meta-data.json` shows the locale.
2. **Collation level.** The vocabulary order and the local-vocabulary comparator both use level `TOTAL`: ICU IDENTICAL, then a byte compare of the full literal text, then the language tag or datatype suffix. The first character of the stored term (`"` for literals, `<` for IRIs) is compared before the collation key, so all literals sort before all IRIs. [S] `src/index/vocabulary/StringSortComparator.h:308-335 @ 6c5861a`, `src/index/LocalVocabContextImpl.cpp:15-19 @ 6c5861a`.
3. **No binary collation at run time.** The only true byte order is the build-time CMake option `QLEVER_NO_UNICODE` (ICU-free build, "plain ASCII bytes", index metadata records `has-icu-support` and a mismatched binary refuses the index). It is not in the Docker image. [S] `CMakeLists.txt:325-327 @ 6c5861a`, `src/index/IndexImpl.cpp:1430-1442 @ 6c5861a`.
4. **ASCII-only byte order trick (probe, not documented).** Locale `language=en, country=US_POSIX` is accepted by the builder and sorts ASCII text in codepoint order. Non-ASCII text is still interleaved by root collation, so it is not codepoint order. [P]
5. **ORDER BY.** Rows compare by `ValueId`. String terms compare by vocabulary index (which is the ICU order) and local-vocabulary terms compare through the same comparator via their cached position in the vocabulary. Values of incompatible datatypes order by datatype: boolean, then numeric (compared numerically), then strings (plain and language-tagged together), then date-times. [S] `src/engine/OrderBy.cpp:105-115 @ 6c5861a`, `src/global/ValueIdComparators.h:480-560 @ 6c5861a`, `src/index/LocalVocabEntry.cpp:13-45 @ 6c5861a`; [P] P3.5, P15.
6. **Index vocabulary and UPDATE-inserted strings sort identically** [P] (same 35 strings, same output). I did not run a mixed test (some strings in the index, others from UPDATE). Source says they share one comparator. Confidence Medium-High.
7. **FILTER string comparison uses the same collation**, not codepoints: `FILTER(?o < "B")` returned `lead, _x, -y, 10, 9, a, A, ä, Ä, a b, a_b, a-b, ab, apple, Apple, b`. [P]

### 2.2 Evidence: same 35 strings, five locale settings (ORDER BY ?o)

Strings (35): `A a B b c E e z Z é ü Ä ä ñ n o 9 10 _x -y " lead" 日本 ß ss Zebra zebra apple Apple "a b" ab a-b a_b éclair eclair Éclair`.

```
en_US                  " lead" _x -y 10 9 a A ä Ä "a b" a_b a-b ab apple Apple b B c e E é eclair éclair Éclair n ñ o ss ß ü z Z zebra Zebra 日本
en_US, ignore-punct    10 9 a A ä Ä "a b" a_b a-b ab apple Apple b B c e E é eclair éclair Éclair " lead" n ñ o ss ß ü _x -y z Z zebra Zebra 日本
en + US_POSIX          " lead" -y 10 9 A Ä Apple B E Éclair Z Zebra _x a ä "a b" a-b a_b ab apple b c e é eclair éclair n ñ o ss ü z zebra ß 日本
sv_SE                  ... z Z zebra Zebra ä Ä 日本      (Swedish puts ä after z)
de_DE, root("","")     same as en_US for this set
UPDATE-inserted (en_US index with empty vocab)   identical to the en_US line
```

Reading the lines:
- **Mixed case in en_US:** lowercase before uppercase on ties (`a A`, `apple Apple`, `zebra Zebra`), case-insensitive otherwise (`B` before `c`, `E` before `é`).
- **Spec comparison:** SPARQL's `<` on simple literals is codepoint order, which would give `A B E Z ... a b c`. QLever 0.6.0 does not. The repo already recorded this (`wiki/problems/qlever-native-string-order.md`).
- **`US_POSIX` line:** ASCII is in codepoint order (`space - digits A-Z _ a-z`), but `Ä` sits next to `A`, `ß` after `zebra`: not codepoint order.
- **Punctuation:** `ignore-punctuation: true` is the Wikidata default in the official Qleverfiles. It moves strings with punctuation or leading space to where the letters alone would sort.

### 2.3 Evidence: how the strings reach the comparator

```
index vocabulary  : sorted at build time with isLessInTotalWithExternalFlag (TOTAL)   IndexImpl.cpp (sort by unicode order)
UPDATE literal    : LocalVocabEntry, position bounds found by binary search in the vocabulary
                    using the same TOTAL comparator (LocalVocabEntry.cpp:21-45)
ORDER BY          : compareIds(a, b, LT) with CompareByType; VocabIndex vs LocalVocabIndex goes
                    through compareVocabAndLocalVocab (ValueId.h:178-196)
equal-collation but byte-different strings (e.g. NFC vs NFD é): TOTAL adds a byte compare, so they stay distinct and ordered
```

### 2.4 Implications

- **Triplex's exact order must not depend on engine string order.** Keep the existing lexical order-key channels in the history graph (`scalar_order` and the `*_order` fields) for anything that must be codepoint-exact. ORDER BY on projection literals is ICU order, which is fine for human display and not for protocol-level pagination.
- **Pick the locale once, at the first index build.** For a raw-SPARQL user audience, `en_US` with `ignore-punctuation: false` is predictable (spaces and punctuation sort first). `US_POSIX` gives byte order for ASCII-only data, and reverts to root collation for the rest, which can surprise.
- **A custom image built with `QLEVER_NO_UNICODE=ON`** is the only way to get true codepoint order. It also drops ICU case conversion and normalization and needs a source build. Not recommended until string-order is a proven requirement.
- **Equality is exact.** `"a"` and `"A"` are different terms and ICU never merges them. Only range and order are affected. [P]

---

## 3. EXISTS, NOT EXISTS, MINUS

### 3.1 Verdict

1. **Implementation.** `EXISTS` in `FILTER` or `BIND` is rewritten into an `ExistsJoin`: the argument pattern is planned by a **separate `QueryPlanner`** as if it were its own query, then joined to the outer rows on the variables that both sides expose. The result is a boolean column. `MINUS` is a separate `Minus` operation (sorted merge, with an index-nested-loop variant). [S] `src/engine/ExistsJoin.cpp:239-290 @ 6c5861a`, `src/engine/Filter.cpp:32 @ 6c5861a`, `src/engine/Minus.cpp:21-88 @ 6c5861a`.
2. **Correlation bug (by design).** Outer variables that appear only inside a nested `FILTER` of the EXISTS body are not join columns, so they are unbound there. SPARQL 1.1 says EXISTS substitutes outer bindings. QLever differs and the maintainers consider changing it low priority because SPARQL 1.2 redefines EXISTS. [W] https://github.com/ad-freiburg/qlever/issues/2138 (open). Reproduced [P] below.
3. **MINUS scoping.** `FILTER` inside `MINUS` referencing an outer-only variable also sees it unbound. This is the normal SPARQL MINUS rule, so QLever is spec-conformant there. Binding the correlation variables inside the MINUS body gives correct answers. [P]
4. **Planning cost.** Planning time and memory grow geometrically with the number of `FILTER EXISTS` or `FILTER NOT EXISTS` in one group, independent of data size. Each `Filter` created during dynamic programming re-plans its EXISTS argument. [W] issue #3573 (open, ~10x per nesting level), PR #3190 (merged 2026-10-24, **not-in-0.6.0**: "a factor of about four with every `FILTER EXISTS`", "four clauses needed 5 GB", "five clauses ran out of memory"). [P] reproduced below.
5. **Other EXISTS and MINUS bugs.** `EXISTS` in GROUP BY fixed by #3106 (merged 2026-07-31, in 0.6.0). Unconnected `MINUS` inside `GRAPH ?g` returned wrong rows (#3678, closed 2026-10-13, **not-in-0.6.0**). Planner assertion for nested groups with two `MINUS` (#3556 fixed by #3602 on 2026-10-12, **not-in-0.6.0**). MINUS with UNDEF on both sides (#2027, closed 2025-08-26, before 0.6.0). `OPTIONAL` with an outer-variable `FILTER` returns wrong bindings (#2509, open). [W]
6. **Repo's own finding.** The wiki records raw-SPARQL correlated flat and nested `NOT EXISTS` controls that returned `one,two` where `two` was expected (`wiki/problems/native-correlation.md`). Same mechanism. [S]

### 3.2 Evidence: correlation probe (3 revisions over 2 entities, expect latest-per-entity = {a2, a3})

```
data: a1(e1,order 1)  a2(e1,order 2)  a3(e2,order 1)
Q1  FILTER NOT EXISTS { ?b entity ?e ; order ?o2 . FILTER(?o2 > ?o) }            -> a1 a2 a3   WRONG (?o only in inner FILTER)
Q2  FILTER NOT EXISTS { ?b entity ?e ; order ?o2 . ?a order ?o . FILTER(?o2>?o) } -> a2 a3      correct (?o re-bound inside)
Q3  MINUS { ?b entity ?e ; order ?o2 . FILTER(?o2 > ?o) }                         -> a1 a2 a3   spec-conformant MINUS scoping
Q4  MINUS { ?a entity ?e ; order ?o . ?b entity ?e ; order ?o2 . FILTER(?o2>?o) } -> a2 a3      correct
Q5  FILTER EXISTS { ?b entity ?e ; order ?o2 . FILTER(?o2 > ?o) }                 -> (empty)    WRONG, expected a1
Q6  issue #2138: VALUES (?x ?y ?z){(a b 7)} FILTER EXISTS { FILTER(?z = 7) }       -> (empty)    WRONG, spec gives 1 row
Q7  GROUP BY ?e, MAX(?o)                                                           -> e1:2, e2:1 correct
```

The nested-`NOT EXISTS` retraction probe I ran happened to give the right answer by coincidence (it is not a discriminating test). The repo's own controls already cover the nested failure.

### 3.3 Evidence: planner growth (3-triple dataset; group of three patterns plus k `FILTER NOT EXISTS`, each with 2 patterns)

| k | Planning time | Server peak RSS |
|---|--------------|-----------------|
| 1 | 3 ms | 37 MB |
| 4 | 67 ms | 70 MB |
| 6 | 176 ms | 189 MB |
| 8 | 396 ms | 371 MB |
| 9 | 667 ms | 679 MB |
| 10 | 1,064 ms | 1,082 MB |
| 12 (fresh server) | 3,239 ms | 915 MB |

With **`-m 1G`** the planner still reached 1.08 GB, so `-m` does not cap planning memory in 0.6.0. The planner's containers were moved under the memory limit by PR #3722 (merged 2026-10-28, **not-in-0.6.0**). [W]

**Mitigation that works in 0.6.0** [P]: `query-planning-budget` (default 1500). If the number of connected subgraphs exceeds the budget, QLever plans greedily instead of by dynamic programming (`src/engine/QueryPlanner.cpp:1812-1825 @ 6c5861a`). With `budget=1` planning stayed flat: k=10 in 11 ms and 40 MB, k=12 in 6 ms, k=16 in 16 ms and 53 MB. Set it at start with `--set-runtime-parameter query-planning-budget=1` or at run time with `curl "$H/?query-planning-budget=1"`. It is global to the server. The repo's wiki measured the same effect (100 to 1). Plan quality for join-heavy reads under greedy planning is untested (open question 6).

### 3.4 Implications

- **For projection reads:** do not use correlated `NOT EXISTS` for "latest visible assertion". Use (a) `MINUS` with every correlation variable bound inside the body, (b) `GROUP BY` with `MAX`, or (c) store a pre-computed `current` marker. With the plain projection the common read needs no negation at all.
- **For guards in writes** (`QleverStorageAdapter.ts:218-224` uses `FILTER NOT EXISTS` with a fixed IRI): uncorrelated, constants only, so safe. The repo already isolated it in a subselect to dodge a `CartesianProductJoin` assertion.
- **Set `query-planning-budget` low** on the production server and re-run the repo's 142-task packet to check for plan regressions.

---

## 4. Typed literals

### 4.1 Verdict table (all `[P]` through UPDATE unless marked; source in column 4)

| Type | Behavior | Confidence | Source |
|------|----------|-----------|--------|
| `xsd:integer`, `int`, `long`, `short`, `byte`, `unsigned*`, `positiveInteger`, ... | Parsed to int64 then stored in **60 bits**. Range `[-2^59, 2^59-1]` = `[-576460752303423488, 576460752303423487]`. Datatype is erased: results come back as `xsd:int`. | High | `src/global/ValueId.h:105,124,279-283 @ 6c5861a`, `src/index/ExportIds.cpp:259-260 @ 6c5861a`, `src/parser/RdfParser.h:166-179 @ 6c5861a` |
| Integer outside 60 bits but inside int64, by UPDATE | **Silent wrap-around**, no error. `2^59` returns `-576460752303423488`. `-2^59-1` returns `576460752303423487`. `9223372036854775807` returns `-1`. `-9223372036854775808` returns `0`. | High | `src/util/NBitInteger.h:19-22 @ 6c5861a` |
| Integer beyond int64 | UPDATE: HTTP 400 parse error (typed and bare forms). Index build: aborts the build by default; `parser-integer-overflow-behavior` can turn it into doubles. | High | `src/parser/sparqlParser/SparqlQleverVisitor.cpp:3010-3023 @ 6c5861a`, `src/parser/RdfParser.cpp:384-411 @ 6c5861a` |
| `all-integers-become-doubles` build setting | Source maps it to `OverflowingToDouble`, not `AllToDouble`, so it behaves like the overflow-only mode (likely bug). | Medium | `src/index/IndexImpl.cpp:1706-1710 @ 6c5861a` |
| `xsd:decimal`, `xsd:double`, `xsd:float` | All stored as a double with **49 significant mantissa bits** (low 4 bits dropped). Exported in JSON as `xsd:decimal` with `%.13g`: 13 significant digits. `DATATYPE(?v)` says `xsd:double`. Examples: `0.30000000000000004` exports `0.3`; `1.0000000000000002` and `1.0000000000000004` both `1.0`; `123.456789012345678` exports `123.4567890123`; `9007199254740993` decimal exports `9007199254740992.0`; `123456789012345678901234567890` exports `123456789012345431587114975232.0`; `1e308` exports a 309-digit integer string; `-0.0` survives; NaN and INF export as `xsd:double`. | High | `src/global/ValueId.h:263-270 @ 6c5861a`, `src/index/ExportIds.cpp:222-256 @ 6c5861a` |
| `xsd:dateTime` | **Millisecond** precision (`.123456Z` exports `.123Z`; fixed point with multiplier 1024). Time zone **whole hours only**: `+05:30` becomes `+05:00` silently. No zone and `Z` are preserved as distinct. Year `-9999..9999` for full values. `12345-11-07T00:00:00Z` came back as `12345-01-01T00:00:00` (month, day, time and zone lost). | High | `src/util/Date.h:69-90,130-137 @ 6c5861a`, `src/util/DateYearDuration.cpp:84-99 @ 6c5861a` |
| `xsd:dateTime` comparison and ORDER BY | Compared on the raw bits, **local clock fields first, zone as tiebreak**, not as an instant. `00:00:00Z < 01:00:00+05:00` is `true` and `00:00:00Z = 05:00:00+05:00` is `false` although the second pair is the same instant. ORDER BY put `01:00:00+05:00` (really 20:00Z the day before) last. | High | `src/util/Date.h:69-90 @ 6c5861a` |
| Invalid typed literal (e.g. `"not a date"^^xsd:dateTime`) | Silently stored as a plain string literal, datatype dropped. No error. | High | `src/parser/RdfParser.cpp:558-571,619-631 @ 6c5861a` |
| `xsd:date` | Preserved. | High | |
| `xsd:boolean` | `true` and `1` round-trip as written (`true` stays `true`, `1` stays `1`). | High | `src/global/ValueId.h:294-300 @ 6c5861a` |
| `"x"^^xsd:string` vs `"x"` | Same term; `DATATYPE` returns `xsd:string`. | High | |
| Language-tagged | `"hej"@sv`, `"Hej"@SV` kept as written (tag case preserved) and are different terms; `FILTER(?v = "Hej"@sv)` does not match `"Hej"@SV` (tag compare is case-sensitive, SPARQL says case-insensitive). | High | |
| Custom datatype | `"x"^^<urn:dt:custom>` preserved exactly, ordered as a string. | High | |
| Blank nodes | `_:b1` in two separate requests gives two different nodes. | High | |

**Arithmetic** [P][S]: `int + int` and `int * int` stay in 60 bits and wrap: `(2^59-1) + 1` gives `-576460752303423488`; `(2^59-1) * 2` gives `-2`; `9223372036854775807 + 1` gives `0` (`src/engine/sparqlExpressions/NumericBinaryExpressions.cpp:41-50 @ 6c5861a`, no overflow check, no promotion to double). Division always returns a double (`division-by-zero-is-undef` default true). **Comparison across numeric types** converts to double: `9007199254740993 = 9007199254740992.0` is `true`; `1 = 1.0` is `true`. `1 < "a"` is an error (unbound). **Mixed ORDER BY** of ints, decimals, doubles, negatives is numerically correct (`-576460752303423488 < -5 < -1.5 < 0 < 2.5 < 3 = 3.0 < 100`). [P]

**Issue to watch** [W]: #3884 (open, Nov 2026) reports an index build failure on unsigned/long literals that overflow the integer representation, seen on a master build; I did not test whether 0.6.0 behaves the same.

### 4.2 Implications for the plain projection

| Triplex value | Native projection literal | Verdict |
|---------------|--------------------------|---------|
| string | plain literal | exact (but ICU-ordered) |
| boolean | `xsd:boolean` | exact |
| integer within ±2^59 | `xsd:integer` | exact, returned as `xsd:int`, safe for `FILTER`, `ORDER BY`, aggregates (sums wrap past 2^59) |
| int64 beyond ±2^59, bigint | custom typed or plain string literal in the projection, exact lexical form in the history graph | native types wrap silently, so never emit them |
| number (binary64) | `xsd:double` | display only, 13 digits out, 49-bit mantissa in; exactness stays in the history graph |
| instant / datetime | `xsd:dateTime` in UTC `Z`, millisecond | only if Triplex time is already integer milliseconds in UTC. Never emit offsets other than `Z`, years outside `±9999`, or sub-millisecond values |
| ref | IRI | exact |
| json, blob metadata | string literal | exact |

The existing order-key and `_exact` shadows in `rdf.ts` exist because of precisely these limits. The projection can drop most of them for supported ranges, and the history graph must keep them.

---

## 5. RDF-star, quoted triples, blank nodes

### 5.1 Verdict

- **RDF-star and SPARQL-star are not supported in 0.6.0.** The SPARQL grammar has no `<<`/`>>` or `{| |}` tokens (`src/parser/sparqlParser/generated/SparqlAutomatic.g4`), the Turtle parser has none, and the upstream request for SPARQL 1.2 triple terms and RDF 1.2 reification is open (#2169, created 2025-07-01). [S][W] https://github.com/ad-freiburg/qlever/issues/2169
- **Probe** [P]: `INSERT DATA { GRAPH <g> { << <s> <p> <o> >> <annot> "x" } }` returned HTTP 400 `Invalid SPARQL query: Token "<"...`. The annotation form `<s> <p> <o> {| <valid> "2026" |}` also returned HTTP 400. A query using `<< ... >>` failed the same way.
- **Blank nodes work**: INSERT DATA labels are scoped per request (two requests with `_:b1` gave 2 distinct nodes); DELETE DATA rejects blank nodes; the engine allocates blank nodes in blocks. [P][S] `DeleteDataContext` at `SparqlQleverVisitor.cpp:907-913 @ 6c5861a`.
- Confidence: High.

### 5.2 Implications

- **A statement annotation cannot carry `valid` or `recorded` time.** Time must live on a node you name (the assertion subject in the compact history graph), not on the triple itself.
- A cheaper encoding than the current reified layout exists: **7 triples per assertion** (entity, attribute, value, valid_from, recorded_at, recorded_position, tx), 1 more for a retraction, measured as C in section 7. The values keep their native types for the supported ranges.
- If `valid_to` is nullable, leave it out when null (as `rdf.ts` already does) so open-ended facts do not pay for it.

---

## 6. Resources

### 6.1 Index build: measured and published

**Measured** [P] on 2 CPUs, 3 GiB container, Turtle read from a gzip pipe, `--stxxl-memory 512M --no-patterns`, all six permutations:

| Layout | Triples | Facts | Build wall | Triples/s | Peak RSS | Index bytes | B/triple | B/fact | Vocab words |
|--------|---------|-------|-----------|-----------|----------|-------------|----------|--------|-------------|
| P plain projection | 465,166 | 400k | 1.5 s | 0.32M | 0.96 GB | 11,985,723 | 25.8 | 30.0 | 145,313 |
| C compact assertion | 2,808,098 | 400k | 6.1 s | 0.46M | 2.06 GB | 55,061,862 | 19.6 | 137.7 | 626,875 |
| R reified (current) | 11,944,578 | 400k | 35.2 s | 0.34M | 1.05 GB | 289,564,715 | 24.2 | 723.9 | 3,431,645 |

- **R first attempt failed.** With default parser batching, R's build reached 2.93 GB RSS and was killed in the 3 GiB container. Re-running with `{"num-triples-per-batch": 1000000}` in `settings.json` peaked at 1.05 GB. So **peak build RSS is set by `num-triples-per-batch` and the parser, not by `--stxxl-memory`**, and a 12 GiB VM needs that setting for high-cardinality data (R has 8.6 unique vocabulary words per fact). Also visible: P needed 0.96 GB for only 465k triples, a ~0.9 GB floor.
- **Disk split for R**: permutations 27 to 34 MB each (six of them, 184 MB), vocabulary 104 MB (77 MB words + 27 MB offsets), i.e. 36% vocabulary. Vocabulary is the dominant growth term for unique-literal-heavy layouts.
- **Server RSS at idle** [P]: 31 MB (P), 34 MB (C), 46 MB (R) right after start, startup 15 to 40 ms. The vocabulary is on disk (`vocabulary-type: on-disk-compressed`, default). RAM beyond that is OS page cache and per-query memory.

**Published** [W]:

| Dataset | Triples | Machine | Build | Index | Source |
|---------|---------|---------|-------|-------|--------|
| DBLP | ~500M | Ryzen 9, NVMe | 5.3 min | 9 GB (~18 B/triple) | ISWC 2025 slides, https://ad-publications.informatik.uni-freiburg.de/ISWC_sparqloscope_BKTU_2025.slides.pdf |
| Wikidata truthy | ~8B | Ryzen 9, "enough RAM" | 3.1 h | 149 GB (~18.6 B/triple) | same slides |
| Wikidata full | ~20B | Ryzen 9 5950X, 128 GB, NVMe | ~5 h, ~20 GB RAM | ~500 GB (~25 B/triple) | `qlever-control` `Qleverfile.wikidata` header (`references/qlever-control/src/qlever/Qleverfiles/Qleverfile.wikidata`) |
| DBLP (older) | 390M | Ryzen 9 7950X, 128 GB | 231 s (1.7M/s) | 8 GB | https://github.com/ad-freiburg/qlever/wiki/QLever-performance-evaluation-and-comparison-to-other-SPARQL-engines |

Official Qleverfile settings to copy [S][W]: `STXXL_MEMORY` 5 to 10 GB, `num-triples-per-batch` 5,000,000 on 128 GB machines (so it must be scaled down on 12 GiB), `"ascii-prefixes-only": true`, `"prefixes-external": [""]`, `"languages-internal": []`, locale with `ignore-punctuation: true`.

### 6.2 `--no-patterns`

- **What it turns off:** the precomputed pattern file used for `ql:has-predicate` and the "pattern trick" (fast `?s ?p ?o` predicate counting). With it, `ql:has-predicate` fails: HTTP 500 `Assertion usePatterns_ failed... (do not specify the --no-patterns option for this to work)`. [P][S] `src/index/IndexBuilderMain.cpp:265-266 @ 6c5861a`, `src/index/IndexImpl.cpp:1176 @ 6c5861a`.
- **Cost of not having it** [P]: a full-scan group-by over R (12M triples, 3.6M groups) took 0.33 s, so predicate-counting queries still work, just as scans. Schema-discovery UIs for raw-SPARQL users will use `ql:has-predicate` rarely, if ever. At 100M facts the cost of scan-based predicate counting is open (question 7).
- **Keep it** unless predicate-set queries (`ql:has-predicate`) are a product feature. The build saves a pass and a file.

### 6.3 Server flags and what each one actually bounds

| Flag | Meaning | Bounds | Does not bound |
|------|---------|--------|----------------|
| `-m` / `--memory-max-size` (default 4 GB) | "total memory for query processing and caching", errors instead of crashing | Result tables (IdTables) and the result cache. Measured: 12M-row sort at `-m 300M` fails in 37 ms with `Tried to allocate 375 kB, but only 205.1 kB were available`, server stays up (RSS 97 MB). Cross join at `-m 1G` fails with `Tried to allocate 268.4 MB, but only 154 MB were available`. | **Delta triples** (measured, section 1.4). **Planner memory** (measured, 3.3; fixed by #3722, not-in-0.6.0). Memory limit also **not changeable at run time** in 0.6.0 (#3306, not-in-0.6.0). `src/ServerMain.cpp:87-93 @ 6c5861a` |
| `-c` cache-max-size, `-e` single entry | Result cache (part of `-m`) | cache and entry size. The cache is emptied by every update. | |
| `-j` num simultaneous queries (default 1) | HTTP worker threads for queries | concurrency. Updates always run on one separate thread. | |
| `--persist-updates` | Rewrite `<base>.update-triples` per request | | |
| `--no-patterns` | see 6.2 | | |
| `-s` / `default-query-timeout` (30 s) | Cooperative timeout | | A non-interruptible step (sort) ignores it until it finishes |
| `--no-access-check` | skips the access token for admin commands | | Turns `rebuild-index`, `clear-delta-triples`, runtime settings, LOAD and writes into an open door. Only safe on a loopback or private port. |
| `--set-runtime-parameter k=v` (repeatable) | any runtime parameter, e.g. `query-planning-budget=1`, `sort-in-memory-threshold` | | |
| default logs | `<base>.metrics-log.jsonl` per query and `<base>.server.resource-usage-log.tsv` are written next to the index | | They grow without bound. Turn off with `--no-metrics-log`, `--no-resource-usage-log` or rotate. |

Useful runtime parameters (global, set with an access token or at start) [S] `src/global/RuntimeParameters.h:48-205 @ 6c5861a`: `query-planning-budget` (1500), `sort-in-memory-threshold` (5 GB; the external `Sort` operator spills to `<base>.sort.<uuid>.dat` above it, see `src/engine/Sort.cpp:83-105,168-190 @ 6c5861a`, but `ORDER BY` itself sorts in memory, `src/engine/OrderBy.cpp:66-122`), `request-body-limit` (1 GB), `cache-max-num-entries` (1000), `lazy-index-scan-num-threads` (2), `parallel-sort-num-threads` (3).

### 6.4 Timeouts and cancellation

- **Timeout.** `timeout` parameter per request (as a form field for form-encoded POST; the URL form is rejected with `URL-encoded POST requests must not contain query parameters in the URL`). Larger than the default requires an access token (or `--no-access-check`). A timeout answers HTTP 429 `Operation timed out. Last operation: <op>`. [S][P] `src/engine/Server.cpp:205-232 @ 6c5861a`.
- **Timeouts are cooperative.** A 12M-row `ORDER BY` with `timeout=300ms` returned the 429 only after 0.97 s (the sort cannot be interrupted, `src/engine/OrderBy.cpp:72` carries the TODO). [P][S]
- **Cancel.** There is **no HTTP cancel command in 0.6.0**. Send header `Query-Id: <id>` (a duplicate id gives HTTP 409), then open a WebSocket to `/watch/<id>` and send the text `cancel` (or `cancel_on_close`). `cmd=dump-active-queries` lists active ids with start times. [S][P] `src/util/http/websocket/WebSocketSession.cpp:22-27,50-62 @ 6c5861a`, `Server.cpp:995-1004`. Probe: a cancel at ~0.4 s produced HTTP 429 `Operation was manually cancelled. Last operation: OrderBy on DESC(?o)` after 1.04 s, again only when the sort finished. The repo's client already sends the `cancel` frame (`QleverClient.ts`) and does not await acknowledgement.
- **Update timeouts are not clean** (1.8).

### 6.5 Planner OOM at 2 GiB (the repo's observed failure)

- Matches the measured growth in 3.3: planner memory is untracked by `-m` in 0.6.0, multiplies per `FILTER EXISTS`, and the same query shape needs only 40 MB with `query-planning-budget=1`.
- **Recommendation:** run with `--set-runtime-parameter query-planning-budget=1` (or a small value), keep `FILTER NOT EXISTS` clauses per group at 4 or fewer until #3190 is available, and keep a cgroup limit above `-m` plus delta plus planner headroom.

---

## 7. Results and paging

### 7.1 Verdict

1. **ORDER BY with LIMIT/OFFSET.** Semantics are standard: sort, then offset and limit. The sort is `std::sort` or a parallel sort (`USE_PARALLEL_SORT`, default 3 threads) on the **sort keys only**, so rows with equal keys come out in an unspecified order. [S] `src/index/IdTableUtils.h:33-65 @ 6c5861a`, `src/engine/OrderBy.cpp:66-122 @ 6c5861a`.
2. **Observed determinism** [P]: a window `ORDER BY ?o LIMIT 8 OFFSET 3000` over 6,242 rows with only 5 distinct keys returned identical bytes in 6 cold runs and after an unrelated update (3 more runs). Six consecutive pages of 4,000 rows had 6,242 rows and 6,242 distinct subjects (no gap, no duplicate), for both `ORDER BY ?o` and `ORDER BY ?o ?s`. That is stability in practice for identical inputs and one server, not a guarantee, because tie order follows the scan order of the input and delta merges.
3. **Rule for Triplex:** every paged ORDER BY must end in a unique tie-breaker (the subject or assertion IRI), and the page cursor must be a key, not an offset. With a total key, QLever's order is deterministic (ICU TOTAL ends in a byte compare). [S][P]
4. **Result formats** (`Accept` header or `.ext`) [S] `src/util/http/MediaTypes.cpp:39-50 @ 6c5861a`: `application/sparql-results+json` (with a `meta` object carrying `query-time-ms` and `result-size-total` by default, runtime parameter `sparql-results-json-with-time`), `application/sparql-results+xml`, `application/qlever-results+json` (adds `resultSizeExported`, `resultSizeTotal`, runtime tree, `selected`), `text/tab-separated-values`, `text/csv`, `text/turtle`, `application/n-triples`, `application/n-quads`, `application/octet-stream` and `application/qlever-export+octet-stream` (binary). [P] confirmed JSON, TSV, CSV, qlever-results.
5. **Term rendering differs by format.** `qlever-results+json` returns full RDF terms (`"576460752303423487"^^<...XMLSchema#int>`). TSV prints Turtle-like terms (IRIs in `<>`, strings in quotes, typed numerics bare). CSV prints bare lexical values (`urn:n:i1,576460752303423487`). [P]
6. **Size limits.** No row cap on results. Request body limit is 1 GB (`request-body-limit`). The `send` URL parameter limits exported rows for the two JSON formats. Result export is streamed: 12M rows exported as TSV in 23.6 s (1.59 GB, ~67 MB/s, ~0.5M rows/s) and as sparql-results+json in 30.0 s (1.83 GB) with `-m 300M`, server RSS stayed at 145 MB. [P]
7. **Update response** is JSON with the per-operation timing tree and delta counts (`delta-triples.before/after/difference/operation`, `located-triples.<perm>.blocks-affected`). No result handle. [P]

### 7.2 Published query performance at 100M to 1B+ triples

- QLever team, 105 queries, geometric mean: DBLP ~500M triples 0.2 s; Wikidata truthy ~8B triples **2.3 s** (Virtuoso 10.1 s, MillenniumDB 23.3 s, GraphDB 108 s, Blazegraph 124 s, Jena 216 s). Same slides state QLever handles over one trillion triples on one machine (self-reported). [W] ISWC 2025 slides above.
- Third party, 4 engines on the 20B-triple Wikidata dump, 10-minute timeout, Ryzen 9950X, 192 GB, ~3/4 of memory given to the engine: QLever fastest, loaded in ~4.5 h. [W] https://ceur-ws.org/Vol-4108/paper3.pdf (Patel-Schneider, Wikidata Workshop ISWC 2025).
- Older team table, DBLP 390M: average query time 0.7 s vs Virtuoso 2.2 s. [W] wiki page above.
- **Caveat.** All published runs use 16-core machines with 128 to 192 GB RAM. The target VM has 6 CPUs and 12 GiB. None of this is evidence for tail latency at 100M facts on that VM. My own toy-scale cold-cache latencies for the three layouts were 4 to 40 ms for entity lookup, numeric range count and group-by (R 12M triples, C 2.8M, P 465k), with the OS page cache warm. [P]

---

## 8. Scale estimate: 100M facts on 6 CPUs and 12 GiB

**Inputs** are the measured per-fact figures above (400k facts), extrapolated linearly [E]. Linear extrapolation is generous for vocabulary dedupe in P and optimistic for build rate at large sizes (external merges). Treat disk numbers as ±25% and times as ranges.

| | **R** reified (current) | **C** compact assertion | **P** plain projection | **P + C** (proposed) |
|---|---|---|---|---|
| Triples at 100M facts | ~2.99 B (29.9 per fact) | ~702 M (7.0) | ~118 M (1.18) | ~820 M |
| Index disk (permutations + vocabulary) | ~72 GB | ~13.8 GB | ~3.0 GB | ~16.8 GB |
| Vocabulary words | ~860 M | ~157 M | ~36 M | ~193 M |
| Disk during a build or rebuild (old + new + `previous.*` kept) | 150 to 220 GB | 28 to 42 GB | 6 to 9 GB | 34 to 51 GB |
| Scratch build, measured rate at 2 CPUs | 2.4 h | 26 min | 6 min | ~32 min |
| Scratch build, est. at 6 CPUs (1.5 to 2.5x) | 1.0 to 1.6 h | 10 to 17 min | 2.5 to 4 min | 13 to 21 min |
| `rebuild-index` at 2 CPUs measured rate (2.5M triples/s on R, vocabulary-bound for new words) | ~20 min | ~5 min | ~1 to 2 min | ~6 to 7 min |
| Delta triples per fact written | ~30 to 37 | ~8 | ~1 to 2 | ~9 to 10 |
| Facts written before 1M delta triples | ~30k | ~125k | ~500k | ~100k |
| Idle server RSS | 46 MB at 12M triples, larger indexes untested | | | |
| Hot working set vs the 12 GiB VM | far larger than RAM | 14 GB, about RAM | fits | 17 GB, partly cached |

**Reading the table.**
- **The reified layout's triple count is the cost driver.** It is 30x P and 4x C in triples, 24x P and 5x C in bytes. At 3 billion triples it exceeds the 12 GiB VM for any realistic hot set.
- **P + C is ~1/4 of R by triples and by bytes.** Index sizes of ~17 GB sit just above the VM's RAM, so queries on cold regions read from disk. Real latency at that scale is an open question (7.2 caveat).
- **Rebuild cadence for P + C:** a fact write adds ~9 to 10 delta triples. With a 1M delta ceiling that is a rebuild every ~100k fact writes. At 10 facts per second that is every ~2.8 hours. Each rebuild takes ~6 to 7 minutes at the measured 2-CPU rate, scaled to P + C. The default rebuild thread settings are deliberately low, so 6 CPUs may not shorten it much. The old index keeps serving meanwhile (CPU and disk are shared).
- **Further savings, not measured here:** `--only-pso-and-pos-permutations` drops four permutations for the history graph if it is never queried by variable predicate (expected disk -60%, build faster, but one flag per index, so it needs its own server or a rule that raw users must not hit it). `--encode-as-id` (IRIs with a numeric tail become ids, no vocabulary entry, ordering between encoded and plain IRIs is wrong) only helps entity IRIs of the form `<prefix><digits>`. `--iri-as-blank-node-regexes` is experimental.
- **Build memory:** set `num-triples-per-batch` to 1M or lower and `--stxxl-memory` 512M to 1G on the 12 GiB VM. R's default settings needed >3 GB at 12M triples, P+C at 100M facts are ~10x lower in triples per fact but the same batching applies.

---

## Top 5 design-relevant facts

1. **Update cost is O(total delta) per request, with no rollback.** Every update rewrites the whole persisted delta, deep-copies it for the snapshot and clears the result cache. Measured 0.7 s per request at an empty delta rising to 1.5 s at 1M delta, ~0.9 s of which is independent of batch size. A failed multi-operation request and a timed-out single operation both leak partial state into the next published snapshot (and the multi-op leak is persisted). Design: one operation per request, big batches, rebuild at ~1M delta triples, restart on any update error.
2. **`-m` bounds result tables only.** Delta memory (0.4 to 1.7 KB per triple), planner memory (geometric in the number of `FILTER EXISTS`) and the persisted-file replay are outside it, and the container will be OOM-killed before QLever reports an error. Set `query-planning-budget` low and cap the delta.
3. **The layout is the scale lever.** The current reified layout is 29.9 triples and 724 B of index per fact, 3 billion triples and ~72 GB at 100M facts. Plain projection plus a 7-triple compact assertion graph is ~0.8 billion triples and ~17 GB, with a 3x to 5x faster build and rebuild. Rebuilds from the live index take minutes, not hours.
4. **Typed literals are lossy in specific, silent ways.** Integers wrap at ±2^59 on UPDATE, doubles keep 49 mantissa bits and print 13 digits, date-times lose sub-millisecond and non-hour zones and compare by local clock, invalid typed literals silently become strings. The projection can use native types only inside those ranges, and the exact forms stay in the history graph.
5. **String order is ICU, and EXISTS correlation differs from the spec.** ORDER BY and range FILTER on strings use en_US collation (lowercase-first, case-insensitive primary). Outer variables used only in an inner FILTER are unbound in EXISTS (wrong answers, reproduced), and MINUS must bind its correlation variables inside its body. No RDF-star, so valid and recorded time live on assertion nodes. Default graph is the union of all graphs, so user SPARQL needs `FROM <urn:triplex:current>`.

---

## Open questions needing experiments

1. **Delta ceiling at scale.** What does a 1M-triple delta cost on a 100M-fact P+C index, per request (tiny update, 1k-triple update, 25k-triple update), and is the ~0.9 s fixed cost really O(delta) for single-triple requests? Direct measurement of tiny-update latency vs delta size was not done (inferred from the timing breakdown).
2. **Update-error recovery.** After a timeout mid-mutation, does `rebuild-index` copy the partial permutations into the new index? Does a restart always clear the junk, and is there any case where junk is persisted? Does the 429 on a timed-out single operation always indicate partial application, or only after located triples were added?
3. **Concurrency.** Query latency during a rebuild and during sustained updates on the 6-CPU VM, and whether updates that arrive during a rebuild are all carried over (source says yes, not exercised).
4. **Mixed vocabulary order.** ORDER BY and FILTER ranges when half the strings are in the index vocabulary and half are local. Source says one comparator; not probed.
5. **`US_POSIX` for non-ASCII.** Whether the repo's text (user names, free text) is ASCII-only enough for the `en_US_POSIX` build to act as a binary order, or whether a `QLEVER_NO_UNICODE` custom build is warranted. Also check `ignore-punctuation` choice against raw-SPARQL expectations.
6. **Greedy planning quality.** Effect of `query-planning-budget=1` on the repo's 142-task packet and on realistic join-heavy reads over the 100M-fact P+C index.
7. **Real latency at 100M facts on 6 CPU, 12 GiB.** Cold and warm latency for entity lookup, attribute range scan, GROUP BY and `ORDER BY ... LIMIT` on a 17 GB index with 12 GiB RAM; startup RSS for a multi-GB vocabulary; `--no-patterns` cost for predicate-count queries at that size.
8. **Deep OFFSET paging cost and cache behavior** (does the sorted subtree stay in the cache across pages) on a million-row ordered result.
9. **Durability.** Power-loss behavior of `<base>.update-triples` (no fsync found), and whether a crash during the temp-file write can leave `.update-triples.tmp` plus a stale file in a way that loses the last acknowledged update.
10. **Upgrade path.** Which of #3190 (EXISTS planning), #3722 (planner memory accounting), #3306 (run-time memory limit), #3602 and #3678 (MINUS fixes) land in the next release, and whether to build a pinned master image once they matter.

---

## Appendix: references

**Source (all `@ 6c5861a`, under `references/qlever`)**: `src/index/DeltaTriples.{h,cpp}`, `src/index/LocatedTriples.{h,cpp}`, `src/util/SortedSequence.h`, `src/engine/ExecuteUpdate.cpp`, `src/engine/Server.cpp`, `src/ServerMain.cpp`, `src/libqlever/Qlever.cpp`, `src/index/IndexRebuilder.cpp`, `src/engine/RebuildIndexStrategy.h`, `src/engine/ExistsJoin.cpp`, `src/engine/Minus.cpp`, `src/engine/OrderBy.cpp`, `src/engine/QueryPlanner.cpp`, `src/index/IdTableUtils.h`, `src/index/vocabulary/{StringSortComparator,LocaleManager}.h`, `src/index/LocalVocabEntry.cpp`, `src/index/LocalVocabContextImpl.cpp`, `src/global/{ValueId,ValueIdComparators,RuntimeParameters}.h`, `src/util/{Date,NBitInteger}.h`, `src/util/DateYearDuration.cpp`, `src/index/ExportIds.cpp`, `src/parser/RdfParser.{h,cpp}`, `src/parser/sparqlParser/SparqlQleverVisitor.cpp`, `src/index/IndexBuilderMain.cpp`, `src/index/IndexImpl.cpp`, `src/index/CompressedRelation.cpp`, `src/index/ConstantsIndexBuilding.h`, `src/util/http/MediaTypes.cpp`, `src/util/http/websocket/WebSocketSession.cpp`, `src/engine/Sort.cpp`, `CMakeLists.txt`.

**Web**
- QLever docs: https://docs.qlever.dev/update/, https://docs.qlever.dev/rebuild-index/, https://docs.qlever.dev/benchmarks/
- v0.6.0 release notes: https://github.com/ad-freiburg/qlever/releases/tag/v0.6.0
- Update wiki: https://github.com/ad-freiburg/qlever/wiki/QLever-support-for-SPARQL-1.1-Update, https://github.com/ad-freiburg/qlever/wiki/First-tests-with-SPARQL-1.1-Update
- Issues and PRs: #2138, #2169, #2509, #2027, #3106, #3190, #3306, #3573, #3602, #3678, #3722, #3884 at https://github.com/ad-freiburg/qlever/issues/ (and `/pull/`)
- Benchmarks: ISWC 2025 Sparqloscope slides (url in 6.1), Patel-Schneider CEUR Vol-4108 paper 3, QLever evaluation wiki page (url in 6.1)

**Probe artifacts** (`/Users/sam/Claude/Projects/triplex-db-2/R2-qlever-probe/`)
- `gen.ts`, `count.ts`, `gen-out/{R,P,C}.ttl.gz`: dataset generator from the real `rowFields`, plus 400k-fact outputs (N=400000, E=80000).
- `build-logs/`: `qlever-index` logs, resource-usage TSVs, rebuild logs, `build-times.txt`.
- `probe-scripts/`: `p1.sh` to `p15.sh`, `e1.py` (update scaling), `e1b.py`, `p7.py` (timeout, WebSocket cancel), `transcript-p3.txt` (typed literals), `transcript-p4.txt` (collation), `transcript-p5.txt` (EXISTS/MINUS), `e1.out` (the 40-round update table). Raw outputs of probes P1, P2, P6 to P15 were read from the probe session and are reproduced in the tables above. Re-running the scripts regenerates them (each overwrites `transcript.txt`).
- Probe container `tx2-probe-r2` removed. Container data directory emptied. No repo source touched, no network requests carried personal data.
