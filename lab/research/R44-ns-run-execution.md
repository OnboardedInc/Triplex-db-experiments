# R44: how an NS acceptance run executes under Q86a, so G03 can run it and claim.mjs can recompute it

Planner: R44 (Opus 5.5, high). Date: 2026-11-09. Repository: /Users/sam/projects/triplex-db-2. Read-only on code; this file is the only
file written. No Docker, colima, slot or engine command was run. Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and
lab/TARGETS.md; inherited files were read for code facts only.

North star: this note moves no priority by itself. It removes R43 gap 6 (no NS-run design under Q86a) and specifies R43 gap 3 (no CR-NS
recompute), which sit on the longest chain to the first PASS cell, NS.P3 on the broker source (R43 sections 3 and 5.3).

Evidence labels, as in R28: `[S]` read in a lab source or branch (file and line), `[V]` measured by an earlier lab agent and retained,
`[E]` inference or expectation. Every `[E]` the design rests on is a probe in section 8.1.

## 0. Answer

1. **Every candidate role runs in its own hardened container in the triplex2 VM: the broker, the reader service and the feed consumer.
   The bench driver runs in a separate trusted container on the arm network, built from the evaluator commit, and imports no candidate
   package.** Nothing of the measured system runs on the Mac. The Mac keeps only the evaluator (claim.mjs), the oracle children and the
   host-side noise sampler. Section 2.
2. **The broker leaves the Mac, so F_FULLFSYNC no longer exists on its path.** In the VM, `synchronous=FULL` becomes a Linux fdatasync on
   an ext4 Docker volume, then a virtio flush that Apple's Virtualization framework turns into whatever sync mode Lima configured for the
   disk image `[E]`. Every P2 and P3 latency and every durability result measured with the broker on the Mac becomes design evidence for
   a new comparison series, and seven measurements must be redone in the VM (section 2.5). Power-loss durability stays unqualified in
   both placements.
3. **The P3 lag start is never a candidate timestamp.** For the broker source it is a bracket `[L, U]` taken by the trusted observer: an
   inotify-woken read-only SQLite poll of `broker.db`'s `marker` row gives the last instant a position was invisible (L) and the first
   instant it was visible (U). Readable implies durable in SQLite WAL with `synchronous=FULL` `[E]`, so the bracket contains the
   publication instant. The consumer's durable record is bracketed the same way on the consumer store. The bar is judged on the
   conservative ends, `lag = U_consumer - L_source`, which can only overstate lag. The broker's `watermarkAt` and FD01's PublicationClock
   records become cross-checks (CR) that invalidate the run when they disagree. This replaces R43's kqueue suggestion (H7), which only
   works while the broker is on the Mac. Section 3.
4. **One clock.** Driver, candidate roles, relay and observer share the VM kernel's CLOCK_MONOTONIC, so the Mac clock bridge (OBS01
   round 4 measured 5.55 ms uncertainty against a 1 ms floor `[V]`) leaves the timing path. FD01's clock domain must drop the hostname,
   because every candidate container has hostname `tx2-box` and every trusted one another name (section 3.4).
5. **claim.mjs recomputes every P3 bar from retained raw events written by trusted processes only:** driver HR events, observer DR
   readbacks and brackets, the consumer store's WAL tail, fault witnesses, and O-REPLAY plus O-DOMAIN outputs that the evaluator runs
   itself. Section 4 gives the formulas for gaps, order, lag, affected set and duplicates, then P2, P1, P4 and P5, and 20 planted
   forgeries the recompute must refuse.
6. **A run is: build, seed, fingerprint, pre-flight, measured window, drain, seal, export, teardown, recompute.** The run argv is three
   candidate roles of one pinned entry point (`ns-sut.ts --role broker|readers|consumer`), the driver is pinned by image id and bundle
   hash, the fault injector is a trusted kill by the evaluator after a hook handshake, and PAIR-0 plugs in as `measure_pair` (duet) and a
   new `measure_single` (sequential A/A grading). Section 5.
7. **Paired NS runs with 256 readers do not fit six VM CPUs,** so NS absolute-bar runs are single-arm (as Q99b already allows when A0
   cannot hold the rung), graded GREEN by pre-registered signals plus sequential A/A rounds on the same arm. Count bars (gaps, order,
   duplicates, accounting, affected set) are judged in any window; timing bars only in GREEN windows. An unjudged run is not a failed run
   for VA12. If pre-flight is not GREEN, the run defers 30 minutes up to three times, then stops with HOST-NOT-QUIET and does not start
   the acceptance window. Section 6.
