# Arithmetic and logical accounting — proposed N1 draft

Revision 002 · Source-only mathematics/design · **ALL EMPIRICAL STAGES UNRUN**

Frozen source-only draft for independent re-review. This is normative only if the accompanying draft is later selected. It neither implements nor tests an algorithm. The four-limb arithmetic, raw/set semantics, fixed logical limits and ticket categories from frozen revision-001 are retained; previously ambiguous reservation/commit points and adjacency traversal are now fixed explicitly, and the closed guard bound is proved below. The string validator additionally applies revision-002's NUL-free domain and exact syntax/domain precedence in the same single left-to-right ticketed pass; no extra scan is introduced.

## A. Exact i64 sum with portable unsigned limbs

Let L = −2^63, U = 2^63−1, and n ≤ 100000 < 2^17. Every subset/prefix total satisfies `nL ≤ S ≤ nU`, hence `|S| < 2^80`. The extreme magnitude `100000·2^63` is greater than 2^79: **80 magnitude bits**, not fewer, are required in the worst case. A signed 81-bit two's-complement range suffices; a proved signed-128 type would also suffice, but is not chosen here.

### Proposed representation

For one current group retain a bounded contribution count and two nonnegative exact totals P and N. Each total is a pair `(hi, lo)` of logical unsigned 64-bit words denoting `hi·2^64 + lo`. P adds nonnegative inputs; N adds magnitudes of negative inputs. Four limbs total are used. No signed intermediate is wider than the original i64 domain, and there is no dependency on a compiler `__int128` extension or a multiprecision library.

The later source implementation must provide exact unsigned 64-bit words with modulo-2^64 operations and safe exact i64 conversions. Standard exact-width integer types, where provided, can express this design. No installed type/compiler availability is asserted or inspected. An implementation that cannot meet these source requirements is unsupported; it must not silently switch arithmetic models.

For v < 0, obtain its magnitude as: form v+1 in i64; negate that representable number in i64; convert the nonnegative result to unsigned; add unsigned one. For v = L this yields 2^63 without ever evaluating narrow `−L`. For v ≥ 0, convert directly to unsigned.

To add magnitude a ≤ 2^63 into one total, add a to the low word modulo 2^64, set carry to one iff the new low word is smaller than the old low word, and add that carry to the high word. The new contribution count must be admitted **first**. Under the cap, each of P and N is below 2^80, so its high word is below 2^16; high-word overflow is impossible under the mathematical invariant. A detected violated invariant is `internal_invariant`, never a wrapped success.

At group finalization compare P and N lexicographically by high then low words. Subtract the smaller from the larger using unsigned low-word subtraction and one borrow from the high word. This gives exact sign and magnitude d without signed overflow.

* P = N: emit i64 zero.
* P > N: require high(d)=0 and low(d) ≤ U, then convert that nonnegative value to i64.
* P < N: require high(d)=0 and low(d) ≤ 2^63. If equal to 2^63, emit the defined i64 minimum L directly. Otherwise convert the magnitude ≤ U to i64 and negate it. Do not narrow 2^63 to positive i64.

Failure of the final condition is `sum_i64_range`. P and N may each exceed i64 during the scan; that is not a public overflow. Examples, hand-derived only: [U,1,−1] → U; [L,−1,1] → L; [L,U] → −1; [U,1] and [L,−1] → range error. Distinct source tuple IDs are needed when repeated values are intended as separate contributions.

There is **no partial-state merge API in the first slice**. A future combine design must carry counts/type information, prove disjoint contributor partitions or deduplicate overlapping support, enforce the combined contribution cap before merging, and preserve error/accounting semantics. Associative exact arithmetic alone does not make duplicated support safe.

## B. Exact logical byte units

These encodings define accounting sizes, not a selected wire format or an actual serialized artifact:

* string value: one tag byte + four length bytes + payload length;
* Boolean value: one tag byte + one payload byte;
* i64/f64 value: one tag byte + eight payload bytes;
* tuple: one arity byte + its value sizes;
* descriptor: one source-arity byte + one mode byte + one operator byte + one key-count byte + one byte per key position + one measure-presence byte + one measure-position byte iff present.

Thus descriptor size is `5 + key_count + (measure_present ? 1 : 0)`, at most 13. Raw tuple bytes include every duplicate and are measured before zero normalization, which does not change size. `input_bytes` includes the descriptor. Output size uses the same tuple/value units. Fixed-size addition checks use remaining allowance before addition; a counter must not overflow in order to detect a limit. Raw string sizing does not inspect NUL/UTF-8 contents; syntax/domain validation still occurs in the later all-values pass.

### Logical live-state charge

