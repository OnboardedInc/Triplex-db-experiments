# Predictions for the remaining deep-account campaign

These forecasts were recorded during the 10,000-person reader retry and before items 2–5. Engineering ranges below are predictions. The measured tables use the existing sample counts and 90% intervals. Item 1 already had two completed zero-reader measurements, so it has no retrospective prediction.

| Item | Forecast before execution | Observation |
| --- | --- | --- |
| 1 · 10,000 people | In progress when predictions were requested. | arm-d19-i1-zero-a · commit p99 69.12 · 56505 [65.28, 72.70] ms, 594.29 database B/current fact. arm-d19-i1-reader-a · incomplete. arm-d19-i1-zero-b · commit p99 87.04 · 56505 [82.43, 94.21] ms, 593.30 database B/current fact. arm-d19-i1-reader-b · second reader failure at the 64 GiB collector limit after 381,428,503 checkpointed reads. |
| 2 · 100,000 people | Single-account commit p99 75–190 ms. GROWTH's narrower zero-reader estimate is 65–160 ms, with p50 5–9 ms, 0.9–2.6 SQL reads per acknowledged save and 520–850 PostgreSQL bytes per current fact. I expect the page-guard release to exceed one second. | PostgreSQL used 723.42 bytes/fact in one verified seed. On the separate field-save tape, p99 was 33.02–74.24 ms across the eight cells, with 525–7,050 ACKs per cell. Serial SQL reads per save and page-guard activation remain unmeasured on this rung. [Measured cells](DECISION-RESULTS.md) |
| 3 · ten accounts | I expect one queue to sustain about 150 saves/s ungrouped and 200 grouped under overload. My transfer ranges for the field-save trial are 120–185 and 160–250 respectively. At nine hot neighbours I predict quiet commit p99 at 12–30× its alone value ungrouped. I expect both modes to carry 35/s steady and neither to sustain a 394/s coincident peak for a full minute without backlog. I expect the staggered peak to disturb the quiet account less. | arm-p6-i1-seed-a · incomplete. arm-p6-i1-pool-staggered-a · incomplete. |
| 4 · 100 small accounts | I expect 100/100 logical accounts to open in the pooled layout. Opening 100 separate databases is a risk under the shared heap cap. My prediction is a first refusal between 50 and 100 inclusive, or 100 successful opens refutes it. QUEUE forecasts 3.15–3.40 acknowledged saves/s and a quiet commit ratio of 0.90–1.25× in the pooled busy-with-low window. | Pending. |
| 5 · one million people | LOAD forecasts 10.8 hours (9.7–12.7) to seed. GROWTH forecasts 520–850 PostgreSQL bytes/current fact, 1.5–4.5 SQL reads per acknowledged save, 25–65% primary expiry and surviving p99 of 25–34 s on the original synchronized schedule. I expect 6–45 s mean late index builds and 10–100 ms p95 adoption pauses. | Pending. |

Ten accounts at the observed all-hours mean imply about 49 saves/s. The per-active-minute median gives 35/s, the sustained p99 minute gives 235/s and simultaneous peak minutes give 394/s. Capacity forecasts count distinct durable logical saves. An expired primary is an overload observation. Quiet commit, read and feed p99 ratios use the same account alone on the same source and group setting. Record observed offered rate and ACK goodput separately, and leave any threshold between measured levels as a bracket. Each prediction is refuted by a correctly bound result outside its stated range. A missing required observation leaves it unresolved.

The ranges draw on the dated QUEUE, GROWTH and LOAD analyst forecasts. The capacity ranges transfer an eight-fact saturation experiment to a workload with smaller field edits. The 100-database opening range is my own estimate.

## Restart with bounded readers

Forecasts below use the new order. An observation is entered alongside its original forecast when that item finishes.

