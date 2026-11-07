# Item 5 — N1 owned-relation reducer contract

Revision 002 · 2026-10-31 UTC · **FROZEN SOURCE-ONLY DRAFT FOR INDEPENDENT RE-REVIEW**

This new additive revision leaves frozen revision-001 unchanged. It corrects that draft's string-domain defect, fixes exact counter/reservation commitments, and classifies closed invariant guards. Strings remain **NUL-free UTF-8**, with separate malformed-UTF-8 and decoded-NUL failures. `REVISION-NOTES.md` records the corrections and exact current review status.

This package proposes one precise first-slice contract. It does not select or accept that contract, authorize implementation or execution, or establish item-5 completion. Every implementation, compiler, native, database, oracle, test, integration, ownership, compatibility, spilling, and performance stage is **UNRUN**. Source reading and hand-derived mathematics are the only evidence here.

## 1. Boundary and exclusions

The proposed component reduces one finite typed relation supplied to one invocation. It has no parser, rule evaluator, host callback, SQL connection, store handle, history input, temporal cut, executable IR, callback, expression, join body, correlation, nested aggregate, anchor relation, partial-state merge interface, or cross-invocation cache. It neither imports nor invokes the held native candidate, harness, controller, command, or dependent stopped syntax action. It is not substitute execution of any such action.

Its finite-set semantics are conditional on the supplied relation being the intended completed relation. The component does **not** certify lower-component completion, relation extraction, or a temporal cut. There is no public `complete` flag, certificate, stratum number, or caller assertion that it treats as proof. A future engine adapter must independently establish correct whole-program dependency extraction, strict aggregate dependencies, producer completion, and the same invocation/cut before handing over relation values.

Items 3 and 4 and their dependent held actions remain held/unaccepted; item 4 remains incomplete. Independent item 4.1 is separately source-researched and untested. This reducer retires none of those dependencies.

The actual unstable DuckDB C API v2 remains the intended later host boundary. This standalone draft neither replaces it with v1/an invented wrapper nor integrates it. Host integration, new language/API/IR/work-model identities, exact-pin SQL agreement, and old-surface compatibility are later explicit work. Existing APIs, syntax, IR1/IR2 bytes, counters, and limits are unchanged.

No computer-environment snapshot/details are needed or permitted. Protocol limits below are project design limits, not observations or guarantees about a computer's capacity. No control, toolchain, process, hardware, installation, path inventory, or stopped material is an input or deliverable.

## 2. Proposed owned interface — a data schema, not source code

The provisional document identity is `item5-n1-reducer-draft-002`. It is not a published language, extension, host ABI, or executable-IR version.

One invocation consumes an **owned request** and returns one **owned outcome**. Ownership transfers at invocation; callers retain no aliases to mutable request storage. All strings, tuple containers, selector lists, outputs, diagnostics, and counters are values owned by that request/outcome. No borrowed spans, intern IDs, parser slices, host vector views, arena pointers, or allocator addresses cross this boundary. The transfer itself does not claim to bound work or allocations the caller performed beforehand.

| Request field | Exact proposed meaning |
|---|---|
| `source_arity` | Integer from 1 through 8. Every supplied tuple has exactly this many values. |
| `group_mode` | Exactly `observed` or `global`; never inferred from missing fields. |
| `key_columns` | Owned ordered list of distinct **zero-based** source positions. Observed requires 1 through `min(source_arity, 7)` positions; global requires exactly zero. List order is output-key order. |
| `operator` | Exactly one of `count`, `min`, `max`, `sum_i64`. |
| `measure_column` | Absent for count, present and in range for min/max/sum_i64. It may also be a key column. No expression is evaluated. |
| `raw_tuples` | Owned finite sequence of typed tuples. Sequence order is explicit transport order, not contribution identity. Duplicates are permitted within the independent raw limits. |

There are no caller-adjustable budgets in this first draft. Its fixed ceilings are in §7. A future adjustable-budget surface would be a separate contract change, not an implied option.

The outcome is either:

