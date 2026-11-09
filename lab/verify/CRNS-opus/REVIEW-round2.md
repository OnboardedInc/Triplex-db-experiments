# CR-NS recompute: Opus round 2 re-review

Target: `lab/bin/claim.mjs` at `exp/CRNS-recompute` `2cdb3d2f` (implementation `31e22e3c`), with SCHEMA.md round 2 and
`lab/bin/test/ns-round2-fixture.mjs`. Reviewer: Opus, independent of Codex. Date: 2026-11-09. Nothing committed; product code
untouched.

## Summary

- **All 29 round 1 forgeries are now refused.** For 24 of them the refusal code names the forged property. For 5 it does not:
  - O8, O13 and O14 are refused by schema or argument checks.
  - O18 is refused only through the O25 storage pin.
  - O17 is refused only because of how the fixture builds its pins.
- **I tried 13 variants against the 10 high findings. 3 are refused and 10 are accepted.**
  - Refused: V-O3, V-O4, V-O13.
  - Accepted, high: V-O2, V-O2b, V-O6, V-O7.
  - Accepted, medium: V-O6c, V-O14, V-O29.
  - Accepted, low: V-O1, V-O5/O17, V-O10.
- **New findings, ranked: 4 high, 5 medium, 4 low (13 in total).** The 10 accepted variants are among them. Three more come from
  reading the round 2 fixes: the crash-only status, the fixture-derived pins and the unchecked companion settings. The last is
  test quality in the round 1 assertions.
- **The four high findings each produce `status: RECOMPUTED` with `bars.P3.met: true`:**
  - readers that answer garbage still count as the 256-reader load under P3 or P2 alone;
  - crash witnesses at t=0, before any traffic, still prove resume;
  - a command published before it was offered gets about 0 ms latency;
  - an oracle-invalid command that the candidate commits and ACKs is accepted.

## How this was done

1. I reran my round 1 file as the builder edited it at `2cdb3d2f` (30 of 30 pass). I printed every refusal code with
   `reasons-audit.mjs`; the output is in `round1-reasons-at-2cdb3d2f.txt`.
2. I wrote the attacks the fixes might introduce (`ROUND2-HYPOTHESES.txt`, N1 to N13). I worked only from the REPORT round 2
   finding-to-fix table, before reading the claim.mjs diff.
3. I read the round 2 code and the builder's fixture, then wrote `forgeries-round2.test.mjs`.
   - It reuses my round 1 fixture as the builder upgraded it.
   - Each variant asserts REFUSED and is marked `todo` while the code accepts it.
   - For every todo I confirmed the failure is the forgery being accepted: `status: RECOMPUTED` with `met: true`, or `met: true`
     for helper-level tests. It is never an unrelated fixture error.
   - Run: `node --test lab/verify/CRNS-opus/forgeries-round2.test.mjs`. Result: 16 tests, 5 pass, 11 todo, 0 fail
     (`forgeries-round2.tap`).

## Round 1 findings: refused now, and variants tried

"Right reason" means the refusal code names the forged property. Line numbers are claim.mjs at 2cdb3d2f.

