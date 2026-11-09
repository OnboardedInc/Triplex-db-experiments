# R40: the shortest path to P4 on lane Q (QLever 0.6.0 plus the broker)

Planner: R40 (Opus 5.5, high). Date: 2026-11-08. Status: complete. No engine, Docker command, agent or product edit was used.

**North star:** P4, a fast path to current values kept separate from history. Bars (lab/TARGETS.md section 1 and 1.1 P4): a subject
pull of 3 to 6 hops and 50 to 2,000 facts on the frozen weighted mix (50% 50 to 200 facts, 35% 201 to 800, 15% 801 to 2,000; hops 3,
4, 6 at 40/35/25%); single-client p50 at most 5 ms and p99 at most 25 ms, largest bucket p99 at most 50 ms; at least 1,100 pulls/s per
engine core; p99 and bytes read at history depth 10 at most 1.1x depth 1 on the matched 1,000-subject sample (Q16, Q27).

Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Facts about code and evidence come from the files
cited. Evidence labels: **[M]** measured (named receipt or raw file), **[S]** read in source (path:line), **[D]** derived by arithmetic
from [M] and [S] inputs shown, **[E]** estimate.

## 0. Answer

1. **The 270 ms is 7 HTTP requests, not the delta.** The public pull is a breadth-first search with one SPARQL request per level, so a
   depth-6 pull is 7 requests. Each request costs 31 to 37 ms wall [M]: about 4.5 ms of fixed host-to-VM transport [M], a 41 to 45 ms
   keep-alive stall on about a third of requests (expected 14 ms per request) [M], and about 12 to 18 ms of engine work plus decode [D].
   The engine work is a star join over 7 assertion predicates of the A0 encoding; each predicate column has one row per assertion ever
   written, history included [S][M]. All three costs are per request, so no QLever-side change that keeps 4 to 7 requests per pull reaches
   5 ms p50 from the host: transport alone is 18 to 32 ms [D].
2. **Paths and what each can reach.** (a) a compact `cur` graph in QLever: p50 about 35 to 80 ms from the host, 23 to 35 ms inside the VM;
   it meets only the flatness bar. (b) pulls served from the broker's SQLite H1 store: p50 about 1 to 2 ms, p99 about 8 to 20 ms; it meets
   latency and flatness, and per-core throughput is the one open risk (estimate 600 to 2,500 pulls per host CPU second against 1,100,
   depending on two small fixes). (c) a different A0 encoding: the best form, a pull bundle per root, is about 1.2 ms in the engine but
   about 6 ms from the host and 770 to 870 pulls/s per core, with up to 2,000 bundles rewritten per commit; not viable as the primary path.
3. **Take (b).** It is already the ruled design (Q68a: the first copy of the current structure lives in the broker; Q50a; Q68d: host-
   served reads count for P4 with route = host and broker plus kernel CPU in the per-core denominator). The code exists on
   `exp/SQL01-broker-sqlite` but is used only when the replica is unreachable. The shortest path is one default-off routing change plus
   two small worker fixes, measured first with no engine slot, then once on one 3.5 GiB QLever slot. Brief in section 3.2.
4. **What this means for lane Q, stated plainly (SCOPE 3.2).** Under (b), lane Q's P4 is met by the broker's SQLite store, the same store
   lane X can use. QLever's own current-pull floor stays at 23 to 35 ms p50 (R17, measured inside the VM). QLever then serves history,
   native SPARQL, list queries and analytics, and its publication can run asynchronously behind a watermark (TARGETS 4.1 item 6).

```
 caller (Triplex runtime, host process)
   |  pull(root, B)   B = {recordedPosition: P, validAt: V}
   v
 BrokerStorageAdapter.queryRows
   |-- today, online: one SPARQL request per hop -> QLever replica (A0 graph)
   |     4 to 7 requests x (4.5 ms transport + 14 ms expected stall + 12 to 18 ms engine and decode)
   |
   '-- proposed: h <= P <= W, no recordedAt, not history
         v
       SQLite reader worker (same process): live_rows (entity,id) + retired_rows (entity,rpos,id)
         one indexed IN (...) lookup per hop, no network; W = the durable marker written in the commit transaction
       otherwise -> recent_rows (complete source, exact) or the replica (history, analytics, native SPARQL)
```

## 1. Where the 270 ms goes

### 1.1 What one pull sends