* **Success:** an owned canonical sequence of output tuples and the new reducer counters. Each output tuple is the ordered key followed by one result value. Its arity is 1 through 8.
* **Failure:** one bounded owned structured error and the counters reached before failure; **no output tuples or partial row contents**. A failure is not a successful empty result.

An independently owned request is required for another descriptor, even over the same mathematical source. The first slice does not share scans or fuse descriptors. A future declaration surface should give each target one exclusive aggregate producer, but no target/predicate declaration surface is introduced here.

## 3. Values, equality, and canonical order

The input is a closed tagged sum with exactly one active payload:

| Tag and canonical rank | Payload and admission |
|---|---|
| string, rank 0 | Owned **NUL-free** byte string: empty, or shortest-form UTF-8 for nonzero Unicode scalar values U+0001–U+D7FF and U+E000–U+10FFFF. Decoded U+0000 is a `nul_string` domain error, never an admitted value. Malformed/overlong encodings, surrogate encodings, invalid continuations, and encodings above U+10FFFF are `invalid_utf8`. No normalization, case folding, locale, or numeric parsing. Length-delimited ownership does not widen the value domain. |
| boolean, rank 1 | Exactly false or true. |
| i64, rank 2 | A signed integer in L = −2^63 through U = 2^63−1. |
| f64, rank 3 | An **unsigned 64-bit IEEE-754 binary64 interchange word**, not a host floating expression. Reject exponent bits all one, covering every NaN and either infinity. Admit finite normal/subnormal values. Map either zero sign to the all-zero positive-zero word. No decimal round trip. |

The closed owned schema has no inactive-payload validation loophole and no unknown-tag variant. A later wire decoder must reject unknown tags before producing this schema; no wire decoder is implemented or selected here.

Value equality requires equal tags and equal admitted canonical payloads. Thus string("1"), boolean(true), i64(1), and f64(1.0) are four distinct values. Canonical f64 −0/+0 are equal. Tuple equality is equal arity and pointwise value equality.

**Canonical presentation order** is tag rank, then unsigned lexicographic UTF-8 byte order (shorter prefix first), false before true, signed i64 order, or exact finite binary64 numerical order. Tuple/key order is lexicographic in that value order. This order may sort Boolean and mixed-tag keys; it does **not** admit Boolean/mixed-tag extrema or change scalar ordered comparisons.

For f64 order without floating arithmetic, let b be the canonical interchange word. Its unsigned order key is bitwise-complement(b) when its sign bit is one, and b XOR 2^63 otherwise. Comparing these keys gives finite numerical order; the single admitted zero removes a signed-zero tie. Output f64 is the exact selected canonical input word. There is no arithmetic, rounding, underflow, reassociation, contraction, host-double conversion, or control sampling in this representation rule.

The existing scalar FP policy is unchanged: already evaluated scalar contributions retain their existing per-node checks, finite/zero rules, strict rounding/subnormal premises, and prohibition on reassociation/contraction relaxation. A scalar expression that failed before relation materialization cannot be rescued by aggregate cancellation. A bit-carried standalone comparison is not evidence that any later scalar/host path satisfies those premises.

## 4. Set identity and groups

Normalize/validate every raw value, then let R be the set of the resulting **full source tuples**. Identical raw tuples, including canonicalized floating-zero variants, contribute once. Distinct tuples with equal measures contribute separately. No DISTINCT-by-measure, derivation multiplicity, identity projection, functional-dependency inference, entity-only identity, or first/latest-wins policy is present.

For descriptor key list K and key g:

`C(g) = { r ∈ R : projection_K(r) = g }`.

* **Observed:** `G = projection_K(R)` with K nonempty. Empty R produces zero groups and zero rows. An absent key does not acquire a zero row.
* **Global:** K is explicitly empty and `G = {()}`, including for empty R. It has one group, with a public output arity of one when a result exists. This does not introduce zero-arity public relations.

Every distinct source tuple belongs to exactly one group. Non-key fields are not returned as witnesses. A deliberate projection in a separately completed lower relation can change R and therefore change count/sum; the reducer never guesses which witness columns should have been dropped.

