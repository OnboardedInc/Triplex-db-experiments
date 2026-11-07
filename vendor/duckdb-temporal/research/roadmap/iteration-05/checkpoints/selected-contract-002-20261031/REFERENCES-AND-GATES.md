# Evidence anchors, additive corrections, and remaining gates

Revision 002 · 2026-10-31 UTC · **FROZEN SOURCE-ONLY DRAFT FOR INDEPENDENT RE-REVIEW**

## 1. Read scope and static attribution

Revision-002 re-read only the five known authored files in its own frozen revision-001 package and the four subsequently named frozen review files at `.agent-logs/goal5-contract-peer/revision-001/{10-review.md,20-counter-and-bound-analysis.md,30-revision-obligations.md,90-manifest.json}`, by literal text reads. Original fresh-research provenance is carried from revision-001, not represented as a new independent retrieval. The coordinator also provided the exact immutable NUL-free value-domain reference below. No directory scan or old-source fetch was used.

No original/held local product source, stopped checkpoint/command, backup, archive, controller, admission/toolchain/process/hardware record, installed binary, computer inventory, or upstream attachment is an input. Primary links below are **attributions from the fresh research, coordinator, or named peer review**, not a claim this drafting lane independently fetched them.

## 2. Blocking contract corrections

### C1 — Restore the selected NUL-free string domain

Revision-001 incorrectly admitted embedded U+0000. This is a domain-widening defect, not an optional aggregate feature. Revision-002 rejects decoded U+0000 as `nul_string` while preserving strict malformed-UTF-8 rejection. A zero encountered in a required continuation position is `invalid_utf8`, not a decoded NUL. One left-to-right decoder, no pre-scan/recovery, exact byte offsets, and raw row/column order determine the first failure; the closed error-code set now includes `nul_string`.

The coordinator independently confirmed immutable project commit **691ccf65eb0bee686c1919bfa893d1027db30162**, [temporal_value_domain.hpp lines 27–31]([PRIVATE_REFERENCE_REMOVED]), returned Git blob **99ff9118354d3bba5e48ad461442ef2493e94086**: zero in the leading-byte position is rejected; continuation zero is separately malformed UTF-8. This lane did not fetch that source or create any local/candidate dependency on it. The fact is carried as coordinator-confirmed static semantics, not installed/runtime evidence.

### C2 — Fix counter/reservation commitment prefixes

The bounded peer handoff reported that revision-001 left raw row/value/input-byte commitment and logical input/workspace/sort reservations ambiguous. Revision-002's flagged live-state formula and normative §D.1 state machine now distinguish descriptor, shape, sizing, input/workspace admission, value validation, sort-array admission/allocation, source/group admission, prospective output checks, output reservation/copy, and final cleanup/reporting. Rejected charges preserve previous committed counters; allocation failure preserves admitted reservations. Initial and shape/sizing live/peak are zero; phase 3 admits the full input plus fixed workspace before value validation; phase 4 separately admits sort arrays.

The one-byte FF example is hand-derived: arity1/global/count, fully sized input12, raw_rows=raw_values=1, then phase3 live/peak268 with input/workspace flags true and sort false. Its `invalid_utf8` outcome cannot report state0 or284. No example was executed.

### C3 — Honest closed work/state guards

The frozen peer's `20-counter-and-bound-analysis.md` proves `W ≤ 40·Bmax + 340·Nmax + 64 = 705088704 < 1e9`, conditional on exactly the declared schedule and fixed input/output ceilings. Revision-002 explicitly confirms one comparator traversal stopping at first difference/end, one emitted row per merge comparison, one dedup comparison per raw row after the first, one adjacent-key comparison per adjacency per observed pass, and one extrema comparison after each group's first measure. `ARITHMETIC-AND-ACCOUNTING.md` §D.2 carries the decomposition/proof using global ceilings, including global-empty groups. This reconciles the author's earlier looser bound without chasing tightness: the peer bound directly uses the independent admitted output-byte ceiling. These are mathematical protocol units, not observed work/time/capacity. The state guard remains closed by the 35,954,688-byte logical bound under the fixed layout.

