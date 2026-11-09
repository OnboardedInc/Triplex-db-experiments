# OBS01 round 16 independent correctness review

**Verdict: FIX-FIRST**, at reviewed head `339912534fec6b43af4c27a1970b1eaad113788f`.
The golden corrections, IR diagnostic, resized W1 and INCONCLUSIVE ABBA reports reproduce. Two **High** W4
evidence-handling defects can produce false passes and must be fixed before a real guest-crash campaign. Neither defect
changes the meaning of the existing writer-kill rehearsal: it remains a rehearsal, not a W4 qualification result.

Reviewer: CX-VOBS7. Read the authoritative scope/protocol, REPORT.md Round 16, VM.md, VERIFY-round15.md, Q104a and
the recorded evidence. No Docker, Colima, VM, container, network or image operation was executed. The actual-harness
fault fixture evaluates the reviewed function with **all VM/container operations stubbed**; only local Python/SQLite
executes. Implementation, builder evidence and acceptance files are unchanged.

## Findings that must be fixed before W4

### R16-F1 — High: partial traces skip internal loss and timestamp validation

**Locations:** `lab/observer/vm_w4_judge.py:36`–42 (especially line 41), with the skipped invariants in
`lab/observer/vm_normalizer.py:340`–350; pass at `vm_w4_judge.py:76`.

`read_trace` feeds `WitnessScan` and then sorts/returns its events without calling `finish` or an equivalent prefix
validator. Sequence continuity, timestamp order within a CPU and attach-time bounds are checked only in `finish`.
A crash justifies a missing suffix, detach record and final counters; it does not justify an internal sequence hole.
Sorting by time also hides a timestamp regression rather than refusing it.

**Failing fixtures:** `test_round16_adversarial.py`, tests `test_R16_F1_an_internal_sequence_gap_must_refuse`,
`test_R16_F1_regressed_sequence_time_must_refuse` and
`test_R16_F1_lost_sync_hides_a_witnessed_commit_that_did_not_survive`.
The strongest fixture has 20 ACKs and a real recovered SQLite WAL containing only commits 1–19. With the complete
trace the judge correctly refuses: 20 witnessed, commit 20 lost. Remove commit 20's sync at CPU sequence 40 and append
a sibling-file sync at sequence 41. The internal hole is visible, but W4 now returns **pass: true**, 19 witnessed,
zero witnessed lost. A witnessed durability failure has been hidden as an unwitnessed tail.

**Proposed fix:** provide a shared partial-prefix validator that requires each observed CPU's sequences to be exactly
1..max, with nondecreasing timestamps and no event/entry before attach. Keep suffix/detach/final-counter requirements
separate. Refuse internal gaps and malformed order as TRACE-INCOMPLETE, and inspect the captured witness stderr for
explicit loss/error reports. Do not infer completeness of an unreceived suffix or require an END record after a crash.

Evidence: [w4-hidden-witnessed-loss.json](../../verify/CX-VOBS7/round16/w4-hidden-witnessed-loss.json),
[w4-sequence-gap.json](../../verify/CX-VOBS7/round16/w4-sequence-gap.json),
[w4-expanded.stderr](../../verify/CX-VOBS7/round16/w4-expanded.stderr).

### R16-F2 — High: failed WAL collection can manufacture the required OFF loss

**Locations:** `lab/bin/sync-witness.mjs:571` ignores both file-copy failures;
`lab/observer/vm_w4_judge.py:101` substitutes empty bytes for a missing local WAL;
`vm_w4_judge.py:91` and `sync-witness.mjs:516` can promote the resulting loss count into W4 PASS.

A failed `docker cp` of `broker.db-wal` is indistinguishable from a WAL genuinely absent after recovery. If the main
file copies successfully and the WAL copy fails, opening the seeded main file alone reports all OFF commits lost.
That is evidence-transfer failure, not observed crash loss. The larger OFF WAL is precisely the collection path that
already encountered live buffer/permission failures during earlier rehearsals.

