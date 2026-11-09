# XN-S1: native XTDB 2.2.0 floors

Diagnostic spike under PROTOCOL 0b. No PASS, contract, receipts, Triplex invocation or product conclusion. Authority: lab/SCOPE.md, NORTH-STAR.md and TARGETS.md.

| Case | Headline observation | R51 section 5 prediction | TARGETS bar it bears on |
| --- | --- | --- | --- |
| One 1,500-byte document | Highest 2459.45 pulls/engine CPU-s (read-settled3-a-16); p50/p99 3.32/14.91 ms | 300–800 queries/CPU-s on quiet 2-CPU node | P4: 1,100 pulls/CPU-s; single-client p50 ≤5, p99 ≤25 ms |
| 95 small documents, one IN query | Highest 62.58 pulls/engine CPU-s (read-settled3-b-4); p50/p99 41.06/62.41 ms | None | P4: 1,100 pulls/CPU-s; single-client p50 ≤5, p99 ≤25 ms |
| One pre-joined 135,000-byte document | Highest 1709.98 pulls/engine CPU-s (read-settled3-c-16); p50/p99 5.19/13.26 ms | None | P4: 1,100 pulls/CPU-s; single-client p50 ≤5, p99 ≤25 ms |
| Small document, per-pull earlier basis | Highest 2031.51 pulls/engine CPU-s (read-supplemental-d-16); p50/p99 4.37/12.63 ms | None | P4: 1,100 pulls/CPU-s; single-client p50 ≤5, p99 ≤25 ms; P1 basis overhead |
| closed-one-aged | p50/p99 5.08/15.09 ms; n=1000 | None | P2 p50 ≤10, p99 ≤50 ms |
| closed-one-fresh | p50/p99 3.31/7.19 ms; n=1000 | None | P2 p50 ≤10, p99 ≤50 ms |
| closed-two-aged | p50/p99 3.99/7.36 ms; n=1000 | None | P2 p50 ≤10, p99 ≤50 ms |
| closed-two-fresh | p50/p99 3.45/7.08 ms; n=1000 | None | P2 p50 ≤10, p99 ≤50 ms |
| open-one-aged-15-r0 | p50/p99 16.47/90.25 ms; n=928 | None | P2 p50 ≤10, p99 ≤50 ms |
| open-one-aged-55-r0 | p50/p99 7.88/38.95 ms; n=3349 | None | P2 p50 ≤10, p99 ≤50 ms |
| open-one-aged-55-r16 | p50/p99 16.08/90.70 ms; n=3349 | None | P1 writer p99 ≤1.25× zero readers |
| open-two-aged-15-r0 | p50/p99 16.04/32.27 ms; n=928 | None | P2 p50 ≤10, p99 ≤50 ms |
| open-two-aged-55-r0 | p50/p99 9.34/35.09 ms; n=3349 | None | P2 p50 ≤10, p99 ≤50 ms |

**Highest observed subject pulls per engine CPU-second:** (a) 2459.45; (b) 62.58; (c) 1709.98. One query is one pull in every case, including the 95-document query. These are maxima over the measured cases, not a claim of XTDB’s universal maximum.

## Conditions and exact commands

Exclusive xtdb-s1, holder XN-S1, EXP-XN1, Mac Node v22.23.1, localhost:5471. Engine image sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77. Container 943630e10a155e08ade6d528726bac9a18064ccab8a932cae046ab68ad8d48d9. VM CPUs 4,5; 2-CPU quota; 3.5 GiB memory; heap 2 GiB/direct 1 GiB. The slot YAML has no explicit server.numThreads override (the 2.2.0 default is 42, as documented in R16 1.1); peak writer+reader sockets here are 32. No separate read-only listener was used: this slot exposes writer pgwire 5432; the optional follower is a separate process and was not started. Shared residents and other agents’ containers were untouched. No downloads or package installation. engine-profile.json retains the exact mounted YAML, its SHA256, JVM options and read-back caps before cleanup.

```sh
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder XN-S1 --exp EXP-XN1 --cpuset-cpus 4,5
node lab/bin/heavy.mjs --label XN-S1-seed -- node lab/experiments/EXP-XN1/spike-s1/read.mjs seed
lab/experiments/EXP-XN1/spike-s1/reads.sh immediate
lab/experiments/EXP-XN1/spike-s1/rest.sh
```

The exact loop expansion is in reads.sh/rest.sh/commits.sh/inline.sh. inline.sh runs after the coupling result and records its matched current/inline-pinned pairs in inline.log. The first rest.sh attempt failed before flushing; rest-attempt2.log records successful settling followed by a client cancelled after >15 minutes without a result. settled-first-cancel.json records that outcome; no latency or CPU number is adopted from it. A second interrupted attempt (settled2-cancel.json, reads-settled2.log) exposed the cause: the copied client destroyed sockets after two idle minutes waiting for the lock, and subsequently writing to a destroyed socket could leave an unresolved promise. wire.mjs now keeps idle, non-pending sockets alive and rejects writes/prepares on destroyed sockets. The completed retry is settled3 (reads-settled3.log), and commits.sh resumes X2/X3 (commits-attempt2.log). The first pass has completed result arrays; neither interrupted settled attempt is adopted. Each timed child takes the canonical mkdir measurement lock, retries every 5 s, releases it in finally/signal handlers, and exits at 14 minutes. Seed, warmup and history setup are not timed floor runs. Heavy children all use lab/bin/heavy.mjs.

## X1: point reads

Seed: 102000 rows in 16.27 s, 100,000 small rows in 250-row inserts and 2,000 large rows in 10-row inserts. Documents have exactly 1,500/135,000 UTF-8 bytes: id prefix plus repeated x padding. This is deliberately simple and highly compressible data. Reads traverse deterministic rotating ids, not one fixed id: small id=(query index×97+document offset) mod 100,000; large id=(index×17) mod 2,000. The 5,000-query small runs visit 5,000 roots, not all 100,000 roots; large runs cycle all 2,000 roots.

Named prepared statements: Parse once per connection, then Bind/Describe portal/Execute/Sync; no repeated Parse in ordinary X1 queries. Every connection warms up with 100 successful pulls before measurement. Each case has 5,000 measured queries total across the configured clients. No worker threads for standalone X1. Case b uses 95 scalar text parameters in _id IN ($1,…,$95), returning 142,500 payload bytes. No alternative batch syntax was benchmarked.

First timing began 2026-11-09T20:20:46.728Z, 54.12 s after seed completion (including warmup and shared-lock wait). “Immediate” means first sequential pass, not every case starting immediately after seeding: its later cases follow the earlier timed runs. There was no initial forced flush; automatic flushing was allowed, and block b00 already existed before the explicit settle step. This is not a pure all-live-index versus all-disk comparison. A small marker commit and an initial failed writer correctness setup occurred during the first pass; exact limitations are below.

Settling: forced POST http://127.0.0.1:8080/system/finish-block via docker exec wget; then <0.05 cores and compactor jobs available=0, every 5s for 60s. Criterion reached=true, total helper 71.83 s, including an empty second checkpoint and 5 s wait. Then a marker write refreshed the cached live snapshot (R30 section 2.2); this is not a restart. The second pass warms connections again. Untimed preflight guard checks added six fresh, disjoint payload rows after settling while the retry waited for the lock; the seeded read domain remained unchanged. The recorded xn_ent tries were both level 1, with 101,820 and 180 rows (102,000 total), and xn_ent had no live-table rows after the refresh. Raw block listing, trie/live-table observations and each idle CPU sample are in settle.json.

Primary two-pass pinned case d: BEGIN READ ONLY WITH (SNAPSHOT_TOKEN='ChUKBHh0ZGISDQoLCOjVyNcGEPCJkTY=', CLOCK_TIME=TIMESTAMP '2026-11-09 20:19:52.601777+00:00'), prepared SELECT, COMMIT, pipelined in one socket write per pull. The token names the completed seed; a subsequent marker transaction makes it earlier than the node’s latest basis. There is no AWAIT_TOKEN or wait because the local node already indexed this basis. This measures per-pull read-transaction/pinning cost together; it does not isolate only token decoding. The main domain is unchanged between bases. After X3, inline.sh additionally pairs a current read with R16 1.2’s leaner prepared SETTING SNAPSHOT_TOKEN=..., CLOCK_TIME=TIMESTAMP ... SELECT ... query at 1/4/16 clients (5,000 timed pulls each, 100 warmups/connection). These are labelled supplemental: they run after the write/history workload, not immediately after seeding. Their only pin cost is the inline query setting, without BEGIN/COMMIT. The summary takes the highest observed result across both pin forms; the per-case name identifies which run it came from.