8. **Sixteen rulings (Q100a to Q100p) and one question for Sam (Q100-S1, Q60's host half restated with this behavior)** are in section 7.
   The build list in section 8 adds one builder the R43 chain lacked, EXP-NSR (split the bench into a trusted driver and candidate
   roles), ahead of G03 round 5; it can run in parallel with the M01 rebase, so the chain grows by at most one round.

## 1. What must hold, and what exists today

### 1.1 Rulings and contract text this design must satisfy

| Source | Requirement | Consequence here |
| --- | --- | --- |
| Q86a `[S]` RULINGS.md:619 | every candidate process runs in a hardened container in the VM, none on the Mac; inputs by tar and a read-only store; outputs only by capped `docker exec` stdout and a trusted walker | the broker, readers and consumer are candidate processes; long-lived roles need a result path other than per-case stdout (section 2.4) |
| Q86b, Q86c `[S]` :620-621 | kill proven by the cgroup gone; one internal network per arm whose only other member is the relay | the driver must join the arm network, which amends Q86c (Q100c) |
| Q86f `[S]` :624 | paired arms put each arm's SUT, relay and observer on one shared core | does not leave room for 256 readers per arm (section 2.3) |
| Q82a `[S]` :600 | CR (Triplex-reported, including the broker's own timestamps) is rejected as evidence | the lag start and the consumer record time need trusted sources (section 3) |
| Q82c `[S]` :602 | evidence as obs-bundle/1 from an observer sidecar engine.mjs starts; acceptance repeats collection by the verifier | the new volume watcher is part of that observer (section 8, OBS01 round 6) |
| Q55d, Q67d `[S]` :369, :490 | lag from the source's own publication timestamp per position; final published prefix enumerated from the source's own record; ACKs reconciled afterwards | "the source's own record" is read by the observer from the source's store, not reported by the source (Q100e) |
| Q60e `[S]` :411 | absolute bars only in GREEN windows | section 6 |
| Q98a to Q98h (pending) | identity-only feed; consumer store off the engine's write path; publication instant per arm; gap unit; byte-exact resume; O-DOMAIN affected set; 256 real readers | section 4.2 |
| Q99b (pending) | where A0 cannot hold the rung, absolute bars judged in GREEN windows graded by A/A rounds of the candidate | single-arm acceptance runs (section 6.2) |
| NS.P3 statement `[S]` obligations.json | lag "recorded by the source on the shared host monotonic clock"; three crash points; zero gaps, order violations and visible duplicate effects; lag p99 at or under 250 ms with 256 readers | the word "recorded by the source" conflicts with Q82a; Q100e resolves it without loosening the bar |
| load-contract.json measurements.P3 `[S]` | `commitTime` "stamped by the source"; crash points; readers 256 | same wording fix in 0.4.1 |

### 1.2 Facts about the code today

| Fact | Evidence |
| --- | --- |
| The bench driver loads the candidate's built packages into its own process (`import(dist("core", "index.js"))`, the qualification loader, the QLever HostBroker) | `[S]` lab/bench/lib/triplex.ts:9-60 |
| `gateNS` runs `lab/bench/driver.ts` on the Mac against a slot and ends at MEASURED or INVALID, never PASS | `[S]` lab/bin/gate.mjs:535-610 |
| claim.mjs has no fault injector (`witness()` returns null with FAULT-WITNESS-MISSING) and no paired runner (`measure_pair()` returns null with PAIRED-NOT-RUN) | `[S]` lab/bin/claim.mjs:1386-1401 |
| G03 has a container executor (Box: volume, create, start, remove, seed, walk, arm, gateway, build, case, close), a byte-pipe relay without TO capture, and per-case `docker exec` | `[S]` .claude/worktrees/g03/lab/bin/box.mjs:90-238, :174 |
| G03 round 4 lists obl-case.ts, fault witnesses, PAIR-0, observer integration and the single grant as open | `[S]` g03 REPORT.md:94-111, round4/grant-audit.md |
| The broker store's publication marker is one row, `marker(id=1, lsn, epoch, h, position, crc, size)`, updated in the same SQLite transaction as `frames(lsn, ..., payload, committed_at)` | `[S]` .claude/worktrees/p2b/packages/broker/src/sqlite-worker.ts:57-71, :141 |
| FD01's consumer store writes deliveries, effects, affected rows, checkpoint and frontier in one `BEGIN IMMEDIATE` transaction; its crash hooks `before-effect` and `after-effect` fire inside that transaction, `after-checkpoint` after COMMIT; `wal_autocheckpoint=0` | `[S]` .claude/worktrees/fd01/packages/host/src/feed/ConsumerStore.ts |
| FD01's PublicationClock is a producer-written sidecar of `process.hrtime` instants; its clock domain hashes `platform + hostname` and the boot id | `[S]` fd01 packages/host/src/feed/PublicationClock.ts:20-40, :70-110 |
| The FD01 broker feed reader runs `LogFeed.poll` on a worker thread over the broker's directory | `[S]` fd01 packages/host/src/feed/BrokerReader.ts |
| The Mac-to-VM clock bridge measured 5.546773 ms uncertainty, above the 1 ms floor | `[V]` obs01 lab/experiments/EXP-OBS01/REPORT.md:567 |
| On the Mac, a 10-row SQLite WAL commit with F_FULLFSYNC costs 3.4 to 4.0 ms p50; with `fullfsync=OFF` 0.10 to 0.12 ms | `[V]` R42 section 5.3 |
| Readers on the broker's event loop raised P2B commit p50 to 46 ms; in a worker thread, 6.68 to 7.32 ms at 256 readers | `[V]` R42 section 3.2 |
| VM: 6 CPUs, 12 GiB, pool 11 GiB, 60 GiB disk; vmType vz, Lima 2.1.4, colima 0.10.3 | `[S]` lab/config/slots.json; ~/.colima/triplex2/colima.yaml (read only) |

## 2. Decision 1: where every process runs (R28 open decision 2)

### 2.1 Placement

| Process | Trust | Placement | Image and code | Network | Volumes | Why here |
| --- | --- | --- | --- | --- | --- | --- |
| Evaluator (claim.mjs qualify), oracle children (O-REPLAY, O-DOMAIN), host noise sampler | trusted | Mac, evaluator clone | evaluator commit | Docker API over the socket only | its own store | Q86e; oracles never enter the VM (L1) |
| Slot engine (QLever replica for C3, XTDB replica for C5) | trusted image | VM, engine.mjs slot | IMAGE_PINS | default bridge | slot volume | unchanged |
| Relay | trusted | VM, own container | `tx2-obs` | arm network (alias `engine`) and bridge | obs volume, run key ro | Q86c; the candidates' only path to the engine |
| Observer | trusted | VM, own container, `--cgroupns host`, `/sys/fs/cgroup` ro | `tx2-obs` | none (`--network none`) | the arm's source-store and consumer-store volumes (opens read-only connections), obs volume, run key ro | R27; reads volumes and cgroups, needs no network |
| **NS driver** | **trusted** | **VM, own container `tx2-drv-<run>-<arm>`** | `tx2-box` image plus the driver bundle from the evaluator commit on a read-only volume; no candidate package | arm network; listens on nothing | inputs ro, driver output volume rw, run key ro | one clock with the observer; HR events from a process the candidate cannot touch (2.2) |
| Broker (source of truth, writer API, feed page service) | candidate | VM, own container `tx2-src-<run>-<arm>` | `tx2-box`, instance volume ro | arm network | source-store volume rw (this container only) | Q86a; durable state on a VM ext4 volume (2.5) |
| Reader service | candidate | VM, own container `tx2-rd-<run>-<arm>` | `tx2-box`, instance volume ro | arm network | none writable | own cgroup and cpuset, so readers cannot steal the broker's CPU and their CPU is accounted separately |
| Feed consumer | candidate | VM, own container `tx2-fc-<run>-<arm>` | `tx2-box`, instance volume ro | arm network | consumer-store volume rw (this container only) | Q98h; killable alone for the three crash points; restartable on the same volume |
| Builds, walker | as R28 | VM, `--network none` | `tx2-box` | none | as R28 | unchanged |

Every candidate container carries the hardening set H of R28 4.6 and Q86a. No candidate container mounts another candidate's state
volume, the driver's output volume or the obs volume.

### 2.2 Diagram

```
 macOS host (user sam)
 +--------------------------------------------------------------+
 | evaluator clone: claim.mjs qualify --authority <sha> ...      |
 |  - oracle children (O-REPLAY, O-DOMAIN) under sandbox-exec    |
 |  - host noise sampler (swap, pageouts, compressor, load)      |
 |  - fault injector: reads the driver's control stream,         |
 |    issues docker kill / docker run                            |
 |  - after the run: walker exports, CR-NS recompute             |
 +-----------------------------+--------------------------------+
                               | Docker API (unix socket) only; no Mac path is mounted into any container
                               v
 triplex2 VM (vz, 6 CPUs, 12 GiB; one kernel, one CLOCK_MONOTONIC)
 +---------------------------------------------------------------------------------------------------------+
 |  default bridge                                                                                          |
 |   [tx2-qlever-s1 slot engine]  cpus 0,1      <---- upstream ---- [tx2-relay-<run>]  (trusted)           |
 |                                                                    |  alias "engine"                     |
 |  arm network tx2-run-<run>  (--internal, inhibit_ipv4, no gateway) |                                     |
 |  +--------------------------------------------------------------------------------------------------+   |
 |  |                                                                                                  |   |
 |  |  [tx2-drv-<run>]  trusted, cpu 5        RPC ns-sut/1 (JSON lines, capped)                         |   |
 |  |   frozen trace offers ----------------------------> [tx2-src-<run>]  candidate, cpu 2              |   |
 |  |   256 closed-loop reader loops --------------------> [tx2-rd-<run>]   candidate, cpu 4            |   |
 |  |   consumer control channel ------------------------> [tx2-fc-<run>]   candidate, cpu 3            |   |
 |  |   writes HR events to its own volume                 |        |                 |                |   |
 |  |                                                      |  feed  |  pages <--------+                |   |
 |  |                                                      |  apply ---> engine (via relay)            |   |
 |  |                                                      |  readers' SPARQL ---> engine (via relay)  |   |
 |  +------------------------------------------------------+-------------------------------------------+   |
 |                                                         |                          |                     |
 |   volumes:  tx2-ss-<run> (broker.db) rw: src only ------+                          |                     |
 |             tx2-cs-<run> (consumer store) rw: fc only -----------------------------+                     |
 |             tx2-out-<run> (driver events) rw: drv only;  tx2-in-<run> ro: all;  tx2-inst-<run>-1 ro      |
 |                                                                                                          |
 |   [tx2-obs-<run>]  trusted, --network none, --cgroupns host, cpu 5 (with the driver and relay)           |
 |     - opens broker.db and the consumer store read-only; inotify-woken polls -> publication brackets      |
 |     - tails the consumer store's WAL bytes; final readbacks; cgroup stats; kill proofs; PSI              |
 |     - writes HMAC-chained chunks to tx2-obsv-<run> (obs-bundle/1)                                        |
 +---------------------------------------------------------------------------------------------------------+
```

### 2.3 CPU and memory for one arm

| CPU | Holder | Note |
| --- | --- | --- |
| 0, 1 | slot engine | as today's slots |
| 2 | broker | main thread commit-only, SQLite writer worker, checkpointer, feed page reader worker (R42 section 7) |
| 3 | feed consumer | the P3 critical path gets its own core |
| 4 | reader service | executes reads for the driver's 256 loops; the engine (cpus 0, 1) is the read bottleneck for C3 |
| 5 | driver, relay, observer | all trusted; the driver's hiccup meter and the observer's own timing make contention visible; any contention here can only inflate measured latency and lag |

| Container | Memory cap `[E]` |
| --- | --- |
| slot engine | 3.5 GiB |
| broker | 1 GiB |
| reader service | 0.75 GiB |
| consumer | 0.5 GiB |
| driver | 1 GiB (raw events stream to its volume) |
| observer, relay | 0.25 GiB, 64 MiB |
| total | about 7.1 GiB, after the 2 GiB build has finished |

With the three dev residents at 9.25 GiB and the pool at 11 GiB, a single-arm NS window must park two residents, one more than Q69a's
default (Q100n). A paired NS run (two arms) needs about 14 GiB and twelve CPUs under this layout, which the VM does not have; R28 layout
(i) fits two arms only by putting each arm's broker, readers, consumer and trusted processes on one core, which R42 shows destroys P2
(local readers: p50 227 ms). So NS runs with 256 readers are single-arm (Q100l).

### 2.4 Result paths for long-lived roles

R28's result channel (one `docker exec` stdout per case) fits correctness cases, not a 20-minute run with millions of reads. For NS:

1. **HR events** are written by the trusted driver to its own volume `tx2-out-<run>` as HMAC-chained chunks under the run key (R27 2.5's
   scheme), and exported after the run by the trusted walker. The candidate never mounts this volume.
2. **Candidate answers** reach the evaluator only as bytes inside the driver's events (the RPC response hash for every read, the full
   answer for sampled reads), so every candidate output is captured by a trusted process before it is stored.
3. **Candidate state** (broker.db, consumer store) is read by the observer during the run and exported by the walker after the
   candidate containers are removed. No candidate archive is extracted on the Mac (R28 4.4 item 4 holds).
4. **Candidate self-reports** (stdout, its own timings, PublicationClock sidecar) are retained as CR for cross-checks only.

### 2.5 The broker in a Linux VM container: what replaces F_FULLFSYNC, and what must be re-measured

On Linux, SQLite's `fullfsync` pragma does nothing; `synchronous=FULL` in WAL mode calls fdatasync on the WAL at each commit. In the VM
that is: ext4 journal commit on the Docker volume, a cache flush to the virtio block device (if `/sys/block/vda/queue/write_cache` reads
`write back`), and then Apple's Virtualization framework handles the flush on the host's disk image according to the synchronization
mode Lima set for the attachment (full, fsync or none) `[E]`. If Lima uses the fsync mode, a guest flush becomes a host `fsync()`, which
on macOS does not flush the drive's write cache, so the guarantee becomes "survives a broker or VM crash" but not "survives host power
loss" `[E]`. R42 already found power loss unqualified on the Mac (drive honesty), so no placement qualifies it today.

| # | Re-measure in the VM | Why | Pass |
| --- | --- | --- | --- |
| M1 | Commit floor: raw fdatasync on the volume, and a 10-row SQLite WAL commit with `synchronous=FULL`, p50 and p99, idle and with the slot engine busy | the 3.4 to 4.0 ms Mac floor no longer applies | numbers recorded; compare with 3 ms (host F_FULLFSYNC) and 0.1 ms (host fsync) to infer the VZ sync mode |
| M2 | The flush path: `write_cache` of the device, ext4 mount options (no `nobarrier`), the Lima vz attachment sync mode read from the Lima 2.1.4 source | decides the durability class | class recorded in every receipt |
| M3 | SQL01's crash durability: 50 SIGKILLs of the broker container (`docker kill`), zero acknowledged commits lost | the Mac result covered a Mac process | 0 lost |
| M4 | INT-Q kill-50 and restart through the relay | same | as INT-Q |
| M5 | R42's placement matrix (offer-to-ACK at 0, 16 and 256 readers, readers in their own container) | P2 numbers from the Mac are a different series | numbers recorded |
| M6 | P2Q's P3 lag (13.7 to 24.9 ms at zero readers on the Mac) with the observer brackets | the first-PASS cell's margin must be re-established | lag p99 well under 250 ms |
| M7 | Durable-flush refusal: on Linux the broker and the consumer store refuse to start on tmpfs, overlay or a device without a flushing write cache, and record the calibration median | replaces `requireFullFsync`, which is darwin-only and off by default (R42 4.3) | startup refusal test on tmpfs |

A faster commit in the VM may come from a weaker flush. Receipts bind the durability class (Q100b); receipts with different classes are
never compared, as Q60c forbids comparing arms under different slot regimes.

### 2.6 Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Driver as a Mac host process (R28 option) | the arm network is internal with no gateway, so the Mac cannot reach the candidate roles without a reverse path through the relay; the clock bridge measured 5.55 ms uncertainty `[V]`, five times the floor; the Mac's load (12 to 13 on 12 cores, STATE) enters every timing |
| Driver inside a candidate container, or the bench as today (driver imports `packages/*/dist`) | HR timestamps would come from a process candidate code shares, so they are CR; a candidate could patch `performance.now` or the event recorder |
| Driver inside the slot engine container | puts lab code into a trusted engine image and its cgroup; the engine's CPU accounting (P4 per-core) would include the driver |
| Readers in the driver process | candidate client code would run inside the trusted process (the L1 class of R28) |
| Readers in the broker container or process | R42: readers on the broker's thread raise commit p50 to 46 ms; even in workers, one cgroup cannot separate reader CPU from writer CPU for P1 attribution |
| Consumer in the broker or reader container | Q98h; killing it for a crash point would kill the broker or the readers |
| Consumer reading `broker.db` directly from a shared volume | a WAL reader needs a writable `-shm`, so the consumer container would need write access to the source of truth; the feed page service over the arm network keeps the source volume private |
| Broker kept on the Mac as a trusted engine built from an accepted commit | the broker is the system under test for P2 and P3 (receipt scope engine, layer source); a trusted prebuilt broker cannot qualify a candidate's broker |
| Broker kept on the Mac under sandbox-exec | R28 2.2: cannot kill a setsid helper, allows reading every file Sam can read, no resource caps, refused under a sandboxed launcher |
| A second VM for the broker | needs host budget the host does not have (STATE: host saturated) and a second clock domain |

## 3. Decision 2: trusted P3 instants per source (R27 gap G3)

### 3.1 Per source

| Source (arm) | Publication instant (lag start) | Kind | Lower bound L | Upper bound U | Cross-check (CR, never evidence) |
| --- | --- | --- | --- | --- | --- |
| Broker log (C3, C5, P2B arm B, lane X arm B) | the moment the commit group's `marker` row with `lsn >= p` becomes visible to a new read transaction on `broker.db` | HO plus DR (observer's own read-only connection) | start time of the last observer poll that did not see the LSN | end time of the first poll that saw it | `frames.committed_at`, `watermarkAt`, FD01 PublicationClock record: must lie in `[L - 1 ms, U + 5 ms]` |
| XTDB as source (lane X arm A1) | engine commit resolution | TO plus EI | relay instant when the writer's COMMIT message is forwarded upstream | min(relay instant of the COMMIT response, observer's first sight of the tx id in `node.tx.latestCompletedTxId`) | the writer's host instant at COMMIT SYNC (Q98c), `system_time` |
| Datomic as source (lane D) | transactor commit | HR plus EI | driver's send instant of the command (weak: includes gateway time) | observer peer's first sight of the t (R27 D3) | the gateway's transact-result instant |