**Failing actual-harness fixture:** `review_round16_w4_io.mjs` extracts the exact reviewed `w4Trial` function and
injects one WAL-copy I/O failure, with all VM/container calls stubbed. A valid source WAL contains **200 commits**;
the main file copies, the WAL copy returns failure under `allowFail:true`, and the actual function returns
**pass: true**, 200 OFF commits lost. No real Docker command runs. The separate Python fixture shows that pairing
such a false OFF result with valid FULL trials yields aggregate **pass: true / premiseHolds: true**, although the
intact source has no loss.

**Proposed fix:** distinguish verified source-file absence from copy failure. Require clean successful collection of
each existing file, record its existence/size/hash and collection status, and refuse any I/O, transport or partial-copy
error. A genuinely absent WAL may be legitimate; allow it only with explicit fresh evidence of that absence from the
same recovered volume/trial. Bind the judge to that collection receipt. The pure-judge missing-WAL fixture models the
current harness error path; it is not a recommendation to reject every legitimate absent WAL.

Evidence: [w4-actual-harness-io.json](../../verify/CX-VOBS7/round16/w4-actual-harness-io.json),
[w4-io.stdout](../../verify/CX-VOBS7/round16/w4-io.stdout),
[w4-missing-collected-wal.json](../../verify/CX-VOBS7/round16/w4-missing-collected-wal.json).

## Verified results and limits

### Corrections and the real golden

The whole golden file, stdout and stderr now match their documented extraction and byte counts:

| Part | Bytes | SHA256 |
| --- | ---: | --- |
| Whole file | 229,093 | `b35312b41cb000e625dfcd15c748a7a4e9db98a0226e26d1f67dd67621a94309` |
| stdout | 228,829 | `5823294d42a77d6c500eb89a89c1fffa42816d8c2a35acaec5b5c551672d0b8e` |
| stderr | 232 | `bf5b24d4573e147920c5b72f7ac08c5a83402e3e8d31bd48f8801efc51ce74dc` |

The scanned-text, enum and pinned `.bt` hashes also reproduce. An independent line census finds **692 IR call
instructions**: 234 helper calls and 458 allowed intrinsic calls. All are accounted for. The nine helper counts equal
the manifest; helper 5 (`bpf_ktime_get_ns`) occurs **15 times**, with 15 functions bound to 15 source probe blocks and
15 monotonic AST sites. The per-function distribution agrees, including zero clock reads in the write-return probe.

The eleven builder IR tests pass, including non-monotonic ids, unknown/unparsed calls, AST disagreements, missing or
duplicate functions, truncation and stderr errors. My extra redistribution fixture preserves the total of 15 but
moves one clock read into the wrong probe: the diagnostic refuses the per-probe mismatch while the Q109a gate remains
true. The new diagnostic does not write to the gate's `bad` reasons or determine its `pass`. This review does **not**
promote it into a gate or reopen crafted-dump attacks excluded by Q109a. Raw kernel BTF is still not retained; the
review checks the recorded enum and constructed BTF carrying those ids, not a fresh kernel BTF read.

W2 independently reproduces all three raw-counter/ACK interval series: cost is **runtime delta / commits in that
interval**. The second run's nearest-rank p90 is **52,371.333 ns**, correctly reported as 52.4 us. The interval commit
count ranges are 9–52, 3–35 and 1–29. Weighted means and p99s retain their previous values. These remain percentiles
of interval averages, not individual-commit p99 measurements.

Evidence: [golden-ir-audit.json](../../verify/CX-VOBS7/round16/golden-ir-audit.json),
[w2-corrections.json](../../verify/CX-VOBS7/round16/w2-corrections.json).

### Resized W1 and evidence integrity

All **410 files / 673,066,716 bytes** in the R16 evidence manifest hash correctly, and the manifest covers the durable
directory's entire file set except its own SHA256SUMS. Repository and durable manifest bytes match; manifest SHA256 is
`df0416c90ab0b691fd546b166890350da935de779c16914c724f6d82d1953bd3`.
The small W1, ABBA, W4 and environment copies checked also match their durable originals byte for byte.

The fresh replay of all **11 × 1,000 W1 commits** matches the whole expected refusal sets, primary codes, global
problems and every per-commit result:

