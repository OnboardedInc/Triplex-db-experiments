# tx2-dxh4-o1-ladder: DONE

Diagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.

## Every bar

| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 0.774367864386892 | >= 1.0 | MISS | 0.226 below threshold |  |
| P1 | NS-P1-READ-P99-256-MS | 2555.903 | <= 100 | MISS | 2455.903 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 19.54493729085378 | <= 1.25 | MISS | 18.295 above threshold | matched zero-reader run, same trace-time window |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 13465.2080078125 | <= 2000 | MISS | 11465.208 above threshold |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 2.3062945223699 | >= 0.9 | MET |  |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 1.5866606725726125 | <= 2.0 | MET |  | matched zero-reader run, same trace-time window |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  |  |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.6101206652897054 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 4125 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 442.367 | <= 10 | MISS | 432.367 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 13238.271 | <= 50 | MISS | 13188.271 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 507.903 | <= 10 | MISS | 497.903 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 13398.19 | <= 50 | MISS | 13348.190 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 13451.47 | <= 100 | MISS | 13351.470 above threshold |  |
| P2 | NS-P2 every offered command accounted | 0 | = 0 | MET |  |  |
| P2 | NS-P2 every oracle-valid trace command published | "3873/3873" | all | MET |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | MET |  |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [8.763637695312497] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | true | = true | MET |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 2670.591 | <= 250 | MISS | 2420.591 above threshold |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 1.383 | <= 5 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 11.135 | <= 25 | MET |  |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 11.199 | <= 50 | MET |  |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 395.5585603638679 | >= 1100 | MISS | 704.441 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 1.198032370675976 | <= 1.1 | MISS | 0.098 above threshold | requires complete growth to depths 3 and 10 on the full sample |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 512 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  | requires committed positions past capture; observed: [4344,4345,4343,4349,4354,4347,4350,4346,4351,4352] |
| P5 | NS-P5 live read p99 during sweep / presweep | 1.1835448710222725 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 0.9569712044039248 | <= 1.5 | MET |  |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

## Writer pending at every phase boundary

```text
[ns 17:17:47] phase warmup: 16 readers at trace 0s; writer pending 0
[ns 17:18:01] phase baseline: 0 readers at trace 15s; writer pending 0
[ns 17:18:31] phase L1: 1 readers at trace 45s; writer pending 0
[ns 17:19:00] phase L4: 4 readers at trace 75s; writer pending 0
[ns 17:19:30] phase L16: 16 readers at trace 105s; writer pending 0
[ns 17:19:59] phase L64: 64 readers at trace 135s; writer pending 9
[ns 17:20:29] phase L256: 256 readers at trace 165s; writer pending 75
[ns 17:20:58] phase L1024: 256 readers at trace 195s; writer pending 0
[ns 17:21:27] phase recovery: 256 readers at trace 225s; writer pending 0
[ns 17:21:57] phase p4mix: 1 readers at trace 255s; writer pending 0
[ns 17:22:30] phase p4h1: 1 readers at trace 289s; writer pending 0
[ns 17:22:59] phase grow3: 0 readers at trace 319s; writer pending 0
[ns 17:23:05] phase p4h3: 1 readers at trace 326s; writer pending 0
[ns 17:23:35] phase grow10: 0 readers at trace 356s; writer pending 1
[ns 17:23:41] phase p4h10: 1 readers at trace 361s; writer pending 0
[ns 17:24:10] phase presweep: 64 readers at trace 391s; writer pending 0
[ns 17:24:39] phase sweep: 64 readers at trace 421s; writer pending 0
```

## P2 commit latency per size band (ms)

| Window | Facts | Count | p50 | p99 |
|---|---|---|---|---|
| bandsAll | 5-10 | 2342 | 113.151 | 11796.479 |
| bandsAll | 11-25 | 1124 | 109.567 | 12845.055 |
| bandsAll | 26-50 | 407 | 104.447 | 11927.551 |
| bandsAtL256 | 5-10 | 458 | 442.367 | 13238.271 |
| bandsAtL256 | 11-25 | 196 | 507.903 | 13398.190 |
| bandsAtL256 | 26-50 | 71 | 786.431 | 13451.470 |
| bandsSteady | 5-10 | 366 | 25.855 | 737.279 |
| bandsSteady | 11-25 | 189 | 33.279 | 1376.255 |
| bandsSteady | 26-50 | 56 | 37.119 | 480.043 |
| bandsBurst | 5-10 | 1976 | 159.743 | 12255.231 |
| bandsBurst | 11-25 | 935 | 155.647 | 12910.591 |
| bandsBurst | 26-50 | 351 | 131.071 | 12779.519 |

## P1 reader ladder and writer comparison

