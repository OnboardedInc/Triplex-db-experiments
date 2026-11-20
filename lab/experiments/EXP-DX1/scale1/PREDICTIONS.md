# Predictions for the remaining deep-account campaign

These forecasts were recorded during the 10,000-person reader retry and before items 2–5. Engineering ranges below are predictions. The measured tables use the existing sample counts and 90% intervals. Item 1 already had two completed zero-reader measurements, so it has no retrospective prediction.

| Item | Forecast before execution | Observation |
| --- | --- | --- |
| 1 · 10,000 people | In progress when predictions were requested. | arm-d19-i1-zero-a · commit p99 69.12 · 56505 [65.28, 72.70] ms, 594.29 database B/current fact. arm-d19-i1-reader-a · incomplete. arm-d19-i1-zero-b · commit p99 87.04 · 56505 [82.43, 94.21] ms, 593.30 database B/current fact. arm-d19-i1-reader-b · second reader failure at the 64 GiB collector limit after 381,428,503 checkpointed reads. |
| 2 · 100,000 people | Single-account commit p99 75–190 ms. GROWTH's narrower zero-reader estimate is 65–160 ms, with p50 5–9 ms, 0.9–2.6 SQL reads per acknowledged save and 520–850 PostgreSQL bytes per current fact. I expect the page-guard release to exceed one second. | Pending. |
| 3 · ten accounts | I expect one queue to sustain about 150 saves/s ungrouped and 200 grouped under overload. My transfer ranges for the field-save trial are 120–185 and 160–250 respectively. At nine hot neighbours I predict quiet commit p99 at 12–30× its alone value ungrouped. I expect both modes to carry 35/s steady and neither to sustain a 394/s coincident peak for a full minute without backlog. I expect the staggered peak to disturb the quiet account less. | Pending for both profiles, both layouts and grouping. |
| 4 · 100 small accounts | I expect 100/100 logical accounts to open in the pooled layout. Opening 100 separate databases is a risk under the shared heap cap. My prediction is a first refusal between 50 and 100 inclusive, or 100 successful opens refutes it. QUEUE forecasts 3.15–3.40 acknowledged saves/s and a quiet commit ratio of 0.90–1.25× in the pooled busy-with-low window. | Pending. |
| 5 · one million people | LOAD forecasts 10.8 hours (9.7–12.7) to seed. GROWTH forecasts 520–850 PostgreSQL bytes/current fact, 1.5–4.5 SQL reads per acknowledged save, 25–65% primary expiry and surviving p99 of 25–34 s on the original synchronized schedule. I expect 6–45 s mean late index builds and 10–100 ms p95 adoption pauses. | Pending. |

Ten accounts at the observed all-hours mean imply about 49 saves/s. The per-active-minute median gives 35/s, the sustained p99 minute gives 235/s and simultaneous peak minutes give 394/s. Capacity forecasts count distinct durable logical saves. An expired primary is an overload observation. Quiet commit, read and feed p99 ratios use the same account alone on the same source and group setting. Record observed offered rate and ACK goodput separately, and leave any threshold between measured levels as a bracket. Each prediction is refuted by a correctly bound result outside its stated range. A missing required observation leaves it unresolved.

The ranges draw on the dated QUEUE, GROWTH and LOAD analyst forecasts. The capacity ranges transfer an eight-fact saturation experiment to a workload with smaller field edits. The 100-database opening range is my own estimate.

## Restart with bounded readers

Forecasts below use the new order. An observation is entered alongside its original forecast when that item finishes.

| Item | Forecast before execution | Result |
| --- | --- | --- |
| P6.1 · ten deep accounts | One queue saturates around 150 offered saves/s with grouping off and 200/s with grouping on. I expect quiet commit p99 at 12–30× alone under nine hot neighbours, or 2–6× with verified fair turns. The 35/s steady case should keep up. | Pending. |
| P6.2 · existing zero controls | I expect the larger transaction or serial storage work to explain at least 20 ms of the observed 50.93 ms p99 gap. Test stage distributions and aligned samples separately. | SQL reads rose from 0.277 to 0.733 per commit. Serial tx-with p99 rose by 1.96 ms, while the largest mean increase in the matched slowest percentile was 88.46 ms before gateway entry. The predicted 20 ms serial-stage contribution was unsupported. [Anatomy](COMMIT-ANATOMY.md) |
| P6.3 · 100,000 people | One account has 75–190 ms commit p99. Page-guard activation exceeds one second. | Pending. |
| P6.4 · hundred small accounts | Pooled busy-with-low goodput is 3.15–3.40 saves/s and quiet p99 is 0.90–1.25× alone. I expect 100 logical accounts to open in one database. | Pending. |
| P6.5 · one million people | The pooled seed takes 9.7–12.7 hours at 520–850 PostgreSQL bytes per current fact. | Pending. |
