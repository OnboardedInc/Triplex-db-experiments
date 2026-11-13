# Tracing cost

Same source, 10,000 subjects, zero readers; frozen first 200 seconds including the burst starting at 120 seconds. Order: off, full, full, off. Whole offer-to-finish latency remains the primary measure; transact-only is diagnostic.

| arm | n | p50 ms | p99 ms | transact p50 ms | transact p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| tx2-dxt1-cost-b-1-off | 3420 | 13.931884765625 | 83.54296875 | 12.145263671875 | 58.14404296875 |
| tx2-dxt1-cost-b-2-full | 3420 | 19.814453125 | 131.68212890625 | 17.32861328125 | 96.483642578125 |
| tx2-dxt1-cost-b-3-full | 3420 | 18.47900390625 | 96.8408203125 | 16.322021484375 | 74.721435546875 |
| tx2-dxt1-cost-b-4-off | 3420 | 15.44091796875 | 155.013916015625 | 13.43115234375 | 118.36865234375 |

Delta uses the mean of each arm quantile (not a pooled percentile).

```json
{
  "p50Ms": {
    "off": 14.6864013671875,
    "full": 19.146728515625,
    "deltaMs": 4.4603271484375,
    "percent": 30.370456566731228
  },
  "p99Ms": {
    "off": 119.2784423828125,
    "full": 114.261474609375,
    "deltaMs": -5.0169677734375,
    "percent": -4.206097659572072
  },
  "transactP50Ms": {
    "off": 12.7882080078125,
    "full": 16.8253173828125,
    "deltaMs": 4.037109375,
    "percent": 31.568999914090167
  },
  "transactP99Ms": {
    "off": 88.25634765625,
    "full": 85.6025390625,
    "deltaMs": -2.65380859375,
    "percent": -3.0069322651854247
  }
}
```

Producer: `d7aeb0699071e22fc8499fb97ea91eaf58ce195d`; frozen trace `aa8a7636ff027ab3`.

Canonical measurements/input/source receipts: `~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-cost-b-*`.
Each arm has its report/viewer checksum index under `runs/`. All 3,420 primary commands completed in every arm.
The final p50 increase misses the cost aim. The p99 difference has substantial arm variation and does not prove an improvement.
4.037 ms of the observed 4.460 ms p50 increase sits inside transact; no ablation isolates Node instrumentation,
gateway serialization, JFR or PostgreSQL logging. Summary retains complete commits and reduces read-log volume;
it passed the 1k smoke but has no 10k cost measurement. Earlier source results remain in [COST-a.md](COST-a.md).
