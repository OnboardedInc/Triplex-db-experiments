# The question reader: questions across subjects on their own read gateway (XQ7, 2026-11-24)

**A sweep or an ID list can now run on a second read gateway process with its own Datomic peer, object cache, cores
and permit pools, so it never loads a segment through the cache that pinned and current reads depend on.** On the
toy, with the sweeps on the question reader, the main reader's 256 pinned readers took **0 storage reads** in every
window (`cache-3`: 69,913 pinned reads beside 108,416 subjects swept there); with the same sweeps on the main reader they took 104 storage reads in 28,780 pinned reads (36,577 subjects swept), against 0, 0 and 3 in the three controls. Every ID list and sweep page the
question reader answered was byte-equal to the main reader's answer to the same request (**2,794 pages, 2,165,641 bytes compared, 0 differences, and every answer equal to brute force**). Everything is
off by default: with no option set, the gateway's routes, the SDK's calls and the launcher's docker commands are
exactly as before (gate e). Branch `exp/DX-XQ7-question-reader`, from `exp/DX-XQ6-exact-sweep` `909309c63` with
`exp/DX-RD5-uncached-read` `67bca118e` merged in (no conflicts). Not merged onto `exp/DX-INT1`.

## 1. What was built

| Part | Option (default off) | What it does |
| --- | --- | --- |
| Question reader | gateway `TX2_QUESTION_READER=1` | Serves the question routes (`POST /v2/db/{db}/ids`, `sweep`, `find`), its health, `/v2/admin/*` and `GET basis`; refuses everything else with **421 `QuestionReaderOnly`** (the routes listed in `routes`). |
| Main gateways beside it | gateway `TX2_QUESTIONS_AT=<url>` | Refuse the question routes with **421 `QuestionReaderRoute`**, `route` and `questionReader: <url>`, before any privacy or database work. |
| Route list | gateway `TX2_QUESTION_ROUTES` (default `ids,sweep,find`) | The question routes by name. `find` (the commit-time index, `exp/DX-XQ4-commit-index`, not on this branch) is served by the question reader as soon as its route exists: no other change. |
| SDK | `questionReaderUrl` (`DatomicClient` option, `makeDatomicRuntime` option) | Sends `ids`, `sweep` and `find` calls to that URL and every other call to the main URL. Unset: every call to the main URL, as before. |
| Fair queue for ID lists | gateway `TX2_ID_LIST_QUEUE_MS` (1 to 5,000), `TX2_ID_LIST_PER_ACCOUNT` (default 1) | A second ID list of a busy account waits in a fair queue per account, then in the pool's fair queue, at most that long in all, then 503 `IndexBusy` with `retryAfterMs`. The answer carries `queue: {micros, ahead}` (pages of any account admitted while it waited). Unset: refused at once, as before (review finding D7). |
| Read counters | gateway `TX2_READ_IO_COUNTERS=1` | Datomic io-stats of every read by entity summed into `/v2/admin/scan-stats` `readIo` (object cache hits `ocache`, storage reads `sql`, loads per index `*-load`). Unset: reads run as before and `scan-stats` has no `readIo`. |
| Launcher, same machine | `stack/up.sh` `DX_QUESTION_READER=1` with `DX_QUESTION_CPUS` (required), `DX_QUESTION_PORT` (default read port + 10), `DX_QUESTION_MEMORY`, `DX_QUESTION_HEAP` or `DX_QUESTION_JAVA_OPTS`, `DX_QUESTION_CACHE`, pools `DX_QUESTION_{INDEX_QUERY_PERMITS,ID_LIST_QUEUE_MS,ID_LIST_PER_ACCOUNT,SWEEP_PERMITS,SWEEP_PER_ACCOUNT,SWEEP_QUEUE_MS}`, `DX_QUESTION_ROUTES`, `DX_QUESTION_MAIN_REFUSES` (default 1; 0 lets the main reader also serve questions, for comparisons) | Starts role `q` (container `<prefix>-gw-q`, the read image, `ApplicationName=triplex-gw-q`) after the other gateways, with the ID lists and the sweep on, the stack's cursor secret, and its own pools; gives the other gateways `TX2_QUESTIONS_AT`. `stack.json` gains `questionReaderUrl`; the script prints `QUESTION_READER_URL=`. `down.sh` removes `gw-q` when present. `DX_READ_IO_COUNTERS=1` passes the counters to the read gateways. |
| Launcher, second machine | `rd5/second-reader.sh` with `RD5_ROLE=question` (and `RD5_SWEEP_CURSOR_SECRET`, pools `RD5_SWEEP_PERMITS` 3, `RD5_SWEEP_PER_ACCOUNT` 3, `RD5_SWEEP_QUEUE_MS` 5000, `RD5_INDEX_QUERY_PERMITS` 1, `RD5_ID_LIST_QUEUE_MS` 1000); machine 1's `up.sh` with `DX_QUESTIONS_AT=<url>` | The RD5 second reader started as the question reader (`tx2-dxrd5-question-reader`); prints `DX_QUESTION_READER_URL=`. Not run anywhere (no second machine). |
| Demo profile | `DEMO_QUESTION_READER=1` (`demo/server/profile.mjs`, server only) | The server run's sizing (section 6): question reader on cores 10 and 11, 6 GiB; transactor 60 → 57 GiB and PostgreSQL 8 → 5 GiB (CARD2's two cuts). Unset: output byte-identical (checked, server and toy). |

