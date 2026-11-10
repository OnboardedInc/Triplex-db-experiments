# tx2-dxh4-s6-ladder: DONE

Diagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.

## Every bar

| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 1.0765906961221998 | >= 1.0 | MET |  |  |
| P1 | NS-P1-READ-P99-256-MS | 659.455 | <= 100 | MISS | 559.455 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 2.6028857925182463 | <= 1.25 | MISS | 1.353 above threshold | matched zero-reader run, same trace-time window |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 341.315673828125 | <= 2000 | MET |  |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | MET |  |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 1.6578060421320415 | >= 0.9 | MET |  |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 1.1877189881877444 | <= 2.0 | MET |  | matched zero-reader run, same trace-time window |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  |  |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.6108732079687209 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 8917 | > 0 and all correct | MET |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 25.471 | <= 10 | MISS | 15.471 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 274.431 | <= 50 | MISS | 224.431 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 31.615 | <= 10 | MISS | 21.615 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 268.287 | <= 50 | MISS | 218.287 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 331.602 | <= 100 | MISS | 231.602 above threshold |  |
| P2 | NS-P2 every offered command accounted | 0 | = 0 | MET |  |  |
| P2 | NS-P2 every oracle-valid trace command published | "3873/3873" | all | MET |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 1 | <= 2.19 commands | MET |  |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [0.4160195312499866] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | true | = true | MET |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 520.191 | <= 250 | MISS | 270.191 above threshold |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 0.421 | <= 5 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 2.127 | <= 25 | MET |  |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 2.287 | <= 50 | MET |  |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 902.7720672582232 | >= 1100 | MISS | 197.228 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 0.963486992240986 | <= 1.1 | MET |  | requires complete growth to depths 3 and 10 on the full sample |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 173 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  | requires committed positions past capture; observed: [4335,4342,4340,4339,4334,4337,4341,4336,4344,4343] |
| P5 | NS-P5 live read p99 during sweep / presweep | 1.0444447659488278 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 1.0792333818534692 | <= 1.5 | MET |  |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

## Writer pending at every phase boundary

```text
[ns 07:47:38] phase warmup: 16 readers at trace 0s; writer pending 0
[ns 07:47:53] phase baseline: 0 readers at trace 15s; writer pending 0
[ns 07:48:23] phase L1: 1 readers at trace 45s; writer pending 0
[ns 07:48:53] phase L4: 4 readers at trace 75s; writer pending 0
[ns 07:49:23] phase L16: 16 readers at trace 105s; writer pending 0
[ns 07:49:53] phase L64: 64 readers at trace 135s; writer pending 0
[ns 07:50:23] phase L256: 256 readers at trace 165s; writer pending 0
[ns 07:50:53] phase L1024: 256 readers at trace 195s; writer pending 0
[ns 07:51:23] phase recovery: 256 readers at trace 225s; writer pending 0
[ns 07:51:53] phase p4mix: 1 readers at trace 255s; writer pending 0
[ns 07:52:26] phase p4h1: 1 readers at trace 288s; writer pending 1
[ns 07:52:56] phase grow3: 0 readers at trace 318s; writer pending 1
[ns 07:53:00] phase p4h3: 1 readers at trace 322s; writer pending 1
[ns 07:53:30] phase grow10: 0 readers at trace 352s; writer pending 0
[ns 07:53:34] phase p4h10: 1 readers at trace 356s; writer pending 0
[ns 07:54:04] phase presweep: 64 readers at trace 386s; writer pending 0
[ns 07:54:34] phase sweep: 64 readers at trace 416s; writer pending 0
```

## P2 commit latency per size band (ms)

| Window | Facts | Count | p50 | p99 |
|---|---|---|---|---|
| bandsAll | 5-10 | 2342 | 19.071 | 175.103 |
| bandsAll | 11-25 | 1124 | 21.631 | 169.983 |
| bandsAll | 26-50 | 407 | 24.447 | 146.431 |
| bandsAtL256 | 5-10 | 473 | 25.471 | 274.431 |
| bandsAtL256 | 11-25 | 201 | 31.615 | 268.287 |
| bandsAtL256 | 26-50 | 73 | 34.303 | 331.602 |
| bandsSteady | 5-10 | 366 | 18.559 | 77.823 |
| bandsSteady | 11-25 | 189 | 21.503 | 93.695 |
| bandsSteady | 26-50 | 56 | 18.687 | 63.392 |
| bandsBurst | 5-10 | 1976 | 19.071 | 182.271 |
| bandsBurst | 11-25 | 935 | 21.631 | 173.055 |
| bandsBurst | 26-50 | 351 | 24.575 | 152.575 |