| Phase | Readers | Read p50 | Read p99 | Correct/s | Commit p50 | Commit p99 | Matched zero-reader p99 | Feed lag p99 | Client saturated | Reader thread ELU | Main ELU | Per-container mean CPU % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 0.751 | 4.191 | 656.886 | 37.887 | 124.645 | 98.503 | 2190.849 | False | [0.4871749386351832,0.0025496343473394236,0.002452616852418498] | 0.030 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":1.9677329303603044},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":28.45250455792276},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":8.804621543772525},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":32.032995335835956}} |
| L4 | 4 | 1.199 | 6.559 | 1582.234 | 28.799 | 85.242 | 114.176 | 2158.380 | False | [0.6445118794163447,0.47404710283594337,0.47603465077411145] | 0.055 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":1.860392891184731},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":14.037324786550345},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":7.481596453754886},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":74.22283689842295}} |
| L16 | 16 | 3.519 | 24.831 | 1410.311 | 50.431 | 348.159 | 372.735 | 55.039 | False | [0.6517001272112706,0.6126888819004843,0.5993890777647871] | 0.278 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":5.990463028306819},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":50.39696674468162},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":36.921846353305135},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":97.76959313304879}} |
| L64 | 64 | 12.863 | 225.279 | 657.596 | 179.199 | 4751.359 | 3227.647 | 888.831 | False | [0.7905821788721543,0.7374380734906646,0.764470733238772] | 0.607 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":14.024587098434733},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":87.03178410951236},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":65.71995367537635},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":133.6861647391054}} |
| L256 | 256 | 191.487 | 2555.903 | 509.221 | 493.567 | 13369.343 | 684.031 | 2670.591 | True | [0.9527219153996648,0.9455163538164145,0.9519335987068429] | 0.488 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":10.924497900599944},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":65.20441760888883},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":50.510520019052755},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":145.22718789155724}} |
| L1024 | 256 | 157.695 | 872.447 | 1174.414 | 31.487 | 114.257 | 72.011 | 171.516 | True | [0.9843875050796194,0.9883998565035527,0.9829367894594472] | 0.117 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":4.369072206231963},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":25.058557104917163},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":6.826225860802191},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":126.16248091539642}} |

### Reader correctness and apparatus per level

| Phase | Reads | Correct | Violations | Errors | Hot share | Split counters | Maintenance jobs | Main ELU | Max worker ELU |
|---|---|---|---|---|---|---|---|---|---|
| L1 | 18398 | 18398 | 0 | 0 | 0.610 | {"reads":28,"straddledATraceCommand":28,"straddledCorrect":28} | 1 | 0.030 | 0.487 |
| L4 | 44304 | 44304 | 0 | 0 | 0.616 | {"reads":140,"straddledATraceCommand":140,"straddledCorrect":140} | 1 | 0.055 | 0.645 |
| L16 | 39490 | 39490 | 0 | 0 | 0.623 | {"reads":1370,"straddledATraceCommand":1353,"straddledCorrect":1353} | 1 | 0.278 | 0.652 |
| L64 | 18414 | 18414 | 0 | 0 | 0.656 | {"reads":1801,"straddledATraceCommand":1694,"straddledCorrect":1694} | 1 | 0.607 | 0.791 |
| L256 | 14259 | 14259 | 0 | 0 | 0.669 | {"reads":1201,"straddledATraceCommand":719,"straddledCorrect":719} | 1 | 0.488 | 0.953 |
| L1024 | 32885 | 32885 | 0 | 0 | 0.636 | {"reads":761,"straddledATraceCommand":191,"straddledCorrect":191} | 1 | 0.117 | 0.988 |

Matched baseline identity: `{"traceDigest":"2dfde977f66613f0","offeredUntilTraceS":600.0068996582031,"source":"/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-o1-ladder/input/ns-writes.jsonl","sha256":"09ed2051b0dd886e2772e4351606067d47a285cee0ef8c962dafe5c4f299d88c"}`.

The requested cap is 256 actual readers; nominal phase names do not establish a 1,024-reader measurement.

## P4 weighted mix and history

| Group | Latency / bytes summary |
|---|---|
| weighted | {"count":12807,"minMs":0.211,"maxMs":493.844,"meanMs":2.05,"p50Ms":1.383,"p90Ms":3.583,"p99Ms":11.135,"p999Ms":58.111} |
| bucket:small | {"count":6436,"minMs":0.211,"maxMs":284.35,"meanMs":1.774,"p50Ms":1.167,"p90Ms":3.103,"p99Ms":10.623,"p999Ms":51.967,"meanBytes":6420.484307022995} |
| hops:3 | {"count":5121,"minMs":0.227,"maxMs":493.844,"meanMs":1.96,"p50Ms":1.239,"p90Ms":3.375,"p99Ms":10.687,"p999Ms":50.687,"meanBytes":18588.191954696347} |
| bucket:medium | {"count":4486,"minMs":0.303,"maxMs":493.844,"meanMs":2.217,"p50Ms":1.487,"p90Ms":3.679,"p99Ms":12.095,"p999Ms":74.239,"meanBytes":24603.808738296924} |
| hops:4 | {"count":4444,"minMs":0.211,"maxMs":284.35,"meanMs":2.014,"p50Ms":1.431,"p90Ms":3.615,"p99Ms":9.471,"p999Ms":36.863,"meanBytes":19211.740549054906} |
| hops:6 | {"count":3242,"minMs":0.254,"maxMs":187.41,"meanMs":2.241,"p50Ms":1.559,"p90Ms":3.823,"p99Ms":15.359,"p999Ms":62.719,"meanBytes":19766.548118445404} |
| bucket:large | {"count":1885,"minMs":0.58,"maxMs":56.939,"meanMs":2.596,"p50Ms":2.063,"p90Ms":4.479,"p99Ms":11.199,"p999Ms":49.151,"meanBytes":49313.173474801064} |

