# Item 4.1 — analytic cost model and portable-language alternatives

**Status: research only. Every empirical check, timing, allocation measurement, stack-depth experiment, compiler invocation, and benchmark is UNRUN.** No installed-language/tool availability was inspected. No implementation or final contract is selected.

## 1. Units and assumptions

Use the following input-derived quantities, not machine properties:

- `n`: explicitly declared vertices, including isolated vertices.
- `m`: original edge **occurrences**, including exact duplicates and self-loops.
- `d`: distinct ordered endpoint/kind tuples, if a normalization policy deduplicates them.
- `s`: strict edge occurrences.
- `k`: exact SCCs; `0 <= k <= n`.
- `m_c`: cross-component occurrences, if duplicates are retained.
- `B`: encoded graph bytes; `W`: encoded certificate bytes.
- `p`: supplied return-path edges; a bounded simple witness can use `p <= n-1`.
- `ell`: maximum external-ID comparison length when IDs are strings.

The graph bounds below assume validated dense indices and constant-time indexed array access. They are operation-count asymptotics, not time predictions. Parsing, string comparisons, integer bit costs, and canonical sorting must be accounted for separately. The historical linear SCC result is a random-access-model statement; it does not establish a wall-clock or memory-byte guarantee for any unbuilt program. [Tarjan, 1972](https://epubs.siam.org/doi/10.1137/0201010).

Always include `n`, not only `m`: a graph can have many declared isolated vertices. In particular, the simplifying `n = O(m)` assumption in some algorithm papers cannot be carried into this tool's all-components scope without a separate isolated-vertex term.

## 2. Analytic alternatives

| Stage/alternative | Time after parsing and indexing | Additional live graph/checker storage | Qualification |
|---|---:|---:|---|
| Flat edge-list endpoint/kind validation | `O(n+m)` | `O(n)` or less with dense authority | Complete pass; uniqueness checks depend on representation. |
| Adjacency lists or CSR construction | `O(n+m)` | `O(n+m)` | Excludes sorting/name interning. |
| Iterative Tarjan-style producer | `O(n+m)` | `O(n)` beyond input graph | Producer alternative, not selected or executed. |
| Two-pass forward/reverse SCC producer | `O(n+m)` | `O(n+m)` if reverse graph is materialized | Algorithmically different differential implementation, not an oracle by agreement alone. |
| Total bounded-level success checker | `O(n+m)` | `O(n)` | Verifies feasibility, not minimality/canonical schedule. |
| Exact-SCC two-tree/rank checker | `O(n+m)` | `O(n+k)` beyond graph/certificate | Parent references must have constant-time real-edge membership checks. |
| Local strict-edge/return-path checker | `O(n+m+p)` including full graph validation | `O(n)` for validation/optional path uniqueness | A local witness need not be canonical. |
| Least levels on verified condensation | `O(k+m_c)` | `O(k)` beyond represented condensation | One max-plus recurrence evaluation/verification. |
| Any valid block-order checker | `O(n+m+k)` | `O(k)` | A permutation plus all-edge precedence checks. |
| Least-key available-block schedule | `O(m_c + k log(k+1))` | `O(k+m_c)` with reverse adjacency | Heap policy; no hidden claim of linear deterministic tie-breaking. |
| Single-source BFS for a return path | `O(n+m)` | `O(n)` | Mark vertices when enqueued; adjacency tie sorting is extra. |
| BFS/DFS reachability from every vertex | `O(n(n+m))` | `O(n^2)` if all reachability is retained | Can use `O(n)` working storage if only strict-edge queries are retained/processed appropriately. |
| Unoptimized Boolean Warshall oracle | `O(n^3 + m)` | `O(n^2)` | Tiny-graph reference; independent of SCC code. |
| Reachability separately for every strict edge | `O(s(n+m))` | `O(n)` working storage | Avoid accidentally using this as the production path when `s` grows. |

Official reference implementations document all-source DFS closure at `Theta(n(n+m))` and Boolean Warshall at cubic preprocessing/quadratic storage. These are proposed independent-oracle families, not installations or executions here. [Princeton TransitiveClosure](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/TransitiveClosure.html), [Princeton WarshallTC](https://algs4.cs.princeton.edu/42digraph/WarshallTC.java.html).

The all-source row need not retain a full matrix if it groups strict-edge queries by their return-path source and answers them during each search; the time remains bounded by all-source traversal. If exact SCC labels are compared, retained reachability makes the mutual-reachability equivalence check simplest for tiny graphs.

## 3. Proposed reasoned counters, not measured counters

These counts describe simple candidate organizations. An implementation would have to define and instrument its own counters before claiming them. No such instrumentation exists or ran in this round.

### Whole-input and level-certificate checker

For a well-formed complete input, a flat pass can have:

- `n` declared-vertex record visits;
- `m` edge-record visits;
- `2m` endpoint-range checks;
- `m` edge-kind checks;
- `n` success-certificate assignment visits;
- `m` signed inequalities.

This is not a count of parser instructions, string bytes, memory accesses, or elapsed time. An early invalidity can use fewer logical checks, but must not convert “unchecked remainder” into a valid semantic answer.

### Exact-SCC certificate checker

For a structurally valid witness with one parent in each tree for each non-root:

- `n` vertex-to-component entries and `k` roots;
- exactly `2(n-k)` parent-edge references;
- exactly `2(n-k)` parent-rank decreases;
- at most `m` cross-component-rank tests, following `m` component-equality classifications;
- `s` strict-edge component-equality tests;
- `k` component-order coverage/range entries.

A combined all-edge pass may combine boundary and strict checks, but reporting its real organization is necessary. If a parent edge is looked up by rescanning an adjacency list each time, this linear bound no longer follows. Direct original-edge indices avoid that hidden repeated search; sorted tuple membership gives a separate logarithmic bound.

### CSR and reverse-CSR candidate

A count/scatter construction can use `m` degree increments, `n` prefix-sum steps, and `m` edge placements for one direction. A separately retained reverse representation doubles the edge-entry count to `2m` and uses two arrays of `n+1` row offsets. Kinds, original-edge references, temporary cursors, roots, queues, and parsing storage are additional. These are counts of logical entries, not bytes or allocator behavior.

CSR's offsets and edge arrays support `O(n+m)` storage and contiguous out-edge ranges. It is a representation option, not a requirement to adopt Boost or any dependency. [Boost Graph CSR documentation, versioned 1.85.0 reference](https://www.boost.org/doc/libs/1_85_0/libs/graph/doc/compressed_sparse_row.html).

### Canonical schedule and least levels

A least-key Kahn process can insert and remove each SCC once: `k` insertions, `k` removals, at most `k` live heap entries, and `m_c` cross-edge counter decrements when occurrences are retained. Duplicate multiplicities must match between initial indegree counts and decrements. Deduplicating only one side is a correctness bug.

After an independently verified block order, the least-level recurrence can use `k` baseline initializations and `m_c` candidate additions/max comparisons. Its levels are bounded by `k-1` on feasible nonempty graphs. A heap schedule is unnecessary if the contract asks only for those unique levels, but verifying the producer's exact SCC claims still needs a valid independent mechanism.

### Tiny-graph closure oracle

For an intentionally unoptimized Warshall alternative:

- initialize `n^2` Boolean cells;
- set `n` diagonal cells and up to `m` adjacency cells;
- perform exactly `n^3` logical update positions;
- query `s` strict return pairs;
- compare up to `n^2` vertex pairs when checking the claimed SCC equivalence relation.

Setting the diagonal matters: a strict self-loop is forbidden even when the return path is empty. No matrix, power, loop, or counter was actually computed here.

## 4. Sorting, parsing, duplicates, and certificate bit size

If dense integer IDs are authoritative and records are already in the required order, a graph-core linear bound is plausible under the stated access model. If external string IDs must be normalized, the whole pipeline need not be linear:

- sorting `n` vertex IDs takes `O(n log(n+1))` comparisons;
- binary-search endpoint interning adds `O(m log(n+1))` ID comparisons;
- each comparison can inspect `O(ell)` characters;
- sorting integer-keyed edge tuples takes `O(m log(m+1))` comparisons;
- hashing gives expected/amortized alternatives only under an explicit hash model; it is not an unconditional worst-case linear proof.

One conservative comparison-model expression for that particular sort/binary-search organization is `O(B + ell*(n+m)*log(n+1) + m*log(m+1))`, before certificate handling. Other representations have different bounds. A maximum-string-length expression is deliberately loose; total-byte-aware string algorithms can refine it later.

Retaining duplicate occurrences keeps `m` as the correct input-processing term even when `d` is tiny. Deduplication does not erase the cost of reading the duplicates. If edge kinds are normalized to a single endpoint-pair constraint, the safe feasibility weight is the maximum weight present; explanation/provenance information may still need separate retention.

For bounded dense encodings, level witnesses use `O(n log(n+1))` bits. A two-tree certificate additionally uses `O(n log(m+1))` bits for original-edge references and `O(n log(n+1))` for component/tree ranks. A bounded cycle witness uses `O(n log(m+1))` reference bits. External strings, encoding overhead and schema fields are part of `W`; all parsers still need to read `B+W` bytes. These are size formulas, not file sizes observed on a computer.

## 5. Adversarial complexity and depth review

Candidate tests should deliberately cover:

- `m=0` and large `n`: catches edge-only accounting and missing isolated vertices.
- Long chains and a single large positive SCC: a recursive traversal can need depth proportional to `n`; an explicit stack avoids dependence on a language call-stack limit.
- A long chain with a strict closing edge near the end: catches a late forbidden condition and premature success.
- Stars/hubs: defeats claims that average degree is a worst-case degree bound; repeated membership scans can become quadratic.
- Duplicate floods: `m` dominates even if there are only one or two distinct constraints.
- Dense graphs: `m` can be quadratic in `n`; “linear in graph size” is not “linear in vertices.”
- Layered DAGs with exponentially many paths: enumeration of all paths/cycles is not an acceptable substitute for linear graph traversal or dynamic programming.
- Many disconnected components with a final strict self-loop: validates the all-components rule.
- Long common-prefix IDs and large numeric tokens: byte and integer costs must not disappear from the analysis.
- Malicious certificate parent cycles, repeated vertices, out-of-range references, and enormous claimed ranks: checker termination and bounded parsing matter as well as solver traversal.

Published adjacency-list documentation itself warns that average `E/V` is not a true worst-case per-vertex degree bound. [Boost Graph adjacency-list documentation, versioned 1.85.0 reference](https://www.boost.org/doc/libs/1_85_0/libs/graph/doc/using_adjacency_list.html).

Any input-derived caps should be explicit protocol policy: encoded bytes, vertex and edge counts, nesting depth, ID length, integer range, and witness length. Refusing a cap-violating request is not evidence of a strict cycle. Checked arithmetic is needed for `n+1`, array lengths, offset sums, `n^2`, `n^3`, and `level+weight`; the empty graph should not compute an unsigned `n-1`.

## 6. Portable source-language alternatives, without availability claims

No choice here is an instruction to launch Codex, install tools, compile, run, inspect a machine, or bypass the native-syntax HOLD. These are source-level design alternatives for a later separately authorized implementation.

### Python 3 source

- Useful for a short independent Boolean-matrix or queue-based reference oracle and a readable certificate checker.
- Use explicit stacks/queues; do not “solve” adversarial graph depth by raising a recursion limit.
- Numeric type and schema checks must reject booleans where integer fields are expected, if that distinction is chosen.
- A strict JSON adapter is necessary if duplicate names or non-finite numbers are disallowed; the default decoder's behavior is not that contract.
- Dynamic object/container overhead is outside logical `O(n+m)` entry counts; do not predict it without measurements.

The Python manual warns about untrusted JSON resource consumption and documents last-name-wins behavior for repeated object names. [Python 3.11 JSON documentation](https://docs.python.org/3.11/library/json.html). Its recursion-limit documentation warns that a too-high limit can cause a crash, rather than making arbitrary recursion safe. [Python 3.11 sys documentation](https://docs.python.org/3.11/library/sys.html#sys.setrecursionlimit).

### ECMAScript source

- Useful for a dependency-light source artifact with arrays, explicit worklists, and an independently implemented tiny closure oracle.
- Validate safe integral indices/ranks before indexing, and reject numeric coercion. Large external identifiers can instead be strings under a selected contract.
- Do not use bitwise coercion as a generic integer validator; it changes the numeric domain.
- Standard JSON parsing alone does not expose every ambiguity a stricter protocol may wish to reject.

ECMAScript's finite exact-integer range for `Number` is a language property, not the capacity of a particular computer. The safe-integer maximum is `2^53-1`; adjacent larger integers can become indistinguishable. [ECMA-262, 17th edition, Number.MAX_SAFE_INTEGER](https://262.ecma-international.org/17.0/#sec-number.max_safe_integer).

### Rust source

- Useful for a bounded dense-index checker with explicit vectors/worklists and deliberate fallible-capacity handling.
- Checked conversions/arithmetic and a separate parse layer are still required; a memory-safe language does not prove the witness theorem.
- The source can avoid external graph libraries, but a JSON format would need a selected parser dependency or a deliberately narrow separate format. No dependency or toolchain pin is selected.
- Treat allocation failure as verification unavailable, not infeasibility.

The standard-library vector API documents fallible reserve operations and capacity-overflow/failure returns. This establishes an available *language/library design option*, not what is installed or how much can be allocated. [Rust Vec documentation](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve).

## 7. Evidence required before future performance or acceptance claims

If implementation is later authorized, evidence would need to include: selected semantics and encoding; exact implementation revision; independent-oracle agreement; complete fixtures and mutations; defined operation-counter semantics; recorded input sizes and outcomes; and transparent classification of invalid input, invalid certificate and resource refusal. Empirical timings/allocation data, if ever authorized, would be a separate record with a stated method.

This round supplies none of that empirical evidence. Analytic complexity is not a benchmark. A source-language artifact would not satisfy held native compilation, and a graph-level pass would not change item 4's incomplete/untested status.