| Step | What happens | Source |
| --- | --- | --- |
| Pull loop | Breadth-first over refs: one `T.entities(frontier, basis)` per level until the frontier is empty, so requests = depth + 1 | `lab/bench/lib/composition.ts:129-151` [S] |
| `T.entities` | Resolves the basis and calls `adapter.getByEntities` once | `packages/core/src/store/TriplesLive.ts:578-583` [S] |
| `getByEntities` | One `queryRows` call with `VALUES ?entity { ... }`, then one `rows.filter` per id | `packages/qlever/src/QleverStorageAdapter.ts:483-493` [S] |
| `queryRows` | One `SELECT ?row` request per call | `QleverStorageAdapter.ts:114-200` [S] |
| HTTP | `fetch` with its default keep-alive agent, `Accept: application/sparql-results+json`, one JSON parse of the whole body | `packages/qlever/src/QleverClient.ts:58-118` [S] |

The SPARQL of one level (A0 adapter, basis with a position and a valid time, not history), abridged from `QleverStorageAdapter.ts:128-170`:

```
SELECT ?row WHERE { GRAPH <scope> {
  ?subject f:_row ?row .
  VALUES ?entity { "e1" "e2" ... }  ?subject f:entity_id ?entity .
  ?subject f:recorded_position_order ?recordedOrder . FILTER(?recordedOrder <= "P")
  OPTIONAL { ?subject f:retracted_at_order ?retractedTime }
  OPTIONAL { ?subject f:retracted_position_order ?retractedOrder }
  FILTER(!BOUND(?retractedTime) || ?retractedOrder > "P")
  ?subject f:valid_from_order ?validFrom . OPTIONAL { ?subject f:valid_to_order ?validTo }
  FILTER(?validFrom <= "V" && (!BOUND(?validTo) || ?validTo > "V")) } }
```

Each level is one request that joins 7 predicates on the assertion subject: 4 required (`entity_id`, `_row`,
`recorded_position_order`, `valid_from_order`) and 3 OPTIONAL (`retracted_at_order`, `retracted_position_order`, `valid_to_order`),
with 3 FILTERs applied after the joins. It returns one `_row` JSON literal per visible assertion (about 540 bytes each, R2), which the
client decodes with `decodeRow` and sorts [S].

### 1.2 What each request scans

1. **Every predicate column holds one row per assertion ever written in the scope**, live, retracted and journal rows alike. In QG1's
   rebuilt base (11.6M triples) a predicate column has 441,123 rows, and a full PSO scan of one column took 4 ms [M:
   `evidence/CX-QG1/grid-U-attempt2/rebuilt.json`, runtime trees of the `join` and `predicate` probes]. A0 writes 27 to 30 triples per
   assertion (`rdf.ts:200-227`) [S].
2. **QLever reads only the blocks that hold join keys.** A join of a small column with an index scan goes through
   `IndexScan::lazyScanForJoinOfColumnWithScan` and `CompressedRelationReader::getBlocksForJoin`
   (`references/qlever/src/engine/IndexScan.cpp:550-570`, `src/index/CompressedRelation.h:745-779`) [S]. A block holds about 31,000 ids
   (`src/index/ConstantsIndexBuilding.h:95-102`, R35 1.1), so a 441k-row column is about 14 blocks, and a frontier whose assertions were
   written by many commands touches several of them per predicate [D]. Each touched block is decompressed and merged with its delta whole
   (R35 1.2) [S].
3. **History is in every scan.** Retracted rows are removed only by the FILTER after the join, so the rows and blocks read grow with
   retained history and journal rows (R24 4.1 says the same for both adapters) [S]. The broker's online route reads more: its replica
   query has no temporal filter and filters every row version in the kernel (`BrokerStorageAdapter.ts:251-300` on SQL01) [S].
4. **The delta adds on top.** QG1's cold-join slope was 23 to 99 ms per million delta changes; at zero delta the pull sample was still
   263 to 289 ms p99, so the delta is not the main cost at the measured sizes [M: QG1 REPORT phase 1 table].

### 1.3 The decomposition, from QG1's raw files

**Per pull, by requests.** The 120 pulls of the six low-delta cells (N0, N10000 and rebuilt, both arms, 20 pulls each) [M:
`grid-{M,U}-attempt2/{N0,N10000,rebuilt}-p4.json`]:

| Requests per pull (depth + 1) | Pulls | Mean ms | Min / max ms | Mean facts | ms per request |
| ---: | ---: | ---: | --- | ---: | ---: |
| 4 | 42 | 124.1 | 80.0 / 240.7 | 301 | 31.0 |
| 5 | 36 | 184.7 | 149.8 / 296.7 | 696 | 36.9 |
| 7 | 42 | 238.1 | 189.6 / 353.5 | 361 | 34.0 |

