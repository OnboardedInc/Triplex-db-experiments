# Independent recorded-run closure field specification

This is a **static review specification**, not executable code or a claim that this reviewer verified all 168 processes. Root's distinct `fp-cost-postrun-verification` receipts now implement the principal joins for these exact runs; original harness/raw records remain unchanged. Do not import the benchmark helper as the independent oracle. Use ordinary raises and reject optimized Python before any validation. Never generate favorable replacement samples.

## 1. Frozen authority and byte identities

- Bind STUDY-MANIFEST SHA `357664ce0a6af25efc171f5687e917cf4cc4ffd2d37ea580bfc6e89ac4119a0a`, CANDIDATE-ADMISSION SHA `ad9bfc675cb9e335c1f189dcca58149068ebfa646e53ab26adb4c5c33006c1cb`, preparation SHA `89677d9140025972962530ac528883e80c1230d9a11bdc1a1f3e672eba830bea`, and separate EXECUTION-GATE SHA `ec59a66bebaf3902ad64798d7fef17454594c7473c7cfab80482275790acc469`.
- Check gate correctness/quiet/timing booleans with exact True, CPU 8, matching study/admission, declared A→B→profiles order and root source/correctness checkpoints. Historical NOT_RUN preparation receipts are not the later execution authorization.
- Rehash all declared immutable study/admission/preflight/source members against manifests, enforcing safe confined paths. Separately hash actual selected runtime native-module bytes, source/artifact closures and original closed template bytes; a JSON label alone is not an actual byte check. This reviewer checked only small text identities; root performed the complete hash closure.
- Registry variants must identify accepted 58931…/typed7135d2…/artifact5b661…, hardened8b/typedabe742…/readerfacfc5…/artifact480456…, proposed typed25e9a4…/readerfacfc5…/artifact480456…. A shares exactly the same 480456… artifact; B deliberately changes the broader feature pair. Match natural storage ROOT/trusted sibling artifact through frozen source, not a replacement path/cap/guard.
- Bind controls/settings/schedule/template receipt/current-registry hashes and all four 14-control preflight roles to this admission. Retain full type-sensitive normalized preflight outputs; recompute both actual-result and expected-result canonical checksums rather than relying only on Python equality (where bool and int can compare equal).

## 2. Campaign/controller records

For each comparison independently:

- Campaign `status == PASS`, exact comparison, study hash, optimization exact int 0, debug exact True and child_PYTHONOPTIMIZE exact string `0`; parse started/finished UTC with offsets.
- Exactly 42 scheduled blocks, two rounds of 21; 84 records in schedule block/variant order, 21 each first variant overall (rounds 11/10 then 10/11). Require no duplicates, missing names or unexpected processes.
- Every process record: `status == PASS`, returncode exact int 0 (not False), timeout exact False, validation_error None. Match name, block, round, pair, variant_order, variant, interpreter/worker command, comparison/mode/block/output arguments, and fresh confined output folder to the schedule.
- Require positive exact-int whole_fresh_process_wall_ns. Treat it as setup+worker wall time only, not the primary public-method endpoint. UTC bounds/order are additional consistency evidence, not proof against a system-clock adjustment or exclusive scheduling.
- Check one-attempt ledgers, completion receipt paths/hashes and A finish before B start; profiles require both campaigns' completion. Preserve every failure, timeout, stdout/stderr and partial record. Fresh source/freeze/root authorization is required for a new attempt; do not relabel or drop the first.

## 3. Every child process metadata record

Join these fields to the frozen schedule/settings/registry/receipts:

| Field | Required join or predicate |
|---|---|
| status, mode, comparison, variant, block | PASS, run, exact assigned comparison/variant/block |
| study_manifest_sha256 | Exact study pin |
| candidate_admission_sha256 | Exact admission pin |
| source_registry_sha256 | Independently hashed frozen registry |
| artifact_sha256 | Registry artifact for this variant |
| runtime_native_module_sha256 | Pinned actual DuckDB native-module hash e7cda112… |
| template_sha256 | Closed physical template 9a22f33e… |
| history_checksum_from_exact_template_receipt | Receipt value 2fe50bd9…; explicitly receipt-derived |
| optimization, debug, PYTHONOPTIMIZE | Exact int 0, True, string `0` |
| affinity, gc_enabled, caps | Exact int list [8], True, exact integer MAX_FACTS512/MAX_OPERATIONS32 |
| runtime | One PRAGMA version row: v2.0.0/d54cbbe3df; preserve recorded codename |
| fp_controls | Exact integer round/mxcsr/x87; round0; `(mxcsr & 0xffc0)==0x1f80`; `(x87 & 0xc3f)==0x3f`; uint32/uint16 register ranges; sticky flags allowed |
| observations, measured | Exact ints 70 and 42 |
| setup_ns | Exact three keys source_import_ns/physical_template_copy_ns/store_open_ns; nonnegative exact-int durations |
| started_utc, finished_utc | Valid offset timestamps within campaign bounds; inspect sequential consistency |
| peak_rss_kib | Nonnegative exact-int diagnostic if reported; not a process-memory budget or primary ratio |

**Evidence strengths differ.** Metadata joins establish recorded consistency. They do not independently observe the prior kernel affinity, actual mapped module or controls throughout every call. `threads==1` is asserted by the frozen worker but not retained as a child meta field. Exact Python 3.12.14 is asserted in the worker; full interpreter version/executable/module-mapping observation is not independently retained in child meta (controller records its executable command). Runtime-file hashing verifies bytes at the check, not past mapping attestation. The history checksum is copied from the receipt, not recomputed from a post-open history scan. Identical DB bytes are checked before open; frozen read-only query source and correctness gates support subsequent behavior. Do not silently strengthen any of these into runtime observation claims.

## 4. Every raw observation and pair

- Exact sequence is five sweeps × the pair's scheduled 14-control order: unique (sweep,control_id), exact-int sweep/id, exact bool warmup iff sweep<2. Do not merely count five observations/three measured ones.
- Each row: PASS, assigned comparison/variant/block; exact control name/shape/API; exact rows/F counts; canonical full-result checksum and full rounds/derived_facts/work counters matched to that control. Require native counter exact integer types, not bool/float numeric equality.
- public_method_return_ns must be positive exact int. All 70 outcomes/process must be retained: 28 warmup+42 measured; 5,880 total/3,528 measured per comparison, 11,760/7,056 overall. Exact normalized timed objects are not all persisted: worker performs full comparison then stores checksum/counters. A closure can verify those recorded checks, not independently reconstruct discarded result objects.
- Preserve each process's three measured observations per control, compute their median, then paired proposed/baseline ratio for each of 42 blocks. Do not treat 3,528 or 7,056 technical observations as independent inference units.
- Independently reconstruct all 1,176 pair rows, 28 control summaries, ratio direction, process medians, seeded 20,000-resample median bootstrap intervals, both round/load-order medians and predeclared investigation predicate/list. Join setup summaries separately. Retain original analysis text and derivations rather than editing them.

## 5. Negative cases and unresolved scope

At minimum reject non-PASS process/child/observation status, nonzero or bool returncode/optimization, timeout, validation error, missing or duplicate schedule/sample, wrong command/block/variant/order, wrong study/admission/registry/artifact/runtime/template/history hash, wrong flags/affinity/GC/caps/FP state, malformed counters/duration, shifted sweep/warmup, bad result checksum and altered reported statistics. A valid synthetic bundle should also pass. Optimization negatives must fail before loading candidate/DB code; label fabricated unit durations as synthetic.

Root's separate 53-negative/168-process closure and 140-altered-statistics reconstruction cover the principal omissions. Original analyzer remains unmodified and is **not** thereby generally repaired for future bundles. A type-hygiene limit in root closure's equality-only affinity/caps/native-counter comparisons was documented without alleging a bad record. Root subsequently added the separate audit_json_types.py/report: all 168 meta/11,760 raw records pass exact types/register ranges/positive diagnostic RSS, and 19 malformed controls reject. This reviewer read that supplemental source/report only. The audit has explicit write-before-execution/source-hash provenance, not a separate pre-execution freeze or a new timing; original closure/derivation remain unchanged.
