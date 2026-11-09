# OBS01 round 18 independent W4 review

**Verdict: ACCEPT-OFFLINE**, for the assigned R17-F1/R17-F2 fixes and recorded collector rehearsal at
`ee0e7e9b06312ba0bc7f9603e6ccd6e6a9bf345a` (implementation commit `4a7acb66`).
Both findings are closed; no new defect was found in scope. This verdict does **not** qualify W4 as a completed
guest-crash campaign or establish the unexecuted recovery restart path.

Reviewer: CX-VOBS7. Correctness reason: trustworthy durability/recovery evidence underpins P2/P3 measurements.
Read the authoritative scope/protocol, REPORT.md Round 18, VM.md, the code/tests and recorded R18 evidence.
No Docker, Colima, VM, container, image or network operation ran. No implementation, builder test, historical fixture,
historical output or acceptance file was edited. Actual-harness fixtures stub all VM/container operations and run only
local Python/SQLite/judge processes.

## R17-F1 closed: reconcile received END evidence, preserve crash prefixes

`lab/observer/vm_w4_judge.py:55`–62 now reconciles every received END against the received events:

- Detach must be at or after the latest received event and the attach timestamp, including the no-event case.
- Every CPU with events must have a final counter equal to its received record count. Existing sequence continuity
  checks make that count equal to its highest sequence number.
- A final counter for a CPU with no received events must be zero. Missing counters for CPUs with events refuse.
- Duplicate/malformed counters, counters before END, duplicate END and events after END remain grammar refusals in
  `WitnessScan.feed`. `read_trace` at line 75 raises TRACE-INCOMPLETE before the trial produces commit counts.

The unchanged R17 fixtures now reject the lost sync followed by `SW1|Z|400` / `@n[0]: 40`, reject backwards detach,
and prevent that refused FULL row from completing aggregate PASS. In the aggregate fixture, five FULL rows refuse,
only five valid OFF rows are counted, and overall pass is false.

My new [test_round18_review.py](../../verify/CX-VOBS7/test_round18_review.py) checks **540 combinations** over two
active CPUs: missing/zero/low/exact/high counters, an absent/zero/positive extra CPU counter, and detach timestamps
before attach, before the last event, exactly at the last event and later. Only the four valid combinations pass;
all **536 mismatches** refuse TRACE-INCOMPLETE with no commit-count fields. This includes balanced total counts
with incorrect per-CPU distribution. Extra controls cover malformed/duplicate/reordered END data and a half-received
last counter. They all refuse.

Without END, **all 41 cut points** from BEGIN-only through the complete 40-event fixture, each with a partial last
line, remain judged on their received prefix. They have no refusal, the expected event count and
`traceDetached: false`; a prefix with no covering sync still fails the FULL survival requirement normally.
No END or final counter is invented after a crash. Empty-event END controls also enforce attach/detach ordering.

Evidence: [end-matrix.json](../../verify/CX-VOBS7/round18/end-matrix.json),
[R17 fixture results](../../verify/CX-VOBS7/round18/r17-review.stderr),
[aggregate regression result](../../verify/CX-VOBS7/round18/replay-pipeline/end-counter-aggregate.json).

## R17-F2 closed: present-empty is different from absent

