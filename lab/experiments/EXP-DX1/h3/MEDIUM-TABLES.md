# tx2-dxh3-m5: ERROR

Diagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.

## Every bar

| Priority | Bar | Observed | Required | Driver verdict | Miss amount | Qualification |
|---|---|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | 49 | = 0 | MISS | 49.000 from threshold |  |
| P1 | NS-P1-GOODPUT-256-VS-64 | 0.14409615608471277 | >= 1.0 | MISS | 0.856 below threshold |  |
| P1 | NS-P1-READ-P99-256-MS | 3915.775 | <= 100 | MISS | 3815.775 above threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-256 | 923.3465931232951 | <= 1.25 | MISS | 922.097 above threshold | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | 34153.187744140625 | <= 2000 | MISS | 32153.188 above threshold |  |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | 11 | = 0 | MISS | 11.000 from threshold |  |
| P1 | NS-P1-GOODPUT-1024-VS-256 | 0.10076982184100851 | >= 0.9 | MISS | 0.799 below threshold |  |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | 946.9214005215982 | <= 2.0 | MISS | 944.921 above threshold | UNMATCHED: in-run baseline phase (different trace segment); cannot close NS.P1 |
| P1 | NS-P1-RECOVERY-MS | null | <= 60000 | MISS |  | no matched zero-reader run: the writer part of the 256-level bar cannot be judged, so recovery cannot be shown |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.610187394859356 | >= 0.5 | MET |  |  |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 1867 | > 0 and all correct | MISS |  | step 1 before the trace command's ACK, step 2 after; the driver adds no writes (RULINGS Q31b) |
| P1 | 4.1.5 fallback share per window (reported) | [0,0,0,0,0,0] | reported | UNVERIFIED |  | one-engine composition: every read is served by the source of truth's own surface |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | MET |  | completed request-index job with request/completion timestamps inside the measured window |
| P2 | NS-P2 5-10 band p50 ms (L256) | 573.439 | <= 10 | MISS | 563.439 above threshold |  |
| P2 | NS-P2 5-10 band p99 ms (L256) | 30932.991 | <= 50 | MISS | 30882.991 above threshold |  |
| P2 | NS-P2 11-25 band p50 ms (L256) | 598.015 | <= 10 | MISS | 588.015 above threshold |  |
| P2 | NS-P2 11-25 band p99 ms (L256) | 27525.119 | <= 50 | MISS | 27475.119 above threshold |  |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | 31116.721 | <= 100 | MISS | 31016.721 above threshold |  |
| P2 | NS-P2 every offered command accounted | 1298 | = 0 | MISS | 1298.000 from threshold |  |
| P2 | NS-P2 every oracle-valid trace command published | "2372/3637" | all | MISS |  |  |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | MET |  |  |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | MET |  |  |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | 20 | <= 2.19 commands | MISS | 17.810 above threshold |  |
| P2 | NS-P2 queue drains within 60 s after each burst | [41.24309497070311] | every burst <= 60 s | MET |  |  |
| P2 | NS-P2 read-your-own-write at the returned tx | 0.9835581787521079 | = 1.0 | MISS | 0.016 from threshold |  |
| P2 | NS-P2 duplicates return the original receipt | 1 | = 1.0 | MET |  |  |
| P2 | NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | MET |  |  |
| P3 | NS-P3 gaps | 0 | = 0 | MET |  |  |
| P3 | NS-P3 per-subject order violations | 0 | = 0 | MET |  |  |
| P3 | NS-P3 visible duplicate effects | 0 | = 0 | MET |  | replay attempts (allowed): 1 |
| P3 | NS-P3 resume from checkpoint replays exactly | false | = true | MISS |  |  |
| P3 | NS-P3 crash injection at three points | 3 | = 3 | MET |  |  |
| P3 | NS-P3 lag p99 ms at L256 | 21.878 | <= 250 | MET |  |  |
| P3 | NS-P3 affected-subject set matches | 0 | = 0 | MET |  |  |
| P3 | NS-P3 corrections report their valid-time range | 1 | = 1.0 | MET |  |  |
| P4 | NS-P4 weighted-mix pull p50 ms | 18.943 | <= 5 | MISS | 13.943 above threshold |  |
| P4 | NS-P4 weighted-mix pull p99 ms | 78.335 | <= 25 | MISS | 53.335 above threshold |  |
| P4 | NS-P4 largest bucket p99 ms (provisional) | 92.159 | <= 50 | MISS | 42.159 above threshold |  |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | 1081.7368150072725 | >= 1100 | MISS | 18.263 below threshold |  |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | 0.7380917582344578 | <= 1.1 | MET |  |  |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | UNVERIFIED |  | engine bytes read are not measured (seam); client-observed bytes are reported |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | MISS |  | evaluate(subjectWorld, release) is not implemented; publish(evaluations) through the outbox is not implemented |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | null | <= 100 | MISS |  | fetch-only diagnostic: 2842 s extrapolated |
| P5 | NS-P5 exact coverage | true | = true | MET |  |  |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | "10/10" | all at basis | MET |  |  |
| P5 | NS-P5 live read p99 during sweep / presweep | 1.2200001342774258 | <= 1.5 | MET |  |  |
| P5 | NS-P5 writer commit p99 during sweep / presweep | 15.122824405809181 | <= 1.5 | MISS | 13.623 above threshold |  |
| P5 | NS-P5 throttled variant overlapping compaction | null | run | MISS |  | needs evaluate and an observable compaction or rebuild to overlap (seam) |

## Writer pending at every phase boundary

