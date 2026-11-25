# One server session of at most 50 US dollars at 1 billion records: the plan and its predictions (SRV1)

Written 2026-11-25 from 17:28 to 17:51 EST by the session analyst, branch `exp/DX-SRV1-session-plan` from
`origin/lane/d-native` `47cc2c96f`. Nothing is rented, no stack was run, no product code was changed. Every number
below marked "predicted" was written before any run of this session. Every measured number names its page; the pages
are on `origin/exp/DX-INT1` (head `efee27905` when this was written) unless named otherwise.

The owner's words of 2026-11-25: "a server session of up to $50 more. We need to measure. Let's keep measuring at 1
billion for now and get that to work and then we can deal with 10 billion later." The read bar since the same day
(`lab/TARGETS.md`): p99 at most 100 ms for a subject in memory and at most 300 ms for a subject not in memory, 100 ms
the aim for both.

## The answer in short

1. **Why read goodput stayed flat at about 18 per second (A.1).** Every pinned read of the 2026-11-23 card asked for the
   database as it was at position 87,002, 28.2 million positions behind the head. Before reading the subject, our own
   read route looked up that position among the grouped-save positions on Datomic's past view of the database; the
   position is not there, and proving it walks every grouped-save position written after the pin (about a million).
   That costs about 28 to 30 ms of one core and 72 MB of short-lived memory per read, the same on a repeat read, so no
   cache removes it. The card's read gateway had one core, and the read permit count defaults to the core count, so
   one permit: reads went through one at a time at about 50 ms each, 1 ÷ 0.05 s ≈ 18 to 20 per second whatever the
   number of readers. More readers only waited longer (256 ÷ 18.3 per second ≈ 14 s; measured p99 13.6 s). Two
   options built that night remove it (19.4 → 468 reads/s on the same core, 0 wrong values); they are still off by
   default, so a card run with defaults shows 18 per second again.
2. **What a read of a subject not in memory costs at 1 billion (A.2).** 1.76 storage round trips (1.66 EAVT leaves, 0.11
   identity leaves), each one PostgreSQL fetch of a stored segment of about 60 KB, 0.51 ms of SQL time, then 0.69 ms
   of decoding plus 0.17 ms of collection: 1.71 ms of reader CPU per subject against 0.19 ms for a subject in memory.
   The round trips run one after another inside the read permit unless the prefetch is on.
3. **Memory to keep every read in memory (A.6).** About 0.5 MB of reader heap per stored segment once decoded, and a
   subject needs 1 to 2.2 of them: **0.5 to 1.1 TB per reader at 1 billion records** (1,000,000 subjects), **5 to 11 TB
   per reader at 10 billion** if the subjects grow tenfold. Keeping only the stored bytes in memory (176 GB at 1
   billion, about 1.8 TB at 10 billion) removes the disk part of each round trip but not the decode, which is most of
   the cost. Neither scales: the memory grows with every subject and is held once per reader, no keep-warm is allowed,
   and the largest machine on the provider's list today has 1.5 TB. The working set that matters is the active
   subjects: at the workload's 2% active share, 20,000 subjects need 10 to 18 GB of reader cache at 1 billion.
4. **What a miss must cost (A.7).** At the bar's 256 concurrent readers, p99 ≈ 1.7 × 256 × CPU per read ÷ busy cores.
   On today's 3-core reader the 300 ms bar allows at most **2.0 round trips per miss** (today 1.54 to 1.85: measured
   258 to 305 ms, just at the bar); the 100 ms bar allows **0.53**, less than the one round trip a miss needs by
   definition, so 100 ms for misses needs about 5 to 6 reader cores at exactly one round trip, about 8 at today's 1.76,
   or a decoded-row cache that makes a repeated miss cost what a subject in memory costs.
5. **The session (C):** two machines, **core runs USD 16.37 to 24.78, all runs including optional ones USD 24.83 to
   34.86**, plus USD 10 held back for reruns; a hard stop at USD 48. Priority 1 first (the flat-goodput check, the
   uncached read options, two readers), then the scorecard on the merged head with the product's save path, then
   questions across subjects and API-call reads, then Publish at 1 billion.
6. **Blocker found while writing (E):** at 17:40 EST the provider listed no f4.metal.small (the 12-core, 96 GB machine
   of every earlier run) in stock at the site that holds the object storage bucket; three were in stock at another
   site. The machine choice must be made at rental time (E.5).

## A. Priority 1: why goodput was flat at 1 billion, and what fixes reads

### A.1 The flat 18 per second, from the code and the evidence

**The measurement** (`v01/SCORECARD-1B-production-S.md`, source `090c189a8`, Priorities table): field-read p99 110 /
385 / 1,147 / 3,621 / 13,584 ms at 1 / 4 / 16 / 64 / 256 readers, goodput 18.5 / 18.3 / 18.7 / 19.6 / 18.3 reads/s;
at 1,024 readers 11.0 reads/s with 1,617 errors. Every read pinned at the SCALE1 seed cut, position 87,002; the card's
read gateway on one core (`cpus 6`, `ActiveProcessorCount=1`), 1.5 GiB object cache, both pinned options off.

**The code path of one such read** (gateway sources on `exp/DX-INT1`):

| Step | Code | Cost at the old pin, options off |
| --- | --- | --- |
| 1. Wait for the read permit | `admission.clj` `execute-for` on the `reads` semaphore; `read-permits` = `TX2_READ_PERMITS`, default `availableProcessors`, **1 on a one-core reader** | the queue: (seats − 1) × the time inside the permit |
| 2. Confirm the position is published | `storage.clj` `await-position` (head ≥ 87,002: immediate) | under 0.1 ms |
| 3. Build the past view | `storage.clj` `at-position`: `d/index-range` on `:triplex.tx/position`, then `d/as-of` | under 0.1 ms |
| 4. Choose the view and its interior | `lean.clj` `rows` → `reach/select-db` → `group_cut.clj` `interior` → `member-at` → `d/entid db [:triplex.group/position 87002]` **on the as-of view** | **about 28 to 30 ms of CPU, 72 MB allocated**: Datomic's filtered AVET iterator rejects, one by one, every `:triplex.group/position` datom asserted after the pin (95.7% of the probe's CPU samples sat under this one call) |
| 5. Read the subject's rows | `lean.clj` `live-texts` on the as-of view | about 1 ms; 1.19 segment loads per read (0 on a repeat) |
| 6. Filter, mask, encode | `storage.clj` `read-rows`, `wire-row`, JSON | well under 1 ms |

Sources: `rd1/PINNED-1B.md` "The answer"; the probe `scale1/RD2-PROBE.md` (pinned 31.86 ms p50 with 29.26 ms of thread
CPU; the repeat 28.29 ms with 0 loads; near the head 1.26 ms; 16 threads in one process 30.2 reads/s with 60.23 s of
CPU in 60.24 s). In the card's own trace the time inside the permit had p50 40 to 54 ms (the walk plus collection on the
same core, HTTP and JSON), so 1 permit ÷ about 50 ms ≈ 18 to 20 reads/s at every ladder step, and each added reader
added about 50 ms of queue. Not the cause: the rolling credits of 6 (they admit saves, not reads), storage (1.19 loads
per read, repeat reads as slow with none), the driver (the in-process probe gave the same ceiling), the subject's size.

**Same read with the options on** (`TX2_PINNED_CUT_LOOKUP=1`: `member-at` resolves the position on the current
database and accepts it only if asserted at or before the view's t; `TX2_PINNED_SHORTCUT=1`: a subject unchanged since
the pin is read from the current database): measured 2026-11-23, one core, 19.37 → 467.92 reads/s at one seat, 20.20 →
478.80 at 256, p50 41.7 → 1.37 ms, 98% of reads answered from the current database, 0 wrong values in 12 steps. Three
cores, batches of eight: 10,598.8 reads/s at the old pin, p99 83.46 ms. Both options are still off by default on the
one branch (`v01/READINESS.md` "Proposed defaults").

