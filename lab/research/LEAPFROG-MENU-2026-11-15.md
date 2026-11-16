# LEAPFROG menu: ways to reach the P2 bars on Datomic, and the path to 100,000 subjects

Written 2026-11-15 by the LEAPFROG research agent (Fable 5.2), for Sam and the orchestrator. Read-only work. Nothing was built,
run in Docker, committed or changed in the repository. The only files written are this one and `SUMMARY.md` beside it.

**Start here.** Section 1.3 holds six findings computed from the records of the three quiet pairs (C, A, F). They change what
the P2 gap is made of. Section 4 is the ranked shortlist with a builder brief for each pick.

**How claims are tagged.**

| Tag | Meaning |
| --- | --- |
| [M] | Measured by an earlier agent; the file is named |
| [C] | Computed by this agent from the retained records; the script is in Appendix A |
| [R] | Read in the code; file and function named |
| [I] | Inferred; not measured and not read |
| [W] | Outside source; link in Appendix B |

Paths starting with `lab/` or `packages/` are in the worktree `~/projects/triplex-db-2/.claude/worktrees/dx-t1`
unless another worktree is named. `evidence/` means `~/Claude/Projects/triplex-db-2/evidence/`.

---

## 1. The situation in one page

### 1.1 Where each bar stands at 10,000 subjects (pairs C, A, F, quiet Mac)

| Priority | Bar | Pairs C / A / F | Verdict |
| --- | --- | --- | --- |
| P1 reads | read p99 at 256 readers at most 100 ms | 6.8 / 6.3 / 6.3 ms | pass |
| P1 scaling | 256 against 64 at least 1.0; 1,024 against 256 at least 0.9 | 1.017, 0.9975, 1.016; 1.12, 1.21, 1.19 | pass in two of three |
| P1 writer ratios | commit p99 ratio at most 1.25 (256) and 2 (1,024) | 1.13, 0.34, 3.39; 3.73, 1.31, 2.50 | moves between pass and miss |
| P1 recovery | back inside the 256 bar within 60 s | 35 s, miss, miss | moves between pass and miss |
| P2 all commits | p99 at most 50 ms | 55.6 / 71.0 / 67.2 ms | miss |
| P2 at 256 readers | p50 at most 10 ms, 5 to 10 facts | 11.4 / 11.6 / 12.2 ms | miss |
| P2 at 256 readers | p50 at most 10 ms, 11 to 25 facts | 13.6 / 14.7 / 13.1 ms | miss |
| P2 bursts | p50 at most 10 ms, small / medium | 9.8, 9.7, 9.7 / 12.1, 11.8, 11.8 ms | pass / miss |
| P3 feed | lag p99 at most 250 ms | 46 / 18 / 77 ms | pass |
| P4 current path | at least 4,400 pulls/s on the whole machine; flatness at most 1.1 | 16,521 / 19,073 / 18,172; 1.02 to 1.05 | pass |
| P5 activation | 100 s at 100,000 subjects with live traffic | 4.1 s at 10,000; no valid live result at 100,000 | open |

Source: `lab/experiments/EXP-DX1/t1/VERDICT-9.md` [M]. Oracle PASS in every loaded arm.

### 1.2 What one commit is made of

Medians for a 5 to 10 fact commit in pair F's loaded arm, taken from the per-phase tables of
`lab/experiments/EXP-DX1/t1/runs/tx2-dxt1-p9-final-a-ladder/TRACE-REPORT.md` [M]. The first number is a burst commit (55 per
second). The number in brackets is a commit in the 256-reader window (about one per second). Quantiles of parts do not add up to
the whole.

```
 NODE WRITER (VM CPU 3)         WRITE GATEWAY JVM (CPU 2)        TRANSACTOR JVM (CPU 0)                POSTGRES (CPU 1)
 ----------------------         -------------------------        ----------------------                ----------------
 offer timer fires late
   0.66 (0.45)
 stage, validate, encode
   1.80 (2.89)
        ---- HTTP + JSON, 0.48 (0.65) both ways ---->
                                parse body, build tx data
                                  0.76 (1.34)
                                        ---- Artemis + TLS, about 0.85 ---->
                                                                 reader -> processor (one at a time)
                                                                 apply 1.3, of which our commit
                                                                   function 0.8
                                                                 serialise twice (log, notification)
                                                                 writer: INSERT tail chunk  ------->   commit, WAL flush
                                                                         UPDATE tail pointer ------>   commit, WAL flush
                                                                 plus per commit, amortised:
                                                                   0.24 tail resets, 0.7 log-tree inserts
                                        <--- Artemis + TLS, about 0.87 -----
                                peer applies the new data,
                                answers the HTTP request
        <---------------------------------------------
 settle receipt, hand it to the caller            <== "published ACK" as TARGETS defines it
 benchmark model bookkeeping 0.41                 <== where the benchmark stops the clock today

 whole commit 8.80 (12.34)       peer wait 4.22 (6.65) = transactor about 3.5 + the two legs about 1.7
```

The transactor split (3.5 ms inside, 0.85 and 0.87 ms for the legs) is from `t1/CORES-6.md` [M]. The apply and function times are
from `t1/SLIM-8.md` and `t1/NATIVE-8.md` [M]. The storage pattern is from
`.claude/worktrees/dx-re1/lab/experiments/EXP-DX1/re1/TRANSACTOR-NOTES.md` [M].

### 1.3 Six findings from the existing records that change the picture

Each finding below was computed for this menu from `driver/ns-writes.jsonl` and `driver/ns-report.json` of the three quiet
pairs under `evidence/DX-T1/tx2-dxt1-{p7-closing-a,p8-final-a,p9-final-a}-{zero,ladder}/` [C], or read from the per-phase
tables in each run's `TRACE-REPORT.md` [M].

#### Finding 1. The "256 readers" median miss is an idle penalty. It appears with zero readers too.

**The zero-reader arm misses the same bar in the same window.** The zero-reader arm runs the same trace with no readers. Its
commits in the 256-reader time window are as slow as the loaded arm's.

| Pair | Zero-reader arm, small / medium p50 | Loaded arm (256 readers), small / medium p50 |
| --- | --- | --- |
| C | 11.69 / 15.09 ms | 11.21 / 13.83 ms |
| A | 11.33 / 14.65 ms | 11.37 / 14.92 ms |
| F | 12.24 / 12.89 ms | 12.19 / 13.78 ms |

Each cell rests on 33 small-band and 16 medium-band commits [C]. The per-layer medians agree. In pair F the zero-reader arm's
window reads peer wait 6.43, gateway 1.19, TypeScript 2.38 ms, and the loaded arm reads 6.65, 1.34, 2.89 ms [M].

**What sets the cost is how long the commit path was idle before the commit started.** Service time is latency minus queue wait.
Idle gap is the time between the previous commit's finish and this commit's start.

| Idle gap before the commit | Small band p50, six arms | Medium band p50, six arms |
| --- | --- | --- |
| under 50 ms | 7.4 to 8.0 ms | 9.6 to 10.1 ms |
| 50 to 100 ms | 8.1 to 8.8 ms | 10.4 to 10.9 ms |
| 100 to 250 ms | 9.3 to 10.3 ms | 11.3 to 12.4 ms |
| 250 to 1,000 ms | 10.3 to 11.3 ms | 12.8 to 13.6 ms |
| another commit still in flight | 9.5 to 10.8 ms | 11.4 to 13.2 ms |

Every one of the six arms (three pairs, zero and loaded) shows the same curve [C]. A commit that starts on a warm path costs
7.4 to 8.0 ms. The same commit after a quarter second of idleness costs 2.6 to 3.8 ms more. In the 256-reader window commits
arrive about one per second, so every one of them pays the penalty. All layers slow down together. In pair F peer wait goes
from 4.22 to 6.65 ms, the gateway from 0.76 to 1.34, TypeScript from 1.80 to 2.89, the network from 0.48 to 0.65 [M].

