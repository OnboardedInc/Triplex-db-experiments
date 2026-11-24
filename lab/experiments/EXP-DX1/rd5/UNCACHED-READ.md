# A pinned read of a subject the reader does not hold: where 1.7 ms goes, and what makes it cheaper

DX-RD5, 2026-11-24, branch `exp/DX-RD5-uncached-read` from `origin/exp/DX-INT1` `9e02cf1d2`. Server evidence: the
random-subject windows of 2026-11-23 at 1 billion records (`evidence/DX-SCALE1/pinned-saves-1b-e02/`, 3 read permits;
`evidence/DX-SCALE1/random-1b-d94/`, 6 and 12 permits), and the probe `evidence/DX-SCALE1/rd2-probe/`. Mac evidence:
`evidence/DX-RD5/` (private). Mac times are diagnostic; counts are exact.

**Answer (2026-11-24).**
- **Where 1.7 ms goes:** 1.52 ms of each random subject's 1.71 ms of reader CPU is its 1.76 segment loads (0.69 ms of
  decoding each, plus collecting what decoding allocates: 1.94 MB per subject, 17.8% of the wall in pauses); 0.19 ms is
  the gateway's own work, the same as for a re-read subject. The 14.1 loads of an exchange of eight are 14.1 PostgreSQL
  round trips made one after another inside the read permit (7.2 of its 19.6 ms). A subject needs one EAVT leaf; the
  1 billion reads loaded 1.66 EAVT and 0.11 AVET leaves per subject, and the leaf returned 0.25% of what it decoded.
- **Built, default off, exact on the toy (0 differences in 3 × 30,548 comparisons of whole `/read` answers):** a batch
  prefetch that overlaps the eight subjects' loads (`TX2_READ_PREFETCH`), Datomic's index read-ahead off on the reader
  (`-Ddatomic.readAheadPool=0`), the reader's cache size as an arm setting, and a second read gateway on its own
  machine (launcher, script, window driver).
- **Toy counts (cold, 32 MB cache):** read-ahead off cut storage gets per subject by 34 to 43% and CPU per subject by
  30 to 43%; the prefetch halved an exchange's wall time and moved decoding off the request thread without changing
  the loads.
- **Forecast at 1 billion:** the prefetch alone gives 12 permits' throughput at 3 permits (about 1,700 reads/s, the bar
  still missed); if read-ahead is the 0.66 excess leaves (my lean, not proven), CPU per subject falls to 1.1 to 1.3 ms,
  one 3-core reader does 2,100 to 2,600 reads/s and two such readers about 4,600 (p99 near 100 ms). If it is not, the
  bar needs about 7 reader cores as yesterday's model says.
- **Server commands** (sections 7 and 8): one machine, three configurations, about 50 minutes; two machines, two
  configurations, about 55 minutes. Neither has run.


## 1. Where the 1.7 ms goes (1 billion records, `ref-random-near-head`, 3 permits, 3 reader cores)

Sources: the 859 sampled exchanges of the window (each with Datomic's io-stats and its handler thread's CPU), the
reader's cgroup CPU, its GC log over the window's 90 s, and the same for the re-read window `ref-near-head`
(script: `rd5/breakdown.py` reads the archives).

| Per subject (an exchange carries 8) | Random subjects | Re-read subjects | Difference |
| --- | ---: | ---: | ---: |
| Reader CPU (cgroup) | **1.71 ms** (2.09 cores ÷ 1,219.6 reads/s) | 0.19 ms (1.99 ÷ 10,419.7) | 1.52 ms |
| Handler thread CPU | 1.04 ms (8.29 ms per exchange) | 0.14 ms (1.15) | 0.90 ms |
| Stop-the-world GC (17.8% vs 10.0% of the wall, 3 GC threads) | 0.44 ms | 0.03 ms | 0.41 ms |
| Everything else: read-ahead threads' decoding, Jetty, concurrent GC | 0.23 ms | 0.02 ms | 0.21 ms |
| Storage gets (one SQL round trip each, one segment decoded each) | **1.76**: EAVT leaves 1.66, AVET leaves 0.11 | 0.06 | 1.70 |
| SQL wall time | 0.90 ms (0.51 ms per get, **one after another inside the permit**) | 0.02 ms | |
| Decode wall time | 1.22 ms (0.69 ms per segment, part on read-ahead threads) | 0.03 ms | |
| Allocation | 1.94 MB | 0.24 MB | 1.70 MB |
| Row texts the read walks / returns | 20.1 / 1 (6,289 response bytes per exchange) | the same | |

**So the premium of a random subject is its segment loads: 1.52 ms of reader CPU for 1.76 loads, about 0.86 ms per
load** (0.69 ms of decoding plus the collection of what decoding allocates; decoded segments stay in the object cache
long enough to be copied, which is why the pause share doubles while the allocation rate barely changes: 2,363 MB/s
against 2,489 MB/s re-read). The gateway's own work per subject (identity lookup, the pinned short-cut's checks, the
live row walk, decoding 20 row texts and keeping one, JSON) is the re-read cost, 0.19 ms, and is not where the time is.

