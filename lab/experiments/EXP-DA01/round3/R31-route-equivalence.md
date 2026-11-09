# R31: Route equivalence for named bases on the three lanes

**Written:** 2026-11-08 by R31 (planner, Opus 5.5, high). Source and design research only: no engine, container or test was run.
Every claim about code is from source read at the commits named below; every behavior is a prediction until a test runs it.

**North star:** P1 (pinned reads at an exact point in time) and P4 (a fast current path separate from history). The rule underneath
both: a named basis gives the same answer on every route that serves it, or the route refuses with a typed error.
**Goals and targets:** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (section 1 P1 items 1 to 5, P4 items 1 to 3; section 3
"snapshot reads at a named point in time ... reproducible").

**Code read (heads):**

| Lane | Where | Head |
| --- | --- | --- |
| core | `packages/core` (main checkout) | main |
| QLever broker | `.claude/worktrees/sql01/packages/qlever` (branch `exp/SQL01-broker-sqlite`) | `14f1e12a` (includes the F1 fix `7c65e2fc`) |
| XTDB A0 | `packages/xtdb` (main checkout) | main |
| XTDB P4 arm X1 | `exp/P4-current-path` | `6f061a8d` |
| XTDB P2X | `exp/P2X-xtdb-commit-feed` | `fb6681a4` |
| Datomic | `.claude/worktrees/da01/packages/datomic` (branch `exp/DA01-datomic-adapter`) | `339b2058` |
| XTDB engine | `references/xtdb` v2.2.0 | pinned |

---

## 0. Answer

1. **The F1 class is wider than H1.** Any store that retires rows by log position cannot answer a basis that also names a record time,
   because the set of rows visible at `{recordedAt: T, recordedPosition: P}` includes rows retracted at a position at or below P whose
   retraction time is after T. H1 has this hole in two places, not one: its purge (`rpos <= h`) and its pull predicate
   (`retired_rows ... rpos > b`, `sqlite-worker.ts:158`), so even an unpurged H1 returns 30 of 40. The SQL01 fix (`7c65e2fc`) routes every
   `recordedAt` read around H1, which is correct. The same hole is designed into two planned stores: R29's Datomic current path through
   `:f/live`, and R24's current table or graph "live facts plus facts retracted after H". Both must refuse or bypass for T-shaped bases.
2. **The deeper defect is the record-time stamp itself.** Triplex stamps `recorded_at` when the transaction is staged
   (`TriplesLive.ts:309`), before the commit order is decided, from `Date.now()` (`RuntimeServices.ts:14`). No lane restamps it at
   decision (QLever broker, XTDB A0, XTDB P2X, Datomic DA01). So a record-time cut is not a prefix of the log, and the answer at a named
   `recordedAt` can change after it was first served, whenever a commit stamped at or before T is still in flight. On the per-subject CAS
   lanes (QLever broker, XTDB P2X) this happens for record times taken from receipts; on the scope-wide CAS lanes (XTDB A0, Datomic DA01)
   it needs a same-millisecond tie or a wall-clock T. The public read API can name only `recordedAt` and `validAt`
   (`Temporal.ts:11-14`, `Triples.ts:236-244`), so this is the only pin a caller has outside pagination cursors.
3. **Recommended ruling: make record time a monotone function of position.** Stamp `recorded_at` (and `retracted_at`) at decision time,
   under the writer's order, as `max(previous + 1 microsecond, clock)`: the broker under its writer lock, XTDB P2X from the engine stamp it
   already computes (`COMMIT_STAMP_SQL`), Datomic from a transactor-side value. Then every basis reduces to `(validAt, P*)` with
   `P* = min(P, pos(T))`, every position-only store (H1, replica marker, Datomic `as-of t`, XTDB snapshot) answers it exactly, and a
   `recordedAt` beyond the head's stamp is a future basis that waits or refuses like a future position.
4. **Datomic does separate current from history.** At the index level R18 line 97 is wrong: the official docs say queries about "now"
   do not consider history ("The Present Pays No Penalty", `docs.datomic.com/reference/filters.html`), and the internals guide says each
   index has current, history and in-memory parts, and that `as-of` merges all three and drops datoms after T. But DA01's mapping gets
   none of the benefit: every read enumerates facts through `:f/subject` or `:f/id`, which are never retracted, so the current index holds
   every fact ever asserted and `:f/live` is written but never read (`storage.clj:164-167`). `as-of` in DA01 is `d/as-of db t` where t is
   the transaction of the first Triplex position at or above P, followed by the Triplex row filter (`storage.clj:122-133, 151-157`); it
   is exact for P-shaped and T-shaped bases because the row filter, not the index, decides.
5. **One concrete correctness defect beyond F1:** Datomic's Datalog executor sends every recursion round, the final query and every
   optional-projection pull as separate gateway requests, and each request syncs to the newest database (`main.clj:75`) when the basis
   names no position (`DatomicQueryExecutor.ts:47-70, 75-118, 119-145`). A commit between requests gives one answer that mixes two cuts.
   XTDB pins the position once (`XtdbQueryExecutor.ts:174-181`); QLever brackets with a snapshot gate (`QleverQueryExecutor.ts:230-238`).
6. **The harness** (section 4) generates write histories and bases from a seed, forces each route by fixture switches, compares every
   answer with O-REPLAY and with every other route on the identical request, repeats the identical request after the history moves on,
   and accepts a refusal only from a route whose declared eligibility excludes that basis. It plugs into `triplesConformanceCases` in
   `packages/testkit` plus one route fixture per lane.

| # | Question | Verdict | Confidence |
| --- | --- | --- | --- |
| 1 | Routes inventoried | 12 QLever, 10 XTDB, 9 Datomic (section 2) | High (source) |
| 2 | Shapes per route | table in section 3; H1 is the only route that is position-only by construction; every other route filters rows by all three fields | High |
| 3 | Datomic current versus history | separated in the engine; not used by DA01's reads; `as-of` merges current, history and memory | High (docs) for "now pays no history penalty"; Medium (unofficial guide) for the three-part merge |
| 4 | Defects | 3 correctness, 4 latent correctness, 4 performance (section 5) | High for the code facts; repro sketches untested |
| 5 | Fix direction | decision-time monotone record stamps (ruling R31-a), typed refusal instead of empty eligible flags (R31-c) | Medium-High |

---

## 1. Vocabulary