The proposed implementation discipline retains the moved owned raw request, two row-reference arrays for sorting, one fixed workspace reservation, and staged owned output. It does not copy all groups or retain separate hash/dedup/measure sets.

Let the returned non-work reservation flags `input_reserved`, `workspace_reserved`, and `sort_reserved` initially be false. At every reached prefix:

`live_state_bytes = (input_reserved ? input_bytes : 0) + (workspace_reserved ? 256 : 0) + (sort_reserved ? 16·raw_rows : 0) + 8·staged_output_rows + staged_output_bytes`.

Here an admitted 16·raw_rows reservation covers two eight-byte logical row-reference arrays; the admitted fixed 256 reservation covers the single-current-group workspace, counters/control metadata, key references and the four-limb accumulator. Output directory references cost eight per admitted staged row. The fixed 256-byte error carrier has a separate unconditional reserve, not charged against the reported successful-state ledger; thus initial live/peak are zero. Both row-reference arrays remain charged until publication/abort even when no longer needed; releasing them cannot create implementation-dependent budget behavior. Keys refer into the owned raw request until an admitted output copy owns them independently. One streaming group is active at a time; the type pass and reduction pass reuse the workspace.

The exact admission/commit transitions are in §D.1 below: input/workspace only at phase 3 entry, sort arrays only at phase 4 entry, and each prospective output row only after its fixed checks and successful copy-work precharge. The `staged_*` counters denote admitted logical reservations, not an observation that every reserved byte has already been physically copied. On allocation failure they may include the row whose copy failed. Report flags/live/peak at the reached pre-cleanup accounting prefix; cleanup/publication does not retroactively erase that report. Record the maximum charged value, not a measured allocation peak. Once all three flags are true, the formula reduces to the revision-001 success-path expression. With all fixed ceilings it is at most `2·16777216 + 16·100000 + 8·100000 + 256 = 35954688`, below 40 MiB. This makes the 40-MiB guard a closed logical invariant for this layout, not an independently reachable input boundary under the tighter ceilings. A future layout that adds retained structures must revise the charge/proof before use; actual allocator/object overhead and allocation failure remain separate.

The source relation, output copies, and sort workspace are explicitly included. No O(groups) whole-invocation-memory claim is made. No spill, host buffer-manager capacity, operating-system limit, kernel admission, or physical-memory guarantee is claimed.

## C. Canonical ordering schedule

The draft fixes one deterministic reference schedule to make work/error prefixes reviewable. This is a contract algorithm, not source code or an executed test.

1. Index raw rows in their supplied order, without copying payloads.
2. Use stable bottom-up merge sorting: adjacent runs of lengths 1, 2, 4, ...; visit run pairs from the beginning; choose the left row on equality; write every emitted row reference to the alternate reserved array. Handle an incomplete final run the same way. Stop when one run covers all rows. Zero/one row needs no merge pass.
3. The comparator is lexicographic ordered-key comparison followed, only on an equal key, by full-source-tuple comparison. Each lexicographic scan stops at its first difference/end. In global mode only the full tuple is compared. Use the canonical value order in the contract, never dictionary IDs or addresses. A composite comparison charges one `tuple_key_comparisons` ticket, not additional nested key/full-tuple invocation tickets; its examined values/byte pairs still charge individually. Each merge comparison emits exactly one row reference; there are no additional comparator traversals outside this schedule.
4. Visit sorted row references from the beginning, comparing each against the last distinct full tuple retained. The first row has no predecessor comparison. Compact distinct references in place and charge/write each retained reference, including an in-place self-write; count every duplicate visit. Full-tuple duplicates are necessarily adjacent under this order. The compacted array denotes R in `(key, full tuple)` order.
5. One group/type pass and a separate group/reduction pass traverse this compacted prefix. In observed mode each reached tuple after the first performs **exactly one** key comparison with the immediately preceding distinct tuple before its classification/update. On a key change, first check/finalize the previous group, then start the new group and classify/update the new tuple. End-of-input checks/finalizes the last group without another key comparison. Thus each completed observed pass makes exactly `max(D−1,0)` adjacent-key comparisons, and a failed pass reports only the reached prefix. Global mode instead has one explicit seeded group and no key-comparison calls. No retained array of group keys or group summaries is necessary. Type masks are checked at the end of each group before proceeding; all groups pass typing before the second pass begins. In the reduction pass min/max seeds from the first measure without a comparison, then makes exactly one measure comparison per later tuple, retaining the current measure on equality. Count/sum update exactly once per tuple. The second pass initializes its own group workspace but does not increment `groups_admitted` again. Group ordinals are zero-based, including global ordinal 0.