### A.2 What one pinned read of one subject costs when its rows are not in memory

From the code (`lean.clj` `rows`, `pinned.clj`, `uncached.clj`) and the 1 billion random windows of 2026-11-23/24
(`scale1/RD2-PROBE.md` DX-RD3 rows; `rd5/UNCACHED-READ.md` sections 1 and 2), tuned reader, both pinned options on:

| What the read does | Index touched | Storage round trips per subject at 1 billion | Where it can be found |
| --- | --- | --- | --- |
| Identity lookup `[:triplex.entity/id id]` | AVET leaf (many subjects per leaf) | 0.11 | object cache usually (0.85 AVET loads per exchange of 8) |
| Short-cut checks: revision, and no datom newer than the pin | the subject's EAVT range | 1.66 for these and the next row together; **1.0 is what the layout needs** | the subject's EAVT leaf |
| Live row walk (20.1 row texts, 1 kept) | same EAVT range | (included) | same leaf, now cached |
| Index directories on the way | directory segments | most hit (174 directory probes per exchange, 80% of cache requests hit) | object cache |
| **Total** | | **1.76 sampled; 1.46 to 2.00 by the reader's StorageGet count** | |

- **Size:** a stored segment is about 60 KB per fetch in the random windows (42,414 TOAST blocks of 8 KB over about
  5,300 fetches); overall the database holds 6,018,339 live segments in 176 GB (about 29 KB each, directories and log
  included). Decoded on the reader's heap a leaf is about 0.5 MB (3 GiB held 6,100 to 6,400 segments); the read returns
  0.25% of the leaf's text.
- **Serial or parallel:** each fetch is one SQL `SELECT` by segment key, made by Datomic on the thread that needs it,
  so the 14.1 fetches of an exchange of eight run **one after another** inside its permit (7.2 ms of a 19.6 ms permit
  hold). Datomic's read-ahead pool (5 threads) fetches the segments after the one a point read needs; a point read never
  uses them. With `TX2_READ_PREFETCH=1` the eight subjects are touched side by side on a 16-thread pool first.
  Across requests, parallel up to the read permits (3 on the tuned reader unless `--read-permits`).
- **The caches on the way:** (1) the reader's Datomic object cache, decoded segments (1.5 GiB on the card's default
  reader, 3 GiB on the tuned reader); (2) the gateway's own caches do not hold `/read` rows (the parsed-entity cache
  serves world reads, `entity_cache.clj`); (3) no memcached or valcache is configured (`jvm1/INVENTORY.md`); (4)
  PostgreSQL's shared buffers, 2 GB; (5) the operating system's page cache, charged to PostgreSQL's container (8 GiB,
  5 GiB with the card's tuned reader) beside a 176 GB database, so most leaf fetches read the NVMe drive.
- **Cost per subject:** reader CPU 1.71 ms (decoding 0.69 ms and collection 0.17 ms per fetch, 0.19 ms of gateway
  work); SQL 0.51 ms per fetch on the stack's Docker network (PostgreSQL's one core about 0.14 ms of it). Alone, a
  random subject's single read is therefore about 3 to 5 ms; at 256 concurrent readers its latency is the queue.
- **The one-at-a-time steps for these reads:** the permits (3 by default on the tuned reader; 6 and 12 lifted reads/s
  25 to 44% because the fetches idle a permit), and possibly a cap on concurrent storage reads in the peer: the card's
  launch profile does not set `datomic.readConcurrency` on the reader, the resolved value is in each run's native
  settings readback, and SQL time per exchange rose from 9.3 to 14.5 ms between 6 and 12 permits while PostgreSQL used
  only 0.43 of its core. Which of the two (PostgreSQL reading the drive, or a peer-side cap) has not been looked at.

### A.3 Competing explanations, what each predicts, and the cheapest experiment

**For the flat 18 per second** (settled by the evidence above; a confirmation on the merged head is run A1):

| | E1: CPU per read (the walk) on one core | E2: a serial point with an idle core (the one permit and storage waits) | E3: the driver or probe |
| --- | --- | --- | --- |
| Reader CPU at every ladder step | 0.95 to 1.0 core | well under 1 core | under 1 core |
| Time inside the permit per read | 40 to 55 ms at every step | tens of ms, mostly SQL time | small |
| More permits on the same core (4 instead of 1) | no change (17 to 22/s) | about 4× | no change |
| The cut lookup alone (shortcut off) | 300 to 650/s on the same core | small change | no change |
| Driver event-loop p99 | under 20 ms | under 20 ms | over 20 ms |
| Evidence of 2026-11-23 | **fits every item** | refuted (1.19 loads per read; repeat with 0 loads as slow; core saturated) | refuted (the in-process probe hit the same ceiling) |

Cheapest separating experiment (A1, 30 to 39 minutes): three arms on the one-core default reader at the old pin, 60 s
at 1, 16 and 256 seats each: options off with 1 permit (the control), options off with 4 permits, the cut lookup alone.

**For the cost of a read not in memory** (open; run A2 separates them):

| | X1: Datomic's read-ahead fills the cache with leaves no point read uses | X2: directory segments do not stay in a 3 GiB cache | X3: the layout puts an aged subject's rows in two leaves |
| --- | --- | --- | --- |
| Read-ahead off (`pf3r`) against on (`pf3`) | loads per subject fall 0.35 to 0.7 (to 1.05 to 1.4); reads/s up 25 to 55% | loads within 0.15 | loads within 0.15 |
| Cache 1.5 GiB (`pf3c`) against 3 GiB | loads up 0 to 0.15 | loads up 0.2 or more | no change |
| Loads by subject kind | the same for seed and aged subjects | the same | aged subjects (2,000 per account) about 1 more |
| Builder's lean (`rd5/UNCACHED-READ.md`) | about 60% | | |

Run A2 (RD5 command 1, 50 to 60 minutes) separates X1 from X2 from X3 by those three configurations; the loads by
subject kind come from the sampled exchanges (the random windows draw uniformly, so 2% of subjects are aged).

### A.4 Candidate fixes already built (default off) and what each should do to the two populations