| Term | Meaning in this report |
| --- | --- |
| Basis | the cut a read names: `validAt` (business time, always resolved), `recordedAt` (record-time instant, optional), `recordedPosition` (Triplex log position, optional). Type: `packages/core/src/Temporal.ts:18-23`. |
| Shape | which fields a read names. **L**: latest (no T, no P; the route picks the position). **V**: valid time only, same as L for record time. **P**: position named. **T**: record time named, no position. **TP**: both. **H**: history of one entity (no valid-time filter). Every shape also has a `validAt`. |
| Visible at (V, T, P) | `recorded_position <= P` and `recorded_at <= T` and not (`retracted_position <= P` and `retracted_at <= T`) and `valid_from <= V < valid_to`. All four lanes use this predicate: QLever `BrokerStorageAdapter.ts:122-132`, XTDB `XtdbStorageAdapter.ts:42-70` plus lines 156-159, Datomic `storage.clj:151-157`, native XTDB `native/Sources.ts:57-71`. |
| Route | one physical way a read is answered: an engine scan, a replica, an overlay merge, a host store, a cache generation, a source log. |
| Exact | the route returns the row-version set O-REPLAY returns for that basis. |
| Eligible | the route proves, inside the same snapshot it reads, that it is exact for the basis. A route that is not eligible routes on or refuses with a typed error. |

### 1.1 How each lane produces the shapes today

| Producer | Shape it sends | Source |
| --- | --- | --- |
| `Triples.entity`, `entities`, `match` | L or T (public `TemporalBasis` has no position; `resolveTemporalBasis` copies only `recordedAt` and `validAt`) | `Temporal.ts:11-14, 40-55`; `TriplesLive.ts:571-582` |
| `Triples.entityPage`, `queryPage` | P or TP: the first page binds `recordedPosition = currentCommitPosition()` next to the caller's `recordedAt` | `TriplesLive.ts:586-613, 704-716`; `Pagination.ts:132-141` |
| `Triples.query` with `includeBasis` | P or TP | `TriplesLive.ts:688-701` |
| Native queries | P (position resolved once from `tx_meta`) or TP | `core/src/native/NativeQuery.ts:71-88`; `xtdb/src/native/NativeQueries.ts:66-85` |
| Lab drivers (N01, X05, SQL01 review) | P or TP at the adapter or wire level | e.g. `lab/verify/SQL01/review.test.ts:63` |

**Consequence.** TP is not exotic. `entityPage({ basis: { recordedAt: T } })` sends TP on its first page, so F1 was reachable from the
public API on page one during a replica outage, not only from the verifier's adapter-level request.

---

## 2. Route inventory

### 2.1 QLever 0.6.0 plus the broker (`exp/SQL01-broker-sqlite` at `14f1e12a`)

Paths are under `packages/qlever/src/`.

| ID | Route | When it is taken | Source |
| --- | --- | --- | --- |
| Q1 | Replica alone | one SPARQL request returns rows and the replica marker together; marker `>= b` | `broker/BrokerStorageAdapter.ts:294-318, 337-339` |
| Q2 | Replica plus overlay | marker `< b` and the broker's overlay still holds every frame after the marker; rows merged by id | `BrokerStorageAdapter.ts:340-348`; `broker/broker.ts:661-681` |
| Q3 | Replica plus source rows | marker `< b` and the overlay was evicted (`retainPublishedMs`, default 2 s) | `BrokerStorageAdapter.ts:343-346`; `broker.ts:682-689` |
| Q4 | Outage, H1 | replica unreachable, no `recordedAt`, not history, H1 eligible (`h <= b <= lsn*1024+1023`) | `BrokerStorageAdapter.ts:322-336`; `broker/sqlite-worker.ts:154-160` |
| Q5 | Outage, source rows | replica unreachable and (`recordedAt` named, or history, or H1 ineligible) | `BrokerStorageAdapter.ts:326-335` |
| Q6 | In-transaction merge | staged rows replace committed versions by id; staged positions sort after every committed basis | `BrokerStorageAdapter.ts:152-162, 367-377` |
| Q7 | Datalog through the basis gate | replica only; waits for the marker, re-checks the incarnation after the last request, refuses historical Datalog inside a transaction | `QleverQueryExecutor.ts:218-238`; `BrokerStorageAdapter.ts:606-617` |
| Q8 | `dependencyState` | one SPARQL aggregate with the marker in the same request; exact when marker `>= b` or the overlay proves no later frame touches the attributes; otherwise waits, then `BasisNotAvailable` | `BrokerStorageAdapter.ts:544-604` |
| Q9 | Native SPARQL relations | replica; temporal filters in SPARQL | `native/NativeContext.ts:81-90` |
| Q10 | Temporal profile queries | replica; refuses a position beyond the latest committed cut | `TemporalQueries.ts:110-122` |
| Q11 | A0 (no broker) | the replica is the store; future position waits for publication | `QleverStorageAdapter.ts:66-78, 139-156, 183-192` |
| Q12 | `sweepPage` | H1 pull, position only, at most 64 subjects; returns `eligible: false, rows: []` when ineligible | `broker/log.ts:412-415`; `sqlite-worker.ts:157` |

**Source rows** (`recent_rows`) hold the latest version of every row id ever written, with its retraction fields, and are never purged
(`sqlite-worker.ts:131, 196-202`). Because a Triplex row only ever changes by gaining retraction fields, the latest version plus the
visibility predicate answers every past basis. The name "recent" is misleading; it is a complete source.

**H1** is two tables: `live_rows` (unretracted, key entity and id, `pos` = recorded position) and `retired_rows` (key entity, retraction
position, id) (`sqlite-worker.ts:65-69, 129-136`). A pull at b returns `live_rows.pos <= b` plus `retired_rows.rpos > b AND pos <= b`
(`sqlite-worker.ts:158`). Purge deletes `retired_rows.rpos <= h` and sets the horizon h to the lowest pin (`sqlite-worker.ts:196-202`).

### 2.2 XTDB 2.2.0

Paths are under `packages/xtdb/src/` on main unless a branch is named.

| ID | Route | When it is taken | Source |
| --- | --- | --- | --- |
| X1 | A0 pull | one SQL statement over `tx_assertions FOR ALL VALID_TIME` with Triplex columns filtered; Triplex never uses native valid time (rows valid from 1970) | `XtdbStorageAdapter.ts:31-40, 42-70, 111-180` (query text at line 163) |
| X2 | P4 arm X1, default bounds | same SQL without `FOR ALL VALID_TIME`, so XTDB applies its point default and recency pruning; history reads keep `FOR ALL VALID_TIME` | `exp/P4-current-path` `XtdbStorageAdapter.ts:99-102, 183` |
| X3 | In-transaction overlay | committed rows read at `min(sourceK, P)`, staged rows merged by id | `XtdbStorageAdapter.ts:117-123, 166-178` |
| X4 | Datalog (SQL or XTQL compiled) | position resolved once from `tx_meta` when absent, then every request pinned; recursion materialized at that basis | `XtdbQueryExecutor.ts:165-185`; `query/recursion.ts` |
| X5 | Native `facts()`, `recordedFacts()`, `history()` | SQL or XTQL over `tx_assertions` with Triplex columns; position resolved once | `native/Sources.ts:44-110`; `native/NativeQueries.ts:66-85` |
| X6 | Maintained generations | a generation is reused only at its exact (query, validAt, position, recordedAt) hash; otherwise rebuilt and published in one submit | `MaintainedQueries.ts:85-120, 200-225` |
| X7 | Temporal profile queries | refuses a position beyond the committed cut | `TemporalQueries.ts:85-111` |
| X8 | P2X subject-stamp | positions stamped by XTDB's system time inside the transaction; per-subject CAS through `tx_heads`; reads as X1 | `exp/P2X-xtdb-commit-feed` `XtdbStorageAdapter.ts:53-84, 280-360, 459-480` |
| X9 | Read follower (lab only) | `BEGIN READ ONLY WITH (AWAIT_TOKEN, SNAPSHOT_TOKEN, ...)`; killed on reliability (fails closed) | `lab/experiments/EXP-X05-xtdb-read-follower/reader-worker.mjs:9, 51-77`; REPORT.md |
| X10 | `dependencyState` | SQL aggregate with the same cut conditions | `XtdbStorageAdapter.ts:560-610` |

