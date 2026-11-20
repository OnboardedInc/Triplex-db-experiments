# DX-INT1 forecasts before measurement

P7 projection from the 100,000 thin and 10,000 deep observations at `f06cd0a46`. The physical queue admits 2% in each case. Compare bytes added between the fixed activity snapshot and the post-import snapshot in each case. Absolute RSS includes a role's base process and its existing activity. These forecasts use the queued demand gateway profile and the physical transactor's 3 GiB heap.

| Role | 1,000,000 thin expected RSS / added B per untouched | 4,000,000 thin expected RSS / added B per untouched |
| --- | ---: | ---: |
| Reader | 205 MiB / 5 | 225 MiB / 1 |
| Read gateway | 315 MiB / 9 | 325 MiB / 2 |
| Write gateway | 340 MiB / 59 | 350 MiB / 15 |
| Transactor | 1,700 MiB / 1,070 | 2,300 MiB / 430 |
| PostgreSQL | 1,600 MiB summed RSS / 1,300 | 1,800 MiB summed RSS / 370 |

The reader and gateways are expected to meet 64 B at both full sizes under this method. The transactor and summed PostgreSQL RSS are expected to exceed it. The native caps do not cap committed JVM or total PostgreSQL process pages at the same number. The physical PostgreSQL proportional set is expected to be about 180 MiB at 1M and 205 MiB at 4M. Marginal gateway cost above 64 B over the last two local rungs would refute the current plateau forecast for that role. A 16 MiB fixed change costs about 17 B in the 1M case and 4 B at 4M. Smaller-sized resident changes need separate interpretation from the zero logical-person entries in those caches.

## Everything-on deep runs

Predictions for the frozen matched zero-reader and loaded pair, per rung on the physical host with six reader cores. The second profile uses field-sized saves and reports separate observations. A forecast of zero correctness errors is conditional on passing the native and producer/collector gates. P1 to P4 keep the existing eligibility and denominators. [Targets](../../../TARGETS.md) · [Bare-metal baseline](../bm1/REPORT.md) · [Deep baseline](../scale1/REPORT.md)

| Bar and frozen threshold | 10,000 deep forecast | 100,000 deep forecast |
| --- | --- | --- |
| P1 exact, hot-set ≥50%, split ≥10%, maintenance each 45 s | 0 mismatches, 65–85% hot, 10% split, 42–44/44 required bins | 0 mismatches, 65–85% hot, 10% split, 38–44/44 bins |
| P1 L256 goodput ≥L64, p99 ≤100 ms | 18–40k/s, ratio 0.90–1.13, p99 12–65 ms | 9–25k/s, ratio 0.83–1.11, p99 25–125 ms |
| P1 L256 writer ratio ≤1.25 and max ≤2 s | 1.08–1.55×, max 0.3–2 s | 1.15–1.80×, max 0.5–4 s |
| P1 stress goodput ≥0.9 of L256, commit ratio ≤2×, recovery within 60 s | 0.45–0.85×, 1.4–2.3×, 0–4 qualifying offsets | 0.35–0.78×, 1.5–3.0×, 0–3 qualifying offsets |
| P2 zero-reader all-command p99 context and L256 all-command p99 | 32–55 / 40–75 ms | 45–85 / 58–115 ms |
| P2 L256 5–10 and 11–25 facts p50 ≤10 ms, p99 ≤50 ms | 5–9/7–12 ms median, 34–58/40–75 ms p99 | 7–13/9–16 ms median, 50–90/60–110 ms p99 |
| P2 L256 26–50 facts p99 ≤100 ms with ≥500 | 55–90 ms, about 200 samples | 70–130 ms, about 200 samples |
| P2 exact readback, original duplicate and lost-ACK receipts, queue ≤2 s of offers, drain ≤60 s | 100% each, 1–4 steady queued commands, drain ≤15 s | 100% each, 2–8 steady queued commands, drain ≤30 s |
| P3 zero gaps, per-subject order and duplicate effects, exact resume, L256 p99 ≤250 ms | 0 each, exact resume, 35–160 ms | 0 each, exact resume, 55–320 ms |
| P4 weighted single-client p50 ≤5 and p99 ≤25 ms, largest p99 ≤50 ms, goodput ≥4,400/s | 0.2–1.5 / 5–35 ms, largest 18–55 ms, 2,500–5,000/s | 0.4–3 / 12–55 ms, largest 30–85 ms, 1,800–4,300/s |
| P4 depth 10 versus 1 p99 and response bytes each ≤1.1× | 0.9–1.35× time and 0.98–1.12× bytes | 0.95–1.55× time and 0.98–1.15× bytes |

At the field rate, predict 97–100% of valid saves completed within the 50/s plateau, with loaded p99 of 18–50 ms at 10k and 24–65 ms at 100k. At 235 offered/s expect 215–235 in-window completions/s and p99 of 60–180 ms on the survivors. At 394/s expect 215–310 in-window completions/s and a backlog. Late or missing offers count separately in every field cell. Keep actual assertion widths, retracts and all queue delays visible. These are tests of capacity and interference using the new field tape. The frozen profile alone can qualify the frozen bars.

The single-account pair will offer 3.5 and 4.9 saves/s outside bursts and 23.5 and 39.4/s in alternating bursts. Predict complete drain in both sizes and loaded ACK p99 of 15–45 ms at 10k or 20–65 ms at 100k. The ten-account numbers above remain a separate capacity forecast. Compatibility findings kept grouping and its queue policies out of the selected pair. The P4 byte range forecasts the client-observed response. The frozen engine-byte bar still requires an engine measurement.
