# Hard problems: the ones that need a creative technical answer

Kept by the orchestrator at Sam's request (2026-11-13): "keep track of some of the hardest problems ... creative technical
solutions potentially". Updated whenever an agent report changes the picture. Each entry says what is hard, the evidence, what
has been tried, and directions not yet tried. Numbers are at 10,000 subjects on the Datomic lane unless stated. The bars are in
`lab/TARGETS.md`; Sam's five priorities are in `lab/NORTH-STAR.md`.

Constraints every answer must respect: exactness and durability are the floor; the Triplex layer stays in TypeScript (Sam,
2026-11-12); the lane is Datomic on Postgres storage (Sam closed the XTDB lane on 2026-11-13; QLever is paused); the only machine is Sam's Mac (36 GiB,
12 cores) with the colima VM `triplex2`.

## Where the bars stand (quiet Mac, closing pair of 2026-11-14, DX-T1 part 7)

P3 and P4 pass. P1 passes except the writer p99 ratio at 1,024 readers (3.73 against 2). P2 misses: all-primary p99 55.6 ms
(bar 50); 256-reader medians 11.4 ms (5 to 10 facts) and 13.6 ms (11 to 25 facts) against 10; medium burst median 12.1
against 10. Oracle PASS. Table in `lab/experiments/EXP-DX1/STATUS.md` (2026-11-15 00:25 UTC). The Mac must be quiet for
this reading: with Chrome, Slack and Paste open the same build read 204 ms and 16 ms.

## H10. A commit writes about 17 KB of row text and 56 datoms, and commit time grows with it

1. **What is hard.** The 11 to 25 fact band is 2.2 ms slower at the median than the 5 to 10 band. A census of real
   transactions found 56 datoms and about 17 KB of value text per transaction, 98% of it native row texts. The transactor
   pays per datom (an index lookup each), serialises the transaction twice, and resets the log tail about every fourth
   transaction because of the size (about 3.1 Postgres commits per transaction).
2. **Directions.** Store the row text compressed, once with references, or not at all if readers can rebuild it from the
   datoms. Any of these is a new stored layout: seeds must be rebuilt and the 100,000-subject seed took hours. DX-T1 part 8
   is prototyping on new 1,000 and 10,000-subject seeds.

## The idea menu (2026-11-15)

`lab/research/LEAPFROG-MENU-2026-11-15.md` (34 candidates, 9 more that need Sam's decision, four plans, five builder
briefs) and `LEAPFROG-SUMMARY-2026-11-15.md`, written by one Fable agent at extra-high effort from the code, the traces and
the saved records of pairs C, A and F. Its findings that change this list: the 256-reader median miss also appears with zero
readers in the same window, and a commit after a quiet gap of 250 ms costs 2.6 to 3.8 ms more than a warm one (cause
unknown); the test's timer starts commits 0.6 to 0.7 ms late and stops the clock 0.4 ms after the acknowledgement; its
history-growth step writes 500 subjects in one transaction and causes 15 to 18 of the slow commits per run; with readers
the harness writes its own files to the database's virtual disk. Shortlist: (1) correct the instrument, (2) find the idle
penalty, (3) separate the disks and prepare the WAL, (4) one Postgres commit per log write, (5) fewer datoms per commit.

## What is left after the menu's first five picks (2026-11-16)

Measured and closed: disk separation (no gain), two transactor cores (rejected twice), one Postgres commit per Datomic
write from outside (unsafe under Datomic's retries), fewer datoms per commit (under 0.1 ms for exact layouts; 0.9 ms only by
dropping change-row identities). Kept: scheduler repair (0.69 ms). Open and Sam's to decide: the verdict's clock boundary,
bars over at least 500 commits, a keep-warm mechanism (3.2 ms at one commit per second), history growth in small commits.
The remaining unknown inside the engine is the cold path itself: why durable storage and the peer and transactor threads
cost 2.6 to 3.8 ms more after 250 ms of idleness.

## The cold path, explained (2026-11-16, Fable agent at maximum effort; `~/Claude/Projects/triplex-db-2/research/2026-11-16-cold-path/`)

