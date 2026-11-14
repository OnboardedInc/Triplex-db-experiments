# tx2-dxt1-p6-reference-a

Source c9b9fc3f8449173812651ebf264c1d7132386aed. One measurement hold, 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.

| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |
| --- | ---: | ---: | --- | --- | --- |
| off-before / off | 13.724 | 104.423 | 13.366 / 77.784 | 11.649 (11.649-11.649) | 45.6 / 197.0 |
| zero / summary | 13.551 | 208.668 | 13.366 / 77.784 | 11.649 (11.524-11.649) | 55.5 / 247.1 |
| ladder / summary | 15.742 | 203.881 | 13.366 / 77.784 | 10.701 (10.677-12.108) | 65.3 / 308.4 |
| off-after / off | 13.008 | 51.145 | 13.366 / 77.784 | 12.053 (12.045-12.084) | 54.8 / 190.4 |

Controls: tx2-dxt1-p6-reference-a-off-before, tx2-dxt1-p6-reference-a-off-after. The following values/flags are copied from the existing benchmark gates, not independently certified.

| gate | observed value | bar | existing flag |
| --- | --- | --- | --- |
| ladder: NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | true |
| ladder: NS-P1-GOODPUT-256-VS-64 | 0.9704190990349689 | >= 1.0 | false |
| ladder: NS-P1-READ-P99-256-MS | 8.383 | <= 100 | true |
| ladder: NS-P1-WRITER-P99-RATIO-256 | 2.244690085106036 | <= 1.25 | false |
| ladder: NS-P1-WRITER-WAIT-MAX-MS (L256) | 134.3232421875 | <= 2000 | true |
| ladder: NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | true |
| ladder: NS-P1-GOODPUT-1024-VS-256 | 0.8704191297614783 | >= 0.9 | false |
| ladder: NS-P1-WRITER-P99-RATIO-1024 | 6.9454545102562655 | <= 2.0 | false |
| ladder: NS-P1-RECOVERY-MS | 40000 | <= 60000 | true |
| ladder: NS-P2 5-10 band p50 ms (L256) | 15.999 | <= 10 | false |
| ladder: NS-P2 5-10 band p99 ms (L256) | 52.613 | <= 50 | false |
| ladder: NS-P2 11-25 band p50 ms (L256) | 16.383 | <= 10 | false |
| ladder: NS-P2 11-25 band p99 ms (L256) | 134.323 | <= 50 | false |
| ladder: NS-P2 26-50 band p99 ms (L256, provisional) | 30.939 | <= 100 | true |
| ladder: NS-P2 every offered command accounted | 0 | = 0 | true |
| ladder: NS-P2 every oracle-valid trace command published | "7408/7408" | all | true |
| ladder: NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | true |
| ladder: NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | true |
| ladder: NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | true |
| ladder: NS-P2 queue drains within 60 s after each burst | [0.1267316894531234,0.6024804687499454] | every burst <= 60 s | true |
| ladder: NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | true |
| ladder: NS-P2 duplicates return the original receipt | 1 | = 1.0 | true |
| ladder: NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | true |
| ladder: NS-P3 gaps | 0 | = 0 | true |
| ladder: NS-P3 per-subject order violations | 0 | = 0 | true |
| ladder: NS-P3 visible duplicate effects | 0 | = 0 | true |
| ladder: NS-P3 resume from checkpoint replays exactly | true | = true | true |
| ladder: NS-P3 crash injection at three points | 3 | = 3 | true |
| ladder: NS-P3 lag p99 ms at L256 | 221.096 | <= 250 | true |
| ladder: NS-P3 affected-subject set matches | 0 | = 0 | true |
| ladder: NS-P3 corrections report their valid-time range | 1 | = 1.0 | true |

## Writer CPU versus run-queue wait

| arm | readers | observed ms | on CPU ms | waiting for CPU ms | tracing | swap GiB median | off p50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| ladder | 0 | 44964.284 | 1085.671 | 38.510 | summary | 10.701 | 13.366 |
| ladder | 64 | 44543.695 | 4217.003 | 117.418 | summary | 10.701 | 13.366 |
| ladder | 256 | 44115.631 | 4900.896 | 241.968 | summary | 10.701 | 13.366 |
| ladder | 1024 | 44554.899 | 4903.210 | 629.273 | summary | 10.701 | 13.366 |

# tx2-dxt1-p6-reference-a-ladder: DONE

Diagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.

## Every bar

| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 0.9704190990349689 | >= 1.0 | MISS | 0.030 below threshold |  |
| P1 | NS-P1-READ-P99-256-MS | 8.383 | <= 100 | MET |  |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 2.244690085106036 | <= 1.25 | MISS | 0.995 above threshold | matched zero-reader run, same trace-time window |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 134.3232421875 | <= 2000 | MET |  |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 0.8704191297614783 | >= 0.9 | MISS | 0.030 below threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 6.9454545102562655 | <= 2.0 | MISS | 4.945 above threshold | matched zero-reader run, same trace-time window |
| P1 | NS-P1-RECOVERY-MS | 40000 | <= 60000 | MET |  |  |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.594637669674112 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 53738 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0.0001928039152048381,0.0014092562985831634,0,0.00017837707520126648,0.0018651444526361376] | reported | UNVERIFIED |  | Replica-eligible reads are local; unresolved cuts use the gateway |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 15.999 | <= 10 | MISS | 5.999 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 52.613 | <= 50 | MISS | 2.613 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 16.383 | <= 10 | MISS | 6.383 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 134.323 | <= 50 | MISS | 84.323 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 30.939 | <= 100 | MET |  |  |
| P2 | NS-P2 every offered command accounted | 0 | = 0 | MET |  |  |
| P2 | NS-P2 every oracle-valid trace command published | "7408/7408" | all | MET |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | MET |  |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [0.1267316894531234,0.6024804687499454] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | true | = true | MET |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 221.096 | <= 250 | MET |  |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 0.034 | <= 5 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 0.293 | <= 25 | MET |  |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 0.429 | <= 50 | MET |  |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 8598.313730938573 | >= 1100 | MET |  |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 1.0714285714285714 | <= 1.1 | MET |  | requires complete growth to depths 3 and 10 on the full sample |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 11 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  | requires committed positions past capture; observed: [4800,4805,4802,4807,4801,4810,4806,4803,4804,4809] |
| P5 | NS-P5 live read p99 during sweep / presweep | null | <= 1.5 | UNVERIFIED |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | null | <= 1.5 | UNVERIFIED |  |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

