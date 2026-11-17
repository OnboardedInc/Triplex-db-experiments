Historical ACK rescore; no fresh performance or oracle qualification. Original files are unchanged. All C/A/F/G/H original finish bars and the previously verified ACK values reproduce within 0.001 ms; zero legacy differences.

H context: summary tracing, swap 4.017 GiB, whole-arm non-VM CPU median/p99 13.7/85.2%; same-session off-before/after ACK p50/p99 9.447/43.104 and 9.392/39.894 ms (CPU 12.6/82.5 and 14.7/105.5%). These are historical controls, never controls for part-12 interventions.

| Pair | ACK p50 / p99 ms | Primary n | ACK p99 90% interval | Legacy differences |
| --- | --- | --- | --- | --- |
| C | 10.658 / 54.942 | 7408 | [50.145, 62.459] | 0 |
| A | 10.600 / 70.816 | 7408 | [64.498, 78.295] | 0 |
| F | 10.566 / 66.700 | 7408 | [62.573, 74.236] | 0 |
| G | 10.063 / 49.305 | 7408 | [45.928, 53.948] | 0 |
| H | 9.680 / 48.242 | 7408 | [44.342, 51.171] | 0 |

H below uses the ACK verdict and 500-commit rule. Read-only bars show actual read counts; a missing old full histogram or one-second bins leaves its interval unavailable. A point MET with a crossing interval is not a high-confidence claim. P5 remains reported for completeness.