**Refuse, not route (the choice the task asked for).** The main gateways refuse questions instead of forwarding them:
a forwarding main reader would hold one of its web threads and a connection for every sweep page (up to 2 s each) and
add a hop to every question, and a misconfigured client would never learn that it is using the slow path. The
client's view stays one option: `questionReaderUrl`. A client without it gets 421 naming the URL. The writer refuses
too: its cache serves the saves' first touches (P2), and a sweep there would cost the commit path what it costs the
pinned readers.

**Positions are exact on any reader.** The question reader is an ordinary Datomic peer. A pinned question waits for
its position (`basisWaitMs`, at most 2,000 ms) and otherwise is refused (`BasisNotAvailable`); `atLeastPosition` waits
for the receipt (`AtLeastTimeout`); a sweep cursor carries its Datomic `t` and the question reader syncs to it. Gate (d)
proves it on the question reader. Both readers sign sweep cursors with the stack's one secret, so a cursor issued by
one continues on the other (gate c); ID list cursors are unsigned and carry `t` (as before).

## 2. Gates (Mac toy; counts are results, times diagnostic)

Stack (`xq7/gate.sh`): this branch's gateway, small peers (`DX_INT1_GATEWAYS=demand`: 384 MB heaps, **32 MB object
caches**), the main reader on core 7, the question reader on cores 3 and 4 (sweep permits 2, sweep per account 2, ID
list permits 1, ID list queue 1,000 ms), one cursor secret, the main reader still serving questions
(`DX_QUESTION_MAIN_REFUSES=0`) so one request can go to both; `refusal.ts` runs with the default (1). One ordinary
heavy token each. Evidence `evidence/DX-XQ7/` (private).

| Gate | Run | Result |
| --- | --- | --- |
| **(a) byte-equal** | `gate-2` | The sweep builder's whole question matrix (17 shapes × 3 accounts × 3 positions × 3 valid instants, rotating page sizes): **459 sweeps, 2,134 pages, every page byte-equal** (timing and storage-work fields removed: `micros`, `cpuMicros`, `ioReads`, `segmentsLoaded`, `scanMicros`, `queue`) on both readers, and every answer equal to brute force (2,247 IDs, 2,890 counted subjects). ID lists: 7 kinds × 3 accounts × 4 positions (0 and the matrix's three) × 3 page shapes (7 ascending, 1,000 descending, counts with 9 entries per page): **252 lists, 660 pages, byte-equal**, every list equal to brute force (3,492 IDs). In all **2,794 pages, 2,165,641 bytes compared, 0 differences**; 6,876 checks, 0 failures. |
| **(b) the main reader's cache** | `cache-3` (`DX_SWEEP_PERMITS=2 DX_XQ7_HOT=700`) | Pinned readers: 256 seats re-reading 1,400 subjects (12 facts each) of two accounts on the main reader at one
position, 20 s windows; sweeps: counts of four other accounts of 4,000 subjects each (one sweep, then four), on the
question reader (2 sweep permits) or on the main reader (2 sweep permits, its one core). The main reader's own io-stats
over every pinned read:

