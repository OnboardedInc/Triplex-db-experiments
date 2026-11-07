# Additive errata — read with the original item-5 reports

2026-10-31. These corrections come from the [independent frozen peer review](peer-review.md). Original authored reports are retained, not silently edited. None selects a contract or changes any acceptance/hold.

1. **80 magnitude bits, not fewer.** Numeric finding 1 says "fewer than 80 magnitude bits." At 100,000 i64 contributions the largest magnitude exceeds 2^79 and is below 2^80, so 80 magnitude bits plus sign suffice. The body's signed-81/signed-128 argument is sound. This is an analytic bound under the contributor cap, not an observed representation.
2. **Default versus optimized BIGINT SUM state.** The default pinned registration uses HUGEINT state/result, but a statistics-proved sum_no_overflow implementation can use int64_t state while preserving HUGEINT output. Do not infer a particular physical state from the output type or a runtime plan from source reading. [Exact source, lines 286–449](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L286-L449).
3. **Precise floating/Kahan locators.** Add [sum.cpp lines 548–585](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/aggregate/distributive/sum.cpp#L548-L585) for DOUBLE/Kahan registrations and [sum_helpers.hpp lines 143–153](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/include/core_functions/aggregate/sum_helpers.hpp#L143-L153) for Kahan constant-update multiplication. The original claims are supported, but their narrower citation spans were incomplete.
4. **Complete article byline.** Performance bibliography D9 should credit **Hannes Mühleisen and Mark Raasveldt**, [Parallel Grouped Aggregation in DuckDB](https://www.duckdb.org/2022/03/07/aggregate-hashtable), 2022-03-07. It remains historical context, not current capability or project timing evidence.

## Important qualifications, not silent semantic changes

- The custom-state spill negative concerns the inspected pinned public-v2 builder/state-export path. It does not assert that all inline states, row payloads, built-in aggregates, or v2 data can never spill.
- A cap on distinct source tuples/contributions does not cap arbitrarily many physical duplicate rows. Require a validated bounded set carrier or separately bounded/charged transport rows, bytes and deduplication work before implementation.
- Identical visible logical tuples deduplicate. Temporal overlap does not imply latest-value resolution; overlapping visible **distinct triples remain distinct**.
- Aggregate arithmetic is not permission to combine overlapping contributor partitions. Exact partial-state combination requires disjoint contributions or an established uniqueness step, plus count/type/admission obligations.

All empirical stages remain UNRUN.