No contribution sorting is required by the exact-i64 mathematics itself. This bounded sort is proposed here for canonical dedup, key traversal, errors, and accounting. A later faster algorithm is not automatically forbidden, but must reproduce this draft's declared logical ticket/error trace or receive a different reviewed work-model identity. No expected hash O(n) claim is substituted for a worst-case proof.

## D. Work tickets and counters

All counters are new invocation-local nonnegative 64-bit logical counters, initialized to zero. Charge **before** the associated action; if its next charge would exceed 1,000,000,000 total work tickets, return `work_limit` without performing that action. For a failed attempted charge, the successful reached counter remains unchanged; the error records the attempted charge. Never wrap counters. Checks of a bounded closed variant or an already available container length are not permission to inspect arbitrary contents.

One work ticket is charged for each of these events:

| Ticket/counter | Exact event |
|---|---|
| `descriptor_checks` | One field/rule check in the fixed descriptor order, including each selector's range check and its left-to-right prior-selector duplicate checks. |
| `row_shape_visits` | One raw tuple arity inspection. |
| `sizing_value_visits` | One value-size/per-string-length inspection in the size pass. |
| `value_validation_visits` | One closed typed-value admission/canonicalization visit in the all-values pass. |
| `utf8_bytes_validated` | One raw string byte consumed by the single left-to-right UTF-8/domain validator, before inspecting it; no skipped duplicate bytes or preliminary NUL scan. The error-causing byte is included if consumed. |
| `index_writes` | One initial, merge-output, or distinct-compaction row-reference write. |
| `tuple_key_comparisons` | One comparator invocation over a full tuple, key, or `(key,full tuple)` composite, including sorting, dedup, and boundary checks. Empty global keys require no comparator call. |
| `value_comparisons` | One tagged value-pair comparison invoked by those comparators, or one min/max measure comparison. Tag/payload fixed-word/length operations are included; string payload byte pairs are additional below. |
| `string_byte_pairs_compared` | One pair of same-tag string payload bytes examined up to the first difference or end. Length comparison after the equal prefix adds no byte-pair ticket. |
| `dedup_row_visits` | One sorted raw row examined for distinctness, including the first. |
| `classification_visits` | One distinct tuple visited in the group/type pass, including count. |
| `group_phase_starts` | One initialized group in each of the type and reduction passes; global empty has one in each. |
| `reducer_updates` | One distinct tuple consumed in the reduction pass; count, extrema and sum all charge it, even if an extremum cannot improve. |
| `group_finalizations` | One reduced group finalized, including empty global extrema. |
| `output_copy_bytes_charged` | The entire prospective output tuple's logical bytes, precharged as one bounded bulk amount before its semantically non-fallible copy; allocation failure can still abort that copy. This is not an observed physical byte-copy count. |

`work_tickets` is exactly the sum of the preceding counters. A string decode may inspect each byte only through its ticketed validator; a comparator cannot perform an unaccounted whole-string scan and then report one constant-cost comparison. Arithmetic limb operations per update/finalization are fixed bounded work included in that event. This is a logical cost model, not an instruction/time/energy model.

Additional non-work counters are: `raw_rows` and `raw_values` admitted by the size pass; `input_bytes`; `distinct_source_tuples`; `duplicate_raw_tuples`; `groups_admitted`; `staged_output_rows`; `staged_output_bytes`; `live_state_bytes`; `peak_live_state_bytes`. On successful relation construction, `raw_rows = distinct_source_tuples + duplicate_raw_tuples`. On successful type/reduction, `classification_visits = reducer_updates = distinct_source_tuples`, `group_finalizations = groups_admitted`, and `group_phase_starts = 2·groups_admitted`. Observed empty has every group/update/finalization count zero; global empty has groups=1, starts=2, updates=0, finalizations=1.

### D.1 Normative counter/reservation state machine

All numeric counters start at zero; all three reservation flags start false. The independently reserved fixed error carrier is excluded from `live_state_bytes`/`peak_live_state_bytes`. Request ownership transfer and phases 1–3 use the moved request plus fixed local metadata; they acquire no new variable-size heap storage. These are source requirements, not verified implementation properties. The logical ledger does not measure the physical storage that already exists in the moved request.

Every scheduled work event first checks the prospective work total. On admission, its event counter and `work_tickets` increase together **before** the event is performed. An error detected by that performed event includes the event's ticket. A rejected work charge changes neither counter and performs no governed content inspection/copy. Fixed O(1) cap/reservation bookkeeping adds no separate ticket category.

