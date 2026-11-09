# OBS01 round 17 independent W4 review

**Verdict: FIX-FIRST**, at reviewed head `b918a39437a3f734a09d94e885a3bee4b25d0996`.
The original R16-F1/F2 fixtures now pass unchanged, and the receipt path fixes the original failed-copy false loss.
Two boundary defects remain: **High R17-F1**, received END/counter evidence of loss is ignored and can still yield
W4 PASS; **Medium R17-F2**, a correctly copied, receipted zero-byte WAL is rejected as missing.

Reviewer: CX-VOBS7. Correctness reason: durability and recovery claims underpin the lab's P2/P3 measurements.
Read the authoritative scope/protocol and REPORT.md Round 17. Review and tests were offline; no Docker, Colima,
VM, container, image or network operation ran. Implementation and builder tests are unchanged. Actual-harness tests
stub all VM/container calls and execute only local Python/SQLite/judge processes.

## Findings

### R17-F1 — High: END records and received final counters are not validated

**Locations:** `lab/observer/vm_w4_judge.py:45`–56 (`prefix_problems`) and `:63`–66 (`read_trace`).
The new prefix rules check `scan.cpus` and `scan.low`, but ignore `scan.end` and `scan.counts` when those records
were actually received. Thus a backwards detach timestamp is accepted, and a final counter proving a missing event
is discarded as though it were an unknowable crash suffix. `WitnessScan.feed` permits Z and @n records; the existing
normalizer's `finish` checks their bounds/counts, but W4 still never performs those checks.

**Reproduction:** 20 FULL commits, a real recovered SQLite store containing commits 1–19, and a verified collection
receipt for those exact bytes. Remove commit 20's covering sync at CPU sequence 40, then append:

```text
SW1|Z|400
@n[0]: 40
```

The received events are contiguous 1–39, so the new prefix test passes. The received final count explicitly says
there were 40 events. W4 nevertheless reports **pass: true**, `traceDetached: true`, 19 witnessed and zero witnessed
lost. The same recovery with the complete original trace correctly fails with commit 20 witnessed and lost.
Pairing five such FULL rows with five valid, receipt-verified OFF-loss rows produces aggregate **pass: true**,
`counted: 10`, `refused: 0`, `witnessedLost: 0`. This is a complete false-pass reproduction, not merely an auxiliary
diagnostic mismatch. A second fixture appends `SW1|Z|1` after events through timestamp 305; it also passes with counts.

**Failing fixtures:** `test_round17_review.py` tests
`test_R17_F1_completed_end_counters_prove_a_missing_tail_event` and
`test_R17_F1_backwards_detach_timestamp_must_refuse`; `test_round17_pipeline.py` test
`test_R17_F1_final_counter_loss_cannot_complete_an_aggregate_PASS`.

**Proposed fix:** distinguish absent suffix evidence from contradictory evidence that arrived. If Z/@n records are
accepted, validate the detach bounds and every received final counter, including counts for otherwise absent CPUs;
refuse contradictions as TRACE-INCOMPLETE before producing counts. Alternatively, explicitly refuse END-bearing
inputs in the crash-only path. Do not require a missing END or missing final counters to exist after a crash.

Evidence: [end-counter-loss.json](../../verify/CX-VOBS7/round17/end-counter-loss.json),
[end-counter-aggregate.json](../../verify/CX-VOBS7/round17/end-counter-aggregate.json),
[backwards-detach.json](../../verify/CX-VOBS7/round17/backwards-detach.json).

### R17-F2 — Medium: a present zero-byte WAL is converted into a missing copy

**Location:** `lab/observer/vm_w4_judge.py:114`, before the valid verifier at `:88`–91.
`judge_trial` passes `wal_bytes or None` to `verify_collection`. A successfully copied empty file therefore becomes
`None`, even when the collector lists it present, reports size 0 and SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, and the copy status is true.
Direct `verify_collection` correctly accepts those exact bytes with `walAbsent=False`; the trial and production CLI
instead refuse COPY-FAILED. This is a false refusal, not a false durability grant, but it can discard a legitimate
OFF recovery outcome in which the WAL file exists with zero length.

