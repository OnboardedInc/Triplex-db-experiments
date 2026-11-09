# OBS01 round 10 review — FIX-FIRST

Reviewer CX-VOBS7, Codex gpt-6.1-sol (high). Reviewed `exp/OBS01-observer` at
`1f7d412b309f9970b24cca64f7b4e8b08240f24f`.
North star: P2/P3 correctness, using `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

**FIX-FIRST:** the round 9 reproductions are fixed under the revised syncfs interval decision, but three new boundary
fixtures fail. They concern incomplete WAL-tail timing evidence, omission of an uncertainty code when one commit has
multiple ACKs, and W0's claim to distinguish clock primitives. These findings do not demonstrate a new premature
durability grant with complete, correctly timed input. They prevent certifying all the requested coverage/code/clock rules.
No implementation or acceptance contract was edited, and nothing ran in the VM.

## Fresh verification

Read CLAUDE.md, the scope/north-star/protocol, CODEX-PREAMBLE, REPORT.md Round 10 (including all numbered divergences),
VM.md Round 10, and the actual R49 from the main checkout. The retained R49 SHA256 is
`50d4ce146f589c24fd36d11ce56411842537e23db017636118dd44c0b8a372d3`; R48 is retained alongside it.

Source-bound attempt: [`lab/verify/CX-VOBS7/round10/RUN.json`](../../verify/CX-VOBS7/round10/RUN.json),
[`SHA256SUMS`](../../verify/CX-VOBS7/round10/SHA256SUMS).
The runner records the reviewed head, 16 executable source hashes, commands, exact stdout/stderr hashes and source equality
after execution. Disk exceeded 5 GiB; both execution batches acquired `heavy.mjs` admission after waiting for shared slots.

| Fresh execution | Result |
| --- | --- |
| `test_vm.py` | 14/14 pass |
| `test_syncwitness.py` | 18/18 pass |
| `test_round10.py` | 40/40 pass |
| `node --test lab/observer/test_engine.mjs` | 21/21 pass |
| `review_round9.py`, current F5 expectation, fresh OUT | 11/11 pass |
| New `review_round10.py` | 1 boundary-table control passes; 3 regression assertions fail; zero errors |
| New `extra_round10.py` | 2 new controls pass, plus 8 imported builder split tests also rerun and pass |

All 72 requested Python and 21 requested Node tests were run. The old reviewer evidence was preserved; the round 9 replay
writes only to `round10/prior-fixtures`. Extra results are in
[`lab/verify/CX-VOBS7/round10-extra/`](../../verify/CX-VOBS7/round10-extra/).
The extra controls inspect normalization locals **at the real exception**, without suppressing refusal, and execute only
the Dockerfile's first shell guard on the host. No Docker build, apt, network, image pull or BPF attach occurred.
An optional repeat of just those two extra controls produced no usable result after a 300-second subprocess timeout while
the last observed heavy slots belonged to other jobs. It is retained as
[`round10-extra/attempt02/NO-RESULT.json`](../../verify/CX-VOBS7/round10-extra/attempt02/NO-RESULT.json), is not counted as a
test outcome, and does not replace the earlier observed 10/10 extra-suite run or its two retained control results.

The main invocation was `node lab/bin/heavy.mjs --label CX-VOBS7-round10 -- python3 -B lab/verify/CX-VOBS7/run_round10.py`.
It refuses to overwrite its attempt directory. To reproduce only the new boundary assertions into fresh temporary evidence:

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-r10-replay -- python3 -B -c 'import sys,tempfile,unittest;from pathlib import Path;sys.path.insert(0,"lab/verify/CX-VOBS7");import review_round10 as r;r.OUT=Path(tempfile.mkdtemp(prefix="cx-vobs7-r10-"));print(r.OUT);unittest.main(module=r,verbosity=2)'
```

## Findings

### R10-F1 — Medium: a WAL tail with missing or invalid timing is excluded instead of refusing

Location: `lab/observer/vm_normalizer.py:483`.
Fixture: `lab/verify/CX-VOBS7/review_round10.py:35`,
`test_wal_tail_without_timestamp_must_not_be_silently_excluded`.
Evidence: [`round10/independent/untimed-tail.json`](../../verify/CX-VOBS7/round10/independent/untimed-tail.json).