| Transition | Exact committed non-work prefix |
|---|---|
| Initial / descriptor failure | `raw_rows=raw_values=input_bytes=live_state_bytes=peak_live_state_bytes=0`; reservation flags false; all source/group/output counters zero. Only performed descriptor work tickets can be nonzero. |
| Successful descriptor validation | Commit `input_bytes = descriptor_size` (at most 13). This is a size measurement, **not** a state reservation. All raw row/value counters and reservation flags remain zero/false; live/peak remain zero. |
| Raw envelope / shape pass | Check the supplied sequence length against the raw-row cap without committing it to `raw_rows`. For each row charge its shape visit, then check arity. Even if many shapes have passed, a shape failure leaves `raw_rows=raw_values=0`, input bytes equal only descriptor size, and live/peak zero. No sizing/content pass has started. |
| Start sizing a row | Check prospective `input_bytes+1` for the tuple header. On admission commit that one byte; do not increment `raw_rows` yet. No string contents are inspected. If rejected, input bytes stay at the preceding prefix. |
| Size one value | First charge `sizing_value_visits`, then inspect its size. Per-string length rejection leaves the value's bytes and `raw_values` uncommitted. Otherwise check prospective input bytes including this entire value. On admission commit both that size and `raw_values+1` atomically. On rejection leave both unchanged. Earlier values/header of the same incomplete row remain committed. |
| Finish sizing a row | After all its values have passed sizing, increment `raw_rows` once. A later sizing failure can therefore have some complete rows plus admitted values/header of one incomplete row. `raw_values` counts fully size-admitted values, not necessarily only completed rows. All flags/live/peak remain false/zero throughout sizing. |
| Phase 3 entry | Only after **all** rows have sized successfully, check a combined prospective reservation of full `input_bytes+256`. On rejection leave both input/workspace flags false and live/peak zero. On admission set both flags true atomically, set live to `input_bytes+256`, and peak to that live value. This happens even for empty input, before any value validation. |
| Value validation | Keep the full sizing totals/flags/live/peak unchanged. Charge one value visit and each actual string byte before its checks. A raw value error therefore reports fully sized input/rows/values plus the reached validation-ticket prefix, not only the values validated so far. No sort reservation exists yet. |
| Phase 4 sort admission | Check adding `16·raw_rows` to current live state. A rejected reservation leaves `sort_reserved` false and live/peak unchanged. An admitted reservation sets that flag true and raises live/peak **before** acquiring either array. Acquire both arrays before any initial index write. If either allocation fails, the admitted full reservation remains in the reported prefix and `index_writes` is still zero. Zero raw rows admits a zero-byte reservation/true flag without allocating arrays. |
| Distinct compaction | After the dedup visit/comparison has classified a row as new, check the next distinct-source count, then charge its compaction index write. Only on admitted write charge commit the next `distinct_source_tuples` and perform the write. For a duplicate, increment `duplicate_raw_tuples` only after the charged comparison proves equality; no compaction write occurs. |
| First-pass group start | Check the prospective group count, charge `group_phase_starts`, then commit `groups_admitted+1` and initialize the group workspace. The second pass charges its own group start but never increments `groups_admitted` again. Classification/reducer visits precharge their tickets before reading/updating the governed tuple. |
| Prospective output row | After its charged group finalization and successful numeric result, check prospective row count, output bytes, and live-state bytes in the contract's order. None of those passing checks alone commits output reservation/counters. Then precharge the full tuple's `output_copy_bytes_charged`. If any check/charge fails, staged row/byte/live/peak remain at the preceding committed prefix. |
| Output reservation / copy | After successful copy-work precharge, atomically increment `staged_output_rows`, add the tuple size to `staged_output_bytes`, and update live/peak to include its eight-byte directory entry plus tuple bytes. Then copy into owned output. Allocation failure retains this entire admitted reservation/work charge in the reported prefix even if the row was not fully materialized. |
| Publish / abort | Return the reached counters/flags as a pre-cleanup logical prefix. Destroying temporaries or transferring the output does not decrement that report or erase its peak. No output values escape on abort. A fresh invocation starts again from all zero/false. |

The state-cap checks use the flagged formula in §B before committing a reservation. Rejected size/counter/resource charges never record attempted bytes/counts as admitted; their bounded error data record the attempted charge separately. `peak_live_state_bytes` changes only when a state reservation commits, and is the maximum admitted live value. No physical allocation/availability observation is implied.

Hand-derived prefix example, **not executed**: count/global/source arity 1 with one raw one-byte string FF has descriptor size 5, tuple size `1+1+4+1=7`, and therefore fully sized input 12, raw_rows=raw_values=1. Before phase 3 admission live/peak are zero. After its required input/workspace admission they are 268, with input/workspace flags true and sort false. `invalid_utf8` at raw row 0/column 0/byte 0 reports exactly that 268-byte state prefix; it cannot report 0 or 284. A scalar-boundary byte 00 follows the same size/reservation prefix but reports `nul_string` instead. These are mathematical contract expectations, not observed runs.

