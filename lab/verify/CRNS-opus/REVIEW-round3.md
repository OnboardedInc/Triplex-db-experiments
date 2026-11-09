# CR-NS recompute: Opus round 3 re-review

Target: `lab/bin/claim.mjs` at `exp/CRNS-recompute` `cb1178d9` (fix commits `933b11f2`, `1b9fefbd`, `97450c87`), with SCHEMA.md
round 3 and `lab/bin/test/ns-round2-fixture.mjs`. Reviewer: Opus, independent of Codex. Date: 2026-11-09. Nothing committed;
product code untouched.

## Verdict

**I would not yet accept this evaluator for granting NS PASS offline.** Three high findings remain:

1. **Throttled readers count as load (W-H1).** In a P3 or P2 run, readers that each complete one correct read per second count
   as "256 readers running".
2. **Missing crash witnesses are ignored (W-H2).** A planned crash with no witness is skipped, so a crash that broke recovery can
   drop out of the resume proof.
3. **Command validity uses a prefix the candidate controls (W-H4).** The oracle judges validity on what the candidate made
   visible, so an invalid commit passes when the candidate delays the visibility of the conflicting commit.

Each of the three gets `status: RECOMPUTED` with `bars.P3.met: true`.

The fixes are local, and every round 1 and round 2 forgery is now refused with the right code. Once these three are fixed I
would accept the evaluator for offline P2 and P3 arithmetic. That acceptance would carry the residuals listed under Medium, and
it would still exclude NS PASS: the production source, WAL and fault decoders, the oracles and the calibration registry are test
stand-ins, not qualified components.

## Counts

- **Round 1: 29 of 29 forgeries refused with the right code.** The five that refused for an unrelated reason in round 2 (O8,
  O13, O14, O17, O18) now assert their own code. One test-quality gap remains (O29a, below).
- **Round 2: 13 of 13 findings fixed with the right code.** This includes all 10 accepted variants.
  - V-O29: the P1 ladder reports `met: false` without exposing BASELINE-INFLATED.
  - V-O14: the P5 traffic check exposes BASELINE-INFLATED (checked directly).
- **Round 3 variants against the four round 2 highs: 4 tried, 0 refused.**
  - W-H1, W-H2 and W-H4 are open forgeries.
  - W-H3 is a residual that no bracket check can close.
  - The W-H4 control (conflicting commit visible before the offer) is refused correctly.
- **New findings: 8 (3 high, 3 medium, 2 low).**
- **Tests:**
  - `forgeries.test.mjs` plus `forgeries-round2.test.mjs`: 46 tests, 46 pass, at cb1178d9 (`forgeries-1-2-at-cb1178d9.tap`).
  - `forgeries-round3.test.mjs`: 7 tests, 2 pass, 5 todo, 0 fail (`forgeries-round3.tap`).
  - Every todo was checked: each failed because the result was RECOMPUTED with `met: true`, never because of a fixture error
    (`round1-2-3-reasons-at-cb1178d9.txt`).

## Method

1. Before reading the claim.mjs round 3 diff, I wrote the attacks the fixes might introduce (`ROUND3-HYPOTHESES.txt`, M1 to M8).
   I worked only from REPORT round 3 and SCHEMA round 3.
2. I reran both earlier test files at cb1178d9. The builder had edited them again, so I printed each refusal code with my own
   audit wrappers (`audit3-*.mjs`), generated from the current test sources rather than from the builder's `reasons-audit.mjs`.
3. I read the round 3 diff and the fixture. I wrote `forgeries-round3.test.mjs` on the builder-upgraded fixture: one variant per
   round 2 high, plus a control for W-H4.

## Table: round 2 findings at cb1178d9

