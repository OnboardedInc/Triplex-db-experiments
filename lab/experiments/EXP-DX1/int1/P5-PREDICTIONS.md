# DX-INT1 pooled forecasts before the campaign

Ten accounts share one physical Datomic database. The overnight rung has 100,000 people total and the retained-seed rung has 1,000,000. The real save tape is per account. The frozen tape remains the comparison required by v3. These forecasts precede both pooled runs. They use the archived single-account and grouped-pilot results, the local memory census, and the published native Publish preflight. All performance ranges assume the same serving resources across each matched pair. [North star](https://github.com/OnboardedInc/Triplex-db-experiments/blob/7a0b6080b924437a6067c6457faa511448f39e26/lab/NORTH-STAR.md) · [Bars](https://github.com/OnboardedInc/Triplex-db-experiments/blob/7a0b6080b924437a6067c6457faa511448f39e26/lab/TARGETS.md) · [Fixed tape](PREDICTIONS.md) · [Scale pilot](../scale1/REPORT.md)

| Bar | 10 × 10,000 people | 10 × 100,000 people |
| --- | --- | --- |
| P1 exact pinned reads, ≥50% hot, ≥10% split, maintenance per 45 s | 0 wrong, 55–80% hot, 10% split, 36–44/44 bins | 0 wrong, 50–75% hot, 10% split, 32–44/44 bins |
| P1 loaded goodput ≥64-reader goodput, p99 ≤100 ms | 64 readers 9–21k/s, 256 readers 9–23k/s, paired ratio 0.85–1.15, p99 20–105 ms | 64 readers 6–17k/s, 256 readers 6–19k/s, ratio 0.80–1.15, p99 40–180 ms |
| P1 matched commit p99 ≤1.25×, max wait ≤2 s | 1.10–1.65×, max 0.4–2.5 s | 1.15–2.0×, max 0.8–6 s |
| P1 at 1,024 stress, ≥0.9× goodput, ≤2× commit tail, recovery ≤60 s in ≥16 cycles | 0.45–0.85×, 1.5–2.8×, 0–4 recovery offsets | 0.30–0.75×, 1.7–3.5×, 0–3 recovery offsets |
| P2 p50/p99 ≤10/50 ms, 5–10 and 11–25 facts | 6–12/40–85 and 8–16/55–110 ms | 9–18/65–140 and 12–24/85–180 ms |
| P2 p99 ≤100 ms, 26–50 facts, each pool needs ≥500 | 70–150 ms, frozen pool may have fewer than 500 | 105–250 ms, same frozen count |
| P2 typed accounting, all valid commits publish, immediate readback and original retry receipts, queue ≤2 s of offers, drain ≤60 s | 0 unaccounted, 100% exact readback and retries, 1–6 queued at steady frozen load, drain 5–25 s | same exactness, 2–10 queued, drain 10–60 s |
| P3 gaps, ordering and duplicate effects zero, exact resume and ≤250 ms p99 durable lag | 0 errors, 55–220 ms, exact resume | 0 errors, 90–400 ms, exact resume |
| P4 weighted p50/p99 ≤5/25 ms, largest p99 ≤50 ms, ≥4,400/s | 0.6–3/12–48 ms, largest 25–70 ms, 2.2–4.8k/s | 1–5/22–85 ms, largest 45–135 ms, 1.5–4.0k/s |
| P4 depth 10/1 p99 and engine bytes ≤1.1× | p99 ratio 0.95–1.40, response bytes 0.99–1.12× | p99 ratio 1.0–1.6, response bytes 0.99–1.15× |
| P5 exact coverage/representation and notification durability, ≤100 s floor and <1 s target, live tails ≤1.5× | 10,000/10,000, 5–65 s, live read/write 1.05–1.65× | 100,000/100,000, 50–220 s, live read/write 1.15–2.2× |
| P6 quiet write/read/feed p99 ratios ≤1.25×, zero wrong/expired | 1.2–2.3× / 1.0–1.45× / 1.1–2.2× during neighbors' busy windows, 0 wrong, 0–1% expiry | 1.4–3.5× / 1.05–1.8× / 1.3–3.0×, 0 wrong, 0–3% expiry |
| P7 ≤64 B/untouched subject, cold exact p99 ≤100 ms, report per idle scope | reader 0–32, read peer 0–400, write peer 0–200 B, 50–120 ms | reader 0–8, read peer 0–64 and write peer 0–64 B once caches settle, 70–165 ms |
| P8 deep 16M facts and wide 4.5M people at ≥3,000 facts/s, other lanes' read/write p99 ≤1.5× | 3–9k facts/s deep, 3–12k wide, 1.05–1.55× read / 1.15–2.0× write | 2–7k deep, 2–10k wide, 1.15–1.8× read / 1.25–2.6× write |

The field forecast is 35/49 steady and 235/394 burst offers/s if all ten accounts have the same phase. At peak expect 150–310 verified saves/s at the overnight rung and 120–260/s at the retained-seed rung, with every unserved offer counted. Burst, Publish and import use separate windows. The P6 ratios in the table are for the real neighbor burst. During Publish expect quiet commit/read/feed ratios of 1.15–2.0/1.05–1.55/1.15–2.0× and during import 1.2–2.6/1.05–1.8/1.2–2.5×. A quiet account keeps the same tape and reader seats in the control and neighboring-traffic windows.

For P7, fixed logical budgets are 16 MiB of reader rows and 32 MiB of peer objects plus 8 MiB of row data and 1 MiB of identities per gateway. The one-database campaign reports one idle-scope cost from the separate Mac census. For P4, response bytes are a diagnostic proxy until a native engine counter covers the same read window. A 10,000-person Publish or shortened import declares its actual denominator. The long run needs the large data image, and the wide import needs its own measured arm. The profile and thresholds are unchanged if any result remains unjudged.
