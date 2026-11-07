# Independent closed reader-study postrun verification

**Result: PASS for captured-byte/metadata/outcome closure; no study inconsistency found.** Both own actual audit attempts passed first time. This is not a DB/native/FP correctness rerun, statistical reconstruction, performance conclusion or item2 acceptance.

Selected study root: `/tmp/temporal-roadmap-research/iteration-02/residual-performance-reader/verified-preparation-v2/`.

| Identity | SHA256 |
|---|---|
| Final study | `5a8277b3fdb12a4fd4f79ebad4e49504db1671aabc4a083d5af0b0bf46ca87b2` |
| Immutable execution gate | `a89e6b8c4e292e42f4f0af3dd56062b890829db6bda31cfdc2736e5a3c6f015f` |
| Preparation | `79a386fd0a9f84722024189081eaa00fea5968284580dbe5f08c463acbdd5b52` |
| Candidate admission | `1c1c9332e2af4c08fc1db8c3a4461cd77fdbca54f118efe8f248a77f8c50ca55` |
| Source registry | `cb694ddaa9dd2f0c890338b567f8e93d4a6d9bb09bd48bc609e0513f68391afa` |
| Candidate export | `441d6564e20734b21dbc9ce043bd960520deed261d5a437662cbaa53b634f2c7` |
| Approved reader | `92169be543692ff30a1824fa0add9cdb7e3139c864bdef8fdc5d1b0ec9710164` |

Source checkpoint `ae50094cd242c4d46950f8a9a99d1ecdca03b7f8`; durable preexecution checkpoint `d01d36e22d7fb3a8eef74331dd20e88da927765b` are joined to the immutable gate/root authorization/registry. No Git operation was performed here.

## Actual operations and independence

Implemented own stdlib-only data/byte checkers from the frozen protocol/source specification. No study module (`common`, `validation`, worker/controller/analyzer), candidate/store/DuckDB/native/FP module or application/method test program was imported or executed. Only own stdlib data checkers and their bounded negative controls ran. Closed raw files were read, never edited. No app, DB, FP API, timing or profile was run. No child reviewer was spawned.

The timing checker source was saved and AST-parsed/checkpointed **before** its first execution:
`check_closed_timing.py`, SHA `05c796a0d45a90d1e9f058b93c19732a15bba0156c5c71f810440e09187b5225`.

Primary receipt: `attempt-01/closure.json`, SHA
`5f68b5c185718f3746d7defdb2c8e7606253c04069b7be12c97e57809209ffca`.
It verifies168 timing children,11,760 raw outcomes (7,056 measured/4,704 warmup), four actual untimed roles and56 full normalized payloads;1,363 actual file byte hashes are retained. Both comparison controllers have84 fresh child records/42 pairs/5,880 outcomes, exact scheduled round/load/control order and no missing/reordered samples. Every result status/checksum/native counter is joined, not just topPASS.

After root confirmed profiles terminal, a distinct adjunct used the reviewer-owned helpers, not the method validator. It rehashed the primary receipt's closed inputs before checking profiles:
`check_closed_profiles.py`, SHA `c6ffe7b7913c9190f0b5204e0822d127f5827017228f1ee9da8ccd1a3c054c40`.
Receipt `profile-attempt-01/closure.json`, SHA
`8373596a68e0ad0f47de60ea277caf60df29df324a806ce42c9ded68ca60db3f`.
It verifies three actual profile processes,294 exact-checksum/counter observations (210 profiled/84 warmup),42 full function-record groups and accepted0/current+reader6/query,7/query_json read counts for all14 controls. Profiled seconds are only checked for finite nonnegative diagnostic values, not interpreted as benchmark ratios.

## What was independently checked