| History / throughput field | Observed |
|---|---|
| history | {"eligibleForDepthComparison":true,"invalid":[],"indexing":[{"job":"2ec77613-6683-4bcf-a0b4-b8428b6acaa2","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2F5ZGdhYTZmY2YiLDBd","requestedT":"43252","requestedAtMs":1794331346546,"completed":true,"completedAtMs":1794331350501,"phase":"p4h1","driverRequestedAtMs":1794331353014.6313,"driverCompletedAtMs":1794331356971.3506,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"125c61cb-7268-48a2-9d21-78db34677113","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2F5ZGdhYTZmY2YiLDBd","requestedT":"43577","requestedAtMs":1794331382162,"completed":true,"completedAtMs":1794331385877,"phase":"p4h3","driverRequestedAtMs":1794331389484.8848,"driverCompletedAtMs":1794331393201.0337,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"44db2bd7-c494-458b-9615-ce756b4e32f8","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2F5ZGdhYTZmY2YiLDBd","requestedT":"43947","requestedAtMs":1794331417864,"completed":true,"completedAtMs":1794331421099,"phase":"p4h10","driverRequestedAtMs":1794331425829.3813,"driverCompletedAtMs":1794331429066.5486,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"}],"ratios":{"mean":1.140880503144654,"p50":1.1669449081803005,"p99":1.198032370675976},"sampleSubjects":200,"growth":[{"targetDepth":3,"reachedDepth":3,"subjects":200,"commands":4,"assertions":800,"failures":0,"wallS":2.48037841796875},{"targetDepth":10,"reachedDepth":10,"subjects":200,"commands":14,"assertions":2800,"failures":0,"wallS":2.569167236328125}],"depth1":{"count":30794,"minMs":0.176,"maxMs":57.728,"meanMs":0.795,"p50Ms":0.599,"p90Ms":1.455,"p99Ms":3.151,"p999Ms":7.391},"depth3":{"count":26969,"minMs":0.192,"maxMs":56.577,"meanMs":0.921,"p50Ms":0.711,"p90Ms":1.663,"p99Ms":3.519,"p999Ms":9.855},"depth10":{"count":27310,"minMs":0.199,"maxMs":50.131,"meanMs":0.907,"p50Ms":0.699,"p90Ms":1.623,"p99Ms":3.775,"p999Ms":9.087},"clientBytes":{"depth1":19106.199395584063,"depth3":19226.60527785535,"depth10":19256.57490302967},"engineBytesRead":"not measured: neither engine exposes bytes read per query here (seam)"} |
| throughput | {"bestLevel":"L4","goodputPerS":1582.2342414554716,"engineCpuQuotaCores":4,"pullsPerSPerQuotaCore":395.5585603638679,"engineCpuPercentMean":97.60215102991295,"pullsPerSPerUsedCore":1621.1059128917673,"hostClientCpu":{"userCores":1.3939913185184543,"kernelCores":0.07951527219760494,"hostCores":8},"hostBrokerCpu":"none in this composition (no broker process)"} |

## Three slowest measured read phases

| Phase | Read p99 ms | Engine CPU mean % by container | Client signals |
|---|---|---|---|
| L256 | 2555.903 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":10.924497900599944},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":65.20441760888883},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":50.510520019052755},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":145.22718789155724}} | {"workerEluMean":[0.9527219153996648,0.9455163538164145,0.9519335987068429],"maxWorkerElu":0.9527219153996648,"mainElu":0.48790921780408236,"saturated":true} |
| recovery | 2359.295 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":1.880038329492687},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":12.406676833368586},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":10.805989742197657},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":128.0940302229206}} | {"workerEluMean":[0.9304077924081283,0.9307319468073534,0.9454715748663326],"maxWorkerElu":0.9454715748663326,"mainElu":0.24517016558858176,"saturated":true} |
| L1024 | 872.447 | {"tx2-dxh4-o1-ladder-pg":{"cpuPercentMean":4.369072206231963},"tx2-dxh4-o1-ladder-tx":{"cpuPercentMean":25.058557104917163},"tx2-dxh4-o1-ladder-gw-w":{"cpuPercentMean":6.826225860802191},"tx2-dxh4-o1-ladder-gw-r":{"cpuPercentMean":126.16248091539642}} | {"workerEluMean":[0.9843875050796194,0.9883998565035527,0.9829367894594472],"maxWorkerElu":0.9883998565035527,"mainElu":0.11733477015724407,"saturated":true} |