Sam declined a keep-warm mechanism and asked for the cause. Nothing in Triplex, Datomic or Postgres is slow to wake up.
1. **Processor caches (pause):** all six performance cores share one 16 MB cache; other work on the Mac overwrites the
   commit path within 50 to 250 ms. 0.7 ms after 250 ms, 1.8 ms after 1 s. A 4 MB memory probe shows the same curve whether
   it sleeps or busy-waits. No setting removes it; it shrinks with the size of the commit path.
2. **The Mac's storage path (pause):** the first durable write after about 50 ms without disk activity is 0.3 to 0.45 ms
   slower, on the Mac itself with no VM. 0.4 ms after 250 ms, 0.7 ms after 1 s.
3. **Efficiency cores (no pause needed):** eight spinning virtual CPUs on six performance cores put each on an efficiency
   core a quarter of the time; with six online, 0.7 to 2.1% of the time. Estimated 1.3 to 1.8 ms on every commit. Fix: six
   virtual CPUs online. The commit-level confirmation is owed (disk and host were not quiet).
4. **JVM warm-up (no pause needed):** gateway and transactor keep speeding up for about 5,000 commits (8.7 ms after 500 to
   1,000 commits, 7.0 to 7.3 ms after 5,000). Compilers inferred, not observed. Fix: a one-time warm-up before judged
   phases or lower compile thresholds. Part 10's "refused request" gain of 3.2 ms included 1.3 to 1.9 ms of this.
Ruled out with evidence: TCP after idle, TLS, JVM pauses, V8 collections, the WAL writer, guest timers, processor
frequency, the VM's disk thread. Scripts on branch `exp/COLD-1`.

## H1. The commit median sits on the engine call, and the call alone is over the 10 ms bar

1. **What is hard.** P2 asks for commit p50 at most 10 ms. With zero readers and tracing off, a commit is 13.0 ms and the
   client's transact call (client, gateway, transactor, Postgres sync, and back) is 11.4 ms of it (DX-T1 part 3,
   `t1/REPORT-3.md` on `exp/DX-T1-tracing`). The best total ever measured on this Mac was 9.1 ms (2026-11-10, quiet host).
2. **Evidence.** TypeScript outside the call is about 1.2 ms. Inside the call (DX-RE1, H6): send leg 1.9 ms, transactor
   4.1 ms, acknowledgement leg 2.0 ms at p50 in a traced run, with about 3.1 Postgres commits per transaction. DX-T1 part 4
   is measuring the same anatomy untraced, with a raw fsync test of the VM disk.
3. **Tried.** Transactor GC settings (no gain), hints (slower), strict clocks (cost nothing).
   **DX-T1 part 4 (2026-11-14):** at zero readers a commit is 14.5 ms on the busy host: peer transact wait 6.8 ms, other
   named work outside the transact HTTP call 4.3 ms (begin, capture, publication, queue), gateway 1.0 ms, network 0.35 ms.
   Raw fdatasync on the VM volume is 0.113 ms, so **disk sync is not the floor**; direction c below is closed. Dedicated
   cores save 1.0 ms (kept). Quiet logging and TLS off gave nothing at zero readers. Best floor measured 14.4 ms.
   The 4.3 ms outside the engine call is the largest untouched piece; part 5 splits it.
4. **Directions not tried.**
   a. Fewer storage syncs per commit: several subjects' commits in one Datomic transaction when they arrive together, with
      per-command outcomes kept (group commit above the engine).
   b. A durable intake log in front of the engine: acknowledge when the command is durable in an append-only log that syncs
      in groups, apply to Datomic behind it, and serve read-your-own-write from the log plus the replica. Changes what
      "committed" means, so it needs Sam.
   c. A faster sync path: where the VM disk really syncs, WAL sync method, a separate WAL device, group-commit settings.
   d. Fewer hops: the gateway and peer in one process with the transactor's storage connection tuned, a unix socket or
      HTTP/2 between client and gateway, no per-request connection work.
   e. Other Datomic storage back ends (dev/H2 local storage) as a measurement of what Postgres storage costs.

## H2. With 256 readers the commit median doubles, and the writer waits for a CPU more than it runs