| Option | Subject in memory | Subject not in memory | Evidence | Run |
| --- | --- | --- | --- | --- |
| `TX2_PINNED_CUT_LOOKUP` + `TX2_PINNED_SHORTCUT` | removes the 28 ms walk at old pins: 0.19 ms of reader CPU per subject | removes the walk; the 1.76 fetches stay | 19.4 → 468/s on one core | on everywhere in this session |
| Tuned reader: 3 cores, 3 GiB cache in a 9 GiB heap, batches of 8, early filter (`--reader tuned`) | 8,368 to 12,376 reads/s at 256 seats, p99 72 to 112 ms (6 GiB heap; the 9 GiB heap never ran) | 1,086 to 1,220/s at 3 permits, p99 324 to 342 ms | `rd1/PINNED-1B.md` | A4 |
| Read permits 6 or 12 (`--read-permits`) | CPU-bound: within 10% (12 permits never measured for re-reads) | +25 to 44% (1,477 to 1,747/s, p99 258 to 305 ms) | random arm | A2b, A4 |
| Batch prefetch `TX2_READ_PREFETCH` (`DX_READ_PREFETCH`) | a touch of cached segments: under 5% CPU | the fetches of an exchange overlap: 12 permits' rate at 3 permits (forecast 1,500 to 1,850/s) | toy only | A2 |
| Read-ahead off `-Ddatomic.readAheadPool=0` (`DX_READ_AHEAD_OFF`) | may raise the hit share slightly; scans (history, journal, sweep) lose read-ahead, unmeasured | if X1: 1.71 → 1.1 to 1.3 ms per subject, 2,100 to 2,600/s, p99 160 to 210 ms | toy: storage gets −34 to −43% | A2 |
| Reader cache 1.5 GiB (`DX_RD5_READ_CACHE_MIB`) | worse: the re-read working set needs about 5,600 segments, about 3 GiB | fewer decoded segments copied by the collector | — | A2 (test of X2) |
| Second reader on a second machine (`DX_REMOTE_READER_HOST`, `rd5/second-reader.sh`) | doubles capacity | doubles capacity: 4,200 to 5,000/s, p99 85 to 115 ms if X1 holds | launcher never run across machines | A9 |
| Question reader (`DEMO_QUESTION_READER`, XQ7) | keeps sweeps from evicting the main reader's cache (a sweep of one deep account loads 150,000 to 200,000 segments through a cache of about 6,000) | — | toy | B2 |
| Batched read `TX2_READ_BATCH` and world reads (API1) | one permit and one position per API call; subject page floor about 2.3 ms of reader CPU | 5.4 to 9.4 ms per random subject page (model) | toy | B3 |
| Waiting-read bound `TX2_READ_WAIT_LIMIT` (W3) | keeps feed polls and pulls alive at 1,024 seats | same | toy | A8 |
| `server-32` transactor and per-save credits | no read effect | no read effect | card | A4 |

### A.5 Candidates not built, ranked by expected effect per day of work

| Rank | Candidate | Expected effect | Days | Why this rank |
| --- | --- | --- | --- | --- |
| 1 | Per-read classification on the card (section B) | none on speed; it is what lets the scorecard judge the two bars | 0.5 to 1 | the split bar cannot be judged without it |
| 2 | Separate permit pools for reads that went to storage and reads that did not (a read that loads a segment releases its permit to a second pool for the rest of its work), or route a request's random subjects to a second reader | in-memory p99 no longer set by the queue behind misses: in-memory p99 at 256 mixed seats from 150 to 300 ms down to 75 to 115 ms | 1 to 2 | cheap; protects the 100 ms bar where most production reads are |
| 3 | A decoded-row cache per entity, filled only by reads, invalidated from the transaction report queue (`rd5/UNCACHED-READ.md` "Not built") | a repeat miss costs 0.2 to 0.3 ms instead of 1.7; 3 GiB holds about 390,000 entities' rows instead of about 6,200 segments (63×); the first touch is unchanged | 3 to 5 | the only lever that makes a former miss cheap; exactness of the invalidation race is the work |
| 4 | Reader cores: a reader machine or a 16-core machine (two reader processes) | capacity scales with cores (A.7) | 0.5 launcher + money | built in part (A9 tests it) |
| 5 | PostgreSQL on two cores and its page cache back to 8 GiB | SQL time per fetch 0.51 → 0.35 to 0.45 ms; matters once there are two readers | 0.1 (core plan) | PostgreSQL's one core is the first shared limit of a second reader (0.65 to 0.95 core forecast) |
| 6 | Datomic's local-disk segment cache on readers (valcache; documented by the vendor, never tried here, licence and version to check) | removes the PostgreSQL round trip for repeat fetches, not the decode: under 10% on the bar | 0.5 to 1 | small effect on CPU-bound misses |
| 7 | A layout with each subject's rows in one leaf | at most 1.76 → 1.0 fetches | weeks | the writer path and every gate move |

### A.6 How much memory would every read in memory need

"In memory" here means the subject's segments are decoded in the read gateway's Datomic object cache; that is what
makes a read cost 0.19 ms instead of 1.71 ms of reader CPU.

| Form | Per subject | 1 billion records (1,000,000 subjects in the ten deep accounts) | 10 billion records, subjects tenfold | 10 billion records, history tenfold on the same subjects |
| --- | --- | --- | --- | --- |
| Decoded segments in each reader (today's design) | 0.5 MB × 1.0 to 2.2 leaves = 0.5 to 1.1 MB | **0.5 to 1.1 TB per reader** | **5 to 11 TB per reader** | current reads about 0.5 to 1.1 TB; past-basis and history reads grow with the history index |
| Every live segment decoded (all indexes, history, log) | — | 6.02 million × 0.5 MB ≈ 3 TB | about 30 TB | about 30 TB |
| Stored bytes in RAM (PostgreSQL and page cache) | about 60 KB per fetched leaf | 176 GB (the whole database) | about 1.8 TB | about 1.8 TB |
| Decoded rows of the one entity a field read needs (not built) | about 8 KB | about 8 GB | about 80 GB | about 8 GB |
| Parsed whole subjects (the world path's cache) | 0.3 to 0.4 MB | 0.3 to 0.4 TB | 3 to 4 TB | 0.3 to 0.4 TB |
| **The active subjects only** (the workload's 2% in active onboarding) | 0.5 to 0.9 MB | **10 to 18 GB** | 100 to 180 GB | 10 to 18 GB |

**Today** the 96 GB machine's memory table is 89 GiB and fully assigned (transactor 57, writer 6, tuned reader 11 with
a 3 GiB cache, PostgreSQL 5, host 10): the reader holds about 6,200 segments, 3,000 to 6,000 subjects, 0.3 to 0.6% of
the million. **Prices on the provider's list at 17:40 EST on 2026-11-25** (hourly, the bucket's site): 128 GB machines
USD 1.25 to 1.52, 384 GB USD 4.06, 768 GB USD 6.44, 1,536 GB USD 10.88 (USD 3,971 a month); the machine of every
earlier run, 96 GB, USD 1.09.

**Why it does not scale.** (1) The memory grows with every subject, and each reader holds its own decoded copy, so two
readers double it. (2) The cache lives in the Java heap; at 3 GiB the collector already takes 17.8% of the reader's
wall time during random reads, and a heap of a terabyte is not a practical collector target. (3) No keep-warm is
allowed, so a large cache fills only as subjects are read and is cold after every restart. (4) Nothing on the list
holds 10 billion's 5 to 11 TB in one process. What does fit is the active set (10 to 18 GB at 1 billion), which a 128
GB machine's reader could hold; everything else has to be cheap to miss.

### A.7 What a read that misses memory must cost

Model, from the 256-seat random windows (`rd5/UNCACHED-READ.md` section 5; checked against the 12-permit run: 1,747
reads/s with 2.8 busy cores and 1.6 ms per subject gives p99 249 ms predicted against 258 measured):

- CPU per read = 0.19 ms + 0.86 ms × storage round trips (fetch, decode and collection).
- Reads/s = busy cores ÷ CPU per read; busy cores ≈ 0.93 × reader cores with enough permits or the prefetch.
- p50 ≈ seats ÷ reads/s (closed loop, no think time); p99 ≈ 1.7 × p50 (measured 1.6 to 1.9).

| Bar at 256 concurrent readers | CPU per miss allowed, 3 reader cores | Round trips per miss allowed, 3 cores | Cores needed at 1.0 round trip | Cores needed at today's 1.76 |
| --- | ---: | ---: | ---: | ---: |
| p99 ≤ 300 ms | 1.93 ms | **2.0** | 2 | 3 (today: 258 to 305 ms) |
| p99 ≤ 100 ms | 0.64 ms | **0.53** (under the 1 a miss needs) | 5 to 6 | 8 |

Alone (one reader at a time) a miss of k round trips takes about 1.5 + 1.4 × k ms, so 300 ms would allow about 200
serial round trips and 100 ms about 70: **the bar binds only under load, as CPU per miss, not as round-trip latency**.
The round trip's wait matters only when it idles a permit, which the prefetch or more permits remove. The 1,024-seat
stress clause is a separate problem (the 3 GiB cache thrashes: 1.43 to 1.78 loads per subject; Jetty's 512 threads
park).

## B. How to tell "in memory" from "not in memory" for each read

**What the code can observe today.**
1. **Per sampled exchange** (`TX2_READ_PROFILE=1` on the reader; the client sets `x-triplex-read-profile` on the
   exchange; `trace.clj` `handler`): Datomic's io-stats bound to the request thread (`peerIoStats`: storage reads and
   SQL time, segment loads per index, object-cache hits), the handler thread's CPU (`handlerCpuNs`), the spans
   `gateway.admission-wait` (time waiting for a read permit) and `gateway.admitted-work`, response bytes. The prefetch
   pool's loads count too (`uncached.clj` runs the touches under `bound-fn*`); Datomic's own read-ahead threads' loads
   do not.
