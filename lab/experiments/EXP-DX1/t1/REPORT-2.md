# DX-T1 part 2

In the measured full pair, the five slowest commits waited mainly for unfinished earlier commits of the same subject in the benchmark scheduler. In the five examples below, subject waits are 1.74–2.02 s, with only 1–26 observed commits in flight out of 32; free-slot dispatch is below 0.14 ms. There is also an independent timer delay: these subject chains lead back to `e5eec63d709679d60000000000004354`, whose scheduler lateness is 267.108 ms. The trace does not identify the kernel/loop cause of that initial delay. Historical q8-c cannot be retroactively partitioned.
The subject queue and 32-slot admission are benchmark policy. SDK clock-ticket ordering and shared Node core/loop contention can affect a real deployment too: `...44c4` also waited 188.550 ms behind SDK ticket `...4598`, which spent 196.769 ms in socket queue/write.

All latency values are ms; swap values are median GiB. **A** = `p2-model-a-baseline-ladder`, summary, swap 15.555; same-session off bookend mean 16.515/454.099 p50/p99 (off swaps 15.512/16.744). Source `f9f51d85`; exact local reads, strict clocks, unchanged 900 s zero/ladder arms. Full per-arm context: [MODEL-A](MODEL-A.md).

| U2: trace (A) | subject wait | behind trace | scheduler late | free-slot dispatch | in flight at subject boundary |
| --- | ---: | --- | ---: | ---: | ---: |
| e5eec63d709679d60000000000004536 | 2018.559 | e5eec63d709679d60000000000004533 | 32.869 | 0.140 | 7/32 |
| e5eec63d709679d60000000000004533 | 1983.343 | e5eec63d709679d60000000000004532 | 57.056 | 0.101 | 6/32 |
| e5eec63d709679d60000000000004532 | 1955.400 | e5eec63d709679d60000000000004531 | 59.665 | 0.064 | 6/32 |
| e5eec63d709679d60000000000004531 | 1739.396 | e5eec63d709679d6000000000000452f | 65.076 | 0.086 | 6/32 |
| e5eec63d709679d600000000000044c4 | 1777.538 | e5eec63d709679d600000000000044c0 | 11.963 | 0.058 | 17/32 |
Each wait sampled 1–26 of 32 in flight. Observed active steps were `client.http`, `rpc.probe.transact`, SDK send queue, and `driver.execute`; boundaries and 20 ms snapshots are retained. Snapshots are observations, not continuous execution proof. `checks/queue-findings.json` preserves all 56 predecessor traces.

| U3: writer thread (A) | observed interval | on CPU, incl. runtime/GC | waiting for CPU |
| --- | ---: | ---: | ---: |
| 0 readers | 44959.930 | 1206.292 | 112.329 |
| 64 readers | 44135.161 | 2983.138 | 4884.752 |
| 256 readers | 44038.630 | 2692.431 | 5733.661 |
| 1024 readers | 44145.559 | 3262.862 | 6379.807 |
At L256 (A), per-commit marginal medians: TS own scope 7.583, measured synchronous scope 4.781, on CPU 1.001, run-queue wait 2.905. The remaining asynchronous scope is not exclusively assigned CPU; short counters are quantized estimates, not an exact per-commit CPU split. Whole-phase totals are stronger than a zero short-scope delta. These are Linux guest counters; Mac/vCPU descheduling is not separately measured.
One L256 example (A), `e5eec63d709679d6000000000000222b`: wall 22.022 = TS own 5.842 + loop 0.010 + driver queue 1.357 + network/callback residual 2.060 + gateway 1.020 + peer call/wait 11.680 + unexplained 0.053; **TS share 32.7%**. Peer wait does not resolve transactor versus storage.

U1 ablation, one session `p2-abl-a`, source `b7887c23`, 3,420 primary commits per arm. Shared off reference 15.994/121.864; off swaps 12.523/12.098. Negative deltas are noise, not evidence that a recorder speeds commits up. [Complete table](ABLATION.md).

| recorder alone / trace level | p50 | p99 | p50 delta | swap |
| --- | ---: | ---: | ---: | ---: |
| transactor JFR / full | 15.430 | 204.021 | -0.564 | 12.508 |
| gateways JFR / full | 15.862 | 182.386 | -0.132 | 12.453 |
| Postgres statements/waits / full | 15.935 | 169.897 | -0.059 | 12.344 |
| gateway spans / full | 15.906 | 173.031 | -0.088 | 12.320 |
| Node / full | 17.131 | 366.080 | +1.136 | 12.137 |
| native logs/callback / full | 19.109 | 122.709 | +3.115 | 12.137 |
| all / full | 19.191 | 97.894 | +3.197 | 12.105 |
Native logs/callback were the largest isolated cost. Default `summary` keeps Node/gateway spans and system sampling; `full` adds JFR, Postgres tracing and native logs. Default cannot identify gateway GC/safepoints or internal transactor/storage causes; those shares are unavailable, not zero.

