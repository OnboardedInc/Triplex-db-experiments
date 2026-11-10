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

Matched baseline identity: `{"traceDigest":"2dfde977f66613f0","offeredUntilTraceS":600.0009116210938,"source":"/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-s6-ladder/input/ns-writes.jsonl","sha256":"e6ff57dfde911fd30a0f69e4b6b482eb0cbbfbbdc38c3c00f0cedf4fdd0746bf"}`. A requested cap of 256 also caps the nominal L1024 phase; this is not a 1,024-reader measurement.

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
    "series": [
      [
        0,
        0,
        0
      ],
      [
        1,
        0,
        1
      ],
      [
        2,
        0,
        1
      ],
      [
        3,
        1,
        2
      ],
      [
        4,
        0,
        1
      ],
      [
        5,
        0,
        1
      ],
      [
        6,
        0,
        1
      ],
      [
        7,
        0,
        1
      ],
      [
        8,
        0,
        1
      ],
      [
        9,
        0,
        1
      ],
      [
        10,
        0,
        1
      ],
      [
        11,
        0,
        1
      ],
      [
        12,
        0,
        1
      ],
      [
        13,
        0,
        1
      ],
      [
        14,
        0,
        1
      ],
      [
        15,
        0,
        1
      ],
      [
        16,
        0,
        1
      ],
      [
        17,
        0,
        1
      ],
      [
        18,
        1,
        2
      ],
      [
        19,
        0,
        1
      ],
      [
        20.1,
        0,
        1
      ],
      [
        21.1,
        0,
        1
      ],
      [
        22.1,
        0,
        1
      ],
      [
        23.1,
        0,
        1
      ],
      [
        24.1,
        0,
        1
      ],
      [
        25.1,
        0,
        1
      ],
      [
        26.1,
        0,
        1
      ],
      [
        27.1,
        0,
        1
      ],
      [
        28.1,
        1,
        2
      ],
      [
        29.1,
        0,
        1
      ],
      [
        30.1,
        0,
        1
      ],
      [
        31.1,
        0,
        1
      ],
      [
        32.1,
        0,
        1
      ],
      [
        33.1,
        0,
        1
      ],
      [
        34.1,
        0,
        1
      ],
      [
        35.1,
        0,
        1
      ],
      [
        36.1,
        0,
        1
      ],
      [
        37.2,
        0,
        1
      ],
      [
        38.2,
        0,
        1
      ],
      [
        39.2,
        0,
        1
      ],
      [
        40.2,
        0,
        1
      ],
      [
        41.2,
        0,
        1
      ],
      [
        42.2,
        0,
        1
      ],
      [
        43.2,
        0,
        1
      ],
      [
        44.2,
        0,
        1
      ],
      [
        45.2,
        0,
        1
      ],
      [
        46.2,
        0,
        1
      ],
      [
        47.2,
        0,
        1
      ],
      [
        48.2,
        0,
        1
      ],
      [
        49.2,
        0,
        1
      ],
      [
        50.2,
        0,
        1
      ],
      [
        51.2,
        0,
        1
      ],
      [
        52.2,
        1,
        2
      ],
      [
        53.2,
        0,
        1
      ],
      [
        54.2,
        0,
        1
      ],
      [
        55.2,
        0,
        1
      ],
      [
        56.2,
        0,
        1
      ],
      [
        57.2,
        0,
        1
      ],
      [
        58.2,
        0,
        1
      ],
      [
        59.2,
        0,
        1
      ],
      [
        60.2,
        0,
        1
      ],
      [
        61.2,
        0,
        1
      ],
      [
        62.2,
        0,
        1
      ],
      [
        63.2,
        1,
        2
      ],
      [
        64.2,
        0,
        1
      ],
      [
        65.2,
        0,
        1
      ],
      [
        66.2,
        0,
        1
      ],
      [
        67.2,
        0,
        1
      ],
      [
        68.3,
        0,
        1
      ],
      [
        69.3,
        0,
        1
      ],
      [
        70.3,
        0,
        1
      ],
      [
        71.3,
        0,
        1
      ],
      [
        72.3,
        0,
        1
      ],
      [
        73.3,
        0,
        1
      ],
      [
        74.3,
        0,
        1
      ],
      [
        75.3,
        0,
        1
      ],
      [
        76.3,
        0,
        1
      ],
      [
        77.3,
        0,
        1
      ],
      [
        78.3,
        0,
        1
      ],
      [
        79.3,
        0,
        1
      ],
      [
        80.3,
        0,
        1
      ],
      [
        81.3,
        0,
        1
      ],
      [
        82.3,
        0,
        1
      ],
      [
        83.3,
        0,
        1
      ],
      [
        84.3,
        0,
        1
      ],
      [
        85.3,
        0,
        1
      ],
      [
        86.3,
        0,
        1
      ],
      [
        87.3,
        0,
        1
      ],
      [
        88.3,
        1,
        2
      ],
      [
        89.3,
        0,
        1
      ],
      [
        90.3,
        0,
        1
      ],
      [
        91.3,
        0,
        1
      ],
      [
        92.3,
        0,
        1
      ],
      [
        93.3,
        0,
        1
      ],
      [
        94.3,
        0,
        1
      ],
      [
        95.3,
        0,
        1
      ],
      [
        96.3,
        0,
        1
      ],
      [
        97.3,
        0,
        1
      ],
      [
        98.3,
        0,
        1
      ],
      [
        99.3,
        0,
        1
      ],
      [
        100.3,
        0,
        1
      ],
      [
        101.3,
        0,
        1
      ],
      [
        102.3,
        0,
        1
      ],
      [
        103.3,
        0,
        1
      ],
      [
        104.3,
        0,
        1
      ],
      [
        105.3,
        0,
        1
      ],
      [
        106.3,
        0,
        1
      ],
      [
        107.3,
        0,
        1
      ],
      [
        108.3,
        0,
        1
      ],
      [
        109.3,
        1,
        2
      ],
      [
        110.3,
        0,
        1
      ],
      [
        111.3,
        0,
        1
      ],
      [
        112.3,
        0,
        1
      ],
      [
        113.3,
        0,
        1
      ],
      [
        114.3,
        0,
        1
      ],
      [
        115.3,
        0,
        1
      ],
      [
        116.3,
        0,
        1
      ],
      [
        117.3,
        0,
        1
      ],
      [
        118.3,
        0,
        1
      ],
      [
        119.3,
        0,
        1
      ],
      [
        120.3,
        3,
        4
      ],
      [
        121.3,
        4,
        5
      ],
      [
        122.3,
        0,
        1
      ],
      [
        123.3,
        0,
        1
      ],
      [
        124.3,
        0,
        1
      ],
      [
        125.3,
        1,
        2
      ],
      [
        126.3,
        1,
        2
      ],
      [
        127.3,
        1,
        2
      ],
      [
        128.3,
        2,
        3
      ],
      [
        129.3,
        0,
        1
      ],
      [
        130.3,
        0,
        1
      ],
      [
        131.3,
        0,
        1
      ],
      [
        132.3,
        1,
        2
      ],
      [
        133.3,
        0,
        1
      ],
      [
        134.3,
        0,
        1
      ],
      [
        135.3,
        1,
        2
      ],
      [
        136.3,
        0,
        1
      ],
      [
        137.3,
        1,
        2
      ],
      [
        138.3,
        2,
        3
      ],
      [
        139.3,
        1,
        2
      ],
      [
        140.3,
        2,
        3
      ],
      [
        141.3,
        1,
        2
      ],
      [
        142.3,
        2,
        3
      ],
      [
        143.3,
        0,
        1
      ],
      [
        144.3,
        0,
        1
      ],
      [
        145.3,
        1,
        2
      ],
      [
        146.3,
        0,
        1
      ],
      [
        147.3,
        1,
        2
      ],
      [
        148.3,
        0,
        1
      ],
      [
        149.3,
        0,
        1
      ],
      [
        150.3,
        0,
        1
      ],
      [
        151.3,
        0,
        1
      ],
      [
        152.3,
        0,
        1
      ],
      [
        153.3,
        0,
        2
      ],
      [
        154.3,
        0,
        1
      ],
      [
        155.3,
        0,
        1
      ],
      [
        156.3,
        0,
        1
      ],
      [
        157.3,
        2,
        3
      ],
      [
        158.3,
        1,
        3
      ],
      [
        159.3,
        0,
        1
      ],
      [
        160.4,
        3,
        4
      ],
      [
        161.4,
        0,
        1
      ],
      [
        162.4,
        3,
        4
      ],
      [
        163.4,
        1,
        2
      ],
      [
        164.4,
        0,
        1
      ],
      [
        165.4,
        1,
        2
      ],
      [
        166.4,
        2,
        3
      ],
      [
        167.4,
        3,
        4
      ],
      [
        168.4,
        3,
        5
      ],
      [
        169.4,
        4,
        5
      ],
      [
        170.4,
        2,
        3
      ],
      [
        171.4,
        0,
        1
      ],
      [
        172.4,
        0,
        1
      ],
      [
        173.4,
        0,
        1
      ],
      [
        174.4,
        2,
        3
      ],
      [
        175.4,
        4,
        5
      ],
      [
        176.4,
        1,
        2
      ],
      [
        177.4,
        16,
        18
      ],
      [
        178.4,
        0,
        1
      ],
      [
        179.4,
        0,
        1
      ],
      [
        180.4,
        0,
        1
      ],
      [
        181.4,
        0,
        1
      ],
      [
        182.4,
        0,
        1
      ],
      [
        183.4,
        0,
        1
      ],
      [
        184.4,
        0,
        1
      ],
      [
        185.4,
        0,
        1
      ],
      [
        186.4,
        0,
        1
      ],
      [
        187.4,
        0,
        1
      ],
      [
        188.4,
        0,
        1
      ],
      [
        189.4,
        0,
        1
      ],
      [
        190.4,
        0,
        1
      ],
      [
        191.4,
        0,
        1
      ],
      [
        192.4,
        1,
        2
      ],
      [
        193.4,
        0,
        1
      ],
      [
        194.4,
        0,
        1
      ],
      [
        195.4,
        0,
        1
      ],
      [
        196.4,
        0,
        1
      ],
      [
        197.4,
        0,
        1
      ],
      [
        198.4,
        0,
        1
      ],
      [
        199.4,
        1,
        2
      ],
      [
        200.4,
        0,
        1
      ],
      [
        201.4,
        0,
        1
      ],
      [
        202.4,
        0,
        1
      ],
      [
        203.4,
        0,
        1
      ],
      [
        204.4,
        0,
        1
      ],
      [
        205.4,
        0,
        1
      ],
      [
        206.4,
        0,
        1
      ],
      [
        207.4,
        0,
        1
      ],
      [
        208.4,
        0,
        1
      ],
      [
        209.4,
        0,
        1
      ],
      [
        210.4,
        0,
        1
      ],
      [
        211.4,
        0,
        1
      ],
      [
        212.4,
        0,
        1
      ],
      [
        213.4,
        0,
        1
      ],
      [
        214.4,
        0,
        1
      ],
      [
        215.4,
        0,
        1
      ],
      [
        216.4,
        0,
        1
      ],
      [
        217.4,
        0,
        1
      ],
      [
        218.4,
        0,
        1
      ],
      [
        219.4,
        0,
        1
      ],
      [
        220.4,
        0,
        1
      ],
      [
        221.4,
        0,
        1
      ],
      [
        222.4,
        0,
        1
      ],
      [
        223.4,
        0,
        1
      ],
      [
        224.4,
        0,
        1
      ],
      [
        225.4,
        0,
        1
      ],
      [
        226.4,
        0,
        1
      ],
      [
        227.4,
        0,
        1
      ],
      [
        228.4,
        0,
        1
      ],
      [
        229.4,
        0,
        1
      ],
      [
        230.4,
        0,
        1
      ],
      [
        231.4,
        0,
        1
      ],
      [
        232.5,
        0,
        1
      ],
      [
        233.5,
        0,
        1
      ],
      [
        234.5,
        0,
        1
      ],
      [
        235.5,
        0,
        1
      ],
      [
        236.5,
        0,
        1
      ],
      [
        237.5,
        0,
        1
      ],
      [
        238.5,
        0,
        1
      ],
      [
        239.5,
        0,
        1
      ],
      [
        240.5,
        0,
        1
      ],
      [
        241.5,
        0,
        1
      ],
      [
        242.5,
        0,
        1
      ],
      [
        243.5,
        0,
        1
      ],
      [
        244.5,
        0,
        1
      ],
      [
        245.5,
        0,
        1
      ],
      [
        246.5,
        0,
        1
      ],
      [
        247.5,
        0,
        1
      ],
      [
        248.5,
        0,
        1
      ],
      [
        249.5,
        0,
        1
      ],
      [
        250.5,
        0,
        1
      ],
      [
        251.5,
        0,
        1
      ],
      [
        252.5,
        0,
        1
      ],
      [
        253.5,
        0,
        1
      ],
      [
        254.5,
        0,
        1
      ],
      [
        255.5,
        0,
        1
      ],
      [
        256.5,
        0,
        1
      ],
      [
        257.5,
        0,
        1
      ],
      [
        258.5,
        0,
        1
      ],
      [
        259.5,
        0,
        1
      ],
      [
        260.5,
        0,
        1
      ],
      [
        261.5,
        0,
        1
      ],
      [
        262.5,
        0,
        1
      ],
      [
        263.5,
        0,
        1
      ],
      [
        264.5,
        0,
        1
      ],
      [
        265.5,
        0,
        1
      ],
      [
        266.5,
        0,
        1
      ],
      [
        267.5,
        0,
        1
      ],
      [
        268.5,
        0,
        1
      ],
      [
        269.5,
        0,
        1
      ],
      [
        270.5,
        0,
        1
      ],
      [
        271.5,
        0,
        1
      ],
      [
        272.5,
        0,
        1
      ],
      [
        273.5,
        0,
        1
      ],
      [
        274.5,
        0,
        1
      ],
      [
        275.5,
        0,
        1
      ],
      [
        276.5,
        0,
        1
      ],
      [
        277.5,
        0,
        1
      ],
      [
        278.5,
        0,
        1
      ],
      [
        279.5,
        0,
        1
      ],
      [
        280.5,
        0,
        1
      ],
      [
        281.5,
        0,
        1
      ],
      [
        282.5,
        0,
        1
      ],
      [
        283.5,
        0,
        1
      ],
      [
        284.5,
        0,
        1
      ],
      [
        285.5,
        0,
        1
      ],
      [
        286.5,
        0,
        1
      ],
      [
        287.5,
        0,
        1
      ],
      [
        288.5,
        0,
        1
      ],
      [
        289.5,
        0,
        1
      ],
      [
        290.5,
        0,
        1
      ],
      [
        291.5,
        0,
        1
      ],
      [
        292.5,
        0,
        1
      ],
      [
        293.5,
        0,
        1
      ],
      [
        294.5,
        0,
        1
      ],
      [
        295.5,
        0,
        1
      ],
      [
        296.5,
        0,
        1
      ],
      [
        297.5,
        0,
        1
      ],
      [
        298.5,
        0,
        1
      ],
      [
        299.5,
        0,
        1
      ],
      [
        300.5,
        0,
        1
      ],
      [
        301.5,
        0,
        1
      ],
      [
        302.5,
        0,
        1
      ],
      [
        303.5,
        0,
        1
      ],
      [
        304.5,
        0,
        1
      ],
      [
        305.5,
        0,
        1
      ],
      [
        306.5,
        0,
        1
      ],
      [
        307.5,
        0,
        1
      ],
      [
        308.5,
        0,
        1
      ],
      [
        309.5,
        0,
        1
      ],
      [
        310.5,
        0,
        1
      ],
      [
        311.5,
        0,
        1
      ],
      [
        312.5,
        0,
        1
      ],
      [
        313.6,
        0,
        1
      ],
      [
        314.6,
        0,
        1
      ],
      [
        315.6,
        0,
        1
      ],
      [
        316.6,
        0,
        1
      ],
      [
        317.6,
        0,
        2
      ],
      [
        318.6,
        0,
        1
      ],
      [
        319.6,
        0,
        1
      ],
      [
        320.6,
        0,
        1
      ],
      [
        321.6,
        0,
        1
      ],
      [
        322.6,
        0,
        1
      ],
      [
        323.6,
        0,
        1
      ],
      [
        324.6,
        0,
        1
      ],
      [
        325.6,
        0,
        1
      ],
      [
        326.6,
        0,
        1
      ],
      [
        327.6,
        0,
        1
      ],
      [
        328.6,
        0,
        1
      ],
      [
        329.6,
        0,
        1
      ],
      [
        330.6,
        0,
        1
      ],
      [
        331.6,
        0,
        1
      ],
      [
        332.6,
        0,
        1
      ],
      [
        333.6,
        0,
        1
      ],
      [
        334.6,
        0,
        1
      ],
      [
        335.6,
        0,
        1
      ],
      [
        336.6,
        0,
        1
      ],
      [
        337.6,
        0,
        1
      ],
      [
        338.6,
        0,
        1
      ],
      [
        339.6,
        0,
        1
      ],
      [
        340.6,
        0,
        1
      ],
      [
        341.6,
        0,
        1
      ],
      [
        342.6,
        0,
        1
      ],
      [
        343.6,
        0,
        1
      ],
      [
        344.6,
        0,
        1
      ],
      [
        345.6,
        0,
        1
      ],
      [
        346.6,
        0,
        1
      ],
      [
        347.6,
        0,
        1
      ],
      [
        348.6,
        0,
        1
      ],
      [
        349.6,
        0,
        1
      ],
      [
        350.6,
        0,
        1
      ],
      [
        351.6,
        0,
        1
      ],
      [
        352.6,
        0,
        1
      ],
      [
        353.6,
        0,
        1
      ],
      [
        354.6,
        0,
        1
      ],
      [
        355.6,
        0,
        1
      ],
      [
        356.6,
        0,
        1
      ],
      [
        357.6,
        0,
        1
      ],
      [
        358.6,
        0,
        1
      ],
      [
        359.6,
        0,
        1
      ],
      [
        360.6,
        0,
        1
      ],
      [
        361.6,
        0,
        1
      ],
      [
        362.6,
        0,
        1
      ],
      [
        363.6,
        0,
        1
      ],
      [
        364.6,
        0,
        1
      ],
      [
        365.7,
        0,
        1
      ],
      [
        366.7,
        0,
        1
      ],
      [
        367.7,
        0,
        1
      ],
      [
        368.7,
        0,
        1
      ],
      [
        369.7,
        0,
        1
      ],
      [
        370.7,
        0,
        1
      ],
      [
        371.7,
        0,
        1
      ],
      [
        372.7,
        0,
        1
      ],
      [
        373.7,
        0,
        1
      ],
      [
        374.7,
        0,
        1
      ],
      [
        375.7,
        0,
        1
      ],
      [
        376.7,
        0,
        1
      ],
      [
        377.7,
        0,
        1
      ],
      [
        378.7,
        0,
        1
      ],
      [
        379.7,
        0,
        1
      ],
      [
        380.7,
        0,
        1
      ],
      [
        381.7,
        0,
        1
      ],
      [
        382.7,
        0,
        1
      ],
      [
        383.7,
        0,
        1
      ],
      [
        384.7,
        0,
        1
      ],
      [
        385.7,
        0,
        1
      ],
      [
        386.7,
        0,
        1
      ],
      [
        387.7,
        0,
        1
      ],
      [
        388.7,
        0,
        1
      ],
      [
        389.7,
        0,
        1
      ],
      [
        390.7,
        0,
        1
      ],
      [
        391.7,
        0,
        1
      ],
      [
        392.7,
        0,
        1
      ],
      [
        393.7,
        0,
        1
      ],
      [
        394.7,
        0,
        1
      ],
      [
        395.7,
        0,
        1
      ],
      [
        396.7,
        0,
        1
      ],
      [
        397.7,
        0,
        1
      ],
      [
        398.7,
        0,
        1
      ],
      [
        399.7,
        0,
        1
      ],
      [
        400.7,
        0,
        1
      ],
      [
        401.7,
        0,
        1
      ],
      [
        402.7,
        0,
        1
      ],
      [
        403.7,
        0,
        1
      ],
      [
        404.7,
        0,
        1
      ],
      [
        405.7,
        0,
        1
      ],
      [
        406.7,
        0,
        1
      ],
      [
        407.7,
        0,
        1
      ],
      [
        408.7,
        0,
        1
      ],
      [
        409.7,
        0,
        1
      ],
      [
        410.7,
        0,
        1
      ],
      [
        411.7,
        0,
        1
      ],
      [
        412.7,
        0,
        1
      ],
      [
        413.7,
        0,
        1
      ],
      [
        414.7,
        0,
        1
      ],
      [
        415.7,
        0,
        11
      ],
      [
        416.7,
        0,
        1
      ],
      [
        417.7,
        0,
        1
      ],
      [
        418.7,
        0,
        1
      ],
      [
        419.7,
        0,
        1
      ],
      [
        420.7,
        0,
        1
      ],
      [
        421.7,
        1,
        2
      ],
      [
        422.7,
        0,
        1
      ],
      [
        423.7,
        0,
        1
      ],
      [
        424.7,
        0,
        1
      ],
      [
        425.7,
        0,
        1
      ],
      [
        426.7,
        0,
        1
      ],
      [
        427.7,
        0,
        1
      ],
      [
        428.7,
        0,
        1
      ],
      [
        429.7,
        0,
        1
      ],
      [
        430.7,
        0,
        1
      ],
      [
        431.7,
        0,
        1
      ],
      [
        432.8,
        0,
        1
      ],
      [
        433.8,
        0,
        1
      ],
      [
        434.8,
        0,
        1
      ],
      [
        435.8,
        1,
        2
      ],
      [
        436.8,
        0,
        1
      ],
      [
        437.8,
        0,
        1
      ],
      [
        438.8,
        0,
        1
      ],
      [
        439.8,
        0,
        1
      ],
      [
        440.8,
        0,
        1
      ],
      [
        441.8,
        0,
        1
      ],
      [
        442.8,
        1,
        2
      ],
      [
        443.8,
        0,
        1
      ],
      [
        444.8,
        0,
        1
      ],
      [
        445.8,
        0,
        1
      ],
      [
        446.8,
        0,
        1
      ],
      [
        447.8,
        0,
        1
      ],
      [
        448.8,
        0,
        1
      ],
      [
        449.8,
        0,
        1
      ],
      [
        450.8,
        0,
        1
      ],
      [
        451.8,
        0,
        1
      ],
      [
        452.8,
        0,
        1
      ],
      [
        453.8,
        0,
        1
      ],
      [
        454.8,
        0,
        1
      ],
      [
        455.8,
        0,
        1
      ],
      [
        456.9,
        0,
        1
      ],
      [
        457.9,
        0,
        1
      ],
      [
        458.9,
        0,
        1
      ],
      [
        459.9,
        0,
        1
      ],
      [
        460.9,
        0,
        1
      ],
      [
        461.9,
        0,
        1
      ],
      [
        462.9,
        0,
        1
      ],
      [
        463.9,
        0,
        1
      ],
      [
        464.9,
        0,
        1
      ],
      [
        465.9,
        0,
        1
      ],
      [
        466.9,
        0,
        1
      ],
      [
        467.9,
        0,
        1
      ],
      [
        468.9,
        0,
        1
      ],
      [
        469.9,
        0,
        1
      ],
      [
        471,
        0,
        1
      ],
      [
        472,
        0,
        1
      ],
      [
        473,
        0,
        1
      ],
      [
        474,
        0,
        1
      ],
      [
        475,
        0,
        1
      ],
      [
        476,
        0,
        1
      ],
      [
        477,
        0,
        1
      ],
      [
        478,
        0,
        1
      ],
      [
        479,
        0,
        1
      ],
      [
        480,
        0,
        1
      ],
      [
        481,
        0,
        1
      ],
      [
        482,
        0,
        1
      ],
      [
        483,
        0,
        1
      ],
      [
        484,
        0,
        1
      ],
      [
        485,
        0,
        1
      ],
      [
        486.1,
        0,
        1
      ],
      [
        487.1,
        0,
        1
      ],
      [
        488.1,
        0,
        1
      ],
      [
        489.1,
        0,
        1
      ],
      [
        490.1,
        0,
        1
      ],
      [
        491.1,
        0,
        1
      ],
      [
        492.1,
        0,
        1
      ],
      [
        493.1,
        0,
        1
      ],
      [
        494.1,
        0,
        1
      ],
      [
        495.1,
        0,
        1
      ],
      [
        496.1,
        0,
        1
      ],
      [
        497.1,
        0,
        1
      ],
      [
        498.1,
        0,
        1
      ],
      [
        499.1,
        0,
        1
      ],
      [
        500.1,
        1,
        2
      ],
      [
        501.1,
        0,
        1
      ],
      [
        502.1,
        0,
        1
      ],
      [
        503.1,
        0,
        1
      ],
      [
        504.1,
        0,
        1
      ],
      [
        505.1,
        0,
        1
      ],
      [
        506.1,
        0,
        1
      ],
      [
        507.1,
        0,
        1
      ],
      [
        508.2,
        0,
        1
      ],
      [
        509.2,
        0,
        1
      ],
      [
        510.2,
        0,
        1
      ],
      [
        511.2,
        0,
        1
      ],
      [
        512.2,
        0,
        1
      ],
      [
        513.2,
        0,
        1
      ],
      [
        514.2,
        0,
        1
      ],
      [
        515.2,
        0,
        1
      ],
      [
        516.2,
        0,
        1
      ],
      [
        517.2,
        0,
        1
      ],
      [
        518.2,
        0,
        1
      ],
      [
        519.2,
        0,
        1
      ],
      [
        520.2,
        0,
        1
      ],
      [
        521.2,
        0,
        1
      ],
      [
        522.2,
        0,
        1
      ],
      [
        523.2,
        1,
        2
      ],
      [
        524.2,
        0,
        1
      ],
      [
        525.3,
        0,
        1
      ],
      [
        526.3,
        0,
        1
      ],
      [
        527.3,
        0,
        1
      ],
      [
        528.3,
        0,
        1
      ],
      [
        529.3,
        0,
        1
      ],
      [
        530.3,
        0,
        1
      ],
      [
        531.3,
        0,
        1
      ],
      [
        532.3,
        0,
        1
      ],
      [
        533.3,
        0,
        1
      ],
      [
        534.3,
        0,
        1
      ],
      [
        535.3,
        0,
        1
      ],
      [
        536.3,
        0,
        1
      ],
      [
        537.3,
        0,
        1
      ],
      [
        538.3,
        0,
        1
      ],
      [
        539.3,
        0,
        1
      ],
      [
        540.4,
        0,
        1
      ],
      [
        541.4,
        0,
        1
      ],
      [
        542.4,
        0,
        1
      ],
      [
        543.4,
        0,
        1
      ],
      [
        544.4,
        0,
        1
      ],
      [
        545.4,
        0,
        1
      ],
      [
        546.4,
        0,
        1
      ],
      [
        547.4,
        0,
        1
      ],
      [
        548.4,
        1,
        2
      ],
      [
        549.4,
        0,
        1
      ],
      [
        550.4,
        0,
        1
      ],
      [
        551.4,
        0,
        1
      ],
      [
        552.4,
        0,
        1
      ],
      [
        553.4,
        0,
        1
      ],
      [
        554.4,
        0,
        1
      ],
      [
        555.5,
        0,
        1
      ],
      [
        556.5,
        0,
        1
      ],
      [
        557.5,
        0,
        1
      ],
      [
        558.5,
        0,
        1
      ],
      [
        559.5,
        0,
        1
      ],
      [
        560.5,
        0,
        1
      ],
      [
        561.5,
        0,
        1
      ],
      [
        562.5,
        0,
        1
      ],
      [
        563.5,
        0,
        1
      ],
      [
        564.5,
        0,
        1
      ],
      [
        565.5,
        0,
        1
      ],
      [
        566.5,
        0,
        1
      ],
      [
        567.5,
        0,
        1
      ],
      [
        568.5,
        0,
        1
      ],
      [
        569.6,
        0,
        1
      ],
      [
        570.6,
        0,
        1
      ],
      [
        571.6,
        0,
        1
      ],
      [
        572.6,
        0,
        1
      ],
      [
        573.6,
        0,
        1
      ],
      [
        574.6,
        0,
        1
      ],
      [
        575.6,
        0,
        1
      ],
      [
        576.6,
        0,
        1
      ],
      [
        577.6,
        0,
        1
      ],
      [
        578.6,
        0,
        1
      ],
      [
        579.6,
        0,
        1
      ],
      [
        580.6,
        0,
        1
      ],
      [
        581.6,
        0,
        1
      ],
      [
        582.6,
        0,
        1
      ],
      [
        583.6,
        0,
        1
      ],
      [
        584.6,
        0,
        1
      ],
      [
        585.7,
        0,
        1
      ],
      [
        586.7,
        0,
        1
      ],
      [
        587.7,
        0,
        1
      ],
      [
        588.7,
        0,
        1
      ],
      [
        589.7,
        0,
        1
      ],
      [
        590.7,
        0,
        1
      ],
      [
        591.7,
        1,
        2
      ],
      [
        592.7,
        0,
        1
      ],
      [
        593.7,
        0,
        1
      ],
      [
        594.7,
        0,
        1
      ],
      [
        595.7,
        0,
        1
      ],
      [
        596.7,
        0,
        1
      ],
      [
        597.7,
        0,
        1
      ],
      [
        598.7,
        0,
        1
      ],
      [
        599.7,
        0,
        1
      ]
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
  "series": {
    "main": [
      {
        "t": 1794296841267.0706,
        "elu": 0.09268762424574334
      },
      {
        "t": 1794296841770.833,
        "elu": 0.09638265609744791
      },
      {
        "t": 1794296842274.0486,
        "elu": 0.1639696970794097
      },
      {
        "t": 1794296842784.5159,
        "elu": 0.1836533066749878
      },
      {
        "t": 1794296843290.4678,
        "elu": 0.17880276786284124
      },
      {
        "t": 1794296843793.1423,
        "elu": 0.22867056633800478
      },
      {
        "t": 1794296844298.2644,
        "elu": 0.23933397994910074
      },
      {
        "t": 1794296844803.4363,
        "elu": 0.21291862888883262
      },
      {
        "t": 1794296845306.406,
        "elu": 0.24793911165164625
      },
      {
        "t": 1794296845811.4019,
        "elu": 0.2532607828112831
      },
      {
        "t": 1794296846313.1824,
        "elu": 0.3195837193991852
      },
      {
        "t": 1794296846813.9084,
        "elu": 0.32028798798863783
      },
      {
        "t": 1794296847317.4246,
        "elu": 0.3139702367523723
      },
      {
        "t": 1794296847817.6453,
        "elu": 0.32777749612884466
      },
      {
        "t": 1794296848323.2078,
        "elu": 0.3235190684743581
      },
      {
        "t": 1794296848823.296,
        "elu": 0.38515134292880027
      },
      {
        "t": 1794296849324.1929,
        "elu": 0.2914722546764416
      },
      {
        "t": 1794296849827.9385,
        "elu": 0.32372636813389033
      },
      {
        "t": 1794296850328.825,
        "elu": 0.3714201057000341
      },
      {
        "t": 1794296850831.4714,
        "elu": 0.34665633983724276
      },
      {
        "t": 1794296851336.7644,
        "elu": 0.3782735853595467
      },
      {
        "t": 1794296851846.5806,
        "elu": 0.3948537748572503
      },
      {
        "t": 1794296852349.8013,
        "elu": 0.3771314108793983
      },
      {
        "t": 1794296852859.487,
        "elu": 0.3313010355090999
      },
      {
        "t": 1794296853361.451,
        "elu": 0.418640235776947
      },
      {
        "t": 1794296853864.266,
        "elu": 0.373454730107993
      },
      {
        "t": 1794296854364.936,
        "elu": 0.37018826927865206
      },
      {
        "t": 1794296854874.0664,
        "elu": 0.35506199840403013
      },
      {
        "t": 1794296855377.7034,
        "elu": 0.3742274631348064
      },
      {
        "t": 1794296855881.3877,
        "elu": 0.35994372981233197
      },
      {
        "t": 1794296856411.2124,
        "elu": 0.5269968892136196
      },
      {
        "t": 1794296856911.6497,
        "elu": 0.0009715026526543214
      },
      {
        "t": 1794296857413.1633,
        "elu": 0.002920871264043753
      },
      {
        "t": 1794296857914.2517,
        "elu": 0.019454640533139774
      },
      {
        "t": 1794296858414.9548,
        "elu": 0.006003667655718501
      },
      {
        "t": 1794296858915.173,
        "elu": 0.007538875020073152
      },
      {
        "t": 1794296859415.2483,
        "elu": 0.010989837468634666
      },
      {
        "t": 1794296859915.6072,
        "elu": 0.0280479265232471
      },
      {
        "t": 1794296860415.5852,
        "elu": 0.02477474800154725
      },
      {
        "t": 1794296860916.6335,
        "elu": 0.027583001385973322
      },
      {
        "t": 1794296861417.919,
        "elu": 0.03307963192263701
      },
      {
        "t": 1794296861919.3738,
        "elu": 0.04499613339438911
      },
      {
        "t": 1794296862420.222,
        "elu": 0.034150969022265006
      },
      {
        "t": 1794296862921.2705,
        "elu": 0.027708878623292476
      },
      {
        "t": 1794296863422.363,
        "elu": 0.03499220079980951
      },
      {
        "t": 1794296863922.8323,
        "elu": 0.041604181960810616
      },
      {
        "t": 1794296864422.6782,
        "elu": 0.026330868443136098
      },
      {
        "t": 1794296864922.4524,
        "elu": 0.03181816855486471
      },
      {
        "t": 1794296865422.5327,
        "elu": 0.12614393257794138
      },
      {
        "t": 1794296865922.4004,
        "elu": 0.11825585826112307
      },
      {
        "t": 1794296866435.2456,
        "elu": 0.06780488934708888
      },
      {
        "t": 1794296866934.9224,
        "elu": 0.05363933639083682
      },
      {
        "t": 1794296867435.1624,
        "elu": 0.17093056828070005
      },
      {
        "t": 1794296867939.7017,
        "elu": 0.03108866760558788
      },
      {
        "t": 1794296868439.192,
        "elu": 0.03766237261536573
      },
      {
        "t": 1794296868938.979,
        "elu": 0.03045829895867309
      },
      {
        "t": 1794296869438.9153,
        "elu": 0.05796243970709277
      },
      {
        "t": 1794296869939.0745,
        "elu": 0.04604427504060807
      },
      {
        "t": 1794296870440.852,
        "elu": 0.023957330146019896
      },
      {
        "t": 1794296870939.9932,
        "elu": 0.03928728399045731
      },
      {
        "t": 1794296871440.4585,
        "elu": 0.0335012134997319
      },
      {
        "t": 1794296871941.2542,
        "elu": 0.031057021058592107
      },
      {
        "t": 1794296872442.154,
        "elu": 0.03326783337542273
      },
      {
        "t": 1794296872942.0432,
        "elu": 0.021617811022684966
      },
      {
        "t": 1794296873442.4797,
        "elu": 0.06545132122819891
      },
      {
        "t": 1794296873951.1719,
        "elu": 0.14044994051277485
      },
      {
        "t": 1794296874452.477,
        "elu": 0.006747077196926851
      },
      {
        "t": 1794296874952.7397,
        "elu": 0.003052354243759213
      },
      {
        "t": 1794296875453.2012,
        "elu": 0.018027641890789467
      },
      {
        "t": 1794296875954.7205,
        "elu": 0.008357040146449864
      },
      {
        "t": 1794296876463.6804,
        "elu": 0.037085642447853194
      },
      {
        "t": 1794296876973.2786,
        "elu": 0.03804140506916703
      },
      {
        "t": 1794296877474.186,
        "elu": 0.037029883949356905
      },
      {
        "t": 1794296877975.7903,
        "elu": 0.006945442373819816
      },
      {
        "t": 1794296878476.586,
        "elu": 0.018084451996965352
      },
      {
        "t": 1794296878980.1191,
        "elu": 0.009583942881507346
      },
      {
        "t": 1794296879481.237,
        "elu": 0.03582085596057843
      },
      {
        "t": 1794296879982.6067,
        "elu": 0.002250787800491316
      },
      {
        "t": 1794296880482.5857,
        "elu": 0.016407914237075088
      },
      {
        "t": 1794296880983.676,
        "elu": 0.009486800959072868
      },
      {
        "t": 1794296881485.8193,
        "elu": 0.017548203032818264
      },
      {
        "t": 1794296881990.8542,
        "elu": 0.12628678333023696
      },
      {
        "t": 1794296882490.8384,
        "elu": 0.15368720590880416
      },
      {
        "t": 1794296882993.2698,
        "elu": 0.0620846081717366
      },
      {
        "t": 1794296883492.1743,
        "elu": 0.04053267847175096
      },
      {
        "t": 1794296883994.276,
        "elu": 0.01724041481996758
      },
      {
        "t": 1794296884495.3665,
        "elu": 0.04017575801343227
      },
      {
        "t": 1794296884999.4734,
        "elu": 0.05034264129090801
      },
      {
        "t": 1794296885498.41,
        "elu": 0.0017090250136227727
      },
      {
        "t": 1794296886001.5093,
        "elu": 0.07438025964805277
      },
      {
        "t": 1794296886505.0386,
        "elu": 0.04274024353302964
      },
      {
        "t": 1794296887014.5354,
        "elu": 0.07283335608360111
      },
      {
        "t": 1794296887516.5757,
        "elu": 0.005935658104418921
      },
      {
        "t": 1794296888026.288,
        "elu": 0.04397711542470538
      },
      {
        "t": 1794296888527.4497,
        "elu": 0.00910010274748716
      },
      {
        "t": 1794296889036.5955,
        "elu": 0.04327633017462426
      },
      {
        "t": 1794296889542.5288,
        "elu": 0.008245712477762327
      },
      {
        "t": 1794296890048.1392,
        "elu": 0.02355358579765267
      },
      {
        "t": 1794296890555.6245,
        "elu": 0.005211817537645017
      },
      {
        "t": 1794296891064.6917,
        "elu": 0.016496691301199014
      },
      {
        "t": 1794296891566.459,
        "elu": 0.007203516414375463
      },
      {
        "t": 1794296892071.5684,
        "elu": 0.019254584909861032
      },
      {
        "t": 1794296892574.0342,
        "elu": 0.012189742520386253
      },
      {
        "t": 1794296893084.3413,
        "elu": 0.06549599705438268
      },
      {
        "t": 1794296893587.0225,
        "elu": 0.01348391682895934
      },
      {
        "t": 1794296894094.425,
        "elu": 0.017935065200823597
      },
      {
        "t": 1794296894596.2583,
        "elu": 0.013117259402679007
      },
      {
        "t": 1794296895096.6726,
        "elu": 0.03225665501376042
      },
      {
        "t": 1794296895597.6064,
        "elu": 0.020715944311699146
      },
      {
        "t": 1794296896107.1653,
        "elu": 0.015199337155103732
      },
      {
        "t": 1794296896611.3782,
        "elu": 0.011517658403649106
      },
      {
        "t": 1794296897120.9717,
        "elu": 0.008303375619540294
      },
      {
        "t": 1794296897624.658,
        "elu": 0.06478394075921692
      },
      {
        "t": 1794296898128.8425,
        "elu": 0.010389304564882757
      },
      {
        "t": 1794296898633.4534,
        "elu": 0.013938527006704058
      },
      {
        "t": 1794296899134.327,
        "elu": 0.01780334060332686
      },
      {
        "t": 1794296899635.1558,
        "elu": 0.01030646938419175
      },
      {
        "t": 1794296900140.9897,
        "elu": 0.030432942781035203
      },
      {
        "t": 1794296900641.8508,
        "elu": 0.04469257345899492
      },
      {
        "t": 1794296901142.6797,
        "elu": 0.015990154674642272
      },
      {
        "t": 1794296901644.097,
        "elu": 0.0027460661402570136
      },
      {
        "t": 1794296902145.8262,
        "elu": 0.026058779035547232
      },
      {
        "t": 1794296902646.6724,
        "elu": 0.007937214027728599
      },
      {
        "t": 1794296903152.096,
        "elu": 0.05193956523345109
      },
      {
        "t": 1794296903656.002,
        "elu": 0.008128896467071938
      },
      {
        "t": 1794296904156.2656,
        "elu": 0.03148072161353338
      },
      {
        "t": 1794296904657.0188,
        "elu": 0.0067868722920771144
      },
      {
        "t": 1794296905163.1948,
        "elu": 0.008323747454299152
      },
      {
        "t": 1794296905663.1238,
        "elu": 0.03164063485248209
      },
      {
        "t": 1794296906168.1895,
        "elu": 0.007908265863600439
      },
      {
        "t": 1794296906668.0786,
        "elu": 0.028265956366747575
      },
      {
        "t": 1794296907168.546,
        "elu": 0.011176473721379402
      },
      {
        "t": 1794296907668.2231,
        "elu": 0.017675487472248903
      },
      {
        "t": 1794296908168.4646,
        "elu": 0.011657610094286765
      },
      {
        "t": 1794296908668.3071,
        "elu": 0.014260070816172653
      },
      {
        "t": 1794296909168.2488,
        "elu": 0.011024643400207817
      },
      {
        "t": 1794296909668.8354,
        "elu": 0.1905943703321666
      },
      {
        "t": 1794296910171.2905,
        "elu": 0.007231259438173078
      },
      {
        "t": 1794296910671.3655,
        "elu": 0.01602802187428078
      },
      {
        "t": 1794296911173.2058,
        "elu": 0.028131953856739954
      },
      {
        "t": 1794296911673.3865,
        "elu": 0.0058467788740493324
      },
      {
        "t": 1794296912173.6968,
        "elu": 0.011481978626292699
      },
      {
        "t": 1794296912673.9373,
        "elu": 0.029976682077607102
      },
      {
        "t": 1794296913174.2385,
        "elu": 0.022123984842287846
      },
      {
        "t": 1794296913674.137,
        "elu": 0.012981953226000166
      },
      {
        "t": 1794296914173.9812,
        "elu": 0.015083436996688024
      },
      {
        "t": 1794296914674.3315,
        "elu": 0.03733922598255191
      },
      {
        "t": 1794296915174.9673,
        "elu": 0.015090839791861954
      },
      {
        "t": 1794296915675.0713,
        "elu": 0.049167266214560065
      },
      {
        "t": 1794296916175.7039,
        "elu": 0.01483823201557572
      },
      {
        "t": 1794296916675.1702,
        "elu": 0.0071751868035991265
      },
      {
        "t": 1794296917175.0715,
        "elu": 0.011854256502253007
      },
      {
        "t": 1794296917677.5942,
        "elu": 0.006725652491394269
      },
      {
        "t": 1794296918177.3406,
        "elu": 0.04272509248735532
      },
      {
        "t": 1794296918677.1917,
        "elu": 0.0067266920903494955
      },
      {
        "t": 1794296919180.8494,
        "elu": 0.03044696232835772
      },
      {
        "t": 1794296919681.0618,
        "elu": 0.030195456671977178
      },
      {
        "t": 1794296920181.124,
        "elu": 0.009023457796584665
      },
      {
        "t": 1794296920681.798,
        "elu": 0.009413320547690666
      },
      {
        "t": 1794296921181.212,
        "elu": 0.014358085633765593
      },
      {
        "t": 1794296921681.1926,
        "elu": 0.03489798948321031
      },
      {
        "t": 1794296922183.1763,
        "elu": 0.011943801737167232
      },
      {
        "t": 1794296922683.0845,
        "elu": 0.02612036823083902
      },
      {
        "t": 1794296923182.917,
        "elu": 0.00988724446118572
      },
      {
        "t": 1794296923683.488,
        "elu": 0.009514336925920207
      },
      {
        "t": 1794296924183.97,
        "elu": 0.01000043878124015
      },
      {
        "t": 1794296924684.89,
        "elu": 0.02888214911081849
      },
      {
        "t": 1794296925184.7944,
        "elu": 0.0454541082850429
      },
      {
        "t": 1794296925684.2512,
        "elu": 0.006860962257058819
      },
      {
        "t": 1794296926190.1257,
        "elu": 0.009913644817322202
      },
      {
        "t": 1794296926690.2173,
        "elu": 0.022021349852134553
      },
      {
        "t": 1794296927190.1108,
        "elu": 0.14370601758544857
      },
      {
        "t": 1794296927690.1396,
        "elu": 0.006379998808716983
      },
      {
        "t": 1794296928191.903,
        "elu": 0.009307972584073888
      },
      {
        "t": 1794296928692.176,
        "elu": 0.02834583611640325
      },
      {
        "t": 1794296929192.8188,
        "elu": 0.008978435706895247
      },
      {
        "t": 1794296929692.9453,
        "elu": 0.009295464565131178
      },
      {
        "t": 1794296930194.1433,
        "elu": 0.008666983977597595
      },
      {
        "t": 1794296930694.0103,
        "elu": 0.03272234309616846
      },
      {
        "t": 1794296931194.8352,
        "elu": 0.011647721174008915
      },
      {
        "t": 1794296931694.345,
        "elu": 0.00912827224422767
      },
      {
        "t": 1794296932194.1147,
        "elu": 0.016679664340256944
      },
      {
        "t": 1794296932694.6106,
        "elu": 0.007977548144230842
      },
      {
        "t": 1794296933194.7927,
        "elu": 0.010311405149890939
      },
      {
        "t": 1794296933694.2278,
        "elu": 0.01135461309242331
      },
      {
        "t": 1794296934194.938,
        "elu": 0.015842553432882163
      },
      {
        "t": 1794296934695.723,
        "elu": 0.03299724786980422
      },
      {
        "t": 1794296935196.8533,
        "elu": 0.20077555766504473
      },
      {
        "t": 1794296935698.3909,
        "elu": 0.1750224171494399
      },
      {
        "t": 1794296936203.1826,
        "elu": 0.028137024866299633
      },
      {
        "t": 1794296936703.5474,
        "elu": 0.03361263660659728
      },
      {
        "t": 1794296937203.4165,
        "elu": 0.033610290146152105
      },
      {
        "t": 1794296937703.0295,
        "elu": 0.027497204806587183
      },
      {
        "t": 1794296938203.073,
        "elu": 0.04344871006732267
      },
      {
        "t": 1794296938704.9263,
        "elu": 0.016425469734372488
      },
      {
        "t": 1794296939205.356,
        "elu": 0.027059422403238897
      },
      {
        "t": 1794296939705.1038,
        "elu": 0.17899086272481796
      },
      {
        "t": 1794296940205.1968,
        "elu": 0.02940595995780941
      },
      {
        "t": 1794296940705.0103,
        "elu": 0.01580295854231589
      },
      {
        "t": 1794296941205.021,
        "elu": 0.02125178780065022
      },
      {
        "t": 1794296941705.6228,
        "elu": 0.03819051846365918
      },
      {
        "t": 1794296942205.3345,
        "elu": 0.0424467638334245
      },
      {
        "t": 1794296942704.97,
        "elu": 0.028543926025801133
      },
      {
        "t": 1794296943205.2126,
        "elu": 0.020044087196719424
      },
      {
        "t": 1794296943704.99,
        "elu": 0.059968249025591856
      },
      {
        "t": 1794296944205.003,
        "elu": 0.020107479788206074
      },
      {
        "t": 1794296944706.1042,
        "elu": 0.04863764073273581
      },
      {
        "t": 1794296945207.462,
        "elu": 0.028266914957594407
      },
      {
        "t": 1794296945707.2039,
        "elu": 0.020208110242155568
      },
      {
        "t": 1794296946207.9277,
        "elu": 0.03137529310224393
      },
      {
        "t": 1794296946708.6484,
        "elu": 0.06396928251796408
      },
      {
        "t": 1794296947208.4373,
        "elu": 0.057861321584528516
      },
      {
        "t": 1794296947707.9546,
        "elu": 0.014690609502612148
      },
      {
        "t": 1794296948209.2996,
        "elu": 0.05451503216551959
      },
      {
        "t": 1794296948709.1047,
        "elu": 0.03751066344335548
      },
      {
        "t": 1794296949210.2095,
        "elu": 0.024262927932889502
      },
      {
        "t": 1794296949710.2134,
        "elu": 0.24369746803927336
      },
      {
        "t": 1794296950210.0784,
        "elu": 0.024918406090860105
      },
      {
        "t": 1794296950710.1003,
        "elu": 0.040472650233973104
      },
      {
        "t": 1794296951210.21,
        "elu": 0.06971945779177795
      },
      {
        "t": 1794296951711.5876,
        "elu": 0.022634733459079945
      },
      {
        "t": 1794296952211.0544,
        "elu": 0.025254233246153755
      },
      {
        "t": 1794296952711.7585,
        "elu": 0.04688823573243753
      },
      {
        "t": 1794296953211.9963,
        "elu": 0.019182032550653722
      },
      {
        "t": 1794296953713.2341,
        "elu": 0.0332171739041853
      },
      {
        "t": 1794296954213.0637,
        "elu": 0.03836328572384059
      },
      {
        "t": 1794296954713.1,
        "elu": 0.022562860005337082
      },
      {
        "t": 1794296955213.6248,
        "elu": 0.028817432549470317
      },
      {
        "t": 1794296955712.4954,
        "elu": 0.0419630865673396
      },
      {
        "t": 1794296956212.9658,
        "elu": 0.025666605301000033
      },
      {
        "t": 1794296956713.355,
        "elu": 0.04931145981309706
      },
      {
        "t": 1794296957212.9897,
        "elu": 0.021489225469143933
      },
      {
        "t": 1794296957713.6362,
        "elu": 0.23118202349465478
      },
      {
        "t": 1794296958213.4944,
        "elu": 0.030660928142629596
      },
      {
        "t": 1794296958713.2568,
        "elu": 0.034657558148995196
      },
      {
        "t": 1794296959215.1433,
        "elu": 0.1047637342184438
      },
      {
        "t": 1794296959714.9744,
        "elu": 0.03264934216724542
      },
      {
        "t": 1794296960215.9087,
        "elu": 0.021803948318810946
      },
      {
        "t": 1794296960717.5962,
        "elu": 0.026699989995440744
      },
      {
        "t": 1794296961220.1362,
        "elu": 0.029812060820197137
      },
      {
        "t": 1794296961720.5242,
        "elu": 0.034884796026527845
      },
      {
        "t": 1794296962220.4856,
        "elu": 0.041786378624790434
      },
      {
        "t": 1794296962723.6067,
        "elu": 0.02676336331642178
      },
      {
        "t": 1794296963223.3853,
        "elu": 0.24899337756254739
      },
      {
        "t": 1794296963724.0918,
        "elu": 0.03058305736823191
      },
      {
        "t": 1794296964225.9553,
        "elu": 0.04240185234537543
      },
      {
        "t": 1794296964727.7883,
        "elu": 0.05671445031478736
      },
      {
        "t": 1794296965228.5251,
        "elu": 0.03990279468827821
      },
      {
        "t": 1794296965730.1064,
        "elu": 0.041807273442985605
      },
      {
        "t": 1794296966231.9136,
        "elu": 0.05342020657899612
      },
      {
        "t": 1794296966732.8098,
        "elu": 0.06807062830597711
      },
      {
        "t": 1794296967233.0122,
        "elu": 0.029225755497115487
      },
      {
        "t": 1794296967733.662,
        "elu": 0.020149808573268733
      },
      {
        "t": 1794296968233.0996,
        "elu": 0.045750841668385084
      },
      {
        "t": 1794296968733.3452,
        "elu": 0.027454222323558566
      },
      {
        "t": 1794296969232.974,
        "elu": 0.033357548588776216
      },
      {
        "t": 1794296969733.3606,
        "elu": 0.043482603512020955
      },
      {
        "t": 1794296970233.673,
        "elu": 0.027083334665738295
      },
      {
        "t": 1794296970734.9502,
        "elu": 0.06006733288121308
      },
      {
        "t": 1794296971234.4675,
        "elu": 0.03241092650657061
      },
      {
        "t": 1794296971734.008,
        "elu": 0.037676471712016976
      },
      {
        "t": 1794296972234.9155,
        "elu": 0.03969994412562731
      },
      {
        "t": 1794296972736.0486,
        "elu": 0.04042275283709954
      },
      {
        "t": 1794296973238.6948,
        "elu": 0.04544841943505261
      },
      {
        "t": 1794296973739.9797,
        "elu": 0.04911572533521487
      },
      {
        "t": 1794296974240.0427,
        "elu": 0.039273611230189215
      },
      {
        "t": 1794296974740.2385,
        "elu": 0.040259348266413406
      },
      {
        "t": 1794296975240.371,
        "elu": 0.031220115630383932
      },
      {
        "t": 1794296975742.4036,
        "elu": 0.03394609030116337
      },
      {
        "t": 1794296976245.9473,
        "elu": 0.17319065784661208
      },
      {
        "t": 1794296976745.5686,
        "elu": 0.3377357808716953
      },
      {
        "t": 1794296977245.3909,
        "elu": 0.022571099989905502
      },
      {
        "t": 1794296977746.0645,
        "elu": 0.06277796128091258
      },
      {
        "t": 1794296978246.2048,
        "elu": 0.02960641898618384
      },
      {
        "t": 1794296978750.1755,
        "elu": 0.03798285218576931
      },
      {
        "t": 1794296979252.738,
        "elu": 0.24980249725843687
      },
      {
        "t": 1794296979756.2976,
        "elu": 0.2081359155155986
      },
      {
        "t": 1794296980259.7961,
        "elu": 0.24067026700761351
      },
      {
        "t": 1794296980759.3599,
        "elu": 0.2263219494030915
      },
      {
        "t": 1794296981264.1443,
        "elu": 0.22477167539960843
      },
      {
        "t": 1794296981764.3948,
        "elu": 0.21059889272751806
      },
      {
        "t": 1794296982264.899,
        "elu": 0.17779399563287257
      },
      {
        "t": 1794296982765.48,
        "elu": 0.22232532520038226
      },
      {
        "t": 1794296983266.4055,
        "elu": 0.1152641919394923
      },
      {
        "t": 1794296983766.7268,
        "elu": 0.19881734176064816
      },
      {
        "t": 1794296984267.2222,
        "elu": 0.17525235334739261
      },
      {
        "t": 1794296984767.3066,
        "elu": 0.22551089451999615
      },
      {
        "t": 1794296985270.0654,
        "elu": 0.19809122831371523
      },
      {
        "t": 1794296985770.6182,
        "elu": 0.16570570614401245
      },
      {
        "t": 1794296986271.003,
        "elu": 0.2470865674868529
      },
      {
        "t": 1794296986772.738,
        "elu": 0.19479300721981999
      },
      {
        "t": 1794296987273.1196,
        "elu": 0.2508657473731189
      },
      {
        "t": 1794296987774.2217,
        "elu": 0.17808529167993237
      },
      {
        "t": 1794296988274.9219,
        "elu": 0.17732046232396176
      },
      {
        "t": 1794296988776.078,
        "elu": 0.20820040869517112
      },
      {
        "t": 1794296989276.4326,
        "elu": 0.13020249089517402
      },
      {
        "t": 1794296989777.223,
        "elu": 0.1339682870735484
      },
      {
        "t": 1794296990278.8955,
        "elu": 0.1743020759852025
      },
      {
        "t": 1794296990778.9365,
        "elu": 0.2194572296451016
      },
      {
        "t": 1794296991279.105,
        "elu": 0.1430080207391144
      },
      {
        "t": 1794296991779.4314,
        "elu": 0.10924286148197107
      },
      {
        "t": 1794296992280.1052,
        "elu": 0.14208108577287445
      },
      {
        "t": 1794296992780.2876,
        "elu": 0.19230332046105633
      },
      {
        "t": 1794296993282.048,
        "elu": 0.17554869901274617
      },
      {
        "t": 1794296993783.0872,
        "elu": 0.19222626373180482
      },
      {
        "t": 1794296994284.1228,
        "elu": 0.380046357135302
      },
      {
        "t": 1794296994784.7666,
        "elu": 0.3374445200679628
      },
      {
        "t": 1794296995284.6072,
        "elu": 0.303639025134454
      },
      {
        "t": 1794296995784.0715,
        "elu": 0.3429604492289078
      },
      {
        "t": 1794296996284.743,
        "elu": 0.27197767613452
      },
      {
        "t": 1794296996786.952,
        "elu": 0.2810326325962085
      },
      {
        "t": 1794296997288.566,
        "elu": 0.4240626230132996
      },
      {
        "t": 1794296997788.028,
        "elu": 0.3606693175968785
      },
      {
        "t": 1794296998288.3018,
        "elu": 0.27600585739646327
      },
      {
        "t": 1794296998788.9248,
        "elu": 0.2552135240698122
      },
      {
        "t": 1794296999289.113,
        "elu": 0.26742283930458743
      },
      {
        "t": 1794296999790.4065,
        "elu": 0.2579960181306535
      },
      {
        "t": 1794297000292.9392,
        "elu": 0.23074747376273572
      },
      {
        "t": 1794297000797.2004,
        "elu": 0.28505437638223324
      },
      {
        "t": 1794297001324.6677,
        "elu": 0.3449954221646219
      },
      {
        "t": 1794297001823.9172,
        "elu": 0.32378946271900655
      },
      {
        "t": 1794297002325.984,
        "elu": 0.2521703643881881
      },
      {
        "t": 1794297002826.2317,
        "elu": 0.2882200263280928
      },
      {
        "t": 1794297003325.9487,
        "elu": 0.46009975952152765
      },
      {
        "t": 1794297003826.7761,
        "elu": 0.36389942598756425
      },
      {
        "t": 1794297004329.2036,
        "elu": 0.21033415932708308
      },
      {
        "t": 1794297004829.066,
        "elu": 0.4035046343836676
      },
      {
        "t": 1794297005329.3206,
        "elu": 0.315032045480231
      },
      {
        "t": 1794297005835.533,
        "elu": 0.40712264185708286
      },
      {
        "t": 1794297006335.4124,
        "elu": 0.37412967415661424
      },
      {
        "t": 1794297006835.7812,
        "elu": 0.24043426581026875
      },
      {
        "t": 1794297007335.7798,
        "elu": 0.27936963464293607
      },
      {
        "t": 1794297007835.081,
        "elu": 0.3658088356561893
      },
      {
        "t": 1794297008335.597,
        "elu": 0.25808292561522456
      },
      {
        "t": 1794297008834.9863,
        "elu": 0.4131856509435504
      },
      {
        "t": 1794297009340.1772,
        "elu": 0.2373788074737326
      },
      {
        "t": 1794297009838.9207,
        "elu": 0.35783053178563623
      },
      {
        "t": 1794297010340.4692,
        "elu": 0.4135512596313938
      },
      {
        "t": 1794297010840.7373,
        "elu": 0.31057663656217627
      },
      {
        "t": 1794297011341.0552,
        "elu": 0.34490963166589145
      },
      {
        "t": 1794297011842.7156,
        "elu": 0.24892204410039612
      },
      {
        "t": 1794297012342.9463,
        "elu": 0.520278011248703
      },
      {
        "t": 1794297012846.3083,
        "elu": 0.3819350664460173
      },
      {
        "t": 1794297013347.1936,
        "elu": 0.31316393818537946
      },
      {
        "t": 1794297013849.9666,
        "elu": 0.40032975428537204
      },
      {
        "t": 1794297014358.7244,
        "elu": 0.40811311251623644
      },
      {
        "t": 1794297014859.1436,
        "elu": 0.3709834228124065
      },
      {
        "t": 1794297015359.6423,
        "elu": 0.4017356252196685
      },
      {
        "t": 1794297015859.3162,
        "elu": 0.32929498322092987
      },
      {
        "t": 1794297016365.1936,
        "elu": 0.49953384319568445
      },
      {
        "t": 1794297016866.4712,
        "elu": 0.30514320498542985
      },
      {
        "t": 1794297017365.9504,
        "elu": 0.23619080433446527
      },
      {
        "t": 1794297017866.9014,
        "elu": 0.232186526085687
      },
      {
        "t": 1794297018366.9187,
        "elu": 0.3227796900918159
      },
      {
        "t": 1794297018868.5483,
        "elu": 0.26882657028388307
      },
      {
        "t": 1794297019371.1003,
        "elu": 0.3778441124857294
      },
      {
        "t": 1794297019871.5332,
        "elu": 0.2781370119825697
      },
      {
        "t": 1794297020371.8325,
        "elu": 0.3078647702400421
      },
      {
        "t": 1794297020875.1577,
        "elu": 0.466608967258826
      },
      {
        "t": 1794297021375.0842,
        "elu": 0.4441698857133195
      },
      {
        "t": 1794297021875.4966,
        "elu": 0.39484738893459775
      },
      {
        "t": 1794297022375.6106,
        "elu": 0.41694409753358613
      },
      {
        "t": 1794297022876.2524,
        "elu": 0.20731626135332343
      },
      {
        "t": 1794297023380.9229,
        "elu": 0.29627819592876525
      },
      {
        "t": 1794297023881.5696,
        "elu": 0.37515086181691315
      },
      {
        "t": 1794297024391.441,
        "elu": 0.36480051836642674
      },
      {
        "t": 1794297024892.2537,
        "elu": 0.5879167948743911
      },
      {
        "t": 1794297025394.9495,
        "elu": 0.4305605594322535
      },
      {
        "t": 1794297025897.342,
        "elu": 0.3442591801819831
      },
      {
        "t": 1794297026397.744,
        "elu": 0.4058099208277005
      },
      {
        "t": 1794297026900.6855,
        "elu": 0.38432783273111143
      },
      {
        "t": 1794297027400.353,
        "elu": 0.49505209971891895
      },
      {
        "t": 1794297027904.3716,
        "elu": 0.41542356588540197
      },
      {
        "t": 1794297028404.3228,
        "elu": 0.42884306642604814
      },
      {
        "t": 1794297028904.801,
        "elu": 0.31818438425235135
      },
      {
        "t": 1794297029404.4065,
        "elu": 0.3346977180711934
      },
      {
        "t": 1794297029906.701,
        "elu": 0.25573650725854885
      },
      {
        "t": 1794297030406.1445,
        "elu": 0.3172938362496567
      },
      {
        "t": 1794297030906.5378,
        "elu": 0.4292037911048456
      },
      {
        "t": 1794297031407.3022,
        "elu": 0.3227279148532933
      },
      {
        "t": 1794297031907.423,
        "elu": 0.47262769616984635
      },
      {
        "t": 1794297032407.008,
        "elu": 0.32801723724606063
      },
      {
        "t": 1794297032910.2979,
        "elu": 0.38784945623410044
      },
      {
        "t": 1794297033410.7222,
        "elu": 0.4558550528972623
      },
      {
        "t": 1794297033910.043,
        "elu": 0.3154909863596319
      },
      {
        "t": 1794297034410.6543,
        "elu": 0.38483837966693346
      },
      {
        "t": 1794297034910.2239,
        "elu": 0.26120987804110635
      },
      {
        "t": 1794297035410.7043,
        "elu": 0.27890442092541967
      },
      {
        "t": 1794297035921.8657,
        "elu": 0.6273496379874542
      },
      {
        "t": 1794297036426.1074,
        "elu": 0.9050738624553045
      },
      {
        "t": 1794297036930.385,
        "elu": 0.389805857753745
      },
      {
        "t": 1794297037430.482,
        "elu": 0.35236199550366665
      },
      {
        "t": 1794297037930.2314,
        "elu": 0.26760089619138605
      },
      {
        "t": 1794297038432.3936,
        "elu": 0.39334909518381456
      },
      {
        "t": 1794297038932.9163,
        "elu": 0.21824214085751045
      },
      {
        "t": 1794297039433.9446,
        "elu": 0.05613721713553052
      },
      {
        "t": 1794297039935.071,
        "elu": 0.07935735286812384
      },
      {
        "t": 1794297040436.0132,
        "elu": 0.05180892738846808
      },
      {
        "t": 1794297040936.8,
        "elu": 0.05173060496622526
      },
      {
        "t": 1794297041436.8335,
        "elu": 0.04646420721974823
      },
      {
        "t": 1794297041936.6975,
        "elu": 0.07003452907602067
      },
      {
        "t": 1794297042436.969,
        "elu": 0.07831129362103055
      },
      {
        "t": 1794297042937.9429,
        "elu": 0.04226553507720219
      },
      {
        "t": 1794297043439.8416,
        "elu": 0.0655983271708354
      },
      {
        "t": 1794297043939.8647,
        "elu": 0.047905048280491906
      },
      {
        "t": 1794297044439.65,
        "elu": 0.08678101535800666
      },
      {
        "t": 1794297044939.7705,
        "elu": 0.07295904305589213
      },
      {
        "t": 1794297045441.9592,
        "elu": 0.040649580625473435
      },
      {
        "t": 1794297045945.5059,
        "elu": 0.08113511805431578
      },
      {
        "t": 1794297046445.2336,
        "elu": 0.08460855562048289
      },
      {
        "t": 1794297046946.9219,
        "elu": 0.03441558104663735
      },
      {
        "t": 1794297047447.2563,
        "elu": 0.06427263768709124
      },
      {
        "t": 1794297047947.4841,
        "elu": 0.032913054649162284
      },
      {
        "t": 1794297048447.332,
        "elu": 0.05724215961293719
      },
      {
        "t": 1794297048947.626,
        "elu": 0.04613804969729435
      },
      {
        "t": 1794297049448.1343,
        "elu": 0.06312148964855349
      },
      {
        "t": 1794297049949.206,
        "elu": 0.03767518723447102
      },
      {
        "t": 1794297050450.8093,
        "elu": 0.03484876430150518
      },
      {
        "t": 1794297050950.071,
        "elu": 0.08628665090672566
      },
      {
        "t": 1794297051451.2231,
        "elu": 0.080381640375939
      },
      {
        "t": 1794297051952.9324,
        "elu": 0.059270683218538005
      },
      {
        "t": 1794297052454.3086,
        "elu": 0.07018693074742591
      },
      {
        "t": 1794297052954.9165,
        "elu": 0.054711107761860604
      },
      {
        "t": 1794297053455.1858,
        "elu": 0.08381093158099573
      },
      {
        "t": 1794297053955.8215,
        "elu": 0.058521770416274495
      },
      {
        "t": 1794297054455.2947,
        "elu": 0.04085339393399376
      },
      {
        "t": 1794297054955.961,
        "elu": 0.055863552936405034
      },
      {
        "t": 1794297055455.9668,
        "elu": 0.050834734997188026
      },
      {
        "t": 1794297055957.2058,
        "elu": 0.043024434558352274
      },
      {
        "t": 1794297056469.909,
        "elu": 0.06786040275482948
      },
      {
        "t": 1794297056971.5698,
        "elu": 0.08335639409432148
      },
      {
        "t": 1794297057471.7302,
        "elu": 0.06403909113594577
      },
      {
        "t": 1794297057971.1934,
        "elu": 0.05626712241858348
      },
      {
        "t": 1794297058471.6267,
        "elu": 0.05591004283956508
      },
      {
        "t": 1794297058971.4868,
        "elu": 0.06507582806160658
      },
      {
        "t": 1794297059472.1443,
        "elu": 0.03967998597120516
      },
      {
        "t": 1794297059973.963,
        "elu": 0.05101206120965478
      },
      {
        "t": 1794297060474.2512,
        "elu": 0.0495237118991593
      },
      {
        "t": 1794297060974.9524,
        "elu": 0.04198596311427254
      },
      {
        "t": 1794297061475.6921,
        "elu": 0.05715704425891544
      },
      {
        "t": 1794297061975.7515,
        "elu": 0.11425408548200684
      },
      {
        "t": 1794297062475.507,
        "elu": 0.06501778577672092
      },
      {
        "t": 1794297062974.9028,
        "elu": 0.05998119695370527
      },
      {
        "t": 1794297063478.709,
        "elu": 0.0671820402599744
      },
      {
        "t": 1794297063979.3792,
        "elu": 0.07123643375020867
      },
      {
        "t": 1794297064480.1602,
        "elu": 0.03811711435608824
      },
      {
        "t": 1794297064981.5498,
        "elu": 0.06484094038861261
      },
      {
        "t": 1794297065481.821,
        "elu": 0.035798644699595775
      },
      {
        "t": 1794297065982.5186,
        "elu": 0.044704302329234384
      },
      {
        "t": 1794297066482.1812,
        "elu": 0.07328090265690172
      },
      {
        "t": 1794297066982.4604,
        "elu": 0.026112337513754903
      },
      {
        "t": 1794297067483.3157,
        "elu": 0.036608910573896945
      },
      {
        "t": 1794297067983.2952,
        "elu": 0.07199442762452911
      },
      {
        "t": 1794297068483.3416,
        "elu": 0.05479767965539308
      },
      {
        "t": 1794297068982.9294,
        "elu": 0.0783023851677766
      },
      {
        "t": 1794297069483.1626,
        "elu": 0.04293225509688112
      },
      {
        "t": 1794297069984.8875,
        "elu": 0.09854569395458256
      },
      {
        "t": 1794297070484.9355,
        "elu": 0.044209314869380734
      },
      {
        "t": 1794297070985.3616,
        "elu": 0.06986853720598263
      },
      {
        "t": 1794297071485.3066,
        "elu": 0.08756548186768175
      },
      {
        "t": 1794297071985.6323,
        "elu": 0.07304048639876398
      },
      {
        "t": 1794297072485.0059,
        "elu": 0.07024080405710066
      },
      {
        "t": 1794297072986.9565,
        "elu": 0.036338416988369454
      },
      {
        "t": 1794297073487.7893,
        "elu": 0.06945249520149083
      },
      {
        "t": 1794297073986.9797,
        "elu": 0.06290916526963844
      },
      {
        "t": 1794297074487.1807,
        "elu": 0.05180847044972043
      },
      {
        "t": 1794297074987.3096,
        "elu": 0.07668916650158968
      },
      {
        "t": 1794297075486.9739,
        "elu": 0.0800216544357883
      },
      {
        "t": 1794297075988.008,
        "elu": 0.05827224750259479
      },
      {
        "t": 1794297076488.1243,
        "elu": 0.0691087550906044
      },
      {
        "t": 1794297076988.1106,
        "elu": 0.07622392577620395
      },
      {
        "t": 1794297077488.6028,
        "elu": 0.041174706909496886
      },
      {
        "t": 1794297077988.6318,
        "elu": 0.07174856846892563
      },
      {
        "t": 1794297078487.939,
        "elu": 0.05016641327180357
      },
      {
        "t": 1794297078988.917,
        "elu": 0.09392230324893316
      },
      {
        "t": 1794297079489.6133,
        "elu": 0.05951318219253304
      },
      {
        "t": 1794297079988.9553,
        "elu": 0.05166319595578591
      },
      {
        "t": 1794297080490.7031,
        "elu": 0.05535489777077923
      },
      {
        "t": 1794297080991.235,
        "elu": 0.07199591282028209
      },
      {
        "t": 1794297081491.5159,
        "elu": 0.04734114268679392
      },
      {
        "t": 1794297081991.849,
        "elu": 0.07202792562525942
      },
      {
        "t": 1794297082491.1516,
        "elu": 0.04684812349610288
      },
      {
        "t": 1794297082991.8127,
        "elu": 0.06621517314563304
      },
      {
        "t": 1794297083492.0906,
        "elu": 0.055075612477908646
      },
      {
        "t": 1794297083991.9575,
        "elu": 0.07505576895358725
      },
      {
        "t": 1794297084493.2573,
        "elu": 0.045010252170824785
      },
      {
        "t": 1794297084996.5066,
        "elu": 0.049357735239460514
      },
      {
        "t": 1794297085497.965,
        "elu": 0.04690281668565866
      },
      {
        "t": 1794297085998.4685,
        "elu": 0.06537239188570916
      },
      {
        "t": 1794297086498.023,
        "elu": 0.0652823419176032
      },
      {
        "t": 1794297086997.927,
        "elu": 0.057618937849478004
      },
      {
        "t": 1794297087498.6753,
        "elu": 0.035712076592109704
      },
      {
        "t": 1794297087999.1372,
        "elu": 0.0811949791515498
      },
      {
        "t": 1794297088499.6484,
        "elu": 0.040360086521115196
      },
      {
        "t": 1794297089003.9517,
        "elu": 0.08453228077227562
      },
      {
        "t": 1794297089504.271,
        "elu": 0.0626972380208913
      },
      {
        "t": 1794297090009.6892,
        "elu": 0.06606278726964745
      },
      {
        "t": 1794297090511.4446,
        "elu": 0.038433810957965005
      },
      {
        "t": 1794297091012.4255,
        "elu": 0.04424591897220951
      },
      {
        "t": 1794297091513.1086,
        "elu": 0.03628087666449423
      },
      {
        "t": 1794297092013.2224,
        "elu": 0.05676745643699897
      },
      {
        "t": 1794297092513.1023,
        "elu": 0.03276203602178926
      },
      {
        "t": 1794297093014.1433,
        "elu": 0.07650662766675154
      },
      {
        "t": 1794297093515.8352,
        "elu": 0.04034148604641027
      },
      {
        "t": 1794297094015.431,
        "elu": 0.09211119381243832
      },
      {
        "t": 1794297094515.5576,
        "elu": 0.057077507788415215
      },
      {
        "t": 1794297095015.4749,
        "elu": 0.040837049435636354
      },
      {
        "t": 1794297095515.0125,
        "elu": 0.053715164665799495
      },
      {
        "t": 1794297096016.9937,
        "elu": 0.0834836296404768
      },
      {
        "t": 1794297096517.51,
        "elu": 0.03481146468226432
      },
      {
        "t": 1794297097018.4822,
        "elu": 0.06904545162937585
      },
      {
        "t": 1794297097518.327,
        "elu": 0.05184887606329916
      },
      {
        "t": 1794297098020.3835,
        "elu": 0.04245213375072144
      },
      {
        "t": 1794297098520.3904,
        "elu": 0.05640044236817962
      },
      {
        "t": 1794297099020.5554,
        "elu": 0.05665771280820458
      },
      {
        "t": 1794297099520.8315,
        "elu": 0.03443444359817294
      },
      {
        "t": 1794297100020.2087,
        "elu": 0.08531748566051021
      },
      {
        "t": 1794297100521.532,
        "elu": 0.03743779640952117
      },
      {
        "t": 1794297101021.433,
        "elu": 0.09729381299585578
      },
      {
        "t": 1794297101521.6116,
        "elu": 0.06444365514711814
      },
      {
        "t": 1794297102021.597,
        "elu": 0.03691743185402804
      },
      {
        "t": 1794297102521.8142,
        "elu": 0.05415481425380469
      },
      {
        "t": 1794297103021.0503,
        "elu": 0.03517116341763056
      },
      {
        "t": 1794297103521.818,
        "elu": 0.03528076686178479
      },
      {
        "t": 1794297104021.4773,
        "elu": 0.050176364522722165
      },
      {
        "t": 1794297104521.5784,
        "elu": 0.07776413994550262
      },
      {
        "t": 1794297105021.0305,
        "elu": 0.06088940278069666
      },
      {
        "t": 1794297105521.39,
        "elu": 0.05381275910993307
      },
      {
        "t": 1794297106022.6355,
        "elu": 0.09808056170913132
      },
      {
        "t": 1794297106523.7026,
        "elu": 0.05493071828283604
      },
      {
        "t": 1794297107024.131,
        "elu": 0.03246010782784926
      },
      {
        "t": 1794297107525.2717,
        "elu": 0.08039910720482688
      },
      {
        "t": 1794297108025.9956,
        "elu": 0.04751734756147213
      },
      {
        "t": 1794297108526.5273,
        "elu": 0.04762336693656761
      },
      {
        "t": 1794297109026.659,
        "elu": 0.056962101639317995
      },
      {
        "t": 1794297109526.4348,
        "elu": 0.05322277236397195
      },
      {
        "t": 1794297110027.3486,
        "elu": 0.0678203272774707
      },
      {
        "t": 1794297110527.9932,
        "elu": 0.060195255697001876
      },
      {
        "t": 1794297111028.9604,
        "elu": 0.054036419271031186
      },
      {
        "t": 1794297111529.5325,
        "elu": 0.10968810140790312
      },
      {
        "t": 1794297112030.0205,
        "elu": 0.07329397203592494
      },
      {
        "t": 1794297112531.0496,
        "elu": 0.059191729423228055
      },
      {
        "t": 1794297113032.3162,
        "elu": 0.05263689034893249
      },
      {
        "t": 1794297113532.1675,
        "elu": 0.07309088154270536
      },
      {
        "t": 1794297114032.927,
        "elu": 0.02849780035143057
      },
      {
        "t": 1794297114535.0881,
        "elu": 0.03561125376857441
      },
      {
        "t": 1794297115036.103,
        "elu": 0.028488035837738075
      },
      {
        "t": 1794297115536.856,
        "elu": 0.037143985062928174
      },
      {
        "t": 1794297116036.9822,
        "elu": 0.03277114731760472
      },
      {
        "t": 1794297116537.9294,
        "elu": 0.029447027845651383
      },
      {
        "t": 1794297117038.3853,
        "elu": 0.03526542801093612
      },
      {
        "t": 1794297117544.4685,
        "elu": 0.0259821233384667
      },
      {
        "t": 1794297118047.999,
        "elu": 0.030947855692269242
      },
      {
        "t": 1794297118549.2761,
        "elu": 0.03864392238611044
      },
      {
        "t": 1794297119050.2124,
        "elu": 0.031083061800366265
      },
      {
        "t": 1794297119554.9763,
        "elu": 0.021658348315888767
      },
      {
        "t": 1794297120056.9485,
        "elu": 0.03636052238790242
      },
      {
        "t": 1794297120558.5845,
        "elu": 0.021818955723073723
      },
      {
        "t": 1794297121059.9424,
        "elu": 0.023457284202463274
      },
      {
        "t": 1794297121561.2268,
        "elu": 0.022485379120968978
      },
      {
        "t": 1794297122061.7595,
        "elu": 0.03022477023279493
      },
      {
        "t": 1794297122565.0151,
        "elu": 0.022895033166893963
      },
      {
        "t": 1794297123066.5103,
        "elu": 0.0423296657031842
      },
      {
        "t": 1794297123567.1035,
        "elu": 0.028059682934397975
      },
      {
        "t": 1794297124070.9795,
        "elu": 0.023075558585557616
      },
      {
        "t": 1794297124572.4028,
        "elu": 0.029052686926249294
      },
      {
        "t": 1794297125072.5334,
        "elu": 0.02388449678997295
      },
      {
        "t": 1794297125575.1985,
        "elu": 0.022511681413663023
      },
      {
        "t": 1794297126080.619,
        "elu": 0.0316989617180341
      },
      {
        "t": 1794297126580.9626,
        "elu": 0.031657309611529155
      },
      {
        "t": 1794297127081.0574,
        "elu": 0.02361379310395759
      },
      {
        "t": 1794297127580.8367,
        "elu": 0.029321658110369877
      },
      {
        "t": 1794297128082.2834,
        "elu": 0.02319595840425314
      },
      {
        "t": 1794297128584.116,
        "elu": 0.7334038080391976
      },
      {
        "t": 1794297129085.0833,
        "elu": 0.03868587539442688
      },
      {
        "t": 1794297129586.1392,
        "elu": 0.04098161711841422
      },
      {
        "t": 1794297130087.93,
        "elu": 0.038512894830619
      },
      {
        "t": 1794297130588.857,
        "elu": 0.043242892263509254
      },
      {
        "t": 1794297131087.962,
        "elu": 0.02633583797290718
      },
      {
        "t": 1794297131592.3738,
        "elu": 0.0302101445148826
      },
      {
        "t": 1794297132093.96,
        "elu": 0.03964428180930074
      },
      {
        "t": 1794297132595.008,
        "elu": 0.0485667400142235
      },
      {
        "t": 1794297133096.1023,
        "elu": 0.023616407531515882
      },
      {
        "t": 1794297133596.9487,
        "elu": 0.03196106564671278
      },
      {
        "t": 1794297134103.0437,
        "elu": 0.023740609822872585
      },
      {
        "t": 1794297134606.0034,
        "elu": 0.03412594376373505
      },
      {
        "t": 1794297135108.3792,
        "elu": 0.032883903783299764
      },
      {
        "t": 1794297135608.7786,
        "elu": 0.018851459061161126
      },
      {
        "t": 1794297136111.8445,
        "elu": 0.03309396236216242
      },
      {
        "t": 1794297136611.2097,
        "elu": 0.05393722039463859
      },
      {
        "t": 1794297137112.1897,
        "elu": 0.024405610870824913
      },
      {
        "t": 1794297137614.9685,
        "elu": 0.02247388368088431
      },
      {
        "t": 1794297138116.085,
        "elu": 0.03435430211502652
      },
      {
        "t": 1794297138617.9587,
        "elu": 0.029190144518166823
      },
      {
        "t": 1794297139117.9453,
        "elu": 0.027693707547551138
      },
      {
        "t": 1794297139619.005,
        "elu": 0.03455247456864721
      },
      {
        "t": 1794297140126.658,
        "elu": 0.02310544442322067
      },
      {
        "t": 1794297140626.981,
        "elu": 0.028809891401228648
      },
      {
        "t": 1794297141127.1228,
        "elu": 0.03109076287402567
      },
      {
        "t": 1794297141628.042,
        "elu": 0.02743820123303075
      },
      {
        "t": 1794297142129.1426,
        "elu": 0.03160475773816387
      },
      {
        "t": 1794297142630.0945,
        "elu": 0.030269102950063582
      },
      {
        "t": 1794297143131.3833,
        "elu": 0.02380722715691734
      },
      {
        "t": 1794297143631.9487,
        "elu": 0.022888683361327964
      },
      {
        "t": 1794297144133.1648,
        "elu": 0.03182919845978415
      },
      {
        "t": 1794297144634.042,
        "elu": 0.024265190888224885
      },
      {
        "t": 1794297145136.098,
        "elu": 0.03256959766406707
      },
      {
        "t": 1794297145637.3484,
        "elu": 0.03397052154776388
      },
      {
        "t": 1794297146139.3833,
        "elu": 0.025124158261170315
      },
      {
        "t": 1794297146639.1865,
        "elu": 0.027065523877657538
      },
      {
        "t": 1794297147139.924,
        "elu": 0.02702819935418585
      },
      {
        "t": 1794297147640.6848,
        "elu": 0.03717202920085491
      },
      {
        "t": 1794297148140.606,
        "elu": 0.030439540940404696
      },
      {
        "t": 1794297148640.9258,
        "elu": 0.02627665157159857
      },
      {
        "t": 1794297149142.3008,
        "elu": 0.039934834654951096
      },
      {
        "t": 1794297149644.3184,
        "elu": 0.037654000731246175
      },
      {
        "t": 1794297150144.5103,
        "elu": 0.0389780258077009
      },
      {
        "t": 1794297150646.7703,
        "elu": 0.029640733737816165
      },
      {
        "t": 1794297151146.9077,
        "elu": 0.04578187806491643
      },
      {
        "t": 1794297151647.2373,
        "elu": 0.021835917685435156
      },
      {
        "t": 1794297152148.1584,
        "elu": 0.02376265413781214
      },
      {
        "t": 1794297152649.28,
        "elu": 0.03438090659056572
      },
      {
        "t": 1794297153150.0342,
        "elu": 0.02283237502783491
      },
      {
        "t": 1794297153653.072,
        "elu": 0.029596863968397363
      },
      {
        "t": 1794297154153.9475,
        "elu": 0.04394277723223518
      },
      {
        "t": 1794297154655.071,
        "elu": 0.022715400559542936
      },
      {
        "t": 1794297155160.617,
        "elu": 0.04390922363320123
      },
      {
        "t": 1794297155660.1804,
        "elu": 0.020911011238828672
      },
      {
        "t": 1794297156161.4578,
        "elu": 0.023369262090279584
      },
      {
        "t": 1794297156662.0364,
        "elu": 0.02331420936450837
      },
      {
        "t": 1794297157163.915,
        "elu": 0.038084119067005213
      },
      {
        "t": 1794297157671.0508,
        "elu": 0.03012158319352642
      },
      {
        "t": 1794297158173.1536,
        "elu": 0.038280295464998844
      },
      {
        "t": 1794297158674.9575,
        "elu": 0.03303090221460235
      },
      {
        "t": 1794297159175.1812,
        "elu": 0.02312878327938293
      },
      {
        "t": 1794297159677.0479,
        "elu": 0.032081309567835475
      },
      {
        "t": 1794297160179.1199,
        "elu": 0.023342382818986006
      },
      {
        "t": 1794297160679.471,
        "elu": 0.022678607739218235
      },
      {
        "t": 1794297161179.9026,
        "elu": 0.0322276934156226
      },
      {
        "t": 1794297161679.2744,
        "elu": 0.033366496326826055
      },
      {
        "t": 1794297162179.9968,
        "elu": 0.02924858645873243
      },
      {
        "t": 1794297162680.9277,
        "elu": 0.03366712338294188
      },
      {
        "t": 1794297163182.949,
        "elu": 0.02203170985956609
      },
      {
        "t": 1794297163691.7349,
        "elu": 0.022700538824979688
      },
      {
        "t": 1794297164194.489,
        "elu": 0.039855329502542426
      },
      {
        "t": 1794297164702.447,
        "elu": 0.030195263862725218
      },
      {
        "t": 1794297165202.4297,
        "elu": 0.019301093435661578
      },
      {
        "t": 1794297165704.024,
        "elu": 0.04177496402602938
      },
      {
        "t": 1794297166205.9739,
        "elu": 0.03803669967663876
      },
      {
        "t": 1794297166712.947,
        "elu": 0.03233505359216859
      },
      {
        "t": 1794297167213.924,
        "elu": 0.02925226149862244
      },
      {
        "t": 1794297167715.1284,
        "elu": 0.042066980119685154
      },
      {
        "t": 1794297168216.9128,
        "elu": 0.02378774455183925
      },
      {
        "t": 1794297168725.2388,
        "elu": 0.02776131817242677
      },
      {
        "t": 1794297169228.3037,
        "elu": 0.03179688300708859
      },
      {
        "t": 1794297169732.4436,
        "elu": 0.023533971959542738
      },
      {
        "t": 1794297170232.2178,
        "elu": 0.031279635672081155
      },
      {
        "t": 1794297170731.9167,
        "elu": 0.5257022860301307
      },
      {
        "t": 1794297171232.6147,
        "elu": 0.1976156609271514
      },
      {
        "t": 1794297171734.0215,
        "elu": 0.03469965992438196
      },
      {
        "t": 1794297172239.5576,
        "elu": 0.034065950152253215
      },
      {
        "t": 1794297172740.9302,
        "elu": 0.038111562563324534
      },
      {
        "t": 1794297173241.226,
        "elu": 0.03580589644120838
      },
      {
        "t": 1794297173751.958,
        "elu": 0.03325946676632247
      },
      {
        "t": 1794297174253.1646,
        "elu": 0.030197436702564504
      },
      {
        "t": 1794297174754.2954,
        "elu": 0.029615911331228956
      },
      {
        "t": 1794297175255.0854,
        "elu": 0.03715042062410258
      },
      {
        "t": 1794297175756.5796,
        "elu": 0.023841787546704997
      },
      {
        "t": 1794297176256.2761,
        "elu": 0.023847577322774368
      },
      {
        "t": 1794297176766.6074,
        "elu": 0.15245653158398922
      },
      {
        "t": 1794297177281.3123,
        "elu": 0.18750729635368024
      },
      {
        "t": 1794297177782.6624,
        "elu": 0.1126902000506981
      },
      {
        "t": 1794297178284.1943,
        "elu": 0.017969228158454663
      },
      {
        "t": 1794297178794.5183,
        "elu": 0.028931370249345147
      },
      {
        "t": 1794297179301.2268,
        "elu": 0.0319576812389954
      },
      {
        "t": 1794297179808.8276,
        "elu": 0.022617457129089365
      },
      {
        "t": 1794297180317.1162,
        "elu": 0.11504682977647218
      },
      {
        "t": 1794297180817.193,
        "elu": 0.050315309371817635
      },
      {
        "t": 1794297181318.4045,
        "elu": 0.030475164891599973
      },
      {
        "t": 1794297181819.0457,
        "elu": 0.03306925000912688
      },
      {
        "t": 1794297182321.0603,
        "elu": 0.031219445543330077
      },
      {
        "t": 1794297182821.702,
        "elu": 0.027548774925295123
      },
      {
        "t": 1794297183321.0232,
        "elu": 0.037117921534382446
      },
      {
        "t": 1794297183821.2996,
        "elu": 0.03434458183143348
      },
      {
        "t": 1794297184322.0928,
        "elu": 0.024491180675893526
      },
      {
        "t": 1794297184828.8354,
        "elu": 0.0239161789616762
      },
      {
        "t": 1794297185328.9285,
        "elu": 0.038968201582047515
      },
      {
        "t": 1794297185829.9016,
        "elu": 0.024398600440601447
      },
      {
        "t": 1794297186330.0647,
        "elu": 0.02540177500689557
      },
      {
        "t": 1794297186831.4214,
        "elu": 0.031677612342891466
      },
      {
        "t": 1794297187330.9712,
        "elu": 0.02328414314673876
      },
      {
        "t": 1794297187834.7725,
        "elu": 0.02290977900769567
      },
      {
        "t": 1794297188335.5515,
        "elu": 0.03193532920622624
      },
      {
        "t": 1794297188836.0745,
        "elu": 0.028390040430605445
      },
      {
        "t": 1794297189342.9592,
        "elu": 0.03012434023094751
      },
      {
        "t": 1794297189844.938,
        "elu": 0.030188587283035802
      },
      {
        "t": 1794297190346.9414,
        "elu": 0.023300519434886396
      },
      {
        "t": 1794297190847.306,
        "elu": 0.019304022063760952
      },
      {
        "t": 1794297191347.0886,
        "elu": 0.039132884446159144
      },
      {
        "t": 1794297191848.0105,
        "elu": 0.022786369790658106
      },
      {
        "t": 1794297192349.1611,
        "elu": 0.04933616458476378
      },
      {
        "t": 1794297192850.8936,
        "elu": 0.029472970180122224
      },
      {
        "t": 1794297193350.5122,
        "elu": 0.035693322650792614
      },
      {
        "t": 1794297193853.2434,
        "elu": 0.04244651587330748
      },
      {
        "t": 1794297194355.688,
        "elu": 0.02387411001098968
      },
      {
        "t": 1794297194860.3276,
        "elu": 0.03079618110208301
      },
      {
        "t": 1794297195360.4038,
        "elu": 0.04565577003570457
      },
      {
        "t": 1794297195862.4094,
        "elu": 0.02940602930754931
      },
      {
        "t": 1794297196362.995,
        "elu": 0.04033678550151485
      },
      {
        "t": 1794297196864.8657,
        "elu": 0.02393622915775051
      },
      {
        "t": 1794297197364.9495,
        "elu": 0.033806879727498886
      },
      {
        "t": 1794297197865.5583,
        "elu": 0.0226071597873072
      },
      {
        "t": 1794297198367.7964,
        "elu": 0.04528977808144051
      },
      {
        "t": 1794297198868.5671,
        "elu": 0.0334266859584285
      },
      {
        "t": 1794297199368.9348,
        "elu": 0.028861258554295468
      },
      {
        "t": 1794297199870.0215,
        "elu": 0.03821218368389974
      },
      {
        "t": 1794297200370.9626,
        "elu": 0.03748990946961538
      },
      {
        "t": 1794297200871.8025,
        "elu": 0.045961269276688546
      },
      {
        "t": 1794297201371.1096,
        "elu": 0.029669716529626165
      },
      {
        "t": 1794297201874.18,
        "elu": 0.039115435551818775
      },
      {
        "t": 1794297202375.1133,
        "elu": 0.023515386427123492
      },
      {
        "t": 1794297202876.3186,
        "elu": 0.036358750396526175
      },
      {
        "t": 1794297203376.9885,
        "elu": 0.030102272568778253
      },
      {
        "t": 1794297203879.9731,
        "elu": 0.030304067808166836
      },
      {
        "t": 1794297204382.2856,
        "elu": 0.031936696088653786
      },
      {
        "t": 1794297204882.6958,
        "elu": 0.036645304290966414
      },
      {
        "t": 1794297205382.6062,
        "elu": 0.029529815345214993
      },
      {
        "t": 1794297205884.4001,
        "elu": 0.032376210876080724
      },
      {
        "t": 1794297206384.1968,
        "elu": 0.024147758436715048
      },
      {
        "t": 1794297206884.9404,
        "elu": 0.023197311695052382
      },
      {
        "t": 1794297207385.648,
        "elu": 0.030621207288755444
      },
      {
        "t": 1794297207887.0864,
        "elu": 0.022648102547473518
      },
      {
        "t": 1794297208388.071,
        "elu": 0.03981564584549604
      },
      {
        "t": 1794297208888.951,
        "elu": 0.030504821039684785
      },
      {
        "t": 1794297209390.0974,
        "elu": 0.02357533957949968
      },
      {
        "t": 1794297209890.967,
        "elu": 0.03153908360913388
      },
      {
        "t": 1794297210392.0017,
        "elu": 0.03336000347198724
      },
      {
        "t": 1794297210902.3716,
        "elu": 0.2595336454638328
      },
      {
        "t": 1794297211403.0356,
        "elu": 0.3366340480064778
      },
      {
        "t": 1794297211906.5017,
        "elu": 0.4507437122757657
      },
      {
        "t": 1794297212409.2876,
        "elu": 0.09002807092575099
      },
      {
        "t": 1794297212909.8298,
        "elu": 0.03096039466039683
      },
      {
        "t": 1794297213410.817,
        "elu": 0.029190427961021066
      },
      {
        "t": 1794297213912.1096,
        "elu": 0.026459136652968996
      },
      {
        "t": 1794297214412.1533,
        "elu": 0.08473324656346816
      },
      {
        "t": 1794297214912.9944,
        "elu": 0.022420602036698142
      },
      {
        "t": 1794297215414.9165,
        "elu": 0.0240852477638213
      },
      {
        "t": 1794297215916.0303,
        "elu": 0.05189658611077584
      },
      {
        "t": 1794297216417.1558,
        "elu": 0.051975651102142154
      },
      {
        "t": 1794297216919.013,
        "elu": 0.029692043169920947
      },
      {
        "t": 1794297217419.876,
        "elu": 0.0387348903177056
      },
      {
        "t": 1794297217920.2693,
        "elu": 0.9315008387100103
      },
      {
        "t": 1794297218420.4338,
        "elu": 0.026303664086127557
      },
      {
        "t": 1794297218923.9082,
        "elu": 0.037423893339389724
      },
      {
        "t": 1794297219425.2324,
        "elu": 0.03137444413468391
      },
      {
        "t": 1794297219927.3533,
        "elu": 0.023879652699965347
      },
      {
        "t": 1794297220427.9065,
        "elu": 0.038417891284741684
      },
      {
        "t": 1794297220929.3457,
        "elu": 0.02299055967953298
      },
      {
        "t": 1794297221429.4905,
        "elu": 0.02065313840342221
      },
      {
        "t": 1794297221929.1892,
        "elu": 0.03714924244617879
      },
      {
        "t": 1794297222429.9348,
        "elu": 0.04238942104521431
      },
      {
        "t": 1794297222930.0603,
        "elu": 0.044217241346521594
      },
      {
        "t": 1794297223430.6333,
        "elu": 0.024636903815954927
      },
      {
        "t": 1794297223930.6562,
        "elu": 0.03378584680419897
      },
      {
        "t": 1794297224431.5403,
        "elu": 0.03449448876727021
      },
      {
        "t": 1794297224932.146,
        "elu": 0.04610378922108023
      },
      {
        "t": 1794297225433.0498,
        "elu": 0.04550577152117707
      },
      {
        "t": 1794297225934.0278,
        "elu": 0.025722312768529383
      },
      {
        "t": 1794297226435.3748,
        "elu": 0.03338684985823952
      },
      {
        "t": 1794297226936.0083,
        "elu": 0.03615984126000112
      },
      {
        "t": 1794297227437.1316,
        "elu": 0.025158637207251762
      },
      {
        "t": 1794297227939.629,
        "elu": 0.03527675754427177
      },
      {
        "t": 1794297228440.9316,
        "elu": 0.023180384668154093
      },
      {
        "t": 1794297228943.9475,
        "elu": 0.029592491320505766
      },
      {
        "t": 1794297229444.2092,
        "elu": 0.03344607665091748
      },
      {
        "t": 1794297229946.6904,
        "elu": 0.036336262730123935
      },
      {
        "t": 1794297230446.9526,
        "elu": 0.03941851853422048
      },
      {
        "t": 1794297230948.0713,
        "elu": 0.02310287288770842
      },
      {
        "t": 1794297231448.2917,
        "elu": 0.02704974180613655
      },
      {
        "t": 1794297231952.6538,
        "elu": 0.03320629038037744
      },
      {
        "t": 1794297232453.21,
        "elu": 0.030875329878865317
      },
      {
        "t": 1794297232954.934,
        "elu": 0.022604095633286678
      },
      {
        "t": 1794297233456.5522,
        "elu": 0.04152418239417672
      },
      {
        "t": 1794297233956.7678,
        "elu": 0.029233646608386957
      },
      {
        "t": 1794297234456.731,
        "elu": 0.7542947313197257
      },
      {
        "t": 1794297234957.0652,
        "elu": 0.04366754742167747
      },
      {
        "t": 1794297235460.089,
        "elu": 0.0658420594776518
      },
      {
        "t": 1794297235960.5413,
        "elu": 0.03143195229077585
      },
      {
        "t": 1794297236460.8276,
        "elu": 0.05116901226026507
      },
      {
        "t": 1794297236966.8481,
        "elu": 0.02506318386199253
      },
      {
        "t": 1794297237465.99,
        "elu": 0.035499335477880076
      },
      {
        "t": 1794297237967.039,
        "elu": 0.03294856431428671
      },
      {
        "t": 1794297238467.7495,
        "elu": 0.029182865694419514
      },
      {
        "t": 1794297238967.437,
        "elu": 0.032507618565952745
      },
      {
        "t": 1794297239467.3762,
        "elu": 0.03367722222018934
      },
      {
        "t": 1794297239969.2673,
        "elu": 0.02654964568505269
      },
      {
        "t": 1794297240471.2505,
        "elu": 0.0472070556140605
      },
      {
        "t": 1794297240971.6008,
        "elu": 0.0842444998779084
      },
      {
        "t": 1794297241473.4443,
        "elu": 0.024888069829528094
      },
      {
        "t": 1794297241974.024,
        "elu": 0.03826127754154494
      },
      {
        "t": 1794297242475.2554,
        "elu": 0.03191271904305854
      },
      {
        "t": 1794297242979.805,
        "elu": 0.022328787909587887
      },
      {
        "t": 1794297243481.116,
        "elu": 0.025009143003694966
      },
      {
        "t": 1794297243981.9646,
        "elu": 0.04312922054315719
      },
      {
        "t": 1794297244482.9788,
        "elu": 0.08688676092697753
      },
      {
        "t": 1794297244983.7732,
        "elu": 0.08591810706660444
      },
      {
        "t": 1794297245483.3032,
        "elu": 0.06502301768353648
      },
      {
        "t": 1794297245983.2334,
        "elu": 0.08708893888749633
      },
      {
        "t": 1794297246483.1667,
        "elu": 0.07483262891737429
      },
      {
        "t": 1794297246983.7346,
        "elu": 0.04669622480712564
      },
      {
        "t": 1794297247483.4146,
        "elu": 0.05238625392470149
      },
      {
        "t": 1794297247983.8457,
        "elu": 0.0621325761500535
      },
      {
        "t": 1794297248483.6365,
        "elu": 0.06996105330003853
      },
      {
        "t": 1794297248984.5461,
        "elu": 0.07848296691593627
      },
      {
        "t": 1794297249484.8997,
        "elu": 0.05491929259444119
      },
      {
        "t": 1794297249984.536,
        "elu": 0.041417793190505245
      },
      {
        "t": 1794297250484.9246,
        "elu": 0.06146192469960379
      },
      {
        "t": 1794297250986.7874,
        "elu": 0.07477657541877364
      },
      {
        "t": 1794297251487.1616,
        "elu": 0.058460688448936725
      },
      {
        "t": 1794297251986.959,
        "elu": 0.08096886985592786
      },
      {
        "t": 1794297252487.326,
        "elu": 0.06206789582031614
      },
      {
        "t": 1794297252987.0789,
        "elu": 0.04886883826849709
      },
      {
        "t": 1794297253487.4448,
        "elu": 0.053145903277283406
      },
      {
        "t": 1794297253987.1846,
        "elu": 0.07756253754214826
      },
      {
        "t": 1794297254487.264,
        "elu": 0.0445520827809865
      },
      {
        "t": 1794297254988.291,
        "elu": 0.0870171497572266
      },
      {
        "t": 1794297255489.2185,
        "elu": 0.05919377492410913
      },
      {
        "t": 1794297255989.1792,
        "elu": 0.06431434065213203
      },
      {
        "t": 1794297256491.7217,
        "elu": 0.03886664673361325
      },
      {
        "t": 1794297256991.5857,
        "elu": 0.06978046958894223
      },
      {
        "t": 1794297257492.5388,
        "elu": 0.04097442479824365
      },
      {
        "t": 1794297257992.9375,
        "elu": 0.06820170363095752
      },
      {
        "t": 1794297258493.9685,
        "elu": 0.04548802809417112
      },
      {
        "t": 1794297258994.5938,
        "elu": 0.08894850423955082
      },
      {
        "t": 1794297259494.522,
        "elu": 0.08120538369816807
      },
      {
        "t": 1794297259994.7202,
        "elu": 0.05031246165783387
      },
      {
        "t": 1794297260494.2744,
        "elu": 0.05852719576692343
      },
      {
        "t": 1794297261026.0225,
        "elu": 0.5298777287270308
      },
      {
        "t": 1794297261526.0845,
        "elu": 0.9096761258136854
      },
      {
        "t": 1794297262026.2744,
        "elu": 0.07709076531197497
      },
      {
        "t": 1794297262526.0046,
        "elu": 0.03837060689514978
      },
      {
        "t": 1794297263026.5608,
        "elu": 0.07282697062957956
      },
      {
        "t": 1794297263526.9229,
        "elu": 0.03609939376634973
      },
      {
        "t": 1794297264027.3,
        "elu": 0.07025664776402904
      },
      {
        "t": 1794297264527.4578,
        "elu": 0.044697998731117454
      },
      {
        "t": 1794297265027.8806,
        "elu": 0.061546120418006035
      },
      {
        "t": 1794297265527.9238,
        "elu": 0.0719188478324583
      },
      {
        "t": 1794297266029.168,
        "elu": 0.04118821440824489
      },
      {
        "t": 1794297266529.7495,
        "elu": 0.03156951551744223
      },
      {
        "t": 1794297267030.1072,
        "elu": 0.07863794757648321
      },
      {
        "t": 1794297267530.4902,
        "elu": 0.06847722016067784
      },
      {
        "t": 1794297268030.9436,
        "elu": 0.036185973268683475
      },
      {
        "t": 1794297268531.6611,
        "elu": 0.05286049218970964
      },
      {
        "t": 1794297269031.4434,
        "elu": 0.05340556851122575
      },
      {
        "t": 1794297269531.2002,
        "elu": 0.05877470102209252
      },
      {
        "t": 1794297270031.1938,
        "elu": 0.04343711484170218
      },
      {
        "t": 1794297270531.809,
        "elu": 0.062198121417395585
      },
      {
        "t": 1794297271031.9536,
        "elu": 0.040676210048316785
      },
      {
        "t": 1794297271532.8677,
        "elu": 0.0611741069624894
      },
      {
        "t": 1794297272032.0208,
        "elu": 0.06069387569811149
      },
      {
        "t": 1794297272532.167,
        "elu": 0.03630327788340821
      },
      {
        "t": 1794297273032.2966,
        "elu": 0.07032512702416185
      },
      {
        "t": 1794297273532.2612,
        "elu": 0.057596696176240095
      },
      {
        "t": 1794297274032.817,
        "elu": 0.05221180141062655
      },
      {
        "t": 1794297274532.1704,
        "elu": 0.13638632240301612
      },
      {
        "t": 1794297275032.7192,
        "elu": 0.16486989108873087
      },
      {
        "t": 1794297275532.6714,
        "elu": 0.049380889876643214
      },
      {
        "t": 1794297276032.96,
        "elu": 0.12032014724510803
      },
      {
        "t": 1794297276533.2659,
        "elu": 0.08178379265601325
      },
      {
        "t": 1794297277033.024,
        "elu": 0.04077958358663749
      },
      {
        "t": 1794297277533.93,
        "elu": 0.05609334180915215
      },
      {
        "t": 1794297278034.0264,
        "elu": 0.07964861476789531
      },
      {
        "t": 1794297278534.6904,
        "elu": 0.045782631511402806
      },
      {
        "t": 1794297279041.514,
        "elu": 0.09155899478281124
      },
      {
        "t": 1794297279542.7014,
        "elu": 0.09288864095150806
      },
      {
        "t": 1794297280052.5857,
        "elu": 0.06157349360381471
      },
      {
        "t": 1794297280560.739,
        "elu": 0.13369174296765282
      },
      {
        "t": 1794297281065.7678,
        "elu": 0.11056152885987543
      },
      {
        "t": 1794297281575.4028,
        "elu": 0.09742885923324751
      },
      {
        "t": 1794297282075.757,
        "elu": 0.08557377020653055
      },
      {
        "t": 1794297282578.9968,
        "elu": 0.11978575287862053
      },
      {
        "t": 1794297283089.6755,
        "elu": 0.04277103313069256
      },
      {
        "t": 1794297283598.109,
        "elu": 0.05595140144777691
      },
      {
        "t": 1794297284099.3298,
        "elu": 0.1198301143063397
      },
      {
        "t": 1794297284601.536,
        "elu": 0.08125690221663388
      },
      {
        "t": 1794297285102.2998,
        "elu": 0.11695979316875416
      },
      {
        "t": 1794297285605.188,
        "elu": 0.1287152437712544
      },
      {
        "t": 1794297286109.0835,
        "elu": 0.0862375825708043
      },
      {
        "t": 1794297286615.8545,
        "elu": 0.10313960468066191
      },
      {
        "t": 1794297287115.9993,
        "elu": 0.11253095572561572
      },
      {
        "t": 1794297287622.5076,
        "elu": 0.0949997424406852
      },
      {
        "t": 1794297288122.323,
        "elu": 0.1356388567496686
      },
      {
        "t": 1794297288622.9377,
        "elu": 0.019510747872928107
      },
      {
        "t": 1794297289127.0767,
        "elu": 0.08373454797260182
      },
      {
        "t": 1794297289627.7507,
        "elu": 0.10855129708892683
      },
      {
        "t": 1794297290127.8235,
        "elu": 0.12999278149739193
      },
      {
        "t": 1794297290632.3274,
        "elu": 0.10274838453694854
      },
      {
        "t": 1794297291135.5935,
        "elu": 0.10636505962666655
      },
      {
        "t": 1794297291645.8462,
        "elu": 0.10005386444132526
      },
      {
        "t": 1794297292146.478,
        "elu": 0.0946517488951922
      },
      {
        "t": 1794297292646.9297,
        "elu": 0.07752399898467525
      },
      {
        "t": 1794297293148.6113,
        "elu": 0.07997623266001566
      },
      {
        "t": 1794297293657.29,
        "elu": 0.06080772641749827
      },
      {
        "t": 1794297294167.4038,
        "elu": 0.04974058818043888
      },
      {
        "t": 1794297294677.0566,
        "elu": 0.10995735358952392
      },
      {
        "t": 1794297295183.0906,
        "elu": 0.08117146472759758
      },
      {
        "t": 1794297295686.1553,
        "elu": 0.09919979283810257
      },
      {
        "t": 1794297296190.4453,
        "elu": 0.09828462258337188
      },
      {
        "t": 1794297296700.5117,
        "elu": 0.0931794116009935
      },
      {
        "t": 1794297297210.028,
        "elu": 0.0926848847556437
      },
      {
        "t": 1794297297716.8245,
        "elu": 0.08067016696054496
      },
      {
        "t": 1794297298219.5508,
        "elu": 0.09566159526721019
      },
      {
        "t": 1794297298720.4236,
        "elu": 0.07785852670612906
      },
      {
        "t": 1794297299227.391,
        "elu": 0.04158960924376275
      },
      {
        "t": 1794297299737.5068,
        "elu": 0.04951749056082538
      },
      {
        "t": 1794297300248.9531,
        "elu": 0.09887158237060299
      },
      {
        "t": 1794297300759.5977,
        "elu": 0.09604852170597665
      },
      {
        "t": 1794297301266.3809,
        "elu": 0.09433780271140386
      },
      {
        "t": 1794297301768.5837,
        "elu": 0.13142062742623456
      },
      {
        "t": 1794297302272.1257,
        "elu": 0.08928073692868627
      },
      {
        "t": 1794297302777.4368,
        "elu": 0.11220613111123066
      },
      {
        "t": 1794297303278.6213,
        "elu": 0.1224698926570546
      },
      {
        "t": 1794297303780.0852,
        "elu": 0.08630074608775895
      },
      {
        "t": 1794297304280.2412,
        "elu": 0.09262111666217765
      },
      {
        "t": 1794297304789.3984,
        "elu": 0.02195074920959216
      },
      {
        "t": 1794297305290.7322,
        "elu": 0.12735164144289166
      },
      {
        "t": 1794297305791.673,
        "elu": 0.06694407918565078
      },
      {
        "t": 1794297306295.0518,
        "elu": 0.09657337730546615
      },
      {
        "t": 1794297306797.9414,
        "elu": 0.1172498330118565
      },
      {
        "t": 1794297307298.9836,
        "elu": 0.10363440713514167
      },
      {
        "t": 1794297307801.651,
        "elu": 0.0858809401673371
      },
      {
        "t": 1794297308305.1116,
        "elu": 0.12214799349341261
      },
      {
        "t": 1794297308813.8347,
        "elu": 0.07470583107086988
      },
      {
        "t": 1794297309317.3806,
        "elu": 0.1077258196466872
      },
      {
        "t": 1794297309819.914,
        "elu": 0.08657271259152786
      },
      {
        "t": 1794297310326.4285,
        "elu": 0.03669370561234876
      },
      {
        "t": 1794297310831.4502,
        "elu": 0.11028740751151023
      },
      {
        "t": 1794297311335.2708,
        "elu": 0.10885378280084336
      },
      {
        "t": 1794297311841.9648,
        "elu": 0.08981399038247898
      },
      {
        "t": 1794297312343.2925,
        "elu": 0.1091091652007741
      },
      {
        "t": 1794297312850.6428,
        "elu": 0.10472504542272762
      },
      {
        "t": 1794297313356.147,
        "elu": 0.09782369478675752
      },
      {
        "t": 1794297313864.971,
        "elu": 0.07736046829717698
      },
      {
        "t": 1794297314366.8135,
        "elu": 0.09137980118385751
      },
      {
        "t": 1794297314871.7246,
        "elu": 0.10833547005803616
      },
      {
        "t": 1794297315378.2808,
        "elu": 0.05195986612547332
      },
      {
        "t": 1794297315880.9634,
        "elu": 0.08319245163765131
      },
      {
        "t": 1794297316385.7034,
        "elu": 0.1259002830966204
      },
      {
        "t": 1794297316886.2976,
        "elu": 0.10906755567954521
      },
      {
        "t": 1794297317392.6184,
        "elu": 0.09037980696973616
      },
      {
        "t": 1794297317894.234,
        "elu": 0.10209273297326206
      },
      {
        "t": 1794297318403.317,
        "elu": 0.11977319673991511
      },
      {
        "t": 1794297318904.9292,
        "elu": 0.10050822892090984
      },
      {
        "t": 1794297319413.2456,
        "elu": 0.11519372526719913
      },
      {
        "t": 1794297319918.1328,
        "elu": 0.10675048004459631
      },
      {
        "t": 1794297320422.1655,
        "elu": 0.08568020273302074
      },
      {
        "t": 1794297320924.9006,
        "elu": 0.030964350257642284
      },
      {
        "t": 1794297321426.7666,
        "elu": 0.06373695850934567
      },
      {
        "t": 1794297321931.311,
        "elu": 0.0910812633448855
      },
      {
        "t": 1794297322433.132,
        "elu": 0.12942645963754787
      },
      {
        "t": 1794297322934.0781,
        "elu": 0.05749877239230445
      },
      {
        "t": 1794297323441.5144,
        "elu": 0.09671747830181701
      },
      {
        "t": 1794297323949.705,
        "elu": 0.09588891686700392
      },
      {
        "t": 1794297324452.5808,
        "elu": 0.0957733658237133
      },
      {
        "t": 1794297324954.739,
        "elu": 0.09045775063488333
      },
      {
        "t": 1794297325464.7256,
        "elu": 0.13202211138341072
      },
      {
        "t": 1794297325971.828,
        "elu": 0.04273092854440975
      },
      {
        "t": 1794297326481.25,
        "elu": 0.06368859684635635
      },
      {
        "t": 1794297326983.2021,
        "elu": 0.08877341786340219
      },
      {
        "t": 1794297327500.8174,
        "elu": 0.10956775946118058
      },
      {
        "t": 1794297328000.136,
        "elu": 0.0815640438479022
      },
      {
        "t": 1794297328509.786,
        "elu": 0.10546285279095255
      },
      {
        "t": 1794297329021,
        "elu": 0.08382703330590596
      },
      {
        "t": 1794297329527.1274,
        "elu": 0.10952977478632797
      },
      {
        "t": 1794297330030.0688,
        "elu": 0.09598407585120196
      },
      {
        "t": 1794297330533.1921,
        "elu": 0.09233805163291449
      },
      {
        "t": 1794297331037.3167,
        "elu": 0.11652262497014042
      },
      {
        "t": 1794297331537.393,
        "elu": 0.04281026159206086
      },
      {
        "t": 1794297332040.8652,
        "elu": 0.05646413122577018
      },
      {
        "t": 1794297332546.7524,
        "elu": 0.10552959423914698
      },
      {
        "t": 1794297333049.0513,
        "elu": 0.09683624458683851
      },
      {
        "t": 1794297333562.9224,
        "elu": 0.1067253314677787
      },
      {
        "t": 1794297334062.8125,
        "elu": 0.0864541886590609
      },
      {
        "t": 1794297334567.952,
        "elu": 0.10676845569791515
      },
      {
        "t": 1794297335078.9746,
        "elu": 0.060475902005976266
      },
      {
        "t": 1794297335583.275,
        "elu": 0.12726004480901768
      },
      {
        "t": 1794297336085.5508,
        "elu": 0.07671593336346968
      },
      {
        "t": 1794297336589.3032,
        "elu": 0.08242178716813765
      },
      {
        "t": 1794297337095.1025,
        "elu": 0.029492910855966708
      },
      {
        "t": 1794297337599.8171,
        "elu": 0.11596197563591189
      },
      {
        "t": 1794297338101.8115,
        "elu": 0.07119623253438481
      },
      {
        "t": 1794297338619.174,
        "elu": 0.11923065740388909
      },
      {
        "t": 1794297339130.0708,
        "elu": 0.049493180699558506
      },
      {
        "t": 1794297339635.1797,
        "elu": 0.10603596548777089
      },
      {
        "t": 1794297340142.9473,
        "elu": 0.10361351059077312
      },
      {
        "t": 1794297340644.1772,
        "elu": 0.11860522376283114
      },
      {
        "t": 1794297341144.8582,
        "elu": 0.10595283381523957
      },
      {
        "t": 1794297341645.7144,
        "elu": 0.10368960131782427
      },
      {
        "t": 1794297342153.1987,
        "elu": 0.024281482413913803
      },
      {
        "t": 1794297342654.794,
        "elu": 0.06135753675512728
      },
      {
        "t": 1794297343158.0764,
        "elu": 0.10524157663353491
      },
      {
        "t": 1794297343659.9788,
        "elu": 0.1047852096837008
      },
      {
        "t": 1794297344170.0918,
        "elu": 0.09412944300178759
      },
      {
        "t": 1794297344679.7727,
        "elu": 0.09801463369150058
      },
      {
        "t": 1794297345182.0593,
        "elu": 0.06633788037880536
      },
      {
        "t": 1794297345683.0664,
        "elu": 0.11589172899807061
      },
      {
        "t": 1794297346187.6255,
        "elu": 0.10355375830269976
      },
      {
        "t": 1794297346692.7095,
        "elu": 0.10981259268339594
      },
      {
        "t": 1794297347191.223,
        "elu": 0.08835778050569959
      },
      {
        "t": 1794297347694.1335,
        "elu": 0.019844594049944212
      },
      {
        "t": 1794297348205.8708,
        "elu": 0.08844297311552143
      },
      {
        "t": 1794297348711.9172,
        "elu": 0.11216697848906554
      },
      {
        "t": 1794297349212.7485,
        "elu": 0.09235661608544292
      },
      {
        "t": 1794297349712.0273,
        "elu": 0.10899836932882889
      },
      {
        "t": 1794297350216.0315,
        "elu": 0.05159750812646773
      },
      {
        "t": 1794297350718.1797,
        "elu": 0.14003330818999468
      },
      {
        "t": 1794297351220.0298,
        "elu": 0.10935291756745427
      },
      {
        "t": 1794297351724.616,
        "elu": 0.07669251539513827
      },
      {
        "t": 1794297352235.265,
        "elu": 0.05985014067302551
      },
      {
        "t": 1794297352744.3188,
        "elu": 0.11105829403144672
      },
      {
        "t": 1794297353250.3545,
        "elu": 0.03581005197578412
      },
      {
        "t": 1794297353758.6716,
        "elu": 0.10784193417671005
      },
      {
        "t": 1794297354261.702,
        "elu": 0.0718363785568732
      },
      {
        "t": 1794297354765.3972,
        "elu": 0.09287986322933892
      },
      {
        "t": 1794297355275.268,
        "elu": 0.12156526343855739
      },
      {
        "t": 1794297355784.0532,
        "elu": 0.11117164060299775
      },
      {
        "t": 1794297356292.1755,
        "elu": 0.11159570516062485
      },
      {
        "t": 1794297356796.734,
        "elu": 0.07764483357061357
      },
      {
        "t": 1794297357300.3535,
        "elu": 0.09691761423947591
      },
      {
        "t": 1794297357802.1423,
        "elu": 0.10404067089140438
      },
      {
        "t": 1794297358304.7446,
        "elu": 0.05216625651988056
      },
      {
        "t": 1794297358805.7007,
        "elu": 0.06272002800989682
      },
      {
        "t": 1794297359311.0574,
        "elu": 0.09523561352449325
      },
      {
        "t": 1794297359812.2397,
        "elu": 0.12772667839388557
      },
      {
        "t": 1794297360318.6047,
        "elu": 0.08292642853077954
      },
      {
        "t": 1794297360819.2827,
        "elu": 0.1437183461346008
      },
      {
        "t": 1794297361324.3667,
        "elu": 0.07777614518802645
      },
      {
        "t": 1794297361832.66,
        "elu": 0.12458277359482901
      },
      {
        "t": 1794297362335.1165,
        "elu": 0.10393299038538606
      },
      {
        "t": 1794297362844.754,
        "elu": 0.05887335526934223
      },
      {
        "t": 1794297363346.944,
        "elu": 0.09033599152627224
      },
      {
        "t": 1794297363857.557,
        "elu": 0.03756259035479191
      },
      {
        "t": 1794297364359.0444,
        "elu": 0.08955703021667288
      },
      {
        "t": 1794297364858.9927,
        "elu": 0.7231766605392626
      },
      {
        "t": 1794297365373.7158,
        "elu": 0.5063923162320337
      },
      {
        "t": 1794297365887.7664,
        "elu": 0.09675446465380488
      },
      {
        "t": 1794297366388.621,
        "elu": 0.07627251792367244
      },
      {
        "t": 1794297366900.0276,
        "elu": 0.11872640096475207
      },
      {
        "t": 1794297367407.934,
        "elu": 0.1332269591403169
      },
      {
        "t": 1794297367916.9963,
        "elu": 0.12274482653851713
      },
      {
        "t": 1794297368433.9424,
        "elu": 0.10459801401631225
      },
      {
        "t": 1794297368937.1287,
        "elu": 0.06406819662093126
      },
      {
        "t": 1794297369439.147,
        "elu": 0.06378625864911198
      },
      {
        "t": 1794297369939.1067,
        "elu": 0.11906258186105116
      },
      {
        "t": 1794297370443.7634,
        "elu": 0.11599018634762753
      },
      {
        "t": 1794297370944.0496,
        "elu": 0.11684861137371592
      },
      {
        "t": 1794297371447.9546,
        "elu": 0.09800936094193778
      },
      {
        "t": 1794297371947.6833,
        "elu": 0.10957929271380867
      },
      {
        "t": 1794297372454.648,
        "elu": 0.08360918489854739
      },
      {
        "t": 1794297372956.3262,
        "elu": 0.09810973502697115
      },
      {
        "t": 1794297373459.1592,
        "elu": 0.11258501066381099
      },
      {
        "t": 1794297373968.928,
        "elu": 0.11763548257071978
      },
      {
        "t": 1794297374473.7842,
        "elu": 0.03341973657988283
      },
      {
        "t": 1794297374974.711,
        "elu": 0.07861424770690878
      },
      {
        "t": 1794297375480.6912,
        "elu": 0.1108961668517423
      },
      {
        "t": 1794297375980.6982,
        "elu": 0.1514989199191847
      },
      {
        "t": 1794297376481.4563,
        "elu": 0.06033359409624176
      },
      {
        "t": 1794297376987.2375,
        "elu": 0.10818875673482535
      },
      {
        "t": 1794297377493.7659,
        "elu": 0.11548399001816792
      },
      {
        "t": 1794297377994.6787,
        "elu": 0.0984285627090605
      },
      {
        "t": 1794297378501.4045,
        "elu": 0.07815270814066033
      },
      {
        "t": 1794297379001.4434,
        "elu": 0.06721698182517517
      },
      {
        "t": 1794297379501.5557,
        "elu": 0.05977842332287872
      },
      {
        "t": 1794297380003.6973,
        "elu": 0.03491390919355486
      },
      {
        "t": 1794297380512.736,
        "elu": 0.08629486133704482
      },
      {
        "t": 1794297381013.7866,
        "elu": 0.1128035333165718
      },
      {
        "t": 1794297381522.1926,
        "elu": 0.12702879480742046
      },
      {
        "t": 1794297382025.5688,
        "elu": 0.1247821932455757
      },
      {
        "t": 1794297382526.5269,
        "elu": 0.09554783285959177
      },
      {
        "t": 1794297383027.2305,
        "elu": 0.11960824526818396
      },
      {
        "t": 1794297383537.2344,
        "elu": 0.12431905846299009
      },
      {
        "t": 1794297384039.1255,
        "elu": 0.09291325868216771
      },
      {
        "t": 1794297384549.0803,
        "elu": 0.10646836212960525
      },
      {
        "t": 1794297385050.0134,
        "elu": 0.09141192649941647
      },
      {
        "t": 1794297385567.2063,
        "elu": 0.0781998559087708
      },
      {
        "t": 1794297386068.827,
        "elu": 0.09200434878597542
      },
      {
        "t": 1794297386568.597,
        "elu": 0.10865236635234586
      },
      {
        "t": 1794297387071.2678,
        "elu": 0.13517853739766708
      },
      {
        "t": 1794297387586.7646,
        "elu": 0.1364958488857317
      },
      {
        "t": 1794297388087.285,
        "elu": 0.08229208231781038
      },
      {
        "t": 1794297388589.8518,
        "elu": 0.13301984311745457
      },
      {
        "t": 1794297389096.1064,
        "elu": 0.120279629190484
      },
      {
        "t": 1794297389597.2952,
        "elu": 0.08509362383309586
      },
      {
        "t": 1794297390103.1882,
        "elu": 0.14285197321125037
      },
      {
        "t": 1794297390605.5532,
        "elu": 0.04264984189169144
      },
      {
        "t": 1794297391110.4814,
        "elu": 0.08473347273428469
      },
      {
        "t": 1794297391613.4385,
        "elu": 0.08792287808501473
      },
      {
        "t": 1794297392115.8464,
        "elu": 0.10832877753592071
      },
      {
        "t": 1794297392615.6436,
        "elu": 0.11804395199036079
      },
      {
        "t": 1794297393119.9956,
        "elu": 0.10163813276248007
      },
      {
        "t": 1794297393620.9626,
        "elu": 0.12274934872297084
      },
      {
        "t": 1794297394125.6243,
        "elu": 0.13516234736910251
      },
      {
        "t": 1794297394627.0332,
        "elu": 0.06973040364496187
      },
      {
        "t": 1794297395130.0586,
        "elu": 0.11906265609788921
      },
      {
        "t": 1794297395630.6924,
        "elu": 0.10150895121342357
      },
      {
        "t": 1794297396130.5457,
        "elu": 0.02705391133388056
      },
      {
        "t": 1794297396632.8108,
        "elu": 0.10196536264444074
      },
      {
        "t": 1794297397132.7368,
        "elu": 0.11679365990605706
      },
      {
        "t": 1794297397632.263,
        "elu": 0.07610132584710728
      },
      {
        "t": 1794297398134.6365,
        "elu": 0.11127163654490241
      },
      {
        "t": 1794297398636.142,
        "elu": 0.09394272502594744
      },
      {
        "t": 1794297399137.629,
        "elu": 0.126601209993545
      },
      {
        "t": 1794297399640.4119,
        "elu": 0.10425162313887626
      },
      {
        "t": 1794297400140.6206,
        "elu": 0.11975824373945503
      },
      {
        "t": 1794297400643.0247,
        "elu": 0.11953658537431683
      },
      {
        "t": 1794297401145.2832,
        "elu": 0.05951433296090372
      },
      {
        "t": 1794297401654.4453,
        "elu": 0.0552411004781883
      },
      {
        "t": 1794297402155.235,
        "elu": 0.09737664617119457
      },
      {
        "t": 1794297402657.2502,
        "elu": 0.0909637639833412
      },
      {
        "t": 1794297403159.029,
        "elu": 0.14486552970988417
      },
      {
        "t": 1794297403662.3835,
        "elu": 0.0564017885616456
      },
      {
        "t": 1794297404163.454,
        "elu": 0.12141547050954452
      },
      {
        "t": 1794297404663.992,
        "elu": 0.08561578524330277
      },
      {
        "t": 1794297405164.196,
        "elu": 0.12642295368558565
      },
      {
        "t": 1794297405675.1265,
        "elu": 0.11802075873453949
      },
      {
        "t": 1794297406174.8428,
        "elu": 0.10432886709822078
      },
      {
        "t": 1794297406677.6008,
        "elu": 0.05697069403815781
      },
      {
        "t": 1794297407178.851,
        "elu": 0.11450988807888017
      },
      {
        "t": 1794297407687.213,
        "elu": 0.10790123755497373
      },
      {
        "t": 1794297408187.4358,
        "elu": 0.11264074423021661
      },
      {
        "t": 1794297408688.3752,
        "elu": 0.10122042992767497
      },
      {
        "t": 1794297409195.0137,
        "elu": 0.12640284975969437
      },
      {
        "t": 1794297409699.4165,
        "elu": 0.10367353052764607
      },
      {
        "t": 1794297410199.808,
        "elu": 0.11056133915593147
      },
      {
        "t": 1794297410701.6292,
        "elu": 0.11813203527940432
      },
      {
        "t": 1794297411203.3164,
        "elu": 0.09471446487366979
      },
      {
        "t": 1794297411705.4006,
        "elu": 0.0974314840310471
      },
      {
        "t": 1794297412211.6943,
        "elu": 0.02236384350602265
      },
      {
        "t": 1794297412712.78,
        "elu": 0.09852771863187534
      },
      {
        "t": 1794297413222.4346,
        "elu": 0.11125094932306846
      },
      {
        "t": 1794297413723.2666,
        "elu": 0.10132998856867992
      },
      {
        "t": 1794297414236.8364,
        "elu": 0.13175999865192853
      },
      {
        "t": 1794297414739.334,
        "elu": 0.07299085462125407
      },
      {
        "t": 1794297415242.461,
        "elu": 0.15036508476701968
      },
      {
        "t": 1794297415743.8467,
        "elu": 0.1200811357742953
      },
      {
        "t": 1794297416256.193,
        "elu": 0.1085372900445291
      },
      {
        "t": 1794297416757.7065,
        "elu": 0.07771202940209912
      },
      {
        "t": 1794297417262.4568,
        "elu": 0.07348588663319278
      },
      {
        "t": 1794297417763.7664,
        "elu": 0.06554762658664307
      },
      {
        "t": 1794297418264.7834,
        "elu": 0.12374091646066541
      },
      {
        "t": 1794297418773.7407,
        "elu": 0.07146523984409671
      },
      {
        "t": 1794297419274.6611,
        "elu": 0.1174000872480389
      },
      {
        "t": 1794297419780.0264,
        "elu": 0.09362354202726364
      },
      {
        "t": 1794297420280.0752,
        "elu": 0.12148425856314726
      },
      {
        "t": 1794297420783.8027,
        "elu": 0.061868979800961094
      },
      {
        "t": 1794297421284.15,
        "elu": 0.13281387418224996
      },
      {
        "t": 1794297421790.717,
        "elu": 0.08504781630719158
      },
      {
        "t": 1794297422293.9197,
        "elu": 0.1341145886191069
      },
      {
        "t": 1794297422795.7834,
        "elu": 0.04129412988195805
      },
      {
        "t": 1794297423296.9224,
        "elu": 0.10459725964020139
      },
      {
        "t": 1794297423799.1453,
        "elu": 0.06456293912460127
      },
      {
        "t": 1794297424303.925,
        "elu": 0.14715246725924538
      },
      {
        "t": 1794297424813.774,
        "elu": 0.06814906334955875
      },
      {
        "t": 1794297425316.2415,
        "elu": 0.13800309793073362
      },
      {
        "t": 1794297425826.0999,
        "elu": 0.0840474092885687
      },
      {
        "t": 1794297426328.3245,
        "elu": 0.10437685918018527
      },
      {
        "t": 1794297426830.0286,
        "elu": 0.09478907186307702
      },
      {
        "t": 1794297427340.8296,
        "elu": 0.13645150516659368
      },
      {
        "t": 1794297427842.9575,
        "elu": 0.07874592563850358
      },
      {
        "t": 1794297428346.2197,
        "elu": 0.038169232056367935
      },
      {
        "t": 1794297428847.5896,
        "elu": 0.06393592282830254
      },
      {
        "t": 1794297429354.164,
        "elu": 0.11849775517918587
      },
      {
        "t": 1794297429854.3245,
        "elu": 0.08037084779438997
      },
      {
        "t": 1794297430357.4678,
        "elu": 0.11477826846483506
      },
      {
        "t": 1794297430857.498,
        "elu": 0.08538478653073724
      },
      {
        "t": 1794297431360.6184,
        "elu": 0.1241496346985531
      },
      {
        "t": 1794297431863.1426,
        "elu": 0.07221910563840876
      },
      {
        "t": 1794297432364.984,
        "elu": 0.12111961881787409
      },
      {
        "t": 1794297432871.8496,
        "elu": 0.1053105397489783
      },
      {
        "t": 1794297433371.124,
        "elu": 0.0958917339954339
      },
      {
        "t": 1794297433881.9622,
        "elu": 0.03677072184906102
      },
      {
        "t": 1794297434381.9658,
        "elu": 0.12796550950445826
      },
      {
        "t": 1794297434889.6538,
        "elu": 0.08345821717216263
      },
      {
        "t": 1794297435391.2861,
        "elu": 0.12960021339671798
      },
      {
        "t": 1794297435907.0862,
        "elu": 0.088186394479912
      },
      {
        "t": 1794297436408.7292,
        "elu": 0.1023952053540237
      },
      {
        "t": 1794297436910.3333,
        "elu": 0.10628157637642435
      },
      {
        "t": 1794297437411.2122,
        "elu": 0.1194439579824648
      },
      {
        "t": 1794297437913.7317,
        "elu": 0.08047650457175788
      },
      {
        "t": 1794297438414.263,
        "elu": 0.10467520004290042
      },
      {
        "t": 1794297438917.5508,
        "elu": 0.03057485296211051
      },
      {
        "t": 1794297439420.8257,
        "elu": 0.08755118765683587
      },
      {
        "t": 1794297439927.5864,
        "elu": 0.09435122296152679
      },
      {
        "t": 1794297440431.8774,
        "elu": 0.10982043688604629
      },
      {
        "t": 1794297440932.9136,
        "elu": 0.09815908386782284
      },
      {
        "t": 1794297441433.5818,
        "elu": 0.10254477175141387
      },
      {
        "t": 1794297441937.5972,
        "elu": 0.0952555983829307
      },
      {
        "t": 1794297442438.499,
        "elu": 0.10933079320143257
      },
      {
        "t": 1794297442940.0715,
        "elu": 0.08910862378977603
      },
      {
        "t": 1794297443440.0127,
        "elu": 0.131465670158334
      },
      {
        "t": 1794297443940.1726,
        "elu": 0.08218306617888363
      },
      {
        "t": 1794297444441.781,
        "elu": 0.035580211269629416
      },
      {
        "t": 1794297444942.3186,
        "elu": 0.07099510663740857
      },
      {
        "t": 1794297445444.693,
        "elu": 0.10589408861399091
      },
      {
        "t": 1794297445950.9905,
        "elu": 0.10184399473216699
      },
      {
        "t": 1794297446452.6492,
        "elu": 0.10148894198736734
      },
      {
        "t": 1794297446966.172,
        "elu": 0.11137819436257447
      },
      {
        "t": 1794297447467.2815,
        "elu": 0.09980545988634058
      },
      {
        "t": 1794297447969.2405,
        "elu": 0.07350874939863704
      },
      {
        "t": 1794297448471.4321,
        "elu": 0.11395182599579204
      },
      {
        "t": 1794297448979.638,
        "elu": 0.10730878777580487
      },
      {
        "t": 1794297449480.811,
        "elu": 0.05246961056153489
      },
      {
        "t": 1794297449983.7034,
        "elu": 0.048555522714358826
      },
      {
        "t": 1794297450483.1975,
        "elu": 0.1450528747965043
      },
      {
        "t": 1794297450985.2947,
        "elu": 0.0783444742992663
      },
      {
        "t": 1794297451490.1382,
        "elu": 0.10424746236988225
      },
      {
        "t": 1794297451995.6152,
        "elu": 0.09252660105860304
      },
      {
        "t": 1794297452500.1428,
        "elu": 0.10285650892575017
      },
      {
        "t": 1794297453001.0266,
        "elu": 0.07612650960295698
      },
      {
        "t": 1794297453502.132,
        "elu": 0.15189290333684508
      },
      {
        "t": 1794297454001.7166,
        "elu": 0.07993265006253214
      },
      {
        "t": 1794297454502.76,
        "elu": 0.10359187031140658
      },
      {
        "t": 1794297455012.492,
        "elu": 0.06149202546211152
      },
      {
        "t": 1794297455513.999,
        "elu": 0.0918974795866848
      },
      {
        "t": 1794297456014.8477,
        "elu": 0.06312170527710335
      },
      {
        "t": 1794297456520.3193,
        "elu": 0.12094191134593812
      },
      {
        "t": 1794297457020.296,
        "elu": 0.09718396561561347
      },
      {
        "t": 1794297457521.2627,
        "elu": 0.11208966694328625
      },
      {
        "t": 1794297458022.4905,
        "elu": 0.08230870699523829
      },
      {
        "t": 1794297458523.5935,
        "elu": 0.14811096652841213
      },
      {
        "t": 1794297459033.7905,
        "elu": 0.046650828912060384
      },
      {
        "t": 1794297459534.7712,
        "elu": 0.028053375607983922
      },
      {
        "t": 1794297460040.2812,
        "elu": 0.0018305397729115732
      },
      {
        "t": 1794297460540.5889,
        "elu": 0.0010367948595875268
      },
      {
        "t": 1794297461042.5059,
        "elu": 0.001814911711476949
      },
      {
        "t": 1794297461543.9204,
        "elu": 0.0009654523081762423
      },
      {
        "t": 1794297462044.2515,
        "elu": 0.0023038322764415853
      }
    ],
    "readers": [
      {
        "worker": 2,
        "t": 1794296857897.193,
        "elu": 0.034309150953021936
      },
      {
        "worker": 0,
        "t": 1794296857902.3335,
        "elu": 0.034099536995883716
      },
      {
        "worker": 1,
        "t": 1794296857904.3186,
        "elu": 0.03480737975117318
      },
      {
        "worker": 2,
        "t": 1794296858398.0215,
        "elu": 0.0005033433233404982
      },
      {
        "worker": 0,
        "t": 1794296858402.5054,
        "elu": 0.0005924721657845771
      },
      {
        "worker": 1,
        "t": 1794296858404.5078,
        "elu": 0.000553045751000807
      },
      {
        "worker": 2,
        "t": 1794296858904.5854,
        "elu": 0.10840316265853046
      },
      {
        "worker": 1,
        "t": 1794296858908.9204,
        "elu": 0.17538100853253194
      },
      {
        "worker": 0,
        "t": 1794296858912.007,
        "elu": 0.1776549847196371
      },
      {
        "worker": 2,
        "t": 1794296859404.6355,
        "elu": 0.520705468761731
      },
      {
        "worker": 1,
        "t": 1794296859409.2402,
        "elu": 0.5414134690222946
      },
      {
        "worker": 0,
        "t": 1794296859413.2324,
        "elu": 0.48708936133932085
      },
      {
        "worker": 2,
        "t": 1794296859904.7017,
        "elu": 0.31332252609777206
      },
      {
        "worker": 1,
        "t": 1794296859909.354,
        "elu": 0.3349091469451498
      },
      {
        "worker": 0,
        "t": 1794296859913.1575,
        "elu": 0.36624613275789153
      },
      {
        "worker": 2,
        "t": 1794296860407.2783,
        "elu": 0.4086650147526441
      },
      {
        "worker": 1,
        "t": 1794296860408.9883,
        "elu": 0.4805219184119181
      },
      {
        "worker": 0,
        "t": 1794296860413.9868,
        "elu": 0.4757458845700402
      },
      {
        "worker": 2,
        "t": 1794296860907.76,
        "elu": 0.2638935575088036
      },
      {
        "worker": 1,
        "t": 1794296860909.0723,
        "elu": 0.3209189639320303
      },
      {
        "worker": 0,
        "t": 1794296860915.0806,
        "elu": 0.3955880333772182
      },
      {
        "worker": 2,
        "t": 1794296861407.2505,
        "elu": 0.6428830424496382
      },
      {
        "worker": 1,
        "t": 1794296861409.2495,
        "elu": 0.6822663334971525
      },
      {
        "worker": 0,
        "t": 1794296861415.4465,
        "elu": 0.729725788339151
      },
      {
        "worker": 2,
        "t": 1794296861907.5107,
        "elu": 0.3010202778493663
      },
      {
        "worker": 0,
        "t": 1794296861915.6838,
        "elu": 0.4120391641745374
      },
      {
        "worker": 1,
        "t": 1794296861908.9695,
        "elu": 0.3359364581099914
      },
      {
        "worker": 1,
        "t": 1794296862409.448,
        "elu": 0.6519644868683836
      },
      {
        "worker": 2,
        "t": 1794296862408.734,
        "elu": 0.6457446827995311
      },
      {
        "worker": 0,
        "t": 1794296862415.0225,
        "elu": 0.6799358082028403
      },
      {
        "worker": 2,
        "t": 1794296862909.6921,
        "elu": 0.35465678517244853
      },
      {
        "worker": 1,
        "t": 1794296862909.7659,
        "elu": 0.3962596517813699
      },
      {
        "worker": 0,
        "t": 1794296862916.4028,
        "elu": 0.43623565242400136
      },
      {
        "worker": 1,
        "t": 1794296863410.7727,
        "elu": 0.21863612900013232
      },
      {
        "worker": 2,
        "t": 1794296863409.9224,
        "elu": 0.22068763903223457
      },
      {
        "worker": 0,
        "t": 1794296863416.2444,
        "elu": 0.26096040030318174
      },
      {
        "worker": 2,
        "t": 1794296863909.9893,
        "elu": 0.631811846427285
      },
      {
        "worker": 1,
        "t": 1794296863910.107,
        "elu": 0.6555256634463034
      },
      {
        "worker": 0,
        "t": 1794296863916.581,
        "elu": 0.7278911081388496
      },
      {
        "worker": 1,
        "t": 1794296864410.1384,
        "elu": 0.5943164300772167
      },
      {
        "worker": 2,
        "t": 1794296864410.273,
        "elu": 0.573551620289689
      },
      {
        "worker": 0,
        "t": 1794296864415.973,
        "elu": 0.6577434690166435
      },
      {
        "worker": 1,
        "t": 1794296864910.9614,
        "elu": 0.5975888144729415
      },
      {
        "worker": 2,
        "t": 1794296864911.0398,
        "elu": 0.5175142094035398
      },
      {
        "worker": 0,
        "t": 1794296864916.2278,
        "elu": 0.6534009952420824
      },
      {
        "worker": 2,
        "t": 1794296865412.3818,
        "elu": 0.2820931800877277
      },
      {
        "worker": 0,
        "t": 1794296865416.012,
        "elu": 0.3292281058196632
      },
      {
        "worker": 1,
        "t": 1794296865416.0015,
        "elu": 0.2889298429968733
      },
      {
        "worker": 2,
        "t": 1794296865911.9507,
        "elu": 0.3727090173362717
      },
      {
        "worker": 1,
        "t": 1794296865915.9634,
        "elu": 0.41632979462745356
      },
      {
        "worker": 0,
        "t": 1794296865916.0151,
        "elu": 0.47311555205969835
      },
      {
        "worker": 2,
        "t": 1794296866412.4956,
        "elu": 0.6761680062542172
      },
      {
        "worker": 0,
        "t": 1794296866417.0898,
        "elu": 0.8578992685154675
      },
      {
        "worker": 1,
        "t": 1794296866415.9175,
        "elu": 0.7062776144592505
      },
      {
        "worker": 2,
        "t": 1794296866912.102,
        "elu": 0.6324237711346705
      },
      {
        "worker": 1,
        "t": 1794296866915.9504,
        "elu": 0.6852468585954365
      },
      {
        "worker": 0,
        "t": 1794296866917.111,
        "elu": 0.7654372299264932
      },
      {
        "worker": 2,
        "t": 1794296867411.9412,
        "elu": 0.6708529576891297
      },
      {
        "worker": 1,
        "t": 1794296867416.289,
        "elu": 0.7403086713894714
      },
      {
        "worker": 0,
        "t": 1794296867416.9841,
        "elu": 0.7788582025497992
      },
      {
        "worker": 2,
        "t": 1794296867912.7322,
        "elu": 0.5898338240582959
      },
      {
        "worker": 1,
        "t": 1794296867917.89,
        "elu": 0.6394781154139892
      },
      {
        "worker": 0,
        "t": 1794296867919.3296,
        "elu": 0.6931070149850216
      },
      {
        "worker": 2,
        "t": 1794296868412.0415,
        "elu": 0.12345173696784095
      },
      {
        "worker": 1,
        "t": 1794296868418.111,
        "elu": 0.12244092904863252
      },
      {
        "worker": 0,
        "t": 1794296868419.209,
        "elu": 0.13276218132766876
      },
      {
        "worker": 2,
        "t": 1794296868912.104,
        "elu": 0.6391746308193742
      },
      {
        "worker": 1,
        "t": 1794296868918.266,
        "elu": 0.6734233957239937
      },
      {
        "worker": 0,
        "t": 1794296868918.9275,
        "elu": 0.765548156738415
      },
      {
        "worker": 2,
        "t": 1794296869412.0598,
        "elu": 0.7159126052673578
      },
      {
        "worker": 1,
        "t": 1794296869418.5354,
        "elu": 0.726677283221272
      },
      {
        "worker": 0,
        "t": 1794296869419.3384,
        "elu": 0.807625938077872
      },
      {
        "worker": 2,
        "t": 1794296869911.9739,
        "elu": 0.32753603095390715
      },
      {
        "worker": 1,
        "t": 1794296869918.1138,
        "elu": 0.32600595997766907
      },
      {
        "worker": 0,
        "t": 1794296869918.963,
        "elu": 0.3744587065065929
      },
      {
        "worker": 2,
        "t": 1794296870412.7278,
        "elu": 0.3299838331710428
      },
      {
        "worker": 1,
        "t": 1794296870418.376,
        "elu": 0.35236226269619325
      },
      {
        "worker": 0,
        "t": 1794296870419.5427,
        "elu": 0.38674417996192006
      },
      {
        "worker": 2,
        "t": 1794296870912.1233,
        "elu": 0.6032365077811651
      },
      {
        "worker": 0,
        "t": 1794296870919.3682,
        "elu": 0.7580352374885461
      },
      {
        "worker": 1,
        "t": 1794296870919.7559,
        "elu": 0.7175120352946197
      },
      {
        "worker": 2,
        "t": 1794296871412.047,
        "elu": 0.3387574027613267
      },
      {
        "worker": 1,
        "t": 1794296871419.0125,
        "elu": 0.3470291798337847
      },
      {
        "worker": 0,
        "t": 1794296871419.3696,
        "elu": 0.36030963390523907
      },
      {
        "worker": 2,
        "t": 1794296871911.9875,
        "elu": 0.6183396158507453
      },
      {
        "worker": 0,
        "t": 1794296871919.1777,
        "elu": 0.7257012832725969
      },
      {
        "worker": 1,
        "t": 1794296871919.1777,
        "elu": 0.6534676217841456
      },
      {
        "worker": 2,
        "t": 1794296872411.914,
        "elu": 0.5875368285127143
      },
      {
        "worker": 1,
        "t": 1794296872420.2224,
        "elu": 0.6112138404676752
      },
      {
        "worker": 0,
        "t": 1794296872420.2495,
        "elu": 0.7461390753356189
      },
      {
        "worker": 2,
        "t": 1794296872912.0144,
        "elu": 0.07794203668052525
      },
      {
        "worker": 1,
        "t": 1794296872918.9832,
        "elu": 0.09840266091492596
      },
      {
        "worker": 0,
        "t": 1794296872920.7117,
        "elu": 0.10024852109227594
      },
      {
        "worker": 2,
        "t": 1794296873412.9575,
        "elu": 0.637178499073334
      },
      {
        "worker": 1,
        "t": 1794296873419.271,
        "elu": 0.7261348074154832
      },
      {
        "worker": 0,
        "t": 1794296873419.975,
        "elu": 0.7085830570490009
      },
      {
        "worker": 2,
        "t": 1794296873914.5664,
        "elu": 0.4837940662474582
      },
      {
        "worker": 1,
        "t": 1794296873920.7603,
        "elu": 0.5182363921629661
      },
      {
        "worker": 0,
        "t": 1794296873921.7495,
        "elu": 0.5568142039957736
      },
      {
        "worker": 0,
        "t": 1794296874424.4937,
        "elu": 0.009970023785718428
      },
      {
        "worker": 2,
        "t": 1794296874424.4937,
        "elu": 0.0067267775449627
      },
      {
        "worker": 1,
        "t": 1794296874424.647,
        "elu": 0.008578952506450466
      },
      {
        "worker": 1,
        "t": 1794296874924.5737,
        "elu": 0.000831801943626781
      },
      {
        "worker": 2,
        "t": 1794296874924.825,
        "elu": 0.0009673736070274774
      },
      {
        "worker": 0,
        "t": 1794296874926.5217,
        "elu": 0.0009567966550100021
      },
      {
        "worker": 2,
        "t": 1794296875424.971,
        "elu": 0.007487504848564732
      },
      {
        "worker": 1,
        "t": 1794296875425.3965,
        "elu": 0.008430917299260463
      },
      {
        "worker": 0,
        "t": 1794296875426.7202,
        "elu": 0.008741396011899681
      },
      {
        "worker": 2,
        "t": 1794296875926.0232,
        "elu": 0.0068904723989507005
      },
      {
        "worker": 1,
        "t": 1794296875935.1392,
        "elu": 0.00775988278516099
      },
      {
        "worker": 0,
        "t": 1794296875936.1172,
        "elu": 0.007838597662282103
      },
      {
        "worker": 2,
        "t": 1794296876434.6404,
        "elu": 0.0014114323182490742
      },
      {
        "worker": 1,
        "t": 1794296876435.5361,
        "elu": 0.0014161398100541467
      },
      {
        "worker": 0,
        "t": 1794296876436.4648,
        "elu": 0.001468753293849924
      },
      {
        "worker": 2,
        "t": 1794296876937.926,
        "elu": 0.0020084175082065157
      },
      {
        "worker": 1,
        "t": 1794296876939.5176,
        "elu": 0.001694724488176702
      },
      {
        "worker": 0,
        "t": 1794296876940.9668,
        "elu": 0.002014668858550085
      },
      {
        "worker": 1,
        "t": 1794296877440.2812,
        "elu": 0.0017263712226199095
      },
      {
        "worker": 2,
        "t": 1794296877440.5227,
        "elu": 0.0016289790511059288
      },
      {
        "worker": 0,
        "t": 1794296877442.2563,
        "elu": 0.001982223041182687
      },
      {
        "worker": 1,
        "t": 1794296877941.9753,
        "elu": 0.0024352719853781533
      },
      {
        "worker": 2,
        "t": 1794296877950.4536,
        "elu": 0.002272176118918105
      },
      {
        "worker": 0,
        "t": 1794296877952.4692,
        "elu": 0.002263183452903665
      },
      {
        "worker": 1,
        "t": 1794296878447.6387,
        "elu": 0.002686829778579187
      },
      {
        "worker": 2,
        "t": 1794296878459.6108,
        "elu": 0.003130645148817953
      },
      {
        "worker": 0,
        "t": 1794296878459.7583,
        "elu": 0.0027060182677910876
      },
      {
        "worker": 1,
        "t": 1794296878956.914,
        "elu": 0.0024885687286481696
      },
      {
        "worker": 0,
        "t": 1794296878969.321,
        "elu": 0.002113001397328061
      },
      {
        "worker": 2,
        "t": 1794296878969.3745,
        "elu": 0.0025580544543261116
      },
      {
        "worker": 1,
        "t": 1794296879459.4812,
        "elu": 0.0019148844019676906
      },
      {
        "worker": 2,
        "t": 1794296879469.0173,
        "elu": 0.0022683928135997997
      },
      {
        "worker": 0,
        "t": 1794296879470.0525,
        "elu": 0.0020546031417725498
      },
      {
        "worker": 1,
        "t": 1794296879964.4653,
        "elu": 0.0009431047847184536
      },
      {
        "worker": 0,
        "t": 1794296879978.2476,
        "elu": 0.0007553786304714959
      },
      {
        "worker": 2,
        "t": 1794296879979.465,
        "elu": 0.0007289454574862867
      },
      {
        "worker": 1,
        "t": 1794296880464.378,
        "elu": 0.002232223927393589
      },
      {
        "worker": 0,
        "t": 1794296880478.8726,
        "elu": 0.0024142098541871534
      },
      {
        "worker": 2,
        "t": 1794296880480.0757,
        "elu": 0.002723567915576076
      },
      {
        "worker": 1,
        "t": 1794296880966.0803,
        "elu": 0.004060598003388503
      },
      {
        "worker": 2,
        "t": 1794296880983.6816,
        "elu": 0.002774989503103141
      },
      {
        "worker": 0,
        "t": 1794296880984.3213,
        "elu": 0.003435069106785055
      },
      {
        "worker": 1,
        "t": 1794296881473.8257,
        "elu": 0.002844933722408586
      },
      {
        "worker": 0,
        "t": 1794296881487.2585,
        "elu": 0.0024661172776120656
      },
      {
        "worker": 2,
        "t": 1794296881491.2532,
        "elu": 0.0032456627727987346
      },
      {
        "worker": 1,
        "t": 1794296881974.0144,
        "elu": 0.0012372929438017916
      },
      {
        "worker": 0,
        "t": 1794296881994.9187,
        "elu": 0.0012640018194134748
      },
      {
        "worker": 2,
        "t": 1794296882001.0144,
        "elu": 0.001601939475700748
      },
      {
        "worker": 1,
        "t": 1794296882476.2358,
        "elu": 0.0022537125556495352
      },
      {
        "worker": 0,
        "t": 1794296882495.9849,
        "elu": 0.0025746949009072804
      },
      {
        "worker": 2,
        "t": 1794296882508.4014,
        "elu": 0.002527665610093569
      },
      {
        "worker": 1,
        "t": 1794296882977.1523,
        "elu": 0.0023544258804465267
      },
      {
        "worker": 0,
        "t": 1794296882998.411,
        "elu": 0.0028287057233055564
      },
      {
        "worker": 2,
        "t": 1794296883009.301,
        "elu": 0.0029067894507509282
      },
      {
        "worker": 1,
        "t": 1794296883478.5754,
        "elu": 0.002255417419380097
      },
      {
        "worker": 0,
        "t": 1794296883497.9583,
        "elu": 0.0025313531675257663
      },
      {
        "worker": 2,
        "t": 1794296883511.951,
        "elu": 0.00277475803062611
      },
      {
        "worker": 1,
        "t": 1794296883988.7703,
        "elu": 0.0026366904510198436
      },
      {
        "worker": 0,
        "t": 1794296884000.8545,
        "elu": 0.0021464232134494284
      },
      {
        "worker": 2,
        "t": 1794296884013.9248,
        "elu": 0.0023541498014166347
      },
      {
        "worker": 1,
        "t": 1794296884489.3186,
        "elu": 0.0022569602463700057
      },
      {
        "worker": 0,
        "t": 1794296884502.4758,
        "elu": 0.002375271836598483
      },
      {
        "worker": 2,
        "t": 1794296884515.649,
        "elu": 0.001935941865144085
      },
      {
        "worker": 1,
        "t": 1794296884990.317,
        "elu": 0.0024417008571552255
      },
      {
        "worker": 0,
        "t": 1794296885008.3157,
        "elu": 0.0023823265460653827
      },
      {
        "worker": 2,
        "t": 1794296885020.949,
        "elu": 0.002407306608266715
      },
      {
        "worker": 1,
        "t": 1794296885490.0955,
        "elu": 0.0005465073659740023
      },
      {
        "worker": 0,
        "t": 1794296885511.7126,
        "elu": 0.0007141635200891425
      },
      {
        "worker": 2,
        "t": 1794296885521.9316,
        "elu": 0.0007467135219840304
      },
      {
        "worker": 1,
        "t": 1794296886001.2966,
        "elu": 0.0019022781875765685
      },
      {
        "worker": 0,
        "t": 1794296886022.2524,
        "elu": 0.001507278064595097
      },
      {
        "worker": 2,
        "t": 1794296886028.3271,
        "elu": 0.0016178568585717592
      },
      {
        "worker": 1,
        "t": 1794296886505.064,
        "elu": 0.002416306992274293
      },
      {
        "worker": 2,
        "t": 1794296886529.6912,
        "elu": 0.002084219949427734
      },
      {
        "worker": 0,
        "t": 1794296886532.6926,
        "elu": 0.0022606589229080655
      },
      {
        "worker": 1,
        "t": 1794296887014.583,
        "elu": 0.0011115863647646637
      },
      {
        "worker": 2,
        "t": 1794296887039.1028,
        "elu": 0.00107687450841998
      },
      {
        "worker": 0,
        "t": 1794296887042.0527,
        "elu": 0.0010365954066642424
      },
      {
        "worker": 1,
        "t": 1794296887516.8518,
        "elu": 0.002003253921296488
      },
      {
        "worker": 0,
        "t": 1794296887543.4004,
        "elu": 0.0019658469996892657
      },
      {
        "worker": 2,
        "t": 1794296887543.4043,
        "elu": 0.0018784771165959134
      },
      {
        "worker": 1,
        "t": 1794296888026.4077,
        "elu": 0.0021799816188873933
      },
      {
        "worker": 0,
        "t": 1794296888053.3757,
        "elu": 0.0018592231735380482
      },
      {
        "worker": 2,
        "t": 1794296888053.5166,
        "elu": 0.0018427787976849222
      },
      {
        "worker": 1,
        "t": 1794296888528.0342,
        "elu": 0.0031021172793435662
      },
      {
        "worker": 2,
        "t": 1794296888554.399,
        "elu": 0.003361961014958404
      },
      {
        "worker": 0,
        "t": 1794296888555.1523,
        "elu": 0.0029080011378142066
      },
      {
        "worker": 1,
        "t": 1794296889036.6904,
        "elu": 0.0030495930616621664
      },
      {
        "worker": 2,
        "t": 1794296889064.277,
        "elu": 0.0031124340473461325
      },
      {
        "worker": 0,
        "t": 1794296889065.1306,
        "elu": 0.0030600429791824858
      },
      {
        "worker": 1,
        "t": 1794296889542.841,
        "elu": 0.0028088438065082414
      },
      {
        "worker": 2,
        "t": 1794296889566.4697,
        "elu": 0.0031907567793380176
      },
      {
        "worker": 0,
        "t": 1794296889566.9695,
        "elu": 0.003135364017753688
      },
      {
        "worker": 1,
        "t": 1794296890048.1392,
        "elu": 0.0025375755008079674
      },
      {
        "worker": 2,
        "t": 1794296890070.2183,
        "elu": 0.0031150258707112774
      },
      {
        "worker": 0,
        "t": 1794296890071.4722,
        "elu": 0.0031829798737319746
      },
      {
        "worker": 1,
        "t": 1794296890555.5237,
        "elu": 0.0017767426948079698
      },
      {
        "worker": 0,
        "t": 1794296890573.3826,
        "elu": 0.0014780885651357642
      },
      {
        "worker": 2,
        "t": 1794296890575.0198,
        "elu": 0.0019842582559220505
      },
      {
        "worker": 1,
        "t": 1794296891064.8162,
        "elu": 0.0011683343047508136
      },
      {
        "worker": 0,
        "t": 1794296891073.854,
        "elu": 0.0010393169240018824
      },
      {
        "worker": 2,
        "t": 1794296891075.0334,
        "elu": 0.0011612617146454628
      },
      {
        "worker": 1,
        "t": 1794296891566.1792,
        "elu": 0.0026971664692803524
      },
      {
        "worker": 0,
        "t": 1794296891578.5693,
        "elu": 0.0030348910817364046
      },
      {
        "worker": 2,
        "t": 1794296891578.593,
        "elu": 0.00270823782881122
      },
      {
        "worker": 1,
        "t": 1794296892072.4666,
        "elu": 0.0024535891762923214
      },
      {
        "worker": 0,
        "t": 1794296892079.5493,
        "elu": 0.0025025475581397292
      },
      {
        "worker": 2,
        "t": 1794296892083.256,
        "elu": 0.0025548776531749157
      },
      {
        "worker": 1,
        "t": 1794296892573.9768,
        "elu": 0.0014776342897102424
      },
      {
        "worker": 0,
        "t": 1794296892579.842,
        "elu": 0.0011998944196155486
      },
      {
        "worker": 2,
        "t": 1794296892586.7622,
        "elu": 0.0012925618199544655
      },
      {
        "worker": 1,
        "t": 1794296893084.3816,
        "elu": 0.0019969107378278094
      },
      {
        "worker": 0,
        "t": 1794296893090.401,
        "elu": 0.0018658221508291615
      },
      {
        "worker": 2,
        "t": 1794296893094.7173,
        "elu": 0.002115436847704987
      },
      {
        "worker": 1,
        "t": 1794296893587.2188,
        "elu": 0.0030861218499454632
      },
      {
        "worker": 0,
        "t": 1794296893593.3809,
        "elu": 0.0029765466895874436
      },
      {
        "worker": 2,
        "t": 1794296893602.833,
        "elu": 0.00306275230778398
      },
      {
        "worker": 0,
        "t": 1794296894094.1611,
        "elu": 0.0022235774869075868
      },
      {
        "worker": 1,
        "t": 1794296894096.579,
        "elu": 0.0022126852968432213
      },
      {
        "worker": 2,
        "t": 1794296894104.3325,
        "elu": 0.002247128052270939
      },
      {
        "worker": 0,
        "t": 1794296894596.2322,
        "elu": 0.0031892407807229193
      },
      {
        "worker": 1,
        "t": 1794296894602.5964,
        "elu": 0.0032810047514880408
      },
      {
        "worker": 2,
        "t": 1794296894605.0007,
        "elu": 0.003656843501326156
      },
      {
        "worker": 0,
        "t": 1794296895106.049,
        "elu": 0.001494612922042881
      },
      {
        "worker": 1,
        "t": 1794296895108.1758,
        "elu": 0.0012966508131944628
      },
      {
        "worker": 2,
        "t": 1794296895108.468,
        "elu": 0.0012198297960078325
      },
      {
        "worker": 0,
        "t": 1794296895606.6345,
        "elu": 0.0028974956408695514
      },
      {
        "worker": 2,
        "t": 1794296895608.9963,
        "elu": 0.0029907203287471624
      },
      {
        "worker": 1,
        "t": 1794296895616.994,
        "elu": 0.003025711088944917
      },
      {
        "worker": 0,
        "t": 1794296896117.1934,
        "elu": 0.0010730116117939118
      },
      {
        "worker": 1,
        "t": 1794296896117.294,
        "elu": 0.0010647841843128719
      },
      {
        "worker": 2,
        "t": 1794296896119.2024,
        "elu": 0.001227040557809026
      },
      {
        "worker": 2,
        "t": 1794296896622.1482,
        "elu": 0.002399667560594039
      },
      {
        "worker": 1,
        "t": 1794296896623.7847,
        "elu": 0.0023516826299958956
      },
      {
        "worker": 0,
        "t": 1794296896624.9993,
        "elu": 0.0025447411051903544
      },
      {
        "worker": 2,
        "t": 1794296897122.1943,
        "elu": 0.0027228341721751274
      },
      {
        "worker": 1,
        "t": 1794296897123.6965,
        "elu": 0.002681996422110166
      },
      {
        "worker": 0,
        "t": 1794296897128.0508,
        "elu": 0.002414340896973756
      },
      {
        "worker": 1,
        "t": 1794296897624.442,
        "elu": 0.0050258744130231734
      },
      {
        "worker": 2,
        "t": 1794296897626.1858,
        "elu": 0.0016398207985174552
      },
      {
        "worker": 0,
        "t": 1794296897629.4329,
        "elu": 0.0017818183723371528
      },
      {
        "worker": 1,
        "t": 1794296898128.8433,
        "elu": 0.0023380313208829053
      },
      {
        "worker": 2,
        "t": 1794296898128.847,
        "elu": 0.0019499545472805634
      },
      {
        "worker": 0,
        "t": 1794296898134.4563,
        "elu": 0.002196262984513421
      },
      {
        "worker": 2,
        "t": 1794296898633.2197,
        "elu": 0.0032324405502170586
      },
      {
        "worker": 1,
        "t": 1794296898633.3462,
        "elu": 0.0034343380429949634
      },
      {
        "worker": 0,
        "t": 1794296898635.3745,
        "elu": 0.0034077988128892686
      },
      {
        "worker": 2,
        "t": 1794296899134.0352,
        "elu": 0.002914697016293575
      },
      {
        "worker": 1,
        "t": 1794296899136.2388,
        "elu": 0.0031975380513121865
      },
      {
        "worker": 0,
        "t": 1794296899137.54,
        "elu": 0.002666970010102916
      },
      {
        "worker": 2,
        "t": 1794296899635.0059,
        "elu": 0.0023796265527997315
      },
      {
        "worker": 1,
        "t": 1794296899638.7231,
        "elu": 0.00263715053166235
      },
      {
        "worker": 0,
        "t": 1794296899638.873,
        "elu": 0.0025295098973990024
      },
      {
        "worker": 0,
        "t": 1794296900140.8423,
        "elu": 0.0009145123483736961
      },
      {
        "worker": 1,
        "t": 1794296900140.83,
        "elu": 0.0010521028705974369
      },
      {
        "worker": 2,
        "t": 1794296900140.8318,
        "elu": 0.0008604134528812067
      },
      {
        "worker": 2,
        "t": 1794296900641.6335,
        "elu": 0.0027999922982450084
      },
      {
        "worker": 1,
        "t": 1794296900641.7341,
        "elu": 0.002687425108075328
      },
      {
        "worker": 0,
        "t": 1794296900641.9812,
        "elu": 0.002810972020497197
      },
      {
        "worker": 2,
        "t": 1794296901142.609,
        "elu": 0.002253576082449799
      },
      {
        "worker": 1,
        "t": 1794296901146.8762,
        "elu": 0.0020337232977676385
      },
      {
        "worker": 0,
        "t": 1794296901148.1628,
        "elu": 0.002104139126357939
      },
      {
        "worker": 2,
        "t": 1794296901643.655,
        "elu": 0.0009830049630462113
      },
      {
        "worker": 1,
        "t": 1794296901647.3718,
        "elu": 0.0009890698804362842
      },
      {
        "worker": 0,
        "t": 1794296901648.4595,
        "elu": 0.0019534303787716004
      },
      {
        "worker": 2,
        "t": 1794296902145.4426,
        "elu": 0.0033164050719816144
      },
      {
        "worker": 0,
        "t": 1794296902154.7295,
        "elu": 0.0025877967569398292
      },
      {
        "worker": 1,
        "t": 1794296902157.866,
        "elu": 0.0032920916096967285
      },
      {
        "worker": 2,
        "t": 1794296902651.0115,
        "elu": 0.0034748311704427357
      },
      {
        "worker": 0,
        "t": 1794296902657.175,
        "elu": 0.003219985622406141
      },
      {
        "worker": 1,
        "t": 1794296902661.123,
        "elu": 0.003292117158707646
      },
      {
        "worker": 2,
        "t": 1794296903151.8257,
        "elu": 0.0022099553382795337
      },
      {
        "worker": 0,
        "t": 1794296903159.09,
        "elu": 0.0022842919193346847
      },
      {
        "worker": 1,
        "t": 1794296903169.0535,
        "elu": 0.002130968019218396
      },
      {
        "worker": 2,
        "t": 1794296903659.19,
        "elu": 0.003454705685979917
      },
      {
        "worker": 0,
        "t": 1794296903665.3926,
        "elu": 0.003348837613476259
      },
      {
        "worker": 1,
        "t": 1794296903677.3018,
        "elu": 0.0035727965519264187
      },
      {
        "worker": 2,
        "t": 1794296904159.7915,
        "elu": 0.001862491877391804
      },
      {
        "worker": 0,
        "t": 1794296904165.0635,
        "elu": 0.3789663726367663
      },
      {
        "worker": 1,
        "t": 1794296904177.9226,
        "elu": 0.0017762787618464822
      },
      {
        "worker": 2,
        "t": 1794296904662.0889,
        "elu": 0.0006716737784042465
      },
      {
        "worker": 0,
        "t": 1794296904665.2449,
        "elu": 0.485442621335566
      },
      {
        "worker": 1,
        "t": 1794296904678.3555,
        "elu": 0.0008675936299373014
      },
      {
        "worker": 2,
        "t": 1794296905162.9888,
        "elu": 0.0006172332698314759
      },
      {
        "worker": 0,
        "t": 1794296905166.3362,
        "elu": 0.3648099403711702
      },
      {
        "worker": 1,
        "t": 1794296905178.3586,
        "elu": 0.0008299253625250057
      },
      {
        "worker": 2,
        "t": 1794296905666.229,
        "elu": 0.0009931595817103895
      },
      {
        "worker": 0,
        "t": 1794296905666.983,
        "elu": 0.3311924382796328
      },
      {
        "worker": 1,
        "t": 1794296905679.2834,
        "elu": 0.0009449320655889747
      },
      {
        "worker": 0,
        "t": 1794296906168.0908,
        "elu": 0.296359882687008
      },
      {
        "worker": 2,
        "t": 1794296906170.3608,
        "elu": 0.0006798976612709982
      },
      {
        "worker": 1,
        "t": 1794296906179.8782,
        "elu": 0.0005758218576417145
      },
      {
        "worker": 0,
        "t": 1794296906667.9849,
        "elu": 0.3874393616819477
      },
      {
        "worker": 2,
        "t": 1794296906670.2986,
        "elu": 0.0007316831276818518
      },
      {
        "worker": 1,
        "t": 1794296906679.7974,
        "elu": 0.0008733232670423478
      },
      {
        "worker": 0,
        "t": 1794296907168.4639,
        "elu": 0.4802639043902573
      },
      {
        "worker": 2,
        "t": 1794296907170.3662,
        "elu": 0.0007117494851428802
      },
      {
        "worker": 1,
        "t": 1794296907179.34,
        "elu": 0.0007549531464985107
      },
      {
        "worker": 0,
        "t": 1794296907668.591,
        "elu": 0.23780406660281395
      },
      {
        "worker": 2,
        "t": 1794296907670.3613,
        "elu": 0.0008233522104976578
      },
      {
        "worker": 1,
        "t": 1794296907679.926,
        "elu": 0.0008417745139403382
      },
      {
        "worker": 0,
        "t": 1794296908168.385,
        "elu": 0.47273968199750266
      },
      {
        "worker": 2,
        "t": 1794296908170.964,
        "elu": 0.0006776121083380618
      },
      {
        "worker": 1,
        "t": 1794296908181.1582,
        "elu": 0.0006978750164509643
      },
      {
        "worker": 0,
        "t": 1794296908668.2534,
        "elu": 0.48710977554436624
      },
      {
        "worker": 2,
        "t": 1794296908672.1128,
        "elu": 0.000693165221055627
      },
      {
        "worker": 1,
        "t": 1794296908681.8462,
        "elu": 0.0007052062356009963
      },
      {
        "worker": 0,
        "t": 1794296909168.211,
        "elu": 0.4758943802464407
      },
      {
        "worker": 2,
        "t": 1794296909176.9849,
        "elu": 0.0007121554365296668
      },
      {
        "worker": 1,
        "t": 1794296909181.499,
        "elu": 0.000708583718675489
      },
      {
        "worker": 0,
        "t": 1794296909668.7485,
        "elu": 0.09788081514401065
      },
      {
        "worker": 2,
        "t": 1794296909677.9417,
        "elu": 0.000781184421473743
      },
      {
        "worker": 1,
        "t": 1794296909682.9927,
        "elu": 0.0008043605661543283
      },
      {
        "worker": 0,
        "t": 1794296910171.0266,
        "elu": 0.16517192603163316
      },
      {
        "worker": 2,
        "t": 1794296910182.039,
        "elu": 0.0007503611369815725
      },
      {
        "worker": 1,
        "t": 1794296910189.445,
        "elu": 0.0007806121272673993
      },
      {
        "worker": 0,
        "t": 1794296910671.299,
        "elu": 0.38464948933022697
      },
      {
        "worker": 2,
        "t": 1794296910682.9033,
        "elu": 0.0007726754528018299
      },
      {
        "worker": 1,
        "t": 1794296910692.243,
        "elu": 0.0007366352846508747
      },
      {
        "worker": 0,
        "t": 1794296911174.4224,
        "elu": 0.16772002095240424
      },
      {
        "worker": 2,
        "t": 1794296911185.5679,
        "elu": 0.0011122596540331126
      },
      {
        "worker": 1,
        "t": 1794296911195.2344,
        "elu": 0.0010832881295991454
      },
      {
        "worker": 0,
        "t": 1794296911674.116,
        "elu": 0.4566856968770596
      },
      {
        "worker": 2,
        "t": 1794296911685.7744,
        "elu": 0.0007576133529431923
      },
      {
        "worker": 1,
        "t": 1794296911695.9578,
        "elu": 0.0007637402601797534
      },
      {
        "worker": 0,
        "t": 1794296912174.1072,
        "elu": 0.4883253698722525
      },
      {
        "worker": 2,
        "t": 1794296912185.4265,
        "elu": 0.0006950772479346363
      },
      {
        "worker": 1,
        "t": 1794296912196.7922,
        "elu": 0.0007035896730310539
      },
      {
        "worker": 0,
        "t": 1794296912673.9,
        "elu": 0.18651631899436852
      },
      {
        "worker": 2,
        "t": 1794296912690.1616,
        "elu": 0.0010374414390078874
      },
      {
        "worker": 1,
        "t": 1794296912698.389,
        "elu": 0.001008295707762204
      },
      {
        "worker": 0,
        "t": 1794296913174.233,
        "elu": 0.09591987193501753
      },
      {
        "worker": 2,
        "t": 1794296913196.0422,
        "elu": 0.09157604616197391
      },
      {
        "worker": 1,
        "t": 1794296913198.3103,
        "elu": 0.0009627460128140449
      },
      {
        "worker": 0,
        "t": 1794296913674.0874,
        "elu": 0.4519649071170001
      },
      {
        "worker": 1,
        "t": 1794296913698.1143,
        "elu": 0.0008077411081861378
      },
      {
        "worker": 2,
        "t": 1794296913698.1223,
        "elu": 0.011773272391094151
      },
      {
        "worker": 0,
        "t": 1794296914173.9207,
        "elu": 0.3750300573662056
      },
      {
        "worker": 2,
        "t": 1794296914199.7476,
        "elu": 0.0964255031449113
      },
      {
        "worker": 1,
        "t": 1794296914206.9368,
        "elu": 0.000799571131827208
      },
      {
        "worker": 0,
        "t": 1794296914675.2666,
        "elu": 0.03987186425969891
      },
      {
        "worker": 2,
        "t": 1794296914703.2554,
        "elu": 0.0017240072175852108
      },
      {
        "worker": 1,
        "t": 1794296914709.416,
        "elu": 0.001470894346418934
      },
      {
        "worker": 0,
        "t": 1794296915175.1084,
        "elu": 0.524778271545281
      },
      {
        "worker": 2,
        "t": 1794296915203.439,
        "elu": 0.0007928871791826515
      },
      {
        "worker": 1,
        "t": 1794296915210.9268,
        "elu": 0.0007363710090516026
      },
      {
        "worker": 0,
        "t": 1794296915675.02,
        "elu": 0.17760413514345702
      },
      {
        "worker": 2,
        "t": 1794296915703.0618,
        "elu": 0.0014043321031368473
      },
      {
        "worker": 1,
        "t": 1794296915713.828,
        "elu": 0.0011747825717829984
      },
      {
        "worker": 0,
        "t": 1794296916175.6484,
        "elu": 0.4849396345823299
      },
      {
        "worker": 2,
        "t": 1794296916207.5972,
        "elu": 0.000851539579859602
      },
      {
        "worker": 1,
        "t": 1794296916215.2766,
        "elu": 0.00070654647495572
      },
      {
        "worker": 0,
        "t": 1794296916675.1196,
        "elu": 0.48853777172444374
      },
      {
        "worker": 2,
        "t": 1794296916709.4214,
        "elu": 0.002403427197750167
      },
      {
        "worker": 1,
        "t": 1794296916719.9817,
        "elu": 0.0007481382430326212
      },
      {
        "worker": 0,
        "t": 1794296917175.0217,
        "elu": 0.48687592243923067
      },
      {
        "worker": 2,
        "t": 1794296917210.5874,
        "elu": 0.0008635881187832194
      },
      {
        "worker": 1,
        "t": 1794296917221.2844,
        "elu": 0.0007538823837968709
      },
      {
        "worker": 0,
        "t": 1794296917677.242,
        "elu": 0.2569303319580315
      },
      {
        "worker": 2,
        "t": 1794296917710.9883,
        "elu": 0.0013938348890100403
      },
      {
        "worker": 1,
        "t": 1794296917724.0825,
        "elu": 0.0011645805157866555
      },
      {
        "worker": 0,
        "t": 1794296918177.2866,
        "elu": 0.20126481480610703
      },
      {
        "worker": 2,
        "t": 1794296918211.962,
        "elu": 0.0010115318793868146
      },
      {
        "worker": 1,
        "t": 1794296918225.1582,
        "elu": 0.0008314782268652393
      },
      {
        "worker": 0,
        "t": 1794296918677.1267,
        "elu": 0.5431906384832962
      },
      {
        "worker": 2,
        "t": 1794296918717.0486,
        "elu": 0.0010241823659518725
      },
      {
        "worker": 1,
        "t": 1794296918735.475,
        "elu": 0.0007994337700612433
      },
      {
        "worker": 0,
        "t": 1794296919180.7449,
        "elu": 0.039214346514839696
      },
      {
        "worker": 2,
        "t": 1794296919222.9302,
        "elu": 0.002349230077081314
      },
      {
        "worker": 1,
        "t": 1794296919235.3772,
        "elu": 0.0010499618351688287
      },
      {
        "worker": 0,
        "t": 1794296919681.0583,
        "elu": 0.020300715889118366
      },
      {
        "worker": 2,
        "t": 1794296919724.3374,
        "elu": 0.0011239351721498056
      },
      {
        "worker": 1,
        "t": 1794296919736.0083,
        "elu": 0.001202081931252999
      },
      {
        "worker": 0,
        "t": 1794296920181.0728,
        "elu": 0.4849718209639217
      },
      {
        "worker": 2,
        "t": 1794296920225.092,
        "elu": 0.0007878246271337158
      },
      {
        "worker": 1,
        "t": 1794296920237.9746,
        "elu": 0.0007476529751746077
      },
      {
        "worker": 0,
        "t": 1794296920681.8352,
        "elu": 0.4962901078078907
      },
      {
        "worker": 2,
        "t": 1794296920730.132,
        "elu": 0.0007966502836189591
      },
      {
        "worker": 1,
        "t": 1794296920740.1406,
        "elu": 0.0007893414411435459
      },
      {
        "worker": 0,
        "t": 1794296921181.1401,
        "elu": 0.4890368235243124
      },
      {
        "worker": 2,
        "t": 1794296921230.964,
        "elu": 0.0007895318801467391
      },
      {
        "worker": 1,
        "t": 1794296921243.791,
        "elu": 0.0008583352482941718
      },
      {
        "worker": 0,
        "t": 1794296921681.1191,
        "elu": 0.2043551145078931
      },
      {
        "worker": 2,
        "t": 1794296921735.8403,
        "elu": 0.0018069089412402
      },
      {
        "worker": 1,
        "t": 1794296921744.2932,
        "elu": 0.10292765760547395
      },
      {
        "worker": 0,
        "t": 1794296922183.11,
        "elu": 0.11242729727895216
      },
      {
        "worker": 2,
        "t": 1794296922237.742,
        "elu": 0.0009542162271840576
      },
      {
        "worker": 1,
        "t": 1794296922244.6504,
        "elu": 0.08774293143024066
      },
      {
        "worker": 0,
        "t": 1794296922683.054,
        "elu": 0.3349225097747399
      },
      {
        "worker": 2,
        "t": 1794296922737.8606,
        "elu": 0.0009645359069490422
      },
      {
        "worker": 1,
        "t": 1794296922745.183,
        "elu": 0.0014348146481544433
      },
      {
        "worker": 0,
        "t": 1794296923182.9707,
        "elu": 0.47880646906655194
      },
      {
        "worker": 2,
        "t": 1794296923237.5845,
        "elu": 0.0008435625508986293
      },
      {
        "worker": 1,
        "t": 1794296923246.1406,
        "elu": 0.0024768002184569786
      },
      {
        "worker": 0,
        "t": 1794296923683.4456,
        "elu": 0.49032403755274234
      },
      {
        "worker": 2,
        "t": 1794296923737.9905,
        "elu": 0.000666386452728405
      },
      {
        "worker": 1,
        "t": 1794296923748.6016,
        "elu": 0.0009143480811913508
      },
      {
        "worker": 0,
        "t": 1794296924183.9104,
        "elu": 0.4062545537581775
      },
      {
        "worker": 2,
        "t": 1794296924245.591,
        "elu": 0.0017559361228156592
      },
      {
        "worker": 1,
        "t": 1794296924249.0452,
        "elu": 0.001131445120433256
      },
      {
        "worker": 0,
        "t": 1794296924684.823,
        "elu": 0.30169467225816254
      },
      {
        "worker": 1,
        "t": 1794296924750.0874,
        "elu": 0.0015174946354420894
      },
      {
        "worker": 2,
        "t": 1794296924750.871,
        "elu": 0.0012922797258932335
      },
      {
        "worker": 0,
        "t": 1794296925184.7405,
        "elu": 0.21225606547148027
      },
      {
        "worker": 2,
        "t": 1794296925251.922,
        "elu": 0.0012708445387577705
      },
      {
        "worker": 1,
        "t": 1794296925253.7944,
        "elu": 0.0031386100706147562
      },
      {
        "worker": 0,
        "t": 1794296925684.2227,
        "elu": 0.5416422558129536
      },
      {
        "worker": 1,
        "t": 1794296925753.5254,
        "elu": 0.0008225400908725944
      },
      {
        "worker": 2,
        "t": 1794296925756.5518,
        "elu": 0.0008527000129883331
      },
      {
        "worker": 0,
        "t": 1794296926190.1165,
        "elu": 0.40113901250767064
      },
      {
        "worker": 1,
        "t": 1794296926253.291,
        "elu": 0.0008594140673089266
      },
      {
        "worker": 2,
        "t": 1794296926261.9287,
        "elu": 0.0017972823062523571
      },
      {
        "worker": 0,
        "t": 1794296926690.1624,
        "elu": 0.28577231941675424
      },
      {
        "worker": 1,
        "t": 1794296926753.9226,
        "elu": 0.0010134022636653023
      },
      {
        "worker": 2,
        "t": 1794296926763.9727,
        "elu": 0.0009700518094043957
      },
      {
        "worker": 0,
        "t": 1794296927190.0464,
        "elu": 0.20674928786976648
      },
      {
        "worker": 1,
        "t": 1794296927256.0925,
        "elu": 0.001826267072705275
      },
      {
        "worker": 2,
        "t": 1794296927264.5542,
        "elu": 0.0008840673414233103
      },
      {
        "worker": 0,
        "t": 1794296927690.616,
        "elu": 0.48221167740459103
      },
      {
        "worker": 1,
        "t": 1794296927756.7122,
        "elu": 0.0009621610462454872
      },
      {
        "worker": 2,
        "t": 1794296927766.9448,
        "elu": 0.0008591500336927095
      },
      {
        "worker": 0,
        "t": 1794296928191.8381,
        "elu": 0.4058112298237581
      },
      {
        "worker": 1,
        "t": 1794296928264.83,
        "elu": 0.0009319639634514772
      },
      {
        "worker": 2,
        "t": 1794296928277.2183,
        "elu": 0.0017489265929018886
      },
      {
        "worker": 0,
        "t": 1794296928692.1194,
        "elu": 0.2930951432702835
      },
      {
        "worker": 1,
        "t": 1794296928765.9873,
        "elu": 0.0011523468913337538
      },
      {
        "worker": 2,
        "t": 1794296928777.548,
        "elu": 0.0011382683892529474
      },
      {
        "worker": 0,
        "t": 1794296929192.7634,
        "elu": 0.479330092872304
      },
      {
        "worker": 1,
        "t": 1794296929266.5767,
        "elu": 0.0008186329168232057
      },
      {
        "worker": 2,
        "t": 1794296929279.9487,
        "elu": 0.0008233979492529704
      },
      {
        "worker": 0,
        "t": 1794296929692.8904,
        "elu": 0.48221870549247076
      },
      {
        "worker": 1,
        "t": 1794296929766.9749,
        "elu": 0.0018090862086415894
      },
      {
        "worker": 2,
        "t": 1794296929781.165,
        "elu": 0.0008054709710255507
      },
      {
        "worker": 0,
        "t": 1794296930194.0261,
        "elu": 0.26885731733213797
      },
      {
        "worker": 1,
        "t": 1794296930268.2544,
        "elu": 0.000938528532981403
      },
      {
        "worker": 2,
        "t": 1794296930284.2405,
        "elu": 0.002494863176144116
      },
      {
        "worker": 0,
        "t": 1794296930693.937,
        "elu": 0.3719245798516477
      },
      {
        "worker": 1,
        "t": 1794296930769.072,
        "elu": 0.000744791453698807
      },
      {
        "worker": 2,
        "t": 1794296930787.1858,
        "elu": 0.0009104835884599901
      },
      {
        "worker": 0,
        "t": 1794296931194.7732,
        "elu": 0.489950100391818
      },
      {
        "worker": 1,
        "t": 1794296931272.387,
        "elu": 0.0009327463546103734
      },
      {
        "worker": 2,
        "t": 1794296931291.2056,
        "elu": 0.0008517518228219098
      },
      {
        "worker": 0,
        "t": 1794296931694.3167,
        "elu": 0.48021331404350875
      },
      {
        "worker": 1,
        "t": 1794296931772.261,
        "elu": 0.0015429943581590749
      },
      {
        "worker": 2,
        "t": 1794296931791.9739,
        "elu": 0.0008069353914221333
      },
      {
        "worker": 0,
        "t": 1794296932194.0664,
        "elu": 0.48015302548916095
      },
      {
        "worker": 1,
        "t": 1794296932273.1167,
        "elu": 0.0008407429338183587
      },
      {
        "worker": 2,
        "t": 1794296932293.1145,
        "elu": 0.001700314249692734
      },
      {
        "worker": 0,
        "t": 1794296932694.5466,
        "elu": 0.5278809440809098
      },
      {
        "worker": 1,
        "t": 1794296932774.9458,
        "elu": 0.0008729079936315075
      },
      {
        "worker": 2,
        "t": 1794296932795.005,
        "elu": 0.0008786088092404522
      },
      {
        "worker": 0,
        "t": 1794296933194.5286,
        "elu": 0.4013352952725217
      },
      {
        "worker": 1,
        "t": 1794296933278.2468,
        "elu": 0.0008442763833890301
      },
      {
        "worker": 2,
        "t": 1794296933301.9705,
        "elu": 0.0006971305126904233
      },
      {
        "worker": 0,
        "t": 1794296933694.8682,
        "elu": 0.3077925109701127
      },
      {
        "worker": 1,
        "t": 1794296933785.1692,
        "elu": 0.0017117378988500411
      },
      {
        "worker": 2,
        "t": 1794296933803.7563,
        "elu": 0.009850585469033921
      },
      {
        "worker": 0,
        "t": 1794296934194.495,
        "elu": 0.6716125435480836
      },
      {
        "worker": 1,
        "t": 1794296934285.163,
        "elu": 0.5393959051827544
      },
      {
        "worker": 2,
        "t": 1794296934303.432,
        "elu": 0.5333023151454576
      },
      {
        "worker": 0,
        "t": 1794296934694.193,
        "elu": 0.7046376506467402
      },
      {
        "worker": 1,
        "t": 1794296934785.9602,
        "elu": 0.46764527831515484
      },
      {
        "worker": 2,
        "t": 1794296934804.398,
        "elu": 0.46339891332645
      },
      {
        "worker": 0,
        "t": 1794296935196.7725,
        "elu": 0.2936379594554371
      },
      {
        "worker": 1,
        "t": 1794296935295.3455,
        "elu": 0.12592717521915514
      },
      {
        "worker": 2,
        "t": 1794296935307.7576,
        "elu": 0.11352441846498543
      },
      {
        "worker": 0,
        "t": 1794296935698.3298,
        "elu": 0.10457939662266756
      },
      {
        "worker": 1,
        "t": 1794296935794.9062,
        "elu": 0.12727655789043832
      },
      {
        "worker": 2,
        "t": 1794296935808.1611,
        "elu": 0.12049876832737083
      },
      {
        "worker": 0,
        "t": 1794296936203.0767,
        "elu": 0.39493064723494237
      },
      {
        "worker": 1,
        "t": 1794296936298.2344,
        "elu": 0.3008527533681386
      },
      {
        "worker": 2,
        "t": 1794296936308.5652,
        "elu": 0.32962139747931396
      },
      {
        "worker": 0,
        "t": 1794296936703.4912,
        "elu": 0.32231865822275574
      },
      {
        "worker": 1,
        "t": 1794296936798.4116,
        "elu": 0.3039270125981515
      },
      {
        "worker": 2,
        "t": 1794296936808.3726,
        "elu": 0.3033507337596418
      },
      {
        "worker": 0,
        "t": 1794296937203.3425,
        "elu": 0.6731486746351333
      },
      {
        "worker": 1,
        "t": 1794296937298.216,
        "elu": 0.42823574410523135
      },
      {
        "worker": 2,
        "t": 1794296937308.5613,
        "elu": 0.42809716225593153
      },
      {
        "worker": 0,
        "t": 1794296937702.972,
        "elu": 0.7381937729362963
      },
      {
        "worker": 1,
        "t": 1794296937799.4153,
        "elu": 0.40706141337412355
      },
      {
        "worker": 2,
        "t": 1794296937813.0645,
        "elu": 0.3817455698976902
      },
      {
        "worker": 0,
        "t": 1794296938203.123,
        "elu": 0.27176746655463974
      },
      {
        "worker": 1,
        "t": 1794296938299.3394,
        "elu": 0.24016356740032463
      },
      {
        "worker": 2,
        "t": 1794296938312.9116,
        "elu": 0.24463104532488691
      },
      {
        "worker": 0,
        "t": 1794296938705.6833,
        "elu": 0.5276041604287782
      },
      {
        "worker": 1,
        "t": 1794296938800.4639,
        "elu": 0.29735652384868183
      },
      {
        "worker": 2,
        "t": 1794296938815.068,
        "elu": 0.3165914080488013
      },
      {
        "worker": 0,
        "t": 1794296939205.272,
        "elu": 0.5539113834805963
      },
      {
        "worker": 1,
        "t": 1794296939302.9912,
        "elu": 0.4277223551987644
      },
      {
        "worker": 2,
        "t": 1794296939315.5806,
        "elu": 0.4402927696046797
      },
      {
        "worker": 0,
        "t": 1794296939705.0078,
        "elu": 0.34938540366027937
      },
      {
        "worker": 1,
        "t": 1794296939808.0837,
        "elu": 0.15603808223978172
      },
      {
        "worker": 2,
        "t": 1794296939817.9175,
        "elu": 0.15936185956496718
      },
      {
        "worker": 0,
        "t": 1794296940205.148,
        "elu": 0.31466914753458824
      },
      {
        "worker": 1,
        "t": 1794296940308.1636,
        "elu": 0.23851265537537292
      },
      {
        "worker": 2,
        "t": 1794296940318.2744,
        "elu": 0.24829945301900336
      },
      {
        "worker": 0,
        "t": 1794296940704.9565,
        "elu": 0.7551145180292981
      },
      {
        "worker": 1,
        "t": 1794296940808.5403,
        "elu": 0.47269265634734287
      },
      {
        "worker": 2,
        "t": 1794296940818.8088,
        "elu": 0.4723796589579501
      },
      {
        "worker": 0,
        "t": 1794296941204.9558,
        "elu": 0.7470492650661664
      },
      {
        "worker": 1,
        "t": 1794296941308.052,
        "elu": 0.4586754721566634
      },
      {
        "worker": 2,
        "t": 1794296941318.1226,
        "elu": 0.46797286898401486
      },
      {
        "worker": 0,
        "t": 1794296941705.576,
        "elu": 0.7440868279517263
      },
      {
        "worker": 1,
        "t": 1794296941808.227,
        "elu": 0.459057759101204
      },
      {
        "worker": 2,
        "t": 1794296941818.058,
        "elu": 0.46262223033658967
      },
      {
        "worker": 0,
        "t": 1794296942205.218,
        "elu": 0.7285714879307638
      },
      {
        "worker": 1,
        "t": 1794296942307.9575,
        "elu": 0.45294799139834296
      },
      {
        "worker": 2,
        "t": 1794296942318.3682,
        "elu": 0.45068528906882
      },
      {
        "worker": 0,
        "t": 1794296942704.9175,
        "elu": 0.7262435001173643
      },
      {
        "worker": 1,
        "t": 1794296942808.546,
        "elu": 0.5284976018362727
      },
      {
        "worker": 2,
        "t": 1794296942818.0464,
        "elu": 0.44887585879587316
      },
      {
        "worker": 0,
        "t": 1794296943205.1562,
        "elu": 0.7230499554804406
      },
      {
        "worker": 1,
        "t": 1794296943309.182,
        "elu": 0.42674125282344544
      },
      {
        "worker": 2,
        "t": 1794296943318.3684,
        "elu": 0.42773615108693447
      },
      {
        "worker": 0,
        "t": 1794296943704.9324,
        "elu": 0.17692356399176698
      },
      {
        "worker": 1,
        "t": 1794296943809.0618,
        "elu": 0.14289070430131234
      },
      {
        "worker": 2,
        "t": 1794296943818.1316,
        "elu": 0.15319565584677083
      },
      {
        "worker": 0,
        "t": 1794296944204.9453,
        "elu": 0.6977422700905185
      },
      {
        "worker": 1,
        "t": 1794296944309.9536,
        "elu": 0.40520226665245695
      },
      {
        "worker": 2,
        "t": 1794296944319.9788,
        "elu": 0.4090639739581304
      },
      {
        "worker": 0,
        "t": 1794296944707.3948,
        "elu": 0.25857282287398725
      },
      {
        "worker": 1,
        "t": 1794296944811.0137,
        "elu": 0.09154902801590395
      },
      {
        "worker": 2,
        "t": 1794296944823.129,
        "elu": 0.09244221895737188
      },
      {
        "worker": 0,
        "t": 1794296945208.1616,
        "elu": 0.12632914101723314
      },
      {
        "worker": 1,
        "t": 1794296945310.9363,
        "elu": 0.10592781102976247
      },
      {
        "worker": 2,
        "t": 1794296945323.015,
        "elu": 0.11764136529191994
      },
      {
        "worker": 0,
        "t": 1794296945707.932,
        "elu": 0.6340721694366668
      },
      {
        "worker": 1,
        "t": 1794296945811.0942,
        "elu": 0.473983493333356
      },
      {
        "worker": 2,
        "t": 1794296945823.311,
        "elu": 0.466348117266639
      },
      {
        "worker": 0,
        "t": 1794296946210.497,
        "elu": 0.5669987762460829
      },
      {
        "worker": 1,
        "t": 1794296946313.963,
        "elu": 0.2613959388605599
      },
      {
        "worker": 2,
        "t": 1794296946327.6523,
        "elu": 0.24906835030499277
      },
      {
        "worker": 0,
        "t": 1794296946710.335,
        "elu": 0.47872879341804686
      },
      {
        "worker": 1,
        "t": 1794296946824.0854,
        "elu": 0.2962277021403815
      },
      {
        "worker": 2,
        "t": 1794296946827.124,
        "elu": 0.3073489788945711
      },
      {
        "worker": 0,
        "t": 1794296947210.0159,
        "elu": 0.11775339767217761
      },
      {
        "worker": 1,
        "t": 1794296947324.4214,
        "elu": 0.17525807441306568
      },
      {
        "worker": 2,
        "t": 1794296947327.7637,
        "elu": 0.19388679494524158
      },
      {
        "worker": 0,
        "t": 1794296947709.971,
        "elu": 0.7459009770206185
      },
      {
        "worker": 1,
        "t": 1794296947824.3423,
        "elu": 0.44120640452866317
      },
      {
        "worker": 2,
        "t": 1794296947826.995,
        "elu": 0.5347679832212376
      },
      {
        "worker": 0,
        "t": 1794296948209.9438,
        "elu": 0.764664855338186
      },
      {
        "worker": 1,
        "t": 1794296948324.371,
        "elu": 0.4610034517091598
      },
      {
        "worker": 2,
        "t": 1794296948327.9458,
        "elu": 0.4636863558630744
      },
      {
        "worker": 0,
        "t": 1794296948709.0508,
        "elu": 0.7388085089397163
      },
      {
        "worker": 1,
        "t": 1794296948823.0676,
        "elu": 0.4587921174797573
      },
      {
        "worker": 2,
        "t": 1794296948827.1477,
        "elu": 0.44639467434009644
      },
      {
        "worker": 0,
        "t": 1794296949210.1536,
        "elu": 0.7292866172190763
      },
      {
        "worker": 1,
        "t": 1794296949326.5085,
        "elu": 0.43144788296059466
      },
      {
        "worker": 2,
        "t": 1794296949328.546,
        "elu": 0.4135687139354596
      },
      {
        "worker": 0,
        "t": 1794296949710.1304,
        "elu": 0.6996116468855955
      },
      {
        "worker": 1,
        "t": 1794296949826.5798,
        "elu": 0.4675598443170198
      },
      {
        "worker": 2,
        "t": 1794296949828.7031,
        "elu": 0.47482885187638246
      },
      {
        "worker": 0,
        "t": 1794296950210.0095,
        "elu": 0.7377432021090057
      },
      {
        "worker": 1,
        "t": 1794296950327.188,
        "elu": 0.43365912032099563
      },
      {
        "worker": 2,
        "t": 1794296950328.0642,
        "elu": 0.4347040432329814
      },
      {
        "worker": 0,
        "t": 1794296950710.1875,
        "elu": 0.366061984328309
      },
      {
        "worker": 2,
        "t": 1794296950830.4692,
        "elu": 0.11886426002359426
      },
      {
        "worker": 1,
        "t": 1794296950830.6594,
        "elu": 0.12810243466058185
      },
      {
        "worker": 0,
        "t": 1794296951210.116,
        "elu": 0.04259928579753366
      },
      {
        "worker": 1,
        "t": 1794296951331.7751,
        "elu": 0.043273688295384326
      },
      {
        "worker": 2,
        "t": 1794296951332.606,
        "elu": 0.0640993370724977
      },
      {
        "worker": 0,
        "t": 1794296951711.6367,
        "elu": 0.5053251149876066
      },
      {
        "worker": 1,
        "t": 1794296951831.5027,
        "elu": 0.4008675742956822
      },
      {
        "worker": 2,
        "t": 1794296951832.3313,
        "elu": 0.40641071873374013
      },
      {
        "worker": 0,
        "t": 1794296952210.911,
        "elu": 0.3582318601317111
      },
      {
        "worker": 1,
        "t": 1794296952331.0522,
        "elu": 0.23158966210846307
      },
      {
        "worker": 2,
        "t": 1794296952332.0662,
        "elu": 0.2323149600366812
      },
      {
        "worker": 0,
        "t": 1794296952711.9521,
        "elu": 0.31421757762020464
      },
      {
        "worker": 1,
        "t": 1794296952831.091,
        "elu": 0.2059785763516916
      },
      {
        "worker": 2,
        "t": 1794296952832.131,
        "elu": 0.19902978690941017
      },
      {
        "worker": 0,
        "t": 1794296953211.9292,
        "elu": 0.7328805388805365
      },
      {
        "worker": 1,
        "t": 1794296953330.9187,
        "elu": 0.4544116511995482
      },
      {
        "worker": 2,
        "t": 1794296953332.0623,
        "elu": 0.45220238880870856
      },
      {
        "worker": 0,
        "t": 1794296953713.0251,
        "elu": 0.3734357470867185
      },
      {
        "worker": 2,
        "t": 1794296953834.4543,
        "elu": 0.12462232696119933
      },
      {
        "worker": 1,
        "t": 1794296953839.1482,
        "elu": 0.1268806097003488
      },
      {
        "worker": 0,
        "t": 1794296954212.9941,
        "elu": 0.404385580978254
      },
      {
        "worker": 2,
        "t": 1794296954334.9468,
        "elu": 0.31878778714697453
      },
      {
        "worker": 1,
        "t": 1794296954338.2388,
        "elu": 0.3219081107287983
      },
      {
        "worker": 0,
        "t": 1794296954713.219,
        "elu": 0.3593639750598754
      },
      {
        "worker": 2,
        "t": 1794296954835.0754,
        "elu": 0.2257930961520025
      },
      {
        "worker": 1,
        "t": 1794296954839.9014,
        "elu": 0.2350238929518208
      },
      {
        "worker": 0,
        "t": 1794296955213.409,
        "elu": 0.7308226631505517
      },
      {
        "worker": 2,
        "t": 1794296955335.3752,
        "elu": 0.46668104588401993
      },
      {
        "worker": 1,
        "t": 1794296955338.9192,
        "elu": 0.4629448921495703
      },
      {
        "worker": 0,
        "t": 1794296955712.3823,
        "elu": 0.3311169800109242
      },
      {
        "worker": 2,
        "t": 1794296955836.0652,
        "elu": 0.21646869376875094
      },
      {
        "worker": 1,
        "t": 1794296955838.9944,
        "elu": 0.21062263279796384
      },
      {
        "worker": 0,
        "t": 1794296956212.9104,
        "elu": 0.34238193278993634
      },
      {
        "worker": 2,
        "t": 1794296956336.61,
        "elu": 0.2147450051780254
      },
      {
        "worker": 1,
        "t": 1794296956339.5977,
        "elu": 0.21479492828700505
      },
      {
        "worker": 0,
        "t": 1794296956713.3042,
        "elu": 0.34014691368266503
      },
      {
        "worker": 2,
        "t": 1794296956837.107,
        "elu": 0.21306254407424108
      },
      {
        "worker": 1,
        "t": 1794296956839.2551,
        "elu": 0.2860371294139425
      },
      {
        "worker": 0,
        "t": 1794296957212.9207,
        "elu": 0.2379949211369308
      },
      {
        "worker": 2,
        "t": 1794296957337.42,
        "elu": 0.07598750092779707
      },
      {
        "worker": 1,
        "t": 1794296957339.009,
        "elu": 0.07850428256562611
      },
      {
        "worker": 0,
        "t": 1794296957713.7778,
        "elu": 0.5722809355077324
      },
      {
        "worker": 2,
        "t": 1794296957837.188,
        "elu": 0.4466311826697695
      },
      {
        "worker": 1,
        "t": 1794296957838.9978,
        "elu": 0.42590490647102763
      },
      {
        "worker": 0,
        "t": 1794296958213.44,
        "elu": 0.7239918418863012
      },
      {
        "worker": 2,
        "t": 1794296958337.5483,
        "elu": 0.4402774938187414
      },
      {
        "worker": 1,
        "t": 1794296958338.927,
        "elu": 0.4394492514031867
      },
      {
        "worker": 0,
        "t": 1794296958713.197,
        "elu": 0.7376464113898451
      },
      {
        "worker": 2,
        "t": 1794296958838.134,
        "elu": 0.47110829455558295
      },
      {
        "worker": 1,
        "t": 1794296958840.1987,
        "elu": 0.458496528064622
      },
      {
        "worker": 0,
        "t": 1794296959215.0032,
        "elu": 0.3963556187560652
      },
      {
        "worker": 2,
        "t": 1794296959337.9138,
        "elu": 0.07645611656002806
      },
      {
        "worker": 1,
        "t": 1794296959340.0679,
        "elu": 0.0961832923480383
      },
      {
        "worker": 0,
        "t": 1794296959714.9185,
        "elu": 0.3428580211765797
      },
      {
        "worker": 2,
        "t": 1794296959837.9092,
        "elu": 0.3454601938859293
      },
      {
        "worker": 1,
        "t": 1794296959840.034,
        "elu": 0.31390840502956474
      },
      {
        "worker": 0,
        "t": 1794296960215.4421,
        "elu": 0.6828232885498103
      },
      {
        "worker": 2,
        "t": 1794296960338.5537,
        "elu": 0.4797158896865962
      },
      {
        "worker": 1,
        "t": 1794296960340.499,
        "elu": 0.4294187841192125
      },
      {
        "worker": 0,
        "t": 1794296960715.1084,
        "elu": 0.3613321749549586
      },
      {
        "worker": 2,
        "t": 1794296960839.4268,
        "elu": 0.22850203202561833
      },
      {
        "worker": 1,
        "t": 1794296960839.9946,
        "elu": 0.22815026837458596
      },
      {
        "worker": 0,
        "t": 1794296961215.0977,
        "elu": 0.4106308358725932
      },
      {
        "worker": 2,
        "t": 1794296961339.089,
        "elu": 0.21484582336691554
      },
      {
        "worker": 1,
        "t": 1794296961341.0576,
        "elu": 0.21877979408277817
      },
      {
        "worker": 0,
        "t": 1794296961715.8267,
        "elu": 0.6630027902547821
      },
      {
        "worker": 2,
        "t": 1794296961839.464,
        "elu": 0.45457582724338375
      },
      {
        "worker": 1,
        "t": 1794296961841.0237,
        "elu": 0.45507616228324727
      },
      {
        "worker": 0,
        "t": 1794296962215.0374,
        "elu": 0.3203492161429508
      },
      {
        "worker": 2,
        "t": 1794296962339.9934,
        "elu": 0.1786716260219505
      },
      {
        "worker": 1,
        "t": 1794296962341.0083,
        "elu": 0.2650781380751165
      },
      {
        "worker": 0,
        "t": 1794296962715.1614,
        "elu": 0.7216538556233184
      },
      {
        "worker": 2,
        "t": 1794296962840.447,
        "elu": 0.42216256444929556
      },
      {
        "worker": 1,
        "t": 1794296962841.2307,
        "elu": 0.43141874168958416
      },
      {
        "worker": 0,
        "t": 1794296963214.9624,
        "elu": 0.6984093312111384
      },
      {
        "worker": 1,
        "t": 1794296963342.2021,
        "elu": 0.33033961615551805
      },
      {
        "worker": 2,
        "t": 1794296963344.7017,
        "elu": 0.33921757087508925
      },
      {
        "worker": 0,
        "t": 1794296963721.2773,
        "elu": 0.048949869847161105
      },
      {
        "worker": 1,
        "t": 1794296963843.0137,
        "elu": 0.10335931082610678
      },
      {
        "worker": 2,
        "t": 1794296963843.946,
        "elu": 0.09704635208394036
      },
      {
        "worker": 0,
        "t": 1794296964222.1912,
        "elu": 0.6577392964118611
      },
      {
        "worker": 1,
        "t": 1794296964343.0664,
        "elu": 0.7075111639631533
      },
      {
        "worker": 2,
        "t": 1794296964344.1377,
        "elu": 0.6352060737515458
      },
      {
        "worker": 0,
        "t": 1794296964722.1238,
        "elu": 0.8404329749086114
      },
      {
        "worker": 1,
        "t": 1794296964843.0745,
        "elu": 0.7377712516124045
      },
      {
        "worker": 2,
        "t": 1794296964845.1775,
        "elu": 0.6788150159291938
      },
      {
        "worker": 0,
        "t": 1794296965221.9646,
        "elu": 0.76363154476057
      },
      {
        "worker": 1,
        "t": 1794296965343.0967,
        "elu": 0.7589292398991981
      },
      {
        "worker": 2,
        "t": 1794296965345.344,
        "elu": 0.6079690763208486
      },
      {
        "worker": 0,
        "t": 1794296965722.6345,
        "elu": 0.48974887834214215
      },
      {
        "worker": 1,
        "t": 1794296965842.9165,
        "elu": 0.39535852800735305
      },
      {
        "worker": 2,
        "t": 1794296965845.286,
        "elu": 0.38116680392458746
      },
      {
        "worker": 0,
        "t": 1794296966224.2197,
        "elu": 0.7874056327532193
      },
      {
        "worker": 1,
        "t": 1794296966343.1096,
        "elu": 0.7318535066723949
      },
      {
        "worker": 2,
        "t": 1794296966345.3162,
        "elu": 0.6884332387964751
      },
      {
        "worker": 0,
        "t": 1794296966724.0188,
        "elu": 0.4490802557962227
      },
      {
        "worker": 1,
        "t": 1794296966844.8315,
        "elu": 0.3063940115347915
      },
      {
        "worker": 2,
        "t": 1794296966847.7334,
        "elu": 0.26340863948685533
      },
      {
        "worker": 0,
        "t": 1794296967223.9978,
        "elu": 0.26962110303513676
      },
      {
        "worker": 1,
        "t": 1794296967344.1475,
        "elu": 0.34511355781637104
      },
      {
        "worker": 2,
        "t": 1794296967347.374,
        "elu": 0.30852012183562566
      },
      {
        "worker": 0,
        "t": 1794296967725.2942,
        "elu": 0.7050654813227039
      },
      {
        "worker": 1,
        "t": 1794296967844.4824,
        "elu": 0.6732083901288538
      },
      {
        "worker": 2,
        "t": 1794296967846.9504,
        "elu": 0.6258956543744759
      },
      {
        "worker": 0,
        "t": 1794296968225.2688,
        "elu": 0.3205830522843393
      },
      {
        "worker": 1,
        "t": 1794296968345.267,
        "elu": 0.15466847280259635
      },
      {
        "worker": 2,
        "t": 1794296968348.3462,
        "elu": 0.0963911311520515
      },
      {
        "worker": 0,
        "t": 1794296968725.1274,
        "elu": 0.46204445396597316
      },
      {
        "worker": 1,
        "t": 1794296968846.23,
        "elu": 0.5763044346893884
      },
      {
        "worker": 2,
        "t": 1794296968848.9714,
        "elu": 0.542416309141651
      },
      {
        "worker": 0,
        "t": 1794296969225.0872,
        "elu": 0.7876700046734124
      },
      {
        "worker": 1,
        "t": 1794296969346.5166,
        "elu": 0.7531464606832711
      },
      {
        "worker": 2,
        "t": 1794296969349.1655,
        "elu": 0.6996230981672299
      },
      {
        "worker": 0,
        "t": 1794296969725.2708,
        "elu": 0.8091760073482626
      },
      {
        "worker": 1,
        "t": 1794296969846.2607,
        "elu": 0.7510556720550918
      },
      {
        "worker": 2,
        "t": 1794296969849.745,
        "elu": 0.6886574516637847
      },
      {
        "worker": 0,
        "t": 1794296970225.225,
        "elu": 0.783380485099117
      },
      {
        "worker": 1,
        "t": 1794296970346.0337,
        "elu": 0.7201915955942654
      },
      {
        "worker": 2,
        "t": 1794296970349.1062,
        "elu": 0.7006744961711028
      },
      {
        "worker": 0,
        "t": 1794296970725.3284,
        "elu": 0.8096968966934003
      },
      {
        "worker": 1,
        "t": 1794296970848.5808,
        "elu": 0.5665639036972858
      },
      {
        "worker": 2,
        "t": 1794296970848.9785,
        "elu": 0.4958353305749024
      },
      {
        "worker": 0,
        "t": 1794296971225.4812,
        "elu": 0.47256491875166656
      },
      {
        "worker": 1,
        "t": 1794296971347.9678,
        "elu": 0.630470546541591
      },
      {
        "worker": 2,
        "t": 1794296971349.1167,
        "elu": 0.6408211995704284
      },
      {
        "worker": 0,
        "t": 1794296971725.3613,
        "elu": 0.8168693349370618
      },
      {
        "worker": 1,
        "t": 1794296971848.103,
        "elu": 0.7471704068117829
      },
      {
        "worker": 2,
        "t": 1794296971849.0134,
        "elu": 0.6891202838980828
      },
      {
        "worker": 0,
        "t": 1794296972225.1345,
        "elu": 0.7780246909840972
      },
      {
        "worker": 1,
        "t": 1794296972348.415,
        "elu": 0.7012916939699995
      },
      {
        "worker": 2,
        "t": 1794296972349.04,
        "elu": 0.6673957368026557
      },
      {
        "worker": 0,
        "t": 1794296972725.4646,
        "elu": 0.7844476020808062
      },
      {
        "worker": 1,
        "t": 1794296972847.9258,
        "elu": 0.7890137950398748
      },
      {
        "worker": 2,
        "t": 1794296972849.1636,
        "elu": 0.7212196706753251
      },
      {
        "worker": 0,
        "t": 1794296973225.7524,
        "elu": 0.8411995261978015
      },
      {
        "worker": 1,
        "t": 1794296973348.135,
        "elu": 0.7454458043587854
      },
      {
        "worker": 2,
        "t": 1794296973349.3467,
        "elu": 0.7466073888983079
      },
      {
        "worker": 0,
        "t": 1794296973725.1,
        "elu": 0.8415338817257412
      },
      {
        "worker": 1,
        "t": 1794296973848.3862,
        "elu": 0.7726888422255832
      },
      {
        "worker": 2,
        "t": 1794296973849.8262,
        "elu": 0.7164082458860327
      },
      {
        "worker": 0,
        "t": 1794296974224.9182,
        "elu": 0.8123051872876977
      },
      {
        "worker": 1,
        "t": 1794296974348.0723,
        "elu": 0.7448038996193341
      },
      {
        "worker": 2,
        "t": 1794296974349.2864,
        "elu": 0.6850175353507275
      },
      {
        "worker": 0,
        "t": 1794296974724.525,
        "elu": 0.5807690395051356
      },
      {
        "worker": 1,
        "t": 1794296974848.881,
        "elu": 0.40588414952275054
      },
      {
        "worker": 2,
        "t": 1794296974849.006,
        "elu": 0.3824574535184535
      },
      {
        "worker": 0,
        "t": 1794296975225.2283,
        "elu": 0.6650236091768116
      },
      {
        "worker": 1,
        "t": 1794296975348.5974,
        "elu": 0.7793629955717651
      },
      {
        "worker": 2,
        "t": 1794296975349.0125,
        "elu": 0.7134784948814831
      },
      {
        "worker": 0,
        "t": 1794296975725.9023,
        "elu": 0.3742952432843775
      },
      {
        "worker": 2,
        "t": 1794296975849.3193,
        "elu": 0.15442115267843695
      },
      {
        "worker": 1,
        "t": 1794296975849.432,
        "elu": 0.14458977620075072
      },
      {
        "worker": 0,
        "t": 1794296976227.4707,
        "elu": 0.5004945743140446
      },
      {
        "worker": 2,
        "t": 1794296976349.6956,
        "elu": 0.594201488689988
      },
      {
        "worker": 1,
        "t": 1794296976351.0444,
        "elu": 0.6594613273388091
      },
      {
        "worker": 0,
        "t": 1794296976727.8518,
        "elu": 0.46728658959271374
      },
      {
        "worker": 2,
        "t": 1794296976848.9272,
        "elu": 0.3782437899016208
      },
      {
        "worker": 1,
        "t": 1794296976851.5747,
        "elu": 0.3755256847320244
      },
      {
        "worker": 0,
        "t": 1794296977227.1577,
        "elu": 0.7947673446471573
      },
      {
        "worker": 2,
        "t": 1794296977349.3364,
        "elu": 0.659952243094498
      },
      {
        "worker": 1,
        "t": 1794296977351.4446,
        "elu": 0.7100147923183048
      },
      {
        "worker": 0,
        "t": 1794296977727.0535,
        "elu": 0.8183001116161479
      },
      {
        "worker": 2,
        "t": 1794296977849.2092,
        "elu": 0.7094268388184884
      },
      {
        "worker": 1,
        "t": 1794296977851.448,
        "elu": 0.7627179977041307
      },
      {
        "worker": 0,
        "t": 1794296978227.452,
        "elu": 0.8196878679342965
      },
      {
        "worker": 2,
        "t": 1794296978349.325,
        "elu": 0.704873748658499
      },
      {
        "worker": 1,
        "t": 1794296978351.2974,
        "elu": 0.7413490740501439
      },
      {
        "worker": 0,
        "t": 1794296978732.7002,
        "elu": 0.5144249617207445
      },
      {
        "worker": 2,
        "t": 1794296978849.7349,
        "elu": 0.31919878845803795
      },
      {
        "worker": 1,
        "t": 1794296978855.476,
        "elu": 0.3228830546589261
      },
      {
        "worker": 0,
        "t": 1794296979232.0547,
        "elu": 0.16129519220492725
      },
      {
        "worker": 2,
        "t": 1794296979350.2393,
        "elu": 0.1607999477653556
      },
      {
        "worker": 1,
        "t": 1794296979356.5493,
        "elu": 0.1919492641144764
      },
      {
        "worker": 0,
        "t": 1794296979733.9246,
        "elu": 0.15049986029980114
      },
      {
        "worker": 2,
        "t": 1794296979851.128,
        "elu": 0.20936355300656898
      },
      {
        "worker": 1,
        "t": 1794296979856.0312,
        "elu": 0.2185166998749396
      },
      {
        "worker": 0,
        "t": 1794296980234.5173,
        "elu": 0.22517886892828262
      },
      {
        "worker": 2,
        "t": 1794296980351.7434,
        "elu": 0.17739101960040687
      },
      {
        "worker": 1,
        "t": 1794296980356.6707,
        "elu": 0.19174301701390653
      },
      {
        "worker": 0,
        "t": 1794296980735.2998,
        "elu": 0.3902938982377931
      },
      {
        "worker": 2,
        "t": 1794296980854.718,
        "elu": 0.25698007851923466
      },
      {
        "worker": 1,
        "t": 1794296980856.3103,
        "elu": 0.23866801207048519
      },
      {
        "worker": 0,
        "t": 1794296981235.2927,
        "elu": 0.2619099091577525
      },
      {
        "worker": 2,
        "t": 1794296981355.1887,
        "elu": 0.18876652877091804
      },
      {
        "worker": 1,
        "t": 1794296981356.786,
        "elu": 0.2689192361335772
      },
      {
        "worker": 0,
        "t": 1794296981736.258,
        "elu": 0.23916717110256167
      },
      {
        "worker": 2,
        "t": 1794296981855.4917,
        "elu": 0.19036544915336215
      },
      {
        "worker": 1,
        "t": 1794296981856.658,
        "elu": 0.17405883827889657
      },
      {
        "worker": 0,
        "t": 1794296982239.186,
        "elu": 0.13819710201119376
      },
      {
        "worker": 2,
        "t": 1794296982355.8591,
        "elu": 0.16038786887614756
      },
      {
        "worker": 1,
        "t": 1794296982356.9817,
        "elu": 0.2519205376107127
      },
      {
        "worker": 0,
        "t": 1794296982740.0938,
        "elu": 0.3485140356839724
      },
      {
        "worker": 2,
        "t": 1794296982856.3042,
        "elu": 0.2690295012775995
      },
      {
        "worker": 1,
        "t": 1794296982858.0498,
        "elu": 0.20706655521203768
      },
      {
        "worker": 0,
        "t": 1794296983242.3508,
        "elu": 0.20967651335726675
      },
      {
        "worker": 2,
        "t": 1794296983357.2366,
        "elu": 0.1256771760927289
      },
      {
        "worker": 1,
        "t": 1794296983362.4517,
        "elu": 0.12279105929235731
      },
      {
        "worker": 0,
        "t": 1794296983742.6077,
        "elu": 0.21243668671085078
      },
      {
        "worker": 2,
        "t": 1794296983857.9045,
        "elu": 0.2078488665884952
      },
      {
        "worker": 1,
        "t": 1794296983862.132,
        "elu": 0.15349512770483328
      },
      {
        "worker": 0,
        "t": 1794296984244.2112,
        "elu": 0.24926314925448007
      },
      {
        "worker": 2,
        "t": 1794296984358.8027,
        "elu": 0.23458462196118174
      },
      {
        "worker": 1,
        "t": 1794296984362.9143,
        "elu": 0.26314196165563536
      },
      {
        "worker": 0,
        "t": 1794296984744.2395,
        "elu": 0.30751161788814446
      },
      {
        "worker": 2,
        "t": 1794296984858.116,
        "elu": 0.30658145844094176
      },
      {
        "worker": 1,
        "t": 1794296984862.5195,
        "elu": 0.18956842991081482
      },
      {
        "worker": 0,
        "t": 1794296985244.1108,
        "elu": 0.30309152613182383
      },
      {
        "worker": 1,
        "t": 1794296985362.052,
        "elu": 0.14108056365388544
      },
      {
        "worker": 2,
        "t": 1794296985362.2175,
        "elu": 0.20759946642821867
      },
      {
        "worker": 0,
        "t": 1794296985746.2615,
        "elu": 0.2555371108746784
      },
      {
        "worker": 1,
        "t": 1794296985862.1868,
        "elu": 0.20315003428719164
      },
      {
        "worker": 2,
        "t": 1794296985862.7683,
        "elu": 0.20880632470966545
      },
      {
        "worker": 0,
        "t": 1794296986246.9834,
        "elu": 0.4310191581095519
      },
      {
        "worker": 1,
        "t": 1794296986362.925,
        "elu": 0.24835936518850324
      },
      {
        "worker": 2,
        "t": 1794296986362.2415,
        "elu": 0.2646581942963008
      },
      {
        "worker": 0,
        "t": 1794296986747.4216,
        "elu": 0.298750336624082
      },
      {
        "worker": 2,
        "t": 1794296986862.24,
        "elu": 0.2749680670093043
      },
      {
        "worker": 1,
        "t": 1794296986863.092,
        "elu": 0.25293776201579315
      },
      {
        "worker": 0,
        "t": 1794296987246.9163,
        "elu": 0.19086637707979331
      },
      {
        "worker": 2,
        "t": 1794296987362.1746,
        "elu": 0.2503029006249083
      },
      {
        "worker": 1,
        "t": 1794296987366.1074,
        "elu": 0.2863233336569974
      },
      {
        "worker": 0,
        "t": 1794296987747.177,
        "elu": 0.30068711174625196
      },
      {
        "worker": 2,
        "t": 1794296987863.2366,
        "elu": 0.25475726739176235
      },
      {
        "worker": 1,
        "t": 1794296987870.7112,
        "elu": 0.21435228685666272
      },
      {
        "worker": 0,
        "t": 1794296988247.872,
        "elu": 0.18878175249004703
      },
      {
        "worker": 2,
        "t": 1794296988365.908,
        "elu": 0.2536604474306553
      },
      {
        "worker": 1,
        "t": 1794296988370.1394,
        "elu": 0.2288319320815179
      },
      {
        "worker": 0,
        "t": 1794296988747.7642,
        "elu": 0.23203229917993015
      },
      {
        "worker": 2,
        "t": 1794296988867.5415,
        "elu": 0.20773816616589463
      },
      {
        "worker": 1,
        "t": 1794296988871.5808,
        "elu": 0.35953537234985167
      },
      {
        "worker": 0,
        "t": 1794296989247.189,
        "elu": 0.22260549380263098
      },
      {
        "worker": 2,
        "t": 1794296989367.0625,
        "elu": 0.1462681620293166
      },
      {
        "worker": 1,
        "t": 1794296989371.8005,
        "elu": 0.16349988372772753
      },
      {
        "worker": 0,
        "t": 1794296989747.5393,
        "elu": 0.2816651411684987
      },
      {
        "worker": 2,
        "t": 1794296989867.1333,
        "elu": 0.19052821368053713
      },
      {
        "worker": 1,
        "t": 1794296989871.1602,
        "elu": 0.2246074828348532
      },
      {
        "worker": 0,
        "t": 1794296990247.8083,
        "elu": 0.20002367007772784
      },
      {
        "worker": 2,
        "t": 1794296990367.5332,
        "elu": 0.20407831783171013
      },
      {
        "worker": 1,
        "t": 1794296990371.9324,
        "elu": 0.1951803667122541
      },
      {
        "worker": 0,
        "t": 1794296990748.029,
        "elu": 0.23614666565829792
      },
      {
        "worker": 2,
        "t": 1794296990867.3337,
        "elu": 0.26644006709689955
      },
      {
        "worker": 1,
        "t": 1794296990872.3118,
        "elu": 0.21926385613971694
      },
      {
        "worker": 0,
        "t": 1794296991250.325,
        "elu": 0.2965771195676358
      },
      {
        "worker": 2,
        "t": 1794296991367.8137,
        "elu": 0.20005975059981854
      },
      {
        "worker": 1,
        "t": 1794296991375.8945,
        "elu": 0.25870281582864385
      },
      {
        "worker": 0,
        "t": 1794296991750.8918,
        "elu": 0.29873113142039864
      },
      {
        "worker": 2,
        "t": 1794296991867.0732,
        "elu": 0.20323296228075
      },
      {
        "worker": 1,
        "t": 1794296991876.308,
        "elu": 0.2102427318986616
      },
      {
        "worker": 0,
        "t": 1794296992252.9663,
        "elu": 0.21696408649245214
      },
      {
        "worker": 2,
        "t": 1794296992368.2932,
        "elu": 0.1926639746972133
      },
      {
        "worker": 1,
        "t": 1794296992376.2698,
        "elu": 0.18078743822761453
      },
      {
        "worker": 0,
        "t": 1794296992753.025,
        "elu": 0.2821833431713744
      },
      {
        "worker": 2,
        "t": 1794296992868.3826,
        "elu": 0.17563312779295817
      },
      {
        "worker": 1,
        "t": 1794296992876.6907,
        "elu": 0.2396008555304028
      },
      {
        "worker": 0,
        "t": 1794296993261.7654,
        "elu": 0.21642073949271332
      },
      {
        "worker": 2,
        "t": 1794296993368.667,
        "elu": 0.18903451412618402
      },
      {
        "worker": 1,
        "t": 1794296993377.3596,
        "elu": 0.31004068837741205
      },
      {
        "worker": 0,
        "t": 1794296993762.0732,
        "elu": 0.2800877233192272
      },
      {
        "worker": 2,
        "t": 1794296993868.3486,
        "elu": 0.28802302980825023
      },
      {
        "worker": 1,
        "t": 1794296993877.3535,
        "elu": 0.3408658473817999
      },
      {
        "worker": 0,
        "t": 1794296994263.1921,
        "elu": 0.7203664625729479
      },
      {
        "worker": 2,
        "t": 1794296994368.968,
        "elu": 0.8242653573358436
      },
      {
        "worker": 1,
        "t": 1794296994377.2004,
        "elu": 0.7754009496307078
      },
      {
        "worker": 0,
        "t": 1794296994788.3945,
        "elu": 0.7256295383612098
      },
      {
        "worker": 2,
        "t": 1794296994871.739,
        "elu": 0.6921147669044355
      },
      {
        "worker": 1,
        "t": 1794296994877.603,
        "elu": 0.6150829116498647
      },
      {
        "worker": 0,
        "t": 1794296995288.8066,
        "elu": 0.761802429801358
      },
      {
        "worker": 2,
        "t": 1794296995377.4216,
        "elu": 0.7106347903927464
      },
      {
        "worker": 1,
        "t": 1794296995381.9192,
        "elu": 0.6571976635753018
      },
      {
        "worker": 0,
        "t": 1794296995788.4941,
        "elu": 0.7465919567942281
      },
      {
        "worker": 2,
        "t": 1794296995878.4053,
        "elu": 0.820658816805133
      },
      {
        "worker": 1,
        "t": 1794296995888.119,
        "elu": 0.7735967170092338
      },
      {
        "worker": 0,
        "t": 1794296996288.4714,
        "elu": 0.744326344114286
      },
      {
        "worker": 2,
        "t": 1794296996377.9124,
        "elu": 0.6920410511838812
      },
      {
        "worker": 1,
        "t": 1794296996389.5376,
        "elu": 0.6764966861730595
      },
      {
        "worker": 0,
        "t": 1794296996792.8237,
        "elu": 0.7423724097399437
      },
      {
        "worker": 1,
        "t": 1794296996896.9995,
        "elu": 0.7701737129037964
      },
      {
        "worker": 2,
        "t": 1794296996899.0818,
        "elu": 0.7703717687622612
      },
      {
        "worker": 0,
        "t": 1794296997295.9,
        "elu": 0.7506364313208085
      },
      {
        "worker": 1,
        "t": 1794296997397.6184,
        "elu": 0.8407440705830698
      },
      {
        "worker": 2,
        "t": 1794296997400.0078,
        "elu": 0.7733994053450869
      },
      {
        "worker": 0,
        "t": 1794296997795.0176,
        "elu": 0.8384519333165362
      },
      {
        "worker": 1,
        "t": 1794296997897.2952,
        "elu": 0.7314659867314861
      },
      {
        "worker": 2,
        "t": 1794296997904.6196,
        "elu": 0.7217706197431315
      },
      {
        "worker": 0,
        "t": 1794296998298.273,
        "elu": 0.664412320577514
      },
      {
        "worker": 1,
        "t": 1794296998397.8704,
        "elu": 0.6949484117700333
      },
      {
        "worker": 2,
        "t": 1794296998404.9285,
        "elu": 0.7082897402002862
      },
      {
        "worker": 0,
        "t": 1794296998798.1133,
        "elu": 0.6674278077413374
      },
      {
        "worker": 1,
        "t": 1794296998898.2185,
        "elu": 0.652816049125335
      },
      {
        "worker": 2,
        "t": 1794296998906.1375,
        "elu": 0.5811999288724294
      },
      {
        "worker": 0,
        "t": 1794296999304.7703,
        "elu": 0.7925976522637445
      },
      {
        "worker": 1,
        "t": 1794296999403.9397,
        "elu": 0.6558078863030123
      },
      {
        "worker": 2,
        "t": 1794296999407.083,
        "elu": 0.6949108917956665
      },
      {
        "worker": 0,
        "t": 1794296999804.9119,
        "elu": 0.7794886021728206
      },
      {
        "worker": 2,
        "t": 1794296999908.2234,
        "elu": 0.8291779967735925
      },
      {
        "worker": 1,
        "t": 1794296999920.604,
        "elu": 0.8667762005959987
      },
      {
        "worker": 0,
        "t": 1794297000305.3784,
        "elu": 0.7506131739003695
      },
      {
        "worker": 2,
        "t": 1794297000408.4585,
        "elu": 0.7205972554210314
      },
      {
        "worker": 1,
        "t": 1794297000420.5508,
        "elu": 0.6510938541055762
      },
      {
        "worker": 0,
        "t": 1794297000806.0247,
        "elu": 0.7603284303337121
      },
      {
        "worker": 2,
        "t": 1794297000907.94,
        "elu": 0.7175772845935287
      },
      {
        "worker": 1,
        "t": 1794297000923.3179,
        "elu": 0.7356107094161379
      },
      {
        "worker": 0,
        "t": 1794297001306.906,
        "elu": 0.7591504508545366
      },
      {
        "worker": 1,
        "t": 1794297001423.2183,
        "elu": 0.8674213774769461
      },
      {
        "worker": 2,
        "t": 1794297001428.2612,
        "elu": 0.8299884367934892
      },
      {
        "worker": 0,
        "t": 1794297001808.599,
        "elu": 0.9319480693115189
      },
      {
        "worker": 1,
        "t": 1794297001923.7505,
        "elu": 0.8337990693124265
      },
      {
        "worker": 2,
        "t": 1794297001928.8013,
        "elu": 0.8759990734230254
      },
      {
        "worker": 0,
        "t": 1794297002308.4321,
        "elu": 0.7066547396601984
      },
      {
        "worker": 1,
        "t": 1794297002428.813,
        "elu": 0.820264218117372
      },
      {
        "worker": 2,
        "t": 1794297002439.601,
        "elu": 0.803721106076083
      },
      {
        "worker": 0,
        "t": 1794297002808.5925,
        "elu": 0.8273933079581982
      },
      {
        "worker": 1,
        "t": 1794297002928.689,
        "elu": 0.8969009627201319
      },
      {
        "worker": 2,
        "t": 1794297002939.575,
        "elu": 0.8819778923372685
      },
      {
        "worker": 0,
        "t": 1794297003309.6077,
        "elu": 0.9055768151356309
      },
      {
        "worker": 1,
        "t": 1794297003429.2888,
        "elu": 0.9063187007565573
      },
      {
        "worker": 2,
        "t": 1794297003440.6423,
        "elu": 0.8726846664239792
      },
      {
        "worker": 0,
        "t": 1794297003809.291,
        "elu": 0.868686022781648
      },
      {
        "worker": 1,
        "t": 1794297003929.207,
        "elu": 0.814522944966411
      },
      {
        "worker": 2,
        "t": 1794297003940.8647,
        "elu": 0.8844806824770904
      },
      {
        "worker": 0,
        "t": 1794297004309.162,
        "elu": 0.735707619854598
      },
      {
        "worker": 1,
        "t": 1794297004431.4087,
        "elu": 0.8316505478352425
      },
      {
        "worker": 2,
        "t": 1794297004442.0579,
        "elu": 0.7679142137967989
      },
      {
        "worker": 0,
        "t": 1794297004809.5842,
        "elu": 0.8724850404986839
      },
      {
        "worker": 1,
        "t": 1794297004934.542,
        "elu": 0.8802189251988841
      },
      {
        "worker": 2,
        "t": 1794297004973.076,
        "elu": 0.8479757587173015
      },
      {
        "worker": 0,
        "t": 1794297005310.7268,
        "elu": 0.8865970955151485
      },
      {
        "worker": 1,
        "t": 1794297005435.2524,
        "elu": 0.7662654606256372
      },
      {
        "worker": 2,
        "t": 1794297005473.4426,
        "elu": 0.6714008737024745
      },
      {
        "worker": 0,
        "t": 1794297005881.822,
        "elu": 0.7479835180322455
      },
      {
        "worker": 1,
        "t": 1794297005935.6492,
        "elu": 0.85821781085379
      },
      {
        "worker": 2,
        "t": 1794297005974.1157,
        "elu": 0.8422520114184577
      },
      {
        "worker": 0,
        "t": 1794297006381.3738,
        "elu": 0.8451218483109105
      },
      {
        "worker": 1,
        "t": 1794297006446.8032,
        "elu": 0.8325668957280203
      },
      {
        "worker": 2,
        "t": 1794297006477.5796,
        "elu": 0.8542005430564951
      },
      {
        "worker": 0,
        "t": 1794297006886.7932,
        "elu": 0.8351558292289595
      },
      {
        "worker": 1,
        "t": 1794297006946.267,
        "elu": 0.8094114548316864
      },
      {
        "worker": 2,
        "t": 1794297006978.9204,
        "elu": 0.796887127828173
      },
      {
        "worker": 0,
        "t": 1794297007391.9082,
        "elu": 0.7639406314761903
      },
      {
        "worker": 1,
        "t": 1794297007446.3442,
        "elu": 0.7057955201389831
      },
      {
        "worker": 2,
        "t": 1794297007479.0952,
        "elu": 0.7376994373753243
      },
      {
        "worker": 0,
        "t": 1794297007895.6658,
        "elu": 0.8066349249915277
      },
      {
        "worker": 1,
        "t": 1794297007946.1807,
        "elu": 0.7760521100853934
      },
      {
        "worker": 2,
        "t": 1794297007979.111,
        "elu": 0.779921435424914
      },
      {
        "worker": 0,
        "t": 1794297008395.232,
        "elu": 0.9064569290771523
      },
      {
        "worker": 1,
        "t": 1794297008446.5508,
        "elu": 0.7035886734332532
      },
      {
        "worker": 2,
        "t": 1794297008480.4448,
        "elu": 0.7731499738046912
      },
      {
        "worker": 0,
        "t": 1794297008908.1438,
        "elu": 0.8348048127140988
      },
      {
        "worker": 1,
        "t": 1794297008946.1365,
        "elu": 0.887579321094802
      },
      {
        "worker": 2,
        "t": 1794297008983.557,
        "elu": 0.7964922807129436
      },
      {
        "worker": 0,
        "t": 1794297009416.3672,
        "elu": 0.8595455411069031
      },
      {
        "worker": 1,
        "t": 1794297009447.267,
        "elu": 0.8277207191384179
      },
      {
        "worker": 2,
        "t": 1794297009483.399,
        "elu": 0.7858070068505764
      },
      {
        "worker": 0,
        "t": 1794297009915.0664,
        "elu": 0.8538210719950706
      },
      {
        "worker": 1,
        "t": 1794297009949.6216,
        "elu": 0.7778481109197847
      },
      {
        "worker": 2,
        "t": 1794297009990.3254,
        "elu": 0.7859826176706405
      },
      {
        "worker": 0,
        "t": 1794297010424.8152,
        "elu": 0.9870442983512896
      },
      {
        "worker": 2,
        "t": 1794297010496.743,
        "elu": 0.9351618821845884
      },
      {
        "worker": 1,
        "t": 1794297010533.6375,
        "elu": 0.9433852932316097
      },
      {
        "worker": 0,
        "t": 1794297010926.04,
        "elu": 0.7966917607731328
      },
      {
        "worker": 2,
        "t": 1794297010999.6396,
        "elu": 0.8064427816543019
      },
      {
        "worker": 1,
        "t": 1794297011034.3816,
        "elu": 0.7345846728460179
      },
      {
        "worker": 0,
        "t": 1794297011426.1592,
        "elu": 0.7402152239820213
      },
      {
        "worker": 2,
        "t": 1794297011500.2256,
        "elu": 0.7644923550420317
      },
      {
        "worker": 1,
        "t": 1794297011535.6445,
        "elu": 0.8157026294230124
      },
      {
        "worker": 0,
        "t": 1794297011926.5522,
        "elu": 0.7434552018204208
      },
      {
        "worker": 2,
        "t": 1794297012023.4983,
        "elu": 0.6768532318870358
      },
      {
        "worker": 1,
        "t": 1794297012046.5737,
        "elu": 0.8214623990155778
      },
      {
        "worker": 0,
        "t": 1794297012467.5784,
        "elu": 0.8943257378492068
      },
      {
        "worker": 2,
        "t": 1794297012529.3477,
        "elu": 0.9646878312960607
      },
      {
        "worker": 1,
        "t": 1794297012546.4539,
        "elu": 0.9749550995645713
      },
      {
        "worker": 0,
        "t": 1794297012969.302,
        "elu": 0.7958764208014335
      },
      {
        "worker": 2,
        "t": 1794297013032.2202,
        "elu": 0.8708178087500081
      },
      {
        "worker": 1,
        "t": 1794297013052.712,
        "elu": 0.8042502439542067
      },
      {
        "worker": 0,
        "t": 1794297013479.355,
        "elu": 0.8753284600116962
      },
      {
        "worker": 2,
        "t": 1794297013537.3394,
        "elu": 0.8983717749873041
      },
      {
        "worker": 1,
        "t": 1794297013552.3325,
        "elu": 0.9205529337936453
      },
      {
        "worker": 0,
        "t": 1794297013986.093,
        "elu": 0.9169615152993261
      },
      {
        "worker": 2,
        "t": 1794297014044.6077,
        "elu": 0.9364976893824929
      },
      {
        "worker": 1,
        "t": 1794297014058.8809,
        "elu": 0.8875534326594468
      },
      {
        "worker": 0,
        "t": 1794297014487.1167,
        "elu": 0.9125561979651953
      },
      {
        "worker": 2,
        "t": 1794297014544.7437,
        "elu": 0.8110123882031719
      },
      {
        "worker": 1,
        "t": 1794297014580.544,
        "elu": 0.8738361560373114
      },
      {
        "worker": 0,
        "t": 1794297014988.9675,
        "elu": 0.7699902259040058
      },
      {
        "worker": 2,
        "t": 1794297015044.1475,
        "elu": 0.8315873644459993
      },
      {
        "worker": 1,
        "t": 1794297015087.0247,
        "elu": 0.7781524387332666
      },
      {
        "worker": 0,
        "t": 1794297015490.1968,
        "elu": 0.8646568090117103
      },
      {
        "worker": 2,
        "t": 1794297015544.4,
        "elu": 0.825665462802393
      },
      {
        "worker": 1,
        "t": 1794297015588.3374,
        "elu": 0.8537121863250493
      },
      {
        "worker": 0,
        "t": 1794297016000.9023,
        "elu": 0.8063627257748034
      },
      {
        "worker": 2,
        "t": 1794297016061.1775,
        "elu": 0.8131852256565337
      },
      {
        "worker": 1,
        "t": 1794297016106.2551,
        "elu": 0.8910796873687996
      },
      {
        "worker": 0,
        "t": 1794297016511.3184,
        "elu": 0.9079978555523492
      },
      {
        "worker": 2,
        "t": 1794297016563.714,
        "elu": 0.87368512278189
      },
      {
        "worker": 1,
        "t": 1794297016606.1377,
        "elu": 0.9098234267177038
      },
      {
        "worker": 0,
        "t": 1794297017011.402,
        "elu": 0.8470629484608291
      },
      {
        "worker": 2,
        "t": 1794297017081.7642,
        "elu": 0.8718601482887967
      },
      {
        "worker": 1,
        "t": 1794297017116.3896,
        "elu": 0.851001489545376
      },
      {
        "worker": 0,
        "t": 1794297017518.1711,
        "elu": 0.8674772412409252
      },
      {
        "worker": 2,
        "t": 1794297017586.5059,
        "elu": 0.8203461088123501
      },
      {
        "worker": 1,
        "t": 1794297017616.5476,
        "elu": 0.8059331134655482
      },
      {
        "worker": 0,
        "t": 1794297018049.9722,
        "elu": 0.9600281045634073
      },
      {
        "worker": 2,
        "t": 1794297018086.6912,
        "elu": 0.7923594601972527
      },
      {
        "worker": 1,
        "t": 1794297018117.3572,
        "elu": 0.7557435342076584
      },
      {
        "worker": 0,
        "t": 1794297018550.4858,
        "elu": 0.6191958788099877
      },
      {
        "worker": 2,
        "t": 1794297018603.1638,
        "elu": 0.7355138275884308
      },
      {
        "worker": 1,
        "t": 1794297018617.913,
        "elu": 0.766414610686727
      },
      {
        "worker": 0,
        "t": 1794297019061.87,
        "elu": 0.6662927965395393
      },
      {
        "worker": 2,
        "t": 1794297019105.8196,
        "elu": 0.6517609353592693
      },
      {
        "worker": 1,
        "t": 1794297019119.1528,
        "elu": 0.8275839067348933
      },
      {
        "worker": 0,
        "t": 1794297019574.2517,
        "elu": 0.7417783721896608
      },
      {
        "worker": 2,
        "t": 1794297019621.7986,
        "elu": 0.7812274229417392
      },
      {
        "worker": 1,
        "t": 1794297019646.619,
        "elu": 0.8537027458232423
      },
      {
        "worker": 0,
        "t": 1794297020108.9048,
        "elu": 0.888419191021261
      },
      {
        "worker": 2,
        "t": 1794297020131.804,
        "elu": 0.8343058773927969
      },
      {
        "worker": 1,
        "t": 1794297020151.6467,
        "elu": 0.824095809279499
      },
      {
        "worker": 0,
        "t": 1794297020609.071,
        "elu": 0.7239021244035607
      },
      {
        "worker": 2,
        "t": 1794297020632.963,
        "elu": 0.6003593071994184
      },
      {
        "worker": 1,
        "t": 1794297020651.02,
        "elu": 0.5910355459003183
      },
      {
        "worker": 0,
        "t": 1794297021112.8696,
        "elu": 0.9084524294131072
      },
      {
        "worker": 2,
        "t": 1794297021140.7532,
        "elu": 0.7645168833686925
      },
      {
        "worker": 1,
        "t": 1794297021168.6802,
        "elu": 0.7936555028552057
      },
      {
        "worker": 0,
        "t": 1794297021612.6099,
        "elu": 0.7739424481431074
      },
      {
        "worker": 2,
        "t": 1794297021640.655,
        "elu": 0.8125176748236721
      },
      {
        "worker": 1,
        "t": 1794297021669.3406,
        "elu": 0.7933056771518525
      },
      {
        "worker": 2,
        "t": 1794297022144.9036,
        "elu": 0.8147223677993778
      },
      {
        "worker": 0,
        "t": 1794297022164.3438,
        "elu": 0.8593916307315467
      },
      {
        "worker": 1,
        "t": 1794297022170.4446,
        "elu": 0.8668047043319469
      },
      {
        "worker": 2,
        "t": 1794297022645.305,
        "elu": 0.865261799948224
      },
      {
        "worker": 0,
        "t": 1794297022664.5688,
        "elu": 0.8445427540060984
      },
      {
        "worker": 1,
        "t": 1794297022673.8645,
        "elu": 0.8661212512419363
      },
      {
        "worker": 2,
        "t": 1794297023152.728,
        "elu": 0.6303849526746554
      },
      {
        "worker": 0,
        "t": 1794297023172.7126,
        "elu": 0.6755647903036968
      },
      {
        "worker": 1,
        "t": 1794297023202.0225,
        "elu": 0.698344092183135
      },
      {
        "worker": 2,
        "t": 1794297023653.7349,
        "elu": 0.8883278291767734
      },
      {
        "worker": 0,
        "t": 1794297023678.1106,
        "elu": 0.8080256754618841
      },
      {
        "worker": 1,
        "t": 1794297023703.9365,
        "elu": 0.8800577152317887
      },
      {
        "worker": 2,
        "t": 1794297024153.877,
        "elu": 0.7590757856313811
      },
      {
        "worker": 0,
        "t": 1794297024179.8171,
        "elu": 0.649074442508862
      },
      {
        "worker": 1,
        "t": 1794297024210.58,
        "elu": 0.7694917642684167
      },
      {
        "worker": 0,
        "t": 1794297024687.7593,
        "elu": 0.7472481671878707
      },
      {
        "worker": 1,
        "t": 1794297024711.1323,
        "elu": 0.7925030663626662
      },
      {
        "worker": 2,
        "t": 1794297024828.1646,
        "elu": 0.949054093826688
      },
      {
        "worker": 0,
        "t": 1794297025203.901,
        "elu": 0.9531057977375624
      },
      {
        "worker": 1,
        "t": 1794297025225.1812,
        "elu": 0.950404379840056
      },
      {
        "worker": 2,
        "t": 1794297025343.1733,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297025728.2058,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297025803.9517,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297025843.205,
        "elu": 0.9647880701390292
      },
      {
        "worker": 1,
        "t": 1794297026328.4182,
        "elu": 0.9825249450650653
      },
      {
        "worker": 0,
        "t": 1794297026333.012,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297026436.1863,
        "elu": 0.9731233729379992
      },
      {
        "worker": 0,
        "t": 1794297026845.1924,
        "elu": 0.9478636367557606
      },
      {
        "worker": 2,
        "t": 1794297026947.2534,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297027310.769,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297027419.3376,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297027455.0276,
        "elu": 0.9043327224300653
      },
      {
        "worker": 2,
        "t": 1794297027976.6665,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297027996.1606,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297028008.9197,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297028482.9294,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297028504.448,
        "elu": 0.969460016591451
      },
      {
        "worker": 0,
        "t": 1794297028571.157,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297028983.4526,
        "elu": 0.8399829321618406
      },
      {
        "worker": 1,
        "t": 1794297029021.0776,
        "elu": 0.7242213543473631
      },
      {
        "worker": 0,
        "t": 1794297029072.1868,
        "elu": 0.9422886519617625
      },
      {
        "worker": 2,
        "t": 1794297029510.8687,
        "elu": 0.7337815913630965
      },
      {
        "worker": 1,
        "t": 1794297029531.6936,
        "elu": 0.6838882769166928
      },
      {
        "worker": 0,
        "t": 1794297029572.3062,
        "elu": 0.8270613179903955
      },
      {
        "worker": 2,
        "t": 1794297030010.011,
        "elu": 0.8362270738645233
      },
      {
        "worker": 1,
        "t": 1794297030030.9163,
        "elu": 0.734191981786211
      },
      {
        "worker": 0,
        "t": 1794297030074.0833,
        "elu": 0.734439035892003
      },
      {
        "worker": 2,
        "t": 1794297030510.3306,
        "elu": 0.8092043961509492
      },
      {
        "worker": 1,
        "t": 1794297030531.7522,
        "elu": 0.6884079550011774
      },
      {
        "worker": 0,
        "t": 1794297030589.018,
        "elu": 0.8984832331552398
      },
      {
        "worker": 2,
        "t": 1794297031063.3308,
        "elu": 0.4952890717749636
      },
      {
        "worker": 1,
        "t": 1794297031072.0662,
        "elu": 0.6154386650063456
      },
      {
        "worker": 0,
        "t": 1794297031093.9873,
        "elu": 0.5519499710647718
      },
      {
        "worker": 1,
        "t": 1794297031587.1216,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297031630.741,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297031716.5747,
        "elu": 0.9885613797328061
      },
      {
        "worker": 2,
        "t": 1794297032139.2795,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297032142.2527,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297032263.9712,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297032733.591,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297032850.5354,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297032845.6863,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297033245.875,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297033355.6487,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297033359.562,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297033869.098,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297033880.2417,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297033930.9038,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297034371.0833,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297034428.3315,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297034462.9285,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297034968.6733,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297034975.268,
        "elu": 0.991764345038977
      },
      {
        "worker": 0,
        "t": 1794297035089.0447,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297035510.2507,
        "elu": 0.9949443008920879
      },
      {
        "worker": 1,
        "t": 1794297035510.5195,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297035684.6309,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297036186.863,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297036151.2815,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297036567.6758,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297036733.6045,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297036841.1504,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297037224.029,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297037350.2715,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297037362.488,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297037752.6465,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297037862.5918,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297037867.168,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297038272.8796,
        "elu": 0.9486744482449405
      },
      {
        "worker": 1,
        "t": 1794297038379.1409,
        "elu": 0.928336133827057
      },
      {
        "worker": 0,
        "t": 1794297038448.5522,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297038817.6235,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297038940.769,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297038949.9841,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297039326.5413,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297039456.5225,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297039625.7651,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297039827.5408,
        "elu": 0.9805506931865883
      },
      {
        "worker": 1,
        "t": 1794297039957.0627,
        "elu": 0.9563560502698588
      },
      {
        "worker": 0,
        "t": 1794297040125.8376,
        "elu": 0.9362932695461829
      },
      {
        "worker": 2,
        "t": 1794297040328.1584,
        "elu": 0.6871995576543038
      },
      {
        "worker": 1,
        "t": 1794297040456.925,
        "elu": 0.4803936566721685
      },
      {
        "worker": 0,
        "t": 1794297040625.6738,
        "elu": 0.7292962193744719
      },
      {
        "worker": 2,
        "t": 1794297040828.4736,
        "elu": 0.5997281572459011
      },
      {
        "worker": 1,
        "t": 1794297040971.14,
        "elu": 0.613784654200337
      },
      {
        "worker": 0,
        "t": 1794297041125.6624,
        "elu": 0.5504866882780278
      },
      {
        "worker": 2,
        "t": 1794297041328.2039,
        "elu": 0.7456252538991784
      },
      {
        "worker": 1,
        "t": 1794297041470.924,
        "elu": 0.6756425908550493
      },
      {
        "worker": 0,
        "t": 1794297041625.596,
        "elu": 0.50586287509757
      },
      {
        "worker": 2,
        "t": 1794297041828.0132,
        "elu": 0.5977212241065218
      },
      {
        "worker": 1,
        "t": 1794297041971.1501,
        "elu": 0.4919063555277607
      },
      {
        "worker": 0,
        "t": 1794297042220.0923,
        "elu": 0.5735973805924562
      },
      {
        "worker": 2,
        "t": 1794297042448.9763,
        "elu": 0.8360023932213106
      },
      {
        "worker": 1,
        "t": 1794297042491.703,
        "elu": 0.9496720386590499
      },
      {
        "worker": 0,
        "t": 1794297042743.6724,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297042948.6443,
        "elu": 0.8118183218336708
      },
      {
        "worker": 1,
        "t": 1794297042991.8027,
        "elu": 0.747967412954876
      },
      {
        "worker": 0,
        "t": 1794297043261.7021,
        "elu": 0.7548750149964157
      },
      {
        "worker": 1,
        "t": 1794297043492.2124,
        "elu": 0.8752349814725994
      },
      {
        "worker": 2,
        "t": 1794297043505.9902,
        "elu": 0.9493836288317988
      },
      {
        "worker": 0,
        "t": 1794297043761.3777,
        "elu": 0.8528375816450444
      },
      {
        "worker": 1,
        "t": 1794297043991.996,
        "elu": 0.6917095400828868
      },
      {
        "worker": 2,
        "t": 1794297044005.9268,
        "elu": 0.6723646457352702
      },
      {
        "worker": 0,
        "t": 1794297044263.1726,
        "elu": 0.6900261614237244
      },
      {
        "worker": 1,
        "t": 1794297044492.351,
        "elu": 0.5698672672486419
      },
      {
        "worker": 2,
        "t": 1794297044507.4502,
        "elu": 0.6764424076673299
      },
      {
        "worker": 0,
        "t": 1794297044763.777,
        "elu": 0.6331735539101143
      },
      {
        "worker": 1,
        "t": 1794297044992.497,
        "elu": 0.35456148503160706
      },
      {
        "worker": 2,
        "t": 1794297045037.8167,
        "elu": 0.5360308697400088
      },
      {
        "worker": 0,
        "t": 1794297045273.0125,
        "elu": 0.8385142076721565
      },
      {
        "worker": 1,
        "t": 1794297045493.4346,
        "elu": 0.9002516223731367
      },
      {
        "worker": 2,
        "t": 1794297045543.3232,
        "elu": 0.8762850622250526
      },
      {
        "worker": 0,
        "t": 1794297045811.5386,
        "elu": 0.9516026588655815
      },
      {
        "worker": 1,
        "t": 1794297045993.6335,
        "elu": 0.8843877175406782
      },
      {
        "worker": 2,
        "t": 1794297046043.8406,
        "elu": 0.8744769232122012
      },
      {
        "worker": 0,
        "t": 1794297046323.9326,
        "elu": 0.9079758167913595
      },
      {
        "worker": 2,
        "t": 1794297046546.2603,
        "elu": 0.8931441482311898
      },
      {
        "worker": 1,
        "t": 1794297046627.5962,
        "elu": 0.9527216253477675
      },
      {
        "worker": 0,
        "t": 1794297046824.483,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297047055.7224,
        "elu": 0.7364296304132747
      },
      {
        "worker": 1,
        "t": 1794297047127.3687,
        "elu": 0.5899467893310194
      },
      {
        "worker": 0,
        "t": 1794297047353.311,
        "elu": 0.6261000810303216
      },
      {
        "worker": 2,
        "t": 1794297047566.738,
        "elu": 0.8942798824129304
      },
      {
        "worker": 1,
        "t": 1794297047679.172,
        "elu": 0.7763969597566813
      },
      {
        "worker": 0,
        "t": 1794297047866.3015,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297048077.9014,
        "elu": 0.9913362630145378
      },
      {
        "worker": 1,
        "t": 1794297048190.0637,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297048366.3857,
        "elu": 0.9136048312988048
      },
      {
        "worker": 2,
        "t": 1794297048591.7192,
        "elu": 0.7161173372735352
      },
      {
        "worker": 1,
        "t": 1794297048691.1626,
        "elu": 0.7431350856170081
      },
      {
        "worker": 0,
        "t": 1794297048866.406,
        "elu": 0.5586169063889387
      },
      {
        "worker": 2,
        "t": 1794297049091.0808,
        "elu": 0.5742615703356911
      },
      {
        "worker": 1,
        "t": 1794297049199.3726,
        "elu": 0.64359976387053
      },
      {
        "worker": 0,
        "t": 1794297049367.687,
        "elu": 0.3105392437560514
      },
      {
        "worker": 2,
        "t": 1794297049615.3503,
        "elu": 0.5707222306672047
      },
      {
        "worker": 1,
        "t": 1794297049742.6187,
        "elu": 0.9027329645385833
      },
      {
        "worker": 0,
        "t": 1794297049867.7761,
        "elu": 0.9248095392712732
      },
      {
        "worker": 2,
        "t": 1794297050115.8135,
        "elu": 0.8758956567509742
      },
      {
        "worker": 1,
        "t": 1794297050244.123,
        "elu": 0.9002046598166602
      },
      {
        "worker": 0,
        "t": 1794297050368.6516,
        "elu": 0.5654156352144648
      },
      {
        "worker": 2,
        "t": 1794297050615.948,
        "elu": 0.20769748220605525
      },
      {
        "worker": 1,
        "t": 1794297050758.5137,
        "elu": 0.6340253782985004
      },
      {
        "worker": 0,
        "t": 1794297050902.3079,
        "elu": 0.6058805546424796
      },
      {
        "worker": 2,
        "t": 1794297051133.349,
        "elu": 0.7731705240379331
      },
      {
        "worker": 1,
        "t": 1794297051372.3882,
        "elu": 0.9732669264143373
      },
      {
        "worker": 0,
        "t": 1794297051428.1455,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297051633.011,
        "elu": 0.9560302231467093
      },
      {
        "worker": 1,
        "t": 1794297051916.764,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297051935.3867,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297052136.1416,
        "elu": 0.9029972021198633
      },
      {
        "worker": 1,
        "t": 1794297052416.1267,
        "elu": 0.7397719043097667
      },
      {
        "worker": 0,
        "t": 1794297052435.9934,
        "elu": 0.6740567177504477
      },
      {
        "worker": 2,
        "t": 1794297052637.1238,
        "elu": 0.5685503386115529
      },
      {
        "worker": 1,
        "t": 1794297052915.9307,
        "elu": 0.7795899222737295
      },
      {
        "worker": 0,
        "t": 1794297052937.311,
        "elu": 0.6550423068206166
      },
      {
        "worker": 2,
        "t": 1794297053138.7324,
        "elu": 0.4950985202388424
      },
      {
        "worker": 1,
        "t": 1794297053416.443,
        "elu": 0.7223828877760418
      },
      {
        "worker": 0,
        "t": 1794297053437.8618,
        "elu": 0.7897362227044077
      },
      {
        "worker": 2,
        "t": 1794297053638.8628,
        "elu": 0.7428400947356243
      },
      {
        "worker": 1,
        "t": 1794297053918.1711,
        "elu": 0.6254123760714946
      },
      {
        "worker": 0,
        "t": 1794297053938.8105,
        "elu": 0.9667486874395621
      },
      {
        "worker": 2,
        "t": 1794297054138.106,
        "elu": 0.5742468211558706
      },
      {
        "worker": 1,
        "t": 1794297054418.467,
        "elu": 0.789367222436744
      },
      {
        "worker": 0,
        "t": 1794297054438.1172,
        "elu": 0.553220810526479
      },
      {
        "worker": 2,
        "t": 1794297054641.005,
        "elu": 0.4923408168090048
      },
      {
        "worker": 1,
        "t": 1794297054918.039,
        "elu": 0.6879987974528635
      },
      {
        "worker": 0,
        "t": 1794297054938.503,
        "elu": 0.4823567897275984
      },
      {
        "worker": 2,
        "t": 1794297055141.7983,
        "elu": 0.6541109756291595
      },
      {
        "worker": 1,
        "t": 1794297055418.5933,
        "elu": 0.7194528346924955
      },
      {
        "worker": 0,
        "t": 1794297055438.5881,
        "elu": 0.6466316076540015
      },
      {
        "worker": 2,
        "t": 1794297055642.051,
        "elu": 0.6793970303625829
      },
      {
        "worker": 1,
        "t": 1794297055918.0547,
        "elu": 0.4856360639945861
      },
      {
        "worker": 0,
        "t": 1794297055950.189,
        "elu": 0.8129926641961133
      },
      {
        "worker": 2,
        "t": 1794297056142.5266,
        "elu": 0.496273137143312
      },
      {
        "worker": 1,
        "t": 1794297056418.4038,
        "elu": 0.5271427518059341
      },
      {
        "worker": 0,
        "t": 1794297056453.9678,
        "elu": 0.8530542524036964
      },
      {
        "worker": 2,
        "t": 1794297056644.0083,
        "elu": 0.5451622638752802
      },
      {
        "worker": 1,
        "t": 1794297056956.651,
        "elu": 0.7481035130319796
      },
      {
        "worker": 0,
        "t": 1794297056959.7031,
        "elu": 0.9797652609387919
      },
      {
        "worker": 2,
        "t": 1794297057146.0466,
        "elu": 0.7497851152911091
      },
      {
        "worker": 1,
        "t": 1794297057458.8328,
        "elu": 0.8127893118314927
      },
      {
        "worker": 0,
        "t": 1794297057459.4856,
        "elu": 0.7457447453202593
      },
      {
        "worker": 2,
        "t": 1794297057648.0625,
        "elu": 0.7274077651452279
      },
      {
        "worker": 1,
        "t": 1794297057960.3972,
        "elu": 0.6687201332675103
      },
      {
        "worker": 0,
        "t": 1794297057963.0876,
        "elu": 0.6791199772907955
      },
      {
        "worker": 2,
        "t": 1794297058148.076,
        "elu": 0.7103741827605593
      },
      {
        "worker": 1,
        "t": 1794297058460.3196,
        "elu": 0.7256771570807877
      },
      {
        "worker": 0,
        "t": 1794297058463.1626,
        "elu": 0.6936799807028515
      },
      {
        "worker": 2,
        "t": 1794297058648.2031,
        "elu": 0.7152478122154413
      },
      {
        "worker": 1,
        "t": 1794297058960.07,
        "elu": 0.4190003533165892
      },
      {
        "worker": 0,
        "t": 1794297058964.9768,
        "elu": 0.6495323352705269
      },
      {
        "worker": 2,
        "t": 1794297059150.8757,
        "elu": 0.6043108709035562
      },
      {
        "worker": 1,
        "t": 1794297059461.6487,
        "elu": 0.18623486479334053
      },
      {
        "worker": 0,
        "t": 1794297059469.6733,
        "elu": 0.4176050860416281
      },
      {
        "worker": 2,
        "t": 1794297059669.8647,
        "elu": 0.5895783498346892
      },
      {
        "worker": 1,
        "t": 1794297059983.1392,
        "elu": 0.9677481519078689
      },
      {
        "worker": 0,
        "t": 1794297060018.815,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297060382.5256,
        "elu": 0.9814575442582486
      },
      {
        "worker": 0,
        "t": 1794297060519.005,
        "elu": 0.6862632061141077
      },
      {
        "worker": 1,
        "t": 1794297060544.505,
        "elu": 0.8831637163076577
      },
      {
        "worker": 2,
        "t": 1794297061017.3374,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297061024.5537,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297061047.0378,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297061517.757,
        "elu": 0.9911686955509602
      },
      {
        "worker": 0,
        "t": 1794297061552.901,
        "elu": 0.9836297542536886
      },
      {
        "worker": 1,
        "t": 1794297061632.9934,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297062021.6145,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297062059.6826,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297062133.258,
        "elu": 0.9798971280670261
      },
      {
        "worker": 2,
        "t": 1794297062521.168,
        "elu": 0.740084192295706
      },
      {
        "worker": 0,
        "t": 1794297062559.499,
        "elu": 0.8937287832053014
      },
      {
        "worker": 1,
        "t": 1794297062633.7708,
        "elu": 0.770920045563157
      },
      {
        "worker": 2,
        "t": 1794297063021.2373,
        "elu": 0.7823588587957424
      },
      {
        "worker": 0,
        "t": 1794297063060.8135,
        "elu": 0.6830755036375954
      },
      {
        "worker": 1,
        "t": 1794297063133.2852,
        "elu": 0.8695657410317789
      },
      {
        "worker": 2,
        "t": 1794297063545.2334,
        "elu": 0.8977580910662407
      },
      {
        "worker": 0,
        "t": 1794297063578.7656,
        "elu": 0.9468589833148655
      },
      {
        "worker": 1,
        "t": 1794297063688.4265,
        "elu": 0.9799078601985447
      },
      {
        "worker": 2,
        "t": 1794297064045.4785,
        "elu": 0.8986457369775755
      },
      {
        "worker": 0,
        "t": 1794297064078.6511,
        "elu": 0.7893314803509909
      },
      {
        "worker": 1,
        "t": 1794297064188.3916,
        "elu": 0.6894149951145377
      },
      {
        "worker": 2,
        "t": 1794297064551.9514,
        "elu": 0.4495079765102709
      },
      {
        "worker": 0,
        "t": 1794297064579.9678,
        "elu": 0.4969856548616934
      },
      {
        "worker": 1,
        "t": 1794297064787.5422,
        "elu": 0.7182957225381263
      },
      {
        "worker": 2,
        "t": 1794297065054.2222,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297065082.2,
        "elu": 0.9302025323518548
      },
      {
        "worker": 1,
        "t": 1794297065288.1348,
        "elu": 0.7836624108679104
      },
      {
        "worker": 2,
        "t": 1794297065564.8271,
        "elu": 0.5965035512779767
      },
      {
        "worker": 0,
        "t": 1794297065583.2473,
        "elu": 0.6384105035648091
      },
      {
        "worker": 1,
        "t": 1794297065811.9636,
        "elu": 0.9101008321458349
      },
      {
        "worker": 0,
        "t": 1794297066132.997,
        "elu": 0.7816194452699031
      },
      {
        "worker": 2,
        "t": 1794297066167.352,
        "elu": 0.9096427625296193
      },
      {
        "worker": 1,
        "t": 1794297066395.5977,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297066750.9792,
        "elu": 0.8179595408609528
      },
      {
        "worker": 0,
        "t": 1794297066858.7192,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297066985.319,
        "elu": 0.9491854098713064
      },
      {
        "worker": 2,
        "t": 1794297067263.7507,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297067601.7568,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297067781.0476,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297067882.9783,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297068122.5671,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297068304.7803,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297068475.769,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297068623.8755,
        "elu": 0.9201879617747384
      },
      {
        "worker": 2,
        "t": 1794297068808.29,
        "elu": 0.8808909556490163
      },
      {
        "worker": 0,
        "t": 1794297068994.6704,
        "elu": 0.807586351269515
      },
      {
        "worker": 1,
        "t": 1794297069129.4082,
        "elu": 0.858871265352955
      },
      {
        "worker": 2,
        "t": 1794297069311.7551,
        "elu": 0.9862113348246487
      },
      {
        "worker": 0,
        "t": 1794297069493.5105,
        "elu": 0.9114054865465259
      },
      {
        "worker": 1,
        "t": 1794297069653.2502,
        "elu": 0.8395623803894587
      },
      {
        "worker": 2,
        "t": 1794297069812.5283,
        "elu": 0.8656812025969106
      },
      {
        "worker": 0,
        "t": 1794297070004.3008,
        "elu": 0.9792789335361695
      },
      {
        "worker": 1,
        "t": 1794297070154.0083,
        "elu": 0.9183321008400697
      },
      {
        "worker": 2,
        "t": 1794297070338.7634,
        "elu": 0.8530635518802157
      },
      {
        "worker": 0,
        "t": 1794297070511.666,
        "elu": 0.9568986287542072
      },
      {
        "worker": 1,
        "t": 1794297070657.3313,
        "elu": 0.8397256833987956
      },
      {
        "worker": 2,
        "t": 1794297070838.1948,
        "elu": 0.8086289471908301
      },
      {
        "worker": 0,
        "t": 1794297071014.75,
        "elu": 0.8327132754680716
      },
      {
        "worker": 1,
        "t": 1794297071159.1174,
        "elu": 0.857278867428384
      },
      {
        "worker": 2,
        "t": 1794297071346.753,
        "elu": 0.9362527769606465
      },
      {
        "worker": 0,
        "t": 1794297071542.6245,
        "elu": 0.9837366394871215
      },
      {
        "worker": 1,
        "t": 1794297071665.167,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297071866.118,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297072045.695,
        "elu": 0.97129012909555
      },
      {
        "worker": 1,
        "t": 1794297072165.3962,
        "elu": 0.7905077084832022
      },
      {
        "worker": 2,
        "t": 1794297072366.6523,
        "elu": 0.572923306208106
      },
      {
        "worker": 0,
        "t": 1794297072545.3186,
        "elu": 0.2282959260656379
      },
      {
        "worker": 1,
        "t": 1794297072737.0195,
        "elu": 0.6071237352607156
      },
      {
        "worker": 2,
        "t": 1794297073027.8115,
        "elu": 0.8581644997356679
      },
      {
        "worker": 0,
        "t": 1794297073057.8274,
        "elu": 0.9138261380033955
      },
      {
        "worker": 1,
        "t": 1794297073253.1584,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297073541.3228,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297073569.3271,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297073762.986,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297074041.3247,
        "elu": 0.9890955760244025
      },
      {
        "worker": 0,
        "t": 1794297074077.2383,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297074269.3064,
        "elu": 0.6421293405099656
      },
      {
        "worker": 2,
        "t": 1794297074542.171,
        "elu": 0.8355346365260571
      },
      {
        "worker": 0,
        "t": 1794297074578.252,
        "elu": 0.8509015207008994
      },
      {
        "worker": 1,
        "t": 1794297074771.6877,
        "elu": 0.6868416764946939
      },
      {
        "worker": 2,
        "t": 1794297075045.5308,
        "elu": 0.9391278596181898
      },
      {
        "worker": 0,
        "t": 1794297075104.281,
        "elu": 0.998577845983747
      },
      {
        "worker": 1,
        "t": 1794297075281.07,
        "elu": 0.9000056700201607
      },
      {
        "worker": 2,
        "t": 1794297075597.585,
        "elu": 0.9647137740468983
      },
      {
        "worker": 0,
        "t": 1794297075622.352,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297075787.2954,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297076097.0466,
        "elu": 0.7991499507847101
      },
      {
        "worker": 0,
        "t": 1794297076123.2002,
        "elu": 0.8456404001484336
      },
      {
        "worker": 1,
        "t": 1794297076293.2805,
        "elu": 0.8234975662199373
      },
      {
        "worker": 2,
        "t": 1794297076597.0842,
        "elu": 0.8489848199451422
      },
      {
        "worker": 0,
        "t": 1794297076624.0508,
        "elu": 0.8939753905436538
      },
      {
        "worker": 1,
        "t": 1794297076793.3716,
        "elu": 0.9153958125344405
      },
      {
        "worker": 2,
        "t": 1794297077098.0112,
        "elu": 0.8953316293461275
      },
      {
        "worker": 0,
        "t": 1794297077125.318,
        "elu": 0.7970410603150051
      },
      {
        "worker": 1,
        "t": 1794297077293.3008,
        "elu": 0.7411820328148175
      },
      {
        "worker": 2,
        "t": 1794297077600.7588,
        "elu": 0.7210386225121681
      },
      {
        "worker": 0,
        "t": 1794297077625.5925,
        "elu": 0.8224339571589696
      },
      {
        "worker": 1,
        "t": 1794297077803.3376,
        "elu": 0.9498791845801997
      },
      {
        "worker": 2,
        "t": 1794297078100.9001,
        "elu": 0.7856453361133194
      },
      {
        "worker": 0,
        "t": 1794297078125.7776,
        "elu": 0.8545984790596333
      },
      {
        "worker": 1,
        "t": 1794297078315.5112,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297078633.3965,
        "elu": 0.8940706025593423
      },
      {
        "worker": 2,
        "t": 1794297078703.6719,
        "elu": 0.9282120300128308
      },
      {
        "worker": 1,
        "t": 1794297078842.6973,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297079140.8538,
        "elu": 0.9461652939897266
      },
      {
        "worker": 2,
        "t": 1794297079209.0344,
        "elu": 0.7966237534157562
      },
      {
        "worker": 1,
        "t": 1794297079343.118,
        "elu": 0.8587055217519775
      },
      {
        "worker": 0,
        "t": 1794297079643.1802,
        "elu": 0.6637945683051116
      },
      {
        "worker": 2,
        "t": 1794297079711.4714,
        "elu": 0.9611190921980111
      },
      {
        "worker": 1,
        "t": 1794297079845.2095,
        "elu": 0.855546794007271
      },
      {
        "worker": 0,
        "t": 1794297080143.1438,
        "elu": 0.8349083779116215
      },
      {
        "worker": 2,
        "t": 1794297080258.7078,
        "elu": 0.8565573977120737
      },
      {
        "worker": 1,
        "t": 1794297080347.406,
        "elu": 0.8678779514653298
      },
      {
        "worker": 0,
        "t": 1794297080674.5068,
        "elu": 0.9704200550529959
      },
      {
        "worker": 2,
        "t": 1794297080762.5894,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297080846.9575,
        "elu": 0.9355797198888351
      },
      {
        "worker": 0,
        "t": 1794297081174.5247,
        "elu": 0.8175192814219518
      },
      {
        "worker": 2,
        "t": 1794297081283.5876,
        "elu": 0.9261110546928647
      },
      {
        "worker": 1,
        "t": 1794297081347.5154,
        "elu": 0.5835828544600152
      },
      {
        "worker": 0,
        "t": 1794297081674.3005,
        "elu": 0.8418791501999845
      },
      {
        "worker": 2,
        "t": 1794297081805.3264,
        "elu": 0.9855484566181735
      },
      {
        "worker": 1,
        "t": 1794297081866.148,
        "elu": 0.8161322131159128
      },
      {
        "worker": 0,
        "t": 1794297082175.8267,
        "elu": 0.9735289328033825
      },
      {
        "worker": 2,
        "t": 1794297082305.3604,
        "elu": 0.889801684554981
      },
      {
        "worker": 1,
        "t": 1794297082366.9568,
        "elu": 0.9349767177146622
      },
      {
        "worker": 0,
        "t": 1794297082684.5574,
        "elu": 0.8583435755372367
      },
      {
        "worker": 2,
        "t": 1794297082805.0781,
        "elu": 0.7127457150663157
      },
      {
        "worker": 1,
        "t": 1794297082867.396,
        "elu": 0.7905509389276899
      },
      {
        "worker": 0,
        "t": 1794297083189.4177,
        "elu": 0.895780320332773
      },
      {
        "worker": 2,
        "t": 1794297083305.295,
        "elu": 0.7653556489853213
      },
      {
        "worker": 1,
        "t": 1794297083366.9858,
        "elu": 0.8725686214859404
      },
      {
        "worker": 0,
        "t": 1794297083712.3462,
        "elu": 0.8962139827278688
      },
      {
        "worker": 2,
        "t": 1794297083809.6772,
        "elu": 0.9651906318407973
      },
      {
        "worker": 1,
        "t": 1794297083866.996,
        "elu": 0.9427996461053911
      },
      {
        "worker": 0,
        "t": 1794297084213.0327,
        "elu": 0.6369935311064535
      },
      {
        "worker": 2,
        "t": 1794297084309.1094,
        "elu": 0.6174722959496494
      },
      {
        "worker": 1,
        "t": 1794297084367.4348,
        "elu": 0.5882588888170477
      },
      {
        "worker": 0,
        "t": 1794297084724.64,
        "elu": 0.46251082324123394
      },
      {
        "worker": 2,
        "t": 1794297084921.384,
        "elu": 0.6731096647156121
      },
      {
        "worker": 1,
        "t": 1794297084943.7349,
        "elu": 0.9842000117978468
      },
      {
        "worker": 0,
        "t": 1794297085300.056,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297085468.359,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297085597.8496,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297085850.011,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297085978.5984,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297086109.0383,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297086356.9492,
        "elu": 0.9445290066183907
      },
      {
        "worker": 2,
        "t": 1794297086479.0454,
        "elu": 0.917993310627047
      },
      {
        "worker": 1,
        "t": 1794297086609.4395,
        "elu": 0.836058923204486
      },
      {
        "worker": 0,
        "t": 1794297086857.5388,
        "elu": 0.8420624101679016
      },
      {
        "worker": 2,
        "t": 1794297086979.7468,
        "elu": 0.7512082522301193
      },
      {
        "worker": 1,
        "t": 1794297087110.308,
        "elu": 0.8966896039366257
      },
      {
        "worker": 0,
        "t": 1794297087357.5125,
        "elu": 0.6675784830683682
      },
      {
        "worker": 2,
        "t": 1794297087486.5107,
        "elu": 0.817396500997915
      },
      {
        "worker": 1,
        "t": 1794297087639.3389,
        "elu": 0.9960489411153428
      },
      {
        "worker": 2,
        "t": 1794297087996.8767,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297088117.3167,
        "elu": 0.9529267669570293
      },
      {
        "worker": 1,
        "t": 1794297088142.0203,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297088496.5618,
        "elu": 0.8230750144784661
      },
      {
        "worker": 0,
        "t": 1794297088617.5508,
        "elu": 0.9224491405368521
      },
      {
        "worker": 1,
        "t": 1794297088663.8145,
        "elu": 0.8094813939587114
      },
      {
        "worker": 2,
        "t": 1794297088996.3684,
        "elu": 0.6762953947715767
      },
      {
        "worker": 1,
        "t": 1794297089169.335,
        "elu": 0.9706349698725719
      },
      {
        "worker": 0,
        "t": 1794297089202.0032,
        "elu": 0.9372227700372275
      },
      {
        "worker": 2,
        "t": 1794297089503.3982,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297089671.2334,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297089795.9958,
        "elu": 0.9887560411124446
      },
      {
        "worker": 2,
        "t": 1794297090005.492,
        "elu": 0.8040437880229581
      },
      {
        "worker": 1,
        "t": 1794297090171.6165,
        "elu": 0.595896237806495
      },
      {
        "worker": 0,
        "t": 1794297090297.7175,
        "elu": 0.4260641016128645
      },
      {
        "worker": 2,
        "t": 1794297090505.846,
        "elu": 0.41924161359872536
      },
      {
        "worker": 1,
        "t": 1794297090741.0046,
        "elu": 0.6190486313271437
      },
      {
        "worker": 0,
        "t": 1794297090962.8904,
        "elu": 0.894077754439423
      },
      {
        "worker": 2,
        "t": 1794297091122.019,
        "elu": 0.918615500856923
      },
      {
        "worker": 1,
        "t": 1794297091269.6484,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297091486.6123,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297091662.929,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297091879.7979,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297091999.2988,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297092167.234,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297092410.3289,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297092510.812,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297092684.5603,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297092924.672,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297093039.5176,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297093186.737,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297093426.5173,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297093548.3064,
        "elu": 0.9853068597480182
      },
      {
        "worker": 2,
        "t": 1794297093694.3184,
        "elu": 0.9741991534255666
      },
      {
        "worker": 1,
        "t": 1794297093926.1526,
        "elu": 0.9720540110268578
      },
      {
        "worker": 0,
        "t": 1794297094048.5085,
        "elu": 0.8883824813413759
      },
      {
        "worker": 2,
        "t": 1794297094216.6355,
        "elu": 0.9700923735858413
      },
      {
        "worker": 1,
        "t": 1794297094427.5908,
        "elu": 0.9031802507307626
      },
      {
        "worker": 0,
        "t": 1794297094547.9722,
        "elu": 0.9308934487854403
      },
      {
        "worker": 2,
        "t": 1794297094716.4524,
        "elu": 0.7416289204281356
      },
      {
        "worker": 1,
        "t": 1794297094933.291,
        "elu": 0.9059401257345816
      },
      {
        "worker": 0,
        "t": 1794297095057.796,
        "elu": 0.8115417077464226
      },
      {
        "worker": 2,
        "t": 1794297095220.2532,
        "elu": 0.8616542087176412
      },
      {
        "worker": 1,
        "t": 1794297095434.1902,
        "elu": 0.6857505830026198
      },
      {
        "worker": 0,
        "t": 1794297095623.1987,
        "elu": 0.9953669387203763
      },
      {
        "worker": 2,
        "t": 1794297095741.8906,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297095945.649,
        "elu": 0.9537995133614017
      },
      {
        "worker": 0,
        "t": 1794297096124.158,
        "elu": 0.8748707736310278
      },
      {
        "worker": 2,
        "t": 1794297096241.414,
        "elu": 0.8881191759351242
      },
      {
        "worker": 1,
        "t": 1794297096449.858,
        "elu": 0.8955774252568641
      },
      {
        "worker": 0,
        "t": 1794297096632.1873,
        "elu": 0.6168986657494381
      },
      {
        "worker": 2,
        "t": 1794297096767.7654,
        "elu": 0.8546224253403741
      },
      {
        "worker": 1,
        "t": 1794297096949.2703,
        "elu": 0.87190384167536
      },
      {
        "worker": 0,
        "t": 1794297097132.0696,
        "elu": 0.5236802558321604
      },
      {
        "worker": 2,
        "t": 1794297097269.0898,
        "elu": 0.6102691975136822
      },
      {
        "worker": 1,
        "t": 1794297097455.4265,
        "elu": 0.705502826276367
      },
      {
        "worker": 0,
        "t": 1794297097653.9023,
        "elu": 0.6866414436270891
      },
      {
        "worker": 2,
        "t": 1794297097769.272,
        "elu": 0.542398366052777
      },
      {
        "worker": 1,
        "t": 1794297097999.1794,
        "elu": 0.8998974783529474
      },
      {
        "worker": 0,
        "t": 1794297098170.925,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297098466.446,
        "elu": 0.898974857208828
      },
      {
        "worker": 1,
        "t": 1794297098622.292,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297098680.692,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297099151.3572,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297099232.0864,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297099497.579,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297099661.9546,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297099734.955,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297100020.1526,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297100191.748,
        "elu": 0.8213707982498986
      },
      {
        "worker": 0,
        "t": 1794297100235.8203,
        "elu": 0.7157144789426685
      },
      {
        "worker": 2,
        "t": 1794297100522.4817,
        "elu": 0.317583270198461
      },
      {
        "worker": 1,
        "t": 1794297100691.037,
        "elu": 0.6815953154130984
      },
      {
        "worker": 0,
        "t": 1794297100736.2756,
        "elu": 0.6978751542882129
      },
      {
        "worker": 2,
        "t": 1794297101142.8376,
        "elu": 0.8775742717932533
      },
      {
        "worker": 1,
        "t": 1794297101222.6675,
        "elu": 0.9890114231934607
      },
      {
        "worker": 1,
        "t": 1794297101768.7847,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297101876.4915,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297101961.2593,
        "elu": 0.9853759196883456
      },
      {
        "worker": 1,
        "t": 1794297102268.7866,
        "elu": 0.8810007734942057
      },
      {
        "worker": 2,
        "t": 1794297102376.6348,
        "elu": 0.8273020229226057
      },
      {
        "worker": 0,
        "t": 1794297102464.4583,
        "elu": 0.560809530018573
      },
      {
        "worker": 1,
        "t": 1794297102780.542,
        "elu": 0.3092043386174836
      },
      {
        "worker": 2,
        "t": 1794297102896.5515,
        "elu": 0.5115941465903837
      },
      {
        "worker": 0,
        "t": 1794297102965.0706,
        "elu": 0.4892103719149014
      },
      {
        "worker": 1,
        "t": 1794297103378.6992,
        "elu": 0.9829763244852898
      },
      {
        "worker": 2,
        "t": 1794297103396.2417,
        "elu": 0.9998232202713923
      },
      {
        "worker": 0,
        "t": 1794297103527.5808,
        "elu": 0.9219962871745054
      },
      {
        "worker": 2,
        "t": 1794297103917.8318,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297103929.228,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297104102.717,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297104429.165,
        "elu": 0.9944361790259914
      },
      {
        "worker": 2,
        "t": 1794297104536.3442,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297104602.7146,
        "elu": 0.8301633966944576
      },
      {
        "worker": 1,
        "t": 1794297104960.3262,
        "elu": 0.8352092604791149
      },
      {
        "worker": 2,
        "t": 1794297105036.835,
        "elu": 0.8949797790405506
      },
      {
        "worker": 0,
        "t": 1794297105146.6284,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297105469.9185,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297105562.8608,
        "elu": 0.9873336051013208
      },
      {
        "worker": 0,
        "t": 1794297105703.211,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297105971.4692,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297106062.963,
        "elu": 0.9968199158485921
      },
      {
        "worker": 0,
        "t": 1794297106207.6138,
        "elu": 0.990636866402554
      },
      {
        "worker": 1,
        "t": 1794297106471.6787,
        "elu": 0.8962896126572304
      },
      {
        "worker": 2,
        "t": 1794297106565.4587,
        "elu": 0.5659227582210263
      },
      {
        "worker": 0,
        "t": 1794297106707.068,
        "elu": 0.552443620578396
      },
      {
        "worker": 1,
        "t": 1794297106971.1387,
        "elu": 0.3044126105503483
      },
      {
        "worker": 2,
        "t": 1794297107089.1003,
        "elu": 0.45797986434274685
      },
      {
        "worker": 0,
        "t": 1794297107280.7666,
        "elu": 0.8062177218647203
      },
      {
        "worker": 1,
        "t": 1794297107696.1707,
        "elu": 0.9900628425026216
      },
      {
        "worker": 2,
        "t": 1794297107733.5027,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297107789.3687,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297108223.8425,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297108311.1807,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297108350.704,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297108729.064,
        "elu": 0.9911254514885022
      },
      {
        "worker": 0,
        "t": 1794297108821.6882,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297108850.463,
        "elu": 0.9022896788829715
      },
      {
        "worker": 1,
        "t": 1794297109229.1614,
        "elu": 0.7680965930121839
      },
      {
        "worker": 0,
        "t": 1794297109322.2498,
        "elu": 0.8408854505023086
      },
      {
        "worker": 2,
        "t": 1794297109354.1768,
        "elu": 0.7889178702961701
      },
      {
        "worker": 1,
        "t": 1794297109729.6062,
        "elu": 0.6756355922041167
      },
      {
        "worker": 0,
        "t": 1794297109822.9258,
        "elu": 0.9314382358067509
      },
      {
        "worker": 2,
        "t": 1794297109856.1802,
        "elu": 0.9563330803595911
      },
      {
        "worker": 1,
        "t": 1794297110229.7747,
        "elu": 0.6759339537924521
      },
      {
        "worker": 0,
        "t": 1794297110332.3003,
        "elu": 0.9639158425591907
      },
      {
        "worker": 2,
        "t": 1794297110356.1982,
        "elu": 0.8871998718615371
      },
      {
        "worker": 1,
        "t": 1794297110729.005,
        "elu": 0.7460461460688207
      },
      {
        "worker": 0,
        "t": 1794297110832.0293,
        "elu": 0.7434968131335522
      },
      {
        "worker": 2,
        "t": 1794297110858.2866,
        "elu": 0.8830247965107718
      },
      {
        "worker": 1,
        "t": 1794297111250.7925,
        "elu": 0.8868701297613982
      },
      {
        "worker": 0,
        "t": 1794297111347.7769,
        "elu": 0.907799572647309
      },
      {
        "worker": 2,
        "t": 1794297111366.1611,
        "elu": 0.9325889225398085
      },
      {
        "worker": 1,
        "t": 1794297111761.652,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297111858.9875,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297111881.2542,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297112261.2537,
        "elu": 0.8754367153724438
      },
      {
        "worker": 0,
        "t": 1794297112359.477,
        "elu": 0.8013261395403115
      },
      {
        "worker": 2,
        "t": 1794297112381.1448,
        "elu": 0.6988210974938646
      },
      {
        "worker": 1,
        "t": 1794297112766.2405,
        "elu": 0.8516284737649206
      },
      {
        "worker": 0,
        "t": 1794297112858.9834,
        "elu": 0.7613520991111301
      },
      {
        "worker": 2,
        "t": 1794297112883.269,
        "elu": 0.6242519457508706
      },
      {
        "worker": 1,
        "t": 1794297113267.084,
        "elu": 0.9044258177885477
      },
      {
        "worker": 0,
        "t": 1794297113359.9285,
        "elu": 0.8467842654729626
      },
      {
        "worker": 2,
        "t": 1794297113384.1714,
        "elu": 0.8814086579780445
      },
      {
        "worker": 1,
        "t": 1794297113832.177,
        "elu": 0.6448314157132615
      },
      {
        "worker": 2,
        "t": 1794297113891.1997,
        "elu": 0.5703124946710413
      },
      {
        "worker": 0,
        "t": 1794297113957.7942,
        "elu": 0.8072487020042586
      },
      {
        "worker": 1,
        "t": 1794297114332.1404,
        "elu": 0.20216096731096048
      },
      {
        "worker": 2,
        "t": 1794297114391.9229,
        "elu": 0.9535631890453037
      },
      {
        "worker": 0,
        "t": 1794297114458.2812,
        "elu": 0.630495890797854
      },
      {
        "worker": 1,
        "t": 1794297114833.0427,
        "elu": 0.011977814138048692
      },
      {
        "worker": 2,
        "t": 1794297114893.1106,
        "elu": 0.006049309728567446
      },
      {
        "worker": 0,
        "t": 1794297114958.6584,
        "elu": 0.482702532758889
      },
      {
        "worker": 1,
        "t": 1794297115334.074,
        "elu": 0.0058329990119691
      },
      {
        "worker": 2,
        "t": 1794297115396.2393,
        "elu": 0.005742587296180442
      },
      {
        "worker": 0,
        "t": 1794297115458.3052,
        "elu": 0.49038973210891323
      },
      {
        "worker": 1,
        "t": 1794297115839.088,
        "elu": 0.005715288181440702
      },
      {
        "worker": 2,
        "t": 1794297115902.3982,
        "elu": 0.009080374263906508
      },
      {
        "worker": 0,
        "t": 1794297115960.904,
        "elu": 0.49386180036629207
      },
      {
        "worker": 1,
        "t": 1794297116339.0955,
        "elu": 0.005036500336371742
      },
      {
        "worker": 2,
        "t": 1794297116402.971,
        "elu": 0.005176403628576358
      },
      {
        "worker": 0,
        "t": 1794297116460.8435,
        "elu": 0.48656254692635714
      },
      {
        "worker": 1,
        "t": 1794297116849.1396,
        "elu": 0.008453279594214432
      },
      {
        "worker": 2,
        "t": 1794297116904.0725,
        "elu": 0.0052490334738943675
      },
      {
        "worker": 0,
        "t": 1794297116960.7566,
        "elu": 0.4885983571692079
      },
      {
        "worker": 1,
        "t": 1794297117354.2373,
        "elu": 0.005605542331980346
      },
      {
        "worker": 2,
        "t": 1794297117404.3147,
        "elu": 0.00557657465914606
      },
      {
        "worker": 0,
        "t": 1794297117459.9788,
        "elu": 0.4972378031233919
      },
      {
        "worker": 1,
        "t": 1794297117854.7622,
        "elu": 0.006655134520046584
      },
      {
        "worker": 2,
        "t": 1794297117905.8687,
        "elu": 0.006777547634717787
      },
      {
        "worker": 0,
        "t": 1794297117960.76,
        "elu": 0.5182489627332925
      },
      {
        "worker": 1,
        "t": 1794297118354.976,
        "elu": 0.00675357627316419
      },
      {
        "worker": 2,
        "t": 1794297118405.6443,
        "elu": 0.011945581765099982
      },
      {
        "worker": 0,
        "t": 1794297118460.1785,
        "elu": 0.5049209655799789
      },
      {
        "worker": 1,
        "t": 1794297118863.2324,
        "elu": 0.006262911036256917
      },
      {
        "worker": 2,
        "t": 1794297118906.9138,
        "elu": 0.006997428033029744
      },
      {
        "worker": 0,
        "t": 1794297118960.4146,
        "elu": 0.48930939098335346
      },
      {
        "worker": 1,
        "t": 1794297119363.4175,
        "elu": 0.00982145469458465
      },
      {
        "worker": 2,
        "t": 1794297119408.118,
        "elu": 0.005215298474674681
      },
      {
        "worker": 0,
        "t": 1794297119459.9548,
        "elu": 0.48346154445562084
      },
      {
        "worker": 1,
        "t": 1794297119864.202,
        "elu": 0.005588433669607845
      },
      {
        "worker": 2,
        "t": 1794297119910.427,
        "elu": 0.006236368906283891
      },
      {
        "worker": 0,
        "t": 1794297119960.1506,
        "elu": 0.4792697611663887
      },
      {
        "worker": 1,
        "t": 1794297120374.5288,
        "elu": 0.005105542862157647
      },
      {
        "worker": 2,
        "t": 1794297120412.7412,
        "elu": 0.005394365298664592
      },
      {
        "worker": 0,
        "t": 1794297120460.552,
        "elu": 0.4779936414001738
      },
      {
        "worker": 1,
        "t": 1794297120875.0913,
        "elu": 0.0052623370185920955
      },
      {
        "worker": 2,
        "t": 1794297120912.9326,
        "elu": 0.009087041408450994
      },
      {
        "worker": 0,
        "t": 1794297120959.9963,
        "elu": 0.49032157255652475
      },
      {
        "worker": 1,
        "t": 1794297121377.4458,
        "elu": 0.0055314615874194305
      },
      {
        "worker": 2,
        "t": 1794297121418.9724,
        "elu": 0.005735982343429802
      },
      {
        "worker": 0,
        "t": 1794297121460.0503,
        "elu": 0.4867464634213219
      },
      {
        "worker": 1,
        "t": 1794297121877.054,
        "elu": 0.009554750688543603
      },
      {
        "worker": 2,
        "t": 1794297121920.6287,
        "elu": 0.005361150194519746
      },
      {
        "worker": 0,
        "t": 1794297121960.0657,
        "elu": 0.48677576518937554
      },
      {
        "worker": 1,
        "t": 1794297122377.8518,
        "elu": 0.005582770666500448
      },
      {
        "worker": 2,
        "t": 1794297122421.2205,
        "elu": 0.005584844019078022
      },
      {
        "worker": 0,
        "t": 1794297122460.4482,
        "elu": 0.4833636578672136
      },
      {
        "worker": 1,
        "t": 1794297122878.0508,
        "elu": 0.006029781800912423
      },
      {
        "worker": 2,
        "t": 1794297122921.211,
        "elu": 0.005692119100433134
      },
      {
        "worker": 0,
        "t": 1794297122960.7798,
        "elu": 0.4570746813165741
      },
      {
        "worker": 1,
        "t": 1794297123383.326,
        "elu": 0.0043742650690252885
      },
      {
        "worker": 2,
        "t": 1794297123421.9282,
        "elu": 0.009822813011383689
      },
      {
        "worker": 0,
        "t": 1794297123459.9653,
        "elu": 0.4793281994666555
      },
      {
        "worker": 1,
        "t": 1794297123886.0073,
        "elu": 0.00567924214009819
      },
      {
        "worker": 2,
        "t": 1794297123923.3135,
        "elu": 0.005261161281937591
      },
      {
        "worker": 0,
        "t": 1794297123960.279,
        "elu": 0.49121513718235454
      },
      {
        "worker": 1,
        "t": 1794297124387.0303,
        "elu": 0.008536213370623899
      },
      {
        "worker": 2,
        "t": 1794297124425.1438,
        "elu": 0.004836319062669477
      },
      {
        "worker": 0,
        "t": 1794297124460.3694,
        "elu": 0.4866165769821797
      },
      {
        "worker": 1,
        "t": 1794297124888.646,
        "elu": 0.0051125814624447055
      },
      {
        "worker": 2,
        "t": 1794297124927.951,
        "elu": 0.005061819206408693
      },
      {
        "worker": 0,
        "t": 1794297124960.2053,
        "elu": 0.4904683643774711
      },
      {
        "worker": 1,
        "t": 1794297125390.9336,
        "elu": 0.004855297249070662
      },
      {
        "worker": 2,
        "t": 1794297125429.6973,
        "elu": 0.004942171210003503
      },
      {
        "worker": 0,
        "t": 1794297125460.3052,
        "elu": 0.4709996692300363
      },
      {
        "worker": 1,
        "t": 1794297125891.5037,
        "elu": 0.005199154478001954
      },
      {
        "worker": 2,
        "t": 1794297125930.2932,
        "elu": 0.009078384262129022
      },
      {
        "worker": 0,
        "t": 1794297125960.943,
        "elu": 0.4786758571745709
      },
      {
        "worker": 1,
        "t": 1794297126391.241,
        "elu": 0.004984037493274296
      },
      {
        "worker": 2,
        "t": 1794297126431.2783,
        "elu": 0.003923364066042516
      },
      {
        "worker": 0,
        "t": 1794297126460.4697,
        "elu": 0.478332196944133
      },
      {
        "worker": 1,
        "t": 1794297126892.9016,
        "elu": 0.008451915033860547
      },
      {
        "worker": 2,
        "t": 1794297126932.0276,
        "elu": 0.005010483611196843
      },
      {
        "worker": 0,
        "t": 1794297126960.4253,
        "elu": 0.4820893331450124
      },
      {
        "worker": 1,
        "t": 1794297127393.4229,
        "elu": 0.005164132080492863
      },
      {
        "worker": 2,
        "t": 1794297127432.9922,
        "elu": 0.005195331328509843
      },
      {
        "worker": 0,
        "t": 1794297127459.799,
        "elu": 0.4788091795268996
      },
      {
        "worker": 1,
        "t": 1794297127893.4866,
        "elu": 0.005045424763832629
      },
      {
        "worker": 2,
        "t": 1794297127934.0034,
        "elu": 0.004950301532729667
      },
      {
        "worker": 0,
        "t": 1794297127959.108,
        "elu": 0.48291264155322755
      },
      {
        "worker": 1,
        "t": 1794297128394.5237,
        "elu": 0.005042807530242285
      },
      {
        "worker": 2,
        "t": 1794297128434.6187,
        "elu": 0.008248860655006044
      },
      {
        "worker": 0,
        "t": 1794297128459.1482,
        "elu": 0.4985294495619899
      },
      {
        "worker": 1,
        "t": 1794297128895.4658,
        "elu": 0.005450151746056084
      },
      {
        "worker": 2,
        "t": 1794297128943.629,
        "elu": 0.005197325861536324
      },
      {
        "worker": 0,
        "t": 1794297128960.174,
        "elu": 0.4582539555397603
      },
      {
        "worker": 1,
        "t": 1794297129396.0627,
        "elu": 0.009101075069274172
      },
      {
        "worker": 2,
        "t": 1794297129447.0242,
        "elu": 0.0053047269448861165
      },
      {
        "worker": 0,
        "t": 1794297129460.7578,
        "elu": 0.4752659491167277
      },
      {
        "worker": 1,
        "t": 1794297129896.4092,
        "elu": 0.005224408434623864
      },
      {
        "worker": 2,
        "t": 1794297129947.361,
        "elu": 0.005148559553578883
      },
      {
        "worker": 0,
        "t": 1794297129959.214,
        "elu": 0.49484543848316204
      },
      {
        "worker": 1,
        "t": 1794297130396.9387,
        "elu": 0.0056894912145440315
      },
      {
        "worker": 2,
        "t": 1794297130449.8474,
        "elu": 0.00572904151210132
      },
      {
        "worker": 0,
        "t": 1794297130459.243,
        "elu": 0.4971877173377211
      },
      {
        "worker": 1,
        "t": 1794297130901.627,
        "elu": 0.005717329101615738
      },
      {
        "worker": 2,
        "t": 1794297130951.879,
        "elu": 0.014260605849384031
      },
      {
        "worker": 0,
        "t": 1794297130959.6648,
        "elu": 0.4867670506914101
      },
      {
        "worker": 1,
        "t": 1794297131403.4524,
        "elu": 0.005427094465883389
      },
      {
        "worker": 2,
        "t": 1794297131453.04,
        "elu": 0.0060910694634106425
      },
      {
        "worker": 0,
        "t": 1794297131460.6099,
        "elu": 0.4864015397378854
      },
      {
        "worker": 1,
        "t": 1794297131904.2324,
        "elu": 0.010989169868157346
      },
      {
        "worker": 2,
        "t": 1794297131953.539,
        "elu": 0.005492267554332178
      },
      {
        "worker": 0,
        "t": 1794297131960.2144,
        "elu": 0.4925424393133779
      },
      {
        "worker": 1,
        "t": 1794297132404.4824,
        "elu": 0.005129927578991133
      },
      {
        "worker": 2,
        "t": 1794297132454.367,
        "elu": 0.0045055431867741524
      },
      {
        "worker": 0,
        "t": 1794297132461.5486,
        "elu": 0.48155904672255345
      },
      {
        "worker": 1,
        "t": 1794297132905.339,
        "elu": 0.00516042904286184
      },
      {
        "worker": 2,
        "t": 1794297132955.1467,
        "elu": 0.005280097461355814
      },
      {
        "worker": 0,
        "t": 1794297132961.407,
        "elu": 0.4881475928089222
      },
      {
        "worker": 1,
        "t": 1794297133405.6982,
        "elu": 0.00502780422880721
      },
      {
        "worker": 2,
        "t": 1794297133454.9348,
        "elu": 0.00873588102510336
      },
      {
        "worker": 0,
        "t": 1794297133461.1116,
        "elu": 0.4862213040169273
      },
      {
        "worker": 1,
        "t": 1794297133905.2148,
        "elu": 0.008599303798024616
      },
      {
        "worker": 2,
        "t": 1794297133956.003,
        "elu": 0.00587669590145986
      },
      {
        "worker": 0,
        "t": 1794297133961.296,
        "elu": 0.49928447347705707
      },
      {
        "worker": 1,
        "t": 1794297134412.905,
        "elu": 0.004980485229839566
      },
      {
        "worker": 2,
        "t": 1794297134458.142,
        "elu": 0.005120691021836742
      },
      {
        "worker": 0,
        "t": 1794297134461.2156,
        "elu": 0.491936245445239
      },
      {
        "worker": 1,
        "t": 1794297134913.32,
        "elu": 0.005067050575681069
      },
      {
        "worker": 2,
        "t": 1794297134958.9114,
        "elu": 0.0053965419278455395
      },
      {
        "worker": 0,
        "t": 1794297134961.4448,
        "elu": 0.492908528019417
      },
      {
        "worker": 1,
        "t": 1794297135413.976,
        "elu": 0.005027484015644601
      },
      {
        "worker": 2,
        "t": 1794297135459.3708,
        "elu": 0.00843325012068351
      },
      {
        "worker": 0,
        "t": 1794297135461.2136,
        "elu": 0.49142902175040265
      },
      {
        "worker": 1,
        "t": 1794297135915.302,
        "elu": 0.004304832520873186
      },
      {
        "worker": 2,
        "t": 1794297135960.2922,
        "elu": 0.005173381239651708
      },
      {
        "worker": 0,
        "t": 1794297135960.979,
        "elu": 0.48637451283123745
      },
      {
        "worker": 1,
        "t": 1794297136415.5583,
        "elu": 0.010312244300728838
      },
      {
        "worker": 2,
        "t": 1794297136461.4016,
        "elu": 0.005694652139721992
      },
      {
        "worker": 0,
        "t": 1794297136461.963,
        "elu": 0.5144537507150906
      },
      {
        "worker": 1,
        "t": 1794297136918.9583,
        "elu": 0.005354433086560587
      },
      {
        "worker": 0,
        "t": 1794297136962.717,
        "elu": 0.5002535887820228
      },
      {
        "worker": 2,
        "t": 1794297136964.9846,
        "elu": 0.00511961970807248
      },
      {
        "worker": 1,
        "t": 1794297137421.5393,
        "elu": 0.005202807442666776
      },
      {
        "worker": 0,
        "t": 1794297137461.6445,
        "elu": 0.445005187636634
      },
      {
        "worker": 2,
        "t": 1794297137466.1233,
        "elu": 0.005781115190969495
      },
      {
        "worker": 1,
        "t": 1794297137922.9998,
        "elu": 0.0054978111342659204
      },
      {
        "worker": 0,
        "t": 1794297137962.14,
        "elu": 0.49300009968014197
      },
      {
        "worker": 2,
        "t": 1794297137966.793,
        "elu": 0.010362359601301448
      },
      {
        "worker": 1,
        "t": 1794297138424.5242,
        "elu": 0.005052488938748876
      },
      {
        "worker": 0,
        "t": 1794297138462.2563,
        "elu": 0.49158135300450306
      },
      {
        "worker": 2,
        "t": 1794297138468.397,
        "elu": 0.004938917176080461
      },
      {
        "worker": 1,
        "t": 1794297138926.021,
        "elu": 0.009152452292701103
      },
      {
        "worker": 0,
        "t": 1794297138962.0078,
        "elu": 0.5124914110708647
      },
      {
        "worker": 2,
        "t": 1794297138969.942,
        "elu": 0.005128330203715525
      },
      {
        "worker": 1,
        "t": 1794297139432.2908,
        "elu": 0.00518713065704573
      },
      {
        "worker": 0,
        "t": 1794297139462.4314,
        "elu": 0.4973276286510103
      },
      {
        "worker": 2,
        "t": 1794297139471.3525,
        "elu": 0.004564622381080287
      },
      {
        "worker": 1,
        "t": 1794297139932.5586,
        "elu": 0.0053548933056015565
      },
      {
        "worker": 0,
        "t": 1794297139962.5625,
        "elu": 0.5086822073379377
      },
      {
        "worker": 2,
        "t": 1794297139980.5117,
        "elu": 0.005063089011614549
      },
      {
        "worker": 1,
        "t": 1794297140433.7168,
        "elu": 0.005380294008911561
      },
      {
        "worker": 0,
        "t": 1794297140461.9424,
        "elu": 0.48402751656862
      },
      {
        "worker": 2,
        "t": 1794297140480.948,
        "elu": 0.00878023770556436
      },
      {
        "worker": 1,
        "t": 1794297140934.0667,
        "elu": 0.005576372180137996
      },
      {
        "worker": 0,
        "t": 1794297140962.8757,
        "elu": 0.49624523980067337
      },
      {
        "worker": 2,
        "t": 1794297140981.9531,
        "elu": 0.005178183023624936
      },
      {
        "worker": 1,
        "t": 1794297141434.0586,
        "elu": 0.008294103583256985
      },
      {
        "worker": 0,
        "t": 1794297141462.0078,
        "elu": 0.4835193229261817
      },
      {
        "worker": 2,
        "t": 1794297141483.532,
        "elu": 0.004906008111927264
      },
      {
        "worker": 1,
        "t": 1794297141934.0168,
        "elu": 0.00506709882274143
      },
      {
        "worker": 0,
        "t": 1794297141962.1384,
        "elu": 0.4882753635298155
      },
      {
        "worker": 2,
        "t": 1794297141992.669,
        "elu": 0.004915349240458876
      },
      {
        "worker": 1,
        "t": 1794297142435.0002,
        "elu": 0.003951297872131015
      },
      {
        "worker": 0,
        "t": 1794297142462.9377,
        "elu": 0.48148610460717706
      },
      {
        "worker": 2,
        "t": 1794297142493.4287,
        "elu": 0.0050582345025380355
      },
      {
        "worker": 1,
        "t": 1794297142939.6204,
        "elu": 0.004943663740097877
      },
      {
        "worker": 0,
        "t": 1794297142962.238,
        "elu": 0.49050382086465427
      },
      {
        "worker": 2,
        "t": 1794297142996.399,
        "elu": 0.008776041455606731
      },
      {
        "worker": 1,
        "t": 1794297143439.4539,
        "elu": 0.0050634270233916295
      },
      {
        "worker": 0,
        "t": 1794297143462.346,
        "elu": 0.4835324656125842
      },
      {
        "worker": 2,
        "t": 1794297143497.366,
        "elu": 0.004895946061841605
      },
      {
        "worker": 1,
        "t": 1794297143942.1284,
        "elu": 0.008687531932514841
      },
      {
        "worker": 0,
        "t": 1794297143962.2349,
        "elu": 0.48636575950199906
      },
      {
        "worker": 2,
        "t": 1794297143997.834,
        "elu": 0.0055054383377483316
      },
      {
        "worker": 1,
        "t": 1794297144443.1316,
        "elu": 0.004983014276130078
      },
      {
        "worker": 0,
        "t": 1794297144462.2136,
        "elu": 0.49134765368130345
      },
      {
        "worker": 2,
        "t": 1794297144498.4978,
        "elu": 0.004986464913182438
      },
      {
        "worker": 1,
        "t": 1794297144943.9912,
        "elu": 0.00548184039835708
      },
      {
        "worker": 0,
        "t": 1794297144962.994,
        "elu": 0.5021340220477636
      },
      {
        "worker": 2,
        "t": 1794297144998.9893,
        "elu": 0.005616666244614988
      },
      {
        "worker": 1,
        "t": 1794297145444.2703,
        "elu": 0.005206008002557081
      },
      {
        "worker": 0,
        "t": 1794297145462.128,
        "elu": 0.5112199048870762
      },
      {
        "worker": 2,
        "t": 1794297145500.8188,
        "elu": 0.010128146146121245
      },
      {
        "worker": 1,
        "t": 1794297145945.2913,
        "elu": 0.005551055942928561
      },
      {
        "worker": 0,
        "t": 1794297145962.288,
        "elu": 0.514358994762562
      },
      {
        "worker": 2,
        "t": 1794297146001.4138,
        "elu": 0.00459630154084342
      },
      {
        "worker": 1,
        "t": 1794297146447.638,
        "elu": 0.012904651443308691
      },
      {
        "worker": 0,
        "t": 1794297146462.6387,
        "elu": 0.3551392735554741
      },
      {
        "worker": 2,
        "t": 1794297146501.39,
        "elu": 0.006806450266309501
      },
      {
        "worker": 1,
        "t": 1794297146949.0588,
        "elu": 0.006368775110492233
      },
      {
        "worker": 0,
        "t": 1794297146962.5454,
        "elu": 0.38541120812769103
      },
      {
        "worker": 2,
        "t": 1794297147003.315,
        "elu": 0.005950668108268374
      },
      {
        "worker": 1,
        "t": 1794297147451.3474,
        "elu": 0.005881253436252162
      },
      {
        "worker": 0,
        "t": 1794297147462.067,
        "elu": 0.4853181453578484
      },
      {
        "worker": 2,
        "t": 1794297147503.9265,
        "elu": 0.005931260158070281
      },
      {
        "worker": 1,
        "t": 1794297147952.0852,
        "elu": 0.006188298299225525
      },
      {
        "worker": 0,
        "t": 1794297147962.2056,
        "elu": 0.5283482799222373
      },
      {
        "worker": 2,
        "t": 1794297148006.2354,
        "elu": 0.013239731642300153
      },
      {
        "worker": 1,
        "t": 1794297148453.1594,
        "elu": 0.006506881647483261
      },
      {
        "worker": 0,
        "t": 1794297148462.0364,
        "elu": 0.5296177221128395
      },
      {
        "worker": 2,
        "t": 1794297148506.7576,
        "elu": 0.005603165074572516
      },
      {
        "worker": 1,
        "t": 1794297148953.8262,
        "elu": 0.013505085157648667
      },
      {
        "worker": 0,
        "t": 1794297148963.4204,
        "elu": 0.5260076279928293
      },
      {
        "worker": 2,
        "t": 1794297149006.9888,
        "elu": 0.006141188799979725
      },
      {
        "worker": 1,
        "t": 1794297149454.0745,
        "elu": 0.006572724415900216
      },
      {
        "worker": 0,
        "t": 1794297149463.0283,
        "elu": 0.5291155279500438
      },
      {
        "worker": 2,
        "t": 1794297149510.0437,
        "elu": 0.00612215421305594
      },
      {
        "worker": 1,
        "t": 1794297149956.061,
        "elu": 0.005028367853460582
      },
      {
        "worker": 0,
        "t": 1794297149963.1409,
        "elu": 0.517062346582055
      },
      {
        "worker": 2,
        "t": 1794297150010.927,
        "elu": 0.005974857380698676
      },
      {
        "worker": 1,
        "t": 1794297150457.9714,
        "elu": 0.005792881691968158
      },
      {
        "worker": 0,
        "t": 1794297150463.2837,
        "elu": 0.5124412889226114
      },
      {
        "worker": 2,
        "t": 1794297150511.154,
        "elu": 0.010533638714487053
      },
      {
        "worker": 0,
        "t": 1794297150963.7573,
        "elu": 0.5181130483176247
      },
      {
        "worker": 1,
        "t": 1794297150965.4102,
        "elu": 0.0061294254663246265
      },
      {
        "worker": 2,
        "t": 1794297151012.0164,
        "elu": 0.006740494674529536
      },
      {
        "worker": 0,
        "t": 1794297151463.6663,
        "elu": 0.5146703526130748
      },
      {
        "worker": 1,
        "t": 1794297151465.424,
        "elu": 0.009598643180452521
      },
      {
        "worker": 2,
        "t": 1794297151515.9497,
        "elu": 0.005444837324969773
      },
      {
        "worker": 0,
        "t": 1794297151963.0842,
        "elu": 0.5064781123806532
      },
      {
        "worker": 1,
        "t": 1794297151966.2402,
        "elu": 0.005363765739062436
      },
      {
        "worker": 2,
        "t": 1794297152016.9893,
        "elu": 0.005717727456397814
      },
      {
        "worker": 0,
        "t": 1794297152462.9219,
        "elu": 0.5194246600939704
      },
      {
        "worker": 1,
        "t": 1794297152467.434,
        "elu": 0.005612947016072367
      },
      {
        "worker": 2,
        "t": 1794297152519.9033,
        "elu": 0.009777022206401363
      },
      {
        "worker": 0,
        "t": 1794297152963.144,
        "elu": 0.5258847403770864
      },
      {
        "worker": 1,
        "t": 1794297152967.3987,
        "elu": 0.005476904333481035
      },
      {
        "worker": 2,
        "t": 1794297153020.4097,
        "elu": 0.005518931569813306
      },
      {
        "worker": 0,
        "t": 1794297153463.2126,
        "elu": 0.5019309478595354
      },
      {
        "worker": 1,
        "t": 1794297153467.9536,
        "elu": 0.008753850834477805
      },
      {
        "worker": 2,
        "t": 1794297153520.1785,
        "elu": 0.00519190599505337
      },
      {
        "worker": 0,
        "t": 1794297153963.4346,
        "elu": 0.652414042825583
      },
      {
        "worker": 1,
        "t": 1794297153968.7263,
        "elu": 0.00562560662901212
      },
      {
        "worker": 2,
        "t": 1794297154020.9365,
        "elu": 0.005391013041595381
      },
      {
        "worker": 0,
        "t": 1794297154463.0967,
        "elu": 0.5194265645065937
      },
      {
        "worker": 1,
        "t": 1794297154469.2444,
        "elu": 0.005818967982345574
      },
      {
        "worker": 2,
        "t": 1794297154522.0015,
        "elu": 0.005087007297212279
      },
      {
        "worker": 0,
        "t": 1794297154963.2935,
        "elu": 0.5149808786795276
      },
      {
        "worker": 1,
        "t": 1794297154969.659,
        "elu": 0.005071226069988478
      },
      {
        "worker": 2,
        "t": 1794297155023.168,
        "elu": 0.008560413678079012
      },
      {
        "worker": 0,
        "t": 1794297155463.7363,
        "elu": 0.5320008705653025
      },
      {
        "worker": 1,
        "t": 1794297155469.7026,
        "elu": 0.005225537063538623
      },
      {
        "worker": 2,
        "t": 1794297155526.4397,
        "elu": 0.005460466076854067
      },
      {
        "worker": 0,
        "t": 1794297155962.9055,
        "elu": 0.5266153867432692
      },
      {
        "worker": 1,
        "t": 1794297155969.0051,
        "elu": 0.009024598246257644
      },
      {
        "worker": 2,
        "t": 1794297156031.3853,
        "elu": 0.005219870192076107
      },
      {
        "worker": 0,
        "t": 1794297156463.5962,
        "elu": 0.5038018373518159
      },
      {
        "worker": 1,
        "t": 1794297156469.2908,
        "elu": 0.005104160964163192
      },
      {
        "worker": 2,
        "t": 1794297156533.002,
        "elu": 0.00493745295046666
      },
      {
        "worker": 0,
        "t": 1794297156962.9778,
        "elu": 0.5294695386413093
      },
      {
        "worker": 1,
        "t": 1794297156970.878,
        "elu": 0.004157302262819967
      },
      {
        "worker": 2,
        "t": 1794297157033.9746,
        "elu": 0.0051371023433917275
      },
      {
        "worker": 0,
        "t": 1794297157463.195,
        "elu": 0.5252618848608108
      },
      {
        "worker": 1,
        "t": 1794297157471.0046,
        "elu": 0.0049693300662449836
      },
      {
        "worker": 2,
        "t": 1794297157534.8738,
        "elu": 0.009188626762414867
      },
      {
        "worker": 0,
        "t": 1794297157963.323,
        "elu": 0.5214320281878739
      },
      {
        "worker": 1,
        "t": 1794297157971.4177,
        "elu": 0.005349931731769188
      },
      {
        "worker": 2,
        "t": 1794297158035.0024,
        "elu": 0.005100026755035702
      },
      {
        "worker": 0,
        "t": 1794297158463.51,
        "elu": 0.5252435394395708
      },
      {
        "worker": 1,
        "t": 1794297158472.0076,
        "elu": 0.00854789837314716
      },
      {
        "worker": 2,
        "t": 1794297158535.8596,
        "elu": 0.005279457892423422
      },
      {
        "worker": 0,
        "t": 1794297158963.469,
        "elu": 0.527644137822169
      },
      {
        "worker": 1,
        "t": 1794297158974.1204,
        "elu": 0.005245169512321591
      },
      {
        "worker": 2,
        "t": 1794297159035.645,
        "elu": 0.00502132807327969
      },
      {
        "worker": 0,
        "t": 1794297159463.239,
        "elu": 0.5079452171340969
      },
      {
        "worker": 1,
        "t": 1794297159474.9482,
        "elu": 0.005239679700292559
      },
      {
        "worker": 2,
        "t": 1794297159544.4094,
        "elu": 0.00496759407231625
      },
      {
        "worker": 0,
        "t": 1794297159963.1438,
        "elu": 0.5224451768596552
      },
      {
        "worker": 1,
        "t": 1794297159977.0537,
        "elu": 0.005082922694969924
      },
      {
        "worker": 2,
        "t": 1794297160045.1829,
        "elu": 0.008484473529788261
      },
      {
        "worker": 0,
        "t": 1794297160463.1558,
        "elu": 0.5220408242431517
      },
      {
        "worker": 1,
        "t": 1794297160482.3145,
        "elu": 0.004954209402871205
      },
      {
        "worker": 2,
        "t": 1794297160546.7852,
        "elu": 0.004881513527152183
      },
      {
        "worker": 0,
        "t": 1794297160963.5813,
        "elu": 0.5078421120517503
      },
      {
        "worker": 1,
        "t": 1794297160982.701,
        "elu": 0.008849739758126002
      },
      {
        "worker": 2,
        "t": 1794297161046.9666,
        "elu": 0.005351824449773813
      },
      {
        "worker": 0,
        "t": 1794297161462.9546,
        "elu": 0.5228351497455153
      },
      {
        "worker": 1,
        "t": 1794297161482.094,
        "elu": 0.00499473339251826
      },
      {
        "worker": 2,
        "t": 1794297161548.226,
        "elu": 0.004977465136155149
      },
      {
        "worker": 0,
        "t": 1794297161963.122,
        "elu": 0.5128091746224414
      },
      {
        "worker": 1,
        "t": 1794297161982.2168,
        "elu": 0.0050269336834309515
      },
      {
        "worker": 2,
        "t": 1794297162048.953,
        "elu": 0.005006472806076048
      },
      {
        "worker": 0,
        "t": 1794297162463.1606,
        "elu": 0.5034823633238781
      },
      {
        "worker": 1,
        "t": 1794297162482.9382,
        "elu": 0.005045899658261563
      },
      {
        "worker": 2,
        "t": 1794297162549.5215,
        "elu": 0.00900174828016082
      },
      {
        "worker": 0,
        "t": 1794297162962.9585,
        "elu": 0.5256046233603002
      },
      {
        "worker": 1,
        "t": 1794297162984.5032,
        "elu": 0.005134761192639564
      },
      {
        "worker": 2,
        "t": 1794297163049.5403,
        "elu": 0.004174174833675255
      },
      {
        "worker": 0,
        "t": 1794297163464.095,
        "elu": 0.5247506870132819
      },
      {
        "worker": 1,
        "t": 1794297163493.9612,
        "elu": 0.00819049044414812
      },
      {
        "worker": 2,
        "t": 1794297163553.0325,
        "elu": 0.004992963054721768
      },
      {
        "worker": 0,
        "t": 1794297163964.51,
        "elu": 0.5134700453799613
      },
      {
        "worker": 1,
        "t": 1794297163996.5413,
        "elu": 0.005076631793096788
      },
      {
        "worker": 2,
        "t": 1794297164053.7598,
        "elu": 0.005092839354187447
      },
      {
        "worker": 0,
        "t": 1794297164467.4546,
        "elu": 0.530112583905161
      },
      {
        "worker": 1,
        "t": 1794297164496.3022,
        "elu": 0.005052529471433258
      },
      {
        "worker": 2,
        "t": 1794297164553.7207,
        "elu": 0.005245920337687292
      },
      {
        "worker": 0,
        "t": 1794297164967.3286,
        "elu": 0.5322417037999794
      },
      {
        "worker": 1,
        "t": 1794297164997.3464,
        "elu": 0.003985818099352961
      },
      {
        "worker": 2,
        "t": 1794297165054.0894,
        "elu": 0.00870223727184048
      },
      {
        "worker": 0,
        "t": 1794297165468.9866,
        "elu": 0.5047153583628328
      },
      {
        "worker": 1,
        "t": 1794297165503.1707,
        "elu": 0.004920944813951618
      },
      {
        "worker": 2,
        "t": 1794297165556.2842,
        "elu": 0.004995330546788969
      },
      {
        "worker": 0,
        "t": 1794297165969.234,
        "elu": 0.5271159186502886
      },
      {
        "worker": 1,
        "t": 1794297166003.933,
        "elu": 0.00893083255622248
      },
      {
        "worker": 2,
        "t": 1794297166057.143,
        "elu": 0.005033269426768751
      },
      {
        "worker": 0,
        "t": 1794297166469.1604,
        "elu": 0.5107472979435939
      },
      {
        "worker": 1,
        "t": 1794297166509.5547,
        "elu": 0.00487305074720914
      },
      {
        "worker": 2,
        "t": 1794297166558.9365,
        "elu": 0.004882502607993023
      },
      {
        "worker": 0,
        "t": 1794297166972.3354,
        "elu": 0.52383082812732
      },
      {
        "worker": 1,
        "t": 1794297167013.2402,
        "elu": 0.00507593795879384
      },
      {
        "worker": 2,
        "t": 1794297167059.3567,
        "elu": 0.005021108942299424
      },
      {
        "worker": 0,
        "t": 1794297167472.3914,
        "elu": 0.596121735084655
      },
      {
        "worker": 1,
        "t": 1794297167513.6511,
        "elu": 0.006930849131203007
      },
      {
        "worker": 2,
        "t": 1794297167559.9688,
        "elu": 0.010216528774962801
      },
      {
        "worker": 0,
        "t": 1794297167972.5364,
        "elu": 0.5239511512249956
      },
      {
        "worker": 1,
        "t": 1794297168013.9895,
        "elu": 0.005052578711214107
      },
      {
        "worker": 2,
        "t": 1794297168060.694,
        "elu": 0.004021656972285405
      },
      {
        "worker": 0,
        "t": 1794297168472.1228,
        "elu": 0.506148623570427
      },
      {
        "worker": 1,
        "t": 1794297168514.9702,
        "elu": 0.008351690345517467
      },
      {
        "worker": 2,
        "t": 1794297168561.0608,
        "elu": 0.004989850643727839
      },
      {
        "worker": 0,
        "t": 1794297168972.0212,
        "elu": 0.5112632270396306
      },
      {
        "worker": 1,
        "t": 1794297169016.112,
        "elu": 0.005157479576565189
      },
      {
        "worker": 2,
        "t": 1794297169061.9302,
        "elu": 0.004971195935530654
      },
      {
        "worker": 0,
        "t": 1794297169473.0007,
        "elu": 0.514326116125308
      },
      {
        "worker": 1,
        "t": 1794297169519.9492,
        "elu": 0.004921487671458784
      },
      {
        "worker": 2,
        "t": 1794297169563.0105,
        "elu": 0.004921117726951924
      },
      {
        "worker": 0,
        "t": 1794297169971.966,
        "elu": 0.4971705469099154
      },
      {
        "worker": 1,
        "t": 1794297170020.1255,
        "elu": 0.005255989172492778
      },
      {
        "worker": 2,
        "t": 1794297170063.5232,
        "elu": 0.008561017214901814
      },
      {
        "worker": 0,
        "t": 1794297170472.2734,
        "elu": 0.5126567139340256
      },
      {
        "worker": 1,
        "t": 1794297170523.6199,
        "elu": 0.01514294377923258
      },
      {
        "worker": 2,
        "t": 1794297170564.9922,
        "elu": 0.005139840554645535
      },
      {
        "worker": 0,
        "t": 1794297170973.0325,
        "elu": 0.5144567546458756
      },
      {
        "worker": 1,
        "t": 1794297171026.086,
        "elu": 0.004971390209912531
      },
      {
        "worker": 2,
        "t": 1794297171071.4026,
        "elu": 0.00488716523029323
      },
      {
        "worker": 0,
        "t": 1794297171473.0562,
        "elu": 0.5018152402605125
      },
      {
        "worker": 1,
        "t": 1794297171526.0781,
        "elu": 0.004911078543563281
      },
      {
        "worker": 2,
        "t": 1794297171573.8708,
        "elu": 0.004924784590743829
      },
      {
        "worker": 0,
        "t": 1794297171973.394,
        "elu": 0.5004345619824907
      },
      {
        "worker": 1,
        "t": 1794297172027.048,
        "elu": 0.00416691375082856
      },
      {
        "worker": 2,
        "t": 1794297172073.8198,
        "elu": 0.008391679867468211
      },
      {
        "worker": 0,
        "t": 1794297172472.9482,
        "elu": 0.49756363573287926
      },
      {
        "worker": 1,
        "t": 1794297172527.4604,
        "elu": 0.005108791112517689
      },
      {
        "worker": 2,
        "t": 1794297172574.9407,
        "elu": 0.005123765238942172
      },
      {
        "worker": 0,
        "t": 1794297172973.2683,
        "elu": 0.5071754716738589
      },
      {
        "worker": 1,
        "t": 1794297173028.4778,
        "elu": 0.008439076514791208
      },
      {
        "worker": 2,
        "t": 1794297173076.413,
        "elu": 0.004951014672690716
      },
      {
        "worker": 0,
        "t": 1794297173473.1653,
        "elu": 0.4941678646868598
      },
      {
        "worker": 1,
        "t": 1794297173529.0315,
        "elu": 0.005010304770297245
      },
      {
        "worker": 2,
        "t": 1794297173579.2236,
        "elu": 0.004847428169605245
      },
      {
        "worker": 0,
        "t": 1794297173973.088,
        "elu": 0.5167294383304163
      },
      {
        "worker": 1,
        "t": 1794297174029.069,
        "elu": 0.005527501922929234
      },
      {
        "worker": 2,
        "t": 1794297174081.378,
        "elu": 0.004539244019553555
      },
      {
        "worker": 0,
        "t": 1794297174473.211,
        "elu": 0.5088096554243119
      },
      {
        "worker": 1,
        "t": 1794297174530.8892,
        "elu": 0.004897644368851358
      },
      {
        "worker": 2,
        "t": 1794297174581.9827,
        "elu": 0.008519251303995843
      },
      {
        "worker": 0,
        "t": 1794297174973.655,
        "elu": 0.5011356610029376
      },
      {
        "worker": 1,
        "t": 1794297175031.9976,
        "elu": 0.005112964577621968
      },
      {
        "worker": 2,
        "t": 1794297175082.841,
        "elu": 0.00515790368891768
      },
      {
        "worker": 0,
        "t": 1794297175472.9878,
        "elu": 0.5029893385551175
      },
      {
        "worker": 1,
        "t": 1794297175540.901,
        "elu": 0.008644829446790344
      },
      {
        "worker": 2,
        "t": 1794297175582.2166,
        "elu": 0.005450650714725046
      },
      {
        "worker": 0,
        "t": 1794297175972.991,
        "elu": 0.511834704793248
      },
      {
        "worker": 1,
        "t": 1794297176041.6992,
        "elu": 0.0055097906693450695
      },
      {
        "worker": 2,
        "t": 1794297176082.2454,
        "elu": 0.005167891372434879
      },
      {
        "worker": 0,
        "t": 1794297176474.5964,
        "elu": 0.39445629345506733
      },
      {
        "worker": 1,
        "t": 1794297176541.5835,
        "elu": 0.005115012144627921
      },
      {
        "worker": 2,
        "t": 1794297176583.3325,
        "elu": 0.005005698223418908
      },
      {
        "worker": 0,
        "t": 1794297176985.0037,
        "elu": 0.006614629461620307
      },
      {
        "worker": 1,
        "t": 1794297177041.63,
        "elu": 0.004013286363150049
      },
      {
        "worker": 2,
        "t": 1794297177085.5952,
        "elu": 0.00880615685465092
      },
      {
        "worker": 0,
        "t": 1794297177495.238,
        "elu": 0.004924530045659054
      },
      {
        "worker": 1,
        "t": 1794297177541.8174,
        "elu": 0.004980617891148491
      },
      {
        "worker": 2,
        "t": 1794297177585.3916,
        "elu": 0.0050099591062070506
      },
      {
        "worker": 0,
        "t": 1794297178001.5312,
        "elu": 0.008349943581100236
      },
      {
        "worker": 1,
        "t": 1794297178051.51,
        "elu": 0.008225733572968255
      },
      {
        "worker": 2,
        "t": 1794297178086.715,
        "elu": 0.004980723127606257
      },
      {
        "worker": 0,
        "t": 1794297178502.3264,
        "elu": 0.004776407219629098
      },
      {
        "worker": 1,
        "t": 1794297178552.0784,
        "elu": 0.004903661120524208
      },
      {
        "worker": 2,
        "t": 1794297178587.738,
        "elu": 0.0039158308522740685
      },
      {
        "worker": 0,
        "t": 1794297179009.161,
        "elu": 0.006339905988056168
      },
      {
        "worker": 1,
        "t": 1794297179052.752,
        "elu": 0.007025498243090741
      },
      {
        "worker": 2,
        "t": 1794297179087.7131,
        "elu": 0.0067437336720423385
      },
      {
        "worker": 0,
        "t": 1794297179510.268,
        "elu": 0.005124165979158118
      },
      {
        "worker": 1,
        "t": 1794297179552.9917,
        "elu": 0.005093606139273118
      },
      {
        "worker": 2,
        "t": 1794297179587.9963,
        "elu": 0.012208921194838872
      },
      {
        "worker": 0,
        "t": 1794297180013.0273,
        "elu": 0.005597749550009176
      },
      {
        "worker": 1,
        "t": 1794297180054.8137,
        "elu": 0.004242592134501993
      },
      {
        "worker": 2,
        "t": 1794297180091.4214,
        "elu": 0.007352619664058931
      },
      {
        "worker": 0,
        "t": 1794297180513.7578,
        "elu": 0.10902600723174165
      },
      {
        "worker": 1,
        "t": 1794297180555.157,
        "elu": 0.02589545841307665
      },
      {
        "worker": 2,
        "t": 1794297180591.356,
        "elu": 0.011028981281829322
      },
      {
        "worker": 0,
        "t": 1794297181013.0728,
        "elu": 0.4136790500487011
      },
      {
        "worker": 1,
        "t": 1794297181056.1438,
        "elu": 0.005184954121523382
      },
      {
        "worker": 2,
        "t": 1794297181094.9512,
        "elu": 0.005558194559219926
      },
      {
        "worker": 0,
        "t": 1794297181513.0522,
        "elu": 0.5177013405274937
      },
      {
        "worker": 1,
        "t": 1794297181557.717,
        "elu": 0.005376833578507573
      },
      {
        "worker": 2,
        "t": 1794297181596.2688,
        "elu": 0.005449509065213284
      },
      {
        "worker": 0,
        "t": 1794297182012.9407,
        "elu": 0.5056164564740845
      },
      {
        "worker": 1,
        "t": 1794297182058.067,
        "elu": 0.005484796660657709
      },
      {
        "worker": 2,
        "t": 1794297182097.393,
        "elu": 0.014616620748346142
      },
      {
        "worker": 0,
        "t": 1794297182513.1653,
        "elu": 0.5455375141400891
      },
      {
        "worker": 1,
        "t": 1794297182559.7488,
        "elu": 0.005053203337732368
      },
      {
        "worker": 2,
        "t": 1794297182600.0833,
        "elu": 0.005063429939165085
      },
      {
        "worker": 0,
        "t": 1794297183013.047,
        "elu": 0.5503864078442839
      },
      {
        "worker": 1,
        "t": 1794297183062.511,
        "elu": 0.008661236747303416
      },
      {
        "worker": 2,
        "t": 1794297183101.1604,
        "elu": 0.005368601620014653
      },
      {
        "worker": 0,
        "t": 1794297183513.1104,
        "elu": 0.5920870191471707
      },
      {
        "worker": 1,
        "t": 1794297183564.2305,
        "elu": 0.005606504713482811
      },
      {
        "worker": 2,
        "t": 1794297183601.771,
        "elu": 0.005723649530082233
      },
      {
        "worker": 0,
        "t": 1794297184011.9248,
        "elu": 0.5261015212198078
      },
      {
        "worker": 1,
        "t": 1794297184064.4102,
        "elu": 0.005604497492228648
      },
      {
        "worker": 2,
        "t": 1794297184100.2097,
        "elu": 0.005949472490859714
      },
      {
        "worker": 0,
        "t": 1794297184512.383,
        "elu": 0.5321991573639036
      },
      {
        "worker": 1,
        "t": 1794297184565.0198,
        "elu": 0.0050401879540005225
      },
      {
        "worker": 2,
        "t": 1794297184602.5586,
        "elu": 0.00914639581328557
      },
      {
        "worker": 0,
        "t": 1794297185013.1238,
        "elu": 0.5357777455054344
      },
      {
        "worker": 1,
        "t": 1794297185067.9866,
        "elu": 0.004146553125516931
      },
      {
        "worker": 2,
        "t": 1794297185102.0566,
        "elu": 0.005098445784034485
      },
      {
        "worker": 0,
        "t": 1794297185514.484,
        "elu": 0.5405798375233505
      },
      {
        "worker": 1,
        "t": 1794297185569.147,
        "elu": 0.008427593408343668
      },
      {
        "worker": 2,
        "t": 1794297185602.4792,
        "elu": 0.005073394202881883
      },
      {
        "worker": 0,
        "t": 1794297186015.5168,
        "elu": 0.5433806565588964
      },
      {
        "worker": 1,
        "t": 1794297186070.0825,
        "elu": 0.005983919349702403
      },
      {
        "worker": 2,
        "t": 1794297186103.1782,
        "elu": 0.005753226843704127
      },
      {
        "worker": 0,
        "t": 1794297186516.184,
        "elu": 0.5365833721203324
      },
      {
        "worker": 1,
        "t": 1794297186570.4036,
        "elu": 0.004995533365716165
      },
      {
        "worker": 2,
        "t": 1794297186604.0273,
        "elu": 0.004924228469849986
      },
      {
        "worker": 0,
        "t": 1794297187016.5867,
        "elu": 0.5365100004568526
      },
      {
        "worker": 1,
        "t": 1794297187071.3948,
        "elu": 0.005112123426815861
      },
      {
        "worker": 2,
        "t": 1794297187105.5225,
        "elu": 0.008342188879220194
      },
      {
        "worker": 0,
        "t": 1794297187516.315,
        "elu": 0.5371354024175695
      },
      {
        "worker": 1,
        "t": 1794297187571.0576,
        "elu": 0.005003391210732728
      },
      {
        "worker": 2,
        "t": 1794297187606.936,
        "elu": 0.00501659342482415
      },
      {
        "worker": 0,
        "t": 1794297188016.2437,
        "elu": 0.533012434942092
      },
      {
        "worker": 1,
        "t": 1794297188072.7844,
        "elu": 0.008431184080718981
      },
      {
        "worker": 2,
        "t": 1794297188111.4915,
        "elu": 0.004866565177154558
      },
      {
        "worker": 0,
        "t": 1794297188516.2878,
        "elu": 0.5199323385730498
      },
      {
        "worker": 1,
        "t": 1794297188571.4531,
        "elu": 0.0050001706018057875
      },
      {
        "worker": 2,
        "t": 1794297188617.8743,
        "elu": 0.0039164196404477426
      },
      {
        "worker": 0,
        "t": 1794297189016.9832,
        "elu": 0.5446322213898663
      },
      {
        "worker": 1,
        "t": 1794297189072.9912,
        "elu": 0.00516935350933261
      },
      {
        "worker": 2,
        "t": 1794297189119.384,
        "elu": 0.004938904839070263
      },
      {
        "worker": 0,
        "t": 1794297189517.3435,
        "elu": 0.5312144351671511
      },
      {
        "worker": 1,
        "t": 1794297189573.3833,
        "elu": 0.004996989734325357
      },
      {
        "worker": 2,
        "t": 1794297189620.0576,
        "elu": 0.008354087693467589
      },
      {
        "worker": 0,
        "t": 1794297190017.7666,
        "elu": 0.5313202824826451
      },
      {
        "worker": 1,
        "t": 1794297190076.127,
        "elu": 0.004940400748633227
      },
      {
        "worker": 2,
        "t": 1794297190121.9531,
        "elu": 0.004952408012124971
      },
      {
        "worker": 0,
        "t": 1794297190517.6003,
        "elu": 0.5293510790851077
      },
      {
        "worker": 1,
        "t": 1794297190578.198,
        "elu": 0.008392069022584
      },
      {
        "worker": 2,
        "t": 1794297190625.3064,
        "elu": 0.004888705654321765
      },
      {
        "worker": 0,
        "t": 1794297191016.9807,
        "elu": 0.5438906741301396
      },
      {
        "worker": 1,
        "t": 1794297191081.147,
        "elu": 0.005332155964876543
      },
      {
        "worker": 2,
        "t": 1794297191128.4106,
        "elu": 0.004998647906121753
      },
      {
        "worker": 0,
        "t": 1794297191517.1694,
        "elu": 0.531608232415735
      },
      {
        "worker": 1,
        "t": 1794297191583.0042,
        "elu": 0.0050187643117738726
      },
      {
        "worker": 2,
        "t": 1794297191630.3958,
        "elu": 0.0050657316320376605
      },
      {
        "worker": 0,
        "t": 1794297192016.9155,
        "elu": 0.5373024398831675
      },
      {
        "worker": 1,
        "t": 1794297192084.0625,
        "elu": 0.005081011432920349
      },
      {
        "worker": 2,
        "t": 1794297192134.4482,
        "elu": 0.008654587013201494
      },
      {
        "worker": 0,
        "t": 1794297192517.022,
        "elu": 0.5547772031556335
      },
      {
        "worker": 1,
        "t": 1794297192584.5698,
        "elu": 0.009061362739867379
      },
      {
        "worker": 2,
        "t": 1794297192635.0796,
        "elu": 0.005181897567631447
      },
      {
        "worker": 0,
        "t": 1794297193017.2546,
        "elu": 0.528129495555456
      },
      {
        "worker": 1,
        "t": 1794297193087.566,
        "elu": 0.004274302565372864
      },
      {
        "worker": 2,
        "t": 1794297193138.012,
        "elu": 0.005170850754019099
      },
      {
        "worker": 0,
        "t": 1794297193517.0625,
        "elu": 0.5191547608202695
      },
      {
        "worker": 1,
        "t": 1794297193588.7979,
        "elu": 0.005045006055730351
      },
      {
        "worker": 2,
        "t": 1794297193638.8896,
        "elu": 0.005138397321209567
      },
      {
        "worker": 0,
        "t": 1794297194017.1155,
        "elu": 0.531174282750207
      },
      {
        "worker": 1,
        "t": 1794297194089.0063,
        "elu": 0.0051192120743260355
      },
      {
        "worker": 2,
        "t": 1794297194140.992,
        "elu": 0.008704161130511173
      },
      {
        "worker": 0,
        "t": 1794297194518.0745,
        "elu": 0.5331520081226999
      },
      {
        "worker": 1,
        "t": 1794297194591.0742,
        "elu": 0.004851013056188906
      },
      {
        "worker": 2,
        "t": 1794297194642.1135,
        "elu": 0.005106228033285974
      },
      {
        "worker": 0,
        "t": 1794297195018.5603,
        "elu": 0.5324513263237083
      },
      {
        "worker": 1,
        "t": 1794297195091.6228,
        "elu": 0.008608218533248094
      },
      {
        "worker": 2,
        "t": 1794297195142.717,
        "elu": 0.005005627278327238
      },
      {
        "worker": 0,
        "t": 1794297195519.3657,
        "elu": 0.525575401457893
      },
      {
        "worker": 1,
        "t": 1794297195591.9624,
        "elu": 0.0054444018912161996
      },
      {
        "worker": 2,
        "t": 1794297195643.5042,
        "elu": 0.0055081759360429226
      },
      {
        "worker": 0,
        "t": 1794297196019.5347,
        "elu": 0.5399688418437881
      },
      {
        "worker": 1,
        "t": 1794297196092.9766,
        "elu": 0.005344412284599698
      },
      {
        "worker": 2,
        "t": 1794297196143.7312,
        "elu": 0.00499197916693256
      },
      {
        "worker": 0,
        "t": 1794297196519.5237,
        "elu": 0.519553906825182
      },
      {
        "worker": 1,
        "t": 1794297196599.285,
        "elu": 0.004969154418997808
      },
      {
        "worker": 2,
        "t": 1794297196646.8608,
        "elu": 0.008253822597819647
      },
      {
        "worker": 0,
        "t": 1794297197019.0237,
        "elu": 0.5363924779154423
      },
      {
        "worker": 1,
        "t": 1794297197100.1655,
        "elu": 0.005169981778218619
      },
      {
        "worker": 2,
        "t": 1794297197146.362,
        "elu": 0.005339598834295432
      },
      {
        "worker": 0,
        "t": 1794297197519.0654,
        "elu": 0.5274309956586051
      },
      {
        "worker": 1,
        "t": 1794297197600.291,
        "elu": 0.009903671505307196
      },
      {
        "worker": 2,
        "t": 1794297197646.743,
        "elu": 0.005136092240945264
      },
      {
        "worker": 0,
        "t": 1794297198019.2024,
        "elu": 0.5229412995172723
      },
      {
        "worker": 1,
        "t": 1794297198100.9487,
        "elu": 0.005049628465155685
      },
      {
        "worker": 2,
        "t": 1794297198148.066,
        "elu": 0.005074912275906394
      },
      {
        "worker": 0,
        "t": 1794297198519.0142,
        "elu": 0.5262406780211883
      },
      {
        "worker": 1,
        "t": 1794297198603.2798,
        "elu": 0.005131922790855241
      },
      {
        "worker": 2,
        "t": 1794297198648.8943,
        "elu": 0.00530966694327524
      },
      {
        "worker": 0,
        "t": 1794297199019.4763,
        "elu": 0.5464512737743437
      },
      {
        "worker": 1,
        "t": 1794297199105.5674,
        "elu": 0.005010408902689297
      },
      {
        "worker": 2,
        "t": 1794297199149.047,
        "elu": 0.008800626555904622
      },
      {
        "worker": 0,
        "t": 1794297199519.3027,
        "elu": 0.5338228314907908
      },
      {
        "worker": 1,
        "t": 1794297199609.12,
        "elu": 0.005302668705570262
      },
      {
        "worker": 2,
        "t": 1794297199649.2297,
        "elu": 0.005183777722815964
      },
      {
        "worker": 0,
        "t": 1794297200019.245,
        "elu": 0.5272516360616005
      },
      {
        "worker": 1,
        "t": 1794297200109.8596,
        "elu": 0.007410240052123595
      },
      {
        "worker": 2,
        "t": 1794297200149.6187,
        "elu": 0.004974223244931819
      },
      {
        "worker": 0,
        "t": 1794297200519.2769,
        "elu": 0.5230612534423633
      },
      {
        "worker": 1,
        "t": 1794297200609.9402,
        "elu": 0.004939801183756467
      },
      {
        "worker": 2,
        "t": 1794297200649.3877,
        "elu": 0.005136052372450717
      },
      {
        "worker": 0,
        "t": 1794297201019.1272,
        "elu": 0.5269173613421007
      },
      {
        "worker": 1,
        "t": 1794297201113.9727,
        "elu": 0.005177266255083443
      },
      {
        "worker": 2,
        "t": 1794297201151.1812,
        "elu": 0.005063437982406443
      },
      {
        "worker": 0,
        "t": 1794297201519.4353,
        "elu": 0.5022985213507599
      },
      {
        "worker": 1,
        "t": 1794297201615.9763,
        "elu": 0.0050243765978290845
      },
      {
        "worker": 2,
        "t": 1794297201652.75,
        "elu": 0.008813098994378692
      },
      {
        "worker": 0,
        "t": 1794297202019.172,
        "elu": 0.5359195022626907
      },
      {
        "worker": 1,
        "t": 1794297202120.1877,
        "elu": 0.0050166717594253615
      },
      {
        "worker": 2,
        "t": 1794297202156.9128,
        "elu": 0.004866145846061525
      },
      {
        "worker": 0,
        "t": 1794297202519.5688,
        "elu": 0.5182865399294408
      },
      {
        "worker": 1,
        "t": 1794297202622.9944,
        "elu": 0.009322237292106867
      },
      {
        "worker": 2,
        "t": 1794297202657.3755,
        "elu": 0.00506440065623363
      },
      {
        "worker": 0,
        "t": 1794297203019.2678,
        "elu": 0.5203785458658398
      },
      {
        "worker": 1,
        "t": 1794297203129.5522,
        "elu": 0.004952971061483412
      },
      {
        "worker": 2,
        "t": 1794297203160.146,
        "elu": 0.0051696225831747485
      },
      {
        "worker": 0,
        "t": 1794297203519.1375,
        "elu": 0.5387802959510768
      },
      {
        "worker": 1,
        "t": 1794297203629.2114,
        "elu": 0.0061131903690712424
      },
      {
        "worker": 2,
        "t": 1794297203663.7278,
        "elu": 0.0052359999884002174
      },
      {
        "worker": 0,
        "t": 1794297204019.0063,
        "elu": 0.5293057287511026
      },
      {
        "worker": 1,
        "t": 1794297204130.5781,
        "elu": 0.004897629726258757
      },
      {
        "worker": 2,
        "t": 1794297204163.99,
        "elu": 0.009287071330982988
      },
      {
        "worker": 0,
        "t": 1794297204519.2512,
        "elu": 0.5236851927527454
      },
      {
        "worker": 1,
        "t": 1794297204630.0725,
        "elu": 0.005062616461661372
      },
      {
        "worker": 2,
        "t": 1794297204665.4436,
        "elu": 0.005129332282564595
      },
      {
        "worker": 0,
        "t": 1794297205019.087,
        "elu": 0.5349126438182545
      },
      {
        "worker": 1,
        "t": 1794297205131.0085,
        "elu": 0.009140555184458818
      },
      {
        "worker": 2,
        "t": 1794297205169.0193,
        "elu": 0.0051865003685051215
      },
      {
        "worker": 0,
        "t": 1794297205519.0234,
        "elu": 0.5229334292608153
      },
      {
        "worker": 1,
        "t": 1794297205633.0476,
        "elu": 0.005305299597606246
      },
      {
        "worker": 2,
        "t": 1794297205670.9375,
        "elu": 0.005106848838895832
      },
      {
        "worker": 0,
        "t": 1794297206019.6455,
        "elu": 0.5268515214936149
      },
      {
        "worker": 1,
        "t": 1794297206134.9006,
        "elu": 0.005000803156064871
      },
      {
        "worker": 2,
        "t": 1794297206176.6938,
        "elu": 0.004994828889899018
      },
      {
        "worker": 0,
        "t": 1794297206519.2073,
        "elu": 0.517771014400483
      },
      {
        "worker": 1,
        "t": 1794297206635.0496,
        "elu": 0.005142128757854187
      },
      {
        "worker": 2,
        "t": 1794297206677.9775,
        "elu": 0.009289658021818432
      },
      {
        "worker": 0,
        "t": 1794297207020.061,
        "elu": 0.5257960518821888
      },
      {
        "worker": 1,
        "t": 1794297207136.013,
        "elu": 0.004881761938027905
      },
      {
        "worker": 2,
        "t": 1794297207178.2773,
        "elu": 0.004851275070365192
      },
      {
        "worker": 0,
        "t": 1794297207520.7554,
        "elu": 0.5320254714297877
      },
      {
        "worker": 1,
        "t": 1794297207637.1096,
        "elu": 0.007255968673795082
      },
      {
        "worker": 2,
        "t": 1794297207679.1816,
        "elu": 0.005090296299556848
      },
      {
        "worker": 0,
        "t": 1794297208020.1294,
        "elu": 0.520976778259205
      },
      {
        "worker": 1,
        "t": 1794297208139.6833,
        "elu": 0.005021003106296218
      },
      {
        "worker": 2,
        "t": 1794297208179.9475,
        "elu": 0.005210008663790604
      },
      {
        "worker": 0,
        "t": 1794297208520.345,
        "elu": 0.5147611473790739
      },
      {
        "worker": 1,
        "t": 1794297208639.9417,
        "elu": 0.004939450262899308
      },
      {
        "worker": 2,
        "t": 1794297208680.9893,
        "elu": 0.005201606099376653
      },
      {
        "worker": 0,
        "t": 1794297209020.9307,
        "elu": 0.527092254791194
      },
      {
        "worker": 1,
        "t": 1794297209145.0354,
        "elu": 0.004867501173179283
      },
      {
        "worker": 2,
        "t": 1794297209183.4297,
        "elu": 0.008386515815700232
      },
      {
        "worker": 0,
        "t": 1794297209520.4844,
        "elu": 0.5154025730979791
      },
      {
        "worker": 1,
        "t": 1794297209650.009,
        "elu": 0.004863964189291528
      },
      {
        "worker": 2,
        "t": 1794297209688.0442,
        "elu": 0.005027547821776259
      },
      {
        "worker": 0,
        "t": 1794297210021.0925,
        "elu": 0.5296951344745023
      },
      {
        "worker": 1,
        "t": 1794297210151.0244,
        "elu": 0.008881268148171032
      },
      {
        "worker": 2,
        "t": 1794297210192.649,
        "elu": 0.0048002786522826245
      },
      {
        "worker": 0,
        "t": 1794297210521.8784,
        "elu": 0.471697175359829
      },
      {
        "worker": 1,
        "t": 1794297210652.363,
        "elu": 0.005009122293031621
      },
      {
        "worker": 2,
        "t": 1794297210692.162,
        "elu": 0.003935752237530112
      },
      {
        "worker": 0,
        "t": 1794297211026.866,
        "elu": 0.007447615639911079
      },
      {
        "worker": 1,
        "t": 1794297211152.1255,
        "elu": 0.006134583976194238
      },
      {
        "worker": 2,
        "t": 1794297211195.9258,
        "elu": 0.005375045869737108
      },
      {
        "worker": 0,
        "t": 1794297211526.9146,
        "elu": 0.005090496355387063
      },
      {
        "worker": 1,
        "t": 1794297211653.1116,
        "elu": 0.0051806225698122375
      },
      {
        "worker": 2,
        "t": 1794297211697.722,
        "elu": 0.008902214045615637
      },
      {
        "worker": 0,
        "t": 1794297212028.0818,
        "elu": 0.003956250995869574
      },
      {
        "worker": 1,
        "t": 1794297212154.2864,
        "elu": 0.008399980914445574
      },
      {
        "worker": 2,
        "t": 1794297212200.1877,
        "elu": 0.004950088918354507
      },
      {
        "worker": 0,
        "t": 1794297212528.7332,
        "elu": 0.010668008956347638
      },
      {
        "worker": 1,
        "t": 1794297212657.959,
        "elu": 0.005009824246582656
      },
      {
        "worker": 2,
        "t": 1794297212706.8223,
        "elu": 0.005175899421960896
      },
      {
        "worker": 0,
        "t": 1794297213030.151,
        "elu": 0.005056018379752899
      },
      {
        "worker": 1,
        "t": 1794297213159.1873,
        "elu": 0.005296755930016419
      },
      {
        "worker": 2,
        "t": 1794297213207.7537,
        "elu": 0.00513644269035871
      },
      {
        "worker": 0,
        "t": 1794297213540.2476,
        "elu": 0.004928712933587219
      },
      {
        "worker": 1,
        "t": 1794297213665.2441,
        "elu": 0.0048831855454497695
      },
      {
        "worker": 2,
        "t": 1794297213709.1992,
        "elu": 0.008836041717543373
      },
      {
        "worker": 0,
        "t": 1794297214050.2751,
        "elu": 0.0053429419036369365
      },
      {
        "worker": 1,
        "t": 1794297214166.357,
        "elu": 0.007410525256884125
      },
      {
        "worker": 2,
        "t": 1794297214219.2417,
        "elu": 0.006012824932163415
      },
      {
        "worker": 0,
        "t": 1794297214554.2312,
        "elu": 0.09008302542307464
      },
      {
        "worker": 1,
        "t": 1794297214670.114,
        "elu": 0.020209333046354725
      },
      {
        "worker": 2,
        "t": 1794297214722.2495,
        "elu": 0.012489858088386367
      },
      {
        "worker": 0,
        "t": 1794297215054.0918,
        "elu": 0.48370841912792173
      },
      {
        "worker": 1,
        "t": 1794297215171.8728,
        "elu": 0.005071918743184548
      },
      {
        "worker": 2,
        "t": 1794297215222.6863,
        "elu": 0.004939600684483494
      },
      {
        "worker": 0,
        "t": 1794297215554.6863,
        "elu": 0.6053190141237246
      },
      {
        "worker": 1,
        "t": 1794297215671.5312,
        "elu": 0.005027537113222821
      },
      {
        "worker": 2,
        "t": 1794297215840.161,
        "elu": 0.5107399068134728
      },
      {
        "worker": 0,
        "t": 1794297216054.2935,
        "elu": 0.48017765930077305
      },
      {
        "worker": 1,
        "t": 1794297216172.9683,
        "elu": 0.09031834904421805
      },
      {
        "worker": 2,
        "t": 1794297216340.6355,
        "elu": 0.015420292036338044
      },
      {
        "worker": 0,
        "t": 1794297216554.232,
        "elu": 0.4466651584644016
      },
      {
        "worker": 1,
        "t": 1794297216674.3665,
        "elu": 0.415445729668128
      },
      {
        "worker": 2,
        "t": 1794297216841.9636,
        "elu": 0.012522587235532193
      },
      {
        "worker": 0,
        "t": 1794297217054.0913,
        "elu": 0.5388300114741553
      },
      {
        "worker": 1,
        "t": 1794297217174.145,
        "elu": 0.009892880071799066
      },
      {
        "worker": 2,
        "t": 1794297217342.9736,
        "elu": 0.014338207704694503
      },
      {
        "worker": 0,
        "t": 1794297217561.1892,
        "elu": 0.5344522175888141
      },
      {
        "worker": 1,
        "t": 1794297217675.5557,
        "elu": 0.01005477052230215
      },
      {
        "worker": 2,
        "t": 1794297217847.9258,
        "elu": 0.00850438073659382
      },
      {
        "worker": 0,
        "t": 1794297218061.0815,
        "elu": 0.4967526934023656
      },
      {
        "worker": 1,
        "t": 1794297218175.5007,
        "elu": 0.011694501742362645
      },
      {
        "worker": 2,
        "t": 1794297218347.985,
        "elu": 0.010174626215562978
      },
      {
        "worker": 0,
        "t": 1794297218561.8313,
        "elu": 0.5023870640184178
      },
      {
        "worker": 1,
        "t": 1794297218676.9514,
        "elu": 0.01004801855666469
      },
      {
        "worker": 2,
        "t": 1794297218849.8118,
        "elu": 0.008790286782067204
      },
      {
        "worker": 0,
        "t": 1794297219061.28,
        "elu": 0.540318107422655
      },
      {
        "worker": 1,
        "t": 1794297219179.2007,
        "elu": 0.007827846660111836
      },
      {
        "worker": 2,
        "t": 1794297219350.1672,
        "elu": 0.009148410634798055
      },
      {
        "worker": 0,
        "t": 1794297219561.199,
        "elu": 0.5585995806323425
      },
      {
        "worker": 1,
        "t": 1794297219679.6511,
        "elu": 0.009609591020740587
      },
      {
        "worker": 2,
        "t": 1794297219850.503,
        "elu": 0.008164099543323085
      },
      {
        "worker": 0,
        "t": 1794297220061.5835,
        "elu": 0.5416735098165705
      },
      {
        "worker": 1,
        "t": 1794297220182.8982,
        "elu": 0.0051222456410866665
      },
      {
        "worker": 2,
        "t": 1794297220351.0408,
        "elu": 0.007535673245340854
      },
      {
        "worker": 0,
        "t": 1794297220562.293,
        "elu": 0.5380637652761245
      },
      {
        "worker": 1,
        "t": 1794297220683.2053,
        "elu": 0.007769690454873866
      },
      {
        "worker": 2,
        "t": 1794297220853.1343,
        "elu": 0.0054377703891676735
      },
      {
        "worker": 0,
        "t": 1794297221062.1826,
        "elu": 0.5372870669611443
      },
      {
        "worker": 1,
        "t": 1794297221184.804,
        "elu": 0.007910774813621253
      },
      {
        "worker": 2,
        "t": 1794297221354.9236,
        "elu": 0.008080622828036265
      },
      {
        "worker": 0,
        "t": 1794297221562.023,
        "elu": 0.5274895648499492
      },
      {
        "worker": 1,
        "t": 1794297221684.482,
        "elu": 0.007647638158446654
      },
      {
        "worker": 2,
        "t": 1794297221855.9863,
        "elu": 0.00767983484362652
      },
      {
        "worker": 0,
        "t": 1794297222062.1982,
        "elu": 0.5417618743883046
      },
      {
        "worker": 1,
        "t": 1794297222189.3828,
        "elu": 0.007656509503164682
      },
      {
        "worker": 2,
        "t": 1794297222357.1243,
        "elu": 0.007937074945115589
      },
      {
        "worker": 0,
        "t": 1794297222562.073,
        "elu": 0.5479004288144501
      },
      {
        "worker": 1,
        "t": 1794297222691.0012,
        "elu": 0.007782297244768698
      },
      {
        "worker": 2,
        "t": 1794297222860.4712,
        "elu": 0.008305883364932116
      },
      {
        "worker": 0,
        "t": 1794297223062.6643,
        "elu": 0.5422548682949361
      },
      {
        "worker": 1,
        "t": 1794297223193.0098,
        "elu": 0.005282279071488213
      },
      {
        "worker": 2,
        "t": 1794297223361.1123,
        "elu": 0.007445835796602484
      },
      {
        "worker": 0,
        "t": 1794297223561.9597,
        "elu": 0.5375192472559442
      },
      {
        "worker": 1,
        "t": 1794297223694.3005,
        "elu": 0.007949978621402731
      },
      {
        "worker": 2,
        "t": 1794297223862.0615,
        "elu": 0.00458755344510841
      },
      {
        "worker": 0,
        "t": 1794297224062.478,
        "elu": 0.543737689402569
      },
      {
        "worker": 1,
        "t": 1794297224196.5093,
        "elu": 0.009502356201840064
      },
      {
        "worker": 2,
        "t": 1794297224363.2473,
        "elu": 0.010799578634606828
      },
      {
        "worker": 0,
        "t": 1794297224562.154,
        "elu": 0.5447646881712499
      },
      {
        "worker": 1,
        "t": 1794297224696.7979,
        "elu": 0.015541406758341546
      },
      {
        "worker": 2,
        "t": 1794297224864.0344,
        "elu": 0.014493502599274474
      },
      {
        "worker": 0,
        "t": 1794297225062.167,
        "elu": 0.45081971131173
      },
      {
        "worker": 1,
        "t": 1794297225198.6575,
        "elu": 0.008057541014172729
      },
      {
        "worker": 2,
        "t": 1794297225367.0442,
        "elu": 0.008920558972281473
      },
      {
        "worker": 0,
        "t": 1794297225562.2,
        "elu": 0.5134522632043154
      },
      {
        "worker": 1,
        "t": 1794297225700.0916,
        "elu": 0.008904124589175286
      },
      {
        "worker": 2,
        "t": 1794297225871.3364,
        "elu": 0.008284428344060594
      },
      {
        "worker": 0,
        "t": 1794297226062.487,
        "elu": 0.47655968002402976
      },
      {
        "worker": 1,
        "t": 1794297226200.4854,
        "elu": 0.0043549890294007736
      },
      {
        "worker": 2,
        "t": 1794297226371.1963,
        "elu": 0.00534225974988129
      },
      {
        "worker": 0,
        "t": 1794297226562.0527,
        "elu": 0.5065145035590422
      },
      {
        "worker": 1,
        "t": 1794297226704.4192,
        "elu": 0.007756611638002547
      },
      {
        "worker": 2,
        "t": 1794297226872.7874,
        "elu": 0.0076591123130936595
      },
      {
        "worker": 0,
        "t": 1794297227062.0542,
        "elu": 0.5278229385025289
      },
      {
        "worker": 1,
        "t": 1794297227204.1362,
        "elu": 0.007343278561982489
      },
      {
        "worker": 2,
        "t": 1794297227372.1206,
        "elu": 0.008831679150879956
      },
      {
        "worker": 0,
        "t": 1794297227562.0842,
        "elu": 0.5582110126433617
      },
      {
        "worker": 1,
        "t": 1794297227705.95,
        "elu": 0.008990316032940811
      },
      {
        "worker": 2,
        "t": 1794297227875.0073,
        "elu": 0.005969406783299922
      },
      {
        "worker": 0,
        "t": 1794297228062.04,
        "elu": 0.5293090098487813
      },
      {
        "worker": 1,
        "t": 1794297228207.088,
        "elu": 0.00506689380820072
      },
      {
        "worker": 2,
        "t": 1794297228379.3037,
        "elu": 0.009663799551094778
      },
      {
        "worker": 0,
        "t": 1794297228562.672,
        "elu": 0.5202267402733446
      },
      {
        "worker": 1,
        "t": 1794297228710.553,
        "elu": 0.007396532973626314
      },
      {
        "worker": 2,
        "t": 1794297228880.0386,
        "elu": 0.00510667215773365
      },
      {
        "worker": 0,
        "t": 1794297229062.5684,
        "elu": 0.534814312403349
      },
      {
        "worker": 1,
        "t": 1794297229219.3638,
        "elu": 0.007910590586149116
      },
      {
        "worker": 2,
        "t": 1794297229382.4775,
        "elu": 0.006957594103428068
      },
      {
        "worker": 0,
        "t": 1794297229562.1152,
        "elu": 0.531399731914663
      },
      {
        "worker": 1,
        "t": 1794297229720.2612,
        "elu": 0.005704451235264759
      },
      {
        "worker": 2,
        "t": 1794297229882.6514,
        "elu": 0.00797795596190122
      },
      {
        "worker": 0,
        "t": 1794297230061.9836,
        "elu": 0.5341573217539767
      },
      {
        "worker": 1,
        "t": 1794297230223.019,
        "elu": 0.008690209971265128
      },
      {
        "worker": 2,
        "t": 1794297230382.9592,
        "elu": 0.004212324915837835
      },
      {
        "worker": 0,
        "t": 1794297230562.2524,
        "elu": 0.5353195161602791
      },
      {
        "worker": 1,
        "t": 1794297230723.2,
        "elu": 0.005413424677416457
      },
      {
        "worker": 2,
        "t": 1794297230884.49,
        "elu": 0.00814054463520816
      },
      {
        "worker": 0,
        "t": 1794297231062.6475,
        "elu": 0.5343494684410496
      },
      {
        "worker": 1,
        "t": 1794297231224.0427,
        "elu": 0.007376286994717012
      },
      {
        "worker": 2,
        "t": 1794297231386.2463,
        "elu": 0.005115067193828915
      },
      {
        "worker": 0,
        "t": 1794297231562.0154,
        "elu": 0.5068706859393607
      },
      {
        "worker": 1,
        "t": 1794297231724.9756,
        "elu": 0.005117626193902557
      },
      {
        "worker": 2,
        "t": 1794297231890.33,
        "elu": 0.005192256912842195
      },
      {
        "worker": 0,
        "t": 1794297232062.469,
        "elu": 0.6178724993538924
      },
      {
        "worker": 1,
        "t": 1794297232226.1091,
        "elu": 0.006126646890402552
      },
      {
        "worker": 2,
        "t": 1794297232391.611,
        "elu": 0.008607927869667515
      },
      {
        "worker": 0,
        "t": 1794297232562.2195,
        "elu": 0.5544959734928302
      },
      {
        "worker": 1,
        "t": 1794297232728.0627,
        "elu": 0.007481970265170832
      },
      {
        "worker": 2,
        "t": 1794297232898.3977,
        "elu": 0.005080721726721927
      },
      {
        "worker": 0,
        "t": 1794297233062.842,
        "elu": 0.5283131426588935
      },
      {
        "worker": 1,
        "t": 1794297233231.2896,
        "elu": 0.005009595246182054
      },
      {
        "worker": 2,
        "t": 1794297233402.4463,
        "elu": 0.007554372794032313
      },
      {
        "worker": 0,
        "t": 1794297233562.6267,
        "elu": 0.5226953579852438
      },
      {
        "worker": 1,
        "t": 1794297233731.969,
        "elu": 0.00777891737226957
      },
      {
        "worker": 2,
        "t": 1794297233904.0151,
        "elu": 0.005202279445628136
      },
      {
        "worker": 0,
        "t": 1794297234062.6892,
        "elu": 0.5307199774561452
      },
      {
        "worker": 1,
        "t": 1794297234232.9143,
        "elu": 0.004268253936800924
      },
      {
        "worker": 2,
        "t": 1794297234406.4177,
        "elu": 0.007754777610251553
      },
      {
        "worker": 0,
        "t": 1794297234562.2974,
        "elu": 0.5057668241997482
      },
      {
        "worker": 1,
        "t": 1794297234733.6082,
        "elu": 0.0061778669845792755
      },
      {
        "worker": 2,
        "t": 1794297234906.6992,
        "elu": 0.005210511435434702
      },
      {
        "worker": 0,
        "t": 1794297235062.4463,
        "elu": 0.5286556028991909
      },
      {
        "worker": 1,
        "t": 1794297235233.9622,
        "elu": 0.007694191757588419
      },
      {
        "worker": 2,
        "t": 1794297235406.9907,
        "elu": 0.004954109055165708
      },
      {
        "worker": 0,
        "t": 1794297235562.4175,
        "elu": 0.5305371223116984
      },
      {
        "worker": 1,
        "t": 1794297235736.4226,
        "elu": 0.005154727699584092
      },
      {
        "worker": 2,
        "t": 1794297235908.0066,
        "elu": 0.007750721763225072
      },
      {
        "worker": 0,
        "t": 1794297236062.0608,
        "elu": 0.5454136658769168
      },
      {
        "worker": 1,
        "t": 1794297236238.0527,
        "elu": 0.007457594195948876
      },
      {
        "worker": 2,
        "t": 1794297236410.366,
        "elu": 0.005072077093514098
      },
      {
        "worker": 0,
        "t": 1794297236562.3496,
        "elu": 0.5152190101778741
      },
      {
        "worker": 1,
        "t": 1794297236739.5935,
        "elu": 0.0052484235547060115
      },
      {
        "worker": 2,
        "t": 1794297236911.2673,
        "elu": 0.00788451719862111
      },
      {
        "worker": 0,
        "t": 1794297237062.2717,
        "elu": 0.5354228293717278
      },
      {
        "worker": 1,
        "t": 1794297237240.1038,
        "elu": 0.005069824724445455
      },
      {
        "worker": 2,
        "t": 1794297237412.2373,
        "elu": 0.0049458136670424745
      },
      {
        "worker": 0,
        "t": 1794297237562.218,
        "elu": 0.5326328048323071
      },
      {
        "worker": 1,
        "t": 1794297237741.9739,
        "elu": 0.007469026072337824
      },
      {
        "worker": 2,
        "t": 1794297237916.9846,
        "elu": 0.004101391384868236
      },
      {
        "worker": 0,
        "t": 1794297238062.3635,
        "elu": 0.527573343938352
      },
      {
        "worker": 1,
        "t": 1794297238243.0051,
        "elu": 0.00496518644369627
      },
      {
        "worker": 2,
        "t": 1794297238418.4968,
        "elu": 0.007312201162163463
      },
      {
        "worker": 0,
        "t": 1794297238562.0813,
        "elu": 0.5281736303920477
      },
      {
        "worker": 1,
        "t": 1794297238745.4219,
        "elu": 0.007731429485987195
      },
      {
        "worker": 2,
        "t": 1794297238918.9712,
        "elu": 0.005228710553476203
      },
      {
        "worker": 0,
        "t": 1794297239062.3037,
        "elu": 0.536349291203807
      },
      {
        "worker": 1,
        "t": 1794297239244.9417,
        "elu": 0.004988050705399121
      },
      {
        "worker": 2,
        "t": 1794297239420.7144,
        "elu": 0.007387786958169911
      },
      {
        "worker": 0,
        "t": 1794297239561.068,
        "elu": 0.5264065759284611
      },
      {
        "worker": 1,
        "t": 1794297239745.9417,
        "elu": 0.0042998114083008365
      },
      {
        "worker": 2,
        "t": 1794297239921.61,
        "elu": 0.0051703392570671795
      },
      {
        "worker": 0,
        "t": 1794297240061.4475,
        "elu": 0.5367426370340859
      },
      {
        "worker": 1,
        "t": 1794297240250.6902,
        "elu": 0.00748722012446566
      },
      {
        "worker": 2,
        "t": 1794297240424.2974,
        "elu": 0.005263769961751833
      },
      {
        "worker": 0,
        "t": 1794297240561.2615,
        "elu": 0.5313748694549641
      },
      {
        "worker": 1,
        "t": 1794297240755.7683,
        "elu": 0.005461357732785314
      },
      {
        "worker": 2,
        "t": 1794297240926.9255,
        "elu": 0.008734375373988697
      },
      {
        "worker": 0,
        "t": 1794297241062.076,
        "elu": 0.5314480105693149
      },
      {
        "worker": 1,
        "t": 1794297241256.6255,
        "elu": 0.00798086388692037
      },
      {
        "worker": 2,
        "t": 1794297241428.2314,
        "elu": 0.005134840413712093
      },
      {
        "worker": 0,
        "t": 1794297241562.1895,
        "elu": 0.5123165001163702
      },
      {
        "worker": 1,
        "t": 1794297241756.416,
        "elu": 0.0054887736227282715
      },
      {
        "worker": 2,
        "t": 1794297241929.3506,
        "elu": 0.00853473503189234
      },
      {
        "worker": 0,
        "t": 1794297242061.8054,
        "elu": 0.5235038839690735
      },
      {
        "worker": 1,
        "t": 1794297242258.4006,
        "elu": 0.00786178254276046
      },
      {
        "worker": 2,
        "t": 1794297242430.3752,
        "elu": 0.005666234030762768
      },
      {
        "worker": 0,
        "t": 1794297242562.1196,
        "elu": 0.5268337315692637
      },
      {
        "worker": 1,
        "t": 1794297242766.0203,
        "elu": 0.0055405682743310015
      },
      {
        "worker": 2,
        "t": 1794297242931.9075,
        "elu": 0.007991486662965591
      },
      {
        "worker": 0,
        "t": 1794297243062.3057,
        "elu": 0.5246654013182359
      },
      {
        "worker": 1,
        "t": 1794297243270.0706,
        "elu": 0.0049280203802596545
      },
      {
        "worker": 2,
        "t": 1794297243432.5962,
        "elu": 0.005494667843501731
      },
      {
        "worker": 0,
        "t": 1794297243562.0933,
        "elu": 0.5138529151609251
      },
      {
        "worker": 1,
        "t": 1794297243769.9539,
        "elu": 0.008695501746199248
      },
      {
        "worker": 2,
        "t": 1794297243932.92,
        "elu": 0.005112071503247369
      },
      {
        "worker": 0,
        "t": 1794297244062.4548,
        "elu": 0.5254604273947837
      },
      {
        "worker": 1,
        "t": 1794297244271.2676,
        "elu": 0.0050498230060888934
      },
      {
        "worker": 2,
        "t": 1794297244434.41,
        "elu": 0.006759668325750558
      },
      {
        "worker": 0,
        "t": 1794297244566.2222,
        "elu": 0.6067223844476813
      },
      {
        "worker": 1,
        "t": 1794297244778.205,
        "elu": 0.6273065021420069
      },
      {
        "worker": 2,
        "t": 1794297244939.6597,
        "elu": 0.9880847168282032
      },
      {
        "worker": 0,
        "t": 1794297245078.8804,
        "elu": 0.9714600692852767
      },
      {
        "worker": 1,
        "t": 1794297245278.3147,
        "elu": 0.9986569397741374
      },
      {
        "worker": 2,
        "t": 1794297245448.6067,
        "elu": 0.9582098202236786
      },
      {
        "worker": 0,
        "t": 1794297245579.5752,
        "elu": 0.9477591342442331
      },
      {
        "worker": 1,
        "t": 1794297245779.266,
        "elu": 0.9204787803166874
      },
      {
        "worker": 2,
        "t": 1794297245948.7812,
        "elu": 0.8180367142753834
      },
      {
        "worker": 0,
        "t": 1794297246080.9702,
        "elu": 0.7029530353014685
      },
      {
        "worker": 1,
        "t": 1794297246280.5344,
        "elu": 0.6286106006679397
      },
      {
        "worker": 2,
        "t": 1794297246448.97,
        "elu": 0.9118821809104147
      },
      {
        "worker": 0,
        "t": 1794297246581.7073,
        "elu": 0.9169126971736137
      },
      {
        "worker": 1,
        "t": 1794297246780.6296,
        "elu": 0.7367696370655317
      },
      {
        "worker": 2,
        "t": 1794297246977.429,
        "elu": 0.83827007250732
      },
      {
        "worker": 0,
        "t": 1794297247084.1677,
        "elu": 0.7734052820851199
      },
      {
        "worker": 1,
        "t": 1794297247282.5342,
        "elu": 0.866380601485698
      },
      {
        "worker": 2,
        "t": 1794297247482.8728,
        "elu": 0.9490063853811679
      },
      {
        "worker": 0,
        "t": 1794297247584.0474,
        "elu": 0.8606320780924327
      },
      {
        "worker": 1,
        "t": 1794297247783.0405,
        "elu": 0.9060962446750761
      },
      {
        "worker": 2,
        "t": 1794297247981.9507,
        "elu": 0.9227519349878056
      },
      {
        "worker": 0,
        "t": 1794297248085.9177,
        "elu": 0.8924483610054479
      },
      {
        "worker": 1,
        "t": 1794297248283.3137,
        "elu": 0.6940942274103072
      },
      {
        "worker": 2,
        "t": 1794297248482.284,
        "elu": 0.7380720245610647
      },
      {
        "worker": 0,
        "t": 1794297248587.191,
        "elu": 0.754713820647302
      },
      {
        "worker": 1,
        "t": 1794297248783.8547,
        "elu": 0.8798898983117012
      },
      {
        "worker": 2,
        "t": 1794297248982.7744,
        "elu": 0.8301708398609009
      },
      {
        "worker": 0,
        "t": 1794297249089.2021,
        "elu": 0.827693063892379
      },
      {
        "worker": 1,
        "t": 1794297249284.2266,
        "elu": 0.8125400882679868
      },
      {
        "worker": 2,
        "t": 1794297249482.355,
        "elu": 0.8028033367899319
      },
      {
        "worker": 0,
        "t": 1794297249588.9456,
        "elu": 0.6990247203490122
      },
      {
        "worker": 1,
        "t": 1794297249784.2502,
        "elu": 0.6700361785804038
      },
      {
        "worker": 2,
        "t": 1794297249985.9407,
        "elu": 0.7206625486822249
      },
      {
        "worker": 0,
        "t": 1794297250092.0183,
        "elu": 0.8140717938887656
      },
      {
        "worker": 1,
        "t": 1794297250284.0386,
        "elu": 0.8293728607284188
      },
      {
        "worker": 2,
        "t": 1794297250487.0916,
        "elu": 0.8361421161722954
      },
      {
        "worker": 0,
        "t": 1794297250592.8516,
        "elu": 0.774374879574549
      },
      {
        "worker": 1,
        "t": 1794297250784.102,
        "elu": 0.8050433747489053
      },
      {
        "worker": 2,
        "t": 1794297250988.592,
        "elu": 0.8009794541426258
      },
      {
        "worker": 0,
        "t": 1794297251092.16,
        "elu": 0.7714687942997505
      },
      {
        "worker": 1,
        "t": 1794297251287.1199,
        "elu": 0.7726191782072828
      },
      {
        "worker": 2,
        "t": 1794297251489.0298,
        "elu": 0.9789450621681586
      },
      {
        "worker": 0,
        "t": 1794297251606.7993,
        "elu": 0.9125583972681248
      },
      {
        "worker": 1,
        "t": 1794297251788.6392,
        "elu": 0.9521784490660509
      },
      {
        "worker": 2,
        "t": 1794297251989.8005,
        "elu": 0.9492197165206385
      },
      {
        "worker": 0,
        "t": 1794297252106.2224,
        "elu": 0.758323857239594
      },
      {
        "worker": 1,
        "t": 1794297252291.7327,
        "elu": 0.9442468837897632
      },
      {
        "worker": 2,
        "t": 1794297252488.9922,
        "elu": 0.7760898528281781
      },
      {
        "worker": 0,
        "t": 1794297252606.6204,
        "elu": 0.6829123094909115
      },
      {
        "worker": 1,
        "t": 1794297252790.903,
        "elu": 0.7661729170389274
      },
      {
        "worker": 2,
        "t": 1794297252989.0242,
        "elu": 0.9354678719307729
      },
      {
        "worker": 0,
        "t": 1794297253107.0525,
        "elu": 0.8701444377955779
      },
      {
        "worker": 1,
        "t": 1794297253291.1106,
        "elu": 0.8936490107831683
      },
      {
        "worker": 2,
        "t": 1794297253491.162,
        "elu": 0.8838739622915077
      },
      {
        "worker": 0,
        "t": 1794297253607.2234,
        "elu": 0.9043225230214349
      },
      {
        "worker": 1,
        "t": 1794297253792.1438,
        "elu": 0.6461537181416329
      },
      {
        "worker": 2,
        "t": 1794297253992.341,
        "elu": 0.4839015674008091
      },
      {
        "worker": 0,
        "t": 1794297254117.7756,
        "elu": 0.5957839935086756
      },
      {
        "worker": 1,
        "t": 1794297254293.988,
        "elu": 0.6775454033057768
      },
      {
        "worker": 2,
        "t": 1794297254495.2654,
        "elu": 0.9921321934410513
      },
      {
        "worker": 0,
        "t": 1794297254617.1948,
        "elu": 0.8985604412036123
      },
      {
        "worker": 1,
        "t": 1794297254794.0742,
        "elu": 0.890251762083257
      },
      {
        "worker": 2,
        "t": 1794297254995.859,
        "elu": 0.9757837493795938
      },
      {
        "worker": 0,
        "t": 1794297255118.6213,
        "elu": 0.7412846669802863
      },
      {
        "worker": 1,
        "t": 1794297255294.3538,
        "elu": 0.523621110366995
      },
      {
        "worker": 2,
        "t": 1794297255522.9097,
        "elu": 0.570593229738304
      },
      {
        "worker": 0,
        "t": 1794297255700.3535,
        "elu": 0.6543377081927673
      },
      {
        "worker": 1,
        "t": 1794297255882.5986,
        "elu": 0.8539256796164633
      },
      {
        "worker": 2,
        "t": 1794297256023.916,
        "elu": 0.9986463640320206
      },
      {
        "worker": 0,
        "t": 1794297256213.6096,
        "elu": 1
      },
      {
        "worker": 1,
        "t": 1794297256411.119,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297256527.0737,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297256713.5793,
        "elu": 0.9885504956041231
      },
      {
        "worker": 1,
        "t": 1794297256911.7122,
        "elu": 0.8680346590571459
      },
      {
        "worker": 2,
        "t": 1794297257027.75,
        "elu": 0.8481111756319023
      },
      {
        "worker": 0,
        "t": 1794297257214.5059,
        "elu": 0.5775652093348524
      },
      {
        "worker": 1,
        "t": 1794297257421.1555,
        "elu": 0.5658356403382742
      },
      {
        "worker": 2,
        "t": 1794297257564.7588,
        "elu": 0.6270287271935765
      },
      {
        "worker": 0,
        "t": 1794297257742.4126,
        "elu": 0.8827144309014433
      },
      {
        "worker": 1,
        "t": 1794297257921.7578,
        "elu": 0.9387489038155589
      },
      {
        "worker": 2,
        "t": 1794297258068.3591,
        "elu": 0.9043143205453105
      },
      {
        "worker": 0,
        "t": 1794297258242.477,
        "elu": 0.8656135929527404
      },
      {
        "worker": 1,
        "t": 1794297258425.4304,
        "elu": 0.7204194723586677
      },
      {
        "worker": 2,
        "t": 1794297258568.5432,
        "elu": 0.7916314611549901
      },
      {
        "worker": 0,
        "t": 1794297258755.1196,
        "elu": 0.8870907008002722
      },
      {
        "worker": 1,
        "t": 1794297258925.7102,
        "elu": 0.8829161056978341
      },
      {
        "worker": 2,
        "t": 1794297259069.3452,
        "elu": 0.8843818337339477
      },
      {
        "worker": 0,
        "t": 1794297259255.5337,
        "elu": 0.8146230745773237
      },
      {
        "worker": 1,
        "t": 1794297259426.1074,
        "elu": 0.8144618185976744
      },
      {
        "worker": 2,
        "t": 1794297259570.051,
        "elu": 0.9273035771530506
      },
      {
        "worker": 0,
        "t": 1794297259755.3113,
        "elu": 0.8862708433764163
      },
      {
        "worker": 1,
        "t": 1794297259925.9382,
        "elu": 0.8192168519125057
      },
      {
        "worker": 2,
        "t": 1794297260071.0627,
        "elu": 0.7798917144611788
      },
      {
        "worker": 0,
        "t": 1794297260255.4695,
        "elu": 0.7066815519448273
      },
      {
        "worker": 1,
        "t": 1794297260426.0317,
        "elu": 0.6807464149294356
      },
      {
        "worker": 2,
        "t": 1794297260572.239,
        "elu": 0.7210873067774801
      },
      {
        "worker": 0,
        "t": 1794297260756.4707,
        "elu": 0.5932698494742012
      },
      {
        "worker": 1,
        "t": 1794297260977.2327,
        "elu": 0.7257222221859669
      },
      {
        "worker": 2,
        "t": 1794297261133.5361,
        "elu": 0.8782894074780452
      },
      {
        "worker": 1,
        "t": 1794297261491.108,
        "elu": 0.9926811363701461
      },
      {
        "worker": 0,
        "t": 1794297261577.791,
        "elu": 1
      },
      {
        "worker": 2,
        "t": 1794297261637.1016,
        "elu": 0.9408632673038388
      },
      {
        "worker": 1,
        "t": 1794297261991.4646,
        "elu": 0.7145893367065992
      },
      {
        "worker": 0,
        "t": 1794297262080.2837,
        "elu": 0.9019927562419691
      },
      {
        "worker": 2,
        "t": 1794297262138.5503,
        "elu": 0.8018211838990494
      },
      {
        "worker": 1,
        "t": 1794297262492.7778,
        "elu": 0.872921814685781
      },
      {
        "worker": 0,
        "t": 1794297262581.342,
        "elu": 0.8851591118315808
      },
      {
        "worker": 2,
        "t": 1794297262639.5027,
        "elu": 0.9017275247623286
      },
      {
        "worker": 1,
        "t": 1794297262994.8638,
        "elu": 0.8657962055281626
      },
      {
        "worker": 0,
        "t": 1794297263082.3484,
        "elu": 0.7661201688782088
      },
      {
        "worker": 2,
        "t": 1794297263158.0981,
        "elu": 0.8279254570306909
      },
      {
        "worker": 1,
        "t": 1794297263496.7034,
        "elu": 0.8287489212187856
      },
      {
        "worker": 0,
        "t": 1794297263584.2878,
        "elu": 0.8278723452733553
      },
      {
        "worker": 2,
        "t": 1794297263660.2747,
        "elu": 0.8910549607509111
      },
      {
        "worker": 1,
        "t": 1794297264007.8513,
        "elu": 0.6028603663699811
      },
      {
        "worker": 2,
        "t": 1794297264174.9778,
        "elu": 0.6598056254876871
      },
      {
        "worker": 0,
        "t": 1794297264189.6592,
        "elu": 0.5565263364684908
      },
      {
        "worker": 1,
        "t": 1794297264507.7886,
        "elu": 0.8836518558442582
      },
      {
        "worker": 2,
        "t": 1794297264675.4858,
        "elu": 0.8950604312353972
      },
      {
        "worker": 0,
        "t": 1794297264691.8643,
        "elu": 0.9017390760152522
      },
      {
        "worker": 1,
        "t": 1794297265007.8088,
        "elu": 0.6541927500775296
      },
      {
        "worker": 2,
        "t": 1794297265184.3982,
        "elu": 0.4541829492941402
      },
      {
        "worker": 0,
        "t": 1794297265194.1304,
        "elu": 0.5372960463445167
      },
      {
        "worker": 1,
        "t": 1794297265512.9976,
        "elu": 0.6842606449589463
      },
      {
        "worker": 2,
        "t": 1794297265689.0894,
        "elu": 1
      },
      {
        "worker": 0,
        "t": 1794297265696.4177,
        "elu": 0.8771664046709389
      },
      {
        "worker": 1,
        "t": 1794297266014.078,
        "elu": 0.7108322271416834
      },
      {
        "worker": 2,
        "t": 1794297266245.505,
        "elu": 0.6298729599817675
      },
      {
        "worker": 0,
        "t": 1794297266259.5386,
        "elu": 0.6524664400030994
      },
      {
        "worker": 1,
        "t": 1794297266516.4539,
        "elu": 0.7689248956200943
      },
      {
        "worker": 2,
        "t": 1794297266746.8542,
        "elu": 0.7233671715239651
      },
      {
        "worker": 0,
        "t": 1794297266759.6943,
        "elu": 0.6035763848732649
      },
      {
        "worker": 1,
        "t": 1794297267019.1077,
        "elu": 0.6475914497606493
      },
      {
        "worker": 2,
        "t": 1794297267256.3809,
        "elu": 0.7223833374601877
      },
      {
        "worker": 0,
        "t": 1794297267263.1152,
        "elu": 0.7212771630319766
      },
      {
        "worker": 1,
        "t": 1794297267571.353,
        "elu": 0.691088342885666
      },
      {
        "worker": 0,
        "t": 1794297267763.7444,
        "elu": 0.675799584955653
      },
      {
        "worker": 2,
        "t": 1794297267769.093,
        "elu": 0.8240036572558718
      },
      {
        "worker": 1,
        "t": 1794297268072.198,
        "elu": 0.9037221390440408
      },
      {
        "worker": 0,
        "t": 1794297268263.0818,
        "elu": 0.9075651295822171
      },
      {
        "worker": 2,
        "t": 1794297268269.5554,
        "elu": 0.8243101663786814
      },
      {
        "worker": 1,
        "t": 1794297268572.2249,
        "elu": 0.9182651026717921
      },
      {
        "worker": 0,
        "t": 1794297268764.2473,
        "elu": 0.7691109942637048
      },
      {
        "worker": 2,
        "t": 1794297268771.7961,
        "elu": 0.8837767653233737
      },
      {
        "worker": 1,
        "t": 1794297269112.8574,
        "elu": 0.6386194818771234
      },
      {
        "worker": 0,
        "t": 1794297269266.4133,
        "elu": 0.5705706160416936
      },
      {
        "worker": 2,
        "t": 1794297269271.1323,
        "elu": 0.7249205234655542
      },
      {
        "worker": 1,
        "t": 1794297269613.6062,
        "elu": 0.8962629929747433
      },
      {
        "worker": 0,
        "t": 1794297269768.0332,
        "elu": 0.7324967295197281
      },
      {
        "worker": 2,
        "t": 1794297269774.1575,
        "elu": 0.7875479763504735
      },
      {
        "worker": 1,
        "t": 1794297270114.7769,
        "elu": 0.55804193853488
      },
      {
        "worker": 2,
        "t": 1794297270274.6335,
        "elu": 0.4703246405944461
      },
      {
        "worker": 0,
        "t": 1794297270278.3286,
        "elu": 0.5253352644875277
      },
      {
        "worker": 1,
        "t": 1794297270645.039,
        "elu": 0.6242018530516481
      },
      {
        "worker": 0,
        "t": 1794297270792.1343,
        "elu": 0.8361487052556515
      },
      {
        "worker": 2,
        "t": 1794297270807.364,
        "elu": 0.7687674348694218
      },
      {
        "worker": 1,
        "t": 1794297271145.369,
        "elu": 0.8721641808227764
      },
      {
        "worker": 0,
        "t": 1794297271294.6172,
        "elu": 0.7685796804908953
      },
      {
        "worker": 2,
        "t": 1794297271307.03,
        "elu": 0.8430123433278991
      },
      {
        "worker": 1,
        "t": 1794297271645.3574,
        "elu": 0.7563321259083071
      },
      {
        "worker": 0,
        "t": 1794297271795.9094,
        "elu": 0.6418189815206442
      },
      {
        "worker": 2,
        "t": 1794297271807.2817,
        "elu": 0.7024481069480526
      },
      {
        "worker": 1,
        "t": 1794297272151.0544,
        "elu": 0.6097770882037669
      },
      {
        "worker": 2,
        "t": 1794297272316.8503,
        "elu": 0.8186695524358278
      },
      {
        "worker": 0,
        "t": 1794297272354.7205,
        "elu": 0.851168017709888
      },
      {
        "worker": 1,
        "t": 1794297272651.0654,
        "elu": 0.8261652004869718
      },
      {
        "worker": 2,
        "t": 1794297272816.4385,
        "elu": 0.7650285792727116
      },
      {
        "worker": 0,
        "t": 1794297272855.729,
        "elu": 0.7377488921941215
      },
      {
        "worker": 1,
        "t": 1794297273154.5413,
        "elu": 0.6783252722306408
      },
      {
        "worker": 2,
        "t": 1794297273335.982,
        "elu": 0.7781535539973153
      },
      {
        "worker": 0,
        "t": 1794297273513.3052,
        "elu": 0.8620845230769703
      },
      {
        "worker": 1,
        "t": 1794297273654.8582,
        "elu": 0.7922638515275069
      },
      {
        "worker": 2,
        "t": 1794297273836.3113,
        "elu": 0.8727159201486476
      },
      {
        "worker": 0,
        "t": 1794297274014.0386,
        "elu": 0.8547939690569247
      },
      {
        "worker": 1,
        "t": 1794297274153.938,
        "elu": 0.6422536382483542
      },
      {
        "worker": 2,
        "t": 1794297274336.336,
        "elu": 0.6258026908678554
      },
      {
        "worker": 0,
        "t": 1794297274523.6587,
        "elu": 0.7290123543841305
      },
      {
        "worker": 1,
        "t": 1794297274656.122,
        "elu": 0.8701705858721891
      },
      {
        "worker": 2,
        "t": 1794297274842.666,
        "elu": 0.9527754534471395
      },
      {
        "worker": 0,
        "t": 1794297275027.928,
        "elu": 0.9437107384236477
      },
      {
        "worker": 1,
        "t": 1794297275158.4814,
        "elu": 0.9540612940790653
      },
      {
        "worker": 2,
        "t": 1794297275344.8757,
        "elu": 0.9403254207722571
      },
      {
        "worker": 0,
        "t": 1794297275535.1128,
        "elu": 0.8891709109855035
      },
      {
        "worker": 1,
        "t": 1794297275660.9902,
        "elu": 0.8487534617337558
      },
      {
        "worker": 99,
        "t": 1794297275762.5486,
        "elu": 0.7659537194037743
      },
      {
        "worker": 2,
        "t": 1794297275844.615,
        "elu": 0.693896271491622
      },
      {
        "worker": 0,
        "t": 1794297276037.7046,
        "elu": 0.8379502826826628
      },
      {
        "worker": 1,
        "t": 1794297276161.12,
        "elu": 0.7518031426182665
      },
      {
        "worker": 99,
        "t": 1794297276266.2656,
        "elu": 0.9352925162072969
      },
      {
        "worker": 2,
        "t": 1794297276346.4778,
        "elu": 0.7128244088908413
      },
      {
        "worker": 0,
        "t": 1794297276562.2366,
        "elu": 0.5827154613982083
      },
      {
        "worker": 1,
        "t": 1794297276689.0432,
        "elu": 0.6297267941946885
      },
      {
        "worker": 99,
        "t": 1794297276766.7534,
        "elu": 0.6369875596358472
      },
      {
        "worker": 2,
        "t": 1794297276861.9792,
        "elu": 0.7184424945707435
      },
      {
        "worker": 0,
        "t": 1794297277062.9512,
        "elu": 0.8046890711925208
      },
      {
        "worker": 1,
        "t": 1794297277189.0886,
        "elu": 0.8673028169421134
      },
      {
        "worker": 99,
        "t": 1794297277266.7683,
        "elu": 0.9543577584924305
      },
      {
        "worker": 2,
        "t": 1794297277364.2798,
        "elu": 0.8773445737968698
      },
      {
        "worker": 0,
        "t": 1794297277564.2266,
        "elu": 0.8246541873733539
      },
      {
        "worker": 1,
        "t": 1794297277698.9487,
        "elu": 0.7902342514075154
      },
      {
        "worker": 2,
        "t": 1794297277865.6682,
        "elu": 0.881272356339007
      },
      {
        "worker": 99,
        "t": 1794297277886.4043,
        "elu": 0.9650802199994778
      },
      {
        "worker": 0,
        "t": 1794297278064.81,
        "elu": 0.8446863310369863
      },
      {
        "worker": 1,
        "t": 1794297278205.337,
        "elu": 0.8399948862226814
      },
      {
        "worker": 2,
        "t": 1794297278369.0957,
        "elu": 0.7113027816200225
      },
      {
        "worker": 99,
        "t": 1794297278390.242,
        "elu": 0.943300297076191
      },
      {
        "worker": 0,
        "t": 1794297278564.7595,
        "elu": 0.6893160071115035
      },
      {
        "worker": 1,
        "t": 1794297278705.4348,
        "elu": 0.5805848840033548
      },
      {
        "worker": 2,
        "t": 1794297278869.6646,
        "elu": 0.6413841605377889
      },
      {
        "worker": 99,
        "t": 1794297278891.113,
        "elu": 0.8716583855031282
      },
      {
        "worker": 0,
        "t": 1794297279065.611,
        "elu": 0.5279683702316945
      },
      {
        "worker": 1,
        "t": 1794297279205.6711,
        "elu": 0.3881013119376016
      },
      {
        "worker": 2,
        "t": 1794297279369.1912,
        "elu": 0.12345007649864252
      },
      {
        "worker": 0,
        "t": 1794297279567.9966,
        "elu": 0.03788179201421288
      },
      {
        "worker": 1,
        "t": 1794297279705.4778,
        "elu": 0.025181417093069876
      },
      {
        "worker": 2,
        "t": 1794297279872.1558,
        "elu": 0.015191483250743867
      },
      {
        "worker": 0,
        "t": 1794297280068.8455,
        "elu": 0.01663486980108729
      },
      {
        "worker": 1,
        "t": 1794297280210.7883,
        "elu": 0.01719458359287856
      },
      {
        "worker": 2,
        "t": 1794297280373.8513,
        "elu": 0.030415604311183134
      },
      {
        "worker": 0,
        "t": 1794297280570.4995,
        "elu": 0.045982795879217796
      },
      {
        "worker": 1,
        "t": 1794297280712.3467,
        "elu": 0.02330535826743055
      },
      {
        "worker": 2,
        "t": 1794297280873.69,
        "elu": 0.020784302687746555
      },
      {
        "worker": 0,
        "t": 1794297281074.2957,
        "elu": 0.018454882852850015
      },
      {
        "worker": 1,
        "t": 1794297281214.3372,
        "elu": 0.019981032122860995
      },
      {
        "worker": 2,
        "t": 1794297281379.665,
        "elu": 0.020347740162534586
      },
      {
        "worker": 0,
        "t": 1794297281577.5842,
        "elu": 0.019034979831977904
      },
      {
        "worker": 1,
        "t": 1794297281715.1362,
        "elu": 0.030819683003271002
      },
      {
        "worker": 2,
        "t": 1794297281885.9893,
        "elu": 0.016691603779014318
      },
      {
        "worker": 0,
        "t": 1794297282077.5588,
        "elu": 0.028750963343354773
      },
      {
        "worker": 1,
        "t": 1794297282219.4614,
        "elu": 0.018168996088468954
      },
      {
        "worker": 2,
        "t": 1794297282386.1868,
        "elu": 0.022962793076046442
      },
      {
        "worker": 0,
        "t": 1794297282578.8643,
        "elu": 0.026706109535837592
      },
      {
        "worker": 1,
        "t": 1794297282720.1116,
        "elu": 0.022665688059528732
      },
      {
        "worker": 2,
        "t": 1794297282888.2334,
        "elu": 0.02965730185160302
      },
      {
        "worker": 0,
        "t": 1794297283089.3794,
        "elu": 0.010534857976944003
      },
      {
        "worker": 1,
        "t": 1794297283221.0679,
        "elu": 0.006414832407449147
      },
      {
        "worker": 2,
        "t": 1794297283388.7583,
        "elu": 0.006057131645955978
      },
      {
        "worker": 0,
        "t": 1794297283597.947,
        "elu": 0.01262882018886429
      },
      {
        "worker": 1,
        "t": 1794297283722.5527,
        "elu": 0.018402862964483676
      },
      {
        "worker": 2,
        "t": 1794297283890.3564,
        "elu": 0.020299160545124893
      },
      {
        "worker": 0,
        "t": 1794297284099.2004,
        "elu": 0.0272217882268579
      },
      {
        "worker": 1,
        "t": 1794297284232.0007,
        "elu": 0.0341445515008265
      },
      {
        "worker": 2,
        "t": 1794297284390.9807,
        "elu": 0.019812473358031598
      },
      {
        "worker": 0,
        "t": 1794297284601.3796,
        "elu": 0.022905663336225464
      },
      {
        "worker": 1,
        "t": 1794297284738.0535,
        "elu": 0.00855379210969523
      },
      {
        "worker": 2,
        "t": 1794297284895.952,
        "elu": 0.01984583345358617
      },
      {
        "worker": 0,
        "t": 1794297285101.755,
        "elu": 0.023953602181557957
      },
      {
        "worker": 1,
        "t": 1794297285248.3513,
        "elu": 0.022588467230269995
      },
      {
        "worker": 2,
        "t": 1794297285398.4453,
        "elu": 0.03680349820582598
      },
      {
        "worker": 0,
        "t": 1794297285605.107,
        "elu": 0.025391905210021028
      },
      {
        "worker": 1,
        "t": 1794297285750.041,
        "elu": 0.019939649439586756
      },
      {
        "worker": 2,
        "t": 1794297285904.8408,
        "elu": 0.01953791347303461
      },
      {
        "worker": 0,
        "t": 1794297286112.14,
        "elu": 0.03005928719528519
      },
      {
        "worker": 1,
        "t": 1794297286257.5146,
        "elu": 0.029574067609672353
      },
      {
        "worker": 2,
        "t": 1794297286404.9849,
        "elu": 0.0245989193648791
      },
      {
        "worker": 0,
        "t": 1794297286615.6829,
        "elu": 0.03196140338708523
      },
      {
        "worker": 1,
        "t": 1794297286760.759,
        "elu": 0.04414415167195585
      },
      {
        "worker": 2,
        "t": 1794297286905.6882,
        "elu": 0.024889672793361975
      },
      {
        "worker": 0,
        "t": 1794297287117.3743,
        "elu": 0.03610132559465452
      },
      {
        "worker": 1,
        "t": 1794297287261.1265,
        "elu": 0.013379000161077886
      },
      {
        "worker": 2,
        "t": 1794297287407.3464,
        "elu": 0.018087971194121484
      },
      {
        "worker": 0,
        "t": 1794297287622.2942,
        "elu": 0.02119942616070532
      },
      {
        "worker": 1,
        "t": 1794297287762.8416,
        "elu": 0.02681068008709821
      },
      {
        "worker": 2,
        "t": 1794297287908.4473,
        "elu": 0.027197830635736542
      },
      {
        "worker": 0,
        "t": 1794297288122.2527,
        "elu": 0.018738957235295263
      },
      {
        "worker": 1,
        "t": 1794297288265.25,
        "elu": 0.014958171415313472
      },
      {
        "worker": 2,
        "t": 1794297288408.6255,
        "elu": 0.010150057119684268
      },
      {
        "worker": 0,
        "t": 1794297288622.778,
        "elu": 0.00483712127987705
      },
      {
        "worker": 1,
        "t": 1794297288772.3674,
        "elu": 0.010566147900359809
      },
      {
        "worker": 2,
        "t": 1794297288908.8328,
        "elu": 0.014731042241268763
      },
      {
        "worker": 0,
        "t": 1794297289132.3347,
        "elu": 0.022886275417730164
      },
      {
        "worker": 1,
        "t": 1794297289280.87,
        "elu": 0.03483821673006899
      },
      {
        "worker": 2,
        "t": 1794297289414.0986,
        "elu": 0.020951130923733897
      },
      {
        "worker": 0,
        "t": 1794297289642.3923,
        "elu": 0.025986367873850193
      },
      {
        "worker": 1,
        "t": 1794297289790.6545,
        "elu": 0.019042581571605804
      },
      {
        "worker": 2,
        "t": 1794297289918.762,
        "elu": 0.024342863440284888
      },
      {
        "worker": 0,
        "t": 1794297290152.6426,
        "elu": 0.02961011395573912
      },
      {
        "worker": 1,
        "t": 1794297290296.8591,
        "elu": 0.02363168177757257
      },
      {
        "worker": 2,
        "t": 1794297290426.0413,
        "elu": 0.03048219369056742
      },
      {
        "worker": 0,
        "t": 1794297290657.6648,
        "elu": 0.026588850378341616
      },
      {
        "worker": 1,
        "t": 1794297290796.845,
        "elu": 0.02274047662060091
      },
      {
        "worker": 2,
        "t": 1794297290926.4836,
        "elu": 0.023795770901593172
      },
      {
        "worker": 0,
        "t": 1794297291165.2734,
        "elu": 0.03027203258982744
      },
      {
        "worker": 1,
        "t": 1794297291298.9485,
        "elu": 0.025232046164803696
      },
      {
        "worker": 2,
        "t": 1794297291432.0513,
        "elu": 0.018870567687136453
      },
      {
        "worker": 0,
        "t": 1794297291675.3848,
        "elu": 0.018225466470862622
      },
      {
        "worker": 1,
        "t": 1794297291799.4568,
        "elu": 0.03297240160584611
      },
      {
        "worker": 2,
        "t": 1794297291936.383,
        "elu": 0.018773890818082596
      },
      {
        "worker": 0,
        "t": 1794297292183.0781,
        "elu": 0.03082527606055289
      },
      {
        "worker": 1,
        "t": 1794297292305.0334,
        "elu": 0.019014752892266874
      },
      {
        "worker": 2,
        "t": 1794297292443.918,
        "elu": 0.01687034048711155
      },
      {
        "worker": 0,
        "t": 1794297292683.8606,
        "elu": 0.013110332841239882
      },
      {
        "worker": 1,
        "t": 1794297292815.4207,
        "elu": 0.014139367029613274
      },
      {
        "worker": 2,
        "t": 1794297292945.6216,
        "elu": 0.022231110561576305
      },
      {
        "worker": 0,
        "t": 1794297293193.3386,
        "elu": 0.0242259575968148
      },
      {
        "worker": 1,
        "t": 1794297293319.453,
        "elu": 0.019351055970754254
      },
      {
        "worker": 2,
        "t": 1794297293445.5327,
        "elu": 0.020950444652451487
      },
      {
        "worker": 0,
        "t": 1794297293703.9688,
        "elu": 0.012763839328909437
      },
      {
        "worker": 1,
        "t": 1794297293822.2097,
        "elu": 0.010804395798142631
      },
      {
        "worker": 2,
        "t": 1794297293952.5566,
        "elu": 0.006231126534922708
      },
      {
        "worker": 0,
        "t": 1794297294207.6296,
        "elu": 0.01139109253820341
      },
      {
        "worker": 1,
        "t": 1794297294325.149,
        "elu": 0.01570732614416374
      },
      {
        "worker": 2,
        "t": 1794297294463.6814,
        "elu": 0.011806034217660822
      },
      {
        "worker": 0,
        "t": 1794297294714.822,
        "elu": 0.016772325997550044
      },
      {
        "worker": 1,
        "t": 1794297294827.921,
        "elu": 0.012247138759281679
      },
      {
        "worker": 2,
        "t": 1794297294965.4265,
        "elu": 0.01477280247795386
      },
      {
        "worker": 0,
        "t": 1794297295214.6633,
        "elu": 0.01684887165338975
      },
      {
        "worker": 1,
        "t": 1794297295329.4043,
        "elu": 0.023998155823076506
      },
      {
        "worker": 2,
        "t": 1794297295471.1821,
        "elu": 0.03435778128127379
      },
      {
        "worker": 0,
        "t": 1794297295726.017,
        "elu": 0.01779303584044984
      },
      {
        "worker": 1,
        "t": 1794297295840.3618,
        "elu": 0.01410886087506703
      },
      {
        "worker": 2,
        "t": 1794297295972.7603,
        "elu": 0.018884637273393342
      },
      {
        "worker": 0,
        "t": 1794297296236.287,
        "elu": 0.027441590742651772
      },
      {
        "worker": 1,
        "t": 1794297296342.658,
        "elu": 0.026054998572553077
      },
      {
        "worker": 2,
        "t": 1794297296483.7952,
        "elu": 0.017713700739948383
      },
      {
        "worker": 0,
        "t": 1794297296741.3867,
        "elu": 0.02416129638944796
      },
      {
        "worker": 1,
        "t": 1794297296844.179,
        "elu": 0.03200311469369295
      },
      {
        "worker": 2,
        "t": 1794297296983.8032,
        "elu": 0.01834247481951669
      },
      {
        "worker": 0,
        "t": 1794297297252.7998,
        "elu": 0.02721624721154748
      },
      {
        "worker": 1,
        "t": 1794297297353.377,
        "elu": 0.01965612225333038
      },
      {
        "worker": 2,
        "t": 1794297297485.1826,
        "elu": 0.021591732459933982
      },
      {
        "worker": 0,
        "t": 1794297297753.1167,
        "elu": 0.02310130903116897
      },
      {
        "worker": 1,
        "t": 1794297297859.3958,
        "elu": 0.01796192144482086
      },
      {
        "worker": 2,
        "t": 1794297297992.7148,
        "elu": 0.029037015661820143
      },
      {
        "worker": 0,
        "t": 1794297298254.8557,
        "elu": 0.014644439544184071
      },
      {
        "worker": 1,
        "t": 1794297298367.0232,
        "elu": 0.014361269508127264
      },
      {
        "worker": 2,
        "t": 1794297298498.6458,
        "elu": 0.009486920475853828
      },
      {
        "worker": 0,
        "t": 1794297298761.971,
        "elu": 0.020572244569185275
      },
      {
        "worker": 1,
        "t": 1794297298870.3206,
        "elu": 0.02024173186967933
      },
      {
        "worker": 2,
        "t": 1794297299008.6548,
        "elu": 0.014469985362906944
      },
      {
        "worker": 0,
        "t": 1794297299272.1895,
        "elu": 0.008842454766428342
      },
      {
        "worker": 1,
        "t": 1794297299374.5188,
        "elu": 0.009573735646397005
      },
      {
        "worker": 2,
        "t": 1794297299509.7866,
        "elu": 0.008671348051318114
      },
      {
        "worker": 0,
        "t": 1794297299773.5605,
        "elu": 0.025525983504552922
      },
      {
        "worker": 1,
        "t": 1794297299881.654,
        "elu": 0.01883810703856904
      },
      {
        "worker": 2,
        "t": 1794297300012.2292,
        "elu": 0.013279615113313329
      },
      {
        "worker": 0,
        "t": 1794297300281.0269,
        "elu": 0.012702520777448297
      },
      {
        "worker": 1,
        "t": 1794297300386.085,
        "elu": 0.014917143569596435
      },
      {
        "worker": 2,
        "t": 1794297300514.4749,
        "elu": 0.032442147880248316
      },
      {
        "worker": 0,
        "t": 1794297300790.8608,
        "elu": 0.0242424030024634
      },
      {
        "worker": 1,
        "t": 1794297300894.0188,
        "elu": 0.017458683456046682
      },
      {
        "worker": 2,
        "t": 1794297301022.4697,
        "elu": 0.012896296098458498
      },
      {
        "worker": 0,
        "t": 1794297301296.3708,
        "elu": 0.024253478385527567
      },
      {
        "worker": 1,
        "t": 1794297301396.981,
        "elu": 0.022694397533220743
      },
      {
        "worker": 2,
        "t": 1794297301532.449,
        "elu": 0.023497139245862598
      },
      {
        "worker": 0,
        "t": 1794297301806.8442,
        "elu": 0.022138290659346433
      },
      {
        "worker": 1,
        "t": 1794297301903.3684,
        "elu": 0.031108204164829074
      },
      {
        "worker": 2,
        "t": 1794297302035.1008,
        "elu": 0.019523607098822237
      },
      {
        "worker": 0,
        "t": 1794297302311.0618,
        "elu": 0.04114115234307015
      },
      {
        "worker": 1,
        "t": 1794297302409.2437,
        "elu": 0.02347660787438051
      },
      {
        "worker": 2,
        "t": 1794297302540.462,
        "elu": 0.021137780749606337
      },
      {
        "worker": 0,
        "t": 1794297302819.866,
        "elu": 0.021331188311745592
      },
      {
        "worker": 1,
        "t": 1794297302913.1619,
        "elu": 0.016945422737200226
      },
      {
        "worker": 2,
        "t": 1794297303041.875,
        "elu": 0.030130157113248922
      },
      {
        "worker": 0,
        "t": 1794297303321.713,
        "elu": 0.01977999500955389
      },
      {
        "worker": 1,
        "t": 1794297303415.3005,
        "elu": 0.02250869340820197
      },
      {
        "worker": 2,
        "t": 1794297303543.1516,
        "elu": 0.016140041765982636
      },
      {
        "worker": 0,
        "t": 1794297303823.713,
        "elu": 0.022204939308540103
      },
      {
        "worker": 1,
        "t": 1794297303921.7854,
        "elu": 0.02038408661501385
      },
      {
        "worker": 2,
        "t": 1794297304048.8496,
        "elu": 0.019514037798315533
      },
      {
        "worker": 0,
        "t": 1794297304332.6987,
        "elu": 0.026960404703864696
      },
      {
        "worker": 1,
        "t": 1794297304432.3118,
        "elu": 0.029460252320725768
      },
      {
        "worker": 2,
        "t": 1794297304551.6729,
        "elu": 0.013925342718564153
      },
      {
        "worker": 0,
        "t": 1794297304842.2683,
        "elu": 0.011075833541888621
      },
      {
        "worker": 1,
        "t": 1794297304938.881,
        "elu": 0.011340895584522597
      },
      {
        "worker": 2,
        "t": 1794297305061.479,
        "elu": 0.015272385015242161
      },
      {
        "worker": 0,
        "t": 1794297305349.9219,
        "elu": 0.02700850504857742
      },
      {
        "worker": 1,
        "t": 1794297305439.9604,
        "elu": 0.020574641933018042
      },
      {
        "worker": 2,
        "t": 1794297305562.7026,
        "elu": 0.026796851358703744
      },
      {
        "worker": 0,
        "t": 1794297305859.2136,
        "elu": 0.019354594866611927
      },
      {
        "worker": 1,
        "t": 1794297305942.2317,
        "elu": 0.022457909846095664
      },
      {
        "worker": 2,
        "t": 1794297306071.3347,
        "elu": 0.019143960518145035
      },
      {
        "worker": 0,
        "t": 1794297306359.6597,
        "elu": 0.029079655245642762
      },
      {
        "worker": 1,
        "t": 1794297306446.1035,
        "elu": 0.022040666035814387
      },
      {
        "worker": 2,
        "t": 1794297306572.1687,
        "elu": 0.02140678411439125
      },
      {
        "worker": 0,
        "t": 1794297306861.4307,
        "elu": 0.017368260812268447
      },
      {
        "worker": 1,
        "t": 1794297306951.4465,
        "elu": 0.028405197121549697
      },
      {
        "worker": 2,
        "t": 1794297307077.9712,
        "elu": 0.014877548423446938
      },
      {
        "worker": 0,
        "t": 1794297307364.996,
        "elu": 0.02949036053187821
      },
      {
        "worker": 1,
        "t": 1794297307462.4502,
        "elu": 0.017830701742433525
      },
      {
        "worker": 2,
        "t": 1794297307581.0334,
        "elu": 0.019602803731583487
      },
      {
        "worker": 0,
        "t": 1794297307873.2534,
        "elu": 0.027368304571539118
      },
      {
        "worker": 1,
        "t": 1794297307970.493,
        "elu": 0.02354824515158228
      },
      {
        "worker": 2,
        "t": 1794297308088.119,
        "elu": 0.03072614972821587
      },
      {
        "worker": 0,
        "t": 1794297308375.271,
        "elu": 0.027318105434233925
      },
      {
        "worker": 1,
        "t": 1794297308473.8752,
        "elu": 0.022672617550735553
      },
      {
        "worker": 2,
        "t": 1794297308598.0967,
        "elu": 0.022088451936272017
      },
      {
        "worker": 0,
        "t": 1794297308879.3538,
        "elu": 0.020164966847167762
      },
      {
        "worker": 1,
        "t": 1794297308981.5798,
        "elu": 0.01438367020562058
      },
      {
        "worker": 2,
        "t": 1794297309099.049,
        "elu": 0.020266325514222798
      },
      {
        "worker": 0,
        "t": 1794297309382.4592,
        "elu": 0.022979214160935936
      },
      {
        "worker": 1,
        "t": 1794297309486.1743,
        "elu": 0.03617112406132682
      },
      {
        "worker": 2,
        "t": 1794297309599.5435,
        "elu": 0.020062083215675063
      },
      {
        "worker": 0,
        "t": 1794297309887.8389,
        "elu": 0.033304095759034584
      },
      {
        "worker": 1,
        "t": 1794297309996.1165,
        "elu": 0.012639209148168925
      },
      {
        "worker": 2,
        "t": 1794297310109.223,
        "elu": 0.0076272743941717186
      },
      {
        "worker": 0,
        "t": 1794297310388.7515,
        "elu": 0.014468885697917728
      },
      {
        "worker": 1,
        "t": 1794297310506.0647,
        "elu": 0.017534234215901157
      },
      {
        "worker": 2,
        "t": 1794297310610.8032,
        "elu": 0.030787923230582773
      },
      {
        "worker": 0,
        "t": 1794297310899.9893,
        "elu": 0.02945702592340614
      },
      {
        "worker": 1,
        "t": 1794297311014.3599,
        "elu": 0.02498933636384719
      },
      {
        "worker": 2,
        "t": 1794297311116.4504,
        "elu": 0.02297758211361875
      },
      {
        "worker": 0,
        "t": 1794297311401.712,
        "elu": 0.03225174069478695
      },
      {
        "worker": 1,
        "t": 1794297311522.7478,
        "elu": 0.03041305652770865
      },
      {
        "worker": 2,
        "t": 1794297311623.0625,
        "elu": 0.027482980454587635
      },
      {
        "worker": 0,
        "t": 1794297311903.1035,
        "elu": 0.02381623970437078
      },
      {
        "worker": 1,
        "t": 1794297312029.7593,
        "elu": 0.028726437169564936
      },
      {
        "worker": 2,
        "t": 1794297312123.327,
        "elu": 0.018140192923937506
      },
      {
        "worker": 0,
        "t": 1794297312411.6174,
        "elu": 0.02119432281491782
      },
      {
        "worker": 1,
        "t": 1794297312531.9758,
        "elu": 0.017769980105657678
      },
      {
        "worker": 2,
        "t": 1794297312624.4688,
        "elu": 0.017390526476812534
      },
      {
        "worker": 0,
        "t": 1794297312922.3418,
        "elu": 0.0169103802969603
      },
      {
        "worker": 1,
        "t": 1794297313032.8684,
        "elu": 0.01868638896171959
      },
      {
        "worker": 2,
        "t": 1794297313134.0962,
        "elu": 0.02658501752944605
      },
      {
        "worker": 0,
        "t": 1794297313424.1606,
        "elu": 0.026972601696784487
      },
      {
        "worker": 1,
        "t": 1794297313539.221,
        "elu": 0.024896416689231
      },
      {
        "worker": 2,
        "t": 1794297313637.0051,
        "elu": 0.023232249690892305
      },
      {
        "worker": 0,
        "t": 1794297313928.6426,
        "elu": 0.04071982294780947
      },
      {
        "worker": 1,
        "t": 1794297314042.7454,
        "elu": 0.030205943788342803
      },
      {
        "worker": 2,
        "t": 1794297314141.9656,
        "elu": 0.03006823160236928
      },
      {
        "worker": 0,
        "t": 1794297314437.1133,
        "elu": 0.01832454142807603
      },
      {
        "worker": 1,
        "t": 1794297314545.8025,
        "elu": 0.02608704425584518
      },
      {
        "worker": 2,
        "t": 1794297314642.664,
        "elu": 0.019899919964151847
      },
      {
        "worker": 0,
        "t": 1794297314940.4443,
        "elu": 0.03286181935544917
      },
      {
        "worker": 1,
        "t": 1794297315045.7998,
        "elu": 0.01532991177553299
      },
      {
        "worker": 2,
        "t": 1794297315142.3733,
        "elu": 0.015291967612684131
      },
      {
        "worker": 0,
        "t": 1794297315445.953,
        "elu": 0.0062519173017375265
      },
      {
        "worker": 1,
        "t": 1794297315555.1226,
        "elu": 0.005521889689639928
      },
      {
        "worker": 2,
        "t": 1794297315650.003,
        "elu": 0.010514957023860535
      },
      {
        "worker": 0,
        "t": 1794297315956.1443,
        "elu": 0.015428008821352637
      },
      {
        "worker": 1,
        "t": 1794297316057.278,
        "elu": 0.019508019595639726
      },
      {
        "worker": 2,
        "t": 1794297316160.7778,
        "elu": 0.01869213834962779
      },
      {
        "worker": 0,
        "t": 1794297316461.1406,
        "elu": 0.0236623271648478
      },
      {
        "worker": 1,
        "t": 1794297316562.2517,
        "elu": 0.02430517464604709
      },
      {
        "worker": 2,
        "t": 1794297316670.979,
        "elu": 0.025503715546510677
      },
      {
        "worker": 0,
        "t": 1794297316966.5828,
        "elu": 0.03197900944732233
      },
      {
        "worker": 1,
        "t": 1794297317064.1138,
        "elu": 0.03289569528191701
      },
      {
        "worker": 2,
        "t": 1794297317173.1985,
        "elu": 0.02064808267775559
      },
      {
        "worker": 0,
        "t": 1794297317468.3987,
        "elu": 0.029124393291394813
      },
      {
        "worker": 1,
        "t": 1794297317564.6343,
        "elu": 0.02462285787802171
      },
      {
        "worker": 2,
        "t": 1794297317680.538,
        "elu": 0.025647395209160623
      },
      {
        "worker": 0,
        "t": 1794297317976.9238,
        "elu": 0.027551690381611035
      },
      {
        "worker": 1,
        "t": 1794297318067.5483,
        "elu": 0.021431716204575464
      },
      {
        "worker": 2,
        "t": 1794297318185.4587,
        "elu": 0.03023778725165898
      },
      {
        "worker": 0,
        "t": 1794297318480.8066,
        "elu": 0.020753134522192362
      },
      {
        "worker": 1,
        "t": 1794297318569.0647,
        "elu": 0.01463786792289528
      },
      {
        "worker": 2,
        "t": 1794297318686.5625,
        "elu": 0.016557717027844268
      },
      {
        "worker": 0,
        "t": 1794297318987.5144,
        "elu": 0.014288668734524279
      },
      {
        "worker": 1,
        "t": 1794297319073.338,
        "elu": 0.02203482713324433
      },
      {
        "worker": 2,
        "t": 1794297319192.875,
        "elu": 0.0196445485542327
      },
      {
        "worker": 0,
        "t": 1794297319497.6829,
        "elu": 0.029469652041393655
      },
      {
        "worker": 1,
        "t": 1794297319575.4907,
        "elu": 0.029394664738065387
      },
      {
        "worker": 2,
        "t": 1794297319698.1062,
        "elu": 0.02346221966450122
      },
      {
        "worker": 0,
        "t": 1794297320001.474,
        "elu": 0.022341218350649946
      },
      {
        "worker": 1,
        "t": 1794297320086.1794,
        "elu": 0.021615741832157618
      },
      {
        "worker": 2,
        "t": 1794297320202.9192,
        "elu": 0.021037127291196122
      },
      {
        "worker": 0,
        "t": 1794297320504.9268,
        "elu": 0.021505874142104208
      },
      {
        "worker": 1,
        "t": 1794297320596.8787,
        "elu": 0.020284819819455003
      },
      {
        "worker": 2,
        "t": 1794297320703.4568,
        "elu": 0.0223094500118689
      },
      {
        "worker": 0,
        "t": 1794297321014.1785,
        "elu": 0.005313863792215946
      },
      {
        "worker": 1,
        "t": 1794297321103.2507,
        "elu": 0.007455028818081739
      },
      {
        "worker": 2,
        "t": 1794297321204.2742,
        "elu": 0.008703104083686517
      },
      {
        "worker": 0,
        "t": 1794297321516.2886,
        "elu": 0.016114120171830296
      },
      {
        "worker": 1,
        "t": 1794297321603.7595,
        "elu": 0.025243423456992344
      },
      {
        "worker": 2,
        "t": 1794297321711.7454,
        "elu": 0.017221216760816192
      },
      {
        "worker": 0,
        "t": 1794297322018.0042,
        "elu": 0.03662054434751386
      },
      {
        "worker": 1,
        "t": 1794297322114.7646,
        "elu": 0.02600034380472361
      },
      {
        "worker": 2,
        "t": 1794297322217.8289,
        "elu": 0.020767979299687406
      },
      {
        "worker": 0,
        "t": 1794297322528.7278,
        "elu": 0.021182394321084298
      },
      {
        "worker": 1,
        "t": 1794297322614.5195,
        "elu": 0.012936033337983837
      },
      {
        "worker": 2,
        "t": 1794297322718.4011,
        "elu": 0.01266326747864594
      },
      {
        "worker": 0,
        "t": 1794297323034.0708,
        "elu": 0.013859612536339766
      },
      {
        "worker": 1,
        "t": 1794297323114.814,
        "elu": 0.013831536306171132
      },
      {
        "worker": 2,
        "t": 1794297323225.1282,
        "elu": 0.02830741136511108
      },
      {
        "worker": 0,
        "t": 1794297323540.0361,
        "elu": 0.02326972565092288
      },
      {
        "worker": 1,
        "t": 1794297323619.7153,
        "elu": 0.021771596603783475
      },
      {
        "worker": 2,
        "t": 1794297323731.2478,
        "elu": 0.01985991798471446
      },
      {
        "worker": 0,
        "t": 1794297324047.8713,
        "elu": 0.022272545006142046
      },
      {
        "worker": 1,
        "t": 1794297324121.7493,
        "elu": 0.0310072265874103
      },
      {
        "worker": 2,
        "t": 1794297324240.8096,
        "elu": 0.017332284659080807
      },
      {
        "worker": 0,
        "t": 1794297324556.871,
        "elu": 0.03544455165818308
      },
      {
        "worker": 1,
        "t": 1794297324625.4785,
        "elu": 0.02179392957691765
      },
      {
        "worker": 2,
        "t": 1794297324742.767,
        "elu": 0.01760396183442231
      },
      {
        "worker": 0,
        "t": 1794297325057.8103,
        "elu": 0.02805562151439581
      },
      {
        "worker": 1,
        "t": 1794297325133.145,
        "elu": 0.022724704700989737
      },
      {
        "worker": 2,
        "t": 1794297325243.5862,
        "elu": 0.02002384753895914
      },
      {
        "worker": 0,
        "t": 1794297325562.0205,
        "elu": 0.013878874072559416
      },
      {
        "worker": 1,
        "t": 1794297325640.9973,
        "elu": 0.018179961360828348
      },
      {
        "worker": 2,
        "t": 1794297325743.7473,
        "elu": 0.02323974306291368
      },
      {
        "worker": 0,
        "t": 1794297326062.844,
        "elu": 0.01322120165723276
      },
      {
        "worker": 1,
        "t": 1794297326151.4412,
        "elu": 0.009086470171557337
      },
      {
        "worker": 2,
        "t": 1794297326253.8367,
        "elu": 0.006174060301389818
      },
      {
        "worker": 0,
        "t": 1794297326564.8716,
        "elu": 0.013578911483592063
      },
      {
        "worker": 1,
        "t": 1794297326652.3267,
        "elu": 0.016891752308384043
      },
      {
        "worker": 2,
        "t": 1794297326753.5322,
        "elu": 0.017267469446448722
      },
      {
        "worker": 0,
        "t": 1794297327074.3042,
        "elu": 0.02726336125730354
      },
      {
        "worker": 1,
        "t": 1794297327154.155,
        "elu": 0.022167299682487863
      },
      {
        "worker": 2,
        "t": 1794297327257.3364,
        "elu": 0.016952457525948823
      },
      {
        "worker": 0,
        "t": 1794297327584.597,
        "elu": 0.030367965287835797
      },
      {
        "worker": 1,
        "t": 1794297327654.9814,
        "elu": 0.02720542650098833
      },
      {
        "worker": 2,
        "t": 1794297327762.74,
        "elu": 0.024770867692857187
      },
      {
        "worker": 0,
        "t": 1794297328087.6025,
        "elu": 0.02760406336853667
      },
      {
        "worker": 1,
        "t": 1794297328159.6887,
        "elu": 0.02454614940887968
      },
      {
        "worker": 2,
        "t": 1794297328269.9282,
        "elu": 0.03039396744773347
      },
      {
        "worker": 0,
        "t": 1794297328591.05,
        "elu": 0.02507953002846412
      },
      {
        "worker": 1,
        "t": 1794297328660.7627,
        "elu": 0.023834914757215307
      },
      {
        "worker": 2,
        "t": 1794297328772.7666,
        "elu": 0.021330781264045307
      },
      {
        "worker": 0,
        "t": 1794297329092.5593,
        "elu": 0.025590905804684486
      },
      {
        "worker": 1,
        "t": 1794297329170.4497,
        "elu": 0.01896109125056697
      },
      {
        "worker": 2,
        "t": 1794297329282.1106,
        "elu": 0.019309475542755805
      },
      {
        "worker": 0,
        "t": 1794297329598.4805,
        "elu": 0.024844962405493554
      },
      {
        "worker": 1,
        "t": 1794297329672.2942,
        "elu": 0.039062493832273795
      },
      {
        "worker": 2,
        "t": 1794297329782.9795,
        "elu": 0.022035192537378262
      },
      {
        "worker": 0,
        "t": 1794297330107.7449,
        "elu": 0.01809985872384764
      },
      {
        "worker": 1,
        "t": 1794297330178.8215,
        "elu": 0.017717055806188944
      },
      {
        "worker": 2,
        "t": 1794297330285.7458,
        "elu": 0.018887440129429573
      },
      {
        "worker": 0,
        "t": 1794297330609.702,
        "elu": 0.02233464788463987
      },
      {
        "worker": 1,
        "t": 1794297330686.0618,
        "elu": 0.02563530883712963
      },
      {
        "worker": 2,
        "t": 1794297330788.029,
        "elu": 0.030256012444316697
      },
      {
        "worker": 0,
        "t": 1794297331114.2368,
        "elu": 0.01910126732090218
      },
      {
        "worker": 1,
        "t": 1794297331188.88,
        "elu": 0.012018549424023924
      },
      {
        "worker": 2,
        "t": 1794297331297.7966,
        "elu": 0.009280090159956955
      },
      {
        "worker": 0,
        "t": 1794297331614.5215,
        "elu": 0.005372787629832547
      },
      {
        "worker": 1,
        "t": 1794297331689.204,
        "elu": 0.011989818986862435
      },
      {
        "worker": 2,
        "t": 1794297331802.8992,
        "elu": 0.007890560696564668
      },
      {
        "worker": 0,
        "t": 1794297332119.6912,
        "elu": 0.022404489849584097
      },
      {
        "worker": 1,
        "t": 1794297332189.468,
        "elu": 0.011320458687088352
      },
      {
        "worker": 2,
        "t": 1794297332303.4197,
        "elu": 0.0123494053773299
      },
      {
        "worker": 0,
        "t": 1794297332621.1887,
        "elu": 0.02558022137580144
      },
      {
        "worker": 1,
        "t": 1794297332694.0918,
        "elu": 0.02342859729859519
      },
      {
        "worker": 2,
        "t": 1794297332804.1763,
        "elu": 0.025683130475350757
      },
      {
        "worker": 0,
        "t": 1794297333123.0276,
        "elu": 0.017412297214752532
      },
      {
        "worker": 1,
        "t": 1794297333200.7786,
        "elu": 0.019431913641234942
      },
      {
        "worker": 2,
        "t": 1794297333304.7048,
        "elu": 0.024259500690635896
      },
      {
        "worker": 0,
        "t": 1794297333624.5435,
        "elu": 0.02490156426674212
      },
      {
        "worker": 1,
        "t": 1794297333704.6538,
        "elu": 0.021654415806704894
      },
      {
        "worker": 2,
        "t": 1794297333814.2588,
        "elu": 0.017894507701316065
      },
      {
        "worker": 0,
        "t": 1794297334126.3347,
        "elu": 0.024089050591751135
      },
      {
        "worker": 1,
        "t": 1794297334206.9875,
        "elu": 0.029493453073600517
      },
      {
        "worker": 2,
        "t": 1794297334317.593,
        "elu": 0.018253858682913248
      },
      {
        "worker": 0,
        "t": 1794297334633.1035,
        "elu": 0.03455010181027045
      },
      {
        "worker": 1,
        "t": 1794297334709.9565,
        "elu": 0.01949608974992849
      },
      {
        "worker": 2,
        "t": 1794297334821.0608,
        "elu": 0.017116169408172042
      },
      {
        "worker": 0,
        "t": 1794297335143.8772,
        "elu": 0.007185192031955368
      },
      {
        "worker": 1,
        "t": 1794297335211.37,
        "elu": 0.006028504713435486
      },
      {
        "worker": 2,
        "t": 1794297335321.516,
        "elu": 0.00812025015315077
      },
      {
        "worker": 0,
        "t": 1794297335645.8354,
        "elu": 0.015066694270713037
      },
      {
        "worker": 1,
        "t": 1794297335720.3552,
        "elu": 0.019367084469001965
      },
      {
        "worker": 2,
        "t": 1794297335824.625,
        "elu": 0.030253849730647025
      },
      {
        "worker": 0,
        "t": 1794297336146.982,
        "elu": 0.023501738296414224
      },
      {
        "worker": 1,
        "t": 1794297336226.7434,
        "elu": 0.022426780932855387
      },
      {
        "worker": 2,
        "t": 1794297336325.107,
        "elu": 0.01952946148332759
      },
      {
        "worker": 0,
        "t": 1794297336656.158,
        "elu": 0.017867240354236643
      },
      {
        "worker": 1,
        "t": 1794297336727.2327,
        "elu": 0.015533839985630765
      },
      {
        "worker": 2,
        "t": 1794297336826.0176,
        "elu": 0.010285006260405299
      },
      {
        "worker": 0,
        "t": 1794297337158.5188,
        "elu": 0.0210679921716942
      },
      {
        "worker": 1,
        "t": 1794297337234.0876,
        "elu": 0.017137642576508752
      },
      {
        "worker": 2,
        "t": 1794297337326.927,
        "elu": 0.013603963219218904
      },
      {
        "worker": 0,
        "t": 1794297337658.489,
        "elu": 0.028213202456225685
      },
      {
        "worker": 1,
        "t": 1794297337738.0132,
        "elu": 0.020818469632587103
      },
      {
        "worker": 2,
        "t": 1794297337827.0508,
        "elu": 0.021162004609864397
      },
      {
        "worker": 0,
        "t": 1794297338159.5383,
        "elu": 0.015036355817255249
      },
      {
        "worker": 1,
        "t": 1794297338238.5735,
        "elu": 0.020068865001295996
      },
      {
        "worker": 2,
        "t": 1794297338337.9995,
        "elu": 0.034815933716682866
      },
      {
        "worker": 0,
        "t": 1794297338665.1614,
        "elu": 0.028178627743792345
      },
      {
        "worker": 1,
        "t": 1794297338739.4663,
        "elu": 0.023555496558925124
      },
      {
        "worker": 2,
        "t": 1794297338840.5405,
        "elu": 0.02276972457677087
      },
      {
        "worker": 0,
        "t": 1794297339175.0596,
        "elu": 0.013152472492122952
      },
      {
        "worker": 1,
        "t": 1794297339241.1184,
        "elu": 0.007725873870752023
      },
      {
        "worker": 2,
        "t": 1794297339340.85,
        "elu": 0.013784717960444372
      },
      {
        "worker": 0,
        "t": 1794297339679.5173,
        "elu": 0.03578557699768228
      },
      {
        "worker": 1,
        "t": 1794297339744.8433,
        "elu": 0.03919382505558197
      },
      {
        "worker": 2,
        "t": 1794297339840.2737,
        "elu": 0.01719291989238365
      },
      {
        "worker": 0,
        "t": 1794297340189.0623,
        "elu": 0.021109020415407596
      },
      {
        "worker": 1,
        "t": 1794297340246.2302,
        "elu": 0.020671509310810576
      },
      {
        "worker": 2,
        "t": 1794297340340.8232,
        "elu": 0.01638038225469787
      },
      {
        "worker": 0,
        "t": 1794297340694.2263,
        "elu": 0.02173816947061858
      },
      {
        "worker": 1,
        "t": 1794297340752.5518,
        "elu": 0.020880849057670292
      },
      {
        "worker": 2,
        "t": 1794297340842.4172,
        "elu": 0.029265270996778024
      },
      {
        "worker": 0,
        "t": 1794297341200.5369,
        "elu": 0.019214652466843146
      },
      {
        "worker": 1,
        "t": 1794297341259.7568,
        "elu": 0.02045712636358409
      },
      {
        "worker": 2,
        "t": 1794297341347.093,
        "elu": 0.021108807587903552
      },
      {
        "worker": 0,
        "t": 1794297341704.5654,
        "elu": 0.024969326426065867
      },
      {
        "worker": 1,
        "t": 1794297341763.2737,
        "elu": 0.028582561807486227
      },
      {
        "worker": 2,
        "t": 1794297341847.4348,
        "elu": 0.01886126402322499
      },
      {
        "worker": 0,
        "t": 1794297342208.7168,
        "elu": 0.010407060080089936
      },
      {
        "worker": 1,
        "t": 1794297342263.4358,
        "elu": 0.005671983063176635
      },
      {
        "worker": 2,
        "t": 1794297342349.4846,
        "elu": 0.004153743894628497
      },
      {
        "worker": 0,
        "t": 1794297342713.9888,
        "elu": 0.01894397965972941
      },
      {
        "worker": 1,
        "t": 1794297342765.6545,
        "elu": 0.018742673932064673
      },
      {
        "worker": 2,
        "t": 1794297342849.2476,
        "elu": 0.021566544815638165
      },
      {
        "worker": 0,
        "t": 1794297343216.3328,
        "elu": 0.023972844844043675
      },
      {
        "worker": 1,
        "t": 1794297343265.818,
        "elu": 0.020476589828389822
      },
      {
        "worker": 2,
        "t": 1794297343360.1584,
        "elu": 0.03092117894149132
      },
      {
        "worker": 0,
        "t": 1794297343716.5762,
        "elu": 0.016147482097863302
      },
      {
        "worker": 1,
        "t": 1794297343771.1636,
        "elu": 0.0215232262747011
      },
      {
        "worker": 2,
        "t": 1794297343860.1577,
        "elu": 0.022545427803390115
      },
      {
        "worker": 0,
        "t": 1794297344217.077,
        "elu": 0.019066080610156938
      },
      {
        "worker": 1,
        "t": 1794297344278.4062,
        "elu": 0.02297129050332181
      },
      {
        "worker": 2,
        "t": 1794297344360.677,
        "elu": 0.013341284306819058
      },
      {
        "worker": 0,
        "t": 1794297344719.5103,
        "elu": 0.0246138463046763
      },
      {
        "worker": 1,
        "t": 1794297344779.3037,
        "elu": 0.02232515830412213
      },
      {
        "worker": 2,
        "t": 1794297344861.534,
        "elu": 0.016189758610427964
      },
      {
        "worker": 0,
        "t": 1794297345221.162,
        "elu": 0.023481451318381787
      },
      {
        "worker": 1,
        "t": 1794297345283.788,
        "elu": 0.017862541962676462
      },
      {
        "worker": 2,
        "t": 1794297345366.0613,
        "elu": 0.01936807747516233
      },
      {
        "worker": 0,
        "t": 1794297345723.4111,
        "elu": 0.02602556978286665
      },
      {
        "worker": 1,
        "t": 1794297345784.0498,
        "elu": 0.02751002387867513
      },
      {
        "worker": 2,
        "t": 1794297345868.0122,
        "elu": 0.03435457009862706
      },
      {
        "worker": 0,
        "t": 1794297346224.555,
        "elu": 0.025219278760507013
      },
      {
        "worker": 1,
        "t": 1794297346286.2825,
        "elu": 0.029320479312598964
      },
      {
        "worker": 2,
        "t": 1794297346372.7288,
        "elu": 0.024789840962045697
      },
      {
        "worker": 0,
        "t": 1794297346725.4565,
        "elu": 0.025603928596114506
      },
      {
        "worker": 1,
        "t": 1794297346791.6694,
        "elu": 0.03461719461739473
      },
      {
        "worker": 2,
        "t": 1794297346873.1145,
        "elu": 0.02210441113281766
      },
      {
        "worker": 0,
        "t": 1794297347224.309,
        "elu": 0.039206888990037554
      },
      {
        "worker": 1,
        "t": 1794297347292.928,
        "elu": 0.01700876916810124
      },
      {
        "worker": 2,
        "t": 1794297347375.9482,
        "elu": 0.01154260350669811
      },
      {
        "worker": 0,
        "t": 1794297347729.536,
        "elu": 0.005182556430058007
      },
      {
        "worker": 1,
        "t": 1794297347798.3003,
        "elu": 0.004306822272145726
      },
      {
        "worker": 2,
        "t": 1794297347876.7583,
        "elu": 0.009052373229723068
      },
      {
        "worker": 0,
        "t": 1794297348232.9731,
        "elu": 0.02800169298556557
      },
      {
        "worker": 1,
        "t": 1794297348300.4065,
        "elu": 0.023058025212838756
      },
      {
        "worker": 2,
        "t": 1794297348376.9468,
        "elu": 0.023755248975715206
      },
      {
        "worker": 0,
        "t": 1794297348737.245,
        "elu": 0.013039078982825528
      },
      {
        "worker": 1,
        "t": 1794297348811.1611,
        "elu": 0.017118816244327355
      },
      {
        "worker": 2,
        "t": 1794297348878.0012,
        "elu": 0.019062650896317805
      },
      {
        "worker": 0,
        "t": 1794297349238.5706,
        "elu": 0.01604998212045808
      },
      {
        "worker": 1,
        "t": 1794297349317.6418,
        "elu": 0.02826165011304592
      },
      {
        "worker": 2,
        "t": 1794297349380.1062,
        "elu": 0.014011805026772536
      },
      {
        "worker": 0,
        "t": 1794297349748.95,
        "elu": 0.01697244023901072
      },
      {
        "worker": 1,
        "t": 1794297349826.6016,
        "elu": 0.010579975548046018
      },
      {
        "worker": 2,
        "t": 1794297349884.4438,
        "elu": 0.010976937269536947
      },
      {
        "worker": 0,
        "t": 1794297350251.5166,
        "elu": 0.019728813516702
      },
      {
        "worker": 1,
        "t": 1794297350328.3167,
        "elu": 0.01894301722030156
      },
      {
        "worker": 2,
        "t": 1794297350390.0715,
        "elu": 0.018138486080801923
      },
      {
        "worker": 0,
        "t": 1794297350753.6538,
        "elu": 0.013310743236455962
      },
      {
        "worker": 1,
        "t": 1794297350830.5007,
        "elu": 0.013483901442837311
      },
      {
        "worker": 2,
        "t": 1794297350893.2493,
        "elu": 0.020781880779017527
      },
      {
        "worker": 0,
        "t": 1794297351263.699,
        "elu": 0.01458240008021899
      },
      {
        "worker": 1,
        "t": 1794297351338.8394,
        "elu": 0.009024470733895862
      },
      {
        "worker": 2,
        "t": 1794297351397.587,
        "elu": 0.009026599685117195
      },
      {
        "worker": 0,
        "t": 1794297351765.9497,
        "elu": 0.021429091688204102
      },
      {
        "worker": 1,
        "t": 1794297351844.5576,
        "elu": 0.030941565028600963
      },
      {
        "worker": 2,
        "t": 1794297351905.6492,
        "elu": 0.017800132721739585
      },
      {
        "worker": 0,
        "t": 1794297352275.0981,
        "elu": 0.03305393919648382
      },
      {
        "worker": 1,
        "t": 1794297352345.7874,
        "elu": 0.01712474764144231
      },
      {
        "worker": 2,
        "t": 1794297352411.3232,
        "elu": 0.01674251019613899
      },
      {
        "worker": 0,
        "t": 1794297352785.272,
        "elu": 0.011077621546474748
      },
      {
        "worker": 1,
        "t": 1794297352846.07,
        "elu": 0.008030730855975794
      },
      {
        "worker": 2,
        "t": 1794297352912.495,
        "elu": 0.008653620645815778
      },
      {
        "worker": 0,
        "t": 1794297353285.7935,
        "elu": 0.014214070058348866
      },
      {
        "worker": 1,
        "t": 1794297353352.4072,
        "elu": 0.011458229798555429
      },
      {
        "worker": 2,
        "t": 1794297353415.6086,
        "elu": 0.019632947159912744
      },
      {
        "worker": 0,
        "t": 1794297353790.2886,
        "elu": 0.018124057780743615
      },
      {
        "worker": 1,
        "t": 1794297353853.8357,
        "elu": 0.021401006901863955
      },
      {
        "worker": 2,
        "t": 1794297353916.6892,
        "elu": 0.017523623960029405
      },
      {
        "worker": 0,
        "t": 1794297354293.5137,
        "elu": 0.017411879266905787
      },
      {
        "worker": 1,
        "t": 1794297354355.646,
        "elu": 0.025923894539033456
      },
      {
        "worker": 2,
        "t": 1794297354426.8633,
        "elu": 0.018642080228329846
      },
      {
        "worker": 0,
        "t": 1794297354795.119,
        "elu": 0.023982859672839175
      },
      {
        "worker": 1,
        "t": 1794297354860.9854,
        "elu": 0.014866702758512892
      },
      {
        "worker": 2,
        "t": 1794297354926.4082,
        "elu": 0.019960278745844596
      },
      {
        "worker": 0,
        "t": 1794297355298.3386,
        "elu": 0.018911733146714214
      },
      {
        "worker": 1,
        "t": 1794297355369.7297,
        "elu": 0.0174829176162673
      },
      {
        "worker": 2,
        "t": 1794297355434.9993,
        "elu": 0.016081972459750776
      },
      {
        "worker": 0,
        "t": 1794297355800.295,
        "elu": 0.01757502455048431
      },
      {
        "worker": 1,
        "t": 1794297355869.5269,
        "elu": 0.01928127448192613
      },
      {
        "worker": 2,
        "t": 1794297355945.508,
        "elu": 0.022070793512263178
      },
      {
        "worker": 0,
        "t": 1794297356311.608,
        "elu": 0.01906201586484581
      },
      {
        "worker": 1,
        "t": 1794297356369.815,
        "elu": 0.014542804300951711
      },
      {
        "worker": 2,
        "t": 1794297356449.1296,
        "elu": 0.01506028729402559
      },
      {
        "worker": 0,
        "t": 1794297356814.2764,
        "elu": 0.017428158319509786
      },
      {
        "worker": 1,
        "t": 1794297356870.37,
        "elu": 0.017374411802203695
      },
      {
        "worker": 2,
        "t": 1794297356950.0417,
        "elu": 0.018802001452525023
      },
      {
        "worker": 0,
        "t": 1794297357319.305,
        "elu": 0.04105626530744008
      },
      {
        "worker": 1,
        "t": 1794297357371.125,
        "elu": 0.03432854774094208
      },
      {
        "worker": 2,
        "t": 1794297357460.689,
        "elu": 0.021208228706363057
      },
      {
        "worker": 0,
        "t": 1794297357821.1396,
        "elu": 0.02700473158183376
      },
      {
        "worker": 1,
        "t": 1794297357879.4841,
        "elu": 0.025457956555103016
      },
      {
        "worker": 2,
        "t": 1794297357961.6843,
        "elu": 0.02327754032040631
      },
      {
        "worker": 0,
        "t": 1794297358331.2864,
        "elu": 0.00599854910379965
      },
      {
        "worker": 1,
        "t": 1794297358383.734,
        "elu": 0.006801080669106949
      },
      {
        "worker": 2,
        "t": 1794297358464.5017,
        "elu": 0.009134932361686787
      },
      {
        "worker": 0,
        "t": 1794297358835.4724,
        "elu": 0.01703917933886872
      },
      {
        "worker": 1,
        "t": 1794297358887.8628,
        "elu": 0.017317675643938674
      },
      {
        "worker": 2,
        "t": 1794297358964.7485,
        "elu": 0.018512158946740215
      },
      {
        "worker": 0,
        "t": 1794297359344.985,
        "elu": 0.021422423059882192
      },
      {
        "worker": 1,
        "t": 1794297359394.4775,
        "elu": 0.017154830572920474
      },
      {
        "worker": 2,
        "t": 1794297359474.844,
        "elu": 0.01972675815919272
      },
      {
        "worker": 0,
        "t": 1794297359847.3967,
        "elu": 0.025117467732433833
      },
      {
        "worker": 1,
        "t": 1794297359896.2087,
        "elu": 0.02894006573165011
      },
      {
        "worker": 2,
        "t": 1794297359981.6873,
        "elu": 0.017326154904344995
      },
      {
        "worker": 0,
        "t": 1794297360354.0686,
        "elu": 0.0236872175999178
      },
      {
        "worker": 1,
        "t": 1794297360397.4985,
        "elu": 0.021839500237487465
      },
      {
        "worker": 2,
        "t": 1794297360492.7568,
        "elu": 0.019750007518009916
      },
      {
        "worker": 0,
        "t": 1794297360855.8254,
        "elu": 0.024046055133071592
      },
      {
        "worker": 1,
        "t": 1794297360899.788,
        "elu": 0.02099413963092437
      },
      {
        "worker": 2,
        "t": 1794297361003.567,
        "elu": 0.025287205646174902
      },
      {
        "worker": 0,
        "t": 1794297361365.3691,
        "elu": 0.01724648438924611
      },
      {
        "worker": 1,
        "t": 1794297361402.5464,
        "elu": 0.021549514004456587
      },
      {
        "worker": 2,
        "t": 1794297361513.3652,
        "elu": 0.019535405694292046
      },
      {
        "worker": 0,
        "t": 1794297361867.8477,
        "elu": 0.023688902176071683
      },
      {
        "worker": 1,
        "t": 1794297361903.2573,
        "elu": 0.017650677721294406
      },
      {
        "worker": 2,
        "t": 1794297362018.822,
        "elu": 0.016014911740912678
      },
      {
        "worker": 0,
        "t": 1794297362376.0388,
        "elu": 0.03096573873848558
      },
      {
        "worker": 1,
        "t": 1794297362406.044,
        "elu": 0.028395191143578014
      },
      {
        "worker": 2,
        "t": 1794297362528.1973,
        "elu": 0.015435920721995906
      },
      {
        "worker": 0,
        "t": 1794297362879.314,
        "elu": 0.015115646889000418
      },
      {
        "worker": 1,
        "t": 1794297362912.9697,
        "elu": 0.013637741333307309
      },
      {
        "worker": 2,
        "t": 1794297363039.0083,
        "elu": 0.014169132122652188
      },
      {
        "worker": 0,
        "t": 1794297363379.7642,
        "elu": 0.02002951697583144
      },
      {
        "worker": 1,
        "t": 1794297363412.4736,
        "elu": 0.01831866008177258
      },
      {
        "worker": 2,
        "t": 1794297363547.4622,
        "elu": 0.029690826008445834
      },
      {
        "worker": 0,
        "t": 1794297363889.7412,
        "elu": 0.004624093585713156
      },
      {
        "worker": 1,
        "t": 1794297363920.6213,
        "elu": 0.007261348434147076
      },
      {
        "worker": 2,
        "t": 1794297364057.7092,
        "elu": 0.008618026911102037
      },
      {
        "worker": 0,
        "t": 1794297364392.04,
        "elu": 0.024388860168502537
      },
      {
        "worker": 1,
        "t": 1794297364422.1997,
        "elu": 0.018690987333942557
      },
      {
        "worker": 2,
        "t": 1794297364558.9412,
        "elu": 0.01975321388753955
      },
      {
        "worker": 0,
        "t": 1794297364892.8794,
        "elu": 0.019079622693742696
      },
      {
        "worker": 1,
        "t": 1794297364923.6426,
        "elu": 0.021628004912080348
      },
      {
        "worker": 2,
        "t": 1794297365061.919,
        "elu": 0.010901980539092162
      },
      {
        "worker": 0,
        "t": 1794297365400.765,
        "elu": 0.011953672334258416
      },
      {
        "worker": 1,
        "t": 1794297365429.9768,
        "elu": 0.01035126216797963
      },
      {
        "worker": 2,
        "t": 1794297365562.9329,
        "elu": 0.010988812943393564
      },
      {
        "worker": 0,
        "t": 1794297365903.792,
        "elu": 0.022453052942351483
      },
      {
        "worker": 1,
        "t": 1794297365930.5034,
        "elu": 0.021069748518021778
      },
      {
        "worker": 2,
        "t": 1794297366063.6072,
        "elu": 0.025864607269608646
      },
      {
        "worker": 0,
        "t": 1794297366404.8726,
        "elu": 0.0178261883284345
      },
      {
        "worker": 1,
        "t": 1794297366431.4585,
        "elu": 0.021452649164092574
      },
      {
        "worker": 2,
        "t": 1794297366568.3064,
        "elu": 0.022088004248531364
      },
      {
        "worker": 0,
        "t": 1794297366907.6675,
        "elu": 0.02958449077121894
      },
      {
        "worker": 1,
        "t": 1794297366933.4922,
        "elu": 0.018259754905192473
      },
      {
        "worker": 2,
        "t": 1794297367078.8213,
        "elu": 0.021815079114374598
      },
      {
        "worker": 0,
        "t": 1794297367407.604,
        "elu": 0.029786540938241658
      },
      {
        "worker": 1,
        "t": 1794297367443.5034,
        "elu": 0.0272494599463447
      },
      {
        "worker": 2,
        "t": 1794297367582.6306,
        "elu": 0.015383054055139005
      },
      {
        "worker": 0,
        "t": 1794297367917.07,
        "elu": 0.01968098338935892
      },
      {
        "worker": 1,
        "t": 1794297367943.6787,
        "elu": 0.01964345188941929
      },
      {
        "worker": 2,
        "t": 1794297368092.4658,
        "elu": 0.014279691005422132
      },
      {
        "worker": 0,
        "t": 1794297368422.8337,
        "elu": 0.023200950247010434
      },
      {
        "worker": 1,
        "t": 1794297368450.3967,
        "elu": 0.02256374478927084
      },
      {
        "worker": 2,
        "t": 1794297368601.2268,
        "elu": 0.032674428153721485
      },
      {
        "worker": 0,
        "t": 1794297368932.1416,
        "elu": 0.013579953024879085
      },
      {
        "worker": 1,
        "t": 1794297368952.0308,
        "elu": 0.013457866069729192
      },
      {
        "worker": 2,
        "t": 1794297369111.8025,
        "elu": 0.009026127825647294
      },
      {
        "worker": 0,
        "t": 1794297369433.9497,
        "elu": 0.00938364240918206
      },
      {
        "worker": 1,
        "t": 1794297369452.421,
        "elu": 0.014244518280375377
      },
      {
        "worker": 2,
        "t": 1794297369619.415,
        "elu": 0.017167756283892593
      },
      {
        "worker": 0,
        "t": 1794297369938.7725,
        "elu": 0.038411730882704574
      },
      {
        "worker": 1,
        "t": 1794297369955.6216,
        "elu": 0.03155444256320136
      },
      {
        "worker": 2,
        "t": 1794297370123.047,
        "elu": 0.019159953693343893
      },
      {
        "worker": 0,
        "t": 1794297370443.4092,
        "elu": 0.0273901147361008
      },
      {
        "worker": 1,
        "t": 1794297370460.8105,
        "elu": 0.022578341847836123
      },
      {
        "worker": 2,
        "t": 1794297370626.5686,
        "elu": 0.020929713088499235
      },
      {
        "worker": 0,
        "t": 1794297370943.6567,
        "elu": 0.021399339758488463
      },
      {
        "worker": 1,
        "t": 1794297370960.3503,
        "elu": 0.020505137387091834
      },
      {
        "worker": 2,
        "t": 1794297371127.8071,
        "elu": 0.027629457420610234
      },
      {
        "worker": 0,
        "t": 1794297371444.6555,
        "elu": 0.018271804662819694
      },
      {
        "worker": 1,
        "t": 1794297371463.9858,
        "elu": 0.017452916179231094
      },
      {
        "worker": 2,
        "t": 1794297371633.4568,
        "elu": 0.01730753964086466
      },
      {
        "worker": 0,
        "t": 1794297371947.5352,
        "elu": 0.021140065455480295
      },
      {
        "worker": 1,
        "t": 1794297371965.2363,
        "elu": 0.026941256104468424
      },
      {
        "worker": 2,
        "t": 1794297372134.3347,
        "elu": 0.0199444764719687
      },
      {
        "worker": 0,
        "t": 1794297372454.2744,
        "elu": 0.02501454601237219
      },
      {
        "worker": 1,
        "t": 1794297372466.5776,
        "elu": 0.014801020510241885
      },
      {
        "worker": 2,
        "t": 1794297372643.1123,
        "elu": 0.016350212304455145
      },
      {
        "worker": 0,
        "t": 1794297372956.4036,
        "elu": 0.012860638248373692
      },
      {
        "worker": 1,
        "t": 1794297372970.7922,
        "elu": 0.012304983500435613
      },
      {
        "worker": 2,
        "t": 1794297373146.4597,
        "elu": 0.017376146768918056
      },
      {
        "worker": 0,
        "t": 1794297373460.3438,
        "elu": 0.028744357520063216
      },
      {
        "worker": 1,
        "t": 1794297373474.208,
        "elu": 0.022834534246265664
      },
      {
        "worker": 2,
        "t": 1794297373647.0752,
        "elu": 0.02874659627928394
      },
      {
        "worker": 0,
        "t": 1794297373967.374,
        "elu": 0.03284121781770758
      },
      {
        "worker": 1,
        "t": 1794297373976.7932,
        "elu": 0.029007237886875023
      },
      {
        "worker": 2,
        "t": 1794297374154.058,
        "elu": 0.023254595125849223
      },
      {
        "worker": 0,
        "t": 1794297374473.3013,
        "elu": 0.00569835689823807
      },
      {
        "worker": 1,
        "t": 1794297374476.1426,
        "elu": 0.010479362913141912
      },
      {
        "worker": 2,
        "t": 1794297374660.498,
        "elu": 0.006271043754544473
      },
      {
        "worker": 0,
        "t": 1794297374974.954,
        "elu": 0.029060134778148592
      },
      {
        "worker": 1,
        "t": 1794297374976.7375,
        "elu": 0.01741433466010313
      },
      {
        "worker": 2,
        "t": 1794297375162.454,
        "elu": 0.021270334637119317
      },
      {
        "worker": 1,
        "t": 1794297375479.474,
        "elu": 0.022191357941486467
      },
      {
        "worker": 0,
        "t": 1794297375483.1082,
        "elu": 0.026041890472870442
      },
      {
        "worker": 2,
        "t": 1794297375672.2444,
        "elu": 0.01951431418494951
      },
      {
        "worker": 1,
        "t": 1794297375980.715,
        "elu": 0.017973511928262288
      },
      {
        "worker": 0,
        "t": 1794297376001.5828,
        "elu": 0.039920120942596345
      },
      {
        "worker": 2,
        "t": 1794297376173.9622,
        "elu": 0.02992006423779795
      },
      {
        "worker": 1,
        "t": 1794297376489.9624,
        "elu": 0.010124631920144046
      },
      {
        "worker": 0,
        "t": 1794297376501.9846,
        "elu": 0.6291474211796524
      },
      {
        "worker": 2,
        "t": 1794297376680.268,
        "elu": 0.016660994215117835
      },
      {
        "worker": 1,
        "t": 1794297376992.1638,
        "elu": 0.020511073944337346
      },
      {
        "worker": 0,
        "t": 1794297377004.154,
        "elu": 0.05140184767036996
      },
      {
        "worker": 2,
        "t": 1794297377190.876,
        "elu": 0.018002562697486738
      },
      {
        "worker": 1,
        "t": 1794297377492.222,
        "elu": 0.03451358003142867
      },
      {
        "worker": 0,
        "t": 1794297377512.105,
        "elu": 0.027317786499258576
      },
      {
        "worker": 2,
        "t": 1794297377700.9563,
        "elu": 0.020034899282246308
      },
      {
        "worker": 1,
        "t": 1794297377995.6504,
        "elu": 0.018831760431063972
      },
      {
        "worker": 0,
        "t": 1794297378016.5916,
        "elu": 0.034414623798491584
      },
      {
        "worker": 2,
        "t": 1794297378211.6487,
        "elu": 0.015614838442788315
      },
      {
        "worker": 1,
        "t": 1794297378500.9905,
        "elu": 0.014542740922649643
      },
      {
        "worker": 0,
        "t": 1794297378519.5007,
        "elu": 0.0320900869859823
      },
      {
        "worker": 2,
        "t": 1794297378733.0515,
        "elu": 0.41970258003089084
      },
      {
        "worker": 1,
        "t": 1794297379001.2905,
        "elu": 0.011843231660027775
      },
      {
        "worker": 0,
        "t": 1794297379021.137,
        "elu": 0.015853645551861133
      },
      {
        "worker": 2,
        "t": 1794297379239.9807,
        "elu": 0.033797639743579126
      },
      {
        "worker": 1,
        "t": 1794297379503.012,
        "elu": 0.43554452969876767
      },
      {
        "worker": 0,
        "t": 1794297379530.949,
        "elu": 0.0195307539925687
      },
      {
        "worker": 2,
        "t": 1794297379750.4285,
        "elu": 0.01203719384834816
      },
      {
        "worker": 1,
        "t": 1794297380012.2346,
        "elu": 0.007141598316860445
      },
      {
        "worker": 0,
        "t": 1794297380033.928,
        "elu": 0.01000055145038417
      },
      {
        "worker": 2,
        "t": 1794297380250.8574,
        "elu": 0.02283409181856752
      },
      {
        "worker": 1,
        "t": 1794297380519.195,
        "elu": 0.02918247590366376
      },
      {
        "worker": 0,
        "t": 1794297380536.4153,
        "elu": 0.03009206929735379
      },
      {
        "worker": 2,
        "t": 1794297380758.5098,
        "elu": 0.0269665273674352
      },
      {
        "worker": 1,
        "t": 1794297381021.2144,
        "elu": 0.03385063472742518
      },
      {
        "worker": 0,
        "t": 1794297381037.28,
        "elu": 0.03158696016124373
      },
      {
        "worker": 2,
        "t": 1794297381265.7126,
        "elu": 0.020412857859254792
      },
      {
        "worker": 1,
        "t": 1794297381521.812,
        "elu": 0.024012979149782756
      },
      {
        "worker": 0,
        "t": 1794297381542.0066,
        "elu": 0.01976276416561928
      },
      {
        "worker": 2,
        "t": 1794297381770.0774,
        "elu": 0.02917375885691968
      },
      {
        "worker": 1,
        "t": 1794297382022.0452,
        "elu": 0.020971624196121558
      },
      {
        "worker": 0,
        "t": 1794297382043.1094,
        "elu": 0.029580720305222907
      },
      {
        "worker": 2,
        "t": 1794297382271.1282,
        "elu": 0.035174795480729396
      },
      {
        "worker": 1,
        "t": 1794297382525.6033,
        "elu": 0.03689762166515192
      },
      {
        "worker": 0,
        "t": 1794297382547.111,
        "elu": 0.03280834582103083
      },
      {
        "worker": 2,
        "t": 1794297382773.2,
        "elu": 0.016823906564653247
      },
      {
        "worker": 1,
        "t": 1794297383026.3428,
        "elu": 0.035397922750326494
      },
      {
        "worker": 0,
        "t": 1794297383048.106,
        "elu": 0.035763669198405026
      },
      {
        "worker": 2,
        "t": 1794297383275.239,
        "elu": 0.026568667006888334
      },
      {
        "worker": 1,
        "t": 1794297383537.6467,
        "elu": 0.016511829727030924
      },
      {
        "worker": 0,
        "t": 1794297383549.9438,
        "elu": 0.023712392172598996
      },
      {
        "worker": 2,
        "t": 1794297383776.454,
        "elu": 0.02073430700669938
      },
      {
        "worker": 1,
        "t": 1794297384045.3396,
        "elu": 0.023245971983746998
      },
      {
        "worker": 0,
        "t": 1794297384050.8777,
        "elu": 0.022718141420001087
      },
      {
        "worker": 2,
        "t": 1794297384277.9834,
        "elu": 0.02107023122731278
      },
      {
        "worker": 0,
        "t": 1794297384552.0332,
        "elu": 0.02795426894850709
      },
      {
        "worker": 1,
        "t": 1794297384555.445,
        "elu": 0.02556637868173552
      },
      {
        "worker": 2,
        "t": 1794297384779.1597,
        "elu": 0.025427389051686695
      },
      {
        "worker": 0,
        "t": 1794297385054.1511,
        "elu": 0.01959811649631432
      },
      {
        "worker": 1,
        "t": 1794297385055.466,
        "elu": 0.018563168513699085
      },
      {
        "worker": 2,
        "t": 1794297385284.4946,
        "elu": 0.006855068960601502
      },
      {
        "worker": 0,
        "t": 1794297385557.442,
        "elu": 0.02552277083993324
      },
      {
        "worker": 1,
        "t": 1794297385559.831,
        "elu": 0.02029428239316155
      },
      {
        "worker": 2,
        "t": 1794297385787.006,
        "elu": 0.024050869425129046
      },
      {
        "worker": 0,
        "t": 1794297386057.933,
        "elu": 0.026097773446447512
      },
      {
        "worker": 1,
        "t": 1794297386063.2815,
        "elu": 0.020318689329874295
      },
      {
        "worker": 2,
        "t": 1794297386291.5525,
        "elu": 0.02288697770068133
      },
      {
        "worker": 0,
        "t": 1794297386561.6802,
        "elu": 0.027262382901825893
      },
      {
        "worker": 1,
        "t": 1794297386568.3933,
        "elu": 0.023869970998656877
      },
      {
        "worker": 2,
        "t": 1794297386792.99,
        "elu": 0.02544076698065071
      },
      {
        "worker": 0,
        "t": 1794297387061.4297,
        "elu": 0.038860726465994
      },
      {
        "worker": 1,
        "t": 1794297387071.3113,
        "elu": 0.029152555382499442
      },
      {
        "worker": 2,
        "t": 1794297387296.3357,
        "elu": 0.026884499706737015
      },
      {
        "worker": 0,
        "t": 1794297387563.2466,
        "elu": 0.02997409754922166
      },
      {
        "worker": 1,
        "t": 1794297387577.1624,
        "elu": 0.028169822073604012
      },
      {
        "worker": 2,
        "t": 1794297387796.9377,
        "elu": 0.019457890431822656
      },
      {
        "worker": 0,
        "t": 1794297388065.0713,
        "elu": 0.033241847344361204
      },
      {
        "worker": 1,
        "t": 1794297388079.303,
        "elu": 0.025370804270953406
      },
      {
        "worker": 2,
        "t": 1794297388298.969,
        "elu": 0.018867516825301963
      },
      {
        "worker": 0,
        "t": 1794297388566.9878,
        "elu": 0.022711494252096714
      },
      {
        "worker": 1,
        "t": 1794297388582.0417,
        "elu": 0.018671228435421072
      },
      {
        "worker": 2,
        "t": 1794297388802.2085,
        "elu": 0.023932925232476882
      },
      {
        "worker": 0,
        "t": 1794297389068.95,
        "elu": 0.030889780777129516
      },
      {
        "worker": 1,
        "t": 1794297389084.8545,
        "elu": 0.027803063003507673
      },
      {
        "worker": 2,
        "t": 1794297389303.8337,
        "elu": 0.02152819381431398
      },
      {
        "worker": 0,
        "t": 1794297389570.0234,
        "elu": 0.028066057234926698
      },
      {
        "worker": 1,
        "t": 1794297389585.146,
        "elu": 0.024464736411505775
      },
      {
        "worker": 2,
        "t": 1794297389803.9558,
        "elu": 0.02319552041317969
      },
      {
        "worker": 0,
        "t": 1794297390071.1597,
        "elu": 0.02228654318505868
      },
      {
        "worker": 1,
        "t": 1794297390089.162,
        "elu": 0.022314937383104784
      },
      {
        "worker": 2,
        "t": 1794297390304.5352,
        "elu": 0.011402711017679009
      },
      {
        "worker": 0,
        "t": 1794297390581.332,
        "elu": 0.011848404098086527
      },
      {
        "worker": 1,
        "t": 1794297390596.4731,
        "elu": 0.00928937722918831
      },
      {
        "worker": 2,
        "t": 1794297390812.0676,
        "elu": 0.00712295779085346
      },
      {
        "worker": 0,
        "t": 1794297391083.2532,
        "elu": 0.020289637464930167
      },
      {
        "worker": 1,
        "t": 1794297391096.5474,
        "elu": 0.021016860585845655
      },
      {
        "worker": 2,
        "t": 1794297391322.6516,
        "elu": 0.023938515328117842
      },
      {
        "worker": 0,
        "t": 1794297391589.039,
        "elu": 0.013387416724167694
      },
      {
        "worker": 1,
        "t": 1794297391596.528,
        "elu": 0.017463861238719576
      },
      {
        "worker": 2,
        "t": 1794297391825.4683,
        "elu": 0.024379616189707583
      },
      {
        "worker": 0,
        "t": 1794297392090.1987,
        "elu": 0.031600706649077444
      },
      {
        "worker": 1,
        "t": 1794297392096.2397,
        "elu": 0.030576406180962072
      },
      {
        "worker": 2,
        "t": 1794297392327.9187,
        "elu": 0.023912832013332035
      },
      {
        "worker": 0,
        "t": 1794297392591.3594,
        "elu": 0.024268456366697864
      },
      {
        "worker": 1,
        "t": 1794297392599.0762,
        "elu": 0.030147162558410573
      },
      {
        "worker": 2,
        "t": 1794297392831.6523,
        "elu": 0.029536523024764224
      },
      {
        "worker": 0,
        "t": 1794297393094.6138,
        "elu": 0.03701563659213135
      },
      {
        "worker": 1,
        "t": 1794297393099.8809,
        "elu": 0.025652789057920844
      },
      {
        "worker": 2,
        "t": 1794297393331.0242,
        "elu": 0.029116892926771415
      },
      {
        "worker": 0,
        "t": 1794297393595.0786,
        "elu": 0.01811161384593613
      },
      {
        "worker": 1,
        "t": 1794297393609.983,
        "elu": 0.018393294246470116
      },
      {
        "worker": 2,
        "t": 1794297393832.0188,
        "elu": 0.012855588005105856
      },
      {
        "worker": 0,
        "t": 1794297394096.2776,
        "elu": 0.026688685148076267
      },
      {
        "worker": 1,
        "t": 1794297394110.7222,
        "elu": 0.030931458907558846
      },
      {
        "worker": 2,
        "t": 1794297394343.1082,
        "elu": 0.020761054142498663
      },
      {
        "worker": 0,
        "t": 1794297394598.4778,
        "elu": 0.014218908468923923
      },
      {
        "worker": 1,
        "t": 1794297394612.4258,
        "elu": 0.015466696981449798
      },
      {
        "worker": 2,
        "t": 1794297394847.994,
        "elu": 0.02034302444028699
      },
      {
        "worker": 0,
        "t": 1794297395105.617,
        "elu": 0.02807817026846117
      },
      {
        "worker": 1,
        "t": 1794297395113.5557,
        "elu": 0.02778395658183631
      },
      {
        "worker": 2,
        "t": 1794297395350.0752,
        "elu": 0.016453840495849834
      },
      {
        "worker": 1,
        "t": 1794297395613.922,
        "elu": 0.012515076352199863
      },
      {
        "worker": 0,
        "t": 1794297395615.7063,
        "elu": 0.01658003631667093
      },
      {
        "worker": 2,
        "t": 1794297395852.4004,
        "elu": 0.012815058861137828
      },
      {
        "worker": 1,
        "t": 1794297396115.9934,
        "elu": 0.006884229800579391
      },
      {
        "worker": 0,
        "t": 1794297396121.8591,
        "elu": 0.006944216923810264
      },
      {
        "worker": 2,
        "t": 1794297396355.5342,
        "elu": 0.010976703324516529
      },
      {
        "worker": 1,
        "t": 1794297396619.0876,
        "elu": 0.025494016273849767
      },
      {
        "worker": 0,
        "t": 1794297396621.7305,
        "elu": 0.023687376077934426
      },
      {
        "worker": 2,
        "t": 1794297396861.0193,
        "elu": 0.027979209324651397
      },
      {
        "worker": 0,
        "t": 1794297397124.7449,
        "elu": 0.03426475341777343
      },
      {
        "worker": 1,
        "t": 1794297397121.0945,
        "elu": 0.026235164541479884
      },
      {
        "worker": 2,
        "t": 1794297397363.3406,
        "elu": 0.022479192964489483
      },
      {
        "worker": 1,
        "t": 1794297397622.1636,
        "elu": 0.025884013986169303
      },
      {
        "worker": 0,
        "t": 1794297397624.6445,
        "elu": 0.019960260457377397
      },
      {
        "worker": 2,
        "t": 1794297397871.3032,
        "elu": 0.018465279964999956
      },
      {
        "worker": 0,
        "t": 1794297398126.7278,
        "elu": 0.03287932483866895
      },
      {
        "worker": 1,
        "t": 1794297398126.6997,
        "elu": 0.02226592224043242
      },
      {
        "worker": 2,
        "t": 1794297398372.309,
        "elu": 0.02363845243822584
      },
      {
        "worker": 0,
        "t": 1794297398627.7764,
        "elu": 0.025504360080133518
      },
      {
        "worker": 1,
        "t": 1794297398628.3796,
        "elu": 0.022555721543515445
      },
      {
        "worker": 2,
        "t": 1794297398880.7102,
        "elu": 0.0243251012098488
      },
      {
        "worker": 0,
        "t": 1794297399130.6436,
        "elu": 0.02887061158996107
      },
      {
        "worker": 1,
        "t": 1794297399132.7334,
        "elu": 0.030364190332757383
      },
      {
        "worker": 2,
        "t": 1794297399388.2131,
        "elu": 0.028162748358277787
      },
      {
        "worker": 0,
        "t": 1794297399639.9817,
        "elu": 0.031682087782876685
      },
      {
        "worker": 1,
        "t": 1794297399640.5962,
        "elu": 0.020053397525207517
      },
      {
        "worker": 2,
        "t": 1794297399888.7678,
        "elu": 0.022804934552164455
      },
      {
        "worker": 1,
        "t": 1794297400140.2847,
        "elu": 0.03041852873937295
      },
      {
        "worker": 0,
        "t": 1794297400140.5483,
        "elu": 0.02636096004476667
      },
      {
        "worker": 2,
        "t": 1794297400390.2944,
        "elu": 0.013131929638134606
      },
      {
        "worker": 0,
        "t": 1794297400645.057,
        "elu": 0.027293455325099997
      },
      {
        "worker": 1,
        "t": 1794297400648.5256,
        "elu": 0.021954597960493472
      },
      {
        "worker": 2,
        "t": 1794297400890.158,
        "elu": 0.030267008519406922
      },
      {
        "worker": 0,
        "t": 1794297401146.7546,
        "elu": 0.012818550142841681
      },
      {
        "worker": 1,
        "t": 1794297401148.9329,
        "elu": 0.012082444928354677
      },
      {
        "worker": 2,
        "t": 1794297401398.6394,
        "elu": 0.00620929854809083
      },
      {
        "worker": 0,
        "t": 1794297401654.108,
        "elu": 0.007926439476794039
      },
      {
        "worker": 1,
        "t": 1794297401656.2136,
        "elu": 0.010268572749981086
      },
      {
        "worker": 2,
        "t": 1794297401902.5376,
        "elu": 0.02222124071588028
      },
      {
        "worker": 0,
        "t": 1794297402155.6958,
        "elu": 0.0314694529314818
      },
      {
        "worker": 1,
        "t": 1794297402156.9705,
        "elu": 0.025466633947439483
      },
      {
        "worker": 2,
        "t": 1794297402407.8076,
        "elu": 0.013860612565226615
      },
      {
        "worker": 0,
        "t": 1794297402657.1152,
        "elu": 0.02037492030789297
      },
      {
        "worker": 1,
        "t": 1794297402657.9192,
        "elu": 0.025101999214062434
      },
      {
        "worker": 2,
        "t": 1794297402915.3035,
        "elu": 0.025860722536597668
      },
      {
        "worker": 0,
        "t": 1794297403158.9807,
        "elu": 0.03467304755541041
      },
      {
        "worker": 1,
        "t": 1794297403159.6594,
        "elu": 0.023101112486783267
      },
      {
        "worker": 2,
        "t": 1794297403417.4788,
        "elu": 0.020397250362252334
      },
      {
        "worker": 0,
        "t": 1794297403661.9956,
        "elu": 0.008841222333364441
      },
      {
        "worker": 1,
        "t": 1794297403662.0251,
        "elu": 0.009538767585912492
      },
      {
        "worker": 2,
        "t": 1794297403923.957,
        "elu": 0.01768278998448254
      },
      {
        "worker": 1,
        "t": 1794297404163.3877,
        "elu": 0.029853589164100476
      },
      {
        "worker": 0,
        "t": 1794297404163.5696,
        "elu": 0.027844386222357187
      },
      {
        "worker": 2,
        "t": 1794297404429.6545,
        "elu": 0.016620600916144264
      },
      {
        "worker": 0,
        "t": 1794297404664.0356,
        "elu": 0.014057895040501119
      },
      {
        "worker": 1,
        "t": 1794297404668.1443,
        "elu": 0.010082928098396587
      },
      {
        "worker": 2,
        "t": 1794297404930.579,
        "elu": 0.01450664445428707
      },
      {
        "worker": 0,
        "t": 1794297405164.5955,
        "elu": 0.0273496692797343
      },
      {
        "worker": 1,
        "t": 1794297405169.8408,
        "elu": 0.03824257604279021
      },
      {
        "worker": 2,
        "t": 1794297405433.4783,
        "elu": 0.020244806336254403
      },
      {
        "worker": 0,
        "t": 1794297405672.1418,
        "elu": 0.026127278384799155
      },
      {
        "worker": 1,
        "t": 1794297405676.6255,
        "elu": 0.028726824226499196
      },
      {
        "worker": 2,
        "t": 1794297405934.979,
        "elu": 0.03651725063919392
      },
      {
        "worker": 0,
        "t": 1794297406175.0479,
        "elu": 0.03306631044517347
      },
      {
        "worker": 1,
        "t": 1794297406178.7878,
        "elu": 0.019801513217994185
      },
      {
        "worker": 2,
        "t": 1794297406445.08,
        "elu": 0.012183212969562693
      },
      {
        "worker": 0,
        "t": 1794297406677.486,
        "elu": 0.008467544615022237
      },
      {
        "worker": 1,
        "t": 1794297406679.1477,
        "elu": 0.012218955198676107
      },
      {
        "worker": 2,
        "t": 1794297406948.7163,
        "elu": 0.01721840373294826
      },
      {
        "worker": 0,
        "t": 1794297407178.692,
        "elu": 0.0330225986878855
      },
      {
        "worker": 1,
        "t": 1794297407182.2485,
        "elu": 0.020731320513812206
      },
      {
        "worker": 2,
        "t": 1794297407452.2563,
        "elu": 0.015269949347670616
      },
      {
        "worker": 0,
        "t": 1794297407688.4062,
        "elu": 0.018226311387313364
      },
      {
        "worker": 1,
        "t": 1794297407692.2786,
        "elu": 0.01805991561660669
      },
      {
        "worker": 2,
        "t": 1794297407952.9316,
        "elu": 0.01787453054459233
      },
      {
        "worker": 0,
        "t": 1794297408190.0366,
        "elu": 0.018391151495186314
      },
      {
        "worker": 1,
        "t": 1794297408199.0447,
        "elu": 0.01949716544383119
      },
      {
        "worker": 2,
        "t": 1794297408453.4517,
        "elu": 0.021418960873893823
      },
      {
        "worker": 0,
        "t": 1794297408692.5212,
        "elu": 0.04028212709400972
      },
      {
        "worker": 1,
        "t": 1794297408702.8577,
        "elu": 0.018926870084489327
      },
      {
        "worker": 2,
        "t": 1794297408955.4727,
        "elu": 0.025333174892180437
      },
      {
        "worker": 0,
        "t": 1794297409194.2837,
        "elu": 0.03413422069885612
      },
      {
        "worker": 1,
        "t": 1794297409203.7825,
        "elu": 0.03621615224778747
      },
      {
        "worker": 2,
        "t": 1794297409461.5232,
        "elu": 0.026143201702838497
      },
      {
        "worker": 0,
        "t": 1794297409697.642,
        "elu": 0.04218226567668068
      },
      {
        "worker": 1,
        "t": 1794297409705.8787,
        "elu": 0.02795720462330285
      },
      {
        "worker": 2,
        "t": 1794297409965.5935,
        "elu": 0.02528161959990349
      },
      {
        "worker": 0,
        "t": 1794297410198.037,
        "elu": 0.019290281496010673
      },
      {
        "worker": 1,
        "t": 1794297410210.5952,
        "elu": 0.024188184254284137
      },
      {
        "worker": 2,
        "t": 1794297410468.038,
        "elu": 0.015431867757087991
      },
      {
        "worker": 0,
        "t": 1794297410701.6497,
        "elu": 0.02115719304530812
      },
      {
        "worker": 1,
        "t": 1794297410716.0676,
        "elu": 0.020274958473360062
      },
      {
        "worker": 2,
        "t": 1794297410969.6936,
        "elu": 0.025198493205309425
      },
      {
        "worker": 0,
        "t": 1794297411205.7102,
        "elu": 0.03003963688043033
      },
      {
        "worker": 1,
        "t": 1794297411217.633,
        "elu": 0.02164429721293858
      },
      {
        "worker": 2,
        "t": 1794297411476.1401,
        "elu": 0.014412225468139781
      },
      {
        "worker": 0,
        "t": 1794297411706.8633,
        "elu": 0.02225353105514494
      },
      {
        "worker": 1,
        "t": 1794297411726.2886,
        "elu": 0.026616551810555396
      },
      {
        "worker": 2,
        "t": 1794297411982.5496,
        "elu": 0.015793438518975675
      },
      {
        "worker": 0,
        "t": 1794297412216.8596,
        "elu": 0.008818190766111214
      },
      {
        "worker": 1,
        "t": 1794297412230.4167,
        "elu": 0.005383673518069518
      },
      {
        "worker": 2,
        "t": 1794297412488.2844,
        "elu": 0.014090177285935413
      },
      {
        "worker": 0,
        "t": 1794297412720.557,
        "elu": 0.024119553925336587
      },
      {
        "worker": 1,
        "t": 1794297412732.145,
        "elu": 0.022157671187807593
      },
      {
        "worker": 2,
        "t": 1794297412989.3774,
        "elu": 0.020490687734421573
      },
      {
        "worker": 0,
        "t": 1794297413230.3887,
        "elu": 0.03298372451997766
      },
      {
        "worker": 1,
        "t": 1794297413233.2395,
        "elu": 0.030481076032171296
      },
      {
        "worker": 2,
        "t": 1794297413489.9563,
        "elu": 0.024722385086507495
      },
      {
        "worker": 0,
        "t": 1794297413731.7354,
        "elu": 0.02949984020503246
      },
      {
        "worker": 1,
        "t": 1794297413740.7195,
        "elu": 0.021670724338054084
      },
      {
        "worker": 2,
        "t": 1794297414000.268,
        "elu": 0.021866687893188633
      },
      {
        "worker": 0,
        "t": 1794297414231.8772,
        "elu": 0.02259976022540814
      },
      {
        "worker": 1,
        "t": 1794297414241.7014,
        "elu": 0.029676620414134047
      },
      {
        "worker": 2,
        "t": 1794297414505.263,
        "elu": 0.02431230044791916
      },
      {
        "worker": 0,
        "t": 1794297414739.04,
        "elu": 0.029357985284082788
      },
      {
        "worker": 1,
        "t": 1794297414749.9668,
        "elu": 0.016351317206858604
      },
      {
        "worker": 2,
        "t": 1794297415015.7842,
        "elu": 0.017940451254592725
      },
      {
        "worker": 0,
        "t": 1794297415242.3198,
        "elu": 0.02704660592956831
      },
      {
        "worker": 1,
        "t": 1794297415253.1492,
        "elu": 0.0351628691122434
      },
      {
        "worker": 2,
        "t": 1794297415515.5466,
        "elu": 0.012817456069830525
      },
      {
        "worker": 0,
        "t": 1794297415743.9868,
        "elu": 0.01683421548944103
      },
      {
        "worker": 1,
        "t": 1794297415756.3213,
        "elu": 0.015949362103892924
      },
      {
        "worker": 2,
        "t": 1794297416023.7913,
        "elu": 0.02457913089849323
      },
      {
        "worker": 0,
        "t": 1794297416247.7947,
        "elu": 0.029665936952160965
      },
      {
        "worker": 1,
        "t": 1794297416256.4038,
        "elu": 0.025261572430269535
      },
      {
        "worker": 2,
        "t": 1794297416529.8445,
        "elu": 0.018966604294124518
      },
      {
        "worker": 0,
        "t": 1794297416752.7217,
        "elu": 0.015080210645063758
      },
      {
        "worker": 1,
        "t": 1794297416760.1914,
        "elu": 0.011641555614639058
      },
      {
        "worker": 2,
        "t": 1794297417037.755,
        "elu": 0.019793766400306424
      },
      {
        "worker": 1,
        "t": 1794297417262.299,
        "elu": 0.014693870643951517
      },
      {
        "worker": 0,
        "t": 1794297417262.4949,
        "elu": 0.018624208316110162
      },
      {
        "worker": 2,
        "t": 1794297417538.376,
        "elu": 0.007106179477696178
      },
      {
        "worker": 0,
        "t": 1794297417762.485,
        "elu": 0.015272003636397137
      },
      {
        "worker": 1,
        "t": 1794297417762.7683,
        "elu": 0.017648209551877462
      },
      {
        "worker": 2,
        "t": 1794297418049.35,
        "elu": 0.01933260313710613
      },
      {
        "worker": 0,
        "t": 1794297418265.0083,
        "elu": 0.02434807716204303
      },
      {
        "worker": 1,
        "t": 1794297418266.226,
        "elu": 0.018399879301611213
      },
      {
        "worker": 2,
        "t": 1794297418549.7817,
        "elu": 0.018829256290713275
      },
      {
        "worker": 0,
        "t": 1794297418772.487,
        "elu": 0.020386536895692538
      },
      {
        "worker": 1,
        "t": 1794297418772.5286,
        "elu": 0.014302190969268425
      },
      {
        "worker": 2,
        "t": 1794297419057.5974,
        "elu": 0.021402445287662754
      },
      {
        "worker": 1,
        "t": 1794297419275.8271,
        "elu": 0.02931304069227323
      },
      {
        "worker": 0,
        "t": 1794297419275.9976,
        "elu": 0.02452471056425165
      },
      {
        "worker": 2,
        "t": 1794297419565.9182,
        "elu": 0.025520652777857235
      },
      {
        "worker": 1,
        "t": 1794297419779.6873,
        "elu": 0.022778699081621168
      },
      {
        "worker": 0,
        "t": 1794297419780.4128,
        "elu": 0.03165848914889691
      },
      {
        "worker": 2,
        "t": 1794297420067.5273,
        "elu": 0.022386587278884516
      },
      {
        "worker": 1,
        "t": 1794297420280.718,
        "elu": 0.03150715188090219
      },
      {
        "worker": 0,
        "t": 1794297420281.3818,
        "elu": 0.02271038660565042
      },
      {
        "worker": 2,
        "t": 1794297420570.112,
        "elu": 0.016832532382278494
      },
      {
        "worker": 0,
        "t": 1794297420784.2114,
        "elu": 0.013311144298773128
      },
      {
        "worker": 1,
        "t": 1794297420783.7974,
        "elu": 0.011254239546983893
      },
      {
        "worker": 2,
        "t": 1794297421074.5884,
        "elu": 0.02422114845760323
      },
      {
        "worker": 0,
        "t": 1794297421284.899,
        "elu": 0.0302489915253512
      },
      {
        "worker": 1,
        "t": 1794297421284.8982,
        "elu": 0.02192558701770778
      },
      {
        "worker": 2,
        "t": 1794297421579.191,
        "elu": 0.013962160529039229
      },
      {
        "worker": 1,
        "t": 1794297421790.0867,
        "elu": 0.022563346191461622
      },
      {
        "worker": 0,
        "t": 1794297421790.4976,
        "elu": 0.015970016744130882
      },
      {
        "worker": 2,
        "t": 1794297422079.9631,
        "elu": 0.023287494500463624
      },
      {
        "worker": 1,
        "t": 1794297422291.3384,
        "elu": 0.02920850940361297
      },
      {
        "worker": 0,
        "t": 1794297422291.5762,
        "elu": 0.04885190545031127
      },
      {
        "worker": 2,
        "t": 1794297422580.1223,
        "elu": 0.030309259386472904
      },
      {
        "worker": 1,
        "t": 1794297422795.782,
        "elu": 0.006367058442838785
      },
      {
        "worker": 0,
        "t": 1794297422801.6582,
        "elu": 0.006915605138485947
      },
      {
        "worker": 2,
        "t": 1794297423086.2048,
        "elu": 0.012869329807455213
      },
      {
        "worker": 1,
        "t": 1794297423297.0393,
        "elu": 0.028872225406529013
      },
      {
        "worker": 0,
        "t": 1794297423303.8655,
        "elu": 0.023723228677764403
      },
      {
        "worker": 2,
        "t": 1794297423586.609,
        "elu": 0.02308300925728935
      },
      {
        "worker": 1,
        "t": 1794297423798.997,
        "elu": 0.011077458230860605
      },
      {
        "worker": 0,
        "t": 1794297423811.0342,
        "elu": 0.02037005885760729
      },
      {
        "worker": 2,
        "t": 1794297424087.6057,
        "elu": 0.011351727704295355
      },
      {
        "worker": 1,
        "t": 1794297424303.9902,
        "elu": 0.03086445123989676
      },
      {
        "worker": 0,
        "t": 1794297424311.8394,
        "elu": 0.02362696690912149
      },
      {
        "worker": 2,
        "t": 1794297424594.3547,
        "elu": 0.01913614994363349
      },
      {
        "worker": 0,
        "t": 1794297424818.1174,
        "elu": 0.02483723310293438
      },
      {
        "worker": 1,
        "t": 1794297424813.6758,
        "elu": 0.017501202668111678
      },
      {
        "worker": 2,
        "t": 1794297425102.1887,
        "elu": 0.02660870807393954
      },
      {
        "worker": 1,
        "t": 1794297425317.3909,
        "elu": 0.024468803916333267
      },
      {
        "worker": 0,
        "t": 1794297425326.0596,
        "elu": 0.02888725526034063
      },
      {
        "worker": 2,
        "t": 1794297425603.9321,
        "elu": 0.016264211605931417
      },
      {
        "worker": 1,
        "t": 1794297425827.2065,
        "elu": 0.020501786432246222
      },
      {
        "worker": 0,
        "t": 1794297425828.2163,
        "elu": 0.013284053094476346
      },
      {
        "worker": 2,
        "t": 1794297426105.5938,
        "elu": 0.020295106757597672
      },
      {
        "worker": 1,
        "t": 1794297426328.1602,
        "elu": 0.025862171745359337
      },
      {
        "worker": 0,
        "t": 1794297426329.168,
        "elu": 0.04258040514950106
      },
      {
        "worker": 2,
        "t": 1794297426607.4846,
        "elu": 0.014778403042069546
      },
      {
        "worker": 1,
        "t": 1794297426830.3716,
        "elu": 0.026953657989603357
      },
      {
        "worker": 0,
        "t": 1794297426831.8267,
        "elu": 0.025362867057228053
      },
      {
        "worker": 2,
        "t": 1794297427113.308,
        "elu": 0.02394758844051903
      },
      {
        "worker": 0,
        "t": 1794297427331.7988,
        "elu": 0.023750892746087486
      },
      {
        "worker": 1,
        "t": 1794297427330.5378,
        "elu": 0.02327050465630724
      },
      {
        "worker": 2,
        "t": 1794297427623.9666,
        "elu": 0.026293290028612786
      },
      {
        "worker": 0,
        "t": 1794297427832.6255,
        "elu": 0.026785281660468854
      },
      {
        "worker": 1,
        "t": 1794297427832.6265,
        "elu": 0.01838689748486603
      },
      {
        "worker": 2,
        "t": 1794297428133.6448,
        "elu": 0.00981228713060293
      },
      {
        "worker": 0,
        "t": 1794297428333.27,
        "elu": 0.007093660337763831
      },
      {
        "worker": 1,
        "t": 1794297428335.7065,
        "elu": 0.008345568423183396
      },
      {
        "worker": 2,
        "t": 1794297428644.0264,
        "elu": 0.011898337488368958
      },
      {
        "worker": 0,
        "t": 1794297428843.2905,
        "elu": 0.0162100529890881
      },
      {
        "worker": 1,
        "t": 1794297428843.289,
        "elu": 0.014544849807589924
      },
      {
        "worker": 2,
        "t": 1794297429145.4973,
        "elu": 0.027060867183088425
      },
      {
        "worker": 0,
        "t": 1794297429349.8713,
        "elu": 0.03294372539827852
      },
      {
        "worker": 1,
        "t": 1794297429352.3032,
        "elu": 0.04407300882530793
      },
      {
        "worker": 2,
        "t": 1794297429652.7163,
        "elu": 0.015784575010710348
      },
      {
        "worker": 0,
        "t": 1794297429850.0527,
        "elu": 0.01727796018951012
      },
      {
        "worker": 1,
        "t": 1794297429854.1401,
        "elu": 0.016134004273360793
      },
      {
        "worker": 2,
        "t": 1794297430162.8623,
        "elu": 0.023678218123921402
      },
      {
        "worker": 0,
        "t": 1794297430357.837,
        "elu": 0.03004837185461656
      },
      {
        "worker": 1,
        "t": 1794297430357.727,
        "elu": 0.023307947287675396
      },
      {
        "worker": 2,
        "t": 1794297430671.2114,
        "elu": 0.024928862609068483
      },
      {
        "worker": 0,
        "t": 1794297430859.307,
        "elu": 0.027435844205456094
      },
      {
        "worker": 1,
        "t": 1794297430861.6929,
        "elu": 0.022870720944868608
      },
      {
        "worker": 2,
        "t": 1794297431176.745,
        "elu": 0.027161093621208405
      },
      {
        "worker": 0,
        "t": 1794297431360.6382,
        "elu": 0.03326753827102096
      },
      {
        "worker": 1,
        "t": 1794297431362.638,
        "elu": 0.027379673322220462
      },
      {
        "worker": 2,
        "t": 1794297431676.498,
        "elu": 0.020588700970097098
      },
      {
        "worker": 0,
        "t": 1794297431862.1782,
        "elu": 0.01879243126619527
      },
      {
        "worker": 1,
        "t": 1794297431864.6377,
        "elu": 0.02521380893220405
      },
      {
        "worker": 2,
        "t": 1794297432180.7188,
        "elu": 0.01869142937166644
      },
      {
        "worker": 1,
        "t": 1794297432364.53,
        "elu": 0.02512760221894902
      },
      {
        "worker": 0,
        "t": 1794297432370.8755,
        "elu": 0.027212624979256247
      },
      {
        "worker": 2,
        "t": 1794297432681.2395,
        "elu": 0.021292784500291418
      },
      {
        "worker": 1,
        "t": 1794297432875.0046,
        "elu": 0.018134917452299063
      },
      {
        "worker": 0,
        "t": 1794297432878.5369,
        "elu": 0.020653070623663464
      },
      {
        "worker": 2,
        "t": 1794297433191.778,
        "elu": 0.02548562595135039
      },
      {
        "worker": 1,
        "t": 1794297433377.15,
        "elu": 0.01654972295747873
      },
      {
        "worker": 0,
        "t": 1794297433378.7861,
        "elu": 0.01608786004962127
      },
      {
        "worker": 2,
        "t": 1794297433699.1667,
        "elu": 0.008098900825505755
      },
      {
        "worker": 0,
        "t": 1794297433884.1946,
        "elu": 0.010098319983618164
      },
      {
        "worker": 1,
        "t": 1794297433884.2385,
        "elu": 0.007427034126548464
      },
      {
        "worker": 2,
        "t": 1794297434199.7878,
        "elu": 0.01114402557117478
      },
      {
        "worker": 1,
        "t": 1794297434385.0786,
        "elu": 0.029804436236493204
      },
      {
        "worker": 0,
        "t": 1794297434385.2117,
        "elu": 0.019721560052453638
      },
      {
        "worker": 2,
        "t": 1794297434704.1492,
        "elu": 0.018630422326224107
      },
      {
        "worker": 0,
        "t": 1794297434889.6865,
        "elu": 0.022274119204783654
      },
      {
        "worker": 1,
        "t": 1794297434892.339,
        "elu": 0.02256994424669205
      },
      {
        "worker": 2,
        "t": 1794297435211.7751,
        "elu": 0.021814516549777056
      },
      {
        "worker": 0,
        "t": 1794297435391.321,
        "elu": 0.027076557987084755
      },
      {
        "worker": 1,
        "t": 1794297435395.2253,
        "elu": 0.023606816490569386
      },
      {
        "worker": 2,
        "t": 1794297435713.6633,
        "elu": 0.017160968967174152
      },
      {
        "worker": 0,
        "t": 1794297435896.593,
        "elu": 0.019236189052218015
      },
      {
        "worker": 1,
        "t": 1794297435900.188,
        "elu": 0.015431777910202478
      },
      {
        "worker": 2,
        "t": 1794297436213.4065,
        "elu": 0.027429744037479737
      },
      {
        "worker": 0,
        "t": 1794297436399.1006,
        "elu": 0.033508955651798976
      },
      {
        "worker": 1,
        "t": 1794297436400.8706,
        "elu": 0.019057795014759432
      },
      {
        "worker": 2,
        "t": 1794297436720.0205,
        "elu": 0.014690567752471271
      },
      {
        "worker": 0,
        "t": 1794297436903.2927,
        "elu": 0.024158006757092333
      },
      {
        "worker": 1,
        "t": 1794297436905.396,
        "elu": 0.027707192124304544
      },
      {
        "worker": 2,
        "t": 1794297437227.0269,
        "elu": 0.02472999544831604
      },
      {
        "worker": 0,
        "t": 1794297437405.5793,
        "elu": 0.032644426490013874
      },
      {
        "worker": 1,
        "t": 1794297437405.6091,
        "elu": 0.025914978220195985
      },
      {
        "worker": 2,
        "t": 1794297437736.1086,
        "elu": 0.020385953185382888
      },
      {
        "worker": 0,
        "t": 1794297437905.2002,
        "elu": 0.023854103967124077
      },
      {
        "worker": 1,
        "t": 1794297437907.3684,
        "elu": 0.023632487791469543
      },
      {
        "worker": 2,
        "t": 1794297438237.2766,
        "elu": 0.016636599143126398
      },
      {
        "worker": 0,
        "t": 1794297438412.3328,
        "elu": 0.012690700468286008
      },
      {
        "worker": 1,
        "t": 1794297438416.352,
        "elu": 0.01398058910553859
      },
      {
        "worker": 2,
        "t": 1794297438738.17,
        "elu": 0.013155302422090698
      },
      {
        "worker": 0,
        "t": 1794297438918.839,
        "elu": 0.009968750901370473
      },
      {
        "worker": 1,
        "t": 1794297438920.0022,
        "elu": 0.00719382944855021
      },
      {
        "worker": 2,
        "t": 1794297439248.3474,
        "elu": 0.009924253665102346
      },
      {
        "worker": 1,
        "t": 1794297439422.3496,
        "elu": 0.022517569426339798
      },
      {
        "worker": 0,
        "t": 1794297439423.1396,
        "elu": 0.013793148237785926
      },
      {
        "worker": 2,
        "t": 1794297439754.1648,
        "elu": 0.014286666128058512
      },
      {
        "worker": 0,
        "t": 1794297439926.9226,
        "elu": 0.017913811394944447
      },
      {
        "worker": 1,
        "t": 1794297439926.8296,
        "elu": 0.02171235640326189
      },
      {
        "worker": 2,
        "t": 1794297440260.078,
        "elu": 0.024673697016174598
      },
      {
        "worker": 1,
        "t": 1794297440431.6646,
        "elu": 0.024189995339664972
      },
      {
        "worker": 0,
        "t": 1794297440431.8613,
        "elu": 0.031174341762001612
      },
      {
        "worker": 2,
        "t": 1794297440765.628,
        "elu": 0.020928566361198657
      },
      {
        "worker": 0,
        "t": 1794297440931.4412,
        "elu": 0.020511299004669685
      },
      {
        "worker": 1,
        "t": 1794297440932.5762,
        "elu": 0.01610615427680925
      },
      {
        "worker": 2,
        "t": 1794297441267.849,
        "elu": 0.030820752708709768
      },
      {
        "worker": 1,
        "t": 1794297441433.5469,
        "elu": 0.02008005540172271
      },
      {
        "worker": 0,
        "t": 1794297441433.7869,
        "elu": 0.02896670872551706
      },
      {
        "worker": 2,
        "t": 1794297441767.9585,
        "elu": 0.015652482942148892
      },
      {
        "worker": 1,
        "t": 1794297441936.762,
        "elu": 0.031196323839683425
      },
      {
        "worker": 0,
        "t": 1794297441943.685,
        "elu": 0.024717922760260767
      },
      {
        "worker": 2,
        "t": 1794297442269.1362,
        "elu": 0.025776846769151315
      },
      {
        "worker": 1,
        "t": 1794297442436.726,
        "elu": 0.026425877664948725
      },
      {
        "worker": 0,
        "t": 1794297442443.9514,
        "elu": 0.033625636106397974
      },
      {
        "worker": 2,
        "t": 1794297442776.4734,
        "elu": 0.022130689963816418
      },
      {
        "worker": 1,
        "t": 1794297442936.5464,
        "elu": 0.019004927388107714
      },
      {
        "worker": 0,
        "t": 1794297442944.6487,
        "elu": 0.023315545909525413
      },
      {
        "worker": 2,
        "t": 1794297443279.648,
        "elu": 0.023678273897464505
      },
      {
        "worker": 1,
        "t": 1794297443437.526,
        "elu": 0.023623668322016463
      },
      {
        "worker": 0,
        "t": 1794297443444.596,
        "elu": 0.028634821804850143
      },
      {
        "worker": 2,
        "t": 1794297443786.0337,
        "elu": 0.019940945240194154
      },
      {
        "worker": 1,
        "t": 1794297443938.9893,
        "elu": 0.01809370042495198
      },
      {
        "worker": 0,
        "t": 1794297443946.671,
        "elu": 0.022916827884768984
      },
      {
        "worker": 2,
        "t": 1794297444287.1052,
        "elu": 0.010316591404381518
      },
      {
        "worker": 1,
        "t": 1794297444445.424,
        "elu": 0.011061597813189446
      },
      {
        "worker": 0,
        "t": 1794297444446.8113,
        "elu": 0.0064968459358295495
      },
      {
        "worker": 2,
        "t": 1794297444789.7642,
        "elu": 0.013325528870411588
      },
      {
        "worker": 0,
        "t": 1794297444951.1562,
        "elu": 0.019451882971750455
      },
      {
        "worker": 1,
        "t": 1794297444946.014,
        "elu": 0.017165934156116273
      },
      {
        "worker": 2,
        "t": 1794297445299.0269,
        "elu": 0.02527609072972
      },
      {
        "worker": 1,
        "t": 1794297445448.5027,
        "elu": 0.0246355811063392
      },
      {
        "worker": 0,
        "t": 1794297445452.2075,
        "elu": 0.03082698050813126
      },
      {
        "worker": 2,
        "t": 1794297445804.4673,
        "elu": 0.011925046331470728
      },
      {
        "worker": 1,
        "t": 1794297445951.011,
        "elu": 0.020599888098442952
      },
      {
        "worker": 0,
        "t": 1794297445952.695,
        "elu": 0.022983080703264342
      },
      {
        "worker": 2,
        "t": 1794297446314.0295,
        "elu": 0.03269274428789495
      },
      {
        "worker": 1,
        "t": 1794297446452.6494,
        "elu": 0.025064466696972838
      },
      {
        "worker": 0,
        "t": 1794297446453.086,
        "elu": 0.03712578045623856
      },
      {
        "worker": 2,
        "t": 1794297446824.4053,
        "elu": 0.02118860338671322
      },
      {
        "worker": 0,
        "t": 1794297446961.6353,
        "elu": 0.021204419910314146
      },
      {
        "worker": 1,
        "t": 1794297446961.6077,
        "elu": 0.0246355816486911
      },
      {
        "worker": 2,
        "t": 1794297447335.0215,
        "elu": 0.02053931319152271
      },
      {
        "worker": 1,
        "t": 1794297447461.3147,
        "elu": 0.02277581649375549
      },
      {
        "worker": 0,
        "t": 1794297447464.06,
        "elu": 0.022863236421269716
      },
      {
        "worker": 2,
        "t": 1794297447844.5632,
        "elu": 0.015367985586238066
      },
      {
        "worker": 1,
        "t": 1794297447963.0925,
        "elu": 0.019170385828417392
      },
      {
        "worker": 0,
        "t": 1794297447973.3958,
        "elu": 0.022034423406874455
      },
      {
        "worker": 2,
        "t": 1794297448347.5693,
        "elu": 0.025303831570040142
      },
      {
        "worker": 1,
        "t": 1794297448463.7512,
        "elu": 0.02624235046377363
      },
      {
        "worker": 0,
        "t": 1794297448473.235,
        "elu": 0.03203575223443925
      },
      {
        "worker": 2,
        "t": 1794297448857.8376,
        "elu": 0.017168481669090484
      },
      {
        "worker": 0,
        "t": 1794297448977.6797,
        "elu": 0.02697634989395625
      },
      {
        "worker": 1,
        "t": 1794297448967.6794,
        "elu": 0.014338110153377673
      },
      {
        "worker": 2,
        "t": 1794297449367.8237,
        "elu": 0.018599680120549775
      },
      {
        "worker": 1,
        "t": 1794297449468.5955,
        "elu": 0.02091647844399117
      },
      {
        "worker": 0,
        "t": 1794297449480.7864,
        "elu": 0.017182519244650928
      },
      {
        "worker": 2,
        "t": 1794297449871.0261,
        "elu": 0.007757512186796937
      },
      {
        "worker": 1,
        "t": 1794297449970.8022,
        "elu": 0.010584872631090491
      },
      {
        "worker": 0,
        "t": 1794297449983.3848,
        "elu": 0.013650360511127205
      },
      {
        "worker": 2,
        "t": 1794297450377.4993,
        "elu": 0.02203528428255297
      },
      {
        "worker": 1,
        "t": 1794297450470.8755,
        "elu": 0.026476808764408756
      },
      {
        "worker": 0,
        "t": 1794297450483.2983,
        "elu": 0.03198079018852129
      },
      {
        "worker": 2,
        "t": 1794297450878.4448,
        "elu": 0.017886247035045603
      },
      {
        "worker": 1,
        "t": 1794297450971.176,
        "elu": 0.014285102127816212
      },
      {
        "worker": 0,
        "t": 1794297450985.0027,
        "elu": 0.02298047028379892
      },
      {
        "worker": 2,
        "t": 1794297451380.0618,
        "elu": 0.02615675052174329
      },
      {
        "worker": 1,
        "t": 1794297451473.025,
        "elu": 0.024838268412478923
      },
      {
        "worker": 0,
        "t": 1794297451488.0708,
        "elu": 0.03475883137290748
      },
      {
        "worker": 2,
        "t": 1794297451882.534,
        "elu": 0.020556996651785477
      },
      {
        "worker": 1,
        "t": 1794297451979.9946,
        "elu": 0.029458484184480625
      },
      {
        "worker": 0,
        "t": 1794297451997.0408,
        "elu": 0.020361684958343774
      },
      {
        "worker": 2,
        "t": 1794297452390.1199,
        "elu": 0.01605485165408486
      },
      {
        "worker": 1,
        "t": 1794297452485.0918,
        "elu": 0.01415276497694278
      },
      {
        "worker": 0,
        "t": 1794297452500.2395,
        "elu": 0.01567717342844506
      },
      {
        "worker": 2,
        "t": 1794297452898.1978,
        "elu": 0.01734369202276089
      },
      {
        "worker": 1,
        "t": 1794297452991.1694,
        "elu": 0.022584336222896337
      },
      {
        "worker": 0,
        "t": 1794297453004.2778,
        "elu": 0.024792018293087848
      },
      {
        "worker": 2,
        "t": 1794297453400.6047,
        "elu": 0.018979984821556547
      },
      {
        "worker": 1,
        "t": 1794297453494.7505,
        "elu": 0.02207713207224214
      },
      {
        "worker": 0,
        "t": 1794297453505.6494,
        "elu": 0.026975791486798652
      },
      {
        "worker": 2,
        "t": 1794297453906.5068,
        "elu": 0.021304368141533317
      },
      {
        "worker": 1,
        "t": 1794297454001.466,
        "elu": 0.018850875811888854
      },
      {
        "worker": 0,
        "t": 1794297454005.711,
        "elu": 0.027428146338094005
      },
      {
        "worker": 2,
        "t": 1794297454412.555,
        "elu": 0.022683838150230947
      },
      {
        "worker": 0,
        "t": 1794297454508.2715,
        "elu": 0.027268740096753917
      },
      {
        "worker": 1,
        "t": 1794297454509.0107,
        "elu": 0.03126043748720504
      },
      {
        "worker": 2,
        "t": 1794297454913.3018,
        "elu": 0.011130674473730399
      },
      {
        "worker": 0,
        "t": 1794297455012.995,
        "elu": 0.007114311601781581
      },
      {
        "worker": 1,
        "t": 1794297455013.0042,
        "elu": 0.006958409499181632
      },
      {
        "worker": 2,
        "t": 1794297455416.6304,
        "elu": 0.013954070908367809
      },
      {
        "worker": 0,
        "t": 1794297455513.6328,
        "elu": 0.02501501531898311
      },
      {
        "worker": 1,
        "t": 1794297455514.7593,
        "elu": 0.02098582430690502
      },
      {
        "worker": 2,
        "t": 1794297455920.0325,
        "elu": 0.016512035350835595
      },
      {
        "worker": 0,
        "t": 1794297456014.3337,
        "elu": 0.016670968327012096
      },
      {
        "worker": 1,
        "t": 1794297456019.1833,
        "elu": 0.013300755386716184
      },
      {
        "worker": 2,
        "t": 1794297456431.1433,
        "elu": 0.028861060057710015
      },
      {
        "worker": 0,
        "t": 1794297456520.5518,
        "elu": 0.040893557011592786
      },
      {
        "worker": 1,
        "t": 1794297456527.395,
        "elu": 0.026724064350713672
      },
      {
        "worker": 2,
        "t": 1794297456939.5664,
        "elu": 0.019447069208861693
      },
      {
        "worker": 0,
        "t": 1794297457023.574,
        "elu": 0.017851120154365276
      },
      {
        "worker": 1,
        "t": 1794297457039.0156,
        "elu": 0.021182759990611824
      },
      {
        "worker": 2,
        "t": 1794297457440.8496,
        "elu": 0.020115270335620668
      },
      {
        "worker": 0,
        "t": 1794297457527.225,
        "elu": 0.028535049470072543
      },
      {
        "worker": 1,
        "t": 1794297457546.1077,
        "elu": 0.026500910504549374
      },
      {
        "worker": 2,
        "t": 1794297457943.0469,
        "elu": 0.01920990491469184
      },
      {
        "worker": 0,
        "t": 1794297458031.0886,
        "elu": 0.02289901837816945
      },
      {
        "worker": 1,
        "t": 1794297458048.5557,
        "elu": 0.019020672561998152
      },
      {
        "worker": 2,
        "t": 1794297458451.5598,
        "elu": 0.019023236545573488
      },
      {
        "worker": 0,
        "t": 1794297458532.3752,
        "elu": 0.027143627080466134
      },
      {
        "worker": 1,
        "t": 1794297458549.7844,
        "elu": 0.02413798685788867
      }
    ]
  },
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

Additional validity limits: smoke profile; no matched zero-reader run; any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

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