The P3M brief's three CR sources (broker `watermarkAt`, the XTDB writer's instant, the Datomic client's instant) stay in the code and
in the receipt as the cross-check column. They never start a lag interval.

### 3.2 The broker bracket mechanism (observer `pub-watch`)

1. The observer opens `broker.db` with a read-only connection (`mode=ro`) on the source-store volume. It watches `broker.db-wal` with
   inotify (`IN_MODIFY`), through stdlib `ctypes`, because the WAL file receives a write for every commit group and inotify events reach
   watchers in another container on the same inode `[E]`.
2. Idle: block on inotify with a 10 ms timeout; on timeout, poll once anyway (so a missed event costs at most 10 ms of bracket width).
3. Active: after an event, poll every 0.25 ms (`BEGIN; SELECT lsn, epoch, position FROM marker WHERE id=1; COMMIT`) until a new LSN
   is visible or 20 ms pass, then go idle. Each poll records `(tStart, tEnd, lsnVisible)` on CLOCK_MONOTONIC.
4. For each LSN: `L = tStart` of the last poll with `lsnVisible < lsn`; `U = tEnd` of the first poll with `lsnVisible >= lsn`. All
   positions of one LSN share its bracket.
5. Why the bracket contains the publication instant: in WAL mode SQLite makes a commit visible to new readers by updating the wal-index
   header after the WAL sync when `synchronous=FULL` `[E]` (probe V2). So visible means durable and readable, which is TARGETS 1.1 P3
   item 1's definition ("the moment it becomes readable and the ACK may be sent"). A later broker step that publishes a watermark in
   memory can only come after this, so L is still a lower bound and lag can only be overstated.
6. The `-shm` header is updated through mmap, which inotify does not report; that is why the observer polls instead of trusting the
   event time. The event only wakes it.
7. Cost: one short read transaction per 0.25 ms while active, about 20 to 50 us each `[E]`, on the trusted core. Read transactions do not
   block the writer in WAL mode; they can delay the broker's gated RESTART checkpoint by one poll. Probe V3 measures broker commit p99
   with and without pub-watch.

### 3.3 The consumer's durable record

"Affected subjects known" is the consumer's single durable write of the affected set and its checkpoint (TARGETS 1.1 P3 item 4). The
observer runs the same pub-watch on the consumer store (`checkpoints`, `frontier`): `U_c(p)` is the end of the first poll whose
visible frontier is at or past `p`. Because FD01 writes effects, affected rows and checkpoint in one transaction, visibility of the
frontier implies visibility of the rows.

The observer also tails the consumer store's WAL bytes into the obs bundle on every inotify event. FD01 sets `wal_autocheckpoint=0`, so
during a run the WAL holds every consumer transaction as frames in commit order. The normalizer reconstructs each transaction's state by
opening a copy of the database file plus the WAL truncated at each commit frame (SQLite rebuilds the wal-index from the WAL) `[E]`. This
gives the exact order of consumer transactions, which polling alone cannot (two commits between polls), and detects rewrites: a final WAL
whose earlier frames differ from the tailed copy is TAMPER (section 4.4, F11). If the consumer checkpoints its WAL during the run, the
tail must have captured every frame before the reset; a missing frame makes the order check NOT_ESTIMABLE and the run INVALID.