| Case | n | p50 | p90 | p99 | max | wall s | ops/s | ops/s/quota core | engine CPU-s | ops/engine CPU-s | host CPU-s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| read-immediate-a-1 | 5000 | 1.92 | 3.97 | 7.85 | 20.97 | 11.45 | 436.81 | 218.40 | 13.27 | 376.87 | 0.88 |
| read-immediate-a-4 | 5000 | 1.46 | 3.17 | 6.38 | 14.68 | 2.30 | 2176.37 | 1088.19 | 4.13 | 1210.52 | 0.53 |
| read-immediate-a-16 | 5000 | 4.43 | 10.43 | 20.18 | 66.44 | 1.78 | 2816.25 | 1408.13 | 3.11 | 1610.01 | 0.47 |
| read-immediate-b-1 | 5000 | 22.19 | 35.75 | 90.51 | 392.86 | 131.47 | 38.03 | 19.02 | 127.08 | 39.34 | 13.86 |
| read-immediate-b-4 | 5000 | 49.47 | 91.53 | 268.25 | 953.76 | 78.80 | 63.45 | 31.73 | 113.55 | 44.03 | 11.27 |
| read-immediate-b-16 | 5000 | 234.71 | 363.68 | 672.28 | 1022.64 | 81.23 | 61.56 | 30.78 | 122.37 | 40.86 | 14.41 |
| read-immediate-c-1 | 5000 | 1.52 | 2.77 | 5.03 | 17.86 | 9.13 | 547.92 | 273.96 | 5.89 | 848.43 | 1.94 |
| read-immediate-c-4 | 5000 | 2.09 | 2.96 | 4.66 | 8.41 | 2.78 | 1796.54 | 898.27 | 3.40 | 1469.95 | 1.28 |
| read-immediate-c-16 | 5000 | 6.20 | 11.07 | 19.20 | 34.77 | 2.20 | 2276.95 | 1138.47 | 3.65 | 1369.77 | 1.29 |
| read-immediate-d-1 | 5000 | 1.60 | 2.32 | 4.63 | 45.04 | 8.98 | 556.55 | 278.28 | 7.54 | 663.40 | 1.38 |
| read-immediate-d-4 | 5000 | 2.12 | 3.81 | 8.06 | 15.32 | 3.12 | 1603.92 | 801.96 | 4.92 | 1016.04 | 0.80 |
| read-immediate-d-16 | 5000 | 6.83 | 14.50 | 25.81 | 45.59 | 2.56 | 1951.99 | 975.99 | 4.64 | 1077.27 | 0.62 |
| read-settled3-a-1 | 5000 | 1.10 | 1.29 | 2.57 | 51.95 | 5.70 | 877.22 | 438.61 | 4.63 | 1078.86 | 1.36 |
| read-settled3-a-4 | 5000 | 1.31 | 1.75 | 3.28 | 8.28 | 1.73 | 2890.26 | 1445.13 | 2.65 | 1883.62 | 0.63 |
| read-settled3-a-16 | 5000 | 3.32 | 6.56 | 14.91 | 39.07 | 1.27 | 3946.29 | 1973.14 | 2.03 | 2459.45 | 0.35 |
| read-settled3-b-1 | 5000 | 18.28 | 20.80 | 24.84 | 55.33 | 93.18 | 53.66 | 26.83 | 91.88 | 54.42 | 9.21 |
| read-settled3-b-4 | 5000 | 41.06 | 47.44 | 62.41 | 98.61 | 52.55 | 95.14 | 47.57 | 79.89 | 62.58 | 8.06 |
| read-settled3-b-16 | 5000 | 165.59 | 196.94 | 227.60 | 281.40 | 52.31 | 95.59 | 47.80 | 80.06 | 62.45 | 9.16 |
| read-settled3-c-1 | 5000 | 1.34 | 1.69 | 3.03 | 10.18 | 7.23 | 691.61 | 345.80 | 4.48 | 1114.93 | 1.65 |
| read-settled3-c-4 | 5000 | 1.93 | 2.71 | 4.39 | 7.87 | 2.58 | 1939.06 | 969.53 | 3.61 | 1386.17 | 1.06 |
| read-settled3-c-16 | 5000 | 5.19 | 8.64 | 13.26 | 29.35 | 1.79 | 2790.71 | 1395.36 | 2.92 | 1709.98 | 1.12 |
| read-settled3-d-1 | 5000 | 1.42 | 1.71 | 3.20 | 12.63 | 7.51 | 665.63 | 332.82 | 6.01 | 831.74 | 0.90 |
| read-settled3-d-4 | 5000 | 2.03 | 3.02 | 4.79 | 10.20 | 2.75 | 1819.23 | 909.61 | 4.34 | 1151.25 | 0.51 |
| read-settled3-d-16 | 5000 | 5.17 | 10.70 | 18.68 | 44.34 | 1.94 | 2575.96 | 1287.98 | 3.52 | 1420.75 | 0.45 |
| read-supplemental-a-1 | 5000 | 1.51 | 1.86 | 2.89 | 14.83 | 7.89 | 633.89 | 316.95 | 5.83 | 857.91 | 1.43 |
| read-supplemental-a-4 | 5000 | 2.12 | 2.80 | 4.59 | 17.91 | 2.77 | 1804.82 | 902.41 | 4.27 | 1171.60 | 0.83 |
| read-supplemental-a-16 | 5000 | 5.58 | 10.21 | 15.38 | 25.45 | 1.94 | 2573.23 | 1286.61 | 3.11 | 1609.89 | 0.46 |
| read-supplemental-d-1 | 5000 | 1.28 | 1.72 | 2.86 | 8.48 | 6.79 | 736.12 | 368.06 | 4.91 | 1019.07 | 1.28 |
| read-supplemental-d-4 | 5000 | 1.55 | 2.01 | 3.19 | 10.09 | 2.02 | 2475.96 | 1237.98 | 3.10 | 1614.97 | 0.73 |
| read-supplemental-d-16 | 5000 | 4.37 | 7.93 | 12.63 | 21.09 | 1.53 | 3275.42 | 1637.71 | 2.46 | 2031.51 | 0.52 |

All latency columns are milliseconds. Engine CPU is whole-container usage_usec delta; it includes background work in that window. Node process.cpuUsage includes all generator worker threads, but excludes Docker observation subprocesses. CPU observations bracket the wall-timed function, so very small boundary/observation overhead remains. The requested operations/engine CPU-second is an efficiency metric; TARGETS 1.1 P4.3 separately defines per-core throughput using the bound quota. The ops/s/quota-core column divides wall throughput by two and must not be confused with measured CPU efficiency. Raw absolute counters are retained from the later X1 cases onward; the initial a/b runs retain the computed delta only.

