# DX-RE1: how Triplex should write to the Datomic transactor

Ranked changes to the gateway's commit function, transaction shape, schema, settings and connection handling that
[TRANSACTOR-NOTES.md](TRANSACTOR-NOTES.md) says would lower commit time or its tail. None is implemented here. Step numbers
(step 7, step 12 …) refer to the path in the notes. Evidence tags: **S** read in the code, **O** seen in the recorded DX-T1
`full` run, **I** inferred.

## The numbers every item is judged against

1. Measured without tracing: a commit is 13.0 ms at p50 and the client's transact call is 11.4 ms of it. The P2 bar is 10 ms
   at p50 and 50 ms at p99.
2. In the traced run (O, steady window, ms, p50 / p90 / p99): peer transact 9 / 22 / 47. Of that, send leg 1.9 / 5.7 / 17.5;
   inside the transactor 4.1 / 11.2 / 30.6; ack leg 2.0 / 6 / 15. Inside the transactor, the apply is 1.15 / 5.2 / 14.7, the
   transaction function 0.49 / 3.0 / 9.3, and the two-statement log write 1.07 / 2.2 / 5.4.
3. Per Datomic transaction there are about 3.1 Postgres commits: 2 for the tail append, about 0.5 for tail resets and 0.7
   for log-tree segments. Writer batches hold one transaction 98% of the time (O).
4. 13% of commits wait on Postgres reads at the serial point, about 5.5 ms each when they do. In the 2 s after an index
   adoption the share is 26% (O).

## Ranked list

| # | Change | Kind | Expected effect | Risk to exactness or durability | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | Take per-commit logging off the commit path | setting | p50 0.3–1.5 ms, plus tail (I) | none | an XML file |
| 2 | Give the transactor (and Postgres) CPUs no other container uses | setting | send and ack legs and hand-off waits shrink; size unknown (I) | none | flags exist |
| 3 | Make `:triplex/commit` read less at the serial point | code | apply mean −0.5 ms, p99 −3 to −5 ms (I) | medium | days |
| 4 | Turn off TLS between peers and transactor | setting | 0.1–0.5 ms per commit (I) | none | one property |
| 5 | Write fewer bytes per transaction | layout | ~0.3 ms mean and a lower tail; ~0.8 fewer Postgres commits per transaction (I) | medium | days |
| 6 | Fewer, cheaper index adoptions | setting | fewer post-adoption slow windows (I) | none (memory and GC) | properties |
| 7 | Combine already-queued commits into one Datomic transaction | code | throughput and burst tail; little at low load (I) | high | a week |
| 8 | Measure with `:io-context`, not transactor logs | tooling | lets 1–7 be judged in untraced runs | none | hours |

### 1. Take per-commit logging off the commit path

1. **Reason (S).** With tracing off, the transactor and both gateways load `bin/logback.xml`: root INFO, a `prudent`
   rolling file appender that locks the file on every write. Five INFO lines sit on every commit's path before the
   acknowledgement:
   - `:kv-cluster/update-pod` begin and end, inside the log write on the send-off thread (step 12);
   - `:tx/process` on the writer thread before `:logged` is delivered (step 13);
   - `:peer/transact` start on the Jetty thread, and end on the notifier thread before the future is delivered (steps 2
     and 15).
2. **Evidence (O).** In the `full` run, 549 log-file writes inside the log write took 1 ms or more (max 34 ms), and 73 on the
   writer thread (max 13.5 ms). DX-T1's ablation put the extra `full` logging at +3.1 ms per commit. The default INFO
   logging was never measured, because every "off" arm still had it.
3. **Change.** Give the transactor and the gateways a logback file that sets `datomic.transaction`, `datomic.kv-cluster`,
   `datomic.peer`, `datomic.update` and `datomic.log` to WARN. If the records are wanted, use logback's `AsyncAppender` with
   `neverBlock=true` over a non-prudent appender instead. Pass it with `-Dlogback.configurationFile` in `up.sh`, as the
   trace level already does.
4. **Expected effect.** 0.3–1.5 ms at p50 and a shorter tail. This is inferred from the five synchronous appends and the
   observed ≥1 ms writes; it needs measuring.
5. **Risk.** None to exactness or durability, because logs are not data. Transactor diagnostics are lost; item 8 replaces
   them.
6. **Experiment.** Paired off-level arms, 10k subjects, zero readers and L256, same seed: default logging against quiet
   logging. Compare commit p50/p99 and client transact p50, and check that the gateway's `transactMicros` drops.

### 2. Give the transactor (and Postgres) CPUs no other container uses

