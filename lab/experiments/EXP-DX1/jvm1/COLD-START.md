# First full-load window after a start

The full-size checkpoint shows that the delay at 235 saves/s was in the sender queue. The loaded window followed a five-minute quiet-account window on the same new stack, so it does not measure time from a production restart. The second 150 seconds delivered 234.97 ACKs/s at 45.68 ms p99, down from 5,575.28 ms in the first 150 seconds. Individual 15-second windows could still cross 50 ms. [Rolling comparison and checkpoint inventory](https://github.com/OnboardedInc/Triplex-db-experiments/blob/86fc52d30/lab/experiments/EXP-DX1/bm1/ROLLING-READING.md)

## What the archives establish

The verified barrier checkpoint lists the raw data hashes in `summary.json.rawSha256`. The archive contains the plan, seed, header, completion and summary. It has no `r235-loaded.json`, `prep1-native.ndjson`, `counters.ndjson`, index or PostgreSQL logs or JVM logs. Its `plan.json` lists `r235-alone` before `r235-loaded`. The rolling producer also checks predecessor and seed witnesses before scheduling cells. The exact per-second record, a true cold-start curve, and the individual settlement times of the JVMs, caches, index and checkpoints are unavailable from this checkpoint.

| Barrier6 at 235/s | 0–150 s | 150–300 s | Interpretation |
| --- | ---: | ---: | --- |
| Offer-to-ACK p50 / p99 | 15.35 / 5,575.28 ms | 6.61 / 45.68 ms | A long tail with steady half-window goodput |
| ACKs in window / s | 235.03 | 234.97 | No expired saves |
| Quiet p99 loaded / prior solo | 104.29 / 42.61 ms | 34.99 / 16.91 ms | The quiet account also paid for older turns |
| CPU cores, transactor / writer / reader / PostgreSQL | 0.942 / 0.685 / 0.040 / 0.232 | 0.655 / 0.529 / 0.032 / 0.186 | Zero throttled periods. Means can hide brief single-thread saturation |
| Whole-cell stage p99 | sender queue 5,287.07 ms, HTTP 33.40 ms | gateway prepare 20.70 ms, submit to native entry 18 ms, native compute 5.88 ms | Stage quantiles do not add up and are not share estimates |
| Whole-cell native reads per save | 0.70 SQL, 0.169 ms SQL and 0.357 ms decode means | 1.10 SQL with seed predecessor, 0.50 with an ordered predecessor | Lookup mix and cache state vary together |

The earlier 90-second scorecard's ordered-writer ZGC arm has exact per-offer clocks and native spans. It has a different cut, a six-minute prelude and prior windows. The compressed CSV linked in [the evidence index](SHA256SUMS) supplies a row for every second 0–149. Barrier6 values are unavailable across all rows. Earlier-scorecard seconds 90–149 are also unavailable. The script binds scorecard operations to the arm hash and the earlier stage ledger to its source, slot, attempt and operation ID. [Earlier scorecard and definitions](https://github.com/OnboardedInc/Triplex-db-experiments/blob/c8f903ce1/lab/experiments/EXP-DX1/prep1/SCORECARD-FRESH-READING.md)

| Seconds from earlier scorecard's full-load offers | Range of per-second ACK p99 | Range of per-second sender queue p99 | Share of excess save time | SQL reads/save · mean SQL + decode |
| --- | ---: | ---: | ---: | ---: |
| 0–14 | 201–2,398 ms | 185–2,390 ms | 48.5% | 1.22 · 1.58 ms |
| 15–29 | 49–2,547 ms | 41–2,540 ms | 48.3% | 1.54 · 1.41 ms |
| 30–44 | 37–289 ms | 27–273 ms | 2.2% | 1.24 · 0.98 ms |
| 45–59 | 37–172 ms | 24–165 ms | 0.3% | 1.16 · 0.86 ms |
| 60–74 | 23–192 ms | 14–181 ms | 0.5% | 1.06 · 0.78 ms |
| 75–89 | 28–321 ms | 14–298 ms | 0.1% | 0.25 · 0.22 ms |
| 90–149 | unavailable | unavailable | unavailable | unavailable |

Excess is the sum of each acknowledged save's latency above 50 ms. The earlier arm observed 10,312 slow saves and 7,371.382 excess save-seconds. **97.3% waited behind older six-credit turns.** On the last ACK's path during that wait, 55.4 percentage points were in the transactor queue, 15.1 in gateway preparation, 13.3 in transactor apply and 1.6 in durable append. The slow save's own transactor queue, apply and append accounted for 0.83%, 0.39% and 0.08%. At 235/s, six credits need to turn over every 25.53 ms under even arrivals. A long turn ties up all six credits, and many subsequent offers can inherit the delay. The earlier arm lost most of its excess by 30 s and still had p99 spikes through the last second. [Stage and overlap ledger](https://github.com/OnboardedInc/Triplex-db-experiments/blob/c8f903ce1/lab/experiments/EXP-DX1/prep1/SCORECARD-FRESH-READING.md)

| Possible cause | Identifiable share and settlement |
| --- | --- |
| JVM interpreter, tiered compilation and code-cache changes | No attributable share or settlement time. Same-host JVM safepoint overlap in the earlier critical path was 2.96% for the writer and below 0.01% for the transactor, with queue effects able to outlast a pause. No matched compiler timeline. Falling CPU at similar throughput fits several explanations |
| Datomic object/index-cache misses | SQL reads varied with time and predecessor type. Elapsed SQL plus decode could cover at most 0.18% of excess directly inside the slow saves' own apply in the earlier arm. SQL inside older turns could delay many more saves. Reads do not identify which cache missed or its independent settlement time |
| PostgreSQL shared buffers and OS page cache | No attributable share or independent settlement time. `pg_stat_io` reads may be satisfied by the kernel page cache. Match those deltas to cgroup device reads and read time. Neither counter alone identifies causal overlap with a particular save |
| First Datomic index job and checkpoints | No attributable share or settle time. Append is a durable call plus scheduling, and its own p99 does not measure checkpoint time. Need index build/adoption, WAL sync, checkpointer counters and logs on the same clock |
| Queueing and overload | Directly located for the earlier 235/s arm. At 394 and 620 the second halves still delivered less than offered, so continued overload contributes even after the system has seen several minutes of load |

## A. Changes with no advance traffic or data reads

These are forecasts for the matched server command. Individual effects are conditional and cannot be added. The configured server JVMs remain Java 25 ZGC for the transactor and Java 21 G1 for the peers.

| Setting | Reason | Predicted reduction in time to settled p99 | Predicted change in early p99 |
| --- | --- | ---: | --- |
| Bundled CDS in all three JVMs, `-Xshare:on` in the tuned arm | Reuse JDK classes from the exact pinned runtime. Default `auto` may already map the same archive. Require and check actual static archive mapping in the trial | 0–2 s | 0–2% lower |
| Compiler scaling 0.75 transactor, 0.65 writer, 1 reader. Compiler threads 2 / 3 / 2; tier 4 retained | Move hot methods toward optimized code sooner on the three-core transactor and four-core writer. Keep the one-core reader's threshold and threads. Earlier compilation can compete with ZGC or save handling | 5–20 s sooner if compile-bound, up to 10 s later if CPU competition dominates | 5–20% lower if compile-bound, up to 10% higher otherwise |
| Initial code cache 32 / 32 / 16 MiB, reserve 240 MiB | Reduce initial growth while retaining the established capacity for C1 and C2. Check cache-full/sweep and code transitions in actual logs | 0–3 s | 0–3% lower |
| Initial heap 4 GiB / 1 GiB / 512 MiB, caps 24 / 4 / 3 GiB | Give allocation more room before expanding. Increments total 3.75 GiB of initial heap inside existing container caps. Keep lazy touching, the transactor's 16 GiB object-cache limit and existing peer cache settings. More cache capacity cannot fill an empty cache faster | 0–10 s | 0–10% lower if early heap growth was material |
| PostgreSQL `min_wal_size=512MB`, `max_wal_size=4GB` | Recycle WAL and defer size-requested checkpoints. Keep 2 GiB shared buffers, the time-based checkpoint settings, separate WAL and durability. Larger WAL can lengthen recovery | 0 with no requested checkpoint, up to 15 s if one is on the critical path | 0 without a requested checkpoint, up to 15% lower if checkpoints dominate |
| Offered 235/s, admit up to roughly 120/160/200/220/235 per second in 15-second steps, 25 ms pre-dispatch budget | Protect the six-credit backlog and return explicit retryable pre-dispatch refusals. The rate cap exempts quiet offers, which still face the queue age limit. The command tests this at ingress; clients must treat an explicit refusal differently from a timed-out mutation | ACK-only 30–60 s sooner if queueing dominates; minimum 60 s for all-offer settlement under the ramp | First 30 s acknowledged p99 80–350 ms. All-offer p99 cannot be served if refusals exceed 1% |

Java 25 AOT builds use a training run and `-XX:AOTCacheOutput`, then consume a build/OS/architecture/classpath-specific artifact with `-XX:AOTCache`. Java 25 can retain method profiles and share loaded/linked classes, with machine code still compiled by the JIT. Class-data sharing works with ZGC. Full AOT object caching with ZGC is a JDK 26 change. Today's Java 21 peers cannot use Java 25 artifacts. The trial uses the pinned runtimes' bundled archives. An offline, data-free application archive for a future all-Java-25 G1 configuration might reduce process readiness by 1–5 s and early p99 by 0–5%. No trained artifact is shipped for this profile. [Java 25 options](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html) · [Class data sharing](https://docs.oracle.com/en/java/javase/25/vm/class-data-sharing.html) · [Java 25 method profiling](https://docs.oracle.com/en/java/javase/25/migrate/significant-changes-jdk-25.html) · [Java 26 support for any collector](https://docs.oracle.com/en/java/javase/26/migrate/significant-changes-jdk-26-release.html)

## B. Advance reads or exercise for the owner's decision

These forecasts are conditional on the named cause. On 2026-11-23 the owner allowed a one-time read before admission (the first row; the second is covered by the reads it makes). It is built as an off-by-default step with its own restart trial in [STARTUP-READ.md](STARTUP-READ.md). Replaying saves and synthetic saves (rows three and four) remain out.

| One-time startup mechanism | Prediction |
| --- | --- |
| Peer or transactor reads of selected hot keys before admission | If misses drive older turns, could move 15–45 s of settling before service opens and cut early p99 by 10–40%. Reads would deliberately fill application caches |
| PostgreSQL `pg_prewarm` or an otherwise deliberate filesystem read of selected relation blocks | If physical reads dominate, could move 5–30 s before admission and cut early p99 by 5–25%. A full sweep could take longer and evict needed pages |
| Replay recent saves before taking new traffic | If compilation and index activity dominate, might move 30–90 s before admission and reduce post-open p99 by 20–70%. This exercises the real mutation path and has side-effect and ordering implications |
| Synthetic save-path exercise before opening ingress | Might move 15–60 s before admission and reduce post-open p99 by 10–50%; a synthetic dataset may miss the real read and index costs. This deliberately warms the application |

[PostgreSQL resource settings](https://www.postgresql.org/docs/17/runtime-config-resource.html) · [WAL checkpoint settings](https://www.postgresql.org/docs/17/runtime-config-wal.html) · [Statistics and kernel cache caveat](https://www.postgresql.org/docs/17/monitoring-stats.html) · [Datomic indexing](https://docs.datomic.com/operation/capacity.html)
