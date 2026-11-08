# EXP-P4 inherited measurements

Historical measurements from `d872663`, not rerun by CX-P4. Diagnostic correctness PASS does not qualify P4. Raw root: `/Users/sam/Claude/Projects/triplex-db-2/EXP-P4/xtdb-fresh-10k/`.

## xtdb engine 10000 subjects, regime fresh (p4mw779lyo2e7f, status PASS)

Seed: 1031 commands, 384785 assertions, 1116 s (352 facts/s), lean true

O-REPLAY PASS (verdict PASS, version 0.4.1, 124601 entity queries, 6201 (subject, basis) pairs, 93 recorded of 1282 positions, 127 s)

| arm | pulls checked | (subject, basis) keys | mismatched pulls |
| --- | --- | --- | --- |
| a0 | 4097 | 1628 | 0 |
| x1 | 4000 | 1533 | 0 |
| h1 | 100097 | 6201 | 0 |

Cross-arm digest mismatches: 0; pull errors {"a0":0,"x1":0,"h1":0}; gate routes {"a0":{"source":4000},"x1":{"source":4000},"h1":{"current-h1":100000}}

### Single-client pull latency, weighted mix at the current basis (ms)

| stage | a0 p50 | a0 p99 | x1 p50 | x1 p99 | h1 p50 | h1 p99 |
| --- | --- | --- | --- | --- | --- | --- |
| d1 | 626.69 | 4521.98 | 589.82 | 4587.52 | 0.68 | 10.49 |
| d3 | 811.01 | 2998.27 | 716.80 | 3129.34 | 0.58 | 12.03 |
| d10 | 1425.41 | 9043.97 | 1376.26 | 9895.93 | 0.94 | 18.43 |
| d10x | 1318.91 | 5210.11 | 1236.99 | 4915.20 | 0.81 | 12.22 |

### Per bucket (p50 / p99 ms)

| stage | arm | small | medium | large |
| --- | --- | --- | --- | --- |
| d1 | a0 | 352.25 / 1785.86 (n 202) | 1036.29 / 3670.01 (n 143) | 2031.62 / 5937.34 (n 55) |
| d1 | x1 | 313.34 / 1687.55 (n 202) | 995.33 / 3293.18 (n 143) | 1957.89 / 5728.46 (n 55) |
| d1 | h1 | 0.31 / 5.05 (n 202) | 1.46 / 10.49 (n 143) | 3.07 / 27.45 (n 55) |
| d3 | a0 | 348.16 / 1335.30 (n 192) | 1122.30 / 2457.60 (n 142) | 1966.08 / 3559.32 (n 66) |
| d3 | x1 | 354.30 / 1294.34 (n 192) | 1056.77 / 2867.20 (n 142) | 2048.00 / 3788.58 (n 66) |
| d3 | h1 | 0.27 / 4.00 (n 192) | 1.15 / 9.28 (n 142) | 2.64 / 15.70 (n 66) |
| d10 | a0 | 667.65 / 2441.22 (n 200) | 1966.08 / 6160.38 (n 130) | 3391.49 / 11672.75 (n 70) |
| d10 | x1 | 622.59 / 2736.13 (n 200) | 1900.54 / 7536.64 (n 130) | 3293.18 / 16025.22 (n 70) |
| d10 | h1 | 0.34 / 2.75 (n 200) | 1.69 / 18.43 (n 130) | 4.70 / 23.92 (n 70) |
| d10x | a0 | 610.30 / 1777.66 (n 204) | 1966.08 / 4423.68 (n 129) | 3817.47 / 6239.02 (n 67) |
| d10x | x1 | 598.01 / 2007.04 (n 204) | 1925.12 / 5111.81 (n 129) | 3866.62 / 7157.30 (n 67) |
| d10x | h1 | 0.34 / 3.92 (n 204) | 1.46 / 12.93 (n 129) | 3.44 / 17.61 (n 67) |

### Per hop class (p50 / p99 ms)