A least-squares fit over the same 120 pulls gives 36.7 ms per request plus 43.5 ms per 1,000 facts, intercept -33 ms, R² 0.76 [D]. Every
p99 in QG1's table is a depth-6 pull (subjects 38 and 1558, 7 requests) [M]. A 20-pull "p99" is the maximum of 20 observations.

**Per request, by component.** The grid's own probe requests record QLever's server-side time (`time.total`) next to the client wall
time (232 query requests, both arms, all cells) [M: `grid-{M,U}-attempt2/*.request.json` and `*.response`]:

| Component | Value | Basis |
| --- | --- | --- |
| Client wall minus server time, typical | 4.0 to 5.3 ms (p10 to p50) | [M] 65% of requests have a gap under 10 ms |
| Keep-alive stall | 41 to 45 ms extra (p75 44.9, p90 48.0) on 32% of requests | [M]; the same probe alternates, for example `base` cold 5.3 ms then warm 49.4 ms with server time 0 ms |
| Cause of the stall | QLever's HTTP server sets only `reuse_address` on the acceptor, never `TCP_NODELAY`, and writes a streamed chunked body; R17 measured keep-alive p50 41.8 ms against 0.37 ms with a new connection per request | `references/qlever/src/util/http/HttpServer.h:155-156, 527`, `src/util/http/streamable_body.h:98-123` [S]; R17 0.2 item 1 [M] |
| Fix status | Never applied: `QleverClient.ts` uses `fetch` with its default keep-alive agent | [S] |
| Engine and decode, remainder | about 12 to 18 ms per request | [D] 31 to 37 ms, minus 4.5 ms, minus 0.32 x 43 ms |

```
 one depth-6 pull (7 requests): typical 240 ms, p99 270 to 300 ms
 |-- 7 x 4.5 ms fixed host-to-VM transport .................  about 32 ms
 |-- 2 to 3 of the 7 requests hit the 41 to 45 ms stall .....  about 85 to 130 ms
 '-- 7 x 12 to 18 ms engine star join plus _row decode ......  about 85 to 125 ms
     (fact count adds about 44 ms per 1,000 facts across these)
```

**What this means for the paths.** Each component is paid per request. Fixing the stall (a connection per request, or a one-line engine
patch) removes about a third of the time and leaves about 16 to 23 ms per request, so a 4 to 7 request pull is about 65 to 160 ms [D].
Even with zero engine time, 4 to 7 requests from the host cost 18 to 32 ms of transport [D], above the 5 ms p50 bar.

## 2. The candidate paths

### 2.1 Summary

| | (a) compact `cur` graph in QLever, per generation (Q91c) | (b) broker H1 / SQLite host store, QLever for history and analytics | (c) a different A0 encoding |
| --- | --- | --- | --- |
| Weighted p50 | 35 to 80 ms from the host [E]; 23 to 35 ms inside the VM [M R17 4.2] | 1 to 2 ms [E from M] | bundle 1.6 to 6 ms [E from M]; per-hop forms 40 to 115 ms [E] |
| Weighted p99 | 60 to 100 ms inside the VM [M R17, frontier form] | 8 to 20 ms [E from M] | bundle 3 to 4 ms in the engine [M R17 4.5] plus the transport tail |
| Largest bucket p99 | over 100 ms [E] | 15 to 35 ms [E from M] | bundle not measured at 2,000 facts |
| Pulls/s per core | 32 to 45 [M R17] | 600 to 2,500 per host CPU second [E]; the open risk | bundle 770 to 870 [M R17] |
| Flat in history | yes within noise to 74M triples [M R17 4.4] | bytes read flat by construction at the current basis [S]; p99 1.18x in a loaded in-process run [M EXP-P4] | depends on the form |
| Writer cost | +10 to 12 triples per 10-fact command in the same update, or a 5 to 7 s rebuild per generation [M R17 1.4] | already paid inside SQL01's commit transaction; incremental cost not isolated [M SQL01] | bundle: rewrite every bundle that reaches the fact, 1 to 2,000 per commit [M R17 4.5] |
| Bars it can meet | flatness only | all five, if the per-core risk clears | none as the primary path |

### 2.2 (a) The compact `cur` graph in QLever

**What it is.** One triple per live fact under the entity (`<E> <cur:row> "compact json"` or `<E> <attr> value`) in a second graph,
either written in the same guarded update as the history triples (R24 4.2, arm Q1) or rebuilt as a frozen generation from the log
(Q91c, R35 5).

**Expected latency and its basis.**