`tails` selects only WAL events whose `atNs` is already an integer. A missing/string/bool timestamp silently removes the
chunk from the last-observation coverage calculation. The fixture removes the tail timestamps from an otherwise valid
witnessed VM-mode run. It is accepted with kernel-witness durability. Final timestamps are validated explicitly, while
WAL-tail timestamps receive no corresponding validation.

This does not show a correctly timestamped late tail passing: that case is correctly refused by the existing test.
It shows that the judge accepts evidence from which the required tail coverage cannot be established. The round 10 rule
says detach must cover **every** tail, and explicitly avoids relying on controller order. An omitted tail cannot be assumed
to predate a final without validating and specifying that alternate ordering proof.

Proposed fix: require a nonnegative integer `atNs` for every WAL event in a witnessed run, validate it in this attempt's clock
interval, then include every chunk. Refuse TRACE-INCOMPLETE when the evidence is absent/malformed. Add missing/string/bool/
negative timestamp fixtures as well as the existing correctly typed late-tail fixture. Alternatively specify and validate a
trusted event-order bound for untimed tails; silently dropping them does not prove that bound.

### R10-F2 — Medium: a proven early ACK hides another ACK's DURABILITY-UNPROVEN case

Location: `lab/observer/vm_normalizer.py:438`–`:440`.
Fixture: `lab/verify/CX-VOBS7/review_round10.py:24`,
`test_multiple_acks_keep_both_proven_and_unproven_codes`.
Evidence: [`round10/independent/multiple-acks.json`](../../verify/CX-VOBS7/round10/independent/multiple-acks.json).

One commit has syncfs interval `[120,300]`, `U=400` and two ACKs `[115,250]`. The first proves ACK-BEFORE-DURABLE; the second
lies inside `[D_lower,D_upper)` and therefore meets the documented DURABILITY-UNPROVEN condition. The judge returns only
ACK-BEFORE-DURABLE, because its `elif` prevents testing the uncertain ACK whenever *any* ACK is below the lower bound.
A grouped publication can have multiple members/ACKs, so the plural list is a real supported input.

The run still refuses, and its primary code is sensible. The defect is the missing secondary code and incomplete
classification of every observed ACK. The existing test covers a proven ACK plus an uncertain **U**, which uses a separate
branch and thus misses this case.

Proposed fix: compute proven ACKs and uncertain ACKs independently; set the uncertainty flag whenever
`any(lower <= at < upper for at in acks)`, even if a different ACK proves a violation. Keep the proven code primary and
deduplicate DURABILITY-UNPROVEN once per commit. Add order permutations and multiple-member fixtures.

### R10-F3 — Medium: W0's clock check can pass a boot-clock substitution

Locations: `lab/bin/sync-witness.mjs:20`–`:22` (claim/thresholds), `:105`–`:115` (verdict);
`lab/observer/VM.md`, Round 10 W0 clock claim.
Fixture: `lab/verify/CX-VOBS7/review_round10.py:73`,
`test_w0_wrong_clock_can_pass_with_small_offset_or_transport_delay`.
Evidence: [`round10/independent/clock-discrimination.json`](../../verify/CX-VOBS7/round10/independent/clock-discrimination.json).

Twenty samples using the wrong boot value in the field named `monotonicNs` pass:

| Actual boot-minus-monotonic offset | Receipt delay | Measured min hop | W0 |
| --- | --- | --- | --- |
| 0.5 ms | 0.1 ms | -0.4 ms | PASS (inside 1 ms slack) |
| 0 | 0.1 ms | 0.1 ms | PASS; clocks are observationally indistinguishable |
| 10 ms | 20 ms | 10 ms | PASS; transport masks the positive offset |

**100 ms is not sufficient to guarantee detecting the wrong primitive.** More precisely, this implementation applies 100 ms
to *lag*, while a boot clock normally runs *ahead*; its relevant forward allowance is 1 ms, plus unknown receipt transport.
Twenty samples may reduce transport delay but cannot guarantee it or manufacture separation between the clocks.

