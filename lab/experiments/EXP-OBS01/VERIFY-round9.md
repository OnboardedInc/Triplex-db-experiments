# OBS01 round 9 adversarial review — FIX-FIRST

Reviewer: CX-VOBS7 (Codex gpt-6.1-sol, high). Reviewed head:
`3403e187ec04c7bff50ffab03c88447233747528`, branch `exp/OBS01-observer`.
North star: correctness floor for P2 ACK durability and P3 durable publication/consumer records
(`lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`).

**Verdict: FIX-FIRST.** Five offline reproductions fail the required behavior. The most serious accepts a published
logical change whose payload commit becomes durable after its positive poll, and annotates the position with the earlier
marker-only commit's D. No implementation under review was changed. No VM, Docker, colima, engine or network command ran.

## Evidence and execution

Read the lab preamble/protocol, round 9 of REPORT.md and VM.md, and the actual design note from the main checkout
`lab/research/R48-writer-sync-witness.md` (SHA256 `3f13d4562ea508fbf5ac7c23a84560f692b93eee1c24722714b186bcd6a06b65`).
The design bytes are retained with this review so its source is unambiguous.

All reviewer tools and evidence: [`lab/verify/CX-VOBS7/`](../../verify/CX-VOBS7/).
Attempt record: [`results/RUN.json`](../../verify/CX-VOBS7/results/RUN.json);
manifest: [`results/SHA256SUMS`](../../verify/CX-VOBS7/results/SHA256SUMS).
The attempt records the reviewed head, executable source hashes, design hash, commands, stdout/stderr hashes and a successful
end-of-attempt source-drift check. Disk was above 5 GiB; execution obtained a shared `heavy.mjs` token after waiting for admission.

| Executed command (through the review runner under heavy.mjs) | Result |
| --- | --- |
| `python3 -B lab/observer/test_syncwitness.py` | 18/18 pass |
| `python3 -B lab/observer/test_vm.py` | 14/14 pass |
| `python3 -B lab/verify/CX-VOBS7/review_round9.py` | 6 controls pass, 5 regression assertions fail, zero test errors |

