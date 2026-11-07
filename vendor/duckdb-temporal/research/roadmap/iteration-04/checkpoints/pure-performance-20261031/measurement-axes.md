# Measurement axes clarification

Immutable source-only clarification to 20261031T200625Z-final-report.md. All empirical execution remains **UNRUN**.

For the future separately authorized protocol, keep the following quantities distinct rather than using “rows,” “size,” or “unique values” interchangeably:

- R: actual scalar SQL input rows / native engine invocations in the callback.
- Temporal input rows per invocation: logical facts admitted, including repeats; not R and not dictionary entries.
- N: invocations with nonempty answers.
- T: total emitted answer tuples; not N or R.
- C: total emitted typed cells across those tuples; vary tuple count and arity separately where the language permits.
- L: emitted non-inline string occurrences; not unique strings.
- B: total string byte volume, split inline/non-inline and input/output.
- U: unique native values, broken down by tag and by input/output role; repeated strings and repeated numeric values can have the same logical-row/cell counts but different interning/hash/dictionary work.
- Physical vector representation, selection/alias pattern and physical dictionary cardinality: not a substitute for logical R, temporal rows, T, C, L or native U.

Where feasible, hold the other quantities fixed while varying one axis. Document constraints when the program semantics prevent an independent cross-product. The current binding's 2 L term counts long-string occurrences, whereas native interning maps are keyed by distinct strings, integers or canonical float bits; neither quantity subsumes the other.

Source basis: local temporal_datalog.cpp:463–590; temporal_value_domain.hpp:88–188; published ITERATION-04.md:108–133. These are analytical distinctions, not benchmark results.