### 3.4 Clock domain

1. All containers share the VM kernel's CLOCK_MONOTONIC: Node's `process.hrtime` and Python's `time.monotonic_ns` both read it on
   Linux, and Docker creates no time namespace by default `[E]`. Probe V4 confirms it by comparing `/proc/self/ns/time` inodes and by a
   ping between two containers through a pipe.
2. The domain identity is `{bootId: /proc/sys/kernel/random/boot_id, timeNs: inode of /proc/self/ns/time, primitive: CLOCK_MONOTONIC}`.
   Every event from the driver, observer, relay and (for cross-checks) the candidate carries it; claim.mjs refuses any timing comparison
   across two domains (F14).
3. FD01's `openHostFeedClock` hashes `platform() + ":" + hostname()` into `domain.host` `[S]`. Inside the box every candidate container
   has hostname `tx2-box` (R28 4.6) and trusted containers other names, so `sameFeedClock` would reject the driver's and observer's events
   against the producer's, or accept two different VMs whose candidates are both `tx2-box`. Replace hostname by the time-namespace inode
   (build item B7).
4. Mac-side events (evaluator, host sampler, kill commands) carry no timing claim. Kill timing is bounded by the observer's cgroup reads.

### 3.5 What changes in EXP-P3M's brief

P3M builds the measurement inside today's monolithic bench. Its offline gates (planted delays of 100, 249, 251 and 400 ms reported
exactly; a position with no instant fails; a reader-level label lie refused) stay valid and become fixtures of the new recompute. Three
changes: the lag start is the observer bracket, not the PublicationClock record (which becomes CR); the consumer moves to its own
container rather than a worker; the 256 readers are the driver's loops over RPC, not reader workers in the driver process. P3M's code
moves into EXP-NSR (section 8).

### 3.6 Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| kqueue on the broker's WAL on the Mac (R27 H7, R43 step 8) | the broker leaves the Mac under Q86a; kqueue also needs a clock bridge (5.55 ms) |
| The broker's `committed_at` or `watermarkAt`, or FD01's PublicationClock sidecar | CR (Q82a); the producer writes the sidecar and chooses the instant |
| The inotify write event as the publication instant | it precedes the fsync and cannot be mapped to an LSN reliably when groups overlap; used only to wake the poller |
| The driver's offer instant as the lag start | trusted and conservative, but it adds the whole commit latency to lag; kept only as lane D's lower bound |
| The driver's ACK receive instant | an upper bound on publication, so lag from it understates lag; and Q67d says a lost ACK is never a feed defect |
| eBPF tracing of the broker's fdatasync | needs privileged containers and kernel BTF in the colima image `[E]`; more trusted code than the poller |
| fanotify | needs CAP_SYS_ADMIN in the observer; inotify needs no capability |

## 4. Decision 3: the CR-NS recompute in claim.mjs

### 4.1 Retained raw events (every one written by a trusted process)

| Id | Event stream | Writer and kind | Fields |
| --- | --- | --- | --- |
| E1 | trace offers | driver, HR | commandId, subject, sizeBand, kind (normal, duplicate, lost-ACK retry, correction, invalid), scheduledAtNs (frozen schedule), sentAtNs, ackAtNs or censoredAtNs, receipt bytes (position, txId, stamp) or typed error or typed conflict |
| E2 | reads | driver, HR | loop, readId, subject, shape, requestedBasis (driver-recorded), sentAtNs, receivedAtNs, answerSha256, answer bytes for sampled reads, echoed basis, route, watermark, split-read group |
| E3 | source prefix | observer DR, final readback of `broker.db` by the pinned SQL01 normalizer | every LSN from the first to the final published one: resolution (commit, abort, epoch, seal), epoch, positions, txIds, operationId, commandIds, decided stamp, change ops (op, entity, attribute, validFrom, validTo, position, assertionId), frame CRC chain |
| E4 | publication brackets | observer HO plus DR | per LSN: L, U, poll sequence numbers; per poll: tStart, tEnd, lsnVisible |
| E5 | consumer record brackets | observer HO plus DR | per consumer-store poll: tStart, tEnd, visible checkpoint token and frontier |
| E6 | consumer WAL tail and final readback | observer DR | raw WAL chunks (HMAC-chained), final database bytes; normalized: ordered consumer transactions with frontier before and after, new delivery rows (offset, digest), new effect and affected keys, deleted keys |
| E7 | fault witnesses | evaluator plus observer | fault-witness/1 per injection (section 5.3) |
| E8 | reader concurrency | driver HR, relay TO | per second: loops with a completed read, in-flight reads; relay: concurrent upstream requests |
| E9 | windows | driver HR | measured window bounds, burst phases (from the frozen offer schedule), drain end |
| E10 | noise and grade | evaluator host sampler, observer VM agent, driver and observer hiccup meters | R22 signals per round, A/A rounds, window grade |
| E11 | CR cross-checks | candidate | PublicationClock records, consumer-reported times, candidate stdout | 
| O1 | expected state | evaluator runs O-REPLAY | over E3's committed commands in position order |
| O2 | expected affected sets | evaluator runs O-DOMAIN | per committed position, from E3's change ops and W0 (Q36e, Q40f dense ordinals) |

claim.mjs refuses a bar computed from any summary field (F18). Quantiles are exact nearest-rank on the full sample (no histogram
binning), because P3 samples are positions, tens of thousands per run.

### 4.2 P3 bars

Let `Prefix` be E3's LSNs from the run's first trace LSN to the final published LSN at drain end, and `C` the committed LSNs in it.

| Bar or case | Recompute | Fails or refuses when |
| --- | --- | --- |
| NS-P3-SOURCE-PREFIX-ENUMERATED (Q67d) | Prefix comes from E3 only. Reconcile E1: every receipt position (with an ACK) is in C with equal txId and commandIds; every commandId in C is an offered E1 command (or its duplicate or retry) | an ACKed position missing from C (LOST-ACKED-COMMIT, also a P2 failure); a commit with a commandId the driver never offered (FOREIGN-COMMIT); a frame CRC chain break |
| NS-P3-EVERY-POSITION-ACCOUNTED (Q55d, Q98e) | every LSN in Prefix has a resolution; every LSN in C has an E4 bracket | any LSN without a resolution (SOURCE-GAP); any committed LSN without L or U (fails the run, as Q55d requires) |
| NS-P3-GAPS-MAX = 0 | source gaps (above) plus delivery gaps: an LSN in Prefix whose delivery row is missing from the consumer's final `deliveries`, or whose digest differs from the evaluator's canonical encoding of the E3 entry (feed-entry/1, Q100g) | count above 0; a seal, abort or epoch boundary is never a gap if its LSN is delivered or resolved |
| NS-P3-ORDER-VIOLATIONS-MAX = 0 | from E6: consumer transactions in commit order T1..Tn with frontier f(Ti); require f strictly increasing, and every effect or affected key (p, s) first inserted in Ti to satisfy f(Ti-1) < p <= f(Ti). A violation is a key outside its transaction's range or a frontier regress. Per-subject order then follows from the cursor order (TARGETS 1.1 P3 item 2); effects inside one transaction are atomic and so not ordered externally | count above 0; E6 incomplete (NOT_ESTIMABLE, run INVALID) |
| NS-P3-DOMAIN-AFFECTED-SET (Q98g) | for every p in C: observed = affected rows for p in the final consumer readback; expected = O2(p); misses = expected minus observed, extras = observed minus expected; effects rows checked the same way | any miss or extra |
| NS-P3-VISIBLE-DUP-EFFECTS-MAX = 0 | from E6: a visible effect is an effects row inserted by a committed consumer transaction. Duplicates = for each key (consumer, epoch, position, subject), committed insertions minus 1, summed, including a delete followed by a reinsert; plus rows sharing a key in the final readback (if the schema lost its primary key). Replay attempts come from E11 and E6 redelivered digests and are reported, not barred | count above 0 |
| NS-P3-LAG-P99-MS = 250 | for every p in C with L(p) inside the measured window: `lag(p) = U_c(p) - L(p)` (conservative). p99 pooled over the window, bursts included; also split steady and burst by E9; also reported: midpoint estimate `(L_c + U_c)/2 - (L + U)/2` and bracket widths p99 | p99 above 250; a p with no U_c by drain end counts as a gap and as lag = infinity; lag judged only in a GREEN window (section 6) and only on runs without crash injection (Q100j) |
| 256 readers (Q98h, Q100m) | from E8: for at least 99% of the window's seconds, at least 256 distinct loops completed a read; relay concurrency agrees within 10% | label above the measured level (READER-LEVEL-MISMATCH) |
| CR cross-check (Q100e) | for every LSN, broker CR instant in `[L - 1 ms, U + 5 ms]`; consumer CR durable instant in `[L_c - 1 ms, U_c + 5 ms]` | outside: CR-INCONSISTENT, the run is INVALID (a broken observer or a forged instant) |
| CRASH-BEFORE-EFFECT, -AFTER-EFFECT, -AFTER-CHECKPOINT | per point at least T-FAULT-REPS = 3 witnesses (section 5.3); after each recovery, the replayed range's delivery digests equal E3's canonical bytes (byte-exact resume, Q98f), no duplicate and no gap over the whole crash run | fewer witnesses (CX-FAULT-REPS-SHORT); a witness whose DR contradicts its point; any duplicate, gap or affected-set error |

