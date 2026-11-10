# tx2-dxh4-q1-ladder: DONE

Diagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.

## Every bar

| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 1.0718005165978737 | >= 1.0 | MET |  |  |
| P1 | NS-P1-READ-P99-256-MS | 626.687 | <= 100 | MISS | 526.687 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 0.7136387095254362 | <= 1.25 | MET |  | matched zero-reader run, same trace-time window |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 369.794677734375 | <= 2000 | MET |  |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 0.8399034304746621 | >= 0.9 | MISS | 0.060 below threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 2.632307930872946 | <= 2.0 | MISS | 0.632 above threshold | matched zero-reader run, same trace-time window |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  |  |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.5943915221356806 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 4316 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 33.791 | <= 10 | MISS | 23.791 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 255.788 | <= 50 | MISS | 205.788 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 60.927 | <= 10 | MISS | 50.927 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 369.795 | <= 50 | MISS | 319.795 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 64.431 | <= 100 | MET |  |  |
| P2 | NS-P2 every offered command accounted | 0 | = 0 | MET |  |  |
| P2 | NS-P2 every oracle-valid trace command published | "7408/7408" | all | MET |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | MET |  |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [0.9303925781250086,0.5872795410156186] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | true | = true | MET |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 68.312 | <= 250 | MET |  |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 1.295 | <= 5 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 5.599 | <= 25 | MET |  |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 6.687 | <= 50 | MET |  |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 401.5883969450774 | >= 1100 | MISS | 698.412 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 1.1007133864876206 | <= 1.1 | MISS | 0.001 above threshold | requires complete growth to depths 3 and 10 on the full sample |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 342 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  | requires committed positions past capture; observed: [5698,5699,5706,5702,5701,5708,5705,5704,5700,5703] |
| P5 | NS-P5 live read p99 during sweep / presweep | 1.3015884703174225 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 0.4461727532320445 | <= 1.5 | MET |  |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

## Writer pending at every phase boundary

```text
[ns 21:08:27] phase warmup: 16 readers at trace 0s; writer pending 0
[ns 21:08:42] phase baseline: 0 readers at trace 15s; writer pending 0
[ns 21:09:27] phase L1: 1 readers at trace 60s; writer pending 0
[ns 21:10:12] phase L4: 4 readers at trace 105s; writer pending 1
[ns 21:10:57] phase L16: 16 readers at trace 150s; writer pending 2
[ns 21:11:42] phase L64: 64 readers at trace 195s; writer pending 0
[ns 21:12:27] phase L256: 256 readers at trace 240s; writer pending 0
[ns 21:13:12] phase L1024: 1024 readers at trace 285s; writer pending 0
[ns 21:13:57] phase recovery: 256 readers at trace 330s; writer pending 1
[ns 21:14:57] phase p4mix: 1 readers at trace 390s; writer pending 0
[ns 21:15:43] phase p4h1: 1 readers at trace 437s; writer pending 0
[ns 21:16:28] phase grow3: 0 readers at trace 482s; writer pending 0
[ns 21:16:40] phase p4h3: 1 readers at trace 493s; writer pending 0
[ns 21:17:25] phase grow10: 0 readers at trace 538s; writer pending 0
[ns 21:17:43] phase p4h10: 1 readers at trace 556s; writer pending 0
[ns 21:18:28] phase presweep: 64 readers at trace 601s; writer pending 0
[ns 21:19:13] phase sweep: 64 readers at trace 646s; writer pending 0
```

## P2 commit latency per size band (ms)

| Window | Facts | Count | p50 | p99 |
|---|---|---|---|---|
| bandsAll | 5-10 | 4482 | 59.903 | 3915.775 |
| bandsAll | 11-25 | 2166 | 71.679 | 4456.447 |
| bandsAll | 26-50 | 760 | 66.559 | 4128.767 |
| bandsAtL256 | 5-10 | 29 | 33.791 | 255.788 |
| bandsAtL256 | 11-25 | 16 | 60.927 | 369.795 |
| bandsAtL256 | 26-50 | 1 | 64.431 | 64.431 |
| bandsSteady | 5-10 | 510 | 24.191 | 323.583 |
| bandsSteady | 11-25 | 271 | 30.975 | 378.879 |
| bandsSteady | 26-50 | 81 | 45.055 | 764.297 |
| bandsBurst | 5-10 | 3972 | 72.191 | 4063.231 |
| bandsBurst | 11-25 | 1895 | 85.503 | 4554.751 |
| bandsBurst | 26-50 | 679 | 73.727 | 4194.303 |

## P1 reader ladder and writer comparison

