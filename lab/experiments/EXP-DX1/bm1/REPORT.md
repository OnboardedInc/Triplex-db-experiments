# DX-BM1 bare-metal bench

With zero readers, the same 38,826 commits reached the caller in 4.72 ms at the median, down from 9.03 ms on the Mac.
The scheduled medium-commit cohort moved from 11.07 to 6.43 ms at the median. The medium p99 was 54.27 ms, above its 50 ms bar.
Overall p99 stayed above 50 ms at 132.46 ms [106.23, 163.85]. The Mac's v3 zero-reader p99 was 109.13 ms [98.77, 120.83].
In the zero-reader anatomy, work outside the transact request reached 93.50 ms p99 and peer wait reached 32.49 ms. Late dispatch and per-subject queues dominate several of the worst commits.
The root drive's 8 KiB fdatasync was 0.0265 ms at the median and 0.0876 ms p99 across 898,163 samples. The Mac VM floor was about 0.4–0.7 ms.
The 1k smoke matched 53 independent reads and 2,997 entity queries. The first attempt stopped at a missing W0 build. Both attempts are sealed.
The loaded driver hit its 8 GiB container limit after 52 minutes. The untimed trace renderer also ran out of heap. Both failures are retained, and the loaded results remain unjudged.
**North star.** P1–P4 via the full pair and P5 via live 100k activation. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

