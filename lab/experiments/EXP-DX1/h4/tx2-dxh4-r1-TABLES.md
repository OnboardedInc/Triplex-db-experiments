# 10k target ledger — NOT RUN

The queued `tx2-dxh4-r1-zero` attempt was withdrawn before admission. No 10k stack, seed, reads, writes, oracle result or performance observation exists. This is a list of unchanged target predicates from the same driver schema, not a measured report.

| Priority | Bar | Required | Observed | Verdict |
|---|---|---|---|---|
| P1 | NS-P1-VIOLATIONS-MAX (L256) | = 0 | not measured | NOT RUN |
| P1 | NS-P1-GOODPUT-256-VS-64 | >= 1.0 | not measured | NOT RUN |
| P1 | NS-P1-READ-P99-256-MS | <= 100 | not measured | NOT RUN |
| P1 | NS-P1-WRITER-P99-RATIO-256 | <= 1.25 | not measured | NOT RUN |
| P1 | NS-P1-WRITER-WAIT-MAX-MS (L256) | <= 2000 | not measured | NOT RUN |
| P1 | NS-P1-VIOLATIONS-MAX (L1024) | = 0 | not measured | NOT RUN |
| P1 | NS-P1-GOODPUT-1024-VS-256 | >= 0.9 | not measured | NOT RUN |
| P1 | NS-P1-WRITER-P99-RATIO-1024 | <= 2.0 | not measured | NOT RUN |
| P1 | NS-P1-RECOVERY-MS | <= 60000 | not measured | NOT RUN |
| P1 | 1.1 P1.1 hot-set share of reads (min over ladder levels) | >= 0.5 | not measured | NOT RUN |
| P1 | 1.1 P1.2 split reads straddling a frozen-trace command, all correct | > 0 and all correct | not measured | NOT RUN |
| P1 | 4.1.5 fallback share per window (reported) | reported | not measured | NOT RUN |
| P1 | 1.1 P1.3 a maintenance event in every P1 window | every window >= 1 | not measured | NOT RUN |
| P2 | NS-P2 5-10 band p50 ms (L256) | <= 10 | not measured | NOT RUN |
| P2 | NS-P2 5-10 band p99 ms (L256) | <= 50 | not measured | NOT RUN |
| P2 | NS-P2 11-25 band p50 ms (L256) | <= 10 | not measured | NOT RUN |
| P2 | NS-P2 11-25 band p99 ms (L256) | <= 50 | not measured | NOT RUN |
| P2 | NS-P2 26-50 band p99 ms (L256, provisional) | <= 100 | not measured | NOT RUN |
| P2 | NS-P2 every offered command accounted | = 0 | not measured | NOT RUN |
| P2 | NS-P2 every oracle-valid trace command published | all | not measured | NOT RUN |
| P2 | NS-P2 typed rejections only for deliberately invalid commands | = 0 (the trace holds no invalid commands yet) | not measured | NOT RUN |
| P2 | NS-P2 typed conflicts only where the oracle finds a CAS race | = 0 (serial per subject: the trace has no CAS race) | not measured | NOT RUN |
| P2 | NS-P2 steady-state queue <= 2 s of offered rate | <= 2.19 commands | not measured | NOT RUN |
| P2 | NS-P2 queue drains within 60 s after each burst | every burst <= 60 s | not measured | NOT RUN |
| P2 | NS-P2 read-your-own-write at the returned tx | = 1.0 | not measured | NOT RUN |
| P2 | NS-P2 duplicates return the original receipt | = 1.0 | not measured | NOT RUN |
| P2 | NS-P2 lost ACKs return the original receipt | = 1.0 | not measured | NOT RUN |
| P3 | NS-P3 gaps | = 0 | not measured | NOT RUN |
| P3 | NS-P3 per-subject order violations | = 0 | not measured | NOT RUN |
| P3 | NS-P3 visible duplicate effects | = 0 | not measured | NOT RUN |
| P3 | NS-P3 resume from checkpoint replays exactly | = true | not measured | NOT RUN |
| P3 | NS-P3 crash injection at three points | = 3 | not measured | NOT RUN |
| P3 | NS-P3 lag p99 ms at L256 | <= 250 | not measured | NOT RUN |
| P3 | NS-P3 affected-subject set matches | = 0 | not measured | NOT RUN |
| P3 | NS-P3 corrections report their valid-time range | = 1.0 | not measured | NOT RUN |
| P4 | NS-P4 weighted-mix pull p50 ms | <= 5 | not measured | NOT RUN |
| P4 | NS-P4 weighted-mix pull p99 ms | <= 25 | not measured | NOT RUN |
| P4 | NS-P4 largest bucket p99 ms (provisional) | <= 50 | not measured | NOT RUN |
| P4 | NS-P4 pulls/s per engine core (CPU quota) | >= 1100 | not measured | NOT RUN |
| P4 | NS-P4 history flatness p99 depth10 / depth1 | <= 1.1 | not measured | NOT RUN |
| P4 | NS-P4 history flatness bytes read depth10 / depth1 | <= 1.1 | not measured | NOT RUN |
| P5 | NS-P5 sweep evaluates the release (W0) and publishes through the outbox | = true | not measured | NOT RUN |
| P5 | NS-P5 wall s for 100k subjects incl. evaluation and publication | <= 100 | not measured | NOT RUN |
| P5 | NS-P5 exact coverage | = true | not measured | NOT RUN |
| P5 | NS-P5 post-capture mutations do not leak into the sweep | all at basis | not measured | NOT RUN |
| P5 | NS-P5 live read p99 during sweep / presweep | <= 1.5 | not measured | NOT RUN |
| P5 | NS-P5 writer commit p99 during sweep / presweep | <= 1.5 | not measured | NOT RUN |
| P5 | NS-P5 throttled variant overlapping compaction | run | not measured | NOT RUN |