| Phase | Readers | Read p50 | Read p99 | Correct/s | Commit p50 | Commit p99 | Matched zero-reader p99 | Feed lag p99 | Client saturated | Reader thread ELU | Main ELU | Per-container mean CPU % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 0.767 | 3.807 | 664.041 | 29.439 | 97.396 | 120.169 | 2058.378 | False | [0.0017435878505144052,0.4783835109592303,0.0018955556342095858] | 0.028 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":2.0129035379874827},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":18.331949542922256},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":5.649770812763619},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":32.27449038517927}} |
| L4 | 4 | 1.407 | 15.487 | 598.545 | 31.743 | 1064.959 | 81.919 | 97.791 | False | [0.2337068059516322,0.3526805609909438,0.2362551458068972] | 0.257 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":6.068551018306823},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":41.47508131161837},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":40.38650984052301},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":54.78995708763525}} |
| L16 | 16 | 6.815 | 97.791 | 672.150 | 107.007 | 2129.919 | 1646.591 | 3440.639 | False | [0.6589432939085534,0.6608749436131165,0.7225366778987933] | 0.451 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":10.004730272148013},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":55.43687755678544},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":40.914447508622864},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":114.47637079564129}} |
| L64 | 64 | 25.983 | 216.063 | 1498.743 | 29.951 | 322.326 | 252.161 | 112.171 | True | [0.9499956089566156,0.9330190863377782,0.9402754815992388] | 0.102 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":3.300673084096837},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":15.253181380102538},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":8.971783693714553},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":131.168641418442}} |
| L256 | 256 | 114.687 | 626.687 | 1606.354 | 39.423 | 369.795 | 518.182 | 68.312 | True | [0.9517621816959723,0.9476532775033021,0.948377112171707] | 0.144 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":2.582692610020317},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":15.770726073178304},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":7.550703389545161},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":148.35010039307295}} |
| L1024 | 1024 | 565.247 | 2490.367 | 1349.182 | 43.263 | 552.856 | 210.027 | 71.185 | True | [0.9685289907884319,0.9656424874474385,0.9642168482247392] | 0.132 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":3.3492396225514285},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":14.415056606210692},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":7.3837087796795045},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":151.27053071129177}} |

### Reader correctness and apparatus per level

| Phase | Reads | Correct | Violations | Errors | Hot share | Split counters | Maintenance jobs | Main ELU | Max worker ELU |
|---|---|---|---|---|---|---|---|---|---|
| L1 | 28554 | 28554 | 0 | 0 | 0.599 | {"reads":52,"straddledATraceCommand":52,"straddledCorrect":52} | 1 | 0.028 | 0.478 |
| L4 | 25740 | 25740 | 0 | 0 | 0.607 | {"reads":670,"straddledATraceCommand":667,"straddledCorrect":667} | 1 | 0.257 | 0.353 |
| L16 | 28905 | 28905 | 0 | 0 | 0.625 | {"reads":1450,"straddledATraceCommand":1380,"straddledCorrect":1380} | 1 | 0.451 | 0.723 |
| L64 | 64449 | 64449 | 0 | 0 | 0.606 | {"reads":1556,"straddledATraceCommand":1413,"straddledCorrect":1413} | 1 | 0.102 | 0.950 |
| L256 | 69074 | 69074 | 0 | 0 | 0.594 | {"reads":1830,"straddledATraceCommand":804,"straddledCorrect":804} | 1 | 0.144 | 0.952 |
| L1024 | 58163 | 58163 | 0 | 0 | 0.609 | {"reads":1453,"straddledATraceCommand":0,"straddledCorrect":0} | 1 | 0.132 | 0.969 |

Matched baseline identity: `{"traceDigest":"aa8a7636ff027ab3","offeredUntilTraceS":900.0005148925782,"source":"/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-q1-ladder/input/ns-writes.jsonl","sha256":"eb0701204e060cf9b957a27a5df72f20f86572fd4137e1548045bc9155fda918"}`.

## P4 weighted mix and history

| Group | Latency / bytes summary |
|---|---|
| weighted | {"count":25885,"minMs":0.223,"maxMs":183.481,"meanMs":1.56,"p50Ms":1.295,"p90Ms":2.383,"p99Ms":5.599,"p999Ms":29.951} |
| bucket:medium | {"count":9112,"minMs":0.307,"maxMs":183.481,"meanMs":1.668,"p50Ms":1.399,"p90Ms":2.399,"p99Ms":5.535,"p999Ms":29.951,"meanBytes":23826.216966637403} |
| hops:6 | {"count":6532,"minMs":0.243,"maxMs":64.744,"meanMs":1.761,"p50Ms":1.471,"p90Ms":2.607,"p99Ms":6.079,"p999Ms":38.655,"meanBytes":18862.02648499694} |
| hops:3 | {"count":10411,"minMs":0.223,"maxMs":183.481,"meanMs":1.404,"p50Ms":1.127,"p90Ms":2.159,"p99Ms":5.183,"p999Ms":23.679,"meanBytes":17988.073864182115} |
| hops:4 | {"count":8942,"minMs":0.238,"maxMs":55.533,"meanMs":1.593,"p50Ms":1.319,"p90Ms":2.415,"p99Ms":5.631,"p999Ms":31.231,"meanBytes":18468.88022813688} |
| bucket:small | {"count":12991,"minMs":0.223,"maxMs":64.744,"meanMs":1.337,"p50Ms":1.111,"p90Ms":1.991,"p99Ms":5.215,"p999Ms":28.415,"meanBytes":5578.838503579401} |
| bucket:large | {"count":3782,"minMs":0.575,"maxMs":40.148,"meanMs":2.064,"p50Ms":1.791,"p90Ms":2.991,"p99Ms":6.687,"p999Ms":30.207,"meanBytes":49193.58566895822} |