1. **What is hard.** P2's median bar applies with 256 readers running. Part 2 measured 22.4 ms there: wait on the transactor
   11.7 ms, TypeScript scopes 5.8 ms, network and callback 2.1 ms, driver queue 1.4 ms, gateway 1.0 ms.
2. **Evidence.** In a 45 s phase at 256 readers the writer thread ran 2.7 s and waited for a CPU 5.7 s. A dedicated writer
   core cut the wait to 0.16 s but the median moved only from 23.4 to 19.3 ms (swapping host, noisy).
3. **Directions not tried.** Reader work and commit work in separate processes with separate cores; the transactor,
   Postgres and write gateway on cores reader work never touches; an admission rule that slows readers when the commit
   path's run-queue wait rises (P1 says readers must not block writers, not that readers must never yield).

## H3. Exact local reads (P1) and fast commits (P2) have not passed in the same build

1. **What is hard.** q8 met every P1 bar with exact local reads (read p99 9.15 ms at 256 readers) and missed P2. q6 met most
   of P2 with gateway reads and missed P1. Part 2's traced pair lost P1 again (read p99 272 ms).
2. **Evidence.** The local replica, its feed follower, the oracle bookkeeping and the readers share the Node process, its
   memory and its cores with the commit path.
3. **Directions not tried.** The replica in its own process with a shared-memory or memory-mapped read path; replica apply
   batched between commits; a read path that never touches the commit thread's event loop.

## H4. The commit tail: one late commit delays every later commit of the same subject

1. **What is hard.** P2 asks for all-commit p99 at most 50 ms. Part 2 measured 988 ms. The slowest commits waited 1.7 to
   2.0 s behind an earlier commit of the same subject while in-flight slots were free.
2. **Evidence.** The chains start at one commit whose scheduler ran 267 ms late; the cause of that first delay is unknown.
   The 4.5 s stalls of q8 have not been reproduced under tracing. A 120 ms write-gateway GC pause and a 490 ms wait on the
   transactor were also seen in single traces.