| Round 2 finding | Refused now | Code correct | Round 3 variant | Variant refused |
| --- | --- | --- | --- | --- |
| High 1, V-O6: readers answering garbage count as load | yes | yes: NS-P1-VIOLATIONS-MAX | W-H1: correct answers, each read takes 900 ms, so one read per loop per second (P3, and P3+P2) | **no** |
| High 2, V-O7: crashes before traffic prove resume | yes | yes: companion FAULT-WITNESS-INVALID "crash not distinct/in traffic"; primary P3-RESUME-MISSING | W-H2: a tenth planned injection has no witness | **no** |
| High 3, V-O2b: published before offer | yes | yes: PUBLISHED-BEFORE-OFFER | W-H3: publication revealed exactly at send (L = sentAtNs), ACK at 0.2 ms | **no** (residual) |
| High 4, V-O2: invalid command committed | yes | yes: INVALID-COMMAND-PUBLISHED | W-H4: the conflicting c0 commits first, but its visibility is held until 3 ms after c1's offer | **no** (control refused) |
| Medium 5, V-O6c: arbitrary lag minimum | yes | yes: LAG-POPULATION-UNBOUND, LAG-SAMPLES-SHORT | none | n/a |
| Medium 6, V-O29 and V-O14: baseline inflation | yes | P5 yes (BASELINE-INFLATED); P1 partial (met false, reason swallowed by the try at claim.mjs:2204) | none | n/a |
| Medium 7, NF2: crash-only bundle reads as RECOMPUTED | yes | yes: CRASH-RECOMPUTED | none | n/a |
| Medium 8: fixture pins taken from the payload | yes, with one exception (see Pins below) | n/a | none | n/a |
| Medium 9: companion context unchecked | yes | yes: COMPANION-UNBOUND | none | n/a |
| Low 10, V-O1: duplicate under a fresh commandId | yes | yes: RETRY-ORIGIN-MISSING (TRACE-OFFERS-MISMATCH also fires) | none | n/a |
| Low 11, V-O5/O17: reversed subject order | yes | yes: SUBJECT-OFFER-ORDER-MISMATCH | none | n/a |
| Low 12, V-O10: basis form empties the prefix | yes | yes: BASIS-FORM-MISMATCH | none | n/a |
| Low 13: round 1 tests refused for unrelated reasons | yes | yes for O8, O13, O14, O17, O18 | none | n/a; O29a still calls `nsP1Ladder` without a calibration argument, so it passes either way |

## Are the regression pins independent of the judged payload?

**Mostly yes.**
- `frozenFixtureTrace` writes commands, offers, windows and injections from a profile function, not from source entries.
- `trusted.commands` is a clone of that trace. `epochs`, `consumerId` and `minimumSamples` come from the trace.
- Calibration records are constants.
- The crash companion is built from its own plan by `attachIndependentCrash`; it is not a clone of the primary.
- **Allowed exceptions:** values computed from the payload stand in for decoder outputs on the judged side: `commandDigests`,
  `rawHex`, the WAL hex, and E11 cross-checks built from brackets.

**Two gaps remain:**
1. **One regression derives validity from the judged offer.** In `lab/bin/test/claim-ns.test.mjs:183`, the builder's P2 test sets
   `trusted.commandValid = o => !o.typedError`. The code allows this because `commandValid` is never required to agree with the
   frozen trace's `valid` flags. `nsTraceAttempt` checks only that `trusted.commands` matches the trace. This is the same root as
   W-H4.
2. **Extra pins go unchecked.** `nsTraceAttempt` iterates only the frozen commands, so pins present in `trusted.commands` but absent
   from the trace are never checked.

## New findings ranked by severity

### High (3)

1. **W-H1: correct but throttled readers still count as load in P3-only and P2-only runs.**
   - **Problem:**
     - `nsReaderEvidence` counts loops with at least one completion per second.
     - Read latency is barred only when P1 is requested (`if (requested.has('P1'))`, the NS-P1-LATENCY line).
     - A candidate that answers every read correctly after about 900 ms keeps 4 (or 256) loops "active" every second while
       carrying roughly 1 read per loop per second.
     - The P3 lag bar and the P2 latency bar, both defined "with P1's 256 readers running", are then met with almost no read load.
   - **Evidence:** test W-H1, for P3 and for P3+P2, gives RECOMPUTED with `met: true`.
   - **Fix:** whenever reads count as load (`readerLevel > 0`), apply P1's read p99 <= 100 ms at that level. Also add a per-loop
     completion-rate floor pinned from the frozen closed-loop plan.
