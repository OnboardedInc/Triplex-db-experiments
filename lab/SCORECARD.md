# Scorecard (fitness function)

Cell values: OPEN, PARTIAL(<what>), PASS@<rung or scope> with a receipt path. Fresh evidence from this
checkout only; inherited homebase receipts are reference, not acceptance.

| Goal | xtdb-native (XTQL) | xtdb-native (SQL alt) | qlever-native (SPARQL) |
| --- | --- | --- | --- |
| 1 exact types, schemas, cardinality, uniqueness, refs | OPEN | OPEN | OPEN |
| 2 expressions, arithmetic boundaries, errors | OPEN | OPEN | OPEN |
| 3 plans, costing, admission, recursion | OPEN | OPEN | OPEN |
| 4 absence/negation at coherent cuts | OPEN | OPEN | OPEN |
| 5 aggregates, typed groups, empties, overflow | OPEN | OPEN | OPEN |
| 6 cancellation, deadlines, resources, cleanup | OPEN | OPEN | OPEN |
| 7 atomic writes, receipts, migration, recovery | OPEN | OPEN | OPEN |
| 8 bounded reuse, publication, maintained supports | OPEN | OPEN | OPEN |
| 9 bitemporal intervals, presence, corrections, deletion, cascades | OPEN | OPEN | OPEN |
| 10 public TS/schema integration, cursors, lifecycle, capabilities | OPEN | OPEN | OPEN |
| R entity API ("ORM") + raw queries make sense | OPEN | OPEN | OPEN |

## Gates by lane
| Gate | X (XTQL) | X (SQL) | Q |
| --- | --- | --- | --- |
| G0 pure | OPEN | OPEN | OPEN |
| G1 unchanged44 | OPEN | (shared foundation) | OPEN |
| G2 native142 | OPEN | OPEN | OPEN |
| G3 entity suite | OPEN | OPEN | OPEN |
| G4 semantic counterexamples | OPEN | OPEN | OPEN |
| G5 write semantics | OPEN | (shared) | OPEN |
| G6 scale 10k/100k/1m/10m | OPEN | OPEN | OPEN |
| G7 load 64/256/512/1024 | OPEN | OPEN | OPEN |