## P1 reader ladder and writer comparison

| Phase | Readers | Read p50 | Read p99 | Correct/s | Commit p50 | Commit p99 | Matched zero-reader p99 | Feed lag p99 | Client saturated | Reader thread ELU | Main ELU | Per-container mean CPU % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 0.363 | 1.135 | 1342.641 | 36.351 | 77.440 | 182.301 | 2088.624 | False | [0.3551500046068491,0.004650938648137861,0.004402682874469684] | 0.022 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":1.1647334130487563},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":19.019302430961396},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":6.421817136669082},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":41.51649467733427}} |
| L4 | 4 | 0.563 | 2.047 | 3611.088 | 30.591 | 76.363 | 115.127 | 2037.489 | False | [0.31940004230864066,0.5029005513988828,0.32250419336068614] | 0.048 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":0.7749054296625706},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":9.483915486451949},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":5.865030453676185},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":101.81712073032692}} |
| L16 | 16 | 1.399 | 11.647 | 3331.432 | 13.631 | 60.927 | 46.591 | 14.015 | False | [0.40026549790333166,0.37771557730919375,0.4409255829995043] | 0.128 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":2.587126148206537},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":26.01624513358082},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":20.296073754318055},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":111.43456296458773}} |
| L64 | 64 | 12.223 | 123.903 | 2013.279 | 21.119 | 100.351 | 35.839 | 88.575 | False | [0.7944724180719823,0.807652203683211,0.8115246944067184] | 0.333 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":6.757419320183506},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":52.195686384748726},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":47.573131108153454},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":188.86186247993118}} |
| L256 | 256 | 62.975 | 659.455 | 2167.477 | 28.031 | 278.527 | 107.007 | 520.191 | False | [0.8573394470495028,0.8346096710896894,0.840705481740797] | 0.219 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":4.751248070516213},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":34.01040971075827},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":27.154331056503278},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":183.02270367398907}} |
| L1024 | 256 | 38.911 | 518.143 | 3593.257 | 17.919 | 54.669 | 46.029 | 25.545 | False | [0.8311334904010393,0.8500448972605187,0.8408630200096578] | 0.061 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":1.3227262371850135},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":12.558211682343266},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":6.065075353317503},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":188.46426019712044}} |

### Reader correctness and apparatus per level

| Phase | Reads | Correct | Violations | Errors | Hot share | Split counters | Maintenance jobs | Main ELU | Max worker ELU |
|---|---|---|---|---|---|---|---|---|---|
| L1 | 37597 | 37597 | 0 | 0 | 0.611 | {"reads":29,"straddledATraceCommand":29,"straddledCorrect":29} | 1 | 0.022 | 0.355 |
| L4 | 101113 | 101113 | 0 | 0 | 0.612 | {"reads":146,"straddledATraceCommand":146,"straddledCorrect":146} | 1 | 0.048 | 0.503 |
| L16 | 93282 | 93282 | 0 | 0 | 0.618 | {"reads":1767,"straddledATraceCommand":1751,"straddledCorrect":1751} | 1 | 0.128 | 0.441 |
| L64 | 56375 | 56375 | 0 | 0 | 0.659 | {"reads":5432,"straddledATraceCommand":4823,"straddledCorrect":4823} | 1 | 0.333 | 0.812 |
| L256 | 60689 | 60689 | 0 | 0 | 0.648 | {"reads":2556,"straddledATraceCommand":856,"straddledCorrect":856} | 1 | 0.219 | 0.857 |
| L1024 | 100615 | 100615 | 0 | 0 | 0.635 | {"reads":2048,"straddledATraceCommand":1312,"straddledCorrect":1312} | 1 | 0.061 | 0.850 |

Matched baseline identity: `{"traceDigest":"2dfde977f66613f0","offeredUntilTraceS":600.0009116210938,"source":"/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-ladder/input/ns-writes.jsonl","sha256":"e6ff57dfde911fd30a0f69e4b6b482eb0cbbfbbdc38c3c00f0cedf4fdd0746bf"}`.

