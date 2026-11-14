# Part 6 full-pair verdict

Reference: tx2-dxt1-p6-reference-a, source c9b9fc3f; default summary, 10,000 subjects, unchanged full 900-second zero/ladder profiles. Exact local reads, strict server record clocks, deferred benchmark witness, 192-MiB history, split-read rule pending. Loaded swap median/range 10.701 (10.677–12.108) GiB; Mac non-VM CPU median/p99 65.3/308.4%. Same-session off-before/off-after p50/p99 13.724/104.423 and 13.008/51.145 ms, swap 11.649/12.053 GiB, Mac CPU 45.6/54.8%. Both controls miss 12 ms. Contexts and zero arm are in REFERENCE-6.md.

Closing: not measured. tx2-dxt1-p6-closing-a and closing-b were refused before lease/container creation at the 20-GiB disk guard (19.523 GiB observed immediately after the last refusal; source bee2b558; host probe succeeded). This is not a failed oracle or a quiet-host rejection. No closing result may be inferred from the later short diagnostics.

| priority / bar | reference | required | observed status | closing |
| --- | --- | --- | --- | --- |
| P1 / NS-P1-VIOLATIONS-MAX (L256) | 0 | = 0 | met | not run |
| P1 / NS-P1-GOODPUT-256-VS-64 | 0.9704190990349689 | >= 1.0 | miss | not run |
| P1 / NS-P1-READ-P99-256-MS | 8.383 | <= 100 | met | not run |
| P1 / NS-P1-WRITER-P99-RATIO-256 | 2.244690085106036 | <= 1.25 | miss | not run |
| P1 / NS-P1-WRITER-WAIT-MAX-MS (L256) | 134.3232421875 | <= 2000 | met | not run |
| P1 / NS-P1-VIOLATIONS-MAX (L1024) | 0 | = 0 | met | not run |
| P1 / NS-P1-GOODPUT-1024-VS-256 | 0.8704191297614783 | >= 0.9 | miss | not run |
| P1 / NS-P1-WRITER-P99-RATIO-1024 | 6.9454545102562655 | <= 2.0 | miss | not run |
| P1 / NS-P1-RECOVERY-MS | 40000 | <= 60000 | met | not run |
| P1 / 1.1 P1.1 hot-set share of reads (min over ladder levels) | 0.594637669674112 | >= 0.5 | met | not run |
| P1 / 1.1 P1.2 split reads straddling a frozen-trace command, all correct | 53738 | > 0 and all correct | met | not run |
| P1 / 4.1.5 fallback share per window (reported) | [0,0.0001928039152048381,0.0014092562985831634,0,0.00017837707520126648,0.0018651444526361376] | reported | unmeasured | not run |
| P1 / 1.1 P1.3 a maintenance event in every P1 window | [1,1,1,1,1,1] | every window >= 1 | met | not run |
| P2 / NS-P2 5-10 band p50 ms (L256) | 15.999 | <= 10 | miss | not run |
| P2 / NS-P2 5-10 band p99 ms (L256) | 52.613 | <= 50 | miss | not run |
| P2 / NS-P2 11-25 band p50 ms (L256) | 16.383 | <= 10 | miss | not run |
| P2 / NS-P2 11-25 band p99 ms (L256) | 134.323 | <= 50 | miss | not run |
| P2 / NS-P2 26-50 band p99 ms (L256, provisional) | 30.939 | <= 100 | met | not run |
| P2 / NS-P2 every offered command accounted | 0 | = 0 | met | not run |
| P2 / NS-P2 every oracle-valid trace command published | "7408/7408" | all | met | not run |
| P2 / NS-P2 typed rejections only for deliberately invalid commands | 0 | = 0 (the trace holds no invalid commands yet) | met | not run |
| P2 / NS-P2 typed conflicts only where the oracle finds a CAS race | 0 | = 0 (serial per subject: the trace has no CAS race) | met | not run |
| P2 / NS-P2 steady-state queue <= 2 s of offered rate | 2 | <= 2.19 commands | met | not run |
| P2 / NS-P2 queue drains within 60 s after each burst | [0.1267316894531234,0.6024804687499454] | every burst <= 60 s | met | not run |
| P2 / NS-P2 read-your-own-write at the returned tx | 1 | = 1.0 | met | not run |
| P2 / NS-P2 duplicates return the original receipt | 1 | = 1.0 | met | not run |
| P2 / NS-P2 lost ACKs return the original receipt | 1 | = 1.0 | met | not run |
| P3 / NS-P3 gaps | 0 | = 0 | met | not run |
| P3 / NS-P3 per-subject order violations | 0 | = 0 | met | not run |
| P3 / NS-P3 visible duplicate effects | 0 | = 0 | met | not run |
| P3 / NS-P3 resume from checkpoint replays exactly | true | = true | met | not run |
| P3 / NS-P3 crash injection at three points | 3 | = 3 | met | not run |
| P3 / NS-P3 lag p99 ms at L256 | 221.096 | <= 250 | met | not run |
| P3 / NS-P3 affected-subject set matches | 0 | = 0 | met | not run |
| P3 / NS-P3 corrections report their valid-time range | 1 | = 1.0 | met | not run |
| P4 / NS-P4 weighted-mix pull p50 ms | 0.034 | <= 5 | met | not run |
| P4 / NS-P4 weighted-mix pull p99 ms | 0.293 | <= 25 | met | not run |
| P4 / NS-P4 largest bucket p99 ms (provisional) | 0.429 | <= 50 | met | not run |
| P4 / NS-P4 history flatness p99 depth10 / depth1 | 1.0714285714285714 | <= 1.1 | met | not run |
| P4 / NS-P4 history flatness bytes read depth10 / depth1 | null | <= 1.1 | unmeasured | not run |
| P2 / all-primary commit p99 | 203.881 ms | <=50 ms | miss | not run |
| P2 / burst small / medium p50 | 14.015 / 16.895 ms | <=10 ms | miss | not run |
| P4 / whole-machine weighted goodput | 14720.201 correct pulls/s | >=4400 total | met | not run |
| P4 / history depth1 / depth3 / depth10 p99 | 0.182 / 0.191 / 0.195 ms | depth10/depth1 <=1.1 | 1.0714, met | not run |
| oracle | PASS; 810 commands, 53 reads, 2626 entity queries, zero mismatches | exact | observed PASS | not run |

All latency rows use the summary-level loaded host and off-control context above. Flags are reproduced observations, not acceptance promotion. P4 uses actual weighted-phase correct pulls/window without a CPU quota multiplier; physical engine bytes-read flatness remains unmeasured. All 7,408 primary commands are accounted for; exact RYOW, duplicate/lost-ACK identity, feed ordering and three crash replay checks pass.

Common reference workload: one maintenance event in every required P1 window, minimum hot-read share 0.5946, 53,738 correct reads straddling a trace command. Original per-window evidence remains in REFERENCE-6.md.