**The permit.** Each of the three permits held an exchange for 19.6 ms of wall time (3 ÷ 152.8 exchanges/s), of which
7.2 ms were 14.1 SQL round trips issued one after another. That idle share is why 6 and 12 permits lifted reads/s by
25 to 44% (and why the SQL time per exchange then rose to 9.3 to 14.5 ms: the extra permits queue on PostgreSQL).

**Not the cause:** the as-of view (99.8% of these reads were answered from the current database by the pinned
short-cut), the driver (event-loop p99 10.9 ms), PostgreSQL's core (0.31 cores, about 0.14 ms of its CPU per get).

## 2. What a random subject's read loads

Every random read in the windows asks for field 0 of a subject's first task (its I-9 entity, `acct/<account>/i9:<n>`),
eight subjects per exchange, near the head or at the seed cut. The pinned short-cut answers 99.8% of them from the
current database, so the read is: the identity lookup (`[:triplex.entity/id id]`, an AVET leaf), the short-cut's two
checks on the subject's EAVT range (revision, and that no datom is newer than the pin), and the live row walk on the
same range. Nothing reads AEVT leaves (0 loads), history or the log.

**The segments, measured on a toy of SCALE1's own subjects** (`deepOwnFacts`, two accounts of 1,000 subjects written
in the loader's frames of up to 2,000 facts, then indexed; `probe.clj` walks every entity in entity order with
read-ahead off, so each load is one more leaf; gate-06):

| | Toy | 1 billion |
| --- | --- | --- |
| Datoms per EAVT leaf | 334 (732,510 datoms in 2,193 leaves) | not counted |
| Row text per leaf | 128,000 characters | not counted |
| Stored bytes per segment (all values in Datomic's table: leaves, directories, log) | median 19.5 KB, mean 35.8 KB, p99 261 KB | about 60 KB per get (the probe's TOAST pages per get) |
| The read subject's own rows | 20 rows, 6,442 characters (5.0% of its leaf's row text) | 20.1 rows per subject (160.8 per exchange) |
| What the read returns | 1 row, about 320 characters (0.25% of the leaf's text) | 1 row; 786 bytes of JSON per subject |
| Who else is in the leaf | the same subject's other 29 or so entities and its neighbours: entities are numbered in the frame's fact order, so read subjects are never next to each other (2,000 runs for 2,000 subjects) | the loader wrote the same frames |
| Leaves per cold read of one subject (read-ahead off) | 1 in 95% of the reads that loaded any (326 of 344), 2 in 4.4%, 3 or more in 0.9% | **1.66 EAVT + 0.11 AVET** |

**So one leaf per subject is what the layout requires; the 1 billion reads loaded 0.66 more EAVT leaves per subject
than that.** The decode is Datomic's: it decodes the whole leaf (about 20 to 60 KB stored, 0.5 MB in the object
cache) for 0.25% of its text. Decoding only what the read asks for would mean changing Datomic, which is ruled out; the
gateway's own decoding (20 row texts per subject, 0.06 ms) is not worth narrowing further (the early filter already
skips building the 19 rows it drops).