XTDB's own basis: pgwire pins a transaction's read basis at its first query and awaits only that connection's own writes
(`references/xtdb/core/src/main/clojure/xtdb/pgwire.clj:563-573`). A single node is exact for a position from a receipt because the
commit is awaited before the receipt exists; a second node is not, which is why X05 used explicit tokens.

### 2.3 Datomic Pro 1.0.7745 (`exp/DA01-datomic-adapter` at `339b2058`)

Paths are under `packages/datomic/`.

| ID | Route | When it is taken | Source |
| --- | --- | --- | --- |
| D1 | Current db | every request first runs `d/sync`; no position, or position `>=` the last mapped Triplex position: unfiltered db plus the row filter | `gateway/src/triplex/gateway/main.clj:10-11, 74-82`; `storage.clj:122-133` |
| D2 | `as-of t_P` | position below the last mapped one: `t` = transaction of the first Triplex position `>= P`, from a P-to-t map rebuilt from AVET whenever the db basis changes | `storage.clj:119-133` |
| D3 | Held snapshot | inside a transaction: the unfiltered db captured at `begin!`, 120 s TTL, `SnapshotExpired` after | `storage.clj:5-20, 160-161` |
| D4 | Held plus `d/with` | held db with the transaction's staged tx-data applied speculatively | `storage.clj:161`; `query.clj:30-33` |
| D5 | Datalog `q` | one request on D1, D2, D3 or D4; every fact clause calls `visible` with the basis | `query.clj:28-40`; `src/compiler.ts:68` |
| D6 | Multi-request Datalog | recursion rounds, the final query and optional-projection pulls, each a separate gateway request | `src/DatomicQueryExecutor.ts:37-160` |
| D7 | Claim lookup | `at-position` at the transaction's source cut | `main.clj:85-87` |
| D8 | `dependencyState` | reads every row of the scope with history and filters in TypeScript | `src/DatomicStorageAdapter.ts:390-432` |
| D9 | `history(entity)` | current db, all facts of the subject via `:f/subject` | `storage.clj:165-166` |

Row enumeration for every read: `id` through `:f/id`, an entity pattern through `(d/datoms db :vaet subject :f/subject)`, anything else
(including `getByEntities`, which passes `entityIds` without an entity pattern) through every `:f/id` datom in the scope
(`storage.clj:164-167`). `:f/live` is asserted and retracted (`storage.clj:55, 84`) but no read uses it.

---

## 3. Which basis shapes each route answers exactly

Legend: **E** exact; **E\*** exact only because the row filter runs on a complete row set (it would break if the store were trimmed);
**R** refuses or routes on, typed; **W** waits up to the deadline, then refuses typed; **X** can answer wrongly (a defect, section 5);
**n/a** the route is never asked that shape.

### 3.1 Table

| Route | L (latest) | P | T | TP | H | Future P (beyond head) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Q1 replica | E (b = broker head) | E | E\* | E\* | E | W (`awaitResolved`, `BrokerStorageAdapter.ts:276-283`) | the replica holds every row version (latest per id plus retraction fields), filtered in the kernel |
| Q2 replica + overlay | E | E | E\* | E\* | E | W | overlay rows are latest versions; merged by id |
| Q3 replica + source rows | E | E | E | E | E | W | complete source |
| Q4 outage, H1 | E | E when `h <= b` | **R** since `7c65e2fc` (was X: F1) | **R** since `7c65e2fc` (was X: F1) | R (history bypasses) | W | position-only by construction, see 3.2 |
| Q5 outage, source rows | E | E | E | E | E | W | cost grows with the selection, not with frames |
| Q6 in-transaction | E at sourceK | E (`min(sourceK, P)`) | E\* | E\* | E | n/a | staged rows use A0 semantics |
| Q7 Datalog gate | E | E | E | E | E | W, then typed | refuses T or P not equal to sourceK inside a transaction (`QleverQueryExecutor.ts:218-227`) |
| Q8 dependencyState | E | E | E | E | n/a | W | marker and answer from one request |
| Q12 sweepPage | n/a | E when `h <= b` | n/a (API takes a number) | n/a | n/a | returns `eligible: false, rows: []` | the empty array is a fail-open shape, defect D-Q2 |
| X1 A0 SQL | E | E | E\* | E\* | E | **answers** (no check in `queryRows`) | single statement, single snapshot |
| X2 P4 default bounds | E | E | E\* | E\* | E (keeps all-time) | answers | exact only while every version has `_valid_from` 1970 and no `_valid_to`; defect D-X2 |
| X3 in-transaction | E | E | E\* | E\* | E | n/a | |
| X4 Datalog | E (pinned once) | E | E\* | E\* | E | answers | |
| X5 native | E | E | E\* | E\* | E | R (`NativeQuery.ts:80-82`) | validAt default from `Date.now()`, not the runtime clock (D-X3) |
| X6 maintained | E (pinned once) | E | E\* | E\* | n/a | R (`MaintainedQueries.ts:88-93`) | generation identity includes the whole basis |
| X8 P2X | E | E | **unstable** (D-C1) | **unstable** (D-C1) | E | answers | positions are engine time; `recorded_at` is client time |
| D1 current db | E (after `d/sync`) | E | E\* | E\* | E | **answers as if P were the head** | D-D3 |
| D2 as-of | n/a | E | E\* (row filter) | E\* | n/a | n/a | `as-of` picks t of the first position `>= P`; rows above P removed by the row filter |
| D3, D4 held | E at sourceK | E | E\* | E\* | E | n/a | 120 s TTL, then `SnapshotExpired` |
| D6 multi-request | **X** (each request syncs) | E (position sent with each request) | **X** for the latest part | E | n/a | answers | D-D1 |
| D8 dependencyState | E | E | E | E | n/a | answers | reads the whole scope every call (D-D5) |