| Modes | Reproduced result |
| --- | --- |
| full, syncfs | 1,000 clean each |
| normal, ack-early | 1,000 ACK-BEFORE-DURABLE each |
| off, sync-other-file, range-only, neighbor-sync | 1,000 SYNC-MISSING each |
| full-then-off | 500 clean, 500 SYNC-MISSING |
| sync-before-write | 999 ACK-BEFORE-DURABLE, final SYNC-MISSING; primary SYNC-MISSING |
| mmap | global UNWITNESSED-WRITE plus 1,000 per-commit SYNC-MISSING |

Bindings checked include directory/dev/inode, exact writer container/cgroup path, ACK sequence/count/timestamps within
the trace, and equality of writer/exported files. The contemporaneous post-W1 facts record **8 CPUs, MemTotal
20,436,420 kB, kernel 6.8.0-117-generic**, boot id and 20-GiB Colima allocation. These are recorded observations, not
a new live inspection or independent attestation of the historical executed source.

Evidence: [manifest-audit.json](../../verify/CX-VOBS7/round16/manifest-audit.json),
[w1-replay.json](../../verify/CX-VOBS7/round16/w1-replay.json),
[copy-audit.json](../../verify/CX-VOBS7/round16/copy-audit.json).

### Writer-p99 ABBA

Both attempts have the stated interleaved A/A then ABBA schedule, **18 fresh arms × 2,000 commits**, three A/A rounds,
three ABBA rounds, and six B-arm zero-loss streams. Every sample count/value and exported/writer copy is checked;
B streams reproduce their completeness checks and match the bound store/cgroup. A arms contain no witness trace.
Nearest-rank quantiles, the conservative A/A band, within-arm circular block resampling (50), 2,000 draws and seed 16
reproduce the entire recorded analysis exactly. Python separately recomputes the p99 ratios and A/A bands.

| Attempt | A/A band | Pooled B/A p99 | 95% interval | Verdict |
| --- | ---: | ---: | --- | --- |
| 1 | 129.365% | 1.135585 | [0.967088, 1.301792] | INCONCLUSIVE |
| 2 | 74.963% | 0.948264 | [0.774030, 1.208362] | INCONCLUSIVE |

The method meets Q104a's minimum arm sizes/A/A rounds and bootstrap-ratio requirement; the wide band conservatively
prevents a latency claim. Both intervals include 1 and neither setup resolves 5%. Window/RESULT PASS means completed
arms and valid B traces, **not** proven no-overhead. REPORT and VM.md preserve that distinction. A resolving ABBA is
still absent, but R48 makes this comparison reported rather than a durability gate.

Evidence: [abba-independent.json](../../verify/CX-VOBS7/round16/abba-independent.json),
[abba-analysis-replay.json](../../verify/CX-VOBS7/round16/abba-analysis-replay.json).

### W4 rehearsal and remaining live work

The writer correctly seeds FULL WAL mode with auto-checkpoint disabled, switches only the OFF connection to OFF,
commits before printing each ACK/WAL end, flushes the host stream and paces the OFF writer. No declared setting is
used to infer D: the judge uses the actual bound writer-cgroup/WAL trace.

The two recorded rehearsal judgments reproduce exactly: FULL **5,299 ACKs/witnessed**, 5,300 recovered rows, zero
witnessed lost; OFF **21,167 ACKs**, zero witnessed, all recovered. Independent prefix checks find no internal sequence
gaps, per-CPU timestamp regressions, events before attach or witness stderr in those **38,340 / 131,525 event** traces.
Thus F1 does not invalidate these particular recorded prefixes. Both main and WAL files were actually retained,
hashed and replayed, so F2 is not evidence that this rehearsal lost a file. Aggregate and window are correctly false:
two rehearsals do not satisfy ten crashes, and there was no OFF loss.

The real run correctly refused the unrelated running resident. Before a real W4: fix F1/F2; obtain the orchestrated
exclusive crash window with residents parked and other admissions held; prove a changed boot id on every real trial;
exercise both in-place reboot and any necessary stopped-VM recovery/`colima start --activate=false` path; retain
clean recovery-file collection receipts, host streams and all ten FULL/OFF trial outcomes. An end-to-end recovery
path has **not** run. The reviewer did not perform a guest crash, container operation, NS workload or power-loss test.

