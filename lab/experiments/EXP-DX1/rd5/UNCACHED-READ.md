# A pinned read of a subject the reader does not hold: where 1.7 ms goes, and what makes it cheaper

DX-RD5, 2026-11-24, branch `exp/DX-RD5-uncached-read` from `origin/exp/DX-INT1` `9e02cf1d2`. Server evidence: the
random-subject windows of 2026-11-23 at 1 billion records (`evidence/DX-SCALE1/pinned-saves-1b-e02/`, 3 read permits;
`evidence/DX-SCALE1/random-1b-d94/`, 6 and 12 permits), and the probe `evidence/DX-SCALE1/rd2-probe/`. Mac evidence:
`evidence/DX-RD5/` (private). Mac times are diagnostic; counts are exact.

<!-- ANSWER -->

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

<!-- SECTIONS -->

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
cores; serving two readers at the bar's rate (6,340 gets/s) needs about 0.9 to 1.0 of a core, so its core stays
enough only if PostgreSQL keeps its 8 GiB page cache warm; give it a second core for this test.

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
OUT=/var/tmp/triplex-rd5-1b; mkdir "$OUT" "$OUT/pf3" "$OUT/pf3c" "$OUT/pf6r"   # one parent per configuration
T0=$(date +%s%3N)
rd5_arm "$COPY_1" "$OUT/pf3/campaign"  $(( T0 + 20 * 60 * 1000 )) 3 1 0 3072   # prefetch, 3 permits
rd5_arm "$COPY_2" "$OUT/pf3c/campaign" $(( T0 + 40 * 60 * 1000 )) 3 1 0 1536   # the same, 1.5 GiB cache
rd5_arm "$COPY_3" "$OUT/pf6r/campaign" $(( T0 + 60 * 60 * 1000 )) 6 1 1 3072   # prefetch, 6 permits, read-ahead off
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
| `pf3c` (1.5 GiB cache) | 1,450 to 1,950 (1,700) | 135 to 175 | 230 to 320 | 1.5 to 2.3 | 2.6 to 2.9 | 3 to 6 ms | 8 to 15 ms |
| `pf6r` (read-ahead off) | 1,550 to 1,950 (1,720) | 135 to 165 | 230 to 300 | 1.5 to 1.9 | 2.7 to 2.95 | 3 to 6 ms | 15 to 30 ms |

- `s-random-near-head` stores 23.07 to 23.08 commits/s with S commit p99 50 to 70 ms in every configuration; quiet p99
  as yesterday (8 to 60 ms). Wrong values and errors 0. Prefetch failures (`/v2/admin/scan-stats` `readPrefetch.failures`)
  0. **The 100 ms bar is not met in any configuration.**
- `pf3c` against `pf3`: the collector's pause share falls from about 18 to 20% to 12 to 16% of the wall (fewer decoded
  segments survive a young collection), and loads per subject rise by 0 to 0.15.