"E\*" is the key pattern: on every lane except H1 the store holds every row version ever written, so the row filter can answer any
combination of T and P. That is why only H1 failed. Every planned P4 store (R24's current structure, R29's `:f/live` path, an XTDB
`current_*` table) trims the row set by position, and so moves from E\* to the H1 failure unless it is designed for T.

### 3.2 Why a position-retired store cannot answer T or TP (the F1 class, stated generally)

A store D keeps unretracted rows and rows retracted after a horizon h. At a basis (V, T, P) with `P >= h`, a row r is visible when
`recorded_position(r) <= P`, `recorded_at(r) <= T`, and not (`retracted_position(r) <= P` and `retracted_at(r) <= T`).

1. **Purge hole.** A row with `retracted_position <= h <= P` and `retracted_at > T` is visible, and D has deleted it.
2. **Pull hole.** Even before any purge, H1's pull asks only for retired rows with `rpos > b` (`sqlite-worker.ts:158`), so a row retracted
   at or below P is never returned. This is why the verifier's step 5 (moving H past B) did not change the 30.
3. **Exact repair without changing stamps** needs both: the pull returns retired rows with `pos <= b AND (rpos > b OR retracted_at > T)`
   (needs an index or column on `retracted_at`; the row is JSON today, `sqlite-worker.ts:67`), and eligibility adds a record-time horizon
   `hT` = the largest `retracted_at` among purged rows, with eligibility `b >= h AND (T absent OR T >= hT)`. `hT` is one more marker column
   written in the purge transaction (`sqlite-worker.ts:196-202`). Valid time needs nothing: H1 never trims by valid time.
4. **Repair by changing stamps** (ruling R31-a): if `recorded_at` and `retracted_at` are monotone in position, then
   `visible(V, T, P) = visible(V, P*)` with `P* = min(P, last position stamped <= T)`, and H1 answers exactly with no new column.

### 3.3 Datomic: current versus history, and what `as-of` reads (R29's open contradiction)

**Ruling proposed: Datomic separates current from history; R18 line 97 is wrong at the index level; DA01 does not yet use the split.**

1. **Official.** The filters reference says a "now" database is unfiltered and "sees only the present", so "queries about 'now' are as
   efficient as possible" (section "The Present Pays No Penalty", https://docs.datomic.com/reference/filters.html). `as-of` returns the
   database "ignoring any transactions after that point" and takes a t, a tx id or an instant; an instant is less precise than t.
2. **Unofficial internals** (https://tonsky.me/blog/unofficial-guide-to-datomic-internals/): every index except the log has a current part
   ("latest assertions only"), a history part (datoms since changed or retracted) and an in-memory part; an `as-of` read merges all three
   and ignores datoms after T, reusing the latest current index rather than an old version of it. Eva, an open Datomic-style system,
   documents the same design (current indexes elide retracted datoms; history indexes keep them with the retracting tx). This is
   secondary evidence; DA03's io-stats run (R29 open question 6) is still the direct test.
3. **What `as-of` reads in DA01.** `at-position` maps P to the transaction of the first Triplex position `>= P` and returns
   `(d/as-of db t)` (`storage.clj:122-133`). That view includes `:f/live` datoms retracted after t and hides retraction attributes added
   after t, so with the row filter (`storage.clj:151-157`) it is exact for P, T and TP. For the 80% of the trace that reads at the latest
   named position, `p >= last key` returns the unfiltered db (`storage.clj:132`) and pays no history merge. The 15% "within the last
   hour" and 5% "up to 90 days" reads pay the three-part merge.
4. **Why DA01 does not benefit.** Facts are entities whose identity, subject, attribute and value datoms are never retracted; only `:f/live`
   is (`storage.clj:47-61, 84`). Reads enumerate through `:f/subject` or `:f/id` (`storage.clj:164-167`), so every fact ever asserted for
   a subject stays in the current index and is read and filtered. Current-pull cost grows with history depth on Datomic exactly as R24
   found for XTDB under Triplex's re-insert pattern. P4 flatness needs reads through `:f/live` (`(d/datoms db :avet :f/live subject)` or
   `:vaet`).
5. **The trap when DA03 adds the `:f/live` path.** In `as-of t_P`, `:f/live` lists rows live at position P. A TP basis also needs rows
   retracted at or below P with `retracted_at > T`. So the `:f/live` path must refuse or fall back to `:f/subject` enumeration for any
   basis that names T, unless ruling R31-a lands. This is F1 again, on a third lane, before it is built.

### 3.4 Open-ended latest and the resolution of "now"

1. **Position.** QLever resolves latest to `broker.head()` and waits for it to be durable (`BrokerStorageAdapter.ts:239-242, 276-283`);
   XTDB uses the snapshot of its single statement, or resolves the position once for multi-statement reads (`XtdbQueryExecutor.ts:174-181`,
   `NativeQueries.ts:66-80`); Datomic syncs per request (`main.clj:75`), which is correct for one request and wrong for several (D-D1).
2. **Valid time.** Core resolves an omitted `validAt` from the runtime clock (`TriplesLive.ts:573, 691`). Four places fall back to
   `Date.now()` instead: `XtdbQueryExecutor.ts:165`, `NativeQueries.ts:85` (XTDB native, always), `QleverQueryExecutor.ts:277`,
   `DatomicQueryExecutor.ts:47`. Under a deterministic runtime (`runtime/Runtime.ts:78`, fixed `startTime`) a pull and a native query
   with the same omitted `validAt` resolve different instants (D-X3).

---

## 4. A route-equivalence harness all three lanes can adopt

### 4.1 Contract

For one seeded write history and one basis, every route of a lane either returns exactly the O-REPLAY answer or refuses with a typed
error from the route's declared refusal set. Equal answers between routes are necessary but not enough: two routes can agree and both be
wrong (Q4 and a trimmed `:f/live` path would agree on 30). So the reference is the oracle, and route-to-route equality is a second check
that needs no oracle and can run on every commit.

| Rule | Check |
| --- | --- |
| HE-1 exactness | every answering route's row-version set equals O-REPLAY's at the requested basis (fields compared: id plus every row column, canonical JSON) |
| HE-2 cross-route | for the identical request object, every answering route returns the same set |
| HE-3 declared refusal | a route refuses only shapes its eligibility table (section 3.1) marks R or W, and only with an allow-listed error (`BasisNotAvailable`, `ReplicaUnavailable`, `SnapshotExpired`, `DatalogValidationError` "not yet qualified", `RangeError` "unavailable") |
| HE-4 availability | for every shape the lane must serve (L, P, T, TP, H within retention), at least one route answers |
| HE-5 reproducibility | the identical request repeated after more commits, a horizon purge, a replica catch-up and a cache reset returns the same set (the `temporal-r8` pattern) |
| HE-6 no fail-open shapes | an ineligible store never returns an empty row set with a flag; the harness treats `rows: []` plus `eligible: false` reaching any caller as a failure |
| HE-7 echo | when a route reports the basis it used (`ResolvedBasis`, `snapshot`, receipts), the echo equals the driver-recorded request (TARGETS 1.1 P1 item 4) |

