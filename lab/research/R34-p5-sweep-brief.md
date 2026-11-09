# R34: EXP-P5 brief, the release activation sweep on all three lanes

**Written:** 2026-11-09 (UTC) by R34 (planner, Opus 5.5, high), under `lab/PROTOCOL.md`. Source and design reading only: no engine,
container, Docker command or test was run, and no product code was edited. Every number marked `[E]` is my estimate; `[P]` is a
measurement already in the lab; `[S]` is read in source at the path given.

**North star: P5.** Sweep 100k subjects, pulling each at one pinned basis, while the fixed writer trace and 64 live readers run.
Bars (`lab/TARGETS.md` section 1 row P5 and section 1.1 P5 items 1 to 5): sweep wall time at most 100 s from basis capture to the
last publication (about 1,100 pulls/s/core on one core); live read p99 and writer commit p99 each at most 1.5x their no-sweep
values; the long snapshot never blocks writers or unrelated compaction. Moves P1 through the live readers.

**Goals and targets come only from** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Rulings used: Q84 (broker SQLite file),
Q88 (lane D storage), Q89 (route equivalence; especially Q89b and Q89i), Q90 (record time at decision), in
`lab/acceptance/RULINGS-PENDING.md`. Inherited homebase files were not used.

**Code read (heads):** main `d03187c1`; `exp/SQL01-broker-sqlite` `4863a8e0`; `exp/P4-current-path` `6f061a8d`;
`exp/DA01-datomic-adapter` `6f70eb46`; `verify/RQ01` `ae6b8020`. Main has: the N01 driver with a fetch-only sweep phase
(`lab/bench/driver.ts:609-645`), the fail-closed P5 seams (`lab/bench/lib/evaluate.ts`), the W0 kernel with `sweepSubject`
(`packages/w0/src/index.ts:73`), the W0 population generator (`packages/w0/src/population.ts`), O-DOMAIN with the population
fingerprint (`lab/oracles/domain/cli.py --population`), O-REPLAY, and the X05 follower harness (the follower itself was killed on
reliability).

---

## 0. Answer