**The cause of the idle penalty is not known.** The earlier notes saw it ("a sparse commit still costs 13.6 ms against 7 to 9 ms
dense", `lab/experiments/EXP-DX1/STATUS.md` in `d-native`, 2026-11-11 07:15) and left it unassigned. Candidates are in item 7.

#### Finding 2. About 1.0 to 1.1 ms of every measured commit is the benchmark's own apparatus.

1. **The offer timer fires 0.60 to 0.69 ms late at the median** [C]. `lab/bench/lib/scheduler.ts` arms
   `setTimeout(this.tick, upcoming.scheduledAt - now)` [R]. Node truncates the delay to whole milliseconds and treats anything
   under 1 as 1 [W1]. Latency is counted from the scheduled time, so the lateness is charged to the store.
2. **The clock stops 0.41 ms after the ACK is published** [C]. In `lab/bench/driver.ts` (`executeTraced`) the receipt is published
   at `out.ackPublishedAt`, then `modelWriter.bindReceipt`, `modelWriter.addCommit`, the oracle record and the read-your-own-write
   dispatch run, and only then does the scheduler take `finishedAt` [R]. `lab/TARGETS.md` 1.1 defines P2 latency as running
   "to the published ACK".

With both removed, the same three pairs read as follows [C].

| Measure (ms, as measured → corrected) | C | A | F | Bar |
| --- | --- | --- | --- | --- |
| Small burst p50 | 9.79 → 8.51 | 9.61 → 8.34 | 9.61 → 8.52 | 10 |
| Medium burst p50 | 12.08 → 10.43 | 11.72 → 10.22 | 11.80 → 10.42 | 10 |
| Small at 256 readers p50 | 11.21 → 9.46 | 11.37 → 9.83 | 12.19 → 11.03 | 10 |
| Medium at 256 readers p50 | 13.83 → 12.20 | 14.92 → 13.20 | 13.78 → 12.22 | 10 |
| All-commit p99 | 55.6 → 50.6 | 71.0 → 67.0 | 67.2 → 62.0 | 50 |

These window medians differ from `VERDICT-9.md` by up to 0.6 ms because the verdict trims each window before it computes them.

#### Finding 3. In every arm, 15 to 18 of the slow commits come from the benchmark's history-growth step.

**The all-commit p99 bar allows 74 commits over 50 ms out of 7,408.** The counts by phase type [C]:

| Pair and arm | Over 50 ms | In the two burst phases | In the two growth phases | In sparse phases |
| --- | --- | --- | --- | --- |
| C zero readers | 91 | 69 | 18 | 4 |
| C loaded | 96 | 68 | 16 | 12 |
| A zero readers | 69 | 47 | 15 | 7 |
| A loaded | 144 | 101 | 15 | 28 |
| F zero readers | 70 | 49 | 15 | 6 |
| F loaded | 131 | 77 | 17 | 37 |

**The growth phases are the benchmark writing history for the P4 flatness test.** `growHistory` in `lab/bench/driver.ts` sends
commands of `seedBatchFacts / 4` subjects each. With `--seed-batch-facts 2000` that is 500 subjects in one Datomic transaction
[R]. Each takes 0.7 to 1.1 s on the transactor, which applies one transaction at a time. The 20 live commits scheduled during
those phases wait behind them, and their median is 88 to 280 ms [C]. Their largest span is peer wait, so the tail tables count
them with the commits that wait on the durable log write [I]. They wait on the benchmark's own bulk transactions.

#### Finding 4. With readers running, slow commits appear in quiet windows that are clean in the zero-reader arm.

**Sparse phases hold 4 to 7 slow commits with zero readers and 12 to 37 with readers** (table above) [C]. This happens even in
phases with a single reader (pair F: 7 in `p4mix`, 4 in `p4h3`). The readers do not touch the engine (local share 0.9995 and
higher), so the cause is something that only the loaded arm does.

**One candidate fits the traces. The benchmark's files share the database's virtual disk** [I, resting on these facts].

1. The driver container writes to the Docker volume `<tag>-driver` (`driver-container.json` in each run folder) [R]. The
   Postgres volume and the driver volume both live under `/var/lib/docker` on `/dev/vdb1` (`t1/STORAGE-9.md`) [M].
2. With readers running the driver spills exact read observations to that volume (19.8 million model reads in pair F), and it
   keeps two SQLite stores there that sync on every write, the publication witness (`PRAGMA synchronous=FULL`,
   `lab/bench/lib/legacy-publication.ts`) and the feed consumer's checkpoint (`consumer.db`, `lab/bench/lib/feed.ts`) [R].
3. Lima attaches the disk in Virtualization's `fsync` mode (R4), which syncs the disk image file on a guest flush [W2]. A sync
   of one file covers everything written to it, so every WAL flush pays for whatever any guest process has written to that
   disk since the last flush [I].
4. The slow examples in `t1/STORAGE-9.md` show that shape. Postgres waits in `IO:WalSync`, guest flushes take 123 to
   353 ms, and the witness's own storage reaches 118 ms in the same run (`t1/TAIL-9.md`) [M].

**Two other things only the loaded arm does** are reader threads busy on four cores and a larger heap on the writer thread.
The one-reader phases argue against the first. Item 16 addresses the second, and the diagnostic in item 19 separates the disk
from both.

#### Finding 5. No checkpoint runs during an arm, so about 14 WAL segments are created on the commit path.

Each arm writes 231 MB of WAL (`storage-census.jsonl`: `wal_bytes` 230,965,822 loaded, 230,754,456 zero) with zero timed
checkpoints [M]. `checkpoint_timeout` is 30 minutes and `min_wal_size` is the default, so no segment is recycled during a
15-minute arm [R: `lab/experiments/EXP-DX1/h4/run.sh`]. Every 16 MB of WAL, some backend creates a new segment. It writes 16 MB
of zeros and syncs it, inside a commit [W3]. `t1/STORAGE-9.md` notes that "some smaller slow requests do coincide with a
segment transition" [M].

#### Finding 6. Several bars are computed from too few commits to give a stable answer.

1. **P1 writer ratios use 46 commits per window, so "p99" is the largest of 46.** With 0.9% to 1.9% of commits over 50 ms, the
   chance that a window holds at least one is 35% to 59% [C]. The three pairs read 1.13, 0.34 and 3.39 at 256 readers on the
   same configuration.
2. **The 256-reader medians use 33 and 16 commits.**
3. **The recovery bar uses 30-second windows of about 33 commits each.**

### 1.4 The four facts that most constrain the answer

1. **A warm, uncontended commit already costs 7.4 to 8.0 ms (small) and 9.6 to 10.1 ms (medium).** The misses come from three
   additions, which are the idle penalty (2.6 to 3.8 ms), the benchmark's apparatus (1.0 to 1.1 ms), and the cost per fact
   (0.2 ms per fact, of which about half is outside the engine).
2. **The transactor applies and logs one transaction at a time, with two Postgres commits per log write** (about 3.1 with
   resets). Anything large or slow in front of a live commit delays it, and every flush is a chance to meet a stall.
3. **One command writes each fact more than twice.** A commit of N facts stores N fact rows, N change rows and about 6
   journal rows, 26 + 2N datoms in all, and about 17 KB of text for the average command (`t1/BYTES-5.md`, `t1/NATIVE-8.md`)
   [M]. A change row repeats the whole fact inside a JSON value, so it is larger than the fact row it describes [R:
   `packages/core/src/store/transactionMetadata.ts`].
4. **Reads no longer reach the engine.** Exact local reads answer 99.95% and more of reads. The engine's remaining jobs are the
   serial commit decision, durability, the feed, bootstrap and rare fallback reads. Its stored layout can be chosen for writes.

---

## 2. The menu

**34 candidates in six groups, structural ones first.** Section 2b holds nine more that need Sam's decision first. Every
candidate has the same seven parts. They are the statement, what it moves and by how much, the mechanism in this code, the
evidence, what could fail and what it risks, the cheapest experiment, and what it depends on or conflicts with. "Hours" are
hours of one Codex builder at max effort, including a quiet-host measurement where one is needed.

**All gains are per commit at the median unless stated.** The three references used in the arithmetic:

1. A warm small commit costs 7.4 to 8.0 ms; a warm medium commit 9.6 to 10.1 ms (Finding 1).
2. Commit time grows 0.1 ms per datom, of which 0.045 ms is peer wait. The readings are 10.64, 12.64 and 16.72 ms at 41, 61
   and 101 datoms (`t1/NATIVE-8.md`) [M].
3. The all-commit p99 bar allows 74 commits over 50 ms per arm.

### Index

| # | Candidate | Moves | Expected | First experiment |
| --- | --- | --- | --- | --- |
| 1 | One Postgres commit per log write | P2 median and tail | 0.5 to 0.8 ms; half the flush waits | 2 h |
| 2 | Commit endpoint inside the transactor | P2 median | 1.0 to 1.5 ms | 3 h |
| 3 | Journal rows packed into one datom | P2 medium band, 100k, storage | 1.3 to 2.3 ms if cost follows datoms | 4 h |
| 4 | Rows without the commit's own metadata | P2 median | 0.3 to 0.5 ms | 3 h |
| 5 | Row-id uniqueness without the history scan | P2 tail, 100k | function 0.8 to 0.4 ms; apply p99 down | 2 h |
| 6 | Commit function reads only its subject | 100k | fewer cold reads per commit | 3 h |
| 7 | Keep the commit path warm | P2 at 256 readers | 2.6 to 3.8 ms on idle commits | 4 h |
| 8 | Straight-line commit path in TypeScript | P2 median | 0.6 to 1.0 ms | 2 h |
| 9 | Binary commit frame, decoded once | P2 median | 0.3 to 0.5 ms | 2 h |
| 10 | Group commit above the engine | bursts, 100k | small at 10k | 1 h |
| 11 | Bulk lane that yields to live commits | P2 p99, P5 | 15 to 18 slow commits per arm | 1 h |
| 12 | Read-your-own-write from the receipt | P2 no-wait read | wait 2.6 ms to 0 | 3 h |
| 13 | One commit for a subject's queued commands | tail chains | small at 10k | 1 h |
| 14 | Transactor on two cores, shared with the write gateway | P2 median | 0.7 ms, no read loss | 2 h |
| 15 | Six-CPU VM on the performance cores | all medians, drift | unknown | 3 h |
| 16 | Commit thread with no benchmark state | P2 p99, P1 ratios | 5 to 15 slow commits per arm | 4 h |
| 17 | Loopback or unix sockets between containers | P2 median | 0.2 to 0.4 ms | 2 h |
| 18 | Thin write gateway JVM | tail | gateway pauses | 1 h |
| 19 | Benchmark files off the database disk | P2 p99, P1 ratios | 5 to 75 slow commits per loaded arm | 2 h |
| 20 | WAL segments created before the window | P2 p99 | about 14 stalls per arm | 1 h |
| 21 | Postgres and transactor as one unit | P2 median, safety | 0.1 to 0.2 ms | 1 h |
| 22 | WAL-in-memory arm and a disk sentinel | attribution | decides 19, 7 and a question for Sam | 3 h |
| 23 | Free the Mac's disk or use an external SSD | tail, refused runs | unknown | Sam |
| 24 | Offer timer with sub-millisecond accuracy | every P2 median | 0.60 to 0.69 ms | 1 h |
| 25 | Stop the clock at the published ACK | every P2 number | 0.41 ms | 0.5 h |
| 26 | Verdicts that rest on enough commits | P1 ratios, recovery, 256 medians | stable answers | 1 h |
| 27 | Service time by idle gap in every report | visibility | none | 1 h |
| 28 | Short interleaved arms, host gate, oracle off the window | all verdicts | less drift | 3 h |
| 29 | First real reading at 100,000 with reads per commit | H5, P5 | decides 5, 6, 10, 30 | 4 h |
| 30 | Transaction hints at 100,000 | 100k commits | unknown | 1 h |
| 31 | A local replica that fits 100,000 | P1, P4, P5 at 100k | memory | 4 h |
| 32 | Seed transcoder | makes layout changes affordable | hours, not a day | 4 h |
| 33 | Activation published in paced ordinary commits | P5 | live ratio under 1.5 | 3 h |
| 34 | Claim folded into the transaction entity | P2 median | 3 datoms | 1 h |

### 2A. Structural changes to the commit path

#### 1. One Postgres commit per log write

**Statement.** Put a thin JDBC wrapper under the transactor that sends Datomic's tail-chunk INSERT and tail-pointer UPDATE as
one Postgres transaction, so a commit waits for one WAL flush where it waits for two today.

- **Moves.** H1, H4, H6. Median 0.5 to 0.8 ms on warm commits, more on idle and overlapping commits. Flush waits on a commit's
  own path fall from about 2.5 to about 1.2.
  - RE1 measured 0.46 ms at p50 between the INSERT and the UPDATE and 1.07 ms for the UPDATE. One transaction removes the
    INSERT's own round trip and flush.
  - A commit that overlaps another costs 2 to 3 ms more than a warm one (Finding 1). Part of that is waiting for the other's
    serial log write, which gets shorter.
- **Mechanism.**
  1. `sql-driver-class` and `sql-url` are transactor properties (`config/template.properties`; written by the Python block in
     `lab/experiments/EXP-DX1/stack/up.sh`). The stack already loads our code into the transactor through
     `DATOMIC_EXT_CLASSPATH`.
  2. The wrapper delegates to the Postgres driver. It holds an `insert into datomic_kvs (id, map, val)` made on a thread and
     reports it done. If the next statement on that thread is `update datomic_kvs set rev=?, map=? where id=? and rev=?`, both
     go out in one transaction on one connection. Any other statement, or 1 ms without one, sends the held INSERT alone first.
     A `select` for a held id is answered from the held value.
  3. Datomic's log append runs the two statements back to back on one send-off thread (`KVCluster.update_pod_STAR_`, RE1 step
     12), so the pairing holds there. Index and log-tree segment INSERTs come from other threads and pass through.
- **Evidence.**
  - RE1 `TRANSACTOR-NOTES.md`, step 12 and "The durable write, in numbers" [M].
  - The Postgres log of `evidence/DX-T1/tx2-dxt1-cost-a-2-full` holds 14,397 segment INSERTs, 6,523 pointer UPDATEs and 8
    pointer INSERTs [C]. The statement shapes are that regular.
  - R42 measured a real full sync on this Mac at p50 3.0 to 3.1 ms (`lab/research/R42-p2-broker-latency.md`) [M]. With honest
    power-loss durability, three flushes cost about 9 ms and one costs about 3. One flush per commit is what makes honest
    durability affordable later.
- **Could fail, and risks.**
  - The wrapper sits under the durability floor. It keeps today's guarantee (the UPDATE's commit makes both rows durable and
    the acknowledgement follows it) and makes the pair atomic, which is stronger than today.
  - If Datomic sometimes runs the pair on two threads, the 1 ms rule sends them separately and nothing is gained.
  - It is not supported by the vendor and must be re-checked on every Datomic upgrade.
- **Cheapest experiment (2 h).** A measurement-only probe with no Java. A Postgres trigger `BEFORE INSERT ON datomic_kvs ... WHEN
  (NEW.rev IS NULL)` that runs `set_config('synchronous_commit','off',true)` makes segment INSERTs commit without their own
  flush, because the setting in effect at commit decides [W4]. The UPDATE that follows stays synchronous and flushes the WAL up
  to its own record, which lies after the INSERT's. Run an ABA zero-reader arm of 200 s.
  - **Deciding numbers.** Peer wait p50 falls at least 0.4 ms beyond drift, and commits over 50 ms fall.
  - The probe is not a verdict configuration. If Postgres alone crashes and the transactor keeps running, the transactor can
    point at a chunk that was lost. The wrapper has no such window.
- **Depends on, conflicts with.** Independent of the layout items. N2 (durable watermark) goes further on the same idea.

#### 2. A commit endpoint inside the transactor process

**Statement.** Accept commits in the transactor's own JVM and answer from its durable point, so a commit no longer crosses the
peer connection twice.

- **Moves.** H1 direction d, H2. Median 1.0 to 1.5 ms. The two legs measure 0.85 and 0.87 ms at p50, and one process hop goes
  away. It also frees the write gateway's core (item 14).
- **Mechanism.**
  1. Our code already runs inside the transactor. The commit function's namespaces load from `/opt/gateway/src`, and
     `-Ddatomic.metricsCallback=triplex.gateway.native-settings/metrics` in `stack/up.sh` already starts a callback of ours
     there.
  2. **Step A, the acknowledgement leg only, no internals.** A logback appender on logger `datomic.transaction` receives the
     `:tx/process` event, which the writer thread emits after the durable write and before the peers are told (RE1 step 13).
     The appender completes a local promise and a small socket answers the client. The commit function leaves the assigned
     position and clock under the operation id so the answer can carry them.
  3. **Step B, both legs.** An HTTP listener in the transactor JVM builds the same `[[:triplex/commit payload]]` and submits it
     through a peer connection opened inside that JVM, or straight onto the processor's input queue that RE1 names
     (`unprocessed-updates-queue`).
  4. Gateways still receive every transaction through Datomic's normal notification, so the read gateway, the feed and the
     local replica do not change.