| Window | Pinned reads | Object cache hits per read | **Storage reads (`sql`) by the pinned reads** | Subjects swept | Sweep pages on main / question reader | PostgreSQL gets, all peers | Reads/s, p99 (diagnostic) |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| control | 24,297 | 8.0036 | **0** | 0 | 0 / 0 | 6 | 1,215, 477 ms |
| 1 sweep on the question reader | 34,857 | 8.0046 | **0** | 48,256 | 0 / 195 | 1,149 | 1,743, 231 ms |
| 4 sweeps on the question reader | 35,056 | 8.0044 | **0** | 60,160 | 0 / 254 | 1,503 | 1,753, 253 ms |
| control | 20,007 | 8.0043 | **0** | 0 | 0 / 0 | 56 | 1,000, 365 ms |
| 1 sweep on the main reader | 15,298 | 8.0085 | **59** | 11,232 | 84 / 0 | 500 | 765, 1,002 ms |
| 4 sweeps on the main reader | 13,482 | 8.0077 | **45** | 25,345 | 184 / 0 | 1,112 | 674, 647 ms |
| control | 27,649 | 8.0043 | **3** | 0 | 0 / 0 | 43 | 1,382, 310 ms |

**With every sweep on the question reader the main reader's pinned readers read nothing from storage (0 in 69,913
reads while 108,416 subjects were swept); with the same sweeps on the main reader they did (104 in 28,780 reads while
36,577 were swept), and the next control still paid 3.** Row counts: 0 of 180,412 pinned reads differed from the
subject's first read; all 30 completed sweeps counted exactly 1,334. **The displacement the single reader shows on the
toy is small** (0.33 to 0.39% of pinned reads went to storage): a pinned subject here is re-read every few
milliseconds and a 32 MB cache keeps most of what is re-read that often. Two other runs bound it: `cache-1` (600
re-read subjects, well under the cache): question-reader windows 0, main-reader windows 0 and 58 storage reads, the
control after 16; `cache-2` (3,000 re-read subjects, more than the cache holds): every window, controls included, read
0.10 to 0.38 per read from storage, so the arms cannot be told apart (the question-reader windows 0.3841 and 0.3856
against controls 0.3795 and 0.3788; the main-reader windows 0.146 and 0.204, lower, because the window after a sweep
on the one-core reader read fewer, slower subjects). **What the server must show:** the size of the displacement at 1
billion, where XQ6 predicts the 3 GiB cache's re-read set falls to the random-subject level (section 6, falsifier 3). |
| **(c) restart mid-sweep** | `gate-2` | The question reader restarted (docker restart) after page 2 of a sweep pinned at position 25, a save after page 3: the signed cursor issued before the restart continued after it, 9 pages, count 24 equal to brute force at 25 (the true answer moved at the head, so the check could fail). A cursor issued by the main reader continued on the question reader and the reverse, for a sweep and for an ID list: exact. |
| **(d) behind by design** | `gate-2` | 304 probes (pinned sweep, pinned ID list, `atLeastPosition` ID list and sweep), each 1 ms and 500 ms or 2,000 ms of basis wait: the question reader paused while 5 saves landed and asked at those positions (answered on resume); stopped, 5 saves, started late and asked as soon as it answered health; 30 saves each asked at once; **and 10 positions asked before the save that makes them existed**. **263 answered, 0 early** (every pinned answer at exactly its position, every at-least answer at or after it), **0 different from the main reader's answer at the same position**; 21 `BasisNotAvailable` and 20 `AtLeastTimeout` (the 1 ms probes of the 10 future positions, and one more), no other answer. The 2,000 ms probes of the future positions waited and answered once the save landed, at exactly that position. |
| **(e) option off** | `suites-2`, `plan-1`, unit tests | Routes: the gateway's in-memory suites (78 tests, 71,220 assertions) with every option unset: 0 failures, the one known error of the base (`feed-test/http-route`); the ID list and sweep routes 404 `NotFound` with their options unset; the guard passes every request; `scan-stats` has the same keys as before. With `TX2_READ_IO_COUNTERS=1`: the same results and one more key (`readIo`). With `TX2_ID_LIST_QUEUE_MS=200`: exactly one assertion differs, `ids_test.clj:140` (a second list of a busy account is now queued instead of refused), as intended. SDK: `tsc --noEmit` clean; `question-reader.test.ts` (4 tests) and `id-lists.test.ts` pass. Launcher: `plan.sh` (`plan-1`) started the same toy stack with the base `up.sh` (the merge `6d6409306`) and with this branch's, every question option unset, through a docker shim: the 7 `run`/`create`/`network`/`volume` commands identical byte for byte; every container's environment, command, image, CPU set, memory, binds and ports identical; `stack.json` identical apart from its time and container IDs. Demo profile: output byte-identical to the base for server and toy. |
| Refusals and the SDK option | `refusal-2` | **16 of 16**: main reader and writer each refuse `ids`, `sweep`, `find` with 421 `QuestionReaderRoute` naming `http://127.0.0.1:18982`; the question reader refuses a read by entity and a save (421 `QuestionReaderOnly`) and answers basis and health; a client with `questionReaderUrl` gets its ID list (20 IDs) and sweep (count 10) from the question reader, byte-equal to asking it directly, and its read by entity from the main reader; a client without the option gets `QuestionReaderRoute`; both gateways count what they refused and served. |
| Gateway unit test | `suites-2` | `question_reader_test.clj`: 6 tests (off passes every request; a main gateway refuses only the three question routes; the question reader serves only questions, health, admin and basis; the route list is a setting; the handler refuses before touching a database that does not exist; the ID list queue takes accounts in turn: pages ahead 0, 1, 2 for the third, fourth and fifth arrivals; a full turn is refused with 503 `IndexBusy` and the retry hint; the permit is back). |