1. **Reason (S + I).** Every commit crosses about ten threads: peer connector, Netty, reader, processor, fressianer,
   writer, send-off thread, writer again, block-notifier, Netty, peer notifier. Each hand-off needs a CPU to run on
   promptly. Our placement puts the transactor on VM CPUs 0–1, Postgres (which runs the commits' WAL flushes) on CPU 0 and
   the write gateway on CPU 1. The 1.9 ms send leg, the 2.0 ms ack leg and the 2.9 ms inside the transactor that is not
   apply are mostly hand-offs and queues (O for the sizes, I for the cause).
2. **Change.** Placement arms with `--cpus-tx` / `--cpus-pg` / `--cpus-gw-write` (or `DX_CPUS_*`). For example: transactor on
   two CPUs of its own, Postgres on one of its own, write gateway on one of its own, with reader work moved off them.
3. **Expected effect.** Shorter send and ack legs and less in-transactor queueing. The size is unknown; H2's dedicated Node
   writer core cut run-queue wait sharply.
4. **Risk.** None to exactness or durability. It costs CPUs that readers or the driver lose; the split is H9 item 4 and is
   Sam's decision.
5. **Experiment.** Three paired placement arms at zero readers and L256. Compare the client transact p50/p99 and the
   transactor's guest run-queue wait.

### 3. Make `:triplex/commit` read less at the serial point

1. **Reason (S + O).** The transaction function is the largest serial cost: mean 1.14 ms, p99 9.3 ms, out of an apply of
   1.15 ms p50 and 14.7 ms p99. Every read it makes runs on the one processor thread. A cold segment there costs a SQL read
   plus about 1.85 ms of deserialising per segment. The apply's reads average 203 AVET node visits per commit, against 20
   EAVT and 10 AEVT.
2. **Changes, in order of value.**
   1. **Stop scanning the history index for every new row.** `identity-row` runs `d/index-range` on `(d/history db)` over
      `:triplex.entity/row` row texts for every `:triplex/assert`, about one per new row, to prove a row id was never used.
      A lean v4 layout could assert a short, never-retracted, `:db.unique/value` row-id datom per row. Datomic's own unique
      check (one current-AVET lookup on a short string, mean 0.004 ms each in our counters) would then enforce the same
      rule, and the history scan goes. That datom could also replace the AVET index on full row texts (see item 5).
   2. **Read `:triplex.entity/rev` the way Datomic will.** The function reads rev through EAVT (`value` →
      `d/datoms :eavt`), and the cardinality-one retraction of the old rev in `Db.addData` reads it again through AEVT
      (`find-aevt`). That is the same fact in two different segments. Reading it with `d/datoms db :aevt :triplex.entity/rev e`
      makes the second lookup hit the segment the first one loaded. Most observed serial-point storage stalls were in exactly
      that AEVT lookup (5–29 ms each).
   3. **Do not re-assert the identity of existing subjects.** `tx-data` sends `{:db/id "e:x" :triplex.entity/id x}` for
      every subject. For an existing subject Datomic resolves the upsert (AVET) and then finds the assertion redundant (AEVT)
      and drops it (O: 1 redundant datom per commit). The function already resolves `(d/entid db [:triplex.entity/id x])`
      for its rev check, so it could put the entity id in place of the tempid and emit the identity datom only for new
      subjects.
3. **Expected effect.** Apply mean about −0.5 ms. Apply p99 −3 to −5 ms, because cold history and AEVT reads were the stalls
   (I).
4. **Risk to exactness.** Medium. 3.2.1 changes the layout and needs a migration rule. Born-retired and imported rows must
   also get the id datom, or reuse detection breaks. 3.2.2 and 3.2.3 keep semantics if every new subject still gets its
   identity datom.
5. **Experiment.** First off the serial point: a peer's `d/with` runs the same `datomic.db/with-tx` (S: `Db.with` →
   `with-tx+opts` → `with-tx`). Replay a few hundred recorded commit payloads against a copy of the 10k seed with each
   variant and compare `:tx-stats` and `:io-stats`. Then the 300-scenario exactness suite with mutants, then a paired stack
   run reading apply and `tx-fn-ms` through item 8.

### 4. Turn off TLS between peers and the transactor

1. **Reason (S + O).** `encrypt-channel` defaults to true, and our transactor's start record shows `:encrypt-channel true`.
   Every transaction message (about 12 KB at p50) and every notification to each of the two gateways goes through Netty's
   TLS handler, on CPUs the commit path shares.
2. **Change.** `encrypt-channel=false` in the transactor properties (`up.sh` writes `sql.properties`). The peers follow the
   transactor's published flag.
3. **Expected effect.** Small: 0.1–0.5 ms per commit across both legs, more under CPU contention (I).
4. **Risk.** None to exactness or durability. Peer ↔ transactor traffic becomes plain text on the VM's private Docker
   network; whether that is acceptable outside the lab is Sam's call.
5. **Experiment.** One paired off-level arm, run in the same session as item 1 but as its own arm.

### 5. Write fewer bytes per transaction

1. **Reason (S + O).** Each transaction adds about 12 KB to the log tail (O: median chunk 12,049 bytes for 45 datoms). The
   tail is reset whenever it passes 54,000 bytes. Each reset is a read and two writes on the **writer** thread, ahead of
   the next commit, and comes with about three log-tree segment inserts. At 12 KB that is a reset every 4.2 transactions; at
   3 KB it would be every 18. Bytes are also serialised twice (log and notification), sent over TLS to every peer, and fill
   the memory index, which sets how often index jobs and cold adoptions happen.