The clock meanings also need precision: monotonic time is elapsed boot-relative time excluding suspend; boottime includes
suspend. Their difference is accumulated suspend time, which can be zero or tiny on a fresh unsuspended VM. It is not guaranteed
to be seconds merely because the VM has been up for a while. The assertion that this difference is always far above tolerance
is false. This finding concerns the W0 proof claim; **all 15 timestamps in the actual witness source are correctly explicit
`nsecs(monotonic)`**, independently checked by source and tests.

Proposed fix: separate a transport sanity check from proof of the clock primitive. Bind/validate the actual witness program's
clock choice (e.g. pinned source/compiler and compiled BPF `ktime_get_ns` versus `ktime_get_boot_ns` helper use). For observational
discrimination, compare against **independent local CLOCK_MONOTONIC and CLOCK_BOOTTIME** references with measured generation/
receipt uncertainty, and require clock separation greater than that uncertainty; otherwise report inconclusive for clock
identification. A smaller arbitrary pipe-hop tolerance cannot distinguish two clocks when their offset is zero. Do not suspend
the VM just for this review.

## Requested checks that pass, with limits

1. **F1 / PUBLICATION-SPLIT:** both marker-first and frame-first splits are detected from transaction deltas; no fixture-id special
   case exists. The original marker-first reproduction now raises primary PUBLICATION-SPLIT with VISIBLE-BEFORE-DURABLE in `also`.
   The independent exception-time inspection confirms position 1024 is computed with **D=11,000,000 ns**, not the earlier marker
   commit's 10,300,000 ns, and durableEndNs=11,000,000 ns. This computed result is refused, not exported as acceptance. The relevant
   code is `publication_split` at `vm_normalizer.py:159`, `commit_views` at `:496`, and maximum aggregation at `:654`.
   A publishing view explicitly missing U returns WITNESS-UNBOUND (`:430`). Horizon-only updates are not publications; existing-row
   metadata rewrites do not acquire the original ACK. The suite covers these boundaries.
2. **F2 with supplied timestamps:** attach is checked against candidate start and first poll start; detach against latest poll end,
   final readback, typed tail timestamp, and observer end. Both allowed equality boundaries pass. The residual is R10-F1.
3. **F3/F4:** W1 compares complete run-code sets/primary as well as timing rows. The old global-refusal fixture now fails W1 as
   intended. `WitnessScan` is genuinely shared by normal parsing and W3 streaming; whole-CPU loss and 27 loss/grammar negatives
   refuse on both paths. The old F4 fixture passes because it gets TRACE-INCOMPLETE, not because W3 was skipped.
4. **F5 single-point/ordinary cases:** file sync Dlower=D=first eligible successful exit. Syncfs grants at syscall exit D_upper;
   lower comes from recorded ext4 entry or syscall entry fallback. ACK/U below lower is proven, inside the half-open interval is
   unproven, and equality at upper passes. The independent table checks both endpoints and adjacent values. Original F5 now returns
   exactly DURABILITY-UNPROVEN with Dlower=110 and D=300. Consumer lag remains max(U,D_upper). No tested case grants durability before
   D_upper. With several eligible syncs the implementation uses min lower/min upper as documented, rather than inventing a single
   exact instant. The residual multiple-ACK code omission is R10-F2.
5. **Nine-code priority:** reasonable: trace/binding/atomicity failures precede content/durability failures; proven timing violations
   precede uncertainty. Existing code primaries remain stable and PUBLICATION-SPLIT deliberately headlines the split. The complete
   set is not yet exact because of R10-F2; W0's PASS issue is separate from normalizer code ordering.
6. **Dockerfile:** arm64 base digest, bpftrace, LLVM/clang, libbpfcc and all five supplied `.deb` hashes match R49. Remaining explicit
   versions also match its table. Unknown libbsd0 is an explicit required build argument rather than an invented version. Running
   the actual initial shell guard with that argument empty exits **1** before installation
   ([receipt](../../verify/CX-VOBS7/round10-extra/missing-build-version.json)). `bash -euo pipefail`, exact `apt-get ... package=version`
   arguments, checksum verification and the closed-package check fail closed on install/check errors; there is no fallback to
   unversioned installation. Archive availability, actual dependency resolution and a real image build remain unverified offline.