- `pf6r` against `pf3`: process-wide `StorageGet` per subject (the reader's metrics minutes) falls by 0 to 0.2;
  sampled loads per subject unchanged (the sampled count never included read-ahead loads, Mac finding below).

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
5. **`pf6r` process-wide gets per subject lower than `pf3`'s by more than 0.3:** Datomic's read-ahead is a real part of
   the 1 billion cost (the Mac toy says no); the option then belongs in the tuned reader.
6. **Any wrong value, any error, any prefetch failure:** stop; an option must not merge.

## 8. Server command 2: a second reader on a second machine (about 45 minutes with set-up, ceiling 60)

**Machines.** Machine 1: the bare-metal shape of 2026-11-23 (12 cores, 96 GB) with the held 1 billion cluster.
Machine 2: any machine on the same private network with at least 4 cores and 12 GB free, Docker, the scorecard image
(`docker save $SCALE1_IMAGE | ssh machine-2 docker load`, about 1.7 GB) and a checkout at `$COMMIT`. Addresses stay in
the driver's private notes.

```bash
# On machine 2 (as root), first; it waits up to 10 minutes for machine 1's PostgreSQL and transactor:
RD5_MACHINE1=<machine 1 private IP> RD5_LISTEN=<machine 2 private IP> RD5_IMAGE="$SCALE1_IMAGE" RD5_REPO=<checkout at $COMMIT> \
  RD5_CPUS=0-2 RD5_PERMITS=3 RD5_PREFETCH=1 RD5_READ_AHEAD_OFF=0 RD5_HEAP_MIB=6144 RD5_CACHE_MIB=3072 RD5_MEMORY_MIB=9216 \
  RD5_OUT=/var/tmp/triplex-rd5-second/r2 bash lab/experiments/EXP-DX1/rd5/second-reader.sh start   # prints DX_RD5_SECOND_READER=...
# On machine 1, at the same time (the function of command 1; unset both settings afterwards):
OUT=/var/tmp/triplex-rd5-two; mkdir "$OUT" "$OUT/two"
export DX_REMOTE_READER_HOST=<machine 1 private IP> DX_RD5_SECOND_READER=http://<machine 2 private IP>:18492
rd5_arm "$COPY_1" "$OUT/two/campaign" $(( $(date +%s%3N) + 40 * 60 * 1000 )) 3 1 0 3072
unset DX_REMOTE_READER_HOST DX_RD5_SECOND_READER
# On machine 2, after machine 1's arm has ended:
RD5_OUT=/var/tmp/triplex-rd5-second/r2 bash lab/experiments/EXP-DX1/rd5/second-reader.sh stop
```

The window driver then sends seats 1, 3, 5, … to machine 2 and the others to machine 1's reader; tape pins do
not run in the random arm. Machine 2's reader keeps no trace; `second-reader.sh` samples its CPU and memory (`docker stats`)
every 5 s into `$RD5_OUT/stats.txt` until the container is removed.

**Predictions, written before any run** (two readers of three cores each, both with the prefetch, 128 seats each):

| Window | Reads/s, both readers (central) | p50 | p99 | Machine 1 reader cores | Machine 2 reader cores | PostgreSQL cores | SQL ms per get (machine 1 / machine 2) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ref-random-near-head` | 3,000 to 3,600 (3,300) | 70 to 90 ms | 110 to 160 ms | 2.6 to 2.9 | 2.6 to 2.9 | 0.65 to 0.95 | 0.5 to 0.7 / 0.6 to 0.9 |
| `s-random-near-head` | 2,950 to 3,550 (3,250) | 70 to 90 ms | 110 to 165 ms | 2.6 to 2.9 | 2.6 to 2.9 | 0.7 to 1.0 | as above |
| `ref-random-seed-cut` | 2,800 to 3,400 (3,100) | 75 to 95 ms | 120 to 175 ms | 2.6 to 2.9 | 2.6 to 2.9 | 0.65 to 0.95 | as above |

- Each reader serves its 128 seats at about what one reader serves 256 with the prefetch (`pf3` central 1,680), since
  the readers share nothing but PostgreSQL. Little's law with 256 seats then gives p50 near 256 ÷ 3,300 = 78 ms, and
  the tail stays at about 1.6 to 1.9 times p50.
- **The 100 ms bar: missed narrowly** (central p99 about 135 ms). Six reader cores are not quite enough; the forecast
  for meeting it is eight reader cores on two machines (two readers of four cores, or one reader of eight).
- Saves: 23.07 to 23.08 commits/s stored, S commit p99 50 to 75 ms (machine 2's reader adds one more peer receiving
  novelty from the transactor). Wrong values and errors 0.
- Network: machine 2 draws 150 to 200 MB/s from PostgreSQL (about 1,650 reads/s × 1.76 gets × 60 KB).

**What would show them wrong:**
1. **Both readers together under 2,600 reads/s, with each reader under 2.4 cores:** something shared limits them.
   First suspect PostgreSQL's one core (above 0.9 cores) or its page cache (TOAST reads from disk rising), then the
   transactor's push of novelty. A second reader then needs PostgreSQL resized first.
2. **Machine 2's reader more than 15% slower than machine 1's at the same cores:** the network round trip costs more
   than the prefetch hides (check `ping.txt` and the SQL ms per get on machine 2).
3. **p99 under 100 ms at both pins:** six cores meet the bar; the sizing above was pessimistic.
4. **Any wrong value or error on either reader:** a second peer is not exact as assumed; stop.

<!-- MAC -->