## Writer pending at every phase boundary

```text
[ns 11:13:09] phase warmup: 16 readers at trace 0s; writer pending 0
[ns 11:13:24] phase baseline: 0 readers at trace 15s; writer pending 1
[ns 11:14:09] phase L1: 1 readers at trace 60s; writer pending 1
[ns 11:14:54] phase L4: 4 readers at trace 105s; writer pending 1
[ns 11:15:39] phase L16: 16 readers at trace 150s; writer pending 2
[ns 11:16:24] phase L64: 64 readers at trace 195s; writer pending 0
[ns 11:17:09] phase L256: 256 readers at trace 240s; writer pending 0
[ns 11:17:54] phase L1024: 1024 readers at trace 285s; writer pending 0
[ns 11:18:40] phase recovery: 256 readers at trace 330s; writer pending 0
[ns 11:19:40] phase p4mix: 1 readers at trace 390s; writer pending 0
[ns 11:20:26] phase p4h1: 1 readers at trace 437s; writer pending 0
[ns 11:21:11] phase grow3: 0 readers at trace 482s; writer pending 0
[ns 11:21:21] phase p4h3: 1 readers at trace 492s; writer pending 0
[ns 11:22:06] phase grow10: 0 readers at trace 537s; writer pending 2
[ns 11:22:23] phase p4h10: 1 readers at trace 553s; writer pending 0
[ns 11:23:08] phase presweep: 64 readers at trace 598s; writer pending 0
[ns 11:23:53] phase sweep: 64 readers at trace 643s; writer pending 0
```

## P2 commit latency per size band (ms)

| Window | Facts | Count | p50 | p99 |
|---|---|---|---|---|
| bandsAll | 5-10 | 4482 | 14.079 | 200.703 |
| bandsAll | 11-25 | 2166 | 17.023 | 209.919 |
| bandsAll | 26-50 | 760 | 22.271 | 216.063 |
| bandsAtL256 | 5-10 | 29 | 15.999 | 52.613 |
| bandsAtL256 | 11-25 | 16 | 16.383 | 134.323 |
| bandsAtL256 | 26-50 | 1 | 30.939 | 30.939 |
| bandsSteady | 5-10 | 510 | 14.335 | 335.871 |
| bandsSteady | 11-25 | 271 | 17.535 | 182.271 |
| bandsSteady | 26-50 | 81 | 24.575 | 123.907 |
| bandsBurst | 5-10 | 3972 | 14.015 | 191.487 |
| bandsBurst | 11-25 | 1895 | 16.895 | 211.967 |
| bandsBurst | 26-50 | 679 | 21.631 | 245.759 |

## P1 reader ladder and writer comparison

| Phase | Readers | Read p50 | Read p99 | Correct/s | Commit p50 | Commit p99 | Matched zero-reader p99 | Feed lag p99 | Client saturated | Reader thread ELU | Main ELU | Per-container mean CPU % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 0.018 | 0.236 | 15371.606 | 20.991 | 106.591 | 175.597 | 2095.771 | False | [0.6825400166836515,0.005526881546805849,0.004042391081578609,0.005317609009409476] | 0.041 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.460644401148117},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":17.08030829498221},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":3.3499098427930916},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":2.98106969413338}} |
| L4 | 4 | 0.021 | 0.351 | 14474.146 | 17.023 | 252.927 | 83.967 | 83.455 | False | [0.35979650480621067,0.30372412709872826,0.01935670971174411,0.2998491800557707] | 0.288 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":4.558816558062196},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":31.820725665047572},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":18.381293774596955},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":22.937844254639742}} |
| L16 | 16 | 0.087 | 1.215 | 13498.868 | 16.383 | 157.695 | 68.095 | 2072.575 | False | [0.5428516714308649,0.5878530055175705,0.5541482778056742,0.027268839486406977] | 0.311 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":4.929446921960787},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":29.614878377652975},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":15.297449234011694},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":22.912336994935483}} |
| L64 | 64 | 0.369 | 2.255 | 34393.255 | 14.591 | 89.318 | 133.756 | 78.784 | False | [0.7551416063239728,0.7517871995370321,0.7539675050889788,0.010165633607790566] | 0.082 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.0915852734283402},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":8.294236040194},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":2.394251781070305},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":3.263908062563679}} |
| L256 | 256 | 1.599 | 8.383 | 33375.871 | 16.383 | 134.323 | 59.840 | 221.096 | False | [0.8034629579556574,0.8102796718513292,0.8138524136389487,0.007740611713326622] | 0.100 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.0995195154897857},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":7.573369804212521},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":2.128635538482356},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":4.317805806057096}} |
| L1024 | 1024 | 4.767 | 23.935 | 29050.997 | 22.527 | 210.217 | 30.267 | 457.706 | True | [0.9621024249714399,0.9711419522467836,0.008674584843128582,0.9663011608936608] | 0.100 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.0680979671836304},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":6.924675090072071},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":3.3019884074169847},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":16.26673297593788}} |

