# CR-NS recompute: Opus round 4 re-review

Target: `lab/bin/claim.mjs` at `exp/CRNS-recompute` `e96a85cb` (fix commit `6850cd45`), with SCHEMA.md round 4 and
`lab/bin/test/ns-round2-fixture.mjs`. Reviewer: Opus, independent of Codex. Date: 2026-11-09. Nothing committed; product code
untouched. W-H3, run indistinguishability and calibration authority are out of scope (Q103a to Q103c) except where the evaluator
enforces them.

## Answer

**Yes: I would accept the evaluator for offline P2 and P3 arithmetic now.** NS PASS still waits on qualified decoders, oracles
and the calibration registry.

**Why yes:**
- Every forgery from rounds 1 to 3 is refused with the code for the forged property.
- The W-H4 fix holds against a new variant.
- Neither remaining finding is an arithmetic error. Both must be closed before any NS PASS:
  1. **Parked reads (W-H1r4) are a gap in the target, not in the evaluator.** One read in 101 can be held for about a second
     while the reader-load floor and the p99 read bar both hold. TARGETS bars reads only at p99, so the evaluator applies the
     bar as written. Closing the gap needs a ruling (proposed below as Q103d).
  2. **Crash witnesses do not name which process died (W-H2r4).** The injector and observer are evaluator-owned, so the
     candidate cannot forge this, but the evaluator fails open if they are misconfigured. It is a cheap check to add.

## Counts

- **Earlier forgery files at e96a85cb:** `forgeries.test.mjs`, `forgeries-round2.test.mjs` and `forgeries-round3.test.mjs` run
  53 tests, 53 pass, no todo (`forgeries-1-2-3-at-e96a85cb.tap`).
  - My regenerated audit (`round1-4-reasons-at-e96a85cb.txt`) shows the code for the forged property on every test.
  - Round 3 now gives: W-H1 NS-P1-LATENCY and READER-RATE-SHORT; W-H2 CRASH-INJECTION-UNWITNESSED on the companion and
    P3-RESUME-MISSING on the primary; W-H4 COMMAND-VALIDITY-PIN-MISMATCH and INVALID-COMMAND-PUBLISHED.
  - W-H3 stays a positive residual, as Q103a expects.
- **Round 4 variants: 3 tried, 1 refused.**
  - W-H4r4 is refused with exactly COMMAND-VALIDITY-PIN-MISMATCH and INVALID-COMMAND-PUBLISHED. Its honest-order control is
    RECOMPUTED.
  - W-H1r4 and W-H2r4 are accepted with `met: true`.
- **`forgeries-round4.test.mjs`:** 6 tests, 3 pass, 3 todo, 0 fail (`forgeries-round4.tap`).
- **New findings: 3 (0 high, 2 medium, 1 low).**

## Method

1. Before reading the round 4 diff, I wrote the attacks the fixes might introduce (`ROUND4-HYPOTHESES.txt`, Q1 to Q5). I worked
   only from REPORT and SCHEMA round 4.
2. I reran all earlier forgery files. I regenerated the audit wrappers (`audit4-*.mjs`) from the current test sources. The
   committed round 3 wrappers (`audit3-*.mjs`) are left in place as history; they are stale copies of older test sources.
3. I read the round 4 diff (`nsLoadRate`, the Proxy command descriptor and the before-position prefix, the injection-set
   equality, `nsCalibrationIdentity`) and wrote one variant per round 3 high.

## Table

| Round 3 finding | Refused now | Code correct | Round 4 variant | Variant refused |
| --- | --- | --- | --- | --- |
| W-H1: throttled readers count as load | yes | yes: NS-P1-LATENCY, READER-RATE-SHORT | W-H1r4: each loop answers 100 reads in about 10 ms, then parks one read for about 960 ms (P3, and P3+P2) | **no** (medium, target gap) |
| W-H2: planned injection without a witness | yes | yes: CRASH-INJECTION-UNWITNESSED, then P3-RESUME-MISSING | W-H2r4: every injection witnessed, but each `cgroup-gone` event names a sidecar cgroup | **no** (medium, fail-open) |
| W-H4: validity on a prefix the candidate controls | yes | yes: COMMAND-VALIDITY-PIN-MISMATCH, INVALID-COMMAND-PUBLISHED | W-H4r4: c1, valid only once c0 exists (other subject), committed before c0 although c0 was offered first | yes, with exactly those two codes; control RECOMPUTED |
| W-H3: pre-applied trace | positive residual (Q103a) | n/a | none | n/a |
| P1 swallowed BASELINE-INFLATED | yes | yes: `reason: 'BASELINE-INFLATED'` asserted | none | n/a |
| O29a missing calibration argument | yes | yes: BASELINE-INFLATED asserted | none | n/a |
| Pins absent from the trace | yes | yes: TRACE-COMMAND-PIN-MISMATCH on key-set inequality | none | n/a |
| `commandValid = o => !o.typedError` in a regression | yes | the Proxy descriptor refuses O-REPLAY-INPUT-UNBOUND on unknown reads | none | n/a |