| History / throughput field | Observed |
|---|---|
| history | {"eligibleForDepthComparison":true,"invalid":[],"indexing":[{"job":"b63a813a-5bab-4218-99ac-bda0cccc8ae0","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213YjZrcml1YzcwYSIsMF0","requestedT":"146172","requestedAtMs":1794345342295,"completed":true,"completedAtMs":1794345343862,"phase":"p4h1","driverRequestedAtMs":1794345342294.5022,"driverCompletedAtMs":1794345343863.6597,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"b5d8d324-fcb8-4af2-a19c-b99eae44f9c5","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213YjZrcml1YzcwYSIsMF0","requestedT":"146713","requestedAtMs":1794345398292,"completed":true,"completedAtMs":1794345400063,"phase":"p4h3","driverRequestedAtMs":1794345398292.1895,"driverCompletedAtMs":1794345400064.2048,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"16ab990a-0cb4-4b95-b863-c0e38b49ac6b","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLTEway1uc213YjZrcml1YzcwYSIsMF0","requestedT":"147455","requestedAtMs":1794345461057,"completed":true,"completedAtMs":1794345463289,"phase":"p4h10","driverRequestedAtMs":1794345461056.5757,"driverCompletedAtMs":1794345463289.6414,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"}],"ratios":{"mean":1.1489361702127658,"p50":1.208955223880597,"p99":1.1007133864876206},"sampleSubjects":1000,"growth":[{"targetDepth":3,"reachedDepth":3,"subjects":1000,"commands":20,"assertions":4000,"failures":0,"wallS":9.291422119140625},{"targetDepth":10,"reachedDepth":10,"subjects":1000,"commands":70,"assertions":14000,"failures":0,"wallS":15.851204345703126}],"depth1":{"count":60773,"minMs":0.162,"maxMs":60.738,"meanMs":0.611,"p50Ms":0.469,"p90Ms":0.999,"p99Ms":2.383,"p999Ms":5.695},"depth3":{"count":48691,"minMs":0.192,"maxMs":281.633,"meanMs":0.783,"p50Ms":0.591,"p90Ms":1.295,"p99Ms":3.599,"p999Ms":10.175},"depth10":{"count":53803,"minMs":0.193,"maxMs":44.836,"meanMs":0.702,"p50Ms":0.567,"p90Ms":1.143,"p99Ms":2.623,"p999Ms":6.815},"clientBytes":{"depth1":18243.08963349428,"depth3":18278.577449696393,"depth10":18297.901551106504},"engineBytesRead":"not measured: neither engine exposes bytes read per query here (seam)"} |
| throughput | {"bestLevel":"L256","goodputPerS":1606.3535877803097,"engineCpuQuotaCores":4,"pullsPerSPerQuotaCore":401.5883969450774,"engineCpuPercentMean":174.25422246581672,"pullsPerSPerUsedCore":921.8448569275998,"hostClientCpu":{"userCores":1.5877619412444768,"kernelCores":0.07464779968813723,"hostCores":8},"hostBrokerCpu":"none in this composition (no broker process)"} |

## Three slowest measured read phases

| Phase | Read p99 ms | Engine CPU mean % by container | Client signals |
|---|---|---|---|
| L1024 | 2490.367 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":3.3492396225514285},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":14.415056606210692},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":7.3837087796795045},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":151.27053071129177}} | {"workerEluMean":[0.9685289907884319,0.9656424874474385,0.9642168482247392],"maxWorkerElu":0.9685289907884319,"mainElu":0.13159943203433702,"saturated":true} |
| recovery | 933.887 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":2.245105955379719},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":8.522772231428075},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":8.506056087101559},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":152.97257950524445}} | {"workerEluMean":[0.9373145188385716,0.9425195150254855,0.9475453470660878],"maxWorkerElu":0.9475453470660878,"mainElu":0.17194890709495694,"saturated":true} |
| L256 | 626.687 | {"tx2-dxh4-q1-ladder-pg":{"cpuPercentMean":2.582692610020317},"tx2-dxh4-q1-ladder-tx":{"cpuPercentMean":15.770726073178304},"tx2-dxh4-q1-ladder-gw-w":{"cpuPercentMean":7.550703389545161},"tx2-dxh4-q1-ladder-gw-r":{"cpuPercentMean":148.35010039307295}} | {"workerEluMean":[0.9517621816959723,0.9476532775033021,0.948377112171707],"maxWorkerElu":0.9517621816959723,"mainElu":0.14364862988130253,"saturated":true} |