2. **Per read, summed:** `TX2_READ_IO_COUNTERS=1` sums every read's io-stats (`question_reader.clj` `count-read-io`).
3. **Per minute:** the reader's Datomic metrics (StorageGet count, ObjectCache hits over requests) and PostgreSQL's
   block counters for Datomic's table and its TOAST table.
4. **Today the card samples one exchange in 16** and computes loads per subject for the random line (`card-reader.ts`).

**The rule (proposed for the card).** An exchange is **in memory** when its io-stats show 0 storage reads during its
admitted work, prefetch included; otherwise it is **not in memory**, with its count of storage reads. Every subject of
an exchange takes the exchange's class (an exchange returns its subjects together). This is exact for the in-memory
bar (a class member fetched nothing) and conservative for the other (a subject in memory that shared an exchange with a
miss is counted with the miss).

**What the scorecard reports.**
- Both P1 lines sample every exchange (one in one instead of one in sixteen).
- **P1 in memory:** the re-read line's in-memory exchanges: count, share of the line, p50 and p99 of latency from the
  client, the admission wait and the admitted work separately; bar p99 ≤ 100 ms at 256 seats.
- **P1 not in memory:** the random line's not-in-memory exchanges, the same figures plus storage reads per subject and
  SQL time per read; bar p99 ≤ 300 ms, aim 100 ms.
- The other two cells (misses in the re-read line, hits in the random line) are printed and not judged.
- Check: storage reads summed from sampled exchanges against the reader's StorageGet count over the same seconds; the
  difference is read-ahead's own loads and must be stated (expected 0 to 25%; about 0 with read-ahead off).
- Cost check: one 60 s re-read step at one-in-sixteen and at one-in-one sampling; predicted reads/s within 5%.

**Predicted shares on the card:** re-read line at 256 seats, 0.45 to 0.7 storage reads per exchange, so 45 to 65% of
exchanges in memory; random line 0 to 2% in memory. **To build before renting** (E.2 item 1): the sampling rate
option and the two rows, gated on the Mac toy. If it is not built in time the card judges the bars by line (re-read
line = in memory, random line = not in memory) with the sampled loads per subject as the evidence.

## C. The session plan: USD 50 at most, staging and cleanup included

### C.1 Machines, prices and guards

- **Two machines, both the f4.metal.small of every earlier run** (12 cores, 96 GB, two 960 GB NVMe drives, two 10 Gbit
  ports, USD 1.09 an hour, `cloud/LEDGER.md` in the private folder), in the site of the object storage bucket so the
  1 billion archive is fetched inside one site. Machine A runs reads, the scorecard and Publish; machine B runs
  questions across subjects, API-call reads and the commit-time index, and serves as the second reader in run A9.
  See E.5 for the stock problem found today.
- **Spend:** USD 247.62 before this session; the session cap USD 50 (total USD 297.62). Object storage (about USD 2.14
  a month) is outside the cap.
- **Stop rules for the whole session:** no step starts if the session's spend so far, plus the step's high estimate,
  plus 30 minutes of cleanup per running machine, exceeds USD 46. At USD 48 both drivers stop what runs, copy evidence
  and delete. Each driver holds its own machine's delete; the last step of each machine's queue deletes it and
  confirms with the provider that the server is gone (404); the ledger row is written then. A detached deadline alert
  on the Mac fires at the forecast end plus 2 hours, and the orchestrator checks every 2 hours (the 2026-11-21 stall
  left two machines idle for 37.5 hours, USD 80).
- **Never idle:** a machine whose queue is empty is deleted within 15 minutes. The joint run A9 waits at most 45
  minutes for the other machine; past that the early machine goes on with its queue and A9 moves to the next step
  boundary of both.
- **Per step:** a step refused before its first offer is retried once on a new copy after reading the refusal; a second
  refusal skips it. A step 25% past its ceiling is stopped and the queue goes on. Any wrong value, difference or lost
  save stops that step and every step that builds on it.

### C.2 The runs, in priority order

Costs at USD 1.09 an hour (USD 0.0182 a minute). "Core" runs are the owner's four items; "optional" runs follow.