### 4.3 P1, P2, P4 and P5

| Priority | Inputs | Recompute |
| --- | --- | --- |
| P2 | E1, E3, E4 | Latency per command = `ackAtNs - scheduledAtNs`, commands censored at their censor time (Q60d); p50 and p99 per band (5 to 10 and 11 to 25 against 10 and 50 ms; 26 to 50 against 100 ms). Accounting: every E1 command has a receipt, typed error or typed conflict (UNACCOUNTED = 0). Progress: every oracle-valid command published (O1 decides which rejections and conflicts are justified, Q31a). Queue: offered minus published at each instant, published from E4's U, at most 2 s of the steady rate; drain within 60 s after each burst. RYOW: for each ACK the driver issues the pull at the returned position immediately and compares with O1 at that position. Duplicates and lost-ACK retries: receipt bytes equal the original's. ACK order: `ackAtNs >= L(p)` for every ACK (a smaller value is ACK-BEFORE-PUBLICATION); cases with `L <= ack < U` are reported as undecided, not as passes of OBS-ACK-ORDER |
| P1 | E2, E1, E8, E10, O1 | Correctness: every read's answer hash is checked against O1 at the driver-recorded requested basis through a key map (subject, shape, basis); when unique keys exceed the cap (proposed 2 million per run), all split reads plus a seeded sample are evaluated and the receipt states the share (Q100p); any violation fails NS-P1-VIOLATIONS-MAX. Goodput: correct completed reads per second per level. Read p99 at 256 from E2 latencies. Writer ratio: P2's p99 at each level divided by the zero-reader baseline's p99 on the same trace segment and burst phase. Maintenance event in window from observer EI. 1,024 stress and recovery from the ladder's E9 windows |
| P4 | E2 (single pull loop), observer cgroup `cpu.stat` and `io.stat` of the serving container, EI scan counters | p50 and p99 over the frozen weighted bucket mix and per bucket; pulls per second per core with cores = the serving container's cpuset size (Q67g), CPU-seconds-based figure beside it; history flatness on the matched 1,000-subject sample at depths 1, 3 and 10 (p99 and bytes read at depth 10 at most 1.1x depth 1) |
| P5 | E1, E2, sweep events from the driver, observer DR of the outbox, O-DOMAIN `reconcile` and `publish` | basis from the activation receipt (Q92a); coverage hash equals the subject-list hash; every output and outbox item equals O-DOMAIN's; wall time from the driver's sweep start and end; live read p99 and writer p99 against the matched no-sweep segments (1.5x); post-capture mutations reflected at the captured basis only |

### 4.4 Planted forgeries the recompute must refuse