**Reproduction:** seeded main database, 20 OFF ACKs/unwitnessed writes, a present zero-byte `broker.db-wal`, matching
size/hash receipt and both copy statuses true. The CLI exits 1 with “the volume (0 bytes) but its copy failed or is
missing”, even though the file was copied exactly. No absence assertion is needed: the receipt lists it present.

**Failing fixtures:** `test_round17_review.py` test
`test_R17_F2_present_zero_byte_WAL_is_distinct_from_a_failed_copy`; `test_round17_pipeline.py` test
`test_R17_F2_CLI_accepts_a_present_exactly_receipted_zero_byte_WAL`.

**Proposed fix:** preserve `b''` versus `None` when handing bytes to collection verification. Only `None` means no
local file. Let the receipt determine present-empty versus absent; keep refusing unproven absence and damaged copies.

Evidence: [zero-byte-WAL.json](../../verify/CX-VOBS7/round17/zero-byte-WAL.json),
[zero-byte-WAL-CLI.json](../../verify/CX-VOBS7/round17/zero-byte-WAL-CLI.json).

## What the round 17 fix does correctly

- The unchanged R16 five Python fixtures pass, including the original hidden witnessed loss; both gap/regression
  refusals carry TRACE-INCOMPLETE without commit counts. The old failed-WAL case now refuses WAL-ABSENCE-UNPROVEN.
- The unchanged actual-harness R16 I/O fixture passes. Its missing collector receipt now causes refusal earlier than
  the injected copy failure, so it alone would not establish the new hash comparison. The five new builder harness
  tests supply valid receipts and separately exercise clean copy, failed copy, short/altered copy, confirmed absence
  and missing receipt. All pass, using the real host judge with VM/container calls stubbed.
- Received CPU event sequences must start at 1 and remain contiguous; timestamps in that sequence cannot regress;
  an event/entry before attach, a positive lost-events line or ERROR/FATAL stderr refuses. A valid prefix with a cut
  final line remains judged. The counter/END exception in F1 is the remaining hole in this rule.
- Listed nonempty main/WAL copies require true copy status and exact byte length/SHA256. Missing, short and altered
  copies refuse before recovery/counting. Receipt/listing disagreement refuses. WAL absence is accepted only when
  the receipt lists it absent, and is flagged `walAbsentConfirmed`. A missing CLI receipt or witness stderr refuses.
- The collector is created for the same fresh trial volume, mounts it read-only, reads as the writer UID, hashes the
  store bytes and prints its listing. The Docker wrapper throws on command failure; receipt parse failure is retained
  as `receiptError`. This binding is supported by the code and offline tests, not a new live collector execution.
- Aggregate excludes explicitly refused trials from FULL/OFF counts, witnessed-loss sums and OFF-loss sums, and fails
  them. My additional control gives refused rows stale positive counts: none contribute. Trials without a verified
  collection also fail the aggregate. A mere historical pure-judge pass cannot qualify a W4 campaign.