```text
[ns 02:54:17] phase warmup: 16 readers at trace 0s; writer pending 0
[ns 02:54:32] phase baseline: 0 readers at trace 15s; writer pending 0
[ns 02:54:52] phase L1: 1 readers at trace 35s; writer pending 0
[ns 02:55:12] phase L4: 4 readers at trace 55s; writer pending 0
[ns 02:55:32] phase L16: 16 readers at trace 75s; writer pending 0
[ns 02:55:52] phase L64: 64 readers at trace 95s; writer pending 0
[ns 02:56:12] phase L256: 256 readers at trace 115s; writer pending 0
[ns 02:56:32] phase L1024: 256 readers at trace 135s; writer pending 263
[ns 02:56:52] phase recovery: 256 readers at trace 155s; writer pending 793
[ns 02:57:12] phase p4mix: 1 readers at trace 175s; writer pending 1108
[ns 02:57:32] phase p4h1: 1 readers at trace 195s; writer pending 557
[ns 02:57:52] phase grow3: 0 readers at trace 215s; writer pending 15
[ns 02:58:14] phase p4h3: 1 readers at trace 237s; writer pending 1
[ns 02:58:34] phase grow10: 0 readers at trace 257s; writer pending 6
[ns 02:59:03] phase p4h10: 1 readers at trace 287s; writer pending 0
[ns 02:59:23] phase presweep: 64 readers at trace 307s; writer pending 2
[ns 02:59:43] phase sweep: 64 readers at trace 327s; writer pending 3
```

## P2 commit latency per size band (ms)

| Window | Facts | Count | p50 | p99 |
|---|---|---|---|---|
| bandsAll | 5-10 | 1428 | 1916.927 | 32243.711 |
| bandsAll | 11-25 | 683 | 1810.431 | 32505.855 |
| bandsAll | 26-50 | 261 | 1703.935 | 31326.207 |
| bandsAtL256 | 5-10 | 384 | 573.439 | 30932.991 |
| bandsAtL256 | 11-25 | 198 | 598.015 | 27525.119 |
| bandsAtL256 | 26-50 | 77 | 581.631 | 31116.721 |
| bandsSteady | 5-10 | 216 | 360.447 | 45875.199 |
| bandsSteady | 11-25 | 113 | 428.031 | 28049.407 |
| bandsSteady | 26-50 | 41 | 333.823 | 31131.478 |
| bandsBurst | 5-10 | 1212 | 2195.455 | 31850.495 |
| bandsBurst | 11-25 | 570 | 2244.607 | 32505.855 |
| bandsBurst | 26-50 | 220 | 1933.311 | 31326.207 |

## P1 reader ladder and writer comparison

| Phase | Readers | Read p50 | Read p99 | Correct/s | Writer p99 | p99 / in-run zero-reader baseline | Client saturated | Per-container mean CPU % |
|---|---|---|---|---|---|---|---|---|
| L1 | 1 | 0.367 | 1.063 | 1419.970 | 50.677 | 1.519 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":1.2899675212892663},"tx2-dxh3-m5-tx":{"cpuPercentMean":20.84074664887637},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":4.232531220007542},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":39.864810335341275}} |
| L4 | 4 | 0.567 | 2.223 | 3942.291 | 54.840 | 1.644 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":0.8703767656673111},"tx2-dxh3-m5-tx":{"cpuPercentMean":11.186000203481456},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":5.576504956710859},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":98.26695174352629}} |
| L16 | 16 | 1.743 | 7.167 | 5143.824 | 75.824 | 2.273 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":0.9329481741900496},"tx2-dxh3-m5-tx":{"cpuPercentMean":10.714164689543493},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":5.372689489323832},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":121.45799687292565}} |
| L64 | 64 | 7.583 | 28.543 | 5408.684 | 41.750 | 1.252 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":0.8274524668993295},"tx2-dxh3-m5-tx":{"cpuPercentMean":9.27977813303509},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":4.626068171802048},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":130.53583856462262}} |
| L256 | 256 | 47.871 | 3915.775 | 779.371 | 30801.919 | 923.347 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":5.470774886246095},"tx2-dxh3-m5-tx":{"cpuPercentMean":42.67227097967087},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":79.55808383598443},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":165.08071871934175}} |
| L1024 | 256 | 2179.071 | 5668.863 | 78.537 | 31588.351 | 946.921 | False | {"tx2-dxh3-m5-pg":{"cpuPercentMean":7.181280423984997},"tx2-dxh3-m5-tx":{"cpuPercentMean":54.05698108623745},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":99.35155314402738},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":178.44445706491726}} |

Writer ratios above use a different in-run trace segment; the matched zero-reader baseline was not run. They cannot close P1. Medium requested cap 256 also caps the nominal L1024 phase.

## P4 weighted mix and history

| Group | Latency / bytes summary |
|---|---|
| weighted | {"count":706,"minMs":6.151,"maxMs":127.735,"meanMs":25.134,"p50Ms":18.943,"p90Ms":50.943,"p99Ms":78.335,"p999Ms":127.735} |
| bucket:medium | {"count":248,"minMs":15.238,"maxMs":68.197,"meanMs":28.916,"p50Ms":27.903,"p90Ms":40.959,"p99Ms":58.623,"p999Ms":68.197,"meanBytes":23707.987903225807} |
| hops:3 | {"count":321,"minMs":6.151,"maxMs":127.735,"meanMs":23.301,"p50Ms":17.279,"p90Ms":47.871,"p99Ms":74.751,"p999Ms":127.735,"meanBytes":18913.1246105919} |
| hops:4 | {"count":212,"minMs":7.708,"maxMs":86.269,"meanMs":25.638,"p50Ms":20.095,"p90Ms":52.223,"p99Ms":80.383,"p999Ms":86.269,"meanBytes":19833.877358490565} |
| bucket:large | {"count":113,"minMs":40.449,"maxMs":127.735,"meanMs":53.253,"p50Ms":50.687,"p90Ms":65.023,"p99Ms":92.159,"p999Ms":127.735,"meanBytes":49080.398230088496} |
| hops:6 | {"count":173,"minMs":9.469,"maxMs":91.864,"meanMs":27.918,"p50Ms":21.759,"p90Ms":54.015,"p99Ms":82.431,"p999Ms":91.864,"meanBytes":20719.190751445087} |
| bucket:small | {"count":345,"minMs":6.151,"maxMs":86.269,"meanMs":13.205,"p50Ms":11.263,"p90Ms":17.663,"p99Ms":59.903,"p999Ms":86.269,"meanBytes":7056.953623188406} |