| # | Machine | Purpose | Command (C.3) | Staged first | Minutes | USD | Stop rule | If money runs short |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| A0 | A | Provision, bootstrap, build at `COMMIT`, fetch and unpack the 1 billion cluster, the card's dry run (part 1 to its first offer) | readiness step 1 | the bucket's archive and handoff; Datomic and Java downloads | 50–85 | 0.91–1.54 | fetch over 60 min: copy from machine B over the private network instead, if B has it | never skipped |
| B0 | B | The same, without the card's dry run | readiness step 1 | the same | 50–85 | 0.91–1.54 | as A0 | never skipped |
| **1** | | **Priority 1: reads at 1 billion against the split bar** | | | | | | |
| A1 | A | The flat-goodput check on the merged head: one-core default reader, old pin, three arms (off with 1 permit, off with 4 permits, cut lookup alone), 60 s at 1, 16 and 256 seats | C.3 A1 | the arm variants (E.2 item 2) | 30–39 | 0.55–0.71 | any wrong value | 8th to go |
| A2 | A | Uncached reads, RD5 command 1: prefetch at 3 permits (`pf3`), the same with read-ahead off (`pf3r`), the same with a 1.5 GiB cache (`pf3c`); random subjects, 256 seats, 90 s windows, saves at 23 commits/s in one window | `rd5/UNCACHED-READ.md` section 7 | one copy per configuration | 50–60 | 0.91–1.09 | any wrong value or prefetch failure; skip a configuration with under 18 min to its deadline | never skipped |
| A2b | A | The card's read configuration on the same windows: 12 permits, prefetch, read-ahead off only if `pf3r` beat `pf3` by 15% or more | `rd5_arm` with permits 12 | one copy | 18–20 | 0.33–0.36 | as A2 | 6th to go |
| A9 | A and B | Two readers, RD5 command 2 (`two-pf`, `two-pfr`): machine A's stack and reader, machine B's second reader, odd seats to B; at the first step boundary after both A2b and B2 | `rd5/UNCACHED-READ.md` section 8 | private network; the image and a checkout on B | 55–60 on each | 2.00–2.18 | either reader under 2.4 cores with both under 2,600 reads/s: stop after `two-pf` | 9th to go |
| **2** | | **The scorecard on the merged head with the product's save path** | | | | | | |
| A4 | A | The full card at 1 billion, parts 1 to 3 and assembly: tuned reader, 12 permits, the read options A2 chose, the product's save path on the fast writers (S2's arm C options), no-burst shape S, `server-32`, per-save credits, 300 s cells, per-read classification | C.3 A4 | three copies, one per part | 130–160 | 2.36–2.91 | a part refused twice; transactor peak 56 GiB or any limit event: finish the part, then stop | part 3 is the last thing dropped from A4 |
| **3** | | **Questions across subjects and API-call reads at size** | | | | | | |
| B1 | B | Bring-up 1: the journal probe, ID lists, the exact sweep arms A, B and C | readiness step 2 | the sealed cluster as `DEMO_ORIGINAL` | 50–96 | 0.91–1.74 | any count difference | never skipped |
| B2 | B | Bring-up 2: the question reader against sweeps on the main reader | readiness step 3 (`xq7/server.ts`) | a new bring-up | 31–57 | 0.56–1.04 | any count difference | never skipped |
| B3 | B | API-call reads: arms `today`, `batch1`, `floor`; re-read and random; 64 and 256 callers; list page at 8 | `api1/API-CALL-READS.md` section 7 | a new bring-up, tuned reader, `DX_READ_BATCH=1` | 33–49 | 0.60–0.89 | any call reading two positions in a batch arm, any wrong answer | never skipped |
| B4 | B | The commit-time index: backfill of a copy of the 1 billion database, with 10,000 sampled subjects checked | `xq4/COMMIT-INDEX.md` S-1 | its own copy | 90–240 | 1.64–4.36 | any mismatch or a non-zero dry run: stop B4 to B7 | never skipped |
| B5 | B | The index save pair: card parts 1 and 2 on two copies of the backfilled database, index off and on, with A4's product save path options | `xq4/COMMIT-INDEX.md` S-2 with A4's `EXTRA` | two copies of B4's result | 116 | 2.11 | a lost save | 7th to go |
| B6 | B | The agreement gate at 1 billion: index against the exact sweep on account-003, now and 30 days ago | `xq10/QUESTIONS-CONNECTED.md` section 8 row G | bring-up 3 on the backfilled copy | 18–42 | 0.33–0.76 | any difference: stop | never skipped (if B4 passed) |
| B7 | B | The index question bench | `xq4/COMMIT-INDEX.md` S-3 | its own bring-up of the backfilled copy | 40–60 | 0.73–1.09 | — | 5th to go |
| **4** | | **Publish at 1 billion (priority 5)** | | | | | | |
| A5 | A | Publish at 100,000 subjects on the aged database: ACT3's twelve windows (barrier 6 and rolling 6; 3.5, 23.5 and 39.4 saves/s), probe reading at least each receipt, no background settlement | C.3 A5 | a prepared copy of the aged cluster (`act7/prepare-copy.sh`) | 50–80 | 0.91–1.45 | a read answered before an acknowledged Publish; any wrong answer | never skipped |
| A6 | A | Optional: settlement beside saves, three accounts at 1 billion (ACT7 (b)) | `actv-lazy/act7/RUN2.md` section 6.4 | a prepared aged copy | 155–180 | 2.82–3.27 | any refused frame | 4th to go |
| **Optional** | | | | | | | | |
| A7 | A | Tape M (the real mix, mostly creations) with the creation option, S4's arm F | readiness step 14 | two copies | 71–85 | 1.29–1.54 | under 99% on the per-subject writer | 3rd to go |
| A8 | A | The 1,024-seat stress step with the waiting-read bound off and at 128, tuned reader, 90 s cells | C.3 A8 | two arms of two copies | 90 | 1.64 | — | 1st to go |
| B8 | B | The card on the fresh database (430 million records), as A4 | A4 with `CARD[0]=fresh` | fetch the fresh archive (107 GB) | 150–200 | 2.73–3.63 | — | 2nd to go |
| A10 | A | Evidence copy to the Mac, checksums on both sides, cleanup, delete, ledger | — | — | 20–30 | 0.36–0.55 | — | never skipped |
| B10 | B | The same | — | — | 15–25 | 0.27–0.45 | — | never skipped |

**Totals.**