| Item | Forecast before execution | Result |
| --- | --- | --- |
| P6.1 · ten deep accounts | One queue saturates around 150 offered saves/s with grouping off and 200/s with grouping on. I expect quiet commit p99 at 12–30× alone under nine hot neighbours, or 2–6× with verified fair turns. The 35/s steady case should keep up. | arm-p6-i1-seed-a · 16,245,050 seed facts in 56.67 minutes, 730.45 database bytes per fact. arm-p6-i1-pool-staggered-a · exit-code. |
| P6.2 · existing zero controls | I expect the larger transaction or serial storage work to explain at least 20 ms of the observed 50.93 ms p99 gap. Test stage distributions and aligned samples separately. | SQL reads rose from 0.277 to 0.733 per commit. Serial tx-with p99 rose by 1.96 ms, while the largest mean increase in the matched slowest percentile was 88.46 ms before gateway entry. The predicted 20 ms serial-stage contribution was unsupported. [Anatomy](COMMIT-ANATOMY.md) |
| P6.3 · 100,000 people | One account has 75–190 ms commit p99. Page-guard activation exceeds one second. | The later field-save pair measured 63.23 and 46.85 ms at 39.4 saves/s without and with 64 readers, respectively, with 2,364 ACKs each. The peak 90% intervals were 42.49–71.17 and 31.87–59.90 ms. The guarded release is unmeasured here. [Measured cells](DECISION-RESULTS.md) |
| P6.4 · hundred small accounts | Pooled busy-with-low goodput is 3.15–3.40 saves/s and quiet p99 is 0.90–1.25× alone. I expect 100 logical accounts to open in one database. | Pending. |
| P6.5 · one million people | The pooled seed takes 9.7–12.7 hours at 520–850 PostgreSQL bytes per current fact. | Pending. |

The million-person seed budget projects 47.90 GiB of memory and 350.30 GiB of free disk, including the volume, simultaneous PostgreSQL dump and reserve. It scales the observed 100,000-person pooled seed’s 1.64 GiB client peak, 12.90 GiB of additional volume and 11.94 GiB image, with the measured arm’s headroom rules. The 10,000-person live client’s 8.31 GiB peak, scaled by fact count, would imply more than 900 GiB at one million people. That extrapolation rules out relying on a full in-memory copy at the measured per-fact cost. The bounded live arms need an actual measurement after seeding.

The original staggered arm had pre-dispatch expiry at 175/s after none through 155/s, compared with the 150/s forecast. At 35/s all 10,500 offers were acknowledged in the window and account 1’s commit p99 was 2.51× alone. Matched read and feed ratios remain unmeasured. [Staggered capacity](STAGGERED-CAPACITY.md)

## Full-size placement screen

Pre-run engineering ranges for the named 1–3 business-field tape. Cells are two 90-second repetitions at each rate with 60 seconds of offered reads in each repetition. Each repeat has its own 90-second quiet control. The quiet account keeps 3.5 saves/s. At total 235 and 394/s the other nine are slightly hotter than the observed individual rates. The test preserves aggregate demand with a quiet observer, so 394 here describes a sentinel stress test. The preceding staggered arm remains a separate write-capacity reading.

Each table cell gives expected in-window durable saves/s, completed p50/p99 ms, and quiet commit p99 / alone. Estimates use CEILING, DEEPTAIL and W1's tested compact and prepared writer, with a larger working-set allowance. Quiet read and feed snapshots are compared independently. A ratio from an incomplete cell is descriptive. The report will retain all losses and each denominator.

