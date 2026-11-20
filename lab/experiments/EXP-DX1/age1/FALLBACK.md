# If calibration cannot fit one billion

Use the settled native starting count and the first completed calibration segment. Retain the original deadline, measured records, acknowledged cut and data directory. The fixed 1B command stops on a rate miss. Preserve its checkpoint and full logs. A smaller follow-up is a diagnostic and supplies no 1B seal or v0.1 scorecard input.

Reserve three hours for matched measurements and verified copies. Maximum additional records after calibration are `floor(rate × (deadline − now − reserve))`, with times in seconds. Add the records already acknowledged. Round down and check source SQL bytes, copy space and any remaining disk floor at that target. Recompute the forecast after each segment using the slower sustained rate if it falls. Use the existing prefix and budget clock. Keep a single held database throughout.

## Forecast for a 430 million record seed

| Calibration records/s | Maximum by 9.9 h | Diagnostic target | Seed multiple | Forecast with 3 h reserve | Cost at $1.09/h |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 8,000 | 628.72M | 620M | 1.44× | 9.60 h | $10.46 |
| 10,000 | 678.40M | 670M | 1.56× | 9.67 h | $10.54 |
| 12,000 | 728.08M | 720M | 1.67× | 9.71 h | $10.59 |
| 14,000 | 777.76M | 770M | 1.79× | 9.75 h | $10.62 |
| 16,000 | 827.44M | 800M | 1.86× | 9.42 h | $10.27 |

These figures budget from the beginning. Subtract actual setup, calibration overhead and any time lost to retries before selecting the next lower target. 800M needs at least 14.90k/s before overhead. At 16k/s the 800M choice leaves about 29 minutes beyond the three-hour reserve. A full doubling to 860M needs at least 17.31k/s before overhead, so none of these rates buys a doubling from 430M. If the seed already sits near 820M, 800M adds no evidence. If even the diagnostic fails the time or disk guard, keep the last verified checkpoint and stop.

Run the same fixed-width current, pinned and feed reads, same loads, index-overlap ledger, fresh peer and native copy checks. Take the settled per-index census at both ends if the original seed is available. The queued `2859d6b15` command accepts only 1B. A follow-up at the diagnostic target needs its own explicitly selected diagnostic command and cut validation before continuing the held prefix. Keep that run out of the 1B scorecard namespace.

## Predictions the smaller cut can test

| Prediction | What a diagnostic might establish | What remains open |
| --- | --- | --- |
| Per-index levels, leaf and directory counts and bytes | At the actual counts, a fourth level contradicts the prediction. Survey the exact root, directory and leaf totals. Near 800M, compare directly with the interpolated 0.82B row. | The 1B census and every larger cut. |
| Current point, fixed-history old pin, seven-entry feed and uniqueness/predecessor paths | A substantial increase in native leaf loads for equal result bytes, owner edit depth, width, index debt and cache treatment challenges the bounded-path prediction. | A 1.44–1.86× change and two cuts cannot reliably separate flat, logarithmic and mildly linear timing. Without matching fresh observations these are absolute endpoint checks only. |
| Index job | A matched incoming novelty batch and per-tier segment counts can show whether the job rewrites an entire tier. | A job with different debt or placement cannot establish a size law. |
| Fresh peer's first read | At equally settled cuts, separate connection replay, root bytes and leaf loads. A scan of all leaves would contradict the fixed-width model even at the smaller size. | This does not distinguish cold storage from a cold peer, or forecast the first miss at 1B. |
| Native copy, full verification and restore | With the same bandwidth and compression, test whether object counts and bytes scale with population. | A single copy confirms neither a timing law nor the longer recovery budget. |

The diagnostic stops at its measured cut. It never stands in for a 1B run. [Model and concrete falsifiers](GROWTH-MODEL.md)