| stage | arm | hop 3 | hop 4 | hop 6 |
| --- | --- | --- | --- | --- |
| d1 | a0 | 548.86 / 3670.01 | 737.28 / 5210.11 | 626.69 / 4685.82 |
| d1 | x1 | 544.77 / 3293.18 | 614.40 / 4882.43 | 565.25 / 3571.71 |
| d1 | h1 | 0.68 / 13.50 | 0.71 / 12.29 | 0.56 / 9.34 |
| d3 | a0 | 733.18 / 3325.95 | 831.49 / 3211.26 | 880.64 / 2539.52 |
| d3 | x1 | 671.74 / 3342.34 | 798.72 / 3129.34 | 782.34 / 2785.28 |
| d3 | h1 | 0.47 / 12.03 | 0.74 / 12.86 | 0.59 / 10.94 |
| d10 | a0 | 1261.57 / 8454.14 | 1286.14 / 8126.46 | 1646.59 / 9437.18 |
| d10 | x1 | 1269.76 / 7929.85 | 1179.65 / 8290.30 | 1540.10 / 11075.58 |
| d10 | h1 | 0.96 / 18.69 | 0.88 / 13.89 | 0.93 / 18.43 |
| d10x | a0 | 1122.30 / 5079.04 | 1441.79 / 5406.72 | 1433.60 / 5013.50 |
| d10x | x1 | 1089.54 / 4718.59 | 1490.94 / 5111.81 | 1351.68 / 5144.57 |
| d10x | h1 | 0.60 / 13.38 | 0.88 / 8.51 | 0.96 / 12.93 |

### Flatness on the matched sample (one pull per subject per arm; p50 / p99 ms; ratio to d1)

| stage | a0 p50 / p99 (p99 x d1) | x1 p50 / p99 (p99 x d1) | h1 p50 / p99 (p99 x d1) |
| --- | --- | --- | --- |
| d1 | 552.96 / 2424.83 (1.00) | 520.19 / 2473.98 (1.00) | 0.29 / 9.54 (1.00) |
| d3 | 868.35 / 3260.41 (1.34) | 819.20 / 2752.51 (1.11) | 0.39 / 8.32 (0.87) |
| d10 | 1835.01 / 6062.08 (2.50) | 1777.66 / 5799.94 (2.34) | 0.68 / 11.26 (1.18) |
| d10x | 1687.55 / 5210.11 (2.15) | 1622.02 / 4980.73 (2.01) | 0.52 / 9.73 (1.02) |

### Bytes read per pull (matched sample)

| stage | arm | engine CPU ms/pull | page faults/pull | XTDB rows read/pull | pages used/pull | files used/pull | H1 rows / bytes examined |
| --- | --- | --- | --- | --- | --- | --- | --- |
| d1 | a0 | 571.15 | 9315 | 496570 | 908.8 | 25.6 | - |
| d1 | x1 | 687.76 | 9465 | 496570 | 908.8 | 25.6 | - |
| d1 | h1 | 0.11 | 4 | - | - | - | 385 / 16499 |
| d3 | a0 | 1017.98 | 10426 | 1535408 | 2727.1 | 30.7 | - |
| d3 | x1 | 1002.98 | 10420 | 1535408 | 2727.1 | 30.7 | - |
| d3 | h1 | 0.09 | 4 | - | - | - | 389 / 16667 |
| d10 | a0 | 2084.55 | 13251 | 4568007 | 8573.2 | 46.0 | - |
| d10 | x1 | 2342.03 | 13252 | 4568007 | 8573.2 | 46.0 | - |
| d10 | h1 | 0.08 | 4 | - | - | - | 403 / 17255 |
| d10x | a0 | 2179.22 | 13821 | 5308834 | 8744.4 | 46.0 | - |
| d10x | x1 | 2313.72 | 13859 | 5308834 | 8744.4 | 46.0 | - |
| d10x | h1 | 0.82 | 4 | - | - | - | 413 / 17788 |

### Closed loop (best level per arm and stage)

