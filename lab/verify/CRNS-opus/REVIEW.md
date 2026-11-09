# CR-NS recompute: Opus adversarial review

Target: `recomputeNS` and helpers in `lab/bin/claim.mjs` (lines 1574 to 2069), branch `exp/CRNS-recompute` at `2f299bfa`, with
`lab/experiments/EXP-CRNS/SCHEMA.md`. Reviewer: Opus, independent of the Codex reviewer. Date: 2026-11-09. Nothing committed.

## Summary

- **29 forgeries found that the code accepts.** None of them is covered by R44 section 4.4 (F1 to F20) or by
  `lab/bin/test/claim-ns.test.mjs`. Six of the 29 are named in REPORT.md or SCHEMA.md as adapter work, but the code still accepts them.
- **By severity: 10 high, 11 medium, 8 low.**
- **21 of the 29 are reproduced** in `forgeries.test.mjs` as `{ todo }` tests: each asserts REFUSED and currently fails. The other 8
  are shown by the baseline fixture or cited by line.
- **Controls refused correctly:** a truncated chunk chain, a mismatched retry receipt, an ACK before L when P2 is requested, and a
  same-key duplicate effect.
- **The worst class is forgeries the candidate can make with its own data.** The candidate writes the source store, the consumer
  database and the answers. The evaluator checks most of P3 and P1 against the candidate's own source, so a source that lies
  consistently checks out against itself (O5, O17). Some refusals also run only when a priority other than P3 is requested (O6).

## How this review was done

1. I read `claim.mjs` 1574 to 2069 and SCHEMA.md, then wrote my list (`LIST-DRAFT.txt`, O1 to O27). I had not yet opened R44
   section 4.4, REPORT.md or the builder's tests. O28 and O29 were added during the analysis that followed.
2. I wrote my own fixture (`forgeries.test.mjs`), independent of the builder's: one valid baseline world that comes out RECOMPUTED for
   both `['P3']` and `['P3','P2']`, then one planted change per forgery.
3. Only after that did I read R44 section 4.4, REPORT.md and `claim-ns.test.mjs`, and compare.

Run with `node --test lab/verify/CRNS-opus/forgeries.test.mjs`. Result on 2f299bfa: 30 tests, 7 pass, 23 todo, 0 fail
(`forgeries.tap`). The 23 todo tests are 22 forgery tests plus O7, which asserts that resume evidence exists.

## Threat model used

- **The candidate controls:** the source store contents (positions, change ops, entry kinds), the consumer database (rows, labels,
  epochs), answers to reads and pulls, the activation receipt, broker frame bytes, and when it makes a commit visible to the
  observer's source polls.
- **The candidate does not control:** the driver's schedule and timestamps, the observer's brackets, the HMAC envelope, or the
  `trusted` object.
- **A forgery** is any candidate action, or adapter shortcut, that gets a RECOMPUTED result, or a true bar, while the property
  does not hold.

## Forgery table

"Refused" means the code refuses it today. Tests are in `lab/verify/CRNS-opus/forgeries.test.mjs`. Line numbers are `lab/bin/claim.mjs`.