1. **One rule for every lane: the sweep reads page by page at an explicit position, and nothing spans pages.** The basis is
   `B = {recordedPosition: P_act, validAt: V_act}`, where `P_act` is the position the driver recorded from the activation commit's
   receipt and `V_act` is the run's deterministic clock at activation, anchored at W0's population valid time `V_W0` (section 1.4).
   No `recordedAt` is named. Each page of 64 subjects is one read unit: one SQLite
   read transaction, one set of XTDB statements, or one Datomic `as-of` db value taken fresh from the latest db. A pin exists only
   where a store purges rows by position (the broker's H1 tables), and there it is a retention pin with a lease, never an open read
   transaction.
2. **Why position and not record time.** Q89b makes every store that retires rows by position (H1, Datomic `:f/live`, R24's current
   store) refuse a basis that names a record time, so a `recordedAt` sweep would fall to the slow source route. Until Q90 round 2,
   a `recordedAt` cut is also not a log prefix (R31 D-C1), so it is not reproducible. A position is a log prefix on every lane today
   and every route marked E for P in R31 3.1 answers it exactly. The public `TemporalBasis` has no position (Q89g is Sam's), so the
   sweep reads through the adapter's internal `ResolvedTemporalBasis.recordedPosition`, which pagination already uses.
3. **Per lane:**

   | Lane | Sweep route | Pin | Expected at 100k |
   | --- | --- | --- | --- |
   | Q: QLever + broker SQLite store | host-store sweep (R24 S3): sweep worker threads with their own readonly connections read H1 (`live_rows`, `retired_rows`) at P, decode to W0 facts and run the kernel in the worker | `pinBasis(P)` holds the purge horizon at or below P, with a lease | 15 to 45 s with 4 workers `[E]`; the only design with margin |
   | Q native, later: a frozen QLever generation (R35 T2, Q91c) | one SPARQL request per page on an index built from the log up to at least P, under a generation lease | none: a built generation receives no updates | needs EXP-QG1 phase 2 and the compact encoding (section 2.1 item 7) |
   | X: XTDB 2.2.0 behind the broker (P2B) | the same host-store sweep as lane Q; XTDB is the replica and is not read | same | same as Q |
   | X: XTDB 2.2.0 native (A0, on main) | one `getByEntities` per BFS hop per page at P on the engine | none: XTDB keeps every Triplex row version, so any later snapshot answers P | misses by 10x or more `[E]`; a 1k baseline only |
   | D: Datomic Pro on Postgres (Q88b) | a gateway `sweepPage` endpoint: per page, `(d/as-of (d/db conn) t_P)`, subjects enumerated through `:f/live`; kernel in TypeScript sweep workers | none: a fresh as-of value per page never needs segments that `gc-storage` can delete | unknown; R29 has no number |

4. **Lane X starts first (native arm, from main), and builds the lane-neutral harness.** Everything its sweep needs is on main: the
   A0 adapter read at an explicit position, exclusive XTDB slots, the N01 sweep phase, the W0 kernel, O-DOMAIN and O-REPLAY. The
   harness parts every lane needs (W0 population seeder, W0 world reader, kernel and outbox seams, fingerprint gate, round design and
   receipts) are built there first, offline against the in-process `memory` composition, then live at the 1k rung. Lane Q follows as
   soon as P2Q and SQL01 merge (SQL01 is accepted default-off and waits only for P2Q); it is the lane most likely to meet the bars.
   Lane D needs DA00, DA01 round 3 (Q89d) and DA04 (Postgres), none of which is on main.
5. **The data volume is fixed by W0 and is the main risk.** W0's 100k population is 44,537,987 facts at `basis.tx` 4,338,757
   (SPEC 12.6 and 12.7; O-DOMAIN, the W0 author and the kernel agree), about 445 facts per subject, 11x R24's 3.9M estimate. In the
   A0 encodings that is about 2.85 billion QLever quads and about 130 GB of XTDB source log `[E]`, so no engine's A0 encoding holds
   it inside our slot disks; the broker's SQLite file holds it in about 4 to 5 GB `[E]`. Every receipt binds the population
   fingerprint and the store's own counts, and every run uses a freshly seeded exclusive store, never a dev resident.
6. **Correctness gates:** a fingerprint sweep at the population basis must reproduce W0's pinned worlds digest and R2 output digest;
   every activation-sweep world and output must equal the independent expectation (O-DOMAIN for untouched subjects, O-REPLAY for
   subjects written at or before B); post-capture mutations must not show; coverage exactly once; the route-equivalence harness
   (EXP-RQ01) runs on the sweep route with the P shape answered and the T and TP shapes refused typed.
7. **First experiments:** lane X native at 1k (harness proof plus the engine baseline); lane Q host store at 10k, then 100k;
   lane D at 1k then 10k on the DA04 slot. 100k runs only after the 10k receipts show the per-lane bytes per fact.

---

## 1. What the sweep is

### 1.1 Frozen semantics (from TARGETS 1.1 P5 and W0)

| Item | Value | Source |
| --- | --- | --- |
| Population | W0 SPEC 12.3, seed `W0-pop-1`, 100k rung: N 100,000 placements, L 2,000 locations, K 100 jurisdictions | `lab/world/W0/SPEC.md` 12.3 |
| Population basis | `basis.tx` 4,338,757 (reference positions, dense from 1), `validTime` 2026-11-04T12:00:00.000000Z | SPEC 12.3, 12.7 |
| Facts read by a 100k sweep | 44,537,987 (445.4 per placement on average; buckets 124 / 499.5 / 1,399.5 facts) | SPEC 12.6; O-DOMAIN receipt `population-100k.json` |
| Pinned digests at 100k | worlds `sha256:fec1d7ce...c760`; R1 `c1b2d410...1a79`; R2 `551bbbc4...b562`; R3 `a5950922...ee2f` | SPEC 12.7 item 2 |
| Floors | R2 changes 62.293% of subjects; lowest rule 7.810%; largest location 1,100; 3+ work items 1.567% (R1) and 2.459% (R2) | O-DOMAIN README |
| Smaller rungs | any N divisible by 50; 10k: L 200, K 12, about 434k positions and 4.45M facts `[E]`; 1k: L 20, K 4, about 43k positions and 445k facts `[E]`. O-DOMAIN computes the exact fingerprint (`--population --rung 10000`) | `lab/oracles/domain/population.py:544-550` |
| Kernel cost | 158 µs mean per subject per release on typed facts (p50 85 µs, p99 1.04 ms); 508 µs from JSON bytes | EXP-D01b REPORT `[P]` |
| Activated sweep | `reconcile` after the activation fact exists; at one basis it gives the same bytes as a preview `evaluate` | SPEC section 1, cases C20 and C31 |
| Publication | evaluation records to the outbox; `publish(state, evaluations)` is the expected outbox | SPEC 8.8 |

### 1.2 The pipeline

```
 activation command (release R2 for the tenant)  --ACK-->  driver records P_act from the receipt (never from an engine echo)
                                                                  |
                                                                  v
   B = { recordedPosition: P_act, validAt: V_act }  coverage list = in-scope subjects, sorted; listSha256 in the receipt
                                                                  |
              +---------------------------------------------------+----------------------------------------+
              | pin (only where a store purges by position): pinBasis(P_act, "sweep:<id>", lease 300 s)    |
              +---------------------------------------------------+----------------------------------------+
                                                                  |
          cursor (sweepId, P_act, last page index) persisted after each published page; crash resumes there
                                                                  |
         +-------------------------+-------------------------+-------------------------+
         v                         v                         v                         v
   SWEEP WORKER 1            SWEEP WORKER 2             ...                    SWEEP WORKER W
   page of 64 subjects:      one read unit at B:        - SQLite: BEGIN; marker; h <= P <= lsn; BFS; COMMIT
                             rows -> W0 facts {e,a,v,tx} - XTDB: one getByEntities per hop at P
                             sweepSubject/reconcile      - Datomic: one sweepPage request, one as-of db value
                             -> result records (1-3 KB each), ArrayBuffer transfer
         +-------------------------+-------------------------+-------------------------+
                                                                  |
                                                                  v
                     publisher: frames of 64 evaluation records through the lane's atomic outbox path,
                     gated by the admission controller (live commits first; R24 5.2 items 3 and 5)
```

1. **The world reader needs positions.** W0 facts carry `tx`, the commit position of the asserting transaction (SPEC 4.2 item 2),
   and `PulledTriple` in `lab/bench/lib/composition.ts:64-71` has no position. The world reader therefore reads adapter rows
   (`TripleRow` with `recorded_position`) and maps them to `{e, a, v, tx}`. Under Q89i it never copies retraction fields: a row
   retracted after P is returned as visible with no trace of the later retraction.
2. **W0 positions equal Triplex positions only if the population is the scope's first commands, one transact per W0 command, in
   reference order** (SPEC 12.3 "Reference positions"; Q40f). The seeder must guarantee this on a fresh scope; the fingerprint gate
   (section 5, G0) proves it.
3. **Exactly once.** The cursor assigns each page once; a resumed sweep restarts at the first unpublished page; publication is keyed
   by `(sweepId, subject)`, so a replayed page is a counted retry, never a second visible delivery.

### 1.3 The basis shape and the activation

| Shape (R31 section 1) | Use in EXP-P5 | Why |
| --- | --- | --- |
| P: `{recordedPosition, validAt}` | **the sweep basis** | a log prefix on every lane today; answered exactly by H1 (when `h <= P`), XTDB A0 SQL, Datomic `as-of` with the row filter (R31 3.1) |
| T: `{recordedAt, validAt}` | never, until Q90 round 2 lifts Q89b per store with RQ01 evidence | refused by position-retired stores (Q89b); not reproducible before Q90 (D-C1) |
| TP | never | same |
| L (latest) | live readers only (80% of the live mix, named exactly by position) | the sweep must not resolve "latest" in any worker |

1. **Every worker uses the same explicit P.** No worker reads "the latest position", so workers that start at different instants
   still agree (R24 5.2 item 1).
2. **Activation.** The activation fact is the first command after the population, at position `basis.tx + 1`. It is in no
   placement's world (it is a tenant fact read by `resolveRelease`), so the worlds at `P_act` equal the population worlds. The
   driver's own `runSweep` today captures `{recordedAt: last.instant, validAt: now}` (`driver.ts:611`); EXP-P5 replaces that with
   the P shape and `V_act` (section 1.4).
3. **Future P is refused, typed.** P is always an acknowledged position, but every sweep route still checks P against the committed
   position read in the same read unit and throws `BasisNotAvailable` when P is beyond it (Q89c; R31 D-X1, D-D3).


### 1.4 Valid time: a deterministic clock anchored at the population's valid time

1. **The wall clock would change the answers.** W0's outputs depend on `validTime` (due times, document expiry), and the population's
   scheduled raise is valid from 2026-11-16 (SPEC 12.3, Q40i). A run whose valid time comes from the wall clock would read the raise
   into every affected world from 2026-11-16 on, and its digests would stop matching the fingerprint.
2. **So the run's runtime is deterministic** (`deterministic.startTime`, `packages/core/src/runtime/Runtime.ts:78`; R33 4.1), anchored
   at `V_W0` = 2026-11-04T12:00:00Z minus the seed's duration and advancing with trace time. G0 reads at exactly `V_W0`. Each round's
   sweep reads at `V_act(k)`, the runtime clock at that round's activation; the activation's `from` is at or before `V_act(k)`.
3. **Post-capture mutations must be visible by valid time,** or G3 tests nothing: a mutation valid only after `V_act(k)` is hidden by
   the valid-time filter whether or not the position cut works. Mutations are therefore retroactive corrections with `validFrom` at
   or before `V_act(k)` (the TARGETS 2 correction shape), so only the position cut can hide them.
4. **Trace writes before `P_act(k)`** are valid from the runtime clock at their commit, so they are in the round's worlds; G1 takes
   their expectation from O-REPLAY.
---

## 2. Per lane: how the sweep reads at one pinned basis without a long read transaction

### 2.1 Lane Q: QLever 0.6.0 plus the broker's SQLite store (P2Q, SQL01, Q84)

**Route: the host-store sweep (R24 arm S3) on H1 in `broker.db`. QLever is not read by the sweep.**

| Step | What happens | Evidence |
| --- | --- | --- |
| Pin | `pinBasis(P_act, "sweep:<id>")` before the first page. The purge never removes a row retracted after the lowest pinned basis; rows retracted at or before P are invisible at P, so the purge of those continues. EXP-P5 adds a lease (owner heartbeat; the pin expires at a deadline the sweep renews, so a crashed sweep cannot hold H forever) and a refusal for a new pin more than a set distance below head (R24 open question 1, R25 open question 4) | SQL01 `log.ts:445-459` has the pin without a lease `[S]`; Q84c |
| Page | one read transaction per 64-subject page on a **sweep** reader thread: `BEGIN; SELECT lsn, epoch, h FROM marker`; refuse typed unless `h <= P <= lsn`; BFS over the page's subjects hop by hop inside that one transaction: `live_rows` with `pos <= P` plus `retired_rows` with `pos <= P AND rpos > P`; `COMMIT` | R25 7.4; Q84c; split layout R25 6.2 |
| Decode and evaluate | in the same worker thread: rows to W0 facts `{e, a, v, tx}` (typed, never through JSON text when the row allows it), then `sweepSubject` (preview) or `reconcile` (activation); only result records leave the thread, as transferred `ArrayBuffer`s | R24 5.2 items 4 and 6; R24 5.1 (5) on `postMessage` cost |
| Publish | the broker writer applies sweep frames of 64 evaluation records through the outbox in the same log, below live command groups | TARGETS 3 "records in the same log frame"; R24 5.2 item 5 |
| Admission | the queue-delay controller of R24 5.2 item 3 sets in-flight pages; it reads live queue delay and the two p99 ratios | R24 5.2 |

1. **No long transaction.** R25 measured a 20,000-subject pinned sweep of 151-fact worlds with no page transaction above 9 ms
   (2.09 s total, 0 digest mismatches) `[P]`. W0 worlds average 445 facts, so a page transaction should take about 20 to 30 ms
   `[E]`. A 30 s transaction grew the WAL to 504 MB and a waiting RESTART blocked the writer 5.3 s (R25 finding 6) `[P]`: that is
   what this design avoids. EXP-P5 pre-registers a bar of at most 100 ms per sweep read transaction.
2. **Checkpoints and the gate never wait on the sweep,** because the checkpointer thread's PASSIVE runs every 4 s and the 64 MiB gate
   parks readers between transactions (Q84b). The only "related compaction" the sweep holds back is the purge of rows retracted after
   P; the purge of everything else and every checkpoint is "unrelated compaction" and must proceed (section 5, G8).
3. **Sweep threads are not the live reader pool.** SQL01's `sweepPage` today runs a one-hop pull through the same four reader threads
   live pulls use (`log.ts:412-415`) `[S]`, so a sweep would queue live reads behind its pages. EXP-P5 adds W dedicated sweep threads
   (W = 1, 2, 4), each with its own readonly connection, and keeps the four live reader threads for live traffic (R25 7.6 allows extra
   reader threads under the controller).
4. **Two defects to fix before use.** `sweepPage` returns `eligible: false, rows: []` for an ineligible basis (R31 D-Q2, fail-open);
   it must throw a typed `BasisNotAvailable` (Q89c, HE-6). H1's pull predicate must refuse any basis that names T (Q89b, already the
   SQL01 fix `7c65e2fc` for pulls; EXP-P5 checks the sweep path too).
5. **Q89i.** A row in `retired_rows` with `rpos > P` is returned at P with no retraction fields, so a page read at P before and after
   later retractions gives the same bytes. The route-equivalence check HE-5 proves it on the sweep route (section 5, G6).
6. **The QLever replica's role.** In P2Q the replica is fed from the broker log and serves pulls; the sweep does not touch it. At the
   1k rung the replica can hold the population (about 28.5M quads in the A0 encoding `[E]`, inside R17's 74M-triple measurements) and
   applies the live trace. At 10k and 100k the A0 encoding does not fit a 3.5 GiB slot (about 285M and 2.85 billion quads `[E]`;
   N01's 10k seed measured 64 quads per fact, `runs/qlever-seed/ns-v2-10k/manifest.json` `[P]`). Proposed ruling R34-d: at those
   rungs the replica is either a compact current graph (R24 arm Q1, one triple per fact, about 44.5M triples at 100k) bulk-indexed at
   seed time, or detached (the GS.04b outage mode: commits, ACKs and H1 pulls continue), and the receipt names which. Either way the
   measured sweep mechanism is the same. Any QLever server in a P5 receipt is built per Q91a: data mostly in a built base index, the
   delta bounded by a declared threshold, and base and delta triple counts recorded.
7. **The QLever-native arm: a frozen generation (R35 T2, Q91c).** A blue/green generation is a QLever index built from the broker
   log up to `appliedLsn`; with no updates applied it is an immutable snapshot, so a sweep reading it at P (when `appliedLsn >= P` and
   the generation is eligible per TARGETS 4.1) needs no pin and no long transaction: each page is one SPARQL request, and a generation
   lease keeps every page on one generation (R35 5.2 item 4). This is R17 section 5's "P5 sweep on a frozen generation". It is built in
   EXP-QG1 phase 2, not here, and at W0 volume it needs the compact `cur` encoding (44.5M triples at 100k); in the A0 encoding a 100k
   generation would be about 2.85 billion quads and a 30 to 45 minute build is already quoted at 820M triples (R35 section 5). EXP-P5
   adds it as arm S2-Q once EXP-QG1 phase 2 passes, with the same pages, kernel and gates as S3.

### 2.2 Lane X: XTDB 2.2.0

Two arms. The second is lane X's real path to the bars; the first is what can run from main today.

**X-native (A0 on main): per-page statements at an explicit position on the engine.**

| Step | What happens | Evidence |
| --- | --- | --- |
| Pin | none. A0 never deletes Triplex rows: a retraction sets `retracted_position` on the row (`XtdbStorageAdapter.ts:541`) and XTDB keeps the earlier system-time version, so every later XTDB snapshot still holds every row visible at P, and the row filter at P answers it exactly (R31 3.1, X1 "E" for P) | `[S]` |
| Page | BFS over the page's 64 subjects: one `adapter.getByEntities(frontier, {recordedPosition: P, validAt: V_act})` per hop (3 to 6 hops), each one statement and its own snapshot; nothing is held between statements | `TriplesLive.ts:578-583`, `Temporal.ts:18-23` `[S]` |
| Future P | A0 `queryRows` answers a P beyond head with no check (R31 3.1, X1 row); the sweep route compares P with `MAX(position)` read in the same statement and refuses typed | Q89c |
| Compaction | XTDB compacts and garbage-collects superseded files after `garbageLifetime` (24 h); a statement holds its files only while it runs, so compaction and block flush run during the sweep | R24 5.1 (1); R16 5.1 `[P]` |
| Dedicated replica | none available: X05's follower died 9 times in 30 minutes (unlocked Local-log tail read) and was killed on reliability, so the sweep shares the node with live readers and the indexer | `lab/experiments/EXP-X05-xtdb-read-follower/REPORT.md` `[P]` |

1. **Expected cost.** EXP-P4 measured A0 single-subject pulls at 627 ms p50 on the 10k N01 world `[P]`. A 64-subject page is 3 to 6
   statements over larger frontiers; at 0.5 to 2 s per page and 4 workers, 100k subjects (1,563 pages) would take 200 to 800 s on
   one node `[E]`, before the node also serves 64 live readers. X-native is a baseline, not a candidate for the wall bar.
2. **Data volume caps it at 1k.** A0 writes about 30 KB of source log per 10-fact command (J01: 30,061 bytes) `[P]`, and the W0
   population averages about 10.3 facts per command, so the source log is about 1.3 GB at 1k, 13 GB at 10k and 130 GB at 100k `[E]`.
   The s1 to s3 disk forecast is 8 GiB (`lab/config/slots.json`). X-native therefore runs at 1k only.

**X-broker (EXP-P2B, Q51b, not built): XTDB as the replica behind the broker.** The sweep is lane Q's host-store sweep, unchanged;
XTDB is not read. P2B removes the journal from XTDB rows (the journal is the broker frame), but the replica still needs about one row
per fact: about 44.5M rows at 100k, roughly 8 GB live and up to about 20 GB with compaction overhead `[E from R24 6]`. As for lane Q,
the 100k receipt names the replica's state (seeded, compact, or detached). Lane X's P5 number at 10k and 100k comes from this arm.

### 2.3 Lane D: Datomic Pro 1.0.7745 on PostgreSQL SQL storage (Q88a, Q88b)

**Route: a gateway sweep endpoint that answers one page per request from one fresh `as-of` db value.**

| Step | What happens | Evidence |
| --- | --- | --- |
| Basis | `t_P` from the position-to-t map by an O(log n) seek (`d/index-range` on `:triplex.tx/position`), not a full rebuild per commit; refuse typed when P is beyond the scope head | R31 D-D4, D-D3; Q89d (DA01 round 3) |
| Page | `POST /v1/db/{db}/sweepPage {position, validAt, subjects[<= 64]}`: `db = (d/as-of (d/db conn) t_P)` taken fresh for this request; each subject's facts enumerated through `:f/live` in that value (`(d/datoms db :avet :f/live subject)`), BFS over refs inside the same value, the Triplex row filter at P, compact rows `{e, a, v, tx}` back | R31 3.3 items 3 to 5; Q89e |
| Why `:f/live` is exact here | in `as-of t_P` the `:f/live` datoms retracted after `t_P` are visible again, so `:f/live` lists exactly the rows live at P; it cannot list rows retracted at or before P with a later record time, which is why it must refuse T and TP (Q89b, Q89e) | R31 3.3 item 5 |
| Pin | none. A fresh `as-of` value reads the latest index roots plus the history part; `gc-storage` deletes only segments unreachable from the latest roots and older than its cutoff, so no page ever needs a deleted segment. A db value held across pages is not used: held values have a 120 s TTL (`SnapshotExpired`, R31 D3/D4) and would tie the sweep to gc timing | R29 4.4; R32 4 `[D]` |
| Writers | the transactor is a separate process on its own CPU; peers never block it; background indexing jobs proceed | R29 2.1, 6 |
| Kernel | TypeScript sweep workers call `sweepPage` and run `sweepSubject` or `reconcile`; the JVM never evaluates W0 (one kernel definition) | `packages/w0` |
| Publish | evaluation records written by the gateway as outbox entities in one Datomic transaction per frame of 64, below live commands on the gateway's write executor | TARGETS 3 "atomic path to the outbox"; R29 6 P1 risk 1 |

1. **Q89i.** `as-of t_P` hides every datom added after `t_P`, including `:f/retracted-in` and the `:f/live` retraction, so a later
   retirement and its metadata are invisible by construction. HE-5 checks the bytes anyway.
2. **Placement.** At 10k: the single gateway peer, with the sweep on its own bounded executor so live reads keep theirs. At 100k: a
   second peer container for the sweep on its own cpuset, on the SELECT-only Postgres role (R29 6 P5 row: "Later: the sweep on a second
   peer"; R32 2.3).
3. **Must-fix before use (from R31):** D-D1 (multi-request reads mix cuts; each sweep page is one request, so the sweep avoids it by
   construction, but live Datalog reads on the same gateway still need Q89d), D-D4 (P-to-t rebuild per commit), D-D5 (`getByEntities`
   enumerates the whole scope; the sweep endpoint enumerates by subject), D-D6 (`d/sync` on every request contacts the transactor; the
   sweep endpoint uses `d/db` and syncs only when P is above the peer's basis).
4. **Data volume.** About 6 datoms per fact (R29 4.2) gives about 2.7M datoms at 1k, 26.7M at 10k and 267M at 100k `[E]`; with "every
   datom stored at least 3 times" that is roughly 1.5 to 3 GB in `datomic_kvs` at 10k and 15 to 30 GB at 100k `[E]`, against R32's
   8 GiB slot disk forecast. The 768 MiB peer object cache cannot hold the 100k working set, so a 100k sweep reads most segments from
   Postgres. Lane D's 100k run waits for the 10k receipt's measured bytes per fact (proposed ruling R34-i).

### 2.4 Comparison

| Property | Q host store (and X-broker) | X-native | D Datomic |
| --- | --- | --- | --- |
| Basis shape | P | P | P (mapped to `t_P`) |
| Read unit | one SQLite read transaction per page (about 20 to 30 ms `[E]`) | 3 to 6 statements per page, each its own snapshot | one request, one fresh `as-of` value |
| What keeps P answerable across pages | `pinBasis` holds the purge horizon at or below P (lease) | XTDB never drops Triplex row versions | Datomic never drops datoms short of excision; fresh value per page |
| What the sweep can hold back | only the purge of rows retracted after P | nothing | nothing |
| Unrelated maintenance that must proceed | PASSIVE checkpoints, the 64 MiB RESTART gate, purge of rows retracted at or before P | compaction, block flush | indexing jobs, `gc-storage` |
| Q89b exposure | H1 is position-retired: T and TP must be refused | none for P; T unstable until Q90 | `:f/live` is position-retired: T and TP must be refused |
| Q89i | retired rows returned with no retraction fields | the reader drops retraction columns | `as-of` hides later datoms |
| Kernel location | in the sweep thread, beside the read | sweep worker thread on the host | TypeScript sweep worker; rows cross HTTP |
| Shares CPU with live reads | broker process (separate threads) | the XTDB JVM (no working follower) | the gateway peer at 10k; a second peer at 100k |
| Bytes at 100k `[E]` | about 4 to 5 GB (`broker.db`, 95 B per H1 row measured by R25 plus frames) | about 130 GB source log: infeasible | about 15 to 30 GB |
| Predicted 100k wall | 15 to 45 s with 4 workers | 200 to 800 s on one node (1k run only) | unknown |

### 2.5 Where the 100k bytes come from (estimates the 10k receipts must replace)

| Store | Per-fact cost | Basis | 1k | 10k | 100k | Fits the slot disk? |
| --- | --- | --- | --- | --- | --- | --- |
| broker.db H1 (split layout) | about 95 B per row (1.01M rows in 96 MB) plus frames | R25 6.2 `[P]` | 0.05 GB | 0.45 GB | 4.3 GB plus frames | yes, on the host disk (25 to 33 GiB free) |
| QLever A0 | 64 quads per fact | N01 10k seed `[P]` | 28.5M quads | 285M quads | 2.85B quads | 1k only |
| QLever compact `cur` graph (R24 Q1) | about 1 triple per fact | R24 6 `[E]` | 0.45M | 4.45M | 44.5M | yes (R17 ran 69M triples in 1.86 GiB) |
| XTDB A0 | about 30 KB per command | J01 `[P]` | 1.3 GB log | 13 GB | 130 GB | 1k only |
| XTDB as P2B replica | about 1 row per fact, 185 B | R24 6 `[E]` | 0.1 to 0.2 GB | 0.8 to 2 GB | 8 to 20 GB | 10k yes; 100k needs a larger forecast |
| Datomic on Postgres | about 6 datoms per fact, stored 3 times | R29 4.2, R32 2.4 `[E]` | 0.15 to 0.3 GB | 1.5 to 3 GB | 15 to 30 GB | 10k yes; 100k needs a larger forecast |

The pool's disk limit is 50 GiB of the 60 GiB VM disk (`slots.json` `pool.diskUsedLimitBytes`), so a single 100k exclusive run with
a 25 to 30 GiB forecast is possible only when nothing else large holds a reservation. The orchestrator decides that per run.

---

## 3. Which lane starts first

**Lane X's native arm starts first, from main, and carries the lane-neutral harness. Lane Q is second and is expected to be the first
to meet the bars. Lane D is third.**

### 3.1 What each lane's sweep needs, and where it is today

| Need | Lane X native | Lane Q (and X-broker) | Lane D |
| --- | --- | --- | --- |
| N01 driver sweep phase, presweep and sweep phases with 64 readers, coverage hash, post-capture mutations, O-REPLAY check of pulls | main (`driver.ts:609-645`, `phases.ts:44-45`) | main | main, but `Lane` is `"xtdb" \| "qlever"` only (`lab/bench/lib/triplex.ts:22`) |
| W0 kernel `sweepSubject`, `reconcile`, `publish` | main (`packages/w0`) | main | main |
| W0 population generator and O-DOMAIN fingerprint at any N divisible by 50 | main | main | main |
| O-REPLAY (0.4.9 pinned; 0.5.0 building in CX-O06) | main | main | main |
| Engine slot | `engine.mjs` XTDB s1 to s3 (3.5 GiB, 8 GiB disk forecast) | `engine.mjs` QLever s1 to s3 for the replica | lane D under `engine.mjs` exists only on `exp/DA00-datomic-bringup` |
| Read at an explicit position P | A0 `getByEntities` with `ResolvedTemporalBasis.recordedPosition` (main) | H1 `pull` and `sweepPage` on `exp/SQL01-broker-sqlite` (accepted default-off; merges after P2Q) | `exp/DA01-datomic-adapter` round 3 (Q89d) plus EXP-DA04 Postgres (not started) |
| Retention pin | not needed | `pinBasis` on SQL01 (no lease yet) | not needed |
| Atomic outbox path | Triplex transact of outbox entities through the A0 writer (new lab code) | broker frames (SQL01 has the log; the outbox record kind is new) | Datomic transaction of outbox entities (new gateway endpoint) |
| Route-equivalence harness | `exp/RQ01-route-equivalence` (V-RQ01 FIX-FIRST: F3, settled by Q89i; F2 coverage denominator) | same | same |
| Paired measurement (PAIR-0) | `exp/M01-paired-measurement` (unmerged) | same | same |
| Seed clone | `exp/K01-seed-clone` (unmerged); not needed at 1k, where a reseed is cheap | file copy of `broker.db` after a TRUNCATE checkpoint | Postgres volume copy (untested) |
| Engine-side observer | `exp/OBS01-observer` (unmerged) | same | same |

### 3.2 Why this order

1. **Lane X native needs nothing unmerged** to produce a correct, receipted sweep at the 1k rung. Its numbers will miss the wall bar
   (section 2.2), but it proves the harness end to end on a real engine: seeder, positions, read at P, world reader, kernel, outbox,
   fingerprint gate, round design and receipts. Every one of those is reused unchanged by lanes Q and D.
2. **The harness can run offline first** against the in-process `memory` composition (`lab/bench/lib/memory.ts`), which needs no
   engine, no slot and no pool. That gives G0 to G5 (section 5) at 1k and 10k before any slot time.
3. **Lane Q waits only for one integration round** (P2Q review round 8, then SQL01 on the P2Q head, NOTEBOOK 2026-11-09 00:03Z). If
   the orchestrator wants it sooner, round B can be built on a branch from the SQL01 head `4863a8e0` and rebased in the integration
   round; that is the orchestrator's call, not this brief's.
4. **Lane D waits for three branches** (DA00, DA01 round 3, DA04) and for one measurement nobody has made: Datomic latency on local
   storage (R29 6: no published numbers). Its sweep endpoint design (section 2.3) can be written into DA01 round 3's scope so it is
   ready when DA04 lands.

---

## 4. Measurement design

### 4.1 The workload during a sweep

| Item | Rule | Source |
| --- | --- | --- |
| Writer trace | the frozen generator of TARGETS 2.1 (steady 15 facts/s, 50x bursts for 60 s every 600 s from 120 s, writer mix 40/30/10/20, 10% duplicate system signals, 1% lost ACKs, 1% corrections 30 days back), open loop, latency from scheduled offer to ACK | TARGETS 2, 2.1, 1.1 P2 item 1 |
| W0 trace mapper (new) | each scheduled command becomes W0-valid facts on W0 placements in the swept scope (answer-chain facts, status signals, decisions, pay changes), so live writes and the sweep share one store and one hot set. In rounds A and B it never writes a shared entity (location, jurisdiction), so a write reaches exactly one placement; GS.06b's shared-entity fan-out is a later round. The mapper's source hash is bound in every receipt, and its first use starts a new comparison series | TARGETS 2.1 items 4, 5 |
| Live readers | 64 closed-loop readers of W0 placements; at least 50% of reads target placements written in the previous 60 s; basis mix 80% at the latest position (named exactly), 15% at a position within the last hour, 5% at an older position (in a freshly seeded store, uniform over `[1, P_act]`, stated in the receipt); 10% split reads straddling a trace command; the driver records every basis | TARGETS 2, 1.1 P1 items 1, 2, 4 |
| Live route | the lane's P4 path: H1 pulls (Q, X-broker); A0 pulls (X native); the live gateway (D) | TARGETS 4.1 item 5 |
| Activations | one activation per round, alternating R2 and R1 (the GS.10 rollback pattern), so every round is a real activation at a new `P_act(k)` | GS.10 (`lab/scenarios/10-release-activation/scenario.json`) |
| Post-capture mutations | after `P_act(k)` is captured, 1% of in-scope placements get W0-valid commands chosen to change their output under the active release | TARGETS 1.1 P5 item 4 |
| Live publication | rounds A and B publish only sweep records; live reconciles are pulls and publish nothing, so the expected outbox has one writer. The GS.10 race (in-flight reconciles finishing on the old release) is a later round | proposed ruling R34-j |

### 4.2 No-sweep baselines and the 1.5x ratios

1. **Design: duet with a randomized treatment (R22 PAIR-0).** Two arms run the same trace window from one seed on two copies of one
   seeded store, started at one absolute time. In each round one arm runs the sweep and the other does not; which arm sweeps is drawn
   per round from a seeded sequence; every sixth round is A/A (neither sweeps). The A/A rounds give slot bias and the window's noise.
2. **Ratios.** Live read p99 ratio = p99 of the sweeping arm's live reads inside the sweep window over p99 of the other arm's live
   reads in the same window. Writer commit p99 ratio: the same for commit latency. The "1.5x holds" verdict needs the upper bound of
   the paired-bootstrap 95% interval (whole rounds resampled) at or below 1.5; otherwise INCONCLUSIVE or FAIL. This is R22's "hold"
   verdict with the margin set to the P5 bar; it does not loosen the bar.
3. **Rounds.** 8 minimum, 12 default, 24 maximum, one sweep per round; looks at 8, 12, 18 and 24 (R22 7).
4. **Bursts.** Each round is drawn (seeded) as a steady round (the sweep window holds no burst) or a burst round (the sweep window holds
   one whole 60 s burst). Both kinds must pass both ratio bars and the wall bar. A commit p99 claim needs about 25,000 commands per arm
   (R22 finding 4); the steady trace gives about 110 commands per 100 s, a burst about 3,300, so the commit p99 verdict pools the burst
   rounds and at least 8 of them are needed. On the frozen trace a round is one 600 s burst period, so 12 rounds take about 2 h.
   Screening may use a trace with a 180 s burst period as its own named series (R22 7); acceptance uses the frozen trace.
5. **Wall time.** Measured per round from basis capture to the last publication ACK. The bar is met only when every usable round is at
   or below 100 s; the receipt reports p50 and max.
6. **The second view.** The driver's existing matched-phase comparison (presweep against sweep, `driver.ts:940-952`) stays in every
   receipt as a diagnostic beside the duet verdict.
7. **Duet compression.** When the sweeping arm uses CPU the other arm also needs, the ratio is pushed toward 1, which favours a "holds"
   claim (R22 duet caveats). In the VM each arm and the sweep workers get disjoint cpusets (4.3), and host-side screening receipts are
   labelled DIAGNOSTIC.

### 4.3 Worker counts and how sweep workers spread over cores

| Knob | Values | Why |
| --- | --- | --- |
| Sweep workers W (host store) | 1, 2, 4 | W = 1 measures the per-core rate the bar quotes (about 1,100 subjects/s/core; with W0's 445-fact worlds I expect 600 to 2,100 `[E]`: read about 0.3 ms, kernel 0.16 ms, decode unknown); W = 2 and 4 measure wall |
| In-flight pages (X native, D) | 4, 8 | engine round trips dominate; the controller (R24 5.2 item 3) sets the live value |
| Page size | 64 (Q84c); 32 and 128 at 10k only, as a sensitivity check | one read unit per page |
| Controller | off (S0) and on (S1) | R24 7 arms S0 and S1; the constants of R24 5.2 item 3 are starting values and are bound in the receipt |

1. **On the macOS host (screening)** threads cannot be pinned. Each receipt reports CPU seconds per stage from `process.cpuUsage` in
   every worker, `eventLoopUtilization` of the broker main thread and of each worker, and cores used = CPU seconds over wall.
2. **In the VM (acceptance)** every arm runs in containers on a cpuset with no CPU quota (R22 finding 2: the `--cpus` quota throttled
   77% of periods). With 6 VM CPUs and the residents stopped for the window: arm A on CPUs 0 and 1, arm B's live processes on 2 and 3,
   arm B's sweep on 4 and 5. Threads in one container share its cpuset, so a sweep that needs its own cores runs as a separate sweep
   process with readonly connections to `broker.db` on the shared volume, re-checking the marker's epoch in every page (R25 open
   question 6). Screening decides whether that is needed: if broker-process CPU contention explains the live ratio, the acceptance
   arm uses the separate process.
3. **Lane D** keeps R32's slot split (transactor CPU 0, Postgres CPU 1, gateway CPUs 2 and 3) and puts the 100k second sweep peer on
   CPUs 4 and 5.

### 4.4 Binding the data volume (the C8 lesson)

qlever-dev accumulated other lanes' graphs for 25 hours and a closure went from passing to a 30 s timeout (NOTEBOOK 2026-11-09
00:16Z). So:

1. **Every P5 run uses a dedicated, freshly seeded (or fingerprint-verified cloned) store on an exclusive slot.** Never a dev resident,
   never a shared scope.
2. **Every receipt binds the population:** W0 spec version, seed `W0-pop-1`, N, L, K, `basis.tx`, fact count, worlds digest, release
   hashes, and the O-DOMAIN fingerprint receipt and its source hashes.
3. **Every receipt binds the store's own counts, read by the driver at run start and end** (never copied from a manifest):

   | Lane | Counts |
   | --- | --- |
   | broker (Q, X-broker) | max LSN, frame count, `live_rows`, `retired_rows`, H, open pins, `broker.db` and WAL bytes |
   | XTDB | `MAX(position)`, `COUNT(*)` of `tx_assertions`, trie and file bytes (`xt.trie_stats`), compactor jobs |
   | QLever replica or generation | base and delta triple counts and the delta in the touched blocks (Q91a), triples in the scope graph (SPARQL `COUNT`), index bytes on disk, generation id and `appliedLsn` |
   | Datomic | `d/db-stats` datoms, basis t, `datomic_kvs` row count and `pg_total_relation_size` |

4. **Fail closed.** A run whose start counts differ from the seed manifest stops before measuring (as `lab/bench/lib/bulk.ts:11-12`
   already does for positions); end counts must equal start plus the recorded commands.
5. **Placement identity** in every receipt: slot, image digest, configuration hash, cpuset, memory cap, fresh or cloned (and the clone
   source's fingerprint), trace generator hash and seed, mapper hash, kernel package hash, controller constants, W, page size.

### 4.5 Noise rules (R22)

1. Duet with a randomized treatment and A/A every sixth round (4.2).
2. Cpusets, no quota, in the VM; residents idle or stopped for acceptance windows (a measurement window per Q69a, which only the
   orchestrator schedules).
3. Window signals at 10 s cadence and exclusion rules decided before any outcome is seen (R22 4): host memory pressure, swap growth,
   VM PSI, throttled periods, neighbour CPU on an arm's cpuset, calibration drift, hiccup meter, driver event-loop use. A window is
   INVALID when more than a third of its rounds are excluded.
4. Calibration (20 units of fixed work) before and after every round, on the host and in the VM.
5. Pre-flight A/A gate: s_d of ln(p50 ratio) at most 0.28 for 12 rounds or 0.39 for 24 (R22 4); otherwise the window is RED.
6. Every heavy command through `lab/bin/heavy.mjs`; latency judged only relatively while the host stays saturated (STATE).
7. Until `exp/M01-paired-measurement` merges, receipts are screening (DIAGNOSTIC) and use the matched-phase view plus A/A; no P5
   obligation closes on them.

### 4.6 Pool and slot plan inside the 11 GiB pool

Today: xtdb-dev 3.0 + qlever-dev 3.5 + datomic-dev 2.75 (parkable) = 9.25 GiB, leaving 1.75 GiB with the Datomic resident up and
4.5 GiB with it parked (R29 2.5, R32 2.1).

| Step | Where | VM memory | Disk forecast | Requires |
| --- | --- | --- | --- | --- |
| A0 offline (memory composition, 1k and 10k) | host | 0 | under 1 GB | a heavy token |
| A1 X native, 1k, single arm screening | XTDB s1 exclusive, fresh volume | 3.5 | 8 GiB (about 1.3 GB log `[E]`) | datomic-dev parked: 3.0 + 3.5 + 3.5 + observer 0.125 = 10.1 |
| A2 X native, 1k, duet | XTDB s1 + s2 | 7.0 | 2 x 8 GiB | measurement window: qlever-dev stopped and datomic-dev parked: 3.0 + 7.0 = 10.0 |
| B1, B2 host-store screening, 10k and 100k | broker process on the host | 0 (replica detached) or 3.5 (QLever s1 for the 1k A0 replica or a compact `cur` replica) | host disk: 0.5 GB at 10k, 2 x 4.5 GB at 100k for the duet copies | a quiet host window; heavy token |
| B3 host-store acceptance duet, 100k, in the VM (G03 containers) | two broker containers of about 2.5 GiB (process about 0.4 to 0.6 GiB plus page cache for the 4.3 GB file, which the cgroup counts) + two driver containers of about 0.5 GiB | 6.0 | 2 x 6 GiB | measurement window: 3.0 + 6.0 = 9.0 plus observers |
| C1 lane D, 1k and 10k | DA04 exclusive slot: Postgres 1.0 + Datomic container 3.0 | 4.0 | 8 GiB | lane D resident pair parked: 3.0 + 3.5 + 4.0 + 0.19 = 10.7 (R32 2.4) |
| C2 lane D, 100k | C1 + a second sweep peer container (about 1.5 GiB: 1 GiB heap, 512 MiB object cache) | 5.5 | 15 to 30 GiB `[E]` | qlever-dev stopped: 3.0 + 5.5 = 8.5; disk per R34-i |

Lanes never run their exclusive steps at the same time (Q78b, R32 2.4). The host side runs at load 12 to 13 on 12 cores (STATE), so
host-store screening is scheduled in quiet windows and labelled DIAGNOSTIC.

---

## 5. Correctness gates for the sweep's answers

A fast wrong answer scores zero (TARGETS threshold policy). Every gate below fails closed and runs on every lane, every fresh store.

| Gate | What is checked | Expected answer from | Run when |
| --- | --- | --- | --- |
| **G0 fingerprint sweep** | A preview sweep at the population basis `B0 = {recordedPosition: basis.tx, validAt: V_W0}` with R2 passed to `sweepSubject` directly. The worlds read from the store, serialized by SPEC 12.7's recipe, give the worlds digest; the outputs give the R2 output digest. Both must equal the fingerprint, and the 1,000-world block digests localize any mismatch | O-DOMAIN `--population --rung N --fingerprint` (independent generator); at 100k the pinned values `fec1d7ce...` and `551bbbc4...` | after every seed or clone, before any timed run |
| **G1 worlds at `P_act(k)`** | every in-scope placement's world at the round's activation basis | for placements no recorded command at a position in `(basis.tx, P_act(k)]` touched: O-DOMAIN's population world (G0 has proved the store holds it). For touched placements: O-REPLAY over the seeder's driver-recorded population commands for those placements plus every recorded trace command, then the W0 world projection | every round |
| **G2 outputs** | each placement's canonical output bytes from the sweep | O-DOMAIN `reconcile(expected world, activations visible at P_act(k), {tx: P_act(k), validTime: V_act(k)})`, one call per placement or one batch | every round |
| **G3 post-capture mutations** | the 1% of placements mutated after capture (positive witnesses, chosen so their output would change) and an equal number never written (negative witnesses) show the captured basis, not the mutation | G1 and G2 expectations at `P_act(k)` | every round |
| **G4 coverage and resume** | the evaluated set equals the subject list (hash), each exactly once; 10 abrupt stops of the sweep process at seeded random pages, then resume: outputs identical, zero visible duplicate deliveries, retries counted separately | the subject list hash; the outputs of the uninterrupted round | once per lane per rung, plus every acceptance window |
| **G5 outbox** | the deliveries the lane's outbox produced from the sweep's evaluation records | O-DOMAIN `publish(state before the round, records)`, compared per subject and per item (`id`, `seq`, `payload`); order across subjects is not compared because W workers publish pages out of subject order | every round |
| **G6 route equivalence (EXP-RQ01, Q89f)** | the sweep route registered as a `RouteFixture` route (`sweep-page`, shapes {P}) beside the lane's pull and source routes, on R31 4.2 histories and 4.3 bases | O-REPLAY (HE-1) and the other routes (HE-2) | every branch that adds or changes the sweep route |
| **G7 basis echo** | the receipt's basis equals the driver-recorded `P_act(k)`; every page reports the snapshot it read (broker `lsn`, `epoch`, `h`; XTDB position; Datomic `t_P` and basis t); a page whose `epoch` differs from the round's first page is re-read and counted | the driver's own record (TARGETS 1.1 P1 item 4) | every page |
| **G8 never blocks writers or unrelated compaction** | broker: zero writer gate waits caused by a sweep read unit, longest sweep read transaction at most 100 ms, WAL at most 64 MiB, PASSIVE checkpoints completing at the no-sweep arm's rate, purge of rows retracted at or before P progressing during the sweep, H never above the lowest pin. XTDB: a compaction job and a block flush complete during the sweep (compactor jobs back to 0). Datomic: one `d/request-index` job completes during the sweep. QLever replica or generation: its delta merge or rebuild proceeds. The throttled 10-minute variant (TARGETS 1.1 P5 item 5) overlaps one real maintenance event per lane and keeps its basis | engine and store counters, read by the driver and the observer sidecar | every round (counters); once per lane (throttled variant) |
| **G9 data volume** | start counts equal the seed manifest; end counts equal start plus recorded commands (section 4.4) | the seed manifest and the driver's command log | every run |

**G6 in detail.** The harness on `exp/RQ01-route-equivalence` (V-RQ01 FIX-FIRST; Q89i settles its F3 by naming the masked contract)
gets these sweep cases:

1. **P answered, exactly.** Every P in the R31 4.3 family (every committed position, interior ordinals, abort gaps, h, h - 1 where
   it refuses, head) answered by `sweep-page` equals O-REPLAY and the lane's pull route on the identical request (HE-1, HE-2).
2. **T and TP refused, typed.** On H1 and Datomic `:f/live` sweep routes every T and TP basis is refused with an allow-listed error
   (HE-3, Q89b); on XTDB native the T shapes are not sent (the route declares shapes {P}).
3. **No fail-open shape.** `{eligible: false, rows: []}` reaching any caller fails the case (HE-6, R31 D-Q2).
4. **Byte identity across maintenance (HE-5, Q89i).** The identical page request repeated after more commits, after a purge with the
   pin held, after a checkpoint RESTART gate, after a Datomic indexing job, after an XTDB block flush and compaction, and (QLever) after
   a generation switch, returns identical bytes under the masked contract, never the raw-lifetime contract.
5. **Pin semantics.** With the pin held, a purge to a horizon above P must not remove a row visible at P; after release the purge
   proceeds and a page at P refuses typed (`h > P`); an expired lease behaves like a release.
6. **Future P refused** after the deadline (HE-3, Q89c).

---

## 6. Risks, and the first experiment on each lane

### 6.1 Risks

| # | Risk | Lanes | Effect | Mitigation | Signal |
| --- | --- | --- | --- | --- | --- |
| 1 | The W0 population (44.5M facts at 100k) does not fit the engines' A0 encodings | X, Q | no engine-fed 100k sweep in the pool | host store for X and Q (R34-d); compact replicas and generations later | section 2.5 bytes per fact, replaced by 10k measurements |
| 2 | Lane D's 100k store is 15 to 30 GB `[E]` and its working set exceeds the peer cache | D | disk forecast exceeded; sweep bound by Postgres reads | measure at 10k first; R34-i | `pg_total_relation_size`, io-stats storage reads per page |
| 3 | Seeding cost | all | runs wait hours | X native at 1k through the public writer (about 445k assertions, 25 to 75 min `[E]` from K01's 293 assertions/s); broker by group commits (about 4.34M transacts in about 68k SQLite transactions of 64, several minutes `[E]`) through the product writer, never by hand-written rows (the `qlever-bulk-seed.ts` rule: real write path, capture only the transport); Datomic 10k about 434k serial transactions, 7 to 36 min `[E]` | seed wall and G0 |
| 4 | Row decode, not read or kernel, bounds the host-store sweep | Q, X-broker | wall over 100 s at W = 1 | per-stage CPU in every receipt; if decode exceeds the kernel, H1's row encoding (JSON today, `sqlite-worker.ts:67`) becomes a joint P4/P5 question | decode CPU seconds |
| 5 | Publication load: 100k records of 1 to 3 KB is 100 to 300 MB through the WAL in 100 s | Q, X-broker | gate RESTARTs, commit p99 ratio over 1.5 | controller gates publication on the commit p99 guard; frames of 64 below live groups | WAL size, gate count, commit p99 ratio |
| 6 | Duet compression on the host | all | a "holds" verdict that is too kind | cpusets in the VM for acceptance; host receipts DIAGNOSTIC | A/A spread |
| 7 | Commit p99 needs about 25,000 commands per arm | all | INCONCLUSIVE on the commit bar | burst rounds pooled; at least 8 burst rounds | command count per arm |
| 8 | X native shares one JVM with live readers and the indexer (no working follower) | X | live ratio far over 1.5x for S0 | expected; it is a baseline | S0 ratios |
| 9 | RQ01, M01, K01, OBS01, G03 are unmerged | all | G6 and acceptance wait | screening proceeds; G6 builds on the RQ01 branch until it merges | merge state |
| 10 | An abandoned pin holds the purge horizon forever | Q, X-broker | retired rows grow without bound | lease with renewal; refuse a new pin far below head | open pins and H in receipts |
| 11 | Q90 lands mid-experiment and changes record stamps (contract 0.4.0, new comparison series, both A0 controls re-frozen) | all | receipts before and after are not comparable | receipts bind the contract version; the P basis is unaffected | contract version in receipts |
| 12 | Activations every round change the outbox state the next round starts from | all | G5 expectation drift | G5's expected state is folded round by round from O-DOMAIN, never from the store | G5 |
| 13 | macOS host saturation (load 12 to 13, swap near full) | Q, X-broker screening | noisy host numbers | quiet windows, heavy tokens, R22 exclusion rules | window signals |

### 6.2 First experiment per lane, smallest informative scale first

**Round A: harness plus lane X native (starts now, from main).**

| Step | Scale | What | Done when | Predictions (each can fail) |
| --- | --- | --- | --- | --- |
| A0 | 1k, then 10k, offline (`memory` composition) | seeder, world reader, kernel and outbox seams, cursor, pages, workers, controller, receipts, G0 to G5 with a simulated trace | G0 digests equal O-DOMAIN's at 1k and 10k; G1 to G5 pass; 10 kill-and-resume cycles identical | per-subject kernel cost within 20% of 158 µs; decode cost measured |
| A1 | 1k on XTDB s1 (fresh volume, single arm) | seed through the public writer; G0 on the engine; S0 (W = 4 in-flight pages, no controller) and S1 (controller) in 6 sweep rounds with matched no-sweep rounds in seeded random order, A/A included | G0 passes on XTDB; receipts with every section 4.4 field | 1k wall 5 to 20 s, projecting 500 to 2,000 s at 100k; S0 live read p99 ratio at least 2x; S1 holds 1.5x only by stretching wall at least 2x over S0; a compaction job completes during the sweep |
| A2 | 1k duet on s1 + s2 (measurement window) | the A1 arms under PAIR-0 | verdicts per section 4.2 | as A1, with narrower intervals |

**Round B: lane Q host store (after P2Q and SQL01 merge).**

| Step | Scale | What | Done when | Predictions |
| --- | --- | --- | --- | --- |
| B0 | 10k | group-commit seeder into `broker.db`; G0 | G0 passes | seed under 2 min `[E]`; about 0.45 GB file |
| B1 | 10k, host screening | S3 with W = 1, 2, 4; controller off then on; replica detached (and the 1k A0 replica as a side run); G1 to G8 | all gates pass; per-stage CPU recorded | wall 1.5 to 5 s at W = 4; W = 1 rate 600 to 2,100 subjects/s; longest page transaction at most 50 ms; WAL at most 64 MiB; live read p99 ratio at most 1.2; commit p99 ratio at most 1.25 |
| B2 | 100k, host screening | as B1, plus kill-and-resume and the throttled variant overlapping a purge and a RESTART gate | G0 equals the pinned 100k digests; all gates pass | wall 15 to 45 s at W = 4; broker RSS growth at most 300 MB; zero mismatches |
| B3 | 100k acceptance duet in the VM | after G03, M01 and OBS01 merge | verdicts per section 4.2 | as B2 |

**Round C: lane D (after DA04 merges and DA01 round 3 lands the Q89d fixes).**

| Step | Scale | What | Done when | Predictions `[E]`, all low confidence |
| --- | --- | --- | --- | --- |
| C0 | 1k on the DA04 slot | seed; the `sweepPage` endpoint; G0; datoms per fact and `datomic_kvs` bytes | G0 passes; bytes per fact recorded | about 6 datoms per fact |
| C1 | 10k on the DA04 slot | sweep on its own gateway executor beside live reads; G1 to G8; one `d/request-index` during the sweep; io-stats storage reads per page | all gates pass | wall 10 to 60 s; the indexing job completes; live read p99 ratio unknown |
| C2 | 100k with a second sweep peer | only if C1's measured bytes per fact fit the disk decision (R34-i) | gates pass | unknown |

---

## 7. Builder brief for round A (Codex builder, medium)

**North star:** P5 (section 0). **Scope and targets:** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (1.1 P5, 2.1, 4.1,
6.1). **Branch:** `exp/P5-release-sweep` from main. **Do not** edit `packages/` except to add, if needed, an internal
(non-public) read export the bench can call with `ResolvedTemporalBasis.recordedPosition`; no public API change (Q89g is Sam's).

1. `lab/bench/lib/w0-seed.ts`: stream `population(rung(N))` (`packages/w0/src/population.ts:554`) into Triplex operations, one
   transact per W0 command in reference order on a fresh scope; assert that each receipt's position equals the reference position;
   record the submitted operations and receipts (for O-REPLAY in G1); write a seed manifest with the fingerprint and the store counts
   of section 4.4. Map W0 values to Triplex value kinds under the numbers rule (cents as integers, no floats).
2. `lab/bench/lib/w0-world.ts`: adapter rows at P to the W0 world (`{subject, facts: [{e, a, v, tx}]}`), following SPEC 4.2 items 3
   and 4 for reach; never copy retraction fields (Q89i); canonical bytes by SPEC 9.
3. `lab/bench/lib/sweep.ts`: subject list and its hash; cursor `(sweepId, P, page index)` persisted per published page; W worker
   threads, each reading its pages at P, building worlds, calling `sweepSubject` (G0 preview) or `reconcile` (activation), returning
   records as transferred buffers; the controller of R24 5.2 item 3 with its constants bound in the receipt; per-stage CPU.
4. `lab/bench/lib/composition.ts`: add `sweepPage(subjects, {position, validAt})`, optional `pinBasis(position, owner)`, and
   `publishOutbox(records)` to `CompositionHandle`; implement for `memory` and for `public` (A0: one `getByEntities` per hop at P;
   outbox as one Triplex transact of outbox entities per frame of 64; refuse a P beyond the position read in the same statement).
5. `lab/bench/lib/evaluate.ts`: replace the fail-closed seams with the W0 kernel and the outbox path; keep failing closed when the W0
   or O-DOMAIN pin is missing.
6. `lab/bench/lib/w0-trace.ts`: the W0 trace mapper of section 4.1, never writing shared entities in this round; its hash in receipts.
7. `lab/bench/driver.ts`: `--world w0 --rung <N>`; replace `runSweep`'s basis (`driver.ts:611`) with the P shape and `V_act` from a deterministic runtime clock anchored at `V_W0` (section 1.4);
   phases: seed and verify (G0), activation, warm-up, rounds per section 4.2 (single-arm alternation until M01 merges).
8. Gates G0 to G5, G7, G9 as offline tests under `lab/bench/test/`, plus the G6 cases of section 5 on the RQ01 branch's harness if it
   has merged, else as a stacked commit the reviewer runs against that branch.
9. A PASS audit (the preamble's rule): every path from an observation to a PASS in the gates, listed and tested.

**Done when:** A0 passes at 1k and 10k offline; A1's G0 passes on an exclusive XTDB slot at 1k; A1 screening receipts exist with every
field of section 4.4; the report states per-stage CPU, bytes per fact on XTDB at 1k, and whether predictions held. **Reviewed by** a
Codex reviewer at high that did not build it, asked to check that each gate rejects the inputs it should (PROTOCOL 6 wording).

---

## 8. Proposed rulings

| ID | Ruling | Moves | Needs Sam? |
| --- | --- | --- | --- |
| R34-a | The P5 sweep basis is `{recordedPosition: P_act, validAt: V_act}` with `P_act` taken from the activation receipt by the driver and `V_act` from a deterministic runtime clock anchored at W0's population valid time (never the wall clock); no sweep names `recordedAt` until Q90 round 2 lifts Q89b for that store with RQ01 evidence for T and TP | P5; P1 floor | No |
| R34-b | On every lane the sweep reads one unit per page (one SQLite read transaction, one statement set, one Datomic `as-of` value taken fresh from the latest db); nothing spans pages; a pin exists only where a store purges by position, and it is a retention pin with a lease | P5 (never blocks writers) | No |
| R34-c | P5's data volume is the W0 population at the rung: every P5 receipt binds the fingerprint (`basis.tx`, fact count, worlds digest, release hashes) and the store's own counts at start and end; a mismatch fails closed; P5 runs only on a freshly seeded or fingerprint-verified clone on an exclusive slot, never a dev resident | P5; correctness floor | No |
| R34-d | At the 10k and 100k rungs, lanes X and Q measure P5 on the broker's host store (S3); the engine replica is not read by the sweep, and the receipt names its state (seeded, compact `cur`, frozen generation, or detached). Engine-fed arms (X native, QLever A0) run at 1k as baselines, because the A0 encodings of the W0 population exceed the slot disks above 1k. This states an engine limit plainly (SCOPE 3.2); it rules out no engine for any layer | P5 | No |
| R34-e | The sweep's cores are declared: in the VM the sweep runs on cores disjoint from the live arm's, W is in the receipt, and the about-1,100-subjects-per-second-per-core figure is checked at W = 1; a shared-core variant is reported beside it | P5 | No |
| R34-f | Rounds are drawn as steady or burst rounds (seeded); both kinds must pass both ratio bars and the 100 s wall; the commit p99 verdict pools burst rounds to at least 25,000 commands per arm; screening may use a 180 s burst-period trace as its own named series | P5, P2 | No |
| R34-g | Expected answers: worlds from O-DOMAIN's population for untouched placements and from O-REPLAY for placements written at or before the basis; outputs from O-DOMAIN `reconcile`; the outbox from O-DOMAIN `publish`, compared per subject and per item; G0's fingerprint sweep runs after every seed or clone | P5 floor | No |
| R34-h | SQL01's `sweepPage` throws a typed `BasisNotAvailable` instead of returning `eligible: false, rows: []` (D-Q2), sweep pages run on dedicated sweep threads, not the live reader pool, and every lane's sweep route is a registered RQ01 route that must pass G6 | P5, P1 | No |
| R34-i | Lane D's 100k sweep waits for the 10k receipt's bytes per fact; if the projection exceeds the slot disk forecast, the orchestrator either raises the lane D forecast for one exclusive run inside the 50 GiB pool disk limit or asks a planner for a compact fact encoding | P5 (lane D) | No |
| R34-j | In rounds A and B only sweep records are published; live reconciles are pulls; GS.10's race (in-flight reconciles finishing on the old release) is a later round | P5 | No |
| R34-k | The W0 trace mapper drives W0-valid commands on the swept scope from the frozen trace schedule; its source hash is bound; its first use starts a new comparison series (TARGETS 2.1 item 5) | P5, P1 | No |

Nothing here loosens a bar, so none of these needs Sam. Q89g (a public position or snapshot token) stays with Sam; with it, the sweep
could name its basis through the public API instead of the adapter's internal field.

---

## 9. Open questions

1. **Frames or single commits for publication** (R24 open question 6). This brief assumes frames of 64 records, each record keyed by
   `(sweepId, subject)`, atomic per frame. If one outbox commit per subject is required, 100k publications are 100k commands and the
   wall estimate grows by the broker's per-commit cost (about 3 ms each, about 300 s serial `[E]`).
2. **The 5% "up to 90 days back" live bases** do not exist in a freshly seeded store; this brief draws them uniformly over
   `[1, P_act]`. An aged seed (R24 6 step 5) would make them real.
3. **Sweep in its own process** for cpuset isolation needs R25 open question 6 answered (readers in another process wait for the new
   epoch after a writer crash).
4. **H1 row encoding.** If decode dominates (risk 4), typed columns in `live_rows` and `retired_rows` are a P4 and P5 change together.
5. **After Q90 round 2,** should the sweep switch to `recordedAt: activationReceipt.instant`? Only per store, with RQ01 evidence for
   the T and TP shapes; the P shape stays the default because it needs no stamp reduction.
6. **The QLever frozen generation (S2-Q)** depends on EXP-QG1 phase 2 and on a compact encoding; whether a 100k generation can be
   built in time for a sweep that starts at activation is open (R35 quotes 30 to 45 minutes at 820M triples).

---

## 10. Sources read

- `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (1, 1.1, 2, 2.1, 3, 4.1, 6, 6.1), `lab/PROTOCOL.md`, `lab/STATE.md`,
  `lab/NOTEBOOK.md` (2026-11-08 21:12Z to 2026-11-09 00:28Z), `lab/acceptance/RULINGS-PENDING.md` (Q84, Q88, Q89, Q90, Q91).
- `lab/research/R22-noise-robust-benchmarking.md` (sections 1, 4, 7), `R24-current-path-and-sweep.md` (0, 5, 6, 7, 8),
  `R25-sqlite-pinned-readers.md` (0, 6, 7, 8), `R29-datomic-lane-design.md` (2, 4.4, 4.5, 6), `R31-route-equivalence.md` (0, 1, 3,
  4, 5.7, 6), `R32-datomic-durable-storage.md` (0, 2), `R33-record-time-at-decision.md` (0), `R35-qlever-delta-cost.md` (5).
- `lab/world/W0/SPEC.md` (4.1, 4.2, 5.3, 5.4, 8.8, 12.3, 12.6, 12.7); `lab/oracles/domain/README.md`, `population.py:544-550`.
- Code on main: `lab/bench/driver.ts`, `lab/bench/lib/{composition,evaluate,phases,world,bulk,triplex,memory}.ts`,
  `lab/bench/reader-worker.ts`, `lab/bench/qlever-bulk-seed.ts`, `packages/w0/src/{index,kernel,population}.ts`,
  `packages/core/src/Temporal.ts`, `packages/core/src/store/TriplesLive.ts:578-620`, `packages/xtdb/src/XtdbStorageAdapter.ts`,
  `lab/config/slots.json`, `lab/locks/pool.json`, `lab/scenarios/10-release-activation/`.
- Branches: `exp/SQL01-broker-sqlite` `packages/qlever/src/broker/log.ts:400-460`; `verify/RQ01` `VERIFY.md` F3;
  `lab/experiments/EXP-X05-xtdb-read-follower/REPORT.md`, `EXP-D01b-w0-kernel/REPORT.md`; `runs/qlever-seed/ns-v2-10k/manifest.json`.