## Disposition of the listed divergences

| REPORT Round 10 item | Review |
| --- | --- |
| 1–2 collecting rather than immediately raising split findings | Appropriate: real normalization still refuses, and the durability join contributes the required visibility code. Standalone read still refuses. |
| 3 horizon-only updates / existing-row metadata rewrites | Covered by passing transaction and ACK-ownership controls; this is not a general license to change the source's logical data contract. |
| 4 nine-code order | Sensible as above; fix incomplete multi-ACK secondary codes. |
| 5 expanded coverage | Correct on present integer timestamps; incomplete on missing/malformed tail timing (R10-F1). |
| 6 syscall-entry eligibility, min-lower/min-upper | Matches the documented conservative rule. Can refuse a physically covering sync whose syscall entered before W; this disclosed limitation is not a premature grant. |
| 7 D_upper as syncfs grant | Matches the orchestrator's revised decision, superseding the original exact-ext4-exit requirement for syncfs. |
| 8 mmap expectations | Pure comparison and normalizer refusal work offline; exact real-kernel probe outcome remains unqualified until W1. |
| 9 changed reviewer F5 expectation | Authorized by the new interval decision; all other round 9 assertions remain and pass. |
| 10 chosen thresholds | Clock discrimination is not proven (R10-F3); 80% memory/headroom choices are explicit, unrun operational gates. |
| 11 CAP_PERFMON attach test | Correctly refuses in pure verdict tests on attach failure; actual attach has not run. |
| 12 helper in VM host namespaces | Relies on Q100q; the offline review does not establish actual namespace offsets. |
| 13 image/version gap | Faithful to R49; mandatory libbsd0 input fails closed. No image was built. |
| 13a extra environment checks | Covered by 21 passing Node tests; no profile widening seen. |
| 14 streaming map memory | Disclosed nonconstant memory; parity holds. Not qualification of a 20-minute production trace under the observer budget. |
| 15 old probe/evidence not rerun | Appropriate preservation of historical evidence; no round 9 receipt is treated as fresh round 10 execution. |

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round10.py` | Records child exits and exact stdout/stderr bytes; checks source equality | New directory, attempt timestamps; no old logs substituted | Reviewed head and source hashes, manifest; no engine/slot claim |
| `review_round10.py` assertions and `retain` | Exact code sets, interval endpoints and observed normalize/W0 outputs | New temporary databases/traces and live pure-function execution | Explicit store/cgroup/ranges, raw normalized frames, pinned source from RUN; no VM claim |
| `extra_round10.py` exception-time inspection | Asserts real primary/also and computed latest D; never suppresses refusal | New split database from this invocation | Normalizer source hash in artifact, exact position and actual exception |
| `extra_round10.py` Dockerfile guard | Exact extracted guard exits 1; no install command executed | Fresh host shell execution | Recipe SHA256 in artifact; no claim of Docker/apt execution |
| Optional extra repeat NO-RESULT receipt | Records the observed timeout, not a test verdict | This repeat; earlier evidence retained | Exact job label, post-timeout source hashes and shared-slot observations; no PASS adopted |
| This FIX-FIRST verdict | Three retained failing assertions, passing requested suites and extra controls | This review of 1f7d412b | Source unchanged check, evidence manifest and reviewed head |

All added files are this report or reviewer tools/evidence under `lab/verify/CX-VOBS7/`. No existing tracked implementation,
round 9 evidence, or `lab/acceptance` path changed; there are no moved pinned-path hashes to report. Evidence stays below the
per-file/directory size limits.

Not performed: fixes, VM commands, Docker/image builds, package installation, BPF parsing/attach, real W0–W4, B9/CR-NS integration,
full repository checks, cost or durability-class qualification. Remaining decisions: define when W0 may claim clock identification
versus only transport sanity/inconclusive, and close the two normalizer evidence/code-set gaps above before offline acceptance.