| Finding | Refused now | Code seen | Right reason | Variant tried | Variant refused |
| --- | --- | --- | --- | --- | --- |
| O1 duplicate commit | yes | DUPLICATE-COMMIT | yes | V-O1: a duplicate signal under a fresh commandId commits twice | **no** (low, depends on driver id rule) |
| O2 fast error, slow commit | yes | ERROR-BUT-COMMITTED, VALID-COMMAND-REJECTED | yes | V-O2: an oracle-invalid command is committed and ACKed. V-O2b: published 9 ms before its offer, about 0 ms latency | **no**, **no** |
| O3 retry gets typed error | yes | ERROR-BUT-COMMITTED (also EVENT-ID-DUPLICATE from my old fixture) | yes | V-O3: kind=duplicate retry with a unique eventId gets a typed error | yes (IDEMPOTENCY-RECEIPT-MISMATCH) |
| O4 duplicate effect under another label | yes | CONSUMER-IDENTITY-MISMATCH | yes | V-O4: consumer label `'k1 '` (trailing space) | yes |
| O5 offset order vs cursor order | yes | NS-P3-ORDER-VIOLATIONS-MAX (source cursor) | yes | V-O5/O17: two in-flight commands for one subject commit in reverse offer order | **no** (low, needs a ruling) |
| O6 P3-only skips checks | yes | VALID-COMMAND-NOT-PUBLISHED, ACK-BEFORE-PUBLICATION | yes | V-O6: P3-only, 4 reader loops, every answer wrong. V-O6c: commit deferred past window end with lag minimum below the commit count | **no**, **no** (control with minimum = count: yes) |
| O7 no resume evidence | yes | P3-RESUME-MISSING | yes | V-O7: companion whose 9 witnesses crash at t=0 and all cite one 1-transaction range | **no** |
| O8 arbitrary replay | yes | FAULT-WITNESS-INVALID ("recovery checkpoint/range absent") | **no**: fails on missing fields, not range content | covered by V-O7 (valid anchors, wrong crash) | **no** |
| O9 late commit, no consumer record | yes | NS-P3-EVERY-POSITION-ACCOUNTED | yes | none | n/a |
| O10 lossy read memo | yes | 1 violation per window | yes | V-O10: decimal-string basis against coordinate-object positions | **no** (low) |
| O11 ladder level label | yes | READER-LEVEL-MISMATCH | yes | none | n/a |
| O12 E8 not tied to reads | yes | READER-LEVEL-MISMATCH | yes | V-O6 (reads exist but are wrong) | **no** |
| O13 history answers unchecked | yes | P4-HISTORY-NOT-VERIFIED (new arguments missing) | **no** in the round 1 test | V-O13: stale depth-1 answers at depth 10 | yes (P4-HISTORY-ANSWER-MISMATCH) |
| O14 sweep segment copy | yes | P5-LIVE-TRAFFIC-NOT-VERIFIED (no sweep interval passed) | partly | V-O14: baseline slowed to 49 ms, sweep 73 ms | **no** (medium) |
| O15 activation basis | yes by code (2088 to 2091) | n/a | n/a | none | n/a |
| O16 future prefix | yes | prefix lengths 1, 2, 3 | yes | V-O10 (basis form) | **no** |
| O17 content not bound | yes | SOURCE-CONTENT-MISMATCH | yes in code; see note 3 on the fixture | V-O5/O17 (order) | **no** |
| O18 frames unrelated to entries | yes | SOURCE-STORAGE-MISMATCH | **no**: the O25 pin fires; the O18 decoder check needs a production decoder | none possible offline | n/a |
| O19 WAL hex decorative | yes by code (1832) | n/a | n/a | none | n/a |
| O20 crossChecks empty | yes | CR-CROSSCHECK-MISSING | yes | none | n/a |
| O21 small n | yes | LAG-SAMPLES-SHORT; band floors at 2023 | yes | V-O6c | **no** |
| O22 wide bracket | yes | BRACKET-TOO-WIDE, ACK-ORDER-UNDECIDED | yes | none | n/a |
| O23 duplicate records | yes | EVENT-ID-DUPLICATE | yes | none | n/a |
| O24 recovery id | yes | EVENT-SCHEMA (missing id) | yes | none | n/a |
| O25 storage kind | yes | SOURCE-STORAGE-MISMATCH | yes | none | n/a |
| O26 split consumers | yes by code (1836) | n/a | n/a | none | n/a |
| O27 bucket and hot-set | yes by code (2037 to 2046, 2071 to 2073) | n/a | n/a | none | n/a |
| O28 clock roles | yes by code (1767) | n/a | n/a | none | n/a |
| O29 baseline inflation | yes | met false (base over 50 ms) | yes | V-O29: baseline 48 ms, 60 ms at 256 and 1024 readers | **no** (medium) |

## New findings ranked by severity

### High (4)