<details>
<summary>read-immediate-a-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:20:46.728Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     99.85%    251.8MiB / 3GiB     8.19%     586B / 126B       3.05MB / 65.5kB   44
943630e10a15   tx2-xtdb-s1      3.91%     880.1MiB / 3.5GiB   24.56%    424MB / 737kB     76.6MB / 2.02GB   44
1acfc78a670c   tx2-dxs1-tx      0.85%     300.7MiB / 2GiB     14.68%    45.2kB / 62.9kB   84.3MB / 348kB    71
5856becf11c3   tx2-dxs1-pg      0.23%     80.85MiB / 1GiB     7.90%     63.1kB / 48.7kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   44.64%    1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:21:00.429Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     0.56%     517.6MiB / 3GiB     16.85%    794B / 284B       3.89MB / 233kB    110
943630e10a15   tx2-xtdb-s1      1.73%     888.2MiB / 3.5GiB   24.78%    425MB / 9.55MB    76.6MB / 2.02GB   44
1acfc78a670c   tx2-dxs1-tx      0.37%     300.7MiB / 2GiB     14.68%    45.5kB / 64kB     84.3MB / 348kB    71
5856becf11c3   tx2-dxs1-pg      0.00%     80.86MiB / 1GiB     7.90%     64.1kB / 49.1kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-a-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:21:03.020Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     0.86%     517.7MiB / 3GiB     16.85%    794B / 284B       3.89MB / 287kB    110
943630e10a15   tx2-xtdb-s1      3.47%     889MiB / 3.5GiB     24.80%    425MB / 10.3MB    76.6MB / 2.02GB   44
1acfc78a670c   tx2-dxs1-tx      0.64%     300.7MiB / 2GiB     14.68%    45.7kB / 64.6kB   84.3MB / 348kB    71
5856becf11c3   tx2-dxs1-pg      0.00%     80.86MiB / 1GiB     7.90%     64.7kB / 49.3kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   32.85%    1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:21:06.912Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     2.95%     517.9MiB / 3GiB     16.86%    794B / 284B       3.89MB / 287kB    111
943630e10a15   tx2-xtdb-s1      3.00%     890.7MiB / 3.5GiB   24.85%    426MB / 19.1MB    76.6MB / 2.02GB   44
1acfc78a670c   tx2-dxs1-tx      0.85%     300.8MiB / 2GiB     14.69%    46kB / 65.1kB     84.3MB / 348kB    71
5856becf11c3   tx2-dxs1-pg      0.10%     80.86MiB / 1GiB     7.90%     65.3kB / 49.5kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-a-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:21:09.720Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     0.80%     518.1MiB / 3GiB     16.86%    864B / 284B       3.89MB / 340kB    112
943630e10a15   tx2-xtdb-s1      3.59%     891.9MiB / 3.5GiB   24.89%    427MB / 21.9MB    76.6MB / 2.02GB   51
1acfc78a670c   tx2-dxs1-tx      0.23%     300.8MiB / 2GiB     14.69%    46kB / 65.1kB     84.3MB / 348kB    71
5856becf11c3   tx2-dxs1-pg      0.00%     80.86MiB / 1GiB     7.90%     65.3kB / 49.5kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:21:12.844Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     0.88%     518.2MiB / 3GiB     16.87%    864B / 284B       3.89MB / 340kB    112
943630e10a15   tx2-xtdb-s1      1.32%     895.3MiB / 3.5GiB   24.98%    428MB / 30.7MB    76.6MB / 2.02GB   54
1acfc78a670c   tx2-dxs1-tx      0.21%     300.8MiB / 2GiB     14.69%    46.1kB / 65.5kB   84.3MB / 365kB    71
5856becf11c3   tx2-dxs1-pg      0.03%     80.86MiB / 1GiB     7.90%     65.7kB / 49.6kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-b-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:21:16.821Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     3.18%     520.2MiB / 3GiB     16.93%    1.42kB / 850B     4.07MB / 340kB    116
943630e10a15   tx2-xtdb-s1      3.77%     897.7MiB / 3.5GiB   25.05%    428MB / 46.4MB    76.6MB / 2.02GB   60
1acfc78a670c   tx2-dxs1-tx      1.15%     300.8MiB / 2GiB     14.69%    46.3kB / 66.1kB   84.3MB / 365kB    71
5856becf11c3   tx2-dxs1-pg      0.03%     80.86MiB / 1GiB     7.90%     65.7kB / 49.6kB   40.5MB / 49.1MB   10
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.27%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:23:30.493Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     1.31%     655.9MiB / 3GiB     21.35%    2.81MB / 8.53MB   4.15MB / 4.06MB   250
943630e10a15   tx2-xtdb-s1      2.67%     643.5MiB / 3.5GiB   17.95%    461MB / 827MB     76.9MB / 2.03GB   54
1acfc78a670c   tx2-dxs1-tx      2.60%     979MiB / 2GiB       47.80%    258MB / 267MB     84.5MB / 2.24MB   92
5856becf11c3   tx2-dxs1-pg      0.42%     109.8MiB / 1GiB     10.72%    140MB / 130MB     40.5MB / 140MB    13
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.25%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-b-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:23:37.406Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
03c359640b71   tx2-dxb1-dev     1.04%     655.7MiB / 3GiB     21.34%    2.81MB / 8.53MB   4.15MB / 4.06MB   250
943630e10a15   tx2-xtdb-s1      1.47%     643.2MiB / 3.5GiB   17.95%    464MB / 890MB     76.9MB / 2.03GB   54
1acfc78a670c   tx2-dxs1-tx      0.37%     979MiB / 2GiB       47.80%    258MB / 267MB     84.5MB / 2.24MB   92
5856becf11c3   tx2-dxs1-pg      0.28%     109.8MiB / 1GiB     10.72%    140MB / 130MB     40.5MB / 141MB    13
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.25%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:24:58.399Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O           BLOCK I/O         PIDS
a2b810136556   tx2-dxh1-a1-pg   0.00%     36.41MiB / 512MiB   7.11%     9.95kB / 8.27kB   4.1kB / 47.4MB    6
03c359640b71   tx2-dxb1-dev     106.57%   487.9MiB / 3GiB     15.88%    682B / 242B       4.1kB / 81.9kB    66
943630e10a15   tx2-xtdb-s1      1.92%     643.7MiB / 3.5GiB   17.96%    497MB / 1.67GB    76.9MB / 2.03GB   54
1acfc78a670c   tx2-dxs1-tx      0.26%     977.7MiB / 2GiB     47.74%    258MB / 267MB     84.5MB / 2.33MB   78
5856becf11c3   tx2-dxs1-pg      0.12%     109.9MiB / 1GiB     10.74%    140MB / 130MB     40.5MB / 150MB    13
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB   45.25%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-b-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:26:03.933Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
6b2fc724c3f1   tx2-dxh1-a2-tx   0.29%     201.3MiB / 1.465GiB   13.42%    11.3kB / 11.4kB   0B / 156kB        21
ee30e9abd070   tx2-dxh1-a2-pg   0.01%     42.59MiB / 512MiB     8.32%     21kB / 18.5kB     8.19kB / 47.4MB   10
03c359640b71   tx2-dxb1-dev     1.79%     514.1MiB / 3GiB       16.74%    934B / 284B       4.1kB / 492kB     94
943630e10a15   tx2-xtdb-s1      4.14%     734MiB / 3.5GiB       20.48%    508MB / 1.92GB    76.9MB / 2.03GB   52
1acfc78a670c   tx2-dxs1-tx      0.89%     1.111GiB / 2GiB       55.57%    486MB / 529MB     84.5MB / 16.1MB   111
5856becf11c3   tx2-dxs1-pg      0.24%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 484MB    14
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.584GiB / 3.5GiB     45.25%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:27:26.427Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
9f895aa919e1   tx2-dxh1-a4-gw-w   0.05%     315.8MiB / 1.465GiB   21.05%    25.9kB / 19.5kB   0B / 65.5kB       41
96081c156dec   tx2-dxh1-a4-tx     0.19%     272.1MiB / 1.465GiB   18.14%    36.6kB / 42.8kB   0B / 197kB        65
c450f000238b   tx2-dxh1-a4-pg     0.01%     46.11MiB / 512MiB     9.01%     48.8kB / 44.7kB   0B / 47.6MB       12
03c359640b71   tx2-dxb1-dev       50.78%    469.8MiB / 3GiB       15.29%    942B / 392B       0B / 147kB        67
943630e10a15   tx2-xtdb-s1        0.61%     734.8MiB / 3.5GiB     20.50%    541MB / 2.7GB     76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.11%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.00%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.577GiB / 3.5GiB     45.07%    367kB / 2.07MB    181MB / 519MB     13
ddb0f06d96a1   tx2-dxh1-a4-gw-r   65.80%    113.3MiB / 1.465GiB   7.55%     706B / 276B       0B / 0B           14
```

</details>

<details>
<summary>read-immediate-c-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:27:29.989Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   90.97%    234.5MiB / 1.465GiB   15.63%    854B / 384B       0B / 0B           16
9f895aa919e1   tx2-dxh1-a4-gw-w   0.25%     315.9MiB / 1.465GiB   21.06%    26.2kB / 19.7kB   0B / 65.5kB       42
96081c156dec   tx2-dxh1-a4-tx     0.47%     272.1MiB / 1.465GiB   18.14%    37kB / 43.4kB     0B / 197kB        65
c450f000238b   tx2-dxh1-a4-pg     0.18%     46.14MiB / 512MiB     9.01%     49.4kB / 44.8kB   0B / 47.6MB       12
03c359640b71   tx2-dxb1-dev       12.39%    506.1MiB / 3GiB       16.47%    1.5kB / 958B      0B / 147kB        111
943630e10a15   tx2-xtdb-s1        1.03%     735.1MiB / 3.5GiB     20.51%    541MB / 2.72GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.47%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.10%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     44.41%    1.577GiB / 3.5GiB     45.07%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:27:40.748Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.74%     319.3MiB / 1.465GiB   21.29%    28.8kB / 21.3kB   0B / 73.7kB       42
9f895aa919e1   tx2-dxh1-a4-gw-w   1.91%     316.4MiB / 1.465GiB   21.10%    28.2kB / 21.2kB   0B / 115kB        44
96081c156dec   tx2-dxh1-a4-tx     1.48%     273.4MiB / 1.465GiB   18.23%    49.7kB / 55.9kB   0B / 197kB        69
c450f000238b   tx2-dxh1-a4-pg     0.03%     51.31MiB / 512MiB     10.02%    60.2kB / 63.2kB   0B / 47.7MB       15
03c359640b71   tx2-dxb1-dev       1.10%     538MiB / 3GiB         17.51%    43.6kB / 27.4kB   0B / 180kB        160
943630e10a15   tx2-xtdb-s1        1.19%     735.2MiB / 3.5GiB     20.51%    542MB / 3.39GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.33%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.02%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     23.21%    1.586GiB / 3.5GiB     45.31%    367kB / 2.07MB    181MB / 519MB     16
```

</details>