### Reader correctness and apparatus per level

| Phase | Reads | Correct | Violations | Errors | Hot share | Split counters | Maintenance jobs | Main ELU | Max worker ELU |
|---|---|---|---|---|---|---|---|---|---|
| L1 | 660973 | 660973 | 0 | 0 | 0.597 | {"reads":53,"straddledATraceCommand":53,"straddledCorrect":53} | 1 | 0.041 | 0.683 |
| L4 | 622394 | 622394 | 0 | 0 | 0.600 | {"reads":4246,"straddledATraceCommand":4158,"straddledCorrect":4158} | 1 | 0.288 | 0.360 |
| L16 | 580448 | 580448 | 0 | 0 | 0.616 | {"reads":12308,"straddledATraceCommand":11574,"straddledCorrect":11574} | 1 | 0.311 | 0.588 |
| L64 | 1478904 | 1478904 | 0 | 0 | 0.603 | {"reads":3028,"straddledATraceCommand":3028,"straddledCorrect":3028} | 1 | 0.082 | 0.755 |
| L256 | 1435162 | 1435162 | 0 | 0 | 0.597 | {"reads":10687,"straddledATraceCommand":10676,"straddledCorrect":10676} | 1 | 0.100 | 0.814 |
| L1024 | 1249233 | 1249233 | 0 | 0 | 0.595 | {"reads":24592,"straddledATraceCommand":24249,"straddledCorrect":24249} | 1 | 0.100 | 0.971 |

Matched baseline identity: `{"traceDigest":"aa8a7636ff027ab3","offeredUntilTraceS":899.9998264160156,"source":"$EVIDENCE/tx2-dxt1-p6-reference-a-ladder/input/ns-writes.jsonl","sha256":"c2f8a9d6cef19d0224492f61222563923575e6713b605b3f22092954dd536d9a"}`.

## P4 weighted mix and history

| Group | Latency / bytes summary |
|---|---|
| weighted | {"count":632970,"minMs":0.002,"maxMs":21.856,"meanMs":0.053,"p50Ms":0.034,"p90Ms":0.097,"p99Ms":0.293,"p999Ms":0.611} |
| bucket:medium | {"count":221492,"minMs":0.002,"maxMs":6.3,"meanMs":0.064,"p50Ms":0.051,"p90Ms":0.118,"p99Ms":0.271,"p999Ms":0.659,"meanBytes":354769.09134867176} |
| hops:3 | {"count":252535,"minMs":0.002,"maxMs":8.886,"meanMs":0.05,"p50Ms":0.031,"p90Ms":0.094,"p99Ms":0.287,"p999Ms":0.651,"meanBytes":266265.6447304334} |
| hops:4 | {"count":221472,"minMs":0.002,"maxMs":21.856,"meanMs":0.053,"p50Ms":0.035,"p90Ms":0.098,"p99Ms":0.293,"p999Ms":0.587,"meanBytes":273586.98757856525} |
| hops:6 | {"count":158963,"minMs":0.002,"maxMs":5.403,"meanMs":0.056,"p50Ms":0.038,"p90Ms":0.101,"p99Ms":0.301,"p999Ms":0.599,"meanBytes":279726.4814453678} |
| bucket:large | {"count":93823,"minMs":0.002,"maxMs":15.002,"meanMs":0.11,"p50Ms":0.084,"p90Ms":0.217,"p99Ms":0.429,"p999Ms":0.899,"meanBytes":734171.8856037433} |
| bucket:small | {"count":317655,"minMs":0.002,"maxMs":21.856,"meanMs":0.028,"p50Ms":0.022,"p90Ms":0.046,"p99Ms":0.103,"p999Ms":0.323,"meanBytes":78193.91532007996} |

