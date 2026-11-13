# tx2-dxt1-p2-cpu-a

Source 04298a56c00b5aa953b14f65e3a34966e72210e3. PARTIAL SESSION: closing off control refused for disk; opening control only. One quiet hold, 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.

| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- |
| off-before / off | 16.543 | 228.628 | 16.543 / 228.628 | 13.687 (13.616-13.695) |
| baseline-zero / summary | 18.652 | 497.281 | 16.543 / 228.628 | 13.413 (13.049-13.616) |
| baseline-ladder / summary | 24.548 | 736.917 | 16.543 / 228.628 | 13.222 (12.919-15.856) |
| candidate-zero / summary | 16.480 | 327.686 | 16.543 / 228.628 | 15.520 (15.128-15.747) |
| candidate-ladder / summary | 24.983 | 1269.350 | 16.543 / 228.628 | 14.878 (14.691-16.435) |

Controls: tx2-dxt1-p2-cpu-a-off-before. The following values/flags are copied from the existing benchmark gates, not independently certified.

| gate | observed value | bar | existing flag |
| --- | --- | --- | --- |
| baseline-ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| baseline-ladder: NS-P1-GOODPUT-256-VS-64 | 0.88442088809121 | >= 1.0 | false |
| baseline-ladder: NS-P1-READ-P99-256-MS | 296.959 | <= 100 | false |
| baseline-ladder: NS-P1-WRITER-P99-RATIO-256 | 3.1719051477202407 | <= 1.25 | false |
| baseline-ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 121.385498046875 | <= 2000 | true |
| baseline-ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| baseline-ladder: NS-P1-GOODPUT-1024-VS-256 | 0.9117018133294111 | >= 0.9 | true |
| baseline-ladder: NS-P1-WRITER-P99-RATIO-1024 | 2.1234662588077198 | <= 2.0 | false |
| baseline-ladder: NS-P1-RECOVERY-MS | null | <= 60000 | false |
| baseline-ladder: NS-P2 5-10 band p50 ms (L256) | 23.423 | <= 10 | false |
| baseline-ladder: NS-P2 5-10 band p99 ms (L256) | 63.504 | <= 50 | false |
| baseline-ladder: NS-P2 11-25 band p50 ms (L256) | 28.031 | <= 10 | false |
| baseline-ladder: NS-P2 11-25 band p99 ms (L256) | 112.613 | <= 50 | false |
| baseline-ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 121.385 | <= 100 | false |
| baseline-ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| baseline-ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| baseline-ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| baseline-ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| baseline-ladder: NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | true |
| baseline-ladder: NS-P2 queue drains within 60 s after each burst | [0.40876098632813296,0.4342456054687318] | every burst <= 60 s | true |
| baseline-ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| baseline-ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| baseline-ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| baseline-ladder: NS-P3 gaps | 0 | = 0 | true |
| baseline-ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| baseline-ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| baseline-ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| baseline-ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| baseline-ladder: NS-P3 lag p99 ms at L256 | 41.576 | <= 250 | true |
| baseline-ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| baseline-ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |
| candidate-ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| candidate-ladder: NS-P1-GOODPUT-256-VS-64 | 0.8520466188069555 | >= 1.0 | false |
| candidate-ladder: NS-P1-READ-P99-256-MS | 329.727 | <= 100 | false |
| candidate-ladder: NS-P1-WRITER-P99-RATIO-256 | 7.570335109176859 | <= 1.25 | false |
| candidate-ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 394.101318359375 | <= 2000 | true |
| candidate-ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| candidate-ladder: NS-P1-GOODPUT-1024-VS-256 | 0.9849012100600445 | >= 0.9 | true |
| candidate-ladder: NS-P1-WRITER-P99-RATIO-1024 | 0.8355022820227043 | <= 2.0 | true |
| candidate-ladder: NS-P1-RECOVERY-MS | null | <= 60000 | false |
| candidate-ladder: NS-P2 5-10 band p50 ms (L256) | 19.327 | <= 10 | false |
| candidate-ladder: NS-P2 5-10 band p99 ms (L256) | 394.101 | <= 50 | false |
| candidate-ladder: NS-P2 11-25 band p50 ms (L256) | 23.551 | <= 10 | false |
| candidate-ladder: NS-P2 11-25 band p99 ms (L256) | 71.155 | <= 50 | false |
| candidate-ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 31.94 | <= 100 | true |
| candidate-ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| candidate-ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| candidate-ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| candidate-ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| candidate-ladder: NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | true |
| candidate-ladder: NS-P2 queue drains within 60 s after each burst | [0.3139743652343725,1.4025014648437946] | every burst <= 60 s | true |
| candidate-ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| candidate-ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| candidate-ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| candidate-ladder: NS-P3 gaps | 0 | = 0 | true |
| candidate-ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| candidate-ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| candidate-ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| candidate-ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| candidate-ladder: NS-P3 lag p99 ms at L256 | 60.953 | <= 250 | true |
| candidate-ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| candidate-ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |

## Writer CPU versus run-queue wait

| arm | readers | observed ms | on CPU ms | waiting for CPU ms | tracing | swap GiB median | off p50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| baseline-ladder | 0 | 44940.225 | 1177.788 | 84.615 | summary | 13.222 | 16.543 |
| baseline-ladder | 64 | 44217.689 | 3177.229 | 5295.335 | summary | 13.222 | 16.543 |
| baseline-ladder | 256 | 44062.627 | 3018.322 | 6222.820 | summary | 13.222 | 16.543 |
| baseline-ladder | 1024 | 44281.536 | 3240.199 | 6511.304 | summary | 13.222 | 16.543 |
| candidate-ladder | 0 | 44952.418 | 1169.544 | 38.713 | summary | 14.878 | 16.543 |
| candidate-ladder | 64 | 44413.965 | 3113.159 | 123.277 | summary | 14.878 | 16.543 |
| candidate-ladder | 256 | 44250.574 | 4254.821 | 161.894 | summary | 14.878 | 16.543 |
| candidate-ladder | 1024 | 44314.527 | 2873.442 | 251.230 | summary | 14.878 | 16.543 |