| History / throughput field | Observed |
|---|---|
| history | {"sampleSubjects":200,"growth":[{"targetDepth":3,"reachedDepth":3,"subjects":200,"commands":4,"assertions":800,"failures":0,"wallS":22.280534912109374},{"targetDepth":10,"reachedDepth":10,"subjects":200,"commands":14,"assertions":2800,"failures":0,"wallS":29.426723876953126}],"depth1":{"count":743,"minMs":6.516,"maxMs":82.989,"meanMs":24.012,"p50Ms":18.303,"p90Ms":49.407,"p99Ms":75.263,"p999Ms":82.989},"depth3":{"count":964,"minMs":3.1,"maxMs":444.367,"meanMs":18.552,"p50Ms":11.967,"p90Ms":43.007,"p99Ms":67.071,"p999Ms":444.367},"depth10":{"count":1051,"minMs":3.505,"maxMs":85.432,"meanMs":17.009,"p50Ms":10.815,"p90Ms":41.727,"p99Ms":55.551,"p999Ms":79.871},"clientBytes":{"depth1":19454.308626974485,"depth3":18276.15479582146,"depth10":18410.18018787361},"engineBytesRead":"not measured: neither engine exposes bytes read per query here (seam)"} |
| throughput | {"bestLevel":"L64","goodputPerS":5408.684075036363,"engineCpuQuotaCores":5,"pullsPerSPerQuotaCore":1081.7368150072725,"engineCpuPercentMean":145.26913733635908,"pullsPerSPerUsedCore":3723.216213856207,"hostClientCpu":{"userCores":0.8567311097170615,"kernelCores":0.03835605742116428,"hostCores":8},"hostBrokerCpu":"none in this composition (no broker process)"} |

## Three slowest measured read phases

| Phase | Read p99 ms | Engine CPU mean % by container | Client signals |
|---|---|---|---|
| L1024 | 5668.863 | {"tx2-dxh3-m5-pg":{"cpuPercentMean":7.181280423984997},"tx2-dxh3-m5-tx":{"cpuPercentMean":54.05698108623745},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":99.35155314402738},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":178.44445706491726}} | {"workerEluMean":[0.5480142393589257,0.5484751221007402],"maxWorkerElu":0.5484751221007402,"mainElu":0.6751445501413913,"saturated":false} |
| recovery | 5177.343 | {"tx2-dxh3-m5-pg":{"cpuPercentMean":5.0674382436384935},"tx2-dxh3-m5-tx":{"cpuPercentMean":25.975661903166642},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":99.93274771886149},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":177.36131815694037}} | {"workerEluMean":[0.505491073634513,0.4920089645391712],"maxWorkerElu":0.505491073634513,"mainElu":0.6355651825984155,"saturated":false} |
| L256 | 3915.775 | {"tx2-dxh3-m5-pg":{"cpuPercentMean":5.470774886246095},"tx2-dxh3-m5-tx":{"cpuPercentMean":42.67227097967087},"tx2-dxh3-m5-gw-w":{"cpuPercentMean":79.55808383598443},"tx2-dxh3-m5-gw-r":{"cpuPercentMean":165.08071871934175}} | {"workerEluMean":[0.5994306378885145,0.6033203877703193],"maxWorkerElu":0.6033203877703193,"mainElu":0.5735495404215923,"saturated":false} |

## Three longest phases by elapsed wall time

| Phase | Elapsed s | Cgroup samples | Per-container mean CPU % |
|---|---|---|---|
| sweep | 58.383 | 58 | {"tx2-dxh3-m5-gw-r":182.2464442886824,"tx2-dxh3-m5-gw-w":99.97586361726665,"tx2-dxh3-m5-pg":1.0064787428021686,"tx2-dxh3-m5-tx":2.4350437160159446} |
| grow10 | 29.427 | 29 | {"tx2-dxh3-m5-gw-r":2.2466546933481233,"tx2-dxh3-m5-gw-w":99.96767762645354,"tx2-dxh3-m5-pg":1.6461537084226632,"tx2-dxh3-m5-tx":14.014612704879049} |
| grow3 | 22.281 | 22 | {"tx2-dxh3-m5-gw-r":2.3352215294860588,"tx2-dxh3-m5-gw-w":99.98117654245722,"tx2-dxh3-m5-pg":1.9075454268581082,"tx2-dxh3-m5-tx":31.29781267248342} |

CPU describes concurrent measured activity only; no causal attribution is inferred. Raw gateway/transactor logs are retained as `gw-w.log`, `gw-r.log`, `tx.log`.

## Counters, feed, fetch-only sweep, oracle and invalidity

### P2 duplicates

```json
{
  "resends": 68,
  "considered": 62,
  "returnedOriginal": 62
}
```

### P2 lost ACK

```json
{
  "simulated": 28,
  "returnedOriginal": 28,
  "retryTags": {
    "Unknown": 28
  }
}
```

### P2 accounting

```json
{
  "byStreamAndOutcome": {
    "background:committed": 2372,
    "probe10:committed": 382,
    "background:unaccounted": 1265,
    "p5-mutation:committed": 10
  },
  "resendsByResult": {
    "resolved-by-command": 62,
    "original-not-committed": 6
  },
  "unaccounted": 1298,
  "pendingAtEnd": 0,
  "errorTags": {
    "Unknown": 7
  }
}
```

### P2 progress

