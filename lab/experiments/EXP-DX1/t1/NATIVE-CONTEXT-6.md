# tx2-dxt1-p6-native-a

Source cc62564266eec40d6d486510e3399a08e0a76ed8. One measurement hold, 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.

| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- |
| off-before / off | 13.208 | 56.667 | 11.999 / 49.987 | 12.006 (11.998-12.022) | 48.4 / 213.5 |
| zero / full | 14.628 | 125.618 | 11.999 / 49.987 | 11.990 (11.975-11.998) | 52.6 / 211.9 |
| ladder / full | 17.408 | 161.155 | 11.999 / 49.987 | 11.819 (4.960-12.063) | 64.9 / 302.9 |
| off-after / off | 10.789 | 43.306 | 11.999 / 49.987 | 4.944 (4.944-4.944) | 10.3 / 98.5 |

Controls: tx2-dxt1-p6-native-a-off-before, tx2-dxt1-p6-native-a-off-after. The following values/flags are copied from the existing benchmark gates, not independently certified.

| gate | observed value | bar | existing flag |
| --- | --- | --- | --- |
| ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| ladder: NS-P1-GOODPUT-256-VS-64 | 1.0099597925858126 | >= 1.0 | true |
| ladder: NS-P1-READ-P99-256-MS | 8.703 | <= 100 | true |
| ladder: NS-P1-WRITER-P99-RATIO-256 | 1.2085450590081006 | <= 1.25 | true |
| ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 163.433349609375 | <= 2000 | true |
| ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| ladder: NS-P1-GOODPUT-1024-VS-256 | 1.1108372156858908 | >= 0.9 | true |
| ladder: NS-P1-WRITER-P99-RATIO-1024 | 2.2579289930930044 | <= 2.0 | false |
| ladder: NS-P1-RECOVERY-MS | 30000 | <= 60000 | true |
| ladder: NS-P2 5-10 band p50 ms (L256) | 17.535 | <= 10 | false |
| ladder: NS-P2 5-10 band p99 ms (L256) | 67.645 | <= 50 | false |
| ladder: NS-P2 11-25 band p50 ms (L256) | 18.943 | <= 10 | false |
| ladder: NS-P2 11-25 band p99 ms (L256) | 163.433 | <= 50 | false |
| ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 46.45 | <= 100 | true |
| ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| ladder: NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | true |
| ladder: NS-P2 queue drains within 60 s after each burst | [0.17386938476562364,0.9122995605468986] | every burst <= 60 s | true |
| ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| ladder: NS-P3 gaps | 0 | = 0 | true |
| ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| ladder: NS-P3 lag p99 ms at L256 | 68.68 | <= 250 | true |
| ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |

## Writer CPU versus run-queue wait

| arm | readers | observed ms | on CPU ms | waiting for CPU ms | tracing | swap GiB median | off p50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| ladder | 0 | 44927.031 | 1309.644 | 271.716 | full | 11.819 | 11.999 |
| ladder | 64 | 44418.664 | 4626.345 | 968.430 | full | 11.819 | 11.999 |
| ladder | 256 | 44060.609 | 5141.366 | 1094.379 | full | 11.819 | 11.999 |
| ladder | 1024 | 44476.961 | 5335.973 | 1550.564 | full | 11.819 | 11.999 |