| History / throughput field | Observed |
|---|---|
| history | {"eligibleForDepthComparison":true,"invalid":[],"indexing":[{"job":"249644dc-eee4-4663-98e0-d26167a9d2d8","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213Z2IxNWNqOTY5ZiIsMF0","requestedT":"143720","requestedAtMs":1794655225038,"completed":true,"completedAtMs":1794655226288,"phase":"p4h1","driverRequestedAtMs":1794655225037.5461,"driverCompletedAtMs":1794655226288.8647,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"07a881d8-f868-4cef-aecf-a5a0316e043e","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213Z2IxNWNqOTY5ZiIsMF0","requestedT":"144188","requestedAtMs":1794655280142,"completed":true,"completedAtMs":1794655281438,"phase":"p4h3","driverRequestedAtMs":1794655280141.903,"driverCompletedAtMs":1794655281439.1926,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"0425c2a2-416e-4def-9a53-a13207bc58f8","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213Z2IxNWNqOTY5ZiIsMF0","requestedT":"144762","requestedAtMs":1794655340587,"completed":true,"completedAtMs":1794655343146,"phase":"p4h10","driverRequestedAtMs":1794655340586.8843,"driverCompletedAtMs":1794655343147.9863,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"}],"ratios":{"mean":1.0416666666666667,"p50":1.0833333333333333,"p99":1.0714285714285714},"sampleSubjects":1000,"growth":[{"targetDepth":3,"reachedDepth":3,"subjects":1000,"commands":4,"assertions":4000,"failures":0,"wallS":8.82897607421875},{"targetDepth":10,"reachedDepth":10,"subjects":1000,"commands":14,"assertions":14000,"failures":0,"wallS":14.123094970703125}],"depth1":{"count":1279377,"minMs":0.002,"maxMs":9.534,"meanMs":0.024,"p50Ms":0.012,"p90Ms":0.052,"p99Ms":0.182,"p999Ms":0.381},"depth3":{"count":1228855,"minMs":0.002,"maxMs":49.087,"meanMs":0.025,"p50Ms":0.012,"p90Ms":0.054,"p99Ms":0.191,"p999Ms":0.391},"depth10":{"count":1205738,"minMs":0.002,"maxMs":15.73,"meanMs":0.025,"p50Ms":0.013,"p90Ms":0.055,"p99Ms":0.195,"p999Ms":0.397},"clientBytes":{"depth1":269088.13448988873,"depth3":269310.33404493186,"depth10":269367.96799827385},"engineBytesRead":"not measured: neither engine exposes bytes read per query here (seam)"} |
| throughput | {"bestLevel":"L64","goodputPerS":34393.25492375429,"engineCpuQuotaCores":4,"pullsPerSPerQuotaCore":8598.313730938573,"engineCpuPercentMean":15.043981157256331,"pullsPerSPerUsedCore":228618.04042585503,"hostClientCpu":{"userCores":1.4900574572409722,"kernelCores":0.052886108736178106,"hostCores":8},"hostBrokerCpu":"none in this composition (no broker process)"} |

## Three slowest measured read phases

| Phase | Read p99 ms | Engine CPU mean % by container | Client signals |
|---|---|---|---|
| L1024 | 23.935 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.0680979671836304},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":6.924675090072071},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":3.3019884074169847},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":16.26673297593788}} | {"workerEluMean":[0.9621024249714399,0.9711419522467836,0.008674584843128582,0.9663011608936608],"maxWorkerElu":0.9711419522467836,"mainElu":0.09966658298437205,"processCpuMsPerLocalReadUpperBound":0.11826240613744614,"saturated":true} |
| L256 | 8.383 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":1.0995195154897857},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":7.573369804212521},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":2.128635538482356},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":4.317805806057096}} | {"workerEluMean":[0.8034629579556574,0.8102796718513292,0.8138524136389487,0.007740611713326622],"maxWorkerElu":0.8138524136389487,"mainElu":0.10043160653818517,"processCpuMsPerLocalReadUpperBound":0.08640007498749047,"saturated":false} |
| recovery | 8.127 | {"tx2-dxt1-p6-reference-a-ladder-pg":{"cpuPercentMean":0.5511104409292259},"tx2-dxt1-p6-reference-a-ladder-tx":{"cpuPercentMean":4.304118678865298},"tx2-dxt1-p6-reference-a-ladder-gw-w":{"cpuPercentMean":2.5841580190986813},"tx2-dxt1-p6-reference-a-ladder-gw-r":{"cpuPercentMean":4.9829084951534615}} | {"workerEluMean":[0.8102043418786349,0.8112558531555221,0.8228139452847409,0.007162458081400467],"maxWorkerElu":0.8228139452847409,"mainElu":0.10371041425534515,"processCpuMsPerLocalReadUpperBound":0.09301839739741721,"saturated":false} |

## Three longest phases by elapsed wall time

| Phase | Elapsed s | Cgroup samples | Per-container mean CPU % |
|---|---|---|---|
| tail | 255.418 | 255 | {"tx2-dxt1-p6-reference-a-ladder-gw-r":6.8983477345750215,"tx2-dxt1-p6-reference-a-ladder-gw-w":5.640369001946684,"tx2-dxt1-p6-reference-a-ladder-pg":1.6784765649733053,"tx2-dxt1-p6-reference-a-ladder-tx":9.471138313760433} |
| recovery | 60.000 | 60 | {"tx2-dxt1-p6-reference-a-ladder-gw-r":4.882713237225159,"tx2-dxt1-p6-reference-a-ladder-gw-w":2.6496845466304353,"tx2-dxt1-p6-reference-a-ladder-pg":0.559163617462861,"tx2-dxt1-p6-reference-a-ladder-tx":4.322305165134097} |
| baseline | 45.006 | 45 | {"tx2-dxt1-p6-reference-a-ladder-gw-r":3.7481470475955954,"tx2-dxt1-p6-reference-a-ladder-gw-w":3.483162017167506,"tx2-dxt1-p6-reference-a-ladder-pg":0.3934930995073568,"tx2-dxt1-p6-reference-a-ladder-tx":3.8792211575185256} |

CPU describes concurrent measured activity only; no causal attribution is inferred. Raw gateway/transactor logs are retained as `gw-w.log`, `gw-r.log`, `tx.log`.

## Counters, feed, fetch-only sweep, oracle and invalidity

Raw time series and full long arrays remain in the retained ns-report.json; the following counter summaries omit series and sample long arrays.

### P2 duplicates

```json
{
  "resends": 227,
  "considered": 227,
  "returnedOriginal": 227
}
```

### P2 lost ACK

```json
{
  "simulated": 80,
  "returnedOriginal": 80,
  "retryTags": {
    "Unknown": 80
  }
}
```

### P2 accounting

```json
{
  "byStreamAndOutcome": {
    "background:committed": 7408,
    "probe10:committed": 898,
    "p5-mutation:committed": 10
  },
  "resendsByResult": {
    "resolved-by-command": 227
  },
  "unaccounted": 0,
  "pendingAtEnd": 0,
  "errorTags": {}
}
```

### P2 read-your-own-write

```json
{
  "pulls": 7408,
  "correct": 7408,
  "pull": {
    "count": 7408,
    "minMs": 0.929,
    "maxMs": 1388.524,
    "meanMs": 56.322,
    "p50Ms": 13.887,
    "p90Ms": 97.279,
    "p99Ms": 765.951,
    "p999Ms": 1310.719
  },
  "watermarkWait": {
    "count": 7408,
    "minMs": 0,
    "maxMs": 141.409,
    "meanMs": 11.095,
    "p50Ms": 6.623,
    "p90Ms": 30.847,
    "p99Ms": 68.607,
    "p999Ms": 108.031
  },
  "fallbackReasons": {
    "watermark-timeout": 939
  },
  "routes": {
    "replica": 6469,
    "fallback": 939
  },
  "failures": []
}
```