```json
{
  "validOffered": 3637,
  "validPublished": 2372,
  "typedRejections": 0,
  "typedConflicts": 0,
  "invalidCommandsInTrace": 0,
  "queue": {
    "steadyRateCommandsPerS": 1.094890510948905,
    "steadyBound": 2.18978102189781,
    "steadySamples": 265,
    "steadyMax": 20,
    "drains": [
      {
        "burstAtS": 120,
        "peakQueued": 1159,
        "drainS": 41.24309497070311
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
        1,
        2
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
        0
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
        20,
        0,
        0
      ],
      [
        21,
        0,
        1
      ],
      [
        22,
        0,
        1
      ],
      [
        23,
        0,
        1
      ],
      [
        24,
        0,
        1
      ],
      [
        25,
        0,
        1
      ],
      [
        26,
        0,
        1
      ],
      [
        27,
        0,
        1
      ],
      [
        28,
        1,
        2
      ],
      [
        29,
        0,
        1
      ],
      [
        30,
        0,
        1
      ],
      [
        31,
        0,
        1
      ],
      [
        32,
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
        37.1,
        0,
        1
      ],
      [
        38.1,
        0,
        1
      ],
      [
        39.1,
        0,
        1
      ],
      [
        40.1,
        0,
        1
      ],
      [
        41.1,
        0,
        1
      ],
      [
        42.1,
        0,
        1
      ],
      [
        43.1,
        0,
        1
      ],
      [
        44.1,
        0,
        1
      ],
      [
        45.1,
        0,
        1
      ],
      [
        46.1,
        0,
        1
      ],
      [
        47.1,
        0,
        1
      ],
      [
        48.1,
        0,
        1
      ],
      [
        49.1,
        0,
        1
      ],
      [
        50.1,
        0,
        1
      ],
      [
        51.1,
        0,
        1
      ],
      [
        52.1,
        0,
        1
      ],
      [
        53.1,
        0,
        1
      ],
      [
        54.1,
        0,
        1
      ],
      [
        55.1,
        0,
        1
      ],
      [
        56.1,
        0,
        1
      ],
      [
        57.1,
        0,
        1
      ],
      [
        58.1,
        0,
        1
      ],
      [
        59.1,
        0,
        1
      ],
      [
        60.1,
        0,
        1
      ],
      [
        61.1,
        0,
        1
      ],
      [
        62.1,
        0,
        1
      ],
      [
        63.1,
        0,
        0
      ],
      [
        64.1,
        0,
        1
      ],
      [
        65.1,
        0,
        0
      ],
      [
        66.1,
        0,
        0
      ],
      [
        67.1,
        0,
        0
      ],
      [
        68.1,
        0,
        1
      ],
      [
        69.1,
        0,
        0
      ],
      [
        70.1,
        0,
        1
      ],
      [
        71.1,
        0,
        1
      ],
      [
        72.1,
        0,
        1
      ],
      [
        73.1,
        0,
        0
      ],
      [
        74.1,
        0,
        0
      ],
      [
        75.1,
        0,
        0
      ],
      [
        76.1,
        0,
        2
      ],
      [
        77.1,
        0,
        1
      ],
      [
        78.1,
        0,
        0
      ],
      [
        79.1,
        0,
        1
      ],
      [
        80.1,
        0,
        0
      ],
      [
        81.1,
        0,
        0
      ],
      [
        82.1,
        0,
        0
      ],
      [
        83.1,
        0,
        0
      ],
      [
        84.1,
        0,
        0
      ],
      [
        85.1,
        0,
        0
      ],
      [
        86.1,
        0,
        0
      ],
      [
        87.1,
        0,
        0
      ],
      [
        88.1,
        0,
        1
      ],
      [
        89.1,
        0,
        0
      ],
      [
        90.1,
        0,
        0
      ],
      [
        91.1,
        0,
        0
      ],
      [
        92.1,
        0,
        0
      ],
      [
        93.1,
        0,
        0
      ],
      [
        94.1,
        0,
        0
      ],
      [
        95.1,
        0,
        0
      ],
      [
        96.1,
        0,
        0
      ],
      [
        97.1,
        0,
        0
      ],
      [
        98.1,
        0,
        0
      ],
      [
        99.1,
        0,
        0
      ],
      [
        100.1,
        0,
        0
      ],
      [
        101.1,
        0,
        0
      ],
      [
        102.1,
        0,
        0
      ],
      [
        103.1,
        0,
        0
      ],
      [
        104.1,
        0,
        0
      ],
      [
        105.1,
        0,
        0
      ],
      [
        106.1,
        0,
        0
      ],
      [
        107.1,
        0,
        0
      ],
      [
        108.1,
        0,
        0
      ],
      [
        109.1,
        0,
        0
      ],
      [
        110.1,
        0,
        0
      ],
      [
        111.1,
        0,
        0
      ],
      [
        112.1,
        0,
        0
      ],
      [
        113.1,
        0,
        0
      ],
      [
        114.1,
        0,
        0
      ],
      [
        115.1,
        0,
        0
      ],
      [
        116.1,
        0,
        0
      ],
      [
        117.2,
        1,
        1
      ],
      [
        118.2,
        0,
        0
      ],
      [
        119.2,
        0,
        0
      ],
      [
        120.2,
        2,
        2
      ],
      [
        121.2,
        25,
        26
      ],
      [
        122.2,
        37,
        38
      ],
      [
        123.2,
        64,
        65
      ],
      [
        124.2,
        79,
        80
      ],
      [
        125.2,
        91,
        95
      ],
      [
        126.4,
        119,
        125
      ],
      [
        127.4,
        130,
        136
      ],
      [
        128.4,
        149,
        157
      ],
      [
        129.5,
        180,
        188
      ],
      [
        130.6,
        189,
        199
      ],
      [
        131.6,
        209,
        218
      ],
      [
        132.6,
        223,
        231
      ],
      [
        133.6,
        220,
        230
      ],
      [
        134.7,
        246,
        258
      ],
      [
        135.7,
        273,
        283
      ],
      [
        136.7,
        316,
        328
      ],
      [
        137.7,
        325,
        338
      ],
      [
        138.7,
        342,
        356
      ],
      [
        140,
        373,
        386
      ],
      [
        141,
        372,
        384
      ],
      [
        142,
        384,
        398
      ],
      [
        143,
        418,
        435
      ],
      [
        144,
        443,
        461
      ],
      [
        145,
        481,
        498
      ],
      [
        146,
        517,
        534
      ],
      [
        147.1,
        550,
        571
      ],
      [
        148.1,
        578,
        601
      ],
      [
        149.5,
        630,
        653
      ],
      [
        150.5,
        643,
        664
      ],
      [
        151.5,
        669,
        689
      ],
      [
        152.5,
        691,
        711
      ],
      [
        153.5,
        701,
        724
      ],
      [
        154.5,
        752,
        777
      ],
      [
        155.5,
        772,
        798
      ],
      [
        156.7,
        810,
        833
      ],
      [
        157.7,
        852,
        875
      ],
      [
        158.7,
        834,
        857
      ],
      [
        159.7,
        834,
        856
      ],
      [
        160.7,
        873,
        896
      ],
      [
        161.8,
        865,
        886
      ],
      [
        162.8,
        892,
        915
      ],
      [
        163.8,
        922,
        949
      ],
      [
        164.8,
        979,
        1007
      ],
      [
        165.8,
        974,
        1004
      ],
      [
        166.8,
        978,
        1009
      ],
      [
        167.8,
        963,
        994
      ],
      [
        168.8,
        996,
        1028
      ],
      [
        169.8,
        1001,
        1033
      ],
      [
        170.8,
        1012,
        1044
      ],
      [
        171.8,
        1046,
        1079
      ],
      [
        172.9,
        1107,
        1144
      ],
      [
        174,
        1138,
        1174
      ],
      [
        175,
        1067,
        1099
      ],
      [
        176,
        1109,
        1142
      ],
      [
        177,
        1081,
        1114
      ],
      [
        178.1,
        1128,
        1162
      ],
      [
        179.1,
        1134,
        1167
      ],
      [
        180.1,
        1159,
        1194
      ],
      [
        181.1,
        1110,
        1147
      ],
      [
        182.1,
        1051,
        1087
      ],
      [
        183.1,
        1004,
        1038
      ],
      [
        184.1,
        969,
        1001
      ],
      [
        185.1,
        939,
        970
      ],
      [
        186.1,
        890,
        920
      ],
      [
        187.1,
        871,
        900
      ],
      [
        188.1,
        799,
        827
      ],
      [
        189.1,
        763,
        788
      ],
      [
        190.1,
        724,
        749
      ],
      [
        191.1,
        705,
        729
      ],
      [
        192.2,
        669,
        692
      ],
      [
        193.2,
        615,
        638
      ],
      [
        194.2,
        580,
        599
      ],
      [
        195.2,
        538,
        557
      ],
      [
        196.2,
        527,
        545
      ],
      [
        197.2,
        498,
        516
      ],
      [
        198.2,
        451,
        467
      ],
      [
        199.2,
        408,
        422
      ],
      [
        200.2,
        410,
        425
      ],
      [
        201.2,
        350,
        361
      ],
      [
        202.2,
        340,
        352
      ],
      [
        203.2,
        341,
        354
      ],
      [
        204.2,
        260,
        269
      ],
      [
        205.2,
        225,
        233
      ],
      [
        206.2,
        227,
        236
      ],
      [
        207.2,
        193,
        203
      ],
      [
        208.2,
        166,
        173
      ],
      [
        209.2,
        167,
        175
      ],
      [
        210.2,
        120,
        127
      ],
      [
        211.2,
        26,
        28
      ],
      [
        212.2,
        22,
        24
      ],
      [
        213.2,
        19,
        21
      ],
      [
        214.2,
        20,
        23
      ],
      [
        215.2,
        14,
        16
      ],
      [
        216.2,
        14,
        17
      ],
      [
        217.2,
        13,
        15
      ],
      [
        218.2,
        11,
        13
      ],
      [
        219.2,
        7,
        9
      ],
      [
        220.2,
        5,
        6
      ],
      [
        221.2,
        1,
        3
      ],
      [
        222.2,
        0,
        1
      ],
      [
        223.2,
        1,
        3
      ],
      [
        224.2,
        1,
        4
      ],
      [
        225.2,
        1,
        5
      ],
      [
        226.2,
        1,
        5
      ],
      [
        227.2,
        2,
        4
      ],
      [
        228.3,
        0,
        1
      ],
      [
        229.3,
        0,
        1
      ],
      [
        230.3,
        0,
        1
      ],
      [
        231.3,
        1,
        2
      ],
      [
        232.3,
        0,
        1
      ],
      [
        233.3,
        1,
        2
      ],
      [
        234.3,
        1,
        2
      ],
      [
        235.3,
        1,
        2
      ],
      [
        236.3,
        0,
        1
      ],
      [
        237.3,
        0,
        1
      ],
      [
        238.3,
        1,
        2
      ],
      [
        239.3,
        0,
        1
      ],
      [
        240.3,
        0,
        1
      ],
      [
        241.3,
        1,
        2
      ],
      [
        242.3,
        0,
        1
      ],
      [
        243.3,
        3,
        5
      ],
      [
        244.3,
        0,
        2
      ],
      [
        245.3,
        1,
        2
      ],
      [
        246.3,
        0,
        1
      ],
      [
        247.3,
        0,
        1
      ],
      [
        248.3,
        1,
        3
      ],
      [
        249.3,
        2,
        3
      ],
      [
        250.3,
        1,
        3
      ],
      [
        251.3,
        1,
        2
      ],
      [
        252.3,
        1,
        2
      ],
      [
        253.3,
        0,
        2
      ],
      [
        254.3,
        1,
        3
      ],
      [
        255.3,
        0,
        1
      ],
      [
        256.3,
        2,
        4
      ],
      [
        257.3,
        4,
        6
      ],
      [
        258.3,
        3,
        6
      ],
      [
        259.3,
        2,
        4
      ],
      [
        260.3,
        3,
        6
      ],
      [
        261.3,
        2,
        5
      ],
      [
        262.3,
        1,
        3
      ],
      [
        263.3,
        1,
        3
      ],
      [
        264.3,
        1,
        2
      ],
      [
        265.5,
        1,
        3
      ],
      [
        266.5,
        0,
        1
      ],
      [
        267.5,
        2,
        4
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
        1,
        2
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
        1,
        2
      ],
      [
        274.5,
        0,
        1
      ],
      [
        275.5,
        1,
        2
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
        1,
        2
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
        288.6,
        1,
        2
      ],
      [
        289.6,
        0,
        1
      ],
      [
        290.6,
        0,
        1
      ],
      [
        291.6,
        0,
        1
      ],
      [
        292.6,
        0,
        1
      ],
      [
        293.6,
        0,
        1
      ],
      [
        294.6,
        1,
        2
      ],
      [
        295.6,
        2,
        3
      ],
      [
        296.6,
        0,
        1
      ],
      [
        297.6,
        0,
        1
      ],
      [
        298.6,
        0,
        1
      ],
      [
        299.6,
        1,
        2
      ],
      [
        300.6,
        0,
        1
      ],
      [
        301.6,
        0,
        1
      ],
      [
        302.6,
        0,
        1
      ],
      [
        303.6,
        1,
        2
      ],
      [
        304.6,
        0,
        1
      ],
      [
        305.6,
        1,
        2
      ],
      [
        306.6,
        1,
        2
      ],
      [
        307.6,
        0,
        1
      ],
      [
        308.6,
        0,
        1
      ],
      [
        309.6,
        0,
        1
      ],
      [
        310.6,
        0,
        1
      ],
      [
        311.6,
        0,
        1
      ],
      [
        312.6,
        0,
        1
      ],
      [
        313.6,
        3,
        4
      ],
      [
        314.6,
        0,
        1
      ],
      [
        315.6,
        1,
        2
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
        2,
        3
      ],
      [
        319.6,
        3,
        5
      ],
      [
        320.6,
        1,
        2
      ],
      [
        321.6,
        0,
        1
      ],
      [
        322.6,
        1,
        3
      ],
      [
        323.6,
        2,
        4
      ],
      [
        324.6,
        1,
        2
      ],
      [
        325.6,
        0,
        2
      ],
      [
        326.6,
        1,
        3
      ],
      [
        327.6,
        1,
        13
      ],
      [
        328.6,
        0,
        11
      ],
      [
        329.6,
        0,
        3
      ],
      [
        330.6,
        1,
        2
      ],
      [
        331.6,
        1,
        3
      ],
      [
        332.6,
        1,
        3
      ],
      [
        333.6,
        2,
        5
      ],
      [
        334.6,
        3,
        6
      ],
      [
        335.6,
        3,
        6
      ],
      [
        336.6,
        5,
        9
      ],
      [
        337.6,
        5,
        8
      ],
      [
        338.6,
        5,
        8
      ],
      [
        339.6,
        6,
        8
      ],
      [
        340.6,
        7,
        10
      ],
      [
        341.6,
        6,
        8
      ],
      [
        342.6,
        7,
        11
      ],
      [
        343.6,
        3,
        7
      ],
      [
        344.6,
        4,
        10
      ],
      [
        345.6,
        3,
        6
      ],
      [
        346.6,
        4,
        6
      ],
      [
        347.6,
        2,
        5
      ],
      [
        348.6,
        1,
        3
      ],
      [
        349.6,
        1,
        4
      ],
      [
        350.6,
        2,
        5
      ],
      [
        351.7,
        3,
        7
      ],
      [
        352.7,
        7,
        11
      ],
      [
        353.7,
        6,
        10
      ],
      [
        354.7,
        3,
        7
      ],
      [
        355.7,
        4,
        9
      ],
      [
        356.7,
        3,
        7
      ],
      [
        357.7,
        4,
        9
      ],
      [
        358.7,
        5,
        11
      ],
      [
        359.7,
        6,
        12
      ],
      [
        360.7,
        6,
        13
      ],
      [
        361.7,
        6,
        14
      ],
      [
        362.7,
        6,
        14
      ],
      [
        363.7,
        10,
        19
      ],
      [
        364.7,
        12,
        21
      ],
      [
        365.7,
        13,
        22
      ],
      [
        366.7,
        12,
        21
      ],
      [
        367.7,
        11,
        21
      ],
      [
        368.7,
        12,
        20
      ],
      [
        369.7,
        13,
        22
      ],
      [
        370.7,
        12,
        21
      ],
      [
        371.7,
        14,
        23
      ],
      [
        372.7,
        13,
        22
      ],
      [
        373.7,
        12,
        22
      ],
      [
        374.7,
        12,
        23
      ],
      [
        375.7,
        12,
        23
      ],
      [
        376.7,
        15,
        26
      ],
      [
        377.7,
        14,
        26
      ],
      [
        378.7,
        12,
        24
      ],
      [
        379.7,
        12,
        24
      ],
      [
        380.7,
        13,
        26
      ],
      [
        381.7,
        14,
        28
      ],
      [
        382.7,
        18,
        33
      ],
      [
        383.7,
        20,
        36
      ],
      [
        384.7,
        19,
        36
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
    "epoch": "ns-datomic-dev2000-nsmwa3irhm8184#0",
    "position": {
      "stream": "triplex-journal:ns-datomic-dev2000-nsmwa3irhm8184",
      "epoch": 0,
      "offset": 488,
      "ordinal": 0
    }
  },
  "counts": {
    "pages": 664,
    "pollErrors": 5,
    "entries": 257,
    "deliveries": 258,
    "redeliveries": 1,
    "redeliveryMismatches": 0,
    "replayAttempts": 1,
    "effectsWritten": 258,
    "orderViolations": 0,
    "incompleteChanges": 0,
    "affectedMismatches": 0,
    "corrections": 2,
    "correctionRangeReported": 2,
    "durableWrites": 243,
    "seenBeforeAck": 2
  },
  "gaps": 0,
  "gapSample": [],
  "notReachedAtStop": {
    "count": 2525,
    "sample": [
      489,
      490,
      491,
      492,
      493,
      494,
      495,
      496,
      497,
      498
    ],
    "wind": {
      "target": 3013,
      "checkpointAtStop": 488,
      "inFlightAtFeedTarget": 0
    }
  },
  "visibleDuplicateEffects": 0,
  "crashes": [
    {
      "point": "before-effect",
      "plannedAt": 1794279287002.7388,
      "fired": true,
      "checkpoint": 289,
      "catchUpMs": 23.602294921875
    },
    {
      "point": "after-effect",
      "plannedAt": 1794279307002.7388,
      "fired": true,
      "checkpoint": 327,
      "catchUpMs": 32.36376953125
    },
    {
      "point": "after-checkpoint",
      "plannedAt": 1794279327002.7388,
      "fired": true,
      "checkpoint": 372,
      "catchUpMs": 35.25537109375
    }
  ],
  "replay": {
    "exact": false,
    "status": "NOT-RUN",
    "reason": "feed consumer failed"
  },
  "lag": {
    "fromCommitInstant": {
      "count": 256,
      "minMs": 1.608,
      "maxMs": 2040.637,
      "meanMs": 54.704,
      "p50Ms": 4.319,
      "p90Ms": 16.383,
      "p99Ms": 1925.119,
      "p999Ms": 2040.637
    },
    "fromDriverAck": {
      "count": 256,
      "minMs": 0,
      "maxMs": 2039.824,
      "meanMs": 53.001,
      "p50Ms": 2.511,
      "p90Ms": 12.543,
      "p99Ms": 1925.119,
      "p999Ms": 2039.824
    },
    "atL256": {
      "count": 15,
      "minMs": 2.846,
      "maxMs": 21.878,
      "meanMs": 9.099,
      "p50Ms": 6.527,
      "p90Ms": 19.327,
      "p99Ms": 21.878,
      "p999Ms": 21.878
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
      "recordedAt": 1794279581510,
      "validAt": 1794279583903,
      "position": {
        "stream": "triplex-journal:ns-datomic-dev2000-nsmwa3irhm8184",
        "epoch": 0,
        "offset": 2871,
        "ordinal": 0
      },
      "txId": "_tx/01M71PB9T63EYW28R2KG971D4P"
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
    "startedAt": 1794279585428.2651,
    "mutationPositions": [
      2880,
      2882,
      2884,
      2875,
      2877,
      2876,
      2878,
      2879,
      2883,
      2886
    ],
    "endedAt": 1794279642268.744,
    "completed": true,
    "wallMs": 56840.16012300004,
    "pulled": 2000,
    "distinctSubjects": 2000,
    "exactCoverage": true,
    "correctAtBasis": 2000,
    "violations": 0,
    "errors": 0,
    "pull": {
      "count": 2000,
      "minMs": 13.346,
      "maxMs": 2430.814,
      "meanMs": 452.783,
      "p50Ms": 372.735,
      "p90Ms": 860.159,
      "p99Ms": 1474.559,
      "p999Ms": 2039.807
    },
    "pullsPerS": 35.18638926547837,
    "fetchOnlyWallFor100kS": 2842.0080061500016,
    "mutatedSubjectsAtBasis": 10
  },
  "live": {
    "presweep": {
      "read": {
        "count": 1623,
        "minMs": 12.595,
        "maxMs": 2223.317,
        "meanMs": 640.272,
        "p50Ms": 602.111,
        "p90Ms": 1089.535,
        "p99Ms": 1638.399,
        "p999Ms": 2088.959
      },
      "commit": {
        "count": 22,
        "minMs": 67.558,
        "maxMs": 3177.178,
        "meanMs": 783.701,
        "p50Ms": 589.823,
        "p90Ms": 1277.951,
        "p99Ms": 3177.178,
        "p999Ms": 3177.178
      }
    },
    "duringSweep": {
      "read": {
        "count": 3624,
        "minMs": 12.589,
        "maxMs": 3139.289,
        "meanMs": 627.94,
        "p50Ms": 540.671,
        "p90Ms": 1163.263,
        "p99Ms": 1998.847,
        "p999Ms": 2670.591
      },
      "commit": {
        "count": 71,
        "minMs": 181.032,
        "maxMs": 48047.905,
        "meanMs": 10016.207,
        "p50Ms": 6160.383,
        "p90Ms": 28180.479,
        "p99Ms": 48047.905,
        "p999Ms": 48047.905
      }
    }
  }
}
```