## Three longest phases by elapsed wall time

| Phase | Elapsed s | Cgroup samples | Per-container mean CPU % |
|---|---|---|---|
| tail | 165.587 | 164 | {"tx2-dxh4-o1-ladder-gw-r":1.409584378453208,"tx2-dxh4-o1-ladder-gw-w":3.6922085302954812,"tx2-dxh4-o1-ladder-pg":0.677921041913316,"tx2-dxh4-o1-ladder-tx":4.078138602037578} |
| p4h3 | 30.057 | 30 | {"tx2-dxh4-o1-ladder-gw-r":40.666854767097476,"tx2-dxh4-o1-ladder-gw-w":3.4620040265726115,"tx2-dxh4-o1-ladder-pg":1.0621999251570429,"tx2-dxh4-o1-ladder-tx":3.9994383178478685} |
| p4h1 | 30.030 | 30 | {"tx2-dxh4-o1-ladder-gw-r":41.0281302080014,"tx2-dxh4-o1-ladder-gw-w":3.7543004081167552,"tx2-dxh4-o1-ladder-pg":0.8696966078643845,"tx2-dxh4-o1-ladder-tx":3.9339889441999403} |

CPU describes concurrent measured activity only; no causal attribution is inferred. Raw gateway/transactor logs are retained as `gw-w.log`, `gw-r.log`, `tx.log`.

## Counters, feed, fetch-only sweep, oracle and invalidity

Raw time series and full long arrays remain in the retained ns-report.json; the following counter summaries omit series and sample long arrays.

### P2 duplicates

```json
{
  "resends": 108,
  "considered": 108,
  "returnedOriginal": 108
}
```

### P2 lost ACK

```json
{
  "simulated": 37,
  "returnedOriginal": 37,
  "retryTags": {
    "Unknown": 37
  }
}
```

### P2 accounting

```json
{
  "byStreamAndOutcome": {
    "background:committed": 3873,
    "probe10:committed": 596,
    "p5-mutation:committed": 10
  },
  "resendsByResult": {
    "resolved-by-command": 108
  },
  "unaccounted": 0,
  "pendingAtEnd": 0,
  "errorTags": {}
}
```

### P2 read-your-own-write

```json
{
  "pulls": 3873,
  "correct": 3873,
  "pull": {
    "count": 3873,
    "minMs": 1.854,
    "maxMs": 4169.794,
    "meanMs": 369.166,
    "p50Ms": 65.023,
    "p90Ms": 1056.767,
    "p99Ms": 3293.183,
    "p999Ms": 3899.391
  },
  "failures": []
}
```

### P2 progress