3. **Directions not tried.** Sending a subject's next commit before the previous acknowledgement and letting the gateway
   order them (pipelining per subject); merging a subject's queued commits into one transaction; a low-pause collector on
   the write gateway; finding the 267 ms delay with a `full` trace of the writer thread.

   **DX-T1 parts 8 and 9 (2026-11-15):** in three quiet pairs the all-commit p99 was 55.6, 71.0 and 67.2 ms. 100 to 113 of
   the 131 to 144 commits over 50 ms wait on the transactor's durable log write: Postgres is waiting on the WAL sync of the
   INSERT, with matching flush delays on the guest disk (143 to 253 ms in traced examples). Not checkpoints, locks or bloat.
   Unsplit: Virtualization and APFS against the SSD (the Mac's disk is 96% full and the VM disk is a sparse file).
   `open_datasync` helps a little (kept provisionally). Rejected with measurements: journal, nursery and old-space sizes,
   transactor sharing Postgres's core, per-row text compression. Untried: the VM disk's synchronisation mode, a separate
   WAL device, fewer WAL syncs per transaction (H1 a), a verdict protocol that separates bench storage stalls from the store.

## H5. One hundred thousand subjects: commits slow down and bursts fall seconds behind

1. **What is hard.** P5 is about 100,000 subjects. At that size (k100, gateway reads) quiet-window commit p50 was 18 to 45 ms
   with zero readers, bursts fell seconds behind, and 116 of 7,547 commands expired at 30 s.
2. **Evidence.** `lab/experiments/EXP-DX1/h4/K100-READ-2026-11-12.md`. Gateway caches are sized for 10,000 subjects (read
   gateway entity cache: 5.40 million evictions). Activation without traffic takes 63 to 83 s (bar 100); with live traffic
   there is no valid result. P1, P3 and P4 are unmeasured at this size.
3. **Directions not tried.** Cache budgets sized to the population; a commit path whose cost does not grow with the number
   of subjects (find what grows: index depth, cache misses, segment fetches); activation that yields to commits.

   **First reading on current code (2026-11-17, busy host, zero readers; `t1/READING-14.md` on `exp/DX-T1-tracing`):** the
   run seeded 3.85 million assertions and served 786 of 900 s before the guest ran out of memory. Driver memory doubles
   (3.6 to 7.8 GiB) for ten times the population and is the first blocker; serial-point SQL reads per commit go 1.4 to 3.3
   and native apply 8.5 to 18.5 ms; index adoptions 12 to 43; the transactor object cache still hits 99.8%; datoms per
   commit are unchanged. A follower's scope reopen returned HTTP 503 after 4.1 s of peer sync waits. Directions: cut the
   duplicated retained state in the driver (population, replica, model); a 24 GiB guest at night; transactor cache and
   index settings measured with real memory headroom; fix repeated scope metadata and catch-up work in follower recovery.

## H6. The transactor is closed source: reverse engineered on 2026-11-13 (Sam's direction)

1. **Done.** Agent DX-RE1 (Opus, extra-high effort, with the `reverse-engineer-anything` method) read the transactor from
   its jar. The distribution's licence is Apache 2.0. Notes: `lab/experiments/EXP-DX1/re1/TRANSACTOR-NOTES.md`,
   `WRITE-BETTER.md` and `REPORT.md` on branch `exp/DX-RE1-transactor` (`72785052`, pushed). Decompiled code is kept out of
   the repository.
2. **How one transaction flows.** The peer only queues and sends (one message over TLS). The transactor applies one
   transaction at a time on a `processor` thread: our transaction function, tempids, then index inserts with a lookup per
   datom on an existing entity. It then serialises, and a `writer` thread writes whatever is already queued, with no wait
   to gather more (its only group commit; 98% of writes carry one transaction). The durable write is two autocommitted
   statements in a row, an insert and an update. The acknowledgement goes out only after the write. A commit crosses about
   ten threads.
3. **Storage cost.** At least 2 Postgres commits per transaction, observed about 3.1: each of our transactions adds about
   12 KB of log, the log tail has a fixed 54,000-byte limit, so about every fourth transaction triggers a tail reset and
   about three log-segment inserts ahead of the next commit.
4. **Where the 9 ms went in a traced run (p50):** send leg 1.9 ms, inside the transactor 4.1 ms (apply 1.15, of which our
   commit function 0.49; the two-statement write 1.07), acknowledgement leg 2.0 ms. 13% of commits wait about 5.5 ms on
   Postgres reads during apply, 26% in the 2 s after an index adoption.
5. **Ways to write better, ranked in `WRITE-BETTER.md`:** (1) take the five synchronous INFO log lines per commit off the
   commit path (never removed in any "off" run); (2) CPUs for the transactor and Postgres that no other container uses;
   (3) make `:triplex/commit` read less at the serial point; (4) TLS off between peer and transactor inside the VM;
   (5) fewer bytes per transaction, so fewer tail resets; (6) fewer index adoptions; (7) combine queued commits into one
   Datomic transaction (high risk: atomicity across commits); (8) measure with `:io-context`.
6. **Still unknown.** The CPU split inside the send and acknowledgement legs; how long an index adoption blocks the
   processor; what default logging costs untraced; which attributes make up the 12 KB; Postgres flush time per commit. Live
   sampling of the running transactor was not done.

## H7. The test bench moves results more than the code does

1. **What is hard.** The same code read 9.1 ms on one night and 16 ms on another. A 24 GiB VM on a 36 GiB Mac put 12 to
   17 GB into swap; the VM is now 16 GiB.
2. **What was making the Mac busy (looked at on 2026-11-14 12:40 UTC, Sam away from the machine).**
   a. Our own VM: 415 to 445% CPU, by design, because guest `nohlt` keeps eight virtual CPUs spinning.
   b. The Mac has **6 performance and 6 efficiency cores**. Eight always-busy virtual CPUs cannot all sit on performance
      cores, and the load average was 11.7 to 14.8 on 12 cores, so virtual CPUs were being time-sliced or placed on
      efficiency cores. Not yet tested: a 6-CPU VM, or pinning the measured containers to the virtual CPUs that behave.
   c. Our own harness on the Mac side: the oracle replay (`oracle-bridge.mjs` and its Python) used about 0.4 of a core and
      1.1 GB during a measured run.
   d. Memory pressure, not idle swap: 55 to 140 MB free, the compressor moving 2,000 to 17,000 pages a second. Chrome (87
      processes, 6.5 GiB), Paste (1.3 GiB) and Slack (1.2 GiB) were the largest users after the VM. Sam said to close what
      was causing it; the orchestrator quit those three at 12:45 UTC: swap in use fell from 12.2 to 5.1 GB and free memory
      rose to 62%.
3. **Directions not tried.** A verdict protocol robust to the host (many short paired arms and a statistical verdict, not
   one long pair); a 6-CPU VM matched to the performance cores; the oracle replay moved after the measured window or into
   the VM; a host check before each arm that refuses to start under memory pressure; a second machine is out of scope
   unless Sam changes that.

## H8. (closed) XTDB

Sam, 2026-11-13: "I don't care about XTDB. Don't go back to that." Not a problem to solve; the goal is Datomic.

## H9. Design decisions (Sam answered on 2026-11-13; verbatim in `lab/research/SAM-decisions-2026-11-09.md`)

1. **Record time: not strict everywhere.** Keep the store bitemporal, keep both read paths, route each query to the path
   that can answer it exactly. Open: whether live scopes need backdated record time or only backdated valid time. The hard
   part: a rule that lets the local copy answer a time-pinned read in a scope that permits backdating, and knows when it
   cannot.
2. **Server assigns record time.** Decided; needs the `packages/core` contract change.
3. **Split-read rule (`pending` or `mixed`).** Open; explained to Sam with examples, awaiting his choice.
4. **CPU split.** Decided: judge on the whole 8-CPU machine (P4 at least 4,400 pulls per second in total); split tuned
   freely.
5. **Acknowledging from a durable intake log before the engine applies.** Not now (risky); revisit only with numbers.

## H11. What the 1 billion runs of 2026-11-23 added (open problems, each with its evidence in `lab/experiments/EXP-DX1/STATUS.md` of that day)

1. **Pinned reads of subjects the reader does not hold cost ten times more than cached ones.** A cached subject costs
   0.16 ms of reader CPU, an uncached one 1.5 to 1.9 ms (storage load plus decode). The 256-reader bar is met for
   re-read subjects (p99 72 ms, three reader cores) and forecast missed for random subjects (p99 about 270 ms); the
   model asks for about 7 reader cores, and no affordable cache covers the working set (0.7 to 1.1 TB). The hard part:
   make an uncached pinned read cheaper (smaller segments per subject, a decode that skips what the read does not need)
   or scale readers out without giving up exactness.
2. **The store cannot answer a question across subjects.** Facts are kept by entity; there is no index by attribute,
   value or entity type, so totals, filters and "list the entities of a type" are refused. The console numbers entities
   per type and account as a workaround. The hard part: an index by attribute and value (and by type) that the one
   serial writer can maintain inside the commit bars at 1 billion records.
3. **The gateway's journal routes have no bound of their own.** `/transactions` walks the position index until it has
   the asked count, and on a loader-built database the 28 million non-canonical position rows never qualify, so one
   request can walk all of them while holding the single journal permit. `/entity-transactions` walks every transaction
   on the lean layout. Needed: a limit on entries examined with a cursor, and an index from entity to its transactions.
   The loader must also write canonical position rows before it is used again.
4. **An unpinned read on the read gateway can trail an acknowledged write.** The read gateway's peer is not synced to the
   write gateway's acknowledgement; seen once in at least 241 Publishes. Proposed: readers that hold a receipt pass its
   position ("at least"), waited for with the existing `storage/await-position`. Sam's decision pending.
5. **Publish slows neighbours' saves at 39.4 saves/s** (p99 1.7 to 2.3 times the control, bar 1.5) with the small and
   the large release alike; no slowdown at 3.5 and 23.5. Cause not diagnosed.
6. **Background settlement of a large release cannot finish.** Frames hold a fixed number of subjects (16 for values, 4
   for notices); with two or more owed forms per subject they exceed the writer's 64 KiB / 8 ms bound. Needed: frames
   sized by bytes, and no full answer stored beside each subject's changes.
7. **Under the worst-case tape, 32 GiB does not hold the working set at 1 billion past about 330 saves/s** (every save a
   subject not seen before: p99 11 s at 394). Production-shaped traffic at the same load is 45 ms. The worst case is a
   new-subject import wave, which belongs to the import lane.
8. **A history read of a heavily saved entity takes 4 s cold** (it loads every row and filters afterwards). Needed: an
   attribute filter and a row limit inside the gateway's history read.
9. **The production-shaped tape, one commit per form row (shape R), schedules rows past each cell's end,** so its card
   cannot be assembled; fixing the tape changes the measured R tapes.

## H12. What the Mac work of 2026-11-24 added (state of each H11 problem, and new open problems; evidence in `lab/experiments/EXP-DX1/STATUS.md` of that day)

**State of H11's problems.** H11.2 (questions across subjects): answered at toy size by four pieces, none run on a
server: ID lists, a slow exact route for every question shape, a commit-time index with a `find` route, and a separate
reader for questions. H11.3 (journal bounds), H11.4 (at-least reads) and H11.6 (frames sized by bytes): built and on the
one branch. H11.1 (uncached pinned reads): cost broken down (1.71 ms of reader CPU per subject, 1.76 storage loads where
the layout needs 1); two options built; cause of the extra 0.66 loads not established.

New open problems:

1. **Three operations required the whole database to stand still, and one database holds every account.** Settlement
   frames (fixed at toy size with a guard on the writer's own progress row), Publish and enrolment (every Publish result
   so far was made with the harness pausing and draining saves; refused 3 of 3 beside other accounts' saves; being
   designed), and removal on request (one removal sequence and one lock for the whole database; being designed). The
   hard part is the same in all three: replace a guard on the whole database's head with the narrowest guard that is
   still exact, and state what a position means afterwards. Look for a fourth.
2. **The commit-time index has no measured cost at 1 billion.** On the toy it adds exactly 2 datoms per replaced
   declared value and 0 storage reads inside apply; the estimate for three declared values per save is 0.36 to 0.69 ms
   of writer time. Unknown: what the extra datoms do to Datomic's indexing jobs and to the slowest saves; whether the
   string key or the tuple form is cheaper; the backfill of the sealed database (predicted 90 to 240 minutes).
3. **A question read subject by subject displaces the reader's cache.** One sweep of a deep account loads 150,000 to
   200,000 segments through a cache of about 6,000. A separate question reader removes the effect on the toy, but it
   does not fit in the 89 GiB memory table of the 1 billion profile: it needs a second machine or a larger one.
4. **Values a release writes in the background are not visible to any question route until settlement reaches the
   subject.** Both routes answer stored facts only and say so. Needed: a rule (refuse, wait, or evaluate the release for
   the subject on read) and its cost.
5. **Settlement is bounded by an estimate, not by measured work.** A frame closes when the next subject would push the
   estimated writer service over 8 ms; real work is about 30 to 45% of that (derived). Ten accounts owing 20 forms on
   100,000 subjects need 786,000 frames and 3.4 to 5.5 hours; a calibrated estimate halves both. Needs one server run to
   calibrate, then the real question: how much writer time may background work take beside live saves.
6. **Full release documents cap a release at about 0.5 MiB, not 1.3.** The request carries each value twice and one
   fact value holds the new and old documents together. Definitions stored once by content remove the cap (3.5 KB
   Publish record at any size); then the read binds: 5,000 policies evaluated and 308 KB returned per read at 1.25 MiB.
7. **A second machine can be made a protected copy no faster than its disk can be copied and checked.** The 603 s
   measured was a checksum pinned to one core; forecast 80 to 170 s on 12 cores. The 60 s bar needs a third machine
   already streaming (option C).
8. **Several owners in one save, and import of a subject over about 46 facts, do not yet follow the save contract.** A
   form page that also writes the subject's profile takes the general writer; an import splits a large subject across
   commits and a reader can see it half imported. Both being built.
9. **Nothing built on 2026-11-24 has run on a server.** The list of server runs is in `v01/READINESS.md` on the one
   branch and on each branch's page; none is approved in money terms.
