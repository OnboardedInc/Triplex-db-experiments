# DX-B9 step A: original alternating arms

North star: P1 concurrent exact-cut reads and P2 durable commits. Diagnostic, not acceptance.

**Regression under the requested non-overlap rule:** frozen 4/64-reader goodput and dense commit p50. The twofold frozen loss and 1.7-second sparse tail were not reproduced. Host changes remain a material confounder; the source-level diagnosis is supported by fresh leaf/caller profiles, not by a claim that the host stayed quiet. The 256-reader and moving-read repeat ranges overlap.

A is gateway `19f5422d`; B is base `e0e6fa6e` (gateway bytes equal da77a50a). Both use the same current built TypeScript driver and layout `lean`. Every scope has the same 2,000-subject seed and 50,000 additional physical commits, with no manual index request. Keep-awake is false throughout.

| Hold | Arm | Phase | Pulls/s | Read p50 / p99 ms | Gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |
|---|---|---|---:|---:|---:|---:|---:|---|
| frozen-2 | A1 | random-4 | 4818.01 | 0.65 / 3.23 | 1.12 | 4284.91 | — / — | false |
| frozen-2 | A1 | random-64 | 6342.14 | 8.38 / 25.89 | 1.60 | 3959.84 | — / — | false |
| frozen-2 | A1 | random-256 | 5962.97 | 34.35 / 95.18 | 1.65 | 3622.72 | — / — | false |
| frozen-2 | B1 | random-4 | 4754.20 | 0.68 / 3.27 | 1.15 | 4150.90 | — / — | false |
| frozen-2 | B1 | random-64 | 5749.92 | 9.26 / 29.11 | 1.58 | 3638.75 | — / — | false |
| frozen-2 | B1 | random-256 | 5558.51 | 36.59 / 98.77 | 1.61 | 3446.75 | — / — | false |
| frozen-2 | A2 | random-4 | 4933.33 | 0.63 / 3.27 | 1.14 | 4346.43 | — / — | false |
| frozen-2 | A2 | random-64 | 6542.13 | 8.15 / 26.58 | 1.61 | 4061.41 | — / — | false |
| frozen-2 | A2 | random-256 | 5450.80 | 35.93 / 145.20 | 1.63 | 3345.51 | — / — | false |
| frozen-2 | B2 | random-4 | 3331.61 | 0.88 / 5.76 | 1.18 | 2825.34 | — / — | false |
| frozen-2 | B2 | random-64 | 4375.39 | 11.87 / 50.94 | 1.60 | 2739.64 | — / — | false |
| frozen-2 | B2 | random-256 | 4120.34 | 48.74 / 204.53 | 1.61 | 2561.68 | — / — | false |

## frozen-2: host observations

Before includes the --wait 20 samples; lock-acquired is the immediate pre-hold sample. The latter can differ after lock contention. A busy immediate sample is explicitly busy, not treated as quiet.

```json
// host-before.jsonl
{"at":"2026-11-10T17:50:57Z","load1":6.40,"swapUsedMB":15310.12,"otherCpuPercent":522,"callAppsCpuPercent":13,"quiet":false}
{"at":"2026-11-10T17:51:57Z","load1":4.46,"swapUsedMB":15118.12,"otherCpuPercent":183,"callAppsCpuPercent":9,"quiet":false}
{"at":"2026-11-10T17:52:57Z","load1":3.21,"swapUsedMB":14910.12,"otherCpuPercent":137,"callAppsCpuPercent":11,"quiet":true}
// host-lock-acquired.jsonl
{"at":"2026-11-10T17:52:57Z","load1":3.21,"swapUsedMB":14910.12,"otherCpuPercent":125,"callAppsCpuPercent":9,"quiet":true}
// host-after.jsonl
{"at":"2026-11-10T18:05:51Z","load1":11.29,"swapUsedMB":12923.38,"otherCpuPercent":296,"callAppsCpuPercent":52,"quiet":false}
```

| mixed-2 | A1 | backToBack | — | — / — | — | — | 6.97 / 53.62 | false |
| mixed-2 | A1 | quietPoisson | — | — / — | — | — | 13.32 / 106.18 | false |
| mixed-2 | A1 | readPoisson | 1122.80 | 183.53 / 1022.82 | 1.62 | 693.12 | 29.62 / 433.07 | false |
| mixed-2 | B1 | backToBack | — | — / — | — | — | 9.05 / 52.24 | false |
| mixed-2 | B1 | quietPoisson | — | — / — | — | — | 12.16 / 77.30 | false |
| mixed-2 | B1 | readPoisson | 1367.33 | 159.82 / 733.33 | 1.62 | 841.94 | 29.61 / 352.48 | false |
| mixed-2 | A2 | backToBack | — | — / — | — | — | 7.89 / 33.28 | false |
| mixed-2 | A2 | quietPoisson | — | — / — | — | — | 11.11 / 43.34 | false |
| mixed-2 | A2 | readPoisson | 1370.97 | 160.74 / 713.54 | 1.50 | 911.80 | 31.93 / 160.06 | false |
| mixed-2 | B2 | backToBack | — | — / — | — | — | 8.80 / 46.15 | false |
| mixed-2 | B2 | quietPoisson | — | — / — | — | — | 11.36 / 44.22 | false |
| mixed-2 | B2 | readPoisson | 1268.20 | 168.74 / 722.50 | 1.35 | 936.36 | 33.08 / 291.07 | false |

## mixed-2: host observations

Before includes the --wait 20 samples; lock-acquired is the immediate pre-hold sample. The latter can differ after lock contention. A busy immediate sample is explicitly busy, not treated as quiet.

```json
// host-before.jsonl
{"at":"2026-11-10T17:54:26Z","load1":5.14,"swapUsedMB":14686.06,"otherCpuPercent":149,"callAppsCpuPercent":6,"quiet":true}
// host-lock-acquired.jsonl
{"at":"2026-11-10T18:05:54Z","load1":10.95,"swapUsedMB":12923.38,"otherCpuPercent":394,"callAppsCpuPercent":90,"quiet":false}
// host-after.jsonl
{"at":"2026-11-10T18:23:02Z","load1":13.31,"swapUsedMB":12639.25,"otherCpuPercent":523,"callAppsCpuPercent":93,"quiet":false}
```

## Interpretation and limits

The sparse rows include the VM wake penalty (roughly 8–10 ms per hop). Dense rows are shown alongside them. Quiet-host absolute bars are not established: the frozen hold began quiet and ended busy; the moving hold began and ended busy. That moving hold waited for the lock after an earlier quiet precheck, so it did not repeat the full 20-minute wait after its immediate busy sample. This deviation is retained and prevents describing it as a quiet comparison.

Frozen B1 at 256 readers has 1,440 samples (112 without a gateway caller): 152 at PersistentArrayMap.indexOfObject -> reach/read-entity, 94 at Util.equals -> entity-cache/lookup. The candidate replaces the enlarged hot config map with a fixed-field record and composite vector key with generation-token/primitive-coordinate equality. No row, cut, revision witness or precondition is changed.

Mixed B1 write-gateway execution samples are sparse (127 dense, 29 quiet, 84 loaded); they do not establish a report-consumer write wait. storage/commit! does not await its report consumer after d/transact returns. Transactor samples have no captured gateway caller; those are counted rather than assigned a guessed gateway caller.

First failed hold `frozen-1` retains all raw phases, empty JFRs and the jcmd errors. Editing its running runner caused an outer exit 1 after the four phase reports had been copied. It remains failed and is not substituted for frozen-2. `mixed-1` was cancelled while waiting, before resources existed. New holds execute immutable captured runner copies.
