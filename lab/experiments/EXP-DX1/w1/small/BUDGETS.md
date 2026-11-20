# Estimated service budgets and a quiet account

Each case replays 240 seconds of deterministic person sessions. One account offers 3.5 saves/s against nine ready live accounts at the balance of the column's offered rate. An always-ready bulk request takes its own turn when the live queue empties. Each quiet baseline replays its identical offers alone. Each cell gives short-tail / saved-tail estimates. Short tails cap additional per-save work at 1.25 ms. Saved tails retain 65% of the observed above-median busy gap. Positive excess work belongs to the same physical group. The saved end-to-end baseline samples supply the allowance outside the gate.

| Predicted budget ms | Saturated saves/s | Saves/s inside the 235/s window | Quiet p99 ratio 50/s | 100/s | 235/s |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 6.1 | 176 / 157 | 176 / 157 | 1.16 / 1.44 | 1.44 / 2.51 | 4.86 / 5.60 |
| 7 | 176 / 157 | 176 / 157 | 1.13 / 1.55 | 1.44 / 2.47 | 4.86 / 5.67 |
| 8 | 207 / 182 | 207 / 181 | 1.23 / 1.41 | 1.25 / 1.65 | 3.76 / 4.98 |
| 9 | 222 / 193 | 221 / 192 | 1.24 / 1.42 | 1.26 / 1.73 | 3.66 / 4.77 |
| 10 | 223 / 194 | 223 / 194 | 1.24 / 1.39 | 1.28 / 1.65 | 3.63 / 5.39 |
| 12 | 243 / 209 | 235 / 208 | 1.28 / 1.52 | 1.27 / 1.54 | 2.99 / 5.28 |
| 16 | 260 / 221 | 235 / 221 | 1.36 / 1.57 | 1.48 / 1.56 | 2.95 / 5.43 |
| 24 | 276 / 233 | 235 / 232 | 1.46 / 1.73 | 1.48 / 1.89 | 3.04 / 5.80 |
| 32 | 279 / 235 | 235 / 234 | 1.73 / 1.92 | 1.82 / 2.14 | 3.16 / 5.97 |
| 64 | 279 / 235 | 235 / 234 | 2.64 / 3.05 | 2.79 / 3.20 | 3.20 / 5.91 |

With short tails and no bulk, 50/s is 1.018× at 6.1 ms and 100/s is 1.182× at 8 ms. The 235/s live-only search checks all 43 distinct packing thresholds for the modeled two save costs and an eight-member limit. Its best short-tail ratio is 2.655× at 18.55 ms, sustaining 234.93/s inside the window. With competing bulk, 6.1–10 ms meet 1.25 in the short-tail 50/s case and 8 ms gives 1.245× at 100/s. The best stable short-tail ratio with bulk in the grid is 2.951× at 16 ms. Under saved tails no tested budget meets 1.25 at any of the three rates. At 235/s, 32–64 ms sustain about 234/s in the timed window and the smallest quiet ratios occur in cells that underdeliver more. The raw JSON holds exact ratios, drain and sample counts. Rates and tails remain forecasts.

The estimate includes requested bytes and prepared operation count. The scheduler prices a single atomic frame before admission and sums variable work into one already-ready group. It cannot preempt Datomic or a stalled SQL append. The model excludes stale-basis retry turns, reader and feed lag, and drift from larger caches. A stale group can take multiple individually admitted solo retries before the queue chooses again. Group CPU, maintenance and remote durability may add work the estimate did not include.
