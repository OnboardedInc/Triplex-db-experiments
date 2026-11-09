# R46: can a subject pull from the broker's H1 store reach 1,100 pulls/s per core?

Researcher: R46 (Opus 5.5, high). Date: 2026-11-09. Read-only on code; the only file written in the repository is this one. No engine,
Docker, colima or slot was touched, and the evidence store was not opened. All measurements ran on synthetic W0-shaped SQLite files built in
the scratchpad from the real W0 generator (`packages/w0/src/population.ts`), with the real SQL01 reader worker source
(`packages/qlever/src/broker/sqlite-worker.ts`) and the real core value decoder (`packages/core/src/ValueDomain.ts`). Scripts are in
appendix A; they regenerate every number in about ten minutes. Goals and targets come only from `lab/SCOPE.md`, `lab/NORTH-STAR.md` and
`lab/TARGETS.md`.

**North star:** P4 (TARGETS 1.1: weighted pull p50 <= 5 ms, p99 <= 25 ms, >= 1,100 pulls/s per engine core with broker and kernel CPU in
the denominator per Q68d, depth-10/depth-1 p99 and bytes <= 1.1x). P2 as a guard (commit p50 <= 10 ms, p99 <= 50 ms; EXP-QH1 G7: commit
p50 delta <= 0.5 ms). P1 exactness is the floor.

Evidence labels: **[M]** measured here (script and output named), **[S]** read in source (path), **[D]** derived by arithmetic from [M]
and [S], **[E]** estimate, **[W]** web source (linked).

## 1. Answer

1. **The budget.** 1,100 pulls per CPU second is **909 µs of CPU per pull, summed over every thread that serves it** (Q68d). A W0 pull
   reads about 430 to 450 facts over 4 to 7 hops [M][S].
2. **Today's path is 4 to 5x over budget, and most of the cost is not SQLite.** The QH1 design as briefed (today's JSON rows, one worker
   request per hop, row objects structured-cloned, today's adapter and kernel) measured **3.5 to 4.4 ms of CPU per pull, 225 to 285
   pulls per CPU second** [M]. QH1 product changes 2 and 3 (one JSON text per hop, one-pass bucketing) bring it to **2.3 to 2.7 ms, 370 to
   430 per CPU second** [M]. R40's prediction 2 (1,250 to 2,500 after those changes) is falsified by this bench.
3. **R45's "about 1.1 ms of SQLite CPU per pull in either layout" does not reproduce.** Measured as thread CPU over 1,000-pull rounds,
   SQLite plus row decode is **1.6 to 1.9 ms per pull on today's JSON rows but 0.22 to 0.39 ms on R45's compact rows** [M]. The compact
   layout is not the limit; the 16-byte id Buffer alone is about 0.09 ms of it [M].
4. **Once storage is compact, the kernel read path is the limit.** Today's adapter and kernel cost **1.0 to 1.2 ms per pull by
   themselves** [M], more than the whole budget. Half of that is `assertValueInDomain`, which re-validates every stored value on read at
   about **1.0 µs per row** [M]. The other half is per-hop object churn: `TripleRow` objects, the snapshot mask passes, per-id filters,
   maps and sorting.
5. **What reaches the bar without touching the commit path:** compact rows (HS01) clustered by owner, one worker operation per pull in one
   read transaction, the answer emitted by SQLite as one text (or as columns) and parsed once, and a lean kernel decode that builds
   `Triple`s directly. Measured **0.58 to 0.87 ms per pull, 1,140 to 1,720 pulls per CPU second**, single client and 4 clients, on a
   loaded host [M]. Margin over the bar is 1.04x to 1.56x, so it is not yet safe.
6. **What clears it with margin, at a P2 price:** a per-subject current document (option a). Measured **0.25 to 0.32 ms per pull, 3,100
   to 4,000 per CPU second** [M], but built in the commit transaction it adds **0.91 ms to commit p50** (fails QH1 G7's 0.5 ms guard),
   0.41 ms to p99, 463 µs of writer CPU and 2.1x the WAL bytes per commit, and 66 to 112 B per fact [M].
7. **Options that do not help:** a recursive CTE for the whole reach is slower than one `IN` per hop (0.39 to 0.49 ms against 0.33 to
   0.39 ms) [M]; H1w on today's JSON rows gains little, because the worker must parse every row to find its refs [M]; more reader
   threads raise capacity but not efficiency (CPU per pull rises 10% to 80% at 4 clients) [M].
8. **One exactness trap found.** SQLite's JSON functions render REAL values with 15 significant digits: **187,954 of 199,924 random
   finite doubles changed** through `json_group_array` [M]. Any SQLite-built answer text must format REAL with `printf('%!.17g', v)`
   (1 mismatch in 199,905, the -0 case, which the QLever value domain already rejects on write) [M][S]. O-REPLAY on W0 would not catch
   this, because W0's numbers are small integers.
9. **Measurement trap found.** The QH1 brief's CPU accounting ("main-thread CPU from `process.cpuUsage()` plus each reader worker's
   thread CPU") double counts: `process.cpuUsage()` is process-wide and already includes the workers [M][W]. Section 4 gives the rule.
10. **Recommendation:** run QH1 on the HS01 compact layout plus an owner key, with the whole-pull worker operation as the primary arm
    (not a fallback after G5 fails), a semantically identical fast path for the read-side domain check, and a decomposition gate first.
    Keep option (a) as a fallback arm only. Section 5.

## 2. Where the per-pull CPU goes

### 2.1 What one pull does today

| Step | Thread | Code | Per pull (W0 mean) |
| --- | --- | --- | --- |
| BFS loop: one `T.entities(frontier)` per hop until the frontier is empty | main | `lab/bench/lib/composition.ts:129-151` [S] | 4 to 7 hops (hops + 1) |
| `TriplesLive.entities` resolves the basis, calls `getByEntities`, maps each row with `rowDecoder` | main | `packages/core/src/store/TriplesLive.ts:85-110, 543-548` [S] | 1 Effect run per hop |
| `rowDecoder`: `decodeValueColumns` then 7 `Option` allocations | main | `TriplesLive.ts:85-108`, `ValueDomain.ts:275-316` [S] | 430 to 450 rows |
| `decodeValueColumns` calls `assertValueInDomain` on every value: property descriptors, `Schema.is(TripleValue)`, `TextEncoder.encode` of strings, and `JSON.stringify` plus encode for the storage-size bound | main | `ValueDomain.ts:117-122, 166-252` [S] | every row |
| `getByEntities`: `queryRows` once, then one `rows.filter` per entity id (O(ids x rows)); result wrapped by `snapshotReadPolicy.wrap`, which calls `readBasis` and `maskSnapshotResult` (an `every()` shape check and a `map` over each row array) | main | `BrokerStorageAdapter.ts:640-698` [S] | about 145 entities |
| `queryRows` (H1 branch after QH1 change 1): `readBasis`, `broker.pullAt`, `rows.filter(select)` with `entities.includes`, `byId` map, `visibleAt` map, `snapshotRows`, `toSorted` with a `localeCompare` tie-break | main | `BrokerStorageAdapter.ts:263-407` [S] | per hop |
| `HostLog.pull`: a new `MessageChannel` per request, `postMessage` to one of 4 reader workers | main | `log.ts:129-160, 452-461` [S] | per hop |
| Reader worker: gate atomics, `BEGIN`, `marker()`, `pull` (`marker()` again, `live_rows` and `retired_rows` with `entity IN (...)`, `.all()` objects, `JSON.parse` per row), `COMMIT`, `postMessage` of row objects (structured clone) | worker | `sqlite-worker.ts:147-161, 210-229` [S] | per hop |

W0's shape decides the hop structure. A placement S has 15 to 25 own facts, one `answers` ref per chain, one `location` ref and
optional document and decision records. Each answer is its own entity with `field`, `value` and `next` (3 rows), in chains of `hops`
answers; the location references a jurisdiction (`population.ts:509-523`) [S]. So a pull touches about 145 entities of about 3 rows each,
almost all owned by S: W0's schema requires owned refs to start with the owner id plus `/<prefix>:` (`packages/w0/src/schema.ts:46`) [S].
Only the location and the jurisdiction are shared.

### 2.2 Measured decomposition

Setup [M]: 2,000 W0 placements (893,570 facts, 1,617,428 journal rows, 4,081 retired versions; mean 449 facts per subject reach, 429 to
451 rows read per pull in the samples), Apple M3 Pro (6 performance and 6 efficiency cores), 36 GB, Node 22.23.2, better-sqlite3 12.10.0,
SQLite 3.53.1. CPU is thread CPU (`process.threadCpuUsage`) or process CPU (`process.cpuUsage`), never wall time. Host load average
was 6 to 34 during the runs (other lab agents); section 4.4 covers what that does to the numbers.

**SQLite plus row decode, one thread, no IPC** (`bench1.mjs`, median of rounds 2 and 3 of 1,000 pulls; three cache settings):

| Arm | Default 2 MB cache, µs/pull | 1 GB cache | mmap | µs per row (mmap) |
| --- | ---: | ---: | ---: | ---: |
| J1 today: JSON rows, `IN` per hop, `.all()` objects, `JSON.parse` per row | 1,875 | 1,740 | 1,578 | 3.68 |
| J1 split: `JSON.parse` share | 501 | | | 1.17 |
| J2 `json_each(?)` instead of an `IN` list (fixed statement) | 1,563 | | | |
| J3 JSON rows, one owner range `[S, S||'0')` plus `IN` for misses | 1,191 | 804 | 807 | 1.88 |
| J4p JSON subject document, one parse | 903 | 1,078 | 1,117 | 2.60 |
| C1 compact rows (R45 round 1), `IN` per hop, raw arrays, object per row | 343 | 389 | 330 | 0.77 |
| C2 compact, recursive CTE for the whole reach | 392 | 488 | 407 | 0.95 |
| C3o compact, owner range plus `IN` for misses, object per row | 291 | 310 | 260 (218 at load 6) | 0.61 |
| C6 C3 without the 16-byte id column | | | 79 | 0.18 |
| C6b C3 with the id Buffer | | | 170 | 0.40 |
| C7 C3 with SQLite building one `json_group_array` text | | | 118 | |
| C7p C7 plus one `JSON.parse` | | | 175 | 0.41 |
| C4 compact subject document, Buffer only | 33 | 45 | 17 | |

Read this as:

1. **Row materialization, not statement count, is the SQLite-side cost.** The recursive CTE (one statement) is slower than one `IN` per
   hop. Today's JSON rows cost 3.7 to 4.4 µs per row because each row is a 520-byte string that better-sqlite3 converts to a JS string and
   then `JSON.parse` rebuilds as a 20-key object (1.17 µs per row for the parse alone).
2. **The id Buffer is half of the compact cost.** 0.21 µs per row (C6b minus C6). better-sqlite3 returns every BLOB as a Node `Buffer`
   [W: better-sqlite3 API]. Selecting an integer id, or `hex(id)` inside SQLite, removes most of it.
3. **mmap lowers system time,** because reads are no longer copied from the kernel page cache [W: SQLite mmap]: J1's system share falls
   from 0.36 to 0.27 and C4's from 0.72 to 0.48 [M]. It does not change the user-space cost.
4. **R45 appendix A.3 measured 2.4 to 2.9 µs per row in both layouts.** This bench measures 3.7 to 4.4 µs per row for JSON rows and 0.6
   to 0.9 µs for compact rows with objects. The likely difference is method: R45's bench issued one statement per entity and reported wall
   time; this one reports thread CPU over `IN` and range reads. R45's conclusion that the layout gives no warm-CPU gain should be replaced
   by this table.

**Worker protocols, CPU on every thread** (`bench2.mjs`/`bench5.mjs`; W1 runs the unmodified SQL01 reader worker and `log.ts`'s
`request()` protocol; µs of process CPU per pull):

| Arm | 1 client | main / worker | 4 clients | Pulls per CPU second |
| --- | ---: | --- | ---: | ---: |
| W1 today: `pull` op per hop, row objects cloned (no kernel) | 2,467 | 540 / 1,920 | 2,608 | 383 to 405 |
| W2 QH1 change 2: one JSON text per hop, parsed once on main | 1,544 | 570 / 971 | 1,347 | 648 to 743 |
| W3a H1w on JSON rows: whole BFS in the worker, JS parse for refs | 1,901 | 460 / 1,422 | | 526 |
| W3b H1w on JSON rows, refs by `json_extract` in SQL | 1,864 | 508 / 1,354 | | 537 |
| W3c W3b with the text forwarded unparsed (option c) | 1,404 | 87 / 1,316 | | 712 |
| W4a H1w compact, owner range, arrays cloned, `TripleRow` built on main | 753 | 108 / 478 | | 1,328 |
| W4b H1w compact, owner range, columns cloned, `TripleRow` built on main | 583 to 659 | 132 / 414 | 722 to 1,048 | 954 to 1,715 |
| W4c H1w compact, `TripleRow` JSON text built in the worker | 1,115 | 376 / 688 | | 897 |
| W4d H1w compact, arrays only, no objects (option c, compact) | 526 to 542 | 82 / 403 | 863 to 872 | 1,147 to 1,901 |
| W5 compact subject document forwarded as bytes (options a and c) | 179 | 48 / 112 | 100 | 5,603 to 9,957 |

Rows where main plus worker is less than the process total are other threads (V8 garbage collection helpers, libuv): up to 208 µs per
pull at 4 clients (W4b: 1,048 total, 157 main, 683 worker) [M].

**Kernel and adapter on the main thread** (`bench3.mts`, real `effect@4.0.3` `Option`/`Effect` and real `decodeValueColumns`; µs per pull
over a parse-only baseline of 413 µs; 500 pulls, median of rounds 2 to 5):

| Arm | µs per pull |
| --- | ---: |
| K1 today: adapter H1 branch, wrap and mask, `getByEntities`, `rowDecoder`, BFS | 1,006 |
| K2 K1 with `Set` membership, one-pass bucketing, code-unit tie-break (QH1 change 3 and more) | 893 |
| K3 K2 with a cached `Intl.Collator` | 1,094 (slower) |
| K4 K2 without the read-side `assertValueInDomain` | 394 |
| K5 K4 without the two snapshot-mask passes (no future rows in the sample) | 332 |
| K6 K5 without the per-hop sort | 284 |

Per-row and per-hop unit costs (`bench3b.mts`, 87,348 rows) [M]:

| Step | Cost |
| --- | ---: |
| `JSON.parse` of one 520-byte row | 0.97 µs per row |
| `decodeValueColumns` with `assertValueInDomain` | 1.01 µs per row |
| `invalidValue` alone | 1.02 µs per row |
| decode without the domain assertion | 0.011 µs per row |
| the 7 `Option` allocations in `rowDecoder` | 0.023 µs per row |
| `entities.includes` in `select`, 150-row hop | 0.067 µs per row |
| `getByEntities`' per-id `rows.filter`, 150-row hop | 0.31 µs per row |
| one `Effect.runPromise` of a three-level gen with three `tryPromise` | 3.3 µs per hop |

The sort's `localeCompare` is not the problem (ids here are uppercase Crockford base32; `localeCompare` and code-unit order agreed on all
96 compared pairs), and a cached `Intl.Collator` is slower than `localeCompare` in V8 [M].

