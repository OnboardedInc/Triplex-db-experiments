# CR-NS recompute: Opus round 5 scoped check

Target: `lab/bin/claim.mjs` at `exp/CRNS-recompute` `676b0a45` (fix commit `de9e8cb0`). Scope: the three round 4 items, which
are Q103d active readers, the pinned crash target and Q103e race pairs. New findings are reported only if high. Reviewer: Opus.
Date: 2026-11-09. Nothing committed; product code untouched.

## Answer

**Yes: I would accept the evaluator for offline P2 and P3 arithmetic.** NS PASS still waits on qualified decoders, oracles and
the calibration registry.

## Counts

- **Earlier forgery files at 676b0a45:** `forgeries.test.mjs` and the round 2, 3 and 4 files run 59 tests, 59 pass, no todo
  (`forgeries-1-4-at-676b0a45.tap`).
  - My regenerated audit (`round1-5-reasons-at-676b0a45.txt`) shows the code for the forged property on every test.
  - Round 4 now gives: W-H1r4 READER-RATE-SHORT; W-H2r4 CRASH-TARGET-MISMATCH on the companion and P3-RESUME-MISSING on the
    primary; W-H4r4 still COMMAND-VALIDITY-PIN-MISMATCH and INVALID-COMMAND-PUBLISHED.
- **Round 5 variants: 6 tried, 4 refused with the right code, 2 accepted.**
  - The 2 accepted are the parked-at-99-ms reader variant, once each for P3 and P3+P2. Both sit inside Q103d's definition (see
    below).
  - **Controls:** the honest race outcome (exactly one member commits) comes back RECOMPUTED with `met: true`.
- **`forgeries-round5.test.mjs`:** 9 tests, 7 pass, 2 todo, 0 fail (`forgeries-round5.tap`).
- **New high findings: 0.**

## Table

| Round 4 item | Refused now | Code correct | Round 5 variant | Variant refused |
| --- | --- | --- | --- | --- |
| W-H1r4: parked reads (1 slow read in 101) | yes | yes: READER-RATE-SHORT | Q103d-v: in every 100 ms bin, one read answered in 0.1 ms, then one held to about 98 ms (P3, and P3+P2) | no, but inside Q103d's definition (see below) |
| W-H2r4: crash event names a sidecar | yes | yes: CRASH-TARGET-MISMATCH, then P3-RESUME-MISSING | CT-v: parent `/fixture`, child `/fixture/consumer/worker`, trailing slash `/fixture/consumer/` | yes, all three (CRASH-TARGET-MISMATCH; exact string match) |
| Low 3: static flags vs races | yes (Q103e pairs) | yes: RACE-OUTCOME-INVALID | Q103e-v: neither member commits (both told CAS-LOST); both members commit | yes, both (RACE-OUTCOME-INVALID; neither also gives LAG-SAMPLES-SHORT) |

## Why the accepted Q103d variant does not change the answer

**What the variant does.** With the fixture floor of 2 completions per loop per second, each 100 ms bin needs 1 completion.
The candidate answers one read fast, then holds the next until 98 ms into the bin. The result:
- every bin has 2 completions;
- no read exceeds 1 s;
- read p99 is 97.9 ms, under 100 ms;
- requests never overlap.

**Why it stays within the rules:**
- **Volume:** the delivered read volume is at least the frozen floor (here 20 per loop per second against a floor of 2).
- **Shaping:** the remaining effect is bunching of read service inside a 100 ms bin, which P1's own p99 <= 100 ms bar allows.
- **Scaling:** at any realistic floor F, the same pattern still has to deliver F reads per loop per second. So the read load is
  whatever the contract freezes as F.

**Two contract notes, neither an evaluator defect:**
1. The real per-loop floor F must be set to the intended closed-loop load. The fixture's value of 2 is not a workload target.
2. If Sam wants service spread out below 100 ms, that needs a different bar, for example a p99.9 or max read latency.

## Files

- `lab/verify/CRNS-opus/REVIEW-round5.md`: this review.
- `lab/verify/CRNS-opus/forgeries-round5.test.mjs` and `forgeries-round5.tap`: the round 5 variants and controls.
- `lab/verify/CRNS-opus/forgeries-1-4-at-676b0a45.tap`: rounds 1 to 4 rerun at 676b0a45 (59 of 59 pass).
- `lab/verify/CRNS-opus/round1-5-reasons-at-676b0a45.txt` and `audit5-*.mjs`: the refusal codes for every test, and the
  wrappers that produced them.