1. **Readers that do no real work count as load in P3-only and P2-only runs** (V-O6; hypothesis N8).
   - **Problem:**
     - `nsReaderEvidence` counts loops with a completed read.
     - E2 correctness (`nsReadSample`) runs only when P1, P4 or P5 is requested (line 2027).
     - So the P3 lag bar and the P2 latency bar, which are defined "with P1's 256 readers running", accept readers whose every
       answer is wrong and whose echoed basis differs. Instant garbage answers put no read load on the store.
   - **Evidence:** test V-O6 gives RECOMPUTED with `met: true`.
   - **Fix:** whenever `readerLevel > 0`, run `nsReadSample` on the main reads, and refuse on any violation, for every priority set.
2. **Resume evidence is not bound to the crash** (V-O7; hypotheses N1, N2, N11).
   - **Problem:**
     - A witness needs only one `cgroup-gone` event with `t <= drain` (line 1897).
     - Its anchors (`beforeTransaction`, `recoveryTransaction`, checkpoint and recovery offsets) need only be consistent with the
       WAL and the source (1898 to 1906).
     - Nothing ties the anchors to the crash time or to the fault point. Nothing requires the nine witnesses to name distinct
       crashes or distinct ranges.
     - Crashes at t=0, before any traffic, all citing one 1-transaction range, grant `bars.P3.resume`.
   - **The builder's fixture does the same:** `ns-round2-fixture.mjs:58 to 67` builds the companion by cloning the primary, places
     every crash after window end, and uses the same full-run range for all nine witnesses.
   - **Fix:**
     - Require each crash time inside the measured window, while traffic is flowing.
     - Bind the anchors to the crash time using consumer brackets: the checkpoint position's bracket U must be at or before t,
       and the recovery position's bracket L must be after t.
     - Require distinct crash times per witness.
     - Check fault-point semantics, for example that an after-effect crash has a committed effect and no checkpoint.
     - Build the fixture companion from its own crash run, not from a clone of the primary.
3. **A command published before it was offered is accepted with about 0 ms latency** (V-O2b).
   - **Problem:**
     - Line 1999 clamps `finished < scheduled` instead of refusing it.
     - ACK order checks only `ack >= L`.
     - A candidate that pre-applies the frozen trace (the generator is pinned and may be readable) commits ahead of the offer
       and ACKs at once.
   - **Evidence:** test V-O2b gives a 5-10 band p99 below 1 ms, and RECOMPUTED.
   - **Fix:** refuse PUBLISHED-BEFORE-OFFER when the source bracket L of a command's position is earlier than the `sentAtNs` of
     its first attempt.
4. **An oracle-invalid command that the candidate commits is accepted** (V-O2).
   - **Problem:**
     - Lines 1971 to 1973 refuse a valid command that is unpublished or rejected.
     - Nothing refuses an invalid command (`commandValid` false, kind `invalid`) that publishes with a receipt.
     - TARGETS P2 item 4 allows typed rejections only for deliberately invalid commands, so committing one is a correctness
       failure that goes unseen.
   - **Fix:** refuse INVALID-COMMAND-PUBLISHED when `commandValid` is false and the command has a source position.

### Medium (5)

5. **The lag minimum can be any positive integer** (V-O6c; hypothesis N9).
   - **Problem:** line 1915 accepts any positive `minimumSamples.lag`. With a minimum below the number of commands scheduled in the
     window, P3-only deferral of publication past `endNs` drops those positions from the lag sample.
   - **Fix:** define the lag population from the offer schedule. Every valid command scheduled in the window is a lag sample, and
     a sample whose L falls outside the window counts as infinite lag.
6. **Absolute floors equal the bars, so baselines can be inflated up to the bar** (V-O29, V-O14).
   - **Problem:**
     - P1 accepts a 48 ms zero-reader baseline with 60 ms at 256 and 1024 readers (2145).
     - P5 accepts a 49 ms baseline with 73 ms during the sweep (2197).
     - A candidate that slows commits when no readers or no sweep are present hides real blocking.
   - **Fix:** compare against a pinned A0 or prior-run baseline, or state the 256-reader writer bar as absolute and enforce P2's
     50 ms inside the ladder and the sweep segments.