### 2.3 Full stack, interleaved

`bench5.mjs` runs every arm in rotation inside each round (7 rounds of 300 pulls, first round dropped), so host load hits all arms alike;
the ratio to today's full stack is computed per round [M]:

| Arm | µs CPU per pull (two runs) | Pulls per CPU second | Ratio to W1K | p50 / p99 ms (1 client) |
| --- | ---: | ---: | ---: | --- |
| W1K today: SQL01 worker per hop, today's adapter and kernel | 4,186; 4,441 | 225 to 239 | 1 | 4.4 to 5.0 / 45 to 104 |
| W2K QH1 change 2 plus today's adapter and kernel | 2,679 | 373 | 0.68 | 2.8 / 42 |
| W6K compact owner-range subtree read at hop 0, later hops served from it, today's adapter and kernel per hop (prefetch design) | 1,860 | 538 | 0.39 | 1.0 / 6.5 |
| W6 compact, SQLite-built answer text, one parse, BFS and `TripleRow`s on main | 651; 676 | 1,479 to 1,537 | 0.13 to 0.16 | 0.43 to 0.56 / 2.9 to 4.1 |
| W7 W6 plus lean kernel: `Triple`s built directly, no second materialization, domain check skipped | 580; 622 | 1,609 to 1,723 | 0.12 to 0.14 | 0.41 to 0.50 / 2.6 to 3.9 |
| W5d compact subject document, one parse, lean `Triple`s (option a in full) | 247 | 4,042 | 0.07 | 0.24 / 2.5 |

At 4 clients (`out-bench5b-c4.txt`): W1 (no kernel) 3,603, W6 881, W7 874, W5d 272 µs per pull [M].