<details>
<summary>read-immediate-c-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:27:43.275Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.91%     319.5MiB / 1.465GiB   21.30%    28.9kB / 21.5kB   0B / 73.7kB       43
9f895aa919e1   tx2-dxh1-a4-gw-w   0.18%     316.4MiB / 1.465GiB   21.10%    28.2kB / 21.2kB   0B / 115kB        44
96081c156dec   tx2-dxh1-a4-tx     0.40%     273.4MiB / 1.465GiB   18.23%    49.9kB / 56kB     0B / 197kB        69
c450f000238b   tx2-dxh1-a4-pg     0.09%     51.31MiB / 512MiB     10.02%    60.2kB / 63.2kB   0B / 47.7MB       15
03c359640b71   tx2-dxb1-dev       0.58%     538.2MiB / 3GiB       17.52%    43.6kB / 27.4kB   0B / 180kB        161
943630e10a15   tx2-xtdb-s1        1.86%     735.2MiB / 3.5GiB     20.51%    542MB / 3.45GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.53%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.00%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:27:47.755Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.89%     319.7MiB / 1.465GiB   21.31%    29kB / 21.6kB     0B / 90.1kB       44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.18%     316.5MiB / 1.465GiB   21.10%    28.4kB / 21.4kB   0B / 131kB        44
96081c156dec   tx2-dxh1-a4-tx     0.67%     273.5MiB / 1.465GiB   18.23%    50.5kB / 56.9kB   0B / 197kB        69
c450f000238b   tx2-dxh1-a4-pg     0.04%     53.84MiB / 512MiB     10.52%    60.8kB / 63.4kB   0B / 48.1MB       15
03c359640b71   tx2-dxb1-dev       0.86%     538.3MiB / 3GiB       17.52%    43.6kB / 27.4kB   0B / 180kB        161
943630e10a15   tx2-xtdb-s1        1.71%     735.2MiB / 3.5GiB     20.51%    543MB / 4.12GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.47%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.00%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-c-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:27:50.800Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     319.7MiB / 1.465GiB   21.31%    29kB / 21.6kB     0B / 90.1kB       44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.11%     316.5MiB / 1.465GiB   21.10%    28.5kB / 21.6kB   0B / 131kB        44
96081c156dec   tx2-dxh1-a4-tx     0.22%     273.5MiB / 1.465GiB   18.24%    50.8kB / 57.5kB   0B / 197kB        69
c450f000238b   tx2-dxh1-a4-pg     0.01%     53.84MiB / 512MiB     10.52%    61.3kB / 63.5kB   0B / 48.1MB       15
03c359640b71   tx2-dxb1-dev       2.64%     538.4MiB / 3GiB       17.53%    43.6kB / 27.4kB   0B / 180kB        161
943630e10a15   tx2-xtdb-s1        1.15%     735.2MiB / 3.5GiB     20.51%    544MB / 4.34GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.29%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.18%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 493MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:27:55.147Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.13%     319.7MiB / 1.465GiB   21.31%    29.2kB / 21.8kB   0B / 106kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.15%     316.5MiB / 1.465GiB   21.10%    28.6kB / 21.8kB   0B / 143kB        44
96081c156dec   tx2-dxh1-a4-tx     0.18%     273.5MiB / 1.465GiB   18.24%    51.4kB / 58.4kB   0B / 197kB        69
c450f000238b   tx2-dxh1-a4-pg     0.03%     53.85MiB / 512MiB     10.52%    61.9kB / 63.7kB   0B / 48.2MB       15
03c359640b71   tx2-dxb1-dev       0.65%     538.5MiB / 3GiB       17.53%    43.6kB / 27.4kB   0B / 180kB        161
943630e10a15   tx2-xtdb-s1        1.44%     735.2MiB / 3.5GiB     20.51%    545MB / 5.02GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.36%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.51%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 494MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-d-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:27:57.747Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.65%     319.7MiB / 1.465GiB   21.31%    29.4kB / 22kB     0B / 123kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.16%     316.5MiB / 1.465GiB   21.10%    28.6kB / 21.8kB   0B / 156kB        44
96081c156dec   tx2-dxh1-a4-tx     0.45%     273.5MiB / 1.465GiB   18.24%    51.6kB / 58.5kB   0B / 213kB        69
c450f000238b   tx2-dxh1-a4-pg     0.00%     53.85MiB / 512MiB     10.52%    61.9kB / 63.7kB   0B / 48.2MB       15
03c359640b71   tx2-dxb1-dev       1.27%     538.5MiB / 3GiB       17.53%    43.6kB / 27.4kB   0B / 180kB        161
943630e10a15   tx2-xtdb-s1        1.81%     735.3MiB / 3.5GiB     20.52%    545MB / 5.02GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.36%     1.11GiB / 2GiB        55.49%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.40%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 494MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:28:08.351Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.17%     319.7MiB / 1.465GiB   21.31%    29.6kB / 22.4kB   0B / 147kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.15%     316.5MiB / 1.465GiB   21.10%    28.9kB / 22.2kB   0B / 176kB        44
96081c156dec   tx2-dxh1-a4-tx     0.59%     273.6MiB / 1.465GiB   18.24%    52.9kB / 60.2kB   0B / 221kB        69
c450f000238b   tx2-dxh1-a4-pg     0.03%     53.87MiB / 512MiB     10.52%    63.1kB / 64.2kB   0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       0.63%     545.6MiB / 3GiB       17.76%    86.6kB / 53.7kB   0B / 246kB        168
943630e10a15   tx2-xtdb-s1        1.72%     736.3MiB / 3.5GiB     20.54%    547MB / 5.03GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.55%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.46%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 496MB    14
a809fb6cb3ba   tx2-qlever-dev     35.52%    1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-d-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:28:10.959Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     319.7MiB / 1.465GiB   21.31%    29.6kB / 22.4kB   0B / 147kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     316.5MiB / 1.465GiB   21.10%    29kB / 22.4kB     0B / 176kB        44
96081c156dec   tx2-dxh1-a4-tx     0.25%     273.6MiB / 1.465GiB   18.24%    53.4kB / 60.9kB   0B / 221kB        69
c450f000238b   tx2-dxh1-a4-pg     0.03%     53.87MiB / 512MiB     10.52%    63.7kB / 64.4kB   0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       0.53%     545.6MiB / 3GiB       17.76%    86.6kB / 53.7kB   0B / 246kB        168
943630e10a15   tx2-xtdb-s1        1.62%     736.1MiB / 3.5GiB     20.54%    547MB / 5.03GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.57%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.28%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 496MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:28:15.738Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.16%     319.7MiB / 1.465GiB   21.31%    29.7kB / 22.6kB   0B / 160kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.16%     316.5MiB / 1.465GiB   21.10%    29.1kB / 22.6kB   0B / 188kB        44
96081c156dec   tx2-dxh1-a4-tx     2.06%     273.7MiB / 1.465GiB   18.25%    54kB / 61.7kB     0B / 221kB        69
c450f000238b   tx2-dxh1-a4-pg     0.04%     53.87MiB / 512MiB     10.52%    64.3kB / 64.7kB   0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       0.93%     545.7MiB / 3GiB       17.76%    86.6kB / 53.7kB   0B / 274kB        168
943630e10a15   tx2-xtdb-s1        1.75%     736MiB / 3.5GiB       20.54%    549MB / 5.04GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.34%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.41%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 497MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-immediate-d-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T20:28:18.722Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.25%     319.7MiB / 1.465GiB   21.31%    29.9kB / 22.8kB   0B / 172kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.10%     316.5MiB / 1.465GiB   21.10%    29.1kB / 22.6kB   0B / 205kB        44
96081c156dec   tx2-dxh1-a4-tx     3.47%     273.7MiB / 1.465GiB   18.25%    54.2kB / 61.8kB   0B / 221kB        69
c450f000238b   tx2-dxh1-a4-pg     0.00%     53.87MiB / 512MiB     10.52%    64.3kB / 64.7kB   0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       0.42%     545.7MiB / 3GiB       17.76%    86.6kB / 53.7kB   0B / 295kB        168
943630e10a15   tx2-xtdb-s1        1.30%     765.3MiB / 3.5GiB     21.35%    549MB / 5.04GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.25%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        0.16%     154.1MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 498MB    14
a809fb6cb3ba   tx2-qlever-dev     37.04%    1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T20:28:22.512Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.23%     319.7MiB / 1.465GiB   21.31%    30kB / 23kB       0B / 184kB        44
9f895aa919e1   tx2-dxh1-a4-gw-w   0.06%     316.5MiB / 1.465GiB   21.10%    29.3kB / 22.8kB   0B / 205kB        44
96081c156dec   tx2-dxh1-a4-tx     0.22%     273.7MiB / 1.465GiB   18.25%    54.6kB / 62.5kB   0B / 221kB        69
c450f000238b   tx2-dxh1-a4-pg     0.01%     53.87MiB / 512MiB     10.52%    64.7kB / 64.8kB   0B / 48.4MB       15
03c359640b71   tx2-dxb1-dev       108.68%   571.4MiB / 3GiB       18.60%    260kB / 276kB     0B / 328kB        185
943630e10a15   tx2-xtdb-s1        0.57%     795.3MiB / 3.5GiB     22.19%    551MB / 5.05GB    76.9MB / 2.04GB   55
1acfc78a670c   tx2-dxs1-tx        0.37%     1.11GiB / 2GiB        55.50%    486MB / 529MB     84.5MB / 16.3MB   82
5856becf11c3   tx2-dxs1-pg        1.55%     154.2MiB / 1GiB       15.05%    289MB / 260MB     40.5MB / 498MB    14
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.584GiB / 3.5GiB     45.26%    367kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-settled3-a-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:08:27.874Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.12%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 2.11MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.06%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 2.11MB       79
96081c156dec   tx2-dxh1-a4-tx     0.13%     326.4MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.89MB       76
c450f000238b   tx2-dxh1-a4-pg     0.07%     61.54MiB / 512MiB     12.02%    9.29MB / 8.57MB   0B / 93.8MB       16
03c359640b71   tx2-dxb1-dev       1.72%     1.118GiB / 3GiB       37.27%    76.2MB / 980MB    69.6kB / 89.8MB   1440
943630e10a15   tx2-xtdb-s1        1.05%     766MiB / 3.5GiB       21.37%    552MB / 5.05GB    77MB / 2.19GB     44
a809fb6cb3ba   tx2-qlever-dev     35.39%    1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:08:35.840Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.14%     519.9MiB / 1.465GiB   34.66%    2.08MB / 12.8MB   0B / 2.11MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 2.11MB       79
96081c156dec   tx2-dxh1-a4-tx     0.22%     326.4MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.89MB       76
c450f000238b   tx2-dxh1-a4-pg     0.03%     61.54MiB / 512MiB     12.02%    9.29MB / 8.57MB   0B / 93.8MB       16
03c359640b71   tx2-dxb1-dev       0.61%     1.118GiB / 3GiB       37.27%    76.2MB / 980MB    69.6kB / 89.8MB   1440
943630e10a15   tx2-xtdb-s1        1.66%     767.3MiB / 3.5GiB     21.41%    553MB / 5.06GB    77MB / 2.19GB     46
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-settled3-a-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:08:38.314Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.29%     519.9MiB / 1.465GiB   34.66%    2.09MB / 12.8MB   0B / 2.12MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.14%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 2.13MB       79
96081c156dec   tx2-dxh1-a4-tx     0.29%     326.4MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.9MB        76
c450f000238b   tx2-dxh1-a4-pg     0.04%     61.54MiB / 512MiB     12.02%    9.29MB / 8.57MB   0B / 93.8MB       16
03c359640b71   tx2-dxb1-dev       0.61%     1.118GiB / 3GiB       37.27%    76.2MB / 980MB    69.6kB / 90.1MB   1440
943630e10a15   tx2-xtdb-s1        1.76%     767.5MiB / 3.5GiB     21.41%    553MB / 5.06GB    77MB / 2.19GB     46
a809fb6cb3ba   tx2-qlever-dev     4.42%     1.579GiB / 3.5GiB     45.11%    369kB / 2.07MB    181MB / 519MB     16
```

After (2026-11-09T21:08:41.777Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.13%     519.9MiB / 1.465GiB   34.66%    2.09MB / 12.8MB   0B / 2.12MB       48
9f895aa919e1   tx2-dxh1-a4-gw-w   0.12%     611.7MiB / 1.465GiB   40.78%    27.2MB / 30.3MB   0B / 2.13MB       79
96081c156dec   tx2-dxh1-a4-tx     0.19%     326.4MiB / 1.465GiB   21.76%    14.7MB / 17.7MB   0B / 2.9MB        76
c450f000238b   tx2-dxh1-a4-pg     0.00%     61.54MiB / 512MiB     12.02%    9.29MB / 8.57MB   0B / 93.8MB       16
03c359640b71   tx2-dxb1-dev       0.91%     1.118GiB / 3GiB       37.27%    76.2MB / 980MB    69.6kB / 90.1MB   1440
943630e10a15   tx2-xtdb-s1        1.64%     767.6MiB / 3.5GiB     21.42%    554MB / 5.07GB    77MB / 2.19GB     46
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.84%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-settled3-a-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:11:54.486Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.15%     678.6MiB / 1.465GiB   45.24%    63.1MB / 2.32GB   0B / 2.3MB       102
9f895aa919e1   tx2-dxh1-a4-gw-w   0.26%     1.223GiB / 1.465GiB   83.50%    203MB / 2.38GB    0B / 2.48MB      101
96081c156dec   tx2-dxh1-a4-tx     0.31%     483.1MiB / 1.465GiB   32.21%    116MB / 155MB     0B / 4.28MB      123
c450f000238b   tx2-dxh1-a4-pg     0.11%     85.41MiB / 512MiB     16.68%    57.3MB / 53.2MB   0B / 149MB       19
03c359640b71   tx2-dxb1-dev       0.74%     1.116GiB / 3GiB       37.21%    76.2MB / 980MB    69.6kB / 105MB   1407
943630e10a15   tx2-xtdb-s1        1.71%     764.8MiB / 3.5GiB     21.34%    554MB / 5.07GB    77MB / 2.2GB     44
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.569GiB / 3.5GiB     44.82%    369kB / 2.07MB    181MB / 519MB    13
```