### correctness

```json
{
  "reads": 419965,
  "correct": 419786,
  "violations": 85,
  "errors": 94,
  "violationKinds": {
    "stale": 67,
    "stale-late-arrival": 16,
    "wrong-world": 2
  },
  "violationSample": [
    {
      "kind": "stale",
      "phase": 6,
      "subject": 1786,
      "basis": {
        "recordedAt": 1794279380280,
        "validAt": 1794279380815,
        "position": 633,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 0,
        "digest": "6eaac984aa5e198a:80"
      },
      "expected": {
        "stamp": 1,
        "digest": "1fc4591970130d08:88",
        "facts": 88,
        "commits": 1
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 1386,
      "basis": {
        "recordedAt": 1794279380280,
        "validAt": 1794279380812,
        "position": 633,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 6,
        "digest": "cdec9e6ce4184561:186"
      },
      "expected": {
        "stamp": 7,
        "digest": "d019bd321dd5b8bb:201",
        "facts": 201,
        "commits": 7
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 56,
      "basis": {
        "recordedAt": 1794279380260,
        "validAt": 1794279380915,
        "position": 631,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 10,
        "digest": "da20903099e3ca88:222"
      },
      "expected": {
        "stamp": 14,
        "digest": "56715992577aabb2:338",
        "facts": 338,
        "commits": 14
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 1157,
      "basis": {
        "recordedAt": 1794279379947,
        "validAt": 1794279380273,
        "position": 609,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 2,
        "digest": "c8985290a03d9e4e:1271"
      },
      "expected": {
        "stamp": 3,
        "digest": "2ef507e613eb8e28:1295",
        "facts": 1295,
        "commits": 3
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 1867,
      "basis": {
        "recordedAt": 1794279380579,
        "validAt": 1794279381060,
        "position": 637,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 18,
        "digest": "396346695146db40:901"
      },
      "expected": {
        "stamp": 22,
        "digest": "285018ef790f9bb3:961",
        "facts": 961,
        "commits": 22
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 58,
      "basis": {
        "recordedAt": 1794279381026,
        "validAt": 1794279381514,
        "position": 655,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 0,
        "digest": "780b65cba08cfc85:102"
      },
      "expected": {
        "stamp": 1,
        "digest": "8f91207abeedfa01:106",
        "facts": 106,
        "commits": 1
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 720,
      "basis": {
        "recordedAt": 1794279379140,
        "validAt": 1794279379935,
        "position": 581,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 4,
        "digest": "0eb6bfedbb8633ee:413"
      },
      "expected": {
        "stamp": 5,
        "digest": "e67b8084c11afbc2:421",
        "facts": 421,
        "commits": 5
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 874,
      "basis": {
        "recordedAt": 1794279380661,
        "validAt": 1794279381350,
        "position": 643,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 4,
        "digest": "0fd987d096efe668:238"
      },
      "expected": {
        "stamp": 5,
        "digest": "44a30b3b4a8b0061:245",
        "facts": 245,
        "commits": 5
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 69,
      "basis": {
        "recordedAt": 1794279380961,
        "validAt": 1794279381454,
        "position": 652,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 0,
        "digest": "17ae846524a79d4d:167"
      },
      "expected": {
        "stamp": 1,
        "digest": "c9cd2fa865c90f6f:190",
        "facts": 190,
        "commits": 1
      }
    },
    {
      "kind": "stale",
      "phase": 6,
      "subject": 144,
      "basis": {
        "recordedAt": 1794279380961,
        "validAt": 1794279381454,
        "position": 652,
        "kind": 0
      },
      "split": 0,
      "observed": {
        "stamp": 3,
        "digest": "68128dc53031ef2c:127"
      },
      "expected": {
        "stamp": 4,
        "digest": "4787c8d17428630f:152",
        "facts": 152,
        "commits": 4
      }
    }
  ],
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
  "entityQueries": 1804,
  "oracleMs": 21157,
  "mismatches": [],
  "mismatchCount": 0,
  "modelCorrectOnSameReads": 24,
  "recordedCommands": 532
}
```