For example, {("a","i1",7), ("a","i2",7)} grouped on column 0 has count 2 and sum 14; another copy/proof of the first tuple changes neither. {("a","i1",7), ("a","i1",8)} has count 2 and sum 15. No item→value dependency is presumed.

Temporal-history selection remains outside this component. Future extraction must validate all supplied history rows as required, apply both half-open intervals, and deduplicate **identical visible logical tuples** before reduction. Overlap alone does not imply latest-wins: overlapping records whose visible logical triples differ remain different facts/contributions. Source-only historical examples in the research are obligations for later integration, not executed evidence here.

## 5. Operators and empty results

| Operator | Nonempty-group rule | Explicit empty global rule |
|---|---|---|
| count | i64 cardinality of C(g), irrespective of validated source-value tags. There is no count-expression overload. | One tuple containing i64(0). |
| min / max | All measure tags in this group must be the **same** member of {string, i64, f64}. Select the least/greatest admitted measure in that tag's order; preserve its tag and canonical payload. Different groups may have different supported tags. | No output tuple. The reducer invocation still succeeds and its group is finalized; absence is not unfinished work. |
| sum_i64 | Every measure is i64. Compute the exact mathematical sum, then check **once** that L ≤ total ≤ U. Return i64 or fail. An out-of-i64 prefix is not an error. | One tuple containing i64(0). |

Boolean extrema, mixed-tag extrema, and every non-i64 sum measure are errors. Neither filtering invalid measures nor separating them into extra tag groups is permitted. Keys may use all four admitted tags. Empty extrema have no sentinel, NULL, NaN, infinity, placeholder, status/value pair, or fabricated ordinary value.

F64 sum is expressly **deferred**. Ordinary SUM, FSUM/Kahan, a canonical fold, a reproducible bin algorithm, and exact-once rounding are not silently selected or substituted. This first slice cannot be described as supporting floating sum or full item-5 acceptance.

Exact i64 finalization uses the portable positive/negative two-limb design specified in `ARITHMETIC-AND-ACCOUNTING.md`, not compiler signed-128, a new dependency, scalar i64 prefix checks, wrap/saturation, or floating fallback. The public tag remains i64.

## 6. Normative phase order and deterministic errors

`ARITHMETIC-AND-ACCOUNTING.md` defines the bounded canonical traversal and ticket schedule. No output is observable until success. A scheduled work-ticket check precedes the action it governs; exhaustion wins over any error that would only be discovered by that action or a later action. Ordinary allocation failure is separately translated as below.