## New findings ranked by severity

### Medium (2)

1. **W-H1r4: parked reads meet the load floor and the p99 bar while the store is idle about 96% of the window.**
   - **What `nsLoadRate` checks:**
     - completions per loop in one-second bins;
     - no overlapping requests within a loop;
     - read p99 <= 100 ms.
   - **The forgery:** each loop answers 100 reads in about 10 ms, then holds the 101st until 990 ms. That is 1 slow read in 101,
     which is below the p99 rank. The floor is met at any pinned value, because the candidate scales the fast burst, and the
     relay sees the parked request as in flight.
   - **Evidence:** test W-H1r4, for P3 and for P3+P2, gives RECOMPUTED with `met: true`. Reads are served for under 5% of the window.
   - **Why it is a target gap:** the same pattern also passes P1, because TARGETS bars reads only at p99.
   - **Fix:** a contract ruling (proposed Q103d): either a read max or p99.9 bar wherever reads count as load, or sub-second
     activity bins (for example 100 ms) that each need the declared level of loops with a completed read. The evaluator should
     not choose the number itself.
2. **W-H2r4: the crash witness never names the killed target.**
   - **Problem:** a witness's `cgroup-gone` event carries `injectionId` and `t`. The evaluator never checks which cgroup or
     process died. A witness whose event names a sidecar still proves consumer resume.
   - **Who can trigger it:** not the candidate, because the injector and observer are evaluator-owned. But a misconfigured
     injector passes silently.
   - **Fix:** pin the consumer cgroup (or process identity) in the frozen crash plan or in `trusted`. Require each `cgroup-gone`
     event to name it, and refuse CRASH-TARGET-MISMATCH otherwise.

### Low (1)

3. **Static validity flags cannot represent a compare-and-set race decided by commit order (Q3).**
   - **Problem:** validity must now equal a frozen boolean per command. In scenario 7 (two reviewers, one I-9), the winner is
     whichever the candidate commits first. A trace that fixes the winner in advance refuses an honest candidate that lets the
     other racer win.
   - **Impact:** this causes false refusals, not a forgery.
   - **Fix:** the contract should mark race pairs as "exactly one of {A, B} valid". The evaluator then checks that exactly one
     committed and that the other got a typed conflict.

## Hypotheses checked

| Hypothesis | Result |
| --- | --- |
| Q1 parked reads | confirmed, finding 1 |
| Q2 witness target | confirmed, finding 2 |
| Q3 static flags vs races | confirmed by reading the code, finding 3 |
| Q4 causal reorder refused | confirmed (W-H4r4) |
| Q5 calibration labels self-declared | consistent with Q103c; `nsCalibrationIdentity` checks labels only |

## Files

- `lab/verify/CRNS-opus/REVIEW-round4.md`: this review.
- `lab/verify/CRNS-opus/forgeries-round4.test.mjs` and `forgeries-round4.tap`: the round 4 variants and the W-H4r4 control.
- `lab/verify/CRNS-opus/forgeries-1-2-3-at-e96a85cb.tap`: rounds 1 to 3 rerun at e96a85cb (53 of 53 pass).
- `lab/verify/CRNS-opus/round1-4-reasons-at-e96a85cb.txt`: the refusal codes for every test in all four files.
- `lab/verify/CRNS-opus/audit4-forgeries*.mjs`: the audit wrappers that produced those codes.
- `lab/verify/CRNS-opus/ROUND4-HYPOTHESES.txt`: the fix-introduced attacks I wrote before reading the round 4 code.