After (2026-11-09T21:11:58.065Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.15%     678.6MiB / 1.465GiB   45.24%    63.1MB / 2.32GB   0B / 2.3MB       102
9f895aa919e1   tx2-dxh1-a4-gw-w   0.17%     1.223GiB / 1.465GiB   83.50%    203MB / 2.38GB    0B / 2.48MB      101
96081c156dec   tx2-dxh1-a4-tx     0.22%     483.1MiB / 1.465GiB   32.21%    116MB / 155MB     0B / 4.39MB      123
c450f000238b   tx2-dxh1-a4-pg     0.25%     85.45MiB / 512MiB     16.69%    57.3MB / 53.2MB   0B / 149MB       19
03c359640b71   tx2-dxb1-dev       0.62%     1.116GiB / 3GiB       37.21%    76.2MB / 980MB    69.6kB / 105MB   1407
943630e10a15   tx2-xtdb-s1        1.65%     766.1MiB / 3.5GiB     21.38%    555MB / 5.08GB    77MB / 2.2GB     55
a809fb6cb3ba   tx2-qlever-dev     36.28%    1.569GiB / 3.5GiB     44.82%    369kB / 2.07MB    181MB / 519MB    13
```

</details>

<details>
<summary>read-settled3-b-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:12:02.252Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
ddb0f06d96a1   tx2-dxh1-a4-gw-r   0.20%     678.6MiB / 1.465GiB   45.24%    63.1MB / 2.32GB   0B / 2.3MB       102
9f895aa919e1   tx2-dxh1-a4-gw-w   0.11%     1.223GiB / 1.465GiB   83.50%    203MB / 2.38GB    0B / 2.48MB      101
96081c156dec   tx2-dxh1-a4-tx     0.23%     483.1MiB / 1.465GiB   32.21%    116MB / 155MB     0B / 4.39MB      123
c450f000238b   tx2-dxh1-a4-pg     0.23%     85.45MiB / 512MiB     16.69%    57.3MB / 53.2MB   0B / 150MB       19
03c359640b71   tx2-dxb1-dev       0.70%     1.116GiB / 3GiB       37.21%    76.2MB / 980MB    69.6kB / 105MB   1407
943630e10a15   tx2-xtdb-s1        1.42%     770.5MiB / 3.5GiB     21.50%    555MB / 5.1GB     77MB / 2.2GB     55
a809fb6cb3ba   tx2-qlever-dev     24.80%    1.584GiB / 3.5GiB     45.24%    369kB / 2.07MB    181MB / 519MB    16
```

After (2026-11-09T21:13:37.635Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      3.09%     766.8MiB / 3.5GiB   21.39%    588MB / 5.88GB   77MB / 2.2GB    55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.589GiB / 3.5GiB   45.39%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-b-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:13:44.227Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.74%     766.9MiB / 3.5GiB   21.40%    591MB / 5.94GB   77MB / 2.2GB    55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.589GiB / 3.5GiB   45.39%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:14:39.008Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.74%     767.4MiB / 3.5GiB   21.41%    624MB / 6.72GB   77MB / 2.2GB    55
a809fb6cb3ba   tx2-qlever-dev   34.64%    1.589GiB / 3.5GiB   45.40%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-b-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:14:58.687Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.58%     767.7MiB / 3.5GiB   21.42%    635MB / 6.97GB   77MB / 2.2GB    55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:15:53.269Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.76%     767.6MiB / 3.5GiB   21.42%    668MB / 7.75GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-c-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:15:55.699Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.51%     767.6MiB / 3.5GiB   21.42%    668MB / 7.77GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.596GiB / 3.5GiB   45.59%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:04.673Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.30%     767.6MiB / 3.5GiB   21.42%    670MB / 8.44GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-c-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:07.100Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.44%     767.6MiB / 3.5GiB   21.42%    670MB / 8.5GB    77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:11.426Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      0.74%     767.6MiB / 3.5GiB   21.42%    671MB / 9.18GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-c-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:14.301Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.58%     767.6MiB / 3.5GiB   21.42%    671MB / 9.39GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:17.384Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      3.25%     767.7MiB / 3.5GiB   21.42%    672MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   17.98%    1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-d-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:19.845Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.52%     767.9MiB / 3.5GiB   21.43%    672MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:29.070Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.46%     767.8MiB / 3.5GiB   21.42%    674MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-d-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:31.545Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.42%     768.3MiB / 3.5GiB   21.44%    674MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:35.962Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.74%     768.4MiB / 3.5GiB   21.44%    676MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-settled3-d-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:38.809Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.41%     768.4MiB / 3.5GiB   21.44%    677MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   9.36%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:42.035Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.37%     768.1MiB / 3.5GiB   21.43%    679MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>read-supplemental-a-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:27:36.405Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.17%     331.8MiB / 1.465GiB   22.12%    33.8kB / 31.2kB   0B / 438kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.20%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.5MB        76
f8a49e2ff279   tx2-dxh2-a1-tx     0.25%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.28%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.12GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.22%     343.8MiB / 1.465GiB   22.92%    281kB / 19.1kB    0B / 77.8kB       44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.18%     336.3MiB / 1.465GiB   22.42%    280kB / 19kB      0B / 81.9kB       42
1e5d9c533c9f   tx2-dxb2-a1-tx     0.36%     873.3MiB / 3GiB       28.43%    154MB / 66.3MB    8.19kB / 2.62MB   2631
7373634dfd49   tx2-dxb2-a1-pg     0.32%     88.27MiB / 512MiB     17.24%    49.3MB / 168MB    0B / 322MB        15
943630e10a15   tx2-xtdb-s1        3.60%     836.8MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.01GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:27:46.538Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.17%     331.8MiB / 1.465GiB   22.12%    34kB / 31.6kB     0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.13%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.52MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.23%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.40%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.12GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.22%     343.8MiB / 1.465GiB   22.92%    282kB / 19.4kB    0B / 111kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.16%     336.4MiB / 1.465GiB   22.43%    281kB / 19.4kB    0B / 115kB        42
1e5d9c533c9f   tx2-dxb2-a1-tx     0.35%     873.3MiB / 3GiB       28.43%    154MB / 66.3MB    8.19kB / 2.63MB   2631
7373634dfd49   tx2-dxb2-a1-pg     0.29%     88.27MiB / 512MiB     17.24%    49.3MB / 168MB    0B / 323MB        15
943630e10a15   tx2-xtdb-s1        3.21%     836.8MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.01GB     77
a809fb6cb3ba   tx2-qlever-dev     10.45%    1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-supplemental-a-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:28:00.184Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.28%     331.8MiB / 1.465GiB   22.12%    34.2kB / 32kB     0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.92%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.54MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.87%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.61%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.21%     343.9MiB / 1.465GiB   22.92%    282kB / 20kB      0B / 139kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   1.06%     341.7MiB / 1.465GiB   22.78%    452kB / 55.1kB    0B / 147kB        52
1e5d9c533c9f   tx2-dxb2-a1-tx     0.49%     874.5MiB / 3GiB       28.47%    155MB / 66.5MB    8.19kB / 2.63MB   2640
7373634dfd49   tx2-dxb2-a1-pg     0.39%     88.41MiB / 512MiB     17.27%    49.5MB / 169MB    0B / 326MB        15
943630e10a15   tx2-xtdb-s1        1.80%     836.8MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:28:04.665Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.21%     331.8MiB / 1.465GiB   22.12%    34.4kB / 32.1kB   0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.27%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.55MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.28%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.56%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.25%     343.9MiB / 1.465GiB   22.92%    282kB / 20.2kB    0B / 152kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.75%     341.7MiB / 1.465GiB   22.78%    452kB / 55.3kB    0B / 164kB        52
1e5d9c533c9f   tx2-dxb2-a1-tx     6.03%     874.5MiB / 3GiB       28.47%    155MB / 66.5MB    8.19kB / 2.63MB   2640
7373634dfd49   tx2-dxb2-a1-pg     0.31%     88.41MiB / 512MiB     17.27%    49.5MB / 169MB    0B / 327MB        15
943630e10a15   tx2-xtdb-s1        2.15%     837.1MiB / 3.5GiB     23.36%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-supplemental-a-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:28:13.933Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.06%     331.8MiB / 1.465GiB   22.12%    34.6kB / 32.5kB   0B / 471kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.07%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.57MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.11%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.27%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.27MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.07%     343.9MiB / 1.465GiB   22.92%    282kB / 20.4kB    0B / 176kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   73.18%    414.6MiB / 1.465GiB   27.64%    1.66MB / 956kB    0B / 164kB        81
1e5d9c533c9f   tx2-dxb2-a1-tx     14.43%    877.7MiB / 3GiB       28.57%    157MB / 67.3MB    8.19kB / 2.65MB   2669
7373634dfd49   tx2-dxb2-a1-pg     2.03%     90.73MiB / 512MiB     17.72%    50.1MB / 172MB    0B / 330MB        16
943630e10a15   tx2-xtdb-s1        0.51%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:28:17.050Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.05%     331.8MiB / 1.465GiB   22.12%    34.8kB / 32.7kB   0B / 471kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.04%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.57MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.08%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.16%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.27MB / 1.14GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.08%     343.9MiB / 1.465GiB   22.92%    282kB / 20.6kB    0B / 176kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   62.67%    472.6MiB / 1.465GiB   31.51%    3.89MB / 2.95MB   0B / 164kB        81
1e5d9c533c9f   tx2-dxb2-a1-tx     34.83%    883.3MiB / 3GiB       28.75%    161MB / 68.7MB    8.19kB / 2.65MB   2705
7373634dfd49   tx2-dxb2-a1-pg     3.01%     91.41MiB / 512MiB     17.85%    51.2MB / 176MB    0B / 334MB        16
943630e10a15   tx2-xtdb-s1        1.44%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-supplemental-d-1: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:27:48.999Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.18%     331.8MiB / 1.465GiB   22.12%    34kB / 31.6kB     0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.12%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.52MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.25%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.39%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.12GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   1.21%     343.8MiB / 1.465GiB   22.92%    282kB / 19.6kB    0B / 111kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.22%     336.4MiB / 1.465GiB   22.43%    281kB / 19.4kB    0B / 115kB        42
1e5d9c533c9f   tx2-dxb2-a1-tx     0.56%     873.3MiB / 3GiB       28.43%    154MB / 66.3MB    8.19kB / 2.63MB   2631
7373634dfd49   tx2-dxb2-a1-pg     0.30%     88.27MiB / 512MiB     17.24%    49.3MB / 168MB    0B / 324MB        15
943630e10a15   tx2-xtdb-s1        1.82%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.01GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:27:57.611Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.17%     331.8MiB / 1.465GiB   22.12%    34.2kB / 32kB     0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.16%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.54MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     1.12%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.49%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.19%     343.9MiB / 1.465GiB   22.92%    282kB / 19.8kB    0B / 139kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.26%     341.7MiB / 1.465GiB   22.78%    452kB / 54.9kB    0B / 147kB        52
1e5d9c533c9f   tx2-dxb2-a1-tx     0.94%     874.5MiB / 3GiB       28.47%    155MB / 66.5MB    8.19kB / 2.63MB   2640
7373634dfd49   tx2-dxb2-a1-pg     0.34%     88.41MiB / 512MiB     17.27%    49.5MB / 169MB    0B / 325MB        15
943630e10a15   tx2-xtdb-s1        1.58%     836.8MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-supplemental-d-4: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:28:07.178Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.21%     331.8MiB / 1.465GiB   22.12%    34.5kB / 32.3kB   0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.10%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.55MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.28%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.38%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.24%     343.9MiB / 1.465GiB   22.92%    282kB / 20.2kB    0B / 152kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   0.11%     341.7MiB / 1.465GiB   22.78%    452kB / 55.3kB    0B / 164kB        52
1e5d9c533c9f   tx2-dxb2-a1-tx     0.27%     874.5MiB / 3GiB       28.47%    155MB / 66.5MB    8.19kB / 2.63MB   2640
7373634dfd49   tx2-dxb2-a1-pg     0.18%     88.41MiB / 512MiB     17.27%    49.5MB / 169MB    0B / 327MB        15
943630e10a15   tx2-xtdb-s1        1.59%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     36.59%    1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:28:10.952Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.16%     331.8MiB / 1.465GiB   22.12%    34.6kB / 32.5kB   0B / 455kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.03%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.56MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.07%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.13%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.27MB / 1.13GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.05%     343.9MiB / 1.465GiB   22.92%    282kB / 20.4kB    0B / 164kB        44
1494e84a12e2   tx2-dxb2-a1-gw-w   85.78%    381.2MiB / 1.465GiB   25.41%    938kB / 332kB     0B / 164kB        81
1e5d9c533c9f   tx2-dxb2-a1-tx     8.34%     876.2MiB / 3GiB       28.52%    156MB / 66.9MB    8.19kB / 2.63MB   2656
7373634dfd49   tx2-dxb2-a1-pg     2.03%     90.47MiB / 512MiB     17.67%    49.8MB / 170MB    0B / 328MB        16
943630e10a15   tx2-xtdb-s1        0.46%     836.8MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>read-supplemental-d-16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:28:20.069Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.17%     331.8MiB / 1.465GiB   22.12%    34.9kB / 32.9kB   0B / 471kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.08%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.58MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.59%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.12%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.27MB / 1.14GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.05%     343.9MiB / 1.465GiB   22.93%    282kB / 20.8kB    0B / 193kB        41
1494e84a12e2   tx2-dxb2-a1-gw-w   44.75%    480.2MiB / 1.465GiB   32.01%    5.71MB / 4.35MB   0B / 164kB        81
1e5d9c533c9f   tx2-dxb2-a1-tx     16.49%    889.4MiB / 3GiB       28.95%    165MB / 69.8MB    8.19kB / 2.65MB   2739
7373634dfd49   tx2-dxb2-a1-pg     2.62%     91.96MiB / 512MiB     17.96%    52.2MB / 180MB    0B / 337MB        16
943630e10a15   tx2-xtdb-s1        0.56%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:28:23.781Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.04%     331.8MiB / 1.465GiB   22.12%    34.9kB / 32.9kB   0B / 471kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.08%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.59MB       76
f8a49e2ff279   tx2-dxh2-a1-tx     0.06%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.11%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.27MB / 1.14GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.27%     343.9MiB / 1.465GiB   22.93%    283kB / 21kB      0B / 209kB        41
1494e84a12e2   tx2-dxb2-a1-gw-w   49.41%    493.1MiB / 1.465GiB   32.87%    8.39MB / 6.6MB    0B / 164kB        81
1e5d9c533c9f   tx2-dxb2-a1-tx     29.99%    895.9MiB / 3GiB       29.16%    169MB / 71.4MB    8.19kB / 2.65MB   2780
7373634dfd49   tx2-dxb2-a1-pg     2.51%     92.79MiB / 512MiB     18.12%    53.5MB / 186MB    0B / 341MB        16
943630e10a15   tx2-xtdb-s1        0.46%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.02GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

## X2: atomic commit floor

One socket write carries BEGIN READ WRITE, one/two ASSERT statements, a three-row xn_ent INSERT (3,000/200/4,000-byte text documents), head upsert, claim insert, COMMIT SYNC. Explicit SYNC gives the server’s synchronous commit outcome. The payload row ids are unique per command, so all three documents accumulate in history rather than being repeatedly overwritten. The head is overwritten for the same subject. No post-commit status query is in the timed latency.

Two guards: claim absent, head.pos equals expected. Combined guard: NOT EXISTS(claim lookup) AND (head lookup)=expected in one ASSERT. Statements use the existing F3 encoder: extended-protocol parameters but freshly parsed per command; prepared-write caching was not benchmarked. Both shapes are exact in write.mjs.

Closed loop: 200 successful warmup commits, then 1,000 timed commits. Fresh means a new subject/head, not an emptied database: arms run sequentially in the same seeded engine, so the later fresh arm already includes the earlier arm’s global commits. After 20,000 additional real closed-loop durable commands on a single subject, aged measurements reuse that subject’s versioned head. The second aged shape reuses the same history subject after the first aged shape’s extra 1,200 commits; intervening two-ASSERT open-loop cases also add global database history. These are sequential diagnostics, not matched-history ABAB arms. Open loop uses 200 fresh subjects in the same aged database: heads are fresh, global engine/claim/document history remains.

Open loop: deterministic seeded exponential interarrivals for 60 s at 15/s or 55/s, uniform 200 subjects, per-subject promise FIFO, pooled 16 sockets. Same arrival sequence at the same offered rate across shapes and X3. Every command is unique; no offered commands are intentionally dropped. Latency starts at scheduled arrival, includes timer/pool/subject waiting, and ends after COMMIT’s wire response. 200 successful writer warmups precede each timed run.

| Case | n | p50 | p90 | p99 | max | wall s | ops/s | ops/s/quota core | engine CPU-s | ops/engine CPU-s | host CPU-s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| closed-one-aged | 1000 | 5.08 | 7.92 | 15.09 | 43.62 | 5.72 | 174.96 | 87.48 | 3.20 | 312.77 | 0.28 |
| closed-one-fresh | 1000 | 3.31 | 4.41 | 7.19 | 21.04 | 3.57 | 279.82 | 139.91 | 2.47 | 405.53 | 0.34 |
| closed-two-aged | 1000 | 3.99 | 4.94 | 7.36 | 10.51 | 4.21 | 237.69 | 118.84 | 2.21 | 453.14 | 0.44 |
| closed-two-fresh | 1000 | 3.45 | 4.39 | 7.08 | 15.70 | 3.68 | 272.09 | 136.04 | 3.33 | 300.05 | 0.43 |
| open-one-aged-15-r0 | 928 | 16.47 | 25.51 | 90.25 | 134.84 | 60.01 | 15.47 | 7.73 | 8.92 | 103.99 | 0.84 |
| open-one-aged-55-r0 | 3349 | 7.88 | 14.84 | 38.95 | 474.57 | 60.00 | 55.81 | 27.91 | 13.78 | 243.05 | 1.89 |
| open-one-aged-55-r16 | 3349 | 16.08 | 37.86 | 90.70 | 174.83 | 60.01 | 55.81 | 27.90 | 87.57 | 38.24 | 15.47 |
| open-two-aged-15-r0 | 928 | 16.04 | 24.09 | 32.27 | 69.48 | 60.00 | 15.47 | 7.73 | 10.57 | 87.80 | 0.86 |
| open-two-aged-55-r0 | 3349 | 9.34 | 19.91 | 35.09 | 50.69 | 60.00 | 55.81 | 27.91 | 17.01 | 196.89 | 1.95 |

All latency columns are milliseconds. Engine CPU is whole-container usage_usec delta; it includes background work in that window. Node process.cpuUsage includes all generator worker threads, but excludes Docker observation subprocesses. CPU observations bracket the wall-timed function, so very small boundary/observation overhead remains. The requested operations/engine CPU-second is an efficiency metric; TARGETS 1.1 P4.3 separately defines per-core throughput using the bound quota. The ops/s/quota-core column divides wall throughput by two and must not be confused with measured CPU efficiency. Raw absolute counters are retained from the later X1 cases onward; the initial a/b runs retain the computed delta only.

| Open-loop case | offered | acknowledged COMMIT | errors |
| --- | ---: | ---: | ---: |
| open-one-aged-15-r0 | 928 | 928 | 0 |
| open-one-aged-55-r0 | 3349 | 3349 | 0 |
| open-one-aged-55-r16 | 3349 | 3349 | 0 |
| open-two-aged-15-r0 | 928 | 928 | 0 |
| open-two-aged-55-r0 | 3349 | 3349 | 0 |

<details>
<summary>closed-one-aged: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:20:37.665Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
4161b1d99c47   tx2-dxb2-a1-gw-r   0.16%     342.3MiB / 1.465GiB   22.82%    28.1kB / 20.7kB   0B / 115kB      45
1494e84a12e2   tx2-dxb2-a1-gw-w   0.19%     332.9MiB / 1.465GiB   22.20%    27.3kB / 20.2kB   0B / 131kB      43
1e5d9c533c9f   tx2-dxb2-a1-tx     0.34%     348.9MiB / 3GiB       11.36%    49.1kB / 55kB     0B / 258kB      75
7373634dfd49   tx2-dxb2-a1-pg     0.00%     51.64MiB / 512MiB     10.09%    63.7kB / 67.1kB   0B / 47.6MB     15
943630e10a15   tx2-xtdb-s1        1.44%     924.3MiB / 3.5GiB     25.79%    918MB / 10.1GB    77MB / 3.43GB   52
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    369kB / 2.07MB    181MB / 519MB   13
```

After (2026-11-09T21:20:45.575Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
4161b1d99c47   tx2-dxb2-a1-gw-r   0.15%     342.3MiB / 1.465GiB   22.82%    28.2kB / 20.9kB   0B / 127kB      45
1494e84a12e2   tx2-dxb2-a1-gw-w   0.14%     333MiB / 1.465GiB     22.20%    27.6kB / 20.6kB   0B / 143kB      43
1e5d9c533c9f   tx2-dxb2-a1-tx     0.70%     348.9MiB / 3GiB       11.36%    50.1kB / 56.5kB   0B / 274kB      75
7373634dfd49   tx2-dxb2-a1-pg     0.12%     54.4MiB / 512MiB      10.62%    64.9kB / 67.5kB   0B / 48.1MB     15
943630e10a15   tx2-xtdb-s1        0.88%     925MiB / 3.5GiB       25.81%    926MB / 10.1GB    77MB / 3.47GB   52
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    369kB / 2.07MB    181MB / 519MB   13
```

</details>

<details>
<summary>closed-one-fresh: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:57.214Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.49%     810.9MiB / 3.5GiB   22.63%    691MB / 10.1GB   77MB / 2.25GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:17:02.980Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      4.12%     827.4MiB / 3.5GiB   23.09%    699MB / 10.1GB   77MB / 2.29GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>closed-two-aged: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:18:17.713Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      3.99%     854.8MiB / 3.5GiB   23.85%    868MB / 10.1GB   77MB / 3.24GB   53
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.589GiB / 3.5GiB   45.40%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:18:24.171Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.45%     855.7MiB / 3.5GiB   23.88%    876MB / 10.1GB   77MB / 3.27GB   53
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.589GiB / 3.5GiB   45.40%    369kB / 2.07MB   181MB / 519MB   13
```

</details>

<details>
<summary>closed-two-fresh: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:16:48.147Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      0.93%     776MiB / 3.5GiB     21.65%    681MB / 10.1GB   77MB / 2.21GB   55
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.595GiB / 3.5GiB   45.58%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:16:53.997Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.14%     793.1MiB / 3.5GiB   22.13%    689MB / 10.1GB   77MB / 2.25GB   55
a809fb6cb3ba   tx2-qlever-dev   17.42%    1.597GiB / 3.5GiB   45.63%    369kB / 2.07MB   181MB / 519MB   16
```

</details>

<details>
<summary>open-one-aged-15-r0: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:20:49.317Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
4161b1d99c47   tx2-dxb2-a1-gw-r   0.13%     342.3MiB / 1.465GiB   22.82%    28.4kB / 21.1kB   0B / 143kB      45
1494e84a12e2   tx2-dxb2-a1-gw-w   0.11%     333MiB / 1.465GiB     22.20%    27.7kB / 20.8kB   0B / 156kB      43
1e5d9c533c9f   tx2-dxb2-a1-tx     0.41%     348.9MiB / 3GiB       11.36%    50.6kB / 56.8kB   0B / 274kB      75
7373634dfd49   tx2-dxb2-a1-pg     0.01%     54.16MiB / 512MiB     10.58%    64.9kB / 67.5kB   0B / 48.1MB     15
943630e10a15   tx2-xtdb-s1        2.85%     927MiB / 3.5GiB       25.87%    928MB / 10.1GB    77MB / 3.47GB   52
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    369kB / 2.07MB    181MB / 519MB   13
```

After (2026-11-09T21:21:51.597Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
f8a49e2ff279   tx2-dxh2-a1-tx     0.06%     203MiB / 1.465GiB     13.53%    5.91kB / 4.61kB   0B / 81.9kB     21
fab369fc6db8   tx2-dxh2-a1-pg     0.01%     41.85MiB / 512MiB     8.17%     8.91kB / 7.7kB    0B / 47.1MB     10
4161b1d99c47   tx2-dxb2-a1-gw-r   0.50%     342.4MiB / 1.465GiB   22.83%    30.1kB / 23.6kB   0B / 287kB      42
1494e84a12e2   tx2-dxb2-a1-gw-w   96.80%    509.2MiB / 1.465GiB   33.95%    3.81MB / 7.39MB   0B / 524kB      96
1e5d9c533c9f   tx2-dxb2-a1-tx     38.31%    446.1MiB / 3GiB       14.52%    2.72MB / 2.65MB   0B / 1.29MB     268
7373634dfd49   tx2-dxb2-a1-pg     2.63%     62.13MiB / 512MiB     12.13%    1.64MB / 2.11MB   0B / 61.3MB     18
943630e10a15   tx2-xtdb-s1        0.74%     926MiB / 3.5GiB       25.84%    935MB / 10.1GB    77MB / 3.51GB   52
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.589GiB / 3.5GiB     45.40%    369kB / 2.07MB    181MB / 519MB   13
703afc651609   tx2-dxh2-a1-gw-w   101.07%   151.3MiB / 1.465GiB   10.09%    456B / 234B       0B / 0B         14
```

</details>

<details>
<summary>open-one-aged-55-r0: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:21:55.864Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
f8a49e2ff279   tx2-dxh2-a1-tx     0.04%     203.1MiB / 1.465GiB   13.54%    6.81kB / 5.63kB   0B / 102kB      21
fab369fc6db8   tx2-dxh2-a1-pg     0.01%     41.89MiB / 512MiB     8.18%     12.7kB / 11.1kB   0B / 47.2MB     10
4161b1d99c47   tx2-dxb2-a1-gw-r   0.05%     342.4MiB / 1.465GiB   22.83%    30.1kB / 23.6kB   0B / 299kB      42
1494e84a12e2   tx2-dxb2-a1-gw-w   67.90%    516.6MiB / 1.465GiB   34.44%    5.74MB / 9.61MB   0B / 602kB      96
1e5d9c533c9f   tx2-dxb2-a1-tx     67.08%    461.9MiB / 3GiB       15.03%    4.11MB / 3.81MB   0B / 1.54MB     335
7373634dfd49   tx2-dxb2-a1-pg     3.93%     62.62MiB / 512MiB     12.23%    2.33MB / 3.22MB   0B / 66.2MB     18
943630e10a15   tx2-xtdb-s1        0.46%     927.1MiB / 3.5GiB     25.87%    937MB / 10.1GB    77MB / 3.51GB   52
a809fb6cb3ba   tx2-qlever-dev     35.79%    1.589GiB / 3.5GiB     45.40%    369kB / 2.07MB    181MB / 519MB   13
703afc651609   tx2-dxh2-a1-gw-w   100.44%   189.8MiB / 1.465GiB   12.65%    706B / 234B       0B / 0B         16
```

After (2026-11-09T21:22:58.047Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.06%     331.4MiB / 1.465GiB   22.09%    26.5kB / 20.5kB   0B / 176kB       43
703afc651609   tx2-dxh2-a1-gw-w   0.13%     331.2MiB / 1.465GiB   22.08%    29.4kB / 22.6kB   0B / 172kB       44
f8a49e2ff279   tx2-dxh2-a1-tx     1.56%     272.4MiB / 1.465GiB   18.16%    51.4kB / 59.2kB   0B / 209kB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.15%     53.81MiB / 512MiB     10.51%    64kB / 63.8kB     0B / 48.4MB      15
4161b1d99c47   tx2-dxb2-a1-gw-r   0.23%     342.5MiB / 1.465GiB   22.83%    32.4kB / 26.1kB   0B / 336kB       42
1494e84a12e2   tx2-dxb2-a1-gw-w   0.22%     331.8MiB / 1.465GiB   22.12%    158kB / 18kB      0B / 32.8kB      40
1e5d9c533c9f   tx2-dxb2-a1-tx     0.85%     689.8MiB / 3GiB       22.45%    50.4MB / 27.9MB   4.1kB / 2.44MB   1423
7373634dfd49   tx2-dxb2-a1-pg     0.32%     70.32MiB / 512MiB     13.74%    19MB / 50.6MB     0B / 170MB       17
943630e10a15   tx2-xtdb-s1        1.90%     805.6MiB / 3.5GiB     22.48%    965MB / 10.1GB    77MB / 3.89GB    52
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.551GiB / 3.5GiB     44.30%    369kB / 2.07MB    181MB / 519MB    13
```

</details>

<details>
<summary>open-one-aged-55-r16: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:26:29.064Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.10%     331.7MiB / 1.465GiB   22.12%    31.9kB / 28.5kB   0B / 307kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.13%     855.7MiB / 1.465GiB   57.05%    760MB / 305MB     0B / 6.29MB       82
f8a49e2ff279   tx2-dxh2-a1-tx     0.41%     644.5MiB / 1.465GiB   42.97%    652MB / 677MB     0B / 27.2MB       101
fab369fc6db8   tx2-dxh2-a1-pg     0.46%     186.3MiB / 512MiB     36.38%    401MB / 370MB     975kB / 1.06GB    18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.18%     343.7MiB / 1.465GiB   22.91%    163kB / 25.5kB    0B / 258kB        41
1494e84a12e2   tx2-dxb2-a1-gw-w   0.11%     526.5MiB / 1.465GiB   35.10%    49.8MB / 37.3MB   0B / 238kB        73
1e5d9c533c9f   tx2-dxb2-a1-tx     0.33%     872.8MiB / 3GiB       28.41%    154MB / 66.3MB    8.19kB / 2.54MB   2620
7373634dfd49   tx2-dxb2-a1-pg     0.22%     90.2MiB / 512MiB      17.62%    49.3MB / 167MB    0B / 312MB        16
943630e10a15   tx2-xtdb-s1        1.08%     802.6MiB / 3.5GiB     22.39%    967MB / 10.1GB    77MB / 3.91GB     45
a809fb6cb3ba   tx2-qlever-dev     35.19%    1.571GiB / 3.5GiB     44.90%    369kB / 2.07MB    181MB / 519MB     13
```

After (2026-11-09T21:27:31.361Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
416ac99cfbba   tx2-dxh2-a1-gw-r   0.53%     331.8MiB / 1.465GiB   22.12%    33.6kB / 31kB     0B / 438kB        41
703afc651609   tx2-dxh2-a1-gw-w   0.12%     855.6MiB / 1.465GiB   57.04%    760MB / 305MB     0B / 6.5MB        76
f8a49e2ff279   tx2-dxh2-a1-tx     0.21%     642.2MiB / 1.465GiB   42.81%    652MB / 677MB     0B / 27.6MB       65
fab369fc6db8   tx2-dxh2-a1-pg     0.21%     186.5MiB / 512MiB     36.42%    401MB / 370MB     1.23MB / 1.12GB   18
4161b1d99c47   tx2-dxb2-a1-gw-r   0.22%     343.6MiB / 1.465GiB   22.91%    281kB / 18.9kB    0B / 61.4kB       43
1494e84a12e2   tx2-dxb2-a1-gw-w   0.15%     336.2MiB / 1.465GiB   22.41%    280kB / 18.8kB    0B / 65.5kB       41
1e5d9c533c9f   tx2-dxb2-a1-tx     0.38%     873.3MiB / 3GiB       28.43%    154MB / 66.3MB    8.19kB / 2.62MB   2631
7373634dfd49   tx2-dxb2-a1-pg     0.28%     88.27MiB / 512MiB     17.24%    49.3MB / 168MB    0B / 321MB        15
943630e10a15   tx2-xtdb-s1        3.32%     836.9MiB / 3.5GiB     23.35%    1.02GB / 10.4GB   77MB / 4.01GB     77
a809fb6cb3ba   tx2-qlever-dev     0.00%     1.571GiB / 3.5GiB     44.89%    369kB / 2.07MB    181MB / 519MB     13
```

</details>

<details>
<summary>open-two-aged-15-r0: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:18:27.456Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.48%     856.8MiB / 3.5GiB   23.91%    878MB / 10.1GB   77MB / 3.28GB   53
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.589GiB / 3.5GiB   45.40%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:19:29.708Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.00%     857.3MiB / 3.5GiB   23.92%    886MB / 10.1GB   77MB / 3.31GB   52
a809fb6cb3ba   tx2-qlever-dev   13.73%    1.584GiB / 3.5GiB   45.27%    369kB / 2.07MB   181MB / 519MB   16
```

</details>

<details>
<summary>open-two-aged-55-r0: whole-VM docker stats --no-stream</summary>

Before (2026-11-09T21:19:33.129Z):

```text
CONTAINER ID   NAME             CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O       PIDS
943630e10a15   tx2-xtdb-s1      1.59%     857.3MiB / 3.5GiB   23.92%    888MB / 10.1GB   77MB / 3.32GB   52
a809fb6cb3ba   tx2-qlever-dev   0.00%     1.583GiB / 3.5GiB   45.22%    369kB / 2.07MB   181MB / 519MB   13
```

After (2026-11-09T21:20:34.382Z):

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O       PIDS
4161b1d99c47   tx2-dxb2-a1-gw-r   0.10%     342.3MiB / 1.465GiB   22.82%    28kB / 20.5kB     0B / 102kB      45
1494e84a12e2   tx2-dxb2-a1-gw-w   0.13%     332.9MiB / 1.465GiB   22.20%    27.3kB / 20.2kB   0B / 115kB      43
1e5d9c533c9f   tx2-dxb2-a1-tx     0.26%     348.9MiB / 3GiB       11.36%    48.8kB / 54.4kB   0B / 242kB      75
7373634dfd49   tx2-dxb2-a1-pg     0.00%     51.64MiB / 512MiB     10.09%    63.3kB / 67kB     0B / 47.6MB     15
943630e10a15   tx2-xtdb-s1        1.88%     923.9MiB / 3.5GiB     25.78%    916MB / 10.1GB    77MB / 3.43GB   52
a809fb6cb3ba   tx2-qlever-dev     30.44%    1.604GiB / 3.5GiB     45.82%    369kB / 2.07MB    181MB / 519MB   16
```

</details>

Correctness two: fresh scope correct-two-fresh-1794259006959. duplicate: SQLSTATE P0004, message "duplicate-command", observed head 1, attempted new payload rows 0, claim count 1, content check true; stale: SQLSTATE P0004, message "stale-position", observed head 1, attempted new payload rows 0, claim count 0, content check true. The duplicate attempt uses fresh payload ids while reusing the existing claim id; the rejected attempt must leave all three fresh payload ids absent. Stale attempt uses a new claim id, which must also remain absent. These are single diagnostic checks per shape, not recovery/durability acceptance.

Correctness one: fresh scope correct-one-fresh-1794259016209. duplicate: SQLSTATE P0004, message "guard", observed head 1, attempted new payload rows 0, claim count 1, content check true; stale: SQLSTATE P0004, message "guard", observed head 1, attempted new payload rows 0, claim count 0, content check true. The duplicate attempt uses fresh payload ids while reusing the existing claim id; the rejected attempt must leave all three fresh payload ids absent. Stale attempt uses a new claim id, which must also remain absent. These are single diagnostic checks per shape, not recovery/durability acceptance.

The lower offered rate is not uniformly lower latency here: the one-ASSERT 15/s p99 is 90.25 ms versus 38.95 ms at 55/s, while the 55/s maximum is 474.57 ms. The sequential runs do not isolate a cause for those tails; no claim that one guard always improves latency is made.

## X3: reader/writer coupling

Four Mac worker threads, each four closed-loop prepared point-read connections (16 total), warm 100 reads/connection before timing. Each returned small document is byte-checked. Writer uses the combined-guard shape at the same 55/s Poisson schedule and 200-subject policy as X2. Reader loops stop after scheduled writer arrivals and all writer completions, so the reader duration includes any final writer drain. Whole-container CPU in this case is combined reader/writer/background CPU; it is not allocated separately to reads.

| Reader clients | commits n | writer p50 | writer p99 | engine CPU-s | mean engine cores | reader queries | reader queries/s | reader queries/combined engine CPU-s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 3349 | 7.88 | 38.95 | 13.78 | 0.23 | 0 | 0 | 0 |
| 16 | 3349 | 16.08 | 90.70 | 87.57 | 1.46 | 128699 | 2144.86 | 1469.69 |

Observed writer p99 ratio: 2.33× (TARGETS P1 bar 1.25× at 256 readers, while this diagnostic uses only 16).

## Checks, limitations, and work not done

- No Triplex code, full public pull, year-one scale, 256-reader P1 run, full writer trace, erasure, restart/crash durability, lost-ACK resolution, or production acceptance. No cache-server conclusion is drawn.
- This was a shared VM, not a certified quiet host: other agents’ containers appear in every stats snapshot and could seed/work while the measurement lock prevented overlapping timed runs. CPU affinity and lock do not remove VM memory, I/O, host scheduling or background GC effects.
- First pass began about one minute after seeding. A later marker commit and the first failed correctness setup (missing xn_claim table) were issued during the first pass before the sequential automation was established; small-document first-pass CPU numbers are potentially contaminated. Settled pass has no writer setup interleaving. The failed setup and metadata-query logs are retained; neither was reclassified as success.
- The data is highly compressible padding, and read roots use a bounded deterministic working set. A real 95-entity graph, rich JSON/columns, random bytes, wider id working set, or expensive predicates may cost more. IN95 is the only batch form measured, so the batch maximum is only for that form.
- Warmups are fixed at 100/connection; first-pass single-client small CPU includes more JIT/cold/background work than later cases. These are sequential measurements, not randomised paired trials or confidence intervals. Latencies include client result decoding, byte validation and expected-string construction; they are conservative relative to wire-receipt latency alone.
- The original two-pass d measurements include BEGIN/COMMIT overhead; lean inline d is an additional post-history comparison, not a repeated immediate/post-flush pair. Clock/token pinning returns an immutable seeded domain; it does not verify a changing world’s time-travel semantics or isolate snapshot-token cost from BEGIN/COMMIT.
- No acceptance file or existing pinned source path was edited. There are no moved pinned hashes to list. No full pnpm check/package build was appropriate to this dependency-free standalone spike. Syntax checks were run on every new mjs; three targeted wire-client regression tests passed (wire-tests.log); real protocol execution and full-byte read checks exercised the wire client.

### Diagnostic assertion audit (preamble 9a)

No code creates an engine/performance PASS, qualification verdict or receipt. Node:test reports only its three local wire-client regression results. The following code converts observed data into a diagnostic assertion; none claims more than its check:

| Location | Content | Freshness | Binding / limit |
| --- | --- | --- | --- |
| read.mjs one() | exact count and full document-byte set | each actual response from this query | generated parameters and saved seed domain; container identity recorded before/after timing |
| reader-worker.mjs read() | one exact generated small document | each response in this worker loop | explicit generated id and slot URL; parent records container timing identity |
| write.mjs commit() | exactly one client batch write and returned COMMIT tag | awaited response for this command | current subject/id/expected inputs; no independent durability claim |
| write.mjs correct mode | successful command’s three exact payloads; SQLSTATE P0004 plus exact assertion marker, head unchanged, fresh attempted row ids absent, claim count | queries immediately after each rejected command | fresh scope and command ids, same owned slot; checks are diagnostics only |
| write.mjs history postflight | head=20,000, claims=20,001 including seed, payload rows=60,000 | freshly queried after the 20k loop | unique history scope, same owned engine; no replay/durability proof |
| common.mjs binding()/measured() | holder, pin, unchanged container id; records image/caps/mounts | inspect before and after each timed attempt | no frozen source/input receipt or acceptance claim |
| settle.mjs | zero compactor jobs and CPU threshold for 60s | newly polled metrics/CPU after forced flush | same explicit owned container; physical observations retained, not a general compaction proof |
| cleanup-check.mjs | exact container listing empty, slot lock absent, reservation absent, volume retained, resident IDs unchanged | new daemon/filesystem reads after engine.mjs down | explicit xtdb-s1 name and pre-cleanup container/profile; diagnostic cleanup only |
| wire.test.mjs | idle socket remains usable; destroyed socket rejects; active query times out | fresh fake pgwire peer per test, shortened 20ms timeout | local ephemeral test port, no XTDB or performance verdict |
| report.mjs | recomputes quantiles/sample counts before rendering | reads this attempt’s exclusive-created JSON files | diagnostic table derivation only, no PASS or contract binding |

## Evidence and cleanup

Source branch: spike/XN-S1 (the final head is provided in the handoff). Raw outputs: /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1/. SHA256SUMS and EVIDENCE.md in this directory index all retained files. All individual files over 1 MB remain outside git. Engine cleanup and final source checks are recorded in cleanup.log, cleanup-verification.json and checks.log. The owned slot volume is retained with engine.mjs down for diagnostic follow-up; residents remain untouched.