| Id | Bar | Method | Refused | Evidence |
| --- | --- | --- | --- | --- |
| O1 | P2 idempotency, P3 exactly once | The same commandId is committed in two source transactions (the retry is applied twice). The original receipt is still returned. | no | test O1; 1743 checks only that commandIds were offered. Nothing checks that each commandId appears in only one transaction. |
| O2 | P2 latency, progress | A typed error is returned 1 ms after the offer and the command commits 400 ms later. The band p99 is recorded as 1 ms. | no | test O2; 1873 counts any `ackAtNs`. 1884 only refuses valid commands that never publish. |
| O3 | P2 duplicates and lost ACKs | A retry is answered with a typed "duplicate" error instead of the original receipt. | no | test O3; 1878 compares only receipt to receipt. E1 `kind` from R44 4.1 was dropped from SCHEMA. |
| O4 | P3 visible duplicate effects | A second effect row for the same (position, subject) uses a different `epoch` or `consumer` string. | no | test O4 (two variants); the 1590 key includes free-text labels, and 1781 merges subjects into a Set. |
| O5 | P3 order, gaps on resume | The source offset order contradicts the cursor (position) order. A position's coordinates need not match its entry's offset. | no | tests O5 and O5b; 1730 to 1737 never compare a position with its entry's offset, or positions across entries. |
| O6 | P3 lag start, P3 progress | With `priorities:['P3']`, the candidate typed-rejects most commands so the feed is tiny. It can also hide commits from source polls until after the ACK, so L starts late. | no | tests O6a and O6b; 1837 gates ACK-BEFORE-PUBLICATION (1876), VALID-COMMAND-NOT-PUBLISHED (1884) and UNACCOUNTED behind a non-P3 priority. |
| O7 | P3 resume replays exactly | `faults: []` skips every crash check. Any bundle with faults is TIMING-UNJUDGED and so always REFUSED. No RECOMPUTED result carries resume evidence, and `bars.P3` has no resume field. | no | test O7; 1830, 1832, 1834 |
| O8 | P3 resume | Each fault witness replays one arbitrary entry. The replay is not tied to a checkpoint, and nothing checks for gaps or duplicates across the crash run. | no | test O8; 1823 to 1827 check only the digests of the listed offsets. |
| O9 | P3 gaps, lag | A commit whose source L is at or after `endNs` (or before `startNs`) never reaches the consumer's durable record. It produces no gap, no lag sample and no refusal. | no | test O9; 1795 to 1800 refuse a missing consumer bracket only inside the window. |
| O10 | P1 correctness | The expected-answer memo is keyed by (subject, shape, requestedBasis). A hops-6 pull answered with the hops-3 answer counts as correct. A candidate cache keyed by subject and basis would never be caught. | no | test O10; 1917, 2002. R44 4.3 specifies the same lossy key. |
| O11 | P1 ladder levels | A window labelled 1024 (or 256) holds reads from a single loop. The level is a self-declared label. | no | test O11; 1999, nsSegment. Acknowledged in REPORT.md as an adapter matter. |
| O12 | P1, P2, P3 "with 256 readers" | E8 claims 256 loops per second while `reads[]` is empty. E8 is never cross-checked against reads. | no | test O12; 1811 to 1819 |
| O13 | P4 history flatness | History pulls carry no answer hash. A candidate can serve stale depth-1 answers at depth 10 and stay flat. `bytesRead` is per pull and its origin is unchecked. | no | test O13; 2034 to 2050 |
| O14 | P5 live traffic | The "during sweep" segment can be a byte copy of the baseline. `nsP5Traffic` never sees the sweep interval or the reader count. | no | test O14; 2053 to 2057. The builder's own 100k test passes with identical segments (claim-ns.test.mjs:220). Acknowledged in REPORT.md. |
| O15 | P5 basis | `activationReceipt.basis` only has to be defined. It is not bound to the activation command's source position or to the release hash. Sweep end is not bracketed by output durability. | no | 1957, 1968, 1972 (code citation, no test). Partly acknowledged in REPORT.md. |
| O16 | P3 affected set, P1, P2, P5 oracles | Every oracle gets the full `entries` list, named "prefix", including entries after the position or basis. An oracle that trusts "prefix" sees future dependency state. | no | test O16; 1785, 1881, 1884, 1918, 1968. The builder's real O-DOMAIN call ignores the source and uses the static C34 world (claim-ns.test.mjs:90 to 93). |
| O17 | P3 affected set, P1 answers, P2 | A committed transaction's change ops are never compared with the offered command. Offers carry no content digest, so a source that drops or retargets changes still gets an affected set and answers that agree with it. | no | test O17; 1743 to 1747. Only the trusted `commandValid` or `ryow` stubs could catch it, and they do not run for P3 alone. |
| O18 | P3 source integrity | Broker frames with a valid CRC chain, whose payloads are unrelated to `entries`, pass. CRC is not authentication, and entries are never decoded from the frames. | no | test O18/O25; 1723 to 1725. Acknowledged in REPORT.md. |
| O19 | P3 order, duplicates | The WAL hex is never used to rebuild transactions. Any hex string where the final copy starts with the tailed copy passes. | no | baseline B1 uses `aa` and `aabb`; 1752 to 1755. Acknowledged in REPORT.md. |
| O20 | CR cross-check | `crossChecks: []` passes. R44 4.2 requires a cross-check "for every LSN". | no | baseline B1; 1805 |
| O21 | P2, P3 quantiles | There are no minimum sample counts. One offer per band, or one position in the window, gives a p99 that passes. | no | baseline B1 (n=1 per band); test O6a (lag n=1); 1611 |
| O22 | P2 ACK after publication | An ACK inside a wide bracket (L <= ack < U) is only counted. Neither bracket width nor the undecided share is bounded. R44 says undecided must not count as an ACK-order pass. | no | test O22; 1877 |
| O23 | P1 goodput, P2 latency | Duplicated observer records for offers or reads are accepted: offers and reads have no event id. | no | 1860, 1914 (code citation) |
| O24 | P1 recovery | A recovery window matches when both `id` and `recoveryOf` are undefined. | no | test O24; 2024 |
| O25 | P3 source verification | `storage: 'broker-frame/2'` in the payload skips `trusted.verifySource`, even when the evaluator would refuse the source. The storage kind is not pinned by `trusted`. | no | test O18/O25 (`verifySource` returns false; result is RECOMPUTED); 1723, 1726 |
| O26 | P3 affected set | One position's expected subjects can be split across two consumer labels. Consumer identity is not pinned. | no | 1781 (code citation, same root as O4) |
| O27 | P4 bucket bar, P1 workload | The provisional largest-bucket p99 of 50 ms is not enforced. The P1 hot-set share (50%) and the straddle share (10%) are not checked. | no | 1947 (reported only); no reference to hot set or straddle |
| O28 | All timing | `clockDomains` can leave out a participating role. SCHEMA says a JSON list cannot prove completeness. | no | 1718; acknowledged in SCHEMA.md |
| O29 | P1 writer ratio, P4 history, P5 traffic | The baseline is inflated: the candidate slows writes when no readers are connected, or slows depth-1 pulls, or slows traffic before the sweep, so the ratio bars pass. Example: baseline 100 ms and 120 ms at 256 readers passes. | no | test O29a; 2016, 2021, 2049, 2057 (ratios with no absolute floor) |
| R1 | Envelope | Truncated chunk chain | yes | test R1 (OBS-UNAUTHENTICATED) |
| R2 | P2 | Retry receipt naming another transaction | yes | test R2 (IDEMPOTENCY-RECEIPT-MISMATCH) |
| R3 | P2 | ACK before L with P2 requested | yes | test R3 (ACK-BEFORE-PUBLICATION) |
| R4 | P3 | Same-key duplicate effect | yes | test R4 (NS-P3-VISIBLE-DUP-EFFECTS-MAX) |