### 4.2 The history generator

Seeded, deterministic, and small enough to run offline in seconds (default 6 subjects, 40 commits, depth up to 10 versions per
attribute), with a large profile for the live lanes.

| Operation | Why it is in the mix | Weight |
| --- | --- | --- |
| assert one fact | baseline | 20% |
| assert a group of 5 to 50 facts on one subject (TARGETS 2 size bands) | F1's 40-fact shape | 15% |
| retract one fact | the H1 retired path | 10% |
| retract a group in one transaction (the "10 of 40" shape) | F1 exactly | 5% |
| cardinality-many: two live values of one attribute, then retract one | the per-id merge in overlays and `d/with` | 10% |
| same-transaction retract and assert (replace) | old and new version at one position; `rpos == pos` for asserted-and-retracted rows | 10% |
| assert and retract the same new row in one transaction | `retired_rows.rpos == pos`, never in `live_rows` | 3% |
| valid-time edit: retract and re-assert with a bounded `validFrom`/`validTo` 30 days back (TARGETS 2 corrections) | valid-time edges; XTDB "finite valid_to is never current" (R18 2.3) | 10% |
| future-dated fact (`validFrom` after now) | `nextTemporalBoundary` in `dependencyState` | 3% |
| nested transacts in one callback | interior ordinal cuts (R-CUT-5, FX-NESTED-CUTS) | 4% |
| claims-only and position-only commits | Datomic metadata path (`storage.clj:69-74`) | 3% |
| aborted commit (CAS conflict) | abort gaps (FX-ABORT-GAP) | 2% |
| concurrent commits on disjoint subjects with controlled staging order | D-C1: stamp order differs from commit order | 5% |

**Clock control.** The generator drives a test clock through the runtime (`RuntimeServices`), so it can (a) produce same-millisecond
stamps, (b) stage A before B and commit B before A, (c) step the clock backwards once. Each commit's receipt (position, instant) is
recorded by the driver, never taken from the engine echo.

**Retention events.** Between commits the generator may purge H1 to a pinned or unpinned horizon, evict the overlay, let the replica
catch up, request a Datomic index job (`d/request-index`), and force an XTDB block flush and compaction where the lane exposes one.

### 4.3 The basis generator

For a history with committed positions `P_1 .. P_n` (including interior ordinals) and stamps `T_1 .. T_n`:

| Family | Values |
| --- | --- |
| P | every `P_i`, every interior ordinal, `P_i + 1` inside an abort gap, the horizon h, `h - 1`, head, head + 1 (future) |
| T | every `T_i`, `T_i - 0.5`, `T_i + 0.5`, ties, a wall-clock T after the head stamp (future record time) |
| TP | the product of a sample of both, deliberately including "T earlier than P" (F1) and "T later than P" |
| V | every `validFrom` and `validTo` in the history, each plus and minus 1, now, and an omitted `validAt` |
| H | every entity at every P |

The default run takes all P and T values and a 200-basis sample of TP times 3 V values; the full run takes the product.

### 4.4 Forcing each route

The same request object is replayed once per forced route. Forcing is a fixture concern: product code gets at most a test-only option
per derived store, never a branch in the request.

| Lane | Route | How it is forced | Existing hook |
| --- | --- | --- | --- |
| QLever | Q1 replica | let the applier catch up (`awaitReplica`) | live: `test/broker-qlever.test.ts`; offline: the verifier's row-content `ModelReplica` in `lab/verify/P2Q/tests/harness.ts` |
| QLever | Q2 overlay | pause the applier (`maxApplyCommands: 0` or the controllable replica refusing updates) with `retainPublishedMs` large | `test/broker-fixes.test.ts:60-110, 281` |
| QLever | Q3 source after eviction | pause the applier, `retainPublishedMs: 0` | `test/broker-qlever.test.ts:155` |
| QLever | Q4 H1 | replica client throws an unreachable error on answer requests; basis without T; `h <= b` | `lab/verify/SQL01/review.test.ts:63` outage stub; `test/broker-fixes.test.ts:66` |
| QLever | Q5 source in outage | same stub; and purge H1 above b with no pin; and a T-shaped basis | `review.test.ts`; `test/sqlite-broker.test.ts:88-118` |
| QLever | H1 disabled | proposed test-only `BrokerAdapterOptions.h1: false` so Q4 requests take Q5 | new (one line at `BrokerStorageAdapter.ts:326`) |
| QLever | Q7 Datalog, Q8 dependencyState | as Q1 and Q2, plus an incarnation reset between requests | `test/broker-fixes.test.ts:208-300` |
| XTDB | X1 versus X2 | `currentReadTemporalBounds: "all-valid-time"` versus `"default"` on the same history | `exp/P4-current-path` `test/current-read-bounds.test.ts` |
| XTDB | X4 SQL versus XTQL | executor language switch | `test/query-integration.test.ts`, `test/computed-query.test.ts` |
| XTDB | X5 native SQL versus XTQL | `language` argument | `test/native-query.test.ts` |
| XTDB | X6 cold versus warm | first call builds, second call reuses; a new scope or changed `maxRows` forces a rebuild | `test/maintained.test.ts` |
| XTDB | uncompacted versus compacted | read before and after a block flush and one compaction job (recency pruning applies only after compaction, R24 1.1 item 3) | new; needs the live engine |
| XTDB | X8 | `commitPath: "subject-stamp"` | `exp/P2X-xtdb-commit-feed` `test/subject-stamp.test.ts` |
| Datomic | D1 versus D2 | the same P read once at the head (D1) and again after one more commit (now D2) | `test/adapter.test.ts` |
| Datomic | cache cold | `storage/forget!` the P-to-t map, or restart the gateway | `gateway/src/triplex/gateway/selftest.clj` |
| Datomic | memory index versus durable segments | read, then `d/request-index` and wait, then read again (the current and history parts change; answers must not) | new |
| Datomic | D3, D4 | read inside `withTransaction` before and after staging | `test/adapter.test.ts` |
| Datomic | D6 | a rules query and an `optionalProjection` query with a commit injected between gateway requests (wrap the client's `request`) | `test/query.test.ts` |

### 4.5 Comparison

1. **Canonical form.** Each answer becomes a sorted array of canonical row JSON (all `TripleRow` columns, numbers as exact strings,
   `-0` preserved as the lanes already do). Datalog answers become sorted canonical binding tuples. Order is not compared unless the
   query has `orderBy`.
2. **Oracle.** O-REPLAY runs once per history over the driver-recorded commits and answers every generated basis
   (`lab/oracles/replay`, rules R-CUT-*, R-ENT-*). For the fast offline loop, a TypeScript fold of the driver's commit log with the
   visibility predicate of section 1 serves as a second reference; it is not independent of the kernel, so a run that only used it cannot
   close an obligation.
3. **Outcome record.** Per (history seed, basis, route): `answer(hash, count)` or `refuse(error tag)`, plus the route actually taken (the
   QLever `onRead` event, `BrokerStorageAdapter.ts:350-358`; XTDB and Datomic need a similar hook). A route that was forced but not
   taken is a harness failure, so a regression in forcing cannot pass silently.
4. **Verdict.** HE-1 to HE-7 per record; the receipt binds the generator source hash and the seed (TARGETS 2.1 item 5).

### 4.6 Making a route refuse instead of answer

1. **One eligibility function per derived store,** evaluated inside the same snapshot the read uses (as `sqlite-worker.ts:155-157` does
   for H1): `eligible(store, basis, snapshot) -> ok | refuse(reason)`.
2. **The function's inputs are all three basis fields,** never only the position. For H1 today: refuse when T is named (until R31-a or
   the `hT` repair). For R24's current structure and Datomic's `:f/live`: the same.