```json
{
  "validOffered": 3873,
  "validPublished": 3873,
  "typedRejections": 0,
  "typedConflicts": 0,
  "invalidCommandsInTrace": 0,
  "queue": {
    "steadyRateCommandsPerS": 1.094890510948905,
    "steadyBound": 2.18978102189781,
    "steadySamples": 478,
    "steadyMax": 2,
    "drains": [
      {
        "burstAtS": 120,
        "peakQueued": 220,
        "drainS": 8.763637695312497
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
    "epoch": "ns-datomic-dev2000-nsmwaydgaa6fcf#0",
    "position": {
      "stream": "triplex-journal:ns-datomic-dev2000-nsmwaydgaa6fcf",
      "epoch": 0,
      "offset": 4728,
      "ordinal": 0
    }
  },
  "counts": {
    "pages": 4459,
    "pollErrors": 0,
    "entries": 4497,
    "deliveries": 4498,
    "redeliveries": 1,
    "redeliveryMismatches": 0,
    "replayAttempts": 1,
    "effectsWritten": 6280,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 44,
    "correctionRangeReported": 44,
    "durableWrites": 2618,
    "seenBeforeAck": 1477
  },
  "gaps": 0,
  "gapSample": [],
  "notReachedAtStop": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 4728,
      "checkpointAtStop": 4728,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794331112612.0007,
      "fired": true,
      "checkpoint": 318,
      "catchUpMs": 171.104248046875
    },
    {
      "point": "after-effect",
      "plannedAt": 1794331142612.0007,
      "fired": true,
      "checkpoint": 379,
      "catchUpMs": 126.52490234375
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794331172612.0007,
      "fired": true,
      "checkpoint": 451,
      "catchUpMs": 67.350341796875
    }
  ],
  "replay": {
    "from": 318,
    "to": 4728,
    "replayed": 4410,
    "firstDeliveries": 4410,
    "mismatches": 0,
    "exact": true
  },
  "lag": {
    "fromCommitInstant": {
      "count": 4496,
      "minMs": 1.804,
      "maxMs": 3016.231,
      "meanMs": 181.071,
      "p50Ms": 20.991,
      "p90Ms": 540.671,
      "p99Ms": 2211.839,
      "p999Ms": 2736.127
    },
    "fromDriverAck": {
      "count": 4496,
      "minMs": 0,
      "maxMs": 3009.95,
      "meanMs": 176.167,
      "p50Ms": 15.871,
      "p90Ms": 532.479,
      "p99Ms": 2211.839,
      "p999Ms": 2736.127
    },
    "atL256": {
      "count": 829,
      "minMs": 3.36,
      "maxMs": 3016.231,
      "meanMs": 537.995,
      "p50Ms": 150.527,
      "p90Ms": 1916.927,
      "p99Ms": 2670.591,
      "p999Ms": 3016.231
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
    "subjects": 2000,
    "coverageSha256": "b10589ef47d7038ea4ac62c6eaf0fd465e7b362fe66be8a6d0dd06dbad377285",
    "basis": {
      "recordedAt": 1794331479233,
      "validAt": 1794331489088,
      "position": {
        "stream": "triplex-journal:ns-datomic-dev2000-nsmwaydgaa6fcf",
        "epoch": 0,
        "offset": 4342,
        "ordinal": 0
      },
      "txId": "_tx/01M737V36177D9XZNXB26AST3X"
    },
    "release": {
      "id": "R-stub-v0",
      "sha256": "0af59c692133a17fa09d46bd6438036e76c94442c6afb3430b6d65234ad1b3f3"
    },
    "concurrency": 16,
    "mutatedAfterCapture": [
      1502,
      429,
      70,
      510,
      1996,
      1802,
      1216,
      1001,
      1460,
      673
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
    "mutationPositions": [
      4344,
      4345,
      4343,
      4349,
      4354,
      4347,
      4350,
      4346,
      4351,
      4352
    ],
    "startedAt": 1794331491740.7437,
    "endedAt": 1794331501983.1223,
    "completed": true,
    "wallMs": 10241.832714000018,
    "mutationsCommittedAfterCapture": true,
    "pulled": 2000,
    "distinctSubjects": 2000,
    "exactCoverage": true,
    "correctAtBasis": 2000,
    "violations": 0,
    "errors": 0,
    "pull": {
      "count": 2000,
      "minMs": 6.535,
      "maxMs": 563.791,
      "meanMs": 81.254,
      "p50Ms": 60.159,
      "p90Ms": 155.647,
      "p99Ms": 421.887,
      "p999Ms": 561.151
    },
    "pullsPerS": 195.2775500097859,
    "fetchOnlyWallFor100kS": 512.091635700001,
    "mutatedSubjectsAtBasis": 10
  },
  "live": {
    "presweep": {
      "read": {
        "count": 33892,
        "minMs": 0.596,
        "maxMs": 828.432,
        "meanMs": 48.251,
        "p50Ms": 30.975,
        "p90Ms": 93.695,
        "p99Ms": 323.583,
        "p999Ms": 544.767
      },
      "commit": {
        "count": 36,
        "minMs": 12.347,
        "maxMs": 218.714,
        "meanMs": 41.008,
        "p50Ms": 27.263,
        "p90Ms": 95.743,
        "p99Ms": 218.714,
        "p999Ms": 218.714
      }
    },
    "duringSweep": {
      "read": {
        "count": 9257,
        "minMs": 1.481,
        "maxMs": 587.108,
        "meanMs": 68.396,
        "p50Ms": 46.335,
        "p90Ms": 139.263,
        "p99Ms": 382.975,
        "p999Ms": 511.999
      },
      "commit": {
        "count": 12,
        "minMs": 17.169,
        "maxMs": 209.303,
        "meanMs": 56.642,
        "p50Ms": 34.559,
        "p90Ms": 100.863,
        "p99Ms": 209.303,
        "p999Ms": 209.303
      }
    }
  }
}
```

### correctness

```json
{
  "reads": 400068,
  "correct": 400068,
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
  "reads": 24,
  "entityQueries": 1570,
  "oracleMs": 28120,
  "mismatches": [],
  "mismatchCount": 0,
  "modelCorrectOnSameReads": 24,
  "recordedCommands": 721
}
```

### client

```json
{
  "burstMainEluMean": 0.585003122585294,
  "saturatedPhases": [
    "L256",
    "L1024",
    "recovery",
    "presweep",
    "sweep"
  ],
  "invalid": true,
  "processCpu": {
    "userCores": 1.3939913185184543,
    "kernelCores": 0.07951527219760494,
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
  "offered": 4587,
  "completed": 4587,
  "expired": 0,
  "notOffered": 44150,
  "maxInFlightSeen": 22,
  "pendingAtEnd": 0,
  "offeredUntilTraceS": 600.0032312011718,
  "overlays": {
    "probe10": 596,
    "p5-mutation": 10
  }
}
```