## Three longest phases by elapsed wall time

| Phase | Elapsed s | Cgroup samples | Per-container mean CPU % |
|---|---|---|---|
| tail | 216.153 | 210 | {"tx2-dxh4-q1-ladder-gw-r":6.100573886567472,"tx2-dxh4-q1-ladder-gw-w":20.17256152962341,"tx2-dxh4-q1-ladder-pg":4.224731881528363,"tx2-dxh4-q1-ladder-tx":22.34023688289394} |
| recovery | 60.005 | 59 | {"tx2-dxh4-q1-ladder-gw-r":154.2830988982075,"tx2-dxh4-q1-ladder-gw-w":8.836653244222536,"tx2-dxh4-q1-ladder-pg":2.332589623735995,"tx2-dxh4-q1-ladder-tx":8.813132824181096} |
| p4h10 | 45.140 | 45 | {"tx2-dxh4-q1-ladder-gw-r":41.861311454956756,"tx2-dxh4-q1-ladder-gw-w":3.5066022078341077,"tx2-dxh4-q1-ladder-pg":1.112238720717269,"tx2-dxh4-q1-ladder-tx":5.312456824602564} |

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
    "probe10:committed": 894,
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
    "minMs": 1.334,
    "maxMs": 25001.871,
    "meanMs": 1754.039,
    "p50Ms": 132.095,
    "p90Ms": 5767.167,
    "p99Ms": 18743.295,
    "p999Ms": 24510.463
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
    "steadySamples": 657,
    "steadyMax": 1,
    "drains": [
      {
        "burstAtS": 120,
        "peakQueued": 55,
        "drainS": 0.9303925781250086
      },
      {
        "burstAtS": 720,
        "peakQueued": 164,
        "drainS": 0.5872795410156186
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
    "epoch": "ns-datomic-10k-nsmwb6kriuc70a#0",
    "position": {
      "stream": "triplex-journal:ns-datomic-10k-nsmwb6kriuc70a",
      "epoch": 0,
      "offset": 9433,
      "ordinal": 0
    }
  },
  "counts": {
    "pages": 6735,
    "pollErrors": 0,
    "entries": 8402,
    "deliveries": 8403,
    "redeliveries": 1,
    "redeliveryMismatches": 0,
    "replayAttempts": 1,
    "effectsWritten": 17313,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 80,
    "correctionRangeReported": 80,
    "durableWrites": 4076,
    "seenBeforeAck": 2500
  },
  "gaps": 0,
  "gapSample": [],
  "notReachedAtStop": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 9433,
      "checkpointAtStop": 9433,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794344974616.3083,
      "fired": true,
      "checkpoint": 1166,
      "catchUpMs": 33.123779296875
    },
    {
      "point": "after-effect",
      "plannedAt": 1794345019616.3083,
      "fired": true,
      "checkpoint": 1267,
      "catchUpMs": 64.22119140625
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794345064616.3083,
      "fired": true,
      "checkpoint": 3285,
      "catchUpMs": 1370.288330078125
    }
  ],
  "replay": {
    "from": 1166,
    "to": 9433,
    "replayed": 8267,
    "firstDeliveries": 8267,
    "mismatches": 0,
    "exact": true
  },
  "lag": {
    "fromCommitInstant": {
      "count": 8400,
      "minMs": 1.356,
      "maxMs": 7389.615,
      "meanMs": 564.023,
      "p50Ms": 43.519,
      "p90Ms": 2473.983,
      "p99Ms": 4292.607,
      "p999Ms": 5963.775
    },
    "fromDriverAck": {
      "count": 8400,
      "minMs": 0,
      "maxMs": 7388.018,
      "meanMs": 559.481,
      "p50Ms": 39.423,
      "p90Ms": 2473.983,
      "p99Ms": 4292.607,
      "p999Ms": 5963.775
    },
    "atL256": {
      "count": 89,
      "minMs": 3.149,
      "maxMs": 68.312,
      "meanMs": 13.985,
      "p50Ms": 10.111,
      "p90Ms": 27.263,
      "p99Ms": 68.312,
      "p999Ms": 68.312
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
      "recordedAt": 1794345552962,
      "validAt": 1794345553443,
      "position": {
        "stream": "triplex-journal:ns-datomic-10k-nsmwb6kriuc70a",
        "epoch": 0,
        "offset": 5697,
        "ordinal": 0
      },
      "txId": "_tx/01M73N8K22CDVGAKF02S8G1J84"
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
    "mutationPositions": [
      5698,
      5699,
      5706,
      5702,
      5701,
      5708,
      5705,
      5704,
      5700,
      5703
    ],
    "startedAt": 1794345556689.759,
    "endedAt": 1794345590844.1548,
    "completed": true,
    "wallMs": 34153.735274999985,
    "mutationsCommittedAfterCapture": true,
    "pulled": 10000,
    "distinctSubjects": 10000,
    "exactCoverage": true,
    "correctAtBasis": 10000,
    "violations": 0,
    "errors": 0,
    "pull": {
      "count": 10000,
      "minMs": 1.545,
      "maxMs": 739.892,
      "meanMs": 54.375,
      "p50Ms": 41.471,
      "p90Ms": 95.231,
      "p99Ms": 233.471,
      "p999Ms": 606.207
    },
    "pullsPerS": 292.7937433338323,
    "fetchOnlyWallFor100kS": 341.53735274999985,
    "mutatedSubjectsAtBasis": 10
  },
  "live": {
    "presweep": {
      "read": {
        "count": 57516,
        "minMs": 0.407,
        "maxMs": 800.418,
        "meanMs": 42.957,
        "p50Ms": 29.055,
        "p90Ms": 86.015,
        "p99Ms": 258.047,
        "p999Ms": 516.095
      },
      "commit": {
        "count": 53,
        "minMs": 14.729,
        "maxMs": 331.988,
        "meanMs": 48.03,
        "p50Ms": 36.351,
        "p90Ms": 78.335,
        "p99Ms": 331.988,
        "p999Ms": 331.988
      }
    },
    "duringSweep": {
      "read": {
        "count": 34520,
        "minMs": 1.441,
        "maxMs": 1216.358,
        "meanMs": 61.919,
        "p50Ms": 44.031,
        "p90Ms": 119.807,
        "p99Ms": 335.871,
        "p999Ms": 811.007
      },
      "commit": {
        "count": 35,
        "minMs": 19.739,
        "maxMs": 148.124,
        "meanMs": 56.881,
        "p50Ms": 42.239,
        "p90Ms": 99.327,
        "p99Ms": 148.124,
        "p999Ms": 148.124
      }
    }
  }
}
```

### correctness

```json
{
  "reads": 699920,
  "correct": 699920,
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
  "entityQueries": 1332,
  "oracleMs": 105700,
  "mismatches": [],
  "mismatchCount": 0,
  "modelCorrectOnSameReads": 24,
  "recordedCommands": 1361
}
```

### client

```json
{
  "burstMainEluMean": 0.5212333000201188,
  "saturatedPhases": [
    "L64",
    "L256",
    "L1024",
    "recovery",
    "presweep"
  ],
  "invalid": true,
  "processCpu": {
    "userCores": 1.5877619412444768,
    "kernelCores": 0.07464779968813723,
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
  "offered": 8539,
  "completed": 8539,
  "expired": 0,
  "notOffered": 40496,
  "maxInFlightSeen": 32,
  "pendingAtEnd": 0,
  "offeredUntilTraceS": 900.0011030273438,
  "overlays": {
    "probe10": 894,
    "p5-mutation": 10
  }
}
```

Additional validity limits: smoke profile; matched baseline covers the same trace windows (identity above); any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

## Gateway scan counters

| At | Write peer | Read peer |
|---|---|---|
| 2026-11-10T21:06:58.820Z | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":2048,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":1,\"revisionHits\":0,\"bytes\":2048,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1},\"entityCache\":{\"revisionMisses\":0,\"recentHits\":0,\"recentBudgetBytes\":16777216,\"entries\":0,\"evictions\":0,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":0,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":0,\"revisionViews\":0,\"recentBytes\":2048,\"recentReports\":0,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":1,\"revisionHits\":0,\"bytes\":2048,\"verify\":false,\"entityBytes\":0,\"recentChanges\":0,\"recentLagFallbacks\":0,\"misses\":0,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":0}}"} |
| 2026-11-10T21:25:46.786Z | {"status":200,"body":"{\"routes\":{\"post \\/v2\\/db\\/{db}\\/begin\":2103,\"post \\/v2\\/db\\/{db}\\/command\":307,\"post \\/v2\\/db\\/{db}\\/reach-many\":653,\"post \\/v2\\/db\\/{db}\\/reach\":7408,\"post \\/v2\\/db\\/{db}\\/journal\":307,\"post \\/v1\\/db\\/{db}\\/release\":307,\"post \\/v2\\/db\\/{db}\\/transactions\":6744,\"get \\/v2\\/admin\\/scan-stats\":225,\"post \\/v1\\/db\\/create\":12,\"post \\/v2\\/db\\/{db}\\/request-index\":9,\"get \\/health\":1,\"get \\/v1\\/db\\/{db}\\/basis\":924,\"post \\/v1\\/db\\/{db}\\/transact\":9924},\"commitOrder\":{\"timeouts\":100,\"late\":167},\"entityCache\":{\"revisionMisses\":194634,\"recentHits\":2149139,\"recentBudgetBytes\":16777216,\"entries\":8328,\"evictions\":82398,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":2256231,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":197818,\"revisionViews\":7408,\"recentBytes\":4446208,\"recentReports\":9436,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":2,\"revisionHits\":3184,\"bytes\":246412692,\"verify\":false,\"entityBytes\":217592276,\"recentChanges\":7088,\"recentLagFallbacks\":4578,\"misses\":90726,\"revisionBudgetBytes\":33554432,\"verified\":0,\"revisionEvictions\":0,\"revisionBytes\":24374208}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":225,\"post \\/v1\\/db\\/create\":4,\"post \\/v2\\/db\\/{db}\\/reach\":692512,\"post \\/v1\\/db\\/{db}\\/read\":11637,\"post \\/v2\\/db\\/{db}\\/reach-many\":191755},\"recordTimeWaits\":3,\"entityCache\":{\"revisionMisses\":2428589,\"recentHits\":68357824,\"recentBudgetBytes\":16777216,\"entries\":45412,\"evictions\":2164573,\"recentVerified\":0,\"entityBudgetBytes\":218103808,\"hits\":69272120,\"policy\":\"insertion-order; oldest-cut revision eviction\",\"recentMisses\":3125998,\"revisionViews\":1738,\"recentBytes\":16776832,\"recentReports\":8402,\"verificationErrors\":0,\"budgetBytes\":268435456,\"recentStates\":2,\"revisionHits\":697409,\"bytes\":268238828,\"verify\":false,\"entityBytes\":218101804,\"recentChanges\":23682,\"recentLagFallbacks\":9313,\"misses\":2211702,\"revisionBudgetBytes\":33554432,\"verified\":2925,\"revisionEvictions\":11279,\"revisionBytes\":33360192}}"} |

Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.

### Last successful gateway counter snapshots

w: last successful sample at 2026-11-10T21:25:46.786Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"post /v2/db/{db}/begin":2103,"post /v2/db/{db}/command":307,"post /v2/db/{db}/reach-many":653,"post /v2/db/{db}/reach":7408,"post /v2/db/{db}/journal":307,"post /v1/db/{db}/release":307,"post /v2/db/{db}/transactions":6744,"get /v2/admin/scan-stats":225,"post /v1/db/create":12,"post /v2/db/{db}/request-index":9,"get /health":1,"get /v1/db/{db}/basis":924,"post /v1/db/{db}/transact":9924} |
| commitOrder | {"timeouts":100,"late":167} |
| entityCache | {"revisionMisses":194634,"recentHits":2149139,"recentBudgetBytes":16777216,"entries":8328,"evictions":82398,"recentVerified":0,"entityBudgetBytes":218103808,"hits":2256231,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":197818,"revisionViews":7408,"recentBytes":4446208,"recentReports":9436,"verificationErrors":0,"budgetBytes":268435456,"recentStates":2,"revisionHits":3184,"bytes":246412692,"verify":false,"entityBytes":217592276,"recentChanges":7088,"recentLagFallbacks":4578,"misses":90726,"revisionBudgetBytes":33554432,"verified":0,"revisionEvictions":0,"revisionBytes":24374208} |

r: last successful sample at 2026-11-10T21:25:46.786Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"get /health":1,"get /v2/admin/scan-stats":225,"post /v1/db/create":4,"post /v2/db/{db}/reach":692512,"post /v1/db/{db}/read":11637,"post /v2/db/{db}/reach-many":191755} |
| recordTimeWaits | 3 |
| entityCache | {"revisionMisses":2428589,"recentHits":68357824,"recentBudgetBytes":16777216,"entries":45412,"evictions":2164573,"recentVerified":0,"entityBudgetBytes":218103808,"hits":69272120,"policy":"insertion-order; oldest-cut revision eviction","recentMisses":3125998,"revisionViews":1738,"recentBytes":16776832,"recentReports":8402,"verificationErrors":0,"budgetBytes":268435456,"recentStates":2,"revisionHits":697409,"bytes":268238828,"verify":false,"entityBytes":218101804,"recentChanges":23682,"recentLagFallbacks":9313,"misses":2211702,"revisionBudgetBytes":33554432,"verified":2925,"revisionEvictions":11279,"revisionBytes":33360192} |

A missing late snapshot is not zero work; begun-call datoms can exceed completed per-pattern totals.

## Per-commit driver breakdown (ms)

driverOwn includes offer queueing, all post-transact completion work (including after ACK), and durable publication witness inside transact; medians are per-command sums, not sums of medians; all latency bars remain unchanged
| Phase | Segment | Commands | Median ms | p99 ms |
|---|---|---|---|---|
| warmup | beforeTransact | 14 | 1.391 | 2.912 |
| warmup | transact | 14 | 19.199 | 52.365 |
| warmup | afterTransact | 14 | 0.013 | 0.136 |
| warmup | afterAck | 14 | 0.140 | 0.443 |
| warmup | publicationWitness | 14 | 1.103 | 1.915 |
| warmup | driverOwn | 14 | 2.671 | 4.409 |
| baseline | beforeTransact | 45 | 1.919 | 16.771 |
| baseline | transact | 45 | 31.615 | 123.514 |
| baseline | afterTransact | 45 | 0.018 | 0.167 |
| baseline | afterAck | 45 | 0.098 | 5.431 |
| baseline | publicationWitness | 45 | 1.191 | 4.518 |
| baseline | driverOwn | 45 | 3.679 | 21.399 |
| L1 | beforeTransact | 57 | 1.703 | 5.362 |
| L1 | transact | 57 | 25.215 | 95.137 |
| L1 | afterTransact | 57 | 0.015 | 23.007 |
| L1 | afterAck | 57 | 0.119 | 0.251 |
| L1 | publicationWitness | 57 | 1.079 | 5.804 |
| L1 | driverOwn | 57 | 3.215 | 26.840 |
| L4 | beforeTransact | 1611 | 1.159 | 978.943 |
| L4 | transact | 1611 | 26.495 | 372.735 |
| L4 | afterTransact | 1611 | 0.014 | 0.214 |
| L4 | afterAck | 1611 | 0.092 | 0.599 |
| L4 | publicationWitness | 1611 | 1.223 | 9.791 |
| L4 | driverOwn | 1611 | 2.767 | 983.039 |
| L16 | beforeTransact | 1688 | 4.895 | 2088.959 |
| L16 | transact | 1688 | 60.415 | 573.439 |
| L16 | afterTransact | 1688 | 0.017 | 25.215 |
| L16 | afterAck | 1688 | 0.116 | 1.527 |
| L16 | publicationWitness | 1688 | 2.399 | 19.327 |
| L16 | driverOwn | 1688 | 9.599 | 2088.959 |
| L64 | beforeTransact | 50 | 1.063 | 39.672 |
| L64 | transact | 50 | 28.415 | 319.428 |
| L64 | afterTransact | 50 | 0.017 | 0.079 |
| L64 | afterAck | 50 | 0.186 | 3.363 |
| L64 | publicationWitness | 50 | 2.623 | 17.655 |
| L64 | driverOwn | 50 | 4.543 | 43.517 |
| L256 | beforeTransact | 50 | 1.151 | 118.757 |
| L256 | transact | 50 | 37.631 | 266.149 |
| L256 | afterTransact | 50 | 0.014 | 0.044 |
| L256 | afterAck | 50 | 0.146 | 0.922 |
| L256 | publicationWitness | 50 | 3.999 | 14.732 |
| L256 | driverOwn | 50 | 5.695 | 123.793 |
| L1024 | beforeTransact | 47 | 1.215 | 210.639 |
| L1024 | transact | 47 | 40.959 | 452.110 |
| L1024 | afterTransact | 47 | 0.019 | 25.707 |
| L1024 | afterAck | 47 | 0.145 | 1 |
| L1024 | publicationWitness | 47 | 4.159 | 13.938 |
| L1024 | driverOwn | 47 | 6.175 | 215.806 |
| recovery | beforeTransact | 77 | 1.367 | 495.577 |
| recovery | transact | 77 | 35.071 | 665.065 |
| recovery | afterTransact | 77 | 0.024 | 67.651 |
| recovery | afterAck | 77 | 0.190 | 5.617 |
| recovery | publicationWitness | 77 | 3.343 | 25.212 |
| recovery | driverOwn | 77 | 6.047 | 502.205 |
| p4mix | beforeTransact | 56 | 1.095 | 10.177 |
| p4mix | transact | 56 | 13.375 | 104.195 |
| p4mix | afterTransact | 56 | 0.018 | 0.043 |
| p4mix | afterAck | 56 | 0.085 | 0.473 |
| p4mix | publicationWitness | 56 | 1.167 | 7.315 |
| p4mix | driverOwn | 56 | 2.463 | 12.048 |
| p4h1 | beforeTransact | 49 | 1.215 | 47.863 |
| p4h1 | transact | 49 | 13.439 | 89.888 |
| p4h1 | afterTransact | 49 | 0.021 | 0.049 |
| p4h1 | afterAck | 49 | 0.090 | 0.383 |
| p4h1 | publicationWitness | 49 | 1.191 | 3.710 |
| p4h1 | driverOwn | 49 | 2.655 | 49.906 |
| grow3 | beforeTransact | 12 | 2.223 | 5.679 |
| grow3 | transact | 12 | 124.415 | 242.909 |
| grow3 | afterTransact | 12 | 0.016 | 0.022 |
| grow3 | afterAck | 12 | 0.079 | 0.155 |
| grow3 | publicationWitness | 12 | 1.159 | 2.780 |
| grow3 | driverOwn | 12 | 3.455 | 6.817 |
| p4h3 | beforeTransact | 50 | 0.995 | 243.089 |
| p4h3 | transact | 50 | 19.839 | 229.974 |
| p4h3 | afterTransact | 50 | 0.021 | 0.059 |
| p4h3 | afterAck | 50 | 0.103 | 0.951 |
| p4h3 | publicationWitness | 50 | 1.303 | 3.388 |
| p4h3 | driverOwn | 50 | 2.607 | 245.437 |
| grow10 | beforeTransact | 15 | 1.063 | 3.614 |
| grow10 | transact | 15 | 118.783 | 305.800 |
| grow10 | afterTransact | 15 | 0.019 | 0.047 |
| grow10 | afterAck | 15 | 0.088 | 0.473 |
| grow10 | publicationWitness | 15 | 1.055 | 2.409 |
| grow10 | driverOwn | 15 | 2.383 | 5.082 |
| p4h10 | beforeTransact | 43 | 1.255 | 13.745 |
| p4h10 | transact | 43 | 16.383 | 132.589 |
| p4h10 | afterTransact | 43 | 0.021 | 0.061 |
| p4h10 | afterAck | 43 | 0.097 | 0.295 |
| p4h10 | publicationWitness | 43 | 1.367 | 5.957 |
| p4h10 | driverOwn | 43 | 2.735 | 20.058 |
| presweep | beforeTransact | 60 | 1.095 | 39.775 |
| presweep | transact | 60 | 35.839 | 328.334 |
| presweep | afterTransact | 60 | 0.030 | 0.225 |
| presweep | afterAck | 60 | 0.179 | 4.199 |
| presweep | publicationWitness | 60 | 3.007 | 18.986 |
| presweep | driverOwn | 60 | 5.343 | 46.488 |
| sweep | beforeTransact | 36 | 1.175 | 58.577 |
| sweep | transact | 36 | 39.423 | 141.525 |
| sweep | afterTransact | 36 | 0.036 | 0.069 |
| sweep | afterAck | 36 | 0.206 | 0.795 |
| sweep | publicationWitness | 36 | 4.063 | 14.051 |
| sweep | driverOwn | 36 | 5.279 | 61.257 |
| tail | beforeTransact | 3439 | 3.775 | 4587.519 |
| tail | transact | 3439 | 48.383 | 1900.543 |
| tail | afterTransact | 3439 | 0.013 | 20.479 |
| tail | afterAck | 3439 | 0.103 | 1.359 |
| tail | publicationWitness | 3439 | 1.663 | 15.551 |
| tail | driverOwn | 3439 | 6.943 | 4587.519 |
| burst | beforeTransact | 6546 | 2.783 | 4079.615 |
| burst | transact | 6546 | 46.335 | 1171.455 |
| burst | afterTransact | 6546 | 0.014 | 17.663 |
| burst | afterAck | 6546 | 0.102 | 1.263 |
| burst | publicationWitness | 6546 | 1.655 | 15.551 |
| burst | driverOwn | 6546 | 6.079 | 4079.615 |

## Side worker ELU

- warmup: mean 0.035, max 0.113
- baseline: mean 0.023, max 0.073
- L1: mean 0.019, max 0.049
- L4: mean 0.307, max 0.784
- L16: mean 0.588, max 1.000
- L64: mean 0.060, max 0.294
- L256: mean 0.065, max 0.495
- L1024: mean 0.070, max 0.290
- recovery: mean 0.093, max 0.494
- p4mix: mean 0.027, max 0.106
- p4h1: mean 0.027, max 0.158
- grow3: mean 0.131, max 0.227
- p4h3: mean 0.030, max 0.132
- grow10: mean 0.279, max 0.420
- p4h10: mean 0.026, max 0.116
- presweep: mean 0.087, max 0.436
- sweep: mean 0.101, max 0.270
- tail: mean 0.284, max 1.000