| | Machine minutes | USD |
| --- | ---: | ---: |
| Core runs (A0, A1, A2, A2b, A4, A5, A9, A10; B0 to B7, B9 = B's half of A9, B10) | 901 to 1,364 | **16.37 to 24.78** |
| Optional runs (A6, A7, A8, B8) | 466 to 555 | 8.47 to 10.08 |
| All runs | 1,367 to 1,919 | **24.83 to 34.86** |
| Held back for reruns and a slow fetch | | 10.00 |
| Worst case with every run at its high estimate and the reserve spent | | 44.86 (under the USD 46 stop) |

Wall clock: machine A 12 to 15 hours, machine B 11 to 17 hours with B8 (8 to 14 without).

**Order on each machine.** A: A0, A1, A2, A2b, A9 (with B), A4, A5, then A6, A7, A8, A10. B: B0, B1, B2, A9 (with A),
B3, B4, B5, B6, B7, then B8, B10. A9 sits where both machines reach a boundary about 2.5 to 4 hours in.

### C.3 Commands that are new or changed (every other command is its page's, unchanged)

The environment, `part()`, `arm()`, `make_copy`, `remove_copy`, `rd5_arm` and the ACT7 functions (`prepare`, `discard`,
`held`, `AGED`, `LIVE`) are exactly as their pages give them: `v01/AGED-SERVER-32.md` and `v01/CARD-READER.md` section
7 for the card, `v01/READINESS.md` "Next server session" (and its history at `1ed2650bd` for `part` and `arm`),
`rd5/UNCACHED-READ.md` sections 7 and 8, `actv-lazy/act7/RUN2.md` section 6.1. `COMMIT` is the head of `exp/DX-INT1`
after the three merges of E.1, the same on both machines.

```bash
# A1. The flat-goodput check (needs E.2 item 2): the pinned pair of rd1/PINNED-1B.md
#     ("Launcher: the short pinned ladder"), old pin only, three arms, one new copy per arm.
#     Proposed variable names; the builder of E.2 item 2 fixes them and the dry run proves them.
DX_RD2_PINNED_PAIR=1 DX_RD2_PAIR_ARMS=off,off-permits4,cut-only DX_RD2_PAIR_PINS=old DX_RD2_PAIR_SEATS=1,16,256 \
  <the pair command of rd1/PINNED-1B.md>
#     cut-only = DX_PINNED_CUT_LOOKUP=1 alone; off-permits4 = both options off with TX2_READ_PERMITS=4 on the one core.

# A2. As rd5/UNCACHED-READ.md section 7: pf3, pf3r, pf3c. Before it: record the reader's native settings readback
#     (datomic.readConcurrency, datomic.readAheadPool) and run `iostat -x 5` and PostgreSQL's block counters beside it.
# A2b. The card's reader on the same windows (READ_AHEAD_OFF = 1 only if pf3r beat pf3 by 15% or more):
rd5_arm "$COPY_4" "$OUT/pf12/campaign" $(( T0 + 80 * 60 * 1000 )) 12 1 "$READ_AHEAD_OFF" 3072

# A4. The scorecard on the merged head: tuned reader, the product's save path on the fast writers, A2's read options.
READ_OPTS="DX_READ_PREFETCH=1"; [[ $READ_AHEAD_OFF == 1 ]] && READ_OPTS+=" DX_READ_AHEAD_OFF=1"
CARD=(1B production-S-noburst server-32 300 tuned)
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 $READ_OPTS DX_V01_SAMPLE_EVERY=1"
OUT=/var/tmp/srv1-card-1b
for n in 1 2 3; do make_copy "$COPY"; part "$n" "$COPY" "$OUT" "${CARD[@]}"; remove_copy "$COPY"; done
sudo env "PATH=$BUILD/tools/bin:$PATH" "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --assemble --commit "$COMMIT" --out "$OUT"
#     DX_V01_SAMPLE_EVERY is the proposed name of E.2 item 1 (sample every exchange in both P1 lines).
#     Before reading any number: the card's run settings name DX_S2_PRODUCT and the writer options, the writer's
#     write-options show subjectWide, subjectHints, generalPrefetch, and reader-check.json shows the read options.

# A5. Publish at 100,000 subjects on the aged database (needs E.2 item 4): ACT3's twelve windows, at-least probe.
TEMPLATE=$AGED_PGDATA_SOURCE; prepare "$TEMPLATE"; DX_LAZY_OUT=/var/tmp/srv1-publish-1b
held "${AGED[@]}" "DX_ACT3_SETTLE=0" "DX_ACT3_AT_LEAST=1" "DX_HELD_MINUTES=120"   # windows: the runner's default twelve, as readiness step 30
discard

# A8. The 1,024-seat step with the waiting-read bound off and at 128, tuned reader, 90 s cells.
for a in off on; do
  limit=; [[ $a == on ]] && limit=DX_READ_WAIT_LIMIT=128
  sudo bash lab/experiments/EXP-DX1/w3/threads-sampler.sh "/var/tmp/srv1-rq-$a-threads.jsonl" & sampler=$!
  EXTRA="DX_THREAD_COUNTERS=1 $READ_OPTS $limit" arm "/var/tmp/srv1-rq-$a" 1B production-S-noburst server-32 90 tuned
  wait "$sampler"
done

# B5. The index save pair with the product's save path (the off arm on its own backfilled copy, as S-2 requires):
EXTRA="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"   # then S-2's two arms
```

## D. Predictions, written before any run

A star (★) marks a prediction that, if wrong, changes the design; what follows from it is in D.8. Ranges are the
expected outcome with about 80% confidence unless a share is given.

### D.1 Staging

| Reading | Predicted | Reason |
| --- | --- | --- |
| Fetch of the 145.4 GB archive inside the bucket's site | 8 to 40 min | 150 to 400 MB/s per stream, never timed (`act7/RUN2.md` 6.1) |
| Extract and tree check (1,642 files, 176,078,670,513 bytes) | 8 to 18 min | zstd on all cores; the tree hash reads 176 GB from NVMe |
| One scratch copy of the cluster | 2 to 3 min | 122 to 166 s measured on 2026-11-23 |
| Build (`v01/build.ts`) | 5 to 10 min | earlier builds |

### D.2 Run A1: the flat-goodput check (one core, old pin 87,002, single-subject exchanges)

| Arm | 1 seat | 16 seats | 256 seats | Reader CPU | Time inside the permit |
| --- | --- | --- | --- | --- | --- |
| Options off, 1 permit (control) | 17–22/s, p50 40–55 ms | 17–22/s, p50 0.7–0.95 s | 17–22/s, p99 11–15 s | 0.95–1.0 core | p50 40–55 ms |
| Options off, 4 permits ★ | 17–22/s | **17–22/s** | 17–22/s | 0.95–1.0 core | p50 150–220 ms at 16 seats (four reads share the core) |
| Cut lookup alone ★ | 300–650/s, p50 1.3–3 ms | 330–650/s | 330–650/s, p99 0.6–1.2 s | 0.95–1.0 core | p50 1.3–3 ms |

Every arm: 0 wrong values, 0 errors at 1 and 16 seats; storage reads 0.8 to 1.5 per read. Reason: E1 (A.3); the cut
lookup alone leaves the as-of subject read (about 1 ms in the probe) without the walk.

### D.3 Runs A2, A2b and A9: subjects not in memory (256 seats, random subjects, 90 s windows)

| Configuration (window `ref-random-seed-cut` unless named) | Reads/s | p50 / p99 ms | Storage reads per subject | Reader cores | SQL ms per exchange |
| --- | --- | --- | --- | --- | --- |
| `pf3` (prefetch, 3 permits) | 1,500–1,850 | 140–170 / 240–310 | 1.5–1.9 | 2.65–2.9 | 3–6 inside the permit |
| `pf3r` (read-ahead off) ★, if X1 (about 60%) | 2,100–2,600 | 98–120 / 160–210 | **1.05–1.4** | 2.65–2.9 | 2–5 |
| `pf3r`, if not X1 | as `pf3` ± 7% | | within 0.15 of `pf3` | | |
| `pf3c` (1.5 GiB cache) | 1,450–1,950 | 135–175 / 230–320 | 1.5–2.3 (0 to 0.15 above `pf3`) | 2.6–2.9 | 3–6 |
| `pf12` (A2b: 12 permits, prefetch, A2's read-ahead choice) | within ± 10% of the better of `pf3` and `pf3r` | same tail ratio | same | 2.8–2.95 | rises 2–5 ms over 3 permits |
| `two-pf` (A9, both readers) | 3,000–3,600 | 70–90 / 110–160 | 1.5–1.9 | 2.6–2.9 each | — |
| `two-pfr` (A9) ★, if X1 | 4,200–5,000 | 51–61 / **85–115** | 1.05–1.4 | 2.6–2.9 each | — |

Also: `s-random-near-head` stores 23.07 to 23.08 commits/s with commit p99 50 to 70 ms in every configuration; PostgreSQL
0.35 to 0.45 cores with one reader, 0.65 to 0.95 with two; 0 wrong values, 0 errors, 0 prefetch failures. The reader's
resolved `datomic.readConcurrency`: 8 or more (Datomic's default; if it reads 4 or fewer it is the cap of A.2, and the
next arm sets it to 16). The 300 ms bar for misses: **met by `pf3r`, `pf12` and both two-reader configurations; `pf3`
at even odds; the 100 ms aim met only by `two-pfr`, at even odds.** Reason: RD5's model (A.7) with its measured inputs.

### D.4 Run A4: the scorecard on the merged head (1 billion, product's save path, tuned reader, 12 permits)

**P1 in memory** (the re-read line's in-memory exchanges, batches of up to 8):

| Seats | 1 | 4 | 16 | 64 | 256 | 1,024 (stress) |
| --- | --- | --- | --- | --- | --- | --- |
| Reads/s | 400–800 | 1,200–2,500 | 2,500–5,500 | 3,000–5,500 | **8,000–11,000** | 1,000–1,800 |
| p50 ms | 1.2–2.5 | 1.5–4 | 4–8 | 11–20 | 20–30 | 500–900 |
| p99 ms | 3–15 | 5–20 | 15–45 | 50–90 | **75–115 (central 95) ★** | 900–1,500 |
| Share of exchanges in memory | 85–100% | 70–95% | 55–85% | 50–75% | 45–65% | 5–20% |

Goodput at 256 at or above the 64 level: met. Stress clause (goodput at 1,024 ≥ 0.9 of 256): missed. Verdict at 256 on
the 100 ms bar: **met with about 55%**. 0 wrong values in every step. Reason: the tuned arm (10,598.8/s, p99 83 ms at
the old pin, no saves; 8,368 to 8,879/s, p99 99 to 108 ms with the quiet stream or saves), the 9 GiB heap cutting
collection, A2's read options neutral for cached subjects.

**P1 not in memory** (the random line, 256 seats): the A2b configuration's numbers within 10% (D.3), storage reads per
subject the same, cache hit share by request 0.77 to 0.86, 0 to 2% of exchanges in memory. Verdict on 300 ms: met if
A2 chose read-ahead off (about 60% overall), else even odds.

**P2, P3, P4, P6, P7, P8** (second halves of 300 s cells, latency from the scheduled offer, all loaded saves):

| Reading | 50 rows/s | 235 | 394 | 620 | Reason |
| --- | --- | --- | --- | --- | --- |
| Shape S commits on the per-subject writer (from the gateway's `saveRoutes`) ★ | 95–100% | 95–100% | 95–100% | 95–100% | S2 arm C: replacements and the wide writer take one-subject saves |
| Commit p50 ms | 6–10 | 5–10 | 5–10 | 6–11 | CARD2's 7 to 10 with the lab producer, 0.5 to 2 ms less with the wide writer and hints, plus up to 1 ms for first-save predecessor requests |
| Commit p99 ms ★ | 35–65 | 28–55 | 28–55 | 30–60 | 40.6 ms second-half p99 at 394 in REAL2's 300 s run; the 50/s cell has the fewest commits and a cold share |
| P2 bar (p50 ≤ 10, p99 ≤ 50) | at risk | met | met | met at 60% | all four together about 45% |
| Mean serial apply per S commit | 0.6–1.2 ms | | | | S2 arm C |
| Stored against offered; expired; read-back | all; 0; exact | | | | every earlier card |
| Quiet account commit p99 loaded (P6, 1,050 per side) | 12–35 ms | 12–35 | 12–35 | 15–40 | production-S card 12 to 21 ms |
| Quiet pinned reads p99 | 5–40 ms, under 1% missed | | | | the tuned reader serves them |

- **P3:** feed lag p99 at the 256-reader step 25 to 60 ms (met); at 1,024 0.3 to 2 s; whole tape 100 to 300 ms; 0 gaps,
  0 order violations.
- **P4:** drained in 5 to 80 s; current pulls p50 3 to 5 ms, p99 12 to 25 ms (met at even odds); gateway time per pull
  p99 8 to 20 ms.
- **P7:** first pull p99 60 to 100 ms (met); added reader memory per roster subject 300 to 900 B (not met).
- **P8:** paced import 3,100 to 3,350 facts/s, save p99 15 to 30 ms, read p99 4 to 10 ms.
- **Role memory (`memory.peak`):** transactor 50 to 55.5 GiB of 57; writer 3 to 5 of 6; reader 9.3 to 10.6 of 11;
  PostgreSQL 5.0 of 5. SQL time per storage read in the random line 0.5 to 0.7 ms (above 0.7 means PostgreSQL's cut
  page cache costs reads).

### D.5 Runs B1 to B7: questions across subjects and API-call reads at 1 billion

| Run and reading | Predicted | Reason |
| --- | --- | --- |
| B1 ID lists, account-003 | exactly 100,000 subjects in 100 pages at the head and at 87,002; warm walk 0.1–0.35 s, cold 0.3–1.0 s (first page 5–30 ms); 87,002 at 1.0–2.5× the head | XQ3 toy: 2 storage reads per cold page at the head, 6 at an old pin |
| B1 sweep, count of 100,000 subjects | exact and equal at 1, 3 and 6 parts; 120–210 s, 45–80 s, 30–60 s; 150,000–200,000 storage reads | 1.5 to 2.0 fetches per subject swept, one permit each part |
| B1 sweep beside re-read pinned readers (arm B) | the readers' reads/s down 30–80% (1 part) and 50–85% (3 parts), back within 10% after; save p99 within 1.25× | the sweep evicts the 3 GiB cache's working set |
| B1 question shapes (arm C) | C1 (subjects with 3 or more open tasks) 220–440 s on 1 part, 45–100 s on 6; C2 (top 100 by pay) 100–200 s on 1 part | XQ9 |
| B1 journal probe | pages from below the sealed head stop on `limit` with 1,000 journals; bounded pages at most 4,096 entries and about 100 ms; field history warm 20–120 ms, cold 1.5–5 s | JRN1 |
| B2 question reader ★ | main reader's storage reads per pinned read: 0–0.05 in controls; 0.6–1.8 with a count on the main reader (reads/s down 40–80%); equal to the control (within 0.05) with the count on the question reader; counts identical in all four windows; 1 part 250–500 s on the main reader, 150–260 s on the question reader; 3 parts 90–160 s | XQ7 section 6 |
| B3 API-call reads, per reader core | subject page through the floor: **300–470 calls/s per core re-read, 90–160 random** (model 385 and 112); one-request batch 45–65 and 38–55; today's port 12–17 and 11–15 | API1 sections 10 and 11 |
| B3 windows, subject-centred mix, re-read, 64 callers | today 60–75 calls/s, p99 1.6 s; batch 170–210, p99 0.57 s; floor 250–330, p99 0.38 s | 2.7 busy cores ÷ CPU per call |
| B3 one position per call | 0 calls reading two positions in the batch and floor arms; own writes missed after a save 2–10% in `today`, 0 in the others | API1 gate |
| B3 storage loads per random subject-centred call | 2.2–4.4 (central 2.7); per random list page 130–570 | API1 model |
| B4 backfill | 17.9 million entries ± 5%; 230–330 B each; 25–75 min; 10,000 sampled subjects 0 mismatches; dry run 0 to add, 0 to retract | XQ4 |
| B5 index on minus off, product save path ★ | datoms per save +1.5 to 2.5; log bytes +300 to 800 B; reads inside apply +0.04 to 0.13 per first touch. **Per-subject writer share with the index on: under 30% (the toy sent every tape M save to the general writer with the index on), commit p50 +0.5 to 2 ms and p99 +0 to 8 ms** | XQ10 "one finding"; XQ10 section 8b item 4 |
| B6 agreement gate | 11 comparisons of 7 questions, now and 30 days ago: **0 differences** ★; index counts 0.03–0.5 s warm; a sweep of 100,000 subjects 30–60 s on 10 parts; 570,000 tasks 3–6 min | XQ10 |
| B7 bench | first pages 1–5 ms warm, 8–50 ms cold; Q1 count 30–120 ms warm; Q4 full count 0.15–0.5 s warm; Q5 40–150 ms warm; quiet pinned-read p99 ratio at most 1.15 beside a cold Q4 count | XQ4 S-3 |

### D.6 Run A5: Publish at 100,000 subjects on the 1 billion database

| Reading | Predicted | Reason |
| --- | --- | --- |
| Publishes inside one second ★ | 24 of 24 (two per window, twelve windows); at least 23 | fresh: 100 of 100 and 120 of 120; the permanent record is one small write, not sized by the database |
| First correct answer after Publish, p50 / p99 | 30–80 ms / 60–500 ms | fresh 31.6–67.3 / 50.9–421.4 ms; misses on cold subjects add a few ms |
| Pause to durable record, p50 | 25–50 ms | fresh measurements |
| Early answers (read before an acknowledged Publish) | 0 (the probe reads at least each receipt) | RD4 |
| Live saves' p99, Publish windows ÷ control, 3.5 and 23.5 saves/s | 0.8–1.3 | fresh at or under 1.1 |
| The same at 39.4 saves/s, whole windows | 1.3–2.5 (bar 1.5: missed at about 60%) | fresh 1.7 to 2.3; one to three whole-store stalls per 100 s window, more index work at 1 billion |
| The same outside stall seconds | 0.8–1.3 (met) | fresh 0.76 and 1.07 with per-save credits |
| Live pinned reads' p99 ratio | 0.8–1.3 | Publish writes little; the reader is not the Publish path |

Note: enrolment and Publish in this runner still drain the account's saves around them (H12.1); Publish beside saves
(ACT8) merges with every option off and is not measured here.

### D.7 Optional runs

| Run and reading | Predicted | Reason |
| --- | --- | --- |
| A6 three accounts settling at 1 billion | 0 frames refused; per account 5.94 million changes and 2.00 million notices within 2%; settle 65–100 min; turns within 10% between accounts; pause and pace obeyed; save p99 within 1.3× the control | ACT7 section 6.6 |
| A7 tape M, creation option on | 99–100% on the per-subject writer; serial apply 0.3–0.6 ms; commit p50 5.5–9 ms, p99 20–45 ms per step | S4 |
| A8 1,024 seats, bound off / 128 | off: reads/s 1,000–1,800, feed lag p99 0.3–2 s, busy web threads 400–512; on: feed lag p99 under 250 ms, busy under 200, reads/s within 20% of off, refused reads retried by the SDK | W3 toy; tuned arm at 1,024 |
| B8 fresh card | as A4 with re-read L256 within 10% of A4 and random reads/s 10 to 30% higher (fewer segments) | the fresh card of 2026-11-21 and the 1 billion arms |

### D.8 What each starred prediction means if it is wrong

1. **A1, 4 permits give 40/s or more on one core:** a serial point, not CPU, held reads; permits must follow storage
   waits on every reader, and the read path has a wait the probe did not see.
2. **A1, the cut lookup alone under 150/s:** the walk is not the whole old-pin cost; the as-of subject read is costly
   at 1 billion and the short-cut becomes required, not optional.
3. **`pf3r` loads per subject within 0.15 of `pf3`:** read-ahead is not the excess; one leaf per subject is not what
   the 1 billion database delivers, the next arm is a 6 GiB cache, and the "about 7 to 8 reader cores" sizing for the
   100 ms aim stands.
4. **`two-pfr` p99 over 130 ms, or two readers under 1.8× one:** scale-out does not carry misses to 100 ms (PostgreSQL's
   core or the network is the shared limit); the row cache (A.5 rank 3) becomes the next build, not more readers.
5. **In-memory p99 at 256 over 130 ms on the card:** the card's stack (the 9 GiB heap, 12 permits, the product's writer
   beside it) costs the reader capacity the arms did not pay; the in-memory bar then needs a fourth reader core or
   separate pools (A.5 rank 2).
6. **Under 95% of S commits on the per-subject writer:** the product's saves do not reach the fast writer at 1 billion;
   P2 then rests on the general writer and the save contract needs another look before v0.1.
7. **P2 p99 over 50 ms at 394 or 620 in the second halves:** the fast writer does not keep the commit bar at 1 billion
   in steady state; the next lever is the transactor's cache or index settings, not the save shape.
8. **B2: main-reader windows within 10% of the control:** sweeps do not displace the cache at 1 billion; the question
   reader is not needed, and the open question of where its memory comes from disappears.
9. **B5: the per-subject share stays at 95% or more with the index on:** the toy's decline does not occur at 1 billion
   and the index can be considered for default; if the share falls as predicted, the index and the fast save path
   conflict and must be reconciled before the index is turned on anywhere.
10. **B6: any difference:** the index is not exact at 1 billion; nothing built on it ships.
11. **A5: a Publish over one second:** the permanent record's cost grows with the database; Publish's design must
    change before 10 billion is discussed.

## E. What must be true before renting (a checklist for the orchestrator)

**E.1 Merges on `exp/DX-INT1`** (the three reviewed merges landing today; the session runs on the head after them)
- [ ] Key pool and reply fix (`exp/DX-N1-key-pool` `09730f887`) merged with the reviewer's resolution for the two files
      that conflict with the save-line fixes.
- [ ] ID allocator fix (the commit the Publish builder reports after V3) merged. **Required before any run with
      `DX_S2_PRODUCT=1`:** with ordered saves on, the SDK's own save path reserves ID blocks and the collision's refusal
      reaches the caller as a failed write (Publish reviewer, V1).
- [ ] The Publish line (`exp/DX-ACT8-publish-beside-saves` `a6f89a409` or its fifth-round head) merged with every
      option and setting off.
- [ ] On the final head's own image: stored-function identities equal to the reference in all 8 writer settings, the
      standing key-deletion gate, the production gate and the outcome gate pass; `COMMIT` recorded.

**E.2 Small builds and dry runs on the Mac toy** (correctness only; one ordinary heavy token each; no lease)
- [ ] 1. Per-read classification in the card (section B): a sampling option for both P1 lines and the two rows "P1 in
      memory" and "P1 not in memory", gated on `v01/mac.ts` with the tuned reader. If not ready, the card judges by line.
- [ ] 2. The pinned pair's arm variants for A1 (cut lookup alone; options off with 4 permits on the one core; old pin
      only), dry run to the first offer. If not ready, A1 is skipped (the 2026-11-23 pair stands).
- [ ] 3. The card part 1 dry run with `--reader tuned --read-permits 12` and A4's full `EXTRA` (product path, prefetch,
      read-ahead off, sampling): the reader check accepts the read options and records them; the writer's
      write-options name the product path options.
- [ ] 4. Publish windows on an aged copy: `held-server.sh` with `DX_ACT7_AGED_BUNDLE`, `DX_HELD_PROFILE=server-32` and
      ACT3's windows, dry run on ACT7's aged miniature. If it refuses, A5 becomes ACT7 (b) (A6) with its own Publishes.
- [ ] 5. Dry runs at the final head of: `rd1/saves-gate/harness.ts` with RD5's options; `api1/gate.sh … server`;
      the toy runs of `xq3/server.ts`, `xq6/server.ts`, `xq7/server.ts`, `xq10/server.ts`; `xq1/server.ts backfill`
      on a toy copy; ACT7's miniature.
- [ ] 6. Accepted risk, stated: the second reader's cross-machine path (`DX_REMOTE_READER_HOST`, `second-reader.sh`)
      has never run anywhere; its first run is A9, and its failure costs only A9.

**E.3 Inputs staged and checked**
- [ ] The bucket listing shows `aged-1b/cluster.tar.zst` (145,378,109,239 bytes, SHA-256 `ea9a4b1d…`), the handoff
      `aged-scorecard.json` (SHA-256 `faab1bc5…`) and the manifest files; the SCALE1 metadata directory
      (`image.json`, `transfer.json`) is in the bucket or copied by the driver; the fresh archive only if B8 runs.
- [ ] Datomic Pro 1.0.7745 and the Java 21 and 25 builds: sources and checksums as in `lab/DOWNLOADS.md`.
- [ ] Storage credentials, server addresses and the SSH key name only in the private driver briefs.
- [ ] Disk per machine: 520 GB free on the root drive while the archive is kept (delete it after the tree check), WAL
      on the second drive; machine B needs room for the sealed cluster, the backfilled copy and one working copy
      (about 540 GB) after deleting the archive.

**E.4 Guards**
- [ ] Each driver's brief carries the stop numbers (USD 46 no new step, USD 48 delete), its machine's delete, the
      provider check that the server is gone, and the ledger row.
- [ ] The detached deadline alert set on the Mac at the forecast end plus 2 hours; the 2-hourly check scheduled.
- [ ] The orchestrator's own model usage has room for 17 hours of watching (the 2026-11-21 stall).
- [ ] This page pushed before renting, so every prediction above predates the runs.

**E.5 The machines (found at 17:40 EST on 2026-11-25)**
- [ ] **Stock check right before renting.** The provider's list showed no f4.metal.small in stock at the bucket's site
      (three at one other site, one at a third). Choices, in order: (a) two f4.metal.small at the bucket's site when
      listed; (b) two at another site, both there, after checking the price and speed of moving 145 GB across sites;
      (c) a 16-core, 128 GB machine at the bucket's site (USD 1.25 or 1.52 an hour, one of each listed): more memory
      for the question reader and a larger reader cache, but a different processor, so no number is comparable with
      2026-11-23 and every prediction above would need a stated correction. (a) or (b) keeps the predictions valid.
- [ ] A private network between the two machines (A9; also the fallback copy of the cluster from one machine to the
      other).
- [ ] Firewall TCP 22 only; nothing personal on the machines.