### client

```json
{
  "saturatedPhases": [],
  "invalid": false,
  "processCpu": {
    "userCores": 0.8567311097170615,
    "kernelCores": 0.03835605742116428,
    "hostCores": 8
  },
  "readerThreads": 2,
  "rule": "INVALID when a reader worker or the main thread has mean event-loop utilization > 0.9 in a measured window"
}
```

### invalidReasons

```json
[
  "Feed consumer failed: Error: Feed polling repeatedly failed for 142450 ms at checkpoint 488. Last error: ReadError: Datomic read failed"
]
```

### writer

```json
{
  "offered": 4130,
  "completed": 2832,
  "expired": 1298,
  "notOffered": 44393,
  "maxInFlightSeen": 32,
  "pendingAtEnd": 0,
  "offeredUntilTraceS": 385.2836501464844,
  "overlays": {
    "probe10": 382,
    "p5-mutation": 10
  }
}
```

Additional validity limits: smoke profile; no matched zero-reader run; any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.

## Gateway scan counters

| At | Write peer | Read peer |
|---|---|---|
| 2026-11-10T02:53:40.416Z | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":1}}"} |
| 2026-11-10T03:02:22.071Z | {"status":200,"body":"{\"routes\":{\"post \\/v2\\/db\\/{db}\\/begin\":474,\"post \\/v2\\/db\\/{db}\\/command\":97,\"get \\/v1\\/db\\/{db}\\/operation\\/72b1aee2-4a9b-4c10-8a09-e7028c002c49\":3,\"post \\/v2\\/db\\/{db}\\/reach\":2372,\"post \\/v2\\/db\\/{db}\\/journal\":94,\"post \\/v1\\/db\\/{db}\\/read\":11659,\"post \\/v1\\/db\\/{db}\\/release\":90,\"post \\/v2\\/db\\/{db}\\/transactions\":669,\"get \\/v2\\/admin\\/scan-stats\":93,\"post \\/v1\\/db\\/create\":8,\"post \\/v2\\/db\\/{db}\\/request-index\":6,\"get \\/health\":1,\"get \\/v1\\/db\\/{db}\\/basis\":2557,\"post \\/v1\\/db\\/{db}\\/transact\":3099},\"journalDeclines\":{\"irregular\":5},\"branches\":{\"scan\":{\"calls\":5,\"datoms\":826808},\"entities\":{\"calls\":11654}},\"scanPatterns\":{\"{\\\"entityType\\\" \\\"_Transaction\\\"}\":{\"calls\":1,\"datoms\":201850,\"maxDatoms\":201850}}}"} | {"status":200,"body":"{\"routes\":{\"get \\/health\":1,\"get \\/v2\\/admin\\/scan-stats\":93,\"post \\/v1\\/db\\/create\":3,\"post \\/v2\\/db\\/{db}\\/reach\":418585,\"post \\/v1\\/db\\/{db}\\/read\":88913,\"get \\/v1\\/db\\/{db}\\/basis\":16742},\"branches\":{\"entities\":{\"calls\":88913}}}"} |

Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.