2. **Change.** First find what the 12 KB is: `d/tx-range` over a recorded seed, Fressian size by attribute. Then cut
   duplicates. Candidates from the source:
   - the full canonical row text is both the value of `:triplex.entity/row` and an AVET index entry;
   - retirement markers repeat the row prefix;
   - per-fact columns that equal the commit's own metadata.

   Dropping `:db/index` on `:triplex.entity/row` in favour of the short row-id datom of item 3.2.1 removes the largest AVET
   entries.
3. **Expected effect.** From about 3.1 to about 2.3 Postgres commits per transaction. Tail resets ahead of a commit fall from
   24% to about 6% of commits. Mean about −0.3 ms, with a lower tail and fewer index jobs (I).
4. **Risk to exactness.** Medium. It is a layout change; readers and history decoding must match. Run it through the same
   suite as item 3.
5. **Experiment.** Byte census first (no stack). Then a paired run comparing tail resets per transaction (`kv-cluster` reset
   count, or Postgres updates per insert) and commit p99.

### 6. Fewer, cheaper index adoptions

1. **Reason (S + O).** Each index adoption runs `complete-indexing` on the processor thread before queued transactions. It
   then leaves new index segments uncached. For 2 s, 26% of commits read Postgres during apply, with apply p50 7.6 ms
   against 1.2 ms in steady state. Over `memory-index-max` the processor stops taking transactions altogether.
2. **Change.** Raise `memory-index-threshold` (256m → 512m or 1g) with `memory-index-max` and heap to match. Keep
   `object-cache-max` at 1g in every stack: the `up.sh` default is still 128m, so any experiment that forgets
   `DX_OBJECT_CACHE` measures a colder serial point.
3. **Expected effect.** Fewer slow windows per hour, so a lower p99 (I). The p50 is unchanged.
4. **Risk.** None to exactness or durability: the log is durable before the acknowledgement and indexes are derived. Costs
   transactor heap (GC pauses are already p50 11.7 ms, max 70 ms), longer index jobs and longer peer catch-up after a
   restart.
5. **Experiment.** A threshold sweep on one seed over a long window. Count adoptions, apply p99 in the 5 s after each, and
   commit p99.

### 7. Combine already-queued commits into one Datomic transaction

1. **Reason (S + O).** The transactor's only group commit is at the log write, and it merges only what is already queued
   (step 11). At our load 98% of writes hold one transaction. Every Datomic transaction pays the fixed costs once: send
   leg, reader, apply dispatch, transaction entity, log write (two commits), two serialisations and a notification to
   every peer.
2. **Change.** In the gateway, when several ordered commits for different subjects are waiting for `transact-async` at the
   same moment, send them as one `[:triplex/commit-many [...]]`. Never wait to gather more. The function validates each
   payload on its own and returns the operations of the valid ones plus a per-commit outcome datom, instead of throwing.
3. **Expected effect.** Little at low load, where nothing is queued. Under bursts and at L256 it cuts queueing, Postgres
   commits and notifications per logical commit (H4, H5) (I).
4. **Risk to exactness.** High. A Datomic transaction is atomic, so one bad payload must not fail the others. Per-commit
   positions, operation ids, claims and strict clocks must stay exactly as if sent alone, and a lost acknowledgement now
   covers several commits.
5. **Experiment.** Prototype behind a flag. Model-check outcomes against single sends on the oracle, then compare burst
   drain and p99 at L256.

### 8. Measure with `:io-context`, not with transactor logs

1. **Reason (S).** If the gateway passes `:io-context` to `d/transact-async`, the transactor returns that transaction's
   `:io-stats` (reads by index, storage reads, deserialise time) in the notification. The peer puts them in the report.
   No transactor logging is needed.
2. **Change.** Add `:io-context :triplex/commit` to the `transact-async` call and record `:io-stats` on the commit span.
3. **Risk.** None.
4. **Experiment.** Check that the totals match the `:tx/process` log of a `full` run on the same seed, then use it to judge
   items 1–7 in untraced runs.

## Rejected, with the reason

| Idea | Why not |
| --- | --- |
| `synchronous_commit=off`, or `sql-driver-params` `options=-c synchronous_commit=off` | Acknowledgements would come before the log is on disk. That breaks durability, which is the floor. |
| `commit_delay` in Postgres | Applies only with at least `commit_siblings` (5) concurrent transactions. The writer issues its statements one at a time, so it would add delay and save nothing. |
| `alter-var-root` of `datomic.log/segment-threshold` from our code on the transactor classpath | Changes undocumented internals of the log format. Acceptable only as a throw-away diagnostic of what tail resets cost. |
| Commit hints (`TX2_COMMIT_HINTS=true`) | Already measured slower. The reading agrees: the peer runs the whole apply in `d/with` to make the hints, and the hints only help when transactions queue at the transactor. |
| Peer-side validation in place of the transaction function | The serial point must decide (DX-B3-M2); `d/with` on a peer runs against an older db value. Item 3 makes the serial work cheaper instead. |