7. **A crash-only bundle returns RECOMPUTED with `lag: null`** (NF2, test NF2).
   - **Problem:** RECOMPUTED no longer means a judged run (1922 to 1938). Any consumer that reads `status` instead of
     `bars.P3.met` would grant P3, or the P2 arithmetic beside it, from a crash bundle.
   - **Fix:** give crash bundles a distinct status (for example `CRASH-RECOMPUTED`), or make RECOMPUTED require `met`.
8. **Builder fixtures derive the "pins" from the candidate payload** (`ns-round2-fixture.mjs:50 to 55`).
   - **Problem:**
     - `commands`, `epochs`, `consumerId`, `minimumSamples` and the crash companion are all computed from the payload being judged.
     - The round 2 regressions for O17, O4, O21 and O7 therefore never use an independently frozen trace.
     - My own O17 test catches the forgery only because the builder's edit rebuilds the pin from `offer.subject`. Calling
       `completeFixture` again after planting the forgery would make the pin match it.
   - **Fix:** build fixture pins from a separate frozen-trace object written before the forgery is planted. Add one regression
     where the pin is fixed and the source is altered afterwards.
9. **The companion's trusted settings are not checked against the primary's** (hypothesis N1).
   - **Problem:** line 1926 compares only the binding fields and forbids nesting. A companion evaluated with a laxer `trusted`
     (another `readerLevel`, other `commands`, `minimumSamples`, `consumerId`, `epochs` or oracles) would still grant resume.
     Nothing pins which crash attempt is the companion, so best-of-N selection is possible at integration.
   - **Fix:**
     - Require every companion `trusted` field except `binding.attemptId`, `key` and `headSha256` to be identical to the primary's.
     - Pin the companion attempt id in the primary's binding.

### Low (4)

10. **A logical duplicate under a fresh commandId commits twice** (V-O1).
    - **Problem:** this is refused only if the driver reuses commandIds for duplicates.
    - **Fix:** state the rule in SCHEMA, and require every `duplicate` or `lost-ACK retry` offer to have an earlier offer with the
      same commandId.
11. **Per-subject commit order versus offer order is never checked** (V-O5/O17).
    - **Problem:** two in-flight commands for one subject can commit in reverse of their offer order. Scenario 6 says "each subject
      commits once, in order".
    - **Needed:** a ruling on whether open-loop concurrent commands for one subject must commit in offer order.
12. **A basis form that differs from the source's position form empties the oracle prefix** (V-O10).
    - **Problem:** `nsPrefix` (line 1702) compares a decimal-string basis, which maps to stream `''`, with object positions, so every
      transaction is clipped. A candidate that returns the empty-world answer would then pass P1 correctness.
    - **Fix:** refuse BASIS-FORM-MISMATCH when the basis form differs from the source's position form.
13. **Several round 1 regressions now refuse for an unrelated reason.**
    - **Affected:** O8 (missing fields), O13 (missing new arguments), O14 (no sweep interval) and O18 (storage pin).
    - **Problem:** they would stay green even if the property check they target were removed.
    - **Fix:** assert the specific code in each regression, and give O8, O13 and O14 complete inputs. V-O13 shows the right code
      is reachable.

## Files

- `lab/verify/CRNS-opus/REVIEW-round2.md`: this review.
- `lab/verify/CRNS-opus/forgeries-round2.test.mjs` and `forgeries-round2.tap`: the round 2 variants and new-attack tests at 2cdb3d2f.
- `lab/verify/CRNS-opus/forgeries-at-2cdb3d2f.tap`: my round 1 file as edited by the builder, rerun at 2cdb3d2f (30 of 30 pass).
- `lab/verify/CRNS-opus/reasons-audit.mjs` and `round1-reasons-at-2cdb3d2f.txt`: the refusal codes for each round 1 forgery.
- `lab/verify/CRNS-opus/ROUND2-HYPOTHESES.txt`: the fix-introduced attacks I wrote before reading the round 2 code.