## Comparison with R44 section 4.4 and the builder's tests

- **F1 to F20 are all present** in `claim-ns.test.mjs` (lines 52 to 86), and each is refused with its expected code. My controls R1 to
  R4 overlap F3, F9 and the builder's P2 test.
- **None of O1 to O29 appears** in F1 to F20 or in the builder's tests.
- **Six are named as adapter work** in REPORT.md or SCHEMA.md but are still accepted: O11, O14, O15 (partly), O18, O19, O28.
- **Three come from R44 itself:**
  - O10: R44 4.3 specifies the lossy (subject, shape, basis) key.
  - O1: R44 4.2 allows "its duplicate or retry" in C without saying a commandId may commit only once.
  - O7: R44 makes crash runs lag-unjudged but never says which result carries the resume bar.
- **The builder's fixtures hide two of these:**
  - O5: `receipt.position` equals `entry.offset`, so the missing offset-to-position check never shows.
  - O14: the P5 test passes with identical baseline and sweep segments.

## Uncovered forgeries ranked by severity, with proposed fixes

### High (10)

1. **O17: source content is not bound to the offered command.**
   - **Problem:** every P3 affected set and P1 answer is checked against the candidate's own source, so a consistent lie checks out.
   - **Fix:** carry a `commandSha256` per offer from the frozen trace (pinned through `inputsSha256`). Have the evaluator compare
     each committed transaction's change ops, canonicalized, with the trace command for every commandId. Refuse on any difference
     (SOURCE-CONTENT-MISMATCH). Run this whatever the priorities.
2. **O6: P3-only evaluation skips the source preconditions.**
   - **Problem:** with `priorities:['P3']`, the progress, accounting and ACK-order checks never run. That lets the candidate
     shrink the feed, or move lag start later by hiding commits from the source store until after the ACK.
   - **Fix:** run UNACCOUNTED, VALID-COMMAND-NOT-PUBLISHED and ACK-BEFORE-PUBLICATION in the main P3 path, unconditionally.
     R44 4.2 already makes LOST-ACKED-COMMIT a P3 precondition, and these belong with it.
3. **O7: no RECOMPUTED path verifies resume.**
   - **Fix:** add `bars.P3.resume`. A P3 grant should require a companion crash-run result, bound to the same build and source,
     whose counts are clean and whose witnesses pass O8's check. A lag result alone should never close P3.
4. **O1: duplicate commit of one command.**
   - **Fix:** refuse DUPLICATE-COMMIT when one commandId appears in more than one committed source transaction. Corrections need
     their own commandIds.
5. **O2: a fast typed error followed by an async commit.**
   - **Fix:** refuse ERROR-BUT-COMMITTED when an offer carries `typedError` or `typedConflict` but its commandId is published.
     Measure P2 latency for oracle-valid commands to the receipt ACK only, and treat a typed error on a valid command as censored
     (infinity).
6. **O3: a retry answered with a typed error.**
   - **Fix:** restore E1 `kind` from R44 4.1. Once a commandId is published, every later attempt must carry a receipt equal to the
     original's. Otherwise refuse IDEMPOTENCY-RECEIPT-MISMATCH.