## 3. Fairness inside the question reader (gate f, `gate-2`)

This answers the review's findings that all accounts share one reader core for questions and that one question per
account is refused when a list screen expects 256 concurrent list readers (in `REVIEW-FABLE.md` these are numbered C4
and D7; the task file cites them as C3 and D6, which in the review are the error-text note and the key-parsing cost).

Defaults on the question reader in the gate: ID list permits 1, `TX2_ID_LIST_QUEUE_MS` 1,000, one page per account at a
time; sweep permits 2, two sweeps per account, sweep queue 1,000 ms. Four 6 s arms, three accounts each listing pages
in a loop, with 0, 2, 0 and 2 sweeps of a fourth account running continuously:

| Arm | ID list pages | Refused | Most pages ahead of any page | ID list pool admissions | Sweep pages meanwhile | Queue wait p50 / p99 / max (diagnostic) |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| no sweep | 11,846 | 0 | 2 | 11,846 | 0 | 0.002 / 0.304 / 4.7 ms |
| two sweeps | 11,784 | 0 | 2 | 11,784 | 6,398 | 0.002 / 0.519 / 4.8 ms |
| no sweep | 12,643 | 0 | 2 | 12,643 | 0 | 0.002 / 0.124 / 5.1 ms |
| two sweeps | 11,517 | 0 | 2 | 11,517 | 6,616 | 0.002 / 0.279 / 7.1 ms |

- **0 of 47,790 list pages refused.** The list pool admitted exactly the list pages: **no sweep ever took an ID list
  permit** (separate pools, by construction and by count).