**Correctness check of the arms** (`bench2.mjs` with `VALIDATE=500`): the multiset of (entity, attribute, value) per subject from W1
(today's worker), W4b (compact columns) and W6 (SQLite-built text) was identical for 500 of 500 subjects, 221,145 rows [M]. The first
attempt found 11 differences, all one bug in the bench's own boolean decode of `printf` output ("1.0"); that is the kind of codec gap
section 3.3 says must be gated.

### 2.4 The decomposition in one picture

Shares are [D] from the tables above (J1 split, W1 main and worker, K1 to K4); totals are [M].

```
 today, QH1 as briefed: about 3,500 to 4,400 µs CPU per 450-fact pull
 |-- worker: SQLite step on 520-byte JSON rows .............. about 1,100
 |-- worker: JSON.parse per row ............................. about   450-500
 |-- structured clone of 20-key objects, both sides .......... about   500-900
 |-- main: assertValueInDomain on every value ................ about   450-500
 '-- main: TripleRow churn, per-id filters, mask, maps, sort .. about   500-700

 compact + owner range + one worker op + lean decode: about 580 to 870 µs
 |-- worker: SQLite range and refs, answer text built in C .... about   150-450
 |-- one string transfer, one JSON.parse on main ............. about    60-100
 '-- main: BFS and Triple objects (no re-validation) ......... about   150-300

 budget for 1,100 pulls per CPU second ....................... 909 µs
```

## 3. The options, measured

### 3.1 Summary

| Option | µs per pull (all threads) | Pulls per CPU second | P2 commit effect | Bytes per fact | P1 exact cuts | RQ01 route equivalence |
| --- | ---: | ---: | --- | ---: | --- | --- |
| Today (JSON rows, per hop, today's kernel) | 3,500 to 4,400 [M] | 225 to 285 | none | R45: 5,656 today | yes, per-hop basis filter | registered as pending (`pendingRouteAdapters`) |
| (a) per-subject current document, in the commit transaction | 250 to 320 [M] | 3,100 to 4,000 | p50 +0.91 ms, p99 +0.41 ms, writer CPU +463 µs, WAL 2.1x [M] | +66 to +112 [M] (binary encoding est. 40 to 60) | yes with a doc-position eligibility rule; else row path | new route: doc versus rows, stale-doc mutant |
| (b) whole reach in one statement (recursive CTE) | +15% to +25% over per-hop `IN` [M] | no gain | none | 0 | yes (one statement, one snapshot) | same route |
| (c) raw bytes to the client, no decode | saves 0.3 to 1.3 ms of decode only where the consumer can take bytes [M] | n/a alone | none | 0 | yes if the mask is applied in the encoding | needs a byte-identity gate; bypasses the repository surface |
| (d) clustering by owner (WITHOUT ROWID `(o, e, id)`) | J: 1,580 to 800 (2x); compact: 330 to 260 (1.2x) [M] | see W6/W7 | none measurable [E] | +5.2 [M] | yes (prefetch superset, BFS in memory) | same route; owner-rule mutant |
| (e) reader pool per core, reused statements | per-pull CPU +10% to +80% at 4 clients [M] | capacity, not efficiency | none | 0 | yes | same route |
| (b'+d+c internal) compact, owner range, one worker op, SQLite-built text, lean decode (W7) | 580 to 870 [M] | 1,140 to 1,720 | none | +5.2 over R45's 259 | yes, and better than today: one read transaction per pull | same route; codec gate needed |

### 3.2 (a) A per-subject materialized current document

**What it costs to read.** One B-tree lookup and an overflow-page read: 15 to 45 µs in one thread, 100 to 180 µs end to end as bytes, 247
to 320 µs with one parse and lean `Triple`s [M].

**What it costs to write** (`bench4.mjs`: SQL01's durability pragmas, WAL, `synchronous=FULL`, `fullfsync=ON`; 2,000 owners of 449 facts;
600 commits per arm, interleaved; each commit a 9.5 KB frame, 10 compact fact rows and a head upsert; arm B also reads, decodes, extends,
encodes and rewrites the owner's document) [M]:

| Arm | Commit p50 | p99 | Mean | Writer CPU per commit | WAL bytes per commit |
| --- | ---: | ---: | ---: | ---: | ---: |
| A rows only | 2.99 ms | 6.97 ms | 3.20 ms | 441 µs | 40,322 |
| B rows plus document | 3.90 ms | 7.38 ms | 3.71 ms | 904 µs | 85,325 |

The document cost scales with subject size, not commit size: the largest W0 bucket (801 to 2,000 facts) rewrites 2 to 4.5 times more
per commit [D]. Writer CPU is also the broker's commit-path CPU, and R42 measured commit p50 rising to 46 ms when readers share the
broker's thread (R44 2.6), so commit-path CPU is the scarce resource for P2.

**Scope.** A document over the whole BFS reach would include the location and jurisdiction, which are shared: at 100k a jurisdiction is
reached by about 1,000 placements on average (K = 4 x ceil(L / 80) = 100 jurisdictions for 100k placements, `population.ts:64-66`) [S][D],
so one `stateMinWageCents` change would rewrite about 1,000 documents of 30 to 220 KB in one commit. The document must therefore cover only
the owner's own subtree, with shared entities read from rows.

**Exactness.** A document written in the commit transaction holds the owner's subtree at its last change position `pd`. It answers a basis
`b` exactly when `pd <= b <=` the marker read in the same transaction; otherwise the pull uses the row path. A variant that builds documents
off the commit path (on the writer between commit groups, as R45 does for purge) keeps P2 unchanged, at the price of serving the most
latency-sensitive pull (the reconcile pull right after a commit, GS.02) from rows until the builder catches up. Both variants add a route
that RQ01 must prove byte-identical to the row route, with a stale-document mutant.

**Bytes.** 65.8 B per fact with short values (`bench4`) and 112 B per fact for W0-shaped rows with 26-character ids as JSON arrays
(`gen.ts`, dbstat) [M], against R45's predicted 259 B per fact for round 1: +25% to +43%.

### 3.3 (b) The whole reach in one statement

A recursive CTE (`WITH RECURSIVE reach(e) AS (... UNION SELECT f.v FROM reach JOIN fe ...)`) is 15% to 25% slower than one `IN` per hop
on compact rows, because SQLite still probes per entity and adds a UNION dedupe table [M: C2 versus C1]. Batched `IN` per hop is what SQL01
already does. `json_each(?)` gives one fixed statement instead of one per frontier size (bench1 prepared 824 distinct statements in 3,000
pulls) at the same CPU [M: J2 versus J1]. The useful form of "one statement" is the owner range in 3.5.

**The SQLite JSON trap.** Letting SQLite build the answer text (C7, W6) is fast, but `json_array` and `json_group_array` render REAL with
15 significant digits: 187,954 of 199,924 random finite doubles changed, including 2^53 and `Number.MAX_VALUE` (to `Infinity`)
(`jsonexact.mjs`) [M]. This is silent precision loss, which SCOPE 2.4 forbids. `printf('%!.17g', v)` round-trips 199,904 of 199,905; the
one miss is -0, rendered `0.0` (`jsonexact2.mjs`) [M], and the QLever value domain rejects -0 numbers on write (`ValueDomain.ts:44, 215`,
`negativeZero` defaults to false) [S]. Plain `%.17g` fails 90,656 [M]. A SQLite forum thread reports the same workaround [W: SQLite forum].
O-REPLAY on W0 would not catch the 15-digit loss (W0 numbers are integer cents and minutes), so a codec property gate is required.

### 3.4 (c) Returning raw bytes without decoding

Inside the process, (c) is worth doing between the worker and the main thread: one string or one set of columns per pull instead of
structured-cloned row objects saves 0.3 to 0.9 ms (W1 versus W2; W4c versus W4b) [M]. Node's `postMessage` structured-clones everything
not in the transfer list, and a `Buffer` from Node's pool is always cloned with its whole pool [W: worker_threads]; never send per-row
Buffers.

End to end, (c) does not apply to P4 as defined. The pull's consumer is the Triplex kernel through the public Triples service
(`T.entities`, the EP-REPO surface Q99c counts), which returns `Triple` objects. Forwarding the store's bytes to the NS driver would skip
that surface. If the lab wants a byte-returning pull surface, it needs its own ruling and its own exactness gate (the Q89i mask applied in
the encoding: rows retired after `b` shown with null retraction fields).

### 3.5 (d) Clustering by owner, a covering structure

Today's `live_rows` is already `WITHOUT ROWID` clustered by `(entity, id)` (`sqlite-worker.ts:65`) [S], so a pull already reads each
entity with one range. The gain comes from clustering by owner, so that one range reads the owner's whole subtree:

1. **JSON rows:** entity names sort the subtree contiguously (`pl:s00000038` then `pl:s00000038/ans:1` ... before `pl:s00000039`), so
   `entity >= S AND entity < S || '0'` reads it with no schema change: 1,578 to 807 µs (2x) with mmap [M: J3 versus J1].
2. **Compact rows (R45 round 1):** interning `e` loses name order, so add an owner column: `PRIMARY KEY (o, e, id)` with `o` the interned
   id of the name before the first `/`. 54.9 B per fact against 49.7 for R45's `(e, id)` key, +5.2 B per fact [M: dbstat]. Point reads of
   any entity use `o = owner(X) AND e = X`, so no secondary entity index is needed (a separate `facts_e` index would cost 32.9 B per fact
   [M]). Gain: 330 to 260 µs per pull (1.2x) [M: C3o versus C1].
3. **Exactness does not depend on the naming rule.** The range read is a prefetch at basis `b` in the same read transaction; the BFS runs
   over those rows in memory, and any ref not covered (location, jurisdiction, a cross-owner ref, a misnamed entity) is fetched by id in
   the same transaction. A wrong rule costs statements, never rows. The rows retired after `b` (`history WHERE rpos > b`) are read for the
   same owner.

### 3.6 (e) Reader pools and prepared statements

SQL01 runs 4 reader workers and caches statements by SQL text (`sqlite-worker.ts:19-20`, `log.ts:318-323`) [S]. Three findings [M]:

1. **CPU per pull rises with concurrency:** W4b 583 to 1,048 µs from 1 to 4 clients with per-worker 2 MB caches, 659 to 722 µs with mmap
   (one shared OS page cache). Size the pool to the cores the run budgets, not above, and use `mmap_size` on reader connections.
2. **The main thread is single.** With today's kernel (about 1 ms of main CPU per pull) one process saturates near 1,000 pulls/s however
   many readers it has. With the lean decode (150 to 300 µs of main CPU) the cap is about 3,000 to 6,000 per process [D].
3. **Statement reuse is not the cost.** The `IN`-arity statement cache grows with frontier sizes but is amortized; owner-range reads use
   two or three fixed statements.

## 4. What "per core" means for a host store, and how to measure it honestly

### 4.1 The rulings

| Ruling | Text (abridged) | Status |
| --- | --- | --- |
| Q68d | Reads served from the broker count for P1 and P4 when the receipt records route = host and the per-core denominator includes broker and kernel CPU | accepted |
| Q99c | A repository read served by a registered current store (H1) counts for that composition's EP-REPO surfaces; "per engine core" for a host store uses the cores pinned to its reader threads | pending |
| TARGETS 2.1 P4 item 3 | "Per engine core" uses the CPU quota bound in the receipt; host-side broker and kernel CPU are reported next to engine-core throughput | in force |

**Read literally, Q99c would overstate throughput by 1.3x to 1.5x.** Reader threads carried 78% of today's per-pull CPU (W1: 1,920 of
2,467 µs) and 64% to 71% of the compact path's (W4b: 414 of 583; W6: 599 of 935, `out-bench2-w6-c1.txt`) [M]. The rest is the main thread
(IPC receive, adapter, kernel decode), garbage collection threads and system time. Q68d already says the denominator includes broker and
kernel CPU, so the two only agree if Q99c's "cores pinned to its reader threads" names the **capacity** budget, not the denominator.

**Proposed amendment (Q99c-a):** "For a host store, pulls per core = pulls completed / CPU seconds consumed by every thread of every
candidate process that serves the pull (reader threads, the thread running the adapter and kernel, garbage collection and runtime threads,
and system time), measured over a window, excluding the trusted driver. The cores pinned to reader threads bound capacity runs and are
recorded; they are not the denominator."

### 4.2 In-process measurement (QH1 G5, the lab bench)

1. **Total:** `process.cpuUsage()` deltas over the window. It covers the whole process, all threads [W: Node process docs]; measured,
   process CPU equals main plus workers plus 0 to 208 µs per pull of other threads [M].
2. **Breakdown:** `process.threadCpuUsage()` (Node >= 22.19 and 23.9) in each thread, reported by the thread itself [W]; "other" =
   total minus the named threads. Do **not** add per-worker CPU to `process.cpuUsage()`: that double counts (the QH1 brief's G5 harness
   change 2 as written).
3. **With the writer trace running** (G6), process CPU includes commits on the same main thread. Use the differential: CPU of (writer
   trace plus pulls) minus CPU of (writer trace alone) over matched trace segments, in A/A-graded rounds (Q100k), and report the per-thread
   breakdown beside it. The writer worker and checkpointer threads can be excluded by thread; the main thread cannot.
4. **Two numbers:** efficiency (pulls per CPU second, the P4 bar, at 1 client and at the closed-loop level used) and capacity (pulls per
   second with readers on k pinned cores at saturation, with the main thread's utilization). Both in the receipt.

### 4.3 In the NS layout (R44)

Pulls run in the reader service container (cpu 4), which runs the kernel; H1 rows live in the broker container's private volume (R44 2.2,
Q100o). R44 item 8 leaves open whether the broker gets a second core for reader threads or a separate read container. Either way:

1. **Denominator = cgroup `cpu.stat usage_usec` deltas** of the reader service plus the broker's share for reads (differential against a
   writer-only window, or a separate read container's whole usage). cgroup usage includes system time and every thread.
2. **A separate H1 read container needs write access to the `-shm` file** (or an `immutable` open, which is wrong for a live store)
   [W: SQLite WAL]. That conflicts with Q100o's "source store writable by the broker container only"; a read container needs a ruling that
   `-shm` write access is not source-store write access, or reads stay in the broker container on a second core.
3. **If H1 answers cross the arm network,** the RPC encode and decode join the per-pull CPU. Ship one text or column set per pull (W6
   shape), never per-row objects; expect +50 to 150 µs per pull [E].
4. **Memory.** At 100k, compact facts with the owner key are about 2.4 GB plus the entity dictionary (19.9 B per fact measured here, about
   0.9 GB) [D]. R44's caps are 1 GiB for the broker and 0.75 GiB for the reader service. Page cache counts against the cgroup, so a
   uniform pull sample would read cold pages, and R45 measured cold reads 4.9x slower per row. QH1 at 100k must either size the container
   that holds the reader threads to the working set or report the cold number as the number.

### 4.4 Host noise

CPU time per pull for the same arm moved 1.5x to 1.8x between host load averages of 6 and 34 (W4b 583 to 1,066 µs; W1 2,467 to 3,625 µs)
[M], from shared caches, frequency and efficiency cores, which macOS does not let a process avoid. The ratios between interleaved arms were
stable (W7 / W1K 0.124 to 0.135). For QH1: interleave arms inside rounds, report medians and per-round ratios, record load average, and
run a fixed calibration loop in each window so receipts from different windows can be compared. Absolute bars are judged only in GREEN
windows (Q100k).

## 5. Recommendation for EXP-QH1

### 5.1 Design, ranked

1. **Build on HS01's compact layout (R45 round 1) with an owner key.** `facts PRIMARY KEY (o, e, id)` instead of `(e, id)` (+5.2 B per
   fact), `history` keyed the same way or by `(e, rpos, id)` with the owner read through `o`. No measured variant on today's JSON rows
   reaches 750 pulls per CPU second even before the kernel (best W3c 712, W2 at 4 clients 743). QH1 should start after HS01 merges, or run
   its G5 and G6 only on an HS01 base.
2. **Make the whole-pull worker operation the primary arm (H1w-owner), not the G5 fallback.** One read transaction per pull: owner range
   at `b`, rows retired after `b` for the same owner, recursive fetch of external refs, the answer emitted as one text built by SQLite
   (REAL through `printf('%!.17g', v)`, ids as text) or as columns; one parse on the main thread. One transaction per pull is also stronger
   for P1 than today's one transaction per hop.
3. **Serve the per-hop public API from a per-pull prefetch.** The first `getByEntities([root])` at basis `b` triggers H1w-owner and caches
   the subtree keyed by (scope, `b`, root) for the pull's later hops; `T.entities` and the EP-REPO surface stay unchanged. A cached answer
   for `b` stays exact after a later purge, because rows at `b` are immutable; RQ01 must state and test that (Q89i repeat across a purge).
4. **Make the read-side domain check cheap without changing what it checks.** `assertValueInDomain` costs about 1.0 µs per row (about
   0.45 to 0.5 ms per pull), the largest single kernel cost. A fast path for values the decoder itself constructed can skip the descriptor,
   prototype and `Schema.is` checks (they are true by construction), call `isWellFormed` and the NUL check on strings, and run
   `TextEncoder.encode` only when `3 x length` exceeds the byte bound and the `JSON.stringify` storage check only when a cheap upper bound
   exceeds it. Same accept and reject set, est. 0.03 to 0.06 µs per row [E]. This is a core change for all lanes; it needs a differential
   test (fast path and full check agree on R45 G7's 100,000 generated values plus every reject case). Skipping the check outright is a
   correctness-floor question for the orchestrator, not this lab's call.
5. **Remove the second materialization.** Build `Triple`s from the worker's columns directly; drop the per-hop `TripleRow` maps, the
   per-id filters (QH1 change 3), and the second snapshot mask pass when no row is retired after `b` (a per-pull flag from the worker).
   Measured together with item 4's effect: K1 1,006 to K6 284 µs, W6K 1,860 to W7 580 to 620 µs [M].
6. **Reader setup:** `mmap_size` on reader connections, pool size equal to the budgeted cores, owner-range and fixed-shape statements, ids
   selected as text from SQLite or as integers (never per-row Buffers across threads).
7. **Hold option (a) as fallback arm H1d,** only if items 1 to 6 miss G5 on the HS01 base. Prefer the off-commit-path builder; the
   in-commit variant fails G7 by measurement (p50 +0.91 ms against a 0.5 ms guard).
8. **Drop** the recursive CTE, H1w on JSON rows, and bytes-to-client as an end-to-end P4 surface.

### 5.2 Gates and what to measure first

| # | Gate | Pass | Change from the brief |
| --- | --- | --- | --- |
| G0 (new, first) | Decomposition on the real stack at 10k, no product change but instrumentation: per-thread CPU (`threadCpuUsage` in each thread), process total, other-thread remainder; per-pull µs for worker SQLite, worker encode, transfer, main parse, adapter, `assertValueInDomain`, the rest of the kernel; arms W1K, W2K, W6K-shape and W7-shape from appendix A ported to the real adapter; host load and a calibration loop recorded | the table exists, and the arms' answers are identical on >= 10,000 pulls | new; decides items 4 and 5 before any build |
| G1 to G4 | as briefed, with the H1w-owner op and the prefetch cache registered in RQ01 | as briefed | add an owner-rule mutant (miss path disabled: O-REPLAY must reject, since location and jurisdiction facts vanish) and a purge between hop 0 and hop k (answer identical to the uncached route at `b`) |
| G4c (new) | Codec property gate for any SQLite-built or columnar answer: >= 100,000 random values including random finite doubles, subnormals, `Number.MAX_VALUE`, 2^53 +- 1, unicode and NUL in strings, integer strings, booleans | byte-identical to the row route; a `json_array` REAL mutant is rejected | new; O-REPLAY on W0 cannot catch it |
| G5 | Per-core screen: pulls / process CPU seconds in a reads-only window, 1 client and closed loop to 4; per-thread breakdown beside it; interleaved arms, median of A/A-graded rounds | >= 1,100 per CPU second on the weighted mix with >= 1.2x margin before G6 (Q99e) | accounting fixed (no double count); H1w-owner is the primary arm; H1d is the fallback |
| G6 | P4 numbers at 10k and 100k, replica detached, writer trace on | the five P4 bars; per-core by the differential method of 4.2 item 3 | 100k reported with the reader container's memory and cold share stated |
| G7 | Writer guard | commit p50 delta <= 0.5 ms, p99 within 1.1x | applies to H1d and to any owner-key write change |
| G8 | Engine-attached run | as briefed | none |

### 5.3 Predictions (each can fail)

| # | Prediction | Falsified if |
| --- | --- | --- |
| 1 | G0 on the real stack shows the kernel and adapter at >= 0.8 ms per pull on today's code, and `assertValueInDomain` at >= 0.35 ms | kernel below 0.5 ms |
| 2 | QH1 as briefed (JSON rows, changes 2 and 3) lands at 350 to 700 pulls per CPU second | above 900 |
| 3 | HS01 plus owner key, H1w-owner, prefetch, cheap domain check and single materialization land at 1,200 to 1,900 per CPU second at 10k, 1 client, warm | below 1,100 |
| 4 | The same at 4 clients loses 10% to 40% per core | loses more than 50% |
| 5 | Weighted p50 0.4 to 1 ms, p99 3 to 10 ms at 10k on the same path | p50 above 2 ms or p99 above 25 ms |
| 6 | At 100k with a 1 GiB container the per-core number falls by 1.5x or more (cold pages) | falls less than 1.2x |
| 7 | H1d, if built off the commit path, lands at >= 2,500 per CPU second with G7 unchanged | below 2,000 |

## 6. Risks and open questions

| Risk or question | Effect | Mitigation |
| --- | --- | --- |
| Synthetic data, not the 10k evidence store | absolute µs may shift; journal rows were included to size the B-tree, frames and `recent_rows` were not | G0 reruns the arms on the real stack at 10k |
| Loaded host (load 6 to 34) | absolute CPU per pull inflated up to 1.8x | ratios from interleaved rounds; QH1 judges absolute bars in GREEN windows |
| The domain fast path is a core change shared by all lanes | review scope wider than QH1 | separate small CX change with its own differential gate; QH1 depends on it |
| Q99c read literally | per-core inflated 1.3x to 1.5x | Q99c-a wording (4.1) |
| `-shm` write access for a separate read container | conflicts with Q100o | ruling, or reads on a second broker core |
| Owner rule is W0's naming convention | other worlds may not cluster | exact regardless; cost only; report statements per pull |
| Prefetch cache lifetime | memory, and a cache keyed wrongly could serve another basis | key includes scope, `b` and root; evict at pull end or by LRU of a few entries; RQ01 forcing |

## 7. Sources

1. better-sqlite3 API (`.raw()`, `.pluck()`, `.all()` versus `.iterate()`, BLOBs returned as `Buffer`):
   https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
2. SQLite memory-mapped I/O (avoids the kernel-to-user copy; shares the OS page cache; mostly a benefit for queries):
   https://sqlite.org/mmap.html
3. SQLite WAL, read-only access (the `-shm` file must be writable, or exist and be readable, or the database opened `immutable`):
   https://sqlite.org/wal.html
4. SQLite forum, REAL precision through the JSON functions and the `printf('%!.17g')` workaround:
   https://sqlite.org/forum/info/ba905719f6328e75
5. Node `process.cpuUsage()` (whole process) and `process.threadCpuUsage()` (current thread; added in v23.9.0 and v22.19.0):
   https://nodejs.org/api/process.html
6. Node `worker_threads` `postMessage` (structured clone; transfer lists; pooled Buffers always cloned with their pool):
   https://nodejs.org/api/worker_threads.html
7. Lab sources: R45 (`lab/research/R45-host-store-layout.md` 5.2 C, 5.5, A.3), R40 (`lab/research/R40-lane-q-p4.md` 2.3, 3.2), R44 (2.2,
   2.3, 6 item 8), EXP-QH1 brief, `lab/acceptance/RULINGS.md` Q68a-g and Q97a, `lab/acceptance/RULINGS-PENDING.md` Q99a-e and Q100k-l.

## Appendix A. Reproduction

All scripts ran from a scratch folder with the repository's own `node_modules` (better-sqlite3 12.10.0, effect 4.0.3, tsx). Order:

1. `tsx gen.ts 2000 ./data` (145 s): builds `json.db` (today's SQL01 tables, 5.8 GB with journal rows and subject documents) and
   `compact.db` (R45 round 1 columns plus owner column `o`, 270 MB). Then, with the sqlite3 CLI:
   `CREATE TABLE fe(...) WITHOUT ROWID; INSERT INTO fe SELECT e,id,a,pos,t,v,vf,vto,c,y FROM facts ORDER BY e,id;` (the `(e, id)`-keyed
   copy, R45's exact key) and a `marker` row in both files (`INSERT OR REPLACE INTO marker VALUES(1,1073741824,1,0,1099511627776,0,32)`)
   so the real SQL01 reader worker accepts basis 2^40.
2. `node bench1.mjs ./data 2000 1000 {default|big|mmap}` (section 2.2 first table; `ARMS` regex selects arms).
3. `node bench2.mjs ./data 2000 1000 {1|4}` (worker protocols; `MMAP=1`; `VALIDATE=500` for the identity check). `bench2.mjs` is
   `bench5.mjs` with the final loop replaced by four sequential rounds per arm and the median of rounds 2 to 4; its arms are the same.
4. `KERNEL=1 MMAP=1 ROUNDS=7 tsx bench5.mjs ./data 2000 300 {1|4}` (section 2.3; interleaved).
5. `tsx bench3.mts ./data 2000 500` and `tsx bench3b.mts ./data` (kernel).
6. `node bench4.mjs ./data 2000 600` (commit cost of option a).
7. `node jsonexact.mjs` and `node jsonexact2.mjs` (REAL rendering).

Raw outputs were `out-bench1-default.txt`, `out-bench1-cache.txt`, `out-bench1-c6c7.txt`, `out-bench2-c1.txt`, `out-bench2-c4.txt`,
`out-bench2-c1-mmap.txt`, `out-bench2-c4-mmap.txt`, `out-bench2-w6-c{1,4}.txt`, `out-bench3.txt`, `out-bench3b.txt`, `out-bench4.txt`,
`out-bench5-c1.txt`, `out-bench5b-c{1,4}.txt`, `out-bench5k-c1-run{1,2}.txt`, `out-validate.txt`; every number quoted above is copied
from them. The data files (6 GB) were deleted after the run; `gen.ts` regenerates them.

## Appendix B. Scripts (verbatim)

### B. gen.ts

```ts
// R46 synthetic W0-shaped H1 store generator. Usage: tsx gen.ts <N subjects> <outdir>
// Builds three SQLite files from the real W0 generator (packages/w0/src/population.ts):
//   json.db    today's SQL01 layout: live_rows/retired_rows JSON rows (20 keys, appendix B shape) plus journal rows
//   compact.db R45 round-1 compact layout (interned e/a, 16-byte ids, typed value), plus owner column o for (d)
//   docs table inside both: one pre-encoded current document per subject (option a)
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { rung, plan, build } from "/Users/sam/projects/triplex-db-2/packages/w0/src/population.ts";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const N = Number(process.argv[2] ?? 2000);
const out = process.argv[3] ?? "./data";
mkdirSync(out, { recursive: true });
for (const f of ["json.db", "compact.db"]) for (const s of ["", "-wal", "-shm"]) rmSync(`${out}/${f}${s}`, { force: true });
const REF = new Set(["location", "documents", "decisions", "answers", "next", "jurisdiction"]);
const R = rung(N);
const J = new D(`${out}/json.db`), C = new D(`${out}/compact.db`);
for (const d of [J, C]) { d.pragma("journal_mode=WAL"); d.pragma("synchronous=OFF"); }
J.exec(`CREATE TABLE live_rows(entity TEXT NOT NULL,id TEXT NOT NULL,pos INT NOT NULL,row TEXT NOT NULL,PRIMARY KEY(entity,id)) WITHOUT ROWID;
CREATE UNIQUE INDEX live_id ON live_rows(id);
CREATE TABLE retired_rows(entity TEXT NOT NULL,rpos INT NOT NULL,id TEXT NOT NULL,pos INT NOT NULL,row TEXT NOT NULL,PRIMARY KEY(entity,rpos,id)) WITHOUT ROWID;
CREATE INDEX retired_id ON retired_rows(id);
CREATE TABLE docs(subject TEXT PRIMARY KEY, pos INT NOT NULL, body TEXT NOT NULL) WITHOUT ROWID;`);
C.exec(`CREATE TABLE ents(eid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE attrs(aid INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE facts(o INT NOT NULL, e INT NOT NULL, id BLOB NOT NULL, a INT NOT NULL, pos INT NOT NULL, t INT NOT NULL, v, vf INT, vto INT, c INT, y INT, PRIMARY KEY(o,e,id)) WITHOUT ROWID;
CREATE UNIQUE INDEX facts_id ON facts(id);
CREATE INDEX facts_e ON facts(e);
CREATE TABLE history(e INT NOT NULL, rpos INT NOT NULL, id BLOB NOT NULL, a INT NOT NULL, pos INT NOT NULL, t INT NOT NULL, v, vf INT, vto INT, c INT, y INT, PRIMARY KEY(e,rpos,id)) WITHOUT ROWID;
CREATE TABLE cdocs(o INT PRIMARY KEY, pos INT NOT NULL, body BLOB NOT NULL);`);
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let idn = 0;
const ulid = () => { let n = ++idn, s = ""; for (let i = 0; i < 16; i++) { s = B32[n % 32] + s; n = Math.floor(n / 32); } return "01JC0000ZZ" + s; };
const idBlob = (n: number) => { const b = Buffer.alloc(16); b.writeBigUInt64BE(BigInt(n), 8); return b; };
const T0 = 1793783600000;
const ents = new Map<string, number>(), attrs = new Map<string, number>();
const eid = (s: string) => { let x = ents.get(s); if (x === undefined) { ents.set(s, x = ents.size + 1); insEnt.run(x, s); } return x; };
const aid = (s: string) => { let x = attrs.get(s); if (x === undefined) { attrs.set(s, x = attrs.size + 1); insAttr.run(x, s); } return x; };
const insEnt = C.prepare("INSERT INTO ents VALUES(?,?)"), insAttr = C.prepare("INSERT INTO attrs VALUES(?,?)");
const insLive = J.prepare("INSERT INTO live_rows VALUES(?,?,?,?)");
const insRet = J.prepare("INSERT INTO retired_rows VALUES(?,?,?,?,?)");
const insFact = C.prepare("INSERT INTO facts VALUES(?,?,?,?,?,?,?,?,?,?,?)");
const insHist = C.prepare("INSERT INTO history VALUES(?,?,?,?,?,?,?,?,?,?,?)");
const insDoc = J.prepare("INSERT INTO docs VALUES(?,?,?)");
const insCDoc = C.prepare("INSERT INTO cdocs VALUES(?,?,?)");
const owner = (e: string) => { const i = e.indexOf("/"); return i < 0 ? e : e.slice(0, i); };
const tcode = (vt: string) => ({ ref: 1, string: 2, number: 3, boolean: 4, integer: 5 } as any)[vt];
const rowOf = (e: string, a: string, v: any, pos: number, txid: string, etype: string) => {
  const isRef = REF.has(a);
  const vt = isRef ? "ref" : typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : typeof v === "object" && v !== null ? "integer" : "string";
  const val = vt === "integer" ? String(v.v ?? v) : v;
  return { id: ulid(), entity_id: e, attribute: ":" + a, value_type: vt,
    value_string: vt === "ref" || vt === "string" || vt === "integer" ? String(val) : null,
    value_number: vt === "number" ? val : null, value_boolean: vt === "boolean" ? val : null,
    value_datetime: null, value_json: null, recorded_at: T0 + pos, recorded_position: pos * 1024,
    valid_from: T0 + pos, valid_to: null, created_by: "actor:seed", retracted_at: null, retracted_position: null,
    retract_tx_id: null, entity_type: etype, schema_version: 1, tx_id: txid };
};
const seenShared = new Set<string>();
let facts = 0, journal = 0, retired = 0, subjFacts = 0;
const docRows = new Map<string, any[]>();
const ins = (r: any) => {
  insLive.run(r.entity_id, r.id, r.recorded_position, JSON.stringify(r));
  const o = eid(owner(r.entity_id));
  const v = r.value_type === "ref" ? eid(r.value_string) : r.value_type === "number" ? r.value_number : r.value_type === "boolean" ? (r.value_boolean ? 1 : 0) : r.value_string;
  insFact.run(o, eid(r.entity_id), idBlob(idn), aid(r.attribute), r.recorded_position, tcode(r.value_type), v, r.valid_from - r.recorded_at, null, 1, 1);
};
const etypeOf = (e: string) => e.startsWith("loc:") ? "Location" : e.startsWith("jur:") ? "Jurisdiction" : e.includes("/ans:") ? "Answer" : e.includes("/dec:") ? "Decision" : e.includes("/doc:") ? "Document" : "Placement";
const tx = J.transaction((i: number) => {
  const p = build(R, plan(R, i), 1);
  // group facts by commit position as commands
  const byTx = new Map<number, any[]>();
  for (const f of p.world.facts) { if (!byTx.has(f.tx)) byTx.set(f.tx, []); byTx.get(f.tx)!.push(f); }
  for (const [t, fs] of byTx) {
    const pos = (i * 64 + (t % 64)); // distinct-ish positions per subject, ordered by subject
    const txid = "_tx/" + ulid();
    const changed = new Set<string>();
    for (const f of fs) {
      if ((f.e.startsWith("loc:") || f.e.startsWith("jur:"))) { const k = f.e + f.a; if (seenShared.has(k)) continue; seenShared.add(k); }
      const r = rowOf(f.e, f.a, f.v, pos, txid, etypeOf(f.e)); ins(r); facts++; changed.add(f.e);
      // 1% corrections: a retired earlier version (rpos below the live version's pos)
      if (idn % 100 === 0) { const old = { ...rowOf(f.e, f.a, f.v, pos - 1, txid, etypeOf(f.e)), retracted_position: pos * 1024 - 1, retracted_at: T0 + pos };
        insRet.run(old.entity_id, old.retracted_position, old.id, old.recorded_position, JSON.stringify(old));
        insHist.run(eid(old.entity_id), old.retracted_position, idBlob(idn), aid(old.attribute), old.recorded_position, tcode(old.value_type), 0, 0, null, 1, 1); retired++; }
      // journal: one change row per fact (value embeds the fact again), plus changed-entity rows and 4 header rows per command
      const j = rowOf(txid, "_tx/change", "x", pos, txid, "_Transaction"); j.value_type = "json"; j.value_string = null; (j as any).value_json = JSON.stringify(r);
      insLive.run(j.entity_id, j.id, j.recorded_position, JSON.stringify(j)); journal++;
    }
    for (const e of changed) { const j = rowOf(txid, "_tx/changed-entity", e, pos, txid, "_Transaction"); j.value_type = "ref"; insLive.run(j.entity_id, j.id, j.recorded_position, JSON.stringify(j)); journal++; }
    for (const a of ["_tx/position", "_tx/instant", "_tx/actor", "_tx/command-id"]) { const j = rowOf(txid, a, "x", pos, txid, "_Transaction"); insLive.run(j.entity_id, j.id, j.recorded_position, JSON.stringify(j)); journal++; }
  }
});
const cTx = C.transaction((fn: () => void) => fn());
const t0 = Date.now();
for (let i = 1; i <= N; i += 50) cTx(() => { for (let k = i; k < Math.min(i + 50, N + 1); k++) tx(k); });
// option (a): one document per subject = the subject's world rows as JSON text (BFS reach at head), built from the store
const live = J.prepare("SELECT row FROM live_rows WHERE entity IN (SELECT value FROM json_each(?))").pluck();
let docBytes = 0, cdocBytes = 0;
const docTx = J.transaction(() => {
  for (let i = 1; i <= N; i++) {
    const S = "pl:s" + String(i).padStart(8, "0");
    const seen = new Set([S]); let frontier = [S]; const rows: string[] = []; let maxPos = 0;
    while (frontier.length) {
      const next: string[] = [];
      for (const s of live.all(JSON.stringify(frontier))) { rows.push(s); const r = JSON.parse(s); maxPos = Math.max(maxPos, r.recorded_position);
        if (r.value_type === "ref" && !seen.has(r.value_string)) { seen.add(r.value_string); next.push(r.value_string); } }
      frontier = next;
    }
    const body = "[" + rows.join(",") + "]"; docBytes += body.length; subjFacts += rows.length;
    insDoc.run(S, maxPos, body);
  }
});
docTx();
// compact doc: same rows as a packed array of [eName, attr, t, v] (what a compact encoder could hold)
const cdocTx = C.transaction(() => {
  const q = J.prepare("SELECT subject, pos, body FROM docs");
  for (const d of q.iterate()) { const rows = JSON.parse(d.body).map((r: any) => [r.id, r.entity_id, r.attribute, r.value_type, r.value_string ?? r.value_number ?? r.value_boolean, r.recorded_position, r.valid_from, r.valid_to]);
    const body = Buffer.from(JSON.stringify(rows)); cdocBytes += body.length; insCDoc.run(eid(d.subject), d.pos, body); }
});
cdocTx();
for (const d of [J, C]) { d.pragma("wal_checkpoint(TRUNCATE)"); d.exec("ANALYZE"); }
const size = (d: any) => d.pragma("page_count", { simple: true }) * d.pragma("page_size", { simple: true });
console.log(JSON.stringify({ N, facts, journal, retired, subjFactsMean: subjFacts / N, docBytesMean: Math.round(docBytes / N), cdocBytesMean: Math.round(cdocBytes / N),
  jsonDbBytes: size(J), compactDbBytes: size(C), ents: ents.size, seconds: (Date.now() - t0) / 1000 }));
```

### B. bench1.mjs

```js
// R46 bench 1: single-thread SQLite read arms for a W0 subject pull (BFS over refs at the head basis).
// Usage: node bench1.mjs <datadir> [N] [pullsPerRound] [cacheMode: default|big|mmap]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const dir = process.argv[2] ?? "./data", N = Number(process.argv[3] ?? 2000), P = Number(process.argv[4] ?? 1000), cache = process.argv[5] ?? "default";
const open = (f) => {
  const d = new D(`${dir}/${f}`, { readonly: true, fileMustExist: true });
  if (cache === "big") d.pragma("cache_size=-1048576");
  if (cache === "mmap") d.pragma("mmap_size=8589934592");
  return d;
};
const J = open("json.db"), C = open("compact.db");
const B = 2 ** 40; // head basis: every row visible
const subj = (i) => "pl:s" + String(i).padStart(8, "0");
// deterministic subject order
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const order = Array.from({ length: 3 * P }, () => 1 + Math.floor(rnd() * N));
// ---------- JSON layout arms
const jStmts = new Map();
const jq = (sql) => { let s = jStmts.get(sql); if (!s) jStmts.set(sql, (s = J.prepare(sql))); return s; };
const tm = { step: 0, parse: 0 };
const jHop = (ents, parse = true, time = false) => {
  const ph = ents.map(() => "?").join(",");
  let t = time ? performance.now() : 0;
  const live = jq(`SELECT row FROM live_rows WHERE entity IN (${ph}) AND pos<=?`).all(...ents, B);
  const ret = jq(`SELECT row FROM retired_rows WHERE entity IN (${ph}) AND rpos>? AND pos<=?`).all(...ents, B, B);
  if (time) { const t2 = performance.now(); tm.step += t2 - t; t = t2; }
  const out = live.concat(ret).map((r) => JSON.parse(r.row));
  if (time) tm.parse += performance.now() - t;
  return out;
};
const bfs = (root, hop) => {
  const seen = new Set([root]); let frontier = [root]; let n = 0, hops = 0;
  while (frontier.length) {
    const next = [];
    for (const r of hop(frontier)) { n++; if (r.value_type === "ref" && !seen.has(r.value_string)) { seen.add(r.value_string); next.push(r.value_string); } }
    frontier = next; hops++;
  }
  return { n, hops, ents: seen.size };
};
const jsonEach = J.prepare("SELECT row FROM live_rows WHERE entity IN (SELECT value FROM json_each(?)) AND pos<=?").pluck();
const jsonEachRet = J.prepare("SELECT row FROM retired_rows WHERE entity IN (SELECT value FROM json_each(?)) AND rpos>? AND pos<=?").pluck();
const range = J.prepare("SELECT row FROM live_rows WHERE entity>=? AND entity<? AND pos<=?").pluck();
const rangeRet = J.prepare("SELECT row FROM retired_rows WHERE entity>=? AND entity<? AND rpos>? AND pos<=?").pluck();
const doc = J.prepare("SELECT body FROM docs WHERE subject=?").pluck();
// owner-range prefetch: read the subject's owned subtree [S, S+'0') in one range scan, BFS in memory, fetch misses by IN
const ownerPull = (S, rangeFn, hopFn, refOf, entOf) => {
  const byE = new Map();
  for (const r of rangeFn(S)) { const e = entOf(r); let a = byE.get(e); if (!a) byE.set(e, (a = [])); a.push(r); }
  const seen = new Set([S]); let frontier = [S]; let n = 0, stmts = 1;
  while (frontier.length) {
    const miss = frontier.filter((e) => !byE.has(e) && !(e.startsWith?.(S + "/")) && e !== S);
    if (miss.length) { stmts++; for (const r of hopFn(miss)) { const e = entOf(r); let a = byE.get(e); if (!a) byE.set(e, (a = [])); a.push(r); } }
    const next = [];
    for (const e of frontier) for (const r of byE.get(e) ?? []) { n++; const t = refOf(r); if (t !== undefined && !seen.has(t)) { seen.add(t); next.push(t); } }
    frontier = next;
  }
  return { n, stmts, ents: seen.size };
};
// ---------- compact layout arms
const ents = new Map(), names = [];
for (const { eid, name } of C.prepare("SELECT eid,name FROM ents").iterate()) { ents.set(name, eid); names[eid] = name; }
const attrNames = []; for (const { aid, name } of C.prepare("SELECT aid,name FROM attrs").iterate()) attrNames[aid] = name;
const cStmts = new Map();
const cq = (sql) => { let s = cStmts.get(sql); if (!s) cStmts.set(sql, (s = C.prepare(sql).raw())); return s; };
const TN = [, "ref", "string", "number", "boolean", "integer"];
const obj = (r) => ({ id: r[1], entity_id: names[r[0]], attribute: attrNames[r[2]], recorded_position: r[3], value_type: TN[r[4]], v: r[4] === 1 ? names[r[5]] : r[5], valid_from: r[6], valid_to: r[7] });
const cHop = (eids, build = true) => {
  const ph = eids.map(() => "?").join(",");
  const live = cq(`SELECT e,id,a,pos,t,v,vf,vto FROM fe WHERE e IN (${ph}) AND pos<=?`).all(...eids, B);
  const ret = cq(`SELECT e,id,a,pos,t,v,vf,vto FROM history WHERE e IN (${ph}) AND rpos>? AND pos<=?`).all(...eids, B, B);
  const rows = live.concat(ret);
  return build ? rows.map(obj) : rows;
};
const cBfs = (root, build) => {
  const r0 = ents.get(root); const seen = new Set([r0]); let frontier = [r0]; let n = 0;
  while (frontier.length) {
    const next = [];
    for (const r of cHop(frontier, false)) { n++; if (build) obj(r); if (r[4] === 1 && !seen.has(r[5])) { seen.add(r[5]); next.push(r[5]); } }
    frontier = next;
  }
  return { n, ents: seen.size };
};
const cte = C.prepare(`WITH RECURSIVE reach(e) AS (SELECT @root UNION SELECT f.v FROM reach r JOIN fe f ON f.e=r.e WHERE f.t=1 AND f.pos<=@b
   UNION SELECT h.v FROM reach r JOIN history h ON h.e=r.e WHERE h.t=1 AND h.rpos>@b AND h.pos<=@b)
 SELECT f.e,f.id,f.a,f.pos,f.t,f.v,f.vf,f.vto FROM reach r JOIN fe f ON f.e=r.e WHERE f.pos<=@b
 UNION ALL SELECT h.e,h.id,h.a,h.pos,h.t,h.v,h.vf,h.vto FROM reach r JOIN history h ON h.e=r.e WHERE h.rpos>@b AND h.pos<=@b`).raw();
const cOwner = C.prepare("SELECT e,id,a,pos,t,v,vf,vto FROM facts WHERE o=? AND pos<=?").raw();
const cOwnerNoId = C.prepare("SELECT e,a,pos,t,v,vf,vto FROM facts WHERE o=? AND pos<=?").raw();
const cOwnerAgg = C.prepare("SELECT json_group_array(json_array(e,hex(id),a,pos,t,v,vf,vto)) FROM facts WHERE o=? AND pos<=?").pluck();
const cDoc = C.prepare("SELECT body FROM cdocs WHERE o=?").pluck();
const cOwnerPull = (S, build) => {
  const o = ents.get(S); const byE = new Map();
  for (const r of cOwner.all(o, B)) { let a = byE.get(r[0]); if (!a) byE.set(r[0], (a = [])); a.push(r); }
  const seen = new Set([o]); let frontier = [o]; let n = 0, stmts = 1;
  while (frontier.length) {
    const miss = frontier.filter((e) => !byE.has(e) && !names[e].startsWith(S));
    if (miss.length) { stmts++; for (const r of cHop(miss, false)) { let a = byE.get(r[0]); if (!a) byE.set(r[0], (a = [])); a.push(r); } }
    const next = [];
    for (const e of frontier) for (const r of byE.get(e) ?? []) { n++; if (build) obj(r); if (r[4] === 1 && !seen.has(r[5])) { seen.add(r[5]); next.push(r[5]); } }
    frontier = next;
  }
  return { n, stmts, ents: seen.size };
};
// ---------- runner
const arms = {
  "J1 today: IN per hop, .all objects, JSON.parse per row": (S) => bfs(S, (f) => jHop(f)),
  "J1t same, timed split": (S) => bfs(S, (f) => jHop(f, true, true)),
  "J2 json_each IN per hop, pluck, JSON.parse per row": (S) => bfs(S, (f) => { const a = JSON.stringify(f); return jsonEach.all(a, B).concat(jsonEachRet.all(a, B, B)).map((s) => JSON.parse(s)); }),
  "J2b json_each IN per hop, pluck, one JSON.parse per hop": (S) => bfs(S, (f) => { const a = JSON.stringify(f); const l = jsonEach.all(a, B).concat(jsonEachRet.all(a, B, B)); return JSON.parse("[" + l.join(",") + "]"); }),
  "J3 owner range + IN for misses, parse per row": (S) => ownerPull(S, (S) => range.all(S, S + "0", B).concat(rangeRet.all(S, S + "0", B, B)).map((s) => JSON.parse(s)), (m) => jHop(m), (r) => (r.value_type === "ref" ? r.value_string : undefined), (r) => r.entity_id),
  "J4 subject doc, string only": (S) => ({ n: doc.get(S).length }),
  "J4p subject doc, one JSON.parse": (S) => ({ n: JSON.parse(doc.get(S)).length }),
  "C1 compact IN per hop, raw, object per row": (S) => cBfs(S, true),
  "C1r compact IN per hop, raw arrays only": (S) => cBfs(S, false),
  "C2 compact recursive CTE, raw arrays": (S) => ({ n: cte.all({ b: B, root: ents.get(S) }).length }),
  "C2o compact recursive CTE, object per row": (S) => ({ n: cte.all({ b: B, root: ents.get(S) }).map(obj).length }),
  "C3 compact owner range + IN for misses, raw arrays": (S) => cOwnerPull(S, false),
  "C3o compact owner range + IN for misses, object per row": (S) => cOwnerPull(S, true),
  "C6 compact owner range, no id column (Buffer cost probe)": (S) => ({ n: cOwnerNoId.all(ents.get(S), B).length }),
  "C6b compact owner range, all columns incl. id Buffer": (S) => ({ n: cOwner.all(ents.get(S), B).length }),
  "C7 compact owner range, one json_group_array text built in SQLite": (S) => ({ n: cOwnerAgg.get(ents.get(S), B).length }),
  "C7p same, plus one JSON.parse": (S) => ({ n: JSON.parse(cOwnerAgg.get(ents.get(S), B)).length }),
  "C4 compact subject doc, Buffer only": (S) => ({ n: cDoc.get(ents.get(S)).length }),
};
const only = process.env.ARMS ? new RegExp(process.env.ARMS) : null;
const res = {};
for (const [name, fn] of Object.entries(arms)) {
  if (only && !only.test(name)) continue;
  const rounds = [];
  let rows = 0, extra = {};
  for (let k = 0; k < 3; k++) {
    tm.step = tm.parse = 0; rows = 0;
    const c0 = process.threadCpuUsage(), t0 = performance.now(); const lat = [];
    for (let i = k * P; i < (k + 1) * P; i++) { const a = performance.now(); const r = fn(subj(order[i])); lat.push(performance.now() - a); rows += r.n; if (r.stmts) extra.stmts = (extra.stmts ?? 0) + r.stmts; }
    const c1 = process.threadCpuUsage(c0), wall = performance.now() - t0; lat.sort((x, y) => x - y);
    rounds.push({ usPerPullCpu: (c1.user + c1.system) / P, usPerPullWall: (wall * 1000) / P, sysShare: c1.system / (c1.user + c1.system), p50: lat[P >> 1], p99: lat[Math.floor(P * 0.99)], rowsPerPull: rows / P,
      ...(tm.step ? { stepUs: (tm.step * 1000) / P, parseUs: (tm.parse * 1000) / P } : {}) });
  }
  const w = rounds.slice(1); const avg = (f) => w.reduce((s, r) => s + r[f], 0) / w.length;
  res[name] = { cpuUs: +avg("usPerPullCpu").toFixed(1), wallUs: +avg("usPerPullWall").toFixed(1), usPerRow: +(avg("usPerPullCpu") / avg("rowsPerPull")).toFixed(3), pullsPerCpuSec: Math.round(1e6 / avg("usPerPullCpu")),
    p50ms: +avg("p50").toFixed(3), p99ms: +avg("p99").toFixed(3), sysShare: +avg("sysShare").toFixed(2), rowsPerPull: +avg("rowsPerPull").toFixed(1), firstRoundCpuUs: +rounds[0].usPerPullCpu.toFixed(1),
    ...(rounds[1].stepUs ? { stepUs: +avg("stepUs").toFixed(1), parseUs: +avg("parseUs").toFixed(1) } : {}), ...(extra.stmts ? { stmtsPerPull: +(extra.stmts / (3 * P)).toFixed(2) } : {}) };
  console.log(name.padEnd(62), JSON.stringify(res[name]));
}
console.log(JSON.stringify({ cache, N, P, node: process.version, statementsPrepared: jStmts.size + cStmts.size }));
```

### B. bench5.mjs

```js
// R46 bench 2: worker-thread protocols for a W0 subject pull, CPU on every thread.
// Usage: node bench2.mjs <datadir> [N] [pulls] [concurrency]
// W1 runs the real SQL01 reader worker source (packages/qlever/src/broker/sqlite-worker.ts) with log.ts's async request protocol.
import { Worker, MessageChannel } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const K = process.env.KERNEL ? await import("./kernel.mts") : null;
const require = createRequire(import.meta.url);
const driver = "/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3";
const dir = process.argv[2] ?? "./data", N = Number(process.argv[3] ?? 2000), P = Number(process.argv[4] ?? 1000), CONC = Number(process.argv[5] ?? 1);
const src = readFileSync("/Users/sam/projects/triplex-db-2/packages/qlever/src/broker/sqlite-worker.ts", "utf8");
const realWorker = src.slice(src.indexOf("String.raw`") + 11, src.lastIndexOf("`;"));
// Bench-only ops appended to the real worker: cpu report, and QH1 variants. They reuse its q(), marker(), gate and txn wrapper.
const extraOps = String.raw`
const __handle = handle;
const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let C, ents, names, attrNames, cStmts=new Map(), TN=[, 'ref','string','number','boolean','integer'];
const cq = sql => { let s=cStmts.get(sql); if(!s) cStmts.set(sql, s=C.prepare(sql).raw()); return s; };
const openCompact = () => { if (C) return; C = new D(workerData.compact, {readonly:true, fileMustExist:true}); if (workerData.mmap) { C.pragma('mmap_size=8589934592'); }
  ents=new Map(); names=[]; for (const r of C.prepare('SELECT eid,name FROM ents').iterate()) { ents.set(r.name, r.eid); names[r.eid]=r.name; }
  attrNames=[]; for (const r of C.prepare('SELECT aid,name FROM attrs').iterate()) attrNames[r.aid]=r.name; };
handle = (op, a) => {
 if (op==='cpu') return process.threadCpuUsage();
 if (op==='pullText') { // QH1 product change 2: one JSON text per hop from .pluck() strings
  const m=marker(), b=a.basis; if(b<m.h || b>m.lsn*1024+1023) throw Error('BASIS_NOT_AVAILABLE');
  const ph=a.selection.entities.map(()=>'?').join(',');
  const l=q('SELECT row FROM live_rows WHERE entity IN ('+ph+') AND pos<=?').pluck().all(...a.selection.entities,b);
  const r=q('SELECT row FROM retired_rows WHERE entity IN ('+ph+') AND rpos>? AND pos<=?').pluck().all(...a.selection.entities,b,b);
  return {snapshot:m,basis:b,eligible:true,text:'['+l.concat(r).join(',')+']'};
 }
 if (op==='pullTreeJson' || op==='pullTreeJsonSql') { // arm H1w on today's JSON layout: whole BFS in this one read transaction
  const m=marker(), b=a.basis; if(b<m.h || b>m.lsn*1024+1023) throw Error('BASIS_NOT_AVAILABLE');
  const seen=new Set([a.root]); let frontier=[a.root]; const out=[];
  const sqlRef = op==='pullTreeJsonSql';
  while(frontier.length){ const ph=frontier.map(()=>'?').join(','); const next=[];
   const cols = sqlRef ? "row, CASE WHEN json_extract(row,'$.value_type')='ref' THEN json_extract(row,'$.value_string') END" : 'row';
   const l=q('SELECT '+cols+' FROM live_rows WHERE entity IN ('+ph+') AND pos<=?').raw().all(...frontier,b);
   const r=q('SELECT '+cols+' FROM retired_rows WHERE entity IN ('+ph+') AND rpos>? AND pos<=?').raw().all(...frontier,b,b);
   for (const x of l.concat(r)) { out.push(x[0]); const t = sqlRef ? x[1] : (()=>{const o=JSON.parse(x[0]); return o.value_type==='ref'?o.value_string:null;})();
    if (t!=null && !seen.has(t)) { seen.add(t); next.push(t); } }
   frontier=next; }
  return {snapshot:m,basis:b,eligible:true,text:'['+out.join(',')+']'};
 }
 if (op==='pullTreeCompact') { // H1w on R45's compact layout, owner-range prefetch, rows as arrays
  openCompact(); C.prepare('BEGIN').run(); try {
  const m=C.prepare('SELECT lsn,epoch,h,position,crc,size FROM marker WHERE id=1').get(), b=a.basis; if(b<m.h || b>m.lsn*1024+1023) throw Error('BASIS_NOT_AVAILABLE');
  const S=a.root, o=ents.get(S); const byE=new Map();
  const add = r => { let x=byE.get(r[0]); if(!x) byE.set(r[0], x=[]); x.push(r); };
  for (const r of cq('SELECT e,id,a,pos,t,v,vf,vto FROM facts WHERE o=? AND pos<=?').all(o,b)) add(r);
  for (const r of cq('SELECT e,id,a,pos,t,v,vf,vto FROM history WHERE e IN (SELECT e FROM facts WHERE o=?) AND rpos>? AND pos<=?').all(o,b,b)) add(r);
  const seen=new Set([o]); let frontier=[o]; const out=[];
  while(frontier.length){ const miss=frontier.filter(e=>!byE.has(e) && !names[e].startsWith(S));
   if (miss.length) { const ph=miss.map(()=>'?').join(','); for (const r of cq('SELECT e,id,a,pos,t,v,vf,vto FROM fe WHERE e IN ('+ph+') AND pos<=?').all(...miss,b)) add(r);
     for (const r of cq('SELECT e,id,a,pos,t,v,vf,vto FROM history WHERE e IN ('+ph+') AND rpos>? AND pos<=?').all(...miss,b,b)) add(r); }
   const next=[]; for (const e of frontier) for (const r of byE.get(e)??[]) { out.push(r); if (r[4]===1 && !seen.has(r[5])) { seen.add(r[5]); next.push(r[5]); } }
   frontier=next; }
  // resolve interned ids to names so the main thread needs no dictionary
  if (a.form==='arrays') { for (const r of out) { r[0]=names[r[0]]; r[1]=r[1].toString('hex'); r[2]=attrNames[r[2]]; r[4]=TN[r[4]]; if (r[4]==='ref') r[5]=names[r[5]]; } return {snapshot:m,basis:b,rows:out}; }
  if (a.form==='columns') { const n=out.length, e=new Array(n), id=new Array(n), at=new Array(n), pos=new Float64Array(n), t=new Array(n), v=new Array(n), vf=new Float64Array(n);
    for (let i=0;i<n;i++){ const r=out[i]; e[i]=names[r[0]]; id[i]=r[1].toString('hex'); at[i]=attrNames[r[2]]; pos[i]=r[3]; t[i]=TN[r[4]]; v[i]=r[4]===1?names[r[5]]:r[5]; vf[i]=r[6]; }
    return {snapshot:m,basis:b,n,e,id,at,pos,t,v,vf}; }
  if (a.form==='rowsJson') { // TripleRow-shaped objects serialized once: what the kernel would receive
    const s=[]; for (const r of out) { const vt=TN[r[4]]; s.push(JSON.stringify({id:r[1].toString('hex'),entity_id:names[r[0]],attribute:attrNames[r[2]],value_type:vt,value_string:vt==='ref'?names[r[5]]:(vt==='string'||vt==='integer'?r[5]:null),value_number:vt==='number'?r[5]:null,value_boolean:vt==='boolean'?!!r[5]:null,value_datetime:null,value_json:null,recorded_at:0,recorded_position:r[3],valid_from:r[6],valid_to:r[7],created_by:'actor:seed',retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:1,tx_id:null})); }
    return {snapshot:m,basis:b,text:'['+s.join(',')+']'}; }
  } finally { C.prepare('COMMIT').run(); }
 }

 if (op==='pullTreeCompactSql') { // H1w, compact layout: SQLite builds the answer text in C (REAL rendered with printf %!.17g, never json's 15 digits)
  openCompact(); C.prepare('BEGIN').run(); try {
  const m=C.prepare('SELECT lsn,epoch,h,position,crc,size FROM marker WHERE id=1').get(), b=a.basis; if(b<m.h || b>m.lsn*1024+1023) throw Error('BASIS_NOT_AVAILABLE');
  const o=ents.get(a.root);
  if (!globalThis.__own) {
   const row = "json_array(n.name, hex(f.id), at.name, f.pos, f.t, CASE f.t WHEN 1 THEN rn.name ELSE CASE WHEN typeof(f.v)='real' THEN printf('%!.17g', f.v) ELSE f.v END END, f.vf, f.vto)";
   globalThis.__own = C.prepare("SELECT json_group_array("+row+") FROM (SELECT * FROM facts WHERE o=@o AND pos<=@b UNION ALL SELECT @o,h.e,h.id,h.a,h.pos,h.t,h.v,h.vf,h.vto,h.c,h.y FROM history h WHERE h.e IN (SELECT e FROM facts WHERE o=@o) AND h.rpos>@b AND h.pos<=@b) f JOIN ents n ON n.eid=f.e JOIN attrs at ON at.aid=f.a LEFT JOIN ents rn ON f.t=1 AND rn.eid=f.v").pluck();
   globalThis.__ext = C.prepare("WITH RECURSIVE ext(e) AS (SELECT f.v FROM facts f WHERE f.o=@o AND f.t=1 AND f.pos<=@b AND f.v NOT IN (SELECT e FROM facts WHERE o=@o) UNION SELECT f.v FROM ext JOIN fe f ON f.e=ext.e WHERE f.t=1 AND f.pos<=@b) SELECT json_group_array("+row+") FROM ext JOIN fe f ON f.e=ext.e AND f.pos<=@b JOIN ents n ON n.eid=f.e JOIN attrs at ON at.aid=f.a LEFT JOIN ents rn ON f.t=1 AND rn.eid=f.v").pluck();
  }
  return {snapshot:m,basis:b,own:globalThis.__own.get({o,b}),ext:globalThis.__ext.get({o,b})};
  } finally { C.prepare('COMMIT').run(); }
 }
 if (op==='docCompact') { openCompact(); const body=C.prepare('SELECT body FROM cdocs WHERE o=?').pluck().get(ents.get(a.root)); return body; }
 return __handle(op, a);
};
`;
const patched = realWorker.replace("const handle = (op,a) => {", "let handle = (op,a) => {") + extraOps;
const benchWorker = patched;
const spawn = (code, extra = {}) => {
  const w = new Worker(code, { eval: true, workerData: { file: `${dir}/json.db`, role: "reader", seed: 0, driver, gateBuffer: new SharedArrayBuffer(8), compact: `${dir}/compact.db`, ...extra } });
  w.unref();
  return w;
};
// log.ts Connection.request, copied
const request = (worker, op, args) => {
  const { port1, port2 } = new MessageChannel();
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); port1.close(); worker.off("error", onError); worker.off("exit", onExit); };
    const onError = (error) => { cleanup(); reject(new Error(String(error))); };
    const onExit = (code) => onError(new Error(`worker exited ${code}`));
    const timer = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 30_000);
    worker.once("error", onError); worker.once("exit", onExit);
    port1.once("message", (data) => { cleanup(); if (data.error) reject(new Error(data.error)); else resolve(data.result); });
    worker.postMessage({ op, args, response: port2 }, [port2]);
  });
};
const B = 2 ** 40;
const subj = (i) => "pl:s" + String(i).padStart(8, "0");
let seed = 777; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const order = Array.from({ length: 4 * P }, () => 1 + Math.floor(rnd() * N));
const bfsMain = async (w, root, op, decode) => {
  const seen = new Set([root]); let frontier = [root]; let n = 0;
  while (frontier.length) {
    const res = await request(w, op, { basis: B, selection: { entities: frontier } });
    const rows = decode(res); const next = [];
    for (const r of rows) { n++; if (r.value_type === "ref" && !seen.has(r.value_string)) { seen.add(r.value_string); next.push(r.value_string); } }
    frontier = next;
  }
  return n;
};
const ROWKEYS = ["id","entity_id","attribute","value_type","value_string","value_number","value_boolean","value_datetime","value_json","recorded_at","recorded_position","valid_from","valid_to","created_by","retracted_at","retracted_position","retract_tx_id","entity_type","schema_version","tx_id"];
const NONE = Object.freeze({ _tag: "None" }); const some = (value) => ({ _tag: "Some", value });
const leanTriple = (x) => ({ id: x[1], entityId: x[0], attribute: x[2], value: { type: TNM[x[4]], value: x[4] === 3 ? Number(x[5]) : x[4] === 4 ? Number(x[5]) !== 0 : x[5] }, recordedAt: 0, validFrom: x[6], validTo: x[7] == null ? NONE : some(x[7]), createdBy: some("actor:seed"), retractedAt: NONE, entityType: NONE, schemaVersion: some(1), txId: NONE, retractTxId: NONE });
const TNM = [, 'ref', 'string', 'number', 'boolean', 'integer'];
const toRow = (e, id, at, pos, t, v, vf, vto) => ({ id, entity_id: e, attribute: at, value_type: t, value_string: t === "ref" || t === "string" || t === "integer" ? v : null, value_number: t === "number" ? v : null, value_boolean: t === "boolean" ? (Number(v) ? 1 : 0) : null, value_datetime: null, value_json: null, recorded_at: 0, recorded_position: pos, valid_from: vf, valid_to: vto ?? null, created_by: "actor:seed", retracted_at: null, retracted_position: null, retract_tx_id: null, entity_type: null, schema_version: 1, tx_id: null });
const arms = {
  "W1K today full stack: real SQL01 worker per hop plus today's adapter and kernel": { code: benchWorker, run: async (w, S) => {
    const fix = (r) => { if (r.value_type === "integer" && r.value_string === "[object Object]") r.value_string = "123"; if (r.value_type === "boolean") r.value_boolean = r.value_boolean ? 1 : 0; return r; };
    const seen = new Set([S]); let f = [S]; let n = 0;
    while (f.length) { const bodies = await K.todayEntities(async (e) => (await request(w, "pull", { basis: B, selection: { entities: e } })).rows.map(fix), f, B); const next = [];
      for (const body of bodies) for (const t of body) { n++; if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); } } f = next; }
    return n; } },
  "W2K QH1 changes 2 (text) plus today's adapter and kernel": { code: benchWorker, run: async (w, S) => {
    const fix = (r) => { if (r.value_type === "integer" && r.value_string === "[object Object]") r.value_string = "123"; if (r.value_type === "boolean") r.value_boolean = r.value_boolean ? 1 : 0; return r; };
    const seen = new Set([S]); let f = [S]; let n = 0;
    while (f.length) { const bodies = await K.todayEntities(async (e) => JSON.parse((await request(w, "pullText", { basis: B, selection: { entities: e } })).text).map(fix), f, B); const next = [];
      for (const body of bodies) for (const t of body) { n++; if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); } } f = next; }
    return n; } },
  "W1 today: real SQL01 worker, pull op per hop, row objects cloned": { code: benchWorker, run: (w, S) => bfsMain(w, S, "pull", (r) => r.rows) },
  "W2 QH1 change 2: pull per hop, one JSON text, parsed once per hop": { code: benchWorker, run: (w, S) => bfsMain(w, S, "pullText", (r) => JSON.parse(r.text)) },
  "W3a H1w JSON layout: BFS in worker (JS parse for refs), text parsed once": { code: benchWorker, run: async (w, S) => JSON.parse((await request(w, "pullTreeJson", { basis: B, root: S })).text).length },
  "W3b H1w JSON layout: BFS in worker (SQL json_extract refs), text parsed once": { code: benchWorker, run: async (w, S) => JSON.parse((await request(w, "pullTreeJsonSql", { basis: B, root: S })).text).length },
  "W3c H1w JSON layout, SQL refs, text forwarded unparsed (option c)": { code: benchWorker, run: async (w, S) => (await request(w, "pullTreeJsonSql", { basis: B, root: S })).text.length > 0 ? 1 : 0 },
  "W4a H1w compact owner-range: arrays cloned, TripleRow objects built on main": { code: benchWorker, run: async (w, S) => (await request(w, "pullTreeCompact", { basis: B, root: S, form: "arrays" })).rows.map((r) => toRow(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7])).length },
  "W4b H1w compact owner-range: columns cloned, TripleRow objects built on main": { code: benchWorker, run: async (w, S) => { const c = await request(w, "pullTreeCompact", { basis: B, root: S, form: "columns" }); const o = new Array(c.n); for (let i = 0; i < c.n; i++) o[i] = toRow(c.e[i], c.id[i], c.at[i], c.pos[i], c.t[i], c.v[i], c.vf[i], null); return o.length; } },
  "W4c H1w compact owner-range: TripleRow JSON text built in worker, parsed on main": { code: benchWorker, run: async (w, S) => JSON.parse((await request(w, "pullTreeCompact", { basis: B, root: S, form: "rowsJson" })).text).length },
  "W4d H1w compact owner-range: arrays cloned, no objects (option c, compact)": { code: benchWorker, run: async (w, S) => (await request(w, "pullTreeCompact", { basis: B, root: S, form: "arrays" })).rows.length },
  "W6 H1w compact: answer text built by SQLite (owner range + external refs), one parse, BFS and TripleRow objects on main": { code: benchWorker, run: async (w, S) => {
    const r = await request(w, "pullTreeCompactSql", { basis: B, root: S }); const rows = JSON.parse(r.own).concat(JSON.parse(r.ext));
    const byE = new Map(); for (const x of rows) { let l = byE.get(x[0]); if (!l) byE.set(x[0], (l = [])); l.push(x); }
    const seen = new Set([S]); let f = [S]; const out = [];
    while (f.length) { const next = []; for (const e of f) for (const x of byE.get(e) ?? []) { out.push(toRow(x[0], x[1], x[2], x[3], TNM[x[4]], x[4] === 3 ? Number(x[5]) : x[5], x[6], x[7])); if (x[4] === 1 && !seen.has(x[5])) { seen.add(x[5]); next.push(x[5]); } } f = next; }
    return out.length; } },
  "W6K prefetch design: W6 subtree read at hop 0, later hops served from it, today's adapter and kernel per hop": { code: benchWorker, run: async (w, S) => {
    let byE = null;
    const fetchHop = async (ents) => { if (!byE) { const r = await request(w, "pullTreeCompactSql", { basis: B, root: S }); byE = new Map();
        for (const x of JSON.parse(r.own).concat(JSON.parse(r.ext))) { let l = byE.get(x[0]); if (!l) byE.set(x[0], (l = [])); l.push(toRow(x[0], x[1], x[2], x[3], TNM[x[4]], x[4] === 3 ? Number(x[5]) : x[4] === 4 ? (Number(x[5]) ? 1 : 0) : x[5], x[6], x[7])); } }
      const out = []; for (const e of ents) for (const r of byE.get(e) ?? []) { if (r.value_type === "integer" && !/^-?\d+$/.test(r.value_string)) r.value_string = "123"; out.push(r); } return out; };
    const seen = new Set([S]); let f = [S]; let n = 0;
    while (f.length) { const bodies = await K.todayEntities(fetchHop, f, B); const next = [];
      for (const body of bodies) for (const t of body) { n++; if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); } } f = next; }
    return n; } },
  "W7 W6 plus lean kernel: Triple objects with Options built directly, no TripleRow, no re-validation": { code: benchWorker, run: async (w, S) => {
    const r = await request(w, "pullTreeCompactSql", { basis: B, root: S }); const rows = JSON.parse(r.own).concat(JSON.parse(r.ext));
    const byE = new Map(); for (const x of rows) { let l = byE.get(x[0]); if (!l) byE.set(x[0], (l = [])); l.push(x); }
    const seen = new Set([S]); let f = [S]; const out = [];
    while (f.length) { const next = []; for (const e of f) for (const x of byE.get(e) ?? []) { out.push(leanTriple(x)); if (x[4] === 1 && !seen.has(x[5])) { seen.add(x[5]); next.push(x[5]); } } f = next; }
    return out.length; } },
  "W5d subject doc (compact blob), one parse, lean Triples on main (option a in full)": { code: benchWorker, run: async (w, S) => {
    const b = await request(w, "docCompact", { root: S }); const rows = JSON.parse(Buffer.from(b).toString());
    const out = new Array(rows.length); for (let i = 0; i < rows.length; i++) { const x = rows[i]; out[i] = { id: x[0], entityId: x[1], attribute: x[2], value: { type: x[3], value: x[4] }, recordedAt: 0, validFrom: x[6], validTo: x[7] == null ? NONE : some(x[7]), createdBy: NONE, retractedAt: NONE, entityType: NONE, schemaVersion: some(1), txId: NONE, retractTxId: NONE }; }
    return out.length; } },
  "W5 subject doc (compact blob) forwarded as bytes (options a+c)": { code: benchWorker, run: async (w, S) => (await request(w, "docCompact", { root: S })).length },
};

if (process.env.VALIDATE) {
  const canon = (tuples) => tuples.map((t) => JSON.stringify([t[0], t[1].replace(/^:/, ""), String(t[2])])).sort().join("\n");
  const w1 = spawn(benchWorker), w4 = spawn(benchWorker), w6 = spawn(benchWorker);
  for (const w of [w1, w4, w6]) await request(w, "init");
  let same = 0, diff = 0, rowsTotal = 0;
  for (let i = 0; i < Number(process.env.VALIDATE); i++) {
    const S = subj(order[i]);
    const a = []; { const seen = new Set([S]); let f = [S]; while (f.length) { const r = await request(w1, "pull", { basis: B, selection: { entities: f } }); const next = [];
      for (const x of r.rows) { a.push([x.entity_id, x.attribute, x.value_string ?? (x.value_boolean === null ? x.value_number : (x.value_boolean ? 1 : 0))]); if (x.value_type === "ref" && !seen.has(x.value_string)) { seen.add(x.value_string); next.push(x.value_string); } } f = next; } }
    const c = await request(w4, "pullTreeCompact", { basis: B, root: S, form: "columns" }); const b = []; for (let k = 0; k < c.n; k++) b.push([c.e[k], c.at[k], c.t[k] === "boolean" ? (c.v[k] ? 1 : 0) : c.v[k]]);
    const r6 = await request(w6, "pullTreeCompactSql", { basis: B, root: S }); const rows = JSON.parse(r6.own).concat(JSON.parse(r6.ext));
    const byE = new Map(); for (const x of rows) { let l = byE.get(x[0]); if (!l) byE.set(x[0], (l = [])); l.push(x); }
    const d = []; { const seen = new Set([S]); let f = [S]; while (f.length) { const next = []; for (const e of f) for (const x of byE.get(e) ?? []) { d.push([x[0], x[2], x[4] === 3 ? Number(x[5]) : x[4] === 4 ? (Number(x[5]) ? 1 : 0) : x[5]]); if (x[4] === 1 && !seen.has(x[5])) { seen.add(x[5]); next.push(x[5]); } } f = next; } }
    const ca = canon(a), cb = canon(b), cd = canon(d); rowsTotal += a.length;
    if (ca === cb && ca === cd) same++; else { diff++; if (diff <= 2) { const A = ca.split("\n"), Bb = cb.split("\n"), Dd = cd.split("\n"); for (let k = 0; k < A.length; k++) if (A[k] !== Bb[k] || A[k] !== Dd[k]) { console.log("DIFF", S, A[k], Bb[k], Dd[k]); break; } } }
  }
  console.log(JSON.stringify({ validatedSubjects: same + diff, identical: same, different: diff, rowsCompared: rowsTotal }));
  process.exit(0);
}

// Interleaved rounds: every arm runs P pulls per round, arms rotate inside each round, ratios to W1 computed per round.
const only = process.env.ARMS ? new RegExp(process.env.ARMS) : null;
const names = Object.keys(arms).filter((n) => !only || only.test(n));
const pools = {};
for (const n of names) { pools[n] = Array.from({ length: CONC }, () => spawn(arms[n].code, { mmap: process.env.MMAP === "1" })); for (const w of pools[n]) await request(w, "init"); }
const ROUNDS = Number(process.env.ROUNDS ?? 6); const per = {}; const lat = {}; for (const n of names) { per[n] = []; lat[n] = []; }
let cursor = 0;
for (let r = 0; r < ROUNDS; r++) {
  const rot = names.slice(r % names.length).concat(names.slice(0, r % names.length));
  const start = cursor; cursor += P;
  for (const n of rot) {
    const pool = pools[n]; const p0 = process.cpuUsage(); let next = start; const end = start + P;
    await Promise.all(pool.map(async (w) => { while (next < end) { const i = next++; const a = performance.now(); await arms[n].run(w, subj(order[i % order.length])); if (r > 0) lat[n].push(performance.now() - a); } }));
    const c = process.cpuUsage(p0); if (r > 0) per[n].push((c.user + c.system) / P);
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const base = names.find((n) => n.startsWith("W1K")) ?? names.find((n) => n.startsWith("W1"));
for (const n of names) {
  const ratios = base ? per[n].map((x, k) => x / per[base][k]) : [];
  console.log(n.padEnd(80), JSON.stringify({ conc: CONC, procCpuUsPerPull_median: +med(per[n]).toFixed(1), min: +Math.min(...per[n]).toFixed(1), max: +Math.max(...per[n]).toFixed(1), pullsPerCpuSec_median: Math.round(1e6 / med(per[n])), ratioToW1_median: base ? +med(ratios).toFixed(3) : null, p50ms: +q(lat[n], 0.5).toFixed(3), p99ms: +q(lat[n], 0.99).toFixed(3) }));
}
for (const n of names) for (const w of pools[n]) await w.terminate();
```

### B. kernel.mts

```ts
// R46: today's main-thread read path per hop (adapter H1 branch, wrap + mask, getByEntities, TriplesLive.entities, rowDecoder),
// the same functions as bench3, packaged for the full-stack arms in bench5 (run under tsx).
import { Effect, Option } from "/Users/sam/projects/triplex-db-2/node_modules/.pnpm/effect@4.0.3/node_modules/effect/dist/index.js";
import { decodeValueColumns, storedValueDomain, ValueDomains } from "/Users/sam/projects/triplex-db-2/packages/core/src/ValueDomain.ts";
const domain = ValueDomains.qlever;
const rowToTriple = (row: any) => { const value = decodeValueColumns(row, storedValueDomain(domain, row.attribute));
  return { id: row.id, entityId: row.entity_id, attribute: row.attribute, value, recordedAt: Number(row.recorded_at), validFrom: Number(row.valid_from),
    validTo: row.valid_to !== null ? Option.some(Number(row.valid_to)) : Option.none(), createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
    retractedAt: row.retracted_at !== null ? Option.some(Number(row.retracted_at)) : Option.none(), entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
    schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(), txId: row.tx_id ? Option.some(row.tx_id) : Option.none(),
    retractTxId: row.retract_tx_id ? Option.some(row.retract_tx_id) : Option.none() }; };
const visibleAt = (row: any, b: number, basis?: any) => row.recorded_position <= b && !(basis?.recordedAt !== undefined && row.recorded_at > basis.recordedAt) &&
  !(row.retracted_at !== null && row.retracted_position !== null && row.retracted_position <= b && (basis?.recordedAt === undefined || row.retracted_at <= basis.recordedAt)) &&
  (basis === undefined || (row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt)));
const snapshotRows = (rows: readonly any[], position: number, basis?: any) => rows.map((row) => { const future = (row.retracted_position !== null && (row.retracted_position < 0 || row.retracted_position > position)) || (basis?.recordedAt !== undefined && row.retracted_at !== null && row.retracted_at > basis.recordedAt);
  return future ? { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null } : row; });
const isRowArray = (item: any[]) => item.every((row) => row && typeof row === "object" && "recorded_position" in row && "retracted_position" in row && "entity_id" in row && "value_type" in row);
const mask = (value: any, position: number, basis?: any): any => { const visit = (item: any): any => { if (Array.isArray(item)) return isRowArray(item) ? snapshotRows(item, position, basis) : item.map(visit);
  if (item instanceof Map) return new Map([...item].map(([k, c]) => [k, visit(c)])); return item; }; return visit(value); };
// fetchHop(entities) -> Promise<TripleRow[]> is the H1 read (worker round trip). Returns Triple[][] per entity, as T.entities does.
export const todayEntities = (fetchHop: (e: string[]) => Promise<any[]>, ids: string[], B: number) => {
  const basis = { recordedPosition: B, validAt: 2 ** 41 };
  const queryRows = (entities: string[]) => Effect.gen(function* () {
    const b = yield* Effect.tryPromise({ try: async () => B, catch: (c) => c });
    const pinned = yield* Effect.tryPromise({ try: async () => ({ eligible: true, rows: await fetchHop(entities) }), catch: (c) => c });
    const select = (row: any) => entities.includes(row.entity_id);
    const byId = new Map<string, any>(); for (const row of pinned.rows.filter(select)) byId.set(row.id, row);
    const out = new Map<string, any>(); for (const [k, row] of byId) if (visibleAt(row, b, basis)) out.set(k, row);
    return snapshotRows([...out.values()], b, basis).toSorted((a: any, c: any) => a.recorded_at - c.recorded_at || a.id.localeCompare(c.id)); });
  const getByEntities = (xs: string[]) => Effect.gen(function* () {
    const b = yield* Effect.tryPromise({ try: async () => B, catch: (c) => c }); const uniq = [...new Set(xs)];
    const result = yield* Effect.map(queryRows(uniq), (rows) => new Map(uniq.map((id) => [id, rows.filter((row: any) => row.entity_id === id)])));
    return mask(result, b, basis); });
  return Effect.runPromise(Effect.gen(function* () { const rows = yield* getByEntities(ids); return ids.map((id) => (rows.get(id) ?? []).map(rowToTriple)); }));
};
```

### B. bench3.mts

```ts
// R46 bench 3: main-thread kernel and adapter CPU per W0 pull, given each hop's TripleRow objects (IPC and SQLite excluded).
// Replicates BrokerStorageAdapter.queryRows (H1 branch), snapshotReadPolicy.wrap + maskSnapshotResult, getByEntities,
// TriplesLive.entities + rowDecoder, and lab/bench/lib/composition.ts's BFS. Uses the real effect@4 Option/Effect and the real
// core decodeValueColumns/storedValueDomain/ValueDomains. Usage: tsx bench3.ts <datadir> [N] [pulls]
import { createRequire } from "node:module";
import { Effect, Option } from "/Users/sam/projects/triplex-db-2/node_modules/.pnpm/effect@4.0.3/node_modules/effect/dist/index.js";
import { decodeValueColumns, storedValueDomain, ValueDomains } from "/Users/sam/projects/triplex-db-2/packages/core/src/ValueDomain.ts";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const dir = process.argv[2] ?? "./data", N = Number(process.argv[3] ?? 2000), P = Number(process.argv[4] ?? 500);
const J = new D(`${dir}/json.db`, { readonly: true });
const B = 2 ** 40;
const subj = (i: number) => "pl:s" + String(i).padStart(8, "0");
let seed = 99; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const stmts = new Map<string, any>();
const hopRows = (ents: string[]) => { const sql = `SELECT row FROM live_rows WHERE entity IN (${ents.map(() => "?").join(",")}) AND pos<=?`;
  let s = stmts.get(sql); if (!s) stmts.set(sql, (s = J.prepare(sql).pluck())); return s.all(...ents, B) as string[]; };
// Pre-record each pull's hop texts so every arm re-parses fresh objects (parse cost excluded from the timing below).
type Pull = { root: string; hops: Map<string, string[]> };
const pulls: Pull[] = [];
for (let i = 0; i < P; i++) {
  const root = subj(1 + Math.floor(rnd() * N)); const hops = new Map<string, string[]>();
  const seen = new Set([root]); let f = [root];
  while (f.length) { const t = hopRows(f).map((x) => x.replace('"value_string":"[object Object]"', '"value_string":"123"').replace('"value_boolean":true', '"value_boolean":1').replace('"value_boolean":false', '"value_boolean":0')); hops.set([...f].sort().join("\u0000"), t); const next: string[] = [];
    for (const s of t) { const r = JSON.parse(s); if (r.value_type === "ref" && !seen.has(r.value_string)) { seen.add(r.value_string); next.push(r.value_string); } } f = next; }
  pulls.push({ root, hops });
}
const domain = ValueDomains.qlever;
const FLAGS = { noAssert: false, noMask: false, noSort: false };
const decodeNoAssert = (row: any) => { switch (row.value_type) { case "string": case "ref": case "integer": return { type: row.value_type, value: row.value_string };
  case "number": return { type: "number", value: row.value_number }; case "boolean": return { type: "boolean", value: row.value_boolean === 1 }; default: return { type: row.value_type }; } };
const rowToTriple = (row: any) => {
  const value = FLAGS.noAssert ? decodeNoAssert(row) : decodeValueColumns(row, storedValueDomain(domain, row.attribute));
  return { id: row.id, entityId: row.entity_id, attribute: row.attribute, value, recordedAt: Number(row.recorded_at), validFrom: Number(row.valid_from),
    validTo: row.valid_to !== null ? Option.some(Number(row.valid_to)) : Option.none(), createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
    retractedAt: row.retracted_at !== null ? Option.some(Number(row.retracted_at)) : Option.none(), entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
    schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(), txId: row.tx_id ? Option.some(row.tx_id) : Option.none(),
    retractTxId: row.retract_tx_id ? Option.some(row.retract_tx_id) : Option.none() };
};
const visibleAt = (row: any, b: number, basis?: any) => row.recorded_position <= b && !(basis?.recordedAt !== undefined && row.recorded_at > basis.recordedAt) &&
  !(row.retracted_at !== null && row.retracted_position !== null && row.retracted_position <= b && (basis?.recordedAt === undefined || row.retracted_at <= basis.recordedAt)) &&
  (basis === undefined || (row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt)));
const snapshotRows = (rows: readonly any[], position: number, basis?: any) => rows.map((row) => {
  const future = (row.retracted_position !== null && (row.retracted_position < 0 || row.retracted_position > position)) || (basis?.recordedAt !== undefined && row.retracted_at !== null && row.retracted_at > basis.recordedAt);
  return future ? { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null } : row; });
const isRowArray = (item: any[]) => item.every((row) => row && typeof row === "object" && "recorded_position" in row && "retracted_position" in row && "entity_id" in row && "value_type" in row);
const maskSnapshotResult = (value: any, position: number, basis?: any): any => {
  const visit = (item: any): any => { if (Array.isArray(item)) return isRowArray(item) ? snapshotRows(item, position, basis) : item.map(visit);
    if (item instanceof Map) return new Map([...item].map(([k, c]) => [k, visit(c)])); return item; };
  return visit(value);
};
const basis = { recordedPosition: B, validAt: 2 ** 41 };
const awaitResolved = async (_b: number) => {};
const readBasis = async (b: number) => { await awaitResolved(b); return b; };
// The H1 branch of queryRows as QH1 product change 1 would take it, with today's (fixed=false) or fixed post-processing.
const makeAdapter = (pull: Pull, fixed: boolean, collator?: Intl.Collator) => {
  const queryRows = (entities: string[]) => Effect.gen(function* () {
    const b = yield* Effect.tryPromise({ try: () => readBasis(basis.recordedPosition), catch: (c) => c });
    const pinned = yield* Effect.tryPromise({ try: async () => ({ eligible: true, rows: pull.hops.get([...entities].sort().join("\u0000"))!.map((s) => JSON.parse(s)) }), catch: (c) => c });
    const eset = fixed ? new Set(entities) : undefined;
    const select = fixed ? (row: any) => eset!.has(row.entity_id) : (row: any) => entities.includes(row.entity_id);
    const source = pinned.rows.filter(select);
    const byId = new Map<string, any>(); for (const row of source) byId.set(row.id, row);
    const out = new Map<string, any>(); for (const [rowId, row] of byId) if (visibleAt(row, b, basis)) out.set(rowId, row);
    const cmp = fixed ? (collator ? (a: any, c: any) => a.recorded_at - c.recorded_at || collator.compare(a.id, c.id) : (a: any, c: any) => a.recorded_at - c.recorded_at || (a.id < c.id ? -1 : a.id > c.id ? 1 : 0))
      : (a: any, c: any) => a.recorded_at - c.recorded_at || a.id.localeCompare(c.id);
    const masked = FLAGS.noMask ? [...out.values()] : snapshotRows([...out.values()], b, basis); return FLAGS.noSort ? masked : masked.toSorted(cmp);
  });
  const getByEntities = (ids: string[]) => Effect.gen(function* () {
    const b = yield* Effect.tryPromise({ try: () => readBasis(basis.recordedPosition), catch: (c) => c });
    const uniq = [...new Set(ids)];
    const result = yield* Effect.map(queryRows(uniq), (rows) => {
      if (!fixed) return new Map(uniq.map((id) => [id, rows.filter((row) => row.entity_id === id)]));
      const m = new Map<string, any[]>(uniq.map((id) => [id, []])); for (const r of rows) m.get(r.entity_id)!.push(r); return m; });
    return FLAGS.noMask ? result : maskSnapshotResult(result, b, basis);
  });
  const entities = (ids: string[]) => Effect.gen(function* () { const rows = yield* getByEntities(ids); return ids.map((id) => (rows.get(id) ?? []).map(rowToTriple)); });
  return entities;
};
const compositionPull = async (pull: Pull, fixed: boolean, collator?: Intl.Collator) => {
  const T = makeAdapter(pull, fixed, collator);
  const seen = new Set([pull.root]); let frontier = [pull.root]; const triples: any[] = [];
  while (frontier.length) {
    const bodies = await Effect.runPromise(T(frontier));
    const next: string[] = [];
    for (const body of bodies) for (const t of body) { triples.push(t); if (t.value?.type === "ref" && !seen.has(t.value.value)) { seen.add(t.value.value); next.push(t.value.value); } }
    frontier = next;
  }
  return triples.length;
};
// parse-only baseline, to subtract the JSON.parse that the arms include (that cost is already counted in bench 2)
const parseOnly = async (pull: Pull) => { let n = 0; for (const t of pull.hops.values()) { n += t.map((s) => JSON.parse(s)).length; await null; } return n; };
const run = async (name: string, fn: (p: Pull) => Promise<number>) => {
  const res: number[] = []; let rows = 0;
  for (let k = 0; k < 5; k++) { rows = 0; const c0 = process.threadCpuUsage(); for (const p of pulls) rows += await fn(p); const c = process.threadCpuUsage(c0); res.push((c.user + c.system) / P); }
  const w = res.slice(1).sort((a, b) => a - b);
  console.log(name.padEnd(64), JSON.stringify({ cpuUsPerPull: +w[1].toFixed(1), min: +w[0].toFixed(1), max: +w[3].toFixed(1), rowsPerPull: rows / P }));
  return w[1];
};
const base = await run("K0 JSON.parse of each hop only (baseline)", parseOnly);
const today = await run("K1 today: adapter H1 branch + mask + getByEntities + rowToTriple + BFS", (p) => compositionPull(p, false));
const fixed = await run("K2 fixed: Set membership, one-pass bucket, < comparator", (p) => compositionPull(p, true));
const coll = await run("K3 fixed with cached Intl.Collator comparator", (p) => compositionPull(p, true, new Intl.Collator()));
FLAGS.noAssert = true; const na = await run("K4 fixed, read-side domain assertion skipped", (p) => compositionPull(p, true));
FLAGS.noMask = true; const nm = await run("K5 K4 and no snapshot mask passes (no future rows here)", (p) => compositionPull(p, true));
FLAGS.noSort = true; const ns = await run("K6 K5 and no per-hop sort", (p) => compositionPull(p, true));
console.log(JSON.stringify({ k4: +(na - base).toFixed(1), k5: +(nm - base).toFixed(1), k6: +(ns - base).toFixed(1) }));
console.log(JSON.stringify({ kernelTodayUs: +(today - base).toFixed(1), kernelFixedUs: +(fixed - base).toFixed(1), kernelCollatorUs: +(coll - base).toFixed(1) }));
// order check: does localeCompare order equal code-unit order on these ids?
let diff = 0; const ids = [...pulls[0]!.hops.values()].flat().map((s) => JSON.parse(s).id);
for (let i = 1; i < ids.length; i++) { const a = ids[i - 1], b = ids[i]; if (Math.sign(a.localeCompare(b)) !== Math.sign(a < b ? -1 : a > b ? 1 : 0)) diff++; }
console.log(JSON.stringify({ localeVsCodeUnitOrderDiffs: diff, compared: ids.length - 1, note: "ids here are uppercase Crockford base32; non-ULID ids can differ" }));
```

### B. bench3b.mts

```ts
// R46 bench 3b: per-row and per-hop costs of the kernel steps, isolated. Usage: tsx bench3b.mts <datadir>
import { createRequire } from "node:module";
import { Effect, Option } from "/Users/sam/projects/triplex-db-2/node_modules/.pnpm/effect@4.0.3/node_modules/effect/dist/index.js";
import { decodeValueColumns, storedValueDomain, ValueDomains, invalidValue } from "/Users/sam/projects/triplex-db-2/packages/core/src/ValueDomain.ts";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const J = new D(`${process.argv[2] ?? "./data"}/json.db`, { readonly: true });
const texts: string[] = J.prepare("SELECT row FROM live_rows WHERE entity >= 'pl:s00000100' AND entity < 'pl:s00000300'").pluck().all()
  .map((x: string) => x.replace('"value_string":"[object Object]"', '"value_string":"123"').replace('"value_boolean":true', '"value_boolean":1').replace('"value_boolean":false', '"value_boolean":0'));
const rows = texts.map((s) => JSON.parse(s));
const n = rows.length; const domain = ValueDomains.qlever;
const time = (name: string, per: number, fn: () => void) => {
  const r: number[] = []; for (let k = 0; k < 7; k++) { const c0 = process.threadCpuUsage(); fn(); const c = process.threadCpuUsage(c0); r.push((c.user + c.system) / per); }
  r.sort((a, b) => a - b); console.log(name.padEnd(70), (r[3]!).toFixed(3), "us per unit (median of 7)"); return r[3]!;
};
const decodeNoAssert = (row: any) => { switch (row.value_type) { case "string": case "ref": case "integer": return { type: row.value_type, value: row.value_string };
  case "number": return { type: "number", value: row.value_number }; case "boolean": return { type: "boolean", value: row.value_boolean === 1 }; default: return { type: row.value_type }; } };
console.log(JSON.stringify({ rows: n }));
time("JSON.parse one row (about 520 B)", n, () => { for (const s of texts) JSON.parse(s); });
time("JSON.parse of the same rows as one array text", n, () => { JSON.parse("[" + texts.join(",") + "]"); });
time("decodeValueColumns with assertValueInDomain (today's read decode)", n, () => { for (const r of rows) decodeValueColumns(r, storedValueDomain(domain, r.attribute)); });
time("invalidValue alone on a decoded value", n, () => { for (const r of rows) invalidValue(decodeNoAssert(r), domain); });
time("decode without the domain assertion", n, () => { for (const r of rows) decodeNoAssert(r); });
time("seven Option allocations per row (rowDecoder's Triple shell)", n, () => { for (const r of rows) ({ a: r.valid_to !== null ? Option.some(r.valid_to) : Option.none(), b: r.created_by ? Option.some(r.created_by) : Option.none(), c: Option.none(), d: r.entity_type ? Option.some(r.entity_type) : Option.none(), e: Option.some(1), f: r.tx_id ? Option.some(r.tx_id) : Option.none(), g: Option.none() }); });
time("snapshotRows map (no future rows)", n, () => { rows.map((row) => (row.retracted_position !== null && row.retracted_position > 1) ? { ...row } : row); });
time("toSorted with localeCompare tie-break, all recorded_at equal", n, () => { rows.slice(0, 450).toSorted((a, b) => 0 || a.id.localeCompare(b.id)); });
time("toSorted with code-unit tie-break, all recorded_at equal", n, () => { rows.slice(0, 450).toSorted((a, b) => 0 || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); });
const ents = [...new Set(rows.slice(0, 150).map((r) => r.entity_id))];
time("entities.includes per row, 150-row hop over its entities", 150, () => { const s = rows.slice(0, 150); s.filter((r) => ents.includes(r.entity_id)); });
time("getByEntities per-id filter, 150-row hop (per row)", 150, () => { const s = rows.slice(0, 150); new Map(ents.map((id) => [id, s.filter((r) => r.entity_id === id)])); });
time("one Effect.runPromise of a 3-level gen with 3 tryPromise (per hop)", 1, () => {});
const hop = () => Effect.gen(function* () { const a = yield* Effect.tryPromise({ try: async () => 1, catch: (c) => c });
  const r = yield* Effect.gen(function* () { const b = yield* Effect.tryPromise({ try: async () => 2, catch: (c) => c }); const c = yield* Effect.tryPromise({ try: async () => 3, catch: (c) => c }); return a + b + c; }); return r; });
const H = 2000; const c0 = process.threadCpuUsage(); for (let i = 0; i < H; i++) await Effect.runPromise(hop()); const c = process.threadCpuUsage(c0);
for (let k = 0; k < 3; k++) { const c0 = process.threadCpuUsage(); for (let i = 0; i < H; i++) await Effect.runPromise(hop()); const c = process.threadCpuUsage(c0); console.log("Effect hop round".padEnd(70), ((c.user + c.system) / H).toFixed(2), "us per hop"); }
```

### B. bench4.mjs

```js
// R46 bench 4: P2 cost of maintaining a per-owner current document in the commit transaction.
// SQL01 durability pragmas (WAL, synchronous=FULL, fullfsync, checkpoint_fullfsync). Arms interleaved per commit.
// A: frame (9.5 KB) + 10 compact fact rows + head upsert.  B: A + read, decode, extend, encode and rewrite the owner's doc.
// Usage: node bench4.mjs <dir> [subjects] [commits]
import { createRequire } from "node:module";
import { rmSync, statSync, existsSync } from "node:fs";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const dir = process.argv[2] ?? "./data", S = Number(process.argv[3] ?? 2000), K = Number(process.argv[4] ?? 600);
const f = `${dir}/commit.db`; for (const x of ["", "-wal", "-shm"]) rmSync(f + x, { force: true });
const db = new D(f);
db.pragma("journal_mode=WAL"); db.pragma("synchronous=FULL"); db.pragma("fullfsync=ON"); db.pragma("checkpoint_fullfsync=ON"); db.pragma("wal_autocheckpoint=0");
db.exec(`CREATE TABLE frames(lsn INTEGER PRIMARY KEY, payload BLOB NOT NULL);
CREATE TABLE heads(o INT PRIMARY KEY, pos INT NOT NULL) WITHOUT ROWID;
CREATE TABLE facts(o INT NOT NULL, e INT NOT NULL, id BLOB NOT NULL, a INT NOT NULL, pos INT NOT NULL, t INT NOT NULL, v, vf INT, PRIMARY KEY(o,e,id)) WITHOUT ROWID;
CREATE UNIQUE INDEX facts_id ON facts(id);
CREATE TABLE docs(o INT PRIMARY KEY, pos INT NOT NULL, body BLOB NOT NULL);`);
let idn = 0; const idb = () => { const b = Buffer.alloc(16); b.writeBigUInt64BE(BigInt(++idn), 8); return b; };
const insF = db.prepare("INSERT INTO facts VALUES(?,?,?,?,?,?,?,?)"), insD = db.prepare("INSERT OR REPLACE INTO docs VALUES(?,?,?)");
const getD = db.prepare("SELECT body FROM docs WHERE o=?").pluck(), insFr = db.prepare("INSERT INTO frames VALUES(?,?)"), head = db.prepare("INSERT INTO heads VALUES(?,?) ON CONFLICT(o) DO UPDATE SET pos=excluded.pos");
const row = (o, pos) => { const e = o * 1000 + (idn % 300); return [o, e, idb(), 1 + (idn % 20), pos, 2, "a" + idn, 0]; };
const docRow = (r) => [r[1], r[2].toString("hex"), r[3], r[4], r[5], r[6], r[7]];
db.transaction(() => { for (let o = 1; o <= S; o++) { const rows = []; for (let i = 0; i < 449; i++) { const r = row(o, o); insF.run(...r); rows.push(docRow(r)); } insD.run(o, o, Buffer.from(JSON.stringify(rows))); } })();
db.pragma("wal_checkpoint(TRUNCATE)");
const frame = Buffer.alloc(9500, 7);
let lsn = 0; let seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const commitA = db.transaction((o, pos) => { insFr.run(++lsn, frame); for (let i = 0; i < 10; i++) insF.run(...row(o, pos)); head.run(o, pos); });
const commitB = db.transaction((o, pos) => { insFr.run(++lsn, frame); const add = []; for (let i = 0; i < 10; i++) { const r = row(o, pos); insF.run(...r); add.push(docRow(r)); } head.run(o, pos);
  const doc = JSON.parse(getD.get(o)); for (const r of add) doc.push(r); insD.run(o, pos, Buffer.from(JSON.stringify(doc))); });
const lat = { A: [], B: [] }, cpu = { A: 0, B: 0 }, wal = { A: 0, B: 0 };
const walSize = () => (existsSync(f + "-wal") ? statSync(f + "-wal").size : 0);
for (let k = 0; k < 2 * K; k++) {
  const arm = k % 2 ? "B" : "A"; const o = 1 + Math.floor(rnd() * S); const pos = S + k + 1;
  const w0 = walSize(), c0 = process.threadCpuUsage(), t0 = performance.now();
  (arm === "A" ? commitA : commitB).immediate(o, pos);
  lat[arm].push(performance.now() - t0); const c = process.threadCpuUsage(c0); cpu[arm] += c.user + c.system; wal[arm] += walSize() - w0;
  if (k % 100 === 99) db.pragma("wal_checkpoint(TRUNCATE)");
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(p * (s.length - 1))].toFixed(3); };
const docBytes = db.prepare("SELECT avg(length(body)) FROM docs").pluck().get();
for (const arm of ["A", "B"]) console.log(JSON.stringify({ arm, commits: K, p50ms: q(lat[arm], 0.5), p99ms: q(lat[arm], 0.99), meanMs: +(lat[arm].reduce((s, x) => s + x, 0) / K).toFixed(3), cpuUsPerCommit: +(cpu[arm] / K).toFixed(1), walBytesPerCommit: Math.round(wal[arm] / K) }));
console.log(JSON.stringify({ subjects: S, docBytesMean: Math.round(docBytes), docBytesPerFact: +(docBytes / 449).toFixed(1) }));
db.close(); for (const x of ["", "-wal", "-shm"]) rmSync(f + x, { force: true });
```

### B. jsonexact.mjs

```js
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const db = new D(":memory:");
db.exec("CREATE TABLE t(v)");
const ins = db.prepare("INSERT INTO t VALUES(?)");
const vals = [0.1, 1/3, 1e300, -0, 5e-324, 2**53, -(2**53), 9007199254740991, 123456789.123456789, 1.7976931348623157e308, 2.2250738585072014e-308, 0.30000000000000004, 1e21, 1e-7, "x\u0000y", "é\u{1F600}", "a\"b\\c\n"];
for (const v of vals) ins.run(v);
// random doubles
let bad = 0, n = 0; const ins2 = db.prepare("INSERT INTO t VALUES(?)");
const buf = new DataView(new ArrayBuffer(8));
for (let i = 0; i < 200000; i++) { for (let k = 0; k < 8; k++) buf.setUint8(k, Math.floor(Math.random() * 256)); const d = buf.getFloat64(0); if (!Number.isFinite(d)) continue; ins2.run(d); }
const rows = db.prepare("SELECT v FROM t").pluck().all();
const viaJson = JSON.parse(db.prepare("SELECT json_group_array(v) FROM t").pluck().get());
for (let i = 0; i < rows.length; i++) { n++; if (!Object.is(rows[i], viaJson[i])) { bad++; if (bad <= 8) console.log("mismatch", rows[i], viaJson[i]); } }
console.log(JSON.stringify({ sqlite: db.prepare("select sqlite_version()").pluck().get(), compared: n, mismatches: bad }));
```

### B. jsonexact2.mjs

```js
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require("/Users/sam/projects/triplex-db-2/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3");
const db = new D(":memory:"); db.exec("CREATE TABLE t(v)"); const ins = db.prepare("INSERT INTO t VALUES(?)");
const buf = new DataView(new ArrayBuffer(8)); const src = [-0, 5e-324, 2**53, 1.7976931348623157e308, 0.1, 1/3];
for (let i = 0; i < 200000; i++) { for (let k = 0; k < 8; k++) buf.setUint8(k, Math.floor(Math.random() * 256)); const d = buf.getFloat64(0); if (Number.isFinite(d)) src.push(d); }
for (const v of src) ins.run(v);
for (const fmt of ["%!.17g", "%.17g", "%!.20e"]) {
  const out = db.prepare(`SELECT printf('${fmt}', v) FROM t`).pluck().all(); let bad = 0; const ex = [];
  for (let i = 0; i < src.length; i++) if (!Object.is(Number(out[i]), src[i])) { bad++; if (ex.length < 3) ex.push([src[i], out[i]]); }
  console.log(JSON.stringify({ fmt, compared: src.length, mismatches: bad, examples: ex }));
}
```

