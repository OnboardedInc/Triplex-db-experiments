# Native SQL extrema and exact integer sums

Extension 0.18 extends the C++ complete-source count planner to `min`, `max`
and `sum_i64`. It consumes the genuine validated IR; TypeScript transports the
program/options and decodes owned exact output. Existing count routes retain
their reason codes and semantics.

The admitted whole program has no ground facts and either one direct aggregate
over the full EAV relation, or one ordinary single-EAV projection followed by a
complete-source aggregate. The source projection may use constants, repeated
variables and constant head terms. Expression filters, negation, additional
joins/rules and other shapes use the existing native evaluator.

## Semantics and fallback

The source is DISTINCT across complete projected typed tuples. Equal measures
from distinct source tuples contribute separately to sums. Each grouping key
uses all five typed slots, preserving boolean/numeric/text identity and BLOB
UTF-8 ordering. Output retains native tuple ordering and exact value encoding.

Fresh SQL proof inspects the actual projected measure column. For extrema it
requires one homogeneous non-boolean tag across that whole source: string,
int64 or finite binary64. This is deliberately more conservative than native
per-group admission; groups with different valid tags fall back. Empty sources
pass the domain proof vacuously. String extrema operate on BLOBs; integer and
float extrema use their exact typed slots. Empty global extrema emit no tuple,
while empty grouped extrema have no groups.

Integer sum requires exclusively int64 measures. SQL accumulates HUGEINT and
uses `TRY_CAST` for the final int64 conversion. At most 100000 int64 source
tuples have magnitude below 2^80, so the accumulator cannot overflow HUGEINT.
An empty global sum is zero. Any group's unsuccessful final conversion fails
SQL proof and selects native execution; it does not raise a SQL overflow error.

All invalid domains and unproved ranges fall back instead of generating SQL
domain errors. The authoritative native evaluator therefore retains canonical
budget/type/range error priority. In particular, all groups' tags are checked
before any sum range finalization, so a bad tag in a later group outranks an
earlier group's overflowing sum. Large positive and negative prefixes can
cancel when their final sum fits int64.

Success reports SQL `proved_aggregate` with null native counters. Failed proof
reports native `aggregate_budget_unproved` with actual counters. Forced native
and the empirical default retained-row cost preference remain unchanged.

## Native admission bounds

Let `n` be the full relevant active EAV set size, `m` the projected source size
and `g` the internal number of groups. Global aggregates have one internal group
even on empty input. It must be counted before empty extrema output is filtered.

| Profile | Facts | Work | Rounds |
| --- | --- | --- | --- |
| Direct non-count aggregate | n + g | 2n + 2g | 2 |
| Projected non-count aggregate | n + m + g | n + 2m + 2g | 2 |

Native non-count aggregation charges source grouping, each group's type check,
a second source scan and each group's output attempt. Projection candidates
add at most `n` work. The two-round bound is conservative for direct execution;
failed round proof can still succeed through native's actual one-round route.
Fact bounds conservatively include an empty global extrema group even though
it produces no fact.

The dictionary bound retains the base `3n`, source constants and reserve. Sum
adds at most `g` newly interned integers; extrema select existing values and add
none. Dictionary string bytes include full base strings plus constants.
Typed output/wire bounds use at most `g` result rows. Extrema include maximum
text bytes from their measure column in addition to all grouping key bytes.

Before constructing projected source or group rows, the existing worst-case
source gate bounds logical typed cells and modeled carrier bytes at 800000
cells / 32 MiB per stage. Non-count groups include their extra source-row-count
column in that model. Wide non-measure projected constants are also included.
Native fact-list construction remains gated off when SQL proof succeeds.
These are logical admission bounds, not complete allocator/physical containment.

## Verification and performance recipe

Six real-engine methods compare native/SQL results with independent expected
values, including complete-tuple set identity, exact integer endpoints and
cancelling sums, Unicode BLOB order, finite float endpoints/subnormals,
global/grouped empty input, corrections and original schema meaning, invalid
measure tags, mixed-tag errors, final overflow and tag-before-range priority.
Budget sweeps cover native fact/work/round failure boundaries and SQL selection
at exact successful thresholds. Direct one-round fallback, entity/constant
measure columns, valid mixed-group fallback, and a 4096-row source with a 16 KiB
non-measure constant cover additional admission edges.

`node build/adapter/benchmark-aggregate.mjs` compares global/grouped extrema and
sums on identical native schema-bound files after close/reopen. Two warmup pairs
precede five alternating measured pairs at 512/4096/20000/40000 facts. Every
exact answer, route and position is checked. Timings include retained integrity
and schema validation, fresh proof/statistics, execution and full exact output;
fixture ingestion/open are excluded. Results, raw samples and source/build
identities belong in `evidence/native-aggregate-benchmark.json`. This recipe
does not by itself establish a speedup; measured outcomes must be reported with
small-input regressions and retained-validation cost.


The final suite passes 142 scoped checks plus semantic TypeScript. The aggregate
packet matches the same 0.18 source/build as verification. Selected medians:

| Facts | Query | Native ms | SQL ms | Native / SQL |
| --- | --- | --- | --- | --- |
| 512 | min | 11.64 | 15.84 | 0.74x |
| 512 | max | 11.29 | 16.04 | 0.70x |
| 512 | sum | 12.49 | 17.54 | 0.71x |
| 512 | grouped_sum | 11.62 | 16.86 | 0.69x |
| 20000 | min | 32.78 | 33.63 | 0.97x |
| 20000 | max | 34.43 | 34.96 | 0.98x |
| 20000 | sum | 34.24 | 34.74 | 0.99x |
| 20000 | grouped_sum | 34.36 | 35.77 | 0.96x |
| 40000 | min | 56.12 | 51.66 | 1.09x |
| 40000 | max | 57.41 | 52.10 | 1.10x |
| 40000 | sum | 57.51 | 52.11 | 1.10x |
| 40000 | grouped_sum | 55.82 | 53.23 | 1.05x |

SQL is slower on the measured 512/4096 cases and approximately tied or slightly
slower at 20000. At 40000 it improves all six measured aggregates, with ratios
of 1.05–1.11x (roughly 5–10% lower latency). The existing default retained-row
threshold of 16384 is empirical and can select SQL before its best crossover
for these shapes. Query-shape-aware costing remains useful future work.