- **The bound, in counts: a page waits behind at most one page of each other account that is listing** (one place per
  account in the pool's FIFO queue): with three listing accounts, at most 2 pages ahead, in every arm, sweeps or not.
- **The bound, in time:** wait ≤ ⌈(listing accounts − 1) ÷ list permits⌉ × (the page's time bound + one storage read).
  With the default 100 ms page bound, 10 deep accounts listing at once and 2 permits: ⌈9 ÷ 2⌉ × about 103 ms ≈ 0.5 s at
  worst; a sweep adds nothing to it (its pages hold sweep permits only). CPU is the only shared thing: the sizing rule
  below keeps sweep permits + list permits ≤ the question reader's cores.
- **A list screen's burst (finding D7):** 8 requests of one account at once and 1 of another: all 9 answered, none
  refused, the 8 equal to brute force; the other account's page waited behind 0 pages of the busy one (bound 1).
- **Typed busy answers:** 503 `IndexBusy` (lists) and 503 `SweepBusy` (sweeps) with `retryAfterMs`, after the queue
  wait; the SDK waits them out (`listIdsPage`, `sweepPageWaiting`).
- **Proposed defaults for the question reader** (stated, not set: every option stays off by default): ID list permits 2,
  `TX2_ID_LIST_QUEUE_MS` 1,000, one page per account; sweep permits = cores − 1 (at least 1), `TX2_SWEEP_PER_ACCOUNT` 3
  (one question split in three), `TX2_SWEEP_QUEUE_MS` 5,000; `find`'s own pool as its builder sets it.

## 4. Size of the question reader at 1 billion

Units (all from earlier pages; nothing new measured at 1 billion): an uncached subject read costs **1.71 ms of reader
CPU** (all threads, collection included), **1.76 storage gets** (1.66 EAVT leaves, 0.11 AVET) and **1.94 MB allocated**;
a get is about 0.51 ms of SQL wait, one after another inside a permit; a decoded leaf takes about **0.5 MB** of object
cache (3 GiB held 6,100 to 6,400 segments) (`rd5/UNCACHED-READ.md` sections 1 and 6). The sweep adds 0.1 to 0.4 ms of
its own CPU per subject (`xq6/EXACT-SWEEP.md` section 3). An ID list walks about 6,400 IDs per storage read at 0.4 to
1.2 µs per entry warm (server forecast; 0.6 to 1.7 µs on the Mac), a page of 1,000 subjects examines about 2,800
entries (`xq3/ID-LISTS.md` section 4). The 1 billion toy-free counts that matter: 10 deep accounts of 100,000 subjects,
about 280,000 `pl:` IDs each.

| Work | CPU | Storage gets | What the cache must hold | Allocation |
| --- | --- | --- | --- | --- |
| **ID list page** (1,000 subjects, about 2,800 entries) | 1 to 5 ms warm; cold adds 1 to 2 gets (3 for a first page at the head, 6 to 8 at an old pin) | 0 warm, 1 to 8 cold | The account's ID segments: about 45 per kind of 280,000 IDs (25 to 45 MB at 0.5 to 1 MB each); every kind of the 10 deep accounts: 1,600 to 7,800 segments if all are listed (0.8 to 7.8 GB): the cache keeps the kinds users page through | small |
| **Count of one kind** (280,000 entries) | 0.1 to 0.35 s warm, 0.3 to 1 s cold | about 45 | as above | small |
| **One sweep of 100,000 subjects** | 180 to 210 core-seconds (1.8 to 2.1 ms per subject) | 176,000 (150,000 to 200,000) | Only what a sweep reuses: the EAVT directory segments and the ID segments it lists (about 45). The subjects' 166,000 leaves are read once each (subjects are not neighbours at 1 billion) and are never reused within the sweep | 194 GB, about 0.8 to 1.0 GB/s per busy permit |
| **One sweep, wall time** | one permit: 120 to 210 s (XQ6's forecast); my own from the units: 200 to 240 s (2.0 to 2.4 ms per subject: 1.1 to 1.45 ms on the request thread plus 0.9 ms of serial SQL waits) | | | |
| **Three sweeps at once** (three accounts, or one split in three) | 540 to 630 core-seconds: at least 180 to 210 s on 3 cores, 135 to 160 s on 4 | 530,000 | the same directories, three in-flight batches (16 subjects × 1.7 leaves × 0.5 MB ≈ 14 MB each) | 2.4 to 3 GB/s |
| **Index range read** (`find`, step 1 design, once its per-entity reads are removed: review finding E1) | 20,000 to 33,000 entries per answer: 3 to 120 ms warm; 2.6 ms of key parsing per 20,000 entries with a hand-written split, 28 ms with today's regular expression (finding D6) | 30 to 110 segments cold (300 to 630 entries each) | The declared index of the accounts being asked: the whole index at 1 billion is about 4.9 GB stored (the spike), more decoded, so only hot ranges fit | small |
| `find` while it still reads each candidate (as built) | as a sweep of the candidates: 1.8 to 2.1 ms each | 1.76 each | as a sweep | as a sweep |

**What a small cache does to sweep time (argued from the counts).** A sweep reads each subject once. Of its 1.76 gets
per subject, about 1.66 are leaves that nothing else in the sweep asks for again; only directory and ID segments are
reused. A cache therefore saves a sweep only (a) the directory and ID segments, which need well under 1 GiB (the ID
segments of a kind are 25 to 45 MB; the EAVT directory for about a million leaves is on the order of a thousand
segments), and (b) on a repeat sweep of the same account, the leaves still cached from the last one: 100,000 subjects ×
1.66 leaves × 0.5 MB ≈ 83 GB of leaves, so a 1 GiB cache keeps about 1.2% of them and the main reader's 3 GiB about 3.6%.
**A 1 GiB cache costs a sweep at most about 3 to 4% against a 3 GiB one, and a 12 GiB cache would buy about 14% on a
repeat only.** What can make a small cache expensive is the 0.66 extra EAVT loads per subject RD5 could not explain: if
they are directory segments that a 3 GiB cache cannot keep (RD5's candidate 2), a 1 GiB cache loses more of them and
gets per subject could rise from 1.76 toward 2.0 to 2.5 (sweeps 15 to 40% slower). The server run measures it: gets per
subject swept on the question reader (1 GiB) against on the main reader (1.5 GiB), section 6.

**Size, from those units.**

| Question reader | Cores | Heap | Object cache | Direct | Container | Pools |
| --- | --- | --- | --- | --- | --- | --- |
| **Small**: ID list pages for 256 list screens and one sweep at a time | 2 | 4 GiB | 1 GiB | 1 GiB | 6 GiB | lists 1, sweeps 1 (per account 1), queue 1,000 / 5,000 ms |
| **Standard**: lists, three sweeps at once, `find` | 4 | 8 GiB | 1.5 GiB | 1 GiB | 10 GiB | lists 2, sweeps 3 (per account 3), `find` 1 |

Heap: a busy sweep permit allocates 0.8 to 1.0 GB/s; the tuned reader ran 2.4 GB/s in a 6 GiB heap at an 18% pause
share with a 3 GiB cache of survivors. A smaller cache means fewer survivors per young collection, so about 2 GiB of
heap per busy permit beyond the cache keeps the pauses at or below the tuned reader's. 256 list screens: a page costs 1
to 5 ms and a total 0.1 to 0.35 s warm; two list permits serve 400 to 2,000 pages/s or 6 to 20 totals/s, so totals for
256 screens at once take 13 to 43 s to clear: a list screen should show the page first and the total when it comes (or
a cached total), which the queue allows (it waits instead of refusing).

**Where it comes from in the memory table.** The `server-32` profile with the tuned reader sums to the 89 GiB guard
exactly (transactor 57, writer 6, reader 11, PostgreSQL 5, host 10), every role already at its measured need, and all
12 cores are assigned (transactor 3, PostgreSQL 1, writer 3, reader 3, the measurement driver 2). **So the question
reader does not fit on that machine: the table must grow.** The ways, cheapest first:

1. **A second machine** (the RD5 path, `second-reader.sh RD5_ROLE=question`): machine 1's table and cores unchanged;
   machine 2 with 4 cores and 12 GB runs the standard size. It reads PostgreSQL over the private link (about 105 KB
   per subject swept: 50 to 105 MB/s while a sweep runs at 500 to 1,000 subjects/s) and adds PostgreSQL's gets to machine 1's one PostgreSQL core
   (0.14 ms of its CPU per get: a sweep at 500 to 1,000 subjects/s adds 0.12 to 0.25 of that core). It is the same
   second machine RD5's command 2 wants for a second pinned reader; the two can share it only if its cores allow
   (3 + 4 = 7).
2. **A larger single machine** (128 GB and 16 cores): the standard size beside `server-32` and the tuned reader.
3. **Not recommended:** taking it from the transactor (its 57 GiB leaves 3.89 GiB over its measured peak; the 32 GiB
   cache is what P2 rests on at 1 billion) or the host reserve (the driver's peak was never measured), or running on
   the `server` profile (24 GiB transactor heap: frees 27 GiB but returns P2's R p99 from 430 to 713 ms).

The demo's own profile (one-core reader, 5 GiB) is not the scorecard's: there, the **small** size fits by CARD2's two
measured cuts (transactor 60 → 57 GiB, PostgreSQL 8 → 5 GiB) on the two unassigned cores 10 and 11, which is what the
server run uses (section 6). In production, without a measurement driver, cores 9 and 10 of the card's machine are
free too, but its memory is not.

## 5. What the toy cannot show

- **Cache displacement on the toy is small** (section 2 b): at most 0.39% of the pinned readers' reads went to storage
  with the sweeps on the main reader. The toy proves the separation (0 with the sweeps elsewhere, by count); it does not
  size the damage a sweep does to a single reader at 1 billion.
- **Times**: the toy's sweeps take 0.2 to 0.55 ms per subject and almost no storage; the 1 billion unit costs are other
  pages' measurements.
- **Fairness at scale**: 3 listing accounts and 2 sweeps on two cores; the bound for 10 accounts and 256 list screens is
  the formula of section 3.
- **The question reader behind its transactor**: the toy's peer was never measurably behind a save (the racing probes
  were all answered at their position); the refusal path was exercised with positions asked before their save existed,
  and by pausing and late-starting the question reader.

## 6. Server run (for the day a machine is rented; needs the owner's approval of the rental)

One rented server (12 cores, 96 GB, NVMe) with the sealed 1 billion cluster, the demo stack brought up from this
branch, the runner on the same machine. **Both arms on one stack**, so only where the sweep runs changes: the main
reader (the demo's one-core reader, 1.5 GiB cache, both pinned options) also serves sweeps (`DX_QUESTION_MAIN_REFUSES=0`);
the question reader is the **small** size (cores 10 and 11, 4 GiB heap, 1 GiB cache, 6 GiB container, sweep permits 2,
list permits 1). Memory: transactor 57 + writer 6 + reader 5 + PostgreSQL 5 + question reader 6 = 79 GiB + 10 host = 89.

```bash
cd "$REPO" && git checkout "$COMMIT"            # head of exp/DX-XQ7-question-reader
pnpm install --frozen-lockfile && (cd packages/core && pnpm run build) && (cd packages/datomic && pnpm run build)
SECRET=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
sudo env DEMO_QUESTION_READER=1 DX_QUESTION_MAIN_REFUSES=0 DX_READ_IO_COUNTERS=1 \
  DX_SWEEP=1 DX_ID_LISTS=1 DX_SWEEP_PERMITS=3 DX_SWEEP_PER_ACCOUNT=3 DX_SWEEP_QUEUE_MS=5000 DX_SWEEP_CURSOR_SECRET="$SECRET" \
  DX_QUESTION_SWEEP_PERMITS=2 DX_QUESTION_SWEEP_PER_ACCOUNT=3 DX_QUESTION_SWEEP_QUEUE_MS=5000 \
  DX_QUESTION_INDEX_QUERY_PERMITS=1 DX_QUESTION_ID_LIST_QUEUE_MS=1000 \
  DEMO_ORIGINAL="$SEALED_CLUSTER" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
#   prints DEMO READY head=28309866 ... ; the question reader answers on 127.0.0.1:18505
sudo node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq7/server.ts /var/tmp/triplex-demo/ready.json "$OUT/xq7-1b"
sudo bash demo/server-down.sh
```

**Windows** (`xq7/server.ts`): warm-up 120 s, control 120 s, a one-part count of account-003's 100,000 subjects on the
main reader, a three-part count on the main reader, control 120 s, the same two counts on the question reader, control
120 s. In every window: 256 pinned readers re-reading 1,000 subjects of eight other accounts at position 87,002 (one
subject per request) on the main reader; saves at 23/s of 17 facts, one commit per subject's save, on account-005. The
re-read set is 1,000 subjects (not XQ6's 5,000) so that it fits the main reader's 1.5 GiB cache once warm (about 1,700
segments of its about 3,000); with 5,000 the control itself would miss (about 8,500 segments).

**Duration and cost:** build 5 to 10 min, bring-up 3 to 12 min (the demo's), windows 21 to 33 min (four 120 s windows
plus four counts: 4.5 to 8.5 min each on the main reader, 2 to 4.5 min on the question reader), tear-down 2 min: **31
to 57 minutes, one machine hour, $1.09.**

**Predictions, written before any run** (from the units of section 4; the one-core main reader at 256 seats did 479 to
893 reads/s on the 2026-11-21 cards):

| Window | Main reader: storage reads per pinned read (io-stats `sql`) | Pinned reads/s, p99 | Saves p99 | The count |
| --- | --- | --- | --- | --- |
| Control | **0 to 0.05** (the re-read set cached) | 450 to 950/s, 300 to 900 ms | as the demo's (under 60 ms) | — |
| One part on the main reader | **0.6 to 1.8** (the sweep's 150,000 to 200,000 loads evict the set) | down 40 to 80%, p99 2 to 5× | within 1.25× | 250 to 500 s (one core shared with 256 readers), exact |
| Three parts on the main reader | 0.8 to 1.8 | down 50 to 85% | within 1.25× | 250 to 500 s (still one core) |
| Control after | back to 0 to 0.05 within 60 s; window average under 0.2 | within 10% of the first control | | — |
| One part on the question reader | **equal to the control** (0 to 0.05) | within 10% of the control | within 1.25× | 150 to 260 s, exact, the same count |
| Three parts on the question reader (2 permits) | **equal to the control** | within 10% | within 1.25× | 90 to 160 s, exact |
| Control again | 0 to 0.05 | within 10% | | — |

Every window: sweep pages only on the gateway the window names; 0 read or save errors; every count identical across the
four sweep windows; gets per subject swept 1.5 to 2.0 on both readers.

**What would show them wrong:**
1. **Main-reader storage reads per pinned read above the control by more than 0.05 in a question-reader window**: the
   readers share something that evicts (PostgreSQL's buffers for the main reader's misses, or the host's page cache);
   look at PostgreSQL's buffer hits and the main reader's `sql-ms`. The question reader would then not protect the
   main reader's readers by itself.
2. **Reads/s more than 10% under the control in a question-reader window with the main reader's counters unchanged**:
   CPU or PostgreSQL contention, not the cache (the runner is unpinned, PostgreSQL has one core): check PostgreSQL's
   cores and the runner's.
3. **Main-reader windows within 10% of the control** (reads/s and storage reads per read): a sweep does not displace
   the cache at 1 billion (Datomic's cache keeps the frequently re-read segments), and sweeps could share the main
   reader; XQ6's section 4.2 prediction is then wrong.
4. **Gets per subject swept on the question reader above 2.3, or its one-part count slower than the main reader's
   despite its two free cores**: its 1 GiB cache is too small for the directory segments (section 4); repeat with
   `DX_QUESTION_JAVA_OPTS` at a 3 GiB cache before sizing it.
5. **Saves' p99 above 1.25× the control in any sweep window**: sweeps reach the commit path through PostgreSQL; the
   question reader then needs its own storage read budget.
6. **Any count that differs between the four windows, any read or save error**: stop; nothing builds on it.

## 7. Not verified

- **Nothing ran on a server.** Every time is the Mac's (diagnostic); sections 4 and 6 are predictions from earlier
  pages' units.
- **The second-machine question reader** (`second-reader.sh RD5_ROLE=question`, `up.sh DX_QUESTIONS_AT`) has not run
  anywhere (the same is true of RD5's second reader).
- **`find`**: not on this branch; served by the route list once it is (the guard's unit test names it; the SDK sends it).
  Its pool, queue and permits are its builder's.
- **The size of the question reader** is derived, not measured: gets per subject with a 1 GiB cache, the collector's
  pause share with three busy sweep permits, and the directory working set at 1 billion are the server's to measure.
- **The demo's `server-up.sh` with `DEMO_QUESTION_READER=1`** has not run (no server); `server.ts` ran only in the Mac
  dry run (`dryrun-1`).
- **Datomic's object cache policy**: the toy says the main reader's frequently re-read segments mostly survive a sweep
  when they leave room in the cache (section 2 b); how much survives at 1 billion is the server's question.
- **Fairness at 256 list screens**: the toy ran 3 listing accounts; the time bound for 10 is computed, not run.
- **The read io counters** add one io-stats scope per read by entity when on; their cost at 1 billion is not measured
  (they are on in both arms of the server run, so the comparison is fair).
- Interior positions, the legacy layout, release-written values during settlement: as XQ3 and XQ6 state; nothing here
  changes them.

## 8. Files

| File | What |
| --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/question_reader.clj` | The guard (`TX2_QUESTION_READER`, `TX2_QUESTIONS_AT`, `TX2_QUESTION_ROUTES`), its counters, the read io counters |
| `packages/datomic/gateway/src/triplex/gateway/question_reader_test.clj` | Unit tests of the guard and the ID list queue |
| `packages/datomic/gateway/src/triplex/gateway/main.clj` | `route-handler` applies the guard first; `read` counts io when asked; `scan-stats` gains `questionReader` and `readIo` only with their options |
| `packages/datomic/gateway/src/triplex/gateway/ids.clj` | The optional fair queue (`TX2_ID_LIST_QUEUE_MS`, `TX2_ID_LIST_PER_ACCOUNT`) |
| `packages/datomic/src/DatomicClient.ts`, `index.ts`; `test/question-reader.test.ts` | `questionReaderUrl` |
| `lab/experiments/EXP-DX1/stack/up.sh`, `down.sh` | Role `q`, `DX_QUESTIONS_AT`, `DX_READ_IO_COUNTERS` |
| `lab/experiments/EXP-DX1/rd5/second-reader.sh` | `RD5_ROLE=question` |
| `demo/server/profile.mjs` | `DEMO_QUESTION_READER=1` |
| `xq7/gate.sh`, `gate.ts`, `cache.ts`, `refusal.ts`, `plan.sh`, `suites.sh`, `server.ts`, `dryrun.ts` | Gates, the server runner and its Mac dry run |

**Merge notes (minimal conflict resolutions):** the merge of `exp/DX-RD5-uncached-read` into this branch had no
conflicts. This branch edits `up.sh`'s XQ3/XQ6 blocks (each value read once into a per-role variable, so the question
reader can take its own pools; unset, the same `-e` arguments in the same order), `ids.clj`'s admission (the old path
unchanged in behaviour, now inside an `if`), `main.clj` (`route-handler` renamed `route-handler-routed` behind a
one-line `route-handler`; two `cond->` additions), and `down.sh` (one line). A merge onto the one branch after XQ3 and
XQ6 land should apply these hunks as they are.