| Bar (threshold) | Mac H loaded | Mac v3 zero | Linux v3 zero | Linux v3 loaded |
| --- | --- | --- | --- | --- |
| NS-P1-VIOLATIONS-MAX (L256) (= 0)<br>NS-P1-VIOLATIONS-MAX (L1024) (= 0) | within 0 · 7408 · —<br>within 0 · 7408 · — | Unjudged — · 0 · —<br>Unjudged — · 0 · — | — Unjudged · 0 · —<br>— Unjudged · 0 · — | Unjudged · pending<br>Unjudged · pending |
| NS-P1-GOODPUT-256-VS-64 (>= 1.0) | miss 0.996 · 1922038/1930528 · — | Unjudged — · 0/0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P1-READ-P99-256-MS (<= 100) | within 6.175 · 1922038 · [6.175,6.207] | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P1-WRITER-P99-RATIO-256 (<= 1.25) | Unjudged 4.211 · 46/46 · [1.467,5.161] | Unjudged — · 2149/0 · — | — Unjudged · 2,149/0 · — | Unjudged · pending |
| NS-P1-WRITER-WAIT-MAX-MS (L256) (<= 2000) | Unjudged 102.283 · 46 · [18.217,102.283] | within 303.815 · 2149 · [86.945,303.815] | 86.041 within · 2,149 · [82.860, 86.041] | Unjudged · pending |
| NS-P1-GOODPUT-1024-VS-256 (>= 0.9) | within 1.138 · 2187206/1922038 · — | Unjudged — · 0/0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P1-WRITER-P99-RATIO-1024 (<= 2) | Unjudged 0.777 · 46/46 · [0.562,1.728] | Unjudged — · 854/0 · — | — Unjudged · 854/0 · — | Unjudged · pending |
| NS-P1-RECOVERY-MS (<= 60000) | Unjudged — · 36/36 · — | Unjudged — · 540/0 · — | — Unjudged · 540/0 · — | Unjudged · pending |
| 1.1 P1.1 hot-set share of reads (min over ladder levels) (>= 0.5) | within 0.596 · 7408 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| 1.1 P1.2 split reads straddling a frozen-trace command, all correct (> 0 and all correct) | within 72423 · 7408 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| 4.1.5 fallback share per window (reported) (reported) | Unjudged [0.0000011965544019441616,0.000024293133737536984,0.00034528764873075055,0,0.000015608432299465465,0.00018242451785519974] · 7408 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| 1.1 P1.3 a maintenance event in every P1 window (every window >= 1) | within [1,1,1,1,1,1] · 7408 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P2 5-10 band p50 ms (L256) (<= 10) | Unjudged 10.239 · 29 · [9.727,11.519] | within 9.343 · 1261 · [9.215,9.471] | 4.863 within · 1,261 · [4.735, 4.991] | Unjudged · pending |
| NS-P2 5-10 band p99 ms (L256) (<= 50) | Unjudged 102.283 · 29 · [35.631,102.283] | within 36.095 · 1261 · [27.775,46.079] | 21.375 within · 1,261 · [17.919, 31.231] | Unjudged · pending |
| NS-P2 11-25 band p50 ms (L256) (<= 10) | Unjudged 12.031 · 16 · [11.327,13.183] | miss 11.071 · 682 · [10.879,11.263] | 6.431 within · 682 · [6.271, 6.591] | Unjudged · pending |
| NS-P2 11-25 band p99 ms (L256) (<= 50) | Unjudged 17.983 · 16 · [15.886,17.983] | within 37.375 · 682 · [26.879,47.359] | 54.271 miss · 682 · [28.927, 56.831] | Unjudged · pending |
| NS-P2 26-50 band p99 ms (L256, provisional) (<= 100) | Unjudged 14.053 · 1 · [14.053,14.053] | Unjudged 56.831 · 206 · [35.583,77.844] | 49.151 Unjudged · 206 · [36.095, 82.860] | Unjudged · pending |
| NS-P2 every offered command accounted (= 0)<br>NS-P2 typed rejections only for deliberately invalid commands (= 0 (the trace holds no invalid commands yet))<br>NS-P2 typed conflicts only where the oracle finds a CAS race (= 0 (serial per subject: the trace has no CAS race))<br>NS-P2 no expired primary commands (= 0) | within 0 · 7408 · —<br>within 0 · 7408 · —<br>within 0 · 7408 · —<br>within 0 · 7408 · — | within 0 · 38826 · —<br>within 0 · 38826 · —<br>within 0 · 38826 · —<br>within 0 · 38826 · — | 0 within · 38,826 · —<br>0 within · 38,826 · —<br>0 within · 38,826 · —<br>0 within · 38,826 · — | Unjudged · pending<br>Unjudged · pending<br>Unjudged · pending<br>Unjudged · pending |
| NS-P2 every oracle-valid trace command published (all) | within 7408/7408 · 7408 · — | within 38826/38826 · 38826 · — | 38826/38826 within · 38,826 · — | Unjudged · pending |
| NS-P2 steady-state queue <= 2 s of offered rate (<= 2.19 commands) | within 2 · 7408 · — | within 2 · 38826 · — | 1 within · 38,826 · — | Unjudged · pending |
| NS-P2 queue drains within 60 s after each burst (every burst <= 60 s) | within [0.023116943359383413,0.17938525390627547] · 7408 · — | within [0.027684570312487722,0.10108374023434408,0.15426684570320504,0.3059790039062591,0.4230327148438846,0.701806396484244,0.8494689941408069,0.4327033691406541,0.9195048828123618,0.6313703613277539] · 38826 · — | 10 windows, min 0.032, max 1.014 within · 38,826 · — | Unjudged · pending |
| NS-P2 read-your-own-write at the returned tx (= 1.0)<br>NS-P2 duplicates return the original receipt (= 1.0)<br>NS-P2 lost ACKs return the original receipt (= 1.0) | within 1 · 7408 · —<br>within 1 · 7408 · —<br>within 1 · 7408 · — | within 1 · 38826 · —<br>within 1 · 38826 · —<br>within 1 · 38826 · — | 1 within · 38,826 · —<br>1 within · 38,826 · —<br>1 within · 38,826 · — | Unjudged · pending<br>Unjudged · pending<br>Unjudged · pending |
| NS-P2 all-primary p99 ms (<= 50) | within 48.242 · 7408 · [44.342,51.171] | miss 109.129 · 38826 · [98.766,120.832] | 132.461 miss · 38,826 · [106.233, 163.846] | Unjudged · pending |
| NS-P2 burst 5-10 band p50 ms (<= 10) | within 8.511 · 3972 · [8.383,8.575] | within 7.679 · 19838 · [7.647,7.743] | 3.647 within · 19,838 · [3.631, 3.663] | Unjudged · pending |
| NS-P2 burst 11-25 band p50 ms (<= 10) | miss 10.303 · 1895 · [10.111,10.431] | within 9.599 · 9881 · [9.535,9.663] | 5.151 within · 9,881 · [5.119, 5.183] | Unjudged · pending |
| NS-P3 gaps (= 0)<br>NS-P3 per-subject order violations (= 0)<br>NS-P3 visible duplicate effects (= 0) | within 0 · 7408 · —<br>within 0 · 7408 · —<br>within 0 · 7408 · — | within 0 · 38826 · —<br>within 0 · 38826 · —<br>within 0 · 38826 · — | 0 within · 38,826 · —<br>0 within · 38,826 · —<br>0 within · 38,826 · — | Unjudged · pending<br>Unjudged · pending<br>Unjudged · pending |
| NS-P3 resume from checkpoint replays exactly (= true) | within true · 7408 · — | within true · 38826 · — | true within · 38,826 · — | Unjudged · pending |
| NS-P3 crash injection at three points (= 3) | within 3 · 7408 · — | within 3 · 38826 · — | 3 within · 38,826 · — | Unjudged · pending |
| NS-P3 lag p99 ms at L256 (<= 250) | Unjudged 22.500 · 46 · — | within 23.423 · 2149 · [22.271,24.575] | 22.399 within · 2,149 · [21.119, 24.959] | Unjudged · pending |
| NS-P3 affected-subject set matches (= 0)<br>NS-P3 corrections report their valid-time range (= 1.0) | within 0 · 7408 · —<br>within 1 · 7408 · — | within 0 · 38826 · —<br>within 1 · 38826 · — | 0 within · 38,826 · —<br>1 within · 38,826 · — | Unjudged · pending<br>Unjudged · pending |
| NS-P4 weighted-mix pull p50 ms (<= 5) | within 0.029 · 788897 · [0.029,0.029] | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P4 weighted-mix pull p99 ms (<= 25) | within 0.212 · 788897 · [0.211,0.213] | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P4 largest bucket p99 ms (provisional) (<= 50) | within 0.299 · 116950 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P4 history flatness p99 depth10 / depth1 (<= 1.1) | within 1.021 · 1517662/1549084 · [1.014,1.029] | Unjudged — · 0/0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P4 history flatness bytes read depth10 / depth1 (<= 1.1) | Unjudged — · 7408 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P4 correct weighted pulls/s whole machine (>= 4400) | within 18345.834 · 788897 · — | Unjudged — · 0 · — | — Unjudged · 0 · — | Unjudged · pending |
| NS-P5 sweep evaluates the release (W0) and publishes through the outbox (= true) | miss false · 7408 · — | — | Unjudged · pending | Unjudged · pending |
| NS-P5 wall s for 100k subjects incl. evaluation and publication (<= 100) | miss — · 7408 · — | — | Unjudged · pending | Unjudged · pending |
| NS-P5 exact coverage (= true)<br>NS-P5 post-capture mutations do not leak into the sweep (all at basis) | within true · 7408 · —<br>within 10/10 · 7408 · — | —<br>— | Unjudged · pending<br>Unjudged · pending | Unjudged · pending<br>Unjudged · pending |
| NS-P5 live read p99 during sweep / presweep (<= 1.5) | Unjudged — · 0/1784245 · — | — | Unjudged · pending | Unjudged · pending |
| NS-P5 writer commit p99 during sweep / presweep (<= 1.5) | Unjudged — · 0/56 · — | — | Unjudged · pending | Unjudged · pending |
| NS-P5 throttled variant overlapping compaction (run) | miss — · 7408 · — | — | Unjudged · pending | Unjudged · pending |

Each cell gives the point, status, sample size and 90% interval when recorded. H is an older loaded profile. The Mac v3 column used zero readers. [Mac context](../t1/NIGHT-2026-11-17.md)
Linux source `97fa9123`, upstream `1e869067`. Performance governor, SMT on, idle settings as delivered, TX 0, PG 1, write gateway 2, driver main 3, read gateway 4, workers 5–7. [Sealed evidence](SHA256SUMS)
Audit. Smoke checks case bytes and exact observed rows against this run's source, slot and clock. Transfer checks terminal archives and collection tags. Activation indexing checks source, slot, nonce, log and attempt bytes.
The acceptance pins and bars are unchanged. The trace summarizes named waits. Native serial-point counters are unavailable in the summary-traced pair.