2. **W-H2: a planned crash with no witness is silently ignored.**
   - **Problem:**
     - Each witness must name a planned injection, but nothing requires every planned injection to have a witness. The only
       floor is 3 per fault point.
     - The crash whose recovery failed is exactly the one for which no valid witness can be built.
     - In the test, a frozen plan of 10 injections with 9 witnessed gives `resume: true`.
   - **Fix:** require the witnessed injection ids to equal the plan's injection ids, and refuse CRASH-INJECTION-UNWITNESSED.
3. **W-H4: validity of a committed command is judged on the pre-offer visible prefix, which the candidate controls.**
   - **Problem:**
     - `commandValid(o, prefix)` receives the entries whose source bracket U is at or before the offer's schedule.
     - The candidate decides when commits become visible to the observer's polls.
     - In the test, c0 commits first in source order, but the candidate holds its visibility until 3 ms after c1 is offered.
       A compare-and-set c1 that conflicts with c0 then looks valid to the oracle, so committing it is accepted.
     - The control, with c0 visible before the offer, is refused INVALID-COMMAND-PUBLISHED.
   - **Fix:**
     - For a committed command, judge validity on the source prefix strictly before its position: the state it was actually
       applied to.
     - Keep the pre-offer prefix only for justifying rejections.
     - Require `commandValid` to agree with the frozen `valid` flag wherever the trace pins one.

### Medium (3)

4. **W-H3 / M3 / M7: pre-applying the frozen trace is a residual that brackets cannot close.**
   - **Problem:** publication revealed exactly at send, with a 0.2 ms ACK, looks like a fast engine. `trusted.frozenTrace` now
     carries the full schedule and content hashes.
   - **Fix:** the contract must keep the trace preimage and generator seed unreadable by the candidate, and say so.
5. **M2: the primary and crash companion are distinguishable, so behaviour can differ between them.**
   - **Problem:** the crash attempt has its own command ids and schedule. A candidate can run a safe checkpoint mode only there.
     Resume is proven only on the companion.
   - **Fix:** make the attempts indistinguishable to the candidate (same id shapes, a schedule drawn from one distribution).
     Compare WAL shape statistics (positions per consumer transaction, checkpoint cadence) between primary and companion.
6. **M6: the authority of a calibration record is not constrained.**
   - **Problem:** `nsCalibration` checks the pin, the binding shape, GREEN and kind. If the registry records a prior run of the
     same candidate, the candidate can inflate both runs.
   - **Fix:** the registry rule must require A0 or another evaluator-controlled reference for `calibrationP1/P4/P5`. The record
     should state the engine it measured.

### Low (2)

7. **Extra command pins and an unbound validity oracle in fixtures.**
   - **Problem:** `trusted.commands` may carry pins absent from the frozen trace, and one builder regression derives validity from
     the judged offer.
   - **Fix:** require equal key sets, and change the regression to use the trace's validity.
8. **Two regressions cannot fail on their own check.**
   - **O29a:** the test passes without a calibration argument.
   - **V-O29:** the reason is not observable because the try at line 2204 swallows it.
   - **Fix:** pass the calibration record and surface the reason, for example `met:false, reason:'BASELINE-INFLATED'` as P5 already
     does.

## Files

- `lab/verify/CRNS-opus/REVIEW-round3.md`: this review.
- `lab/verify/CRNS-opus/forgeries-round3.test.mjs` and `forgeries-round3.tap`: the round 3 variants and the W-H4 control.
- `lab/verify/CRNS-opus/forgeries-1-2-at-cb1178d9.tap`: rounds 1 and 2 rerun at cb1178d9 (46 of 46 pass).
- `lab/verify/CRNS-opus/round1-2-3-reasons-at-cb1178d9.txt`: refusal codes for every test in the three files.
- `lab/verify/CRNS-opus/audit3-forgeries.mjs`, `audit3-forgeries-round2.mjs`, `audit3-forgeries-round3.mjs`, `audit3-p5.mjs`: the
  audit wrappers that produced those codes.
- `lab/verify/CRNS-opus/ROUND3-HYPOTHESES.txt`: the fix-introduced attacks I wrote before reading the round 3 code.