### P2 progress

```json
{
  "validOffered": 7408,
  "validPublished": 7408,
  "typedRejections": 0,
  "typedConflicts": 0,
  "invalidCommandsInTrace": 0,
  "queue": {
    "steadyRateCommandsPerS": 1.094890510948905,
    "steadyBound": 2.18978102189781,
    "steadySamples": 660,
    "steadyMax": 2,
    "drains": [
      {
        "burstAtS": 120,
        "peakQueued": 11,
        "drainS": 0.1267316894531234
      },
      {
        "burstAtS": 720,
        "peakQueued": 5,
        "drainS": 0.6024804687499454
      }
    ],
    "seriesFields": [
      "traceS",
      "backgroundQueuedOrInFlight",
      "allStreamsQueuedOrInFlight"
    ]
  }
}
```

### P3

```json
{
  "consumer": "dependency-index",
  "cursor": {
    "epoch": "ns-datomic-10k-nsmwgb15cj969f#0",
    "position": {
      "stream": "triplex-journal:ns-datomic-10k-nsmwgb15cj969f",
      "epoch": 0,
      "offset": 8545,
      "ordinal": 0
    }
  },
  "counts": {
    "pages": 10069,
    "pollErrors": 0,
    "entries": 8334,
    "deliveries": 8335,
    "redeliveries": 1,
    "redeliveryMismatches": 0,
    "replayAttempts": 1,
    "effectsWritten": 17317,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 80,
    "correctionRangeReported": 80,
    "durableWrites": 7303,
    "seenBeforeAck": 1632
  },
  "gaps": 0,
  "gapSample": [],
  "notReachedAtStop": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 8545,
      "checkpointAtStop": 8545,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794654857243.7004,
      "fired": true,
      "checkpoint": 346,
      "catchUpMs": 81.94482421875
    },
    {
      "point": "after-effect",
      "plannedAt": 1794654902243.7004,
      "fired": true,
      "checkpoint": 447,
      "catchUpMs": 56.433349609375
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794654947243.7004,
      "fired": true,
      "checkpoint": 2511,
      "catchUpMs": 263.963623046875
    }
  ],
  "replay": {
    "from": 346,
    "to": 8545,
    "replayed": 8199,
    "firstDeliveries": 8199,
    "mismatches": 0,
    "exact": true
  },
  "lag": {
    "fromCommitInstant": {
      "count": 8331,
      "minMs": 1.865,
      "maxMs": 2294.123,
      "meanMs": 27.948,
      "p50Ms": 6.623,
      "p90Ms": 22.143,
      "p99Ms": 606.207,
      "p999Ms": 2244.607
    },
    "fromDriverAck": {
      "count": 8331,
      "minMs": 0,
      "maxMs": 2293.366,
      "meanMs": 26.849,
      "p50Ms": 5.887,
      "p90Ms": 20.863,
      "p99Ms": 606.207,
      "p999Ms": 2244.607
    },
    "atL256": {
      "count": 89,
      "minMs": 3.419,
      "maxMs": 221.096,
      "meanMs": 13.595,
      "p50Ms": 9.855,
      "p90Ms": 18.815,
      "p99Ms": 221.096,
      "p999Ms": 221.096
    },
    "commitTime": "producer publication record (bound host/boot hrtime; observer required); 'known' = durable affected-set + checkpoint write"
  },
  "expectedAffected": "direct subjects from command intent; dependency-rule subjects (O-DOMAIN) are a seam: the trace writes only own entities, so expected = {subject}"
}
```

### P5

```json
{
  "status": "FAIL-CLOSED (evaluate and publish seams)",
  "sweep": {
    "subjects": 10000,
    "coverageSha256": "1899ec16689e0477ac35484f5cacefc22e284a929c103400ef4f1638739aba08",
    "basis": {
      "recordedAt": 1794655433067,
      "validAt": 1794655433179,
      "position": {
        "stream": "triplex-journal:ns-datomic-10k-nsmwgb15cj969f",
        "epoch": 0,
        "offset": 4799,
        "ordinal": 0
      },
      "txId": "_tx/01M7CWSCBB96KJVYV94MFEV63M"
    },
    "release": {
      "id": "R-stub-v0",
      "sha256": "0af59c692133a17fa09d46bd6438036e76c94442c6afb3430b6d65234ad1b3f3"
    },
    "concurrency": 16,
    "mutatedAfterCapture": [
      7510,
      2146,
      352,
      2554,
      9980,
      9011,
      6082,
      5009,
      7302,
      3365
    ],
    "evaluate": {
      "status": "fail-closed",
      "owner": "EXP-D01 (W0 reference kernel, O-DOMAIN)",
      "reason": "evaluate(subjectWorld, release) is not implemented"
    },
    "publish": {
      "status": "fail-closed",
      "owner": "outbox path (TARGETS section 3 atomic outbox and work items)",
      "reason": "publish(evaluations) through the outbox is not implemented"
    },
    "throttledVariant": {
      "status": "not-run",
      "reason": "needs evaluate and an observable compaction or rebuild to overlap (seam)"
    },
    "startedAt": 1794655433184.221,
    "mutationPositions": [
      4800,
      4805,
      4802,
      4807,
      4801,
      4810,
      4806,
      4803,
      4804,
      4809
    ],
    "endedAt": 1794655434273.961,
    "completed": true,
    "wallMs": 1088.8274150000652,
    "mutationsCommittedAfterCapture": true,
    "pulled": 10000,
    "distinctSubjects": 10000,
    "exactCoverage": true,
    "correctAtBasis": 10000,
    "violations": 0,
    "errors": 0,
    "pull": {
      "count": 10000,
      "minMs": 0.023,
      "maxMs": 26.096,
      "meanMs": 0.774,
      "p50Ms": 0.389,
      "p90Ms": 1.487,
      "p99Ms": 6.623,
      "p999Ms": 25.855
    },
    "pullsPerS": 9184.191968567766,
    "fetchOnlyWallFor100kS": 10.888274150000651,
    "mutatedSubjectsAtBasis": 10
  },
  "live": {
    "presweep": {
      "read": {
        "count": 1309518,
        "minMs": 0.002,
        "maxMs": 800.653,
        "meanMs": 0.522,
        "p50Ms": 0.373,
        "p90Ms": 1.071,
        "p99Ms": 2.495,
        "p999Ms": 5.311
      },
      "commit": {
        "count": 55,
        "minMs": 9.061,
        "maxMs": 43.275,
        "meanMs": 18.089,
        "p50Ms": 15.231,
        "p90Ms": 30.207,
        "p99Ms": 43.275,
        "p999Ms": 43.275
      }
    },
    "duringSweep": {
      "read": {
        "count": 0,
        "minMs": null,
        "maxMs": null,
        "meanMs": null,
        "p50Ms": null,
        "p90Ms": null,
        "p99Ms": null,
        "p999Ms": null
      },
      "commit": {
        "count": 0,
        "minMs": null,
        "maxMs": null,
        "meanMs": null,
        "p50Ms": null,
        "p90Ms": null,
        "p99Ms": null,
        "p999Ms": null
      }
    }
  }
}
```