`lab/observer/vm_w4_judge.py:125` now passes the actual bytes to `verify_collection`, preserving `b''` versus `None`.
The unchanged pure-judge and production-CLI fixtures pass for a listed, successfully copied zero-byte WAL with size 0
and SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`:
`collection: verified`, **`walAbsentConfirmed: false`**, and the correctly measured OFF-loss count.

Additional controls distinguish a missing local WAL against that same present-file receipt (COPY-FAILED), nonempty
bytes against its zero-size row (COPY-INCOMPLETE), explicit receipt-confirmed absence (accepted and flagged true),
and empty bytes without a receipt (WAL-ABSENCE-UNPROVEN). Refusals contain no commit counts. The builder's changed
expectation from COPY-FAILED to COPY-INCOMPLETE applies precisely to a present empty file against a nonempty receipt;
it retains a separate missing-file assertion. That expectation change follows the corrected distinction.

Evidence: [production CLI regression](../../verify/CX-VOBS7/round18/replay-pipeline/zero-byte-WAL-CLI.json),
[boundary controls](../../verify/CX-VOBS7/round18/r18-boundary.stderr).

## Recorded live collector rehearsal reproduced

All **23 files / 68,035,971 bytes** under the R18 manifest hash correctly; its file set covers the durable directory
except SHA256SUMS itself. Repository and durable manifest bytes match. Manifest SHA256:
`921598e8eb5abb06dc6aa16d82283727abe022366c51086858944f2f95acf0be`.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/r18/`.
Both collections have `receiptError: null`, both file-copy statuses true, and the expected listing including main,
WAL and SHM. Main/WAL sizes and SHA256 are independently recomputed from the retained bytes and agree exactly with
the collector receipts:

| Trial / file | Bytes | SHA256 |
| --- | ---: | --- |
| Both main files | 16,384 each | `e084fee2577295a49bf62c9eaa1e6b4136d8dca7db3d31d1aad9e829c15c549c` |
| FULL WAL | 25,247,392 | `8f1e62b77688312babbb58af8cb442cf77c4fbf0de1a73c27579e76863f29bdd` |
| OFF WAL | 40,034,072 | `82f3b0d585fe7dd0c0637896091d8735cb9854e07014c28f666db6dbbc15a622` |

The trusted harness's receipt producer mounts that trial's fresh volume read-only and runs as the writer UID.
The retained collection records support verification of the copied contents; this reviewer did not independently
rerun the collector or inspect its historical runtime profile. Receipt-to-trial binding is corroborated by the
reviewed harness, trial directory, trace/start and writer metadata, and exact verified input hashes.

Both pure-judge and production CLI outputs reproduce the recorded judgments exactly:

| Trial | ACKs | Witnessed | Recovered rows / marker | Witnessed lost | Trace events |
| --- | ---: | ---: | ---: | ---: | ---: |
| FULL | 1,982 | 1,982 | 1,983 | 0 | 14,380 |
| OFF | 3,143 | 0 | 3,144 | 0 | 19,616 |

The extra recovered row in each is unacknowledged; it is not counted as an extra ACK or a durability violation.
Checks include exact directory/dev/inode binding, distinct writer container/cgroup identities, contiguous ACK LSNs,
monotonic ACK timestamps/WAL ends after attach, trace prefix validation and matching per-trial/window results.
Both report `collection: verified`, `walAbsentConfirmed: false`, and no detach record, as expected for this rehearsal.
With each valid live receipt, missing, short and empty substituted WAL copies refuse with their expected copy code
and no loss counts.

The aggregate reproduces exactly: **two counted trials, zero refused, zero witnessed lost, zero OFF loss, pass false**.
Window `rehearsal: true`, `pass: false` and top-level RESULT `status: FAIL` are preserved. This is a successful
collector/host-pipeline rehearsal, not a successful guest-crash W4. Small repository copies of collection, trial,
window, RESULT and log files match the durable originals byte for byte.

Evidence: [manifest-audit.json](../../verify/CX-VOBS7/round18/manifest-audit.json),
[live-rehearsal-replay.json](../../verify/CX-VOBS7/round18/live-rehearsal-replay.json),
[copy-audit.json](../../verify/CX-VOBS7/round18/copy-audit.json).

