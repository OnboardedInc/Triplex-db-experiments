# T4 diagnostic tables

Status: RUNNING. Source: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/tx2-dxb4-full-1794272803358/ns-report.json

Final driver analysis did not run. All bars, correctness totals, O-REPLAY and scheduled-offer latency histograms are unavailable; missing values are not zero or passing.

## Phases

Read/commit/lag values below are milliseconds. The queue is sampled at phase start; histogram windows exclude settling.

| Phase | Readers | Trace s | Pending | Read p50 / p99 | Goodput/s | Commit p50 / p99 | Feed lag p50 / p99 | Read errors / violations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warmup | 16 | 0.002 | 0 | — / — | — | — / — | — / — | — / — |
| baseline | 0 | 15.002 | 0 | — / — | — | — / — | — / — | — / — |
| L1 | 1 | 60.004 | 0 | — / — | — | — / — | — / — | — / — |
| L4 | 4 | 105.006 | 1 | — / — | — | — / — | — / — | — / — |
| L16 | 16 | 150.008 | 559 | — / — | — | — / — | — / — | — / — |
| L64 | 64 | 195.009 | 447 | — / — | — | — / — | — / — | — / — |
| L256 | 256 | 240.01 | 0 | — / — | — | — / — | — / — | — / — |
| L1024 | 1024 | 285.013 | 0 | — / — | — | — / — | — / — | — / — |

## P2 bandsAll

| Facts | Count | p50 ms | p99 ms |
| --- | --- | --- | --- |
| 5-10 | — | — | — |
| 11-25 | — | — | — |
| 26-50 | — | — | — |

## P2 bandsSteady

| Facts | Count | p50 ms | p99 ms |
| --- | --- | --- | --- |
| 5-10 | — | — | — |
| 11-25 | — | — | — |
| 26-50 | — | — | — |

## P2 bandsBurst

| Facts | Count | p50 ms | p99 ms |
| --- | --- | --- | --- |
| 5-10 | — | — | — |
| 11-25 | — | — | — |
| 26-50 | — | — | — |

## P2 bandsAtL256

| Facts | Count | p50 ms | p99 ms |
| --- | --- | --- | --- |
| 5-10 | — | — | — |
| 11-25 | — | — | — |
| 26-50 | — | — | — |

## P2 accounting and correctness

```json
{}
```

## P3 complete counters

```json
{
  "status": "NOT-AVAILABLE",
  "reason": "driver interrupted before final analysis"
}
```

## P4 numbers

```json
{
  "status": "NOT-AVAILABLE",
  "reason": "driver interrupted before final analysis"
}
```

## P5 numbers

```json
{
  "status": "NOT-AVAILABLE",
  "reason": "driver interrupted before final analysis"
}
```

No driver bars were emitted: final analysis did not run. No PASS/MISS verdicts are available.

## Every driver bar

These are the driver's local verdicts. A failing/invalid run is not qualified by isolated true rows.

| Priority / bar | Observed | Target | Driver pass | Note |
| --- | --- | --- | --- | --- |

## Complete correctness, oracle and invalid reasons

```json
{
  "writer": null,
  "correctness": null,
  "oracle": null,
  "client": null,
  "feedFailure": null,
  "invalidReasons": null,
  "maintenance": null
}
```

## Actual main-thread HTTP timing headers

Successful requests only; observations cover writer, feed and auxiliary main-thread clients. Worker reads are excluded. Missing gateway headers remain missing.

| Route | Count | Wall p50 / p99 ms | Gateway p50 / p99 ms | d/transact p50 / p99 ms |
| --- | --- | --- | --- | --- |
| basis | 2846 | 133.324 / 845.97 | — / — | — / — |
| begin | 718 | 97.666 / 807.733 | 9.613 / 575.102 | — / — |
| command | 90 | 121.376 / 822.619 | 0.045 / 82.136 | — / — |
| journal | 90 | 106.407 / 577.456 | 0.095 / 77.016 | — / — |
| operation | 2528 | 122.95 / 686.761 | — / — | — / — |
| reach | 2633 | 109.706 / 736.555 | 0.435 / 162.53 | — / — |
| read | 12979 | 198.377 / 1920.409 | — / — | — / — |
| release | 81 | 103.01 / 246.1 | — / — | — / — |
| request-index | 5 | 3413.719 / 5733.49 | — / — | — / — |
| transact | 2917 | 419.713 / 1718.504 | 263.681 / 1511.813 | 246.67 / 1458.457 |
| transactions | 12 | 202.648 / 203.854 | 200.626 / 201.249 | — / — |