7. **O4: a duplicate effect under another label.**
   - **Fix:** pin consumer id and epoch in `trusted`. Refuse rows whose `consumer` or `epoch` differs from the pinned values, and
     count duplicates on (position, subject) per pinned consumer.
8. **O5: feed order not checked against cursor order.**
   - **Fix:** require positions to increase strictly in offset order across entries (and across transactions within an entry).
     Require each position's stream, epoch and offset to equal its entry's. Refuse with NS-P3-ORDER-VIOLATIONS-MAX.
9. **O10: the read memo is lossy.**
   - **Fix:** key the memo on `canonText` of the whole read request (every field except timing, answer and echoed basis), or call
     the oracle for every read. Amend R44 4.3 to match.
10. **O13: history-flatness pulls are never checked for correctness.**
    - **Fix:** add `answerSha256` to `historyPulls` and check each one with `replayRead` at the current basis for its depth phase.
      Take bytes read from per-phase cgroup `io.stat` deltas, not per-pull numbers.

### Medium (11)

1. **O8:** a fault witness must record the checkpoint frontier before the crash.
   - The replay must equal the contiguous deliveries from checkpoint+1 to the recovery frontier.
   - Gap and duplicate counts must cover the whole crash run.
2. **O9:** every committed position needs a consumer bracket with U <= drain, wherever its L falls.
   - Positions outside the window add a gap when they have no bracket.
   - They still add no lag sample.
3. **O16:** pass `entries` up to and including the position's entry as `prefix`, and filter by basis for `replayRead`, `ryow` and
   `domainSweep`.
   - Add a test with a future entry that changes the dependency graph.
   - Replace the static C34 world in the builder's O-DOMAIN test with state derived from the prefix.
4. **O12:** derive E8 loops inside the evaluator: per second, the distinct loops with a completed read in `reads[]`.
   - Or refuse when E8 and `reads[]` disagree.
5. **O11:** bind each ladder segment to E8 seconds inside its window, with at least `level` distinct loops for 99% of those seconds.
6. **O14:** pass the sweep interval to `nsP5Traffic`.
   - Require the sweep segment to lie inside `[sweep.startNs, sweep.endNs]` and the baseline to lie outside it.
   - Require 64 loops in E8 for both segments.
7. **O15:** require `activationReceipt.basis` to equal the receipt position of the trace's activation command in the source.
   - Bind the release hash in `trusted`.
   - Take sweep end from an observer bracket at which all outputs are durable.
8. **O18:** decode entries from frame payloads in the evaluator with a pinned decoder, or require `trusted.verifySource` for broker
   storage too.
9. **O25:** pin the expected source storage kind in `trusted`, and refuse a payload whose `storage` differs.
10. **O22:** report the undecided share.
    - Bound bracket width (for example, p99 width at most a pinned number of ms).
    - Do not treat undecided ACKs as passing ACK order.
11. **O29:** add absolute floors next to every ratio.
    - The zero-reader baseline writer p99 must meet the P2 bar.
    - Depth-1 pulls must meet the P4 bars.
    - The P5 baseline must meet the P1 and P2 bars.

### Low (8)

1. **O20:** require a cross-check record for every committed position, or document in SCHEMA that E11 is optional.
2. **O21:** pin minimum sample counts per bar from the frozen schedule (offers per band, positions in the window) and refuse below
   them.
3. **O19:** the evaluator, or a pinned O-OBS step whose result is bound into the bundle, rebuilds transactions from the WAL bytes.
4. **O23:** give offers and reads a unique event id and refuse duplicates.
5. **O24:** require `id` on every ladder window and `recoveryOf` on the recovery window.
6. **O26:** fixed by O4's pinned consumer.
7. **O27:** enforce the largest-bucket p99 once Sam confirms it. Check the hot-set and straddle shares from read metadata.
8. **O28:** pin the list of participating roles in `trusted` and require one clock-domain entry per role.

## Note: a lost-ACK run may be falsely refused (not a forgery)

- **What happens:** the original attempt of a lost-ACK retry has no receipt and no typed result. Under P2 it counts as UNACCOUNTED
  (line 1864), unless the adapter copies the retry's receipt onto it.
- **What to do:** SCHEMA should say which of these is intended, so that a correct run is not refused.

## Files

- `lab/verify/CRNS-opus/REVIEW.md`: this review.
- `lab/verify/CRNS-opus/forgeries.test.mjs`: the planted-forgery tests (own fixture).
- `lab/verify/CRNS-opus/forgeries.tap`: the TAP output on 2f299bfa.
- `lab/verify/CRNS-opus/LIST-DRAFT.txt`: my list as written before R44 4.4, REPORT.md and the builder's tests were read.