The original invocation was `node lab/bin/heavy.mjs --label CX-VOBS7-offline -- python3 -B lab/verify/CX-VOBS7/run_review.py`.
The runner refuses to overwrite its existing results directory. To reproduce the reviewer fixtures into fresh temporary evidence,
run the following from this worktree (the exit is deliberately 1 on the reviewed implementation):

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-replay -- python3 -B -c 'import sys,tempfile,unittest; from pathlib import Path; sys.path.insert(0,"lab/verify/CX-VOBS7"); import review_round9 as r; r.OUT=Path(tempfile.mkdtemp(prefix="cx-vobs7-")); print(r.OUT); unittest.main(module=r,verbosity=2)'
```

## Findings

### F1 — High: split publication bypasses U >= D and assigns the wrong D to the logical position

Locations: `lab/observer/vm_normalizer.py:405` (position only from an added marker), `:411` (U can be None),
`:355` (then skips the visibility comparison), `:543` (durable_at keyed only by views with a position).
Fixture: `review_round9.py:105`, `test_split_marker_then_frame_must_not_skip_visible_check`.
Evidence: [`results/split-publication.json`](../../verify/CX-VOBS7/results/split-publication.json).

The fixture constructs **two real SQLite WAL commits** with the pinned SQL01 schema and valid final frame CRC:

1. Commit 1 changes marker to `(epoch=0, lsn=1)` without inserting the frame. Its D is 10,300,000 ns.
2. Commit 2 inserts the matching frame without changing marker. W is 10,403,000 ns, D is 11,000,000 ns.
3. The first positive marker poll ends at 10,550,000 ns; the payload write precedes that poll and its sync follows it.
   The driver ACK at 11,100,000 ns is legitimately after D, isolating the visibility defect.

`normalize` accepts in **vm mode**. The second commit has no position/U, so it never receives the source visibility check.
Position 1024 is exported with D=10,300,000 ns and durableEndNs=10,550,000 ns, even though its frame's commit is durable only at
11,000,000 ns. The intermediate history validator also accepts a marker ahead of an empty frames table (`read_state`, `:92`).
This is a false durable-publication result, not merely a missing diagnostic.

Proposed fix: validate atomic marker/frame publication in each reconstructed SQL01 transaction, or bind every frame-bearing
transaction to its logical position's actual U and use the D covering all of that logical publication's required bytes. Never
silently omit a source commit's U. A split that violates the SQL01 atomicity contract can instead fail closed explicitly.
Keep ACK/member association bound to the transaction that actually published that member, rather than an unchecked row delta.

### F2 — High: an early witness detach is treated as a complete run

Location: `lab/observer/vm_normalizer.py:391` through `:397`: validates attach-before-candidate, but never compares detach
with final readbacks or the observation interval. `:563` exports `lostEvents:0` after that incomplete coverage.
Fixture: `review_round9.py:141`, `test_detach_before_final_readback_must_refuse`.
Evidence: [`results/early-detach.json`](../../verify/CX-VOBS7/results/early-detach.json).

A well-formed trace ends at **110,400,000 ns** with matching sequence dumps. Final source readbacks are at **500,000,000 ns**,
and the observer ends at 600,000,000 ns. All earlier writes/syncs are present. `normalize` accepts in vm mode and exports
kernel-witness durability, although it cannot observe any mmap, foreign writer or checkpoint activity between detach and final
readback. This can result from a witness ending early normally; no malformed trace is necessary. R48 9.2 requires witness stop
after final readback, and 8.2 requires a complete per-run witness. The intended controller order is not checked by the judge.

Proposed fix: require trusted, same-domain final-readback timestamps and prove witness detach covers the last relevant readback
and observation; also bound the trace to this attempt's observer end. Return TRACE-INCOMPLETE for early termination. A detach
record and internally contiguous CPU sequences prove completeness only within their own interval.

### F3 — High: W1 converts a global judge refusal into probe success

Locations: `lab/observer/vm_syncwitness.py:34` through `:40` (compares only perCommit codes), `:78` (exit depends only on
mismatches); `lab/bin/sync-witness.mjs:180` uses that exit as session PASS.
Fixture: `review_round9.py:159`, `test_w1_compare_must_reject_global_unwitnessed_write`.
Evidence: [`results/w1-global-refusal.json`](../../verify/CX-VOBS7/results/w1-global-refusal.json).

A FULL-shaped write/sync plus an mmap-write event correctly yields global `primary=UNWITNESSED-WRITE` in the judge. Its
perCommit timing code list remains empty. `compare('full', result, 1)` returns **[]**, so the CLI would exit zero and W1 would
report PASS for this refused run. WITNESS-UNBOUND and CHECKPOINT-UNSYNCED can be lost the same way. The general normalizer
correctly raises these problems; the defect is in the probe acceptance path.

Proposed fix: compare the complete expected refusal set/primary as well as every per-commit outcome. FULL/syncfs positive modes
must have no global problems. Negative modes must not ignore unexpected global problems just because timing rows match.

### F4 — High: W3 misses loss of all records on a CPU

Locations: `lab/observer/vm_syncwitness.py:62` through `:66`; `lab/bin/sync-witness.mjs:181` uses this exit as probe success.
Fixture: `review_round9.py:172`, `test_w3_must_reject_loss_of_every_event_on_one_cpu`.
Evidence: [`results/w3-whole-cpu-loss.json`](../../verify/CX-VOBS7/results/w3-whole-cpu-loss.json).

The trace contains a valid CPU 0 event and dump, plus `@n[1]: 2` with **no CPU 1 event records**: both records from that CPU were
lost. `parse_witness` correctly returns TRACE-INCOMPLETE. W3's separate `stream_check` loops only over CPUs in `seen`, ignores
the nonzero unmatched dump, and returns `lostEvents:0`/exit zero. This is a real sequence-loss shape, not a malformed field.
The streaming function also lacks the main parser's duplicate B/Z, numeric-field, timestamp and error-stderr validation.

Proposed fix: share the parser's validation state machine between whole-file and streaming paths. At minimum reject every
nonzero count for a CPU absent from the records, then test main/streaming parity over the same loss and grammar negatives.

### F5 — Medium: syncfs timestamps are conservative bounds, not R48's first sync exit, and can falsely report violations

Locations: `lab/observer/vm_syncwitness.bt:79` through `:91` (discards ext4 sync timing, records syscall entry/exit);
`lab/observer/vm_normalizer.py:340` and `:355` (uses those bounds as exact D and exact ordering evidence).
Fixture: `review_round9.py:187`, `test_syncfs_syscall_boundary_must_not_change_r48_D`.
Evidence: [`results/syncfs-boundaries.json`](../../verify/CX-VOBS7/results/syncfs-boundaries.json).

The documented divergence fails the exact R48 claim. Consider W=100, syscall entry=110, ext4 wait=1 sync entry=120/exit=200,
an ACK from another thread in the same cgroup and positive poll at 250, syscall exit=300. The production S representation
records `(enter=110, ts=300)`. The judge reports D=300 and **both ACK-BEFORE-DURABLE and VISIBLE-BEFORE-DURABLE**, whereas
R48 4.2 gives D=200 and neither violation. A write between syscall entry and actual ext4 sync entry can similarly cause a false
SYNC-MISSING. The retained hook timeline is a synthetic partial-order fixture derived from the program, not a measured kernel run.

Using a later upper bound is conservative for granting durability, but comparing an ACK/U against that bound does **not prove**
it preceded actual durability. VM.md calls D the earliest successful sync exit; the report describes ext4 fexit timing, which the
program does not retain. This difference therefore cannot be certified as preserving the documented exact result codes.

Proposed fix: record the matching ext4 sync entry/exit and successful wait=1 result per device/call, using those instants for R48 D.
If the intended contract instead chooses syscall bounds, obtain that explicit design decision and distinguish uncertainty from
proven ordering violations; do not silently label the bound as R48's first durable instant.

## Requested checks and differences from R48

| Check | Offline assessment |
| --- | --- |
| D is first successful writer sync entered after W | File-sync selection passes the extra/overlapping-sync control, including choosing earliest exit among concurrent eligible syncs. syncfs exact timing fails F5. |
| ACK >= D and U >= D on every commit | Direct per-commit comparisons pass when supplied. Whole-normalizer source publication fails F1. ACK checks apply only to supplied trusted ACK events; B9/CR-NS emission is still absent as disclosed by the builder. |
| All seven codes in exactly their cases | Existing 18 tests pass the nominal code fixtures; F1/F2 omit required refusals, F3/F4 discard refusals in probe gates, F5 can invent ordering violations. Not accepted as exhaustive. |
| Per-CPU gaps -> TRACE-INCOMPLETE | Main parser passes missing sequence and whole-CPU loss controls. W3 fails F4. |
| Other file/cgroup never supplies D | Independent sibling-inode, foreign file-sync, foreign filesystem-sync, failed sync and wait=0 control passes. |
| Unsynced checkpoint followed by WAL reuse/truncate | Independent main-write/restart control returns CHECKPOINT-UNSYNCED; adding a correctly ordered main-file sync clears it. A checkpoint with WAL retained is not itself unsafe under R48 4.2's restart rule. |
| OFF/NORMAL regardless of declared setting | Existing traces with declared FULL still refuse OFF as SYNC-MISSING and NORMAL as ACK-BEFORE-DURABLE in both clock modes. Code ignores writerState when a witness exists. These are synthetic kernel traces, not live writer qualifications. |
| Memory-mapped writes | Main judge independently returns UNWITNESSED-WRITE, but W1 can ignore it (F3). |
| Sync entered before last write, exited after it | Correctly excluded by the independent overlapping-sync control. |
| sync-before-write documented adjustment | **Correct.** Commit i can be covered by commit i+1's pre-write sync. Independent two-commit control returns early ACK/U for the first and SYNC-MISSING for the last, consistent with R48's formula. |
| syncfs documented adjustment | **Not exact under R48; F5.** It is safe as a conservative grant bound but insufficient as proof of the two strict violation codes. |

Consumer U < D is intentionally allowed by R48 C-REC: its lag ends at max(U,D). The source C-PUB check is the required U >= D
comparison. The existing late-consumer-sync test correctly verifies this distinction.

## Reviewer verdict/receipt audit (preamble 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `review_round9.py:37` through `:99`, control assertions | Checks exact D/codes, sequence refusals and checkpoint/mmap outcomes | New synthetic traces each test | Explicit dev/inode/cgroup/ranges and commit timestamps; no engine slot is claimed |
| `review_round9.py:105` through `:197`, five regression assertions | Asserts required refusal or exact D; retained actual results substantiate each failure | New host SQLite files and/or synthetic trace per invocation | Split/early fixtures use full raw case/source/frame hash bindings; other fixtures bind explicit store and hook timeline |
| `retain`, `review_round9.py:19` | Saves observed input/output bytes; does not issue PASS | Invoked by the current tests | Attempt RUN pins exact test and reviewed source hashes; manifest covers saved bytes |
| `run_review.py`, command records and drift check | Saves exit codes and stdout/stderr hashes, checks source did not move | Fresh directory (`exist_ok=False`) and attempt timestamps | Reviewed head, per-file source hashes, R48 hash; no VM/slot receipt or semantic PASS |
| This FIX-FIRST verdict | Based on five retained assertion failures, six controls and 32 existing tests | This attempt, not the builder's historical receipts | Exact reviewed head and unchanged reviewed source bytes |

No existing tracked file or acceptance pin was changed by this review: only this new report and `lab/verify/CX-VOBS7/` are
added. Therefore there are no moved pinned-path hashes to report. Evidence is under 1 MB per file and under 5 MB total.

Not done: implementation fixes, Node controller suites, full repository checks, W0–W4, real BPF attach, real VM writer/clock
behavior, B9/CR-NS integration, overhead or durability-class qualification. The open design question is whether the orchestrator
wants exact ext4 sync timing per R48 or a separately named conservative timing bound. F1–F4 require fixes before offline acceptance.