Additional validity limits: smoke profile; matched baseline covers the same trace windows (identity above); any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

## Gateway scan counters

| At | Write peer | Read peer |
|---|---|---|
| 2026-11-10T17:17:20.662Z | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":2048,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":1,\"revisionHits\":0,\"bytes\":2048,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":2048,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":1,\"revisionHits\":0,\"bytes\":2048,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} |
| 2026-11-10T17:28:19.236Z | {"status":200,"body":"{\"routes\":{\"post \\/v2\\/db\\/{db}\\/begin\":1037,\"post \\/v2\\/db\\/{db}\\/command\":145,\"post \\/v2\\/db\\/{db}\\/reach-many\":26,\"post \\/v2\\/db\\/{db}\\/reach\":3873,\"post \\/v2\\/db\\/{db}\\/journal\":145,\"post \\/v1\\/db\\/{db}\\/release\":145,\"post \\/v2\\/db\\/{db}\\/transactions\":4464,\"get \\/v2\\/admin\\/scan-stats\":135,\"post \\/v1\\/db\\/create\":12,\"post \\/v2\\/db\\/{db}\\/request-index\":9,\"get \\/health\":1,\"get \\/v1\\/db\\/{db}\\/basis\":610,\"post \\/v1\\/db\\/{db}\\/transact\":4998},\"commitOrder\":{\"timeouts\":66,\"late\":93},\"entityCache\":{\"revisionMisses\":149210,\"recentHits\":842113,\"recentBudgetBytes\":16777216,\"entries\":4944,\"evictions\":23939,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":962479,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":149249,\"revisionViews\":3873,\"recentBytes\":2550016,\"recentReports\":4731,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":2,\"revisionHits\":39,\"bytes\":237950122,\"verify\":false,\"entityBytes\":218101482,\"recentChanges\":3836,\"recentLagFallbacks\":3566,\"misses\":28883,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":17298624}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":135,\"post \\/v1\\/db\\/create\":4,\"post \\/v2\\/db\\/{db}\\/reach\":396195,\"post \\/v1\\/db\\/{db}\\/read\":7708,\"post \\/v2\\/db\\/{db}\\/reach-many\":72209},\"recordTimeWaits\":4,\"entityCache\":{\"revisionMisses\":319181,\"recentHits\":38961985,\"recentBudgetBytes\":16777216,\"entries\":28417,\"evictions\":193360,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":39240976,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":500979,\"revisionViews\":4778,\"recentBytes\":11717632,\"recentReports\":4497,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":2,\"revisionHits\":181798,\"bytes\":263040890,\"verify\":false,\"entityBytes\":217899802,\"recentChanges\":8116,\"recentLagFallbacks\":5471,\"misses\":221988,\"revisionBudgetBytes\":33554432,\"verified\":1072,\"revisionEvictions\":5,\"revisionBytes\":33423456}}"} |

Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.

### Last successful gateway counter snapshots