| Priority / bar | ACK value | Threshold | n / denominator n | 90% interval | Observed status |
| --- | --- | --- | --- | --- | --- |
| P1 / NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P1 / NS-P1-GOODPUT-256-VS-64 | 0.995609 | >= 1.0 | 1922038 / 1930528 | unavailable | MISS |
| P1 / NS-P1-READ-P99-256-MS | 6.175000 | <= 100 | 1922038 / unknown | [6.175, 6.207] | MET |
| P1 / NS-P1-WRITER-P99-RATIO-256 | 4.210986 | <= 1.25 | 46 / 46 | [1.467, 5.161] | UNJUDGED (n<500 on one or both sides) |
| P1 / NS-P1-WRITER-WAIT-MAX-MS (L256) | 102.282959 | <= 2000 | 46 / unknown | [18.217, 102.283] | UNJUDGED (n<500) |
| P1 / NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P1 / NS-P1-GOODPUT-1024-VS-256 | 1.137928 | >= 0.9 | 2187206 / 1922038 | unavailable | MET |
| P1 / NS-P1-WRITER-P99-RATIO-1024 | 0.776943 | <= 2 | 46 / 46 | [0.562, 1.728] | UNJUDGED (n<500 on one or both sides) |
| P1 / NS-P1-RECOVERY-MS | unknown | <= 60000 | 36 / 36 | unavailable | UNJUDGED (recovery window incomplete or n<500) |
| P1 / 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.595583 | >= 0.5 | 7408 / unknown | unavailable | MET |
| P1 / 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 72423 | > 0 and all correct | 7408 / unknown | unavailable | MET |
| P1 / 4.1.5 fallback share per window (reported) | [1.1965544019441616e-06,2.4293133737536984e-05,0.00034528764873075055,0,1.5608432299465465e-05,0.00018242451785519974] | reported | 7408 / unknown | unavailable | UNJUDGED |
| P1 / 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 5-10 band p50 ms (L256) | 10.239000 | <= 10 | 29 / unknown | [9.727, 11.519] | UNJUDGED (n<500) |
| P2 / NS-P2 5-10 band p99 ms (L256) | 102.282959 | <= 50 | 29 / unknown | [35.631, 102.283] | UNJUDGED (n<500) |
| P2 / NS-P2 11-25 band p50 ms (L256) | 12.031000 | <= 10 | 16 / unknown | [11.327, 13.183] | UNJUDGED (n<500) |
| P2 / NS-P2 11-25 band p99 ms (L256) | 17.983154 | <= 50 | 16 / unknown | [15.886, 17.983] | UNJUDGED (n<500) |
| P2 / NS-P2 26-50 band p99 ms (L256, provisional) | 14.053467 | <= 100 | 1 / unknown | [14.053, 14.053] | UNJUDGED (n<500) |
| P2 / NS-P2 every offered command accounted | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 every oracle-valid trace command published | 7408/7408 | all | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 queue drains within 60 s after each burst | [0.023116943359383413,0.17938525390627547] | every burst <= 60 s | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 duplicates return the original receipt | 1 | = 1.0 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 no expired primary commands | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P2 / NS-P2 all-primary p99 ms | 48.241943 | <= 50 | 7408 / unknown | [44.342, 51.171] | MET |
| P2 / NS-P2 burst 5-10 band p50 ms | 8.511000 | <= 10 | 3972 / unknown | [8.383, 8.575] | MET |
| P2 / NS-P2 burst 11-25 band p50 ms | 10.303000 | <= 10 | 1895 / unknown | [10.111, 10.431] | MISS |
| P3 / NS-P3 gaps | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 per-subject order violations | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 visible duplicate effects | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 resume from checkpoint replays exactly | true | = true | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 crash injection at three points | 3 | = 3 | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 lag p99 ms at L256 | 22.500000 | <= 250 | 46 / unknown | unavailable | UNJUDGED (n<500) |
| P3 / NS-P3 affected-subject set matches | 0 | = 0 | 7408 / unknown | unavailable | MET |
| P3 / NS-P3 corrections report their valid-time range | 1 | = 1.0 | 7408 / unknown | unavailable | MET |
| P4 / NS-P4 weighted-mix pull p50 ms | 0.029000 | <= 5 | 788897 / unknown | [0.029, 0.029] | MET |
| P4 / NS-P4 weighted-mix pull p99 ms | 0.212000 | <= 25 | 788897 / unknown | [0.211, 0.213] | MET |
| P4 / NS-P4 largest bucket p99 ms (provisional) | 0.299000 | <= 50 | 116950 / unknown | unavailable | MET |
| P4 / NS-P4 history flatness p99 depth10 / depth1 | 1.021429 | <= 1.1 | 1517662 / 1549084 | [1.014, 1.029] | MET |
| P4 / NS-P4 history flatness bytes read depth10 / depth1 | unknown | <= 1.1 | 7408 / unknown | unavailable | UNJUDGED |
| P4 / NS-P4 correct weighted pulls/s whole machine | 18345.833971 | >= 4400 | 788897 / unknown | unavailable | MET |
| P5 / NS-P5 sweep evaluates the release (W0) and publishes through the outbox | false | = true | 7408 / unknown | unavailable | MISS |
| P5 / NS-P5 wall s for 100k subjects incl. evaluation and publication | unknown | <= 100 | 7408 / unknown | unavailable | MISS |
| P5 / NS-P5 exact coverage | true | = true | 7408 / unknown | unavailable | MET |
| P5 / NS-P5 post-capture mutations do not leak into the sweep | 10/10 | all at basis | 7408 / unknown | unavailable | MET |
| P5 / NS-P5 live read p99 during sweep / presweep | unknown | <= 1.5 | 0 / 1784245 | unavailable | UNJUDGED |
| P5 / NS-P5 writer commit p99 during sweep / presweep | unknown | <= 1.5 | 0 / 56 | unavailable | UNJUDGED (n<500 on one or both sides) |
| P5 / NS-P5 throttled variant overlapping compaction | unknown | run | 7408 / unknown | unavailable | MISS |

H is not v3 and cannot qualify a new run. In particular, its loaded commit bands, writer ratios, recovery and lag are underfilled; engine-byte flatness is unknown. Large-band n is declared provisional, not silently pooled. Inputs and computation hashes: `p12/rescore-*-12final.json`; identity checks: `p12/ack-reproduction-12.json`.

The requested v3 trace remains `aa8a7636ff027ab3` over 7,200 generated seconds, with 5,520 offered seconds and four 480-second L256 blocks. Exact steady counts: L256 2,149 (small 1,261; medium 682; large 206), L1024 740. Recovery offsets 0/5/10/15/20/25/30 s contain 497/497/487/486/474/489/482 commits. Strict admission refuses these required sparse cohorts without changing rate or phase length.

Fresh passive admission `tx2-dxt1-p12-v3-admit-a-admission`: swap 12.209 GiB; non-VM CPU median 30.9%; memory pressure elevated and busy apps present; 19.730 GiB free against a 47-GiB lossless-spill reservation. Exit 75; no containers. The active disk sentinel in the analysis was superseded by Sam’s no-sentinel ruling; no warmer or probe was run.