- **Evidence.** `t1/CORES-6.md` native medians: peer wait 5.67 = inside the transactor 3.49 to 3.52 + submit 0.85 to 0.88 + ack
  0.87 to 0.88 ms [M]. Gateway before and after the peer: 0.84 + 0.20 ms (`t1/ANATOMY-a.md`) [M].
- **Could fail, and risks.**
  - Step B's direct queue uses reverse-engineered internals and can break on an upgrade.
  - The acknowledgement would arrive before the write gateway's peer has applied the transaction, so read-your-own-write must
    come from the receipt (item 12).
  - A fault in the listener could stall the transactor.
- **Cheapest experiment (3 h).** Measure the legs without building anything: timestamps at the gateway before
  `transact-async`, at commit function entry (already instrumented, `commit.clj` `instrument-code`), at the `:tx/process` event
  through an in-memory appender, and at future delivery, all on the VM's monotonic clock, in a quiet untraced arm.
  - **Deciding number.** Send plus acknowledgement legs at p50. Build step A only if the sum is at least 1.2 ms.
- **Depends on, conflicts with.** Needs item 12. Moves item 9's parsing into the transactor JVM, which then wants item 14's
  second core.

#### 3. Journal rows packed into one datom per commit

**Statement.** Store a commit's journal rows (position, instant, actor, command id, changed entities, one change per fact) as
one packed value on the transaction entity, in place of N + 6 separately indexed row datoms.

- **Moves.** H10, H1, H5 and the storage guard metric. Datoms per commit go from 26 + 2N to about 20 + N, which is 41 to 28
  (small), 61 to 38 (medium), 101 to 58 (large).
  - If cost follows datom count, the 0.1 ms per datom slope gives 1.3 ms (small), 2.3 ms (medium), 4.3 ms (large).
  - If cost follows bytes, the gain is smaller, because log bytes stay the same and index bytes fall by about a third.
- **Mechanism.**
  1. Today each journal row is a `:triplex/assert` op on the `_tx/...` entity (`storage.clj`, `tx-data`). Each one pays a
     history index scan in `identity-row`, a JSON parse and re-encode in `assign-row` when the server assigns the clock, three
     sorted-index inserts of a string of about 430 bytes on average, and two serialisations (`commit.clj`; RE1 "per datom").
  2. A new attribute `:triplex.entity/rows` (string, no value index) holds the journal's row texts with length prefixes.
     `journal.clj` (`page`, `build-entity`), `lean.clj` (`rows`) and the adapter's `/v2/db/{db}/journal` route split it. Fact
     rows keep today's layout.
  3. It is a new rows-version, so it needs new seeds (item 32).
- **Evidence.**
  - `t1/BYTES-5.md`: 39.4 row datoms per transaction, of which about 16 are fact rows [M + C].
  - RE1: the apply averages 203 AVET node visits per commit against 20 EAVT and 10 AEVT [M].
  - The 100,000 seed holds 124.8 million current row datoms for 44.5 million reachable fact occurrences (`STATUS.md`,
    2026-11-12 00:40) [M]. Most stored rows are journal rows, so this also answers Sam's storage question of 2026-11-10.
- **Could fail, and risks.**
  - A by-id read of a journal row loses its index route and needs the transaction id, which the adapter has.
  - Sam's Q107-S ruling says change rows "stay stored and queryable as ordinary triples". Here they stay stored and every
    Triplex route returns them unchanged. A raw Datomic query would see one packed value where it saw N row texts. It could not
    match inside row texts before either. N1 in section 2b puts the stronger variant to Sam.
  - `t1/SLIM-8.md` rejected per-row compression. That test added CPU at the serial point and kept every datom, so it does not
    predict this one.
- **Cheapest experiment (4 h).** An offline replay on a peer with `d/with`, which runs the transactor's own apply code (RE1,
  `WRITE-BETTER.md` 3.5). Replay 300 recorded commit payloads against a copy of the 10,000 seed in three shapes: today's;
  journal packed; journal packed and fact rows without a value index.
  - **Deciding numbers.** Apply time and `:tx-stats` per shape and band. Go if the medium band's apply falls by at least 30%.
  - No seed rebuild and no stack are needed.
- **Depends on, conflicts with.** Item 32 for seeds. Pairs with 4, 5 and 34. N1 supersedes it if Sam agrees.

#### 4. Rows that do not carry the commit's own metadata

**Statement.** Stop writing record time, position and transaction id into every row text, and read them from the row's
transaction at read time.

- **Moves.** H10, H6. Median 0.3 to 0.5 ms at the serial point, and 60 to 80 bytes less per row.
- **Mechanism.**
  1. `assign-row` in `commit.clj` parses and re-encodes every row's JSON with `clojure.data.json` on the processor thread to
     put the server's clock in. `replace-value` patches the 16-digit position by substring.
  2. Every Datomic datom carries its transaction, and the transaction entity already holds `:triplex.tx/position`,
     `:triplex.tx/recorded-at` and `:triplex.tx/id`. Readers (`reach.clj`, `lean.clj`, `journal.clj`, the replica's
     `decodeRows.ts`) join through it with a small cache per transaction.
  3. Rows imported with explicit record times in non-strict scopes keep the column.
  4. **4a, no layout change.** Splice the clock into the JSON text at its column by scanning commas, without a parse. Readers
     already accept the server's number spelling.
- **Evidence.** Server-assigned record time costs 0.42 ms at the zero-reader median (`t1/REPORT-5.md`) [M]. The commit function
  runs 0.79 ms at p50 (`t1/SLIM-8.md`) [M].
- **Could fail, and risks.** Several journals in one physical commit have different positions, so a row needs its journal's
  ordinal. Record-time reads then depend on the join being exact. All but 4a is a layout change.
- **Cheapest experiment (3 h).** Build 4a behind a flag and run an ABA zero-reader arm at 1,000 subjects at full trace level,
  where the function's time is reported.
  - **Deciding number.** The function's p50 falls from 0.79 to 0.5 ms or less.
- **Depends on, conflicts with.** Item 3 removes the change rows, whose nested JSON holds a second clock and is the hard case
  for the splice.

#### 5. Row-id uniqueness without the history scan

**Statement.** Prove that a new row id was never used by comparing it with a high-water mark kept on the latest commit, and
scan the history index only for ids at or below the mark.

- **Moves.** H6, H10, H5. Function p50 from 0.8 to about 0.4 ms, apply p99 from 14.7 to about 8 ms, and more at 100,000 where
  the history index no longer fits the cache.
- **Mechanism.**
  1. `identity-row` in `commit.clj` runs `d/index-range` over `(d/history db)` on `:triplex.entity/row` for every asserted row.
  2. Row ids come from `monotonicFactory()` (`packages/core/src/utils/id.ts`), so within one runtime they only increase.
  3. Store `:triplex.tx/max-row-id` on each commit's transaction entity. The function already reads the newest commit for the
     position and the clock. An id above the mark is new. An id at or below it (two runtimes interleaving, imports) takes
     today's scan.
  4. RE1's alternative (`WRITE-BETTER.md` 3.2.1) is a short `:db.unique/value` id datom per row and no value index on row
     texts. It adds a datom per row and removes the largest index entries.
- **Evidence.** RE1: function mean 1.14 ms, p99 9.3 ms; serial-point parks of 5 to 29 ms in cold reads [M].
- **Could fail, and risks.** The mark must be kept on every commit, imports included, and compared in the index's own order
  (id length first). A runtime with a slow clock sends many ids below the mark. That stays correct and is only slower.