1. R17 measured this structure at 100k placements (9.46M triples, current only): one `VALUES` request per hop gave p50 32 to 35 ms, p99
   60 to 97 ms, 32 to 35 pulls/s per core; the one-request path form gave p50 23 to 25 ms, 41 to 44 per core [M R17 4.2]. Each hop cost
   3.4 to 6.5 ms plus 0.4 to 0.5 ms per entity, with about 1,100 minor page faults per request on every index of 7M triples or more
   [M R17 4.3].
2. R17's clients ran inside the container with a new connection per request. From the host add about 4.5 ms per request [M QG1], so a
   per-hop pull is about 35 to 80 ms p50 [E].
3. **A frozen generation cannot serve the current basis alone.** A generation built at marker G serves B only when nothing the pull touches
   changed after G (TARGETS 4.1 item 4). The reconcile pull runs at the latest committed tx, which is almost always after G, so the tail
   from G to B has to be folded from the broker's `recent_rows` (lsn > G) or its overlay. That is a host-store read on every pull, on top
   of the QLever requests.
4. **Q68f bars personal-data literals from `cur`**, because QLever keeps deleted literals in its vocabulary until a full reindex (R17
   6.2). With keys and references only, every value comes from the encrypted host store anyway.

**Route equivalence (RQ01).** Eligible when `H <= B <= marker` with the marker read in the same request (R24 4.2); a T or TP basis refuses
(Q89b, R31 5.4) and routes to the complete source. Under Q91c a multi-request pull holds a generation lease so every hop sees one
generation, and Q89i byte identity is checked across swaps.

**Writer cost.** In the same update: about +2% triples per command and no new request, but every update still empties the whole result
cache and grows the shared delta (R17 0.2 item 2; R18). As a generation: nothing on the commit path, a 5.2 to 6.7 s rebuild of a
9.46M-triple index per generation [M R17 1.4], and a slot's memory during the build.

**Verdict.** It misses p50 by 5x to 16x and per-core throughput by 24x to 34x. Keep `cur` for what Q68a already gives it: list queries
(GS.18), native SPARQL over current data, lane completeness. Not on the P4 path.

### 2.3 (b) Current pulls from the broker's H1 store

**What exists.** On `exp/SQL01-broker-sqlite` (accepted default-off by V-SQL01, not yet merged, per lab/STATE.md) one SQLite transaction
writes the frame, claims, heads, `recent_rows`, `live_rows` (key entity, id), `retired_rows` (key entity, rpos, id) and the marker
(`sqlite-worker.ts:116-145`) [S]. Four read-only reader workers serve short transactions (SQL01 REPORT, Implementation). `pull` reads
`live_rows.pos <= b` plus `retired_rows.rpos > b AND pos <= b` for the selected entities, eligible when `h <= b <=` the durable marker
(`sqlite-worker.ts:154-160`) [S]. **Today this route is taken only when the replica is unreachable** (`BrokerStorageAdapter.ts:319-336`,
route Q4 in R31 2.1) [S]. Online pulls go to QLever.

**Expected latency and its basis.**

| Evidence | Numbers | Label |
| --- | --- | --- |
| EXP-P4 H1 (in-process table behind the same seam, XTDB lane, 10k subjects, loaded host, O-REPLAY 100,097 pulls, 0 wrong) | weighted p50 0.58 to 0.94 ms, p99 10.5 to 18.4 ms; largest bucket p50 2.6 to 4.7 ms, p99 15.7 to 27.5 ms; about 20,000 pulls per host CPU second; matched p99 depth 10 / depth 1 = 1.18x; logical bytes 1.046x | [M] `exp/P4-current-path` MEASUREMENTS.md |
| EXP-P4 H1 synthetic 100k (no oracle, no engine) | p50 0.05 ms, p99 1.9 to 2.3 ms; 3.85M live rows; RSS about 1.4 GiB | [M] receipts/h1-scale-100k.json |
| SQL01 reader workers, single-entity pinned pulls, 16 readers on 4 threads, writer every 20 ms | p50 0.284 ms, p99 3.155 ms, about 37,600 pulls/s, 0 violations in 150,568 | [M] SQL01 REPORT, reader versus writer diagnostic |
| SQL01 outage pulls at 10k and 30k commands | 1 ms each, exact | [M] |

A world pull through the SQLite workers costs one worker message plus one indexed `IN (...)` lookup per hop, plus per-row JSON work
[S]. Estimate: weighted p50 1 to 2 ms, p99 8 to 20 ms, largest bucket p99 15 to 35 ms [E]. At the upper end of the estimate every latency
bar has 1.4x or more margin except the weighted p99, which has about 1.25x.