**Where the 0.66 extra EAVT leaves come from: not established; two candidates, one testable on a server.**
1. **Datomic's index read-ahead.** Datomic's index iterator (`datomic.index.TreeIter`) submits the following segments
   to a five-thread read-ahead pool (`datomic.cache/read-ahead`; `datomic.readAheadPool` = 5 in the reader's native
   settings). A point read never uses them. Their loads run on the pool's threads, so the sampled per-exchange count
   does not include them (on the toy: 2,858 storage gets by PostgreSQL's own count for a full walk against 1,210 in the
   walking thread's io-stats). What they do to the reads' own count: they fill the cache with leaves nobody reads and
   evict what reads do reuse. On the cold toy, read-ahead off cut the reads' own loads by 23 to 38% and all storage
   gets by 34 to 43% (section 4). At 1 billion the reused segments are the directory and identity segments (174
   directory probes per exchange, 80% of cache requests hit), which is consistent with the excess; nothing proves it.
2. **Directory segments larger than the cache keeps.** 1 billion records need on the order of a million EAVT leaves
   and therefore thousands of directory segments; if the 3 GiB cache under 1.5 GB/s of decoded leaves cannot keep them,
   each read reloads part of a directory. Command 1 separates the two (read-ahead off at 3 GiB; the cache at 1.5 GiB).

## 3. The options built (all default off; exactness gated)

| Option | Setting | What it does | Saves per subject at 1 billion, and why |
| --- | --- | --- | --- |
| **Batch prefetch** | gateway `TX2_READ_PREFETCH=1` (`TX2_READ_PREFETCH_THREADS`, default 16); launcher `DX_READ_PREFETCH=1`; random arm `DX_RD5_READ_PREFETCH=1` | Before a named-subject read of two or more subjects, each subject's identity lookup and EAVT range is walked on a small pool (the request thread takes the first), and the read then runs unchanged on the same database values and finds them cached. `uncached.clj`, called from `lean/rows`. Not for row-ID reads, interiors, history or scans. A failed touch is counted and ignored | **No CPU.** It removes the serial waits: 14.1 round trips × 0.51 ms = 7.2 ms of each 19.6 ms permit hold become one overlapped wave, so three permits keep three cores as busy as twelve did (12 permits: 1,747 reads/s at 13 to 14 ms of queued SQL per exchange). Forecast: reads/s of the 12-permit run at 3 permits, the exchange's permit hold about halved, and the "permits about twice the cores" rule replaced by permits = cores |
| **Datomic read-ahead off** | JVM `-Ddatomic.readAheadPool=0` on the reader; launcher `DX_READ_AHEAD_OFF=1`; random arm `DX_RD5_READ_AHEAD_OFF=1` | Datomic's iterator no longer fetches the segments after the one a read needs. Configuration of the reader only; Datomic is not changed. Caching only, so answers cannot change | If read-ahead is the excess (section 2): 0.5 to 0.7 fewer loads, 0.45 to 0.6 ms less reader CPU per subject (1.71 → about 1.2 ms). If not: under 0.1 ms. **Cost:** scans lose read-ahead (history reads, journal walks and whole-scope reads load their next segment on demand): not measured |
| **Reader cache 1.5 GiB** | random arm `DX_RD5_READ_CACHE_MIB=1536` (the launcher's existing size) | Half the object cache, the 6 GiB heap kept | Less copying of decoded segments that random reads never reuse (the collector's pauses were 0.44 ms per subject). Also the test of candidate 2 |
| **Read permits matched to storage waits** | existing `DX_RD3_READ_PERMITS` | — | With the prefetch, permits = cores; without it, the measured rule (12 > 6 > 3) stands |
| **Second reader on another machine** | `DX_REMOTE_READER_HOST`, `rd5/second-reader.sh`, `DX_RD5_SECOND_READER` | Section 6 | Cores, not cost per subject |

**Not built:**
- **A cache of decoded rows per subject instead of whole segments.** Bytes per subject both ways: a subject's 20 live
  row texts are 6.4 KB of characters, about 8 KB on the heap with their strings and the entry; the segment way costs a
  whole decoded leaf per random subject, about 0.5 MB (3 GiB held 6,100 to 6,400 segments). So 3 GiB holds about
  390,000 subjects as rows against about 6,200 as segments (63 times as many), and the 1 billion windows' million
  subjects fit in about 8 GB as rows against 0.5 TB as segments. Why it is not built today: (1) it is exact only with
  invalidation from every transaction the peer applies (the transaction report queue), including a race between a read
  that fills an entry and a save that lands after the read's basis; the revision cannot key it, because reading the
  revision is the load it should avoid; (2) it fills only from reads (no keep-warm), so a 90 s window at about 2,000
  reads/s fills at most 180,000 of a million subjects (hit share about 8% inside the window), and its gain shows only
  in steady state, which no server test measures; (3) a whole-subject pull is about 30 entities, eight times larger.
  It is the only lever found that makes a random subject cost what a re-read one costs (0.19 ms); worth a design
  page with the owner's view on (2).
- **Decoding only what the read returns:** needs a change inside Datomic (ruled out).
- **One batched storage fetch for the eight subjects:** Datomic's storage interface fetches one segment per call; the
  prefetch gets the same overlap without changing Datomic.

**Exactness gates (Mac).** `rd5/gate.sh` (one ordinary heavy token, one lab container: PostgreSQL, a transactor, the
writer and three readers with a 32 MB object cache, all both pinned options, the early filter, 3 permits): the merged
tuned reader (8081) against the same with the prefetch and read-ahead off (8082) and with the prefetch alone (8083).
Every comparison is the full `/read` answer of the reference reader against each treatment:

| Run (source) | Toy | Comparisons | Rows | Differences | Prefetch batches (failures) |
| --- | --- | ---: | ---: | ---: | --- |
| gate-06 (the tree committed as `dc7b8c1d5`) | 2 accounts × 1,000 subjects, 275,270 facts, 264 saves after the seed | 30,548 | 1,709,361 | **0** | 15,200 and 15,200 (0) |
| gate-07 (`dc7b8c1d5`) | 10 accounts × 200, 234,870 facts, 272 saves | 30,548 | 1,686,069 | **0** | 15,200 and 16,640 (0) |
| gate-08 (`bd460b8d7`, the merge with `23b7df344`) | 10 accounts × 200, 234,870 facts, 265 saves | 30,548 | 1,686,057 | **0** | 15,200 and 16,993 (0) |

Each run compares field 0 by pattern in batches of eight at 48 positions (8 inside the seed, 40 from the seed's end to
the aged head) for every subject, whole subjects at 6 positions and both valid times, history reads of 400 subjects,
historical worlds (reach) of 64 subjects at 6 positions, and, while saves run through the writer, field 0 at the aged
head and one position behind the moving head. Gates 07 and 08 also run the server arm's own window
(`pinnedWindow`, random subjects at the seed cut, every value checked against the seed's): one reader, then odd seats
on a second reader (gate-07: 15,608 and 20,296 reads, 0 wrong, 0 errors, the second reader took 1,440 of 2,541 exchanges; gate-08:
26,672 and 28,568 reads, 0 wrong, 0 errors, 1,793 of 3,575 exchanges on the second reader). Also: gateway selftest 29 tests, 54,160 assertions, with the prefetch off and on (merged head);
`rd5/prefetch-test.clj` (known, unknown and single subjects, no database change, 0 failures); the saves-arm harness
(`rd1/saves-gate/harness.ts`) passed. gate-05 is kept as a record of a fault the gate caught: the prefetch called
`count` on Datomic's datoms iterable, every touch failed and was ignored (121,600 failures, 0 differences), fixed before
gate-06.

## 4. Counts on a toy made cold on purpose (gate-06; counts exact, times diagnostic)

The probe (`probe.clj`) runs in its own peer JVM with a 32 MB object cache against the 275,270-fact toy (2,193 EAVT
leaves; the cache holds a small share), calling the gateway's `storage/read-rows` with the merged tuned reader's
settings, near the head. "Gets" are PostgreSQL's own count of index fetches on Datomic's table (every storage get of
the JVM, read-ahead threads included), read 11 s after each arm; "own loads" are the reading threads' io-stats.

| Configuration | Single cold reads: gets / own loads per subject | Exchanges of 8, one at a time: gets per subject; wall per exchange | Closed loop, 16 clients × 8: gets per subject | CPU per subject | Reads/s |
| --- | --- | --- | --- | --- | ---: |
| Merged tuned reader, 3 permits | 1.00 / 0.85 | 0.60; 7.3 ms | 0.56 | 0.60 ms | 4,042 |
| + prefetch | 0.85 / 0.77 | 0.69; 5.3 ms (median 2.9 against 5.9) | 0.58 | 0.58 ms | 4,940 |
| 6 permits, no prefetch | 0.85 / 0.78 | 0.50; 3.5 ms | 0.57 | 0.50 ms | 6,171 |
| read-ahead off | 0.66 / 0.66 | 0.35; 3.6 ms | 0.33 | 0.40 ms | 5,802 |
| read-ahead off + prefetch | 0.68 / 0.67 | 0.39; 4.0 ms | 0.32 | 0.37 ms | 7,626 |

**Replicate on the merged head (gate-08, ten accounts of 200 subjects, 234,870 facts):** closed-loop gets per subject
0.418 → 0.230 with read-ahead off (−45%), 0.198 with the prefetch as well; CPU per subject 0.492 → 0.307 ms (−38%);
reads/s 5,272 (merged) / 6,166 (prefetch) / 5,870 (6 permits) / 8,183 (read-ahead off) / 8,070 (both). Single cold
reads 0.83 → 0.655 gets per subject (−21%), exchanges of eight 0.548 → 0.464 (−15%).

- **Read-ahead off:** gets per subject down 34% (single), 43% (exchanges), 40% (closed loop), and the reads' own loads
  down 23 to 38%; CPU per subject down 30 to 43%. The toy cache hits more than 1 billion's does (closed-loop gets 0.33
  to 0.58 per subject against 1.76), so the size of the effect at 1 billion is the server question.
- **Prefetch:** the exchange's handler-thread CPU fell from 4.1 to 1.6 ms (decoding moved to the pool) and its median
  wall from 5.9 to 2.9 ms; CPU per subject unchanged within noise. The closed-loop gain (+22%; +67% in gate-05's
  repeat) is the permits no longer idling; six permits without it did as well on the toy, where a round trip is short.
- Times are from a Mac shared with five builders: they rank, they do not size.

## 5. Forecast at 1 billion (the 256-reader bar for random subjects)

| Reader | CPU per subject | Reads/s on 3 cores | 256 seats p50 / p99 | Cores for 3,600 reads/s (p99 about 100 ms) |
| --- | ---: | ---: | --- | ---: |
| Measured, 12 permits | 1.6 to 1.7 ms | 1,564 to 1,747 | 145 / 258 to 293 ms | 6.5 to 7 |
| Prefetch, 3 permits | 1.6 to 1.7 ms | 1,500 to 1,850 | 140 to 170 / 240 to 310 ms | 6.5 to 7 |
| Prefetch, read-ahead off, if read-ahead is the excess | 1.1 to 1.3 ms | 2,100 to 2,600 | 98 to 120 / 160 to 210 ms | 4.5 to 5 |
| The same on two readers of 3 cores (command 2) | | 4,200 to 5,000 | 51 to 61 / 85 to 115 ms | — |
| A row cache in steady state (not built) | about 0.2 to 0.3 ms | 9,000+ | inside the bar | 1 to 2 |



## 6. A second reader: what it costs and buys

**Can two read gateways serve one database side by side today? The store can; the launcher cannot.**

- **The store.** A read gateway is a Datomic peer. Any number of peers can read one database: each reads segments from
  PostgreSQL and receives every transaction's novelty from the transactor. A pinned read names its position, and a
  gateway waits for its own peer to reach that position before answering (`storage/await-position`, up to the
  request's `basisWaitMs`, default 500 ms, else 409 `BasisNotAvailable`), so a pinned read is exact on either reader.
  An unpinned read on either reader can trail an acknowledged save (H11.4); the "at least this position" read built
  this morning (`exp/DX-RD4-at-least-read` `dd96da3b2`) closes that for a reader holding a receipt, on any reader. The
  bounded journal and history routes (`exp/DX-JRN1-journal-bounds` `adf744f6b`) bound each request under each
  gateway's own permits, so a second reader adds its own journal capacity. Neither is needed for the P1 windows.
- **The launcher, before this branch.** `stack/up.sh` starts one read gateway (`gateway_roles=(w r)`; `w2` to `w4`
  exist only for writers), on the stack's private Docker network, with PostgreSQL and the transactor reachable only by
  container name (`host` and `alt-host` both `<prefix>-tx`). The window driver sends every seat to one URL.
- **Added here, default off:** `DX_REMOTE_READER_HOST=<machine 1's private IPv4>` makes `up.sh` publish PostgreSQL
  (5432) and the transactor (4334) on that address only and name it as the transactor's `alt-host` (this machine's
  peers keep resolving the container name). `rd5/second-reader.sh` starts the tuned reader on machine 2 (same image,
  same gateway source, both pinned options, the early filter, its own permits, prefetch and read-ahead settings),
  waits for machine 1's ports, measures the round trip with `ping`, and prints the URL. `DX_RD5_SECOND_READER=<url>`
  makes the random windows send odd seats to it (`rd1/pinned-ladder.ts` `pinnedWindow`, `secondRead`: two clients,
  each with its own batches; tape pins stay on the first reader; no balancing beyond the seat number). `study-server.ts`
  accepts it only with `DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=random`; `pinnedWindow` opens the scope on the second
  reader and refuses it unless it names the same database and runs both pinned options.

**Memory per reader.** The tuned reader's container is 9 GiB (6 GiB heap, 3 GiB object cache); its measured peak in
the random windows was 6,527 to 6,665 MiB. For random subjects the object cache earns little: its 80% hit share by
request is directory and identity segments (174 directory probes and 0.85 AVET loads per exchange), while the
subjects' leaves are almost always loaded. A reader with 3 cores needs the same 9 GiB; one with 7 to 8 cores
allocates about 2.4 times as fast (1.94 MB per subject), so 12 GiB of heap and a 3 GiB cache (16 GiB container)
keeps the young collections as rare per core as today.

**Network for a reader on its own machine.**

| Per read of a random subject (1 billion) | Today | Source |
| --- | ---: | --- |
| PostgreSQL round trips | 1.76 | sampled exchanges |
| Bytes per round trip (a stored segment) | about 60 KB | the probe: 42,414 TOAST blocks of 8 KB over about 5,300 gets |
| Bytes per subject | about 105 KB | |
| At 1,750 reads/s (one reader) | 3,080 round trips/s, about 185 MB/s (1.5 Gbit/s) | |
| At 3,600 reads/s (the bar, all readers) | 6,340 round trips/s, about 380 MB/s (3.0 Gbit/s) | |
| Transactor to each peer | every commit's novelty (23 commits/s of shape S) | small |

A 10 GbE link carries the bar's storage traffic at about 30% of its capacity. The round trip itself: on the stack's
Docker bridge a get took 0.51 ms (PostgreSQL's work plus JDBC); a private 10 GbE hop adds about 0.05 to 0.15 ms, so
about 0.6 ms. Inside a permit that is one more reason for the prefetch: eight gets overlap instead of adding up
(8 × 1.76 × 0.6 ms = 8.4 ms of waiting per exchange without it). PostgreSQL's one core served 2,155 gets/s at 0.31
cores; serving two readers at today's loads per subject (about 5,800 gets/s at 3,300 reads/s) needs 0.65 to 0.95 of
its one core, so PostgreSQL's core is the first shared limit a second reader meets (falsifier 1 of command 2).

## 7. Server command 1: one machine, the options at 1 billion (about 50 minutes, ceiling 60)

**What runs.** The random arm of 2026-11-23 (`rd1/PINNED-1B.md`, "The random arm"), unchanged except for the new
settings: three windows per configuration (`ref-random-near-head`, `s-random-near-head` with shape S saves at 23
commits/s, `ref-random-seed-cut`), 90 s, 256 seats, batches of eight, three reader cores, both pinned options, the
early filter, every seed-cut value checked against the seed's. One new physical copy of the held 1 billion cluster
per configuration, one parent directory per configuration. `study-server.ts` refuses a reader that does not carry
exactly the requested prefetch (`TX2_READ_PREFETCH` in its environment), read-ahead (`datomic.readAheadPool` in its
native settings: `{value 0, specified true}` when off) and cache (`datomic.objectCacheMax`).

```bash
COMMIT=<the commit that publishes this section>   # exp/DX-RD5-uncached-read
rd5_arm() {  # $1 new copy, $2 new campaign directory, $3 deadline ms, $4 permits, $5 prefetch, $6 read-ahead off, $7 cache MiB
  sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=random \
    "DX_RD3_READ_PERMITS=$4" "DX_RD5_READ_PREFETCH=$5" "DX_RD5_READ_AHEAD_OFF=$6" "DX_RD5_READ_CACHE_MIB=$7" \
    ${DX_REMOTE_READER_HOST:+DX_REMOTE_READER_HOST=$DX_REMOTE_READER_HOST} ${DX_RD5_SECOND_READER:+DX_RD5_SECOND_READER=$DX_RD5_SECOND_READER} \
    DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
OUT=/var/tmp/triplex-rd5-1b; mkdir "$OUT" "$OUT/pf3" "$OUT/pf3r" "$OUT/pf3c"   # one parent per configuration
T0=$(date +%s%3N)
rd5_arm "$COPY_1" "$OUT/pf3/campaign"  $(( T0 + 20 * 60 * 1000 )) 3 1 0 3072   # prefetch, 3 permits
rd5_arm "$COPY_2" "$OUT/pf3r/campaign" $(( T0 + 40 * 60 * 1000 )) 3 1 1 3072   # the same, read-ahead off
rd5_arm "$COPY_3" "$OUT/pf3c/campaign" $(( T0 + 60 * 60 * 1000 )) 3 1 0 1536   # the same as pf3, 1.5 GiB cache
```

Make each copy just before its configuration and remove it after, as for the random arm. Skip a configuration if
fewer than 18 minutes remain before its deadline. A dry run (`DX_DRY_RUN_FIRST_OFFER=1`) stops inside the window
driver after the reader checks. Yesterday's three configurations (3, 6 and 12 permits, options off) are the
controls; they ran on the same database, cores, cache and tape.

**Predictions, written before any run.** The model: reader CPU per random subject = 0.19 ms + loads × 0.86 ms (section
1); the prefetch moves decoding from the handler thread to the pool and removes the serial waits, so three permits
keep three cores as busy as twelve did; it does not change the loads.

| Configuration, window | Reads/s (central) | p50 | p99 | Loads per subject | Reader cores | Handler CPU per exchange | Admitted-work wall per exchange |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Control `p3` (measured) | 1,219.6 / 1,216.6 / 1,085.5 | 208 / 208 / 231 | 334 / 324 / 342 | 1.76 / 1.69 / 1.85 | 2.09 to 2.14 | 8.29 ms | 19.3 ms |
| Control `p12` (measured) | 1,719.8 / 1,747.2 / 1,563.6 | 145 / 145 / 160 | 289 / 258 / 293 | 1.60 / 1.54 / 1.69 | 2.81 to 2.83 | 7.77 ms | 55.3 ms |
| `pf3` | 1,500 to 1,850 (1,680) | 140 to 170 | 240 to 310 | 1.5 to 1.9 | 2.65 to 2.9 | 3 to 6 ms | 8 to 14 ms |
| `pf3r` (read-ahead off), if read-ahead is the excess (my lean, about 60%) | 2,100 to 2,600 (2,350) | 98 to 120 | 160 to 210 | 1.05 to 1.4 | 2.65 to 2.9 | 2 to 5 ms | 6 to 12 ms |
| `pf3r`, if it is not | as `pf3` ± 7% | | | 1.5 to 1.9 | | | |
| `pf3c` (1.5 GiB cache) | 1,450 to 1,950 (1,700) | 135 to 175 | 230 to 320 | 1.5 to 2.3 | 2.6 to 2.9 | 3 to 6 ms | 8 to 15 ms |

- `s-random-near-head` stores 23.07 to 23.08 commits/s with S commit p99 50 to 70 ms in every configuration; quiet p99
  as yesterday (8 to 60 ms). Wrong values and errors 0. Prefetch failures (`/v2/admin/scan-stats` `readPrefetch.failures`)
  0. **The 100 ms bar is not met in any configuration.**
- `pf3c` against `pf3`: the collector's pause share falls from about 18 to 20% to 12 to 16% of the wall (fewer decoded
  segments survive a young collection), and loads per subject rise by 0 to 0.15.
- `pf3r` against `pf3`: why I lean towards read-ahead. On the cold toy, Datomic's read-ahead added 0.15 storage gets per
  single random read that the sampled count never shows (they run on its own threads) and, by filling the small cache
  with leaves no point read wants, raised the reads' own loads too: storage gets per subject fell 34 to 43% with it off
  (section 4). At 1 billion the excess over one leaf per subject is 0.66 EAVT loads, which a 3 GiB cache churned by
  read-ahead leaves (directory and identity segments evicted) would explain; nothing else found explains it.

**What would show them wrong:**
1. **`pf3` under 1,450 reads/s or under 2.5 reader cores:** something other than storage waits held the permits idle
   (the prefetch pool's own queue, PostgreSQL's one core: check `sql-ms` per exchange and PostgreSQL's cores).
2. **`pf3` loads per subject under 1.3:** the prefetch changed what is loaded (it should not); look at the sampled
   `eavt-load`.
3. **`pf3c` loads per subject above 2.3, or reads/s more than 10% under `pf3`:** the 3 GiB cache holds part of a
   working set of directory and identity segments. Then a larger cache (6 to 12 GiB) can lower the loads, and the
   claim "no affordable cache" must be re-tested with a 6 GiB arm before the 7-core sizing is used.
4. **`pf3c` reads/s more than 15% above `pf3`:** collection of cached segments is a larger share of the 1.7 ms than
   section 1 says; a smaller cache becomes a default to propose for random-read readers.
5. **`pf3r` loads per subject within 0.15 of `pf3`'s:** read-ahead is not the 1 billion excess; the 0.66 extra EAVT
   loads per subject are something else (directory segments larger than the cache, or the layout), and the next step is
   the 6 GiB cache arm. **`pf3r` reads/s under `pf3`'s:** read-ahead was helping (some leaf it fetched was used).
6. **Any wrong value, any error, any prefetch failure:** stop; an option must not merge.

## 8. Server command 2: a second reader on a second machine (about 55 minutes with set-up, ceiling 60)

**Machines.** Machine 1: the bare-metal shape of 2026-11-23 (12 cores, 96 GB) with the held 1 billion cluster.
Machine 2: any machine on the same private network with at least 4 cores and 12 GB free, Docker, the scorecard image
(`docker save $SCALE1_IMAGE | ssh machine-2 docker load`, about 1.7 GB) and a checkout at `$COMMIT`. Addresses stay in
the driver's private notes.

```bash
# Configuration two-pf (prefetch on both readers), then two-pfr (prefetch and read-ahead off on both).
# On machine 2 (as root), first; it waits up to 10 minutes for machine 1's PostgreSQL and transactor:
second() {  # $1 read-ahead off (0 or 1), $2 new output directory
  RD5_MACHINE1=<machine 1 private IP> RD5_LISTEN=<machine 2 private IP> RD5_IMAGE="$SCALE1_IMAGE" RD5_REPO=<checkout at $COMMIT> \
    RD5_CPUS=0-2 RD5_PERMITS=3 RD5_PREFETCH=1 "RD5_READ_AHEAD_OFF=$1" RD5_HEAP_MIB=6144 RD5_CACHE_MIB=3072 RD5_MEMORY_MIB=9216 \
    "RD5_OUT=$2" bash lab/experiments/EXP-DX1/rd5/second-reader.sh start      # prints DX_RD5_SECOND_READER=...
}
second 0 /var/tmp/triplex-rd5-second/two-pf
# On machine 1, at the same time (the function of command 1):
OUT=/var/tmp/triplex-rd5-two; mkdir "$OUT" "$OUT/two-pf" "$OUT/two-pfr"
export DX_REMOTE_READER_HOST=<machine 1 private IP> DX_RD5_SECOND_READER=http://<machine 2 private IP>:18492
T0=$(date +%s%3N)
rd5_arm "$COPY_1" "$OUT/two-pf/campaign" $(( T0 + 25 * 60 * 1000 )) 3 1 0 3072
# On machine 2, after that arm has ended: stop, then start the second configuration
RD5_OUT=/var/tmp/triplex-rd5-second/two-pf bash lab/experiments/EXP-DX1/rd5/second-reader.sh stop
second 1 /var/tmp/triplex-rd5-second/two-pfr
# On machine 1 (a new copy; skip if fewer than 20 minutes remain of the hour):
rd5_arm "$COPY_2" "$OUT/two-pfr/campaign" $(( T0 + 60 * 60 * 1000 )) 3 1 1 3072
unset DX_REMOTE_READER_HOST DX_RD5_SECOND_READER
RD5_OUT=/var/tmp/triplex-rd5-second/two-pfr bash lab/experiments/EXP-DX1/rd5/second-reader.sh stop   # on machine 2
```

The window driver sends seats 1, 3, 5, … to machine 2 and the others to machine 1's reader; tape pins do not run in
the random arm. Machine 2's reader keeps no trace; `second-reader.sh` samples its CPU and memory (`docker stats`)
every 5 s into `$RD5_OUT/stats.txt` until the container is removed.

**Predictions, written before any run** (two readers of three cores each, 128 seats each, three permits each):

| Configuration, window | Reads/s, both readers (central) | p50 | p99 | Each reader's cores | PostgreSQL cores |
| --- | --- | --- | --- | --- | --- |
| `two-pf`, `ref-random-near-head` | 3,000 to 3,600 (3,300) | 70 to 90 ms | 110 to 160 ms | 2.6 to 2.9 | 0.65 to 0.95 |
| `two-pf`, `s-random-near-head` | 2,950 to 3,550 (3,250) | 70 to 90 ms | 110 to 165 ms | 2.6 to 2.9 | 0.7 to 1.0 |
| `two-pf`, `ref-random-seed-cut` | 2,800 to 3,400 (3,100) | 75 to 95 ms | 120 to 175 ms | 2.6 to 2.9 | 0.65 to 0.95 |
| `two-pfr`, each window, if read-ahead is the excess | 4,200 to 5,000 (4,600) | 51 to 61 ms | 85 to 115 ms | 2.6 to 2.9 | 0.55 to 0.85 |
| `two-pfr`, if it is not | as `two-pf` | | | | |

- Each reader serves its 128 seats at about what one reader serves 256 with the same options (command 1's `pf3` and
  `pf3r`), since the readers share only PostgreSQL. Little's law with 256 seats gives p50 near 256 ÷ reads/s; the tail
  is 1.6 to 1.9 times p50.
- **The 100 ms bar:** `two-pf` misses it (central p99 about 135 ms; eight reader cores would be needed at today's
  loads); `two-pfr` meets it at the central estimate (about 100 ms) only if read-ahead is the excess.
- Saves: 23.07 to 23.08 commits/s stored, S commit p99 50 to 75 ms. Wrong values and errors 0 on both readers.
- Network: machine 2 draws 150 to 200 MB/s from PostgreSQL in `two-pf` (about 1,650 reads/s × 1.76 gets × 60 KB),
  about 100 to 130 MB/s in `two-pfr` if the loads fall.

**What would show them wrong:**
1. **Both readers together under 2,600 reads/s, with each reader under 2.4 cores:** something shared limits them.
   First suspect PostgreSQL's one core (above 0.9 cores) or its page cache (TOAST reads from disk rising), then the
   transactor's push of novelty. A second reader then needs PostgreSQL resized first.
2. **Machine 2's reader more than 15% slower than machine 1's at the same cores:** the network round trip costs more
   than the prefetch hides (check `ping.txt` and the SQL ms per get on machine 2).
3. **p99 under 100 ms at both pins:** six cores meet the bar; the sizing above was pessimistic.
4. **Any wrong value or error on either reader:** a second peer is not exact as assumed; stop.

## 9. What is not verified

- **Nothing here has run at 1 billion.** The cause of the 0.66 extra EAVT leaves per subject is a lean (read-ahead
  evicting directory and identity segments), not a finding; commands 1 and 2 decide it.
- **The toy does not reproduce the 1 billion load count** (0.33 to 1.0 gets per subject against 1.76): its 2,193 leaves
  have a handful of directories and a 32 MB cache still hits; all toy times are from a shared Mac.
- **Read-ahead off for scans** (history reads, journal walks, whole-scope reads) on the reader: their speed without it
  was not measured; only their answers were compared (history reads and historical worlds, 0 differences).
- **The second-machine path** (`DX_REMOTE_READER_HOST`, `second-reader.sh`) has not run anywhere: the Mac gate covers
  the window driver splitting seats over two readers in one container, not PostgreSQL and the transactor reached
  across machines, `alt-host`, or PostgreSQL's authentication for a remote client (the image's default allows password
  logins from any address; a prepared cluster's own `pg_hba.conf` decides on the server).
- **`study-server.ts`'s new checks** (reader environment, read-ahead in native settings, cache size, the second
  reader's URL) are type-free TypeScript run only through the harness's stubs; the first dry run executes them.
- **The prefetch's effect under saves** (the prefetch touches the request's own current database; saves running
  beside reads were part of the gate's live phase, 0 differences) and at 1,024 seats.
- **A per-subject row cache** is costed, not built.



## Evidence (private folder `evidence/DX-RD5/`)

| File | Contents | SHA-256 |
| --- | --- | --- |
| `gate-05.tar.gz` | the run whose prefetch failed every touch (kept for the record); probes before the fix | `a1054343356fe4f43c8db46fade0d73aaecb2a0bda1508a96ac49c8cad5e0f67` |
| `gate-06.tar.gz` | two accounts × 1,000: comparison, all five probes (section 4) | `f79d21e5a96ef0e5d39661cbf6a0a1dcd4f9d9ed403221ef3cef8f4466e94ec2` |
| `gate-07.tar.gz` | ten accounts × 200 at `dc7b8c1d5`: comparison and both read windows (probes cut short when the container was removed during a pause) | `658e7b1cc492700fe280257efe61c9d1af8a077f712c016eaa329eb80ae7bd32` |
| `gate-08.tar.gz` | ten accounts × 200 at the merge `bd460b8d7`: comparison, both windows, all five probes | `e00142f2aa788072b8a68857d5a4039502840f4a7bee78867988ae0105ed84ad` |
| `selftest-*.log` | gateway selftest with the prefetch off and on, before and after the merge | |

Reproduce section 1 with `python3 rd5/breakdown.py DIR` on the unpacked server archives; section 4 with
`python3 rd5/summarize.py out/probe.ndjson` from a gate archive.
