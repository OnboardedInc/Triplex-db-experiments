# OBS01 round 15 independent review of recorded live W0–W3

**Verdict: ACCEPT-OFFLINE-LIVE-W0-W3**, for the recorded probe windows at
`cd56cd9c1587ef5aa4501c266db467ec1beed873`, under Q109a. The underlying W0 clock evidence, all eleven W1 modes,
three W2 calculations and both W3 sequence checks reproduce offline. Two **Low, nonblocking evidence-summary corrections**
are listed below. This verdict does **not** qualify the witness for acceptance/NS runs or satisfy W4.

Reviewer: CX-VOBS7. Read the authoritative scope/protocol, REPORT.md Round 15, VM.md, the golden files and recorded evidence.
Correctness reason: reliable durability timestamps and trace completeness underpin the lab's atomic-commit measurements.
No container, VM, Docker, Colima or network command was run; implementation and builder evidence are unchanged.

## Fresh verification and binding

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R15 -- python3 -B lab/verify/CX-VOBS7/run_round15.py
```

The capture records reviewed head, exact commands/exits, attempt times and **24 source/artifact hashes**, unchanged before
and after execution. Free host space at entry was 99,486,396,416 bytes. The fresh builder suites all pass:

| Suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 |
| `test_syncwitness.py` | 18/18 |
| `test_round10.py` | 40/40 |
| `test_round11.py` | 20/20 |
| `test_engine.mjs` | 25/25 |
| `test_round12.mjs` | 25/25 |

Total: **92 Python + 50 Node tests**. The recorded-data replay also exits zero. The initial independent golden/harness
audit has **1/2 passing tests**: its stdout-only hash assertion identifies N1 below, and that failure/TAP is retained.
A separately hashed continuation explicitly confirms that known mismatch, then executes the remaining original IR/hash/
gate assertions and harness controls: **2/2 pass**. The continuation did not correct the implementation or discard the
first failure. Its completion was observed through the tool; unlike the first audit, its stdout was not redirected to a
separate file. This distinction is recorded in `continuation-observed.json`.

Evidence integrity checks:

- All **311 files** in the committed `EVIDENCE-SHA256SUMS` match the durable evidence bytes: **520,001,543 logical bytes**.
  The durable `SHA256SUMS` is identical to the committed copy. All **256 pre-resize manifest entries** still match too.
- Eight primary in-repo W0/W1/W2/W3 JSON copies are byte-identical to their durable originals.
- **112 replay input files** have independently checked hashes equal to the verified manifest, including traces, WALs,
  ACK records, counter samples and result documents. Builder raw evidence stays at
  `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/`; none was copied into git by this review.
- Fresh reviewer evidence: [INDEX.md](../../verify/CX-VOBS7/round15/INDEX.md),
  [RUN.json](../../verify/CX-VOBS7/round15/RUN.json),
  [manifest audit](../../verify/CX-VOBS7/round15/manifest-audit.json),
  [input bindings](../../verify/CX-VOBS7/round15/replay-input-binding-audit.json),
  [SHA256SUMS](../../verify/CX-VOBS7/round15/SHA256SUMS).

## Nonblocking findings

### R15-N1 — Low: golden manifest's stdout-only SHA256 does not match its documented extraction

Location: `lab/observer/golden/MANIFEST.json:9`; repeated in REPORT.md's golden-dump paragraph.
Reproduction: `review_round15.mjs:16`, retained failure in
[golden-harness.stdout](../../verify/CX-VOBS7/round15/golden-harness.stdout).

Split the golden file according to its documented layout: remove `--- stdout ---\n`, split on `\n--- stderr ---\n`, and
remove the final wrapper newline from stderr. The extracted stdout is **228,829 bytes** and byte-identical to
`flag-check/c-d.out`. Its SHA256 is:

```text
actual:   5823294d42a77d6c500eb89a89c1fffa42816d8c2a35acaec5b5c551672d0b8e
recorded: eb8a358396d41018094ffcb000c3cc6bd42f9c5f3d1e0dc6e91505da2889e7b4
```

The **full file** hash `b35312b41cb000e625dfcd15c748a7a4e9db98a0226e26d1f67dd67621a94309` and **scanned text** hash
`73c9cb2b647070cf788be0dea42851372901fac5b63a8075ae122c86285cf1b3` both match exactly, including both passing W0
records. The W0 runtime gate does not consume this auxiliary golden-manifest field. Thus this is a metadata correction,
not evidence of a different compiled program or a false live W0 pass.

Proposed fix: regenerate `stdoutSha256` from the same exact split and add a golden-file extraction/hash check before
promoting a parser against it. Correct the copied REPORT value. Do not change the matching full-file/scanned-text hashes.
See [stdout-hash-finding.json](../../verify/CX-VOBS7/round15/stdout-hash-finding.json).

### R15-N2 — Low: two W2 display details do not follow the recorded interval data

Locations: `lab/experiments/EXP-OBS01/REPORT.md:1820`, `:1825`.
Reproduction: [w2-replay.json](../../verify/CX-VOBS7/round15/w2-replay.json), recalculated directly from raw samples/ACKs.

The nearest-rank p90 for `w2-attempt2` is **52.371 us**, rather than the displayed **51.0 us**. The latter is the 45th of
51 ordered interval means; nearest-rank p90 selects the 46th. Also, intervals do not generally hold 24–48 commits: observed
min/max counts are **9–52**, **3–35** and **1–29** in the three runs. The stored intervals, weighted means, p99/max values and
100 us gate results are correct and reproduce exactly.

Proposed fix: state the percentile convention consistently (or label the alternate order statistic) and replace the
generalized interval-size statement with the actual ranges. These display corrections do not change a runtime verdict.

## 1. Real golden dump and Q109a clock gate

`COMPILE_FLAGS=['-d']` matches the recorded successful bpftrace v0.20.2 invocation. The retained `-d` output contains five
AST passes followed by **one** LLVM IR module; `-dd` contains pre- and post-optimization modules. The `-d` module is
**byte-identical to `-dd`'s post-optimization module**, SHA256
`d9d7333924a4a5eb3fbbd3caf1e177439cd67903f5f609922d6e2467b08cdb7a`. It is the optimized IR fed into BPF lowering,
not BPF disassembly or a captured hash of the final attached/JIT machine code. The latter distinction remains covered by
Q109a's trusted compiler/image assumption. The reported `-d all` failure is consistent with the corrected flag; the
successful `-d` records and retained `-d`/`-dd` outputs are the evidence inspected here.

Independent artifact inventory checks every call line within all 15 complete IR definitions. There is **one helper-5 time
read per function**, 15 total. The only direct intrinsics are lifetime start/end, `llvm.bpf.pseudo` and memset; no other
call form is left unaccounted for in this artifact.

| Helper ID | Count |
| --- | --- |
| 1 map lookup | 66 |
| 2 map update | 25 |
| 3 map delete | 13 |
| **5 monotonic ktime** | **15** |
| 8 CPU ID | 24 |
| 14 PID/TID | 43 |
| 80 cgroup ID | 8 |
| 113 kernel probe read | 18 |
| 130 ring-buffer output | 22 |

No helper 118/125/160/208 occurs. The stored kernel-derived enum maps these to jiffies/boot/coarse/TAI and 5 to
`bpf_ktime_get_ns`, matching the reference values. Its hash is identical in the golden file and both passing W0 attempts;
the recorded BTF identity is `70d2c194...cff87`, 6,968,159 bytes, 153,519 types. Raw BTF bytes were **not retained**, so this
review checks the saved enum and identities rather than claiming a new independent decode of the original kernel BTF.

Both pre-resize attempt 6 and resized W0 record the same golden file/scanned-text hashes, pinned source
`e68cd5cb...b248`, image `sha256:06f62235...2efbf25`, exact version, four exit codes zero and four clean process verdicts.
The actual pinned source check independently returns 15 monotonic sites and no refusal; the real dump contains zero
forbidden name tokens. The 200-commit FULL attach sessions replay cleanly, with directory/inode/cgroup bindings and ACKs
inside each trace's own interval. Recorded `perf_event_paranoid=4`, exact probe listings, profile checks, memory/keys and
attach judgments pass. Clock transport remains **INCONCLUSIVE**, not an observational clock proof.

The production structured parser still fails diagnostically with 745 reasons because it expects BPF disassembly and sees
AST `call:` lines. That result does not gate under Q109a. The artifact-specific reviewer inventory is **not** a promotion
or implementation of the production IR parser. See [golden-audit.json](../../verify/CX-VOBS7/round15/golden-audit.json).

## 2. Five live harness changes

| Change and location | Assessment |
| --- | --- |
| Output redirect, `sync-witness.mjs:80` | `sh -c 'exec bpftrace -q -B none "$@" > /witness/trace.txt'` preserves argument boundaries and replaces the shell with bpftrace, so SIGINT still reaches PID 1. The trusted witness volume/file and attach-before-writer test remain. Profile capability, mount, memory and network checks are unchanged. |
| Memlock, `:44`, `:348`, `:391` | Adds only Docker's initial `--ulimit memlock=-1:-1`, not `CAP_SYS_RESOURCE` or another capability. Pure generated argv still drops ALL and adds exactly BPF/PERFMON, retains 256 MiB memory/swap limits, read-only root and no network. The error-producing condition is removed; ERROR-line refusal was not relaxed. Recorded W0 memory is about 134 MiB with zero OOM kills. |
| Cgroupfs path, `:204`, `:216` | Accepts exact full 64-hex `<id>` or `docker-<id>.scope`, requiring one successful unique match. No prefix matching or fallback to a different container. Saved ops identify `/docker/<writerId>` and the supplied cgroup ID is used in each replay. |
| kfunc/kretfunc aliases, `:169` | Maps only fentry→kfunc and fexit→kretfunc, preserving module/function and direction. Exact/wrong-function/wrong-direction controls pass their intended assertions; the actual full program also attached. Symbol listing alone is not treated as proof of attachment. |
| Partial-window facts, `:420`, `:429`, `:471` | The W0 attach refusal writes partial facts and rethrows. Failed W1 modes stay `pass:false` in the complete mode list. A caught window refusal records `pass:false` and a persistent run failure; later success cannot turn the overall status into PASS. This retains evidence while continuing independent windows. |

The five changes do not waive a gate. Attempts 1–5 remain REFUSED/NOT-RUN/FAIL, not silently adopted as successful attempts.
The reported two manual diagnostic containers outside the engine ledger are a disclosed procedural exception, not a
permission inherited by this reviewer. No live action was taken here.

## 3. Replay of the recorded W1–W3 results

W1's eleven modes each contain 1,000 commits. Offline replay validates the **whole refusal set, primary, global codes and
every commit's exact code list**, stronger than checking only the recorded PASS label. All match, with no mismatches:

| Mode | Replayed outcome |
| --- | --- |
| full | 1,000 clean |
| syncfs | 1,000 clean |
| normal | 1,000 ACK-BEFORE-DURABLE |
| off | 1,000 SYNC-MISSING |
| full-then-off | 500 clean, then 500 SYNC-MISSING |
| ack-early | 1,000 ACK-BEFORE-DURABLE |
| sync-before-write | 999 ACK-BEFORE-DURABLE, final SYNC-MISSING; SYNC-MISSING is primary by the documented order |
| sync-other-file | 1,000 SYNC-MISSING |
| range-only | 1,000 SYNC-MISSING |
| neighbor-sync | 1,000 SYNC-MISSING |
| mmap | global UNWITNESSED-WRITE, plus 1,000 per-commit SYNC-MISSING |

Input checks include exact writer ID/cgroup path, bound directory pair, contiguous ACK LSNs/counts, trace interval and equal
writer/exported WAL/main/ops bytes. Evidence: [w1-replay.json](../../verify/CX-VOBS7/round15/w1-replay.json).

W2 recomputes each interval directly: **delta `run_time_ns` / commits in that interval**. `run_cnt` is a separate program-run
statistic; it is not an extra denominator in per-commit cost. Raw sample timestamps/counters are monotonic, every stored
interval matches, and weighted means and nearest-rank p99/max reproduce exactly:

| Run / VM label | Covered commits / 1,000 | Intervals | Weighted mean | p99 interval mean |
| --- | --- | --- | --- | --- |
| first, 6 CPU / 12 GiB | 421 | 10 | 20.885 us | 28.270 us |
| second, 6 CPU / 12 GiB | 818 | 51 | 33.817 us | 81.159 us |
| resized, 8 CPU / 20 GiB | 764 | 40 | 25.909 us | 53.189 us |

All are below the implemented 100 us threshold. **These are p99s of partially covered, roughly 20 ms interval averages,
not measured individual-commit p99s or writer-latency overhead.** They support the reported diagnostic costs, not a
stronger tail-latency claim. See [w2-replay.json](../../verify/CX-VOBS7/round15/w2-replay.json).

W3's independent streaming scan reads the complete traces and checks B/Z records, sequence continuity and final per-CPU
counts. It reproduces **928,067 / 935,983 events, zero lost in each**, with more than 1,200 seconds between attach/detach.
Both writer-done records contain 120,000 commits at configured 100/s for 1,200 seconds; late counts are 16,091 / 2,124.
Each run has eight reader-ready files and a configured 8×32 reader workload. No reader completion/poll-count records or raw
CPU sample vector were retained: CPU means **2.5309% / 1.7010%** are hashed recorded summaries, not independently
recomputed series. W3 performs no per-commit durability judgment or memory-peak measurement.
See [w3-replay.json](../../verify/CX-VOBS7/round15/w3-replay.json).

**Environment binding limits:** contemporaneous load logs say `cpus=6` before resize and `cpus=8` after it. Stream-check's
`cpus=3` counts CPUs with events, not VM hardware cores. RAM labels are corroborated by the branch's old 6-CPU/12-GiB config
and the current main/Colima 8-CPU/20-GiB configuration, but there is no per-attempt MemTotal/config snapshot in these
receipts. Current config is not retroactive proof of live RAM allocation. The review branch still contains the old slot
config; synchronize/record the intended execution configuration before acceptance use. The runs must remain separately
labeled; W1 was taken only before resize.

## 4. Before relying on this witness in acceptance runs

1. **Implement and qualify W4**, the controlled guest-crash durability campaign, with the required orchestration and
   recovery evidence. The unrelated host crash between finished runs is not a W4 test or host power-loss proof.
2. **Run/report writer-p99 ABBA** on the intended VM/profile. R48 makes it a report rather than the kernel-cost gate;
   neither the current interval counters nor the earlier partial A/B replaces it.
3. **Rerun all W1 modes on the resized VM**, preserving first failures, source/image/boot and resource configuration
   bindings. Equal kernel/BTF hashes alone do not make pre-resize evidence a new resized run.
4. **Build/review the IR parser against this corrected golden**, recognizing the optimized module and all 15 definitions,
   numeric helper calls including `tail call`, and permitted intrinsics, with completeness/refusal tests appropriate to
   its promoted claim. Do not promote the currently failing disassembly parser merely because the gate passed.
5. Resolve/label the W2 interval-mean statistic before using it as an individual-commit p99 acceptance claim, and retain
   the missing environment/load details needed for the intended scope (runtime config, raw CPU samples, reader progress,
   and memory under load where claimed). Correct N1/N2 before reusing their summary metadata in receipts.

W0–W3 provide useful first-live evidence. They do not qualify other images, domains, long NS workloads, physical power
loss, or general acceptance deployment. The false tracepoint-directory probes remain informational because actual
tracepoint/full-program attach succeeded; investigate their permissions/path behavior before treating them as a new gate.

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round15.py` capture/source equality | Exact exits/log hashes; 24 source/artifact hashes before/after; first independent failure retained | New reviewer attempt/times under heavy admission | Exact reviewed head, argv and source hashes; no live VM/engine-slot claim |
| Python manifest/copy/input checks | Actual SHA256 of all current/pre-resize entries, exact copied bytes; 112 consumed input hashes checked against the verified manifest | Re-read during this review, not adoption of historical PASS labels | Durable relative paths, manifest digest and stored input digests; recorded attempts remain explicitly historical live observations |
| W0/W1 replay and exact per-commit assertions | Actual trace/WAL/ACK bytes judged, whole refusal and every row checked against expected contents | Fresh offline replay of each named recorded attempt | Directory/inode, writer ID/cgroup, ACK interval/count and exact input hashes; no resized W1 claim |
| W2 recomputation | Every interval, covered commit count, weighted mean and p99 exactly compared | Fresh calculation from raw recorded samples and ACKs | Same session inputs/result hashes and distinct pre/post-resize labels; statistic limits explicit |
| W3 streaming assertion | Actual per-CPU sequence/B/Z/final-counter scan and writer-done checks | Fresh read of both complete recorded traces | Trace/session directory, writer-done data and hashes; CPU series/reader progress are not claimed independently verified |
| Initial JS audit and continuation | Primary golden/scanned hashes, optimized IR equality, every helper/intrinsic call; original auxiliary-hash failure preserved | Fresh file reads and assertions, continuation separately observed after the first failure | Exact golden/source/enum hashes and recorded process verdicts; continuation source hash/transformation recorded; no raw BTF or new process attestation claimed |
| Pure harness argument/alias controls | Exact exec argv, capabilities, limits and positive/negative aliases | Fresh pure calls | Reviewed function bytes, fixed inputs; never invokes container operations |
| Golden summary relabeling / SHA256SUMS | Preserves emitted summary, distinguishes erroneous copied stdout claim from actual hash; evidence hashes checked | This review's derived artifacts only | Emitted summary and mismatch record retained; no builder raw evidence rewritten |
| ACCEPT-OFFLINE-LIVE-W0-W3 | Accepts reproduced primary probe evidence, with two nonblocking summary corrections and explicit unfinished qualification | This reviewed revision and replay only | Source/evidence hashes above; no claim that every metadata field or general acceptance requirement passed |

No existing implementation, golden, test or acceptance file was edited. No pinned existing path's hash moves; contract
files are unchanged. Reviewer artifacts stay below 1 MB per file and 5 MB total. Open items are N1/N2 and the qualification
work above. No live rerun, container start, image build, W4, writer ABBA or resized W1 was performed by this reviewer.