**The per-core risk.** Q68d puts broker and kernel CPU in the denominator. The frozen mix averages about 450 facts per pull [D: 0.5 x 125
+ 0.35 x 500 + 0.15 x 1,400]. Per row, the SQLite path pays a B-tree read, a `JSON.parse` in the worker (`sqlite-worker.ts:147-153`), a
structured clone back to the main thread, the kernel `visible()` filter, and `getByEntities`' one `rows.filter` per id, which is
O(ids x rows) (`BrokerStorageAdapter.ts:710-718`) [S]. At 1 to 3 microseconds per row per step that is about 1.2 to 1.7 ms of CPU per
pull, 600 to 850 pulls per CPU second, under the bar [E]. Two small changes remove most of it: return each hop's rows as one JSON text
(`.pluck()` row strings joined once, parsed once on the main thread, so the clone becomes a string copy), and bucket rows by entity in one
pass. With both, the estimate is 0.4 to 0.8 ms per pull, 1,250 to 2,500 per CPU second [E]. The brief measures this first.

**Flatness.** At the current basis the pull reads `live_rows` by primary key and `retired_rows` with `rpos > b`, an empty index range when
b is the head [S]. The P4 history overlay corrects a fact by retracting it and asserting a replacement at the same valid time
(`lab/bench/driver.ts:570-605`) [S], so the live row count per entity does not change with depth: bytes read are flat by construction.
EXP-P4's in-process table read its retained retired rows and still showed logical bytes 1.046x; its p99 ratio of 1.18x at under 20 ms on a
loaded host is the kind of noise PAIR-0 exists for (Q60, Q69). Expired facts (`valid_to` passed) stay in `live_rows` until a valid-time
horizon retires them (Q68e); the 20% expired stage measures that growth path.

**Route equivalence (RQ01, Q89).**

| Shape (R31 legend) | H1 behavior | Required change |
| --- | --- | --- |
| L latest, P position, V valid time | Exact when `h <= b <= W`; W is the durable marker of the same SQLite transaction that holds the rows, so read-your-own-write needs no overlay | Register H1 as an online route in the RQ01 harness (`packages/testkit/src/offline-route-fixtures.ts:160`, `pendingRouteAdapters`, lists the SQL01 H1 driver as pending) |
| T, TP (names `recordedAt`) | Refuse; the adapter already bypasses H1 to `recent_rows`, which is exact (SQL01 F1, `BrokerStorageAdapter.ts:324-335`) | none until RT01 makes stamps monotone in position (Q90a, R31-a); then P* = min(P, last position stamped at or before T) |
| H history | Bypass to `recent_rows` | none |
| Future P | Wait up to the deadline (`awaitResolved`, `BrokerStorageAdapter.ts:276-283`), then typed refusal | none |
| `b < h`, or b beyond the marker | Worker returns `{ eligible: false, rows: [] }`, the fail-open shape of D-Q2 (`sqlite-worker.ts:157`) | Throw a typed `BasisNotAvailable` from the worker (Q89c, Q92h) |
| Repeat at a fixed basis (Q89i) | Immutable while `h <= b`: live rows at `pos <= b` and rows retired after b do not change | A purge that passes b between two hops makes the next hop refuse, and the adapter falls back to `recent_rows` (exact) |

