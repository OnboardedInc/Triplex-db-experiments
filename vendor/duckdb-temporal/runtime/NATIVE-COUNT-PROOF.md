# Native complete-source count lowering

Extension 0.16 compiles a bounded count profile from the genuine C++ IR into
DuckDB SQL. The existing native evaluator remains the fallback. The host sends
the program and options and decodes typed output; it does not compile semantics.

The whole program must have no ground facts and either one direct aggregate
rule over `triple`, or one ordinary projection rule over a single triple atom
followed by one complete-source count rule. Native compilation first checks
aggregate grammar, safety and source identity. This lowering admits count as
the last answer term, preceded only by source grouping variables. Source rules
can contain typed constants, repeated variables and constant head projections;
they cannot contain expression filters, negation or additional joins/rules.

For example:

```text
source(?e,?v) :- triple(?e,'n',?v).
answer(?v,count()) :- source(?e,?v).
```

The source is a set of complete projected tuples. SQL uses DISTINCT across all
five slots of every source value before counting. It therefore counts three
distinct `(entity,value)` tuples even if those tuples contain only two distinct
values. Grouping compares all typed slots, with UTF-8 strings represented as
BLOBs. Output uses the existing exact integer/float codec and native order.
A global empty count yields integer zero; an empty grouped count has no rows.

## Fresh admission

Let `n` be the full relevant distinct active EAV count, `m` the actual projected
source count and `g` the actual number of groups (one for global count). They
are computed from the same admitted temporal cut, with retained carrier and
historical schema checks. These are conservative native bounds:

| Profile | Facts | Work | Rounds |
| --- | --- | --- | --- |
| Direct count | n + g | n + g | 2 |
| Projected-source count | n + m + g | n + m + g | 2 |

Native evaluation charges each projected rule candidate, including candidates
that collapse to the same set tuple; hence the `n` contribution is retained.
Completed aggregate evaluation charges source rows and resulting groups. The
two-round bound is conservative for direct count; if it does not fit, native
fallback can still succeed with its actual one-round execution.

The dictionary bound adds `g` possible count integers to `3n`, constant
occurrences and the existing reserve of 32 values. String bytes are bounded by
the full base set plus source constants; counting adds no strings. Since
`m <= n <= 100000`, count cannot overflow int64. Existing typed output and
16 MiB wire bounds apply to `g` rows.

Before constructing DISTINCT source rows or groups, a source gate uses worst
case `n` source rows and at most `n` groups (one for global count). Both source
and group construction must fit 800000 logical typed cells and 32 MiB modeled
carrier bytes, including projected constants and maximum text sizes. A failed
gate yields empty SQL inputs, fails SQL proof and selects the unchanged bounded
native evaluator. This prevents a large repeated string constant from creating
an unproved SQL intermediate. These are logical bounds, not physical heap
containment.

Successful execution reports `proved_count` with null native counters. A failed
proof reports native `count_budget_unproved` and actual evaluator counters.
Native input-list collection is itself gated off when a SQL proof succeeds;
fallback still receives the complete validated active set.

## Executed checks and measurements

Four real-engine methods check eleven SQL/native program identities plus
independent expected counts; four-tag grouping, set projection, repeated
variables, constants, source-rule order, empty groups, original schema meaning,
budget boundaries and healthy reuse. Invalid aggregate bodies and unsafe heads
still reject in the authoritative compiler. A 4096-row source with a 16 KiB
projected constant exceeds the SQL source bound and successfully uses native
fallback. The complete suite passes 134 scoped checks plus semantic TypeScript.

`node build/adapter/benchmark-count.mjs` compares forced native and proved SQL
on the same binary, program and file-backed native fixtures after close/reopen.
Two warmup pairs precede five alternating measured pairs. Every answer, route
and position is checked. Timing includes retained validation, proof statistics,
execution and complete exact output; ingestion/open are excluded. Raw samples
and source/artifact identities are in `evidence/native-count-benchmark.json`.

| Facts | Query | Native ms | SQL ms |
| --- | --- | --- | --- |
| 512 | Filtered count | 10.13 | 13.94 |
| 4096 | Filtered count | 14.58 | 17.78 |
| 20000 | Filtered count | 29.31 | 28.42 |
| 40000 | Filtered count | 51.66 | 47.87 |
| 40000 | Direct count | 51.97 | 51.39 |
| 40000 | Grouped count | 51.11 | 51.57 |

The measured 40000-fact filtered count improves about 8%; small inputs favor
native and grouped counts are approximately tied. These selected comparisons
do not establish a universal speedup or an optimal dispatch threshold. Omitted
`forceNative` retains the existing empirical retained-row preference.
