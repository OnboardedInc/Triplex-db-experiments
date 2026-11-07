# Compact IR2 source-size upper bound — draft derivation

2026-10-31. New item4 specification arithmetic, not a serializer execution/test, accepted proof, RSS estimate or implementation claim. Review against the exact final frozen IR2 and budget schema before relying on this derivation. The source/static caps and compact JSON shape are proposals under review. The independently enforced 4,194,304-byte row cap remains mandatory regardless of this calculation.

## Preconditions

Use exactly the proposed compact IR2 format: no discretionary whitespace outside strings; fixed key/opcode/literal forms; signed source rules only (no redundant facts array); each relation and rule belongs to one component; dependency edges are unique; filter dependencies are unique structural variable IDs; the budget model is the exact frozen fixed object. No runtime snapshot contents, arbitrary source/comment copies, debug traces or user-defined metadata enter IR2.

All relation/variable/component/rule/stratum numeric IDs have at most three decimal digits (variables at most two). Input limits are represented only in the fixed budget model. One source program has at most128 rules,16 signed relational body atoms/rule,8 terms/atom,4096 postfix nodes,128 relations,16 filters/rule and65,536 source bytes. These are deliberately loose joint bounds; they do not claim every maximum is simultaneously attainable.

## Byte ledger

The shell allowances below include compact punctuation, fixed keys, canonical nonstring scalar payloads and comma overhead. Before accepting the proof, independently count each exact shape and confirm it fits its allowance. Quoted string payload bytes are charged separately where indicated, not silently omitted.

| Part | Conservative allowance | Bytes |
| --- | --- | ---: |
| Escaped string literal payloads in all terms/filter nodes | At most6 times total decoded literal-occurrence bytes, which is at most source bytes | 393216 |
| Every relational term, including head terms |64 bytes ×128 rules ×17 atoms including head ×8 terms; actual variable terms are smaller |1114112|
| Every postfix node, including owned literal framing/nonstring payload |80 bytes ×4096 nodes |327680|
| Relational atom shells, with signs for all as an overestimate |80 bytes ×128×17 |174080|
| Rule shells excluding separately counted atoms/filters |128 bytes ×128 |16384|
| Complete relation objects including names up to128 ASCII bytes |256 bytes ×128 |32768|
| Unique signed dependency objects |96 bytes ×2048 occurrences |196608|
| Filter shells plus dependency ID arrays |64 bytes ×16×128 +4 bytes ×4096 variable nodes |147456|
| Component shells, predecessor arrays, and global member/rule partitions |256×128 +4×128×128 +4×128 +4×128 |99328|
| Exact fixed budget-model object | Must independently establish compact encoding≤8192 |8192|
| Top-level keys/framing and slack |1024 |1024|
| **Total proposed upper bound** | Sum of preceding independent overestimates | **2510848** |

The total is below4,194,304 by1,683,456 bytes. This is a candidate proof for the exact compact format, not a measured maximum or a claim that the bound is tight.

## Reasons for the less obvious bounds

Each quoted literal occurrence exports once: either one relational term or one postfix literal node. The no-facts schema avoids duplicating ground literals. Decoding supported escapes/quote doubling cannot increase byte length relative to its source spelling. JSON escaping expands any decoded UTF8 byte by at most6 output bytes, a safe overestimate even for supplementary-plane escapes. Ignored comments are not exported. Canonical integer/float payloads are already inside the generous per-term/node shell allowances.

A filter dependency entry requires at least one variable node in that filter, so the sum of dependency lengths across filters cannot exceed the global4096 node count. Do not multiply64 variables by every filter independently when proving the tighter bound. Component member/rule arrays partition the globally bounded relations/rules, while predecessor arrays are bounded loosely by128² IDs. The source body-occurrence bound2048 also bounds the number of unique signed dependency edges.

The fixed budget object and each literal/node/atom/diagnostic shape still require independent byte counting against final schema bytes. Any additional exported data, format whitespace, redundant source view or schema-version change invalidates this proof until reviewed again. A 4MiB cap does not bound std::string spare capacity, owned compiler-object allocation, arena copies, allocator overhead or process memory.

## Test consequence if the proof closes

Do not invent an admitted source program claimed to exceed the row cap if no such program exists under these preconditions. Independently test a bounded sink boundary only under a later explicit narrow runtime gate, and test the callback-wide32MiB aggregate using many real compile outputs with independently computed exact byte lengths. Neither option adds a caller-supplied executable-IR interface. All such tests remain UNRUN.