- **Actual exits, not self-labels:** outer timing/profile `*-execution/{python.exit,tee.exit}` each contain exact bytes `0\n`; captured stderr is empty and terminal stdout has the exact ordered controller/final JSON records. Both timing controllers and the profile controller have exact built-in integer0 exits, timeoutFalse, statusPASS, validation_errorNone, expected command, independent captured-exit sidecar and closed stdout/stderr/sidecar/campaign hashes. Every child has the same strict actual-exit joins. TopPASS/failureNone is separately checked at all available layers. The outer runner has no separately serialized timeout/validation_error fields; its actual shell exits and captured output were checked instead of inventing those fields.
- **Frozen byte identity:** every228 final-study,190 preparation and268 candidate-export member; all17 unique registered source/artifact files; root authorization/decision/correctness/stage receipts; all five actual runtime pins (Python executable, DuckDB native module/package, libc/libm) and the4,206,592-byte physical template are hashed. The artifact pair is same480456 for A, accepted5b661 versus reader480456 for B. Only the approved FP reader leaf differs within the current-to-reader registered six-file closure; protected typed/legacy/schema/native/vendor/browser sources match the old export.
- **Metadata provenance:** preparation/study/admission/authorization/registry/gate/control/schedule/settings/artifact/native-runtime/template/history-receipt identities are exact joined. Recorded full Python version/implementation/executable/resolved invoked path/hash, libc version, controlled environment, optimization0/debugTrue, integer affinity[8], GCenabled, caps512/256/32/512/16MiB, actual imported module paths and critical mapped native paths/file hashes all match. DuckDB module/PRAGMA versions and actual threads1 are checked before/after; FP words have exact integer types and uint16/uint32 bounds, round0/x87=895/default MXCSR control mask8064 (sticky flags allowed). RSS is a positive exact integer and setup/public intervals are bounded by their captured enclosing process interval.
- **Every outcome and golden payload:** exact five-sweep/control permutation per timing child, warmup/profile bools, positive exact duration integers, rows/F/full SHA256 checksum/native integer counters, all70 observations. Four untimed roles retain14 full payloads each: exact normalized envelope, all four tags, canonical signed-i64 strings, UTF8 strings within the store cap, exact bools, finite16-hex f64 bits/canonical+0, full ordered rows/counters/snapshot metadata are compared. Expected control shape/cell/F totals are independently counted without converting bit strings to floats.
- **Temporal phase order:** preparation -> candidate authority/admission -> actual four-role preflight -> separate freeze authorization/final freeze -> immutable root execution gate -> single outer attempt -> actual terminal A before B. Parent/child/controller UTC containment and sequential nonoverlap are checked. Profile outer/controller/child/attempt captures occur strictly after the completed timing chain with the **same immutable gate SHA**. No False-to-True gate mutation was needed or observed.

Actual timing outer interval was01:14:20.787679–01:18:55.450371UTC; controller A finished01:16:35.586125 and B started01:16:37.708516. Profiles started01:20:22.427292 and finished01:20:44.497628. These are recorded UTC snapshots, not independent kernel-clock attestation.

## Targeted negative controls

All50 reviewer-owned controls reject as intended:

- 40 timing/data negatives: omitted/Bool/float/nonzero exits at child record, captured child sidecar and outer-controller layers; contradictory status/timeout/error/child identity/provenance; Bool/float threads/caps/counters/affinity; register range/control faults; wrong checksum/control order, missing/reordered outcomes, duration faults; nonfinite/negativezero bit strings, duplicate JSON keys and nonfinite JSON numbers.
- 6 profile negatives: omitted/Bool/float/nonzero exit, altered read count and Bool public-call count.
- 4 process-level negatives: each **own** checker under `-O` and `PYTHONOPTIMIZE=1` rejects before data work/output; actual nonzero exits/stdout/stderr are preserved under `optimization-negatives/`. These are intentional reviewer control failures, not failed application or benchmark runs.

No prior failure was overwritten. Both actual closure attempts are first-passPASS; all negative evidence remains distinguishable. These bounded controls test selected failure modes, not completeness of the verifier.

## Reused semantics and remaining limits

1. This checker is implementation-independent of the harness validator, but deliberately uses the frozen schedule, canonical JSON checksum recipe, normalized tagged-bit schema and **existing golden expected relation** as its specification. It is not a new independent semantic Datalog/FP oracle. It verifies the exact approved byte closure, not the meaning of root correctness QA.
2. Timing/profile raw records preserve checksums/counters, not full returned rows on every call. Full relation bytes exist for56 untimed results only. Thus the independent postrun claim is checksum/payload-witness consistency for11,760+294 outcomes; no absent per-call row dump was reconstructed or invented. The worker's actual per-call normalization/equality behavior is source-pinned, not re-executed here.
3. Current file hashes plus recorded import/mapping/runtime/FP/thread metadata are reproducible joins, **not independent historic/continuous loaded-memory, scheduling or controls attestation**. The physical-template bytes are checked now; per-child initial copy checking follows the frozen worker code, not a newly observed historic DB copy. History checksum is receipt-derived, not recomputed by opening DuckDB. Affinity/quiet authorization does not prove CPU isolation or frequency control.
4. No timing estimates,42-pair/round/load-order bootstrap derivation, CI coverage, family-wise/equivalence test, causal attribution, universal recovery or acceptance conclusion is supplied. Root owns the independent statistics reconstruction. Shared-host pair independence and steady state are not established merely by complete raw files.
5. Original assignment-statement timing may include previous-result disposal; external checks follow the stop clock. Profile counts diagnose recorded calls, not semantic correctness or subtractable latency. These interpretation boundaries remain unchanged. [Pinned CPython assignment specification](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/reference/simple_stmts.rst), [pinned profiler warning](https://raw.githubusercontent.com/python/cpython/v3.12.14/Doc/library/profile.rst). Earlier primary-source static review remains frozen under its own manifest `e21437685e41772d096fef5fd4310d5ab752fc41f2714e54c0d3c5431ccf2ecd`.

**Handoff:** no concrete study bug/inconsistency found in this bounded verification. Own evidence is frozen separately; no raw/study/source edits or reruns are proposed. Ownership released; nothing pending in this lane.