Each becomes a CX fixture (worded as a check of the lab's own evaluator) with its expected refusal code.

| # | Forgery | Expected outcome |
| --- | --- | --- |
| F1 | lag computed from the broker's `watermarkAt` or the PublicationClock sidecar instead of E4 | LAG-START-CR, refused |
| F2 | a bracket with U before L, or a consumer U_c before the source L | BRACKET-INVALID, run INVALID |
| F3 | an obs-bundle chunk with a broken hash chain, wrong HMAC, or a head missing from the witness log | OBS-UNAUTHENTICATED, run INVALID |
| F4 | a committed LSN with no bracket | NS-P3-EVERY-POSITION-ACCOUNTED fails |
| F5 | the prefix taken from the consumer's deliveries or from ACKs instead of E3 | PREFIX-NOT-FROM-SOURCE, refused |
| F6 | a final readback truncated before ACKed LSNs | LOST-ACKED-COMMIT |
| F7 | a consumer transaction whose effects include a position past its frontier (planted order violation) | counted by ORDER |
| F8 | a frontier that regresses after a crash | counted by ORDER |
| F9 | a delete and reinsert of one effect key in the WAL history | counted by VISIBLE-DUP |
| F10 | direct-subjects-only affected sets on a location wage change (the GS.06b shape) | misses counted by DOMAIN-AFFECTED-SET |
| F11 | a final consumer WAL whose earlier frames differ from the tailed copy | TAMPER, run INVALID |
| F12 | delivery digests that match the candidate's own encoding but not feed-entry/1 of E3 | delivery gap counted |
| F13 | a run labelled 256 readers whose E8 shows fewer active loops | READER-LEVEL-MISMATCH |
| F14 | events from two clock domains compared (another boot id, a time namespace, or a Mac clock) | CLOCK-DOMAIN-MISMATCH |
| F15 | lag samples fewer than committed LSNs in the window (dropped samples) | NS-P3-EVERY-POSITION-ACCOUNTED fails |
| F16 | a driver image or bundle hash other than the pinned one, or a generator hash other than the frozen trace's | DRIVER-NOT-PINNED, refused |
| F17 | a fault witness reused across injections (equal eventsSha256), or with no cgroup-gone proof | FAULT-WITNESS-INVALID |
| F18 | bars taken from summary fields (p99 supplied) with raw events absent | RAW-EVENTS-MISSING |
| F19 | a lag bar from a run with crash injections, or from a window not GREEN | not counted toward the lag bar (unjudged) |
| F20 | CR instants outside the bracket tolerance | CR-INCONSISTENT, run INVALID |

## 5. Decision 4: how the run plugs into G03

### 5.1 Run argv and pins

1. **Candidate roles.** One entry point in the candidate tree, `packages/qualification/workloads/ns-sut.ts`, next to R28's
   `obl-case.ts`, with `--role broker|readers|consumer --config /in/<sha256>.json`. The config (composition, ports, store paths, consumer
   id, hook mode) is written by the evaluator into the inputs volume. The contract's BUILD_SPEC gains `run.ns.{broker, readers,
   consumer}` argv; today `buildSpec.run` is null `[S]` ACCEPTANCE.md:210.
2. **The RPC.** `ns-sut/1`, line-delimited JSON over TCP on the arm network, schema pinned in the contract: `commit`, `pull`, `read`,
   `feedPage` (broker to consumer), `consumerControl` (driver to consumer: start, stop, hook events), each message capped (proposed 1 MiB
   per request, 16 MiB per response) and timed. The driver parses candidate bytes, so it is in R28's R6 class: strict parser, caps, no
   egress, fail closed.
3. **The driver.** The trusted image `tx2-box` plus a driver bundle volume built by the evaluator from its own commit
   (`lab/bench/ns-driver/`, after EXP-NSR). Contract 0.4.1 pins DRIVER_PIN `{imageId, bundleSha256, generatorSha256}`, with
   `generatorSha256` equal to `writerTrace.generator.frozen.sha256` (Q100d).
4. **Seeding.** Before the window, the driver loads the rung population through the broker's bulk path (EP-BULK) or a K01 clone; the
   observer's DR fingerprint of `broker.db` must equal the O-DOMAIN population fingerprint (G0 sweep, Q92c), else SEED-MISMATCH.

### 5.2 One NS run, step by step (claim.mjs qualify, single arm)

| Step | Who | What | Fails closed with |
| --- | --- | --- | --- |
| 1 | evaluator | integrity, authority and evaluator commits as ids, lease (Q60h), pool reservation for about 7 GiB with two residents parked | ISOLATION-NOT-IN-FORCE |
| 2 | evaluator, Box | build the instance (R28 4.6), walker listing, execution-identity/2 | BUILD-FAILED |
| 3 | engine.mjs | slot up, relay up, arm network, observer up with the run key | ARM-NOT-UP |
| 4 | Box | state volumes (source store, consumer store, driver output), inputs volume, driver bundle volume | |
| 5 | Box | candidate containers broker, readers, consumer with cpusets 2, 4, 3; driver on cpu 5 | inspect mismatch |
| 6 | evaluator | preflight: R28's checks for every candidate container, plus: no candidate reaches a listening port on the driver; no candidate mounts another's volume; clock domain equal across containers | ISOLATION-NOT-IN-FORCE |
| 7 | driver | seed, then fingerprint check by the observer | SEED-MISMATCH |
| 8 | driver, observer, evaluator | pre-flight noise grade (section 6) | HOST-NOT-QUIET after 3 deferrals |
| 9 | driver | warm-up 120 s, measured window (600 s per level at acceptance), frozen trace, 256 loops, maintenance event | driver ELU above 0.9 (INVALID) |
| 10 | driver | stop offers, drain until the consumer's frontier reaches the final published LSN or 60 s | gap counted |
| 11 | observer | final readbacks, seal the bundle, witness log heads | |
| 12 | Box | remove candidate containers, cgroup-gone proofs, walker exports of state volumes and the driver output volume | CASE-SURVIVOR |
| 13 | evaluator | O-REPLAY and O-DOMAIN over E3; CR-NS recompute (section 4); the single grant (round 7) | |

### 5.3 The fault injector and fault-witness/1

1. **Handshake.** In a crash run the consumer config sets `hook: wait`, with the point and the page number chosen by the evaluator's
   seeded schedule. FD01's `crash?.(point)` callback `[S]` then sends `{event: "at-point", point, page, cursor}` on the driver's control
   channel and blocks.
2. **Relay to the evaluator.** The driver writes the event to its stdout control stream, which the evaluator follows through the Docker
   API. The driver holds no Docker socket.
3. **Pause, observe, kill.** The evaluator runs `docker pause` (cgroup freezer), asks the observer for a DR snapshot of the consumer store
   (checkpoint, frontier, row counts, WAL length and whether uncommitted frames follow the last commit frame), then `docker kill -s KILL`,
   then waits for the observer's cgroup-gone proof.
4. **Restart.** A new consumer container on the same consumer-store volume, normal hook mode; the driver reconnects; the consumer resumes
   from its checkpoint.
5. **Witness.** One fault-witness/1 per injection `{obligation, case, mode, rep, faultPointId, injectedAt (observer freeze instant),
   transitionEvents [{transition, t, durableEvidenceObject}], lastWitnessedTransition, callerOutcome, retries, postRecoveryCaseResults,
   eventsSha256}`, with the pre-kill and post-restart DR snapshots as durable evidence objects and the replayed range's digest comparison
   as the post-recovery case result.
6. **What DR can confirm.** `after-checkpoint`: the snapshot shows the page's cursor committed; confirmed. `before-effect`: no frames after
   the last commit frame and the checkpoint unchanged; consistent. `after-effect`: inside FD01's single transaction the effect rows are
   uncommitted and usually still in the page cache, so DR cannot tell it from `before-effect` unless SQLite spilled frames to the WAL.
   The point label is then CR. A lying candidate can only mislabel which point it exercised; it cannot make a wrong outcome pass, because
   gaps, duplicates, affected sets and byte-exact resume are all judged from DR. This stays on the residual list (Q100j).
7. **Schedule.** Crash runs are separate from lag runs: at least 3 injections per point (T-FAULT-REPS), 9 per crash run, on the same
   frozen trace with 256 readers; catch-up lag after each restart is reported, not barred. The broker's own crash points (C2-*,
   CS-FAULT) reuse steps 3 to 5 with the broker container and are not on the P3 path.

### 5.4 The PAIR-0 hook (EXP-M01, exp/M01-paired-measurement)

| M01 piece `[S]` (45a6fd40) | Under G03 |
| --- | --- |
| `lab/bench/duet.ts` coordinator, barrier directory, absolute start | the evaluator starts two arms; both drivers take one absolute CLOCK_MONOTONIC start instant from their plans (one kernel, so no barrier directory) |
| `lib/rounds.ts` `--round-plan`, per-round commitAll and commitCensored, open-loop read probe | inside the trusted driver; per-round histograms are E1 and E2 subsets with round ids |
| `lib/noise.ts` host sampler and "read-only VM agent over one colima ssh session" | host sampler stays in the evaluator on the Mac; the VM agent moves into the observer container (PSI, cgroup `cpu.stat` of every container on the arm cpusets, neighbor CPU); calibration spins in the observer and on the host; hiccup meters in driver and observer |
| `lib/paired.ts`, `lib/pair-analysis.ts` | run in claim.mjs from retained per-round data (Q67f) |
| PAIR gate in gate.mjs, measurement lease, cpuset regime | the lease is taken by claim.mjs (step 1); gate.mjs's PAIR route becomes a refusal-only adapter under the single grant |

`measure_pair()` runs a duet for comparative claims. A new `measure_single()` runs one arm with sequential A/A grading for absolute bars
(Q99b, Q100k). Both feed the same window grade.

### 5.5 What each G03 round adds

| Round | Adds | Offline or slot |
| --- | --- | --- |
| 5 | `Box.service` (long-lived candidate role containers), `Box.driver`, state and output volumes, observer start with volume mounts, preflight additions, the NS step sequence of 5.2, raw event export, contract field proposals (`run.ns`, DRIVER_PIN, nsLayout, ns-sut/1, feed-entry/1) | offline in VM containers with an in-memory replica, then one exclusive slot run at 1k |
| 6 | the fault injector of 5.3 and fault-witness/1 production; the broker crash points through the same path | offline with planted consumers |
| 7 | `admitExecutedAttempt`, the single grant of round4/grant-audit.md; `measure_pair` and `measure_single`; window grade in the receipt | offline, then the registered-slot run R43 step 10 |

## 6. Decision 5: GREEN windows on a shared host (Q60)

### 6.1 The situation

The host is shared with Sam's default colima VM (4 vCPU, his Onboarded stack) and other heavy jobs; STATE records load 12 to 13 on 12
cores, 36 GiB with about 14 GiB compressed, swap near 96% (R22 table). R25 saw zero-reader runs 1.6x apart minutes apart. The lab can
quiet its own jobs (Q60h lease freezes pool admission and takes every heavy token) but not Sam's VM. Q60's host half (may acceptance
windows pause it) has waited for Sam since 2026-11-07.

### 6.2 The grading rule for a single-arm run

1. **Signals** (R22 section 4.1, pre-registered): host swap growth and pageouts, compressor activity, VM PSI cpu, memory and io, throttled
   periods per arm (cpuset regime), neighbor CPU on any arm cpuset, calibration drift (post over pre spin minimum in [0.85, 1.18]),
   interference index, hiccup overshoot (driver and observer), driver ELU. Applied per round of 150 s, decided before outcomes are seen,
   logged by rule id.
2. **Sequential A/A** (new for single-arm runs): rounds of equal burst phase on the same arm; `d_k = ln(p50_k / p50_{k-1})` of commit
   latency; s_d against R22's limits (0.28 at 12 rounds for a 1.25 target) as provisional values until M01's A/A duet calibrates a
   sequential limit. Different trace segments enlarge s_d, so this errs toward non-GREEN.
3. **Grade:** GREEN when no round breaks a hard rule, at most one third of rounds are excluded, and s_d is within the limit; AMBER when
   only soft rules fire; RED otherwise.

### 6.3 What the run does when the window is not GREEN

| When | Action | Receipt |
| --- | --- | --- |
| Pre-flight (3 rounds) not GREEN | do not start the measured window; release the lease; defer 30 minutes; retry up to 3 times | none counted; a HOST-NOT-QUIET record with the signals |
| Three deferrals failed | stop; the orchestrator reports to Sam with the signal record (this is the evidence Q100-S1 asks him to weigh) | HOST-NOT-QUIET |
| Window turns AMBER or RED mid-run | finish the run (correctness evidence is still valuable); exclude rounds by rule | timing bars "unjudged"; count bars judged (Q100k) |
| More than a third of rounds excluded | window INVALID for timing | timing bars unjudged; the run does not count toward T-RUNS for timing bars |
| Any of the above | an unjudged or INVALID-for-timing receipt is not a failed acceptance receipt for VA12 (Q100k), so noise never blocks a key and profile | |

Count bars (gaps, order violations, visible duplicates, every-position accounting, prefix enumeration, affected set, crash outcomes) are
judged in any window: host noise can make the system slower, never make a missing position present. This loosens no threshold; it
states which bars Q60e's "absolute bars" covers. Screening runs (Q99e) record their grade and never close an obligation.

### 6.4 The question for Sam

Q100-S1 (section 7): may NS acceptance windows of 1 to 3 hours pause his default colima VM, with the lab announcing each window in STATE
beforehand? Without it, acceptance waits for a GREEN window found by a passive recorder (R22's 7-day recording at 10 s also sets the
signal thresholds), which on this host may mean night hours or never.

## 7. Proposed rulings (rows for RULINGS-PENDING)

| Q | Ruling | Basis |
| --- | --- | --- |
| Q100a (orchestrator) | **Every candidate role of an NS run runs in its own hardened candidate container in the triplex2 VM:** the broker (source of truth, writer API, feed page service), the reader service and the feed consumer, each with the Q86a hardening set, its own cpuset and cgroup, and no Mac bind mount. No candidate role runs on the Mac during qualification. Every broker receipt measured on the Mac (P2Q, SQL01, INT-Q, P2B, R42) is design evidence for the VM placement and belongs to a different comparison series | Q86a; R44 2.1, 2.6 |
| Q100b (orchestrator) | **Durability in the VM.** Durable stores (broker, consumer) live on per-run Docker volumes on the VM's ext4 disk, never on tmpfs, overlay or a Mac mount; on Linux they refuse to start when the device or filesystem cannot flush (replacing the darwin-only `requireFullFsync`). Every receipt binds a durability class (process crash, VM crash, host power loss) with the measured flush path (device write cache, mount options, the Lima vz sync mode); receipts of different classes are never compared. Power-loss durability is not claimed in either placement. M1 to M7 of R44 2.5 run before any VM-placed P2 or P3 screening | R42 4.3; Q60c analog; R44 2.5 |
| Q100c (orchestrator; amends Q86c) | **The arm network's members** are the arm's candidate role containers, its trusted relay and its trusted NS driver. The driver listens on no port; the observer stays off the arm network. Preflight adds: no candidate reaches a listening port on the driver, no candidate mounts another container's state volume, and every container reports the same clock domain | Q86c; R44 2.1 |
| Q100d (orchestrator) | **The NS driver is trusted evaluator code** from the evaluator commit, running in its own container on the `tx2-box` image with its bundle on a read-only volume; it imports no candidate package and is the only producer of HR events. Candidate roles are reached only through the pinned `ns-sut/1` RPC with message caps. Contract 0.4.1 pins DRIVER_PIN {imageId, bundleSha256, generatorSha256} with generatorSha256 equal to the frozen trace's | Q82a; Q86a; R44 2.4, 5.1 |
| Q100e (orchestrator; refines Q55d, Q67d, Q98c; wording fix for NS.P3 and load-contract P3 commitTime) | **The trusted publication instant is an observer bracket, and the bar uses its conservative end.** For the broker source: L and U from the observer's inotify-woken read-only polls of `broker.db`'s marker; for XTDB as source: relay COMMIT forward instant and the earlier of the relay response and the observer's first sight of the tx id; for Datomic: the driver's send instant and the observer peer's first sight. Lag = U of the consumer record minus L of the source. The source's own instants (`watermarkAt`, `committed_at`, PublicationClock, the XTDB writer's instant, the Datomic client's instant) are CR cross-checks: outside `[L - 1 ms, U + 5 ms]` the run is INVALID. "Recorded by the source" in NS.P3 and `commitTime` in load-contract P3 read "read from the source's own store by the observer". No bar value changes | Q82a; R27 G3; R44 3 |
| Q100f (orchestrator) | **One clock domain per run:** `{boot id, time-namespace inode, CLOCK_MONOTONIC}`, recorded by every trusted and candidate process; claim.mjs refuses any timing comparison across domains. FD01's `openHostFeedClock` drops the hostname from its domain. Mac-side events carry no timing claim | R27 2.6; OBS01 round 4 (5.55 ms bridge); R44 3.4 |
| Q100g (orchestrator) | **The source prefix and the consumer's record are read by the observer, not reported by the candidate:** the final readback of `broker.db` by a pinned SQL01-schema normalizer, the consumer store's final readback and WAL tail by a pinned FD01-schema normalizer, both stdlib Python, hash-pinned, rerun by O-OBS. Contract 0.4.1 pins feed-entry/1, the canonical byte encoding of a feed entry, so the evaluator recomputes delivery digests | Q67d; Q82c; Q98f; R44 3.3, 4.2 |
| Q100h (orchestrator) | **Per-subject order is judged by range consistency of consumer transactions:** the frontier strictly increases across committed consumer transactions in WAL order, and every effect or affected key first inserted in a transaction lies between the previous and the new frontier. A missing WAL frame makes the order check NOT_ESTIMABLE and the run INVALID | TARGETS 1.1 P3 item 2; R44 4.2 |
| Q100i (orchestrator) | **A visible effect is an effects row inserted by a committed consumer transaction;** visible duplicates are committed insertions beyond the first per key over the whole run (a delete and reinsert counts), plus rows sharing a key in the final readback. Replay attempts are counted from redelivered digests and reported, never barred. An external-receiver effect (outbox delivery, GS.19b) is a later case with the receiver's dedup as the visible sink | TARGETS 1.1 P3 item 5; R44 4.2 |
| Q100j (orchestrator) | **Crash injection is a trusted kill after a hook handshake:** the consumer blocks at the scheduled point and reports it, the evaluator pauses the container, the observer records a DR snapshot, the evaluator SIGKILLs it and the observer proves the cgroup gone, then a new container resumes on the same volume. One fault-witness/1 per injection with the DR snapshots and the replay digest comparison; at least T-FAULT-REPS per point. Crash runs are separate from lag runs: the lag bar is judged on runs without injections; count bars and byte-exact resume on both. Named residual: for a consumer whose effects and checkpoint share one transaction, `before-effect` and `after-effect` are not distinguishable by DR, so the point label is CR while every outcome is DR | Q61j; CR-FAULT; R44 5.3 |
| Q100k (orchestrator; refines Q60e, Q99b) | **Windows for single-arm NS runs:** GREEN needs R22's pre-registered signal rules (hard rules unbroken, at most a third of rounds excluded) and sequential A/A rounds of equal burst phase on the same arm within R22's s_d limits, provisional until M01 calibrates a sequential limit. Timing bars are judged only in GREEN windows; count bars (gaps, order, duplicates, accounting, prefix, affected set, crash outcomes) in any window. Acceptance starts only after a GREEN pre-flight; three failed deferrals of 30 minutes stop with HOST-NOT-QUIET. An unjudged or timing-INVALID receipt is not a failed acceptance receipt under VA12. No threshold changes | Q60e; VA12; R22 4; R44 6 |
| Q100l (orchestrator) | **NS runs with 256 readers are single-arm on this VM.** A per-arm layout needs six CPUs (engine 2, broker 1, consumer 1, readers 1, trusted processes 1) and about 7 GiB, so a duet does not fit six CPUs and 11 GiB; Q86f's shared core per arm would put readers on the broker's core, which R42 measured at 227 ms commit p50. Comparative NS claims (duets against A0 or A/A duets) run only at reduced reader levels and stay DIAGNOSTIC for the 256-reader bars until the VM grows; absolute bars use Q99b and Q100k. The lab states this limit plainly | Q86f; Q99b; R42 3.2; SCOPE 3.2; R44 2.3 |
| Q100m (orchestrator; refines Q98h) | **The reader level is measured, not declared:** a P3 or P1 receipt claims 256 readers only if, in at least 99% of the window's seconds, at least 256 distinct driver loops completed a read, and the relay's concurrent upstream requests agree within 10% | Q98h; N01 6f67e0 label defect; R44 4.2 |
| Q100n (orchestrator; extends Q69a) | **A single-arm NS window parks two dev residents** (qlever-dev and lane D's by default, recreated fresh after), because the arm needs about 7 GiB of the 11 GiB pool; the window is announced in STATE and holds the Q60h lease | Q69a; Q60h; R44 2.3 |
| Q100o (orchestrator) | **Candidate state volumes are per run and private:** the source store is writable by the broker container only, the consumer store by the consumer container only, both readable by the observer; the driver's output volume is writable by the driver only. All three are exported by the trusted walker after the candidate containers are removed and are never mounted into another candidate container | Q86a; R28 4.4; R44 2.4 |
| Q100p (orchestrator; refines CR-NS goodput) | **P1 correctness over every read by key:** each read's answer hash is compared with O-REPLAY at the driver-recorded basis through a (subject, shape, basis) key map; above a cap of 2 million unique keys per run, all split reads plus a seeded sample are evaluated and the receipt states the evaluated share; goodput counts only reads whose key was evaluated equal, and any violation fails NS-P1-VIOLATIONS-MAX | CR-NS text; TARGETS 1.1 P1 item 4; R44 4.3 |
| Q100-S1 (waits for Sam; Q60's host half, restated) | **May NS acceptance windows of 1 to 3 hours pause Sam's default colima VM (4 vCPU) and other heavy host jobs,** announced in STATE beforehand? Without it, acceptance runs only in GREEN windows found by a passive recorder (Q100k), which on this host may be night hours or none; the lab will report HOST-NOT-QUIET records with their signals rather than unjudged numbers as met. R43 and R44 recommend yes for named windows | Q60; R43 6 item 2; R44 6 |

## 8. Build list with gates

Agent models follow the lab's memory rule: Codex builders at medium, Codex reviewers at high, Opus planners at high.

### 8.1 Probes first (one orchestrator-approved session in the VM, about 1 hour, one resident parked, no candidate code)

| Probe | Question | Pass |
| --- | --- | --- |
| V1 | M1 and M2: fdatasync and 10-row SQLite commit latency on a Docker volume; `write_cache`; ext4 options; the Lima 2.1.4 vz sync mode (source read on the web, read-only) | numbers and a durability class |
| V2 | Is a commit visible to a new read transaction only after the WAL sync with `synchronous=FULL`? (a test VFS or strace in a probe container showing the wal-index update after fdatasync returns) | ordering confirmed, or Q100e's bracket rule changes to use the inotify event as L |
| V3 | pub-watch cost: broker-shaped writer commit p99 with and without 0.25 ms read-only polling; checkpoint RESTART delay | p99 change under 5% |
| V4 | one clock: equal time-namespace inodes and a pipe ping between two containers within 50 us | as stated |
| V5 | inotify on a volume file written by another container | events delivered |
| V6 | relay throughput: the G03 byte-pipe relay and an R27 capturing relay at 256 closed-loop SPARQL readers on cpu 5 | relay is not the bottleneck (engine CPU saturates first) |
| V7 | memory of the per-arm layout at 1k with 256 readers | within 2.3's caps |

### 8.2 Builders and reviewers

| Id | Work | Base | Gates | Depends on |
| --- | --- | --- | --- | --- |
| B1 **EXP-NSR** (new) | Split the NS bench: trusted `lab/bench/ns-driver/` (trace offers, 256 reader loops, RYOW pulls, P4 pull loop, sweep driver, HR event writer with HMAC chunks, control stream, hiccup meter) importing no `packages/*`; candidate `packages/qualification/workloads/ns-sut.ts` roles broker, readers, consumer; the `ns-sut/1` schema; P3M's measurement code moved across | exp/P3M-bench-feed (or main after P3M merges) | static check: the driver bundle's import graph has no path under `packages/`; the same seed and trace through the split and through P3M's monolith on the Mac (DIAGNOSTIC) give equal accounting and equal feed contents; RPC fuzz and cap tests; P3M's planted-delay gates still pass; G0 | P3M |
| B2 **G03 round 5** | NS runner: `Box.service`, `Box.driver`, state and output volumes, observer start with volume mounts, preflight additions (Q100c), the step sequence of 5.2, raw event export, contract field proposals (`run.ns`, DRIVER_PIN, nsLayout, ns-sut/1, feed-entry/1) | exp/G03-executing-gate | P-TINY NS smoke in VM containers with an in-memory replica (no slot); then one exclusive slot run at 1k with all candidate roles boxed; isolation regressions for the new containers (a candidate tries the driver's output volume, another candidate's state volume, the Mac canary, the other arm, python3 and `lab/oracles`); offline results stay DIAGNOSTIC | B1, V1 to V7 |
| B3 **G03 round 6** | Fault injector of 5.3; fault-witness/1 writer; broker C2 crash points through the same path | round 5 | planted consumers: one that writes effects and checkpoint in separate transactions (duplicates counted after an `after-effect` kill); one that ignores the hook (FAULT-NOT-EXERCISED); a kill without cgroup proof (refused); 3 injections per point recorded | B2 |
| B4 **G03 round 7** | Single grant `admitExecutedAttempt`; `measure_pair` (M01 duet) and `measure_single` (sequential A/A); window grade in the receipt; noise VM agent in the observer | round 6, M01 rebase merged default-off | grant-audit tests for every route of round4/grant-audit.md; CX-PAIR0-* execute against admission; a RED window yields unjudged timing bars; an unjudged receipt does not trigger VA12 | B3, M01 |
| B5 **CR-NS builder (claim.mjs)** | Section 4: event schemas, the P3 recompute first, then P2, P1, P4, P5; refusal codes; F1 to F20 as CX fixtures; Q99b's A0-rung record instead of CONTROL-UNMATCHED | main (pure functions; no box needed) | every forgery refused with its code; recompute equals the bench's numbers on retained events of an offline run; exact nearest-rank quantiles; property tests for range consistency and duplicate counting | this note; can start now, parallel to B1 |
| B6 **OBS01 round 6** | VM-side volume watcher: inotify through ctypes, pub-watch for `broker.db` and the consumer store, WAL tail chunks, pinned normalizers for the SQL01 and FD01 schemas, clock-domain record, VM noise agent, cgroup-gone proofs for long-lived containers | exp/OBS01-observer | planted delays of 100, 249, 251 and 400 ms bracketed within 1 ms; planted early and late CR stamps flagged (F20); a rewritten WAL frame detected (F11); V3's overhead bound met; normalizer reruns by O-OBS match | V1 to V5 |
| B7 FD01 fixes (small; may fold into B1) | clock domain without hostname (Q100f); durable-flush refusal on Linux for the consumer store and broker (Q100b) | exp/FD01-feed-contract | FD01 clock tests with two hostnames on one kernel; refusal on tmpfs | none |
| R1 reviews | one Codex high reviewer per builder round; one Opus reviewer of B5's forgery list against section 4.4, with the code and not this note's conclusions | | ACCEPT | each |

### 8.3 Effect on R43's chain

R43 step 6 (G03 rounds 5 to 7) now depends on B1 as well as this note. B1 and the M01 rebase (R43 step 5) run in parallel, both about two
rounds, so the longest chain grows by at most one round (to about 13, range 12 to 17). B5 and B6 run beside B1 to B4 and join at 0.4.1,
as R43 placed steps 7 and 8. V1 to V7 take about one slot hour in a parallel window.

## 9. Open questions and residual risks

| # | Item | Why it stays | Control |
| --- | --- | --- | --- |
| 1 | The VZ disk sync mode may make guest flushes non-durable across host power loss `[E]` | Lima's choice; the lab will not change VM settings without the orchestrator | V1, V2 record the class; Q100b keeps classes apart; power loss is not claimed |
| 2 | `after-effect` crashes are DR-indistinguishable from `before-effect` for one-transaction consumers | atomicity removes the observable difference | outcomes are DR; label is CR; optional strengthening: a small consumer `cache_size` so effect pages spill to the WAL as uncommitted frames, which the WAL tail can see |
| 3 | The driver parses candidate RPC bytes and sits on the arm network | trusted code must read answers | strict schema, caps, no egress, no Docker socket, HMAC-chained output |
| 4 | Sequential A/A is not the duet A/A R22 calibrated | duets do not fit (Q100l) | provisional limits; M01's A/A duet run calibrates a sequential limit at reduced readers |
| 5 | Observer polling on the trusted core can delay the driver | one shared core for trusted processes | hiccup meters; any delay inflates measured latency and lag, never deflates it |
| 6 | O-DOMAIN over every position of a 20-minute trace is untested at that size (R43 3.5 item 4) | stdlib Python | B5 runs it offline on the retained E3 of a screening run first |
| 7 | R27's R12 (same-user reads of the run key on the Mac) | one macOS user | unchanged; acceptance repeats collection by the verifier (Q82c) |
| 8 | P4 and P5 on H1 need reads served by the broker container (R43-c, Q99c), which this layout puts on the broker's single core | not on the P3 path | QH1 decides whether the broker container gets a second core for its reader threads or a separate H1 read container with a shared volume |
| 9 | Q86g's H1 and H2 (VM mounts and egress) remain unapplied | waits for Sam | R1, R4, D1 to D3, L1, N1 to N4 stay on the named list |

## 10. Sources read

| Source | What it gave |
| --- | --- |
| lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (sections 1, 1.1, 2, 4.1, 6) | priorities, P3 measurement semantics, crash points, reader load |
| lab/acceptance/RULINGS-PENDING.md (Q86g, Q89 to Q99), RULINGS.md (Q31c, Q55d, Q60a to i, Q67a to g, Q69a, Q82a to e, Q84a, Q86a to f) | constraints |
| lab/acceptance/ACCEPTANCE.md (CR-NS, CR-FAULT, fault-witness, ns-run, NS thresholds, VA12), obligations.json (NS.P3), load-contract.json (measurements.P3, windows) | contract text |
| lab/research/R43 (sections 0 to 3, 5.3, 7), R28 (sections 0, 1, 4, 6 to 10), R42 (sections 1 to 4), R27 (sections 2.5, 2.6, 3, G3, H7), R22 (sections 4 and 7) | the chain, isolation, broker durability, observation sources, noise grading |
| lab/experiments/EXP-P3M/BRIEF.md | P3M's measurement plan |
| .claude/worktrees/fd01 packages/host/src/feed/{PublicationClock,ConsumerStore,BrokerReader,Adapters}.ts | publication clock, consumer store, crash hooks |
| .claude/worktrees/g03 lab/bin/{box.mjs, box-engine.mjs}, lab/experiments/EXP-G03/REPORT.md, round4/grant-audit.md | the executor and its open items |
| .claude/worktrees/m01r (exp/M01-rebase) commit 45a6fd40 file list | PAIR-0 pieces |
| .claude/worktrees/p2b packages/broker/src/sqlite-worker.ts | broker schema (marker, frames) |
| .claude/worktrees/obs01 lab/experiments/EXP-OBS01/REPORT.md | clock bridge uncertainty |
| lab/bin/{claim.mjs, gate.mjs}, lab/bench/lib/triplex.ts, lab/config/slots.json, lab/STATE.md | evaluator stubs, gateNS, bench imports, VM budget, host state |