Raw cap and byte limit failures may leave only a validated prefix in the counters. A failure reports those reached counters, not invented totals for unvisited input. Temporary `staged_*` counters may be positive on Failure, but no staged values are returned. A completed invocation's counters do not claim engine/lower-stratum, temporal extraction, host transport, SQL, or callback work. The owned-request construction before invocation is outside these counters and must not later be hidden as free host work.

### D.2 Closed work guard — hand proof, not execution

The frozen peer analysis gives a sufficient conservative ceiling once the exact schedule above is fixed. Let `Bmax = Omax = 16777216` be the input/output logical-byte ceilings and `Nmax = 100000` the raw-row ceiling. Use at most 17 merge passes, source arity at most 8, and distinct key positions at most 7. All bounds below use these **global ceilings**, not an assertion such as groups≤actual raw rows for global-empty input.

For a sort comparison, charge its examined string byte pairs to the one row that comparison emits. Each examined pair at a string position is bounded by that emitted row's payload length. Distinct key positions are a subset of the full tuple, so key-plus-full-tuple comparison costs at most twice that row's total string payload per emission. Each row is emitted once per pass: sort string work is at most `34·Bmax`. Dedup string work is at most `Bmax` by charging each current raw row; the two adjacent-key passes at most `2·Bmax` by charging each current distinct row; extrema at most `Bmax` by charging each later current measure. Total string comparison work is at most `38·Bmax`. UTF-8/domain validation costs at most `Bmax`; admitted output-copy precharges at most `Omax`, because the output-byte check precedes the work precharge/commit. Byte-dependent work is therefore at most `39·Bmax+Omax = 40·Bmax`.

| Fixed event | Conservative ceiling |
|---|---:|
| row_shape_visits | Nmax |
| sizing_value_visits | 8·Nmax |
| value_validation_visits | 8·Nmax |
| index_writes | 19·Nmax: initialization + 17 passes + compaction |
| tuple_key_comparisons | 20·Nmax: 17 passes + dedup + two boundary passes |
| value_comparisons | 278·Nmax: 15·17 sorting + 8 dedup + 14 boundaries + 1 extrema |
| dedup_row_visits | Nmax |
| classification_visits | Nmax |
| group_phase_starts | 2·Nmax, including the global-empty case under the global ceiling |
| reducer_updates | Nmax |
| group_finalizations | Nmax, likewise using the global ceiling |

These sum to `340·Nmax`. At most 64 further tickets cover descriptor checks. Hence every complete admissible trace and every reached prefix obey:

`W ≤ 40·16777216 + 340·100000 + 64 = 705088704 < 1000000000`.

Early descriptor/envelope/shape/size failures do not evade this proof: descriptor checks are bounded; raw count rejects before row visits; shapes reject before unbounded value traversal; sizes reject before content validation. Rejected prospective output-byte/work charges do not become admitted output-copy tickets. Allocation/semantic failures stop a prefix. NUL-domain rejection uses the same single consumed-byte tickets and only shortens a trace.

The proof is conditional on exactly the declared comparison/visit schedule, no extra traversals, and the fixed byte/count ceilings. It reconciles the earlier looser independent bound by using the separate admitted output ceiling Omax directly; no tighter mathematics or execution is needed. It is **not** an instruction/time/capacity/performance observation. Raw permutations/duplicates can still change the actual below-ceiling ticket totals.

Thus `work_limit` is a redundant invariant guard, like source/group/output-row guards and the closed state guard, not an independently reachable production input boundary. No fabricated/bypassed-admission case or lowered-limit helper run may be presented as its end-to-end coverage. A later schedule/layout/limit change needs a new reviewed proof/work-model identity; it cannot silently inherit this bound. Raw/source set invariance remains distinct from raw-cost invariance.

## E. Allocation, failure, and proof limits

Check logical admission before owned string copies, sort-array acquisition, source/group admission, counter increases, reducer update, or output append. An implementation must not allocate an uncharged hidden support set and call this ledger complete. Ordinary allocation failures can occur below the project limits and are atomically reported; the limits make no computer-capacity claim.

The fixed error carrier and cleanup path require later source review and authorized verification. Neither four-limb arithmetic, bit-order comparison, NUL-free UTF-8 admission, sort/dedup correctness, counter reconciliation, nor failure atomicity has been implemented or tested in this revision. These are design/math obligations, not passed checks.