The requested cap is 256 actual readers; nominal phase names do not establish a 1,024-reader measurement.

## P4 weighted mix and history

| Group | Latency / bytes summary |
|---|---|
| weighted | {"count":43263,"minMs":0.192,"maxMs":21.098,"meanMs":0.556,"p50Ms":0.421,"p90Ms":0.947,"p99Ms":2.127,"p999Ms":4.543} |
| bucket:small | {"count":21707,"minMs":0.192,"maxMs":21.098,"meanMs":0.366,"p50Ms":0.301,"p90Ms":0.403,"p99Ms":2.023,"p999Ms":4.575,"meanBytes":6560.414658865804} |
| hops:3 | {"count":17166,"minMs":0.192,"maxMs":8.351,"meanMs":0.544,"p50Ms":0.407,"p90Ms":0.939,"p99Ms":2.143,"p999Ms":4.287,"meanBytes":18666.48351392287} |
| bucket:medium | {"count":15009,"minMs":0.345,"maxMs":9.252,"meanMs":0.639,"p50Ms":0.587,"p90Ms":0.815,"p99Ms":2.175,"p999Ms":3.967,"meanBytes":24676.917516156973} |
| hops:6 | {"count":10860,"minMs":0.202,"maxMs":9.252,"meanMs":0.57,"p50Ms":0.435,"p90Ms":0.971,"p99Ms":2.175,"p999Ms":4.287,"meanBytes":20064.79134438306} |
| bucket:large | {"count":6547,"minMs":0.7,"maxMs":7.971,"meanMs":0.997,"p50Ms":0.927,"p90Ms":1.207,"p99Ms":2.287,"p999Ms":4.287,"meanBytes":49288.62165877501} |
| hops:4 | {"count":15237,"minMs":0.201,"maxMs":21.098,"meanMs":0.559,"p50Ms":0.425,"p90Ms":0.939,"p99Ms":2.079,"p999Ms":5.567,"meanBytes":19501.40395090897} |