3. **Refusal is an error, not a flag.** Replace `{eligible: false, rows: []}` (`sqlite-worker.ts:157`) with a typed
   `BasisNotAvailable` thrown from the worker; callers that want to route on catch it. This removes the fail-open shape for every future
   caller of `pullAt` and `sweepPage`.
4. **A future basis waits or refuses everywhere.** QLever already does (`awaitResolved`). XTDB `queryRows` and Datomic `read-rows`
   should compare P with the committed position read in the same snapshot and refuse when P is beyond it. With R31-a, the same check
   applies to T against the head's stamp.

### 4.7 Where it plugs in

| Package | File | What to add |
| --- | --- | --- |
| testkit | `packages/testkit/src/index.ts` (next to `triplesConformanceCases`, line 82) | `makeRouteEquivalenceCases({ seed, profile, routes })`: the generator, basis families, canonical form and HE-1 to HE-7, parameterised by a `RouteFixture` (`{ lane, routes: { id, shapes, force(), taken() }[] }`). Public-API level, so every lane runs the same cases |
| QLever | `test/sqlite-broker.test.ts` (H1 versus frame replay, line 88) | extend the replay check to T and TP bases and to `hT` once added |
| QLever | `test/broker-fixes.test.ts`, `test/broker-qlever.test.ts`, `test/storage.test.ts` (already imports `triplesConformanceCases`, line 23) | the QLever `RouteFixture`: offline Q2 to Q8 with the controllable replica, live Q1 |
| QLever | `lab/verify/SQL01/review.test.ts` | keep the F1 exact-request regression; generalize it into the generator's "group retract" plus TP family |
| XTDB | `test/conformance.test.ts`, `test/maintained.test.ts`, `test/native-query.test.ts` | the XTDB `RouteFixture`: X1, X3 to X7; X2 on `exp/P4-current-path` in `test/current-read-bounds.test.ts`; X8 in `test/subject-stamp.test.ts` on P2X |
| Datomic | `test/adapter.test.ts`, `test/query.test.ts` (DA01) | the Datomic `RouteFixture`: D1 to D8, with the commit-injection wrapper for D6; DA01 does not yet import the testkit |
| Lab | `lab/oracles/replay` | a batch mode that answers a list of bases for one history in one process |

---

## 5. Defects and risks in the current code

Severity: **High** gives a wrong answer for a named basis today; **Medium** gives a wrong answer under a reachable schedule or blocks a
priority bar; **Low** is latent or needs an unusual caller. Every reproduction is a sketch; none was run.

| ID | Lane | Severity | Summary | Location |
| --- | --- | --- | --- | --- |
| D-C1 | all | High | record time stamped at staging, not at decision; a `recordedAt` answer changes after it was served | `core/src/store/TriplesLive.ts:308-309, 326`; QLever `BrokerStorageAdapter.ts:509, 702`; XTDB P2X `XtdbStorageAdapter.ts:955, 1088`; Datomic `storage.clj:70-72` |
| D-C2 | core | Medium | public reads cannot name a position, so `recordedAt` is the only pin outside cursors | `core/src/Temporal.ts:11-14, 40-55`; `store/Triples.ts:236-244` |
| D-D1 | Datomic | High | multi-request Datalog (rules, optional projection) reads a different db per request when no position is named | `src/DatomicQueryExecutor.ts:47-70, 75-118, 119-145`; `gateway/.../main.clj:75` |
| D-Q1 | QLever | High (fixed by bypass) | F1: H1 answered TP from a position-only store; residual: H1's pull predicate is also position-only | `sqlite-worker.ts:158, 196-202`; bypass at `BrokerStorageAdapter.ts:324-332` |
| D-Q2 | QLever | Medium | ineligible H1 pulls return `rows: []` with a flag; `sweepPage` forwards it unchanged | `sqlite-worker.ts:157`; `broker/log.ts:412-415`; `broker.ts:692-694` |
| D-D2 | Datomic | Medium (latent) | R29's `:f/live` current path repeats F1 for T and TP | R29 section 4 row 4 and "P4" row; `storage.clj:55, 84` |
| D-Q3 | both | Medium (latent) | R24's current structure "live plus retracted after H" repeats F1 for T and TP | `lab/research/R24-current-path-and-sweep.md` section 0 |
| D-D3 | Datomic | Low | a position beyond the head is answered from the current db as if it were the head | `storage.clj:132`; `src/DatomicStorageAdapter.ts:58-88` |
| D-X1 | XTDB | Low | A0 pulls and Datalog answer a position beyond the committed cut; native and temporal routes refuse it | `XtdbStorageAdapter.ts:111-123`; `XtdbQueryExecutor.ts:165-181` versus `NativeQuery.ts:80-82`, `TemporalQueries.ts:85-91` |
| D-X2 | XTDB | Low (latent) | P4 arm X1 is exact only while no code writes native valid time on `tx_assertions`; no probe enforces it | `exp/P4-current-path` `XtdbStorageAdapter.ts:80-102` |
| D-X3 | XTDB, QLever, Datomic | Low | omitted `validAt` falls back to `Date.now()` in executors and XTDB native, the runtime clock elsewhere | `XtdbQueryExecutor.ts:165`; `native/NativeQueries.ts:85`; `QleverQueryExecutor.ts:277`; `DatomicQueryExecutor.ts:47` |
| D-D4 | Datomic | Medium (P1) | the P-to-t map is rebuilt by scanning every `:triplex.tx/position` datom whenever the db basis changes, so the first read after each commit is O(commits) | `storage.clj:122-133` |
| D-D5 | Datomic | Medium (P4, P5) | `getByEntities`, attribute patterns and `dependencyState` enumerate every fact in the scope | `storage.clj:167`; `src/DatomicStorageAdapter.ts:375-381, 392` |
| D-D6 | Datomic | Medium (P1) | every read runs `d/sync`, a round trip to the transactor, so 256 readers load the writer's process | `main.clj:10-11, 75` |
| D-Q4 | QLever | Low (P1 under outage) | outage reads that name T scan the selection's whole source rows; a scope-wide `entityPage` scans the scope | `BrokerStorageAdapter.ts:333-335`; `broker.ts:682-689` |

