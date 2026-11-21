# Import pacing in one database

Quiet save p99 stayed near 61 ms with feedback and 63 ms at the fixed cap. Both exceeded the builder’s 14–24 and 22–33 ms forecasts. Feedback reduced the cap from 110 to 32 frames/s by 64 seconds, and still missed the 1.5× interference target on both live traffic classes. It delivered 1,715.56 queryable facts/s, below my 2,100–2,800 forecast. The fixed cap delivered 2,986.07, below my 3,200–3,500 range.

One fresh Datomic database on the bench hosted ten noisy and one quiet account. The two 32-fact import arms used one frame in flight and ran between matched live-only controls. Each of the four 108-second windows offered 55 saves and 55 reads per second with a fixed 5/s quiet dose in both classes. Each account verified 540/540 saves and 540/540 reads in every window. All 47,520 offers matched, with zero expired or missing offers. The independent queryable prefixes contained 185,280 and 322,496 facts. Source `e1b5d34d27249c330aa257a1d5fcc4298b578c56`.

Quiet save p99 was 12.73 ms before and 6.61 after. Read p99 went from 5.61 to 4.10 ms across the bookends. Both comparisons below show each treatment’s p99 against both actual controls.

| Account | Feedback save ms · before / after × | Fixed save ms · before / after × | Feedback read ms · before / after × | Fixed read ms · before / after × |
| --- | --- | --- | --- | --- |
| quiet | 60.75 · 4.77 / 9.19 | 62.84 · 4.94 / 9.51 | 10.11 · 1.80 / 2.47 | 15.59 · 2.78 / 3.81 |
| live0 | 65.73 · 5.26 / 9.70 | 68.21 · 5.46 / 10.07 | 7.96 · 1.57 / 2.09 | 7.27 · 1.43 / 1.91 |
| live1 | 53.58 · 5.59 / 10.55 | 65.24 · 6.81 / 12.84 | 5.88 · 1.32 / 1.98 | 5.09 · 1.15 / 1.71 |
| live2 | 65.03 · 7.38 / 9.98 | 60.81 · 6.90 / 9.34 | 5.66 · 1.44 / 1.97 | 4.78 · 1.22 / 1.66 |
| live3 | 62.22 · 6.88 / 7.43 | 59.62 · 6.59 / 7.12 | 4.60 · 1.24 / 1.66 | 6.29 · 1.69 / 2.27 |
| live4 | 54.62 · 6.26 / 6.16 | 53.91 · 6.18 / 6.08 | 4.16 · 1.24 / 1.52 | 5.29 · 1.57 / 1.93 |
| live5 | 49.42 · 5.37 / 9.23 | 51.74 · 5.62 / 9.66 | 4.50 · 1.27 / 1.62 | 5.35 · 1.52 / 1.93 |
| live6 | 55.59 · 6.11 / 7.86 | 55.29 · 6.08 / 7.82 | 6.04 · 1.71 / 2.08 | 5.03 · 1.42 / 1.73 |
| live7 | 59.33 · 7.18 / 5.71 | 66.44 · 8.04 / 6.39 | 4.83 · 1.51 / 1.71 | 6.50 · 2.03 / 2.31 |
| live8 | 55.92 · 6.66 / 10.85 | 57.07 · 6.80 / 11.07 | 5.32 · 1.41 / 1.92 | 5.52 · 1.46 / 1.99 |
| live9 | 55.12 · 5.75 / 12.01 | 64.64 · 6.74 / 14.09 | 4.74 · 1.39 / 1.67 | 5.08 · 1.49 / 1.79 |

Quiet writer queue p99 was 5.17 and 1.97 ms in the controls, then 39.31 and 39.52 ms for feedback and fixed. Import peer-hold p99 was 12.74 and 14.24 ms across 5,822 and 10,176 frames. Frame-cycle p99 was 51.55 and 46.73 ms. The full scheduled-save rows and stage clocks remain in the archives. The shared serving gateway handled reads and writes. Its G1 JVM and the G1 transactor each reported two active processors and a three-core quota. Both supplied absolute GC logs.

Mac evidence is under `evidence/DX-BM1/day-n20/ha1-paced`, with 7,201,038 bytes of summaries and 2,337,509 bytes of raw evidence. [Checksums](SHA256SUMS) · [Forecasts](PREDICTIONS.md)