GS.04b (the current index's feed cut for 60 s) does not apply: H1 is written in the commit transaction, not fed asynchronously (Q94f).
The QLever replica becomes the asynchronous layer; its reads keep the marker-in-request rule.

**Writer cost.** H1's upserts are already inside SQL01's commit transaction, so routing reads to it adds nothing to the commit path.
Known: SQL01 commit p50/p99 10.14/38.35 ms without readers and 8.63/40.05 ms with 16 readers (200 ten-fact commits, diagnostic) [M]; the
database was 80.5 MB at 10k ten-fact commands, about 800 B per fact, against 15.0 MB for the old segment log [M]. Row JSON is stored three
times (frame payload, `recent_rows`, `live_rows`), which matters for Q16's 2.0x disk allowance once the A0 control is re-frozen. The
incremental cost of the H1 tables is not isolated; R24 prediction 7 says at most 0.5 ms of ACK p50 [E]. A side benefit for P2: with the
current index synchronous on the host, QLever publication can batch larger groups behind its watermark (TARGETS 4.1 item 6), which cuts
the per-update O(delta) work R2 measured.

### 2.4 (c) A different A0 encoding

| Form | What changes | Expected | Basis | Why not |
| --- | --- | --- | --- | --- |
| J01 compact (default-off on main) | drops 9 never-read channels: 27 to 30 triples per fact become 18 to 21 | about 10 to 30% less engine time per request, same 4 to 7 requests | [S] `rdf.ts:200-243`; [E] | transport and request count unchanged: about 65 to 150 ms |
| Entity projection (`<E> <attr> value`, R2 layout P) | one triple per live fact, entity as subject | 3.4 to 6.5 ms per hop in the engine | [M R17 4.3] | still one request per hop; it is option (a) inside the main graph |
| One path query over refs | `<root> (p1|...|p9){0,4} ?x . ?x ?p ?o` in one request | p50 23 to 25 ms inside the VM | [M R17 4.2] | builds a 1M-row union per query; every update empties the cache that would hold it |
| Pull bundle per root | `<root> <pb:row> "x\tp\to"` for every fact in the root's reach, one scan | 1.2 ms p50, 2.7 to 3.9 ms p99 in the engine; 770 to 870 pulls/s per core; about 6 ms p50 from the host | [M R17 4.5]; [D] plus 4.5 ms transport | write amplification equals fan-in (a branch fact rewrites about 200 bundles, an org fact about 2,000); needs a reverse-reach index; Q68f bars the value literals; misses 1,100 per core by 1.3x |

Route equivalence for every (c) form is the same as (a): `H <= B <= marker` in one request, T and TP refused. Writer cost runs from a
saving (J01 compact writes fewer triples) to the bundle's fan-in rewrite, which on its own would break P2 for hub entities.

## 3. Recommendation and the first experiment

### 3.1 Which path

**Take (b).** It is the only path whose estimate meets the latency and flatness bars, it reuses code that has passed review default-off,
and Q68a, Q68d and Q50a already rule it the design. Its one open risk, per-core throughput, is cheap to measure without an engine. Drop
(a) and (c) as P4 paths; build `cur` later only if GS.18's list queries need it.

**Two items for the orchestrator** (proposed):

1. **A correction to the record.** QG1's "about 270 ms per pull" is a whole-pull number: about 35 ms per request times 7 requests, with
   the 40 ms keep-alive stall in about a third of them. Every QLever latency measured from the host through `QleverClient` carries that
   stall; R17 0.2 item 1 was never applied to the client.
2. **A ruling in the shape of Q92d.** At the 10k and 100k rungs lane Q measures P4 on the broker's host store (route = host, Q68d), with
   the receipt naming the replica's state (built generation, live, or detached) and Q91a's base and delta counts when attached. The
   engine-attached run uses the largest rung the slot holds (expected 1k to 4k subjects: QG1's 10M-triple cap held 3,950 A0 subjects).
   This states an engine limit plainly (SCOPE 3.2) and rules out no engine for any layer.

### 3.2 Brief: EXP-QH1, lane Q current pulls from the broker's H1

**North star:** P4 (weighted p50 at most 5 ms, p99 at most 25 ms, largest bucket p99 at most 50 ms, at least 1,100 pulls/s per core with
broker and kernel CPU in the denominator per Q68d, depth-10/depth-1 p99 and bytes at most 1.1x); P2 as a guard (commit p50 at most
10 ms, p99 at most 50 ms). Scope and targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 1.1 P4, 2.1, 4.1. Design: R24 sections 4
and 6, R31 sections 3 and 5, this report. Rulings: Q16, Q27, Q68a-g, Q89b, Q89c, Q89f, Q89i, Q91a, Q92h, Q94f.

**Commander's intent.** Serve lane Q's subject pulls at the current basis from the SQLite H1 store that SQL01 already writes in the commit
transaction, prove it answers exactly what every other route answers, and measure the five P4 numbers. Done means a P4 receipt per rung
with zero mismatches against O-REPLAY on at least 100,000 sampled pulls, the RQ01 gate passing with H1 registered, and the per-core
number known.

**Base.** A worktree from `exp/SQL01-broker-sqlite` (head `4863a8e0`) merged with main, or from main if the SQL01/P2Q integration round
merges first. Default-off option; A0 and the existing broker routes unchanged.

**Product changes (packages/qlever/src/broker only, behind `currentRoute: "h1"`, default off).**

1. `BrokerStorageAdapter.queryRows`: when the read is not history, names no `recordedAt`, has an entity selection and `h <= b <=` the
   durable marker, read `broker.pullAt(b, selection)` first and report route `h1` in `onRead`; otherwise keep today's routes. Inside a
   transaction keep today's behavior.
2. `sqlite-worker.ts` `pull`: throw a typed refusal instead of returning `{ eligible: false, rows: [] }` (Q89c, Q92h, D-Q2); return the
   rows as one JSON text built from `.pluck()` row strings, parsed once on the main thread.
3. `getByEntities` in the broker adapter: bucket rows by `entity_id` in one pass instead of one `rows.filter` per id.
4. Counters per pull: hops, rows read from `live_rows` and from `retired_rows`, row bytes examined (EXP-P4's logical bytes measure).

**Harness changes (lab only).**

1. Composition `broker-h1` in `lab/bench/lib/composition.ts`: the public Triples service on the broker path with `currentRoute: "h1"`,
   `assignments.current = host`, route recorded per read.
2. CPU accounting: main-thread CPU from `process.cpuUsage()` plus each reader worker's thread CPU (reported by the worker itself), so
   pulls per host CPU second counts thread CPU, not wall time.
3. Reuse EXP-P4's driver (`exp/P4-current-path`, `lab/experiments/EXP-P4-current-path/p4.ts`): the weighted mix, per-bucket and per-hop
   tables, matched 1,000-subject history growth to depth 3 and 10, the 20% expired stage, O-REPLAY gating before timing.
4. RQ01: implement the SQL01 H1 route driver that `pendingRouteAdapters` documents, with forcing (H1 on, replica on, outage), purge and
   catch-up events, and typed-refusal declarations.

**Gates, in order (a failed gate stops the round).**

| # | Gate | Pass |
| --- | --- | --- |
| G1 | Package suite (SQL01's 73 offline and 23 semantic tests), typecheck, build | all pass on the merged base and on the candidate |
| G2 | RQ01 with the H1 driver: L, V, P, T, TP, H, future P; purge and catch-up; Q89i repeats | zero differences; T, TP and `b < h` refuse typed; future P waits, then refuses |
| G3 | Offline mutants (EXP-P4 pattern): H1 drops retractions; H1 serves after a purge past b | both rejected by O-REPLAY, both exit nonzero, no timing emitted for the rejected stage |
| G4 | O-REPLAY on at least 100,000 sampled pulls per rung at the 80/15/5 basis mix, route recorded per read | zero mismatches; no H1 answer for an ineligible basis |
| G5 | Per-core screen at 10k, replica detached (outage mode, Q31e), single client, then closed loop up to 4 clients | at least 1,100 pulls per host CPU second on the weighted mix; if it misses, add one worker op that runs the whole BFS in one read transaction (arm H1w) and repeat G4 and G5 for it |
| G6 | P4 numbers at 10k and 100k, replica detached, fixed writer trace (TARGETS 2.1) through the broker | the five P4 bars, per bucket and per hop class, screening profile (Q16) |
| G7 | Writer guard: matched 10-fact commits with the H1 table writes on and off (test-only switch), same trace | commit p50 delta at most 0.5 ms and p99 within 1.1x (R24 prediction 7); bytes per fact recorded |
| G8 | Engine-attached run on one exclusive QLever slot (slot plan item 2) | the G6 bars hold with live publication; the receipt carries Q91a base and delta counts and the fallback share |

**Predictions (each can fail).**

| # | Prediction | Falsified if |
| --- | --- | --- |
| 1 | H1 weighted p50 1 to 2 ms, p99 8 to 20 ms at 10k and 100k; largest bucket p99 15 to 35 ms | weighted p50 above 5 ms or p99 above 25 ms |
| 2 | Before product changes 2 and 3, 600 to 850 pulls per host CPU second; after them, 1,250 to 2,500 | after the changes, under 1,100 |
| 3 | Rows and bytes examined at depth 10 within 1.02x of depth 1 at the current basis | above 1.05x |
| 4 | Zero mismatches in G4; every T and TP pull routes to `recent_rows` | any mismatch, or any H1 answer for a basis naming `recordedAt` |
| 5 | Fallback share at the 80/15/5 mix under 2% with a one-hour horizon (R24 prediction 8) | above 5% |
| 6 | With QLever attached, H1 p99 rises at most 1.2x over the detached run, because publication shares host CPU | above 1.5x |

**Slot plan (one 3.5 GiB exclusive QLever slot at a time; no other engine needed).**

1. **G1 to G7 need no engine slot.** The broker runs with its replica unreachable, which SQL01 supports (commits continue, Q31e), so the
   receipt names the replica's state as "detached". Host only, under `lab/bin/heavy.mjs`. Disk at about 800 B per fact: about 0.3 GB at
   10k subjects and about 3 GB at 100k (3.85M facts) [D from SQL01], against 14 GiB free on the host today and the 5 GiB floor; delete the
   100k database after its receipt is written.
2. **G8 takes `qlever-s1` once, exclusive, 3.5 GiB and 2 CPUs,** through `lab/bin/engine.mjs` with QG1's `--qlever-memory 1000M` and a
   built base (Q91a). Seed through the broker into the live replica at the largest rung that keeps the delta bounded (about 1k subjects,
   about 2.5M A0 triples; `cmd=rebuild-index` at 750k delta during the seed, per R8 and QG1 phase 0), then run G6's mix with the writer
   trace publishing. On the same base, run QG1's A0 pull sample twice, once with today's client and once with a connection per request,
   recording QLever's `time` per request, to confirm the section 1.3 decomposition. Expected slot time about 60 to 90 minutes including
   seed and rebuilds [E]. Queue it in the scale window after the slot runs already queued in lab/STATE.md.
3. Never touch `/Users/sam/projects/triplex-db`, ports 15442 and 17019, or the shared residents; Docker only through `engine.mjs` on the
   triplex2 socket.

**Out of scope for this round.** The `cur` graph, bundles, a valid-time horizon policy beyond measuring the 20% expired stage, T-shaped
H1 reads (wait for RT01 and Q90a), erasure of H1 rows (ER01-Q), PAIR-0 acceptance runs (a later round reruns G6 under PAIR-0 before any
bar closes), and the 256-reader P1 ladder.

**Roles (PROTOCOL 1).** Codex builder at medium in its own worktree; Codex reviewer at high on a separate worktree, briefed to check that
each documented check rejects the inputs it should (PROTOCOL 6 wording); the orchestrator merges.

## 4. Open questions

1. **Where acceptance runs.** Q86a places candidate processes in containers in the VM. H1 is in-process, so its latency should not depend
   on that move; the QLever-served fallback and native routes will (R17's in-container numbers are about 4 ms per request lower than the
   host's). The G8 receipt should state the topology.
2. **The `cur` graph's future.** If GS.18's list queries can be served from H1 plus SQLite indexes on attribute, lane Q may never need
   `cur`. Decide after GS.18 has a measurement.
3. **The keep-alive fix.** A connection per request from the host costs a TCP handshake through colima's forwarder; the engine patch
   (`TCP_NODELAY` on accepted sockets) costs a custom image. Measure the first in G8 before deciding. It matters for every QLever route,
   including publication and native queries, not only P4.
4. **Disk allowance.** Three copies of each row JSON in `broker.db` (about 800 B per fact) should be compared with the A0 control once
   Q16's allowances are re-frozen; folding `recent_rows` and `live_rows` into one table with a live flag is the obvious saving if needed.

## 5. Sources

- Goals and targets: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (sections 1, 1.1 P4, 2.1, 4.1), lab/PROTOCOL.md.
- Rulings: lab/acceptance/RULINGS.md Q16, Q27, Q50a, Q58c, Q68a-g; lab/acceptance/RULINGS-PENDING.md Q89a-i, Q90a-g, Q91a-d, Q92a-k,
  Q94f.
- EXP-QG1: lab/experiments/EXP-QG1-qlever-generations/REPORT.md, p4-sample.ts, grid.mjs; raw files under
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/grid-{M,U}-attempt2/ (`*-p4.json`, `*.request.json`, `*.response`, cell JSON).
- Code on main: lab/bench/lib/composition.ts, lab/bench/lib/triplex.ts, lab/bench/driver.ts, packages/core/src/store/TriplesLive.ts,
  packages/qlever/src/QleverStorageAdapter.ts, QleverClient.ts, rdf.ts, packages/testkit/src/offline-route-fixtures.ts.
- Branch `exp/SQL01-broker-sqlite` (4863a8e0): packages/qlever/src/broker/sqlite-worker.ts, BrokerStorageAdapter.ts, sparql.ts,
  broker.ts; lab/experiments/EXP-SQL01/REPORT.md and REPORT-round2.md.
- Branch `exp/P4-current-path` (6f061a8d): lab/experiments/EXP-P4-current-path/REPORT.md, MEASUREMENTS.md.
- QLever v0.6.0 (6c5861a): src/util/http/HttpServer.h, src/util/http/streamable_body.h, src/engine/IndexScan.cpp,
  src/index/CompressedRelation.h, src/index/ConstantsIndexBuilding.h.
- Research: R2, R17, R24, R31, R35 in lab/research/.
