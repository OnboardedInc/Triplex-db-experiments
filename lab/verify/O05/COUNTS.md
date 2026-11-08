# Final CX-VO05 counts

177 independent CLI cases: 154 match the contract/security expectation; 23 discrepancies, all actual PASS/0. No baseline crashes or noncanonical outputs.

19/19 additional guard mutants detected, 0 crash kills. Builder rerun outcomes are in summary.json.

| Protocol | Synthetic positives | Boundary/rule and forgery negatives | Expected negatives accepted |
| --- | --- | --- | --- |
| OBS-CANCEL | 2/2 PASS | 10 | invented-log |
| OBS-PREABORT | 1/1 PASS | 8 | invented-log |
| OBS-CONNECTIONS | 1/1 PASS | 9 | invented-log |
| OBS-SCRATCH | 1/1 PASS | 8 | invented-log |
| OBS-NO-MUTATION | 1/1 PASS | 8 | invented-log |
| OBS-RESOURCE | 1/1 PASS | 10 | invented-log, obligation-laundering |
| OBS-AVAILABILITY | 1/1 PASS | 8 | invented-log |
| OBS-SCALE-COUNT | 1/1 PASS | 8 | invented-log |
| OBS-WORK | 2/2 PASS | 12 | invented-log, threshold-laundering, exact-ratio-above-half, exact-ratio-above-incremental |
| OBS-MAINTENANCE | 1/1 PASS | 8 | invented-log |
| OBS-ERASURE-SCAN | 2/2 PASS | 10 | invented-log, category-labels-as-inventory |
| OBS-WATERMARK | 2/2 PASS | 14 | invented-log, unaccounted-pre-route-delay |
| OBS-ACK-ORDER | 1/1 PASS | 8 | invented-log |
| OBS-FAULT-TRANSITIONS | 1/1 PASS | 11 | invented-log, transition-label-as-witness, verification-label-as-witness, declared-unwitnessed-transition |

Additional threshold-authority probes: 27/27 expected outcomes, across all nine consulted threshold IDs. All 18 emitted consulted definitions match the selected replacement contract; missing thresholds refuse before consultation.

All fourteen protocols reject each of missing evidence, client source kind, label-only source and bad digest. All fourteen accept internally invented logs after those logs are resealed. The latter are acceptance-security failures, not evidence from any engine.

Baseline normalized positives are deliberately synthetic controls under hypothetical trusted case context. Their PASS does not establish provenance; see VERIFY.md F1.

## Mutant kills

| Mutant | Killing independent case | Expected / mutant output |
| --- | --- | --- |
| allow-client-source | CANCEL/client-source | FAIL / PASS |
| ignore-source-digest | CANCEL/bad-digest | FAIL / PASS |
| drain-strict-boundary | CANCEL/positive | PASS / FAIL |
| allow-active-after-drain | CANCEL/active-after-drain | FAIL / PASS |
| allow-other-reuse-connection | CANCEL/different-reuse-connection | FAIL / PASS |
| preabort-forbidden-tag | PREABORT/boundary | FAIL / PASS |
| pool-over-max | CONNECTIONS/boundary | FAIL / PASS |
| scratch-count-drift | SCRATCH/boundary | FAIL / PASS |
| counter-drift | NO-MUTATION/boundary | FAIL / PASS |
| resource-ignore-client | RESOURCE/boundary | FAIL / PASS |
| manual-restart-allowed | AVAILABILITY/manual-restart | FAIL / PASS |
| count-engine-not-compared | SCALE-COUNT/boundary | FAIL / PASS |
| work-only-first-channel | WORK/one-channel-over | FAIL / PASS |
| maintenance-min-lag | MAINTENANCE/boundary | FAIL / PASS |
| ignore-derived-channel | ERASURE-SCAN/boundary | FAIL / PASS |
| ignore-erasure-frontier | WATERMARK/erasure-behind | FAIL / PASS |
| allow-early-ack | ACK-ORDER/boundary | FAIL / PASS |
| allow-precrash-readback | FAULT-TRANSITIONS/boundary | FAIL / PASS |
| allow-old-incarnation | WATERMARK/reset-incarnation | FAIL / PASS |

## Discrepancy evidence

| Case ID | Expected | Actual | Retained input |
| --- | --- | --- | --- |
| CANCEL/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-005.json |
| PREABORT/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-011.json |
| CONNECTIONS/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-017.json |
| SCRATCH/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-023.json |
| NO-MUTATION/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-029.json |
| RESOURCE/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-035.json |
| AVAILABILITY/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-041.json |
| SCALE-COUNT/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-047.json |
| WORK/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-053.json |
| MAINTENANCE/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-059.json |
| ERASURE-SCAN/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-065.json |
| WATERMARK/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-071.json |
| ACK-ORDER/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-077.json |
| FAULT-TRANSITIONS/invented-log | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-083.json |
| WORK/threshold-laundering | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-119.json |
| WORK/exact-ratio-above-half | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-120.json |
| WORK/exact-ratio-above-incremental | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-121.json |
| RESOURCE/obligation-laundering | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-123.json |
| WATERMARK/unaccounted-pre-route-delay | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-124.json |
| FAULT-TRANSITIONS/transition-label-as-witness | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-125.json |
| FAULT-TRANSITIONS/verification-label-as-witness | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-126.json |
| FAULT-TRANSITIONS/declared-unwitnessed-transition | FAIL | PASS/0 | lab/verify/O05/evidence/final/case-127.json |
| ERASURE-SCAN/category-labels-as-inventory | REFUSED | PASS/0 | lab/verify/O05/evidence/final/case-128.json |