| stage | arm | level | pulls/s | p50 ms | engine cores | pulls per engine CPU-s | pulls/s per quota core | host cores | pulls per host CPU-s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d1 | a0 | 4 | 1.7 | 2113.53 | 1.88 | 0.9 | 0.8 | 0.04 | 41 |
| d1 | x1 | 4 | 1.8 | 1818.62 | 1.86 | 1.0 | 0.9 | 0.07 | 25 |
| d1 | h1 | 4 | 20108.0 | 0.03 | 0.02 | 907035.4 | 10054.0 | 0.98 | 20597 |
| d10 | a0 | 1 | 0.8 | 1236.99 | 1.10 | 0.7 | 0.4 | 0.01 | 120 |
| d10 | x1 | 4 | 0.7 | 3997.70 | 1.71 | 0.4 | 0.3 | 0.04 | 16 |
| d10 | h1 | 4 | 20700.6 | 0.03 | 0.01 | 1499541.2 | 10350.3 | 0.95 | 21788 |

### Gate latency at concurrency (p50 / p99 ms)

- d1: a0 4456.45 / 16908.29; x1 4390.91 / 15138.82; h1 0.09 / 2.78 (25000 pulls, 2581 s, settle {"label":"d1","before":{"jobs":0,"done":47,"blocks":8},"finishBlock":true,"after":{"jobs":0,"done":52,"blocks":9},"blockSeen":true,"polls":3,"compactorJobsAvailable":0,"waitS":10.7852275390625})
- d3: a0 4390.91 / 9502.72; x1 4456.45 / 8978.43; h1 0.06 / 2.59 (25000 pulls, 2217 s, settle {"label":"d3","before":{"jobs":0,"done":54,"blocks":13},"finishBlock":true,"after":{"jobs":0,"done":60,"blocks":14},"blockSeen":true,"polls":3,"compactorJobsAvailable":0,"waitS":10.514467529296875})
- d10: a0 8585.22 / 22282.24; x1 8519.68 / 21102.59; h1 0.09 / 4.86 (25000 pulls, 4400 s, settle {"label":"d10","before":{"jobs":0,"done":67,"blocks":19},"finishBlock":true,"after":{"jobs":0,"done":72,"blocks":20},"blockSeen":true,"polls":3,"compactorJobsAvailable":0,"waitS":10.78446484375})
- d10x: a0 10616.83 / 18350.08; x1 10485.76 / 18481.15; h1 0.09 / 4.32 (25000 pulls, 5400 s, settle {"label":"d10x","before":{"jobs":0,"done":74,"blocks":30},"finishBlock":true,"after":{"jobs":0,"done":80,"blocks":31},"blockSeen":true,"polls":3,"compactorJobsAvailable":0,"waitS":10.637992919921874})

### Eligibility

```json
{
 "aboveW": {
  "routeBefore": "fallback:above-watermark",
  "msBefore": 4632.917374998331,
  "caughtUp": 1,
  "routeAfter": "current-h1"
 },
 "steadyFollower": {
  "seconds": 30,
  "reads": 2,
  "routes": {
   "follower": {
    "fallback:above-watermark": 2
   },
   "writer": {
    "current-h1": 2
   }
  },
  "fallbackShare": {
   "follower": 1,
   "writer": 0
  },
  "positionsBehindAtRead": {
   "mean": 1,
   "max": 1
  }
 },
 "consumerCut": {
  "cutS": 60,
  "reads": 7,
  "routesDuringCut": {
   "fallback:above-watermark": 7
  },
  "fallbackShare": 1,
  "catchUpMs": 8393.04150390625,
  "routeAfter": "current-h1"
 },
 "regression": {
  "routeBefore": "current-h1",
  "routeNewerAfterRegression": "fallback:above-watermark",
  "routeOlderAfterRegression": "current-h1"
 },
 "belowH": {
  "horizonPosition": 1079,
  "purgedRows": 4696,
  "routes": {
   "below": {
    "fallback:below-horizon": 68
   },
   "atOrAbove": {
    "current-h1": 14
   }
  }
 }
}
```

H1 table: {"watermark":1282,"horizon":1079,"entities":125569,"rows":412549,"live":396113,"retracted":16436,"approxBytes":50787060,"strictInstants":true,"poisoned":null,"pending":0,"counters":{"applied":1282,"buffered":0,"duplicates":0,"purgedRows":4696,"instantOrderViolations":0,"applyMs":3129.806169011659,"applyMaxMs":188.5144169999985,"appliedRows":438377}}