### correctness

```json
{
  "reads": 14958651,
  "correct": 14958651,
  "violations": 0,
  "errors": 0,
  "violationKinds": {},
  "violationSample": [],
  "rule": "a read is correct when its :placement/stamp and whole-world multiset digest equal the expected-state model at the basis the driver requested (receipt instant R, valid time V); errors and wrong answers are never goodput"
}
```

### oracle

```json
{
  "status": "PASS",
  "oracleVerdict": "PASS",
  "divergedAtCommand": null,
  "receiptConsistency": "PASS",
  "receiptViolations": [],
  "exitCode": 0,
  "reads": 53,
  "entityQueries": 2626,
  "oracleMs": 248876,
  "mismatches": [],
  "mismatchCount": 0,
  "modelCorrectOnSameReads": 53,
  "recordedCommands": 810
}
```

### client

```json
{
  "burstMainEluMean": 0.3931103230664619,
  "peakProcessBytes": 5673902080,
  "saturatedPhases": [
    "L1024",
    "p4mix",
    "p4h1",
    "p4h3",
    "p4h10"
  ],
  "invalid": true,
  "processCpu": {
    "userCores": 1.4900574572409722,
    "kernelCores": 0.052886108736178106,
    "hostCores": 8
  },
  "readerThreads": 3,
  "rule": "INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window"
}
```

### invalidReasons

```json
null
```

### writer

```json
{
  "offered": 8543,
  "completed": 8543,
  "expired": 0,
  "notOffered": 40496,
  "maxInFlightSeen": 20,
  "pendingAtEnd": 0,
  "offeredUntilTraceS": 899.99945703125,
  "overlays": {
    "probe10": 898,
    "p5-mutation": 10
  }
}
```

Additional validity limits: smoke profile; matched baseline covers the same trace windows (identity above); any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

## Gateway scan counters

| At | Write peer | Read peer |
|---|---|---|
| 2026-11-14T11:10:32.440Z | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":0,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":0,\"revisionHits\":0,\"bytes\":0,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":0,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":0,\"revisionHits\":0,\"bytes\":0,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} |
| 2026-11-14T11:34:04.788Z | {"status":200,"body":"{\"routes\":{\"post \\/v2\\/db\\/{db}\\/begin\":1202,\"post \\/v2\\/db\\/{db}\\/command\":307,\"post \\/v2\\/db\\/{db}\\/journal\":307,\"post \\/v1\\/db\\/{db}\\/release\":307,\"get \\/v2\\/admin\\/scan-stats\":283,\"post \\/v1\\/db\\/create\":11,\"post \\/v2\\/db\\/{db}\\/request-index\":9,\"get \\/health\":1,\"get \\/v1\\/db\\/{db}\\/basis\":965,\"post \\/v1\\/db\\/{db}\\/transact\":8825},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":0,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":0,\"revisionHits\":0,\"bytes\":0,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":283,\"post \\/v1\\/db\\/create\":22,\"post \\/v2\\/db\\/{db}\\/transactions\":16735,\"post \\/v2\\/db\\/{db}\\/reach-many\":3052,\"post \\/v2\\/db\\/{db}\\/reach\":5115},\"recordTimeWaits\":1,\"entityCache\":{\"revisionMisses\":671543,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":3591,\"evictions\":242633,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":981226,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":4990,\"recentBytes\":0,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":0,\"revisionHits\":555907,\"bytes\":250537844,\"verify\":false,\"entityBytes\":217489364,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":246224,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":4432,\"revisionBytes\":33048480}}"} |

Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.

### Last successful gateway counter snapshots