- **Cheapest experiment (2 h on top of item 3's harness).** The same `d/with` replay.
  - **Deciding numbers.** Function time and AVET node visits per commit.
- **Depends on, conflicts with.** Shares the replay harness with 3, 6 and 34.

#### 6. A commit function that reads only the subject it writes

**Statement.** Remove the duplicate liveness read for rows the same commit retracts, and look rows up inside the subject's own
index range, not by row id across the whole store.

- **Moves.** H5, H6. 0.1 to 0.2 ms at 10,000. The main value is at 100,000, where these reads miss the cache.
- **Mechanism.**
  1. `tx-data` in `storage.clj` puts every retracted id into `:live`. `commit.clj` then runs `row-id` for it, which is an index
     range by id over all row texts, then a seek for a retirement marker. After that the `:triplex/retract` op resolves the entity and
     seeks the same row again.
  2. Keep one read, the retract op's `seek-datoms :eavt e row prefix`, and map its "Missing live row datom" to the typed
     conflict.
  3. For live preconditions that are not retracted, send the entity id with the triple id (the adapter's predecessor cache has
     the row) and seek on the entity.
- **Evidence.** RE1's table "The gateway's commit, mapped onto that work" lists 2 reads per live id and 2 per retirement [M].
  At 100,000 the quiet-window commit median was 18 to 45 ms with zero readers (`h4/K100-READ-2026-11-12.md`) [M]. At 10,000,
  13% of commits wait about 5.5 ms on cold reads at the serial point (RE1) [M].
- **Could fail, and risks.** The error a stale precondition returns must stay `CasConflict`. The 300-scenario differential and
  the DX-V1 tests cover that.
- **Cheapest experiment (3 h).** `d/with` replay on the sealed 100,000 seed, read-only, with `:io-context`.
  - **Deciding number.** Storage reads per commit before and after.
- **Depends on, conflicts with.** Item 29 says how much it matters.

#### 7. Keep the commit path warm

**Statement.** Find what goes cold after 50 ms without a commit, then keep it warm with background activity that writes
nothing.

- **Moves.** H2, H1 and both "256 readers" medians. 2.6 to 3.8 ms on every commit that follows an idle gap (Finding 1). With
  Finding 2's corrections the 256-reader medians would land at about 7.0 to 7.6 ms (small) and 9.2 to 9.7 ms (medium).
- **Mechanism.** Four candidate causes, each with its own test:
  1. **The storage path.** Peer wait carries 2.2 to 2.4 ms of the penalty. A guest disk request wakes host I/O threads, and
     with eight spinning virtual CPUs on six performance cores those threads may sit on idle efficiency cores [I]. The test is
     a sentinel process that writes and syncs 4 KB on the database disk every 10 ms.
  2. **The compute path.** TypeScript, gateway and network spans each slow by 30% to 60%. The test sends, every 20 ms, a
     request that runs the whole path and is refused at the serial point, a commit with a precondition that cannot hold. The transactor
     skips the log for a failed transaction (RE1 step 8), so it writes nothing, takes no position and appears in no feed.
  3. **TCP.** Linux shrinks a connection's congestion window after an idle period (`net.ipv4.tcp_slow_start_after_idle`). The
     request, the transactor message and the tail chunk are each 12 to 30 KB against a 14.6 KB initial window on the Docker
     bridge [I]. The test sets it to 0 in the VM.
  4. **Placement.** Two of the eight spinning virtual CPUs are on efficiency cores at any moment (item 15).
- **What the result means.** If test 1 removes the peer-wait part, the fix is a bench condition in the same class as `nohlt`.
  If test 2 is needed, it is a store feature (a `keepWarm` option in the SDK) whose CPU cost is reported.
- **Evidence.** Finding 1 [C]. `STATUS.md` 2026-11-11 07:15: "about 5 ms of the sparse cost is not the vCPU wake" [M]. Host
  samples in pair F show the VM process at a median of 809% to 811% CPU in both arms (`trace/raw/system-darwin.jsonl.gz`)
  [C], so all eight virtual CPUs spin on a Mac with six performance cores.
- **Could fail, and risks.**
  - A warm-up that changes stored data is not acceptable. The refused commit must be proven to leave no datom.
  - Test 2 adds 25 to 50 refused transactions per second at about 0.5 ms each, 1% to 2.5% of the serial thread.
  - A real server may have an idle cost too. Report both the warm and the cold number.
- **Cheapest experiment (4 h).** An idle-gap sweep: a zero-reader driver mode that offers one 10-fact commit every G ms for G =
  10, 25, 50, 100, 250, 1,000, with 150 commits per G at full trace level. It has four arms, which are plain, disk sentinel,
  refused-commit warm-up, and `tcp_slow_start_after_idle=0`.
  - **Deciding number.** Some arm brings service p50 at G = 1,000 within 0.5 ms of G = 25. The per-layer spans say which layer
    each arm repaired.
- **Depends on, conflicts with.** Item 22 supplies the sentinel. Item 27 keeps the table in every report.

#### 8. A straight-line commit path in TypeScript

**Statement.** For the common command shape, turn the command into row texts in one synchronous pass, without one step of the
Effect runtime per row.

- **Moves.** H1, H2. Median 0.6 to 1.0 ms for small commits and more for medium ones.
- **Mechanism.**
  1. `transact` in `packages/core/src/store/TriplesLive.ts` deep-copies the command with `structuredClone`, then runs a
     generator that calls `adapter.insert`, `adapter.getById` and `adapter.retract` once per row and inserts the journal rows
     one by one. Only then does `DatomicClient.transact` encode, with `encodeRowText` validating each row again.
  2. The fast path applies when a command has only asserts and retract-by-id, a command id, `TripleLive` preconditions, no
     constraints and no nesting. It builds the same rows and the same request bytes in one function. Every other command takes
     today's path.
- **Evidence.**
  - TypeScript span p50: 1.80 ms (burst) and 2.89 ms (idle) for small commits, 2.3 to 4.5 ms for all sizes [M].
  - The writer thread burns 18,860 ms of CPU for 3,874 requests in pair F's burst phase, 4.9 ms per commit with the benchmark's
    bookkeeping (`TRACE-REPORT.md`, scheduler table) [M + C].
  - The reported "synchronous CPU 0.33 to 0.68 ms" counts synchronous scopes only (`packages/datomic/src/tracing.ts`,
    `traceSync`). The Effect steps are asynchronous scopes [R], so that figure understates TypeScript's CPU.
- **Could fail, and risks.** Two paths must produce identical bytes. A differential test over the 300 scenarios compares
  request bodies. The change touches `packages/core`, the contract's owner.
- **Cheapest experiment (2 h).** A CPU profile of the writer thread in one 200 s zero-reader arm (`DX_NODE_PROFILE=1` exists),
  split by frames under `packages/` against `lab/bench/`.
  - **Deciding number.** Product CPU per commit. Build if it is at least 1.0 ms.
- **Depends on, conflicts with.** Item 3 shrinks the same work from the other side (fewer rows to build).

#### 9. A binary commit frame, decoded once

**Statement.** Send row texts to the gateway as length-prefixed bytes and stop parsing each row's JSON two and three times.

- **Moves.** H1 and the gateway JVM. Median 0.3 to 0.5 ms (gateway span 0.76 ms in bursts, 1.34 ms when idle).
- **Mechanism.**
  1. The client wraps row texts in a JSON body (`stringifyExact`), which escapes every quote inside them. `main.clj` parses the
     body with `clojure.data.json`. `input-rows` in `storage.clj` runs `lean/decode`, a second JSON parse, on every new row.
     The commit function parses a third time (item 4).
  2. New frame: a small header (operation id, positions, claims, ids) and raw row texts. The gateway checks each row's
     fixed-offset header only (id, valid times, reference).
  3. Jackson is already in the Datomic distribution (`jackson-core-2.12.3.jar`,
     `evidence/DX-RE1/dist/from-image/opt-datomic-listing.txt`) for the header.
- **Evidence.** `t1/ANATOMY-a.md`: gateway before the peer 0.835 ms at p50 and 6.8 ms at p99 [M].
- **Could fail, and risks.** The gateway's per-row binding check moves to header fields. `selftest.clj` and the codec vectors
  cover the encoding.
- **Cheapest experiment (2 h).** A micro-benchmark in the gateway selftest container: parse 1,000 recorded request bodies with
  today's path and with Jackson plus header-only checks.
  - **Deciding number.** Milliseconds per request.
- **Depends on, conflicts with.** Item 2 moves this work into the transactor JVM.

#### 10. Group commit above the engine

**Statement.** When several commits are waiting to enter the transactor at the same moment, send them as one Datomic
transaction and give each its own outcome.

- **Moves.** H1 direction a, H4, H5. Small for the 10,000 medians. It shortens the drain after a stall. It is large at 100,000,
  where commits outlast their arrival gap.
  - In bursts 40% to 45% of commits overlap another [C]. But the transactor already applies N+1 while it logs N (RE1
    step 8) and its writer already joins whatever is queued. Merging pays only when two or more are waiting, which is
    uncommon at 9 ms per commit and 55 per second.
- **Mechanism.** `enqueue!` in `commit_order.clj` already serialises submission per client under a monitor. Merge the entries
  that are ready at that instant into `[[:triplex/commit-many [...]]]`. The commit function already supports several journals
  in one physical commit (`:triplex.tx/journals`, the `span` arithmetic). If a member fails its checks the function throws with
  the member's index, and the gateway resubmits the others and fails that one. It never waits to gather.
- **Evidence.** RE1 `WRITE-BETTER.md` item 7. k100: bursts fall seconds behind [M].
- **Could fail, and risks.** High. One member's failure must not fail the others. Lost-ACK resolution then covers several
  commands. Journals in one physical commit share one clock in strict scopes.
- **Cheapest experiment (1 h).** A counter at `enqueue!`: how often two or more commits are waiting. Read it at 100,000 inside
  item 29's hold.
  - **Deciding number.** Build if it is over 20% of burst commits.
- **Depends on, conflicts with.** Item 29.

#### 11. A bulk lane that yields to live commits

**Statement.** Cut every non-live write into transactions that take at most 5 to 10 ms of the transactor's serial time, and
let the write gateway admit them only when no live commit is waiting.

- **Moves.** P2 all-commit p99 (Finding 3: 15 to 18 slow commits per arm), the P5 live-traffic ratio, GS.13.
- **Mechanism.**
  1. The growth step sends 500 subjects per transaction (`growHistory`, `lab/bench/driver.ts`). Activation publishes 256
     subjects per frame, 1.6 MB and 1,806 datoms (`STATUS.md`, 2026-11-12 08:20).
  2. A frame of at most about 150 datoms costs what a large live commit costs.
  3. Admission: a `lane` field on the transact request. `commit_order.clj` keeps a live queue and a bulk queue and takes from
     bulk only when live is empty.
- **Evidence.** Finding 3 [C]. DX-S5: commit p99 during activation was 1.59 to 2.35 times the value before it [M].
- **Could fail, and risks.** Bulk throughput falls. 9,000 growth commits at 400 to 500 per second take about 20 s where the
  500-subject frames took 14 s.
- **Cheapest experiment (1 h).** Set the growth step to 4 subjects per command and rerun one zero-reader arm.
  - **Deciding numbers.** Slow commits in the growth phases fall from 15 to at most 2, and the arm's total is 74 or less.
- **Depends on, conflicts with.** Item 33 uses the same lane.

#### 12. Read-your-own-write from the receipt

**Statement.** Apply a commit's own rows to the local replica when the acknowledgement arrives, so the next read at the
returned position never waits for the feed or the gateway.

- **Moves.** P2's "the pull at the returned tx sees the commit with no extra wait". Item 2 needs it.
- **Mechanism.** `settle` in `DatomicStorageAdapter.ts` already holds the final rows with the assigned position and clock.
  `Replica.ts` applies journals in position order. The addition is to apply the receipt at position p if the replica has applied everything
  before it, otherwise hold it until the feed arrives. The feed's later copy is dropped by position (R1, technique 2).
- **Evidence.** Read-your-own-write wait p50 2.6 ms and p99 35 ms, and 158 of 3,415 fell back to the gateway (DX-R3 part 2,
  `STATUS.md` 2026-11-11 10:35) [M].
- **Could fail, and risks.** The replica must never expose p before every earlier position is applied.
- **Cheapest experiment (3 h).** Unit level on recorded journals, then the 200,000-pair differential.
- **Depends on, conflicts with.** None.

#### 13. One commit for a subject's queued commands

**Statement.** When commands for one subject are waiting behind an earlier one, send them together as one physical commit with
one journal each.

- **Moves.** H4. "Waiting behind the same subject" is the largest cause for 11 to 18 slow commits per arm (`t1/TAIL-9.md`).
  The value at 10,000 is small, because those commits are slow on account of the predecessor's stall and merging saves one
  commit time each. It matters for GS.03 (1,000 signals on 100 subjects in 10 s) and at 100,000.
- **Mechanism.** An SDK `transactMany` for one subject on the existing nested-journal machinery. The benchmark's per-subject
  queue (`lab/bench/lib/scheduler.ts`) hands over the whole queue.
- **Evidence.** The hottest subject receives about 20% of commands (Zipf 1.1 over 200 active subjects) [C].
- **Could fail, and risks.** Idempotency and compare-and-set per command inside one physical commit.
- **Cheapest experiment (1 h).** A counter: queue length per subject at dispatch.
- **Depends on, conflicts with.** Same machinery as item 10.

### 2B. Process, core and VM layout

#### 14. Transactor on two cores, shared with the write gateway

**Statement.** Give the transactor CPUs 0 and 2 and leave the write gateway on CPU 2, because the two work at different moments
of a commit.

- **Moves.** H2, H1. Median 0.7 ms without losing reader throughput.
- **Mechanism.** `DX_CPUS_TX=0,2 DX_CPUS_GW_WRITE=2` (the flags exist in `stack/up.sh`). The gateway works before submission
  and after the reply. The transactor's ten thread hand-offs happen in between.
- **Evidence.** Two transactor cores moved the zero-reader median from 11.36 to 10.65 ms (drift 0.21), peer wait from 5.67 to
  5.07 ms and p99 from 44.9 to 37.0 ms (`t1/CORES-6.md`) [M]. That arm took a core from the readers (readers on CPUs 5 to 7),
  which is where the 6.5% read loss came from. The rejected sharing arm shared with Postgres's core (0.33 ms). Sharing with
  the gateway has not been run.
- **Could fail, and risks.** A gateway collection on the shared core delays the transactor.
- **Cheapest experiment (2 h).** An ABA zero-reader arm of 200 s and one 450 s ladder.
  - **Deciding numbers.** Median gain at least 0.5 ms beyond drift, and reads per second within 1% of the control.
- **Depends on, conflicts with.** Item 2 removes the gateway from the path and leaves the core to the transactor outright.

#### 15. A six-CPU VM on the performance cores

**Statement.** Run six or five virtual CPUs so that none of the commit path's CPUs sits on an efficiency core.

- **Moves.** H7, every median, and the drift between sessions.
- **Mechanism.** Under `nohlt` all eight virtual CPUs spin. The Mac has six performance cores, so at least two virtual CPUs are
  on efficiency cores at any moment, and the commit path uses four of the eight. A layout for six is transactor 0 (shared with
  the gateway), Postgres 1, write gateway 2, writer 3, readers 4 and 5.
- **Evidence.** The VM process runs at a median of 809% to 811% CPU on the quiet host [C]. H7 lists a 6-CPU VM as untested, and R4 recommended fewer
  virtual CPUs than performance cores [M]. P4 passes with a factor of four to spare and read p99 is 6 ms against 100, so the
  readers can give up two cores.
- **Could fail, and risks.** The host's own threads, the VM's I/O threads among them, then have no performance core either. A
  five-CPU arm tests that. P1's scaling ratios must be read again.
- **Cheapest experiment (3 h).** Restart the VM at 6 CPUs under the lock (the way `lab/bin/vm-resize.sh` does), then
  old-against-new zero-reader arms and one ladder. Record `powermetrics` cluster residency of the VM's threads once.
  - **Deciding numbers.** Zero-reader median, the idle-gap curve, reads per second.
- **Depends on, conflicts with.** Changes the bench, so every later comparison starts a new series.

#### 16. A commit thread that carries no benchmark state

**Statement.** Move the expected-state model, the oracle history and the duplicate history out of the writer's isolate, so its
heap stays small and its collections stay short.

- **Moves.** H4 (scheduler lateness is the largest cause for 5 to 12 slow commits per arm, plus those queued behind them) and
  the P1 writer ratios.
- **Mechanism.** The writer's heap has a median of 530 to 570 MiB and a maximum of 877 to 1,016 MiB, with 2 to 4 collections
  over 50 ms per arm and a longest of 71 to 150 ms (`t1/TAIL-9.md`) [M]. Feed the model through a compact journal on a
  `SharedArrayBuffer` ring to a worker, as the opt-in journal for the expected model already does, and do the same for the
  oracle and duplicate histories.
- **Evidence.** A 149 ms writer stall overlaps 148 ms of garbage collection (`t1/TAIL-9.md`) [M]. The model journal alone took
  the heap from 498 to 302 MiB and the longest pause from 55 to 39 ms (`t1/JOURNAL-8.md`) [M].
- **New reason to revisit a rejected item.** The journal was rejected because its p99 gain sat inside drift. The other two
  histories keep the heap above 300 MiB, and the right measure is collections over 25 ms, not a p99 that other causes dominate.
- **Could fail, and risks.** The moved bookkeeping must not change what the checks see. For the product this is a guideline:
  keep the commit isolate small.
- **Cheapest experiment (4 h).** A heap census of the writer after a run (what retains 500 MiB), then move the largest two
  holders.
  - **Deciding number.** No collection over 25 ms on the writer in one pair.
- **Depends on, conflicts with.** None.

#### 17. Loopback or unix sockets between the five containers

**Statement.** Take the Docker bridge out of the commit path.

- **Moves.** H1 direction d. Median 0.2 to 0.4 ms.
- **Mechanism.** One commit crosses the bridge at least eight times, between client and gateway, gateway and transactor in both
  directions, transactor and Postgres for three to four statements. Use `--network host` for the stack (`up.sh` already
  refuses ports 15442 and 17019), or shared network namespaces.
- **Evidence.** The network residual between client and gateway alone is 0.48 ms in bursts and 0.65 ms when idle [M]. The
  other hops are inside peer wait.
- **Could fail, and risks.** Port collisions and weaker isolation between stacks that run at the same time.
- **Cheapest experiment (2 h).** An ABA zero-reader arm.
  - **Deciding number.** Median gain of at least 0.2 ms beyond drift.
- **Depends on, conflicts with.** Item 21 does the transactor-to-Postgres part.

#### 18. A thin write gateway JVM

**Statement.** Run the write gateway with a small heap and a small object cache, since no read goes through it.

- **Moves.** The tail. The gateway was the largest cause for 4 slow commits in pair C and none in A and F. It also frees memory
  for 100,000 subjects.
- **Mechanism.** `DX_GW_JAVA_OPTS` in `h4/run.sh` gives both gateways `-Xms1g -Xmx2g -Ddatomic.objectCacheMax=1g`. The write
  gateway's `commit!` touches the database only for the duplicate-operation lookup and for subject entity ids. A 256 MB heap
  with a 64 MB cache has short collections.
- **Evidence.** The write gateway paused 201 to 212 times per run, 33 to 46 times over 25 ms, with a maximum of 48 to 64 ms
  (`STATUS.md`, 2026-11-11 09:36) [M].
- **Could fail, and risks.** Lookups go cold if the cache is too small.
- **Cheapest experiment (1 h).** One ABA with `DX_GW_WRITE_JAVA_OPTS`.
  - **Deciding numbers.** Gateway pauses over 25 ms and the gateway span's p99.
- **Depends on, conflicts with.** Item 2 makes it unnecessary.

### 2C. Storage and the virtual disk

#### 19. The benchmark's files off the database's virtual disk

**Statement.** Give Postgres a virtual disk of its own, and put the driver's spill files, SQLite stores and traces on another
disk or in memory.

- **Moves.** P2 all-commit p99 (Finding 4: the loaded arms hold 5, 75 and 61 more slow commits than their zero-reader arms),
  the P1 writer ratios and recovery, H4, H7.
- **Mechanism.** A second Lima disk, formatted ext4, preallocated, mounted for the `<prefix>-pg-data` volume only. Short of
  that, mount the driver's `/driver` as tmpfs, or point the spill directory at the host-mounted evidence path so that it never
  touches `/dev/vdb`.
- **Evidence.** Finding 4 [C + M].
- **Could fail, and risks.** A spill on tmpfs needs about 3 GB of the VM's 16. SQLite's WAL mode may not work on the host
  mount. The hypothesis may be wrong, and the diagnostic below decides it in two hours.
- **Cheapest experiment (2 h, then 3 h).**
  1. A diagnostic loaded arm (the 450 s ladder) with `/driver` on tmpfs. The deciding number is whether slow commits in sparse phases fall
     from 12 to 37 down to the zero-reader arm's 4 to 7.
  2. If it holds, add the second disk and rerun a full pair.
- **Depends on, conflicts with.** Item 22 measures the same thing from the other side.

#### 20. WAL segments created before the measured window

**Statement.** Make Postgres recycle WAL segments, so that no commit has to create and zero-fill a new 16 MB file.

- **Moves.** P2 p99. About 14 segment creations per arm (Finding 5), each inside one commit and in front of the commits queued
  behind it.
- **Mechanism.** After the seed clone and before the trace starts, write 512 MB of WAL (for example `pg_logical_emit_message`
  in a loop) and run `CHECKPOINT` with `min_wal_size=1GB`. Recycled segments then wait ready [W3].
- **Evidence.** Finding 5 [M]. `t1/STORAGE-9.md` [M].
- **Could fail, and risks.** None to durability. It holds 1 GB of disk per running stack, and the Mac is at its 15 GiB floor.
- **Cheapest experiment (1 h).** An ABA zero-reader arm of 200 s with the burst in it.
  - **Deciding number.** Slow commits in the burst.
- **Depends on, conflicts with.** None.

#### 21. Postgres and the transactor as one unit

**Statement.** Run Postgres and the transactor in one container or one network namespace, so they fail together and talk over
loopback or a unix socket.

- **Moves.** H1 direction d (0.1 to 0.2 ms for three to four statement round trips per commit). It also removes the case
  "Postgres crashed and the transactor kept running", which item 1's probe and N2 cannot tolerate.
- **Mechanism.** `--network container:<prefix>-pg`, a shared process namespace with a supervisor, and `sql-url` on
  `localhost`.
- **Could fail, and risks.** Restart handling in GS.04.
- **Cheapest experiment (1 h).** Run it with item 17.
- **Depends on, conflicts with.** None.

#### 22. Two diagnostics that attribute the tail: WAL in memory, and a disk sentinel

**Statement.** Run one arm with the WAL directory on tmpfs to learn how much of the tail and of the idle penalty is the virtual
disk, and run a sentinel that syncs a small write every 10 ms to timestamp every disk stall independently of the store.

- **Moves.** H4, H7, and the open question of whether the Mac's disk stalls should count against P2.
- **Mechanism.**
  1. `--mount type=tmpfs` for `pg_wal` in a diagnostic stack. It is never a verdict configuration.
  2. The sentinel is a 30-line process in its own container on the database disk. It logs each write-and-sync latency on the
     VM's monotonic clock. The report tags any commit whose peer wait overlaps a sentinel sync of more than 25 ms.
- **Evidence.** `t1/STORAGE-9.md` leaves "Virtualization and APFS against the SSD" unsplit and notes that host counters cannot
  split it [M]. The sentinel does not split host layers either. It proves a stall is below the store, which is what a verdict
  needs.
- **Could fail, and risks.** The sentinel changes the system, because it also keeps the disk path warm (item 7, cause 1). Run
  arms with and without it.
- **Cheapest experiment (3 h).** Three zero-reader arms of 200 s: plain, WAL on tmpfs, sentinel.
  - **Deciding numbers.** P99 and the idle-gap curve with WAL on tmpfs, and the share of slow commits the sentinel explains.
- **Depends on, conflicts with.** Feeds items 7 and 19 and question 5 for Sam.

#### 23. Free the Mac's disk or use an external SSD

**Statement.** Bring the internal volume under about 80% full, or put the VM disk on an external NVMe SSD.

- **Moves.** H7, H4, and the runs refused for disk.
- **Evidence.** The data volume is 95% full with 21 GiB free (`df`, 2026-11-15) [C]. Runs were refused for disk in parts 5, 6
  and 7 [M]. A search found no source that ties APFS fullness to sync stalls, so the effect on the tail is unknown (Appendix B, last
  row).
- **Cheapest experiment.** After the disk audit's plan has run, repeat item 22's sentinel arm and compare.
- **Depends on, conflicts with.** Needs Sam (question 6).

### 2D. The measurement protocol

#### 24. An offer timer with sub-millisecond accuracy

**Statement.** Arm the timer for 2 ms before the next offer and poll the clock with `setImmediate` for the rest.

- **Moves.** Every P2 median, by 0.60 to 0.69 ms (Finding 2).
- **Mechanism.** `tick` in `lab/bench/lib/scheduler.ts`. The writer has a core of its own, so polling takes nothing the path
  needs. `setImmediate` yields to I/O between checks.
- **Evidence.** Finding 2 [C]. Node's timer documentation [W1].
- **Could fail, and risks.** It changes no bar and no trace, because offers happen at their scheduled time, as the open-loop design
  intends. A busy loop that starves I/O would be wrong, hence `setImmediate`.
- **Cheapest experiment (1 h).** One 200 s zero-reader arm.
  - **Deciding numbers.** `waitMs` p50 falls from 0.6 to under 0.05 ms and service time does not change.
- **Depends on, conflicts with.** None.

#### 25. Stop the clock at the published ACK

**Statement.** Take the commit's finish time when the receipt is handed over, before the benchmark's model and oracle
bookkeeping.

- **Moves.** Every P2 number, by 0.41 ms at the median.
- **Mechanism.** `executeTraced` in `lab/bench/driver.ts`. Use `out.ackPublishedAt` for `latencyMs`, or return from `exec` at
  that point and run the bookkeeping in the completion callback. Both stamps are already in `ns-writes.jsonl`, so report both.
- **Evidence.** Finding 2 [C]. `lab/TARGETS.md` 1.1: latency runs "to the published ACK".
- **Could fail, and risks.** DX-T1 kept the bookkeeping before the stop on purpose, "so this change cannot hide work by moving
  the latency timestamp" (`t1/OUTSIDE-5.md`). This is a reading of a frozen definition, so Sam or the orchestrator rules
  (question 2).
- **Cheapest experiment (0.5 h).** None is needed. Recompute from the retained records with Appendix A.
- **Depends on, conflicts with.** None.

#### 26. Verdicts that rest on enough commits

**Statement.** Compute the P1 writer ratios, the recovery bar and the 256-reader medians over enough commits to give a stable
answer, and report an interval with each.

- **Moves.** The P1 bars that move between pass and miss, and the two 256-reader medians.
- **Mechanism.** Four options, least change first:
  1. Pool the same window over three or more pairs before taking the p99 and the median.
  2. Lengthen the 256 and 1,024 windows until each holds 500 commits.
  3. Keep the windows and report the share of commits over the matched zero-reader p99, with a bootstrap interval.
  4. Judge "never block writers" on the median and the p90 per level, which 46 commits can estimate.
- **Evidence.** Finding 6 [C]. `lab/research/R22-noise-robust-benchmarking.md` [M].
- **Could fail, and risks.** Changing how a bar is estimated needs Sam under the threshold policy in `lab/TARGETS.md`
  (question 3).
- **Cheapest experiment (1 h).** Recompute pooled ratios from pairs C, A and F.
- **Depends on, conflicts with.** None.

#### 27. Service time by idle gap in every report

**Statement.** Add the table of Finding 1 to every run's trace report.

- **Moves.** Nothing by itself. It keeps the idle penalty visible while items 7, 15 and 22 work on it.
- **Mechanism.** `lab/trace/report.mjs`, with the logic of Appendix A, script 2, and the per-layer spans split the same way.
- **Cheapest experiment (1 h).** Regenerate the report of pair F and compare with Finding 1.
- **Depends on, conflicts with.** None.

#### 28. Short interleaved arms, a host gate, and the oracle off the measured window

**Statement.** Replace one 15-minute pair per verdict with several short alternating arms, refuse to start under memory
pressure, and run the oracle replay after the window or inside the VM.

- **Moves.** H7 and every comparison.
- **Mechanism.** R22 and R4 describe the method, which is interleaved arms and a bootstrap interval on the per-pair differences.
  `lab/bin/host-quiet.sh` exists. The oracle bridge used 0.4 of a core and 1.1 GB on the Mac during measured runs
  (`lab/HARD-PROBLEMS.md`, H7).
- **Evidence.** The same build read 204 ms and 16 ms with Chrome and Slack open, against 55.6 ms and 11.4 ms without [M].
- **Could fail, and risks.** Short arms hold fewer tail events, so the p99 needs pooled arms.
- **Cheapest experiment (3 h).** An A/A test: two identical arms alternated six times.
  - **Deciding number.** How often the protocol reports a difference that is not there.
- **Depends on, conflicts with.** Item 26.

### 2E. 100,000 subjects and activation under traffic

#### 29. A first real reading at 100,000 subjects, with storage reads per commit

**Statement.** Run the zero-reader trace on the sealed 100,000 seed with today's stack, and pass `:io-context` so every commit
reports its own storage reads.

- **Moves.** H5, P5. It decides which of items 5, 6, 10 and 30 matter.
- **Mechanism.** `d/transact-async conn data :io-context :triplex/commit` in `submit!` (`storage.clj`). The returned
  `:io-stats` go on the commit span (RE1 `WRITE-BETTER.md` item 8). Size the gateway caches to the population.
- **Evidence.** The only reading at this size (k100, `h4/K100-READ-2026-11-12.md`) predates dedicated cores, the 1,280 MiB
  cache, the server clock and local reads, and its burst trace outran the commit path [M].
- **Could fail, and risks.** The seed is 17.9 GB and a clone needs as much again on a full disk. Pace the trace if the burst
  outruns the path.
- **Cheapest experiment (4 h).** A 200 s zero-reader arm with the steady rate and one burst.
  - **Deciding numbers.** Commit p50 in quiet windows, storage reads per commit by index, and time spent in them.
- **Depends on, conflicts with.** Disk space (item 23).

#### 30. Transaction hints at 100,000

**Statement.** Test `TX2_COMMIT_HINTS=true` again, where cold reads dominate.

- **New reason to revisit a rejected item.** Hints were measured slower at 1,000 subjects with a hot cache (612 to 520
  commands per second, DX-M2). They move the commit function's reads off the serial thread, which pays only when those reads
  miss the cache. At 100,000 they do.
- **Mechanism.** The flag exists (`transaction-hints` in `storage.clj`). Prefetch needs two transactor cores (R3, A8; item
  14).
- **Cheapest experiment (1 h more inside item 29's hold).** An ABA.
  - **Deciding numbers.** Commit p50 and cold-read time at the serial point.
- **Depends on, conflicts with.** Items 14 and 29.

#### 31. A local replica that fits 100,000 subjects

**Statement.** Keep journal rows out of the replica's memory, pack the columns that repeat, and restart from a checkpoint.

- **Moves.** P1, P4 and P5 at 100,000. The projection is 8.3 GB of replica data in a 16 GiB VM.
- **Mechanism.** `packages/datomic/src/replica/packed.ts` packs rows with the full public metadata, which added 46% in DX-R3
  part 4. Journal rows serve only receipt reads, which are rare and can go to the gateway. Dictionary-encode attribute,
  author, entity type and schema version. R1 techniques 9 and 10: a checkpoint plus the feed tail, and cold subjects
  compressed.
- **Evidence.** Bootstrap took 446 to 768 s and the driver peaked at 9 to 10 GiB at 100,000 (`STATUS.md`, 2026-11-12) [M].
- **Could fail, and risks.** Read CPU per pull must stay inside P4's margin.
- **Cheapest experiment (4 h).** Offline on the recorded 10,000 inputs.
  - **Deciding numbers.** Bytes per subject and read CPU per pull, before and after.
- **Depends on, conflicts with.** Item 3 and N1 shrink what the feed carries.

#### 32. A seed transcoder

**Statement.** Build new-layout seeds by rewriting a sealed seed's log, not by replaying 4.3 million commands.

- **Moves.** It makes items 3, 4, 5 and N1 affordable at 100,000, where the seed took 8 hours.
- **Mechanism.** Read the sealed seed with `d/tx-range`, map each transaction's datoms to the new layout, and write them to a
  fresh database through pipelined `transact-async` of plain datoms, with no commit function and no checks. Keep positions,
  clocks, ids and claims. Verify with the population fingerprint that sealed the original (`s5/SEED.md` on
  `exp/DX-S5-seed-100k`).
- **Could fail, and risks.** Datomic assigns new `t` values and entity ids, so anything that stored a `t` must be mapped. The
  fingerprints are over logical content, which is what must match.
- **Cheapest experiment (4 h).** Transcode the 1,000 seed to the same layout and compare fingerprints.
- **Depends on, conflicts with.** None.

#### 33. Activation that publishes in ordinary commits at a paced rate

**Statement.** Publish changed outputs as small frames through item 11's bulk lane, sized so that a live commit never waits
for more than one frame.

- **Moves.** P5. Today the commit p99 ratio during activation is 1.59 to 2.35 against 1.5, and activation without traffic
  takes 82.9 s.
- **Mechanism.** 53,681 changed subjects in the 55 s left after evaluation need about 1,000 subjects per second. Frames of 32
  subjects at 31 per second leave the transactor more than half idle for live commits at the burst rate.
- **Evidence.** DX-S5 parts 3 and 4 (`STATUS.md`, 2026-11-12) [M]. Sam, 2026-11-10: what gets published is what changed, "in
  ordinary-sized commits".
- **Could fail, and risks.** The 100 s bar with 54% of outputs changed leaves little room. N5 puts the larger question to Sam.
- **Cheapest experiment (3 h).** At 10,000 first: activation with 16-subject frames while the burst runs.
  - **Deciding number.** Live commit p99 during activation over before.
- **Depends on, conflicts with.** Items 11 and 29.

### 2F. Costs the core contract forces

#### 34. The claim folded into the transaction entity

**Statement.** Store the command id as one unique attribute on the transaction entity and drop the separate claim entity for
single-command commits.

- **Moves.** 3 datoms and one upsert per commit, 0.3 ms if cost follows datoms.
- **Mechanism.** `tx-data` in `storage.clj` emits a claim entity with `:triplex.claim/command-id`, `:triplex.claim/tx` and
  `:triplex.claim/tx-id`. A unique `:triplex.tx/command-id` on the transaction entity gives the same duplicate check through
  Datomic's own unique check. Commits with several journals keep claim entities.
- **Cheapest experiment (1 h).** Inside item 3's replay.
- **Depends on, conflicts with.** A layout change, with items 3 to 5.

#### What else the contract forces, and where the menu answers it

| Cost the contract forces | Where it shows | Answer |
| --- | --- | --- |
| Journal rows stored as triples, one change row per fact | N + 6 of the 2N + 6 rows per commit; two thirds of stored rows at 100,000 | Item 3; N1 |
| A staged, row-at-a-time adapter interface | TypeScript span 1.8 to 2.9 ms | Item 8 |
| A defensive deep copy of every command | inside the same span | Item 8 |
| Position, record time and transaction id inside every row | the serial-point rewrite, 0.42 ms | Item 4 |
| A row id unique across all history | one history scan per new row | Item 5 |
| A claim entity per command | 3 datoms | Item 34 |
| Complete changed rows in the feed | feed bytes | Keep. The replica's exact reads depend on it |
| A total order of positions | the serial point itself | Keep. P3's cursor is that order |

---

## 2b. Needs Sam's decision

**Nine candidates that break a constraint or one of Sam's rulings.** None is in the plans of section 3 unless the plan says
so. Each names the constraint first.

#### N1. Derive the change rows, do not store them

- **Constraint.** Sam, 2026-11-09, on Q107-S: "I want to stay with C for everything ... we need to keep way 2 to be doable
  today." The orchestrator read it as "No lane stops storing them."
- **Idea.** The feed and the journal route compute the `:_tx/change` and `:_tx/changed-entity` rows from the transaction's own
  datoms: `d/tx-range` returns the row datoms that the transaction asserted and retracted. Every Triplex query returns the same
  triples. Nothing that can be recomputed is stored.
- **Effect.** Datoms per commit go from 26 + 2N to about 19 + N. Bytes per commit fall by more than half, because a change row
  is larger than the fact row it describes. The log tail then resets about every tenth commit, not every fourth, which RE1
  prices at about 0.8 fewer Postgres commits per transaction. Storage at 100,000 would fall from 15.75 GB to roughly 6 to 7 GB
  [I].
- **Risk.** A derived row needs a triple id that can be recomputed, so change-row ids would follow a new scheme. New scopes
  only.
- **Experiment.** A fourth shape in item 3's replay.

#### N2. A durable watermark: apply first, flush once for everyone, release at the watermark

- **Constraint.** Sam, 2026-11-13, on acknowledging before the engine has durably applied: "Not yet, this seems risky." This
  idea keeps that rule for acknowledgements. It breaks an assumption inside Datomic, because the transactor would tell its peers about
  a transaction a few milliseconds before Postgres has flushed it.
- **Idea.**
  1. All `datomic_kvs` writes commit without waiting for the flush.
  2. Each gateway runs a flusher that reads its newest `t`, runs one tiny synchronous commit on its own Postgres connection (that
     flush covers all earlier WAL), and publishes `durable-t`.
  3. Acknowledgements, reads and the feed are released only up to `durable-t`.
- **Effect.** The transactor's serial writer never waits on a flush. One flush covers every commit in flight, so flush waits
  per commit fall from 2.5 to one shared flush, and a stall delays the waiting commits once. Median 1.0 to 1.5 ms [I]. Burst
  throughput is bounded by the apply (about 1.3 ms), not by the log write.
- **Prior art.** Flush pipelining and early lock release in Aether [W5].
- **Risk.** If Postgres alone crashes, the running transactor is ahead of storage, so the two must restart together (item 21),
  and gateways must restart when the transactor does. The vendor does not support it. It needs a crash matrix before any
  verdict: stop Postgres at random points, then check that every acknowledged commit is present and that no reader saw a
  position that was lost.
- **Experiment.** Item 1's probe measures the first half. A prototype with the crash matrix is 8 hours or more.

#### N3. A durable intake log in front of the engine

- **Constraint.** Sam, 2026-11-13: "Not yet, this seems risky." Recorded here with numbers for a later decision.
- **Numbers.** Lane Q's broker is this design. It reached offer-to-ACK p50 6.7 to 7.3 ms at 256 readers with a real full sync
  of 3.0 to 3.1 ms inside it (`lab/research/R42-p2-broker-latency.md`) [M]. On the VM's best-effort sync an intake commit
  would cost about 3 to 4 ms [I].
- **What makes it more feasible than it was.** Exact local reads give the runtime each subject's exact state, so the intake
  can decide compare-and-set itself, and Datomic applies behind it in order.
- **When to revisit.** If items 1, 2 and 7 and the layout work leave a warm commit above 5 ms under honest durability.

#### N4. The engine as an append-only store, with the current index only in the replica

- **Constraint.** P4 asks for "a fast path to current values, kept separate from history". Today both the engine and the
  replica have one. `lab/SCOPE.md` keeps raw native queries.
- **Idea.** Rows go onto a new entity per commit, retirements are markers, and nothing is retracted. Datomic skips its
  redundancy lookup for entities created in the same transaction (RE1, "free or cheap"). The serial point reads only the scope
  head and the subject's revision.
- **Effect.** Commit cost stops depending on the number of subjects, which is the direct answer to H5.
- **Risk.** Fallback reads and bootstrap on the engine slow down with history depth unless the engine keeps a background
  snapshot per subject.
- **Experiment.** One more shape in the replay on the 100,000 seed, read for storage reads per commit.

#### N5. Activation as one fact, with outputs derived

- **Constraint.** `lab/TARGETS.md` P5 item 3: "Results are published as work items through the atomic outbox path."
- **Idea.** Activation commits one fact that binds the basis and the release hash. A subject's outputs under a release are a
  pure function of the two. They are computed from the local copy when read and written in the background through the bulk
  lane.
- **Sam's words that point this way.** 2026-11-10: "I don't think it's about publishing 100,000 results at once because we're
  not going to be publishing that much probably."
- **Effect.** Activation wall time becomes evaluation time (24 to 47 s at 100,000). Live traffic sees only paced background
  commits.

#### N6. Five rulings about the bench

These are decisions, not ideas. Each has a question in section 5.

| Ruling | Item | What it changes |
| --- | --- | --- |
| The store, or the bench, may keep the commit path warm | 7 | the two 256-reader medians |
| The clock stops at the published ACK | 25 | every P2 number, 0.41 ms |
| Bars are computed over at least 500 commits | 26 | P1 writer ratios, recovery, 256-reader medians |
| Commits that overlap a stall the sentinel also saw are reported apart | 22 | all-commit p99 |
| Best-effort sync is the standing condition, or full sync is required | 1, 22 | what "durable" means in every verdict |

#### N7. XTDB behind the same replica

- **Constraint.** Sam, 2026-11-13: "I don't care about XTDB. Don't go back to that." 2026-11-15: Datomic now "and then maybe
  XTDB". No work is proposed.
- **Why one reading could be worth it later.** The engine no longer answers reads, which was XTDB's weak side (R51, mistake
  4). XTDB assigns system time on the server and is bitemporal natively, the model Sam chose on 2026-11-13. Its measured
  native commit was 33 ms at p50, against 7.4 to 8.0 ms for a warm Datomic commit, so it starts behind.

#### N8. A purpose-built key-value store behind Datomic's JDBC interface

- **Constraint.** Sam chose Datomic on Postgres storage (2026-11-09). It puts new storage code under the durability floor.
- **Idea.** Datomic sends four statement shapes to one table [C]. A JDBC driver that implements exactly those over an
  append-only file, with one sync per log write, removes Postgres, its connection hops and its WAL from the path.
- **Effect.** The storage part of a commit falls from about 1.5 ms to about 0.3 ms plus the sync [I].
- **Risk.** Backup, vacuum and every Postgres tool are lost. Item 1 gets most of the gain for a fraction of the risk.

#### N9. Hardware: an external SSD, or one reading on the Linux machine

- **Constraint.** "The only machine is this Mac."
- **Why.** Every bench-side finding in this file (the idle penalty, efficiency cores under spinning virtual CPUs, best-effort
  sync, a volume 95% full) belongs to a VM on a laptop. One reading on a Linux host would say which P2 gaps belong to the
  store. Sam offered a Linux machine on 2026-11-10.

---

## 2c. The hard problems, answered

| Problem | Answer in this menu |
| --- | --- |
| H1 The commit median sits on the engine call | 1.0 to 1.1 ms of it is apparatus (Finding 2). Then items 1, 2, 14, 3 to 5, 8, 9, 17. Stacked on a warm small commit of 7.4 to 8.0 ms they give about 2 to 3 ms (Plan C) |
| H2 With 256 readers the median doubles | No longer true with local reads on a quiet host. The remaining gap is the idle penalty (Finding 1): items 7, 15, 22 |
| H3 Exact local reads and fast commits in one build | Reads pass in the same build now. The writer ratios are an estimator problem and a shared-disk problem: items 26, 19, 16 |
| H4 The commit tail | Findings 3, 4, 5: items 11, 19, 20, then 16, 1, 22 |
| H5 100,000 subjects | Measure first (29), then 30, 5, 6, 10, 11, 31 to 33. N4 if the serial point still grows |
| H6 The transactor is closed source | RE1's reading is used by items 1, 2, 3 to 6 and 10 |
| H7 The bench moves results more than the code | Items 15, 19 to 28 |
| H8 XTDB (closed) | N7 only |
| H9 Design decisions | No item changes them. Recommendations for the two open ones are in section 5 |
| H10 17 KB and 56 datoms per commit | Items 3, 4, 5, 34 and N1 |

**Problems the list does not have yet.**

| New | Problem | Evidence |
| --- | --- | --- |
| H11 | A commit after 100 ms or more of idleness costs 2.6 to 3.8 ms more | Finding 1 |
| H12 | The benchmark's timer and bookkeeping sit inside the measured latency | Finding 2 |
| H13 | Large benchmark transactions run in front of live commits | Finding 3 |
| H14 | The store and the harness share one virtual disk and one flush queue | Finding 4 |
| H15 | WAL segments are created on the commit path | Finding 5 |
| H16 | Bars are estimated from 16 to 46 commits | Finding 6 |
| H17 | "Durable" on this bench is best-effort; a full sync costs 3 ms here and Datomic makes 3.1 flushes per commit | R4, R42, RE1 |

---

## 3. Combinations

### Plan A. Correct the instrument and the bench, change no product code

**Items 24, 25, 11 (growth step only), 27, then 20, 19, 14, 26.**

1. Timer, both stamps, growth step in 4-subject commands, the idle-gap table: one day (brief LF-1).
2. WAL segments ready before the window: one hour.
3. Driver files off the database disk: diagnostic first, then the second disk (brief LF-3).
4. Transactor on CPUs 0 and 2: two hours.
5. One quiet pair, read with pooled estimators (item 26).

| Bar | Today (C, A, F) | Plan A, expected | How |
| --- | --- | --- | --- |
| Small burst p50 | 9.6 to 9.8 | 7.6 to 7.8 | Finding 2's corrected values minus item 14's 0.7 |
| Medium burst p50 | 11.7 to 12.1 | 9.5 to 9.7 | same |
| Small at 256 readers p50 | 11.2 to 12.2 | 8.8 to 10.3 | same |
| Medium at 256 readers p50 | 13.8 to 14.9 | 11.5 to 12.5 | same; still a miss |
| Slow commits, zero-reader arm | 69 to 91 | 54 to 73 | minus the growth phases |
| Slow commits, loaded arm | 96 to 144 | 53 to 75 | minus growth, minus the loaded excess if Finding 4 holds; item 20 comes on top |

The "today" values for 256 readers are the window medians of Finding 2, which differ from `VERDICT-9.md` by up to 0.6 ms.

**Expected result.** P2 passes except the medium median at 256 readers, and the small one in a slow session. Item 14's 0.7 ms
was measured on an arm dominated by burst commits, so its effect on idle commits is assumed, not measured. The stamp and the
pooled estimators need Sam's ruling before a verdict may rest on them (questions 2 and 3).

### Plan B. The fastest route to a full P2 pass

**Plan A, then item 7 (idle penalty) and item 1 (one flush).**

- Medium at 256 readers: 11.5 to 12.5, minus 2.6 to 3.8 (item 7), minus 0.5 to 0.8 (item 1) = 6.9 to 9.4 ms.
- The tail gains margin from half as many flush waits.
- About one week of builder time. Needs questions 1 to 3 answered.

### Plan C. A commit that costs half

**The layout (items 3, 4, 5, 6, 34, or N1 if Sam agrees) with the transcoder (32), then items 1, 2 with 12, 8, 9.**

| Step | Small warm commit, ms |
| --- | --- |
| Today | 7.4 to 8.0 |
| Layout: 3 (1.3), 4 (0.4), 5 (0.4), 34 (0.3) | about 5.3 |
| One flush (1) | about 4.6 |
| Endpoint in the transactor (2) | about 3.4 |
| TypeScript (8) and frame (9) | about 2.2 to 2.5 |

- A medium commit lands near 3 to 4 ms. The sums assume the gains add, which the replay and the leg measurement must show.
- It leaves room for honest durability later (one full sync is 3 ms on this Mac) and it shrinks storage and replica memory
  for 100,000.
- Three to four weeks of builder time.

### Plan D. The path to 100,000 subjects

1. **Measure** (29) with hints as a second arm (30). Needs disk (23).
2. **Remove what grows at the serial point**: items 6 and 5, then N4 only if cold reads per commit still rise with size.
3. **Protect live commits from bulk work**: items 11 and 33, so that activation with traffic gives a valid result.
4. **Fit the replica**: item 31.
5. **Group commit** (10) if the counter says two or more commits wait together in bursts.
6. **Any layout change** goes through the transcoder (32), not through an 8-hour seed.

---

## 4. Shortlist: the top five, ranked, with a brief for each

**Ranking rule.** Largest expected movement of a missed bar per builder hour, with the experiments that decide other items
first.

| Rank | Pick | Why it is here |
| --- | --- | --- |
| 1 | Correct the instrument (24, 25, 11, 27, 26) | Certain. 1.0 to 1.1 ms on every median and 15 to 18 slow commits per arm, in one day |
| 2 | Find and remove the idle penalty (7, with 22's sentinel) | It is the whole "256 readers" median gap: 2.6 to 3.8 ms |
| 3 | Separate the disks and prepare the WAL (19, 20) | The loaded arm's extra 5 to 75 slow commits and about 14 stalls per arm |
| 4 | One Postgres commit per log write (1) | 0.5 to 0.8 ms and half the flush waits; a 2-hour probe decides |
| 5 | Fewer datoms per commit: the replay harness (3, 4a, 5, 6, 34, N1) | The medium band, 100,000 and storage; one harness prices five items |

**Next three.** Item 14 (two hours, can ride on pick 1's pair), item 29 (the first real 100,000 reading), item 2's leg
measurement.

### Brief LF-1. Correct the instrument

- **North star.** P2, medians and all-commit p99, read from the verdict table of one quiet pair.
- **Goal.** The benchmark offers on time, records the ACK stamp, and no longer runs 500-subject transactions in front of live
  commits.
- **Steps.**
  1. `lab/bench/lib/scheduler.ts`, `tick`: arm `setTimeout` for 2 ms before the next offer, then re-check the clock in a
     `setImmediate` loop until it is due. Unit-test with a fake clock.
  2. `lab/bench/driver.ts`, `executeTraced`: write `latencyToAckMs = ackPublishedAt - scheduledAt` beside `latencyMs` in every
     row, and print every P2 bar with both stamps. Do not change which stamp the verdict uses.
  3. `growHistory`: a setting for subjects per growth command, default 4. Check that depths 3 and 10 are reached and that each
     depth still has 10,000 correct pulls.
  4. `lab/trace/report.mjs`: add "service time by idle gap" and "commits over 50 ms by phase type" (Appendix A, scripts 1 and
     2).
  5. Run one full quiet pair with `DX_CPUS_TX=0,2 DX_CPUS_GW_WRITE=2` as a separate ABA arm before it (item 14).
- **Deciding numbers.** `waitMs` p50 under 0.05 ms. Slow commits in growth phases at most 2. Zero-reader arm at most 74 slow
  commits. Both-stamp medians within 0.3 ms of Finding 2's table.
- **Guardrails.** Frozen trace, seed and bars unchanged. Oracle PASS. `scheduler.ts` and `driver.ts` are in the bench source
  hash, so this starts a new comparison series; say so in the report. Quiet-host rule and the lock as today.
- **Hours.** 6 to 8.

### Brief LF-2. Find and remove the idle penalty

- **North star.** P2 commit p50 at 256 readers, both bands.
- **Goal.** Name the layer that goes cold after 50 ms and show one arm in which a commit after 1 s of idleness costs what a
  commit after 25 ms costs.
- **Steps.**
  1. A driver mode that offers one 10-fact commit every G ms, G = 10, 25, 50, 100, 250, 1,000, with 150 commits per G, zero
     readers, full trace level.
  2. Arm P: plain.
  3. Arm S: a sentinel container on the database disk that writes and syncs 4 KB every 10 ms and logs each latency.
  4. Arm W: a warm-up request every 20 ms that is refused at the serial point (a commit whose precondition names a triple id
     that does not exist). Send it under its own client id, so it never enters the writer's ordered sequence in
     `commit_order.clj`. Prove first, with `d/tx-range`, that a refused commit leaves no datom.
  5. Arm T: `sysctl net.ipv4.tcp_slow_start_after_idle=0` in the VM.
  6. Report service p50 and each layer's span by G and arm.
- **Deciding numbers.** In some arm, service p50 at G = 1,000 is within 0.5 ms of G = 25. The per-layer table names what each
  arm repaired.
- **Guardrails.** No stored data may change in arm W. Arms S and W are bench or product settings that need Sam's ruling
  (question 1) before a verdict uses them.
- **Hours.** 4 to 6.

### Brief LF-3. Separate the disks and prepare the WAL

- **North star.** P2 all-commit p99, and the P1 writer ratios.
- **Goal.** Nothing but Postgres writes to the disk that Postgres syncs, and no commit creates a WAL segment.
- **Steps.**
  1. Stack bring-up (`lab/experiments/EXP-DX1/stack/up.sh`): after Postgres starts on the seed clone, emit 512 MB of WAL,
     `CHECKPOINT`, with `min_wal_size=1GB`. ABA zero-reader arm of 200 s.
  2. Diagnostic: the 450 s ladder with the driver's `/driver` volume on tmpfs. Compare slow commits in sparse phases with the
     matched zero-reader arm.
  3. If step 2 confirms Finding 4: add a second, preallocated Lima disk for the `<prefix>-pg-data` volume, under the lock, and
     run a full quiet pair.
- **Deciding numbers.** Step 1: fewer slow commits in the burst. Step 2: sparse-phase slow commits in the loaded arm at most 3
  above the zero-reader arm. Step 3: loaded all-commit p99 at most 50 ms.
- **Guardrails.** `fsync`, `synchronous_commit` and `full_page_writes` stay on. Sealed seeds are cloned, never changed. The
  tmpfs arm is a diagnostic, not a verdict.
- **Hours.** 6 to 8.

### Brief LF-4. One Postgres commit per log write

- **North star.** P2 median and all-commit p99.
- **Goal.** A log append waits for one WAL flush.
- **Steps.**
  1. Probe: the trigger of item 1 on `datomic_kvs` in a diagnostic stack. ABA zero-reader arm of 200 s. Stop here if peer
     wait p50 does not fall by 0.4 ms beyond drift.
  2. Wrapper: a JDBC driver class on `DATOMIC_EXT_CLASSPATH` that delegates to `org.postgresql.Driver` and pairs the INSERT
     and UPDATE as item 1 describes. Set `sql-driver-class` and `sql-url` in `up.sh`. Log how many pairs it formed.
  3. Tests: the four statement shapes against a real Postgres; a pair whose UPDATE matches no row; a held INSERT that is read
     back; the 1 ms release.
  4. Crash test: 50 runs that stop Postgres with `pg_ctl stop -m immediate` at a random moment under load, restart the
     stack, and check that every acknowledged commit is present and the oracle passes.
  5. One full quiet pair.
- **Deciding numbers.** Pairs formed for at least 95% of log appends. Median gain at least 0.5 ms beyond drift. Zero lost
  acknowledged commits in the crash test.
- **Guardrails.** The probe never appears in a verdict. No durability setting changes in the wrapper arm.
- **Hours.** 2 for the probe, 10 to 14 for the wrapper and its tests.

### Brief LF-5. Fewer datoms per commit: the replay harness

- **North star.** P2 medium band (11 to 25 facts), H10, H5.
- **Goal.** Price five layout changes without rebuilding a seed.
- **Steps.**
  1. Record 300 commit payloads (100 per band) from a run: a flag in `storage.clj` `submit!` that writes `data` before
     `transact-async`.
  2. A peer script that replays them with `d/with` on a clone of the 10,000 seed and reports apply time, function time,
     datoms, and index visits from `:tx-stats`, per band.
  3. Shapes: A today; B journal packed (item 3); C as B with clock splice (4a), high-water id check (5), one read per retract
     (6) and the claim on the transaction (34); D change rows not sent at all (N1); E rows on a new entity (N4).
  4. Repeat shapes A, C and E read-only on the sealed 100,000 seed with `:io-context` and report storage reads per commit.
- **Deciding numbers.** Shape C lowers the medium band's apply by at least 30% at 10,000. Storage reads per commit at 100,000
  by shape.
- **Guardrails.** `d/with` writes nothing. Sealed seeds are opened read-only or cloned. No new layout is adopted from this
  brief; it produces a table.
- **Hours.** 6 to 8.

---

## 5. Beliefs to re-test, and questions for Sam

### Beliefs the project holds that the records do not support

**About the medians.**

1. **"With 256 readers the commit median rises."** The zero-reader arm reads the same in the same window (Finding 1). Item
   27's table in every report tests it.
2. **"With zero readers a commit is 10.5 ms at p50."** That is the median of a mix of 7.4 to 8.0 ms warm and alone, 9.5 to 10.8
   ms overlapping another commit, 10.3 to 11.3 ms after an idle gap.
3. **"TypeScript's CPU is 0.33 to 0.68 ms of a commit."** That counts synchronous scopes only. The writer thread burns 4.9 ms
   of CPU per commit in bursts, bookkeeping included. Item 8's profile tests it.
4. **"Setting-level tuning is exhausted."** Four settings with a structural reason are untried, items 14, 15, 17 and 20.
5. **"Two transactor cores cost 6.5% of reads."** Only when the second core is taken from the readers (item 14).

**About the tail.**

1. **"The tail's main cause is below Postgres, in the Mac's virtual disk."** In part. 15 to 18 slow commits per arm are the
   growth step. The loaded arms' excess appears only with readers, when the harness writes to the same disk. About 14 WAL
   segments are created per arm. Items 11, 19, 20 and 22 test it.
2. **"Raw fdatasync is 0.113 ms, so the disk is not in the median."** The raw test ran alone and back to back. In a run a WAL
   sync averages 0.31 ms (3,488 ms over 11,390 syncs, `t1/ANATOMY-a.md`), and the largest part of the idle penalty is in peer
   wait. Item 22 tests it.
3. **"P1's writer ratios show what readers do to writers."** Each is the largest of 46 commits (Finding 6).

**About method.**

1. **"Hints are slower."** At 1,000 subjects with a hot cache. Item 30 tests it at 100,000.
2. **"Fewer bytes do not help."** The slim trial kept every datom and added CPU at the serial point. Item 3's replay tests it.
3. **"A layout change costs a day of seeding."** Not with a transcoder (item 32).
4. **"Group commit above the engine fixes the median."** At 10,000 two commits rarely wait together. It is a 100,000 item.

### Questions for Sam

**These five decide the shortlist.**

1. **Keeping warm.** May the store keep its own commit path warm with background requests that write nothing, and still count
   as the product? If the idle cost turns out to be the VM's disk path, may the bench keep the disk awake, as it keeps the
   CPUs awake with `nohlt`?
2. **Where the clock stops.** Is the "published ACK" the moment the receipt is handed to the caller? That is 0.41 ms earlier
   than today's stamp.
3. **Small samples.** May the P1 writer ratios, the recovery bar and the 256-reader medians be computed over pooled windows of
   at least 500 commits?
4. **Change rows.** Is it enough that every Triplex route returns `:_tx/change` and `:_tx/changed-entity`, computed from what
   the transaction stored, or must they be stored as rows (N1)?
5. **Durability and disk stalls on this bench.** The VM's sync is best-effort, not safe against power loss. Accept that as the
   standing condition, and report commits that overlap a stall the independent sentinel also saw apart from the rest? Or
   require a full sync, which costs about 3 ms per flush here and makes item 1 a precondition?

**These four can wait.**

6. **Disk and hardware.** Can the Mac get under 80% full, or get an external NVMe SSD for the VM disk? Is the Linux machine
   available for one reading (N9)?
7. **Backdated record time in live scopes** (open since 2026-11-13). Recommendation: valid time only. Server-assigned record
   time is already decided, strict scopes are what let the local copy answer time-pinned reads, and imports that carry old
   record times can use a separate non-strict scope.
8. **Split-read rule** (open since 2026-11-13). Recommendation: `pending`. `mixed` parks 231 of 256 closed-loop readers
   waiting for a future command. In the reviewer's replay `pending` straddles 3,135 commands against 3,178, with the same
   checks (`STATUS.md`, 2026-11-11 16:20).
9. **P5 publication.** Does the 100 s bar cover evaluation, with changed outputs published behind it in paced ordinary commits
   (item 33)? Or should activation be one fact with derived outputs (N5)?

---

## Appendix A. Scripts behind the [C] numbers

All three read `driver/ns-writes.jsonl` and `driver/ns-report.json` of a run folder under `evidence/DX-T1/`. Primary commits
are rows with `stream == "background"` and `resend == false`. Phases come from `ns-report.json` `phases[].{name,start,end}`,
matched on `scheduledAt`. Run with `python3 -I`.

**Script 1. Slow commits by phase type (Finding 3 and 4).**

```python
import json, collections, sys
tag = sys.argv[1]
rows = [json.loads(l) for l in open(f"{tag}/driver/ns-writes.jsonl")]
rep = json.load(open(f"{tag}/driver/ns-report.json"))
phases = [(p["name"], p["start"], p["end"]) for p in rep["phases"]]
def phase(t):
    return next((n for n, s, e in phases if s <= t < e), "between")
by = collections.Counter()
for r in rows:
    if r["stream"] == "background" and not r["resend"] and r["latencyMs"] > 50:
        n = phase(r["scheduledAt"])
        by["burst" if n in ("L4", "L16", "tail") else "growth" if n in ("grow3", "grow10") else "sparse"] += 1
print(tag, dict(by), sum(by.values()))
```

**Script 2. Service time by idle gap (Finding 1).**

```python
import json, bisect, collections, statistics, sys
tag = sys.argv[1]
rows = sorted((json.loads(l) for l in open(f"{tag}/driver/ns-writes.jsonl")), key=lambda r: r["startedAt"])
rows = [r for r in rows if not r.get("expired")]
fins = sorted(r["finishedAt"] for r in rows)
bins = [(0, 50), (50, 100), (100, 250), (250, 1000)]
out = collections.defaultdict(list)
for i, r in enumerate(rows):
    if r["stream"] != "background" or r["resend"] or r["facts"] > 25:
        continue
    band = "small" if r["facts"] <= 10 else "medium"
    s = r["startedAt"]
    if any(o["finishedAt"] > s for o in rows[max(0, i - 40):i]):
        key = "overlap"
    else:
        j = bisect.bisect_left(fins, s)
        gap = s - fins[j - 1] if j else 1e9
        key = next((f"{a}-{b}" for a, b in bins if a <= gap < b), ">=1000")
    out[band, key].append(r["latencyMs"] - r["waitMs"])
for k in sorted(out):
    print(tag, k, len(out[k]), round(statistics.median(out[k]), 2))
```

**Script 3. Medians with the timer lateness and the post-ACK bookkeeping removed (Finding 2).**

```python
import json, statistics, sys
tag = sys.argv[1]
rows = [json.loads(l) for l in open(f"{tag}/driver/ns-writes.jsonl")]
rep = json.load(open(f"{tag}/driver/ns-report.json"))
s, e = next((p["start"], p["end"]) for p in rep["phases"] if p["name"] == "L256")
prim = [r for r in rows if r["stream"] == "background" and not r["resend"] and not r["expired"]]
late = lambda r: sum(q["end"] - q["start"] for q in (r.get("queue") or []) if q["cause"] == "scheduler-late")
fix = lambda r: r["ackPublishedAt"] - r["scheduledAt"] - late(r)
band = lambda f: "small" if f <= 10 else "medium" if f <= 25 else "large"
for b in ("small", "medium"):
    w = [r for r in prim if s <= r["scheduledAt"] < e and band(r["facts"]) == b]
    u = [r for r in prim if r["burst"] and band(r["facts"]) == b]
    print(tag, b, "L256", round(statistics.median(r["latencyMs"] for r in w), 2), round(statistics.median(map(fix, w)), 2),
          "burst", round(statistics.median(r["latencyMs"] for r in u), 2), round(statistics.median(map(fix, u)), 2))
allf = sorted(map(fix, prim)); alll = sorted(r["latencyMs"] for r in prim)
print(tag, "p99", round(alll[int(len(alll) * 0.99)], 1), round(allf[int(len(allf) * 0.99)], 1))
```

The statement counts in item 1 come from `gzip -dc evidence/DX-T1/tx2-dxt1-cost-a-2-full/pg.log.gz`, grouped by the first 80
characters of each executed statement. The WAL totals come from `storage-census.jsonl` in each run folder of pair F.

## Appendix B. Outside sources

| Tag | Source | Used for |
| --- | --- | --- |
| W1 | Node.js timers documentation, https://nodejs.org/api/timers.html : "When delay is larger than 2147483647 or less than 1 or NaN, the delay will be set to 1. Non-integer delays are truncated to an integer." | Finding 2, item 24 |
| W2 | Apple, `VZDiskImageSynchronizationMode`, https://developer.apple.com/documentation/virtualization/vzdiskimagesynchronizationmode : `fsync` "Synchronizes data to the drive using the system's best-effort synchronization mode"; `full` "Synchronizes data to the permanent storage holding the disk image." Lima's use of the `fsync` mode is from R4 (`research/2026-11-11/R4-testbed-and-commit-path.md`) | Finding 4, H17 |
| W3 | PostgreSQL 17, WAL configuration, https://www.postgresql.org/docs/17/runtime-config-wal.html : `min_wal_size` "old WAL files are always recycled for future use at a checkpoint"; `wal_init_zero` "causes new WAL files to be filled with zeroes" | Finding 5, item 20 |
| W4 | PostgreSQL 17, same page and https://www.postgresql.org/docs/17/wal-async-commit.html : "the behavior for any one transaction is determined by the setting in effect when it commits"; "The risk that is taken by using asynchronous commit is of data loss, not data corruption." | Item 1's probe, N2 |
| W5 | Johnson, Pandis, Stoica, Athanassoulis, Ailamaki, "Aether: A Scalable Approach to Logging", PVLDB 3(1), 2010, https://infoscience.epfl.ch/record/149436/files/vldb10aether.pdf : flush pipelining and early lock release | N2 |
| none found | A search for APFS sync stalls on a nearly full volume under Virtualization returned no source that covers the combination | Item 23 |