### 5.1 D-C1: record time is not a prefix of the log

**What the code does.** `transact` takes `timestamp = yield* now` before it allocates a position (`TriplesLive.ts:309` then `:326`),
and `now` is `Date.now()` (`RuntimeServices.ts:14`) or a fixed `startTime` in deterministic runtimes (`runtime/Runtime.ts:78`). Every
adapter writes that value as `recorded_at` and, on retraction, `retracted_at` (QLever `BrokerStorageAdapter.ts:509, 702`; XTDB P2X
`:955, 1088`; Datomic `storage.clj:70-72` copies the row's value into `:triplex.tx/recorded-at`). The QLever broker binds positions at
decision and leaves stamps alone (`broker/frames.ts:17, 60, 80`: only claim timestamps are carried). XTDB P2X already stamps positions from
XTDB's own system time inside the transaction (`COMMIT_STAMP_SQL`, P2X `XtdbStorageAdapter.ts:60-71`), so on that branch two record
clocks coexist: the position (engine microseconds) and `recorded_at` (client milliseconds).

**Why it matters.** The set of commits with `recorded_at <= T` is not a prefix of positions, and it can grow after a read at T has been
served. TARGETS section 3 requires snapshot reads at a named point in time to be reproducible; HE-5 fails.

**Reproduction sketch (QLever broker, per-subject CAS; offline with the SQL01 outage stub or the P2Q `ModelReplica`).**

1. Test clock at 1000. Fiber A: `transact` on subject X; the callback stages one fact (stamp 1000) and then waits on a `Deferred`.
2. Clock to 1001. Fiber B: `transact` on subject Y commits. Receipt: position `P_B`, instant 1001.
3. `r1 = entity(X, { recordedAt: 1001 })` returns nothing for the staged fact.
4. Release A. A's read set is X only, B wrote Y, so the per-subject guard passes; A commits at `P_A > P_B` with `recorded_at` 1000.
5. `r2 = entity(X, { recordedAt: 1001 })` returns A's fact. Same named basis, two answers.
6. Pagination variant: `entityPage({ basis: { recordedAt: 1001 } })` page one taken at step 3 binds `recordedPosition = P_B`; page two after
   step 4 excludes A, while a fresh page one includes A.

**Scope-wide CAS lanes (XTDB A0, Datomic DA01).** A conflicts and retries with a fresh stamp, so step 4 does not reproduce. A tie does:
two commits stamped in the same millisecond, a read at that T between them, then the second commit. With the deterministic runtime
every commit has the same stamp, so any `recordedAt` read is all-or-nothing.

**Fix (ruling R31-a).** Stamp at decision, monotone in position: QLever broker under the writer lock in the frame it appends
(`max(previous + 1 us, clock)`, rewritten into rows, claims and the receipt `instant`); XTDB P2X `recorded_at = stamp / 1000` from the
same `COMMIT_STAMP_SQL` cell (A0 can do the same with `CURRENT_TIMESTAMP` in the transaction); Datomic from a transactor-side value
(a transaction function, or the transaction's `:db/txInstant`, which the transactor keeps non-decreasing). Then publish a record-time
watermark (the head's stamp) and treat `T > watermark` like a future position: wait, then refuse. Callers that read `instant` before
commit (the kernel, `valid_from` defaults at `BrokerStorageAdapter.ts:511`) need a planner pass before this lands.

### 5.2 D-D1: Datomic multi-request Datalog mixes cuts

**What the code does.** `run` builds `cut = basis ?? { validAt: Date.now() }` and never adds a position (`DatomicQueryExecutor.ts:47`).
Each `evaluate` call is a separate `POST /q` (`:52-70`); each request runs `sync-db` and reads the newest db (`main.clj:75`,
`query.clj:35`). Rules run up to `maxDepth` rounds (`:75-117`) plus the final query (`:118`); `optionalProjection` adds one `rows`
request per distinct entity (`:119-145`). Inside a transaction the held handle pins them; outside, nothing does. `queryAll` sends a
position only with `includeBasis` (`TriplesLive.ts:691-694`).

**Reproduction sketch (`test/query.test.ts`).** Wrap `DatomicClient.request` so that after the first `/q` response it commits, on the
same scope, "retract `:type T` and `:status a` of e1; assert `:status b`". Query `find ?e where [?e :type "T"]` with an optional
projection of `:status`. Expected: one of the two cuts (e1 with `a`, or no e1). Predicted: e1 with `b`, which no cut contains. The
rules variant: insert an edge between round 1 and round 2 of a `reach` rule; the result contains a path built from edges of two cuts.

**Fix.** Resolve the position once when the basis names none (as XTDB does, `XtdbQueryExecutor.ts:174-181`) and send it with every
request, or open a held snapshot (`storage.clj:8-12`) for the duration of the query and release it after.

### 5.3 D-Q1 and D-Q2: H1 after the fix

1. **The bypass is correct and complete for today's callers.** Every adapter read that names T goes to source rows during an outage
   (`BrokerStorageAdapter.ts:326-335`); `sweepPage` takes only a number. No other code path hands H1 a record time.
2. **The residual hole is structural.** H1's pull predicate cannot return a row retracted at or below b (`sqlite-worker.ts:158`), so
   any future attempt to serve T from H1 needs both repairs in section 3.2 item 3, or ruling R31-a.
3. **Fail-open shape (D-Q2).** `pull` returns `{ eligible: false, rows: [] }` for `b < h` or b beyond the last frame
   (`sqlite-worker.ts:157`). The adapter checks the flag (`BrokerStorageAdapter.ts:333`), but `sweepPage` (`log.ts:412-415`,
   `broker.ts:692-694`) forwards the object, so a P5 sweep worker that reads `.rows` evaluates every subject as empty.
   Reproduction: in `test/sqlite-broker.test.ts` after line 113, `(await b.sweepPage(h - 1, ["s"])).rows` is `[]` for a subject with
   facts. Fix: throw a typed `BasisNotAvailable` from the worker.

### 5.4 D-D2 and D-Q3: two planned current stores repeat F1

1. **Datomic `:f/live` (R29, DA03).** In `as-of t_P`, `:f/live` lists rows whose retraction position is after P. A TP basis also needs
   rows retracted at or below P with `retracted_at > T`. Reproduction once DA03 builds it: F1's own schedule (40 asserts at T1/P1, retract
   10 at T2/P2, read `{ recordedAt: T1, recordedPosition: P2 }`): the `:f/live` path returns 30.
2. **R24's current structure** ("live facts plus the facts retracted after a retention horizon H, eligible when `H <= B <= W`").
   Same schedule, same 30. R24's eligibility needs a third clause (T absent, or `T >= hT`) or ruling R31-a.
3. **Not affected:** XTDB's native current tier under Triplex. Triplex re-inserts every row with `_valid_from` 1970 and keeps its own
   columns, so the native split never drops a version a Triplex basis can see (R24 1.1 item 4).

### 5.5 D-D3, D-X1: future positions

1. **Datomic.** `at-position` returns the unfiltered current db for any `p >= last key` (`storage.clj:132`), including `p` beyond the
   scope's position. Reproduction: `read-rows` with `recordedPosition = head + 5` returns the head state; after five commits the same
   request returns more rows. Fix: compare p with `:triplex.scope/position` in the same db and refuse.
2. **XTDB.** `queryRows` and the Datalog executor apply `recorded_position <= P` without checking P against `tx_meta`, so a future P
   answers now and differently later; native (`NativeQuery.ts:80-82`), temporal (`TemporalQueries.ts:85-91`) and maintained
   (`MaintainedQueries.ts:88-93`) routes refuse it. Same lane, same basis, different outcome classes (HE-3). On one node a position from a
   receipt is never in the future, so this needs a caller that invents or carries a position across nodes.

### 5.6 D-X2: the P4 arm X1 invariant has no guard

X1's exactness argument is that every `tx_assertions` version has `_valid_from` 1970 and no `_valid_to`
(`exp/P4-current-path` `XtdbStorageAdapter.ts:80-95`). That holds in today's code (no `DELETE`, `ERASE` or `PATCH` of `tx_assertions` in
any XTDB branch read). An erasure design (TARGETS section 7, EXP-O04) or a native-valid-time optimization would break it silently: a
`DELETE` ends native valid time at the statement's time, so the default bounds hide the row while `FOR ALL VALID_TIME` shows it.
Guard: an initialization probe that refuses `"default"` when
`SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE _valid_from <> TIMESTAMP '1970-01-01Z' OR _valid_to IS NOT NULL LIMIT 1` returns a
row, as QLever's compiler probes retirement consistency (`qlever/src/compiler.ts:697`), plus the X1-versus-X2 harness case.

### 5.7 Performance risks found on the way (P1, P4, P5)

1. **D-D4.** After every commit the db basis changes, so the first read rebuilds the whole P-to-t map from AVET
   (`storage.clj:125-131`); concurrent readers race to rebuild it. Use `(d/index-range db :triplex.tx/position p nil)` for an O(log n)
   seek instead.
2. **D-D5.** `getByEntities` passes `entityIds` without an entity pattern, which falls to the `:else` branch and enumerates every `:f/id`
   in the scope (`storage.clj:167`); `dependencyState` reads the whole scope with history on every call
   (`DatomicStorageAdapter.ts:392`). Both grow with the scope, not the request; P4 and P5 measure exactly these reads.
3. **D-D6.** `d/sync` on every request (`main.clj:75`) contacts the transactor; R29's P1 argument assumed reads do not
   (R29 section 6, P1 row). Use `d/db` plus `d/sync t` only when the request names a position above the peer's basis.
4. **D-Q4.** During a replica outage a T-shaped read reads all source rows of its selection; for `entityPage` the selection is the
   whole scope (`TriplesLive.ts:606`). Correct, but P1's 256-reader bar cannot hold through an outage for T-shaped pages.

---

## 6. Proposed rulings for the orchestrator

| ID | Ruling | Moves | Needs Sam? |
| --- | --- | --- | --- |
| R31-a | Record time is stamped at decision, monotone in position, on every lane (broker writer lock, XTDB engine stamp, Datomic transactor value); receipts report the decided instant; a record-time watermark gates T like a future position | P1 (reproducible pins), P4 (lets position-only current stores serve every shape) | No for the lab; it changes the core contract (`instant`), so a planner checks every pre-commit use of `timestamp` first |
| R31-b | Until R31-a lands, every store that retires rows by position refuses any basis that names T: H1 today, R24's current structure, Datomic's `:f/live` path in DA03 | P1 correctness floor | No |
| R31-c | Refusal is a typed error, never an empty result with a flag; every route waits or refuses for a future position (and, under R31-a, a future record time) | P1 | No |
| R31-d | DA01 fix round: pin multi-request Datalog to one position or held snapshot (D-D1); refuse future positions (D-D3); seek the P-to-t map (D-D4); enumerate by subject for `getByEntities` (D-D5) | P1, P4 | No |
| R31-e | Datomic separates current from history at the index level; R18 line 97 gets a superseded note; DA03's P4 path reads through `:f/live` for L and P shapes and falls back to `:f/subject` for T and TP (R31-b) | P4 | No |
| R31-f | Adopt the route-equivalence harness (section 4) in `packages/testkit` as a required gate for any branch that adds or changes a read route (SQL01 merge, EXP-P4, P2X, DA01, DA03, R24's current store) | P1, P4 | No |
| R31-g | Add a position (or an opaque snapshot token) to the public `TemporalBasis`, so callers can pin the receipt position TARGETS 2 calls "the latest committed tx (named exactly)" | P1 | Yes: it changes the public TypeScript API (goal 10) |
| R31-h | Guard P4 arm X1 with an initialization probe for native valid time on `tx_assertions` (D-X2) before any X1 promotion | P4 | No |

**Order.** R31-b and R31-c now (small, protect what exists); R31-d in the next DA01 round; R31-f as the harness brief for a Codex
builder; R31-a as a planner design with a contract version, since it touches the kernel, receipts and the oracle's fixture stamps;
R31-g to Sam with R31-a.

## 7. Sources

- Datomic filters reference: https://docs.datomic.com/reference/filters.html (the present pays no penalty; `as-of` semantics).
- Unofficial guide to Datomic internals: https://tonsky.me/blog/unofficial-guide-to-datomic-internals/ (current, history, memory parts;
  `as-of` merge).
- Eva database state and time (Datomic-style, analogy only): https://cljdoc.org/d/com.workiva/eva/2.0.4/doc/database-state-and-time
- Lab: `lab/research/R18-read-path-feed-sweep-prior-art.md` section 2; `lab/research/R24-current-path-and-sweep.md` sections 0 and 1;
  `lab/research/R29-datomic-lane-design.md` sections 4, 6, 9; `.claude/worktrees/verify-sql01/lab/verify/SQL01/VERIFY.md` F1.