## Fresh execution and unchanged fixtures

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R18 -- python3 -B lab/verify/CX-VOBS7/run_round18.py
```

Free host space at entry: **91,961,536,512 bytes**. The capture records reviewed HEAD, exact commands/exits,
attempt timestamps and **148 source/artifact hashes**, unchanged before/after execution. All 18 commands exit zero.

| Check | Result |
| --- | --- |
| Python builder suites: vm / syncwitness / round10 / round11 / w4 | 14 + 18 + 40 + 20 + 20 = **112/112** |
| Node builder suites: engine / round12 / round16 / abba / round17 | 26 + 25 + 11 + 7 + 5 = **74/74** |
| Unchanged R16 Python / actual-harness I/O / golden-ABBA JS fixtures | **5/5 + 1/1 + 2/2** |
| Unchanged R17 boundary and pipeline fixtures | **9/9 + 2/2** |
| New R18 boundary tests | **5/5**, including the matrix and suffix controls above |
| R16 recorded-data replay, using the existing R17 re-pin unchanged | exit **0** |
| R18 recorded receipt/trial/CLI/aggregate replay | exit **0** |

Historical fixture code and assertions are unchanged, including the previous replay re-pin. The new launchers only
redirect writes into fresh round18 destinations. The original source bytes were compared with the reviewed Git
revision, historical outputs remain untouched, and final source/evidence/input digests were checked again before
commit. No test failure was discarded or expectation changed in this review.

## Verdict/receipt audit (rule 9a)

| Observation → result site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round18.py` / RUN.json | Actual exits/log hashes and 148 source/artifact hashes before/after; all exits explicitly checked | Fresh attempt/timestamps under heavy admission | Exact reviewed HEAD/argv/source; no VM slot or live-run claim |
| `replay_round18.py`, JS output redirection and original assertions | Original R16/R17 control and refusal assertions, plus unchanged recorded-data replay | Fresh executions, new output destinations | Original fixture byte hashes unchanged; historical evidence preserved |
| New END matrix/grammar/prefix assertions | Exact per-CPU expected counts, detach boundaries, refusal codes/no counts, prefix event counts | Newly constructed local fixtures this attempt | Same source, two explicit CPU sequences, real SQLite fixture and verified fixture receipt |
| New empty/missing/absent WAL assertions | Exact bytes, receipt size/hash/copy state, expected flags and refusal codes | New local controls | Corresponding receipt and byte inputs; no inference from declared mode alone |
| R18 manifest and copy checks | Every retained file's SHA256, full file-set coverage, selected repository copies identical | Fresh reread of recorded R18 bytes | Safe manifest-relative paths, durable root, manifest digest and named rehearsal |
| R18 collection verification / negative copies | Independent size/SHA256 equality plus actual verifier; damaged copies refuse with no counts | Fresh reads and local mutations only | Both exact live collection records and their copied files; consumed hashes checked against the verified manifest |
| R18 pure judge and production CLI comparison | Full output dictionaries equal recorded results; actual SQLite recovery on private temporary copies | Fresh local replay/processes, never mutates durable stores | Same trace/writer/cgroup/directory/main/WAL/collection/stderr inputs and captured CLI output hashes |
| R18 aggregate/window interpretation | Exact stored aggregate equality and explicit false aggregate/window/RESULT outcome | Fresh recomputation of recorded rehearsal rows | Two named receipt-verified trials; rehearsal scope preserved |
| SHA256SUMS and ACCEPT-OFFLINE | Final hashes checked; scoped acceptance follows all reproduced controls and recorded contents | This attempt/revision only | Reviewed source and all evidence above; no guest-crash, recovery restart or acceptance qualification inferred |

No existing pinned path is edited; no pinned old/new hashes move and `lab/acceptance/` is unchanged. New reviewer
files are below 1 MB each and the new evidence directory is below 5 MB.

**Open / not verified:** the ten-trial real guest-crash W4 campaign, its recovery restart path, live END-bearing
output and a live zero-byte WAL outcome. The last two are covered by offline fixtures only. W1/W2/W3/ABBA were not
rerun live, and no NS acceptance or host power-loss test was performed. No additional fix is required by this scoped
offline review before the orchestrator schedules the real W4 work.