w: last successful sample at 2026-11-10T17:28:19.236Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"post /v2/db/{db}/begin":1037,"post /v2/db/{db}/command":145,"post /v2/db/{db}/reach-many":26,"post /v2/db/{db}/reach":3873,"post /v2/db/{db}/journal":145,"post /v1/db/{db}/release":145,"post /v2/db/{db}/transactions":4464,"get /v2/admin/scan-stats":135,"post /v1/db/create":12,"post /v2/db/{db}/request-index":9,"get /health":1,"get /v1/db/{db}/basis":610,"post /v1/db/{db}/transact":4998} |
| commitOrder | {"timeouts":66,"late":93} |
| entityCache | {"revisionMisses":149210,"recentHits":842113,"recentBudgetBytes":16777216,"entries":4944,"evictions":23939,"recentVerified":0,"entityBudgetBytes":218103808,"hits":962479,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":149249,"revisionViews":3873,"recentBytes":2550016,"recentReports":4731,"verificationErrors":0,"budgetBytes":268435456,"recentStates":2,"revisionHits":39,"bytes":237950122,"verify":false,"entityBytes":218101482,"recentChanges":3836,"recentLagFallbacks":3566,"misses":28883,"revisionBudgetBytes":33554432,"verified":0,"revisionEvictions":0,"revisionBytes":17298624} |

r: last successful sample at 2026-11-10T17:28:19.236Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"get /health":1,"get /v2/admin/scan-stats":135,"post /v1/db/create":4,"post /v2/db/{db}/reach":396195,"post /v1/db/{db}/read":7708,"post /v2/db/{db}/reach-many":72209} |
| recordTimeWaits | 4 |
| entityCache | {"revisionMisses":319181,"recentHits":38961985,"recentBudgetBytes":16777216,"entries":28417,"evictions":193360,"recentVerified":0,"entityBudgetBytes":218103808,"hits":39240976,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":500979,"revisionViews":4778,"recentBytes":11717632,"recentReports":4497,"verificationErrors":0,"budgetBytes":268435456,"recentStates":2,"revisionHits":181798,"bytes":263040890,"verify":false,"entityBytes":217899802,"recentChanges":8116,"recentLagFallbacks":5471,"misses":221988,"revisionBudgetBytes":33554432,"verified":1072,"revisionEvictions":5,"revisionBytes":33423456} |

A missing late snapshot is not zero work; begun-call datoms can exceed completed per-pattern totals.

## Per-commit driver breakdown (ms)

driverOwn includes offer queueing, all post-transact completion work (including after ACK), and durable publication witness inside transact; medians are per-command sums, not sums of medians; all latency bars remain unchanged
| Phase | Segment | Commands | Median ms | p99 ms |
|---|---|---|---|---|
| warmup | beforeTransact | 14 | 1.671 | 10.278 |
| warmup | transact | 14 | 23.935 | 67.731 |
| warmup | afterTransact | 14 | 0.016 | 0.273 |
| warmup | afterAck | 14 | 0.165 | 4.380 |
| warmup | publicationWitness | 14 | 1.391 | 6.239 |
| warmup | driverOwn | 14 | 3.823 | 12.083 |
| baseline | beforeTransact | 29 | 4.511 | 23.466 |
| baseline | transact | 29 | 37.119 | 59.833 |
| baseline | afterTransact | 29 | 0.013 | 0.112 |
| baseline | afterAck | 29 | 0.100 | 0.257 |
| baseline | publicationWitness | 29 | 1.479 | 3.075 |
| baseline | driverOwn | 29 | 6.143 | 25.516 |
| L1 | beforeTransact | 31 | 1.855 | 10.111 |
| L1 | transact | 31 | 35.839 | 124.313 |
| L1 | afterTransact | 31 | 0.013 | 22.993 |
| L1 | afterAck | 31 | 0.121 | 0.639 |
| L1 | publicationWitness | 31 | 1.359 | 3.127 |
| L1 | driverOwn | 31 | 3.807 | 25.927 |
| L4 | beforeTransact | 42 | 1.575 | 6.941 |
| L4 | transact | 42 | 26.751 | 83.567 |
| L4 | afterTransact | 42 | 0.013 | 0.144 |
| L4 | afterAck | 42 | 0.153 | 1.966 |
| L4 | publicationWitness | 42 | 1.351 | 3.334 |
| L4 | driverOwn | 42 | 3.455 | 8.776 |
| L16 | beforeTransact | 833 | 1.567 | 276.479 |
| L16 | transact | 833 | 39.423 | 204.799 |
| L16 | afterTransact | 833 | 0.013 | 0.291 |
| L16 | afterAck | 833 | 0.111 | 1.047 |
| L16 | publicationWitness | 833 | 1.799 | 8.959 |
| L16 | driverOwn | 833 | 4.607 | 278.527 |
| L64 | beforeTransact | 1624 | 12.735 | 3948.543 |
| L64 | transact | 1624 | 72.191 | 540.671 |
| L64 | afterTransact | 1624 | 0.016 | 91.647 |
| L64 | afterAck | 1624 | 0.122 | 1.175 |
| L64 | publicationWitness | 1624 | 3.039 | 14.143 |
| L64 | driverOwn | 1624 | 18.175 | 3948.543 |
| L256 | beforeTransact | 842 | 168.959 | 13303.807 |
| L256 | transact | 842 | 123.391 | 827.391 |
| L256 | afterTransact | 842 | 0.010 | 1.831 |
| L256 | afterAck | 842 | 0.117 | 2.351 |
| L256 | publicationWitness | 842 | 4.031 | 16.639 |
| L256 | driverOwn | 842 | 177.151 | 13303.807 |
| L1024 | beforeTransact | 33 | 1.239 | 11.874 |
| L1024 | transact | 33 | 30.463 | 111.388 |
| L1024 | afterTransact | 33 | 0.012 | 0.080 |
| L1024 | afterAck | 33 | 0.127 | 0.600 |
| L1024 | publicationWitness | 33 | 3.439 | 13.039 |
| L1024 | driverOwn | 33 | 5.151 | 16.398 |
| recovery | beforeTransact | 40 | 1.375 | 376.296 |
| recovery | transact | 40 | 41.471 | 1363.972 |
| recovery | afterTransact | 40 | 0.019 | 0.405 |
| recovery | afterAck | 40 | 0.177 | 7.649 |
| recovery | publicationWitness | 40 | 4.575 | 26.150 |
| recovery | driverOwn | 40 | 6.751 | 394.574 |
| p4mix | beforeTransact | 27 | 1.551 | 5.196 |
| p4mix | transact | 27 | 16.639 | 62.775 |
| p4mix | afterTransact | 27 | 0.019 | 0.102 |
| p4mix | afterAck | 27 | 0.104 | 0.370 |
| p4mix | publicationWitness | 27 | 1.663 | 7.237 |
| p4mix | driverOwn | 27 | 3.823 | 10.283 |
| p4h1 | beforeTransact | 37 | 1.055 | 21.667 |
| p4h1 | transact | 37 | 18.815 | 119.698 |
| p4h1 | afterTransact | 37 | 0.014 | 21.799 |
| p4h1 | afterAck | 37 | 0.083 | 0.255 |
| p4h1 | publicationWitness | 37 | 1.591 | 4.133 |
| p4h1 | driverOwn | 37 | 2.815 | 24.623 |
| grow3 | beforeTransact | 1 | 4.253 | 4.253 |
| grow3 | transact | 1 | 731.834 | 731.834 |
| grow3 | afterTransact | 1 | 0.023 | 0.023 |
| grow3 | afterAck | 1 | 0.081 | 0.081 |
| grow3 | publicationWitness | 1 | 1.322 | 1.322 |
| grow3 | driverOwn | 1 | 5.679 | 5.679 |
| p4h3 | beforeTransact | 40 | 1.019 | 5.691 |
| p4h3 | transact | 40 | 18.559 | 76.986 |
| p4h3 | afterTransact | 40 | 0.014 | 40.538 |
| p4h3 | afterAck | 40 | 0.080 | 0.713 |
| p4h3 | publicationWitness | 40 | 1.415 | 9.299 |
| p4h3 | driverOwn | 40 | 2.879 | 51.241 |
| grow10 | beforeTransact | 2 | 0.939 | 1.470 |
| grow10 | transact | 2 | 15.423 | 67.827 |
| grow10 | afterTransact | 2 | 0.013 | 0.014 |
| grow10 | afterAck | 2 | 0.073 | 0.074 |
| grow10 | publicationWitness | 2 | 1.287 | 2.104 |
| grow10 | driverOwn | 2 | 2.847 | 3.130 |
| p4h10 | beforeTransact | 34 | 1.263 | 5.385 |
| p4h10 | transact | 34 | 17.023 | 117.883 |
| p4h10 | afterTransact | 34 | 0.014 | 1.134 |
| p4h10 | afterAck | 34 | 0.086 | 0.749 |
| p4h10 | publicationWitness | 34 | 1.615 | 5.741 |
| p4h10 | driverOwn | 34 | 3.039 | 10.861 |
| presweep | beforeTransact | 36 | 1.019 | 142.799 |
| presweep | transact | 36 | 26.239 | 124.494 |
| presweep | afterTransact | 36 | 0.016 | 0.066 |
| presweep | afterAck | 36 | 0.173 | 3.282 |
| presweep | publicationWitness | 36 | 2.703 | 41.729 |
| presweep | driverOwn | 36 | 4.543 | 152.791 |
| sweep | beforeTransact | 19 | 1.087 | 103.896 |
| sweep | transact | 19 | 32.255 | 107.521 |
| sweep | afterTransact | 19 | 0.018 | 0.088 |
| sweep | afterAck | 19 | 0.191 | 0.623 |
| sweep | publicationWitness | 19 | 4.895 | 14.991 |
| sweep | driverOwn | 19 | 6.559 | 113.195 |
| tail | beforeTransact | 179 | 2.767 | 18.303 |
| tail | transact | 179 | 24.959 | 54.271 |
| tail | afterTransact | 179 | 0.022 | 0.063 |
| tail | afterAck | 179 | 0.122 | 0.417 |
| tail | publicationWitness | 179 | 1.871 | 8.191 |
| tail | driverOwn | 179 | 5.247 | 20.607 |
| burst | beforeTransact | 3262 | 10.751 | 12713.983 |
| burst | transact | 3262 | 69.631 | 618.495 |
| burst | afterTransact | 3262 | 0.014 | 2.207 |
| burst | afterAck | 3262 | 0.117 | 1.407 |
| burst | publicationWitness | 3262 | 2.735 | 14.143 |
| burst | driverOwn | 3262 | 16.063 | 12713.983 |

## Side worker ELU

- warmup: mean 0.037, max 0.116
- baseline: mean 0.027, max 0.071
- L1: mean 0.022, max 0.075
- L4: mean 0.027, max 0.091
- L16: mean 0.293, max 0.685
- L64: mean 0.858, max 1.000
- L256: mean 0.833, max 1.000
- L1024: mean 0.074, max 0.564
- recovery: mean 0.146, max 0.860
- p4mix: mean 0.039, max 0.168
- p4h1: mean 0.045, max 0.314
- grow3: mean 0.059, max 0.106
- p4h3: mean 0.044, max 0.266
- grow10: mean 0.388, max 0.554
- p4h10: mean 0.039, max 0.155
- presweep: mean 0.078, max 0.244
- sweep: mean 0.145, max 0.505
- tail: mean 0.037, max 0.201