| Offered saves/s | 10k/account pooled, W1 bounded | 100k/account pooled current | 100k/account pooled prepared | 100k/account split current | 100k/account split prepared |
| ---: | --- | --- | --- | --- | --- |
| 35 | 34.7–35; 5–9/28–58; 1.0–1.4×<br>Observed 35.0/s (n=3149), 6.30/288.77 ms and 35.0/s (n=3149), 4.22/81.41 ms. Quiet save p99 3.77× (n=630/630, 90% [1.75, 5.88]). [Cell results](DECISION-RESULTS.md) | 34.5–35; 6–11/46–105; 1.0–1.9× | 34.5–35; 5–10/35–83; 1.0–1.6× | 34.5–35; 6–11/40–92; 1.0–1.7× | 34.5–35; 5–10/32–75; 1.0–1.5× |
| 50 | 49–50; 5–10/35–75; 1.05–1.4×<br>Observed 50.0/s (n=4500), 3.54/84.99 ms and 50.0/s (n=4500), 6.91/643.07 ms. Quiet save p99 4.31× (n=630/630, 90% [2.48, 10.19]). [Cell results](DECISION-RESULTS.md) | 49–50; 7–13/60–130; 1.2–2.4× | 49–50; 6–12/42–100; 1.1–1.8× | 49–50; 6–12/45–105; 1.0–1.9× | 49–50; 5–11/35–88; 1.0–1.7× |
| 235 | 175–215; 500–10000/3000–28000; 3–8×<br>Observed 234.7/s (n=21127), 102.91/5701.63 ms and 201.6/s (n=18140), 2965.50/30277.63 ms. Quiet save p99 13.76× (n=630/630, 90% [8.91, 17.39]). [Cell results](DECISION-RESULTS.md) | 145–195; 2500–16000/18000–33000; 4–18× | 215–235; 12–1500/80–15000; 2–8× | 195–235; 15–3000/150–16000; 1.4–8× | 220–235; 8–500/65–3500; 1.3–5× |
| 394 | 175–220; 6000–24000/22000–34900; 4–18×<br>Observed 268.6/s (n=24177), 10092.54/30539.78 ms and 232.6/s (n=20932), 19005.44/31326.21 ms. Quiet save p99 14.53× (n=630/630, 90% [9.47, 17.48]). [Cell results](DECISION-RESULTS.md) | 145–205; 9000–26000/26000–34900; 8–30× | 210–305; 3000–23000/18000–34900; 3–15× | 215–335; 3500–20000/14000–33000; 2–16× | 280–390; 50–11000/500–25000; 1.5–12× |

Alone I expect 3.45–3.50 durable saves/s, save p50 4–9 ms and p99 25–80 ms across the two footprints. At 35 and 50/s I expect zero expiry and under 0.5 s drain, with read/feed p99 ratios of 1.0–1.3×. At 235 and 394/s I expect at least one pooled result to miss the write or quiet bars, with 0–30 s of drain and 1.1–4× surviving read/feed ratios. The higher native rate remains unproved unless an exact 620/s cell also holds the bars.

Forecast one 162,456,470-fact image at 6,500 verified ingested facts/s, 6.94 h to commit, or 7.78 h at HA1's 5,800/s large-rung estimate. Full feed and scoped readback add time separately. One logical fixture produces two physical images because a pooled Datomic database cannot be partitioned by restoring a PostgreSQL dump. Provisional time from the small seed through both large layouts is 22–30 hours including archive, restore and exact checks, or about USD 24–33 at USD 1.09/h. The old full-length comparisons, standalone activation and 100-database arm are deferred in this spending window. Their results cannot reverse a measured capacity miss on the owner’s current question.

| Image | Forecast for ingest |
| --- | --- |
| Small pooled image | At 5,800–6,500 facts/s, 42–47 min for 16,245,050 facts.<br>Observed 0.68 h at 6598.71 facts/s. arm-d7-wfix-pilot-seed. |
| Single-account image | 16,245,647 facts at 5,800–6,800/s, or 40–47 min before independent verification.<br>Observed 0.69 h at 6540.77 facts/s. arm-d7-single-seed. |
| Full pooled image | At 5,800–6,500 facts/s, 6.94–7.78 h for 162,456,470 facts. |
| Full split image | At 5,800–6,500 total facts/s, 6.94–7.78 h for the same 162,456,470 facts placed across two databases. |

The 16.25-million-fact predecessor needed 40.0 minutes to ingest and 36.5 more to verify 8,701 claims and feed frames. At equal per-frame rates, full verification adds about 6.1 hours per million-person image after ingest. Before launching the held placement study I now expect 29–34 hours for both layouts, including the audited pilot, restores and timed cells, at USD 31.61–37.06. The guard remains 38 hours and USD 41.42. This extrapolation uses one seed.

The sealed single account measured 41.4 minutes of ingest, 37.0 minutes of verification and 6.0 minutes to seal. Its 11.76 GiB archive took about eight minutes to restore in the first setup. At equal rates, two full images take about 28 hours to ingest, verify and seal. Four full restores add about 5.3 hours. The guarded placement plan is now 35–39 hours at USD 38.15–42.51, with a 40-hour ceiling (USD 43.60). At 723.42 PostgreSQL bytes/fact, one full volume projects to 109.45 GiB. Two retained images project to 235.1 GiB. The host had 649.5 GiB free during the single-account restore. The live admission rechecks free space before each large seed or restore.