Evidence: [w4-rehearsal-replay.json](../../verify/CX-VOBS7/round16/w4-rehearsal-replay.json),
[w4-recorded-prefix-audit.json](../../verify/CX-VOBS7/round16/w4-recorded-prefix-audit.json).

## Fresh execution and verdict audit

Commands, under heavy admission with 93,938,511,872 free bytes at entry:

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R16 -- python3 -B lab/verify/CX-VOBS7/run_round16.py
node lab/bin/heavy.mjs --label CX-VOBS7-R16 -- python3 -B lab/verify/CX-VOBS7/followup_round16.py
node lab/bin/heavy.mjs --label CX-VOBS7-R16 -- python3 -B lab/verify/CX-VOBS7/capture_round16_io.py
```

Builder suites: Python **14 + 18 + 40 + 20 + 8 = 100/100**; Node **26 + 25 + 11 + 7 = 69/69**.
Recorded-data replay and full ABBA analysis replay exit zero. The initial extra IR test used an incorrect probe alias;
its failure and exact source preimage are preserved. Correcting that reviewer-only target to
`kretfunc:vmlinux:ext4_file_write_iter` makes the IR continuation pass. No builder test/assertion was edited.
Expanded W4 adversarial fixtures have one valid-prefix control passing and **four refusal assertions failing**;
the actual-harness I/O refusal assertion also fails. These failures are retained, not relabeled as passing tests.
Capture scripts record individual exits even when the capture command itself completes successfully.

| Observation → receipt/verdict site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round16.py` / `RUN.json` | Exact exits/log hashes; 108 input/source hashes before/after | New attempt and timestamps, source unchanged during execution | Exact reviewed HEAD/argv/source; initial changed reviewer sources retained as `_initial` preimages; no VM slot claim |
| `review_round16.py` manifest/copy checks | Every actual SHA256/file-set entry and selected exact copy bytes | Re-read this review | Durable R16 root, pinned manifest and per-file hashes |
| Python W1/W2 replay assertions | Actual traces/ACKs/WAL judged against exact expected code sets and stored intervals | Fresh offline replay | Same writer/store/cgroup, consumed input hashes and named historical attempts |
| Python ABBA and JS ABBA assertions | Positive sample counts, every quantile/band; exact full analysis including CI | Fresh calculations from raw samples | Verified manifest, per-arm file digests and B stream/store/cgroup checks; no latency acceptance claim |
| JS golden / IR assertions | Exact whole/part/source/enum hashes, independent call census, per-probe negative control | Fresh golden reads | Reviewed parser/source/golden bytes; constructed BTF explicitly labeled; Q109a gate unchanged |
| W4 recorded replay and prefix audit | Exact recorded results plus independent prefix order/continuity checks | Fresh replay of rehearsal3 | Same trace, writer metadata, cgroup, directory, main/WAL hashes; writer-kill scope explicit |
| W4 adversarial assertions and actual-function I/O fixture | Real SQLite contents vs expected refusal; complete-trace control; actual ignored-copy failure | Newly constructed local inputs, failures retained | Source/function hashes, exact argv, captured summaries; all VM/container operations stubbed |
| `FOLLOWUP.json` / `W4-IO-RUN.json` and SHA256SUMS | Exact exits and unchanged source hashes; final artifact hashes | Separate fresh continuations | Corrected reviewer source preimages/current source pins and reviewed implementation; raw failures retained |
| FIX-FIRST | Two reproduced false-pass paths; positive claims limited to reproduced recorded evidence | This review/revision | All evidence above; no live W4, recovery or acceptance qualification inferred |

No existing pinned path is edited by this review, so no pinned old/new hashes move and the acceptance contract is
unchanged. All new reviewer files remain below 1 MB each and the evidence directory below 5 MB. Open items are the two
W4 fixes and the controlled crash/recovery campaign; ABBA remains inconclusive as reported.