| History / throughput field | Observed |
|---|---|
| history | {"eligibleForDepthComparison":true,"invalid":[],"indexing":[{"job":"1afd8859-f601-40b0-8e5b-e6ae43cd7299","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2FlMGYxdGFhMjciLDBd","requestedT":"43260","requestedAtMs":1794297143807,"completed":true,"completedAtMs":1794297146340,"phase":"p4h1","driverRequestedAtMs":1794297143807.4336,"driverCompletedAtMs":1794297146340.7861,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"f3234593-4477-4451-bd00-34a9ac4bb8ba","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2FlMGYxdGFhMjciLDBd","requestedT":"43561","requestedAtMs":1794297177518,"completed":true,"completedAtMs":1794297180420,"phase":"p4h3","driverRequestedAtMs":1794297177517.5115,"driverCompletedAtMs":1794297180421.4087,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"},{"job":"3d0d8159-979c-4a86-b604-72cf4b964b35","database":"s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJucy1kYXRvbWljLWRldjIwMDAtbnNtd2FlMGYxdGFhMjciLDBd","requestedT":"43911","requestedAtMs":1794297211977,"completed":true,"completedAtMs":1794297214398,"phase":"p4h10","driverRequestedAtMs":1794297211977.157,"driverCompletedAtMs":1794297214398.6924,"clock":"driver monotonic epoch; request/response bounds enclose both gateway timestamps"}],"ratios":{"mean":1.091796875,"p50":1.1207349081364828,"p99":0.963486992240986},"sampleSubjects":200,"growth":[{"targetDepth":3,"reachedDepth":3,"subjects":200,"commands":4,"assertions":800,"failures":0,"wallS":1.152617431640625},{"targetDepth":10,"reachedDepth":10,"subjects":200,"commands":14,"assertions":2800,"failures":0,"wallS":1.502615234375}],"depth1":{"count":46763,"minMs":0.155,"maxMs":16.123,"meanMs":0.512,"p50Ms":0.381,"p90Ms":0.887,"p99Ms":2.191,"p999Ms":4.415},"depth3":{"count":45757,"minMs":0.154,"maxMs":30.209,"meanMs":0.526,"p50Ms":0.407,"p90Ms":0.923,"p99Ms":1.799,"p999Ms":4.255},"depth10":{"count":43309,"minMs":0.156,"maxMs":26.786,"meanMs":0.559,"p50Ms":0.427,"p90Ms":0.967,"p99Ms":2.111,"p999Ms":4.607},"clientBytes":{"depth1":19092.029927198662,"depth3":19273.754680719157,"depth10":19319.938351520985},"engineBytesRead":"not measured: neither engine exposes bytes read per query here (seam)"} |
| throughput | {"bestLevel":"L4","goodputPerS":3611.0882690328926,"engineCpuQuotaCores":4,"pullsPerSPerQuotaCore":902.7720672582232,"engineCpuPercentMean":117.94097210011763,"pullsPerSPerUsedCore":3061.775907669741,"hostClientCpu":{"userCores":1.1273358108764984,"kernelCores":0.04984014844636926,"hostCores":8},"hostBrokerCpu":"none in this composition (no broker process)"} |

## Three slowest measured read phases

| Phase | Read p99 ms | Engine CPU mean % by container | Client signals |
|---|---|---|---|
| L256 | 659.455 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":4.751248070516213},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":34.01040971075827},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":27.154331056503278},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":183.02270367398907}} | {"workerEluMean":[0.8573394470495028,0.8346096710896894,0.840705481740797],"maxWorkerElu":0.8573394470495028,"mainElu":0.21877067205395148,"saturated":false} |
| recovery | 634.879 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":0.5342854955522292},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":2.524411126072053},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":6.146194012167621},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":176.35896458052738}} | {"workerEluMean":[0.8699363618475519,0.8550303236499166,0.8788345869539861],"maxWorkerElu":0.8788345869539861,"mainElu":0.05833670815141536,"saturated":false} |
| L1024 | 518.143 | {"tx2-dxh4-s6-ladder-pg":{"cpuPercentMean":1.3227262371850135},"tx2-dxh4-s6-ladder-tx":{"cpuPercentMean":12.558211682343266},"tx2-dxh4-s6-ladder-gw-w":{"cpuPercentMean":6.065075353317503},"tx2-dxh4-s6-ladder-gw-r":{"cpuPercentMean":188.46426019712044}} | {"workerEluMean":[0.8311334904010393,0.8500448972605187,0.8408630200096578],"maxWorkerElu":0.8500448972605187,"mainElu":0.061203487468596815,"saturated":false} |

## Three longest phases by elapsed wall time