1. **Descriptor.** Check fields in this order: source arity; group-mode variant; operator variant; mode/key-count rule; key positions left-to-right (range before duplicate); measure presence then range; output arity. The first failure is `invalid_descriptor` with a fixed field identifier and optional selector ordinal. No raw payload is read first.
2. **Raw envelope and sizes.** Descriptor success has committed only the descriptor's logical bytes; live/peak state remain zero. Check raw-row count before visiting rows. Check all row arities in raw ordinal order; shape visits commit no raw-row/value sizes. Then size each row in raw order: admit its one-byte tuple header; size values left-to-right, checking per-string length before cumulative input bytes; commit each value's size and `raw_values` only after its size admission; commit `raw_rows` only when the entire row has sized successfully. A failed check leaves the prior committed prefix, including an admitted current-row header/earlier values. Return the first scheduled `raw_rows_limit`, `tuple_arity`, `string_bytes_limit`, or `input_bytes_limit`. String contents, NUL presence, and f64 finiteness are not inspected by this size pass.
3. **All values.** Before any value validation, atomically admit the fully sized input and fixed 256-byte workspace into the logical-state ledger; on rejection no reservation flag/live/peak counter changes. Then validate raw values in row/column order, with string bytes consumed once from left to right. A malformed UTF-8 event gives `invalid_utf8`; a decoded U+0000 scalar gives the distinct domain error `nul_string`; a nonfinite f64 word gives `nonfinite_f64`. The exact string rules below determine precedence and offsets. This includes unused columns, every duplicate copy, and every group. Canonicalize zero. No sorting/reduction, preliminary whole-string NUL scan, or early min/max shortcut may hide/reorder a raw-value error.
4. **Canonicalize the relation.** Separately admit both bounded row-reference arrays into the logical-state ledger, then acquire both arrays before writing initial row indices. An admitted reservation remains reported if allocation fails. Sort row references by `(ordered key, full tuple)`; adjacent full-tuple duplicates collapse. Charge all attempted raw work. Admit distinct tuples only below their cap. Any work/state/source limit failure precedes later measure validation. No hash iteration or allocation address chooses order.
5. **Group/type preflight.** Scan distinct rows by canonical group then full-tuple order. Admit each group before use. For each group collect its measure-tag set completely. The first canonical group with a type error wins. For extrema, a Boolean tag yields `unsupported_measure_tag` even if other tags also occur; otherwise multiple supported tags yield `mixed_measure_tags`. For sum, any non-i64 tag yields `unsupported_measure_tag`. Count has no measure check. Finish this phase for **all** groups before arithmetic finalization or output materialization. Thus any discovered group-type error outranks every later final-range/output error.
6. **Canonical reduction/finalization.** Scan groups again in the same order; update once per distinct tuple. Finalize each group, then stage its result before proceeding to the next group. In that group's fixed order: sum final-range check; prospective output-row cap; prospective output-byte cap; prospective live logical-state cap; work precharge for copied output bytes; atomically commit that output row's logical reservations/live/peak; owned output copy. A rejected check/work charge commits no output reservation. An admitted reservation remains reported if allocation fails. A final out-of-range sum gives `sum_i64_range`. An earlier group's output limit can therefore precede a later group's range failure; there is no unspecified global priority between them. Empty global min/max finalizes without an output row.
7. **Publish.** Only after every phase succeeds, transfer the complete owned canonical row sequence to Success. On any failure discard every staged row and all temporary state. No stream/callback/partial answer escapes.

### String domain/syntax precedence and byte offsets

The first value-validation event in the prescribed raw row/column order wins. Within a string:

* At a scalar boundary, byte 00 is the complete shortest-form encoding of U+0000. Consume its usual single validation ticket, then return `nul_string` immediately at that byte's **zero-based byte offset**. No later byte is inspected.
* While a continuation is required, byte 00 fails the continuation rule. After its usual validation ticket return `invalid_utf8` at that consumed byte's offset, **not** `nul_string`. Do not recover or reinterpret it as a new scalar.
* All other malformed UTF-8 returns `invalid_utf8` at the first consumed byte making the prefix invalid, including restricted continuation ranges needed to rule out overlong/surrogate/out-of-range encodings. Overlong encodings of zero remain malformed; they do not produce a decoded U+0000 value.
* At end-of-string, an unfinished scalar returns `invalid_utf8` at its lead-byte offset. Only actual consumed bytes receive validation tickets; EOF is not another byte.

Thus an earlier malformed event outranks a later NUL; an earlier decoded NUL outranks later malformed bytes. The rules do not perform separate global “UTF-8 first” or “NUL first” scans. A work-ticket failure before consuming a byte still wins under the existing work rule, and preceding descriptor/size phases retain their established priority. Empty string remains admitted. NUL is rejected in keys, measures, unused fields, and duplicates alike.

Canonical group ordinals are **zero-based** in canonical key order; the sole global group has ordinal 0. Error data use fixed enumerated identifiers, zero-based raw row/column/byte ordinals for raw validation, or canonical group ordinal and a four-bit tag set for measure errors. Range errors use canonical group ordinal. Limit errors name the limit and its attempted logical charge. No input string/key, intermediate wide total, pointer, external exception text, or computer detail is echoed. The error is a fixed-size owned value of at most 256 logical bytes, with presence bits for optional ordinals and no dynamically allocated message. Its ASCII code names are defined by this document, not borrowed runtime strings. Unsupported process/memory corruption is not converted into a semantic success.

