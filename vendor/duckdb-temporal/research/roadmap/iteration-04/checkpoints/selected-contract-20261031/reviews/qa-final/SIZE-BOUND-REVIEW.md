# Independent compact IR2 size-bound review

2026-10-31 UTC. Pure source/text/count arithmetic only. No app import, compiler, native module, database, test, benchmark or actual IR serializer was executed.

## Exact inputs

- Frozen execution manifest: `4615f510898a14ffd3cc1145e826113b42cf41d0b4891e0e10922a73b405deb5`.
- Frozen IR2: `c680654909a0b480889feb193e4d30395ea525ef1466fca070f1744b09314bd6`.
- Frozen budget: `45a0cf56a1656cd8cc6cd45985226e6c5e90f49792f736630ff385c6e8c18d73`.
- Coordinator derivation reviewed: `.agent-logs/goal4-contract-coordinator/draft-001/IR2-SIZE-BOUND-DRAFT.md`, 5108 bytes, SHA256 `33ce45794f6a27b258741915266e85db5b488464b601230976d8807cc0826922`.

The root candidate explicitly requires full disjoint relation/rule component partitions. Component/edge data must be compiler-derived and conform to the frozen schema; this is not a new untrusted caller-IR input checker.

## Independent exact shell counts

Constructed only the fixed compact ASCII shapes using maximal bounded decimal IDs and canonical nonstring payload spellings, then counted their text lengths. Counts below include one trailing comma as conservative per-entry overhead. Empty string payloads establish framing; encoded payload bytes are charged separately.

| Shape | Exact bytes | Ledger allowance |
|---|---:|---:|
| Variable term | 11 | 64 |
| String constant term framing | 29 | 64 + payload |
| Int64 MIN constant term | 49 | 64 |
| Finite-f64 constant term | 45 | 64 |
| Boolean-false constant term | 33 | 64 |
| String literal node framing | 44 | 80 + payload |
| Int64 MIN literal node | 64 | 80 |
| Finite-f64 literal node | 60 | 80 |
| Boolean-false literal node | 48 | 80 |
| Variable node | 27 | 80 |
| Longest fixed operator node | 23 | 80 |
| Signed atom shell, empty term array | 45 | 80 |
| Rule shell, excluding counted head/body/filter contents | 62 | 128 |
| Relation object, 128-byte ASCII name | 201 | 256 |
| Signed dependency object | 41 | 96 |
| Filter shell, empty node/dependency arrays | 31 | 64 |
| Component shell, empty member/predecessor/rule arrays | 69 | 256 |

Exact fixed 45-key budget compacts to **1511 ASCII bytes**, below 8192. Top-level framing with exact schema/language, arrays, maximal answer ID and excluding budget contents is **152 bytes**, below 1024. The original budget file is 1741 bytes with formatting; no runtime serializer equivalence is inferred from this orchestration text count.

## Cardinality/payload obligations checked

1. At most `128*(16+1)*8 = 17408` relational term slots, including heads; at most 2176 atoms. Every term's nonstring canonical/frame count fits 64, every signed atom shell fits 80. Treating all heads as signed only overcounts.
2. At most 4096 postfix nodes; every fixed nonstring/frame shape fits 80. Each quoted source literal occurrence exports exactly once, either a relational constant or a postfix literal. No redundant facts/source/comment stream duplicates it.
3. The total decoded **string-literal occurrence** bytes is no greater than 65536 source bytes: inherited supported escape/quote decoding does not grow bytes. JSON escaping is at most six output bytes per decoded UTF8 byte, so charge 393216 separately. Unicode escapes for supplementary characters, if a conforming encoder chose them, do not defeat that loose per-byte bound. This is not a bound on all owned compiler allocations.
4. At most 128 complete relation objects with 128-byte ASCII identifiers. At most 2048 unique signed edges, since each needs a source body occurrence. Relation, rule, component, answer and stratum IDs require at most three decimal digits; variable IDs at most two. Minimal weighted strata are bounded by the finite component DAG.
5. At most `16*128 = 2048` filters. The sum of dependency-list lengths is at most 4096: every unique dependency in one filter needs a variable node in that filter, and all filters share the global node cap. Four bytes per dependency ID including comma is conservative.
6. Component shells at most 128. Predecessor arrays loosely contain at most `128^2` IDs with four bytes each. Member/rule lists are **global partitions**, not 128 replicated copies of all rules/relations: at most 128 member IDs and 128 rule IDs in total.
7. Budget and top-level data are fixed, not arbitrary metadata. There are no source spans, debug traces, snapshots, comments or added fields hidden outside the ledger. Compact encoding forbids discretionary whitespace outside string payloads.

## Ledger conclusion

The independently checked allowances sum:

`393216 + 1114112 + 327680 + 174080 + 16384 + 32768 + 196608 + 147456 + 99328 + 8192 + 1024 = 2510848`.

Therefore, **under all frozen compact-schema/compiler-output preconditions**, the proposed source-size upper bound is 2,510,848 encoded bytes, below 4,194,304 by 1,683,456. No counterexample was found. The bound is intentionally loose and jointly overestimates many maxima.

This conditional specification proof does not assert that a future implementation conforms, that the cap is reachable by valid source, or that an arbitrary manually constructed/mutated ProgramIRV2 object is valid compiler output. The bounded serializer must still independently enforce its cap. Schema/format/cap changes, added fields/whitespace or literal duplication invalidate this proof until reviewed again.

Do not create an invented oversized admitted-source test. Bounded-sink boundary units and real aggregate callback tests remain later explicitly scoped options. No spare-capacity/allocator/arena/RSS, wall-time, cancellation, production or actual pass claim follows.