| Phase | Elapsed s | Cgroup samples | Per-container mean CPU % |
|---|---|---|---|
| tail | 179.840 | 178 | {"tx2-dxh4-s6-ladder-gw-r":1.4323307186813756,"tx2-dxh4-s6-ladder-gw-w":14.002887558706655,"tx2-dxh4-s6-ladder-pg":0.5573887651675481,"tx2-dxh4-s6-ladder-tx":2.6878878764819008} |
| p4h3 | 30.052 | 30 | {"tx2-dxh4-s6-ladder-gw-r":53.45713813093103,"tx2-dxh4-s6-ladder-gw-w":4.238607448678176,"tx2-dxh4-s6-ladder-pg":0.36526398881793287,"tx2-dxh4-s6-ladder-tx":2.3024963818186928} |
| p4h10 | 30.039 | 30 | {"tx2-dxh4-s6-ladder-gw-r":53.313107847067045,"tx2-dxh4-s6-ladder-gw-w":4.159356909143989,"tx2-dxh4-s6-ladder-pg":0.39115659947214587,"tx2-dxh4-s6-ladder-tx":2.2417750135665524} |

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
    "probe10:committed": 598,
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
    "minMs": 1.034,
    "maxMs": 803.948,
    "meanMs": 37.279,
    "p50Ms": 10.879,
    "p90Ms": 79.871,
    "p99Ms": 413.695,
    "p999Ms": 659.455
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
    "steadySamples": 479,
    "steadyMax": 1,
    "drains": [
      {
        "burstAtS": 120,
        "peakQueued": 16,
        "drainS": 0.4160195312499866
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
    "epoch": "ns-datomic-dev2000-nsmwae0f1taa27#0",
    "position": {
      "stream": "triplex-journal:ns-datomic-dev2000-nsmwae0f1taa27",
      "epoch": 0,
      "offset": 4730,
      "ordinal": 0
    }
  },
  "counts": {
    "pages": 5688,
    "pollErrors": 0,
    "entries": 4499,
    "deliveries": 4500,
    "redeliveries": 1,
    "redeliveryMismatches": 0,
    "replayAttempts": 1,
    "effectsWritten": 6282,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 44,
    "correctionRangeReported": 44,
    "durableWrites": 3764,
    "seenBeforeAck": 1649
  },
  "gaps": 0,
  "gapSample": [],
  "notReachedAtStop": {
    "count": 0,
    "sample": [],
    "wind": {
      "target": 4730,
      "checkpointAtStop": 4730,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794296903779.2395,
      "fired": true,
      "checkpoint": 318,
      "catchUpMs": 78.8515625
    },
    {
      "point": "after-effect",
      "plannedAt": 1794296933779.2395,
      "fired": true,
      "checkpoint": 379,
      "catchUpMs": 27.318359375
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794296963779.2395,
      "fired": true,
      "checkpoint": 451,
      "catchUpMs": 30.610107421875
    }
  ],
  "replay": {
    "from": 318,
    "to": 4730,
    "replayed": 4412,
    "firstDeliveries": 4412,
    "mismatches": 0,
    "exact": true
  },
  "lag": {
    "fromCommitInstant": {
      "count": 4498,
      "minMs": 1.285,
      "maxMs": 2088.624,
      "meanMs": 23.611,
      "p50Ms": 5.119,
      "p90Ms": 36.607,
      "p99Ms": 374.783,
      "p999Ms": 1015.807
    },
    "fromDriverAck": {
      "count": 4498,
      "minMs": 0,
      "maxMs": 2087.453,
      "meanMs": 21.411,
      "p50Ms": 2.847,
      "p90Ms": 33.279,
      "p99Ms": 366.591,
      "p999Ms": 1015.807
    },
    "atL256": {
      "count": 775,
      "minMs": 1.886,
      "maxMs": 575.905,
      "meanMs": 82.331,
      "p50Ms": 30.719,
      "p90Ms": 234.495,
      "p99Ms": 520.191,
      "p999Ms": 575.905
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
      "recordedAt": 1794297274114,
      "validAt": 1794297274439,
      "position": {
        "stream": "triplex-journal:ns-datomic-dev2000-nsmwae0f1taa27",
        "epoch": 0,
        "offset": 4333,
        "ordinal": 0
      },
      "txId": "_tx/01M72777R2M1V54JR9BNF4G5KY"
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
      4335,
      4342,
      4340,
      4339,
      4334,
      4337,
      4341,
      4336,
      4344,
      4343
    ],
    "startedAt": 1794297275447.983,
    "endedAt": 1794297278917.2249,
    "completed": true,
    "wallMs": 3468.7801120000076,
    "mutationsCommittedAfterCapture": true,
    "pulled": 2000,
    "distinctSubjects": 2000,
    "exactCoverage": true,
    "correctAtBasis": 2000,
    "violations": 0,
    "errors": 0,
    "pull": {
      "count": 2000,
      "minMs": 0.867,
      "maxMs": 242.718,
      "meanMs": 27.547,
      "p50Ms": 18.559,
      "p90Ms": 54.783,
      "p99Ms": 162.815,
      "p999Ms": 242.687
    },
    "pullsPerS": 576.5715713951244,
    "fetchOnlyWallFor100kS": 173.4390056000004,
    "mutatedSubjectsAtBasis": 10
  },
  "live": {
    "presweep": {
      "read": {
        "count": 91880,
        "minMs": 0.236,
        "maxMs": 1105.406,
        "meanMs": 17.451,
        "p50Ms": 10.495,
        "p90Ms": 31.743,
        "p99Ms": 138.239,
        "p999Ms": 452.607
      },
      "commit": {
        "count": 32,
        "minMs": 7.834,
        "maxMs": 20.61,
        "meanMs": 12.698,
        "p50Ms": 12.095,
        "p90Ms": 17.535,
        "p99Ms": 20.61,
        "p999Ms": 20.61
      }
    },
    "duringSweep": {
      "read": {
        "count": 6483,
        "minMs": 0.295,
        "maxMs": 611.138,
        "meanMs": 22.335,
        "p50Ms": 15.551,
        "p90Ms": 40.959,
        "p99Ms": 144.383,
        "p999Ms": 376.831
      },
      "commit": {
        "count": 2,
        "minMs": 10.867,
        "maxMs": 22.243,
        "meanMs": 16.555,
        "p50Ms": 10.879,
        "p90Ms": 22.243,
        "p99Ms": 22.243,
        "p999Ms": 22.243
      }
    }
  }
}
```

### correctness

```json
{
  "reads": 960817,
  "correct": 960817,
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
  "entityQueries": 1489,
  "oracleMs": 17310,
  "mismatches": [],
  "mismatchCount": 0,
  "modelCorrectOnSameReads": 24,
  "recordedCommands": 721
}
```

### client

```json
{
  "burstMainEluMean": 0.31433783893203476,
  "saturatedPhases": [],
  "invalid": false,
  "processCpu": {
    "userCores": 1.1273358108764984,
    "kernelCores": 0.04984014844636926,
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
  "offered": 4589,
  "completed": 4589,
  "expired": 0,
  "notOffered": 44150,
  "maxInFlightSeen": 11,
  "pendingAtEnd": 0,
  "offeredUntilTraceS": 600.0004753417969,
  "overlays": {
    "probe10": 598,
    "p5-mutation": 10
  }
}
```

Additional validity limits: smoke profile; matched baseline covers the same trace windows (identity above); any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

## Gateway scan counters

| At | Write peer | Read peer |
|---|---|---|
| 2026-11-10T07:47:20.362Z | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1}}"} |
| 2026-11-10T07:58:08.581Z | {"status":200,"body":"{\"routes\":{\"post \\/v2\\/db\\/{db}\\/begin\":886,\"post \\/v2\\/db\\/{db}\\/command\":145,\"post \\/v2\\/db\\/{db}\\/reach\":3890,\"post \\/v2\\/db\\/{db}\\/journal\":145,\"post \\/v1\\/db\\/{db}\\/release\":145,\"post \\/v2\\/db\\/{db}\\/transactions\":5693,\"get \\/v2\\/admin\\/scan-stats\":130,\"post \\/v1\\/db\\/create\":12,\"post \\/v2\\/db\\/{db}\\/request-index\":9,\"get \\/health\":1,\"get \\/v1\\/db\\/{db}\\/basis\":606,\"post \\/v1\\/db\\/{db}\\/transact\":4878},\"commitOrder\":{\"timeouts\":1,\"late\":3}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":130,\"post \\/v1\\/db\\/create\":4,\"post \\/v2\\/db\\/{db}\\/reach\":958435,\"post \\/v1\\/db\\/{db}\\/read\":17007}}"} |

Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.

### Last successful gateway counter snapshots

w: last successful sample at 2026-11-10T07:58:08.581Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"post /v2/db/{db}/begin":886,"post /v2/db/{db}/command":145,"post /v2/db/{db}/reach":3890,"post /v2/db/{db}/journal":145,"post /v1/db/{db}/release":145,"post /v2/db/{db}/transactions":5693,"get /v2/admin/scan-stats":130,"post /v1/db/create":12,"post /v2/db/{db}/request-index":9,"get /health":1,"get /v1/db/{db}/basis":606,"post /v1/db/{db}/transact":4878} |
| commitOrder | {"timeouts":1,"late":3} |

r: last successful sample at 2026-11-10T07:58:08.581Z; these are not final totals if later probes failed.

| Counter family | Observed |
|---|---|
| routes | {"get /health":1,"get /v2/admin/scan-stats":130,"post /v1/db/create":4,"post /v2/db/{db}/reach":958435,"post /v1/db/{db}/read":17007} |

A missing late snapshot is not zero work; begun-call datoms can exceed completed per-pattern totals.

## Per-commit driver breakdown (ms)

driverOwn includes offer queueing, all post-transact completion work (including after ACK), and durable publication witness inside transact; medians are per-command sums, not sums of medians; all latency bars remain unchanged
| Phase | Segment | Commands | Median ms | p99 ms |
|---|---|---|---|---|
| warmup | beforeTransact | 14 | 1.895 | 10.263 |
| warmup | transact | 14 | 17.151 | 32.720 |
| warmup | afterTransact | 14 | 0.010 | 0.073 |
| warmup | afterAck | 14 | 0.131 | 0.455 |
| warmup | publicationWitness | 14 | 0.971 | 1.447 |
| warmup | driverOwn | 14 | 3.183 | 12.126 |
| baseline | beforeTransact | 29 | 3.423 | 33.646 |
| baseline | transact | 29 | 31.615 | 51.721 |
| baseline | afterTransact | 29 | 0.013 | 0.136 |
| baseline | afterAck | 29 | 0.094 | 0.191 |
| baseline | publicationWitness | 29 | 1.231 | 1.845 |
| baseline | driverOwn | 29 | 4.671 | 34.749 |
| L1 | beforeTransact | 31 | 6.335 | 10.896 |
| L1 | transact | 31 | 30.079 | 69.123 |
| L1 | afterTransact | 31 | 0.010 | 17.824 |
| L1 | afterAck | 31 | 0.093 | 0.159 |
| L1 | publicationWitness | 31 | 0.963 | 3.890 |
| L1 | driverOwn | 31 | 7.423 | 29.073 |
| L4 | beforeTransact | 42 | 3.615 | 10.637 |
| L4 | transact | 42 | 24.831 | 70.157 |
| L4 | afterTransact | 42 | 0.010 | 0.026 |
| L4 | afterAck | 42 | 0.120 | 0.196 |
| L4 | publicationWitness | 42 | 0.999 | 1.927 |
| L4 | driverOwn | 42 | 4.703 | 12.394 |
| L16 | beforeTransact | 804 | 0.995 | 20.863 |
| L16 | transact | 804 | 11.967 | 59.391 |
| L16 | afterTransact | 804 | 0.009 | 0.024 |
| L16 | afterAck | 804 | 0.071 | 0.271 |
| L16 | publicationWitness | 804 | 0.883 | 4.319 |
| L16 | driverOwn | 804 | 2.063 | 22.527 |
| L64 | beforeTransact | 1633 | 1.103 | 52.991 |
| L64 | transact | 1633 | 18.431 | 68.607 |
| L64 | afterTransact | 1633 | 0.012 | 13.823 |
| L64 | afterAck | 1633 | 0.084 | 0.679 |
| L64 | publicationWitness | 1633 | 1.479 | 7.487 |
| L64 | driverOwn | 1633 | 3.359 | 55.551 |
| L256 | beforeTransact | 862 | 1.543 | 222.207 |
| L256 | transact | 862 | 22.143 | 163.839 |
| L256 | afterTransact | 862 | 0.008 | 0.086 |
| L256 | afterAck | 862 | 0.067 | 0.883 |
| L256 | publicationWitness | 862 | 1.839 | 8.895 |
| L256 | driverOwn | 862 | 4.543 | 224.255 |
| L1024 | beforeTransact | 33 | 0.891 | 8.483 |
| L1024 | transact | 33 | 15.551 | 54.265 |
| L1024 | afterTransact | 33 | 0.015 | 0.035 |
| L1024 | afterAck | 33 | 0.112 | 2.061 |
| L1024 | publicationWitness | 33 | 1.231 | 4.494 |
| L1024 | driverOwn | 33 | 2.735 | 10.149 |
| recovery | beforeTransact | 40 | 0.783 | 4.445 |
| recovery | transact | 40 | 12.735 | 50.177 |
| recovery | afterTransact | 40 | 0.014 | 0.037 |
| recovery | afterAck | 40 | 0.090 | 0.435 |
| recovery | publicationWitness | 40 | 1.335 | 5.883 |
| recovery | driverOwn | 40 | 2.799 | 6.999 |
| p4mix | beforeTransact | 27 | 1.311 | 8.172 |
| p4mix | transact | 27 | 9.023 | 33.431 |
| p4mix | afterTransact | 27 | 0.011 | 0.025 |
| p4mix | afterAck | 27 | 0.062 | 0.135 |
| p4mix | publicationWitness | 27 | 0.979 | 1.437 |
| p4mix | driverOwn | 27 | 2.351 | 9.685 |
| p4h1 | beforeTransact | 33 | 1.087 | 4.494 |
| p4h1 | transact | 33 | 12.159 | 57.661 |
| p4h1 | afterTransact | 33 | 0.011 | 0.015 |
| p4h1 | afterAck | 33 | 0.062 | 0.122 |
| p4h1 | publicationWitness | 33 | 0.943 | 1.672 |
| p4h1 | driverOwn | 33 | 2.095 | 5.720 |
| grow3 | beforeTransact | 4 | 1.143 | 4.216 |
| grow3 | transact | 4 | 11.199 | 89.185 |
| grow3 | afterTransact | 4 | 0.009 | 9.879 |
| grow3 | afterAck | 4 | 0.041 | 0.061 |
| grow3 | publicationWitness | 4 | 0.683 | 0.985 |
| grow3 | driverOwn | 4 | 2.207 | 12.001 |
| p4h3 | beforeTransact | 36 | 1.399 | 9.231 |
| p4h3 | transact | 36 | 10.239 | 38.475 |
| p4h3 | afterTransact | 36 | 0.010 | 10.246 |
| p4h3 | afterAck | 36 | 0.059 | 0.087 |
| p4h3 | publicationWitness | 36 | 1.015 | 2.325 |
| p4h3 | driverOwn | 36 | 2.399 | 12.852 |
| grow10 | beforeTransact | 4 | 3.039 | 99.745 |
| grow10 | transact | 4 | 128.511 | 219.961 |
| grow10 | afterTransact | 4 | 0.008 | 0.013 |
| grow10 | afterAck | 4 | 0.039 | 0.064 |
| grow10 | publicationWitness | 4 | 0.855 | 0.897 |
| grow10 | driverOwn | 4 | 3.983 | 100.649 |
| p4h10 | beforeTransact | 37 | 1.239 | 7.577 |
| p4h10 | transact | 37 | 11.839 | 53.783 |
| p4h10 | afterTransact | 37 | 0.010 | 0.015 |
| p4h10 | afterAck | 37 | 0.067 | 0.125 |
| p4h10 | publicationWitness | 37 | 0.999 | 3.310 |
| p4h10 | driverOwn | 37 | 2.319 | 8.928 |
| presweep | beforeTransact | 33 | 1.015 | 4.461 |
| presweep | transact | 33 | 10.815 | 19.393 |
| presweep | afterTransact | 33 | 0.010 | 0.023 |
| presweep | afterAck | 33 | 0.116 | 0.450 |
| presweep | publicationWitness | 33 | 1.095 | 4.615 |
| presweep | driverOwn | 33 | 2.415 | 6.552 |
| sweep | beforeTransact | 4 | 0.483 | 2.072 |
| sweep | transact | 4 | 12.735 | 20.012 |
| sweep | afterTransact | 4 | 0.011 | 0.018 |
| sweep | afterAck | 4 | 0.118 | 0.145 |
| sweep | publicationWitness | 4 | 1.223 | 4.383 |
| sweep | driverOwn | 4 | 2.143 | 6.615 |
| tail | beforeTransact | 199 | 3.199 | 13.503 |
| tail | transact | 199 | 24.703 | 55.551 |
| tail | afterTransact | 199 | 0.018 | 0.061 |
| tail | afterAck | 199 | 0.117 | 0.375 |
| tail | publicationWitness | 199 | 1.559 | 4.607 |
| tail | driverOwn | 199 | 5.343 | 15.359 |
| burst | beforeTransact | 3262 | 1.119 | 100.351 |
| burst | transact | 3262 | 17.535 | 111.615 |
| burst | afterTransact | 3262 | 0.010 | 3.023 |
| burst | afterAck | 3262 | 0.076 | 0.663 |
| burst | publicationWitness | 3262 | 1.319 | 7.487 |
| burst | driverOwn | 3262 | 3.119 | 110.591 |

## Side worker ELU

- warmup: mean 0.021, max 0.040
- baseline: mean 0.020, max 0.039
- L1: mean 0.012, max 0.074
- L4: mean 0.012, max 0.033
- L16: mean 0.124, max 0.316
- L64: mean 0.509, max 0.816
- L256: mean 0.397, max 1.000
- L1024: mean 0.021, max 0.076
- recovery: mean 0.034, max 0.176
- p4mix: mean 0.015, max 0.073
- p4h1: mean 0.018, max 0.088
- grow3: mean 0.081, max 0.081
- p4h3: mean 0.019, max 0.087
- grow10: mean 0.211, max 0.211
- p4h10: mean 0.017, max 0.053
- presweep: mean 0.029, max 0.151
- sweep: mean 0.034, max 0.066
- tail: mean 0.026, max 0.105