The audited pilot carried 34.99 and 34.99 saves/s at the 35/s dose. Quiet save p99 was 3.77× alone (630/630, 90% interval 1.75–5.88) and quiet read p99 was 1.37× (7,680/7,680, 90% interval 0.92–1.70). At 235/s the quiet save ratio reached 13.76× (630/630, 90% interval 8.91–17.39), above the 2–6× grouped forecast. One 235/s repeat had 518 expiries (494 behind another save to the same subject). At 394/s the two repeats delivered 268.63 and 232.58 saves/s in-window, with 4,335 and 7,800 expiries and 25.04 and 32.09 seconds of ACK drain. The sender's per-subject ordering accounted for most expiries. The native-only ceiling remains unresolved. [Both repeats and their intervals](DECISION-RESULTS.md)

Before full admission the host had 623.41 GiB of free disk and 91.34 GiB available memory. PostgreSQL and the transactor each have a 6 GiB cgroup limit. The two gateways each have 4 GiB. Both layouts use those same caps and a 1,280 MiB Datomic object cache. The two projected archives and one active 109.45 GiB volume account for 344.55 GiB before WAL and scratch space.

## Single full-size account first

The two field-save arms start from the same verified image. They use the same offers for 150, 120, 300 and 60 s. The reader arm has 64 seats on two cores and 600 active seconds over its four cells. The projected single-account job takes 70–105 min, costing USD 1.27–1.91. The completed 83-minute predecessor seed revises this estimate to 110–125 min with both restored arms, or USD 2.00–2.27. The full placement budget above is held until the single-account results are reported. Q106f sets tiered deployment pending a new owner ruling.

| Cell | Exact offered rate | Zero-reader forecast | Bounded-reader forecast |
| --- | ---: | --- | --- |
| Single 3.5 | 3.5/s | 3.48–3.5 ACK/s and p50/p99 5–9 / 28–65 ms.<br>Observed 3.50/s (n=525), 10.37/66.56 ms. [Cell results](DECISION-RESULTS.md) | 3.48–3.5 ACK/s and 5–10 / 32–85 ms.<br>Observed 3.50/s (n=525), 11.26/74.24 ms. [Cell results](DECISION-RESULTS.md) |
| Single 4.9 | 4.9/s | 4.87–4.9 ACK/s and 5–9 / 28–70 ms.<br>Observed 4.90/s (n=588), 4.70/34.81 ms. [Cell results](DECISION-RESULTS.md) | 4.86–4.9 ACK/s and 5–10 / 33–90 ms.<br>Observed 4.90/s (n=588), 4.93/33.79 ms. [Cell results](DECISION-RESULTS.md) |
| Single 23.5 | 23.5/s | 23.4–23.5 ACK/s and 5–10 / 30–85 ms.<br>Observed 23.50/s (n=7050), 3.66/33.02 ms. [Cell results](DECISION-RESULTS.md) | 23.3–23.5 ACK/s and 6–13 / 45–105 ms.<br>Observed 23.50/s (n=7050), 3.57/34.05 ms. [Cell results](DECISION-RESULTS.md) |
| Single 39.4 | 39.4/s | 39.0–39.4 ACK/s and 6–11 / 40–115 ms.<br>Observed 39.40/s (n=2364), 3.46/63.23 ms. [Cell results](DECISION-RESULTS.md) | 38.5–39.4 ACK/s and 7–14 / 55–130 ms.<br>Observed 39.40/s (n=2364), 3.34/46.85 ms. [Cell results](DECISION-RESULTS.md) |

All eight goodput observations landed in their forecast ranges. Five p99 estimates landed in range. Both first-window medians were above forecast, and the other six were below it. At 3.5/s the first-window native compute p99 was 47.62 ms without readers and 55.30 ms with readers (525 saves per condition). At 39.4/s the corresponding values were 12.48 and 11.90 ms (2,364 saves per condition). Each condition ran once in rate order. These measurements leave warm-up and rate effects unresolved. [Stage intervals](DECISION-RESULTS.md)