No end-to-end input may be fabricated by bypassing/lowering production admission and then called a production work/state-limit case. Redundant source/group/output-row guards likewise need proof honesty, not a manufactured over-limit result. A different future limit/work model requires explicit review/versioning; no such model or run is selected here.

## 3. Retained semantic/math anchors

* **Observed keys versus empty global group:** Mumick, Pirahesh, Ramakrishnan, [The Magic of Duplicates and Aggregates](https://www.vldb.org/conf/1990/P264.PDF), Definition 3.1 and §3.2 footnote. These constructions differ; observed mode has nonempty keys, global mode explicitly has zero keys.
* **Full tuple versus measure DISTINCT:** Mohapatra and Genesereth, [Aggregation in Datalog Under Set Semantics](https://web.stanford.edu/~abhijeet/papers/aggregates.pdf), §2, Examples 2–3. Retained discriminators change the contribution set. No first-class-set language is imported.
* **Strict aggregate dependencies:** Pelov, Denecker, Bruynooghe, [Well-founded and Stable Semantics of Logic Programs with Aggregates](https://arxiv.org/pdf/cs/0509024), Definition 5.8/§5.2. Future extraction/completion must reject cycles containing negative/aggregate edges, including unreachable cycles; positive recursive lower producers may complete first. Richer recursive theories are not adopted.
* **Null-free partial extrema comparison:** [Soufflé aggregate reference](https://souffle-lang.github.io/aggregates). Comparison evidence for empty/witness scope, not required syntax/arithmetic. This draft explicitly returns no tuple for empty global min/max.
* **Integer safety/portability:** the 80-magnitude-bit bound, four-limb construction, and final conversion remain hand derivations. The fresh research cites [C++ expression rules](https://eel.is/c++draft/expr.pre) for signed-overflow caution and [GCC int128 extension documentation](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fint128.html) for portability limits. No compiler/type availability was examined.
* **FP alternatives are distinct:** Neal, [Fast Exact Summation Using Small and Large Superaccumulators](https://arxiv.org/html/1505.05571v1); Ahrens, Demmel, Nguyen, [Algorithms for Efficient Reproducible Floating Point Summation](https://people.eecs.berkeley.edu/~demmel/ma221_Fall23/J115_Efficient_Reproducible_Summation_TOMS_2020.pdf); [MPFR documentation](https://www.mpfr.org/mpfr-current/mpfr.html#Arithmetic-Functions). Exactness, reproducibility, prefix finiteness, error bounds and correct rounding are distinct. F64 sum is still deferred; no library/algorithm was selected or run.

The fresh numeric report attributes strict scalar checks and finite canonical values to the immutable published project [expression policy]([PRIVATE_REFERENCE_REMOVED]), [FP policy]([PRIVATE_REFERENCE_REMOVED]), and value domain at that same commit. These policies remain unchanged; there is no new product-source read or runtime claim in this lane.

## 4. Retained additive research errata

1. **80 bits:** “fewer than 80 magnitude bits” is false; totals have magnitude below 2^80, and some exceed 2^79. Eighty magnitude bits plus sign suffice. The body proof/signed-128 sufficiency remain sound.
2. **DuckDB BIGINT state:** default BIGINT SUM uses HUGEINT state/result at the declared pin, but source statistics may substitute a proved-safe narrow state without narrowing the public result. No plan was observed. [Pinned registration/statistics source](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L286-L449). Native i64 output still needs its specified final check.
3. **Floating/Kahan anchors:** [sum.cpp lines 548–585](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L548-L585) and [sum_helpers.hpp lines 143–153](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp#L143-L153) cover the registrations and Kahan constant multiplication. Neither becomes the selected native sum.
4. **Historical byline:** [Parallel Grouped Aggregation in DuckDB](https://www.duckdb.org/2022/03/07/aggregate-hashtable) is by Hannes Mühleisen and Mark Raasveldt. It is historical architecture context, not project measurements/current public-API proof.

The independent raw duplicate/payload/work limits and distinction between identical visible logical tuples versus distinct overlapping triples remain explicit. Frozen originals and revision-001 remain untouched.

## 5. Actual v2 remains later explicit work

The fresh research/peer identifies the actual [pinned public v2 header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h), [unstable extension-family header](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_extension_v2.h#L14-L78), and [aggregate bridge](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_func_aggregate.cpp#L160-L377). Static callback/ownership obligations confer no registration, connection, SQL, host-pin-change, store, thread, or internal-C++ authority. No route is replaced with v1/an invented wrapper.

The custom-state-spill negative remains narrow: the public-v2 builder does not install the internal state-description hooks for the inspected export path, whose gate also rejects destructors. This is not “v2 cannot spill.” Pointer-free state rows, built-ins and typed collections are different cases. [Pinned spill gate](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/execution/aggregate_state_spilling.cpp#L14-L75). Collections are not group-routing/sort operators and do not automatically spill unrelated native state or replace UTF-8/alias validation.

[Issue 28132](https://github.com/duckdb/duckdb/issues/28132) was reported open/reproduced in the fresh review on 2026-10-31. It is a later UDF-path regression gate, not locally reproduced exact-pin evidence and not automatically a standalone-reducer blocker. No attachment/reproduction/optimizer/host-pin action occurred.

## 6. Remaining review and empirical gates

### Before implementation

Independently review the complete revised interface/domain, fixed bounds, equality/order, raw/full-set semantics, empty/type rules, exact error and counter/reservation transitions, closed guard proofs, four-limb arithmetic/conversions, fixed owned failure carrier, and held-action independence. Review/selection of this revised draft remains pending; source corrections are not implementation authorization.

There is no code, test packet, compiler/native/SQL command, harness/controller, installation, admission/control probe, computer packet, external publication, or Git mutation here. A new source slice cannot import/compile/invoke held source or rename a stopped command. A real denial stops that exact action and dependent work; no route-around prerequisites are introduced.

### Before reducer correctness claims

A new authorized independent oracle must not reuse candidate comparator/limb/sort helpers. Required future evidence includes set duplicates versus equal measures, canonical f64 zero, heterogeneous keys, NUL-free UTF-8 acceptance, decoded-NUL versus malformed-continuation precedence/offsets, empty strings, both empty-group modes, Boolean/mixed extrema, per-group tag variation, both i64 extremes, cancellation/final overflow, exact failure counter prefixes/flags, reachable raw/output limits, atomic late failure, ownership destruction, and a fresh request after failure.

Guard-closure proofs are not failed tests. No impossible work/state/source/group/output-row boundary is to be represented by a fabricated end-to-end input. Lowered abstract/helper budgets, if ever independently authorized, must be labeled as a separate model and cannot establish a production boundary. Every case remains an **unrun obligation**, not permission to execute.

### Before Datalog/temporal/SQL/host acceptance

* Correctly extract every aggregate dependency, reject strict-edge SCCs even when unreachable, and prove actual producer completion/immutability at the same invocation/cut. An accepted graph/caller flag does not prove extraction/completion.
* Verify whole-history admission, both half-open cuts, identical-visible-tuple dedup, distinct overlaps, correction boundaries and no stale cross-cut state. The reducer performs none of these steps.
* Explicitly select additive language/API/owned inspect-only IR/work-model/SQL/extension versions and actual-v2 host integration. Preserve old predicate names/equality filters, IR1/IR2 bytes/booleans/enums, layouts/counters/limits and no caller-IR execution.
* Adapt exact-pin SQL for full-source dedup, strict NUL-free typed values/keys, bytewise strings, explicit global-empty/type mapping and final native-i64 narrowing. SQL NULL/HUGEINT success is not native no-row/i64 success. Host narrow-state optimization does not change this. Floating SUM/FSUM is not an exact oracle for a deferred feature.
* Verify v2 alias preparation, row/state aliasing, result offsets, cleanup/abort and any separately chosen spill architecture. No host SQL inside callbacks, optimizer hook, host-pin change, store authority or new thread permission is inferred.
* Establish old compatibility and honest project-only correctness/performance evidence. Paper timings are not project timings; no computer-environment packet is needed or permitted.

All implementation/empirical/integration/compatibility/acceptance stages are UNRUN/NOT ESTABLISHED. Items 3/4 and dependent actions remain held; item4 incomplete; independent4.1 separately source-researched and untested. No selected/accepted/capacity/performance claim is made.