Final U1 proof `p2-cost-e`, source `4ad48894`, zero readers/10k, same-session off mean **16.363/151.004**; [all repeats and ranges](COST-2-e.md). Off-control drift is 0.953 ms. No cross-session speedup is claimed.

| arm / level | p50 | p99 | swap |
| --- | ---: | ---: | ---: |
| off | 15.887 | 182.064 | 16.419 |
| default / summary | 17.221 | 145.759 | 16.341 |
| default / summary | 16.477 | 146.202 | 16.161 |
| off | 16.840 | 119.944 | 16.075 |
**U1 missed:** mean p50 +0.486 ms / +2.97% (under 3%, above 0.3 ms); mean p99 -5.024 ms is noisy. Earlier corrected-source sequences also missed; [C](COST-2-c.md), [D](COST-2-d.md). The earlier +0.296 ms result was borderline and preceded the context/clock fixes.

| U4: most recent full original-placement pair (A) | observed | bar | result |
| --- | ---: | ---: | --- |
| all 7,408 primary commits p99 | 988.220 | <=50 | miss |
| burst primary commits p50 | 23.171 | <=10 | miss |
| 5–10 facts at 256 readers p50 / p99 | 22.399 / 49.380 | <=10 / <=50 | miss / met |
| steady queue; worst burst drain | 1 command; 1.182 s | <=2.19; <=60 s | met |
L256 11–25 facts p50/p99 = 24.959/89.899 (bars 10/50, both missed); 26–50 p99 = 49.531 (bar 100, met). Accounting, 7,408/7,408 publication, typed outcomes, RYOW, duplicates and lost ACK checks met. P3 all met (gaps/order/duplicate effects 0, crash points 3, resume exact, lag p99 29.263, affected-set errors 0, correction range 1.0). P1 performance was not retained: goodput ratio 0.927, read p99 272.383, recovery unmeasured. Oracle PASS: 53 reads/2,395 entities; 3,434,915 model reads exact, zero errors. Coverage 8,536/8,542 = 99.930%; compressed raw pair 57,519,223 bytes.
The compact full pair also passed its oracle but missed P2. No full pair was rerun after the final recorder-only changes; final 1k smoke passed oracle (50 reads/3,058 entities), 82/82 coverage. **U4 is not achieved.**

| U5: isolated candidate | traced contributor before -> after | decision/context |
| --- | --- | --- |
| dedicated writer core | L256 run-queue wait 6222.820 -> 161.894; small p50 23.423 -> 19.327, p99 63.504 -> 394.101 | opt-in; summary, swaps 13.222/14.878; off 16.543/228.628, swap 13.687; closing off refused disk: [partial CPU session](CPU-A.md) |
| compact expected model | small L256 p50 22.399 -> 22.015; p99 49.380 -> 290.874 | opt-in; summary, swaps 15.555/15.761, same off reference as A; [model session](MODEL-A.md) |
| gateway IDs; Node output batching | Formatter allocations removed; gzip writes batched at 64 KiB threshold/20 ms with exact final drain | retained, but individual latency benefit is not proved inside one session; U5 is partial |
Neither experimental placement nor compact mode became default. Remaining work: read-trace allocation/context cost, writer heap/GC after bursts, and the socket/Jetty/callback residual; use full JFR only for the targeted cause. The 267 ms timer trigger and closed transactor/storage internals remain unresolved.
Checks: 195 package tests passed/51 service tests skipped, package typecheck/build and focused queue/model/component tests passed; gateway 5 tests/21 assertions. Changed JS bindings pass; root checker still has 124 unchanged inherited coverage gaps. Offline viewer: 38 L256 commit cards/2,046 bars, tail example visible, zero errors/network calls. [PASS/receipt audit](AUDIT-2.md); no acceptance/pin edits or changed pinned paths. The full root check and service integrations are not claimed passing. No P2 promotion, seed mutation, push, or further engine tuning.

Run a default full pair plus off context: `bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-next-pair`.
Cost: `bash lab/experiments/EXP-DX1/t1/session.sh cost tx2-dxt1-next-cost`.
Ablation: `bash lab/experiments/EXP-DX1/t1/session.sh ablation tx2-dxt1-next-ablation`; prefix `DX_TRACE_TEST_GATEWAY=1` for gateway preflight.
Outputs: `$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1/<tag>/TRACE-REPORT.md`, `trace.html`, `trace.chrome.json`, `trace/raw/`; local viewers and committed indices/reports are under `t1/runs/<tag>/`. Global `evidence/TRACE-INDEX.md` locates runs; `node lab/bin/trace-store.mjs list` shows sizes.
All cited raw traces are retained. Auxiliary oracle/read/witness captures have byte-verified gzip archives and recovery journals; `gzip -dk` restores them. [Evidence/check index](CHECKS-2.md). Every owned container/volume was removed before lease release. Budget: ten hours; P2 remains unqualified.