w: last successful sample at 2026-11-14T11:34:04.788Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"post /v2/db/{db}/begin":1202,"post /v2/db/{db}/command":307,"post /v2/db/{db}/journal":307,"post /v1/db/{db}/release":307,"get /v2/admin/scan-stats":283,"post /v1/db/create":11,"post /v2/db/{db}/request-index":9,"get /health":1,"get /v1/db/{db}/basis":965,"post /v1/db/{db}/transact":8825} |
| entityCache | {"revisionMisses":0,"recentHits":0,"recentBudgetBytes":16777216,"entries":0,"evictions":0,"recentVerified":0,"entityBudgetBytes":218103808,"hits":0,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":0,"revisionViews":0,"recentBytes":0,"recentReports":0,"verificationErrors":0,"budgetBytes":268435456,"recentStates":0,"revisionHits":0,"bytes":0,"verify":false,"entityBytes":0,"recentChanges":0,"recentLagFallbacks":0,"misses":0,"revisionBudgetBytes":33554432,"verified":0,"revisionEvictions":0,"revisionBytes":0} |

r: last successful sample at 2026-11-14T11:34:04.788Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"get /health":1,"get /v2/admin/scan-stats":283,"post /v1/db/create":22,"post /v2/db/{db}/transactions":16735,"post /v2/db/{db}/reach-many":3052,"post /v2/db/{db}/reach":5115} |
| recordTimeWaits | 1 |
| entityCache | {"revisionMisses":671543,"recentHits":0,"recentBudgetBytes":16777216,"entries":3591,"evictions":242633,"recentVerified":0,"entityBudgetBytes":218103808,"hits":981226,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":0,"revisionViews":4990,"recentBytes":0,"recentReports":0,"verificationErrors":0,"budgetBytes":268435456,"recentStates":0,"revisionHits":555907,"bytes":250537844,"verify":false,"entityBytes":217489364,"recentChanges":0,"recentLagFallbacks":0,"misses":246224,"revisionBudgetBytes":33554432,"verified":0,"revisionEvictions":4432,"revisionBytes":33048480} |

A missing late snapshot is not zero work; begun-call datoms can exceed completed per-pattern totals.

## Per-commit driver breakdown (ms)

driverOwn includes offer queueing, all post-transact completion work (including after ACK), and any awaited durable publication witness inside transact (deferred witness durations are separate); medians are per-command sums, not sums of medians; all latency bars remain unchanged
| Phase | Segment | Commands | Median ms | p99 ms |
|---|---|---|---|---|
| warmup | beforeTransact | 14 | 0.719 | 3.371 |
| warmup | transact | 14 | 22.655 | 89.681 |
| warmup | afterTransact | 14 | 0.044 | 0.449 |
| warmup | afterAck | 14 | 0.907 | 8.438 |
| warmup | publicationWitness | 0 | unavailable | unavailable |
| warmup | driverOwn | 14 | 1.959 | 11.947 |
| baseline | beforeTransact | 46 | 0.763 | 19.632 |
| baseline | transact | 46 | 19.071 | 43.831 |
| baseline | afterTransact | 46 | 0.038 | 0.097 |
| baseline | afterAck | 46 | 0.659 | 2.318 |
| baseline | publicationWitness | 0 | unavailable | unavailable |
| baseline | driverOwn | 46 | 1.583 | 19.996 |
| L1 | beforeTransact | 56 | 0.715 | 1.360 |
| L1 | transact | 56 | 19.199 | 104.515 |
| L1 | afterTransact | 56 | 0.034 | 55.562 |
| L1 | afterAck | 56 | 0.659 | 2.443 |
| L1 | publicationWitness | 0 | unavailable | unavailable |
| L1 | driverOwn | 56 | 1.463 | 57.074 |
| L4 | beforeTransact | 1617 | 0.939 | 154.623 |
| L4 | transact | 1617 | 14.463 | 165.887 |
| L4 | afterTransact | 1617 | 0.023 | 0.235 |
| L4 | afterAck | 1617 | 0.523 | 2.799 |
| L4 | publicationWitness | 0 | unavailable | unavailable |
| L4 | driverOwn | 1617 | 1.599 | 154.623 |
| L16 | beforeTransact | 1682 | 0.959 | 63.231 |
| L16 | transact | 1682 | 13.951 | 86.015 |
| L16 | afterTransact | 1682 | 0.023 | 11.199 |
| L16 | afterAck | 1682 | 0.495 | 2.655 |
| L16 | publicationWitness | 0 | unavailable | unavailable |
| L16 | driverOwn | 1682 | 1.631 | 81.407 |
| L64 | beforeTransact | 50 | 0.855 | 3.917 |
| L64 | transact | 50 | 12.735 | 84.851 |
| L64 | afterTransact | 50 | 0.031 | 0.083 |
| L64 | afterAck | 50 | 0.795 | 3.617 |
| L64 | publicationWitness | 0 | unavailable | unavailable |
| L64 | driverOwn | 50 | 1.615 | 5.570 |
| L256 | beforeTransact | 50 | 0.679 | 3.241 |
| L256 | transact | 50 | 13.759 | 132.197 |
| L256 | afterTransact | 50 | 0.030 | 0.118 |
| L256 | afterAck | 50 | 0.959 | 8.565 |
| L256 | publicationWitness | 0 | unavailable | unavailable |
| L256 | driverOwn | 50 | 1.871 | 9.032 |
| L1024 | beforeTransact | 47 | 0.719 | 3.129 |
| L1024 | transact | 47 | 18.431 | 205.150 |
| L1024 | afterTransact | 47 | 0.055 | 4.940 |
| L1024 | afterAck | 47 | 1.807 | 12.143 |
| L1024 | publicationWitness | 0 | unavailable | unavailable |
| L1024 | driverOwn | 47 | 2.671 | 15.347 |
| recovery | beforeTransact | 77 | 0.755 | 25.734 |
| recovery | transact | 77 | 12.607 | 102.080 |
| recovery | afterTransact | 77 | 0.036 | 31.353 |
| recovery | afterAck | 77 | 1.151 | 4.062 |
| recovery | publicationWitness | 0 | unavailable | unavailable |
| recovery | driverOwn | 77 | 2.007 | 32.750 |
| p4mix | beforeTransact | 56 | 0.811 | 1.932 |
| p4mix | transact | 56 | 14.655 | 41.265 |
| p4mix | afterTransact | 56 | 0.036 | 0.117 |
| p4mix | afterAck | 56 | 0.751 | 3.591 |
| p4mix | publicationWitness | 0 | unavailable | unavailable |
| p4mix | driverOwn | 56 | 1.575 | 4.930 |
| p4h1 | beforeTransact | 47 | 0.815 | 2.828 |
| p4h1 | transact | 47 | 13.247 | 80.538 |
| p4h1 | afterTransact | 47 | 0.036 | 0.087 |
| p4h1 | afterAck | 47 | 0.539 | 3.406 |
| p4h1 | publicationWitness | 0 | unavailable | unavailable |
| p4h1 | driverOwn | 47 | 1.463 | 3.630 |
| grow3 | beforeTransact | 10 | 0.979 | 51.348 |
| grow3 | transact | 10 | 28.543 | 327.374 |
| grow3 | afterTransact | 10 | 0.036 | 0.079 |
| grow3 | afterAck | 10 | 0.615 | 1.132 |
| grow3 | publicationWitness | 0 | unavailable | unavailable |
| grow3 | driverOwn | 10 | 1.551 | 52.037 |
| p4h3 | beforeTransact | 55 | 0.711 | 4.908 |
| p4h3 | transact | 55 | 11.775 | 303.399 |
| p4h3 | afterTransact | 55 | 0.032 | 0.150 |
| p4h3 | afterAck | 55 | 0.607 | 2.228 |
| p4h3 | publicationWitness | 0 | unavailable | unavailable |
| p4h3 | driverOwn | 55 | 1.439 | 6.502 |
| grow10 | beforeTransact | 13 | 0.963 | 121.530 |
| grow10 | transact | 13 | 319.487 | 736.271 |
| grow10 | afterTransact | 13 | 0.025 | 0.048 |
| grow10 | afterAck | 13 | 0.423 | 4.783 |
| grow10 | publicationWitness | 0 | unavailable | unavailable |
| grow10 | driverOwn | 13 | 3.039 | 122.033 |
| p4h10 | beforeTransact | 41 | 0.747 | 3.603 |
| p4h10 | transact | 41 | 14.079 | 32.996 |
| p4h10 | afterTransact | 41 | 0.039 | 0.343 |
| p4h10 | afterAck | 41 | 0.619 | 1.805 |
| p4h10 | publicationWitness | 0 | unavailable | unavailable |
| p4h10 | driverOwn | 41 | 1.535 | 4.438 |
| presweep | beforeTransact | 58 | 0.807 | 5.040 |
| presweep | transact | 58 | 13.759 | 41.357 |
| presweep | afterTransact | 58 | 0.039 | 0.141 |
| presweep | afterAck | 58 | 0.855 | 3.599 |
| presweep | publicationWitness | 0 | unavailable | unavailable |
| presweep | driverOwn | 58 | 1.895 | 7.845 |
| sweep | beforeTransact | 3 | 2.143 | 16.415 |
| sweep | transact | 3 | 73.727 | 82.243 |
| sweep | afterTransact | 3 | 0.047 | 0.060 |
| sweep | afterAck | 3 | 0.787 | 1.137 |
| sweep | publicationWitness | 0 | unavailable | unavailable |
| sweep | driverOwn | 3 | 2.607 | 17.611 |
| tail | beforeTransact | 3477 | 0.919 | 56.319 |
| tail | transact | 3477 | 12.287 | 116.735 |
| tail | afterTransact | 3477 | 0.022 | 9.471 |
| tail | afterAck | 3477 | 0.507 | 2.831 |
| tail | publicationWitness | 0 | unavailable | unavailable |
| tail | driverOwn | 3477 | 1.583 | 66.047 |
| burst | beforeTransact | 6546 | 0.947 | 84.991 |
| burst | transact | 6546 | 13.247 | 128.511 |
| burst | afterTransact | 6546 | 0.023 | 9.535 |
| burst | afterAck | 6546 | 0.503 | 2.751 |
| burst | publicationWitness | 0 | unavailable | unavailable |
| burst | driverOwn | 6546 | 1.599 | 91.647 |

## Side worker ELU

- warmup: mean 0.028, max 0.085
- baseline: mean 0.017, max 0.058
- L1: mean 0.016, max 0.040
- L4: mean 0.185, max 0.517
- L16: mean 0.235, max 0.498
- L64: mean 0.018, max 0.044
- L256: mean 0.021, max 0.049
- L1024: mean 0.029, max 0.187
- recovery: mean 0.026, max 0.073
- p4mix: mean 0.017, max 0.085
- p4h1: mean 0.014, max 0.042
- grow3: mean 0.127, max 0.378
- p4h3: mean 0.017, max 0.052
- grow10: mean 0.301, max 0.527
- p4h10: mean 0.015, max 0.043
- presweep: mean 0.021, max 0.070
- sweep: mean 0.085, max 0.085
- tail: mean 0.073, max 0.485

Whole-machine P4 observed goodput is 34,393.255 pulls/s (best level L64), against 4,400 total pulls/s. Weighted mix p50/p99 0.034/0.293 ms; largest bucket p99 0.429 ms. History p99 depth1/3/10 0.182/0.191/0.195 ms; depth10/depth1 1.0714. Engine bytes-read flatness remains unmeasured. Split-read default: pending. Loaded oracle PASS: 810 recorded commands, 53 reads, 2,626 entity queries, zero mismatches. This is diagnostic evidence, not acceptance promotion.
