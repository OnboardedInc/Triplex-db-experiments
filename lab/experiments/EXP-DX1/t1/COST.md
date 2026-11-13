# Tracing cost

Same source, 10,000 subjects, zero readers; frozen first 200 seconds including the burst starting at 120 seconds. Order: off, full, full, off. Whole offer-to-finish latency remains the primary measure; transact-only is diagnostic.

| arm | n | p50 ms | p99 ms | transact p50 ms | transact p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| tx2-dxt1-cost-a-1-off | 3420 | 14.551025390625 | 77.633544921875 | 12.733154296875 | 54.36328125 |
| tx2-dxt1-cost-a-2-full | 3420 | 17.8291015625 | 84.65478515625 | 15.735107421875 | 64.410888671875 |
| tx2-dxt1-cost-a-3-full | 3420 | 18.873779296875 | 122.565673828125 | 16.654296875 | 98.31591796875 |
| tx2-dxt1-cost-a-4-off | 3420 | 15.169189453125 | 92.68994140625 | 13.199462890625 | 62.490234375 |

Delta uses the mean of each arm quantile (not a pooled percentile).

```json
{
  "p50Ms": {
    "off": 14.860107421875,
    "full": 18.3514404296875,
    "deltaMs": 3.4913330078125,
    "percent": 23.494668703895382
  },
  "p99Ms": {
    "off": 85.1617431640625,
    "full": 103.6102294921875,
    "deltaMs": 18.448486328125,
    "percent": 21.662880118111637
  },
  "transactP50Ms": {
    "off": 12.96630859375,
    "full": 16.1947021484375,
    "deltaMs": 3.2283935546875,
    "percent": 24.898324232724534
  },
  "transactP99Ms": {
    "off": 58.4267578125,
    "full": 81.3634033203125,
    "deltaMs": 22.9366455078125,
    "percent": 39.25709104280533
  }
}
```

Producer: `0c1fa43b93562e3774b09e18c9e351decc0741da`; frozen trace `aa8a7636ff027ab3`.

Canonical measurements and input/source receipts are in `~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-cost-a-*`.
The four arm report indexes in `runs/` carry their report/viewer checksums. This is an observed difference, not an isolated attribution
to one recorder or an acceptance PASS. The later summary-retention fix has no four-arm cost measurement.