## Fresh execution and historical replay

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R17 -- python3 -B lab/verify/CX-VOBS7/run_round17.py
node lab/bin/heavy.mjs --label CX-VOBS7-R17 -- python3 -B lab/verify/CX-VOBS7/capture_round17_pipeline.py
```

Free host space at entry: **92,856,619,008 bytes**. The capture binds reviewed HEAD, commands/exits, timestamps and
**140 source/artifact hashes**; sources remain unchanged during execution. The second capture checks those same pins
and its two additional fixture/capture sources.

| Check | Result |
| --- | --- |
| Python builder suites: vm / syncwitness / round10 / round11 / w4 | 14 + 18 + 40 + 20 + 16 = **108/108** |
| Node builder suites: engine / round12 / round16 / abba / round17 | 26 + 25 + 11 + 7 + 5 = **74/74** |
| Original R16 Python adversarial fixtures | **5/5**, assertions unchanged |
| Original R16 actual-harness I/O fixture | **1/1**, unchanged |
| Original R16 golden/ABBA JS replay | **2/2**, unchanged |
| Recorded R16 data replay with authorized aggregate re-pin | exit **0** |
| New boundary suite | **6/9**; three failing assertions for F1/F2 retained |
| New aggregate/CLI pipeline suite | **0/2**; both failing assertions retained |

The old JS/Python fixture outputs are redirected into `round17/`, leaving committed round16 evidence untouched.
Only output destinations change; fixture assertions and source files remain unchanged. Recorded replay again hashes
all 410 durable R16 manifest files and reproduces W1, W2, ABBA samples/stream checks and both rehearsal trial judgments.
The actual historical rehearsal still has no collection receipt, so no receipt is manufactured retrospectively.

The one authorized `review_round16.py` assertion now preserves the recorded aggregate's counts while requiring the
new exact `counted: 2`, `refused: 0`, three reason strings and false overall result, including “trial(s) without a
verified store collection record: 1, 2”. All per-trial and other replay assertions are unchanged.

| Changed reviewer path | Old SHA256 at b918a394 | New SHA256 |
| --- | --- | --- |
| `lab/verify/CX-VOBS7/review_round16.py` | `4f5e7f71125466de92b05dabc503bd5aa8a1808218034190ed90fe9eccbb8f24` | `97065767fee389ad480346364c6dc1dee5d402413a0f43fb9c78f6aa38452488` |

No implementation or acceptance path is changed or re-pinned. The historical source preimage is retained in Git.
All new evidence files are below 1 MB each and the new evidence directory is below 5 MB.

## Verdict/receipt audit (rule 9a)

| Reviewer observation → result site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round17.py` / RUN.json | Every command's actual exit and stdout/stderr hashes, 140 source/artifact hashes before/after | Fresh attempt/timestamps under heavy admission | Exact reviewed HEAD/argv/source pins; no VM slot claim |
| R16 unchanged fixture execution / output redirection | Original assertions run, exact refusal/pass outcomes retained | Fresh local construction and execution | Unchanged fixture source hashes; writes bounded to round17 destinations |
| `review_round16.py` replay and aggregate re-pin | Exact raw manifest/copy/trace/SQLite/sample comparisons; exact new aggregate reasons and counts | Fresh reread/recalculation of historical bytes | Named R16 attempts, verified manifest, writer/store/cgroup and input digests; no retrospective receipt |
| New prefix/collection boundary assertions | Real SQLite bytes, verified receipts, complete-trace control, explicit missing counter and empty-file outcomes | Newly constructed this review | Same fixture writer/dev/inode/cgroup and exact copied file hashes; failed assertions preserved |
| Aggregate and production CLI pipeline fixtures | Actual aggregate false pass; actual CLI exit/refusal; matching empty-WAL input/receipt hashes | Fresh local calls/processes and captured logs | Exact reviewed functions/source hashes, CLI argv, input hashes and constructed trial data; no live claim |
| PIPELINE-RUN.json / SHA256SUMS | Actual exits/log hashes and unchanged source pins; final evidence hashes | Separate fresh capture; earlier pins checked again | Reviewed HEAD, fixture/capture source and all resulting files |
| FIX-FIRST | Accepts reproduced original fixes but refuses promotion because of the counter false-pass path and empty-file false refusal | This revision/review only | Named source lines, five failing assertions and captured reproductions; no W4 completion inferred |

**Not done / open:** no guest crash, recovery restart, live collector receipt, W1/W2/W3/ABBA rerun, NS acceptance run
or host power-loss test. Fix F1/F2 and repeat the collector rehearsal on the VM before the orchestrated real W4 campaign.
The recovery path and actual collector execution remain unverified offline; these live gaps do not themselves cause
this FIX-FIRST verdict.
