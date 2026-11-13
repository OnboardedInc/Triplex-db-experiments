# tx2-dxt1-p2-model-a

Source f9f51d85bab0e75977e71edd735d1cb80ffeeb58. One quiet hold, 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.

| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- |
| off-before / off | 16.793 | 248.856 | 16.515 / 454.099 | 15.512 (15.457-15.551) |
| baseline-zero / summary | 17.428 | 626.259 | 16.515 / 454.099 | 15.162 (14.880-15.449) |
| baseline-ladder / summary | 22.332 | 988.220 | 16.515 / 454.099 | 15.555 (15.383-16.822) |
| candidate-zero / summary | 17.049 | 1095.770 | 16.515 / 454.099 | 16.345 (15.855-16.689) |
| candidate-ladder / summary | 22.683 | 978.796 | 16.515 / 454.099 | 15.761 (14.827-17.213) |
| off-after / off | 16.236 | 659.341 | 16.515 / 454.099 | 16.744 (16.377-17.010) |

Controls: tx2-dxt1-p2-model-a-off-before, tx2-dxt1-p2-model-a-off-after. The following values/flags are copied from the existing benchmark gates, not independently certified.

| gate | observed value | bar | existing flag |
| --- | --- | --- | --- |
| baseline-ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| baseline-ladder: NS-P1-GOODPUT-256-VS-64 | 0.9269007695901009 | >= 1.0 | false |
| baseline-ladder: NS-P1-READ-P99-256-MS | 272.383 | <= 100 | false |
| baseline-ladder: NS-P1-WRITER-P99-RATIO-256 | 1.0164331981682322 | <= 1.25 | true |
| baseline-ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 89.89892578125 | <= 2000 | true |
| baseline-ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| baseline-ladder: NS-P1-GOODPUT-1024-VS-256 | 0.9106273492468987 | >= 0.9 | true |
| baseline-ladder: NS-P1-WRITER-P99-RATIO-1024 | 1.4185573517325738 | <= 2.0 | true |
| baseline-ladder: NS-P1-RECOVERY-MS | null | <= 60000 | false |
| baseline-ladder: NS-P2 5-10 band p50 ms (L256) | 22.399 | <= 10 | false |
| baseline-ladder: NS-P2 5-10 band p99 ms (L256) | 49.38 | <= 50 | true |
| baseline-ladder: NS-P2 11-25 band p50 ms (L256) | 24.959 | <= 10 | false |
| baseline-ladder: NS-P2 11-25 band p99 ms (L256) | 89.899 | <= 50 | false |
| baseline-ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 49.531 | <= 100 | true |
| baseline-ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| baseline-ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| baseline-ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| baseline-ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| baseline-ladder: NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | true |
| baseline-ladder: NS-P2 queue drains within 60 s after each burst | [0.4342902832031257,1.1818862304687627] | every burst <= 60 s | true |
| baseline-ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| baseline-ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| baseline-ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| baseline-ladder: NS-P3 gaps | 0 | = 0 | true |
| baseline-ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| baseline-ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| baseline-ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| baseline-ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| baseline-ladder: NS-P3 lag p99 ms at L256 | 29.263 | <= 250 | true |
| baseline-ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| baseline-ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |
| candidate-ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| candidate-ladder: NS-P1-GOODPUT-256-VS-64 | 0.8623175501328648 | >= 1.0 | false |
| candidate-ladder: NS-P1-READ-P99-256-MS | 313.343 | <= 100 | false |
| candidate-ladder: NS-P1-WRITER-P99-RATIO-256 | 8.351815609797132 | <= 1.25 | false |
| candidate-ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 290.8740234375 | <= 2000 | true |
| candidate-ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| candidate-ladder: NS-P1-GOODPUT-1024-VS-256 | 0.9511811961828072 | >= 0.9 | true |
| candidate-ladder: NS-P1-WRITER-P99-RATIO-1024 | 1.276056173247591 | <= 2.0 | true |
| candidate-ladder: NS-P1-RECOVERY-MS | null | <= 60000 | false |
| candidate-ladder: NS-P2 5-10 band p50 ms (L256) | 22.015 | <= 10 | false |
| candidate-ladder: NS-P2 5-10 band p99 ms (L256) | 290.874 | <= 50 | false |
| candidate-ladder: NS-P2 11-25 band p50 ms (L256) | 23.551 | <= 10 | false |
| candidate-ladder: NS-P2 11-25 band p99 ms (L256) | 70.285 | <= 50 | false |
| candidate-ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 31.982 | <= 100 | true |
| candidate-ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| candidate-ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| candidate-ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| candidate-ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| candidate-ladder: NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | true |
| candidate-ladder: NS-P2 queue drains within 60 s after each burst | [0.21215747070311863,1.8151860351562163] | every burst <= 60 s | true |
| candidate-ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| candidate-ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| candidate-ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| candidate-ladder: NS-P3 gaps | 0 | = 0 | true |
| candidate-ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| candidate-ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| candidate-ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| candidate-ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| candidate-ladder: NS-P3 lag p99 ms at L256 | 42.231 | <= 250 | true |
| candidate-ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| candidate-ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |

## Writer CPU versus run-queue wait

| arm | readers | observed ms | on CPU ms | waiting for CPU ms | tracing | swap GiB median | off p50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| baseline-ladder | 0 | 44959.930 | 1206.292 | 112.329 | summary | 15.555 | 16.515 |
| baseline-ladder | 64 | 44135.161 | 2983.138 | 4884.752 | summary | 15.555 | 16.515 |
| baseline-ladder | 256 | 44038.630 | 2692.431 | 5733.661 | summary | 15.555 | 16.515 |
| baseline-ladder | 1024 | 44145.559 | 3262.862 | 6379.807 | summary | 15.555 | 16.515 |
| candidate-ladder | 0 | 44962.279 | 1016.487 | 95.993 | summary | 15.761 | 16.515 |
| candidate-ladder | 64 | 44410.417 | 3169.678 | 4828.172 | summary | 15.761 | 16.515 |
| candidate-ladder | 256 | 44076.369 | 3181.822 | 6439.713 | summary | 15.761 | 16.515 |
| candidate-ladder | 1024 | 44432.881 | 2806.131 | 6125.589 | summary | 15.761 | 16.515 |