Errors are deterministic for the same owned raw request under the specified ticket schedule. Permuting malformed raw input can change its raw-error ordinal; multiplying duplicates can change resource admission. For admitted valid requests that reach semantic reduction, set results/type/range behavior depend on R, not raw order/proof multiplicity. No claim equates all resource/error traces across different raw carriers.

Cleanup must not throw outward. An ordinary allocation failure becomes `allocation_failure`, with no rows and the reached counters. The failure arm and fixed diagnostic/counter carriers must be constructible/returnable without a new dynamic allocation; this is a source requirement, not a tested property. Allocation failure has no promised relation to semantic-error priority or available capacity. No C/host exception boundary is implemented here.

The closed proposed error-code set is: `invalid_descriptor`, `raw_rows_limit`, `tuple_arity`, `string_bytes_limit`, `input_bytes_limit`, `invalid_utf8`, `nul_string`, `nonfinite_f64`, `source_tuples_limit`, `groups_limit`, `work_limit`, `logical_state_limit`, `output_rows_limit`, `output_bytes_limit`, `unsupported_measure_tag`, `mixed_measure_tags`, `sum_i64_range`, `allocation_failure`, and `internal_invariant`. The phase is the current member of {descriptor, shape_sizes, value_validation, relation_canonicalization, group_preflight, reduction_output}. `nul_string` has phase `value_validation` and raw row/column/byte ordinals. Resource failures carry the governing limit ID; allocation/invariant failures carry the current phase but no external exception text. Redundant guards such as source/group/output-row ceilings can be unreachable under tighter earlier bounds; they are not invitations to bypass raw admission for an end-to-end claim.

## 7. Fixed logical protocol limits

All byte units below are logical encoding/accounting bytes, not `sizeof`, resident memory, allocator capacity, or an operating-system admission claim.

| Limit | Proposed ceiling, per one reducer invocation |
|---|---:|
| source arity / output arity | 8 / 8 |
| raw tuples, counting every duplicate | 100,000 |
| distinct source tuples / contributions | 100,000 total, hence per group |
| groups | 100,000; explicit global contributes one even when empty |
| one raw string payload | 65,536 bytes |
| total descriptor + raw tuple logical bytes | 16,777,216 bytes (16 MiB) |
| logical work tickets | 1,000,000,000 |
| simultaneously charged logical state | 41,943,040 bytes (40 MiB) |
| output tuples | 100,000 |
| total owned output logical bytes | 16,777,216 bytes (16 MiB) |
| fixed error carrier | 256 logical bytes, reserved independently of successful-output budgets |

Every governing check occurs before its new allocation/copy/admission/update. Count cannot exceed 100,000 and thus cannot overflow i64. Raw duplicates are not free: raw count, payload, UTF-8/domain validation, sorting, and deduplication work remain separately charged. The distinct-source cap alone would not establish that bound.

The state proof and exact work/counter definitions are part of the companion accounting specification. None is appended to old engine metrics. Exceeding a resource limit is not numeric overflow. A resource failure returns no rows, including when many earlier groups were successfully staged. All state is invocation-local; a fresh request after failure has no inherited keys, counters, partial totals, or results.

The fixed source/group/output-row/state/work guards are **closed invariant guards** under this draft's tighter raw ceilings and exact schedule. The companion hand proof bounds work by 705,088,704 tickets, below 1e9; state by 35,954,688 logical bytes, below 40 MiB. Raw and output-byte limits remain reachable admission boundaries. Do not bypass/lower admission, add extra traversals, or fabricate an end-to-end work/state guard failure and call it a production boundary. No such run or helper experiment occurred.

## 8. Review status

This text resolves design choices **within this proposed draft only**. The bounded review of revision-001 was received and its B1/B2/C1 obligations addressed in the author's new text; that is not an independent approval of revision-002. This package is frozen after its final local write for coordinator/peer re-review. Independent contract review/selection remains required before implementation. The source/math references, additive errata, future integration obligations, and empirical gates are in `REFERENCES-AND-GATES.md`. No code, test packet, native command, SQL execution, computer inspection, external publication, or Git mutation is supplied or authorized by this package.
