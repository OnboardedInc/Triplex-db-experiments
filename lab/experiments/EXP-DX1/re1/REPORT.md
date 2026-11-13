# DX-RE1 report: the Datomic transactor, read from its jar

**Licence: Apache License 2.0, which allows this study.** The distribution's `LICENSE` (`datomic-pro-1.0.7745/LICENSE`,
the same bytes as `/opt/datomic/LICENSE` in image `tx2-datomic:1.0.7745-da00`) is "Apache License, Version 2.0, January
2004". Section 2 grants "a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to
reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work". It has
no clause against decompiling; `pom.xml` names the same licence. Decompiled code stays outside this repository.
Details: [TRANSACTOR-NOTES.md](TRANSACTOR-NOTES.md); proposals: [WRITE-BETTER.md](WRITE-BETTER.md).

## The ten most useful facts

1. **One thread applies all transactions, one at a time.** Each database has its own eight-thread pipeline. Our
   transaction function and all of Datomic's checks run on `processor-<db>`. The next apply overlaps the previous log write.
2. **The peer only queues and sends.** No validation, expansion or tempid work happens on the peer. Messages travel over
   TLS by default, and our stack has it on.
3. **A log write is two autocommitted statements in series**: `INSERT` of a tail chunk (this batch's bytes), then
   `UPDATE … where rev=?` of the database's tail row. That is two Postgres commits and two WAL flushes. The acknowledgement
   leaves the transactor only after both return.
4. **Datomic batches only what is already queued.** At our load 98% of log writes hold a single transaction. Counting the
   amortised work, one Datomic transaction costs about **3.1 Postgres commits**, and a commit waits for about 2.5 of them.
5. **Our transactions are about 12 KB of log each.** So the log tail, cut at a fixed 54,000 bytes, is reset about every four
   transactions. The reset (a read and two writes) runs on the writer thread, ahead of the next commit.
6. **The transactor's own work is under half of a commit.** `full`-traced p50: send leg 1.9 ms, transactor 4.1 ms
   (apply 1.15, of which our function 0.49; log write 1.07), acknowledgement leg 2.0 ms. Total 9 ms.
7. **Our `:triplex/commit` function is the largest serial cost**: mean 1.14 ms, p99 9.3 ms. It scans the history index
   once per new row. Datomic's own checks per commit (4 upserts, 5 redundancy lookups, 5 unique checks) are cheap, except
   the redundancy lookups when their segments are cold.
8. **Cold index segments stall the serial point.** 13% of commits read Postgres during apply, about 5.5 ms each including
   1.85 ms of deserialising per segment. In the 2 s after an index adoption, which itself runs on the processor thread, it
   is 26% of commits, with apply p50 at 7.6 ms.
9. **Default logging sits on every commit's path.** Root INFO with a `prudent` file appender puts five synchronous lines on
   every commit, one of them between the durable write and the acknowledgement. No arm has measured it, because every
   "off" arm keeps it.
10. **Most limits are fixed in code.** The tail threshold, the 512 KiB batch limit and the reader queue of 5 are not
    settable; log writes bypass `write-concurrency`; `up.sh` still defaults the object cache to 128m (DX-T1 runs use 1g).

## Most promising changes (ranked in WRITE-BETTER.md)

Quiet the per-commit logging; give the transactor CPUs of its own; make the commit function read less (no history scan,
rev read through AEVT, no redundant identity datoms); turn off TLS; write fewer bytes per transaction; have fewer index
adoptions; combine already-queued commits; measure with `:io-context` instead of transactor logs.

## What could not be determined

1. **The CPU split of the send and acknowledgement legs** (TLS, Artemis, hand-offs): the recorded JFR has no execution
   samples. Also unknown: how long an index adoption holds the processor, what default logging costs untraced, which
   attributes make up the 12 KB, how Artemis blocks a non-durable send, and Postgres's flush time per commit.
2. **The live sampling step was not done.** DX-T1 held the lock for the first part of the work, and the stack harness
   needs installs and builds this worktree lacks (no `node_modules`, no `dist`), which would have run beside DX-T1. The reading was checked against DX-T1's recorded `full` run of the same image
   (`tx2-dxt1-cost-a-2-full`: JFR stacks, transactor, storage and peer logs, Postgres statement log). Every static claim
   matched; the tail-reset rate was not predicted. Next live check: add `-XX:StartFlightRecording=settings=profile` to
   `DX_TX_JAVA_OPTS` on an untraced 1k run.

## Method

REA CLI 6.9.0 (through `npx` with npm `node@24.22.1`; REA refused the Mac's Node 22.23.1): `inspect-artifact` inventoried
both jars completely (9,889 and 5,905 entries, no integrity contradictions); `compare-artifacts` showed the peer jar is a
separate compile and that the gateway runs the transactor jar's peer code. REA has no JVM-class route, so Vineflower
1.11.1, CFR 0.152 and `javap` did the reading under REA's evidence rules (S/O/I tags). Downloads are logged in
`lab/DOWNLOADS.md`; `tx-log-stats.py` reproduces the observed numbers.
